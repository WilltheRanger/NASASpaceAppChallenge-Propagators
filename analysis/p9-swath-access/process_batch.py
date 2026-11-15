"""Extract run-created fixed-date files; optionally clean temporary geometry."""
import argparse,hashlib,json
from pathlib import Path
from calibration import extract
p=argparse.ArgumentParser();p.add_argument('datecode');p.add_argument('sat',choices=['VNP','VJ1']);p.add_argument('--clean-run-geometry',action='store_true');a=p.parse_args()
root=Path('/Users/brady/Downloads');out=Path('/Users/brady/Code/Anchor-data/p9-calibration')
for f in sorted(root.glob(f'{a.sat}14IMG.{a.datecode}.*.nc')):
 t=f.name.split('.')[2];dst=out/f'{a.sat}.{a.datecode}.{t}.npz'
 if dst.exists():continue
 matches=list(root.glob(f'{a.sat}03IMG.{a.datecode}.{t}.*.nc'))
 if not matches:continue
 if len(matches)!=1:raise ValueError('ambiguous geometry input')
 g=matches[0]
 r=extract(f,g,out/'grid.npz',dst);print(dst.name,r['usable_centers'],r['fire_centers'],flush=True)
 if a.clean_run_geometry:
  assert hashlib.sha256(dst.read_bytes()).hexdigest()==r['hashes'][dst.name]
  assert hashlib.sha256(g.read_bytes()).hexdigest()==r['hashes'][g.name]
  g.unlink()
