// Round 2 data layer: region-aware reads of the team's JSON contract, plus the verdict wording. Each file is read from
// data/out/ when the real pipeline has written it, else from data/mock/ (same layout); every file carries its own
// "mock" flag, and the MOCK labels on screen follow it.
// Every value shown in the comps comes from these files.
import regionsJson from '../../../data/out/regions.json'
// INPE's published yearly series per biome (Programa Queimadas, reference satellite Aqua), as the team's reproduction
// table lists it next to our own FIRMS counts
import inpeCsv from '../../../analysis/brazil-data/out/inpe_reproduction_yearly.csv?raw'

type DriftFile = { mock?: boolean; region: string; years: { year: number; aqua_lst: string; terra_lst: string; viirs_lst: string }[] }
type AuditYear = {
  year: number; status: string; L?: number | null; L_lo?: number | null; L_hi?: number | null; L_strat?: number | null
  aqua_count: number; fixed_count?: number | null; gap_pct?: number | null; share_of_observed_pct?: number | null
  /** the pipeline's one verdict: outside the nine 2012-2020 placebo years' range (descriptive, not a significance test) */
  outside_noise?: boolean
}
type AuditFile = { mock?: boolean; region: string; baseline: { years: string; ratio: number; noise_floor: number; placebo_min?: number; placebo_max?: number; placebo_years?: { year: number; L: number }[] }; years: AuditYear[] }
type CalMonth = { ym: string; fixed: number | null; lo: number | null; hi: number | null; source?: string | null; aqua: number | null; snpp: number | null; noaa20: number | null; flags: string[]; median_ref: number | null; anomaly_pct: number | null }
type CalFile = { mock?: boolean; region: string; unit?: string; months: CalMonth[] }

