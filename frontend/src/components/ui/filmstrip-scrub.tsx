/**
 * Filmstrip scrub — adapted from 21st.dev "Filmstrip Scrub" by rmahammad
 * (https://21st.dev/@rmahammad/components/filmstrip-scrub).
 *
 * Kept from the original: a strip of frames that is a real slider (arrow keys step a frame, Home/End jump),
 * a spring-loaded playhead (k=90, c=16) that chases the pointer, and a large preview that crossfades frame
 * ⌊p⌋ into ⌈p⌉ by the fractional part, so the blend reads as time passing. One rAF loop writes opacity and the
 * playhead offset straight to the DOM.
 * Changed for Anchor: frames are years and carry their own preview and thumbnail nodes; no idle auto-scrub and
 * no hover scrub (nothing moves until the reader does); the readout is a plain solid chip supplied by the caller
 * (no glass, no uppercase); colours come from --fs-* tokens; the preview height is set by the caller; the small
 * state, reduced-motion and visibility hooks are inlined; a "ruler" strip (the caller draws notches, no cell boxes) as
 * well as the original frames; a `still` override so a page-level motion switch can stop the spring.
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface FilmstripFrame {
  id: string
  /** what the large preview shows for this frame */
  preview: React.ReactNode
  /** what the strip cell shows for this frame */
  thumb: React.ReactNode
  /** accessible value text for this frame, e.g. "2025: fixed clock 13:18, Aqua 13:53" */
  valueText: string
}

export interface FilmstripScrubProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  frames: FilmstripFrame[]
  frameIndex: number
  onFrameIndexChange: (index: number) => void
  /** chip shown over the preview, for the nearest frame */
  readout?: (index: number) => React.ReactNode
  scrubberLabel: string
  previewClassName?: string
  stripClassName?: string
  /** "frames": a cell box per frame, dimmed until active (the original). "ruler": no boxes, the caller's notches only */
  variant?: 'frames' | 'ruler'
  playheadClassName?: string
  /** forces the reduced-motion path (no spring), e.g. from a page-level motion switch */
  still?: boolean
  stiffness?: number
  damping?: number
}

const SPRING_K = 90
const SPRING_C = 16
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [on, setOn] = React.useState(true)
  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return on
}

