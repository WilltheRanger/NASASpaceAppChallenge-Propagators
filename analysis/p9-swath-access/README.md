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
