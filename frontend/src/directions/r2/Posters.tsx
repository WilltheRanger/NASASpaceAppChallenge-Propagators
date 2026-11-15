// Round 2 · Direction B · Poster series.
// Six regions are one Swiss poster series cut from one 12-column grid; the clock appears as geometry, never as a
// picture. The loaded region's signal colour is the only accent on the page; the region index shows each region's
// own poster in its own colour. Every number comes from the mock JSON through src/r2/data.ts.
// Drafted with AI assistance (Claude) for Team Propagators.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { arc, ticks as niceTicks, type DefaultArcObject } from 'd3'
import { ArrowRight } from 'lucide-react'
import { FireCalendar, CalendarLegend, type CalendarMode } from '@/components/ui/fire-calendar'
import { LeaderboardBars, type LeaderboardBarRow } from '@/components/ui/leaderboard-bars'
import {
  REGIONS, SECTIONS, regionData, verdictHeadline, verdictLines, calendarGrid, calendarFinding,
  pct, fmtRange, fmtShift, hm, minutesBetween, type RegionData,
} from '@/r2/data'
import { RegionSelect, YearSlider, ModeToggle, SectionsMenu } from '@/r2/controls'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'

// ---------- Tokens ----------

const PAPER = '#F4F4F2'
const INK = '#0F0F0F'
const TOKENS = { '--paper': PAPER, '--card': '#FFFFFF', '--ink': INK, '--ink2': '#484848', '--ink3': '#666666', '--inactive': '#B7B7B7', '--rule': '#DEDEDE' }

