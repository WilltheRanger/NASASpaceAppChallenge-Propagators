// Mock data for the Round 1 design comps (synthetic; every panel shows a MOCK badge).
// The production app fetches data/out/ (real) or data/mock/ at runtime instead.
import regionsJson from '../../../data/mock/regions.json'
import driftJson from '../../../data/mock/drift/br-amazon.json'
import auditJson from '../../../data/mock/audit/br-amazon.json'
import twoJson from '../../../data/mock/twoclocks/br-amazon.json'
import calJson from '../../../data/mock/calendar/br-amazon.json'
import type { CalendarCell } from '@/components/ui/returns-calendar'

export const MOCK = true
export const regions = regionsJson.regions
export const region = regions.find((r) => r.id === 'br-amazon')!
export const drift = driftJson.years
export const audit = auditJson
export const twoclocks = twoJson.years
export const calendar = calJson.months

export const hm = (s: string) => { const [h, m] = s.split(':').map(Number); return h + m / 60 }
export const fmtHM = (h: number) => { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` }
export const fmtInt = (v: number) => Math.round(v).toLocaleString('en-US')
export const pct = (v: number, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}%`

export const latest = drift[drift.length - 1]
export const baselineYear = drift.find((d) => d.year === 2020)!
const diffMin = (a: string, b: string) => Math.round((hm(a) - hm(b)) * 60)
export const shiftLabel = (a: string, b: string) => { const d = diffMin(a, b); const s = d >= 0 ? '+' : '−'; const v = Math.abs(d); return `${s}${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` }

const byYear = Object.fromEntries(audit.years.map((y) => [y.year, y]))
const ch = (a: number, b: number) => (b / a - 1) * 100
export const headline = {
  from: 2024, to: 2025,
  official: ch(byYear[2024].aqua_count, byYear[2025].aqua_count),
  fixed: ch(byYear[2024].fixed_count!, byYear[2025].fixed_count!),
  gap: byYear[2025].gap_pct!,
  gapLo: (byYear[2025].L_lo! - 1) * 100,
  gapHi: (byYear[2025].L_hi! - 1) * 100,
}
export const noiseFloor = audit.baseline.noise_floor * 100
export type Verdict = 'clock' | 'noise' | 'na'
export const verdictOf = (y: (typeof audit.years)[number]): Verdict => {
  if (y.status !== 'ok' || y.L_lo == null || y.L_hi == null) return 'na'
  const lo = (y.L_lo - 1) * 100, hi = (y.L_hi - 1) * 100
  return lo > noiseFloor || hi < -noiseFloor ? 'clock' : 'noise'
}

export function auditRows(colors: { clock: string; noise: string }) {
  return audit.years.map((y) => {
    const v = verdictOf(y)
    if (v === 'na') return { label: String(y.year), offside: true, offsideTag: 'Not enough fires to measure', value: null, valueLabel: '—', metrics: [fmtInt(y.aqua_count), '—', '—'] }
    return {
      label: String(y.year),
      sub: v === 'clock' ? 'clock effect' : 'within noise',
      value: y.gap_pct!, lo: (y.L_lo! - 1) * 100, hi: (y.L_hi! - 1) * 100, mark: (y.L_strat! - 1) * 100,
      valueLabel: pct(y.gap_pct!), color: v === 'clock' ? colors.clock : colors.noise,
      metrics: [fmtInt(y.aqua_count), fmtInt(y.fixed_count!), `${((y.L_lo! - 1) * 100).toFixed(1)}…${((y.L_hi! - 1) * 100).toFixed(1)}`],
    }
  })
}

export function calendarGrid(from: number, to: number) {
  const years: number[] = []
  const cells: (CalendarCell | null)[][] = []
  let maxCount = 1
  for (let y = to; y >= from; y--) {
    years.push(y)
    const row: (CalendarCell | null)[] = []
    for (let m = 1; m <= 12; m++) {
      const rec = calendar.find((c) => c.ym === `${y}-${String(m).padStart(2, '0')}`)
      if (!rec) { row.push(null); continue }
      maxCount = Math.max(maxCount, rec.fixed)
      row.push({ fixed: rec.fixed, lo: rec.lo, hi: rec.hi, median: rec.median_ref, anomaly: rec.anomaly_pct, flags: rec.flags })
    }
    cells.push(row)
  }
  return { years, cells, maxCount }
}

/** Ring data: rows = years, 48 half-hour sectors; each satellite's look-time sector holds its
 *  detection ratio vs. VIIRS (A for Aqua, T for Terra, 1 for VIIRS itself). */
export function lookRing(fromYear = 2019, toYear = 2025) {
  const rows = twoclocks.filter((t) => t.year >= fromYear && t.year <= toYear)
  const rowLabels = rows.map((r) => String(r.year))
  const kinds: Record<string, string> = {}
  const data = rows.map((r) => {
    const v = Array<number>(48).fill(0)
    const viirs = drift.find((d) => d.year === r.year)?.viirs_lst ?? '13:18'
    const put = (lst: string, val: number, name: string) => { const k = Math.min(47, Math.floor(hm(lst) * 2)); v[k] = val; kinds[`${r.year}-${k}`] = `${name} ${lst}` }
    put(viirs, 1, 'VIIRS')
    put(r.terra_lst, r.T, 'Terra')
    put(r.aqua_lst, r.A, 'Aqua')
    return v
  })
  const cellTip = (row: number, hour: number, value: number) => {
    const k = Math.round(hour * 2)
    const name = kinds[`${rowLabels[row]}-${k}`]
    return name ? `${rowLabels[row]} · ${name}\n${value.toFixed(2)}× VIIRS detections` : `${rowLabels[row]} · ${fmtHM(hour)}\nno satellite looked`
  }
  return { data, rowLabels, cellTip }
}

// ---- added for directions D and E ----
import checksJson from '../../../data/mock/checks.json'
type AuditFile = typeof auditJson
const auditFiles = import.meta.glob('../../../data/mock/audit/*.json', { eager: true, import: 'default' }) as Record<string, AuditFile>
export const auditsByRegion: Record<string, AuditFile> = Object.fromEntries(Object.values(auditFiles).map((a) => [a.region, a]))
export const checks = checksJson.checks
/** Latest measurable audit year for a region, with its verdict. */
export function regionStatus(id: string) {
  const a = auditsByRegion[id]
  if (!a) return null
  const years = [...a.years].reverse()
  const y = years.find((v) => v.status === 'ok') ?? years[0]
  return { year: y.year, gap: y.gap_pct, verdict: verdictOf(y as (typeof audit.years)[number]), insufficient: a.years.filter((v) => v.status !== 'ok').map((v) => v.year) }
}
