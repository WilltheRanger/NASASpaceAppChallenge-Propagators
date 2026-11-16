/**
 * Fire calendar (Round 2) — adapted from 21st.dev "Returns Calendar" by ssychui
 * (https://21st.dev/@ssychui/components/returns-calendar, part of ssych ui).
 *
 * Kept from the original: a years × months grid with a year-total column and a readout line that names the
 * month under the pointer or keyboard focus.
 * Changed for Anchor: cells hold the fixed-clock count or its anomaly vs. the median of that calendar month;
 * three render modes (stepped colour fill, squares sized by magnitude, toned zones) driven only by CSS variables
 * from each direction's tokens; `null` months read as "no data", never zero; provisional months are hatched and
 * outage months carry a mark; one tab stop with arrow-key navigation; no load animation; 12 px minimum text.
 */
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { MONTHS, fmtInt, type CalendarCell } from '@/r2/data'

export type CalendarMode = 'anomaly' | 'count'
export type CalendarRender = 'fill' | 'squares'

export interface FireCalendarProps {
  years: number[]
  cells: (CalendarCell | null)[][]
  mode: CalendarMode
  render?: CalendarRender
  maxCount: number
  /** row height in px (cells are as wide as the column allows) */
  cellHeight?: number
  /** name of the grid for assistive tech */
  label: string
  /** short month labels (Jan) or initials (J) */
  monthLabels?: 'short' | 'initial'
  /** called with the month under the pointer or keyboard focus (null when the pointer leaves) */
  onShow?: (cell: { year: number; month: number } | null) => void
  /** ring one month (e.g. the month a heading names); month is 0-based */
  highlight?: { year: number; month: number } | null
  /** months to mark in the header (0-based), e.g. the fire season: underlined, in the brighter ink */
  season?: number[]
  className?: string
}

// Anomaly bins (|%| vs median): within ±5 is the neutral midpoint, then five steps per arm.
const ANOM_STEPS = [5, 15, 30, 50, 80]
const step = (a: number) => { let s = 0; for (const t of ANOM_STEPS) if (Math.abs(a) > t) s++; return s }

/** a month too quiet to compare: its typical value is under 5% of the busiest month's */
const tooFew = (cell: CalendarCell, maxMedian: number) => cell.median != null && maxMedian > 0 && cell.median < 0.05 * maxMedian

function fill(cell: CalendarCell, mode: CalendarMode, maxCount: number, maxMedian = 0) {
  if (mode === 'count') {
    // square-root scale, so quieter years and months stay distinguishable
    const k = Math.sqrt(Math.min(1, Math.max(0, cell.fixed ?? 0) / Math.max(1, maxCount)))
    return `var(--cal-seq-${Math.min(6, Math.max(1, Math.ceil(k * 6)))})`
  }
  if (tooFew(cell, maxMedian)) return 'var(--cal-mid)'
  const a = cell.anomaly ?? 0
  const s = step(a)
  return s === 0 ? 'var(--cal-mid)' : `var(--cal-${a > 0 ? 'up' : 'down'}-${s})`
}

