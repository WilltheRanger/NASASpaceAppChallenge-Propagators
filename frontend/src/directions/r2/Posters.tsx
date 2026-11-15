// Round 2 · Direction B · Poster series.
// Six regions are one Swiss poster series cut from one 12-column grid; the clock appears as geometry, never as a
// picture. The loaded region's signal colour is the only accent on the page. Every number comes from the mock JSON
// through src/r2/data.ts.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { arc, ticks as niceTicks, type DefaultArcObject } from 'd3'
import { ArrowRight } from 'lucide-react'
import { FireCalendar, CalendarLegend, type CalendarMode } from '@/components/ui/fire-calendar'
import { LeaderboardBars, type LeaderboardBarRow } from '@/components/ui/leaderboard-bars'
import { REGIONS, regionData, verdictHeadline, verdictLines, calendarGrid, calendarFinding, pct, fmtRange, hm, minutesBetween, type RegionData } from '@/r2/data'
import { RegionSelect, YearSlider, ModeToggle } from '@/r2/controls'
import { downloadCalendarCsv, downloadSummary } from '@/r2/download'

// ---------- Tokens ----------

const PAPER = '#F4F4F2'
const INK = '#0F0F0F'
const TOKENS = { '--paper': PAPER, '--card': '#FFFFFF', '--ink': INK, '--ink2': '#484848', '--ink3': '#666666', '--inactive': '#B7B7B7', '--rule': '#DEDEDE' }

