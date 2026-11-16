"""Post-hoc fine-grid area quadrature, not independent fire-event counts.
No changes to primary calibration. Native dependencies are reported; uncertainty
resamples whole dates, retaining every within-day dependency together.
"""
import argparse,datetime,json,sys
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'p9-swath-access'))
from fit_calibration import fit_arrays,information_diagnostics
from resume_validation import sha256

def aggregate(lon,lat,codes,paired,spacing=.005):
 ids=paired['grid_id'];lo=lon[ids];la=lat[ids];bi=codes[ids]
 # Same fixed half-degree cells and same area approximation as original.
 keys=np.stack([bi,np.floor(lo*2).astype(int),np.floor(la*2).astype(int)],axis=1)
 groups,inv=np.unique(keys,axis=0,return_inverse=True);m=len(groups)
 w=np.cos(np.deg2rad(la))*(spacing/.05)**2
 sums=lambda v:np.bincount(inv,weights=w*v,minlength=m)
 exposure=sums(np.ones(len(ids)))
 result=np.column_stack([groups,sums(paired['dt_hours'])/exposure,sums(paired['zenith_diff'])/exposure,sums(paired['snpp_fire']),sums(paired['noaa20_fire']),exposure])
 return result

def run(here,bootstrap=1000):
 grid_hash=sha256(here/'full-grid.npz');grid=np.load(here/'full-grid.npz');names=grid['biome_names'];allrows=[];dependence=[]
 expected={datetime.date(y,m,15).isoformat() for y in [2018,2019,2020] for m in [1,3,5,7,9,11]}
 files=[]
 for p in sorted(here.glob('full-*/paired-native-components.npz')):
  date=p.parent.name[5:]
  if date not in expected:continue
  report=p.parent/'result.json'
  if not report.exists():continue
  meta=json.loads(report.read_text());assert meta['date']==date
  if not meta.get('input_complete',False):continue
  if meta.get('grid_sha256')!=grid_hash:raise ValueError('paired-data grid fingerprint missing or mismatched')
  d=np.load(p);rows=aggregate(grid['lon'],grid['lat'],grid['biome_code'],d)
  for r in rows:allrows.append((date,*r.tolist()))
  files.append(date)
  dependence.append({'date':date,'grid_pairs':len(d['grid_id']),'native_components':len(np.unique(d['component_id'])),'distinct_snpp_pixels':len(np.unique(d['snpp_native_id'])),'distinct_noaa_pixels':len(np.unique(d['noaa_native_id']))})
  d.close()
 reports=[]
 for code,name in enumerate(names):
  # tuple date, biome, half-lon,half-lat,dt,zd,f1,f2,area
  rows=[r for r in allrows if r[1]==code];r=[v for v in rows if v[6]+v[7]>0]
  days=np.array([v[0] for v in r]);unique=np.unique(days)
  out={'biome':str(name),'eligible_cells':len(rows),'informative_cells':len(r),'informative_dates':len(unique),'snpp_fire_area_weight':sum(v[6] for v in r),'noaa20_fire_area_weight':sum(v[7] for v in r),'status':'insufficient_identification','beta':None,'ci95':None};reports.append(out)
  if len(unique)<6:out['reason']='fewer_than_six_fire_informative_dates';continue
  dt=np.array([v[4] for v in r])
  if not ((dt>0).any() and (dt<0).any()):out['reason']='only_one_temporal_ordering';continue
  months=sorted({int(v[0][5:7]) for v in r})
  X=np.array([[1,v[4],v[5]/45,(v[2]/2+54)/20,(v[3]/2+14)/20]+[float(int(v[0][5:7])==m) for m in months[1:]] for v in r]);y=np.array([v[7] for v in r]);n=y+np.array([v[6] for v in r])
  b=fit_arrays(X,y,n)
  if b is None:out['reason']='rank_conditioning_or_fit_failure';continue
  info=information_diagnostics(X,n,b);out.update(info)
  if info['fisher_rank']<X.shape[1] or info['fisher_condition']>1e8 or info['residual_timing_information']<1e-8:out['reason']='event_weighted_information_failure';continue
  rng=np.random.default_rng(20261115);betas=[];_,didx=np.unique(days,return_inverse=True)
  for _ in range(bootstrap):
   counts=rng.multinomial(len(unique),np.full(len(unique),1/len(unique)));w=counts[didx];k=w>0;bb=fit_arrays(X[k],y[k]*w[k],n[k]*w[k])
   if bb is not None:betas.append(float(bb[1]))
  out['valid_day_bootstraps']=len(betas)
  if len(betas)<.8*bootstrap:out['reason']='unstable_day_bootstrap';continue
  out.update(status='estimated_association_not_causal',reason=None,beta=float(b[1]),ci95=np.percentile(betas,[2.5,97.5]).tolist())
 return {'analysis':'posthoc_fine_grid_area_sensitivity','grid_sha256':grid_hash,'complete':set(files)==expected,'paired_dates':files,'planned_dates':18,'weight':'cos(latitude)*(0.005/0.05)^2; area quadrature, NOT independent fire counts','uncertainty':'whole-date bootstrap preserves native-pixel dependence within day; repeated fires across days may remain dependent','original_P9':'unchanged','native_dependence':dependence,'biomes':reports}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parent);p.add_argument('--out',type=Path,required=True);a=p.parse_args();a.out.write_text(json.dumps(run(a.root),indent=2)+'\n')
