# Diurnal-fit results (FIRMS only, July-October, daytime detections)
All numbers are written by `make_results.py` from `out/*.csv` (output of `diurnal_fit.py`). Intervals: 95% stratified 8-day-block bootstrap (200 replicates; see README). L for Terra is the Terra equivalent (Terra / (S-NPP x 2012-2020 Terra/S-NPP ratio)). predicted L includes the (small) S-NPP look-time term; predicted F is the satellite's own factor only.
## Headline: out-of-sample cross-predictions (2023-2025)
### B1 anchored cross: Terra drift + 2012-2020 Terra/Aqua (k_T=k_A), one shape -> predicts Aqua
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2023 | 1.037 [0.992, 1.079] | 1.076 [1.055, 1.092] | 1.069 [1.051, 1.083] | 0.964 [0.922, 1.012] |
| amazon | 2024 | 1.077 [1.028, 1.133] | 1.183 [1.123, 1.227] | 1.179 [1.119, 1.221] | 0.911 [0.852, 0.968] |
| amazon | 2025 | 1.124 [1.051, 1.214] | 1.319 [1.187, 1.419] | 1.320 [1.190, 1.417] | 0.852 [0.771, 0.958] |
| cerrado | 2023 | 1.041 [0.997, 1.093] | 1.022 [1.005, 1.038] | 1.021 [1.005, 1.036] | 1.019 [0.972, 1.075] |
| cerrado | 2024 | 1.166 [1.068, 1.231] | 1.048 [1.001, 1.093] | 1.047 [1.000, 1.091] | 1.113 [0.997, 1.188] |
| cerrado | 2025 | 1.056 [1.002, 1.099] | 1.069 [0.974, 1.159] | 1.071 [0.974, 1.165] | 0.988 [0.882, 1.096] |
### B2 anchored cross: Aqua drift + 2012-2020 Terra/Aqua (k_T=k_A), one shape -> predicts Terra
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2023 | 0.868 [0.804, 0.943] | 0.796 [0.779, 0.815] | 0.793 [0.777, 0.811] | 1.090 [1.010, 1.197] |
| amazon | 2024 | 0.808 [0.729, 0.886] | 0.642 [0.613, 0.674] | 0.640 [0.613, 0.671] | 1.257 [1.123, 1.403] |
| amazon | 2025 | 0.538 [0.486, 0.606] | 0.499 [0.466, 0.539] | 0.499 [0.467, 0.540] | 1.080 [0.943, 1.211] |
| cerrado | 2023 | 0.921 [0.866, 0.988] | 0.916 [0.893, 0.925] | 0.915 [0.892, 0.923] | 1.005 [0.945, 1.090] |
| cerrado | 2024 | 0.785 [0.719, 0.865] | 0.852 [0.815, 0.869] | 0.851 [0.813, 0.865] | 0.921 [0.841, 1.041] |
| cerrado | 2025 | 0.720 [0.661, 0.775] | 0.770 [0.712, 0.793] | 0.772 [0.713, 0.793] | 0.935 [0.844, 1.057] |
### A4 strict cross: Terra drift only, one shape -> predicts Aqua
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2023 | 1.037 [0.992, 1.079] | 1.099 [0.390, 1.118] | 1.090 [0.442, 1.103] | 0.944 [0.912, 2.642] |
| amazon | 2024 | 1.077 [1.028, 1.133] | 1.250 [0.075, 1.289] | 1.245 [0.083, 1.283] | 0.862 [0.824, 14.460] |
| amazon | 2025 | 1.124 [1.051, 1.214] | 1.464 [0.009, 1.545] | 1.465 [0.009, 1.554] | 0.768 [0.714, 121.000] |
| cerrado | 2023 | 1.041 [0.997, 1.093] | 1.049 [0.570, 1.061] | 1.047 [0.587, 1.058] | 0.992 [0.955, 1.878] |
| cerrado | 2024 | 1.166 [1.068, 1.231] | 1.121 [0.233, 1.150] | 1.118 [0.237, 1.147] | 1.040 [0.961, 5.075] |
| cerrado | 2025 | 1.056 [1.002, 1.099] | 1.216 [0.060, 1.273] | 1.221 [0.058, 1.282] | 0.869 [0.814, 17.750] |
### A6 strict cross: Aqua drift only, one shape -> predicts Terra
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2023 | 0.868 [0.804, 0.943] | 0.715 [0.469, 0.936] | 0.712 [0.463, 0.936] | 1.214 [0.900, 1.878] |
| amazon | 2024 | 0.808 [0.729, 0.886] | 0.519 [0.219, 0.886] | 0.518 [0.216, 0.884] | 1.555 [0.884, 3.752] |
| amazon | 2025 | 0.538 [0.486, 0.606] | 0.357 [0.093, 0.825] | 0.358 [0.093, 0.827] | 1.507 [0.655, 5.652] |
| cerrado | 2023 | 0.921 [0.866, 0.988] | 0.386 [0.210, 0.820] | 0.386 [0.210, 0.819] | 2.383 [1.090, 4.541] |
| cerrado | 2024 | 0.785 [0.719, 0.865] | 0.170 [0.054, 0.688] | 0.168 [0.054, 0.687] | 4.618 [1.064, 14.470] |
| cerrado | 2025 | 0.720 [0.661, 0.775] | 0.056 [0.009, 0.554] | 0.057 [0.009, 0.559] | 12.880 [1.296, 80.310] |
### A3 strict cross: Terra drift only, per month -> predicts Aqua
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2023 | 1.037 [0.992, 1.079] | 0.536 [0.409, 0.916] | 0.569 [0.442, 0.925] | 1.933 [1.129, 2.571] |
| amazon | 2024 | 1.077 [1.028, 1.133] | 0.371 [0.123, 1.014] | 0.377 [0.130, 1.012] | 2.903 [1.049, 8.763] |
| amazon | 2025 | 1.124 [1.051, 1.214] | 0.229 [0.053, 1.018] | 0.228 [0.051, 1.016] | 4.916 [1.125, 20.820] |
| cerrado | 2023 | 1.041 [0.997, 1.093] | 0.945 [0.589, 1.054] | 0.944 [0.604, 1.053] | 1.101 [0.967, 1.745] |
| cerrado | 2024 | 1.166 [1.068, 1.231] | 0.937 [0.372, 1.156] | 0.936 [0.375, 1.155] | 1.245 [0.986, 3.087] |
| cerrado | 2025 | 1.056 [1.002, 1.099] | 0.778 [0.247, 1.233] | 0.779 [0.238, 1.239] | 1.358 [0.854, 4.365] |
### A5 strict cross: Aqua drift only, per month -> predicts Terra
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2023 | 0.868 [0.804, 0.943] | 0.788 [0.567, 0.909] | 0.784 [0.560, 0.907] | 1.102 [0.928, 1.584] |
| amazon | 2024 | 0.808 [0.729, 0.886] | 0.626 [0.344, 0.857] | 0.625 [0.342, 0.856] | 1.289 [0.920, 2.402] |
| amazon | 2025 | 0.538 [0.486, 0.606] | 0.482 [0.207, 0.765] | 0.483 [0.208, 0.765] | 1.116 [0.739, 2.591] |
| cerrado | 2023 | 0.921 [0.866, 0.988] | 0.428 [0.308, 0.748] | 0.427 [0.306, 0.749] | 2.153 [1.231, 3.165] |
| cerrado | 2024 | 0.785 [0.719, 0.865] | 0.249 [0.115, 0.701] | 0.247 [0.114, 0.696] | 3.150 [1.151, 6.338] |
| cerrado | 2025 | 0.720 [0.661, 0.775] | 0.094 [0.037, 0.537] | 0.095 [0.038, 0.538] | 7.621 [1.411, 18.990] |
## In-sample fits (all 2022-2025, both satellites)
### A1 in-sample: Terra+Aqua drift, per month: Aqua
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2022 | 1.037 [0.976, 1.102] | 1.011 [1.006, 1.016] | 1.008 [1.005, 1.012] | 1.026 [0.967, 1.087] |
| amazon | 2023 | 1.037 [0.992, 1.079] | 1.043 [1.028, 1.059] | 1.038 [1.026, 1.050] | 0.995 [0.960, 1.030] |
| amazon | 2024 | 1.077 [1.028, 1.133] | 1.071 [1.040, 1.105] | 1.069 [1.039, 1.103] | 1.006 [0.969, 1.046] |
| amazon | 2025 | 1.124 [1.051, 1.214] | 1.130 [1.067, 1.200] | 1.130 [1.067, 1.197] | 0.994 [0.966, 1.021] |
| cerrado | 2022 | 1.002 [0.932, 1.078] | 1.009 [1.004, 1.015] | 1.006 [1.003, 1.009] | 0.993 [0.926, 1.068] |
| cerrado | 2023 | 1.041 [0.997, 1.093] | 1.026 [1.013, 1.037] | 1.026 [1.013, 1.035] | 1.014 [0.979, 1.064] |
| cerrado | 2024 | 1.166 [1.068, 1.231] | 1.050 [1.011, 1.077] | 1.048 [1.011, 1.076] | 1.111 [1.020, 1.178] |
| cerrado | 2025 | 1.056 [1.002, 1.099] | 1.090 [1.028, 1.134] | 1.093 [1.030, 1.143] | 0.969 [0.937, 1.011] |
### A1 in-sample: Terra+Aqua drift, per month: Terra
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2022 | 0.817 [0.747, 0.900] | 0.905 [0.883, 0.924] | 0.903 [0.881, 0.923] | 0.903 [0.828, 0.997] |
| amazon | 2023 | 0.868 [0.804, 0.943] | 0.840 [0.815, 0.867] | 0.836 [0.811, 0.864] | 1.034 [0.965, 1.128] |
| amazon | 2024 | 0.808 [0.729, 0.886] | 0.702 [0.657, 0.748] | 0.700 [0.655, 0.746] | 1.150 [1.035, 1.274] |
| amazon | 2025 | 0.538 [0.486, 0.606] | 0.584 [0.531, 0.635] | 0.584 [0.533, 0.636] | 0.923 [0.867, 0.972] |
| cerrado | 2022 | 0.988 [0.915, 1.063] | 0.944 [0.931, 0.955] | 0.942 [0.930, 0.952] | 1.047 [0.968, 1.135] |
| cerrado | 2023 | 0.921 [0.866, 0.988] | 0.890 [0.864, 0.906] | 0.890 [0.865, 0.906] | 1.034 [0.982, 1.112] |
| cerrado | 2024 | 0.785 [0.719, 0.865] | 0.789 [0.750, 0.825] | 0.788 [0.750, 0.823] | 0.994 [0.929, 1.081] |
| cerrado | 2025 | 0.720 [0.661, 0.775] | 0.707 [0.655, 0.748] | 0.709 [0.657, 0.752] | 1.017 [0.961, 1.077] |
### A2 in-sample: Terra+Aqua drift, one Jul-Oct shape: Aqua
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2022 | 1.037 [0.976, 1.102] | 1.014 [1.007, 1.022] | 1.011 [1.006, 1.017] | 1.023 [0.964, 1.082] |
| amazon | 2023 | 1.037 [0.992, 1.079] | 1.044 [1.030, 1.059] | 1.040 [1.028, 1.052] | 0.993 [0.956, 1.027] |
| amazon | 2024 | 1.077 [1.028, 1.133] | 1.094 [1.058, 1.131] | 1.092 [1.057, 1.127] | 0.985 [0.945, 1.030] |
| amazon | 2025 | 1.124 [1.051, 1.214] | 1.138 [1.072, 1.215] | 1.139 [1.072, 1.215] | 0.988 [0.953, 1.029] |
| cerrado | 2022 | 1.002 [0.932, 1.078] | 1.010 [1.005, 1.016] | 1.008 [1.004, 1.011] | 0.992 [0.924, 1.066] |
| cerrado | 2023 | 1.041 [0.997, 1.093] | 1.034 [1.018, 1.048] | 1.033 [1.017, 1.045] | 1.006 [0.968, 1.058] |
| cerrado | 2024 | 1.166 [1.068, 1.231] | 1.081 [1.040, 1.114] | 1.079 [1.038, 1.111] | 1.078 [0.998, 1.140] |
| cerrado | 2025 | 1.056 [1.002, 1.099] | 1.134 [1.051, 1.201] | 1.138 [1.053, 1.205] | 0.931 [0.890, 0.974] |
### A2 in-sample: Terra+Aqua drift, one Jul-Oct shape: Terra
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2022 | 0.817 [0.747, 0.900] | 0.903 [0.889, 0.920] | 0.901 [0.886, 0.918] | 0.904 [0.829, 0.996] |
| amazon | 2023 | 0.868 [0.804, 0.943] | 0.832 [0.810, 0.860] | 0.830 [0.807, 0.859] | 1.043 [0.963, 1.133] |
| amazon | 2024 | 0.808 [0.729, 0.886] | 0.701 [0.666, 0.755] | 0.699 [0.664, 0.752] | 1.153 [1.040, 1.270] |
| amazon | 2025 | 0.538 [0.486, 0.606] | 0.572 [0.519, 0.635] | 0.573 [0.521, 0.636] | 0.941 [0.857, 0.997] |
| cerrado | 2022 | 0.988 [0.915, 1.063] | 0.950 [0.937, 0.963] | 0.949 [0.936, 0.961] | 1.040 [0.965, 1.124] |
| cerrado | 2023 | 0.921 [0.866, 0.988] | 0.899 [0.876, 0.921] | 0.898 [0.875, 0.920] | 1.024 [0.961, 1.108] |
| cerrado | 2024 | 0.785 [0.719, 0.865] | 0.824 [0.784, 0.859] | 0.822 [0.783, 0.857] | 0.953 [0.883, 1.051] |
| cerrado | 2025 | 0.720 [0.661, 0.775] | 0.728 [0.670, 0.784] | 0.730 [0.671, 0.785] | 0.989 [0.910, 1.057] |
### B3 anchored in-sample: Terra+Aqua drift + anchor, one shape: Aqua
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2022 | 1.037 [0.976, 1.102] | 1.017 [1.008, 1.027] | 1.014 [1.009, 1.021] | 1.020 [0.962, 1.077] |
| amazon | 2023 | 1.037 [0.992, 1.079] | 1.056 [1.045, 1.070] | 1.051 [1.041, 1.062] | 0.982 [0.943, 1.020] |
| amazon | 2024 | 1.077 [1.028, 1.133] | 1.124 [1.091, 1.162] | 1.122 [1.090, 1.160] | 0.958 [0.910, 1.005] |
| amazon | 2025 | 1.124 [1.051, 1.214] | 1.194 [1.124, 1.281] | 1.195 [1.127, 1.286] | 0.942 [0.890, 0.993] |
| cerrado | 2022 | 1.002 [0.932, 1.078] | 1.009 [1.004, 1.013] | 1.006 [1.004, 1.009] | 0.993 [0.925, 1.069] |
| cerrado | 2023 | 1.041 [0.997, 1.093] | 1.029 [1.018, 1.039] | 1.028 [1.018, 1.037] | 1.012 [0.977, 1.064] |
| cerrado | 2024 | 1.166 [1.068, 1.231] | 1.067 [1.040, 1.094] | 1.066 [1.037, 1.092] | 1.092 [0.993, 1.151] |
| cerrado | 2025 | 1.056 [1.002, 1.099] | 1.108 [1.044, 1.167] | 1.111 [1.049, 1.170] | 0.953 [0.906, 0.992] |
### B3 anchored in-sample: Terra+Aqua drift + anchor, one shape: Terra
| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |
|---|---|---|---|---|---|
| amazon | 2022 | 0.817 [0.747, 0.900] | 0.896 [0.883, 0.909] | 0.893 [0.882, 0.905] | 0.912 [0.835, 1.007] |
| amazon | 2023 | 0.868 [0.804, 0.943] | 0.820 [0.805, 0.840] | 0.816 [0.802, 0.835] | 1.059 [0.980, 1.148] |
| amazon | 2024 | 0.808 [0.729, 0.886] | 0.680 [0.655, 0.718] | 0.678 [0.654, 0.715] | 1.188 [1.074, 1.327] |
| amazon | 2025 | 0.538 [0.486, 0.606] | 0.546 [0.511, 0.589] | 0.547 [0.513, 0.589] | 0.986 [0.898, 1.053] |
| cerrado | 2022 | 0.988 [0.915, 1.063] | 0.954 [0.945, 0.963] | 0.952 [0.944, 0.961] | 1.036 [0.964, 1.121] |
| cerrado | 2023 | 0.921 [0.866, 0.988] | 0.906 [0.890, 0.923] | 0.905 [0.889, 0.921] | 1.016 [0.956, 1.094] |
| cerrado | 2024 | 0.785 [0.719, 0.865] | 0.835 [0.807, 0.863] | 0.833 [0.805, 0.861] | 0.940 [0.867, 1.043] |
| cerrado | 2025 | 0.720 [0.661, 0.775] | 0.743 [0.702, 0.785] | 0.745 [0.704, 0.787] | 0.968 [0.894, 1.034] |
## Fitted Gaussian shapes (point estimate; mu = peak LST in hours, sigma in hours; bounds mu 8-22, sigma 0.5-8)
| biome | variant | month | mu | sigma |
|---|---|---|---|---|
| amazon | all_month | 7 | 15.39 | 3.10 |
| amazon | all_month | 8 | 14.68 | 3.09 |
| amazon | all_month | 9 | 14.66 | 3.29 |
| amazon | all_month | 10 | 17.86 | 4.64 |
| amazon | terra_only_month | 7 | 10.54 | 0.97 |
| amazon | terra_only_month | 8 | 10.04 | 0.58 |
| amazon | terra_only_month | 9 | 12.38 | 2.35 |
| amazon | terra_only_month | 10 | 10.43 | 1.28 |
| amazon | aqua_only_month | 7 | 16.69 | 4.44 |
| amazon | aqua_only_month | 8 | 14.40 | 2.18 |
| amazon | aqua_only_month | 9 | 14.83 | 3.77 |
| amazon | aqua_only_month | 10 | 15.30 | 2.63 |
| amazon | all_pooled | Jul-Oct | 15.41 | 3.44 |
| amazon | terra_only_pooled | Jul-Oct | 22.00 | 5.11 |
| amazon | aqua_only_pooled | Jul-Oct | 14.72 | 2.37 |
| amazon | terraB_anchor_pooled | Jul-Oct | 18.00 | 4.18 |
| amazon | aquaB_anchor_pooled | Jul-Oct | 15.06 | 2.98 |
| amazon | allB_anchor_pooled | Jul-Oct | 15.84 | 3.44 |
| cerrado | all_month | 7 | 22.00 | 7.93 |
| cerrado | all_month | 8 | 14.81 | 3.73 |
| cerrado | all_month | 9 | 14.86 | 3.90 |
| cerrado | all_month | 10 | 22.00 | 8.00 |
| cerrado | terra_only_month | 7 | 19.90 | 8.00 |
| cerrado | terra_only_month | 8 | 22.00 | 5.90 |
| cerrado | terra_only_month | 9 | 12.45 | 2.83 |
| cerrado | terra_only_month | 10 | 10.55 | 1.91 |
| cerrado | aqua_only_month | 7 | 14.48 | 1.33 |
| cerrado | aqua_only_month | 8 | 14.40 | 1.99 |
| cerrado | aqua_only_month | 9 | 14.32 | 1.42 |
| cerrado | aqua_only_month | 10 | 14.55 | 1.45 |
| cerrado | all_pooled | Jul-Oct | 17.31 | 5.42 |
| cerrado | terra_only_pooled | Jul-Oct | 22.00 | 6.96 |
| cerrado | aqua_only_pooled | Jul-Oct | 14.43 | 1.42 |
| cerrado | terraB_anchor_pooled | Jul-Oct | 15.54 | 4.76 |
| cerrado | aquaB_anchor_pooled | Jul-Oct | 18.39 | 6.39 |
| cerrado | allB_anchor_pooled | Jul-Oct | 16.73 | 5.39 |

