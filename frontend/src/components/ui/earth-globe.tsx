/**
 * Earth globe: NASA Blue Marble on a 3D globe (MapLibre GL), with the past day's NASA FIRMS fire detections as points
 * and the six studied regions framed by corner brackets. Fly it to a place and it turns, zooms in and flattens into a
 * 2D map on the way down (the projection eases from globe to web mercator across a band of zoom levels set for each
 * flight), where a region's own NASA map can sit on its box.
 *
 * Imagery: the comment page carries one 4096 px Blue Marble image, cut into tiles here (no network); the live site
 * also streams NASA GIBS Blue Marble tiles to zoom 8 over it. Nothing here computes a number the page quotes.
 */
import * as React from 'react'
import { createPortal } from 'react-dom'
import { Map as MLMap, Marker, addProtocol, setWorkerUrl, type GeoJSONSource, type ImageSource, type StyleSpecification } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

export type Box = readonly [number, number, number, number]
export type EarthRegion = { id: string; name: string; bbox: Box }
/** where to fly: a box to fit, optionally no closer than `maxZoom` (the comment page's own imagery is soft up close) */
export type EarthTarget = { key: string; bbox: Box; maxZoom?: number } | null
export type EarthOverlay = { src: string; bbox: Box } | null
export type EarthView = { zoom: number; lat: number; flat: number }
export type EarthPadding = { top: number; right: number; bottom: number; left: number }
export type EarthHandle = { zoomBy: (d: number) => void; home: () => void }

export interface EarthGlobeProps {
  regions: EarthRegion[]
  selected: string | null
  target: EarthTarget
  overlay: EarthOverlay
  /** sharper imagery around the selected region, under its own map (shown from the moment it is picked) */
  context?: EarthOverlay
  /** a marker at a searched place that has no region frame: where it is, and what to draw there */
  pin?: { key: string; lon: number; lat: number } | null
  pinContent?: React.ReactNode
  /** fire points as [lon*100, lat*100, day(1)/night(0), ...] */
  fires: number[] | null
  /** the selected region's own week of fire detections, as [lon*100, lat*100, ...], drawn as rings */
  weekFires?: number[] | null
  /** where the panels sit, so a place lands in the clear middle */
  padding: EarthPadding
  /** the Blue Marble image the comment page cuts into tiles */
  baseSrc: string
  /** stream NASA GIBS tiles too (the live site; the comment page cannot reach them) */
  live: boolean
  motion: boolean
  onArrive?: (key: string) => void
  onPick?: (id: string) => void
  onCursor?: (p: { lon: number; lat: number } | null) => void
  onView?: (v: EarthView) => void
  onFail?: () => void
  className?: string
}

const GIBS_BM = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'
/** close-up imagery on the live site: Sentinel-2 cloudless 2016 by EOX (s2maps.eu), CC BY 4.0 */
const S2 = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg'
const ACCENT = '#C8801F'
const BONE = '#ECE9E1'
const FIRE = '#FF5A36'
const NONE = { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection

/** a faint graticule every 15 degrees */
const GRID: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    ...Array.from({ length: 24 }, (_, i) => -180 + i * 15).map((lon) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: Array.from({ length: 35 }, (_, k) => [lon, -85 + k * 5]) } })),
    ...Array.from({ length: 11 }, (_, i) => -75 + i * 15).map((lat) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: Array.from({ length: 73 }, (_, k) => [-180 + k * 5, lat]) } })),
  ],
}

/** the half of the Earth in night now, as a polygon (sun position to within about a degree) */
function nightSide(now: Date): GeoJSON.FeatureCollection {
  const rad = Math.PI / 180
  const start = Date.UTC(now.getUTCFullYear(), 0, 0)
  const n = (now.getTime() - start) / 86400000
  const g = (2 * Math.PI / 365) * (n - 1)
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60
  const sunLon = -(utcMin + eot - 720) / 4
  const line: [number, number][] = []
  for (let lon = -180; lon <= 180; lon += 2) {
    const lat = Math.atan(-Math.cos((lon - sunLon) * rad) / Math.tan(dec || 1e-6)) / rad
    line.push([lon, Math.max(-85, Math.min(85, lat))])
  }
  const pole = dec > 0 ? -85 : 85
  const ring = [...line, [180, pole], [-180, pole], line[0]]
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }] }
}

