// Round 2 · Direction D, "Field film" (Anduril-inspired, at the team's request). Field footage of the thing itself:
// the burning forest seen from orbit at full bleed with the verdict set on its darkest part, a pass line where Aqua's
// tick slides later as the year changes, the same scene at three hours as an uneven photo grid, one sage band of clock
// effects, then the calendar. Black, bone and sage; small labels set on images at their lower left.
// Every number comes from src/r2/data.ts (data/mock, labelled MOCK). Imagery: NASA Worldview / GIBS, public domain.
// Drafted with AI assistance (Claude) for Team Propagators.
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import { CalendarLegend, FireCalendar, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle, RegionSelect, YearSlider } from '@/r2/controls'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'
import {
  REGIONS, SECTIONS, calendarFinding, calendarGrid, fmtRange, hm, minutesBetween, pct, regionData, verdictHeadline, verdictLines,
  type RegionData, type Verdict,
} from '@/r2/data'
import { cn } from '@/lib/utils'

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
// behind the top bar: eased so the links stay at 4.5:1 over the brightest cumulus, gone by a quarter of the height
const SCRIM_TOP = 'linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.74) 6%, rgba(0, 0, 0, 0.45) 14%, rgba(0, 0, 0, 0) 26%)'
const SCRIMS_WIDE = [
  SCRIM_TOP,
  // a soft one behind the verdict block, lower left
  'radial-gradient(ellipse 52% 58% at 22% 72%, rgba(0, 0, 0, 0.56) 0%, rgba(0, 0, 0, 0.4) 45%, rgba(0, 0, 0, 0) 100%)',
  // a soft one behind the pass line, lower right
  'radial-gradient(ellipse 44% 46% at 78% 84%, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.36) 50%, rgba(0, 0, 0, 0) 100%)',
  // black from 0% at mid-height to 85% at the bottom, eased
  'linear-gradient(180deg, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.34) 58%, rgba(0, 0, 0, 0.56) 66%, rgba(0, 0, 0, 0.7) 75%, rgba(0, 0, 0, 0.8) 86%, rgba(0, 0, 0, 0.85) 100%)',
].join(', ')
// phones and tablets: the verdict block fills most of the image, so the bottom scrim starts higher
const SCRIMS_NARROW = [
  SCRIM_TOP,
  'linear-gradient(180deg, rgba(0, 0, 0, 0) 12%, rgba(0, 0, 0, 0.5) 30%, rgba(0, 0, 0, 0.7) 48%, rgba(0, 0, 0, 0.8) 70%, rgba(0, 0, 0, 0.85) 100%)',
].join(', ')

const TOKENS = {
  ...BASE_TOKENS,
  colorScheme: 'dark',
  // type: 12 / 14 / 18 come from text-xs / text-sm / text-lg; these are the other three
  '--fs-32': '32px',
  '--fs-40': '40px',
  '--fs-72': '72px',
  '--lh-display': '1.02',
  '--track-display': '-0.03em',
  '--track-title': '-0.01em',
  // layout
  '--maxw': '1440px',
  '--measure': '36rem',
  '--hero-h': 'clamp(720px, 100svh, 960px)',
  '--hero-h-sm': '640px',
  '--select-max': '168px',
  '--select-max-wide': '240px',
  '--scrims-wide': SCRIMS_WIDE,
  '--scrims-narrow': SCRIMS_NARROW,
  '--scrim-tile': 'linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.5) 22%, rgba(0, 0, 0, 0) 52%)',
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
  '--cal-radius': '2px',
  '--cal-hatch': 'rgba(236, 233, 225, 0.35)',
  '--cal-focus': '#ECE9E1',
  '--cal-fg': '#ECE9E1',
  '--cal-muted': '#8B8D86',
} as const

