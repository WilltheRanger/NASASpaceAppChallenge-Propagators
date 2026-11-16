from pathlib import Path
import sys,json
import numpy as np,pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'ibge-exact-diagnosis'))
from classify import Classifier
D=Path(__file__).resolve().parent
RAW=Path(sys.argv[1]); classifier=Classifier(sys.argv[2])
frames=[]
for year in range(2018,2021):
 for sat,prefix in [('snpp','viirs-snpp'),('noaa20','viirs-jpss1')]:
  f=RAW/f'{prefix}_{year}_Brazil.csv'
  d=pd.read_csv(f,usecols=['latitude','longitude','acq_date','acq_time','confidence','frp','daynight','type','track'])
  d=d[(d.daynight=='D')&(d.type==0)&d.confidence.isin(['n','h'])].copy()
  d['biome']=classifier.classify(d.longitude.to_numpy(),d.latitude.to_numpy())
  d=d[d.biome.isin(['amazon','cerrado','caatinga','mata_atlantica','pantanal','pampa'])]
  d['ix']=np.floor(d.longitude*10).astype(int);d['iy']=np.floor(d.latitude*10).astype(int)
  d['lst']=((d.acq_time//100)+(d.acq_time%100)/60+d.longitude/15)%24
  d['near']=(d.track<=.4).astype(int)
  g=d.groupby(['acq_date','biome','ix','iy']).agg(count=('frp','size'),frp=('frp','sum'),lst=('lst','median'),near_fraction=('near','mean')).reset_index()
  g['sat']=sat;frames.append(g)
  print(year,sat,len(g),flush=True)
d=pd.concat(frames);keys=['acq_date','biome','ix','iy']
p=d[d.sat=='snpp'].drop(columns='sat').merge(d[d.sat=='noaa20'].drop(columns='sat'),on=keys,suffixes=('_snpp','_noaa20'))
p['dt']=p.lst_noaa20-p.lst_snpp
p['eligible']=(p.lst_noaa20>13.5)&(p.lst_snpp>13.5)&p.dt.abs().between(.25,1.5)
p.to_csv(D/'paired_cells.csv.gz',index=False)
summary=[]
for b,g in p.groupby('biome'):
 h=g[g.eligible].copy()
 row={'biome':b,'all_double_detection_pairs':len(g),'eligible_afternoon_pairs':len(h),'median_abs_separation_minutes':float(g.dt.abs().median()*60),'eligible_dates':h.acq_date.nunique()}
 for metric in ['count','frp']:
  q=h[(h[f'{metric}_noaa20']>0)&(h[f'{metric}_snpp']>0)]
  x=q.dt.to_numpy(); y=np.log(q[f'{metric}_noaa20']/q[f'{metric}_snpp']).to_numpy()
  block=((pd.to_datetime(q.acq_date)-pd.Timestamp('2018-01-01')).dt.days//16).to_numpy()
  blocks=np.arange(69); stats=np.array([[np.sum(block==k),np.sum(x[block==k]),np.sum(y[block==k]),np.sum(x[block==k]**2),np.sum(x[block==k]*y[block==k])] for k in blocks])
  rng=np.random.default_rng(20261115);w=np.vstack([np.ones(69),rng.poisson(1,(1000,69))]);n,sx,sy,sxx,sxy=(w@stats).T
  denom=sxx-sx*sx/n;beta=np.divide(sxy-sx*sy/n,denom,out=np.full(len(n),np.nan),where=denom>1e-12)
  ci=np.nanpercentile(beta[1:],[2.5,97.5]) if np.isfinite(beta[1:]).any() else [np.nan,np.nan]
  row.update({f'{metric}_beta':float(beta[0]),f'{metric}_lo':float(ci[0]),f'{metric}_hi':float(ci[1])})
 summary.append(row)
pd.DataFrame(summary).to_csv(D/'summary.csv',index=False)
print(pd.DataFrame(summary).to_string(index=False))