/** the zoom at which the whole Earth fits the stage */
const homeZoom = (w: number, h: number) => Math.log2((Math.min(w, h) * 0.92 * Math.PI) / 512)
/** the band over which the globe flattens: globe below z0, a flat map above z1 */
const band = (z0: number, z1: number) =>
  ['interpolate', ['linear'], ['zoom'], z0, 'vertical-perspective', z1, 'mercator'] as unknown as string
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
    const n = 2 ** z, size = full / n
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
function useImageLayer(mapRef: React.MutableRefObject<MLMap | null>, ready: boolean, id: string, layer: EarthOverlay, before: string, fade: number, motionRef: React.MutableRefObject<boolean>) {
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
      map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': 0, 'raster-opacity-transition': { duration: motionRef.current ? fade : 0, delay: 0 }, 'raster-fade-duration': 0 } }, before)
      requestAnimationFrame(() => { if (!gone && map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', 1) })
    }
    im.src = layer.src
    return () => { gone = true }
  }, [ready, layer?.src]) // eslint-disable-line react-hooks/exhaustive-deps
}

export const EarthGlobe = React.forwardRef<EarthHandle, EarthGlobeProps>(function EarthGlobe(props, handle) {
  const { regions, selected, target, overlay, context, pin, pinContent, fires, weekFires, padding, baseSrc, live, motion, className } = props
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
        night: { type: 'geojson', data: nightSide(new Date()) },
        week: { type: 'geojson', data: NONE },
        regions: { type: 'geojson', data: NONE },
        frames: { type: 'geojson', data: NONE },
        fires: { type: 'geojson', data: NONE },
      },
      layers: [
        { id: 'ocean', type: 'background', paint: { 'background-color': '#0A1A2C' } },
        { id: 'base', type: 'raster', source: 'base', paint: { 'raster-fade-duration': 150 } },
        ...(live ? [{ id: 'gibs', type: 'raster' as const, source: 'gibs', minzoom: 3, paint: { 'raster-fade-duration': 250 } }] : []),
        { id: 'region-img-slot', type: 'background', layout: { visibility: 'none' } },
        ...(live ? [{ id: 's2', type: 'raster' as const, source: 's2', minzoom: 4.5, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 4.5, 0, 6, 1], 'raster-fade-duration': 250 } }] : []) as never[],
        { id: 'night', type: 'fill', source: 'night', paint: { 'fill-color': '#000', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.42, 3.5, 0.3, 5, 0] } },
        { id: 'grid', type: 'line', source: 'grid', paint: { 'line-color': BONE, 'line-width': 0.6, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.09, 6, 0.05] } },
        { id: 'region-hit', type: 'fill', source: 'regions', paint: { 'fill-color': '#000', 'fill-opacity': 0 } },
        {
          id: 'region-edge', type: 'line', source: 'regions',
          paint: { 'line-color': ACCENT, 'line-opacity': ['case', ['get', 'on'], 0.7, 0.25], 'line-width': 1, 'line-dasharray': [2, 3] },
        },
        {
          id: 'frames', type: 'line', source: 'frames',
          layout: { 'line-cap': 'square', 'line-join': 'miter' },
          paint: { 'line-color': ACCENT, 'line-width': ['case', ['get', 'on'], 2.5, 1.25], 'line-opacity': ['case', ['get', 'on'], 1, ['get', 'dim']] },
        },
        {
          id: 'week', type: 'circle', source: 'week',
          paint: {
            'circle-color': 'rgba(0, 0, 0, 0)', 'circle-stroke-color': '#FF6B3D',
            'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 5, 0.55, 7, 0.85],
            'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 7, 1.2],
            'circle-radius': ['interpolate', ['exponential', 1.5], ['zoom'], 3, 0.9, 6, 2.2, 9, 4.5],
            'circle-pitch-alignment': 'map',
          },
        },
        {
          id: 'fires-glow', type: 'circle', source: 'fires',
          paint: {
            'circle-color': FIRE, 'circle-blur': 1,
            'circle-radius': ['interpolate', ['exponential', 1.5], ['zoom'], 1, 2.2, 4, 5, 8, 11],
            'circle-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.1, 6, 0.16],
            'circle-pitch-alignment': 'map',
          },
        },
        {
          id: 'fires', type: 'circle', source: 'fires',
          paint: {
            'circle-color': ['case', ['==', ['get', 'd'], 1], '#FF6B3D', '#FF9A6B'],
            'circle-radius': ['interpolate', ['exponential', 1.5], ['zoom'], 1, 0.7, 4, 1.4, 8, 3.2, 11, 5],
            'circle-opacity': ['case', ['==', ['get', 'd'], 1], 0.95, 0.6],
            'circle-pitch-alignment': 'map',
          },
        },
      ],
    }
    let map: MLMap
    try {
      map = new MLMap({
        container: el,
        style,
        center: [-40, 8],
        zoom: homeZoom(w, h),
        minZoom: 0.4,
        maxZoom: live ? 11 : 8.5,
        attributionControl: false,
        maplibreLogo: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        maxPitch: 0,
        renderWorldCopies: true,
        fadeDuration: 150,
        canvasContextAttributes: { antialias: true },
      })
    } catch {
      cb.current.onFail?.()
      return
    }
    map.touchZoomRotate.disableRotation()
    mapRef.current = map
    map.on('error', () => { /* a tile that fails stays blank; the base below shows through */ })
    map.on('load', () => setReady(true))
    map.on('webglcontextlost', () => cb.current.onFail?.())
    const view = () => {
      const z = map.getZoom()
      cb.current.onView?.({ zoom: z, lat: map.getCenter().lat, flat: flatAt(z, bandRef.current) })
    }
    map.on('move', view)
    map.on('mousemove', (e) => cb.current.onCursor?.({ lon: e.lngLat.wrap().lng, lat: e.lngLat.lat }))
    map.on('mouseout', () => cb.current.onCursor?.(null))
    map.on('click', 'region-hit', (e) => {
      const id = e.features?.[0]?.properties?.id as string | undefined
      if (id) cb.current.onPick?.(id)
    })
    map.on('mouseenter', 'region-hit', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'region-hit', () => { map.getCanvas().style.cursor = '' })
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(el)
    return () => { ro.disconnect(); map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // regions: the dashed box (click target) and the corner brackets; the selected one in bone
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource('regions') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: regions.map((r) => ({ type: 'Feature', properties: { id: r.id, on: r.id === selected }, geometry: { type: 'Polygon', coordinates: [ring(r.bbox)] } })),
    })
    ;(map.getSource('frames') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: regions.map((r) => ({ type: 'Feature', properties: { id: r.id, on: r.id === selected, dim: overlay ? 0.3 : 0.8 }, geometry: { type: 'MultiLineString', coordinates: brackets(r.bbox) } })),
    })
    // fires inside the selected region give way to its own map
    const sel = regions.find((r) => r.id === selected)
    const filter = sel && overlay
      ? ['!', ['within', { type: 'Polygon', coordinates: [ring(sel.bbox)] }]]
      : null
    map.setFilter('fires', filter as never)
    map.setFilter('fires-glow', filter as never)
  }, [ready, regions, selected, overlay])

  // region tags: an HTML label at each box's top-left corner, hidden on the far side of the globe, where they would
  // overlap one another (the selected one wins), and, while a region's map shows, for every other region
  const tagState = React.useRef({ selected, overlay: !!overlay })
  tagState.current = { selected, overlay: !!overlay }
  const tagsRef = React.useRef<{ id: string; el: HTMLButtonElement; m: Marker }[]>([])
  const declutter = React.useCallback(() => {
    const { selected: sel, overlay: ov } = tagState.current
    const placed: DOMRect[] = []
    const list = [...tagsRef.current].sort((a, b) => Number(b.id === sel) - Number(a.id === sel))
    for (const t of list) {
      t.el.style.visibility = 'visible'
      const covered = t.m.getElement().style.opacity === '0'
      const r = t.el.getBoundingClientRect()
      const clash = placed.some((p) => !(r.right + 4 < p.left || r.left > p.right + 4 || r.bottom + 2 < p.top || r.top > p.bottom + 2))
      const hide = covered || clash || (ov && t.id !== sel)
      t.el.style.visibility = hide ? 'hidden' : 'visible'
      t.el.tabIndex = hide ? -1 : 0
      if (!hide) placed.push(r)
    }
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
  React.useEffect(() => { requestAnimationFrame(declutter) }, [selected, overlay, declutter])
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
  }, [ready, regions, selected, declutter])

  // the night side moves with the clock
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const t = window.setInterval(() => (map.getSource('night') as GeoJSONSource | undefined)?.setData(nightSide(new Date())), 300000)
    return () => window.clearInterval(t)
  }, [ready])

  // the selected region's week of fires, as rings
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const features: GeoJSON.Feature[] = []
    if (weekFires) for (let i = 0; i + 1 < weekFires.length; i += 2) features.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [weekFires[i] / 100, weekFires[i + 1] / 100] } })
    ;(map.getSource('week') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features })
  }, [ready, weekFires])

  // fire points
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !fires) return
    const features: GeoJSON.Feature[] = []
    for (let i = 0; i + 2 < fires.length; i += 3) {
      features.push({ type: 'Feature', properties: { d: fires[i + 2] }, geometry: { type: 'Point', coordinates: [fires[i] / 100, fires[i + 1] / 100] } })
    }
    ;(map.getSource('fires') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features })
  }, [ready, fires])

  // the sharper context around a region (from the moment it is picked), then the region's own map on its box (once
  // the flight lands), each fading in; images are decoded here, so no fetch is needed
  useImageLayer(mapRef, ready, 'region-ctx', context ?? null, 'region-img-slot', 500, motionRef)
  useImageLayer(mapRef, ready, 'region-img', overlay, 'region-hit', 700, motionRef)

  /** set the flatten band without a jump: if the globe's shape at this zoom would change, zoom out to the globe first */
  const withBand = (next: [number, number], then: () => void) => {
    const map = mapRef.current!
    const z = map.getZoom()
    const apply = () => { bandRef.current = next; map.setProjection({ type: band(next[0], next[1]) }); then() }
    if (Math.abs(flatAt(z, bandRef.current) - flatAt(z, next)) < 0.01) { apply(); return }
    const id = flight.current
    const out = Math.min(next[0], bandRef.current[0]) - 0.15
    map.once('moveend', () => { if (id === flight.current) apply() })
    map.easeTo({ zoom: out, duration: motionRef.current ? 900 : 0, padding: cb.current.padding, essential: true })
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

  // a searched place without a region frame gets a marker; its content is React, rendered into the marker's element
  const [pinEl, setPinEl] = React.useState<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !pin) { setPinEl(null); return }
    const el = document.createElement('div')
    el.style.pointerEvents = 'none'
    const m = new Marker({ element: el, anchor: 'center', opacityWhenCovered: '0' }).setLngLat([pin.lon, pin.lat]).addTo(map)
    setPinEl(el)
    return () => { m.remove(); setPinEl(null) }
  }, [ready, pin?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useImperativeHandle(handle, () => ({
    zoomBy: (d) => { const map = mapRef.current; if (map) map.easeTo({ zoom: map.getZoom() + d, duration: motionRef.current ? 250 : 0 }) },
    home: () => {
      const map = mapRef.current, el = boxRef.current
      if (!map || !el) return
      map.flyTo({ center: [-40, 8], zoom: homeZoom(el.clientWidth, el.clientHeight), padding: { top: 0, right: 0, bottom: 0, left: 0 }, duration: motionRef.current ? 1400 : 0, essential: true })
    },
  }), [])

  // MapLibre's stylesheet makes its container position: relative, so the map sits inside a positioned wrapper
  return (
    <div className={className}>
      <div ref={boxRef} style={{ width: '100%', height: '100%' }} />
      {pinEl && pinContent ? createPortal(pinContent, pinEl) : null}
    </div>
  )
})

export default EarthGlobe
