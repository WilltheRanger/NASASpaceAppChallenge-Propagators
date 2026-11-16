import sys, unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from methods import common_reference_days, reference_containment

class MethodsTests(unittest.TestCase):
    def test_each_satellite_required(self):
        rows=np.ones((5,4),dtype=bool)
        for i in range(4): rows[i,i]=False
        np.testing.assert_array_equal(common_reference_days(*rows.T),[False]*4+[True])
    def test_written_containment_direction(self):
        # snpp=2 is outside NOAA20=[0.9,1.1], even when NOAA20=1 is inside SNPP=[0,3].
        self.assertFalse(reference_containment(2.,.9,1.1))
    def test_inclusive_boundaries(self):
        np.testing.assert_array_equal(reference_containment(np.array([.9,1.,1.1]),.9,1.1),[True]*3)
    def test_missing_interval_not_pass(self):
        self.assertFalse(reference_containment(1.,float('nan'),1.1))
    def test_all_missing_days_excluded(self):
        self.assertFalse(common_reference_days(False,False,False,False))
if __name__=='__main__': unittest.main()
