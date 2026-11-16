// Round 1 · Direction D · Systems (Anduril-inspired: cinematic full-bleed, mosaic of system tiles
// with quiet labels, muted grey/olive/cream bands, product rows).
// MOCK data only.
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Globe } from '@/components/ui/cobe-globe'
import { FlipDiskMatrix } from '@/components/ui/flip-disk-matrix'
import { CirculariumRing } from '@/components/ui/circularium-ring'
import { LeaderboardBars } from '@/components/ui/leaderboard-bars'
import { FireCalendar } from '@/components/ui/returns-calendar'
import { ThermalField, ThreeClocksWipe } from '@/components/viz/shaders'
import { auditRows, calendarGrid, checks, headline, hm, latest, lookRing, noiseFloor, regions } from '@/lib/data'

const T = { black: '#000000', ink: '#0C0D0C', grey: '#8C908A', olive: '#4C5242', cream: '#F2EFE7', text: '#F5F5F2', text2: '#B7BAB3', line: 'rgba(255,255,255,0.14)', ember: '#FF6A1A', ice: '#A9D6E8' }
const vars = {
  '--mono': '"Geist Mono", ui-monospace, monospace',
  '--disk-on': T.ember, '--disk-off': '#151615', '--disk-bezel': '#0B0B0B', '--disk-screen': '#030303',
  '--ring-card': '#0E0F0E', '--ring-fg': T.text, '--ring-muted': T.text2, '--ring-border': 'transparent', '--ring-well': 'rgba(255,255,255,0.06)', '--ring-thumb': '#2A2B29', '--ring-tip-bg': T.text, '--ring-tip-fg': T.black, '--ring-stage': 'transparent',
  '--vz-ink': T.text, '--vz-grid': 'rgba(255,255,255,0.08)', '--vz-track': 'rgba(255,255,255,0.05)', '--vz-muted': T.text2, '--vz-text3': T.text2, '--vz-band': 'rgba(169,214,232,0.12)', '--vz-zero': 'rgba(255,255,255,0.4)', '--vz-bad': '#FFB68A', '--vz-mark-fill': T.ink, '--vz-mono': '"Geist Mono", monospace',
  '--cal-up': '#E8642A', '--cal-down': '#5B9BC4', '--cal-fg': T.text, '--cal-surface': '#151615', '--cal-line': 'rgba(255,255,255,0.16)',
  '--globe-label-font': '"Geist Mono", monospace',
} as CSSProperties

const SRCS = ['img/amazon-terra-2026-09-04.jpg', 'img/amazon-viirs-2026-09-04.jpg', 'img/amazon-aqua-2026-09-04.jpg']
const TINTS: [number, number, number][] = [[0.6, 0.75, 0.9], [0.95, 0.8, 0.5], [1, 0.55, 0.25]]
const centre = (b: number[]): [number, number] => [(b[1] + b[3]) / 2, (b[0] + b[2]) / 2]

function Tile({ label, sub, className = '', children }: { label: string; sub?: string; className?: string; children: ReactNode }) {
  return (
    <figure className={`group relative m-0 overflow-hidden ${className}`} style={{ background: '#0E0F0E' }}>
      {children}
      <figcaption className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-between p-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.55))' }}>
        <span className="text-[17px] font-medium">{label}</span>
        {sub ? <span className="text-[11px]" style={{ fontFamily: 'var(--mono)', color: T.text2 }}>{sub}</span> : null}
      </figcaption>
    </figure>
  )
}

