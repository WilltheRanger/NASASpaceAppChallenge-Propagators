import { useEffect, useRef, useState } from 'react'
import { loadFireContext, type DetectionLocation, type ContextResult } from './fire-context'

/** Keep key tied to the selected detection so navigation never shows another point's context. */
export function FireContext(props: DetectionLocation) {
  return <ContextPanel key={`${props.lon},${props.lat},${props.observedAt}`} {...props} />
}
function ContextPanel(location: DetectionLocation) {
  const [result, setResult] = useState<ContextResult | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])
  async function load() {
    if (active.current) return
    const controller = new AbortController()
    active.current = controller
    setState('loading')
    try {
      const data = await loadFireContext(location, controller.signal)
      if (!controller.signal.aborted) { setResult(data); setState('ready') }
    } catch { if (!controller.signal.aborted) setState('error') }
    finally { if (active.current === controller) active.current = null }
  }
  return <section aria-label="Nearby source reports" style={{ marginTop: 16, borderTop: '1px solid currentColor', paddingTop: 12 }}>
    <h3>Nearby source reports</h3>
    <p>Look for NASA EONET wildfire reports within 100 km and 7 days of this detection. Nearby does not mean the same fire.</p>
    {(state === 'idle' || state === 'error') && <button type="button" onClick={load}>{state === 'error' ? 'Try again' : 'Find source reports'}</button>}
    <div aria-live="polite">
      {state === 'loading' && <p>Checking NASA EONET…</p>}
      {state === 'error' && <p>Source reports are unavailable right now. The satellite detection is unchanged.</p>}
      {state === 'ready' && result && <>
        {!result.events.length && <p>No nearby point reports found in this search. This does not mean there was no fire.</p>}
        {result.events.map(e => <article key={e.id} style={{ marginTop: 12 }}>
          <h4>{e.title}</h4>
          <p>{e.distanceKm.toFixed(0)} km to reported point · Record date {e.geometryDate.slice(0, 10)} UTC</p>
          {e.description && <p>{e.description}</p>}
          <a href={e.url} target="_blank" rel="noopener noreferrer">NASA EONET record</a>
          {e.sources.map((s, i) => <span key={`${s.url}-${i}`}> · <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a></span>)}
        </article>)}
        {result.nearbyCount > 3 && <p>Showing the 3 nearest of {result.nearbyCount} qualifying reports.</p>}
        {result.capped && <p>The search reached its 500-record limit; results may be incomplete.</p>}
        <p>Retrieved {result.fetchedAt.replace('T', ' ').slice(0, 16)} UTC. EONET is a curated, incomplete source with approximate locations and dates; polygon records are not matched here. Reports may postdate the detection. This is context, not verified incident identity, current conditions, or emergency guidance.</p>
      </>}
    </div>
  </section>
}
