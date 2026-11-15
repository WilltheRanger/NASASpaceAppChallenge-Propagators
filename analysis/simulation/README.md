# Response simulation: daylight left by satellite pass

Helicopters and ground crews dispatched to real fires on one day, with each satellite pass as the alert source. The question: when a fire is first reported by a given pass, how much daylight is left to respond? It connects the clock audit to response: Aqua's drift moved its pass toward sunset.

## Run
```
# FIRMS 2024 Brazil files (MODIS, S-NPP, NOAA-20), about 360 MB, outside the repo
python3 analysis/simulation/response_sim.py RAW/Brazil data/out/sim
python3 analysis/simulation/make_preview.py data/out/sim/amazon-2024-09-02.json analysis/simulation/preview.html
```
Open `preview.html` through any local web server (for example `python3 -m http.server --directory analysis/simulation`). It is self-contained apart from Leaflet 1.9.4 and Esri imagery tiles.

## Scenario
- **Day and area:** 2 September 2024, the year's peak daytime detection day in the BR-163 to São Félix do Xingu belt of Pará (box 56.5–51.5° W, 8.5–5.5° S). 10,632 daytime detections from MODIS (Terra, Aqua) and VIIRS (S-NPP, NOAA-20).
- **Fires:** detections in touching 0.05° cells (about 5.5 km) form one fire: 92 fires. Intensity = summed FRP.
- **Passes over the area (median local solar time):** Terra 09:48, S-NPP 13:36, NOAA-20 13:59, Aqua 14:32. Sunset 18:00.
- **Alert:** a pass reaches the dispatcher as one batch, at the end of the pass over the area plus a delay. Two cases: 0 h (best case) and 3 h, the bound NASA states for FIRMS near-real-time data ("within 3 hours of a satellite observation").
- **Fleet (illustrative, not real deployments):**
  - Bases at Novo Progresso, São Félix do Xingu and Castelo de Sonhos.
  - 2 helicopters: 200 km/h, 20 min to launch, 45 min on scene, must finish before sunset, return to base after each fire, 250 km range.
  - 5 ground crews: 40 km/h with a 1.4 road factor, 30 min to depart, 3 h on the fire line, 150 km range.
- **Dispatch rule:** fires are served in alert order and, within a pass, most intense first. The unit with the earliest arrival goes. A response counts only if the unit arrives within 8 h of the alert.

## Results (`data/out/sim/amazon-2024-09-02.json`)
| Alert source | Delay | Alert at | Daylight left | Fires alerted | Helicopter sorties | Fires reached |
|---|---|---|---|---|---|---|
| Terra | 0 h | 10:02 | 7 h 58 min | 35 | 7 | 16 |
| VIIRS | 0 h | 13:44 | 4 h 16 min | 87 | 4 | 13 |
| Aqua | 0 h | 14:47 | 3 h 13 min | 58 | 4 | 12 |
| Terra | 3 h | 13:02 | 4 h 58 min | 35 | 5 | 14 |
| VIIRS | 3 h | 16:44 | 1 h 16 min | 87 | 2 | 10 |
| Aqua | 3 h | 17:47 | 0 h 13 min | 58 | 0 | 8 |

- With the 3 h delay, an alert from Aqua's afternoon pass arrives 13 minutes before sunset, and no helicopter can be used. The VIIRS pass leaves time for two sorties.
- VIIRS reports the most fires (87 of 92) because it detects smaller fires; Terra's morning pass reports 35, but early.
- Ground crews respond regardless of daylight, but they are slow over these distances.

## What this does and does not show
- It shows how pass timing and data delay bound the daylight available for an aerial response, on a real fire day with real pass times.
- It does not model fire spread, weather, terrain, roads, crew rules, or INPE's operational alert system, which combines all satellites. Fleet, bases and speeds are assumptions chosen to be plausible; change them in `response_sim.py` and the outputs follow.
- Units are not real deployments, and the results are not operational advice.

## Worldwide: any place, live data

Search a place, get the last 7 days of real detections there, and run the same simulation. The site stays static (GitHub Pages); there is no server and no API key.

