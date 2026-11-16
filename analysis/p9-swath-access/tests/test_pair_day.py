import sys,tempfile,unittest
from pathlib import Path
import numpy as np
P=Path(__file__).resolve().parents[1];sys.path.insert(0,str(P))
from pair_day import pair
class PairTests(unittest.TestCase):
 def test_nonfire_kept_and_closest_pair_selected(self):
  with tempfile.TemporaryDirectory() as td:
   r=Path(td);np.savez(r/'grid.npz',lon=[-50,-50,-50],lat=[-10,-10,-10],biome=['amazon']*3)
   def save(name,ids,utc,local,fires):np.savez(r/name,grid_id=ids,utc_seconds_since_1993=utc,local_hour=local,fire=fires,zenith=np.zeros(len(ids)))
   save('VNP.A2019015.1.npz',[0,1,2],[0,0,0],[14,13,14],[False,True,True])
   save('VJ1.A2019015.1.npz',[0,1,2],[3600,3600,3600],[15,14,15],[False,False,True])
   save('VJ1.A2019015.2.npz',[0],[1800],[14.5],[True])
   x=pair(r,'A2019015',r/'result.npz');d=np.load(r/'result.npz')
   self.assertEqual(x['unique_eligible_centers'],2)
   self.assertEqual(list(d['grid_id']),[0,2])
   self.assertEqual(list(d['dt_hours']),[.5,1.])
   self.assertEqual(x['biomes']['amazon']['snpp_fire'],1)
   self.assertEqual(x['biomes']['amazon']['noaa20_fire'],2)
 def test_empty_day_is_not_a_pass(self):
  with tempfile.TemporaryDirectory() as td:
   r=Path(td);np.savez(r/'grid.npz',lon=[-50],lat=[-10],biome=['amazon'])
   x=pair(r,'A2019015',r/'result.npz');self.assertEqual(x['unique_eligible_centers'],0)
