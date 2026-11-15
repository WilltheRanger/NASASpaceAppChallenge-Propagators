"""Conditional paired-count diagnostic with explicit identification gates.
Not a causal correction: different sensor sensitivities and footprints remain.
"""
import argparse,datetime,json
from pathlib import Path
import numpy as np
from scipy.optimize import minimize
from scipy.special import expit
from calibration import BIOMES

def fit_arrays(X,y,n):
 if np.linalg.matrix_rank(X)<X.shape[1]:return None
 if np.linalg.cond(X)>1e8:return None
 def f(b):
  z=X@b
  return float(np.sum(n*np.logaddexp(0,z)-y*z)/n.sum()), (X.T@(n*expit(z)-y))/n.sum()
 r=minimize(f,np.zeros(X.shape[1]),jac=True,method='BFGS',options={'gtol':1e-9,'maxiter':1000})
 if not r.success or not np.isfinite(r.x).all() or np.max(np.abs(r.x))>50:return None
 return r.x

def run(root):
 grid=np.load(root/'grid.npz');rows=[]
 # Only fixed calibration days, never the excluded August engineering pilot.
 dates={datetime.date(y,m,15).strftime('A%Y%j') for y in [2018,2019,2020] for m in [1,3,5,7,9,11]}
 files=[p for p in sorted(root.glob('paired.A*.npz')) if p.name.split('.')[1] in dates]
 for p in files:
  datecode=p.name.split('.')[1];date=datetime.datetime.strptime(datecode,'A%Y%j');d=np.load(p);ids=d['grid_id']
  ix=np.floor(grid['lon'][ids]*2).astype(int);iy=np.floor(grid['lat'][ids]*2).astype(int)
  for biome in BIOMES:
   keep=grid['biome'][ids]==biome
   for cell in set(zip(ix[keep],iy[keep])):
    k=keep&(ix==cell[0])&(iy==cell[1]);w=np.cos(np.deg2rad(grid['lat'][ids[k]]));n1=float(np.sum(w*d['snpp_fire'][k]));n2=float(np.sum(w*d['noaa20_fire'][k]))
    rows.append((biome,datecode,date.month,cell[0]/2,cell[1]/2,float(np.average(d['dt_hours'][k],weights=w)),float(np.average(d['zenith_diff'][k],weights=w)),n1,n2,int(k.sum())))
 reports=[]
 for biome in BIOMES:
  allrows=[r for r in rows if r[0]==biome];r=[r for r in allrows if r[7]+r[8]>0]
  report={'biome':biome,'eligible_cells':len(allrows),'informative_cells':len(r),'informative_dates':len({v[1] for v in r}),'status':'insufficient_identification','beta':None,'ci95':None}
  reports.append(report)
  if len({v[1] for v in r})<6:report['reason']='fewer_than_six_fire_informative_dates';continue
  dt=np.array([v[5] for v in r])
  if not ((dt>0).any() and (dt<0).any()):report['reason']='only_one_temporal_ordering';continue
  # Constant instrument bias, time difference, angle difference, spatial trends,
  # and fixed seasonal indicators. Common exposure cancels in conditional ratio.
  months=sorted({v[2] for v in r});X=np.array([[1,v[5],v[6]/45,(v[3]+54)/20,(v[4]+14)/20]+[float(v[2]==m) for m in months[1:]] for v in r]);y=np.array([v[8] for v in r]);n=y+np.array([v[7] for v in r]);b=fit_arrays(X,y,n)
  if b is None:report['reason']='rank_conditioning_or_fit_failure';continue
  days=np.array([v[1] for v in r]);unique=np.unique(days);rng=np.random.default_rng(20261115);betas=[]
  for _ in range(1000):
   counts=rng.multinomial(len(unique),np.full(len(unique),1/len(unique)));w=np.array([counts[np.where(unique==d)[0][0]] for d in days]);k=w>0;bb=fit_arrays(X[k],y[k]*w[k],n[k]*w[k])
   if bb is not None:betas.append(float(bb[1]))
  report['valid_day_bootstraps']=len(betas)
  if len(betas)<800:report['reason']='unstable_day_bootstrap';continue
  report.update(status='estimated_association_not_causal',reason=None,beta=float(b[1]),ci95=np.percentile(betas,[2.5,97.5]).tolist())
 return {'acquired_paired_dates':len(files),'planned_dates':18,'complete':len(files)==18,'biomes':reports,'interpretation':'Original P9 outcomes unchanged; do not score incomplete or unidentified calibration as a pass.'}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('root',type=Path);p.add_argument('out',type=Path);a=p.parse_args();a.out.write_text(json.dumps(run(a.root),indent=2)+'\n')
