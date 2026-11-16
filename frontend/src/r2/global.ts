// Global clock layer (exploratory): the preset audit repeated on a 2-degree grid, written by analysis/global/global_grid.py
// to data/out/global/. The files are not bundled: scripts/copy-global.mjs copies them into public/global before dev and
// build, and they are fetched on demand, so the site's script stays the size it was and a build without the public folder
// (the comment-page build) simply has no world map.

export type GlobalStatus = 'ok' | 'too_few_fires'
export type GlobalCell = {
  id: string; lon0: number; lat0: number; lon1: number; lat1: number
  /** the 2025 reading; too_few_fires means too few detections to read, never "no change" */
  status: GlobalStatus; status_2024: GlobalStatus
  n_aqua_2025: number; n_snpp_2025: number
  lst_shift_min_2025: number | null; lst_shift_min_2024: number | null
  L_2024: number | null; L_2024_lo: number | null; L_2024_hi: number | null
  L_2025: number | null; L_2025_lo: number | null; L_2025_hi: number | null
  /** the nine 2012-2020 placebo years, each scored against the other eight: largest gap from 1, lowest L, highest L */
  noise_floor: number | null; placebo_min: number | null; placebo_max: number | null
  outside_noise_2025: boolean | null; outside_noise_2024: boolean | null
}
export type GlobalGrid = {
  mock: boolean; ai_assisted: boolean; generated: string; label: string; method: string; sources: string[]
  cell_deg: number; base_years: string
  mask_rule: { status: string; rule: string; min_expected: number; max_rel_half_width: number; meaning: string }
  counts: { cells_listed: number; cells_ok_2025: number; cells_ok_2024: number; cell_calendars: number }
  cells: GlobalCell[]
}
export type GlobalMonth = { ym: string; fixed: number | null; lo: number | null; hi: number | null; source?: string | null; aqua: number | null; snpp: number | null; noaa20: number | null; flags: string[]; median_ref: number | null; anomaly_pct: number | null }
export type GlobalCalendar = { mock: boolean; region: string; unit?: string; months: GlobalMonth[]; note?: string }

const BASE = `${import.meta.env.BASE_URL}global/`
async function read<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path)
  if (!r.ok) throw new Error(`global/${path}: ${r.status}`)
  return (await r.json()) as T
}

let grid: Promise<GlobalGrid> | null = null
/** grid.json, fetched once. Rejects when the build carries no world map. */
export function globalGrid(): Promise<GlobalGrid> {
  grid ??= read<GlobalGrid>('grid.json').catch((e) => { grid = null; throw e })
  return grid
}
/** The comment page can't hold one file per cell, so its build packs the cells into eight bundles by longitude band
 *  (cells-0.json … cells-7.json, 45° each); the live site keeps one file per cell. */
const packOf = (id: string) => Math.min(7, Math.max(0, Math.floor((Number(id.split('_')[1]) + 180) / 45)))
const packs = new Map<number, Promise<Record<string, GlobalCalendar>>>()
/** One cell's monthly calendar (same shape as data/out/calendar/*.json). Only cells with a readable year have one. */
export const globalCell = (id: string): Promise<GlobalCalendar> =>
  read<GlobalCalendar>(`cells/${id}.json`).catch(() => {
    const k = packOf(id)
    let p = packs.get(k)
    if (!p) { p = read<Record<string, GlobalCalendar>>(`cells-${k}.json`); packs.set(k, p); p.catch(() => packs.delete(k)) }
    return p.then((all) => { const c = all[id]; if (!c) throw new Error(`global/${id}: no calendar`); return c })
  })

/** The year's reading of a cell, in one shape for both years. */
export function reading(c: GlobalCell, year: 2024 | 2025) {
  const ok = (year === 2025 ? c.status : c.status_2024) === 'ok'
  const L = year === 2025 ? c.L_2025 : c.L_2024
  return {
    ok: ok && L != null,
    L, lo: year === 2025 ? c.L_2025_lo : c.L_2024_lo, hi: year === 2025 ? c.L_2025_hi : c.L_2024_hi,
    outside: year === 2025 ? c.outside_noise_2025 : c.outside_noise_2024,
    shift: year === 2025 ? c.lst_shift_min_2025 : c.lst_shift_min_2024,
  }
}

/** Diverging steps around L = 1: how far the count sits from the fixed clock. 0 is within 5%. */
export const L_STEPS = [0.05, 0.1, 0.2, 0.35, 0.5]
export const stepOf = (L: number) => { const d = Math.abs(L - 1); let s = 0; for (const t of L_STEPS) if (d > t) s++; return s }

/** said beside every world-map reading */
export const EXPLORATORY = 'Early exploration: the same comparison as the six places, not checked against any country’s own count.'

// sand above what we'd expect, slate below (the calendar's two arms, one step brighter for a dark map); grey within 5%
export const UP = ['#604825', '#876533', '#AE8446', '#D6A866', '#F0CB8E']
export const DOWN = ['#29495C', '#36647D', '#4B82A1', '#68A4C6', '#9CC8E2']
export const NEAR = '#5B5D57'
export const THIN = '#3A3D39'
export const colorOf = (L: number) => { const s = stepOf(L); return s === 0 ? NEAR : (L > 1 ? UP : DOWN)[s - 1] }

const side = (v: number, pos: string, neg: string) => `${Math.abs(v)}°${v === 0 ? '' : v > 0 ? pos : neg}`
export const cellName = (c: GlobalCell) => `${side(c.lat0, 'N', 'S')} to ${side(c.lat1, 'N', 'S')}, ${side(c.lon0, 'E', 'W')} to ${side(c.lon1, 'E', 'W')}`
/** the id of the 2-degree square that holds a point (the grid's corners sit on even degrees) */
export const cellIdAt = (lon: number, lat: number) => {
  const x = ((((lon + 180) % 360) + 360) % 360) - 180 // 180 is -180: the grid's last column starts at 178
  return `g2_${Math.floor(x / 2) * 2}_${Math.floor(lat / 2) * 2}`
}

/** The grid as map polygons: c = fill colour, o = fill strength (0.8 unusual for that square, 0.35 not), ok = readable. */
export function cellFeatures(grid: GlobalGrid, year: 2024 | 2025): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: grid.cells.map((c) => {
      const r = reading(c, year)
      return {
        type: 'Feature',
        properties: { id: c.id, ok: r.ok, c: r.ok && r.L != null ? colorOf(r.L) : THIN, o: r.ok ? (r.outside ? 0.8 : 0.35) : 0 },
        geometry: { type: 'Polygon', coordinates: [[[c.lon0, c.lat0], [c.lon1, c.lat0], [c.lon1, c.lat1], [c.lon0, c.lat1], [c.lon0, c.lat0]]] },
      }
    }),
  }
}
