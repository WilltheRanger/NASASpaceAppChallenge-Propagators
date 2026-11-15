// Round 1 · Direction C · Spec sheet (swiss-system; grounded in Apex + Linear).
// MOCK data only.
import { useMemo, type CSSProperties } from 'react'
import { Globe } from '@/components/ui/cobe-globe'
import { FlipDiskMatrix } from '@/components/ui/flip-disk-matrix'
import { LeaderboardBars } from '@/components/ui/leaderboard-bars'
import { FireCalendar } from '@/components/ui/returns-calendar'
import { auditRows, baselineYear, calendarGrid, headline, latest, noiseFloor, pct, regions, shiftLabel } from '@/lib/data'
import { Arrow, Chevron, MockBadge } from './shared'

const T = {
  cobalt: '#2043D6', cobaltInk: '#E9EDFF', paper: '#F4F4F0', card: '#FFFFFF', ink: '#0E0F12', ink2: '#3D4049', ink3: '#5F6370', rule: '#DADBD5',
  orange: '#FF5A1F', aqua: '#C2410C', viirs: '#2043D6', terra: '#00826F',
}
const vars = {
  '--mono': '"Martian Mono", ui-monospace, monospace',
  '--vz-ink': T.ink, '--vz-grid': '#E8E9E4', '--vz-track': '#F0F1EC', '--vz-muted': T.ink3, '--vz-text3': T.ink3,
  '--vz-band': '#E8ECFB', '--vz-zero': T.ink2, '--vz-bad': '#B23A00', '--vz-mark-fill': '#fff', '--vz-mono': '"Martian Mono", monospace',
  '--cal-up': '#D6481B', '--cal-down': '#2F5BD8', '--cal-fg': T.ink, '--cal-surface': '#fff', '--cal-line': 'rgba(14,15,18,0.18)',
  '--globe-label-font': '"Martian Mono", monospace',
} as CSSProperties

const centre = (b: number[]): [number, number] => [(b[1] + b[3]) / 2, (b[0] + b[2]) / 2]

