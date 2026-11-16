from pathlib import Path
import json
import numpy as np,pandas as pd
D=Path(__file__).resolve().parent
src=D.parent/'ibge-exact-diagnosis/historical'
d=pd.read_csv(D/'individual_strength_daily.csv'); old=pd.read_csv(src/'firms_daily_by_biome.csv')
audit=pd.read_csv(D.parent/'check-methodology-fixes/statistics/audit_by_biome.csv')
dates=pd.date_range('2012-01-01','2025-12-31').strftime('%Y-%m-%d'); yr=dates.str[:4].astype(int).to_numpy(); mo=dates.str[5:7].astype(int).to_numpy()-1
up=old.groupby(['date','satellite']).count_all.sum().unstack().reindex(dates).notna();valid=(up.Aqua&up.Terra&up['S-NPP']).to_numpy()
rng=np.random.default_rng(20261114);block=np.arange(len(dates))//16
W=np.vstack([np.ones(len(dates)),rng.poisson(1.,(1000,block[-1]+1))[:,block]]).astype(np.float32)
YM=np.zeros((len(dates),168),np.float32);YM[np.arange(len(dates)),(yr-2012)*12+mo]=1

def sums(x):return (W@(YM*(x*valid)[:,None])).reshape(-1,14,12)
def ratio(A,V,y):
 ab=A[:,:9].sum(1);vb=V[:,:9].sum(1)
 with np.errstate(divide='ignore',invalid='ignore'):
  pool=(ab.sum(1)/vb.sum(1))[:,None];r=np.where(vb>0,ab/vb,pool);expected=(V[:,y-2012]*r).sum(1)
  return A[:,y-2012].sum(1)/expected

def interval(x):
 z=x[1:];z=z[np.isfinite(z)]
 return np.quantile(z,[.025,.975]) if len(z) else [np.nan,np.nan]
rows=[]
for b,g in d.groupby('biome'):
 arrays={}
 for s in ['Aqua','S-NPP']:
  for k in range(3):arrays[s,k]=sums(g[(g.satellite==s)&(g.strength==k)].set_index('date')['count'].reindex(dates,fill_value=0).to_numpy())
 A=sum(arrays['Aqua',k] for k in range(3));V=sum(arrays['S-NPP',k] for k in range(3))
 weights=np.stack([arrays['Aqua',k][:,:9].sum((1,2)) for k in range(3)],axis=1);weights/=weights.sum(1)[:,None]
 for y in range(2021,2026):
  ls=np.stack([ratio(arrays['Aqua',k],arrays['S-NPP',k],y) for k in range(3)],axis=1)
  filtered=ratio(A,V,y);strat=(ls*weights).sum(1);fixed=(ls*weights[0]).sum(1)
  fl,fh=interval(filtered);sl,sh=interval(strat);dl,dh=interval(strat-filtered)
  ref=audit[(audit.biome==b)&(audit.year==y)].iloc[0]
  rows.append(dict(biome=b,year=y,original_status=ref.status,original_L=ref.L,original_L_strat=ref.L_strat,original_lo=ref.L_lo,original_hi=ref.L_hi,
   filtered_L=filtered[0],filtered_lo=fl,filtered_hi=fh,individual_L_strat=strat[0],strat_lo=sl,strat_hi=sh,
   paired_delta_lo=dl,paired_delta_hi=dh,finite_replicates=int(np.isfinite(strat[1:]).sum()),
   fixed_weight_lo=interval(fixed)[0],fixed_weight_hi=interval(fixed)[1],
   within_original_interval=bool(ref.L_lo<=strat[0]<=ref.L_hi),within_filtered_interval=bool(fl<=strat[0]<=fh),paired_delta_contains_zero=bool(dl<=0<=dh)))
out=pd.DataFrame(rows);out.to_csv(D/'individual_strength_results.csv',index=False)
ok=out[out.original_status=='ok'];summary={c:{'pass':int(ok[c].sum()),'total':len(ok)} for c in ['within_original_interval','within_filtered_interval','paired_delta_contains_zero']}
# Exact reconcilation ensures no detections mysteriously added by raw extraction.
actual=d.groupby(['date','biome','satellite'])['count'].sum();expected=old[old.satellite.isin(['Aqua','S-NPP'])&old.biome.ne('unassigned')&(old.date>='2012-01-01')].groupby(['date','biome','satellite'])['count'].sum()
a,e=actual.align(expected,fill_value=0);delta=a-e
summary['raw_count_reconciliation']={'actual':int(a.sum()),'expected_filtered':int(e.sum()),'different_rows':int((delta!=0).sum()),'count_difference':int(delta.sum())}
summary['warning']='Post-hoc sensitivity with instrument-dependent FRP; not a replacement for original P5. No fire matching or coverage control.'
(D/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2));print(out[out.biome=='pantanal'].to_string(index=False))
