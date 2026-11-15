#!/usr/bin/env python3
"""Independent recomputation of the Aqua / S-NPP "fixed-clock" ratio L for five
2-degree cells, written only from the audit brief and the raw FIRMS archives.

Usage (always with python3 -I):
    python3 -I recompute.py scan      # stage 1: one pass over the 28 zips -> cache/*.npz
    python3 -I recompute.py final     # stage 2: statistics + audit_values.json
    python3 -I recompute.py all       # both
"""
import json
import os
import re
import sys
import time
import zipfile

import numpy as np
import pandas as pd

RAW = os.environ.get("FIRMS_RAW", "RAW")          # folder holding the yearly all-countries zips
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(OUT_DIR, "cache")
OUT_JSON = os.path.join(OUT_DIR, "audit_values.json")

YEARS = list(range(2012, 2026))            # 2012 ... 2025 inclusive
DAY0 = np.datetime64("2012-01-01", "D")
DAY_LAST = np.datetime64("2025-12-31", "D")
NDAYS = int((DAY_LAST - DAY0).astype(int)) + 1   # inclusive calendar length
assert NDAYS == 5114, NDAYS

# cell id -> (lon0, lat0); membership: lon0 <= lon < lon0+2 and lat0 <= lat < lat0+2
CELLS = [
    ("g2_30_6", 30.0, 6.0),
    ("g2_-56_-12", -56.0, -12.0),
    ("g2_78_12", 78.0, 12.0),
    ("g2_-104_18", -104.0, 18.0),
    ("g2_80_22", 80.0, 22.0),
]
for cid, lon0, lat0 in CELLS:   # the id must spell the same corner the code uses
    assert cid == "g2_%d_%d" % (lon0, lat0), cid

BASE_YEARS = (2012, 2020)   # inclusive
TARGET_YEARS = [2024, 2025]
SEED = 20261114
NREP = 1000
BLOCK_LEN = 16
NBLOCKS = 320

KINDS = [("modis", "Aqua"), ("viirs-snpp", None)]
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
CHUNK = 2_000_000


def zip_path(kind, year):
    return os.path.join(RAW, "%s_%d_all_countries.zip" % (kind, year))


def cache_path(kind, year):
    return os.path.join(CACHE, "%s_%d" % (kind, year))


