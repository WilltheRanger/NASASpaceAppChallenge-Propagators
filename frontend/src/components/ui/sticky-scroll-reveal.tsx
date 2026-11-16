/**
 * Sticky scroll reveal, adapted from 21st.dev (manuarora700/sticky-scroll-reveal): a picture holds still beside a short
 * list of steps; as each step scrolls past, it lights up and the picture follows it. What changed: it reads the page's
 * own scroll (the original scrolled a fixed-height box), the colour washes and gradients are gone, and the picture is
 * one persistent figure the caller draws for the active step (so a canvas is never rebuilt). Steps are buttons too: a
 * click or a tap makes that step the active one. On narrow screens the picture sits above the steps and the steps are
 * the control. Inactive steps dim to the page's muted text colour, never below 4.5:1. framer-motion in place of
 * motion/react; nothing here depends on motion, which only fades the step text.
 */
import * as React from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface StickyStep {
  /** a short marker shown before the title, e.g. a year */
  mark?: string
  title: string
  description?: React.ReactNode
}

export interface StickyScrollProps {
  steps: StickyStep[]
  /** the picture for the active step; drawn once and updated */
  panel: (active: number) => React.ReactNode
  /** start on this step (and follow it when it changes) */
  initial?: number
  onActive?: (i: number) => void
  /** the CSS top the picture sticks at (below any fixed bars) */
  top?: string
  motion?: boolean
  /** what the step list is called, for screen readers */
  label: string
  /** shown above the steps, beside the picture */
  intro?: React.ReactNode
  className?: string
}

function useWide() {
  const q = '(min-width: 1024px)'
  const [wide, setWide] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  React.useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export function StickyScroll({ steps, panel, initial = 0, onActive, top = '6rem', motion = true, label, intro, className }: StickyScrollProps) {
  const reduce = useReducedMotion()
  const still = !motion || !!reduce
  const wide = useWide()
  const [active, setActive] = React.useState(initial)
  React.useEffect(() => { setActive(initial) }, [initial])
  const pick = React.useCallback((i: number) => { setActive(i); onActive?.(i) }, [onActive])
  const ref = React.useRef<HTMLDivElement>(null)
  const stepRefs = React.useRef<(HTMLLIElement | null)[]>([])
  // the original split the scroll into equal breakpoints; here the active step is the last one whose top has passed a
  // reading line 45% down the screen, so the lit step is always the one being read
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  useMotionValueEvent(scrollYProgress, 'change', () => {
    if (!wide) return
    const line = window.innerHeight * 0.45
    let i = 0
    stepRefs.current.forEach((el, k) => { if (el && el.getBoundingClientRect().top <= line) i = k })
    if (i !== active) pick(i)
  })
  const go = (i: number) => {
    pick(i)
    if (!wide) return
    const el = stepRefs.current[i]
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4, behavior: still ? 'auto' : 'smooth' })
  }
  const list = (
    <ol aria-label={label} className={cn('flex flex-col', wide ? 'gap-0' : 'gap-2')}>
      {steps.map((s, i) => {
        const on = i === active
        return (
          <li key={s.title} ref={(el) => { stepRefs.current[i] = el }} className={cn(wide && 'min-h-[44svh]')}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => go(i)}
              className={cn(
                'group w-full border-t-2 pb-3 pr-2 pt-4 text-left outline-none',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]',
                !still && 'transition-colors duration-500 ease-[var(--ease)]',
                on ? 'border-[color:var(--bone)]' : 'border-[color:var(--hairline)]',
              )}
            >
              <span className={cn('block text-[length:var(--fs-32,32px)] font-medium leading-tight tracking-[-0.01em] xl:text-[40px] xl:tracking-[-0.02em]', !still && 'transition-colors duration-500', on ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone3)] group-hover:text-[color:var(--bone2)]')}>
                {s.mark ? <span className="tabular-nums">{s.mark} </span> : null}{s.title}
              </span>
              {s.description ? (
                <span className={cn('mt-3 block max-w-[var(--measure,36rem)] text-lg leading-[1.5] xl:text-xl', !still && 'transition-colors duration-500', on ? 'text-[color:var(--bone2)]' : 'text-[color:var(--bone3)]')}>
                  {s.description}
                </span>
              ) : null}
            </button>
          </li>
        )
      })}
    </ol>
  )
  if (!wide) {
    return (
      <div className={className}>
        {intro}
        <div>{panel(active)}</div>
        <div className="mt-6">{list}</div>
      </div>
    )
  }
  return (
    <div ref={ref} className={cn('grid grid-cols-12 gap-x-6', className)}>
      <div className="col-span-5 pb-[24svh]">{intro}{list}</div>
      <div className="col-span-7">
        <div className="sticky" style={{ top }}>{panel(active)}</div>
      </div>
    </div>
  )
}

export default StickyScroll
