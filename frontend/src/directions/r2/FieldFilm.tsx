// Round 2 · Direction D, "Field film" (Anduril-inspired, at the team's request). Field footage of the thing itself:
// the burning forest seen from orbit at full bleed, the verdict on it and a pass line along its bottom edge where
// Aqua's tick slides later as the year changes; one frame you can switch between the three passes of a single day;
// one sage band of clock effects drawn against the noise floor; then the calendar.
// Black, bone and sage; small labels set on images at their lower left; square media, 4 px on small controls.
// Every number comes from src/r2/data.ts (data/mock, labelled MOCK). Imagery: NASA Worldview / GIBS, public domain.
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { ArrowRight, Menu } from 'lucide-react'
import { CalendarLegend, FireCalendar, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle, RegionSelect, YearSlider } from '@/r2/controls'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'
import {
  MONTHS, REGIONS, SECTIONS, calendarFinding, calendarGrid, fmtRange, hm, minutesBetween, pct, regionData, verdictHeadline, verdictLines,
  type RegionData, type Verdict,
} from '@/r2/data'
import { cn } from '@/lib/utils'
import { AnchorLogo } from '@/components/brand/anchor-logo'

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
const PLATE_VERDICT = 'radial-gradient(ellipse 70% 64% at 28% 52%, rgba(0, 0, 0, 0.68) 0%, rgba(0, 0, 0, 0.56) 45%, rgba(0, 0, 0, 0) 100%)'

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
  '--select-max': '168px',
  '--select-max-wide': '240px',
  '--scrims-wide': [SCRIM_TOP, PLATE_VERDICT, RAMP].join(', '),
  '--scrims-narrow': [SCRIM_TOP, RAMP].join(', '),
  '--scrim-tile': 'linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.5) 22%, rgba(0, 0, 0, 0) 52%)',
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
const HERO_SRC = `${IMG}amazon-viirs-fires-2024-08-23.jpg`
const HERO_LABEL = 'VIIRS · 23 Aug 2024 · smoke and active fires over the Amazon · NASA Worldview / GIBS'

/** Sections that exist in this comp; the rest of the index belongs to the full build. */
const IN_COMP = new Set<string>(['verdict', 'clock', 'audit', 'calendar'])

const READING: Record<Verdict, string> = { clock: 'Clock effect', noise: 'Within noise', na: 'Not enough fires' }
const DATA_NOTE = "Every number comes from the team's JSON files; this comp uses mock data."

type AuditRow = RegionData['years'][number]
type Drift = RegionData['drift'][number]
const effectText = (y: AuditRow) => (y.gap == null ? '—' : pct(y.gap))
const rangeText = (y: AuditRow) => (y.lo == null || y.hi == null ? '—' : fmtRange(y.lo, y.hi))
const noiseText = (d: RegionData) => `±${Number(d.noise.toFixed(1))}%`

const defaultYear = (d: RegionData) => d.latestOk?.year ?? d.years[d.years.length - 1]?.year ?? d.lastDrift?.year ?? 2025

function initialRegion() {
  const r = new URLSearchParams(window.location.search).get('region')
  return r && REGIONS.some((x) => x.id === r) ? r : 'br-amazon'
}

/** The audit band's heading, as a finding: the run of latest years whose whole range sits outside the noise floor. */
function effectHeading(d: RegionData) {
  const n = noiseText(d)
  let i = d.years.length - 1
  while (i >= 0 && d.years[i].verdict === 'na') i--
  if (i < 0) return `Not enough fires in ${d.phrase.the} to measure the clock effect`
  if (d.years[i].verdict === 'noise') return `In ${d.years[i].year} the official count holds: the clock effect sits within the ${n} noise floor`
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
const title = 'text-balance text-[length:var(--fs-32)] font-medium leading-9 tracking-[var(--track-title)]'
const shell = 'mx-auto w-full max-w-[var(--maxw)] px-4 sm:px-8'

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
    try { window.history.replaceState(null, '', `?${p.toString()}${window.location.hash}`) } catch { /* sandboxed frames may refuse history writes */ }
  }

  return (
    <div
      style={TOKENS as unknown as CSSProperties}
      className="relative min-h-screen overflow-x-clip bg-[color:var(--ground)] font-[family-name:var(--f-ui)] text-sm text-[color:var(--bone)] antialiased"
    >
      <TopBar region={region} onRegion={onRegion} />
      <main>
        <Hero d={d} year={year} onYear={setYear} />
        <Passes d={d} />
        <ClockEffect d={d} />
        <Calendar d={d} mode={mode} onMode={setMode} small={small} />
      </main>
      <footer className="border-t border-[color:var(--hairline)]">
        <div className={cn(shell, 'flex flex-col gap-2 py-12 text-xs text-[color:var(--bone3)] sm:flex-row sm:justify-between sm:gap-8')}>
          <p>Anchor · Team Propagators</p>
          <p className="sm:text-right">{DATA_NOTE}</p>
        </div>
      </footer>
    </div>
  )
}

