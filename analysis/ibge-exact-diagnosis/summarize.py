"""Compare all methods without changing P3 thresholds or its eligible months."""
from pathlib import Path
import json,hashlib
import pandas as pd
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
paths={'original_inpe_grid':ROOT/'analysis/brazil-data/out','ibge2019_grid':ROOT/'analysis/ibge-validation/out','ibge2019_exact':HERE/'out','historical_ibge_exact':HERE/'historical'}
base=pd.read_csv(paths['original_inpe_grid']/'firms_daily_by_biome.csv').groupby(['date','satellite','near_nadir'])[['count','count_all']].sum().sort_index()
summary=[]
for name,path in paths.items():
 d=pd.read_csv(path/'firms_daily_by_biome.csv').groupby(['date','satellite','near_nadir'])[['count','count_all']].sum().sort_index();pd.testing.assert_frame_equal(base,d,check_dtype=False)
 m=pd.read_csv(path/'inpe_reproduction_monthly.csv');m=m[(m.biome!='brazil')&m.ym.between('2012-01','2020-12')&(m.inpe>0)].copy();m['within_10pct']=abs(m.firms_aqua_all/m.inpe-1)<=.1
 for b,g in [('all',m),*m.groupby('biome')]:summary.append({'method':name,'biome':b,'matched':int(g.within_10pct.sum()),'eligible':len(g),'rate':g.within_10pct.mean()})
 m.loc[~m.within_10pct].to_csv(HERE/f'failed_months_{name}.csv',index=False)
pd.DataFrame(summary).to_csv(HERE/'p3_method_comparison.csv',index=False)
old=pd.read_csv(ROOT/'analysis/statistics/out/audit_by_biome.csv');new=pd.read_csv(HERE/'statistics/audit_by_biome.csv')
c=old.merge(new,on=['biome','year'],suffixes=('_original','_historical_exact'));c.to_csv(HERE/'audit_comparison.csv',index=False)
for path in (HERE/'data/out').rglob('*.json'):
 obj=json.loads(path.read_text())
 if isinstance(obj,dict):
  if isinstance(obj.get('note'),str):obj['note']=obj['note'].replace("Brazil biomes use INPE's biome labels", "Brazil biomes use exact-coordinate official historical IBGE polygons")
  obj['validation_variant']='Historical IBGE exact-coordinate classification; isolated candidate, not production'
  path.write_text(json.dumps(obj,indent=1)+'\n')
print(pd.DataFrame(summary).query("biome=='all'").to_string(index=False))
print(c.query("biome=='amazon' and year==2025")[['L_original','L_historical_exact','L_lo_historical_exact','L_hi_historical_exact']].to_string(index=False))
