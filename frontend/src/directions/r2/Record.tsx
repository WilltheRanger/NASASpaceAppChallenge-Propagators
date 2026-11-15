// Round 2 · Direction C, "Exposure record". An audit read as a darkroom exposure record: a ruled record card on a
// backlit light table, three real prints of one Amazon scene, and one magenta pencil that marks only where the clock
// changed the count. Every number comes from src/r2/data.ts (data/mock, labelled MOCK).
// Drafted with AI assistance (Claude) for Team Propagators.
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import { CalendarLegend, FireCalendar, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle, RegionSelect } from '@/r2/controls'
import {
  REGIONS, calendarFinding, calendarGrid, fmtInt, fmtShift, minutesBetween, pct, regionData, verdictHeadline, verdictLines,
  type RegionData, type Verdict,
} from '@/r2/data'
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

const TOKENS = {
  ...BASE_TOKENS,
  // backlit table: a soft tone shift inside the one neutral, brightest behind the prints and the record
  '--backlight': 'radial-gradient(ellipse 980px 700px at 70% 460px, #F3F7F7 0%, rgba(243, 247, 247, 0) 100%)',
  // correction magenta: marks and text. Used only where the clock changed the count.
  '--magenta': '#D31A8D',
  '--magenta-text': '#BB007A',
  '--hatch-correction': 'repeating-linear-gradient(135deg, rgba(211, 26, 141, 0.16) 0 1px, transparent 1px 6px)',
  '--hatch-neutral': 'repeating-linear-gradient(135deg, rgba(15, 18, 19, 0.14) 0 1px, transparent 1px 6px)',
  '--ring-inset': 'inset 0 0 0 2px #0F1213',
  '--ring-on-ink': 'inset 0 0 0 2px #0F1213, inset 0 0 0 4px #FFFFFF',
  // type
  '--f-cond': "'Sofia Sans Extra Condensed', 'Sofia Sans', ui-sans-serif, sans-serif",
  '--f-mono': "'Chivo Mono', ui-monospace, monospace",
  '--fs-28': '28px',
  '--fs-44': '44px',
  '--fs-72': '72px',
  '--track-display': '-0.01em',
  // layout
  '--maxw': '1440px',
  '--measure': '36rem',
  '--hero-h': 'calc(100svh - 57px)',
  '--select-max': '220px',
  '--print-w': 'min(216px, calc((100% - 24px) / 3))',
  '--tilt-terra': '-2deg',
  '--tilt-viirs': '1deg',
  '--tilt-aqua': '-1.5deg',
  '--tilt-card': '-1deg',
  '--overlap': '-108px',
  '--card-pt': '132px',
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
  '--cal-hatch': 'rgba(15, 18, 19, 0.35)',
  '--cal-focus': '#0F1213',
  '--cal-fg': '#0F1213',
  '--cal-muted': '#656A6A',
} as const

/** Radix Select portals its menu to <body>, outside the root div, so the tokens it reads are mirrored there while mounted. */
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

/* ---------- Copy helpers (formats shared by the record and the summary) ---------- */

type AuditRow = RegionData['years'][number]

const READING: Record<Verdict, string> = { clock: 'clock effect', noise: 'within noise', na: 'not enough fires' }

const num1 = (v: number) => { const r = Math.round(v * 10) / 10; return `${r < 0 ? '−' : ''}${Math.abs(r).toFixed(1)}` }
const fmtRange = (lo: number | null, hi: number | null) => (lo == null || hi == null ? null : `${num1(lo)} to ${num1(hi)}`)
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

function summaryText(d: RegionData) {
  const { look, change } = verdictLines(d)
  const rows = d.years.map((y) => {
    const dr = d.driftAt(y.year)
    const shift = dr ? fmtShift(minutesBetween(dr.aqua_lst, dr.viirs_lst)) : '—'
    return [y.year, dr?.aqua_lst ?? '—', dr?.viirs_lst ?? '—', shift, y.gap == null ? '—' : pct(y.gap), fmtRange(y.lo, y.hi) ?? '—', READING[y.verdict]].join('\t')
  })
  return [
    `Anchor · ${d.name} · MOCK DATA, not for publication`,
    '',
    verdictHeadline(d),
    `${look} ${change}`,
    '',
    `Exposure record · baseline ${endash(d.baselineYears)} · noise floor ±${d.noise}%`,
    ['Year', 'Aqua looked', 'Fixed clock', 'Shift', 'Clock effect', 'Range', 'Reading'].join('\t'),
    ...rows,
    '',
    'Clock effect = Aqua-based count ÷ fixed-clock count − 1. Range from the regional bootstrap.',
    `Source: audit/${d.id}.json, drift/${d.id}.json (mock)`,
    'Designed and coded with AI assistance (Claude) for Team Propagators.',
  ].join('\n')
}

