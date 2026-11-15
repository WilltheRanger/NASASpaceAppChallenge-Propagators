/**
 * Chart Line, adapted from 21st.dev (mirukullacode/chart-line): a multi-series area chart with lines that draw in,
 * halftone dot fills, a crosshair that springs between points with a tooltip, and a legend that toggles series; when
 * the data change, the curves morph to their new shape. Adapted here for a numeric x axis (time of day), a label on
 * each series' peak, shaded reference bands with an arrow, point markers, a controlled legend (the page decides which
 * series show), and Anchor's tokens. Motion from framer-motion; with motion off everything is drawn at once.
 */
import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type ChartSeries = { key: string; label: string; color: string; mark?: React.ReactNode; note?: string }
export type ChartRow = { x: number } & Record<string, number>
/** a span of x to shade, with a label; `arrowTo` draws an arrow from the band to that x */
export type ChartBand = { from: number; to: number; label: string; arrowTo?: number | null }
export type ChartMarker = { key: string; series: string; x: number; strong?: boolean }
export type ChartTip = { title: string; rows: { key: string; label: string; value: string; mark?: React.ReactNode }[] }

export interface ChartLineProps {
  title: string
  description?: React.ReactNode
  data: ChartRow[]
  series: ChartSeries[]
  /** the x range drawn, and the labelled ticks along it */
  domain: [number, number]
  ticks: { x: number; label: string }[]
  hidden: Set<string>
  onToggle: (key: string) => void
  bands?: ChartBand[]
  markers?: ChartMarker[]
  tooltip: (i: number) => ChartTip
  /** the plot's height in px, without the axis */
  height?: number
  motion?: boolean
  /** a sentence for screen readers saying what the chart shows */
  summary: string
  footer?: React.ReactNode
  empty?: React.ReactNode
  className?: string
}

const EASE = [0.65, 0, 0.35, 1] as const
const r2 = (v: number) => Math.round(v * 100) / 100

