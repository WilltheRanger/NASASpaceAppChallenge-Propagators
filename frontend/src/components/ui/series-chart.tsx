/**
 * Series chart: two or more series over the same columns (years), written on the pattern of the adapted anomaly chart.
 * Drawn at real pixel size from a measured width; each series may carry a range per column, drawn as a light whisker;
 * an optional reference line with its label; markers filled or hollow, so the series never rest on colour alone; each
 * series labelled at its right end, and a legend; one column at a time can be inspected by pointer or keyboard (a radio
 * group with roving focus), and the caller shows the reading. Colours come from the caller.
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface Series {
  id: string
  label: string
  values: (number | null)[]
  lo?: (number | null)[]
  hi?: (number | null)[]
  marker: 'filled' | 'hollow'
  /** stroke and fill colour, e.g. "var(--bone)" */
  color: string
}

export interface SeriesChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  labels: string[]
  series: Series[]
  reference?: { value: number; label: string; color: string }
  height?: number
  activeIndex?: number | null
  selectedIndex?: number | null
  onInspect?: (index: number | null) => void
  onSelect?: (index: number) => void
  groupLabel: string
  /** what a screen reader hears for a column */
  columnText: (index: number) => string
  formatTick?: (v: number) => string
  /** colours for text, grid and the surface behind hollow markers */
  ink?: { fg: string; grid: string; surface: string; guide: string }
}

const M = { top: 12, right: 64, bottom: 32, left: 48 }
const R = 4

function niceScale(lo: number, hi: number) {
  const span = hi - lo || 1
  const step = span <= 12 ? 2 : span <= 24 ? 5 : span <= 60 ? 10 : 20
  const d0 = Math.floor(lo / step) * step
  const d1 = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = d0; v <= d1 + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { d0, d1: d1 === d0 ? d0 + step : d1, ticks }
}

/** The width of an element, kept current with a ResizeObserver. */
export function useMeasuredWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

