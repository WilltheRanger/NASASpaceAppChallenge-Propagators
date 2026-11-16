/*
 * THESIS: How we know, in plain steps: what we compare, how we tested it, what it can't tell you.
 * OWN-WORLD: Anchor dark, bone text, Albert Sans; Terra a blue ring, VIIRS a green diamond, Aqua an amber dot.
 * STORY: one Amazon afternoon seen twice (a slider); the comparison in four steps; the ten tests, failures and all; the
 *   California small-fires test; how closely we match INPE; what Anchor can't tell you; sources.
 * FORM: a reference page with a section bar that follows the reader; one control per figure; small print in the footer.
 * Every number comes from src/r2/data.ts (data/out); dates and outages in the limits are the team's method notes
 * (analysis/statistics/README.md).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import p9Followup from '../../../../data/out/p9-followup.json'
import { ArrowRight } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion-ghost'
import { CompareSlider, CompareSliderAfter, CompareSliderBefore, CompareSliderHandle } from '@/components/ui/compare-slider'
import { ScrollSpy } from '@/components/ui/scroll-spy'
import { useMeasuredWidth } from '@/components/ui/series-chart'
import { CHECKS, DETECTION, fmtInt, fmtRange, hm, inpeReproduction, pct, phrase, regionData, type Check } from '@/r2/data'
import { cn } from '@/lib/utils'
import { TwoClocks } from './FieldFilm'
import {
  CREDITS, DetMark, Footer, IMG, MockTag, More, PageNext, REPO_URL, SiteBar, andList, capital, focusRing, glideTo, numWord, shell, textLink, title, underline, useMedia, useMotion,
  type DetShape, type Leave, type Links, type Nav,
} from './common'

const SECTIONS = [
  { id: 'day', label: 'One afternoon' },
  { id: 'steps', label: 'What we compare' },
  { id: 'two-clocks', label: 'Two clocks' },
  { id: 'detection', label: 'Small fires' },
  { id: 'inpe', label: 'Matching INPE' },
  { id: 'limits', label: 'Scope' },
  { id: 'sources', label: 'Sources' },
]

export default function Method({ links, leave, nav }: { links: Links; leave: Leave; nav: Nav }) {
  const motion = useMotion()
  // a link to a section (method.html#checks, ?page=method#detection) lands on it once the page has drawn
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id || id.includes('=')) return
    const raf = requestAnimationFrame(() => { const el = document.getElementById(id); if (el) glideTo(el, false) })
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <>
      <SiteBar page="method" links={links} leave={leave} />
      <main className="pt-14">
        <div className={cn(shell, 'pb-8 pt-14 sm:pt-20')}>
          <h1 className="max-w-[18ch] text-balance text-[clamp(40px,5.4vw,80px)] font-medium leading-[1] tracking-[-0.035em]">How we know</h1>
        </div>
        <div className="sticky top-14 z-30 border-b border-[color:var(--hairline)] bg-[color:var(--ground)]">
          <div className={cn(shell, 'py-1')}>
            <ScrollSpy sections={SECTIONS} offset={124} label="Method sections" motion={motion.on} onNavigate={(el) => glideTo(el, motion.on)} />
          </div>
        </div>
        <OneDay />
        <Steps />
        <TwoClocksHere links={links} leave={leave} />
        <Detection />
        <InpeMatch />
        <Limits links={links} leave={leave} />
        <Sources />
      </main>
      <PageNext page="method" links={links} leave={leave} />
      <Footer
        links={links}
        leave={leave}
        notes={[
          <>The two pictures of the Amazon were taken on 4 September 2026, with each satellite’s fire detections drawn on them.</>,
          <>The steps are shown for the Amazon; every place is worked out the same way.</>,
          <>The small-fires test uses the US Forest Service’s record of California fires, 2012–2020.</>,
          <>Several tests are scored on all six of Brazil’s biomes, including three that aren’t among our six places.{CHECKS.mock ? ' The test results shown are mock data.' : ''}</>,
        ]}
      />
    </>
  )
}

const section = 'scroll-mt-32 border-t border-[color:var(--hairline)] first-of-type:border-t-0'
const lead = 'mt-4 max-w-[var(--measure)] text-lg text-[color:var(--bone2)]'

/* ---------- One Amazon day, three looks ---------- */

const wide = (k: 'viirs' | 'aqua') => `${IMG}amazon-${k}-2026-09-04.jpg`

