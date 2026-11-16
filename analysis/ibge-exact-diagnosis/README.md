# Boundary-version diagnosis and exact-coordinate improvement

## What was wrong with the comparison?

The independent 2019 grid compared **different geographic definitions**. [INPE's official FAQ](https://data.inpe.br/queimadas/faq/) describes its biome attribute as IBGE **2004** and its classification as point/layer intersection. [IBGE's history](https://www.ibge.gov.br/geociencias/informacoes-ambientais/vegetacao/15842-biomas.html) distinguishes the original 1:5,000,000 map from the 2019 1:250,000 map. These definitions are not interchangeable.

The [official historical 1:5m archive](https://geoftp.ibge.gov.br/informacoes_ambientais/estudos_ambientais/biomas/vetores/Biomas_5000mil.zip) has metadata dated 2006 and files repackaged later. We call it **historical IBGE**, not a proven byte-identical copy of INPE's internal 2004 layer. An empirical test on all 222,797 INPE 2020 reference detections shows 97.6–99.7% label agreement by biome with the historical archive; 2019 agreement is notably lower for Caatinga (87.0%) and Cerrado (90.4%). See `inpe_label_diagnosis.csv` and confusion matrices. The sample does not prove every annual file uses the exact same map.

## Controlled comparisons

No thresholds, eligible months, count filters, or reference counts were changed. Exact-coordinate point-in-polygon classification removes grid approximation. All four methods conserve every original daily satellite/near-nadir count exactly.

| FIRMS biome definition | Baseline biome-months within 10% of published INPE count | P3 >=90% |
|---|---:|---|
| Original INPE-label-derived grid | 626/648 = 96.60% | pass |
| IBGE 2019 cell-center grid | 516/648 = 79.63% | fail |
| IBGE 2019 exact coordinates | 516/648 = 79.63% | fail |
| Historical IBGE exact coordinates | **628/648 = 96.91%** | **pass** |

The overall unchanged 2019 score after removing the grid does not mean every biome/month is unchanged; the detailed comparison preserves those differences. It supports boundary vintage rather than grid resolution as the dominant issue. Choosing the historical map is justified by the documented reference definition, **not** merely by its higher score. The failed 2019 analysis remains preserved on this branch and its parent.

## Full downstream rerun

`historical/` contains rebuilt raw-data aggregates. `statistics/` and `data/out/` contain the full six-region calendar/audit/two-clocks pipeline on the historical exact-coordinate definition. Brazil data were recomputed from all 47 raw NASA country files; non-Brazil regional inputs and independent proof artifacts are unchanged. All outputs are marked as an isolated candidate, not the live app.

Amazon 2025 L changes from **1.2948 to 1.2979** (95% interval **1.1390–1.5092**). This is still an observational comparison, not causal attribution. P3 remains non-preregistered. Other failures or ambiguous predictions are not erased; consult the regenerated `data/out/checks.json`.

## Remaining discrepancies

- Exact historical polygons leave about 1.14% of all detection rows unassigned, including water/border areas. No nearest-cell filling was applied to improve agreement.
- The historical archive includes water layers, which are not silently assigned to a biome.
- August 2020 already differs substantially between FIRMS and INPE even nationally in the original pipeline. NASA documents an [Aqua science-data outage starting August 16, 2020](https://ladsweb.modaps.eosdis.nasa.gov/alerts-and-issues/181306). That is a plausible separate coverage issue, **not** proof of the exact source of the count difference. Those months remain in P3; none were removed.
- This does not independently reclassify all INPE years, establish ground-truth fire events, or resolve causality. A 2019-on-both-sources experiment would answer a different question and is not substituted for reproducing published INPE labels.

## Verification

Five exact-classifier tests pass against each polygon edition (ten executions), the six-region JSON validator passes including P3, and exact daily count conservation passes for all methods. No integration merge, deployment or submission performed. Team review is required before replacing displayed figures.

## Reproduce

Use dependencies in `../ibge-validation/requirements.txt`; raw inputs stay outside the repository. `firms_exact.py` accepts the same CSV input/output directories as the original count script, plus `IBGE_ARCHIVE`:

```
IBGE_ARCHIVE=/path/Biomas_5000mil.zip python analysis/ibge-exact-diagnosis/firms_exact.py /path/firms analysis/ibge-exact-diagnosis/historical
```

Then run `inpe_reproduction.py` with the original independent INPE reference counts copied into that output directory, followed by `make_json.py`, `audit.py` and `checks.py` using the isolated directories. `summarize.py` checks count conservation, compares P3 methods, writes differences and labels variant JSON. `diagnose_labels.py` compares a raw INPE annual ZIP against both polygon editions. See `provenance.json` for hashes and URLs.

### Newly exposed failure, retained openly

Historical exact-coordinate classification changes **P5 from pass to fail**: the daily FRP-stratified result falls within the ordinary 95% interval in **28/29** eligible biome-years, not the required all 29. P1 remains pending; P7/P9/P10 remain failures. The corrected P3 agreement is not a claim that all scientific gates pass. Do not omit this sensitivity from the methods/limitations.

The complete sequence is automated in `recompute.sh` (arguments: FIRMS directory, historical map ZIP, 2019 map ZIP, INPE 2020 ZIP; `PYTHON` selects the environment).
