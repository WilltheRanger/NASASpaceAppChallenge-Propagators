"""The Simulator's fire layer: every NASA FIRMS daytime fire detection of the past day, with the satellite that made it.

Usage: python3 frontend/scripts/fires-day.py MODIS_C6_1_Global_24h.csv J1_VIIRS_C2_Global_24h.csv J2_VIIRS_C2_Global_24h.csv
Inputs : NASA FIRMS keyless global 24-hour files (MODIS C6.1 for Terra and Aqua; VIIRS C2 375 m for NOAA-20 and NOAA-21),
         from https://firms.modaps.eosdis.nasa.gov/data/active_fire/ . S-NPP has been off since 2 November 2026.
Output : frontend/src/r2/earth/fires-day.json
         sats: satellite names by code; start: the window's first acquisition (UTC); counts: daytime detections per
         satellite before thinning; pts: one row per satellite per 0.02-degree cell (the strongest detection there):
         lon*100, lat*100, satellite code, minutes after `start`, fire radiative power (MW, rounded).
Daytime detections only (FIRMS daynight = D), as in the audit.
"""
import csv, json, sys, os
from datetime import datetime, timedelta, timezone
SAT = {'T': 0, 'A': 1, 'N20': 2, 'N21': 3}
NAMES = ['Terra', 'Aqua', 'NOAA-20', 'NOAA-21']
rows = []
for f in sys.argv[1:]:
    for r in csv.DictReader(open(f)):
        if r['daynight'] != 'D': continue
        t = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M').replace(tzinfo=timezone.utc)
        rows.append((SAT[r['satellite']], float(r['longitude']), float(r['latitude']), t, float(r['frp'] or 0)))
start = min(r[3] for r in rows)
end = max(r[3] for r in rows)
counts = [0, 0, 0, 0]
best = {}
for s, lon, lat, t, frp in rows:
    counts[s] += 1
    k = (s, round(lon / 0.02), round(lat / 0.02))
    if k not in best or frp > best[k][4]: best[k] = (s, lon, lat, t, frp)
pts = []
for s, lon, lat, t, frp in sorted(best.values(), key=lambda v: (v[0], v[3])):
    pts += [round(lon * 100), round(lat * 100), s, int((t - start).total_seconds() // 60), round(frp)]
out = {
    'source': 'NASA FIRMS global 24-hour files: MODIS C6.1 (Terra, Aqua) and VIIRS C2 375 m (NOAA-20, NOAA-21); daytime detections',
    'sats': NAMES, 'start': start.strftime('%Y-%m-%d %H:%M'), 'end': end.strftime('%Y-%m-%d %H:%M'), 'counts': counts,
    'note': 'pts: lon*100, lat*100, satellite code, minutes after start (UTC), FRP in MW; one row per satellite per 0.02-degree cell',
    'pts': pts,
}
dst = os.path.join(os.path.dirname(__file__), '..', 'src', 'r2', 'earth', 'fires-day.json')
json.dump(out, open(dst, 'w'), separators=(',', ':'))
print('detections', len(rows), 'points', len(pts) // 5, 'counts', dict(zip(NAMES, counts)), out['start'], '->', out['end'], os.path.getsize(dst) // 1024, 'KB')
