"""Generate MOCK data files that follow the data contract in research/execution-plan.md (section 3).

Every number here is SYNTHETIC. It exists only so the app can be built before the real pipeline
delivers data/out/. Every file carries "mock": true; the UI must show a visible MOCK badge.
Run: python3 data/mock/make_mock.py   (writes next to this script; deterministic seed)
"""
import json
import math
import os
import random

random.seed(42)
HERE = os.path.dirname(os.path.abspath(__file__))
NOTE = "SYNTHETIC MOCK DATA for UI development only. Not real fire counts."

# id, name, kind, bbox [w, s, e, n], peak months (1-12), typical monthly fixed-clock count at peak
REGIONS = [
    ("br-amazon", "Amazon (Brazil)", "biome", [-74.0, -16.7, -43.0, 5.3], [8, 9], 18000, True),
    ("br-cerrado", "Cerrado (Brazil)", "biome", [-60.5, -24.7, -41.3, -2.3], [8, 9], 12000, False),
    ("br-pantanal", "Pantanal (Brazil)", "biome", [-59.2, -22.2, -54.9, -15.1], [8, 9, 10], 2500, False),
    ("ar-argentina", "Argentina", "country", [-73.6, -55.1, -53.6, -21.8], [1, 8, 9], 3000, False),
    ("in-punjab-haryana", "Punjab + Haryana (India)", "preset", [73.8, 27.6, 77.6, 32.6], [4, 5, 10, 11], 4000, False),
    ("us-california", "California (USA)", "state", [-124.5, 32.5, -114.1, 42.0], [7, 8, 9], 900, False),
]


def write(rel, obj):
    path = os.path.join(HERE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=1)


def seasonal(month, peaks):
    # smooth bump around each peak month, small background otherwise
    v = 0.05
    for p in peaks:
        d = min(abs(month - p), 12 - abs(month - p))
        v += math.exp(-(d ** 2) / 1.5)
    return v


def hhmm(x):
    h = int(x)
    m = int(round((x - h) * 60))
    if m == 60:
        h, m = h + 1, 0
    return f"{h:02d}:{m:02d}"


write("regions.json", {"mock": True, "note": NOTE, "regions": [
    {"id": i, "name": n, "kind": k, "bbox": b, "featured": f} for i, n, k, b, _, _, f in REGIONS]})

