# California detection-limit spec sheet (FINAL PLAN §4.6)

> **AI-generated code and analysis (Claude, cloud session), to be reviewed by the team before any number is used.** Log it in the SI disclosure.

**Question:** of the fires California agencies actually recorded, what share did each satellite detect, by fire size? At what size does each satellite catch 50% or 90% of fires (a50, a90)? This tests prediction **P8**: a50(VIIRS) < a50(Aqua), with intervals that don't overlap.

## Data
- **USFS FPA-FOD 7th ed.** (RDS-2013-0009.7, June 2026): California fires, 2012–2024.
- **NASA FIRMS** yearly US files: MODIS C6.1 (Terra, Aqua) and VIIRS 375 m S-NPP. Download them with `../data-acquisition/get_reference_data.sh`, or use any folder of `*_United_States.csv.gz` files.

## Rule (as written in the plan, applied unchanged)
- A fire counts as **detected** by a satellite when that satellite has a hotspot within **√(area/π) + 1 km** of the fire's reported point, between **discovery − 2 h** and **containment + 12 h**.
- Only **isolated** fires are used: no other recorded fire within 10 km whose time window overlaps.
- Hotspot filters match the calendar: vegetation type (`type == 0`); MODIS confidence ≥ 30; VIIRS confidence `n`/`h`.
- **Missing times:**
  - a missing discovery time becomes the start of the local day;
  - a missing (or impossible) containment date falls back to a duration by NWCG size class: A, B = 1 day; C = 2 days; D, E = 4 days; F = 10 days; G = 30 days.

## Sensitivity variants (reported side by side, never mixed into the main result)
| Variant | Why |
|---|---|
| all fires (not only isolated) | Isolation drops many large fires that burn in complexes |
| all confidence levels | Low-confidence detections can be real small fires |
| radius + half the pixel diagonal | MODIS pixels grow to ~2×4.8 km at the swath edge |
| wide radius, 2·√(area/π) + 1 km | Wind-driven fires run far from their reported point |
| known containment date only | See the data caveat below |

## Data caveat to state on the slide
- FPA-FOD California has containment dates for **80–93% of fires in most years**, but only **34% in 2012, 20% in 2019 and 13% in 2020**. Those years lean on the fallback durations.
- Compare years with the "known containment only" variant before claiming any change over time.

## Results: full run, 2012–2024 (AI-generated; the team must review before use)

Isolated California fires of at least 1 acre, 2012–2020: 14,430 fires, checked against each satellite with the same rule.

| Satellite | a50 (acres, 95% CI) | a90 (acres, 95% CI) | 10–100 acres | 100–1,000 acres | > 1,000 acres |
|---|---|---|---|---|---|
| VIIRS (S-NPP) | **319** (271–375) | 7,111 (5,364–9,319) | 16.7% | 38.4% | 82.4% |
| Aqua (MODIS) | **947** (777–1,168) | 11,866 (8,670–16,626) | 6.2% | 23.6% | 68.8% |
| Terra (MODIS) | **1,262** (1,021–1,539) | 14,372 (10,146–19,783) | 4.0% | 18.6% | 66.8% |

- **P8 passes:** a50(VIIRS) < a50(Aqua), and the intervals don't overlap (271–375 vs. 777–1,168 acres). VIIRS catches half of all fires at about **one third** of the size Aqua needs.
- **Robust:** every sensitivity variant (wide radius, pixel-aware radius, all confidence levels, known containment only, all fires) moves the rates by only a few points. See `detection_limits_california.json`.
- **2021–2024 check:** there is **no detectable change** in Aqua's detection rate relative to VIIRS. The per-year numbers are noisy: the over-1,000-acre class has only 9–29 fires per year. That is expected, because Aqua was at most about 34 minutes late over the US by 2024. Say so plainly on the slide.
- **Local hook:** 358 recorded fires of at least 1 acre burned within 25 km of Chino Hills in 2012–2024.
  - VIIRS saw 20, Aqua 10 and Terra 8. **338 (94%) were seen by none of them.**
  - The largest fires were seen by all three: Blue Ridge (2020, 13,694 acres) and Canyon 2 (2017, 9,217 acres).
- **Caveat:** our rule is stricter than the literature's (Hawbaker 2008 allowed a whole year), so our absolute a50s are larger. Compare the satellites with each other, not with the papers.

## Outputs (written to `--out`, normally `data/out/`)
| File | What |
|---|---|
| `detection_limits_california.json` | Per satellite: 2012–2020 detection rates by size class with Wilson 95% CIs, a50 and a90 (acres) with bootstrap CIs, and every sensitivity variant |
| `proof_california.json` | App contract: per year and size class, `aqua_pod`, `terra_pod`, `viirs_pod`, `n` |
| `socal_seen_missed.json` | Local hook: recorded fires ≥ 1 acre within 25 km of Chino Hills, with which satellites caught each |
| `california_fire_detections.csv.gz` | One row per fire with every detection flag, for checking by hand |

## Run
```bash
python3 analysis/detection-limits/spec_sheet.py --fpafod FPA_FOD_20260615.gpkg --firms data/raw/firms --out data/out --years 2012-2024
```
It needs only `pandas` and `numpy`, and takes about 4 seconds per year.
