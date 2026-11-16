/*
 * THESIS: The overview is one day. Anchor's idea is a count taken later in the day, so the page moves along the clock:
 *   the park at 1:30, then 3:00; Aqua's look sliding from 13:37 to 14:57 over one real Amazon day; then six places on
 *   the same afternoon. It refuses the stat-row-and-cards landing.
 * OWN-WORLD: Anchor dark: ground #0B0D0B, bone text, Albert Sans, hairlines, 4 px corners; photographs carry the colour.
 *   Terra a blue ring, VIIRS a green diamond, Aqua amber; a ring is the old time, a dot the new; amber means Aqua only.
 * STORY: the park question; the same question for fires, one step per scroll; the finding with its caveat beside it;
 *   six places on shared scales, each a door to its page; three picture doors on.
 * FIRST VIEWPORT: a framed, full-height Unsplash photograph of wildfire smoke at dusk; the analogy as a title card
 *   bottom-left on a ground scrim; a bone ring-to-dot glyph from 1:30 to 3:00; "See what we found"; the next chapter peeks.
 * FORM: one day, scrubbed (4 of 6), staged as Anduril's framed film, then a sticky reveal; seed 5dd3674c.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 *
 * Every number comes from src/r2/data.ts (data/out/drift and data/out/audit); "unusual" is the audit's outside_noise,
 * read only where the year's status is ok. The satellite pictures are NASA Worldview / GIBS (credited in the footer).
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { RollingDigits } from '@/components/ui/rolling-digits'
import { useMeasuredWidth } from '@/components/ui/series-chart'
import { StickyScroll, type StickyStep } from '@/components/ui/sticky-scroll-reveal'
import { LOOK_RANGE, REGIONS, fmtRange, hm, lookChange, phrase, pct, regionData } from '@/r2/data'
import { OVERVIEW_PHOTO, photoFor } from '@/r2/photos'
import factsJson from '../../../../data/out/facts.json'
import { cn } from '@/lib/utils'
import {
  CAVEAT, FEATURED, IMG, JETHVA, More, Reveal, Rule, SatMark, SiteBar, focusRing, numWord, shell, textLink, useInView,
  primaryButton, useMedia, useMotion, type Leave, type Links,
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
  return { id: r.id, name: r.name, short: phrase(r.id).short, look, read, band: d.placebo, usual: d.placeboYears, later: !!d.driftStart && (look?.minutes ?? 0) > 0 }
})
type Row = (typeof ROWS)[number]
const UNUSUAL = ROWS.filter((r) => r.read?.unusual)
const ALL_LATER = ROWS.every((r) => r.later)
/** The finding, worded from the rows: every place looked later; these were unusual. */
const FINDING = [
  ALL_LATER ? `In all ${numWord(ROWS.length)} places, Aqua started looking later.` : `In ${numWord(ROWS.filter((r) => r.later).length)} of ${numWord(ROWS.length)} places, Aqua started looking later.`,
  UNUSUAL.length
    ? `In ${numWord(UNUSUAL.length)} (${UNUSUAL.map((r) => r.short).join(', ')}), its ${YEAR} count was unusually far from what we’d expect.`
    : `In none was its ${YEAR} count unusually far from what we’d expect.`,
]
/** INPE's official Amazon count and the VIIRS-based benchmark, 2024 to 2025 (data/out/facts.json, amazon_decline_2024_2025),
 *  and Aqua's 2025 count beside the benchmark (data/out/audit/br-amazon.json) */
const DECLINE = (factsJson as { facts: { id: string; value: unknown }[] }).facts.find((f) => f.id === 'amazon_decline_2024_2025')?.value as
  | { inpe_2024: number; inpe_2025: number; fixed_2024: number; fixed_2025: number; inpe_pct: number; fixed_pct: number } | undefined
const AMAZON_2025 = regionData('br-amazon').latestOk
const int = (n: number) => Math.round(n).toLocaleString('en-US')
const RANGE = LOOK_RANGE ? `${LOOK_RANGE.min} to ${LOOK_RANGE.max} minutes` : 'more than an hour'

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