/** Radix Select portals its menu to <body>, outside the root div: mirror the tokens there, and paint the body ground. */
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
const HERO_SRC = `${IMG}amazon-viirs-fires-2024-08-23.jpg`
const HERO_LABEL = 'VIIRS · 23 Aug 2024 · smoke and active fires over the Amazon · NASA Worldview / GIBS'

/** Sections of this comp; the rest of the index belongs to the full build. */
const IN_COMP = new Set<string>(['verdict', 'clock', 'audit', 'calendar'])

const READING: Record<Verdict, string> = { clock: 'Clock effect', noise: 'Within noise', na: 'Not enough fires' }
const AI_NOTE = "Designed and coded with AI assistance (Claude). Every number comes from the team's JSON files; this comp uses mock data."

type AuditRow = RegionData['years'][number]
const effectText = (y: AuditRow) => (y.gap == null ? '—' : pct(y.gap))
const rangeText = (y: AuditRow) => (y.lo == null || y.hi == null ? '—' : fmtRange(y.lo, y.hi))
const noiseText = (d: RegionData) => `±${Number(d.noise.toFixed(1))}%`

const defaultYear = (d: RegionData) => d.latestOk?.year ?? d.years[d.years.length - 1]?.year ?? d.lastDrift?.year ?? 2025

function initialRegion() {
  const r = new URLSearchParams(window.location.search).get('region')
  return r && REGIONS.some((x) => x.id === r) ? r : 'br-amazon'
}

/* ---------- Shared classes ---------- */

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]'
const ease = 'transition-colors duration-150 ease-[var(--ease)]'
const title = 'text-balance text-[length:var(--fs-32)] font-medium leading-9 tracking-[var(--track-title)]'
const shell = 'mx-auto w-full max-w-[var(--maxw)] px-4 sm:px-8'

const selectClasses = {
  trigger: cn(
    'inline-flex h-9 min-w-0 max-w-[var(--select-max)] items-center gap-2 rounded-lg border border-[color:var(--hairline)] bg-[color:var(--surface)] pl-3 pr-2 text-sm text-[color:var(--bone)] sm:max-w-[var(--select-max-wide)]',
    '[&>span:first-child]:truncate hover:bg-[color:var(--raised)]',
    ease,
    focusRing,
  ),
  icon: 'shrink-0 text-[color:var(--bone3)]',
  content:
    'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[color:var(--hairline)] bg-[color:var(--surface)] p-1 font-[family-name:var(--f-ui)] text-[color:var(--bone)] shadow-[var(--shadow-menu)]',
  item: cn(
    'relative flex h-9 cursor-default select-none items-center gap-2 rounded px-3 text-sm text-[color:var(--bone)] outline-none',
    'data-[highlighted]:bg-[color:var(--raised)] data-[state=checked]:font-medium',
    ease,
  ),
}

const sliderClasses = {
  root: 'relative flex h-12 min-w-0 flex-1 cursor-pointer touch-none select-none items-center',
  track: 'relative h-0.5 grow bg-[color:var(--bone-20)]',
  thumb: cn('block size-4 rounded-full bg-[color:var(--bone)] hover:bg-[color:var(--bone-hover)]', ease, focusRing),
}

const modeClasses = {
  root: 'inline-flex h-9 overflow-hidden rounded-lg bg-[color:var(--raised)]',
  item: cn(
    'h-9 px-4 text-sm text-[color:var(--bone2)] outline-none data-[state=off]:hover:text-[color:var(--bone)]',
    'focus-visible:shadow-[var(--ring-in)] data-[state=on]:bg-[color:var(--bone)] data-[state=on]:text-[color:var(--ink)] data-[state=on]:focus-visible:shadow-[var(--ring-in-on)]',
    ease,
  ),
}

/* ---------- Page ---------- */

