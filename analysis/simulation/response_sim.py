"""Response simulation: helicopters and ground crews dispatched to real FIRMS fire detections on one day,
under each satellite pass as the alert source. Shows how a pass's clock time limits daylight response.

Usage: python3 analysis/simulation/response_sim.py RAW_DIR data/out/sim
       python3 analysis/simulation/response_sim.py --live TILES_DIR LAT LON OUT_DIR   (any place, last 7 days)
Inputs : RAW_DIR/{modis,viirs-snpp,viirs-jpss1}_2024_Brazil.csv (FIRMS yearly country files)
Outputs: OUT_DIR/amazon-2024-09-02.json (fires, units, trips and summary per alert source)
All times are local solar time (UTC + lon/15). Bases and unit performance are illustrative assumptions.
"""
import sys, os, json
import numpy as np, pandas as pd

LIVE = sys.argv[1] == "--live"  # --live TILES_DIR LAT LON OUT_DIR: any place, from live_tiles.py output
raw, out = (sys.argv[2], sys.argv[5]) if LIVE else (sys.argv[1], sys.argv[2])
DAY, BOX = "2024-09-02", (-56.5, -8.5, -51.5, -5.5)  # west, south, east, north: BR-163 to Sao Felix do Xingu
CELL = 0.05  # detections in touching 0.05 deg cells (about 5.5 km) form one fire
SAT = {"Aqua": "Aqua", "Terra": "Terra", "N": "S-NPP", "N20": "NOAA-20", "1": "NOAA-20"}
SOURCES = {"Terra": ["Terra"], "VIIRS": ["S-NPP", "NOAA-20"], "Aqua": ["Aqua"],
           "All satellites": ["Terra", "S-NPP", "NOAA-20", "Aqua"]}
if LIVE:  # S-NPP has been off since 2 November 2026; live VIIRS is NOAA-20 and NOAA-21
    SOURCES = {"Terra": ["Terra"], "VIIRS": ["NOAA-20", "NOAA-21"], "Aqua": ["Aqua"],
               "All satellites": ["Terra", "NOAA-20", "NOAA-21", "Aqua"]}
# illustrative bases at towns in the area; not real deployments
BASES = [("Novo Progresso", -7.14, -55.38), ("Sao Felix do Xingu", -6.64, -51.99), ("Castelo de Sonhos", -8.32, -55.09)]
UNITS = [("H1", "helicopter", 0), ("H2", "helicopter", 1),
         ("G1", "ground", 0), ("G2", "ground", 0), ("G3", "ground", 1), ("G4", "ground", 1), ("G5", "ground", 2)]
PERF = {"helicopter": dict(speed=200.0, road=1.0, delay=0.33, work=0.75, daylight=True, max_km=250.0, returns=True),
        "ground": dict(speed=40.0, road=1.4, delay=0.5, work=3.0, daylight=False, max_km=150.0, returns=False)}
LAST_ARRIVAL = 8.0  # hours after the alert; later arrivals do not count as a response that day
LATENCY = [0.0, 3.0]  # hours from the end of a pass to the alert: instant, and FIRMS's stated NRT bound ("within 3 hours")

