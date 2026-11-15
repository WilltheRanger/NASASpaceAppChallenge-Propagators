// Round 2 · Direction D, "Field film" (Anduril-inspired, at the team's request), now two pages.
// Landing (D's original layout, kept): each region's name as a statement over its photograph at full bleed, the page
// stepping through the six regions until one is picked; how the audit reads a count on a bone band; the six regions as
// photograph tiles; the tagline. App: the verdict beside the region's photograph, the year reel on a ruler, the Earth
// seen from the Sun turning under the three orbits, the three passes of one day, the clock effect by year against the
// placebo range, then the calendar, the checks, detection, limits and who it's for.
// Black and bone; each satellite has one colour on chart lines and marks, never on a chart's background. Square media,
// 4 px on small controls. Motion follows Anduril's patterns as read from their code (designs/round-2/anduril-study.md),
// behind a footer switch seeded from the reader's reduced-motion setting.
// Every number comes from src/r2/data.ts; the MOCK labels follow each file's own "mock" flag. Region photographs and drone
// footage are credited in the footer. Pass imagery: NASA Worldview / GIBS, public domain.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { ArrowDown, ArrowRight, ArrowUpRight, Menu, Pause, Play } from 'lucide-react'
import { CalendarLegend, FireCalendar, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle, RegionSelect } from '@/r2/controls'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'
import {
  CHECKS, DETECTION, MONTHS, PROOF, REGIONS, SECTIONS, SEEN, calendarFinding, calendarGrid, fmtInt, fmtRange, hasOfficialSeries, hm, isValidation, minutesBetween, novemberRatio, pct, phrase, regionData, verdictHeadline, verdictLines,
  type Check, type DetectionRate, type RegionData, type Verdict,
} from '@/r2/data'
import { cn } from '@/lib/utils'
import { FilmstripScrub } from '@/components/ui/filmstrip-scrub'
import { AnomalyChart, type AnomalyPoint } from '@/components/ui/anomaly-chart'
import { SeriesChart, useMeasuredWidth, type Series } from '@/components/ui/series-chart'
import { OrbitGlobe, type GlobeOrbit } from '@/components/ui/orbit-globe'
import { PropagatorsLogo } from '@/components/brand/propagators-logo'
import { photoFor } from '@/r2/photos'

/* ---------- Tokens: black ground, bone text; the photographs carry the colour, and each satellite has one on the charts ---------- */

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
  // one colour per satellite on every chart and the globe; the markers' shapes carry the same identity
  '--sat-aqua': '#C8801F',
  '--sat-terra': '#448BCB',
  '--sat-viirs': '#49A46E',
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
const IN_COMP = new Set<string>(['verdict', 'clock', 'two-clocks', 'audit', 'calendar', 'checks', 'detection', 'limits', 'about'])

const READING: Record<Verdict, string> = { outside: 'Outside the 2012–2020 placebo range', within: 'Within the 2012–2020 placebo range', na: 'Too few hotspots to read' }
const DATA_NOTE = "Every number comes from the team's JSON files."

type AuditRow = RegionData['years'][number]
type Drift = RegionData['drift'][number]
const effectText = (y: AuditRow) => (y.gap == null ? '—' : pct(y.gap))
const rangeText = (y: AuditRow) => (y.lo == null || y.hi == null ? '—' : fmtRange(y.lo, y.hi))
/** the nine 2012-2020 placebo years' range, as the audit band draws it */
const placeboText = (d: RegionData) => `${pct(d.placebo[0])} to ${pct(d.placebo[1])}`

const defaultYear = (d: RegionData) => d.latestOk?.year ?? d.years[d.years.length - 1]?.year ?? d.lastDrift?.year ?? 2025

type Nav = 'dev' | 'artifact'
type Page = 'landing' | 'app'
type Links = { app: (r: string) => string; landing: (r: string) => string }
type Leave = (e: ReactMouseEvent<HTMLAnchorElement>) => void

/** Where the two pages live: query strings on the site (one index.html); two files in the comment artifact, the region
 *  in the hash. */
const linksFor = (nav: Nav): Links => ({
  app: (r) => (nav === 'artifact' ? `app.html#region=${r}` : `?page=app&region=${r}`),
  landing: (r) => (nav === 'artifact' ? `index.html#region=${r}` : `?region=${r}`),
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

const MOTION_KEY = 'propagators-motion'
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
    const root = document.getElementById('propagators-root')
    if (!href || href.startsWith('#') || !root?.animate) return
    e.preventDefault()
    root.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2}px`
    root.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.02)' }], { duration: 350, easing: EASE, fill: 'forwards' })
    window.setTimeout(() => { window.location.href = href }, 340)
  }
}

/** The audit band's heading: the latest readable years as the pipeline flags them, described, never as a cause. */
function effectHeading(d: RegionData) {
  if (isValidation(d.id)) return 'Punjab is our validation case: its audit years from 2023 have too few hotspots to read'
  let i = d.years.length - 1
  while (i >= 0 && d.years[i].verdict === 'na') i--
  if (i < 0) return `Too few hotspots in ${d.phrase.the} to read against the benchmark`
  const y = d.years[i]
  if (y.verdict === 'within') return `In ${y.year}, Aqua’s count for ${d.phrase.the} sat within its 2012–2020 placebo range`
  let s = i
  while (s > 0 && d.years[s - 1].verdict === 'outside') s--
  const span = s === i ? `In ${y.year}` : i - s === 1 ? `In ${d.years[s].year} and ${y.year}` : `From ${d.years[s].year} to ${y.year}`
  return `${span}, Aqua’s count for ${d.phrase.the} sat outside its 2012–2020 placebo range`
}

/** Where the official series and our reproduction meet, said once per Brazil region. */
const INPE_CONTEXT = 'INPE’s Programa Queimadas, Brazil’s official fire statistic, counts the hotspots of one reference satellite, Aqua. Our reproduction of its series matches it (check P3).'
const JETHVA = 'https://doi.org/10.3390/rs18101506'

/** The verdict's sentences, shared by the landing and the audit page; Punjab reads as the validation case. */
function VerdictBody({ d, size = 'lg' }: { d: RegionData; size?: 'lg' | 'sm' }) {
  const v = verdictLines(d)
  const lead = cn('max-w-[var(--measure)] text-[color:var(--bone2)]', size === 'lg' ? 'text-lg' : 'text-base')
  if (isValidation(d.id)) {
    return (
      <>
        <p className={cn('mt-6', lead)}>
          Punjab and Haryana are our validation case, not a sixth audit. Jethva and colleagues (2026) used hourly geostationary
          observations to show crop-residue burning moving later into the afternoon; the timing evidence is theirs. Aqua’s November count
          rising toward VIIRS’s fits it, and Aqua’s look over the region moved later every year from 2021 to 2025 (check P2).
        </p>
        <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone3)]">
          Our audit years 2023 to 2025 have too few hotspots to read, so we don’t quote them.{' '}
          <a href={JETHVA} target="_blank" rel="noreferrer" className={cn(underline, 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>Jethva 2026, Remote Sensing</a>
        </p>
      </>
    )
  }
  return (
    <>
      <p className={cn('mt-6', lead)}>{[v.counts, v.timing, v.caveat].filter(Boolean).join(' ')}</p>
      {v.declines ? <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">{v.declines} These are whole calendar months, not the audit’s days.</p> : null}
      {hasOfficialSeries(d.id) ? <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone3)]">{INPE_CONTEXT}</p> : null}
    </>
  )
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
        id="propagators-root"
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
        <AppVerdict d={d} />
        <Orbits d={d} year={year} onYear={setYear} />
        <Passes d={d} />
        <TwoClocks d={d} year={year} onYear={setYear} small={small} />
        <ClockEffect d={d} year={year} onYear={setYear} small={small} />
        <Calendar d={d} mode={mode} onMode={setMode} small={small} />
        <Checks />
        <Detection />
        <Limits d={d} />
        <About />
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
          <p className="text-[color:var(--bone2)]">Team Propagators · NASA Space Apps Challenge 2026</p>
          <p>{DATA_NOTE}{ANY_MOCK ? ' This comp uses mock data.' : ''}</p>
          {REPO_URL ? (
            <p>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className={cn(underline, 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>Code</a>
              {' · '}
              <a href={`${REPO_URL}/blob/main/analysis/statistics/README.md`} target="_blank" rel="noreferrer" className={cn(underline, 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>Method</a>
            </p>
          ) : null}
          <div className="mt-2"><MotionSwitch /></div>
        </div>
        <div className="lg:col-span-8">
          <p className="text-[color:var(--bone2)]">Data and imagery</p>
          <ul className="mb-6 mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {CREDITS.map((c) => (
              <li key={c.name}>
                {c.name}{c.links.map((l) => (
                  <span key={l.href}>
                    {' · '}
                    <a href={l.href} target="_blank" rel="noreferrer" className={cn(underline, 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>{l.text}</a>
                  </span>
                ))}
              </li>
            ))}
          </ul>
          <p className="text-[color:var(--bone2)]">Photographs and video</p>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {REGIONS.map((r) => {
              const p = photoFor(r.id)
              return (
                <li key={r.id}>
                  {r.name}: <a href={p.url} target="_blank" rel="noreferrer" className={cn(underline, 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>{p.by}</a> on Unsplash
                </li>
              )
            })}
            {REGIONS.filter((r) => photoFor(r.id).video).map((r) => {
              const v = photoFor(r.id).video!
              return (
                <li key={`v-${r.id}`}>
                  {r.name}, video:{' '}
                  {v.url ? (
                    <a href={v.url} target="_blank" rel="noreferrer" className={cn(underline, 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>{v.by ?? 'a contributor'}</a>
                  ) : (
                    <span className="text-[color:var(--bone2)]">{v.by ?? 'a contributor'}</span>
                  )}{' '}
                  on {v.site}{v.filmed ? `, ${v.filmed}` : ''}
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

/** The data the page stands on, with the identifiers to find each one. */
const CREDITS: { name: string; links: { text: string; href: string }[] }[] = [
  { name: 'NASA FIRMS, MODIS Collection 6.1 active fires', links: [{ text: 'doi:10.5067/FIRMS/MODIS/MCD14ML', href: 'https://doi.org/10.5067/FIRMS/MODIS/MCD14ML' }] },
  { name: 'NASA FIRMS, VIIRS 375 m active fires, S-NPP', links: [{ text: 'doi:10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002', href: 'https://doi.org/10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002' }] },
  { name: 'NASA FIRMS, VIIRS 375 m active fires, NOAA-20', links: [{ text: 'doi:10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002', href: 'https://doi.org/10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002' }] },
  { name: 'INPE Programa Queimadas, Brazil’s official fire series', links: [{ text: 'data.inpe.br/queimadas', href: 'https://data.inpe.br/queimadas/portal/' }] },
  { name: 'USFS fire occurrence database (FPA-FOD), 7th ed., Short 2026', links: [{ text: 'doi:10.2737/RDS-2013-0009.7', href: 'https://doi.org/10.2737/RDS-2013-0009.7' }] },
  { name: 'Punjab burn timing: Jethva 2026, Remote Sensing', links: [{ text: 'doi:10.3390/rs18101506', href: JETHVA }] },
  { name: 'Satellite imagery: NASA Worldview / GIBS', links: [{ text: 'worldview.earthdata.nasa.gov', href: 'https://worldview.earthdata.nasa.gov' }] },
]
/** The public repository, when the build is told it (the deploy sets it); no link otherwise. */
const REPO_URL = (import.meta.env.VITE_REPO_URL as string | undefined) || ''

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
        <a href="#top" aria-label="Propagators, back to the top" className={cn('flex shrink-0 items-center rounded leading-none xl:col-span-3 xl:justify-self-start', focusRing)}>
          <PropagatorsLogo height={20} />
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
        <a href={home} onClick={leave} aria-label="Propagators home" className={cn('flex shrink-0 items-center rounded leading-none xl:col-span-2 xl:justify-self-start', focusRing)}>
          <PropagatorsLogo height={20} />
        </a>
        <nav aria-label="Sections" className="hidden xl:col-span-8 xl:flex xl:justify-center">
          <ul className="flex items-center gap-6 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                {IN_COMP.has(s.id) ? (
                  <a href={`#${s.id}`} className={cn(underline, 'whitespace-nowrap text-[color:var(--bone)]', focusRing)}>
                    {s.label}
                  </a>
                ) : (
                  <span aria-disabled="true" title="In the full build" className="cursor-default whitespace-nowrap text-[color:var(--bone3)]">{s.label}</span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3 xl:col-span-2 xl:min-w-max xl:justify-self-end">
          <MockTag show={regionData(region).mock} className="hidden bg-[color:var(--plate)] sm:inline-block" />
          <RegionSelect value={region} onChange={onRegion} classes={selectClasses} />
          <div className="xl:hidden"><SectionsIndex /></div>
        </div>
      </div>
    </header>
  )
}

