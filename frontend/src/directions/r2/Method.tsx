/*
 * THESIS: How we know, in plain steps, with every technical detail one click deeper.
 * OWN-WORLD: Anchor dark, bone text, Albert Sans; Terra a blue ring, VIIRS a green diamond, Aqua an amber dot.
 * STORY: one Amazon day seen three times; the comparison in four steps; the ten checks, failures and all; the
 *   California real-fires test; how closely we match INPE; what Anchor can't do; sources, the AI disclosure, the code.
 * FIRST VIEWPORT: the page's question, its section bar, and the three looks at one day.
 * FORM: a long reference page with a section bar that follows the reader (21st.dev scroll spy).
 * Moved here from the Region page: the three passes, how we read a count, the checks, detection, limits and about.
 * Every number comes from src/r2/data.ts (data/out); dates and outages in the limits are the team's method notes
 * (analysis/statistics/README.md).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion-ghost'
import { CompareSlider, CompareSliderAfter, CompareSliderBefore, CompareSliderHandle } from '@/components/ui/compare-slider'
import { HowItWorks } from '@/components/ui/how-it-works'
import { ScrollSpy } from '@/components/ui/scroll-spy'
import { useMeasuredWidth } from '@/components/ui/series-chart'
import { CHECKS, DETECTION, PROOF, SEEN, fmtInt, fmtRange, hm, inpeReproduction, pct, phrase, regionData, type Check } from '@/r2/data'
import { cn } from '@/lib/utils'
import {
  CAVEAT, CREDITS, DetMark, IMG, More, REPO_URL, Reveal, SatMark, SiteBar, andList, capital, focusRing, glideTo, numWord, shell, textLink, title, underline, useMedia, useMotion,
  type DetShape, type Leave, type Links, type Nav,
} from './common'

const SECTIONS = [
  { id: 'day', label: 'One day' },
  { id: 'steps', label: 'How it works' },
  { id: 'checks', label: 'Checks' },
  { id: 'detection', label: 'Real-fires test' },
  { id: 'inpe', label: 'Matching INPE' },
  { id: 'limits', label: 'Limits' },
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
          <p className="mt-5 max-w-[34rem] text-lg text-[color:var(--bone2)]">How Anchor compares Aqua with what we’d expect, how we checked it, and what it can’t tell you.</p>
        </div>
        <div className="sticky top-14 z-30 border-b border-[color:var(--hairline)] bg-[color:var(--ground)]">
          <div className={cn(shell, 'py-1')}>
            <ScrollSpy sections={SECTIONS} offset={124} label="Method sections" motion={motion.on} onNavigate={(el) => glideTo(el, motion.on)} />
          </div>
        </div>
        <OneDay />
        <Steps />
        <Checks />
        <Detection />
        <InpeMatch />
        <Limits links={links} leave={leave} />
        <Sources />
      </main>
    </>
  )
}

const section = 'scroll-mt-32 border-t border-[color:var(--hairline)] first-of-type:border-t-0'
const lead = 'mt-4 max-w-[var(--measure)] text-lg text-[color:var(--bone2)]'

/* ---------- One Amazon day, three looks ---------- */

type PassKey = 'terra' | 'viirs' | 'aqua'
const PASSES: { key: PassKey; name: string; when: string; alt: string; fit?: string }[] = [
  { key: 'terra', name: 'Terra', when: 'Morning', alt: 'Terra, morning, 4 Sep 2026: hazy smoke and a few clouds over the forest', fit: 'object-left' },
  { key: 'viirs', name: 'VIIRS', when: 'Early afternoon', alt: 'VIIRS, early afternoon, 4 Sep 2026: small clouds spread across the same forest' },
  { key: 'aqua', name: 'Aqua', when: 'Later afternoon', alt: 'Aqua, later afternoon, 4 Sep 2026: towering clouds over the same forest' },
]
const wide = (k: PassKey) => `${IMG}amazon-${k}-2026-09-04.jpg`
const square = (k: PassKey) => `${IMG}prints/amazon-${k}-sq.jpg`