### Data flow
1. **Fetch (scheduled build).** `live_tiles.py` downloads FIRMS's keyless global 7-day files: MODIS C6.1 (Terra, Aqua) and VIIRS C2 (NOAA-20, NOAA-21). S-NPP has been off since 2 November 2026; its file is empty. The files update about hourly.
2. **Tile.** Daytime detections are cut into 10° tiles of rows `[lat, lon, utc_date, utc_hhmm, satellite, frp]`, with an `index.json` (tiles, counts per day, update time) and `places.json` (Natural Earth populated places, public domain).
3. **Publish.** The tiles go into `frontend/public/live/` before `vite build`, so the browser reads them from the site's own origin. This is required: FIRMS sends no CORS headers, so a browser cannot fetch FIRMS directly.
4. **Search.** The browser geocodes the query with OpenStreetMap Nominatim (CORS enabled; at most 1 request per second; attribution required; query on submit, not per keystroke).
5. **Select.** Box around the point: ±1.5° latitude, ±2.5° longitude, the Amazon scenario's size. The browser fetches the 1–4 tiles the box touches, keeps detections inside it, and picks the busiest day (or the user picks one of the 7).
6. **Simulate.** Same rules as `response_sim.py`: 0.05° cell clustering, pass end per satellite, sunset from latitude and date, dispatch. Bases are the three nearest places in the box; they are illustrative and should be draggable.
7. **Fallback.** No detections in the box in 7 days: say so, and offer the bundled historical scenarios (the six regions, `data/out/sim/`), so the demo never depends on live data.

### Measured (run of 15 Nov 2026 07:50 UTC)
| Item | Value |
|---|---|
| Daytime detections, 7 days, worldwide | 606,154 |
| Non-empty tiles | 203 |
| Median tile | 13 kB |
| Largest tile (0–10° N, 20–30° E, central Africa) | 4.0 MB raw, 0.66 MB gzipped |
| `places.json` | 243 kB |
| Build time | 13 s |

Example, Central African Republic (6.6° N, 20.5° E), 12 Nov 2026: 187 fires; passes Terra 08:28, NOAA-21 12:48, NOAA-20 13:43, Aqua 15:49 local solar time. With the 3 h delay, the Aqua alert arrives after sunset: 0 helicopter sorties, against 2 from VIIRS.

### Run
```
python3 analysis/simulation/live_tiles.py frontend/public/live PLACES_GEOJSON
python3 analysis/simulation/response_sim.py --live frontend/public/live 6.6 20.5 OUT_DIR   # one place, offline check
```
`PLACES_GEOJSON` is Natural Earth's `ne_10m_populated_places_simple.geojson`. In the Pages workflow, add a `schedule` trigger (for example every 3 hours) and run `live_tiles.py` before `npm run build`. Keep `frontend/public/live/` out of git.

### Browser side (to build)
- Port `cluster`, `sunset` and `simulate` from `response_sim.py` to TypeScript (about 150 lines); the JSON shape stays the same, so the existing map and timeline read it unchanged.
- Show the data time (`index.json: updated_utc`) and "near-real-time FIRMS data, not standard processing".

### Limits
- Last 7 days only. Any past date needs the FIRMS area API, which requires a MAP_KEY and therefore a small proxy (for example a Cloudflare Worker); not built.
- Days are UTC dates; near the date line a local day can span two.
- Live results are illustrative and change hourly; they are not frozen numbers and do not go on slides.

## Prior work checked
- Existing tools were reviewed before writing this one.
- [wild-env](https://github.com/amilcodes/wild-env) (Apache-2.0) models heterogeneous aircraft and ground resources for reinforcement-learning research. It needs PyTorch, RLlib and a desktop Qt viewer.
- NASA's [fmdtools](https://github.com/nasa/fmdtools) includes a multi-aircraft aerial firefighting example on a grid.
- [pyrosim](https://github.com/JonnoB/pyrosim) has no licence.
- None works on real satellite detections with pass times in a browser, so this simulation is a small standalone engine.
