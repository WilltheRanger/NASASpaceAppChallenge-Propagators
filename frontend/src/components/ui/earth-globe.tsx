/**
 * The Explore map: NASA Blue Marble as a flat web-mercator map (MapLibre GL) that pans around the world like any web
 * map. (It was a 3D globe that unrolled; the file and component keep that name.) On it: the past day's NASA FIRMS
 * daytime fire detections, which can be clicked; the six studied regions, framed by white corner brackets; a faint grid.
 *
 * Fire marks. Far out, every detection is one small dot of a fixed size in its satellite's mark (Aqua an amber dot,
 * VIIRS a green diamond, Terra a blue ring), so the map shows where fire clusters as well as the strongest fires.
 * Up close on the live site the dots hand over to squares: every detection drawn at the size of the ground it covers
 * (FIRMS's scan and track footprint), so neighbouring squares join into the ground that was burning. Heat (fire
 * radiative power) is how solid a mark is, at every zoom.
 *
 * Optionally the world's 2-degree squares, coloured by how far Aqua's count sits from what we'd expect: they show far
 * out and fade as the map closes in, where the fires take over.
 *
 * Imagery: the comment page carries Blue Marble pictures of its own (no network); the live site also streams NASA GIBS
 * Blue Marble and Sentinel-2 cloudless close up.
 */
import * as React from 'react'
import { createPortal } from 'react-dom'
import { Map as MLMap, Marker, addProtocol, setWorkerUrl, type GeoJSONSource, type ImageSource, type MapGeoJSONFeature, type StyleSpecification } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { FRP, LAT, LON, MIN, N, SAT, holdDetection } from '@/r2/fires'
import TILES from '@/r2/earth/tiles.json'

setWorkerUrl(workerUrl)

export type Box = readonly [number, number, number, number]
export type EarthRegion = { id: string; name: string; bbox: Box }
/** where to fly: a box to fit, optionally no closer than `maxZoom` (the comment page's own imagery is soft up close) */
export type EarthTarget = { key: string; bbox: Box; maxZoom?: number } | null
export type EarthOverlay = { src: string; bbox: Box } | null
export type EarthPadding = { top: number; right: number; bottom: number; left: number }
export type EarthHandle = {
  zoomBy: (d: number) => void
  home: () => void
  /** pan just enough that a point has `top` px of room above it, `side` px either side and, when given, `bottom` px
   *  below it (for a card drawn over or under it) */
  reveal: (lon: number, lat: number, room: { top: number; side: number; bottom?: number }) => void
  /** the room, in px, between a point and the top and bottom of the clear stage (inside the panels' padding) */
  room: (lon: number, lat: number) => { above: number; below: number } | null
}
export type Show = { terra: boolean; aqua: boolean; viirs: boolean }
/** React content drawn at a point on the map (the selected fire's card, a searched place's reticle) */
/** a card drawn on the map: above its point (anchor bottom), below it (anchor top), or centred on it */
export type Callout = { key: string; lon: number; lat: number; anchor: 'center' | 'bottom' | 'top'; content: React.ReactNode } | null

export interface EarthGlobeProps {
  regions: EarthRegion[]
  selected: string | null
  target: EarthTarget
  /** sharper imagery around the selected region (shown from the moment it is picked) */
  context?: EarthOverlay
  show: Show
  /** the clicked detection (an index into src/r2/fires), and the other satellites' sightings of the same spot */
  fire: number | null
  near: number[]
  callouts: Callout[]
  /** a scene drawn over the map instead of the day's fires: one real fire day's fires, seen by one satellite or not */
  scene?: GeoJSON.FeatureCollection | null
  /** the world's 2-degree squares (polygons with id, ok, c = colour, o = strength); null hides them. A single square
   *  is drawn as an outline only and leaves the fires and clicks as they are. */
  cells?: GeoJSON.FeatureCollection | null
  /** the picked square's id */
  cell?: string | null
  /** where the panels sit, so a place lands in the clear middle */
  padding: EarthPadding
  /** the Blue Marble image the comment page cuts into tiles */
  baseSrc: string
  /** the folder of sharper Blue Marble pictures (scripts/earth-tiles.py) for a page that can't reach a tile server */
  tilesSrc?: string
  /** every detection with its ground footprint (scripts/fire-squares.py), fetched once the live map zooms close */
  squaresSrc?: string
  /** stream NASA GIBS and Sentinel-2 tiles too (the live site; the comment page cannot reach them) */
  live: boolean
  motion: boolean
  onArrive?: (key: string) => void
  onPick?: (id: string) => void
  onFire?: (i: number | null) => void
  onCell?: (id: string) => void
  /** the square under the pointer, or null */
  onCellHover?: (id: string | null) => void
  /** the map's view, when it comes to rest: [west, south, east, north], and its zoom */
  onRest?: (b: Box, zoom: number) => void
  /** the patch of map under the pointer (a square `r` px either side of it, as a box, with where it is on the stage),
   *  or null when the pointer leaves or the map is being dragged. Called at most once a frame. */
  onProbe?: (p: { box: Box; x: number; y: number; r: number } | null) => void
  onFail?: () => void
  className?: string
}

