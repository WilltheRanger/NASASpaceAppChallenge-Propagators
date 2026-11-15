/*
 * Round 2 · E · Operating picture (Palantir-inspired, at the team's request).
 * MOCK data: every number comes from src/r2/data.ts.
 * THESIS: plain, very large sentences, then the working product in its own dark window, the way an analyst sees it.
 * OWN-WORLD: light grey page, black and grey two-tone sentences, one dark product window with amber for Aqua and
 *   blue for Terra. Amber and blue live only inside the dark windows.
 * STORY: two-tone verdict → the clock window (look time by year, scrubber, readout) → the regions as a giant index →
 *   the calendar.
 * FIRST VIEWPORT: headline across 10 columns, subhead and actions in 6, the product window rising past the fold.
 * SIGNATURE: the two-tone sentence. Every finding drops to grey halfway; grey only at 32 px and up.
 * FORM: team-pinned reference (Palantir), no seed.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { ArrowRight } from 'lucide-react'
import { curveMonotoneX, line, scaleLinear } from 'd3'
import { CalendarLegend, FireCalendar, type CalendarMode } from '@/components/ui/fire-calendar'
import { ModeToggle, RegionSelect, SectionsMenu, YearSlider } from '@/r2/controls'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'
import {
  REGIONS, SECTIONS, calendarFinding, calendarGrid, fmtHM, fmtRange, fmtShift, hm, minutesBetween, pct, regionData,
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
} as const

/* ---------- Shared class strings ---------- */

const container = 'mx-auto w-full max-w-[var(--maxw)] px-4 md:px-8'
const ease = 'transition-colors duration-150 ease-[var(--ease)]'
// No outline-none here: in Tailwind v4 it sets --tw-outline-style to none and would hide these rings.
const ringLight = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]'
const ringLightInset = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ink)]'
const ringDark = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wtext)]'
const ringDarkInset = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--wtext)]'
const heading32 = 'text-balance text-[length:var(--fs-32)] font-normal leading-9 tracking-[var(--track-32)]'
const btn = cn('inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium', ease, ringLight)

const selectClasses = {
  trigger: cn(
    'inline-flex h-9 min-w-0 items-center gap-2 rounded-lg border border-[var(--hair)] bg-[var(--card)] pl-3 pr-2 text-sm text-[color:var(--ink)]',
    '[&>span:first-child]:truncate hover:border-[var(--hair-strong)]', ease, ringLight,
  ),
  icon: 'shrink-0 text-[color:var(--ink3)]',
  content: 'z-50 min-w-[var(--radix-select-trigger-width)] rounded-xl border border-[var(--hair)] bg-[var(--card)] p-1 font-[family-name:var(--font)] text-sm text-[color:var(--ink)] shadow-[var(--shadow-win)]',
  item: 'relative flex h-9 cursor-default select-none items-center gap-2 rounded-lg px-3 outline-none data-[highlighted]:bg-[var(--page)] data-[state=checked]:font-medium',
}

const menuClasses = {
  trigger: cn(
    'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--hair)] bg-[var(--card)] text-[color:var(--ink2)]',
    'hover:border-[var(--hair-strong)] hover:text-[color:var(--ink)]', ease, ringLight,
  ),
  content: 'z-50 min-w-48 rounded-xl border border-[var(--hair)] bg-[var(--card)] p-1 font-[family-name:var(--font)] text-sm text-[color:var(--ink)] shadow-[var(--shadow-win)]',
  item: 'flex h-9 cursor-default select-none items-center rounded-lg px-3 outline-none data-[highlighted]:bg-[var(--page)] data-[disabled]:text-[color:var(--ink3)]',
}

const modeClasses = {
  root: 'inline-flex h-8 items-center rounded-lg bg-[var(--raised)] p-0.5',
  item: cn(
    'h-7 rounded-md px-3 text-sm text-[color:var(--wtext2)] data-[state=off]:hover:text-[color:var(--wtext)]',
    'data-[state=on]:bg-[var(--wtext)] data-[state=on]:text-[color:var(--win)]', ease, ringDark,
  ),
}

/* ---------- Copy helpers: every word comes from the shared functions or the brief ---------- */

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