## Median LST of daytime detections, July-October (5-minute bins)
| biome | satellite | 2012-2020 | 2022 | 2023 | 2024 | 2025 |
|---|---|---|---|---|---|---|
| amazon | Terra | 10.54 | 10.29 | 10.04 | 9.71 | 9.29 |
| amazon | Aqua | 13.54 | 13.62 | 13.88 | 14.29 | 14.88 |
| amazon | S-NPP | 13.54 | 13.54 | 13.54 | 13.54 | 13.54 |
| amazon | NOAA-20 | 13.54 | 13.54 | 13.54 | 13.54 | 13.54 |
| cerrado | Terra | 10.46 | 10.21 | 9.96 | 9.62 | 9.21 |
| cerrado | Aqua | 13.71 | 13.79 | 13.96 | 14.38 | 14.96 |
| cerrado | S-NPP | 13.62 | 13.54 | 13.54 | 13.54 | 13.62 |
| cerrado | NOAA-20 | 13.54 | 13.54 | 13.62 | 13.54 | 13.54 |

## Check: observed L recomputed from analysis/brazil-data/out/firms_daily_by_biome.csv (count_all)
| biome | satellite | year | L (daily file) | L (raw FIRMS, this script) |
|---|---|---|---|---|
| amazon | Aqua | 2022 | 1.0370 | 1.0370 |
| amazon | Aqua | 2023 | 1.0370 | 1.0370 |
| amazon | Aqua | 2024 | 1.0770 | 1.0770 |
| amazon | Aqua | 2025 | 1.1240 | 1.1240 |
| amazon | Terra | 2022 | 0.8172 | 0.8172 |
| amazon | Terra | 2023 | 0.8682 | 0.8682 |
| amazon | Terra | 2024 | 0.8076 | 0.8076 |
| amazon | Terra | 2025 | 0.5385 | 0.5385 |
| cerrado | Aqua | 2022 | 1.0020 | 1.0020 |
| cerrado | Aqua | 2023 | 1.0410 | 1.0410 |
| cerrado | Aqua | 2024 | 1.1660 | 1.1660 |
| cerrado | Aqua | 2025 | 1.0560 | 1.0560 |
| cerrado | Terra | 2022 | 0.9881 | 0.9881 |
| cerrado | Terra | 2023 | 0.9206 | 0.9206 |
| cerrado | Terra | 2024 | 0.7847 | 0.7847 |
| cerrado | Terra | 2025 | 0.7196 | 0.7196 |