def load():
    fr = []
    for f in ["modis_2024_Brazil.csv", "viirs-snpp_2024_Brazil.csv", "viirs-jpss1_2024_Brazil.csv"]:
        d = pd.read_csv(os.path.join(raw, f), usecols=["latitude", "longitude", "acq_date", "acq_time", "satellite",
                                                        "frp", "daynight"], dtype={"satellite": str})
        w, s, e, n = BOX
        fr.append(d[(d.acq_date == DAY) & (d.daynight == "D") & d.longitude.between(w, e) & d.latitude.between(s, n)])
    d = pd.concat(fr, ignore_index=True)
    d["sat"] = d.satellite.map(SAT)
    d["lst"] = (d.acq_time // 100 + d.acq_time % 100 / 60 + d.longitude / 15) % 24
    return d

def load_live(lat0, lon0):
    # a box the size of the Amazon scenario around the point; its busiest day in the last 7; nearest towns as bases
    global DAY, BOX, BASES
    BOX = (lon0 - 2.5, lat0 - 1.5, lon0 + 2.5, lat0 + 1.5)
    w, s, e, n = BOX
    meta = json.load(open(os.path.join(raw, "index.json")))
    rows = [r for t in meta["tiles"] if t["south"] < n and t["south"] + meta["tile_deg"] > s
            and t["west"] < e and t["west"] + meta["tile_deg"] > w
            for r in json.load(open(os.path.join(raw, "tiles", t["tile"])))]
    d = pd.DataFrame(rows, columns=["latitude", "longitude", "acq_date", "acq_time", "sat", "frp"])
    d = d[d.longitude.between(w, e) & d.latitude.between(s, n)]
    if d.empty: sys.exit("no daytime detections within the box in the last 7 days")
    DAY = d.acq_date.value_counts().idxmax()
    d = d[d.acq_date == DAY].copy()
    d["lst"] = (d.acq_time // 100 + d.acq_time % 100 / 60 + d.longitude / 15) % 24
    pl = [p for p in json.load(open(os.path.join(raw, "places.json"), encoding="utf-8")) if w <= p[2] <= e and s <= p[1] <= n]
    pl.sort(key=lambda p: km((lat0, lon0), (p[1], p[2])))
    BASES = [(p[0], p[1], p[2]) for p in pl[:3]] or [("Search point", lat0, lon0)]
    BASES += [BASES[-1]] * (3 - len(BASES))
    return d

def cluster(d):
    # connected components of occupied cells (8-neighbour)
    cells = {(int(np.floor(la / CELL)), int(np.floor(lo / CELL))) for la, lo in zip(d.latitude, d.longitude)}
    lab, k = {}, 0
    for c in cells:
        if c in lab: continue
        stack = [c]; lab[c] = k
        while stack:
            i, j = stack.pop()
            for di in (-1, 0, 1):
                for dj in (-1, 0, 1):
                    nb = (i + di, j + dj)
                    if nb in cells and nb not in lab: lab[nb] = k; stack.append(nb)
        k += 1
    d["fire"] = [lab[(int(np.floor(la / CELL)), int(np.floor(lo / CELL)))] for la, lo in zip(d.latitude, d.longitude)]
    return d

def km(a, b):
    la1, lo1, la2, lo2 = map(np.radians, (a[0], a[1], b[0], b[1]))
    h = np.sin((la2 - la1) / 2) ** 2 + np.cos(la1) * np.cos(la2) * np.sin((lo2 - lo1) / 2) ** 2
    return 6371.0 * 2 * np.arcsin(np.sqrt(h))

def sunset(lat, day):
    # local solar time of sunset (sun centre at -0.833 deg)
    n = pd.Timestamp(day).dayofyear
    dec = np.radians(23.44) * np.sin(2 * np.pi * (284 + n) / 365)
    phi = np.radians(lat)
    h0 = np.arccos((np.sin(np.radians(-0.833)) - np.sin(phi) * np.sin(dec)) / (np.cos(phi) * np.cos(dec)))
    return 12 + np.degrees(h0) / 15

def simulate(fires, sources, dusk, lat):
    # a pass arrives as one batch; within it the most intense fires (sum of FRP) are served first
    alerts = sorted(((f[f"t_{sources}"] + lat, -f["frp"], f["id"]) for f in fires if f[f"t_{sources}"] is not None))
    units = [dict(id=u, kind=k, base=b, at=BASES[b][1:], free=6.0) for u, k, b in UNITS]
    byid = {f["id"]: f for f in fires}
    trips, reached = [], {}
    for t_alert, _, fid in alerts:
        f = byid[fid]; best = None
        for u in units:
            p = PERF[u["kind"]]
            dist = km(u["at"], (f["lat"], f["lon"])) * p["road"]
            if dist > p["max_km"]: continue
            depart = max(t_alert, u["free"]) + p["delay"]
            arrive = depart + dist / p["speed"]
            if arrive > t_alert + LAST_ARRIVAL: continue
            if p["daylight"] and arrive + p["work"] > dusk: continue
            if best is None or arrive < best[0]: best = (arrive, depart, u, dist)
        if best is None: continue
        arrive, depart, u, dist = best
        p = PERF[u["kind"]]; leave = arrive + p["work"]
        trip = dict(unit=u["id"], fire=fid, alert=round(t_alert, 3), depart=round(depart, 3), arrive=round(arrive, 3),
                    leave=round(leave, 3), from_=[round(u["at"][0], 4), round(u["at"][1], 4)], km=round(dist, 1))
        if p["returns"]:
            home = BASES[u["base"]][1:]
            trip["back"] = round(leave + km((f["lat"], f["lon"]), home) / p["speed"], 3)
            u["free"], u["at"] = trip["back"], home
        else:
            u["free"], u["at"] = leave, (f["lat"], f["lon"])
        trips.append(trip); reached[fid] = arrive
    n_al = len(alerts); frp_al = sum(byid[a[2]]["frp"] for a in alerts); frp_tot = sum(f["frp"] for f in fires)
    resp = [reached[k] - byid[k][f"t_{sources}"] - lat for k in reached]
    heli = [t for t in trips if t["unit"].startswith("H")]
    return trips, dict(
        fires_alerted=n_al, fires_reached=len(reached),
        frp_alerted_pct=round(100 * frp_al / frp_tot, 1),
        frp_reached_pct=round(100 * sum(byid[k]["frp"] for k in reached) / frp_tot, 1),
        helicopter_sorties=len(heli), median_alert_to_arrival_h=round(float(np.median(resp)), 2) if resp else None,
        first_alert=round(min(a[0] for a in alerts), 2) if alerts else None,
        daylight_left_at_first_alert_h=round(dusk - min(a[0] for a in alerts), 2) if alerts else None)

d = cluster(load_live(float(sys.argv[3]), float(sys.argv[4])) if LIVE else load())
dusk = round(float(sunset(np.mean(BOX[1::2]), DAY)), 3)
fires = []
pass_end = d.groupby("sat").lst.max().to_dict()  # a pass is usable once it has finished over the area
for fid, g in d.groupby("fire"):
    f = dict(id=int(fid), lat=round(g.latitude.mean(), 4), lon=round(g.longitude.mean(), 4),
             frp=round(float(g.frp.sum()), 1), n=int(len(g)),
             first_seen=round(float(g.lst.min()), 3), seen_by=sorted(g.sat.unique().tolist()))
    for name, sats in SOURCES.items():
        t = [pass_end[s] for s in sats if (g.sat == s).any()]
        f[f"t_{name}"] = round(float(min(t)), 3) if t else None
    fires.append(f)
runs = {lat: {name: simulate(fires, name, dusk, lat) for name in SOURCES} for lat in LATENCY}
passes = d.groupby("sat").lst.median().round(2).to_dict()
os.makedirs(out, exist_ok=True)
res = {"day": DAY, "box": BOX, "sunset_lst": dusk, "passes_lst": passes,
       "pass_end_lst": {k: round(v, 3) for k, v in pass_end.items()},
       "note": "Real NASA FIRMS daytime detections (MODIS C6.1, VIIRS 375 m) on one day; fires = detections in "
               "touching 0.05 deg cells. Bases, fleet and unit performance are illustrative assumptions, not real "
               "deployments. Times are local solar time.",
       "assumptions": {"bases": [dict(name=n, lat=la, lon=lo) for n, la, lo in BASES],
                       "units": [dict(id=u, kind=k, base=BASES[b][0]) for u, k, b in UNITS], "performance": PERF,
                       "last_arrival_h_after_alert": LAST_ARRIVAL,
                       "rules": "Fires are served in alert order, most intense first within a pass; the unit with the "
                                "earliest arrival is sent. Helicopters must finish work before sunset and return to "
                                "base; ground crews stay on the fire line."},
       "fires": fires,
       "latency_note": "Alert = end of the pass over the area plus latency. 0 h is the best case; 3 h is the bound "
                       "NASA FIRMS states for near-real-time data (within 3 hours of a satellite observation).",
       "runs": {f"{lat:g}": {name: {"satellites": SOURCES[name], "summary": s, "trips": t}
                             for name, (t, s) in r.items()} for lat, r in runs.items()}}
name = f"live-{float(sys.argv[3]):.2f}_{float(sys.argv[4]):.2f}-{DAY}" if LIVE else f"amazon-{DAY}"
with open(os.path.join(out, f"{name}.json"), "w") as fh:
    json.dump(res, fh, indent=1)
print("fires", len(fires), "detections", len(d), "sunset", dusk, "passes", passes)
for lat, r in runs.items():
    for name, (t, s) in r.items(): print(f"latency {lat:g} h  {name:15}", s)
