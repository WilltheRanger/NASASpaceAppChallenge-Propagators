"""Every daytime fire detection of the map's day, with the ground it covers, for the Explore map's close-up squares.

Usage: python3 frontend/scripts/fire-squares.py MODIS_C6_1_Global_48h.csv J1_VIIRS_C2_Global_48h.csv J2_VIIRS_C2_Global_48h.csv
Inputs : NASA FIRMS global files (MODIS C6.1 for Terra and Aqua; VIIRS C2 375 m for NOAA-20 and NOAA-21) that cover the
         day in frontend/src/r2/earth/fires-day.json. That file keeps one detection per satellite per 2 km square, which
         is right for dots; squares need every detection, so that neighbours join into the ground that was burning.
Output : frontend/public/data/fire-squares.json
         pts: lon * 10000, lat * 10000, satellite code, fire radiative power (MW, rounded), and the detection's ground
         footprint as FIRMS gives it: scan (across the satellite's path) and track (along it), in units of 10 m.
The detections kept are the same ones fires-day.json was thinned from: daytime (daynight = D), from its start to each
satellite's last dot. The script stops if a satellite's count differs from the count that file records.
"""
import csv, json, os, sys
from datetime import datetime, timedelta, timezone
HERE = os.path.dirname(os.path.abspath(__file__))
SAT = {'T': 0, 'A': 1, 'N20': 2, 'N21': 3}
day = json.load(open(os.path.join(HERE, '..', 'src', 'r2', 'earth', 'fires-day.json')))
start = datetime.strptime(day['start'], '%Y-%m-%d %H:%M').replace(tzinfo=timezone.utc)
p = day['pts']
last = [max(p[i * 5 + 3] for i in range(len(p) // 5) if p[i * 5 + 2] == s) for s in range(4)]
rows, counts = [], [0, 0, 0, 0]
for f in sys.argv[1:]:
    for r in csv.DictReader(open(f)):
        if r['daynight'] != 'D': continue
        s = SAT[r['satellite']]
        t = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M').replace(tzinfo=timezone.utc)
        if not (start <= t <= start + timedelta(minutes=last[s])): continue
        counts[s] += 1
        rows.append((s, float(r['longitude']), float(r['latitude']), float(r['frp'] or 0), float(r['scan']), float(r['track'])))
if counts != day['counts']: sys.exit(f"counts differ from fires-day.json: here {counts}, there {day['counts']}")
rows.sort()
pts = []
for s, lon, lat, frp, scan, track in rows:
    pts += [round(lon * 10000), round(lat * 10000), s, round(frp), round(scan * 100), round(track * 100)]
out = {
    'source': day['source'], 'sats': day['sats'], 'start': day['start'], 'end': day['end'], 'n': len(rows),
    'note': 'pts: lon*10000, lat*10000, satellite code, FRP in MW, scan and track footprint in units of 10 m; every daytime detection',
    'pts': pts,
}
dst = os.path.join(HERE, '..', 'public', 'data', 'fire-squares.json')
os.makedirs(os.path.dirname(dst), exist_ok=True)
json.dump(out, open(dst, 'w'), separators=(',', ':'))
sc = sorted(r[4] for r in rows); tr = sorted(r[5] for r in rows)
print('detections', len(rows), 'per satellite', counts, os.path.getsize(dst) // 1024, 'KB; scan km min/median/max', sc[0], sc[len(sc) // 2], sc[-1], '; track', tr[0], tr[len(tr) // 2], tr[-1])
