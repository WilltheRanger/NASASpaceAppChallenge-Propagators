#!/usr/bin/env python3
"""Daylight left after the alert.

Question: when a satellite's daytime pass detects a fire, how many hours of daylight are left after the
alert, and how did Aqua's drift change that, compared with Terra and the fixed VIIRS (S-NPP) clock?

    D = sunset - (look time + latency)        all in local mean solar time, hours

Level 1  : one number per region, year, satellite and latency. Look time = the yearly median in
           data/out/drift; sunset = NOAA solar equations at the region box centre on the middle day of the
           region's fire season (the 3 consecutive months with the most fixed-clock fires, 2012 to 2020).
Level 2a : every real near-nadir daytime FIRMS detection, with its own time, date and latitude.
Level 2b : the same real Aqua detections, each moved back by the measured clock change for its region and
           year (that year's aqua_lst minus the 2012 to 2020 median aqua_lst). Only the clock changes.

Usage (from the repo root):
    python3 analysis/daylight/daylight.py                              # Level 1 only
    python3 analysis/daylight/daylight.py --level2 RAW_DIR             # Level 1 + 2a + 2b
    python3 analysis/daylight/daylight.py --level2 RAW_DIR --bench     # plus the benchmark table
    python3 analysis/daylight/daylight.py --audit-picks                # the 5 seeded values for the audit
RAW_DIR holds <Country>/{modis,viirs-snpp}_YYYY_<Country>.csv for Brazil, Argentina, India, United_States,
2012 to 2025 (NASA FIRMS yearly country files; see README.md for the download loop).

Inputs : data/out/drift/<region>.json, data/out/calendar/<region>.json, data/out/regions.json, RAW_DIR
Outputs: data/out/daylight/<region>.json, analysis/daylight/out/<region>.png,
         analysis/daylight/out/benchmarks.json (with --bench)
Sunset : NOAA Solar Calculator equations (after Meeus, Astronomical Algorithms), zenith 90.833 deg.
Latency: 0, 1.5 and 3 h (NASA Earthdata: FIRMS data "within three hours"; MODIS average 60 to 125 min).
"""
import argparse, datetime, glob, hashlib, json, os, sys, tempfile
from multiprocessing import Pool
import numpy as np, pandas as pd

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REGIONS = ["br-amazon", "br-cerrado", "br-pantanal", "ar-argentina", "in-punjab-haryana", "us-california"]
SATS = ["aqua", "terra", "viirs"]
YEARS = list(range(2012, 2026))
BASE = list(range(2012, 2021))                       # the years before Aqua's drift
LATENCY = [("0", 0.0, "D0"), ("1.5", 1.5, "D15"), ("3", 3.0, "D3")]   # key, hours, Level 1 field suffix
# Team decision on benchmark B10 (Nov 14): keep Level 1 as specified; for these regions quote the Level 2a median
LEVEL2A_HEADLINE = ["ar-argentina", "us-california"]
UNDER_H = 2.0                                         # the brief's "less than 2 hours of daylight left"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
COUNTRY = {"Brazil": ["br-amazon", "br-cerrado", "br-pantanal"], "Argentina": ["ar-argentina"],
           "India": ["in-punjab-haryana"], "United_States": ["us-california"]}
BIOME_ID = {"amazon": "br-amazon", "cerrado": "br-cerrado", "pantanal": "br-pantanal"}
CSV_KEY = {"br-amazon": "amazon", "br-cerrado": "cerrado", "br-pantanal": "pantanal",
           "ar-argentina": "argentina", "in-punjab-haryana": "punjab_haryana", "us-california": "california"}
CSV_SAT = {"aqua": "Aqua", "terra": "Terra", "viirs": "S-NPP"}
PUNJAB_BBOX = (73.8, 27.6, 77.6, 32.6)                # west, south, east, north (data/out/regions.json)
# California: the 10-vertex outline copied from analysis/statistics/region_counts.py (lon, lat)
CA = np.array([(-124.6, 42.0), (-120.0, 42.0), (-120.0, 39.0), (-114.63, 35.0), (-114.13, 34.27),
               (-114.72, 32.72), (-117.12, 32.53), (-118.6, 33.2), (-121.0, 34.4), (-124.6, 40.2)])
SOURCES = [
    "NASA FIRMS yearly country files, MODIS C6.1 and VIIRS S-NPP 375 m (firms.modaps.eosdis.nasa.gov/data/country)",
    "NASA Earthdata, 'NASA FIRMS Helps Fight Wildland Fires in Near Real-Time' (latency: within three hours; MODIS average 60 to 125 minutes)",
    "NOAA Global Monitoring Laboratory, Solar Calculation Details (gml.noaa.gov/grad/solcalc/calcdetails.html), after Meeus, Astronomical Algorithms",
]
METHOD = ("D = sunset (NOAA solar equations, local mean solar time) - (look time + latency); look times from "
          "data/out/drift; latency 0, 1.5, 3 h per NASA FIRMS. Level 1: sunset at the region box centre on the "
          "middle day of the fire season. Level 2a: every near-nadir daytime detection with its own time, date "
          "and latitude. Level 2b: the same Aqua detections moved back by the measured clock change.")
FILES_READ = []                                        # every input file opened, for the no-mock check


# ------------------------------------------------------------------ (a) solar functions
def solar(jd):
    """Sun's declination (deg) and equation of time (min) at Julian day jd. NOAA calculator equations."""
    # centuries since the year 2000: the clock every term below runs on
    T = (np.asarray(jd, float) - 2451545.0) / 36525.0
    # where the sun would be if Earth's orbit were a circle (mean longitude and mean anomaly)
    L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360.0
    M = np.radians(357.52911 + T * (35999.05029 - 0.0001537 * T))
    e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
    # the correction for the orbit being an ellipse (equation of centre), then the sun's apparent longitude
    C = (np.sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + np.sin(2 * M) * (0.019993 - 0.000101 * T)
         + np.sin(3 * M) * 0.000289)
    om = np.radians(125.04 - 1934.136 * T)
    lam = np.radians(L0 + C - 0.00569 - 0.00478 * np.sin(om))
    # Earth's axial tilt, with its small wobble (nutation)
    eps0 = 23.0 + (26.0 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60.0) / 60.0
    eps = np.radians(eps0 + 0.00256 * np.cos(om))
    # declination: how far north or south of the equator the sun stands
    decl = np.degrees(np.arcsin(np.sin(eps) * np.sin(lam)))
    # equation of time: minutes the real sun runs ahead of the average (clock) sun
    y = np.tan(eps / 2.0) ** 2
    L0r = np.radians(L0)
    eot = 4.0 * np.degrees(y * np.sin(2 * L0r) - 2 * e * np.sin(M) + 4 * e * y * np.sin(M) * np.cos(2 * L0r)
                           - 0.5 * y * y * np.sin(4 * L0r) - 1.25 * e * e * np.sin(2 * M))
    return decl, eot


