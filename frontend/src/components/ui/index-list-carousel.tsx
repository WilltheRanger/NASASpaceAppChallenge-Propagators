/**
 * Index List Carousel — adapted from 21st.dev "Index List Image Gallery" by kedhareswer
 * (https://21st.dev/@kedhareswer/components/index-list-carousel).
 * Original: big numbered titles on one side, one picture on the other; hover, tap or arrow
 * keys open a row and wipe its picture in (from the right going down the list, from the left
 * going back up); autoplay pauses while the pointer is inside.
 * Changes for Propagators: rows carry an index label (e.g. "/0.0") instead of 01, 02…, title and
 * label fonts come from CSS variables, and the painted-landscape fallback is dropped (every
 * row has a real image).
 */
import * as React from 'react'

export type IndexSlide = { image: string; title: string; caption?: string; alt?: string; index?: string; href?: string }

export function wrap(i: number, n: number) { return n ? ((i % n) + n) % n : 0 }
export function layerOf(i: number, active: number, previous: number): 'on' | 'was' | 'after' | 'before' {
  return i === active ? 'on' : i === previous ? 'was' : i > active ? 'after' : 'before'
}

const IL_CSS = [
  '.il-root{position:relative;width:100%;display:grid;grid-template-columns:minmax(300px,46%) 1fr;gap:clamp(16px,3vw,48px);box-sizing:border-box;overflow:hidden;background:var(--il-bg);color:var(--il-ink);outline:none}',
  '.il-root:focus-visible{box-shadow:inset 0 0 0 2px var(--il-ink)}',
  '.il-list{display:flex;flex-direction:column;justify-content:center;min-height:0;overflow:auto;scrollbar-width:none}',
  '.il-list::-webkit-scrollbar{display:none}',
  '.il-label{display:flex;justify-content:space-between;margin-bottom:18px;font:500 12px/1 var(--il-mono,ui-monospace,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--il-muted)}',
  '.il-row{appearance:none;display:grid;grid-template-columns:52px 1fr;column-gap:14px;align-items:baseline;width:100%;padding:12px 0;border:0;border-bottom:1px solid var(--il-line);background:transparent;color:var(--il-faint);text-align:left;cursor:pointer;transition:color .35s ease}',
  '.il-row:first-of-type{border-top:1px solid var(--il-line)}',
  ".il-row[data-on='1']{color:var(--il-ink)}",
  ".il-row>*{transition:transform .45s cubic-bezier(.2,.7,.2,1)}",
  ".il-row[data-on='1']>*{transform:translateX(12px)}",
  '.il-row:focus-visible{outline:2px solid var(--il-ink);outline-offset:2px}',
  '.il-num{font:500 12px/1 var(--il-mono,ui-monospace,monospace);color:var(--il-muted)}',
  '.il-title{font:var(--il-title-weight,300) clamp(26px,3.4vw,52px)/1.05 var(--il-title-font,ui-sans-serif,system-ui);letter-spacing:-.02em}',
  '.il-more{grid-column:2;display:grid;grid-template-rows:0fr;transition:grid-template-rows .45s cubic-bezier(.2,.7,.2,1)}',
  ".il-row[data-on='1'] .il-more{grid-template-rows:1fr}",
  '.il-more>span{overflow:hidden;font:400 14px/1.45 var(--il-body,ui-sans-serif,system-ui);color:var(--il-muted);padding-top:6px}',
  '.il-pane{position:relative;min-height:0;overflow:hidden;border-radius:var(--il-radius,4px);background:var(--il-line)}',
  '.il-pane img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;display:block;visibility:hidden;transform:scale(1.08)}',
  ".il-pane img[data-l='on']{visibility:visible;z-index:2;clip-path:inset(0 0 0 0);transform:none;transition:clip-path .85s cubic-bezier(.7,0,.2,1),transform 1.3s cubic-bezier(.2,.7,.2,1)}",
  ".il-pane img[data-l='was']{visibility:visible;z-index:1;transform:none}",
  ".il-pane img[data-l='after']{clip-path:inset(0 0 0 100%)}",
  ".il-pane img[data-l='before']{clip-path:inset(0 100% 0 0)}",
  '.il-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
  '@media (max-width:720px){.il-root{grid-template-columns:1fr;grid-template-rows:minmax(0,40%) 1fr}.il-root .il-list{order:2;justify-content:flex-start}.il-pane{order:1}}',
  '@media (prefers-reduced-motion:reduce){.il-pane img{transition:none!important;transform:none}.il-row,.il-row>*,.il-more{transition:none}}',
].join('\n')