/** The index row's small text: "<year> · clock effect +22.4% (+16.4 to +28.4%)". */
function latestLine(r: RegionData) {
  const y = r.latestOk
  if (!y) return 'not enough fires'
  if (y.verdict === 'na') return `${y.year} · not enough fires`
  if (y.verdict === 'noise') return `${y.year} · within noise`
  return `${y.year} · clock effect ${pct(y.gap!)} (${fmtRange(y.lo!, y.hi!)})`
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
  const all = useMemo(() => REGIONS.map((r) => regionData(r.id)), [])
  const [regionId, setRegionId] = useState('br-amazon')
  const d = useMemo(() => all.find((r) => r.id === regionId) ?? regionData(regionId), [all, regionId])
  const [year, setYear] = useState(() => regionData('br-amazon').latestOk?.year ?? 2025)
  const [mode, setMode] = useState<CalendarMode>('anomaly')

  return (
    <div style={TOKENS as unknown as CSSProperties} className="min-h-screen bg-[var(--page)] font-[family-name:var(--font)] text-[color:var(--ink)] antialiased">
      <TopBar regionId={regionId} onRegion={setRegionId} />
      <main>
        <Hero d={d} all={all} year={year} onYear={setYear} onRegion={setRegionId} />
        <RegionsIndex all={all} regionId={regionId} onRegion={setRegionId} />
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

/** The mark: a clock face held at 13:30, the fixed hour every count is anchored to. */
function Mark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="9" style={{ fill: 'var(--ink)' }} />
      <path d="M10 10 L13.5 6.5 M10 10 L10 16" fill="none" strokeWidth="1.75" strokeLinecap="round" style={{ stroke: 'var(--page)' }} />
    </svg>
  )
}

function TopBar({ regionId, onRegion }: { regionId: string; onRegion: (id: string) => void }) {
  return (
    <header className="border-b border-[var(--hair)]">
      <div className={cn(container, 'flex h-16 items-center gap-10')}>
        <a href="#verdict" className={cn('flex shrink-0 items-center gap-2 rounded text-xl font-medium leading-none', ringLight)}>
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
                    className={cn('rounded', ease, ringLight, s.id === 'verdict' ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink2)] hover:text-[color:var(--ink)]')}
                  >
                    {s.label}
                  </a>
                ) : (
                  // sections of the full build that this comp does not contain: listed, not linked
                  <a role="link" aria-disabled="true" className="text-[color:var(--ink2)]">{s.label}</a>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <span className="hidden h-6 shrink-0 items-center rounded border border-[var(--hair)] px-2 text-xs text-[color:var(--ink2)] sm:inline-flex">Mock data</span>
          <RegionSelect value={regionId} onChange={onRegion} classes={selectClasses} />
          <div className="flex lg:hidden"><SectionsMenu classes={menuClasses} /></div>
        </div>
      </div>
    </header>
  )
}

/* ---------- Hero: the two-tone verdict and the product window ---------- */

