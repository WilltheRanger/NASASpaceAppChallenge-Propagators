"""Bounded per-swath extraction for the fixed CALIBRATION_PLAN sample."""
import argparse,datetime,hashlib,json,sys
from pathlib import Path
import h5py,numpy as np
from scipy.spatial import cKDTree
from pilot import xyz
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'ibge-exact-diagnosis'))
from classify import Classifier
BIOMES=['amazon','cerrado','caatinga','mata_atlantica','pantanal','pampa']
def grid(archive,out):
 lon,lat=np.meshgrid(np.arange(-73.975,-34,.05),np.arange(-33.975,6,.05));lon=lon.ravel();lat=lat.ravel()
 labels=Classifier(archive).classify(lon,lat);k=np.isin(labels,BIOMES)
 np.savez_compressed(out,lon=lon[k],lat=lat[k],biome=labels[k].astype('U16'))
def extract(fire,geo,gridfile,out):
 grid=np.load(gridfile);targets=xyz(grid['lat'],grid['lon'])
 with h5py.File(fire) as f,h5py.File(geo) as g:
  if fire.name.split('.')[1:3]!=geo.name.split('.')[1:3]:raise ValueError('time mismatch')
  if ('VNP' in fire.name)!=('VNP' in geo.name):raise ValueError('satellite mismatch')
  if geo.name not in str(f.attrs.get('InputPointer','')):raise ValueError('exact geolocation input missing')
  fm=f['fire mask'][:]; latset=g['geolocation_data/latitude']; lonset=g['geolocation_data/longitude']
  if fm.shape!=latset.shape or latset.shape!=lonset.shape:raise ValueError('shape mismatch')
  # Stream geometry; retain only native pixels potentially within 375 m of
  # any regular-grid center. Bounds exceed 375 m throughout Brazil, so
  # this preserves nearest-pixel selection while avoiding a huge KD-tree.
  native_parts=[]; points=[]
  for row in range(0,fm.shape[0],256):
   lat=latset[row:row+256];lon=lonset[row:row+256]
   near_lat=np.abs((lat+33.975+.025)%.05-.025)<=.005
   near_lon=np.abs((lon+73.975+.025)%.05-.025)<=.007
   k=(lat>=-34.02)&(lat<=6.02)&(lon>=-74.02)&(lon<=-33.98)&near_lat&near_lon
   native_parts.append(np.flatnonzero(k)+row*fm.shape[1]);points.append(xyz(lat[k],lon[k]))
  native=np.concatenate(native_parts);tree=cKDTree(np.concatenate(points));dist,idx=tree.query(targets,distance_upper_bound=375)
  ids=np.flatnonzero(np.isfinite(dist));pix=native[idx[ids]];mask=fm.ravel()[pix]
  z=g['geolocation_data/sensor_zenith'];raw=z[:].ravel()[pix];zen=raw*float(np.asarray(z.attrs['scale_factor']).item())
  usable=(raw>=0)&(zen<=45)&np.isin(mask,[5,8,9]);ids=ids[usable];pix=pix[usable];zen=zen[usable];mask=mask[usable]
  t=g['scan_line_attributes/ev_mid_time'];label=t.attrs['long_name'].decode()
  if 'TAI93' not in label:raise ValueError('unsupported time scale')
  year=int(fire.name.split('.')[1][1:5])
  if not 2018<=year<=2020:raise ValueError('outside calibration epoch')
  scans=len(t);lines=fm.shape[0]
  if lines!=scans*32:raise ValueError('unexpected image scan layout')
  # Ten leap seconds accrued since 1993-01-01 UTC through 2018--2020.
  # NASA TAI93 definition plus NIST leap table, recorded in documentation.
  tai=t[:][(pix//fm.shape[1])//32];utc=tai-10
  epoch=datetime.datetime(1993,1,1);start=datetime.datetime.fromisoformat(f.attrs['StartTime'].decode());end=datetime.datetime.fromisoformat(f.attrs['EndTime'].decode())
  secs0=(start-epoch).total_seconds();secs1=(end-epoch).total_seconds()
  if len(utc) and (utc.min()<secs0-2 or utc.max()>secs1+2):raise ValueError('scan time outside declared UTC swath')
  np.savez_compressed(out,grid_id=ids,fire=np.isin(mask,[8,9]),zenith=zen,utc_seconds_since_1993=utc,local_hour=(utc%86400)/3600+grid['lon'][ids]/15)
  report={'fire':fire.name,'geo':geo.name,'grid':gridfile.name,'sample':out.name,'usable_centers':len(ids),'fire_centers':int(np.isin(mask,[8,9]).sum()),'hashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [fire,geo,out]},'status':'extracted_not_calibrated'}
  out.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n')
  return report
if __name__=='__main__':
 p=argparse.ArgumentParser();s=p.add_subparsers(dest='cmd',required=True);a=s.add_parser('grid');a.add_argument('archive');a.add_argument('out',type=Path);a=s.add_parser('extract');a.add_argument('fire',type=Path);a.add_argument('geo',type=Path);a.add_argument('grid',type=Path);a.add_argument('out',type=Path);a=p.parse_args()
 if a.cmd=='grid':grid(a.archive,a.out)
 else:print(json.dumps(extract(a.fire,a.geo,a.grid,a.out)))