export default function IndexListCarousel({
  slides, height = 640, label = 'Contents', autoplay = 0, background = '#ededed', ink = '#111', initial = 0, className, style, ariaLabel = 'Contents',
}: { slides: IndexSlide[]; height?: number | string; label?: string; autoplay?: number; background?: string; ink?: string; initial?: number; className?: string; style?: React.CSSProperties; ariaLabel?: string }) {
  const n = slides.length
  const [state, setState] = React.useState({ active: initial, previous: -1 })
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const inside = React.useRef(false)
  const lastTouch = React.useRef(0)
  const { active, previous } = state
  const show = React.useCallback((i: number) => setState((s) => (s.active === i ? s : { active: i, previous: s.active })), [])
  React.useEffect(() => {
    if (!autoplay || n < 2) return
    const t = window.setInterval(() => {
      if (document.hidden || inside.current || performance.now() - lastTouch.current < autoplay) return
      setState((s) => ({ active: wrap(s.active + 1, n), previous: s.active }))
    }, autoplay)
    return () => window.clearInterval(t)
  }, [autoplay, n])
  const touch = () => (lastTouch.current = performance.now())
  const onKey = (e: React.KeyboardEvent) => {
    let d = 0
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') d = 1
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') d = -1
    else return
    e.preventDefault(); touch(); show(wrap(active + d, n))
  }
  return (
    <div
      ref={rootRef}
      className={['il-root', className].filter(Boolean).join(' ')}
      style={{ height, ['--il-bg' as string]: background, ['--il-ink' as string]: ink, ['--il-muted' as string]: 'color-mix(in srgb, var(--il-ink) 58%, transparent)', ['--il-faint' as string]: 'color-mix(in srgb, var(--il-ink) 30%, transparent)', ['--il-line' as string]: 'color-mix(in srgb, var(--il-ink) 14%, transparent)', ...style }}
      role="region" aria-roledescription="carousel" aria-label={ariaLabel} tabIndex={0} onKeyDown={onKey}
      onPointerEnter={(e) => e.pointerType === 'mouse' && (inside.current = true)} onPointerLeave={() => (inside.current = false)}
    >
      <style>{IL_CSS}</style>
      <div className="il-list">
        <div className="il-label" aria-hidden="true"><span>{label}</span><span>{String(n).padStart(2, '0')}</span></div>
        {slides.map((sl, i) => (
          <button key={i} type="button" className="il-row" data-on={i === active ? '1' : '0'} aria-current={i === active ? 'true' : undefined}
            onMouseEnter={() => show(i)} onFocus={() => show(i)} onClick={() => (touch(), show(i))}>
            <span className="il-num">{sl.index ?? String(i + 1).padStart(2, '0')}</span>
            <span className="il-title">{sl.title}</span>
            {sl.caption ? <span className="il-more"><span>{sl.caption}</span></span> : null}
          </button>
        ))}
      </div>
      <div className="il-pane">
        {slides.map((sl, i) => <img key={i} src={sl.image} alt={i === active ? sl.alt || sl.title : ''} data-l={layerOf(i, active, previous)} draggable={false} />)}
      </div>
      <div className="il-sr" aria-live="polite">{`${slides[active]?.title}, ${active + 1} of ${n}`}</div>
    </div>
  )
}
