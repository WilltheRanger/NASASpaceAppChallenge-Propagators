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
/** One cell's monthly calendar (same shape as data/out/calendar/*.json). Only cells with a readable year have one. */
export const globalCell = (id: string): Promise<GlobalCalendar> => read<GlobalCalendar>(`cells/${id}.json`)

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
