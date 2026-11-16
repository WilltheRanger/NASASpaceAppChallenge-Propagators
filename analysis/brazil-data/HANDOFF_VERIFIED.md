# Brady data handoff verification

Verified 2026-11-14 late evening against integration commit `9bb73c4` (`will/beautiful-hawking-r06ab0`). No later statistics/simulation branches merged.

## Task status

- INPE/FIRMS aggregate inputs, 0.1-degree biome lookup, daily format, and Brazil JSON are committed. `brady/brazil-data` is an ancestor of the integration commit.
- Amazon/Cerrado daily data include Aqua, Terra, S-NPP, NOAA-20 and the near-nadir indicator. Definitions are in `README.md`.
- INPE reproduction: **626/648 eligible biome-months (96.6049%)** in 2012–2020 have all-daytime Aqua counts within 10% of INPE. Filtered counts: **81.6358%**. This is agreement of aggregate counts, **not** individual-fire matching, and P3 was not preregistered.
- Calendar JSON exists for all six presets: Amazon, Cerrado, Pantanal, Argentina, Punjab/Haryana, California. Each has 288 monthly rows and 282 non-null fixed estimates; first six months of 2002 remain null. The statistics lane's outputs replace the earlier raw-only preview. Two-clocks files are marked `preview: false`.
- **Scope deviation needing team acknowledgement:** the biome lookup uses majority INPE detection labels per cell and nearest-cell fill, not IBGE polygons. No claim of an IBGE-polygon-derived lookup should be made. Replacing it would require regenerating and reviewing every downstream result, not just relabeling the file.

## Recheck

```
python3 analysis/brazil-data/scripts/validate_handoff.py
```

The validator checks the six preset file families, real/preview markers, unique ordered calendar months, finite ordered intervals, and independently calculates the P3 aggregate agreement rate.

Raw multi-GB downloads were not reacquired or checked against fresh upstream releases. Verification covers committed aggregates and their derived output pipeline, not satellite-level ground truth or causation. Frontend deployment and submission are separate tasks.

## Reproduction result

In an isolated temporary output directory, reran `inpe_reproduction.py`, `audit.py`, and `checks.py` using Python 3.14, NumPy 2.5.4 and pandas 3.1.1. All exited successfully. Recursive byte comparisons against the committed Brazil aggregate outputs, statistics outputs and `data/out` found **no differences**. An initial audit invocation lacked the sibling `mock/regions.json` metadata dependency; supplying that existing metadata resolved it without code or result changes.
