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
from scipy.optimize import least_squares
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
COL = "count_all"  # every daytime detection, as INPE counts them (P3: 96.6% of biome-months within 10%)

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
# each comparison drops only days when one of its own satellites was down
M_AS = (up["Aqua"] & up["S-NPP"]).values                     # audit L, fire-size check, calendar ratio
M_ATS = (up["Aqua"] & up["Terra"] & up["S-NPP"]).values      # two clocks, fire-day curve
M_ASN = (up["Aqua"] & up["S-NPP"] & up["NOAA-20"]).values    # reference check: both VIIRS on the same days
pd.DataFrame({"ym": dates.str[:7], "days": 1, "aqua_snpp": M_AS, "aqua_terra_snpp": M_ATS,
              "aqua_snpp_noaa20": M_ASN}).groupby("ym").sum().to_csv(os.path.join(sdir, "retained_days.csv"))

# Poisson bootstrap over 16-day blocks (the MODIS repeat cycle; counts are autocorrelated); row 0 is the point estimate.
# Same weights for every biome and satellite.
rng = np.random.default_rng(SEED)
blk = np.arange(len(dates)) // BLOCK
W = np.vstack([np.ones(len(dates)), rng.poisson(1.0, (NB, blk[-1] + 1))[:, blk]]).astype(np.float32)
# sensitivity weights: day-level (P4's written rule) and 32-day blocks
W1 = np.vstack([np.ones(len(dates)), rng.poisson(1.0, (NB, len(dates)))]).astype(np.float32)
b32 = np.arange(len(dates)) // 32
W32 = np.vstack([np.ones(len(dates)), rng.poisson(1.0, (NB, b32[-1] + 1))[:, b32]]).astype(np.float32)
YM = np.zeros((len(dates), ny * 12), np.float32)
YM[np.arange(len(dates)), (yr - 2012) * 12 + mo] = 1

def ymsum(x, mask, Wm=None):
    # (NB+1, years, 12) bootstrap sums of a daily series over valid days
    return ((W if Wm is None else Wm) @ (YM * (x * mask)[:, None])).reshape(-1, ny, 12)

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

def g(t, p):
    # log fire activity at local solar time t: background b plus a Gaussian peak at h with width sigma
    b, h, s = np.exp(p[0]), p[1], np.exp(p[2])
    return np.log(b + np.exp(-(t - h) ** 2 / (2 * s * s)))

LO, HI = [np.log(1e-3), 11.0, np.log(0.5)], [np.log(10.0), 19.0, np.log(8.0)]

def fit_curve(D, tA, tT, w, x0=None):
    # log(Aqua/Terra) on the same days = g(Aqua time) - g(Terra time); same MODIS sensor, so no offset
    r = lambda p: (g(tA, p) - g(tT, p) - D) * w
    starts = [x0] if x0 is not None else [[np.log(0.2), h0, np.log(2.5)] for h0 in (13.0, 15.0, 17.0)]
    return min((least_squares(r, x, bounds=(LO, HI)) for x in starts), key=lambda z: z.cost).x

