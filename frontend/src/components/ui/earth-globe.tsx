/**
 * Earth globe: NASA Blue Marble on a 3D globe (MapLibre GL) that flattens into a 2D map on the way down to a place
 * (the projection eases from globe to web mercator across a band of zoom levels set for each flight). On it: the past
 * day's NASA FIRMS daytime fire detections in the site's satellite marks (Aqua an amber dot, VIIRS a green diamond,
 * Terra a blue ring), which can be clicked; the six studied regions, framed by white corner brackets; a faint grid.
 *
 * Imagery: the comment page carries one 4096 px Blue Marble image, cut into tiles here (no network), and sharper Blue
 * Marble around each studied region; the live site also streams NASA GIBS Blue Marble and Sentinel-2 cloudless close up.
 */
import * as React from 'react'
import { createPortal } from 'react-dom'
import { Map as MLMap, Marker, addProtocol, setWorkerUrl, type GeoJSONSource, type ImageSource, type MapGeoJSONFeature, type StyleSpecification } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { LAT, LON, N, SAT } from '@/r2/fires'

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
  /** pan just enough that a point has `top` px of room above it and `side` px either side (for a card drawn over it) */
  reveal: (lon: number, lat: number, room: { top: number; side: number }) => void
}
export type Show = { terra: boolean; aqua: boolean; viirs: boolean }
/** React content drawn at a point on the map (the selected fire's card, a searched place's reticle) */
export type Callout = { key: string; lon: number; lat: number; anchor: 'center' | 'bottom'; content: React.ReactNode } | null

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
  /** a scene drawn over the map instead of the day's fires: one fire day's fires and the trips to them */
  scene?: { fires: GeoJSON.FeatureCollection; trips: GeoJSON.FeatureCollection } | null
  /** where the panels sit, so a place lands in the clear middle */
  padding: EarthPadding
  /** the Blue Marble image the comment page cuts into tiles */
  baseSrc: string
  /** stream NASA GIBS and Sentinel-2 tiles too (the live site; the comment page cannot reach them) */
  live: boolean
  motion: boolean
  onArrive?: (key: string) => void
  onPick?: (id: string) => void
  onFire?: (i: number | null) => void
  /** the map's view, when it comes to rest: [west, south, east, north], and its zoom */
  onRest?: (b: Box, zoom: number) => void
  onFail?: () => void
  className?: string
}