export default function DirectionC() {
  const markers = useMemo(() => regions.map((r) => ({ id: r.id, location: centre(r.bbox), label: r.name.replace(' (Brazil)', '').replace(' (India)', '').replace(' (USA)', '') })), [])
  const cal = useMemo(() => calendarGrid(2019, 2026), [])
  const rows = useMemo(() => auditRows({ clock: T.orange, noise: '#AEB3C2' }), [])
  const specs = [
    { name: 'AQUA', tag: 'drifting later', color: T.aqua, disk: '#E2552A', t: latest.aqua_lst, d: shiftLabel(latest.aqua_lst, baselineYear.aqua_lst), note: "INPE's reference satellite" },
    { name: 'VIIRS', tag: 'fixed clock', color: T.viirs, disk: '#2043D6', t: latest.viirs_lst, d: shiftLabel(latest.viirs_lst, baselineYear.viirs_lst), note: "Propagators's fixed clock" },
    { name: 'TERRA', tag: 'drifting earlier', color: T.terra, disk: '#00826F', t: latest.terra_lst, d: shiftLabel(latest.terra_lst, baselineYear.terra_lst), note: 'The opposite clock' },
  ]
  return (
    <div className="min-h-screen" style={{ ...vars, background: T.paper, color: T.ink, fontFamily: '"Schibsted Grotesk", system-ui, sans-serif' }}>
      <header className="flex h-[60px] items-center gap-7 border-b px-4 lg:px-9" style={{ borderColor: T.rule, background: T.paper }}>
        <div className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="8.5" fill="none" stroke={T.ink} strokeWidth="2" /><path d="M13 1v6M13 19v6M1 13h6M19 13h6" stroke={T.ink} strokeWidth="2" /><circle cx="17.9" cy="6" r="2.6" fill={T.orange} /></svg>
          Propagators
        </div>
        <nav aria-label="Sections" className="hidden gap-1 text-[11px] lg:flex" style={{ fontFamily: 'var(--mono)', color: T.ink3 }}>
          {['0.0 Verdict', '1.0 Clock', '2.0 Two clocks', '3.0 Audit', '4.0 Calendar', '5.0 Checks', '6.0 Misses', '7.0 Limits'].map((s, i) => (
            <a key={s} href="#" className="rounded-md px-2.5 py-1.5" aria-current={i === 0 ? 'true' : undefined} style={i === 0 ? { background: T.ink, color: T.paper } : undefined}>{s}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <MockBadge />
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold" style={{ borderColor: T.ink, background: T.card }}>Amazon (Brazil) <Chevron /></button>
        </div>
      </header>

      <section style={{ background: T.cobalt, color: '#fff' }} aria-labelledby="c-h">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-x-6 px-4 pb-[180px] pt-10 lg:grid-cols-12 lg:px-9 lg:pt-14">
          <p className="flex flex-wrap gap-4 text-xs lg:col-span-12" style={{ fontFamily: 'var(--mono)', color: T.cobaltInk }}><b className="text-white">0.0 Verdict</b><span>Amazon (Brazil)</span><span>Audit years 2021–2025</span><span>Baseline 2012–2020</span></p>
          <div className="lg:col-span-7">
            <h1 id="c-h" className="mt-6 text-[44px] font-bold leading-[0.98] tracking-[-0.035em] lg:text-[76px]" style={{ textWrap: 'balance' }}>The official count moved with the satellite's clock.</h1>
            <p className="mt-6 max-w-[30em] text-lg font-medium leading-snug lg:text-[22px]" style={{ color: T.cobaltInk }}>
              From {headline.from} to {headline.to} the Amazon's official, Aqua-based count fell <b className="text-white">{Math.abs(headline.official).toFixed(1)}%</b>. On a fixed 13:30 clock it fell <b className="text-white">{Math.abs(headline.fixed).toFixed(1)}%</b>. Aqua's later look added <b style={{ color: '#FFB59A' }}>{pct(headline.gap)}</b> (range {pct(headline.gapLo)} to {pct(headline.gapHi)}) to {headline.to}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#c-prod" className="inline-flex h-12 items-center gap-2.5 rounded-lg px-5 text-[15px] font-bold" style={{ background: T.orange, color: '#1A0700' }}>Explore the calendar <Arrow /></a>
              <a href="#" className="inline-flex h-12 items-center rounded-lg border-[1.5px] px-5 text-[15px] font-bold" style={{ borderColor: 'rgba(255,255,255,0.7)' }}>Download summary</a>
            </div>
          </div>
          <div className="relative mx-auto mt-8 w-full max-w-[460px] lg:col-span-5 lg:mt-0">
            <p className="text-[11px]" style={{ fontFamily: 'var(--mono)', color: T.cobaltInk }}>FIG. 1 · Six preset regions</p>
            <Globe markers={markers} focusLon={-58} theta={0.12} dark={1} baseColor={[0.42, 0.52, 1]} glowColor={[0.13, 0.26, 0.84]} markerColor={[1, 0.36, 0.12]} mapBrightness={7} diffuse={1.3} markerSize={0.05} speed={0.0018} labelBg="#0E0F12" labelFg="#fff" />
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 lg:col-span-12">
            {specs.map((s) => (
              <article key={s.name} className="rounded-xl p-5" style={{ background: T.card, color: T.ink, ['--disk-on' as string]: s.disk, ['--disk-off' as string]: '#E6E8EE', ['--disk-off-edge' as string]: 'rgba(0,0,0,0.04)' } as CSSProperties}>
                <div className="flex items-center justify-between">
                  <span className="text-[22px] font-extrabold tracking-tight">{s.name}</span>
                  <span className="rounded border px-2 py-1 text-[10px] font-semibold" style={{ fontFamily: 'var(--mono)', color: s.color, borderColor: s.color }}>{s.tag}</span>
                </div>
                <p className="mt-4 text-[11px]" style={{ fontFamily: 'var(--mono)', color: T.ink3 }}>Look time {latest.year} · local solar</p>
                <div className="mt-2 flex items-end gap-3">
                  <FlipDiskMatrix text={s.t} rows={7} gap={2} framed={false} className="w-[250px]" label={`${s.name} look time ${s.t}`} />
                  <span className="pb-1 text-[13px] font-semibold" style={{ fontFamily: 'var(--mono)', color: T.ink3 }}>{s.d} vs 2012–20</span>
                </div>
                <p className="mt-4 border-t pt-3 text-xs" style={{ fontFamily: 'var(--mono)', color: T.ink2, borderColor: T.rule }}>{s.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="c-prod" className="relative mx-4 -mt-[140px] grid grid-cols-1 rounded-2xl border lg:mx-auto lg:max-w-[1368px] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" style={{ background: T.card, borderColor: T.rule, boxShadow: '0 30px 60px -30px rgba(14,15,18,0.35)' }} aria-label="Audit and calendar">
        <div className="p-6">
          <div className="mb-3 flex items-baseline justify-between"><h2 className="text-lg font-bold"><small className="mr-2 text-[11px] font-medium" style={{ fontFamily: 'var(--mono)', color: T.ink3 }}>3.0</small>Audit · Amazon</h2><span className="text-[11px]" style={{ fontFamily: 'var(--mono)', color: T.ink3 }}>Table · CSV · PNG</span></div>
          <LeaderboardBars rows={rows} rowLabel="year" barLabel="clock effect ± range" columns={['Aqua-based', 'Fixed clock', 'Range']} min={-10} max={35} ticks={[-10, 0, 10, 20, 30]} band={[-noiseFloor, noiseFloor]} bandLabel={`band: ±${noiseFloor}% noise`} />
        </div>
        <div className="border-t p-6 lg:border-l lg:border-t-0" style={{ borderColor: T.rule }}>
          <div className="mb-3 flex items-baseline justify-between"><h2 className="text-lg font-bold"><small className="mr-2 text-[11px] font-medium" style={{ fontFamily: 'var(--mono)', color: T.ink3 }}>4.0</small>Calendar · vs median</h2><span className="text-[11px]" style={{ fontFamily: 'var(--mono)', color: T.ink3 }}>Count · Anomaly · CSV</span></div>
          <FireCalendar years={cal.years} cells={cal.cells} mode="anomaly" maxCount={cal.maxCount} title="Anomaly vs. median" hint="hover a month" cellHeight={26} />
        </div>
      </section>
      <p className="mx-auto mb-16 mt-3 max-w-[1368px] px-4 text-[11px] leading-relaxed" style={{ fontFamily: 'var(--mono)', color: T.ink3 }}>Source: NASA FIRMS (MODIS C6.1, VIIRS 375 m) via the Propagators pipeline · drift, audit, calendar/br-amazon.json · MOCK numbers · Globe: cobe (MIT) via 21st.dev</p>
    </div>
  )
}