def sunset_lmst(jd0_local, lat, lon, passes=3):
    """Sunset in local mean solar time (hours) on the local day that starts at Julian day jd0_local.

    jd0_local is local mean solar midnight written as a Julian day number, so the instant of a local time t
    is jd0_local + (t - lon/15)/24 in UT. Longitude only sets that instant (the sun's declination changes
    slowly through the day); it shifts sunset by well under a minute.
    """
    jd0_local, lat, lon = np.asarray(jd0_local, float), np.radians(np.asarray(lat, float)), np.asarray(lon, float)
    t = np.full(np.broadcast(jd0_local, lat, lon).shape, 18.0)       # first guess: 6 PM
    for _ in range(passes):                                          # refine: evaluate the sun at the sunset instant
        decl, eot = solar(jd0_local + (t - lon / 15.0) / 24.0)
        d = np.radians(decl)
        # hour angle at which the sun's centre is 0.833 deg below the horizon (refraction + the sun's radius)
        cosH = (np.cos(np.radians(90.833)) - np.sin(lat) * np.sin(d)) / (np.cos(lat) * np.cos(d))
        H = np.degrees(np.arccos(np.clip(cosH, -1.0, 1.0)))
        # 15 deg of hour angle = 1 hour; minus the equation of time turns sun time into mean (clock) time
        t = 12.0 + H / 15.0 - eot / 60.0
    return t


def jd0(date):
    """Julian day number of 00:00 on a calendar date (days since 1970-01-01 plus 2440587.5)."""
    return (date - datetime.date(1970, 1, 1)).days + 2440587.5


def hm(s):
    """'HH:MM' to hours."""
    h, m = s.split(":")
    return int(h) + int(m) / 60.0


def hhmm(h):
    """hours to 'HH:MM'."""
    m = int(round(h * 60))
    return f"{m // 60:02d}:{m % 60:02d}"


# ------------------------------------------------------------------ (b) Level 1
def read_json(rel):
    """Open a repo JSON file and record it (with its mock flag) for the no-mock check."""
    with open(os.path.join(REPO, rel)) as f:
        obj = json.load(f)
    FILES_READ.append({"file": rel, "mock": obj.get("mock") if isinstance(obj, dict) else None})
    return obj


def season(months, field):
    """The 3 consecutive calendar months (wrap allowed) with the highest summed count over 2012 to 2020."""
    tot = np.zeros(12)
    for m in months:
        y, mo = int(m["ym"][:4]), int(m["ym"][5:7])
        if y in BASE and m[field] is not None:
            tot[mo - 1] += m[field]
    sums = [tot[i] + tot[(i + 1) % 12] + tot[(i + 2) % 12] for i in range(12)]
    start = int(np.argmax(sums))                                     # 0-based first month of the best window
    return [(start + k) % 12 + 1 for k in range(3)], [float(s) for s in sums], [float(t) for t in tot]


