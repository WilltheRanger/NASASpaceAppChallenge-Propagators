# Fixed coverage-calibration acquisition plan

Written after the August 1 pilot, before acquiring or analyzing this sample.
This is a new post-hoc analysis, not retroactive preregistration. P9's original
2023–2025 outcome criterion and earlier surrogate failures remain unchanged.

## Sampling, independent of fire detections

Use all Brazil land grid centers on a fixed 0.05-degree grid, classified by the
existing official IBGE polygon classifier. Do not select cells because a fire
was detected. Dates are the 15th of January, March, May, July, September and
November in each of 2018, 2019 and 2020. Process chronologically, starting 2019
for ingestion validation, then 2018 and 2020. All dates are before the tested
2023–2025 outcomes. Failed downloads and unavailable granules are logged, never
replaced with fire-rich dates. The August 1 pilot is excluded.

Query CMR for daytime swaths intersecting Brazil's bounding rectangle
[-74,-34,-34,6]. Pair fire masks with their exact image-band geolocation input.
Download in bounded batches; only a completed and checksum-verified derived
regional sample permits removal of a temporary raw copy created for this run.
Never delete user-owned originals. Retain source URLs, hashes, sizes and metadata.
At most 2 GiB of temporary raw data concurrently; stop acquisition if free disk
falls below 5 GiB. Raw data are not committed to Git.

## Sampling/coverage

Keep the pilot rules: nearest native center <=375 m, sensor zenith <=45 degrees,
classes 5/8/9 usable, fire 8/9. Pair only common usable geographic centers,
not common positive detections. Multiple swaths on a date: select the closest
in local solar time pair with separation 15–90 minutes, both after 13:30.
Derive scan timing from product scan metadata when available; otherwise report
interval-censored swath times and do not pretend start time is exact pixel time.
Aggregate centers in fixed 0.5-degree cells with cosine(latitude) area weights.
Record angles, time intervals, coverage, fire and non-fire observations.
Nearest-center support remains an approximation to exact footprint integration.

## Estimation and gates

Estimate paired fire probability using a conditional Poisson model with a
satellite intercept and signed time difference, with seasonal/spatial controls
and view-angle differences. Do not add pseudocounts to zero-fire pairs; they
contribute exposure but no event information to the conditional likelihood.
Do not fit/report a sign if the design is rank deficient, satellite/time effects
are not separable, fewer than six dates contribute fire information, or all
informative observations share one temporal ordering. Report these as insufficient
identification, not a pass or failure. Use day-block uncertainty, acknowledge the
limited independent days, and compare pixel-center/scan-time uncertainty before
interpreting a slope. No adaptive threshold relaxation, outcome-based date/cell
replacement or tuning to the 2023–2025 drift outcomes.

Only regions with identifiable positive timing slopes enter the original P9
opposite-drift check. A negative or unidentified slope does not become a P9 pass.
Publish eligibility, exclusions, uncertainty and all six biome statuses.

## Explicit geometry sensitivity added after two dates

The January and March2019 samples have5,012 and3,421 common time-eligible
centers respectively, but zero with both local solar times after13:30 under
the45-degree filter. This is a support problem, not a biological slope result.
Before looking at broad-view fire outcomes, add a separately labeled <=85-degree
view sensitivity (excluding invalid geometry and retaining every other rule).
This admits essentially all valid satellite views instead of a favorable tuned
cutoff; it is not a replacement for the committed45-degree primary result.
Save to a separate `sensitivity85` directory. Report strong scan-angle-dependent
pixel-footprint/detection differences and nearest-center sampling limits; do not
claim causal timing identification from a broad-view positive slope alone.
Evaluate the already-acquired August pilot separately as an engineering test,
never fold it into the fixed-date calibration sample. If support remains absent,
do not fit a slope. This change is transparently post-hoc and was authorized
before the broader-angle outcome was calculated.
