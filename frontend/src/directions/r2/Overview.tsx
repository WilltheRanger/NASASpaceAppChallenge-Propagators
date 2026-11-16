/*
 * THESIS: The overview is one question. A count taken later in the day: the park at 1:30, then 3:00; then Aqua's look
 *   sliding later over the Amazon, which the reader moves by hand; then six places on the same scale.
 * OWN-WORLD: Anchor dark: ground #0B0D0B, bone text, IBM Plex Sans, hairlines, 4 px corners; photographs carry the colour.
 *   Terra a blue ring, VIIRS a green diamond, Aqua an amber dot; amber means Aqua only.
 * STORY: the park question (two lines, brought up by scrolling); Aqua's look by year, dragged; the finding with its
 *   caveat; six places on one scale, each a link to its page; three picture doors on.
 * FIRST VIEWPORT: a framed, full-height photograph of wildfire smoke at dusk; scrolling brings up the two lines.
 * FORM: short sentences, one control per figure, small print in the footer.
 *
 * Every number comes from src/r2/data.ts (data/out/drift and data/out/audit); "unusual" is the audit's outside_noise,
 * read only where the year's status is ok. The satellite pictures are NASA Worldview / GIBS (credited in the footer).
 */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { motion as m, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react'
import { RollingDigits } from '@/components/ui/rolling-digits'
import { useMeasuredWidth } from '@/components/ui/series-chart'
import { YearRuler } from '@/components/ui/year-ruler'
import { REGIONS, fmtRange, hm, lookChange, phrase, pct, regionData } from '@/r2/data'
import { OVERVIEW_PHOTO, photoFor } from '@/r2/photos'
import { cn } from '@/lib/utils'
import {
  CAVEAT, FEATURED, Footer, IMG, More, PageNext, Reveal, Rule, SatMark, SiteBar, andList, focusRing, numWord, shell, useInView, useMotion,
  type Leave, type Links,
} from './common'

/** The audit's last year, across the six files. */
const YEAR = Math.max(...REGIONS.flatMap((r) => regionData(r.id).years.map((y) => y.year)))

/** One row of the six: how much later Aqua looked, its last year against what we'd expect, and the nine 2012-2020
 *  years that make the usual range. */
const ROWS = REGIONS.map((r) => {
  const d = regionData(r.id)
  const look = lookChange(d)
  const y = d.years.find((x) => x.year === YEAR) ?? null
  const read = y && y.verdict !== 'na' && y.gap != null && y.lo != null && y.hi != null ? { gap: y.gap, lo: y.lo, hi: y.hi, unusual: y.verdict === 'outside' } : null
  return { id: r.id, name: phrase(r.id).short, the: phrase(r.id).the, look, read, band: d.placebo, usual: d.placeboYears, later: !!d.driftStart && (look?.minutes ?? 0) > 0 }
})
type Row = (typeof ROWS)[number]
const UNUSUAL = ROWS.filter((r) => r.read?.unusual)
const ALL_LATER = ROWS.every((r) => r.later)
/** The finding, worded from the rows: every place looked later; these were unusual. */
const FINDING = [
  ALL_LATER ? `Aqua now looks later in all ${numWord(ROWS.length)} places.` : `Aqua now looks later in ${numWord(ROWS.filter((r) => r.later).length)} of ${numWord(ROWS.length)} places.`,
  UNUSUAL.length
    ? `In ${andList(UNUSUAL.map((r) => r.the))}, its ${YEAR} count was unusually far from what we’d expect.`
    : `In none was its ${YEAR} count unusually far from what we’d expect.`,
]

/** One scale for every row's strip, in whole tens of percent around the widest reading. */
const SCALE = (() => {
  const vs = ROWS.flatMap((r) => [r.band[0], r.band[1], ...r.usual.map((u) => u.gap), ...(r.read ? [r.read.lo, r.read.hi] : [])])
  const min = Math.floor((Math.min(0, ...vs) - 4) / 10) * 10
  const max = Math.ceil((Math.max(0, ...vs) + 4) / 10) * 10
  const ticks: number[] = []
  for (let v = Math.ceil(min / 20) * 20; v <= max - 10; v += 20) ticks.push(v)
  return { min, max, ticks }
})()
const along = (v: number) => (v - SCALE.min) / (SCALE.max - SCALE.min)

/** The place the middle chapter follows: its look times by year, and two pictures of one afternoon there. */
const DAY = regionData(FEATURED)
const DAY_LOOK = lookChange(DAY)
const wide = (k: 'viirs' | 'aqua') => `${IMG}amazon-${k}-2026-09-04.jpg`

/** Their reveal curve (easeOutExpo), for the moments this page authors. */
const expo = 'ease-[cubic-bezier(0.19,1,0.22,1)]'
const plate = 'rounded-[3px] bg-[color:var(--plate)] px-2 py-1 text-xs text-[color:var(--bone)]'

export default function Overview({ links, leave }: { links: Links; leave: Leave }) {
  return (
    <>
      <SiteBar page="overview" links={links} leave={leave} />
      <main>
        <Park />
        <Drift />
        <Finding links={links} leave={leave} />
        <Doors links={links} leave={leave} />
      </main>
      <PageNext page="overview" links={links} leave={leave} />
      <Footer
        links={links}
        leave={leave}
        notes={[
          <>The two pictures of {phrase(FEATURED).the} were taken on 4 September 2026, one by VIIRS in the early afternoon and one by Aqua later that afternoon.</>,
          <>Look times are local sun time: the middle of each satellite’s fire detections that year.</>,
          <>Unusual means further from what we’d expect than any year from 2012 to 2020. Punjab + Haryana is our test case, where another study already timed the burning.</>,
        ]}
      />
    </>
  )
}

/* ---------- The park: the fire first; scrolling brings up the question, then its second half ---------- */

/** Phones and tablets: the scrim rises from the bottom, under the words. */
const LOW_SCRIM = 'linear-gradient(0deg, rgba(11,13,11,0.95) 0%, rgba(11,13,11,0.8) 38%, rgba(11,13,11,0.4) 66%, rgba(11,13,11,0.12) 100%)'
/** Wide screens: the scrim deepens the dark sky on the left, where the words sit. */
const WIDE_SCRIM = 'linear-gradient(90deg, rgba(11,13,11,0.92) 0%, rgba(11,13,11,0.66) 38%, rgba(11,13,11,0) 68%), linear-gradient(0deg, rgba(11,13,11,0.6) 0%, rgba(11,13,11,0) 38%)'
const BOB = '@keyframes anchor-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}'

/** A tall section whose framed photograph sticks under the bar. The page opens on the fire alone. Scrolling darkens the
 *  picture and brings up the first line (the count at 1:30); further on, the second (the count at 3:00, and the
 *  question). Only opacity and position move, on a light spring, so it stays smooth on a phone. With motion off it is
 *  one still screen with both lines on it. */
function Park() {
  const motion = useMotion()
  const on = motion.on
  const ref = useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 220, damping: 38, mass: 0.35 })
  const scrim = useTransform(p, [0.03, 0.26], [0, 1])
  const show1 = useTransform(p, [0.08, 0.28], [0, 1])
  const rise1 = useTransform(p, [0.08, 0.3], [56, 0])
  const show2 = useTransform(p, [0.46, 0.66], [0, 1])
  const rise2 = useTransform(p, [0.46, 0.68], [40, 0])
  const grow = useTransform(p, [0, 1], [1, 1.1])
  const cue = useTransform(p, [0, 0.05], [1, 0])
  const ph = OVERVIEW_PHOTO
  return (
    <section ref={ref} aria-labelledby="park-h" className={cn('relative pt-14', on && 'h-[270svh]')}>
      <div className={cn('px-2 pt-2 sm:px-4 sm:pt-4', on && 'sticky top-14')}>
        <div
          style={{ '--focus': ph.focus, '--focus-phone': ph.focusPhone } as CSSProperties}
          className="relative isolate h-[calc(100svh-72px)] min-h-[520px] overflow-hidden rounded-[4px] bg-[color:var(--surface)] sm:h-[calc(100svh-88px)]"
        >
          <m.img
            src={ph.src(1600)}
            srcSet={`${ph.src(960)} 960w, ${ph.src(1600)} 1600w, ${ph.src(2400)} 2400w`}
            sizes="100vw"
            alt={ph.alt}
            width={ph.width}
            height={ph.height}
            style={{ scale: on ? grow : 1 }}
            className="absolute inset-0 -z-10 size-full object-cover object-[var(--focus-phone)] will-change-transform sm:object-[var(--focus)]"
          />
          <m.div aria-hidden className="absolute inset-0 -z-10 lg:hidden" style={{ background: LOW_SCRIM, opacity: on ? scrim : 1 }} />
          <m.div aria-hidden className="absolute inset-0 -z-10 hidden lg:block" style={{ background: WIDE_SCRIM, opacity: on ? scrim : 1 }} />
          <div className="relative flex h-full flex-col justify-end gap-6 p-5 pb-10 sm:gap-8 sm:p-10 lg:p-14">
            <m.h1
              id="park-h"
              style={on ? { opacity: show1, y: rise1 } : undefined}
              className="max-w-[15ch] text-balance text-[clamp(38px,5.4vw,88px)] font-medium leading-[1] tracking-[-0.035em] text-[color:var(--bone)]"
            >
              Imagine counting people in a park every day at <span className="tabular-nums">1:30</span>.
            </m.h1>
            <m.p
              style={on ? { opacity: show2, y: rise2 } : undefined}
              className="max-w-[26ch] text-balance text-[clamp(22px,2.6vw,40px)] leading-[1.15] tracking-[-0.015em] text-[color:var(--bone)]"
            >
              Years later you count at <span className="tabular-nums">3:00</span> and find more people.{' '}
              <span className="text-[color:var(--bone2)]">Did more people come, or did you arrive at a busier time?</span>
            </m.p>
          </div>
          {on ? (
            <m.span aria-hidden style={{ opacity: cue }} className="pointer-events-none absolute bottom-5 left-1/2 -ml-[18px] flex size-9 items-center justify-center rounded-full bg-[color:var(--plate)] text-[color:var(--bone)]">
              <style>{BOB}</style>
              <ArrowDown size={18} strokeWidth={1.5} style={{ animation: 'anchor-bob 1.8s ease-in-out infinite' }} />
            </m.span>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/* ---------- Aqua's look, year by year: the reader drags the year ---------- */

/** Every year's look times over the featured place, in hours. */
const LOOKS = DAY.drift.map((r) => ({ year: r.year, aqua: hm(r.aqua_lst), aquaText: r.aqua_lst, viirs: hm(r.viirs_lst), viirsText: r.viirs_lst }))

function Drift() {
  const motion = useMotion()
  const look = DAY_LOOK
  const first = LOOKS[0]?.year ?? 2012, last = LOOKS[LOOKS.length - 1]?.year ?? YEAR
  const [year, setYear] = useState(motion.on ? first : last)
  // the first time the figure is on screen, the years run through once; a touch takes over at once
  const [box, seen] = useInView<HTMLDivElement>(motion.on, 0.55)
  const touched = useRef(false)
  useEffect(() => {
    if (!seen || !motion.on || touched.current) return
    let y = first
    const t = window.setInterval(() => {
      if (touched.current || y >= last) { window.clearInterval(t); return }
      y += 1
      setYear(y)
    }, 130)
    return () => window.clearInterval(t)
  }, [seen, motion.on, first, last])
  const pick = (y: number) => { touched.current = true; setYear(y) }
  if (!look || LOOKS.length < 2) return null
  const now = LOOKS.find((r) => r.year === year) ?? LOOKS[LOOKS.length - 1]
  const old = hm(look.old)
  const later = Math.round((now.aqua - old) * 60)
  const late = now.aqua >= (old + hm(look.now)) / 2
  const fade = motion.on ? 'transition-opacity duration-700 ease-[var(--ease)]' : ''
  const the = phrase(FEATURED).the
  return (
    <section id="day" aria-labelledby="day-h" className="scroll-mt-14">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 pb-16 pt-16 lg:grid-cols-12 lg:gap-x-6 lg:pb-24 lg:pt-24')}>
        <div className="lg:col-span-5">
          <h2 id="day-h" className="max-w-[16ch] text-balance text-[clamp(32px,4vw,56px)] font-medium leading-[1.04] tracking-[-0.03em]">
            Now swap the park for a forest, and you for a satellite.
          </h2>
          <div className="mt-6 flex max-w-[34ch] flex-col gap-4 text-lg text-[color:var(--bone2)]">
            <p>
              Aqua spots fires from space. Over {the} it used to look at about <span className="tabular-nums text-[color:var(--bone)]">{look.old}</span>. By {look.year} it looked at{' '}
              <span className="tabular-nums text-[color:var(--bone)]">{look.now}</span>, {look.minutes} minutes later.
            </p>
            <p>INPE’s official fire count for Brazil follows Aqua.</p>
            <p>
              VIIRS, a newer camera, still looks at <span className="tabular-nums text-[color:var(--bone)]">{look.viirs}</span>.{DAY.ratio != null ? <> From 2012 to 2020, Aqua made about {Math.round(DAY.ratio * 100)} fire detections for every 100 by VIIRS.</> : null} That old match and VIIRS’s count now give what we’d expect from Aqua.
            </p>
          </div>
        </div>
        <figure ref={box} className="m-0 min-w-0 lg:col-span-7">
          <div className="relative aspect-[13/10] max-h-[52svh] w-full overflow-hidden rounded-[4px] bg-[color:var(--surface)]">
            <img src={wide('viirs')} alt={late ? '' : `${the}, early afternoon: small clouds spread across the forest`} aria-hidden={late} width={936} height={720} loading="lazy" className={cn('absolute inset-0 size-full object-cover', fade, late ? 'opacity-0' : 'opacity-100')} />
            <img src={wide('aqua')} alt={late ? `${the}, later the same afternoon: towering clouds over the forest` : ''} aria-hidden={!late} width={936} height={720} loading="lazy" className={cn('absolute inset-0 size-full object-cover', fade, late ? 'opacity-100' : 'opacity-0')} />
            <span className={cn('absolute left-3 top-3', plate)}>{late ? 'Later in the afternoon' : 'Early afternoon'}</span>
          </div>
          <LookClock now={now} old={old} oldText={look.old} later={later} onYear={pick} />
          <YearRuler
            className="mt-2"
            years={LOOKS.map((r) => r.year)}
            year={now.year}
            onYear={pick}
            label={`Year: when Aqua looked over ${the}`}
            valueText={(y) => { const r = LOOKS.find((x) => x.year === y); return r ? `${y}: Aqua looked at ${r.aquaText}, VIIRS at ${r.viirsText}` : String(y) }}
          />
          <figcaption aria-live="polite" className="mt-1 text-sm text-[color:var(--bone2)]">
            <span className="text-[color:var(--bone)]">Drag the year.</span>{' '}
            In {now.year} Aqua looked at <span className="tabular-nums">{now.aquaText}</span>{later >= 2 ? <>, {later} minutes later than in 2012–2020</> : <>, its usual time</>}.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

/** Two rows on one stretch of the afternoon: where Aqua looked in the chosen year (the amber dot, which can be dragged)
 *  and where VIIRS looked (the green diamond). A tick marks Aqua's 2012-2020 time, and an amber bar the minutes added. */
function LookClock({ now, old, oldText, later, onYear }: { now: (typeof LOOKS)[number]; old: number; oldText: string; later: number; onYear: (y: number) => void }) {
  const motion = useMotion()
  const ref = useRef<HTMLDivElement | null>(null)
  const W = useMeasuredWidth(ref)
  const all = LOOKS.flatMap((r) => [r.aqua, r.viirs])
  const from = Math.floor(Math.min(...all)) - 1, to = Math.ceil(Math.max(...all)) + 1
  const gutter = 64, pad = 14
  const x = (h: number) => gutter + ((h - from) / (to - from)) * Math.max(0, W - gutter - pad)
  const timeAt = (px: number) => from + ((px - gutter) / Math.max(1, W - gutter - pad)) * (to - from)
  const rowA = 46, rowV = 80, axis = 104
  const move = motion.on ? `transition-[left,width] duration-300 ${expo}` : ''
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  // dragging the dot picks the year whose look time is nearest
  const drag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = ref.current
    if (!box) return
    const t = timeAt(e.clientX - box.getBoundingClientRect().left)
    let best = LOOKS[0]
    for (const r of LOOKS) if (Math.abs(r.aqua - t) <= Math.abs(best.aqua - t)) best = r
    if (best.year !== now.year) onYear(best.year)
  }
  const xa = x(now.aqua), xo = x(old)
  const rowName = 'absolute left-0 flex -translate-y-1/2 items-center gap-2 text-sm text-[color:var(--bone)]'
  return (
    <div className="mt-6">
      <p className="text-xs text-[color:var(--bone3)]">Time of day each one looks</p>
      <div
        ref={ref}
        role="img"
        aria-label={`In ${now.year} Aqua looked at ${now.aquaText} and VIIRS at ${now.viirsText}. In 2012 to 2020 Aqua looked at ${oldText}.`}
        className="relative mt-2 w-full select-none"
        style={{ height: 128 }}
      >
        {W > 0 ? (
          <>
            <span className={rowName} style={{ top: rowA }}><SatMark sat="aqua" size={11} />Aqua</span>
            <span className={rowName} style={{ top: rowV }}><SatMark sat="viirs" size={11} />VIIRS</span>
            {[rowA, rowV].map((y) => <span key={y} aria-hidden className="absolute h-px bg-[color:var(--hairline)]" style={{ left: gutter, right: pad, top: y }} />)}
            <span aria-hidden className="absolute h-px bg-[color:var(--bone-30)]" style={{ left: gutter, right: pad, top: axis }} />
            {hours.map((h) => (
              <span key={h} aria-hidden className="absolute -translate-x-1/2 text-xs tabular-nums text-[color:var(--bone3)]" style={{ left: x(h), top: axis + 8 }}>
                <span className="absolute -top-2 left-1/2 h-1.5 w-px -translate-x-1/2 bg-[color:var(--bone-30)]" />
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
            {/* VIIRS: stays where it is */}
            <span aria-hidden className={cn('absolute size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[color:var(--sat-viirs)]', move)} style={{ left: x(now.viirs), top: rowV }} />
            <span aria-hidden className={cn('absolute -translate-y-1/2 pl-3 text-sm tabular-nums text-[color:var(--bone2)]', move)} style={{ left: x(now.viirs), top: rowV }}>{now.viirsText}</span>
            {/* Aqua: its 2012-2020 time, the minutes added since, and the dot */}
            <span aria-hidden className="absolute w-px bg-[color:var(--bone2)]" style={{ left: xo, top: rowA - 9, height: 18 }} />
            <span aria-hidden className={cn('absolute h-1 -translate-y-1/2 rounded-full bg-[color:var(--sat-aqua)]', move)} style={{ left: xo, width: Math.max(0, xa - xo), top: rowA }} />
            <div
              aria-hidden
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag(e) }}
              onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) drag(e) }}
              className="absolute z-10 h-11 -translate-y-1/2 cursor-grab touch-none active:cursor-grabbing"
              style={{ left: gutter, right: 0, top: rowA }}
            />
            <span aria-hidden className={cn('pointer-events-none absolute z-20 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--sat-aqua)] ring-2 ring-[color:var(--ground)]', move)} style={{ left: xa, top: rowA }} />
            {/* its time sits above the dot, kept inside the figure at either end */}
            <span aria-hidden className={cn('pointer-events-none absolute z-20 flex items-center gap-2 whitespace-nowrap text-sm tabular-nums text-[color:var(--bone)]', move)} style={{ left: Math.max(gutter - 8, Math.min(xa - (later >= 2 ? 56 : 20), W - (later >= 2 ? 116 : 44))), top: rowA - 36 }}>
              {now.aquaText}
              {later >= 2 ? <span className="rounded-[3px] bg-[color:var(--sat-aqua)] px-1.5 text-xs font-medium text-[color:var(--ink)]">+{later} min</span> : null}
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}

/* ---------- The finding, its caveat, and the six places on one scale ---------- */

function Finding({ links, leave }: { links: Links; leave: Leave }) {
  return (
    <section id="finding" aria-labelledby="finding-h" className="scroll-mt-14">
      {/* the page's one change of ground: the finding on bone */}
      <div className="bg-[color:var(--bone)] text-[color:var(--ink)]">
        <div className={cn(shell, 'py-16 lg:py-24')}>
          <h2 id="finding-h" tabIndex={-1} className="max-w-[24ch] text-balance text-[clamp(32px,4.2vw,60px)] font-medium leading-[1.04] tracking-[-0.03em] outline-none">
            {FINDING.join(' ')}
          </h2>
          <p className="mt-6 max-w-[44ch] text-lg text-[color:var(--ink)]">{CAVEAT}</p>
        </div>
      </div>
      <div className={cn(shell, 'pb-16 lg:pb-24')}>
        <Places links={links} leave={leave} />
      </div>
    </section>
  )
}

const COLS = 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.8fr)_minmax(0,0.7fr)_20px]'

/** The six places on one scale; each row opens that place's page. */
function Places({ links, leave }: { links: Links; leave: Leave }) {
  const th = 'text-xs text-[color:var(--bone3)]'
  const key = 'inline-flex items-center gap-2'
  return (
    <div className="mt-14">
      <Rule />
      <div aria-hidden className={cn('hidden items-end gap-x-6 pt-4 md:grid', COLS)}>
        <span className={th}>Place</span>
        <span className={th}>Aqua looks later by</span>
        <span className={th}>
          {YEAR} count against what we’d expect
          <StripAxis />
        </span>
        <span className={th}>Unusual?</span>
        <span />
      </div>
      <ol className="mt-3 border-t border-[color:var(--hairline)]">
        {ROWS.map((r, i) => (
          <PlaceRow key={r.id} r={r} i={i} href={links.regions(r.id)} leave={leave} />
        ))}
      </ol>
      <p aria-hidden className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[color:var(--bone2)]">
        <span className={key}><span className="inline-block size-2.5 rounded-full bg-[color:var(--sat-aqua)]" />Aqua’s {YEAR} count</span>
        <span className={key}><span className="inline-block h-0.5 w-5 rounded-full bg-[color:var(--sat-aqua)]" />How sure we are</span>
        <span className={key}><span className="inline-block h-3 w-5 rounded-[2px] bg-[rgba(236,233,225,0.16)]" />Usual range, 2012–2020</span>
      </p>
      <More label="About the range" className="mt-2">
        <p className="max-w-[44rem] text-sm text-[color:var(--bone2)]">
          The amber line is a 95% bootstrap interval: the days compared are resampled many times and the middle 95% of results kept. It shows how much the
          number moves when we re-pick the days. It is not the probability that an effect of the timing lies inside it.
        </p>
      </More>
    </div>
  )
}

function PlaceRow({ r, i, href, leave }: { r: Row; i: number; href: string; leave: Leave }) {
  const motion = useMotion()
  const photo = photoFor(r.id)
  // the column names show above each value on phones; on wide screens the header row shows them and these stay for screen readers
  const label = 'mb-1.5 block text-xs text-[color:var(--bone3)] md:sr-only'
  const chip = r.read ? (
    <span className={cn('inline-block rounded px-2 py-0.5 text-sm', r.read.unusual ? 'bg-[color:var(--bone)] text-[color:var(--ink)]' : 'border border-[color:var(--bone-30)] text-[color:var(--bone2)]')}>
      {r.read.unusual ? 'Unusual' : 'Not unusual'}
    </span>
  ) : (
    <span className="text-sm text-[color:var(--bone2)]">Our test case</span>
  )
  return (
    <Reveal as="li" delay={i * 60}>
      <a href={href} onClick={leave} className={cn('group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-4 border-b border-[color:var(--hairline)] py-5 hover:bg-[color:var(--surface)] md:gap-x-6 md:py-4', COLS, focusRing)}>
        <span className="flex min-w-0 items-center gap-4">
          <span className="block h-14 w-20 shrink-0 overflow-hidden rounded-[3px] md:h-16 md:w-24">
            <img src={photo.srcSm} alt="" width={720} height={480} loading="lazy" style={{ objectPosition: photo.focus }} className="size-full object-cover" />
          </span>
          <span className="min-w-0 text-lg font-medium leading-tight text-[color:var(--bone)] md:text-xl">{r.name}</span>
        </span>
        <span className="md:hidden">{chip}</span>
        <span className="col-span-2 md:col-span-1">
          <span className={label}>Aqua looks later by</span>
          <span className="block text-lg tabular-nums text-[color:var(--bone)]">{r.look ? `${r.look.minutes} min` : '—'}</span>
          {r.look ? <span className="block text-xs tabular-nums text-[color:var(--bone3)]">{r.look.old} to {r.look.now}</span> : null}
        </span>
        <span className="col-span-2 md:col-span-1">
          <span className={label}>{YEAR} count against what we’d expect</span>
          {r.read ? (
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <RollingDigits text={pct(r.read.gap)} motion={motion.on} className="text-lg text-[color:var(--bone)]" />
              <span className="text-xs tabular-nums text-[color:var(--bone3)]">{fmtRange(r.read.lo, r.read.hi)}</span>
            </span>
          ) : (
            <span className="block text-sm text-[color:var(--bone2)]">Too few fires to read in {YEAR}</span>
          )}
          <Strip r={r} />
          <span className="md:hidden"><StripAxis /></span>
        </span>
        <span className="hidden md:block">{chip}</span>
        <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="hidden text-[color:var(--bone3)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[color:var(--bone)] motion-reduce:transition-none md:block" />
      </a>
    </Reveal>
  )
}

const STRIP_PAD = 6

/** One place's last year on the shared scale: the nine 2012-2020 years as short lines, the band they span, the dashed
 *  line where the count matches what we'd expect, and Aqua's count as the amber dot with how sure we are. */
function Strip({ r }: { r: Row }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const W = useMeasuredWidth(ref)
  const x = (v: number) => STRIP_PAD + along(v) * Math.max(0, W - STRIP_PAD * 2)
  const H = 30, cy = 15
  return (
    <span ref={ref} aria-hidden className="mt-2 block w-full" style={{ height: H }}>
      {W > 0 ? (
        <svg width={W} height={H} className="block overflow-visible">
          <rect x={x(r.band[0])} y={cy - 9} width={Math.max(0, x(r.band[1]) - x(r.band[0]))} height={18} rx={2} fill="rgba(236, 233, 225, 0.1)" />
          {r.usual.map((u) => (
            <line key={u.year} x1={x(u.gap)} x2={x(u.gap)} y1={cy - 6} y2={cy + 6} stroke="rgba(236, 233, 225, 0.32)" />
          ))}
          <line x1={x(0)} x2={x(0)} y1={0} y2={H} stroke="rgba(236, 233, 225, 0.55)" strokeDasharray="2 3" />
          {r.read ? (
            <>
              <line x1={x(r.read.lo)} x2={x(r.read.hi)} y1={cy} y2={cy} stroke="var(--sat-aqua)" strokeWidth={2} strokeLinecap="round" />
              <circle cx={x(r.read.gap)} cy={cy} r={5.5} fill="var(--sat-aqua)" stroke="var(--ground)" strokeWidth={2} />
            </>
          ) : null}
        </svg>
      ) : null}
    </span>
  )
}

/** The shared scale's labels, measured to the same width as the strips. */
function StripAxis() {
  const ref = useRef<HTMLSpanElement | null>(null)
  const W = useMeasuredWidth(ref)
  const x = (v: number) => STRIP_PAD + along(v) * Math.max(0, W - STRIP_PAD * 2)
  return (
    <span ref={ref} aria-hidden className="relative mt-2 block h-4 w-full text-xs tabular-nums text-[color:var(--bone3)]">
      {W > 0
        ? SCALE.ticks.map((v) => (
            <span key={v} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: x(v) }}>
              {v === 0 ? 'what we’d expect' : `${v > 0 ? '+' : '−'}${Math.abs(v)}%`}
            </span>
          ))
        : null}
    </span>
  )
}

/* ---------- Three doors on ---------- */

function Doors({ links, leave }: { links: Links; leave: Leave }) {
  const pic = 'size-full object-cover'
  return (
    <section aria-labelledby="doors-h" className="border-t border-[color:var(--hairline)]">
      <h2 id="doors-h" className="sr-only">Where to go next</h2>
      <div className={cn(shell, 'grid grid-cols-1 gap-2 py-16 sm:gap-3 lg:grid-cols-12 lg:py-24')}>
        <Door
          href={links.regions()}
          leave={leave}
          title="Regions"
          line="Six places, year by year."
          className="min-h-[460px] lg:col-span-7 lg:row-span-2 lg:min-h-[620px]"
          art={
            <span className="grid size-full grid-cols-2 grid-rows-3 gap-0.5 bg-[color:var(--ground)] sm:grid-cols-3 sm:grid-rows-2">
              {REGIONS.map((r) => {
                const p = photoFor(r.id)
                return (
                  <span key={r.id} className="relative block min-h-0 overflow-hidden">
                    <img src={p.srcSm} alt="" loading="lazy" className={pic} style={{ objectPosition: p.focus }} />
                    <span className={cn('absolute left-2 top-2 max-w-[calc(100%-16px)] truncate whitespace-nowrap', plate)}>{phrase(r.id).short}</span>
                  </span>
                )
              })}
            </span>
          }
        />
        <Door
          href={links.sim()}
          leave={leave}
          title="Explore"
          line="Turn the globe. Click a fire to see which satellite saw it, and when."
          className="min-h-[280px] lg:col-span-5"
          art={<img src={`${IMG}sim/${FEATURED}-context.jpg`} alt="" loading="lazy" className={pic} style={{ objectPosition: '30% 62%' }} />}
        />
        <Door
          href={links.method()}
          leave={leave}
          title="How we know"
          line="Our checks, including the ones that failed, and the method’s limits."
          className="min-h-[280px] lg:col-span-5"
          art={<img src={`${IMG}daylight/br-amazon-2024-09-02.jpg`} alt="" loading="lazy" className={pic} />}
        />
      </div>
    </section>
  )
}

/** A whole picture as the link: the title and one line at the bottom on a scrim, the arrow in the corner. */
function Door({ href, leave, title, line, art, className }: { href: string; leave: Leave; title: string; line: string; art: ReactNode; className?: string }) {
  return (
    <a href={href} onClick={leave} className={cn('group relative isolate flex flex-col justify-end overflow-hidden rounded-[4px] bg-[color:var(--surface)] p-5 sm:p-8', focusRing, className)}>
      <span aria-hidden className="absolute inset-0 -z-10 transition-transform duration-700 ease-[var(--ease)] group-hover:scale-[1.03] motion-reduce:transition-none">{art}</span>
      <span aria-hidden className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(0deg, rgba(11,13,11,0.92) 0%, rgba(11,13,11,0.6) 30%, rgba(11,13,11,0) 62%)' }} />
      <ArrowUpRight
        aria-hidden
        size={22}
        strokeWidth={1.5}
        className="absolute right-5 top-5 rounded-full bg-[color:var(--plate)] p-1 text-[color:var(--bone)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:right-6 sm:top-6"
      />
      <span className="text-[clamp(28px,3vw,44px)] font-medium leading-[1.05] tracking-[-0.02em] text-[color:var(--bone)]">{title}</span>
      <span className="mt-2 max-w-[36ch] text-sm text-[color:var(--bone2)] sm:text-base">{line}</span>
    </a>
  )
}
