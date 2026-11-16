import sys, os
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
import numpy as np,pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'ibge-exact-diagnosis'))
from classify import Classifier
D=Path(__file__).resolve().parent
C=None
def init(archive):
 global C; C=Classifier(archive)
def one(f):
 v='viirs' in f.name
 d=pd.read_csv(f,usecols=['latitude','longitude','acq_date','satellite','confidence','frp','daynight','type'],dtype={'confidence':str,'satellite':str})
 d=d[(d.daynight=='D')&(d.type==0)&(d.satellite.isin(['Aqua','N']))].copy()
 d=d[d.confidence.isin(['n','h']) if v else pd.to_numeric(d.confidence,errors='coerce')>=30]
 d=d[np.isfinite(d.frp)&(d.frp>=0)]
 d['biome']=C.classify(d.longitude.to_numpy(),d.latitude.to_numpy())
 d=d[d.biome!='unassigned'][['acq_date','satellite','biome','frp']]
 d['satellite']=d.satellite.replace({'N':'S-NPP'})
 print(f.name,len(d),flush=True)
 return d
if __name__=='__main__':
 raw,archive=sys.argv[1:]; fs=[Path(raw)/f'{prefix}_{y}_Brazil.csv' for y in range(2012,2026) for prefix in ['modis','viirs-snpp']]
 with ProcessPoolExecutor(max_workers=2,initializer=init,initargs=(archive,)) as pool: ds=list(pool.map(one,fs))
 d=pd.concat(ds,ignore_index=True)
 rows=[];cuts={}
 for biome,g in d.groupby('biome'):
  base=g[(g.satellite=='S-NPP')&(g.acq_date<'2021-01-01')]
  cut=np.quantile(base.frp,[1/3,2/3]);cuts[biome]=cut.tolist()
  g=g.copy();g['strength']=np.digitize(g.frp,cut)
  rows.append(g.groupby(['acq_date','biome','satellite','strength']).size().rename('count').reset_index())
 import json
 (D/'strength_cuts.json').write_text(json.dumps(cuts,indent=2)+'\n')
 pd.concat(rows).rename(columns={'acq_date':'date'}).to_csv(D/'individual_strength_daily.csv',index=False)