const byRegion = <T extends { region: string }>(files: Record<string, T>) => Object.fromEntries(Object.values(files).map((f) => [f.region, f])) as Record<string, T>
/** data/out/ wins over data/mock/, region by region */
// Mock files are a development fallback only: built pages carry the real files in data/out and nothing else.
const pick = <T extends { region: string }>(mock: Record<string, T>, out: Record<string, T>) => ({ ...byRegion(mock), ...byRegion(out) })
const driftFiles = pick(
  (import.meta.env.DEV ? import.meta.glob<DriftFile>('../../../data/mock/drift/*.json', { eager: true, import: 'default' }) : ({} as Record<string, DriftFile>)),
  import.meta.glob<DriftFile>('../../../data/out/drift/*.json', { eager: true, import: 'default' }),
)
const auditFiles = pick(
  (import.meta.env.DEV ? import.meta.glob<AuditFile>('../../../data/mock/audit/*.json', { eager: true, import: 'default' }) : ({} as Record<string, AuditFile>)),
  import.meta.glob<AuditFile>('../../../data/out/audit/*.json', { eager: true, import: 'default' }),
)
const calFiles = pick(
  (import.meta.env.DEV ? import.meta.glob<CalFile>('../../../data/mock/calendar/*.json', { eager: true, import: 'default' }) : ({} as Record<string, CalFile>)),
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
type FireDayFile = {
  mock?: boolean; region: string; beta_baseline?: number
  years: { year: number; aqua_lst: string; terra_lst: string; gap_h: number; log_aqua_over_terra: number; lo: number; hi: number }[]
}
const fireDayFiles = pick(
  (import.meta.env.DEV ? import.meta.glob<FireDayFile>('../../../data/mock/fireday/*.json', { eager: true, import: 'default' }) : ({} as Record<string, FireDayFile>)),
  import.meta.glob<FireDayFile>('../../../data/out/fireday/*.json', { eager: true, import: 'default' }),
)
const twoFiles = pick(
  (import.meta.env.DEV ? import.meta.glob<TwoFile>('../../../data/mock/twoclocks/*.json', { eager: true, import: 'default' }) : ({} as Record<string, TwoFile>)),
  import.meta.glob<TwoFile>('../../../data/out/twoclocks/*.json', { eager: true, import: 'default' }),
)

/** California: what each satellite caught of the agency-recorded fires (one matching procedure), and a local circle. */
export type DetectionRate = { size_class: string; n: number; detected: number; rate: number; ci95: [number, number] }
type DetectionFile = { mock?: boolean; source?: string; rule?: string; satellites: Record<string, { n_fires_2012_2020?: number; rates_2012_2020: DetectionRate[]; a50_acres?: number; a50_ci95?: [number, number] }> }
type SeenFile = { mock?: boolean; radius_km: number; center: { lat: number; lon: number }; fires: { year: number; acres: number; aqua: boolean; terra: boolean; viirs: boolean }[] }
const firstOf = <T,>(out: Record<string, T>, mock: Record<string, T>) => (Object.values(out)[0] ?? Object.values(mock)[0]) as T | undefined
export const DETECTION = firstOf(
  import.meta.glob<DetectionFile>('../../../data/out/detection_limits_california.json', { eager: true, import: 'default' }),
  (import.meta.env.DEV ? import.meta.glob<DetectionFile>('../../../data/mock/detection_limits_california.json', { eager: true, import: 'default' }) : ({} as Record<string, DetectionFile>)),
)
/** California by year: the share of each size class each satellite caught, 2012 onward. */
type ProofFile = { mock?: boolean; size_classes: string[]; years: { year: number; size_class: string; aqua_pod: number; terra_pod: number; viirs_pod: number; n: number }[] }
export const PROOF = firstOf(
  import.meta.glob<ProofFile>('../../../data/out/proof_california.json', { eager: true, import: 'default' }),
  (import.meta.env.DEV ? import.meta.glob<ProofFile>('../../../data/mock/proof_california.json', { eager: true, import: 'default' }) : ({} as Record<string, ProofFile>)),
)
export const SEEN = firstOf(
  import.meta.glob<SeenFile>('../../../data/out/socal_seen_missed.json', { eager: true, import: 'default' }),
  (import.meta.env.DEV ? import.meta.glob<SeenFile>('../../../data/mock/socal_seen_missed.json', { eager: true, import: 'default' }) : ({} as Record<string, SeenFile>)),
)

/** The pre-registered checks P1-P10 ("How do we know?"); statuses are pass, pending or fail. */
export type Check = { id: string; name: string; status: 'pass' | 'pending' | 'fail'; detail: string; rule_written?: string; rule_implemented?: string; result_existed_before_commit?: boolean }
type ChecksFile = { mock?: boolean; checks: Check[] }
const checksFile = (Object.values(import.meta.glob<ChecksFile>('../../../data/out/checks.json', { eager: true, import: 'default' }))[0] ??
  Object.values((import.meta.env.DEV ? import.meta.glob<ChecksFile>('../../../data/mock/checks.json', { eager: true, import: 'default' }) : ({} as Record<string, ChecksFile>)))[0]) as ChecksFile | undefined
export const CHECKS = { mock: !!checksFile?.mock, checks: checksFile?.checks ?? [] }

export const REGIONS = regionsJson.regions.map((r) => ({ id: r.id, name: r.name, bbox: r.bbox as unknown as readonly [number, number, number, number] }))
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

/** The audit's reading of a year, as the pipeline flags it: outside the 2012-2020 placebo range, within it, or too few
 *  hotspots to read (expected Aqua count under 300, or an interval wider than a quarter of L). */
export type Verdict = 'outside' | 'within' | 'na'

/** INPE's official yearly count for a Brazil preset (its biome), or null elsewhere. */
const INPE_BIOME: Record<string, string> = { 'br-amazon': 'amazon', 'br-cerrado': 'cerrado', 'br-pantanal': 'pantanal' }
const INPE = (() => {
  const out: Record<string, Record<number, number>> = {}
  const [head, ...rows] = inpeCsv.trim().split(/\r?\n/)
  const cols = head.split(',')
  const iy = cols.indexOf('year'), ib = cols.indexOf('biome'), ii = cols.indexOf('inpe')
  for (const r of rows) {
    const c = r.split(',')
    ;(out[c[ib]] ??= {})[Number(c[iy])] = Number(c[ii])
  }
  return out
})()
export const inpeAt = (id: RegionId, year: number) => (INPE_BIOME[id] ? INPE[INPE_BIOME[id]]?.[year] ?? null : null)

/** INPE's yearly count beside the team's own count of every daytime Aqua detection from NASA FIRMS, for a Brazil preset
 *  (the reproduction table behind check P3). */
export function inpeReproduction(id: RegionId) {
  const biome = INPE_BIOME[id]
  if (!biome) return []
  const [head, ...rows] = inpeCsv.trim().split(/\r?\n/)
  const cols = head.split(',')
  const iy = cols.indexOf('year'), ib = cols.indexOf('biome'), ii = cols.indexOf('inpe'), ia = cols.indexOf('firms_aqua_all')
  const seen = new Set<number>()
  const out: { year: number; inpe: number; firms: number }[] = []
  for (const r of rows) {
    const c = r.split(',')
    const year = Number(c[iy])
    if (c[ib] !== biome || seen.has(year)) continue
    seen.add(year)
    out.push({ year, inpe: Number(c[ii]), firms: Number(c[ia]) })
  }
  return out.sort((a, b) => a.year - b.year)
}
export const hasOfficialSeries = (id: RegionId) => id in INPE_BIOME

export function regionData(id: RegionId) {
  const drift = driftFiles[id]?.years ?? []
  const auditFile = auditFiles[id]
  const cal = calFiles[id]?.months ?? []
  const noise = (auditFile?.baseline.noise_floor ?? 0.05) * 100
  const base = auditFile?.baseline
  /** the nine 2012-2020 placebo years' range, as percent around 1 */
  const placebo: [number, number] = base?.placebo_min != null && base.placebo_max != null
    ? [(base.placebo_min - 1) * 100, (base.placebo_max - 1) * 100]
    : [-noise, noise]
  /** each 2012-2020 year's own reading, as percent around 1 (the dots the usual range is drawn from) */
  const placeboYears = (base?.placebo_years ?? []).map((p) => ({ year: p.year, gap: (p.L - 1) * 100 }))
  const years = (auditFile?.years ?? []).map((y) => {
    const ok = y.status === 'ok' && y.L != null && y.L_lo != null && y.L_hi != null
    const lo = ok ? (y.L_lo! - 1) * 100 : null
    const hi = ok ? (y.L_hi! - 1) * 100 : null
    const verdict: Verdict = !ok ? 'na' : y.outside_noise ? 'outside' : 'within'
    return {
      year: y.year, verdict, L: ok ? y.L! : null, gap: ok ? (y.L! - 1) * 100 : null, lo, hi,
      strat: ok && y.L_strat != null ? (y.L_strat - 1) * 100 : null,
      aqua: y.aqua_count, fixed: y.fixed_count ?? null, share: ok ? y.share_of_observed_pct ?? null : null,
    }
  })
  const latestOk = [...years].reverse().find((y) => y.verdict !== 'na') ?? null
  // whole calendar years in the file (all twelve months on the fixed clock): totals for Aqua and the fixed clock
  const calYears: Record<number, { fixed: number; aqua: number }> = {}
  const monthsIn: Record<number, number> = {}
  for (const c of cal) {
    const y = Number(c.ym.slice(0, 4))
    if (c.fixed == null) continue
    monthsIn[y] = (monthsIn[y] ?? 0) + 1
    calYears[y] = { fixed: (calYears[y]?.fixed ?? 0) + c.fixed, aqua: (calYears[y]?.aqua ?? 0) + (c.aqua ?? 0) }
  }
  for (const y of Object.keys(calYears)) if (monthsIn[Number(y)] !== 12) delete calYears[Number(y)]
  const calSpan = cal.length ? [Number(cal[0].ym.slice(0, 4)), Math.max(...cal.filter((c) => c.fixed != null).map((c) => Number(c.ym.slice(0, 4))))] as const : null
  // the first year Aqua's look sat at least 4 minutes later than its 2012-2020 median, and stayed later
  const baseLook = (() => {
    const v = drift.filter((r) => r.year <= 2020).map((r) => hm(r.aqua_lst)).sort((a, b) => a - b)
    return v.length ? v[Math.floor(v.length / 2)] : null
  })()
  const driftStart = (() => {
    if (baseLook == null) return null
    let start: number | null = null
    for (const r of drift) {
      const later = (hm(r.aqua_lst) - baseLook) * 60 >= 4
      if (later && start == null) start = r.year
      if (!later) start = null
    }
    return start
  })()
  const lastDrift = drift[drift.length - 1]
  const driftAt = (year: number) => drift.find((d) => d.year === year) ?? lastDrift
  return {
    id, name: REGIONS.find((r) => r.id === id)?.name ?? id, phrase: phrase(id),
    drift, lastDrift, driftAt, baselineYears: auditFile?.baseline.years ?? '2012-2020', noise, placebo, placeboYears, years, latestOk, cal,
    calYears, calSpan, driftStart, baseLook: baseLook == null ? null : fmtHM(baseLook),
    /** the 2012-2020 exchange rate: Aqua's daytime detections per S-NPP detection on matched days */
    ratio: base?.ratio ?? null,
    fireday: fireDayFiles[id] ?? null,
    /** two-clocks ratios (detections vs. the fixed clock, 1 = baseline) for a year, when the region has them */
    twoAt: (year: number) => twoFiles[id]?.years.find((t) => t.year === year) ?? null,
    /** the two-clocks test, year by year */
    two: twoFiles[id]?.years ?? [],
    twoMock: !!twoFiles[id]?.mock,
    mock: !!(driftFiles[id]?.mock || auditFile?.mock || calFiles[id]?.mock || twoFiles[id]?.mock),
  }
}
export type RegionData = ReturnType<typeof regionData>

/** Punjab + Haryana is the validation case (Jethva 2026), not a sixth audit. */
export const isValidation = (id: RegionId) => id === 'in-punjab-haryana'

/** How much later Aqua looked in the drift file's last year than its 2012-2020 median (drift files), in whole minutes. */
export function lookChange(d: RegionData) {
  const last = d.lastDrift
  if (!last || !d.baseLook) return null
  return { old: d.baseLook, now: last.aqua_lst, year: last.year, minutes: Math.round((hm(last.aqua_lst) - hm(d.baseLook)) * 60), viirs: last.viirs_lst, terra: last.terra_lst }
}
/** The smallest and largest of those shifts across the six regions ("68 to 80 minutes"). */
export const LOOK_RANGE = (() => {
  const v = REGIONS.map((r) => lookChange(regionData(r.id))?.minutes).filter((m): m is number => m != null)
  return v.length ? { min: Math.min(...v), max: Math.max(...v) } : null
})()

/** Aqua's November count as a share of S-NPP's, by year, from the calendar file: Punjab's timing evidence. */
export function novemberRatio(d: RegionData) {
  return d.cal
    .filter((c) => c.ym.endsWith('-11') && c.aqua != null && c.snpp)
    .map((c) => ({ year: Number(c.ym.slice(0, 4)), ratio: c.aqua! / c.snpp! }))
}

/** The headline: Aqua's count against its fixed-clock benchmark in the latest readable year, never a cause. */
export function verdictHeadline(d: RegionData) {
  if (isValidation(d.id)) {
    const nov = novemberRatio(d)
    const a = nov.find((r) => r.year === 2016), b = nov[nov.length - 1]
    return a && b ? `Each November in Punjab, Aqua’s count rose from ${a.ratio.toFixed(2)} of VIIRS’s in ${a.year} to ${b.ratio.toFixed(2)} in ${b.year}` : 'Punjab and Haryana are our validation case'
  }
  const y = d.latestOk
  if (!y) return `Too few hotspots in ${d.phrase.the} to compare Aqua with its benchmark`
  if (y.verdict === 'within') return `In ${y.year}, Aqua's count for ${d.phrase.the} stayed within the range of its fixed-clock benchmark`
  const n = Math.round(Math.abs(y.gap!))
  return `In ${y.year}, Aqua's count for ${d.phrase.the} ran ${n}% ${y.gap! >= 0 ? 'above' : 'below'} its fixed-clock benchmark`
}

const verb = (v: number) => (v < 0 ? 'fell' : 'rose')
const change = (a: number, b: number) => (b / a - 1) * 100

/** The sentences under the headline: the two counts, the timing change, the caveat, and the declines over whole years
 *  (the downloaded summary prints these). `short` is the page's terse wording of the same values, and `whole` the same
 *  whole-year changes as numbers, for a stat row. */
export function verdictLines(d: RegionData, from = 2024, to = 2025) {
  const y = d.latestOk
  const first = d.drift[0]
  const last = d.lastDrift
  const ratio = y && y.verdict !== 'outside' && y.L != null ? `a ratio of ${y.L.toFixed(2)} (95% interval ${(1 + y.lo! / 100).toFixed(2)}–${(1 + y.hi! / 100).toFixed(2)}), inside the 2012–2020 placebo range` : ''
  const counts = y && y.fixed != null
    ? y.verdict === 'outside'
      ? `On the days both satellites returned data in ${y.year}, Aqua recorded ${fmtInt(y.aqua)} daytime hotspot detections; its 2012–2020 relationship with VIIRS (S-NPP) predicted ${fmtInt(y.fixed)}.`
      : `On the days both satellites returned data in ${y.year}, Aqua recorded ${fmtInt(y.aqua)} daytime hotspot detections against ${fmtInt(y.fixed)} predicted by its 2012–2020 relationship with VIIRS (S-NPP): ${ratio}.`
    : ''
  const moved = first && last ? Math.round((hm(last.aqua_lst) - hm(first.aqua_lst)) * 60) : 0
  const drifted = !!(first && last && Math.abs(moved) >= 5)
  const timing = drifted
    ? `Over the same years Aqua's look moved about ${Math.abs(moved)} minutes ${moved > 0 ? 'later' : 'earlier'} (${first.aqua_lst} in ${first.year}, ${last.aqua_lst} in ${last.year}) while VIIRS stayed near ${last.viirs_lst}.`
    : ''
  const caveat = y?.verdict === 'outside' ? 'These data show the gap and the timing change together; they don’t isolate how much of the gap the timing caused.' : ''
  // whole calendar years: INPE's official series where there is one, else Aqua's own monthly count, beside the fixed clock
  const cf = d.calYears[from], ct = d.calYears[to]
  const of = inpeAt(d.id, from), ot = inpeAt(d.id, to)
  let declines = ''
  const whole: { name: string; a: number; b: number; change: number }[] = []
  if (cf && ct) {
    const fixed = `the fixed-clock calendar ${verb(change(cf.fixed, ct.fixed))} ${Math.abs(change(cf.fixed, ct.fixed)).toFixed(1)}% (${fmtInt(cf.fixed)} to ${fmtInt(ct.fixed)})`
    declines = of != null && ot != null
      ? `From ${from} to ${to}, INPE's official count ${verb(change(of, ot))} ${Math.abs(change(of, ot)).toFixed(1)}% (${fmtInt(of)} to ${fmtInt(ot)}); ${fixed}.`
      : `From ${from} to ${to}, Aqua's own count ${verb(change(cf.aqua, ct.aqua))} ${Math.abs(change(cf.aqua, ct.aqua)).toFixed(1)}% (${fmtInt(cf.aqua)} to ${fmtInt(ct.aqua)}); ${fixed}.`
    whole.push(
      of != null && ot != null
        ? { name: 'INPE’s official count', a: of, b: ot, change: change(of, ot) }
        : { name: 'Aqua’s own count', a: cf.aqua, b: ct.aqua, change: change(cf.aqua, ct.aqua) },
      { name: 'Fixed-clock calendar', a: cf.fixed, b: ct.fixed, change: change(cf.fixed, ct.fixed) },
    )
  }
  const short = {
    counts: y && y.fixed != null ? `Aqua ${fmtInt(y.aqua)} daytime hotspots · benchmark ${fmtInt(y.fixed)}, on days both satellites returned data${ratio ? `: ${ratio}` : ''}.` : '',
    look: drifted ? `Aqua’s look: ${first.aqua_lst} in ${first.year}, ${last.aqua_lst} in ${last.year} (about ${Math.abs(moved)} min ${moved > 0 ? 'later' : 'earlier'}); VIIRS near ${last.viirs_lst}.` : '',
    caveat: y?.verdict === 'outside' ? 'Gap and clock change appear together; the clock’s share isn’t isolated.' : '',
  }
  return { counts, timing, caveat, declines, short, whole, year: y, from, to }
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface CalendarCell { ym: string; fixed: number | null; lo: number | null; hi: number | null; median: number | null; anomaly: number | null; flags: string[]; outside?: boolean }

/** A month range, inclusive, as YYYY-MM. */
export type MonthRange = { from: string; to: string }
/** Every month the calendar file covers: January of its first year to December of its last. */
export const calendarSpan = (d: RegionData): MonthRange => ({ from: `${d.calSpan?.[0] ?? 2002}-01`, to: `${d.calSpan?.[1] ?? 2025}-12` })
const inRange = (ym: string, r: MonthRange) => ym >= r.from && ym <= r.to

/** Month × year grid (years descending) for a region and an inclusive month range. Months outside the range keep
 *  their place in the grid, marked `outside`. */
export function calendarGrid(d: RegionData, range: MonthRange = calendarSpan(d)) {
  const years: number[] = []
  const cells: (CalendarCell | null)[][] = []
  let maxCount = 1
  for (let y = Number(range.to.slice(0, 4)); y >= Number(range.from.slice(0, 4)); y--) {
    years.push(y)
    const row: (CalendarCell | null)[] = []
    for (let m = 1; m <= 12; m++) {
      const ym = `${y}-${String(m).padStart(2, '0')}`
      if (!inRange(ym, range)) { row.push({ ym, fixed: null, lo: null, hi: null, median: null, anomaly: null, flags: [], outside: true }); continue }
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
export function calendarFinding(d: RegionData, range: MonthRange = calendarSpan(d)) {
  let best: CalMonth | null = null
  for (const c of d.cal) {
    if (!inRange(c.ym, range) || c.anomaly_pct == null || c.flags.includes('provisional')) continue
    if (!best || c.anomaly_pct > best.anomaly_pct!) best = c
  }
  if (!best) return null
  const [y, m] = best.ym.split('-').map(Number)
  return { label: `${MONTHS[m - 1]} ${y}`, anomaly: best.anomaly_pct!, fixed: best.fixed!, median: best.median_ref! }
}

/* ---------- Daylight left after the alert ----------
   D = sunset − (look time + delay), all in local mean solar time (UTC + longitude/15), as in the drift files. Sunset
   comes from NOAA's Solar Calculator equations (after Meeus), zenith 90.833°, at the centre of the region's box on
   the middle day of its fire season: the three consecutive months with the most fixed-clock hotspots, 2012-2020. This
   is the team's "Level 1" daylight figure, and it reproduces their table to within a minute. */

const rad = (v: number) => (v * Math.PI) / 180
const deg = (v: number) => (v * 180) / Math.PI

/** The Sun's declination (degrees) and the equation of time (minutes) at noon UTC on a date. */
function solarPosition(y: number, m: number, day: number) {
  const jc = (Date.UTC(y, m - 1, day, 12) / 86400000 + 2440587.5 - 2451545) / 36525
  const L0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360
  const M = 357.52911 + jc * (35999.05029 - 0.0001537 * jc)
  const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc)
  const C = Math.sin(rad(M)) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) + Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * jc) + Math.sin(rad(3 * M)) * 0.000289
  const om = 125.04 - 1934.136 * jc
  const lam = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(om))
  const eps = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(rad(om))
  const dec = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lam))))
  const t = Math.tan(rad(eps / 2)) ** 2
  const eot = 4 * deg(t * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * t * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) - 0.5 * t * t * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)))
  return { dec, eot }
}

