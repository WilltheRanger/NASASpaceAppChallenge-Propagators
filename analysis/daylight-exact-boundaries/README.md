# Daylight synchronized with exact historical IBGE boundaries

Brazil-only isolated candidate. Rebuilds Level1, Level2a and Level2b for Amazon/Cerrado/Pantanal,2012–2025, using the same exact historical IBGE classification and calendar/drift inputs as the corrected count analysis. Does not change production frontend data or non-Brazil results. No fleets, dispatch outcomes or invented response simulation.

## Verified changes

|2025 Aqua, near-nadir|old count|exact count|old→exact median daylight,1.5h latency|old→exact after-dark share,3h latency|
|---|---:|---:|---|---|
|Amazon|27575|27313|1.471→1.471h|56.31→56.28%|
|Cerrado|31093|31069|1.454→1.454h|59.32→59.37%|
|Pantanal|405|402|1.406→1.399h|60.74→61.69%|

All126 biome/satellite/year near-nadir filtered counts exactly match the historical exact-count dataset. All126 look times match to the minute exactly. Output probabilities and daylight bounds checked; inherited NOAA Manaus reference agrees within1min. Deterministic JSON reproduction checked separately. `validation.json` provides machine-readable evidence. The original six-region B1–B16 suite is NOT claimed: this subset has different denominators, and raw Argentina/India/US files were not available locally. `--bench` explicitly rejects accidental reuse of that suite.

## Inputs and provenance

`inputs/` is a snapshot of `analysis/ibge-exact-diagnosis` output on commitc4928725b3ddc90ac4db8e283a42324b25622aa7. Daily CSV is filtered/all counts from exact historical polygons; calendar/drift JSON matches it. Three non-Brazil region definitions remain in the source region file but are not recomputed by this script.

Boundary: [official historical IBGE archive](https://geoftp.ibge.gov.br/informacoes_ambientais/estudos_ambientais/biomas/vetores/Biomas_5000mil.zip). This historical product is not asserted byte-identical to INPE's internal2004 layer. Exact classifier copied unchanged from the prior variant, with explicit CRS conversion. No nearest-grid filling.

NASA raw inputs:28 public Brazil annual files, MODIS and S-NPP,2012–2025, from https://firms.modaps.eosdis.nasa.gov/data/country/ . Raw files remain outside git. Their provenance/hashes are in the prior IBGE validation branch. The physical sunlight equations and latency scenarios are unchanged from the team daylight code at74f2463.

[NOAA solar calculation details](https://gml.noaa.gov/grad/solcalc/calcdetails.html) confirms Meeus-based equations and approximate atmospheric assumptions; its calculator is no longer actively maintained and actual sunset can vary.0/1.5/3h latency values are scenarios, not measured individual notification delays. Counterfactuals assume the same fires would have been detectable earlier; these are not causal fire-response outcomes.

## Reproduce

Create a raw folder containing `Brazil/modis_YYYY_Brazil.csv` and `Brazil/viirs-snpp_YYYY_Brazil.csv` for2012–2025, then:

```sh
IBGE_ARCHIVE=/path/to/Biomas_5000mil.zip python analysis/daylight-exact-boundaries/daylight.py \
  --level2 /path/to/raw --generated 2026-11-15T08:00:00Z \
  --json-dir analysis/daylight-exact-boundaries/out \
  --aux-dir analysis/daylight-exact-boundaries/charts
python analysis/daylight-exact-boundaries/validate.py
```

Requires numpy,pandas,shapely,pyproj,matplotlib. The generated stamp is fixed only for deterministic comparison, not a claim about ingestion time. Code writes only explicitly specified isolated output directories. Defaults also point to the isolated output directories.

## Adoption

Adopt these three daylight JSON files only alongside the exact-map calendars/drift/counts. Regenerate the team facts/figures before checking slides. Argentina/California Level2a headline choice is unaffected because their boundary inputs did not change. Full six-region production rebuild and scientific review should precede a submission freeze. This work does not assert that old science failures disappeared.
