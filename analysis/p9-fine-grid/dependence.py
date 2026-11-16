"""Native-pixel dependence bookkeeping, not an independence assumption."""
import numpy as np
def components(left,right):
 """Connected components of bipartite native pixel identities.
 IDs must include granule identity, not merely row/column indexes.
 Repeated fixed-grid centers sharing either native pixel stay clustered.
 """
 if len(left)!=len(right):raise ValueError('length mismatch')
 parent={}
 def find(x):
  parent.setdefault(x,x)
  while parent[x]!=x:
   parent[x]=parent[parent[x]];x=parent[x]
  return x
 for a,b in zip(left,right):
  a=('snpp',str(a));b=('noaa',str(b));pa,pb=find(a),find(b)
  if pa!=pb:parent[pb]=pa
 roots=[find(('snpp',str(a))) for a in left]
 names={r:i for i,r in enumerate(sorted(set(roots)))}
 return np.array([names[r] for r in roots],dtype=np.int64)
def summary(left,right):
 labels=components(left,right)
 return {'fixed_grid_pairs':len(left),'distinct_native_pixel_pairs':len(set(zip(map(str,left),map(str,right)))),'native_dependence_components':len(set(labels)),'maximum_centers_per_component':int(np.bincount(labels).max()) if len(labels) else 0,'interpretation':'These counts do not establish independent spatial samples; adjacent pixels and repeated dates may remain correlated.'}

def numeric_components(left,right):
 """Memory-bounded equivalent for integer granule+pixel identifiers."""
 from scipy.sparse import coo_matrix
 from scipy.sparse.csgraph import connected_components
 left=np.asarray(left,dtype=np.int64);right=np.asarray(right,dtype=np.int64)
 if len(left)!=len(right):raise ValueError('length mismatch')
 if not len(left):return np.array([],dtype=np.int64)
 _,li=np.unique(left,return_inverse=True);_,ri=np.unique(right,return_inverse=True)
 offset=int(li.max())+1;ri=ri+offset
 graph=coo_matrix((np.ones(len(li),dtype=np.uint8),(li,ri)),shape=(int(ri.max())+1,int(ri.max())+1)).tocsr()
 _,labels=connected_components(graph,directed=False)
 return labels[li]