## Reading (numbers from the tables above)

- **Strict identification (sensor calibration from 2012-2020 only, A3-A6) cannot cross-predict.** Terra's drift (Amazon median LST 10.54 h -> 9.29 h) only sees the morning ramp; Aqua's drift (13.54 h -> 14.88 h) only sees the afternoon peak. A Gaussian fitted to one side is not pinned down on the other: Terra-only -> Aqua intervals span ~0.01 to ~1.5; Aqua-only -> Terra fails outright in the Cerrado (predicts 0.06 for 2025 vs observed 0.72) because Aqua alone prefers a narrow (sigma ~1.4 h) peak.
- **With the literature anchor (B1, B2; Terra and Aqua MODIS assumed equally sensitive, as in Ellicott 2009 / Andela 2015), both cross-predictions land in the right range**: the timing-only model predicts the Aqua excess (Amazon 2025: 1.32 predicted vs 1.12 observed, i.e. it *over*-predicts) and the Terra deficit (Amazon 2025: 0.50 vs 0.54). Misses are year-specific, up to ~15-25% (Amazon 2024 Terra 1.26x observed/predicted; Amazon 2025 Aqua 0.85x; Cerrado 2024 Aqua 1.11x).
- **In-sample (A1, A2, B3)** one Gaussian per biome reproduces both satellites' Jul-Oct L within ~0-15%, with the largest residuals Amazon Terra 2024 (+15%) and Cerrado Aqua 2024 (+8 to +11%).
- July-October Amazon L is 1.12 in 2025 (not the annual 1.30); the annual figure is not tested here.
