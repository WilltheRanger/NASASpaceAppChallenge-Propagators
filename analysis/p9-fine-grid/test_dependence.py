import unittest
from dependence import components,summary
class Tests(unittest.TestCase):
 def test_transitive_shared_pixels(self):
  c=components(['a','a','b','c'],['x','y','y','z'])
  self.assertEqual(c[0],c[2]);self.assertNotEqual(c[2],c[3])
 def test_satellite_namespaces(self):
  c=components(['a','b'],['b','a']);self.assertNotEqual(c[0],c[1])
 def test_duplicates_not_new_pairs(self):
  r=summary(['a','a'],['b','b']);self.assertEqual(r['distinct_native_pixel_pairs'],1);self.assertEqual(r['native_dependence_components'],1)
 def test_empty(self):self.assertEqual(summary([],[])['native_dependence_components'],0)

class NumericTests(unittest.TestCase):
 def test_matches_transitive_structure(self):
  from dependence import numeric_components
  a=[1,1,2,3];b=[1,2,2,3]
  c=numeric_components(a,b);d=components(a,b)
  for i in range(4):
   for j in range(4):self.assertEqual(c[i]==c[j],d[i]==d[j])
