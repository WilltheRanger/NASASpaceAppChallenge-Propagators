/*
 * Round 2 · E · Operating picture (Palantir-inspired, at the team's request).
 * MOCK data: every number comes from src/r2/data.ts.
 * THESIS: plain, very large sentences, then the working product in its own dark window, the way an analyst sees it.
 * OWN-WORLD: light grey page, black and grey two-tone sentences, one dark product window with amber for Aqua and
 *   blue for Terra. Amber and blue live only inside the dark windows. Near-square chrome: controls 2–4 px, windows 8.
 * STORY: two-tone verdict → the clock window (look time by year, scrubber, readout) → the regions as a giant index of
 *   findings → the calendar with its finding ringed.
 * FIRST VIEWPORT: headline across 10 columns, subhead and actions in 6, the product window rising past the fold.
 * SIGNATURE: the two-tone sentence. Every finding drops to grey; grey only at 32 px and up.
 * MOTION: only when the reader acts. Scrubbing tweens the dots, the shaded shift and the readout figures (180 ms);
 *   a region change tweens the lines (400 ms); loading a region from the index scrolls to the window. All instant under
 *   prefers-reduced-motion. Nothing moves on load.
 * FORM: team-pinned reference (Palantir), no seed.
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { ArrowRight } from 'lucide-react'
import { area, curveMonotoneX, line, scaleLinear } from 'd3'
import { CalendarLegend, FireCalendar, describeCell, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle, RegionSelect, SectionsMenu, YearSlider } from '@/r2/controls'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'
import {
  MONTHS, REGIONS, SECTIONS, calendarFinding, calendarGrid, fmtHM, fmtRange, fmtShift, hm, pct, regionData,
  verdictHeadline, verdictLines, type RegionData,
} from '@/r2/data'
import { cn } from '@/lib/utils'

/* ---------- Tokens ---------- */

/** Light-page tokens; mirrored onto <body> while mounted because Radix portals its menus there. */
const PAGE_TOKENS = {
  '--font': "'Golos Text', ui-sans-serif, system-ui, sans-serif",
  '--page': '#F0F0F0',
  '--card': '#FFFFFF',
  '--ink': '#0B0B0B',
  '--ink2': '#484848',
  '--ink3': '#696969',
  '--ink-hover': '#2E2E2E',
  '--hair': 'rgba(11, 11, 11, 0.12)',
  '--hair-strong': 'rgba(11, 11, 11, 0.28)',
  '--shadow-win': '0 8px 24px rgba(0, 0, 0, 0.12)',
  '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

const TOKENS = {
  ...PAGE_TOKENS,
  '--maxw': '1440px',
  // the grey clause: 3.9:1 on the page, so only at 32 px and up
  '--grey': '#777777',
  // type: 12 / 14 / 20 come from the Tailwind scale (text-xs, text-sm, text-xl); the display sizes live here
  '--fs-32': '32px',
  '--fs-40': '40px',
  '--fs-72': '72px',
  '--lh-display': '1.02',
  '--track-32': '-0.01em',
  '--track-40': '-0.02em',
  '--track-72': '-0.03em',
  // the dark window
  '--win': '#101213',
  '--panel': '#191B1D',
  '--raised': '#22252A',
  '--whair': 'rgba(255, 255, 255, 0.08)',
  '--wtext': '#E6E8EA',
  '--wtext2': '#A8ABAE',
  '--wtext3': '#898C90',
  '--inset-hi': 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  '--grid': 'rgba(255, 255, 255, 0.06)',
  '--rule': 'rgba(255, 255, 255, 0.2)',
  '--track': 'rgba(255, 255, 255, 0.15)',
  '--thumb-hover': '#FFFFFF',
  '--list-w': '240px',
  '--readout-w': '280px',
  // data, validated on the window: Aqua amber, Terra blue, the fixed clock as the neutral reference
  '--aqua': '#CB8117',
  '--terra': '#4D92CA',
  '--fixed': '#E6E8EA',
  // calendar inside the window: amber above the median, blue below, a neutral midpoint
  '--cal-up-1': '#503816',
  '--cal-up-2': '#7A5116',
  '--cal-up-3': '#A56D0F',
  '--cal-up-4': '#D08B1D',
  '--cal-up-5': '#F8AC3D',
  '--cal-down-1': '#203B50',
  '--cal-down-2': '#2B5679',
  '--cal-down-3': '#3A74A2',
  '--cal-down-4': '#4D92CA',
  '--cal-down-5': '#6FB5EF',
  '--cal-mid': '#252728',
  '--cal-seq-1': '#2E2A22',
  '--cal-seq-2': '#503816',
  '--cal-seq-3': '#7A5116',
  '--cal-seq-4': '#A56D0F',
  '--cal-seq-5': '#D08B1D',
  '--cal-seq-6': '#F8AC3D',
  '--cal-cell': '#191B1D',
  '--cal-empty': 'transparent',
  '--cal-gap': '2px',
  '--cal-radius': '2px',
  '--cal-hatch': 'rgba(230, 232, 234, 0.35)',
  '--cal-focus': '#E6E8EA',
  '--cal-fg': '#E6E8EA',
  '--cal-muted': '#898C90',
  // the finding's month is the brightest amber by construction, so its ring is the window colour (6.8:1 on it)
  '--cal-highlight': '#101213',
} as const

/* ---------- Shared class strings ---------- */

const CLOCK_ID = 'clock-audit'
const container = 'mx-auto w-full max-w-[var(--maxw)] px-4 md:px-8'
const ease = 'transition-colors duration-150 ease-[var(--ease)] motion-reduce:transition-none'
// No outline-none here: in Tailwind v4 it sets --tw-outline-style to none and would hide these rings.
const ringLight = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink)]'
const ringDark = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--wtext)]'
const ringDarkInset = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--wtext)]'
/** Display sentences: the hero, the section headings and the index lines share one size and setting. */
const display = 'text-[length:var(--fs-40)] font-normal leading-[var(--lh-display)] tracking-[var(--track-40)] md:text-[length:var(--fs-72)] md:tracking-[var(--track-72)]'
const clause32 = 'text-[length:var(--fs-32)] leading-9 tracking-[var(--track-32)] text-[color:var(--grey)]'
const btn = cn('inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-sm px-5 text-sm font-medium', ease, ringLight)

