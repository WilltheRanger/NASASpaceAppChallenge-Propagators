# P9: actual same-day VIIRS pairs, and the remaining coverage blocker

**Important correction:** equal annual near-nadir median local times do NOT establish that S-NPP and NOAA20 observe the same place simultaneously. Their orbital phasing produces same-place time separation. Our original explanation for P9 being unavailable was too broad. This branch fixes that factual gap with raw paired observations, but does not falsely validate the original prediction.

## Results (2018–2020, before P9's2023–25 outcomes)

Historical IBGE exact classification, type0 daytime normal/high-confidence observations. Pair same0.1° cell/day/biome; both detections required. Both median local times after13:30 and15–90min apart. Analysis choices in PLAN.md were written before this run; the analysis itself is post-hoc, not preregistered.

All six biomes have median same-cell separation about **50.01min**. There are391,101 double-detection cell-days, of which30,795 meet the afternoon criterion.

| biome | afternoon pairs | count log-slope/hour |95% block-bootstrap interval |
|---|---:|---:|---|
| Amazon |7323|−0.087|[−0.150,−0.019]|
| Caatinga |1530|0.278|[0.218,0.344]|
| Cerrado |9813|0.242|[0.176,0.297]|
| Atlantic Forest |8770|0.180|[0.145,0.219]|
| Pampa |1212|0.161|[0.105,0.222]|
| Pantanal |2147|0.205|[0.099,0.310]|

Count model includes satellite intercept; timing coefficient uses signed NOAA20−S-NPP time difference. FRP secondary model in summary.csv. All candidate positive-slope biomes do NOT satisfy opposite-drift monotonicity: Pampa and Pantanal still fail the existing2023–25 downstream observation. Thus even treating this diagnostic as a gate would not make P9 an all-regions pass.

## Why this is not the final original P9 test

Hotspot CSVs contain positive detections, not a full observation mask. A cell seen only by one satellite may be cloudy, outside the other's swath, below its threshold, or genuinely non-burning. Requiring two positives is selection on the outcome.0.1° pairing also does not ensure the same physical fires or common pixel footprints, and view geometry changes with orbit phase. The descriptive count slope can therefore reflect detection/coverage differences, not just fire evolution. No clear non-fire zero was fabricated.

**Genuine remaining inputs:** matched VNP14IMG/VJ114IMG Level2 swath fire masks plus corresponding geolocation/view geometry for the same observations. Intersect valid clear-land footprints; count fire and non-fire pixels over common area, model exposure and geometry, predefine pairing and seasonal/spatial controls before observing the reanalysis. This requires a new swath ingestion/geolocation workflow; the already downloaded country CSVs cannot supply the missing denominator. Formal P9 stays pending; existing MODIS surrogate4/6 failure stays unchanged. Do not present this branch as causal proof or a formal pass.

## Authoritative sources

- [NOAA VIIRS surface-type ATBD](https://www.star.nesdis.noaa.gov/jpss/documents/ATBD/ATBD_VIIRS-SurfaceType_v2.1.pdf): same-ground observations differ about50min and viewing geometry differs.
- [NASA VNP14IMG product description](https://modaps.modaps.eosdis.nasa.gov/services/about/products/viirs-land-c1/VNP14IMG.html): full two-dimensional fire-mask classification exists in the Level2 product.
- [NASA Collection2 active-fire user guide](https://www.earthdata.nasa.gov/s3fs-public/2025-06/VIIRS_C2_AF-375m_User_Guide_1.2.pdf): fire-mask classes and product limitations.
- [NASA fire-alert caveats](https://firms2.modaps.eosdis.nasa.gov/alerts/notes.php): clouds, smoke and canopy can obscure detections.

Raw input URLs/checksums are already in the ancestor `analysis/ibge-validation` manifest. Boundary provenance in `analysis/ibge-exact-diagnosis`.

## Reproduce and tests

```
python analysis/viirs-pair-feasibility/run.py /path/to/firms /path/to/Biomas_5000mil.zip
python -m unittest discover -s analysis/viirs-pair-feasibility/tests -v
```

Dependencies pandas/numpy/shapely/pyproj. Seven tests verify unique pairs, no imputed zeros, pre-outcome period, eligibility, timing arithmetic, count reconciliation and independent least-squares reproduction. No frontend or previous results modified.
