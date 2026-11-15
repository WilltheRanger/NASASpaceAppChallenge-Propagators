import unittest,numpy as np
from fit_fine import aggregate
class TestAggregate(unittest.TestCase):
 def test_original_reference_equivalence(self):
  lon=np.array([-60.01,-60.02,-59.98]);lat=np.array([-12.01,-12.02,-11.98]);codes=np.array([0,0,1]);d=dict(grid_id=np.arange(3),dt_hours=np.array([.5,.6,-.5]),zenith_diff=np.array([4.,8.,-3.]),snpp_fire=np.array([1,0,1]),noaa20_fire=np.array([0,1,1]))
  result=aggregate(lon,lat,codes,d,.05)
  for row in result:
   k=(codes==row[0])&(np.floor(lon*2)==row[1])&(np.floor(lat*2)==row[2]);w=np.cos(np.deg2rad(lat[k]));expected=[np.average(d['dt_hours'][k],weights=w),np.average(d['zenith_diff'][k],weights=w),sum(w*d['snpp_fire'][k]),sum(w*d['noaa20_fire'][k]),sum(w)]
   np.testing.assert_allclose(row[3:],expected,rtol=1e-14)
 def test_density_area_not_count_inflation(self):
  def calc(n,spacing):
   d=dict(grid_id=np.arange(n),dt_hours=np.full(n,.5),zenith_diff=np.full(n,3.),snpp_fire=np.ones(n),noaa20_fire=np.zeros(n));return aggregate(np.full(n,-60.01),np.full(n,-12.01),np.zeros(n,int),d,spacing)
  np.testing.assert_allclose(calc(1,.05),calc(100,.005),rtol=1e-14)
if __name__=='__main__':unittest.main()

class PairedGridTests(unittest.TestCase):
 def test_mismatched_paired_grid_rejected(self):
  import tempfile,json
  from pathlib import Path
  from fit_fine import run
  with tempfile.TemporaryDirectory() as td:
   root=Path(td);np.savez(root/'full-grid.npz',lon=[-50.],lat=[-10.],biome_code=[0],biome_names=['amazon'])
   day=root/'full-2018-07-15';day.mkdir()
   np.savez(day/'paired-native-components.npz',grid_id=np.array([],dtype=int))
   (day/'result.json').write_text(json.dumps({'date':'2018-07-15','input_complete':True,'grid_sha256':'wrong'}))
   with self.assertRaisesRegex(ValueError,'grid fingerprint'):run(root)
