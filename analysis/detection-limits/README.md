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

## First test results (2013 only, Aqua, isolated fires ≥ 1 acre; the full run comes after the downloads)
| Fire size | n | Detected by Aqua |
|---|---|---|
| 10–100 acres | 270 | 4.1% |
| 100–1,000 acres | 90 | 22.2% |
| > 1,000 acres | 11 | 63.6% |

- These numbers barely move across the variants (wide radius 4.8% / 24.4% / 63.6%).
- Aqua's a50 is about 890 acres (95% CI 540–1,650).
- Our rule is **stricter than Hawbaker 2008**, who allowed a whole year and used Landsat burn perimeters, so absolute numbers aren't comparable with the literature. The point is the **same rule for every satellite**: Aqua vs. Terra vs. VIIRS.

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
