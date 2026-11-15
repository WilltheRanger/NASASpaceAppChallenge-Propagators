"""Global clock layer: the preset clock audit (analysis/statistics/audit.py) repeated on a 2-degree grid.

Exploratory. Same method as the presets; outside Brazil and the USA there is no national reference series to check against.
This is an analysis of recorded detections. Nothing here is modelled or filled in.

Usage (from the repo root):
  python3 analysis/global/global_grid.py aggregate RAW_DIR WORK_DIR      # one pass over the FIRMS yearly zips
  python3 analysis/global/global_grid.py compute   WORK_DIR [--generated ISO]   # grid.json, cells/, out/*.csv
  python3 analysis/global/global_grid.py bench     WORK_DIR [--generated ISO]   # out/benchmarks.json (G1 to G7)

Inputs : RAW_DIR/{modis,viirs-snpp,viirs-jpss1}_YYYY_all_countries.zip  (NASA FIRMS yearly country archives:
         MODIS C6.1 2002 to 2025, VIIRS S-NPP 2012 to 2025, VIIRS NOAA-20 2018 to 2025; never committed)
         analysis/statistics/audit.py          (L(), ci(), the bootstrap weights W and the month matrix YM, imported as written)
         analysis/statistics/region_counts.py  (preset rules: the California outline and the Punjab + Haryana box)
         analysis/brazil-data/out/biome_lookup_0p1deg.csv
Outputs: data/out/global/grid.json, data/out/global/cells/<id>.json
         analysis/global/out/cells_all.csv, interval_widths.csv, benchmarks.json
Counts : count_all, every daytime detection with no type or confidence filter, as in region_counts.py and audit.py.
Look time: median local solar time (UTC + lon/15) of near-nadir daytime detections that pass the repo's counting
         filters (type 0; MODIS confidence >= 30, scan <= 1.3 km; VIIRS confidence n or h, track <= 0.40 km).
"""
import sys, os, json, glob, zipfile, time, hashlib, argparse, importlib.util
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
STATS = os.path.join(ROOT, "analysis", "statistics")
BRAZIL = os.path.join(ROOT, "analysis", "brazil-data", "out")
OUT_JSON = os.path.join(ROOT, "data", "out", "global")
OUT_AUX = os.path.join(HERE, "out")

CELL = 2                      # degrees
NX, NY = 360 // CELL, 180 // CELL
SAT = {"Aqua": "Aqua", "Terra": "Terra", "N": "S-NPP", "N20": "NOAA-20", "1": "NOAA-20", "N21": "NOAA-21"}  # as region_counts.py
SATS = ["Aqua", "Terra", "S-NPP", "NOAA-20", "NOAA-21"]
PRESETS = ["", "amazon", "cerrado", "pantanal", "argentina", "punjab_haryana", "california"]  # tag 0 = in no preset
PRESET_ID = {"amazon": "br-amazon", "cerrado": "br-cerrado", "pantanal": "br-pantanal", "argentina": "ar-argentina",
             "punjab_haryana": "in-punjab-haryana", "california": "us-california"}
USE = ["latitude", "longitude", "scan", "track", "acq_date", "acq_time", "satellite", "confidence", "daynight", "type"]
SENSORS = {"modis": range(2002, 2026), "viirs-snpp": range(2012, 2026), "viirs-jpss1": range(2018, 2026)}


