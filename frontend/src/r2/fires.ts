// The past day's NASA FIRMS daytime fire detections, with the satellite that made each one (frontend/scripts/fires-day.py
// writes the file). Each row: lon*100, lat*100, satellite code, minutes after `start` (UTC), FRP in MW; one row per
// satellite per 0.02-degree cell. Local solar time comes from the UTC time and the longitude (4 minutes a degree).
import DAY from './earth/fires-day.json'

export type Sat = 0 | 1 | 2 | 3
export type SatGroup = 'terra' | 'aqua' | 'viirs'
export const SAT_NAMES = DAY.sats as [string, string, string, string]
export const groupOf = (s: number): SatGroup => (s === 0 ? 'terra' : s === 1 ? 'aqua' : 'viirs')
export const GROUP_NAME: Record<SatGroup, string> = { terra: 'Terra', aqua: 'Aqua', viirs: 'VIIRS' }
/** the instrument behind each satellite's detections */
export const SENSOR: Record<number, string> = { 0: 'MODIS', 1: 'MODIS', 2: 'VIIRS 375 m', 3: 'VIIRS 375 m' }

const START = Date.parse(`${DAY.start.replace(' ', 'T')}:00Z`)
const pts = DAY.pts as number[]
export const N = pts.length / 5
/** Two spare rows after the day's dots hold a detection picked from the close-up squares, as the squares file gives it
 *  (every detection, to 0.0001 degrees; the dots are thinned and rounded to 0.01). Two, so that picking a second square
 *  is a change. Counts, charts and searches stop at N and never include them. */
const SPARE = 2
export const LON = new Float32Array(N + SPARE), LAT = new Float32Array(N + SPARE), SAT = new Uint8Array(N + SPARE), MIN = new Uint16Array(N + SPARE), FRP = new Float32Array(N + SPARE)
/** half the north-south side of a spare row's square, in degrees (0 for a dot) */
const HALF = new Float32Array(N + SPARE)
for (let i = 0; i < N; i++) {
  LON[i] = pts[i * 5] / 100
  LAT[i] = pts[i * 5 + 1] / 100
  SAT[i] = pts[i * 5 + 2]
  MIN[i] = pts[i * 5 + 3]
  FRP[i] = pts[i * 5 + 4]
}

/** the window the file covers, as written ("2026-11-14 00:07") */
export const WINDOW = { start: DAY.start, end: DAY.end }
/** daytime detections per satellite before thinning, from the file */
export const TOTALS = DAY.counts as [number, number, number, number]

export const utcOf = (i: number) => new Date(START + MIN[i] * 60000)

/** Snapshot FRP readings across sensors/times, sorted; not temperatures or unique fires. */
const FRP_SORTED = Float32Array.from(FRP).sort()
/** Share of snapshot detections with strictly lower reported FRP (0 to 1). */
export function heatShare(i: number) {
  let lo = 0, hi = FRP_SORTED.length
  while (lo < hi) { const mid = (lo + hi) >> 1; if (FRP_SORTED[mid] < FRP[i]) lo = mid + 1; else hi = mid }
  return N ? lo / N : 0
}
/** local solar time in hours (0-24), worked out once for every row: the UTC minute of the day plus 4 minutes a degree */
const LST = new Float32Array(N + SPARE)
const START_MIN = new Date(START).getUTCHours() * 60 + new Date(START).getUTCMinutes()
const setLst = (i: number) => { const m = START_MIN + MIN[i] + LON[i] * 4; LST[i] = (((m % 1440) + 1440) % 1440) / 60 }
for (let i = 0; i < N; i++) setLst(i)
export const lstOf = (i: number) => LST[i]

/** One square's detection, kept in a spare row so the fire card can tell it exactly; returns its row. `half` is half
 *  the square's north-south side, in degrees, so a card can sit on the square's edge. */
let spare = 0
export function holdDetection(d: { lon: number; lat: number; sat: number; min: number; frp: number; half: number }) {
  const i = N + spare
  spare = (spare + 1) % SPARE
  LON[i] = d.lon; LAT[i] = d.lat; SAT[i] = d.sat; MIN[i] = d.min; FRP[i] = d.frp; HALF[i] = d.half
  setLst(i)
  return i
}
/** where a card about detection i points: the top (or bottom) edge of a picked square, or a dot's own spot */
export const edgeLat = (i: number, below: boolean) => LAT[i] + (below ? -HALF[i] : HALF[i])

/** a coarse grid of the rows, for finding what lies near a point */
const CELL = 0.25
const GRID = new Map<string, number[]>()
for (let i = 0; i < N; i++) {
  const k = `${Math.floor(LON[i] / CELL)},${Math.floor(LAT[i] / CELL)}`
  const list = GRID.get(k)
  if (list) list.push(i)
  else GRID.set(k, [i])
}

