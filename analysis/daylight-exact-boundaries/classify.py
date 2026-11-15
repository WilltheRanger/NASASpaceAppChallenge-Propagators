"""Exact-coordinate assignment to official IBGE 2019 biome polygons."""
import io,zipfile,unicodedata
import numpy as np
import shapefile,shapely
from shapely.geometry import shape
from shapely.ops import transform
from pyproj import CRS,Transformer
NAMES={'amazonia':'amazon','caatinga':'caatinga','cerrado':'cerrado','mata atlantica':'mata_atlantica','pampa':'pampa','pantanal':'pantanal'}
def norm(s):return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
class Classifier:
 def __init__(self,archive):
  with zipfile.ZipFile(archive) as z:
   stem=next(n[:-4] for n in z.namelist() if n.endswith('.shp'))
   r=shapefile.Reader(shp=io.BytesIO(z.read(stem+'.shp')),shx=io.BytesIO(z.read(stem+'.shx')),dbf=io.BytesIO(z.read(stem+'.dbf')),encoding='utf-8' if stem+'.CPG' in z.namelist() else 'latin1')
   tr=Transformer.from_crs(CRS.from_wkt(z.read(stem+'.prj' if stem+'.prj' in z.namelist() else stem+'.prj.txt').decode()),4326,always_xy=True)
   field='Bioma' if 'Bioma' in [f.name for f in r.fields] else 'NOM_BIOMA'
   self.geoms=[(NAMES[norm(s.record[field])],transform(tr.transform,shape(s.shape.__geo_interface__))) for s in r.iterShapeRecords() if norm(s.record[field]) in NAMES]
  for _,g in self.geoms:shapely.prepare(g)
 def classify(self,lon,lat):
  lon=np.asarray(lon);lat=np.asarray(lat);names=np.full(len(lon),'unassigned',dtype=object)
  for name,g in self.geoms:
   hit=shapely.intersects_xy(g,lon,lat)
   # Exact shared-border points take the first polygon in official feature order.
   names[hit & (names=='unassigned')]=name
  return names
