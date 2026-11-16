"""California detection-limit spec sheet (FINAL PLAN section 4.6).

Question: of fires that California agencies actually recorded (USFS FPA-FOD 7th ed., 2012-2024), what share did
each satellite detect, by fire size? And at what size does each satellite catch 50% / 90% of fires (a50 / a90)?

Rule (pre-specified in the plan):
  * a fire counts as detected by a satellite if any of that satellite's hotspots lies within sqrt(area/pi) + 1 km of the
    fire's reported point, between discovery - 2 h and containment + 12 h;
  * isolated fires only (no other recorded fire within 10 km whose window overlaps);
  * hotspot filters as in the calendar: vegetation type (type == 0), MODIS confidence >= 30, VIIRS confidence n or h.
Sensitivity variants (reported separately, never mixed in): all fires (not only isolated); all confidence levels;
search radius widened by half the hotspot's pixel diagonal; a "wide" radius of 2*sqrt(area/pi)+1 km (long, wind-driven
fires whose reported point sits at one end); fires with a known containment date only (FPA-FOD California has
containment dates for 80-93% of fires in most years but only 34% in 2012, 20% in 2019 and 13% in 2020).
Missing times: discovery time missing -> start of the discovery day (local); containment missing or before discovery ->
fallback duration by NWCG size class (A,B: 1 d; C: 2 d; D,E: 4 d; F: 10 d; G: 30 d), capped at 120 days.

Usage:
  python3 spec_sheet.py --fpafod FPA_FOD_20260615.gpkg --firms DIR_WITH_US_FILES --out data/out [--years 2012-2024]
FIRMS files expected in DIR: modis_YYYY_United_States.csv.gz and viirs-snpp_YYYY_United_States.csv.gz
"""
import argparse
import glob
import json
import math
import os
import sqlite3

import numpy as np
import pandas as pd

CA_BBOX = (-124.6, 32.4, -114.0, 42.1)          # west, south, east, north
CHINO_HILLS = (33.9898, -117.7326)              # lat, lon (for the local "seen vs missed" map)
FALLBACK_DAYS = {"A": 1, "B": 1, "C": 2, "D": 4, "E": 4, "F": 10, "G": 30}
CLASSES = [("10-100 acres", 10, 100), ("100-1000 acres", 100, 1000), (">1000 acres", 1000, float("inf"))]
SATS = ["Aqua", "Terra", "S-NPP"]
CELL_DEG = 0.25
EARTH_KM = 6371.0
rng = np.random.default_rng(7)


def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi, dl = p2 - p1, np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * EARTH_KM * np.arcsin(np.sqrt(a))


def load_fires(gpkg, y0, y1):
    con = sqlite3.connect(f"file:{gpkg}?mode=ro", uri=True)
    q = f"""SELECT FOD_ID, FIRE_NAME, FIRE_YEAR, DISCOVERY_DATE, DISCOVERY_TIME, CONT_DATE, CONT_TIME, FIRE_SIZE,
                   FIRE_SIZE_CLASS, LATITUDE, LONGITUDE, NWCG_GENERAL_CAUSE
            FROM Fires WHERE STATE='CA' AND FIRE_YEAR BETWEEN {y0} AND {y1}"""
    f = pd.read_sql(q, con)
    con.close()

    def local_dt(date_s, time_s, default_hhmm):
        d = pd.to_datetime(date_s.str[:10], errors="coerce")
        t = time_s.fillna(default_hhmm).astype(str).str.zfill(4)
        t = t.where(t.str.fullmatch(r"\d{4}"), default_hhmm)
        hh = pd.to_numeric(t.str[:2], errors="coerce").clip(0, 23)
        mm = pd.to_numeric(t.str[2:], errors="coerce").clip(0, 59)
        return d + pd.to_timedelta(hh, unit="h") + pd.to_timedelta(mm, unit="m")

    disc = local_dt(f.DISCOVERY_DATE, f.DISCOVERY_TIME, "0000")
    cont = local_dt(f.CONT_DATE.fillna(""), f.CONT_TIME, "2359")
    fb = f.FIRE_SIZE_CLASS.map(FALLBACK_DAYS).fillna(1)
    bad = cont.isna() | (cont < disc) | ((cont - disc) > pd.Timedelta(days=120))
    cont = cont.where(~bad, disc + pd.to_timedelta(fb, unit="D"))
    tz = "America/Los_Angeles"
    f["t0"] = (disc - pd.Timedelta(hours=2)).dt.tz_localize(tz, ambiguous="NaT", nonexistent="shift_forward").dt.tz_convert("UTC")
    f["t1"] = (cont + pd.Timedelta(hours=12)).dt.tz_localize(tz, ambiguous="NaT", nonexistent="shift_forward").dt.tz_convert("UTC")
    f["cont_fallback"] = bad
    f["area_km2"] = f.FIRE_SIZE * 0.00404686
    f["R_km"] = np.sqrt(f.area_km2 / math.pi) + 1.0
    f = f.dropna(subset=["t0", "t1", "LATITUDE", "LONGITUDE"]).reset_index(drop=True)
    return f


