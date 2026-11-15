/**
 * Fire calendar — adapted from 21st.dev "Returns Calendar" by ssychui
 * (https://21st.dev/@ssychui/components/returns-calendar, part of ssych ui).
 *
 * Original: a years × months heat grid with diverging fills, a hover readout that dims
 * unrelated cells, a diagonal settle-in, and a year-total column whose popover draws the
 * year's growth curve.
 * Changes for Propagators: cells hold the fixed-clock count or its anomaly vs. the median of that
 * calendar month (not returns); the up/down hues are a colour-blind-safe warm/cool pair;
 * `null` months render as empty "no data" cells; provisional months are hatched and outage
 * months carry a dot; the year column shows the year's total and its popover draws that
 * year's season against the median.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

const EASE = [0.16, 1, 0.3, 1] as const
const UP = 'var(--cal-up, #d6604d)'
const DOWN = 'var(--cal-down, #4393c3)'
const SEQ = 'var(--cal-seq, #d6604d)'
const SURFACE = 'var(--cal-surface, #fff)'
const HAIRLINE = 'var(--cal-line, rgba(0,0,0,0.12))'
const FG = 'var(--cal-fg, #111)'
const INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface CalendarCell {
  fixed: number | null
  lo?: number | null
  hi?: number | null
  median: number | null
  anomaly: number | null
  flags: string[]
}

export interface FireCalendarProps {
  title?: string
  hint?: string
  years: number[]
  /** cells[yearIndex][monthIndex] */
  cells: (CalendarCell | null)[][]
  mode: 'anomaly' | 'count'
  /** largest count, for the sequential scale */
  maxCount?: number
  cellHeight?: number
  className?: string
}

