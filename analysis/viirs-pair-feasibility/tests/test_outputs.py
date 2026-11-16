from pathlib import Path
import unittest
import pandas as pd
import numpy as np
D=Path(__file__).resolve().parents[1]
class PairTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.p=pd.read_csv(D/'paired_cells.csv.gz');cls.s=pd.read_csv(D/'summary.csv')
 def test_unique_cell_day_biome(self):
  self.assertFalse(self.p.duplicated(['acq_date','biome','ix','iy']).any())
 def test_no_zero_imputation(self):
  self.assertTrue((self.p[['count_snpp','count_noaa20']]>0).all().all())
 def test_pre_outcome_period(self):
  self.assertTrue(self.p.acq_date.between('2018-01-01','2020-12-31').all())
 def test_time_eligibility(self):
  p=self.p;expected=(p.lst_noaa20>13.5)&(p.lst_snpp>13.5)&p.dt.abs().between(.25,1.5)
  self.assertTrue((expected==p.eligible).all())
 def test_time_difference(self):
  np.testing.assert_allclose(self.p.dt,self.p.lst_noaa20-self.p.lst_snpp,atol=1e-12)
 def test_counts_reconcile(self):
  for r in self.s.itertuples():
   p=self.p[self.p.biome==r.biome]
   self.assertEqual(len(p),r.all_double_detection_pairs)
   self.assertEqual(p.eligible.sum(),r.eligible_afternoon_pairs)
 def test_ols_point_independently(self):
  for r in self.s.itertuples():
   q=self.p[(self.p.biome==r.biome)&self.p.eligible]
   for metric in ['count','frp']:
    q=q[(q[f'{metric}_noaa20']>0)&(q[f'{metric}_snpp']>0)]
    slope=np.linalg.lstsq(np.c_[np.ones(len(q)),q.dt],np.log(q[f'{metric}_noaa20']/q[f'{metric}_snpp']),rcond=None)[0][1]
    self.assertAlmostEqual(slope,getattr(r,f'{metric}_beta'),places=9)
if __name__=='__main__':unittest.main()
