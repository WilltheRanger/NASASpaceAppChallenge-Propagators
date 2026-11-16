"""Viewing opportunities by view angle for Amazon 0.25-deg cells from CMR granule footprints,
validated against FIRMS detection 'scan' sizes, and a geometry-only prediction of L.

Run fetch_footprints.py first. Writes results.md and opportunities_by_bin.csv next to this file.
"""
import os
import numpy as np, pandas as pd
from shapely.geometry import Polygon
from shapely import contains_xy

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
CACHE = os.environ.get("OPP_CACHE", "/private/tmp/opportunity_cache")
FIRMS = "/Users/himatthew/spaceapps/raw/firms_brazil"
R = 6371.0
H = {"aqua": 705.0, "terra": 705.0, "viirs": 829.0}
MAXANG = {"aqua": 55.0, "terra": 55.0, "viirs": 56.06}
BINS = [0, 12, 24, 33, 43, 50, 57]
BLAB = ["0-12", "12-24", "24-33", "33-43", "43-50", "50-55+"]
NEAR = 3  # first 3 bins = < 33 deg
YEARS = [2016, 2018, 2020, 2023, 2024, 2025]
BASE = [2016, 2018, 2020]
MONTHS = [7, 8, 9, 10]


def xyz(lat, lon):
    la, lo = np.radians(lat), np.radians(lon)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], -1)


def dist_to_angle(d, h):
    g = d / R
    return np.degrees(np.arctan2(R * np.sin(g), R + h - R * np.cos(g)))


def angle_to_dist(th, h):
    th = np.radians(th); k = (R + h) / R
    return R * (np.arcsin(np.clip(k * np.sin(th), -1, 1)) - th)


def altitude_from_halfwidth(d, maxang):
    hs = np.arange(600.0, 900.0, 0.5)
    return float(np.interp(d, angle_to_dist(maxang, hs), hs))


def modis_scan_to_angle(scan, h=705.0):
    # IFOV fixed at 1 km / 705 km; h = altitude used to generate the pixel sizes
    th = np.linspace(0, 55, 5501); t = np.radians(th); k = (R + h) / R
    s = R * (k * np.cos(t) / np.sqrt(1 - (k * np.sin(t)) ** 2) - 1) / 705.0
    return np.interp(scan, s, th)


# --- Amazon cells -----------------------------------------------------------
lk = pd.read_csv(os.path.join(REPO, "analysis/brazil-data/out/biome_lookup_0p1deg.csv"))
am = lk[lk.biome == "amazon"]
lat01 = (am.cell_lat + 0.5) / 10.0; lon01 = (am.cell_lon + 0.5) / 10.0
c25 = pd.DataFrame({"i": np.floor(lat01 / 0.25), "j": np.floor(lon01 / 0.25)}).drop_duplicates()
clat = ((c25.i + 0.5) * 0.25).to_numpy(); clon = ((c25.j + 0.5) * 0.25).to_numpy()
P = xyz(clat, clon)
amazon01 = set(zip(am.cell_lat, am.cell_lon))

# --- Opportunities ------------------------------------------------------------
rows, widths = [], []
for sat in ["aqua", "terra", "viirs"]:
    g = pd.read_csv(os.path.join(CACHE, f"{sat}.csv"))
    g = g[g.day_night_flag == "DAY"].drop_duplicates("time_start")
    g["t"] = pd.to_datetime(g.time_start)
    for _, r in g.iterrows():
        v = np.array(r.polygon.split(), float).reshape(-1, 2)  # lat lon
        if len(v) != 5:
            continue
        c = v[:4]
        dlat = [abs(c[(k + 1) % 4, 0] - c[k, 0]) for k in range(4)]
        # cross-track edges: the opposite pair that is more east-west (small dlat)
        pair = (0, 2) if dlat[0] + dlat[2] < dlat[1] + dlat[3] else (1, 3)
        X = xyz(c[:, 0], c[:, 1])
        mids = [X[k] + X[(k + 1) % 4] for k in pair]
        mids = [m / np.linalg.norm(m) for m in mids]
        n = np.cross(mids[0], mids[1]); n /= np.linalg.norm(n)
        poly = Polygon(c[:, ::-1])
        inside = contains_xy(poly, clon, clat)
        corner_d = R * np.arcsin(np.abs(X @ n))
        widths.append((sat, r.t.year, corner_d.mean()))
        if not inside.any():
            continue
        d = R * np.arcsin(np.abs(P[inside] @ n))
        # per-granule effective altitude from its own swath half-width (max scan angle at corners);
        # set OPP_NOMINAL_H=1 to use the nominal altitude instead
        h_g = H[sat] if os.environ.get("OPP_NOMINAL_H") else altitude_from_halfwidth(corner_d.mean(), MAXANG[sat])
        ang = dist_to_angle(d, h_g)
        hist, _ = np.histogram(ang, BINS)
        rows.append([sat, r.t.year, r.t.month, r.time_start, *hist])
