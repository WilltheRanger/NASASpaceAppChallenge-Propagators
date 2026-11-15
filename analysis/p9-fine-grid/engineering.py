"""Fixed tile engineering validation only; not full biome sensitivity or P9."""
from pathlib import Path
import json,sys,time
import numpy as np
from extract_fine import extract
from dependence import summary,components
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
out=HERE/'engineering';out.mkdir(exist_ok=True)
manifest=json.loads((ROOT/'analysis/p9-swath-access/calibration_manifests/2018-07-15.json').read_text())
for e in manifest['granules']:
 if e['product'] not in ['VNP14IMG','VJ114IMG']:continue
 f=ROOT/'raw'/(e['title']+'.nc');sat='VNP' if e['product']=='VNP14IMG' else 'VJ1';t=f.name.split('.')[2]
 gs=list((ROOT/'raw').glob(sat+'03IMG.A2018196.'+t+'.*.nc'));assert len(gs)==1
 dst=out/(sat+'.'+t+'.npz')
 if not dst.exists():
  report=extract(f,gs[0],HERE/'engineering-grid.npz',dst,85)
  print(dst.name,report['usable_centers'],flush=True)
grid=np.load(HERE/'engineering-grid.npz');N=len(grid['lon']);best=np.full(N,np.inf);left=np.full(N,'',dtype='U80');right=left.copy();xf=np.zeros(N,bool);yf=xf.copy();zmax=np.zeros(N)
for a in sorted(out.glob('VNP.*.npz')):
 x=np.load(a)
 for b in sorted(out.glob('VJ1.*.npz')):
  y=np.load(b);ids,ix,iy=np.intersect1d(x['grid_id'],y['grid_id'],return_indices=True)
  dt=(y['utc_seconds_since_1993'][iy]-x['utc_seconds_since_1993'][ix])/3600
  k=(abs(dt)>=.25)&(abs(dt)<=1.5)&(x['local_hour'][ix]>13.5)&(y['local_hour'][iy]>13.5)&(abs(dt)<best[ids])
  j=ids[k];best[j]=abs(dt[k]);left[j]=[a.stem+':'+str(v) for v in x['native_pixel_id'][ix[k]]];right[j]=[b.stem+':'+str(v) for v in y['native_pixel_id'][iy[k]]]
  xf[j]=x['fire'][ix[k]];yf[j]=y['fire'][iy[k]];zmax[j]=np.maximum(x['zenith'][ix[k]],y['zenith'][iy[k]])
k=np.isfinite(best);r=summary(left[k],right[k]);r.update(date='2018-07-15',grid_spacing_degrees=.005,bbox=[-61,-13,-59,-11],grid_centers=N,snpp_fire_grid_centers=int(xf[k].sum()),noaa_fire_grid_centers=int(yf[k].sum()),primary45_eligible_grid_centers=int((zmax[k]<=45).sum()),status='engineering_tile_only_not_full_sensitivity_or_p9_result')
(out/'result.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
np.savez_compressed(out/'paired-native-components.npz',grid_id=np.flatnonzero(k),component_id=components(left[k],right[k]),snpp_native_id=left[k],noaa_native_id=right[k])
