"""Read-only validation of committed data handoff. Run from repo root with Python 3."""
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / 'data/out'
SRC = ROOT / 'analysis/brazil-data/out'

def load(path):
    return json.loads(path.read_text(), parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))

def validate():
    regions = load(DATA / 'regions.json')['regions']
    assert len({r['id'] for r in regions}) == len(regions)
    results = []
    for region in regions:
        rid = region['id']
        for kind in ('calendar', 'audit', 'drift', 'twoclocks', 'fireday'):
            obj = load(DATA / kind / f'{rid}.json')
            assert obj['region'] == rid, (kind, rid)
            assert obj.get('mock') is False, (kind, rid, 'mock')
        cal = load(DATA / 'calendar' / f'{rid}.json')
        months = cal['months']
        assert len(months) == len({m['ym'] for m in months}), rid
        assert [m['ym'] for m in months] == sorted(m['ym'] for m in months), rid
        real = [m for m in months if m['fixed'] is not None]
        assert real, (rid, 'no fixed series')
        for m in real:
            assert all(isinstance(m[k], (float, int)) and math.isfinite(m[k]) for k in ('fixed', 'lo', 'hi')), (rid, m)
            assert 0 <= m['lo'] <= m['hi'], (rid, m)
        tc = load(DATA / 'twoclocks' / f'{rid}.json')
        assert tc.get('preview') is False, rid
        results.append({'region': rid, 'months': len(months), 'fixed_months': len(real)})
    rows = list(csv.DictReader((SRC / 'inpe_reproduction_monthly.csv').open()))
    eligible = [r for r in rows if r['biome'] != 'brazil' and '2012-01' <= r['ym'] <= '2020-12' and float(r['inpe']) > 0]
    matched = sum(abs(float(r['firms_aqua_all']) / float(r['inpe']) - 1) <= .1 for r in eligible)
    filtered = sum(abs(float(r['firms_aqua_filtered']) / float(r['inpe']) - 1) <= .1 for r in eligible)
    assert matched / len(eligible) >= .9
    return {'regions': results, 'p3': {'within_10pct': matched, 'eligible_biome_months': len(eligible), 'rate': matched / len(eligible), 'filtered_rate': filtered / len(eligible), 'note': 'Aggregate count agreement, not event-level detection match rate. Not preregistered.'}}

if __name__ == '__main__':
    print(json.dumps(validate(), indent=2))