/** One signal colour per region, in list order. Geometry uses the pure colour; every swatch carries its region name. */
const SIGNAL: Record<string, string> = {
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
/** The region colour mixed with ink only as far as needed to reach `min` contrast on paper (unchanged when it already does). */
function shade(h: string, min: number) {
  let t = 0
  while (contrast(mixInk(h, t), PAPER) < min && t < 1) t += 0.01
  return mixInk(h, t)
}

/** Typographic apostrophes for display copy built from the data layer. */
const curly = (s: string) => s.replace(/'/g, '’')

const SECTIONS: [string, string][] = [
  ['Verdict', '#verdict'], ['The clock', '#clock'], ['Two clocks', '#two-clocks'], ['Audit', '#audit'],
  ['Calendar', '#calendar'], ['Checks', '#checks'], ['Limits', '#limits'],
]

// ---------- Styles (type scale 12 / 14 / 20 / 32 / 72, 44 for the headline below 1280; weights 400 and 500) ----------

const CSS = `
.pz{--ease:cubic-bezier(0.22,1,0.36,1);font-family:"Host Grotesk",ui-sans-serif,system-ui,sans-serif;font-weight:400;background:var(--paper);color:var(--ink);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;min-height:100svh}
.pz .t12{font-size:12px;line-height:16px}
.pz .t14{font-size:14px;line-height:20px}
.pz .t20{font-size:20px;line-height:28px}
.pz .t32{font-size:32px;line-height:36px;text-wrap:balance}
.pz .head{font-size:44px;line-height:1.02;letter-spacing:-0.03em;font-weight:500;text-wrap:balance}
@media (min-width:1280px){.pz .head{font-size:72px}}
.pz .shell{width:100%;max-width:1440px;margin-inline:auto;padding-inline:16px}
@media (min-width:1024px){
  .pz .shell{padding-inline:32px}
  .pz .col-rule{position:relative}
  .pz .col-rule::before{content:"";position:absolute;top:0;bottom:0;left:-12.5px;width:1px;background:var(--rule)}
}
.pz .fr:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.pz .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;padding:0 20px;font-weight:500;transition:background-color 160ms var(--ease),color 160ms var(--ease)}
.pz .btn-1{background:var(--ink);color:var(--card)}
.pz .btn-1:hover{background:var(--ink2)}
.pz .btn-2{color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.pz .btn-2:hover{background:var(--ink);color:var(--card)}
.pz .row{display:flex;align-items:center;gap:8px;width:100%;height:32px;color:var(--ink2);text-align:left;transition:color 160ms var(--ease)}
.pz .row:hover{color:var(--ink)}
.pz .row[aria-current],.pz .row[data-state="on"]{color:var(--ink);font-weight:500}
.pz .sw{display:inline-block;width:12px;height:12px;flex:none}
.pz .seg{display:inline-flex;box-shadow:inset 0 0 0 1.5px var(--ink)}
.pz .seg-i{height:36px;padding:0 16px;color:var(--ink);transition:background-color 160ms var(--ease),color 160ms var(--ease)}
.pz .seg-i[data-state="on"]{background:var(--ink);color:var(--card)}
.pz .seg-i[data-state="off"]:hover{background:var(--card)}
.pz .lnk{color:var(--ink);text-underline-offset:4px;text-decoration-thickness:1px}
.pz .lnk:hover{text-decoration-line:underline}
.pz .sel{display:inline-flex;align-items:center;gap:8px;height:36px;max-width:100%;padding:0 12px;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)}
.pz .sel > span:not(.sw){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pz-pop{--paper:${PAPER};--ink:${INK};z-index:50;min-width:var(--radix-select-trigger-width);background:#FFFFFF;border:1.5px solid ${INK};font-family:"Host Grotesk",ui-sans-serif,system-ui,sans-serif;color:${INK}}
.pz-pop .pz-opt{display:flex;align-items:center;gap:8px;height:36px;padding:0 12px;font-size:14px;line-height:20px;outline:none;cursor:default}
.pz-pop .pz-opt[data-highlighted]{background:var(--paper)}
.pz-pop .pz-opt[data-state="checked"]{font-weight:500}
.pz-pop .sw{display:inline-block;width:12px;height:12px;flex:none}

/* Leaderboard Bars, restyled flat: Host Grotesk only, 12 and 14 px, weights 400 and 500, sentence case. */
.pz .lb{--vz-mono:"Host Grotesk",ui-sans-serif,sans-serif;--vz-ink:var(--ink);--vz-text3:var(--ink3);--vz-muted:var(--ink3);--vz-bad:var(--ink3);--vz-grid:var(--rule);--vz-zero:var(--ink2);--vz-track:transparent;--vz-band:var(--card);--vz-bar:var(--inactive);--vz-mark-fill:var(--card)}
.pz .lb > div > div{min-width:0 !important}
.pz .lb [style*="grid-template-columns"]{grid-template-columns:96px minmax(0,1fr) !important}
.pz .lb .grid .grid{grid-template-columns:minmax(0,1fr) 56px}
.pz .lb [class~="text-[13px]"]{font-size:14px;line-height:20px;font-weight:400}
.pz .lb [class~="text-[12px]"]{font-size:14px;line-height:20px;font-weight:500}
.pz .lb [class~="text-[10.5px]"],.pz .lb [class~="text-[10px]"]{font-size:12px;line-height:16px;letter-spacing:0;text-transform:none;font-weight:400}
.pz .lb [class~="h-3"]{height:16px}
.pz .lb [class~="space-y-4"] > :not(:last-child){margin-block-end:8px}
.pz .lb [style*="grid-template-columns"]:has(> div:first-child > p + p) > div:first-child{grid-column:1 / -1;display:flex;align-items:baseline;gap:16px}
.pz .lb [style*="grid-template-columns"]:has(> div:first-child > p + p) > div:first-child > p + p{margin-top:0;font-size:14px;line-height:20px}
.pz .lb [style*="grid-template-columns"]:has(> div:first-child > p + p) > div:nth-child(2){display:none}

/* Fire calendar, squares mode: no hue, square corners everywhere. */
.pz .cal{--cal-fg:var(--ink);--cal-muted:var(--ink3);--cal-cell:var(--card);--cal-empty:transparent;--cal-gap:2px;--cal-radius:0;--cal-sq-up:var(--ink);--cal-sq-down:var(--inactive);--cal-sq-mid:var(--inactive);--cal-hatch:rgba(15,15,15,0.35);--cal-focus:var(--signal-ui)}
.pz .cal [class~="rounded-full"]{border-radius:0}
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

  const signal = SIGNAL[region] ?? INK
  const rootStyle = { ...TOKENS, '--signal': signal, '--signal-ui': shade(signal, 3) } as CSSProperties
  const lines = verdictLines(d)
  const grid = useMemo(() => calendarGrid(d, 2002, 2026), [d])
  const finding = useMemo(() => calendarFinding(d, 2002, 2026), [d])
  const calTitle = !finding
    ? 'Every month in this range sits near its median'
    : finding.anomaly > 0 ? `${finding.label} sat furthest above its median, ${pct(finding.anomaly, 0)}` : 'No month in this range sat above its median'
  const firstYear = grid.years[grid.years.length - 1], lastYear = grid.years[0]

  return (
    <div className="pz" style={rootStyle}>
      <style>{CSS}</style>

      {/* Mobile top bar: the region select replaces the region index */}
      <header className="border-b border-[var(--rule)] lg:hidden">
        <div className="shell flex h-15 items-center justify-between gap-4">
          <Wordmark />
          <RegionSelect
            value={region}
            onChange={setRegion}
            classes={{ trigger: 'sel fr t14 min-w-0', content: 'pz-pop', item: 'pz-opt', icon: 'flex-none text-[var(--ink2)]' }}
            swatch={(id) => <span aria-hidden className="sw" style={{ background: SIGNAL[id] }} />}
          />
        </div>
      </header>

      <main>
        <section id="verdict" aria-labelledby="verdict-title" className="lg:flex lg:min-h-svh lg:flex-col">
          <div className="shell pt-12 lg:grid lg:flex-1 lg:grid-cols-12 lg:gap-x-6 lg:pt-8">
            {/* Left, 2 columns: wordmark, section index, region index, data status */}
            <aside className="hidden min-w-0 pb-8 lg:col-span-2 lg:flex lg:flex-col">
              <Wordmark />
              <nav aria-label="Sections" className="mt-12">
                <ul>
                  {SECTIONS.map(([name, href], i) => (
                    <li key={name}>
                      <a href={href} className="row fr t14" aria-current={i === 0 ? 'location' : undefined}>{name}</a>
                    </li>
                  ))}
                </ul>
              </nav>
              <hr className="my-6 border-[var(--rule)]" />
              <ToggleGroup.Root
                type="single"
                orientation="vertical"
                aria-label="Region"
                value={region}
                onValueChange={(v) => { if (v) setRegion(v) }}
                className="flex flex-col"
              >
                {REGIONS.map((r) => (
                  <ToggleGroup.Item key={r.id} value={r.id} className="row fr t14">
                    <span aria-hidden className="sw" style={{ background: SIGNAL[r.id] }} />
                    {r.name}
                  </ToggleGroup.Item>
                ))}
              </ToggleGroup.Root>
              <p className="t12 mt-auto pt-8 text-[var(--ink3)]">Mock data · not for publication</p>
            </aside>

            {/* Centre, 5 columns: verdict, subhead, audit bars, actions */}
            <div className="col-rule flex min-w-0 flex-col lg:col-span-5 lg:pb-8">
              <h1 id="verdict-title" className="head">{curly(verdictHeadline(d))}</h1>
              <p className="t20 mt-6 max-w-xl text-[var(--ink2)]">{curly(`${lines.look} ${lines.change}`)}</p>
              <div className="pt-10 lg:mt-auto">
                <AuditBars d={d} />
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href="#calendar" className="btn btn-1 fr t14">
                    Explore the calendar
                    <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
                  </a>
                  <button type="button" className="btn btn-2 fr t14" onClick={() => downloadSummary(d)}>Download summary</button>
                </div>
              </div>
            </div>

            {/* Right, 5 columns: the arc poster */}
            <div className="col-rule mt-12 flex min-w-0 flex-col lg:col-span-5 lg:mt-0 lg:pb-8">
              <PosterFigure d={d} year={year} onYear={setYear} />
            </div>
          </div>
          <p className="shell t12 mt-8 pb-16 text-[var(--ink3)] lg:hidden">Mock data · not for publication</p>
        </section>

        <section id="calendar" aria-labelledby="calendar-title" className="border-t border-[var(--rule)]">
          {/* On desktop the columns carry the padding, so the column rules run from hairline to hairline */}
          <div className="shell pb-24 pt-16 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:py-0">
            <div className="col-rule min-w-0 lg:col-span-5 lg:col-start-3 lg:py-24">
              <div className="lg:sticky lg:top-8">
                <h2 id="calendar-title" className="t32 font-medium">{curly(calTitle)}</h2>
                <p className="t14 mt-4 max-w-md text-[var(--ink2)]">
                  {mode === 'anomaly'
                    ? 'Each square is a month on the fixed 13:30 clock, sized by how far it sat from the 2002–2025 median for that month'
                    : 'Each square is a month on the fixed 13:30 clock, sized by its fixed-clock hotspot count'}
                </p>
              </div>
            </div>
            <div className="col-rule mt-10 min-w-0 lg:col-span-5 lg:col-start-8 lg:mt-0 lg:py-24">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <ModeToggle value={mode} onChange={setMode} classes={{ root: 'seg', item: 'seg-i fr t14' }} />
                <span className="t14">{firstYear} → {lastYear}</span>
                <div className="flex items-center gap-4 sm:ml-auto">
                  {/* CSV uses the shared download; PNG and SVG are inert in this comp */}
                  {['CSV', 'PNG', 'SVG'].map((f) => (
                    <button key={f} type="button" className="lnk fr t14" aria-label={`Download the calendar as ${f}`} onClick={f === 'CSV' ? () => downloadCalendarCsv(d) : undefined}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="cal mt-6">
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
                <CalendarLegend mode={mode} render="squares" className="mt-6" />
              </div>
              <p className="t12 mt-4 text-[var(--ink3)]">Source: calendar/{d.id}.json · fixed-clock hotspots, VIIRS 375 m in Aqua-equivalent units · MOCK</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--rule)]">
        <div className="shell py-12 lg:grid lg:grid-cols-12 lg:items-baseline lg:gap-x-6">
          <p className="t14 text-[var(--ink2)] lg:col-span-7">Anchor · Team Propagators</p>
          <p className="t12 mt-2 max-w-md text-[var(--ink3)] lg:col-span-5 lg:col-start-8 lg:mt-0">
            Every number comes from the team’s JSON files; this comp uses mock data.
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
    <div id="audit" className="lb">
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

// ---------- Arc poster ----------

type DriftRow = RegionData['drift'][number]
type Pt = readonly [number, number]
type Box = { x0: number; y0: number; x1: number; y1: number }
type LabelMode = 'right' | 'pole' | 'above' | 'below' | 'left'

const QUARTER = Math.PI / 2
const MARGIN_L = 44 // year labels at the 12:00 end
const MARGIN_B = 28 // the 16:00 label under the outer ring's end
const LINE = 16 // one 14 px label line
/** 12:00 points straight up, 16:00 points right; clockwise, 90 degrees in all. */
const angleAt = (lst: string) => Math.max(0, Math.min(1, (hm(lst) - 12) / 4)) * QUARTER
const polar = (r: number, a: number): Pt => [r * Math.sin(a), -r * Math.cos(a)]
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

const arcPath = arc()
const band = (innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) =>
  arcPath({ innerRadius, outerRadius, startAngle, endAngle } satisfies DefaultArcObject) ?? ''

/**
 * Lays out the poster for a container width. Rings: one per drift year, innermost first, inner radius 0.3 R,
 * thickness 62% of the pitch. Labels: hour labels outside the outer ring, the fixed clock labelled at the outer end
 * of its line, and the selected year's label joined to its arc end by a leader, placed at the first spot that
 * clears the rings, the other labels and the fixed-clock line.
 */
function posterLayout(W: number, drift: DriftRow[], year: number) {
  const n = drift.length
  const hourLabels = (R: number, t: number) => [12, 13, 14, 15, 16].map((h) => {
    const text = `${h}:00`, w = textWidth(text, 12, 400), a = ((h - 12) / 4) * QUARTER
    if (h === 16) return { text, box: centred(R - t / 2, 16, w, 12) }
    const half = Math.abs(Math.sin(a)) * (w / 2) + Math.abs(Math.cos(a)) * 6
    const [cx, cy] = polar(R + 10 + half, a)
    return { text, box: centred(cx, cy, w, 12) }
  })
  let R = W - MARGIN_L - 12, rIn = 0, pitch = 0, t = 0
  const size = (r: number) => { rIn = 0.3 * r; pitch = (r - rIn) / (n - 1 + 0.62); t = 0.62 * pitch }
  for (; R > 120; R -= 1) { size(R); if (Math.max(...hourLabels(R, t).map((h) => h.box.x1)) <= W - MARGIN_L - 2) break }
  const MT = Math.max(28, W - R - MARGIN_B)
  const H = MT + R + MARGIN_B
  const lim = { x0: -MARGIN_L + 2, x1: W - MARGIN_L - 2, y0: -(R + MT) + 2, y1: MARGIN_B - 2 }

  const rings = drift.map((row, i) => {
    const later = hm(row.aqua_lst) > hm(row.viirs_lst)
    return {
      year: row.year, aqua: row.aqua_lst, r0: rIn + i * pitch, r1: rIn + i * pitch + t,
      inkEnd: angleAt(later ? row.viirs_lst : row.aqua_lst),
      late: later ? ([angleAt(row.viirs_lst), angleAt(row.aqua_lst)] as const) : null,
    }
  })
  const hours = hourLabels(R, t)
  const yearLabels = (n > 1 ? [rings[0], rings[n - 1]] : [rings[0]]).map((r) => ({ text: String(r.year), x: -8, y: -(r.r0 + t / 2) }))
  const yearBoxes = yearLabels.map((l) => ({ x0: l.x - textWidth(l.text, 12, 400), x1: l.x, y0: l.y - 6, y1: l.y + 6 }))

  const last = drift[n - 1]
  const fixedA = angleAt(last.viirs_lst)
  const fixedFrom = polar(Math.max(0, rIn - 12), fixedA), fixedTo = polar(R + 40, fixedA)
  const fixedText = `Fixed clock ${last.viirs_lst}`
  const fixedBox: Box = { x0: fixedTo[0] + 6, x1: fixedTo[0] + 6 + textWidth(fixedText, 12, 400), y0: fixedTo[1] - 6, y1: fixedTo[1] + 6 }

  const sel = rings.find((r) => r.year === year) ?? rings[n - 1]
  const selA = sel.late ? sel.late[1] : sel.inkEnd
  const edge = polar(sel.r1, selA)
  const one = [`${sel.year} · Aqua ${sel.aqua}`], two = [String(sel.year), `Aqua ${sel.aqua}`]
  const lanes: [LabelMode, number[]][] = [['right', [40, 20, 64]], ['pole', [12, 24, 40]], ['above', [28, 44, 60, 76]], ['below', [28, 44, 60]], ['left', [64, 88, 40]]]
  const others = [...hours.map((h) => h.box), ...yearBoxes, fixedBox]
  let best: { lines: string[]; mode: LabelMode; box: Box; end: Pt; score: number } | null = null
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
        if (!best || score < best.score) best = { lines, mode, box, end, score }
        if (score === 0) break search
      }
    }
  }
  const pick = best!
  return {
    W, H, R, MT, rIn, t, rings, hours, yearLabels, sel,
    fixed: { from: fixedFrom, to: fixedTo, text: fixedText, x: fixedBox.x0, y: fixedTo[1] },
    label: { ...pick, start: polar((sel.r0 + sel.r1) / 2, selA) },
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
  const fixedLst = d.lastDrift?.viirs_lst
  const vsFixed = (lst: string) => {
    const m = minutesBetween(lst, fixedLst!)
    return m === 0 ? 'at the fixed clock' : `${Math.abs(m)} minutes ${m > 0 ? 'after' : 'before'} the fixed clock`
  }
  const valueText = (y: number) => { const r = d.driftAt(y); return `${y}, Aqua looks at ${r.aqua_lst}, ${vsFixed(r.aqua_lst)}` }
  const ink = { fill: 'var(--ink)' }, muted = { fill: 'var(--ink3)' }
  const halo: CSSProperties = { stroke: 'var(--paper)', strokeWidth: 4, strokeLinejoin: 'round', paintOrder: 'stroke' }

  return (
    <figure id="clock" className="w-full max-w-160 lg:mt-auto lg:max-w-none">
      <div ref={wrap} className="w-full min-w-0">
        {geo ? (
          <svg
            width={geo.W}
            height={geo.H}
            viewBox={`0 0 ${geo.W} ${geo.H}`}
            role="img"
            aria-label={`Rings for ${d.drift[0].year} to ${d.lastDrift.year}, one per year. Aqua looked at ${d.drift[0].aqua_lst} in ${d.drift[0].year} and at ${d.lastDrift.aqua_lst} in ${d.lastDrift.year}, ${vsFixed(d.lastDrift.aqua_lst)} at ${fixedLst}. Selected: ${geo.sel.year}, Aqua ${geo.sel.aqua}.`}
            className="block h-auto w-full"
          >
            <g transform={`translate(${MARGIN_L},${geo.MT + geo.R})`}>
              {/* Each ring's full afternoon, 12:00 to 16:00, left unprinted */}
              {geo.rings.map((r) => <path key={`t${r.year}`} d={band(r.r0, r.r1, 0, QUARTER)} style={{ fill: 'var(--card)' }} />)}
              {[1, 2, 3].map((k) => {
                const [a, b] = [polar(geo.rIn, (k * QUARTER) / 4), polar(geo.R, (k * QUARTER) / 4)]
                return <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} style={{ stroke: 'var(--rule)' }} strokeWidth={1} />
              })}
              {/* Ink from solar noon to the fixed clock, colour for the minutes Aqua looked later */}
              {geo.rings.map((r) => <path key={`i${r.year}`} d={band(r.r0, r.r1, 0, r.inkEnd)} style={ink} />)}
              {geo.rings.map((r) => (r.late ? <path key={`c${r.year}`} d={band(r.r0, r.r1, r.late[0], r.late[1])} style={{ fill: 'var(--signal)' }} /> : null))}

              <line x1={geo.fixed.from[0]} y1={geo.fixed.from[1]} x2={geo.fixed.to[0]} y2={geo.fixed.to[1]} style={{ stroke: 'var(--ink)' }} strokeWidth={1} />
              <text x={geo.fixed.x} y={geo.fixed.y} dy="0.35em" className="t12" style={{ ...ink, ...halo }}>{geo.fixed.text}</text>

              {geo.hours.map((h) => (
                <text key={h.text} x={(h.box.x0 + h.box.x1) / 2} y={(h.box.y0 + h.box.y1) / 2} dy="0.35em" textAnchor="middle" className="t12" style={{ ...muted, ...halo }}>{h.text}</text>
              ))}
              {geo.yearLabels.map((l) => (
                <text key={l.text} x={l.x} y={l.y} dy="0.35em" textAnchor="end" className="t12" style={muted}>{l.text}</text>
              ))}

              <line x1={geo.label.start[0]} y1={geo.label.start[1]} x2={geo.label.end[0]} y2={geo.label.end[1]} style={{ stroke: 'var(--ink)' }} strokeWidth={1} />
              {geo.label.lines.map((s, i) => (
                <text
                  key={s}
                  x={geo.label.mode === 'left' ? geo.label.box.x1 : geo.label.box.x0}
                  y={geo.label.box.y0 + LINE / 2 + i * (LINE + 2)}
                  dy="0.35em"
                  textAnchor={geo.label.mode === 'left' ? 'end' : 'start'}
                  className="t14"
                  style={{ ...ink, ...halo, fontWeight: 500 }}
                >
                  {s}
                </text>
              ))}
            </g>
          </svg>
        ) : (
          <div className="flex aspect-square w-full items-end bg-[var(--card)] p-6">
            <p className="t14 max-w-xs text-[var(--ink2)]">Look times for this region are not in the data yet</p>
          </div>
        )}
      </div>

      {geo ? (
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
              range: 'absolute h-full bg-[var(--signal)]',
              thumb: 'fr block size-4 cursor-grab bg-[var(--ink)] active:cursor-grabbing',
            }}
          />
          <span className="t12 text-[var(--ink3)]">{maxYear}</span>
        </div>
      ) : null}

      <figcaption className="t12 mt-4 text-[var(--ink3)]">
        {geo
          ? `Each ring is a year, ${minYear} inside to ${maxYear} outside. Ink runs from solar noon to the fixed clock; colour shows how much later Aqua looked. Source: drift/${d.id}.json · MOCK`
          : `Source: drift/${d.id}.json · MOCK`}
      </figcaption>
    </figure>
  )
}
