/**
 * Delta ticker, adapted from 21st.dev (dhxwhy/delta-number-ticker): the digits of a value roll to its new value, column
 * by column from the right; a chip beside it gives the difference from a reference value, lifting off the number when
 * it changes; and the old value lingers under it for a moment ("was 43,002"). Here the reference is the other clock, so
 * flipping Aqua's clock shows how much each figure moves and which way. Any text with digits rolls (14:57, 1 h 30 min);
 * restyled to Anchor's tokens, with a neutral chip (a change is neither good nor bad here). Web Animations only.
 */
import * as React from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Group = 'lead' | 'int' | 'frac' | 'tail'
type Cell = { key: string; char: string; kind: 'digit' | 'glyph'; group: Group; order: number }
type Layout = { text: string; cells: Cell[]; byKey: Record<string, Cell>; digits: number }
type ChipState = { id: number; text: string; up: boolean; leaving: boolean; animate: boolean }
type GhostState = { id: number; text: string; out: boolean }

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)'
const EASE_FLIGHT = 'cubic-bezier(0.65, 0, 0.35, 1)'
const STRIP = [...'01234567890123456789']
const MASK = 'linear-gradient(to bottom, transparent, black 5px, black calc(100% - 5px), transparent)'
const isDigit = (c: string) => c >= '0' && c <= '9'

/** everything before the first digit is the lead, after the last digit the tail; the body keeps its own separators */
function split(text: string) {
  let first = -1, last = -1
  for (let i = 0; i < text.length; i++) if (isDigit(text[i])) { if (first < 0) first = i; last = i }
  if (first < 0) return { lead: text, integer: '', fraction: '', tail: '' }
  const body = text.slice(first, last + 1)
  const dot = body.lastIndexOf('.')
  const frac = dot > 0 && [...body.slice(dot + 1)].every(isDigit)
  return { lead: text.slice(0, first), integer: frac ? body.slice(0, dot) : body, fraction: frac ? body.slice(dot) : '', tail: text.slice(last + 1) }
}

/** cells keyed from the right, so a value that gains a digit grows a column on the left instead of re-rolling all */
function layoutOf(text: string): Layout {
  const { lead, integer, fraction, tail } = split(text)
  const cells: Cell[] = []
  const push = (group: Group, chars: string, keyOf: (i: number, n: number) => string) => {
    const list = [...chars]
    list.forEach((char, i) => cells.push({ key: keyOf(i, list.length), char, kind: isDigit(char) ? 'digit' : 'glyph', group, order: 0 }))
  }
  push('lead', lead, (i) => `l${i}`)
  push('int', integer, (i, n) => `i${n - 1 - i}`)
  push('frac', fraction, (i) => `f${i}`)
  push('tail', tail, (i) => `t${i}`)
  let order = 0
  for (let i = cells.length - 1; i >= 0; i--) if (cells[i].kind === 'digit') cells[i].order = order++
  const byKey: Record<string, Cell> = {}
  for (const c of cells) byKey[c.key] = c
  return { text, cells, byKey, digits: order }
}

/** strip positions (0..19) to roll from one digit to another, always in the value's direction */
function rollRange(from: number, to: number, up: boolean): [number, number] {
  let start = from
  let target = up ? to : to + 10
  if (up) { while (target <= start) target += 10 } else { while (target >= start) target -= 10 }
  if (target > 19) { target -= 10; start -= 10 }
  if (target < 0) { target += 10; start += 10 }
  return [start, target]
}

