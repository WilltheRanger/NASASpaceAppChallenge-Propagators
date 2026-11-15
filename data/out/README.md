# data/out

Every number the app shows comes from the JSON files in this folder. All of them are real data from NASA FIRMS
(MODIS C6.1 and VIIRS 375 m), checked against INPE and USFS records where noted; each file carries `"mock": false`.
Synthetic placeholders used while the app was being built live in `data/mock/` and carry `"mock": true`.

| Folder or file | Written by | Contents |
|---|---|---|
| `drift/` | `analysis/brazil-data/scripts/make_json.py`, `analysis/statistics/audit.py`, `analysis/drift-regions/drift_regions.py` | Median local solar time of each satellite's near-nadir daytime detections, per year |
| `calendar/` | `analysis/statistics/audit.py` (first version by `analysis/brazil-data/scripts/make_json.py`) | Fixed-clock monthly counts, 2002 to 2025, with median and anomaly |
| `audit/`, `twoclocks/`, `fireday/`, `checks.json` | `analysis/statistics/audit.py`, `checks.py` | Clock audit L with intervals, two clocks, fire-day curve, predictions P1 to P10 |
| `detection_limits_california.json`, `proof_california.json`, `socal_seen_missed.json`, `california_fire_detections.csv.gz` | `analysis/detection-limits/spec_sheet.py` | California detection limits against agency-recorded fires |
| `daylight/` | `analysis/daylight/daylight.py` | Daylight left after each satellite's alert (see `analysis/daylight/README.md`) |
| `sim/amazon-2024-09-02.json` | `analysis/simulation/response_sim.py` | One fire day in Pará. The app reads only its real detections and pass times |
| `regions.json` | `analysis/statistics/audit.py` | The six preset regions and their boxes |

**AI disclosure:** the code that writes these files was written with AI assistance (see "Use of AI" in the main
README), so the data here is AI-assisted output. Team members ran the pipelines and reviewed the results. The daylight
files also carry `"ai_assisted": true`.
