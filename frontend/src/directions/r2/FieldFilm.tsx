import { RecentObservations } from '@/r2/recent-observations'
// The site's router and its Regions page. Four pages: Overview (Overview.tsx, the front door), Regions (here), the
// Simulator (Simulator.tsx) and Method (Method.tsx); each but the Regions page loads only when it opens. The pages share
// common.tsx (tokens, motion, the bar with the four-page menu, the footer); the daylight section moved to daylight.tsx
// for the Simulator.
// The Regions page holds one place at a time, in plain words: its name over its footage, the picker for the six places,
// the result with its caveat, when each satellite looked by year, the year-by-year numbers, the two clocks, the monthly
// calendar with its download, and (on the live site) the world map as early exploration. Picking a place changes every
// section and the URL. Black and bone; each satellite has one colour on lines and marks, never on a background.
// Every number comes from src/r2/data.ts; the MOCK labels follow each file's own "mock" flag.
import { Fragment, Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { ArrowRight, ArrowUpRight, Download } from 'lucide-react'
import { CalendarLegend, FireCalendar, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle } from '@/r2/controls'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'
import {
  CHECKS, MONTHS, REGIONS, calendarFinding, fireSeason, calendarGrid, calendarSpan, fmtInt, fmtRange, hasOfficialSeries, hm, isValidation, lookChange, minutesBetween, novemberRatio, pct, phrase, regionData, verdictLines,
  type Check, type MonthRange, type RegionData, type Verdict,
} from '@/r2/data'
import { cn } from '@/lib/utils'
import { AnomalyChart, type AnomalyPoint } from '@/components/ui/anomaly-chart'
import { SeriesChart, useMeasuredWidth, type Series } from '@/components/ui/series-chart'
import { OrbitGlobe, type GlobeOrbit } from '@/components/ui/orbit-globe'
import { RollingDigits } from '@/components/ui/rolling-digits'
import { ScrollSpy } from '@/components/ui/scroll-spy'
import { inRegion } from '@/r2/region-shapes'
import { photoFor } from '@/r2/photos'
import {
  CAVEAT, FEATURED, Footer, JETHVA, MockTag, More, MotionContext, PageNext, SatMark, SiteBar, TOKENS, andList, ease, focusRing, glideTo, linksFor, primaryButton, readMotion, secondaryButton,
  shell, statement, statementName, storeMotion, textLink, title, useEasedScroll, useLeave, useStartAtTop, useMedia, useMotion, usePortalTokens,
  type Leave, type Links, type Nav, type Page,
} from './common'

/** The pages that load only when they open. */
const Simulator = lazy(() => import('./Simulator'))
const Overview = lazy(() => import('./Overview'))
const Method = lazy(() => import('./Method'))

/* ---------- Pages: the routing, in one place ---------- */

/** Page names as the URL (?page=…) or the comment artifact's data-page gives them. "app" was the audit page's address,
 *  and "home" the landing that came before the overview. */
const PAGE_NAMES: Record<string, Page> = { overview: 'overview', home: 'overview', regions: 'regions', app: 'regions', sim: 'sim', explore: 'sim', method: 'method' }

/** The comment artifact names its page (data-page); the site reads ?page=. With no page named, a region in the URL opens
 *  the Regions page and anything else the overview. The artifact's front page (index.html) still answers its old
 *  region links, index.html#region=…, with the Regions page. */
function pageFor(dataPage?: string): Page {
  if (dataPage) {
    const p = Object.hasOwn(PAGE_NAMES, dataPage) ? PAGE_NAMES[dataPage] : 'overview'
    return p === 'overview' && readParam('region') ? 'regions' : p
  }
  const q = new URLSearchParams(window.location.search).get('page')
  if (q && Object.hasOwn(PAGE_NAMES, q)) return PAGE_NAMES[q]
  return readParam('region') ? 'regions' : 'overview'
}

function initialRegion() {
  const r = readParam('region')
  return r && REGIONS.some((x) => x.id === r) ? r : FEATURED
}

/** A value the page keeps in the URL: the query string on the site, the hash in the comment artifact. */
function readParam(key: string) {
  const q = new URLSearchParams(window.location.search).get(key)
  const h = new RegExp(`(?:^#|&)${key}=([\\w-]+)`).exec(window.location.hash)?.[1]
  return q ?? h ?? null
}

/** Write values into the URL (null removes one), keeping the others. */
function writeParams(nav: Nav, values: Record<string, string | null>) {
  try {
    const p = new URLSearchParams(nav === 'artifact' ? window.location.hash.replace(/^#/, '') : window.location.search)
    for (const [k, v] of Object.entries(values)) { if (v == null) p.delete(k); else p.set(k, v) }
    if (nav === 'artifact') window.history.replaceState(null, '', `#${p.toString()}`)
    else window.history.replaceState(null, '', `?${p.toString()}${window.location.hash}`)
  } catch { /* sandboxed frames may refuse history writes */ }
}

/** The calendar's month range from the URL, when it is a valid range inside the file's months; every month otherwise. */
function readRange(d: RegionData): MonthRange {
  const full = calendarSpan(d)
  const ok = (v: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) && v >= full.from && v <= full.to
  const a = readParam('from'), b = readParam('to')
  const from = ok(a) ? a : full.from, to = ok(b) ? b : full.to
  return from <= to ? { from, to } : { from: to, to: from }
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** `page` names the page to draw (the comment artifact passes its data-page); without it, the URL's ?page= does. */
export default function FieldFilm({ page, nav = 'dev' }: { page?: string; nav?: Nav }) {
  usePortalTokens()
  const which = pageFor(page)
  const [motion, setMotionState] = useState(readMotion)
  const setMotion = (on: boolean) => { setMotionState(on); storeMotion(on) }
  const [region, setRegion] = useState(initialRegion)
  const links = linksFor(nav)
  const leave = useLeave(motion)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const motionRef = useRef(motion)
  motionRef.current = motion

  // wheel and trackpad scrolling eases toward its target; not on the Simulator, whose page doesn't scroll
  useEasedScroll(motion && which !== 'sim')
  useStartAtTop()

  // links to a section (#calendar…) glide there instead of jumping; keyboard users land on the section's heading
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]')
      const id = a ? decodeURIComponent(a.getAttribute('href')!.slice(1)) : ''
      const el = id && !id.includes('=') ? document.getElementById(id) : null
      if (!el) return
      e.preventDefault()
      glideTo(id === 'top' ? 'top' : el, motionRef.current)
      if (e.detail === 0) {
        const f = (el.querySelector('h1, h2') as HTMLElement | null) ?? el
        if (!f.hasAttribute('tabindex')) f.setAttribute('tabindex', '-1')
        f.focus({ preventScroll: true })
      }
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root?.animate) return
    if (motion) root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE })
    // coming back through history must not land on a faded page
    const back = (e: PageTransitionEvent) => { if (e.persisted) root.getAnimations().forEach((a) => a.cancel()) }
    window.addEventListener('pageshow', back)
    return () => window.removeEventListener('pageshow', back)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // the Simulator takes two links it may not declare yet; passed through a loose type, so either version type-checks
  const simLinks: Record<string, string> = { overviewHref: links.overview(), methodHref: links.method() }
  return (
    <MotionContext.Provider value={{ on: motion, set: setMotion }}>
      <div
        id="anchor-root"
        ref={rootRef}
        style={TOKENS as unknown as CSSProperties}
        data-motion={motion ? 'on' : 'off'}
        className="relative min-h-screen overflow-x-clip bg-[color:var(--ground)] font-[family-name:var(--f-ui)] text-sm text-[color:var(--bone)] antialiased"
      >
        {which === 'sim' ? (
          <Suspense fallback={<div className="h-[100svh] bg-[#03060A]" />}>
            <Simulator home={links.overview()} regionsHref={(id: string) => links.regions(id)} leave={leave} motion={motion} setMotion={setMotion} nav={nav} {...simLinks} />
          </Suspense>
        ) : (
          <Suspense fallback={<div className="min-h-[100svh]" />}>
            {which === 'overview' ? (
              <Overview links={links} leave={leave} />
            ) : which === 'method' ? (
              <Method links={links} leave={leave} nav={nav} />
            ) : (
              <RegionsPage region={region} onRegion={(id) => { setRegion(id); writeParams(nav, { region: id }) }} nav={nav} links={links} leave={leave} />
            )}
          </Suspense>
        )}
      </div>
    </MotionContext.Provider>
  )
}

