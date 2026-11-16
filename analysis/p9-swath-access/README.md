# P9 swath acquisition: verified access requirement and pilot manifest

## Status

Public NASA CMR metadata successfully returned 12 relevant pilot granules: three each of VNP14IMG.002, VJ114IMG.002, VNP03IMG.2 and VJ103IMG.2.1. The pilot covers 2020-08-01 through 2020-08-02 in a small Brazil box (-61,-13,-59,-11). It is a pipeline-validation sample, **not** a representative scientific test or an outcome-selected replacement for P9. Total metadata size is about 1,049 MB, mostly image-band geolocation.

An actual `.nc` download from NASA's protected LP DAAC endpoint returned **HTTP 401 Unauthorized** without Earthdata authentication. The user's Chrome Earthdata page is not signed in. This is now an observed access blocker, not an assumption. A FIRMS MAP_KEY is a different credential and does not replace Earthdata access. No credentials, cookies or tokens have been extracted, committed or requested in chat.

## What is implemented

- `discover.py`: paginated CMR public metadata search for both fire masks and image-band geolocation. Saves actual data URLs, temporal metadata, product versions and size estimates.
- `pilot_manifest.json`: real discovery results, not downloaded observation data.
- `masks.py`: conservative common-clear-land/fire pairing logic for **already geographically registered** pixel arrays. It requires explicit registration, rejects unexpected classes, excludes unknown/cloud/water/low-confidence observations and retains clear non-fire zeros. It is not a geolocation engine.
- Seven unit tests pass. No formal P9 pass/fail value is produced.

## Required continuation after secure Earthdata sign-in

1. Download a matched fire mask and image-band geolocation pilot for each satellite through NASA's authorized mechanism. Validate actual product dimensions, field names and acquisition metadata before relying on the reader. Never treat an HTML login response as an observation file.
2. Use native image-band geolocation; do not blindly attach lower-resolution MOD geolocation to 375 m arrays. Check bow-tie deletions, invalid geometry and solar/view angles.
3. Align common ground footprints and intersect valid clear-land coverage. A nearby cell is not necessarily a common observed footprint. Assess area/exposure weighting and sensitivity to spatial scale.
4. Extend to a predeclared spatial/seasonal sample across all biomes for the pre-outcome calibration period. Preserve the existing original P9 rule and explicitly label analysis developed after seeing outcomes as exploratory.
5. Fit timing effects with satellite/geometry controls and independent block uncertainty, then evaluate the actual P9 rule. Neither the positive-only pair slope nor one pilot day establishes this result.

The available disk budget was approximately 9.1 GB at discovery. Do not launch an unbounded multi-year swath download; stage/subset authenticated data and retain sufficient space. The current test and frontend outputs are untouched.

## Reproduce metadata and unit tests

```sh
python3 analysis/p9-swath-access/discover.py \
 --start 2020-08-01T00:00:00Z --end 2020-08-02T00:00:00Z \
 --bbox=-61,-13,-59,-11 --output /tmp/p9_manifest.json
python3 -m unittest discover -s analysis/p9-swath-access/tests -v
```

## Official references

- [NASA CMR public search API](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html)
- [NASA VNP14IMG archive, Earthdata authentication instructions](https://ladsweb.modaps.eosdis.nasa.gov/archive/allData/5200/VNP14IMG/)
- [NASA fire-mask specification](https://ladsweb.modaps.eosdis.nasa.gov/filespec/VIIRS/1/VNP14IMG): masks distinguish clear land, cloud, water, unclassified and fire confidence.
- [Collection 2 fire-product guide](https://www.earthdata.nasa.gov/s3fs-public/2025-06/VIIRS_C2_AF-375m_User_Guide_1.2.pdf)

No shared history, team branches, deployed app or results were changed.

## Acquired pilot (November 15, 2026)

NASA Earthdata/LAADS authorization succeeded. All four actual pilot files are
available locally: S-NPP and NOAA-20 fire masks and their matching 375 m
geolocation swaths. `pilot_result.json` records byte counts and SHA-256 hashes;
raw satellite files are deliberately not committed.

`pilot.py` implements a **coverage-aware engineering pilot**, not formal P9:
40,000 fixed 0.01-degree grid centers in the discovery box, nearest geolocated
native pixel within 375 m, both sensor zeniths <=45 degrees, and classes 5/8/9
usable in both. The settings were fixed before running the pilot, but this is
still a post-hoc engineering exercise, not preregistration. It explicitly
includes observed non-fire pixels rather than treating absent FIRMS detections
as clear-sky zeros.

Result: **376 common usable centers, all clear non-fire**. S-NPP contributes
407 usable centers under the viewing-angle rule, NOAA-20 38,024. The masks do
contain regional fires (10 nominal S-NPP pixels and 9 nominal NOAA-20 pixels),
but none enter this common sample. Do not relax filters or choose a different
box merely to obtain a favorable result. The observed swaths start 48 minutes
apart. One such pair cannot identify a time slope separately from instrument
bias, much less establish P9 across six biomes.

Reproduce after obtaining the manifest-named files:

```sh
python pilot.py --data /path/to/downloads --out pilot_result.json
```

Dependencies: numpy, scipy, h5py. This pilot uses nearest-center sampling, not
exact footprint-overlap integration; its grid samples are spatially dependent.
Formal continuation requires a prospectively fixed spatial/seasonal sample of
2018–2020 pairs, coverage and geometry controls, and sufficient timing variation
before assessing unchanged 2023–2025 regional drift outcomes. The authentication
blocker is resolved; full calibration acquisition/analysis is not yet complete.

## Fixed calibration continuation

The fixed eighteen-date, six-biome plan is in `CALIBRATION_PLAN.md`; public CMR
manifests are committed under `calibration_manifests/`. `calibration.py` builds
an IBGE-classified land grid and streams native geolocation in small chunks.
Scan timestamps come from `scan_line_attributes/ev_mid_time`, not civil time
or an assumed granule midpoint. For this2018–2020 window, conversion from
TAI93 subtracts the ten leap seconds accrued since1993-01-01 UTC, checked
against the swath's declared UTC start/end. NASA's
[TAI93 definition](https://docserver.gesdisc.eosdis.nasa.gov/public/project/Sounder/ATMS_V3_L1B_Product_User_Guide.pdf)
and the [NIST leap-second table](https://tf.nist.gov/pubs/bulletin/leapsecond.htm)
provide the time-scale basis.

`pair_day.py` preserves clear non-fire observations, requires BOTH local solar
times after13:30 and15–90-minute separation, and selects the closest eligible
pair without selecting on fire occurrence. Zero eligible pairs are not a pass.
The actual downloaded C2 mask legend confirms5=clear land,6=unclassified,
7=low-confidence fire,8=nominal,9=high. Low-confidence7 is excluded consistently
with the previous FIRMS normal/high-confidence analysis. Do not infer an
algorithm-QA bit meaning from a different collection's specification.

**Partial acquisition results, not final calibration:** Jan15,2019 has5,012
common time-eligible center pairs; March15 has3,421. Neither has pairs with
both local solar times after13:30 under45-degree viewing-angle restriction.
This motivated a separately documented85-degree sensitivity, not a silent
change to the original result. The excluded August1,2020 engineering pair
under that broad view has7,470 after13:30 common centers, including Amazon
1 vs2 sampled fires. This single pair establishes processing support only,
not a timing slope, regional verdict or causal validation.
