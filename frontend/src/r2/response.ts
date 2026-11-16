// One real fire day (data/out/sim/amazon-2024-09-02.json): the fires NASA FIRMS detected in daytime on 2 Sep 2024 in a
// box of Pará, Brazil (detections in touching 0.05° cells make one fire), which satellites saw each one, when each
// satellite's pass over the box ended,
// and sunset there. Only those real fields are read (named imports, so the file's other fields stay out of the build).
// The alert delay is NASA's published range for FIRMS data: none is the best case, MODIS averages 60 to 125 minutes,
// and three hours is the bound NASA states. Alert time = pass end + delay; daylight left = sunset − alert time.
import { box, day, fires, pass_end_lst, sunset_lst } from '../../../data/out/sim/amazon-2024-09-02.json'

/** the four satellites that passed that day, in the order they passed */
export const SOURCES = ['Terra', 'S-NPP', 'NOAA-20', 'Aqua'] as const
export type Source = (typeof SOURCES)[number]
/** hours between the pass and its alert */
export type Delay = number
type Fire = { id: number; lat: number; lon: number; frp: number; n: number; seen_by: string[]; t_Terra: number | null; t_VIIRS: number | null; t_Aqua: number | null }

export const DAY = day as string
export const BOX = box as unknown as readonly [number, number, number, number]
export const SUNSET = sunset_lst as number
/** when each satellite's pass over the box ended (local solar time, hours): the alert with no delay */
export const PASS_END: Record<Source, number> = { Terra: pass_end_lst.Terra, 'S-NPP': pass_end_lst['S-NPP'], 'NOAA-20': pass_end_lst['NOAA-20'], Aqua: pass_end_lst.Aqua }
export const FIRES = fires as unknown as Fire[]

/** one pass as the alert: when the alert arrives, the daylight left then, and how many of the day's fires that pass saw */
export function run(src: Source, delay: Delay) {
  const alert = PASS_END[src] + delay
  return { alert, daylight: SUNSET - alert, seen: FIRES.filter((f) => f.seen_by.includes(src)).length, total: FIRES.length }
}

/** the map's layer for one pass: every fire of the day, marked seen by this satellite or not */
export function scene(src: Source): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: FIRES.map((f) => ({
      type: 'Feature',
      properties: { id: f.id, frp: f.frp, seen: f.seen_by.includes(src) },
      geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
    })),
  }
}