export default function DirectionD() {
  const stops = useMemo(() => [hm(latest.terra_lst), hm(latest.viirs_lst), hm(latest.aqua_lst)], [])
  const [time, setTime] = useState(stops[1] + 0.35)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0; const t0 = performance.now()
    const tick = (now: number) => { const p = ((now - t0) / 14000) % 1; const k = p < 0.5 ? p * 2 : 2 - p * 2; setTime(stops[0] + (stops[2] - stops[0]) * (0.55 + 0.45 * k)); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stops])
  const ring = useMemo(() => lookRing(2019, 2025), [])
  const cal = useMemo(() => calendarGrid(2018, 2026), [])
  const rows = useMemo(() => auditRows({ clock: T.ember, noise: '#5D615B' }), [])
  const markers = useMemo(() => regions.map((r) => ({ id: r.id, location: centre(r.bbox), label: r.name })), [])

  return (
    <div className="min-h-screen" style={{ ...vars, background: T.black, color: T.text, fontFamily: '"Hanken Grotesk", system-ui, sans-serif' }}>
      <header className="absolute inset-x-0 top-0 z-20 flex h-14 items-center px-5 text-[13px] md:px-8">
        <span className="flex items-center gap-2 text-[15px] font-bold tracking-[0.12em]">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2v14M4.5 5.5h9M3 11c0 3 2.7 5 6 5s6-2 6-5" fill="none" stroke={T.text} strokeWidth="1.6" /></svg>ANCHOR
        </span>
        <nav aria-label="Regions" className="mx-auto hidden gap-7 md:flex">
          {['Amazon', 'Cerrado', 'Pantanal', 'Argentina', 'Punjab', 'California'].map((r, i) => <a key={r} href="#" aria-current={i === 0 ? 'true' : undefined} style={{ opacity: i === 0 ? 1 : 0.72, borderBottom: i === 0 ? `1px solid ${T.text}` : undefined }}>{r}</a>)}
        </nav>
        <span className="ml-auto flex items-center gap-5 md:ml-0"><a href="#d-notes">Method</a><a href="#">Data ↗</a><span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: '#FFD23F', color: '#111', fontFamily: 'var(--mono)' }}>MOCK</span></span>
      </header>

      <section className="relative h-[100svh] min-h-[720px] overflow-hidden" aria-labelledby="d-h">
        <ThreeClocksWipe srcs={SRCS} stops={stops} time={time} tints={TINTS} className="absolute inset-0 h-full w-full" alt="Rondônia on 4 September 2026, seen by Terra, VIIRS and Aqua at their look times" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.7) 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-6 p-5 md:p-8">
          <div className="max-w-[880px]">
            <p className="text-[11px] uppercase tracking-[0.08em]" style={{ fontFamily: 'var(--mono)', color: T.text2 }}>Rondônia · 4 Sep 2026 · Terra → VIIRS → Aqua</p>
            <h1 id="d-h" className="mt-3 text-[44px] font-medium leading-[1.02] tracking-[-0.025em] md:text-[76px]">The 1:30 satellite now looks at {latest.aqua_lst}.</h1>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed" style={{ color: T.text2 }}>On a fixed clock the Amazon's {headline.from}→{headline.to} drop is {Math.abs(headline.fixed).toFixed(1)}%, not the official {Math.abs(headline.official).toFixed(1)}%. Aqua's later look added {headline.gap.toFixed(1)}% to {headline.to}.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px]" style={{ fontFamily: 'var(--mono)', color: T.text2 }}>look time {String(Math.floor(time)).padStart(2, '0')}:{String(Math.round((time % 1) * 60) % 60).padStart(2, '0')}</span>
            <a href="#d-sys" className="inline-flex h-11 items-center gap-2 border px-5 text-[14px] font-medium" style={{ borderColor: T.text }}>Explore <span aria-hidden>↗</span></a>
          </div>
        </div>
      </section>

      <section id="d-sys" className="grid grid-cols-1 gap-2.5 p-2.5 md:grid-cols-3" aria-label="Systems">
        <Tile label="Aqua look time" sub={`${latest.year} · LST`} className="flex aspect-[4/3] items-center justify-center p-10 md:col-span-1">
          <FlipDiskMatrix text={latest.aqua_lst} rows={9} gap={3} className="w-full max-w-[420px]" label={`Aqua look time ${latest.aqua_lst}`} />
        </Tile>
        {[['Terra', latest.terra_lst, SRCS[0]], ['VIIRS', latest.viirs_lst, SRCS[1]]].map(([n, t, s]) => (
          <Tile key={n} label={n} sub={`looks ${t}`} className="aspect-[4/3]"><img src={s} alt={`${n} view of Rondônia, 4 Sep 2026`} className="h-full w-full object-cover" /></Tile>
        ))}
        <Tile label="Six regions" sub="presets" className="aspect-[3/4] md:row-span-2 md:aspect-auto">
          <div className="absolute inset-0 grid place-items-center p-6"><Globe markers={markers} focusLon={-60} theta={0.2} dark={1} baseColor={[0.42, 0.44, 0.41]} glowColor={[0.1, 0.1, 0.1]} markerColor={[1, 0.42, 0.1]} mapBrightness={9} markerSize={0.04} speed={0.002} labelBg="#000" labelFg="#fff" className="w-full max-w-[460px]" /></div>
        </Tile>
        <Tile label="Fires, 23 Aug 2024" sub="VIIRS thermal anomalies" className="aspect-[16/9] md:col-span-2">
          <ThermalField src="img/amazon-viirs-fires-2024-08-23.jpg" className="h-full w-full" stillClassName="h-full w-full object-cover" />
        </Tile>
        <Tile label="Aqua" sub={`looks ${latest.aqua_lst}`} className="aspect-[4/3]"><img src={SRCS[2]} alt="Aqua view of Rondônia, 4 Sep 2026" className="h-full w-full object-cover" /></Tile>
        <Tile label="Two clocks" sub="look times 2019–2025" className="aspect-[4/3] md:col-span-1">
          <div className="absolute inset-0 p-3"><CirculariumRing data={ring.data} rowLabels={ring.rowLabels} cellTip={ring.cellTip} sectors={48} topHour={12} maxValue={1.3} palette="ember" title="" showToggle={false} showLegend={false} defaultView="3d" className="h-full border-0 p-0" /></div>
        </Tile>
      </section>

      <section className="mt-16" style={{ background: T.grey, color: T.black }} aria-label="Products">
        {[
          ['Clock Audit', 'The official count, checked against its own clock', <LeaderboardBars key="lb" rows={rows} rowLabel="year" barLabel="clock effect on the Aqua-based count" columns={['Aqua-based', 'Fixed clock']} min={-10} max={35} ticks={[-10, 0, 10, 20, 30]} band={[-noiseFloor, noiseFloor]} bandLabel={`±${noiseFloor}% noise`} />],
          ['Fixed Clock', 'One 1:30 pm clock, 2002 → now', <FireCalendar key="fc" years={cal.years} cells={cal.cells} mode="anomaly" maxCount={cal.maxCount} title="Anomaly vs. median" hint="hover a month" cellHeight={22} />],
        ].map(([t, s, node], i) => (
          <div key={t as string} className="mx-5 grid grid-cols-1 gap-6 border-t py-10 md:mx-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" style={{ borderColor: 'rgba(0,0,0,0.35)', borderTopWidth: i ? 1 : 0 }}>
            <div className="flex flex-col justify-between gap-6">
              <h2 className="text-[48px] font-medium leading-none tracking-[-0.03em] md:text-[64px]">{t as string}</h2>
              <p className="text-[11px] uppercase tracking-[0.06em]" style={{ fontFamily: 'var(--mono)' }}>{s as string}</p>
            </div>
            <div className="p-5" style={{ background: T.ink, color: T.text }}>{node as ReactNode}</div>
          </div>
        ))}
      </section>

      <section id="d-notes" className="px-5 py-14 md:px-8" style={{ background: T.cream, color: T.black }} aria-labelledby="d-n">
        <div className="flex items-end justify-between border-b pb-3" style={{ borderColor: 'rgba(0,0,0,0.3)' }}><h2 id="d-n" className="text-[32px] font-medium tracking-[-0.02em]">How we know</h2><a href="#" className="text-[12px] underline underline-offset-4">All checks ↗</a></div>
        <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <p className="text-[11px]" style={{ fontFamily: 'var(--mono)' }}>11/14/2026</p>
            <p className="mt-3 text-[30px] font-medium leading-[1.1] tracking-[-0.02em]">Ten predictions, written down before the results came in.</p>
            <ol className="mt-6 divide-y text-[13.5px]" style={{ borderColor: 'rgba(0,0,0,0.15)' }}>
              {checks.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-baseline gap-4 py-2.5" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
                  <span className="w-8 shrink-0" style={{ fontFamily: 'var(--mono)' }}>{c.id}</span>
                  <span className="flex-1">{c.name}</span>
                  <span className="shrink-0 text-[11px] uppercase" style={{ fontFamily: 'var(--mono)', color: c.status === 'pass' ? '#2F6B2F' : c.status === 'fail' ? '#B42318' : '#6B6B66' }}>{c.status}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden"><img src={SRCS[1]} alt="VIIRS view of Rondônia, 4 Sep 2026" className="h-full w-full object-cover" /></div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2" aria-label="Parts">
        {[['How we know', T.olive, 'PT — 01 / 02'], ['What satellites miss', T.grey, 'PT — 02 / 02']].map(([t, bg, pt]) => (
          <div key={t} className="relative h-[360px] p-6 md:p-8" style={{ background: bg, color: bg === T.grey ? T.black : T.text }}>
            <div className="flex items-center justify-between"><span className="text-[22px] font-medium">{t}</span><span className="text-[11px] underline underline-offset-4">Read more ↗</span></div>
            <span className="absolute bottom-6 right-8 text-[56px] font-light tracking-[-0.03em] md:text-[72px]">{pt}</span>
          </div>
        ))}
      </section>
      <footer className="flex flex-wrap items-end justify-between gap-6 px-5 py-10 text-[12px] md:px-8" style={{ color: T.text2 }}>
        <span className="text-[15px] font-bold tracking-[0.12em]" style={{ color: T.text }}>ANCHOR</span>
        <span style={{ fontFamily: 'var(--mono)' }}>Team Propagators · NASA Space Apps 2026 · MOCK data</span>
      </footer>
    </div>
  )
}
