"""Portable resumable NASA country-file downloader; raw output directory argument required."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess
import sys
root=Path(sys.argv[1]);root.mkdir(parents=True,exist_ok=True)
urls=[f'{s}/{y}/{s}_{y}_Brazil.csv' for s,start in [('modis',2001),('viirs-snpp',2012),('viirs-jpss1',2018)] for y in range(start,2026)]
def get(u):
 p=root/u.split('/')[-1]
 if p.with_suffix('.csv.done').exists():return
 r=subprocess.run(['curl','-fLsS','--retry','2','--max-time','600','-C','-','-o',str(p),'https://firms.modaps.eosdis.nasa.gov/data/country/'+u],capture_output=True)
 if r.returncode==0:p.with_suffix('.csv.done').touch(); print(p.name,p.stat().st_size,flush=True)
 else:print('FAILED',p.name,r.stderr.decode(),flush=True)
with ThreadPoolExecutor(max_workers=4) as ex:list(ex.map(get,urls))
missing=[u for u in urls if not (root/u.split('/')[-1]).with_suffix('.csv.done').exists()]
if missing: raise SystemExit('incomplete downloads: '+str(missing))