/* ---------- Landing hero: a statement piece, the region's name on its ground; the verdict follows below ---------- */

const DWELL = 'animate-[film-dwell_7s_linear_forwards]'

/** A region's media on the landing: its drone loop where one exists (muted, looping, playing only while shown), else its
 *  photograph with a slow push-in so the stills don't sit frozen between the loops. Without motion, the still photograph
 *  (or the loop's first frame) and nothing moving. */
function RegionMedia({ id, active, className }: { id: string; active: boolean; className?: string }) {
  const motion = useMotion()
  const p = photoFor(id)
  const ref = useRef<HTMLVideoElement | null>(null)
  const v = p.video
  // one continuous shot per showing: each time the region comes up it starts from the top and plays once, holding its
  // last frame if the tour is paused; no loop, so the picture never jumps back
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (active && motion.on) {
      try { el.currentTime = 0 } catch { /* not seekable yet; it starts from the top anyway */ }
      el.play().catch(() => { /* autoplay can be refused; the poster stays */ })
    } else el.pause()
  }, [active, motion.on])
  if (v) {
    return (
      <>
        <video
          ref={ref}
          src={v.src}
          poster={v.poster}
          muted
          playsInline
          autoPlay={active && motion.on}
          preload={active ? 'auto' : 'metadata'}
          aria-hidden
          className={className}
        />
        {active ? <span className="sr-only">{v.about}</span> : null}
      </>
    )
  }
  return (
    <img
      src={p.src}
      srcSet={`${p.srcSm} 720w, ${p.src} 1920w`}
      sizes="100vw"
      alt={active ? p.alt : ''}
      aria-hidden={active ? undefined : true}
      width={p.width}
      height={p.height}
      style={{ objectPosition: p.focus }}
      className={cn(className, active && motion.on && 'animate-[film-push_14s_ease-out_both]')}
    />
  )
}
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
          {loaded.map((id) => (
            <RegionMedia
              key={id}
              id={id}
              active={id === region}
              className={cn('absolute inset-0 size-full object-cover transition-opacity duration-700 ease-[var(--ease)]', hold && SETTLE, id === region ? 'opacity-100' : 'opacity-0')}
            />
          ))}
          <div aria-hidden className="absolute inset-0 bg-[image:var(--scrim-statement)]" />
        </div>
        <div aria-hidden className="h-16 shrink-0 xl:h-18" />
        <div className={cn('mt-auto', RIDE)}>
        <div className={cn(shell, 'pb-8 sm:pb-10', FADE_NAME)}>
          <MockTag show={d.mock} className="mb-4 inline-block bg-[color:var(--plate)] sm:hidden" />
          <h1 id="region-h" className={cn(statement, SHRINK)}>
            <span key={region} className="block animate-[film-fade_600ms_cubic-bezier(0.22,1,0.36,1)]">{statementName(region)}</span>
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
            <VerdictBody d={d} />
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

/* ---------- App opening: a still statement, the region's name on its photograph; the verdict follows ---------- */

/** The audit opens on the region's photograph with its name, still: the drone loops play on the landing, and the
 *  zoom-out reveal (useStage, FRAME…) is parked until the team wants it. */
function AppStatement({ d }: { d: RegionData }) {
  const p = photoFor(d.id)
  return (
    <section id="top" aria-labelledby="region-h" className="relative isolate flex h-[78svh] max-h-[1040px] min-h-[560px] flex-col">
      <div className="absolute inset-0 -z-10 overflow-hidden bg-[color:var(--surface)]">
        <img
          key={d.id}
          src={p.src}
          srcSet={`${p.srcSm} 720w, ${p.src} 1920w`}
          sizes="100vw"
          alt={p.alt}
          width={p.width}
          height={p.height}
          style={{ objectPosition: p.focus }}
          className="absolute inset-0 size-full animate-[film-fade_600ms_cubic-bezier(0.22,1,0.36,1)] object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-[image:var(--scrim-statement)]" />
      </div>
      <div className={cn(shell, 'mt-auto pb-8 sm:pb-10')}>
        <MockTag show={d.mock} className="mb-4 inline-block bg-[color:var(--plate)] sm:hidden" />
        <h1 id="region-h" className={statement}>
          <span key={d.id} className="block animate-[film-fade_600ms_cubic-bezier(0.22,1,0.36,1)]">{statementName(d.id)}</span>
        </h1>
      </div>
    </section>
  )
}

