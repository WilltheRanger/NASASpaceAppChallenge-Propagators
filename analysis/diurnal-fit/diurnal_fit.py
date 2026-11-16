"""FIRMS-only diurnal-cycle prediction of the Aqua (and Terra) audit ratio L.

Usage: .venv/bin/python analysis/diurnal-fit/diurnal_fit.py
Inputs : /Users/himatthew/spaceapps/raw/firms_brazil/{modis,viirs-snpp,viirs-jpss1}_YYYY_Brazil.csv
         analysis/brazil-data/out/biome_lookup_0p1deg.csv, analysis/brazil-data/out/firms_daily_by_biome.csv
Outputs: analysis/diurnal-fit/out/*.csv, analysis/diurnal-fit/results.md (cache in analysis/diurnal-fit/cache/)

Model (per biome, per calendar month m): satellite s on a set of days counts
    C_s = k_s(m) * A * <f>_s,   <f>_s = 1 / E_h[1/f(LST)]   (h = LST histogram of s's own detections;
                                                           g ∝ h/f is the look-time sampling density)
f(t) = exp(-(t - mu)^2 / (2 sigma^2)) (Gaussian in local solar time, as in Ellicott 2009 / Andela 2015).
k_s(m) (sensor sensitivity x swath) is fixed and taken from 2012-2020, so for a drift year y
    Q_s(y,m) = [C_s/C_V](y,m) / [C_s/C_V](base,m) = (<f>_s(y)/<f>_s(base)) / (<f>_V(y)/<f>_V(base))
with V = S-NPP. Q_Aqua is exactly the audit L (same days, same baseline ratio). The shape (mu, sigma) is fitted
to log Q of the drift years 2022-2025; the predicted F for Aqua is the same expression evaluated with the fit.
"""
import os, glob, sys
import numpy as np, pandas as pd
from scipy.optimize import least_squares

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW = "/Users/himatthew/spaceapps/raw/firms_brazil"
OUT = os.path.join(HERE, "out"); CACHE = os.path.join(HERE, "cache")
os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)

BIOMES = ["amazon", "cerrado"]
SATS = ["Terra", "Aqua", "S-NPP", "NOAA-20"]
SATMAP = {"Terra": "Terra", "Aqua": "Aqua", "N": "S-NPP", "N20": "NOAA-20"}
T0, T1, DT = 6.0, 18.0, 1 / 12  # 5-minute LST bins, 06:00-18:00
NBIN = int(round((T1 - T0) / DT)); TC = T0 + DT * (np.arange(NBIN) + 0.5)
DATES = pd.date_range("2012-01-01", "2025-12-31")
ND = len(DATES)
YR, MO = DATES.year.values, DATES.month.values
BASE = list(range(2012, 2021)); DRIFT = [2022, 2023, 2024, 2025]; MONTHS = [7, 8, 9, 10]
NB, SEED, BLOCK = int(os.environ.get("NB", 200)), 20261115, 16


