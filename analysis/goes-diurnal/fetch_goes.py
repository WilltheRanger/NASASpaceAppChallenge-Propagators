"""Extract GOES-East ABI fire pixels over Brazil from NOAA's public AWS archive (no key).

Product: ABI-L2-FDCF (Fire/Hot Spot Characterization, full disk, 10-minute). GOES-16 was GOES-East until April 2025,
GOES-19 after. Each file is read, the fire pixels inside the Brazil box are kept, and the file is discarded.

Kept: mask codes 10, 11, 30, 31 (processed and saturated fire pixels, and their temporally filtered versions), the
categories NOAA recommends for users concerned with false alarms. Codes 13/33 (high-probability fire) are kept
separately for a sensitivity check.

Usage: python3 analysis/goes-diurnal/fetch_goes.py OUT_DIR [--years 2023 2024 2025] [--every 4] [--cadence 20]
Writes OUT_DIR/goes_fires_<year>.csv.gz: utc, lat, lon, mask, power_mw, sat. Resumable (one done-marker per scan).
"""
import argparse
import io
import os
import re
import sys
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import h5py
import numpy as np
import pandas as pd
import requests

KEEP = {10, 11, 30, 31, 13, 33}
COLS = ["utc", "lat", "lon", "mask", "power_mw", "sat"]
BOX = (-74.5, -34.0, -34.0, 5.5)  # Brazil: west, south, east, north
NS = "{http://s3.amazonaws.com/doc/2006-03-01/}"


def bucket_for(d):
    return "noaa-goes19" if d >= date(2025, 4, 7) else "noaa-goes16"


def list_keys(bucket, prefix):
    r = requests.get(f"https://{bucket}.s3.amazonaws.com/", params={"list-type": "2", "prefix": prefix}, timeout=60)
    r.raise_for_status()
    root = ET.fromstring(r.content)
    return [k.text for k in root.iter(NS + "Key")]


def latlon(x, y, proj):
    req, rpol, H, lon0 = proj
    Hs = H + req
    a = np.sin(x) ** 2 + np.cos(x) ** 2 * (np.cos(y) ** 2 + (req ** 2 / rpol ** 2) * np.sin(y) ** 2)
    b = -2 * Hs * np.cos(x) * np.cos(y)
    c = Hs ** 2 - req ** 2
    rs = (-b - np.sqrt(b ** 2 - 4 * a * c)) / (2 * a)
    sx, sy, sz = rs * np.cos(x) * np.cos(y), -rs * np.sin(x), rs * np.cos(x) * np.sin(y)
    lat = np.degrees(np.arctan((req ** 2 / rpol ** 2) * sz / np.sqrt((Hs - sx) ** 2 + sy ** 2)))
    lon = lon0 - np.degrees(np.arctan(sy / (Hs - sx)))
    return lat, lon


def extract(bucket, key):
    r = requests.get(f"https://{bucket}.s3.amazonaws.com/{key}", timeout=120)
    r.raise_for_status()
    with h5py.File(io.BytesIO(r.content), "r") as f:
        m = f["Mask"][:]
        iy, ix = np.nonzero(np.isin(m, list(KEEP)))
        if len(iy) == 0:
            return pd.DataFrame(columns=COLS)
        xs, ys = f["x"], f["y"]
        x = xs[:][ix] * xs.attrs["scale_factor"][0] + xs.attrs["add_offset"][0]
        y = ys[:][iy] * ys.attrs["scale_factor"][0] + ys.attrs["add_offset"][0]
        p = f["goes_imager_projection"].attrs
        proj = (p["semi_major_axis"][0], p["semi_minor_axis"][0], p["perspective_point_height"][0],
                p["longitude_of_projection_origin"][0])
        pw = f["Power"][:][iy, ix].astype(float)
        pa = f["Power"].attrs
        if "scale_factor" in pa:
            pw = pw * pa["scale_factor"][0] + pa.get("add_offset", [0])[0]
    lat, lon = latlon(x, y, proj)
    s = re.search(r"_s(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})", key).groups()
    t0 = pd.Timestamp(f"{s[0]}-01-01") + pd.Timedelta(days=int(s[1]) - 1, hours=int(s[2]), minutes=int(s[3]), seconds=int(s[4]))
    d = pd.DataFrame({"utc": t0 + pd.Timedelta(minutes=5), "lat": lat, "lon": lon, "mask": m[iy, ix], "power_mw": pw,
                      "sat": "G19" if "G19" in key else "G16"})
    w, so, e, n = BOX
    return d[(d.lon >= w) & (d.lon <= e) & (d.lat >= so) & (d.lat <= n)]


def scans_for_day(d, cadence):
    """Keys for scans between 11:20 and 21:00 UTC (local solar 08:30-16:00 across Brazil), one per `cadence` minutes."""
    bucket = bucket_for(d)
    doy = d.timetuple().tm_yday
    out = []
    for hh in range(11, 21):
        keys = sorted(list_keys(bucket, f"ABI-L2-FDCF/{d.year}/{doy:03d}/{hh:02d}/"))
        for k in keys:
            mm = int(re.search(r"_s\d{9}(\d{2})", k).group(1))
            if (hh * 60 + mm) < 11 * 60 + 20 or mm % cadence >= 10:
                continue
            out.append((bucket, k))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--years", nargs="+", type=int, default=[2023, 2024, 2025])
    ap.add_argument("--months", nargs="+", type=int, default=[7, 8, 9, 10])
    ap.add_argument("--every", type=int, default=4, help="use every Nth day")
    ap.add_argument("--cadence", type=int, default=20, help="minutes between scans used")
    a = ap.parse_args()
    os.makedirs(os.path.join(a.out, "parts"), exist_ok=True)
    for year in a.years:
        days = [date(year, m, 1) + timedelta(days=i) for m in a.months for i in range(31)]
        days = sorted({x for x in days if x.month in a.months and x.year == year})[:: a.every]
        jobs = []
        with ThreadPoolExecutor(8) as ex:
            for lst in ex.map(lambda d: scans_for_day(d, a.cadence), days):
                jobs += lst
        todo = [j for j in jobs if not os.path.exists(os.path.join(a.out, "parts", os.path.basename(j[1]) + ".csv.gz"))]
        print(f"{year}: {len(days)} days, {len(jobs)} scans, {len(todo)} to fetch", flush=True)

        def work(j):
            dest = os.path.join(a.out, "parts", os.path.basename(j[1]) + ".csv.gz")
            for attempt in range(3):
                try:
                    extract(*j).to_csv(dest, index=False)
                    return 1
                except Exception as e:  # noqa: BLE001
                    err = e
            print("FAIL", j[1], err, flush=True)
            return 0

        with ThreadPoolExecutor(8) as ex:
            done = sum(ex.map(work, todo))
        print(f"{year}: fetched {done}/{len(todo)}", flush=True)
        parts = [os.path.join(a.out, "parts", os.path.basename(j[1]) + ".csv.gz") for j in jobs]
        def read(p):
            try:
                return pd.read_csv(p)
            except pd.errors.EmptyDataError:  # scan with no fires in the box
                return pd.DataFrame(columns=COLS)
        frames = [read(p) for p in parts if os.path.exists(p)]
        pd.concat(frames).to_csv(os.path.join(a.out, f"goes_fires_{year}.csv.gz"), index=False)
        print(f"{year}: {sum(len(f) for f in frames):,} fire pixels in the Brazil box", flush=True)


if __name__ == "__main__":
    sys.exit(main())