/** Sunrise and sunset in local mean solar time (hours) at a latitude on a date. */
export function sunTimes(y: number, m: number, day: number, lat: number) {
  const { dec, eot } = solarPosition(y, m, day)
  const x = Math.cos(rad(90.833)) / (Math.cos(rad(lat)) * Math.cos(rad(dec))) - Math.tan(rad(lat)) * Math.tan(rad(dec))
  const ha = deg(Math.acos(Math.max(-1, Math.min(1, x))))
  const noon = 12 - eot / 60
  return { rise: noon - ha / 15, set: noon + ha / 15 }
}

/** The region's fire season: the three consecutive months with the most fixed-clock hotspots, 2012-2020. */
export function fireSeason(d: RegionData) {
  const tot = Array<number>(12).fill(0)
  for (const c of d.cal) {
    const y = Number(c.ym.slice(0, 4))
    if (y >= 2012 && y <= 2020 && c.fixed != null) tot[Number(c.ym.slice(5, 7)) - 1] += c.fixed
  }
  let start = 0, best = -1
  for (let i = 0; i + 2 < 12; i++) { const s = tot[i] + tot[i + 1] + tot[i + 2]; if (s > best) { best = s; start = i } }
  /** the season's middle day in a year: the 46th day from its first */
  const middle = (year: number) => { const t = new Date(Date.UTC(year, start, 1) + 45 * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, day: t.getUTCDate() } }
  return { start, label: `${MONTHS[start]} to ${MONTHS[start + 2]}`, middle }
}

