"""Fixed 0.005-degree all-biome grid; batched exact official polygon labels."""
from pathlib import Path
import sys
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'ibge-exact-diagnosis'))
from classify import Classifier
BIOMES=['amazon','cerrado','caatinga','mata_atlantica','pantanal','pampa']
def build(archive,out):
 c=Classifier(archive);parts=[]
 # One latitude band at a time, independent of observed masks/fire outcomes.
 for lat0 in range(-34,6):
  lon,lat=np.meshgrid(np.arange(-73.9975,-34,.005),np.arange(lat0+.0025,lat0+1,.005))
  lon=lon.ravel();lat=lat.ravel();labels=c.classify(lon,lat)
  k=np.isin(labels,BIOMES)
  codes=np.full(len(lon),255,dtype=np.uint8)
  for j,b in enumerate(BIOMES):codes[labels==b]=j
  parts.append((lon[k].astype('float64'),lat[k].astype('float64'),codes[k]))
  print(lat0,int(k.sum()),flush=True)
 np.savez_compressed(out,lon=np.concatenate([v[0] for v in parts]),lat=np.concatenate([v[1] for v in parts]),biome_code=np.concatenate([v[2] for v in parts]),biome_names=np.array(BIOMES))
if __name__=='__main__':build(Path(sys.argv[1]),Path(sys.argv[2]))