function OneDay() {
  const amazon = regionData('br-amazon')
  const last = amazon.lastDrift
  const lookOf: Record<PassKey, string | undefined> = { terra: last?.terra_lst, viirs: last?.viirs_lst, aqua: last?.aqua_lst }
  const [value, setValue] = useState(50)
  return (
    <section id="day" aria-labelledby="day-h" className={section}>
      <div className={cn(shell, 'py-16 lg:py-24')}>
        <h2 id="day-h" className={title}>One day, three looks at the same forest</h2>
        <p className={lead}>The central Amazon on 4 September 2026, seen by three satellites at three times. Clouds, smoke and fires change between looks.</p>
        <ul className="mt-10 grid grid-cols-3 gap-2 sm:gap-4">
          {PASSES.map((p, i) => (
            <Reveal as="li" key={p.key} delay={i * 100} className="min-w-0">
              <figure className="m-0">
                <div className="relative aspect-square overflow-hidden rounded-[4px] bg-[color:var(--surface)]">
                  <img src={square(p.key)} alt={p.alt} width={720} height={720} loading="lazy" className={cn('size-full object-cover', p.fit)} />
                </div>
                <figcaption className="mt-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-[color:var(--bone)] sm:text-base"><SatMark sat={p.key} size={11} />{p.name}</span>
                  <span className="mt-0.5 block text-xs text-[color:var(--bone2)] sm:text-sm">{p.when}</span>
                  {lookOf[p.key] ? <span className="mt-0.5 block text-xs tabular-nums text-[color:var(--bone3)]">Usual look in {last!.year}: {lookOf[p.key]}</span> : null}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
        <div className="mt-14 grid grid-cols-1 gap-y-6 lg:grid-cols-12 lg:gap-x-6">
          <div className="lg:col-span-4">
            <h3 className="text-2xl font-medium leading-tight tracking-[-0.01em]">Slide between the two afternoon looks</h3>
            <p className="mt-3 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
              VIIRS looks near Aqua’s old time; Aqua now looks later. Same place, same day, a different afternoon. One day doesn’t measure anything: the yearly counts do.
            </p>
          </div>
          <figure className="m-0 lg:col-span-8">
            <CompareSlider
              value={value}
              onValueChange={setValue}
              label="Compare VIIRS’s early-afternoon look with Aqua’s later look"
              valueText={(v) => `${Math.round(v)}% VIIRS, ${100 - Math.round(v)}% Aqua`}
              className="aspect-[13/10] rounded-[4px] bg-[color:var(--surface)]"
            >
              <CompareSliderBefore label={<>Aqua · later afternoon</>}>
                <img src={wide('aqua')} alt="" className="size-full object-cover" draggable={false} />
              </CompareSliderBefore>
              <CompareSliderAfter label={<>VIIRS · early afternoon</>}>
                <img src={wide('viirs')} alt="" className="size-full object-cover" draggable={false} />
              </CompareSliderAfter>
              <CompareSliderHandle />
            </CompareSlider>
            <figcaption className="mt-3 text-xs text-[color:var(--bone3)]">Drag the handle, or use the arrow keys. NASA Worldview / GIBS true colour, with each satellite’s fire detections.</figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}

/* ---------- How the comparison works, in four steps ---------- */

/** Aqua's and VIIRS's look time by year over the Amazon: Aqua climbs later, VIIRS holds. */
function LookLines() {
  const d = regionData('br-amazon')
  const ref = useRef<HTMLDivElement | null>(null)
  const W = useMeasuredWidth(ref)
  const rows = d.drift
  if (!rows.length) return null
  const H = 92, L = 4, R = 64, T = 8, B = 20
  const lo = Math.min(...rows.flatMap((r) => [hm(r.aqua_lst), hm(r.viirs_lst)])) - 0.1
  const hi = Math.max(...rows.flatMap((r) => [hm(r.aqua_lst), hm(r.viirs_lst)])) + 0.1
  const x = (i: number) => L + (i / (rows.length - 1)) * Math.max(0, W - L - R)
  const y = (h: number) => T + (1 - (h - lo) / (hi - lo)) * (H - T - B)
  const a = rows.map((r, i) => `${x(i).toFixed(1)},${y(hm(r.aqua_lst)).toFixed(1)}`).join(' ')
  const v = rows.map((r, i) => `${x(i).toFixed(1)},${y(hm(r.viirs_lst)).toFixed(1)}`).join(' ')
  const last = rows[rows.length - 1]
  return (
    <div ref={ref} role="img" aria-label={`Over the Amazon, Aqua looked at ${rows[0].aqua_lst} in ${rows[0].year} and ${last.aqua_lst} in ${last.year}; VIIRS at ${rows[0].viirs_lst} and ${last.viirs_lst}.`} style={{ height: H }}>
      {W > 0 ? (
        <svg width={W} height={H} aria-hidden className="block overflow-visible" fontSize={11}>
          <polyline points={v} fill="none" stroke="var(--sat-viirs)" strokeWidth={1.5} strokeDasharray="3 3" />
          <polyline points={a} fill="none" stroke="var(--sat-aqua)" strokeWidth={2} />
          <DetMark shape="diamond" color="var(--sat-viirs)" x={x(rows.length - 1)} y={y(hm(last.viirs_lst))} r={4} />
          <DetMark shape="filled" color="var(--sat-aqua)" x={x(rows.length - 1)} y={y(hm(last.aqua_lst))} r={4} />
          <text x={x(rows.length - 1) + 8} y={y(hm(last.aqua_lst))} dominantBaseline="central" fill="var(--bone)">Aqua {last.aqua_lst}</text>
          <text x={x(rows.length - 1) + 8} y={y(hm(last.viirs_lst))} dominantBaseline="central" fill="var(--bone2)">VIIRS {last.viirs_lst}</text>
          <text x={L} y={H - 4} fill="var(--bone3)">{rows[0].year}</text>
          <text x={x(rows.length - 1)} y={H - 4} textAnchor="middle" fill="var(--bone3)">{last.year}</text>
        </svg>
      ) : null}
    </div>
  )
}

/** One year's reading against the usual range: the grey band, zero, and Aqua's dot with how sure we are. */
function RangeStrip({ gap, lo, hi, band }: { gap: number; lo: number; hi: number; band: [number, number] }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const W = useMeasuredWidth(ref)
  const min = Math.min(-20, band[0], lo) - 5, max = Math.max(60, hi) + 5
  const x = (v: number) => 4 + ((v - min) / (max - min)) * Math.max(0, W - 8)
  const H = 64, cy = 26
  return (
    <div ref={ref} role="img" aria-label={`Aqua ${pct(gap)} against what we’d expect, how sure we are ${fmtRange(lo, hi)}; usual range ${fmtRange(band[0], band[1])}.`} style={{ height: H }}>
      {W > 0 ? (
        <svg width={W} height={H} aria-hidden className="block overflow-visible" fontSize={11}>
          <rect x={x(band[0])} y={cy - 12} width={x(band[1]) - x(band[0])} height={24} fill="rgba(236, 233, 225, 0.12)" rx={2} />
          <line x1={x(0)} x2={x(0)} y1={cy - 16} y2={cy + 16} stroke="var(--bone-30)" />
          <line x1={x(lo)} x2={x(hi)} y1={cy} y2={cy} stroke="var(--sat-aqua)" strokeWidth={2} strokeLinecap="round" />
          <DetMark shape="filled" color="var(--sat-aqua)" x={x(gap)} y={cy} r={5} />
          <text x={x(0)} y={H - 6} textAnchor="middle" fill="var(--bone3)">Usual</text>
          <text x={x(gap)} y={H - 6} textAnchor="middle" fill="var(--bone)">{pct(gap)}</text>
        </svg>
      ) : null}
    </div>
  )
}

function Steps() {
  const motion = useMotion()
  const d = regionData('br-amazon')
  const y = d.latestOk
  const ratio = d.ratio
  const detail = (label: string, body: ReactNode) => (
    <Accordion motion={motion.on} level={4} className="border-t-0">
      <AccordionItem value="d" className="border-b-0">
        <AccordionTrigger className="py-2 text-[color:var(--bone2)]">{label}</AccordionTrigger>
        <AccordionContent className="pl-0 pr-0 text-xs">{body}</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
  const steps = [
    {
      title: 'Find when each satellite looked',
      description: 'We read the time of day from each satellite’s own fire detections, year by year.',
      figure: <LookLines />,
      details: detail('Details', <p>Median local solar time (UTC + longitude ÷ 15) of near-nadir daytime vegetation-fire detections in NASA FIRMS’s yearly files; VIIRS here is S-NPP. Source: drift files, one per place.</p>),
    },
    {
      title: 'Learn the old relationship',
      description: 'From 2012 to 2020 Aqua and VIIRS looked at about the same time. That tells us how many fires Aqua counts for every 100 VIIRS counts.',
      figure: ratio != null ? <p className="text-sm text-[color:var(--bone2)]"><span className="block text-[length:var(--fs-40)] font-medium leading-none tabular-nums text-[color:var(--bone)]">{Math.round(ratio * 100)}</span>Aqua fires for every 100 VIIRS fires over the Amazon, 2012–2020</p> : null,
      details: detail('Details', <p>The exchange rate is Aqua’s daytime detections divided by S-NPP’s on matched days, 2012–2020 (audit file, baseline ratio). VIIRS sees more small fires than Aqua (see the real-fires test), so the rate is below 1.</p>),
    },
    {
      title: 'Estimate what we’d expect',
      description: 'For each later year, VIIRS’s count and that old relationship give what Aqua would have counted at its old time.',
      figure: y && y.fixed != null ? <p className="text-sm text-[color:var(--bone2)]"><span className="block text-[length:var(--fs-40)] font-medium leading-none tabular-nums text-[color:var(--bone)]">{fmtInt(y.fixed)}</span>fires we’d expect from Aqua over the Amazon in {y.year}</p> : null,
      details: detail('Details', <p>The fixed-clock benchmark: S-NPP’s count times the 2012–2020 exchange rate, on the same days, in Aqua-equivalent units. A day when either satellite returned no data is dropped. The monthly calendar uses the same rate, filled from NOAA-20 where S-NPP is missing.</p>),
    },
    {
      title: 'Compare, and say how sure we are',
      description: y && y.gap != null ? `Aqua counted ${fmtInt(y.aqua)}: ${pct(y.gap)} against what we’d expect. Further out than any year from 2012 to 2020 counts as unusual.` : 'Aqua’s count against what we’d expect. Further out than any year from 2012 to 2020 counts as unusual.',
      figure: y && y.gap != null && y.lo != null && y.hi != null ? <RangeStrip gap={y.gap} lo={y.lo} hi={y.hi} band={d.placebo} /> : null,
      details: detail('Details', (
        <div className="flex flex-col gap-2">
          <p>L = Aqua’s count ÷ the benchmark (1 = no change). “How sure we are” is the 95% interval from resampling days (bootstrap). The usual range is the nine placebo years 2012–2020, each scored against the other eight; a year outside it is flagged. A flag describes; it isn’t a significance test.</p>
          <p className="text-[color:var(--bone)]">{CAVEAT}</p>
        </div>
      )),
    },
  ]
  return (
    <section id="steps" aria-labelledby="steps-h" className={section}>
      <div className={cn(shell, 'py-16 lg:py-24')}>
        <h2 id="steps-h" className={title}>How the comparison works</h2>
        <p className={lead}>Four steps, shown for the Amazon. Each opens one click deeper.</p>
        <HowItWorks steps={steps} motion={motion.on} className="mt-10" />
      </div>
    </section>
  )
}
/* ---------- The ten checks ---------- */

/** What each check asks, in plain words; its rule, the way it was scored and its result come from checks.json. */
const PLAIN: Record<string, string> = {
  P1: 'Aqua should look later every year over Brazil’s biomes, while VIIRS stays put.',
  P2: 'Over Punjab, Aqua should look later each year, about as Jethva and colleagues measured.',
  P3: 'Our copy of the data should match INPE’s official counts.',
  P4: 'Before the drift, the yearly wobble should be no bigger than day-to-day chance.',
  P5: 'A change in the size of fires shouldn’t explain the result.',
  P6: 'The two VIIRS satellites should agree, so what we’d expect isn’t drifting itself.',
  P7: 'The old link between look time and count should predict the result.',
  P8: 'VIIRS should catch small real fires more often than Aqua.',
  P9: 'Where fires grow through the afternoon, Aqua’s count should rise and Terra’s fall.',
  P10: 'The two-clocks difference should agree with the result.',
}
const STATUS: Record<Check['status'], string> = { pass: 'Passed', fail: 'Failed', pending: 'Pending' }
const BIOME: Record<string, string> = { amazon: 'Amazon', cerrado: 'Cerrado', pantanal: 'Pantanal', caatinga: 'Caatinga', mata_atlantica: 'Atlantic Forest', pampa: 'Pampa' }
const BIOME_RE = /\b(amazon|cerrado|pantanal|caatinga|mata_atlantica|pampa)\b/g
/** The file's result line, for readers: biome names written out, the team's internal to-dos taken out. */
const checkDetail = (c: Check) => c.detail
  .replace(/Readings disagree:.*$/, 'The two readings disagree, so this check stays pending.')
  .replace(/;\s*time convention not yet checked/, '')
  .replace(BIOME_RE, (b) => BIOME[b] ?? b)
const cleanRule = (s?: string) => (s ?? '').replace(/\*\*|`/g, '').replace(BIOME_RE, (b) => BIOME[b] ?? b)

function StatusChip({ status }: { status: Check['status'] }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs',
      status === 'pass' ? 'bg-[color:var(--bone)] text-[color:var(--ink)]' : status === 'fail' ? 'border border-[color:var(--bone)] text-[color:var(--bone)]' : 'border border-dashed border-[color:var(--bone-30)] text-[color:var(--bone2)]')}>
      {STATUS[status]}
    </span>
  )
}

function Checks() {
  const motion = useMotion()
  const { checks, mock } = CHECKS
  const count = (s: Check['status']) => checks.filter((c) => c.status === s).length
  const pass = count('pass'), fail = count('fail'), pending = count('pending')
  const before = checks.filter((c) => c.result_existed_before_commit).map((c) => c.id)
  if (!checks.length) return null
  const heading = `We wrote down ${numWord(checks.length)} checks. ${capital(numWord(pass))} passed, ${numWord(fail)} failed${pending ? ` and ${numWord(pending)} ${pending === 1 ? 'is' : 'are'} pending` : ''}.`
  return (
    <section id="checks" aria-labelledby="checks-h" className={section}>
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="checks-h" className={title}>{heading}</h2>
          {before.length ? (
            <p className={lead}>For {numWord(before.length)} of them ({andList(before)}) we had seen the result before writing the rule, so they aren’t true predictions.</p>
          ) : null}
        </div>
        <div className="min-w-0 lg:col-span-8">
          <Accordion type="multiple" motion={motion.on} level={3}>
            {checks.map((c) => (
              <AccordionItem key={c.id} value={c.id}>
                <AccordionTrigger
                  number={c.id}
                  after={<span className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">{c.result_existed_before_commit ? <span className="whitespace-nowrap text-xs text-[color:var(--bone2)]">Seen before the rule</span> : null}<StatusChip status={c.status} /></span>}
                >
                  {PLAIN[c.id] ?? c.name}
                </AccordionTrigger>
                <AccordionContent>
                  {c.detail ? <p className="max-w-[var(--measure)]">{checkDetail(c)}</p> : null}
                  {c.rule_written || c.rule_implemented ? (
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                      <dt className="text-[color:var(--bone3)]">The check</dt>
                      <dd>{c.name.replace(BIOME_RE, (b) => BIOME[b] ?? b)}</dd>
                      {c.rule_written ? (<><dt className="text-[color:var(--bone3)]">Rule as written</dt><dd>{cleanRule(c.rule_written)}</dd></>) : null}
                      {c.rule_implemented ? (<><dt className="text-[color:var(--bone3)]">As scored</dt><dd>{cleanRule(c.rule_implemented)}</dd></>) : null}
                    </dl>
                  ) : null}
                  {c.id === 'P8' ? <p className="mt-3 text-xs"><a href="#detection" className={textLink}>The real-fires test</a></p> : null}
                  {c.id === 'P3' ? <p className="mt-3 text-xs"><a href="#inpe" className={textLink}>How well we match INPE</a></p> : null}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-4 text-xs text-[color:var(--bone3)]">Several checks are scored on all six of Brazil’s biomes, including three that aren’t among our six places. Source: checks.json{mock ? ' · MOCK' : ''}</p>
        </div>
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
const sizeLabel = (s: string) => s.replace(/^>\s*(\d+)/, (_, n) => `Over ${fmtInt(Number(n))}`).replace(/(\d+)-(\d+)/, (_, a, b) => `${fmtInt(Number(a))}–${fmtInt(Number(b))}`)
const share = (v: number) => `${(v * 100).toFixed(0)}%`
/** Whole acres, rounded half to even as the team's pipeline (Python) rounds, so 946.5 reads 946 here and in the checks. */
const acres = (v: number) => { const f = Math.floor(v); const r = v - f === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(v); return fmtInt(r) }

/** Share of fires caught, by size class: a mark per satellite with how sure we are, on one 0–100% line. */
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
        <span className="inline-flex items-center gap-2"><svg width={16} height={12}><line x1={1} x2={15} y1={6} y2={6} stroke="var(--bone3)" strokeWidth={2} strokeLinecap="round" /></svg>How sure we are</span>
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
  const proofYears = PROOF ? [...new Set(PROOF.years.map((y) => y.year))] : []
  const smallest = PROOF?.size_classes[0]
  const viirsAhead = proofYears.filter((yr) => { const r = PROOF!.years.find((y) => y.year === yr && y.size_class === smallest); return r && r.viirs_pod > r.aqua_pod }).length
  const seen = SEEN?.fires ?? []
  const caught = (k: 'viirs' | 'aqua' | 'terra', fs = seen) => fs.filter((f) => f[k]).length
  const tiny = seen.filter((f) => f.acres < 10)
  const span = seen.length ? [Math.min(...seen.map((f) => f.year)), Math.max(...seen.map((f) => f.year))] : null
  if (!DETECTION) return null
  return (
    <section id="detection" aria-labelledby="detection-h" className={section}>
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="detection-h" className={title}>The real-fires test: VIIRS catches more small fires</h2>
          <p className={lead}>We matched California’s recorded fires to each satellite’s detections. This is why VIIRS sets what we’d expect.</p>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone)]">These numbers describe one way of matching isolated, recorded fires in California, not the cameras’ limits everywhere.</p>
          <More label="How we matched" className="mt-3">
            <p className="mt-1 max-w-[var(--measure)] text-xs text-[color:var(--bone2)]">
              Each fire in the US Forest Service’s fire occurrence database (FPA-FOD) was matched to the satellites’ detections. {matchingRule(DETECTION.rule)}
            </p>
          </More>
        </div>
        <div className="flex min-w-0 flex-col gap-12 lg:col-span-8">
          <figure className="m-0">
            <figcaption className="mb-4">
              <span className="block text-lg font-medium">Share of real fires caught, by fire size</span>
              <span className="mt-1 block text-sm text-[color:var(--bone2)]">Point at a row, or tab through them.</span>
            </figcaption>
            <DetectionChart small={small} />
          </figure>
          {a50.length ? (
            <div>
              <p className="text-lg font-medium">Fire size each satellite caught half the time, 2012–2020</p>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-[color:var(--hairline)] pt-4 sm:grid-cols-3">
                {a50.map((s) => (
                  <div key={s.key}>
                    <dt className="inline-flex items-center gap-2 text-xs text-[color:var(--bone2)]"><svg width={14} height={14} aria-hidden><DetMark shape={s.shape} color={s.color} x={7} y={7} r={4.5} /></svg>{s.label}</dt>
                    <dd className="mt-1 text-[length:var(--fs-40)] font-medium leading-none tabular-nums">{acres(s.v!)} <span className="text-sm font-normal">acres</span></dd>
                    {s.ci ? <dd className="mt-1 text-xs tabular-nums text-[color:var(--bone3)]">How sure we are: {acres(s.ci[0])}–{acres(s.ci[1])}</dd> : null}
                  </div>
                ))}
              </dl>
              {proofYears.length && smallest ? (
                <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
                  VIIRS caught a larger share of fires of {sizeLabel(smallest)} acres than Aqua in {numWord(viirsAhead)} of {numWord(proofYears.length)} years, {Math.min(...proofYears)} to {Math.max(...proofYears)}.
                </p>
              ) : null}
            </div>
          ) : null}
          {seen.length && span && SEEN ? (
            <div className="border-t border-[color:var(--hairline)] pt-6">
              <p className="text-lg font-medium">Close up: one {SEEN.radius_km} km circle in Southern California</p>
              <p className="mt-2 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
                Of {fmtInt(seen.length)} fires recorded there, {span[0]} to {span[1]}, VIIRS caught {fmtInt(caught('viirs'))}, Aqua {fmtInt(caught('aqua'))} and Terra {fmtInt(caught('terra'))}; of the{' '}
                {fmtInt(tiny.length)} under 10 acres, VIIRS caught {fmtInt(caught('viirs', tiny))}{caught('aqua', tiny) + caught('terra', tiny) === 0 ? ' and Aqua and Terra none' : `, Aqua ${fmtInt(caught('aqua', tiny))} and Terra ${fmtInt(caught('terra', tiny))}`}.
              </p>
            </div>
          ) : null}
          <p className="text-xs text-[color:var(--bone3)]">Sources: detection_limits_california.json · proof_california.json · socal_seen_missed.json{DETECTION.mock || SEEN?.mock ? ' · MOCK' : ''}</p>
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
        <span className="inline-flex items-center gap-2"><span className="inline-block h-3 w-2.5 bg-[color:var(--sat-aqua)] opacity-70" />INPE’s official count (it follows Aqua)</span>
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
          <h2 id="inpe-h" className={title}>Our copy of Aqua’s count matches INPE’s</h2>
          {all ? (
            <p className={lead}>
              From 2012 to 2020, our count was within 10% of INPE’s official count in {all}% of months, across Brazil’s six biomes
              {study ? `; from 2021 to 2025, in ${study[1]} of ${study[2]} (${study[3]}%)` : ''}.
            </p>
          ) : null}
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">INPE uses the same NASA fire algorithm, so this shows we follow the same series. It isn’t an independent test.</p>
          {p3 ? <p className="mt-4 text-sm text-[color:var(--bone2)]">Check P3: <StatusChip status={p3.status} /></p> : null}
        </div>
        <div className="min-w-0 lg:col-span-8">
          <p className="mb-4 text-lg font-medium">The Amazon’s fires by year</p>
          <InpeChart />
          <p className="mt-3 text-xs text-[color:var(--bone3)]">Sources: INPE Programa Queimadas; the team’s reproduction table (analysis/brazil-data); checks.json, P3.</p>
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
    return !!y && y.verdict === 'outside' && y.lo != null && y.hi != null && y.lo <= r.placebo[1] && y.hi >= r.placebo[0]
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
      t: 'It can’t say how much of a difference the timing caused.',
      b: 'It sets Aqua’s count beside what we’d expect from VIIRS. The two changed together; the data don’t separate the timing’s share. What we’d expect is an estimate, not a corrected official count.',
    },
    {
      t: '“Unusual” is a rough line, not a proof.',
      b: 'Nine years, 2012 to 2020, set the usual range; a tenth ordinary year would fall outside it about one time in five. “How sure we are” resamples days, not years, so year-to-year weather shows only in the usual range. A flag describes; it isn’t a significance test.',
    },
    {
      t: weak.length ? `Some flags are close calls: ${andList(weak.map((w) => `${phrase(w.id).the} in ${w.year}`))} ${weak.length === 1 ? 'sits' : 'sit'} just outside the usual range.` : 'A year just outside a narrow usual range is a close call.',
      b: 'Close to no change: a year just outside a narrow range is not a finding. Argentina’s 2025 range takes in no change when days are resampled in 32-day blocks.',
    },
    {
      t: 'Missing satellite days are inferred.',
      b: 'A satellite counts as down on a day with no daytime detection anywhere in Brazil, and those days are dropped for every region; a partial loss over one region on an otherwise normal day isn’t caught. S-NPP events still to check: an anomaly in July 2022, location problems in 2024 and a partial data receipt in July 2025.',
    },
    ...(filled.length ? [{
      t: `${capital(numWord(filled.length))} calendar months show Aqua’s own count.`,
      b: `They had an S-NPP outage day and no NOAA-20 data to fill it, so they show Aqua’s count from before its look drifted: ${andList(filled.map(monthName))}.`,
    }] : []),
    {
      t: 'Aqua and Terra have their own outages and calibrations.',
      b: 'Aqua lost recorder data in early 2022 and went into safe hold on 31 March 2022; Terra paused its science data in October 2022 as it left its constellation. The two are calibrated separately.',
    },
    {
      t: 'NASA reprocessed VIIRS files in May 2025.',
      b: 'The fix, for still heat sources labelled as vegetation fires, touches the timing and fire-size inputs, which filter by fire type, not the all-types counts the comparison uses. Product versions aren’t yet recorded per file.',
    },
    { t: `Nothing after ${lastYear} yet.`, b: `${lastYear}’s counts come from NASA FIRMS’s yearly files.` },
    {
      t: 'Aqua and Terra are near the end of their missions.',
      b: (
        <>
          NASA has planned <a href={NASA_TERRA} target="_blank" rel="noreferrer" className={link}>Terra’s last operations</a> and{' '}
          <a href={NASA_AQUA_LIFE} target="_blank" rel="noreferrer" className={link}>Aqua’s end of life</a>, so counts that follow Aqua, as INPE’s does, will need a new reference.{' '}
          <a href={NESDIS_SNPP} target="_blank" rel="noreferrer" className={link}>S-NPP</a>, one of the VIIRS satellites, has been decommissioned; NOAA-20 and NOAA-21 carry the same camera on
          afternoon orbits that keep their time, so what we’d expect can still be worked out. The same test can vet any new reference satellite.
        </>
      ),
    },
  ]
  return (
    <section id="limits" aria-labelledby="limits-h" className={section}>
      <div className={cn(shell, 'grid grid-cols-1 gap-y-8 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="limits-h" className={title}>What Anchor can’t do</h2>
          <p className={lead}>One line each; open a line for the detail.</p>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            Who it’s for: anyone quoting a fire count from one year to the next. Check how far Aqua sat from what we’d expect in both years first.{' '}
            <a href={links.regions()} onClick={leave} className={textLink}>The six places</a>
          </p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          <Accordion type="multiple" motion={motion.on} level={3}>
            {items.map((it, i) => (
              <AccordionItem key={it.t} value={`l${i}`}>
                <AccordionTrigger number={String(i + 1).padStart(2, '0')}>{it.t}</AccordionTrigger>
                <AccordionContent><p className="max-w-[var(--measure)]">{it.b}</p></AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}

/* ---------- Sources, the AI disclosure, the code ---------- */

function Sources() {
  const link = cn(underline, 'text-[color:var(--bone)]', focusRing)
  return (
    <section id="sources" aria-labelledby="sources-h" className={section}>
      <div className={cn(shell, 'grid grid-cols-1 gap-y-12 py-16 lg:grid-cols-12 lg:gap-x-6 lg:py-24')}>
        <div className="lg:col-span-4">
          <h2 id="sources-h" className={title}>Sources</h2>
          <p className={lead}>Every number on this site comes from the team’s data files, built from these.</p>
          {REPO_URL ? (
            <p className="mt-6">
              <a href={REPO_URL} target="_blank" rel="noreferrer" className={cn('inline-flex min-h-11 items-center gap-2 text-sm', link)}>The code and the method notes <ArrowRight size={14} strokeWidth={1.5} aria-hidden /></a>
            </p>
          ) : null}
        </div>
        <div className="min-w-0 lg:col-span-8">
          <ul className="border-t border-[color:var(--hairline)]">
            {CREDITS.map((c) => (
              <li key={c.name} className="flex flex-col gap-1 border-b border-[color:var(--hairline)] py-3 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="text-[color:var(--bone)]">{c.name}</span>
                <span className="shrink-0">
                  {c.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className={cn(link, 'text-xs text-[color:var(--bone2)] hover:text-[color:var(--bone)]')}>{l.text}</a>)}
                </span>
              </li>
            ))}
          </ul>
          <div id="ai" className="mt-12 scroll-mt-32">
            <h3 className="text-2xl font-medium leading-tight tracking-[-0.01em]">Use of AI (disclosure)</h3>
            <div className="mt-4 flex max-w-[var(--measure)] flex-col gap-3 text-sm text-[color:var(--bone2)]">
              <p>The 2026 Space Apps rules ask teams to disclose AI use. AI assistants (large language model chat and coding tools) were used throughout this project. Team members directed the work, made the decisions and reviewed the results. AI assistance was used for:</p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5">
                <li><strong className="font-medium text-[color:var(--bone)]">research:</strong> finding and reading sources, checking facts, and reviewing and stress-testing the plan;</li>
                <li><strong className="font-medium text-[color:var(--bone)]">the data pipelines</strong> in <code>analysis/</code> (downloads, region assignment, counts, look times, the INPE comparison), and therefore the data they write to <code>data/out/</code>;</li>
                <li><strong className="font-medium text-[color:var(--bone)]">the statistics:</strong> clock audit, bootstrap intervals, noise floor, two clocks and prediction checks;</li>
                <li><strong className="font-medium text-[color:var(--bone)]">the California detection limits, the daylight analysis and the exploratory world map,</strong> including their independent checks;</li>
                <li><strong className="font-medium text-[color:var(--bone)]">the web app</strong> in <code>frontend/</code>: code, layout and on-page text;</li>
                <li><strong className="font-medium text-[color:var(--bone)]">documentation,</strong> including this README.</li>
              </ul>
              <p>The app’s photographs, video and satellite images are not AI-generated; their sources are credited below.</p>
            </div>
            <p className="mt-3 text-xs text-[color:var(--bone3)]">The team’s words, from the project README.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