export default function FieldFilm() {
  usePortalTokens()
  const [region, setRegion] = useState(initialRegion)
  const d = useMemo(() => regionData(region), [region])
  const [year, setYear] = useState(() => defaultYear(regionData(initialRegion())))
  const [mode, setMode] = useState<CalendarMode>('anomaly')
  const small = useMedia('(max-width: 639px)')

  const onRegion = (id: string) => {
    setRegion(id)
    setYear(defaultYear(regionData(id)))
    const p = new URLSearchParams(window.location.search)
    p.set('region', id)
    window.history.replaceState(null, '', `?${p.toString()}${window.location.hash}`)
  }

  return (
    <div
      style={TOKENS as unknown as CSSProperties}
      className="relative min-h-screen overflow-x-clip bg-[color:var(--ground)] font-[family-name:var(--f-ui)] text-sm text-[color:var(--bone)] antialiased"
    >
      <TopBar region={region} onRegion={onRegion} />
      <main>
        <Hero d={d} year={year} onYear={setYear} />
        <Passes />
        <ClockEffect d={d} />
        <Calendar d={d} mode={mode} onMode={setMode} small={small} />
      </main>
      <footer className="border-t border-[color:var(--hairline)]">
        <div className={cn(shell, 'flex flex-col gap-2 py-12 text-xs text-[color:var(--bone3)] sm:flex-row sm:justify-between sm:gap-8')}>
          <p>Anchor · Team Propagators</p>
          <p className="sm:text-right">{AI_NOTE}</p>
        </div>
      </footer>
    </div>
  )
}

/* ---------- Top bar: transparent on the photograph, no blur ---------- */

function Mark() {
  // a tick standing on an axis: the one clock the counts are held to
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path d="M1 15h16v2H1zM5 3h2v12H5z" fill="currentColor" />
    </svg>
  )
}

function TopBar({ region, onRegion }: { region: string; onRegion: (id: string) => void }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className={cn(shell, 'flex h-16 items-center justify-between gap-4 xl:grid xl:h-18 xl:grid-cols-12 xl:gap-x-6')}>
        <a href="#verdict" className={cn('flex shrink-0 items-center gap-2 rounded text-lg font-medium leading-none xl:col-span-3 xl:justify-self-start', focusRing)}>
          <Mark />
          Anchor
        </a>
        <nav aria-label="Sections" className="hidden xl:col-span-6 xl:flex xl:justify-center">
          <ul className="flex items-center gap-6 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                {IN_COMP.has(s.id) ? (
                  <a
                    href={`#${s.id}`}
                    aria-current={s.id === 'verdict' ? 'true' : undefined}
                    className={cn(
                      'rounded',
                      s.id === 'verdict' ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]',
                      ease,
                      focusRing,
                    )}
                  >
                    {s.label}
                  </a>
                ) : (
                  <span aria-disabled="true" className="cursor-default text-[color:var(--bone2)]">{s.label}</span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 items-center justify-end gap-3 xl:col-span-3">
          <span className="shrink-0 rounded border border-[color:var(--hairline)] px-2 py-1 text-xs text-[color:var(--bone)]">Mock data</span>
          <RegionSelect value={region} onChange={onRegion} classes={selectClasses} />
        </div>
      </div>
    </header>
  )
}

/* ---------- Hero: the VIIRS scene at full bleed, the verdict on its darkest part ---------- */

