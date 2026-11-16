import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from masks import paired_counts
from discover import data_links
class TestMasks(unittest.TestCase):
 def test_requires_registration(self):
  with self.assertRaises(ValueError): paired_counts([5],[5])
 def test_cloud_not_zero(self):
  self.assertEqual(paired_counts([4,8],[5,5],registered=True)['common_clear_pixels'],1)
 def test_clear_nonfire_in_denominator(self):
  x=paired_counts([5,8],[5,9],registered=True);self.assertEqual(x['left_fraction'],.5)
 def test_missing_all_unknown(self):
  self.assertIsNone(paired_counts([0,1,2,3,4,6,7],[5]*7,registered=True)['left_fraction'])
 def test_mismatched_shape(self):
  with self.assertRaises(ValueError):paired_counts([5],[],registered=True)
 def test_unknown_class(self):
  with self.assertRaises(ValueError):paired_counts([255],[5],registered=True)
 def test_no_inherited_or_browse_links(self):
  e={'links':[{'href':'https://data.nasa.gov/a','rel':'http://esipfed.org/ns/fedsearch/1.1/data#'},{'href':'https://data.nasa.gov/b','rel':'browse#'}]}
  self.assertEqual(data_links(e),['https://data.nasa.gov/a'])
if __name__=='__main__':unittest.main()
