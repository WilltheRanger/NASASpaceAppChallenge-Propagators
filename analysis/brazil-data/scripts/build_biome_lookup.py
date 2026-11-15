"""Build a 0.1-degree cell -> Brazil biome lookup from INPE's own biome labels,
and INPE's daily reference-satellite counts per biome.

Usage: python3 build_biome_lookup.py INPE_DIR OUT_DIR
Inputs : INPE_DIR/focos_br_ref_YYYY.zip (INPE annual reference-satellite files)
Outputs: OUT_DIR/biome_lookup_0p1deg.csv   cell_lat, cell_lon, biome, n_points, share, source
         OUT_DIR/inpe_daily_by_biome.csv   date (UTC), biome, inpe_count

Note: the biome of each cell is the majority INPE label of the detections that fell in it
(2003-2025). Cells with no INPE detection take the label of the nearest labelled cell
within 3 cells (0.3 deg); source = "filled". This is NOT the IBGE polygon map itself.
"""
import sys, glob, os, zipfile
import numpy as np, pandas as pd

inpe_dir, out_dir = sys.argv[1], sys.argv[2]
ID = {"Amazônia": "amazon", "Cerrado": "cerrado", "Mata Atlântica": "mata_atlantica",
      "Caatinga": "caatinga", "Pantanal": "pantanal", "Pampa": "pampa"}
cells, daily = [], []
for f in sorted(glob.glob(os.path.join(inpe_dir, "focos_br_ref_*.zip"))):
    with zipfile.ZipFile(f) as z:
        with z.open(z.namelist()[0]) as fh:
            d = pd.read_csv(fh, usecols=["lat", "lon", "data_pas", "bioma"], skipinitialspace=True)
    d["biome"] = d.bioma.str.strip().map(ID)
    bad = d.biome.isna().sum()
    d = d.dropna(subset=["biome"])
    d["cell_lat"] = np.floor(d.lat * 10).astype(int)
    d["cell_lon"] = np.floor(d.lon * 10).astype(int)
    d["date"] = d.data_pas.str.slice(0, 10)
    cells.append(d.groupby(["cell_lat", "cell_lon", "biome"]).size().rename("n").reset_index())
    daily.append(d.groupby(["date", "biome"]).size().rename("inpe_count").reset_index())
    print(os.path.basename(f), len(d), "rows;", bad, "without biome")

c = pd.concat(cells).groupby(["cell_lat", "cell_lon", "biome"]).n.sum().reset_index()
tot = c.groupby(["cell_lat", "cell_lon"]).n.transform("sum")
c["share"] = (c.n / tot).round(3)
c = c.sort_values("n", ascending=False).drop_duplicates(["cell_lat", "cell_lon"])
c = c.rename(columns={"n": "n_points"}); c["source"] = "inpe_majority"

# fill empty cells from the nearest labelled cell, up to 3 cells away
names = sorted(ID.values()); code = {b: i for i, b in enumerate(names)}
la0, la1, lo0, lo1 = c.cell_lat.min() - 4, c.cell_lat.max() + 4, c.cell_lon.min() - 4, c.cell_lon.max() + 4
g = -np.ones((la1 - la0 + 1, lo1 - lo0 + 1), dtype=int)
g[c.cell_lat - la0, c.cell_lon - lo0] = c.biome.map(code)
filled = g.copy()
for _ in range(3):
    nxt = filled.copy()
    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
        sh = np.roll(np.roll(filled, dy, 0), dx, 1)
        m = (nxt < 0) & (sh >= 0)
        nxt[m] = sh[m]
    filled = nxt
yy, xx = np.where((g < 0) & (filled >= 0))
extra = pd.DataFrame({"cell_lat": yy + la0, "cell_lon": xx + lo0,
                      "biome": [names[i] for i in filled[yy, xx]],
                      "n_points": 0, "share": np.nan, "source": "filled"})
out = pd.concat([c[["cell_lat", "cell_lon", "biome", "n_points", "share", "source"]], extra])
out.sort_values(["cell_lat", "cell_lon"]).to_csv(os.path.join(out_dir, "biome_lookup_0p1deg.csv"), index=False)
dd = pd.concat(daily).groupby(["date", "biome"]).inpe_count.sum().reset_index()
dd.to_csv(os.path.join(out_dir, "inpe_daily_by_biome.csv"), index=False)
print("cells labelled:", len(c), "filled:", len(extra))
print("cells where the majority label has < 90% share:", int((c.share < 0.9).sum()))
print(dd.assign(year=dd.date.str[:4]).groupby("year").inpe_count.sum().to_string())
