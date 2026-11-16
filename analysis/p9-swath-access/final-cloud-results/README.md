# Final fixed-date P9 acquisition and calibration

All 18 fixed bimonthly calibration dates from January 2018 through November 2020 are complete: 330 satellite swaths, with every paired date reporting `input_complete: true` and no missing expected swaths. All 15 unit tests pass.

## Scientific outcome

- **Original viewing-angle limit (45°):** zero eligible afternoon center observations in the fixed sample. No timing correction can be estimated.
- **Exploratory sensitivity (85°):** 342,300 eligible center-date observations and 46 discordant fires. Repeated centers across dates are not independent observations.
- All six biomes remain `insufficient_identification`, with null beta estimates and confidence intervals.
- Amazon has four informative dates, Caatinga three, Pantanal one, and Pampa zero, below the unchanged six-date gate.
- Cerrado (22 informative cells over six dates) and Atlantic Forest (11 over six dates) fail the rank/conditioning-or-fit gate despite meeting the date-count gate.

These are analysis results, not a new P9 pass or a change to the deployed application. Dates, grid, fire classes, afternoon timing restrictions and identification gates were not relaxed. January/March 2019 primary arrays were reproduced exactly during sensitivity backfill.

## Acquisition correction

CMR omitted the selected daytime NOAA-20 masks for March 15 and May 15, 2018, but official LAADS inventories contained 240 granules on each date. The missing masks were recovered using the nine already-selected geolocation timestamps for each date, without outcome-based selection. Payloads were verified as daytime HDF5 files with exact geometry InputPointers.

Corrected working manifests preserve the original entries and supplemental provenance. Untouched original manifests remain under `../calibration_manifests/supplemental/*.original.json`. This was an indexing discrepancy, not evidence of a satellite outage.

## Files and reproducibility

- `completeness.json`: per-date completeness and count reconciliation for both angle rules.
- `primary45-fit.json` and `sensitivity85-fit.json`: exact model outcomes and identification gates.
- `may2018-payload-validation.json`: recovered May NOAA mask hashes and input-matching checks.
- `unit-tests.txt`: fresh 15-test run.
- The parent analysis directory contains extraction, pairing, fitting code and fixed-date manifests.

Run `python -m unittest discover -s analysis/p9-swath-access/tests -v` from the repository root. Full scientific reruns additionally require the separately retained exact grid, derived arrays and/or authorized NASA observations; these compact results do not embed that data. The full derived checkpoint SHA-256 is `c0206dd44d255f792ebba1d2f47e20269bcb116972237ca9282535ac2ef24896`.

No raw satellite data, authentication material, or bulky derived arrays are included here. No merge or deployment is implied.
