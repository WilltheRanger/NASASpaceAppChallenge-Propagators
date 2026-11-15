/*
 * Round 2 · A · Sundial (assigned direction). MOCK data.
 * THESIS: the clock that matters is the sun's; the drift is a shadow walking into the burning afternoon.
 * OWN-WORLD: daylight page tinted toward slate; one limestone dial with cut hour lines, a bronze gnomon, a soft shadow
 *   and a cinnabar inlay; serif headline and dial numerals, sans everything else; the calendar printed as an almanac.
 * STORY: verdict → the cut line and the shadow apart by the drift → move the year → explore the calendar.
 * FIRST VIEWPORT: left 5/12 headline, subhead, actions; right 7/12 dial, readout, year slider; clock effect by year below.
 * FORM: grounded candidate 6 of 7, seed f8cb74ea, no staging.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ArrowRight, Download } from 'lucide-react'
import { FireCalendar, CalendarLegend, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle, RegionSelect, SectionsMenu, YearSlider } from '@/r2/controls'
import { MONTHS, SECTIONS, calendarFinding, calendarGrid, fmtInt, fmtRange, hm, minutesBetween, pct, regionData, verdictHeadline, verdictLines, type RegionData } from '@/r2/data'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'

const T = {
  page: '#F4F7F9', card: '#FFFFFF', raised: '#E9EDF0', ink: '#151B22', ink2: '#474E56', ink3: '#666D74',
  stone: '#E8E2D9', stoneLit: '#F5EDE1', stoneShade: '#D9CEC1', stoneEdge: '#CDC4B8', stoneBand: '#EEE9E1', cut: '#453B33',
  shadow: '#30445D', bronze: '#6B4F35', bronzeLit: '#A47C55', cinnabar: '#DF502C', cinnabarDeep: '#A93A1D', cinnabarText: '#BB351B',
  ochre: '#C48225',
}
const vars = {
  '--page': T.page, '--card': T.card, '--raised': T.raised, '--ink': T.ink, '--ink2': T.ink2, '--ink3': T.ink3,
  '--hair': 'rgba(21,27,34,0.10)', '--cinnabar': T.cinnabar, '--cinnabar-text': T.cinnabarText, '--stone-band': T.stoneBand,
  '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)',
  '--cal-fg': T.ink, '--cal-muted': T.ink3, '--cal-cell': T.card, '--cal-empty': 'transparent', '--cal-gap': '1px', '--cal-radius': '0px',
  '--cal-focus': T.ink, '--cal-hatch': 'rgba(21,27,34,0.30)', '--cal-mid': '#EFEFEC',
  '--cal-down-1': '#D0E4F8', '--cal-down-2': '#ACCBEA', '--cal-down-3': '#8BB2D9', '--cal-down-4': '#6A97C1', '--cal-down-5': '#4A79A4',
  '--cal-up-1': '#FAE4C7', '--cal-up-2': '#F0CEA1', '--cal-up-3': '#E2B577', '--cal-up-4': '#CF9A4A', '--cal-up-5': '#B57C1A',
  '--cal-seq-1': '#FBECD9', '--cal-seq-2': '#F4DAB6', '--cal-seq-3': '#EAC490', '--cal-seq-4': '#DAAB69', '--cal-seq-5': '#C89344', '--cal-seq-6': '#B17915',
} as CSSProperties

const SERIF = '"Source Serif 4", Georgia, serif'
const SANS = '"Source Sans 3", system-ui, sans-serif'
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--ink)]'
const AUDIT_FROM = 2021, AUDIT_TO = 2025

// Dial geometry: a half-disc from 06:00 (left) through solar noon (top) to 18:00 (right), 15° per hour.
// Screen angle in degrees (SVG, y down): 06:00 = −180°, 12:00 = −90°, 18:00 = 0°.
const screenDeg = (t: number) => -180 + (t - 6) * 15
const toRad = (deg: number) => (deg * Math.PI) / 180
const at = (cx: number, cy: number, r: number, t: number) => [cx + r * Math.cos(toRad(screenDeg(t))), cy + r * Math.sin(toRad(screenDeg(t)))] as const

export default function Sundial() {
  const [regionId, setRegionId] = useState('br-amazon')
  const d = useMemo(() => regionData(regionId), [regionId])
  const [year, setYear] = useState(d.latestOk?.year ?? AUDIT_TO)
  const [mode, setMode] = useState<CalendarMode>('anomaly')
  const changeRegion = (id: string) => { setRegionId(id); setYear(regionData(id).latestOk?.year ?? AUDIT_TO) }

  return (
    <div className="min-h-screen text-[15px] leading-[22px]" style={{ ...vars, background: T.page, color: T.ink, fontFamily: SANS }}>
      <style>{`
        .sd-almanac [role=columnheader] { background: ${T.stoneBand}; padding-top: 6px; color: ${T.ink2}; }
        .sd-almanac [data-cal=year], .sd-almanac [data-cal=total] { font-family: ${SERIF}; font-size: 15px; color: ${T.ink}; }
        @media (prefers-reduced-motion: reduce) { .sd-move { transition: none !important; } }
      `}</style>
      <TopBar regionId={regionId} onRegion={changeRegion} />
      <Hero d={d} year={year} onYear={setYear} />
      <CalendarSection d={d} mode={mode} onMode={setMode} />
      <Footer />
    </div>
  )
}

function Mark() {
  // The gnomon: a triangle standing on its plate.
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M4 16 L10 16 L10 4 Z" fill={T.ink} />
      <path d="M2 17.25 H18" stroke={T.ink} strokeWidth="1.5" />
    </svg>
  )
}

function TopBar({ regionId, onRegion }: { regionId: string; onRegion: (id: string) => void }) {
  return (
    <header className="border-b border-[var(--hair)]">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 md:gap-8 md:px-8">
        <a href="#verdict" className={`flex items-center gap-2 text-[18px] font-medium ${focusRing}`}><Mark />Anchor</a>
        <nav aria-label="Sections" className="hidden items-center gap-6 lg:flex">
          {SECTIONS.filter((s) => s.inComp).map((s) => (
            <a key={s.id} href={`#${s.id}`} aria-current={s.id === 'verdict' ? 'location' : undefined}
              className={`rounded-sm transition-colors duration-150 ease-[var(--ease)] hover:text-[var(--ink)] ${focusRing} ${s.id === 'verdict' ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink3)]'}`}>{s.label}</a>
          ))}
          <span className="text-[12px] text-[var(--ink3)]" title={SECTIONS.filter((s) => !s.inComp).map((s) => s.label).join(', ')}>More sections in the full build</span>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden h-6 items-center whitespace-nowrap rounded-[4px] bg-[var(--raised)] px-2 text-[12px] text-[var(--ink2)] sm:inline-flex">Mock data</span>
          <RegionSelect value={regionId} onChange={onRegion} classes={{
            trigger: `inline-flex h-9 min-w-0 max-w-[176px] items-center gap-2 rounded-[10px] border border-[var(--hair)] bg-[var(--card)] pl-3 pr-2 text-[15px] transition-colors duration-150 ease-[var(--ease)] hover:bg-[var(--raised)] sm:max-w-none ${focusRing} [&>span]:truncate`,
            icon: 'text-[var(--ink3)]',
            content: 'z-50 min-w-[240px] rounded-[12px] border border-[var(--hair)] bg-[var(--card)] p-1 text-[15px] text-[var(--ink)] shadow-[0_8px_24px_rgba(21,27,34,0.10)]',
            item: 'flex h-9 cursor-default select-none items-center gap-2 rounded-[8px] px-3 outline-none data-[highlighted]:bg-[var(--raised)] data-[state=checked]:font-medium',
          }} />
          <div className="lg:hidden">
            <SectionsMenu classes={{
              trigger: `inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--hair)] bg-[var(--card)] text-[var(--ink2)] ${focusRing}`,
              content: 'z-50 min-w-[200px] rounded-[12px] border border-[var(--hair)] bg-[var(--card)] p-1 text-[15px] text-[var(--ink)] shadow-[0_8px_24px_rgba(21,27,34,0.10)]',
              item: 'flex h-9 cursor-default select-none items-center rounded-[8px] px-3 outline-none data-[highlighted]:bg-[var(--raised)] data-[disabled]:text-[var(--ink3)]',
            }} />
          </div>
        </div>
      </div>
      <p className="border-t border-[var(--hair)] bg-[var(--raised)] px-4 py-1 text-[12px] leading-4 text-[var(--ink2)] sm:hidden">Mock data · not for publication</p>
    </header>
  )
}

/** The headline with its one number set in the accent: the number that matters. */
function Headline({ text }: { text: string }) {
  const parts = text.split(/(\d+%)/)
  return <>{parts.map((p, i) => (/^\d+%$/.test(p) ? <span key={i} style={{ color: T.cinnabarText }}>{p}</span> : <span key={i}>{p}</span>))}</>
}