# ---------------------------------------------------------------- stage 1: raw FIRMS -> daily LST histograms
def build():
    lk = pd.read_csv(os.path.join(REPO, "analysis/brazil-data/out/biome_lookup_0p1deg.csv"))
    la0, lo0 = lk.cell_lat.min(), lk.cell_lon.min()
    grid = np.full((lk.cell_lat.max() - la0 + 1, lk.cell_lon.max() - lo0 + 1), -1, np.int8)
    code = {b: i for i, b in enumerate(sorted(lk.biome.unique()))}
    grid[lk.cell_lat - la0, lk.cell_lon - lo0] = lk.biome.map(code).values
    H = np.zeros((len(BIOMES), len(SATS), ND, NBIN), np.float32)
    up = np.zeros((len(SATS), ND), bool)
    files = sorted(glob.glob(os.path.join(RAW, "modis_*_Brazil.csv")) + glob.glob(os.path.join(RAW, "viirs-*_Brazil.csv")))
    for fn in files:
        d = pd.read_csv(fn, usecols=["latitude", "longitude", "acq_date", "acq_time", "satellite", "daynight"],
                        dtype={"acq_time": str}, engine="pyarrow")
        d = d[d.daynight == "D"]
        di = ((pd.to_datetime(d.acq_date) - DATES[0]).dt.days).values
        ok = (di >= 0) & (di < ND); d = d[ok]; di = di[ok]
        si = d.satellite.map({k: SATS.index(v) for k, v in SATMAP.items()}).values.astype(int)
        up[si, di] = True
        t = d.acq_time.str.zfill(4)
        utc = t.str[:2].astype(int).values + t.str[2:].astype(int).values / 60
        lst = (utc + d.longitude.values / 15) % 24
        ci = np.floor(d.latitude.values * 10).astype(int) - la0; cj = np.floor(d.longitude.values * 10).astype(int) - lo0
        inside = (ci >= 0) & (ci < grid.shape[0]) & (cj >= 0) & (cj < grid.shape[1])
        bc = np.full(len(d), -1); bc[inside] = grid[ci[inside], cj[inside]]
        bi = np.floor((lst - T0) / DT).astype(int); inb = (bi >= 0) & (bi < NBIN)
        for k, b in enumerate(BIOMES):
            m = (bc == code[b]) & inb
            np.add.at(H[k], (si[m], di[m], bi[m]), 1)
            if (bc == code[b]).sum() != m.sum():
                print(f"  {os.path.basename(fn)} {b}: {(bc == code[b]).sum() - m.sum()} detections outside 06-18 LST dropped")
        print("read", os.path.basename(fn), len(d))
    np.savez_compressed(os.path.join(CACHE, "hist.npz"), H=H, up=up)


if not os.path.exists(os.path.join(CACHE, "hist.npz")):
    build()
z = np.load(os.path.join(CACHE, "hist.npz")); H, UP = z["H"], z["up"]
if "--build-only" in sys.argv:
    print(H.shape, H.sum(axis=(2, 3)), UP.sum(1)); sys.exit()
iT, iA, iV = SATS.index("Terra"), SATS.index("Aqua"), SATS.index("S-NPP")
M_AS = UP[iA] & UP[iV]; M_TS = UP[iT] & UP[iV]; M_ATS = UP[iA] & UP[iT] & UP[iV]