const GIBS_BM = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'
/** close-up imagery on the live site: Sentinel-2 cloudless 2016 by EOX (s2maps.eu), CC BY 4.0 */
const S2 = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'
/** the satellite colours, as the site's tokens set them (MapLibre paint needs literal colours) */
const AQUA = '#C8801F', TERRA = '#448BCB', VIIRS = '#49A46E', BONE = '#ECE9E1', GROUND = '#0B0D0B'
/** a picked square: its satellite's colour at full strength, edged in a light tint of the same colour */
const PICK_FILL = ['match', ['get', 'g'], 0, '#3D93E3', 1, '#EE9420', '#3CBF73'] as never
const PICK_EDGE = ['match', ['get', 'g'], 0, '#B5DAFB', 1, '#FFD596', '#B0EFC6'] as never
const NONE = { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection
const FIRE_LAYERS = ['fire-viirs-dot', 'fire-viirs', 'fire-terra', 'fire-aqua'] as const
/** VIIRS draws as plain dots below this zoom and as its diamond above it. Symbols are placed on the screen a few times
 *  a second, so on a turning globe they lag behind it and show through its edge; dots are drawn on the globe itself. */
const VIIRS_MARK_FROM = 5.2
/** half the side of the square the pointer reads, in px */
const PROBE = 64
/** the squares show below this zoom; the fires take over above it */
const CELLS_GONE = 6.5

/** the fire points as GeoJSON, once: g = 0 Terra, 1 Aqua, 2 VIIRS; f = the heat it gave off (fire radiative power, MW) */
let firesGeo: GeoJSON.FeatureCollection | null = null
function fireFeatures() {
  if (firesGeo) return firesGeo
  const features: GeoJSON.Feature[] = new Array(N)
  for (let i = 0; i < N; i++) features[i] = { type: 'Feature', properties: { i, g: SAT[i] >= 2 ? 2 : SAT[i], f: FRP[i] }, geometry: { type: 'Point', coordinates: [LON[i], LAT[i]] } }
  firesGeo = { type: 'FeatureCollection', features }
  return firesGeo
}

/** a faint graticule every 15 degrees */
const GRID: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    ...Array.from({ length: 24 }, (_, i) => -180 + i * 15).map((lon) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: Array.from({ length: 35 }, (_, k) => [lon, -85 + k * 5]) } })),
    ...Array.from({ length: 11 }, (_, i) => -75 + i * 15).map((lat) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: Array.from({ length: 73 }, (_, k) => [-180 + k * 5, lat]) } })),
  ],
}

/** VIIRS's mark: a diamond, as on the Region page (MapLibre circles can't draw one, so it's an icon) */
function diamond(px: number, fill: string, stroke: string) {
  const c = document.createElement('canvas')
  c.width = c.height = px
  const g = c.getContext('2d')
  if (!g) return null
  const h = px / 2, r = h - px / 16
  g.beginPath()
  g.moveTo(h, h - r); g.lineTo(h + r, h); g.lineTo(h, h + r); g.lineTo(h - r, h)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.lineWidth = px / 16
  g.strokeStyle = stroke
  g.stroke()
  return g.getImageData(0, 0, px, px)
}

/** the zoom at which the whole world spans the stage (a tall phone stage fits most of its height instead) */
const homeZoom = (w: number, h: number) => Math.log2(Math.max(w, h * 0.85) / 512)
/** where the whole-world view is centred */
const HOME: [number, number] = [0, 18]
const mercY = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2
/** the whole-world view. The world spans the stage's width; where a panel hides part of the stage's height (the phone's
 *  sheet), HOME sits in the middle of the clear part and the map closes in just far enough to still cover the stage */
function homeCam(w: number, h: number, p: EarthPadding) {
  const ch = Math.max(1, h - p.top - p.bottom)
  const cy = p.top + ch / 2, my = mercY(HOME[1])
  const world = Math.max(512 * 2 ** homeZoom(w, ch), cy / my, (h - cy) / (1 - my))
  return { center: HOME, zoom: Math.log2(world / 512), padding: { top: p.top, bottom: p.bottom, left: 0, right: 0 } }
}
/** the zoom and centre that fit a box inside the padded stage, as a flat map */
function fit(b: Box, w: number, h: number, p: EarthPadding) {
  const aw = Math.max(80, w - p.left - p.right), ah = Math.max(80, h - p.top - p.bottom)
  const dx = (b[2] - b[0]) / 360, dy = Math.abs(mercY(b[1]) - mercY(b[3]))
  const zoom = Math.log2(Math.min(aw / (dx * 512), ah / (Math.max(dy, 1e-6) * 512))) - 0.08
  const my = (mercY(b[1]) + mercY(b[3])) / 2
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * my))) * 180) / Math.PI
  return { zoom: Math.min(9, zoom), center: [(b[0] + b[2]) / 2, lat] as [number, number] }
}

/** the comment page's Blue Marble: one image, cut into 256 px tiles for zooms 0 to 4 */
let baseImage: Promise<ImageBitmap | HTMLImageElement> | null = null
let protocolOn = false
function useBaseProtocol(src: string) {
  if (protocolOn) return
  protocolOn = true
  const load = () =>
    (baseImage ??= new Promise((resolve, reject) => {
      const im = new Image()
      im.decoding = 'async'
      im.onload = () => { (typeof createImageBitmap === 'function' ? createImageBitmap(im) : Promise.resolve(im)).then(resolve, () => resolve(im)) }
      im.onerror = () => { baseImage = null; reject(new Error('Blue Marble image did not load')) }
      im.src = src
    }))
  addProtocol('anchor-earth', async (params) => {
    const m = /anchor-earth:\/\/(\d+)\/(\d+)\/(\d+)/.exec(params.url)
    if (!m) throw new Error('bad tile')
    const z = Number(m[1]), x = Number(m[2]), y = Number(m[3])
    const img = await load()
    const full = 'naturalWidth' in img ? img.naturalWidth : img.width
    const size = full / 2 ** z
    const c: OffscreenCanvas | HTMLCanvasElement = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(256, 256)
      : Object.assign(document.createElement('canvas'), { width: 256, height: 256 })
    const g = c.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (!g) throw new Error('no 2d context')
    g.imageSmoothingQuality = 'high'
    g.drawImage(img, x * size, y * size, size, size, 0, 0, 256, 256)
    return { data: await createImageBitmap(c) }
  })
}

/** Sharper Blue Marble for a page that can't reach a tile server (scripts/earth-tiles.py writes the pictures). Each
 *  picture is 2048 px: 8 x 8 tiles of one zoom, named by its square on a coarser grid. `w` covers the whole world at
 *  zoom 7; `f` covers, at zoom 8, every square that holds one of the day's fires. A tile of a lower zoom is the same
 *  picture drawn smaller. Pictures load when the map first needs them; the last few stay in memory. */
