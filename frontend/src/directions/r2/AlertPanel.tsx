/*
 * The Explore page's question for fire managers: if a fire starts here today, when will a satellite tell you, and how
 * much daylight will be left to act? For responders: two inputs (place, alert delay), the first alert and its daylight
 * as two readouts, a table (one row per satellite: overpass, alert, daylight left), one strip of the day from sunrise
 * to sunset, then what Aqua's drift changed, with a then/now switch that moves Aqua's numbers.
 *
 * What is measured and what is assumed is said on the panel. It is a what-if, not a forecast of alerts: the delay is the
 * reader's choice from the range NASA publishes for its fire data. Nothing here says the clock changed how many fires
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
  { value: 0, name: 'No delay', label: '0 h' },
  { value: 1.5, name: 'One and a half hours', label: '1.5 h' },
  { value: 3, name: 'Three hours, NASA’s stated maximum', label: '3 h' },
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
  /** the place control (step 1) */
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
    if (pass == null) return { ...r, pass, alert: null as number | null, left: null as number | null }
    const alert = pass + delay
    return { ...r, pass, alert, left: set - alert }
  })
  // the first alert is the one that leaves the most daylight
  const first = read.filter((r) => r.alert != null).sort((a, b) => (a.alert as number) - (b.alert as number))[0]
  const firstLight = first?.left != null && Math.round(first.left * 60) > 0
  const aqua = rows.find((r) => r.key === 'aqua')
  const later = aqua?.pass != null && aquaBefore != null ? Math.round((aqua.pass - aquaBefore) * 60) : null
  // the same delay on both of Aqua's times: how many minutes of daylight the later pass costs (none of it once both are after dark)
  const fewer = later != null && aqua?.pass != null && aquaBefore != null
    ? Math.round((Math.max(0, set - aquaBefore - delay) - Math.max(0, set - aqua.pass - delay)) * 60)
    : null
  const move = motion ? 'transition-[left,width] duration-300 ease-[var(--ease)] motion-reduce:transition-none' : ''
  const label = 'text-sm text-[color:var(--bone2)]'

  return (
    <section aria-labelledby="alert-h" className="flex flex-col gap-4">
      <H id="alert-h" tabIndex={-1} className="text-[18px] font-medium leading-[1.3] tracking-[-0.015em] text-[color:var(--bone)] outline-none [text-wrap:balance] sm:text-[20px] sm:leading-[1.25]">
        If a fire starts in {place} today, when will a satellite tell you, and how much daylight will be left to act?
      </H>

      {/* the two inputs */}
      <div className="flex flex-col gap-2">
        {picker ? (
          <div className="flex items-center justify-between gap-3">
            <span className={label}>Place</span>
            {picker}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className={label}>Alert delay</span>
          <SegmentedControl<AlertDelay> label="Alert delay after the overpass (assumed)" value={delay} onChange={onDelay} motion={motion} className="w-[150px] shrink-0" segmentClassName="px-1.5 py-1 text-center text-sm" options={DELAYS} />
        </div>
      </div>

      {/* the answer: two readouts, the table, the day */}
      <div className="flex flex-col gap-3 border-t border-[color:var(--hairline)] pt-4">
        {first && first.alert != null ? (
          <dl aria-live="polite" className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-[color:var(--bone2)]">First alert</dt>
              <dd className="mt-0.5 text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[color:var(--bone)]">{fmtHM(first.alert)}</dd>
              <dd className="mt-1 flex items-center gap-1.5 text-xs text-[color:var(--bone2)]"><SatMark k={first.key} />{first.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-[color:var(--bone2)]">Daylight left to act</dt>
              <dd className="mt-0.5 text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[color:var(--bone)]">{firstLight ? span(first.left as number) : 'None'}</dd>
              <dd className="mt-1 text-xs text-[color:var(--bone2)]">{firstLight ? `until sunset at ${fmtHM(set)}` : 'the alert arrives after dark'}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-[color:var(--bone2)]">No satellite detected fires here in the saved data, so there are no times to show.</p>
        )}

        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">For each satellite: overpass time, alert time and daylight left, in local solar time</caption>
          <thead>
            <tr className="text-left text-xs text-[color:var(--bone3)]">
              <th scope="col" className="pb-1.5 font-normal">Satellite</th>
              <th scope="col" className="pb-1.5 font-normal">Overpass</th>
              <th scope="col" className="pb-1.5 font-normal">Alert</th>
              <th scope="col" className="pb-1.5 text-right font-normal">Daylight left</th>
            </tr>
          </thead>
          <tbody>
            {read.map((r) => {
              const top = first?.key === r.key && firstLight
              const dark = r.left != null && Math.round(r.left * 60) <= 0
              return (
                <tr key={r.key} className={cn('border-t border-[color:var(--hairline)]', top ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone2)]')}>
                  <th scope="row" className="py-2 text-left font-normal">
                    <span className={cn('flex items-center gap-2', top && 'font-medium')}>
                      <SatMark k={r.key} />{r.name}
                      {r.key === 'aqua' && then ? <span className="text-[11px] text-[color:var(--bone3)]">2012–20</span> : null}
                    </span>
                  </th>
                  <td className="py-2">{r.pass != null ? fmtHM(r.pass) : '—'}</td>
                  <td className="py-2">{r.alert != null ? fmtHM(r.alert) : '—'}</td>
                  <td className={cn('py-2 text-right', top && 'font-medium')}>{r.left == null ? 'No detections' : dark ? 'After dark' : span(r.left)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* the day from sunrise to sunset, one lane per satellite: the pass (tick), the wait (dashed), the daylight left (solid) */}
        <figure className="m-0">
          <div aria-hidden className="relative flex flex-col gap-1.5 rounded-[3px] bg-[color:var(--surface)] px-2 py-2">
            {read.map((r) => (
              <div key={r.key} className="relative h-2">
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[color:var(--hairline)]" />
                {r.pass != null && r.alert != null ? (
                  <>
                    <span className={cn('absolute top-1/2 h-0 -translate-y-1/2 border-t-2 border-dashed', move)} style={{ left: at(r.pass), width: `calc(${at(r.alert)} - ${at(r.pass)})`, borderColor: COLOR[r.key] }} />
                    <span className={cn('absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full', move)} style={{ left: at(r.alert), width: `calc(100% - ${at(r.alert)})`, background: COLOR[r.key], opacity: 0.85 }} />
                    <span className={cn('absolute top-1/2 h-2.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--bone)]', move)} style={{ left: at(r.pass) }} />
                  </>
                ) : null}
              </div>
            ))}
          </div>
          <figcaption className="mt-1 flex justify-between text-[11px] tabular-nums text-[color:var(--bone3)]">
            <span>Sunrise {fmtHM(rise)}</span>
            <span>Bar: daylight after the alert</span>
            <span>Sunset {fmtHM(set)}</span>
          </figcaption>
        </figure>
      </div>

      {/* what Aqua's drift changed: then and now */}
      {later != null && fewer != null && later >= 5 && aquaBefore != null && aqua?.pass != null ? (
        <div data-tour="then-now" className="flex flex-col gap-2.5 border-t border-[color:var(--hairline)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[color:var(--bone)]">What Aqua’s drift changed</p>
            {onAquaThen ? (
              <SegmentedControl<'then' | 'now'>
                label="Aqua's pass time: 2012 to 2020, or now"
                value={then ? 'then' : 'now'}
                onChange={(v) => onAquaThen(v === 'then')}
                motion={motion}
                className="w-[150px] shrink-0"
                segmentClassName="px-1.5 py-1 text-center text-sm"
                options={[
                  { value: 'then', name: `2012 to 2020, ${fmtHM(aquaBefore)}`, label: '2012–20' },
                  { value: 'now', name: `Now, ${fmtHM(aqua.pass)}`, label: 'Now' },
                ]}
              />
            ) : null}
          </div>
          <p className="text-sm leading-6 text-[color:var(--bone)]">
            Aqua now passes {later} minutes later than in 2012–2020 ({fmtHM(aquaBefore)} → {fmtHM(aqua.pass)}), so its alert arrives {later} minutes later
            {fewer > 0 ? <> and leaves {fewer} fewer minutes of daylight.</> : <>. At this delay it arrives after dark either way.</>}
          </p>
        </div>
      ) : null}

      <p className="text-xs leading-5 text-[color:var(--bone3)]">
        Times are local solar time, not clock time.{' '}
        <span className="text-[color:var(--bone2)]">Measured:</span> overpasses, sunrise, sunset, fires on the map{fires ? ` (${fires})` : ''}.{' '}
        <span className="text-[color:var(--bone2)]">Assumed:</span> the alert delay (NASA: within 3 h).{' '}
        {basis} Cloud or smoke can hide a fire.
      </p>
    </section>
  )
}

export default AlertPanel