/* ---------- Top bar: transparent on the photograph, no blur ---------- */

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

function MockTag({ className }: { className?: string }) {
  return <span className={cn('shrink-0 rounded border border-[color:var(--hairline)] px-2 py-1 text-xs text-[color:var(--bone)]', className)}>Mock data</span>
}

function TopBar({ region, onRegion }: { region: string; onRegion: (id: string) => void }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className={cn(shell, 'flex h-16 items-center justify-between gap-4 xl:grid xl:h-18 xl:grid-cols-12 xl:gap-x-6')}>
        <a href="#verdict" aria-label="Anchor, back to the verdict" className={cn('flex shrink-0 items-center rounded leading-none xl:col-span-3 xl:justify-self-start', focusRing)}>
          <AnchorLogo height={20} />
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
                  <span aria-disabled="true" title="In the full build" className="cursor-default text-[color:var(--bone3)]">{s.label}</span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3 xl:col-span-3">
          <MockTag className="hidden sm:inline-block" />
          <RegionSelect value={region} onChange={onRegion} classes={selectClasses} />
          <div className="xl:hidden"><SectionsIndex /></div>
        </div>
      </div>
    </header>
  )
}

/* ---------- Hero: the VIIRS scene, the verdict on it, the pass line along its bottom edge ---------- */

