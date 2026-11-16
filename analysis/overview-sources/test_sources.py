import json, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
class SourcesTests(unittest.TestCase):
 def test_scopes_and_anchor(self):
  s=(ROOT/'frontend/src/directions/r2/Overview.tsx').read_text()
  m=(ROOT/'frontend/src/directions/r2/Method.tsx').read_text()
  # the Overview's supporting figures and citations now sit on the Method page, before its sources
  self.assertIn('export function OverviewNotes',s)
  self.assertLess(m.index('<OverviewNotes links='),m.index('id="sources"'))
  self.assertIn('Full-year Amazon totals',s)
  self.assertIn('Matched-day Amazon audit',s)
  self.assertIn('These are not the full-year totals above',s)
  self.assertIn('Close call: just outside the usual range',s)
 def test_modis_version_disclosure(self):
  for name in ["directions/r2/common.tsx", "directions/r2/Method.tsx", "r2/download.ts"]:
   s=(ROOT/"frontend/src"/name).read_text()
   self.assertNotIn("MODIS Collection 6.1",s)
   self.assertIn("6.2, 6.03, 61.03",s)
   self.assertIn("collection consistency remains a limitation",s)
  s=(ROOT/"frontend/src/directions/r2/common.tsx").read_text()
  self.assertIn("MODIS 6.1NRT and VIIRS 2.0NRT",s)
 def test_numbers_reconciled(self):
  f=next(x['value'] for x in json.loads((ROOT/'data/out/facts.json').read_text())['facts'] if x['id']=='amazon_decline_2024_2025')
  self.assertEqual(round(abs(f['inpe_pct'])),69)
  self.assertEqual(round(abs(f['fixed_pct'])),74)
  y=next(x for x in json.loads((ROOT/'data/out/audit/br-amazon.json').read_text())['years'] if x['year']==2025)
  self.assertEqual(y['aqua_count'],43002)
  self.assertEqual(round(y['fixed_count']),33172)
if __name__=='__main__': unittest.main()