function OneDay() {
  const [value, setValue] = useState(50)
  return (
    <section id="day" aria-labelledby="day-h" className={section}>
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="day-h" className={title}>One afternoon, two looks at the same forest</h2>
          <p className={lead}>By Aqua’s later look, the clouds, smoke and fires had changed.</p>
        </div>
        <figure className="m-0 lg:col-span-8">
          <CompareSlider
            value={value}
            onValueChange={setValue}
            label="Compare VIIRS’s early-afternoon look with Aqua’s later look"
            valueText={(v) => `${Math.round(v)}% VIIRS, ${100 - Math.round(v)}% Aqua`}
            className="aspect-[13/10] rounded-[4px] bg-[color:var(--surface)]"
          >
            <CompareSliderBefore label={<>Aqua · later</>}>
              <img src={wide('aqua')} alt="" className="size-full object-cover" draggable={false} />
            </CompareSliderBefore>
            <CompareSliderAfter label={<>VIIRS · early afternoon</>}>
              <img src={wide('viirs')} alt="" className="size-full object-cover" draggable={false} />
            </CompareSliderAfter>
            <CompareSliderHandle />
          </CompareSlider>
          <figcaption className="mt-3 text-sm text-[color:var(--bone2)]"><span className="text-[color:var(--bone)]">Drag the handle.</span> Dots are detected fires.</figcaption>
        </figure>
      </div>
    </section>
  )
}

/* ---------- How the comparison works, in four steps ---------- */

function Steps() {
  const d = regionData('br-amazon')
  const y = d.latestOk
  const ratio = d.ratio
  const last = d.lastDrift
  // one line per step: what we do, and the Amazon's number for it
  const steps: { title: string; text: string; value: string | null }[] = [
    { title: 'Find when each satellite looked', text: 'The middle time of its fire detections that year.', value: last ? `Aqua ${last.aqua_lst} · VIIRS ${last.viirs_lst}` : null },
    { title: 'Learn how Aqua and VIIRS compare', text: 'Aqua detections per 100 VIIRS detections, 2012–2020.', value: ratio != null ? `${Math.round(ratio * 100)} per 100` : null },
    { title: 'Work out what we’d expect', text: `VIIRS’s count times that rate: the benchmark${y ? ` for ${y.year}` : ''}.`, value: y && y.fixed != null ? fmtInt(y.fixed) : null },
    { title: 'Compare', text: 'Aqua’s count against the benchmark. Further out than any year from 2012 to 2020 is unusual.', value: y && y.gap != null ? pct(y.gap) : null },
  ]
  return (
    <section id="steps" aria-labelledby="steps-h" className={section}>
      <div className={cn(shell, 'py-16 lg:py-24')}>
        <h2 id="steps-h" className={title}>What we compare, in four steps</h2>
        <p className={lead}>Shown for the Amazon.</p>
        <ol className="mt-10 border-t border-[color:var(--hairline)]">
          {steps.map((st, k) => (
            <li key={st.title} className="grid grid-cols-[2rem_1fr] items-baseline gap-x-4 gap-y-1 border-b border-[color:var(--hairline)] py-4 sm:grid-cols-[2.5rem_minmax(0,18rem)_1fr_auto] sm:gap-x-6">
              <span className="text-sm tabular-nums text-[color:var(--bone3)] lg:text-base">{k + 1}</span>
              <span className="text-lg font-medium leading-snug text-[color:var(--bone)] lg:text-xl">{st.title}</span>
              <span className="col-start-2 row-start-2 text-sm text-[color:var(--bone2)] sm:col-start-3 sm:row-start-1 sm:text-base lg:text-lg">{st.text}</span>
              <span className="col-start-2 row-start-3 text-base tabular-nums text-[color:var(--bone)] sm:col-start-4 sm:row-start-1 sm:text-right sm:text-lg lg:text-xl">{st.value ?? '—'}</span>
            </li>
          ))}
        </ol>
        <More label="Technical notes" className="mt-4">
          <ul className="mt-2 flex max-w-[44rem] list-disc flex-col gap-2 pl-5 text-sm text-[color:var(--bone2)]">
            <li>Look time: the median local solar time of daytime vegetation-fire detections near the middle of the satellite’s view, from NASA FIRMS’s yearly files. VIIRS here is the S-NPP satellite.</li>
            <li>The rate: Aqua’s daytime detections divided by VIIRS’s on the same days, 2012–2020.</li>
            <li>What we’d expect: VIIRS’s count times that rate, on the same days. A day when either satellite sent no data is dropped. The calendar uses the same rate, filled from NOAA-20 where S-NPP is missing.</li>
            <li>Likely range: a 95% interval from resampling days. The usual range is the nine years 2012–2020, each scored against the other eight. A year outside it is flagged; a flag describes, it isn’t a significance test.</li>
          </ul>
        </More>
      </div>
    </section>
  )
}

