/*
 * THESIS: Anyone, from a 12-year-old to a busy judge, gets Anchor in one minute: a count taken later in the day may
 *   not be comparable, and here is what that looks like in six places.
 * OWN-WORLD: Anchor dark: ground #0B0D0B, bone text, Albert Sans, hairlines, 4 px corners. Terra a blue ring, VIIRS a
 *   green diamond, Aqua an amber dot; amber means Aqua only.
 * STORY: the park analogy, big; Aqua's own move on one day line (Amazon, 13:37 to 14:57) beside the plain idea; the
 *   finding with its caveat beside it; six rows, each a door to its place; then three ways on.
 * FIRST VIEWPORT: the analogy in large type, the day line under it beginning to move.
 * FORM: one short page in three blocks, plain words only (technical terms live in Method's details).
 * Every number comes from src/r2/data.ts (data/out/drift and data/out/audit); "unusual" is the audit's outside_noise,
 * read only where the year's status is ok.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { RollingDigits } from '@/components/ui/rolling-digits'
import { useMeasuredWidth } from '@/components/ui/series-chart'
import { LOOK_RANGE, REGIONS, fmtRange, hm, lookChange, phrase, pct, regionData } from '@/r2/data'
import { photoFor } from '@/r2/photos'
import { cn } from '@/lib/utils'
import {
  CAVEAT, Reveal, Rule, SatMark, SiteBar, ease, focusRing, numWord, primaryButton, secondaryButton, shell, useInView, useMotion,
  type Leave, type Links,
} from './common'

/** The audit's last year, across the six files. */
const YEAR = Math.max(...REGIONS.flatMap((r) => regionData(r.id).years.map((y) => y.year)))

/** One row of the table: how much later Aqua looked, and its last year against what we'd expect. */
const ROWS = REGIONS.map((r) => {
  const d = regionData(r.id)
  const look = lookChange(d)
  const y = d.years.find((x) => x.year === YEAR) ?? null
  const read = y && y.verdict !== 'na' && y.gap != null && y.lo != null && y.hi != null ? { gap: y.gap, lo: y.lo, hi: y.hi, unusual: y.verdict === 'outside' } : null
  return { id: r.id, name: r.name, short: phrase(r.id).short, look, read, later: !!d.driftStart && (look?.minutes ?? 0) > 0 }
})
const UNUSUAL = ROWS.filter((r) => r.read?.unusual)
const ALL_LATER = ROWS.every((r) => r.later)
/** The finding, worded from the rows: every place looked later; these were unusual. */
const FINDING = [
  ALL_LATER ? `In all ${numWord(ROWS.length)} places, Aqua started looking later.` : `In ${numWord(ROWS.filter((r) => r.later).length)} of ${numWord(ROWS.length)} places, Aqua started looking later.`,
  UNUSUAL.length
    ? `In ${numWord(UNUSUAL.length)} (${UNUSUAL.map((r) => r.short).join(', ')}), its ${YEAR} count was unusually far from what we’d expect.`
    : `In none was its ${YEAR} count unusually far from what we’d expect.`,
]
const RANGE = LOOK_RANGE ? `${LOOK_RANGE.min} to ${LOOK_RANGE.max} minutes` : 'more than an hour'

export default function Overview({ links, leave }: { links: Links; leave: Leave }) {
  return (
    <>
      <SiteBar page="overview" links={links} leave={leave} />
      <main>
        <Analogy />
        <Idea />
        <Finding links={links} leave={leave} />
      </main>
    </>
  )
}

/* ---------- The park ---------- */