const signed0 = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(0)}%`

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/** three significant figures: 6,748 -> 6,750; 28,612 -> 28,600 */
const sig3 = (n: number) => { if (n < 1000) return fmtInt(Math.round(n)); const f = 10 ** (Math.floor(Math.log10(n)) - 2); return fmtInt(Math.round(n / f) * f) }

/** The same sentence pattern every month: the count with its typical month, or the comparison with it. */
export function describeCell(cell: CalendarCell | null, month: number, year: number, mode: CalendarMode = 'count', maxMedian = 0) {
  const name = MONTH_NAMES[month]
  const when = `${name} ${year}`
  if (cell?.outside) return `${when}: outside the chosen range.`
  if (!cell || cell.fixed == null) return `${when}: no data.`
  const partial = cell.flags.includes('outage') ? ' Partial satellite coverage.' : ''
  if (mode === 'count') return `${when}: ${sig3(cell.fixed)} hotspots${cell.median != null ? ` (typical ${name}: ${sig3(cell.median)})` : ''}.${partial}`
  if (cell.median == null || cell.median <= 0) return `${when}: ${sig3(cell.fixed)} hotspots.${partial}`
  if (tooFew(cell, maxMedian)) return `${when}: too few hotspots to compare (typical ${name}: ${sig3(cell.median)}).${partial}`
  const r = cell.fixed / cell.median
  const vs = r >= 2 ? `${r.toFixed(1).replace(/\.0$/, '')} times a typical ${name}`
    : Math.abs(r - 1) < 0.05 ? `close to a typical ${name}`
    : `${Math.round(Math.abs(r - 1) * 100)}% ${r > 1 ? 'above' : 'below'} a typical ${name}`
  return `${when}: ${vs}.${partial}`
}

export function FireCalendar({ years, cells, mode, render = 'fill', maxCount, cellHeight = 24, label, monthLabels = 'short', onShow, highlight, season, className }: FireCalendarProps) {
  // the busiest typical month, for "too few to compare"
  const maxMedian = useMemo(() => Math.max(0, ...cells.flat().map((c) => c?.median ?? 0)), [cells])
  const [active, setActive] = useState<{ y: number; m: number }>({ y: 0, m: 0 })
  const [shown, setShownState] = useState<{ y: number; m: number } | null>(null)
  const setShown = (v: { y: number; m: number } | null) => { setShownState(v); onShow?.(v ? { year: years[v.y], month: v.m } : null) }
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const totals = useMemo(() => cells.map((row) => {
    const v = row.filter((c): c is CalendarCell => !!c && c.fixed != null)
    return v.length ? v.reduce((s, c) => s + (c.fixed ?? 0), 0) : null
  }), [cells])

  const focusCell = (y: number, m: number) => {
    const ny = Math.max(0, Math.min(years.length - 1, y)), nm = Math.max(0, Math.min(11, m))
    setActive({ y: ny, m: nm }); setShown({ y: ny, m: nm })
    refs.current[ny * 12 + nm]?.focus()
  }
  const onKey = (e: KeyboardEvent, y: number, m: number) => {
    const moves: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }
    if (moves[e.key]) { e.preventDefault(); focusCell(y + moves[e.key][0], m + moves[e.key][1]) }
    if (e.key === 'Home') { e.preventDefault(); focusCell(y, 0) }
    if (e.key === 'End') { e.preventDefault(); focusCell(y, 11) }
  }

  const readout = shown ? describeCell(cells[shown.y]?.[shown.m] ?? null, shown.m, years[shown.y], mode, maxMedian) : null
  const s0 = season && season.length ? Math.min(...season) : null

  return (
    <div className={cn('w-full', className)} style={{ color: 'var(--cal-fg)' }}>
      <p className="mb-3 min-h-5 text-[12px] leading-5 tabular-nums" style={{ color: 'var(--cal-muted)' }} aria-live="polite">
        {readout ?? 'Point at a month to read it'}
      </p>
      <div
        role="grid"
        aria-label={label}
        className="grid"
        style={{ gridTemplateColumns: '44px repeat(12, minmax(0, 1fr)) 56px', gap: 'var(--cal-gap, 2px)' }}
        onPointerLeave={() => setShown(null)}
      >
        {/* "Fire season" over the season's columns */}
        {s0 != null ? (
          <div aria-hidden className="contents">
            <span style={{ gridColumn: `span ${s0 + 1}` }} />
            <span className="text-center text-[12px] leading-4" style={{ gridColumn: `span ${season!.length}`, color: 'var(--cal-fg, var(--bone))' }}>Fire season</span>
            <span style={{ gridColumn: `span ${13 - s0 - season!.length}` }} />
          </div>
        ) : null}
        <div role="row" className="contents">
          <span role="columnheader"><span className="sr-only">Year</span></span>
          {MONTHS.map((mo, mi) => (
            <span key={mo} role="columnheader" className={season?.includes(mi) ? 'pb-1 text-center text-[12px] leading-4 underline decoration-1 underline-offset-4' : 'pb-1 text-center text-[12px] leading-4'} style={{ color: season?.includes(mi) ? 'var(--cal-fg, var(--bone))' : 'var(--cal-muted)' }}>
              {monthLabels === 'short' ? mo : mo[0]}
            </span>
          ))}
          <span role="columnheader" className="pb-1 text-right text-[12px] leading-4" style={{ color: 'var(--cal-muted)' }}>Total</span>
        </div>

        {years.map((year, y) => (
          <div role="row" key={year} className="contents">
            <span role="rowheader" data-cal="year" className="flex items-center text-[12px] tabular-nums" style={{ color: 'var(--cal-muted)', height: cellHeight }}>{year}</span>
            {cells[y].map((cell, m) => {
              const outside = !!cell?.outside
              const empty = !cell || cell.fixed == null
              const prov = !!cell?.flags.includes('provisional')
              const outage = !!cell?.flags.includes('outage')
              const isActive = active.y === y && active.m === m
              const isShown = shown?.y === y && shown?.m === m
              return (
                <button
                  key={m}
                  ref={(el) => { refs.current[y * 12 + m] = el }}
                  type="button"
                  role="gridcell"
                  tabIndex={isActive ? 0 : -1}
                  aria-label={describeCell(cell, m, year, mode, maxMedian)}
                  onPointerEnter={() => setShown({ y, m })}
                  onFocus={() => { setActive({ y, m }); setShown({ y, m }) }}
                  onKeyDown={(e) => onKey(e, y, m)}
                  className="relative grid place-items-center outline-none focus-visible:z-10"
                  style={{
                    height: cellHeight,
                    borderRadius: 'var(--cal-radius, 2px)',
                    // provisional months can be muted toward the cell colour (--cal-prov-mix, default 100% = unmuted)
                    background: outside ? 'transparent' : empty ? 'var(--cal-empty)' : render === 'fill'
                      ? (prov ? `color-mix(in srgb, ${fill(cell!, mode, maxCount, maxMedian)} var(--cal-prov-mix, 100%), var(--cal-cell))` : fill(cell!, mode, maxCount, maxMedian))
                      : 'var(--cal-cell)',
                    boxShadow: highlight && highlight.year === year && highlight.month === m
                      ? 'inset 0 0 0 2px var(--cal-highlight, var(--cal-fg))'
                      : isShown ? 'inset 0 0 0 1.5px var(--cal-focus)' : undefined,
                  }}
                >
                  {!empty && render === 'squares' ? <Square cell={cell!} mode={mode} maxCount={maxCount} size={cellHeight} /> : null}
                  {empty && !outside ? <span aria-hidden className="block h-px w-2" style={{ background: 'var(--cal-muted)', opacity: 0.6 }} /> : null}
                  {prov ? <span aria-hidden className="pointer-events-none absolute inset-0" style={{ borderRadius: 'inherit', backgroundImage: 'repeating-linear-gradient(135deg, var(--cal-hatch) 0 1px, transparent 1px 4px)' }} /> : null}
                  {outage ? <span aria-hidden className="absolute right-[1px] top-[1px] h-[5px] w-[5px] rounded-full" style={{ background: 'var(--cal-cell)', boxShadow: 'inset 0 0 0 1.25px var(--cal-fg)' }} /> : null}
                </button>
              )
            })}
            <span data-cal="total" className="flex items-center justify-end text-[12px] tabular-nums" style={{ height: cellHeight, color: 'var(--cal-fg)' }}>
              {totals[y] == null ? '–' : totals[y]! >= 10000 ? `${Math.round(totals[y]! / 1000)}k` : fmtInt(totals[y]!)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Squares mode: area encodes magnitude; anomaly sign is ink (above the median) or grey (below). */
function Square({ cell, mode, maxCount, size }: { cell: CalendarCell; mode: CalendarMode; maxCount: number; size: number }) {
  // leave a 6 px margin so a corner mark (outage) never lands on the square
  const max = size - 12
  if (mode === 'count') {
    const k = Math.sqrt(Math.max(0, cell.fixed ?? 0) / Math.max(1, maxCount))
    const s = Math.max(3, Math.round(k * max))
    return <span aria-hidden className="block" style={{ width: s, height: s, background: 'var(--cal-sq-up)' }} />
  }
  const a = cell.anomaly ?? 0
  if (Math.abs(a) <= ANOM_STEPS[0]) return <span aria-hidden className="block h-[3px] w-[3px]" style={{ background: 'var(--cal-sq-mid)' }} />
  const k = Math.sqrt(Math.min(Math.abs(a), 100) / 100)
  const s = Math.max(4, Math.round(k * max))
  return <span aria-hidden className="block" style={{ width: s, height: s, background: a > 0 ? 'var(--cal-sq-up)' : 'var(--cal-sq-down)' }} />
}

/** Legend for the stepped fill: five steps per arm around the neutral midpoint, plus the honest states. */
export function CalendarLegend({ mode, render = 'fill', className }: { mode: CalendarMode; render?: CalendarRender; className?: string }) {
  const sw = 'inline-block h-3 w-4'
  return (
    <div className={cn('flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px]', className)} style={{ color: 'var(--cal-muted)' }}>
      {render === 'fill' && mode === 'anomaly' ? (
        <span className="flex items-center gap-2">
          <span>Below typical</span>
          <span className="flex gap-[2px]" aria-hidden>
            {[5, 4, 3, 2, 1].map((s) => <span key={`d${s}`} className={sw} style={{ background: `var(--cal-down-${s})` }} />)}
            <span className={sw} style={{ background: 'var(--cal-mid)' }} />
            {[1, 2, 3, 4, 5].map((s) => <span key={`u${s}`} className={sw} style={{ background: `var(--cal-up-${s})` }} />)}
          </span>
          <span>Above typical</span>
        </span>
      ) : null}
      {render === 'fill' && mode === 'anomaly' ? (
        <span className="flex items-center gap-2"><span aria-hidden className={sw} style={{ background: 'var(--cal-mid)' }} />Too few to compare</span>
      ) : null}
      {render === 'fill' && mode === 'count' ? (
        <span className="flex items-center gap-2">
          <span>Fewer hotspots</span>
          <span className="flex gap-[2px]" aria-hidden>{[1, 2, 3, 4, 5, 6].map((s) => <span key={s} className={sw} style={{ background: `var(--cal-seq-${s})` }} />)}</span>
          <span>More hotspots</span>
        </span>
      ) : null}
      {render === 'squares' ? (
        <span className="flex items-center gap-3">
          {mode === 'anomaly' ? (
            <>
              <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-3 w-3" style={{ background: 'var(--cal-sq-up)' }} />Above typical</span>
              <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-3 w-3" style={{ background: 'var(--cal-sq-down)' }} />Below typical</span>
              <span>Larger square, further from typical</span>
            </>
          ) : <span>Larger square, more fires</span>}
        </span>
      ) : null}
      <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-[7px] w-[7px] rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--cal-fg)' }} />Partial satellite coverage</span>
      <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-px w-3" style={{ background: 'var(--cal-muted)' }} />No data</span>
    </div>
  )
}