/** The alert delays shown: none, the middle case, and the bound NASA FIRMS states for near-real-time data. */
export const DELAYS = [0, 1.5, 3] as const
export type SatKey = 'terra' | 'viirs' | 'aqua'

/** Daylight left after each satellite's alert, year by year, for a region (hours; negative = after sunset). */
export function daylight(d: RegionData) {
  const r = REGIONS.find((x) => x.id === d.id)
  if (!r || !d.drift.length || !d.cal.length) return null
  const lat = (r.bbox[1] + r.bbox[3]) / 2
  const season = fireSeason(d)
  const years = d.drift.map((row) => {
    const mid = season.middle(row.year)
    const sun = sunTimes(mid.y, mid.m, mid.day, lat)
    const look: Record<SatKey, number> = { terra: hm(row.terra_lst), viirs: hm(row.viirs_lst), aqua: hm(row.aqua_lst) }
    const left = (k: SatKey) => DELAYS.map((l) => sun.set - look[k] - l) as [number, number, number]
    return { year: row.year, ...sun, mid, look, left: { terra: left('terra'), viirs: left('viirs'), aqua: left('aqua') } }
  })
  const base = d.baseLook ? hm(d.baseLook) : null
  return { lat, season, years, baseAqua: base, at: (year: number) => years.find((y) => y.year === year) ?? years[years.length - 1] }
}
export type Daylight = NonNullable<ReturnType<typeof daylight>>

