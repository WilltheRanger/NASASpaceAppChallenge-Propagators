/**
 * Delay ruler: the year ruler's pattern for a span of time. One slider from `min` to `max` hours in `step` hours,
 * drawn as a ruler: every step is a notch, each whole hour a longer notch with its label, and the chosen value is a bone
 * marker with its value above it. An optional `band` lays the usual range under the notches as a hairline fill (the
 * same band the strips use for "usual"). Radix Slider underneath, so it is a real slider to assistive tech; arrow keys
 * move one step, Page Up/Down a bigger one.
 */
import * as Slider from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

/** NASA FIRMS: MODIS alerts typically arrive 60 to 125 minutes after the pass; 3 hours is the stated bound */
export const TYPICAL_DELAY: [number, number] = [1, 125 / 60]

/** a delay as "0 h", "45 min", "1 h 30" */
export function formatDelay(h: number) {
  const m = Math.round(h * 60)
  if (m === 0) return '0 h'
  const hh = Math.floor(m / 60)
  return hh ? (m % 60 ? `${hh} h ${String(m % 60).padStart(2, '0')}` : `${hh} h`) : `${m} min`
}

export interface DelayRulerProps {
  /** hours */
  value: number
  onValue: (hours: number) => void
  min?: number
  max?: number
  step?: number
  /** the usual range, in hours, drawn as a band under the notches */
  band?: [number, number]
  /** a word or two under the band, e.g. "typical" */
  bandLabel?: string
  /** what the slider is called, for screen readers */
  label: string
  /** how a value is shown on the marker and read out, e.g. 1.5 → "1 h 30" */
  format: (hours: number) => string
  className?: string
}

export function DelayRuler({ value, onValue, min = 0, max = 3, step = 0.25, band, bandLabel, label, format, className }: DelayRulerProps) {
  const n = Math.round((max - min) / step)
  const ticks = Array.from({ length: n + 1 }, (_, k) => min + k * step)
  // Radix keeps the 44 px thumb inside the track, so its centre runs from 22 px in to 22 px short of the end; the
  // notches sit on the same line
  const at = (h: number) => { const p = ((h - min) / (max - min)) * 100; return `calc(${p}% + ${(22 * (1 - p / 50)).toFixed(2)}px)` }
  const whole = (h: number) => Math.abs(h - Math.round(h)) < 1e-6
  return (
    <div className={cn('select-none', className)}>
      <Slider.Root
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => { if (v != null && v !== value) onValue(v) }}
        className="relative flex h-16 w-full cursor-pointer touch-none items-start"
      >
        <Slider.Track className="relative mt-7 h-9 w-full">
          {band ? (
            <span aria-hidden className="absolute top-0 h-3.5 bg-[color:var(--hairline)]" style={{ left: at(band[0]), width: `calc(${at(band[1])} - ${at(band[0])})` }} />
          ) : null}
          {/* the ruler's edge and its notches */}
          <span aria-hidden className="absolute inset-x-[22px] top-0 h-px bg-[color:var(--bone-30)]" />
          {ticks.map((h) => (
            <span key={h} aria-hidden className="absolute top-0 -translate-x-1/2" style={{ left: at(h) }}>
              <span className={cn('block w-px', whole(h) ? 'h-3.5 bg-[color:var(--bone2)]' : 'h-2 bg-[color:var(--bone-30)]')} />
            </span>
          ))}
          {ticks.filter(whole).map((h) => (Math.abs(h - value) > step * 1.5 ? (
            <span key={`l${h}`} aria-hidden className="absolute top-5 -translate-x-1/2 text-xs tabular-nums text-[color:var(--bone3)]" style={{ left: at(h) }}>{h} h</span>
          ) : null))}
          {band && bandLabel ? (
            <span aria-hidden className="absolute top-5 -translate-x-1/2 text-[11px] text-[color:var(--bone3)]" style={{ left: at((band[0] + band[1]) / 2), visibility: value >= band[0] - step && value <= band[1] + step ? 'hidden' : undefined }}>{bandLabel}</span>
          ) : null}
        </Slider.Track>
        <Slider.Thumb
          aria-label={label}
          aria-valuetext={format(value)}
          className="group relative block h-16 w-11 cursor-grab outline-none active:cursor-grabbing"
        >
          <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-[3px] bg-[color:var(--bone)] px-1.5 text-sm font-medium tabular-nums leading-6 text-[color:var(--ink)] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[color:var(--bone)]">{format(value)}</span>
          <span className="absolute left-1/2 top-6 h-6 w-0.5 -translate-x-1/2 bg-[color:var(--bone)]" />
        </Slider.Thumb>
      </Slider.Root>
    </div>
  )
}

export default DelayRuler
