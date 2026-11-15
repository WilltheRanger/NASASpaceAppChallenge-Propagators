"""Convert the Brazil CSV outputs into the app's data/out JSON contract.

Usage: python3 make_json.py CSV_DIR JSON_OUT_DIR
  e.g. python3 analysis/brazil-data/scripts/make_json.py analysis/brazil-data/out data/out
Writes, for br-amazon, br-cerrado, br-pantanal:
  drift/<id>.json      real: median local solar time of near-nadir daytime detections per year
  calendar/<id>.json   raw monthly counts are real; fixed/lo/hi/median_ref/anomaly_pct are null
                       until the statistics lane supplies the fixed-clock series
  twoclocks/<id>.json  PREVIEW: A, T, clock_diff, sampling_est from full-year counts, no error
                       ranges (the *_lo/*_hi fields are null)
Counts use the plan's filters (daytime, type 0, MODIS confidence >= 30, VIIRS n or h).
"""
import sys, os, json
import numpy as np, pandas as pd

src, dst = sys.argv[1], sys.argv[2]
REG = {"br-amazon": "amazon", "br-cerrado": "cerrado", "br-pantanal": "pantanal"}
daily = pd.read_csv(os.path.join(src, "firms_daily_by_biome.csv"))
drift = pd.read_csv(os.path.join(src, "firms_drift_by_biome.csv"))
daily["ym"] = daily.date.str[:7]; daily["year"] = daily.date.str[:4].astype(int)
START = {"Aqua": "2002-07", "S-NPP": "2012-01", "NOAA-20": "2018-01"}  # first month with data

def write(rel, obj):
    p = os.path.join(dst, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f: json.dump(obj, f, indent=1)
    print("wrote", p)

def num(x, nd=3):
    return None if x is None or not np.isfinite(x) else round(float(x), nd)

for rid, biome in REG.items():
    d = daily[daily.biome == biome]
    lst = drift[drift.biome == biome].pivot(index="year", columns="satellite", values="median_local_time")
    def t(y, s):
        return lst.at[y, s] if (y in lst.index and s in lst.columns and isinstance(lst.at[y, s], str)) else None

    # drift
    write(f"drift/{rid}.json", {"mock": False,
        "note": "Real. Median local solar time (UTC + lon/15) of near-nadir daytime vegetation-fire detections, NASA FIRMS yearly files. viirs_lst is S-NPP. No 2026 yet.",
        "region": rid,
        "years": [{"year": int(y), "aqua_lst": t(y, "Aqua"), "terra_lst": t(y, "Terra"), "viirs_lst": t(y, "S-NPP")}
                  for y in range(2012, 2026)]})

    # calendar (raw counts only)
    m = d.groupby(["ym", "satellite"])["count"].sum().unstack("satellite")
    months = []
    for ym in pd.period_range("2002-01", "2025-12", freq="M").astype(str):
        def c(s):
            if ym < START[s]: return None
            return int(m.at[ym, s]) if (ym in m.index and s in m.columns and pd.notna(m.at[ym, s])) else 0
        flags = ["outage"] if ym in ("2022-07", "2022-08") else []
        months.append({"ym": ym, "fixed": None, "lo": None, "hi": None, "aqua": c("Aqua"), "snpp": c("S-NPP"),
                       "noaa20": c("NOAA-20"), "flags": flags, "median_ref": None, "anomaly_pct": None})
    write(f"calendar/{rid}.json", {"mock": False,
        "note": "Raw monthly counts (aqua, snpp, noaa20) are real, from NASA FIRMS with the plan's filters. fixed, lo, hi, median_ref and anomaly_pct are null: the fixed-clock series is not computed yet. The outage flag on 2022-07/08 follows the mock contract and has not been checked against the data.",
        "region": rid, "unit": "fixed-clock Aqua-equivalent hotspots", "months": months})

    # two clocks (preview)
    y = d[d.year >= 2012].groupby(["year", "satellite"])["count"].sum().unstack("satellite")
    A = y["Aqua"] / y["S-NPP"]; T = y["Terra"] / y["S-NPP"]
    A = A / A.loc[2012:2020].mean(); T = T / T.loc[2012:2020].mean()
    yrs = []
    for yr in range(2012, 2026):
        la, lt = np.log(A[yr]), np.log(T[yr])
        yrs.append({"year": yr, "aqua_lst": t(yr, "Aqua"), "terra_lst": t(yr, "Terra"),
                    "A": num(A[yr]), "A_lo": None, "A_hi": None, "T": num(T[yr]), "T_lo": None, "T_hi": None,
                    "clock_diff": num(la - lt), "clock_lo": None, "clock_hi": None, "sampling_est": num((la + lt) / 2)})
    write(f"twoclocks/{rid}.json", {"mock": False, "preview": True,
        "note": "PREVIEW, not the final test. Real FIRMS counts, but full calendar years (not burning season), outage days not dropped, VIIRS = S-NPP only, and no error ranges (*_lo/*_hi are null). To be replaced by the statistics lane.",
        "region": rid,
        "fields": "A, T = Aqua/VIIRS and Terra/VIIRS ratios vs 2012-2020 (1 = no change); clock_diff = log A - log T; sampling_est = (log A + log T) / 2 (log units)",
        "years": yrs})
