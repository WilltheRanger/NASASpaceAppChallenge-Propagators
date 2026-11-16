"""Region geometry for clipping global / bbox FIRMS data to a country.

FIRMS' yearly country files use FIRMS' own (unpublished) boundaries and include
offshore detections (e.g. gas flares, hotspot type 3). To clip NRT/API data in
a comparable way we use Natural Earth 1:50m admin-0 polygons and:

  region = buffer(country, SEA_BUFFER_DEG) - union(other countries)

i.e. extend into the sea (to keep near-shore/offshore detections) but never
into a neighbouring country. Calibrated against the Greece archive: see
`coverage_of_archive()`.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np
import requests
import shapely
from shapely.geometry import shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
NE_URL = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
          "geojson/ne_50m_admin_0_countries.geojson")
NE_PATH = ROOT / "data" / "raw" / "boundaries" / "ne_50m_admin_0_countries.geojson"
SEA_BUFFER_DEG = 0.25  # ~25 km


def _ensure_boundaries() -> Path:
    if not NE_PATH.exists():
        NE_PATH.parent.mkdir(parents=True, exist_ok=True)
        r = requests.get(NE_URL, timeout=120)
        r.raise_for_status()
        NE_PATH.write_bytes(r.content)
    return NE_PATH


def _names(props: dict) -> set[str]:
    keys = ["ADMIN", "NAME", "NAME_LONG", "FORMAL_EN", "SOVEREIGNT", "GEOUNIT", "NAME_EN"]
    return {str(props.get(k, "")).lower() for k in keys if props.get(k)}


@lru_cache(maxsize=None)
def region_geometry(country: str, buffer_deg: float = SEA_BUFFER_DEG):
    """Return (geometry, (west, south, east, north)) for a FIRMS country name."""
    feats = json.loads(_ensure_boundaries().read_text())["features"]
    want = country.replace("_", " ").lower()
    aliases = {"united states": "united states of america"}
    want = aliases.get(want, want)
    mine = [f for f in feats if want in _names(f["properties"])]
    if not mine:
        raise SystemExit(f"Country {country!r} not found in Natural Earth boundaries")
    me = unary_union([shape(f["geometry"]) for f in mine])
    others = unary_union([shape(f["geometry"]) for f in feats if f not in mine])
    geom = me.buffer(buffer_deg).difference(others)
    shapely.prepare(geom)
    w, s, e, n = geom.bounds
    return geom, (float(np.floor(w)), float(np.floor(s)), float(np.ceil(e)), float(np.ceil(n)))


def inside(country: str, lat, lon) -> np.ndarray:
    geom, _ = region_geometry(country)
    return shapely.contains_xy(geom, np.asarray(lon, float), np.asarray(lat, float))


def coverage_of_archive(country: str, lat, lon) -> float:
    """Share of FIRMS archive detections that our clip region would keep."""
    return float(inside(country, lat, lon).mean())