const selectClasses = {
  trigger: cn(
    'inline-flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-sm border border-[var(--hair)] bg-[var(--card)] pl-3 pr-2 text-sm text-[color:var(--ink)]',
    '[&>span:first-child]:truncate hover:border-[var(--hair-strong)]', ease, ringLight,
  ),
  icon: 'shrink-0 text-[color:var(--ink3)]',
  content: 'z-50 min-w-[var(--radix-select-trigger-width)] rounded-md border border-[var(--hair)] bg-[var(--card)] p-1 font-[family-name:var(--font)] text-sm text-[color:var(--ink)] shadow-[var(--shadow-win)]',
  item: 'relative flex h-9 cursor-default select-none items-center gap-2 rounded-xs px-3 outline-none data-[highlighted]:bg-[var(--page)] data-[state=checked]:font-medium',
}

const menuClasses = {
  trigger: cn(
    'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-[var(--hair)] bg-[var(--card)] text-[color:var(--ink2)]',
    'hover:border-[var(--hair-strong)] hover:text-[color:var(--ink)]', ease, ringLight,
  ),
  content: 'z-50 min-w-48 rounded-md border border-[var(--hair)] bg-[var(--card)] p-1 font-[family-name:var(--font)] text-sm text-[color:var(--ink)] shadow-[var(--shadow-win)]',
  item: 'flex h-9 cursor-default select-none items-center rounded-xs px-3 outline-none data-[highlighted]:bg-[var(--page)] data-[disabled]:text-[color:var(--ink3)]',
}

const modeClasses = {
  root: 'inline-flex h-8 items-center rounded-sm bg-[var(--raised)] p-0.5',
  item: cn(
    'h-7 cursor-pointer rounded-xs px-3 text-sm text-[color:var(--wtext2)] data-[state=off]:hover:text-[color:var(--wtext)]',
    'data-[state=on]:bg-[var(--wtext)] data-[state=on]:text-[color:var(--win)]', ease, ringDark,
  ),
}

/* ---------- Copy helpers: every word comes from the shared functions, the brief or the review ---------- */

/** Typographic apostrophes for display; the words are unchanged. */
const typeset = (s: string) => s.replace(/'/g, '’')

/** The signature: split a finding before its first " to ", " from " or " holds "; the rest drops to grey. */
function splitTwoTone(s: string): [string, string] {
  const at = [' to ', ' from ', ' holds '].map((t) => s.indexOf(t)).filter((i) => i > 0)
  if (!at.length) return [s, '']
  const i = Math.min(...at)
  return [s.slice(0, i), s.slice(i)]
}

function TwoTone({ ink, grey }: { ink: string; grey: string }) {
  return <>{ink}{grey ? <span className="text-[color:var(--grey)]">{grey}</span> : null}</>
}

const noiseFloor = (d: RegionData) => `±${d.noise.toFixed(0)}%`

/** A region's latest clock effect, worded the way the window list shows it. */
function latestValue(r: RegionData) {
  const y = r.latestOk
  if (!y || y.verdict === 'na') return 'not enough fires'
  if (y.verdict === 'noise') return 'within noise'
  return pct(y.gap!)
}

/** The index line: the figure joins the name in ink; range and reading drop to grey. */
function indexFinding(r: RegionData, commonYear: number) {
  const y = r.latestOk
  if (!y || y.verdict === 'na') return { figure: null, clause: 'not enough fires to measure' }
  const when = y.year !== commonYear ? ` in ${y.year}` : ''
  const reading = y.verdict === 'clock' ? 'outside' : 'within'
  return { figure: pct(y.gap!), clause: `(${fmtRange(y.lo!, y.hi!)}), ${reading} the ${noiseFloor(r)} noise floor${when}` }
}

/* ---------- Motion: one curve, JS-driven where CSS cannot reach (SVG geometry, numbers) ---------- */

/** cubic-bezier(0.22, 1, 0.36, 1), the page's one easing curve, solved for JS tweens. */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t
  const sy = (t: number) => ((ay * t + by) * t + cy) * t
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  return (x: number) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x, s = dx(t)
      if (Math.abs(e) < 1e-5 || !s) break
      t = Math.min(1, Math.max(0, t - e / s))
    }
    return sy(t)
  }
}
const EASE = bezier(0.22, 1, 0.36, 1)