/** The day the middle chapter follows: the featured place's look times, and the satellites' pictures of one day. */
const DAY = regionData(FEATURED)
const DAY_LOOK = lookChange(DAY)
type PassKey = 'terra' | 'viirs' | 'aqua'
const PASSES: Record<PassKey, { name: string; when: string; alt: string; fit?: string }> = {
  terra: { name: 'Terra', when: 'Morning', alt: 'Terra, morning, 4 Sep 2026: hazy smoke and a few clouds over the forest', fit: 'object-left' },
  viirs: { name: 'VIIRS', when: 'Early afternoon', alt: 'VIIRS, early afternoon, 4 Sep 2026: small clouds spread across the same forest' },
  aqua: { name: 'Aqua', when: 'Later afternoon', alt: 'Aqua, later afternoon, 4 Sep 2026: towering clouds over the same forest' },
}
/** What the one big picture says about itself: VIIRS's picture stands for Aqua's old time of day. */
const PLATE: Record<'viirs' | 'aqua', string> = {
  viirs: 'Early afternoon, near Aqua’s 2012–2020 time · seen by VIIRS',
  aqua: 'Later afternoon, Aqua’s time now · seen by Aqua',
}
const wide = (k: PassKey) => `${IMG}amazon-${k}-2026-09-04.jpg`
const square = (k: PassKey) => `${IMG}prints/amazon-${k}-sq.jpg`

/** Their reveal curve (easeOutExpo), for the moments this page authors. */
const expo = 'ease-[cubic-bezier(0.19,1,0.22,1)]'
const plate = 'rounded-[3px] bg-[color:var(--plate)] px-2 py-1 text-xs text-[color:var(--bone)]'

export default function Overview({ links, leave }: { links: Links; leave: Leave }) {
  return (
    <>
      <SiteBar page="overview" links={links} leave={leave} />
      <main>
        <Park links={links} leave={leave} />
        <Later />
        <OneDay />
        <Finding links={links} leave={leave} />
        <Doors links={links} leave={leave} />
      </main>
    </>
  )
}

/* ---------- The park: the photograph and the question, together from the first frame ---------- */

/** Phones and tablets: the scrim rises from the bottom, under the title. */
const LOW_SCRIM = 'linear-gradient(0deg, rgba(11,13,11,0.94) 0%, rgba(11,13,11,0.74) 32%, rgba(11,13,11,0.36) 62%, rgba(11,13,11,0.12) 100%)'
/** Wide screens: the scrim deepens the dark sky on the left, where the title sits. */
const WIDE_SCRIM = 'linear-gradient(90deg, rgba(11,13,11,0.9) 0%, rgba(11,13,11,0.62) 36%, rgba(11,13,11,0) 66%), linear-gradient(0deg, rgba(11,13,11,0.6) 0%, rgba(11,13,11,0) 38%)'

/** The opening: the framed photograph with the question already on it. No scroll effect; it is a little shorter than
 *  the screen so the next section shows below it. */
