"""Read-only packaging/data contracts, not scientific validation of the estimator.

Run: python -m unittest discover -s analysis/explore-validation -p 'test_*.py'
Uses only the standard library; never changes data or fetches from the network.
"""
import json
import math
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data/out/global'


def read(path):
    return json.loads(path.read_text())


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


class GlobalContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.grid = read(DATA / 'grid.json')
        cls.cells = cls.grid['cells']
        cls.paths = {p.stem: p for p in (DATA / 'cells').glob('*.json')}

    def test_manifest_counts_and_unique_cells(self):
        ids = [c['id'] for c in self.cells]
        self.assertEqual(len(ids), len(set(ids)))
        counts = self.grid['counts']
        self.assertEqual(counts['cells_listed'], len(ids))
        self.assertEqual(counts['cells_ok_2025'], sum(c['status'] == 'ok' for c in self.cells))
        self.assertEqual(counts['cells_ok_2024'], sum(c['status_2024'] == 'ok' for c in self.cells))
        self.assertEqual(counts['cell_calendars'], len(self.paths))
        readable = {c['id'] for c in self.cells if c['status'] == 'ok' or c['status_2024'] == 'ok'}
        self.assertEqual(set(self.paths), readable)
        self.assertIs(self.grid['mock'], False)
        self.assertIs(self.grid['ai_assisted'], True)

    def test_cell_geometry_and_year_contracts(self):
        size = self.grid['cell_deg']
        for c in self.cells:
            with self.subTest(cell=c['id']):
                self.assertEqual(c['id'], f"g2_{c['lon0']}_{c['lat0']}")
                self.assertEqual(c['lon1'] - c['lon0'], size)
                self.assertEqual(c['lat1'] - c['lat0'], size)
                self.assertTrue(-180 <= c['lon0'] < c['lon1'] <= 180)
                self.assertTrue(-90 <= c['lat0'] < c['lat1'] <= 90)
                for year, status_key in ((2024, 'status_2024'), (2025, 'status')):
                    status = c[status_key]
                    self.assertIn(status, ('ok', 'too_few_fires'))
                    keys = [f'L_{year}', f'L_{year}_lo', f'L_{year}_hi', f'outside_noise_{year}']
                    if status == 'too_few_fires':
                        self.assertTrue(all(c[k] is None for k in keys), keys)
                    else:
                        value, lo, hi = (c[k] for k in keys[:3])
                        self.assertTrue(all(finite(v) for v in (value, lo, hi)))
                        self.assertGreaterEqual(lo, 0)
                        self.assertLessEqual(lo, hi)
                        self.assertIsInstance(c[keys[3]], bool)
                        self.assertTrue(all(finite(c[k]) for k in ('placebo_min', 'placebo_max')))
                        # Flags are computed before num(..., nd=3) serialization.
                        # Equality to a rounded boundary cannot reconstruct the raw verdict.
                        if value not in (c['placebo_min'], c['placebo_max']):
                            self.assertEqual(c[keys[3]], value < c['placebo_min'] or value > c['placebo_max'])

    def test_calendars_are_complete_historical_packages(self):
        expected = [f'{y}-{m:02}' for y in range(2002, 2026) for m in range(1, 13)]
        for cell_id, path in self.paths.items():
            with self.subTest(cell=cell_id):
                data = read(path)
                self.assertEqual(data['region'], cell_id)
                self.assertIs(data['mock'], False)
                self.assertIs(data['ai_assisted'], True)
                self.assertEqual([m['ym'] for m in data['months']], expected)
                for row in data['months']:
                    for key in ('aqua', 'snpp', 'noaa20', 'fixed', 'lo', 'hi'):
                        value = row[key]
                        self.assertTrue(value is None or finite(value) and value >= 0, (row['ym'], key))
                    self.assertIsInstance(row['flags'], list)
                    if row['fixed'] is None:
                        self.assertIsNone(row['source'])
                    if row['lo'] is not None and row['hi'] is not None:
                        self.assertLessEqual(row['lo'], row['hi'])


if __name__ == '__main__':
    unittest.main()