const FIRE_PICTURES = new Set<string>(TILES.fire.cells)
const pictures = new Map<string, Promise<ImageBitmap | HTMLImageElement>>()
const KEEP_PICTURES = 10
function picture(url: string) {
  const had = pictures.get(url)
  if (had) { pictures.delete(url); pictures.set(url, had); return had }
  const p = new Promise<ImageBitmap | HTMLImageElement>((resolve, reject) => {
    const im = new Image()
    im.decoding = 'async'
    im.onload = () => { (typeof createImageBitmap === 'function' ? createImageBitmap(im) : Promise.resolve(im)).then(resolve, () => resolve(im)) }
    im.onerror = () => { pictures.delete(url); reject(new Error('picture did not load')) }
    im.src = url
  })
  pictures.set(url, p)
  if (pictures.size > KEEP_PICTURES) pictures.delete(pictures.keys().next().value as string)
  return p
}
let tilesOn = false
function useTilesProtocol(dir: string) {
  if (tilesOn) return
  tilesOn = true
  addProtocol('anchor-tiles', async (params) => {
    const m = /anchor-tiles:\/\/(w|f)\/(\d+)\/(\d+)\/(\d+)/.exec(params.url)
    if (!m) throw new Error('bad tile')
    const kind = m[1] as 'w' | 'f', z = Number(m[2]), x = Number(m[3]), y = Number(m[4])
    const spec = kind === 'w' ? TILES.world : TILES.fire
    if (z > spec.z || z < spec.grid) throw new Error('no picture at this zoom')
    // the picture this tile falls in, and the tile's square inside it
    const per = 2 ** (z - spec.grid)
    const gx = Math.floor(x / per), gy = Math.floor(y / per)
    if (kind === 'f' && !FIRE_PICTURES.has(`${gx}-${gy}`)) throw new Error('no picture here')
    const img = await picture(`${dir}${kind}-${gx}-${gy}.webp`)
    const size = 2048 / per
    const c: OffscreenCanvas | HTMLCanvasElement = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(256, 256)
      : Object.assign(document.createElement('canvas'), { width: 256, height: 256 })
    const g = c.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (!g) throw new Error('no 2d context')
    g.imageSmoothingQuality = 'high'
    g.drawImage(img, (x - gx * per) * size, (y - gy * per) * size, size, size, 0, 0, 256, 256)
    return { data: await createImageBitmap(c) }
  })
}

/** How solid a detection draws: its heat (fire radiative power, MW) on the square root, from faint at 3 MW or less to
 *  solid at 150 MW or more. Size never carries heat: far out it is fixed, up close it is the ground covered. */
export const HEAT_FAINT = 3, HEAT_SOLID = 150
const BRIGHT = ['interpolate', ['linear'], ['sqrt', ['get', 'f']], Math.sqrt(HEAT_FAINT), 0.45, Math.sqrt(30), 0.8, Math.sqrt(HEAT_SOLID), 1]
/** the zooms over which the true-size squares fade in beneath the dots, once the squares have loaded: past about zoom
 *  11 a 375 m VIIRS square is wider than a dot, so the footprint shows around it. The dots stay on top at every zoom,
 *  so zooming in never makes a fire smaller or makes it disappear. */
const HAND0 = 11, HAND1 = 12
/** a dot's size in px, the same for every detection: `far` out to zoom 6, `near` by zoom 10, then a little larger
 *  close in so a dot stays easy to see and to click over sharp imagery */
const fixed = (far: number, near: number) => ['interpolate', ['linear'], ['zoom'], 6, far, 10, near, 14, near * 1.6] as never

/** Every detection as the rectangle of ground it covers: FIRMS's scan (across the satellite's path, drawn east-west)
 *  and track (along it, drawn north-south). The real pixel is tilted a few degrees along the orbit; FIRMS's file
 *  doesn't give the tilt, so the size is true and the angle is north-up. Rows: lon * 1e4, lat * 1e4, satellite, FRP,
 *  scan and track in units of 10 m, minutes after the file's start. k is the row. */
const SQ = 7
const halfLon = (pts: number[], k: number) => (pts[k * SQ + 4] * 5) / (111320 * Math.max(0.05, Math.cos((pts[k * SQ + 1] / 1e4 * Math.PI) / 180)))
const halfLat = (pts: number[], k: number) => (pts[k * SQ + 5] * 5) / 111320
function squareFeatures(pts: number[]): GeoJSON.FeatureCollection {
  const n = Math.floor(pts.length / SQ)
  const features: GeoJSON.Feature[] = new Array(n)
  for (let i = 0; i < n; i++) {
    const lon = pts[i * SQ] / 1e4, lat = pts[i * SQ + 1] / 1e4, sat = pts[i * SQ + 2]
    const hx = halfLon(pts, i), hy = halfLat(pts, i)
    features[i] = {
      type: 'Feature', properties: { k: i, g: sat >= 2 ? 2 : sat, f: pts[i * SQ + 3] },
      geometry: { type: 'Polygon', coordinates: [[[lon - hx, lat - hy], [lon + hx, lat - hy], [lon + hx, lat + hy], [lon - hx, lat + hy], [lon - hx, lat - hy]]] },
    }
  }
  return { type: 'FeatureCollection', features }
}
/** the square a dot stands for: the same satellite, minute and heat, nearest to the dot's rounded spot */
function squareOfDot(pts: number[], i: number) {
  const x = LON[i] * 1e4, y = LAT[i] * 1e4
  let best = -1, d = Infinity
  for (let k = 0, n = pts.length / SQ; k < n; k++) {
    const o = k * SQ
    if (pts[o + 2] !== SAT[i] || pts[o + 6] !== MIN[i] || pts[o + 3] !== Math.round(FRP[i])) continue
    const dd = Math.hypot(pts[o] - x, pts[o + 1] - y)
    if (dd < d && dd <= 80) { d = dd; best = k }
  }
  return best
}

/** the four corners of a box as short L-shaped strokes: a framing, not a boundary */
function brackets(b: Box) {
  const [w, s, e, n] = b
  const a = Math.min(e - w, n - s) * 0.22
  const L = (x: number, y: number, dx: number, dy: number) => [[x + dx, y], [x, y], [x, y + dy]]
  return [L(w, n, a, -a), L(e, n, -a, -a), L(e, s, -a, a), L(w, s, a, a)]
}
const ring = (b: Box) => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]

