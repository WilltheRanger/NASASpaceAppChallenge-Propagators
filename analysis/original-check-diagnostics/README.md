# Individual detection-strength check: additional P5 evidence

This isolated follow-up uses the already downloaded NASA FIRMS raw detections and exact historical IBGE boundaries. No production data or original prediction status is replaced. The original P5 result remains **28/29**, with Pantanal 2024 outside the original interval. P7/P10 original scores remain **16/23** and **15/23**; their separate matched-angle sensitivities are documented in `analysis/check-methodology-fixes` and are not retroactive passes.

## What was improved

The existing P5 implementation assigns an entire day's detections to a class based on daily mean S-NPP FRP. That is a proxy for fire strength, not individual fire-size control. This follow-up actually reads **13,900,427 individual detections**, derives per-biome S-NPP baseline FRP terciles from 2012–2020, and aggregates each detection into the appropriate strength class. The fixed thresholds are applied to Aqua as well. Class-specific audits retain the original month correction, common-day support, baseline and 1000 16-day bootstrap draws. Baseline class weights are recomputed for every bootstrap draw rather than treated as known constants.

One source detection (S-NPP, Amazon, 2016-10-14, 17:11 UTC, FRP −2.68 MW) cannot be assigned physically meaningful nonnegative strength and is explicitly excluded. All other filtered source counts reconcile exactly, including original zero rows. This exclusion is not selected using an audit outcome.

## Results, not a green badge

Among the same 29 originally eligible biome-years:
- individual-strength adjusted estimates inside original all-detection intervals: **19/29**;
- inside filter-consistent audit intervals: **21/29**;
- paired bootstrap difference intervals containing zero: **16/29** (not an equivalence test).

Pantanal 2024: original daily-proxy stratified estimate **0.88345** vs original interval **[0.88832, 1.0697]**. The individual-strength sensitivity is **0.63077 [0.47107, 0.79070]**; filtered unstratified audit **0.93799 [0.83021, 1.05569]**. Thus the miss does not vanish when daily-average stratification is replaced with individual detections. The complete table includes all six biomes and all five years; no failed rows dropped.

These results do **not** establish the true fire-size effect. FRP is instrument-dependent, Aqua/VIIRS pixels differ, and these are not matched physical fires. Applying the same MW cuts to different instruments is itself a sensitivity. A rigorous causal/physical fire-size adjustment would need spatially and temporally matched fire clusters and coverage/geometry controls. No thresholds, confidence levels or original pass rules were changed. This analysis was planned and run after seeing the original miss and is explicitly exploratory, not preregistered.

## Recommended product behavior

Retain the original P5 failure. Present both estimates for Pantanal, explain that strength mix matters to the audit, and do not describe the timing audit as a validated causal correction. P7/P10's better matched-angle analyses belong in an exploratory section, not as replacements for the original predictions. Code regression success and hypothesis support must be separate status fields.

## Reproduce

```sh
python analysis/original-check-diagnostics/extract.py /path/to/firms /path/to/Biomas_5000mil.zip
OPENBLAS_NUM_THREADS=1 python analysis/original-check-diagnostics/score.py
python -m unittest discover -s analysis/original-check-diagnostics/tests -v
```

The extraction uses existing 2012–2025 `modis_*_Brazil.csv` and `viirs-snpp_*_Brazil.csv` files. Hashes/URLs are recorded in `analysis/ibge-validation` source manifests; historical map provenance is in `analysis/ibge-exact-diagnosis`. Requirements: numpy, pandas, shapely, pyproj, pyshp. No new downloads or credentials needed. Seven tests check uniqueness, finite draws, preserved eligibility, original failure, and exact count reconciliation with the one documented invalid FRP.