def mark_isolated(f, km=10.0):
    """isolated = no other recorded fire within km whose time window overlaps."""
    f = f.copy()
    f["ix"] = np.floor(f.LONGITUDE / 0.1).astype(int)
    f["iy"] = np.floor(f.LATITUDE / 0.1).astype(int)
    base = f[["FOD_ID", "ix", "iy", "LATITUDE", "LONGITUDE", "t0", "t1"]]
    # Cells far enough out that no pair within km is missed. A 0.1-degree cell is only 8.3-9.1 km wide at 32-42 N,
    # so a 3x3 block skipped east-west pairs 8.3-10 km apart (22 California fires were wrongly marked isolated).
    # hav(d/R) >= hav(dlat) and >= cos(lat_max)^2 * hav(dlon), so these bounds hold for every pair within km.
    phi = math.radians(min(89.9, float(f.LATITUDE.abs().max()))) if len(f) else 0.0
    ny = math.ceil(math.degrees(km / EARTH_KM) / 0.1)
    nx = math.ceil(math.degrees(2 * math.asin(min(1.0, math.sin(km / (2 * EARTH_KM)) / math.cos(phi)))) / 0.1)
    pairs = []
    for dx in range(-nx, nx + 1):
        for dy in range(-ny, ny + 1):
            s = base.assign(ix=base.ix + dx, iy=base.iy + dy)
            m = base.merge(s, on=["ix", "iy"], suffixes=("", "_o"))
            m = m[m.FOD_ID != m.FOD_ID_o]
            m = m[(m.t0 <= m.t1_o) & (m.t0_o <= m.t1)]
            d = haversine_km(m.LATITUDE.values, m.LONGITUDE.values, m.LATITUDE_o.values, m.LONGITUDE_o.values)
            pairs.append(m.loc[d <= km, "FOD_ID"])
    crowded = set(pd.concat(pairs).unique()) if pairs else set()
    f["isolated"] = ~f.FOD_ID.isin(crowded)
    return f.drop(columns=["ix", "iy"])


