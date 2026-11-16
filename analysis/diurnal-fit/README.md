# diurnal-fit: FIRMS-only diurnal-cycle prediction of the Aqua audit ratio L

**Question.** Is Aqua's excess over its fixed-clock benchmark (L > 1) what the fire diurnal cycle predicts from the later look time, and does the same curve predict Terra's deficit?

**Run.** `.venv/bin/python analysis/diurnal-fit/diurnal_fit.py` (about 5 min; first run reads the raw FIRMS CSVs into `cache/hist.npz`, about 25 s), then `.venv/bin/python analysis/diurnal-fit/make_results.py` writes `results.md`. `NB=<n>` sets the number of bootstrap replicates (default 200).

## Method
1. Raw FIRMS MODIS C6.1, VIIRS S-NPP, VIIRS NOAA-20, 2012-2025, daytime (`daynight == 'D'`) detections, all confidence levels (same as `count_all`). Per-detection local solar time LST = UTC + lon/15 (mean solar time, no equation of time). Biome from `biome_lookup_0p1deg.csv` (floor(lat*10), floor(lon*10)). Histograms are per day, satellite and 5-minute LST bin (06:00-18:00).
2. A satellite is "up" on a day if it has any daytime detection anywhere in Brazil (same rule as `analysis/statistics/audit.py`). Aqua comparisons use Aqua and S-NPP up days, Terra comparisons use Terra and S-NPP up days.
3. Model, per biome and calendar month m: count C_s = k_s(m) * A * <f>_s. Here A is the fire activity on those days, k_s(m) is the sensor/swath sensitivity, f(t) = exp(-(t-mu)^2 / 2 sigma^2) is the Gaussian diurnal shape, and <f>_s = 1 / E_h[1/f]. h is the LST histogram of the satellite's own detections. Detections are sampled where the satellite looks (g) and weighted by fire activity, so h ∝ g·f and the mean activity over the look-time distribution is E_g[f] = 1/E_h[1/f].
4. Calibration: k_s(m) comes from 2012-2020 (Aqua and Terra each at a fixed clock). For drift year y, Q_s(y,m) = [C_s/C_V](y,m) / [C_s/C_V](2012-2020, m) = (<f>_s(y)/<f>_s(base)) / (<f>_V(y)/<f>_V(base)), with V = S-NPP. For Aqua, Q is exactly the audit L. (mu, sigma) is fitted by least squares on log Q for 2022-2025, July-October: either per month, or one shape for the whole Jul-Oct season.
5. Prediction: predicted L for a season is the sum over months of the expected count (S-NPP × baseline ratio) × exp(model log Q), divided by the summed expected count. Predicted F is the satellite's own factor <f>(y)/<f>(base), without the S-NPP term.
6. Variants. A3-A6 are strict: Terra drift only -> predict Aqua, and Aqua drift only -> predict Terra. B1 and B2 are anchored: they add the 2012-2020 Terra/Aqua count ratio as one more constraint per month, assuming k_Terra = k_Aqua. That is the Ellicott/Vermote/Andela identification. A1, A2 and B3 are in-sample fits using both satellites.
7. Uncertainty: 200-replicate stratified block bootstrap. Each (year, month) is cut into four ~8-day blocks, resampled with replacement. The whole pipeline is rerun per replicate (fits warm-started at the point estimate). A plain 16-day Poisson block bootstrap leaves single months empty in about 1 in 7 replicates, so it cannot be used for monthly fits. 8-day blocks may understate autocorrelation somewhat.

## Identification assumptions
- k_s(m) (MODIS vs VIIRS detection sensitivity, swath, cloud-masking behaviour) is the same in 2022-2025 as in 2012-2020 for that calendar month. Any non-timing change in Aqua/S-NPP (sensor ageing, fire-size mix, cloud/smoke climatology, scan-angle mix) is absorbed into the "diurnal" signal.
- The diurnal shape is the same in the baseline and drift years, and is the same Gaussian across the biome (no spatial heterogeneity in peak time).
- S-NPP's look time is fixed, so it is a pure day-to-day activity reference. Its LST term is in the model and turns out to be negligible.
- The strict variants (A) identify f only over the LST ranges each satellite actually moved through. Predicting the other satellite then relies entirely on the Gaussian form. The anchored variants (B) add the classical assumption that Terra and Aqua MODIS detect equally.
- Within-swath LST spread (about ±40 min for MODIS) is used through the histogram. Scan-angle sensitivity is assumed unchanged between periods.

## Limits
- July-October only. The annual Amazon L (1.30 in 2025) is not tested. Jul-Oct Amazon L is 1.12 in 2025.
- With only two shape parameters per biome, the strict cross-predictions are not identified (intervals span orders of magnitude). Only the anchored cross-predictions are informative, and they rest on k_Terra = k_Aqua.
- A pure Gaussian has no night-time background. Variants with a background term or a skewed shape were not tried.
- Fits sometimes hit the parameter bounds (mu = 22 h, sigma = 8 h), meaning "monotonic ramp". See the shape table in results.md.

## Files
- `diurnal_fit.py`: pipeline. `make_results.py`: writes `results.md`.
- `out/predicted_vs_observed.csv`, `out/shape_params.csv`, `out/lst_medians_jul_oct.csv`, `out/observed_L_daily_file_check.csv`.
- `cache/hist.npz` (daily LST histograms), `cache/run.log`.
