# Data acquisition

`get_reference_data.sh` downloads Anchor's reference ("ground truth") data and the NASA FIRMS files.
`get_wfigs.py` pages through the NIFC WFIGS service.
Raw files go to `data/raw/` and are **not** committed.

```bash
bash analysis/data-acquisition/get_reference_data.sh data/raw
```

## What each source is (checked Nov 14, 2026)

| Source | What we verified | Role in Anchor |
|---|---|---|
| **FPA-FOD 7th ed.** (USFS RDS-2013-0009.7, released June 2026) | GeoPackage `FPA_FOD_20260615.gpkg`, table `Fires`, **2,661,383 records, 1992–2024**, 39 fields. Fields include `DISCOVERY_DATE/TIME`, `CONT_DATE/TIME`, `FIRE_SIZE` (acres), `LATITUDE/LONGITUDE`, `NWCG_GENERAL_CAUSE` and `MTBS_ID` | **Main reference** for all fitting, 1992–2024 |
| ↳ California subset | 104,438 fires in 2012–2024 (5,791 ≥ 10 acres); 103,857 in 2001–2011. Discovery time filled for 97% and containment date for 66% of 2012–2024 CA records | MVP region |
| ↳ "Debris and open burning" cause | 240,133 US fires, 2012–2024 | Proxy for small managed or agricultural burns |
| **NIFC WFIGS** | ~392.6k wildfire (WF) + 38,818 prescribed (RX) records. Effectively 2014 onward; less complete than FPA-FOD. Max 2,000 records per request (the script pages) | 2025–26 only, after calibrating it against FPA-FOD on 2014–2024. RX = managed-burn proxy |
| **Canada CNFDB** fire points | `NFDB_point_txt.zip`, ~24 MB, updated Aug 2026, all fire sizes | Transfer test #1 (boreal) |
| **MapBiomas Fogo** Collection 5 (Brazil) | Landsat 30 m monthly burned area, 1985–2024/25. Per its ATBD, a neural net trained on Landsat; MODIS/INPE hotspots appear in its evaluation, not as inputs. GEE asset `projects/mapbiomas-public/assets/brazil/fire/collection5/mapbiomas_fire_collection5_monthly_burned_v1` | Transfer test #2: monthly calendar check where pasture and crop burning dominates |
| **NASA FIRMS** yearly country CSVs | Exist for MODIS, S-NPP (`viirs-snpp`), NOAA-20 (`viirs-jpss1`). **No NOAA-21 yearly file** (404). Public 7-day files need no key | The satellite data being calibrated |
| ~~ESA Fire_cci Small Fire Dataset~~ | v2.0 (2019) uses VIIRS active fires as an input and v1.1 (2016) uses MODIS | **Don't** use it to judge VIIRS/MODIS: that's circular |

## Gotchas
- **FIRMS is overloaded this weekend.** The script fetches in 4 MB ranges with retries (`../drift-check/chunked_get.sh`). Start downloads early, or file a FIRMS Archive Download request for a California polygon; it arrives by email.
- **FPA-FOD dates.** `CONT_DATE` is missing for about a third of fires. Use a size-based duration fallback and test the sensitivity.
- **Reference drift.** Never splice FPA-FOD (≤2024) and WFIGS (2025–26) without calibrating them against each other on the overlap years. Otherwise the switch itself creates a fake trend.
