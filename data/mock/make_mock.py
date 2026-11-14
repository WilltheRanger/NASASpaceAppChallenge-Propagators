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
print("wrote mock files to", HERE)
