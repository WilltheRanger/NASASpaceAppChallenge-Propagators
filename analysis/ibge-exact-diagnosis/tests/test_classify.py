import os,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from classify import Classifier
@unittest.skipUnless(os.environ.get('IBGE_ARCHIVE'), 'needs IBGE_ARCHIVE: the raw IBGE biome zip, kept outside the repo (see README)')
class Tests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.c=Classifier(os.environ['IBGE_ARCHIVE'])
 def test_six_polygons(self):self.assertEqual({n for n,g in self.c.geoms},{'amazon','cerrado','caatinga','mata_atlantica','pantanal','pampa'})
 def test_interior_landmarks(self):self.assertEqual(list(self.c.classify([-60,-47.9,-40.5,-56.5,-54,-46.6],[-3.1,-15.8,-9.4,-18,-30.5,-23.5])),['amazon','cerrado','caatinga','pantanal','pampa','mata_atlantica'])
 def test_ocean_unassigned(self):self.assertEqual(list(self.c.classify([-30],[-20])),['unassigned'])
 def test_empty(self):self.assertEqual(len(self.c.classify([],[])),0)
 def test_repeatable(self):self.assertEqual(list(self.c.classify([-60,-60],[-3.1,-3.1])),['amazon','amazon'])
if __name__=='__main__':unittest.main()
