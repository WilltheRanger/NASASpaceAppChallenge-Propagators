from pathlib import Path
import unittest,json
import pandas as pd,numpy as np
D=Path(__file__).resolve().parents[1]
class Tests(unittest.TestCase):
 def setUp(self):
  self.d=pd.read_csv(D/'individual_strength_daily.csv');self.r=pd.read_csv(D/'individual_strength_results.csv')
 def test_unique_positive_counts(self):
  self.assertFalse(self.d.duplicated(['date','biome','satellite','strength']).any());self.assertTrue((self.d['count']>0).all())
 def test_fixed_classes(self):
  self.assertEqual(set(self.d.strength),{0,1,2});self.assertEqual(set(self.d.satellite),{'Aqua','S-NPP'})
 def test_original_eligibility_preserved(self):
  self.assertEqual(len(self.r),30);self.assertEqual((self.r.original_status=='ok').sum(),29)
 def test_no_silent_nonfinite_bootstrap(self):
  self.assertTrue((self.r.finite_replicates==1000).all());self.assertTrue(np.isfinite(self.r.select_dtypes('number')).all().all())
 def test_intervals_and_decisions(self):
  r=self.r;self.assertTrue((r.strat_lo<=r.strat_hi).all());self.assertTrue(((r.individual_L_strat>=r.original_lo)&(r.individual_L_strat<=r.original_hi)).equals(r.within_original_interval))
 def test_original_p5_failure_not_relabelled(self):
  p=self.r[(self.r.biome=='pantanal')&(self.r.year==2024)].iloc[0];self.assertLess(p.original_L_strat,p.original_lo);self.assertFalse(p.within_original_interval)
 def test_raw_reconciliation(self):
  old=pd.read_csv(D.parent/'ibge-exact-diagnosis/historical/firms_daily_by_biome.csv');e=old[old.satellite.isin(['Aqua','S-NPP'])&old.biome.ne('unassigned')&(old.date>='2012-01-01')].groupby(['date','biome','satellite'])['count'].sum();a=self.d.groupby(['date','biome','satellite'])['count'].sum();a,e=a.align(e,fill_value=0);diff=(a-e)[a!=e]
  self.assertEqual(len(diff),1);self.assertEqual(diff.index[0],('2016-10-14','amazon','S-NPP'));self.assertEqual(diff.iloc[0],-1)
if __name__=='__main__':unittest.main()