/** One signal colour per region, in list order (identity). */
const PURE: Record<string, string> = {
  'br-amazon': '#008C45', 'br-cerrado': '#D99A00', 'br-pantanal': '#2457C5',
  'ar-argentina': '#E8742A', 'in-punjab-haryana': '#B3307A', 'us-california': '#14A3A3',
}

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const luminance = (h: string) => {
  const [r, g, b] = rgb(h).map((c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const mixInk = (h: string, t: number) => '#' + rgb(h).map((c, i) => Math.round(c + (rgb(INK)[i] - c) * t).toString(16).padStart(2, '0')).join('')
/** The colour mixed with ink only as far as needed to reach `min` contrast on paper (unchanged when it already does). */
function shade(h: string, min: number) {
  let t = 0
  while (contrast(mixInk(h, t), PAPER) < min && t < 1) t += 0.01
  return mixInk(h, t)
}
/** Signals as drawn: each shaded to at least 3:1 on paper, so arcs, bars and focus rings pass non-text contrast. */
const SIG: Record<string, string> = Object.fromEntries(Object.entries(PURE).map(([id, c]) => [id, shade(c, 3)]))

/** Typographic apostrophes for display copy built from the data layer. */
const curly = (s: string) => s.replace(/'/g, '’')

// ---------- Styles (type scale 12 / 14 / 20 / 32 / 72, 44 for the headline below 1280; weights 400 and 500) ----------

const CSS = `
.pz{--ease:cubic-bezier(0.22,1,0.36,1);font-family:"Host Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:400;background:var(--paper);color:var(--ink);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;min-height:100svh}
.pz .t12{font-size:12px;line-height:16px}
.pz .t14{font-size:14px;line-height:20px}
.pz .t20{font-size:20px;line-height:28px}
.pz .t32{font-size:32px;line-height:36px;text-wrap:balance}
.pz .head{font-size:44px;line-height:1.02;letter-spacing:-0.03em;font-weight:500;text-wrap:balance}
@media (min-width:1280px){
  .pz .head{font-size:72px}
  /* Hanging line: the wordmark's, the headline's and the poster's first cap heights sit on one line (Host Grotesk cap 0.70, ascent 1.02, descent 0.32) */
  .pz .hang-wm{margin-top:4.5px}
  .pz .hang-poster{margin-top:3.7px}
}
.pz .shell{width:100%;max-width:1440px;margin-inline:auto;padding-inline:16px}
.pz .sect-t{border-top:1.5px solid var(--ink)}
.pz .sect-b{border-bottom:1.5px solid var(--ink)}
@media (min-width:1024px){
  .pz .shell{padding-inline:32px}
  .pz .col-rule{position:relative}
  .pz .col-rule::before{content:"";position:absolute;top:0;bottom:0;left:-12.75px;width:1.5px;background:var(--ink)}
}
.pz .fr:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.pz .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;padding:0 20px;font-weight:500;transition:background-color 160ms var(--ease),color 160ms var(--ease)}
.pz .btn-1{background:var(--ink);color:var(--card)}
.pz .btn-1:hover{background:var(--ink2)}
.pz .btn-2{color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.pz .btn-2:hover{background:var(--ink);color:var(--card)}
.pz .row{display:flex;align-items:center;width:100%;height:32px;color:var(--ink2);transition:color 160ms var(--ease)}
.pz a.row:hover{color:var(--ink)}
.pz .row[aria-current]{color:var(--ink);font-weight:500}
.pz .row.mute{color:var(--ink3)}
.pz .reg{display:flex;align-items:center;gap:12px;width:calc(100% + 12px);height:44px;margin-inline:-6px;padding-inline:6px;color:var(--ink2);text-align:left;transition:color 160ms var(--ease),box-shadow 160ms var(--ease)}
.pz .reg:hover{color:var(--ink)}
.pz .reg[data-state="on"]{color:var(--ink);font-weight:500;box-shadow:inset 0 0 0 1.5px var(--ink)}
.pz .sw{display:inline-block;width:12px;height:12px;flex:none}
.pz .seg{display:inline-flex;box-shadow:inset 0 0 0 1.5px var(--ink)}
.pz .seg-i{height:36px;padding:0 16px;color:var(--ink);transition:background-color 160ms var(--ease),color 160ms var(--ease)}
.pz .seg-i[data-state="on"]{background:var(--ink);color:var(--card)}
.pz .seg-i[data-state="off"]:hover{background:var(--card)}
.pz .lnk{color:var(--ink);text-underline-offset:4px;text-decoration-thickness:1px}
.pz .lnk:hover{text-decoration-line:underline}
.pz .sel{display:inline-flex;align-items:center;gap:8px;height:36px;max-width:100%;padding:0 12px;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.pz .sel > span:not(.sw){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pz .icon-btn{display:inline-flex;flex:none;align-items:center;justify-content:center;width:36px;height:36px;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.pz-pop{--paper:${PAPER};z-index:50;min-width:200px;background:#FFFFFF;border:1.5px solid ${INK};font-family:"Host Grotesk",ui-sans-serif,system-ui,sans-serif;color:${INK}}
.pz-pop .pz-opt{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;font-size:14px;line-height:20px;outline:none;cursor:default}
.pz-pop .pz-opt[data-highlighted]{background:var(--paper)}
.pz-pop .pz-opt[data-state="checked"]{font-weight:500}
.pz-pop .pz-opt[data-disabled]{color:#666666}
.pz-pop .sw{display:inline-block;width:12px;height:12px;flex:none}

/* Poster motion: the region colour fades, arcs and the Aqua hand ease to new angles */
.pz .arc{transition:d 320ms var(--ease),fill 200ms var(--ease)}
.pz .hand{transition:d 320ms var(--ease)}
.pz .tag{transition:transform 320ms var(--ease)}

/* Leaderboard Bars, restyled flat and compact: Host Grotesk only, 12 and 14 px, weights 400 and 500, sentence case.
   The component styles itself with inline styles and fixed utility classes, so these overrides target them directly. */
.pz .lb{--vz-mono:"Host Grotesk",ui-sans-serif,sans-serif;--vz-ink:var(--ink);--vz-text3:var(--ink3);--vz-muted:var(--ink3);--vz-bad:var(--ink3);--vz-grid:var(--rule);--vz-zero:var(--ink2);--vz-track:transparent;--vz-band:var(--card);--vz-bar:var(--inactive);--vz-mark-fill:var(--card)}
.pz .lb > div{padding-block:12px}
.pz .lb > div > div{min-width:0 !important}
.pz .lb [style*="grid-template-columns"]{grid-template-columns:96px minmax(0,1fr) !important}
.pz .lb .grid .grid{grid-template-columns:minmax(0,1fr) 56px}
.pz .lb [class~="mt-4"]{margin-top:12px}
.pz .lb [class~="pt-4"]{padding-top:12px}
.pz .lb [class~="h-6"]{height:20px}
.pz .lb [class~="inset-y-[7px]"]{top:5px;bottom:5px}
.pz .lb [style*="background-color"]{transition:background-color 200ms var(--ease)}
.pz .lb [class~="text-[13px]"]{font-size:14px;line-height:20px;font-weight:400}
.pz .lb [class~="text-[12px]"]{font-size:14px;line-height:20px;font-weight:500}
.pz .lb [class~="text-[10.5px]"],.pz .lb [class~="text-[10px]"]{font-size:12px;line-height:16px;letter-spacing:0;text-transform:none;font-weight:400}
.pz .lb [class~="h-3"]{height:16px}
.pz .lb [class~="space-y-4"] > :not(:last-child){margin-block-end:8px}
.pz .lb [style*="grid-template-columns"]:has(> div:first-child > p + p) > div:first-child{grid-column:1 / -1;display:flex;align-items:baseline;gap:16px}
.pz .lb [style*="grid-template-columns"]:has(> div:first-child > p + p) > div:first-child > p + p{margin-top:0;font-size:14px;line-height:20px}
.pz .lb [style*="grid-template-columns"]:has(> div:first-child > p + p) > div:nth-child(2){display:none}

/* Fire calendar, squares mode: no hue, square corners everywhere; legend items never break inside */
.pz .cal{--cal-fg:var(--ink);--cal-muted:var(--ink3);--cal-cell:var(--card);--cal-empty:transparent;--cal-gap:2px;--cal-radius:0;--cal-sq-up:var(--ink);--cal-sq-down:var(--inactive);--cal-sq-mid:var(--inactive);--cal-hatch:rgba(15,15,15,0.35);--cal-focus:var(--signal)}
.pz .cal [class~="rounded-full"]{border-radius:0}
.pz .key span{white-space:nowrap}
.pz .key > div > span{flex-wrap:wrap;row-gap:8px}

@media (prefers-reduced-motion:reduce){.pz *,.pz *::before{transition:none !important}}
`

// ---------- Small hooks ----------

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

function useWidth(ref: RefObject<HTMLElement | null>, initial: number) {
  const [w, setW] = useState(initial)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setW(Math.max(240, Math.floor(el.getBoundingClientRect().width)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

/** Re-measure label boxes once the web font has loaded. */
function useFontsReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { let live = true; document.fonts?.ready.then(() => { if (live) setReady(true) }); return () => { live = false } }, [])
  return ready
}

// ---------- Page ----------

const initialRegion = () => {
  const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('region') : null
  return REGIONS.some((r) => r.id === id) ? id! : 'br-amazon'
}

export default function Posters() {
  const [region, setRegion] = useState(initialRegion)
  const d = useMemo(() => regionData(region), [region])
  const [year, setYear] = useState(() => { const ys = regionData(initialRegion()).years; return ys[ys.length - 1]?.year ?? 2025 })
  const [mode, setMode] = useState<CalendarMode>('anomaly')
  const narrow = useMedia('(max-width: 639px)')

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('region', region)
    window.history.replaceState(null, '', url)
  }, [region])

  const rootStyle = { ...TOKENS, '--signal': SIG[region] ?? INK } as CSSProperties
  const lines = verdictLines(d)
  const grid = useMemo(() => calendarGrid(d, 2002, 2026), [d])
  const finding = useMemo(() => calendarFinding(d, 2002, 2026), [d])
  const calTitle = !finding
    ? 'Every month in this range sits near its median'
    : finding.anomaly > 0 ? `${finding.label} sat furthest above its median, ${pct(finding.anomaly, 0)}` : 'No month in this range sat above its median'
  const firstYear = grid.years[grid.years.length - 1], lastYear = grid.years[0]
  const menu = { trigger: 'icon-btn fr', content: 'pz-pop', item: 'pz-opt' }

  return (
    <div className="pz" style={rootStyle}>
      <style>{CSS}</style>

      {/* Phone top bar: the region select replaces the region index, the menu replaces the section index */}
      <header className="sect-b lg:hidden">
        <div className="shell flex h-15 items-center justify-between gap-3">
          <Wordmark />
          <div className="flex min-w-0 items-center gap-2">
            <RegionSelect
              value={region}
              onChange={setRegion}
              classes={{ trigger: 'sel fr t14 min-w-0', content: 'pz-pop', item: 'pz-opt', icon: 'flex-none text-[var(--ink2)]' }}
              swatch={(id) => <span aria-hidden className="sw" style={{ background: SIG[id] }} />}
            />
            <SectionsMenu classes={menu} />
          </div>
        </div>
      </header>

      <main>
        <section id="verdict" aria-labelledby="verdict-title" className="lg:flex lg:min-h-svh lg:flex-col">
          <div className="shell pt-12 lg:grid lg:flex-1 lg:grid-cols-12 lg:gap-x-6 lg:pt-8">
            {/* Left, 2 columns: wordmark, section index, region index, data status */}
            <aside className="hidden min-w-0 pb-8 lg:col-span-2 lg:flex lg:flex-col">
              <div className="hang-wm"><Wordmark /></div>
              <nav aria-label="Sections" className="mt-12">
                <ul>
                  {SECTIONS.map((s) => (
                    <li key={s.id}>
                      {s.inComp ? (
                        <a href={`#${s.id}`} className="row fr t14" aria-current={s.id === 'verdict' ? 'location' : undefined}>{s.label}</a>
                      ) : (
                        <span className="row mute t14">{s.label}<span className="sr-only">, in the full build</span></span>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
              <hr className="my-6 border-[var(--ink)]" />
              <ToggleGroup.Root
                type="single"
                orientation="vertical"
                aria-label="Region"
                value={region}
                onValueChange={(v) => { if (v) setRegion(v) }}
                className="flex flex-col"
              >
                {REGIONS.map((r) => (
                  <ToggleGroup.Item key={r.id} value={r.id} className="reg fr t14">
                    <RegionThumb id={r.id} />
                    {r.name}
                  </ToggleGroup.Item>
                ))}
              </ToggleGroup.Root>
              <p className="t12 mt-auto pt-8 text-[var(--ink3)]">Mock data · not for publication</p>
            </aside>

            {/* Centre, 5 columns: verdict, subhead, audit bars, actions on the foot line */}
            <div className="col-rule flex min-w-0 flex-col lg:col-span-5 lg:pb-8">
              <h1 id="verdict-title" className="head">{curly(verdictHeadline(d))}</h1>
              <p className="t20 mt-6 max-w-xl text-[var(--ink2)]">{curly(`${lines.look} ${lines.change}`)}</p>
              <AuditBars d={d} />
              {lines.why ? <p className="t14 mt-3 max-w-xl text-[var(--ink2)]">{curly(lines.why)}</p> : null}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-auto lg:pt-6">
                <a href="#calendar" className="btn btn-1 fr t14">
                  Explore the calendar
                  <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
                </a>
                <button type="button" className="btn btn-2 fr t14" onClick={() => downloadSummary(d)}>Download summary</button>
              </div>
            </div>

            {/* Right, 5 columns: the arc poster, hung from the headline's cap line */}
            <div className="col-rule mt-12 flex min-w-0 flex-col lg:col-span-5 lg:mt-0 lg:pb-8">
              <PosterFigure d={d} year={year} onYear={setYear} />
            </div>
          </div>
          <p className="shell t12 mt-8 pb-16 text-[var(--ink3)] lg:hidden">Mock data · not for publication</p>
        </section>

        <section id="calendar" aria-labelledby="calendar-title" className="sect-t">
          {/* On desktop the columns carry the padding, so the column rules run from section rule to section rule */}
          <div className="shell pb-24 pt-16 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:py-0">
            <div className="col-rule min-w-0 lg:col-span-5 lg:col-start-3 lg:py-24">
              <div className="lg:sticky lg:top-8">
                <h2 id="calendar-title" className="t32 font-medium">{curly(calTitle)}</h2>
                <p className="t14 mt-4 max-w-md text-[var(--ink2)]">
                  {mode === 'anomaly'
                    ? 'Each square is a month on the fixed 13:30 clock, sized by how far it sat from the 2002–2025 median for that month'
                    : 'Each square is a month on the fixed 13:30 clock, sized by its fixed-clock hotspot count'}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <ModeToggle value={mode} onChange={setMode} classes={{ root: 'seg', item: 'seg-i fr t14' }} />
                  <span className="t14">{firstYear} → {lastYear}</span>
                  <button type="button" className="lnk fr t14" aria-label="Download the calendar as CSV" onClick={() => downloadCalendarCsv(d)}>CSV</button>
                </div>
                <CalendarKey id={d.id} mode={mode} className="mt-10 hidden lg:block" />
              </div>
            </div>
            <div className="col-rule mt-10 min-w-0 lg:col-span-5 lg:col-start-8 lg:mt-0 lg:py-24">
              <div className="cal">
                <FireCalendar
                  years={grid.years}
                  cells={grid.cells}
                  maxCount={grid.maxCount}
                  mode={mode}
                  render="squares"
                  monthLabels={narrow ? 'initial' : 'short'}
                  cellHeight={narrow ? 20 : 24}
                  label={`Monthly fire calendar for ${d.name}, ${firstYear} to ${lastYear}, ${mode === 'anomaly' ? 'distance from the monthly median' : 'fixed-clock hotspot count'}`}
                />
              </div>
              <CalendarKey id={d.id} mode={mode} className="mt-6 lg:hidden" />
            </div>
          </div>
        </section>
      </main>

      <footer className="sect-t">
        <div className="shell py-12 lg:grid lg:grid-cols-12 lg:items-baseline lg:gap-x-6">
          <p className="t14 text-[var(--ink2)] lg:col-span-7">Anchor · Team Propagators</p>
          <p className="t12 mt-2 max-w-md text-[var(--ink3)] lg:col-span-5 lg:col-start-8 lg:mt-0">
            Designed and coded with AI assistance (Claude). Every number comes from the team’s JSON files; this comp uses mock data.
          </p>
        </div>
      </footer>
    </div>
  )
}

// ---------- Wordmark ----------

function Wordmark() {
  return (
    <a href="#verdict" className="fr t20 inline-flex items-center gap-2 self-start font-medium text-[var(--ink)]">
      <Mark />
      Anchor
    </a>
  )
}

/** A quarter arc (the clock, pivot at bottom left as on the poster) and a bar (the audit). Flat ink. */
function Mark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className="flex-none">
      <path d="M0 6A14 14 0 0 1 14 20H8A8 8 0 0 0 0 12Z" style={{ fill: 'currentColor' }} />
      <rect x="16" y="0" width="4" height="20" style={{ fill: 'currentColor' }} />
    </svg>
  )
}

// ---------- Calendar key ----------

function CalendarKey({ id, mode, className }: { id: string; mode: CalendarMode; className?: string }) {
  return (
    <div className={className}>
      <div className="cal key"><CalendarLegend mode={mode} render="squares" /></div>
      <p className="t12 mt-4 text-[var(--ink3)]">Source: calendar/{id}.json · fixed-clock hotspots, VIIRS 375 m in Aqua-equivalent units · MOCK</p>
    </div>
  )
}

// ---------- Audit bars ----------

function AuditBars({ d }: { d: RegionData }) {
  const { rows, min, max, ticks } = useMemo(() => {
    const rows: LeaderboardBarRow[] = d.years.map((y) => y.verdict === 'na'
      ? { label: String(y.year), sub: 'Not enough fires to measure', offside: true }
      : { label: String(y.year), value: y.gap!, lo: y.lo!, hi: y.hi!, color: y.verdict === 'clock' ? 'var(--signal)' : 'var(--inactive)', valueLabel: pct(y.gap!, 1) })
    const lows = d.years.flatMap((y) => (y.lo == null ? [] : [y.lo]))
    const highs = d.years.flatMap((y) => (y.hi == null ? [] : [y.hi]))
    const min = Math.min(-10, Math.floor(Math.min(0, ...lows) / 10) * 10)
    const max = Math.max(10, Math.ceil(Math.max(0, ...highs) / 10) * 10)
    return { rows, min, max, ticks: niceTicks(min, max, 4).filter((t) => t >= 0) }
  }, [d])
  const noise = Math.round(d.noise)
  return (
    <div id="audit" className="lb mt-6">
      <LeaderboardBars
        rows={rows}
        rowLabel="Year"
        barLabel="Clock effect and range, % of the fixed-clock count"
        min={min}
        max={max}
        ticks={ticks}
        unit="%"
        band={[-noise, noise]}
        bandLabel={`Noise floor ±${noise}%`}
      />
      <div className="sr-only">
        <table>
          <caption>Clock effect by year for {d.name}</caption>
          <thead><tr><th scope="col">Year</th><th scope="col">Clock effect</th><th scope="col">Range</th><th scope="col">Reading</th></tr></thead>
          <tbody>
            {d.years.map((y) => (
              <tr key={y.year}>
                <th scope="row">{y.year}</th>
                <td>{y.gap == null ? 'Not enough fires to measure' : pct(y.gap, 1)}</td>
                <td>{y.lo == null || y.hi == null ? '–' : fmtRange(y.lo, y.hi)}</td>
                <td>{y.verdict === 'clock' ? 'Beyond the noise floor' : y.verdict === 'noise' ? `Within the ±${noise}% noise floor` : 'Not measured'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------- Rings (shared by the poster and the index thumbnails) ----------

type DriftRow = RegionData['drift'][number]
type Pt = readonly [number, number]
type Seg = readonly [number, number]
type Box = { x0: number; y0: number; x1: number; y1: number }
type LabelMode = 'right' | 'pole' | 'above' | 'below' | 'left'

const QUARTER = Math.PI / 2
/** 12:00 points straight up, 16:00 points right; clockwise, 90 degrees in all. */
const angleAt = (lst: string) => Math.max(0, Math.min(1, (hm(lst) - 12) / 4)) * QUARTER
const polar = (r: number, a: number): Pt => [r * Math.sin(a), -r * Math.cos(a)]
const r2 = (v: number) => Math.round(v * 100) / 100

/**
 * One ring per drift year, innermost first, inner radius 0.3 R, thickness `k` of the pitch. Each ring is split at
 * the earlier of the two clocks: noon to that clock is the quiet base; Aqua before the fixed clock is the early gap
 * (ink); Aqua after it is the drift (signal colour).
 */
function ringBands(drift: DriftRow[], R: number, k: number) {
  const n = drift.length, rIn = 0.3 * R
  const pitch = (R - rIn) / (n - 1 + k), t = k * pitch
  const rings = drift.map((row, i) => {
    const a = hm(row.aqua_lst), v = hm(row.viirs_lst)
    return {
      year: row.year, aqua: row.aqua_lst, r0: rIn + i * pitch, r1: rIn + i * pitch + t,
      base: angleAt(a < v ? row.aqua_lst : row.viirs_lst),
      early: a < v ? ([angleAt(row.aqua_lst), angleAt(row.viirs_lst)] as Seg) : null,
      late: a > v ? ([angleAt(row.viirs_lst), angleAt(row.aqua_lst)] as Seg) : null,
    }
  })
  return { rings, rIn, pitch, t }
}

const arcPath = arc()
const band = (innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
  const p = arcPath({ innerRadius, outerRadius, startAngle, endAngle } satisfies DefaultArcObject) ?? ''
  return p.replace(/-?\d+\.?\d*(e-?\d+)?/g, (m) => String(r2(Number(m))))
}
/** A path drawn through the CSS `d` property too, so Chromium can ease it when the data changes. */
const pathStyle = (p: string, extra: CSSProperties) => ({ ...extra, d: `path("${p}")` }) as CSSProperties

/** The region's own poster, small: its rings in its own signal colour (no gaps at this size). */
const THUMB_DRIFT: Record<string, DriftRow[]> = Object.fromEntries(REGIONS.map((r) => [r.id, regionData(r.id).drift]))
function RegionThumb({ id }: { id: string }) {
  const S = 32
  const drift = THUMB_DRIFT[id] ?? []
  if (!drift.length) return <span aria-hidden className="block size-8 flex-none bg-[var(--card)]" />
  const { rings } = ringBands(drift, S, 1)
  const colour = SIG[id]
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} aria-hidden className="flex-none">
      <g transform={`translate(0,${S})`}>
        {rings.map((r) => (
          <g key={r.year}>
            <path d={band(r.r0, r.r1, 0, QUARTER)} style={{ fill: 'var(--card)' }} />
            <path d={band(r.r0, r.r1, 0, r.base)} style={{ fill: 'var(--inactive)' }} />
            {r.early ? <path d={band(r.r0, r.r1, r.early[0], r.early[1])} style={{ fill: 'var(--ink)' }} /> : null}
            {r.late ? <path d={band(r.r0, r.r1, r.late[0], r.late[1])} style={{ fill: colour }} /> : null}
          </g>
        ))}
      </g>
    </svg>
  )
}

// ---------- Arc poster ----------

const MARGIN_L = 44 // year labels at the 12:00 end
const MARGIN_B = 28 // the 16:00 label under the outer ring's end
const RING_K = 0.86 // ring thickness as a share of the pitch
const LINE = 16 // one 14 px label line
const grow = (b: Box, p: number): Box => ({ x0: b.x0 - p, y0: b.y0 - p, x1: b.x1 + p, y1: b.y1 + p })
const meets = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
const centred = (cx: number, cy: number, w: number, h: number): Box => ({ x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 })
/** Distance from the pivot to the nearest point of a box. */
const reach = (b: Box) => Math.hypot(Math.min(Math.max(0, b.x0), b.x1), Math.min(Math.max(0, b.y0), b.y1))
function crosses(a: Pt, b: Pt, box: Box) {
  const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2))
  for (let i = 0; i <= n; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n
    if (x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1) return true
  }
  return false
}

let measureCtx: CanvasRenderingContext2D | null | undefined
function textWidth(s: string, size: number, weight: number) {
  if (measureCtx === undefined) measureCtx = document.createElement('canvas').getContext('2d')
  if (!measureCtx) return s.length * size * 0.56
  measureCtx.font = `${weight} ${size}px "Host Grotesk", sans-serif`
  return measureCtx.measureText(s).width
}

/**
 * Lays out the poster for a container width: rings, hour labels outside the outer ring, the fixed clock labelled at
 * the outer end of its line, and the selected year's label joined to its arc end by a leader, placed at the first
 * spot that clears the rings, the other labels and the fixed-clock line.
 */
function posterLayout(W: number, drift: DriftRow[], year: number) {
  const n = drift.length
  const thickness = (R: number) => (RING_K * (R - 0.3 * R)) / (n - 1 + RING_K)
  const hourLabels = (R: number, t: number) => [12, 13, 14, 15, 16].map((h) => {
    const text = `${h}:00`, w = textWidth(text, 12, 400), a = ((h - 12) / 4) * QUARTER
    if (h === 16) return { text, box: centred(R - t / 2, 16, w, 12) }
    const half = Math.abs(Math.sin(a)) * (w / 2) + Math.abs(Math.cos(a)) * 6
    const [cx, cy] = polar(R + 10 + half, a)
    return { text, box: centred(cx, cy, w, 12) }
  })
  let R = W - MARGIN_L - 12
  for (; R > 120; R -= 1) if (Math.max(...hourLabels(R, thickness(R)).map((h) => h.box.x1)) <= W - MARGIN_L - 2) break
  const { rings, rIn, t } = ringBands(drift, R, RING_K)
  const MT = Math.max(28, W - R - MARGIN_B)
  const H = MT + R + MARGIN_B
  const lim = { x0: -MARGIN_L + 2, x1: W - MARGIN_L - 2, y0: -(R + MT) + 2, y1: MARGIN_B - 2 }

  const hours = hourLabels(R, t)
  const yearLabels = (n > 1 ? [rings[0], rings[n - 1]] : [rings[0]]).map((r) => ({ text: String(r.year), x: -8, y: -(r.r0 + t / 2) }))
  const yearBoxes = yearLabels.map((l) => ({ x0: l.x - textWidth(l.text, 12, 400), x1: l.x, y0: l.y - 6, y1: l.y + 6 }))

  const last = drift[n - 1]
  const fixedA = angleAt(last.viirs_lst)
  const fixedFrom = polar(Math.max(0, rIn - 12), fixedA), fixedTo = polar(R + 40, fixedA)
  const fixedText = `Fixed clock ${last.viirs_lst}`
  const fixedBox: Box = { x0: fixedTo[0] + 6, x1: fixedTo[0] + 6 + textWidth(fixedText, 12, 400), y0: fixedTo[1] - 6, y1: fixedTo[1] + 6 }

  const sel = rings.find((r) => r.year === year) ?? rings[n - 1]
  const selA = angleAt(sel.aqua)
  const edge = polar(sel.r1, selA)
  const one = [`${sel.year} · Aqua ${sel.aqua}`], two = [String(sel.year), `Aqua ${sel.aqua}`]
  const lanes: [LabelMode, number[]][] = [['right', [40, 20, 64]], ['pole', [12, 24, 40]], ['above', [28, 44, 60, 76]], ['below', [28, 44, 60]], ['left', [64, 88, 40]]]
  const others = [...hours.map((h) => h.box), ...yearBoxes, fixedBox]
  let best: { lines: string[]; box: Box; end: Pt; score: number } | null = null
  search: for (const lines of [one, two]) {
    const w = Math.max(...lines.map((s) => textWidth(s, 14, 500)))
    const h = lines.length * LINE + (lines.length - 1) * 2
    for (const [mode, values] of lanes) {
      for (const v of values) {
        let box: Box, end: Pt
        if (mode === 'pole') {
          const x0 = Math.max(lim.x0, Math.min(edge[0] - 8, lim.x1 - w))
          const top = x0 < R ? -Math.sqrt(R * R - Math.max(0, x0) ** 2) : 0
          box = { x0, x1: x0 + w, y0: top - v - h, y1: top - v }
          end = [edge[0], box.y1 + 3]
        } else {
          end = polar(R + v, selA)
          if (mode === 'right') box = { x0: end[0] + 6, x1: end[0] + 6 + w, y0: end[1] - h / 2, y1: end[1] + h / 2 }
          else if (mode === 'left') box = { x0: end[0] - 6 - w, x1: end[0] - 6, y0: end[1] - h / 2, y1: end[1] + h / 2 }
          else {
            const x0 = Math.min(end[0] - 8, lim.x1 - w)
            box = mode === 'above' ? { x0, x1: x0 + w, y0: end[1] - 4 - h, y1: end[1] - 4 } : { x0, x1: x0 + w, y0: end[1] + 4, y1: end[1] + 4 + h }
          }
        }
        let score = 0
        if (box.x0 < lim.x0 || box.x1 > lim.x1 || box.y0 < lim.y0 || box.y1 > lim.y1) score += 10
        if (reach(box) < R + 6) score += 10
        for (const o of others) if (meets(grow(box, 4), o)) score += 10
        if (crosses(fixedFrom, fixedTo, grow(box, 4))) score += 10
        for (const o of [...hours.map((x) => x.box), fixedBox]) if (crosses(edge, end, grow(o, 4))) score += 1
        if (!best || score < best.score) best = { lines, box, end, score }
        if (score === 0) break search
      }
    }
  }
  return {
    W, H, R, MT, rIn, t, rings, hours, yearLabels, sel,
    fixed: { from: fixedFrom, to: fixedTo, text: fixedText, x: fixedBox.x0, y: fixedTo[1] },
    label: { ...best!, start: polar((sel.r0 + sel.r1) / 2, selA) },
  }
}

function PosterFigure({ d, year, onYear }: { d: RegionData; year: number; onYear: (y: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const W = useWidth(wrap, 559)
  const fontsReady = useFontsReady()
  const years = d.drift.map((r) => r.year)
  const minYear = years.length ? Math.min(...years) : year, maxYear = years.length ? Math.max(...years) : year
  const shown = Math.max(minYear, Math.min(maxYear, year))
  // fontsReady is a dependency so the label boxes are measured again with the loaded font
  const geo = useMemo(() => (d.drift.length ? posterLayout(W, d.drift, shown) : null), [W, d.drift, shown, fontsReady])
  /** Years whose calendar months are flagged provisional are hatched, as in the calendar. */
  const provisional = useMemo(() => new Set(d.cal.filter((c) => c.flags.includes('provisional')).map((c) => Number(c.ym.slice(0, 4)))), [d])
  const hatched = geo ? geo.rings.filter((r) => provisional.has(r.year)) : []
  const fixedLst = d.lastDrift?.viirs_lst
  const vsFixed = (lst: string) => {
    const m = minutesBetween(lst, fixedLst!)
    return m === 0 ? 'at the fixed clock' : `${Math.abs(m)} minutes ${m > 0 ? 'after' : 'before'} the fixed clock`
  }
  const valueText = (y: number) => { const r = d.driftAt(y); return `${y}, Aqua looks at ${r.aqua_lst}, ${vsFixed(r.aqua_lst)}` }
  const selRow = d.driftAt(shown)
  const shift = selRow && fixedLst ? minutesBetween(selRow.aqua_lst, fixedLst) : 0
  const halo: CSSProperties = { stroke: 'var(--paper)', strokeWidth: 4, strokeLinejoin: 'round', paintOrder: 'stroke' }

  return (
    <figure id="clock" className="flex w-full max-w-160 flex-col lg:max-w-none lg:flex-1">
      <div ref={wrap} className="hang-poster w-full min-w-0">
        {geo ? (
          <svg
            width={geo.W}
            height={geo.H}
            viewBox={`0 0 ${geo.W} ${geo.H}`}
            role="img"
            aria-label={`Rings for ${d.drift[0].year} to ${d.lastDrift.year}, one per year. Aqua looked at ${d.drift[0].aqua_lst} in ${d.drift[0].year}, ${vsFixed(d.drift[0].aqua_lst)}, and at ${d.lastDrift.aqua_lst} in ${d.lastDrift.year}, ${vsFixed(d.lastDrift.aqua_lst)} at ${fixedLst}. Selected: ${geo.sel.year}, Aqua ${geo.sel.aqua}.`}
            className="block h-auto w-full"
          >
            <defs>
              <pattern id="pz-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="1" height="4" style={{ fill: 'rgba(15,15,15,0.35)' }} />
              </pattern>
            </defs>
            <g transform={`translate(${MARGIN_L},${geo.MT + geo.R})`}>
              {/* Each ring's full afternoon, 12:00 to 16:00, left unprinted, with faint hour divisions */}
              {geo.rings.map((r) => <path key={`t${r.year}`} d={band(r.r0, r.r1, 0, QUARTER)} style={{ fill: 'var(--card)' }} />)}
              {[1, 2, 3].map((k) => {
                const [a, b] = [polar(geo.rIn, (k * QUARTER) / 4), polar(geo.R, (k * QUARTER) / 4)]
                return <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={{ stroke: 'var(--rule)' }} strokeWidth={1} />
              })}
              {/* Quiet base to the earlier clock; ink where Aqua looked earlier; the drift as the solid colour mass */}
              {geo.rings.map((r) => {
                const p = band(r.r0, r.r1, 0, r.base)
                return <path key={`b${r.year}`} className="arc" d={p} style={pathStyle(p, { fill: 'var(--inactive)' })} />
              })}
              {geo.rings.map((r) => {
                if (!r.early) return null
                const p = band(r.r0, r.r1, r.early[0], r.early[1])
                return <path key={`e${r.year}`} className="arc" d={p} style={pathStyle(p, { fill: 'var(--ink)' })} />
              })}
              {geo.rings.map((r) => {
                if (!r.late) return null
                const p = band(r.r0, r.r1, r.late[0], r.late[1])
                return <path key={`c${r.year}`} className="arc" d={p} style={pathStyle(p, { fill: 'var(--signal)' })} />
              })}
              {hatched.map((r) => <path key={`h${r.year}`} d={band(r.r0, r.r1, 0, QUARTER)} style={{ fill: 'url(#pz-hatch)' }} />)}

              <line x1={geo.fixed.from[0]} y1={geo.fixed.from[1]} x2={geo.fixed.to[0]} y2={geo.fixed.to[1]} style={{ stroke: 'var(--ink)' }} strokeWidth={1.5} />
              <text x={geo.fixed.x} y={geo.fixed.y} dy="0.35em" className="t12" style={{ fill: 'var(--ink)', ...halo }}>{geo.fixed.text}</text>

              {geo.hours.map((h) => (
                <text key={h.text} x={(h.box.x0 + h.box.x1) / 2} y={(h.box.y0 + h.box.y1) / 2} dy="0.35em" textAnchor="middle" className="t12" style={{ fill: 'var(--ink3)', ...halo }}>{h.text}</text>
              ))}
              {geo.yearLabels.map((l) => (
                <text key={l.text} x={l.x} y={l.y} dy="0.35em" textAnchor="end" className="t12" style={{ fill: 'var(--ink3)' }}>{l.text}</text>
              ))}

              {/* The Aqua hand for the selected year: eases to its new arc end when the year changes */}
              {(() => {
                const { start: s, end: e } = geo.label
                const p = `M ${r2(s[0])} ${r2(s[1])} L ${r2(e[0])} ${r2(e[1])}`
                return <path className="hand" d={p} style={pathStyle(p, { stroke: 'var(--ink)', fill: 'none' })} strokeWidth={1} />
              })()}
              <g className="tag" style={{ transform: `translate(${r2(geo.label.box.x0)}px, ${r2(geo.label.box.y0)}px)` }}>
                {geo.label.lines.map((s, i) => (
                  <text key={s} x={0} y={LINE / 2 + i * (LINE + 2)} dy="0.35em" className="t14" style={{ fill: 'var(--ink)', ...halo, fontWeight: 500 }}>{s}</text>
                ))}
              </g>
            </g>
          </svg>
        ) : (
          <div className="flex aspect-square w-full items-end bg-[var(--card)] p-6">
            <p className="t14 max-w-xs text-[var(--ink2)]">Look times for this region are not in the data yet</p>
          </div>
        )}
      </div>

      {geo ? (
        <>
          <div className="mt-6 flex items-center gap-3">
            <span className="t12 text-[var(--ink3)]">{minYear}</span>
            <YearSlider
              value={shown}
              onChange={onYear}
              min={minYear}
              max={maxYear}
              valueText={valueText}
              classes={{
                root: 'relative flex h-6 min-w-0 flex-1 touch-none select-none items-center',
                track: 'relative h-0.5 grow bg-[var(--ink)]',
                thumb: 'fr block size-4 cursor-grab bg-[var(--ink)] active:cursor-grabbing',
              }}
            />
            <span className="t12 text-[var(--ink3)]">{maxYear}</span>
          </div>
          {/* Look-time readout for the selected year */}
          <dl className="t14 mt-6 border-y border-[var(--ink)]">
            <div className="flex h-8 items-center justify-between">
              <dt className="text-[var(--ink2)]">Fixed clock</dt><dd>{fixedLst}</dd>
            </div>
            <div className="flex h-8 items-center justify-between border-t border-[var(--rule)]">
              <dt className="text-[var(--ink2)]">Aqua in {shown}</dt><dd>{selRow.aqua_lst}</dd>
            </div>
            <div className="flex h-8 items-center justify-between border-t border-[var(--rule)]">
              <dt className="text-[var(--ink2)]">Aqua vs. the fixed clock</dt><dd>{shift === 0 ? '0 min' : fmtShift(shift)}</dd>
            </div>
          </dl>
        </>
      ) : null}

      <figcaption className="t12 mt-6 text-[var(--ink3)] lg:mt-auto lg:pt-6">
        {geo
          ? `Each ring is a year, ${minYear} inside to ${maxYear} outside. Grey runs from solar noon to whichever clock came first; colour shows how much later Aqua looked than the fixed clock, ink how much earlier.${hatched.length ? ` Hatched: provisional (${hatched.map((r) => r.year).join(', ')}).` : ''} Source: drift/${d.id}.json · MOCK`
          : `Source: drift/${d.id}.json · MOCK`}
      </figcaption>
    </figure>
  )
}
