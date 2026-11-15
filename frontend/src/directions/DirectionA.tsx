// Round 1 · Direction A · Thermal (cinematic-product; grounded in Oxide + Flip-Disk Matrix).
// MOCK data only.
import { useMemo, type CSSProperties } from 'react'
import { FlipDiskMatrix } from '@/components/ui/flip-disk-matrix'
import { CirculariumRing } from '@/components/ui/circularium-ring'
import { LeaderboardBars } from '@/components/ui/leaderboard-bars'
import { FireCalendar } from '@/components/ui/returns-calendar'
import { ThermalField } from '@/components/viz/shaders'
import { audit, auditRows, calendarGrid, headline, latest, lookRing, noiseFloor, pct, verdictOf } from '@/lib/data'
import { Arrow, Chevron, MockBadge } from './shared'

const T = {
  bg: '#07060B', surface: '#110F19', line: 'rgba(255,240,230,0.10)', line2: 'rgba(255,240,230,0.18)',
  text: '#F4EFEA', text2: '#B9B0A8', text3: '#8C847D', ember: '#FF7A1A', cyan: '#4FD8E8', violet: '#B49CFF',
}
const vars = {
  '--mono': '"JetBrains Mono", ui-monospace, monospace',
  '--disk-on': T.ember, '--disk-off': '#1C1926', '--disk-bezel': '#0B0A10', '--disk-screen': '#050408',
  '--ring-card': 'rgba(10,9,15,0.80)', '--ring-fg': T.text, '--ring-muted': T.text2, '--ring-border': T.line2,
  '--ring-well': 'rgba(255,255,255,0.04)', '--ring-thumb': '#2A2535', '--ring-tip-bg': T.text, '--ring-tip-fg': T.bg, '--ring-stage': 'rgba(0,0,0,0.25)',
  '--vz-ink': T.text, '--vz-grid': 'rgba(255,240,230,0.08)', '--vz-track': 'rgba(255,240,230,0.06)', '--vz-muted': T.text3, '--vz-text3': T.text2,
  '--vz-band': 'rgba(79,216,232,0.10)', '--vz-zero': 'rgba(255,240,230,0.45)', '--vz-bad': '#FFB37A', '--vz-mark-fill': T.bg, '--vz-mono': '"JetBrains Mono", monospace',
  '--cal-up': '#F37819', '--cal-down': '#4FA3D9', '--cal-fg': T.text, '--cal-surface': '#16131F', '--cal-line': 'rgba(255,240,230,0.16)',
} as CSSProperties

