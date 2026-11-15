// Daylight left after the alert, moved off the Region page for the Explore page: how much day an alert from each pass
// leaves before sunset, year by year, and one real fire day in Pará. Self-contained (it reads the region's files itself)
// and sized by its container, not the window, so it fits a 340 px rail or a full page.
// Real: the look times, the fires, the passes and the counts (NASA FIRMS); sunset from NOAA's solar equations.
// The alert delays (none, 1.5 and 3 hours) are examples inside NASA's published range for FIRMS data, labelled so.
// Nothing here reads the fire-day file's other fields.
import { Fragment, useMemo, useRef, useState } from 'react'
import { SeriesChart, useMeasuredWidth, type Series } from '@/components/ui/series-chart'
import { FIRE_DAY, MONTHS, daylight, daylightHeadline, fmtHM, fmtInt, regionData, type DayFire, type RegionData, type SatKey } from '@/r2/data'
import { cn } from '@/lib/utils'
import { Bullets, DetMark, IMG, More, andList, ease, focusRing, linksFor, textLink, type DetShape, type Nav } from './common'

const DAY_SATS: { key: SatKey; label: string; marker: Series['marker']; color: string }[] = [
  { key: 'terra', label: 'Terra', marker: 'hollow', color: 'var(--sat-terra)' },
  { key: 'viirs', label: 'VIIRS', marker: 'diamond', color: 'var(--sat-viirs)' },
  { key: 'aqua', label: 'Aqua', marker: 'filled', color: 'var(--sat-aqua)' },
]
/** Hours as "4 h 58 min", "13 min", or the minutes after sunset. */
export const hoursText = (h: number) => {
  const m = Math.round(h * 60)
  if (m < 0) return `${-m} min after sunset`
  const hh = Math.floor(m / 60)
  return hh ? `${hh} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`
}
const dayTick = (v: number) => `${v} h`
const dateText = (m: { m: number; day: number }) => `${m.day} ${MONTHS[m.m - 1]}`

/** The headline numbers: how much less daylight an Aqua alert left in the last year than in 2012–2020, and how much was
 *  left (alert 1.5 h after the pass, an example delay). Where the one-day figure misses the real fires by more than 30
 *  minutes (Argentina, California), the median over every real Aqua detection is quoted instead, as the daylight files say. */
export function daylightFinding(region: string) {
  const d = regionData(region)
  const dl = daylight(d)
  if (!dl || !dl.years.length) return null
  const last = dl.years[dl.years.length - 1]
  const real = daylightHeadline(region)
  const useReal = real?.quote === 'level2a' && real.level2a_aqua_D15_2025 != null && real.level2a_aqua_daylight_change_min != null
  const lookShift = dl.baseAqua != null ? Math.round((last.look.aqua - dl.baseAqua) * 60) : null
  const lost = useReal ? Math.round(-real!.level2a_aqua_daylight_change_min!) : lookShift
  const leftNow = useReal ? real!.level2a_aqua_D15_2025! : last.left.aqua[1]
  return { d, dl, year: last.year, lost, leftNow, median: useReal, season: dl.season.label }
}

/** Daylight left after each satellite's alert, by year: a dot for an alert 1.5 hours after the pass, a bar from no
 *  delay to 3 hours. Pick a year by pointer or keys. */
export function DaylightChart({ d, year, onYear, height }: { d: RegionData; year?: number; onYear?: (y: number) => void; height?: number }) {
  const dl = useMemo(() => daylight(d), [d])
  const [inspect, setInspect] = useState<number | null>(null)
  if (!dl || !dl.years.length) return null
  const ys = dl.years
  const selected = year != null ? ys.findIndex((y) => y.year === year) : -1
  const shownIndex = inspect ?? (selected >= 0 ? selected : ys.length - 1)
  const series: Series[] = DAY_SATS.map((s) => ({
    id: s.key, label: s.label, marker: s.marker, color: s.color,
    values: ys.map((y) => y.left[s.key][1]), lo: ys.map((y) => y.left[s.key][2]), hi: ys.map((y) => y.left[s.key][0]),
  }))
  const columnText = (i: number) => {
    const y = ys[i]
    return `${y.year}, sunset ${fmtHM(y.set)}: an alert 1.5 hours after each pass leaves ${DAY_SATS.map((s) => `${s.label} ${hoursText(y.left[s.key][1])}`).join(', ')}`
  }
  return (
    <SeriesChart
      labels={ys.map((y) => String(y.year))}
      series={series}
      reference={{ value: 0, label: 'Sunset', color: 'var(--bone3)' }}
      height={height ?? 260}
      activeIndex={shownIndex}
      selectedIndex={selected >= 0 ? selected : null}
      onInspect={setInspect}
      onSelect={(i) => onYear?.(ys[i].year)}
      groupLabel={`Daylight left after each satellite’s alert, by year, for ${d.name}`}
      columnText={columnText}
      formatTick={dayTick}
      ink={{ fg: 'var(--bone2)', grid: 'var(--hairline)', surface: 'var(--ground)', guide: 'var(--bone)' }}
    />
  )
}

