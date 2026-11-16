/*
MIT License

Copyright (c) 2026 Manjunath Irukulla

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/**
 * Chart KPI, adapted from 21st.dev (mirukullacode/tweenly-chart-kpi): a stat card whose headline counts up, a delta
 * pill, and a halftone sparkline you can scrub, with a dashed line to compare against. Adapted for Anchor: the values
 * are times of day, so the headline rolls from the old clock to the new one; the delta is written by the caller; the
 * card takes the site's tokens; framer-motion in place of motion/react. With motion off it is drawn at once.
 */
import * as React from 'react'
import { animate as animateValue, motion, useReducedMotion } from 'framer-motion'
import { monotone } from '@/components/ui/chart-line'
import { cn } from '@/lib/utils'

export interface ChartKpiProps {
  title: string
  description?: string
  labels: string[]
  values: number[]
  /** a second series, drawn dashed */
  compare?: number[]
  valueLabel: string
  compareLabel?: string
  /** the headline figure, and where its count starts */
  headline: number
  from: number
  format: (v: number) => string
  delta: string
  deltaNote?: string
  /** the series colour (a literal, for the SVG) */
  color: string
  motion?: boolean
  sparkHeight?: number
  className?: string
}

const EASE = [0.22, 1, 0.36, 1] as const

function TrendGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 11.5 6 7.5l2.5 2.5L14 4.5M10 4.5h4v4" />
    </svg>
  )
}

