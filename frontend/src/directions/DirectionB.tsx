// Round 1 · Direction B · Colour of the hour (editorial-premium; grounded in Ciechanowski).
// MOCK data only.
import { useMemo, useState, type CSSProperties } from 'react'
import { CirculariumRing } from '@/components/ui/circularium-ring'
import { LeaderboardBars } from '@/components/ui/leaderboard-bars'
import { FireCalendar } from '@/components/ui/returns-calendar'
import { ThreeClocksWipe } from '@/components/viz/shaders'
import { auditRows, calendarGrid, fmtHM, headline, hm, latest, lookRing, noiseFloor, pct } from '@/lib/data'
import { Arrow, Chevron, MockBadge } from './shared'

const T = {
  paper: '#F4EFE6', paper2: '#EAE3D6', ink: '#1B1916', ink2: '#48433C', ink3: '#6B645B', rule: '#D6CDBE',
  night: '#0E1526', nightText: '#E9E4DA', nightText2: '#A9B0C2',
  terra: '#3B6FB6', viirs: '#8A6400', aqua: '#C2410C', skyTerra: '#8DB8E8', skyViirs: '#F2C14E', skyAqua: '#F08A3C',
}
const vars = {
  '--mono': '"IBM Plex Mono", ui-monospace, monospace',
  '--vz-ink': T.ink, '--vz-grid': '#E2DACB', '--vz-track': '#EDE6DA', '--vz-muted': T.ink3, '--vz-text3': T.ink3,
  '--vz-band': '#E6DCCB', '--vz-zero': T.ink2, '--vz-bad': T.aqua, '--vz-mark-fill': T.paper, '--vz-mono': '"IBM Plex Mono", monospace',
  '--cal-up': '#C2410C', '--cal-down': '#2F6DB5', '--cal-fg': T.ink, '--cal-surface': '#FBF8F2', '--cal-line': 'rgba(27,25,22,0.18)',
} as CSSProperties
const nightVars = {
  '--ring-card': T.night, '--ring-fg': T.nightText, '--ring-muted': T.nightText2, '--ring-border': 'rgba(233,228,218,0.16)',
  '--ring-well': 'rgba(255,255,255,0.05)', '--ring-thumb': '#25304F', '--ring-tip-bg': T.nightText, '--ring-tip-fg': T.night, '--ring-stage': 'rgba(0,0,0,0.18)',
} as CSSProperties

const SRCS = ['img/amazon-terra-2026-09-04.jpg', 'img/amazon-viirs-2026-09-04.jpg', 'img/amazon-aqua-2026-09-04.jpg']
const TINTS: [number, number, number][] = [[0.55, 0.72, 0.91], [0.95, 0.76, 0.31], [0.94, 0.54, 0.24]]

