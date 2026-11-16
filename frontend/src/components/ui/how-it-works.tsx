/**
 * How it works, adapted from 21st.dev (chamaac/how-it-works): numbered step cards joined by a dashed path, one card per
 * step. What changed: the tilted, pinned paper cards, the handwritten numerals and the endlessly flowing dash are gone;
 * in Anchor's world the cards sit square on the dark ground (4 px corners, hairline), the numerals are plain and
 * tabular, and the dashed path draws in once when the row comes into view (a line through the numerals, across on wide
 * screens and down the left on narrow ones). Each card takes a figure and a slot for details one click deeper.
 * framer-motion in place of motion/react; with motion off, or under reduced motion, everything is drawn at once and
 * nothing is ever hidden.
 */
import * as React from 'react'
import { motion as m, useInView, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface Step {
  title: string
  description: React.ReactNode
  figure?: React.ReactNode
  /** one click deeper: usually a disclosure */
  details?: React.ReactNode
}

export interface HowItWorksProps {
  steps: Step[]
  motion?: boolean
  className?: string
}

const EASE = [0.19, 1, 0.22, 1] as const

export function HowItWorks({ steps, motion = true, className }: HowItWorksProps) {
  const reduce = useReducedMotion()
  const still = !motion || !!reduce
  const ref = React.useRef<HTMLOListElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.15 })
  // drawn (and the cards shown) once in view; at once without motion
  const on = still || seen
  return (
    <ol ref={ref} className={cn('relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4', className)}>
      {/* the path through the numerals: down the left on narrow screens, across on wide ones */}
      <svg aria-hidden className="pointer-events-none absolute left-[27px] top-6 h-[calc(100%-48px)] w-px overflow-visible md:hidden" preserveAspectRatio="none" viewBox="0 0 1 100">
        <m.line x1={0.5} x2={0.5} y1={0} y2={100} stroke="var(--bone-30)" strokeWidth={1} strokeDasharray="4 5" vectorEffect="non-scaling-stroke"
          initial={still ? false : { pathLength: 0 }} animate={{ pathLength: on ? 1 : 0 }} transition={still ? { duration: 0 } : { duration: 1.5, ease: EASE }} />
      </svg>
      <svg aria-hidden className="pointer-events-none absolute inset-x-6 top-[27px] hidden h-px overflow-visible xl:block" preserveAspectRatio="none" viewBox="0 0 100 1">
        <m.line x1={0} x2={100} y1={0.5} y2={0.5} stroke="var(--bone-30)" strokeWidth={1} strokeDasharray="4 5" vectorEffect="non-scaling-stroke"
          initial={still ? false : { pathLength: 0 }} animate={{ pathLength: on ? 1 : 0 }} transition={still ? { duration: 0 } : { duration: 1.5, ease: EASE }} />
      </svg>
      {steps.map((s, i) => (
        <m.li
          key={s.title}
          className="relative flex min-w-0 flex-col rounded-[4px] border border-[color:var(--hairline)] bg-[color:var(--surface)] p-4 pl-16 md:pl-4"
          initial={still ? false : { opacity: 0, x: -24 }}
          animate={on ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
          transition={still ? { duration: 0 } : { duration: 1, ease: EASE, delay: 0.1 * i }}
        >
          <span aria-hidden className="absolute left-3 top-3 grid size-6 place-items-center rounded-[3px] bg-[color:var(--ground)] text-xs tabular-nums text-[color:var(--bone)] ring-1 ring-[color:var(--bone-30)] md:static md:mb-4 md:w-fit md:px-1.5">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 className="text-lg font-medium leading-6 text-[color:var(--bone)]">
            <span className="sr-only">Step {i + 1}: </span>{s.title}
          </h3>
          <div className="mt-2 text-sm text-[color:var(--bone2)]">{s.description}</div>
          {s.figure ? <div className="mt-4">{s.figure}</div> : null}
          {s.details ? <div className="mt-auto pt-3">{s.details}</div> : null}
        </m.li>
      ))}
    </ol>
  )
}

export default HowItWorks
