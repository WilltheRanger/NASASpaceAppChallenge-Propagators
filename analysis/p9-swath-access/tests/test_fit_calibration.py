import sys,tempfile,unittest
from pathlib import Path
import numpy as np
from scipy.special import expit
P=Path(__file__).resolve().parents[1];sys.path.insert(0,str(P))
from fit_calibration import fit_arrays,run
class FitTests(unittest.TestCase):
 def test_recovers_known_conditional_slope(self):
  x=np.linspace(-1,1,100);X=np.column_stack([np.ones(100),x]);n=np.full(100,100.);y=n*expit(.2+.7*x)
  b=fit_arrays(X,y,n);self.assertIsNotNone(b);np.testing.assert_allclose(b,[.2,.7],atol=1e-5)
 def test_rank_deficiency_rejected(self):
  X=np.ones((20,2));self.assertIsNone(fit_arrays(X,np.ones(20),np.full(20,2)))
 def test_no_data_is_not_pass(self):
  with tempfile.TemporaryDirectory() as td:
   r=Path(td);np.savez(r/'grid.npz',lon=[-50],lat=[-10],biome=['amazon'])
   result=run(r);self.assertFalse(result['complete']);self.assertTrue(all(b['beta'] is None and b['status']=='insufficient_identification' for b in result['biomes']))
