"""Discover paired VIIRS fire-mask and image-band geolocation granules via CMR.
Metadata only: no authentication credentials are read or stored.
"""
import argparse,json,urllib.request,urllib.parse
from pathlib import Path
PRODUCTS={'VNP14IMG':('002',None),'VJ114IMG':('002',None),'VNP03IMG':('2',None),'VJ103IMG':('2.1',None)}
def data_links(entry):
 return [x['href'] for x in entry.get('links',[]) if x.get('rel','').endswith('/data#') and x.get('href','').startswith('https://') and not x.get('inherited')]
def discover(product,version,start,end,bbox):
 rows=[];page=1
 while True:
  params={'short_name':product,'version':version,'temporal':f'{start},{end}','bounding_box':bbox,'page_size':2000,'page_num':page}
  req=urllib.request.Request('https://cmr.earthdata.nasa.gov/search/granules.json?'+urllib.parse.urlencode(params),headers={'User-Agent':'Anchor-swath-discovery/1.0'})
  with urllib.request.urlopen(req,timeout=60) as r: batch=json.load(r)['feed']['entry']
  for e in batch:
   rows.append({'product':product,'id':e['id'],'title':e['title'],'start':e.get('time_start'),'end':e.get('time_end'),'size_mb':float(e.get('granule_size',0)),'links':data_links(e)})
  if len(batch)<2000:break
  page+=1
 return rows
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--start',required=True);p.add_argument('--end',required=True);p.add_argument('--bbox',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 rows=[]
 for n,(v,_) in PRODUCTS.items(): rows+=discover(n,v,a.start,a.end,a.bbox)
 out={'query':vars(a),'granules':rows,'total_size_mb':sum(e['size_mb'] for e in rows),'status':'metadata_only_not_downloaded'}
 Path(a.output).write_text(json.dumps(out,indent=2)+'\n');print({n:sum(e['product']==n for e in rows) for n in PRODUCTS});print('total_mb',out['total_size_mb'])