opp = pd.DataFrame(rows, columns=["sat", "year", "month", "granule", *BLAB])
opp.to_csv(os.path.join(HERE, "opportunities_by_granule.csv"), index=False)
W = pd.DataFrame(widths, columns=["sat", "year", "halfwidth_km"])

by = opp.groupby(["sat", "year"])[BLAB].sum()
by.to_csv(os.path.join(HERE, "opportunities_by_bin.csv"))
share = by.div(by.sum(1), axis=0)
near = share.iloc[:, :NEAR].sum(1)
ncells = len(clat)
n_gran = opp.groupby(["sat", "year"]).granule.nunique()
per_cell = by.sum(1) / ncells

_W = pd.DataFrame(widths, columns=["sat", "year", "halfwidth_km"]).groupby(["sat", "year"]).halfwidth_km.median()
ALT_SENS_PRE = {k: altitude_from_halfwidth(v, MAXANG[k[0]]) for k, v in _W.items()}
# --- FIRMS detections (Aqua & Terra MODIS, daytime, Amazon, Jul-Oct) --------------
det, mon_det, sens, scanq = {}, {}, {}, {}
ALT_SENS = ALT_SENS_PRE
for y in YEARS:
    f = pd.read_csv(os.path.join(FIRMS, f"modis_{y}_Brazil.csv"),
                    usecols=["latitude", "longitude", "scan", "acq_date", "satellite", "daynight", "frp"])
    f = f[(f.daynight == "D") & pd.to_datetime(f.acq_date).dt.month.isin(MONTHS)]
    key = list(zip(np.floor(f.latitude * 10).astype(int), np.floor(f.longitude * 10).astype(int)))
    f = f[[k in amazon01 for k in key]]
    for sat, nm in [("aqua", "Aqua"), ("terra", "Terra")]:
        s = f[f.satellite == nm]
        a = modis_scan_to_angle(s.scan.to_numpy())
        det[(sat, y)] = np.histogram(a, BINS)[0]
        # sensitivity: pixel sizes generated at the footprint-implied altitude (692.7 km Aqua 2025 etc.)
        a2 = modis_scan_to_angle(s.scan.to_numpy(), h=ALT_SENS.get((sat, y), 705.0))
        sens[(sat, y)] = float((a2 < 33).mean())
        scanq[(sat, y)] = s.scan.quantile([0.1, 0.5, 0.9]).tolist() + [float((s.scan <= 1.3).mean())]
        for m in MONTHS:
            mon_det[(sat, y, m)] = int((pd.to_datetime(s.acq_date).dt.month == m).sum())
    fv = pd.read_csv(os.path.join(FIRMS, f"viirs-snpp_{y}_Brazil.csv"), usecols=["latitude", "longitude", "acq_date", "daynight"])
    fv = fv[(fv.daynight == "D") & pd.to_datetime(fv.acq_date).dt.month.isin(MONTHS)]
    kv = list(zip(np.floor(fv.latitude * 10).astype(int), np.floor(fv.longitude * 10).astype(int)))
    fv = fv[[k in amazon01 for k in kv]]
    for m in MONTHS:
        mon_det[("viirs", y, m)] = int((pd.to_datetime(fv.acq_date).dt.month == m).sum())
D = pd.DataFrame(det, index=BLAB).T
D.index.names = ["sat", "year"]
Dshare = D.div(D.sum(1), axis=0)
Dnear = Dshare.iloc[:, :NEAR].sum(1)

# --- Geometry-only prediction ---------------------------------------------------
out = []
for sat in ["aqua", "terra"]:
    Ob = by.loc[sat]; Db = D.loc[sat]
    rate = Db.loc[BASE].sum() / Ob.loc[BASE].sum()  # baseline detections per opportunity, per bin
    pred = (Ob * rate).sum(1)
    pred_shape = (share.loc[sat] * rate).sum(1)  # per-opportunity (removes outage/count effects)
    pnear = (Ob * rate).iloc[:, :NEAR].sum(1) / pred
    out.append(pd.DataFrame({"sat": sat, "g_total": pred / pred.loc[BASE].mean(),
                             "g_shape": pred_shape / pred_shape.loc[BASE].mean(),
                             "pred_near_det_share": pnear, "obs_near_det_share": Dnear.loc[sat],
                             "obs_det_change": D.loc[sat].sum(1) / D.loc[sat].loc[BASE].sum(1).mean()}))