export function ChartKpi({ title, description, labels, values, compare, valueLabel, compareLabel, headline, from, format, delta, deltaNote, color, motion: moving = true, sparkHeight = 64, className }: ChartKpiProps) {
  const reduce = useReducedMotion()
  const still = !moving || !!reduce
  const count = React.useRef<HTMLSpanElement>(null)
  const current = React.useRef(from)
  // the headline rolls from the old value to the new one
  React.useEffect(() => {
    const el = count.current
    if (!el) return
    if (still) { current.current = headline; el.textContent = format(headline); return }
    current.current = from
    el.textContent = format(from)
    const controls = animateValue(from, headline, { duration: 1.4, delay: 0.2, ease: EASE, onUpdate: (v) => { current.current = v; el.textContent = format(v) } })
    return () => controls.stop()
  }, [headline, from, format, still])

  return (
    <section aria-label={title} className={cn('rounded-lg border border-[color:var(--hairline)] bg-[color:var(--surface)] p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[color:var(--bone)]">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-[color:var(--bone3)]">{description}</p> : null}
        </div>
        <span aria-hidden className="grid size-8 place-items-center rounded-full border border-[color:var(--hairline)] text-[color:var(--bone2)]"><TrendGlyph /></span>
      </div>
      <div className="mt-3">
        <span ref={count} className="block text-[2.4rem] font-semibold leading-none tracking-tight tabular-nums text-[color:var(--bone)]">{format(still ? headline : from)}</span>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <motion.span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
            style={{ color, background: `color-mix(in oklab, ${color} 16%, transparent)` }}
            initial={still ? false : { opacity: 0, scale: 0.6, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={still ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 22, delay: 0.9 }}
          >
            <svg viewBox="0 0 10 10" className="size-2.5" fill="currentColor" aria-hidden><path d="M5 1.5 9 7.5H1z" /></svg>
            {delta}
          </motion.span>
          {deltaNote ? <span className="text-[color:var(--bone3)]">{deltaNote}</span> : null}
        </div>
      </div>
      <Sparkline labels={labels} values={values} compare={compare} valueLabel={valueLabel} compareLabel={compareLabel} color={color} format={format} still={still} height={sparkHeight} />
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[color:var(--bone3)]">
        <span className="tabular-nums">{labels[0]}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-3 rounded" style={{ background: color }} />{valueLabel}</span>
          {compare && compareLabel ? <span className="flex items-center gap-1.5"><span aria-hidden className="h-0 w-3 border-t border-dashed border-[color:var(--bone2)]" />{compareLabel}</span> : null}
        </span>
        <span className="tabular-nums">{labels[labels.length - 1]}</span>
      </div>
    </section>
  )
}

function Sparkline({ labels, values, compare, valueLabel, compareLabel, color, format, still, height: h }: {
  labels: string[]; values: number[]; compare?: number[]; valueLabel: string; compareLabel?: string; color: string; format: (v: number) => string; still: boolean; height: number
}) {
  const id = React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const box = React.useRef<HTMLDivElement>(null)
  const [w, setW] = React.useState(0)
  const [hover, setHover] = React.useState<number | null>(null)
  React.useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const n = values.length
  const all = compare ? values.concat(compare) : values
  let lo = Math.min(...all), hi = Math.max(...all)
  const span = hi - lo || 1
  lo -= span * 0.12
  hi += span * 0.08
  const padX = 4, top = 5
  const x = (i: number) => (n > 1 ? padX + (i / (n - 1)) * (w - padX * 2) : w / 2)
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo)) * (h - top - 2)
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number])
  const line = monotone(pts)
  const area = n ? `${line}L${pts[n - 1][0]},${h}L${pts[0][0]},${h}Z` : ''
  const ghost = compare ? monotone(compare.map((v, i) => [x(i), y(v)] as [number, number])) : ''
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left - padX) / Math.max(1, w - padX * 2)) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }
  const at = hover ?? n - 1
  return (
    <div ref={box} className="relative mt-4 w-full" style={{ height: h }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      {w > 0 && n > 0 ? (
        <svg width={w} height={h} className="block overflow-visible" role="img" aria-label={`${valueLabel} by year: ${labels.map((l, i) => `${l} ${format(values[i])}`).join(', ')}`}>
          <defs>
            <pattern id={`${id}-dots`} width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill={color} /></pattern>
            <clipPath id={`${id}-reveal`}>
              <motion.rect x={-8} y={-8} height={h + 16} initial={still ? false : { width: 0 }} animate={{ width: w + 16 }} transition={still ? { duration: 0 } : { duration: 1.1, ease: EASE }} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id}-reveal)`}>
            <g opacity={0.55}>
              <path d={area} fill={color} opacity={0.1} />
              <path d={area} fill={`url(#${id}-dots)`} opacity={0.85} />
            </g>
            {ghost ? <path d={ghost} fill="none" stroke="#B4B1AA" strokeWidth={1.5} strokeDasharray="3 4" strokeLinecap="round" opacity={0.8} /> : null}
            <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {hover !== null ? <line x1={pts[hover][0]} x2={pts[hover][0]} y1={0} y2={h} stroke="#ECE9E1" strokeOpacity={0.35} strokeDasharray="2 3" /> : null}
          <motion.circle cx={pts[at][0]} cy={pts[at][1]} r={3.5} fill={color} stroke="#0B0D0B" strokeWidth={2} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} initial={still ? false : { scale: 0 }} animate={{ scale: 1 }} transition={still ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 20, delay: hover === null ? 1 : 0 }} />
        </svg>
      ) : null}
      {hover !== null ? (
        <div className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-md border border-[color:var(--bone-20)] bg-[rgba(11,13,11,0.97)] px-2 py-1.5 text-xs shadow-[0_8px_24px_rgba(0,0,0,0.5)]" style={pts[hover][0] > w / 2 ? { right: w - pts[hover][0] } : { left: pts[hover][0] }}>
          <p className="tabular-nums text-[color:var(--bone2)]">{labels[hover]}</p>
          <p className="flex items-center gap-2 tabular-nums text-[color:var(--bone)]"><span aria-hidden className="h-0.5 w-3 rounded" style={{ background: color }} />{valueLabel}<span className="ml-auto pl-2">{format(values[hover])}</span></p>
          {compare && compareLabel ? <p className="flex items-center gap-2 tabular-nums text-[color:var(--bone)]"><span aria-hidden className="h-0 w-3 border-t border-dashed border-[color:var(--bone2)]" />{compareLabel}<span className="ml-auto pl-2">{format(compare[hover])}</span></p> : null}
        </div>
      ) : null}
    </div>
  )
}

export default ChartKpi
