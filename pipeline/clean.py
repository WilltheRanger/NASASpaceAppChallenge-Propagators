"""Clean and harmonise raw NASA FIRMS MODIS + VIIRS CSVs into one tidy table.

Principles (see data/metadata/data-limitations.md):
  * raw files are never modified; everything here is derived and reproducible
  * original values (date, UTC time, lat/lon, confidence, version) are preserved
  * only rows that are physically impossible / unparseable are rejected, and
    every rejected row is written out with its reason
  * questionable rows are FLAGGED, not dropped (low confidence, non-vegetation
    hotspot type, possible overlapping-granule duplicates)

Usage:
    python -m pipeline.clean --country Greece
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from pipeline import regions
from pipeline.schema import (
    HOTSPOT_TYPES,
    MODIS_CONF_BINS,
    OUTPUT_COLUMNS,
    PRODUCTS,
    RENAME,
    SATELLITE_NAMES,
    SOURCE_PRIORITY,
    VIIRS_CONF_CODES,
    VIIRS_OVERLAP_START,
)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MANIFEST = DATA / "metadata" / "download_manifest.json"

DUP_WINDOW = pd.Timedelta(minutes=10)
KM_PER_DEG = 111.32


# --------------------------------------------------------------------------- load
def _source_kind(entry: dict) -> str:
    kind = entry.get("kind", "country_archive")
    if kind == "api_area":
        return "api_sp" if entry.get("api_source", "").endswith("_SP") else "api_nrt"
    return kind


def load_raw(country: str, stats: dict | None = None) -> pd.DataFrame:
    manifest = json.loads(MANIFEST.read_text())["files"]
    frames = []
    clip_log = {}
    for key, entry in sorted(manifest.items()):
        if entry.get("http_status") != 200 or "path" not in entry:
            continue
        kind = _source_kind(entry)
        if kind == "nrt_global_7d":
            pass  # global feed: clipped below
        elif entry.get("country") != country:
            continue
        path = ROOT / entry["path"]
        if not path.exists():
            continue
        # Read everything as text so nothing is silently coerced (e.g. "0227" -> 227).
        df = pd.read_csv(path, dtype=str, keep_default_na=False, na_values=[""])
        if df.empty:
            continue
        df = df.apply(lambda s: s.str.strip())
        if kind != "country_archive":
            # Our own clip (FIRMS boundary is only applied to country files).
            lat = pd.to_numeric(df["latitude"], errors="coerce")
            lon = pd.to_numeric(df["longitude"], errors="coerce")
            keep = regions.inside(country, lat.fillna(999), lon.fillna(999))
            clip_log[key] = {"rows_in_file": int(len(df)), "rows_in_region": int(keep.sum())}
            df = df[keep]
            if df.empty:
                continue
        product = entry["product"]
        instrument = PRODUCTS[product]["instrument"]
        df = df.rename(columns=RENAME[instrument])
        if "instrument" not in df:  # NRT / API files omit it
            df["instrument"] = instrument
        if "type" not in df:  # NRT data has no inferred hotspot type
            df["type"] = pd.NA
        df["product"] = product
        df["instrument_expected"] = instrument
        df["region"] = country
        df["source_kind"] = kind
        df["source_priority"] = SOURCE_PRIORITY[kind]
        df["source_file"] = key
        df["source_url"] = entry["url"]
        df["raw_row_number"] = np.arange(2, len(df) + 2)  # 1-based, header = line 1
        frames.append(df)
    if stats is not None:
        stats["clipped_files"] = clip_log
    if not frames:
        raise SystemExit(f"No downloaded files for {country!r}. Run pipeline.download first.")
    return pd.concat(frames, ignore_index=True)


def resolve_source_overlaps(df: pd.DataFrame, stats: dict) -> pd.DataFrame:
    """Where several sources cover the same product + UTC date, keep only the
    best one (standard archive > API standard > API NRT > keyless NRT)."""
    best = df.groupby(["product", "acq_date"], observed=True)["source_priority"].transform("min")
    drop = df["source_priority"] > best
    stats["rows_superseded_by_better_source"] = int(drop.sum())
    return df[~drop].copy()


# ----------------------------------------------------------------------- validate
def parse_and_validate(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    stats: dict = {"rows_raw": int(len(df))}
    reasons = pd.Series("", index=df.index, dtype="object")

    def reject(mask: pd.Series, why: str) -> None:
        mask = mask.fillna(True)
        reasons[mask] = reasons[mask] + why + ";"
        stats.setdefault("rejected_by_reason", {})[why] = int(mask.sum())

    lat = pd.to_numeric(df["latitude"], errors="coerce")
    lon = pd.to_numeric(df["longitude"], errors="coerce")
    reject(~lat.between(-90, 90), "latitude_invalid")
    reject(~lon.between(-180, 180), "longitude_invalid")

    date = pd.to_datetime(df["acq_date"], format="%Y-%m-%d", errors="coerce")
    reject(date.isna(), "acq_date_invalid")

    t = df["acq_time"].fillna("")
    t_ok = t.str.fullmatch(r"\d{1,4}")
    t4 = t.where(~t_ok, t.str.zfill(4))
    hh = pd.to_numeric(t4.str[:2], errors="coerce")
    mm = pd.to_numeric(t4.str[2:], errors="coerce")
    reject(~(t_ok & hh.between(0, 23) & mm.between(0, 59)), "acq_time_invalid")

    reject(~df["instrument"].eq(df["instrument_expected"]), "instrument_mismatch")

    bad = reasons.ne("")
    rejected = df[bad].assign(reject_reason=reasons[bad].str.rstrip(";"))
    stats["rows_rejected"] = int(bad.sum())

    ok = ~bad
    out = df[ok].copy()
    out["latitude"] = lat[ok]
    out["longitude"] = lon[ok]
    out["acq_time"] = t4[ok]
    out["acq_datetime_utc"] = (
        date[ok] + pd.to_timedelta(hh[ok], unit="h") + pd.to_timedelta(mm[ok], unit="m")
    ).dt.tz_localize("UTC")
    return out, rejected, stats


# ---------------------------------------------------------------------- transform
def harmonise(df: pd.DataFrame, stats: dict) -> pd.DataFrame:
    qa = pd.Series("", index=df.index, dtype="object")

    def flag(mask: pd.Series, name: str) -> None:
        mask = mask.fillna(False)
        qa[mask] = qa[mask] + name + ";"
        stats.setdefault("flags", {})[name] = int(mask.sum())

    df["satellite_raw"] = df["satellite"]
    df["satellite"] = df["satellite"].map(SATELLITE_NAMES)
    flag(df["satellite"].isna(), "satellite_code_unknown")
    df["satellite"] = df["satellite"].fillna("unknown:" + df["satellite_raw"].astype(str))
    df["nominal_resolution_m"] = df["product"].map({k: v["nominal_resolution_m"] for k, v in PRODUCTS.items()})

    for col in ["bright_primary_k", "bright_secondary_k", "scan", "track", "frp"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.rename(columns={"scan": "scan_km", "track": "track_km", "frp": "frp_mw"})
    df["pixel_area_km2"] = df["scan_km"] * df["track_km"]

    flag(df["frp_mw"].isna(), "frp_missing")
    flag(df["frp_mw"] < 0, "frp_negative")
    df.loc[df["frp_mw"] < 0, "frp_mw"] = np.nan
    flag(~df["bright_primary_k"].between(200, 600), "brightness_out_of_range")
    flag(~df["scan_km"].between(0.1, 10) | ~df["track_km"].between(0.1, 10), "pixel_size_out_of_range")

    # Confidence: keep raw, add numeric (MODIS) + harmonised class.
    df["confidence_raw"] = df["confidence"]
    is_modis = df["instrument"].eq("MODIS")
    pct = pd.to_numeric(df["confidence"].where(is_modis), errors="coerce")
    df["confidence_pct"] = pct
    cls = pd.Series(pd.NA, index=df.index, dtype="object")
    for lo, hi, name in MODIS_CONF_BINS:
        cls[is_modis & pct.between(lo, hi)] = name
    viirs_cls = df["confidence"].str.lower().map(VIIRS_CONF_CODES)
    cls[~is_modis] = viirs_cls[~is_modis]
    df["confidence_class"] = cls
    flag(cls.isna(), "confidence_invalid")

    df["processing_level"] = np.where(df["version"].str.contains("NRT|RT", case=False, na=False), "NRT", "standard")

    if "type" not in df:
        df["type"] = pd.NA
    df["hotspot_type"] = pd.to_numeric(df["type"], errors="coerce").astype("Int8")
    df["hotspot_type_label"] = df["hotspot_type"].map(HOTSPOT_TYPES)
    flag(df["hotspot_type"].isna(), "hotspot_type_missing")
    df["is_presumed_vegetation_fire"] = (df["hotspot_type"] == 0).astype("boolean")
    df["is_low_confidence"] = df["confidence_class"].eq("low")

    ts = df["acq_datetime_utc"]
    df["acq_date"] = ts.dt.strftime("%Y-%m-%d")
    df["year"] = ts.dt.year.astype("int16")
    df["month"] = ts.dt.month.astype("int8")
    df["local_solar_hour"] = ((ts.dt.hour + ts.dt.minute / 60 + df["longitude"] / 15) % 24).astype("float32")
    df["in_sensor_overlap_period"] = ts >= pd.Timestamp(VIIRS_OVERLAP_START, tz="UTC")

    for step, col in [(0.1, "grid_id_0p1"), (0.25, "grid_id_0p25")]:
        glat = np.floor(df["latitude"] / step) * step
        glon = np.floor(df["longitude"] / step) * step
        df[col] = glat.round(2).map("{:.2f}".format) + "_" + glon.round(2).map("{:.2f}".format)

    key = (
        df["product"] + "|" + df["satellite"] + "|" + ts.dt.strftime("%Y%m%dT%H%M")
        + "|" + df["latitude"].map("{:.5f}".format) + "|" + df["longitude"].map("{:.5f}".format)
    )
    df["detection_id"] = key.map(lambda k: hashlib.sha1(k.encode()).hexdigest()[:16])
    df["qa_flags"] = qa.str.rstrip(";").replace("", pd.NA)
    return df


# --------------------------------------------------------------------- duplicates
def drop_exact_duplicates(df: pd.DataFrame, stats: dict) -> pd.DataFrame:
    original_cols = [c for c in df.columns if c not in {"source_file", "source_url", "raw_row_number"}]
    dup = df.duplicated(subset=original_cols, keep="first")
    stats["exact_duplicates_removed"] = int(dup.sum())
    df = df[~dup].copy()
    # Same detection in two different files (e.g. overlapping 7-day NRT
    # snapshots where an attribute was revised): keep the later download.
    df = df.sort_values(["source_priority", "source_file"])
    cross = df.duplicated("detection_id", keep="last") & (
        df.groupby("detection_id")["source_file"].transform("nunique") > 1)
    stats["cross_file_duplicates_removed"] = int(cross.sum())
    df = df[~cross].copy()
    # Same id but different attributes within one file: keep both, make ids unique.
    n = df.groupby("detection_id").cumcount()
    stats["detection_id_collisions"] = int((n > 0).sum())
    df.loc[n > 0, "detection_id"] = df.loc[n > 0, "detection_id"] + "-" + n[n > 0].astype(str)
    return df


def flag_overlap_duplicates(df: pd.DataFrame, stats: dict) -> pd.DataFrame:
    """Flag detections repeated in consecutive/overlapping granules.

    Same satellite, same UTC date, *different* acq_time within DUP_WINDOW, and
    pixel centres closer than half the nominal resolution. Adjacent pixels in
    the same granule are NOT duplicates (one fire spans many pixels).
    """
    df["possible_duplicate_of"] = pd.Series(pd.NA, index=df.index, dtype="string")
    found = []
    for (sat, res), g in df.groupby(["satellite", "nominal_resolution_m"], observed=True):
        thr_km = res / 2000.0
        d_lat = thr_km / KM_PER_DEG
        coslat = max(np.cos(np.radians(min(g["latitude"].abs().max(), 80.0))), 0.17)
        d_lon = d_lat / coslat
        cells = pd.DataFrame({
            "idx": g.index,
            "date": g["acq_date"].values,
            "t": g["acq_datetime_utc"].dt.tz_convert(None).to_numpy(),
            "lat": g["latitude"].values,
            "lon": g["longitude"].values,
            "cy": np.floor(g["latitude"].values / d_lat).astype(np.int64),
            "cx": np.floor(g["longitude"].values / d_lon).astype(np.int64),
            "id": g["detection_id"].values,
        })
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                right = cells.assign(cy=cells["cy"] + dy, cx=cells["cx"] + dx)
                m = cells.merge(right, on=["date", "cy", "cx"], suffixes=("", "_e"))
                m = m[(m["t_e"] < m["t"]) & ((m["t"] - m["t_e"]) <= DUP_WINDOW)]
                if m.empty:
                    continue
                dy_km = (m["lat"] - m["lat_e"]) * KM_PER_DEG
                dx_km = (m["lon"] - m["lon_e"]) * KM_PER_DEG * np.cos(np.radians(m["lat"]))
                m = m[np.hypot(dx_km, dy_km) < thr_km]
                found.append(m[["idx", "t_e", "id_e"]])
    if found:
        allm = pd.concat(found).sort_values("t_e").drop_duplicates("idx", keep="first")
        df.loc[allm["idx"].values, "possible_duplicate_of"] = allm["id_e"].values
    stats["possible_overlap_duplicates_flagged"] = int(df["possible_duplicate_of"].notna().sum())
    return df


# ------------------------------------------------------------------------ outputs
def monthly_summary(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby(["product", "satellite", "processing_level", "year", "month"], observed=True)
    out = g.agg(
        n_detections=("detection_id", "size"),
        n_days_with_detections=("acq_date", "nunique"),
        n_low=("confidence_class", lambda s: int((s == "low").sum())),
        n_nominal=("confidence_class", lambda s: int((s == "nominal").sum())),
        n_high=("confidence_class", lambda s: int((s == "high").sum())),
        n_presumed_vegetation=("is_presumed_vegetation_fire", "sum"),
        n_possible_duplicates=("possible_duplicate_of", lambda s: int(s.notna().sum())),
        frp_sum_mw=("frp_mw", "sum"),
        frp_median_mw=("frp_mw", "median"),
        pixel_area_sum_km2=("pixel_area_km2", "sum"),
    ).reset_index()
    return out


def make_sample(df: pd.DataFrame, n: int = 2000, seed: int = 42) -> pd.DataFrame:
    """Stratified dev/test sample: every product x confidence x day/night stratum."""
    strata = df.groupby(["product", "confidence_class", "daynight"], observed=True, group_keys=False)
    per = max(1, n // max(strata.ngroups, 1))
    s = strata.apply(lambda g: g.sample(min(len(g), per), random_state=seed))
    return s.sort_values("acq_datetime_utc")


def write_data_dictionary(path: Path) -> None:
    lines = [
        "# Data dictionary — cleaned FIRMS hotspots",
        "",
        "Generated from `pipeline/schema.py` by `pipeline.clean`. Do not edit by hand.",
        "",
        "File: `data/processed/firms_<region>_hotspots.parquet` (one row = one satellite fire pixel, **not** one fire).",
        "",
        "| Column | Type | Unit | Definition |",
        "|---|---|---|---|",
    ]
    for col, (dtype, unit, desc) in OUTPUT_COLUMNS.items():
        lines.append(f"| `{col}` | {dtype} | {unit} | {desc} |")
    lines.append("| `qa_flags` | string | - | Semicolon-separated soft QA flags (see data-limitations.md). Null = no issues. |")
    path.write_text("\n".join(lines) + "\n")


def write_quality_report(stats: dict, df: pd.DataFrame, region: str) -> None:
    meta = DATA / "metadata"
    by_prod = df.groupby(["product", "satellite"], observed=True).agg(
        rows=("detection_id", "size"),
        first=("acq_date", "min"),
        last=("acq_date", "max"),
        pct_low_conf=("is_low_confidence", "mean"),
        pct_presumed_veg=("is_presumed_vegetation_fire", "mean"),
        frp_missing=("frp_mw", lambda s: int(s.isna().sum())),
        versions=("version", lambda s: ", ".join(sorted(s.dropna().unique()))),
        processing=("processing_level", lambda s: ", ".join(sorted(s.unique()))),
    ).reset_index()
    by_type = df["hotspot_type_label"].value_counts(dropna=False).rename_axis("hotspot_type").reset_index()
    stats["rows_clean"] = int(len(df))
    stats["generated_at_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    stats["by_product"] = json.loads(by_prod.to_json(orient="records"))
    (meta / f"quality_report_{region}.json").write_text(json.dumps(stats, indent=2, default=str))

    def table(d: pd.DataFrame) -> str:
        cols = list(d.columns)
        out = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
        for r in d.itertuples(index=False):
            out.append("| " + " | ".join(f"{v:.1%}" if isinstance(v, float) and v <= 1 else str(v) for v in r) + " |")
        return "\n".join(out)

    md = [
        f"# Data quality report — {region}",
        "",
        f"Generated {stats['generated_at_utc']} by `python -m pipeline.clean --country {region}`.",
        "",
        "## Row accounting",
        "",
        f"- Raw rows read: **{stats['rows_raw']:,}**",
        f"- Rejected (unparseable / impossible values): **{stats['rows_rejected']:,}** → `data/processed/firms_{region}_rejected.csv`",
        f"- Rows superseded by a better source for the same product/date (e.g. NRT replaced by standard): **{stats['rows_superseded_by_better_source']:,}**",
        f"- Exact duplicate rows removed: **{stats['exact_duplicates_removed']:,}**",
        f"- Same detection in two downloads (later kept): **{stats['cross_file_duplicates_removed']:,}**",
        f"- Clean rows written: **{stats['rows_clean']:,}**",
        f"- Flagged as possible overlapping-granule duplicates (kept): **{stats['possible_overlap_duplicates_flagged']:,}**",
        "",
        "Rejections by reason: " + (json.dumps(stats.get("rejected_by_reason", {})) or "none"),
        "",
        "## Soft QA flags (rows kept)",
        "",
        "\n".join(f"- `{k}`: {v:,}" for k, v in stats.get("flags", {}).items()),
        "",
        "## Coverage by product",
        "",
        table(by_prod),
        "",
        "## Hotspot type",
        "",
        table(by_type),
        "",
    ]
    (meta / f"quality_report_{region}.md").write_text("\n".join(md))


def run(country: str) -> pd.DataFrame:
    load_stats: dict = {}
    raw = load_raw(country, load_stats)
    df, rejected, stats = parse_and_validate(raw)
    stats.update(load_stats)
    df = harmonise(df, stats)
    df = resolve_source_overlaps(df, stats)
    df = drop_exact_duplicates(df, stats)
    df = flag_overlap_duplicates(df, stats)

    cols = [c for c in OUTPUT_COLUMNS if c in df.columns] + ["qa_flags"]
    df = df.sort_values(["acq_datetime_utc", "product", "latitude", "longitude"])[cols].reset_index(drop=True)
    for c in ["product", "instrument", "satellite", "daynight", "confidence_class",
              "processing_level", "hotspot_type_label", "region", "source_kind"]:
        df[c] = df[c].astype("category")
    df["nominal_resolution_m"] = df["nominal_resolution_m"].astype("int16")
    for c in ["bright_primary_k", "bright_secondary_k", "scan_km", "track_km", "pixel_area_km2", "frp_mw", "confidence_pct"]:
        df[c] = df[c].astype("float32")

    proc = DATA / "processed"
    proc.mkdir(parents=True, exist_ok=True)
    df.to_parquet(proc / f"firms_{country}_hotspots.parquet", index=False)
    rejected.to_csv(proc / f"firms_{country}_rejected.csv", index=False)
    monthly_summary(df).to_csv(proc / f"firms_{country}_monthly_summary.csv", index=False)

    sample_dir = DATA / "sample"
    sample_dir.mkdir(parents=True, exist_ok=True)
    make_sample(df).to_csv(sample_dir / f"firms_{country}_sample.csv", index=False)

    write_data_dictionary(DATA / "metadata" / "data-dictionary.md")
    write_quality_report(stats, df, country)
    print(json.dumps({k: v for k, v in stats.items() if k != "by_product"}, indent=2, default=str))
    return df


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--country", default="Greece")
    args = ap.parse_args(argv)
    run(args.country)
    return 0


if __name__ == "__main__":
    sys.exit(main())
