"""Build independent 0.1 degree biome lookup from official IBGE 2019 1:250k polygons.

Usage: python build_ibge_lookup.py Biomas_250mil.zip OUT_DIR
Cells are assigned by their geographic center, not by fire observations. Border/coast
cells remain an approximation at this resolution; centers outside all polygons are
omitted (the FIRMS aggregator marks their detections unassigned). No nearest fill.
"""
import argparse, hashlib, io, json, unicodedata, zipfile
from pathlib import Path
import numpy as np
import pandas as pd
import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import shape
from shapely.ops import transform
import shapely

URL='https://geoftp.ibge.gov.br/informacoes_ambientais/estudos_ambientais/biomas/vetores/Biomas_250mil.zip'
NAMES={'amazonia':'amazon','caatinga':'caatinga','cerrado':'cerrado','mata atlantica':'mata_atlantica','pampa':'pampa','pantanal':'pantanal'}
def norm(s):
 return ''.join(c for c in unicodedata.normalize('NFD',s.lower()) if unicodedata.category(c)!='Mn')
def build(archive, out):
 out=Path(out);out.mkdir(parents=True,exist_ok=True)
 payload=Path(archive).read_bytes()
 with zipfile.ZipFile(io.BytesIO(payload)) as z:
  stem=next(n[:-4] for n in z.namelist() if n.endswith('.shp'))
  reader=shapefile.Reader(shp=io.BytesIO(z.read(stem+'.shp')),shx=io.BytesIO(z.read(stem+'.shx')),dbf=io.BytesIO(z.read(stem+'.dbf')))
  crs=CRS.from_wkt(z.read(stem+'.prj').decode())
  tr=Transformer.from_crs(crs,4326,always_xy=True)
  geoms=[(NAMES[norm(sr.record['Bioma'])],transform(tr.transform,shape(sr.shape.__geo_interface__))) for sr in reader.iterShapeRecords()]
 assert len(geoms)==6 and len({b for b,g in geoms})==6
 bounds=shapely.total_bounds([g for _,g in geoms]);lo0,la0,lo1,la1=bounds
 lat,lon=np.meshgrid(np.arange(int(np.floor(la0*10)),int(np.ceil(la1*10))),np.arange(int(np.floor(lo0*10)),int(np.ceil(lo1*10))),indexing='ij')
 lat=lat.ravel();lon=lon.ravel();x=(lon+.5)/10;y=(lat+.5)/10
 labels=np.full(len(x),'',dtype=object)
 for name,g in geoms:
  shapely.prepare(g)
  hit=shapely.intersects_xy(g,x,y)
  assert not np.any((labels!='') & hit), 'overlapping biome assignments'
  labels[hit]=name
 keep=labels!=''
 frame=pd.DataFrame({'cell_lat':lat[keep],'cell_lon':lon[keep],'biome':labels[keep], 'n_points':0,'share':np.nan,'source':'ibge_2019_cell_center'})
 frame.to_csv(out/'biome_lookup_0p1deg.csv',index=False)
 meta={'source_url':URL,'source_sha256':hashlib.sha256(payload).hexdigest(),'edition':'IBGE 2019, 1:250000','source_crs':crs.to_string(),'target_crs':'EPSG:4326','method':'0.1 degree cell center; no nearest fill; not exact per-detection boundary assignment','cells':len(frame),'biome_cells':frame.groupby('biome').size().to_dict()}
 (out/'ibge_lookup_provenance.json').write_text(json.dumps(meta,indent=2)+'\n')
 return meta
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('out');a=p.parse_args();print(json.dumps(build(a.archive,a.out),indent=2))