/** The verdict under the statement, then the reel. */
function AppVerdict({ d }: { d: RegionData }) {
  return (
    <section id="verdict" aria-labelledby="verdict-h" className="scroll-mt-20">
      <div className={cn(shell, 'grid grid-cols-1 py-16 xl:grid-cols-12 xl:gap-x-6 xl:py-20')}>
        <div className="xl:col-span-8">
          <h2 id="verdict-h" className={titleLarge}>{verdictHeadline(d)}</h2>
          <VerdictBody d={d} />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#calendar" className={primaryButton}>
              Explore the calendar
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
            </a>
            <button type="button" onClick={() => downloadSummary(d)} className={secondaryButton}>Download summary</button>
          </div>
        </div>
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
/** A ruler cell for a year: a notch per month, a taller one where the year starts, the tallest mid-year under the playhead. */
const rulerThumb = (year: number) => (
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
    <span className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 text-xs leading-4 tabular-nums text-[color:var(--bone3)] group-data-[active=true]:text-[color:var(--bone)] sm:block">{year}</span>
  </div>
)
const REEL_VARS = { '--fs-accent': 'var(--bone)', '--fs-cell': 'var(--surface)' } as CSSProperties

/** When each satellite looked in one year, as an instrument line on a 06:00 to 18:00 axis. Each satellite has its own
 *  marker and pin: Aqua, the one that drifts, a filled dot under a solid flag carrying its time and the minutes it added;
 *  the fixed clock (VIIRS) a green diamond; Terra a hollow ring. The drift itself is a bar on the axis from the fixed clock to Aqua.
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
        className={cn('absolute inset-x-0 h-1 origin-left -translate-y-1/2 translate-x-[var(--bar-x)] scale-x-[var(--bar-k)] bg-[color:var(--sat-aqua)]', axis, slideEase)}
      />

      {/* Terra: a hollow ring, the lowest label, set to the left of its pin */}
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xt)]')}>
        <span className="absolute left-0 top-[62px] h-[18px] w-px -translate-x-1/2 bg-[color:var(--sat-terra)] sm:top-[74px] sm:h-[22px]" />
        <span className={cn(marker, 'size-2.5 rounded-full border-2 border-[color:var(--sat-terra)] bg-[color:var(--figure-bg,var(--surface))]')} />
        <span className={cn(label, '-left-2 top-[46px] -translate-x-full text-[color:var(--bone3)] sm:top-[54px]')}>Terra {dr.terra_lst}</span>
      </div>

      {/* the fixed clock: a green diamond; its label sits on the side away from Aqua, so the two never touch */}
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xf)]')}>
        <span className="absolute left-0 top-[42px] h-[38px] w-px -translate-x-1/2 bg-[color:var(--sat-viirs)] sm:top-[50px] sm:h-[46px]" />
        <span className={cn(marker, 'size-2.5 rotate-45 bg-[color:var(--sat-viirs)]')} />
        <span className={cn(label, 'top-[26px] text-[color:var(--bone3)] sm:top-[30px]', later ? '-left-2 -translate-x-full' : 'left-2')}>
          Fixed clock {dr.viirs_lst}
        </span>
      </div>

      {/* Aqua: the one that moves; a solid flag with its time and the minutes it added, a filled dot on the axis */}
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xa)]')}>
        <span className="absolute left-0 top-5 h-15 w-0.5 -translate-x-1/2 bg-[color:var(--sat-aqua)] sm:top-6 sm:h-18" />
        <span className={cn(marker, 'size-3 rounded-full bg-[color:var(--sat-aqua)] ring-2 ring-[color:var(--figure-bg,var(--surface))]')} />
        <span
          className={cn(
            'absolute top-0 flex h-5 items-center gap-1.5 whitespace-nowrap rounded-[3px] bg-[color:var(--sat-aqua)] px-1.5 text-xs font-medium text-[color:var(--figure-on,var(--ink))] sm:h-6 sm:px-2 sm:text-sm',
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

/* ---------- The orbits, seen from the Sun's side ---------- */

const GLOBE_INK = { fg: 'var(--bone)', muted: 'var(--bone3)', grid: 'var(--bone-20)', ground: 'var(--ground)', surface: 'var(--surface)', land: 'var(--bone2)' }

/** The section's heading: which way Aqua's orbit has turned over the years in the file, if it has. */
function orbitsHeading(d: RegionData) {
  const first = d.drift[0]
  const last = d.lastDrift
  if (!first || !last) return `The orbits over ${d.phrase.the} are not in the data yet`
  const m = minutesBetween(last.aqua_lst, first.aqua_lst)
  if (Math.abs(m) < 5 || !d.driftStart) return `Seen from the Sun, Aqua’s orbit has held its place since ${first.year}`
  return `Seen from the Sun, Aqua’s orbit has swung toward ${m > 0 ? 'evening' : 'morning'} since ${d.driftStart}`
}

function Orbits({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const motion = useMotion()
  const dr = d.driftAt(year)
  const years = d.drift.map((r) => r.year)
  const frames = useMemo(
    () => d.drift.map((r) => ({ id: String(r.year), valueText: `${r.year}: Terra ${r.terra_lst}, fixed clock ${r.viirs_lst}, Aqua ${r.aqua_lst}`, preview: null, thumb: rulerThumb(r.year) })),
    [d],
  )
  const region = REGIONS.find((r) => r.id === d.id)
  if (!dr || !years.length || !region) return null

  const orbits: GlobeOrbit[] = [
    { id: 'terra', label: 'Terra', time: hm(dr.terra_lst), timeText: dr.terra_lst, dayPass: 'south', marker: 'hollow', color: 'var(--sat-terra)', altitudeKm: 705, phase: 0.62 },
    { id: 'viirs', label: 'Fixed clock', time: hm(dr.viirs_lst), timeText: dr.viirs_lst, dayPass: 'north', marker: 'diamond', color: 'var(--sat-viirs)', altitudeKm: 830, phase: 0.31 },
    { id: 'aqua', label: 'Aqua', time: hm(dr.aqua_lst), timeText: dr.aqua_lst, dayPass: 'north', marker: 'filled', color: 'var(--sat-aqua)', altitudeKm: 705, flag: `${minutesBetween(dr.aqua_lst, dr.viirs_lst) >= 0 ? '+' : '−'}${Math.abs(minutesBetween(dr.aqua_lst, dr.viirs_lst))} min`, phase: 0 },
  ]
  const order = [...orbits].sort((a, b) => a.time - b.time).map((o) => (o.id === 'viirs' ? 'the fixed clock’s' : `${o.label}’s`))
  const shift = minutesBetween(dr.aqua_lst, dr.viirs_lst)
  const description = `${statementName(d.id)} at noon in ${dr.year}, seen from the Sun’s side, with three orbits: its day carries it under Terra’s track at ${dr.terra_lst}, the fixed clock’s at ${dr.viirs_lst} and Aqua’s at ${dr.aqua_lst} local solar time.`

  return (
    <section id="orbits" aria-labelledby="orbits-h" className="scroll-mt-20">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 pb-24 pt-4 lg:grid-cols-12 lg:gap-x-6 xl:pt-0')}>
        <div className="lg:col-span-4">
          <h2 id="orbits-h" className={title}>{orbitsHeading(d)}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            {statementName(d.id)} at noon, seen from the Sun’s side: morning to the left, evening to the right. Each orbit
            keeps its angle to the sunlight, so each orbit runs along a line of one time of day. The Earth’s turn carries{' '}
            {d.phrase.the} along the dashed path, under {order[0]} orbit first, then {order[1]}, then {order[2]}. Drag the
            years under the globe to see the orbits move.
          </p>
          <dl aria-live="polite" className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-[color:var(--hairline)] pt-4 text-sm">
            <dt className="text-[color:var(--bone3)]">Year</dt>
            <dd className="tabular-nums">{dr.year}</dd>
            <dt className="text-[color:var(--bone3)]">Terra</dt>
            <dd className="tabular-nums">{dr.terra_lst}</dd>
            <dt className="text-[color:var(--bone3)]">Fixed clock (VIIRS)</dt>
            <dd className="tabular-nums">{dr.viirs_lst}</dd>
            <dt className="text-[color:var(--bone3)]">Aqua</dt>
            <dd className="tabular-nums">{dr.aqua_lst} <span className="text-[color:var(--bone3)]">{Math.abs(shift)} min {shift >= 0 ? 'after' : 'before'} the fixed clock</span></dd>
          </dl>
        </div>

        <figure className="m-0 min-w-0 lg:col-span-8">
          <OrbitGlobe
            orbits={orbits}
            region={{ name: statementName(d.id), bbox: region.bbox }}
            span={{ from: 'viirs', to: 'aqua' }}
            running={motion.on}
            ink={GLOBE_INK}
            label={description}
          />
          {/* the years, under the Earth, on the reel's ruler: dragging it moves the orbits */}
          <div className="mt-6" style={REEL_VARS}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="text-sm text-[color:var(--bone2)]">When each satellite looked · drag along the years</p>
              <p className="text-sm tabular-nums text-[color:var(--bone)]">
                {dr.year} · Aqua {dr.aqua_lst}, {Math.abs(shift)} min {shift >= 0 ? 'after' : 'before'} the fixed clock
              </p>
            </div>
            <FilmstripScrub
              frames={frames}
              frameIndex={Math.max(0, years.indexOf(dr.year))}
              onFrameIndexChange={(i) => onYear(years[i])}
              scrubberLabel="Year shown on the globe"
              variant="ruler"
              still={!motion.on}
              playheadClassName="sm:bottom-5"
              previewClassName="hidden"
              stripClassName="h-8 sm:h-12"
            />
            <div aria-hidden className="mt-2 flex justify-between text-xs tabular-nums text-[color:var(--bone3)] sm:hidden">
              <span>{years[0]}</span><span>{years[years.length - 1]}</span>
            </div>
          </div>
          <figcaption className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[color:var(--bone3)]">
            <span>Heights to scale: Aqua and Terra fly about 705 km up, the VIIRS satellites about 830 km. The satellites are shown moving faster than they really do.</span>
            <span>Source: drift/{d.id}.json</span>
            <MockTag show={d.mock} />
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

/* ---------- Three passes, one day: one frame, switched between the passes ---------- */

type PassKey = 'terra' | 'viirs' | 'aqua'
const PASS_META: { key: PassKey; name: string; when: string; control: string; look: (r: Drift) => string }[] = [
  { key: 'terra', name: 'Terra', when: 'morning', control: 'Terra', look: (r) => r.terra_lst },
  { key: 'viirs', name: 'VIIRS', when: 'fixed clock', control: 'VIIRS (fixed clock)', look: (r) => r.viirs_lst },
  { key: 'aqua', name: 'Aqua', when: 'later afternoon', control: 'Aqua', look: (r) => r.aqua_lst },
]
type Scene = { day: string; place: string; heading: string; wide: (k: PassKey) => string; square: (k: PassKey) => string; fit?: Partial<Record<PassKey, string>>; alt: Record<PassKey, string> }
const sceneFiles = (id: string) => ({ wide: (k: PassKey) => `${IMG}passes/${id}-${k}.jpg`, square: (k: PassKey) => `${IMG}prints/${id}-${k}-sq.jpg` })
/** One day's three passes over each region: NASA Worldview true colour with that satellite's own fire detections. The
 *  headings say only what the three pictures show; the audit, not one day, measures the clock. */
const SCENES: Record<string, Scene> = {
  'br-amazon': {
    day: '4 Sep 2026', place: 'the central Amazon', heading: 'By the later afternoon pass, clouds have built over the same forest',
    wide: (k) => `${IMG}amazon-${k}-2026-09-04.jpg`, square: (k) => `${IMG}prints/amazon-${k}-sq.jpg`, fit: { terra: 'object-left' },
    alt: {
      terra: 'Terra, morning pass, 4 Sep 2026: hazy smoke and a few clouds over the forest',
      viirs: 'VIIRS, early afternoon pass on the fixed clock, 4 Sep 2026: small cumulus clouds spread across the same forest',
      aqua: 'Aqua, later afternoon pass, 4 Sep 2026: towering clouds over the same forest',
    },
  },
  'br-cerrado': {
    day: '9 Sep 2024', place: 'Tocantins', heading: 'By the afternoon passes, smoke trails across the same savanna', ...sceneFiles('br-cerrado'),
    alt: {
      terra: 'Terra, morning pass, 9 Sep 2024: haze over the Tocantins savanna and a few fire detections',
      viirs: 'VIIRS, early afternoon pass on the fixed clock, 9 Sep 2024: fire detections across the same savanna and thin smoke trails',
      aqua: 'Aqua, later afternoon pass, 9 Sep 2024: smoke plumes drifting from fires along the river',
    },
  },
  'br-pantanal': {
    day: '9 Sep 2024', place: 'the central Pantanal', heading: 'Smoke from the fire fronts hangs over the same wetland all day', ...sceneFiles('br-pantanal'),
    alt: {
      terra: 'Terra, morning pass, 9 Sep 2024: smoke over the Pantanal and a few fire detections at its western edge',
      viirs: 'VIIRS, early afternoon pass on the fixed clock, 9 Sep 2024: fire fronts traced in detections at the western edge, smoke across the wetland',
      aqua: 'Aqua, later afternoon pass, 9 Sep 2024: the same fire fronts and a white plume spreading south',
    },
  },
  'ar-argentina': {
    day: '10 Feb 2022', place: 'the Iberá wetlands, Corrientes', heading: 'By the afternoon passes, the smoke over the same wetland has spread', ...sceneFiles('ar-argentina'),
    alt: {
      terra: 'Terra, morning pass, 10 Feb 2022: smoke rising from fires in the Iberá wetlands, Corrientes',
      viirs: 'VIIRS, early afternoon pass on the fixed clock, 10 Feb 2022: many fire detections and smoke drifting north',
      aqua: 'Aqua, later afternoon pass, 10 Feb 2022: the smoke has spread over the same wetland',
    },
  },
  'in-punjab-haryana': {
    day: '3 Nov 2023', place: 'Punjab', heading: 'The morning pass sees almost no fires; the afternoon passes see hundreds', ...sceneFiles('in-punjab-haryana'),
    alt: {
      terra: 'Terra, morning pass, 3 Nov 2023: haze over Punjab’s fields and almost no fire detections',
      viirs: 'VIIRS, early afternoon pass on the fixed clock, 3 Nov 2023: hundreds of small fire detections across the same fields',
      aqua: 'Aqua, later afternoon pass, 3 Nov 2023: hundreds of fire detections across the same fields',
    },
  },
  'us-california': {
    day: '8 Jan 2025', place: 'Los Angeles', heading: 'By the afternoon passes, the morning cloud has cleared and the smoke streams out to sea', ...sceneFiles('us-california'),
    alt: {
      terra: 'Terra, morning pass, 8 Jan 2025: cloud over the Los Angeles coast and fire detections in the hills',
      viirs: 'VIIRS, early afternoon pass on the fixed clock, 8 Jan 2025: the Palisades and Eaton fires, their smoke streaming over the ocean',
      aqua: 'Aqua, later afternoon pass, 8 Jan 2025: the same two fires and their smoke out to sea',
    },
  },
}

function Passes({ d }: { d: RegionData }) {
  const [shown, setShown] = useState<PassKey>('aqua')
  const scene = SCENES[d.id] ?? SCENES['br-amazon']
  const active = PASS_META.find((p) => p.key === shown) ?? PASS_META[2]
  const last = d.lastDrift
  return (
    <section id="clock" aria-labelledby="passes-h" className={cn(shell, 'py-24')}>
      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-4">
          <h2 id="passes-h" className={title}>{scene.heading}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            The same place, {scene.place}, on {scene.day}, seen in the morning, early afternoon and later afternoon. Fires,
            smoke and clouds change through the day, so a later look can count more fires or fewer; the audit measures
            which, and by how much.
          </p>
          <ToggleGroup.Root
            type="single"
            value={shown}
            onValueChange={(v) => { if (v) setShown(v as PassKey) }}
            aria-label="Pass shown in the frame"
            className="mt-8 grid grid-cols-3 gap-2"
          >
            {PASS_META.map((p) => (
              <ToggleGroup.Item key={p.key} value={p.key} className={cn('group block min-w-0 text-left', focusRing)}>
                <span className="relative block aspect-square overflow-hidden bg-[color:var(--surface)]">
                  <img
                    src={scene.square(p.key)}
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
          <div role="img" aria-label={scene.alt[active.key]} className="relative aspect-5/4 overflow-hidden bg-[color:var(--surface)]">
            {PASS_META.map((p) => (
              <img
                key={`${d.id}-${p.key}`}
                src={scene.wide(p.key)}
                alt=""
                width={936}
                height={720}
                loading="lazy"
                className={cn(
                  'absolute inset-0 size-full object-cover transition-opacity duration-240 ease-[var(--ease)] motion-reduce:transition-none',
                  scene.fit?.[p.key] ?? 'object-center',
                  p.key === shown ? 'opacity-100' : 'opacity-0',
                )}
              />
            ))}
            <div aria-hidden className="absolute inset-0 bg-[image:var(--scrim-tile)]" />
            <div aria-hidden className="absolute bottom-4 left-4 right-4">
              <p className="text-sm font-medium text-[color:var(--bone)]">{active.name} · {active.when}</p>
              {last ? <p className="mt-1 text-xs text-[color:var(--bone-80)]">Typical look over {d.phrase.the} {active.look(last)} in {last.year}</p> : null}
            </div>
          </div>
          <figcaption className="mt-4 text-xs text-[color:var(--bone3)]">
            {scene.day}, {scene.place} · Imagery: NASA Worldview / GIBS, true colour with each satellite’s fire detections
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

/** The section's title: each satellite's near-nadir change against VIIRS since 2012-2020, in the latest year in the
 *  file; a direction is named only when that satellite's range clears zero. */
function twoClocksHeading(d: RegionData) {
  const last = [...d.two].reverse().find((t) => Number.isFinite(t.A) && Number.isFinite(t.T))
  if (!last) return `The two clocks for ${d.phrase.the} are not in the data yet`
  const clear = (lo: number, hi: number) => lo > 1 || hi < 1
  const moved = (v: number) => `had ${v >= 1 ? 'risen' : 'fallen'} ${Math.round(Math.abs(asPct(v)))}%`
  const a = clear(last.A_lo, last.A_hi), t = clear(last.T_lo, last.T_hi)
  if (a && t) return `By ${last.year}, Aqua’s count against VIIRS ${moved(last.A)} since 2012–2020, and Terra’s ${moved(last.T)}`
  if (a) return `By ${last.year}, Aqua’s count against VIIRS ${moved(last.A)} since 2012–2020, while Terra’s showed no clear change`
  if (t) return `By ${last.year}, Aqua’s count against VIIRS showed no clear change since 2012–2020, while Terra’s ${moved(last.T)}`
  return `By ${last.year}, neither Aqua’s nor Terra’s count against VIIRS showed a clear change since 2012–2020`
}

/** The checks written to test this section's logic, said plainly when they fail, with the scores the file states. */
function twoClocksChecks() {
  const failing = ['P9', 'P10'].map((id) => CHECKS.checks.find((c) => c.id === id)).filter((c): c is Check => !!c && c.status === 'fail')
  if (!failing.length) return null
  const parts = failing.map((c) => {
    const m = /(\d+)\/(\d+)/.exec(c.detail)
    return c.id === 'P9'
      ? `P9, that the two drifts move the counts in opposite directions${m ? `, holds in ${m[1]} of ${m[2]} Brazilian biomes where the rule asks for every one` : ''}`
      : `P10, that this difference agrees with the audit, holds${m ? ` in ${m[1]} of ${m[2]} biome-years, under the 75% the rule asks` : ' too rarely'}`
  })
  return `${failing.length === 2 ? 'Both checks' : 'A check'} written to test this logic ${failing.length === 2 ? 'fail' : 'fails'}: ${parts.join('; ')}. Read this section as a description, not as confirmation of the audit.`
}

/** Where the two clocks and the audit read the same year differently, say so. */
function twoClocksConflict(d: RegionData) {
  const t = [...d.two].reverse().find((x) => Number.isFinite(x.clock_lo) && Number.isFinite(x.clock_hi))
  const a = t ? d.years.find((y) => y.year === t.year) : null
  if (!t || !a || a.verdict === 'na') return null
  const apart = t.clock_lo > 0 || t.clock_hi < 0
  if (apart === (a.verdict === 'outside')) return null
  const v = logPct(t.clock_diff)
  return apart
    ? `Here the two disagree. In ${t.year}, Aqua’s change ran ${Math.round(Math.abs(v))}% ${v > 0 ? 'above' : 'below'} Terra’s (95% range ${fmtRange(logPct(t.clock_lo), logPct(t.clock_hi), 0)}), while the audit finds Aqua’s count within its placebo range.`
    : `Here the two disagree. In ${t.year}, the audit finds Aqua’s count outside its placebo range, while Aqua’s and Terra’s changes overlap (95% range ${fmtRange(logPct(t.clock_lo), logPct(t.clock_hi), 0)}).`
}

function TwoClocks({ d, year, onYear, small }: { d: RegionData; year: number; onYear: (y: number) => void; small: boolean }) {
  const two = d.two
  const [inspect, setInspect] = useState<number | null>(null)
  const selected = two.findIndex((t) => t.year === year)
  const shownIndex = inspect ?? (selected >= 0 ? selected : two.length - 1)
  const t = two[shownIndex]
  const labels = two.map((x) => String(x.year))
  const probes: Series[] = [
    { id: 'aqua', label: 'Aqua', marker: 'filled', color: 'var(--sat-aqua)', values: two.map((x) => asPct(x.A)), lo: two.map((x) => asPct(x.A_lo)), hi: two.map((x) => asPct(x.A_hi)) },
    { id: 'terra', label: 'Terra', marker: 'hollow', color: 'var(--sat-terra)', values: two.map((x) => asPct(x.T)), lo: two.map((x) => asPct(x.T_lo)), hi: two.map((x) => asPct(x.T_hi)) },
  ]
  const difference: AnomalyPoint[] = two.map((x) => {
    const v = logPct(x.clock_diff)
    const lo = logPct(x.clock_lo)
    const hi = logPct(x.clock_hi)
    return { id: String(x.year), label: String(x.year), value: v, range: [lo, hi], outside: lo > 0 || hi < 0, valueText: `${x.year}: Aqua’s change over Terra’s ${pct(v)}, range ${fmtRange(lo, hi)}` }
  })
  const columnText = (i: number) => {
    const x = two[i]
    return `${x.year}: Aqua ${pct(asPct(x.A))} looking at ${x.aqua_lst}, Terra ${pct(asPct(x.T))} looking at ${x.terra_lst}, each against its own 2012 to 2020 relationship with VIIRS`
  }
  const first = two[0]
  const last = two[two.length - 1]
  const way = (a: string, b: string) => (hm(b) < hm(a) ? 'earlier' : hm(b) > hm(a) ? 'later' : 'at about the same time')
  const ink = { fg: 'var(--bone2)', grid: 'var(--hairline)', surface: 'var(--ground)', guide: 'var(--bone)' }
  const diffVars = {
    '--ac-line': 'var(--sat-aqua)', '--ac-fg': 'var(--bone2)', '--ac-surface': 'var(--ground)', '--ac-band': 'transparent',
    '--ac-grid': 'var(--hairline)', '--ac-zero': 'var(--bone-30)',
  } as CSSProperties
  const pick = (i: number) => onYear(two[i].year)
  const caption = (head: string, line: string) => (
    <figcaption className="mb-4">
      <span className="block text-lg font-medium">{head}</span>
      <span className="mt-1 block max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">{line}</span>
    </figcaption>
  )
  const checksNote = twoClocksChecks()
  const conflict = twoClocksConflict(d)

  return (
    <section id="two-clocks" aria-labelledby="two-h" className="scroll-mt-20 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="two-h" className={title}>{twoClocksHeading(d)}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            Terra and Aqua carry the same MODIS camera.{first && last ? ` From ${first.year} to ${last.year}, Terra’s look moved ${way(first.terra_lst, last.terra_lst)} and Aqua’s ${way(first.aqua_lst, last.aqua_lst)}.` : ''} Each
            satellite is counted near the middle of its view, against VIIRS, as a change from its own 2012–2020 relationship.
            Comparing the two changes cancels what they share, such as how the orbit samples the region.
          </p>
          {checksNote ? <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone)]">{checksNote}</p> : null}
          {conflict ? <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone)]">{conflict}</p> : null}
          {t ? (
            <dl aria-live="polite" className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-[color:var(--hairline)] pt-4 text-sm">
              <dt className="text-[color:var(--bone3)]">Year</dt>
              <dd className="tabular-nums">{t.year}</dd>
              <dt className="text-[color:var(--bone3)]">Aqua’s change</dt>
              <dd className="tabular-nums">{pct(asPct(t.A))} at {t.aqua_lst} <span className="text-[color:var(--bone3)]">{fmtRange(asPct(t.A_lo), asPct(t.A_hi))}</span></dd>
              <dt className="text-[color:var(--bone3)]">Terra’s change</dt>
              <dd className="tabular-nums">{pct(asPct(t.T))} at {t.terra_lst} <span className="text-[color:var(--bone3)]">{fmtRange(asPct(t.T_lo), asPct(t.T_hi))}</span></dd>
              <dt className="text-[color:var(--bone3)]">Aqua’s over Terra’s</dt>
              <dd className="tabular-nums">{pct(logPct(t.clock_diff))} <span className="text-[color:var(--bone3)]">{fmtRange(logPct(t.clock_lo), logPct(t.clock_hi))}</span></dd>
              <dt className="text-[color:var(--bone3)]">Shared part</dt>
              <dd className="tabular-nums">{pct(logPct(t.sampling_est))} <span className="text-[color:var(--bone3)]">cancelled out</span></dd>
            </dl>
          ) : null}
        </div>

        {two.length ? (
          <div className="flex min-w-0 flex-col gap-16 lg:col-span-8">
            <figure className="m-0">
              {caption('The two probes', 'Each satellite’s near-nadir count against VIIRS, as a change from 2012–2020 (0 = no change). Hover or step through the years.')}
              <SeriesChart
                labels={labels}
                series={probes}
                reference={{ value: 0, label: 'VIIRS reference', color: 'var(--sat-viirs)' }}
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
              {caption('Aqua’s change over Terra’s', 'Each year, how far Aqua’s change since 2012–2020 sits from Terra’s. A range clear of zero means the two moved apart; it doesn’t say why.')}
              <AnomalyChart
                points={difference}
                height={small ? 200 : 220}
                activeIndex={shownIndex}
                selectedIndex={selected >= 0 ? selected : null}
                onInspect={setInspect}
                onSelect={pick}
                groupLabel={`Aqua’s change over Terra’s for ${d.name}`}
                formatTick={tickText}
                legend={{ outside: 'Range clear of zero', inside: 'Range overlaps zero', range: '95% range' }}
              />
            </figure>
            <figure className="m-0">
              {caption(
                'Fire-day points, descriptive only',
                'Each year: how many hours apart Terra’s and Aqua’s looks were, and Aqua’s count over Terra’s on the same days. The points are not joined, because the years are not a path, and no curve is drawn: the hour when fires peak is poorly constrained, so this is not used as a correction.',
              )}
              <FireDay d={d} activeYear={two[shownIndex]?.year ?? null} small={small} />
            </figure>
            <p className="text-xs text-[color:var(--bone3)]">Sources: twoclocks/{d.id}.json · fireday/{d.id}.json{d.twoMock ? ' · MOCK' : ''}</p>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--bone2)] lg:col-span-8">The two-clocks test for {d.phrase.the} is not in the data yet.</p>
        )}
      </div>
    </section>
  )
}

/** Up to about six round ticks across [lo, hi], for log-ratio axes. */
function logTicks(lo: number, hi: number) {
  const span = hi - lo || 1
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2].find((s) => span / s <= 6) ?? 2
  const d0 = Math.floor(lo / step) * step
  const d1 = Math.max(d0 + step, Math.ceil(hi / step) * step)
  const ticks: number[] = []
  for (let v = d0; v <= d1 + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { d0, d1, ticks, digits: step < 0.25 ? 1 : step < 1 ? 2 : 0 }
}

/** Fire-day points, descriptive only: for each year, the hours between Terra's and Aqua's looks against log(Aqua / Terra)
 *  on the same days, with its range. Not joined and no fitted curve, as the team asks. Years from the drift's start are
 *  filled, earlier years hollow. */
function FireDay({ d, activeYear, small }: { d: RegionData; activeYear: number | null; small: boolean }) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const width = useMeasuredWidth(boxRef)
  const pts = d.fireday?.years ?? []
  const height = small ? 250 : 290
  const M = { top: 16, right: 24, bottom: 52, left: 72 }
  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = height - M.top - M.bottom
  const x0 = pts.length ? Math.floor(Math.min(...pts.map((p) => p.gap_h))) : 0
  const x1 = pts.length ? Math.max(x0 + 1, Math.ceil(Math.max(...pts.map((p) => p.gap_h)))) : 1
  const sc = logTicks(pts.length ? Math.min(...pts.map((p) => p.lo)) : 0, pts.length ? Math.max(...pts.map((p) => p.hi)) : 1)
  const X = (h: number) => M.left + ((h - x0) / (x1 - x0)) * plotW
  const Y = (v: number) => M.top + (1 - (v - sc.d0) / (sc.d1 - sc.d0)) * plotH
  const xTicks = Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i)
  const drift = d.driftStart ?? Number.POSITIVE_INFINITY
  const firstP = pts[0], lastP = pts[pts.length - 1]
  const description = pts.length
    ? `Fire-day points for ${d.name}, descriptive only. From ${firstP.year} to ${lastP.year} the gap between Terra’s and Aqua’s looks went from ${firstP.gap_h.toFixed(1)} to ${lastP.gap_h.toFixed(1)} hours, and log(Aqua ÷ Terra) from ${firstP.log_aqua_over_terra.toFixed(2)} to ${lastP.log_aqua_over_terra.toFixed(2)}.`
    : `Fire-day points for ${d.name}: not in the data yet.`
  return (
    <div>
      <div ref={boxRef} role="img" aria-label={description} className="relative w-full" style={{ height }}>
        {width > 0 && pts.length ? (
          <svg width={width} height={height} aria-hidden className="absolute inset-0 block overflow-visible" fontSize={12}>
            {sc.ticks.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={M.left + plotW} y1={Y(v)} y2={Y(v)} stroke="var(--hairline)" shapeRendering="crispEdges" />
                <text x={M.left - 8} y={Y(v)} textAnchor="end" dominantBaseline="central" fill="var(--bone2)">{v.toFixed(sc.digits)}</text>
              </g>
            ))}
            {xTicks.map((h) => (
              <text key={h} x={X(h)} y={M.top + plotH + 20} textAnchor="middle" fill="var(--bone2)">{h} h</text>
            ))}
            <text x={M.left + plotW / 2} y={height - 6} textAnchor="middle" fill="var(--bone3)">Hours between Terra’s and Aqua’s looks</text>
            <text transform={`translate(14 ${M.top + plotH / 2}) rotate(-90)`} textAnchor="middle" fill="var(--bone3)">log(Aqua ÷ Terra), same days</text>
            {pts.map((p) => (
              <line key={`r${p.year}`} x1={X(p.gap_h)} x2={X(p.gap_h)} y1={Y(p.lo)} y2={Y(p.hi)} stroke="var(--sat-aqua)" strokeOpacity={0.4} strokeWidth={2} strokeLinecap="round" />
            ))}
            {pts.map((p) => {
              const on = p.year === activeYear
              return (
                <g key={p.year}>
                  {on ? <circle cx={X(p.gap_h)} cy={Y(p.log_aqua_over_terra)} r={9} fill="none" stroke="var(--bone)" strokeWidth={1.5} /> : null}
                  <circle cx={X(p.gap_h)} cy={Y(p.log_aqua_over_terra)} r={4.5} fill={p.year >= drift ? 'var(--sat-aqua)' : 'var(--ground)'} stroke="var(--sat-aqua)" strokeWidth={2} />
                </g>
              )
            })}
            {[firstP, lastP].map((p, i) => (
              <text key={p.year} x={X(p.gap_h) + (i ? -12 : 12)} y={Y(p.log_aqua_over_terra) - 12} textAnchor={i ? 'end' : 'start'} fill="var(--bone2)" stroke="var(--ground)" strokeWidth={4} paintOrder="stroke">{p.year}</text>
            ))}
          </svg>
        ) : null}
      </div>
      <div aria-hidden className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[color:var(--bone2)]" style={{ paddingLeft: M.left }}>
        <span className="inline-flex items-center gap-2"><svg width={12} height={12}><circle cx={6} cy={6} r={4} fill="var(--ground)" stroke="var(--sat-aqua)" strokeWidth={2} /></svg>{d.driftStart ? `Before ${d.driftStart}` : 'Each year'}</span>
        {d.driftStart ? <span className="inline-flex items-center gap-2"><svg width={12} height={12}><circle cx={6} cy={6} r={4.5} fill="var(--sat-aqua)" /></svg>From {d.driftStart}, as Aqua’s clock drifted</span> : null}
        <span className="inline-flex items-center gap-2"><svg width={10} height={12}><line x1={5} x2={5} y1={1} y2={11} stroke="var(--sat-aqua)" strokeOpacity={0.4} strokeWidth={2} /></svg>95% range</span>
      </div>
    </div>
  )
}

/* ---------- How do we know? The checks the team wrote down, P1-P10 ---------- */

const NUM_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const numWord = (n: number) => NUM_WORDS[n] ?? String(n)
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** "a, b and c" */
const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const STATUS: Record<Check['status'], string> = { pass: 'Passes', fail: 'Fails', pending: 'Pending' }

/** What each check asks, in one sentence; its rule, the way it was scored and its result come from checks.json. */
const PLAIN: Record<string, string> = {
  P1: 'Aqua should look later each year over Brazil’s biomes, while VIIRS keeps its time.',
  P2: 'Over Punjab, Aqua’s look should move later each year, by about as much as Jethva and colleagues measured.',
  P3: 'Our copy of the satellite data should reproduce INPE’s official counts.',
  P4: 'Before the drift, the audit’s year-to-year wobble should be no bigger than day-to-day sampling noise.',
  P5: 'A change in the mix of fire sizes shouldn’t explain the audit’s result.',
  P6: 'The two VIIRS satellites should give the same answer as references, so the benchmark isn’t drifting itself.',
  P7: 'The fire-day slope measured before the drift, applied to Aqua’s later look, should predict the audit’s values.',
  P8: 'VIIRS should catch small real fires more often than MODIS.',
  P9: 'With Terra looking earlier and Aqua later, Aqua’s count should rise and Terra’s fall where fires grow through the afternoon.',
  P10: 'The two-clocks difference should agree with the audit.',
}

/** Brazil's biomes as the pipeline names them; the last three are scored but are not in this site's region list. */
const BIOME: Record<string, string> = { amazon: 'Amazon', cerrado: 'Cerrado', pantanal: 'Pantanal', caatinga: 'Caatinga', mata_atlantica: 'Atlantic Forest', pampa: 'Pampa' }
const UNLISTED = ['caatinga', 'mata_atlantica', 'pampa']
const BIOME_RE = /\b(amazon|cerrado|pantanal|caatinga|mata_atlantica|pampa)\b/g

/** The file's result line, for readers: biome names written out, the team's internal to-dos taken out. */
function checkDetail(c: Check) {
  return c.detail
    .replace(/Readings disagree:.*$/, 'The two readings disagree, so this check stays pending.')
    .replace(/;\s*time convention not yet checked/, '')
    .replace(BIOME_RE, (b) => BIOME[b] ?? b)
}
const cleanRule = (s?: string) => (s ?? '').replace(/\*\*|`/g, '').replace(BIOME_RE, (b) => BIOME[b] ?? b)

function checksHeading(cs: Check[]) {
  const n = cs.length
  if (!n) return 'The checks are not in the data yet'
  const count = (s: Check['status']) => cs.filter((c) => c.status === s).length
  const pass = count('pass'), fail = count('fail'), pending = count('pending')
  const first = cs.filter((c) => c.result_existed_before_commit).length
  const tally = andList([
    `${capital(numWord(pass))} of ${numWord(n)} checks pass`,
    ...(fail ? [`${numWord(fail)} ${fail === 1 ? 'fails' : 'fail'}`] : []),
    ...(pending ? [`${numWord(pending)} ${pending === 1 ? 'is' : 'are'} pending`] : []),
  ])
  return first ? `${tally}; for ${numWord(first)}, the result came before the rule` : tally
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
  const first = checks.filter((c) => c.result_existed_before_commit).map((c) => c.id)
  const unlisted = UNLISTED.filter((b) => checks.some((c) => new RegExp(`\\b${b}\\b`).test(c.detail)))
  return (
    <section id="checks" aria-labelledby="checks-h" className="scroll-mt-20 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="checks-h" className={title}>{checksHeading(checks)}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            How do we know? The team wrote each check’s rule in its plan, and the pipeline scores the data against that rule. A
            check is a true prediction only if its rule was committed before its result existed.
            {first.length ? ` For ${andList(first)}, the result came first; those rows are marked.` : ''} Where the scoring
            departs from the written rule, the row says how.
          </p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          <ol className="border-t border-[color:var(--hairline)]">
            {checks.map((c) => (
              <li key={c.id} className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-2 border-b border-[color:var(--hairline)] py-5 sm:grid-cols-[3rem_1fr_8rem]">
                <span className="text-sm tabular-nums text-[color:var(--bone3)]">{c.id}</span>
                <div className="min-w-0">
                  <p className="text-sm text-[color:var(--bone)]">{PLAIN[c.id] ?? checkText(c, inpe)}</p>
                  {c.detail ? <p className="mt-1 text-xs text-[color:var(--bone2)]">{checkDetail(c)}</p> : null}
                  {c.result_existed_before_commit ? (
                    <p className="mt-2 inline-block rounded border border-[color:var(--bone-30)] px-2 py-0.5 text-xs text-[color:var(--bone)]">Result came before the rule</p>
                  ) : null}
                  {c.rule_written || c.rule_implemented ? (
                    <details className="group mt-2 text-xs text-[color:var(--bone2)]">
                      <summary className={cn('inline-flex cursor-pointer list-none items-center gap-1 rounded text-[color:var(--bone3)] hover:text-[color:var(--bone)] [&::-webkit-details-marker]:hidden', ease, focusRing)}>
                        <ArrowRight size={12} strokeWidth={1.5} aria-hidden className="transition-transform duration-150 group-open:rotate-90" />
                        The rule
                      </summary>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                        <dt className="text-[color:var(--bone3)]">In the plan</dt>
                        <dd>{checkText(c, inpe)}</dd>
                        {c.rule_written ? (<><dt className="text-[color:var(--bone3)]">As written</dt><dd>{cleanRule(c.rule_written)}</dd></>) : null}
                        {c.rule_implemented ? (<><dt className="text-[color:var(--bone3)]">As scored</dt><dd>{cleanRule(c.rule_implemented)}</dd></>) : null}
                      </dl>
                    </details>
                  ) : null}
                </div>
                <span className="col-start-2 inline-flex items-center gap-2 self-start text-xs text-[color:var(--bone2)] sm:col-start-auto sm:justify-end">
                  <StatusMark status={c.status} />
                  {STATUS[c.status]}
                </span>
              </li>
            ))}
          </ol>
          {unlisted.length ? (
            <p className="mt-4 max-w-[var(--measure)] text-xs text-[color:var(--bone2)]">
              Several checks are scored on all six of Brazil’s biomes, so they name three that aren’t in this site’s region
              list: {andList(unlisted.map((b) => `the ${BIOME[b]}`))}.
            </p>
          ) : null}
          <p className="mt-4 text-xs text-[color:var(--bone3)]">Source: checks.json{mock ? ' · MOCK' : ''}</p>
        </div>
      </div>
    </section>
  )
}

/* ---------- Detection: what each camera caught of real California fires ---------- */

/** One colour and one marker shape per satellite, as on every other chart. */
const DET_SATS = [
  { key: 'S-NPP', label: 'VIIRS (S-NPP)', short: 'VIIRS', color: 'var(--sat-viirs)', shape: 'diamond' },
  { key: 'Aqua', label: 'Aqua (MODIS)', short: 'Aqua', color: 'var(--sat-aqua)', shape: 'filled' },
  { key: 'Terra', label: 'Terra (MODIS)', short: 'Terra', color: 'var(--sat-terra)', shape: 'hollow' },
] as const
type DetShape = (typeof DET_SATS)[number]['shape']
const sizeLabel = (s: string) => s.replace(/^>\s*(\d+)/, (_, n) => `Over ${fmtInt(Number(n))}`).replace(/(\d+)-(\d+)/, (_, a, b) => `${fmtInt(Number(a))}–${fmtInt(Number(b))}`)
const share = (v: number) => `${(v * 100).toFixed(0)}%`
/** Whole acres, rounded half to even as the team's pipeline (Python) rounds, so 946.5 reads 946 here and in the checks. */
const acres = (v: number) => { const f = Math.floor(v); const r = v - f === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(v); return fmtInt(r) }

function DetMark({ shape, color, x, y, r = 5 }: { shape: DetShape; color: string; x: number; y: number; r?: number }) {
  if (shape === 'diamond') return <rect x={x - r * 0.85} y={y - r * 0.85} width={r * 1.7} height={r * 1.7} transform={`rotate(45 ${x} ${y})`} fill={color} stroke="var(--ground)" strokeWidth={1.5} />
  if (shape === 'hollow') return <circle cx={x} cy={y} r={r - 0.5} fill="var(--ground)" stroke={color} strokeWidth={2} />
  return <circle cx={x} cy={y} r={r} fill={color} stroke="var(--ground)" strokeWidth={1.5} />
}

/** Share of fires caught, by size class: a dot per satellite with its 95% range, on one 0-100% axis. */
function DetectionChart({ small }: { small: boolean }) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const width = useMeasuredWidth(boxRef)
  const [active, setActive] = useState(0)
  const sats = DET_SATS.filter((s) => DETECTION?.satellites[s.key])
  const classes = DETECTION?.satellites[sats[0]?.key ?? '']?.rates_2012_2020.map((r) => r.size_class) ?? []
  const rate = (sat: string, cls: string) => DETECTION?.satellites[sat]?.rates_2012_2020.find((r) => r.size_class === cls)
  const rowH = small ? 64 : 72
  const M = { top: 8, right: 16, bottom: 40, left: small ? 108 : 148 }
  const height = M.top + classes.length * rowH + M.bottom
  const plotW = Math.max(0, width - M.left - M.right)
  const X = (v: number) => M.left + v * plotW
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  const readout = (cls: string) => {
    const n = rate(sats[0]?.key ?? '', cls)?.n
    return `${sizeLabel(cls)}${n ? ` (${fmtInt(n)} fires)` : ''}: ${sats.map((s) => { const r = rate(s.key, cls); return r ? `${s.short} ${share(r.rate)} (${share(r.ci95[0])}–${share(r.ci95[1])})` : '' }).filter(Boolean).join(', ')}`
  }
  if (!classes.length) return <p className="text-sm text-[color:var(--bone2)]">The detection rates are not in the data yet.</p>
  return (
    <div>
      <p aria-live="polite" className="mb-3 text-sm tabular-nums text-[color:var(--bone)]">{readout(classes[active] ?? classes[0])}</p>
      <div ref={boxRef} className="relative w-full" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} className="absolute inset-0 block overflow-visible" fontSize={12} role="group" aria-label="Share of agency-recorded California fires each satellite caught, by fire size, 2012 to 2020">
            {ticks.map((t) => (
              <g key={t} aria-hidden>
                <line x1={X(t)} x2={X(t)} y1={M.top} y2={M.top + classes.length * rowH} stroke="var(--hairline)" shapeRendering="crispEdges" />
                <text x={X(t)} y={M.top + classes.length * rowH + 20} textAnchor="middle" fill="var(--bone2)">{share(t)}</text>
              </g>
            ))}
            <text aria-hidden x={M.left + plotW / 2} y={height - 4} textAnchor="middle" fill="var(--bone3)">Share of fires caught, 2012–2020</text>
            {classes.map((cls, i) => {
              const y0 = M.top + i * rowH
              const on = i === active
              return (
                <g
                  key={cls}
                  tabIndex={0}
                  role="img"
                  aria-label={readout(cls)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className="outline-none [&:focus-visible>rect:first-child]:stroke-[color:var(--bone)]"
                >
                  <rect x={0} y={y0 + 2} width={width} height={rowH - 4} rx={4} fill={on ? 'var(--surface)' : 'transparent'} stroke="transparent" strokeWidth={1.5} />
                  <text x={8} y={y0 + rowH / 2} dominantBaseline="central" fill={on ? 'var(--bone)' : 'var(--bone2)'}>{sizeLabel(cls)}</text>
                  {sats.map((s, k) => {
                    const r = rate(s.key, cls)
                    if (!r) return null
                    const y = y0 + rowH / 2 + (k - (sats.length - 1) / 2) * (small ? 14 : 16)
                    return (
                      <g key={s.key}>
                        <line x1={X(r.ci95[0])} x2={X(r.ci95[1])} y1={y} y2={y} stroke={s.color} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
                        <DetMark shape={s.shape} color={s.color} x={X(r.rate)} y={y} />
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        ) : null}
      </div>
      <div aria-hidden className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[color:var(--bone2)]">
        {sats.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <svg width={14} height={14}><DetMark shape={s.shape} color={s.color} x={7} y={7} r={4.5} /></svg>
            {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-2"><svg width={16} height={12}><line x1={1} x2={15} y1={6} y2={6} stroke="var(--bone3)" strokeWidth={2} strokeLinecap="round" /></svg>95% range</span>
      </div>
    </div>
  )
}

/** The matching rule from the file, said in words when it has the usual form; otherwise the rule as the file states it. */
function matchingRule(rule?: string) {
  const m = rule ? /\+\s*(\d+(?:\.\d+)?)\s*km between discovery\s*-\s*(\d+)\s*h and containment\s*\+\s*(\d+)\s*h/.exec(rule) : null
  if (!m) return rule ? `The matching rule: ${rule}.` : ''
  return `A fire counts as caught when a hotspot falls within its radius plus ${m[1]} km, from ${m[2]} hours before it was discovered to ${m[3]} hours after it was contained.`
}

function Detection() {
  const small = useMedia('(max-width: 639px)')
  const sats = DET_SATS.filter((s) => DETECTION?.satellites[s.key])
  const firstClass = DETECTION?.satellites[sats[0]?.key ?? '']?.rates_2012_2020[0]?.size_class
  const rateOf = (k: string) => DETECTION?.satellites[k]?.rates_2012_2020.find((r) => r.size_class === firstClass)?.rate
  const heading = firstClass && sats.every((s) => rateOf(s.key) != null)
    ? `Of isolated, agency-recorded California fires of ${sizeLabel(firstClass)}, VIIRS caught ${share(rateOf('S-NPP')!)}, Aqua ${share(rateOf('Aqua')!)} and Terra ${share(rateOf('Terra')!)}`
    : 'What each camera caught of real California fires'
  const a50 = sats.map((s) => ({ ...s, v: DETECTION?.satellites[s.key]?.a50_acres, ci: DETECTION?.satellites[s.key]?.a50_ci95 })).filter((s) => s.v != null)
  // every year in the by-year file where VIIRS caught a larger share of the smallest fires than Aqua
  const proofYears = PROOF ? [...new Set(PROOF.years.map((y) => y.year))] : []
  const smallest = PROOF?.size_classes[0]
  const viirsAhead = proofYears.filter((yr) => { const r = PROOF!.years.find((y) => y.year === yr && y.size_class === smallest); return r && r.viirs_pod > r.aqua_pod }).length
  const seen = SEEN?.fires ?? []
  const caught = (k: 'viirs' | 'aqua' | 'terra', fs = seen) => fs.filter((f) => f[k]).length
  const tiny = seen.filter((f) => f.acres < 10)
  const span = seen.length ? [Math.min(...seen.map((f) => f.year)), Math.max(...seen.map((f) => f.year))] : null
  return (
    <section id="detection" aria-labelledby="detection-h" className="scroll-mt-20 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="detection-h" className={title}>{heading}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            Why VIIRS is the benchmark. We matched each fire in the US Forest Service’s fire occurrence database (FPA-FOD) to
            the satellites’ hotspots. {matchingRule(DETECTION?.rule)}
          </p>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone)]">
            These rates describe one matching procedure for isolated, agency-recorded California fires, not universal limits
            of the cameras.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-12 lg:col-span-8">
          <figure className="m-0">
            <figcaption className="mb-4">
              <span className="block text-lg font-medium">Share of fires caught, by size</span>
              <span className="mt-1 block max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">Each mark is one satellite’s share of the fires in that size class, 2012–2020, with its 95% range. Hover or tab through the rows.</span>
            </figcaption>
            <DetectionChart small={small} />
          </figure>
          {a50.length ? (
            <div>
              <p className="text-lg font-medium">Fire size caught half the time, 2012–2020</p>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-[color:var(--hairline)] pt-4 sm:grid-cols-3">
                {a50.map((s) => (
                  <div key={s.key}>
                    <dt className="inline-flex items-center gap-2 text-xs text-[color:var(--bone2)]">
                      <svg width={14} height={14} aria-hidden><DetMark shape={s.shape} color={s.color} x={7} y={7} r={4.5} /></svg>
                      {s.label}
                    </dt>
                    <dd className="mt-1 text-[length:var(--fs-40)] font-medium leading-none tabular-nums">{acres(s.v!)} <span className="text-sm font-normal">acres</span></dd>
                    {s.ci ? <dd className="mt-1 text-xs tabular-nums text-[color:var(--bone3)]">95% range {acres(s.ci[0])}–{acres(s.ci[1])}</dd> : null}
                  </div>
                ))}
              </dl>
              {proofYears.length && smallest ? (
                <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
                  Year by year, VIIRS caught a larger share of fires of {sizeLabel(smallest)} than Aqua in {numWord(viirsAhead)} of {numWord(proofYears.length)} years,
                  {' '}{Math.min(...proofYears)} to {Math.max(...proofYears)}.
                </p>
              ) : null}
            </div>
          ) : null}
          {seen.length && span && SEEN ? (
            <div className="border-t border-[color:var(--hairline)] pt-6">
              <p className="text-lg font-medium">Close up: one {SEEN.radius_km} km circle in Southern California</p>
              <p className="mt-2 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
                The agency recorded {fmtInt(seen.length)} fires there from {span[0]} to {span[1]}. VIIRS caught {fmtInt(caught('viirs'))} of them, Aqua{' '}
                {fmtInt(caught('aqua'))} and Terra {fmtInt(caught('terra'))}. Of those, {fmtInt(tiny.length)} were under 10 acres; VIIRS caught {fmtInt(caught('viirs', tiny))} of them{caught('aqua', tiny) + caught('terra', tiny) === 0 ? ', and MODIS none' : `, Aqua ${fmtInt(caught('aqua', tiny))} and Terra ${fmtInt(caught('terra', tiny))}`}.
              </p>
            </div>
          ) : null}
          <p className="text-xs text-[color:var(--bone3)]">
            Sources: detection_limits_california.json · proof_california.json · socal_seen_missed.json{DETECTION?.mock || SEEN?.mock ? ' · MOCK' : ''}
          </p>
        </div>
      </div>
    </section>
  )
}

/* ---------- Limits: the team's own caveats, in plain words ---------- */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthName = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`

function Limits({ d }: { d: RegionData }) {
  const lastYear = d.years[d.years.length - 1]?.year
  // months after Aqua's 2002-2011 record whose fixed-clock value is Aqua's own count, because S-NPP had an outage day
  const filled = d.cal.filter((c) => c.source === 'aqua_observed' && Number(c.ym.slice(0, 4)) >= 2012).map((c) => c.ym)
  const items: { t: string; b: string }[] = [
    {
      t: 'A description, not a cause',
      b: 'The audit sets Aqua’s count beside a fixed-clock benchmark built from VIIRS. It shows the gap and the change in Aqua’s clock together; it doesn’t isolate how much of the gap the timing caused. The benchmark is an estimate, not a corrected official count.',
    },
    {
      t: 'A coarse placebo range',
      b: 'Nine years, 2012 to 2020, set the range a year is flagged against. A tenth ordinary year would fall outside it about one time in five, so a flag describes; it is not a significance test. The 95% ranges resample days, not years, so year-to-year fire weather shows only in that placebo range.',
    },
    {
      t: 'Weak flags',
      b: 'A year just outside a narrow placebo range is not a finding: the Cerrado and Argentina in 2022 sit just outside theirs, close to no change. Argentina’s 2025 range takes in no change when days are resampled in 32-day blocks.',
    },
    {
      t: 'Missing days are inferred',
      b: 'A satellite counts as down on a day with no daytime detection anywhere in Brazil, and those days are dropped for every region. That is not an official outage list, and a partial loss over one region on an otherwise normal day isn’t caught. S-NPP events still to check: an anomaly in July 2022, geolocation problems in 2024 and a partial data receipt in July 2025.',
    },
    ...(filled.length
      ? [{
          t: 'Some early months use Aqua',
          b: `${capital(numWord(filled.length))} calendar months before 2018 had an S-NPP outage day and no NOAA-20 data to fill it, so they show Aqua’s own count, from before its clock drifted: ${andList(filled.map(monthName))}.`,
        }]
      : []),
    {
      t: 'MODIS has its own history',
      b: 'Aqua lost recorder data in early 2022 and went into safe hold on 31 March 2022; Terra paused its science data in October 2022 as it left its constellation. The two satellites are calibrated separately.',
    },
    {
      t: 'Reprocessed VIIRS files',
      b: 'In May 2025 NASA reprocessed VIIRS files to fix static heat sources labelled as vegetation fires. That touches the timing and fire-size inputs, which filter by fire type, not the all-types counts the audit uses. Product versions aren’t yet recorded per file.',
    },
    ...(lastYear ? [{ t: `Nothing after ${lastYear}`, b: `${lastYear}’s counts come from FIRMS’s yearly files; there is no ${lastYear + 1} data yet.` }] : []),
  ]
  return (
    <section id="limits" aria-labelledby="limits-h" className="scroll-mt-20 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="limits-h" className={title}>What this audit can’t tell you</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">The team’s own caveats, from its method notes.</p>
        </div>
        <ul className="min-w-0 border-t border-[color:var(--hairline)] lg:col-span-8">
          {items.map((it) => (
            <li key={it.t} className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-[color:var(--hairline)] py-5 sm:grid-cols-[14rem_1fr]">
              <p className="text-sm text-[color:var(--bone)]">{it.t}</p>
              <p className="max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">{it.b}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------- About: who it's for, and what comes after Aqua ---------- */

const NESDIS_SNPP = 'https://www.nesdis.noaa.gov/news/administrative-update-2-cessation-of-suomi-national-polar-orbiting-partnership-s-npp-data-users-november-02-2026-1300-utc-and-decommissioning-issued-october-19-2026-1400-utc'
const NASA_TERRA = 'https://science.nasa.gov/science-research/earth-science/terra-the-end-of-an-era/'
const NASA_AQUA_LIFE = 'https://ceres.larc.nasa.gov/documents/STM/2026-05/01_ceres-st-May2026-considine2.pdf'

function About() {
  const p6 = CHECKS.checks.find((c) => c.id === 'P6')?.status === 'pass'
  const link = cn(underline, 'text-[color:var(--bone)]', focusRing)
  return (
    <section id="about" aria-labelledby="about-h" className="scroll-mt-20 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="about-h" className={title}>Who this is for, and what comes after Aqua</h2>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-10 border-t border-[color:var(--hairline)] pt-6 sm:grid-cols-2 lg:col-span-8">
          <div>
            <h3 className="text-lg font-medium">Who it’s for</h3>
            <p className="mt-2 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
              Journalists and analysts who quote INPE’s fire counts for Brazil, and anyone reading a long fire record from a
              satellite whose clock moved. Before quoting a change from one year to the next, check how far Aqua’s count sat
              from its fixed-clock benchmark in both years.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">What comes next</h3>
            <p className="mt-2 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
              Aqua and Terra are near their end: NASA’s planning puts Terra’s last operations around{' '}
              <a href={NASA_TERRA} target="_blank" rel="noreferrer" className={link}>February 2027</a> and Aqua’s maximum
              lifetime around <a href={NASA_AQUA_LIFE} target="_blank" rel="noreferrer" className={link}>September 2027</a>.
              Any fire record that uses Aqua as its reference, as INPE’s does, will need a new one.
            </p>
            <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
              S-NPP, one of the VIIRS satellites behind the benchmark, was{' '}
              <a href={NESDIS_SNPP} target="_blank" rel="noreferrer" className={link}>decommissioned on 2 November 2026</a>.
              NOAA-20 and NOAA-21 carry the same VIIRS camera on afternoon orbits that keep their clock
              {p6 ? ', and our check P6 found S-NPP and NOAA-20 give the same answer as references' : ''}, so the benchmark
              can go on. The same test can check any change of reference satellite: compare the old and the new on the days
              both flew.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Landing: how the audit reads a count, on a bone band ---------- */

function HowItWorks() {
  const motion = useMotion()
  const d = useMemo(() => regionData(FEATURED), [])
  const y = d.latestOk?.year ?? 2025
  const dr = d.driftAt(y)
  const [ref, seen] = useInView<HTMLOListElement>(motion.on, 0.3)
  const first = d.drift[0], last = d.lastDrift
  const steps = [
    {
      t: 'The reference satellite drifted',
      b: `INPE’s official fire counts for Brazil follow one reference satellite, Aqua, which for years looked at about the same time of day.${d.driftStart && first && last ? ` Since ${d.driftStart} its look over the Amazon has moved later: ${first.aqua_lst} in ${first.year}, ${last.aqua_lst} in ${last.year}.` : ''}`,
    },
    { t: 'Fires and clouds change through the day', b: 'So a count that follows a drifting clock can change with the time it looks as well as with the fires. Which way, and by how much, has to be measured, not assumed.' },
    { t: 'We hold the clock still', b: 'VIIRS still looks at the same time. We turn its counts into an Aqua-equivalent estimate, month by month, and set Aqua’s own count beside it, with a 95% range and the 2012–2020 placebo range. The gap shows where the two part; on its own it doesn’t say how much the timing caused.' },
  ]
  // the pass figure, re-inked for the bone ground
  const inked = {
    '--bone': 'var(--ink)',
    '--bone3': '#4E514A',
    '--bone-30': 'rgba(11, 13, 11, 0.3)',
    '--bone-80': 'rgba(11, 13, 11, 0.8)',
    '--sat-aqua': '#A65D00',
    '--sat-terra': '#2266A4',
    '--sat-viirs': '#1C7F4C',
    '--figure-bg': '#ECE9E1',
    '--figure-on': '#ECE9E1',
  } as CSSProperties
  return (
    <section id="how" aria-labelledby="how-h" className="scroll-mt-4 bg-[color:var(--bone)] text-[color:var(--ink)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <Rise><h2 id="how-h" className={titleLarge}>How we read a fire count</h2></Rise>
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

/** Their closing slogan, as the site's tagline, with one last way in. */
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

/* ---------- Clock effect by year: 21st.dev's anomaly chart against the placebo range, in Aqua's colour ---------- */

const tickText = (v: number) => (v === 0 ? '0%' : pct(v, 0))

function ClockEffect({ d, year, onYear, small }: { d: RegionData; year: number; onYear: (y: number) => void; small: boolean }) {
  const n = placeboText(d)
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
        expected: d.placebo,
        outside: y.verdict === 'outside',
        valueText:
          y.verdict === 'na'
            ? `${y.year}: too few hotspots to read`
            : `${y.year}: Aqua ${effectText(y)} against its benchmark, 95% range ${rangeText(y)}, ${READING[y.verdict].toLowerCase()}`,
      })),
    [d, n],
  )
  // colour on the lines only: Aqua's amber marks on the page's own ground; the placebo band is a neutral tint
  const chartVars = {
    '--ac-line': 'var(--sat-aqua)',
    '--ac-fg': 'var(--bone2)',
    '--ac-surface': 'var(--ground)',
    '--ac-band': 'rgba(236, 233, 225, 0.08)',
    '--ac-grid': 'var(--hairline)',
    '--ac-zero': 'var(--bone-30)',
  } as CSSProperties
  return (
    <section id="audit" aria-labelledby="audit-h" style={chartVars} className="scroll-mt-20 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="audit-h" className={title}>{effectHeading(d)}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            Each year, Aqua’s daytime hotspot count against its fixed-clock benchmark: what its 2012–2020 relationship with
            VIIRS predicts, with a 95% range. The band is the range of nine 2012–2020 placebo years ({n}). A year outside it
            is flagged as a description, not a significance test, and it doesn’t say how much the timing caused.
          </p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          {shown ? (
            <p aria-live="polite" className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
              <span className="tabular-nums">{shown.year}</span>
              <span className="text-lg font-medium">{shown.verdict === 'na' ? 'No reading' : `${effectText(shown)} against the benchmark`}</span>
              {shown.verdict !== 'na' ? <span className="tabular-nums">95% range {rangeText(shown)}</span> : null}
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
            groupLabel={`Aqua against its fixed-clock benchmark, by year, for ${d.name}`}
            bandLabel="2012–2020 placebo range"
            formatTick={tickText}
            legend={{ outside: 'Outside the placebo range', inside: 'Within it', range: '95% range' }}
          />
          <p className="mt-4 text-xs text-[color:var(--bone3)]">Source: audit/{d.id}.json{d.mock ? ' · MOCK' : ''}</p>
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