function Hero({ d, all, year, onYear, onRegion }: {
  d: RegionData; all: RegionData[]; year: number; onYear: (y: number) => void; onRegion: (id: string) => void
}) {
  const [ink, grey] = splitTwoTone(typeset(verdictHeadline(d)))
  const { look, change } = verdictLines(d)
  return (
    <section id="verdict" aria-labelledby="verdict-h" className="pt-12 md:pt-24">
      <div className={container}>
        <div className="grid grid-cols-12 gap-x-6">
          <h1
            id="verdict-h"
            className="col-span-12 text-balance text-[length:var(--fs-40)] font-normal leading-[var(--lh-display)] tracking-[var(--track-40)] md:text-[length:var(--fs-72)] md:tracking-[var(--track-72)] lg:col-span-10"
          >
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

        <Window title={`Clock audit · ${d.name}`} className="mt-12 md:mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_var(--readout-w)] xl:grid-cols-[var(--list-w)_minmax(0,1fr)_var(--readout-w)]">
            <RegionList all={all} regionId={d.id} onRegion={onRegion} />
            <ClockChart d={d} year={year} onYear={onYear} />
            <Readout d={d} year={year} />
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
function Window({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <div role="region" aria-label={title} className={cn('rounded-2xl bg-[var(--win)] text-[color:var(--wtext)] shadow-[var(--shadow-win)]', className)}>
      <div className="flex h-10 items-center justify-between gap-4 rounded-t-2xl border-b border-[var(--whair)] bg-[var(--panel)] px-4 text-xs md:px-6">
        <span className="min-w-0 truncate text-[color:var(--wtext2)]">{title}</span>
        <span className="shrink-0 text-[color:var(--wtext3)]">Mock data</span>
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
              'flex h-9 w-full items-center justify-between gap-3 rounded-lg px-3 text-left',
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

/* ---------- The chart: look time by year, one axis, three lines ---------- */

type DriftRow = RegionData['drift'][number]
const SERIES = [
  { key: 'aqua_lst', name: 'Aqua', color: 'var(--aqua)' },
  { key: 'viirs_lst', name: 'Fixed clock', color: 'var(--fixed)' },
  { key: 'terra_lst', name: 'Terra', color: 'var(--terra)' },
] as const satisfies readonly { key: keyof DriftRow; name: string; color: string }[]

const THUMB = 16 // px; Radix keeps the thumb inside its track, so the track runs half a thumb past the plot each side

function ClockChart({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const [box, W] = useWidth<HTMLDivElement>()
  const rows = d.drift
  const valueText = (y: number) => {
    const r = d.driftAt(y)
    return r ? `${y}: Aqua ${r.aqua_lst}, fixed clock ${r.viirs_lst}, Terra ${r.terra_lst}` : String(y)
  }

  if (!rows.length) {
    return <div className="min-w-0 p-4 text-sm text-[color:var(--wtext2)] md:p-6">{verdictLines(d).look}</div>
  }

  const first = rows[0].year
  const last = rows[rows.length - 1].year
  const yr = Math.min(last, Math.max(first, year))
  const small = W > 0 && W < 560
  const H = small ? 240 : 300
  const M = { t: 12, r: 80, b: 32, l: 44 }
  const plotW = Math.max(0, W - M.l - M.r)

  const times = rows.flatMap((r) => SERIES.map((s) => hm(r[s.key])))
  const lo = Math.min(9.5, Math.floor(Math.min(...times) * 2) / 2)
  const hi = Math.max(14.5, Math.ceil(Math.max(...times) * 2) / 2)
  const x = scaleLinear().domain([first, last]).range([M.l, M.l + plotW])
  const y = scaleLinear().domain([lo, hi]).range([H - M.b, M.t])
  const crisp = (v: number) => Math.round(v) + 0.5

  const hourStep = small ? 2 : 1
  const hours: number[] = []
  for (let h = Math.ceil(lo); h <= Math.floor(hi); h++) if (h % hourStep === 0) hours.push(h)
  const yearStep = plotW >= 480 ? 2 : plotW >= 180 ? 4 : 7
  const ticks = rows.map((r) => r.year).filter((v) => (last - v) % yearStep === 0)

  const path = (k: (typeof SERIES)[number]['key']) =>
    line<DriftRow>().x((r) => x(r.year)).y((r) => y(hm(r[k]))).curve(curveMonotoneX)(rows) ?? ''

  // direct labels at the right ends, kept 16 px apart if two lines finish close together
  const end = rows[rows.length - 1]
  const labels = SERIES.map((s) => ({ name: s.name, at: y(hm(end[s.key])) })).sort((a, b) => a.at - b.at)
  for (let i = 1; i < labels.length; i++) if (labels[i].at - labels[i - 1].at < 16) labels[i].at = labels[i - 1].at + 16

  const sel = d.driftAt(yr)
  const sx = x(yr)

  return (
    <div className="min-w-0 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className="text-sm font-normal text-[color:var(--wtext)]">Look time by year</h2>
        <ul className="flex items-center gap-4 text-xs text-[color:var(--wtext2)]">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span aria-hidden className="block h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      </div>

      <div ref={box} className="mt-4" style={{ height: H }}>
        {W > 0 ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`Look time by year, ${valueText(yr)}`}>
            {hours.map((h) => (
              <g key={h}>
                <line x1={M.l} x2={M.l + plotW} y1={crisp(y(h))} y2={crisp(y(h))} style={{ stroke: 'var(--grid)' }} strokeWidth={1} />
                <text x={M.l - 8} y={y(h)} dy="0.32em" textAnchor="end" fontSize={12} style={{ fill: 'var(--wtext3)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtHM(h)}
                </text>
              </g>
            ))}
            {ticks.map((t) => (
              <text key={t} x={x(t)} y={H - M.b + 20} textAnchor="middle" fontSize={12} style={{ fill: 'var(--wtext3)', fontVariantNumeric: 'tabular-nums' }}>
                {t}
              </text>
            ))}

            <line x1={crisp(sx)} x2={crisp(sx)} y1={M.t} y2={H - M.b} style={{ stroke: 'var(--rule)' }} strokeWidth={1} />

            {SERIES.map((s) => (
              <path key={s.key} d={path(s.key)} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: s.color }} />
            ))}
            {sel
              ? SERIES.map((s) => (
                  <g key={s.key}>
                    <circle cx={sx} cy={y(hm(sel[s.key]))} r={6} style={{ fill: 'var(--win)' }} />
                    <circle cx={sx} cy={y(hm(sel[s.key]))} r={4} style={{ fill: s.color }} />
                  </g>
                ))
              : null}
            {labels.map((l) => (
              <text key={l.name} x={M.l + plotW + 12} y={l.at} dy="0.32em" fontSize={12} style={{ fill: 'var(--wtext2)' }}>
                {l.name}
              </text>
            ))}
          </svg>
        ) : null}
      </div>

      <table className="sr-only">
        <caption>Look time by year</caption>
        <thead>
          <tr><th scope="col">Year</th>{SERIES.map((s) => <th key={s.key} scope="col">{s.name}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}><th scope="row">{r.year}</th>{SERIES.map((s) => <td key={s.key}>{r[s.key]}</td>)}</tr>
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
            thumb: cn('block size-4 cursor-grab rounded-full bg-[var(--wtext)] hover:bg-[var(--thumb-hover)] active:cursor-grabbing', ease, ringDark),
          }}
        />
      </div>
    </div>
  )
}

/* ---------- Readout for the selected year ---------- */

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[color:var(--wtext2)]">{label}</dt>
      <dd className="flex items-center gap-2 tabular-nums text-[color:var(--wtext)]">{children}</dd>
    </div>
  )
}

