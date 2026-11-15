/**
 * Scroll spy, adapted from 21st.dev (ddoemonn/scroll-spy): a bar of section links that follows the section in view and
 * marks it with a sliding pill; a click takes you there and the bar keeps up. Includes its useScrollSpy hook. What
 * changed: framer-motion in place of motion/react; Anchor's tokens (a bone pill with dark text on a hairline track,
 * 4 px corners, 44 px tall links on touch screens); the page may scroll itself (`onNavigate`, so the site's eased
 * scrolling and its motion switch apply); the pill jumps instead of sliding with motion off or under reduced motion.
 */
import * as React from 'react'
import { motion as m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

const CELL = { type: 'spring', stiffness: 520, damping: 34, mass: 0.45 } as const
const SETTLE = 420
const RELEASE = 900

export type ScrollSpySection = { id: string; label: string }

export function useScrollSpy({ sections, offset = 120, onNavigate, still }: { sections: ScrollSpySection[]; offset?: number; onNavigate?: (el: HTMLElement) => void; still: boolean }) {
  const [activeId, setActiveId] = React.useState(() => sections[0]?.id ?? '')
  const [announce, setAnnounce] = React.useState('')
  const list = React.useRef(sections)
  list.current = sections
  const frame = React.useRef(0)
  const lock = React.useRef<string | null>(null)
  const lockTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const started = React.useRef(false)
  const key = sections.map((s) => s.id).join('|')

  /** the last section whose top has passed a line that slides from the offset down the screen as the page ends */
  const measure = React.useCallback(() => {
    const items = list.current
    if (!items.length) return ''
    const max = document.documentElement.scrollHeight - window.innerHeight
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1
    const line = offset + ratio * Math.max(0, window.innerHeight - offset - 1)
    let current = ''
    let last = ''
    for (const it of items) {
      const node = document.getElementById(it.id)
      if (!node) continue
      last = it.id
      if (!current) current = it.id
      if (node.getBoundingClientRect().top <= line + 1) current = it.id
    }
    const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
    return atEnd && last ? last : current
  }, [offset])

  const release = React.useCallback(() => {
    lock.current = null
    if (lockTimer.current) { clearTimeout(lockTimer.current); lockTimer.current = null }
  }, [])

  const sync = React.useCallback(() => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const next = measure()
      if (!next) return
      if (lock.current) { if (lock.current === next) release(); return }
      setActiveId((p) => (p === next ? p : next))
    })
  }, [measure, release])

  React.useEffect(() => {
    const abandon = () => { if (lock.current) release() }
    window.addEventListener('scroll', sync, { passive: true, capture: true })
    window.addEventListener('resize', sync)
    window.addEventListener('wheel', abandon, { passive: true })
    window.addEventListener('touchstart', abandon, { passive: true })
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync)
    ro?.observe(document.documentElement)
    sync()
    return () => {
      window.removeEventListener('scroll', sync, { capture: true })
      window.removeEventListener('resize', sync)
      window.removeEventListener('wheel', abandon)
      window.removeEventListener('touchstart', abandon)
      ro?.disconnect()
      cancelAnimationFrame(frame.current)
      frame.current = 0
      if (lockTimer.current) clearTimeout(lockTimer.current)
    }
  }, [sync, release, key])

  React.useEffect(() => {
    if (!activeId) return
    if (!started.current) { started.current = true; return }
    const t = setTimeout(() => setAnnounce(list.current.find((s) => s.id === activeId)?.label ?? ''), SETTLE)
    return () => clearTimeout(t)
  }, [activeId])

  const scrollTo = React.useCallback((id: string, byKeyboard: boolean) => {
    const node = document.getElementById(id)
    if (!node) return
    lock.current = id
    setActiveId(id)
    if (onNavigate) onNavigate(node)
    else window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - offset, behavior: still ? 'auto' : 'smooth' })
    // keyboard users land on the section's heading
    if (byKeyboard) {
      const f = (node.querySelector('h2, h3') as HTMLElement | null) ?? node
      if (!f.hasAttribute('tabindex')) f.setAttribute('tabindex', '-1')
      f.focus({ preventScroll: true })
    }
    if (lockTimer.current) clearTimeout(lockTimer.current)
    lockTimer.current = setTimeout(() => { lock.current = null; lockTimer.current = null; sync() }, RELEASE)
  }, [offset, onNavigate, still, sync])

  const linkProps = React.useCallback((id: string) => ({
    href: `#${id}`,
    'aria-current': id === activeId ? ('location' as const) : undefined,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      scrollTo(id, e.detail === 0)
    },
  }), [activeId, scrollTo])

  return { activeId, scrollTo, linkProps, announce }
}

export interface ScrollSpyProps {
  sections: ScrollSpySection[]
  /** px from the top of the window where a section counts as reached (the bars above it) */
  offset?: number
  onNavigate?: (el: HTMLElement) => void
  label?: string
  motion?: boolean
  className?: string
}

export function ScrollSpy({ sections, offset = 120, onNavigate, label = 'On this page', motion = true, className }: ScrollSpyProps) {
  const reduce = useReducedMotion()
  const still = !motion || !!reduce
  const { activeId, linkProps, announce } = useScrollSpy({ sections, offset, onNavigate, still })
  const pill = React.useId()
  const chips = React.useRef(new Map<string, HTMLElement>())
  // keep the active link in view when the bar scrolls sideways (phones)
  React.useEffect(() => {
    const el = chips.current.get(activeId)
    const row = el?.parentElement
    if (!el || !row || row.scrollWidth <= row.clientWidth) return
    row.scrollTo({ left: el.offsetLeft - row.clientWidth / 2 + el.offsetWidth / 2, behavior: still ? 'auto' : 'smooth' })
  }, [activeId, still])
  return (
    <nav aria-label={label} className={cn('min-w-0', className)}>
      <ol className="relative flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((s) => {
          const on = s.id === activeId
          return (
            <li key={s.id} ref={(el) => { if (el) chips.current.set(s.id, el); else chips.current.delete(s.id) }} className="relative shrink-0">
              {on ? (
                <m.span layoutId={still ? undefined : pill} aria-hidden transition={CELL} className="absolute inset-0 rounded-[4px] bg-[color:var(--bone)]" />
              ) : null}
              <a
                {...linkProps(s.id)}
                className={cn(
                  'relative flex h-11 items-center whitespace-nowrap rounded-[4px] px-3 text-sm outline-none transition-colors duration-150 lg:h-9',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]',
                  on ? 'text-[color:var(--ink)]' : 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]',
                )}
              >
                {s.label}
              </a>
            </li>
          )
        })}
      </ol>
      <p aria-live="polite" className="sr-only">{announce}</p>
    </nav>
  )
}

export default ScrollSpy
