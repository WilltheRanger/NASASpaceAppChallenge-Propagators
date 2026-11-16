"""Fail closed on partial/stale fine-grid extraction outputs."""
import hashlib,json
from pathlib import Path
import numpy as np
FIELDS={'grid_id','native_pixel_id','fire','zenith','distance_m','utc_seconds_since_1993','local_hour'}
def sha256(path):
 h=hashlib.sha256()
 with Path(path).open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def validate_output(output,fire,geo,grid_sha256,grid_size):
 output,fire,geo=map(Path,[output,fire,geo])
 meta=json.loads(output.with_suffix('.json').read_text())
 if meta.get('grid_sha256')!=grid_sha256:raise ValueError('grid identity missing or changed')
 if meta.get('fire')!=fire.name or meta.get('geo')!=geo.name:raise ValueError('source identity changed')
 if meta.get('max_sensor_zenith_degrees')!=85:raise ValueError('wrong sensitivity threshold')
 for p in [output,fire,geo]:
  if meta.get('hashes',{}).get(p.name)!=sha256(p):raise ValueError('source/output checksum mismatch')
 with np.load(output) as d:
  if set(d.files)!=FIELDS:raise ValueError('output schema mismatch')
  ids=d['grid_id'];n=len(ids)
  if any(d[k].ndim!=1 or len(d[k])!=n for k in FIELDS):raise ValueError('inconsistent output shape')
  if not np.issubdtype(ids.dtype,np.integer) or (ids<0).any() or (ids>=grid_size).any() or (np.diff(ids)<=0).any():raise ValueError('invalid grid ids')
  if meta.get('usable_centers')!=n:raise ValueError('center count mismatch')
 return meta