# bootstrap weights: stratified block bootstrap. Each (year, month) is cut into 8-day blocks (days 1-8, 9-16,
# 17-24, 25-end) and its blocks are resampled with replacement (multinomial), so no month is ever empty
# (a 16-day Poisson block bootstrap leaves single months empty in ~1 of 7 replicates). Row 0 = point estimate.
BLOCK = 8
rng = np.random.default_rng(SEED)
DOM = DATES.day.values
blk = (YR - 2012) * 48 + (MO - 1) * 4 + np.minimum((DOM - 1) // BLOCK, 3)
W = np.ones((NB + 1, ND))
for ym in np.unique((YR - 2012) * 12 + MO - 1):
    bl = np.unique(blk[(YR - 2012) * 12 + MO - 1 == ym])
    cnt = rng.multinomial(len(bl), np.ones(len(bl)) / len(bl), size=NB)  # (NB, nblocks)
    for j, bb in enumerate(bl):
        W[1:, blk == bb] = cnt[:, j:j + 1]


def gsum(hist, mask):
    # (NB+1, NBIN) weighted histogram sums over days in mask
    idx = np.where(mask)[0]
    return W[:, idx] @ hist[idx].astype(np.float64)


def logf(t, p):
    mu, sig = p[0], np.exp(p[1])
    return -(t - mu) ** 2 / (2 * sig * sig)


def fbar_log(h, p):
    # log <f> = -log E_h[1/f]; h (..., NBIN) histogram
    lf = logf(TC, p)
    w = h / np.maximum(h.sum(-1, keepdims=True), 1e-12)
    return -np.log(np.maximum((w * np.exp(-lf)).sum(-1), 1e-300))


# ---------------------------------------------------------------- stage 2: group sums
groups = {}  # (biome, sat_pair, year|'base', month) -> dict of histograms
for k, b in enumerate(BIOMES):
    for s, mask in [("Aqua", M_AS), ("Terra", M_TS)]:
        si = SATS.index(s)
        for m in MONTHS:
            for y in ["base"] + DRIFT:
                sel = mask & (MO == m) & (np.isin(YR, BASE) if y == "base" else (YR == y))
                groups[(b, s, y, m)] = (gsum(H[k, si], sel), gsum(H[k, iV], sel))
        # anchor for variant B: Terra/Aqua in the baseline on common days (identical MODIS sensitivity assumed)
    for m in MONTHS:
        sel = M_ATS & (MO == m) & np.isin(YR, BASE)
        groups[(b, "TA", "base", m)] = (gsum(H[k, iT], sel), gsum(H[k, iA], sel))


def model_logQ(b, s, y, m, p, r):
    hs_y, hv_y = groups[(b, s, y, m)]; hs_b, hv_b = groups[(b, s, "base", m)]
    return (fbar_log(hs_y[r], p) - fbar_log(hs_b[r], p)) - (fbar_log(hv_y[r], p) - fbar_log(hv_b[r], p))


def obs_logQ(b, s, y, m, r):
    hs_y, hv_y = groups[(b, s, y, m)]; hs_b, hv_b = groups[(b, s, "base", m)]
    return np.log(hs_y[r].sum() / hv_y[r].sum()) - np.log(hs_b[r].sum() / hv_b[r].sum())


LO, HI = [8.0, np.log(0.5)], [22.0, np.log(8.0)]


def fit(b, months, use, r, anchor=False, x0=None):
    # least squares on log Q of the drift years for satellites in `use`; one shape for all `months`
    data = [(s, y, m, obs_logQ(b, s, y, m, r)) for s in use for y in DRIFT for m in months]
    anc = []
    if anchor:
        for m in months:
            hT, hA = groups[(b, "TA", "base", m)]
            anc.append((m, np.log(hT[r].sum() / hA[r].sum())))

    def res(p):
        e = [model_logQ(b, s, y, m, p, r) - o for s, y, m, o in data]
        for m, o in anc:
            hT, hA = groups[(b, "TA", "base", m)]
            e.append(fbar_log(hT[r], p) - fbar_log(hA[r], p) - o)
        return np.array(e)
    best = None
    starts = [x0] if x0 is not None else [[mu0, np.log(s0)] for mu0 in (11.0, 13.0, 15.0, 17.0) for s0 in (1.5, 3.0)]
    for st in starts:
        try:
            z_ = least_squares(res, st, bounds=(LO, HI))
        except ValueError:  # non-finite residuals (empty group in a replicate)
            continue
        if best is None or z_.cost < best.cost: best = z_
    return best.x if best is not None else np.array([np.nan, np.nan])


def season(b, s, y, preds, r):
    # Jul-Oct pooled: sum of observed / sum of expected, prediction weighted by each month's expected count
    num = den = pn = 0.0
    for m in MONTHS:
        hs_y, hv_y = groups[(b, s, y, m)]; hs_b, hv_b = groups[(b, s, "base", m)]
        E = hv_y[r].sum() * hs_b[r].sum() / hv_b[r].sum()
        num += hs_y[r].sum(); den += E; pn += E * np.exp(preds[m])
    return num / den, pn / den


VARIANTS = {  # name -> (satellites used in the fit, anchor, per-month?)
    "all_month": (["Terra", "Aqua"], False, True),
    "terra_only_month": (["Terra"], False, True),
    "aqua_only_month": (["Aqua"], False, True),
    "all_pooled": (["Terra", "Aqua"], False, False),
    "terra_only_pooled": (["Terra"], False, False),
    "aqua_only_pooled": (["Aqua"], False, False),
    "terraB_anchor_pooled": (["Terra"], True, False),  # Terra drift + baseline Terra/Aqua (k_T = k_A)
    "aquaB_anchor_pooled": (["Aqua"], True, False),
    "allB_anchor_pooled": (["Terra", "Aqua"], True, False),
}

rows, prow = [], []
for b in BIOMES:
    for vname, (use, anc, per_month) in VARIANTS.items():
        print("fitting", b, vname, flush=True)
        for r in range(NB + 1):
            fits = {m: fit(b, [m], use, r, anc, None if r == 0 else best0[m]) for m in MONTHS} if per_month else \
                dict.fromkeys(MONTHS, fit(b, MONTHS, use, r, anc, None if r == 0 else best0[MONTHS[0]]))
            if r == 0: best0 = fits
            if r == 0:
                for m, p in fits.items():
                    prow.append(dict(biome=b, variant=vname, month=m, mu=p[0], sigma=np.exp(p[1])))
                    if not per_month: break
            for s in ["Aqua", "Terra"]:
                for y in DRIFT:
                    preds = {m: model_logQ(b, s, y, m, fits[m], r) for m in MONTHS}
                    # Aqua-only factor (no VIIRS term), for reporting
                    fa = {}
                    for m in MONTHS:
                        hs_y, _ = groups[(b, s, y, m)]; hs_b, _ = groups[(b, s, "base", m)]
                        fa[m] = fbar_log(hs_y[r], fits[m]) - fbar_log(hs_b[r], fits[m])
                    Lobs, Lpred = season(b, s, y, preds, r)
                    _, Fsat = season(b, s, y, fa, r)
                    rows.append(dict(biome=b, variant=vname, sat=s, year=y, rep=r, L_obs=Lobs, L_pred=Lpred, F_sat=Fsat))

R = pd.DataFrame(rows)
pd.DataFrame(prow).to_csv(os.path.join(OUT, "shape_params.csv"), index=False, float_format="%.4g")


def q(x, a): return np.nanpercentile(x, a)


summ = []
for (b, v, s, y), g in R.groupby(["biome", "variant", "sat", "year"]):
    p0 = g[g.rep == 0].iloc[0]; bt = g[g.rep > 0]
    lr = np.log(bt.L_obs) - np.log(bt.L_pred)
    summ.append(dict(biome=b, variant=v, sat=s, year=y, L_obs=p0.L_obs, L_obs_lo=q(bt.L_obs, 2.5), L_obs_hi=q(bt.L_obs, 97.5),
                     L_pred=p0.L_pred, L_pred_lo=q(bt.L_pred, 2.5), L_pred_hi=q(bt.L_pred, 97.5),
                     F_sat=p0.F_sat, F_sat_lo=q(bt.F_sat, 2.5), F_sat_hi=q(bt.F_sat, 97.5),
                     obs_over_pred=p0.L_obs / p0.L_pred, ratio_lo=np.exp(q(lr, 2.5)), ratio_hi=np.exp(q(lr, 97.5))))
S = pd.DataFrame(summ)
S.to_csv(os.path.join(OUT, "predicted_vs_observed.csv"), index=False, float_format="%.4g")

# ---------------------------------------------------------------- observed L from the team's daily file (check)
daily = pd.read_csv(os.path.join(REPO, "analysis/brazil-data/out/firms_daily_by_biome.csv"))
dd = DATES.strftime("%Y-%m-%d")
chk = []
for b in BIOMES:
    c = daily[daily.biome == b].groupby(["date", "satellite"]).count_all.sum().unstack().reindex(dd).fillna(0)
    for s, mask in [("Aqua", M_AS), ("Terra", M_TS)]:
        for y in DRIFT:
            num = den = 0.0
            for m in MONTHS:
                bs = mask & (MO == m) & np.isin(YR, BASE); ys = mask & (MO == m) & (YR == y)
                Rm = c[s].values[bs].sum() / c["S-NPP"].values[bs].sum()
                num += c[s].values[ys].sum(); den += Rm * c["S-NPP"].values[ys].sum()
            chk.append(dict(biome=b, sat=s, year=y, L_daily_file=num / den))
CHK = pd.DataFrame(chk); CHK.to_csv(os.path.join(OUT, "observed_L_daily_file_check.csv"), index=False, float_format="%.4g")

# median LST per satellite (drift context)
lst_rows = []
for k, b in enumerate(BIOMES):
    for si, s in enumerate(SATS):
        for lab, ys in [("2012-2020", BASE)] + [(str(y), [y]) for y in DRIFT]:
            h = H[k, si][np.isin(YR, ys) & np.isin(MO, MONTHS)].sum(0)
            if h.sum() == 0: continue
            cdf = np.cumsum(h) / h.sum(); med = TC[np.searchsorted(cdf, 0.5)]
            lst_rows.append(dict(biome=b, sat=s, period=lab, n=int(h.sum()), lst_median_h=med))
pd.DataFrame(lst_rows).to_csv(os.path.join(OUT, "lst_medians_jul_oct.csv"), index=False, float_format="%.4g")
print(S.to_string()); print(CHK.to_string())
