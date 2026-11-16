/**
 * Anomaly chart — adapted from 21st.dev "Anomaly Chart" by astralyxdev
 * (https://21st.dev/@astralyxdev/components/anomaly-chart).
 *
 * Kept from the original: a measured value drawn as a line against the expected band the caller passes in, with the
 * points that fall outside the band marked. Detection stays outside the component: it marks what the caller flags and
 * never invents a threshold of its own. A small legend names the marks.
 * Changed for Anchor: everything is drawn at real pixel size from a measured width (the original stretched one SVG
 * and laid an unstretched one over it, which drifts the marks off the line whenever the box isn't 5:3); each point
 * carries its uncertainty range as a whisker; points outside the band are filled and the rest hollow, so the reading
 * never rests on colour alone; a zero line and labelled ticks; the band is labelled where it is drawn; gaps where a
 * year has no value; one column at a time can be inspected by pointer or keyboard (a radio group with roving focus),
 * and the caller shows the reading; year labels thin out on narrow screens; colours come from --ac-* tokens. No
 * entrance animation.
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AnomalyPoint {
  id: string
  /** x-axis label, e.g. "2025" */
  label: string
  /** the measured value; null when there is none (drawn as a gap) */
  value: number | null
  /** uncertainty range [low, high], drawn as a whisker */
  range?: [number, number] | null
  /** expected [low, high] at this point, drawn as the band */
  expected?: [number, number]
  /** the caller's reading; by default, a value outside the expected range */
  outside?: boolean
  /** what a screen reader hears for this column */
  valueText: string
}

export interface AnomalyChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  points: AnomalyPoint[]
  height?: number
  /** the column drawn as shown: guide line, ringed point, bold label */
  activeIndex?: number | null
  /** the checked column in the radio group */
  selectedIndex?: number | null
  onInspect?: (index: number | null) => void
  onSelect?: (index: number) => void
  groupLabel: string
  /** text set beside the band, e.g. "±5% noise floor" */
  bandLabel?: string
  formatTick?: (v: number) => string
  legend?: { outside: string; inside: string; range: string }
}

const M = { top: 16, right: 8, bottom: 32, left: 48 }
const R = 4.5 // point radius: a 9 px mark
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function niceScale(lo: number, hi: number) {
  const span = hi - lo || 1
  const step = span <= 24 ? 5 : span <= 60 ? 10 : span <= 120 ? 20 : span <= 300 ? 50 : 100
  const d0 = Math.floor(lo / step) * step
  const d1 = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = d0; v <= d1 + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return { d0, d1: d1 === d0 ? d0 + step : d1, ticks }
}