def mid_date(year, start_month):
    """Middle day of the 3-month window that starts in `year`."""
    a = datetime.date(year, start_month, 1)
    em = start_month + 3
    b = datetime.date(year + (em - 1) // 12, (em - 1) % 12 + 1, 1)   # first day after the window
    return a + datetime.timedelta(days=((b - a).days - 1) // 2)


def level1():
    """Region x year x satellite x latency table from the drift files, the calendar and the solar equations."""
    regs = {r["id"]: r for r in read_json("data/out/regions.json")["regions"]}
    out = {}
    for rid in REGIONS:
        drift = {y["year"]: y for y in read_json(f"data/out/drift/{rid}.json")["years"]}
        cal = read_json(f"data/out/calendar/{rid}.json")["months"]
        mons, sums, tot = season(cal, "fixed")
        mons_aqua, _, _ = season(cal, "aqua")
        w, s, e, n = regs[rid]["bbox"]
        lat, lon = (s + n) / 2.0, (w + e) / 2.0                      # box centre
        look = {sat: {y: hm(drift[y][f"{sat}_lst"]) for y in YEARS} for sat in SATS}
        years = []
        for y in YEARS:
            md = mid_date(y, mons[0])
            ss = float(sunset_lmst(jd0(md), lat, lon))
            row = {"year": y, "mid_date": md.isoformat(), "sunset_h": ss, "sunset_lst": hhmm(ss), "after_dark": []}
            for sat in SATS:
                row[f"{sat}_lst"] = drift[y][f"{sat}_lst"]
                for key, lh, suf in LATENCY:
                    d = ss - (look[sat][y] + lh)                     # the one equation
                    row[f"_{sat}_{suf}_raw"] = d
                    if d < 0:                                        # alert after dark: report 0 and count it
                        row["after_dark"].append(f"{sat}_{suf}")
                    row[f"{sat}_{suf}"] = max(d, 0.0)
            years.append(row)
        by = {r["year"]: r for r in years}
        base_d = float(np.mean([by[y]["_aqua_D15_raw"] for y in BASE]))
        base_look = float(np.mean([look["aqua"][y] for y in BASE]))
        out[rid] = {
            "name": regs[rid]["name"], "lat": lat, "lon": lon, "bbox": regs[rid]["bbox"], "look": look,
            "season": mons, "season_aqua": mons_aqua, "season_sums": sums, "month_totals": tot, "years": years,
            "aqua_base_median_lst": float(np.median([look["aqua"][y] for y in BASE])),
            "headline": {"aqua_D15_2012_2020_mean_h": base_d, "aqua_D15_2025_h": by[2025]["_aqua_D15_raw"],
                         "aqua_daylight_change_min": (by[2025]["_aqua_D15_raw"] - base_d) * 60.0,
                         "aqua_look_change_min": (look["aqua"][2025] - base_look) * 60.0},
        }
    return out


# ------------------------------------------------------------------ (c) Level 2a and 2b
COLS = ["latitude", "longitude", "scan", "track", "acq_date", "acq_time", "satellite", "confidence",
        "daynight", "type"]


def inside(lon, lat, poly):
    """Even-odd ray casting, as in analysis/statistics/region_counts.py."""
    x, y, r = poly[:, 0], poly[:, 1], np.zeros(len(lon), bool)
    for i in range(len(poly)):
        x1, y1, x2, y2 = x[i - 1], y[i - 1], x[i], y[i]
        cross = ((y1 > lat) != (y2 > lat)) & (lon < (x2 - x1) * (lat - y1) / np.where(y2 != y1, y2 - y1, 1) + x1)
        r ^= cross
    return r


def stats(D0):
    """Median daylight left, share under 2 h and share after dark, at each latency."""
    o = {"D_median": {}, "share_under_2h": {}, "share_after_dark": {}}
    for key, lh, _ in LATENCY:
        d = D0 - lh
        o["D_median"][key] = float(np.median(np.maximum(d, 0.0))) if len(d) else None
        o["share_under_2h"][key] = float(np.mean(d < UNDER_H)) if len(d) else None
        o["share_after_dark"][key] = float(np.mean(d < 0.0)) if len(d) else None
    return o


def l2_file(job):
    """One FIRMS country-year file: keep the region's near-nadir daytime fires, give each its own D."""
    path, country, sensor, ctx = job
    d = pd.read_csv(path, usecols=COLS, dtype={"satellite": str, "confidence": str})
    d = d[d.daynight == "D"]
    # which region each detection belongs to, by the same rule the repo used for its counts and look times
    if country == "Brazil":
        lk = pd.read_csv(os.path.join(REPO, "analysis/brazil-data/out/biome_lookup_0p1deg.csv"),
                         usecols=["cell_lat", "cell_lon", "biome"])
        d["cell_lat"] = np.floor(d.latitude * 10).astype(int)
        d["cell_lon"] = np.floor(d.longitude * 10).astype(int)
        d = d.merge(lk, on=["cell_lat", "cell_lon"], how="left")
        d["region"] = d.biome.map(BIOME_ID)
        d = d[d.region.notna()]
    elif country == "Argentina":
        d = d.assign(region="ar-argentina")
    elif country == "India":
        w, s, e, n = PUNJAB_BBOX
        d = d[(d.longitude >= w) & (d.longitude <= e) & (d.latitude >= s) & (d.latitude <= n)]
        d = d.assign(region="in-punjab-haryana")
    else:
        d = d[inside(d.longitude.values, d.latitude.values, CA)].assign(region="us-california")
    # vegetation fires at nominal or high confidence, seen near the centre of the swath
    if sensor == "viirs":
        ok = (d.type == 0) & d.confidence.isin(["n", "h"])
        nn = d.track <= 0.40
        d["sat"] = d.satellite.map({"N": "viirs"})
    else:
        ok = (d.type == 0) & (pd.to_numeric(d.confidence, errors="coerce") >= 30)
        nn = d.scan <= 1.3
        d["sat"] = d.satellite.map({"Aqua": "aqua", "Terra": "terra"})
    # the Punjab drift file kept VIIRS pixels by scan <= 1.3 (all of them); used only to reproduce that file
    d["nn"], d["nn_drift"] = nn, ((d.scan <= 1.3) if country == "India" else nn)
    d = d[ok & d.sat.notna()].copy()
    # local mean solar time and local date of each detection
    utc_h = (d.acq_time // 100) + (d.acq_time % 100) / 60.0
    loc_h = utc_h + d.longitude / 15.0
    off = np.floor(loc_h / 24.0)                                    # -1, 0 or +1 day against the UTC date
    d["lst"] = loc_h % 24
    day = pd.to_datetime(d.acq_date).values.astype("datetime64[D]").astype(np.int64) + off.values.astype(np.int64)
    d["day"] = day
    d["month"] = (day.astype("datetime64[D]").astype("datetime64[M]").astype(np.int64) % 12) + 1
    # its own sunset (own date, latitude, longitude), then daylight left with no latency
    d["sunset"] = sunset_lmst(day + 2440587.5, d.latitude.values, d.longitude.values)
    d["D0"] = d.sunset - d.lst
    d["year"] = d.acq_date.str[:4].astype(int)
    recs = []
    for (rid, sat, year), g in d.groupby(["region", "sat", "year"]):
        k = g[g.nn]
        r = {"region": rid, "sat": sat, "year": int(year), "n": int(len(k)),
             "lst_median": float(k.lst.median()) if len(k) else None,
             "n_drift": int(g.nn_drift.sum()),
             "lst_median_drift": float(g.lst[g.nn_drift].median()) if g.nn_drift.any() else None,
             "lat_median": float(k.latitude.median()) if len(k) else None,
             "sunset_median": float(k.sunset.median()) if len(k) else None,
             "day_median": int(np.median(k.day.values)) if len(k) else None}
        r.update(stats(k.D0.values))
        ins = k[k.month.isin(ctx["season"][rid])]
        r["season_share"] = float(len(ins) / len(k)) if len(k) else None
        r["D0_median_season"] = float(np.median(np.maximum(ins.D0.values, 0.0))) if len(ins) else None
        r["lst_median_season"] = float(ins.lst.median()) if len(ins) else None
        if sat == "aqua":
            # same detections, own dates and times, but sunset taken at the box centre (isolates the latitude effect)
            clat, clon = ctx["centre"][rid]
            r["D0_median_centre"] = float(np.median(np.maximum(
                sunset_lmst(k.day.values + 2440587.5, clat, clon) - k.lst.values, 0.0))) if len(k) else None
            # Level 2b: the same fires with Aqua's clock moved back by the measured change for this year
            sh = ctx["shift"][rid][int(year)]
            lst_cf = k.lst.values - sh
            Dcf0 = k.sunset.values - lst_cf
            cf = stats(Dcf0)
            r["cf_shift_h"] = sh
            r["cf_D_median"], r["cf_share_under_2h"], r["cf_share_after_dark"] = (
                cf["D_median"], cf["share_under_2h"], cf["share_after_dark"])
            err, clamped = 0.0, {}
            for key, lh, _ in LATENCY:                              # identity check: D_cf - D must equal the shift
                D = k.sunset.values - (k.lst.values + lh)
                Dc = k.sunset.values - (lst_cf + lh)
                un = (D >= 0) & (Dc >= 0)
                if un.any():
                    err = max(err, float(np.max(np.abs((Dc[un] - D[un]) - sh))))
                clamped[key] = {"actual_after_dark": int((D < 0).sum()), "what_if_after_dark": int((Dc < 0).sum())}
            r["cf_identity_max_err_h"], r["cf_clamped"] = err, clamped
        recs.append(r)
    return recs


def level2(raw, l1, procs=2):
    """Run every country-year file and index the results by (region, satellite, year)."""
    ctx = {"season": {rid: l1[rid]["season"] for rid in REGIONS},
           "centre": {rid: (l1[rid]["lat"], l1[rid]["lon"]) for rid in REGIONS},
           "shift": {rid: {y: l1[rid]["look"]["aqua"][y] - l1[rid]["aqua_base_median_lst"] for y in YEARS}
                     for rid in REGIONS}}
    jobs = []
    for country in COUNTRY:
        for y in YEARS:
            for sensor, stem in (("modis", "modis"), ("viirs", "viirs-snpp")):
                p = os.path.join(raw, country, f"{stem}_{y}_{country}.csv")
                if not os.path.exists(p):
                    sys.exit(f"missing raw file: {p}")
                jobs.append((p, country, sensor, ctx))
    with Pool(procs) as pool:
        res = pool.map(l2_file, jobs, chunksize=1)
    return {(r["region"], r["sat"], r["year"]): r for recs in res for r in recs}


# ------------------------------------------------------------------ outputs
def r3(x):
    return None if x is None else round(float(x), 3)


def r4(x):
    return None if x is None else round(float(x), 4)


def build_json(rid, l1, l2, generated):
    """The app file for one region, in the brief's section 5 format plus the extra fields."""
    R = l1[rid]
    years = []
    for row in R["years"]:
        y = row["year"]
        o = {"year": y, "mid_date": row["mid_date"], "sunset_lst": row["sunset_lst"], "sunset_h": r3(row["sunset_h"])}
        for sat in SATS:
            o[f"{sat}_lst"] = row[f"{sat}_lst"]
        for sat in SATS:
            for _, _, suf in LATENCY:
                o[f"{sat}_{suf}"] = r3(row[f"{sat}_{suf}"])
        o["after_dark"] = row["after_dark"]
        for sat in SATS:
            rec = l2.get((rid, sat, y)) if l2 else None
            o[f"{sat}_D_median"] = {k: r3(v) for k, v in rec["D_median"].items()} if rec else None
            o[f"{sat}_share_under_2h"] = {k: r4(v) for k, v in rec["share_under_2h"].items()} if rec else None
            o[f"{sat}_share_after_dark"] = {k: r4(v) for k, v in rec["share_after_dark"].items()} if rec else None
            o[f"n_{sat}"] = rec["n"] if rec else None
        rec = l2.get((rid, "aqua", y)) if l2 else None
        o["aqua_cf_shift_min"] = round(rec["cf_shift_h"] * 60.0, 1) if rec else None
        o["aqua_cf_D_median"] = {k: r3(v) for k, v in rec["cf_D_median"].items()} if rec else None
        o["aqua_cf_share_under_2h"] = {k: r4(v) for k, v in rec["cf_share_under_2h"].items()} if rec else None
        o["aqua_cf_share_after_dark"] = {k: r4(v) for k, v in rec["cf_share_after_dark"].items()} if rec else None
        years.append(o)
    h = R["headline"]
    head = {"aqua_D15_2012_2020_mean": r3(h["aqua_D15_2012_2020_mean_h"]), "aqua_D15_2025": r3(h["aqua_D15_2025_h"]),
            "aqua_daylight_change_min": round(h["aqua_daylight_change_min"], 1),
            "aqua_look_change_min": round(h["aqua_look_change_min"], 1), "quote": "level1"}
    if l2:
        # the same headline from every real detection (Level 2a median at 1.5 h latency)
        b2 = float(np.mean([l2[(rid, "aqua", y)]["D_median"]["1.5"] for y in BASE]))
        n2 = l2[(rid, "aqua", 2025)]["D_median"]["1.5"]
        head.update({"level2a_aqua_D15_2012_2020_mean": r3(b2), "level2a_aqua_D15_2025": r3(n2),
                     "level2a_aqua_daylight_change_min": round((n2 - b2) * 60.0, 1)})
        if rid in LEVEL2A_HEADLINE:
            head["quote"] = "level2a"
            head["quote_reason"] = ("Level 1 (one season day at the box centre) differs from the real detections by more than "
                                    "30 minutes in some years here; quote the level2a values")
    return {
        "mock": False, "region": rid, "name": R["name"], "generated": generated,
        "script": "analysis/daylight/daylight.py", "method": METHOD, "sources": SOURCES,
        "unit": "hours of daylight left after the alert (local mean solar time); shares are fractions of detections",
        "latency_h": [lh for _, lh, _ in LATENCY],
        "season": {"months": [MONTHS[m - 1] for m in R["season"]], "month_numbers": R["season"],
                   "basis": "3 consecutive calendar months with the highest summed fixed count, 2012 to 2020",
                   "mid_rule": "middle day of the window, per year", "lat": round(R["lat"], 3), "lon": round(R["lon"], 3)},
        "headline": head,
        "level2": ({"detections": "daytime, type 0, MODIS confidence >= 30 and scan <= 1.3 km, VIIRS S-NPP confidence n or h "
                                  "and track <= 0.40 km; region membership as in the repo's counts",
                    "under_threshold_h": UNDER_H,
                    "what_if": "aqua_cf_* = the same Aqua detections moved back by aqua_cf_shift_min "
                               "(that year's aqua_lst minus the 2012 to 2020 median aqua_lst); assumes each fire "
                               "would still be detected at the earlier time",
                    "aqua_base_median_lst": hhmm(R["aqua_base_median_lst"])} if l2 else None),
        "years": years,
    }


def chart(obj, path):
    """One chart per region, drawn only from the region's JSON."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    ink, ink2, grid, surface = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb"
    ser = [("terra", "Terra", "#2a78d6", "o"), ("viirs", "VIIRS (S-NPP)", "#eb6834", "s"), ("aqua", "Aqua", "#1baf7a", "^")]
    yrs = [r["year"] for r in obj["years"]]
    fig, ax = plt.subplots(figsize=(8.0, 4.6), dpi=160)
    fig.patch.set_facecolor(surface); ax.set_facecolor(surface)
    for key, label, col, mk in ser:
        mid = [r[f"{key}_D15"] for r in obj["years"]]
        lo = [r[f"{key}_D3"] for r in obj["years"]]
        hi = [r[f"{key}_D0"] for r in obj["years"]]
        ax.fill_between(yrs, lo, hi, color=col, alpha=0.11, linewidth=0)
        ax.plot(yrs, mid, color=col, linewidth=2, marker=mk, markersize=5, markeredgecolor=surface,
                markeredgewidth=1, label=label)
        ax.annotate(label.split(" ")[0], (yrs[-1], mid[-1]), xytext=(8, 0), textcoords="offset points",
                    va="center", fontsize=9, color=ink)
    ax.set_xlim(yrs[0] - 0.4, yrs[-1] + 1.6)
    ax.set_ylim(0, max(r["terra_D0"] for r in obj["years"]) * 1.16)     # headroom so the legend clears the bands
    ax.set_xticks([y for y in yrs if (yrs[-1] - y) % 2 == 0])
    ax.set_xlabel("Year", color=ink2, fontsize=9)
    ax.set_ylabel("Hours of daylight left after the alert", color=ink2, fontsize=9)
    ax.grid(axis="y", color=grid, linewidth=0.8); ax.set_axisbelow(True)
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color(grid)
    ax.tick_params(colors=ink2, labelsize=8.5, length=0)
    s = obj["season"]
    fig.text(0.07, 0.955, f"Daylight left after the alert: {obj['name']}", fontsize=12.5, color=ink, weight="bold", va="top")
    fig.text(0.07, 0.895, f"Line: alert 1.5 h after the pass. Band: 0 to 3 h (NASA FIRMS latency). "
             f"Fire season {s['months'][0]} to {s['months'][2]}, sunset at latitude {s['lat']:.1f}.",
             fontsize=8.5, color=ink2, va="top")
    ax.legend(loc="upper left", bbox_to_anchor=(0.0, 1.0), ncol=3, frameon=False, fontsize=8.5, labelcolor=ink2,
              handlelength=1.6, borderaxespad=0.2)
    fig.subplots_adjust(left=0.07, right=0.97, top=0.80, bottom=0.11)
    fig.savefig(path, facecolor=surface, metadata={"Software": None})
    plt.close(fig)


def write_outputs(l1, l2, generated, json_dir, aux_dir):
    """Write the six JSON files and the six charts; return {relative name: sha256}."""
    os.makedirs(json_dir, exist_ok=True); os.makedirs(aux_dir, exist_ok=True)
    hashes = {}
    for rid in REGIONS:
        obj = build_json(rid, l1, l2, generated)
        jp, pp = os.path.join(json_dir, f"{rid}.json"), os.path.join(aux_dir, f"{rid}.png")
        with open(jp, "w") as f:
            json.dump(obj, f, indent=1, ensure_ascii=False, allow_nan=False)
        chart(obj, pp)
        for p in (jp, pp):
            hashes[os.path.basename(p)] = hashlib.sha256(open(p, "rb").read()).hexdigest()
    return hashes


# ------------------------------------------------------------------ audit picks (benchmark B16)
def leaves(json_dir):
    """Every numeric value in the six files, as (region, year, field) -> value."""
    out = []
    for rid in REGIONS:
        obj = json.load(open(os.path.join(json_dir, f"{rid}.json")))
        for row in obj["years"]:
            for k in sorted(row):
                v = row[k]
                if k == "year" or isinstance(v, (str, list)) or v is None:
                    continue
                if isinstance(v, dict):
                    out += [(rid, row["year"], f"{k}.{kk}", vv) for kk, vv in sorted(v.items()) if vv is not None]
                else:
                    out.append((rid, row["year"], k, v))
    return out


def audit_picks(json_dir, seed=20261114, n=5):
    """The 5 seeded values, plus 5 more drawn the same way from the non-zero values (a harder test)."""
    lv = leaves(json_dir)
    rng = np.random.default_rng(seed)
    idx = sorted(rng.choice(len(lv), size=n, replace=False))
    nz = [i for i, x in enumerate(lv) if x[3] != 0 and i not in idx]
    ext = sorted(rng.choice(nz, size=n, replace=False))
    row = lambda i: {"region": lv[i][0], "year": lv[i][1], "field": lv[i][2], "value": lv[i][3]}
    return {"seeded": [row(i) for i in idx], "extra_nonzero": [row(i) for i in ext]}


# ------------------------------------------------------------------ (d) benchmarks
# B2 reference: "Apparent Sunset" shown by the NOAA Solar Calculator web page (gml.noaa.gov/grad/solcalc),
# read in a browser on 2026-11-14. clock = the page's local sunset time, tz = the UTC offset the page showed.
NOAA_WEB = [
    {"name": "Manaus", "lat": -3.1, "lon": -60.02, "date": "2025-09-15", "clock": "17:58", "tz": -4.0},
    {"name": "Chino Hills", "lat": 34.0, "lon": -117.73, "date": "2025-06-21", "clock": "20:06", "tz": -7.0},
    {"name": "Punjab + Haryana box centre", "lat": 30.1, "lon": 75.7, "date": "2025-11-01", "clock": "17:40", "tz": 5.5},
    {"name": "Amazon box centre", "lat": -5.7, "lon": -58.5, "date": "2025-09-15", "clock": "17:51", "tz": -4.0},
]


def bench_row(bid, name, metric, threshold, value, status, evidence):
    return {"id": bid, "name": name, "metric": metric, "threshold": threshold, "value": value, "status": status,
            "evidence": evidence}


def astropy_refs(cases):
    """Independent reference: sunset instant, declination and equation of time from the astropy ephemeris."""
    import warnings
    from scipy.optimize import brentq
    from astropy.utils import iers
    iers.conf.auto_download = False
    import astropy.units as u
    from astropy.time import Time
    from astropy.coordinates import EarthLocation, AltAz, TETE, get_sun
    warnings.simplefilter("ignore")
    out = []
    for lat, lon, date in cases:
        loc = EarthLocation(lat=lat * u.deg, lon=lon * u.deg, height=0 * u.m)
        j0 = jd0(date)

        def alt(t):                                                  # sun-centre altitude + 0.833 deg at local time t
            tm = Time(j0 + (t - lon / 15.0) / 24.0, format="jd", scale="utc")
            return float(get_sun(tm).transform_to(AltAz(obstime=tm, location=loc, pressure=0 * u.hPa)).alt.deg) + 0.833

        g = float(sunset_lmst(j0, lat, lon))
        t = brentq(alt, g - 0.5, g + 0.5, xtol=1e-6)
        jd = j0 + (t - lon / 15.0) / 24.0
        tm = Time(jd, format="jd", scale="utc")
        s = get_sun(tm).transform_to(TETE(obstime=tm))
        gha = tm.sidereal_time("apparent", "greenwich").hour - s.ra.hour
        ut = ((jd + 0.5) % 1.0) * 24.0
        eot = (((gha + 12.0 - ut) + 12.0) % 24.0 - 12.0) * 60.0
        out.append({"sunset": t, "decl": float(s.dec.deg), "eot": float(eot), "jd": jd})
    return out


def benchmarks(l1, l2, raw, json_dir, aux_dir, generated, audit_file):
    rows = []
    centres = [(l1[r]["lat"], l1[r]["lon"]) for r in REGIONS]
    grid = [(la, lo, datetime.date(2025, m, d)) for la, lo in centres for m in range(1, 13) for d in (1, 15)]

    # B1 + B3: our sunset, declination and equation of time against an independent ephemeris
    try:
        ref = astropy_refs(grid)
        mine = [float(sunset_lmst(jd0(d), la, lo)) for la, lo, d in grid]
        ds = [abs(m - r["sunset"]) * 60.0 for m, r in zip(mine, ref)]
        i = int(np.argmax(ds))
        rows.append(bench_row("B1", "Sunset vs astropy", "max |diff| over 144 cases (6 region centres x 24 dates of 2025), minutes",
                              "<= 1.0 min, 144/144", f"max {max(ds):.3f} min, mean {np.mean(ds):.3f} min, {sum(x <= 1.0 for x in ds)}/144 within 1 min",
                              "PASS" if max(ds) <= 1.0 else "FAIL",
                              f"worst case lat {grid[i][0]:.2f}, {grid[i][2]}: ours {mine[i]:.4f} h, astropy {ref[i]['sunset']:.4f} h"))
        de = [solar(r["jd"]) for r in ref]
        dd = [abs(float(a[0]) - r["decl"]) for a, r in zip(de, ref)]
        dq = [abs(float(a[1]) - r["eot"]) for a, r in zip(de, ref)]
        rows.append(bench_row("B3", "Declination and equation of time vs astropy", "max |diff| on the B1 grid",
                              "decl <= 0.02 deg, EoT <= 0.3 min", f"decl {max(dd):.4f} deg, EoT {max(dq):.3f} min",
                              "PASS" if max(dd) <= 0.02 and max(dq) <= 0.3 else "FAIL",
                              "astropy apparent place of the sun (true equator and equinox of date); EoT from Greenwich apparent sidereal time"))
    except ImportError as ex:
        for b, n in (("B1", "Sunset vs astropy"), ("B3", "Declination and equation of time vs astropy")):
            rows.append(bench_row(b, n, "", "", None, "BLOCKED", f"astropy or scipy not installed: {ex}"))

    # B2: the same sunset against the official NOAA web calculator (values read by hand from the page)
    if NOAA_WEB:
        ev, ok = [], True
        for c in NOAA_WEB:
            mine = float(sunset_lmst(jd0(datetime.date.fromisoformat(c["date"])), c["lat"], c["lon"]))
            noaa = hm(c["clock"]) - c["tz"] + c["lon"] / 15.0        # page clock time -> UTC -> local mean solar time
            df = (mine - noaa) * 60.0
            ok &= abs(df) <= 1.0
            ev.append(f"{c['name']} {c['date']}: NOAA {c['clock']} (UTC{c['tz']:+g}) = {noaa:.4f} h LMST; ours {mine:.4f} h ({hhmm(mine)}); diff {df:+.2f} min")
        rows.append(bench_row("B2", "Sunset vs NOAA Solar Calculator web page", "|diff| per case, minutes (the page shows whole minutes)",
                              "<= 1 min, 4/4", f"{sum(abs(float(e.split('diff ')[1].split(' ')[0])) <= 1.0 for e in ev)}/{len(ev)} within 1 min",
                              "PASS" if ok and len(ev) >= 4 else "FAIL", ev))
    else:
        rows.append(bench_row("B2", "Sunset vs NOAA Solar Calculator web page", "", "<= 1 min, 4/4", None, "BLOCKED",
                              "NOAA web values not read yet (NOAA_WEB is empty)"))

    # B6: is the fire season the same whether chosen from fixed-clock counts or raw Aqua counts?
    diff = [f"{r}: fixed {l1[r]['season']} vs aqua {l1[r]['season_aqua']}" for r in REGIONS if l1[r]["season"] != l1[r]["season_aqua"]]
    rows.append(bench_row("B6", "Season stability", "regions whose 3-month window differs between `fixed` and raw `aqua`", "0 of 6",
                          f"{len(diff)} of 6", "PASS" if not diff else "FAIL",
                          diff or {r: [MONTHS[m - 1] for m in l1[r]["season"]] for r in REGIONS}))

    # B7: with sunset fixed, Aqua's daylight change must be minus its look-time change
    ev, worst = [], 0.0
    for r in REGIONS:
        h = l1[r]["headline"]
        by = {x["year"]: x for x in l1[r]["years"]}
        ss = (by[2025]["sunset_h"] - np.mean([by[y]["sunset_h"] for y in BASE])) * 60.0
        res = h["aqua_daylight_change_min"] + h["aqua_look_change_min"]
        worst = max(worst, abs(res))
        ev.append(f"{r}: daylight {h['aqua_daylight_change_min']:+.2f} min, look {h['aqua_look_change_min']:+.2f} min, residual {res:+.3f} min (sunset change {ss:+.3f} min)")
    rows.append(bench_row("B7", "Arithmetic identity (Level 1)", "max |daylight change + look change| over 6 regions, minutes", "<= 1 min",
                          f"{worst:.3f} min", "PASS" if worst <= 1.0 else "FAIL", ev))

    # B8: VIIRS did not drift, so its daylight should move only as much as its look time wobbles
    ev, worst = [], 0.0
    for r in REGIONS:
        D = [x["_viirs_D0_raw"] for x in l1[r]["years"]]
        lk = list(l1[r]["look"]["viirs"].values())
        a, b = (max(D) - min(D)) * 60.0, (max(lk) - min(lk)) * 60.0
        worst = max(worst, abs(a - b))
        ev.append(f"{r}: daylight range {a:.2f} min, look range {b:.2f} min")
    rows.append(bench_row("B8", "VIIRS flat", "max |daylight range - look-time range| 2012 to 2025, minutes", "<= 1 min",
                          f"{worst:.3f} min", "PASS" if worst <= 1.0 else "FAIL", ev))

    # B9: Terra drifted earlier, so its daylight must rise in every year its look time got earlier
    bad, n = [], 0
    for r in REGIONS:
        by = {x["year"]: x for x in l1[r]["years"]}
        for y in range(2021, 2026):
            if l1[r]["look"]["terra"][y] < l1[r]["look"]["terra"][y - 1]:
                n += 1
                if not by[y]["_terra_D0_raw"] > by[y - 1]["_terra_D0_raw"]:
                    bad.append(f"{r} {y}")
    rows.append(bench_row("B9", "Terra opposite", "region-years 2021 to 2025 where Terra looked earlier but daylight did not rise", "0",
                          f"{len(bad)} of {n}", "PASS" if not bad else "FAIL", bad or f"daylight rose in all {n} region-years with an earlier Terra look"))

    need_l2 = ["B4", "B5", "B10", "B11", "B12", "B15"]
    if not l2:
        for b in need_l2:
            rows.append(bench_row(b, "", "", "", None, "BLOCKED", "needs --level2 RAW_DIR"))
    else:
        # B4: do the look times recomputed from raw FIRMS match the drift files, minute for minute?
        mism, exact, within = [], 0, 0
        for r in REGIONS:
            drift = {y["year"]: y for y in json.load(open(os.path.join(REPO, f"data/out/drift/{r}.json")))["years"]}
            for sat in SATS:
                for y in YEARS:
                    rec = l2.get((r, sat, y))
                    med = rec["lst_median_drift"] if rec else None
                    if med is None:
                        mism.append(f"{r} {sat} {y}: no detections"); continue
                    # each region's own formatting chain (Argentina and California were rounded to 3 decimals first)
                    mine = hhmm(round(med, 3)) if r in ("ar-argentina", "us-california") else hhmm_brady(med)
                    want = drift[y][f"{sat}_lst"]
                    dm = abs(hm(mine) - hm(want)) * 60.0
                    exact += mine == want; within += dm <= 1.0 + 1e-9
                    if mine != want:
                        mism.append(f"{r} {sat} {y}: ours {mine} (median {med:.5f} h), file {want}")
        rows.append(bench_row("B4", "Look-time reproduction", "HH:MM match of yearly median local solar time, 252 cells",
                              "exact >= 98%, within 1 min 100%", f"exact {exact}/252 ({100 * exact / 252:.1f}%), within 1 min {within}/252",
                              "PASS" if exact / 252 >= 0.98 and within == 252 else "FAIL", mism or "no mismatches"))

        # B5: are these the same fires the repo counted? Yearly near-nadir totals against the committed daily CSVs
        ref = pd.concat([pd.read_csv(os.path.join(REPO, p)) for p in ("analysis/brazil-data/out/firms_daily_by_biome.csv",
                                                                       "analysis/statistics/out/regions_daily.csv")])
        for p in ("analysis/brazil-data/out/firms_daily_by_biome.csv", "analysis/statistics/out/regions_daily.csv",
                  "analysis/brazil-data/out/biome_lookup_0p1deg.csv"):
            FILES_READ.append({"file": p, "mock": None})
        ref = ref[ref.near_nadir == 1].assign(year=lambda d: d.date.str[:4].astype(int))
        tot = ref.groupby(["biome", "satellite", "year"])["count"].sum()
        mism, n = [], 0
        for r in REGIONS:
            for sat in SATS:
                for y in YEARS:
                    n += 1
                    want = int(tot.get((CSV_KEY[r], CSV_SAT[sat], y), 0))
                    got = l2[(r, sat, y)]["n"] if (r, sat, y) in l2 else 0
                    if want != got:
                        mism.append(f"{r} {sat} {y}: ours {got}, repo {want}")
        rows.append(bench_row("B5", "Count reproduction", "region x satellite x year near-nadir totals equal to the repo's daily CSVs",
                              "100% exact", f"{n - len(mism)}/{n} exact; {sum(v['n'] for v in l2.values()):,} detections in Level 2",
                              "PASS" if not mism else "FAIL", mism or "all region-years match"))

        # B10: Level 1 (one season day, box centre) against Level 2a (every detection), Aqua, baseline years
        gaps, ev = [], []
        for r in REGIONS:
            by = {x["year"]: x for x in l1[r]["years"]}
            for y in BASE:
                rec = l2[(r, "aqua", y)]
                gaps.append((abs(by[y]["_aqua_D0_raw"] - rec["D_median"]["0"]) * 60.0, r, y,
                             (by[y]["_aqua_D0_raw"] - rec["D_median"]["0"]) * 60.0, rec))
        over = [x for x in gaps if x[0] > 30.0]
        for r in REGIONS:
            w = max((x for x in gaps if x[1] == r), key=lambda x: x[0])
            ev.append(f"{r}: max gap {w[3]:+.1f} min ({w[2]}), {sum(x[0] > 30.0 for x in gaps if x[1] == r)} of 9 years over 30 min")
        for _, r, y, g, rec in over:
            # the gap split exactly into its causes by swapping one input at a time:
            #   Level 1 -> same sunset, Level 2's own median look time -> own dates at the box centre -> own latitudes
            by = {x["year"]: x for x in l1[r]["years"]}
            dmed = datetime.date(1970, 1, 1) + datetime.timedelta(days=rec["day_median"])
            c = by[y]["sunset_h"] - rec["lst_median"]
            t_look = (by[y]["_aqua_D0_raw"] - c) * 60.0
            t_date = (c - rec["D0_median_centre"]) * 60.0
            t_lat = (rec["D0_median_centre"] - rec["D_median"]["0"]) * 60.0
            ev.append(f"{r} {y}: gap {g:+.1f} min = look time {t_look:+.1f} + fire dates {t_date:+.1f} (median detection date {dmed.isoformat()} "
                      f"vs season middle {by[y]['mid_date']}; {100 * rec['season_share']:.0f}% of detections in the season months) "
                      f"+ latitude {t_lat:+.1f} (median {rec['lat_median']:.1f} vs box centre {l1[r]['lat']:.1f}); sum {t_look + t_date + t_lat:+.1f}")
        if over:
            ev.append("Cause: Level 1 is one day (season middle) at one latitude (box centre) by its definition; real fires burn on other "
                      "dates and latitudes. Not a code error: B1 to B5 hold and each gap splits fully into date and latitude terms.")
            regs_over = sorted({x[1] for x in over})
            ev.append("Team decision (Nov 14): keep Level 1 as specified; quote the Level 2a median for " + ", ".join(LEVEL2A_HEADLINE)
                      + " (headline.quote = level2a in their JSON).")
            status = "ACCEPTED" if set(regs_over) <= set(LEVEL2A_HEADLINE) else "FAIL"
        rows.append(bench_row("B10", "Level 1 vs Level 2a", "Aqua daylight (0 h latency), Level 1 minus Level 2a median, 54 region-years 2012 to 2020",
                              "every gap <= 30 min; any larger gap explained with numbers",
                              f"max |gap| {max(x[0] for x in gaps):.1f} min; {54 - len(over)} of 54 within 30 min, {len(over)} over",
                              "PASS" if not over else status, ev))

        # B11: the what-if must differ from the actual by exactly the clock shift
        aq = [v for k, v in l2.items() if k[1] == "aqua"]
        err = max(v["cf_identity_max_err_h"] for v in aq)
        ad = sum(v["cf_clamped"][k]["actual_after_dark"] for v in aq for k in ("0", "1.5", "3"))
        wd = sum(v["cf_clamped"][k]["what_if_after_dark"] for v in aq for k in ("0", "1.5", "3"))
        rows.append(bench_row("B11", "Level 2b identity", "max |(D_cf - D) - shift| over unclamped Aqua detections, hours", "<= 1e-9 h",
                              f"{err:.2e} h", "PASS" if err <= 1e-9 else "FAIL",
                              f"{sum(v['n'] for v in aq):,} Aqua detections x 3 latencies; excluded as after dark: actual {ad:,}, what-if {wd:,} detection-latency cases"))

        # B12: the earlier one-day study (Para, 2 Sep 2024): same Aqua median, and its sunset explained
        sim = json.load(open(os.path.join(REPO, "data/out/sim/amazon-2024-09-02.json")))
        FILES_READ.append({"file": "data/out/sim/amazon-2024-09-02.json", "mock": sim.get("mock")})
        w, s, e, n = sim["box"]
        d = pd.read_csv(os.path.join(raw, "Brazil", "modis_2024_Brazil.csv"),
                        usecols=["latitude", "longitude", "acq_date", "acq_time", "satellite", "daynight"])
        d = d[(d.acq_date == sim["day"]) & (d.daynight == "D") & d.longitude.between(w, e) & d.latitude.between(s, n)]
        lst = (d.acq_time // 100 + d.acq_time % 100 / 60 + d.longitude / 15) % 24
        aq_med = round(float(lst[d.satellite == "Aqua"].median()), 2)
        lat0, day = (s + n) / 2.0, datetime.date.fromisoformat(sim["day"])
        doy = day.timetuple().tm_yday
        dec0 = np.radians(23.44) * np.sin(2 * np.pi * (284 + doy) / 365)
        his = 12 + np.degrees(np.arccos((np.sin(np.radians(-0.833)) - np.sin(np.radians(lat0)) * np.sin(dec0))
                                        / (np.cos(np.radians(lat0)) * np.cos(dec0)))) / 15
        mine = float(sunset_lmst(jd0(day), lat0, (w + e) / 2.0))
        dec1, eot1 = solar(jd0(day) + (mine - (w + e) / 2.0 / 15.0) / 24.0)
        H1 = (mine - 12.0 + float(eot1) / 60.0)
        ok = aq_med == sim["passes_lst"]["Aqua"] and round(float(his), 3) == sim["sunset_lst"]
        rows.append(bench_row("B12", "Prior-work cross-check (Para, 2 Sep 2024)", "Aqua median look time and sunset of data/out/sim/amazon-2024-09-02.json",
                              "Aqua median equal at 2 decimals; file's sunset reproduced with its own formula; difference from ours explained",
                              f"Aqua median ours {aq_med} vs file {sim['passes_lst']['Aqua']}; file's formula gives {his:.3f} vs file {sim['sunset_lst']}; "
                              f"ours {mine:.3f} h, diff {(mine - sim['sunset_lst']) * 60:+.2f} min",
                              "PASS" if ok else "FAIL",
                              f"sunset diff {(mine - sim['sunset_lst']) * 60:+.2f} min = equation of time {-float(eot1):+.2f} min (EoT {float(eot1):+.2f} min on that date, absent from the file's formula) "
                              f"+ hour-angle term {(H1 - (his - 12.0)) * 60:+.2f} min (declination {float(dec1):.3f} deg ours vs {np.degrees(dec0):.3f} deg in the file's formula)"))

    # B13: every JSON input to the results carries "mock": false
    inputs = [f for f in FILES_READ if f["file"].startswith(("data/out/drift/", "data/out/calendar/", "data/out/regions.json"))]
    seen = {}
    for f in FILES_READ:
        seen[f["file"]] = f["mock"]
    bad = [f["file"] for f in inputs if f["mock"] is not False]
    rows.append(bench_row("B13", "No mock inputs", "result inputs with \"mock\": false", "13 of 13",
                          f"{len({f['file'] for f in inputs}) - len(set(bad))} of {len({f['file'] for f in inputs})}", "PASS" if not bad and len({f['file'] for f in inputs}) == 13 else "FAIL",
                          {"result_inputs_mock_false": sorted({f["file"] for f in inputs if f["mock"] is False}), "mock_not_false": sorted(set(bad)),
                           "benchmark_reference_files_without_a_mock_field": sorted(k for k, v in seen.items() if v is None),
                           "raw": "112 NASA FIRMS yearly country CSV files in RAW_DIR" if l2 else "not read"}))

    # B14: the six output files parse and carry every required field, with no NaN
    probs = []
    for r in REGIONS:
        try:
            o = json.load(open(os.path.join(json_dir, f"{r}.json")), parse_constant=lambda c: probs.append(f"{r}: {c}"))
        except Exception as ex:
            probs.append(f"{r}: {ex}"); continue
        for k in ("mock", "region", "generated", "script", "method", "sources", "season", "years", "headline"):
            if k not in o: probs.append(f"{r}: missing {k}")
        if o.get("mock") is not False or len(o.get("years", [])) != 14: probs.append(f"{r}: mock or year count")
        for row in o.get("years", []):
            for sat in SATS:
                for k in [f"{sat}_lst"] + [f"{sat}_{suf}" for _, _, suf in LATENCY]:
                    if row.get(k) is None: probs.append(f"{r} {row.get('year')}: {k} null")
                for k in (f"{sat}_D_median", f"{sat}_share_under_2h", f"{sat}_share_after_dark", f"n_{sat}"):
                    if k not in row or (l2 and row[k] is None): probs.append(f"{r} {row.get('year')}: {k}")
            for k in ("sunset_lst", "sunset_h", "mid_date", "aqua_cf_share_under_2h", "aqua_cf_share_after_dark"):
                if k not in row or (row[k] is None and (l2 or not k.startswith("aqua_cf"))): probs.append(f"{r} {row.get('year')}: {k}")
    rows.append(bench_row("B14", "Schema", "problems across the 6 JSON files (parse, required fields, NaN, unexpected nulls)", "0",
                          str(len(probs)), "PASS" if not probs else "FAIL", probs[:20] or "6 files, 14 years each, all required fields present"))

    # B15: run the whole pipeline a second time from scratch; every output byte must match
    if l2:
        h1 = {f: hashlib.sha256(open(os.path.join(json_dir if f.endswith(".json") else aux_dir, f), "rb").read()).hexdigest()
              for f in [f"{r}.json" for r in REGIONS] + [f"{r}.png" for r in REGIONS]}
        with tempfile.TemporaryDirectory() as tmp:
            FILES_READ_before = len(FILES_READ)
            l1b = level1(); l2b = level2(raw, l1b)
            h2 = write_outputs(l1b, l2b, generated, os.path.join(tmp, "json"), os.path.join(tmp, "aux"))
            del FILES_READ[FILES_READ_before:]
        same = sum(h1[k] == h2[k] for k in h1)
        rows.append(bench_row("B15", "Determinism", "outputs with identical SHA-256 across two full runs (same --generated stamp)", "12 of 12",
                              f"{same} of 12", "PASS" if same == 12 else "FAIL", {k: v[:16] for k, v in sorted(h1.items())}))

    # B16: five seeded values recomputed by an independent auditor with separate code
    picks = audit_picks(json_dir)
    if audit_file and os.path.exists(audit_file):
        aud = json.load(open(audit_file))
        got = {(a["region"], a["year"], a["field"]): a["value"] for a in aud["values"]}
        ev, ok = {"seeded": [], "extra_nonzero": []}, {"seeded": 0, "extra_nonzero": 0}
        for grp in ev:
            for p in picks[grp]:
                v = got.get((p["region"], p["year"], p["field"]))
                f = p["field"]
                tol = 0 if f.startswith("n_") else (0.001 if "share" in f else (1.0 if f.endswith("_min") else 1.0 / 60.0))
                good = v is not None and abs(float(v) - float(p["value"])) <= tol + 1e-12
                ok[grp] += good
                ev[grp].append(f"{p['region']} {p['year']} {f}: ours {p['value']}, auditor {v}, tolerance {tol:.4g} -> {'match' if good else 'MISMATCH'}")
        # any further values the auditor was asked for (the headline numbers), checked the same way
        lv = {(r, y, f): v for r, y, f, v in leaves(json_dir)}
        done = {(p["region"], p["year"], p["field"]) for g in picks.values() for p in g}
        ev["requested_headline"], n_req, ok_req = [], 0, 0
        for key, v in got.items():
            if key in done or key not in lv:
                continue
            f = key[2]
            tol = 0 if f.startswith("n_") else (0.001 if "share" in f else (1.0 if f.endswith("_min") else 1.0 / 60.0))
            good = v is not None and abs(float(v) - float(lv[key])) <= tol + 1e-12
            n_req += 1; ok_req += good
            ev["requested_headline"].append(f"{key[0]} {key[1]} {f}: ours {lv[key]}, auditor {v}, tolerance {tol:.4g} -> {'match' if good else 'MISMATCH'}")
        rows.append(bench_row("B16", "Independent audit", "5 seeded values (seed 20261114) recomputed from raw inputs by separate code; plus 5 non-zero values drawn the same way and the headline values",
                              "5 of 5 seeded, and every extra value (times within 1 min, shares within 0.001, counts exact)",
                              f"{ok['seeded']} of 5 seeded, {ok['extra_nonzero']} of 5 extra non-zero, {ok_req} of {n_req} headline values",
                              "PASS" if ok["seeded"] == 5 and ok["extra_nonzero"] == 5 and ok_req == n_req else "FAIL",
                              {"auditor": aud.get("auditor"), "auditor_notes": aud.get("notes"), "checks": ev}))
    else:
        rows.append(bench_row("B16", "Independent audit", "5 seeded values recomputed from raw inputs by separate code", "5 of 5", None, "BLOCKED",
                              {"reason": "no audit file passed with --audit", "picks": picks}))
    rows.sort(key=lambda r: int(r["id"][1:]))
    return rows


def hhmm_brady(x):
    """The HH:MM rule used by the Brazil and Punjab drift scripts."""
    h = int(x); m = int(round((x - h) * 60))
    if m == 60: h, m = h + 1, 0
    return f"{h:02d}:{m:02d}"


# ------------------------------------------------------------------ run
def main():
    ap = argparse.ArgumentParser(description="Daylight left after the alert")
    ap.add_argument("--level2", metavar="RAW_DIR", help="folder with the FIRMS yearly country files")
    ap.add_argument("--bench", action="store_true", help="run the benchmarks and write out/benchmarks.json")
    ap.add_argument("--audit", metavar="FILE", help="auditor's values for benchmark B16")
    ap.add_argument("--audit-picks", action="store_true", help="print the 5 seeded values to audit and exit")
    ap.add_argument("--generated", help="ISO time written into the JSON (default: now, UTC)")
    ap.add_argument("--json-dir", default=os.path.join(REPO, "data/out/daylight"))
    ap.add_argument("--aux-dir", default=os.path.join(REPO, "analysis/daylight/out"))
    a = ap.parse_args()
    if a.audit_picks:
        print(json.dumps(audit_picks(a.json_dir), indent=1)); return
    generated = a.generated or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    l1 = level1()
    l2 = level2(a.level2, l1) if a.level2 else None
    write_outputs(l1, l2, generated, a.json_dir, a.aux_dir)
    for rid in REGIONS:
        R, h = l1[rid], l1[rid]["headline"]
        print(f"{rid:18} season {'-'.join(MONTHS[m - 1] for m in R['season'])}  lat {R['lat']:+.2f}  "
              f"Aqua D(1.5 h): {h['aqua_D15_2012_2020_mean_h']:.2f} h (2012-2020) -> {h['aqua_D15_2025_h']:.2f} h (2025), "
              f"{h['aqua_daylight_change_min']:+.0f} min")
    if a.bench:
        rows = benchmarks(l1, l2, a.level2, a.json_dir, a.aux_dir, generated, a.audit)
        with open(os.path.join(a.aux_dir, "benchmarks.json"), "w") as f:
            json.dump({"generated": generated, "script": "analysis/daylight/daylight.py", "benchmarks": rows}, f, indent=1, ensure_ascii=False)
        print()
        for r in rows:
            print(f"{r['id']:4} {r['status']:8} {r['name']}: {r['value']}")


if __name__ == "__main__":
    main()
