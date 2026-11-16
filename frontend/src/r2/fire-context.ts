/** Optional, source-backed context. Proximity is NOT incident identification. */
export type DetectionLocation = { lon: number; lat: number; observedAt: string }
export type NearbyEvent = { id: string; title: string; description: string; distanceKm: number; geometryDate: string; sources: { name: string; url: string }[]; url: string }
export const CONTEXT_RADIUS_KM = 100
export const CONTEXT_DAYS = 7
const DAY = 86400000
const LIMIT = 500
const record = (x: unknown): Record<string, unknown> => x !== null && typeof x === 'object' ? x as Record<string, unknown> : {}
const text = (x: unknown, max: number) => typeof x === 'string' ? x.slice(0, max) : ''
export function safeSourceUrl(value: unknown): string | null {
  try { const u = new URL(String(value)); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null } catch { return null }
}
function validate(d: DetectionLocation) {
  if (!Number.isFinite(d.lon) || Math.abs(d.lon) > 180 || !Number.isFinite(d.lat) || Math.abs(d.lat) > 90 || !Number.isFinite(Date.parse(d.observedAt))) throw new Error('Invalid detection location or time')
}
export function contextUrl(d: DetectionLocation) {
  validate(d)
  const t = Date.parse(d.observedAt)
  const params = new URLSearchParams({ category: 'wildfires', status: 'all', start: new Date(t - CONTEXT_DAYS * DAY).toISOString().slice(0, 10), end: new Date(t + CONTEXT_DAYS * DAY).toISOString().slice(0, 10), limit: String(LIMIT) })
  return `https://eonet.gsfc.nasa.gov/api/v3/events?${params}`
}
/** Haversine handles poles and the date line; distances are to reported points, not perimeters. */
export function distanceKm(lon: number, lat: number, lon2: number, lat2: number) {
  const r = Math.PI / 180
  const a = Math.sin((lat2-lat)*r/2)**2 + Math.cos(lat*r)*Math.cos(lat2*r)*Math.sin((lon2-lon)*r/2)**2
  return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))))
}
export function selectNearbyEvents(payload: unknown, d: DetectionLocation) {
  validate(d)
  const rows = record(payload).events
  if (!Array.isArray(rows)) throw new Error('Invalid EONET response')
  const selected: NearbyEvent[] = []
  const seen = new Set<string>()
  for (const raw of rows.slice(0, LIMIT)) {
    const e = record(raw), id = text(e.id, 120)
    if (!id || seen.has(id) || !Array.isArray(e.categories) || !e.categories.some(c => record(c).id === 'wildfires')) continue
    if (!Array.isArray(e.geometry)) continue
    let closest: { distanceKm: number; geometryDate: string } | null = null
    for (const rawGeometry of e.geometry) {
      const g = record(rawGeometry), c = g.coordinates
      const date = text(g.date, 80), t = Date.parse(date)
      // Polygon centroids/bounds would imply a precision we do not have. Exclude them explicitly.
      if (g.type !== 'Point' || !Array.isArray(c) || c.length < 2 || typeof c[0] !== 'number' || typeof c[1] !== 'number' || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90 || !Number.isFinite(t) || Math.abs(t-Date.parse(d.observedAt)) > CONTEXT_DAYS*DAY) continue
      const km = distanceKm(d.lon, d.lat, c[0], c[1])
      if (km <= CONTEXT_RADIUS_KM && (!closest || km < closest.distanceKm)) closest = { distanceKm: km, geometryDate: new Date(t).toISOString() }
    }
    if (!closest) continue
    const sources = Array.isArray(e.sources) ? e.sources.flatMap(rawSource => {
      const s = record(rawSource), url = safeSourceUrl(s.url)
      return url ? [{ name: text(s.id, 80) || 'Source report', url }] : []
    }).slice(0, 5) : []
    seen.add(id)
    selected.push({ id, title: text(e.title, 200) || 'Unnamed EONET event', description: text(e.description, 1000), ...closest, sources, url: `https://eonet.gsfc.nasa.gov/api/v3/events/${encodeURIComponent(id)}` })
  }
  selected.sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id))
  return { events: selected.slice(0, 3), nearbyCount: selected.length, capped: rows.length >= LIMIT }
}
export type ContextResult = ReturnType<typeof selectNearbyEvents> & { fetchedAt: string }
const cache = new Map<string, { data: unknown; fetchedAt: string; expires: number }>()
/** User-triggered only. No key, account, model call, auto-refresh, or article scraping. */
export async function loadFireContext(d: DetectionLocation, signal?: AbortSignal): Promise<ContextResult> {
  const url = contextUrl(d), cached = cache.get(url)
  if (cached && cached.expires > Date.now()) return { ...selectNearbyEvents(cached.data, d), fetchedAt: cached.fetchedAt }
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 8000)
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`EONET unavailable (${response.status})`)
    const data: unknown = await response.json()
    const result = selectNearbyEvents(data, d), fetchedAt = new Date().toISOString()
    if (cache.size >= 6) cache.delete(cache.keys().next().value!)
    cache.set(url, { data, fetchedAt, expires: Date.now() + 600000 })
    return { ...result, fetchedAt }
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
}
