/*
 * THESIS: The overview is one day. Anchor's idea is a count taken later in the day, so the page moves along the clock:
 *   Aqua's look sliding from 13:37 to 14:57 over one real Amazon day, the park only as an analogy; then six places on
 *   the same afternoon. It refuses the stat-row-and-cards landing.
 * OWN-WORLD: Anchor dark: ground #0B0D0B, bone text, Albert Sans, hairlines, 4 px corners; photographs carry the colour.
 *   Terra a blue ring, VIIRS a green diamond, Aqua amber; a ring is the old time, a dot the new; amber means Aqua only.
 * STORY: the count is taken later, with the park analogy beside the first picture; Aqua's day, one step per scroll;
 *   the finding with its caveat beside it; six places on shared scales, each a door to its page; three picture doors on.
 * FIRST VIEWPORT: a framed, full-height Unsplash photograph of wildfire smoke at dusk; the name and one line bottom-left
 *   on a ground scrim; "Open the fire calendar"; the next chapter peeks.
 * FORM: one day, scrubbed (4 of 6), staged as Anduril's framed film, then a sticky reveal; seed 5dd3674c.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 *
 * Every number comes from src/r2/data.ts (data/out/drift and data/out/audit); "unusual" is the audit's outside_noise,
 * read only where the year's status is ok. The satellite pictures are NASA Worldview / GIBS (credited in the footer).
 */
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { RollingDigits } from '@/components/ui/rolling-digits'
import { useMeasuredWidth } from '@/components/ui/series-chart'
import { StickyScroll, type StickyStep } from '@/components/ui/sticky-scroll-reveal'
import { CHECKS, LOOK_RANGE, REGIONS, fmtInt, fmtRange, hm, inpeReproduction, lookChange, phrase, pct, regionData } from '@/r2/data'
import { OVERVIEW_PHOTO, photoFor } from '@/r2/photos'
import factsJson from '../../../../data/out/facts.json'
import { cn } from '@/lib/utils'
import {
  CAVEAT, FEATURED, Footer, andList, capital, IMG, JETHVA, More, PageNext, Reveal, Rule, SatMark, SiteBar, focusRing, numWord, shell, textLink, useInView,
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
  const read = y && y.verdict !== 'na' && y.gap != null && y.lo != null && y.hi != null ? { gap: y.gap, lo: y.lo, hi: y.hi, unusual: y.verdict === 'outside', close: y.verdict === 'close', past: y.pointsPast } : null
  return { id: r.id, name: r.name, short: phrase(r.id).short, look, read, band: d.placebo, usual: d.placeboYears, later: !!d.driftStart && (look?.minutes ?? 0) > 0 }
})
type Row = (typeof ROWS)[number]
const UNUSUAL = ROWS.filter((r) => r.read?.unusual)
const CLOSE = ROWS.filter((r) => r.read?.close)
const ALL_LATER = ROWS.every((r) => r.later)
/** The finding, worded from the rows: every place looked later; these were unusual. */
/** "In 2025, Aqua's count was clearly unusual in two places (Amazon, Cerrado); Argentina is a close call." */
const closeText = CLOSE.length ? `${andList(CLOSE.map((r) => r.short))} ${CLOSE.length === 1 ? 'is a close call' : 'are close calls'}` : ''
const UNUSUAL_LINE = UNUSUAL.length
  ? `In ${YEAR}, Aqua’s count was clearly unusual in ${numWord(UNUSUAL.length)} ${UNUSUAL.length === 1 ? 'place' : 'places'} (${UNUSUAL.map((r) => r.short).join(', ')})${closeText ? `; ${closeText}` : ''}.`
  : `In ${YEAR}, Aqua’s count was not clearly unusual in any place${closeText ? `; ${closeText}` : ''}.`
