"""Compare INPE's published labels with two independently obtained polygon editions."""
import argparse,zipfile,sys,json
from pathlib import Path
import pandas as pd
from classify import Classifier,NAMES,norm
p=argparse.ArgumentParser();p.add_argument('inpe_zip');p.add_argument('historical');p.add_argument('modern');p.add_argument('out');a=p.parse_args()
with zipfile.ZipFile(a.inpe_zip) as z:
 with z.open(z.namelist()[0]) as f:d=pd.read_csv(f,usecols=['lat','lon','data_pas','bioma'],skipinitialspace=True)
d['published']=d.bioma.str.strip().map(lambda s:NAMES.get(norm(s),'unassigned'))
rows=[]
for name,path in [('historical_5million',a.historical),('2019_250k',a.modern)]:
 labels=Classifier(path).classify(d.lon,d.lat)
 d[name]=labels
 for b,g in d.groupby('published'):
  rows.append({'edition':name,'published_biome':b,'detections':len(g),'matching_labels':int((g[name]==b).sum()),'match_fraction':float((g[name]==b).mean())})
 pd.crosstab(d.published,d[name]).to_csv(Path(a.out)/f'label_confusion_{name}.csv')
pd.DataFrame(rows).to_csv(Path(a.out)/'inpe_label_diagnosis.csv',index=False)
print(pd.DataFrame(rows).to_string(index=False))
