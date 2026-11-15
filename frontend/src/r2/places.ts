// Places the Simulator can fly to: the six studied regions, named fire areas, every country, typed coordinates, and
// (on the live site) any other place through OpenStreetMap's Nominatim search.
// Countries: mledoze/countries via the world-countries package (ODbL); coordinates here are for navigation only.
import countriesJson from './countries.json'
import { REGIONS } from './data'

export type Place = {
  id: string
  name: string
  /** what kind of place, shown under the name */
  kind: 'Studied region' | 'Fire area' | 'Country' | 'Coordinates' | 'Place'
  lon: number
  lat: number
  /** about how many degrees across to show it */
  span: number
  /** the studied region this place is, when it is one */
  region?: string
  /** the country's ISO code, when it is a country */
  iso?: string
}

const STUDIED_ALIASES: Record<string, string[]> = {
  'br-amazon': ['Amazon', 'Amazonia', 'Amazon rainforest'],
  'br-cerrado': ['Cerrado', 'Tocantins'],
  'br-pantanal': ['Pantanal'],
  'ar-argentina': ['Argentina', 'Gran Chaco'],
  'in-punjab-haryana': ['Punjab', 'Haryana', 'Punjab + Haryana'],
  'us-california': ['California'],
}

/** Big fire areas outside the studied regions, for flying to (centres approximate). */
const FIRE_AREAS: [string, number, number, number][] = [
  ['Southern Africa savanna', 24, -12, 22], ['Northern Africa savanna', 22, 8, 26], ['Congo Basin', 22, -1, 14],
  ['Sahel', 2, 14, 30], ['Northern Australia', 133, -17, 26], ['Kimberley', 126, -17, 8], ['Cape York', 143, -14, 8],
  ['Siberia', 105, 62, 40], ['Yakutia', 125, 64, 20], ['Borneo', 114, 0.8, 12], ['Kalimantan', 114, -0.5, 10],
  ['Sumatra', 101.5, -0.5, 12], ['Mainland Southeast Asia', 101, 18, 18], ['Canada boreal forest', -105, 57, 40],
  ['Alberta', -115, 55, 12], ['British Columbia', -125, 54, 14], ['Quebec', -72, 52, 16], ['Mato Grosso', -56, -13, 12],
  ['Pará', -52.5, -4, 12], ['Rondônia', -63, -11, 8], ['Mediterranean Europe', 12, 40, 30], ['Kazakhstan steppe', 67, 49, 24],
]

/** every letter of `q` appears in `text`, in order ("brzl" finds Brazil) */
const subsequence = (text: string, q: string) => { let j = 0; for (let i = 0; i < text.length && j < q.length; i++) if (text[i] === q[j]) j++; return j === q.length }

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const studied: Place[] = REGIONS.map((r) => {
  const [w, s, e, n] = r.bbox
  return { id: r.id, name: r.name, kind: 'Studied region', lon: (w + e) / 2, lat: (s + n) / 2, span: Math.max(e - w, n - s), region: r.id }
})
const countries: Place[] = (countriesJson as [string, number, number, number, string][]).map(([name, lat, lon, area, iso]) => ({
  id: `c-${iso}`, name, kind: 'Country', lon, lat, iso, span: Math.max(3, Math.min(60, Math.sqrt(Math.max(1, area)) / 90)),
}))
const fireAreas: Place[] = FIRE_AREAS.map(([name, lon, lat, span]) => ({ id: `f-${fold(name).replace(/\W+/g, '-')}`, name, kind: 'Fire area', lon, lat, span }))

const INDEX: { key: string; place: Place; rank: number }[] = [
  ...studied.flatMap((p) => [p.name, ...(STUDIED_ALIASES[p.id] ?? [])].map((k) => ({ key: fold(k), place: p, rank: 0 }))),
  ...fireAreas.map((p) => ({ key: fold(p.name), place: p, rank: 1 })),
  ...countries.map((p) => ({ key: fold(p.name), place: p, rank: 2 })),
]

export const STUDIED_PLACES = studied

/** "lat, lon" in decimal degrees, e.g. "-12.5, 24" */
export function parseCoords(q: string): Place | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(q)
  if (!m) return null
  const lat = Number(m[1]), lon = Number(m[2])
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { id: `xy-${lat},${lon}`, name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`, kind: 'Coordinates', lat, lon, span: 8 }
}

/** Matches for what has been typed: studied regions first, then fire areas, then countries; whole-word starts beat
 *  matches inside a word. */
export function searchPlaces(q: string, limit = 9): Place[] {
  const c = parseCoords(q)
  if (c) return [c]
  const f = fold(q)
  if (!f) return studied
  const seen = new Set<string>()
  const scored: { p: Place; s: number }[] = []
  for (const { key, place, rank } of INDEX) {
    let s = -1
    if (key === f) s = 0
    else if (key.startsWith(f)) s = 1
    else if (key.split(/[\s-]+/).some((w) => w.startsWith(f))) s = 2
    else if (f.length > 2 && key.includes(f)) s = 3
    else if (f.length > 2 && subsequence(key, f)) s = 4
    if (s < 0 || seen.has(place.id)) continue
    seen.add(place.id)
    scored.push({ p: place, s: s * 10 + rank })
  }
  return scored.sort((a, b) => a.s - b.s).slice(0, limit).map((x) => x.p)
}

/** Any other place, through OpenStreetMap's Nominatim (only on the live site: the comment page cannot reach it). */
export async function lookUpPlace(q: string, signal?: AbortSignal): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`
  const r = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!r.ok) return []
  const rows = (await r.json()) as { place_id: number; display_name: string; lat: string; lon: string; boundingbox?: string[] }[]
  return rows.map((x) => {
    const bb = x.boundingbox?.map(Number)
    const span = bb && bb.length === 4 ? Math.max(1, Math.min(40, Math.max(bb[1] - bb[0], bb[3] - bb[2]) * 1.6)) : 4
    return { id: `osm-${x.place_id}`, name: x.display_name.split(',').slice(0, 2).join(','), kind: 'Place', lat: Number(x.lat), lon: Number(x.lon), span }
  })
}

/** The studied region a point falls in, if any. */
export function regionAt(lon: number, lat: number) {
  return REGIONS.find((r) => lon >= r.bbox[0] && lon <= r.bbox[2] && lat >= r.bbox[1] && lat <= r.bbox[3])?.id ?? null
}

/** A place from its id (as kept in the URL): a studied region, a fire area, a country, or "xy-lat,lon". */
export function placeById(id: string): Place | null {
  if (id.startsWith('xy-')) return parseCoords(id.slice(3))
  return studied.find((p) => p.id === id) ?? fireAreas.find((p) => p.id === id) ?? countries.find((p) => p.id === id) ?? null
}

/** Studied regions inside a country (by ISO code). */
export const STUDIED_IN: Record<string, string[]> = {
  BRA: ['br-amazon', 'br-cerrado', 'br-pantanal'], ARG: ['ar-argentina'], IND: ['in-punjab-haryana'], USA: ['us-california'],
}

/** Great-circle distance in km. */
export function kmBetween(a: { lon: number; lat: number }, b: { lon: number; lat: number }) {
  const r = Math.PI / 180
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
