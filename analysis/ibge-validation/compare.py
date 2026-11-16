"""Compare independent IBGE-cell rerun to original INPE-label aggregate pipeline."""
import json
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parents[2]
NEW=ROOT/'analysis/ibge-validation'
old=pd.read_csv(ROOT/'analysis/brazil-data/out/firms_daily_by_biome.csv')
new=pd.read_csv(NEW/'out/firms_daily_by_biome.csv')
# Each detection should be conserved globally, even when its biome changes.
keys=['date','satellite','near_nadir']
a=old.groupby(keys)[['count','count_all']].sum().sort_index()
b=new.groupby(keys)[['count','count_all']].sum().sort_index()
pd.testing.assert_frame_equal(a,b,check_dtype=False)
a=old.groupby('biome').count_all.sum().rename('original_count');b=new.groupby('biome').count_all.sum().rename('ibge_count')
c=pd.concat([a,b],axis=1).fillna(0).astype(int);c['change']=c.ibge_count-c.original_count
c.to_csv(NEW/'out/biome_count_comparison.csv')
audit_old=pd.read_csv(ROOT/'analysis/statistics/out/audit_by_biome.csv');audit_new=pd.read_csv(NEW/'statistics/audit_by_biome.csv')
c=audit_old.merge(audit_new,on=['biome','year'],suffixes=('_original','_ibge'))
cols=['biome','year']+[k+s for k in ['L','L_lo','L_hi','status'] for s in ['_original','_ibge']]
c[cols].to_csv(NEW/'out/audit_comparison.csv',index=False)
checks_old=json.loads((ROOT/'data/out/checks.json').read_text());checks_new=json.loads((NEW/'data/out/checks.json').read_text())
checks=[{'id':a['id'],'original':a['status'],'ibge':b['status'],'ibge_detail':b['detail']} for a,b in zip(checks_old['checks'],checks_new['checks'])]
(NEW/'out/check_comparison.json').write_text(json.dumps(checks,indent=2)+'\n')
print('all daily satellite/near-nadir detection totals conserved exactly')
print(pd.read_csv(NEW/'out/biome_count_comparison.csv').to_string(index=False))
print(c[cols].to_string(index=False))
print(json.dumps(checks,indent=2))
# Keep branch-only sensitivity outputs self-describing; never relabel production files.
for path in (NEW/'data/out').rglob('*.json'):
 obj=json.loads(path.read_text())
 if isinstance(obj,dict):
  if isinstance(obj.get('note'),str):obj['note']=obj['note'].replace("Brazil biomes use INPE's biome labels", "Brazil biomes use IBGE 2019 0.1-degree cell-center assignments")
  obj['validation_variant']='IBGE 2019 cell-center sensitivity rerun; not merged production data'
  obj['biome_lookup_source']='IBGE 2019 1:250000, EPSG:4674 transformed to EPSG:4326'
  path.write_text(json.dumps(obj,indent=1)+'\n')