/** Tweens a list of numbers to a new target; instant on first render, under reduced motion, or when the shape changes. */
function useTweened(target: number[] | null, ms: number, reduced: boolean) {
  const [value, setValue] = useState(target)
  const shown = useRef(target)
  const key = target ? target.join(',') : ''
  useEffect(() => {
    const from = shown.current
    if (!target || !from || reduced || from.length !== target.length) {
      shown.current = target
      setValue(target)
      return
    }
    if (from.every((v, i) => v === target[i])) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms)
      const e = EASE(k)
      const next = k >= 1 ? target : target.map((v, i) => from[i] + (v - from[i]) * e)
      shown.current = next
      setValue(next)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // the key stands for the target's values; the array itself is rebuilt every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms, reduced])
  return value
}

function useTweenedNumber(target: number | null, ms: number, reduced: boolean) {
  const v = useTweened(target == null ? null : [target], ms, reduced)
  return v ? v[0] : null
}

/* ---------- Hooks ---------- */

function usePortalTokens() {
  useEffect(() => {
    const s = document.body.style
    const bg = s.backgroundColor
    for (const [k, v] of Object.entries(PAGE_TOKENS)) s.setProperty(k, v)
    s.backgroundColor = PAGE_TOKENS['--page']
    return () => {
      for (const k of Object.keys(PAGE_TOKENS)) s.removeProperty(k)
      s.backgroundColor = bg
    }
  }, [])
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** Measures its box so the chart draws in real pixels and its type stays at 12 px at every width. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/* ---------- Page ---------- */

export default function Operating() {
  usePortalTokens()
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const all = useMemo(() => REGIONS.map((r) => regionData(r.id)), [])
  const [regionId, setRegionId] = useState('br-amazon')
  const d = useMemo(() => all.find((r) => r.id === regionId) ?? regionData(regionId), [all, regionId])
  const [year, setYear] = useState(() => regionData('br-amazon').latestOk?.year ?? 2025)
  const [mode, setMode] = useState<CalendarMode>('anomaly')

  return (
    <div style={TOKENS as unknown as CSSProperties} className="min-h-screen bg-[var(--page)] font-[family-name:var(--font)] text-[color:var(--ink)] antialiased">
      <TopBar regionId={regionId} onRegion={setRegionId} />
      <main>
        <Hero d={d} all={all} year={year} onYear={setYear} onRegion={setRegionId} reduced={reduced} />
        <RegionsIndex all={all} regionId={regionId} onRegion={setRegionId} reduced={reduced} />
        <CalendarSection d={d} mode={mode} onMode={setMode} />
      </main>
      <footer className="mt-32 border-t border-[var(--hair)]">
        <div className={cn(container, 'flex flex-col gap-2 py-12 text-xs text-[color:var(--ink3)] md:flex-row md:justify-between md:gap-6')}>
          <p>Anchor · Team Propagators</p>
          <p>{typeset("Every number comes from the team's JSON files; this comp uses mock data.")}</p>
        </div>
      </footer>
    </div>
  )
}

/* ---------- Top bar ---------- */

/** The mark: a dial with one hand held at the 1:30 position, the fixed hour every count is anchored to. */
function Mark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="9" style={{ fill: 'var(--ink)' }} />
      <path d="M10 10 L15 5" fill="none" strokeWidth="2" strokeLinecap="round" style={{ stroke: 'var(--page)' }} />
    </svg>
  )
}

