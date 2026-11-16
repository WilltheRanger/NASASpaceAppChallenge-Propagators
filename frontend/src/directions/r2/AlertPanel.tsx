/*
 * The Explore page's question for fire managers: if a fire started here, when would a satellite's alert arrive, and how
 * much daylight would be left? One row per satellite: when it passes (real), when its alert would arrive (the pass plus
 * an assumed delay), and the daylight left before sunset (real sunset). Each row is a gauge of the day from sunrise to
 * sunset, so the three can be compared at a glance; the row with the most daylight left is marked.
 *
 * What is real and what is assumed is said on the panel. It is a what-if, not a forecast of alerts: the delay is chosen
 * by the reader from the range NASA publishes for its fire data. Nothing here says the clock changed how many fires
 * burned.
 */
import type { ReactNode } from 'react'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { fmtHM } from '@/r2/data'
import { cn } from '@/lib/utils'

export type AlertDelay = 0 | 1.5 | 3
export type AlertRow = {
  key: 'terra' | 'viirs' | 'aqua'
  name: string
  /** when the satellite passes, local sun time in hours; null when there is nothing to read it from */
  pass: number | null
}

const COLOR: Record<AlertRow['key'], string> = { terra: 'var(--sat-terra)', viirs: 'var(--sat-viirs)', aqua: 'var(--sat-aqua)' }
const DELAYS: { value: AlertDelay; name: string; label: string }[] = [
  { value: 0, name: 'No delay, the best case', label: 'None' },
  { value: 1.5, name: 'One and a half hours', label: '1.5 h' },
  { value: 3, name: 'Three hours, the limit NASA states', label: '3 h' },
]