const fmtInt = (v: number) => Math.round(v).toLocaleString('en-US')
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(0)}`

function fillFor(cell: CalendarCell | null, mode: 'anomaly' | 'count', maxCount: number, on: boolean) {
  if (!cell || cell.fixed == null) return 'transparent'
  if (mode === 'count') {
    const k = Math.sqrt(Math.max(0, cell.fixed) / Math.max(1, maxCount))
    return `color-mix(in srgb, ${SEQ} ${Math.round(k * 88 + (on ? 10 : 4))}%, transparent)`
  }
  const a = cell.anomaly ?? 0
  return `color-mix(in srgb, ${a >= 0 ? UP : DOWN} ${Math.round(Math.min(Math.abs(a) / 80, 1) * 78 + (on ? 18 : 6))}%, transparent)`
}

export function FireCalendar({ title = 'Burning activity, fixed clock', hint = 'hover a month', years, cells, mode, maxCount = 1, cellHeight = 26, className }: FireCalendarProps) {
  const reduced = useReducedMotion()
  const [hot, setHot] = useState<{ y: number; m: number } | null>(null)
  const totals = useMemo(() => cells.map((row) => {
    const vals = row.filter((c): c is CalendarCell => !!c && c.fixed != null)
    return vals.length ? vals.reduce((s, c) => s + (c.fixed ?? 0), 0) : null
  }), [cells])
  const hc = hot ? cells[hot.y]?.[hot.m] : null

  return (
    <div className={cn('w-full', className)} style={{ color: FG }}>
      <div className="mb-2 flex items-baseline justify-between gap-4 px-0.5">
        <span className="text-[13px] font-semibold">{title}</span>
        <span className="text-[11px] tabular-nums" style={{ color: 'color-mix(in srgb, currentColor 60%, transparent)' }}>
          {hot && hc && hc.fixed != null ? (
            <>
              <span style={{ color: FG }}>{MONTHS[hot.m]} {years[hot.y]}</span>
              <span className="mx-1.5 opacity-40">·</span>
              {fmtInt(hc.fixed)} hotspots
              {hc.median != null ? <><span className="mx-1.5 opacity-40">·</span>median {fmtInt(hc.median)}</> : null}
              {hc.anomaly != null ? <><span className="mx-1.5 opacity-40">·</span><span style={{ color: hc.anomaly >= 0 ? UP : DOWN, fontWeight: 600 }}>{signed(hc.anomaly)}%</span></> : null}
              {hc.flags.length ? <span className="ml-1.5 opacity-70">({hc.flags.join(', ')})</span> : null}
            </>
          ) : hot ? `${MONTHS[hot.m]} ${years[hot.y]} · no data` : hint}
        </span>
      </div>

      <div className="grid gap-[3px]" style={{ gridTemplateColumns: '40px repeat(12, minmax(0,1fr)) 64px' }} onPointerLeave={() => setHot(null)}>
        <span />
        {INITIALS.map((m, i) => (
          <span key={i} className="pb-0.5 text-center text-[10px]" style={{ opacity: hot && hot.m !== i ? 0.35 : 0.6 }}>{m}</span>
        ))}
        <span className="pb-0.5 text-center text-[10px] opacity-60">Year</span>

        {years.map((year, y) => (
          <div key={year} className="contents">
            <span className="flex items-center justify-end pr-1.5 text-[10.5px] tabular-nums" style={{ opacity: hot && hot.y !== y ? 0.35 : 0.7 }}>{year}</span>
            {cells[y].map((cell, m) => {
              const on = hot?.y === y && hot?.m === m
              const dim = !!hot && !on && hot.y !== y && hot.m !== m
              const empty = !cell || cell.fixed == null
              const prov = !!cell?.flags.includes('provisional')
              const outage = !!cell?.flags.includes('outage')
              const label = empty
                ? `${MONTHS[m]} ${year}: no data`
                : `${MONTHS[m]} ${year}: ${fmtInt(cell!.fixed!)} fixed-clock hotspots${cell!.anomaly != null ? `, ${signed(cell!.anomaly)}% vs median` : ''}${cell!.flags.length ? `, ${cell!.flags.join(', ')}` : ''}`
              return (
                <motion.button
                  key={m}
                  type="button"
                  aria-label={label}
                  onPointerEnter={() => setHot({ y, m })}
                  onFocus={() => setHot({ y, m })}
                  className="relative grid place-items-center rounded-[3px] text-[9px] font-semibold tabular-nums outline-none focus-visible:ring-2"
                  style={{
                    height: cellHeight,
                    background: fillFor(cell, mode, maxCount, on),
                    border: empty ? `1px dashed ${HAIRLINE}` : 'none',
                    outline: on ? `1.5px solid ${FG}` : 'none',
                    outlineOffset: '-1.5px',
                    backgroundImage: prov ? 'repeating-linear-gradient(45deg, rgba(0,0,0,0.28) 0 1.5px, transparent 1.5px 5px)' : undefined,
                  }}
                  initial={{ opacity: reduced ? 1 : 0, scale: reduced ? 1 : 0.6 }}
                  animate={{ opacity: dim ? 0.35 : 1, scale: 1 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.3, ease: EASE, delay: 0.004 * (y * 12 + m) }}
                >
                  {outage ? <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: FG }} /> : null}
                </motion.button>
              )
            })}
            <YearTotalCell row={cells[y]} total={totals[y]} dimmed={!!hot && hot.y !== y} reduced={!!reduced} align={y === 0 ? 'start' : y === years.length - 1 ? 'end' : 'center'} height={cellHeight} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Year total; hovering it draws that year's season (fixed-clock count by month) against the median. */
function YearTotalCell({ row, total, dimmed, reduced, align, height }: { row: (CalendarCell | null)[]; total: number | null; dimmed: boolean; reduced: boolean; align: 'start' | 'center' | 'end'; height: number }) {
  const [open, setOpen] = useState(false)
  const W = 140, H = 48
  const vals = row.map((c) => c?.fixed ?? null)
  const meds = row.map((c) => c?.median ?? null)
  const hi = Math.max(1, ...vals.map((v) => v ?? 0), ...meds.map((v) => v ?? 0))
  const px = (i: number) => 3 + (i / 11) * (W - 6)
  const py = (v: number) => 4 + (1 - v / hi) * (H - 8)
  const line = (arr: (number | null)[]) => arr.map((v, i) => (v == null ? null : `${px(i).toFixed(1)},${py(v).toFixed(1)}`)).filter(Boolean).join(' L')
  return (
    <div
      className="relative grid cursor-help place-items-center rounded-[3px] text-[10px] font-semibold tabular-nums transition-opacity"
      style={{ height, background: `color-mix(in srgb, ${FG} 6%, transparent)`, opacity: dimmed ? 0.4 : 1, outline: open ? `1.5px solid ${FG}` : 'none', outlineOffset: '-1.5px' }}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
    >
      {total == null ? '—' : total >= 10000 ? `${(total / 1000).toFixed(0)}k` : fmtInt(total)}
      <div className={cn('pointer-events-none absolute right-[calc(100%+6px)] z-20', align === 'start' ? 'top-0' : align === 'end' ? 'bottom-0' : 'top-1/2 -translate-y-1/2')}>
        <AnimatePresence>
          {open && (
            <motion.div className="rounded-lg border p-2" style={{ background: SURFACE, borderColor: HAIRLINE }}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 4, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={reduced ? { opacity: 0 } : { opacity: 0, x: 4, scale: 0.96 }}
              transition={{ duration: reduced ? 0 : 0.16, ease: EASE }}>
              <div className="mb-1 whitespace-nowrap text-[9px] font-medium opacity-60">season vs median · Jan→Dec</div>
              <svg width={W} height={H} className="block">
                <path d={`M${line(meds)}`} fill="none" stroke="currentColor" strokeOpacity={0.45} strokeWidth={1} strokeDasharray="3 2" />
                <motion.path d={`M${line(vals)}`} fill="none" stroke={UP} strokeWidth={1.6} initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduced ? 0 : 0.5, ease: EASE }} />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
