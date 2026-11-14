"""Measure Terra/Aqua MODIS overpass local solar time drift from FIRMS hotspots (CONUS, daytime, vegetation fires)."""
import sys, glob, os
import pandas as pd
import numpy as np

data_dir = sys.argv[1]
rows = []
for f in sorted(glob.glob(os.path.join(data_dir, "modis_*_United_States.csv"))):
    year = int(os.path.basename(f).split("_")[1])
    df = pd.read_csv(f, usecols=["latitude", "longitude", "acq_date", "acq_time", "satellite", "daynight", "type", "scan"])
    df = df[(df.daynight == "D") & (df.type == 0)]
    df = df[(df.latitude.between(24, 50)) & (df.longitude.between(-125, -66))]  # CONUS only
    t_utc = (df.acq_time // 100) + (df.acq_time % 100) / 60.0
    lst = (t_utc + df.longitude / 15.0) % 24
    near_nadir = df.scan <= 1.3  # pixels near nadir: local time ~ nadir overpass time
    for sat in ["Terra", "Aqua"]:
        m = (df.satellite == sat)
        mm = m & near_nadir
        if mm.sum() == 0:
            continue
        q = np.percentile(lst[mm], [25, 50, 75])
        rows.append(dict(year=year, satellite=sat, n_day_detections=int(m.sum()), n_near_nadir=int(mm.sum()),
                         lst_p25=round(q[0], 2), lst_median=round(q[1], 2), lst_p75=round(q[2], 2)))
out = pd.DataFrame(rows).sort_values(["satellite", "year"])
def hhmm(x):
    h = int(x); m = int(round((x - h) * 60))
    if m == 60: h, m = h + 1, 0
    return f"{h:02d}:{m:02d}"
out["median_local_time"] = out.lst_median.apply(hhmm)
print(out.to_string(index=False))
out.to_csv(os.path.join(data_dir, "drift_check_result.csv"), index=False)