G = pd.concat(out).reset_index().set_index(["sat", "year"])
vt = by.loc["viirs"].sum(1); gv = vt / vt.loc[BASE].mean()
Lgeo = pd.DataFrame({"g_aqua_total": G.loc["aqua"].g_total, "g_viirs_total": gv,
                     "L_geom_total": G.loc["aqua"].g_total / gv,
                     "L_geom_shape_only": G.loc["aqua"].g_shape})


# monthly opportunity factors and detection-weighted geometry L
mo = opp.groupby(["sat", "year", "month"])[BLAB].sum()
ratesA = (D.loc["aqua"].loc[BASE].sum() / by.loc["aqua"].loc[BASE].sum())
pa = (mo.loc["aqua"] * ratesA).sum(axis=1); pa = pa / pa.loc[BASE].groupby(level="month").mean()
pv = mo.loc["viirs"].sum(axis=1); pv = pv / pv.loc[BASE].groupby(level="month").mean()
MD = pd.Series(mon_det); MD.index.names = ["sat", "year", "month"]
Mon = pd.DataFrame({"aqua_day_granules": opp[opp.sat == "aqua"].groupby(["year", "month"]).size(),
                    "viirs_day_granules": opp[opp.sat == "viirs"].groupby(["year", "month"]).size(),
                    "g_aqua": pa, "g_viirs": pv, "aqua_det": MD.loc["aqua"], "viirs_det": MD.loc["viirs"]})
# L_geom (season) = sum_m A_m / sum_m A_m * g_viirs/g_aqua  (weights = observed Aqua detections that year)
Lw = Mon.groupby(level="year").apply(lambda t: t.aqua_det.sum() / (t.aqua_det * t.g_viirs / t.g_aqua).sum())
Lgeo["L_geom_det_weighted_monthly"] = Lw


def md(df, fmt="{:.3f}"):
    df = df.copy()
    cols = [str(c) for c in df.columns]
    idx = df.index.names if isinstance(df.index, pd.MultiIndex) else [df.index.name or ""]
    lines = ["| " + " | ".join([*map(str, idx), *cols]) + " |", "|" + "---|" * (len(idx) + len(cols))]
    for k, r in df.iterrows():
        k = k if isinstance(k, tuple) else (k,)
        vals = [fmt.format(x) if isinstance(x, (float, np.floating)) else str(x) for x in r]
        lines.append("| " + " | ".join([*map(str, k), *vals]) + " |")
    return "\n".join(lines)


Wy = W.groupby(["sat", "year"]).halfwidth_km.median()
alt = Wy.reset_index().apply(lambda r: altitude_from_halfwidth(r.halfwidth_km, MAXANG[r.sat]), axis=1)
Wt = pd.DataFrame({"median_halfwidth_km": Wy.values, "implied_altitude_km": alt.values}, index=Wy.index)

summary = pd.DataFrame({"day_granules_on_amazon": n_gran, "opps_per_cell": per_cell,
                        "near_nadir_opp_share(<33)": near})
txt = f"""# Viewing opportunities by view angle (Amazon, Jul-Oct daytime)

Generated by `opportunities.py`. {ncells} Amazon 0.25-deg cells. Bins in degrees of scan angle.
Near-nadir = scan angle < 33 deg.

## 1. Opportunity summary
{md(summary)}

## 2. Opportunity share by view-angle bin
{md(share)}

## 3. Swath half-width from CMR corners (geometry check)
{md(Wt, "{:.1f}")}

## 4. FIRMS daytime detections (Amazon, Jul-Oct) share by view-angle bin (from 'scan')
{md(Dshare)}

Detection counts:
{md(D.astype(float), "{:.0f}")}

## 5. Geometry-only prediction (per-bin detection rate fixed at 2016/2018/2020 pooled value)
g_total: predicted detection count relative to baseline mean from opportunities alone (includes missing granules).
g_shape: same per opportunity (angle mix only). obs_det_change: observed detection count / baseline mean.
{md(G)}

## 6. Geometry-only L for Aqua (VIIRS normalised by its total opportunities)
L_geom_det_weighted_monthly weights each month by that year's observed Aqua Amazon detections
(the season L is dominated by Aug-Sep), so granule gaps in low-fire months count less.
{md(Lgeo)}

## 8. FIRMS scan diagnostics: scan quantiles (p10/p50/p90), share scan<=1.3 km, and near-nadir share if pixel sizes were generated at the footprint-implied altitude
{md(pd.DataFrame({k: v + [sens[k]] for k, v in scanq.items()}, index=["scan_p10", "scan_p50", "scan_p90", "share_scan_le_1.3", "near_share_at_implied_alt"]).T.rename_axis(["sat", "year"]))}

## 7. Monthly granules, opportunity factors (vs 2016/18/20 mean of same month), FIRMS daytime Amazon counts
{md(Mon.astype(float), "{:.3f}")}
"""
open(os.path.join(HERE, "results.md"), "w").write(txt)
print(txt)
