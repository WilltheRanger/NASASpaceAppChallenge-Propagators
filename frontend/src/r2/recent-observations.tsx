import snapshot from '../../../analysis/nrt-2026/out/provenance.json'

/** A separate observational snapshot, never an input to the historical calibrated calendar. */
export function RecentObservations() {
  return (
    <aside aria-labelledby="recent-observations-h" className="mt-8 rounded border border-[color:var(--hairline)] p-5 text-sm text-[color:var(--bone2)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="recent-observations-h" className="font-medium text-[color:var(--bone)]">2026 observations</h3>
        <span className="rounded border border-[color:var(--hairline)] px-2 py-1 text-xs">Provisional · incomplete coverage</span>
      </div>
      <p className="mt-3">{snapshot.detections.toLocaleString('en-US')} daytime detections across Brazil’s six biomes, {snapshot.date_min} to {snapshot.date_max}. Not part of the calendar above.</p>
      <details className="mt-3">
        <summary className="cursor-pointer rounded text-[color:var(--bone)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Coverage, limitations and sources</summary>
        <p className="mt-2">A saved seven-day NASA FIRMS snapshot: not the full year or a complete month. Missing dates are unknown, not zero. These are detections, not a count of distinct fires or of this region alone.</p>
        <p className="mt-2">MODIS, NOAA-20 and NOAA-21 near-real-time products only. S-NPP is absent from this feed listing; NOAA counts are not a replacement. The feeds lack fire-type classifications, so these are all daytime detections, not verified vegetation fires.</p>
        <p className="mt-2">Snapshot retrieved {snapshot.retrieved_at.slice(0, 10)} (UTC). Not a live feed; preliminary observations may be revised.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {snapshot.sources.map(source => <li key={source.sensor}><a className="underline underline-offset-4" href={source.url} target="_blank" rel="noreferrer">NASA {source.sensor.toUpperCase()} rolling seven-day CSV</a> · {source.versions.join(', ')}</li>)}
        </ul>
        <p className="mt-2 text-xs">Source links are rolling feeds and may now differ from the saved snapshot. Its source hashes and coverage are recorded in the analysis provenance.</p>
      </details>
    </aside>
  )
}
