from pathlib import Path
import json
import numpy as np
import pandas as pd
D=Path(__file__).resolve().parent
B=['amazon','cerrado','caatinga','mata_atlantica','pantanal','pampa']
a=pd.read_csv(D/'statistics/audit_by_biome.csv')
a=a[a.biome.isin(B)&(a.status=='ok')].copy()
a['p5_original_pass']=(a.L_strat>=a.L_lo)&(a.L_strat<=a.L_hi)
a['p5_exploratory_paired_difference_contains_zero']=(a.L_strat_difference_lo<=0)&(a.L_strat_difference_hi>=0)
a.to_csv(D/'audit_failure_evidence.csv',index=False)
s=a[a.shift_h.abs()<=1].copy()
s['p7_original_pass']=(s.L_pred>=s.L_lo90)&(s.L_pred<=s.L_hi90)
s['p7_exploratory_matched_near_nadir_pass']=(s.L_pred>=s.L_near_lo90)&(s.L_pred<=s.L_near_hi90)
s.to_csv(D/'closure_sensitivity.csv',index=False)
t=pd.read_csv(D/'statistics/twoclocks_by_biome.csv')
t=t[t.year>=2022].merge(a,on=['biome','year'],suffixes=('_clock','_audit'))
t['p10_original_pass']=(t.clock_share_logA>=t.logL_lo)&(t.clock_share_logA<=t.logL_hi)
t['p10_exploratory_matched_near_nadir_pass']=(t.clock_share_logA>=np.log(t.L_near_lo))&(t.clock_share_logA<=np.log(t.L_near_hi))
t.to_csv(D/'twoclock_sensitivity.csv',index=False)
result={k:{'supported':int(df[k].sum()),'eligible':len(df)} for df,keys in [(a,['p5_original_pass','p5_exploratory_paired_difference_contains_zero']),(s,['p7_original_pass','p7_exploratory_matched_near_nadir_pass']),(t,['p10_original_pass','p10_exploratory_matched_near_nadir_pass'])] for k in keys}
result['warning']='Post-hoc sensitivities do not replace original checks or establish causality; near-nadir sensitivities retain original eligible rows for comparability.'
(D/'sensitivity_summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
