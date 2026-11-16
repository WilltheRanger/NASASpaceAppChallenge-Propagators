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
import { DelayRuler, TYPICAL_DELAY, formatDelay } from '@/components/ui/delay-ruler'
import { fmtHM } from '@/r2/data'
import { cn } from '@/lib/utils'

/** hours between a pass and its alert: 0 to 3 in quarter hours */
export type AlertDelay = number
export type AlertRow = {
  key: 'terra' | 'viirs' | 'aqua'
  name: string
  /** when the satellite passes, local sun time in hours; null when there is nothing to read it from */
  pass: number | null
}

const COLOR: Record<AlertRow['key'], string> = { terra: 'var(--sat-terra)', viirs: 'var(--sat-viirs)', aqua: 'var(--sat-aqua)' }
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


export function AlertPanel({ place, rows, rise, set, delay, onDelay, aquaBefore, aquaThen = false, onAquaThen, picker, fires, basis, motion, onHelp, calendar, headingLevel = 2 }: {
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
  /** opens the walkthrough */
  onHelp?: () => void
  /** a link to this place's fire calendar on the Regions page */
  calendar?: ReactNode
  headingLevel?: 1 | 2
}) {
  const H = headingLevel === 1 ? 'h1' : 'h2'
  const day = Math.max(0.1, set - rise)
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
    <section aria-labelledby="alert-h" className="flex flex-col gap-5">
      <div>
        <H id="alert-h" tabIndex={-1} className="text-[18px] font-medium leading-[1.3] tracking-[-0.015em] text-[color:var(--bone)] outline-none [text-wrap:balance]">
          If a fire starts in {place} today, when could a satellite alert me, and how much daylight would I have left to act?
        </H>
        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {onHelp ? (
            <button type="button" onClick={onHelp} className="rounded text-[color:var(--bone2)] underline decoration-[color:var(--bone-30)] underline-offset-4 hover:text-[color:var(--bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]">
              How it works
            </button>
          ) : null}
          {calendar}
        </p>
      </div>

      <div data-tour="inputs" className="flex flex-col gap-3 border-t border-[color:var(--hairline)] pt-4">
        {picker ? (
          <div className="flex items-center justify-between gap-3">
            <span className={label}>Place</span>
            {picker}
          </div>
        ) : null}
        <div className="flex flex-col">
          <span className={label}>Alert delay</span>
          <DelayRuler
            label="Alert delay after the pass (assumed), 0 to 3 hours"
            value={delay}
            onValue={onDelay}
            band={TYPICAL_DELAY}
            bandLabel="typical"
            format={formatDelay}
          />
        </div>
      </div>

      {/* the answer: one row per satellite; the first alert, with the most daylight left, is highlighted */}
      <table data-tour="answer" className="w-full border-separate border-spacing-0 text-sm tabular-nums">
        <caption className="sr-only">For each satellite: when it passes, when its alert arrives, and the daylight left, in local sun time. The first alert leaves the most daylight.</caption>
        <thead>
          <tr className="text-left text-xs text-[color:var(--bone3)]">
            <th scope="col" className="pb-1.5 pl-2 font-normal">Satellite</th>
            <th scope="col" className="pb-1.5 font-normal">Passes</th>
            <th scope="col" className="pb-1.5 font-normal">Alert</th>
            <th scope="col" className="pb-1.5 pr-2 text-right font-normal">Daylight left</th>
          </tr>
        </thead>
        <tbody>
          {read.map((r) => {
            const top = first?.key === r.key && firstLight
            const dark = r.left != null && Math.round(r.left * 60) <= 0
            const share = r.left != null ? Math.max(0, Math.min(1, r.left / day)) : 0
            const cell = cn('py-2.5', top && 'bg-[color:var(--raised)]')
            return (
              <tr key={r.key} aria-label={top ? `${r.name}: first alert, most daylight left` : undefined} className={top ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone2)]'}>
                <th scope="row" className={cn(cell, 'rounded-l-[4px] pl-2 text-left font-normal')}>
                  <span className={cn('flex items-center gap-2', top && 'font-medium')}>
                    <SatMark k={r.key} />{r.name}
                    {r.key === 'aqua' && then ? <span className="text-[11px] text-[color:var(--bone3)]">’12–20</span> : null}
                  </span>
                </th>
                <td className={cell}>{r.pass != null ? fmtHM(r.pass) : '—'}</td>
                <td className={cell}>{r.alert != null ? fmtHM(r.alert) : '—'}</td>
                <td className={cn(cell, 'rounded-r-[4px] pr-2 text-right')}>
                  <span className="flex items-center justify-end gap-2">
                    {r.left != null && !dark ? (
                      <span aria-hidden className="relative h-1.5 w-10 overflow-hidden rounded-full bg-[color:var(--hairline)]">
                        <span className={cn('absolute inset-y-0 left-0 rounded-full', move)} style={{ width: `${share * 100}%`, background: COLOR[r.key] }} />
                      </span>
                    ) : null}
                    <span className={cn(top && 'font-medium')}>{r.left == null ? 'No data' : dark ? 'After dark' : span(r.left)}</span>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* what Aqua's drift changed */}
      {later != null && fewer != null && later >= 5 && aquaBefore != null && aqua?.pass != null ? (
        <div data-tour="then-now" className="flex flex-col gap-2.5 border-t border-[color:var(--hairline)] pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className={label}>Aqua’s time</span>
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
          {/* the ring is Aqua's 2012-20 time, the dot today's (the Ring Then Dot Rule) */}
          <p className="flex items-center gap-2 text-sm tabular-nums text-[color:var(--bone2)]">
            <span className="sr-only">Aqua passed at {fmtHM(aquaBefore)} in 2012 to 2020 and passes at {fmtHM(aqua.pass)} now.</span>
            <span aria-hidden className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full border-[1.5px] border-[color:var(--sat-aqua)]" />
              {fmtHM(aquaBefore)}
              <span className="h-px w-5 bg-[color:var(--sat-aqua)]" />
              <span className="inline-block size-2.5 rounded-full bg-[color:var(--sat-aqua)]" />
              <span className="text-[color:var(--bone)]">{fmtHM(aqua.pass)}</span>
            </span>
            <span className="ml-auto text-[color:var(--bone)]">+{later} min</span>
          </p>
          <p className="text-sm leading-5 text-[color:var(--bone2)]">
            {fewer > 0
              ? <><span className="text-[color:var(--bone)]">{fewer} min less daylight</span> with the same delay.</>
              : <>After dark either way.</>}
          </p>
        </div>
      ) : null}

    </section>
  )
}

export default AlertPanel
