# Provisional2026 NASA FIRMS ingestion

A small, working no-key path for recent observations. **Not a completed2026 calendar.** No historical calibrated series, UI, or scientific test was overwritten.

## Verified snapshot

Retrieved15 Nov2026 from NASA's public `api/active_fire_files/all?format=json` listing, selecting its three South America7-day CSV links.10,548,982 bytes total downloaded, bounded at20MiB per file. No credentials requested, read or exposed. Raw responses processed in memory and not committed.

Exact historical IBGE classification yields **42,176 daytime Brazil-biome detections**,141 daily biome/satellite rows,8–14 Nov2026. The source files also contain some15 Nov nighttime/non-Brazil rows, so source date range and selected daytime range differ. Source hashes, versions, file URLs and row counts are saved in `out/provenance.json`.

Available streams: MODIS,NOAA20,NOAA21. NASA's current feed listing does not include S-NPP. Never substitute NOAA20/21 counts for S-NPP without a calibrated overlap model.

## Limitations enforced by design

- Rolling7-day feeds cannot reconstruct Jan–Oct2026 or complete November. Missing dates/months are not filled with zeros.
- These are NRT products (`6.1NRT`/`2.0NRT`), not the standard products used for historical analyses. They may change after processing/revisions.
- Current feeds lack `type`. We do not invent vegetation-fire classifications or claim the original type0 filter was applied. Outputs are **all daytime detections**, no confidence filter.
- `provisional=true`, `coverage_complete=false` on every output row. No fixed-clock number, trend, monthly total or causal claim produced.
- No authentication or API key is needed for these public feeds. Full-year archive acquisition is a different task; the standard annual2026 URLs were unavailable in the preceding readiness check.
- Re-running is deterministic for identical source bytes, but NASA's rolling feeds change. Hashes identify this snapshot; the raw response bytes were not retained, so exact archival replay requires those source snapshots.

## Usage and tests

```sh
python analysis/nrt-2026/ingest.py --ibge /path/to/Biomas_5000mil.zip
python -m unittest discover -s analysis/nrt-2026/tests -v
```

Dependencies pandas/numpy/shapely/pyproj; classifier reused from the exact-daylight branch. Writes only `analysis/nrt-2026/out` unless `--out` supplied. Seven tests cover missing type, satellite aliases, duplicate rows, bad times, unknown satellites, off-domain URLs and aggregation/provisional integrity.

Sources: [NASA official downloads](https://firms.modaps.eosdis.nasa.gov/active_fire/), [official public feed listing](https://firms.modaps.eosdis.nasa.gov/api/active_fire_files/all?format=json), [NASA API tutorial on NRT versus standard processing](https://firms.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html). This is the feasible current snapshot; full2026 ingestion remains incomplete, not blocked by app display credentials.
