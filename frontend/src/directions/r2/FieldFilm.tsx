// Round 2 · Direction D, "Field film" (Anduril-inspired, at the team's request), now two pages.
// Landing (D's original layout, kept): each region's name as a statement over its photograph at full bleed, the page
// stepping through the six regions until one is picked; how Anchor reads a count on a bone band; the six regions as
// photograph tiles; the tagline. App: the verdict beside the region's photograph, the year reel on a ruler, the three
// passes of one day, the clock effect by year against the noise floor on the one sage band, then the calendar.
// Black, bone and sage; square media, 4 px on small controls. Motion follows Anduril's patterns as read from their
// code (designs/round-2/anduril-study.md), behind a footer switch seeded from the reader's reduced-motion setting.
// Every number comes from src/r2/data.ts; the MOCK labels follow each file's own "mock" flag. Region photographs: Unsplash, credited in the
// footer. Pass imagery: NASA Worldview / GIBS, public domain.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, Pause, Play } from 'lucide-react'
import { CalendarLegend, FireCalendar, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle, RegionSelect, YearSlider } from '@/r2/controls'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'
import {
  CHECKS, MONTHS, REGIONS, SECTIONS, calendarFinding, calendarGrid, countName, fmtRange, hm, minutesBetween, pct, phrase, regionData, verdictHeadline, verdictLines,
  type Check, type RegionData, type Verdict,
} from '@/r2/data'
import { cn } from '@/lib/utils'
import { FilmstripScrub } from '@/components/ui/filmstrip-scrub'
import { AnomalyChart, type AnomalyPoint } from '@/components/ui/anomaly-chart'
import { SeriesChart, useMeasuredWidth, type Series } from '@/components/ui/series-chart'
import { AnchorLogo } from '@/components/brand/anchor-logo'
import { photoFor } from '@/r2/photos'

/* ---------- Tokens: black ground, bone text, one sage band; the photographs carry the colour ---------- */