/** The daylight analysis's headline for a region (data/out/daylight, written by analysis/daylight/daylight.py). Where
 *  the one-day figure above differs from the real fires by more than 30 minutes in some years (Argentina and
 *  California), its `quote` is "level2a" and the page quotes the median over every real Aqua detection instead. */
export type DaylightHeadline = {
  quote: 'level1' | 'level2a'
  aqua_D15_2012_2020_mean?: number
  aqua_D15_2025?: number
  aqua_daylight_change_min?: number
  aqua_look_change_min?: number
  level2a_aqua_D15_2012_2020_mean?: number
  level2a_aqua_D15_2025?: number
  level2a_aqua_daylight_change_min?: number
}
const daylightFiles = import.meta.glob<DaylightHeadline>('../../../data/out/daylight/*.json', { eager: true, import: 'headline' })
export const daylightHeadline = (id: string): DaylightHeadline | null =>
  Object.entries(daylightFiles).find(([p]) => p.endsWith(`/${id}.json`))?.[1] ?? null

/** One year of the daylight analysis: the shares of real Aqua detections whose alert leaves under 2 hours of light or
 *  arrives after dark (Level 2a), and the same detections on Aqua's 2012-2020 clock (`aqua_cf_*`, Level 2b). Share maps
 *  are keyed by the delay in hours: "0", "1.5", "3". */
