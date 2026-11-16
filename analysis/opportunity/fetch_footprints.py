"""Fetch daytime granule footprint polygons from NASA CMR (public, no login).

Output: one compact CSV per sensor in CACHE_DIR (outside repo by default):
  time_start, day_night_flag, polygon (CMR 'lat lon lat lon ...' string)
"""
import csv, os, sys, time, requests

CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
CACHE_DIR = os.environ.get("OPP_CACHE", "/private/tmp/opportunity_cache")
BBOX = "-74.5,-18.5,-43.5,5.5"  # covers the Brazilian Amazon biome
SENSORS = {"aqua": ("MYD03", "6.1"), "terra": ("MOD03", "6.1"), "viirs": ("VNP03IMG", "2")}
YEARS = [2016, 2018, 2020, 2023, 2024, 2025]
MONTHS = [7, 8, 9, 10]
MDAYS = {7: 31, 8: 31, 9: 30, 10: 31}


def fetch(short, ver, t0, t1):
    out, after = [], None
    while True:
        h = {"CMR-Search-After": after} if after else {}
        r = requests.get(CMR, params=dict(short_name=short, version=ver, bounding_box=BBOX,
                                          temporal=f"{t0},{t1}", page_size=2000), headers=h, timeout=120)
        r.raise_for_status()
        e = r.json()["feed"]["entry"]
        out += e
        after = r.headers.get("CMR-Search-After")
        if not e or not after or len(e) < 2000:
            return out


def main():
    os.makedirs(CACHE_DIR, exist_ok=True)
    for sat, (short, ver) in SENSORS.items():
        path = os.path.join(CACHE_DIR, f"{sat}.csv")
        if os.path.exists(path):
            continue
        rows = []
        for y in YEARS:
            for m in MONTHS:
                e = fetch(short, ver, f"{y}-{m:02d}-01T00:00:00Z", f"{y}-{m:02d}-{MDAYS[m]}T23:59:59Z")
                for g in e:
                    if g.get("polygons"):
                        rows.append((g["time_start"], g["day_night_flag"], g["polygons"][0][0]))
                print(sat, y, m, len(e), file=sys.stderr)
                time.sleep(0.2)
        with open(path, "w", newline="") as f:
            w = csv.writer(f); w.writerow(["time_start", "day_night_flag", "polygon"]); w.writerows(rows)


if __name__ == "__main__":
    main()