/* ---------- The ten checks ---------- */

/** What each test asks, in plain words; whether it passed comes from checks.json. */
const PLAIN: Record<string, string> = {
  P1: 'Aqua should look later every year over Brazil’s biomes, while VIIRS stays put.',
  P2: 'Over Punjab, Aqua should look later each year, about as another study measured.',
  P3: 'Our copy of the data should match INPE’s official counts.',
  P4: 'Before the drift, the yearly wobble should be no bigger than day-to-day chance.',
  P5: 'A change in the size of fires shouldn’t explain the result.',
  P6: 'The two VIIRS satellites should agree, so what we’d expect isn’t drifting itself.',
  P7: 'The old link between look time and count should predict the result.',
  P8: 'VIIRS should catch small real fires more often than Aqua.',
  P9: 'Where fires grow through the afternoon, Aqua’s count should rise and Terra’s fall.',
  P10: 'Terra and Aqua moving apart should agree with the result.',
}
const STATUS: Record<Check['status'], string> = { pass: 'Passed', fail: 'Failed', pending: 'Pending' }

function StatusChip({ status }: { status: Check['status'] }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs',
      status === 'pass' ? 'bg-[color:var(--bone)] text-[color:var(--ink)]' : status === 'fail' ? 'border border-[color:var(--bone)] text-[color:var(--bone)]' : 'border border-dashed border-[color:var(--bone-30)] text-[color:var(--bone2)]')}>
      {STATUS[status]}
    </span>
  )
}

/** Two clocks, moved here from the Regions pages: Terra drifted earlier and Aqua later, shown for the Amazon. Its own
 *  text says that the two tests built on it failed, and links back to them. */
function TwoClocksHere({ links, leave }: { links: Links; leave: Leave }) {
  const d = regionData('br-amazon')
  const small = useMedia('(max-width: 639px)')
  const [year, setYear] = useState(() => (d.two.length ? d.two[d.two.length - 1].year : 2025))
  return <TwoClocks d={d} year={year} onYear={setYear} small={small} links={links} leave={leave} />
}

