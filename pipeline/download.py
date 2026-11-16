"""Download raw NASA FIRMS yearly-per-country CSVs.

Raw files are written untouched to data/raw/firms/<product>/<year>/ and every
attempt (including 404s) is logged to data/metadata/download_manifest.json with
URL, size, SHA-256 and UTC download time, so the processed data can always be
traced back to an official source.

Usage:
    python -m pipeline.download --country Greece --start 2001 --end 2026
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

from pipeline.schema import FIRMS_COUNTRY_BASE, PRODUCTS

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw" / "firms"
MANIFEST = ROOT / "data" / "metadata" / "download_manifest.json"


def file_url(product: str, year: int, country: str) -> str:
    name = PRODUCTS[product].get("archive_name", product)
    return f"{FIRMS_COUNTRY_BASE}/{name}/{year}/{name}_{year}_{country}.csv"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {"files": {}}


def download(country: str, start: int, end: int, products: list[str], force: bool) -> dict:
    manifest = load_manifest()
    session = requests.Session()
    session.headers["User-Agent"] = "spaceapps-firms-pipeline/0.1"

    for product in products:
        meta = PRODUCTS[product]
        for year in range(max(start, meta["first_year"]), end + 1):
            url = file_url(product, year, country)
            rel = Path(product) / str(year) / f"{product}_{year}_{country}.csv"
            dest = RAW_DIR / rel
            key = str(rel)

            if dest.exists() and not force:
                print(f"skip (exists)  {key}")
                continue

            resp = session.get(url, stream=True, timeout=120)
            entry = {
                "kind": "country_archive",
                "product": product,
                "year": year,
                "country": country,
                "url": url,
                "http_status": resp.status_code,
                "downloaded_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            }
            if resp.status_code == 200:
                dest.parent.mkdir(parents=True, exist_ok=True)
                tmp = dest.with_suffix(".part")
                with tmp.open("wb") as f:
                    for chunk in resp.iter_content(1 << 20):
                        f.write(chunk)
                tmp.rename(dest)
                entry.update(path=f"data/raw/firms/{key}", bytes=dest.stat().st_size, sha256=sha256(dest))
                print(f"ok   {entry['bytes']:>12,d} B  {key}")
            else:
                entry["note"] = "not available in FIRMS country archive"
                print(f"{resp.status_code}  unavailable  {key}")
            manifest["files"][key] = entry

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    manifest["source"] = "NASA FIRMS yearly country archive, " + FIRMS_COUNTRY_BASE
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True))
    return manifest


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--country", default="Greece", help="FIRMS country file name, e.g. Greece, Australia, United_States")
    ap.add_argument("--start", type=int, default=2001)
    ap.add_argument("--end", type=int, default=datetime.now(timezone.utc).year)
    archived = [k for k, v in PRODUCTS.items() if v["in_country_archive"]]
    ap.add_argument("--products", nargs="+", default=archived, choices=archived)
    ap.add_argument("--force", action="store_true", help="re-download files that already exist")
    args = ap.parse_args(argv)
    download(args.country, args.start, args.end, args.products, args.force)
    return 0


if __name__ == "__main__":
    sys.exit(main())