export default function DirectionB() {
  const ring = useMemo(() => lookRing(2019, 2025), [])
  const cal = useMemo(() => calendarGrid(2016, 2026), [])
  const rows = useMemo(() => auditRows({ clock: T.aqua, noise: '#B9AE9C' }), [])
  const stops = useMemo(() => [hm(latest.terra_lst), hm(latest.viirs_lst), hm(latest.aqua_lst)], [])
  const [time, setTime] = useState(stops[1] + (stops[2] - stops[1]) * 0.55)
  const mark = (txt: string, c: string) => <span className="whitespace-nowrap px-[0.12em]" style={{ background: `linear-gradient(transparent 62%, ${c} 62%)` }}>{txt}</span>

  return (
    <div className="min-h-screen" style={{ ...vars, background: T.paper, color: T.ink, fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-8 border-b px-5 lg:px-10" style={{ background: T.paper, borderColor: T.rule }}>
        <div className="flex items-center gap-2.5 text-2xl font-semibold" style={{ fontFamily: '"Newsreader", Georgia, serif' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M4 20a10 10 0 0 1 20 0" fill="none" stroke={T.ink} strokeWidth="1.6" /><path d="M14 20V6" stroke={T.ink} strokeWidth="2" /><path d="M10.5 9.5h7" stroke={T.ink} strokeWidth="1.6" /><path d="M14 20 21.5 16" stroke={T.aqua} strokeWidth="2" strokeLinecap="round" /><circle cx="14" cy="20" r="1.8" fill={T.ink} /></svg>
          Anchor
        </div>
        <nav aria-label="Sections" className="hidden gap-5 whitespace-nowrap text-sm lg:flex" style={{ color: T.ink3 }}>
          {['Verdict', 'The clock moved', 'Two clocks', 'Audit', 'Calendar', 'How we know', 'What satellites miss', 'Limits'].map((s, i) => (
            <a key={s} href="#" aria-current={i === 0 ? 'true' : undefined} style={i === 0 ? { color: T.ink, textDecoration: 'underline', textDecorationColor: T.aqua, textUnderlineOffset: 6, textDecorationThickness: 2 } : undefined}>{s}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <MockBadge />
          <button type="button" className="inline-flex h-[38px] items-center gap-2 rounded-full border px-3.5 text-sm font-medium" style={{ borderColor: T.rule, background: '#FBF8F2' }}>Amazon (Brazil) <Chevron /></button>
        </div>
      </header>

      <article className="mx-auto max-w-[920px] px-5 pb-14 pt-12 lg:px-10 lg:pt-[72px]" aria-labelledby="b-h">
        <p className="text-sm font-medium" style={{ color: T.ink3 }}><b style={{ color: T.aqua, fontFamily: 'var(--mono)' }}>0.0</b>&nbsp; Verdict · Amazon (Brazil)</p>
        <h1 id="b-h" className="mt-4 text-[40px] font-medium leading-[1.04] tracking-[-0.02em] lg:text-[64px]" style={{ fontFamily: '"Newsreader", Georgia, serif', textWrap: 'balance' }}>
          Brazil's fire count is read off a satellite that now looks at {mark(latest.aqua_lst, 'rgba(240,138,60,0.45)')}, not {mark(latest.viirs_lst, 'rgba(242,193,78,0.55)')}.
        </h1>
        <p className="mt-6 max-w-[40em] text-lg leading-relaxed lg:text-[21px]" style={{ fontFamily: '"Newsreader", Georgia, serif', color: T.ink2 }}>
          Fires burn harder in the afternoon, so a later look counts more of them. Held to a fixed clock, the Amazon's {headline.from}→{headline.to} change is a fall of {Math.abs(headline.fixed).toFixed(1)}%, a little steeper than the official {Math.abs(headline.official).toFixed(1)}%.
        </p>
        <div role="group" aria-label="Headline check" className="mt-9 grid grid-cols-1 border-b border-t-2 sm:grid-cols-3" style={{ borderTopColor: T.ink, borderBottomColor: T.rule }}>
          {[
            ['Official change, Aqua-based', pct(headline.official), T.ink, `${headline.from} → ${headline.to}`],
            ['On a fixed clock', pct(headline.fixed), T.viirs, `${headline.from} → ${headline.to}`],
            [`Clock effect in ${headline.to}`, pct(headline.gap), T.aqua, `range ${pct(headline.gapLo)} to ${pct(headline.gapHi)}`],
          ].map(([k, v, c, r], i) => (
            <div key={k} className="py-4" style={{ paddingLeft: i ? 24 : 0, borderLeft: i ? `1px solid ${T.rule}` : undefined }}>
              <div className="text-[13px] font-medium" style={{ color: T.ink3 }}>{k}</div>
              <div className="mt-1.5 text-[44px] font-medium leading-none tracking-[-0.02em]" style={{ fontFamily: '"Newsreader", Georgia, serif', color: c, fontFeatureSettings: '"lnum" 1, "tnum" 1' }}>{v}</div>
              <div className="mt-1.5 text-[13px]" style={{ fontFamily: 'var(--mono)', color: T.ink3 }}>{r}</div>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <LeaderboardBars rows={rows} rowLabel="year" barLabel="clock effect by year, with error range" columns={['Aqua-based', 'Fixed clock', 'Range']} min={-10} max={35} ticks={[-10, 0, 10, 20, 30]} band={[-noiseFloor, noiseFloor]} bandLabel={`shaded: ±${noiseFloor}% noise`} />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3.5">
          <a href="#b-cal" className="inline-flex h-12 items-center gap-2.5 rounded-full px-[22px] text-[15px] font-semibold" style={{ background: T.ink, color: T.paper }}>Explore the calendar <Arrow /></a>
          <a href="#" className="inline-flex h-12 items-center rounded-full border px-[22px] text-[15px] font-semibold" style={{ borderColor: T.ink }}>Download summary</a>
        </div>
        <p className="mt-5 text-[12.5px]" style={{ fontFamily: 'var(--mono)', color: T.ink3 }}>Source: NASA FIRMS (MODIS C6.1, VIIRS 375 m) via the Anchor pipeline · audit/br-amazon.json · MOCK numbers</p>
      </article>

      <section style={{ ...nightVars, background: T.night, color: T.nightText }} aria-labelledby="b-band">
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-10 px-5 py-14 lg:grid-cols-[440px_minmax(0,1fr)] lg:px-10">
          <div>
            <h2 id="b-band" className="text-[30px] font-medium leading-tight" style={{ fontFamily: '"Newsreader", Georgia, serif' }}>Same place, same day, three clocks</h2>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: T.nightText2 }}>Drag the look time. Morning, early-afternoon and late-afternoon passes over Rondônia on 4 September 2026 see different light, different clouds and different fires.</p>
            <div className="mt-6">
              <CirculariumRing
                data={ring.data} rowLabels={ring.rowLabels} cellTip={ring.cellTip} sectors={48} topHour={12} maxValue={1.3}
                palette={{ light: ['#2A3A6E', '#8DB8E8', '#F2C14E', '#F08A3C'], dark: ['#2A3A6E', '#8DB8E8', '#F2C14E', '#F08A3C'] }}
                title="Look times, 2019–2025" subtitle="Inner ring 2019 → outer 2025 · noon at the top" hint="Colour: detections vs. VIIRS" legendLabels={['fewer', 'more']} defaultView="2d"
              />
            </div>
          </div>
          <div>
            <div className="relative aspect-[1.3/1] overflow-hidden rounded-[10px] bg-black">
              <ThreeClocksWipe srcs={SRCS} stops={stops} time={time} tints={TINTS} className="absolute inset-0 h-full w-full" alt={`Rondônia on 4 September 2026 as seen near ${fmtHM(time)}`} />
              <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-2">
                {[['Terra · morning', T.skyTerra], ['VIIRS · early afternoon', T.skyViirs], ['Aqua · late afternoon', T.skyAqua]].map(([t, c]) => (
                  <span key={t} className="rounded-full px-2.5 py-1 text-xs text-white" style={{ fontFamily: 'var(--mono)', background: 'rgba(14,21,38,0.78)' }}><i className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: c }} />{t}</span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs" style={{ fontFamily: 'var(--mono)', color: T.nightText2 }}><span>08:00</span><span>look time {fmtHM(time)}</span><span>16:00</span></div>
              <div aria-hidden className="mt-1 h-2 rounded" style={{ background: 'linear-gradient(90deg, #8DB8E8 0%, #CFE3F2 30%, #F2C14E 62%, #F08A3C 82%, #B5577A 100%)' }} />
              <input type="range" min={8} max={16} step={1 / 30} value={time} onChange={(e) => setTime(+e.target.value)} aria-label="Look time" className="mt-1 w-full" style={{ accentColor: T.skyAqua, height: 30 }} />
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed" style={{ fontFamily: 'var(--mono)', color: T.nightText2 }}>FIG. 1 · MODIS Terra, NOAA-20 VIIRS and MODIS Aqua true colour with thermal anomalies, 4 Sep 2026 · NASA Worldview / GIBS · transition shader by Anchor</p>
          </div>
        </div>
      </section>

      <section id="b-cal" className="mx-auto max-w-[920px] px-5 py-16 lg:px-10">
        <p className="text-[13px] font-semibold" style={{ fontFamily: 'var(--mono)', color: T.aqua }}>4.0</p>
        <h2 className="mt-2 text-[30px] font-medium leading-tight lg:text-[40px]" style={{ fontFamily: '"Newsreader", Georgia, serif' }}>Every month, on the same clock</h2>
        <p className="mt-3 text-lg leading-relaxed" style={{ fontFamily: '"Newsreader", Georgia, serif', color: T.ink2 }}>Warm months burned more than the median for that month; cool months less. Hatched months are provisional; the dot marks the S-NPP outage.</p>
        <div className="mt-6">
          <FireCalendar years={cal.years} cells={cal.cells} mode="anomaly" maxCount={cal.maxCount} title="Fixed-clock hotspots, anomaly vs. median" hint="hover a month · year column = total" cellHeight={26} />
        </div>
      </section>
    </div>
  )
}