function Readout({ d, year }: { d: RegionData; year: number }) {
  const first = d.drift[0]?.year ?? year
  const last = d.drift[d.drift.length - 1]?.year ?? year
  const yr = Math.min(last, Math.max(first, year))
  const dr = d.driftAt(yr)
  const audit = d.years.find((y) => y.year === yr)
  const { hc, change } = verdictLines(d)
  return (
    <div className="flex flex-col border-t border-[var(--whair)] p-4 md:p-6 lg:border-l lg:border-t-0">
      <p className="text-[length:var(--fs-32)] leading-9 text-[color:var(--wtext)]">{yr}</p>
      {dr ? (
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <Row label="Aqua looked">
            <span aria-hidden className="block size-2 rounded-full bg-[var(--aqua)]" />
            {dr.aqua_lst}
          </Row>
          <Row label="Fixed clock">{dr.viirs_lst}</Row>
          <Row label="Shift">{fmtShift(minutesBetween(dr.aqua_lst, dr.viirs_lst))}</Row>
        </dl>
      ) : null}

      <div className="mt-6 min-h-28 border-t border-[var(--whair)] pt-6">
        <p className="text-sm text-[color:var(--wtext2)]">Clock effect</p>
        {!audit ? (
          <p className="mt-1 text-sm text-[color:var(--wtext3)]">No audit for this year</p>
        ) : audit.verdict === 'na' ? (
          <>
            <p className="mt-1 text-xl font-medium text-[color:var(--wtext)]">Not enough fires</p>
            <p className="mt-1 text-xs text-[color:var(--wtext3)]">to measure the clock effect</p>
          </>
        ) : (
          <>
            <p className="mt-1 text-xl font-medium text-[color:var(--wtext)]">{pct(audit.gap!)}</p>
            <p className="mt-1 text-pretty text-xs text-[color:var(--wtext3)]">
              <span className="whitespace-nowrap">({fmtRange(audit.lo!, audit.hi!)})</span>
              {' · '}
              {audit.verdict === 'clock' ? 'outside' : 'within'} the {noiseFloor(d)} noise floor
            </p>
          </>
        )}
      </div>

      <div className="mt-6 border-t border-[var(--whair)] pt-6 lg:mt-auto">
        <p className="text-sm text-[color:var(--wtext2)]">{hc.from} → {hc.to}</p>
        {hc.ok ? (
          <dl className="mt-2 flex flex-col gap-2 text-sm">
            <Row label="Official">{pct(hc.official)}</Row>
            <Row label="Fixed clock">{pct(hc.fixed)}</Row>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-[color:var(--wtext)]">{typeset(change)}</p>
        )}
      </div>
    </div>
  )
}

