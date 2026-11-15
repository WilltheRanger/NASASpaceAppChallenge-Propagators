"""Statistics lane: clock audit L, noise floor, block bootstrap, fire-size check, two clocks, fire-day curve.

Usage: python3 analysis/statistics/audit.py analysis/brazil-data/out data/out analysis/statistics/out
Inputs : CSV_DIR/firms_daily_by_biome.csv, CSV_DIR/firms_drift_by_biome.csv (brady/brazil-data);
         STATS_DIR/regions_daily.csv, regions_drift.csv (region_counts.py) when present
Outputs: JSON_DIR/audit/<id>.json, twoclocks/<id>.json, fireday/<id>.json, calendar/<id>.json, drift/<id>.json
         (non-Brazil, if missing); STATS_DIR/*.csv (every region, every number behind the checks)
Method : research/execution-plan.md section 4.D-4.E; definitions in analysis/statistics/README.md.
"""
import sys, os, json
import numpy as np, pandas as pd
np.seterr(divide="ignore", invalid="ignore")  # empty bootstrap replicates become nan and are dropped in ci()

src, dst, sdir = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(sdir, exist_ok=True)
NB, SEED, BLOCK = 1000, 20261114, 16
BASE, AUDIT, YEARS = list(range(2012, 2021)), list(range(2021, 2026)), list(range(2012, 2026))
BIOMES = ["amazon", "cerrado", "caatinga", "mata_atlantica", "pantanal", "pampa"]
REG = {"br-amazon": "amazon", "br-cerrado": "cerrado", "br-pantanal": "pantanal"}
OTHER = {"ar-argentina": "argentina", "in-punjab-haryana": "punjab_haryana", "us-california": "california"}
SRC = {"argentina": "FIRMS Argentina country files", "punjab_haryana": "FIRMS India country files, preset bbox",
       "california": "FIRMS United States country files, simplified state outline"}
MIN_EXPECTED, MAX_REL_CI = 300, 0.25  # below / above these an audit year is insufficient_data

daily_all = pd.read_csv(os.path.join(src, "firms_daily_by_biome.csv"))
drift = pd.read_csv(os.path.join(src, "firms_drift_by_biome.csv"))
dates = pd.date_range("2012-01-01", "2025-12-31").strftime("%Y-%m-%d")
yr = dates.str[:4].astype(int).values
mo = dates.str[5:7].astype(int).values - 1
ny = len(YEARS)

# a satellite is down on a day with no daytime detection anywhere in Brazil; applied to every region
up = daily_all[daily_all.date >= "2012-01-01"].groupby(["date", "satellite"]).count_all.sum().unstack().reindex(dates).notna()
if os.path.exists(os.path.join(sdir, "regions_daily.csv")):
    daily_all = pd.concat([daily_all, pd.read_csv(os.path.join(sdir, "regions_daily.csv"))])
    drift = pd.concat([drift, pd.read_csv(os.path.join(sdir, "regions_drift.csv"))])
    have = set(daily_all.biome)
    REG.update({k: v for k, v in OTHER.items() if v in have})
    BIOMES += [v for v in OTHER.values() if v in have]
daily = daily_all[daily_all.date >= "2012-01-01"]
valid = {ref: (up["Aqua"] & up["Terra"] & up[ref]).values for ref in ["S-NPP", "NOAA-20"]}

# Poisson bootstrap over 16-day blocks (the MODIS repeat cycle; counts are autocorrelated); row 0 is the point estimate.
# Same weights for every biome and satellite.
rng = np.random.default_rng(SEED)
blk = np.arange(len(dates)) // BLOCK
W = np.vstack([np.ones(len(dates)), rng.poisson(1.0, (NB, blk[-1] + 1))[:, blk]]).astype(np.float32)
YM = np.zeros((len(dates), ny * 12), np.float32)
YM[np.arange(len(dates)), (yr - 2012) * 12 + mo] = 1

def ymsum(x, mask):
    # (NB+1, years, 12) bootstrap sums of a daily series over valid days
    return (W @ (YM * (x * mask)[:, None])).reshape(-1, ny, 12)

def iy(years):
    return [y - 2012 for y in years]

def L(A, V, base, target):
    # L = observed Aqua / (VIIRS x baseline month ratio R_m); empty baseline months fall back to the pooled ratio
    Ab, Vb = A[:, iy(base)].sum(1), V[:, iy(base)].sum(1)
    pooled = (Ab.sum(1) / Vb.sum(1))[:, None]
    R = np.where(Vb > 0, Ab / np.where(Vb > 0, Vb, 1), pooled)
    E = (V[:, iy([target])[0]] * R).sum(1)
    return A[:, iy([target])[0]].sum(1) / E, E, R