def write(rel, obj):
    p = os.path.join(dst, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f: json.dump(obj, f, indent=1)
    print("wrote", p)

lst = drift.pivot_table(index=["biome", "year"], columns="satellite", values="lst_median")
rows, tc_rows, pl_rows, fd_rows, ref_rows = [], [], [], [], []
res = {}

for biome in BIOMES:
    d = daily[daily.biome == biome]
    c = d.groupby(["date", "satellite"])[COL].sum().unstack().reindex(dates).fillna(0)
    # two clocks and the fire-day curve use near-nadir detections only, whose look time is the satellite's
    cn = d[d.near_nadir == 1].groupby(["date", "satellite"])[COL].sum().unstack().reindex(dates).fillna(0)
    f = d.groupby(["date", "satellite"])["frp_sum"].sum().unstack().reindex(dates).fillna(0)
    for s in ["Aqua", "Terra", "S-NPP", "NOAA-20"]:
        if s not in c: c[s] = 0.0; f[s] = 0.0
        if s not in cn: cn[s] = 0.0
    v = M_AS
    A, V = ymsum(c["Aqua"].values, v), ymsum(c["S-NPP"].values, v)
    A1d, V1d = ymsum(c["Aqua"].values, v, W1), ymsum(c["S-NPP"].values, v, W1)
    A32, V32 = ymsum(c["Aqua"].values, v, W32), ymsum(c["S-NPP"].values, v, W32)
    An, Tn, Vn = (ymsum(cn[s].values, M_ATS) for s in ["Aqua", "Terra", "S-NPP"])
    t = lambda y, s: lst.at[(biome, y), s] if (biome, y) in lst.index and pd.notna(lst.at[(biome, y), s]) else np.nan
    tA0 = np.nanmean([t(y, "Aqua") for y in BASE]); tT0 = np.nanmean([t(y, "Terra") for y in BASE])

    # fire-size check: classify days by S-NPP mean FRP per filtered detection, terciles of baseline detections
    cf = d.groupby(["date", "satellite"])["count"].sum().unstack().reindex(dates).fillna(0)
    fs = cf["S-NPP"] if "S-NPP" in cf else c["S-NPP"] * 0
    mfrp = np.where(fs > 0, f["S-NPP"] / fs.where(fs > 0, 1), 0.0)
    bm = np.isin(yr, BASE) & v & (c["S-NPP"].values > 0)
    order = np.argsort(mfrp[bm]); cw = np.cumsum(c["S-NPP"].values[bm][order]); cw /= cw[-1]
    cuts = [mfrp[bm][order][np.searchsorted(cw, q)] for q in (1 / 3, 2 / 3)]
    cls = np.digitize(mfrp, cuts)  # zero-VIIRS days fall in the lowest class
    Ak = [ymsum(c["Aqua"].values * (cls == k), v) for k in range(3)]
    Vk = [ymsum(c["S-NPP"].values * (cls == k), v) for k in range(3)]
    wk = np.array([a[0, iy(BASE)].sum() for a in Ak]); wk = wk / wk.sum()

    # reference check (P6): S-NPP and NOAA-20 as reference on the same days, both on a 2018-2020 baseline
    A2, V2 = ymsum(c["Aqua"].values, M_ASN), ymsum(c["NOAA-20"].values, M_ASN)
    A1, V1 = A2, ymsum(c["S-NPP"].values, M_ASN)

    for y in YEARS:
        base = [b for b in BASE if b != y]  # baseline years are scored leave-one-out (placebo)
        la, ea, _ = L(A, V, base, y)
        lan, ltn = L(An, Vn, base, y)[0], L(Tn, Vn, base, y)[0]
        lo, hi = ci(la); lo90, hi90 = ci(la, 5, 95)
        l1d, l32 = L(A1d, V1d, base, y)[0], L(A32, V32, base, y)[0]
        rec = dict(biome=biome, year=y, placebo=y in BASE, L=la[0], L_lo=lo, L_hi=hi, L_lo90=lo90, L_hi90=hi90,
                   L_lo_day=ci(l1d)[0], L_hi_day=ci(l1d)[1], L_lo_32d=ci(l32)[0], L_hi_32d=ci(l32)[1],
                   aqua_count=A[0, y - 2012].sum(), expected=ea[0],
                   aqua_lst=t(y, "Aqua"), terra_lst=t(y, "Terra"), viirs_lst=t(y, "S-NPP"))
        if y in AUDIT:
            Ls = sum(wk[k] * L(Ak[k], Vk[k], BASE, y)[0] for k in range(3))
            rec.update(L_strat=Ls[0], L_strat_lo=ci(Ls)[0], L_strat_hi=ci(Ls)[1])
            l1, l2 = L(A1, V1, [2018, 2019, 2020], y)[0], L(A2, V2, [2018, 2019, 2020], y)[0]
            dl = l1 - l2  # paired difference between the two references
            ref_rows.append(dict(biome=biome, year=y, L_snpp=l1[0], L_snpp_lo=ci(l1)[0], L_snpp_hi=ci(l1)[1],
                                 L_noaa20=l2[0], L_noaa20_lo=ci(l2)[0], L_noaa20_hi=ci(l2)[1],
                                 diff=dl[0], diff_lo=ci(dl)[0], diff_hi=ci(dl)[1]))
        (pl_rows if y in BASE else rows).append(rec)
        dA, dT = t(y, "Aqua") - tA0, t(y, "Terra") - tT0
        cd = np.log(lan) - np.log(ltn)
        tc_rows.append(dict(biome=biome, year=y, A=lan[0], A_lo=ci(lan)[0], A_hi=ci(lan)[1], T=ltn[0], T_lo=ci(ltn)[0],
                            T_hi=ci(ltn)[1], clock_diff=cd[0], clock_lo=ci(cd)[0], clock_hi=ci(cd)[1],
                            sampling_est=(np.log(lan[0]) + np.log(ltn[0])) / 2, dA_h=dA, dT_h=dT,
                            clock_share_logA=cd[0] * dA / (dA - dT) if abs(dA - dT) > 1e-6 else np.nan,
                            logL=np.log(la[0]), logL_lo=np.log(lo), logL_hi=np.log(hi), aqua_lst=t(y, "Aqua"),
                            terra_lst=t(y, "Terra")))

    # fire-day curve: Aqua and Terra are the same MODIS sensor on the same days, so
    # log(Aqua/Terra) = beta x (Aqua time - Terra time) once fire weather cancels
    Dr = np.log(An.sum(2) / Tn.sum(2))  # (NB+1, years), near-nadir
    gap = np.array([t(y, "Aqua") - t(y, "Terra") for y in YEARS])
    bi = iy(BASE)
    beta_base = Dr[:, bi].sum(1) / gap[bi].sum()
    X = np.c_[np.ones(ny), gap]
    coef = np.linalg.lstsq(X, Dr.T, rcond=None)[0]  # (2, NB+1): intercept, slope over 2012-2025
    # curved fire-day model fitted to the same points; K_y = activity at Aqua's look time vs. its 2012-2020 time
    tAy = np.array([t(y, "Aqua") for y in YEARS]); tTy = np.array([t(y, "Terra") for y in YEARS])
    ok_ = np.isfinite(Dr[0]) & np.isfinite(tAy) & np.isfinite(tTy)
    sd = np.nanstd(Dr[1:], axis=0); w = 1 / np.where(sd > 0, sd, np.nan)
    pc = fit_curve(Dr[0, ok_], tAy[ok_], tTy[ok_], w[ok_])
    pb = np.array([fit_curve(Dr[i, ok_], tAy[ok_], tTy[ok_], w[ok_], pc) if np.isfinite(Dr[i, ok_]).all() else [np.nan] * 3
                   for i in range(1, NB + 1)])
    P = np.vstack([pc, pb])  # (NB+1, 3)
    Kc = np.exp(np.array([[g(tAy[i], q) - g(tA0, q) for i in range(ny)] for q in P]))  # (NB+1, years)
    for i, y in enumerate(YEARS):
        fd_rows.append(dict(biome=biome, year=y, aqua_lst=t(y, "Aqua"), terra_lst=t(y, "Terra"), gap_h=gap[i],
                            log_aqua_over_terra=Dr[0, i], lo=ci(Dr[:, i])[0], hi=ci(Dr[:, i])[1]))
    res[biome] = dict(P=P, Kc=Kc, t_obs=(np.nanmin(tTy), np.nanmax(tAy)), beta_base=beta_base, slope=coef[1], intercept=coef[0], tA0=tA0, tT0=tT0, wk=wk, cuts=cuts,
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
audit["share_of_observed_pct"] = (1 - 1 / audit.L) * 100  # share of Aqua's count above the benchmark
fd["K_curve"] = [res[q.biome]["Kc"][0, q.year - 2012] for q in fd.itertuples()]  # descriptive only, not a correction
audit.to_csv(os.path.join(sdir, "audit_by_biome.csv"), index=False, float_format="%.5g")
plac.to_csv(os.path.join(sdir, "placebo_by_biome.csv"), index=False, float_format="%.5g")
tc.to_csv(os.path.join(sdir, "twoclocks_by_biome.csv"), index=False, float_format="%.5g")
fd.to_csv(os.path.join(sdir, "fireday_by_biome.csv"), index=False, float_format="%.5g")
refs.to_csv(os.path.join(sdir, "reference_satellite_by_biome.csv"), index=False, float_format="%.5g")
pd.DataFrame([dict(biome=b, b=np.exp(res[b]["P"][0, 0]), b_lo=ci(np.exp(res[b]["P"][:, 0]))[0], b_hi=ci(np.exp(res[b]["P"][:, 0]))[1],
                   h=res[b]["P"][0, 1], h_lo=ci(res[b]["P"][:, 1])[0], h_hi=ci(res[b]["P"][:, 1])[1],
                   sigma=np.exp(res[b]["P"][0, 2]), sigma_lo=ci(np.exp(res[b]["P"][:, 2]))[0],
                   sigma_hi=ci(np.exp(res[b]["P"][:, 2]))[1], aqua_lst_2012_2020=res[b]["tA0"]) for b in BIOMES]).to_csv(
    os.path.join(sdir, "fireday_curve.csv"), index=False, float_format="%.5g")
pd.DataFrame([dict(biome=b, beta_base=res[b]["beta_base"][0], beta_base_lo=ci(res[b]["beta_base"])[0],
                   beta_base_hi=ci(res[b]["beta_base"])[1], slope_2012_2025=res[b]["slope"][0],
                   intercept_2012_2025=res[b]["intercept"][0], frp_cut1=res[b]["cuts"][0], frp_cut2=res[b]["cuts"][1],
                   baseline_ratio=res[b]["ratio"]) for b in BIOMES]).to_csv(
    os.path.join(sdir, "fireday_slopes.csv"), index=False, float_format="%.5g")

START = {"Aqua": "2002-07", "S-NPP": "2012-01", "NOAA-20": "2018-01"}  # first month with data
raw_m = daily_all.assign(ym=daily_all.date.str[:7]).groupby(["biome", "ym", "satellite"])[COL].sum()
for rid, b in REG.items():
    note = f"Real. NASA FIRMS MODIS C6.1 and VIIRS daily counts ({SRC.get(b, 'brady/brazil-data')})."
    a = audit[audit.biome == b]
    if b in SRC and not os.path.exists(os.path.join(dst, f"drift/{rid}.json")):
        write(f"drift/{rid}.json", {"mock": False, "region": rid,
            "note": note + " Median local solar time (UTC + lon/15) of near-nadir daytime vegetation-fire detections. viirs_lst is S-NPP.",
            "years": [{"year": int(q.year), "aqua_lst": hhmm(q.aqua_lst), "terra_lst": hhmm(q.terra_lst),
                       "viirs_lst": hhmm(q.viirs_lst)} for q in pd.concat([plac, audit])[lambda x: x.biome == b].sort_values("year").itertuples()]})
    write(f"audit/{rid}.json", {"mock": False, "note": note, "region": rid,
        "method": "L = Aqua daytime hotspot detections / (S-NPP detections x 2012-2020 Aqua/S-NPP ratio by calendar month), on days both satellites returned data; 95% 16-day block bootstrap (1000). gap_pct = (L - 1) x 100, Aqua's excess over the benchmark; share_of_observed_pct = (1 - 1/L) x 100, the part of Aqua's own count above the benchmark. Neither attributes the gap to orbit drift alone.",
        "baseline": {"years": "2012-2020", "ratio": num(res[b]["ratio"]), "noise_floor": num(nf[b]),
                     "placebo_min": num(prange.at[b, "placebo_min"]), "placebo_max": num(prange.at[b, "placebo_max"]),
                     "placebo_years": [{"year": int(q.year), "L": num(q.L)} for q in plac[plac.biome == b].itertuples()]},
        "years": [{"year": int(r.year), "status": r.status,
                   **({k: num(getattr(r, k)) for k in ["L", "L_lo", "L_hi", "L_strat"]} if r.status == "ok" else
                      {"L": None, "L_lo": None, "L_hi": None, "L_strat": None}),
                   "aqua_count": int(r.aqua_count), "fixed_count": int(round(r.expected)),
                   "gap_pct": num(r.gap_pct, 1) if r.status == "ok" else None,
                   "share_of_observed_pct": num(r.share_of_observed_pct, 1) if r.status == "ok" else None,
                   "outside_noise": bool(r.outside_placebo)} for r in a.itertuples()]})
    write(f"twoclocks/{rid}.json", {"mock": False, "preview": False, "note": note, "region": rid,
        "fields": "A, T = Aqua/VIIRS and Terra/VIIRS ratios of near-nadir daytime detections vs 2012-2020 by calendar month (1 = no change; 2012-2020 years leave themselves out); clock_diff = log A - log T; sampling_est = (log A + log T) / 2 (log units); 95% 16-day block bootstrap",
        "years": [{"year": int(r.year), "aqua_lst": hhmm(r.aqua_lst), "terra_lst": hhmm(r.terra_lst),
                   **{k: num(getattr(r, k)) for k in ["A", "A_lo", "A_hi", "T", "T_lo", "T_hi", "clock_diff",
                                                     "clock_lo", "clock_hi", "sampling_est"]}}
                  for r in tc[tc.biome == b].itertuples()]})
    r = res[b]
    write(f"fireday/{rid}.json", {"mock": False, "note": note, "region": rid,
        "fields": "log_aqua_over_terra = log(Aqua/Terra) near-nadir daytime counts on the same days; gap_h = Aqua minus Terra look time (hours); beta = change in log fire count per hour of look time",
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
           "months": [{"ym": ym, "fixed": None, "lo": None, "hi": None, "source": None, "aqua": raw(ym, "Aqua"), "snpp": raw(ym, "S-NPP"),
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
            m["fixed"] = m["aqua"]; m["source"] = "aqua_observed" if m["aqua"] is not None else None
        elif ym in vm.index and np.isfinite(vm[ym]):
            m["fixed"], m["lo"], m["hi"] = (int(round(vm[ym] * x)) for x in (R[0, i], Rlo[i], Rhi[i]))
            m["source"] = "snpp_scaled_noaa20_filled" if filled.get(ym, 0) > 0 else "snpp_scaled"
        m["flags"] = ["outage"] if filled.get(ym, 0) >= 3 else []
    med = pd.DataFrame(cal["months"]).dropna(subset=["fixed"]).assign(mm=lambda x: x.ym.str[5:]).groupby("mm").fixed.median()
    for m in cal["months"]:
        mr = med.get(m["ym"][5:])
        m["median_ref"] = None if mr is None else round(float(mr), 1)
        m["anomaly_pct"] = None if m["fixed"] is None or not mr else round((m["fixed"] / mr - 1) * 100, 1)
    cal["note"] = (note + " aqua, snpp, noaa20 = raw monthly counts of all daytime detections. fixed = Aqua count before 2012 (Aqua's clock had not drifted), then S-NPP count x the 2012-2020 "
                   "Aqua/S-NPP ratio for that calendar month, in Aqua units (a VIIRS-based Aqua-equivalent estimate). lo/hi = uncertainty in the historical conversion ratio only, null for observed Aqua months; it omits outage filling and changes in relative detectability. source = aqua_observed, snpp_scaled or snpp_scaled_noaa20_filled. Full calendar months, not the audit's matched days. "
                   f"S-NPP outage days filled with NOAA-20 x {k:.3f}. outage flag = 3 or more S-NPP outage days in the month. "
                   "median_ref = median fixed count for that calendar month, 2002-2025.")
    write(f"calendar/{rid}.json", cal)

# regions.json: the mock's names and boxes, restricted to regions with real outputs
regs = json.load(open(os.path.join(os.path.dirname(os.path.abspath(dst)), "mock", "regions.json")))["regions"]
write("regions.json", {"mock": False, "note": "Regions with real audit, calendar, two-clocks and fire-day files. bbox is for map framing; "
                       "Brazil biomes use INPE's biome labels, Punjab + Haryana uses this bbox, California a simplified state outline.",
                       "regions": [g for g in regs if g["id"] in REG]})
print("done")