export type DaylightYear = {
  year: number
  aqua_share_after_dark: Record<string, number>
  aqua_share_under_2h: Record<string, number>
  aqua_cf_share_after_dark: Record<string, number>
  aqua_cf_share_under_2h: Record<string, number>
  n_aqua?: number
}
const daylightYearFiles = import.meta.glob<DaylightYear[]>('../../../data/out/daylight/*.json', { eager: true, import: 'years' })
export const daylightYears = (id: string): DaylightYear[] =>
  Object.entries(daylightYearFiles).find(([p]) => p.endsWith(`/${id}.json`))?.[1] ?? []

/** One fire day for the Amazon: 2 September 2024 in Pará, from the team's one-day file. Only the real parts are read
 *  (the day, its box, pass times and the fires each pass saw), so nothing else in that file reaches the page. Sunset
 *  comes from the same NOAA equations as the rest of the page, at the box centre; the file's own sunset leaves out the
 *  equation of time. */
export type DayFire = { id: number; lat: number; lon: number; frp: number; n: number; first_seen: number; seen_by: string[]; t_Terra: number | null; t_VIIRS: number | null; t_Aqua: number | null }
const only = <T,>(g: Record<string, T>) => Object.values(g)[0] as T | undefined
export const FIRE_DAY = (() => {
  const day = only(import.meta.glob<string>('../../../data/out/sim/amazon-2024-09-02.json', { eager: true, import: 'day' }))
  const box = only(import.meta.glob<[number, number, number, number]>('../../../data/out/sim/amazon-2024-09-02.json', { eager: true, import: 'box' }))
  const [dy, dm, dd] = day ? day.split('-').map(Number) : [0, 0, 0]
  const sunset = day && box ? sunTimes(dy, dm, dd, (box[1] + box[3]) / 2).set : null
  const passes = only(import.meta.glob<Record<string, number>>('../../../data/out/sim/amazon-2024-09-02.json', { eager: true, import: 'passes_lst' }))
  const passEnd = only(import.meta.glob<Record<string, number>>('../../../data/out/sim/amazon-2024-09-02.json', { eager: true, import: 'pass_end_lst' }))
  const fires = only(import.meta.glob<DayFire[]>('../../../data/out/sim/amazon-2024-09-02.json', { eager: true, import: 'fires' }))
  return day && box && sunset != null && passes && passEnd && fires ? { region: 'br-amazon', day, box, sunset, passes, passEnd, fires } : null
})()

/** A range in percentage points with signs and unit: "+16.4 to +28.4%". */
export const fmtRange = (lo: number, hi: number, d = 1) => `${pct(lo, d).replace('%', '')} to ${pct(hi, d)}`

/** The Regions page's sections, in order (the page's section bar). Daylight now lives in the Simulator, and the method,
 *  checks and limits on the Method page. */
export const SECTIONS = [
  { id: 'verdict', label: 'Result', inComp: true },
  { id: 'look', label: 'When it flies over', inComp: true },
  { id: 'years', label: 'Year by year', inComp: true },
  { id: 'two-clocks', label: 'Two clocks', inComp: true },
  { id: 'calendar', label: 'Calendar', inComp: true },
  { id: 'global', label: 'World map', inComp: true },
] as const
