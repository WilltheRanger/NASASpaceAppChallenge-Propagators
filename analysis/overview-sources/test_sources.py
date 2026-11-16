import json, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
class SourcesTests(unittest.TestCase):
 def test_scopes_and_anchor(self):
  s=(ROOT/'frontend/src/directions/r2/Overview.tsx').read_text()
  self.assertLess(s.index('<Doors links='),s.index('<OverviewNotes links='))
  self.assertIn('id="overview-sources"',s)
  self.assertIn('Full-year Amazon totals',s)
  self.assertIn('Matched-day Amazon audit',s)
  self.assertIn('These are not the full-year totals above',s)
  self.assertIn('Close call: just outside the usual range',s)
 def test_numbers_reconciled(self):
  f=next(x['value'] for x in json.loads((ROOT/'data/out/facts.json').read_text())['facts'] if x['id']=='amazon_decline_2024_2025')
  self.assertEqual(round(abs(f['inpe_pct'])),69)
  self.assertEqual(round(abs(f['fixed_pct'])),74)
  y=next(x for x in json.loads((ROOT/'data/out/audit/br-amazon.json').read_text())['years'] if x['year']==2025)
  self.assertEqual(y['aqua_count'],43002)
  self.assertEqual(round(y['fixed_count']),33172)
if __name__=='__main__': unittest.main()