/** a monotone cubic through the points: smooth, and never dipping below a zero it passes through */
export function monotone(pts: [number, number][]) {
  const n = pts.length
  if (!n) return ''
  if (n === 1) return `M${r2(pts[0][0])},${r2(pts[0][1])}`
  const dx: number[] = [], m: number[] = []
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0] || 1; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i] }
  const t: number[] = [m[0]]
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i])
  t[n - 1] = m[n - 2]
  let d = `M${r2(pts[0][0])},${r2(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += `C${r2(pts[i][0] + h)},${r2(pts[i][1] + h * t[i])},${r2(pts[i + 1][0] - h)},${r2(pts[i + 1][1] - h * t[i + 1])},${r2(pts[i + 1][0])},${r2(pts[i + 1][1])}`
  }
  return d
}

/** where each peak label starts: centred on its peak, then pushed apart left to right so none overlap, and kept inside */
function placeLabels<T extends { p: { peak: [number, number] }; w: number }>(items: T[], width: number) {
  const out = [...items].sort((a, b) => a.p.peak[0] - b.p.peak[0]).map((it) => ({ ...it, left: it.p.peak[0] - it.w / 2 }))
  for (let i = 0; i < out.length; i++) {
    out[i].left = Math.max(out[i].left, i ? out[i - 1].left + out[i - 1].w + 6 : 0)
  }
  // the last one may run past the right edge: slide the run back
  for (let i = out.length - 1; i >= 0; i--) {
    const limit = i === out.length - 1 ? width - out[i].w : out[i + 1].left - 6 - out[i].w
    out[i].left = Math.max(0, Math.min(out[i].left, limit))
  }
  return out
}

function useWidth(ref: React.RefObject<HTMLElement>) {
  const [width, setWidth] = React.useState(0)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

export function ChartLine({ title, description, data, series, domain, ticks, hidden, onToggle, bands = [], markers = [], tooltip, height = 104, motion: moving = true, summary, footer, empty, className }: ChartLineProps) {
  const reduce = useReducedMotion()
  const still = !moving || !!reduce
  const box = React.useRef<HTMLDivElement>(null)
  const width = useWidth(box)
  const [active, setActive] = React.useState<number | null>(null)
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const n = data.length

  // room above the plot for the peak labels, and below it for the axis
  const padT = 24, padB = 22, padX = 6
  const svgH = padT + height + padB
  const plotW = Math.max(1, width - padX * 2)
  const xAt = (v: number) => r2(padX + ((v - domain[0]) / (domain[1] - domain[0])) * plotW)
  const visible = series.filter((s) => !hidden.has(s.key))
  const max = Math.max(1e-9, ...visible.flatMap((s) => data.map((d) => d[s.key] ?? 0)))
  const yAt = (v: number) => r2(padT + (1 - v / max) * height)
  const base = padT + height

  const paths = series.map((s, si) => {
    const off = hidden.has(s.key)
    const pts = data.map((d) => [xAt(d.x), off ? base : yAt(d[s.key] ?? 0)] as [number, number])
    const line = monotone(pts)
    const area = pts.length ? `${line}L${pts[pts.length - 1][0]},${base}L${pts[0][0]},${base}Z` : ''
    let peak = 0
    data.forEach((d, i) => { if ((d[s.key] ?? 0) > (data[peak][s.key] ?? 0)) peak = i })
    return { s, si, off, pts, line, area, peak: pts[peak] ?? [0, base] }
  })
  /** the y of a series' curve at an x between its points */
  const yOn = (key: string, x: number) => {
    const p = paths.find((q) => q.s.key === key)
    if (!p || !p.pts.length) return base
    const px = xAt(x)
    const k = p.pts.findIndex((q) => q[0] >= px)
    if (k <= 0) return p.pts[Math.max(0, k)][1]
    const [x0, y0] = p.pts[k - 1], [x1, y1] = p.pts[k]
    return y0 + ((px - x0) / (x1 - x0 || 1)) * (y1 - y0)
  }

  const t = (d: number, extra: object = {}) => (still ? { duration: 0 } : { duration: d, ease: EASE, ...extra })
  const morph = still ? { duration: 0 } : { type: 'spring' as const, duration: 0.7, bounce: 0.1 }

  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r || n === 0) return
    const v = domain[0] + ((clientX - r.left - padX) / plotW) * (domain[1] - domain[0])
    let best = 0
    data.forEach((d, i) => { if (Math.abs(d.x - v) < Math.abs(data[best].x - v)) best = i })
    setActive(best)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, (a: number | null) => number | null> = {
      ArrowRight: (a) => (a === null ? 0 : Math.min(n - 1, a + 1)),
      ArrowLeft: (a) => (a === null ? n - 1 : Math.max(0, a - 1)),
      Home: () => 0,
      End: () => n - 1,
      Escape: () => null,
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    setActive(move)
  }
  const tip = active !== null && active < n ? tooltip(active) : null
  const tipX = active !== null && active < n ? xAt(data[active].x) : 0

  return (
    <section aria-label={title} className={cn('rounded-lg border border-[color:var(--hairline)] bg-[rgba(11,13,11,0.94)] px-4 pb-3 pt-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)]', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-[color:var(--bone)]">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-[color:var(--bone3)]">{description}</p> : null}
        </div>
        {/* the legend: each series toggles */}
        <div role="group" aria-label="Show or hide" className="flex flex-wrap items-center gap-1">
          {series.map((s) => {
            const on = !hidden.has(s.key)
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(s.key)}
                title={on ? `Hide ${s.label}` : `Show ${s.label}`}
                className={cn('flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]',
                  on ? 'border-[color:var(--bone-20)] text-[color:var(--bone)] hover:bg-[color:var(--raised)]' : 'border-transparent text-[color:var(--bone3)] line-through hover:text-[color:var(--bone2)]')}
              >
                <span className={cn('grid place-items-center', !on && 'opacity-40')}>{s.mark ?? <span className="size-2 rounded-full" style={{ background: s.color }} />}</span>
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {n === 0 || visible.length === 0 && empty ? (
        <div className="py-8 text-sm text-[color:var(--bone3)]">{empty}</div>
      ) : (
        <div
          ref={box}
          tabIndex={0}
          role="img"
          aria-label={summary}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className="relative mt-1 w-full touch-pan-y select-none rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-[color:var(--bone)]"
          style={{ height: svgH }}
        >
          {width > 0 ? (
            <svg width={width} height={svgH} className="block overflow-visible" onPointerMove={(e) => pick(e.clientX)} onPointerLeave={() => setActive(null)} aria-hidden>
              <defs>
                {series.map((s, si) => (
                  <pattern key={s.key} id={`${uid}-f${si}`} width="5" height="5" patternUnits="userSpaceOnUse">
                    <circle cx="1.25" cy="1.25" r="1.1" fill={s.color} />
                    <circle cx="3.75" cy="3.75" r="1.1" fill={s.color} />
                  </pattern>
                ))}
                <marker id={`${uid}-arrow`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L8,4 L0,8 z" fill="#B4B1AA" />
                </marker>
              </defs>

              {/* hour lines */}
              {ticks.map((k) => (
                <line key={k.x} x1={xAt(k.x)} x2={xAt(k.x)} y1={padT - 6} y2={base} stroke="#ECE9E1" strokeOpacity={0.07} />
              ))}
              <line x1={padX} x2={width - padX} y1={base} y2={base} stroke="#ECE9E1" strokeOpacity={0.18} />

              {/* reference bands, under the data */}
              {bands.map((b) => {
                const x0 = xAt(b.from), x1 = Math.max(xAt(b.to), x0 + 2)
                return (
                  <g key={b.label}>
                    <rect x={x0} y={padT - 6} width={x1 - x0} height={base - padT + 6} fill="#ECE9E1" fillOpacity={0.05} stroke="#B4B1AA" strokeDasharray="3 3" strokeWidth={1} rx={2} />
                    {b.arrowTo != null && xAt(b.arrowTo) - x1 > 24 ? (
                      <motion.line
                        x1={x1 + 3}
                        y1={base - 9}
                        y2={base - 9}
                        stroke="#B4B1AA"
                        strokeWidth={1.25}
                        markerEnd={`url(#${uid}-arrow)`}
                        initial={still ? false : { x2: x1 + 3, opacity: 0 }}
                        animate={{ x2: xAt(b.arrowTo) - 10, opacity: 1 }}
                        transition={{ x2: t(0.9, { delay: 0.9 }), opacity: t(0.2, { delay: 0.9 }) }}
                      />
                    ) : null}
                  </g>
                )
              })}

              {/* areas: halftone dots */}
              <g opacity={0.6}>
                {paths.map((p) => (
                  <motion.path
                    key={p.s.key}
                    fill={`url(#${uid}-f${p.si})`}
                    initial={still ? false : { d: p.area, opacity: 0 }}
                    animate={{ d: p.area, opacity: p.off ? 0 : 1 }}
                    transition={{ d: morph, opacity: t(0.5, { delay: 0.2 }) }}
                  />
                ))}
              </g>
              {/* lines, drawn in */}
              {paths.map((p) => (
                <motion.path
                  key={p.s.key}
                  fill="none"
                  stroke={p.s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={still ? false : { d: p.line, pathLength: 0, opacity: 0 }}
                  animate={{ d: p.line, pathLength: 1, opacity: p.off ? 0 : 1 }}
                  transition={{ d: morph, pathLength: t(1.1, { delay: p.si * 0.15 }), opacity: t(0.25, { delay: p.off ? 0 : p.si * 0.15 }) }}
                />
              ))}

              {/* markers: a picked fire on its satellite's curve */}
              {markers.filter((m) => !hidden.has(m.series)).map((m) => (
                <circle key={m.key} cx={xAt(m.x)} cy={yOn(m.series, m.x)} r={m.strong ? 5 : 4} fill={m.strong ? '#ECE9E1' : '#0B0D0B'} stroke="#ECE9E1" strokeWidth={2} />
              ))}

              {/* the crosshair */}
              <motion.g
                pointerEvents="none"
                initial={false}
                animate={{ opacity: active === null ? 0 : 1, x: tipX }}
                transition={{ opacity: { duration: 0.15 }, x: still ? { duration: 0 } : { type: 'spring', stiffness: 600, damping: 45 } }}
              >
                <line x1={0} x2={0} y1={padT - 6} y2={base} stroke="#ECE9E1" strokeOpacity={0.35} strokeDasharray="3 3" />
              </motion.g>
              {active !== null && active < n
                ? paths.filter((p) => !p.off).map((p) => (
                  <circle key={p.s.key} cx={p.pts[active][0]} cy={p.pts[active][1]} r={4} fill={p.s.color} stroke="#0B0D0B" strokeWidth={2} pointerEvents="none" />
                ))
                : null}

              {/* the hour labels */}
              {ticks.map((k) => (
                <text key={k.x} x={xAt(k.x)} y={base + 16} textAnchor="middle" fontSize={11} fill="#8D8A84" className="tabular-nums">{k.label}</text>
              ))}
            </svg>
          ) : null}

          {/* labels: each series at its peak, each band at its foot (HTML, so they take the page's type) */}
          {width > 0
            ? placeLabels(paths.filter((p) => !p.off && p.s.note).map((p) => ({ p, w: 30 + (p.s.label.length + (p.s.note ?? '').length) * 6.6 })), width).map(({ p, left }) => (
              <span key={p.s.key} className="pointer-events-none absolute flex items-center gap-1.5 whitespace-nowrap rounded bg-[rgba(11,13,11,0.85)] px-1.5 py-0.5 text-xs leading-none text-[color:var(--bone)]" style={{ left, top: p.peak[1] - 22 }}>
                {p.s.mark}
                <span className="font-medium">{p.s.label}</span>
                <span className="tabular-nums text-[color:var(--bone2)]">{p.s.note}</span>
              </span>
            ))
            : null}
          {width > 0
            ? bands.map((b) => (
              <span key={b.label} className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded bg-[rgba(11,13,11,0.9)] px-1.5 py-0.5 text-[11px] leading-none text-[color:var(--bone2)]" style={{ left: (xAt(b.from) + xAt(b.to)) / 2, top: base - 30 }}>
                {b.label}
              </span>
            ))
            : null}

          {/* the tooltip */}
          {tip ? (
            <div
              role="presentation"
              className="pointer-events-none absolute top-0 z-10 min-w-[148px] rounded-md border border-[color:var(--bone-20)] bg-[rgba(11,13,11,0.97)] px-2.5 py-2 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
              style={tipX > width / 2 ? { right: width - tipX + 12 } : { left: tipX + 12 }}
            >
              <p className="mb-1 tabular-nums text-[color:var(--bone2)]">{tip.title}</p>
              {tip.rows.map((r) => (
                <p key={r.key} className="flex items-center gap-2 py-0.5">
                  {r.mark}
                  <span className="text-[color:var(--bone)]">{r.label}</span>
                  <span className="ml-auto pl-3 tabular-nums text-[color:var(--bone)]">{r.value}</span>
                </p>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {footer}
    </section>
  )
}

export default ChartLine
