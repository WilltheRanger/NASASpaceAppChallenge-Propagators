# Timing vs sampling geometry: what explains the change in L

Every number below comes from `decompose.py`; the full tables are in `out/`.

## Setup
- **Units:** 8 regions (amazon, cerrado, caatinga, mata_atlantica, pantanal, argentina, california, punjab_haryana) × {Aqua, Terra} × 2021–2025, giving 80 units.
- **Outcome:** y = log L, where L = MODIS count_all / (S-NPP count_all × the 2012–2020 MODIS/S-NPP ratio for that calendar month), counted only on days when both satellites returned data.
- **Timing (Δt):** the year's median near-nadir local solar time minus the mean of the 2012–2020 yearly medians, in hours. Source: `firms_drift_by_biome.csv` and `regions_drift.csv`.
- **Geometry (Δg):** log(the year's near-nadir share of detections ÷ the 2012–2020 share). Near-nadir means scan ≤ 1.3 km, on the same matched days.
- **Intercepts:** none. All terms are 0 at baseline by construction. Adding satellite intercepts (M2i) gives cA = 0.006 and cT = −0.017, both about zero.
- **Uncertainty:** 95% intervals come from a 2000-replicate bootstrap that resamples regions (8 clusters). A unit-level bootstrap SE is also given in `out/coefficients.csv`.

## Unit regressions (n = 80)
| model | term | coef | 95% CI (region bootstrap) | R² |
|---|---|---|---|---|
| M0 geometry only | γ (Δg) | −0.63 | −1.43 to 0.14 | 0.003 |
| M1 timing, one slope per satellite | βAqua | 0.174 | 0.083 to 0.267 | 0.595 |
| | βTerra | 0.313 | 0.224 to 0.407 | |
| M2 timing + geometry | βAqua | 0.181 | 0.056 to 0.298 | 0.596 |
| | βTerra | 0.305 | 0.224 to 0.393 | |
| | γ | −0.110 | −0.661 to 0.586 | |
| M3 one quadratic curve, log f = a·t² + b·t | b | 0.632 | 0.230 to 1.010 | 0.593 |
| | a | −0.016 | −0.032 to 0.001 | |
| M4 = M3 + geometry | γ | −0.110 | −0.699 to 0.564 | 0.594 |

**Geometry adds nothing.** On its own it explains R² = 0.003. Next to timing, γ is about zero with the wrong sign: M2's AIC is −312.8 against M1's −314.6.

**Do the two satellites need different slopes?** With linear slopes, the Terra slope is steeper: βA − βT = −0.12 (95% CI −0.30 to 0.05) in M2, and −0.14 (−0.27 to 0.00) in M1. That is borderline.

**One diurnal curve works.** A single concave curve shared by both satellites (M3) fits as well as separate slopes (AIC −314.2 vs −314.6). It rises steeply in the morning and flattens toward the afternoon. Its peak is not identified: the estimate is 19.6 h and the 95% CI is unbounded, so the data show the curve is still rising at 15:00 but cannot say where it peaks.

## Mediation path
Regressing Δg on Δt (by satellite) gives πA = 0.064 (SE 0.022) and πT = −0.077 (SE 0.009), with R² = 0.25. So the later Aqua orbit goes with a higher near-nadir share, and so does the earlier Terra orbit. Δg rises for both satellites (mean 0.025 for Aqua, 0.042 for Terra).

## Aqua, Amazon: how much of log L each cause accounts for
Share = component ÷ log L. Intervals are 95% region-bootstrap.

| year | L | Δt (h) | Δg | Confounder reading: timing | Confounder reading: geometry | Mediator reading: timing total | Mediator reading: geometry not caused by timing |
|---|---|---|---|---|---|---|---|
| 2024 | 1.099 | 0.71 | 0.100 | 137% (43 to 226) | −12% (−70 to 62) | 132% (63 to 202) | −6% (−43 to 30) |
| 2025 | 1.296 | 1.34 | 0.186 | 93% (29 to 154) | −8% (−47 to 42) | 90% (43 to 137) | −4% (−29 to 20) |

- In the **confounder reading**, Δg is a separate cause. Each share is that term's part of the M2 prediction.
- In the **mediator reading**, the part of Δg that Δt predicts counts as timing. Timing total = βA·Δt + γ·πA·Δt, which equals M1's slope exactly (OLS algebra). Geometry is left with only γ·(Δg − πA·Δt).
- **Residual:** the timing component is larger than log L itself (shares above 100%). In 2024 the model over-predicts log L, and the remainder is residual.

## View-angle bins (5 Brazil biomes × 2 satellites × 5 years × 6 scan bins, n = 300)
**Method.** L is computed per bin: MODIS detections in that bin ÷ (S-NPP total × the bin's own 2012–2020 monthly ratio). The fit is weighted least squares with weight √n. Intervals come from a bootstrap over the 10 (region, satellite) series. The bin totals reproduce the daily-file L exactly (maximum difference 0.0).

**Mean log L, 2021–2025:**

| scan bin | Aqua | Terra |
|---|---|---|
| 1.0 km | 0.134 | −0.128 |
| 1.1–1.2 km | 0.140 | −0.064 |
| 1.3–1.5 km | 0.074 | −0.177 |
| 1.6–2.2 km | 0.039 | −0.220 |
| 2.3–3.3 km | −0.019 | −0.191 |
| ≥ 3.4 km | 0.037 | −0.282 |

Aqua sits above 1 and Terra below 1 in every bin, so the split between the satellites is not produced by geometry.

**Amazon 2025 Aqua by bin:** L = 1.46 and 1.60 in the two nearest-nadir bins, against 0.89–0.93 for scan ≥ 1.6 km. Aqua's excess is therefore concentrated near nadir. That fits the idea that the smaller afternoon fires are detectable only at the finest pixels, which is timing acting through geometry.

**Bin regressions:**

| model | term | coef | 95% CI |
|---|---|---|---|
| B1: one slope per satellite, no fixed effects | βAqua | 0.169 | 0.101 to 0.274 |
| | βTerra | 0.280 | 0.193 to 0.357 |
| B2: one common slope + bin×year fixed effects | β | 0.229 | 0.171 to 0.304 |
| B4: a slope for each bin + bin×year fixed effects | slopes | 0.19 to 0.29 | each CI includes about 0.23 |
| B3: one slope per satellite + bin×year fixed effects | βAqua | 0.57 | 0.21 to 0.98 |
| | βTerra | −0.10 | −0.48 to 0.26 |

**Common slope across bins:** an F-test of B2 against B4 gives F = 1.57 with (5, 264) degrees of freedom, p = 0.17. One timing coefficient therefore explains all view-angle bins.

**Common slope across satellites:** B2 against B3 gives F = 6.52 with (1, 268) degrees of freedom, p = 0.011. This is weakly identified. The bin×year fixed effects absorb most of the Aqua-plus-Terra signal, leaving only the Aqua-minus-Terra contrast, and the resulting slopes (0.57 and −0.10) are not physically sensible.

## Verdict
Timing explains the change in L; the near-nadir share does not. At the unit level, Δg adds no explanatory power and its coefficient is about zero, whether it is treated as a confounder or as a mediator. Timing accounts for about 90% of Aqua Amazon log L in 2025 (95% CI roughly 30–150%), and for more than all of it in 2024.

Within fixed view-angle bins, one timing slope of about 0.23 log units per hour fits every bin. A single concave diurnal curve fits Terra and Aqua together as well as separate slopes do, so the two satellites are consistent with one curve that is steeper in the morning. The fixed-effects variant (B3) dissents, but it is poorly identified.

**Caveats:**
- There are only 80 units and 8 clusters (5 in the bin design), so the intervals are wide.
- Δt and Δg are collinear within each satellite (R² = 0.25).
- Δg is a crude measure of geometry. The bin table shows that Aqua's 2025 Amazon excess is concentrated near nadir. That pattern is best read as timing acting through detectability (the mediator reading), not as an independent sampling artefact.
