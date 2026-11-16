// What every page of the site shares (moved out of FieldFilm.tsx so the pages import it instead of each other): the
// tokens, the motion switch and its hooks, eased scrolling, the page classes, the bar with the four-page menu, the
// footer, the sources, the plain-words constants, and the satellite marks. Every number still comes from src/r2/data.ts.
import { createContext, useContext, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { AnchorLogo, AnchorMark } from '@/components/brand/anchor-logo'
import { ElasticSwitch } from '@/components/ui/elastic-switch'
import { REGIONS, phrase, regionData } from '@/r2/data'
import { OVERVIEW_PHOTO, photoFor } from '@/r2/photos'
import { cn } from '@/lib/utils'

/* ---------- Tokens: black ground, bone text; the photographs carry the colour, and each satellite has one on the charts ---------- */

export const BASE_TOKENS = {
  '--ground': '#0B0D0B',
  '--surface': '#121413',
  '--raised': '#1C1F1D',
  '--bone': '#ECE9E1',
  '--bone-hover': '#D6D3CB',
  '--bone2': '#C6C7C0',
  '--bone3': '#A4A69F',
  '--bone-80': 'rgba(236, 233, 225, 0.8)',
  '--bone-30': 'rgba(236, 233, 225, 0.3)',
  '--bone-20': 'rgba(236, 233, 225, 0.2)',
  '--hairline': 'rgba(236, 233, 225, 0.1)',
  // one colour per satellite on every chart and the globe; the markers' shapes carry the same identity
  '--sat-aqua': '#C8801F',
  '--sat-terra': '#448BCB',
  '--sat-viirs': '#49A46E',
  '--ink': '#0B0D0B',
  '--ink-20': 'rgba(11, 13, 11, 0.2)',
  '--shadow-menu': '0 8px 24px rgba(0, 0, 0, 0.5)',
  '--ring-in': 'inset 0 0 0 2px #ECE9E1',
  '--ring-in-on': 'inset 0 0 0 2px #0B0D0B',
  '--f-ui': "'Albert Sans', ui-sans-serif, system-ui, sans-serif",
  '--ease': 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

export const TOKENS = {
  ...BASE_TOKENS,
  colorScheme: 'dark',
  // type: 12 / 14 / 18 come from text-xs / text-sm / text-lg; these are the others
  '--fs-32': '32px',
  '--fs-40': '40px',
  '--fs-72': '72px',
  // the statement: a region's name over its footage, the overview's first line
  '--fs-display': 'clamp(56px, 11vw, 168px)',
  '--lh-display': '1.02',
  '--track-display': '-0.03em',
  '--track-title': '-0.01em',
  // layout
  '--maxw': '1440px',
  '--measure': '36rem',
  '--select-max': '168px',
  '--select-max-wide': '240px',
  '--scrim-tile': 'linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.5) 22%, rgba(0, 0, 0, 0) 52%)',
  // the region's name over its footage: a little at the top for the bar, more at the bottom for the name
  '--scrim-statement': 'linear-gradient(180deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.4) 12%, rgba(0, 0, 0, 0) 26%, rgba(0, 0, 0, 0) 42%, rgba(0, 0, 0, 0.5) 72%, rgba(0, 0, 0, 0.78) 100%)',
  // a dark plate for labels over photographs
  '--plate': 'rgba(11, 13, 11, 0.86)',
  // calendar (dark; brighter = further from the median): sand above, slate below
  '--cal-up-1': '#3F301B',
  '--cal-up-2': '#604825',
  '--cal-up-3': '#876533',
  '--cal-up-4': '#AE8446',
  '--cal-up-5': '#D6A866',
  '--cal-down-1': '#1C313D',
  '--cal-down-2': '#29495C',
  '--cal-down-3': '#36647D',
  '--cal-down-4': '#4B82A1',
  '--cal-down-5': '#68A4C6',
  '--cal-mid': '#1D1F1D',
  '--cal-seq-1': '#2A2A22',
  '--cal-seq-2': '#3F301B',
  '--cal-seq-3': '#604825',
  '--cal-seq-4': '#876533',
  '--cal-seq-5': '#AE8446',
  '--cal-seq-6': '#D6A866',
  '--cal-cell': '#121413',
  '--cal-empty': 'transparent',
  '--cal-gap': '2px',
  '--cal-radius': '0px',
  '--cal-hatch': 'rgba(236, 233, 225, 0.35)',
  '--cal-focus': '#ECE9E1',
  '--cal-highlight': '#ECE9E1',
  '--cal-fg': '#ECE9E1',
  '--cal-muted': '#8B8D86',
} as const

/** Radix menus portal to <body>, outside the root div: mirror the tokens there, and paint the body ground. */
export function usePortalTokens() {
  useEffect(() => {
    const s = document.body.style
    const prev = { bg: s.backgroundColor, scheme: s.colorScheme }
    for (const [k, v] of Object.entries(BASE_TOKENS)) s.setProperty(k, v)
    s.backgroundColor = BASE_TOKENS['--ground']
    s.colorScheme = 'dark'
    return () => {
      for (const k of Object.keys(BASE_TOKENS)) s.removeProperty(k)
      s.backgroundColor = prev.bg
      s.colorScheme = prev.scheme
    }
  }, [])
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export const IMG = `${import.meta.env.BASE_URL}img/`
export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
/** The region the Regions page opens on. */
export const FEATURED = 'br-amazon'

/* ---------- Pages and links ---------- */

export type Nav = 'dev' | 'artifact'
/** The site's four pages. */
export type Page = 'overview' | 'regions' | 'sim' | 'method'
export type Links = {
  overview: () => string
  /** a region's page; without an id, the Regions page as it opens */
  regions: (id?: string) => string
  /** the Explore page, flown to a studied place when given one */
  sim: (place?: string) => string
  /** the Method page, at a section when given one */
  method: (section?: string) => string
}
export type Leave = (e: ReactMouseEvent<HTMLAnchorElement>) => void

/** Where each page lives: a query string on the site (one index.html); its own file in the comment artifact, with the
 *  region or place in the hash. */
export const linksFor = (nav: Nav): Links => ({
  overview: () => (nav === 'artifact' ? 'index.html' : './'),
  regions: (id) => (nav === 'artifact' ? `regions.html${id ? `#region=${id}` : ''}` : id ? `?region=${id}` : '?page=regions'),
  sim: (place) => (nav === 'artifact' ? `sim.html${place ? `#place=${place}` : ''}` : `?page=explore${place ? `&place=${place}` : ''}`),
  method: (section) => (nav === 'artifact' ? `method.html${section ? `#${section}` : ''}` : `?page=method${section ? `#${section}` : ''}`),
})

/* ---------- Words said the same way on every page ---------- */

/** The close-call legend, said the same way everywhere */
export const CLOSE_CALL = 'Close call: just outside the usual range, but the likely range overlaps it.'
export const CAVEAT = 'Our tests point to Aqua’s later look as the main cause: clouds and changes in viewing angle were checked and don’t explain the gap. A smaller share isn’t pinned down yet.'
export const FOOTER_LINE = 'A NASA Space Apps Challenge 2026 team project, not an official NASA product.'
export const JETHVA = 'https://doi.org/10.3390/rs18101506'
/** The code: the Pages deploy sets it from the repository it builds; the comment pages use the same address (the
 *  owner approved showing it, and the repository is to be public for judging). */
export const REPO_URL = (import.meta.env.VITE_REPO_URL as string | undefined) || 'https://github.com/WilltheRanger/NASASpaceAppChallenge-Propagators'
/** True while any region still reads mock files. */
export const ANY_MOCK = REGIONS.some((r) => regionData(r.id).mock)

const NUM_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
export const numWord = (n: number) => NUM_WORDS[n] ?? String(n)
export const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** "a, b and c" */
export const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
/** "The Amazon", not "Amazon" (which reads as the company); places that take no article stay bare. */
export const statementName = (id: string) => {
  const the = phrase(id).the
  return the.startsWith('the ') ? `The ${the.slice(4)}` : phrase(id).short
}

/** The data the site stands on, with the identifiers to find each one. */
export const CREDITS: { name: string; links: { text: string; href: string }[] }[] = [
  { name: 'NASA FIRMS, MODIS standard archive (Terra and Aqua), 2002–2025. Historical MODIS input version codes vary by year (6.2, 6.03, 61.03); collection consistency remains a limitation.', links: [{ text: 'doi:10.5067/FIRMS/MODIS/MCD14ML', href: 'https://doi.org/10.5067/FIRMS/MODIS/MCD14ML' }] },
  { name: 'NASA FIRMS, VIIRS 375 m Collection 2 (standard), S-NPP: 2012–2025', links: [{ text: 'NASA FIRMS archive download', href: 'https://firms.modaps.eosdis.nasa.gov/download/' }] },
  {
    name: 'NASA FIRMS near-real-time, for the 2026 snapshot: MODIS 6.1NRT and VIIRS 2.0NRT',
    links: [
      { text: 'doi:10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002', href: 'https://doi.org/10.5067/FIRMS/VIIRS/VNP14IMGT_NRT.002' },
      { text: 'doi:10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002', href: 'https://doi.org/10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002' },
    ],
  },
  { name: 'INPE Programa Queimadas, Brazil’s official fire series', links: [{ text: 'data.inpe.br/queimadas', href: 'https://data.inpe.br/queimadas/portal/' }] },
  { name: 'USFS fire occurrence database (FPA-FOD), 7th ed., Short 2026', links: [{ text: 'doi:10.2737/RDS-2013-0009.7', href: 'https://doi.org/10.2737/RDS-2013-0009.7' }] },
  { name: 'Punjab burn timing: Jethva 2026, Remote Sensing', links: [{ text: 'doi:10.3390/rs18101506', href: JETHVA }] },
  { name: 'Satellite imagery: NASA Worldview / GIBS', links: [{ text: 'worldview.earthdata.nasa.gov', href: 'https://worldview.earthdata.nasa.gov' }] },
  { name: 'Land outlines: Natural Earth, public domain', links: [{ text: 'naturalearthdata.com', href: 'https://www.naturalearthdata.com' }] },
  { name: 'Explore country list: mledoze/countries, ODbL', links: [{ text: 'github.com/mledoze/countries', href: 'https://github.com/mledoze/countries' }] },
  { name: 'Explore place search: Nominatim, © OpenStreetMap contributors, ODbL', links: [{ text: 'openstreetmap.org/copyright', href: 'https://www.openstreetmap.org/copyright' }] },
]

/* ---------- Motion: Anduril's patterns, read from their code (designs/round-2/anduril-study.md) ---------- */

const MOTION_KEY = 'anchor-motion'
/** On unless the reader asks for reduced motion; the footer switch overrides it and is remembered when storage allows. */
export function readMotion() {
  try {
    const v = window.localStorage.getItem(MOTION_KEY)
    if (v === 'on' || v === 'off') return v === 'on'
  } catch { /* storage can be blocked */ }
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
export function storeMotion(on: boolean) {
  try { window.localStorage.setItem(MOTION_KEY, on ? 'on' : 'off') } catch { /* storage can be blocked */ }
}
export const MotionContext = createContext<{ on: boolean; set: (on: boolean) => void }>({ on: true, set: () => {} })
export const useMotion = () => useContext(MotionContext)

/** True once the element has been `threshold` in view; true at once without motion or without IntersectionObserver,
 *  so nothing can stay hidden. */
export function useInView<T extends Element>(motion: boolean, threshold = 0.05) {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(!motion)
  useEffect(() => {
    if (!motion) { setSeen(true); return }
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    // already on screen (or above it) when the page draws: show it at once
    if (el.getBoundingClientRect().top < window.innerHeight) { setSeen(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el)
    // printing never scrolls: show everything
    const all = () => setSeen(true)
    window.addEventListener('beforeprint', all)
    return () => { io.disconnect(); window.removeEventListener('beforeprint', all) }
  }, [motion, threshold])
  return [ref, seen] as const
}

/** Their reveal: fade and slide in from the left, 1000 ms on easeOutExpo, staggered by `delay`; visible by default
 *  (hidden only while waiting below the fold with motion on). */
export function Reveal({ children, delay = 0, className, as: As = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
  const motion = useMotion()
  const [ref, seen] = useInView<HTMLDivElement>(motion.on, 0.15)
  return (
    <As
      ref={ref as never}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(motion.on && 'transition-[opacity,transform] duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)]', seen ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0', className)}
    >
      {children}
    </As>
  )
}

/** A rule that draws from the left the first time it comes into view (their 1500 ms scaleX). */
export function Rule({ className }: { className?: string }) {
  const motion = useMotion()
  const [ref, seen] = useInView<HTMLSpanElement>(motion.on, 0.5)
  return (
    <span
      ref={ref}
      aria-hidden
      className={cn('block h-px origin-left bg-[color:var(--hairline)]', motion.on && 'transition-transform duration-[1500ms] ease-[cubic-bezier(0.19,1,0.22,1)]', seen ? 'scale-x-100' : 'scale-x-0', className)}
    />
  )
}

/** The page change: this page fades quickly (150 ms, so a click feels immediate), then the link is followed; the next
 *  page fades in (in FieldFilm). Plain navigation without motion. */
export function useLeave(motion: boolean): Leave {
  return (e) => {
    if (!motion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const href = e.currentTarget.getAttribute('href')
    const root = document.getElementById('anchor-root')
    if (!href || href.startsWith('#') || !root?.animate) return
    e.preventDefault()
    root.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2}px`
    root.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.01)' }], { duration: 160, easing: EASE, fill: 'forwards' })
    window.setTimeout(() => { window.location.href = href }, 150)
  }
}

/* ---------- Eased scrolling, and links that glide to their section ---------- */

let glideFrame = 0
// eased wheel scrolling while motion is on (FieldFilm starts and stops it); the page still scrolls natively underneath
let lenis: Lenis | null = null
const glideEase = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const GLIDE_STOPS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const

/** Wheel and trackpad scrolling eases toward its target; touch stays native, and motion off restores plain scrolling. */
export function useEasedScroll(on: boolean) {
  useEffect(() => {
    if (!on) return
    const l = new Lenis({ autoRaf: true, lerp: 0.11, wheelMultiplier: 0.9, smoothWheel: true, syncTouch: false })
    lenis = l
    // an open menu locks the page (body[data-scroll-locked]); the eased scroll pauses with it
    const lock = new MutationObserver(() => (document.body.hasAttribute('data-scroll-locked') ? l.stop() : l.start()))
    lock.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked'] })
    return () => { lock.disconnect(); l.destroy(); if (lenis === l) lenis = null }
  }, [on])
}

/** A page opens at its top: a browser, or a frame that holds the page, can carry the last page's scroll position
 *  over. Going back or forward returns to where the reader was on that page (kept for the session, and applied once
 *  the page is tall enough, since its sections load after it opens). A link to a section (#checks) is left alone. */
export function useStartAtTop() {
  useEffect(() => {
    const key = `anchor-scroll:${window.location.pathname}${window.location.search}`
    const save = () => { try { window.sessionStorage.setItem(key, String(Math.round(window.scrollY))) } catch { /* storage can be blocked */ } }
    window.addEventListener('pagehide', save)
    const jump = (y: number) => { if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y) }
    const nav = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined
    const hash = decodeURIComponent(window.location.hash.slice(1))
    let timer = 0, raf = 0
    if (nav?.type === 'back_forward') {
      let y = 0
      try { y = Number(window.sessionStorage.getItem(key)) || 0 } catch { /* storage can be blocked */ }
      let tries = 0
      const go = () => {
        if (document.documentElement.scrollHeight - window.innerHeight >= y || tries++ > 40) jump(y)
        else timer = window.setTimeout(go, 50)
      }
      if (y > 0) go()
    } else if (!hash || hash.includes('=')) {
      // never against the reader: once they have scrolled, tapped or pressed a key, the page is theirs
      let theirs = false
      const mine = () => { theirs = true }
      const EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
      for (const ev of EVENTS) window.addEventListener(ev, mine, { passive: true, once: true })
      // a host that sizes its frame to the page (the comment artifact) scrolls itself, not this window, and keeps its
      // place when the frame moves to the next page; bringing the page's top into view scrolls that host back up
      const framed = (() => { try { return window.self !== window.top } catch { return true } })()
      const top = () => {
        if (theirs) return
        if (window.scrollY > 0) jump(0)
        if (framed) document.documentElement.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
      }
      top()
      // once more after the first paint, when a late restore would have landed
      raf = requestAnimationFrame(top)
      return () => { window.removeEventListener('pagehide', save); cancelAnimationFrame(raf); for (const ev of EVENTS) window.removeEventListener(ev, mine) }
    }
    return () => { window.removeEventListener('pagehide', save); window.clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [])
}

/** Scroll the page to an element (or the top), honouring its scroll margin. With motion on it glides in 0.4 to 0.7 s,
 *  eased in and out, and stops the moment the reader scrolls; with motion off it jumps. */
export function glideTo(target: Element | 'top', motion: boolean) {
  cancelAnimationFrame(glideFrame)
  const margin = target === 'top' ? 0 : parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  const y = target === 'top' ? 0 : Math.max(0, target.getBoundingClientRect().top + window.scrollY - margin)
  const start = window.scrollY
  const dist = y - start
  if (!motion || Math.abs(dist) < 2) { window.scrollTo(0, y); return }
  const dur = Math.min(720, 380 + Math.abs(dist) * 0.06)
  if (lenis) { lenis.scrollTo(y, { duration: dur / 1000, easing: glideEase }); return }
  const t0 = performance.now()
  const off = () => { for (const ev of GLIDE_STOPS) window.removeEventListener(ev, stop) }
  const stop = () => { cancelAnimationFrame(glideFrame); off() }
  for (const ev of GLIDE_STOPS) window.addEventListener(ev, stop, { passive: true })
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / dur)
    window.scrollTo(0, start + dist * glideEase(t))
    if (t < 1) glideFrame = requestAnimationFrame(step)
    else off()
  }
  glideFrame = requestAnimationFrame(step)
}

/* ---------- Shared classes ---------- */

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]'
export const ease = 'transition-colors duration-150 ease-[var(--ease)]'
export const slideEase = 'transition-transform duration-240 ease-[var(--ease)] motion-reduce:transition-none'
export const title = 'text-balance text-[length:var(--fs-40)] font-medium leading-[var(--lh-display)] tracking-[var(--track-display)]'
export const titleLarge = title
export const statement = 'text-balance text-[length:var(--fs-display)] font-medium leading-[0.92] tracking-[-0.04em]'
export const shell = 'mx-auto w-full max-w-[var(--maxw)] px-4 sm:px-8'
/** Their link underline: draws in from the left on hover, leaves to the right. */
export const underline = cn(
  'relative rounded after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-right after:scale-x-0 after:bg-current after:content-[\'\']',
  'after:transition-transform after:duration-300 after:ease-[var(--ease)] hover:after:origin-left hover:after:scale-x-100',
)
export const textLink = cn(underline, 'text-[color:var(--bone)] underline decoration-[color:var(--bone-30)] underline-offset-[3px] hover:decoration-transparent', focusRing)

export const primaryButton = cn(
  'inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[color:var(--bone)] px-5 text-sm font-medium text-[color:var(--ink)] hover:-translate-y-px hover:bg-[color:var(--bone-hover)] active:translate-y-0 motion-reduce:hover:translate-y-0',
  'transition-[background-color,transform] duration-150 ease-[var(--ease)]',
  focusRing,
)
export const secondaryButton = cn(
  'inline-flex min-h-12 items-center justify-center gap-2 rounded border border-[color:var(--bone-30)] px-5 text-sm font-medium text-[color:var(--bone)] hover:bg-[color:var(--hairline)]',
  ease,
  focusRing,
)

/* ---------- Disclosure: method detail one click away ---------- */

// Native <details>: the summary carries the expanded state for assistive tech, works without script, and find-in-page
// opens it.
export const summaryReset = 'cursor-pointer list-none [&::-webkit-details-marker]:hidden'
const moreSummary = cn('inline-flex min-h-11 items-center gap-1 rounded text-sm text-[color:var(--bone2)] hover:text-[color:var(--bone)]', summaryReset, ease, focusRing)
export const turnOpen = 'shrink-0 transition-transform duration-150 group-open:rotate-90 motion-reduce:transition-none'

/** "More detail", "Limits": a small disclosure whose panel opens underneath. */
export function More({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <details className={cn('group', className)}>
      <summary className={moreSummary}>
        <ArrowRight size={12} strokeWidth={1.5} aria-hidden className={turnOpen} />
        {label}
      </summary>
      {children}
    </details>
  )
}

/** Terse bullets inside a disclosure. */
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-1 flex max-w-[var(--measure)] list-disc flex-col gap-1.5 pl-4 text-xs text-[color:var(--bone2)]">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  )
}

/** Shown only while the files on screen say "mock": true; real files in data/out drop it. */
export function MockTag({ show = true, className }: { show?: boolean; className?: string }) {
  if (!show) return null
  return <span className={cn('shrink-0 rounded border border-[color:var(--hairline)] px-2 py-1 text-xs text-[color:var(--bone)]', className)}>Mock data</span>
}

/* ---------- The satellites' marks: Terra a blue ring, VIIRS a green diamond, Aqua an amber dot ---------- */

export type DetShape = 'diamond' | 'hollow' | 'filled'
export function DetMark({ shape, color, x, y, r = 5 }: { shape: DetShape; color: string; x: number; y: number; r?: number }) {
  if (shape === 'diamond') return <rect x={x - r * 0.85} y={y - r * 0.85} width={r * 1.7} height={r * 1.7} transform={`rotate(45 ${x} ${y})`} fill={color} stroke="var(--ground)" strokeWidth={1.5} />
  if (shape === 'hollow') return <circle cx={x} cy={y} r={r - 0.5} fill="var(--ground)" stroke={color} strokeWidth={2} />
  return <circle cx={x} cy={y} r={r} fill={color} stroke="var(--ground)" strokeWidth={1.5} />
}
/** The same marks as inline HTML, for text and tables. */
export function SatMark({ sat, size = 10 }: { sat: 'terra' | 'viirs' | 'aqua'; size?: number }) {
  if (sat === 'terra') return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, border: '2px solid var(--sat-terra)' }} />
  if (sat === 'viirs') return <span aria-hidden className="inline-block shrink-0 rotate-45 bg-[color:var(--sat-viirs)]" style={{ width: size * 0.74, height: size * 0.74, margin: size * 0.13 }} />
  return <span aria-hidden className="inline-block shrink-0 rounded-full bg-[color:var(--sat-aqua)]" style={{ width: size, height: size }} />
}

/* ---------- The bar: the logo and the four pages, on every page but Explore (which has its own) ---------- */

const PAGES: { page: Page; label: string; line: string; href: (l: Links) => string }[] = [
  { page: 'overview', label: 'Overview', line: 'The idea in one scroll', href: (l) => l.overview() },
  { page: 'regions', label: 'Regions', line: 'The fire calendar for six places', href: (l) => l.regions() },
  { page: 'sim', label: 'Explore', line: 'The map, and when an alert could arrive', href: (l) => l.sim() },
  { page: 'method', label: 'Method', line: 'How we know, and what we can’t say', href: (l) => l.method() },
]

/** Fixed, solid, one row: the logo (the mark alone on phones) and Overview · Regions · Explore · Method. */
export function SiteBar({ page, links, leave, regionsHref }: { page: Page; links: Links; leave: Leave; regionsHref?: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-[color:var(--hairline)] bg-[color:var(--ground)]">
      <div className={cn(shell, 'flex h-14 items-center justify-between gap-3')}>
        <a href={links.overview()} onClick={leave} aria-label="Anchor, overview" className={cn('flex min-h-11 shrink-0 items-center rounded leading-none', focusRing)}>
          {/* the logos draw as blocks, so the switch between them sits on their wrappers */}
          <span className="sm:hidden"><AnchorMark size={20} /></span>
          <span className="hidden sm:block"><AnchorLogo height={20} /></span>
        </a>
        <nav aria-label="Pages">
          <ul className="flex items-center gap-1 sm:gap-2">
            {PAGES.map((p) => {
              const on = p.page === page
              const href = p.page === 'regions' && regionsHref ? regionsHref : p.href(links)
              return (
                <li key={p.page}>
                  {on ? (
                    <span aria-current="page" className="flex h-11 items-center px-2 text-sm text-[color:var(--bone)] sm:px-3">
                      <span className="border-b border-[color:var(--bone)] pb-0.5">{p.label}</span>
                    </span>
                  ) : (
                    <a href={href} onClick={leave} className={cn('flex h-9 items-center rounded px-2 text-sm text-[color:var(--bone2)] hover:bg-[color:var(--surface)] hover:text-[color:var(--bone)] sm:px-3', ease, focusRing)}>
                      {p.label}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}

/* ---------- The way on: the page before and the page after, at the foot of every page ---------- */

/** Two bordered cards at the foot of a page: back to the page before, on to the next, each saying where it leads.
 *  The way on is the heavier of the two: brighter border, and it fills on hover. */
export function PageNext({ page, links, leave, regionsHref }: { page: Page; links: Links; leave: Leave; regionsHref?: string }) {
  const i = PAGES.findIndex((p) => p.page === page)
  const prev = i > 0 ? PAGES[i - 1] : null
  const next = i < PAGES.length - 1 ? PAGES[i + 1] : null
  const href = (p: (typeof PAGES)[number]) => (p.page === 'regions' && regionsHref ? regionsHref : p.href(links))
  const card = cn(
    'group flex flex-1 items-center gap-4 rounded-[4px] border px-4 py-3.5 transition-[background-color,border-color,transform] duration-200 ease-[var(--ease)] hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:px-5 sm:py-4',
    focusRing,
  )
  const disc = 'flex size-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--bone-30)] transition-[background-color,color,border-color,transform] duration-200 ease-[var(--ease)] group-hover:border-[color:var(--bone)] group-hover:bg-[color:var(--bone)] group-hover:text-[color:var(--ink)] motion-reduce:transition-none'
  const name = 'text-xl font-medium leading-[1.15] tracking-[-0.01em] text-[color:var(--bone)] sm:text-2xl'
  return (
    <nav aria-label="Previous and next page" className="border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'flex flex-col gap-3 py-6 sm:flex-row sm:gap-3 sm:py-8')}>
        {prev ? (
          <a href={href(prev)} onClick={leave} aria-label={`Back to ${prev.label}`} className={cn(card, 'border-[color:var(--bone)] text-[color:var(--bone)] hover:bg-[color:var(--surface)]')}>
            <span aria-hidden className={cn(disc, 'group-hover:-translate-x-1')}><ArrowLeft size={16} strokeWidth={1.5} /></span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={name}>{prev.label}</span>
            </span>
          </a>
        ) : null}
        {next ? (
          <a href={href(next)} onClick={leave} aria-label={`Next: ${next.label}`} className={cn(card, 'justify-between border-[color:var(--bone)] bg-[color:var(--surface)] text-[color:var(--bone)] hover:bg-[color:var(--raised)]', prev ? 'sm:flex-[1.4]' : '')}>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={name}>{next.label}</span>
            </span>
            <span aria-hidden className={cn(disc, 'group-hover:translate-x-1')}><ArrowRight size={16} strokeWidth={1.5} /></span>
          </a>
        ) : null}
      </div>
    </nav>
  )
}

/* ---------- Footer: one quiet row. The small print opens on request; sources and picture credits live on the Method page ---------- */

/** Who took each photograph and video. Shown once, under Sources on the Method page; the footer links here. */
export function PictureCredits() {
  const link = cn(underline, 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)
  const credit = (by: string | null, url: string | null, site: string) => (
    <>{url ? <a href={url} target="_blank" rel="noreferrer" className={link}>{by ?? site}</a> : <span>{by ?? site}</span>}{by ? <span className="text-[color:var(--bone3)]">, {site}</span> : null}</>
  )
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm text-[color:var(--bone2)] sm:grid-cols-[auto_1fr_auto_1fr]">
      {REGIONS.map((r) => {
        const p = photoFor(r.id)
        return (
          <div key={r.id} className="contents">
            <dt className="text-[color:var(--bone3)]">{phrase(r.id).short}</dt>
            <dd className="min-w-0">
              Photo: {credit(p.by, p.url, 'Unsplash')}
              {p.video ? <><br />Video: {credit(p.video.by, p.video.url, p.video.site)}{p.video.filmed ? <span className="text-[color:var(--bone3)]">, {p.video.filmed}</span> : null}</> : null}
            </dd>
          </div>
        )
      })}
      <div className="contents">
        <dt className="text-[color:var(--bone3)]">Smoke</dt>
        <dd className="min-w-0">Photo: {credit(OVERVIEW_PHOTO.by, OVERVIEW_PHOTO.url, 'Unsplash')}</dd>
      </div>
      <div className="contents">
        <dt className="text-[color:var(--bone3)]">From space</dt>
        <dd className="min-w-0">NASA Worldview / GIBS, NASA Blue Marble</dd>
      </div>
    </dl>
  )
}

/** `notes`: the page's own small print (how a number was counted, a picture's date). Closed until someone asks for it. */
export function Footer({ links, leave, notes = [] }: { links: Links; leave: Leave; notes?: ReactNode[] }) {
  const m = useMotion()
  const link = cn(underline, 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)
  return (
    <footer className="border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'flex flex-col gap-6 py-8 text-sm text-[color:var(--bone2)]')}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Details" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href={links.method()} onClick={leave} className={link}>How we know</a>
            <a href={links.method('sources')} onClick={leave} className={link}>Data sources</a>
            {REPO_URL ? <a href={`${REPO_URL}/tree/main/data/out`} target="_blank" rel="noreferrer" className={link}>Use the data</a> : null}
            <a href={links.method('credits')} onClick={leave} className={link}>Picture credits</a>
            {REPO_URL ? <a href={REPO_URL} target="_blank" rel="noreferrer" className={link}>Code</a> : null}
          </nav>
          <ElasticSwitch checked={m.on} onCheckedChange={m.set} label="Motion" />
        </div>
        {notes.length ? (
          <details className="group border-t border-[color:var(--hairline)] pt-4">
            <summary className={cn('inline-flex min-h-8 cursor-pointer list-none items-center gap-2 text-[color:var(--bone2)] hover:text-[color:var(--bone)] [&::-webkit-details-marker]:hidden', focusRing)}>
              <span aria-hidden className="inline-block w-3 text-center group-open:hidden">+</span>
              <span aria-hidden className="hidden w-3 text-center group-open:inline-block">−</span>
              Notes on this page
            </summary>
            <ul className="mt-3 grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2">
              {notes.map((n, i) => <li key={i} className="max-w-[var(--measure)] leading-6">{n}</li>)}
            </ul>
          </details>
        ) : null}
        <div className="border-t border-[color:var(--hairline)] pt-4">
          <More label="Thank you">
            <div className="mt-3 grid gap-x-6 gap-y-3 lg:grid-cols-2">
            <p className="max-w-[var(--measure)] leading-6">To NASA, the Space Apps Challenge and its partner agencies, especially the Brazilian Space Agency (AEB), Argentina’s CONAE and India’s ISRO.</p>
            <p className="max-w-[var(--measure)] leading-6">To Build Future Mind Foundation, Local Lead Allen West and the organizing team for the Chino Hills, CA event, 14–15 November 2026.</p>
            </div>
          </More>
        </div>
        <div className="flex flex-col gap-2 border-t border-[color:var(--hairline)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <AnchorLogo height={18} className="text-[color:var(--bone)]" />
          <p className="text-xs text-[color:var(--bone3)]">Team Propagators. {FOOTER_LINE}{ANY_MOCK ? ' This build uses mock data.' : ''}</p>
        </div>
      </div>
    </footer>
  )
}