export function FilmstripScrub({
  frames, frameIndex, onFrameIndexChange, readout, scrubberLabel, previewClassName, stripClassName,
  variant = 'frames', playheadClassName, still: stillProp, stiffness = SPRING_K, damping = SPRING_C, className, ...props
}: FilmstripScrubProps) {
  const n = frames.length
  const maxIndex = Math.max(0, n - 1)
  const index = clamp(frameIndex, 0, maxIndex)

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const stripRef = React.useRef<HTMLDivElement | null>(null)
  const playheadRef = React.useRef<HTMLDivElement | null>(null)
  const layerRefs = React.useRef<Array<HTMLDivElement | null>>([])
  const thumbRefs = React.useRef<Array<HTMLDivElement | null>>([])
  const paintRef = React.useRef<() => void>(() => {})
  const onChangeRef = React.useRef(onFrameIndexChange)
  onChangeRef.current = onFrameIndexChange

  const prefersStill = usePrefersReducedMotion()
  const still = stillProp ?? prefersStill
  const onScreen = useOnScreen(rootRef)
  const animate = n > 0 && !still && onScreen

  const sim = React.useRef({ p: index, v: 0, target: index, dragging: false, shown: index, pointerId: null as number | null })
  const params = React.useRef({ maxIndex, stiffness, damping, still })
  params.current = { maxIndex, stiffness, damping, still }

  React.useEffect(() => {
    if (n === 0) return
    const paint = () => {
      const p = params.current, s = sim.current
      const i0 = clamp(Math.floor(s.p), 0, p.maxIndex), i1 = clamp(Math.ceil(s.p), 0, p.maxIndex)
      const frac = s.p - i0
      layerRefs.current.forEach((el, i) => {
        if (!el) return
        const next = (i === i0 ? 1 - (i1 !== i0 ? frac : 0) : i === i1 ? frac : 0).toFixed(3)
        if (el.style.opacity !== next) el.style.opacity = next
      })
      if (playheadRef.current) playheadRef.current.style.left = `${((clamp(s.p, 0, p.maxIndex) + 0.5) / (p.maxIndex + 1)) * 100}%`
      const act = clamp(Math.round(s.p), 0, p.maxIndex)
      if (act !== s.shown) {
        thumbRefs.current[s.shown]?.setAttribute('data-active', 'false')
        thumbRefs.current[act]?.setAttribute('data-active', 'true')
        s.shown = act
        onChangeRef.current(act)
      }
    }
    paintRef.current = paint
    paint()
    if (!animate) return
    let raf = 0
    let last = performance.now()
    const tick = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000))
      last = ts
      const p = params.current, s = sim.current
      s.v += ((s.target - s.p) * p.stiffness - s.v * p.damping) * dt
      s.p = clamp(s.p + s.v * dt, 0, p.maxIndex)
      paint()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animate, n])

  const seek = React.useCallback((next: number) => {
    const s = sim.current
    s.target = clamp(next, 0, params.current.maxIndex)
    if (params.current.still || !animate) { s.p = s.target; s.v = 0; paintRef.current() }
  }, [animate])

  // a change from outside (another control, a region switch) moves the playhead too
  React.useEffect(() => {
    if (n === 0 || index === sim.current.shown) return
    seek(index)
  }, [index, n, seek])

  const seekFromX = (clientX: number) => {
    const strip = stripRef.current
    if (!strip) return
    const r = strip.getBoundingClientRect()
    const n1 = params.current.maxIndex + 1
    seek(clamp(((clientX - r.left) / Math.max(1, r.width)) * n1 - 0.5, 0, params.current.maxIndex))
  }
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    sim.current.dragging = true
    sim.current.pointerId = e.pointerId
    e.currentTarget.setPointerCapture?.(e.pointerId)
    seekFromX(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (sim.current.dragging && e.pointerId === sim.current.pointerId) seekFromX(e.clientX)
  }
  const endDrag = () => {
    sim.current.dragging = false
    sim.current.pointerId = null
    // settle on the nearest whole frame, so the reel always rests on a real year
    seek(Math.round(sim.current.target))
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const cur = clamp(Math.round(sim.current.target), 0, maxIndex)
    const keys: Record<string, number> = { ArrowRight: cur + 1, ArrowUp: cur + 1, ArrowLeft: cur - 1, ArrowDown: cur - 1, Home: 0, End: maxIndex }
    if (!(e.key in keys)) return
    e.preventDefault()
    seek(clamp(keys[e.key], 0, maxIndex))
  }

  return (
    <div ref={rootRef} data-motion={still ? 'static' : 'animated'} className={cn('relative flex w-full flex-col', className)} {...props}>
      <div className={cn('relative w-full', previewClassName)}>
        {frames.map((f, i) => (
          <div key={f.id} ref={(el) => { layerRefs.current[i] = el }} aria-hidden className="absolute inset-0" style={{ opacity: i === index ? 1 : 0 }}>
            {f.preview}
          </div>
        ))}
        {readout ? <div className="pointer-events-none absolute left-0 top-0">{readout(index)}</div> : null}
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label={scrubberLabel}
        aria-valuemin={0}
        aria-valuemax={maxIndex}
        aria-valuenow={index}
        aria-valuetext={frames[index]?.valueText}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={cn(
          'relative shrink-0 cursor-ew-resize touch-pan-y select-none rounded-[4px] outline-none',
          'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-[color:var(--fs-accent)]',
          stripClassName,
        )}
      >
        <div ref={stripRef} className={cn('relative flex h-full overflow-hidden rounded-[4px]', variant === 'frames' && 'gap-[2px]')}>
          {frames.map((f, i) => (
            <div
              key={f.id}
              ref={(el) => { thumbRefs.current[i] = el }}
              aria-hidden
              data-active={i === index ? 'true' : 'false'}
              className={cn(
                'group relative min-w-0 flex-1',
                variant === 'frames' && [
                  'bg-[color:var(--fs-cell)] opacity-60 transition-opacity duration-150 data-[active=true]:opacity-100',
                  'data-[active=true]:after:pointer-events-none data-[active=true]:after:absolute data-[active=true]:after:inset-0 data-[active=true]:after:content-[\'\']',
                  'data-[active=true]:after:shadow-[inset_0_0_0_1.5px_var(--fs-accent)]',
                ],
              )}
            >
              {f.thumb}
            </div>
          ))}
        </div>
        {/* the playhead rides outside the strip's clip so its cap isn't cropped */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            ref={playheadRef}
            className={cn('absolute -top-2 bottom-0 z-10 -ml-px w-0.5 bg-[color:var(--fs-accent)]', playheadClassName)}
            style={{ left: `${((index + 0.5) / (maxIndex + 1)) * 100}%` }}
          >
            <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-[2px] bg-[color:var(--fs-accent)]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilmstripScrub
