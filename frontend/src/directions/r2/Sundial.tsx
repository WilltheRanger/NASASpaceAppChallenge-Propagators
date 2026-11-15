/*
 * Round 2 · A · Sundial (assigned direction). MOCK data.
 * THESIS: the clock that matters is the sun's; the drift is a shadow walking into the burning afternoon.
 * OWN-WORLD: daylight page tinted toward slate; one limestone dial with cut hour lines, soft shadows, a cinnabar inlay.
 * STORY: verdict → two shadows apart by the drift → move the year → explore the calendar.
 * FIRST VIEWPORT: left 5/12 headline, subhead, clock effect by year, actions; right 7/12 dial, readout, year slider.
 * FORM: grounded candidate 6 of 7, seed f8cb74ea, no staging.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, Download } from 'lucide-react'
import { FireCalendar, CalendarLegend, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle, RegionSelect, YearSlider } from '@/r2/controls'
import { MONTHS, calendarFinding, calendarGrid, fmtInt, hm, minutesBetween, pct, regionData, verdictHeadline, verdictLines, type RegionData } from '@/r2/data'

const T = {
  page: '#F4F7F9', card: '#FFFFFF', raised: '#E9EDF0', ink: '#151B22', ink2: '#474E56', ink3: '#666D74',
  stone: '#E8E2D9', stoneLit: '#F5EDE1', stoneShade: '#DDD2C6', stoneEdge: '#D1C9BF', cut: '#453B33', shadow: '#30445D', cinnabar: '#DF502C', cinnabarText: '#BB351B',
}
const vars = {
  '--page': T.page, '--card': T.card, '--raised': T.raised, '--ink': T.ink, '--ink2': T.ink2, '--ink3': T.ink3,
  '--hair': 'rgba(21,27,34,0.10)', '--cinnabar': T.cinnabar, '--cinnabar-text': T.cinnabarText,
  '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)',
  '--cal-fg': T.ink, '--cal-muted': T.ink3, '--cal-cell': T.card, '--cal-empty': 'transparent', '--cal-gap': '2px', '--cal-radius': '3px',
  '--cal-focus': T.ink, '--cal-hatch': 'rgba(21,27,34,0.38)', '--cal-mid': '#EEEFF0',
  '--cal-down-1': '#D0E4F8', '--cal-down-2': '#ACCBEA', '--cal-down-3': '#8BB2D9', '--cal-down-4': '#6A97C1', '--cal-down-5': '#4A79A4',
  '--cal-up-1': '#FEDCD3', '--cal-up-2': '#F8BEAF', '--cal-up-3': '#F0A08C', '--cal-up-4': '#E37F65', '--cal-up-5': '#CF5A3D',
  '--cal-seq-1': '#FFE9E3', '--cal-seq-2': '#FAD0C5', '--cal-seq-3': '#F3B2A1', '--cal-seq-4': '#EB947E', '--cal-seq-5': '#DD7257', '--cal-seq-6': '#C64E31',
} as CSSProperties

const SERIF = '"Source Serif 4", Georgia, serif'
const SANS = '"Source Sans 3", system-ui, sans-serif'
const focusRing = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]'
const num = (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`
const NAV = ['Verdict', 'The clock', 'Two clocks', 'Audit', 'Calendar', 'Checks', 'Limits']

// Dial geometry: a half-disc from 06:00 (left) through solar noon (top) to 18:00 (right), 15° per hour.
const ang = (t: number) => Math.PI - ((t - 6) / 12) * Math.PI
const polar = (cx: number, cy: number, r: number, t: number) => [cx + r * Math.cos(ang(t)), cy - r * Math.sin(ang(t))] as const

export default function Sundial() {
  const [regionId, setRegionId] = useState('br-amazon')
  const d = useMemo(() => regionData(regionId), [regionId])
  const [year, setYear] = useState(d.latestOk?.year ?? 2025)
  const [mode, setMode] = useState<CalendarMode>('anomaly')
  const changeRegion = (id: string) => { setRegionId(id); setYear(regionData(id).latestOk?.year ?? 2025) }

  return (
    <div className="min-h-screen text-[15px] leading-[22px]" style={{ ...vars, background: T.page, color: T.ink, fontFamily: SANS }}>
      <TopBar regionId={regionId} onRegion={changeRegion} />
      <Hero d={d} year={year} onYear={setYear} />
      <CalendarSection d={d} mode={mode} onMode={setMode} />
      <Footer />
    </div>
  )
}

function Mark() {
  // The gnomon: a right triangle standing on its plate.
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M3 16 L10 16 L10 5 Z" fill={T.ink} />
      <path d="M2 17.25 H18" stroke={T.ink} strokeWidth="1.5" />
    </svg>
  )
}

function TopBar({ regionId, onRegion }: { regionId: string; onRegion: (id: string) => void }) {
  return (
    <header className="border-b border-[var(--hair)]">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-4 md:px-8">
        <a href="#" className={`flex items-center gap-2 text-[18px] font-medium ${focusRing}`}><Mark />Anchor</a>
        <nav aria-label="Sections" className="hidden items-center gap-6 lg:flex">
          {NAV.map((s, i) => (
            <a key={s} href="#" aria-current={i === 0 ? 'page' : undefined}
              className={`rounded-sm transition-colors duration-150 ease-[var(--ease)] hover:text-[var(--ink)] ${focusRing} ${i === 0 ? 'text-[var(--ink)]' : 'text-[var(--ink2)]'}`}>{s}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden h-6 items-center rounded-[4px] bg-[var(--raised)] px-2 text-[12px] text-[var(--ink2)] sm:inline-flex">Mock data</span>
          <RegionSelect value={regionId} onChange={onRegion} classes={{
            trigger: `inline-flex h-9 items-center gap-2 rounded-[10px] border border-[var(--hair)] bg-[var(--card)] pl-3 pr-2 text-[15px] transition-colors duration-150 ease-[var(--ease)] hover:bg-[var(--raised)] ${focusRing}`,
            icon: 'text-[var(--ink3)]',
            content: 'z-50 min-w-[240px] rounded-[12px] border border-[var(--hair)] bg-[var(--card)] p-1 text-[15px] shadow-[0_8px_24px_rgba(21,27,34,0.10)]',
            item: 'flex h-9 cursor-default select-none items-center gap-2 rounded-[8px] px-3 outline-none data-[highlighted]:bg-[var(--raised)] data-[state=checked]:font-medium',
          }} />
        </div>
      </div>
    </header>
  )
}

function Hero({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const lines = verdictLines(d)
  const first = d.drift[0]?.year ?? 2012
  const last = d.drift[d.drift.length - 1]?.year ?? 2026
  const dr = d.driftAt(year)
  const shift = dr ? minutesBetween(dr.aqua_lst, dr.viirs_lst) : 0
  return (
    <section aria-labelledby="verdict" className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-4 pb-16 pt-10 md:px-8 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0 lg:pb-16 lg:pt-24">
      <div className="lg:col-span-5 lg:row-start-1">
        <h1 id="verdict" className="max-w-[13em] text-[40px] leading-[1.06] tracking-[-0.02em] lg:text-[60px] lg:leading-[1.04]" style={{ fontFamily: SERIF, fontWeight: 400, textWrap: 'balance' }}>
          {verdictHeadline(d)}
        </h1>
        <p className="mt-6 max-w-[36rem] text-[18px] leading-7 text-[var(--ink2)]">{lines.look} {lines.change}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#calendar" className={`inline-flex h-12 items-center gap-2 rounded-[10px] bg-[var(--ink)] px-5 font-medium text-white transition-colors duration-150 ease-[var(--ease)] hover:bg-[#2A323B] ${focusRing}`}>
            Explore the calendar <ArrowRight size={18} strokeWidth={1.5} aria-hidden />
          </a>
          <button type="button" className={`inline-flex h-12 items-center rounded-[10px] border border-[var(--hair)] bg-[var(--card)] px-5 font-medium transition-colors duration-150 ease-[var(--ease)] hover:bg-[var(--raised)] ${focusRing}`}>
            Download summary
          </button>
        </div>
      </div>

      <figure className="lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1 lg:self-center lg:pl-8">
        {dr ? <Dial d={d} year={year} /> : (
          <div className="grid aspect-[16/9] place-items-center rounded-[16px] bg-[var(--raised)] p-8 text-center text-[var(--ink2)]">Look times for {d.phrase.the} are not in the data yet.</div>
        )}
        {dr ? (
          <div className="mx-auto mt-6 max-w-[560px]">
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <Readout label="Fixed clock" time={dr.viirs_lst} />
              <Readout label="Aqua" time={dr.aqua_lst} accent />
              <p className="pb-1 text-[var(--ink2)]">{shift === 0 ? 'Same minute' : `${Math.abs(shift)} min ${shift > 0 ? 'later' : 'earlier'}`} in {year}</p>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <span className="w-10 text-[12px] tabular-nums text-[var(--ink3)]">{first}</span>
              <YearSlider value={year} onChange={onYear} min={first} max={last} label="Year shown on the dial"
                valueText={(y) => { const r = d.driftAt(y); return r ? `${y}: fixed clock ${r.viirs_lst}, Aqua ${r.aqua_lst}` : String(y) }}
                classes={{
                  root: 'relative flex h-6 flex-1 touch-none select-none items-center',
                  track: 'relative h-[2px] grow rounded-full bg-[rgba(21,27,34,0.16)]',
                  thumb: `block h-5 w-5 rounded-full border border-[var(--hair)] bg-[var(--card)] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-shadow duration-150 ease-[var(--ease)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.16)] ${focusRing}`,
                }} />
              <span className="w-10 text-right text-[12px] tabular-nums text-[var(--ink3)]">{last}</span>
            </div>
            <figcaption className="mt-4 text-[12px] leading-4 text-[var(--ink3)]">
              Local solar time. The cut line is the fixed clock; the shadow falls where Aqua looked that year; cinnabar marks the minutes between them. Look times measured from hotspots · drift/{d.id}.json · MOCK
            </figcaption>
          </div>
        ) : null}
      </figure>
      <div className="lg:col-span-5 lg:row-start-2"><EffectByYear d={d} /></div>
    </section>
  )
}

function Readout({ label, time, accent }: { label: string; time: string; accent?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[var(--ink2)]"><ShadowTick t={hm(time)} accent={accent} />{label}</div>
      <div className="mt-1 text-[28px] font-medium leading-8" style={{ color: accent ? T.cinnabarText : T.ink }}>{time}</div>
    </div>
  )
}

/** The signature: a small dial with its shadow at the hour. Used only next to look times. */
function ShadowTick({ t, accent }: { t: number; accent?: boolean }) {
  const [x, y] = polar(10, 15, 7.5, t)
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M1.75 15.5 A8.25 8.25 0 0 1 18.25 15.5 Z" fill={T.stoneLit} stroke={T.ink3} strokeWidth="1" />
      <path d={`M10 15 L${x.toFixed(2)} ${y.toFixed(2)}`} stroke={accent ? T.cinnabar : T.ink} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function EffectByYear({ d }: { d: RegionData }) {
  return (
    <div className="mt-0 border-t border-[var(--hair)] pt-6 lg:mt-12">
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
                <span className="block text-[18px] font-medium leading-6 tabular-nums" style={{ color: y.verdict === 'clock' ? T.cinnabarText : T.ink2 }}>{pct(y.gap!)}</span>
                <span className="block text-[12px] leading-4 tabular-nums text-[var(--ink3)]">({num(y.lo!)} to {num(y.hi!)})</span>
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
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(fallback)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function Dial({ d, year }: { d: RegionData; year: number }) {
  const [box, w] = useWidth<HTMLDivElement>(640)
  return <div ref={box} className="w-full">{w > 0 ? <DialSvg d={d} year={year} W={Math.min(w, 720)} /> : null}</div>
}

function DialSvg({ d, year, W }: { d: RegionData; year: number; W: number }) {
  const dr = d.driftAt(year)!
  const fixed = hm(dr.viirs_lst), aqua = hm(dr.aqua_lst)
  const R = Math.round(W / 2 - 34), cx = W / 2, cy = R + 40, H = cy + 34
  const compact = R < 200
  const hours = Array.from({ length: 13 }, (_, i) => 6 + i)
  const halves = Array.from({ length: 12 }, (_, i) => 6.5 + i)
  const a0 = Math.min(fixed, aqua), a1 = Math.max(fixed, aqua)
  const sector = (r0: number, r1: number, t0: number, t1: number) => {
    const [x0, y0] = polar(cx, cy, r1, t0), [x1, y1] = polar(cx, cy, r1, t1)
    const [x2, y2] = polar(cx, cy, r0, t1), [x3, y3] = polar(cx, cy, r0, t0)
    return `M${x0} ${y0} A${r1} ${r1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 0 0 ${x3} ${y3} Z`
  }
  const shadow = (t: number, wide: number, tip: number, len: number) => {
    const a = ang(t), nx = -Math.sin(a), ny = -Math.cos(a)
    const [bx, by] = [cx, cy], [ex, ey] = polar(cx, cy, len, t)
    return `M${bx + nx * wide} ${by + ny * wide} L${ex + nx * tip} ${ey + ny * tip} L${ex - nx * tip} ${ey - ny * tip} L${bx - nx * wide} ${by - ny * wide} Z`
  }
  const label = (t: number, text: string, anchor: 'start' | 'end') => {
    const [x, y] = polar(cx, cy, R + 14, t)
    return <text x={x + (anchor === 'start' ? 4 : -4)} y={y} textAnchor={anchor} fontSize="12" fill={T.ink2} style={{ fontFamily: SANS }}>{text}</text>
  }
  const shiftMin = Math.round((aqua - fixed) * 60)
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto block" role="img"
      aria-label={`Sundial for ${d.phrase.the}, ${year}: the fixed clock's shadow falls at ${dr.viirs_lst} and Aqua's at ${dr.aqua_lst}, ${Math.abs(shiftMin)} minutes ${shiftMin >= 0 ? 'later' : 'earlier'}.`}>
      <defs>
        <filter id="sd-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.27  0 0 0 0 0.23  0 0 0 0 0.2  0 0 0 0.10 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="sd-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.7" /></filter>
        <filter id="sd-penumbra" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5" /></filter>
        <filter id="sd-lift" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#151B22" floodOpacity="0.14" /></filter>
        <linearGradient id="sd-light" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={T.stoneLit} />
          <stop offset="0.6" stopColor={T.stone} />
          <stop offset="1" stopColor={T.stoneShade} />
        </linearGradient>
      </defs>

      {/* the plate: a limestone half-disc with a slab edge, lit from the upper left */}
      <g filter="url(#sd-lift)">
        <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} Z`} fill="url(#sd-light)" />
        <rect x={cx - R} y={cy} width={2 * R} height={12} fill={T.stoneEdge} />
      </g>
      <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} Z`} fill={T.stone} filter="url(#sd-grain)" />
      <path d={`M${cx - R + 6} ${cy} A${R - 6} ${R - 6} 0 0 1 ${cx + R - 6} ${cy}`} fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1" />

      {/* cinnabar inlay: the minutes between the fixed clock and Aqua */}
      {a1 - a0 > 1 / 120 ? (
        <>
          <path d={sector(R * 0.2, R * 0.8, a0, a1)} fill={T.cinnabar} fillOpacity="0.2" />
          <path d={sector(R * 0.8, R * 0.835, a0, a1)} fill={T.cinnabar} />
        </>
      ) : null}

      {/* cut hour lines: a dark cut with a lit lower edge */}
      {hours.map((h) => {
        const [x0, y0] = polar(cx, cy, R * 0.14, h), [x1, y1] = polar(cx, cy, R * 0.8, h)
        return (
          <g key={h}>
            <path d={`M${x0 + 0.7} ${y0 + 0.7} L${x1 + 0.7} ${y1 + 0.7}`} stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1" />
            <path d={`M${x0} ${y0} L${x1} ${y1}`} stroke={T.cut} strokeOpacity="0.7" strokeWidth={h === 12 ? 1.75 : 1.25} />
          </g>
        )
      })}
      {halves.map((h) => {
        const [x0, y0] = polar(cx, cy, R * 0.74, h), [x1, y1] = polar(cx, cy, R * 0.8, h)
        return <path key={h} d={`M${x0} ${y0} L${x1} ${y1}`} stroke={T.cut} strokeOpacity="0.45" strokeWidth="1" />
      })}
      <path d={`M${cx - R * 0.835} ${cy} A${R * 0.835} ${R * 0.835} 0 0 1 ${cx + R * 0.835} ${cy}`} fill="none" stroke={T.cut} strokeOpacity="0.35" strokeWidth="1" />
      {hours.filter((h) => !compact || h % 2 === 0).map((h) => {
        const [x, y] = polar(cx, cy, R * 0.91, h)
        return <text key={h} x={x} y={h === 6 || h === 18 ? y - 8 : y + 5} textAnchor="middle" fontSize={compact ? 12 : 15} fill={T.cut} style={{ fontFamily: SANS, fontWeight: 500 }}>{h}</text>
      })}

      {/* shadows: a soft penumbra under a sharper core, cast from the gnomon */}
      {(() => {
        const [x0, y0] = polar(cx, cy, R * 0.14, fixed), [x1, y1] = polar(cx, cy, R * 0.835, fixed), [x2, y2] = polar(cx, cy, R * 0.86, fixed)
        return (
          <g>
            <path d={`M${x0 + 0.8} ${y0 + 0.8} L${x1 + 0.8} ${y1 + 0.8}`} stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="1.5" />
            <path d={`M${x0} ${y0} L${x1} ${y1}`} stroke={T.ink} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx={x2} cy={y2} r={3} fill={T.ink} />
          </g>
        )
      })()}
      <path d={shadow(aqua, 8, 4, R * 0.8)} fill={T.shadow} fillOpacity="0.16" filter="url(#sd-penumbra)" />
      <path d={shadow(aqua, 5, 1.4, R * 0.8)} fill={T.shadow} fillOpacity="0.72" filter="url(#sd-soft)" />
      <circle cx={cx} cy={cy} r={compact ? 7 : 11} fill={T.cut} />
      <circle cx={cx - 2} cy={cy - 2} r={compact ? 2.5 : 3.5} fill="#FFFFFF" fillOpacity="0.35" />

      {/* names at the rim, set apart so they never collide */}
      {label(fixed <= aqua ? fixed : aqua, fixed <= aqua ? 'Fixed clock' : 'Aqua', 'end')}
      {label(fixed <= aqua ? aqua : fixed, fixed <= aqua ? 'Aqua' : 'Fixed clock', 'start')}
    </svg>
  )
}

function CalendarSection({ d, mode, onMode }: { d: RegionData; mode: CalendarMode; onMode: (m: CalendarMode) => void }) {
  const grid = useMemo(() => calendarGrid(d), [d])
  const finding = calendarFinding(d)
  const [pick, setPick] = useState<{ year: number; month: number } | null>(null)
  const fallback = useMemo(() => { if (!finding) return null; const [mo, yr] = finding.label.split(' '); return { year: Number(yr), month: MONTHS.indexOf(mo) } }, [finding])
  const detail = pick ?? fallback
  return (
    <section id="calendar" aria-labelledby="calendar-h" className="mx-auto max-w-[1440px] px-4 pb-24 pt-16 md:px-8">
      <div className="border-t border-[var(--hair)] pt-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-6">
            <h2 id="calendar-h" className="text-[28px] leading-[1.15] tracking-[-0.01em]" style={{ fontFamily: SERIF, fontWeight: 400, textWrap: 'balance' }}>
              {finding ? `${finding.label} sat furthest above its median, ${pct(finding.anomaly, 0)}` : 'Every month in this range sits near its median'}
            </h2>
            <p className="mt-3 max-w-[36rem] text-[var(--ink2)]">
              Each cell is a month on the fixed clock, compared with the median for that calendar month across 2002–2025.
              {finding ? ` ${finding.label}: ${fmtInt(finding.fixed)} hotspots against a median of ${fmtInt(finding.median)}.` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:col-span-6 lg:justify-end">
            <ModeToggle value={mode} onChange={onMode} classes={{
              root: 'inline-flex rounded-[10px] bg-[var(--raised)] p-1',
              item: `h-8 rounded-[8px] px-3 text-[15px] text-[var(--ink2)] transition-colors duration-150 ease-[var(--ease)] hover:text-[var(--ink)] data-[state=on]:bg-[var(--card)] data-[state=on]:text-[var(--ink)] data-[state=on]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] ${focusRing}`,
            }} />
            <span className="tabular-nums text-[var(--ink2)]">2002 → 2026</span>
            <div className="flex items-center gap-1">
              {['CSV', 'PNG', 'SVG'].map((f) => (
                <button key={f} type="button" className={`inline-flex h-8 items-center gap-2 rounded-[8px] px-2 text-[var(--ink2)] transition-colors duration-150 ease-[var(--ease)] hover:bg-[var(--raised)] hover:text-[var(--ink)] ${focusRing}`}>
                  <Download size={16} strokeWidth={1.5} aria-hidden />{f}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-[16px] border border-[var(--hair)] bg-[var(--card)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] md:p-6 lg:col-span-8">
            <div className="hidden sm:block"><FireCalendar years={grid.years} cells={grid.cells} maxCount={grid.maxCount} mode={mode} cellHeight={24} onShow={(c) => c && setPick(c)} label={`Monthly fixed-clock hotspots for ${d.phrase.the}, 2002 to 2026`} /></div>
            <div className="sm:hidden"><FireCalendar years={grid.years} cells={grid.cells} maxCount={grid.maxCount} mode={mode} cellHeight={20} monthLabels="initial" onShow={(c) => c && setPick(c)} label={`Monthly fixed-clock hotspots for ${d.phrase.the}, 2002 to 2026`} /></div>
            <CalendarLegend mode={mode} className="mt-6" />
          </div>
          {detail ? <MonthDetail d={d} year={detail.year} month={detail.month} /> : null}
        </div>
        <p className="mt-3 text-[12px] leading-4 text-[var(--ink3)]">Source: calendar/{d.id}.json · fixed-clock hotspots, VIIRS 375 m in Aqua-equivalent units · MOCK</p>
      </div>
    </section>
  )
}

/** S4a month detail: one month across every year, against that month's median. */
function MonthDetail({ d, year, month }: { d: RegionData; year: number; month: number }) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`
  const rec = d.cal.find((c) => c.ym === key)
  const series = d.cal.filter((c) => Number(c.ym.slice(5, 7)) === month + 1)
  const max = Math.max(1, ...series.map((c) => c.fixed ?? 0), ...series.map((c) => c.median_ref ?? 0))
  const W = 320, H = 96, bw = W / Math.max(1, series.length)
  const median = rec?.median_ref ?? series.find((c) => c.median_ref != null)?.median_ref ?? null
  return (
    <aside aria-live="polite" className="rounded-[16px] border border-[var(--hair)] bg-[var(--card)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] lg:col-span-4 lg:self-start">
      <h3 className="text-[28px] leading-8" style={{ fontFamily: SERIF, fontWeight: 400 }}>{MONTHS[month]} {year}</h3>
      {rec && rec.fixed != null ? (
        <>
          <p className="mt-4 text-[18px] font-medium leading-6">{fmtInt(rec.fixed)} hotspots</p>
          {rec.lo != null && rec.hi != null ? <p className="mt-1 text-[12px] leading-4 tabular-nums text-[var(--ink3)]">Range {fmtInt(rec.lo)}–{fmtInt(rec.hi)}</p> : null}
          {rec.anomaly_pct != null && median != null ? (
            <p className="mt-4 text-[var(--ink2)]">
              <span className="font-medium" style={{ color: rec.anomaly_pct >= 0 ? T.cinnabarText : '#3D6A93' }}>{pct(rec.anomaly_pct, 0)}</span> vs. the {MONTHS[month]} median of {fmtInt(median)}
            </p>
          ) : null}
          {rec.flags.length ? <p className="mt-2 text-[12px] leading-4 text-[var(--ink3)]">{rec.flags.map((f) => f[0].toUpperCase() + f.slice(1)).join(', ')}</p> : null}
        </>
      ) : <p className="mt-4 text-[var(--ink2)]">No data for this month.</p>}
      <div className="mt-6 border-t border-[var(--hair)] pt-4">
        <p className="text-[12px] leading-4 text-[var(--ink3)]">Every {MONTHS[month]}, 2002–2026, with its median</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 block h-auto w-full" role="img" aria-label={`Fixed-clock hotspots for every ${MONTHS[month]} from 2002 to 2026; ${year} highlighted.`}>
          {series.map((c, i) => {
            const v = c.fixed ?? 0, h = (v / max) * (H - 4)
            const on = c.ym === key
            return c.fixed == null ? null : <rect key={c.ym} x={i * bw + 1} y={H - h} width={Math.max(1, bw - 2)} height={h} rx={1.5} fill={on ? T.cinnabar : '#C9D0D6'} />
          })}
          {median != null ? <line x1={0} x2={W} y1={H - (median / max) * (H - 4)} y2={H - (median / max) * (H - 4)} stroke={T.ink} strokeWidth={1} /> : null}
        </svg>
        <div className="mt-2 flex justify-between text-[12px] leading-4 text-[var(--ink3)]"><span>2002</span><span>Line: median</span><span>2026</span></div>
      </div>
      {rec ? (
        <dl className="mt-6 grid grid-cols-3 gap-2 border-t border-[var(--hair)] pt-4 text-[12px] leading-4">
          {([['Aqua', rec.aqua], ['S-NPP', rec.snpp], ['NOAA-20', rec.noaa20]] as const).map(([k, v]) => (
            <div key={k}><dt className="text-[var(--ink3)]">{k}</dt><dd className="mt-1 tabular-nums">{v == null ? '–' : fmtInt(v)}</dd></div>
          ))}
        </dl>
      ) : null}
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
