"""Do MODIS version-string changes (6.2 -> 6.03 -> 61.03) cause step changes?

VIIRS S-NPP has one version (2) for the whole period, so it is used as a fixed
reference: if a MODIS processing change altered detections, the MODIS/VIIRS
ratio (and MODIS-only distributions) would jump at the boundary years.

Usage: python -m analysis.validation.modis_version_boundaries --country Greece
"""
import argparse
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--country", default="Greece")
    a = ap.parse_args()
    df = pd.read_parquet(ROOT / f"data/processed/firms_{a.country}_hotspots.parquet")
    df = df[df.in_sensor_overlap_period & df.is_presumed_vegetation_fire.fillna(False)]
    m = df[df.instrument == "MODIS"]
    v = df[df.instrument == "VIIRS"]

    yr = pd.DataFrame({
        "modis_version": m.groupby("year").version.agg(lambda s: ",".join(sorted(s.unique()))),
        "modis_n": m.groupby("year").size(),
        "viirs_n": v.groupby("year").size(),
        "modis_frp_sum": m.groupby("year").frp_mw.sum(),
        "viirs_frp_sum": v.groupby("year").frp_mw.sum(),
        "modis_pct_low": m.groupby("year").is_low_confidence.mean() * 100,
        "modis_conf_median": m.groupby("year").confidence_pct.median(),
        "modis_frp_median": m.groupby("year").frp_mw.median(),
    })
    yr["count_ratio_v_over_m"] = yr.viirs_n / yr.modis_n
    yr["frp_ratio_v_over_m"] = yr.viirs_frp_sum / yr.modis_frp_sum

    eras = yr.groupby("modis_version")[["count_ratio_v_over_m", "frp_ratio_v_over_m",
                                        "modis_pct_low", "modis_conf_median", "modis_frp_median"]]
    summary = eras.agg(["mean", "std", "count"]).round(2)

    # Simple step test: does the boundary year-pair differ from within-era year-to-year changes?
    r = yr.count_ratio_v_over_m
    yoy = r.diff().abs()
    boundaries = [y for y in yr.index[1:] if yr.modis_version[y] != yr.modis_version[y - 1]]
    within = yoy.drop(boundaries).dropna()

    out = ROOT / "analysis/validation"
    yr.round(3).to_csv(out / f"modis_version_boundaries_{a.country}.csv")
    lines = [f"# MODIS version boundaries — {a.country}", "",
             "Vegetation-fire pixels, 2012+ (VIIRS S-NPP v2 as constant reference).", "",
             "## Per era", "", summary.to_markdown(), "",
             "## Step test on VIIRS/MODIS count ratio", "",
             f"- Within-era year-to-year |change|: median {within.median():.2f}, max {within.max():.2f}"]
    for b in boundaries:
        lines.append(f"- Boundary {b-1}->{b} ({yr.modis_version[b-1]} -> {yr.modis_version[b]}): "
                     f"|change| {yoy[b]:.2f} ({'within normal range' if yoy[b] <= within.max() else 'LARGER than any within-era change'})")
    # Orbit drift: Terra/Aqua left their maintained orbits (~2020-2022), so local
    # overpass time shifts; fire activity has a strong diurnal cycle.
    all_df = pd.read_parquet(ROOT / f"data/processed/firms_{a.country}_hotspots.parquet")
    day = all_df[all_df.daynight == "D"]
    drift = day.groupby(["year", "satellite"], observed=True).local_solar_hour.median().unstack().round(2)
    drift.to_csv(out / f"overpass_drift_{a.country}.csv")
    lines += ["", "## Day overpass local solar time (median, hours) — orbit drift check", "",
              drift.loc[2012:].to_markdown(), "",
              "Aqua drifts later and Terra earlier from ~2022. Because burning peaks in the "
              "afternoon, MODIS detections/FRP after 2022 are not comparable to earlier years "
              "without accounting for overpass time. VIIRS S-NPP stays stable (~13:00)."]
    text = "\n".join(lines) + "\n"
    (out / f"modis_version_boundaries_{a.country}.md").write_text(text)
    print(text)
    print(yr.round(2).to_string())


if __name__ == "__main__":
    main()
