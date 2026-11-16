// Downloads: the calendar as CSV and a plain-text summary, in the statistics lead's slide language. "Official" names
// only INPE's published series; the audit's counts are Aqua's own, on the days both satellites returned data.
import { calendarSpan, fmtInt, fmtRange, isValidation, novemberRatio, pct, verdictHeadline, verdictLines, type MonthRange, type RegionData } from './data'

function save(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** The calendar as CSV, for the chosen month range (every month in the file by default). */
export function downloadCalendarCsv(d: RegionData, range: MonthRange = calendarSpan(d)) {
  const rows = [['month', 'fixed_clock_hotspots', 'range_lo', 'range_hi', 'median_ref', 'anomaly_pct', 'aqua', 'snpp', 'noaa20', 'flags', 'mock']]
  for (const c of d.cal.filter((m) => m.ym >= range.from && m.ym <= range.to)) rows.push([c.ym, c.fixed ?? '', c.lo ?? '', c.hi ?? '', c.median_ref ?? '', c.anomaly_pct ?? '', c.aqua ?? '', c.snpp ?? '', c.noaa20 ?? '', c.flags.join(' '), String(d.mock)].map(String))
  const full = calendarSpan(d)
  const part = range.from === full.from && range.to === full.to ? '' : `-${range.from}-to-${range.to}`
  save(`anchor-calendar-${d.id}${part}${d.mock ? '-MOCK' : ''}.csv`, rows.map((r) => r.join(',')).join('\n') + '\n', 'text/csv')
}

const SOURCES = [
  'NASA FIRMS active fire data: MODIS Collection 6.1 (doi:10.5067/FIRMS/MODIS/MCD14ML);',
  'VIIRS 375 m, S-NPP (doi:10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002) and NOAA-20 (doi:10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002).',
]

export function downloadSummary(d: RegionData) {
  const v = verdictLines(d)
  const range = `${pct(d.placebo[0])} to ${pct(d.placebo[1])}`
  const body = isValidation(d.id)
    ? [
        'Punjab and Haryana are the validation case, not a sixth audit (Jethva 2026, doi:10.3390/rs18101506).',
        'Aqua’s November count as a share of S-NPP’s, by year:',
        ...novemberRatio(d).map((r) => `  ${r.year}  ${r.ratio.toFixed(2)}`),
        'Audit years 2023 to 2025 have too few hotspots to read and are not quoted.',
      ]
    : [v.counts, v.timing, v.caveat, v.declines ? `${v.declines} Whole calendar months, not the audit’s days.` : ''].filter(Boolean)
  const lines = [
    `Anchor · ${d.name}${d.mock ? ' · MOCK DATA, not for publication' : ''}`,
    '',
    verdictHeadline(d),
    ...body,
    '',
    `Aqua against its fixed-clock benchmark, by year (95% range; flagged against the 2012–2020 placebo range, ${range}):`,
    ...d.years.map((y) =>
      y.verdict === 'na'
        ? `  ${y.year}  too few hotspots to read`
        : `  ${y.year}  ${pct(y.gap!)} (${fmtRange(y.lo!, y.hi!)})  ${y.verdict === 'outside' ? 'outside' : 'within'} the placebo range  Aqua ${fmtInt(y.aqua)}, benchmark ${y.fixed != null ? fmtInt(y.fixed) : '—'}`,
    ),
    'Counts are daytime hotspot detections on the days both Aqua and S-NPP returned data.',
    'The flag describes; it is not a significance test, and these data don’t isolate how much of any gap the timing caused.',
    '',
    ...SOURCES,
    d.id.startsWith('br-') ? 'INPE Programa Queimadas, Brazil’s official fire series (reference satellite Aqua).' : '',
    'Made by Team Propagators for the NASA Space Apps Challenge 2026.',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '')
  save(`anchor-summary-${d.id}${d.mock ? '-MOCK' : ''}.txt`, lines.join('\n') + '\n', 'text/plain')
}
