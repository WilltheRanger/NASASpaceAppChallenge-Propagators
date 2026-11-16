"""Write results.md tables from out/*.csv (produced by diurnal_fit.py). Usage: python analysis/diurnal-fit/make_results.py"""
import os
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "out")
S = pd.read_csv(os.path.join(OUT, "predicted_vs_observed.csv"))
P = pd.read_csv(os.path.join(OUT, "shape_params.csv"))
LST = pd.read_csv(os.path.join(OUT, "lst_medians_jul_oct.csv"))
CHK = pd.read_csv(os.path.join(OUT, "observed_L_daily_file_check.csv"))

ci = lambda v, lo, hi: f"{v:.3f} [{lo:.3f}, {hi:.3f}]"
LABEL = {
    "all_month": "A1 in-sample: Terra+Aqua drift, per month",
    "all_pooled": "A2 in-sample: Terra+Aqua drift, one Jul-Oct shape",
    "terra_only_month": "A3 strict cross: Terra drift only, per month",
    "terra_only_pooled": "A4 strict cross: Terra drift only, one shape",
    "aqua_only_month": "A5 strict cross: Aqua drift only, per month",
    "aqua_only_pooled": "A6 strict cross: Aqua drift only, one shape",
    "terraB_anchor_pooled": "B1 anchored cross: Terra drift + 2012-2020 Terra/Aqua (k_T=k_A), one shape",
    "aquaB_anchor_pooled": "B2 anchored cross: Aqua drift + 2012-2020 Terra/Aqua (k_T=k_A), one shape",
    "allB_anchor_pooled": "B3 anchored in-sample: Terra+Aqua drift + anchor, one shape",
}


def table(df):
    h = "| biome | year | observed L | predicted L | predicted F (satellite only) | observed / predicted |\n|---|---|---|---|---|---|\n"
    for r in df.sort_values(["biome", "year"]).itertuples():
        h += (f"| {r.biome} | {r.year} | {ci(r.L_obs, r.L_obs_lo, r.L_obs_hi)} | {ci(r.L_pred, r.L_pred_lo, r.L_pred_hi)} | "
              f"{ci(r.F_sat, r.F_sat_lo, r.F_sat_hi)} | {ci(r.obs_over_pred, r.ratio_lo, r.ratio_hi)} |\n")
    return h


md = ["# Diurnal-fit results (FIRMS only, July-October, daytime detections)\n",
      "All numbers are written by `make_results.py` from `out/*.csv` (output of `diurnal_fit.py`). "
      "Intervals: 95% stratified 8-day-block bootstrap (200 replicates; see README). "
      "L for Terra is the Terra equivalent (Terra / (S-NPP x 2012-2020 Terra/S-NPP ratio)). "
      "predicted L includes the (small) S-NPP look-time term; predicted F is the satellite's own factor only.\n"]

md.append("## Headline: out-of-sample cross-predictions (2023-2025)\n")
for v, s in [("terraB_anchor_pooled", "Aqua"), ("aquaB_anchor_pooled", "Terra"),
             ("terra_only_pooled", "Aqua"), ("aqua_only_pooled", "Terra"),
             ("terra_only_month", "Aqua"), ("aqua_only_month", "Terra")]:
        md.append(f"### {LABEL[v]} -> predicts {s}\n")
        md.append(table(S[(S.variant == v) & (S.sat == s) & (S.year >= 2023)]))

md.append("## In-sample fits (all 2022-2025, both satellites)\n")
for v in ["all_month", "all_pooled", "allB_anchor_pooled"]:
    for s in ["Aqua", "Terra"]:
        md.append(f"### {LABEL[v]}: {s}\n")
        md.append(table(S[(S.variant == v) & (S.sat == s)]))

md.append("## Fitted Gaussian shapes (point estimate; mu = peak LST in hours, sigma in hours; bounds mu 8-22, sigma 0.5-8)\n")
md.append("| biome | variant | month | mu | sigma |\n|---|---|---|---|---|\n")
for r in P.itertuples():
    mo = r.month if "month" in r.variant else "Jul-Oct"
    md.append(f"| {r.biome} | {r.variant} | {mo} | {r.mu:.2f} | {r.sigma:.2f} |\n")

md.append("\n## Median LST of daytime detections, July-October (5-minute bins)\n")
md.append("| biome | satellite | " + " | ".join(LST.period.unique()) + " |\n|---|---|" + "---|" * LST.period.nunique() + "\n")
for (b, s), g in LST.groupby(["biome", "sat"], sort=False):
    md.append(f"| {b} | {s} | " + " | ".join(f"{h:.2f}" for h in g.lst_median_h) + " |\n")

md.append("\n## Check: observed L recomputed from analysis/brazil-data/out/firms_daily_by_biome.csv (count_all)\n")
md.append("| biome | satellite | year | L (daily file) | L (raw FIRMS, this script) |\n|---|---|---|---|---|\n")
for r in CHK.itertuples():
    raw = S[(S.biome == r.biome) & (S.sat == r.sat) & (S.year == r.year) & (S.variant == "all_month")].L_obs.iloc[0]
    md.append(f"| {r.biome} | {r.sat} | {r.year} | {r.L_daily_file:.4f} | {raw:.4f} |\n")

with open(os.path.join(HERE, "results.md"), "w") as f:
    f.write("\n".join(md) if False else "".join(x if x.endswith("\n") else x + "\n" for x in md))
print("wrote results.md")