export default function DirectionA() {
  const ring = useMemo(() => lookRing(2019, 2025), [])
  const cal = useMemo(() => calendarGrid(2016, 2026), [])
  const rows = useMemo(() => auditRows({ clock: T.ember, noise: '#5E5868' }).map((r) => ({ ...r, metrics: r.metrics?.slice(0, 2) })), [])
  return (
    <div className="dark min-h-screen" style={{ ...vars, background: T.bg, color: T.text, fontFamily: '"Archivo", system-ui, sans-serif' }}>
      <header className="sticky top-0 z-20 flex h-[60px] items-center gap-7 border-b px-8" style={{ background: 'rgba(7,6,11,0.86)', backdropFilter: 'blur(10px)', borderColor: T.line }}>
        <div className="flex items-center gap-2.5 text-[19px] font-semibold tracking-tight">
          <svg width="22" height="22" viewBox="0 0 7 7" aria-hidden="true"><g fill={T.ember}><rect x="3" y="0" width="1" height="1" /><rect x="2" y="1" width="3" height="1" /><rect x="3" y="2" width="1" height="2" /><rect x="0" y="4" width="1" height="1" /><rect x="3" y="4" width="1" height="2" /><rect x="6" y="4" width="1" height="1" /><rect x="1" y="5" width="1" height="1" /><rect x="5" y="5" width="1" height="1" /><rect x="2" y="6" width="3" height="1" /></g></svg>
          Anchor
        </div>
        <nav aria-label="Sections" className="hidden gap-[18px] overflow-hidden whitespace-nowrap text-xs lg:flex" style={{ fontFamily: 'var(--mono)', color: T.text3 }}>
          {['0.0 Verdict', '1.0 Clock', '2.0 Two clocks', '3.0 Audit', '4.0 Calendar', '5.0 Checks', '6.0 Misses', '7.0 Limits'].map((s, i) => (
            <a key={s} href="#" className="py-1.5" style={i === 0 ? { color: T.text, boxShadow: `inset 0 -2px 0 ${T.ember}` } : undefined} aria-current={i === 0 ? 'true' : undefined}>{s}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <MockBadge />
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium" style={{ borderColor: T.line2, background: T.surface, color: T.text }}>Amazon (Brazil) <Chevron /></button>
        </div>
      </header>

      <section className="relative overflow-hidden border-b" style={{ borderColor: T.line }} aria-labelledby="a-verdict">
        <ThermalField src="img/amazon-viirs-fires-2024-08-23.jpg" className="absolute inset-0 h-full w-full" stillClassName="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(7,6,11,0.95) 0%, rgba(7,6,11,0.86) 40%, rgba(7,6,11,0.30) 72%, rgba(7,6,11,0.55) 100%)' }} />
        <div className="relative mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-5 pb-12 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-12 lg:pt-16">
          <div>
            <p className="text-xs" style={{ fontFamily: 'var(--mono)', color: T.text2 }}><b style={{ color: T.text }}>0.0 Verdict</b> · Amazon (Brazil) · look time, local solar time</p>
            <div className="mt-5 flex flex-wrap items-end gap-6">
              <FlipDiskMatrix text={latest.aqua_lst} rows={9} gap={3} label={`Aqua looked at ${latest.aqua_lst} in ${latest.year}`} className="w-[420px] max-w-full" />
              <p className="pb-1 text-[13px] leading-relaxed" style={{ fontFamily: 'var(--mono)', color: T.text2 }}>
                <strong className="block" style={{ color: T.ember }}>Aqua, {latest.year}</strong>
                the satellite INPE's official count uses<br />
                <span style={{ color: T.cyan }}>VIIRS {latest.viirs_lst} · the fixed clock</span>
              </p>
            </div>
            <h1 id="a-verdict" className="mt-7 max-w-[21ch] text-[30px] font-medium leading-[1.12] tracking-[-0.015em] lg:text-[42px]" style={{ textWrap: 'balance' }}>
              Aqua's later clock added about <span style={{ color: T.ember }}>{Math.round(headline.gap)}%</span> to the Amazon's {headline.to} count. On a fixed clock, {headline.from}→{headline.to} fell <span style={{ color: T.ember }}>{Math.abs(headline.fixed).toFixed(1)}%</span>, not {Math.abs(headline.official).toFixed(1)}%.
            </h1>
            <div role="group" aria-label="Headline check" className="mt-7 grid w-full grid-cols-1 rounded-[10px] border sm:w-fit sm:grid-cols-3" style={{ borderColor: T.line2, background: 'rgba(17,15,25,0.8)' }}>
              {[
                ['Official, Aqua-based', pct(headline.official), T.text, `${headline.from} → ${headline.to}`],
                ['Fixed clock', pct(headline.fixed), T.cyan, `${headline.from} → ${headline.to}`],
                [`Clock effect, ${headline.to}`, pct(headline.gap), T.ember, `range ${pct(headline.gapLo)} to ${pct(headline.gapHi)}`],
              ].map(([k, v, c, r], i) => (
                <div key={k} className="px-5 py-3.5" style={{ borderLeft: i ? `1px solid ${T.line}` : undefined }}>
                  <div className="text-xs" style={{ fontFamily: 'var(--mono)', color: T.text3 }}>{k}</div>
                  <div className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight" style={{ fontFamily: 'var(--mono)', color: c }}>{v}</div>
                  <div className="mt-1.5 text-xs" style={{ fontFamily: 'var(--mono)', color: T.text2 }}>{r}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Clock effect by year">
              {audit.years.map((y) => {
                const v = verdictOf(y)
                return (
                  <span key={y.year} className="rounded-md border px-2.5 py-1.5 text-xs" style={{ fontFamily: 'var(--mono)', borderColor: v === 'clock' ? 'rgba(255,122,26,0.65)' : T.line2, background: v === 'clock' ? 'rgba(255,122,26,0.12)' : 'rgba(17,15,25,0.7)', color: v === 'clock' ? '#FFD9BF' : T.text2, borderStyle: v === 'na' ? 'dashed' : 'solid' }}>
                    <b className="mr-1.5" style={{ color: T.text }}>{y.year}</b>{v === 'na' ? 'not enough fires' : `${pct(y.gap_pct!)} ${v === 'clock' ? 'clock' : 'within noise'}`}
                  </span>
                )
              })}
            </div>
            <p className="mt-2.5 text-xs" style={{ fontFamily: 'var(--mono)', color: T.text3 }}>Noise floor ±{noiseFloor}% from 2012–2020 placebo years · "clock" = the whole error range sits outside it</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#a-cal" className="inline-flex h-[46px] items-center gap-2.5 rounded-[9px] px-5 text-[15px] font-semibold" style={{ background: T.ember, color: '#1A0A00' }}>Explore the calendar <Arrow /></a>
              <a href="#" className="inline-flex h-[46px] items-center rounded-[9px] border px-5 text-[15px] font-semibold" style={{ borderColor: T.line2, background: 'rgba(17,15,25,0.6)' }}>Download summary</a>
            </div>
            <p className="mt-6 max-w-[64ch] text-xs leading-relaxed" style={{ fontFamily: 'var(--mono)', color: T.text3 }}>Source: NASA FIRMS (MODIS C6.1, VIIRS 375 m) via the Anchor pipeline · audit/br-amazon.json · <span style={{ color: '#FFD23F' }}>MOCK numbers</span></p>
          </div>
          <div className="lg:pt-2">
            <CirculariumRing
              data={ring.data} rowLabels={ring.rowLabels} cellTip={ring.cellTip} sectors={48} topHour={12} maxValue={1.3} palette="ember"
              title="FIG. 1 · Where each satellite looked" subtitle="Rings 2019 (inner) → 2025 (outer) · half-hour sectors, noon at the top"
              hint="Height: detections vs. VIIRS at that look time" legendLabels={['fewer', 'more']} defaultView="3d" className="backdrop-blur-sm"
            />
          </div>
        </div>
        <p className="relative px-5 pb-4 text-right text-[11px] lg:px-6" style={{ fontFamily: 'var(--mono)', color: 'rgba(244,239,234,0.62)' }}>FIG. 0 · NOAA-20 VIIRS true colour with thermal anomalies, Rondônia, 23 Aug 2024 · NASA Worldview / GIBS · false-colour shader by Anchor</p>
      </section>

      <section className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-5 py-14 lg:grid-cols-2 lg:px-12" id="a-cal">
        <div className="rounded-2xl border p-5" style={{ borderColor: T.line, background: T.surface }}>
          <p className="text-[13px] font-semibold" style={{ fontFamily: 'var(--mono)', color: T.ember }}>3.0</p>
          <h2 className="mt-1 text-2xl font-medium">Audit, year by year</h2>
          <p className="mb-4 mt-2 text-[15px]" style={{ color: T.text2 }}>Aqua's late clock moved the count further each year. Bars: clock effect; whiskers: error range; ◇ fire-size-adjusted.</p>
          <LeaderboardBars rows={rows} rowLabel="year" barLabel="clock effect on the Aqua-based count" columns={['Aqua-based', 'Fixed clock']} min={-10} max={35} ticks={[-10, 0, 10, 20, 30]} band={[-noiseFloor, noiseFloor]} bandLabel={`band: ±${noiseFloor}% noise`} />
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: T.line, background: T.surface }}>
          <p className="text-[13px] font-semibold" style={{ fontFamily: 'var(--mono)', color: T.ember }}>4.0</p>
          <h2 className="mt-1 text-2xl font-medium">Calendar vs. median</h2>
          <p className="mb-4 mt-2 text-[15px]" style={{ color: T.text2 }}>Each month on the fixed clock, against the median of that month. Hatched: provisional. Dot: S-NPP outage.</p>
          <FireCalendar years={cal.years} cells={cal.cells} mode="anomaly" maxCount={cal.maxCount} title="Fixed-clock hotspots, anomaly vs. median" hint="hover a month · year column = total" cellHeight={24} />
        </div>
      </section>
    </div>
  )
}