/** an image laid on its box as a raster layer, swapped when its source changes; decoded here, so no fetch is needed */
function useImageLayer(mapRef: React.MutableRefObject<MLMap | null>, ready: boolean, id: string, layer: EarthOverlay, before: string, motion: boolean) {
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (map.getLayer(id)) map.removeLayer(id)
    if (map.getSource(id)) map.removeSource(id)
    if (!layer) return
    let gone = false
    const im = new Image()
    im.decoding = 'async'
    im.onload = () => {
      if (gone || !mapRef.current || map.getSource(id)) return
      const [w, s, e, n] = layer.bbox
      const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [[w, n], [e, n], [e, s], [w, s]]
      map.addSource(id, { type: 'image', url: layer.src, coordinates })
      ;(map.getSource(id) as ImageSource).updateImage({ image: im, coordinates })
      map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': 0, 'raster-opacity-transition': { duration: motion ? 500 : 0, delay: 0 }, 'raster-fade-duration': 0 } }, before)
      requestAnimationFrame(() => { if (!gone && map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', 1) })
    }
    im.src = layer.src
    return () => { gone = true }
  }, [ready, layer?.src]) // eslint-disable-line react-hooks/exhaustive-deps
}

export const EarthGlobe = React.forwardRef<EarthHandle, EarthGlobeProps>(function EarthGlobe(props, handle) {
  const { regions, selected, target, context, show, fire, near, callouts, baseSrc, live, motion, className } = props
  const boxRef = React.useRef<HTMLDivElement | null>(null)
  const mapRef = React.useRef<MLMap | null>(null)
  const [ready, setReady] = React.useState(false)
  const squaresReady = React.useRef(false)
  /** every detection as the squares file gives it, once loaded */
  const squarePts = React.useRef<number[] | null>(null)
  const [squaresOn, setSquaresOn] = React.useState(false)
  /** the square last picked on the map, and the spare row that holds it */
  const picked = React.useRef<{ i: number; k: number } | null>(null)
  const cb = React.useRef(props)
  cb.current = props
  const motionRef = React.useRef(motion)
  motionRef.current = motion
  const flight = React.useRef(0)
  /** the camera is at the whole-world view and the reader hasn't moved it since */
  const atHome = React.useRef(false)
  const cellsOn = React.useRef(false)
  // one square alone is a picked square's outline at a place, not the world layer
  cellsOn.current = (props.cells?.features.length ?? 0) > 1

  // the map, once
  React.useEffect(() => {
    const el = boxRef.current
    if (!el) return
    useBaseProtocol(baseSrc)
    const bundled = !live && !!props.tilesSrc
    if (bundled) useTilesProtocol(props.tilesSrc as string)
    const w = el.clientWidth || 1200, h = el.clientHeight || 800
    const dot = (color: string, far: number, near: number) => ({ 'circle-color': color, 'circle-radius': fixed(far, near), 'circle-pitch-alignment': 'map', 'circle-stroke-color': GROUND, 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 2, 0, 5, 0.6] })
    const style: StyleSpecification = {
      version: 8,
      projection: { type: 'mercator' },
      sources: {
        base: { type: 'raster', tiles: ['anchor-earth://{z}/{x}/{y}'], tileSize: 256, maxzoom: 4 },
        ...(live ? {
          gibs: { type: 'raster' as const, tiles: [GIBS_BM], tileSize: 256, maxzoom: 8 },
          s2: { type: 'raster' as const, tiles: [S2], tileSize: 256, maxzoom: 14 },
        } : {}),
        // the comment page's own sharper pictures: the world at zoom 5, and zoom 6 to 8 where the day's fires are
        ...(bundled ? {
          world2x: { type: 'raster' as const, tiles: ['anchor-tiles://w/{z}/{x}/{y}'], tileSize: 256, minzoom: TILES.world.z - 2, maxzoom: TILES.world.z },
          sharp: { type: 'raster' as const, tiles: ['anchor-tiles://f/{z}/{x}/{y}'], tileSize: 256, minzoom: TILES.fire.z, maxzoom: TILES.fire.z },
        } : {}),
        grid: { type: 'geojson', data: GRID },
        regions: { type: 'geojson', data: NONE },
        frames: { type: 'geojson', data: NONE },
        fires: { type: 'geojson', data: NONE, buffer: 16, tolerance: 0 },
        squares: { type: 'geojson', data: NONE, tolerance: 0, buffer: 8 },
        'scene-fires': { type: 'geojson', data: NONE },
        cells: { type: 'geojson', data: NONE },
      },
      layers: [
        { id: 'ocean', type: 'background', paint: { 'background-color': '#0A1A2C' } },
        { id: 'base', type: 'raster', source: 'base', paint: { 'raster-fade-duration': 150 } },
        ...(live ? [{ id: 'gibs', type: 'raster' as const, source: 'gibs', minzoom: 3, paint: { 'raster-fade-duration': 250 } }] : []),
        ...(bundled ? [
          { id: 'world2x', type: 'raster' as const, source: 'world2x', paint: { 'raster-fade-duration': 150 } },
          { id: 'sharp', type: 'raster' as const, source: 'sharp', paint: { 'raster-fade-duration': 150 } },
        ] : []),
        { id: 'ctx-slot', type: 'background', layout: { visibility: 'none' } },
        ...(live ? [{ id: 's2', type: 'raster' as const, source: 's2', minzoom: 4.5, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 4.5, 0, 6, 1], 'raster-fade-duration': 250 } }] : []) as never[],
        { id: 'grid', type: 'line', source: 'grid', paint: { 'line-color': BONE, 'line-width': 0.6, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.09, 6, 0.05] } },
        // the 2-degree squares: filled where readable, a faint outline where there are too few fires; gone by zoom 6.5
        { id: 'cell-fill', type: 'fill', source: 'cells', filter: ['get', 'ok'], paint: { 'fill-color': ['get', 'c'], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, ['get', 'o'], CELLS_GONE, 0], 'fill-antialias': false } },
        { id: 'cell-thin', type: 'line', source: 'cells', filter: ['!', ['get', 'ok']], paint: { 'line-color': BONE, 'line-width': 0.6, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.07, 3, 0.13, 5, 0.13, CELLS_GONE, 0] } },
        { id: 'cell-hit', type: 'fill', source: 'cells', paint: { 'fill-color': '#000', 'fill-opacity': 0 } },
        { id: 'cell-sel', type: 'line', source: 'cells', filter: ['==', ['get', 'id'], ''], paint: { 'line-color': BONE, 'line-width': 2 } },
        { id: 'region-hit', type: 'fill', source: 'regions', paint: { 'fill-color': '#000', 'fill-opacity': 0 } },
        { id: 'region-edge', type: 'line', source: 'regions', paint: { 'line-color': BONE, 'line-opacity': ['case', ['get', 'on'], 0.6, 0.22], 'line-width': 1, 'line-dasharray': [2, 3] } },
        { id: 'frames', type: 'line', source: 'frames', layout: { 'line-cap': 'square', 'line-join': 'miter' }, paint: { 'line-color': BONE, 'line-width': ['case', ['get', 'on'], 2.5, 1.25], 'line-opacity': ['case', ['get', 'on'], 1, 0.7] } },
        // up close: every detection at the size of the ground it covers, in its satellite's colour; overlaps show through
        { id: 'squares', type: 'fill', source: 'squares', minzoom: HAND0 - 0.6, paint: { 'fill-color': ['match', ['get', 'g'], 0, TERRA, 1, AQUA, VIIRS], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], HAND0 - 0.4, 0, HAND1 - 0.2, ['*', 0.6, BRIGHT]], 'fill-antialias': true } as never },
        { id: 'squares-edge', type: 'line', source: 'squares', minzoom: HAND0 - 0.6, paint: { 'line-color': ['match', ['get', 'g'], 0, TERRA, 1, AQUA, VIIRS], 'line-width': 1, 'line-opacity': ['interpolate', ['linear'], ['zoom'], HAND0 - 0.4, 0, HAND1 - 0.2, 0.9] } as never },
        // the picked square, on top of its neighbours: solid colour and a strong light edge
        { id: 'squares-pick', type: 'fill', source: 'squares', minzoom: HAND0 - 0.6, filter: ['==', ['get', 'k'], -1], paint: { 'fill-color': PICK_FILL, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], HAND0 - 0.4, 0, HAND1 - 0.2, 1] } as never },
        { id: 'squares-pick-edge', type: 'line', source: 'squares', minzoom: HAND0 - 0.6, filter: ['==', ['get', 'k'], -1], layout: { 'line-join': 'miter' }, paint: { 'line-color': PICK_EDGE, 'line-width': 2.5, 'line-opacity': ['interpolate', ['linear'], ['zoom'], HAND0 - 0.4, 0, HAND1 - 0.2, 1] } as never },
        // VIIRS beneath (the most numerous), then Terra's rings, then Aqua on top: Aqua is the satellite the audit is about
        { id: 'fire-viirs-dot', type: 'circle', source: 'fires', maxzoom: VIIRS_MARK_FROM, filter: ['==', ['get', 'g'], 2], paint: dot(VIIRS, 2, 2) as never },
        {
          id: 'fire-viirs', type: 'symbol', source: 'fires', minzoom: VIIRS_MARK_FROM, filter: ['==', ['get', 'g'], 2],
          layout: { 'icon-image': 'viirs-mark', 'icon-size': fixed(0.34, 0.44), 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-padding': 0 },
        },
        {
          id: 'fire-terra', type: 'circle', source: 'fires', filter: ['==', ['get', 'g'], 0],
          paint: { 'circle-color': 'rgba(0, 0, 0, 0)', 'circle-stroke-color': TERRA, 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 1, 1, 6, 1.6], 'circle-radius': fixed(2.4, 3.2), 'circle-pitch-alignment': 'map' },
        },
        { id: 'fire-aqua', type: 'circle', source: 'fires', filter: ['==', ['get', 'g'], 1], paint: dot(AQUA, 2.2, 3) as never },
        // one real fire day: the fires this satellite missed (dim), then the ones it saw
        { id: 'scene-fire-dim', type: 'circle', source: 'scene-fires', filter: ['!', ['get', 'seen']], paint: { 'circle-color': '#8D8A84', 'circle-opacity': 0.75, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2, 9, 3.5], 'circle-stroke-color': GROUND, 'circle-stroke-width': 0.6 } },
        {
          id: 'scene-fire', type: 'circle', source: 'scene-fires', filter: ['get', 'seen'],
          paint: {
            'circle-color': BONE,
            'circle-stroke-color': BONE, 'circle-stroke-width': 1.6,
            'circle-radius': ['interpolate', ['linear'], ['sqrt', ['get', 'frp']], 0, 3.5, 30, 6.5, 80, 11],
          },
        },
        {
          id: 'fire-near', type: 'circle', source: 'fires', filter: ['in', ['get', 'i'], ['literal', []]],
          paint: { 'circle-color': 'rgba(0, 0, 0, 0)', 'circle-stroke-color': BONE, 'circle-stroke-width': 1.5, 'circle-radius': fixed(6, 8), 'circle-pitch-alignment': 'map' },
        },
        {
          id: 'fire-sel', type: 'circle', source: 'fires', filter: ['==', ['get', 'i'], -1],
          paint: { 'circle-color': 'rgba(0, 0, 0, 0)', 'circle-stroke-color': BONE, 'circle-stroke-width': 2.5, 'circle-radius': fixed(9, 12), 'circle-pitch-alignment': 'map' },
        },
      ],
    }
    let map: MLMap
    try {
      map = new MLMap({
        container: el, style, center: HOME, zoom: homeZoom(w, h), minZoom: Math.max(0, homeZoom(w, h) - 0.25), maxZoom: live ? 13 : 8.5,
        attributionControl: false, maplibreLogo: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, maxPitch: 0,
        renderWorldCopies: true, fadeDuration: 150, canvasContextAttributes: { antialias: false },
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      })
    } catch {
      cb.current.onFail?.()
      return
    }
    map.touchZoomRotate.disableRotation()
    mapRef.current = map
    // development only: a handle for scripted checks of the camera (stripped from production builds)
    if (import.meta.env.DEV) (window as unknown as { __anchorMap?: MLMap }).__anchorMap = map
    map.on('error', () => { /* a tile that fails stays blank; the base below shows through */ })
    map.on('load', () => {
      const mark = diamond(96, VIIRS, GROUND)
      if (mark && !map.hasImage('viirs-mark')) map.addImage('viirs-mark', mark, { pixelRatio: 6 })
      ;(map.getSource('fires') as GeoJSONSource | undefined)?.setData(fireFeatures())
      setReady(true)
    })
    map.on('webglcontextlost', () => cb.current.onFail?.())
    map.on('moveend', () => {
      const b = map.getBounds()
      cb.current.onRest?.([Math.max(-180, b.getWest()), Math.max(-85, b.getSouth()), Math.min(180, b.getEast()), Math.min(85, b.getNorth())], map.getZoom())
    })
    // a click picks the nearest fire within a few pixels, else a studied region, else clears the fire
    map.on('click', (e) => {
      // a click inside a card drawn on the map is the card's, not the map's
      if ((e.originalEvent?.target as HTMLElement | null)?.closest?.('.maplibregl-marker')) return
      const p = e.point
      // far out with the squares showing, a click picks the square; close in, the fires come first
      const cellAt = () => (cellsOn.current && map.getZoom() < CELLS_GONE ? map.queryRenderedFeatures(p, { layers: ['cell-hit'] })[0]?.properties?.id : null)
      if (map.getZoom() < 5) { const c = cellAt(); if (c) { cb.current.onCell?.(String(c)); return } }
      // up close, a click on a square picks that detection, exactly as the squares file gives it; where squares overlap,
      // the one whose middle is nearest the click
      const pts = squarePts.current
      if (pts && map.getZoom() >= HAND0) {
        const sq = map.queryRenderedFeatures(p, { layers: ['squares'] }) as MapGeoJSONFeature[]
        let k = -1, d = Infinity
        for (const f of sq) {
          const kk = Number(f.properties?.k)
          const q = map.project([pts[kk * SQ] / 1e4, pts[kk * SQ + 1] / 1e4])
          const dd = Math.hypot(q.x - p.x, q.y - p.y)
          if (dd < d) { d = dd; k = kk }
        }
        if (k >= 0) {
          const o = k * SQ
          const i = holdDetection({ lon: pts[o] / 1e4, lat: pts[o + 1] / 1e4, sat: pts[o + 2], frp: pts[o + 3], min: pts[o + 6], half: halfLat(pts, k) })
          picked.current = { i, k }
          cb.current.onFire?.(i)
          return
        }
      }
      const hits = map.queryRenderedFeatures([[p.x - 6, p.y - 6], [p.x + 6, p.y + 6]], { layers: FIRE_LAYERS.filter((l) => map.getLayoutProperty(l, 'visibility') !== 'none') as string[] }) as MapGeoJSONFeature[]
      if (hits.length) {
        let best = hits[0], d = Infinity
        for (const f of hits) {
          const c = (f.geometry as GeoJSON.Point).coordinates
          const q = map.project([c[0], c[1]])
          const dd = Math.hypot(q.x - p.x, q.y - p.y)
          if (dd < d) { d = dd; best = f }
        }
        cb.current.onFire?.(Number(best.properties?.i))
        return
      }
      const c = cellAt()
      if (c) { cb.current.onCell?.(String(c)); return }
      const r = map.queryRenderedFeatures(p, { layers: ['region-hit'] })[0]
      if (r?.properties?.id) { cb.current.onPick?.(String(r.properties.id)); return }
      cb.current.onFire?.(null)
    })
    let hovered: string | null = null
    const hover = (id: string | null) => { if (id !== hovered) { hovered = id; cb.current.onCellHover?.(id) } }
    map.on('mousemove', 'cell-hit', (e) => { hover(cellsOn.current && map.getZoom() < CELLS_GONE ? String(e.features?.[0]?.properties?.id ?? '') || null : null) })
    map.on('mouseleave', 'cell-hit', () => hover(null))
    // what lies under the pointer, for the chart: a square around it, read once a frame; not while the map is dragged
    let probeFrame = 0, probeAt: { x: number; y: number } | null = null, dragging = false
    const probe = () => {
      probeFrame = 0
      const at = probeAt
      if (!at || dragging) { cb.current.onProbe?.(null); return }
      const c = map.unproject([at.x, at.y]), e = map.unproject([at.x + PROBE, at.y]), n = map.unproject([at.x, at.y - PROBE])
      let dLon = Math.abs(e.lng - c.lng)
      if (dLon > 180) dLon = 360 - dLon
      const dLat = Math.abs(n.lat - c.lat)
      if (![c.lng, c.lat, dLon, dLat].every(Number.isFinite) || dLon <= 0 || dLat <= 0 || dLon > 60 || dLat > 60) { cb.current.onProbe?.(null); return }
      cb.current.onProbe?.({ box: [c.lng - dLon, c.lat - dLat, c.lng + dLon, c.lat + dLat], x: at.x, y: at.y, r: PROBE })
    }
    const askProbe = () => { if (!probeFrame) probeFrame = requestAnimationFrame(probe) }
    map.on('mousemove', (e) => { probeAt = { x: e.point.x, y: e.point.y }; askProbe() })
    map.on('mouseout', () => { probeAt = null; askProbe() })
    map.on('dragstart', () => { dragging = true; askProbe() })
    map.on('dragend', () => { dragging = false; askProbe() })
    map.on('zoom', askProbe)
    for (const l of [...FIRE_LAYERS, 'squares', 'region-hit', 'cell-hit']) {
      map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', l, () => { map.getCanvas().style.cursor = '' })
    }
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(el)
    return () => { cancelAnimationFrame(probeFrame); ro.disconnect(); map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // regions: a dashed box (click target) and white corner brackets, the selected one at full strength
  const regionKey = `${selected}`
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('regions') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: regions.map((r) => ({ type: 'Feature', properties: { id: r.id, on: r.id === selected }, geometry: { type: 'Polygon', coordinates: [ring(r.bbox)] } })),
    })
    ;(map.getSource('frames') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: regions.map((r) => ({ type: 'Feature', properties: { id: r.id, on: r.id === selected }, geometry: { type: 'MultiLineString', coordinates: brackets(r.bbox) } })),
    })
  }, [ready, regionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // one fire day's scene
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('scene-fires') as GeoJSONSource | undefined)?.setData(props.scene ?? NONE)
  }, [ready, props.scene])

  // How solid the dots draw: by heat; fading in as the 2-degree squares fade out (while those show). Up close they stay,
  // drawn over the true-size squares.
  const paintFires = React.useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const stops: unknown[] = []
    if (cellsOn.current) stops.push(4.5, 0, CELLS_GONE - 0.5, BRIGHT)
    const op = (stops.length ? ['interpolate', ['linear'], ['zoom'], ...stops] : BRIGHT) as never
    map.setPaintProperty('fire-viirs', 'icon-opacity', op)
    map.setPaintProperty('fire-viirs-dot', 'circle-opacity', op)
    map.setPaintProperty('fire-viirs-dot', 'circle-stroke-opacity', op)
    map.setPaintProperty('fire-terra', 'circle-stroke-opacity', op)
    map.setPaintProperty('fire-aqua', 'circle-opacity', op)
    map.setPaintProperty('fire-aqua', 'circle-stroke-opacity', op)
    // up close the picked square itself is marked, so the rings fade with the dots
    const ring = (squaresReady.current ? ['interpolate', ['linear'], ['zoom'], HAND0, 1, HAND1, 0] : 1) as never
    map.setPaintProperty('fire-sel', 'circle-stroke-opacity', ring)
    map.setPaintProperty('fire-near', 'circle-stroke-opacity', ring)
  }, [])

  // Up close on the live site: every detection at the size of the ground it covers. The file is fetched the moment
  // the map nears the handover; until it arrives (or if it can't), the dots stay.
  React.useEffect(() => {
    const map = mapRef.current
    const src = props.squaresSrc
    if (!map || !ready || !live || !src) return
    let asked = false, gone = false
    const load = () => {
      if (asked || map.getZoom() < HAND0 - 1.5) return
      asked = true
      fetch(src)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no squares'))))
        .then((d: { pts: number[] }) => {
          if (gone) return
          ;(map.getSource('squares') as GeoJSONSource | undefined)?.setData(squareFeatures(d.pts))
          squarePts.current = d.pts
          squaresReady.current = true
          setSquaresOn(true)
          paintFires()
        })
        .catch(() => { /* the dots stay */ })
    }
    map.on('zoom', load)
    load()
    return () => { gone = true; map.off('zoom', load) }
  }, [ready, live, props.squaresSrc, paintFires])

  // the 2-degree squares; while they show, the day's fires fade in only as the squares fade out
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('cells') as GeoJSONSource | undefined)?.setData(props.cells ?? NONE)
    paintFires()
  }, [ready, props.cells, paintFires])
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.setFilter('cell-sel', ['==', ['get', 'id'], props.cell ?? ''])
  }, [ready, props.cell])

  // which satellites show
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.setLayoutProperty('fire-terra', 'visibility', show.terra ? 'visible' : 'none')
    map.setLayoutProperty('fire-aqua', 'visibility', show.aqua ? 'visible' : 'none')
    map.setLayoutProperty('fire-viirs', 'visibility', show.viirs ? 'visible' : 'none')
    map.setLayoutProperty('fire-viirs-dot', 'visibility', show.viirs ? 'visible' : 'none')
    const shown = ['in', ['get', 'g'], ['literal', [show.terra ? 0 : -1, show.aqua ? 1 : -1, show.viirs ? 2 : -1]]] as never
    map.setFilter('squares', shown)
    map.setFilter('squares-edge', shown)
  }, [ready, show.terra, show.aqua, show.viirs])

  // the picked fire's square: the one clicked, or the one a picked dot stands for
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const pts = squarePts.current
    const k = fire == null ? -1 : picked.current?.i === fire ? picked.current.k : pts && fire < N ? squareOfDot(pts, fire) : -1
    map.setFilter('squares-pick', ['==', ['get', 'k'], k])
    map.setFilter('squares-pick-edge', ['==', ['get', 'k'], k])
  }, [ready, fire, squaresOn])

  // the clicked fire and its other sightings
  const nearKey = near.join(',')
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.setFilter('fire-sel', ['==', ['get', 'i'], fire ?? -1])
    map.setFilter('fire-near', ['in', ['get', 'i'], ['literal', near.filter((i) => i !== fire)]])
  }, [ready, fire, nearKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // region tags: an HTML label at each box's top-left corner, hidden on the far side of the globe and where they would
  // overlap (the selected one wins)
  const tagState = React.useRef(selected)
  tagState.current = selected
  const tagsRef = React.useRef<{ id: string; el: HTMLButtonElement; m: Marker }[]>([])
  const declutter = React.useCallback(() => {
    const sel = tagState.current
    const list = [...tagsRef.current].sort((a, b) => Number(b.id === sel) - Number(a.id === sel))
    const rects = list.map((t) => { t.el.style.visibility = 'visible'; return t.el.getBoundingClientRect() })
    const placed: DOMRect[] = []
    list.forEach((t, k) => {
      const r = rects[k]
      const covered = t.m.getElement().style.opacity === '0'
      const clash = placed.some((p) => !(r.right + 4 < p.left || r.left > p.right + 4 || r.bottom + 2 < p.top || r.top > p.bottom + 2))
      const hide = covered || clash
      t.el.style.visibility = hide ? 'hidden' : 'visible'
      t.el.tabIndex = hide ? -1 : 0
      if (!hide) placed.push(r)
    })
  }, [])
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    let frame = 0
    const later = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; declutter() }) }
    map.on('move', later)
    map.on('idle', later)
    later()
    return () => { map.off('move', later); map.off('idle', later); cancelAnimationFrame(frame) }
  }, [ready, declutter])
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const tags = regions.map((r) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'anchor-tag'
      el.dataset.on = String(r.id === selected)
      el.setAttribute('aria-label', `Fly to ${r.name}`)
      el.innerHTML = `<span class="anchor-tag-mark" aria-hidden="true"></span><span>${r.name.replace(/ \(.*\)$/, '')}</span>`
      el.addEventListener('click', (e) => { e.stopPropagation(); cb.current.onPick?.(r.id) })
      const m = new Marker({ element: el, anchor: 'bottom-left', offset: [-1, -6], opacityWhenCovered: '0' }).setLngLat([r.bbox[0], r.bbox[3]]).addTo(map)
      return { id: r.id, el, m }
    })
    tagsRef.current = tags
    requestAnimationFrame(declutter)
    return () => { tags.forEach((t) => t.m.remove()); tagsRef.current = [] }
  }, [ready, regionKey, declutter]) // eslint-disable-line react-hooks/exhaustive-deps

  // sharper Blue Marble around the selected region, from the moment it is picked
  useImageLayer(mapRef, ready, 'region-ctx', context ?? null, 'ctx-slot', motion)

  // A flight on the flat map: a short trip eases straight there; a long one pulls back, so the reader sees where
  // the map is going, then closes in. Each leg is a plain ease the reader can interrupt.
  React.useEffect(() => {
    const map = mapRef.current
    const el = boxRef.current
    if (!map || !ready || !el) return
    const id = ++flight.current
    const w = el.clientWidth, h = el.clientHeight
    const home = homeZoom(w, h)
    map.stop()
    // a reader who drags or scrolls mid-flight takes the camera; the flight stops where they are
    let taken = false
    const take = () => { taken = true }
    map.once('dragstart', take)
    map.once('wheel', take)
    const live = () => id === flight.current && !taken
    /** one leg; resolves when it stops, or at once without motion */
    const leg = (o: { center?: [number, number]; zoom: number; padding: EarthPadding; duration: number }) =>
      new Promise<boolean>((done) => {
        if (!live()) { done(false); return }
        if (!motionRef.current || o.duration <= 0) { map.jumpTo({ center: o.center, zoom: o.zoom, padding: o.padding }); done(live()); return }
        let settled = false
        const finish = () => { if (!settled) { settled = true; done(live()) } }
        map.once('moveend', finish)
        window.setTimeout(finish, o.duration + 400)
        map.easeTo({ ...o, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2), essential: true })
      })
    atHome.current = !target
    const run = async () => {
      if (!target) return leg({ ...homeCam(w, h, cb.current.padding), duration: 1100 })
      const cam = fit(target.bbox, w, h, cb.current.padding)
      if (target.maxZoom != null) cam.zoom = Math.min(cam.zoom, target.maxZoom)
      const c = map.getCenter()
      const km = 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(((cam.center[1] - c.lat) * Math.PI) / 360) ** 2 + Math.cos((c.lat * Math.PI) / 180) * Math.cos((cam.center[1] * Math.PI) / 180) * Math.sin(((cam.center[0] - c.lng) * Math.PI) / 360) ** 2)))
      // far away: pull back to a height that shows both ends, moving toward the place, before closing in
      const high = Math.max(home, Math.min(map.getZoom(), cam.zoom, 8.5 - Math.log2(Math.max(1, km / 100))))
      if (km > 900 && map.getZoom() > high + 0.4 && !(await leg({ center: [(c.lng + cam.center[0]) / 2, (c.lat + cam.center[1]) / 2], zoom: high, padding: cb.current.padding, duration: Math.round(Math.min(1800, 700 + km / 8)) }))) return
      const ok = await leg({ center: cam.center, zoom: cam.zoom, padding: cb.current.padding, duration: Math.round(1100 + Math.abs(cam.zoom - map.getZoom()) * 240 + Math.min(900, km / 6)) })
      if (ok || id === flight.current) cb.current.onArrive?.(target.key)
    }
    void run().finally(() => { map.off('dragstart', take); map.off('wheel', take) })
  }, [ready, target?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  // the whole-world view follows the panels: when the phone's sheet is pulled up or down (or the chart opens), the world
  // re-centres in the clear part of the stage, unless the reader has moved the map since
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const mine = (e: { originalEvent?: unknown }) => { if (e.originalEvent) atHome.current = false }
    map.on('movestart', mine)
    return () => { map.off('movestart', mine) }
  }, [ready])
  React.useEffect(() => {
    const map = mapRef.current, el = boxRef.current
    if (!map || !ready || !el || target || !atHome.current) return
    map.easeTo({ ...homeCam(el.clientWidth, el.clientHeight, props.padding), duration: motionRef.current ? 300 : 0, essential: true })
  }, [ready, props.padding.top, props.padding.bottom]) // eslint-disable-line react-hooks/exhaustive-deps

  // callouts: React content rendered into map markers (the fire card, a searched place's reticle)
  const [hosts, setHosts] = React.useState<Record<string, HTMLDivElement>>({})
  const calloutKey = callouts.map((c) => c?.key ?? '').join('|')
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const made: Record<string, HTMLDivElement> = {}
    const markers: Marker[] = []
    for (const c of callouts) {
      if (!c) continue
      const el = document.createElement('div')
      el.style.pointerEvents = c.anchor === 'center' ? 'none' : 'auto'
      markers.push(new Marker({ element: el, anchor: c.anchor, offset: c.anchor === 'bottom' ? [0, -14] : c.anchor === 'top' ? [0, 14] : [0, 0], opacityWhenCovered: '0' }).setLngLat([c.lon, c.lat]).addTo(map))
      made[c.key] = el
    }
    setHosts(made)
    return () => { markers.forEach((m) => m.remove()); setHosts({}) }
  }, [ready, calloutKey]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useImperativeHandle(handle, () => ({
    zoomBy: (d) => { const map = mapRef.current; atHome.current = false; if (map) map.easeTo({ zoom: map.getZoom() + d, duration: motionRef.current ? 250 : 0 }) },
    home: () => {
      const map = mapRef.current, el = boxRef.current
      if (!map || !el) return
      atHome.current = !cb.current.target
      map.flyTo({ ...homeCam(el.clientWidth, el.clientHeight, cb.current.padding), duration: motionRef.current ? 1400 : 0, essential: true })
    },
    reveal: (lon, lat, room) => {
      const map = mapRef.current, el = boxRef.current
      if (!map || !el) return
      const p = map.project([lon, lat])
      const pad = cb.current.padding
      const minX = pad.left + room.side, maxX = el.clientWidth - pad.right - room.side
      const minY = pad.top + room.top, maxY = el.clientHeight - pad.bottom - (room.bottom ?? 16)
      const dx = p.x < minX ? p.x - minX : p.x > maxX ? p.x - maxX : 0
      const dy = p.y < minY ? p.y - minY : p.y > maxY ? p.y - maxY : 0
      if (dx || dy) map.panBy([dx, dy], { duration: motionRef.current ? 450 : 0 })
    },
    room: (lon, lat) => {
      const map = mapRef.current, el = boxRef.current
      if (!map || !el) return null
      const p = map.project([lon, lat])
      const pad = cb.current.padding
      return { above: p.y - pad.top, below: el.clientHeight - pad.bottom - p.y }
    },
  }), [])

  // MapLibre's stylesheet makes its container position: relative, so the map sits inside a positioned wrapper
  return (
    <div className={className}>
      <div ref={boxRef} style={{ width: '100%', height: '100%' }} />
      {callouts.map((c) => (c && hosts[c.key] ? createPortal(c.content, hosts[c.key], c.key) : null))}
    </div>
  )
})

export default EarthGlobe