def scan_zip(kind, year):
    """Read every CSV in one yearly zip. Returns small aggregates only."""
    path = zip_path(kind, year)
    glob_day = np.zeros(NDAYS, dtype=np.int64)              # target-satellite daytime rows, whole archive
    cell_day = np.zeros((len(CELLS), NDAYS), dtype=np.int64)
    st = {
        "zip": os.path.basename(path), "kind": kind, "year": year,
        "csv_members": 0, "non_csv_members": [], "empty_csv": [],
        "rows_read": 0, "sat_counts": {}, "daynight_counts": {},
        "target_day_rows": 0, "target_day_rows_out_of_calendar": 0,
        "target_day_rows_date_year_ne_zip_year": 0,
        "nan_latlon_rows": 0, "bad_date_strings": [],
        "cell_rows": {c[0]: 0 for c in CELLS},
        "cell_rows_by_file": {c[0]: {} for c in CELLS},
        "cell_exact_duplicates": {c[0]: 0 for c in CELLS},
    }
    cell_keep = {c[0]: [] for c in CELLS}   # for the duplicate check only (does not alter counts)

    with zipfile.ZipFile(path) as z:
        for info in z.infolist():
            name = info.filename
            if info.is_dir():
                continue
            if not name.lower().endswith(".csv"):
                st["non_csv_members"].append(name)
                continue
            st["csv_members"] += 1
            if info.file_size == 0:
                st["empty_csv"].append(name)
                continue
            with z.open(info) as fh:
                try:
                    reader = pd.read_csv(
                        fh,
                        usecols=["latitude", "longitude", "acq_date", "acq_time", "satellite", "daynight"],
                        dtype={"latitude": "float64", "longitude": "float64",
                               "acq_date": "category", "acq_time": "category",
                               "satellite": "category", "daynight": "category"},
                        keep_default_na=False,
                        na_values={"latitude": [""], "longitude": [""]},
                        chunksize=CHUNK,
                    )
                except pd.errors.EmptyDataError:
                    st["empty_csv"].append(name)
                    continue
                for ch in reader:
                    n = len(ch)
                    if n == 0:
                        continue
                    st["rows_read"] += n
                    for k, v in ch["satellite"].value_counts().items():
                        if v:
                            st["sat_counts"][str(k)] = st["sat_counts"].get(str(k), 0) + int(v)
                    for k, v in ch["daynight"].value_counts().items():
                        if v:
                            st["daynight_counts"][str(k)] = st["daynight_counts"].get(str(k), 0) + int(v)

                    # --- which rows count ---
                    is_day = (ch["daynight"] == "D").to_numpy()
                    if kind == "modis":
                        is_sat = (ch["satellite"] == "Aqua").to_numpy()
                    else:
                        is_sat = (ch["satellite"] == "N").to_numpy()
                    mask = is_day & is_sat
                    if not mask.any():
                        continue

                    # --- acq_date -> day number (0 = 2012-01-01) ---
                    cats = [str(c) for c in ch["acq_date"].cat.categories]
                    cat_idx = np.full(len(cats), -10**9, dtype=np.int64)
                    cat_year = np.zeros(len(cats), dtype=np.int64)
                    for i, c in enumerate(cats):
                        if not DATE_RE.match(c):
                            if c not in st["bad_date_strings"]:
                                st["bad_date_strings"].append(c)
                            continue
                        cat_idx[i] = int((np.datetime64(c, "D") - DAY0).astype(np.int64))
                        cat_year[i] = int(c[:4])
                    codes = ch["acq_date"].cat.codes.to_numpy()
                    didx = cat_idx[codes]
                    dyear = cat_year[codes]

                    st["target_day_rows"] += int(mask.sum())
                    in_cal = (didx >= 0) & (didx < NDAYS)
                    st["target_day_rows_out_of_calendar"] += int((mask & ~in_cal).sum())
                    st["target_day_rows_date_year_ne_zip_year"] += int((mask & (dyear != year)).sum())
                    m = mask & in_cal
                    glob_day += np.bincount(didx[m], minlength=NDAYS)

                    lat = ch["latitude"].to_numpy()
                    lon = ch["longitude"].to_numpy()
                    st["nan_latlon_rows"] += int((np.isnan(lat) | np.isnan(lon)).sum())
                    for ci, (cid, lon0, lat0) in enumerate(CELLS):
                        cm = m & (lon >= lon0) & (lon < lon0 + 2.0) & (lat >= lat0) & (lat < lat0 + 2.0)
                        k = int(cm.sum())
                        if k == 0:
                            continue
                        cell_day[ci] += np.bincount(didx[cm], minlength=NDAYS)
                        st["cell_rows"][cid] += k
                        short = os.path.basename(name)
                        st["cell_rows_by_file"][cid][short] = st["cell_rows_by_file"][cid].get(short, 0) + k
                        cell_keep[cid].append(pd.DataFrame({
                            "lat": lat[cm], "lon": lon[cm], "day": didx[cm],
                            "time": ch["acq_time"].to_numpy()[cm].astype(str),
                        }))
                    del ch

    for cid in cell_keep:
        if cell_keep[cid]:
            df = pd.concat(cell_keep[cid], ignore_index=True)
            st["cell_exact_duplicates"][cid] = int(df.duplicated(["lat", "lon", "day", "time"]).sum())
    assert int(glob_day.sum()) == st["target_day_rows"] - st["target_day_rows_out_of_calendar"]
    return glob_day, cell_day, st


def stage_scan():
    os.makedirs(CACHE, exist_ok=True)
    for kind, _ in KINDS:
        for year in YEARS:
            base = cache_path(kind, year)
            if os.path.exists(base + ".npz") and os.path.exists(base + ".json"):
                print("cached", kind, year, flush=True)
                continue
            t0 = time.time()
            g, c, st = scan_zip(kind, year)
            np.savez(base + ".tmp.npz", glob_day=g, cell_day=c)
            os.replace(base + ".tmp.npz", base + ".npz")
            with open(base + ".json", "w") as f:
                json.dump(st, f, indent=1)
            print("done %s %d rows=%d target_day=%d  %.0fs" % (kind, year, st["rows_read"], st["target_day_rows"], time.time() - t0), flush=True)


def load_all():
    glob = {}
    cell = {}
    stats = {}
    for kind, _ in KINDS:
        g = np.zeros(NDAYS, dtype=np.int64)
        c = np.zeros((len(CELLS), NDAYS), dtype=np.int64)
        stats[kind] = []
        for year in YEARS:
            base = cache_path(kind, year)
            d = np.load(base + ".npz")
            g += d["glob_day"]
            c += d["cell_day"]
            with open(base + ".json") as f:
                stats[kind].append(json.load(f))
        glob[kind] = g
        cell[kind] = c
    return glob, cell, stats


