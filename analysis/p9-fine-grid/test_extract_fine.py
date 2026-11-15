import tempfile,unittest,datetime
from pathlib import Path
import numpy as np,h5py
from extract_fine import extract
class Tests(unittest.TestCase):
 def test_off_coarse_phase_and_native_identity(self):
  with tempfile.TemporaryDirectory() as td:
   r=Path(td);f=r/'VNP14IMG.A2018196.0000.002.test.nc';g=r/'VNP03IMG.A2018196.0000.002.test.nc'
   with h5py.File(f,'w') as h:
    h.attrs['InputPointer']=g.name;h.attrs['StartTime']=np.bytes_('2018-07-15T00:00:00');h.attrs['EndTime']=np.bytes_('2018-07-15T00:06:00')
    h.create_dataset('fire mask',data=np.full((64,2),5))
   with h5py.File(g,'w') as h:
    lat=np.full((64,2),80.);lon=np.zeros((64,2));lat[3,1]=-12.993;lon[3,1]=-60.993
    h.create_dataset('geolocation_data/latitude',data=lat);h.create_dataset('geolocation_data/longitude',data=lon)
    z=h.create_dataset('geolocation_data/sensor_zenith',data=np.ones((64,2))*30);z.attrs['scale_factor']=1.
    start=(datetime.datetime(2018,7,15)-datetime.datetime(1993,1,1)).total_seconds()
    t=h.create_dataset('scan_line_attributes/ev_mid_time',data=[start+10,start+11]);t.attrs['long_name']=np.bytes_('TAI93 scan time')
   grid=r/'grid.npz';out=r/'out.npz';np.savez(grid,lat=[-12.993,-12.993],lon=[-60.993,-60.993])
   extract(f,g,grid,out,85)
   d=np.load(out);self.assertEqual(d['native_pixel_id'].tolist(),[7,7]);self.assertEqual(d['grid_id'].tolist(),[0,1]);self.assertFalse(d['fire'].any())
