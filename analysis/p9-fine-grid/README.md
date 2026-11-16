# Fixed fine-grid engineering sensitivity

This is a new, explicitly post-hoc engineering test, not a replacement for the 45-degree primary result and not a full biome calibration.

## Implemented and tested

- A fixed 0.005-degree grid over the original engineering box, longitude -61 to -59 and latitude -13 to -11.
- All 19 fixed July 15, 2018 mask swaths, with exact mask/geolocation InputPointer validation.
- Tile-bounded extraction without the old 0.05-degree phase-specific filter.
- Preserved native flattened pixel IDs, namespaced by satellite and granule.
- Native dependence components: grid pairs sharing either satellite's native pixel are joined transitively.
- Five tests pass, including synthetic off-coarse-phase HDF5 extraction and shared-pixel clustering.

The finest grid does not imply independent measurements. Adjacent pixels, overlapping footprints and repeated dates may remain correlated beyond these components. No slope or confidence interval is computed from these engineering counts.

## Result

The same fixed box/date had 193 eligible broad-angle coarse-grid centers and 18,663 fine-grid pairs, representing 18,663 distinct native-pixel pair tuples and 17,580 shared-native-pixel components. Both satellites still had zero observed fires in the eligible fine-grid pairs. Zero pairs met the original 45-degree afternoon rule. Densification improved coverage resolution but did not create fire information in this box or solve primary geometry support.

## Historical preflight limits (before the full-Brazil run below)

The exact IBGE polygon archive is needed to classify new fine-grid centers; copying coarse biome labels would misclassify boundaries. The current cloud raw inventory has 362 of 661 metadata-listed inputs; some historical geometry was retained only on the Mac/USB or reduced to derived arrays. The metadata inventory includes one unmatched extra geometry, so it is not an exact required-pair count. Existing complete coarse results do not imply all raw inputs are locally available for a new extraction.

Only about 12 GB free cloud storage remains, with a 10 GB guard. A full finer-grid rerun needs tile streaming, exact polygon classification, missing-file retrieval or transfer, and retained native dependence information. No large downloads or production result changes were made for this test.

## Run

From the repository/checkpoint root with the raw inputs and Python dependencies available:

    python -m unittest discover -s analysis/p9-fine-grid -p 'test_*.py' -v
    python analysis/p9-fine-grid/engineering.py

The engineering runner expects its fixed grid. To recreate it, use 400 by 400 centers at longitude arange(-60.9975,-59,.005) and latitude arange(-12.9975,-11,.005), saved as flattened lon/lat arrays in engineering-grid.npz.

The engineering runner generates engineering/result.json and engineering/paired-native-components.npz. Those engineering artifacts are not included in this compact snapshot; its published evidence is the full-Brazil first-date JSON below. Raw availability is in raw-inventory.json. Compact publication bundles exclude all satellite files and large derived arrays.

## Full-Brazil first-date run completed

The full fixed July 15, 2018 date is now complete, using all 19 swaths and 28,424,955 fine-grid centers. The correct 2019 Biomas_250mil polygon archive reproduced all 284,234 original coarse biome labels exactly. An older 1:5,000,000 archive was rejected after the comparison found mismatches; no boundary change was silently introduced.

Results: 2,904,825 eligible broad-angle pairs compared with 28,975 coarse pairs. There are 153 discordant grid centers versus one coarse discordant center. Those 153 centers are 153 unique native-pixel pair tuples but only 151 shared-native-pixel components. Neighboring fires remain clustered: illustrative 1 km, 2 km and 5 km connectivity gives 110, 100 and 98 clusters. None of these counts is asserted to be independent fires.

The original 45-degree afternoon support remains zero. All fine-grid slope estimates are still null because only one of the 18 planned dates is complete. The unchanged six-informative-date gate remains enforced.

fit_fine.py preserves the original controls, rank/information gates and whole-date bootstrap. Weights are cos(latitude)*(0.005/0.05)^2, preserving comparable area quadrature rather than inflating counts 100-fold from denser sampling. Eight fine-grid unit tests pass, including aggregation equivalence to the original coarse calculation and density-invariant area weighting.

Native shared-pixel components do not capture all footprint overlap or neighboring-fire dependence. Whole-date resampling keeps within-date dependencies together; cross-date fire persistence can remain. This is a post-hoc sensitivity of detection support, not a causal timing correction or a new P9 pass.

All ready fixed dates are queued sequentially with storage guards and durable per-date checkpoints. Missing original inputs require recovery before the full 18-date sensitivity can be called complete.

## Independent publication review

Reviewed as a compact first-date snapshot on 15 November 2026, based on final coarse P9 commit `3d06ffb`. All eight new unit tests and all fifteen original P9 tests passed independently on the Mac. Published July JSON totals and biome subtotals reconcile. This review does not rerun the full extraction or independently certify all raw payload hashes. No original scientific outputs or frontend files are changed.

Resume validation now fails closed: every cached or freshly extracted swath requires a sidecar with the exact full-grid SHA-256, mask/geolocation identity, all three file hashes, the 85-degree sensitivity rule, expected NPZ schema, strictly increasing in-bounds grid IDs, consistent array lengths, and matching usable-center count. Missing or changed provenance rejects reuse; there is no automatic acceptance of legacy caches. Fourteen fine-grid tests pass independently, including six cache-integrity tests. Numerical first-date results are unchanged. Missing raw inputs and all remaining dates must still be completed before full-sensitivity claims.

## Bounded-query and second-date follow-up

The extractor now queries at most 100,000 centers at once against the same native tree, releases redundant buffers before output assembly, and records process peak RSS. This bounds query allocations, not total process memory; a largest-footprint benchmark is required before running on a memory-constrained Mac. Seventeen fine-grid unit tests pass independently, including query equivalence with ties and missing matches and rejection of mismatched paired-grid fingerprints.

The March 15, 2018 extraction report is also published: 1,522,942 eligible broad-angle pairs, 12 discordant grid centers, and zero primary45 support. Both published full-date reports carry the exact grid fingerprint. The included `fine-fit.json` remains the explicitly dated **one-date July snapshot**, not an updated fit incorporating March. No full 18-date completion, independent-event count, or causal timing correction is claimed.
