# Check-methodology corrections and explicit sensitivities

Isolated follow-up to `analysis/ibge-exact-diagnosis`, using its historical IBGE exact-coordinate counts. No production outputs, teammate branches, thresholds, or historical results replaced. No causal claim validated. All outputs reproducible from committed aggregate inputs.

## Actual bugs fixed

1. P6 compared NOAA-20 point estimate to S-NPP interval, reversing the written rule. It now compares S-NPP point estimate to NOAA-20 interval.
2. P6 reference runs included S-NPP-missing days as zeros in one arm. Both arms now require all four satellites' observed-day support. This is the existing detection-based availability proxy, not spacecraft telemetry. Result: **30/30 pass**, largest reference gap 0.123 (formerly 0.211).
3. P9 silently substituted MODIS morning/afternoon beta for the written VIIRS same-day afternoon gate. Original P9 is now **pending/not evaluable**, while its failed proxy remains explicit: **4/6**, not an affirmative validation.
4. Region metadata now correctly identifies exact historical IBGE boundaries instead of INPE label interpolation.

## What is not fixable by making code green

| Check | Original finding | Defensible response |
|---|---|---|
| P1 | within 2021–25 rises in 6/6; including 2020→21 only 3/6 | Both readings retained. The committed plan explicitly reserves wording resolution to the team. Selecting the favorable reading after results is not preregistration. |
| P5 | 28/29; Pantanal2024 L=.9728, interval [.88832,1.0697], stratified=.88345 | Retain failure, show stratified result/sensitivity. Daily mean FRP is a day-level proxy, not individual fire size. Raw per-detection strength stratification would be a new analysis, not retroactive validation. |
| P7 | 16/23, below75% | Mechanism uses near-nadir counts while audit uses all angles. Matched near-nadir sensitivity gives21/23. Original criterion remains failed. |
| P9 | original VIIRS-pair gate unavailable; MODIS proxy4/6 | Do not describe all-biome opposite drift as validated. Need independently specified paired-observation method and usable time separation to test original gate. |
| P10 | 15/23, below75% | Same sample mismatch. Matched near-nadir sensitivity gives19/23. Original criterion remains failed. |

P7/P10 sensitivities use exactly the original eligible biome-years and bootstrap replicates/thresholds. They compare the existing mechanism predictions to near-nadir Aqua/S-NPP audit intervals instead of all-angle intervals. This is a post-hoc different estimand, **not a repaired original pass**. Wider or differently centered near-nadir intervals can also explain improved coverage; the result is not proof of mechanism. No observations were dropped to improve a score.

P5 additionally uses a paired bootstrap of L_strat−L, preserving common weights and covariance. Zero is inside28/29 intervals; this does not eliminate the failure and is not an equivalence test.

## Deliverables and review path

- `audit.py`, `checks.py`, `methods.py`: isolated corrected implementation.
- `statistics/`, `data/out/`: full corrected outputs for all six frontend regions.
- `audit_failure_evidence.csv`: per-biome-year original P5 and paired-difference results.
- `closure_sensitivity.csv`, `twoclock_sensitivity.csv`: every original and exploratory decision.
- `sensitivity_summary.json`: machine-readable totals, explicitly post-hoc.
- `validation_summary.json`: six-region structural/P3 handoff validator.

Recommended app copy: “Independent count reproduction succeeds; timing-based explanations vary by biome. Matched near-nadir analyses are supportive exploratory evidence, not causal confirmation.” Show P5/P7/P10 failures; show P1/P9 unresolved; do not turn all badges green. For Pantanal2024 show both raw and stratified estimates. Merge/adoption and submission remain team decisions.

## Reproduce

From repository root:

```sh
PYTHON=/path/to/python bash analysis/check-methodology-fixes/recompute.sh
```

Requires numpy/pandas and aggregate inputs already committed in the ancestor branch. `tests/` covers interval direction, each satellite's missing-day exclusion, inclusive boundaries, NaNs, scientific statuses, unchanged original audit estimates, equal sensitivity denominators and finite reference results. Full recompute +9 regression tests +six-region handoff validator pass. The scientific checks are not unit tests and deliberately retain unsupported predictions.