def load_module(name, argv):
    # audit.py and region_counts.py read sys.argv at import; their writes sit under the __main__ guard and do not run here
    old = sys.argv
    sys.argv = argv
    try:
        spec = importlib.util.spec_from_file_location(name, os.path.join(STATS, name + ".py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    finally:
        sys.argv = old
    return mod


def cell_index(lon, lat):
    # 2-degree cell; the east edge (lon = 180) and the north pole (lat = 90) fold into the last cell so nothing is dropped
    ix = np.clip(np.floor(lon / CELL).astype(np.int64) + NX // 2, 0, NX - 1)
    iy = np.clip(np.floor(lat / CELL).astype(np.int64) + NY // 2, 0, NY - 1)
    return (iy * NX + ix).astype(np.uint16)


def cell_bounds(c):
    ix, iy = int(c) % NX, int(c) // NX
    lon0, lat0 = ix * CELL - 180, iy * CELL - 90
    return lon0, lat0, lon0 + CELL, lat0 + CELL


def cell_id(c):
    lon0, lat0, _, _ = cell_bounds(c)
    return f"g{CELL}_{lon0}_{lat0}"


# ---------------------------------------------------------------- aggregate

def biome_grid():
    lk = pd.read_csv(os.path.join(BRAZIL, "biome_lookup_0p1deg.csv"), usecols=["cell_lat", "cell_lon", "biome"])
    code = lk.biome.map({p: i for i, p in enumerate(PRESETS) if p}).fillna(0).astype(np.uint8).values
    la0, lo0 = lk.cell_lat.min(), lk.cell_lon.min()
    g = np.zeros((lk.cell_lat.max() - la0 + 1, lk.cell_lon.max() - lo0 + 1), np.uint8)
    g[lk.cell_lat.values - la0, lk.cell_lon.values - lo0] = code
    return g, la0, lo0


def aggregate_zip(path, out_path, rc, bg):
    """One yearly archive -> daily counts per cell, satellite and preset tag, plus look times and control totals."""
    g, la0, lo0 = bg
    t0 = time.time()
    sensor = os.path.basename(path).split("_")[0]
    viirs = sensor.startswith("viirs")
    z = zipfile.ZipFile(path)
    members = sorted(n for n in z.namelist() if n.endswith(".csv"))
    parts, lst_parts, keys = [], [], []
    st = dict(files=len(members), rows=0, day_rows=0, unmapped_sat=0, lat_min=90.0, lat_max=-90.0, lon_min=180.0, lon_max=-180.0)
    for m in members:
        country = os.path.basename(m)[:-4].split("_", 2)[2]
        with z.open(m) as f:
            d = pd.read_csv(f, usecols=USE, dtype={"satellite": str, "confidence": str})
        st["rows"] += len(d)
        d = d[d.daynight == "D"]
        if not len(d):
            continue
        sat = d.satellite.map(SAT)
        st["unmapped_sat"] += int(sat.isna().sum())
        d = d[sat.notna().values].assign(satellite=sat.dropna().values)  # groupby in region_counts.py drops these too
        st["day_rows"] += len(d)
        lon, lat = d.longitude.values, d.latitude.values
        u, inv = np.unique(d.acq_date.to_numpy(dtype=object).astype(str), return_inverse=True)
        day = np.array([int(x.replace("-", "")) for x in u], np.int32)[inv]  # acq_date as yyyymmdd
        st["lat_min"], st["lat_max"] = min(st["lat_min"], float(lat.min())), max(st["lat_max"], float(lat.max()))
        st["lon_min"], st["lon_max"] = min(st["lon_min"], float(lon.min())), max(st["lon_max"], float(lon.max()))
        cell = cell_index(lon, lat)
        tag = np.zeros(len(d), np.uint8)
        if country == "Brazil":  # biome label of the 0.1-degree cell, as analysis/brazil-data/scripts/firms_daily_counts.py
            a = np.floor(lat * 10).astype(int) - la0
            b = np.floor(lon * 10).astype(int) - lo0
            inb = (a >= 0) & (a < g.shape[0]) & (b >= 0) & (b < g.shape[1])
            tag[inb] = g[a[inb], b[inb]]
        elif country == "Argentina":
            tag[:] = PRESETS.index("argentina")
        elif country == "India":
            w, s, e, n = rc.REGIONS["India"][1]
            tag[(lon >= w) & (lon <= e) & (lat >= s) & (lat <= n)] = PRESETS.index("punjab_haryana")
        elif country == "United_States":
            tag[rc.inside(lon, lat, rc.CA)] = PRESETS.index("california")
        sc = d.satellite.map({s: i for i, s in enumerate(SATS)}).values.astype(np.uint8)
        k = pd.DataFrame({"date": day, "cell": cell, "sat": sc, "tag": tag})
        parts.append(k.groupby(["date", "cell", "sat", "tag"], sort=False).size().rename("n").reset_index())
        keys.append(pd.DataFrame({"lat": lat, "lon": lon, "date": day, "time": d.acq_time.values.astype(np.int16), "sat": sc}))
        # look time: near-nadir detections that pass the counting filters (firms_daily_counts.py)
        if viirs:
            ok = (d.type == 0) & d.confidence.isin(["n", "h"]) & (d.track <= 0.40)
        else:
            ok = (d.type == 0) & (pd.to_numeric(d.confidence, errors="coerce") >= 30) & (d.scan <= 1.3)
        ok = ok.values & np.isin(sc, [SATS.index("Aqua"), SATS.index("S-NPP")])
        if ok.any():
            t = d.acq_time.values[ok]
            lst_parts.append(pd.DataFrame({"cell": cell[ok], "sat": sc[ok], "tag": tag[ok],
                                           "lst": ((t // 100) + (t % 100) / 60.0 + lon[ok] / 15.0) % 24}))
    daily = pd.concat(parts).groupby(["date", "cell", "sat", "tag"], sort=True).n.sum().reset_index()
    allk = pd.concat(keys)
    st["dup_rows_across_files"] = int(allk.duplicated().sum())  # same place, time and satellite listed under two countries
    tot = allk.groupby(["date", "sat"], sort=True).size().rename("n").reset_index()  # control totals, taken before gridding
    lst = pd.concat(lst_parts) if lst_parts else pd.DataFrame({"cell": [], "sat": [], "tag": [], "lst": []})
    years = sorted(set((daily.date.values // 10000).tolist()))
    st.update(years=",".join(str(y) for y in years), seconds=round(time.time() - t0, 1), zip_bytes=os.path.getsize(path),
              zip_sha256=hashlib.sha256(open(path, "rb").read()).hexdigest())
    np.savez_compressed(out_path, date=daily.date.values.astype(np.int32), cell=daily.cell.values.astype(np.uint16),
                        sat=daily.sat.values.astype(np.uint8), tag=daily.tag.values.astype(np.uint8),
                        n=daily.n.values.astype(np.uint32),
                        tot_date=tot.date.values.astype(np.int32), tot_sat=tot.sat.values.astype(np.uint8), tot_n=tot.n.values.astype(np.uint32),
                        lst_cell=lst.cell.values.astype(np.uint16), lst_sat=lst.sat.values.astype(np.uint8),
                        lst_tag=lst.tag.values.astype(np.uint8), lst=lst.lst.values.astype(np.float64),
                        stats=np.array(json.dumps(st)))
    return st


def cmd_aggregate(raw, work, only=None):
    os.makedirs(os.path.join(work, "agg"), exist_ok=True)
    rc = load_module("region_counts", ["region_counts.py", raw, work])
    bg = biome_grid()
    for sensor, years in SENSORS.items():
        if only and sensor not in only:
            continue
        for y in years:
            src = os.path.join(raw, f"{sensor}_{y}_all_countries.zip")
            dst = os.path.join(work, "agg", f"{sensor}_{y}.npz")
            if os.path.exists(dst):
                continue
            if not os.path.exists(src):
                print("MISSING", src, flush=True)
                continue
            st = aggregate_zip(src, dst + ".tmp.npz", rc, bg)
            os.replace(dst + ".tmp.npz", dst)
            print(sensor, y, json.dumps({k: v for k, v in st.items() if k != "zip_sha256"}), flush=True)


# ---------------------------------------------------------------- load

MIN_LST_N, MIN_LST_YEARS = 20, 5   # a yearly look time needs 20 near-nadir detections; the base needs 5 such years
LABEL = "Exploratory: same method as the presets, not checked against a national reference series."
SOURCES = [
    "NASA FIRMS yearly country archives (MODIS C6.1; VIIRS 375 m S-NPP and NOAA-20), https://firms.modaps.eosdis.nasa.gov/download/ "
    "(files under https://firms.modaps.eosdis.nasa.gov/data/country/zips/). NASA data, open use; cite as NASA FIRMS.",
    "analysis/statistics/audit.py (this repo): L, the bootstrap and the calendar rule, used as written.",
]


MASK = {}  # optional overrides of the audit's two thresholds (--min-expected, --max-rel-half-width); empty = the audit's own


def load_state(work):
    """Read the yearly aggregates into daily matrices on the audit's 2012 to 2025 calendar, plus the pieces the checks need."""
    au = load_module("audit", ["audit.py", BRAZIL, os.path.join(ROOT, "data", "out"), os.path.join(STATS, "out")])
    au.MIN_EXPECTED = MASK.get("min_expected", au.MIN_EXPECTED)
    au.MAX_REL_CI = MASK.get("max_rel_half_width", au.MAX_REL_CI)
    files = sorted(glob.glob(os.path.join(work, "agg", "*.npz")))
    want = [f"{s}_{y}.npz" for s, ys in SENSORS.items() for y in ys]
    missing = sorted(set(want) - {os.path.basename(f) for f in files})
    if missing:
        raise SystemExit(f"missing aggregates: {missing}")
    nd = len(au.dates)
    day_of = {int(d.replace("-", "")): i for i, d in enumerate(au.dates)}
    months = pd.period_range("2002-01", "2025-12", freq="M").astype(str)
    mon_of = {m: i for i, m in enumerate(months)}
    S = dict(au=au, months=list(months), stats={}, nd=nd)
    NC = NX * NY
    sat_i = {s: i for i, s in enumerate(SATS)}
    use = ["Aqua", "S-NPP", "NOAA-20"]
    daily = {s: np.zeros((nd, NC), np.float32) for s in use}            # count_all per day and cell
    tagd = {s: np.zeros((nd, len(PRESETS)), np.float64) for s in use}   # the same per preset tag
    monthly = {s: np.zeros((len(months), NC), np.float64) for s in use}  # whole calendar months, 2002 to 2025
    tagm = {s: np.zeros((len(months), len(PRESETS)), np.float64) for s in use}
    overlap = np.zeros((NC, len(PRESETS)), np.float64)                  # Aqua + S-NPP daytime detections 2012 to 2025 by tag
    ctl = {s: np.zeros(nd, np.float64) for s in SATS}                   # control totals taken before gridding
    grd = {s: np.zeros(nd, np.float64) for s in SATS}                   # the same totals from the gridded counts
    lst_med = {s: np.full((au.ny, NC), np.nan) for s in ("Aqua", "S-NPP")}
    lst_n = {s: np.zeros((au.ny, NC), np.int64) for s in ("Aqua", "S-NPP")}
    lst_tag = {}
    for f in files:
        z = np.load(f)
        name = os.path.basename(f)[:-4]
        S["stats"][name] = json.loads(str(z["stats"]))
        year = int(name.rsplit("_", 1)[1])
        date, cell, sat, tag, n = z["date"], z["cell"].astype(np.int64), z["sat"], z["tag"], z["n"].astype(np.float64)
        assert (date // 10000 == year).all(), name
        ud, inv = np.unique(date, return_inverse=True)
        mi = np.array([mon_of[f"{d // 10000}-{d // 100 % 100:02d}"] for d in ud])[inv]
        di = np.array([day_of.get(int(d), -1) for d in ud])[inv]
        for s in SATS:
            k = sat == sat_i[s]
            if not k.any():
                continue
            in_days = k & (di >= 0)
            np.add.at(grd[s], di[in_days], n[in_days])
            td, ts, tn = z["tot_date"], z["tot_sat"], z["tot_n"].astype(np.float64)
            kk = (ts == sat_i[s])
            tdi = np.array([day_of.get(int(d), -1) for d in td[kk]])
            np.add.at(ctl[s], tdi[tdi >= 0], tn[kk][tdi >= 0])
            if s not in use:
                continue
            np.add.at(monthly[s], (mi[k], cell[k]), n[k])
            np.add.at(tagm[s], (mi[k], tag[k]), n[k])
            if in_days.any():
                np.add.at(daily[s], (di[in_days], cell[in_days]), n[in_days].astype(np.float32))
                np.add.at(tagd[s], (di[in_days], tag[in_days]), n[in_days])
                if s in ("Aqua", "S-NPP"):
                    np.add.at(overlap, (cell[in_days], tag[in_days]), n[in_days])
        if year >= 2012 and len(z["lst"]):
            l = pd.DataFrame({"cell": z["lst_cell"], "sat": z["lst_sat"], "tag": z["lst_tag"], "lst": z["lst"]})
            for s in ("Aqua", "S-NPP"):
                ls = l[l.sat == sat_i[s]]
                if not len(ls):
                    continue
                q = ls.groupby("cell").lst.agg(["median", "size"])
                lst_med[s][year - 2012, q.index.values] = q["median"].values
                lst_n[s][year - 2012, q.index.values] = q["size"].values
                qt = ls[ls.tag > 0].groupby("tag").lst.agg(["median", "size"])
                for t, r in qt.iterrows():
                    lst_tag[(s, PRESETS[int(t)], year)] = (float(r["median"]), int(r["size"]))
    # a satellite is down on a day with no daytime detection anywhere on Earth (the audit says: anywhere in Brazil)
    up = {s: ctl[s] > 0 for s in SATS}
    active = np.where((daily["Aqua"].sum(0) + daily["S-NPP"].sum(0)) > 0)[0]
    S.update(daily=daily, tagd=tagd, monthly=monthly, tagm=tagm, overlap=overlap, ctl=ctl, grd=grd, up=up, active=active,
             lst_med=lst_med, lst_n=lst_n, lst_tag=lst_tag, M_AS=up["Aqua"] & up["S-NPP"], files=files)
    return S


# ---------------------------------------------------------------- statistics (audit.py's, applied per cell)

def ymsum_many(au, X, mask):
    """audit.ymsum for many daily series at once: X (days, k) -> (NB + 1, k, years, 12).

    audit.ymsum is W @ (YM * (x * mask)[:, None]). W holds whole-number Poisson weights and x whole-number counts, so every
    partial sum is an exact integer in float64 and the grouping of the additions cannot change the result (checked in G1).
    """
    Xm = X.astype(np.float64) * mask[:, None]
    W = au.W.astype(np.float64)
    col = (au.yr - 2012) * 12 + au.mo
    out = np.zeros((W.shape[0], X.shape[1], au.ny * 12))
    for j in range(au.ny * 12):
        idx = np.where(col == j)[0]
        out[:, :, j] = W[:, idx] @ Xm[idx]
    return out.reshape(W.shape[0], X.shape[1], au.ny, 12)


def audit_stats(au, A, V):
    """One Aqua / S-NPP pair of bootstrap month sums -> the audit's yearly numbers, by audit.py's own L() and ci()."""
    yrs = {}
    for y in au.YEARS:
        base = [b for b in au.BASE if b != y]  # baseline years are scored leave-one-out (placebo), as in audit.py
        la, ea, _ = au.L(A, V, base, y)
        lo, hi = au.ci(la)
        yrs[y] = dict(L=float(la[0]), lo=float(lo), hi=float(hi), aqua=float(A[0, y - 2012].sum()),
                      snpp=float(V[0, y - 2012].sum()), expected=float(ea[0]), n_boot=int(np.isfinite(la[1:]).sum()))
    pl = np.array([yrs[y]["L"] for y in au.BASE])
    fin = np.isfinite(pl)
    out = dict(years=yrs, n_placebo=int(fin.sum()))
    if fin.any():
        out.update(noise_floor=float(np.max(np.abs(pl[fin] - 1))), placebo_min=float(pl[fin].min()), placebo_max=float(pl[fin].max()))
    else:
        out.update(noise_floor=np.nan, placebo_min=np.nan, placebo_max=np.nan)
    for y in au.AUDIT:
        r = yrs[y]
        finite = all(np.isfinite(r[k]) for k in ("L", "lo", "hi", "expected"))
        # audit.py's rule: expected Aqua count under MIN_EXPECTED, or 95% half-width over MAX_REL_CI of L
        thin = (not finite) or r["expected"] < au.MIN_EXPECTED or (r["hi"] - r["lo"]) / 2 / r["L"] > au.MAX_REL_CI
        r["status"] = "insufficient_data" if thin else "ok"
        r["rel_half_width"] = (r["hi"] - r["lo"]) / 2 / r["L"] if finite and r["L"] > 0 else np.nan
        r["outside"] = bool(r["L"] < out["placebo_min"] or r["L"] > out["placebo_max"]) if finite and fin.any() else None
    return out


def look_shift(med, n, y):
    """Minutes between a year's median look time and the median of the 2012 to 2020 yearly medians."""
    base = [med[b - 2012] for b in range(2012, 2021) if n[b - 2012] >= MIN_LST_N]
    if len(base) < MIN_LST_YEARS or n[y - 2012] < MIN_LST_N:
        return None, None
    b = float(np.median(base))
    return b, (float(med[y - 2012]) - b) * 60.0


def calendar(au, rid, note, aqua_m, snpp_m, noaa_m, cS, cN, up, R):
    """The fixed-clock monthly calendar, by the rule in audit.py (its calendar block), for one area.

    aqua_m, snpp_m, noaa_m: whole-month raw counts 2002-01 to 2025-12; cS, cN: daily S-NPP and NOAA-20 counts 2012 to 2025;
    up: the satellite-up flags; R: (NB + 1, 12) baseline month ratios from audit.L.
    """
    START = {"Aqua": "2002-07", "S-NPP": "2012-01", "NOAA-20": "2018-01"}  # first month with data, as audit.py
    months = pd.period_range("2002-01", "2025-12", freq="M").astype(str)
    raw = lambda ym, s, v: None if ym < START[s] else int(v)
    cal = {"mock": False, "ai_assisted": True, "region": rid, "unit": "fixed-clock Aqua-equivalent hotspots",
           "months": [{"ym": ym, "fixed": None, "lo": None, "hi": None, "source": None, "aqua": raw(ym, "Aqua", aqua_m[i]),
                       "snpp": raw(ym, "S-NPP", snpp_m[i]), "noaa20": raw(ym, "NOAA-20", noaa_m[i]), "flags": [],
                       "median_ref": None, "anomaly_pct": None} for i, ym in enumerate(months)]}
    dates, yr = au.dates, au.yr
    both = up["S-NPP"] & up["NOAA-20"] & (yr >= 2018)
    den = cN[both].sum()
    k = cS[both].sum() / den if den > 0 else np.nan
    vf = np.where(up["S-NPP"], cS, np.where(up["NOAA-20"], k * cN, np.nan))
    ymk = dates.str[:7]
    vm = pd.Series(vf, index=dates).groupby(ymk).sum(min_count=1)
    gaps = pd.Series(np.isnan(vf), index=dates).groupby(ymk).sum()  # 2012-01: S-NPP not yet flying
    vm[gaps[gaps > 0].index] = np.nan
    filled = pd.Series(~up["S-NPP"] & up["NOAA-20"], index=dates).groupby(ymk).sum()
    Rlo, Rhi = np.nanpercentile(R[1:], 2.5, axis=0), np.nanpercentile(R[1:], 97.5, axis=0)
    for m in cal["months"]:
        ym = m["ym"]; i = int(ym[5:]) - 1
        if ym < "2012-01" or (ym < "2021-01" and not np.isfinite(vm.get(ym, np.nan))):
            m["fixed"] = m["aqua"]; m["source"] = "aqua_observed" if m["aqua"] is not None else None
        elif ym in vm.index and np.isfinite(vm[ym]) and np.isfinite(R[0, i]):
            m["fixed"] = int(round(vm[ym] * R[0, i]))
            m["lo"], m["hi"] = (int(round(vm[ym] * x)) if np.isfinite(x) else None for x in (Rlo[i], Rhi[i]))
            m["source"] = "snpp_scaled_noaa20_filled" if filled.get(ym, 0) > 0 else "snpp_scaled"
        m["flags"] = ["outage"] if filled.get(ym, 0) >= 3 else []
    med = pd.DataFrame(cal["months"]).dropna(subset=["fixed"]).assign(mm=lambda x: x.ym.str[5:]).groupby("mm").fixed.median()
    for m in cal["months"]:
        mr = med.get(m["ym"][5:])
        m["median_ref"] = None if mr is None else round(float(mr), 1)
        m["anomaly_pct"] = None if m["fixed"] is None or not mr else round((m["fixed"] / mr - 1) * 100, 1)
    cal["note"] = (note + " aqua, snpp, noaa20 = raw monthly counts of all daytime detections. fixed = Aqua count before 2012 (Aqua's clock had not drifted), then S-NPP count x the 2012-2020 "
                   "Aqua/S-NPP ratio for that calendar month, in Aqua units (a VIIRS-based Aqua-equivalent estimate). lo/hi = uncertainty in the historical conversion ratio only, null for observed Aqua months; it omits outage filling and changes in relative detectability. source = aqua_observed, snpp_scaled or snpp_scaled_noaa20_filled. Full calendar months, not the audit's matched days. "
                   + (f"S-NPP outage days filled with NOAA-20 x {k:.3f}. " if np.isfinite(k) else "No NOAA-20 detections here, so S-NPP outage days are not filled. ")
                   + "outage flag = 3 or more S-NPP outage days in the month. median_ref = median fixed count for that calendar month, 2002-2025.")
    return cal


BAND = 30  # degrees of longitude, for the retained-days sensitivity run


def band_mask(S, band):
    """Retained days for one 30-degree longitude band: both satellites returned a daytime detection somewhere in the band.

    The preset audit's rule is 'anywhere in Brazil', which is about one such band. Used only for the sensitivity run."""
    cols = np.where((np.arange(NX * NY) % NX) // (BAND // CELL) == band)[0]
    return (S["daily"]["Aqua"][:, cols].sum(1) > 0) & (S["daily"]["S-NPP"][:, cols].sum(1) > 0)


def compute_cells(S, chunk=200, rule="earth"):
    """L, interval, placebo range and look-time shift for every cell with a detection."""
    au = S["au"]
    res = {}
    Rs = {}
    groups = [(S["M_AS"], S["active"])] if rule == "earth" else [
        (band_mask(S, b), S["active"][(S["active"] % NX) // (BAND // CELL) == b]) for b in range(360 // BAND)]
    for mask, act in groups:
      for i in range(0, len(act), chunk):
        cc = act[i:i + chunk]
        A = ymsum_many(au, S["daily"]["Aqua"][:, cc], mask)
        V = ymsum_many(au, S["daily"]["S-NPP"][:, cc], mask)
        for j, c in enumerate(cc):
            r = audit_stats(au, A[:, j], V[:, j])
            for s, key in (("Aqua", "aqua"), ("S-NPP", "snpp")):
                for y in (2024, 2025):
                    b, sh = look_shift(S["lst_med"][s][:, c], S["lst_n"][s][:, c], y)
                    r[f"{key}_lst_base"], r[f"{key}_lst_shift_{y}"] = b, sh
                    r[f"{key}_lst_n_{y}"] = int(S["lst_n"][s][y - 2012, c])
            res[int(c)] = r
            if any(r["years"][y]["status"] == "ok" for y in (2024, 2025)):
                Rs[int(c)] = au.L(A[:, j], V[:, j], au.BASE, 2021)[2]  # baseline month ratios, as audit.py passes to its calendar
    return res, Rs


def num(x, nd=3):
    return None if x is None or not np.isfinite(x) else round(float(x), nd)


def mask_rule(au):
    return {"status": "pending team lead approval",
            "rule": f"A cell-year is too_few_fires when the fixed-clock (expected) Aqua count is under {au.MIN_EXPECTED}, or the 95% "
                    f"interval half-width is over {int(round(au.MAX_REL_CI * 100))}% of L, or L or its interval is not a finite number. "
                    + ("The first two are the preset audit's own insufficient_data rule (analysis/statistics/audit.py)." if not MASK else
                       "The thresholds were set on the command line and differ from the preset audit's (300 and 25%)."),
            "min_expected": au.MIN_EXPECTED, "max_rel_half_width": au.MAX_REL_CI,
            "applies_to": "status is the 2025 reading, status_2024 the 2024 reading. A masked reading carries no L, interval or outside_noise value.",
            "meaning": "too_few_fires means the count is too small to read. It does not mean the count agreed with the fixed clock."}


def build_outputs(S, res, Rs, generated, res_band=None):
    """-> (grid dict, {cell id: calendar dict}, per-cell table)"""
    au = S["au"]
    cells, cals, rows = [], {}, []
    for c in S["active"]:
        c = int(c); r = res[c]; lon0, lat0, lon1, lat1 = cell_bounds(c)
        y24, y25 = r["years"][2024], r["years"][2025]
        ok24, ok25 = y24["status"] == "ok", y25["status"] == "ok"
        o = {"id": cell_id(c), "lon0": lon0, "lat0": lat0, "lon1": lon1, "lat1": lat1,
             "status": "ok" if ok25 else "too_few_fires", "status_2024": "ok" if ok24 else "too_few_fires",
             "n_aqua_2025": int(y25["aqua"]), "n_snpp_2025": int(y25["snpp"]),
             "lst_shift_min_2025": num(r["aqua_lst_shift_2025"], 0) if ok25 else None,
             "lst_shift_min_2024": num(r["aqua_lst_shift_2024"], 0) if ok24 else None}
        for y, ok, yy in ((2024, ok24, y24), (2025, ok25, y25)):
            o[f"L_{y}"], o[f"L_{y}_lo"], o[f"L_{y}_hi"] = (num(yy[k]) if ok else None for k in ("L", "lo", "hi"))
        o["noise_floor"] = num(r["noise_floor"]) if (ok24 or ok25) else None
        o["placebo_min"] = num(r["placebo_min"]) if (ok24 or ok25) else None
        o["placebo_max"] = num(r["placebo_max"]) if (ok24 or ok25) else None
        o["outside_noise_2025"] = y25["outside"] if ok25 else None
        o["outside_noise_2024"] = y24["outside"] if ok24 else None
        for k in ("lst_shift_min_2025", "lst_shift_min_2024"):
            if o[k] is not None:
                o[k] = int(o[k])
        cells.append(o)
        row = dict(id=o["id"], lon0=lon0, lat0=lat0, noise_floor=r["noise_floor"], placebo_min=r["placebo_min"],
                   placebo_max=r["placebo_max"], n_placebo=r["n_placebo"], aqua_lst_base=r["aqua_lst_base"])
        for y, yy in ((2024, y24), (2025, y25)):
            row.update({f"status_{y}": "ok" if yy["status"] == "ok" else "too_few_fires", f"aqua_{y}": int(yy["aqua"]),
                        f"snpp_{y}": int(yy["snpp"]), f"expected_{y}": yy["expected"], f"L_{y}": yy["L"], f"L_{y}_lo": yy["lo"],
                        f"L_{y}_hi": yy["hi"], f"rel_half_width_{y}": yy["rel_half_width"], f"n_boot_{y}": yy["n_boot"],
                        f"outside_noise_{y}": yy["outside"], f"aqua_lst_shift_min_{y}": r[f"aqua_lst_shift_{y}"],
                        f"aqua_lst_n_{y}": r[f"aqua_lst_n_{y}"], f"snpp_lst_shift_min_{y}": r[f"snpp_lst_shift_{y}"]})
        if res_band is not None:  # sensitivity: retained days judged per 30-degree longitude band, not for the whole Earth
            for y in (2024, 2025):
                b = res_band[c]["years"][y]
                row.update({f"status_{y}_band30": "ok" if b["status"] == "ok" else "too_few_fires", f"L_{y}_band30": b["L"],
                            f"outside_noise_{y}_band30": b["outside"]})
        for t in range(1, len(PRESETS)):
            tot = S["overlap"][c].sum()
            row[f"share_{PRESETS[t]}"] = S["overlap"][c, t] / tot if tot else 0.0
        rows.append(row)
        if c in Rs:
            note = (f"Real. NASA FIRMS MODIS C6.1 and VIIRS daily counts (yearly country archives), 2-degree cell {lon0} to {lon1} E, "
                    f"{lat0} to {lat1} N. {LABEL}")
            cals[o["id"]] = calendar(au, o["id"], note, S["monthly"]["Aqua"][:, c], S["monthly"]["S-NPP"][:, c],
                                     S["monthly"]["NOAA-20"][:, c], S["daily"]["S-NPP"][:, c].astype(np.float64),
                                     S["daily"]["NOAA-20"][:, c].astype(np.float64), S["up"], Rs[c])
    n_ok = sum(o["status"] == "ok" for o in cells)
    grid = {"mock": False, "ai_assisted": True, "generated": generated, "script": "analysis/global/global_grid.py",
            "label": LABEL,
            "method": "Per 2-degree cell: L = Aqua daytime hotspot detections / (S-NPP detections x 2012-2020 Aqua/S-NPP ratio by calendar "
                      "month), on days both satellites returned data anywhere on Earth; 95% 16-day block bootstrap (1000, seed 20261114); "
                      "2012-2020 years scored leave-one-out for the placebo range. L, its interval and the bootstrap weights are "
                      "analysis/statistics/audit.py's, imported as written. Counts are every daytime detection (count_all). L above 1: Aqua "
                      "counts more than the fixed clock predicts; below 1: fewer. Neither direction is attributed to orbit drift alone. "
                      "lst_shift_min = Aqua's median local solar time (near-nadir detections passing the counting filters) minus the "
                      "median of its 2012-2020 yearly medians, in minutes. n_aqua_2025 and n_snpp_2025 are counts on the retained days. "
                      "noise_floor = largest |L - 1| over the nine placebo years; placebo_min and placebo_max = their lowest and highest L; "
                      "outside_noise = L outside placebo_min to placebo_max "
                      "(descriptive, not a significance test).",
            "sources": SOURCES, "cell_deg": CELL, "base_years": "2012-2020", "mask_rule": mask_rule(au),
            "retained_days_rule": "A satellite counts as down on a day with no daytime detection anywhere on Earth. The preset audit "
                                  "uses anywhere in Brazil; the difference is measured in analysis/global/out/benchmarks.json (G1).",
            "counts": {"cells_listed": len(cells), "cells_ok_2025": n_ok, "cells_ok_2024": sum(o["status_2024"] == "ok" for o in cells),
                       "cell_calendars": len(cals)},
            "cells": cells}
    return grid, cals, pd.DataFrame(rows)


def write_outputs(grid, cals, table, json_dir, aux_dir):
    os.makedirs(os.path.join(json_dir, "cells"), exist_ok=True)
    os.makedirs(aux_dir, exist_ok=True)
    for old in glob.glob(os.path.join(json_dir, "cells", "*.json")):
        os.remove(old)
    with open(os.path.join(json_dir, "grid.json"), "w") as f:
        json.dump(grid, f, separators=(",", ":"))
    for cid, cal in cals.items():
        with open(os.path.join(json_dir, "cells", cid + ".json"), "w") as f:
            json.dump(cal, f, separators=(",", ":"))
    table.to_csv(os.path.join(aux_dir, "cells_all.csv"), index=False, float_format="%.5g")
    widths(table).to_csv(os.path.join(aux_dir, "interval_widths.csv"), index=False, float_format="%.4g")
    h = {}
    for p in sorted(glob.glob(os.path.join(json_dir, "grid.json")) + glob.glob(os.path.join(json_dir, "cells", "*.json")) +
                    [os.path.join(aux_dir, "cells_all.csv"), os.path.join(aux_dir, "interval_widths.csv")]):
        h[os.path.relpath(p, json_dir if p.startswith(json_dir) else aux_dir)] = hashlib.sha256(open(p, "rb").read()).hexdigest()
    return h


def widths(t):
    """How wide the 95% interval is (half-width / L) against the expected Aqua count, per year: the table behind the mask."""
    rows = []
    bins = [0, 30, 100, 300, 1000, 3000, 10000, 1e12]
    names = ["under 30", "30 to 99", "100 to 299", "300 to 999", "1,000 to 2,999", "3,000 to 9,999", "10,000 and over"]
    for y in (2024, 2025):
        e, w = t[f"expected_{y}"].values, t[f"rel_half_width_{y}"].values
        for i, nm in enumerate(names):
            k = (e >= bins[i]) & (e < bins[i + 1])
            ww = w[k & np.isfinite(w)]
            q = (lambda p: float(np.percentile(ww, p)) if len(ww) else np.nan)
            row = dict(year=y, expected_aqua_count=nm, cells=int(k.sum()), cells_with_interval=len(ww), p10=q(10), p25=q(25),
                       median=q(50), p75=q(75), p90=q(90))
            for th in (0.10, 0.15, 0.20, 0.25, 0.30, 0.40):
                row[f"share_half_width_le_{int(th * 100)}pct"] = float((ww <= th).mean()) if len(ww) else np.nan
            rows.append(row)
        for th in (0.10, 0.15, 0.20, 0.25, 0.30, 0.40):
            for me in (100, 300, 1000):
                k = np.isfinite(w) & (w <= th) & (e >= me)
                rows.append(dict(year=y, expected_aqua_count=f"rule: expected >= {me} and half-width <= {int(th * 100)}%", cells=int(k.sum())))
    return pd.DataFrame(rows)


def cmd_compute(work, generated):
    t0 = time.time()
    S = load_state(work)
    print(f"loaded {len(S['files'])} aggregates, {len(S['active'])} cells with a detection, {time.time() - t0:.0f} s", flush=True)
    res, Rs = compute_cells(S)
    res_band, _ = compute_cells(S, rule="band")
    grid, cals, table = build_outputs(S, res, Rs, generated, res_band)
    write_outputs(grid, cals, table, OUT_JSON, OUT_AUX)
    print(json.dumps(grid["counts"]), f"{time.time() - t0:.0f} s", flush=True)
    return S, res, Rs, grid, cals, table, res_band



# ---------------------------------------------------------------- benchmarks

def bench_row(bid, name, check, threshold, result, status, **more):
    return dict(id=bid, name=name, check=check, threshold=threshold, result=result, status=status, **more)


def repo_hhmm(rid, h):
    # the drift files were written by two scripts with two rounding rules; both are reproduced here
    if rid.startswith("br-"):  # analysis/brazil-data/scripts/firms_daily_counts.py
        hh = int(h); m = int(round((h - hh) * 60))
        if m == 60: hh, m = hh + 1, 0
        return f"{hh:02d}:{m:02d}"
    m = int(round(h * 60)); return f"{m // 60:02d}:{m % 60:02d}"  # audit.py hhmm()


def to_min(s):
    return int(s[:2]) * 60 + int(s[3:])


def sens(t):
    """How far the cell readings move when retained days are judged per 30-degree longitude band and not for the whole Earth."""
    out = dict(what="The layer keeps a day when both satellites returned a daytime detection anywhere on Earth. A partial outage that removes some "
                    "orbits still passes that rule. Here the rule is applied per 30-degree longitude band (close to the preset audit's 'anywhere in "
                    "Brazil'), and the two sets of cell readings are compared. cells_all.csv carries both.")
    for y in (2024, 2025):
        e, b = t[f"status_{y}"] == "ok", t[f"status_{y}_band30"] == "ok"
        both = e & b
        d = (t[f"L_{y}_band30"] - t[f"L_{y}"])[both]
        flips = (t[f"outside_noise_{y}"][both].astype(bool) != t[f"outside_noise_{y}_band30"][both].astype(bool))
        out[str(y)] = dict(ok_earth_rule=int(e.sum()), ok_band_rule=int(b.sum()), ok_both=int(both.sum()),
                           L_difference_median=num(d.median(), 4), L_difference_p5=num(d.quantile(.05), 4), L_difference_p95=num(d.quantile(.95), 4),
                           cells_moving_over_0p02=int((d.abs() > .02).sum()), cells_moving_over_0p05=int((d.abs() > .05).sum()),
                           cells_moving_over_0p10=int((d.abs() > .10).sum()), verdict_flips=int(flips.sum()),
                           share_outside_earth_rule=num(t[f"outside_noise_{y}"][e].astype(bool).mean()),
                           share_outside_band_rule=num(t[f"outside_noise_{y}_band30"][b].astype(bool).mean()))
    return out


AREAS = [  # plain latitude and longitude boxes for a rough read of the map; they are not countries or biomes
    ("South America", -82, -34, -56, 13), ("Central America and Mexico", -118, -82, 7, 33), ("North America north of 33N", -170, -52, 33, 72),
    ("Africa north of the equator", -18, 52, 0, 38), ("Africa south of the equator", 8, 52, -36, 0),
    ("Europe and western Russia", -12, 60, 38, 72), ("Siberia and central Asia", 60, 180, 40, 76),
    ("South Asia", 60, 92, 5, 40), ("Southeast Asia and south China", 92, 130, -11, 40), ("Australia", 110, 156, -45, -11)]


def by_area(t):
    out = []
    for name, w, e, s, n in AREAS:
        k = (t.lon0 >= w) & (t.lon0 < e) & (t.lat0 >= s) & (t.lat0 < n)
        row = dict(area=name, box=[w, s, e, n])
        for y in (2024, 2025):
            q = t[k & (t[f"status_{y}"] == "ok")]
            L, o = q[f"L_{y}"].values, q[f"outside_noise_{y}"].astype(bool).values
            row[str(y)] = dict(cells_ok=int(len(q)), cells_masked=int((k & (t[f"status_{y}"] != "ok")).sum()),
                               L_median=num(np.median(L)) if len(q) else None,
                               pooled_L=num(q[f"aqua_{y}"].sum() / q[f"expected_{y}"].sum()) if len(q) else None,
                               outside_above=int((o & (L > 1)).sum()), outside_below=int((o & (L < 1)).sum()), within=int((~o).sum()))
        out.append(row)
    return out


def cmd_bench(work, generated, work2=None, audit_file=None):
    S, res, Rs, grid, cals, table, res_band = cmd_compute(work, generated)
    au = S["au"]
    rows, ctx = [], {}
    out_root = os.path.join(ROOT, "data", "out")
    pub = {p: json.load(open(os.path.join(out_root, "audit", PRESET_ID[p] + ".json"))) for p in PRESETS[1:]}
    drift = {p: json.load(open(os.path.join(out_root, "drift", PRESET_ID[p] + ".json"))) for p in PRESETS[1:]}
    tot = S["overlap"].sum(1)
    share = np.divide(S["overlap"], tot[:, None], out=np.zeros_like(S["overlap"]), where=tot[:, None] > 0)

    # ---- G1: the presets, three ways
    g1, exact_fail, cell_fail = [], [], []
    ident = True
    for t, p in enumerate(PRESETS):
        if not p:
            continue
        sel = np.where(share[:, t] > 0.5)[0]
        series = {
            "preset_rule_brazil_days": (S["tagd"]["Aqua"][:, [t]], S["tagd"]["S-NPP"][:, [t]], au.M_AS),
            "preset_rule_global_days": (S["tagd"]["Aqua"][:, [t]], S["tagd"]["S-NPP"][:, [t]], S["M_AS"]),
            "cells_global_days": (S["daily"]["Aqua"][:, sel].sum(1, keepdims=True), S["daily"]["S-NPP"][:, sel].sum(1, keepdims=True), S["M_AS"]),
        }
        purity = float(S["overlap"][sel, t].sum() / S["overlap"][sel].sum()) if len(sel) else None
        coverage = float(S["overlap"][sel, t].sum() / S["overlap"][:, t].sum()) if len(sel) else None
        for kind, (xa, xv, mask) in series.items():
            A, V = ymsum_many(au, xa, mask)[:, 0], ymsum_many(au, xv, mask)[:, 0]
            if kind == "preset_rule_brazil_days":  # the batched sums against audit.ymsum itself, on the same series
                ident &= bool(np.array_equal(A, au.ymsum(xa[:, 0], mask)) and np.array_equal(V, au.ymsum(xv[:, 0], mask)))
            r = audit_stats(au, A, V)
            for py in pub[p]["years"]:
                y = py["year"]; q = r["years"][y]
                rec = dict(preset=PRESET_ID[p], kind=kind, year=y, status=q["status"], L=num(q["L"]), L_lo=num(q["lo"]), L_hi=num(q["hi"]),
                           aqua_count=int(q["aqua"]), fixed_count=int(round(q["expected"])), outside_noise=q["outside"],
                           noise_floor=num(r["noise_floor"]), published_status=py["status"], published_L=py["L"],
                           published_lo=py["L_lo"], published_hi=py["L_hi"])
                if kind == "preset_rule_brazil_days":
                    same = (q["status"] == py["status"] and int(q["aqua"]) == py["aqua_count"] and int(round(q["expected"])) == py["fixed_count"]
                            and bool(q["outside"]) == py["outside_noise"] and num(r["noise_floor"]) == pub[p]["baseline"]["noise_floor"]
                            and num(r["placebo_min"]) == pub[p]["baseline"]["placebo_min"] and num(r["placebo_max"]) == pub[p]["baseline"]["placebo_max"]
                            and (py["status"] != "ok" or (num(q["L"]), num(q["lo"]), num(q["hi"])) == (py["L"], py["L_lo"], py["L_hi"])))
                    rec["identical_to_published"] = bool(same)
                    if not same:
                        exact_fail.append(f"{PRESET_ID[p]} {y}")
                else:
                    inside = None if py["status"] != "ok" else bool(q["status"] == "ok" and py["L_lo"] <= num(q["L"]) <= py["L_hi"])
                    rec["inside_published_interval"] = inside
                    if kind == "cells_global_days":
                        rec.update(n_cells=int(len(sel)), cells=[cell_id(c) for c in sel], share_of_cell_detections_in_preset=num(purity),
                                   share_of_preset_detections_in_cells=num(coverage))
                        if y in (2024, 2025) and inside is False:
                            cell_fail.append(f"{PRESET_ID[p]} {y}: L {num(q['L'])} ({q['status']}) vs published {py['L']} [{py['L_lo']}, {py['L_hi']}]")
                g1.append(rec)
    n_scored = sum(1 for r in g1 if r["kind"] == "cells_global_days" and r["year"] in (2024, 2025) and r["inside_published_interval"] is not None)
    days_diff = int((au.M_AS != S["M_AS"]).sum())
    rows.append(bench_row("G1a", "Presets rebuilt from the global archives",
                          "the six presets, selected by their own rules from the all-countries archives and scored on the audit's Brazil-wide retained days, against data/out/audit/*.json: L, interval, counts, noise floor, placebo range, verdict, 2021 to 2025; plus batched month sums identical to audit.ymsum",
                          "30 of 30 preset-years identical", f"{30 - len(exact_fail)} of 30; batched sums identical: {ident}",
                          "PASS" if not exact_fail and ident else "BLOCKED", misses=exact_fail))
    rows.append(bench_row("G1", "Presets reproduce L from grid cells",
                          "cells with over half of their 2012 to 2025 Aqua + S-NPP daytime detections inside the preset, summed, scored on the global retained days: L 2024 and 2025 inside the preset's published 95% interval",
                          f"{n_scored} of {n_scored} scored preset-years inside (Punjab + Haryana has no published value and is not scored)",
                          f"{n_scored - len(cell_fail)} of {n_scored}", "PASS" if not cell_fail else "BLOCKED", misses=cell_fail,
                          retained_days_differing_brazil_vs_global=days_diff, detail=g1))

    # ---- G2: look times
    ex_fail, ex_n, g2 = [], 0, []
    csv = pd.concat([pd.read_csv(os.path.join(BRAZIL, "firms_drift_by_biome.csv")), pd.read_csv(os.path.join(STATS, "out", "regions_drift.csv"))])
    csv = csv[(csv.year >= 2012) & csv.satellite.isin(["Aqua", "S-NPP"]) & csv.biome.isin(PRESETS[1:])]
    csv_n, csv_bad = 0, []
    for q in csv.itertuples():  # the repo's look-time tables, to their 3 decimals of an hour, and the detection counts behind them
        mine = S["lst_tag"].get((q.satellite, q.biome, q.year))
        csv_n += 1
        if mine is None or abs(round(mine[0], 3) - q.lst_median) > 5e-4 or mine[1] != q.n_near_nadir:
            csv_bad.append(f"{q.biome} {q.year} {q.satellite}: {mine} vs {q.lst_median} (n {q.n_near_nadir})")
    for t, p in enumerate(PRESETS):
        if not p:
            continue
        rid = PRESET_ID[p]
        for dy in drift[p]["years"]:
            y = dy["year"]
            if y < 2012:
                continue
            for s, key in (("Aqua", "aqua_lst"), ("S-NPP", "viirs_lst")):
                if rid == "in-punjab-haryana" and s == "S-NPP":
                    continue  # that file's VIIRS rule (scan <= 1.3) differs from the pipeline's (track <= 0.40); statistics README
                if (s, p, y) not in S["lst_tag"] or dy.get(key) is None:
                    continue
                ex_n += 1
                h = S["lst_tag"][(s, p, y)][0]
                mine = repo_hhmm(rid, h if rid.startswith("br-") else round(h, 3))  # audit.py formats the 3-decimal table value
                if mine != dy[key]:
                    ex_fail.append(f"{rid} {y} {s}: {mine} vs {dy[key]}")
    rows.append(bench_row("G2a", "Preset look times rebuilt from the global archives",
                          "yearly median local solar time of near-nadir detections inside each preset's own rule, Aqua and S-NPP, 2012 to 2025, against analysis/brazil-data/out/firms_drift_by_biome.csv, analysis/statistics/out/regions_drift.csv and data/out/drift/*.json",
                          "every median equal to the repo's look-time tables at their 3 decimals of an hour, with the same detection count; every hh:mm in data/out/drift identical",
                          f"{csv_n - len(csv_bad)} of {csv_n} table values; {ex_n - len(ex_fail)} of {ex_n} hh:mm values",
                          "PASS" if not ex_fail and not csv_bad else "BLOCKED", misses=csv_bad + ex_fail))
    TOL = 5.0
    sel_of = {p: np.where(share[:, t] > 0.5)[0] for t, p in enumerate(PRESETS) if p}
    pooled = {}
    for f in S["files"]:
        name = os.path.basename(f)[:-4]
        if not name.startswith("modis_") or int(name.split("_")[1]) < 2012:
            continue
        z = np.load(f); y = int(name.split("_")[1])
        k = z["lst_sat"] == SATS.index("Aqua")
        lc, lv = z["lst_cell"][k], z["lst"][k]
        for p, sel in sel_of.items():
            v = lv[np.isin(lc, sel)]
            pooled[(p, y)] = (float(np.median(v)) if len(v) else np.nan, int(len(v)))
    cell_bad = []
    for p in PRESETS[1:]:
        rid = PRESET_ID[p]
        file_min = {dy["year"]: to_min(dy["aqua_lst"]) for dy in drift[p]["years"] if dy["year"] >= 2012}
        base_file = float(np.median([file_min[y] for y in range(2012, 2021)]))
        base_cell = float(np.median([pooled[(p, y)][0] * 60 for y in range(2012, 2021)]))
        for y in range(2012, 2026):
            d = pooled[(p, y)][0] * 60 - file_min[y]
            rec = dict(preset=rid, year=y, cells_median=repo_hhmm("x", pooled[(p, y)][0]), drift_file=drift[p]["years"][[q["year"] for q in drift[p]["years"]].index(y)]["aqua_lst"],
                       diff_min=round(d, 2), n=pooled[(p, y)][1])
            if y in (2024, 2025):
                rec["shift_cells_min"] = round(pooled[(p, y)][0] * 60 - base_cell, 1)
                rec["shift_file_min"] = round(file_min[y] - base_file, 1)
            g2.append(rec)
            if abs(d) > TOL:
                cell_bad.append(f"{rid} {y}: {d:+.1f} min")
    worst = max(abs(r["diff_min"]) for r in g2)
    worst_shift = max(abs(r["shift_cells_min"] - r["shift_file_min"]) for r in g2 if "shift_cells_min" in r)
    rows.append(bench_row("G2", "Presets reproduce look times from grid cells",
                          "median Aqua local solar time of near-nadir detections in each preset's cells (the G1 cell sets), 84 preset-years 2012 to 2025, against data/out/drift/*.json",
                          f"every difference within {TOL:.0f} min",
                          f"{len(g2) - len(cell_bad)} of {len(g2)} within {TOL:.0f} min; largest {worst:.1f} min; largest difference in the 2024 or 2025 shift {worst_shift:.1f} min",
                          "PASS" if not cell_bad else "BLOCKED", misses=cell_bad,
                          tolerance_basis="The drift files are rounded to the minute (0.5 min). A sun-synchronous look time changes by about 0.5 to 0.7 min per degree of latitude, "
                                          "and a 2-degree cell set can move the fire-weighted latitude of a preset by a few degrees, so a few minutes of offset is geometry, not error. "
                                          "The quantity being mapped moved 40 to 80 min, so 5 min keeps the check meaningful. Set before the comparison was run.",
                          detail=g2))

    # ---- G3: determinism
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        h_repo = write_outputs(grid, cals, table, OUT_JSON, OUT_AUX)
        res2, Rs2 = compute_cells(S)
        g2_, c2_, t2_ = build_outputs(S, res2, Rs2, generated, compute_cells(S, rule="band")[0])
        h_again = write_outputs(g2_, c2_, t2_, os.path.join(tmp, "a", "json"), os.path.join(tmp, "a", "aux"))
        same_proc = h_repo == h_again
        second = None
        if work2:
            agg_same, agg_n = 0, 0
            for f in S["files"]:
                a, b = np.load(f), np.load(os.path.join(work2, "agg", os.path.basename(f)))
                agg_n += 1
                agg_same += int(all(np.array_equal(a[k], b[k]) for k in a.files if k != "stats") and
                                {k: v for k, v in json.loads(str(a["stats"])).items() if k != "seconds"} ==
                                {k: v for k, v in json.loads(str(b["stats"])).items() if k != "seconds"})
            Sb = load_state(work2)
            rb, Rb = compute_cells(Sb)
            gb, cb, tb = build_outputs(Sb, rb, Rb, generated, compute_cells(Sb, rule="band")[0])
            h_b = write_outputs(gb, cb, tb, os.path.join(tmp, "b", "json"), os.path.join(tmp, "b", "aux"))
            second = dict(aggregates_identical=f"{agg_same} of {agg_n}", outputs_identical=h_b == h_repo)
            del Sb
    ok3 = same_proc and (second is None or (second["outputs_identical"] and second["aggregates_identical"] == f"{len(S['files'])} of {len(S['files'])}"))
    rows.append(bench_row("G3", "Determinism",
                          "SHA-256 of grid.json, every cell file, cells_all.csv and interval_widths.csv across runs with the same --generated stamp: the statistics twice in one process, and a second full pass from the raw archives (aggregation and statistics) in a separate work folder",
                          f"{len(h_repo)} of {len(h_repo)} hashes identical; 46 of 46 aggregates identical",
                          f"same process: {same_proc}; second full pass: {second if second else 'not run (no second work folder given)'}",
                          "PASS" if ok3 and second else ("BLOCKED" if not ok3 else "PARTIAL"), files=len(h_repo),
                          grid_sha256=h_repo["grid.json"]))

    # ---- G4: no mock, no placeholders
    cells = grid["cells"]
    act_set = {cell_id(c) for c in S["active"]}
    probs = []
    if grid["mock"] is not False or grid["ai_assisted"] is not True: probs.append("grid flags")
    if any(c["mock"] is not False or c["ai_assisted"] is not True for c in cals.values()): probs.append("cell flags")
    if {c["id"] for c in cells} != act_set: probs.append("listed cells differ from cells with a detection")
    det = S["daily"]["Aqua"].sum(0, dtype=np.float64) + S["daily"]["S-NPP"].sum(0, dtype=np.float64)
    if any(det[c] <= 0 for c in S["active"]): probs.append("a listed cell has no detection")
    if int(det.sum()) != int(sum(S["ctl"][s].sum() for s in ("Aqua", "S-NPP"))): probs.append("listed cells do not add up to the archive totals")
    for c in cells:
        if c["status"] == "ok" and any(c[k] is None for k in ("L_2025", "L_2025_lo", "L_2025_hi", "noise_floor", "outside_noise_2025")):
            probs.append(f"{c['id']} ok without a value")
        if c["status_2024"] == "ok" and any(c[k] is None for k in ("L_2024", "L_2024_lo", "L_2024_hi")):
            probs.append(f"{c['id']} 2024 ok without a value")
    inputs_read = S["files"] + [os.path.join(STATS, "audit.py"), os.path.join(STATS, "region_counts.py"),
                                os.path.join(BRAZIL, "biome_lookup_0p1deg.csv"), os.path.join(BRAZIL, "firms_daily_by_biome.csv"),
                                os.path.join(STATS, "out", "regions_daily.csv")]
    if any("mock" in os.path.relpath(f, ROOT).lower() for f in inputs_read): probs.append("an input path is a mock path")
    rows.append(bench_row("G4", "No mock values",
                          "mock false and ai_assisted true on grid.json and every cell file; listed cells are exactly the cells with a FIRMS daytime detection (Aqua or S-NPP, 2012 to 2025) and add up to the archive totals; every ok reading has a value; no input file sits under a mock folder",
                          "0 problems", f"{len(probs)} problems; {len(cells)} cells, {int(det.sum()):,} detections behind them, {len(cals)} cell files",
                          "PASS" if not probs else "BLOCKED", problems=probs[:20],
                          inputs={k: dict(rows=v["rows"], daytime_rows=v["day_rows"], zip_bytes=v["zip_bytes"], zip_sha256=v["zip_sha256"]) for k, v in sorted(S["stats"].items())}))

    # ---- G5: mask honesty
    probs = []
    for c in cells:
        if c["status"] not in ("ok", "too_few_fires") or c["status_2024"] not in ("ok", "too_few_fires"): probs.append(f"{c['id']} status")
        if c["status"] == "too_few_fires" and any(c[k] is not None for k in ("L_2025", "L_2025_lo", "L_2025_hi", "outside_noise_2025", "lst_shift_min_2025")):
            probs.append(f"{c['id']} masked 2025 carries a value")
        if c["status_2024"] == "too_few_fires" and any(c[k] is not None for k in ("L_2024", "L_2024_lo", "L_2024_hi", "outside_noise_2024", "lst_shift_min_2024")):
            probs.append(f"{c['id']} masked 2024 carries a value")
        if c["status"] == "too_few_fires" and c["status_2024"] == "too_few_fires" and (c["noise_floor"] is not None or c["placebo_min"] is not None or c["placebo_max"] is not None or c["id"] in cals):
            probs.append(f"{c['id']} masked in both years carries a noise floor or a calendar")
    ui = os.path.join(ROOT, "frontend", "src", "directions", "r2", "GlobalLayer.tsx")
    ui_note = "app component not present yet"
    if os.path.exists(ui):
        txt = open(ui).read().lower()
        bad = [w for w in ("no drift", "no change", "no effect", "unaffected") if w in txt]
        ui_note = f"app component: 'too few fires' present: {'too few fires' in txt}; forbidden wording found: {bad}"
        if bad or "too few fires" not in txt: probs.append("app wording")
    n_masked = sum(c["status"] == "too_few_fires" for c in cells)
    rows.append(bench_row("G5", "Mask honesty",
                          "a masked reading has status too_few_fires and no L, interval, verdict or look-time shift; a cell masked in both years has no calendar file; the app says 'too few fires' and never 'no drift'",
                          "0 problems", f"{len(probs)} problems; {n_masked} of {len(cells)} cells masked for 2025; {ui_note}",
                          "PASS" if not probs else "BLOCKED", problems=probs[:20]))

    # ---- G6: independent audit
    ok_ids = sorted(c["id"] for c in cells if c["status"] == "ok")
    picks = [str(x) for x in np.random.default_rng(20261114).choice(ok_ids, 5, replace=False)]
    by_id = {c["id"]: c for c in cells}
    mine = {}
    for cid in picks:
        ci_ = [int(c) for c in S["active"] if cell_id(c) == cid][0]
        mine[cid] = {str(y): dict(L=num(res[ci_]["years"][y]["L"]), L_lo=num(res[ci_]["years"][y]["lo"]), L_hi=num(res[ci_]["years"][y]["hi"]),
                                  aqua_count=int(res[ci_]["years"][y]["aqua"]), snpp_count=int(res[ci_]["years"][y]["snpp"]),
                                  fixed_count=num(res[ci_]["years"][y]["expected"], 1)) for y in (2024, 2025)}
    g6 = dict(picks=picks, pick_rule="numpy default_rng(20261114).choice(sorted ids of cells with status ok, 5, replace=False)", ours=mine)
    status6, result6 = "PENDING", "auditor file not given"
    if audit_file and os.path.exists(audit_file):
        theirs = json.load(open(audit_file))
        g6["auditor"] = theirs
        n, bad = 0, []
        for cid in picks:
            for y in ("2024", "2025"):
                for k in ("L", "aqua_count", "snpp_count", "fixed_count", "L_lo", "L_hi"):
                    a = mine[cid][y][k]; b = theirs.get("cells", {}).get(cid, {}).get(y, {}).get(k)
                    if b is None:
                        if k in ("L_lo", "L_hi"):
                            continue
                        bad.append(f"{cid} {y} {k}: auditor gave no value"); n += 1; continue
                    n += 1
                    tol = 0.0005 if k.startswith("L") else (0.05 if k == "fixed_count" else 0)
                    if abs(float(a) - float(b)) > tol + 1e-9:
                        bad.append(f"{cid} {y} {k}: ours {a}, auditor {b}")
        status6 = "PASS" if not bad and n else "BLOCKED"
        result6 = f"{n - len(bad)} of {n} values match"
        g6["misses"] = bad
    rows.append(bench_row("G6", "Independent audit",
                          "a separate program, written without this script or audit.py, recomputes L, its interval and the counts behind it for 5 seeded cells from the raw archive rows",
                          "all values match (L and interval to 3 decimals, counts exactly)", result6, status6, **g6))

    # ---- G7: totals
    worst7 = {s: float(np.abs(S["ctl"][s] - S["grd"][s]).max()) for s in SATS}
    arch_bad = []
    for f in S["files"]:
        z = np.load(f)
        if int(z["n"].sum()) != json.loads(str(z["stats"]))["day_rows"] or int(z["tot_n"].sum()) != int(z["n"].sum()):
            arch_bad.append(os.path.basename(f))
    edge = [int(c) for c in S["active"] if (c % NX in (0, NX - 1)) or (c // NX in (0, NY - 1))]
    lat_lo = min(v["lat_min"] for v in S["stats"].values()); lat_hi = max(v["lat_max"] for v in S["stats"].values())
    lon_lo = min(v["lon_min"] for v in S["stats"].values()); lon_hi = max(v["lon_max"] for v in S["stats"].values())
    ok7 = all(v == 0 for v in worst7.values()) and not arch_bad
    rows.append(bench_row("G7", "Totals",
                          "daily global totals per satellite counted before gridding against the sum over cells, every day 2012 to 2025; and for all 46 archives, gridded rows against daytime rows read",
                          "largest daily difference 0; 46 of 46 archives add up",
                          f"largest daily difference: Aqua {worst7['Aqua']:.0f}, S-NPP {worst7['S-NPP']:.0f}, Terra {worst7['Terra']:.0f}, NOAA-20 {worst7['NOAA-20']:.0f}; {len(S['files']) - len(arch_bad)} of {len(S['files'])} archives add up; "
                          f"{len(edge)} listed cells touch the dateline columns or polar rows; coordinates span lat {lat_lo:.2f} to {lat_hi:.2f}, lon {lon_lo:.2f} to {lon_hi:.2f}",
                          "PASS" if ok7 else "BLOCKED", totals={s: int(S["ctl"][s].sum()) for s in SATS},
                          duplicate_rows_listed_under_two_countries=int(sum(v["dup_rows_across_files"] for v in S["stats"].values())),
                          duplicate_note="Rows with the same place, time and satellite listed twice in an archive. Not removed: the preset counts keep them too."))

    # ---- context: numbers that help read the map (not pass or fail)
    okc = [int(c) for c in S["active"] if res[int(c)]["years"][2025]["status"] == "ok"]
    exc = []
    for c in okc:
        pl = np.array([res[c]["years"][y]["L"] for y in au.BASE])
        if np.isfinite(pl).all():
            exc.append(np.mean([(pl[i] < np.delete(pl, i).min()) or (pl[i] > np.delete(pl, i).max()) for i in range(9)]))
    A = ymsum_many(au, S["daily"]["Aqua"][:, S["active"]].sum(1, keepdims=True), S["M_AS"])[:, 0]
    V = ymsum_many(au, S["daily"]["S-NPP"][:, S["active"]].sum(1, keepdims=True), S["M_AS"])[:, 0]
    gl = audit_stats(au, A, V)
    t25 = table[table.status_2025 == "ok"]; t24 = table[table.status_2024 == "ok"]
    def summ(t, y):
        L = t[f"L_{y}"].values; o = t[f"outside_noise_{y}"].astype(bool).values
        sh, sv = t[f"aqua_lst_shift_min_{y}"].dropna().values, t[f"snpp_lst_shift_min_{y}"].dropna().values
        return dict(cells_ok=int(len(t)), L_median=num(np.median(L)), L_p10=num(np.percentile(L, 10)), L_p90=num(np.percentile(L, 90)),
                    share_L_above_1=num((L > 1).mean()), share_outside_placebo_range=num(o.mean()),
                    share_outside_above=num((o & (L > 1)).mean()), share_outside_below=num((o & (L < 1)).mean()),
                    aqua_detections_in_ok_cells=int(t[f"aqua_{y}"].sum()), aqua_detections_all_cells=int(table[f"aqua_{y}"].sum()),
                    aqua_look_shift_min_median=num(np.median(sh), 1), aqua_look_shift_min_p10=num(np.percentile(sh, 10), 1),
                    aqua_look_shift_min_p90=num(np.percentile(sh, 90), 1), snpp_look_shift_min_median=num(np.median(sv), 1),
                    snpp_look_shift_min_p10=num(np.percentile(sv, 10), 1), snpp_look_shift_min_p90=num(np.percentile(sv, 90), 1),
                    noise_floor_median=num(np.median(t.noise_floor.values)))
    ctx = dict(
        note="Context for reading the map. Exploratory; none of this is checked against a national reference series.",
        cells_2025=summ(t25, 2025), cells_2024=summ(t24, 2024),
        placebo_control=dict(
            what="For cells with an ok 2025 reading: how often one 2012-2020 year, scored against the other eight, falls outside the range of the other eight's scores. "
                 "Exchangeable years would give about 2 in 9 (0.22). Compare with share_outside_placebo_range above.",
            share=num(float(np.mean(exc))), cells=len(exc)),
        whole_earth=dict(
            what="One series for all listed cells together, scored as one area (its own month ratios). Not the sum of the cell readings.",
            **{str(y): dict(L=num(gl["years"][y]["L"]), L_lo=num(gl["years"][y]["lo"]), L_hi=num(gl["years"][y]["hi"]),
                            aqua_count=int(gl["years"][y]["aqua"]), fixed_count=int(round(gl["years"][y]["expected"])),
                            outside_noise=gl["years"][y]["outside"]) for y in au.AUDIT},
            noise_floor=num(gl["noise_floor"]), placebo_min=num(gl["placebo_min"]), placebo_max=num(gl["placebo_max"])),
        retained_days=dict(brazil_rule=int(au.M_AS.sum()), earth_rule=int(S["M_AS"].sum()), days_differing=days_diff, of_days=int(len(au.M_AS))),
        retained_days_sensitivity=sens(table), by_area=by_area(table))
    out = dict(mock=False, ai_assisted=True, generated=generated, script="analysis/global/global_grid.py bench",
               label=LABEL, mask_rule=mask_rule(au), benchmarks=rows, context=ctx)
    with open(os.path.join(OUT_AUX, "benchmarks.json"), "w") as f:
        json.dump(out, f, indent=1)
    for r in rows:
        print(f"{r['id']:4s} {r['status']:8s} {r['name']}: {r['result']}", flush=True)
        for m in r.get("misses", [])[:12]:
            print("       miss:", m, flush=True)
    print(json.dumps(ctx, indent=1)[:3000], flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["aggregate", "compute", "bench"])
    ap.add_argument("a")
    ap.add_argument("b", nargs="?")
    ap.add_argument("--generated", help="ISO time written into the JSON (default: now, UTC)")
    ap.add_argument("--work2", help="bench: a second work folder aggregated separately from the raw archives (G3)")
    ap.add_argument("--audit", help="bench: the independent auditor's JSON (G6)")
    ap.add_argument("--min-expected", type=float, help="mask: smallest expected Aqua count (default: the audit's, 300)")
    ap.add_argument("--max-rel-half-width", type=float, help="mask: largest 95% half-width as a share of L (default: the audit's, 0.25)")
    ap.add_argument("--sensors", help="aggregate only these sensors, comma separated (to run two passes side by side)")
    args = ap.parse_args()
    if args.min_expected is not None: MASK["min_expected"] = args.min_expected
    if args.max_rel_half_width is not None: MASK["max_rel_half_width"] = args.max_rel_half_width
    if args.cmd == "aggregate":
        cmd_aggregate(args.a, args.b, args.sensors.split(",") if args.sensors else None)
    else:
        import datetime
        generated = args.generated or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        if args.cmd == "compute":
            cmd_compute(args.a, generated)
        else:
            cmd_bench(args.a, generated, args.work2, args.audit)