function Analogy() {
  return (
    <section aria-labelledby="park-h" className="pt-14">
      <div className={cn(shell, 'pb-10 pt-[10svh] sm:pt-[14svh]')}>
        <h1 id="park-h" className="max-w-[19ch] text-balance text-[clamp(40px,6.6vw,100px)] font-medium leading-[1] tracking-[-0.035em]">
          Imagine counting people in a park every day at <span className="tabular-nums">1:30</span>.
        </h1>
        <Reveal delay={150}>
          <p className="mt-8 max-w-[34ch] text-balance text-[clamp(24px,2.7vw,40px)] leading-[1.15] tracking-[-0.015em] text-[color:var(--bone2)]">
            Years later you count at <span className="tabular-nums text-[color:var(--bone)]">3:00</span> and find more people. Did more people come, or did you just show up at a busier time?
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- Aqua: the same question, for fires ---------- */

function Idea() {
  return (
    <section aria-labelledby="idea-h" className="border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-5">
          <h2 id="idea-h" className="text-balance text-[clamp(26px,2.6vw,36px)] font-medium leading-[1.15] tracking-[-0.015em]">
            Aqua is a NASA satellite that counts fires. It now looks more than an hour later than it used to ({RANGE}).
          </h2>
          <Reveal delay={100}>
            <p className="mt-6 max-w-[var(--measure)] text-lg text-[color:var(--bone2)]">Fires change during the day, so a later look can count more or fewer.</p>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-3 max-w-[var(--measure)] text-lg text-[color:var(--bone2)]">
              Satellites that kept their time let Anchor estimate what Aqua would have counted at its old time, and compare.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <p className="mt-6 text-sm text-[color:var(--bone3)]">INPE’s official fire count for Brazil follows Aqua.</p>
          </Reveal>
        </div>
        <div className="min-w-0 lg:col-span-7 lg:pt-2">
          <DayLine id="br-amazon" />
        </div>
      </div>
    </section>
  )
}

const FROM = 6, TO = 18
const TICKS = [6, 9, 12, 15, 18]
const tick = (h: number) => `${String(h).padStart(2, '0')}:00`

/** One place's day, 06:00 to 18:00: where Aqua used to look, where it looks now, and VIIRS, which kept its time. The
 *  amber dot travels from the old time to the new one the first time the line comes into view. */
function DayLine({ id }: { id: string }) {
  const motion = useMotion()
  const d = useMemo(() => regionData(id), [id])
  const look = lookChange(d)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const W = useMeasuredWidth(boxRef)
  const [ref, seen] = useInView<HTMLDivElement>(motion.on, 0.5)
  const [moved, setMoved] = useState(!motion.on)
  useEffect(() => {
    if (!seen) return
    if (!motion.on) { setMoved(true); return }
    const t = window.setTimeout(() => setMoved(true), 250)
    return () => window.clearTimeout(t)
  }, [seen, motion.on])
  if (!look) return null
  const pad = 8
  const x = (h: number) => pad + ((h - FROM) / (TO - FROM)) * Math.max(0, W - pad * 2)
  const xOld = x(hm(look.old)), xNow = x(hm(look.now)), xV = x(hm(look.viirs))
  const xA = moved ? xNow : xOld
  const narrow = W < 620
  const travel = motion.on ? 'transition-[left,width] duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)]' : ''
  const axisY = narrow ? 28 : 64
  const name = `${phrase(id).the.replace(/^the /, 'the ')}`
  const label = `Over ${name}, local sun time: Aqua looked at ${look.old} in 2012–2020 and at ${look.now} in ${look.year}, ${look.minutes} minutes later. VIIRS looked at ${look.viirs}.`
  return (
    <figure ref={ref} className="m-0">
      <div ref={boxRef} role="img" aria-label={label} className="relative w-full" style={{ height: narrow ? 64 : 112 }}>
        {W > 0 ? (
          <>
            {/* the day */}
            <span aria-hidden className="absolute h-px bg-[color:var(--bone-30)]" style={{ left: pad, right: pad, top: axisY }} />
            {TICKS.map((h) => (
              <span key={h} aria-hidden className="absolute -translate-x-1/2 text-xs tabular-nums text-[color:var(--bone3)]" style={{ left: x(h), top: axisY + 12 }}>
                <span className="absolute -top-[15px] left-1/2 h-1.5 w-px -translate-x-1/2 bg-[color:var(--bone-30)]" />
                {tick(h)}
              </span>
            ))}
            {/* the minutes Aqua added: a bar from its old time to where it is */}
            <span aria-hidden className={cn('absolute h-1 -translate-y-1/2 bg-[color:var(--sat-aqua)]', travel)} style={{ left: xOld, width: Math.max(0, xA - xOld), top: axisY }} />
            {/* VIIRS: the green diamond that kept its time */}
            <span aria-hidden className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[color:var(--sat-viirs)]" style={{ left: xV, top: axisY }} />
            {/* Aqua then: an amber ring; Aqua now: the amber dot */}
            <span aria-hidden className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:var(--sat-aqua)] bg-[color:var(--ground)]" style={{ left: xOld, top: axisY - 14 }} />
            <span aria-hidden className={cn('absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--sat-aqua)] ring-2 ring-[color:var(--ground)]', travel)} style={{ left: xA, top: axisY }} />
            {!narrow ? (
              <>
                <span aria-hidden className="absolute -translate-x-full whitespace-nowrap pr-3 text-sm text-[color:var(--bone2)]" style={{ left: xOld, top: axisY - 25 }}>
                  Aqua, 2012–2020 <span className="tabular-nums text-[color:var(--bone)]">{look.old}</span>
                </span>
                <span aria-hidden className={cn('absolute whitespace-nowrap pl-3 text-sm text-[color:var(--bone)]', travel)} style={{ left: xA, top: axisY - 52 }}>
                  Aqua, {look.year} <RollingDigits text={moved ? look.now : look.old} startOnView={false} motion={motion.on} className="font-medium" enterY={18} />
                  <span className="ml-2 rounded-[3px] bg-[color:var(--sat-aqua)] px-1.5 py-0.5 text-xs font-medium text-[color:var(--ink)]">+{moved ? look.minutes : 0} min</span>
                </span>
                <span aria-hidden className="absolute -translate-x-1/2 whitespace-nowrap text-sm text-[color:var(--bone2)]" style={{ left: xV, top: axisY + 30 }}>
                  VIIRS kept its time <span className="tabular-nums text-[color:var(--bone)]">{look.viirs}</span>
                </span>
              </>
            ) : null}
          </>
        ) : null}
      </div>
      {narrow ? (
        <ul aria-hidden className="mt-3 flex flex-col gap-1.5 text-sm text-[color:var(--bone2)]">
          <li className="flex items-center gap-2"><span className="inline-block size-3 rounded-full border-2 border-[color:var(--sat-aqua)]" />Aqua, 2012–2020 <span className="tabular-nums text-[color:var(--bone)]">{look.old}</span></li>
          <li className="flex items-center gap-2"><SatMark sat="aqua" size={12} />Aqua, {look.year} <span className="tabular-nums text-[color:var(--bone)]">{look.now}</span> <span className="rounded-[3px] bg-[color:var(--sat-aqua)] px-1.5 text-xs font-medium text-[color:var(--ink)]">+{look.minutes} min</span></li>
          <li className="flex items-center gap-2"><SatMark sat="viirs" size={12} />VIIRS kept its time <span className="tabular-nums text-[color:var(--bone)]">{look.viirs}</span></li>
        </ul>
      ) : null}
      <figcaption className="mt-4 text-xs text-[color:var(--bone3)]">Over {name}, local sun time. Source: drift/{id}.json</figcaption>
    </figure>
  )
}

/* ---------- The finding, the caveat beside it, and the six places ---------- */

/** A place's shift on a short stretch of the afternoon (12:30 to 15:30): an amber ring at the old time, the dot at the
 *  new one, and the times under it. */
function MiniShift({ old, now }: { old: string; now: string }) {
  const at = (t: string) => `${((hm(t) - 12.5) / 3) * 100}%`
  return (
    <span aria-hidden className="mt-1.5 block w-full max-w-[180px] md:ml-0 ml-auto">
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

function Finding({ links, leave }: { links: Links; leave: Leave }) {
  const motion = useMotion()
  const th = 'pb-3 text-left text-xs font-normal text-[color:var(--bone3)]'
  return (
    <section aria-labelledby="finding-h" className="border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'py-16 lg:py-24')}>
        <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-12 lg:gap-x-6">
          <h2 id="finding-h" className="text-balance text-[clamp(28px,3.2vw,44px)] font-medium leading-[1.1] tracking-[-0.02em] lg:col-span-7">
            {FINDING.join(' ')}
          </h2>
          <Reveal className="lg:col-span-4 lg:col-start-9 lg:self-end">
            <p className="rounded-[4px] border border-[color:var(--bone-30)] p-4 text-base text-[color:var(--bone)]">{CAVEAT}</p>
          </Reveal>
        </div>

        <div className="mt-14">
          <Rule />
          <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_20px] gap-x-6 pt-4 md:grid" aria-hidden>
            <span className={th}>Place</span>
            <span className={th}>How much later Aqua looks</span>
            <span className={th}>{YEAR} count vs what we’d expect</span>
            <span className={th}>Unusual?</span>
            <span />
          </div>
          <ol className="border-t border-[color:var(--hairline)] md:border-t-0">
            {ROWS.map((r, i) => {
              const later = r.look ? `${r.look.minutes} minutes later (${r.look.old} to ${r.look.now})` : 'not in the data'
              const count = r.read ? `${pct(r.read.gap)} (how sure we are: ${fmtRange(r.read.lo, r.read.hi)})` : `too few fires to read in ${YEAR}`
              const verdict = r.read ? (r.read.unusual ? 'unusual' : 'not unusual') : ''
              return (
                <Reveal as="li" key={r.id} delay={i * 100}>
                  <a
                    href={links.regions(r.id)}
                    onClick={leave}
                    aria-label={`${r.name}: Aqua looks ${later}; ${YEAR} count vs what we’d expect ${count}${verdict ? `, ${verdict}` : ''}. Open its page.`}
                    className={cn(
                      'group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-[color:var(--hairline)] py-4 hover:bg-[color:var(--surface)]',
                      'md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_20px] md:gap-x-6',
                      ease, focusRing,
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <img src={photoFor(r.id).srcSm} alt="" width={96} height={96} loading="lazy" style={{ objectPosition: photoFor(r.id).focus }} className="size-11 shrink-0 rounded-[3px] object-cover md:size-12" />
                      <span className="min-w-0 text-lg font-medium leading-tight text-[color:var(--bone)] md:text-xl">{r.name}</span>
                    </span>
                    <span className="text-right md:text-left">
                      <span className="text-lg tabular-nums text-[color:var(--bone)]">+{r.look?.minutes ?? '—'} min</span>
                      {r.look ? <MiniShift old={r.look.old} now={r.look.now} /> : null}
                    </span>
                    <span className="col-span-2 md:col-span-1">
                      {r.read ? (
                        <>
                          <RollingDigits text={pct(r.read.gap)} motion={motion.on} className="text-lg text-[color:var(--bone)]" />
                          <span className="block text-xs tabular-nums text-[color:var(--bone3)]">How sure we are: {fmtRange(r.read.lo, r.read.hi)}</span>
                        </>
                      ) : (
                        <span className="text-sm text-[color:var(--bone2)]">Too few fires to read in {YEAR}</span>
                      )}
                    </span>
                    <span className="col-span-2 md:col-span-1">
                      {r.read ? (
                        <span className={cn('inline-block rounded px-2 py-0.5 text-sm', r.read.unusual ? 'bg-[color:var(--bone)] text-[color:var(--ink)]' : 'border border-[color:var(--bone-30)] text-[color:var(--bone2)]')}>
                          {r.read.unusual ? 'Unusual' : 'Not unusual'}
                        </span>
                      ) : (
                        <span className="text-sm text-[color:var(--bone3)]">Our test case</span>
                      )}
                    </span>
                    <ArrowRight aria-hidden size={16} strokeWidth={1.5} className="hidden self-center text-[color:var(--bone3)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[color:var(--bone)] md:block" />
                  </a>
                </Reveal>
              )
            })}
          </ol>
          <p className="mt-4 max-w-[60rem] text-xs text-[color:var(--bone3)]">
            Look times are local sun time, 2012–2020 against {YEAR}. Unusual: further from what we’d expect than any year from 2012 to 2020. How sure we are: the
            real difference is very likely inside this range. Sources: drift and audit files, one per place.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href={links.regions()} onClick={leave} className={primaryButton}>
            Explore the regions <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
          </a>
          <a href={links.sim()} onClick={leave} className={secondaryButton}>Explore any place</a>
          <a href={links.method()} onClick={leave} className={secondaryButton}>How we know</a>
        </div>
      </div>
    </section>
  )
}
