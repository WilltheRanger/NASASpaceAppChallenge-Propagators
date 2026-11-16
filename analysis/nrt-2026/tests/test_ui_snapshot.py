"""Check imported provenance and keep provisional data out of the calendar."""
import json, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
class SnapshotTests(unittest.TestCase):
 def test_saved_provenance(self):
  m=json.loads((ROOT/'analysis/nrt-2026/out/provenance.json').read_text())
  self.assertEqual(m['detections'],42176)
  self.assertEqual((m['date_min'],m['date_max']),('2026-11-08','2026-11-14'))
  self.assertFalse(m['snpp_feed_listed'])
  self.assertTrue(all(len(s['sha256'])==64 for s in m['sources']))
 def test_calendar_excludes_nrt(self):
  for p in (ROOT/'data/out/calendar').glob('*.json'):
   self.assertTrue(all(x['ym']<'2026-01' for x in json.loads(p.read_text())['months']))
if __name__=='__main__': unittest.main()
