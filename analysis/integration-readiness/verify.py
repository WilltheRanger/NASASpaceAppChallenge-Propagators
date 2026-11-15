"""Read-only release checks; no credentials, downloads or production writes."""
from pathlib import Path
import json,sys,tempfile,shutil,subprocess
ROOT=Path(__file__).resolve().parents[2]
D=ROOT/'data/out'; issues=[];regions=[]
for r in json.loads((D/'regions.json').read_text())['regions']:
 rid=r['id']; c=json.loads((D/f'calendar/{rid}.json').read_text()); a=json.loads((D/f'audit/{rid}.json').read_text())
 for y in a['years']:
  if y['status']=='ok' and not isinstance(y.get('outside_noise'),bool):issues.append(f'{rid}/{y["year"]}: missing descriptive placebo flag')
 if c.get('mock') or a.get('mock'):issues.append(f'{rid}: mock production data')
 months=c['months']; ys=[m['ym'] for m in months]
 if len(ys)!=len(set(ys)):issues.append(f'{rid}: duplicate calendar month')
 regions.append({'region':rid,'start':min(ys),'end':max(ys),'months':len(ys),'provisional_2026_months':sum(m['ym'].startswith('2026') for m in months)})
with tempfile.TemporaryDirectory() as td:
 t=Path(td);shutil.copytree(D,t/'out')
 subprocess.run([sys.executable,str(ROOT/'analysis/statistics/facts.py'),str(t/'out'),str(ROOT/'analysis/brazil-data/out'),str(t/'FACTS.md')],check=True,capture_output=True)
 expected=json.loads((t/'out/facts.json').read_text());actual=json.loads((D/'facts.json').read_text())
 if expected!=actual:issues.append('facts.json does not reproduce from current source data')
frontend=(ROOT/'frontend/src/r2/data.ts').read_text()
if "y.outside_noise ? 'outside' : 'within'" not in frontend:issues.append('review production verdict implementation: expected pipeline flag mapping changed')
result={'source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'regions':regions,'facts_reproduce':expected==actual,'issues':issues,'slide_deck_verified':False,'slide_deck_note':'No actual presentation deck found in this checkout; facts.json/FACTS.md are verified source sheets, not proof of slide wording.','live_api_required':False,'api_note':'Current frontend bundles committed JSON and needs no NASA API key. 2026 historical ingestion is separate.'}
print(json.dumps(result,indent=2));sys.exit(bool(issues))