for rid, name, kind, bbox, peaks, scale, featured in REGIONS:
    year_factor = {y: random.uniform(0.6, 1.5) for y in range(2002, 2027)}
    months = []
    for y in range(2002, 2027):
        for mth in range(1, 13):
            if y == 2026 and mth > 10:
                break
            base = scale * seasonal(mth, peaks) * year_factor[y] * random.uniform(0.85, 1.15)
            fixed = round(base)
            months.append({
                "ym": f"{y}-{mth:02d}",
                "fixed": fixed,
                "lo": round(fixed * 0.9),
                "hi": round(fixed * 1.1),
                "aqua": round(fixed * random.uniform(0.85, 1.25)) if y >= 2003 else None,
                "snpp": round(fixed * 3.3 * random.uniform(0.9, 1.1)) if y >= 2012 else None,
                "noaa20": round(fixed * 3.4 * random.uniform(0.9, 1.1)) if y >= 2018 else None,
                "flags": (["provisional"] if y == 2026 else []) + (["outage"] if (y, mth) in ((2022, 7), (2022, 8)) else []),
            })
    # median of the same calendar month across 2002-2025, and anomaly vs it
    for mth in range(1, 13):
        vals = sorted(m["fixed"] for m in months if m["ym"].endswith(f"-{mth:02d}") and int(m["ym"][:4]) <= 2025)
        med = vals[len(vals) // 2]
        for m in months:
            if m["ym"].endswith(f"-{mth:02d}"):
                m["median_ref"] = med
                m["anomaly_pct"] = round(100 * (m["fixed"] - med) / med, 1) if med else None
    write(f"calendar/{rid}.json", {"mock": True, "note": NOTE, "region": rid,
                                   "unit": "fixed-clock Aqua-equivalent hotspots", "months": months})

    # audit: L drifts away from 1 after 2021; California has too few fires in one year (shows the empty state)
    drift_effect = {"br-amazon": 0.06, "br-cerrado": 0.08, "br-pantanal": 0.05, "ar-argentina": 0.04,
                    "in-punjab-haryana": 0.15, "us-california": -0.03}[rid]
    years = []
    for i, y in enumerate(range(2021, 2026)):
        L = 1 + drift_effect * i + random.uniform(-0.03, 0.03)
        aqua = round(sum(m["aqua"] or 0 for m in months if m["ym"].startswith(str(y))))
        fixed_count = round(aqua / L)
        ok = not (rid == "us-california" and y == 2023)
        years.append({"year": y, "status": "ok" if ok else "insufficient_data",
                      "L": round(L, 3) if ok else None, "L_lo": round(L - 0.06, 3) if ok else None,
                      "L_hi": round(L + 0.06, 3) if ok else None,
                      "L_strat": round(L - drift_effect * 0.2, 3) if ok else None,
                      "aqua_count": aqua, "fixed_count": fixed_count if ok else None,
                      "gap_pct": round(100 * (L - 1), 1) if ok else None})
    write(f"audit/{rid}.json", {"mock": True, "note": NOTE, "region": rid,
                                "baseline": {"years": "2012-2020", "ratio": round(random.uniform(0.25, 0.35), 3),
                                             "noise_floor": 0.05},
                                "years": years})

    # drift: local solar time of the overpass, flat until 2021 then Aqua later / Terra earlier
    drift_years = []
    for y in range(2012, 2027):
        t = max(0, y - 2021)
        drift_years.append({"year": y, "aqua_lst": hhmm(13.2 + 0.03 * t * t + 0.05 * t),
                            "terra_lst": hhmm(10.9 - 0.025 * t * t - 0.05 * t), "viirs_lst": hhmm(13.3)})
    write(f"drift/{rid}.json", {"mock": True, "note": NOTE, "region": rid, "years": drift_years})

classes = ["10-100 acres", "100-1000 acres", ">1000 acres"]
proof_years = []
for y in range(2012, 2025):
    t = max(0, y - 2021)
    for c, base in zip(classes, (0.25, 0.55, 0.85)):
        proof_years.append({"year": y, "size_class": c,
                            "aqua_pod": round(base * (1 + 0.04 * t) + random.uniform(-0.02, 0.02), 3),
                            "viirs_pod": round(min(0.98, base * 1.4) + random.uniform(-0.02, 0.02), 3),
                            "n": random.randint(40, 400)})
write("proof_california.json", {"mock": True, "note": NOTE, "size_classes": classes, "years": proof_years})

# validation checklist shown in the app ("How do we know?"): the FINAL PLAN's pre-registered predictions P1-P10
write("checks.json", {"mock": True, "note": NOTE, "checks": [
    {"id": "P1", "name": "Aqua's look time over each Brazilian biome rises every year 2021-2025; VIIRS stays flat", "status": "pending", "detail": ""},
    {"id": "P2", "name": "Punjab Aqua look time follows Jethva 2026 (1:44 PM in 2021 to 3:12 PM in 2025)", "status": "pending", "detail": ""},
    {"id": "P3", "name": "Our FIRMS Aqua data reproduces INPE's reference counts", "status": "pending", "detail": ""},
    {"id": "P4", "name": "Day-to-day sampling noise explains the pre-drift wobble", "status": "pending", "detail": ""},
    {"id": "P5", "name": "Fire-size mix doesn't explain the audit", "status": "pending", "detail": ""},
    {"id": "P6", "name": "VIIRS is a stable clock", "status": "pending", "detail": ""},
    {"id": "P7", "name": "Closure: the timing slope predicts the observed L", "status": "pending", "detail": ""},
    {"id": "P8", "name": "VIIRS detects small real fires better than MODIS", "status": "pending", "detail": ""},
    {"id": "P9", "name": "Opposite drifts move the Terra and Aqua probes in opposite directions", "status": "pending", "detail": ""},
    {"id": "P10", "name": "The two-clock difference agrees with the audit", "status": "pending", "detail": ""},
]})

# --- files added for the FINAL PLAN v1.1 (separate RNG so earlier files stay byte-identical) ---
r2 = random.Random(99)

# two clocks: Terra (drifting earlier) and Aqua (drifting later) probes vs VIIRS, their difference, and a sampling estimate
for rid, *_ in REGIONS:
    yrs = []
    for y in range(2012, 2026):
        t = max(0, y - 2021)
        a = math.exp(0.05 * t + r2.uniform(-0.03, 0.03))
        tt = math.exp(-0.04 * t + r2.uniform(-0.03, 0.03))
        la, lt = math.log(a), math.log(tt)
        yrs.append({"year": y, "aqua_lst": hhmm(13.2 + 0.03 * t * t + 0.05 * t), "terra_lst": hhmm(10.9 - 0.025 * t * t - 0.05 * t),
                    "A": round(a, 3), "A_lo": round(a * 0.95, 3), "A_hi": round(a * 1.05, 3),
                    "T": round(tt, 3), "T_lo": round(tt * 0.95, 3), "T_hi": round(tt * 1.05, 3),
                    "clock_diff": round(la - lt, 3), "clock_lo": round(la - lt - 0.07, 3), "clock_hi": round(la - lt + 0.07, 3),
                    "sampling_est": round((la + lt) / 2, 3)})
    write(f"twoclocks/{rid}.json", {"mock": True, "note": NOTE, "region": rid,
                                    "fields": "A, T = Aqua/VIIRS and Terra/VIIRS ratios vs 2012-2020 (1 = no change); clock_diff = log A - log T; sampling_est = shared orbit-sampling effect (log units)",
                                    "years": yrs})

# California detection limits (same structure the real pipeline analysis/detection-limits/spec_sheet.py writes)
def rates(scale):
    out = []
    for name, base in (("10-100 acres", 0.05), ("100-1000 acres", 0.25), (">1000 acres", 0.7)):
        n = r2.randint(30, 900)
        rate = min(0.98, base * scale)
        out.append({"size_class": name, "n": n, "detected": round(n * rate), "rate": round(rate, 3),
                    "ci95": [round(max(0, rate - 0.05), 3), round(min(1, rate + 0.05), 3)]})
    return out
write("detection_limits_california.json", {"mock": True, "note": NOTE, "source": "MOCK", "rule": "MOCK",
    "years_with_data": list(range(2012, 2025)), "satellites": {
        "Aqua": {"n_fires_2012_2020": 2100, "rates_2012_2020": rates(1.0), "a50_acres": 900.0, "a50_ci95": [600.0, 1500.0], "a90_acres": 9000.0, "a90_ci95": [5000.0, 20000.0]},
        "Terra": {"n_fires_2012_2020": 2100, "rates_2012_2020": rates(0.9), "a50_acres": 1100.0, "a50_ci95": [700.0, 1800.0], "a90_acres": 11000.0, "a90_ci95": [6000.0, 25000.0]},
        "S-NPP": {"n_fires_2012_2020": 2100, "rates_2012_2020": rates(1.8), "a50_acres": 250.0, "a50_ci95": [150.0, 400.0], "a90_acres": 3000.0, "a90_ci95": [1500.0, 6000.0]}}})

# local "seen vs missed" map around Chino Hills (synthetic points and names)
fires = []
for i in range(40):
    ang, dist = r2.uniform(0, 2 * math.pi), r2.uniform(0, 25)
    lat = 33.9898 + (dist / 111.0) * math.sin(ang)
    lon = -117.7326 + (dist / (111.0 * math.cos(math.radians(34)))) * math.cos(ang)
    acres = round(10 ** r2.uniform(0, 4), 1)
    fires.append({"year": r2.randint(2012, 2024), "name": f"MOCK FIRE {i + 1}", "acres": acres, "lat": round(lat, 5), "lon": round(lon, 5),
                  "aqua": r2.random() < min(0.9, acres / 3000), "terra": r2.random() < min(0.9, acres / 3500), "viirs": r2.random() < min(0.95, acres / 600)})
write("socal_seen_missed.json", {"mock": True, "note": NOTE, "center": {"lat": 33.9898, "lon": -117.7326}, "radius_km": 25, "fires": fires})
print("wrote mock files to", HERE)