/* ---------- Regions as a giant typographic index ---------- */

function RegionsIndex({ all, regionId, onRegion }: { all: RegionData[]; regionId: string; onRegion: (id: string) => void }) {
  return (
    <section aria-labelledby="regions-h" className="pt-32">
      <div className={container}>
        <h2 id="regions-h" className={heading32}>
          <TwoTone ink="Six regions, one clock," grey=" the latest audit year for each" />
        </h2>
        <ul className="mt-12 border-b border-[var(--hair)]">
          {all.map((r) => {
            const loaded = r.id === regionId
            return (
              <li key={r.id} className="border-t border-[var(--hair)]">
                <button
                  type="button"
                  aria-pressed={loaded}
                  onClick={() => onRegion(r.id)}
                  className={cn('group grid w-full grid-cols-1 rounded-lg py-6 text-left md:grid-cols-12 md:gap-x-6 md:py-8', ringLightInset)}
                >
                  <span
                    className={cn(
                      'text-[length:var(--fs-40)] leading-[var(--lh-display)] tracking-[var(--track-40)] text-[color:var(--ink)] group-hover:text-[color:var(--ink2)]',
                      'md:col-span-9 md:col-start-4 md:row-start-1 md:text-[length:var(--fs-72)] md:tracking-[var(--track-72)]',
                      ease,
                    )}
                  >
                    {r.phrase.short}
                  </span>
                  <span className="mt-2 text-sm text-[color:var(--ink2)] md:col-span-3 md:col-start-1 md:row-start-1 md:mt-0 md:pt-2">
                    {latestLine(r)}
                    {loaded ? <span aria-hidden className="mt-2 block text-xs text-[color:var(--ink3)]">Loaded</span> : null}
                  </span>
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
  return (
    <section id="calendar" aria-labelledby="calendar-h" className="pt-32">
      <div className={container}>
        <h2 id="calendar-h" className={heading32}>
          {f ? (
            <TwoTone ink={`${f.label} sat furthest above its median,`} grey={` ${pct(f.anomaly, 0)} on the fixed clock`} />
          ) : (
            <TwoTone ink="Every month in this range" grey=" sits near its median" />
          )}
        </h2>

        <Window title={`Fire calendar · ${d.name}`} className="mt-12">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[var(--whair)] px-4 py-3 md:px-6">
            <ModeToggle value={mode} onChange={onMode} classes={modeClasses} />
            <span className="text-sm text-[color:var(--wtext2)]">{from} → {to}</span>
            <div role="group" aria-label="Download" className="-mx-2 flex items-center gap-1 sm:ml-auto">
              {(['CSV', 'PNG', 'SVG'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={fmt === 'CSV' ? () => downloadCalendarCsv(d) : undefined}
                  className={cn('inline-flex h-8 items-center rounded-lg px-2 text-sm text-[color:var(--wtext2)] hover:text-[color:var(--wtext)]', ease, ringDark)}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 md:p-6">
            <FireCalendar
              years={grid.years}
              cells={grid.cells}
              maxCount={grid.maxCount}
              mode={mode}
              render="fill"
              cellHeight={small ? 20 : 24}
              monthLabels={small ? 'initial' : 'short'}
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