def ratio_L(a, v, base_m, targ_m):
    """a, v: (..., NDAYS) float arrays already zeroed on non-retained days (and
    weighted, for the bootstrap). base_m: (12, NDAYS) 0/1 month indicator
    restricted to baseline years; targ_m: same for the target year.
    Returns L, aqua_count, snpp_count, fixed_count with leading dims of a."""
    Ab = a @ base_m.T                     # (..., 12)
    Vb = v @ base_m.T
    Vy = v @ targ_m.T
    aqua = (a @ targ_m.T).sum(axis=-1)
    snpp = Vy.sum(axis=-1)
    with np.errstate(divide="ignore", invalid="ignore"):
        pooled = Ab.sum(axis=-1, keepdims=True) / Vb.sum(axis=-1, keepdims=True)
        R = np.where(Vb > 0, Ab / Vb, np.broadcast_to(pooled, Ab.shape))
        fixed = (R * Vy).sum(axis=-1)
        L = aqua / fixed
    return L, aqua, snpp, fixed


def stage_final():
    glob, cell, stats = load_all()

    days = DAY0 + np.arange(NDAYS)
    assert days[-1] == DAY_LAST
    year_of = days.astype("datetime64[Y]").astype(int) + 1970
    month_of = (days.astype("datetime64[M]").astype(int) % 12) + 1      # 1..12
    assert year_of[0] == 2012 and month_of[0] == 1 and year_of[-1] == 2025 and month_of[-1] == 12
    block_of = np.arange(NDAYS) // BLOCK_LEN
    assert block_of.min() == 0 and block_of.max() == NBLOCKS - 1

    retained = (glob["modis"] > 0) & (glob["viirs-snpp"] > 0)
    n_ret = int(retained.sum())

    base_years = (year_of >= BASE_YEARS[0]) & (year_of <= BASE_YEARS[1])
    base_m = np.stack([(base_years & (month_of == m)) for m in range(1, 13)]).astype(np.float64)
    targ_m = {y: np.stack([((year_of == y) & (month_of == m)) for m in range(1, 13)]).astype(np.float64)
              for y in TARGET_YEARS}

    rng = np.random.default_rng(SEED)
    w = rng.poisson(1.0, size=(NREP, NBLOCKS))          # first draw from this generator
    W = w[:, block_of].astype(np.float64)               # (NREP, NDAYS)

    out_cells = {}
    extra = []
    for ci, (cid, lon0, lat0) in enumerate(CELLS):
        a = np.where(retained, cell["modis"][ci], 0).astype(np.float64)
        v = np.where(retained, cell["viirs-snpp"][ci], 0).astype(np.float64)
        Vb_point = v @ base_m.T
        zero_months = [int(m + 1) for m in np.nonzero(Vb_point == 0)[0]]
        out_cells[cid] = {}
        for y in TARGET_YEARS:
            L, aqua, snpp, fixed = ratio_L(a, v, base_m, targ_m[y])
            # integer cross-check straight from the integer arrays
            ty = retained & (year_of == y)
            aqua_i = int(cell["modis"][ci][ty].sum())
            snpp_i = int(cell["viirs-snpp"][ci][ty].sum())
            assert aqua_i == int(round(float(aqua))) and snpp_i == int(round(float(snpp)))
            Lr, _, _, _ = ratio_L(W * a, W * v, base_m, targ_m[y])
            ok = np.isfinite(Lr)
            reps = Lr[ok]
            lo = float(np.percentile(reps, 2.5))
            hi = float(np.percentile(reps, 97.5))
            out_cells[cid][str(y)] = {
                "L": round(float(L), 3) if np.isfinite(L) else None,
                "L_lo": round(lo, 3),
                "L_hi": round(hi, 3),
                "aqua_count": aqua_i,
                "snpp_count": snpp_i,
                "fixed_count": round(float(fixed), 1) if np.isfinite(fixed) else None,
            }
            extra.append("%s %d: replicates kept %d/%d; baseline months with Vb=0 (point estimate): %s; "
                         "unrounded L=%.6f lo=%.6f hi=%.6f fixed=%.4f; cell rows on non-retained days in target year: aqua %d, snpp %d"
                         % (cid, y, int(ok.sum()), NREP, zero_months if zero_months else "none",
                            float(L), lo, hi, float(fixed),
                            int(cell["modis"][ci][(~retained) & (year_of == y)].sum()),
                            int(cell["viirs-snpp"][ci][(~retained) & (year_of == y)].sum())))

    rows_read = {k: int(sum(s["rows_read"] for s in stats[k])) for k in stats}

    # ---- data oddities, gathered from the scan stats ----
    def agg(kind, key):
        tot = {}
        for s in stats[kind]:
            for k, v in s[key].items():
                tot[k] = tot.get(k, 0) + v
        return tot

    not_ret = np.nonzero(~retained)[0]
    aq0 = np.nonzero(glob["modis"] == 0)[0]
    sn0 = np.nonzero(glob["viirs-snpp"] == 0)[0]

    def runs(idx):
        if len(idx) == 0:
            return "none"
        parts = []
        s = p = idx[0]
        for i in idx[1:]:
            if i == p + 1:
                p = i
                continue
            parts.append((s, p))
            s = p = i
        parts.append((s, p))
        return ", ".join(str(days[x]) if x == y else "%s..%s" % (days[x], days[y]) for x, y in parts)

    odd = {
        "modis_satellite_values": agg("modis", "sat_counts"),
        "viirs_satellite_values": agg("viirs-snpp", "sat_counts"),
        "modis_daynight_values": agg("modis", "daynight_counts"),
        "viirs_daynight_values": agg("viirs-snpp", "daynight_counts"),
    }
    for kind in stats:
        odd[kind + "_target_daytime_rows"] = int(sum(s["target_day_rows"] for s in stats[kind]))
        odd[kind + "_target_daytime_rows_outside_calendar"] = int(sum(s["target_day_rows_out_of_calendar"] for s in stats[kind]))
        odd[kind + "_target_daytime_rows_date_year_ne_zip_year"] = int(sum(s["target_day_rows_date_year_ne_zip_year"] for s in stats[kind]))
        odd[kind + "_rows_with_blank_lat_or_lon"] = int(sum(s["nan_latlon_rows"] for s in stats[kind]))
        odd[kind + "_bad_date_strings"] = sorted({b for s in stats[kind] for b in s["bad_date_strings"]})
        odd[kind + "_csv_members"] = int(sum(s["csv_members"] for s in stats[kind]))
        odd[kind + "_empty_csv"] = [e for s in stats[kind] for e in s["empty_csv"]]
        odd[kind + "_cell_exact_duplicate_rows"] = {c[0]: int(sum(s["cell_exact_duplicates"][c[0]] for s in stats[kind])) for c in CELLS}
        files = {}
        for c in CELLS:
            tot = {}
            for s in stats[kind]:
                for k, v in s["cell_rows_by_file"][c[0]].items():
                    k2 = re.sub(r"_\d{4}_", "_", k)
                    tot[k2] = tot.get(k2, 0) + v
            files[c[0]] = tot
        odd[kind + "_cell_rows_by_country_file"] = files

    notes = (
        "ASSUMPTIONS: (1) Aqua = rows with satellite=='Aqua' exactly in the modis zips; S-NPP = rows with satellite=='N' exactly "
        "in the viirs-snpp zips; daytime = daynight=='D' exactly; no other filter. (2) rows_read = every data row (header excluded) of "
        "every CSV member of the 14 modis zips and the 14 viirs-snpp zips, before any satellite/daynight filter (so modis includes "
        "Terra and night rows). (3) Every row is counted as it appears; rows are NOT de-duplicated across country files. "
        "(4) Days are assigned by the acq_date string; day 0 = 2012-01-01; month/year are the calendar month/year of acq_date; "
        "block = day // 16. (5) Cell edges: lon0 <= longitude < lon0+2 and lat0 <= latitude < lat0+2 on the float values as parsed. "
        "(6) Retained-day test uses whole-archive daytime counts of the same row sets as in (1). (7) Counts on non-retained days are "
        "set to zero everywhere (baseline, target, bootstrap). (8) aqua_count and snpp_count are over retained days of the target year. "
        "(9) Bootstrap: w = default_rng(20261114).poisson(1.0,(1000,320)) as the first draw; replicate L recomputed from weighted "
        "counts incl. the Vb[m]>0 fallback; non-finite L dropped; numpy.percentile linear. (10) Rounding with Python round() on the "
        "float64 result; JSON numbers drop trailing zeros, so e.g. 0.98 means 0.980 and 1.06 means 1.060. "
        "(11) Files for other years and viirs-jpss1 were not opened; the non-CSV readme member in each zip was skipped. "
        "(12) In cell g2_80_22 the baseline S-NPP sum for August is 0 on the point estimate, so R[Aug] uses the pooled fallback. "
        "DATA CHECKS: retained days = %d of %d. Days with zero Aqua daytime rows anywhere: %d (%s). Days with zero S-NPP daytime rows "
        "anywhere: %d (%s). Non-retained days: %s. Details: %s. PER CELL/YEAR: %s"
        % (n_ret, NDAYS, len(aq0), runs(aq0), len(sn0), runs(sn0), runs(not_ret),
           json.dumps(odd, sort_keys=True), " | ".join(extra))
    )

    result = {
        "cells": out_cells,
        "retained_days": n_ret,
        "rows_read": {"modis": rows_read["modis"], "viirs-snpp": rows_read["viirs-snpp"]},
        "notes": notes,
    }
    with open(OUT_JSON, "w") as f:
        json.dump(result, f, indent=2)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    if mode in ("scan", "all"):
        stage_scan()
    if mode in ("final", "all"):
        stage_final()
