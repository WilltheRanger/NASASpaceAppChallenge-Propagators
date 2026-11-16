import csv, math, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
class LookupTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  with (ROOT/'analysis/ibge-validation/out/biome_lookup_0p1deg.csv').open() as f:
   cls.rows=list(csv.DictReader(f))
  cls.lookup={(int(r['cell_lat']),int(r['cell_lon'])):r['biome'] for r in cls.rows}
 def test_unique(self):self.assertEqual(len(self.rows),len(self.lookup))
 def test_six_biomes(self):self.assertEqual(set(self.lookup.values()),{'amazon','cerrado','mata_atlantica','caatinga','pantanal','pampa'})
 def test_interior_landmarks(self):
  for lat,lon,name in [(-3.1,-60.0,'amazon'),(-15.8,-47.9,'cerrado'),(-9.4,-40.5,'caatinga'),(-19.0,-57.5,'pantanal'),(-30.5,-54.0,'pampa'),(-23.5,-46.6,'mata_atlantica')]:
   with self.subTest(name=name):self.assertEqual(self.lookup[math.floor(lat*10),math.floor(lon*10)],name)
 def test_no_nearest_fill(self):self.assertTrue(all(r['source']=='ibge_2019_cell_center' for r in self.rows))
 def test_ocean_unassigned(self):self.assertNotIn((-200,-300),self.lookup)
if __name__=='__main__':unittest.main()
