import importlib.util
import json
import unittest
from pathlib import Path
import numpy as np
P=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pilot',P/'pilot.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class PilotTests(unittest.TestCase):
 def test_spherical_distance(self):
  p=m.xyz(np.array([0,0]),np.array([0,1]))
  self.assertAlmostEqual(np.linalg.norm(p[1]-p[0]),111193.669,places=2)
 def test_result_reconciles(self):
  r=json.loads((P/'pilot_result.json').read_text())
  self.assertEqual(sum(r['counts'].values()),r['common_usable_centers'])
  self.assertLessEqual(r['common_usable_centers'],min(s['grid_usable'] for s in r['satellites'].values()))
  self.assertEqual(r['status'],'engineering_pilot_not_formal_P9')
 def test_distinct_provenanced_inputs(self):
  r=json.loads((P/'pilot_result.json').read_text())
  self.assertEqual(len(r['files']),4)
  self.assertEqual(len({v['sha256'] for v in r['files'].values()}),4)
  self.assertTrue(all(len(v['sha256'])==64 and v['bytes']>1000000 for v in r['files'].values()))