function Hero({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const { look, change } = verdictLines(d)
  return (
    <section id="verdict" aria-labelledby="verdict-h">
      <div className="relative isolate flex min-h-[var(--hero-h-sm)] flex-col md:min-h-[var(--hero-h)]">
        <img
          src={HERO_SRC}
          alt="Smoke and active fires over the Amazon, VIIRS true colour, 23 Aug 2024"
          width={1600}
          height={960}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[image:var(--scrims-narrow)] xl:bg-[image:var(--scrims-wide)]" />

        <div className={cn(shell, 'flex flex-1 flex-col')}>
          <div aria-hidden className="h-16 shrink-0 xl:h-18" />
          <div className="mt-auto grid grid-cols-1 pt-12 xl:grid-cols-12 xl:items-end xl:gap-x-6">
            <div className="xl:col-span-6">
              <h1
                id="verdict-h"
                className="text-balance text-[length:var(--fs-40)] font-medium leading-[var(--lh-display)] tracking-[var(--track-display)] md:text-[length:var(--fs-72)]"
              >
                {verdictHeadline(d)}
              </h1>
              <p className="mt-6 max-w-[var(--measure)] text-lg text-[color:var(--bone2)]">{look} {change}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#calendar"
                  className={cn(
                    'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[color:var(--bone)] px-5 text-sm font-medium text-[color:var(--ink)] hover:bg-[color:var(--bone-hover)]',
                    ease,
                    focusRing,
                  )}
                >
                  Explore the calendar
                  <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
                </a>
                <button
                  type="button"
                  onClick={() => downloadSummary(d)}
                  className={cn(
                    'inline-flex h-12 items-center justify-center rounded-lg border border-[color:var(--bone-30)] px-5 text-sm font-medium text-[color:var(--bone)] hover:bg-[color:var(--hairline)]',
                    ease,
                    focusRing,
                  )}
                >
                  Download summary
                </button>
              </div>
            </div>
            <div className="hidden xl:col-span-5 xl:col-start-8 xl:block">
              <PassLine d={d} year={year} onYear={onYear} />
            </div>
          </div>
          <p className="mt-10 pb-6 text-xs text-[color:var(--bone-80)]">{HERO_LABEL}</p>
        </div>
      </div>

      {/* below xl the pass line leaves the photograph and sits on the black ground */}
      <div className={cn(shell, 'pt-8 xl:hidden')}>
        <PassLine d={d} year={year} onYear={onYear} />
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

function PassLine({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const dr = d.driftAt(year)
  if (!dr) return <p className="text-sm text-[color:var(--bone2)]">Look times for {d.phrase.the} are not in the data yet.</p>

  const first = d.drift[0].year
  const last = d.drift[d.drift.length - 1].year
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
    '--bar-w': `${Math.abs(xa - xf)}%`,
    // labels sit at three heights (Aqua highest); the fixed clock's label also sits on the side away from Aqua,
    // at least 8 px clear of Aqua's tick, so the two never touch however close the times are
    '--fixed-x': later ? 'min(var(--xf), calc(var(--xa) - 8px))' : 'max(var(--xf), calc(var(--xa) + 8px))',
  } as CSSProperties
  const description = `When each satellite looked in ${year}: Terra ${dr.terra_lst}, fixed clock ${dr.viirs_lst}, Aqua ${dr.aqua_lst}, ${Math.abs(shift)} minutes ${later ? 'after' : 'before'} the fixed clock`
  const valueText = (y: number) => {
    const r = d.driftAt(y)
    return r ? `${y}: fixed clock ${r.viirs_lst}, Aqua ${r.aqua_lst}, Terra ${r.terra_lst}` : String(y)
  }

  const label = 'absolute whitespace-nowrap text-xs leading-4 sm:text-sm sm:leading-5'
  const tick = 'absolute w-0.5 -translate-x-1/2'

  return (
    <div>
      <p className="text-sm text-[color:var(--bone2)]">When each satellite looked · {year}</p>
      <div role="img" aria-label={description} style={vars} className="relative mt-4 h-26 sm:h-30">
        <span className={cn(label, 'left-[var(--xa)] top-0 text-[color:var(--bone)]', xa > 80 && '-translate-x-full')}>Aqua {dr.aqua_lst}</span>
        <span className={cn(label, 'left-[var(--fixed-x)] top-5 text-[color:var(--sage)] sm:top-6', later && '-translate-x-full')}>Fixed clock {dr.viirs_lst}</span>
        <span className={cn(label, 'left-[var(--xt)] top-10 -translate-x-full text-[color:var(--bone3)] sm:top-12')}>Terra {dr.terra_lst}</span>

        <span aria-hidden className={cn(tick, 'left-[var(--xa)] top-5 h-15 bg-[color:var(--bone)] sm:top-6 sm:h-18')} />
        <span aria-hidden className={cn(tick, 'left-[var(--xf)] top-10 h-10 bg-[color:var(--sage)] sm:top-12 sm:h-12')} />
        <span aria-hidden className={cn(tick, 'left-[var(--xt)] top-15 h-5 bg-[color:var(--bone3)] sm:top-18 sm:h-6')} />

        <span aria-hidden className="absolute inset-x-0 top-20 h-px bg-[color:var(--bone-30)] sm:top-24" />
        {HOURS.map((h) => (
          <span
            key={h}
            aria-hidden
            style={{ '--xh': `${at(h)}%` } as CSSProperties}
            className="absolute left-[var(--xh)] top-20 h-1 w-px bg-[color:var(--bone-30)] sm:top-24"
          />
        ))}
        {/* the minutes Aqua's later look added, on the axis between the fixed clock and Aqua */}
        <span aria-hidden className="absolute left-[var(--bar-x)] top-20 h-0.5 w-[var(--bar-w)] -translate-y-1/2 bg-[color:var(--bone)] sm:top-24" />
        {LABELLED.map((h, i) => (
          <span
            key={h}
            aria-hidden
            style={{ '--xh': `${at(h)}%` } as CSSProperties}
            className={cn(
              'absolute left-[var(--xh)] top-22 text-xs leading-4 text-[color:var(--bone3)] sm:top-26',
              i === 0 ? '' : i === LABELLED.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
            )}
          >
            {hourLabel(h)}
          </span>
        ))}
      </div>
      <div className="mt-4 flex h-12 items-center gap-4">
        <span className="text-xs text-[color:var(--bone3)]">{first}</span>
        <YearSlider value={year} onChange={onYear} min={first} max={last} valueText={valueText} classes={sliderClasses} label="Year" />
        <span className="text-xs text-[color:var(--bone3)]">{last}</span>
      </div>
    </div>
  )
}

/* ---------- Three passes, one day: an uneven photo grid, labels set on the images ---------- */

const PASSES = [
  {
    key: 'aqua',
    src: `${IMG}amazon-aqua-2026-09-04.jpg`,
    w: 936,
    h: 720,
    label: 'Aqua · later afternoon pass',
    alt: 'Aqua, later afternoon, 4 Sep 2026: towering clouds over the same stretch of forest',
    cell: 'col-span-2 aspect-4/3 lg:col-span-5 lg:row-span-2 lg:aspect-auto',
    fit: 'object-center',
  },
  {
    key: 'terra',
    src: `${IMG}prints/amazon-terra-sq.jpg`,
    w: 720,
    h: 720,
    label: 'Terra · morning pass',
    alt: 'Terra, morning, 4 Sep 2026: hazy smoke and a few clouds over the same forest',
    cell: 'aspect-square lg:col-span-3',
    fit: 'object-left',
  },
  {
    key: 'viirs',
    src: `${IMG}prints/amazon-viirs-sq.jpg`,
    w: 720,
    h: 720,
    label: 'VIIRS · the fixed 13:30 clock',
    alt: 'VIIRS, early afternoon, 4 Sep 2026: small cumulus clouds spread across the same forest',
    cell: 'aspect-square lg:col-span-3',
    fit: 'object-center',
  },
]

function Passes() {
  return (
    <section id="clock" aria-labelledby="passes-h" className={cn(shell, 'pb-24 pt-24')}>
      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-4">
          <h2 id="passes-h" className={title}>The same forest at three hours</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            Same place on 4 Sep 2026, seen in the morning, early afternoon and later afternoon. Clouds build and more fires
            burn as the day goes on, so a later look counts more.
          </p>
        </div>
        <div className="lg:col-span-8">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-8 lg:gap-6">
            {PASSES.map((p) => (
              <figure key={p.key} className={cn('relative overflow-hidden rounded bg-[color:var(--surface)]', p.cell)}>
                <img src={p.src} alt={p.alt} width={p.w} height={p.h} loading="lazy" className={cn('absolute inset-0 size-full object-cover', p.fit)} />
                <div aria-hidden className="absolute inset-0 bg-[image:var(--scrim-tile)]" />
                <figcaption className="absolute inset-x-4 bottom-4 text-balance text-sm font-medium text-[color:var(--bone)]">{p.label}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-xs text-[color:var(--bone3)]">Imagery: NASA Worldview / GIBS, true colour</p>
        </div>
      </div>
    </section>
  )
}

/* ---------- Clock effect by year: the one sage band ---------- */

function ClockEffect({ d }: { d: RegionData }) {
  const cell = 'py-4 align-baseline'
  return (
    <section id="audit" aria-labelledby="audit-h" className="bg-[color:var(--sage)] text-[color:var(--ink)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="audit-h" className={title}>Clock effect by year</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm">
            How much Aqua's later look changed each year's official count, with its range. Years whose whole range sits
            outside {noiseText(d)} show a clock effect.
          </p>
        </div>
        <div className="lg:col-span-8">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Clock effect by year for {d.name}: how much Aqua's later look changed the official count, its range, and the reading against the {noiseText(d)} noise floor
            </caption>
            <thead>
              <tr className="border-b border-[color:var(--ink-20)] text-xs">
                <th scope="col" className="pb-2 pr-4 font-normal">Year</th>
                <th scope="col" className="px-4 pb-2 text-right font-normal">Clock effect</th>
                <th scope="col" className="hidden px-4 pb-2 text-right font-normal sm:table-cell">Range</th>
                <th scope="col" className="pb-2 pl-4 font-normal sm:pl-12">Reading</th>
              </tr>
            </thead>
            <tbody>
              {d.years.map((y) => (
                <tr key={y.year} className="border-b border-[color:var(--ink-20)]">
                  <th scope="row" className={cn(cell, 'pr-4 text-lg font-normal tabular-nums')}>{y.year}</th>
                  <td className={cn(cell, 'px-4 text-right')}>
                    <span className="block text-lg font-medium tabular-nums">{effectText(y)}</span>
                    <span className="block text-sm tabular-nums sm:hidden">{rangeText(y)}</span>
                  </td>
                  <td className={cn(cell, 'hidden px-4 text-right text-sm tabular-nums sm:table-cell')}>{rangeText(y)}</td>
                  <td className={cn(cell, 'pl-4 text-sm sm:pl-12')}>{READING[y.verdict]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs">Source: audit/{d.id}.json · MOCK</p>
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
            <div className="flex items-center gap-4 sm:ml-auto">
              {/* CSV is wired to the shared download; PNG and SVG stay inert in this comp */}
              {['CSV', 'PNG', 'SVG'].map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  aria-label={`Download ${fmt}`}
                  onClick={fmt === 'CSV' ? () => downloadCalendarCsv(d) : undefined}
                  className={cn('h-9 rounded text-sm text-[color:var(--bone2)] hover:text-[color:var(--bone)]', ease, focusRing)}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-[color:var(--hairline)] bg-[color:var(--surface)] p-6">
            <FireCalendar
              years={grid.years}
              cells={grid.cells}
              maxCount={grid.maxCount}
              mode={mode}
              render="fill"
              cellHeight={small ? 20 : 24}
              monthLabels={small ? 'initial' : 'short'}
              label={`Fire calendar for ${d.name}, ${mode === 'anomaly' ? 'each month against its median' : 'fixed-clock hotspot count'}`}
            />
          </div>
          <CalendarLegend mode={mode} render="fill" className="mt-4" />
          <p className="mt-4 text-xs text-[color:var(--bone3)]">Source: calendar/{d.id}.json · VIIRS 375 m in Aqua-equivalent units · MOCK</p>
        </div>
      </div>
    </section>
  )
}