function TopBar({ regionId, onRegion }: { regionId: string; onRegion: (id: string) => void }) {
  return (
    <header className="border-b border-[var(--hair)]">
      <div className={cn(container, 'flex h-16 items-center gap-10')}>
        <a href="#verdict" className={cn('flex shrink-0 items-center gap-2 rounded-xs text-xl font-medium leading-none', ringLight)}>
          <Mark />
          Anchor
        </a>
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="flex items-center gap-6 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                {s.inComp ? (
                  <a
                    href={`#${s.id}`}
                    aria-current={s.id === 'verdict' ? 'true' : undefined}
                    className={cn('rounded-xs', ease, ringLight, s.id === 'verdict' ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink2)] hover:text-[color:var(--ink)]')}
                  >
                    {s.label}
                  </a>
                ) : (
                  // a section of the full build that this comp does not contain: listed, visibly unavailable
                  <a role="link" aria-disabled="true" title="In the full build" className="cursor-default text-[color:var(--ink3)]">{s.label}</a>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <span className="hidden h-6 shrink-0 items-center rounded-xs border border-[var(--hair)] px-2 text-xs text-[color:var(--ink2)] sm:inline-flex">Mock data</span>
          <RegionSelect value={regionId} onChange={onRegion} classes={selectClasses} />
          <div className="flex lg:hidden"><SectionsMenu classes={menuClasses} /></div>
        </div>
      </div>
    </header>
  )
}

/* ---------- Hero: the two-tone verdict and the product window ---------- */

function Hero({ d, all, year, onYear, onRegion, reduced }: {
  d: RegionData; all: RegionData[]; year: number; onYear: (y: number) => void; onRegion: (id: string) => void; reduced: boolean
}) {
  const [ink, grey] = splitTwoTone(typeset(verdictHeadline(d)))
  const { look, change } = verdictLines(d)
  return (
    <section id="verdict" aria-labelledby="verdict-h" className="pt-12 md:pt-24">
      <div className={container}>
        <div className="grid grid-cols-12 gap-x-6">
          <h1 id="verdict-h" className={cn('col-span-12 text-balance lg:col-span-10', display)}>
            <TwoTone ink={ink} grey={grey} />
          </h1>
          <div className="col-span-12 mt-6 md:col-span-8 md:mt-8 lg:col-span-6">
            <p className="text-xl text-[color:var(--ink2)]">{typeset(`${look} ${change}`)}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#calendar" className={cn(btn, 'bg-[var(--ink)] text-white hover:bg-[var(--ink-hover)]')}>
                Explore the calendar
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
              </a>
              <button
                type="button"
                onClick={() => downloadSummary(d)}
                className={cn(btn, 'border border-[var(--hair)] bg-[var(--card)] text-[color:var(--ink)] hover:border-[var(--hair-strong)]')}
              >
                Download summary
              </button>
            </div>
          </div>
        </div>

        <Window id={CLOCK_ID} title={`Clock audit · ${d.name}`} className="mt-12 md:mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_var(--readout-w)] xl:grid-cols-[var(--list-w)_minmax(0,1fr)_var(--readout-w)]">
            <RegionList all={all} regionId={d.id} onRegion={onRegion} />
            <ClockChart d={d} year={year} onYear={onYear} reduced={reduced} />
            <Readout d={d} year={year} reduced={reduced} />
          </div>
        </Window>
        <p className="mt-3 text-xs text-[color:var(--ink3)]">
          Source: drift/{d.id}.json, audit/{d.id}.json · look times measured from hotspots · MOCK
        </p>
      </div>
    </section>
  )
}

/** The dark product window: a 40 px title row in the panel colour, then the body. No fake chrome. */
function Window({ id, title, className, children }: { id?: string; title: string; className?: string; children: ReactNode }) {
  return (
    <div id={id} role="region" aria-label={title} className={cn('scroll-mt-6 rounded-lg bg-[var(--win)] text-[color:var(--wtext)] shadow-[var(--shadow-win)]', className)}>
      <div className="flex h-10 items-center rounded-t-lg border-b border-[var(--whair)] bg-[var(--panel)] px-4 text-xs md:px-6">
        <span className="min-w-0 truncate text-[color:var(--wtext2)]">{title}</span>
      </div>
      {children}
    </div>
  )
}