const BASE_TOKENS = {
  '--ground': '#0B0D0B',
  '--surface': '#121413',
  '--raised': '#1C1F1D',
  '--bone': '#ECE9E1',
  '--bone-hover': '#D6D3CB',
  '--bone2': '#ADAFA8',
  '--bone3': '#8B8D86',
  '--bone-80': 'rgba(236, 233, 225, 0.8)',
  '--bone-30': 'rgba(236, 233, 225, 0.3)',
  '--bone-20': 'rgba(236, 233, 225, 0.2)',
  '--hairline': 'rgba(236, 233, 225, 0.1)',
  '--sage': '#748677',
  '--ink': '#0B0D0B',
  '--ink-20': 'rgba(11, 13, 11, 0.2)',
  '--shadow-menu': '0 8px 24px rgba(0, 0, 0, 0.5)',
  '--ring-in': 'inset 0 0 0 2px #ECE9E1',
  '--ring-in-on': 'inset 0 0 0 2px #0B0D0B',
  '--f-ui': "'Albert Sans', ui-sans-serif, system-ui, sans-serif",
  '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

// Neutral black scrims for legibility on the photograph; no hue anywhere in them.
// The top bar's plate is eased so the links hold 4.5:1 over the brightest cumulus; it is gone by a quarter of the height.
const SCRIM_TOP = 'linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.74) 6%, rgba(0, 0, 0, 0.45) 14%, rgba(0, 0, 0, 0) 26%)'
// one bottom ramp, at most 0.6
const RAMP = 'linear-gradient(180deg, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0.32) 66%, rgba(0, 0, 0, 0.5) 84%, rgba(0, 0, 0, 0.6) 100%)'
// a soft local plate behind the verdict block, where the photograph is brightest
const PLATE_VERDICT = 'radial-gradient(ellipse 72% 66% at 28% 54%, rgba(0, 0, 0, 0.76) 0%, rgba(0, 0, 0, 0.62) 45%, rgba(0, 0, 0, 0) 100%)'

const TOKENS = {
  ...BASE_TOKENS,
  colorScheme: 'dark',
  // type: 12 / 14 / 18 come from text-xs / text-sm / text-lg; these are the other three
  '--fs-32': '32px',
  '--fs-40': '40px',
  '--fs-72': '72px',
  // the landing's statement: the region's name, and the closing line
  '--fs-display': 'clamp(56px, 11vw, 168px)',
  '--lh-display': '1.02',
  '--track-display': '-0.03em',
  '--track-title': '-0.01em',
  // layout
  '--maxw': '1440px',
  '--measure': '36rem',
  '--hero-h': 'clamp(720px, 100svh, 960px)',
  '--select-max': '168px',
  '--select-max-wide': '240px',
  '--scrims-wide': [SCRIM_TOP, PLATE_VERDICT, RAMP].join(', '),
  '--scrims-narrow': [SCRIM_TOP, RAMP].join(', '),
  '--scrim-tile': 'linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.5) 22%, rgba(0, 0, 0, 0) 52%)',
  // the statement hero: a little at the top for the bar, more at the bottom for the name and the tabs
  '--scrim-statement': 'linear-gradient(180deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.4) 12%, rgba(0, 0, 0, 0) 26%, rgba(0, 0, 0, 0) 42%, rgba(0, 0, 0, 0.5) 72%, rgba(0, 0, 0, 0.78) 100%)',
  // region tiles carry two lines of text over a photograph that may be bright (haze, sky)
  '--scrim-card': 'linear-gradient(0deg, rgba(0, 0, 0, 0.86) 0%, rgba(0, 0, 0, 0.62) 34%, rgba(0, 0, 0, 0) 70%)',
  // the pass line's plate along the bottom edge of the photograph
  '--plate': 'rgba(11, 13, 11, 0.86)',
  // the ±noise band on the sage table: ink at 12% over sage, solid so stacked rows read as one band
  '--sage-band': '#67776A',
  // calendar (dark; brighter = further from the median): sand above, slate below
  '--cal-up-1': '#3F301B',
  '--cal-up-2': '#604825',
  '--cal-up-3': '#876533',
  '--cal-up-4': '#AE8446',
  '--cal-up-5': '#D6A866',
  '--cal-down-1': '#1C313D',
  '--cal-down-2': '#29495C',
  '--cal-down-3': '#36647D',
  '--cal-down-4': '#4B82A1',
  '--cal-down-5': '#68A4C6',
  '--cal-mid': '#1D1F1D',
  '--cal-seq-1': '#2A2A22',
  '--cal-seq-2': '#3F301B',
  '--cal-seq-3': '#604825',
  '--cal-seq-4': '#876533',
  '--cal-seq-5': '#AE8446',
  '--cal-seq-6': '#D6A866',
  '--cal-cell': '#121413',
  '--cal-empty': 'transparent',
  '--cal-gap': '2px',
  '--cal-radius': '0px',
  '--cal-hatch': 'rgba(236, 233, 225, 0.35)',
  '--cal-focus': '#ECE9E1',
  '--cal-highlight': '#ECE9E1',
  '--cal-fg': '#ECE9E1',
  '--cal-muted': '#8B8D86',
} as const

/** Radix menus portal to <body>, outside the root div: mirror the tokens there, and paint the body ground. */
function usePortalTokens() {
  useEffect(() => {
    const s = document.body.style
    const prev = { bg: s.backgroundColor, scheme: s.colorScheme }
    for (const [k, v] of Object.entries(BASE_TOKENS)) s.setProperty(k, v)
    s.backgroundColor = BASE_TOKENS['--ground']
    s.colorScheme = 'dark'
    return () => {
      for (const k of Object.keys(BASE_TOKENS)) s.removeProperty(k)
      s.backgroundColor = prev.bg
      s.colorScheme = prev.scheme
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

/* ---------- Content helpers ---------- */

const IMG = `${import.meta.env.BASE_URL}img/`
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const FEATURED = 'br-amazon'
/** True while any preset region still reads mock files. */
const ANY_MOCK = REGIONS.some((r) => regionData(r.id).mock)

/** Sections that exist in this comp; the rest of the index belongs to the full build. */
const IN_COMP = new Set<string>(['verdict', 'clock', 'two-clocks', 'audit', 'calendar', 'checks', 'limits'])

const READING: Record<Verdict, string> = { clock: 'Clock effect', noise: 'Within noise', na: 'Not enough fires' }
const DATA_NOTE = "Every number comes from the team's JSON files."

type AuditRow = RegionData['years'][number]
type Drift = RegionData['drift'][number]
const effectText = (y: AuditRow) => (y.gap == null ? '—' : pct(y.gap))
const rangeText = (y: AuditRow) => (y.lo == null || y.hi == null ? '—' : fmtRange(y.lo, y.hi))
const noiseText = (d: RegionData) => `±${Number(d.noise.toFixed(1))}%`

const defaultYear = (d: RegionData) => d.latestOk?.year ?? d.years[d.years.length - 1]?.year ?? d.lastDrift?.year ?? 2025

type Nav = 'dev' | 'artifact'
type Page = 'landing' | 'app'
type Links = { app: (r: string) => string; landing: (r: string) => string }
type Leave = (e: ReactMouseEvent<HTMLAnchorElement>) => void

/** Where the two pages live: query strings in the dev comp; two files in the comment artifact, the region in the hash. */
const linksFor = (nav: Nav): Links => ({
  app: (r) => (nav === 'artifact' ? `app.html#region=${r}` : `?d=d&page=app&region=${r}`),
  landing: (r) => (nav === 'artifact' ? `index.html#region=${r}` : `?d=d&region=${r}`),
})

function initialRegion() {
  const q = new URLSearchParams(window.location.search).get('region')
  const h = /(?:^#|&)region=([\w-]+)/.exec(window.location.hash)?.[1]
  const r = q ?? h
  return r && REGIONS.some((x) => x.id === r) ? r : FEATURED
}

function writeRegion(nav: Nav, id: string) {
  try {
    if (nav === 'artifact') window.history.replaceState(null, '', `#region=${id}`)
    else {
      const p = new URLSearchParams(window.location.search)
      p.set('region', id)
      window.history.replaceState(null, '', `?${p.toString()}${window.location.hash}`)
    }
  } catch { /* sandboxed frames may refuse history writes */ }
}

/* ---------- Motion: Anduril's patterns, read from their code (designs/round-2/anduril-study.md) ---------- */

const MOTION_KEY = 'anchor-motion'
/** On unless the reader asks for reduced motion; the footer switch overrides it and is remembered when storage allows. */
function readMotion() {
  try {
    const v = window.localStorage.getItem(MOTION_KEY)
    if (v === 'on' || v === 'off') return v === 'on'
  } catch { /* storage can be blocked */ }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
const MotionContext = createContext<{ on: boolean; set: (on: boolean) => void }>({ on: true, set: () => {} })
const useMotion = () => useContext(MotionContext)

/** True once the element has been `threshold` in view (their InView: 0.05 for slices, 0.5 for cards); true at once
 *  without motion or without IntersectionObserver, so nothing can stay hidden. */
function useInView<T extends Element>(motion: boolean, threshold = 0.05) {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(!motion)
  useEffect(() => {
    if (!motion) { setSeen(true); return }
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [motion, threshold])
  return [ref, seen] as const
}

/** Their line rise (SplitText + y 100% → 0, 1000 ms easeOutExpo), for a whole title: it rises from behind a mask the
 *  first time half of it is in view. */
function Rise({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const motion = useMotion()
  const [ref, seen] = useInView<HTMLDivElement>(motion.on, 0.5)
  return (
    <div ref={ref} className="overflow-hidden pb-1">
      <div style={{ transitionDelay: `${delay}ms` }} className={cn('transition-transform duration-1000 ease-[var(--ease)]', seen ? 'translate-y-0' : 'translate-y-full')}>
        {children}
      </div>
    </div>
  )
}

/** Their page change, halved for two static pages: this page fades and grows to 1.02 about the middle of the screen,
 *  then the link is followed; the next page arrives from 0.98 (in FieldFilm). Plain navigation without motion. */
function useLeave(motion: boolean): Leave {
  return (e) => {
    if (!motion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const href = e.currentTarget.getAttribute('href')
    const root = document.getElementById('anchor-root')
    if (!href || href.startsWith('#') || !root?.animate) return
    e.preventDefault()
    root.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2}px`
    root.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.02)' }], { duration: 350, easing: EASE, fill: 'forwards' })
    window.setTimeout(() => { window.location.href = href }, 340)
  }
}

/** The audit band's heading, as a finding: the run of latest years whose whole range sits outside the noise floor. */
function effectHeading(d: RegionData) {
  const n = noiseText(d)
  let i = d.years.length - 1
  while (i >= 0 && d.years[i].verdict === 'na') i--
  if (i < 0) return `Not enough fires in ${d.phrase.the} to measure the clock effect`
  if (d.years[i].verdict === 'noise') return `In ${d.years[i].year} the ${countName(d.id)} holds: the clock effect sits within the ${n} noise floor`
  let s = i
  while (s > 0 && d.years[s - 1].verdict === 'clock') s--
  return s < i
    ? `Since ${d.years[s].year} the clock effect sits outside the ${n} noise floor`
    : `In ${d.years[i].year} the clock effect sits outside the ${n} noise floor`
}

/* ---------- Shared classes ---------- */

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]'
const ease = 'transition-colors duration-150 ease-[var(--ease)]'
const slideEase = 'transition-transform duration-240 ease-[var(--ease)] motion-reduce:transition-none'
const title = 'text-balance text-[length:var(--fs-40)] font-medium leading-[var(--lh-display)] tracking-[var(--track-display)]'
const shell = 'mx-auto w-full max-w-[var(--maxw)] px-4 sm:px-8'
/** Their link underline: draws in from the left on hover, leaves to the right. */
const underline = cn(
  'relative rounded after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-right after:scale-x-0 after:bg-current after:content-[\'\']',
  'after:transition-transform after:duration-300 after:ease-[var(--ease)] hover:after:origin-left hover:after:scale-x-100',
)

const selectClasses = {
  trigger: cn(
    'inline-flex h-9 min-w-0 max-w-[var(--select-max)] items-center gap-2 rounded border border-[color:var(--hairline)] bg-[color:var(--surface)] pl-3 pr-2 text-sm text-[color:var(--bone)] sm:max-w-[var(--select-max-wide)]',
    '[&>span:first-child]:truncate hover:bg-[color:var(--raised)]',
    ease,
    focusRing,
  ),
  icon: 'shrink-0 text-[color:var(--bone3)]',
  content:
    'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded border border-[color:var(--hairline)] bg-[color:var(--surface)] p-1 font-[family-name:var(--f-ui)] text-[color:var(--bone)] shadow-[var(--shadow-menu)]',
  item: cn(
    'relative flex h-9 cursor-default select-none items-center gap-2 px-3 text-sm text-[color:var(--bone)] outline-none',
    'data-[highlighted]:bg-[color:var(--raised)] data-[state=checked]:font-medium',
    ease,
  ),
}

const menuClasses = {
  trigger: cn(
    'inline-flex size-9 shrink-0 items-center justify-center rounded border border-[color:var(--hairline)] bg-[color:var(--surface)] text-[color:var(--bone)] hover:bg-[color:var(--raised)]',
    ease,
    focusRing,
  ),
  content:
    'z-50 min-w-48 overflow-hidden rounded border border-[color:var(--hairline)] bg-[color:var(--surface)] p-1 font-[family-name:var(--f-ui)] text-[color:var(--bone)] shadow-[var(--shadow-menu)]',
  item: cn(
    'flex h-9 cursor-default select-none items-center px-3 text-sm text-[color:var(--bone)] outline-none',
    'data-[highlighted]:bg-[color:var(--raised)] data-[disabled]:text-[color:var(--bone3)]',
    ease,
  ),
}

const sliderClasses = {
  root: 'relative flex h-8 w-full cursor-pointer touch-none select-none items-center',
  track: 'relative h-0.5 grow bg-[color:var(--bone-20)]',
  thumb: cn('block size-4 rounded-full bg-[color:var(--bone)] hover:bg-[color:var(--bone-hover)]', ease, focusRing),
}

const modeClasses = {
  root: 'inline-flex h-9 overflow-hidden rounded bg-[color:var(--raised)]',
  item: cn(
    'h-9 px-4 text-sm text-[color:var(--bone2)] outline-none data-[state=off]:hover:text-[color:var(--bone)]',
    'focus-visible:shadow-[var(--ring-in)] data-[state=on]:bg-[color:var(--bone)] data-[state=on]:text-[color:var(--ink)] data-[state=on]:focus-visible:shadow-[var(--ring-in-on)]',
    ease,
  ),
}

/* ---------- The statement stage: a held section whose photograph closes in to a frame as you scroll ---------- */

/** Where the photograph closes in to (under the bar, at the page gutters, above the verdict) and how each layer reads the
 *  stage's scroll progress --p, 0 → 1. */
const FRAME = '[--frame-t:80px] [--frame-b:calc(40svh_+_24px)] [--frame-x:max(16px,calc((100vw_-_var(--maxw))_/_2_+_16px))] sm:[--frame-x:max(32px,calc((100vw_-_var(--maxw))_/_2_+_32px))] xl:[--frame-t:88px]'
const FRAME_CLIP = '[clip-path:inset(calc(var(--p)*var(--frame-t))_calc(var(--p)*var(--frame-x))_calc(var(--p)*var(--frame-b))_calc(var(--p)*var(--frame-x)))]'
const SETTLE = '[transform:scale(calc(1.12_-_0.12*var(--p)))]'
const RIDE = '[transform:translateY(calc(var(--p)*-1*var(--frame-b)))]'
const FADE_NAME = '[opacity:calc(min(1,(1_-_var(--p))*2.2))]'
const FADE_SOON = '[opacity:calc(1_-_var(--p)*4)]'
const SHRINK = 'origin-bottom-left [transform:scale(calc(1_-_0.2*var(--p)))]'

/** Scroll progress through a held section, written as --p on its stage once a frame. It listens in the capture phase,
 *  so it hears the page scroll whichever element does the scrolling (an embedding frame may scroll a wrapper), and it
 *  measures against the stage, not the window. */
function useStage(sectionRef: RefObject<HTMLElement | null>, stageRef: RefObject<HTMLElement | null>, on: boolean, onProgress?: (p: number) => void) {
  const report = useRef(onProgress)
  report.current = onProgress
  useEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    if (!section || !stage) return
    if (!on) { stage.style.setProperty('--p', '0'); report.current?.(0); return }
    let raf = 0
    const update = () => {
      raf = 0
      const r = section.getBoundingClientRect()
      const run = r.height - stage.getBoundingClientRect().height
      const v = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0
      stage.style.setProperty('--p', v.toFixed(4))
      report.current?.(v)
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', queue, { passive: true, capture: true })
    window.addEventListener('resize', queue)
    return () => {
      window.removeEventListener('scroll', queue, { capture: true })
      window.removeEventListener('resize', queue)
      cancelAnimationFrame(raf)
    }
  }, [on, sectionRef, stageRef])
}

/* ---------- Pages ---------- */

export default function FieldFilm({ page, nav = 'dev' }: { page?: Page; nav?: Nav }) {
  usePortalTokens()
  const which: Page = page ?? (new URLSearchParams(window.location.search).get('page') === 'app' ? 'app' : 'landing')
  const [motion, setMotionState] = useState(readMotion)
  const setMotion = (on: boolean) => {
    setMotionState(on)
    try { window.localStorage.setItem(MOTION_KEY, on ? 'on' : 'off') } catch { /* storage can be blocked */ }
  }
  const [region, setRegion] = useState(initialRegion)
  const links = linksFor(nav)
  const leave = useLeave(motion)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root?.animate) return
    if (motion) root.animate([{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: EASE })
    // coming back through history must not land on a faded page
    const back = (e: PageTransitionEvent) => { if (e.persisted) root.getAnimations().forEach((a) => a.cancel()) }
    window.addEventListener('pageshow', back)
    return () => window.removeEventListener('pageshow', back)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <MotionContext.Provider value={{ on: motion, set: setMotion }}>
      <div
        id="anchor-root"
        ref={rootRef}
        style={TOKENS as unknown as CSSProperties}
        data-motion={motion ? 'on' : 'off'}
        className="relative min-h-screen overflow-x-clip bg-[color:var(--ground)] font-[family-name:var(--f-ui)] text-sm text-[color:var(--bone)] antialiased"
      >
        {which === 'app' ? (
          <AppPage region={region} onRegion={(id) => { setRegion(id); writeRegion(nav, id) }} links={links} leave={leave} />
        ) : (
          <LandingPage region={region} setRegion={setRegion} onPick={(id) => writeRegion(nav, id)} links={links} leave={leave} />
        )}
        <Footer />
      </div>
    </MotionContext.Provider>
  )
}

function LandingPage({ region, setRegion, onPick, links, leave }: { region: string; setRegion: (id: string) => void; onPick: (id: string) => void; links: Links; leave: Leave }) {
  return (
    <>
      <LandingTopBar app={links.app(region)} leave={leave} />
      <main>
        <LandingHero region={region} setRegion={setRegion} onPick={onPick} app={links.app(region)} leave={leave} />
        <HowItWorks />
        <RegionIndex links={links} leave={leave} />
        <Closing href={links.app(region)} leave={leave} />
      </main>
    </>
  )
}

function AppPage({ region, onRegion, links, leave }: { region: string; onRegion: (id: string) => void; links: Links; leave: Leave }) {
  const d = useMemo(() => regionData(region), [region])
  const [year, setYear] = useState(() => defaultYear(d))
  const [mode, setMode] = useState<CalendarMode>('anomaly')
  const small = useMedia('(max-width: 639px)')
  const pick = (id: string) => { onRegion(id); setYear(defaultYear(regionData(id))) }
  return (
    <>
      <AppTopBar region={region} onRegion={pick} home={links.landing(region)} leave={leave} />
      <main>
        <AppStatement d={d} />
        <AppVerdict d={d} year={year} onYear={setYear} />
        <Passes d={d} />
        <TwoClocks d={d} year={year} onYear={setYear} small={small} />
        <ClockEffect d={d} year={year} onYear={setYear} small={small} />
        <Calendar d={d} mode={mode} onMode={setMode} small={small} />
        <Checks />
        <Limits />
      </main>
    </>
  )
}

/* ---------- Footer: credits, the AI note, the motion switch ---------- */

/** Their animation switch: two words with a pill that slides between them; role="switch". */
function MotionSwitch() {
  const m = useMotion()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={m.on}
      onClick={() => m.set(!m.on)}
      className={cn('inline-flex items-center gap-3 rounded text-xs text-[color:var(--bone2)] hover:text-[color:var(--bone)]', ease, focusRing)}
    >
      <span>Motion</span>
      <span aria-hidden className="relative grid grid-cols-2 rounded bg-[color:var(--raised)] p-0.5">
        <span className={cn('absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-[3px] bg-[color:var(--bone)] transition-transform duration-300 ease-[var(--ease)]', m.on && 'translate-x-full')} />
        <span className={cn('relative px-2 py-0.5 text-center', m.on ? 'text-[color:var(--bone2)]' : 'text-[color:var(--ink)]')}>Off</span>
        <span className={cn('relative px-2 py-0.5 text-center', m.on ? 'text-[color:var(--ink)]' : 'text-[color:var(--bone2)]')}>On</span>
      </span>
    </button>
  )
}

function Footer() {
  return (
    <footer className="border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-8 py-12 text-xs text-[color:var(--bone3)] lg:grid-cols-12 lg:gap-x-6')}>
        <div className="flex flex-col items-start gap-2 lg:col-span-4">
          <p className="text-[color:var(--bone2)]">Anchor · Team Propagators</p>
          <p>{DATA_NOTE}{ANY_MOCK ? ' This comp uses mock data.' : ''}</p>
          <div className="mt-2"><MotionSwitch /></div>
        </div>
        <div className="lg:col-span-8">
          <p className="text-[color:var(--bone2)]">Photographs</p>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {REGIONS.map((r) => {
              const p = photoFor(r.id)
              return (
                <li key={r.id}>
                  {r.name}: <a href={p.url} target="_blank" rel="noreferrer" className={cn(underline, 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>{p.by}</a> on Unsplash
                </li>
              )
            })}
            <li>Three passes of one day: NASA Worldview / GIBS, public domain</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}

/* ---------- Top bars ---------- */

/** Phone and tablet index (below 1280 px): the same sections; the ones this comp doesn't have are listed, disabled. */
function SectionsIndex() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger aria-label="Sections" className={menuClasses.trigger}>
        <Menu size={18} strokeWidth={1.5} aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={6} align="end" className={menuClasses.content}>
          {SECTIONS.map((s) => {
            const live = IN_COMP.has(s.id)
            return (
              <DropdownMenu.Item
                key={s.id}
                disabled={!live}
                className={menuClasses.item}
                onSelect={() => { if (live) document.getElementById(s.id)?.scrollIntoView() }}
              >
                {s.label}{live ? '' : ' · full build'}
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/** Shown only while the files on screen say "mock": true; real files in data/out drop it. */
function MockTag({ show = true, className }: { show?: boolean; className?: string }) {
  if (!show) return null
  return <span className={cn('shrink-0 rounded border border-[color:var(--hairline)] px-2 py-1 text-xs text-[color:var(--bone)]', className)}>Mock data</span>
}

const primaryButton = cn(
  'inline-flex h-12 items-center justify-center gap-2 rounded bg-[color:var(--bone)] px-5 text-sm font-medium text-[color:var(--ink)] hover:bg-[color:var(--bone-hover)]',
  ease,
  focusRing,
)
const secondaryButton = cn(
  'inline-flex h-12 items-center justify-center rounded border border-[color:var(--bone-30)] px-5 text-sm font-medium text-[color:var(--bone)] hover:bg-[color:var(--hairline)]',
  ease,
  focusRing,
)

/** Landing: transparent on the photograph, as before; the way into the audit at the right. */
function LandingTopBar({ app, leave }: { app: string; leave: Leave }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className={cn(shell, 'flex h-16 items-center justify-between gap-4 xl:grid xl:h-18 xl:grid-cols-12 xl:gap-x-6')}>
        <a href="#top" aria-label="Anchor, back to the top" className={cn('flex shrink-0 items-center rounded leading-none xl:col-span-3 xl:justify-self-start', focusRing)}>
          <AnchorLogo height={20} />
        </a>
        <nav aria-label="On this page" className="hidden md:block xl:col-span-6 xl:justify-self-center">
          <ul className="flex items-center gap-6 text-sm">
            <li><a href="#how" className={cn(underline, 'text-[color:var(--bone)]', focusRing)}>How it works</a></li>
            <li><a href="#regions" className={cn(underline, 'text-[color:var(--bone)]', focusRing)}>Regions</a></li>
          </ul>
        </nav>
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3 xl:col-span-3">
          <MockTag show={ANY_MOCK} className="hidden bg-[color:var(--plate)] sm:inline-block" />
          <a
            href={app}
            onClick={leave}
            className={cn('inline-flex h-9 items-center rounded bg-[color:var(--bone)] px-3 text-sm font-medium text-[color:var(--ink)] hover:bg-[color:var(--bone-hover)]', ease, focusRing)}
          >
            Open the audit
          </a>
        </div>
      </div>
    </header>
  )
}

/** App: clear over the statement at first; solid once the page moves, so the audit scrolls under it. */
function AppTopBar({ region, onRegion, home, leave }: { region: string; onRegion: (id: string) => void; home: string; leave: Leave }) {
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const check = (e?: Event) => {
      const t = e?.target
      const y = Math.max(window.scrollY, document.scrollingElement?.scrollTop ?? 0, t instanceof Element ? t.scrollTop : 0)
      setSolid(y > 8)
    }
    check()
    window.addEventListener('scroll', check, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', check, { capture: true })
  }, [])
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-30 border-b transition-colors duration-300 ease-[var(--ease)]',
        solid ? 'border-[color:var(--hairline)] bg-[color:var(--ground)]' : 'border-transparent bg-transparent',
      )}
    >
      <div className={cn(shell, 'flex h-16 items-center justify-between gap-4 xl:grid xl:h-18 xl:grid-cols-12 xl:gap-x-6')}>
        <a href={home} onClick={leave} aria-label="Anchor home" className={cn('flex shrink-0 items-center rounded leading-none xl:col-span-3 xl:justify-self-start', focusRing)}>
          <AnchorLogo height={20} />
        </a>
        <nav aria-label="Sections" className="hidden xl:col-span-6 xl:flex xl:justify-center">
          <ul className="flex items-center gap-6 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                {IN_COMP.has(s.id) ? (
                  <a href={`#${s.id}`} className={cn(underline, 'text-[color:var(--bone)]', focusRing)}>
                    {s.label}
                  </a>
                ) : (
                  <span aria-disabled="true" title="In the full build" className="cursor-default text-[color:var(--bone3)]">{s.label}</span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3 xl:col-span-3">
          <MockTag show={regionData(region).mock} className="hidden bg-[color:var(--plate)] sm:inline-block" />
          <RegionSelect value={region} onChange={onRegion} classes={selectClasses} />
          <div className="xl:hidden"><SectionsIndex /></div>
        </div>
      </div>
    </header>
  )
}

/* ---------- Landing hero: a statement piece, the region's name on its ground; the verdict follows below ---------- */

const DWELL = 'animate-[anchor-dwell_7s_linear_forwards]'
const statement = 'text-balance text-[length:var(--fs-display)] font-medium leading-[0.92] tracking-[-0.04em]'
const titleLarge = 'text-balance text-[length:var(--fs-40)] font-medium leading-[var(--lh-display)] tracking-[var(--track-display)]'
/** The statement's wording: "The Amazon", not "Amazon" (which reads as the company); places that take no article stay bare. */
const statementName = (id: string) => {
  const the = phrase(id).the
  return the.startsWith('the ') ? `The ${the.slice(4)}` : phrase(id).short
}

function LandingHero({ region, setRegion, onPick, app, leave }: { region: string; setRegion: (id: string) => void; onPick: (id: string) => void; app: string; leave: Leave }) {
  const motion = useMotion()
  const d = useMemo(() => regionData(region), [region])
  const { look, change } = verdictLines(d)
  const ids = REGIONS.map((r) => r.id)
  // the tour: on until a region is picked; held while paused, while the tabs have focus, or once the reader scrolls
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const [held, setHeld] = useState(false)
  const [moved, setMoved] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  // the landing's statement stays still; the zoom-out reveal opens the audit page instead
  const hold = false
  useStage(sectionRef, stageRef, hold, (v) => setMoved(v > 0.04))
  // photographs load as their region is first shown, then stay for the crossfade
  const [loaded, setLoaded] = useState<string[]>([region])
  useEffect(() => { setLoaded((l) => (l.includes(region) ? l : [...l, region])) }, [region])

  const touring = motion.on && auto
  const running = touring && !paused && !held && !moved
  const next = () => setRegion(ids[(ids.indexOf(region) + 1) % ids.length])
  const pick = (id: string) => { setAuto(false); setRegion(id); onPick(id) }

  return (
    <>
      {/* the statement: the region's name on its ground and the way to change it, held for a screen of scrolling while
          the photograph closes in to a frame (still without motion) */}
      <section id="top" ref={sectionRef} aria-labelledby="region-h" className={cn('relative', hold && 'h-[200svh]')}>
        <div
          ref={stageRef}
          style={{ '--p': 0 } as CSSProperties}
          className={cn('sticky top-0 isolate flex flex-col overflow-hidden bg-[color:var(--ground)]', FRAME, hold ? 'h-[100svh]' : 'h-[78svh] max-h-[1040px] min-h-[560px]')}
        >
        <div className={cn('absolute inset-0 -z-10 overflow-hidden bg-[color:var(--surface)]', FRAME_CLIP)}>
          {loaded.map((id) => {
            const p = photoFor(id)
            return (
              <img
                key={id}
                src={p.src}
                srcSet={`${p.srcSm} 720w, ${p.src} 1920w`}
                sizes="100vw"
                alt={id === region ? p.alt : ''}
                aria-hidden={id === region ? undefined : true}
                width={p.width}
                height={p.height}
                style={{ objectPosition: p.focus }}
                className={cn('absolute inset-0 size-full object-cover transition-opacity duration-700 ease-[var(--ease)]', hold && SETTLE, id === region ? 'opacity-100' : 'opacity-0')}
              />
            )
          })}
          <div aria-hidden className="absolute inset-0 bg-[image:var(--scrim-statement)]" />
        </div>
        <div aria-hidden className="h-16 shrink-0 xl:h-18" />
        <div className={cn('mt-auto', RIDE)}>
        <div className={cn(shell, 'pb-8 sm:pb-10', FADE_NAME)}>
          <MockTag show={d.mock} className="mb-4 inline-block bg-[color:var(--plate)] sm:hidden" />
          <h1 id="region-h" className={cn(statement, SHRINK)}>
            <span key={region} className="block animate-[anchor-fade_600ms_cubic-bezier(0.22,1,0.36,1)]">{statementName(region)}</span>
          </h1>
        </div>
        {/* the region tabs along the bottom edge, on a dark plate; they step aside once the reader scrolls */}
        <div className={cn('bg-[color:var(--plate)]', FADE_SOON, moved && 'pointer-events-none')} aria-hidden={moved || undefined} {...({ inert: moved ? '' : undefined } as Record<string, unknown>)}>
          <div
            className={cn(shell, 'flex items-start gap-4 py-5')}
            onFocus={() => setHeld(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false) }}
          >
            <ToggleGroup.Root
              type="single"
              value={region}
              onValueChange={(v) => { if (v) pick(v) }}
              aria-label="Region shown"
              className="grid flex-1 grid-cols-3 gap-x-4 gap-y-3 md:grid-cols-6 md:gap-x-6"
            >
              {REGIONS.map((r) => (
                <ToggleGroup.Item
                  key={r.id}
                  value={r.id}
                  className={cn('relative pt-3 text-left text-sm leading-5 text-[color:var(--bone2)] hover:text-[color:var(--bone)] data-[state=on]:text-[color:var(--bone)]', ease, focusRing)}
                >
                  <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-[color:var(--bone-20)]" />
                  {r.id === region ? (
                    <span
                      key={touring ? 'tour' : 'still'}
                      aria-hidden
                      onAnimationEnd={touring ? next : undefined}
                      style={{ animationPlayState: running ? 'running' : 'paused' }}
                      className={cn('absolute inset-x-0 top-0 h-0.5 origin-left bg-[color:var(--bone)]', touring && DWELL)}
                    />
                  ) : null}
                  {phrase(r.id).short}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
            {touring ? (
              <button
                type="button"
                onClick={() => setPaused((v) => !v)}
                aria-label={paused ? 'Resume the tour of the regions' : 'Pause the tour of the regions'}
                className={cn('mt-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded text-[color:var(--bone2)] hover:text-[color:var(--bone)]', ease, focusRing)}
              >
                {paused ? <Play size={16} strokeWidth={1.5} aria-hidden /> : <Pause size={16} strokeWidth={1.5} aria-hidden />}
              </button>
            ) : null}
          </div>
        </div>
        </div>
        </div>
      </section>

      {/* the verdict and the way in, rising under the framed photograph */}
      <section id="verdict" aria-labelledby="verdict-h" className={cn('relative z-10 scroll-mt-4', hold && '-mt-[40svh]')}>
        <div className={cn(shell, 'grid grid-cols-1 py-16 xl:grid-cols-12 xl:gap-x-6 xl:py-20')}>
          <div className="xl:col-span-8">
            <h2 id="verdict-h" className={titleLarge}>{verdictHeadline(d)}</h2>
            <p className="mt-6 max-w-[var(--measure)] text-lg text-[color:var(--bone2)]">{look} {change}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={app} onClick={leave} className={primaryButton}>
                <span>Open the audit<span className="hidden sm:inline"> for {d.phrase.the}</span></span>
                <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
              </a>
              <a href="#how" className={secondaryButton}>How it works</a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

/* ---------- App opening: the statement, framed as you scroll (a zoom-out reveal), the verdict rising under it ---------- */

/** The region's photograph at full bleed with its name, held for one screen of scrolling while the photograph closes in
 *  to a framed picture and settles from 1.12 to 1; the name rides the frame's lower edge, shrinks a little and fades.
 *  Without motion it is a still statement. */
function AppStatement({ d }: { d: RegionData }) {
  const motion = useMotion()
  const sectionRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const p = photoFor(d.id)
  useStage(sectionRef, stageRef, motion.on)

  return (
    <section ref={sectionRef} id="top" aria-labelledby="region-h" className={cn('relative', motion.on ? 'h-[200svh]' : 'h-[78svh] max-h-[1040px] min-h-[560px]')}>
      <div
        ref={stageRef}
        style={{ '--p': 0 } as CSSProperties}
        className={cn('sticky top-0 overflow-hidden bg-[color:var(--ground)]', FRAME, motion.on ? 'h-[100svh]' : 'h-full')}
      >
        <div className={cn('absolute inset-0', FRAME_CLIP)}>
          <img
            key={d.id}
            src={p.src}
            srcSet={`${p.srcSm} 720w, ${p.src} 1920w`}
            sizes="100vw"
            alt={p.alt}
            width={p.width}
            height={p.height}
            style={{ objectPosition: p.focus }}
            className={cn('absolute inset-0 size-full animate-[anchor-fade_600ms_cubic-bezier(0.22,1,0.36,1)] object-cover', SETTLE)}
          />
          <div aria-hidden className="absolute inset-0 bg-[image:var(--scrim-statement)]" />
        </div>
        <div className={cn('absolute inset-x-0 bottom-0', RIDE, FADE_NAME)}>
          <div className={cn(shell, 'pb-8 sm:pb-10')}>
            <MockTag show={d.mock} className="mb-4 inline-block bg-[color:var(--plate)] sm:hidden" />
            <h1 id="region-h" className={cn(statement, SHRINK)}>
              <span key={d.id} className="block animate-[anchor-fade_600ms_cubic-bezier(0.22,1,0.36,1)]">{statementName(d.id)}</span>
            </h1>
          </div>
        </div>
        {motion.on ? (
          <div aria-hidden className={cn('absolute bottom-6 right-4 flex items-center gap-2 text-xs text-[color:var(--bone2)] sm:right-8', FADE_SOON)}>
            Scroll
            <ArrowDown size={14} strokeWidth={1.5} />
          </div>
        ) : null}
      </div>
    </section>
  )
}

/** The verdict, rising into the space under the framed photograph during the last part of the opening, then the reel. */
function AppVerdict({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const motion = useMotion()
  const { look, change } = verdictLines(d)
  return (
    <section id="verdict" aria-labelledby="verdict-h" className={cn('relative z-10 scroll-mt-20', motion.on && '-mt-[40svh]')}>
      <div className={cn(shell, 'grid grid-cols-1 pb-12 pt-6 xl:grid-cols-12 xl:gap-x-6 xl:pb-16')}>
        <div className="xl:col-span-8">
          <h2 id="verdict-h" className={titleLarge}>{verdictHeadline(d)}</h2>
          <p className="mt-6 max-w-[var(--measure)] text-lg text-[color:var(--bone2)]">{look} {change}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#calendar" className={primaryButton}>
              Explore the calendar
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
            </a>
            <button type="button" onClick={() => downloadSummary(d)} className={secondaryButton}>Download summary</button>
          </div>
        </div>
      </div>
      <div className="border-y border-[color:var(--hairline)] bg-[color:var(--surface)]">
        <PassReel d={d} year={year} onYear={onYear} />
      </div>
    </section>
  )
}

/* ---------- Pass line: when each satellite looked, 06:00 to 18:00 ---------- */

const AXIS_FROM = 6
const AXIS_TO = 18
const HOURS = Array.from({ length: AXIS_TO - AXIS_FROM + 1 }, (_, i) => AXIS_FROM + i)
const LABELLED = HOURS.filter((h) => (h - AXIS_FROM) % 2 === 0)
const at = (hours: number) => ((hours - AXIS_FROM) / (AXIS_TO - AXIS_FROM)) * 100
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

/** When each satellite looked, as a reel of years: drag or arrow through the frames and the large frame
 *  crossfades from year to year, so Aqua's mark walks later; each strip cell zooms on the fixed clock and Aqua. */
const MONTH_NOTCHES = Array.from({ length: 12 }, (_, k) => k)

function PassReel({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const motion = useMotion()
  const years = d.drift.map((r) => r.year)
  const dr = d.driftAt(year)
  const frames = useMemo(() => {
    return d.drift.map((r) => {
      return {
        id: String(r.year),
        valueText: `${r.year}: Terra ${r.terra_lst}, fixed clock ${r.viirs_lst}, Aqua ${r.aqua_lst}`,
        preview: <PassFigure dr={r} year={r.year} />,
        // a ruler: a notch per month, a taller one where the year starts, the tallest mid-year under the playhead
        thumb: (
          <div className="absolute inset-0">
            {MONTH_NOTCHES.map((k) => (
              <span
                key={k}
                style={{ left: `${(k / 12) * 100}%` }}
                className={cn(
                  'absolute top-0 w-px bg-[color:var(--bone-30)] group-data-[active=true]:bg-[color:var(--bone-80)]',
                  k === 6 ? 'h-5' : k === 0 ? 'h-3' : 'hidden h-1.5 sm:block',
                )}
              />
            ))}
            <span className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 text-xs leading-4 tabular-nums text-[color:var(--bone3)] group-data-[active=true]:text-[color:var(--bone)] sm:block">{r.year}</span>
          </div>
        ),
      }
    })
  }, [d])
  if (!dr || !frames.length) {
    return <div className={cn(shell, 'py-6')}><p className="text-sm text-[color:var(--bone2)]">Look times for {d.phrase.the} are not in the data yet.</p></div>
  }
  const shift = minutesBetween(dr.aqua_lst, dr.viirs_lst)
  const reelVars = { '--fs-accent': 'var(--bone)', '--fs-cell': 'var(--surface)' } as CSSProperties
  return (
    <div className={cn(shell, 'py-6')} style={reelVars}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-sm text-[color:var(--bone2)]">When each satellite looked · drag along the years</p>
        <p className="text-sm tabular-nums text-[color:var(--bone)]">
          {year} · Aqua {dr.aqua_lst}, {Math.abs(shift)} min {shift >= 0 ? 'after' : 'before'} the fixed clock
        </p>
      </div>
      <FilmstripScrub
        frames={frames}
        frameIndex={Math.max(0, years.indexOf(year))}
        onFrameIndexChange={(i) => onYear(years[i])}
        scrubberLabel="Year shown on the reel"
        variant="ruler"
        still={!motion.on}
        playheadClassName="sm:bottom-5"
        previewClassName="mt-4 h-28 sm:h-32"
        stripClassName="mt-4 h-8 sm:h-12"
      />
      <div aria-hidden className="mt-2 flex justify-between text-xs tabular-nums text-[color:var(--bone3)] sm:hidden">
        <span>{years[0]}</span><span>{years[years.length - 1]}</span>
      </div>
    </div>
  )
}

/** When each satellite looked in one year, as an instrument line on a 06:00 to 18:00 axis. Each satellite has its own
 *  marker and pin: Aqua, the one that drifts, a filled dot under a solid flag carrying its time and the minutes it added;
 *  the fixed clock a sage diamond; Terra a hollow ring. The drift itself is a bar on the axis from the fixed clock to Aqua.
 *  Colours come from the page tokens, so the figure works on black and, re-inked, on the bone band. */
function PassFigure({ dr, year }: { dr: Drift; year: number }) {
  const shift = minutesBetween(dr.aqua_lst, dr.viirs_lst)
  const later = shift >= 0
  const xa = at(hm(dr.aqua_lst))
  const xf = at(hm(dr.viirs_lst))
  const xt = at(hm(dr.terra_lst))
  const vars = {
    '--xa': `${xa}%`,
    '--xf': `${xf}%`,
    '--xt': `${xt}%`,
    '--bar-x': `${Math.min(xa, xf)}%`,
    '--bar-k': `${Math.abs(xa - xf) / 100}`,
  } as CSSProperties
  const description = `When each satellite looked in ${year}: Terra ${dr.terra_lst}, fixed clock ${dr.viirs_lst}, Aqua ${dr.aqua_lst}, ${Math.abs(shift)} minutes ${later ? 'after' : 'before'} the fixed clock`
  // each satellite rides a full-width layer moved with translateX, so a change of year slides it (instant without motion)
  const layer = cn('absolute inset-x-0 top-0 h-full', slideEase)
  const axis = 'top-20 sm:top-24' // 80 px, 96 px
  const marker = cn('absolute left-0 -translate-x-1/2 -translate-y-1/2', axis)
  const label = 'absolute whitespace-nowrap text-xs leading-4 sm:text-sm sm:leading-5'
  // Aqua's flag hangs centred over its pin, and turns to hang leftwards near the right edge
  const flagSide = xa > 84 ? '-translate-x-full left-px' : xa < 12 ? '-left-px' : '-translate-x-1/2'

  return (
    <div role="img" aria-label={description} style={vars} className="relative h-28 overflow-hidden sm:h-32">
      {/* the day, 06:00 to 18:00 */}
      <span aria-hidden className={cn('absolute inset-x-0 h-px bg-[color:var(--bone-30)]', axis)} />
      {HOURS.map((h) => (
        <span
          key={h}
          aria-hidden
          style={{ '--xh': `${at(h)}%` } as CSSProperties}
          className={cn('absolute left-[var(--xh)] h-1.5 w-px -translate-y-1/2 bg-[color:var(--bone-30)]', axis)}
        />
      ))}
      {LABELLED.map((h, i) => (
        <span
          key={h}
          aria-hidden
          style={{ '--xh': `${at(h)}%` } as CSSProperties}
          className={cn(
            'absolute left-[var(--xh)] top-23 text-xs leading-4 text-[color:var(--bone3)] sm:top-27',
            i === 0 ? '' : i === LABELLED.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
          )}
        >
          {hourLabel(h)}
        </span>
      ))}
      {/* the minutes the later look added: a bar along the axis from the fixed clock to Aqua */}
      <span
        aria-hidden
        className={cn('absolute inset-x-0 h-1 origin-left -translate-y-1/2 translate-x-[var(--bar-x)] scale-x-[var(--bar-k)] bg-[color:var(--bone-80)]', axis, slideEase)}
      />

      {/* Terra: a hollow ring, the lowest label, set to the left of its pin */}
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xt)]')}>
        <span className="absolute left-0 top-[62px] h-[18px] w-px -translate-x-1/2 bg-[color:var(--bone3)] sm:top-[74px] sm:h-[22px]" />
        <span className={cn(marker, 'size-2.5 rounded-full border-2 border-[color:var(--bone3)] bg-[color:var(--figure-bg,var(--surface))]')} />
        <span className={cn(label, '-left-2 top-[46px] -translate-x-full text-[color:var(--bone3)] sm:top-[54px]')}>Terra {dr.terra_lst}</span>
      </div>

      {/* the fixed clock: a sage diamond; its label sits on the side away from Aqua, so the two never touch */}
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xf)]')}>
        <span className="absolute left-0 top-[42px] h-[38px] w-px -translate-x-1/2 bg-[color:var(--sage)] sm:top-[50px] sm:h-[46px]" />
        <span className={cn(marker, 'size-2.5 rotate-45 bg-[color:var(--sage)]')} />
        <span className={cn(label, 'top-[26px] text-[color:var(--sage)] sm:top-[30px]', later ? '-left-2 -translate-x-full' : 'left-2')}>
          Fixed clock {dr.viirs_lst}
        </span>
      </div>

      {/* Aqua: the one that moves; a solid flag with its time and the minutes it added, a filled dot on the axis */}
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xa)]')}>
        <span className="absolute left-0 top-5 h-15 w-0.5 -translate-x-1/2 bg-[color:var(--bone)] sm:top-6 sm:h-18" />
        <span className={cn(marker, 'size-3 rounded-full bg-[color:var(--bone)] ring-2 ring-[color:var(--figure-bg,var(--surface))]')} />
        <span
          className={cn(
            'absolute top-0 flex h-5 items-center gap-1.5 whitespace-nowrap rounded-[3px] bg-[color:var(--bone)] px-1.5 text-xs font-medium text-[color:var(--figure-on,var(--ink))] sm:h-6 sm:px-2 sm:text-sm',
            flagSide,
          )}
        >
          Aqua {dr.aqua_lst}
          <span className="font-normal opacity-75">{later ? '+' : '−'}{Math.abs(shift)} min</span>
        </span>
      </div>
    </div>
  )
}

/* ---------- Three passes, one day: one frame, switched between the passes ---------- */

const AMAZON_2026 = regionData('br-amazon').driftAt(2026)
type PassKey = 'terra' | 'viirs' | 'aqua'
const PASSES: { key: PassKey; name: string; when: string; control: string; look?: string; wide: string; square: string; fit: string; alt: string }[] = [
  {
    key: 'terra', name: 'Terra', when: 'morning', control: 'Terra', look: AMAZON_2026?.terra_lst,
    wide: `${IMG}amazon-terra-2026-09-04.jpg`, square: `${IMG}prints/amazon-terra-sq.jpg`, fit: 'object-left',
    alt: 'Terra, morning pass, 4 Sep 2026: hazy smoke and a few clouds over the forest',
  },
  {
    key: 'viirs', name: 'VIIRS', when: 'fixed clock', control: 'VIIRS (fixed clock)', look: AMAZON_2026?.viirs_lst,
    wide: `${IMG}amazon-viirs-2026-09-04.jpg`, square: `${IMG}prints/amazon-viirs-sq.jpg`, fit: 'object-center',
    alt: 'VIIRS, early afternoon pass on the fixed clock, 4 Sep 2026: small cumulus clouds spread across the same forest',
  },
  {
    key: 'aqua', name: 'Aqua', when: 'later afternoon', control: 'Aqua', look: AMAZON_2026?.aqua_lst,
    wide: `${IMG}amazon-aqua-2026-09-04.jpg`, square: `${IMG}prints/amazon-aqua-sq.jpg`, fit: 'object-center',
    alt: 'Aqua, later afternoon pass, 4 Sep 2026: towering clouds over the same forest',
  },
]

function Passes({ d }: { d: RegionData }) {
  const [shown, setShown] = useState<PassKey>('aqua')
  const active = PASSES.find((p) => p.key === shown) ?? PASSES[2]
  const example = d.id !== 'br-amazon'
  return (
    <section id="clock" aria-labelledby="passes-h" className={cn(shell, 'py-24')}>
      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-4">
          <h2 id="passes-h" className={title}>By the later afternoon pass, clouds have built over the same forest</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            Same place on 4 Sep 2026, seen in the morning, early afternoon and later afternoon. Fires and clouds change
            through the day, so a later look can count more fires or fewer; the audit measures which, and by how much.
          </p>
          <ToggleGroup.Root
            type="single"
            value={shown}
            onValueChange={(v) => { if (v) setShown(v as PassKey) }}
            aria-label="Pass shown in the frame"
            className="mt-8 grid grid-cols-3 gap-2"
          >
            {PASSES.map((p) => (
              <ToggleGroup.Item key={p.key} value={p.key} className={cn('group block min-w-0 text-left', focusRing)}>
                <span className="relative block aspect-square overflow-hidden bg-[color:var(--surface)]">
                  <img
                    src={p.square}
                    alt=""
                    width={720}
                    height={720}
                    loading="lazy"
                    className="size-full object-cover opacity-50 transition-opacity duration-150 ease-[var(--ease)] group-hover:opacity-80 group-data-[state=on]:opacity-100"
                  />
                  <span aria-hidden className="absolute inset-0 hidden shadow-[var(--ring-in)] group-data-[state=on]:block" />
                </span>
                <span className={cn('mt-2 block truncate text-xs text-[color:var(--bone2)] group-hover:text-[color:var(--bone)] group-data-[state=on]:text-[color:var(--bone)] sm:text-sm', ease)}>
                  {p.control}
                </span>
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </div>

        <figure className="m-0 lg:col-span-8">
          <div role="img" aria-label={active.alt} className="relative aspect-5/4 overflow-hidden bg-[color:var(--surface)]">
            {PASSES.map((p) => (
              <img
                key={p.key}
                src={p.wide}
                alt=""
                width={936}
                height={720}
                loading="lazy"
                className={cn(
                  'absolute inset-0 size-full object-cover transition-opacity duration-240 ease-[var(--ease)] motion-reduce:transition-none',
                  p.fit,
                  p.key === shown ? 'opacity-100' : 'opacity-0',
                )}
              />
            ))}
            <div aria-hidden className="absolute inset-0 bg-[image:var(--scrim-tile)]" />
            <div aria-hidden className="absolute bottom-4 left-4 right-4">
              <p className="text-sm font-medium text-[color:var(--bone)]">{active.name} · {active.when}</p>
              {active.look ? <p className="mt-1 text-xs text-[color:var(--bone-80)]">Typical look {active.look} in 2026</p> : null}
            </div>
          </div>
          <figcaption className="mt-4 text-xs text-[color:var(--bone3)]">
            {example ? 'Example scene: Amazon, 4 Sep 2026 · ' : ''}Imagery: NASA Worldview / GIBS, true colour
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

/* ---------- Two clocks: Terra and Aqua as probes, their difference, and the fire-day curve they trace ---------- */

/** A ratio against 2012-2020 (1 = no change) as a percent change; a log difference as a percent change. */
const asPct = (ratio: number) => (ratio - 1) * 100
const logPct = (v: number) => (Math.exp(v) - 1) * 100

function niceTicks(lo: number, hi: number) {
  const span = hi - lo || 1
  const step = span <= 12 ? 2 : span <= 24 ? 5 : span <= 60 ? 10 : 20
  const d0 = Math.floor(lo / step) * step
  const d1 = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = d0; v <= d1 + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { d0, d1: d1 === d0 ? d0 + step : d1, ticks }
}

/** The section's title, from the latest year in the file: a direction is named only when the range clears zero. */
function twoClocksHeading(d: RegionData) {
  const last = [...d.two].reverse().find((t) => Number.isFinite(t.clock_diff))
  if (!last) return `The two clocks for ${d.phrase.the} are not in the data yet`
  const v = logPct(last.clock_diff)
  const lo = logPct(last.clock_lo)
  const hi = logPct(last.clock_hi)
  if (lo > 0 || hi < 0) return `In ${last.year}, with shared orbit sampling cancelled, Aqua's count sits ${Math.round(Math.abs(v))}% ${v > 0 ? 'above' : 'below'} Terra's`
  return `In ${last.year} the two clocks agree within their range once shared orbit sampling is cancelled`
}

function TwoClocks({ d, year, onYear, small }: { d: RegionData; year: number; onYear: (y: number) => void; small: boolean }) {
  const two = d.two
  const [inspect, setInspect] = useState<number | null>(null)
  const selected = two.findIndex((t) => t.year === year)
  const shownIndex = inspect ?? (selected >= 0 ? selected : two.length - 1)
  const t = two[shownIndex]
  const labels = two.map((x) => String(x.year))
  const probes: Series[] = [
    { id: 'aqua', label: 'Aqua', marker: 'filled', color: 'var(--bone)', values: two.map((x) => asPct(x.A)), lo: two.map((x) => asPct(x.A_lo)), hi: two.map((x) => asPct(x.A_hi)) },
    { id: 'terra', label: 'Terra', marker: 'hollow', color: 'var(--bone3)', values: two.map((x) => asPct(x.T)), lo: two.map((x) => asPct(x.T_lo)), hi: two.map((x) => asPct(x.T_hi)) },
  ]
  const difference: AnomalyPoint[] = two.map((x) => {
    const v = logPct(x.clock_diff)
    const lo = logPct(x.clock_lo)
    const hi = logPct(x.clock_hi)
    return { id: String(x.year), label: String(x.year), value: v, range: [lo, hi], outside: lo > 0 || hi < 0, valueText: `${x.year}: Aqua against Terra ${pct(v)}, range ${fmtRange(lo, hi)}` }
  })
  const columnText = (i: number) => {
    const x = two[i]
    return `${x.year}: Aqua ${pct(asPct(x.A))} looking at ${x.aqua_lst}, Terra ${pct(asPct(x.T))} looking at ${x.terra_lst}, each against 2012 to 2020`
  }
  const first = two[0]
  const last = two[two.length - 1]
  const way = (a: string, b: string) => (hm(b) < hm(a) ? 'earlier' : hm(b) > hm(a) ? 'later' : 'at the same time')
  const ink = { fg: 'var(--bone2)', grid: 'var(--hairline)', surface: 'var(--ground)', guide: 'var(--bone)' }
  const diffVars = {
    '--ac-line': 'var(--bone)', '--ac-fg': 'var(--bone2)', '--ac-surface': 'var(--ground)', '--ac-band': 'transparent',
    '--ac-grid': 'var(--hairline)', '--ac-zero': 'var(--bone-30)',
  } as CSSProperties
  const pick = (i: number) => onYear(two[i].year)
  const caption = (head: string, line: string) => (
    <figcaption className="mb-4">
      <span className="block text-lg font-medium">{head}</span>
      <span className="mt-1 block max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">{line}</span>
    </figcaption>
  )

  return (
    <section id="two-clocks" aria-labelledby="two-h" className="scroll-mt-20 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="two-h" className={title}>{twoClocksHeading(d)}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            Terra and Aqua carry the same camera. Since 2021 Terra has looked earlier and Aqua later, each counted against the
            same VIIRS reference. Dividing one by the other cancels what both share, the orbit's sampling of the region, and
            leaves the clock.
          </p>
          {t ? (
            <dl aria-live="polite" className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-[color:var(--hairline)] pt-4 text-sm">
              <dt className="text-[color:var(--bone3)]">Year</dt>
              <dd className="tabular-nums">{t.year}</dd>
              <dt className="text-[color:var(--bone3)]">Aqua</dt>
              <dd className="tabular-nums">{pct(asPct(t.A))} at {t.aqua_lst} <span className="text-[color:var(--bone3)]">{fmtRange(asPct(t.A_lo), asPct(t.A_hi))}</span></dd>
              <dt className="text-[color:var(--bone3)]">Terra</dt>
              <dd className="tabular-nums">{pct(asPct(t.T))} at {t.terra_lst} <span className="text-[color:var(--bone3)]">{fmtRange(asPct(t.T_lo), asPct(t.T_hi))}</span></dd>
              <dt className="text-[color:var(--bone3)]">Aqua against Terra</dt>
              <dd className="tabular-nums">{pct(logPct(t.clock_diff))} <span className="text-[color:var(--bone3)]">{fmtRange(logPct(t.clock_lo), logPct(t.clock_hi))}</span></dd>
              <dt className="text-[color:var(--bone3)]">Shared sampling</dt>
              <dd className="tabular-nums">{pct(logPct(t.sampling_est))} <span className="text-[color:var(--bone3)]">cancelled</span></dd>
            </dl>
          ) : null}
        </div>

        {two.length ? (
          <div className="flex min-w-0 flex-col gap-16 lg:col-span-8">
            <figure className="m-0">
              {caption('The two probes', 'Each satellite’s count against VIIRS, 2012–2020 = 0. Hover or step through the years.')}
              <SeriesChart
                labels={labels}
                series={probes}
                reference={{ value: 0, label: 'VIIRS reference', color: 'var(--sage)' }}
                height={small ? 220 : 260}
                activeIndex={shownIndex}
                selectedIndex={selected >= 0 ? selected : null}
                onInspect={setInspect}
                onSelect={pick}
                groupLabel={`Terra and Aqua against VIIRS for ${d.name}`}
                columnText={columnText}
                formatTick={tickText}
                ink={ink}
              />
            </figure>
            <figure className="m-0" style={diffVars}>
              {caption('The difference, with shared sampling cancelled', 'Aqua’s change against Terra’s each year; a range clear of zero is the clock.')}
              <AnomalyChart
                points={difference}
                height={small ? 200 : 220}
                activeIndex={shownIndex}
                selectedIndex={selected >= 0 ? selected : null}
                onInspect={setInspect}
                onSelect={pick}
                groupLabel={`Aqua against Terra for ${d.name}`}
                formatTick={tickText}
                legend={{ outside: 'Range clear of zero', inside: 'Range overlaps zero', range: 'Range' }}
              />
            </figure>
            <figure className="m-0">
              {caption(
                'The fire-day curve',
                `Where each satellite looked, and what it counted there. From ${first.year} to ${last.year} Terra’s look moved ${way(first.terra_lst, last.terra_lst)} and Aqua’s ${way(first.aqua_lst, last.aqua_lst)}; VIIRS is the fixed reference. Together the points trace the day.`,
              )}
              <DayCurve d={d} active={shownIndex} small={small} />
            </figure>
            <p className="text-xs text-[color:var(--bone3)]">Source: twoclocks/{d.id}.json{d.twoMock ? ' · MOCK' : ''}</p>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--bone2)] lg:col-span-8">The two-clocks test for {d.phrase.the} is not in the data yet.</p>
        )}
      </div>
    </section>
  )
}

/** Where each satellite looked and what it counted there, year by year, on a clock of the day: Terra's points (hollow),
 *  Aqua's (filled) and the VIIRS reference (a sage diamond at zero, by definition), joined in time order into the curve
 *  they trace. Every point comes straight from the file; nothing is fitted. */
function DayCurve({ d, active, small }: { d: RegionData; active: number; small: boolean }) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const width = useMeasuredWidth(boxRef)
  const two = d.two
  const terra = two.map((t) => ({ x: hm(t.terra_lst), y: asPct(t.T), year: t.year }))
  const aqua = two.map((t) => ({ x: hm(t.aqua_lst), y: asPct(t.A), year: t.year }))
  const viirsAt = d.driftAt(two[active]?.year ?? two[two.length - 1]?.year ?? 2025)?.viirs_lst
  const ref = viirsAt ? { x: hm(viirsAt), y: 0, year: 0 } : null
  const all = [...terra, ...aqua, ...(ref ? [ref] : [])]
  const x0 = Math.floor(Math.min(...all.map((p) => p.x)) - 0.5)
  const x1 = Math.ceil(Math.max(...all.map((p) => p.x)) + 0.5)
  const sc = niceTicks(Math.min(0, ...all.map((p) => p.y)), Math.max(0, ...all.map((p) => p.y)))
  const height = small ? 220 : 260
  const M = { top: 16, right: 16, bottom: 32, left: 48 }
  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = height - M.top - M.bottom
  const X = (h: number) => M.left + ((h - x0) / (x1 - x0)) * plotW
  const Y = (v: number) => M.top + (1 - (v - sc.d0) / (sc.d1 - sc.d0)) * plotH
  const hours = Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i)
  const curve = [...all].sort((a, b) => a.x - b.x)
  const path = (pts: { x: number; y: number }[]) => pts.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')
  const lastT = terra[terra.length - 1]
  const lastA = aqua[aqua.length - 1]
  const description = two.length
    ? `Fire-day curve for ${d.name}: Terra looked from ${two[0].terra_lst} to ${two[two.length - 1].terra_lst} and counted ${pct(terra[0].y)} to ${pct(lastT.y)} against 2012 to 2020; Aqua looked from ${two[0].aqua_lst} to ${two[two.length - 1].aqua_lst} and counted ${pct(aqua[0].y)} to ${pct(lastA.y)}${viirsAt ? `; VIIRS, the reference, looked at ${viirsAt}` : ''}.`
    : `Fire-day curve for ${d.name}: not in the data yet.`

  return (
    <div ref={boxRef} role="img" aria-label={description} className="relative w-full" style={{ height }}>
      {width > 0 && two.length ? (
        <svg width={width} height={height} aria-hidden className="absolute inset-0 block overflow-visible">
          {sc.ticks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={M.left + plotW} y1={Y(v)} y2={Y(v)} stroke="var(--hairline)" shapeRendering="crispEdges" />
              <text x={M.left - 8} y={Y(v)} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--bone2)">{tickText(v)}</text>
            </g>
          ))}
          {hours.map((h) => (
            <text key={h} x={X(h)} y={M.top + plotH + 20} textAnchor="middle" fontSize={12} fill="var(--bone2)">{hourLabel(h)}</text>
          ))}
          {/* the curve the points trace through the day */}
          <polyline points={path(curve)} fill="none" stroke="var(--bone-20)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          {/* each satellite's path, year by year */}
          <polyline points={path(terra)} fill="none" stroke="var(--bone3)" strokeWidth={1} />
          <polyline points={path(aqua)} fill="none" stroke="var(--bone)" strokeWidth={1} />
          {terra.map((p, i) => (
            <circle key={`t${p.year}`} cx={X(p.x)} cy={Y(p.y)} r={i === active ? 5.5 : 3.5} fill="var(--ground)" stroke="var(--bone3)" strokeWidth={2} />
          ))}
          {aqua.map((p, i) => (
            <circle key={`a${p.year}`} cx={X(p.x)} cy={Y(p.y)} r={i === active ? 5.5 : 3.5} fill="var(--bone)" stroke="var(--ground)" strokeWidth={i === active ? 2 : 1} />
          ))}
          {ref ? (
            <g>
              <rect x={X(ref.x) - 5} y={Y(0) - 5} width={10} height={10} transform={`rotate(45 ${X(ref.x)} ${Y(0)})`} fill="var(--sage)" />
              <text x={X(ref.x)} y={Y(0) + 20} textAnchor="middle" fontSize={12} fill="var(--sage)" stroke="var(--ground)" strokeWidth={4} paintOrder="stroke">VIIRS {viirsAt}</text>
            </g>
          ) : null}
          <text x={X(lastT.x) - 10} y={Y(lastT.y)} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--bone2)" stroke="var(--ground)" strokeWidth={4} paintOrder="stroke">Terra {two[two.length - 1].year}</text>
          <text x={X(lastA.x) + 10} y={Y(lastA.y)} dominantBaseline="central" fontSize={12} fill="var(--bone)" stroke="var(--ground)" strokeWidth={4} paintOrder="stroke">Aqua {two[two.length - 1].year}</text>
        </svg>
      ) : null}
    </div>
  )
}

/* ---------- How do we know? The pre-registered checks, P1-P10 ---------- */

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve']
const STATUS: Record<Check['status'], string> = { pass: 'Passes', fail: 'Fails', pending: 'Still to run' }

function checksHeading(cs: Check[]) {
  const n = cs.length
  const pass = cs.filter((c) => c.status === 'pass').length
  const fail = cs.filter((c) => c.status === 'fail').length
  const pending = n - pass - fail
  if (!n) return 'The checks are not in the data yet'
  if (pending === n) return `${COUNT_WORDS[n] ?? n} checks, written down before the results, still to run`
  return [`${pass} of ${n} checks pass`, fail ? `${fail} ${fail === 1 ? 'fails' : 'fail'}` : '', pending ? `${pending} still to run` : ''].filter(Boolean).join(', ')
}

/** The team names INPE only once its reproduction (P3) matches; until then a check speaks of the official series. */
function checkText(c: Check, inpeConfirmed: boolean) {
  return inpeConfirmed ? c.name : c.name.replace(/INPE's/g, 'the official').replace(/\bINPE\b/g, 'the official series')
}

function StatusMark({ status }: { status: Check['status'] }) {
  if (status === 'pass') {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
        <circle cx={7} cy={7} r={7} fill="var(--bone)" />
        <path d="M4 7.2 6.1 9.2 10 5" fill="none" stroke="var(--ink)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (status === 'fail') {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
        <rect x={1} y={1} width={12} height={12} fill="none" stroke="var(--bone)" strokeWidth={1.6} />
        <path d="M4.5 4.5 9.5 9.5M9.5 4.5 4.5 9.5" stroke="var(--bone)" strokeWidth={1.6} strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
      <circle cx={7} cy={7} r={6} fill="none" stroke="var(--bone3)" strokeWidth={1.6} />
    </svg>
  )
}

function Checks() {
  const { checks, mock } = CHECKS
  const inpe = checks.find((c) => c.id === 'P3')?.status === 'pass'
  return (
    <section id="checks" aria-labelledby="checks-h" className="scroll-mt-20 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="checks-h" className={title}>{checksHeading(checks)}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            How do we know? Each check was written down in the team’s plan before the results came in. Their status updates
            as the pipeline runs.
          </p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          <ol className="border-t border-[color:var(--hairline)]">
            {checks.map((c) => (
              <li key={c.id} className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-2 border-b border-[color:var(--hairline)] py-4 sm:grid-cols-[3rem_1fr_8rem]">
                <span className="text-sm tabular-nums text-[color:var(--bone3)]">{c.id}</span>
                <div className="min-w-0">
                  <p className="text-sm text-[color:var(--bone)]">{checkText(c, inpe)}</p>
                  {c.detail ? <p className="mt-1 text-xs text-[color:var(--bone2)]">{c.detail}</p> : null}
                </div>
                <span className="col-start-2 inline-flex items-center gap-2 text-xs text-[color:var(--bone2)] sm:col-start-auto sm:justify-end">
                  <StatusMark status={c.status} />
                  {STATUS[c.status]}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-[color:var(--bone3)]">Source: checks.json{mock ? ' · MOCK' : ''}</p>
        </div>
      </div>
    </section>
  )
}

/* ---------- Limits: the team's own caveats ---------- */

function Limits() {
  return (
    <section id="limits" aria-labelledby="limits-h" className="scroll-mt-20 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-6 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="limits-h" className={title}>What this audit can’t tell you</h2>
        </div>
        <div className="lg:col-span-8">
          <p className="max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">The team is writing this section.</p>
        </div>
      </div>
    </section>
  )
}

/* ---------- Landing: how Anchor reads a count, on a bone band ---------- */

function HowItWorks() {
  const motion = useMotion()
  const d = useMemo(() => regionData(FEATURED), [])
  const y = d.latestOk?.year ?? 2025
  const dr = d.driftAt(y)
  const { look } = verdictLines(d)
  const [ref, seen] = useInView<HTMLOListElement>(motion.on, 0.3)
  const steps = [
    { t: 'The reference satellite drifted', b: `Official counts follow Aqua, chosen because it always looked at about the same time of day. ${look}` },
    { t: 'Fires and clouds change through the day', b: 'So a later look can count more fires or fewer, and the official count moves with the satellite’s clock as well as with the fires. Which way, and by how much, is measured, never assumed.' },
    { t: 'Anchor holds the clock still', b: 'We recount every month on one fixed clock and report, per region and year, how much of the official change comes from the drift, with a range and a noise floor.' },
  ]
  // the pass figure, re-inked for the bone ground
  const inked = {
    '--bone': 'var(--ink)',
    '--bone3': '#4E514A',
    '--bone-30': 'rgba(11, 13, 11, 0.3)',
    '--bone-80': 'rgba(11, 13, 11, 0.8)',
    '--sage': '#4C5E50',
    '--figure-bg': '#ECE9E1',
    '--figure-on': '#ECE9E1',
  } as CSSProperties
  return (
    <section id="how" aria-labelledby="how-h" className="scroll-mt-4 bg-[color:var(--bone)] text-[color:var(--ink)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <Rise><h2 id="how-h" className={titleLarge}>How Anchor reads a fire count</h2></Rise>
          <p className="mt-4 max-w-[var(--measure)] text-sm">The Amazon in {y}, from the team’s data files{d.mock ? ' (mock for now)' : ''}.</p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          {dr ? <div style={inked}><PassFigure dr={dr} year={y} /></div> : null}
          {/* their rule + slide: each step's rule draws, then its words arrive from the left, 100 ms apart */}
          <ol ref={ref} className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <li key={s.t} className="relative pt-4">
                <span
                  aria-hidden
                  style={{ transitionDelay: `${i * 100}ms` }}
                  className={cn('absolute inset-x-0 top-0 h-px origin-left bg-[color:var(--ink)] transition-transform duration-1000 ease-[var(--ease)]', seen ? 'scale-x-100' : 'scale-x-0')}
                />
                <div
                  style={{ transitionDelay: `${200 + i * 100}ms` }}
                  className={cn('transition-[opacity,transform] duration-1000 ease-[var(--ease)]', seen ? 'translate-x-0 opacity-100' : '-translate-x-[10%] opacity-0')}
                >
                  <p className="text-lg font-medium">{s.t}</p>
                  <p className="mt-2 text-sm">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ---------- Landing: the six regions as photograph tiles ---------- */

function RegionIndex({ links, leave }: { links: Links; leave: Leave }) {
  const motion = useMotion()
  const [ref, seen] = useInView<HTMLUListElement>(motion.on, 0.2)
  return (
    <section id="regions" aria-labelledby="regions-h" className={cn(shell, 'scroll-mt-4 py-24')}>
      <div className="grid grid-cols-1 gap-y-4 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-4"><Rise><h2 id="regions-h" className={titleLarge}>Six regions, one fixed clock</h2></Rise></div>
        <p className="max-w-[var(--measure)] text-sm text-[color:var(--bone2)] lg:col-span-8 lg:self-end">
          Each audit opens on its verdict, then shows when each satellite looked, the clock effect year by year and the fire calendar.
        </p>
      </div>
      <ul ref={ref} className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {REGIONS.map((r, i) => (
          <RegionTile key={r.id} id={r.id} name={r.name} i={i} seen={seen} href={links.app(r.id)} leave={leave} />
        ))}
      </ul>
    </section>
  )
}

/** Their product tile: media, title, one line, ↗. */
function RegionTile({ id, name, i, seen, href, leave }: { id: string; name: string; i: number; seen: boolean; href: string; leave: Leave }) {
  const p = photoFor(id)
  const verdict = useMemo(() => verdictHeadline(regionData(id)), [id])
  return (
    <li
      style={{ transitionDelay: `${i * 80}ms` }}
      className={cn('transition-[opacity,transform] duration-500 ease-[var(--ease)]', seen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')}
    >
      <a href={href} onClick={leave} className={cn('group relative block aspect-4/3 overflow-hidden bg-[color:var(--surface)]', focusRing)}>
        <img
          src={p.srcSm}
          alt=""
          width={720}
          height={Math.round((720 * p.height) / p.width)}
          loading="lazy"
          style={{ objectPosition: p.focus }}
          className="size-full object-cover transition-transform duration-500 ease-[var(--ease)] group-hover:scale-[1.03]"
        />
        <span aria-hidden className="absolute inset-0 bg-[image:var(--scrim-card)]" />
        <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-lg font-medium text-[color:var(--bone)]">{name}</span>
            <span className="mt-1 block text-sm text-[color:var(--bone-80)]">{verdict}</span>
          </span>
          <ArrowUpRight
            size={18}
            strokeWidth={1.5}
            aria-hidden
            className="mb-0.5 shrink-0 text-[color:var(--bone)] transition-transform duration-300 ease-[var(--ease)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </span>
      </a>
    </li>
  )
}

/** Their closing slogan, as Anchor's tagline, with one last way in. */
function Closing({ href, leave }: { href: string; leave: Leave }) {
  return (
    <section aria-labelledby="close-h" className="border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'flex flex-col items-center py-24 text-center sm:py-32')}>
        <Rise>
          <h2 id="close-h" className={statement}>Count the fires, not the clock.</h2>
        </Rise>
        <a href={href} onClick={leave} className={cn(primaryButton, 'mt-10')}>
          Open the audit
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
        </a>
      </div>
    </section>
  )
}

/* ---------- Clock effect by year: the one sage band; 21st.dev's anomaly chart against the noise floor ---------- */

const tickText = (v: number) => (v === 0 ? '0%' : pct(v, 0))

function ClockEffect({ d, year, onYear, small }: { d: RegionData; year: number; onYear: (y: number) => void; small: boolean }) {
  const { why } = verdictLines(d)
  const n = noiseText(d)
  const [inspect, setInspect] = useState<number | null>(null)
  const selected = d.years.findIndex((y) => y.year === year)
  const latest = d.years.findIndex((y) => y.year === d.latestOk?.year)
  const shownIndex = inspect ?? (selected >= 0 ? selected : latest >= 0 ? latest : d.years.length - 1)
  const shown = d.years[shownIndex]
  const points = useMemo<AnomalyPoint[]>(
    () =>
      d.years.map((y) => ({
        id: String(y.year),
        label: String(y.year),
        value: y.gap,
        range: y.lo != null && y.hi != null ? [y.lo, y.hi] : null,
        expected: [-d.noise, d.noise],
        outside: y.verdict === 'clock',
        valueText:
          y.verdict === 'na'
            ? `${y.year}: not enough fires to measure`
            : `${y.year}: clock effect ${effectText(y)}, range ${rangeText(y)}, ${y.verdict === 'clock' ? 'clear of' : 'overlapping'} the ${n} noise floor`,
      })),
    [d, n],
  )
  const chartVars = {
    '--ac-line': 'var(--ink)',
    '--ac-fg': 'var(--ink)',
    '--ac-surface': 'var(--sage)',
    '--ac-band': 'var(--sage-band)',
    '--ac-grid': 'rgba(11, 13, 11, 0.12)',
    '--ac-zero': 'rgba(11, 13, 11, 0.5)',
  } as CSSProperties
  return (
    <section id="audit" aria-labelledby="audit-h" style={chartVars} className="scroll-mt-20 bg-[color:var(--sage)] text-[color:var(--ink)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="audit-h" className={title}>{effectHeading(d)}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm">
            How much Aqua's later look changed each year's {countName(d.id)}, with its range. A year whose whole range sits
            outside {n} shows a clock effect.
          </p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          {shown ? (
            <p aria-live="polite" className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <span className="tabular-nums">{shown.year}</span>
              <span className="text-lg font-medium">{shown.verdict === 'na' ? 'No reading' : effectText(shown)}</span>
              {shown.verdict !== 'na' ? <span className="tabular-nums">Range {rangeText(shown)}</span> : null}
              <span>{READING[shown.verdict]}</span>
            </p>
          ) : null}
          <AnomalyChart
            className="mt-4"
            points={points}
            height={small ? 240 : 300}
            activeIndex={shownIndex}
            selectedIndex={selected >= 0 ? selected : null}
            onInspect={setInspect}
            onSelect={(i) => onYear(d.years[i].year)}
            groupLabel={`Clock effect by year for ${d.name}`}
            bandLabel={`${n} noise floor`}
            formatTick={tickText}
            legend={{ outside: 'Range clear of the noise floor', inside: 'Range overlaps it', range: 'Range' }}
          />
          {why ? <p className="mt-6 max-w-[var(--measure)] text-sm">{why}</p> : null}
          <p className="mt-4 text-xs">Source: audit/{d.id}.json{d.mock ? ' · MOCK' : ''}</p>
        </div>
      </div>
    </section>
  )
}

/* ---------- Calendar ---------- */

function Calendar({ d, mode, onMode, small }: { d: RegionData; mode: CalendarMode; onMode: (m: CalendarMode) => void; small: boolean }) {
  const grid = useMemo(() => calendarGrid(d), [d])
  const f = calendarFinding(d)
  const finding = f ? `${f.label} sat furthest above its median, ${pct(f.anomaly, 0)}` : 'Every month in this range sits near its median'
  const [mon, yr] = f ? f.label.split(' ') : []
  const highlight = f ? { year: Number(yr), month: MONTHS.indexOf(mon) } : null
  const first = grid.years[grid.years.length - 1]
  const last = grid.years[0]
  const sentence =
    mode === 'anomaly'
      ? 'Each cell is a month on the fixed clock against the 2002–2025 median for that month: sand above, slate below.'
      : 'Each cell is a month on the fixed clock, shaded by its hotspot count: brighter sand, more hotspots.'

  return (
    <section id="calendar" aria-labelledby="calendar-h" className={cn(shell, 'pb-24 pt-24')}>
      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-4">
          <h2 id="calendar-h" className={title}>{finding}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">{sentence}</p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <ModeToggle value={mode} onChange={onMode} classes={modeClasses} />
            <span className="text-sm text-[color:var(--bone2)]">
              <span aria-hidden>{first} → {last}</span>
              <span className="sr-only">Years {first} to {last}</span>
            </span>
            <button
              type="button"
              onClick={() => downloadCalendarCsv(d)}
              className={cn('h-9 rounded text-sm text-[color:var(--bone2)] hover:text-[color:var(--bone)] sm:ml-auto', ease, focusRing)}
            >
              Download CSV
            </button>
          </div>
          <div className="mt-6 border-y border-[color:var(--hairline)] py-6">
            <FireCalendar
              years={grid.years}
              cells={grid.cells}
              maxCount={grid.maxCount}
              mode={mode}
              render="fill"
              cellHeight={small ? 20 : 24}
              monthLabels={small ? 'initial' : 'short'}
              highlight={highlight}
              label={`Fire calendar for ${d.name}, ${mode === 'anomaly' ? 'each month against its median' : 'fixed-clock hotspot count'}${f ? `; ${f.label} is ringed` : ''}`}
            />
          </div>
          {/* phones: keep the legend's phrases whole and its swatches narrower, so the ramp sits on one line */}
          <CalendarLegend mode={mode} render="fill" className="mt-4 [&_span]:whitespace-nowrap max-sm:[&_[aria-hidden]>span]:w-3" />
          <p className="mt-4 text-xs text-[color:var(--bone3)]">Source: calendar/{d.id}.json · VIIRS 375 m in Aqua-equivalent units{d.mock ? ' · MOCK' : ''}</p>
        </div>
      </div>
    </section>
  )
}
