import unittest
import numpy as np
from scipy.spatial import cKDTree
from extract_fine import query_grid_batched,xyz
class QueryTests(unittest.TestCase):
 def test_bitwise_equivalent_with_ties_and_missing(self):
  lat=np.array([-12.,-12.,-12.0005,-12.1]);lon=np.array([-60.,-60.,-60.0005,-60.1])
  tree=cKDTree(xyz(lat[:3],lon[:3]));ids=np.arange(4)
  a,b=tree.query(xyz(lat,lon),distance_upper_bound=375)
  x,y=query_grid_batched(tree,lat,lon,ids,block_size=1)
  np.testing.assert_array_equal(a,x);np.testing.assert_array_equal(b,y)
 def test_empty(self):
  tree=cKDTree(np.empty((0,3)));a,b=query_grid_batched(tree,np.array([]),np.array([]),np.array([],dtype=int))
  self.assertEqual(len(a),0);self.assertEqual(len(b),0)