function RegionList({ all, regionId, onRegion }: { all: RegionData[]; regionId: string; onRegion: (id: string) => void }) {
  return (
    <div className="hidden border-r border-[var(--whair)] px-3 pb-3 pt-6 xl:block">
      <p className="px-3 text-xs text-[color:var(--wtext3)]">Regions</p>
      <ToggleGroup.Root
        type="single"
        orientation="vertical"
        value={regionId}
        onValueChange={(v) => { if (v) onRegion(v) }}
        aria-label="Region"
        className="mt-2 flex flex-col gap-0.5"
      >
        {all.map((r) => (
          <ToggleGroup.Item
            key={r.id}
            value={r.id}
            className={cn(
              'flex h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-3 text-left',
              'data-[state=off]:hover:bg-[var(--panel)] data-[state=on]:bg-[var(--raised)] data-[state=on]:shadow-[var(--inset-hi)]',
              ease, ringDarkInset,
            )}
          >
            <span className="min-w-0 truncate text-sm text-[color:var(--wtext)]">{r.phrase.short}</span>
            <span className="shrink-0 text-xs tabular-nums text-[color:var(--wtext2)]">{latestValue(r)}</span>
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  )
}

/* ---------- The chart: look time by year, one axis, the shift shaded where the reader scrubs ---------- */

const SERIES = [
  { name: 'Aqua', color: 'var(--aqua)', key: 'h-0.5' },
  { name: 'Fixed clock', color: 'var(--fixed)', key: 'h-px' },
  { name: 'Terra', color: 'var(--terra)', key: 'h-0.5' },
] as const

const THUMB = 16 // px; Radix keeps the thumb inside its track, so the track runs half a thumb past the plot each side
const PAD_H = 8 / 60 // eight minutes of air above the latest look and below the earliest one

function ClockChart({ d, year, onYear, reduced }: { d: RegionData; year: number; onYear: (y: number) => void; reduced: boolean }) {
  const [box, W] = useWidth<HTMLDivElement>()
  const clipId = `shift-${useId().replace(/:/g, '')}`
  const rows = d.drift
  const n = rows.length
  const first = rows[0]?.year ?? year
  const last = rows[n - 1]?.year ?? year
  const yr = Math.min(last, Math.max(first, year))

  // Aqua, fixed clock and Terra in hours, then the y-domain tightened to the data (Terra sets the floor)
  const target = useMemo(() => {
    const A = rows.map((r) => hm(r.aqua_lst)), F = rows.map((r) => hm(r.viirs_lst)), T = rows.map((r) => hm(r.terra_lst))
    const every = [...A, ...F, ...T]
    return [...A, ...F, ...T, Math.min(...every) - PAD_H, Math.max(...every) + PAD_H]
  }, [rows])
  const tw = useTweened(n ? target : null, 400, reduced) ?? target
  const yearT = useTweenedNumber(yr, 180, reduced) ?? yr

  const valueText = (v: number) => {
    const r = d.driftAt(v)
    return r ? `${v}: Aqua ${r.aqua_lst}, fixed clock ${r.viirs_lst}, Terra ${r.terra_lst}` : String(v)
  }

  if (!n) {
    return <div className="min-w-0 p-4 text-sm text-[color:var(--wtext2)] md:p-6">{verdictLines(d).look}</div>
  }

  const A = tw.slice(0, n), F = tw.slice(n, 2 * n), T = tw.slice(2 * n, 3 * n)
  const lo = tw[3 * n], hi = tw[3 * n + 1]
  const small = W > 0 && W < 560
  const H = small ? 280 : 368
  const M = { t: 12, r: 80, b: 56, l: 44 }
  const plotW = Math.max(0, W - M.l - M.r)
  const L = M.l, R = M.l + plotW, B = H - M.b
  const x = scaleLinear().domain([first, last]).range([L, R])
  const y = scaleLinear().domain([lo, hi]).range([B, M.t])
  const crisp = (v: number) => Math.round(v) + 0.5
  /** a series' value at a fractional year: the dots glide along the lines while the year tweens */
  const at = (arr: number[], t: number) => {
    if (arr.length < 2) return arr[0]
    const u = Math.min(arr.length - 1, Math.max(0, t - first))
    const i = Math.min(arr.length - 2, Math.floor(u))
    return arr[i] + (arr[i + 1] - arr[i]) * (u - i)
  }

  const hourStep = small ? 2 : 1
  const hours: number[] = []
  for (let h = Math.ceil(lo); h <= Math.floor(hi); h++) if (h % hourStep === 0) hours.push(h)
  const yearStep = plotW >= 480 ? 2 : plotW >= 180 ? 4 : 7
  const ticks = rows.map((r) => r.year).filter((v) => (last - v) % yearStep === 0)

  const curve = (arr: number[]) => line<number>().x((_, i) => x(first + i)).y((v) => y(v)).curve(curveMonotoneX)(arr) ?? ''
  const shiftArea = area<number>().x((_, i) => x(first + i)).y0((_, i) => y(F[i])).y1((v) => y(v)).curve(curveMonotoneX)(A) ?? ''

  // the scrubbed year: a one-year band between Aqua and the fixed clock, labelled with the minutes between them
  const sx = x(yearT)
  const ya = y(at(A, yearT)), yf = y(at(F, yearT)), yt = y(at(T, yearT))
  const slot = n > 1 ? x(first + 1) - x(first) : 0
  const c0 = Math.max(L, sx - slot / 2), c1 = Math.min(R, sx + slot / 2)
  // direct labels at the right ends, kept 16 px apart if two lines finish close together
  const labels = SERIES.map((s, k) => ({ name: s.name, at: y([A, F, T][k][n - 1]) })).sort((a, b) => a.at - b.at)
  for (let i = 1; i < labels.length; i++) if (labels[i].at - labels[i - 1].at < 16) labels[i].at = labels[i - 1].at + 16

  // the shift label sits beside the band; when the band is too thin, or the label would crowd an end label, it moves
  // under the lower line, where the chart is always empty (Terra runs hours below)
  const shiftText = fmtShift(Math.round((at(A, yearT) - at(F, yearT)) * 60))
  const labelW = shiftText.length * 6.5
  let lx = sx + slot / 2 + 6, ly = (ya + yf) / 2, anchor: 'start' | 'end' = 'start'
  if (Math.abs(ya - yf) < 16) { lx = sx + 8; ly = Math.max(ya, yf) + 16 }
  const crowded = lx + labelW > R + 12 && labels.some((l) => Math.abs(l.at - ly) < 18)
  if (crowded || lx + labelW > W) { lx = sx - 8; ly = Math.max(ya, yf) + 18; anchor = 'end' }

  const a0 = d.years[0]?.year, a1 = d.years[d.years.length - 1]?.year
  const bracket = a0 != null && a1 != null && a0 >= first && a1 <= last && a1 > a0

  return (
    <div className="min-w-0 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className="text-sm font-normal text-[color:var(--wtext)]">Look time by year</h2>
        <ul className="flex items-center gap-4 text-xs text-[color:var(--wtext2)]">
          {SERIES.map((s) => (
            <li key={s.name} className="flex items-center gap-2">
              <span aria-hidden className={cn('block w-4 rounded-full', s.key)} style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      </div>

      <div ref={box} className="mt-4" style={{ height: H }}>
        {W > 0 ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`Look time by year, ${valueText(yr)}`}>
            <defs>
              <clipPath id={clipId}><rect x={c0} y={M.t} width={Math.max(0, c1 - c0)} height={B - M.t} /></clipPath>
            </defs>
            {hours.map((h) => (
              <g key={h}>
                <line x1={L} x2={R} y1={crisp(y(h))} y2={crisp(y(h))} style={{ stroke: 'var(--grid)' }} strokeWidth={1} />
                <text x={L - 8} y={y(h)} dy="0.32em" textAnchor="end" fontSize={12} style={{ fill: 'var(--wtext3)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtHM(h)}
                </text>
              </g>
            ))}
            {ticks.map((t) => (
              <text key={t} x={x(t)} y={B + 20} textAnchor="middle" fontSize={12} style={{ fill: 'var(--wtext3)', fontVariantNumeric: 'tabular-nums' }}>
                {t}
              </text>
            ))}
            {bracket ? (
              <g>
                <path d={`M${crisp(x(a0))} ${B + 26} V${B + 30.5} H${crisp(x(a1))} V${B + 26}`} fill="none" strokeWidth={1} style={{ stroke: 'var(--wtext3)' }} />
                <text x={x((a0 + a1) / 2)} y={B + 46} textAnchor="middle" fontSize={12} style={{ fill: 'var(--wtext3)' }}>Audit years</text>
              </g>
            ) : null}

            <path d={shiftArea} clipPath={`url(#${clipId})`} style={{ fill: 'var(--aqua)', fillOpacity: 0.25 }} />
            <line x1={crisp(sx)} x2={crisp(sx)} y1={M.t} y2={B} style={{ stroke: 'var(--rule)' }} strokeWidth={1} />

            {/* the fixed clock as a 1 px reference under the 2 px Aqua line, so 13:12 and 13:18 read as two lines */}
            <path d={curve(F)} fill="none" strokeWidth={1} style={{ stroke: 'var(--fixed)' }} />
            <path d={curve(T)} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--terra)' }} />
            <path d={curve(A)} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--aqua)' }} />

            {([[yf, 'var(--fixed)'], [yt, 'var(--terra)'], [ya, 'var(--aqua)']] as const).map(([cy, color]) => (
              <g key={color}>
                <circle cx={sx} cy={cy} r={6} style={{ fill: 'var(--win)' }} />
                <circle cx={sx} cy={cy} r={4} style={{ fill: color }} />
              </g>
            ))}
            <text x={lx} y={ly} dy="0.32em" textAnchor={anchor} fontSize={12} fontWeight={500} style={{ fill: 'var(--wtext)', fontVariantNumeric: 'tabular-nums' }}>
              {shiftText}
            </text>
            {labels.map((l) => (
              <text key={l.name} x={R + 12} y={l.at} dy="0.32em" fontSize={12} style={{ fill: 'var(--wtext2)' }}>
                {l.name}
              </text>
            ))}
          </svg>
        ) : null}
      </div>

      <table className="sr-only">
        <caption>Look time by year</caption>
        <thead>
          <tr><th scope="col">Year</th><th scope="col">Aqua</th><th scope="col">Fixed clock</th><th scope="col">Terra</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}><th scope="row">{r.year}</th><td>{r.aqua_lst}</td><td>{r.viirs_lst}</td><td>{r.terra_lst}</td></tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2" style={{ marginLeft: M.l - THUMB / 2, marginRight: M.r - THUMB / 2 }}>
        <YearSlider
          value={yr}
          onChange={onYear}
          min={first}
          max={last}
          label="Year"
          valueText={valueText}
          classes={{
            root: 'relative flex h-6 w-full touch-none select-none items-center',
            track: 'relative h-0.5 grow rounded-full bg-[var(--track)]',
            thumb: cn('block size-4 cursor-grab rounded-sm bg-[var(--wtext)] hover:bg-[var(--thumb-hover)] active:cursor-grabbing', ease, ringDark),
          }}
        />
      </div>
    </div>
  )
}

/* ---------- Readout for the scrubbed year, then the fixed headline comparison ---------- */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[color:var(--wtext2)]">{label}</dt>
      <dd className="flex items-center gap-2 tabular-nums text-[color:var(--wtext)]">{children}</dd>
    </div>
  )
}

function Readout({ d, year, reduced }: { d: RegionData; year: number; reduced: boolean }) {
  const first = d.drift[0]?.year ?? year
  const last = d.drift[d.drift.length - 1]?.year ?? year
  const yr = Math.min(last, Math.max(first, year))
  const dr = d.driftAt(yr)
  const audit = d.years.find((y) => y.year === yr)
  const span = d.years.length ? `${d.years[0].year}–${d.years[d.years.length - 1].year}` : null
  const { hc, change, why } = verdictLines(d)
  const aquaT = useTweenedNumber(dr ? hm(dr.aqua_lst) : null, 180, reduced)
  const fixedT = useTweenedNumber(dr ? hm(dr.viirs_lst) : null, 180, reduced)
  const gapT = useTweenedNumber(audit && audit.verdict !== 'na' ? audit.gap : null, 180, reduced)
  return (
    <div className="border-t border-[var(--whair)] p-4 md:p-6 lg:border-l lg:border-t-0">
      <p className="text-[length:var(--fs-32)] leading-9 text-[color:var(--wtext)]">{yr}</p>
      {aquaT != null && fixedT != null ? (
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <Row label="Aqua looked">
            <span aria-hidden className="block size-2 rounded-full bg-[var(--aqua)]" />
            {fmtHM(aquaT)}
          </Row>
          <Row label="Fixed clock">{fmtHM(fixedT)}</Row>
          <Row label="Shift">{fmtShift(Math.round((aquaT - fixedT) * 60))}</Row>
        </dl>
      ) : null}

      <div className="mt-5 border-t border-[var(--whair)] pt-5">
        {/* one height for every state, so scrubbing never moves the block below */}
        <div className="min-h-19 lg:min-h-23">
          <p className="text-xs text-[color:var(--wtext3)]">Clock effect</p>
          {!audit ? (
            <>
              <p className="mt-1 text-sm text-[color:var(--wtext2)]">No audit for this year</p>
              {span ? <p className="mt-1 text-xs text-[color:var(--wtext3)]">Audits cover {span}</p> : null}
            </>
          ) : audit.verdict === 'na' ? (
            <>
              <p className="mt-1 text-xl font-medium text-[color:var(--wtext)]">Not enough fires</p>
              <p className="mt-1 text-xs text-[color:var(--wtext3)]">to measure the clock effect</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[length:var(--fs-32)] font-medium leading-9 tracking-[var(--track-32)] text-[color:var(--wtext)]">{pct(gapT ?? audit.gap!)}</p>
              {/* one line where it fits; in the 280 px column the range and the noise floor take a line each */}
              <p className="mt-1 text-xs text-[color:var(--wtext3)]">
                <span className="whitespace-nowrap lg:block">({fmtRange(audit.lo!, audit.hi!)})</span>
                <span className="lg:hidden"> · </span>
                <span className="whitespace-nowrap lg:block">{audit.verdict === 'clock' ? 'outside' : 'within'} the {noiseFloor(d)} noise floor</span>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--whair)] pt-5">
        <p className="text-xs text-[color:var(--wtext3)]">Headline comparison · {hc.from} → {hc.to}</p>
        {hc.ok ? (
          <dl className="mt-2 flex flex-col gap-2 text-sm">
            <Row label="Official">{pct(hc.official)}</Row>
            <Row label="Fixed clock">{pct(hc.fixed)}</Row>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-[color:var(--wtext)]">{typeset(change)}</p>
        )}
        {why ? <p className="mt-3 text-xs text-[color:var(--wtext3)]">{typeset(why)}</p> : null}
      </div>
    </div>
  )
}

/* ---------- Section heading: a page hairline, then a 72 px two-tone sentence, like the hero ---------- */

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="border-t border-[var(--hair)] pt-10 md:pt-16">
      <div className="grid grid-cols-12 gap-x-6">
        <h2 id={id} className={cn('col-span-12 text-balance lg:col-span-10', display)}>{children}</h2>
      </div>
    </div>
  )
}

