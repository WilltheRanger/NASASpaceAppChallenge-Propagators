"""Download data the yearly country archive does not have.

The yearly country archive (pipeline.download) stops at the last complete
year and only has MODIS + VIIRS S-NPP. This script fills the gaps:

  keyless  (default, no account): FIRMS global "last 7 days" NRT CSVs for MODIS,
           VIIRS S-NPP, NOAA-20 and NOAA-21. Saved untouched; clipped to the
           region in pipeline.clean.

  api      (needs a free FIRMS MAP_KEY in env var FIRMS_MAP_KEY): area API over
           the region's bounding box, in 5-day windows, for any date range.
           For each sensor uses standard (SP) data where available and NRT
           after that (checked with /api/data_availability). This is how to get
           2026-to-date and the NOAA-20 / NOAA-21 standard archive.
           Get a key: https://firms.modaps.eosdis.nasa.gov/api/map_key/

Usage:
    python -m pipeline.download_recent --mode keyless
    FIRMS_MAP_KEY=... python -m pipeline.download_recent --mode api --country Greece \
        --start 2026-01-01 --end 2026-11-15
    FIRMS_MAP_KEY=... python -m pipeline.download_recent --mode api --country Greece \
        --start 2018-04-01 --end 2025-12-31 --sensors viirs-noaa20
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import requests

from pipeline.regions import region_geometry

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
MANIFEST = ROOT / "data" / "metadata" / "download_manifest.json"
FIRMS = "https://firms.modaps.eosdis.nasa.gov"

KEYLESS_FEEDS = {
    "modis": "/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_7d.csv",
    "viirs-snpp": "/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_7d.csv",
    "viirs-noaa20": "/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_7d.csv",
    "viirs-noaa21": "/data/active_fire/noaa-21-viirs-c2/csv/J2_VIIRS_C2_Global_7d.csv",
}

# product key -> (standard source, NRT source) in the FIRMS area API
API_SOURCES = {
    "modis": ("MODIS_SP", "MODIS_NRT"),
    "viirs-snpp": ("VIIRS_SNPP_SP", "VIIRS_SNPP_NRT"),
    "viirs-noaa20": ("VIIRS_NOAA20_SP", "VIIRS_NOAA20_NRT"),
    "viirs-noaa21": ("VIIRS_NOAA21_SP", "VIIRS_NOAA21_NRT"),
}
WINDOW_DAYS = 5  # API maximum


def _sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _manifest() -> dict:
    return json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"files": {}}


def _save_manifest(m: dict) -> None:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(m, indent=2, sort_keys=True))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# --------------------------------------------------------------------- keyless
def keyless(products: list[str]) -> None:
    m = _manifest()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%MZ")
    for p in products:
        url = FIRMS + KEYLESS_FEEDS[p]
        r = requests.get(url, timeout=300)
        rel = Path("firms_nrt_global7d") / p / f"{stamp}_{Path(url).name}"
        entry = {"product": p, "kind": "nrt_global_7d", "country": "GLOBAL", "url": url,
                 "http_status": r.status_code, "downloaded_at_utc": _now()}
        if r.ok:
            dest = RAW / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(r.content)
            rows = r.content.count(b"\n") - 1
            entry.update(path=f"data/raw/{rel}", bytes=len(r.content), sha256=_sha256(r.content), rows=rows)
            if rows <= 0:
                entry["note"] = "feed is empty (header only)"
            print(f"ok  {rows:>8,d} rows  {rel}" + ("  <- EMPTY" if rows <= 0 else ""))
        else:
            print(f"{r.status_code}  {url}")
        m["files"][str(rel)] = entry
    _save_manifest(m)


# ------------------------------------------------------------------------- api
def _availability(key: str) -> dict[str, tuple[date, date]]:
    r = requests.get(f"{FIRMS}/api/data_availability/csv/{key}/ALL", timeout=60)
    r.raise_for_status()
    df = pd.read_csv(io.StringIO(r.text))
    return {row.data_id: (date.fromisoformat(str(row.min_date)), date.fromisoformat(str(row.max_date)))
            for row in df.itertuples()}


def _plan(product: str, start: date, end: date, avail: dict) -> list[tuple[str, date, date]]:
    """Split [start, end] into (source, from, to): SP where it exists, NRT after."""
    sp, nrt = API_SOURCES[product]
    out = []
    cur = start
    if sp in avail:
        lo, hi = avail[sp]
        if cur < lo:
            cur = lo
        if cur <= min(hi, end):
            out.append((sp, cur, min(hi, end)))
            cur = min(hi, end) + timedelta(days=1)
    if nrt in avail and cur <= end:
        lo, hi = avail[nrt]
        a, b = max(cur, lo), min(end, hi)
        if a <= b:
            out.append((nrt, a, b))
    return out


def api(country: str, products: list[str], start: date, end: date, force: bool) -> None:
    key = os.environ.get("FIRMS_MAP_KEY")
    if not key:
        raise SystemExit("Set FIRMS_MAP_KEY (free: https://firms.modaps.eosdis.nasa.gov/api/map_key/)")
    _, (w, s, e, n) = region_geometry(country)
    bbox = f"{w:g},{s:g},{e:g},{n:g}"
    avail = _availability(key)
    m = _manifest()
    session = requests.Session()
    for p in products:
        for source, a, b in _plan(p, start, end, avail):
            print(f"{p}: {source} {a} -> {b}")
            d = a
            while d <= b:
                days = min(WINDOW_DAYS, (b - d).days + 1)
                rel = Path("firms_api") / source / country / f"{d.isoformat()}_{days}d.csv"
                dest = RAW / rel
                if dest.exists() and not force:
                    d += timedelta(days=days)
                    continue
                public_url = f"{FIRMS}/api/area/csv/<MAP_KEY>/{source}/{bbox}/{days}/{d.isoformat()}"
                for attempt in range(5):
                    r = session.get(public_url.replace("<MAP_KEY>", key), timeout=180)
                    if r.status_code == 429 or "Exceeding allowed transaction" in r.text[:200]:
                        time.sleep(60 * (attempt + 1))
                        continue
                    break
                entry = {"product": p, "kind": "api_area", "api_source": source, "country": country,
                         "bbox": bbox, "url": public_url, "http_status": r.status_code,
                         "downloaded_at_utc": _now(), "window_start": d.isoformat(), "window_days": days}
                if r.ok and r.text.startswith("latitude"):
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(r.content)
                    entry.update(path=f"data/raw/{rel}", bytes=len(r.content), sha256=_sha256(r.content),
                                 rows=r.text.count("\n") - 1)
                else:
                    entry["note"] = r.text[:200]
                    print(f"  ! {d} {r.status_code} {r.text[:120]!r}")
                m["files"][str(rel)] = entry
                d += timedelta(days=days)
            _save_manifest(m)
    _save_manifest(m)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--mode", choices=["keyless", "api"], default="keyless")
    ap.add_argument("--country", default="Greece")
    ap.add_argument("--sensors", nargs="+", default=list(KEYLESS_FEEDS), choices=list(KEYLESS_FEEDS))
    today = datetime.now(timezone.utc).date()
    ap.add_argument("--start", type=date.fromisoformat, default=date(today.year, 1, 1))
    ap.add_argument("--end", type=date.fromisoformat, default=today)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args(argv)
    if a.mode == "keyless":
        keyless(a.sensors)
    else:
        api(a.country, a.sensors, a.start, a.end, a.force)
    return 0


if __name__ == "__main__":
    sys.exit(main())