def ci(x, lo=2.5, hi=97.5):
    b = x[1:][np.isfinite(x[1:])]
    return (np.percentile(b, lo), np.percentile(b, hi)) if len(b) else (np.nan, np.nan)

def num(x, nd=3):
    return None if x is None or not np.isfinite(x) else round(float(x), nd)

def hhmm(h):
    if h is None or not np.isfinite(h): return None
    m = int(round(h * 60)); return f"{m // 60:02d}:{m % 60:02d}"

def write(rel, obj):
    p = os.path.join(dst, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f: json.dump(obj, f, indent=1)
    print("wrote", p)

lst = drift.pivot_table(index=["biome", "year"], columns="satellite", values="lst_median")
rows, tc_rows, pl_rows, fd_rows, ref_rows = [], [], [], [], []
res = {}

for biome in BIOMES:
    d = daily[daily.biome == biome]
    c = d.groupby(["date", "satellite"])["count"].sum().unstack().reindex(dates).fillna(0)
    f = d.groupby(["date", "satellite"])["frp_sum"].sum().unstack().reindex(dates).fillna(0)
    for s in ["Aqua", "Terra", "S-NPP", "NOAA-20"]:
        if s not in c: c[s] = 0.0; f[s] = 0.0
    v = valid["S-NPP"]
    A, T, V = (ymsum(c[s].values, v) for s in ["Aqua", "Terra", "S-NPP"])
    t = lambda y, s: lst.at[(biome, y), s] if (biome, y) in lst.index and pd.notna(lst.at[(biome, y), s]) else np.nan
    tA0 = np.nanmean([t(y, "Aqua") for y in BASE]); tT0 = np.nanmean([t(y, "Terra") for y in BASE])

    # fire-size check: classify days by S-NPP mean FRP per detection, terciles of baseline detections
    mfrp = np.where(c["S-NPP"] > 0, f["S-NPP"] / c["S-NPP"].where(c["S-NPP"] > 0, 1), 0.0)
    bm = np.isin(yr, BASE) & v & (c["S-NPP"].values > 0)
    order = np.argsort(mfrp[bm]); cw = np.cumsum(c["S-NPP"].values[bm][order]); cw /= cw[-1]
    cuts = [mfrp[bm][order][np.searchsorted(cw, q)] for q in (1 / 3, 2 / 3)]
    cls = np.digitize(mfrp, cuts)  # zero-VIIRS days fall in the lowest class
    Ak = [ymsum(c["Aqua"].values * (cls == k), v) for k in range(3)]
    Vk = [ymsum(c["S-NPP"].values * (cls == k), v) for k in range(3)]
    wk = np.array([a[0, iy(BASE)].sum() for a in Ak]); wk = wk / wk.sum()

    # NOAA-20 reference (P6), both references on a 2018-2020 baseline
    v2 = valid["NOAA-20"]
    A2, V2 = ymsum(c["Aqua"].values, v2), ymsum(c["NOAA-20"].values, v2)
    A1, V1 = ymsum(c["Aqua"].values, v2), ymsum(c["S-NPP"].values, v2)

    out = {"A": {}, "T": {}}
    for y in YEARS:
        base = [b for b in BASE if b != y]  # baseline years are scored leave-one-out (placebo)
        la, ea, _ = L(A, V, base, y); lt, _, _ = L(T, V, base, y)
        out["A"][y], out["T"][y] = la, lt
        lo, hi = ci(la); lo90, hi90 = ci(la, 5, 95)
        rec = dict(biome=biome, year=y, placebo=y in BASE, L=la[0], L_lo=lo, L_hi=hi, L_lo90=lo90, L_hi90=hi90,
                   aqua_count=A[0, y - 2012].sum(), expected=ea[0],
                   aqua_lst=t(y, "Aqua"), terra_lst=t(y, "Terra"), viirs_lst=t(y, "S-NPP"))
        if y in AUDIT:
            Ls = sum(wk[k] * L(Ak[k], Vk[k], BASE, y)[0] for k in range(3))
            rec.update(L_strat=Ls[0], L_strat_lo=ci(Ls)[0], L_strat_hi=ci(Ls)[1])
            l1, l2 = L(A1, V1, [2018, 2019, 2020], y)[0], L(A2, V2, [2018, 2019, 2020], y)[0]
            ref_rows.append(dict(biome=biome, year=y, L_snpp=l1[0], L_snpp_lo=ci(l1)[0], L_snpp_hi=ci(l1)[1],
                                 L_noaa20=l2[0], L_noaa20_lo=ci(l2)[0], L_noaa20_hi=ci(l2)[1]))
        (pl_rows if y in BASE else rows).append(rec)
        dA, dT = t(y, "Aqua") - tA0, t(y, "Terra") - tT0
        cd = np.log(la) - np.log(lt)
        tc_rows.append(dict(biome=biome, year=y, A=la[0], A_lo=lo, A_hi=hi, T=lt[0], T_lo=ci(lt)[0], T_hi=ci(lt)[1],
                            clock_diff=cd[0], clock_lo=ci(cd)[0], clock_hi=ci(cd)[1],
                            sampling_est=(np.log(la[0]) + np.log(lt[0])) / 2, dA_h=dA, dT_h=dT,
                            clock_share_logA=cd[0] * dA / (dA - dT) if abs(dA - dT) > 1e-6 else np.nan,
                            logL=np.log(la[0]), logL_lo=np.log(lo), logL_hi=np.log(hi), aqua_lst=t(y, "Aqua"),
                            terra_lst=t(y, "Terra")))

    # fire-day curve: Aqua and Terra are the same MODIS sensor on the same days, so
    # log(Aqua/Terra) = beta x (Aqua time - Terra time) once fire weather cancels
    Dr = np.log(A.sum(2) / T.sum(2))  # (NB+1, years)
    gap = np.array([t(y, "Aqua") - t(y, "Terra") for y in YEARS])
    bi = iy(BASE)
    beta_base = Dr[:, bi].sum(1) / gap[bi].sum()
    X = np.c_[np.ones(ny), gap]
    coef = np.linalg.lstsq(X, Dr.T, rcond=None)[0]  # (2, NB+1): intercept, slope over 2012-2025
    for i, y in enumerate(YEARS):
        fd_rows.append(dict(biome=biome, year=y, aqua_lst=t(y, "Aqua"), terra_lst=t(y, "Terra"), gap_h=gap[i],
                            log_aqua_over_terra=Dr[0, i], lo=ci(Dr[:, i])[0], hi=ci(Dr[:, i])[1]))
    res[biome] = dict(beta_base=beta_base, slope=coef[1], intercept=coef[0], tA0=tA0, tT0=tT0, wk=wk, cuts=cuts,
                      R=L(A, V, BASE, 2021)[2], ratio=A[0, bi].sum() / V[0, bi].sum(), c=c)

audit = pd.DataFrame(rows); plac = pd.DataFrame(pl_rows); tc = pd.DataFrame(tc_rows)
fd = pd.DataFrame(fd_rows); refs = pd.DataFrame(ref_rows)
nf = plac.groupby("biome").L.agg(lambda s: np.max(np.abs(s - 1))).rename("noise_floor")
prange = plac.groupby("biome").L.agg(["min", "max"]).rename(columns={"min": "placebo_min", "max": "placebo_max"})
audit = audit.join(nf, on="biome").join(prange, on="biome")
audit["outside_placebo"] = (audit.L < audit.placebo_min) | (audit.L > audit.placebo_max)
audit["status"] = np.where((audit.expected < MIN_EXPECTED) | ((audit.L_hi - audit.L_lo) / 2 / audit.L > MAX_REL_CI),
                           "insufficient_data", "ok")
audit["gap_pct"] = (audit.L - 1) * 100
for b in BIOMES:
    r = res[b]
    audit.loc[audit.biome == b, "beta_base"] = r["beta_base"][0]
    audit.loc[audit.biome == b, "L_pred"] = np.exp(r["beta_base"][0] * (audit.loc[audit.biome == b, "aqua_lst"] - r["tA0"]))
audit["shift_h"] = audit.aqua_lst - audit.biome.map({b: res[b]["tA0"] for b in BIOMES})
audit.to_csv(os.path.join(sdir, "audit_by_biome.csv"), index=False, float_format="%.5g")
plac.to_csv(os.path.join(sdir, "placebo_by_biome.csv"), index=False, float_format="%.5g")
tc.to_csv(os.path.join(sdir, "twoclocks_by_biome.csv"), index=False, float_format="%.5g")
fd.to_csv(os.path.join(sdir, "fireday_by_biome.csv"), index=False, float_format="%.5g")
refs.to_csv(os.path.join(sdir, "reference_satellite_by_biome.csv"), index=False, float_format="%.5g")
pd.DataFrame([dict(biome=b, beta_base=res[b]["beta_base"][0], beta_base_lo=ci(res[b]["beta_base"])[0],
                   beta_base_hi=ci(res[b]["beta_base"])[1], slope_2012_2025=res[b]["slope"][0],
                   intercept_2012_2025=res[b]["intercept"][0], frp_cut1=res[b]["cuts"][0], frp_cut2=res[b]["cuts"][1],
                   baseline_ratio=res[b]["ratio"]) for b in BIOMES]).to_csv(
    os.path.join(sdir, "fireday_slopes.csv"), index=False, float_format="%.5g")

START = {"Aqua": "2002-07", "S-NPP": "2012-01", "NOAA-20": "2018-01"}  # first month with data
raw_m = daily_all.assign(ym=daily_all.date.str[:7]).groupby(["biome", "ym", "satellite"])["count"].sum()
for rid, b in REG.items():
    note = (f"Real. NASA FIRMS MODIS C6.1 and VIIRS daily counts ({SRC.get(b, 'brady/brazil-data')}). "
            "AI-generated analysis (Claude); team review required before any slide.")
    a = audit[audit.biome == b]
    if b in SRC and not os.path.exists(os.path.join(dst, f"drift/{rid}.json")):
        write(f"drift/{rid}.json", {"mock": False, "region": rid,
            "note": note + " Median local solar time (UTC + lon/15) of near-nadir daytime vegetation-fire detections. viirs_lst is S-NPP.",
            "years": [{"year": int(q.year), "aqua_lst": hhmm(q.aqua_lst), "terra_lst": hhmm(q.terra_lst),
                       "viirs_lst": hhmm(q.viirs_lst)} for q in pd.concat([plac, audit])[lambda x: x.biome == b].sort_values("year").itertuples()]})
    write(f"audit/{rid}.json", {"mock": False, "note": note, "region": rid,
        "method": "L = Aqua count / (S-NPP count x 2012-2020 Aqua/S-NPP ratio by calendar month); 95% 16-day block bootstrap (1000); noise floor = max |L - 1| over leave-one-out placebo years 2012-2020",
        "baseline": {"years": "2012-2020", "ratio": num(res[b]["ratio"]), "noise_floor": num(nf[b]),
                     "placebo_min": num(prange.at[b, "placebo_min"]), "placebo_max": num(prange.at[b, "placebo_max"])},
        "years": [{"year": int(r.year), "status": r.status,
                   **({k: num(getattr(r, k)) for k in ["L", "L_lo", "L_hi", "L_strat"]} if r.status == "ok" else
                      {"L": None, "L_lo": None, "L_hi": None, "L_strat": None}),
                   "aqua_count": int(r.aqua_count), "fixed_count": int(round(r.expected)),
                   "gap_pct": num(r.gap_pct, 1) if r.status == "ok" else None,
                   "outside_noise": bool(r.outside_placebo)} for r in a.itertuples()]})
    write(f"twoclocks/{rid}.json", {"mock": False, "preview": False, "note": note, "region": rid,
        "fields": "A, T = Aqua/VIIRS and Terra/VIIRS ratios vs 2012-2020 by calendar month (1 = no change; 2012-2020 years leave themselves out); clock_diff = log A - log T; sampling_est = (log A + log T) / 2 (log units); 95% 16-day block bootstrap",
        "years": [{"year": int(r.year), "aqua_lst": hhmm(r.aqua_lst), "terra_lst": hhmm(r.terra_lst),
                   **{k: num(getattr(r, k)) for k in ["A", "A_lo", "A_hi", "T", "T_lo", "T_hi", "clock_diff",
                                                     "clock_lo", "clock_hi", "sampling_est"]}}
                  for r in tc[tc.biome == b].itertuples()]})
    r = res[b]
    write(f"fireday/{rid}.json", {"mock": False, "note": note, "region": rid,
        "fields": "log_aqua_over_terra = log(Aqua/Terra) daytime counts on the same days; gap_h = Aqua minus Terra look time (hours); beta = change in log fire count per hour of look time",
        "beta_baseline": num(r["beta_base"][0]), "beta_baseline_ci95": [num(x) for x in ci(r["beta_base"])],
        "beta_fit_2012_2025": {"slope": num(r["slope"][0]), "intercept": num(r["intercept"][0]),
                               "slope_ci95": [num(x) for x in ci(r["slope"])]},
        "years": [{"year": int(q.year), "aqua_lst": hhmm(q.aqua_lst), "terra_lst": hhmm(q.terra_lst),
                   "gap_h": num(q.gap_h), "log_aqua_over_terra": num(q.log_aqua_over_terra), "lo": num(q.lo),
                   "hi": num(q.hi)} for q in fd[fd.biome == b].itertuples()]})

    # fixed-clock calendar: Aqua before 2012 (its clock had not drifted), then S-NPP x R_m in Aqua units;
    # S-NPP outage days are filled with NOAA-20 x their 2018-2025 overlap ratio
    rm = raw_m.loc[b] if b in raw_m.index.get_level_values(0) else pd.Series(dtype=float)
    def raw(ym, s):
        if ym < START[s]: return None
        return int(rm.get((ym, s), 0))
    cal = {"mock": False, "region": rid, "unit": "fixed-clock Aqua-equivalent hotspots",
           "months": [{"ym": ym, "fixed": None, "lo": None, "hi": None, "aqua": raw(ym, "Aqua"), "snpp": raw(ym, "S-NPP"),
                       "noaa20": raw(ym, "NOAA-20"), "flags": [], "median_ref": None, "anomaly_pct": None}
                      for ym in pd.period_range("2002-01", "2025-12", freq="M").astype(str)]}
    c = r["c"]; both = up["S-NPP"].values & up["NOAA-20"].values & (yr >= 2018)
    k = c["S-NPP"].values[both].sum() / c["NOAA-20"].values[both].sum()
    vf = np.where(up["S-NPP"].values, c["S-NPP"].values, np.where(up["NOAA-20"].values, k * c["NOAA-20"].values, np.nan))
    vm = pd.Series(vf, index=dates).groupby(dates.str[:7]).sum(min_count=1)
    gaps = pd.Series(np.isnan(vf), index=dates).groupby(dates.str[:7]).sum()  # 2012-01: S-NPP not yet flying
    vm[gaps[gaps > 0].index] = np.nan
    filled = pd.Series(~up["S-NPP"].values & up["NOAA-20"].values, index=dates).groupby(dates.str[:7]).sum()
    R = r["R"]; Rlo, Rhi = np.percentile(R[1:], 2.5, axis=0), np.percentile(R[1:], 97.5, axis=0)
    for m in cal["months"]:
        ym = m["ym"]; i = int(ym[5:]) - 1
        if ym < "2012-01" or (ym < "2021-01" and not np.isfinite(vm.get(ym, np.nan))):
            m["fixed"] = m["lo"] = m["hi"] = m["aqua"]
        elif ym in vm.index and np.isfinite(vm[ym]):
            m["fixed"], m["lo"], m["hi"] = (int(round(vm[ym] * x)) for x in (R[0, i], Rlo[i], Rhi[i]))
        m["flags"] = ["outage"] if filled.get(ym, 0) >= 3 else []
    med = pd.DataFrame(cal["months"]).dropna(subset=["fixed"]).assign(mm=lambda x: x.ym.str[5:]).groupby("mm").fixed.median()
    for m in cal["months"]:
        mr = med.get(m["ym"][5:])
        m["median_ref"] = None if mr is None else round(float(mr), 1)
        m["anomaly_pct"] = None if m["fixed"] is None or not mr else round((m["fixed"] / mr - 1) * 100, 1)
    cal["note"] = (note + " aqua, snpp, noaa20 = raw monthly counts with the plan's filters. fixed = Aqua count before 2012 (Aqua's clock had not drifted), then S-NPP count x the 2012-2020 "
                   "Aqua/S-NPP ratio for that calendar month, in Aqua units; lo/hi from the block bootstrap of that ratio; "
                   f"S-NPP outage days filled with NOAA-20 x {k:.3f}. outage flag = 3 or more S-NPP outage days in the month. "
                   "median_ref = median fixed count for that calendar month, 2002-2025.")
    write(f"calendar/{rid}.json", cal)

# regions.json: the mock's names and boxes, restricted to regions with real outputs
regs = json.load(open(os.path.join(os.path.dirname(os.path.abspath(dst)), "mock", "regions.json")))["regions"]
write("regions.json", {"mock": False, "note": "Regions with real audit, calendar, two-clocks and fire-day files. bbox is for map framing; "
                       "Brazil biomes use INPE's biome labels, Punjab + Haryana uses this bbox, California a simplified state outline.",
                       "regions": [g for g in regs if g["id"] in REG]})
print("done")