const FINDING = [
  ALL_LATER ? `In all ${numWord(ROWS.length)} places, Aqua started looking later.` : `In ${numWord(ROWS.filter((r) => r.later).length)} of ${numWord(ROWS.length)} places, Aqua started looking later.`,
  UNUSUAL_LINE,
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
/** Aqua's matched-day count against the benchmark in the audit's last readable year, as a whole percent. */
const HERO_GAP = DAY.latestOk?.gap != null && DAY.latestOk.year === YEAR ? Math.round(DAY.latestOk.gap) : null
/** The INPE match for the Amazon's last year in the reproduction file: our count of Aqua's fires beside INPE's own. */
const RECEIPT = (() => {
  const r = inpeReproduction(FEATURED).filter((x) => x.inpe > 0 && x.firms > 0).sort((a, b) => b.year - a.year)[0]
  if (!r) return null
  const off = Math.abs(r.firms - r.inpe) / r.inpe * 100
  return { ...r, within: off < 0.5 ? '0.5' : off < 1 ? '1' : String(Math.ceil(off)) }
})()
type PassKey = 'terra' | 'viirs' | 'aqua'
const PASSES: Record<PassKey, { name: string; when: string; alt: string; fit?: string }> = {
  terra: { name: 'Terra', when: 'Morning', alt: 'Terra, morning, 4 Sep 2026: hazy smoke and a few clouds over the forest', fit: 'object-left' },
  viirs: { name: 'VIIRS', when: 'Early afternoon', alt: 'VIIRS, early afternoon, 4 Sep 2026: small clouds spread across the same forest' },
  aqua: { name: 'Aqua', when: 'Later afternoon', alt: 'Aqua, later afternoon, 4 Sep 2026: towering clouds over the same forest' },
}
/** What the one big picture says about itself: VIIRS's picture stands for Aqua's old time of day. */
const PLATE: Record<'viirs' | 'aqua', string> = {
  viirs: 'Near Aqua’s 2012–2020 time · seen by VIIRS',
  aqua: 'Aqua’s time now · seen by Aqua',
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
        <WhoFor />
        <OneDay />
        <WhatsNew links={links} leave={leave} />
        <Finding links={links} leave={leave} />
      </main>
      <PageNext page="overview" links={links} leave={leave} />
      <Footer links={links} leave={leave} />
    </>
  )
}

/* ---------- The opening: the framed photograph ---------- */

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
            {...{ fetchpriority: "high" }}
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
              {HERO_GAP != null && DAY_LOOK ? (
                <p className="mt-3 max-w-[34rem] text-base leading-[1.5] text-[color:var(--bone2)]">
                  Aqua, the satellite behind Brazil’s official fire count, now passes {DAY_LOOK.minutes} minutes later. On days both satellites saw the Amazon, its {YEAR} count ran {HERO_GAP}% above our VIIRS-based benchmark.
                </p>
              ) : null}
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

/** Who this is for and what to do with it, in one sentence under the photograph. */
function WhoFor() {
  return (
    <div className={cn(shell, 'pt-8 lg:pt-10')}>
      <p className="max-w-[46rem] text-lg leading-[1.5] text-[color:var(--bone2)]">
        <span className="text-[color:var(--bone)]">For anyone comparing fire years in satellite counts</span> (agencies, journalists, researchers): check a record year against a steady reference before calling it a record.
      </p>
    </div>
  )
}

/** What is new here, as three short claims and one receipt from the data. */
function WhatsNew({ links, leave }: { links: Links; leave: Leave }) {
  const items = [
    'A fire calendar on a steady reference',
    'A check against VIIRS, a satellite that kept its time',
    `${capital(numWord(CHECKS.checks.length))} tests written down, failures shown`,
  ]
  return (
    <section aria-labelledby="new-h" className="border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'py-12 lg:py-16')}>
        <h2 id="new-h" className="text-sm text-[color:var(--bone3)]">What’s new</h2>
        <ol className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-3">
          {items.map((t, i) => (
            <li key={t} className="border-t border-[color:var(--bone-30)] pt-4">
              <span className="text-xs tabular-nums text-[color:var(--bone3)]">0{i + 1}</span>
              <p className="mt-1 max-w-[22ch] text-balance text-2xl font-medium leading-[1.15] tracking-[-0.015em] text-[color:var(--bone)]">{t}</p>
            </li>
          ))}
        </ol>
        {RECEIPT ? (
          <p className="mt-8 max-w-[46rem] text-base text-[color:var(--bone2)]">
            Our Aqua count matches INPE’s official Amazon count within {RECEIPT.within}% ({RECEIPT.year}: <span className="tabular-nums">{fmtInt(RECEIPT.firms)}</span> against <span className="tabular-nums">{fmtInt(RECEIPT.inpe)}</span>).{' '}
            <a href={links.method('inpe')} onClick={leave} className={textLink}>See the match</a>
          </p>
        ) : null}
      </div>
    </section>
  )
}

