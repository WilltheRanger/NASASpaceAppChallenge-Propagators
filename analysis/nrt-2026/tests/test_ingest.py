import sys,unittest,json
from pathlib import Path
import pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ingest import normalize,get
D=Path(__file__).resolve().parents[1]
class IngestTests(unittest.TestCase):
 def fixture(self):return pd.DataFrame([dict(latitude=-3.,longitude=-60.,acq_date='2026-11-14',acq_time=1400,satellite='N20',daynight='D',confidence='n')])
 def test_no_type_not_invented(self):self.assertNotIn('type',normalize(self.fixture(),'noaa20'))
 def test_satellite_normalization(self):self.assertEqual(normalize(self.fixture(),'noaa20').satellite.iloc[0],'NOAA-20')
 def test_dedup(self):self.assertEqual(len(normalize(pd.concat([self.fixture()]*2),'noaa20')),1)
 def test_bad_time(self):
  d=self.fixture();d.acq_time=2460
  with self.assertRaises(ValueError):normalize(d,'noaa20')
 def test_unknown_satellite(self):
  d=self.fixture();d.satellite='unknown'
  with self.assertRaises(ValueError):normalize(d,'noaa20')
 def test_external_url_rejected(self):
  with self.assertRaises(ValueError):get('https://example.com/feed.csv')
 def test_output_reconciles(self):
  d=pd.read_csv(D/'out/daily_provisional.csv');p=json.loads((D/'out/provenance.json').read_text())
  self.assertEqual(int(d.daytime_detections.sum()),p['detections']);self.assertEqual(len(d),p['daily_rows']);self.assertTrue(d.provisional.all());self.assertFalse(d.coverage_complete.any());self.assertFalse(d.duplicated(['date','biome','satellite']).any())
if __name__=='__main__':unittest.main()
