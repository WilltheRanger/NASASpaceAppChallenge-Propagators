# Predictions P1 to P10, team Propagators

**Committed:** Sat Nov 14 2026, 5:31 PM PST.
**Written:** in our plan (FINAL PLAN v1.1, section 5) on Sat Nov 14 at about 2:15 PM Pacific, before any Brazil or Punjab analysis was run.
**Copied here unchanged.** If a prediction fails, we report it. That is still a finding.

## Honest timeline (read this before quoting any prediction as "pre-registered")

These results already existed when this file was committed:

| Prediction | Result that existed before this commit | Status of the prediction |
|---|---|---|
| P1 (Brazil drift) | Drift by biome, branch `brady/brazil-data`, Sat 5:14 PM | Written before, committed after. **Not pre-registered in the repo** |
| P3 (INPE match) | INPE reproduction, branch `brady/brazil-data`, Sat 5:14 PM | Written before, committed after. **Not pre-registered in the repo** |
| P8 (California detection limits) | Computed Sat 3:15 PM | **Not pre-registered** |
| P9 (opposite drifts) | Quick-look preview without error bars, branch `brady/brazil-data`, Sat 5:14 PM | Written before, committed after. **Not pre-registered in the repo** |

**Clean (nothing run before this commit):** P2 (Punjab), P4, P5, P6, P7, P10.

## The predictions (unchanged from the plan)

| ID | Prediction | Pass if |
|---|---|---|
| P1 | Aqua's median look time over each Brazilian biome rises every year 2021 to 2025; VIIRS stays flat | Each year ≥ the year before; VIIRS within ±10 min of 2012 to 2020 |
| P2 | Punjab Aqua look time follows Jethva 2026 (1:44 PM in 2021 to 3:12 PM in 2025) | Same direction each year; total rise 60 to 120 min |
| P3 | Our FIRMS Aqua data reproduces INPE's reference counts | ≥ 90% of biome-months 2012 to 2020 within 10% |
| P4 | Day-to-day sampling noise explains the year-to-year wobble before the drift | The day-bootstrap interval of each placebo year's L (2012 to 2020, one year held out at a time) contains 1 in at least 7 of 9 years. **If it fails:** use the placebo range (min to max of the 9 values) as the uncertainty for 2021 to 2025. Either way, a post-2021 L counts as a detection only if it falls **outside** the placebo range |
| P5 | Fire-size mix doesn't explain the audit | `L_strat` inside the interval of `L` |
| P6 | VIIRS is a stable clock | L with an S-NPP reference within the interval of L with a NOAA-20 reference |
| P7 | Closure: the timing slope predicts the observed L | L_pred inside the 90% interval of observed L in at least 75% of strict-test biome-years (biomes × years where Aqua's shift ≤ 1 hour) |
| P8 | VIIRS detects small real fires better than MODIS | a50(VIIRS) < a50(Aqua), with intervals not overlapping |
| P9 | Opposite drifts move the probes in opposite directions where fire peaks after 1:30 PM | In each region where VIIRS same-day pairs show fire rising after 1:30 PM (β > 0): A_y rises and T_y falls (2023 to 2025) |
| P10 | The two-clock difference agrees with the audit | The clock share of log A_y from the difference method lies inside the bootstrap interval of log L_y in ≥ 75% of biome-years 2022 to 2025 |

**We make no prediction about the sign of L in Brazil.** Fire timing differs by biome.

## Open wording question (P1)

"Rises every year 2021 to 2025" can mean (a) 2022 ≥ 2021, ..., 2025 ≥ 2024, or (b) also 2021 ≥ 2020. The team must pick one reading and write it here **before** P1 is scored.

*Prepared by Claude (AI) from the team's plan at the team lead's request; text of P1 to P10 unchanged.*
