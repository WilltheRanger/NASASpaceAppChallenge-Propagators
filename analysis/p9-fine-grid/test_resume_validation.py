import tempfile,unittest,json
from pathlib import Path
import numpy as np
from resume_validation import validate_output,sha256
class ResumeTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();r=Path(self.tmp.name);self.f=r/'mask.nc';self.g=r/'geo.nc';self.o=r/'sample.npz'
  self.f.write_bytes(b'mask');self.g.write_bytes(b'geo')
  np.savez(self.o,grid_id=np.array([0]),native_pixel_id=np.array([2]),fire=np.array([False]),zenith=np.array([30.]),distance_m=np.array([0.]),utc_seconds_since_1993=np.array([1.]),local_hour=np.array([14.]))
  self.meta={'fire':self.f.name,'geo':self.g.name,'grid_sha256':'grid1','max_sensor_zenith_degrees':85,'usable_centers':1,'hashes':{p.name:sha256(p) for p in [self.f,self.g,self.o]}}
  self.write()
 def tearDown(self):self.tmp.cleanup()
 def write(self):self.o.with_suffix('.json').write_text(json.dumps(self.meta))
 def validate(self):return validate_output(self.o,self.f,self.g,'grid1',2)
 def test_valid(self):self.validate()
 def test_missing_sidecar(self):
  self.o.with_suffix('.json').unlink()
  with self.assertRaises(FileNotFoundError):self.validate()
 def test_grid_changed(self):
  self.meta['grid_sha256']='grid2';self.write()
  with self.assertRaisesRegex(ValueError,'grid identity'):self.validate()
 def test_missing_grid_identity(self):
  del self.meta['grid_sha256'];self.write()
  with self.assertRaisesRegex(ValueError,'grid identity'):self.validate()
 def test_corrupted_output(self):
  self.o.write_bytes(b'partial')
  with self.assertRaisesRegex(ValueError,'checksum'):self.validate()
 def test_changed_input(self):
  self.f.write_bytes(b'new mask')
  with self.assertRaisesRegex(ValueError,'checksum'):self.validate()
