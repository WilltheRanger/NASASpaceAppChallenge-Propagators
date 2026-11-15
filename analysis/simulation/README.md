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

## Prior work checked
- Existing tools were reviewed before writing this one.
- [wild-env](https://github.com/amilcodes/wild-env) (Apache-2.0) models heterogeneous aircraft and ground resources for reinforcement-learning research. It needs PyTorch, RLlib and a desktop Qt viewer.
- NASA's [fmdtools](https://github.com/nasa/fmdtools) includes a multi-aircraft aerial firefighting example on a grid.
- [pyrosim](https://github.com/JonnoB/pyrosim) has no licence.
- None works on real satellite detections with pass times in a browser, so this simulation is a small standalone engine.