const GIBS_BM = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'
/** close-up imagery on the live site: Sentinel-2 cloudless 2016 by EOX (s2maps.eu), CC BY 4.0 */
const S2 = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'
/** the satellite colours, as the site's tokens set them (MapLibre paint needs literal colours) */
const AQUA = '#C8801F', TERRA = '#448BCB', VIIRS = '#49A46E', BONE = '#ECE9E1', GROUND = '#0B0D0B'
const NONE = { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection
const FIRE_LAYERS = ['fire-viirs', 'fire-terra', 'fire-aqua'] as const

/** the fire points as GeoJSON, once: g = 0 Terra, 1 Aqua, 2 VIIRS */
let firesGeo: GeoJSON.FeatureCollection | null = null
function fireFeatures() {
  if (firesGeo) return firesGeo
  const features: GeoJSON.Feature[] = new Array(N)
  for (let i = 0; i < N; i++) features[i] = { type: 'Feature', properties: { i, g: SAT[i] >= 2 ? 2 : SAT[i] }, geometry: { type: 'Point', coordinates: [LON[i], LAT[i]] } }
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
  const h = px / 2, r = h - 2
  g.beginPath()
  g.moveTo(h, h - r); g.lineTo(h + r, h); g.lineTo(h, h + r); g.lineTo(h - r, h)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.lineWidth = 2
  g.strokeStyle = stroke
  g.stroke()
  return g.getImageData(0, 0, px, px)
}

/** the zoom at which the whole Earth fits the stage */
const homeZoom = (w: number, h: number) => Math.log2((Math.min(w, h) * 0.92 * Math.PI) / 512)
/** the band over which the globe flattens: globe below z0, a flat map above z1 */
const band = (z0: number, z1: number) => ['interpolate', ['linear'], ['zoom'], z0, 'vertical-perspective', z1, 'mercator'] as unknown as string
const flatAt = (z: number, b: [number, number]) => Math.max(0, Math.min(1, (z - b[0]) / (b[1] - b[0])))
const mercY = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2
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
  const bandRef = React.useRef<[number, number]>([4, 5.5])
  const cb = React.useRef(props)
  cb.current = props
  const motionRef = React.useRef(motion)
  motionRef.current = motion
  const flight = React.useRef(0)

  // the map, once
  React.useEffect(() => {
    const el = boxRef.current
    if (!el) return
    useBaseProtocol(baseSrc)
    const w = el.clientWidth || 1200, h = el.clientHeight || 800
    const dot = (color: string, r: number[]) => ({ 'circle-color': color, 'circle-radius': ['interpolate', ['exponential', 1.5], ['zoom'], ...r], 'circle-pitch-alignment': 'map', 'circle-stroke-color': GROUND, 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 2, 0, 5, 0.6] })
    const style: StyleSpecification = {
      version: 8,
      projection: { type: band(4, 5.5) },
      sky: { 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.8, 6, 0] },
      sources: {
        base: { type: 'raster', tiles: ['anchor-earth://{z}/{x}/{y}'], tileSize: 256, maxzoom: 4 },
        ...(live ? {
          gibs: { type: 'raster' as const, tiles: [GIBS_BM], tileSize: 256, maxzoom: 8 },
          s2: { type: 'raster' as const, tiles: [S2], tileSize: 256, maxzoom: 14 },
        } : {}),
        grid: { type: 'geojson', data: GRID },
        regions: { type: 'geojson', data: NONE },
        frames: { type: 'geojson', data: NONE },
        fires: { type: 'geojson', data: NONE },
        'scene-fires': { type: 'geojson', data: NONE },
        'scene-trips': { type: 'geojson', data: NONE },
      },
      layers: [
        { id: 'ocean', type: 'background', paint: { 'background-color': '#0A1A2C' } },
        { id: 'base', type: 'raster', source: 'base', paint: { 'raster-fade-duration': 150 } },
        ...(live ? [{ id: 'gibs', type: 'raster' as const, source: 'gibs', minzoom: 3, paint: { 'raster-fade-duration': 250 } }] : []),
        { id: 'ctx-slot', type: 'background', layout: { visibility: 'none' } },
        ...(live ? [{ id: 's2', type: 'raster' as const, source: 's2', minzoom: 4.5, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 4.5, 0, 6, 1], 'raster-fade-duration': 250 } }] : []) as never[],
        { id: 'grid', type: 'line', source: 'grid', paint: { 'line-color': BONE, 'line-width': 0.6, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.09, 6, 0.05] } },
        { id: 'region-hit', type: 'fill', source: 'regions', paint: { 'fill-color': '#000', 'fill-opacity': 0 } },
        { id: 'region-edge', type: 'line', source: 'regions', paint: { 'line-color': BONE, 'line-opacity': ['case', ['get', 'on'], 0.6, 0.22], 'line-width': 1, 'line-dasharray': [2, 3] } },
        { id: 'frames', type: 'line', source: 'frames', layout: { 'line-cap': 'square', 'line-join': 'miter' }, paint: { 'line-color': BONE, 'line-width': ['case', ['get', 'on'], 2.5, 1.25], 'line-opacity': ['case', ['get', 'on'], 1, 0.7] } },
        // VIIRS beneath (the most numerous), then Terra's rings, then Aqua on top: Aqua is the satellite the audit is about
        {
          id: 'fire-viirs', type: 'symbol', source: 'fires', filter: ['==', ['get', 'g'], 2],
          layout: { 'icon-image': 'viirs-mark', 'icon-size': ['interpolate', ['exponential', 1.5], ['zoom'], 1, 0.3, 4, 0.45, 8, 0.8, 11, 1.05], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-padding': 0 },
        },
        {
          id: 'fire-terra', type: 'circle', source: 'fires', filter: ['==', ['get', 'g'], 0],
          paint: { 'circle-color': 'rgba(0, 0, 0, 0)', 'circle-stroke-color': TERRA, 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 1, 1, 6, 1.6], 'circle-radius': ['interpolate', ['exponential', 1.5], ['zoom'], 1, 1.4, 4, 2.4, 8, 4.4, 11, 6], 'circle-pitch-alignment': 'map' },
        },
        { id: 'fire-aqua', type: 'circle', source: 'fires', filter: ['==', ['get', 'g'], 1], paint: dot(AQUA, [1, 1.3, 4, 2.2, 8, 4, 11, 6]) as never },
        // one fire day: trips (helicopters solid, ground crews dashed), then the fires
        { id: 'scene-trip-ground', type: 'line', source: 'scene-trips', filter: ['==', ['get', 'kind'], 'ground'], layout: { 'line-cap': 'round' }, paint: { 'line-color': BONE, 'line-width': 1.25, 'line-opacity': 0.65, 'line-dasharray': [2, 2] } },
        { id: 'scene-trip-heli', type: 'line', source: 'scene-trips', filter: ['==', ['get', 'kind'], 'helicopter'], layout: { 'line-cap': 'round' }, paint: { 'line-color': BONE, 'line-width': 2.2, 'line-opacity': 0.95 } },
        { id: 'scene-fire-dim', type: 'circle', source: 'scene-fires', filter: ['!', ['get', 'seen']], paint: { 'circle-color': '#8D8A84', 'circle-opacity': 0.75, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2, 9, 3.5], 'circle-stroke-color': GROUND, 'circle-stroke-width': 0.6 } },
        {
          id: 'scene-fire', type: 'circle', source: 'scene-fires', filter: ['get', 'seen'],
          paint: {
            'circle-color': ['case', ['get', 'reached'], BONE, 'rgba(11, 13, 11, 0.55)'],
            'circle-stroke-color': BONE, 'circle-stroke-width': 1.6,
            'circle-radius': ['interpolate', ['linear'], ['sqrt', ['get', 'frp']], 0, 3.5, 30, 6.5, 80, 11],
          },
        },
        {
          id: 'fire-near', type: 'circle', source: 'fires', filter: ['in', ['get', 'i'], ['literal', []]],
          paint: { 'circle-color': 'rgba(0, 0, 0, 0)', 'circle-stroke-color': BONE, 'circle-stroke-width': 1.5, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 5, 8, 8], 'circle-pitch-alignment': 'map' },
        },
        {
          id: 'fire-sel', type: 'circle', source: 'fires', filter: ['==', ['get', 'i'], -1],
          paint: { 'circle-color': 'rgba(0, 0, 0, 0)', 'circle-stroke-color': BONE, 'circle-stroke-width': 2.5, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 8, 8, 12], 'circle-pitch-alignment': 'map' },
        },
      ],
    }
    let map: MLMap
    try {
      map = new MLMap({
        container: el, style, center: [-40, 8], zoom: homeZoom(w, h), minZoom: 0.4, maxZoom: live ? 11 : 8.5,
        attributionControl: false, maplibreLogo: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, maxPitch: 0,
        renderWorldCopies: true, fadeDuration: 150, canvasContextAttributes: { antialias: true },
      })
    } catch {
      cb.current.onFail?.()
      return
    }
    map.touchZoomRotate.disableRotation()
    mapRef.current = map
    map.on('error', () => { /* a tile that fails stays blank; the base below shows through */ })
    map.on('load', () => {
      const mark = diamond(32, VIIRS, GROUND)
      if (mark && !map.hasImage('viirs-mark')) map.addImage('viirs-mark', mark, { pixelRatio: 2 })
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
      const r = map.queryRenderedFeatures(p, { layers: ['region-hit'] })[0]
      if (r?.properties?.id) { cb.current.onPick?.(String(r.properties.id)); return }
      cb.current.onFire?.(null)
    })
    for (const l of [...FIRE_LAYERS, 'region-hit']) {
      map.on('mouseenter', l, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', l, () => { map.getCanvas().style.cursor = '' })
    }
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(el)
    return () => { ro.disconnect(); map.remove(); mapRef.current = null }
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
    ;(map.getSource('scene-fires') as GeoJSONSource | undefined)?.setData(props.scene?.fires ?? NONE)
    ;(map.getSource('scene-trips') as GeoJSONSource | undefined)?.setData(props.scene?.trips ?? NONE)
  }, [ready, props.scene])

  // which satellites show
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.setLayoutProperty('fire-terra', 'visibility', show.terra ? 'visible' : 'none')
    map.setLayoutProperty('fire-aqua', 'visibility', show.aqua ? 'visible' : 'none')
    map.setLayoutProperty('fire-viirs', 'visibility', show.viirs ? 'visible' : 'none')
  }, [ready, show.terra, show.aqua, show.viirs])

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

  /** set the flatten band without a jump: if the globe's shape at this zoom would change, zoom out to the globe first */
  const withBand = (next: [number, number], then: () => void) => {
    const map = mapRef.current!
    const z = map.getZoom()
    const apply = () => { bandRef.current = next; map.setProjection({ type: band(next[0], next[1]) }); then() }
    if (Math.abs(flatAt(z, bandRef.current) - flatAt(z, next)) < 0.01) { apply(); return }
    const id = flight.current
    map.once('moveend', () => { if (id === flight.current) apply() })
    map.easeTo({ zoom: Math.min(next[0], bandRef.current[0]) - 0.15, duration: motionRef.current ? 900 : 0, padding: cb.current.padding, essential: true })
  }

  // a new target: fly there and flatten on the way down; no target: back out to the whole globe
  React.useEffect(() => {
    const map = mapRef.current
    const el = boxRef.current
    if (!map || !ready || !el) return
    const id = ++flight.current
    const w = el.clientWidth, h = el.clientHeight
    const home = homeZoom(w, h)
    map.stop()
    if (!target) {
      withBand([Math.max(home + 0.2, 4), Math.max(home + 1.7, 5.5)], () => {
        map.flyTo({ center: map.getCenter(), zoom: home, padding: { top: 0, right: 0, bottom: 0, left: 0 }, duration: motionRef.current ? 1600 : 0, essential: true })
      })
      return
    }
    const cam = fit(target.bbox, w, h, cb.current.padding)
    if (target.maxZoom != null) cam.zoom = Math.min(cam.zoom, target.maxZoom)
    const z1 = cam.zoom - 0.35
    const z0 = Math.max(home + 0.15, cam.zoom - 2)
    const next: [number, number] = z1 - z0 < 0.4 ? [cam.zoom + 1, cam.zoom + 2] : [z0, z1] // very large places stay a globe
    withBand(next, () => {
      if (id !== flight.current) return
      map.once('moveend', () => { if (id === flight.current) cb.current.onArrive?.(target.key) })
      // a duration from the distance: long flights take longer, but never more than about four and a half seconds
      const c = map.getCenter()
      const km = 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(Math.sin(((cam.center[1] - c.lat) * Math.PI) / 360) ** 2 + Math.cos((c.lat * Math.PI) / 180) * Math.cos((cam.center[1] * Math.PI) / 180) * Math.sin(((cam.center[0] - c.lng) * Math.PI) / 360) ** 2)))
      const duration = Math.round(1500 + Math.min(2600, km / 5) + Math.abs(cam.zoom - map.getZoom()) * 120)
      if (motionRef.current) map.flyTo({ center: cam.center, zoom: cam.zoom, padding: cb.current.padding, duration, curve: 1.5, essential: true })
      else map.jumpTo({ center: cam.center, zoom: cam.zoom, padding: cb.current.padding })
    })
  }, [ready, target?.key]) // eslint-disable-line react-hooks/exhaustive-deps

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
      el.style.pointerEvents = c.anchor === 'bottom' ? 'auto' : 'none'
      markers.push(new Marker({ element: el, anchor: c.anchor, offset: c.anchor === 'bottom' ? [0, -14] : [0, 0], opacityWhenCovered: '0' }).setLngLat([c.lon, c.lat]).addTo(map))
      made[c.key] = el
    }
    setHosts(made)
    return () => { markers.forEach((m) => m.remove()); setHosts({}) }
  }, [ready, calloutKey]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useImperativeHandle(handle, () => ({
    zoomBy: (d) => { const map = mapRef.current; if (map) map.easeTo({ zoom: map.getZoom() + d, duration: motionRef.current ? 250 : 0 }) },
    home: () => {
      const map = mapRef.current, el = boxRef.current
      if (!map || !el) return
      map.flyTo({ center: [-40, 8], zoom: homeZoom(el.clientWidth, el.clientHeight), padding: { top: 0, right: 0, bottom: 0, left: 0 }, duration: motionRef.current ? 1400 : 0, essential: true })
    },
    reveal: (lon, lat, room) => {
      const map = mapRef.current, el = boxRef.current
      if (!map || !el) return
      const p = map.project([lon, lat])
      const pad = cb.current.padding
      const minX = pad.left + room.side, maxX = el.clientWidth - pad.right - room.side
      const minY = pad.top + room.top, maxY = el.clientHeight - pad.bottom - 16
      const dx = p.x < minX ? p.x - minX : p.x > maxX ? p.x - maxX : 0
      const dy = p.y < minY ? p.y - minY : p.y > maxY ? p.y - maxY : 0
      if (dx || dy) map.panBy([dx, dy], { duration: motionRef.current ? 450 : 0 })
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
