"""Fire-regime falsification test for the Aqua drift explanation of the Amazon audit excess.

L(sat, stratum, year) = sum sat daytime count / sum (S-NPP count * R_stratum[month]) over days both satellites
returned data (a satellite is 'down' on a day with no daytime detection anywhere in Brazil);
R_stratum[month] = 2012-2020 sat/S-NPP ratio for that calendar month in that stratum (same up-day rule).
Strata are defined from 2012-2020 data only (rules in README.md). Interval: 16-day block Poisson bootstrap
(1000 reps, seed 20261114), reference ratio held fixed. Filters: daynight == 'D', Amazon biome via 0.1 deg lookup.

Usage: python regime_test.py RAW_DIR BIOME_LOOKUP OUT_DIR
"""
import sys, os
import numpy as np
import pandas as pd

RAW, LUT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
YEARS = range(2012, 2026)
REF = range(2012, 2021)
TEST = range(2021, 2026)
SEED, NBOOT, BLOCK = 20261114, 1000, 16
MIN_CELL = 200  # min 2012-2020 Aqua+Terra Amazon detections for a 0.5 deg cell to get a diurnal index

lut = pd.read_csv(LUT, usecols=["cell_lat", "cell_lon", "biome"])
amz = set(zip(lut.cell_lat[lut.biome == "amazon"], lut.cell_lon[lut.biome == "amazon"]))
amz_idx = pd.MultiIndex.from_tuples(list(amz))