function downloadSummary(d: RegionData) {
  const url = URL.createObjectURL(new Blob([summaryText(d)], { type: 'text/plain;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `anchor-${d.id}-summary-mock.txt`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- Static content ---------- */

const SECTIONS = [
  { label: 'Verdict', href: '#verdict' },
  { label: 'The clock', href: '#the-clock' },
  { label: 'Two clocks', href: '#two-clocks' },
  { label: 'Audit', href: '#audit' },
  { label: 'Calendar', href: '#calendar' },
  { label: 'Checks', href: '#checks' },
  { label: 'Limits', href: '#limits' },
]

const IMG = `${import.meta.env.BASE_URL}img/prints/`
const PRINTS = [
  {
    src: `${IMG}amazon-terra-sq.jpg`, name: 'Terra', pass: 'morning pass', tilt: 'rotate-[var(--tilt-terra)]', drop: 'mt-2',
    alt: 'Terra’s morning view of the Amazon scene on 4 Sep 2026: smoke haze, a few clouds, fire dots visible',
  },
  {
    src: `${IMG}amazon-viirs-sq.jpg`, name: 'VIIRS', pass: 'fixed clock', tilt: 'rotate-[var(--tilt-viirs)]', drop: 'mt-0',
    alt: 'VIIRS’s early-afternoon view of the same scene: small cumulus clouds spread across it',
  },
  {
    src: `${IMG}amazon-aqua-sq.jpg`, name: 'Aqua', pass: 'afternoon pass', tilt: 'rotate-[var(--tilt-aqua)]', drop: 'mt-3',
    alt: 'Aqua’s later afternoon view of the same scene: towering clouds cover most of it',
  },
]

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]'

const selectClasses = {
  trigger: cn(
    'inline-flex h-9 min-w-0 max-w-[var(--select-max)] items-center gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--sheet)] pl-3 pr-2 text-sm text-[color:var(--ink)]',
    'transition-colors duration-150 ease-[var(--ease)] hover:border-[var(--hairline-strong)] [&>span:first-child]:truncate',
    focusRing,
  ),
  icon: 'shrink-0 text-[color:var(--ink3)]',
  content: 'z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--sheet)] p-1 font-[family-name:var(--f-ui)] text-[color:var(--ink)] shadow-[var(--shadow-sheet)]',
  item: 'relative flex h-9 cursor-default select-none items-center gap-2 rounded px-2 text-sm text-[color:var(--ink)] outline-none data-[highlighted]:bg-[var(--raised)] data-[state=checked]:font-medium',
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

  return (
    <div
      style={TOKENS as unknown as CSSProperties}
      className="min-h-screen overflow-x-clip bg-[var(--table)] bg-[image:var(--backlight)] bg-no-repeat font-[family-name:var(--f-ui)] text-[color:var(--ink)] antialiased"
    >
      <TopBar region={region} onRegion={onRegion} />

      <main>
        <section id="verdict" aria-labelledby="verdict-h" className="mx-auto max-w-[var(--maxw)] px-4 sm:px-8">
          <div className="grid grid-cols-1 gap-y-12 pb-12 pt-12 lg:min-h-[var(--hero-h)] lg:grid-cols-12 lg:items-center lg:gap-x-6">
            <div className="lg:col-span-5">
              <h1
                id="verdict-h"
                className="text-balance font-[family-name:var(--f-cond)] text-[length:var(--fs-44)] font-medium leading-none tracking-[var(--track-display)] sm:text-[length:var(--fs-72)]"
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

            <div className="lg:col-span-7">
              <LightTable d={d} year={year} onYear={setYear} />
            </div>
          </div>
        </section>

        <ContactSheet d={d} mode={mode} onMode={setMode} small={small} />
      </main>

      <footer className="mt-24 border-t border-[var(--hairline)]">
        <div className="mx-auto flex max-w-[var(--maxw)] flex-col gap-2 px-4 py-12 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-8">
          <p className="text-sm text-[color:var(--ink2)]">Anchor · Team Propagators</p>
          <p className="text-xs text-[color:var(--ink3)]">
            Designed and coded with AI assistance (Claude). Every number comes from the team’s JSON files; this comp uses mock data.
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
      <div className="mx-auto flex h-14 max-w-[var(--maxw)] items-center gap-10 px-4 sm:px-8">
        <a href="#verdict" className={cn('flex shrink-0 items-center gap-2 rounded text-lg font-medium leading-none text-[color:var(--ink)]', focusRing)}>
          <Mark />
          Anchor
        </a>
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="flex items-center gap-6 text-sm">
            {SECTIONS.map((s, i) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  aria-current={i === 0 ? 'true' : undefined}
                  className={cn(
                    'rounded transition-colors duration-150 ease-[var(--ease)]',
                    i === 0 ? 'font-medium text-[color:var(--ink)]' : 'text-[color:var(--ink2)] hover:text-[color:var(--ink)]',
                    focusRing,
                  )}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <span
            title="Every number on this page is a synthetic placeholder from data/mock"
            className="shrink-0 rounded border border-[var(--hairline)] px-2 py-1 text-xs leading-4 text-[color:var(--ink)]"
          >
            Mock data
          </span>
          <RegionSelect value={region} onChange={onRegion} classes={selectClasses} />
        </div>
      </div>
    </header>
  )
}

/* ---------- Hero composition: prints laid on the record card, on the light table ---------- */

function Print({ p }: { p: (typeof PRINTS)[number] }) {
  return (
    <figure
      className={cn(
        'm-0 w-[var(--print-w)] shrink-0 rounded bg-[var(--sheet)] px-2 pt-2 shadow-[var(--shadow-sheet)] ring-1 ring-[var(--hairline)]',
        p.tilt,
        p.drop,
      )}
    >
      <img src={p.src} alt={p.alt} width={720} height={720} className="block aspect-square w-full object-cover" />
      <figcaption className="py-2 text-xs leading-4 text-[color:var(--ink2)]">
        {p.name}
        <span className="hidden sm:inline"> · </span>
        <span className="block sm:inline">{p.pass}</span>
      </figcaption>
    </figure>
  )
}

function LightTable({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const selected = d.years.find((y) => y.year === year) ?? d.years[d.years.length - 1]
  return (
    <div className="relative">
      <div className="relative z-10 flex items-start justify-between gap-3 lg:px-6">
        {PRINTS.map((p) => <Print key={p.name} p={p} />)}
      </div>

      <article
        aria-labelledby="record-h"
        className="relative mt-6 rounded bg-[var(--sheet)] p-4 shadow-[var(--shadow-sheet)] ring-1 ring-[var(--hairline)] sm:p-6 lg:mt-[var(--overlap)] lg:rotate-[var(--tilt-card)] lg:pt-[var(--card-pt)]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="record-h" className="font-[family-name:var(--f-cond)] text-[length:var(--fs-28)] font-medium leading-8 tracking-[var(--track-display)]">
            Exposure record · {d.name}
          </h2>
          <p className="text-xs text-[color:var(--ink3)]">
            Baseline {endash(d.baselineYears)} · noise floor ±{d.noise}%
          </p>
        </div>

        <div className="-mx-4 mt-4 overflow-x-auto sm:-mx-6">
          <table className="w-full border-collapse">
            <caption className="sr-only">
              Clock effect by year for {d.name}: when Aqua looked, the fixed clock, the shift between them, the clock effect with its range, and the reading against the ±{d.noise}% noise floor. Choose a year to read its counts.
            </caption>
            <thead>
              <tr className="h-8 border-b border-[var(--ink)] text-xs text-[color:var(--ink3)]">
                <th scope="col" className="pl-4 pr-2 text-left font-normal sm:pl-6">Year</th>
                <th scope="col" className="hidden px-3 text-right font-normal sm:table-cell">Aqua looked</th>
                <th scope="col" className="hidden px-3 text-right font-normal sm:table-cell">Fixed clock</th>
                <th scope="col" className="px-2 text-right font-normal sm:px-3">Shift</th>
                <th scope="col" className="px-2 text-right font-normal sm:px-3">Clock effect</th>
                <th scope="col" className="px-2 text-right font-normal sm:px-3">Range</th>
                <th scope="col" className="pl-2 pr-4 text-left font-normal sm:pl-3 sm:pr-6">Reading</th>
              </tr>
            </thead>
            <tbody className="border-b border-[var(--ink)]">
              {d.years.map((y) => (
                <RecordRow key={y.year} d={d} y={y} selected={y.year === selected?.year} onSelect={() => onYear(y.year)} />
              ))}
            </tbody>
          </table>
        </div>

        <p aria-live="polite" className="mt-4 text-sm tabular-nums text-[color:var(--ink2)]">
          {selected ? noteFor(selected) : null}
        </p>
        <p className="mt-2 text-xs text-[color:var(--ink3)]">
          Clock effect = Aqua-based count ÷ fixed-clock count − 1. Range from the regional bootstrap. Source: audit/{d.id}.json, drift/{d.id}.json · MOCK
        </p>
      </article>

      <p className="mt-6 text-xs text-[color:var(--ink3)] lg:px-2">
        Same Amazon scene, 4 Sep 2026, three passes. Clouds build through the afternoon as fires peak. Imagery: NASA Worldview / GIBS.
      </p>
    </div>
  )
}

const valueCell = 'whitespace-nowrap px-2 text-right font-[family-name:var(--f-mono)] text-xs tabular-nums sm:px-3 sm:text-sm'

function RecordRow({ d, y, selected, onSelect }: { d: RegionData; y: AuditRow; selected: boolean; onSelect: () => void }) {
  const dr = d.driftAt(y.year)
  const shift = dr ? minutesBetween(dr.aqua_lst, dr.viirs_lst) : null
  const corrected = y.verdict === 'clock'
  // magenta pencil: only the values where the clock changed the count
  const mark = corrected ? 'text-[color:var(--magenta-text)]' : 'text-[color:var(--ink2)]'
  const range = fmtRange(y.lo, y.hi)
  return (
    <tr
      onClick={onSelect}
      className={cn(
        'h-10 cursor-pointer border-b border-[var(--hairline)] transition-colors duration-150 ease-[var(--ease)] last:border-b-0 hover:bg-[var(--raised)]',
        selected && (corrected ? 'bg-[image:var(--hatch-correction)]' : 'bg-[image:var(--hatch-neutral)]'),
      )}
    >
      <th scope="row" className="pl-4 pr-2 text-left font-normal sm:pl-6">
        <button
          type="button"
          aria-pressed={selected}
          onClick={(e) => { e.stopPropagation(); onSelect() }}
          className={cn('-mx-1 inline-flex h-8 items-center gap-2 rounded px-1 text-xs tabular-nums text-[color:var(--ink)] sm:text-sm', focusRing)}
        >
          <span aria-hidden className={cn('size-2 shrink-0', selected ? 'bg-[var(--ink)]' : 'border border-[var(--ink3)]')} />
          <span className={selected ? 'font-medium' : undefined}>{y.year}</span>
        </button>
      </th>
      <td className={cn(valueCell, 'hidden text-[color:var(--ink2)] sm:table-cell')}>{dr?.aqua_lst ?? '—'}</td>
      <td className={cn(valueCell, 'hidden text-[color:var(--ink2)] sm:table-cell')}>{dr?.viirs_lst ?? '—'}</td>
      <td className={cn(valueCell, mark)}>{shift == null ? '—' : fmtShift(shift)}</td>
      <td className={cn(valueCell, y.gap == null ? 'text-[color:var(--ink3)]' : mark)}>{y.gap == null ? '—' : pct(y.gap)}</td>
      <td className={cn(valueCell, range ? 'text-[color:var(--ink2)]' : 'text-[color:var(--ink3)]')}>{range ?? '—'}</td>
      <td className={cn('pl-2 pr-4 text-left text-xs sm:pl-3 sm:pr-6 sm:text-sm', corrected ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink3)]')}>
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

  return (
    <section id="calendar" aria-labelledby="calendar-h" className="mx-auto max-w-[var(--maxw)] px-4 pt-24 sm:px-8">
      <div className="rounded bg-[var(--sheet)] p-4 shadow-[var(--shadow-sheet)] ring-1 ring-[var(--hairline)] sm:p-8">
        <h2 id="calendar-h" className="text-balance font-[family-name:var(--f-cond)] text-[length:var(--fs-28)] font-medium leading-8 tracking-[var(--track-display)]">
          {finding}
        </h2>
        <p className="mt-2 max-w-[var(--measure)] text-sm text-[color:var(--ink2)]">{sentence}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <ModeToggle value={mode} onChange={onMode} classes={modeClasses} />
          <span className="text-sm tabular-nums text-[color:var(--ink)]" aria-label={`Years ${first} to ${last}`}>
            {first} → {last}
          </span>
          <div className="flex items-center gap-4 sm:ml-auto">
            {['CSV', 'PNG', 'SVG'].map((fmt) => (
              <button
                key={fmt}
                type="button"
                aria-label={`Download ${fmt}`}
                className={cn('rounded text-sm text-[color:var(--ink2)] underline-offset-4 transition-colors duration-150 ease-[var(--ease)] hover:text-[color:var(--ink)] hover:underline', focusRing)}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 [&_[role=row]>span:last-child:not([role])]:font-[family-name:var(--f-mono)]">
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
        <CalendarLegend mode={mode} render="fill" className="mt-6" />
        <p className="mt-4 text-xs text-[color:var(--ink3)]">Source: calendar/{d.id}.json · VIIRS 375 m in Aqua-equivalent units · MOCK</p>
      </div>
    </section>
  )
}
