from pathlib import Path
import json
import pandas as pd,numpy as np
import daylight as dl
D=Path(__file__).resolve().parent
checks=pd.read_csv(D/'charts/detection_checks.csv')
daily=pd.read_csv(D/'inputs/analysis/brazil-data/out/firms_daily_by_biome.csv');daily=daily[daily.near_nadir==1].copy();daily['year']=daily.date.str[:4].astype(int)
tot=daily.groupby(['biome','satellite','year'])['count'].sum()
count_pass=time_exact=time_minute=0;comparison=[]
for r in checks.itertuples():
 rid=r.region;b=dl.CSV_KEY[rid];sat=dl.CSV_SAT[r.satellite]
 count_pass+=int(r.n==tot.get((b,sat,r.year),0))
 dr=json.loads((D/f'inputs/data/out/drift/{rid}.json').read_text());want=next(x for x in dr['years'] if x['year']==r.year)[r.satellite+'_lst'];got=dl.hhmm_brady(r.lst_median)
 time_exact+=int(want==got);time_minute+=int(abs(dl.hm(want)-dl.hm(got))*60<=1+1e-9)
for rid in dl.REGIONS:
 new=json.loads((D/f'out/{rid}.json').read_text());old=json.loads((D.parent.parent/'data/out/daylight'/f'{rid}.json').read_text())
 assert new['boundary_variant']=='historical IBGE exact coordinates'
 for sat in dl.SATS:
  for y in new['years']:
   assert y[f'n_{sat}']>=0
   for val in y[f'{sat}_share_after_dark'].values():assert 0<=val<=1
   for val in y[f'{sat}_D_median'].values():assert val>=0
 n=next(y for y in new['years'] if y['year']==2025);o=next(y for y in old['years'] if y['year']==2025)
 comparison.append({'region':rid,'old_n':o['n_aqua'],'exact_n':n['n_aqua'],'old_daylight_1_5h':o['aqua_D_median']['1.5'],'exact_daylight_1_5h':n['aqua_D_median']['1.5'],'old_after_dark_3h':o['aqua_share_after_dark']['3'],'exact_after_dark_3h':n['aqua_share_after_dark']['3']})
# Existing independent NOAA web spot checks: Manaus2025-09-15 sunset17:58 UTC-4 converted to LMST.
manaus=float(dl.sunset_lmst(dl.jd0(__import__('datetime').date(2025,9,15)),-3.1,-60.02))
assert abs(manaus-17.9653)*60<1
assert count_pass==len(checks)==126
assert time_minute==126 and time_exact/126>=.98
result={'near_nadir_counts_exact':f'{count_pass}/126','look_times_exact':f'{time_exact}/126','look_times_within_1minute':f'{time_minute}/126','noaa_manaus_within_1minute':True,'comparisons_2025':comparison,'scope':'Brazil only; original six-region benchmark suite not claimed'}
(D/'validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
