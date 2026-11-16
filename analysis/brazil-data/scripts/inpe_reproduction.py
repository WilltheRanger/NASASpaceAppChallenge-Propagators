"""P3 check: do FIRMS Aqua daytime counts reproduce INPE's reference-satellite counts?

Usage: python3 inpe_reproduction.py OUT_DIR
Inputs : OUT_DIR/firms_daily_by_biome.csv, OUT_DIR/inpe_daily_by_biome.csv
Outputs: OUT_DIR/inpe_reproduction_yearly.csv   year, biome, inpe, firms_aqua_all, firms_aqua_filtered, ratio_all, ratio_filtered
         OUT_DIR/inpe_reproduction_monthly.csv  ym, biome, inpe, firms_aqua_all, firms_aqua_filtered
         OUT_DIR/inpe_reproduction_summary.csv  biome, years, monthly_r2_all, monthly_r2_filtered, median/min/max yearly ratio
ratio = FIRMS Aqua daytime count / INPE count. "all" = every daytime Aqua detection;
"filtered" = type 0 and confidence >= 30. INPE years 2003-2025; biome "brazil" = all biomes.
"""
import sys, os
import numpy as np, pandas as pd
out = sys.argv[1]
f = pd.read_csv(os.path.join(out, "firms_daily_by_biome.csv"))
i = pd.read_csv(os.path.join(out, "inpe_daily_by_biome.csv"))
a = f[(f.satellite == "Aqua") & (f.biome != "unassigned")].groupby(["date", "biome"])[["count_all", "count"]].sum().reset_index()
m = a.merge(i, on=["date", "biome"], how="outer").fillna(0)
m = m[(m.date >= "2003-01-01") & (m.date <= "2025-12-31")]
m = pd.concat([m, m.groupby("date")[["count_all", "count", "inpe_count"]].sum().reset_index().assign(biome="brazil")])
m = m.rename(columns={"count_all": "firms_aqua_all", "count": "firms_aqua_filtered", "inpe_count": "inpe"})
m["year"] = m.date.str[:4].astype(int); m["ym"] = m.date.str[:7]
cols = ["inpe", "firms_aqua_all", "firms_aqua_filtered"]
y = m.groupby(["year", "biome"])[cols].sum().reset_index()
y["ratio_all"] = (y.firms_aqua_all / y.inpe).round(4); y["ratio_filtered"] = (y.firms_aqua_filtered / y.inpe).round(4)
y[cols] = y[cols].astype(int)
y.to_csv(os.path.join(out, "inpe_reproduction_yearly.csv"), index=False)
mo = m.groupby(["ym", "biome"])[cols].sum().reset_index(); mo[cols] = mo[cols].astype(int)
mo.to_csv(os.path.join(out, "inpe_reproduction_monthly.csv"), index=False)
rows = []
for b, g in mo.groupby("biome"):
    yy = y[y.biome == b]
    rows.append(dict(biome=b, years="2003-2025",
        monthly_r2_all=round(np.corrcoef(g.inpe, g.firms_aqua_all)[0, 1] ** 2, 4),
        monthly_r2_filtered=round(np.corrcoef(g.inpe, g.firms_aqua_filtered)[0, 1] ** 2, 4),
        ratio_all_median=yy.ratio_all.median(), ratio_all_min=yy.ratio_all.min(), ratio_all_max=yy.ratio_all.max(),
        ratio_filtered_median=yy.ratio_filtered.median(), ratio_filtered_min=yy.ratio_filtered.min(), ratio_filtered_max=yy.ratio_filtered.max()))
s = pd.DataFrame(rows); s.to_csv(os.path.join(out, "inpe_reproduction_summary.csv"), index=False)
print(s.to_string(index=False))
print(y[y.biome == "brazil"].to_string(index=False))