/** hours as "2 h 05" or "45 min" */
function span(h: number) {
  const m = Math.round(h * 60)
  const hh = Math.floor(m / 60)
  return hh ? `${hh} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}

function SatMark({ k }: { k: AlertRow['key'] }) {
  if (k === 'terra') return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={{ border: `2px solid ${COLOR[k]}` }} />
  if (k === 'viirs') return <span aria-hidden className="mx-px inline-block size-2 shrink-0 rotate-45" style={{ background: COLOR[k] }} />
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: COLOR[k] }} />
}

export function AlertPanel({ place, rows, rise, set, delay, onDelay, aquaBefore, aquaThen = false, onAquaThen, picker, fires, basis, motion, headingLevel = 2 }: {
  /** the place, as it reads in a sentence: "the Amazon", "Kenya" */
  place: string
  rows: AlertRow[]
  /** sunrise and sunset, local sun time in hours */
  rise: number
  set: number
  delay: AlertDelay
  onDelay: (d: AlertDelay) => void
  /** when Aqua passed in 2012-2020 (hours), where the team has measured it */
  aquaBefore?: number | null
  /** Aqua at its 2012-2020 pass instead of today's: the then/now switch */
  aquaThen?: boolean
  onAquaThen?: (then: boolean) => void
  /** the place and the six studied regions, under the question */
  picker?: ReactNode
  /** the dates of the fires on the map, e.g. "14–15 Nov 2026" */
  fires?: string
  /** where the pass times and the sunset come from, in one or two short sentences */
  basis: ReactNode
  motion: boolean
  headingLevel?: 1 | 2
}) {
  const H = headingLevel === 1 ? 'h1' : 'h2'
  const day = Math.max(0.1, set - rise)
  const at = (h: number) => `${Math.max(0, Math.min(100, ((h - rise) / day) * 100))}%`
  const then = aquaThen && aquaBefore != null
  const read = rows.map((r) => {
    const pass = r.key === 'aqua' && then ? aquaBefore : r.pass
    if (pass == null) return { ...r, pass, alert: null, left: null }
    const alert = pass + delay
    return { ...r, pass, alert, left: set - alert }
  })
  // the most daylight is worth marking only when there is more than one satellite to compare
  const lit = read.filter((r) => r.left != null && Math.round(r.left * 60) > 0)
  const best = lit.length > 1 ? Math.max(...lit.map((r) => r.left as number)) : null
  const aqua = rows.find((r) => r.key === 'aqua')
  const later = aqua?.pass != null && aquaBefore != null ? Math.round((aqua.pass - aquaBefore) * 60) : null
  // the same delay on both of Aqua's times: how many minutes of daylight the later pass costs (none of it once both are after dark)
  const fewer = later != null && aqua?.pass != null && aquaBefore != null
    ? Math.round((Math.max(0, set - aquaBefore - delay) - Math.max(0, set - aqua.pass - delay)) * 60)
    : null
  const move = motion ? 'transition-[left,width] duration-300 ease-[var(--ease)] motion-reduce:transition-none' : ''
  return (
    <section aria-labelledby="alert-h" className="flex flex-col gap-3 sm:gap-4">
      <H id="alert-h" tabIndex={-1} className="text-[18px] font-medium leading-[1.3] tracking-[-0.015em] text-[color:var(--bone)] outline-none [text-wrap:balance] sm:text-[20px] sm:leading-[1.25]">
        If a fire starts in {place} today, when will a satellite tell you, and how much daylight will be left to act?
      </H>
      {picker}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-4 text-[color:var(--bone2)]">
          Alert delay
          <span className="ml-1.5 rounded-[3px] border border-dashed border-[color:var(--bone-30)] px-1 text-[11px]">assumed</span>
        </p>
        <SegmentedControl<AlertDelay> label="Delay between the pass and the alert, an assumption" value={delay} onChange={onDelay} motion={motion} className="w-[176px] shrink-0" segmentClassName="px-2 py-1 text-center text-sm" options={DELAYS} />
      </div>

      <ol id="alert-rows" className="flex flex-col">
        {read.map((r) => {
          const top = best != null && r.left === best
          const dark = r.left != null && Math.round(r.left * 60) <= 0
          return (
            <li key={r.key} className="border-t border-[color:var(--hairline)] py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-[color:var(--bone)]"><SatMark k={r.key} />{r.name}{r.key === 'aqua' && then ? <span className="text-xs font-normal text-[color:var(--bone2)]">in 2012–2020</span> : null}</span>
                {r.left == null ? (
                  <span className="text-xs text-[color:var(--bone3)]">No detections here that day</span>
                ) : (
                  <span className="flex items-baseline gap-2">
                    {top ? <span className="rounded-[3px] bg-[color:var(--bone)] px-1.5 text-[11px] font-medium leading-5 text-[color:var(--ink)]">Most daylight</span> : null}
                    <span className={cn('text-base font-medium tabular-nums', dark ? 'text-[color:var(--bone2)]' : 'text-[color:var(--bone)]')}>{dark ? 'No daylight left' : `${span(r.left)} left`}</span>
                  </span>
                )}
              </div>
              {r.pass != null && r.alert != null ? (
                <>
                  <p className="mt-0.5 text-xs tabular-nums text-[color:var(--bone2)]">
                    Passes {fmtHM(r.pass)} <span aria-hidden>→</span><span className="sr-only">,</span> alert {fmtHM(r.alert)}
                  </p>
                  {/* the day from sunrise to sunset: the pass, the wait for the alert (dashed: assumed), the daylight left */}
                  <div aria-hidden className="relative mt-1.5 h-3">
                    <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[color:var(--hairline)]" />
                    <span className={cn('absolute top-1/2 h-0 -translate-y-1/2 border-t-2 border-dashed', move)} style={{ left: at(r.pass), width: `calc(${at(r.alert)} - ${at(r.pass)})`, borderColor: COLOR[r.key] }} />
                    <span className={cn('absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[color:var(--bone)]', move)} style={{ left: at(r.alert), width: `calc(100% - ${at(r.alert)})` }} />
                    {r.key === 'aqua' && !then && aquaBefore != null && later != null && Math.abs(later) >= 5 ? (
                      <span title="Aqua’s pass in 2012–2020" className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--ground)]" style={{ left: at(aquaBefore), border: `2px solid ${COLOR.aqua}` }} />
                    ) : null}
                    <span className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: at(r.pass), background: COLOR[r.key] }} />
                  </div>
                </>
              ) : null}
            </li>
          )
        })}
        <li aria-hidden className="flex justify-between border-t border-[color:var(--hairline)] pt-1.5 text-[11px] tabular-nums text-[color:var(--bone3)]">
          <span>Sunrise {fmtHM(rise)}</span>
          <span>Sunset {fmtHM(set)}</span>
        </li>
      </ol>

      {later != null && fewer != null && later >= 5 && aquaBefore != null && aqua?.pass != null ? (
        <div data-tour="then-now" className="flex flex-col gap-2.5 rounded-[4px] border border-[color:var(--hairline)] p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-[color:var(--bone)]">What Aqua’s drift changed</h3>
            {onAquaThen ? (
              <SegmentedControl<'then' | 'now'>
                label="Aqua's pass time: 2012 to 2020, or now"
                value={then ? 'then' : 'now'}
                onChange={(v) => onAquaThen(v === 'then')}
                motion={motion}
                className="w-[176px] shrink-0"
                segmentClassName="px-2 py-1 text-center text-sm"
                options={[
                  { value: 'then', name: `2012 to 2020, ${fmtHM(aquaBefore)}`, label: <span className="tabular-nums">Then {fmtHM(aquaBefore)}</span> },
                  { value: 'now', name: `Now, ${fmtHM(aqua.pass)}`, label: <span className="tabular-nums">Now {fmtHM(aqua.pass)}</span> },
                ]}
              />
            ) : null}
          </div>
          <p className="text-sm leading-6 text-[color:var(--bone)]">
            Aqua now passes {later} minutes later than in 2012–2020, so its alert arrives {later} minutes later
            {fewer > 0 ? <> and leaves {fewer} fewer minutes of daylight.</> : <>. At this delay it arrives after dark either way.</>}
          </p>
        </div>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs leading-5">
        <dt className="text-[color:var(--bone)]">Real</dt>
        <dd className="text-[color:var(--bone2)]">Pass times, sunset, and the fires on the map{fires ? ` (${fires})` : ''}.</dd>
        <dt className="text-[color:var(--bone)]">Assumed</dt>
        <dd className="text-[color:var(--bone2)]">The alert delay. NASA reports 60 to 125 minutes on average for MODIS, and 3 hours as its limit.</dd>
      </dl>
      <p className="text-xs leading-5 text-[color:var(--bone3)]">{basis} A what-if, not a forecast of alerts. A satellite can pass and still miss a fire under cloud.</p>
    </section>
  )
}

export default AlertPanel