function Park({ links, leave }: { links: Links; leave: Leave }) {
  const p = OVERVIEW_PHOTO
  return (
    <section aria-labelledby="park-h" className="relative pt-14">
      <div className="px-2 pt-2 sm:px-4 sm:pt-4">
        {/* their framed film: the picture inside a thin ground frame */}
        <div
          style={{ '--focus': p.focus, '--focus-phone': p.focusPhone } as CSSProperties}
          className="relative isolate h-[min(78svh,760px)] min-h-[440px] overflow-hidden rounded-[4px] bg-[color:var(--surface)]"
        >
          <img
            src={p.src(1600)}
            srcSet={`${p.src(960)} 960w, ${p.src(1600)} 1600w, ${p.src(2400)} 2400w`}
            sizes="100vw"
            alt={p.alt}
            width={p.width}
            height={p.height}
            fetchPriority="high"
            className="absolute inset-0 -z-10 size-full object-cover object-[var(--focus-phone)] sm:object-[var(--focus)]"
          />
          <div aria-hidden className="absolute inset-0 -z-10 lg:hidden" style={{ background: LOW_SCRIM }} />
          <div aria-hidden className="absolute inset-0 -z-10 hidden lg:block" style={{ background: WIDE_SCRIM }} />
          <div className="relative mx-auto flex h-full w-full max-w-[calc(var(--maxw)-32px)] items-end px-2 pb-10 sm:px-4 sm:pb-12 lg:pb-16">
            <div>
              <h1 id="park-h" className="text-[clamp(56px,11vw,168px)] font-medium leading-[0.9] tracking-[-0.04em] text-[color:var(--bone)]">
                Anchor
              </h1>
              <p className="mt-4 max-w-[28rem] text-[24px] leading-[1.25] text-[color:var(--bone)]">A fire calendar for six regions.</p>
              <a href={`${links.regions()}#calendar`} onClick={leave} className={cn(primaryButton, 'mt-6')}>
                Open the fire calendar <ArrowUpRight size={16} aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Years later: the second count, on its own below the photograph, with the clock moving from 1:30 to 3:00 the first
 *  time it comes into view. */
function Later() {
  const motion = useMotion()
  const [ref, seen] = useInView<HTMLDivElement>(motion.on, 0.6)
  const [moved, setMoved] = useState(!motion.on)
  useEffect(() => {
    if (!seen) return
    if (!motion.on) { setMoved(true); return }
    const t = window.setTimeout(() => setMoved(true), 450)
    return () => window.clearTimeout(t)
  }, [seen, motion.on])
  return (
    <section aria-labelledby="later-h">
      {/* one pattern for both statements: the headline on the left, its supporting line on the right, bottoms aligned */}
      {/* one column: the statement, then its line under it; space, not rules, separates the two statements */}
      <div className={cn(shell, 'flex flex-col gap-5 pb-16 pt-20 lg:pb-24 lg:pt-28')}>
        <h2 id="later-h" className="max-w-[22ch] text-balance text-[40px] font-medium leading-[1.02] tracking-[-0.02em]">
          Count people in a park at <span className="tabular-nums">1:30</span>. Years later you count at <span className="tabular-nums">3:00</span> and find more people.
        </h2>
        <div className="flex max-w-[36rem] flex-col gap-6">
          <p className="text-lg leading-[1.56] text-[color:var(--bone2)]">Did more people come, or did you just show up at a busier time?</p>
          <div ref={ref}><ParkClock moved={moved} big /></div>
        </div>
      </div>
    </section>
  )
}

/** The park's two counts on one stretch of afternoon: a ring at 1:30, the dot at 3:00. Bone, not amber: this is the
 *  park, not a satellite. The same ring-and-dot reads Aqua's move further down. */
function ParkClock({ moved, big = false }: { moved: boolean; big?: boolean }) {
  const motion = useMotion()
  const travel = motion.on ? `transition-[left,width] duration-1000 ${expo}` : ''
  return (
    <span role="img" aria-label="The count moved from 1:30 to 3:00." className={cn('flex items-center gap-4 tabular-nums text-[color:var(--bone2)]', big ? 'text-lg' : 'text-sm')}>
      <span>1:30</span>
      <span aria-hidden className={cn('relative block h-3', big ? 'w-full max-w-64 flex-1' : 'w-28 sm:w-40')}>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[color:var(--bone-30)]" />
        <span className={cn('absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[color:var(--bone)]', travel)} style={{ width: moved ? '100%' : '0%' }} />
        <span className="absolute left-0 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:var(--bone)] bg-[color:var(--ground)]" />
        <span className={cn('absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--bone)]', travel)} style={{ left: moved ? '100%' : '0%' }} />
      </span>
      <span className={cn(motion.on && 'transition-colors duration-500', moved ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone3)]')}>3:00</span>
    </span>
  )
}

/* ---------- One day: Aqua's question, one step per scroll ---------- */

function OneDay() {
  const motion = useMotion()
  // wide screens scrub one pinned picture; phones put each step's picture right under it
  const wideScreen = useMedia('(min-width: 1024px)')
  const look = DAY_LOOK
  if (!look) return null
  const steps: StickyStep[] = [
    { mark: look.old, title: 'Aqua used to look here', description: <>From 2012 to 2020 it passed over {phrase(FEATURED).the} at about {look.old}, local sun time.</> },
    {
      mark: look.now,
      title: `In ${look.year} it looked ${look.minutes} minutes later`,
      description: <>{DAY.driftStart ? <>Here the move started in {DAY.driftStart}. </> : null}Across our six places, Aqua now looks {RANGE} later.</>,
    },
    { title: 'A later look sees a different afternoon', description: 'Clouds, smoke and fires change during the day, so a later look can count more fires or fewer.' },
    { mark: look.viirs, title: 'Other satellites kept their time', description: <>VIIRS still looks at about {look.viirs}. {DAY.ratio != null ? <>From 2012 to 2020, Aqua made about {Math.round(DAY.ratio * 100)} fire detections for every 100 by VIIRS. </> : null}That 2012–2020 rate times VIIRS’s count is the benchmark.</> },
  ]
  return (
    <section id="day" aria-labelledby="day-h" className="border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'pb-6 lg:pb-12')}>
        <div className="flex flex-col gap-5 pt-8 lg:pt-12">
          <h2 id="day-h" className="max-w-[22ch] text-balance text-[40px] font-medium leading-[1.02] tracking-[-0.02em]">
            Aqua, a NASA satellite that spots fires from space, faces the same question.
          </h2>
          <p className="max-w-[36rem] text-lg leading-[1.56] text-[color:var(--bone2)]">Brazil’s official fire count (INPE) relies on Aqua. But Aqua now flies over the Amazon about {look.minutes} minutes later than it did in 2012–2020.</p>
        </div>
        {wideScreen ? (
          <StickyScroll
            className="mt-16"
            steps={steps}
            panel={(i) => <DayPanel step={i} />}
            top="5.5rem"
            motion={motion.on}
            label={`Aqua’s day over ${phrase(FEATURED).the}, step by step`}
          />
        ) : (
          <ol aria-label={`Aqua’s day over ${phrase(FEATURED).the}, step by step`} className="mt-10 flex flex-col gap-14">
            {steps.map((s, i) => (
              <li key={s.title} className="border-t border-[color:var(--hairline)] pt-4">
                <h3 className="text-2xl font-medium leading-tight tracking-[-0.01em]">
                  {s.mark ? <span className="tabular-nums">{s.mark} </span> : null}
                  {s.title}
                </h3>
                <p className="mt-2 max-w-[var(--measure)] text-base text-[color:var(--bone2)]">{s.description}</p>
                <div className="mt-5">
                  {/* the last step's picture is the first one again, so it keeps only the clock */}
                  <DayPanel step={i} picture={i !== steps.length - 1} caption={i === steps.length - 1} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

/** The picture beside the steps: the satellites' views of one day, and the day's clock under them. */
function DayPanel({ step, picture = true, caption = true }: { step: number; picture?: boolean; caption?: boolean }) {
  const motion = useMotion()
  const one: PassKey | null = step === 1 ? 'aqua' : step === 2 ? null : 'viirs'
  const fade = motion.on ? 'transition-opacity duration-700 ease-[var(--ease)]' : ''
  return (
    <figure className="m-0">
      {picture ? (
        <div className="relative aspect-[13/10] max-h-[56svh] w-full overflow-hidden rounded-[4px] bg-[color:var(--surface)]">
          {(['viirs', 'aqua'] as const).map((k) => (
            <img
              key={k}
              src={wide(k)}
              alt={one === k ? PASSES[k].alt : ''}
              aria-hidden={one !== k}
              width={936}
              height={720}
              loading="lazy"
              className={cn('absolute inset-0 size-full object-cover', fade, one === k ? 'opacity-100' : 'opacity-0')}
            />
          ))}
          <ul aria-hidden={step !== 2} className={cn('absolute inset-0 grid grid-cols-3 gap-0.5 bg-[color:var(--ground)]', fade, step === 2 ? 'opacity-100' : 'opacity-0')}>
            {(['terra', 'viirs', 'aqua'] as const).map((k) => (
              <li key={k} className="relative min-w-0">
                <img src={square(k)} alt={step === 2 ? PASSES[k].alt : ''} width={720} height={720} loading="lazy" className={cn('size-full object-cover', PASSES[k].fit)} />
                <span className={cn('absolute bottom-2 left-2 flex items-center gap-1.5', plate)}>
                  <SatMark sat={k} size={9} />
                  {PASSES[k].name}
                  <span className="hidden text-[color:var(--bone2)] sm:inline">· {PASSES[k].when}</span>
                </span>
              </li>
            ))}
          </ul>
          {one ? (
            <span className={cn('absolute left-3 top-3 flex items-center gap-1.5', plate)}>
              <SatMark sat={one} size={9} />
              {PLATE[one]}
            </span>
          ) : null}
        </div>
      ) : null}
      <DayLine step={step} />
      {caption ? (
        <figcaption className="mt-3 text-xs text-[color:var(--bone3)]">
          Pictures: {phrase(FEATURED).the.replace(/^the /, 'the central ')}, 4 September 2026, with each satellite’s fire detections (NASA Worldview). Times: usual looks in {DAY_LOOK?.year}, local sun time.
        </figcaption>
      ) : null}
    </figure>
  )
}

const FROM = 6, TO = 18
const TICKS = [6, 9, 12, 15, 18]
const tick = (h: number) => `${String(h).padStart(2, '0')}:00`

/** One day, 06:00 to 18:00. Aqua rides above the line (the amber ring where it used to look, the dot where it looks
 *  now); VIIRS and Terra sit on it. The readout under it names what the step is about. */
function DayLine({ step }: { step: number }) {
  const motion = useMotion()
  const look = DAY_LOOK!
  const ref = useRef<HTMLDivElement | null>(null)
  const W = useMeasuredWidth(ref)
  // the dot travels the first time its clock is on screen (a phone's step 2), or when the step changes beside it
  const [box, seen] = useInView<HTMLDivElement>(motion.on, 0.6)
  const pad = 8
  const x = (h: number) => pad + ((h - FROM) / (TO - FROM)) * Math.max(0, W - pad * 2)
  const moved = step >= 1 && seen
  const xOld = x(hm(look.old)), xNow = x(hm(look.now))
  const xA = moved ? xNow : xOld
  const lane = 14, axis = 40
  const travel = motion.on ? `transition-[left,width,opacity] duration-1000 ${expo}` : ''
  const dim = (on: boolean) => cn(motion.on && 'transition-opacity duration-500', on ? 'opacity-100' : 'opacity-30')
  const label = `Over ${phrase(FEATURED).the}, local sun time: Aqua looked at ${look.old} in 2012–2020 and at ${look.now} in ${look.year}, ${look.minutes} minutes later. VIIRS looked at ${look.viirs}; Terra at ${look.terra}.`
  const chip = (on: boolean, children: ReactNode, show = true) =>
    show ? (
      <li className={cn('flex items-center gap-2 rounded-[3px] border px-2 py-1', motion.on && 'transition-colors duration-500', on ? 'border-[color:var(--bone-30)] text-[color:var(--bone)]' : 'border-transparent text-[color:var(--bone3)]')}>
        {children}
      </li>
    ) : null
  return (
    <div ref={box} className="mt-5">
      <div ref={ref} role="img" aria-label={label} className="relative w-full" style={{ height: 66 }}>
        {W > 0 ? (
          <>
            <span aria-hidden className="absolute h-px bg-[color:var(--bone-30)]" style={{ left: pad, right: pad, top: axis }} />
            {TICKS.map((h) => (
              <span key={h} aria-hidden className="absolute -translate-x-1/2 text-xs tabular-nums text-[color:var(--bone3)]" style={{ left: x(h), top: axis + 10 }}>
                <span className="absolute -top-[10px] left-1/2 h-1.5 w-px -translate-x-1/2 bg-[color:var(--bone-30)]" />
                {tick(h)}
              </span>
            ))}
            {/* Terra: the morning look, only while the three pictures show */}
            <span aria-hidden className={cn('absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:var(--sat-terra)] bg-[color:var(--ground)]', motion.on && 'transition-opacity duration-500', step === 2 ? 'opacity-100' : 'opacity-0')} style={{ left: x(hm(look.terra)), top: axis }} />
            {/* VIIRS: the green diamond that kept its time */}
            <span aria-hidden className={cn('absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[color:var(--sat-viirs)]', dim(step !== 1))} style={{ left: x(hm(look.viirs)), top: axis }} />
            {/* Aqua: the minutes it added, the ring where it used to look, the dot where it looks now */}
            <span aria-hidden className={cn('absolute h-1 -translate-y-1/2 rounded-full bg-[color:var(--sat-aqua)]', travel)} style={{ left: xOld, width: Math.max(0, xA - xOld), top: lane }} />
            <span aria-hidden className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:var(--sat-aqua)] bg-[color:var(--ground)]" style={{ left: xOld, top: lane }} />
            <span aria-hidden className={cn('absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--sat-aqua)] ring-2 ring-[color:var(--ground)]', travel, moved ? 'opacity-100' : 'opacity-0')} style={{ left: xA, top: lane }} />
            <span aria-hidden className="absolute h-[26px] w-px bg-[color:var(--bone-20)]" style={{ left: xOld, top: lane + 2 }} />
          </>
        ) : null}
      </div>
      <ul aria-hidden className="mt-1 flex flex-wrap gap-x-1 gap-y-1 text-xs tabular-nums sm:text-sm">
        {chip(step === 0 || step === 3, <><span className="inline-block size-3 rounded-full border-2 border-[color:var(--sat-aqua)]" />Aqua, 2012–2020 <b className="font-medium">{look.old}</b></>)}
        {chip(step === 1 || step === 2, <><SatMark sat="aqua" size={11} />Aqua, {look.year} <b className="font-medium">{look.now}</b><span className="rounded-[3px] bg-[color:var(--sat-aqua)] px-1.5 text-xs font-medium text-[color:var(--ink)]">+{look.minutes} min</span></>)}
        {chip(step === 2 || step === 3, <><SatMark sat="viirs" size={11} />VIIRS <b className="font-medium">{look.viirs}</b></>)}
        {chip(step === 2, <><SatMark sat="terra" size={11} />Terra <b className="font-medium">{look.terra}</b></>, step === 2)}
      </ul>
    </div>
  )
}

/* ---------- The finding, the caveat beside it, and the six places on shared scales ---------- */

function Finding({ links, leave }: { links: Links; leave: Leave }) {
  return (
    <section id="finding" aria-labelledby="finding-h" className="scroll-mt-14">
      {/* the page's one change of ground: the finding on bone, the way their key statements sit on a lighter band */}
      <div className="bg-[color:var(--bone)] text-[color:var(--ink)]">
        <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
          <div className="lg:col-span-8">
            <h2 id="finding-h" tabIndex={-1} className="text-balance text-[clamp(32px,4.2vw,60px)] font-medium leading-[1.04] tracking-[-0.03em] outline-none">
              {DECLINE
                ? <>Brazil’s official Amazon count fell {Math.abs(Math.round(DECLINE.inpe_pct))}% from 2024 to 2025; the VIIRS-based benchmark fell {Math.abs(Math.round(DECLINE.fixed_pct))}%.</>
                : FINDING.join(' ')}
            </h2>
            {DECLINE ? (
              <p className="mt-4 text-sm tabular-nums text-[color:var(--ink)] opacity-70">
                Official (INPE): {int(DECLINE.inpe_2024)} to {int(DECLINE.inpe_2025)} detections. Benchmark: {int(DECLINE.fixed_2024)} to {int(DECLINE.fixed_2025)}.
              </p>
            ) : null}
            {AMAZON_2025 && AMAZON_2025.aqua != null && AMAZON_2025.fixed != null ? (
              <p className="mt-6 max-w-[40rem] text-lg text-[color:var(--ink)]">
                In {AMAZON_2025.year} Aqua recorded about {int(Math.round((AMAZON_2025.aqua - AMAZON_2025.fixed) / 1000) * 1000)} more Amazon detections than the benchmark{' '}
                <span className="tabular-nums">({int(AMAZON_2025.aqua)} vs {int(AMAZON_2025.fixed)})</span>.
              </p>
            ) : null}
          </div>
          <Reveal className="lg:col-span-3 lg:col-start-10 lg:self-start lg:pt-2">
            <p className="rounded-[4px] border border-[color:var(--ink-20)] p-4 text-base text-[color:var(--ink)] lg:p-5 lg:text-lg">{CAVEAT}</p>
          </Reveal>
        </div>
      </div>
      <div className={cn(shell, 'pb-16 lg:pb-24')}>
        <Places />
      </div>
    </section>
  )
}

const COLS = 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)_minmax(0,1.7fr)_minmax(0,0.7fr)]'

/** The six places as a table to read, not a menu: the way into each place's page is the Regions door at the end. */
function Places() {
  const th = 'text-xs text-[color:var(--bone3)]'
  return (
    <div className="mt-14">
      <Rule />
      <div aria-hidden className={cn('hidden items-start gap-x-6 pt-4 md:grid', COLS)}>
        <span className={th}>Place</span>
        <span className={th}>How much later Aqua looks</span>
        <span className={th}>
          {YEAR} count vs the benchmark
          <StripAxis />
        </span>
        <span className={th}>Unusual?</span>
      </div>
      <ol className="border-[color:var(--hairline)] md:mt-3 md:border-t">
        {ROWS.map((r, i) => (
          <PlaceRow key={r.id} r={r} i={i} />
        ))}
      </ol>
      <More label="About the range" className="mt-4">
      <p className="mt-2 max-w-[64rem] text-xs text-[color:var(--bone3)]">
        Look times: local sun time, 2012–2020 against {YEAR}. Unusual: further from the benchmark than any year from 2012 to 2020; the amber line is the likely range.
        Punjab + Haryana is our test case, checked against <a href={JETHVA} target="_blank" rel="noreferrer" className={textLink}>Jethva 2026</a>.
      </p>

        <p className="max-w-[64rem] text-xs text-[color:var(--bone3)]">
          The amber line is a 95% bootstrap interval: the days compared are resampled many times and the middle 95% of results kept. It depends on that
          resampling. It is not the probability that an effect of the timing lies inside it.
        </p>
      </More>
    </div>
  )
}

function PlaceRow({ r, i }: { r: Row; i: number }) {
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
    <Reveal as="li" delay={i * 80}>
      <div className={cn('grid grid-cols-2 items-center gap-x-4 gap-y-3 border-b border-[color:var(--hairline)] py-5 md:gap-x-6 md:py-4', COLS)}>
        <span className="flex min-w-0 items-center gap-4">
          <span className="block h-14 w-20 shrink-0 overflow-hidden rounded-[3px] md:h-16 md:w-24">
            <img
              src={photo.srcSm}
              alt=""
              width={720}
              height={480}
              loading="lazy"
              style={{ objectPosition: photo.focus }}
              className="size-full object-cover"
            />
          </span>
          <span className="min-w-0 text-lg font-medium leading-tight text-[color:var(--bone)] md:text-xl">{r.name}</span>
        </span>
        <span className="justify-self-end md:hidden">{chip}</span>
        <span>
          <span className={label}><span className="md:hidden">Aqua looks later</span><span className="max-md:hidden">How much later Aqua looks</span></span>
          <span className="text-lg tabular-nums text-[color:var(--bone)]">+{r.look?.minutes ?? '—'} min</span>
          {r.look ? <span className="sr-only"> (from {r.look.old} to {r.look.now})</span> : null}
          {r.look ? <span className="max-md:hidden"><MiniShift old={r.look.old} now={r.look.now} /></span> : null}
        </span>
        <span>
          <span className={label}><span className="md:hidden">vs benchmark</span><span className="max-md:hidden">{YEAR} count vs the benchmark</span></span>
          {r.read ? (
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <RollingDigits text={pct(r.read.gap, 0)} motion={motion.on} className="text-lg text-[color:var(--bone)]" />
              <span className="text-xs tabular-nums text-[color:var(--bone3)] max-md:hidden">Likely range: {fmtRange(r.read.lo, r.read.hi, 0)}</span>
            </span>
          ) : (
            <span className="block text-sm text-[color:var(--bone2)]"><span className="md:hidden">Too few fires</span><span className="max-md:hidden">Too few fires to read in {YEAR}</span></span>
          )}
          <span className="max-md:hidden"><Strip r={r} /></span>
        </span>
        <span className="hidden md:block">{chip}</span>
      </div>
    </Reveal>
  )
}

/** A place's shift on a short stretch of the afternoon (12:30 to 15:30): an amber ring at the old time, the dot at the
 *  new one, and the times under it. */
function MiniShift({ old, now }: { old: string; now: string }) {
  const at = (t: string) => `${((hm(t) - 12.5) / 3) * 100}%`
  return (
    <span aria-hidden className="mt-1.5 block w-full max-w-[220px]">
      <span className="relative block h-3">
        <span className="absolute inset-x-0 top-1/2 h-px bg-[color:var(--bone-20)]" />
        <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-[color:var(--sat-aqua)]" style={{ left: at(old), width: `calc(${at(now)} - ${at(old)})` }} />
        <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:var(--sat-aqua)] bg-[color:var(--ground)]" style={{ left: at(old) }} />
        <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--sat-aqua)]" style={{ left: at(now) }} />
      </span>
      <span className="mt-0.5 flex justify-between text-xs tabular-nums text-[color:var(--bone3)]"><span>{old}</span><span>{now}</span></span>
    </span>
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
              {v === 0 ? 'benchmark' : `${v > 0 ? '+' : '−'}${Math.abs(v)}%`}
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
          title="Fire calendar"
          line="Every month since 2002, for six places."
          className="min-h-[380px] lg:col-span-7 lg:row-span-2 lg:min-h-[620px]"
          art={
            <span className="grid size-full grid-cols-3 grid-rows-2 gap-0.5 bg-[color:var(--ground)]">
              {REGIONS.map((r) => {
                const p = photoFor(r.id)
                return (
                  <span key={r.id} className="relative block min-h-0 overflow-hidden">
                    <img src={p.srcSm} alt="" loading="lazy" className={pic} style={{ objectPosition: p.focus }} />
                    <span className={cn('absolute left-2 top-2', plate)}>{phrase(r.id).short}</span>
                  </span>
                )
              })}
            </span>
          }
        />
        <Door
          href={links.sim()}
          leave={leave}
          title="What-if for responders"
          line="A what-if: when each satellite’s alert could arrive under an assumed delay."
          className="min-h-[280px] lg:col-span-5"
          art={<img src={`${IMG}sim/${FEATURED}-context.jpg`} alt="" loading="lazy" className={pic} style={{ objectPosition: '30% 62%' }} />}
        />
        <Door
          href={links.method()}
          leave={leave}
          title="How we know"
          line="How the comparison works, and what it can’t tell you."
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