/** The passes over the one fire day, in pass order; VIIRS alerts at the end of S-NPP's pass, the earlier of its two. */
const DAY_PASSES: { key: 'Terra' | 'VIIRS' | 'Aqua'; look: string; shape: DetShape; color: string; t: (f: DayFire) => number | null }[] = [
  { key: 'Terra', look: 'Terra', shape: 'hollow', color: 'var(--sat-terra)', t: (f) => f.t_Terra },
  { key: 'VIIRS', look: 'S-NPP', shape: 'diamond', color: 'var(--sat-viirs)', t: (f) => f.t_VIIRS },
  { key: 'Aqua', look: 'Aqua', shape: 'filled', color: 'var(--sat-aqua)', t: (f) => f.t_Aqua },
]

/** One real fire day, mapped: every fire the day's passes saw on NASA's picture of that afternoon, and what each pass's
 *  alert left of the day. Fires, passes and counts are real; the delay is an example (none or 3 hours). */
export function FireDayMap() {
  const day = FIRE_DAY
  const boxRef = useRef<HTMLDivElement | null>(null)
  const W = useMeasuredWidth(boxRef)
  const [delay, setDelay] = useState<0 | 3>(0)
  const [hover, setHover] = useState<DayFire | null>(null)
  if (!day) return null
  const [w, s, e, n] = day.box
  const H = W * ((n - s) / (e - w))
  const X = (lon: number) => ((lon - w) / (e - w)) * W
  const Y = (lat: number) => ((n - lat) / (n - s)) * H
  const maxN = Math.max(...day.fires.map((f) => f.n))
  const firstPass = (f: DayFire) => DAY_PASSES.find((p) => p.t(f) != null) ?? DAY_PASSES[2]
  const rows = DAY_PASSES.map((p) => {
    const seen = day.fires.filter((f) => p.t(f) != null)
    const alert = (seen.length ? Math.min(...seen.map((f) => p.t(f)!)) : day.passEnd[p.look]) + delay
    return { ...p, pass: day.passes[p.look], alert, left: day.sunset - alert, seen: seen.length }
  })
  const [dy, dm, dd] = day.day.split('-').map(Number)
  const dateLabel = `${dd} ${MONTHS[dm - 1]} ${dy}`
  const readout = hover
    ? `A fire of ${fmtInt(hover.n)} detections, first seen at ${fmtHM(hover.first_seen)} by ${andList(hover.seen_by)}`
    : 'Point at a fire to see which passes saw it.'
  const toggle = cn('min-h-11 rounded px-3 text-sm', ease, focusRing)
  return (
    <figure className="m-0">
      <figcaption className="mb-3">
        <span className="block text-base font-medium text-[color:var(--bone)]">One real fire day: {dateLabel} in Pará</span>
        <span className="mt-1 block text-sm text-[color:var(--bone2)]">
          {fmtInt(day.fires.length)} fires seen by the day’s passes, on that afternoon’s picture. Sunset {fmtHM(day.sunset)} local sun time.
        </span>
      </figcaption>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Delay before the alert (an example)">
        <span className="mr-1 text-xs text-[color:var(--bone3)]">Example delay</span>
        {([0, 3] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={delay === v}
            onClick={() => setDelay(v)}
            className={cn(toggle, delay === v ? 'bg-[color:var(--bone)] text-[color:var(--ink)]' : 'bg-[color:var(--surface)] text-[color:var(--bone2)] hover:text-[color:var(--bone)]')}
          >
            {v === 0 ? 'None' : '3 hours'}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mb-3 min-h-5 text-xs text-[color:var(--bone2)]">{readout}</p>
      <div ref={boxRef} className="relative w-full overflow-hidden rounded-[2px] bg-[color:var(--surface)]" style={{ aspectRatio: `${e - w} / ${n - s}` }}>
        <img src={`${IMG}daylight/${day.region}-${day.day}.jpg`} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        {W > 0 ? (
          <svg width={W} height={H} className="absolute inset-0 block" role="img" aria-label={`Map of the ${day.fires.length} fires seen on ${dateLabel}, marked by the earliest pass that saw each: ${DAY_PASSES.map((p) => `${p.key} ${day.fires.filter((f) => firstPass(f) === p).length}`).join(', ')}`}>
            {day.fires.map((f) => {
              const p = firstPass(f)
              const r = 3.5 + 4 * Math.sqrt(f.n / maxN)
              return (
                <g key={f.id} onMouseEnter={() => setHover(f)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
                  <circle cx={X(f.lon)} cy={Y(f.lat)} r={r + 6} fill="transparent" />
                  <DetMark shape={p.shape} color={p.color} x={X(f.lon)} y={Y(f.lat)} r={r} />
                  {hover?.id === f.id ? <circle cx={X(f.lon)} cy={Y(f.lat)} r={r + 4} fill="none" stroke="var(--bone)" strokeWidth={1.5} /> : null}
                </g>
              )
            })}
          </svg>
        ) : null}
      </div>
      <div aria-hidden className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[color:var(--bone2)]">
        <span>First seen by:</span>
        {DAY_PASSES.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-2">
            <svg width={14} height={14}><DetMark shape={p.shape} color={p.color} x={7} y={7} r={4.5} /></svg>
            {p.key}
          </span>
        ))}
        <span>Bigger mark, more detections</span>
      </div>
      <table className="mt-5 w-full border-collapse text-xs tabular-nums @md:text-sm">
        <caption className="sr-only">Daylight left after each pass’s alert, {delay === 0 ? 'no delay' : 'a 3-hour delay (an example)'}</caption>
        <thead>
          <tr className="border-b border-[color:var(--hairline)] text-left text-xs text-[color:var(--bone3)]">
            <th scope="col" className="py-2 pr-2 font-normal">Pass</th>
            <th scope="col" className="py-2 pr-2 font-normal">Looked</th>
            <th scope="col" className="py-2 pr-2 font-normal">Alert</th>
            <th scope="col" className="py-2 pr-2 font-normal">Daylight left</th>
            <th scope="col" className="py-2 text-right font-normal">Fires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-[color:var(--hairline)]">
              <th scope="row" className="py-2 pr-2 text-left font-normal">
                <span className="inline-flex items-center gap-2">
                  <svg width={14} height={14} aria-hidden><DetMark shape={r.shape} color={r.color} x={7} y={7} r={4.5} /></svg>
                  {r.key}
                </span>
              </th>
              <td className="py-2 pr-2">{fmtHM(r.pass)}</td>
              <td className="py-2 pr-2">{fmtHM(r.alert)}</td>
              <td className="py-2 pr-2">{hoursText(r.left)}</td>
              <td className="py-2 text-right">{fmtInt(r.seen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-[color:var(--bone3)]">Real fires and pass times: NASA FIRMS. Picture: NASA Worldview / GIBS, VIIRS true colour.</p>
      <More label="How we worked it out" className="mt-1">
        <p className="mt-1 text-xs text-[color:var(--bone2)]">
          A fire is a patch of detections in touching 0.05° cells. Alert = the end of the pass over this box, plus the example
          delay. Sunset: NOAA’s solar equations at the box centre.
        </p>
      </More>
    </figure>
  )
}

/** The whole section: the finding, the chart by year with its reading, the limits, and (for the Amazon) the fire day.
 *  `level` sets the heading level for where it is dropped in. */
export function DaylightSection({ region, motion = true, nav = 'dev', level = 3, className }: { region: string; motion?: boolean; nav?: Nav; level?: 2 | 3 | 4; className?: string }) {
  const f = useMemo(() => daylightFinding(region), [region])
  const boxRef = useRef<HTMLDivElement | null>(null)
  const width = useMeasuredWidth(boxRef)
  const [year, setYear] = useState<number | null>(null)
  void motion
  if (!f) return null
  const { d, dl, lost, leftNow } = f
  const ys = dl.years
  const shown = ys.find((y) => y.year === year) ?? ys[ys.length - 1]
  const H = `h${level}` as 'h3'
  const heading = lost == null
    ? `How much daylight an alert from each pass leaves in ${d.phrase.the}`
    : `In ${f.year}, an alert from Aqua left ${Math.abs(lost)} ${lost >= 0 ? 'fewer' : 'more'} minutes of daylight in ${d.phrase.the} than in 2012–2020`
  const limits = [
    'With sunset fixed, a later look leaves less daylight, minute for minute.',
    d.id.startsWith('br-')
      ? 'INPE also watches with weather satellites that take a picture several times an hour; Aqua is its reference for yearly numbers, one alert source among many.'
      : 'Fire services also watch with weather satellites that take a picture several times an hour.',
    'Sunset isn’t a hard stop: crews work at night too.',
    'The delays (none, 1.5 and 3 hours) are examples, not measured. NASA FIRMS says its near-real-time data arrive within 3 hours of a pass.',
    'One date and place stand for the whole region: the middle day of its fire season, at the centre of its box. Fires elsewhere see other sunsets.',
    ...(f.median ? ['Here real fires burn on other dates and places than that day, so the heading uses the middle value over every real Aqua detection; the chart keeps the one-day figure.'] : []),
  ]
  const method = linksFor(nav).method('sources')
  return (
    <section ref={boxRef} aria-label="Daylight left after the alert" className={cn('@container', className)}>
      <div className="grid grid-cols-1 gap-y-6 @4xl:grid-cols-12 @4xl:gap-x-6">
        <div className="@4xl:col-span-4">
          <H className="text-balance text-lg font-medium leading-snug text-[color:var(--bone)] @2xl:text-2xl">{heading}</H>
          <p className="mt-3 text-sm text-[color:var(--bone2)]">
            Example: the alert comes 1.5 hours after the pass. In {f.year}’s fire season ({f.season}), that leaves {hoursText(leftNow)} of daylight
            {f.median ? ' (the middle value over every real Aqua detection)' : ''}.
          </p>
          <p className="mt-3 text-sm text-[color:var(--bone)]">One satellite’s alert timing, not a country’s response.</p>
          <dl aria-live="polite" className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 border-t border-[color:var(--hairline)] pt-3 text-sm">
            <dt className="text-[color:var(--bone3)]">Year</dt>
            <dd className="tabular-nums text-[color:var(--bone)]">{shown.year}</dd>
            <dt className="text-[color:var(--bone3)]">Sunset</dt>
            <dd className="tabular-nums text-[color:var(--bone)]">{fmtHM(shown.set)} <span className="text-[color:var(--bone3)]">on {dateText(shown.mid)}</span></dd>
            {DAY_SATS.map((s) => (
              <Fragment key={s.key}>
                <dt className="text-[color:var(--bone3)]">{s.label}</dt>
                <dd className="tabular-nums text-[color:var(--bone)]">{hoursText(shown.left[s.key][1])} <span className="text-[color:var(--bone3)]">after a {fmtHM(shown.look[s.key])} look</span></dd>
              </Fragment>
            ))}
          </dl>
          <More label="Limits" className="mt-3">
            <Bullets items={limits} />
          </More>
        </div>
        <div className="flex min-w-0 flex-col gap-10 @4xl:col-span-8">
          <figure className="m-0">
            <figcaption className="mb-3">
              <span className="block text-base font-medium text-[color:var(--bone)]">Daylight left after each satellite’s alert</span>
              <span className="mt-1 block text-sm text-[color:var(--bone2)]">Dots: an alert 1.5 hours after the pass. Bars: no delay (top) to 3 hours (bottom). All three delays are examples.</span>
            </figcaption>
            <DaylightChart d={d} year={shown.year} onYear={setYear} height={width && width < 560 ? 220 : 280} />
            <p className="mt-3 text-xs text-[color:var(--bone3)]">
              Worked out from the look times (drift/{d.id}.json) and the fire season (calendar/{d.id}.json) ·{' '}
              <a href={method} className={textLink}>Sources</a>
            </p>
          </figure>
          {FIRE_DAY && FIRE_DAY.region === d.id ? <FireDayMap /> : null}
        </div>
      </div>
    </section>
  )
}

export default DaylightSection