function useWidth(ref: React.RefObject<HTMLDivElement | null>) {
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

export function AnomalyChart({
  points, height = 280, activeIndex = null, selectedIndex = null, onInspect, onSelect, groupLabel, bandLabel,
  formatTick = (v) => String(v), legend, className, ...props
}: AnomalyChartProps) {
  const boxRef = React.useRef<HTMLDivElement>(null)
  const btnRefs = React.useRef<Array<HTMLButtonElement | null>>([])
  const width = useWidth(boxRef)
  const n = points.length

  const scale = React.useMemo(() => {
    const vals = points
      .flatMap((p) => [p.value, ...(p.range ?? []), ...(p.expected ?? [])])
      .filter((v): v is number => v != null && Number.isFinite(v))
    return niceScale(Math.min(0, ...vals), Math.max(0, ...vals))
  }, [points])

  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = Math.max(0, height - M.top - M.bottom)
  const col = n ? plotW / n : 0
  const cx = (i: number) => M.left + col * (i + 0.5)
  const y = (v: number) => M.top + (1 - (v - scale.d0) / (scale.d1 - scale.d0)) * plotH
  const outsideAt = (p: AnomalyPoint) =>
    p.outside ?? (p.value != null && p.expected != null && (p.value < p.expected[0] || p.value > p.expected[1]))

  // the band: one strip across the plot when every point shares it, else a polygon through the columns
  const expected = points.map((p) => p.expected)
  const shared = expected.every((e) => e && expected[0] && e[0] === expected[0][0] && e[1] === expected[0][1]) ? expected[0] : undefined
  const bandPoly = !shared && expected.every(Boolean) && n > 0
    ? [
        ...points.map((p, i) => `${cx(i)},${y(p.expected![1])}`),
        ...[...points].reverse().map((p, k) => `${cx(n - 1 - k)},${y(p.expected![0])}`),
      ].join(' ')
    : undefined

  // the line, broken where a column has no value
  const segments: string[] = []
  let run: string[] = []
  points.forEach((p, i) => {
    if (p.value == null) { if (run.length > 1) segments.push(run.join(' ')); run = []; return }
    run.push(`${cx(i).toFixed(2)},${y(p.value).toFixed(2)}`)
  })
  if (run.length > 1) segments.push(run.join(' '))

  // the band's label sits at the right end, above the band unless the marks there are in the way, then below
  let bandText: { x: number; y: number } | null = null
  if (bandLabel && shared && width > 0) {
    const right = M.left + plotW
    const labelW = bandLabel.length * 6.6 + 4
    const nearby = points
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => cx(i) + R + 2 >= right - labelW)
      .map(({ p }) => {
        const vs = [p.value, ...(p.range ?? [])].filter((v): v is number => v != null)
        return vs.length ? [y(Math.max(...vs)) - R - 3, y(Math.min(...vs)) + R + 3] : null
      })
      .filter((e): e is number[] => e != null)
    const clear = (top: number, bottom: number) => nearby.every(([a, b]) => b < top || a > bottom)
    const above = y(shared[1]) - 6
    const below = y(shared[0]) + 16
    bandText = { x: right, y: clear(above - 12, above + 3) || !clear(below - 12, below + 3) ? above : below }
  }

  // with many narrow columns, label every few, counting back from the latest
  const labelEvery = col > 0 && col < 36 ? Math.ceil(36 / col) : 1
  const fallbackStop = (() => { for (let i = n - 1; i >= 0; i--) if (points[i].value != null) return i; return n - 1 })()
  const tabStop = selectedIndex ?? activeIndex ?? fallbackStop
  const move = (to: number) => {
    const i = clamp(to, 0, n - 1)
    btnRefs.current[i]?.focus()
    onSelect?.(i)
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const keys: Record<string, number> = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    move(keys[e.key])
  }
  const ink = 'var(--ac-line, currentColor)'
  const surface = 'var(--ac-surface, transparent)'

  return (
    <div data-slot="anomaly-chart" className={cn('flex min-w-0 flex-col', className)} {...props}>
      <div ref={boxRef} className="relative w-full min-w-0" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} aria-hidden className="absolute inset-0 block overflow-visible">
            {/* grid, then the band, then the zero line on top of the band */}
            {scale.ticks.map((t) => (
              <line key={t} x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} stroke="var(--ac-grid)" strokeWidth={1} shapeRendering="crispEdges" />
            ))}
            {shared ? (
              <rect x={M.left} width={plotW} y={y(shared[1])} height={Math.max(0, y(shared[0]) - y(shared[1]))} fill="var(--ac-band)" />
            ) : bandPoly ? (
              <polygon points={bandPoly} fill="var(--ac-band)" />
            ) : null}
            <line x1={M.left} x2={M.left + plotW} y1={y(0)} y2={y(0)} stroke="var(--ac-zero)" strokeWidth={1} shapeRendering="crispEdges" />
            {scale.ticks.map((t) => (
              <text key={t} x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--ac-fg)">
                {formatTick(t)}
              </text>
            ))}

            {/* the shown column's guide sits under the marks */}
            {activeIndex != null && activeIndex >= 0 && activeIndex < n ? (
              <line x1={cx(activeIndex)} x2={cx(activeIndex)} y1={M.top - 8} y2={M.top + plotH} stroke={ink} strokeOpacity={0.45} strokeWidth={1} shapeRendering="crispEdges" />
            ) : null}
            {/* the band's label, haloed in the surface colour so the guide can pass behind it */}
            {bandText && bandLabel ? (
              <text x={bandText.x} y={bandText.y} textAnchor="end" fontSize={12} fill="var(--ac-fg)" stroke={surface} strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">
                {bandLabel}
              </text>
            ) : null}

            {points.map((p, i) =>
              p.range && p.value != null ? (
                <g key={`r-${p.id}`} stroke={ink} strokeWidth={2} strokeLinecap="round">
                  <line x1={cx(i)} x2={cx(i)} y1={y(p.range[1])} y2={y(p.range[0])} />
                  <line x1={cx(i) - 4} x2={cx(i) + 4} y1={y(p.range[1])} y2={y(p.range[1])} />
                  <line x1={cx(i) - 4} x2={cx(i) + 4} y1={y(p.range[0])} y2={y(p.range[0])} />
                </g>
              ) : null,
            )}
            {segments.map((s) => (
              <polyline key={s} points={s} fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {points.map((p, i) =>
              p.value == null ? (
                <text key={`n-${p.id}`} x={cx(i)} y={y(0) - 8} textAnchor="middle" fontSize={12} fill="var(--ac-fg)">—</text>
              ) : (
                <g key={`p-${p.id}`}>
                  {i === activeIndex ? <circle cx={cx(i)} cy={y(p.value)} r={R + 4} fill="none" stroke={ink} strokeWidth={1.5} /> : null}
                  <circle cx={cx(i)} cy={y(p.value)} r={R} fill={outsideAt(p) ? ink : surface} stroke={outsideAt(p) ? surface : ink} strokeWidth={2} />
                </g>
              ),
            )}
            {points.map((p, i) => (n - 1 - i) % labelEvery !== 0 ? null : (
              <text
                key={`x-${p.id}`}
                x={cx(i)}
                y={M.top + plotH + 20}
                textAnchor="middle"
                fontSize={12}
                fontWeight={i === activeIndex ? 500 : 400}
                fill="var(--ac-fg)"
              >
                {p.label}
              </text>
            ))}
          </svg>
        ) : null}

        {/* hit columns, wider than the marks: one radio per column, roving focus, arrows move the selection */}
        <div
          role="radiogroup"
          aria-label={groupLabel}
          className="absolute inset-y-0 flex"
          style={{ left: M.left, width: plotW }}
          onPointerLeave={() => onInspect?.(null)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onInspect?.(null) }}
        >
          {points.map((p, i) => (
            <button
              key={p.id}
              ref={(el) => { btnRefs.current[i] = el }}
              type="button"
              role="radio"
              aria-checked={selectedIndex === i}
              aria-label={p.valueText}
              tabIndex={tabStop === i ? 0 : -1}
              onPointerEnter={() => onInspect?.(i)}
              onFocus={() => onInspect?.(i)}
              onClick={() => onSelect?.(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="h-full min-w-0 flex-1 cursor-pointer rounded-[2px] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid focus-visible:outline-[color:var(--ac-line)]"
            />
          ))}
        </div>
      </div>

      {legend ? (
        <div aria-hidden className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[color:var(--ac-fg)]" style={{ paddingLeft: M.left }}>
          <span className="inline-flex items-center gap-2">
            <svg width={12} height={12}><circle cx={6} cy={6} r={R} fill={ink} stroke={surface} strokeWidth={1} /></svg>
            {legend.outside}
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width={12} height={12}><circle cx={6} cy={6} r={R - 0.5} fill={surface} stroke={ink} strokeWidth={2} /></svg>
            {legend.inside}
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width={10} height={14} stroke={ink} strokeWidth={2} strokeLinecap="round">
              <line x1={5} x2={5} y1={2} y2={12} /><line x1={2} x2={8} y1={2} y2={2} /><line x1={2} x2={8} y1={12} y2={12} />
            </svg>
            {legend.range}
          </span>
        </div>
      ) : null}
    </div>
  )
}

export default AnomalyChart
