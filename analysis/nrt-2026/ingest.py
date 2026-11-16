"""Bounded no-key NASA public NRT ingestion; never fills a historical calendar."""
from pathlib import Path
import argparse,csv,datetime,hashlib,io,json,sys,urllib.request
import pandas as pd,numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'daylight-exact-boundaries'))
from classify import Classifier
HOST='https://firms.modaps.eosdis.nasa.gov'
MAX_BYTES=20*1024*1024

def get(url):
 if not url.startswith(HOST+'/'):raise ValueError('Only official NASA FIRMS endpoint allowed')
 with urllib.request.urlopen(url,timeout=60) as r:
  if int(r.headers.get('Content-Length','0'))>MAX_BYTES:raise ValueError('File exceeds20MiB cap')
  data=r.read(MAX_BYTES+1)
 if len(data)>MAX_BYTES:raise ValueError('File exceeds20MiB cap')
 return data

def normalize(frame,sensor):
 d=frame.copy();required={'latitude','longitude','acq_date','acq_time','satellite','daynight','confidence'}
 if not required<=set(d.columns):raise ValueError('missing required FIRMS columns')
 aliases={'A':'Aqua','T':'Terra','Aqua':'Aqua','Terra':'Terra','N':'S-NPP','1':'NOAA-20','J':'NOAA-20','N20':'NOAA-20','2':'NOAA-21','N21':'NOAA-21'}
 d['satellite']=d.satellite.astype(str).map(aliases)
 if d.satellite.isna().any():raise ValueError('unknown satellite alias')
 pd.to_datetime(d.acq_date,format='%Y-%m-%d',errors='raise')
 d['acq_time']=pd.to_numeric(d.acq_time,errors='raise').astype(int)
 if not ((d.acq_time//100<24)&(d.acq_time%100<60)&(d.acq_time>=0)).all():raise ValueError('invalid UTC time')
 if not (d.latitude.between(-90,90)&d.longitude.between(-180,180)).all():raise ValueError('invalid coordinates')
 return d.drop_duplicates(['latitude','longitude','acq_date','acq_time','satellite'])

def run(out,archive):
 out.mkdir(parents=True,exist_ok=True);meta_url=HOST+'/api/active_fire_files/all?format=json';listing=json.loads(get(meta_url));classifier=Classifier(archive);rows=[];sources=[]
 for sensor in ['modis','noaa20','noaa21']:
  paths=listing['csv'].get(sensor,{}).get('South America',[]);path=next((p for p in paths if p.endswith('_7d.csv')),None)
  if path is None:raise ValueError(f'official7d feed unavailable:{sensor}')
  url=HOST+path;raw=get(url);d=normalize(pd.read_csv(io.BytesIO(raw),dtype={'satellite':str,'confidence':str}),sensor)
  lo,hi=d.acq_date.min(),d.acq_date.max()
  sources.append({'sensor':sensor,'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'rows_after_dedup':len(d),'observed_dates':[lo,hi],'type_field_available':'type' in d,'versions':sorted(d.version.astype(str).unique()) if 'version' in d else []})
  d=d[d.daynight=='D'].copy();d['biome']=classifier.classify(d.longitude.to_numpy(),d.latitude.to_numpy());d=d[d.biome.isin(['amazon','cerrado','caatinga','mata_atlantica','pantanal','pampa'])]
  for key,g in d.groupby(['acq_date','biome','satellite']):rows.append({'date':key[0],'biome':key[1],'satellite':key[2],'daytime_detections':len(g),'provisional':True,'coverage_complete':False})
 daily=pd.DataFrame(rows);daily.to_csv(out/'daily_provisional.csv',index=False)
 report={'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'listing_url':meta_url,'sources':sources,'snpp_feed_listed':'snpp' in listing['csv'],'method':'Exact historical IBGE polygons; all daytime NRT detections. No vegetation/type filter when source lacks it. No missing dates filled with zero.','scope':'Rolling7d snapshot only; not full2026, not complete monthly totals, no fixed-clock calibration or causal inference.','missing_calendar_months_not_filled':True,'daily_rows':len(daily),'detections':int(daily.daytime_detections.sum()),'date_min':daily.date.min(),'date_max':daily.date.max()}
 (out/'provenance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--out',type=Path,default=Path(__file__).resolve().parent/'out');ap.add_argument('--ibge',required=True);a=ap.parse_args();run(a.out,a.ibge)
