"""Fixed full-Brazil day fine-grid sensitivity, explicit native dependence."""
from pathlib import Path
import json,shutil,sys
import numpy as np
from extract_fine import extract
from dependence import numeric_components
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
date=sys.argv[1] if len(sys.argv)>1 else '2018-07-15'
manifest=json.loads((ROOT/'analysis/p9-swath-access/calibration_manifests'/f'{date}.json').read_text())
out=HERE/('full-'+date);out.mkdir(exist_ok=True);gf=HERE/'full-grid.npz'
for e in manifest['granules']:
 if e['product'] not in ['VNP14IMG','VJ114IMG']:continue
 f=ROOT/'raw'/(e['title']+'.nc');sat='VNP' if e['product']=='VNP14IMG' else 'VJ1';code,t=f.name.split('.')[1:3]
 gs=list((ROOT/'raw').glob(sat+'03IMG.'+code+'.'+t+'.*.nc'));assert len(gs)==1
 dst=out/(sat+'.'+t+'.npz')
 if not dst.exists():
  if shutil.disk_usage(ROOT).free<10.5*1024**3:raise RuntimeError('10GiB guard plus 512MiB next-output reserve')
  report=extract(f,gs[0],gf,dst,85)
  print(dst.name,report['usable_centers'],flush=True)
if shutil.disk_usage(ROOT).free<10.5*1024**3:raise RuntimeError('10GiB guard plus pairing-output reserve')
grid=np.load(gf);N=len(grid['lon'])
best=np.full(N,np.inf);best45=np.full(N,np.inf);left=np.full(N,-1,dtype=np.int64);right=left.copy();xf=np.zeros(N,bool);yf=xf.copy();zmax=np.zeros(N,dtype=np.float32);dtbest=np.full(N,np.nan);zd=np.full(N,np.nan)
for ai,a in enumerate(sorted(out.glob('VNP.*.npz'))):
 x=np.load(a)
 for bi,b in enumerate(sorted(out.glob('VJ1.*.npz'))):
  y=np.load(b);ids,ix,iy=np.intersect1d(x['grid_id'],y['grid_id'],return_indices=True)
  dt=(y['utc_seconds_since_1993'][iy]-x['utc_seconds_since_1993'][ix])/3600
  eligible=(abs(dt)>=.25)&(abs(dt)<=1.5)&(x['local_hour'][ix]>13.5)&(y['local_hour'][iy]>13.5)
  primary=eligible&(x['zenith'][ix]<=45)&(y['zenith'][iy]<=45)&(abs(dt)<best45[ids])
  best45[ids[primary]]=abs(dt[primary])
  k=eligible&(abs(dt)<best[ids])
  j=ids[k];best[j]=abs(dt[k]);dtbest[j]=dt[k];zd[j]=y['zenith'][iy[k]]-x['zenith'][ix[k]]
  left[j]=(ai<<32)+x['native_pixel_id'][ix[k]];right[j]=(bi<<32)+y['native_pixel_id'][iy[k]]
  xf[j]=x['fire'][ix[k]];yf[j]=y['fire'][iy[k]];zmax[j]=np.maximum(x['zenith'][ix[k]],y['zenith'][iy[k]])
  y.close()
 x.close()
k=np.isfinite(best);ids=np.flatnonzero(k);left=left[k];right=right[k];components=numeric_components(left,right)
r={'date':date,'grid_spacing_degrees':.005,'grid_centers':N,'eligible_grid_pairs':len(ids),'distinct_native_pixel_pairs':len(np.unique(np.rec.fromarrays([left,right]))),'native_dependence_components':len(np.unique(components)),'primary45_eligible_grid_centers':int(np.isfinite(best45).sum()),'status':'posthoc_full_day_sensitivity_not_full_calibration_or_p9','input_complete':True,'expected_swaths':sum(e['product'] in ['VNP14IMG','VJ114IMG'] for e in manifest['granules']),'native_id_granules':{'snpp':[json.loads(p.with_suffix('.json').read_text())['fire'] for p in sorted(out.glob('VNP.*.npz'))],'noaa20':[json.loads(p.with_suffix('.json').read_text())['fire'] for p in sorted(out.glob('VJ1.*.npz'))]},'biomes':{}}
codes=grid['biome_code'][ids]
for j,b in enumerate(grid['biome_names']):
 s=codes==j;ff=xf[k][s];gg=yf[k][s]
 r['biomes'][str(b)]={'eligible_centers':int(s.sum()),'snpp_fire_centers':int(ff.sum()),'noaa_fire_centers':int(gg.sum()),'discordant_fire_centers':int((ff^gg).sum()),'native_dependence_components':len(np.unique(components[s]))}
(out/'result.json').write_text(json.dumps(r,indent=2)+'\n')
np.savez_compressed(out/'paired-native-components.npz',grid_id=ids,component_id=components,snpp_native_id=left,noaa_native_id=right,snpp_fire=xf[k],noaa20_fire=yf[k],dt_hours=dtbest[k],zenith_diff=zd[k])
print(json.dumps(r),flush=True)
