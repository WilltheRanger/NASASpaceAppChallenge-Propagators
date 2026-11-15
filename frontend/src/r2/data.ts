// Round 2 data layer: region-aware reads of the team's JSON contract, plus the verdict wording. Each file is read from
// data/out/ when the real pipeline has written it, else from data/mock/ (same layout); every file carries its own
// "mock" flag, and the MOCK labels on screen follow it.
// Every value shown in the comps comes from these files.
import regionsJson from '../../../data/mock/regions.json'

type DriftFile = { mock?: boolean; region: string; years: { year: number; aqua_lst: string; terra_lst: string; viirs_lst: string }[] }
type AuditYear = { year: number; status: string; L?: number | null; L_lo?: number | null; L_hi?: number | null; L_strat?: number | null; aqua_count: number; fixed_count?: number | null; gap_pct?: number | null }
type AuditFile = { mock?: boolean; region: string; baseline: { years: string; ratio: number; noise_floor: number }; years: AuditYear[] }
type CalMonth = { ym: string; fixed: number | null; lo: number | null; hi: number | null; aqua: number | null; snpp: number | null; noaa20: number | null; flags: string[]; median_ref: number | null; anomaly_pct: number | null }
type CalFile = { mock?: boolean; region: string; unit?: string; months: CalMonth[] }

const byRegion = <T extends { region: string }>(files: Record<string, T>) => Object.fromEntries(Object.values(files).map((f) => [f.region, f])) as Record<string, T>
/** data/out/ wins over data/mock/, region by region */
const pick = <T extends { region: string }>(mock: Record<string, T>, out: Record<string, T>) => ({ ...byRegion(mock), ...byRegion(out) })
const driftFiles = pick(
  import.meta.glob<DriftFile>('../../../data/mock/drift/*.json', { eager: true, import: 'default' }),
  import.meta.glob<DriftFile>('../../../data/out/drift/*.json', { eager: true, import: 'default' }),
)
const auditFiles = pick(
  import.meta.glob<AuditFile>('../../../data/mock/audit/*.json', { eager: true, import: 'default' }),
  import.meta.glob<AuditFile>('../../../data/out/audit/*.json', { eager: true, import: 'default' }),
)
const calFiles = pick(
  import.meta.glob<CalFile>('../../../data/mock/calendar/*.json', { eager: true, import: 'default' }),
  import.meta.glob<CalFile>('../../../data/out/calendar/*.json', { eager: true, import: 'default' }),
)
export type TwoYear = {
  year: number; aqua_lst: string; terra_lst: string
  /** Aqua/VIIRS and Terra/VIIRS against 2012-2020 (1 = no change), with ranges */
  A: number; A_lo: number; A_hi: number; T: number; T_lo: number; T_hi: number
  /** log A - log T: the clock with shared orbit sampling cancelled, with its range */
  clock_diff: number; clock_lo: number; clock_hi: number
  /** the shared orbit-sampling effect, in log units */
  sampling_est: number
}
type TwoFile = { mock?: boolean; region: string; years: TwoYear[] }
const twoFiles = pick(
  import.meta.glob<TwoFile>('../../../data/mock/twoclocks/*.json', { eager: true, import: 'default' }),
  import.meta.glob<TwoFile>('../../../data/out/twoclocks/*.json', { eager: true, import: 'default' }),
)

/** The pre-registered checks P1-P10 ("How do we know?"); statuses are pass, pending or fail. */
export type Check = { id: string; name: string; status: 'pass' | 'pending' | 'fail'; detail: string }
type ChecksFile = { mock?: boolean; checks: Check[] }
const checksFile = (Object.values(import.meta.glob<ChecksFile>('../../../data/out/checks.json', { eager: true, import: 'default' }))[0] ??
  Object.values(import.meta.glob<ChecksFile>('../../../data/mock/checks.json', { eager: true, import: 'default' }))[0]) as ChecksFile | undefined
export const CHECKS = { mock: !!checksFile?.mock, checks: checksFile?.checks ?? [] }

export const MOCK = true
export const REGIONS = regionsJson.regions.map((r) => ({ id: r.id, name: r.name }))
export type RegionId = string

/** How each preset reads inside a sentence. */
const PHRASE: Record<string, { the: string; poss: string; short: string }> = {
  'br-amazon': { the: 'the Amazon', poss: "the Amazon's", short: 'Amazon' },
  'br-cerrado': { the: 'the Cerrado', poss: "the Cerrado's", short: 'Cerrado' },
  'br-pantanal': { the: 'the Pantanal', poss: "the Pantanal's", short: 'Pantanal' },
  'ar-argentina': { the: 'Argentina', poss: "Argentina's", short: 'Argentina' },
  'in-punjab-haryana': { the: 'Punjab and Haryana', poss: "Punjab and Haryana's", short: 'Punjab + Haryana' },
  'us-california': { the: 'California', poss: "California's", short: 'California' },
}
export const phrase = (id: RegionId) => PHRASE[id] ?? { the: id, poss: `${id}'s`, short: id }
/** "Official count" means INPE's reference-satellite (Aqua) series, so only the Brazil presets use the word. */
export const countName = (id: RegionId) => (id.startsWith('br-') ? 'official count' : 'Aqua-based count')

