"""Metadata acquisition for the fixed dates, with resumable per-date manifests."""
import json
from pathlib import Path
from discover import discover,PRODUCTS
D=Path(__file__).parent/'calibration_manifests';D.mkdir(exist_ok=True)
for year in [2019,2018,2020]:
 for month in [1,3,5,7,9,11]:
  date=f'{year}-{month:02d}-15';out=D/f'{date}.json'
  if out.exists():continue
  rows=[]
  for p,(v,_) in PRODUCTS.items():rows+=discover(p,v,date+'T12:00:00Z',date+'T23:59:59Z','-74,-34,-34,6')
  out.write_text(json.dumps({'date':date,'granules':rows,'total_mb':sum(r['size_mb'] for r in rows)},indent=2)+'\n')
  print(date,len(rows),round(sum(r['size_mb'] for r in rows)),flush=True)
