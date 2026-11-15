// Round 2 · Direction C, "Exposure record". An audit read as a darkroom exposure record: a ruled, slightly translucent
// record card on a backlit light table, three real prints of one Amazon scene, and one magenta pencil that marks only
// where the clock changed the count. Every number comes from src/r2/data.ts (data/mock, labelled MOCK).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import { CalendarLegend, FireCalendar, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle, RegionSelect, SectionsMenu } from '@/r2/controls'
import {
  REGIONS, SECTIONS, calendarFinding, calendarGrid, fmtInt, fmtRange, fmtShift, minutesBetween, pct, regionData, verdictHeadline, verdictLines,
  type RegionData, type Verdict,
} from '@/r2/data'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'
import { cn } from '@/lib/utils'

/* ---------- Tokens: one light-table neutral (hue 195), white sheets, one correction magenta ---------- */

const BASE_TOKENS = {
  '--table': '#ECF1F1',
  '--sheet': '#FFFFFF',
  '--ink': '#0F1213',
  '--ink2': '#444949',
  '--ink3': '#656A6A',
  '--ink-hover': '#2A2F30',
  '--hairline': 'rgba(15, 18, 19, 0.10)',
  '--hairline-strong': 'rgba(15, 18, 19, 0.24)',
  '--raised': 'rgba(15, 18, 19, 0.04)',
  '--shadow-sheet': '0 1px 2px rgba(0, 0, 0, 0.05), 0 8px 24px rgba(0, 0, 0, 0.06)',
  '--f-ui': "'Sofia Sans', ui-sans-serif, system-ui, sans-serif",
  '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

// paper grain: tiled fractal noise in ink at about 4% alpha
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.06 0 0 0 0 0.07 0 0 0 0 0.07 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")"

const TOKENS = {
  ...BASE_TOKENS,
  // backlit table: one neutral, near-white where the lamp is, falling off to the table tint
  '--backlight': 'radial-gradient(ellipse 1240px 860px at 60% 440px, #FBFDFD 0%, #F5F9F9 40%, #ECF1F1 82%)',
  '--sheet-90': 'rgba(255, 255, 255, 0.9)',
  '--grain': GRAIN,
  // correction magenta: marks and text, only where the clock changed the count
  '--magenta': '#D31A8D',
  '--magenta-text': '#BB007A',
  '--hatch-sel': 'repeating-linear-gradient(135deg, rgba(211, 26, 141, 0.35) 0 1px, transparent 1px 6px)',
  '--hatch-sel-ink': 'repeating-linear-gradient(135deg, rgba(15, 18, 19, 0.22) 0 1px, transparent 1px 6px)',
  '--bar-hatch': 'repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 4px)',
  '--band': 'rgba(15, 18, 19, 0.06)',
  '--gridline': 'rgba(15, 18, 19, 0.08)',
  // 1.5 px pencil and ring as inset shadows: borders under 2 px snap to 1 px on standard screens
  '--pencil': 'inset 0 0 0 1.5px #D31A8D',
  '--pencil-ink': 'inset 0 0 0 1.5px #444949',
  '--ring-cal': 'inset 0 0 0 1.5px #0F1213',
  '--bar-min': '96px',
  '--ring-inset': 'inset 0 0 0 2px #0F1213',
  '--ring-on-ink': 'inset 0 0 0 2px #0F1213, inset 0 0 0 4px #FFFFFF',
  // type: 12 / 14 / 18 / 28 / 88 (44 on phones)
  '--f-cond': "'Sofia Sans Extra Condensed', 'Sofia Sans', ui-sans-serif, sans-serif",
  '--f-mono': "'Chivo Mono', ui-monospace, monospace",
  '--fs-28': '28px',
  '--fs-44': '44px',
  '--fs-88': '88px',
  '--lh-display': '0.95',
  '--track-display': '-0.01em',
  // layout
  '--maxw': '1440px',
  '--measure': '36rem',
  '--select-max': '220px',
  '--pull': '-40px',
  '--terra-w': '92%',
  '--aqua-w': '96%',
  '--aqua-w-sm': '60%',
  '--tilt-terra': '-2deg',
  '--tilt-viirs': '1deg',
  '--tilt-aqua': '-1.5deg',
  '--tilt-card': '-0.5deg',
  // calendar toners (stepped): blue below the median, sepia above, neutral zones for counts
  '--cal-down-1': '#E0E9F1',
  '--cal-down-2': '#BBCDDD',
  '--cal-down-3': '#97B2C9',
  '--cal-down-4': '#7696B2',
  '--cal-down-5': '#40617D',
  '--cal-mid': '#E8E8E8',
  '--cal-up-1': '#F2E5DB',
  '--cal-up-2': '#E2C9B4',
  '--cal-up-3': '#D1AC8D',
  '--cal-up-4': '#BD916B',
  '--cal-up-5': '#8C5D32',
  '--cal-seq-1': '#D7DBDB',
  '--cal-seq-2': '#BDC1C1',
  '--cal-seq-3': '#A4A7A8',
  '--cal-seq-4': '#8B8F8F',
  '--cal-seq-5': '#5C5F5F',
  '--cal-seq-6': '#313434',
  '--cal-gap': '2px',
  '--cal-radius': '2px',
  '--cal-empty': 'transparent',
  '--cal-cell': '#FFFFFF',
  '--cal-hatch': 'rgba(15, 18, 19, 0.18)',
  '--cal-focus': '#0F1213',
  '--cal-fg': '#0F1213',
  '--cal-muted': '#656A6A',
} as const

/** Radix menus portal to <body>, outside the root div, so the tokens they read are mirrored there while mounted. */
function usePortalTokens() {
  useEffect(() => {
    const s = document.body.style
    for (const [k, v] of Object.entries(BASE_TOKENS)) s.setProperty(k, v)
    return () => { for (const k of Object.keys(BASE_TOKENS)) s.removeProperty(k) }
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

/* ---------- Data helpers ---------- */

type AuditRow = RegionData['years'][number]
type Vars = CSSProperties & Record<`--${string}`, string>

const READING: Record<Verdict, string> = { clock: 'clock effect', noise: 'within noise', na: '—' }
const rangeOf = (y: AuditRow) => (y.lo != null && y.hi != null ? fmtRange(y.lo, y.hi) : null)
const endash = (s: string) => s.replace('-', '–')

const noteFor = (y: AuditRow) =>
  y.fixed == null
    ? `${y.year}: the official count was ${fmtInt(y.aqua)} hotspots; not enough fires to measure on the fixed clock`
    : `${y.year}: the official count was ${fmtInt(y.aqua)} hotspots; on the fixed clock, ${fmtInt(y.fixed)}`

const defaultYear = (d: RegionData) => d.latestOk?.year ?? d.years[d.years.length - 1]?.year ?? 2025

function initialRegion() {
  const r = new URLSearchParams(window.location.search).get('region')
  return r && REGIONS.some((x) => x.id === r) ? r : 'br-amazon'
}

/** One shared axis for every range in the record: at least −10% to +35%, widened in 5-point steps to fit the region. */
function axisFor(d: RegionData) {
  const vals = d.years.flatMap((y) => (y.lo != null && y.hi != null ? [y.lo, y.hi] : []))
  const lo = Math.min(-10, Math.floor(Math.min(...vals, -10) / 5) * 5)
  const hi = Math.max(35, Math.ceil(Math.max(...vals, 35) / 5) * 5)
  const step = hi - lo > 60 ? 20 : 10
  const ticks: number[] = []
  for (let t = Math.ceil((lo + 1) / step) * step; t < hi; t += step) if (t !== 0) ticks.push(t)
  const x = (v: number) => `${(((v - lo) / (hi - lo)) * 100).toFixed(3)}%`
  return { ticks, x, bandL: x(-d.noise), bandW: `${(((2 * d.noise) / (hi - lo)) * 100).toFixed(3)}%`, zero: x(0) }
}
type Axis = ReturnType<typeof axisFor>

/* ---------- Static content ---------- */

// The prints are one Amazon scene; their look times are the Amazon drift file's 2026 values (typical, not that day's).
const AMAZON_2026 = regionData('br-amazon').driftAt(2026)
const IMG = `${import.meta.env.BASE_URL}img/prints/`
const PRINTS = [
  {
    key: 'terra', src: `${IMG}amazon-terra-sq.jpg`, name: 'Terra', pass: 'morning pass', look: AMAZON_2026?.terra_lst, typical: true,
    tilt: 'rotate-[var(--tilt-terra)]',
    place: 'col-start-1 w-full lg:col-span-3 lg:col-start-1 lg:mt-20 lg:w-[var(--terra-w)]',
    alt: 'Terra’s morning view of the Amazon scene on 4 Sep 2026: smoke haze, a few clouds, fire dots visible',
  },
  {
    key: 'viirs', src: `${IMG}amazon-viirs-sq.jpg`, name: 'VIIRS', pass: 'fixed clock', look: AMAZON_2026?.viirs_lst, typical: false,
    tilt: 'rotate-[var(--tilt-viirs)]',
    place: 'col-start-2 mt-6 w-full lg:col-span-3 lg:col-start-4 lg:mt-0',
    alt: 'VIIRS’s early-afternoon view of the same scene: small cumulus clouds spread across it',
  },
  {
    key: 'aqua', src: `${IMG}amazon-aqua-sq.jpg`, name: 'Aqua', pass: 'afternoon pass', look: AMAZON_2026?.aqua_lst, typical: true,
    tilt: 'rotate-[var(--tilt-aqua)]',
    place: 'col-span-2 w-[var(--aqua-w-sm)] justify-self-end lg:col-span-3 lg:col-start-9 lg:mt-18 lg:w-[var(--aqua-w)] lg:justify-self-start',
    alt: 'Aqua’s later afternoon view of the same scene: towering clouds cover most of it',
  },
]

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]'

const selectClasses = {
  trigger: cn(
    'inline-flex h-9 min-w-0 max-w-[var(--select-max)] items-center gap-1 rounded-lg border border-[var(--hairline)] bg-[var(--sheet)] pl-2 pr-1 text-sm text-[color:var(--ink)] sm:gap-2 sm:pl-3 sm:pr-2',
    'transition-colors duration-150 ease-[var(--ease)] hover:border-[var(--hairline-strong)] [&>span:first-child]:truncate',
    focusRing,
  ),
  icon: 'shrink-0 text-[color:var(--ink3)]',
  content: 'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--sheet)] p-1 font-[family-name:var(--f-ui)] text-[color:var(--ink)] shadow-[var(--shadow-sheet)]',
  item: 'relative flex h-9 cursor-default select-none items-center gap-2 rounded px-2 text-sm text-[color:var(--ink)] outline-none data-[highlighted]:bg-[var(--raised)] data-[state=checked]:font-medium',
}

const menuClasses = {
  trigger: cn(
    'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--hairline)] bg-[var(--sheet)] text-[color:var(--ink2)] transition-colors duration-150 ease-[var(--ease)] hover:border-[var(--hairline-strong)] lg:hidden',
    focusRing,
  ),
  content: 'z-50 min-w-48 rounded-lg border border-[var(--hairline)] bg-[var(--sheet)] p-1 font-[family-name:var(--f-ui)] text-[color:var(--ink)] shadow-[var(--shadow-sheet)]',
  item: 'flex h-9 cursor-default select-none items-center rounded px-2 text-sm text-[color:var(--ink)] outline-none data-[highlighted]:bg-[var(--raised)] data-[disabled]:text-[color:var(--ink3)]',
}

const modeClasses = {
  root: 'inline-flex h-9 overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--sheet)]',
  item: cn(
    'px-4 text-sm text-[color:var(--ink2)] outline-none transition-colors duration-150 ease-[var(--ease)] hover:text-[color:var(--ink)]',
    'focus-visible:shadow-[var(--ring-inset)] data-[state=on]:bg-[var(--ink)] data-[state=on]:text-white data-[state=on]:focus-visible:shadow-[var(--ring-on-ink)]',
  ),
}

/* ---------- Page ---------- */

export default function Record() {
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

  const headline = verdictHeadline(d)
  const { look, change } = verdictLines(d)
  const caption = d.id === 'br-amazon'
    ? 'Same scene, 4 Sep 2026, three passes. Clouds build through the afternoon as fires peak. Imagery: NASA Worldview / GIBS.'
    : 'Example scene: Amazon, 4 Sep 2026, three passes. Clouds build through the afternoon as fires peak. Imagery: NASA Worldview / GIBS.'

  return (
    <div
      style={TOKENS as unknown as CSSProperties}
      className="min-h-screen overflow-x-clip bg-[var(--table)] bg-[image:var(--backlight)] bg-no-repeat font-[family-name:var(--f-ui)] text-[color:var(--ink)] antialiased"
    >
      <TopBar region={region} onRegion={onRegion} />

      <main>
        <section id="verdict" aria-labelledby="verdict-h" className="mx-auto max-w-[var(--maxw)] px-4 pt-12 sm:px-8 lg:pt-16">
          <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0">
            <div className="lg:col-span-5 lg:row-start-1">
              <h1
                id="verdict-h"
                className="text-balance font-[family-name:var(--f-cond)] text-[length:var(--fs-44)] font-medium leading-[var(--lh-display)] tracking-[var(--track-display)] sm:text-[length:var(--fs-88)]"
              >
                {headline}
              </h1>
              <p className="mt-6 max-w-[var(--measure)] text-lg text-[color:var(--ink2)]">{look} {change}</p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#calendar"
                  className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--ink)] px-5 text-sm font-medium text-white transition-colors duration-150 ease-[var(--ease)] hover:bg-[var(--ink-hover)]', focusRing)}
                >
                  Explore the calendar
                  <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
                </a>
                <button
                  type="button"
                  onClick={() => downloadSummary(d)}
                  className={cn('inline-flex h-11 items-center justify-center rounded-lg border border-[var(--hairline)] bg-[var(--sheet)] px-5 text-sm font-medium text-[color:var(--ink)] transition-colors duration-150 ease-[var(--ease)] hover:border-[var(--hairline-strong)]', focusRing)}
                >
                  Download summary
                </button>
              </div>
            </div>

            {/* the prints lie on the table below the text; the record card's corner rests on one of them */}
            <div className="lg:col-span-12 lg:row-start-2 lg:mt-[var(--pull)]">
              <div className="grid grid-cols-2 items-start gap-x-4 gap-y-6 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0">
                {PRINTS.map((p) => <Print key={p.key} p={p} />)}
              </div>
              <p className="mt-6 text-xs text-[color:var(--ink3)]">{caption}</p>
            </div>

            <RecordCard d={d} year={year} onYear={setYear} className="lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:self-end" />
          </div>
        </section>

        <ContactSheet d={d} mode={mode} onMode={setMode} small={small} />
      </main>

      <footer className="mt-24 border-t border-[var(--hairline)]">
        <div className="mx-auto flex max-w-[var(--maxw)] flex-col gap-2 px-4 py-12 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-8">
          <p className="text-sm text-[color:var(--ink2)]">Anchor · Team Propagators</p>
          <p className="text-xs text-[color:var(--ink3)]">
            Every number comes from the team’s JSON files; this comp uses mock data.
          </p>
        </div>
      </footer>
    </div>
  )
}

/* ---------- Top bar ---------- */

function Mark() {
  // a square frame with one corner held back
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      <path d="M10 2H2v14h14V8" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function TopBar({ region, onRegion }: { region: string; onRegion: (id: string) => void }) {
  return (
    <header className="border-b border-[var(--hairline)]">
      <div className="mx-auto flex h-14 max-w-[var(--maxw)] items-center gap-2 px-4 sm:gap-10 sm:px-8">
        <a href="#verdict" className={cn('flex shrink-0 items-center gap-2 rounded text-lg font-medium leading-none text-[color:var(--ink)]', focusRing)}>
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
                    className={cn(
                      'rounded transition-colors duration-150 ease-[var(--ease)]',
                      s.id === 'verdict' ? 'font-medium text-[color:var(--ink)]' : 'text-[color:var(--ink2)] hover:text-[color:var(--ink)]',
                      focusRing,
                    )}
                  >
                    {s.label}
                  </a>
                ) : (
                  <span title="In the full build" className="cursor-default text-[color:var(--ink3)]">{s.label}</span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <span
            title="Every number on this page is a synthetic placeholder from data/mock"
            className="shrink-0 rounded border border-[var(--hairline)] px-2 py-1 text-xs leading-4 text-[color:var(--ink)]"
          >
            Mock data
          </span>
          <RegionSelect value={region} onChange={onRegion} classes={selectClasses} />
          <SectionsMenu classes={menuClasses} />
        </div>
      </div>
    </header>
  )
}

/* ---------- Prints ---------- */

function Print({ p }: { p: (typeof PRINTS)[number] }) {
  return (
    <figure className={cn('m-0 self-start rounded bg-[var(--sheet)] p-2 pb-0 shadow-[var(--shadow-sheet)] ring-1 ring-[var(--hairline)]', p.tilt, p.place)}>
      <img src={p.src} alt={p.alt} width={720} height={720} className="block aspect-square w-full object-cover" />
      {/* the stamp on the lower border: the pass and its typical look time in 2026, not this day's exact overpass */}
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-xs leading-4 text-[color:var(--ink2)]">
        <span>{p.name} · {p.pass}</span>
        <span>
          {p.typical ? 'typical look in 2026 ' : null}
          <span className="font-[family-name:var(--f-mono)] tabular-nums text-[color:var(--ink)]">{p.look}</span>
        </span>
      </figcaption>
    </figure>
  )
}

/* ---------- The record card ---------- */

const rule = 'border-l border-[var(--hairline)]'
const fit = 'w-px whitespace-nowrap'

function RecordCard({ d, year, onYear, className }: { d: RegionData; year: number; onYear: (y: number) => void; className?: string }) {
  const selected = d.years.find((y) => y.year === year) ?? d.years[d.years.length - 1]
  const selYear = selected?.year
  const corrected = selected?.verdict === 'clock'
  const axis = useMemo(() => axisFor(d), [d])
  const headlineYear = d.latestOk?.year
  const headlineCorrected = d.latestOk?.verdict === 'clock'
  const fixed = d.lastDrift?.viirs_lst
  const reduced = useMedia('(prefers-reduced-motion: reduce)')

  // the selection is one pencilled layer behind the row: placed from layout offsets (immune to the card's tilt),
  // swept in from the left when a reader picks a year
  const wrapRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLSpanElement>(null)
  const picked = useRef(false)
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const layer = layerRef.current
    if (!wrap || !layer) return
    const place = () => {
      const table = wrap.querySelector('table')
      const tr = wrap.querySelector<HTMLTableRowElement>(`tr[data-year="${selYear}"]`)
      if (!table || !tr) return
      layer.style.setProperty('--band-top', `${table.offsetTop + tr.offsetTop}px`)
      layer.style.setProperty('--band-h', `${tr.offsetHeight}px`)
    }
    place()
    if (picked.current && !reduced) {
      layer.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
    }
    picked.current = false
    const ro = new ResizeObserver(place)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [selYear, d, reduced])

  const pick = (y: number) => {
    if (y === selYear) return
    picked.current = true
    onYear(y)
  }

  return (
    <article
      aria-labelledby="record-h"
      className={cn(
        'relative z-10 rounded bg-[var(--sheet-90)] bg-[image:var(--grain)] p-4 shadow-[var(--shadow-sheet)] ring-1 ring-[var(--hairline)] sm:p-6 lg:rotate-[var(--tilt-card)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="record-h" className="font-[family-name:var(--f-cond)] text-[length:var(--fs-28)] font-medium leading-8 tracking-[var(--track-display)]">
          Exposure record · {d.name}
        </h2>
        <p className="text-xs text-[color:var(--ink3)]">
          Baseline {endash(d.baselineYears)} · noise floor ±{d.noise}%{fixed ? ` · fixed clock ${fixed}` : ''}
        </p>
      </div>

      <div ref={wrapRef} className="relative isolate -mx-4 mt-4 overflow-x-auto sm:-mx-6">
        <span
          ref={layerRef}
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-2 top-[var(--band-top)] -z-10 h-[var(--band-h)]',
            corrected ? 'bg-[image:var(--hatch-sel)] shadow-[var(--pencil)]' : 'bg-[image:var(--hatch-sel-ink)] shadow-[var(--pencil-ink)]',
          )}
        />
        <table className="w-full border-collapse">
          <caption className="sr-only text-sm">
            Clock effect by year for {d.name}: when Aqua looked, its shift from the fixed {fixed} clock, the clock effect with its range on one shared axis, and the reading against the ±{d.noise}% noise floor. Choose a year to read its counts.
          </caption>
          <thead>
            <tr className="h-8 border-b-3 border-double border-[var(--ink)] text-xs text-[color:var(--ink3)]">
              <th scope="col" className={cn(fit, 'pl-4 pr-2 text-left font-normal sm:pl-6')}>Year</th>
              <th scope="col" className={cn(rule, 'w-px pl-1 pr-2 text-right font-normal sm:whitespace-nowrap sm:px-3')}>Aqua looked</th>
              <th scope="col" className={cn(rule, fit, 'pl-1 pr-2 text-right font-normal sm:px-3')}>Shift</th>
              <th scope="col" className={cn(rule, fit, 'pl-1 pr-4 text-right font-normal sm:px-3')}>Clock effect</th>
              <th scope="col" className={cn(rule, 'hidden px-3 font-normal sm:table-cell sm:pr-6 xl:pr-3')}>
                <span className="sr-only">Range of the clock effect on one shared axis</span>
                <AxisHead axis={axis} noise={d.noise} />
              </th>
              <th scope="col" className={cn(rule, fit, 'hidden pl-3 pr-6 text-left font-normal xl:table-cell')}>Reading</th>
            </tr>
          </thead>
          <tbody className="border-b border-[var(--ink)]">
            {d.years.map((y) => (
              <RecordRow
                key={y.year}
                d={d}
                y={y}
                axis={axis}
                selected={y.year === selYear}
                headline={y.year === headlineYear}
                headlineCorrected={headlineCorrected}
                onSelect={() => pick(y.year)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p aria-live="polite" className="mt-4 text-sm tabular-nums text-[color:var(--ink2)]">
        {selected ? noteFor(selected) : null}
      </p>
      <p className="mt-2 text-xs text-[color:var(--ink3)]">
        Clock effect = Aqua-based count ÷ fixed-clock count − 1. Range from the regional bootstrap. Source:{' '}
        <span className="whitespace-nowrap">audit/{d.id}.json,</span> <span className="whitespace-nowrap">drift/{d.id}.json · MOCK</span>
      </p>
    </article>
  )
}

function AxisHead({ axis, noise }: { axis: Axis; noise: number }) {
  return (
    <div className="relative h-8 w-full min-w-[var(--bar-min)]">
      <span aria-hidden className="absolute inset-y-0 left-[var(--l)] w-[var(--w)] bg-[var(--band)]" style={{ '--l': axis.bandL, '--w': axis.bandW } as Vars} />
      <span aria-hidden className="absolute bottom-1 left-[var(--l)] -translate-x-1/2 whitespace-nowrap leading-4" style={{ '--l': axis.zero } as Vars}>
        ±{noise}% noise
      </span>
      {axis.ticks.map((t) => (
        <span
          key={t}
          aria-hidden
          className="absolute bottom-1 left-[var(--l)] -translate-x-1/2 whitespace-nowrap font-[family-name:var(--f-mono)] leading-4 tabular-nums"
          style={{ '--l': axis.x(t) } as Vars}
        >
          {pct(t, 0)}
        </span>
      ))}
    </div>
  )
}

function RangeBar({ y, axis }: { y: AuditRow; axis: Axis }) {
  const ok = y.lo != null && y.hi != null && y.gap != null
  const tone = y.verdict === 'clock' ? 'text-[color:var(--magenta)]' : 'text-[color:var(--ink2)]'
  const tick = y.verdict === 'clock' ? 'bg-[var(--magenta-text)]' : 'bg-[var(--ink)]'
  return (
    <div className="relative h-10 w-full min-w-[var(--bar-min)]">
      <span aria-hidden className="absolute inset-y-0 left-[var(--l)] w-[var(--w)] bg-[var(--band)]" style={{ '--l': axis.bandL, '--w': axis.bandW } as Vars} />
      {axis.ticks.map((t) => (
        <span key={t} aria-hidden className="absolute inset-y-0 left-[var(--l)] w-px bg-[var(--gridline)]" style={{ '--l': axis.x(t) } as Vars} />
      ))}
      {ok ? (
        <>
          {/* the hatch is the uncertainty: magenta where the clock changed the count, ink where it sits in the noise */}
          <span
            aria-hidden
            className={cn('absolute left-[var(--l)] top-1/2 h-3 w-[var(--w)] -translate-y-1/2 border border-current bg-[var(--sheet)] bg-[image:var(--bar-hatch)]', tone)}
            style={{ '--l': axis.x(y.lo!), '--w': `calc(${axis.x(y.hi!)} - ${axis.x(y.lo!)})` } as Vars}
          />
          <span aria-hidden className={cn('absolute left-[var(--l)] top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2', tick)} style={{ '--l': axis.x(y.gap!) } as Vars} />
        </>
      ) : (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-[color:var(--ink3)]">not enough fires to measure</span>
      )}
    </div>
  )
}

function RecordRow({ d, y, axis, selected, headline, headlineCorrected, onSelect }: {
  d: RegionData; y: AuditRow; axis: Axis; selected: boolean; headline: boolean; headlineCorrected: boolean; onSelect: () => void
}) {
  const dr = d.driftAt(y.year)
  const shift = dr ? minutesBetween(dr.aqua_lst, dr.viirs_lst) : null
  const corrected = y.verdict === 'clock'
  // magenta pencil: only the values where the clock changed the count
  const mark = corrected ? 'text-[color:var(--magenta-text)]' : 'text-[color:var(--ink2)]'
  const range = rangeOf(y)
  const mono = 'font-[family-name:var(--f-mono)] tabular-nums'
  return (
    <tr data-year={y.year} className="h-10 border-b border-[var(--hairline)] last:border-b-0">
      <th scope="row" className={cn(fit, 'pl-4 pr-2 text-left font-normal sm:pl-6')}>
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className={cn('-mx-1 flex h-10 flex-col items-start justify-center rounded px-1 text-[color:var(--ink)]', focusRing, 'focus-visible:-outline-offset-2')}
        >
          <span className="inline-flex items-center gap-1 text-xs tabular-nums sm:gap-2 sm:text-sm">
            <span aria-hidden className={cn('size-2 shrink-0', selected ? 'bg-[var(--ink)]' : 'border border-[var(--ink3)]')} />
            <span className={selected ? 'font-medium' : undefined}>{y.year}</span>
          </span>
          {headline ? (
            <span className={cn('text-xs leading-4', headlineCorrected ? 'text-[color:var(--magenta-text)]' : 'text-[color:var(--ink2)]')}>Headline year</span>
          ) : null}
        </button>
      </th>
      <td className={cn(rule, fit, mono, 'pl-1 pr-2 text-right text-xs text-[color:var(--ink2)] sm:px-3 sm:text-sm')}>{dr?.aqua_lst ?? '—'}</td>
      <td className={cn(rule, fit, mono, 'pl-1 pr-2 text-right text-xs sm:px-3 sm:text-sm', mark)}>{shift == null ? '—' : fmtShift(shift)}</td>
      <td className={cn(rule, fit, 'pl-1 pr-4 text-right sm:px-3')}>
        <span className={cn('block text-xs leading-4 sm:text-sm sm:leading-5', mono, y.gap == null ? 'text-[color:var(--ink3)]' : mark)}>
          {y.gap == null ? '—' : pct(y.gap)}
        </span>
        {range ? (
          <span className={cn('block text-xs leading-4 text-[color:var(--ink3)]', mono)}>{range}</span>
        ) : (
          <span className="block text-xs leading-4 text-[color:var(--ink3)] sm:hidden">not enough fires</span>
        )}
      </td>
      <td className={cn(rule, 'hidden px-3 sm:table-cell sm:pr-6 xl:pr-3')}>
        <RangeBar y={y} axis={axis} />
      </td>
      <td className={cn(rule, fit, 'hidden pl-3 pr-6 text-left text-sm xl:table-cell', corrected ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink3)]')}>
        {READING[y.verdict]}
      </td>
    </tr>
  )
}

/* ---------- Calendar: the contact sheet ---------- */

function ContactSheet({ d, mode, onMode, small }: { d: RegionData; mode: CalendarMode; onMode: (m: CalendarMode) => void; small: boolean }) {
  const grid = useMemo(() => calendarGrid(d), [d])
  const f = calendarFinding(d)
  const finding = f ? `${f.label} printed furthest above its median, ${pct(f.anomaly, 0)}` : 'Every month in this range sits near its median'
  const fixed = d.lastDrift?.viirs_lst ?? '13:30'
  const first = grid.years[grid.years.length - 1]
  const last = grid.years[0]
  const sentence = mode === 'anomaly'
    ? `Each frame is a month on the fixed ${fixed} clock, toned against the 2002–2025 median for that month: sepia above, blue below`
    : `Each frame is a month on the fixed ${fixed} clock, toned by its hotspot count: the darker the frame, the more hotspots`

  // ring the frame the finding names, measured from the calendar's own cells (fire-calendar.tsx stays untouched)
  const calRef = useRef<HTMLDivElement>(null)
  const [ring, setRing] = useState<{ l: number; t: number; w: number; h: number } | null>(null)
  const ringKey = f ? `${f.label}:` : null
  useLayoutEffect(() => {
    const el = calRef.current
    if (!el || !ringKey) { setRing(null); return }
    const measure = () => {
      const cell = el.querySelector<HTMLElement>(`[role="gridcell"][aria-label^="${ringKey}"]`)
      setRing(cell ? { l: cell.offsetLeft, t: cell.offsetTop, w: cell.offsetWidth, h: cell.offsetHeight } : null)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ringKey, small, mode, grid])

  return (
    <section id="calendar" aria-labelledby="calendar-h" className="mx-auto max-w-[var(--maxw)] px-4 pt-24 sm:px-8">
      <div className="rounded bg-[var(--sheet)] bg-[image:var(--grain)] p-4 shadow-[var(--shadow-sheet)] ring-1 ring-[var(--hairline)] sm:p-8">
        <h2 id="calendar-h" className="text-balance font-[family-name:var(--f-cond)] text-[length:var(--fs-28)] font-medium leading-8 tracking-[var(--track-display)]">
          {finding}
        </h2>
        <p className="mt-2 max-w-[var(--measure)] text-sm text-[color:var(--ink2)]">{sentence}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <ModeToggle value={mode} onChange={onMode} classes={modeClasses} />
          <span className="text-sm tabular-nums text-[color:var(--ink)]" aria-label={`Years ${first} to ${last}`}>
            {first} → {last}
          </span>
          <button
            type="button"
            onClick={() => downloadCalendarCsv(d)}
            className={cn('rounded text-sm text-[color:var(--ink2)] underline-offset-4 transition-colors duration-150 ease-[var(--ease)] hover:text-[color:var(--ink)] hover:underline sm:ml-auto', focusRing)}
          >
            Download CSV
          </button>
        </div>

        <div ref={calRef} className="relative mt-6 [&_[role=row]>span:last-child:not([role])]:font-[family-name:var(--f-mono)]">
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
          {ring ? (
            <span
              aria-hidden
              className="pointer-events-none absolute left-[var(--l)] top-[var(--t)] z-10 h-[var(--h)] w-[var(--w)] rounded shadow-[var(--ring-cal)]"
              style={{ '--l': `${ring.l - 3}px`, '--t': `${ring.t - 3}px`, '--w': `${ring.w + 6}px`, '--h': `${ring.h + 6}px` } as Vars}
            />
          ) : null}
        </div>
        <CalendarLegend mode={mode} render="fill" className="mt-6" />
        <p className="mt-4 text-xs text-[color:var(--ink3)]">Source: calendar/{d.id}.json · VIIRS 375 m in Aqua-equivalent units · MOCK</p>
      </div>
    </section>
  )
}
