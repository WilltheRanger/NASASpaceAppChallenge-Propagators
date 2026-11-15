import json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
class CopyTests(unittest.TestCase):
 def test_p9_followup_keeps_identification_limits(self):
  j=json.loads((ROOT/'data/out/p9-followup.json').read_text())
  self.assertEqual((j['complete_dates'],j['expected_swaths']),(18,330))
  self.assertEqual((j['primary_eligible'],j['sensitivity_eligible'],j['discordant_fires']),(0,342300,46))
  self.assertEqual(j['all_biomes_status'],'insufficient_identification')
  self.assertIn(j['source_commit'],j['report_url'])
 def test_copy_distinguishes_observation_from_counterfactual(self):
  method=(ROOT/'frontend/src/directions/r2/Method.tsx').read_text()
  overview=(ROOT/'frontend/src/directions/r2/Overview.tsx').read_text()
  self.assertNotIn('real difference is very likely',overview)
  self.assertNotIn('what Aqua would have counted at its old time',overview+method)
  self.assertNotIn('Nothing after ${lastYear} yet',method)
  self.assertIn('not a new pass',method)
  self.assertIn('bootstrap interval',overview)
  self.assertIn('Aqua detections for every 100 VIIRS detections',method)