function Checks() {
  const { checks } = CHECKS
  const count = (s: Check['status']) => checks.filter((c) => c.status === s).length
  const pass = count('pass'), fail = count('fail'), pending = count('pending')
  const before = checks.filter((c) => c.result_existed_before_commit).length
  if (!checks.length) return null
  const heading = `We wrote down ${numWord(checks.length)} tests. ${capital(numWord(pass))} passed, ${numWord(fail)} failed${pending ? ` and ${numWord(pending)} ${pending === 1 ? 'is' : 'are'} pending` : ''}.`
  return (
    <section id="checks" aria-labelledby="checks-h" className={section}>
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="checks-h" className={title}>{heading}</h2>
          {before ? (
            <p className="mt-4 max-w-[var(--measure)] text-sm sm:text-base text-[color:var(--bone2)]">{capital(numWord(before))} were written after we saw the result, and are marked.</p>
          ) : null}
          {REPO_URL ? (
            <p className="mt-4 text-sm"><a href={REPO_URL} target="_blank" rel="noreferrer" className={textLink}>The rules and full results are in the code</a></p>
          ) : null}
        </div>
        <ol className="min-w-0 border-t border-[color:var(--hairline)] lg:col-span-8">
          {checks.map((c, i) => (
            <li key={c.id} className="flex items-start gap-4 border-b border-[color:var(--hairline)] py-4">
              <span aria-hidden className="w-6 shrink-0 pt-0.5 text-sm tabular-nums text-[color:var(--bone3)]">{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 text-base text-[color:var(--bone)]">
                {PLAIN[c.id] ?? c.name}
                {c.result_existed_before_commit ? <span className="mt-1 block text-xs text-[color:var(--bone3)]">Result seen before the rule was written</span> : null}
                {c.id === 'P9' ? (
                  <More label="A follow-up to this test" className="mt-1">
                    <div aria-label="Follow-up, separate from the original test" className="mt-2 flex max-w-[var(--measure)] flex-col gap-2 border-l-2 border-[color:var(--hairline)] pl-4 text-sm text-[color:var(--bone2)]">
                      <p className="font-medium text-[color:var(--bone)]">Completed VIIRS follow-up, not a new pass</p>
                      <p>All {p9Followup.complete_dates} fixed dates (2018–2020), {p9Followup.expected_swaths} swaths, were acquired. Under the original 45° view limit there were {p9Followup.primary_eligible} eligible afternoon center-date observations. The separate 85° sensitivity found {fmtInt(p9Followup.sensitivity_eligible)} center-date observations and {p9Followup.discordant_fires} discordant fires. Repeated centers across dates are not independent observations.</p>
                      <p>All six biomes remain insufficiently identified: no beta or confidence interval can be estimated under the unchanged gates. This does not turn the original MODIS-surrogate test above into a pass.</p>
                      <a href={p9Followup.report_url} target="_blank" rel="noreferrer" className={cn(textLink, 'w-fit')}>Final acquisition and identification report</a>
                    </div>
                  </More>
                ) : null}
              </span>
              <StatusChip status={c.status} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------- The California real-fires test ---------- */

const DET_SATS = [
  { key: 'S-NPP', label: 'VIIRS', color: 'var(--sat-viirs)', shape: 'diamond' as DetShape },
  { key: 'Aqua', label: 'Aqua', color: 'var(--sat-aqua)', shape: 'filled' as DetShape },
  { key: 'Terra', label: 'Terra', color: 'var(--sat-terra)', shape: 'hollow' as DetShape },
]
/** "10-100 acres" as "10–100", "> 1000 acres" as "Over 1,000": the unit is added where the label is used */
const sizeLabel = (s: string) => s.replace(/\s*acres?\s*$/i, '').replace(/^>\s*(\d+)/, (_, n) => `Over ${fmtInt(Number(n))}`).replace(/(\d+)-(\d+)/, (_, a, b) => `${fmtInt(Number(a))}–${fmtInt(Number(b))}`)
const share = (v: number) => `${(v * 100).toFixed(0)}%`
/** Whole acres, rounded half to even as the team's pipeline (Python) rounds, so 946.5 reads 946 here and in the checks. */
const acres = (v: number) => { const f = Math.floor(v); const r = v - f === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(v); return fmtInt(r) }

/** Share of fires caught, by size class: a mark per satellite with the likely range, on one 0–100% line. */
function DetectionChart({ small }: { small: boolean }) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const width = useMeasuredWidth(boxRef)
  const [active, setActive] = useState(0)
  const sats = DET_SATS.filter((s) => DETECTION?.satellites[s.key])
  const classes = DETECTION?.satellites[sats[0]?.key ?? '']?.rates_2012_2020.map((r) => r.size_class) ?? []
  const rate = (sat: string, cls: string) => DETECTION?.satellites[sat]?.rates_2012_2020.find((r) => r.size_class === cls)
  const rowH = small ? 64 : 72
  const M = { top: 8, right: 16, bottom: 40, left: small ? 96 : 140 }
  const height = M.top + classes.length * rowH + M.bottom
  const plotW = Math.max(0, width - M.left - M.right)
  const X = (v: number) => M.left + v * plotW
  const readout = (cls: string) => {
    const n = rate(sats[0]?.key ?? '', cls)?.n
    return `${sizeLabel(cls)} acres${n ? ` (${fmtInt(n)} fires)` : ''}: ${sats.map((s) => { const r = rate(s.key, cls); return r ? `${s.label} ${share(r.rate)}` : '' }).filter(Boolean).join(', ')}`
  }
  if (!classes.length) return null
  return (
    <div>
      <p aria-live="polite" className="mb-3 min-h-5 text-sm tabular-nums text-[color:var(--bone)]">{readout(classes[active] ?? classes[0])}</p>
      <div ref={boxRef} className="relative w-full" style={{ height }}>
        {width > 0 ? (
          <svg width={width} height={height} className="absolute inset-0 block overflow-visible" fontSize={12} role="group" aria-label="Share of agency-recorded California fires each satellite caught, by fire size, 2012 to 2020">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t} aria-hidden>
                <line x1={X(t)} x2={X(t)} y1={M.top} y2={M.top + classes.length * rowH} stroke="var(--hairline)" shapeRendering="crispEdges" />
                <text x={X(t)} y={M.top + classes.length * rowH + 20} textAnchor="middle" fill="var(--bone2)">{share(t)}</text>
              </g>
            ))}
            <text aria-hidden x={M.left + plotW / 2} y={height - 4} textAnchor="middle" fill="var(--bone3)">Share of real fires caught, 2012–2020</text>
            {classes.map((cls, i) => {
              const y0 = M.top + i * rowH
              const on = i === active
              return (
                <g key={cls} tabIndex={0} role="img" aria-label={readout(cls)} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} className="outline-none [&:focus-visible>rect:first-child]:stroke-[color:var(--bone)]">
                  <rect x={0} y={y0 + 2} width={width} height={rowH - 4} rx={4} fill={on ? 'var(--surface)' : 'transparent'} stroke="transparent" strokeWidth={1.5} />
                  <text x={8} y={y0 + rowH / 2} dominantBaseline="central" fill={on ? 'var(--bone)' : 'var(--bone2)'}>{sizeLabel(cls)} acres</text>
                  {sats.map((s, k) => {
                    const r = rate(s.key, cls)
                    if (!r) return null
                    const yy = y0 + rowH / 2 + (k - (sats.length - 1) / 2) * (small ? 14 : 16)
                    return (
                      <g key={s.key}>
                        <line x1={X(r.ci95[0])} x2={X(r.ci95[1])} y1={yy} y2={yy} stroke={s.color} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
                        <DetMark shape={s.shape} color={s.color} x={X(r.rate)} y={yy} />
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        ) : null}
      </div>
      <div aria-hidden className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[color:var(--bone2)]">
        {sats.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2"><svg width={14} height={14}><DetMark shape={s.shape} color={s.color} x={7} y={7} r={4.5} /></svg>{s.label}</span>
        ))}
        <span className="inline-flex items-center gap-2"><svg width={16} height={12}><line x1={1} x2={15} y1={6} y2={6} stroke="var(--bone3)" strokeWidth={2} strokeLinecap="round" /></svg>Likely range</span>
      </div>
    </div>
  )
}

function matchingRule(rule?: string) {
  const m = rule ? /\+\s*(\d+(?:\.\d+)?)\s*km between discovery\s*-\s*(\d+)\s*h and containment\s*\+\s*(\d+)\s*h/.exec(rule) : null
  if (!m) return rule ? `The matching rule: ${rule}.` : ''
  return `A fire counts as caught when a detection falls within its radius plus ${m[1]} km, from ${m[2]} hours before it was discovered to ${m[3]} hours after it was contained.`
}

function Detection() {
  const small = useMedia('(max-width: 639px)')
  const sats = DET_SATS.filter((s) => DETECTION?.satellites[s.key])
  const a50 = sats.map((s) => ({ ...s, v: DETECTION?.satellites[s.key]?.a50_acres, ci: DETECTION?.satellites[s.key]?.a50_ci95 })).filter((s) => s.v != null)
  if (!DETECTION) return null
  return (
    <section id="detection" aria-labelledby="detection-h" className={section}>
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="detection-h" className={title}>VIIRS picks up small fires that Aqua misses</h2>
          <p className={lead}>In California’s fire records, VIIRS caught more of the small fires than Aqua, so it is the yardstick.</p>
          <More label="How we matched" className="mt-3">
            <p className="mt-1 max-w-[var(--measure)] text-sm sm:text-base text-[color:var(--bone2)]">
              Each fire in the US Forest Service’s record was matched to the satellites’ detections. {matchingRule(DETECTION.rule)}
            </p>
          </More>
          <MockTag show={!!DETECTION.mock} className="mt-3 inline-block" />
        </div>
        <div className="flex min-w-0 flex-col gap-12 lg:col-span-8">
          <figure className="m-0">
            <figcaption className="mb-4">
              <span className="block text-lg font-medium">Share of real fires each satellite picked up, by fire size</span>
            </figcaption>
            <DetectionChart small={small} />
          </figure>
          {a50.length ? (
            <More label="The fire size each satellite picks up half the time">
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-[color:var(--hairline)] pt-4 sm:grid-cols-3">
                {a50.map((s) => (
                  <div key={s.key}>
                    <dt className="inline-flex items-center gap-2 text-xs text-[color:var(--bone2)]"><svg width={14} height={14} aria-hidden><DetMark shape={s.shape} color={s.color} x={7} y={7} r={4.5} /></svg>{s.label}</dt>
                    <dd className="mt-1 text-[length:var(--fs-40)] font-medium leading-none tabular-nums">{acres(s.v!)} <span className="text-sm font-normal">acres</span></dd>
                    {s.ci ? <dd className="mt-1 text-xs tabular-nums text-[color:var(--bone3)]">Likely range: {acres(s.ci[0])} to {acres(s.ci[1])}</dd> : null}
                  </div>
                ))}
              </dl>
            </More>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/* ---------- How well we match INPE (check P3) ---------- */

/** INPE's yearly Amazon count (bars) and our own count of Aqua's detections from NASA FIRMS (line). */
function InpeChart() {
  const rows = useMemo(() => inpeReproduction('br-amazon'), [])
  const ref = useRef<HTMLDivElement | null>(null)
  const W = useMeasuredWidth(ref)
  const [hover, setHover] = useState<number | null>(null)
  if (!rows.length) return null
  const H = 240, M = { t: 10, r: 8, b: 26, l: 48 }
  const max = Math.ceil(Math.max(...rows.flatMap((r) => [r.inpe, r.firms])) / 50000) * 50000
  const ticks = Array.from({ length: max / 50000 + 1 }, (_, i) => i * 50000)
  const plotW = Math.max(0, W - M.l - M.r), plotH = H - M.t - M.b
  const bw = plotW / rows.length
  const x = (i: number) => M.l + i * bw
  const y = (v: number) => M.t + (1 - v / max) * plotH
  const shown = rows[hover ?? rows.length - 1]
  const line = rows.map((r, i) => `${(x(i) + bw / 2).toFixed(1)},${y(r.firms).toFixed(1)}`).join(' ')
  return (
    <figure className="m-0">
      <p aria-live="polite" className="mb-3 text-sm tabular-nums text-[color:var(--bone)]">
        {shown.year}: INPE {fmtInt(shown.inpe)} · our count {fmtInt(shown.firms)} <span className="text-[color:var(--bone3)]">({pct((shown.firms / shown.inpe - 1) * 100)})</span>
      </p>
      <div ref={ref} className="relative w-full" style={{ height: H }} onPointerLeave={() => setHover(null)}>
        {W > 0 ? (
          <svg width={W} height={H} className="block" fontSize={11} role="img" aria-label={`The Amazon’s yearly fire count, ${rows[0].year} to ${rows[rows.length - 1].year}: INPE’s official count as bars and our own count of Aqua’s detections as a line; the two sit almost on top of each other.`}>
            {ticks.map((t) => (
              <g key={t} aria-hidden>
                <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--hairline)" shapeRendering="crispEdges" />
                <text x={M.l - 6} y={y(t)} textAnchor="end" dominantBaseline="central" fill="var(--bone2)">{t === 0 ? '0' : `${t / 1000}k`}</text>
              </g>
            ))}
            {rows.map((r, i) => (
              <rect key={r.year} x={x(i) + bw * 0.18} y={y(r.inpe)} width={bw * 0.64} height={Math.max(0, y(0) - y(r.inpe))} fill="var(--sat-aqua)" fillOpacity={hover === i ? 1 : 0.7} onPointerEnter={() => setHover(i)} />
            ))}
            <polyline points={line} fill="none" stroke="var(--bone)" strokeWidth={1.5} pointerEvents="none" />
            {rows.map((r, i) => <circle key={r.year} cx={x(i) + bw / 2} cy={y(r.firms)} r={2.5} fill="var(--bone)" pointerEvents="none" />)}
            {rows.map((r, i) => (i % 5 === 2 || i === rows.length - 1 ? <text key={r.year} aria-hidden x={x(i) + bw / 2} y={H - 8} textAnchor="middle" fill="var(--bone3)">{r.year}</text> : null))}
          </svg>
        ) : null}
      </div>
      <div aria-hidden className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[color:var(--bone2)]">
        <span className="inline-flex items-center gap-2"><span className="inline-block h-3 w-2.5 bg-[color:var(--sat-aqua)] opacity-70" />INPE’s official count</span>
        <span className="inline-flex items-center gap-2"><span className="inline-block h-0.5 w-4 bg-[color:var(--bone)]" />Our count of Aqua’s detections, NASA FIRMS</span>
      </div>
      <More label="Show the numbers" className="mt-2">
        <table className="mt-2 w-full max-w-md border-collapse text-xs tabular-nums">
          <thead><tr className="border-b border-[color:var(--hairline)] text-left text-[color:var(--bone3)]"><th className="py-1 font-normal">Year</th><th className="py-1 text-right font-normal">INPE</th><th className="py-1 text-right font-normal">Ours</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.year} className="border-b border-[color:var(--hairline)]"><td className="py-1">{r.year}</td><td className="py-1 text-right">{fmtInt(r.inpe)}</td><td className="py-1 text-right">{fmtInt(r.firms)}</td></tr>)}</tbody>
        </table>
      </More>
    </figure>
  )
}

function InpeMatch() {
  const p3 = CHECKS.checks.find((c) => c.id === 'P3')
  const all = p3 ? /within 10% of INPE:\s*([\d.]+)%/.exec(p3.detail)?.[1] : null
  const study = p3 ? /2021-2025\s+(\d+)\/(\d+)\s+\(([\d.]+)%\)/.exec(p3.detail) : null
  return (
    <section id="inpe" aria-labelledby="inpe-h" className={section}>
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="inpe-h" className={title}>Our count of Aqua’s fires matches INPE’s</h2>
          {all ? (
            <p className={lead}>
              From 2012 to 2020 our monthly count was within 10% of INPE’s official count {all}% of the time{study ? `, and ${study[3]}% of the time from 2021 to 2025` : ''}.
            </p>
          ) : null}
          <p className="mt-4 max-w-[var(--measure)] text-sm sm:text-base text-[color:var(--bone2)]">Same NASA data as INPE, so this checks our processing, not the finding.</p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          <p className="mb-4 text-lg font-medium">The Amazon’s hotspot detections by year</p>
          <InpeChart />
        </div>
      </div>
    </section>
  )
}

/* ---------- What Anchor can't do ---------- */

/** Flags the team's method notes call weak (analysis/statistics/README.md), named only while the audit file still flags
 *  them and their own range reaches back into the usual range, so the sentence can't outlive the data. */
const WEAK_FLAG_NOTES = [{ id: 'br-cerrado', year: 2022 }, { id: 'ar-argentina', year: 2022 }]
function weakFlags() {
  return WEAK_FLAG_NOTES.filter(({ id, year }) => {
    const r = regionData(id)
    const y = r.years.find((x) => x.year === year)
    return !!y && y.verdict === 'close' && y.lo != null && y.hi != null && y.lo <= r.placebo[1] && y.hi >= r.placebo[0]
  })
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthName = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
const NASA_TERRA = 'https://science.nasa.gov/science-research/earth-science/terra-the-end-of-an-era/'
const NASA_AQUA_LIFE = 'https://ceres.larc.nasa.gov/documents/STM/2026-05/01_ceres-st-May2026-considine2.pdf'
const NESDIS_SNPP = 'https://www.nesdis.noaa.gov/news/administrative-update-2-cessation-of-suomi-national-polar-orbiting-partnership-s-npp-data-users-november-02-2026-1300-utc-and-decommissioning-issued-october-19-2026-1400-utc'

function Limits({ links, leave }: { links: Links; leave: Leave }) {
  const motion = useMotion()
  const amazon = regionData('br-amazon')
  const lastYear = Math.max(...amazon.years.map((y) => y.year))
  // months after 2012 whose fixed-clock value is Aqua's own count, because S-NPP had an outage day (any region)
  const filled = useMemo(() => {
    const out: string[] = []
    for (const id of ['br-amazon', 'br-cerrado', 'br-pantanal', 'ar-argentina', 'in-punjab-haryana', 'us-california']) {
      for (const c of regionData(id).cal) if (c.source === 'aqua_observed' && Number(c.ym.slice(0, 4)) >= 2012 && !out.includes(c.ym)) out.push(c.ym)
    }
    return out.sort()
  }, [])
  const weak = useMemo(weakFlags, [])
  const link = cn(underline, 'text-[color:var(--bone)]', focusRing)
  const items: { t: string; b: ReactNode }[] = [
    {
      t: 'It measures the gap, not its cause.',
      b: 'Anchor sets Aqua’s count beside what VIIRS leads us to expect. The timing and the count moved together; counts alone can’t split the timing’s share from real change in fire. The benchmark is an estimate that sits alongside INPE’s official count, not a replacement for it.',
    },
    {
      t: '“Unusual” is a screen, not a verdict.',
      b: 'Nine years, 2012 to 2020, set the usual range, so an ordinary year lands outside it about one time in five. A flag marks a year worth a closer look; it isn’t a significance test.',
    },
    {
      t: weak.length ? `Close calls are marked: ${andList(weak.map((w) => `${phrase(w.id).the} in ${w.year}`))} ${weak.length === 1 ? 'sits' : 'sit'} just outside the usual range.` : 'A year just outside a narrow usual range is treated as a close call.',
      b: 'Close call: just outside the usual range, but the likely range overlaps it. These labels describe uncertainty, not proof of a timing effect.',
    },
    {
      t: 'Missing satellite days are handled openly.',
      b: (
        <>
          A day with no daytime detection anywhere in Brazil counts as an outage and is dropped for every region. A partial loss over one region isn’t caught.
          {filled.length ? ` ${capital(numWord(filled.length))} calendar months had a VIIRS outage day with nothing to fill it, so they show Aqua’s own count: ${andList(filled.map(monthName))}.` : ''}
          {' '}Aqua went into safe hold on 31 March 2022, and Terra paused its science data in October 2022.
        </>
      ),
    },
    {
      t: 'NASA’s May 2025 VIIRS reprocessing leaves the counts alone.',
      b: 'The fix touches the timing and fire-size inputs, not the counts the comparison uses. Historical MODIS input version codes vary by year (6.2, 6.03, 61.03); collection consistency remains a limitation. These input codes are not established collection names. The provisional NRT snapshot remains separate.',
    },
    { t: 'The calendar runs through 2025; a separate provisional card shows 8–14 Nov 2026.', b: 'The card is separate from the historical calendar: provisional, incomplete coverage, not a full-year trend.' },
    {
      t: 'Aqua and Terra are nearing the end of their missions, and the method carries on.',
      b: (
        <>
          NASA has planned <a href={NASA_TERRA} target="_blank" rel="noreferrer" className={link}>Terra’s last operations</a> and{' '}
          <a href={NASA_AQUA_LIFE} target="_blank" rel="noreferrer" className={link}>Aqua’s end of life</a>, so counts that follow Aqua, as INPE’s does, will need a new reference.{' '}
          <a href={NESDIS_SNPP} target="_blank" rel="noreferrer" className={link}>S-NPP</a>, one of the VIIRS satellites, has been decommissioned. NOAA-20 and NOAA-21 carry the same camera and keep their time, so the benchmark carries on without them.
        </>
      ),
    },
  ]
  return (
    <section id="limits" aria-labelledby="limits-h" className={section}>
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="limits-h" className={title}>How far the result goes</h2>
          <p className="mt-4 text-sm"><a href={links.regions()} onClick={leave} className={textLink}>The six places</a></p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          <Accordion type="multiple" motion={motion.on} level={3}>
            {items.map((it, i) => (
              <AccordionItem key={it.t} value={`l${i}`}>
                <AccordionTrigger number={String(i + 1).padStart(2, '0')}>{it.t}</AccordionTrigger>
                <AccordionContent><p className="max-w-[var(--measure)]">{it.b}</p>
                  <p className="mt-3 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">{[
                    'Next: independent observations and a design that separates timing from other changes.',
                    'Addressed: each flagged year now shows its percentage-point distance past the usual-range edge; this is still not a significance test.',
                    'Addressed: overlapping likely ranges are labeled Close call, not Unusual.',
                    'Next: verify regional coverage and distinguish missing observations from true zero detections.',
                    'Next: establish the historical version-code meanings and verify collection consistency; Sources now disclose the varying codes separately from NRT.',
                    'Addressed: a separate provisional 8–14 Nov 2026 card is visible on Brazil region pages.',
                    'Next: calibrate and validate a replacement satellite reference before extending the historical series.',
                  ][i]}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}

/* ---------- Sources and the code ---------- */

function Sources() {
  const link = cn(underline, 'text-[color:var(--bone)]', focusRing)
  const sourceRow = (c: (typeof CREDITS)[number]) => (
            <li key={c.name} className="flex flex-col gap-1 border-b border-[color:var(--hairline)] py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
              <span className="text-base text-[color:var(--bone)]">{c.name}</span>
              <span className="shrink-0">
                {c.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className={cn(link, 'text-sm text-[color:var(--bone2)] hover:text-[color:var(--bone)]')}>{l.text}</a>)}
              </span>
            </li>
  )
  return (
    <section id="sources" aria-labelledby="sources-h" className={section}>
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="sources-h" className={title}>Sources</h2>
          {REPO_URL ? (
            <p className="mt-6">
              <a href={REPO_URL} target="_blank" rel="noreferrer" className={cn('inline-flex min-h-11 items-center gap-2 text-sm', link)}>The code and the method notes <ArrowRight size={14} strokeWidth={1.5} aria-hidden /></a>
            </p>
          ) : null}
        </div>
        {/* the four primary data sources open; the rest one click down */}
        <div className="min-w-0 lg:col-span-8">
          <ul className="border-t border-[color:var(--hairline)]">
            {CREDITS.slice(0, 4).map(sourceRow)}
          </ul>
          {CREDITS.length > 4 ? (
            <More label={`${CREDITS.length - 4} more sources`} className="mt-4">
              <ul className="mt-2 border-t border-[color:var(--hairline)]">{CREDITS.slice(4).map(sourceRow)}</ul>
            </More>
          ) : null}
        </div>
      </div>
    </section>
  )
}
