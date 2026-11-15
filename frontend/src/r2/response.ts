// One fire day with a made-up response (analysis/simulation/response_sim.py → data/out/sim/amazon-2024-09-02.json).
// Real: the fires NASA FIRMS detected in daytime on 2 Sep 2024 in a box of Pará, Brazil (detections in touching 0.05°
// cells make one fire), and when each satellite passed. Made up: the three bases, the two helicopters and five ground
// crews, how fast they move, and the alert delay. The page labels which is which.
import SIM from '../../../data/out/sim/amazon-2024-09-02.json'

export type Source = 'Terra' | 'VIIRS' | 'Aqua'
export type Delay = 0 | 3
type Trip = { unit: string; fire: number; alert: number; depart: number; arrive: number; leave: number; from_: number[]; km: number; back?: number }
type Run = { satellites: string[]; summary: { fires_alerted: number; fires_reached: number; helicopter_sorties: number; first_alert: number; daylight_left_at_first_alert_h: number; median_alert_to_arrival_h: number }; trips: Trip[] }
type Fire = { id: number; lat: number; lon: number; frp: number; n: number; seen_by: string[]; t_Terra: number | null; t_VIIRS: number | null; t_Aqua: number | null }

export const DAY = SIM.day as string
export const BOX = SIM.box as unknown as readonly [number, number, number, number]
export const SUNSET = SIM.sunset_lst as number
/** when each satellite's pass over the box ended (local solar time, hours): the alert with no delay */
export const PASS_END: Record<Source, number> = { Terra: SIM.pass_end_lst.Terra, VIIRS: SIM.pass_end_lst['S-NPP'], Aqua: SIM.pass_end_lst.Aqua }
export const BASES = SIM.assumptions.bases as { name: string; lat: number; lon: number }[]
const UNITS = SIM.assumptions.units as { id: string; kind: 'helicopter' | 'ground'; base: string }[]
export const FLEET = { helicopters: UNITS.filter((u) => u.kind === 'helicopter').length, crews: UNITS.filter((u) => u.kind === 'ground').length }
export const FIRES = SIM.fires as unknown as Fire[]
const RUNS = SIM.runs as unknown as Record<string, Record<string, Run>>

export const run = (src: Source, delay: Delay) => RUNS[String(delay)][src]
const kindOf = (unit: string) => UNITS.find((u) => u.id === unit)?.kind ?? (unit.startsWith('H') ? 'helicopter' : 'ground')

/** the map's layers for one run: every fire (seen by this satellite or not, reached or not) and each trip's line */
export function scene(src: Source, delay: Delay) {
  const r = run(src, delay)
  const reached = new Set(r.trips.map((t) => t.fire))
  const fires: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: FIRES.map((f) => ({
      type: 'Feature',
      properties: { id: f.id, frp: f.frp, seen: f[`t_${src}`] != null, reached: reached.has(f.id) },
      geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
    })),
  }
  const byId = new Map(FIRES.map((f) => [f.id, f]))
  const trips: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: r.trips.flatMap((t) => {
      const f = byId.get(t.fire)
      if (!f) return []
      // from_ is [lat, lon]
      return [{ type: 'Feature' as const, properties: { kind: kindOf(t.unit), unit: t.unit }, geometry: { type: 'LineString' as const, coordinates: [[t.from_[1], t.from_[0]], [f.lon, f.lat]] } }]
    }),
  }
  return { fires, trips }
}