function Hero({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const { look, change } = verdictLines(d)
  const latest = d.latestOk
  const range = latest && latest.lo != null && latest.hi != null ? `Range ${fmtRange(latest.lo, latest.hi)} (latest audit year)` : null
  return (
    <section id="verdict" aria-labelledby="verdict-h" className="relative isolate">
      {/* the photograph: the top of the page on phones and tablets, the whole hero from 1280 px */}
      <div className="absolute inset-x-0 top-0 -z-10 h-90 overflow-hidden sm:h-120 xl:bottom-0 xl:h-auto">
        <img
          src={HERO_SRC}
          alt="Smoke and active fires over the Amazon, VIIRS true colour, 23 Aug 2024"
          width={1600}
          height={960}
          className="size-full object-cover xl:object-top"
        />
        <div aria-hidden className="absolute inset-0 bg-[image:var(--scrims-narrow)] xl:bg-[image:var(--scrims-wide)]" />
      </div>

      <div className="flex flex-col xl:min-h-[var(--hero-h)]">
        <div className={cn(shell, 'flex flex-1 flex-col')}>
          <div aria-hidden className="h-16 shrink-0 xl:h-18" />
          {/* phones and tablets: clear photograph, its label at the lower left; the verdict follows on black */}
          <div className="flex h-74 flex-col items-start justify-end gap-2 pb-4 sm:h-104 xl:hidden">
            <MockTag className="sm:hidden" />
            <p className="text-xs text-[color:var(--bone-80)]">{HERO_LABEL}</p>
          </div>

          <div className="pt-10 xl:mt-auto xl:pt-12">
            <div className="xl:grid xl:grid-cols-12 xl:gap-x-6">
              <div className="xl:col-span-8">
                <h1
                  id="verdict-h"
                  className="text-balance text-[length:var(--fs-40)] font-medium leading-[var(--lh-display)] tracking-[var(--track-display)] md:text-[length:var(--fs-72)]"
                >
                  {verdictHeadline(d)}
                </h1>
                {range ? <p className="mt-4 text-sm text-[color:var(--bone2)]">{range}</p> : null}
                <p className="mt-6 max-w-[var(--measure)] text-lg text-[color:var(--bone2)]">{look} {change}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#calendar"
                    className={cn(
                      'inline-flex h-12 items-center justify-center gap-2 rounded bg-[color:var(--bone)] px-5 text-sm font-medium text-[color:var(--ink)] hover:bg-[color:var(--bone-hover)]',
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
                      'inline-flex h-12 items-center justify-center rounded border border-[color:var(--bone-30)] px-5 text-sm font-medium text-[color:var(--bone)] hover:bg-[color:var(--hairline)]',
                      ease,
                      focusRing,
                    )}
                  >
                    Download summary
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-8 hidden pb-6 text-xs text-[color:var(--bone-80)] xl:block">{HERO_LABEL}</p>
          </div>
        </div>

        {/* the pass line: along the bottom edge on a dark plate from 1280 px, on the black ground below that */}
        <div className="mt-12 xl:mt-0 xl:bg-[color:var(--plate)]">
          <PassLine d={d} year={year} onYear={onYear} />
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

function PassLine({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const dr = d.driftAt(year)
  return (
    <div className={cn(shell, 'grid grid-cols-1 gap-y-6 xl:grid-cols-12 xl:gap-x-6 xl:gap-y-0 xl:py-6')}>
      <p className="text-sm text-[color:var(--bone2)] xl:col-span-3 xl:row-start-1">When each satellite looked</p>
      {dr ? (
        <>
          <div className="xl:col-span-9 xl:col-start-4 xl:row-span-2 xl:row-start-1 xl:self-end">
            <PassFigure dr={dr} year={year} />
          </div>
          <div className="xl:col-span-3 xl:row-start-2 xl:self-end">
            <YearControl d={d} year={year} onYear={onYear} />
          </div>
        </>
      ) : (
        <p className="text-sm text-[color:var(--bone2)]">Look times for {d.phrase.the} are not in the data yet.</p>
      )}
    </div>
  )
}

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
  // each mark rides a full-width layer moved with translateX, so a change of year slides it (instant under reduced motion)
  const layer = cn('absolute inset-x-0 top-0 h-full', slideEase)
  const tick = 'absolute left-0 w-0.5 -translate-x-1/2'
  const label = 'absolute whitespace-nowrap text-xs leading-4 sm:text-sm sm:leading-5'

  return (
    <div role="img" aria-label={description} style={vars} className="relative h-26 overflow-hidden sm:h-30">
      {/* three label heights, Aqua highest; each label sits 8 px beside the top of its own tick */}
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xa)]')}>
        <span className={cn(tick, 'top-1 h-19 bg-[color:var(--bone)] sm:h-23')} />
        <span className={cn(label, 'top-0 text-[color:var(--bone)]', xa > 80 ? '-left-2 -translate-x-full' : 'left-2')}>Aqua {dr.aqua_lst}</span>
      </div>
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xf)]')}>
        <span className={cn(tick, 'top-6 h-14 bg-[color:var(--sage)] sm:top-7 sm:h-17')} />
        {/* the fixed clock's label sits on the side away from Aqua, so the two never touch */}
        <span className={cn(label, 'top-5 text-[color:var(--sage)] sm:top-6', later ? '-left-2 -translate-x-full' : 'left-2')}>Fixed clock {dr.viirs_lst}</span>
      </div>
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xt)]')}>
        <span className={cn(tick, 'top-11 h-9 bg-[color:var(--bone3)] sm:top-13 sm:h-11')} />
        <span className={cn(label, '-left-2 top-10 -translate-x-full text-[color:var(--bone3)] sm:top-12')}>Terra {dr.terra_lst}</span>
      </div>

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
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-20 h-0.5 origin-left -translate-y-1/2 translate-x-[var(--bar-x)] scale-x-[var(--bar-k)] bg-[color:var(--bone)] sm:top-24',
          slideEase,
        )}
      />
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
  )
}

