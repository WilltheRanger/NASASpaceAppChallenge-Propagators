"""Coverage-aware engineering pilot, NOT the formal multi-region P9 test.

Fixed pilot choices: 0.01 degree centers inside [-61,-59] x [-13,-11],
nearest native pixel within 375 m, both viewing zenith <=45 degrees,
only fire-mask classes 5/8/9 in both images. No tuning to observed outcomes.
"""
import argparse, hashlib, json
from pathlib import Path
import h5py
import numpy as np
from scipy.spatial import cKDTree

R=6371008.8
FILES={
 'snpp':('VNP14IMG.A2020214.1700.002.2024065171651.nc','VNP03IMG.A2020214.1700.002.2021124181008.nc'),
 'noaa20':('VJ114IMG.A2020214.1748.002.2024070022503.nc','VJ103IMG.A2020214.1748.021.2021067193710.nc')}
def xyz(lat,lon):
 lat,lon=np.deg2rad(lat),np.deg2rad(lon)
 return R*np.column_stack((np.cos(lat)*np.cos(lon),np.cos(lat)*np.sin(lon),np.sin(lat)))
def sample(root, files, target):
 fp,gp=(root/n for n in files)
 with h5py.File(fp) as f,h5py.File(gp) as g:
  lat=g['geolocation_data/latitude'][:]; lon=g['geolocation_data/longitude'][:]
  mask=f['fire mask'][:]
  if mask.shape!=lat.shape or lat.shape!=lon.shape: raise ValueError('geolocation shape mismatch')
  embedded=f.attrs.get('VNP03IMG',f.attrs.get('VJ103IMG',None))
  if embedded is not None:
   ref=np.asarray(embedded).reshape(-1)[0].decode()
   if ref!=gp.name: raise ValueError('geolocation provenance mismatch')
  keep=(lat>=-13.02)&(lat<=-10.98)&(lon>=-61.02)&(lon<=-58.98)
  indices=np.flatnonzero(keep)
  if not len(indices): raise ValueError('no regional geolocation')
  tree=cKDTree(xyz(lat[keep],lon[keep])); dist,i=tree.query(target)
  native=indices[i]; classes=mask.ravel()[native]
  z=g['geolocation_data/sensor_zenith']; raw=z[:].ravel()[native]
  zen=raw*float(np.asarray(z.attrs['scale_factor']).item())
  usable=(dist<=375)&(raw>=0)&(zen<=45)&np.isin(classes,[5,8,9])
  return classes,usable,{'shape':list(mask.shape),'regional_native_pixels':int(keep.sum()),'grid_usable':int(usable.sum()),'time_start':f.attrs['StartTime'].decode(),'time_end':f.attrs['EndTime'].decode(),'regional_class_counts':{str(int(k)):int(v) for k,v in zip(*np.unique(mask[keep],return_counts=True))}}
def run(root):
 lon,lat=np.meshgrid(np.arange(-60.995,-59,0.01),np.arange(-12.995,-11,0.01))
 target=xyz(lat.ravel(),lon.ravel()); a,av,am=sample(root,FILES['snpp'],target); b,bv,bm=sample(root,FILES['noaa20'],target)
 common=av&bv; af=np.isin(a,[8,9]); bf=np.isin(b,[8,9])
 cells={'both_fire':int((common&af&bf).sum()),'snpp_only_fire':int((common&af&~bf).sum()),'noaa20_only_fire':int((common&~af&bf).sum()),'both_clear_nonfire':int((common&~af&~bf).sum())}
 assert sum(cells.values())==int(common.sum())
 return {'status':'engineering_pilot_not_formal_P9','bbox':[-61,-13,-59,-11],'grid_spacing_degrees':0.01,'grid_centers':len(target),'nearest_max_m':375,'max_sensor_zenith_degrees':45,'valid_classes':[5,8,9],'fire_classes':[8,9],'common_usable_centers':int(common.sum()),'counts':cells,'satellites':{'snpp':am,'noaa20':bm},'files':{n:{'bytes':(root/n).stat().st_size,'sha256':hashlib.sha256((root/n).read_bytes()).hexdigest()} for fs in FILES.values() for n in fs},'limitations':['Nearest-center sampling approximates, not exact footprint intersection.','Single date/region cannot estimate timing slope with satellite intercept or regional seasonal controls.','Grid samples are spatially dependent, not independent statistical replicates.','Original P9 and existing MODIS surrogate outcomes are unchanged.']}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--data',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();a.out.write_text(json.dumps(run(a.data),indent=2)+'\n')
