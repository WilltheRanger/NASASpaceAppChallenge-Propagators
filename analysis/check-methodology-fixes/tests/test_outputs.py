import json, unittest
from pathlib import Path
import numpy as np
import pandas as pd
D=Path(__file__).resolve().parents[1]
class OutputTests(unittest.TestCase):
    def test_original_predictions_preserved(self):
        c={v['id']:v for v in json.loads((D/'data/out/checks.json').read_text())['checks']}
        for p in ['P5','P7','P10']: self.assertEqual(c[p]['status'],'fail')
        for p in ['P1','P9']: self.assertEqual(c[p]['status'],'pending')
        self.assertEqual(c['P6']['status'],'pass')
    def test_audit_point_estimates_unchanged(self):
        old=pd.read_csv(D.parent/'ibge-exact-diagnosis/statistics/audit_by_biome.csv')
        new=pd.read_csv(D/'statistics/audit_by_biome.csv')
        for col in ['L','L_lo','L_hi','L_strat','L_pred']:
            np.testing.assert_allclose(old[col],new[col],equal_nan=True)
    def test_sensitivity_retains_denominators(self):
        s=json.loads((D/'sensitivity_summary.json').read_text())
        self.assertEqual(s['p7_original_pass']['eligible'],s['p7_exploratory_matched_near_nadir_pass']['eligible'])
        self.assertEqual(s['p10_original_pass']['eligible'],s['p10_exploratory_matched_near_nadir_pass']['eligible'])
    def test_reference_outputs_finite(self):
        r=pd.read_csv(D/'statistics/reference_satellite_by_biome.csv')
        self.assertTrue(np.isfinite(r.select_dtypes('number')).all().all())
if __name__=='__main__': unittest.main()
