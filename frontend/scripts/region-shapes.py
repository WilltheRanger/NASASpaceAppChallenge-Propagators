"""The studied regions' shapes for the orbit globe's highlight, from the team's own definitions.

Usage: python3 frontend/scripts/region-shapes.py
Inputs : analysis/brazil-data/out/biome_lookup_0p1deg.csv (the biome of every 0.1-degree cell, as the counts use it)
Output : frontend/src/r2/region-shapes.ts
         MASKS: for each Brazilian biome studied, a half-degree grid over its box; a cell is on when at least half of its
         0.1-degree cells belong to the biome.
California's outline is the ten-point polygon the counts use (analysis/daylight/daylight.py, CA). Punjab + Haryana is
its box. Argentina's counts use NASA FIRMS's country file, so its outline here is a coarse sketch for the highlight only.
"""
import csv, os, collections
HERE = os.path.dirname(__file__)
REPO = os.path.join(HERE, '..', '..')
STEP = 0.5
IDS = {'amazon': 'br-amazon', 'cerrado': 'br-cerrado', 'pantanal': 'br-pantanal'}
cells = collections.defaultdict(lambda: collections.Counter())
for r in csv.DictReader(open(os.path.join(REPO, 'analysis', 'brazil-data', 'out', 'biome_lookup_0p1deg.csv'))):
    b = r['biome']
    if b not in IDS: continue
    lat, lon = int(r['cell_lat']) / 10 + 0.05, int(r['cell_lon']) / 10 + 0.05
    cells[b][(int(lon // STEP), int(lat // STEP))] += 1
out = ["// Written by scripts/region-shapes.py: the studied regions' shapes, for the orbit globe's highlight.",
       "// Brazil's biomes come from the team's 0.1-degree biome lookup (a half-degree cell is on when at least half of it",
       "// is the biome); California is the polygon the counts use; Argentina is a coarse sketch for the highlight only.",
       'export const MASKS: Record<string, { w: number; s: number; step: number; cols: number; rows: string[] }> = {']
need = (STEP / 0.1) ** 2 / 2
for b, id_ in IDS.items():
    on = {k for k, n in cells[b].items() if n >= need}
    xs = [k[0] for k in on]; ys = [k[1] for k in on]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    rows = [''.join('1' if (x, y) in on else '0' for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
    out.append(f"  '{id_}': {{ w: {x0 * STEP}, s: {y0 * STEP}, step: {STEP}, cols: {x1 - x0 + 1}, rows: [")
    out += [f"    '{row}'," for row in rows]
    out.append('  ] },')
    print(id_, len(on), 'cells', x0 * STEP, y0 * STEP, (x1 + 1) * STEP, (y1 + 1) * STEP)
out.append('}')
out.append('')
out.append('export const POLYS: Record<string, [number, number][]> = {')
out.append("  'us-california': [[-124.6, 42.0], [-120.0, 42.0], [-120.0, 39.0], [-114.63, 35.0], [-114.13, 34.27], [-114.72, 32.72], [-117.12, 32.53], [-118.6, 33.2], [-121.0, 34.4], [-124.6, 40.2]],")
out.append("  'ar-argentina': [[-66.2, -21.8], [-62.8, -22.0], [-57.6, -25.3], [-54.6, -25.6], [-53.7, -26.3], [-55.9, -28.4], [-57.6, -30.2], [-58.2, -33.0], [-58.4, -34.2], [-56.7, -36.4], [-57.6, -38.1], [-62.1, -39.0], [-62.3, -40.9], [-65.0, -40.8], [-63.6, -42.6], [-65.3, -44.9], [-67.5, -46.0], [-65.8, -47.9], [-68.9, -50.3], [-68.4, -52.4], [-65.2, -54.7], [-68.6, -54.9], [-68.6, -52.6], [-72.0, -52.0], [-73.5, -49.5], [-71.8, -46.0], [-71.7, -43.0], [-71.9, -40.5], [-70.9, -38.5], [-70.3, -36.0], [-69.8, -33.3], [-70.3, -31.0], [-69.3, -27.5], [-68.4, -24.5], [-67.2, -22.8]],")
out.append('}')
out.append('')
out.append("""/** Is this point inside the studied region? Falls back to the region's box where no shape is kept. */
export function inRegion(id: string, lon: number, lat: number, bbox: readonly [number, number, number, number]) {
  const m = MASKS[id]
  if (m) {
    const x = Math.floor((lon - m.w) / m.step), y = Math.floor((lat - m.s) / m.step)
    return y >= 0 && y < m.rows.length && x >= 0 && x < m.cols && m.rows[y][x] === '1'
  }
  const p = POLYS[id]
  if (p) {
    let ins = false
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i], [xj, yj] = p[j]
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) ins = !ins
    }
    return ins
  }
  return lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]
}
""")
open(os.path.join(HERE, '..', 'src', 'r2', 'region-shapes.ts'), 'w').write('\n'.join(out))