function YearControl({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const first = d.drift[0].year
  const last = d.drift[d.drift.length - 1].year
  const span = Math.max(1, last - first)
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  // Radix keeps the 16 px thumb inside the track: its centre sits at p% plus 8 px × (1 − p / 50)
  const pos = (y: number) => {
    const p = ((y - first) / span) * 100
    return `calc(${p.toFixed(3)}% + ${(8 * (1 - p / 50)).toFixed(3)}px)`
  }
  const valueText = (y: number) => {
    const r = d.driftAt(y)
    return r ? `${y}: fixed clock ${r.viirs_lst}, Aqua ${r.aqua_lst}, Terra ${r.terra_lst}` : String(y)
  }
  return (
    <div>
      <div aria-hidden className="relative h-5">
        <span style={{ '--x': pos(year) } as CSSProperties} className="absolute left-[var(--x)] top-0 -translate-x-1/2 text-sm leading-5 text-[color:var(--bone)]">
          {year}
        </span>
      </div>
      <div className="relative">
        <YearSlider value={year} onChange={onYear} min={first} max={last} valueText={valueText} classes={sliderClasses} label="Year" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-7 h-1">
          {years.map((y) => (
            <span key={y} style={{ '--x': pos(y) } as CSSProperties} className="absolute left-[var(--x)] top-0 h-1 w-px -translate-x-1/2 bg-[color:var(--bone-30)]" />
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-1 flex justify-between text-xs text-[color:var(--bone3)]">
        <span>{first}</span>
        <span>{last}</span>
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
          <h2 id="passes-h" className={title}>By the later afternoon pass, clouds have built and more fires are burning</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            Same place on 4 Sep 2026, seen in the morning, early afternoon and later afternoon. Clouds build and more fires
            burn as the day goes on, so a later look counts more.
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

/* ---------- Clock effect by year: the one sage band, each range drawn against the noise floor ---------- */

function rangeAxis(d: RegionData) {
  const known = d.years.filter((y) => y.lo != null && y.hi != null)
  const lo = Math.min(-d.noise, ...known.map((y) => y.lo!))
  const hi = Math.max(d.noise, ...known.map((y) => y.hi!))
  const step = hi - lo > 60 ? 20 : 10
  const a = Math.floor(lo / step) * step
  const b = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = a; v <= b; v += step) ticks.push(v)
  return { x: (v: number) => `${(((v - a) / (b - a)) * 100).toFixed(3)}%`, ticks }
}

const tickText = (v: number) => (v === 0 ? '0%' : pct(v, 0))

function ClockEffect({ d }: { d: RegionData }) {
  const { why } = verdictLines(d)
  const axis = rangeAxis(d)
  const band = { '--n0': axis.x(-d.noise), '--nw': `calc(${axis.x(d.noise)} - ${axis.x(-d.noise)})` } as CSSProperties
  const cell = 'py-4 align-baseline'
  return (
    <section id="audit" aria-labelledby="audit-h" className="bg-[color:var(--sage)] text-[color:var(--ink)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <h2 id="audit-h" className={title}>{effectHeading(d)}</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm">
            How much Aqua's later look changed each year's official count, with its range. Years whose whole range sits
            outside {noiseText(d)} show a clock effect.
          </p>
        </div>
        <div className="lg:col-span-8">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Clock effect by year for {d.name}: how much Aqua's later look changed the official count, its range drawn against the {noiseText(d)} noise floor, and the reading
            </caption>
            <thead>
              <tr className="border-b border-[color:var(--ink-20)] text-xs">
                <th scope="col" className="pb-2 pr-4 align-bottom font-normal">Year</th>
                <th scope="col" className="px-4 pb-2 text-right align-bottom font-normal">Clock effect</th>
                <th scope="col" className="hidden px-4 pb-2 text-right align-bottom font-normal sm:table-cell">Range</th>
                <th scope="col" className="hidden w-2/5 px-4 pb-2 align-bottom font-normal sm:table-cell">
                  <span className="sr-only">Range against the {noiseText(d)} noise floor</span>
                  <span aria-hidden className="relative block h-4">
                    {axis.ticks.map((v, i) => (
                      <span
                        key={v}
                        style={{ '--x': axis.x(v) } as CSSProperties}
                        className={cn('absolute left-[var(--x)] top-0 leading-4', i === 0 ? '' : i === axis.ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2')}
                      >
                        {tickText(v)}
                      </span>
                    ))}
                  </span>
                </th>
                <th scope="col" className="pb-2 pl-4 align-bottom font-normal">Reading</th>
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
                  <td className="hidden px-4 py-4 align-top sm:table-cell">
                    <div aria-hidden style={band} className="relative h-7">
                      {/* the noise band runs the full row height, so the rows read as one shaded strip */}
                      <span className="absolute -inset-y-4 left-[var(--n0)] w-[var(--nw)] bg-[color:var(--sage-band)]" />
                      {y.lo != null && y.hi != null && y.gap != null ? (
                        <span
                          style={{ '--b0': axis.x(y.lo), '--bw': `calc(${axis.x(y.hi)} - ${axis.x(y.lo)})`, '--bp': axis.x(y.gap) } as CSSProperties}
                          className="absolute inset-0"
                        >
                          <span className="absolute left-[var(--b0)] top-1/2 h-1 w-[var(--bw)] -translate-y-1/2 bg-[color:var(--ink)]" />
                          <span className="absolute left-[var(--bp)] top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-[color:var(--ink)]" />
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className={cn(cell, 'pl-4 text-sm')}>{READING[y.verdict]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {why ? <p className="mt-6 max-w-[var(--measure)] text-sm">{why}</p> : null}
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
          <p className="mt-4 text-xs text-[color:var(--bone3)]">Source: calendar/{d.id}.json · VIIRS 375 m in Aqua-equivalent units · MOCK</p>
        </div>
      </div>
    </section>
  )
}
