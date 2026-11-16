import snapshot from '../../../analysis/nrt-2026/out/provenance.json'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "2026-11-08" and "2026-11-14" as "8–14 Nov 2026" (or "28 Oct – 3 Nov 2026" across a month) */
function span(a: string, b: string) {
  const [ya, ma, da] = a.split('-').map(Number), [yb, mb, db] = b.split('-').map(Number)
  if (ya === yb && ma === mb) return `${da}–${db} ${MONTHS[mb - 1]} ${yb}`
  return `${da} ${MONTHS[ma - 1]}${ya === yb ? '' : ` ${ya}`} – ${db} ${MONTHS[mb - 1]} ${yb}`
}

/** A separate observational snapshot, never an input to the historical calibrated calendar. */
export function RecentObservations() {
  return (
    <aside aria-labelledby="recent-observations-h" className="mt-8 rounded border border-[color:var(--hairline)] p-5 text-sm text-[color:var(--bone2)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="recent-observations-h" className="font-medium text-[color:var(--bone)]">2026 observations</h3>
        <span className="rounded border border-[color:var(--hairline)] px-2 py-1 text-xs">Provisional</span>
      </div>
      <p className="mt-3">{snapshot.detections.toLocaleString('en-US')} daytime detections across Brazil’s six biomes, {span(snapshot.date_min, snapshot.date_max)}. Not part of the calendar above.</p>
      <details className="mt-3">
        <summary className="cursor-pointer rounded text-[color:var(--bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Sources and limits</summary>
        <p className="mt-2">A saved seven-day NASA FIRMS near-real-time snapshot (MODIS, NOAA-20, NOAA-21), retrieved {snapshot.retrieved_at.slice(0, 10)}. Detections, not distinct fires; missing dates are unknown, not zero; may be revised.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {snapshot.sources.map(source => <li key={source.sensor}><a className="underline underline-offset-4" href={source.url} target="_blank" rel="noreferrer">NASA {source.sensor.toUpperCase()} rolling seven-day CSV</a> · {source.versions.join(', ')}</li>)}
        </ul>
      </details>
    </aside>
  )
}