export const hm = (s: string) => { const [h, m] = s.split(':').map(Number); return h + m / 60 }
export const fmtHM = (h: number) => { let hh = Math.floor(h); let mm = Math.round((h - hh) * 60); if (mm === 60) { hh += 1; mm = 0 } return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` }
export const fmtInt = (v: number) => Math.round(v).toLocaleString('en-US')
/** Signed percent with a true minus sign: +22.4% / −26.8% */
export const pct = (v: number, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}%`
export const minutesBetween = (a: string, b: string) => Math.round((hm(a) - hm(b)) * 60)
export const fmtShift = (min: number) => { const s = min >= 0 ? '+' : '−'; const v = Math.abs(min); const h = Math.floor(v / 60); return h ? `${s}${h} h ${String(v % 60).padStart(2, '0')} min` : `${s}${v} min` }

export type Verdict = 'clock' | 'noise' | 'na'

export function regionData(id: RegionId) {
  const drift = driftFiles[id]?.years ?? []
  const auditFile = auditFiles[id]
  const cal = calFiles[id]?.months ?? []
  const noise = (auditFile?.baseline.noise_floor ?? 0.05) * 100
  const years = (auditFile?.years ?? []).map((y) => {
    const ok = y.status === 'ok' && y.L_lo != null && y.L_hi != null && y.gap_pct != null
    const lo = ok ? (y.L_lo! - 1) * 100 : null
    const hi = ok ? (y.L_hi! - 1) * 100 : null
    const verdict: Verdict = !ok ? 'na' : lo! > noise || hi! < -noise ? 'clock' : 'noise'
    return { year: y.year, verdict, gap: ok ? y.gap_pct! : null, lo, hi, strat: ok && y.L_strat != null ? (y.L_strat - 1) * 100 : null, aqua: y.aqua_count, fixed: y.fixed_count ?? null }
  })
  const latestOk = [...years].reverse().find((y) => y.verdict !== 'na') ?? years[years.length - 1]
  const lastDrift = drift[drift.length - 1]
  const driftAt = (year: number) => drift.find((d) => d.year === year) ?? lastDrift
  return {
    id, name: REGIONS.find((r) => r.id === id)?.name ?? id, phrase: phrase(id),
    drift, lastDrift, driftAt, baselineYears: auditFile?.baseline.years ?? '2012-2020', noise, years, latestOk, cal,
    /** two-clocks ratios (detections vs. the fixed clock, 1 = baseline) for a year, when the region has them */
    twoAt: (year: number) => twoFiles[id]?.years.find((t) => t.year === year) ?? null,
    /** the two-clocks test, year by year */
    two: twoFiles[id]?.years ?? [],
    twoMock: !!twoFiles[id]?.mock,
    mock: !!(driftFiles[id]?.mock || auditFile?.mock || calFiles[id]?.mock || twoFiles[id]?.mock),
  }
}
export type RegionData = ReturnType<typeof regionData>

/** Official (Aqua-based) and fixed-clock change between two audit years; null when either year can't be checked. */
export function headlineCheck(d: RegionData, from = 2024, to = 2025) {
  const a = d.years.find((y) => y.year === from), b = d.years.find((y) => y.year === to)
  if (!a || !b || a.fixed == null || b.fixed == null || a.verdict === 'na' || b.verdict === 'na') return { from, to, ok: false as const, reason: !a || a.verdict === 'na' ? from : to }
  return { from, to, ok: true as const, official: (b.aqua / a.aqua - 1) * 100, fixed: (b.fixed / a.fixed - 1) * 100 }
}

/** The L1 headline, worded per verdict (the trend holding gets the same weight as a gap). */
export function verdictHeadline(d: RegionData) {
  const y = d.latestOk
  if (!y || y.verdict === 'na') return `Not enough fires in ${d.phrase.the} to measure the clock effect`
  if (y.verdict === 'noise') return `${cap(d.phrase.poss)} ${countName(d.id).replace(' count', '')} ${y.year} count holds on a fixed clock`
  const n = Math.round(Math.abs(y.gap!))
  return y.gap! >= 0
    ? `Aqua's later clock added ${n}% to ${d.phrase.poss} ${y.year} fire count`
    : `Aqua's later clock removed ${n}% from ${d.phrase.poss} ${y.year} fire count`
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface CalendarCell { ym: string; fixed: number | null; lo: number | null; hi: number | null; median: number | null; anomaly: number | null; flags: string[] }

/** Month × year grid (years descending) for a region and an inclusive year range. */
export function calendarGrid(d: RegionData, from = 2002, to = 2026) {
  const years: number[] = []
  const cells: (CalendarCell | null)[][] = []
  let maxCount = 1
  for (let y = to; y >= from; y--) {
    years.push(y)
    const row: (CalendarCell | null)[] = []
    for (let m = 1; m <= 12; m++) {
      const ym = `${y}-${String(m).padStart(2, '0')}`
      const rec = d.cal.find((c) => c.ym === ym)
      if (!rec) { row.push(null); continue }
      if (rec.fixed != null) maxCount = Math.max(maxCount, rec.fixed)
      row.push({ ym, fixed: rec.fixed, lo: rec.lo, hi: rec.hi, median: rec.median_ref, anomaly: rec.anomaly_pct, flags: rec.flags })
    }
    cells.push(row)
  }
  return { years, cells, maxCount }
}

/** The calendar section's finding: the month furthest above its median in the range (computed, not written). */
export function calendarFinding(d: RegionData, from = 2002, to = 2026) {
  let best: CalMonth | null = null
  for (const c of d.cal) {
    const y = Number(c.ym.slice(0, 4))
    if (y < from || y > to || c.anomaly_pct == null || c.flags.includes('provisional')) continue
    if (!best || c.anomaly_pct > best.anomaly_pct!) best = c
  }
  if (!best) return null
  const [y, m] = best.ym.split('-').map(Number)
  return { label: `${MONTHS[m - 1]} ${y}`, anomaly: best.anomaly_pct!, fixed: best.fixed!, median: best.median_ref! }
}

const verb = (v: number) => (v < 0 ? 'fell' : 'rose')
/** The two L2 sentences under the headline: when Aqua looked, and the official vs. fixed-clock change. */
export function verdictLines(d: RegionData) {
  const y = d.latestOk
  const dr = d.driftAt(y?.year ?? 2025)
  const shift = dr ? minutesBetween(dr.aqua_lst, dr.viirs_lst) : 0
  const look = dr
    ? `In ${y.year} Aqua looked at ${d.phrase.the} at ${dr.aqua_lst} local solar time, ${Math.abs(shift)} minutes ${shift >= 0 ? 'after' : 'before'} the fixed ${dr.viirs_lst} clock.`
    : `Look times for ${d.phrase.the} are not in the data yet.`
  const hc = headlineCheck(d, 2024, 2025)
  const prev = d.years.find((v) => v.year === (hc.ok ? hc.from : -1))
  const pts = hc.ok ? Math.abs(hc.official - hc.fixed) : 0
  const why = hc.ok && prev && prev.verdict === 'clock' && prev.gap != null
    ? ` Because the later clock had already raised ${hc.from} by ${Math.abs(prev.gap).toFixed(1)}%, it moved the ${hc.from} → ${hc.to} change by only ${pts.toFixed(1)} points.`
    : hc.ok ? ` The later clock moved the ${hc.from} → ${hc.to} change by ${pts.toFixed(1)} points.` : ''
  const change = hc.ok
    ? `From ${hc.from} to ${hc.to} the ${countName(d.id)} ${verb(hc.official)} ${Math.abs(hc.official).toFixed(1)}%; on the fixed clock it ${verb(hc.fixed)} ${Math.abs(hc.fixed).toFixed(1)}%.`
    : `${hc.from} and ${hc.to} can't be compared: not enough fires in ${hc.reason} to measure.`
  /** Optional third sentence: why the year-on-year gap is smaller than the clock effect. Place it near the figures. */
  return { look, change, why: why.trim(), hc, drift: dr, shift }
}

/** A range in percentage points with signs and unit: "+16.4 to +28.4%". */
export const fmtRange = (lo: number, hi: number, d = 1) => `${pct(lo, d).replace('%', '')} to ${pct(hi, d)}`

/** Sections of the full page; only `inComp` ones exist in a Round 2 comp. */
export const SECTIONS = [
  { id: 'verdict', label: 'Verdict', inComp: true },
  { id: 'clock', label: 'The clock', inComp: false },
  { id: 'two-clocks', label: 'Two clocks', inComp: false },
  { id: 'audit', label: 'Audit', inComp: false },
  { id: 'calendar', label: 'Calendar', inComp: true },
  { id: 'checks', label: 'Checks', inComp: false },
  { id: 'limits', label: 'Limits', inComp: false },
] as const
