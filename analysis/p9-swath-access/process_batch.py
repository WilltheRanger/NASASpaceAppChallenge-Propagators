"""Extract run-created fixed-date files; optionally clean temporary geometry.
One broad-view extraction supplies identical nearest pixels for both thresholds.
"""
import argparse,hashlib,json,shutil
from pathlib import Path
import numpy as np
from calibration import extract
p=argparse.ArgumentParser();p.add_argument('datecode');p.add_argument('sat',choices=['VNP','VJ1']);p.add_argument('--clean-run-geometry',action='store_true');p.add_argument('--input-root',type=Path,default=Path('/Users/brady/Downloads'));p.add_argument('--output-root',type=Path,default=Path('/Users/brady/Code/Anchor-data/p9-calibration'));a=p.parse_args()
root=a.input_root;out=a.output_root;broad=out/'sensitivity85';broad.mkdir(exist_ok=True)
if not (broad/'grid.npz').exists():shutil.copy2(out/'grid.npz',broad/'grid.npz')
for f in sorted(root.glob(f'{a.sat}14IMG.{a.datecode}.*.nc')):
 t=f.name.split('.')[2];dst=out/f'{a.sat}.{a.datecode}.{t}.npz';bd=broad/dst.name
 if dst.exists() and bd.exists():continue
 matches=list(root.glob(f'{a.sat}03IMG.{a.datecode}.{t}.*.nc'))
 if not matches:continue
 if len(matches)!=1:raise ValueError('ambiguous geometry input')
 g=matches[0]
 br=json.loads(bd.with_suffix('.json').read_text()) if bd.exists() else extract(f,g,out/'grid.npz',bd,max_zenith=85)
 with np.load(bd) as data:
  keep=data['zenith']<=45;subset={k:data[k][keep] for k in data.files}
  if dst.exists():
   with np.load(dst) as previous:
    if any(not np.array_equal(previous[k],subset[k]) for k in previous.files):raise ValueError('primary45 differs from broad-derived45')
  else:
   np.savez_compressed(dst,**subset);r=dict(br);r['sample']=dst.name;r['max_sensor_zenith_degrees']=45;r['usable_centers']=len(subset['grid_id']);r['fire_centers']=int(subset['fire'].sum());r['hashes']={f.name:br['hashes'][f.name],g.name:br['hashes'][g.name],dst.name:hashlib.sha256(dst.read_bytes()).hexdigest()};dst.with_suffix('.json').write_text(json.dumps(r,indent=2)+'\n')
 print(dst.name,'primary45',len(subset['grid_id']),int(subset['fire'].sum()),'sensitivity85',br['usable_centers'],br['fire_centers'],flush=True)
 if a.clean_run_geometry:
  assert hashlib.sha256(bd.read_bytes()).hexdigest()==br['hashes'][bd.name]
  assert hashlib.sha256(g.read_bytes()).hexdigest()==br['hashes'][g.name]
  g.unlink()