def load(path, sensor):
    df = pd.read_csv(path, usecols=["latitude", "longitude", "acq_date", "acq_time", "satellite", "daynight"])
    df = df[df.daynight == "D"]
    if sensor == "viirs":
        df = df.assign(satellite="SNPP")
    up = df.groupby("satellite").acq_date.unique()
    cl = np.floor(df.latitude * 10).astype(int); co = np.floor(df.longitude * 10).astype(int)
    df = df[pd.MultiIndex.from_arrays([cl, co]).isin(amz_idx)]
    t = (df.acq_time // 100) + (df.acq_time % 100) / 60.0
    df = df.assign(lst=(t + df.longitude / 15.0) % 24,
                   c5lat=np.floor(df.latitude * 2).astype(int), c5lon=np.floor(df.longitude * 2).astype(int))
    return df[["acq_date", "satellite", "lst", "c5lat", "c5lon", "latitude", "longitude"]], up

CACHE = sys.argv[4] if len(sys.argv) > 4 else OUT
cache = os.path.join(CACHE, "_cache_amazon_D.parquet")
upcache = os.path.join(CACHE, "_cache_updays.csv")
if os.path.exists(cache):
    det = pd.read_parquet(cache); upd = pd.read_csv(upcache)
else:
    parts, ups = [], []
    for y in YEARS:
        for sensor, pat in [("modis", f"modis_{y}_Brazil.csv"), ("viirs", f"viirs-snpp_{y}_Brazil.csv")]:
            d, up = load(os.path.join(RAW, pat), sensor)
            parts.append(d)
            for s, days in up.items():
                ups.append(pd.DataFrame({"satellite": s, "date": days}))
            print("loaded", pat, len(d), flush=True)
    det = pd.concat(parts, ignore_index=True); upd = pd.concat(ups, ignore_index=True)
    det.to_parquet(cache); upd.to_csv(upcache, index=False)
det["date"] = pd.to_datetime(det.acq_date); det["year"] = det.date.dt.year
upset = {s: set(pd.to_datetime(g.date)) for s, g in upd.groupby("satellite")}

# ---------- stratification (2012-2020 only) ----------
ref = det[det.year.isin(REF)]
both_mt = upset["Aqua"] & upset["Terra"]
r = ref[ref.satellite.isin(["Aqua", "Terra"]) & ref.date.isin(both_mt)]
cc = r.groupby(["c5lat", "c5lon", "satellite"]).size().unstack(fill_value=0)
cc = cc[(cc.Aqua + cc.Terra) >= MIN_CELL].copy()
cc["AT"] = cc.Aqua / cc.Terra.clip(lower=1)
cc = cc.sort_values("AT")
w = cc.Aqua.cumsum() / cc.Aqua.sum()  # terciles weighted by 2012-2020 Aqua detections
cc["tercile"] = np.where(w <= 1 / 3, "T1_low_AT", np.where(w <= 2 / 3, "T2_mid_AT", "T3_high_AT"))
cuts = [cc.AT[cc.tercile == t].max() for t in ["T1_low_AT", "T2_mid_AT"]]
cellmap = cc.tercile.to_dict()
det["diurnal"] = [cellmap.get(k, "sparse") for k in zip(det.c5lat, det.c5lon)]

# geographic: arc of deforestation = south of 5S or east of 48W; interior = the rest
det["geo"] = np.where((det.latitude < -5) | (det.longitude > -48), "arc", "interior")

# ---------- L and bootstrap ----------
rng = np.random.default_rng(SEED)
days_all = pd.date_range("2012-01-01", "2025-12-31")

def daily(sub, sat):
    a = sub[sub.satellite == sat].groupby("date").size().reindex(days_all, fill_value=0)
    v = sub[sub.satellite == "SNPP"].groupby("date").size().reindex(days_all, fill_value=0)
    ok = pd.Series(days_all.isin(list(upset[sat] & upset["SNPP"])), index=days_all)
    return a[ok], v[ok]

rows = []
def run(stratum_col, name, sub):
    for sat in ["Aqua", "Terra"]:
        a, v = daily(sub, sat)
        isref = a.index.year.isin(list(REF))
        R = (a[isref].groupby(a.index[isref].month).sum() / v[isref].groupby(v.index[isref].month).sum())
        e = v * R.reindex(v.index.month).values
        for y in TEST:
            m = a.index.year == y
            ay, ey = a[m].values.astype(float), e[m].values
            if ey.sum() == 0:
                continue
            doy = (a.index[m].day_of_year.values - 1) // BLOCK
            nb = doy.max() + 1
            A = np.bincount(doy, ay, nb); E = np.bincount(doy, ey, nb)
            W = rng.poisson(1.0, (NBOOT, nb))
            bs = (W @ A) / (W @ E)
            lst = sub[(sub.satellite == sat) & (sub.year == y)].lst.median()
            rows.append(dict(scheme=stratum_col, stratum=name, sat=sat, year=y, L=ay.sum() / ey.sum(),
                             lo=np.nanpercentile(bs, 2.5), hi=np.nanpercentile(bs, 97.5),
                             n_sat=int(ay.sum()), n_expected=round(ey.sum(), 1), median_lst=lst))

run("all", "amazon", det)
for s in ["T1_low_AT", "T2_mid_AT", "T3_high_AT", "sparse"]:
    run("diurnal", s, det[det.diurnal == s])
for s in ["arc", "interior"]:
    run("geo", s, det[det.geo == s])
res = pd.DataFrame(rows)
res.to_csv(os.path.join(OUT, "regime_L.csv"), index=False)

# reference descriptors per stratum (2012-2020)
desc = []
for col in ["diurnal", "geo"]:
    for s, g in ref.assign(diurnal=det.loc[ref.index, "diurnal"], geo=det.loc[ref.index, "geo"]).groupby(col):
        gg = g[g.date.isin(both_mt)]
        na, nt = (gg.satellite == "Aqua").sum(), (gg.satellite == "Terra").sum()
        desc.append(dict(scheme=col, stratum=s, ref_aqua=int(na), ref_terra=int(nt), ref_AT=na / max(nt, 1),
                         aqua_lst_ref=g[g.satellite == "Aqua"].lst.median(), terra_lst_ref=g[g.satellite == "Terra"].lst.median(),
                         n_cells=int((cc.tercile == s).sum()) if col == "diurnal" else None))
desc = pd.DataFrame(desc)
desc.to_csv(os.path.join(OUT, "regime_reference.csv"), index=False)
# cross-tab: share of each diurnal tercile's 2012-2020 Aqua detections in the arc
xt = pd.crosstab(det.loc[ref.index][ref.satellite == "Aqua"].diurnal, det.loc[ref.index][ref.satellite == "Aqua"].geo, normalize="index")

def hm(x):
    h = int(x); m = int(round((x - h) * 60)); return f"{h:02d}:{m:02d}"
with open(os.path.join(OUT, "results.md"), "w") as f:
    f.write("# Regime test results (generated by regime_test.py)\n\n")
    f.write(f"Diurnal-index rule: 0.5 deg Amazon cells with >= {MIN_CELL} Aqua+Terra daytime detections 2012-2020 (days both up); "
            f"index = Aqua/Terra count ratio 2012-2020; terciles weighted by 2012-2020 Aqua detections. "
            f"Cut points: A/T <= {cuts[0]:.3f} (T1), <= {cuts[1]:.3f} (T2), above (T3). Cells: {len(cc)}.\n\n")
    f.write("Geographic rule: arc = latitude < -5 or longitude > -48; interior = rest of the Amazon biome.\n\n")
    f.write("## Reference (2012-2020) descriptors\n\n" + desc.to_markdown(index=False, floatfmt=".3f") + "\n\n")
    f.write("## Share of 2012-2020 Aqua detections by diurnal tercile x geography\n\n" + xt.to_markdown(floatfmt=".3f") + "\n\n")
    f.write("## L, 2021-2025 (95% 16-day block Poisson bootstrap, 1000 reps, seed 20261114)\n\n")
    t = res.copy(); t["CI"] = t.apply(lambda r: f"{r.lo:.3f}-{r.hi:.3f}", axis=1); t["LST"] = t.median_lst.map(hm)
    f.write(t[["scheme", "stratum", "sat", "year", "L", "CI", "LST", "n_sat", "n_expected"]].to_markdown(index=False, floatfmt=".3f") + "\n")
print(open(os.path.join(OUT, "results.md")).read())