/* ---------- One day: Aqua's question, one step per scroll ---------- */

function OneDay() {
  const motion = useMotion()
  // wide screens scrub one pinned picture; phones put each step's picture right under it
  const wideScreen = useMedia('(min-width: 1024px)')
  const look = DAY_LOOK
  if (!look) return null
  // Terra drifted too (earlier), so only VIIRS is said to have kept its time
  const steps: StickyStep[] = [
    { mark: look.old, title: 'Aqua used to look here', description: 'Local sun time, 2012–2020.' },
    { mark: look.now, title: 'It looks here now', description: <>Local sun time, {look.year}. Across our six places: {RANGE} later.</> },
    { title: 'A later look sees a different afternoon', description: 'Clouds, smoke and fires change through the day.' },
    { mark: look.viirs, title: 'VIIRS kept its time', description: 'So we use it as the benchmark.' },
  ]
  // the panel's pictures: Aqua then, Aqua now, VIIRS (the panel's step 2, all three satellites side by side, is no longer a step)
  const pic = [0, 1, 3]
  const label = `Aqua’s day over ${phrase(FEATURED).the}, step by step`
  // the claim, then the park analogy, beside the first picture
  const intro = (
    <div className="pb-14 lg:pb-16">
      <h2 id="day-h" className="text-balance text-[40px] font-medium leading-[1.02] tracking-[-0.03em]">
        Brazil’s official fire count is now taken about {look.minutes} minutes later in the day
      </h2>
      <p className="mt-5 max-w-[30rem] text-lg leading-[1.56] text-[color:var(--bone2)]"><span className="font-medium text-[color:var(--bone)]">Analogy:</span> Imagine counting people in a park at 3:00 instead of 1:30. You’d see a different crowd.</p>
    </div>
  )
  return (
    <section id="day" aria-labelledby="day-h">
      <div className={cn(shell, 'pb-6 pt-20 lg:pb-12 lg:pt-28')}>
        {wideScreen ? (
          <StickyScroll intro={intro} steps={steps} panel={(i) => <DayPanel step={pic[i]} />} top="5.5rem" motion={motion.on} label={label} />
        ) : (
          <>
            {intro}
            <ol aria-label={label} className="flex flex-col gap-14">
              {steps.map((s, i) => (
                <li key={s.title} className="border-t border-[color:var(--hairline)] pt-4">
                  <h3 className="text-2xl font-medium leading-tight tracking-[-0.01em]">
                    {s.mark ? <span className="tabular-nums">{s.mark} </span> : null}
                    {s.title}
                  </h3>
                  <p className="mt-2 max-w-[var(--measure)] text-base text-[color:var(--bone2)] sm:text-lg">{s.description}</p>
                  <div className="mt-5">
                    {/* the last step's picture is the first one again, so it keeps only the clock */}
                    <DayPanel step={pic[i]} picture={i !== steps.length - 1} caption={i === steps.length - 1} />
                  </div>
                </li>
              ))}
            </ol>
          </>
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
          {phrase(FEATURED).the.replace(/^the /, 'The central ')}, 4 September 2026
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
      {/* the page's one change of ground: the finding on bone, then the reason in one line, then the way to the proof */}
      <div className="bg-[color:var(--bone)] text-[color:var(--ink)]">
        <div className={cn(shell, 'py-16 lg:py-24')}>
          <h2 id="finding-h" tabIndex={-1} className="max-w-[26ch] text-balance text-[clamp(32px,4.2vw,60px)] font-medium leading-[1.04] tracking-[-0.03em] outline-none">
            {DECLINE
              ? <>Brazil’s official Amazon fire count fell {Math.abs(Math.round(DECLINE.inpe_pct))}% from 2024 to 2025. The benchmark fell {Math.abs(Math.round(DECLINE.fixed_pct))}%.</>
              : FINDING.join(' ')}
          </h2>
          <p className="mt-6 max-w-[40rem] text-lg leading-[1.56]">{CAVEAT}</p>
          <a href={links.method('overview-figures')} onClick={leave} className={cn(textLink, 'mt-4 inline-flex min-h-11 items-center gap-1 text-sm text-[color:var(--ink)]')}>How we know <ArrowUpRight size={14} aria-hidden /></a>
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
        Unusual: the likely range is wholly outside the usual range. Close call: just outside the usual range, but the likely range overlaps it.
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
    <span className="block max-md:text-right">
      <span className={cn('inline-block rounded px-2 py-0.5 text-sm', r.read.unusual ? 'bg-[color:var(--bone)] text-[color:var(--ink)]' : r.read.close ? 'border border-[color:var(--bone-30)] text-[color:var(--bone)]' : 'border border-[color:var(--bone-30)] text-[color:var(--bone2)]')}>
        {r.read.unusual ? 'Unusual' : r.read.close ? 'Close call' : 'Not unusual'}
      </span>
      {r.read.past != null ? <span className="mt-1.5 block text-xs tabular-nums text-[color:var(--bone3)]">{Math.round(r.read.past)} points past the usual range</span> : null}
    </span>
  ) : null
  return (
    <Reveal as="li" delay={i * 80}>
      <div className={cn('grid grid-cols-2 items-center gap-x-4 gap-y-3 border-b border-[color:var(--hairline)] py-5 md:gap-x-6 md:py-4', COLS)}>
        <span className="flex min-w-0 items-center gap-4">
          <span className="block h-14 w-20 shrink-0 overflow-hidden rounded-[3px] md:max-lg:hidden lg:h-16 lg:w-24">
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
        <span className="justify-self-start md:hidden">{chip}</span>
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

/** Supporting figures stay together without mixing full-year totals with matched-day audit counts. */
export function OverviewNotes({ links, leave }: { links: Links; leave: Leave }) {
  return (
    <section id="overview-figures" aria-labelledby="overview-figures-h" className="scroll-mt-32 border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="overview-figures-h" className="text-3xl font-medium tracking-[-0.02em]">The figures behind the Overview</h2>
          <p className="mt-4 text-sm text-[color:var(--bone2)]">Full-year totals and matched-day audit counts answer different questions.</p>
        </div>
        <dl className="space-y-6 text-sm leading-6 text-[color:var(--bone2)] lg:col-span-8">
          {DECLINE ? <div>
            <dt className="font-medium text-[color:var(--bone)]">Full-year Amazon totals · 2024 → 2025</dt>
            <dd>Official INPE: {int(DECLINE.inpe_2024)} → {int(DECLINE.inpe_2025)} detections ({pct(DECLINE.inpe_pct, 0)}). VIIRS-based benchmark: {int(DECLINE.fixed_2024)} → {int(DECLINE.fixed_2025)} ({pct(DECLINE.fixed_pct, 0)}). Whole calendar years, not only the audit’s matched days. Source: <a href="https://data.inpe.br/queimadas/portal/" target="_blank" rel="noreferrer" className={textLink}>INPE Programa Queimadas</a>.</dd>
          </div> : null}
          {AMAZON_2025 && AMAZON_2025.fixed != null ? <div>
            <dt className="font-medium text-[color:var(--bone)]">Matched-day Amazon audit · {AMAZON_2025.year}</dt>
            <dd>Aqua: {int(AMAZON_2025.aqua)} daytime detections; benchmark: {int(AMAZON_2025.fixed)}; {int(AMAZON_2025.aqua - AMAZON_2025.fixed)} more, on days both satellites returned data. These are not the full-year totals above.</dd>
          </div> : null}
          <div>
            <dt className="font-medium text-[color:var(--bone)]">Six-place comparison and uncertainty</dt>
            <dd>Look times are local sun time, 2012–2020 against {YEAR}. The usual range spans nine years, 2012–2020. The amber line is a 95% bootstrap interval (days resampled), not the probability of a timing effect. Unusual: the interval clears the usual range; close calls overlap it. Punjab + Haryana checks the drift against <a href={JETHVA} target="_blank" rel="noreferrer" className={textLink}>Jethva 2026</a>.</dd>
          </div>
          <div>
            <dt className="font-medium text-[color:var(--bone)]">Satellite images and illustrated times</dt>
            <dd>Central Amazon, 4 September 2026, with each satellite’s fire detections (<a href="https://worldview.earthdata.nasa.gov" target="_blank" rel="noreferrer" className={textLink}>NASA Worldview / GIBS</a>). The clock shows usual {DAY_LOOK?.year} look times, not that day’s passes. The VIIRS picture is the early afternoon, near Aqua’s 2012–2020 time.</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
