# Slide figures

Five 16:9 charts (1920 × 1080), each in a light and a dark version, drawn from the pipeline outputs. Every value on them matches `analysis/statistics/FACTS.md`; rerun after the pipeline rather than editing images.

```
python3 analysis/figures/make_figures.py data/out analysis/brazil-data/out analysis/figures/out
```

| File | Shows | Source |
|---|---|---|
| `1-look-times-*.png` | Amazon look times 2012–2025: Aqua 13:37 → 14:57, S-NPP flat near 13:33, Terra 10:27 → 09:12 | `analysis/brazil-data/out/firms_drift_by_biome.csv` |
| `2-audit-amazon-*.png` | Amazon L by year with 95% intervals and the pre-drift range; 2025: 43,002 counted vs 33,172 predicted | `data/out/audit/br-amazon.json`, `analysis/statistics/out/placebo_by_biome.csv` |
| `3-official-vs-fixed-*.png` | INPE's official Amazon count vs the fixed-clock estimate, 2012–2025; 2024 → 2025: −69.3% vs −73.9% | INPE reference files, `data/out/calendar/br-amazon.json` |
| `4-response-*.png` | Helicopter sorties before sunset by alert pass, 3 h FIRMS delay: Terra 5, VIIRS 2, Aqua 0 | `data/out/sim/amazon-2024-09-02.json` |
| `5-regions-2025-*.png` | 2025 L by region with intervals and pre-drift ranges | `data/out/audit/<region>.json` |

Colours are the first three slots of a validated categorical palette (checked for colour-vision deficiency on both surfaces); every line carries a direct label, so no reading depends on colour alone. Each chart's source line names the file it reads. Figure 4's fleet and bases are illustrative; keep that caveat on the slide.