/* ---------- The Regions page ---------- */

type AuditRow = RegionData['years'][number]
const defaultYear = (d: RegionData) => d.latestOk?.year ?? d.years[d.years.length - 1]?.year ?? d.lastDrift?.year ?? 2025
/** "Unusual" means outside the nine 2012–2020 years' range (the pipeline's outside_noise), read only when the year is ok. */
const UNUSUAL: Record<Verdict, string> = { outside: 'Unusual', close: 'Close call', within: 'Not unusual', na: 'Too few fires to read' }
/** "30% more" / "4% fewer", rounded as the headline says it */
const moreFewer = (gap: number) => `${Math.round(Math.abs(gap))}% ${gap >= 0 ? 'more' : 'fewer'}`
const rangeText = (y: AuditRow) => (y.lo == null || y.hi == null ? '—' : fmtRange(y.lo, y.hi))
/** the nine 2012–2020 years' range, as percent */
const usualText = (d: RegionData) => `${pct(d.placebo[0])} to ${pct(d.placebo[1])}`
/** The Regions page's sections, in the order the page tells them. */
const sectionSpy = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'verdict', label: 'Against the benchmark' },
  { id: 'look', label: 'When it flies over' },
  { id: 'global', label: 'Any area' },
]

function RegionsPage({ region, onRegion, nav, links, leave }: { region: string; onRegion: (id: string) => void; nav: Nav; links: Links; leave: Leave }) {
  const d = useMemo(() => regionData(region), [region])
  const motion = useMotion()
  const [year, setYear] = useState(() => defaultYear(d))
  const [mode, setModeState] = useState<CalendarMode>(() => (readParam('cal') === 'anomaly' ? 'anomaly' : 'count'))
  const [range, setRangeState] = useState<MonthRange>(() => readRange(d))
  const setMode = (m: CalendarMode) => { setModeState(m); writeParams(nav, { cal: m === 'anomaly' ? 'anomaly' : null }) }
  const setRange = (r: MonthRange) => {
    const full = calendarSpan(d)
    const all = r.from === full.from && r.to === full.to
    setRangeState(r)
    writeParams(nav, { from: all ? null : r.from, to: all ? null : r.to })
  }
  const small = useMedia('(max-width: 639px)')
  const wide = useMedia('(min-width: 1280px)')
  const pick = (id: string) => { onRegion(id); setYear(defaultYear(regionData(id))) }
  const spy = sectionSpy
  return (
    <>
      <SiteBar page="regions" links={links} leave={leave} regionsHref={links.regions(region)} />
      <main id="top">
        <RegionHero d={d} />
        {/* the picker for the six places, held under the bar while the page scrolls; the sections on wide screens */}
        <div className="sticky top-14 z-30 border-b border-[color:var(--hairline)] bg-[color:var(--ground)]">
          <div className={cn(shell, 'flex items-center gap-6')}>
            <ToggleGroup.Root
              type="single"
              value={region}
              onValueChange={(v) => { if (v) pick(v) }}
              aria-label="Place shown"
              className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {REGIONS.map((r) => (
                <ToggleGroup.Item
                  key={r.id}
                  value={r.id}
                  className={cn(
                    'relative flex h-11 shrink-0 items-center whitespace-nowrap rounded px-3 text-sm text-[color:var(--bone2)] hover:text-[color:var(--bone)] data-[state=on]:text-[color:var(--bone)]',
                    ease, focusRing,
                  )}
                >
                  {phrase(r.id).short}
                  {r.id === region ? <span aria-hidden className="absolute inset-x-3 bottom-1.5 h-0.5 bg-[color:var(--bone)]" /> : null}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
            {wide ? <ScrollSpy sections={spy} offset={128} label="Sections" motion={motion.on} onNavigate={(el) => glideTo(el, motion.on)} className="shrink-0" /> : null}
          </div>
        </div>
        <Calendar d={d} mode={mode} onMode={setMode} range={range} onRange={setRange} small={small} />
        <Result d={d} links={links} leave={leave} />
        <p className={cn(shell, 'pb-4 text-sm text-[color:var(--bone2)]')}>Close call: just outside the usual range, but the likely range overlaps it.</p>
        <YearByYear d={d} year={year} onYear={setYear} small={small} />
        <LookTimes key={d.id} d={d} />
        {/* any other area: the world map lives on Explore, marked as early exploration */}
        <section id="global" aria-labelledby="global-h" className="scroll-mt-32 border-t border-[color:var(--hairline)]">
          <div className={cn(shell, 'flex flex-wrap items-center gap-x-6 gap-y-4 py-12')}>
            <h2 id="global-h" className="text-lg font-medium text-[color:var(--bone)]">Or pick any area</h2>
            <a href={anyArea(links)} onClick={leave} className={secondaryButton}>Open the world map <ArrowRight size={16} aria-hidden /></a>
            <a href="#calendar" className={primaryButton}>Back to the fire calendar <ArrowRight size={16} aria-hidden /></a>
          </div>
        </section>
      </main>
      <PageNext page="regions" links={links} leave={leave} regionsHref={links.regions(region)} />
      <Footer
        links={links}
        leave={leave}
        notes={[
          <>Fires are counted on the days both satellites sent data.</>,
          <>Unusual means outside the 2012–2020 usual range with a likely range that does not overlap it. Close calls overlap that range. For {d.phrase.the} that usual range is {usualText(d)}.</>,
          <>Look times are local sun time: the middle of each satellite’s fire detections that year.</>,
          <>Calendar: normal is the middle value for that month, 2002–2025, counted by VIIRS and scaled to Aqua’s count.</>,
          <>Files for {d.phrase.the}: drift, audit, twoclocks and calendar, in the team’s data/out folder.{d.mock || d.twoMock ? ' Some of these are mock data.' : ''}</>,
        ]}
      />
    </>
  )
}

/** the fire season's three months in words: "August, September and October" */
function seasonMonths(d: RegionData) {
  const s = fireSeason(d).start
  return `${MONTH_LONG[s]}, ${MONTH_LONG[s + 1]} and ${MONTH_LONG[s + 2]}`
}
const seasonIndex = (d: RegionData) => { const s = fireSeason(d).start; return [s, s + 1, s + 2] }
/** Explore's world map, opened at the whole globe */
const anyArea = (links: Links) => { const u = links.sim(); return `${u}${u.includes('?') ? '&' : u.includes('#') ? '&' : '#'}globe=1` }

/* ---------- The place's name over its footage ---------- */

/** A region's media: its drone loop where one exists (muted, played once per showing, from the top, then held on its
 *  last frame), else its photograph with a slow push-in. Without motion, the still and nothing moving. */
function RegionMedia({ id, active, className }: { id: string; active: boolean; className?: string }) {
  const motion = useMotion()
  const p = photoFor(id)
  const ref = useRef<HTMLVideoElement | null>(null)
  const v = p.video
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
        <video ref={ref} src={v.src} poster={v.poster} muted playsInline autoPlay={active && motion.on} preload={active ? 'auto' : 'metadata'} aria-hidden className={className} />
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
      className={cn(className, active && motion.on && 'animate-[anchor-push_14s_ease-out_both]')}
    />
  )
}

function RegionHero({ d }: { d: RegionData }) {
  const region = d.id
  // footage loads as its region is first shown, then stays for the crossfade
  const [loaded, setLoaded] = useState<string[]>([region])
  useEffect(() => { setLoaded((l) => (l.includes(region) ? l : [...l, region])) }, [region])
  return (
    <section aria-labelledby="region-h" className="relative isolate flex h-[52svh] min-h-[380px] max-h-[680px] flex-col overflow-hidden bg-[color:var(--surface)]">
      <div className="absolute inset-0 -z-10">
        {loaded.map((id) => (
          <RegionMedia key={id} id={id} active={id === region} className={cn('absolute inset-0 size-full object-cover transition-opacity duration-700 ease-[var(--ease)]', id === region ? 'opacity-100' : 'opacity-0')} />
        ))}
        <div aria-hidden className="absolute inset-0 bg-[image:var(--scrim-statement)]" />
      </div>
      <div className={cn(shell, 'mt-auto pb-6 sm:pb-8')}>
        <MockTag show={d.mock} className="mb-4 inline-block bg-[color:var(--plate)]" />
        <h1 id="region-h" className={statement}>
          <span key={region} className="block animate-[anchor-fade_600ms_cubic-bezier(0.22,1,0.36,1)]">{statementName(region)}</span>
        </h1>
        <p className="mt-3 text-lg text-[color:var(--bone)]">Fire season: {seasonMonths(d)}</p>
      </div>
    </section>
  )
}

/* ---------- The result, with its caveat ---------- */

function Result({ d, links, leave }: { d: RegionData; links: Links; leave: Leave }) {
  const motion = useMotion()
  const y = d.latestOk
  const look = lookChange(d)
  const validation = isValidation(d.id)
  const sim = (
    <a href={links.sim(d.id)} onClick={leave} className={primaryButton}>
      Open in Explore <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
    </a>
  )
  if (validation) {
    const nov = novemberRatio(d)
    const a = nov.find((r) => r.year === 2016), b = nov[nov.length - 1]
    const tooFew = d.years.filter((r) => r.verdict === 'na').map((r) => r.year)
    return (
      <section id="verdict" aria-labelledby="verdict-h" className="scroll-mt-32 border-t border-[color:var(--hairline)]">
        <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-20')}>
          <div className="lg:col-span-7">
            <h2 id="verdict-h" className={title}>Punjab + Haryana is our test case</h2>
            <div className="mt-5 flex max-w-[var(--measure)] flex-col gap-3 text-lg text-[color:var(--bone2)]">
              <p>Farmers here burn crop leftovers every autumn. Pictures taken every hour from a weather satellite show the burning moving later into the afternoon (<a href={JETHVA} target="_blank" rel="noreferrer" className={textLink}>Jethva 2026</a>).</p>
              {a && b ? <p>Aqua’s November count moved toward VIIRS’s, in line with that: <span className="tabular-nums text-[color:var(--bone)]">{a.ratio.toFixed(2)}</span> of VIIRS’s in {a.year}, <span className="tabular-nums text-[color:var(--bone)]">{b.ratio.toFixed(2)}</span> in {b.year}.</p> : null}
              {tooFew.length ? <p>{tooFew.length > 1 ? `${tooFew[0]}–${tooFew[tooFew.length - 1]} have` : `${tooFew[0]} has`} too few fires to read, so we don’t quote {tooFew.length > 1 ? 'them' : 'it'}.</p> : null}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">{sim}</div>
          </div>
        </div>
      </section>
    )
  }
  if (!y || y.gap == null) {
    return (
      <section id="verdict" aria-labelledby="verdict-h" className="scroll-mt-32 border-t border-[color:var(--hairline)]">
        <div className={cn(shell, 'py-16')}>
          <h2 id="verdict-h" className={title}>Too few fires over {d.phrase.the} to compare Aqua with the benchmark</h2>
          <div className="mt-8">{sim}</div>
        </div>
      </section>
    )
  }
  const unusual = y.verdict === 'outside'
  return (
    <section id="verdict" aria-labelledby="verdict-h" className="scroll-mt-32 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-20')}>
        <div className="lg:col-span-8">
          <h2 id="verdict-h" className={title}>Aqua against the benchmark</h2>
          <p className="mt-4 max-w-[var(--measure)] text-lg text-[color:var(--bone)]">In {y.year}, Aqua counted {moreFewer(y.gap)} fires over {d.phrase.the} than the VIIRS-based benchmark.</p>
          <p className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <RollingDigits text={pct(y.gap, 0)} live motion={motion.on} className="text-[length:var(--fs-72)] font-medium leading-none tracking-[-0.03em] max-sm:text-[56px]" />
            <span className={cn('rounded px-2 py-1 text-sm', unusual ? 'bg-[color:var(--bone)] text-[color:var(--ink)]' : 'border border-[color:var(--bone-30)] text-[color:var(--bone)]')}>{UNUSUAL[y.verdict]}</span>
          </p>
          <p className="mt-6 max-w-[var(--measure)] text-base text-[color:var(--bone2)] lg:text-lg">{CAVEAT}</p>
          {y.pointsPast != null ? <p className="mt-3 text-sm tabular-nums text-[color:var(--bone2)]">{pct(y.gap!, 1)} versus the {pct(y.edge!, 1)} usual-range edge: {y.pointsPast.toFixed(1)} percentage points past it.</p> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            {sim}
            <button type="button" onClick={() => downloadSummary(d)} className={secondaryButton}>
              <Download size={16} strokeWidth={1.5} aria-hidden /> Download summary
            </button>
          </div>
          <More label="Show the numbers" className="mt-6">
          <dl className="mt-3 grid max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-[color:var(--bone3)]">Aqua counted</dt>
            <dd className="tabular-nums">{fmtInt(y.aqua)}</dd>
            <dt className="text-[color:var(--bone3)]">Benchmark</dt>
            <dd className="tabular-nums">{y.fixed != null ? fmtInt(y.fixed) : '—'}</dd>
            <dt className="text-[color:var(--bone3)]">Likely range</dt>
            <dd className="tabular-nums">{rangeText(y)}</dd>
            <dt className="text-[color:var(--bone3)]">Usual range</dt>
            <dd className="tabular-nums">{usualText(d)}</dd>
            {look ? (
              <>
                <dt className="text-[color:var(--bone3)]">Aqua looks</dt>
                <dd className="tabular-nums">{look.minutes} min later</dd>
              </>
            ) : null}
          </dl>
          </More>
          {d.id === 'us-california' ? (
            <p className="mt-4 text-sm text-[color:var(--bone2)]">
              <a href={links.method('detection')} onClick={leave} className={textLink}>How well each satellite sees small fires</a>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/* ---------- When each satellite looked, year by year: the globe holds still while three steps go by ---------- */

const GLOBE_INK = { fg: 'var(--bone)', muted: 'var(--bone3)', grid: 'var(--bone-20)', ground: 'var(--ground)', surface: 'var(--surface)', land: 'var(--bone2)' }

type LookKey = 'terra_lst' | 'viirs_lst' | 'aqua_lst'
const LOOK_SATS: { key: LookKey; id: 'terra' | 'viirs' | 'aqua'; name: string; color: string }[] = [
  { key: 'aqua_lst', id: 'aqua', name: 'Aqua', color: 'var(--sat-aqua)' },
  { key: 'viirs_lst', id: 'viirs', name: 'VIIRS', color: 'var(--sat-viirs)' },
  { key: 'terra_lst', id: 'terra', name: 'Terra', color: 'var(--sat-terra)' },
]
/** a satellite's usual look over a place in 2012-2020 (the median year), in hours */
function usualLook(d: RegionData, key: LookKey) {
  const v = d.drift.filter((r) => r.year <= 2020).map((r) => hm(r[key])).sort((a, b) => a - b)
  return v.length ? v[Math.floor(v.length / 2)] : null
}

/** When each satellite flies over: the globe seen from the Sun on one side, a year-by-year chart on the other, and a
 *  readout of the chosen year above it. Picking a year on the chart turns the globe to that year. */
function LookTimes({ d }: { d: RegionData }) {
  const last = d.lastDrift
  const [year, setYear] = useState(() => last?.year ?? 2025)
  const region = REGIONS.find((r) => r.id === d.id)
  if (!last || !region || !d.baseLook) return null
  const dr = d.driftAt(year)
  const later = minutesBetween(dr.aqua_lst, d.baseLook)
  const orbits: GlobeOrbit[] = [
    { id: 'terra', label: 'Terra', time: hm(dr.terra_lst), timeText: dr.terra_lst, dayPass: 'south', marker: 'hollow', color: 'var(--sat-terra)', altitudeKm: 705, phase: 0.62 },
    { id: 'viirs', label: 'VIIRS', time: hm(dr.viirs_lst), timeText: dr.viirs_lst, dayPass: 'north', marker: 'diamond', color: 'var(--sat-viirs)', altitudeKm: 830, phase: 0.31 },
    { id: 'aqua', label: 'Aqua', time: hm(dr.aqua_lst), timeText: dr.aqua_lst, dayPass: 'north', marker: 'filled', color: 'var(--sat-aqua)', altitudeKm: 705, phase: 0, flag: later >= 2 ? `+${later} min` : undefined },
  ]
  const name = statementName(d.id)
  const description = `${name} at noon in ${dr.year}, with each satellite’s path: Terra looks at ${dr.terra_lst}, VIIRS at ${dr.viirs_lst} and Aqua at ${dr.aqua_lst}, local sun time.`
  const change = (key: LookKey) => {
    const u = usualLook(d, key)
    if (u == null) return ''
    const m = Math.round((hm(dr[key]) - u) * 60)
    return Math.abs(m) < 4 ? 'about its usual time' : m > 0 ? `${m} min later than 2012–2020` : `${-m} min earlier than 2012–2020`
  }
  return (
    <section id="look" aria-labelledby="look-h" className="scroll-mt-32 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'pb-16 pt-16')}>
        <h2 id="look-h" className={title}>When each satellite flies over</h2>
        <p className="mt-4 max-w-[var(--measure)] text-lg text-[color:var(--bone2)]">
          Aqua’s crossing has moved later. VIIRS’s has stayed put.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-12">
          <figure className="m-0 min-w-0 lg:col-span-6">
            <div className="relative">
              <OrbitGlobe orbits={orbits} region={{ name, bbox: region.bbox }} inside={(lon, lat) => inRegion(d.id, lon, lat, region.bbox)} running={false} ink={GLOBE_INK} label={description} />
              <span aria-hidden className="pointer-events-none absolute left-0 top-2 text-xs text-[color:var(--bone3)]">Morning side</span>
              <span aria-hidden className="pointer-events-none absolute right-0 top-2 text-xs text-[color:var(--bone3)]">Evening side</span>
            </div>
            <figcaption className="mt-3 max-w-[34rem] text-xs text-[color:var(--bone3)]">
              Each ring is a satellite’s path, seen at noon in {dr.year}. Drag to turn the globe.
            </figcaption>
          </figure>
          <div className="min-w-0 lg:col-span-6">
            <p className="text-sm text-[color:var(--bone2)]">{dr.year === last.year ? `${dr.year}, the latest year` : dr.year}</p>
            <ul className="mt-2 border-t border-[color:var(--hairline)]">
              {LOOK_SATS.map((s) => (
                <li key={s.id} className="grid grid-cols-[1.25rem_4.5rem_4rem_minmax(0,1fr)] items-baseline gap-x-2 border-b border-[color:var(--hairline)] py-2.5">
                  <span className="self-center"><SatMark sat={s.id} size={11} /></span>
                  <span className="text-[color:var(--bone)]">{s.name}</span>
                  <span className="text-xl font-medium tabular-nums text-[color:var(--bone)]">{dr[s.key]}</span>
                  <span className="text-sm text-[color:var(--bone3)]">{s.id === 'viirs' && Math.abs(Math.round((hm(dr[s.key]) - (usualLook(d, s.key) ?? 0)) * 60)) < 4 ? 'kept its time' : change(s.key)}</span>
                </li>
              ))}
            </ul>
            <DriftChart d={d} year={dr.year} onYear={setYear} />
            <p className="mt-2 text-xs text-[color:var(--bone3)]">Local sun time. Pick a year to turn the globe.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Look time by year, one line per satellite: later in the day is higher, so Aqua's line rises where its clock moved.
 *  A dashed line holds Aqua's 2012-2020 time for reference; the chosen year is marked and can be picked by pointer or
 *  arrow keys. */
function DriftChart({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const W = useMeasuredWidth(ref)
  const rows = d.drift
  const H = 260
  const padL = 46, padR = 92, padT = 14, padB = 26
  const all = rows.flatMap((r) => LOOK_SATS.map((s) => hm(r[s.key])))
  const lo = Math.floor(Math.min(...all) - 0.3), hi = Math.ceil(Math.max(...all) + 0.3)
  const y0 = rows[0].year, y1 = rows[rows.length - 1].year
  const x = (yr: number) => padL + ((yr - y0) / Math.max(1, y1 - y0)) * Math.max(0, W - padL - padR)
  const y = (h: number) => padT + (1 - (h - lo) / (hi - lo)) * (H - padT - padB)
  // where Aqua's look first moved and stayed later (four minutes or more past its 2012-2020 time)
  const start = d.driftStart ? rows.find((r) => r.year === d.driftStart) ?? null : null
  const hours: number[] = []
  for (let h = Math.ceil(lo); h <= Math.floor(hi); h++) if (h % 3 === 0 || hi - lo <= 4) hours.push(h)
  const yearTicks = [...new Set([y0, y0 + Math.round((y1 - y0) / 3), y0 + Math.round((2 * (y1 - y0)) / 3), y1])]
  const pick = (clientX: number) => {
    const el = ref.current
    if (!el || W <= 0) return
    const px = clientX - el.getBoundingClientRect().left
    const yr = Math.round(y0 + ((px - padL) / Math.max(1, W - padL - padR)) * (y1 - y0))
    const c = Math.max(y0, Math.min(y1, yr))
    if (c !== year) onYear(c)
  }
  const cur = rows.find((r) => r.year === year) ?? rows[rows.length - 1]
  const lastRow = rows[rows.length - 1]
  // end labels, nudged apart when two lines finish close together
  const ends = LOOK_SATS.map((s) => ({ s, y: y(hm(lastRow[s.key])) })).sort((a, b) => a.y - b.y)
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 16) ends[k].y = ends[k - 1].y + 16
  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={`Look times by year over ${d.phrase.the}`}
      aria-valuemin={y0}
      aria-valuemax={y1}
      aria-valuenow={year}
      aria-valuetext={`${year}: Aqua ${cur.aqua_lst}, VIIRS ${cur.viirs_lst}, Terra ${cur.terra_lst}`}
      className={cn('relative mt-6 w-full cursor-pointer touch-pan-y select-none rounded outline-offset-4', focusRing)}
      style={{ height: H }}
      onPointerDown={(e) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX) }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e.clientX) }}
      onKeyDown={(e) => {
        const step: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }
        let v = year
        if (e.key in step) v += step[e.key]
        else if (e.key === 'Home') v = y0
        else if (e.key === 'End') v = y1
        else return
        e.preventDefault()
        onYear(Math.max(y0, Math.min(y1, v)))
      }}
    >
      {W > 0 ? (
        <svg width={W} height={H} aria-hidden className="block overflow-visible" fontSize={11}>
          {hours.map((h) => (
            <g key={h}>
              <line x1={padL} x2={W - padR} y1={y(h)} y2={y(h)} stroke="var(--hairline)" />
              <text x={padL - 8} y={y(h)} textAnchor="end" dominantBaseline="central" fill="var(--bone3)" className="tabular-nums">{String(h).padStart(2, '0')}:00</text>
            </g>
          ))}
          {yearTicks.map((yr) => (
            <text key={yr} x={x(yr)} y={H - 6} textAnchor="middle" fill="var(--bone3)" className="tabular-nums">{yr}</text>
          ))}
          {start ? (
            <g>
              <line x1={x(start.year)} x2={x(start.year)} y1={y(hm(start.aqua_lst)) - 6} y2={y(hm(start.aqua_lst)) - 22} stroke="var(--bone-30)" />
              <text x={x(start.year)} y={y(hm(start.aqua_lst)) - 28} textAnchor="end" fill="var(--bone2)">Aqua starts looking later, {start.year}</text>
            </g>
          ) : null}
          <line x1={x(year)} x2={x(year)} y1={padT - 6} y2={H - padB + 4} stroke="var(--bone-30)" />
          {LOOK_SATS.map((s) => (
            <g key={s.id}>
              <polyline points={rows.map((r) => `${x(r.year).toFixed(1)},${y(hm(r[s.key])).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {(() => {
                const cx = x(cur.year), cy = y(hm(cur[s.key]))
                if (s.id === 'terra') return <circle cx={cx} cy={cy} r={4.5} fill="var(--ground)" stroke={s.color} strokeWidth={2} />
                if (s.id === 'viirs') return <rect x={cx - 4} y={cy - 4} width={8} height={8} transform={`rotate(45 ${cx} ${cy})`} fill={s.color} stroke="var(--ground)" />
                return <circle cx={cx} cy={cy} r={5} fill={s.color} stroke="var(--ground)" strokeWidth={2} />
              })()}
            </g>
          ))}
          {ends.map(({ s, y: ly }) => (
            <text key={s.id} x={W - padR + 10} y={ly} dominantBaseline="central" fill="var(--bone)" fontSize={12}>
              {s.name} <tspan fill="var(--bone3)" className="tabular-nums">{lastRow[s.key]}</tspan>
            </text>
          ))}
        </svg>
      ) : null}
    </div>
  )
}

/* ---------- Year by year: Aqua's count against what we'd expect ---------- */

function yearsHeading(d: RegionData) {
  if (isValidation(d.id)) {
    const na = d.years.filter((y) => y.verdict === 'na').map((y) => y.year)
    return na.length ? `${na[0]}–${na[na.length - 1]} have too few fires to read` : 'Year by year'
  }
  let i = d.years.length - 1
  while (i >= 0 && d.years[i].verdict === 'na') i--
  if (i < 0) return `Too few fires over ${d.phrase.the} to read`
  const y = d.years[i]
  if (y.verdict === 'close') return `Aqua’s ${y.year} count is a close call`
  if (y.verdict === 'within') {
    const readable = d.years.filter((r) => r.verdict !== 'na')
    return readable.every((r) => r.verdict === 'within')
      ? `From ${readable[0].year} to ${y.year}, Aqua’s count stayed in the usual range`
      : `In ${y.year}, Aqua’s count was back in the usual range`
  }
  let s = i
  while (s > 0 && d.years[s - 1].verdict === 'outside') s--
  const span = s === i ? `in ${y.year}` : i - s === 1 ? `in ${d.years[s].year} and ${y.year}` : `from ${d.years[s].year} to ${y.year}`
  return `Aqua’s count was unusual ${span}`
}

const tickText = (v: number) => (v === 0 ? '0%' : pct(v, 0))

function YearByYear({ d, year, onYear, small }: { d: RegionData; year: number; onYear: (y: number) => void; small: boolean }) {
  const [inspect, setInspect] = useState<number | null>(null)
  const selected = d.years.findIndex((y) => y.year === year)
  const latest = d.years.findIndex((y) => y.year === d.latestOk?.year)
  const shownIndex = inspect ?? (selected >= 0 ? selected : latest >= 0 ? latest : d.years.length - 1)
  const points = useMemo<AnomalyPoint[]>(
    () => d.years.map((y) => ({
      id: String(y.year),
      label: String(y.year),
      value: y.gap,
      range: y.lo != null && y.hi != null ? [y.lo, y.hi] : null,
      expected: d.placebo,
      outside: y.verdict === 'outside',
      valueText: y.verdict === 'na' ? `${y.year}: too few fires to read` : `${y.year}: Aqua ${pct(y.gap!)} against the benchmark, likely range ${rangeText(y)}, ${UNUSUAL[y.verdict].toLowerCase()}`,
    })),
    [d],
  )
  const v = verdictLines(d)
  const chartVars = {
    '--ac-line': 'var(--sat-aqua)', '--ac-fg': 'var(--bone2)', '--ac-surface': 'var(--ground)', '--ac-band': 'rgba(236, 233, 225, 0.08)', '--ac-grid': 'var(--hairline)', '--ac-zero': 'var(--bone-30)',
  } as CSSProperties
  const th = 'py-2 pr-3 text-left text-xs font-normal text-[color:var(--bone3)]'
  return (
    <section id="years" aria-labelledby="years-h" style={chartVars} className="scroll-mt-32 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h3 id="years-h" className={title}>{yearsHeading(d)}</h3>
          <p className="mt-4 max-w-[var(--measure)] text-sm sm:text-base text-[color:var(--bone2)]">
            Each year since 2021, against the benchmark.
          </p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          <AnomalyChart
            points={points}
            height={small ? 220 : 280}
            activeIndex={shownIndex}
            selectedIndex={selected >= 0 ? selected : null}
            onInspect={setInspect}
            onSelect={(i) => onYear(d.years[i].year)}
            groupLabel={`Aqua against what we’d expect, by year, for ${d.name}`}
            bandLabel="Usual range, 2012–2020"
            formatTick={tickText}
            legend={{ outside: 'Unusual', inside: 'Within range / close call', range: 'Likely range' }}
          />
          <More label="Show the numbers" className="mt-4">
          <table className="mt-2 w-full border-collapse text-sm tabular-nums">
            <caption className="sr-only">Aqua’s count against what we’d expect, by year, for {d.name}</caption>
            <thead>
              <tr className="border-b border-[color:var(--hairline)]">
                <th scope="col" className={th}>Year</th>
                <th scope="col" className={cn(th, 'hidden text-right sm:table-cell')}>Aqua counted</th>
                <th scope="col" className={cn(th, 'hidden text-right sm:table-cell')}>We’d expect</th>
                <th scope="col" className={cn(th, 'text-right')}>Difference</th>
                <th scope="col" className={cn(th, 'text-right')}>Likely range</th>
                <th scope="col" className={cn(th, 'pr-0 text-right')}>Unusual?</th>
              </tr>
            </thead>
            <tbody>
              {d.years.map((y) => (
                <tr key={y.year} className={cn('border-b border-[color:var(--hairline)]', y.year === year && 'bg-[color:var(--surface)]')}>
                  <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                    {y.year}
                    {y.verdict !== 'na' && y.fixed != null ? <span className="block text-xs text-[color:var(--bone3)] sm:hidden">{fmtInt(y.aqua)} vs {fmtInt(y.fixed)}</span> : null}
                  </th>
                  <td className="hidden py-2.5 pr-3 text-right sm:table-cell">{y.verdict === 'na' ? '—' : fmtInt(y.aqua)}</td>
                  <td className="hidden py-2.5 pr-3 text-right sm:table-cell">{y.verdict === 'na' || y.fixed == null ? '—' : fmtInt(y.fixed)}</td>
                  <td className="py-2.5 pr-3 text-right">{y.gap == null ? '—' : pct(y.gap)}{y.pointsPast != null ? <span className="block text-xs text-[color:var(--bone3)]">{y.pointsPast.toFixed(1)} points past {pct(y.edge!, 1)} edge</span> : null}</td>
                  <td className="py-2.5 pr-3 text-right text-[color:var(--bone2)]">{rangeText(y)}</td>
                  <td className={cn('py-2.5 text-right', y.verdict === 'outside' ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone2)]')}>{y.verdict === 'na' ? 'Too few fires' : UNUSUAL[y.verdict]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {v.whole.length ? (
            <div className="mt-6 text-sm">
              <p className="font-medium text-[color:var(--bone)]">{hasOfficialSeries(d.id) ? 'Whole years, beside INPE’s official count' : 'Whole years'}</p>
              <p className="text-[color:var(--bone2)]">{v.from} to {v.to}, all twelve months</p>
              <dl className="mt-2 grid grid-cols-[auto_auto_1fr] gap-x-4 gap-y-2">
                {v.whole.map((r) => (
                  <Fragment key={r.name}>
                    <dt className="text-[color:var(--bone3)]">{r.name === 'Fixed-clock calendar' ? 'VIIRS-based benchmark' : r.name}</dt>
                    <dd className="tabular-nums">{pct(r.change)}</dd>
                    <dd className="tabular-nums text-[color:var(--bone3)]">{fmtInt(r.a)} to {fmtInt(r.b)}</dd>
                  </Fragment>
                ))}
              </dl>
              {hasOfficialSeries(d.id) ? <p className="mt-3 text-xs text-[color:var(--bone3)]">INPE’s Programa Queimadas is Brazil’s official count; it follows one satellite, Aqua.</p> : null}
            </div>
          ) : null}
          </More>
          <MockTag show={d.mock} className="mt-3 inline-block" />
        </div>
      </div>
    </section>
  )
}

/* ---------- Two clocks: Terra and Aqua, the same camera, drifted opposite ways ---------- */

const asPct = (ratio: number) => (ratio - 1) * 100
const logPct = (v: number) => (Math.exp(v) - 1) * 100

/** The heading: each satellite's change against VIIRS since 2012–2020 in the latest year; a direction is named only when
 *  that satellite's range clears zero. */
function twoClocksHeading(d: RegionData) {
  const last = [...d.two].reverse().find((t) => Number.isFinite(t.A) && Number.isFinite(t.T))
  if (!last) return null
  const clear = (lo: number, hi: number) => lo > 1 || hi < 1
  const moved = (v: number) => `${v >= 1 ? 'rose' : 'fell'} ${Math.round(Math.abs(asPct(v)))}%`
  const a = clear(last.A_lo, last.A_hi), t = clear(last.T_lo, last.T_hi)
  if (a && t) return `By ${last.year}, against VIIRS, Aqua’s count ${moved(last.A)} and Terra’s ${moved(last.T)}`
  if (a) return `By ${last.year}, against VIIRS, Aqua’s count ${moved(last.A)}; Terra’s showed no clear change`
  if (t) return `By ${last.year}, against VIIRS, Terra’s count ${moved(last.T)}; Aqua’s showed no clear change`
  return `By ${last.year}, neither Aqua’s nor Terra’s count showed a clear change against VIIRS`
}

/** The two checks written for this idea, when they fail. */
function failedChecks() {
  return ['P9', 'P10'].map((id) => CHECKS.checks.find((c) => c.id === id)).filter((c): c is Check => !!c && c.status === 'fail').map((c) => c.id)
}

export function TwoClocks({ d, year, onYear, small, links, leave }: { d: RegionData; year: number; onYear: (y: number) => void; small: boolean; links: Links; leave: Leave }) {
  const two = d.two
  const [inspect, setInspect] = useState<number | null>(null)
  const heading = twoClocksHeading(d)
  if (!two.length || !heading) return null
  const selected = two.findIndex((t) => t.year === year)
  const shownIndex = inspect ?? (selected >= 0 ? selected : two.length - 1)
  const t = two[shownIndex]
  const probes: Series[] = [
    { id: 'aqua', label: 'Aqua', marker: 'filled', color: 'var(--sat-aqua)', values: two.map((x) => asPct(x.A)), lo: two.map((x) => asPct(x.A_lo)), hi: two.map((x) => asPct(x.A_hi)) },
    { id: 'terra', label: 'Terra', marker: 'hollow', color: 'var(--sat-terra)', values: two.map((x) => asPct(x.T)), lo: two.map((x) => asPct(x.T_lo)), hi: two.map((x) => asPct(x.T_hi)) },
  ]
  const difference: AnomalyPoint[] = two.map((x) => {
    const v = logPct(x.clock_diff), lo = logPct(x.clock_lo), hi = logPct(x.clock_hi)
    return { id: String(x.year), label: String(x.year), value: v, range: [lo, hi], outside: lo > 0 || hi < 0, valueText: `${x.year}: Aqua’s change over Terra’s ${pct(v)}, likely range ${fmtRange(lo, hi)}` }
  })
  const columnText = (i: number) => {
    const x = two[i]
    return `${x.year}: against VIIRS, Aqua ${pct(asPct(x.A))} looking at ${x.aqua_lst}, Terra ${pct(asPct(x.T))} looking at ${x.terra_lst}, each compared with 2012 to 2020`
  }
  const failed = failedChecks()
  const diffVars = { '--ac-line': 'var(--sat-aqua)', '--ac-fg': 'var(--bone2)', '--ac-surface': 'var(--ground)', '--ac-band': 'transparent', '--ac-grid': 'var(--hairline)', '--ac-zero': 'var(--bone-30)' } as CSSProperties
  const pick = (i: number) => onYear(two[i].year)
  return (
    <section id="two-clocks" aria-labelledby="two-h" className="scroll-mt-32 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="two-h" className={title}>{heading}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm sm:text-base text-[color:var(--bone2)]">
            Terra and Aqua carry the same kind of camera. Terra drifted earlier in the day and Aqua later, so if the time of day matters, their counts should move apart.
          </p>
          {failed.length ? (
            <p className="mt-4 max-w-[var(--measure)] text-sm sm:text-base text-[color:var(--bone)]">
              {failed.length === 2 ? 'Two tests of this idea weren’t confirmed' : 'A test of this idea wasn’t confirmed'}, so we use it to describe the pattern, not to prove it.
            </p>
          ) : null}
          {t ? (
            <dl aria-live="polite" className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-[color:var(--hairline)] pt-4 text-sm">
              <dt className="text-[color:var(--bone3)]">Year</dt>
              <dd className="tabular-nums">{t.year}</dd>
              <dt className="text-[color:var(--bone3)]">Aqua</dt>
              <dd className="tabular-nums">{pct(asPct(t.A))} <span className="text-[color:var(--bone3)]">looking at {t.aqua_lst}</span></dd>
              <dt className="text-[color:var(--bone3)]">Terra</dt>
              <dd className="tabular-nums">{pct(asPct(t.T))} <span className="text-[color:var(--bone3)]">looking at {t.terra_lst}</span></dd>
            </dl>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-10 lg:col-span-8">
          <figure className="m-0">
            <figcaption className="mb-4">
              <span className="block text-lg font-medium">Aqua and Terra, each compared with VIIRS</span>
              <span className="mt-1 block max-w-[var(--measure)] text-sm sm:text-base text-[color:var(--bone2)]">Change since 2012–2020.</span>
            </figcaption>
            <SeriesChart
              labels={two.map((x) => String(x.year))}
              series={probes}
              reference={{ value: 0, label: 'No change', color: 'var(--sat-viirs)' }}
              height={small ? 220 : 260}
              activeIndex={shownIndex}
              selectedIndex={selected >= 0 ? selected : null}
              onInspect={setInspect}
              onSelect={pick}
              groupLabel={`Terra and Aqua compared with VIIRS for ${d.name}`}
              columnText={columnText}
              formatTick={tickText}
              ink={{ fg: 'var(--bone2)', grid: 'var(--hairline)', surface: 'var(--ground)', guide: 'var(--bone)' }}
            />
            <MockTag show={d.twoMock} className="mt-3 inline-block" />
          </figure>
          <More label="More detail: Aqua’s change minus Terra’s">
            <figure className="m-0 mt-3" style={diffVars}>
              <figcaption className="mb-4 max-w-[var(--measure)] text-sm sm:text-base text-[color:var(--bone2)]">
                A range clear of zero means the two moved apart; it doesn’t say why. Each satellite is counted near the middle of its view.
              </figcaption>
              <AnomalyChart
                points={difference}
                height={small ? 200 : 220}
                activeIndex={shownIndex}
                selectedIndex={selected >= 0 ? selected : null}
                onInspect={setInspect}
                onSelect={pick}
                groupLabel={`Aqua’s change over Terra’s for ${d.name}`}
                formatTick={tickText}
                legend={{ outside: 'Clear of zero', inside: 'Overlaps zero', range: 'Likely range' }}
              />
            </figure>
          </More>
        </div>
      </div>
    </section>
  )
}

/* ---------- The monthly calendar ---------- */

const modeClasses = {
  root: 'inline-flex h-11 overflow-hidden rounded bg-[color:var(--raised)] sm:h-9',
  item: cn(
    'px-3 text-sm text-[color:var(--bone2)] outline-none data-[state=off]:hover:text-[color:var(--bone)] sm:px-4',
    'focus-visible:shadow-[var(--ring-in)] data-[state=on]:bg-[color:var(--bone)] data-[state=on]:text-[color:var(--ink)] data-[state=on]:focus-visible:shadow-[var(--ring-in-on)]',
    ease,
  ),
}
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** A month and a year, as two native selects, so phones open their own pickers. */
function MonthField({ label, value, years, onChange }: { label: string; value: string; years: number[]; onChange: (ym: string) => void }) {
  const y = Number(value.slice(0, 4)), m = Number(value.slice(5, 7))
  const sel = cn('h-11 rounded border border-[color:var(--hairline)] bg-[color:var(--surface)] pl-2 pr-1 text-sm text-[color:var(--bone)] hover:bg-[color:var(--raised)] sm:h-9', ease, focusRing)
  return (
    <span role="group" aria-label={label} className="inline-flex items-center gap-1">
      <select aria-label={`${label}: month`} value={m} onChange={(e) => onChange(`${y}-${e.target.value.padStart(2, '0')}`)} className={sel}>
        {MONTHS.map((mo, i) => <option key={mo} value={i + 1}>{mo}</option>)}
      </select>
      <select aria-label={`${label}: year`} value={y} onChange={(e) => onChange(`${e.target.value}-${String(m).padStart(2, '0')}`)} className={sel}>
        {years.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    </span>
  )
}

function Calendar({ d, mode, onMode, range, onRange, small }: { d: RegionData; mode: CalendarMode; onMode: (m: CalendarMode) => void; range: MonthRange; onRange: (r: MonthRange) => void; small: boolean }) {
  // The page is lazy-loaded: resolve a direct calendar link after its target mounts.
  useEffect(() => {
    if (window.location.hash !== '#calendar') return
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById('calendar')
      if (el) glideTo(el, false)
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  const full = calendarSpan(d)
  const grid = useMemo(() => calendarGrid(d, range), [d, range])
  const f = calendarFinding(d, range)
  const y0 = Number(full.from.slice(0, 4)), y1 = Number(full.to.slice(0, 4))
  const allYears = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i)
  const partial = range.from !== full.from || range.to !== full.to
  const setFrom = (ym: string) => onRange({ from: ym, to: ym > range.to ? ym : range.to })
  const setTo = (ym: string) => onRange({ from: ym < range.from ? ym : range.from, to: ym })
  const [mon, yr] = f ? f.label.split(' ') : []
  const headline: ReactNode = {
    'br-amazon': 'Fire season runs August to October, when two-thirds of the year’s hotspots occur. The 2024 season was 33% above typical; 2025 was 72% below.',
    'br-cerrado': 'Fire season runs August to October (70% of the year’s hotspots). 2024 was close to typical; 2025 was 28% below.',
    'br-pantanal': 'Fire season runs August to October (three-quarters of the year’s hotspots). 2024 was 2.5 times typical; 2025 was 87% below.',
    'ar-argentina': 'Fire season runs July to September (60% of the year’s hotspots). 2024 was 21% below typical; 2025 was 44% below.',
    'in-punjab-haryana': <>Crop-burning season runs October to December (nearly 90% of the year’s hotspots). 2024 and 2025 were far below typical, but burning has shifted later in the day (<a href={JETHVA} target="_blank" rel="noreferrer" className={textLink}>Jethva 2026</a>), so fewer hotspots may not mean less burning.</>,
    'us-california': 'Fire season runs August to October (two-thirds of the year’s hotspots). 2020 had the most hotspots since 2002; 2024 and 2025 were 15% and 17% below typical.',
  }[d.id] ?? `Fire season runs ${seasonMonths(d)}.`
  return (
    <section id="calendar" aria-labelledby="calendar-h" className="scroll-mt-32 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="calendar-h" className={title}>Harmonized fire calendar</h2>
          <p className="mt-2 max-w-[var(--measure)] text-sm text-[color:var(--bone2)] sm:text-base">
            Each row is a year and each cell a month. {mode === 'count' ? 'Brighter cells mean more hotspots.' : 'Gold cells had more hotspots than a typical year, blue cells fewer.'}
          </p>
          <p className="mt-4 text-lg text-[color:var(--bone)]">{headline}</p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <ModeToggle value={mode} onChange={onMode} classes={modeClasses} labels={{ anomaly: 'Compared with a typical year', count: 'Hotspot counts' }} countFirst />
            <span role="group" aria-label="Months shown" className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--bone2)]">
              <MonthField label="From" value={range.from} years={allYears} onChange={setFrom} />
              <span aria-hidden>to</span>
              <MonthField label="To" value={range.to} years={allYears} onChange={setTo} />
              {partial ? (
                <button type="button" onClick={() => onRange(full)} className={cn('h-11 rounded px-1 text-sm text-[color:var(--bone2)] hover:text-[color:var(--bone)] sm:h-9', ease, focusRing)}>
                  All months
                </button>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => downloadCalendarCsv(d, range)}
              className={cn('inline-flex h-11 items-center gap-2 rounded text-sm text-[color:var(--bone)] hover:text-[color:var(--bone2)] sm:ml-auto sm:h-9', ease, focusRing)}
            >
              <Download size={16} strokeWidth={1.5} aria-hidden /> Download the months (CSV)
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
              highlight={null}
              season={seasonIndex(d)}
              label={`Fire calendar for ${d.name}, ${mode === 'anomaly' ? 'each month compared with a typical year' : 'hotspots each month'}`}
            />
          </div>
          {/* phones: keep the legend's phrases whole and its swatches narrower, so the ramp sits on one line */}
          {d.id.startsWith('br-') ? <RecentObservations /> : null}
          <CalendarLegend mode={mode} render="fill" className="mt-4 [&_span]:whitespace-nowrap max-sm:[&_[aria-hidden]>span]:w-3" />
          <More label="About these numbers" className="mt-4">
          <div className="mt-2 flex max-w-[var(--measure)] flex-col gap-1 text-xs text-[color:var(--bone3)]">
            <p>A hotspot is one satellite fire detection; a large fire can produce many.</p>
            <p>Typical = the median for that calendar month, 2002–2025.</p>
            <p>Counts before 2012 are Aqua’s own. From 2012 they come from VIIRS, whose overpass time has stayed constant, scaled to Aqua using the 2012–2020 ratio.</p>
          </div>
          </More>
          <a href={`#top`} className={cn('mt-6 inline-flex min-h-11 items-center gap-1 text-sm text-[color:var(--bone2)] hover:text-[color:var(--bone)]', ease, focusRing)}>
            Pick another place <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  )
}

