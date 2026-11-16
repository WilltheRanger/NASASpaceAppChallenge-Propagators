/**
 * Segmented control, adapted from 21st.dev (ddoemonn/segmented-control): a radio group whose thumb slides between the
 * options. The labels under the thumb are drawn a second time inside it, in the thumb's ink, so the text inverts as
 * the thumb passes. Arrow keys, Home and End move the choice; only the chosen option is in the tab order. Restyled to
 * Anchor's tokens, with CSS transitions in place of a motion library; `motion={false}` makes every move instant.
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

export type Segment<T> = { value: T; label: React.ReactNode; /** the option's name for screen readers */ name: string; disabled?: boolean }

export interface SegmentedControlProps<T> {
  options: Segment<T>[]
  value: T
  onChange: (value: T) => void
  /** the group's name for screen readers */
  label: string
  motion?: boolean
  className?: string
  /** classes for each option's label box (padding, text size) */
  segmentClassName?: string
}

export function SegmentedControl<T extends string | number>({ options, value, onChange, label, motion = true, className, segmentClassName }: SegmentedControlProps<T>) {
  const count = Math.max(1, options.length)
  const found = options.findIndex((o) => o.value === value)
  const index = found < 0 ? 0 : found
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([])
  const template = `repeat(${count}, minmax(0, 1fr))`
  const slide = motion ? 'transition-transform duration-[260ms] ease-[var(--ease)] motion-reduce:transition-none' : ''
  const seg = cn('px-3 py-1.5 text-sm', segmentClassName)

  const seek = (from: number, dir: number) => {
    let i = from
    for (let k = 0; k < count; k++) {
      i = (i + dir + count) % count
      if (!options[i]?.disabled) return i
    }
    return from
  }
  const go = (i: number) => {
    const o = options[i]
    if (!o || o.disabled) return
    buttons.current[i]?.focus()
    if (o.value !== value) onChange(o.value)
  }
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(seek(i, 1)) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(seek(i, -1)) }
    else if (e.key === 'Home') { e.preventDefault(); go(seek(count - 1, 1)) }
    else if (e.key === 'End') { e.preventDefault(); go(seek(0, -1)) }
  }

  return (
    <div role="radiogroup" aria-label={label} className={cn('relative select-none rounded border border-[color:var(--hairline)] bg-[color:var(--surface)] p-[3px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--bone)]', className)}>
      <div className="relative grid" style={{ gridTemplateColumns: template, touchAction: 'manipulation' }}>
        {options.map((o) => (
          <span key={String(o.value)} aria-hidden className={cn(seg, 'pointer-events-none', o.disabled ? 'text-[color:var(--bone3)] opacity-50' : 'text-[color:var(--bone2)]')}>
            {o.label}
          </span>
        ))}
        {/* the thumb, carrying the same labels in ink, shifted so they sit exactly over the ones beneath */}
        <div
          aria-hidden
          className={cn('pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-[3px] bg-[color:var(--bone)] shadow-[0_1px_3px_rgba(0,0,0,0.5)]', slide)}
          style={{ width: `${100 / count}%`, transform: `translateX(${index * 100}%)` }}
        >
          <div className={cn('absolute inset-y-0 left-0 grid', slide)} style={{ width: `${count * 100}%`, gridTemplateColumns: template, transform: `translateX(${(-index * 100) / count}%)` }}>
            {options.map((o) => <span key={String(o.value)} className={cn(seg, 'text-[color:var(--ink)]')}>{o.label}</span>)}
          </div>
        </div>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: template }}>
          {options.map((o, i) => (
            <button
              key={String(o.value)}
              ref={(node) => { buttons.current[i] = node }}
              type="button"
              role="radio"
              aria-checked={i === index}
              aria-label={o.name}
              aria-disabled={o.disabled || undefined}
              tabIndex={i === index ? 0 : -1}
              onClick={() => { if (!o.disabled && o.value !== value) onChange(o.value) }}
              onKeyDown={(e) => onKeyDown(e, i)}
              className="rounded-[3px] outline-none transition-colors duration-150 hover:bg-[color:var(--bone)]/[0.04] focus-visible:shadow-[inset_0_0_0_2px_var(--ink),inset_0_0_0_4px_var(--bone)] aria-checked:hover:bg-transparent"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default SegmentedControl