/* ---------- Regions as a giant typographic index of findings ---------- */

function RegionsIndex({ all, regionId, onRegion, reduced }: {
  all: RegionData[]; regionId: string; onRegion: (id: string) => void; reduced: boolean
}) {
  const commonYear = Math.max(...all.map((r) => r.latestOk?.year ?? 0))
  const load = (id: string) => {
    onRegion(id)
    document.getElementById(CLOCK_ID)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }
  return (
    <section aria-labelledby="regions-h" className="pt-24 md:pt-32">
      <div className={container}>
        <SectionHeading id="regions-h">
          <TwoTone ink="Six regions, one clock," grey=" the latest audit year for each" />
        </SectionHeading>
        <ul className="mt-8 border-b border-[var(--hair)] md:mt-12">
          {all.map((r) => {
            const loaded = r.id === regionId
            const f = indexFinding(r, commonYear)
            return (
              <li key={r.id} className="border-t border-[var(--hair)]">
                <button
                  type="button"
                  aria-pressed={loaded}
                  onClick={() => load(r.id)}
                  className={cn('group grid w-full cursor-pointer grid-cols-1 rounded-sm py-6 text-left md:grid-cols-12 md:gap-x-6 md:py-8', ringLight)}
                >
                  <span className="md:col-span-10">
                    <span className={cn('block text-[color:var(--ink)] group-hover:text-[color:var(--ink2)]', display, ease)}>
                      {r.phrase.short.replace(/ \+ /g, ' + ')}
                      {f.figure ? ` ${f.figure}` : null}
                    </span>
                    <span className={cn('mt-2 block text-pretty', clause32)}>{f.clause}</span>
                  </span>
                  {loaded ? (
                    <span aria-hidden className="mt-3 text-xs text-[color:var(--ink3)] md:col-span-2 md:mt-0 md:pt-2 md:text-right">Loaded</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ---------- Calendar ---------- */

function CalendarSection({ d, mode, onMode }: { d: RegionData; mode: CalendarMode; onMode: (m: CalendarMode) => void }) {
  const grid = useMemo(() => calendarGrid(d), [d])
  const f = calendarFinding(d)
  const small = useMedia('(max-width: 639px)')
  const from = grid.years[grid.years.length - 1]
  const to = grid.years[0]
  // the finding's month, ringed in the grid and named above it
  const [mo, yy] = f ? f.label.split(' ') : ['', '']
  const hlMonth = MONTHS.indexOf(mo), hlYear = Number(yy)
  const hlRow = grid.years.indexOf(hlYear)
  const hl = f && hlMonth >= 0 && hlRow >= 0 ? { year: hlYear, month: hlMonth } : null
  const callout = hl ? describeCell(grid.cells[hlRow][hlMonth], hlMonth, hlYear) : null
  const [calloutHead, ...calloutRest] = callout ? callout.split(': ') : []

  return (
    <section id="calendar" aria-labelledby="calendar-h" className="pt-24 md:pt-32">
      <div className={container}>
        <SectionHeading id="calendar-h">
          {f ? (
            <TwoTone ink={`${f.label} sat furthest above its median,`} grey={` ${pct(f.anomaly, 0)} on the fixed clock`} />
          ) : (
            <TwoTone ink="Every month in this range" grey=" sits near its median" />
          )}
        </SectionHeading>

        <Window title={`Fire calendar · ${d.name}`} className="mt-8 md:mt-12">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[var(--whair)] px-4 py-3 md:px-6">
            <ModeToggle value={mode} onChange={onMode} classes={modeClasses} />
            <span className="text-sm text-[color:var(--wtext2)]">{from} → {to}</span>
            <button
              type="button"
              onClick={() => downloadCalendarCsv(d)}
              className={cn('-mx-2 inline-flex h-8 cursor-pointer items-center rounded-sm px-2 text-sm text-[color:var(--wtext2)] hover:text-[color:var(--wtext)] sm:ml-auto', ease, ringDark)}
            >
              CSV
            </button>
          </div>
          <div className="p-4 md:p-6">
            {callout ? (
              <p className="mb-4 text-xs text-[color:var(--wtext2)]">
                <span className="text-[color:var(--wtext)]">{calloutHead}</span>: {calloutRest.join(': ')}
              </p>
            ) : null}
            <FireCalendar
              years={grid.years}
              cells={grid.cells}
              maxCount={grid.maxCount}
              mode={mode}
              render="fill"
              cellHeight={small ? 20 : 24}
              monthLabels={small ? 'initial' : 'short'}
              highlight={hl}
              label={`Fire calendar · ${d.name}`}
            />
            <CalendarLegend mode={mode} render="fill" className="mt-6" />
          </div>
        </Window>
        <p className="mt-3 text-xs text-[color:var(--ink3)]">
          Source: calendar/{d.id}.json · VIIRS 375 m in Aqua-equivalent units · MOCK
        </p>
      </div>
    </section>
  )
}