/** detections within `km` of a point, any satellite, nearest first */
export function near(lon: number, lat: number, km = 3) {
  const out: { i: number; km: number }[] = []
  const r = km / 111
  for (let gx = Math.floor((lon - r) / CELL); gx <= Math.floor((lon + r) / CELL); gx++) {
    for (let gy = Math.floor((lat - r) / CELL); gy <= Math.floor((lat + r) / CELL); gy++) {
      for (const i of GRID.get(`${gx},${gy}`) ?? []) {
        const dx = (LON[i] - lon) * 111 * Math.cos((lat * Math.PI) / 180), dy = (LAT[i] - lat) * 111
        const d = Math.hypot(dx, dy)
        if (d <= km) out.push({ i, km: d })
      }
    }
  }
  return out.sort((a, b) => a.km - b.km)
}

/** For one detection: every satellite's sighting of the same spot (within 3 km), earliest per satellite. */
export function sightings(i: number) {
  const best = new Map<number, number>()
  for (const { i: j } of near(LON[i], LAT[i], 3)) {
    const prev = best.get(SAT[j])
    if (prev == null || MIN[j] < MIN[prev]) best.set(SAT[j], j)
  }
  // a picked square is its own satellite's sighting
  if (i >= N) best.set(SAT[i], i)
  return [0, 1, 2, 3].map((s) => ({ sat: s as Sat, i: best.get(s) ?? null }))
}

export type Box = readonly [number, number, number, number]
/** a finer test than the box, for a studied region's own shape (a region's box is for framing and crosses borders) */
export type Inside = (lon: number, lat: number) => boolean
const inBox = (i: number, b: Box) => LON[i] >= b[0] && LON[i] <= b[2] && LAT[i] >= b[1] && LAT[i] <= b[3]
/** every row inside a box (or every row), and inside the shape when one is given: a small box walks only its own cells
 *  of the coarse grid */
function each(b: Box | null, f0: (i: number) => void, inside?: Inside) {
  const f = inside ? (i: number) => { if (inside(LON[i], LAT[i])) f0(i) } : f0
  if (!b) { for (let i = 0; i < N; i++) f(i); return }
  const x0 = Math.floor(b[0] / CELL), x1 = Math.floor(b[2] / CELL), y0 = Math.floor(b[1] / CELL), y1 = Math.floor(b[3] / CELL)
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4000) { for (let i = 0; i < N; i++) if (inBox(i, b)) f(i); return }
  for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) for (const i of GRID.get(`${gx},${gy}`) ?? []) if (inBox(i, b)) f(i)
}

/** counts and median local solar time per satellite group inside a box (or worldwide), and inside a shape if given */
export function summary(b: Box | null, inside?: Inside) {
  const acc: Record<SatGroup, number[]> = { terra: [], aqua: [], viirs: [] }
  each(b, (i) => { acc[groupOf(SAT[i])].push(LST[i]) }, inside)
  const med = (v: number[]) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
  return {
    terra: { n: acc.terra.length, lst: med(acc.terra) },
    aqua: { n: acc.aqua.length, lst: med(acc.aqua) },
    viirs: { n: acc.viirs.length, lst: med(acc.viirs) },
    total: acc.terra.length + acc.aqua.length + acc.viirs.length,
  }
}

/** local-solar-time histogram per group, in half-hour bins from 06:00 to 19:00, for a box or worldwide */
export const BIN_FROM = 6, BIN_TO = 19, BIN = 0.5
export function histogram(b: Box | null, inside?: Inside) {
  const n = Math.round((BIN_TO - BIN_FROM) / BIN)
  const h: Record<SatGroup, number[]> = { terra: Array(n).fill(0), aqua: Array(n).fill(0), viirs: Array(n).fill(0) }
  each(b, (i) => {
    const k = Math.floor((LST[i] - BIN_FROM) / BIN)
    if (k >= 0 && k < n) h[groupOf(SAT[i])][k]++
  }, inside)
  return h
}

/** "14 Nov 2026" from "2026-11-14 00:07" */
export function dayText(s: string) {
  const [d] = s.split(' ')
  const [y, m, dd] = d.split('-').map(Number)
  return `${dd} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`
}

/** the strongest detection (highest FRP) inside a box, or worldwide; only the satellite groups given */
export function strongest(b: Box | null, groups: Record<SatGroup, boolean> = { terra: true, aqua: true, viirs: true }, inside?: Inside) {
  let best = -1
  for (let i = 0; i < N; i++) {
    if ((b && !inBox(i, b)) || (inside && !inside(LON[i], LAT[i])) || !groups[groupOf(SAT[i])]) continue
    if (best < 0 || FRP[i] > FRP[best]) best = i
  }
  return best < 0 ? null : best
}