function CellView({ cell, up, still, duration, stagger, grow, leaving, onGone }: {
  cell: Cell; up: boolean | null; still: boolean; duration: number; stagger: number; grow: boolean; leaving: boolean; onGone: (key: string) => void
}) {
  const node = React.useRef<HTMLSpanElement | null>(null)
  const strip = React.useRef<HTMLSpanElement | null>(null)
  const digit = cell.kind === 'digit'
  const shown = React.useRef(grow && digit ? 0 : Number(cell.char))
  const delay = cell.order * stagger

  React.useLayoutEffect(() => {
    const el = node.current
    if (!grow || !el || still || typeof el.animate !== 'function') return
    const w = el.getBoundingClientRect().width
    const a = el.animate([{ width: '0px', opacity: 0 }, { width: `${w}px`, opacity: 1 }], { duration, delay, easing: EASE, fill: 'backwards' })
    return () => a.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  React.useLayoutEffect(() => {
    if (!digit) return
    const el = strip.current
    const to = Number(cell.char)
    let from = shown.current
    shown.current = to
    if (!el) return
    const running = el.getAnimations().filter((a) => a.playState === 'running')
    if (running.length) {
      const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(el).transform)
      const ty = m ? Number(m[1]?.split(',')[5]) : NaN
      const glyph = el.offsetHeight / STRIP.length
      if (Number.isFinite(ty) && glyph > 0) from = Math.min(19, Math.max(0, -ty / glyph))
      for (const a of running) a.cancel()
    }
    el.style.transform = `translateY(-${to * 5}%)`
    if (still || up == null || typeof el.animate !== 'function' || (from === to && !running.length)) return
    const [s, e] = rollRange(from, to, up)
    el.animate([{ transform: `translateY(-${s * 5}%)` }, { transform: `translateY(-${e * 5}%)` }], { duration, delay, easing: EASE, fill: 'backwards' })
  }, [cell.char]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useLayoutEffect(() => {
    if (!leaving) return
    const el = node.current
    if (!el || still || typeof el.animate !== 'function') { onGone(cell.key); return }
    const w = el.getBoundingClientRect().width
    const a = el.animate([{ width: `${w}px`, opacity: 1 }, { width: '0px', opacity: 0 }], { duration: Math.max(1, duration * 0.7), easing: EASE_IN, fill: 'forwards' })
    a.onfinish = () => onGone(cell.key)
    return () => a.cancel()
  }, [leaving]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span ref={node} className={cn('relative inline-block overflow-hidden', !digit && 'whitespace-pre')}>
      {digit ? (
        <>
          <span className="invisible">0</span>
          <span ref={strip} className="absolute inset-x-0 top-0 flex flex-col text-center" style={{ transform: `translateY(-${Number(cell.char) * 5}%)` }}>
            {STRIP.map((g, i) => <span key={i} className="block">{g}</span>)}
          </span>
        </>
      ) : cell.char}
    </span>
  )
}

function Chip({ chip, still, valueRef, onGone }: { chip: ChipState; still: boolean; valueRef: React.RefObject<HTMLSpanElement | null>; onGone: (id: number) => void }) {
  const ref = React.useRef<HTMLSpanElement | null>(null)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || !chip.animate || typeof el.animate !== 'function') return
    if (still) { const f = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 }); return () => f.cancel() }
    const to = el.getBoundingClientRect()
    const from = valueRef.current ? valueRef.current.getBoundingClientRect() : to
    const dx = from.left - to.left, dy = from.bottom + 4 - to.top
    const a = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.92)`, opacity: 0 },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 5}px) scale(1.02)`, opacity: 1, offset: 0.55 },
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      ],
      { duration: 420, easing: EASE_FLIGHT },
    )
    return () => a.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    if (!chip.leaving) return
    const el = ref.current
    if (!el || still || typeof el.animate !== 'function') { onGone(chip.id); return }
    const a = el.animate([{ transform: 'translateX(0px)', opacity: 1 }, { transform: 'translateX(10px)', opacity: 0 }], { duration: 200, easing: EASE_IN, fill: 'forwards' })
    a.onfinish = () => onGone(chip.id)
    return () => a.cancel()
  }, [chip.leaving]) // eslint-disable-line react-hooks/exhaustive-deps
  const Arrow = chip.up ? ArrowUpRight : ArrowDownRight
  return (
    <span ref={ref} aria-hidden className="col-start-1 row-start-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[color:var(--raised)] px-2 py-0.5 text-xs tabular-nums text-[color:var(--bone)]">
      <Arrow className="size-3" strokeWidth={2.25} />
      {chip.text}
    </span>
  )
}

export interface DeltaTickerProps {
  value: number
  /** the value the chip measures against (here, the other clock's) */
  basis: number | null
  format: (v: number) => string
  /** the chip's text for a difference, e.g. "+9,830" */
  formatDelta: (d: number) => string
  /** after the difference in the chip, e.g. "vs fixed clock" */
  suffix?: string
  /** what a screen reader hears before the value */
  label: string
  motion?: boolean
  className?: string
  valueClassName?: string
  duration?: number
  stagger?: number
}

