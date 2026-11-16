/**
 * Rolling digits, adapted from 21st.dev (edwinvakayil/rolling-digits): each digit of a number springs and rolls up or
 * down into place when the value changes; separators and signs hold still. What changed: framer-motion in place of
 * motion/react; values may be any preformatted text ("+29.6%", "13:37"), so a percentage or a time rolls as it reads;
 * the site's motion switch and the reader's reduced-motion setting draw the final text at once (it never waits on
 * screen as zeros), and a screen reader reads the final text only. Anchor's type, tabular figures.
 */
import * as React from 'react'
import { AnimatePresence, motion as m, useInView, useReducedMotion, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

const DIGIT = /\d/
type Cell = { key: string; char: string; digit: boolean }

/** Digits keyed by their place from the right, so "29.6" and "11.0" roll place by place; other characters by position. */
export function cellsOf(text: string): Cell[] {
  const chars = Array.from(text || '0')
  const fromRight: number[] = new Array(chars.length).fill(-1)
  let k = 0
  for (let i = chars.length - 1; i >= 0; i--) if (DIGIT.test(chars[i])) fromRight[i] = k++
  return chars.map((char, i) => ({ key: DIGIT.test(char) ? `d${fromRight[i]}` : `s${i}`, char, digit: DIGIT.test(char) }))
}

function DigitCell({ char, enterY }: { char: string; enterY: number }) {
  const [exits, setExits] = React.useState<{ id: number; char: string; y: number }[]>([])
  const prev = React.useRef(char)
  const first = React.useRef(true)
  const ids = React.useRef(0)
  const y = useSpring(0, { stiffness: 170, damping: 14 })
  const opacity = useSpring(1, { stiffness: 170, damping: 14 })
  React.useEffect(() => {
    const was = prev.current
    prev.current = char
    if (first.current) { first.current = false; return }
    if (was === char || !DIGIT.test(was)) return
    const up = Number(char) > Number(was)
    setExits((q) => [...q, { id: ids.current++, char: was, y: up ? -enterY : enterY }])
    y.jump(up ? enterY : -enterY)
    opacity.jump(0)
    y.set(0)
    opacity.set(1)
  }, [char, enterY, opacity, y])
  return (
    <span className="relative inline-grid overflow-hidden leading-[inherit] [&>*]:col-start-1 [&>*]:row-start-1">
      <AnimatePresence>
        {exits.map((x) => (
          <m.span
            key={x.id}
            aria-hidden
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: x.y }}
            transition={{ type: 'spring', stiffness: 170, damping: 16 }}
            onAnimationComplete={() => setExits((q) => q.filter((e) => e.id !== x.id))}
          >
            {x.char}
          </m.span>
        ))}
      </AnimatePresence>
      <m.span style={{ y, opacity }}>{char}</m.span>
    </span>
  )
}

export interface RollingDigitsProps {
  /** the text to show, already formatted */
  text: string
  /** roll in from zeros the first time it scrolls into view */
  startOnView?: boolean
  /** the site's motion switch */
  motion?: boolean
  /** announce changes (for values the reader changes, e.g. by picking a region) */
  live?: boolean
  className?: string
  /** how far a digit travels, px */
  enterY?: number
}

export function RollingDigits({ text, startOnView = true, motion = true, live = false, className, enterY = 28 }: RollingDigitsProps) {
  const reduce = useReducedMotion()
  const still = !motion || !!reduce
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const armed = still || !startOnView || inView
  const shown = armed ? text : text.replace(/\d/g, '0')
  return (
    <span ref={ref} className={cn('inline-flex items-baseline tabular-nums', className)}>
      <span className="sr-only" aria-live={live ? 'polite' : undefined}>{text}</span>
      <span aria-hidden className="inline-flex items-baseline">
        {still
          ? text
          : cellsOf(shown).map((c) => (c.digit ? <DigitCell key={c.key} char={c.char} enterY={enterY} /> : <span key={c.key}>{c.char}</span>))}
      </span>
    </span>
  )
}

export default RollingDigits
