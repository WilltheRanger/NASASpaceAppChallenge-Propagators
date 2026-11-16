/**
 * Year ruler: one slider across a run of years, drawn as a ruler. Every year is a notch; the first, the last and each
 * fifth year carry a longer notch and a label; the chosen year is a bone marker with its year above it. Drag anywhere
 * on the ruler, or use the arrow keys (Radix Slider underneath, so it is a real slider to assistive tech).
 */
import * as React from 'react'
import * as Slider from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

export interface YearRulerProps {
  years: number[]
  year: number
  onYear: (year: number) => void
  /** what the slider is called, for screen readers */
  label: string
  /** what a screen reader hears for a year, e.g. "2025: Aqua 14:57" */
  valueText?: (year: number) => string
  /** years to mark with a small dot under their notch (e.g. the year a drift started) */
  marks?: number[]
  className?: string
}

export function YearRuler({ years, year, onYear, label, valueText, marks = [], className }: YearRulerProps) {
  const n = years.length
  const i = Math.max(0, years.indexOf(year))
  // Radix keeps the 44 px thumb inside the track, so its centre runs from 22 px in to 22 px short of the end; the
  // notches sit on the same line
  const at = (k: number) => { const p = n < 2 ? 50 : (k / (n - 1)) * 100; return `calc(${p}% + ${(22 * (1 - p / 50)).toFixed(2)}px)` }
  const major = (k: number) => k === 0 || k === n - 1 || years[k] % 5 === 0
  // a label is dropped when it would sit on its neighbour (the last year next to a fifth year)
  const labelled = (k: number) => major(k) && !(k !== n - 1 && n - 1 - k < 3 && k !== 0) && !(k === 0 && n > 2 && years[1] % 5 === 0)
  return (
    <div className={cn('select-none', className)}>
      <Slider.Root
        min={0}
        max={Math.max(1, n - 1)}
        step={1}
        value={[i]}
        onValueChange={([v]) => { const y = years[v]; if (y != null && y !== year) onYear(y) }}
        aria-label={label}
        className="relative flex h-16 w-full cursor-pointer touch-none items-start"
      >
        <Slider.Track className="relative mt-7 h-9 w-full">
          {/* the ruler's edge and its notches */}
          <span aria-hidden className="absolute inset-x-[22px] top-0 h-px bg-[color:var(--bone-30)]" />
          {years.map((y, k) => (
            <span key={y} aria-hidden className="absolute top-0 -translate-x-1/2" style={{ left: at(k) }}>
              <span className={cn('block w-px', major(k) ? 'h-3.5 bg-[color:var(--bone2)]' : 'h-2 bg-[color:var(--bone-30)]')} />
              {marks.includes(y) ? <span className="absolute left-1/2 top-[18px] size-1 -translate-x-1/2 rounded-full bg-[color:var(--sat-aqua)]" /> : null}
            </span>
          ))}
          {years.map((y, k) => (labelled(k) && k !== i ? (
            <span key={`l${y}`} aria-hidden className="absolute top-5 -translate-x-1/2 text-xs tabular-nums text-[color:var(--bone3)]" style={{ left: at(k) }}>{y}</span>
          ) : null))}
        </Slider.Track>
        <Slider.Thumb
          aria-valuetext={valueText ? valueText(year) : String(year)}
          className="group relative block h-16 w-11 cursor-grab outline-none active:cursor-grabbing"
        >
          <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-[3px] bg-[color:var(--bone)] px-1.5 text-sm font-medium tabular-nums leading-6 text-[color:var(--ink)] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[color:var(--bone)]">{year}</span>
          <span className="absolute left-1/2 top-6 h-6 w-0.5 -translate-x-1/2 bg-[color:var(--bone)]" />
        </Slider.Thumb>
      </Slider.Root>
    </div>
  )
}

export default YearRuler