export function DeltaTicker({ value, basis, format, formatDelta, suffix, label, motion = true, className, valueClassName, duration = 420, stagger = 20 }: DeltaTickerProps) {
  const reduced = usePrefersReduced()
  const still = !motion || reduced
  const layout = React.useMemo(() => layoutOf(format(value)), [value, format])
  const [chips, setChips] = React.useState<ChipState[]>([])
  const [leaving, setLeaving] = React.useState<Cell[]>([])
  const [ghost, setGhost] = React.useState<GhostState | null>(null)
  const valueRef = React.useRef<HTMLSpanElement | null>(null)
  const shownRef = React.useRef(value)
  const cellsRef = React.useRef(layout.byKey)
  const mounted = React.useRef(false)
  const ids = React.useRef(0)
  const ghostTimer = React.useRef(0)

  const shownValue = shownRef.current
  const previousCells = cellsRef.current
  const up = value > shownValue ? true : value < shownValue ? false : null

  const chipFor = (animate: boolean): ChipState | null => {
    if (basis == null || value === basis) return null
    const d = value - basis
    ids.current += 1
    return { id: ids.current, text: `${formatDelta(d)}${suffix ? ` ${suffix}` : ''}`, up: d > 0, leaving: false, animate }
  }

  React.useLayoutEffect(() => {
    const from = shownRef.current
    shownRef.current = value
    cellsRef.current = layout.byKey
    if (!mounted.current) {
      mounted.current = true
      const c = chipFor(false)
      setChips(c ? [c] : [])
      return
    }
    if (from === value) {
      const c = chipFor(false)
      setChips(c ? [c] : [])
      return
    }
    const gone = Object.values(previousCells).filter((c) => !(c.key in layout.byKey) && (c.group === 'int' || c.group === 'frac'))
    setLeaving((list) => [...list.filter((c) => !(c.key in layout.byKey) && !gone.some((o) => o.key === c.key)), ...(still ? [] : gone)])
    const c = chipFor(true)
    setChips((list) => [...list.filter((o) => !o.leaving).map((o) => ({ ...o, leaving: true })), ...(c ? [c] : [])])
    const id = ids.current + 1000
    setGhost({ id, text: format(from), out: false })
    window.clearTimeout(ghostTimer.current)
    ghostTimer.current = window.setTimeout(() => setGhost((g) => (g && g.id === id ? { ...g, out: true } : g)), 1400)
  }, [value, basis]) // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => () => window.clearTimeout(ghostTimer.current), [])

  const removeChip = React.useCallback((id: number) => setChips((l) => l.filter((c) => c.id !== id)), [])
  const removeCell = React.useCallback((key: string) => setLeaving((l) => l.filter((c) => c.key !== key)), [])
  const current = chips.find((c) => !c.leaving) ?? null
  const cell = (c: Cell) => <CellView key={c.key} cell={c} up={up} still={still} duration={duration} stagger={stagger} grow={!(c.key in previousCells)} leaving={false} onGone={removeCell} />
  const gone = (c: Cell) => <CellView key={`x-${c.key}`} cell={c} up={null} still={still} duration={duration} stagger={stagger} grow={false} leaving onGone={removeCell} />
  const by = (g: Group) => layout.cells.filter((c) => c.group === g)

  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-baseline gap-2 overflow-hidden">
        <span className="sr-only">{label}: {layout.text}{current ? `, ${current.text}` : ''}</span>
        <span ref={valueRef} aria-hidden className={cn('relative flex items-baseline whitespace-nowrap tabular-nums', valueClassName)} style={{ maskImage: MASK, WebkitMaskImage: MASK }}>
          {by('lead').map(cell)}
          {leaving.filter((c) => c.group === 'int').map(gone)}
          {by('int').map(cell)}
          {by('frac').map(cell)}
          {leaving.filter((c) => c.group === 'frac').map(gone)}
          {by('tail').map(cell)}
        </span>
        <span aria-hidden className="whitespace-nowrap text-xs tabular-nums text-[color:var(--bone3)]">
          {ghost ? <Ghost key={ghost.id} ghost={ghost} still={still} onGone={(id) => setGhost((g) => (g && g.id === id ? null : g))} /> : null}
        </span>
      </div>
      <span className="relative inline-grid shrink-0 justify-items-end self-center">
        {chips.map((c) => <Chip key={c.id} chip={c} still={still} valueRef={valueRef} onGone={removeChip} />)}
      </span>
    </div>
  )
}

function Ghost({ ghost, still, onGone }: { ghost: GhostState; still: boolean; onGone: (id: number) => void }) {
  const ref = React.useRef<HTMLSpanElement | null>(null)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== 'function') return
    const a = still
      ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 })
      : el.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'translateY(0px)' }], { duration: 300, delay: 120, easing: EASE, fill: 'backwards' })
    return () => a.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    if (!ghost.out) return
    const el = ref.current
    if (!el || typeof el.animate !== 'function') { onGone(ghost.id); return }
    const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: still ? 120 : 400, easing: 'ease-in', fill: 'forwards' })
    a.onfinish = () => onGone(ghost.id)
    return () => a.cancel()
  }, [ghost.out]) // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className="inline-block">was {ghost.text}</span>
}

function usePrefersReduced() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setReduced(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return reduced
}

export default DeltaTicker
