/**
 * Compare slider, adapted from 21st.dev (diceui/compare-slider): two overlaid pictures and a draggable handle that
 * reveals one over the other, with keyboard steps (arrows, Shift or Page for tens, Home and End) and labels on each
 * side. What changed: `asChild` and the Radix Slot are gone, and the registry's small helpers (compose-refs, use-as-ref,
 * use-lazy-ref, use-isomorphic-layout-effect), which the response did not include, are written below in a few lines.
 * Restyled to Anchor's tokens: a bone handle with a 44 px knob, labels on a solid dark plate (no blur), a visible focus
 * ring; the root names itself (aria-label) and says how much of each side shows (aria-valuetext). Nothing animates on
 * its own, so it is the same with motion off.
 */
import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* minimal helpers */
function useLazyRef<T>(init: () => T) {
  const ref = React.useRef<T | null>(null)
  if (ref.current === null) ref.current = init()
  return ref as React.MutableRefObject<T>
}
function useAsRef<T>(value: T) {
  const ref = React.useRef(value)
  React.useLayoutEffect(() => { ref.current = value })
  return ref
}

const PAGE_KEYS = ['PageUp', 'PageDown']
const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

type State = { value: number; dragging: boolean }
type Store = { subscribe: (cb: () => void) => () => void; get: () => State; set: <K extends keyof State>(k: K, v: State[K]) => void }
const StoreCtx = React.createContext<Store | null>(null)
function useSlider<T>(pick: (s: State) => T, own?: Store | null) {
  const ctx = React.useContext(StoreCtx)
  const store = own ?? ctx
  if (!store) throw new Error('Compare slider parts must be used inside <CompareSlider>')
  const snap = React.useCallback(() => pick(store.get()), [store, pick])
  return React.useSyncExternalStore(store.subscribe, snap, snap)
}
const valueOf = (s: State) => s.value

export interface CompareSliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  step?: number
  /** what a screen reader hears for the slider, and for its position */
  label: string
  valueText?: (value: number) => string
}

export function CompareSlider({ value: valueProp, defaultValue = 50, onValueChange, step = 1, label, valueText, className, children, onKeyDown: onKeyDownProp, ...rest }: CompareSliderProps) {
  const state = useLazyRef<State>(() => ({ value: clamp(valueProp ?? defaultValue, 0, 100), dragging: false }))
  const listeners = useLazyRef(() => new Set<() => void>())
  const onChange = useAsRef(onValueChange)
  const store = React.useMemo<Store>(() => ({
    subscribe: (cb) => { listeners.current.add(cb); return () => listeners.current.delete(cb) },
    get: () => state.current,
    set: (k, v) => {
      if (Object.is(state.current[k], v)) return
      state.current = { ...state.current, [k]: v }
      if (k === 'value') onChange.current?.(v as number)
      for (const cb of listeners.current) cb()
    },
  }), [listeners, state, onChange])
  const value = useSlider(valueOf, store)
  React.useLayoutEffect(() => { if (valueProp !== undefined) store.set('value', clamp(valueProp, 0, 100)) }, [valueProp, store])

  const root = React.useRef<HTMLDivElement | null>(null)
  const dragging = React.useRef(false)
  const moveTo = (clientX: number) => {
    const r = root.current?.getBoundingClientRect()
    if (!r || !r.width) return
    store.set('value', clamp(((clientX - r.left) / r.width) * 100, 0, 100))
  }
  return (
    <StoreCtx.Provider value={store}>
      <div
        role="slider"
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-valuetext={valueText?.(value)}
        tabIndex={0}
        {...rest}
        ref={root}
        className={cn(
          'relative isolate w-full touch-pan-y select-none overflow-hidden outline-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]',
          className,
        )}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          dragging.current = true
          store.set('dragging', true)
          moveTo(e.clientX)
        }}
        onPointerMove={(e) => { if (dragging.current) moveTo(e.clientX) }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); dragging.current = false; store.set('dragging', false) }}
        onPointerCancel={() => { dragging.current = false; store.set('dragging', false) }}
        onKeyDown={(e) => {
          onKeyDownProp?.(e)
          if (e.defaultPrevented) return
          const cur = store.get().value
          if (e.key === 'Home') { e.preventDefault(); store.set('value', 0) }
          else if (e.key === 'End') { e.preventDefault(); store.set('value', 100) }
          else if (PAGE_KEYS.includes(e.key) || ARROW_KEYS.includes(e.key)) {
            e.preventDefault()
            const big = PAGE_KEYS.includes(e.key) || e.shiftKey
            const down = ['ArrowLeft', 'ArrowDown', 'PageDown'].includes(e.key)
            store.set('value', clamp(cur + step * (big ? 10 : 1) * (down ? -1 : 1), 0, 100))
          }
        }}
      >
        {children}
      </div>
    </StoreCtx.Provider>
  )
}

/** The picture on the right of the handle (revealed as the handle moves left). */
export function CompareSliderBefore({ className, children, label }: { className?: string; children: React.ReactNode; label?: React.ReactNode }) {
  const value = useSlider(valueOf)
  return (
    <div aria-hidden className={cn('absolute inset-0 size-full', className)} style={{ clipPath: `inset(0 0 0 ${value}%)` }}>
      {children}
      {label ? <CompareSliderLabel side="right">{label}</CompareSliderLabel> : null}
    </div>
  )
}

/** The picture on the left of the handle. */
export function CompareSliderAfter({ className, children, label }: { className?: string; children: React.ReactNode; label?: React.ReactNode }) {
  const value = useSlider(valueOf)
  return (
    <div aria-hidden className={cn('absolute inset-0 size-full', className)} style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}>
      {children}
      {label ? <CompareSliderLabel side="left">{label}</CompareSliderLabel> : null}
    </div>
  )
}

export function CompareSliderHandle({ className }: { className?: string }) {
  const value = useSlider(valueOf)
  return (
    <div aria-hidden className={cn('absolute inset-y-0 z-20 flex w-11 -translate-x-1/2 cursor-grab items-center justify-center active:cursor-grabbing', className)} style={{ left: `${value}%` }}>
      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-[color:var(--bone)] shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
      <span className="relative grid size-11 place-items-center rounded-full bg-[color:var(--bone)] text-[color:var(--ink)] shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
        <span className="flex items-center">
          <ChevronLeft size={16} strokeWidth={2.25} />
          <ChevronRight size={16} strokeWidth={2.25} />
        </span>
      </span>
    </div>
  )
}

export function CompareSliderLabel({ side, children }: { side: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <div className={cn('absolute top-3 z-10 max-w-[45%] rounded bg-[color:var(--plate)] px-2.5 py-1.5 text-xs leading-4 text-[color:var(--bone)] sm:text-sm sm:leading-5', side === 'left' ? 'left-3' : 'right-3 text-right')}>
      {children}
    </div>
  )
}

export default CompareSlider
