// Downloads for the Round 2 comps: the calendar as CSV and a plain-text summary. Both are marked MOCK.
// Drafted with AI assistance (Claude) for Team Propagators.
import { fmtInt, fmtRange, headlineCheck, pct, verdictHeadline, verdictLines, type RegionData } from './data'

function save(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCalendarCsv(d: RegionData) {
  const rows = [['month', 'fixed_clock_hotspots', 'range_lo', 'range_hi', 'median_ref', 'anomaly_pct', 'aqua', 'snpp', 'noaa20', 'flags', 'mock']]
  for (const c of d.cal) rows.push([c.ym, c.fixed ?? '', c.lo ?? '', c.hi ?? '', c.median_ref ?? '', c.anomaly_pct ?? '', c.aqua ?? '', c.snpp ?? '', c.noaa20 ?? '', c.flags.join(' '), String(d.mock)].map(String))
  save(`anchor-calendar-${d.id}${d.mock ? '-MOCK' : ''}.csv`, rows.map((r) => r.join(',')).join('\n') + '\n', 'text/csv')
}

export function downloadSummary(d: RegionData) {
  const l = verdictLines(d)
  const hc = headlineCheck(d)
  const lines = [
    `Anchor · ${d.name}${d.mock ? ' · MOCK DATA, not for publication' : ''}`,
    '',
    verdictHeadline(d),
    `${l.look} ${l.change}`,
    '',
    `Clock effect by year (noise floor ±${d.noise.toFixed(0)}%):`,
    ...d.years.map((y) => `  ${y.year}  ${y.verdict === 'na' ? 'not enough fires to measure' : `${pct(y.gap!)} (${fmtRange(y.lo!, y.hi!)}) ${y.verdict === 'clock' ? 'clock effect' : 'within noise'}`}  official ${fmtInt(y.aqua)}${y.fixed != null ? `, fixed clock ${fmtInt(y.fixed)}` : ''}`),
    '',
    hc.ok ? `${hc.from} → ${hc.to}: official ${pct(hc.official)}, fixed clock ${pct(hc.fixed)}` : '',
    'Sources: audit, drift and calendar JSON for this region (NASA FIRMS: MODIS C6.1, VIIRS 375 m).',
    'Made by Team Propagators with AI-assisted code (Claude).',
  ]
  save(`anchor-summary-${d.id}${d.mock ? '-MOCK' : ''}.txt`, lines.join('\n') + '\n', 'text/plain')
}