export function SeriesChart({
  labels, series, reference, height = 240, activeIndex = null, selectedIndex = null, onInspect, onSelect, groupLabel, columnText,
  formatTick = (v) => String(v), ink = { fg: 'currentColor', grid: 'rgba(127,127,127,0.2)', surface: 'transparent', guide: 'currentColor' },
  className, ...props
}: SeriesChartProps) {
  const boxRef = React.useRef<HTMLDivElement>(null)
  const btnRefs = React.useRef<Array<HTMLButtonElement | null>>([])
  const width = useMeasuredWidth(boxRef)
  const n = labels.length

  const scale = React.useMemo(() => {
    const vals = series.flatMap((s) => [...s.values, ...(s.lo ?? []), ...(s.hi ?? [])]).filter((v): v is number => v != null && Number.isFinite(v))
    if (reference) vals.push(reference.value)
    return niceScale(Math.min(...vals), Math.max(...vals))
  }, [series, reference])

  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = Math.max(0, height - M.top - M.bottom)
  const col = n ? plotW / n : 0
  const cx = (i: number) => M.left + col * (i + 0.5)
  const y = (v: number) => M.top + (1 - (v - scale.d0) / (scale.d1 - scale.d0)) * plotH
  const labelEvery = col > 0 && col < 36 ? Math.ceil(36 / col) : 1

  // series labels at the right end, nudged apart when they would touch
  const ends = series.map((s) => {
    let i = s.values.length - 1
    while (i >= 0 && s.values[i] == null) i--
    return { s, i, y: i >= 0 ? y(s.values[i]!) : null }
  }).filter((e): e is { s: Series; i: number; y: number } => e.y != null).sort((a, b) => a.y - b.y)
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14

  const tabStop = selectedIndex ?? activeIndex ?? n - 1
  const move = (to: number) => {
    const i = Math.min(n - 1, Math.max(0, to))
    btnRefs.current[i]?.focus()
    onSelect?.(i)
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const keys: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    move(keys[e.key])
  }

  return (
    <div className={cn('flex min-w-0 flex-col', className)} {...props}>
      <div ref={boxRef} className="relative w-full min-w-0" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} aria-hidden className="absolute inset-0 block overflow-visible">
            {scale.ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} stroke={ink.grid} strokeWidth={1} shapeRendering="crispEdges" />
                <text x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="central" fontSize={12} fill={ink.fg}>{formatTick(t)}</text>
              </g>
            ))}
            {reference ? (
              <g>
                <line x1={M.left} x2={M.left + plotW} y1={y(reference.value)} y2={y(reference.value)} stroke={reference.color} strokeWidth={2} />
              </g>
            ) : null}
            {activeIndex != null && activeIndex >= 0 && activeIndex < n ? (
              <line x1={cx(activeIndex)} x2={cx(activeIndex)} y1={M.top - 6} y2={M.top + plotH} stroke={ink.guide} strokeOpacity={0.45} strokeWidth={1} shapeRendering="crispEdges" />
            ) : null}
            {series.map((s) => (
              <g key={s.id}>
                {s.values.map((v, i) => {
                  const lo = s.lo?.[i], hi = s.hi?.[i]
                  return v != null && lo != null && hi != null ? (
                    <line key={i} x1={cx(i)} x2={cx(i)} y1={y(hi)} y2={y(lo)} stroke={s.color} strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" />
                  ) : null
                })}
                <polyline
                  points={s.values.map((v, i) => (v == null ? null : `${cx(i).toFixed(2)},${y(v).toFixed(2)}`)).filter(Boolean).join(' ')}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {s.values.map((v, i) => v == null ? null : (
                  <g key={i}>
                    {i === activeIndex ? <circle cx={cx(i)} cy={y(v)} r={R + 4} fill="none" stroke={s.color} strokeWidth={1.5} /> : null}
                    <circle cx={cx(i)} cy={y(v)} r={R} fill={s.marker === 'filled' ? s.color : ink.surface} stroke={s.marker === 'filled' ? ink.surface : s.color} strokeWidth={2} />
                  </g>
                ))}
              </g>
            ))}
            {ends.map((e) => (
              <text key={e.s.id} x={cx(e.i) + 12} y={e.y} dominantBaseline="central" fontSize={12} fill={ink.fg}>{e.s.label}</text>
            ))}
            {reference ? (
              <text x={M.left + plotW} y={y(reference.value) - 8} textAnchor="end" fontSize={12} fill={ink.fg} stroke={ink.surface} strokeWidth={4} paintOrder="stroke">
                {reference.label}
              </text>
            ) : null}
            {labels.map((l, i) => (n - 1 - i) % labelEvery !== 0 ? null : (
              <text key={l} x={cx(i)} y={M.top + plotH + 20} textAnchor="middle" fontSize={12} fontWeight={i === activeIndex ? 500 : 400} fill={ink.fg}>{l}</text>
            ))}
          </svg>
        ) : null}
        <div
          role="radiogroup"
          aria-label={groupLabel}
          className="absolute inset-y-0 flex"
          style={{ left: M.left, width: plotW }}
          onPointerLeave={() => onInspect?.(null)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onInspect?.(null) }}
        >
          {labels.map((l, i) => (
            <button
              key={l}
              ref={(el) => { btnRefs.current[i] = el }}
              type="button"
              role="radio"
              aria-checked={selectedIndex === i}
              aria-label={columnText(i)}
              tabIndex={tabStop === i ? 0 : -1}
              onPointerEnter={() => onInspect?.(i)}
              onFocus={() => onInspect?.(i)}
              onClick={() => onSelect?.(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="h-full min-w-0 flex-1 cursor-pointer rounded-[2px] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid"
              style={{ outlineColor: ink.fg }}
            />
          ))}
        </div>
      </div>
      <div aria-hidden className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ paddingLeft: M.left, color: ink.fg }}>
        {series.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-2">
            <svg width={22} height={10}>
              <line x1={1} x2={21} y1={5} y2={5} stroke={s.color} strokeWidth={2} />
              <circle cx={11} cy={5} r={3.5} fill={s.marker === 'filled' ? s.color : ink.surface} stroke={s.color} strokeWidth={2} />
            </svg>
            {s.label}
          </span>
        ))}
        {reference ? (
          <span className="inline-flex items-center gap-2">
            <svg width={22} height={10}><line x1={1} x2={21} y1={5} y2={5} stroke={reference.color} strokeWidth={2} /></svg>
            {reference.label}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default SeriesChart
