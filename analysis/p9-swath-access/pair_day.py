"""Pair common clear-land samples without selecting on fire occurrence."""
import argparse,json
from pathlib import Path
import numpy as np
from calibration import BIOMES

def pair(root,datecode,out):
 grid=np.load(root/'grid.npz');n=len(grid['lon'])
 best=np.full(n,np.inf);xa=np.zeros(n,bool);yb=np.zeros(n,bool);dtbest=np.full(n,np.nan);zd=np.full(n,np.nan)
 common=0;afternoon=0
 for a in sorted(root.glob(f'VNP.{datecode}.*.npz')):
  with np.load(a) as x:
   for b in sorted(root.glob(f'VJ1.{datecode}.*.npz')):
    with np.load(b) as y:
     ids,ix,iy=np.intersect1d(x['grid_id'],y['grid_id'],return_indices=True)
     dt=(y['utc_seconds_since_1993'][iy]-x['utc_seconds_since_1993'][ix])/3600
     k=(np.abs(dt)>=.25)&(np.abs(dt)<=1.5);common+=int(k.sum())
     k &= (x['local_hour'][ix]>13.5)&(y['local_hour'][iy]>13.5);afternoon+=int(k.sum())
     k &= np.abs(dt)<best[ids];j=ids[k];best[j]=np.abs(dt[k]);dtbest[j]=dt[k]
     xa[j]=x['fire'][ix[k]];yb[j]=y['fire'][iy[k]];zd[j]=y['zenith'][iy[k]]-x['zenith'][ix[k]]
 eligible=np.isfinite(best)
 summary={'datecode':datecode,'common_time_eligible_candidate_pairs':common,'afternoon_candidate_pairs':afternoon,'unique_eligible_centers':int(eligible.sum()),'biomes':{}}
 for biome in BIOMES:
  k=eligible&(grid['biome']==biome)
  summary['biomes'][biome]={'centers':int(k.sum()),'snpp_fire':int(xa[k].sum()),'noaa20_fire':int(yb[k].sum()),'positive_order':int((dtbest[k]>0).sum()),'negative_order':int((dtbest[k]<0).sum())}
 ids=np.flatnonzero(eligible)
 np.savez_compressed(out,grid_id=ids,snpp_fire=xa[ids],noaa20_fire=yb[ids],dt_hours=dtbest[ids],zenith_diff=zd[ids])
 out.with_suffix('.json').write_text(json.dumps(summary,indent=2)+'\n');return summary
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('datecode');p.add_argument('--root',type=Path,default=Path('/Users/brady/Code/Anchor-data/p9-calibration'));a=p.parse_args();print(json.dumps(pair(a.root,a.datecode,a.root/f'paired.{a.datecode}.npz')))
