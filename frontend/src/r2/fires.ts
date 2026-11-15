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
export const LON = new Float32Array(N), LAT = new Float32Array(N), SAT = new Uint8Array(N), MIN = new Uint16Array(N), FRP = new Float32Array(N)
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
/** local solar time in hours (0-24) */
export function lstOf(i: number) {
  const t = utcOf(i)
  const m = t.getUTCHours() * 60 + t.getUTCMinutes() + LON[i] * 4
  return (((m % 1440) + 1440) % 1440) / 60
}

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
  return [0, 1, 2, 3].map((s) => ({ sat: s as Sat, i: best.get(s) ?? null }))
}

export type Box = readonly [number, number, number, number]
const inBox = (i: number, b: Box) => LON[i] >= b[0] && LON[i] <= b[2] && LAT[i] >= b[1] && LAT[i] <= b[3]

/** counts and median local solar time per satellite group inside a box (or worldwide) */
export function summary(b: Box | null) {
  const acc: Record<SatGroup, number[]> = { terra: [], aqua: [], viirs: [] }
  for (let i = 0; i < N; i++) if (!b || inBox(i, b)) acc[groupOf(SAT[i])].push(lstOf(i))
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
export function histogram(b: Box | null) {
  const n = Math.round((BIN_TO - BIN_FROM) / BIN)
  const h: Record<SatGroup, number[]> = { terra: Array(n).fill(0), aqua: Array(n).fill(0), viirs: Array(n).fill(0) }
  for (let i = 0; i < N; i++) {
    if (b && !inBox(i, b)) continue
    const t = lstOf(i)
    const k = Math.floor((t - BIN_FROM) / BIN)
    if (k >= 0 && k < n) h[groupOf(SAT[i])][k]++
  }
  return h
}

/** "14 Nov 2026" from "2026-11-14 00:07" */
export function dayText(s: string) {
  const [d] = s.split(' ')
  const [y, m, dd] = d.split('-').map(Number)
  return `${dd} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`
}