function Hero({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const lines = verdictLines(d)
  const dr = d.driftAt(year)
  const shift = dr ? minutesBetween(dr.aqua_lst, dr.viirs_lst) : 0
  return (
    <section id="verdict" aria-labelledby="verdict-h" className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-4 pb-16 pt-10 md:px-8 lg:grid-cols-12 lg:gap-x-6 lg:pb-12 lg:pt-16">
      <div className="lg:col-span-5 lg:row-start-1 lg:self-center">
        <h1 id="verdict-h" className="max-w-[13em] text-[40px] leading-[1.06] tracking-[-0.02em] lg:text-[60px] lg:leading-[1.04]" style={{ fontFamily: SERIF, fontWeight: 400, textWrap: 'balance' }}>
          <Headline text={verdictHeadline(d)} />
        </h1>
        <p className="mt-6 max-w-[36rem] text-[18px] leading-7 text-[var(--ink2)]">{lines.look} {lines.change}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#calendar" className={`inline-flex h-12 items-center gap-2 rounded-[10px] bg-[var(--ink)] px-5 font-medium text-white transition-colors duration-150 ease-[var(--ease)] hover:bg-[#2A323B] ${focusRing}`}>
            Explore the calendar <ArrowRight size={18} strokeWidth={1.5} aria-hidden />
          </a>
          <button type="button" onClick={() => downloadSummary(d)} className={`inline-flex h-12 items-center rounded-[10px] border border-[var(--hair)] bg-[var(--card)] px-5 font-medium transition-colors duration-150 ease-[var(--ease)] hover:bg-[var(--raised)] ${focusRing}`}>
            Download summary
          </button>
        </div>
        <div className="mt-12 hidden lg:block"><EffectByYear d={d} /></div>
      </div>

      <figure className="lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:pl-8">
        {dr ? <Dial d={d} year={year} onYear={onYear} /> : (
          <div className="grid aspect-[16/9] place-items-center rounded-[16px] bg-[var(--raised)] p-8 text-center text-[var(--ink2)]">Look times for {d.phrase.the} are not in the data yet.</div>
        )}
        {dr ? (
          <div className="mx-auto mt-4 max-w-[600px]">
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <Readout label="Fixed clock" time={dr.viirs_lst} />
              <Readout label="Aqua" time={dr.aqua_lst} accent />
              <p className="pb-1 text-[var(--ink2)]">{shift === 0 ? 'Same minute' : `${Math.abs(shift)} min ${shift > 0 ? 'later' : 'earlier'}`} in {year}</p>
            </div>
            {d.twoAt(year) ? (
              <p className="mt-4 flex items-center gap-2 text-[var(--ink2)]">
                <span aria-hidden className="inline-block h-2.5 w-5" style={{ background: T.ochre }} />
                Ochre band: fires counted at each look vs. the fixed clock, Terra ×{d.twoAt(year)!.T.toFixed(2)} → Aqua ×{d.twoAt(year)!.A.toFixed(2)}
              </p>
            ) : null}
            <YearControl d={d} year={year} onYear={onYear} />
            <figcaption className="mt-4 text-[12px] leading-4 text-[var(--ink3)]">
              Local solar time. The cut line is the fixed clock; the shadow falls where Aqua looked; cinnabar marks the minutes between them.
              {d.twoAt(year) ? ' The band is measured at the three look times (two-clocks test) and joined between them; no fire-day curve is drawn beyond them.' : ''} Drag the shadow or use the slider. Source: drift/{d.id}.json{d.twoAt(year) ? `, twoclocks/${d.id}.json` : ''} · MOCK
            </figcaption>
          </div>
        ) : null}
      </figure>
      <div className="lg:hidden"><EffectByYear d={d} /></div>
    </section>
  )
}

function Readout({ label, time, accent }: { label: string; time: string; accent?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[var(--ink2)]"><ShadowTick t={hm(time)} accent={accent} />{label}</div>
      <div className="mt-1 text-[28px] font-medium leading-8 tabular-nums" style={{ color: accent ? T.cinnabarText : T.ink }}>{time}</div>
    </div>
  )
}

/** The signature: a small dial with its shadow at the hour. Used only next to look times. */
function ShadowTick({ t, accent }: { t: number; accent?: boolean }) {
  const [x, y] = at(10, 15, 7.5, t)
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M1.75 15.5 A8.25 8.25 0 0 1 18.25 15.5 Z" fill={T.stoneLit} stroke={T.ink3} strokeWidth="1" />
      <path d={`M10 15 L${x.toFixed(2)} ${y.toFixed(2)}`} stroke={accent ? T.cinnabar : T.ink} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** The page's one Operate control: an L2-weight slider with the year on the thumb, year ticks and the audit years marked. */
function YearControl({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const first = d.drift[0]?.year ?? 2012
  const last = d.drift[d.drift.length - 1]?.year ?? 2026
  const thumb = 20
  const pos = (y: number) => { const f = (y - first) / Math.max(1, last - first); return `calc(${(f * 100).toFixed(3)}% + ${((0.5 - f) * thumb).toFixed(2)}px)` }
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  return (
    <div className="mt-6">
      <div className="relative h-7" aria-hidden>
        <span className="absolute top-0 -translate-x-1/2 text-[15px] font-medium tabular-nums" style={{ left: pos(year) }}>{year}</span>
      </div>
      <YearSlider value={year} onChange={onYear} min={first} max={last} label="Year shown on the dial"
        valueText={(y) => { const r = d.driftAt(y); return r ? `${y}: fixed clock ${r.viirs_lst}, Aqua ${r.aqua_lst}` : String(y) }}
        classes={{
          root: 'relative flex h-5 w-full touch-none select-none items-center',
          track: 'relative h-1 grow rounded-full bg-[rgba(21,27,34,0.14)]',
          thumb: `block h-5 w-5 rounded-full border border-[rgba(21,27,34,0.25)] bg-[var(--card)] shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-shadow duration-150 ease-[var(--ease)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)] ${focusRing}`,
        }} />
      <div className="relative mt-1 h-10" aria-hidden>
        {years.map((y) => <span key={y} className="absolute top-0 h-1.5 w-px -translate-x-1/2" style={{ left: pos(y), background: y >= AUDIT_FROM && y <= AUDIT_TO ? T.ink : 'rgba(21,27,34,0.30)' }} />)}
        <span className="absolute top-3 h-px" style={{ left: pos(AUDIT_FROM), right: `calc(100% - ${pos(AUDIT_TO)})`, background: T.ink }} />
        <span className="absolute top-5 -translate-x-1/2 whitespace-nowrap text-[12px] text-[var(--ink2)]" style={{ left: `calc((${pos(AUDIT_FROM)} + ${pos(AUDIT_TO)}) / 2)` }}>Audit years</span>
        <span className="absolute left-0 top-5 text-[12px] tabular-nums text-[var(--ink3)]">{first}</span>
        <span className="absolute right-0 top-5 text-[12px] tabular-nums text-[var(--ink3)]">{last}</span>
      </div>
    </div>
  )
}

function EffectByYear({ d }: { d: RegionData }) {
  const lead = d.latestOk?.year
  return (
    <div className="border-t border-[var(--hair)] pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-medium">Clock effect by year</h2>
        <span className="text-[12px] text-[var(--ink3)]">Range in brackets · noise floor ±{d.noise.toFixed(0)}%</span>
      </div>
      <ol className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-5">
        {d.years.map((y) => (
          <li key={y.year} className="flex items-baseline justify-between gap-3 sm:block">
            <span className="text-[12px] tabular-nums text-[var(--ink3)] sm:block">{y.year}</span>
            {y.verdict === 'na' ? (
              <span className="text-right sm:mt-1 sm:block sm:text-left">
                <span className="block text-[18px] leading-6 text-[var(--ink3)]">–</span>
                <span className="block text-[12px] leading-4 text-[var(--ink3)]">Not enough fires</span>
              </span>
            ) : (
              <span className="text-right sm:mt-1 sm:block sm:text-left">
                <span className="block text-[18px] font-medium leading-6 tabular-nums" style={{ color: y.year === lead ? T.cinnabarText : y.verdict === 'clock' ? T.ink : T.ink2 }}>{pct(y.gap!)}</span>
                <span className="block text-[12px] leading-4 tabular-nums text-[var(--ink3)]">({fmtRange(y.lo!, y.hi!)})</span>
                <span className="block text-[12px] leading-4 text-[var(--ink3)]">{y.verdict === 'clock' ? 'Clock effect' : 'Within noise'}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Measures its box so the dial draws in real pixels: type stays 12–15 px at every width. */
function useWidth<E extends HTMLElement>() {
  const ref = useRef<E>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    setW(Math.round(ref.current.getBoundingClientRect().width))
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function Dial({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const [box, w] = useWidth<HTMLDivElement>()
  return <div ref={box} className="w-full" style={{ minHeight: 200 }}>{w > 0 ? <DialSvg d={d} year={year} onYear={onYear} W={Math.min(w, 720)} /> : null}</div>
}

function DialSvg({ d, year, onYear, W }: { d: RegionData; year: number; onYear: (y: number) => void; W: number }) {
  const reduce = useReducedMotion()
  const dr = d.driftAt(year)!
  const two = d.twoAt(year)
  const fixed = hm(dr.viirs_lst), aqua = hm(dr.aqua_lst), terra = hm(dr.terra_lst)
  const compact = W < 520
  const R = Math.round(Math.min(W / 2 - (compact ? 28 : 56), 300))
  const cx = W / 2, cy = R + (compact ? 40 : 64), H = cy + 64
  const hours = Array.from({ length: 13 }, (_, i) => 6 + i)
  const halves = Array.from({ length: 12 }, (_, i) => 6.5 + i)
  const move = reduce ? 'none' : 'transform 450ms var(--ease), stroke-dasharray 450ms var(--ease)'
  const plate = `M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} Z`
  const arc = (r: number) => `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const ringR = R * 0.835, ringW = R * 0.07
  const sweep = Math.max(0, (aqua - fixed) * 15)
  const startDeg = screenDeg(Math.min(fixed, aqua))
  const shadowLen = R * 0.78
  const shiftMin = Math.round((aqua - fixed) * 60)
  const dragging = useRef(false)
  const pickFromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - box.left - cx, y = e.clientY - box.top - cy
    const deg = (Math.atan2(y, x) * 180) / Math.PI // −180..180, noon = −90
    const t = 6 + (Math.max(-180, Math.min(0, deg)) + 180) / 15
    let best = year, bestScore = Infinity
    for (const r of d.drift) {
      const score = Math.abs(hm(r.aqua_lst) - t) * 1000 + Math.abs(r.year - year)
      if (score < bestScore) { bestScore = score; best = r.year }
    }
    if (best !== year) onYear(best)
  }

  // a horizontal label just outside the rim with a short leader from the rim
  const rimLabel = (t: number, text: string, anchor: 'start' | 'end', color: string) => {
    const [x0, y0] = at(cx, cy, R + 3, t), [x1, y1] = at(cx, cy, R + 14, t)
    return (
      <g key={text}>
        <path d={`M${x0} ${y0} L${x1} ${y1}`} stroke={color} strokeWidth="1" />
        <text x={x1 + (anchor === 'start' ? 4 : -4)} y={y1 - 2} textAnchor={anchor} fontSize="12" fill={color} style={{ fontFamily: SANS, fontWeight: 500 }}>{text}</text>
      </g>
    )
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto block cursor-grab touch-none select-none overflow-visible active:cursor-grabbing" role="img"
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pickFromPointer(e) }}
      onPointerMove={(e) => { if (dragging.current) pickFromPointer(e) }}
      onPointerUp={() => { dragging.current = false }} onPointerCancel={() => { dragging.current = false }}
      aria-label={`Sundial for ${d.phrase.the}, ${year}: the fixed clock's line at ${dr.viirs_lst}; Aqua's shadow at ${dr.aqua_lst}, ${Math.abs(shiftMin)} minutes ${shiftMin >= 0 ? 'later' : 'earlier'}.${two ? ` Relative to the fixed clock, Terra counted ${two.T.toFixed(2)} times and Aqua ${two.A.toFixed(2)} times as many fires.` : ''}`}>
      <defs>
        {/* light comes from the lower left, so shadows fall to the upper right */}
        <linearGradient id="sd-light" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={T.stoneLit} />
          <stop offset="0.55" stopColor={T.stone} />
          <stop offset="1" stopColor={T.stoneShade} />
        </linearGradient>
        <filter id="sd-stone" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="4" seed="11" result="n" />
          <feDiffuseLighting in="n" surfaceScale="1.4" diffuseConstant="1" lightingColor="#FFFFFF" result="l">
            <feDistantLight azimuth="135" elevation="50" />
          </feDiffuseLighting>
          <feComponentTransfer in="l" result="lt">
            <feFuncR type="linear" slope="0.3" intercept="0.74" /><feFuncG type="linear" slope="0.3" intercept="0.74" /><feFuncB type="linear" slope="0.3" intercept="0.74" />
          </feComponentTransfer>
          <feComposite in="lt" in2="SourceGraphic" operator="in" result="tex" />
          <feBlend in="SourceGraphic" in2="tex" mode="multiply" />
        </filter>
        <filter id="sd-drop" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#151B22" floodOpacity="0.14" /></filter>
        <filter id="sd-core" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="0.8" /></filter>
        <filter id="sd-pen" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>

      {/* the slab: a limestone half-disc with real thickness */}
      <g filter="url(#sd-drop)">
        <path d={plate} fill="url(#sd-light)" />
        <rect x={cx - R} y={cy} width={2 * R} height={16} fill={T.stoneEdge} />
      </g>
      <path d={plate} fill="url(#sd-light)" filter="url(#sd-stone)" />
      <rect x={cx - R} y={cy} width={2 * R} height={16} fill={T.stoneEdge} filter="url(#sd-stone)" />
      <path d={`M${cx - R} ${cy + 0.5} H${cx + R}`} stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1" />
      <path d={`M${cx - R} ${cy + 15.5} H${cx + R}`} stroke={T.cut} strokeOpacity="0.25" strokeWidth="1" />
      {/* bevel along the rim */}
      <path d={arc(R - 1)} fill="none" stroke={T.cut} strokeOpacity="0.22" strokeWidth="2" />
      <path d={arc(R - 5)} fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1" />

      {/* chapter ring: two cut circles holding the half-hour ticks */}
      {[R * 0.8, R * 0.87].map((r) => (
        <g key={r}>
          <path d={arc(r)} transform="translate(0.8 -0.8)" fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="1" />
          <path d={arc(r)} fill="none" stroke={T.cut} strokeOpacity="0.55" strokeWidth="1.25" />
        </g>
      ))}
      {halves.map((h) => {
        const [x0, y0] = at(cx, cy, R * 0.8, h), [x1, y1] = at(cx, cy, R * 0.835, h)
        return <path key={h} d={`M${x0} ${y0} L${x1} ${y1}`} stroke={T.cut} strokeOpacity="0.5" strokeWidth="1" />
      })}

      {/* the inlay: cinnabar set into the chapter ring between the fixed clock and Aqua */}
      <g style={{ transform: `rotate(${startDeg}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: move }} className="sd-move">
        <circle cx={cx} cy={cy} r={ringR} fill="none" stroke={T.cinnabar} strokeWidth={ringW} pathLength={360} strokeDasharray={`${sweep} 360`} style={{ transition: move }} className="sd-move" />
        <circle cx={cx} cy={cy} r={ringR - ringW / 2 + 0.5} fill="none" stroke={T.cinnabarDeep} strokeWidth="1" pathLength={360} strokeDasharray={`${sweep} 360`} style={{ transition: move }} className="sd-move" />
      </g>

      {/* the burning afternoon, measured: an ochre band inlaid inside the chapter ring whose thickness is the fires counted
          at each look relative to the fixed clock (Terra, fixed clock, Aqua from the two-clocks file), joined for reading */}
      {two ? (() => {
        const pts = [[terra, two.T], [fixed, 1], [aqua, two.A]].sort((a, b) => a[0] - b[0])
        const k = R * 0.075, rOut = R * 0.795
        const steps = 48, tA = pts[0][0], tB = pts[pts.length - 1][0]
        const ratioAt = (t: number) => { for (let i = 0; i < pts.length - 1; i++) { const [t0, r0] = pts[i], [t1, r1] = pts[i + 1]; if (t <= t1) return r0 + ((r1 - r0) * (t - t0)) / Math.max(1e-6, t1 - t0) } return pts[pts.length - 1][1] }
        const outer = Array.from({ length: steps + 1 }, (_, i) => { const t = tA + ((tB - tA) * i) / steps; return at(cx, cy, rOut, t) })
        const inner = Array.from({ length: steps + 1 }, (_, i) => { const t = tB - ((tB - tA) * i) / steps; return at(cx, cy, rOut - k * ratioAt(t), t) })
        const dPath = `M${outer.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} L${inner.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`
        return (
          <g>
            <path d={dPath} fill={T.ochre} fillOpacity="0.85" />
            <path d={dPath} fill="none" stroke="#7A4E12" strokeOpacity="0.45" strokeWidth="1" />
            {!compact ? ([[terra, two.T, -0.4], [aqua, two.A, 0.4]] as const).map(([t, r, dt]) => {
              const [x, y] = at(cx, cy, rOut - k * r - 14, t + dt)
              return <text key={t} x={x} y={y + 4} textAnchor="middle" fontSize="12" fill={T.cut} style={{ fontFamily: SANS, fontVariantNumeric: 'tabular-nums' }}>×{r.toFixed(2)}</text>
            }) : null}
          </g>
        )
      })() : null}

      {/* hour lines cut into the stone: a dark wall and a lit wall */}
      {hours.map((h) => {
        const [x0, y0] = at(cx, cy, R * 0.16, h), [x1, y1] = at(cx, cy, R * 0.8, h)
        return (
          <g key={h}>
            <path d={`M${x0 + 0.9} ${y0 - 0.9} L${x1 + 0.9} ${y1 - 0.9}`} stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1" />
            <path d={`M${x0} ${y0} L${x1} ${y1}`} stroke={T.cut} strokeOpacity="0.62" strokeWidth={h === 12 ? 2.2 : 1.6} />
          </g>
        )
      })}
      {hours.filter((h) => !compact || h % 2 === 0).map((h) => {
        const [x, y] = at(cx, cy, R * 0.935, h)
        const yy = h === 6 || h === 18 ? y - 10 : y + 5
        return (
          <g key={h} style={{ fontFamily: SERIF }}>
            <text x={x + 0.8} y={yy - 0.8} textAnchor="middle" fontSize={compact ? 12 : 15} fill="#FFFFFF" fillOpacity="0.8">{h}</text>
            <text x={x} y={yy} textAnchor="middle" fontSize={compact ? 12 : 15} fill={T.cut}>{h}</text>
          </g>
        )
      })}

      {/* Terra, the opposite clock: a faint cut in the morning */}
      {(() => { const [x0, y0] = at(cx, cy, R * 0.42, terra), [x1, y1] = at(cx, cy, R * 0.78, terra); return <path d={`M${x0} ${y0} L${x1} ${y1}`} stroke={T.ink3} strokeOpacity="0.8" strokeWidth="1.25" /> })()}

      {/* the fixed clock: a deep cut that never moves */}
      {(() => {
        const [x0, y0] = at(cx, cy, R * 0.16, fixed), [x1, y1] = at(cx, cy, R * 0.8, fixed)
        return (
          <g>
            <path d={`M${x0 + 1} ${y0 - 1} L${x1 + 1} ${y1 - 1}`} stroke="#FFFFFF" strokeOpacity="0.9" strokeWidth="1.5" />
            <path d={`M${x0} ${y0} L${x1} ${y1}`} stroke={T.ink} strokeWidth="2.6" strokeLinecap="round" />
          </g>
        )
      })()}

      {/* Aqua's shadow, cast from the gnomon's foot; it walks when the year changes */}
      <g style={{ transform: `rotate(${(aqua - 12) * 15}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: move }} className="sd-move">
        <path d={`M${cx - 9} ${cy} L${cx - 3} ${cy - shadowLen} L${cx + 3} ${cy - shadowLen} L${cx + 9} ${cy} Z`} fill={T.shadow} fillOpacity="0.18" filter="url(#sd-pen)" />
        <path d={`M${cx - 5} ${cy} L${cx - 0.9} ${cy - shadowLen} L${cx + 0.9} ${cy - shadowLen} L${cx + 5} ${cy} Z`} fill={T.shadow} fillOpacity="0.74" filter="url(#sd-core)" />
      </g>

      {/* the gnomon: a bronze blade standing on the noon line */}
      <path d={`M${cx - 7} ${cy} L${cx} ${cy - R * 0.2} L${cx + 7} ${cy} Z`} fill={T.bronze} />
      <path d={`M${cx - 7} ${cy} L${cx} ${cy - R * 0.2}`} stroke={T.bronzeLit} strokeWidth="1.5" />
      <rect x={cx - 12} y={cy - 2} width={24} height={4} fill={T.bronze} />

      {/* names at the rim, horizontal, with short leaders */}
      {rimLabel(terra, 'Terra', 'end', T.ink2)}
      {rimLabel(Math.min(fixed, aqua), fixed <= aqua ? 'Fixed clock' : 'Aqua', 'end', fixed <= aqua ? T.ink : T.cinnabarText)}
      {rimLabel(Math.max(fixed, aqua), fixed <= aqua ? 'Aqua' : 'Fixed clock', 'start', fixed <= aqua ? T.cinnabarText : T.ink)}
    </svg>
  )
}

function CalendarSection({ d, mode, onMode }: { d: RegionData; mode: CalendarMode; onMode: (m: CalendarMode) => void }) {
  const grid = useMemo(() => calendarGrid(d), [d])
  const finding = calendarFinding(d, AUDIT_FROM, AUDIT_TO)
  const [pick, setPick] = useState<{ year: number; month: number } | null>(null)
  const fallback = useMemo(() => { if (!finding) return null; const [mo, yr] = finding.label.split(' '); return { year: Number(yr), month: MONTHS.indexOf(mo) } }, [finding])
  const detail = pick ?? fallback
  return (
    <section id="calendar" aria-labelledby="calendar-h" className="mx-auto max-w-[1440px] px-4 pb-24 pt-8 md:px-8">
      <div className="border-t border-[var(--hair)] pt-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 id="calendar-h" className="text-[28px] leading-[1.15] tracking-[-0.01em]" style={{ fontFamily: SERIF, fontWeight: 400, textWrap: 'balance' }}>
              {finding ? `Of the audit years ${AUDIT_FROM}–${AUDIT_TO}, ${finding.label} sat furthest above its median, ${pct(finding.anomaly, 0)}` : `Every audit-year month sits near its median`}
            </h2>
            <p className="mt-3 max-w-[40rem] text-[var(--ink2)]">
              Each cell is a month on the fixed clock against that calendar month's 2002–2025 median: ochre above, slate below.
              {finding ? ` ${finding.label}: ${fmtInt(finding.fixed)} hotspots against a median of ${fmtInt(finding.median)}.` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 lg:col-span-5 lg:justify-end">
            <ModeToggle value={mode} onChange={onMode} classes={{
              root: 'inline-flex rounded-[10px] bg-[var(--raised)] p-1',
              item: `h-8 rounded-[8px] px-3 text-[15px] text-[var(--ink2)] transition-colors duration-150 ease-[var(--ease)] hover:text-[var(--ink)] data-[state=on]:bg-[var(--card)] data-[state=on]:text-[var(--ink)] data-[state=on]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] ${focusRing}`,
            }} />
            <button type="button" onClick={() => downloadCalendarCsv(d)} className={`inline-flex h-9 items-center gap-2 rounded-[8px] px-3 text-[var(--ink2)] transition-colors duration-150 ease-[var(--ease)] hover:bg-[var(--raised)] hover:text-[var(--ink)] ${focusRing}`}>
              <Download size={16} strokeWidth={1.5} aria-hidden />CSV
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="sd-almanac lg:col-span-8">
            <div className="flex items-baseline justify-between gap-4 border-t-[1.5px] border-[var(--ink)] pb-2 pt-3 text-[12px] text-[var(--ink3)]">
              <span>Almanac of fires on the fixed clock · {d.name}</span><span className="tabular-nums">2002–2026 · 25 years</span>
            </div>
            <div className="hidden sm:block"><FireCalendar years={grid.years} cells={grid.cells} maxCount={grid.maxCount} mode={mode} cellHeight={24} onShow={(c) => c && setPick(c)} label={`Monthly fixed-clock hotspots for ${d.phrase.the}, 2002 to 2026`} /></div>
            <div className="sm:hidden"><FireCalendar years={grid.years} cells={grid.cells} maxCount={grid.maxCount} mode={mode} cellHeight={20} monthLabels="initial" onShow={(c) => c && setPick(c)} label={`Monthly fixed-clock hotspots for ${d.phrase.the}, 2002 to 2026`} /></div>
            <div className="mt-4 border-t border-[var(--ink)] pt-4"><CalendarLegend mode={mode} /></div>
            <p className="mt-3 text-[12px] leading-4 text-[var(--ink3)]">Source: calendar/{d.id}.json · fixed-clock hotspots, VIIRS 375 m in Aqua-equivalent units · MOCK</p>
          </div>
          {detail ? <MonthDetail d={d} year={detail.year} month={detail.month} /> : null}
        </div>
      </div>
    </section>
  )
}

/** S4a month detail: one month across every year, against that month's median, set as an almanac entry. */
function MonthDetail({ d, year, month }: { d: RegionData; year: number; month: number }) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`
  const rec = d.cal.find((c) => c.ym === key)
  const series = d.cal.filter((c) => Number(c.ym.slice(5, 7)) === month + 1)
  const max = Math.max(1, ...series.map((c) => c.fixed ?? 0), ...series.map((c) => c.median_ref ?? 0))
  const W = 320, H = 96, bw = W / Math.max(1, series.length)
  const median = rec?.median_ref ?? series.find((c) => c.median_ref != null)?.median_ref ?? null
  return (
    <aside aria-live="polite" className="border-t-[1.5px] border-[var(--ink)] lg:col-span-4 lg:self-start">
      <div className="bg-[var(--stone-band)] px-4 py-3"><h3 className="text-[28px] leading-8" style={{ fontFamily: SERIF, fontWeight: 400 }}>{MONTHS[month]} {year}</h3></div>
      <div className="px-4 pb-4">
        {rec && rec.fixed != null ? (
          <>
            <p className="mt-4 text-[18px] font-medium leading-6 tabular-nums">{fmtInt(rec.fixed)} hotspots</p>
            {rec.lo != null && rec.hi != null ? <p className="mt-1 text-[12px] leading-4 tabular-nums text-[var(--ink3)]">Range {fmtInt(rec.lo)}–{fmtInt(rec.hi)}</p> : null}
            {rec.anomaly_pct != null && median != null ? (
              <p className="mt-4 text-[var(--ink2)]"><span className="font-medium text-[var(--ink)]">{pct(rec.anomaly_pct, 0)}</span> vs. the {MONTHS[month]} median of {fmtInt(median)}</p>
            ) : null}
            {rec.flags.length ? <p className="mt-2 text-[12px] leading-4 text-[var(--ink3)]">{rec.flags.map((f) => f[0].toUpperCase() + f.slice(1)).join(', ')}</p> : null}
          </>
        ) : <p className="mt-4 text-[var(--ink2)]">No data for this month.</p>}
        <div className="mt-6 border-t border-[var(--hair)] pt-4">
          <p className="text-[12px] leading-4 text-[var(--ink3)]">Every {MONTHS[month]}, 2002–2026; the line is the median</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 block h-auto w-full" role="img" aria-label={`Fixed-clock hotspots for every ${MONTHS[month]} from 2002 to 2026; ${year} highlighted.`}>
            {series.map((c, i) => {
              const v = c.fixed ?? 0, h = (v / max) * (H - 4)
              return c.fixed == null ? null : <rect key={c.ym} x={i * bw + 1} y={H - h} width={Math.max(1, bw - 2)} height={h} fill={c.ym === key ? T.ochre : '#C9D0D6'} />
            })}
            {median != null ? <line x1={0} x2={W} y1={H - (median / max) * (H - 4)} y2={H - (median / max) * (H - 4)} stroke={T.ink} strokeWidth={1} /> : null}
          </svg>
          <div className="mt-2 flex justify-between text-[12px] leading-4 tabular-nums text-[var(--ink3)]"><span>2002</span><span>2026</span></div>
        </div>
        {rec ? (
          <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-[var(--hair)] pt-4 text-[12px] leading-4">
            {([['Aqua', rec.aqua], ['S-NPP', rec.snpp], ['NOAA-20', rec.noaa20]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-[var(--ink3)]">{k}</dt><dd className="mt-1 tabular-nums">{v == null ? '–' : fmtInt(v)}</dd></div>
            ))}
          </dl>
        ) : null}
      </div>
    </aside>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[var(--hair)]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-12 text-[12px] leading-4 text-[var(--ink3)] md:flex-row md:justify-between md:px-8">
        <span>Anchor · Team Propagators</span>
        <span>Every number comes from the team's JSON files; this comp uses mock data.</span>
      </div>
    </footer>
  )
}