def load_hotspots(firms_dir, year):
    out = []
    for kind, sat_map in (("modis", {"Aqua": "Aqua", "Terra": "Terra"}), ("viirs-snpp", None)):
        # analysis/data-acquisition/get_reference_data.sh saves plain .csv; accept that as well as .csv.gz
        stem = os.path.join(firms_dir, f"{kind}_{year}_United_States.csv")
        path = next((p for p in (stem + ".gz", stem) if os.path.exists(p)), None)
        if path is None:
            continue
        h = pd.read_csv(path, usecols=lambda c: c in {"latitude", "longitude", "acq_date", "acq_time", "satellite",
                                                      "confidence", "type", "scan", "track"})
        w, s, e, n = CA_BBOX
        h = h[h.longitude.between(w, e) & h.latitude.between(s, n)]
        if "type" in h:
            h = h[h["type"] == 0]
        if kind == "modis":
            h = h[h.satellite.isin(sat_map)]
            h["sat"] = h.satellite.map(sat_map)
            h["conf_ok"] = pd.to_numeric(h.confidence, errors="coerce") >= 30
        else:
            h["sat"] = "S-NPP"
            h["conf_ok"] = h.confidence.astype(str).str.lower().isin(["n", "h", "nominal", "high"])
        h["t"] = pd.to_datetime(h.acq_date) + pd.to_timedelta(h.acq_time // 100, unit="h") + pd.to_timedelta(h.acq_time % 100, unit="m")
        h["t"] = h["t"].dt.tz_localize("UTC")
        h["half_diag_km"] = 0.5 * np.sqrt(h.scan.astype(float) ** 2 + h.track.astype(float) ** 2)
        out.append(h[["latitude", "longitude", "t", "sat", "conf_ok", "half_diag_km"]])
    return pd.concat(out, ignore_index=True) if out else None


def match_year(fires, hs):
    """Return per-fire detection flags for each satellite and variant."""
    hs = hs.copy()
    hs["ix"] = np.floor(hs.longitude / CELL_DEG).astype(int)
    hs["iy"] = np.floor(hs.latitude / CELL_DEG).astype(int)
    hs["day"] = hs.t.dt.floor("D")
    rows = []
    for fid, lat, lon, R, t0, t1 in fires[["FOD_ID", "LATITUDE", "LONGITUDE", "R_km", "t0", "t1"]].itertuples(index=False):
        k = int(math.ceil((R + 3.0) / (111.0 * CELL_DEG * max(0.3, math.cos(math.radians(lat)))))) + 1
        ix0, iy0 = int(math.floor(lon / CELL_DEG)), int(math.floor(lat / CELL_DEG))
        days = pd.date_range(t0.floor("D"), t1.floor("D"), freq="D")
        for d in days:
            for dx in range(-k, k + 1):
                for dy in range(-k, k + 1):
                    rows.append((fid, ix0 + dx, iy0 + dy, d, lat, lon, R, t0, t1))
    if not rows:
        return pd.DataFrame(columns=["FOD_ID"])
    keys = pd.DataFrame(rows, columns=["FOD_ID", "ix", "iy", "day", "flat", "flon", "R", "t0", "t1"])
    m = keys.merge(hs, on=["ix", "iy", "day"])
    m = m[(m.t >= m.t0) & (m.t <= m.t1)]
    if m.empty:
        return pd.DataFrame(columns=["FOD_ID"])
    d = haversine_km(m.flat.values, m.flon.values, m.latitude.values, m.longitude.values)
    m = m.assign(dist=d)
    flags = {}
    for sat in SATS:
        s = m[m.sat == sat]
        flags[f"{sat}"] = set(s.loc[(s.dist <= s.R) & s.conf_ok, "FOD_ID"])                       # primary rule
        flags[f"{sat}|allconf"] = set(s.loc[s.dist <= s.R, "FOD_ID"])                              # all confidence
        flags[f"{sat}|pixel"] = set(s.loc[(s.dist <= s.R + s.half_diag_km) & s.conf_ok, "FOD_ID"])  # pixel-aware radius
        flags[f"{sat}|wide"] = set(s.loc[(s.dist <= 2 * s.R - 1) & s.conf_ok, "FOD_ID"])            # 2*sqrt(area/pi)+1 km (long fires)
    out = pd.DataFrame({"FOD_ID": fires.FOD_ID})
    for key, ids in flags.items():
        out[key] = out.FOD_ID.isin(ids)
    return out


def wilson(k, n, z=1.96):
    if n == 0:
        return (None, None)
    p = k / n
    den = 1 + z * z / n
    c = (p + z * z / (2 * n)) / den
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (round(c - h, 3), round(c + h, 3))


def logistic_fit(x, y, iters=50):
    X = np.column_stack([np.ones_like(x), x])
    b = np.zeros(2)
    for _ in range(iters):
        p = 1 / (1 + np.exp(-X @ b))
        W = p * (1 - p) + 1e-9
        H = X.T @ (X * W[:, None])
        g = X.T @ (y - p)
        step = np.linalg.solve(H + 1e-9 * np.eye(2), g)
        b += step
        if np.abs(step).max() < 1e-8:
            break
    return b


def a_level(b, level):
    # acres at which P(detect) = level, from logit(p) = b0 + b1*log10(acres)
    if b[1] <= 0:
        return None
    return float(10 ** ((math.log(level / (1 - level)) - b[0]) / b[1]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fpafod", required=True)
    ap.add_argument("--firms", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--years", default="2012-2024")
    ap.add_argument("--boot", type=int, default=200)
    a = ap.parse_args()
    y0, y1 = (int(v) for v in a.years.split("-"))
    os.makedirs(a.out, exist_ok=True)

    fires = mark_isolated(load_fires(a.fpafod, y0, y1))
    print(f"fires: {len(fires)} (isolated: {int(fires.isolated.sum())}), containment fallback used: {int(fires.cont_fallback.sum())}")
    results, years_done = [], []
    for y in range(y0, y1 + 1):
        hs = load_hotspots(a.firms, y)
        if hs is None:
            print(f"{y}: no FIRMS files, skipped")
            continue
        have = sorted(hs.sat.unique())
        fy = fires[fires.FIRE_YEAR == y]
        det = match_year(fy, hs)
        det = fy[["FOD_ID"]].merge(det, on="FOD_ID", how="left").fillna(False)
        for sat in SATS:
            if sat not in have:   # satellite file missing for this year -> unknown, not "missed"
                for suf in ("", "|allconf", "|pixel", "|wide"):
                    det[sat + suf] = np.nan
        results.append(fy.merge(det, on="FOD_ID"))
        years_done.append(y)
        print(f"{y}: fires {len(fy)}, hotspots {len(hs)} ({', '.join(have)})")
    res = pd.concat(results, ignore_index=True)
    res.to_csv(os.path.join(a.out, "california_fire_detections.csv.gz"), index=False)

    def rate_table(df, sat):
        rows = []
        for name, lo, hi in CLASSES:
            sub = df[(df.FIRE_SIZE >= lo) & (df.FIRE_SIZE < hi) & df[sat].notna()]
            k, n = int(sub[sat].sum()), len(sub)
            rows.append({"size_class": name, "n": n, "detected": k, "rate": round(k / n, 3) if n else None,
                         "ci95": wilson(k, n)})
        return rows

    spec = {"mock": False, "note": "To be reviewed by the team before use.",
            "source": "USFS FPA-FOD 7th ed. (RDS-2013-0009.7) California fires + NASA FIRMS MODIS C6.1 / VIIRS S-NPP 375 m",
            "rule": "detected = hotspot within sqrt(area/pi)+1 km between discovery-2h and containment+12h; isolated fires; type 0; MODIS conf>=30, VIIRS n/h",
            "years_with_data": years_done, "satellites": {}}
    base = res[res.isolated & res.FIRE_YEAR.between(2012, 2020) & (res.FIRE_SIZE >= 1)]
    for sat in SATS:
        d = base[base[sat].notna()]
        entry = {"n_fires_2012_2020": int(len(d)), "rates_2012_2020": rate_table(d, sat)}
        if len(d) > 50 and d[sat].sum() > 5:
            x = np.log10(d.FIRE_SIZE.values.astype(float)); yv = d[sat].values.astype(float)
            b = logistic_fit(x, yv)
            boots50, boots90 = [], []
            for _ in range(a.boot):
                i = rng.integers(0, len(d), len(d))
                bb = logistic_fit(x[i], yv[i])
                boots50.append(a_level(bb, 0.5)); boots90.append(a_level(bb, 0.9))
            q = lambda v: [round(float(np.nanpercentile([z for z in v if z], p)), 1) for p in (2.5, 97.5)] if any(v) else None
            entry.update({"a50_acres": round(a_level(b, 0.5), 1) if a_level(b, 0.5) else None, "a50_ci95": q(boots50),
                          "a90_acres": round(a_level(b, 0.9), 1) if a_level(b, 0.9) else None, "a90_ci95": q(boots90)})
        for variant in ("|allconf", "|pixel", "|wide"):
            dv = base[base[sat + variant].notna()]
            entry["rates_2012_2020" + variant.replace("|", "_")] = rate_table(dv.assign(**{sat: dv[sat + variant]}), sat)
        entry["rates_2012_2020_known_containment_only"] = rate_table(d[~d.cont_fallback.astype(bool)], sat)
        entry["rates_2012_2020_all_fires"] = rate_table(
            res[res.FIRE_YEAR.between(2012, 2020) & (res.FIRE_SIZE >= 1) & res[sat].notna()], sat)
        spec["satellites"][sat] = entry
    with open(os.path.join(a.out, "detection_limits_california.json"), "w") as fh:
        json.dump(spec, fh, indent=1, allow_nan=False)

    # contract file for the app: proof_california.json
    proof = {"mock": False, "note": spec["note"], "size_classes": [c[0] for c in CLASSES], "years": []}
    iso = res[res.isolated]
    for y in years_done:
        for name, lo, hi in CLASSES:
            sub = iso[(iso.FIRE_YEAR == y) & (iso.FIRE_SIZE >= lo) & (iso.FIRE_SIZE < hi)]
            def pod(s):
                v = sub[s].dropna()
                return round(float(v.mean()), 3) if len(v) else None
            proof["years"].append({"year": y, "size_class": name, "aqua_pod": pod("Aqua"), "terra_pod": pod("Terra"),
                                   "viirs_pod": pod("S-NPP"), "n": int(len(sub))})
    with open(os.path.join(a.out, "proof_california.json"), "w") as fh:
        json.dump(proof, fh, indent=1, allow_nan=False)

    # local hook: fires within 25 km of Chino Hills, >= 1 acre, colored by which satellite caught them
    dist = haversine_km(res.LATITUDE.values, res.LONGITUDE.values, CHINO_HILLS[0], CHINO_HILLS[1])
    near = res[(dist <= 25) & (res.FIRE_SIZE >= 1)]
    socal = {"mock": False, "note": spec["note"], "center": {"lat": CHINO_HILLS[0], "lon": CHINO_HILLS[1]}, "radius_km": 25,
             "fires": [{"year": int(r.FIRE_YEAR), "name": None if pd.isna(r.FIRE_NAME) else str(r.FIRE_NAME), "acres": float(r.FIRE_SIZE), "lat": float(r.LATITUDE),
                        "lon": float(r.LONGITUDE), "aqua": None if pd.isna(r.Aqua) else bool(r.Aqua),
                        "terra": None if pd.isna(r.Terra) else bool(r.Terra),
                        "viirs": None if pd.isna(r["S-NPP"]) else bool(r["S-NPP"])}
                       for _, r in near.iterrows()]}
    with open(os.path.join(a.out, "socal_seen_missed.json"), "w") as fh:
        json.dump(socal, fh, indent=1, allow_nan=False)
    print("wrote", a.out)


if __name__ == "__main__":
    main()
