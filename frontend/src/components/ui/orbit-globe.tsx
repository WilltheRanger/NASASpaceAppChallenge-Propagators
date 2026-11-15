/**
 * Orbit globe: the region at local noon, seen from the Sun's side, with the orbits of the satellites that look at it.
 * Adapted from the 21st.dev "Wireframe Dotted Globe" (moazamtrade): a halftone globe with a faint graticule and thin
 * coastlines on black, here held still on the region and drawn in the caller's colours. The satellites ride above the
 * surface as in "Globe Satellites" (shuding), with fading trails after "Orbital Hero Section" (yura).
 *
 * The view is physical. The reader looks from the Sun at the region at noon, so the whole face is lit and no sun is
 * drawn: morning is to the left, evening to the right. A sun-synchronous orbit keeps the same angle to the sunlight, so
 * each orbit is a hoop over the poles along the line of one local time. The Earth's turn carries the region along its
 * day path (the dashed line through it, drawn at the orbits' height) under each orbit in turn; where an orbit crosses
 * that path is the satellite's look time there, and the time line below is laid out to match. Orbit heights are to
 * scale (about 700 km); the satellites fly faster than life.
 */
import * as React from 'react'
import { COAST, LAND, LAT_ROWS } from '@/r2/globe-land'
import { cn } from '@/lib/utils'
import { useMeasuredWidth } from '@/components/ui/series-chart'

export interface GlobeOrbit {
  id: string
  label: string
  /** local time, in hours, of the satellite's look at the region */
  time: number
  /** the time as written, e.g. "13:53" */
  timeText: string
  /** which way the satellite travels on the day side */
  dayPass: 'north' | 'south'
  marker: 'filled' | 'hollow' | 'diamond'
  /** any CSS colour, including var(--token) */
  color: string
  /** where along its orbit the satellite starts, 0 to 1, so they don't bunch */
  phase?: number
  /** the label's text colour (default: the figure's text colour) */
  labelColor?: string
  /** draws the label as a solid flag in the orbit's colour, with this note after the time, e.g. "+35 min" */
  flag?: string
  /** the orbit's height above the surface, km (Aqua and Terra about 705, the VIIRS satellites about 830) */
  altitudeKm?: number
}

export interface GlobeInk {
  /** text, the limb, the region's land */
  fg: string
  /** hour labels */
  muted: string
  /** axis, graticule, leaders */
  grid: string
  /** the page behind the figure; rings around markers */
  ground: string
  /** the ocean */
  surface: string
  /** land dots and coastlines */
  land: string
}

export interface OrbitGlobeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  orbits: GlobeOrbit[]
  /** the region the view holds on, lit on the globe: [west, south, east, north] in degrees */
  region: { name: string; bbox: readonly [number, number, number, number] }
  /** a bar on the time line between two orbits' times, e.g. the minutes Aqua has added to the fixed clock */
  span?: { from: string; to: string }
  /** fly the satellites along their orbits; false holds each one where it crosses the region's day path */
  running: boolean
  ink: GlobeInk
  /** what a screen reader hears for the whole figure */
  label: string
  /** the region's daylight on the day shown (local mean solar time, hours): the day path runs from sunrise to sunset;
   *  06:00 to 18:00 when not given */
  day?: { rise: number; set: number }
}

const RAD = Math.PI / 180
/** hours as hh:mm */
const clockText = (h: number) => { const m = Math.round(h * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
const TAU = Math.PI * 2
const INCLINATION = 98.2 * RAD
const ORBIT_SECONDS = 9
const TRAIL = 0.2 // of an orbit
const HOURS = Array.from({ length: 13 }, (_, i) => 6 + i)

/** how far east of the noon line a local time sits */
const angleOf = (hours: number) => (hours - 12) * 15 * RAD

/** world axes: x east (right), y north (up), z toward the Sun and the reader */
type V3 = [number, number, number]

/** A unit vector along the orbit at argument of latitude u (0 at the ascending node), the node at angle a east of noon. */
function orbitPoint(a: number, dayPass: 'north' | 'south', u: number): V3 {
  // the ascending node faces the Sun for a northbound day pass, and the night side otherwise
  const n = dayPass === 'north' ? a : a + Math.PI
  const dx = Math.sin(n), dz = Math.cos(n)
  // e: a quarter turn east of the node; the direction of travel at the node is cos(i) e + sin(i) north
  const ex = Math.cos(n), ez = -Math.sin(n)
  const ci = Math.cos(INCLINATION), si = Math.sin(INCLINATION)
  const cu = Math.cos(u), su = Math.sin(u)
  return [cu * dx + su * ci * ex, su * si, cu * dz + su * ci * ez]
}

/** Where the day-side pass crosses latitude lat: its argument of latitude, and how far east of the node that point sits. */
function crossing(dayPass: 'north' | 'south', lat: number) {
  const s = Math.max(-0.999, Math.min(0.999, Math.sin(lat) / Math.sin(INCLINATION)))
  const u = dayPass === 'north' ? Math.asin(s) : Math.PI - Math.asin(s)
  const p = orbitPoint(0, dayPass, u)
  return { u, shift: Math.atan2(p[0], p[2]) }
}

function resolveColor(el: Element, c: string) {
  const m = /^var\((--[^),\s]+)/.exec(c.trim())
  if (!m) return c
  return getComputedStyle(el).getPropertyValue(m[1]).trim() || '#888888'
}

function withAlpha(color: string, a: number) {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(color)
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((s) => s.trim())
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }
  return color
}

/** The land as longitude and latitude, once. */
const DOTS = (() => {
  let n = 0
  for (const row of LAND) for (let q = 2; q < row.length; q += 2) n += row[q + 1]
  const lon = new Float32Array(n), lat = new Float32Array(n)
  let k = 0
  for (const row of LAND) {
    const la = -90 + ((row[0] + 0.5) * 180) / LAT_ROWS
    for (let q = 2; q < row.length; q += 2) {
      for (let i = row[q]; i < row[q] + row[q + 1]; i++) {
        lon[k] = -180 + ((i + 0.5) * 360) / row[1]
        lat[k] = la
        k++
      }
    }
  }
  return { n, lon, lat, step: (180 / LAT_ROWS) * RAD }
})()

interface Layout { W: number; H: number; cx: number; cy: number; R: number; Ro: number; axisY: number; compact: boolean }

function layoutFor(W: number): Layout {
  const compact = W < 560
  const R = Math.max(96, Math.min(compact ? 150 : 232, W * (compact ? 0.36 : 0.3)))
  const Ro = R * 1.11 // 705 km over a 6,371 km Earth: to scale; the day path and time line use it
  const top = R * 1.14 // room for the higher VIIRS orbit (830 km)
  const cy = 14 + top
  const axisY = cy + top + 24
  return { W, H: Math.round(axisY + (compact ? 50 : 54)), cx: W / 2, cy, R, Ro, axisY, compact }
}

/** Labels under the time line: centred on their marks; a pair too close to sit side by side splits, the earlier one
 *  hanging left of its mark and the later one right of it (as the pass line does); anything still crowded drops a row. */
function placeLabels(items: { id: string; x: number; w: number }[], W: number) {
  const pos = [...items].sort((a, b) => a.x - b.x).map((it) => ({ ...it, anchor: 'middle' as 'start' | 'middle' | 'end', left: it.x - it.w / 2, right: it.x + it.w / 2 }))
  const hang = (p: (typeof pos)[number], side: 'start' | 'end') => {
    p.anchor = side
    p.left = side === 'start' ? p.x + 6 : p.x - 6 - p.w
    p.right = p.left + p.w
  }
  // until nothing changes: a crowded pair splits; a label that now hangs left pushes its left neighbour to hang left too
  for (let pass = 0; pass < pos.length + 1; pass++) {
    let changed = false
    for (let k = 1; k < pos.length; k++) {
      const a = pos[k - 1], b = pos[k]
      if (b.left >= a.right + 10) continue
      if (b.anchor === 'middle') { hang(b, 'start'); changed = true }
      if (a.anchor === 'middle') { hang(a, 'end'); changed = true }
    }
    if (!changed) break
  }
  const ends: number[] = []
  const out = new Map<string, { row: number; tx: number; anchor: 'start' | 'middle' | 'end' }>()
  for (const p of pos) {
    const shift = Math.max(0, -p.left) - Math.max(0, p.right - W)
    let row = ends.findIndex((e) => p.left + shift > e + 10)
    if (row < 0) { row = ends.length; ends.push(-Infinity) }
    ends[row] = p.right + shift
    const tx = (p.anchor === 'end' ? p.x - 6 : p.anchor === 'start' ? p.x + 6 : p.x) + shift
    out.set(p.id, { row, tx, anchor: p.anchor })
  }
  return out
}

export function OrbitGlobe({ orbits, region, span, running, ink, label, day, className, style, ...props }: OrbitGlobeProps) {
  const boxRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const W = useMeasuredWidth(boxRef)
  const L = React.useMemo(() => layoutFor(W || 360), [W])
  const [inView, setInView] = React.useState(false)
  const live = running && inView
  const inkKey = JSON.stringify(ink)
  const orbitsKey = orbits.map((o) => `${o.id}:${o.time}:${o.color}`).join('|')
  const regionKey = `${region.name}:${region.bbox.join(',')}`
  const rise = day?.rise ?? 6
  const set = day?.set ?? 18
  const dayKey = `${rise.toFixed(3)}:${set.toFixed(3)}`
  const [w0, s0, e0, n0] = region.bbox
  const rLat = ((s0 + n0) / 2) * RAD

  // read by the drawing loop, so a change of year never restarts the satellites
  const orbitsRef = React.useRef(orbits)
  orbitsRef.current = orbits
  const angles = React.useRef(new Map<string, number>())
  const clock = React.useRef({ t: 0 })
  const scene = React.useRef<null | { draw: (dt: number, isLive: boolean) => boolean; repaint: () => void }>(null)
  // the reader's own turn of the globe, by dragging it; it stays wherever it is left
  const view = React.useRef({ yaw: 0, pitch: 0 })
  const drag = React.useRef<null | { x: number; y: number; yaw: number; pitch: number; id: number }>(null)
  const frame = React.useRef(0)
  const [turned, setTurned] = React.useState(false)
  const [grabbing, setGrabbing] = React.useState(false)

  React.useEffect(() => {
    const el = boxRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // the scene for this size, these colours and this region: the globe drawn once, the orbits on demand
  React.useEffect(() => {
    const canvas = canvasRef.current
    const box = boxRef.current
    if (!canvas || !box || !W) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.round(L.W * dpr)
    canvas.height = Math.round(L.H * dpr)
    const col = {
      fg: resolveColor(box, ink.fg),
      ground: resolveColor(box, ink.ground),
      surface: resolveColor(box, ink.surface),
      land: resolveColor(box, ink.land),
    }
    const { cx, cy, R, Ro } = L
    const rLon = (w0 + e0) / 2
    // hold the view on the region: noon under the Sun, the region's latitude tipped to the middle of the face
    const c0 = Math.cos(rLat), s0r = Math.sin(rLat)
    // then the reader's turn: yaw about the vertical axis, pitch about the horizontal one
    let turn = { cy: 1, sy: 0, cp: 1, sp: 0 }
    const aim = () => { const v = view.current; turn = { cy: Math.cos(v.yaw), sy: Math.sin(v.yaw), cp: Math.cos(v.pitch), sp: Math.sin(v.pitch) } }
    aim()
    const tilt = (p: V3): V3 => {
      const y1 = c0 * p[1] - s0r * p[2], z1 = s0r * p[1] + c0 * p[2]
      const x2 = turn.cy * p[0] + turn.sy * z1, z2 = -turn.sy * p[0] + turn.cy * z1
      return [x2, turn.cp * y1 - turn.sp * z2, turn.sp * y1 + turn.cp * z2]
    }
    const geo = (lonDeg: number, latDeg: number): V3 => {
      const la = latDeg * RAD, d = (lonDeg - rLon) * RAD
      return tilt([Math.cos(la) * Math.sin(d), Math.sin(la), Math.cos(la) * Math.cos(d)])
    }
    const S = (p: V3, r: number) => [cx + p[0] * r, cy - p[1] * r] as const
    const line = (g: CanvasRenderingContext2D, pts: V3[], r: number, visible: (p: V3) => boolean) => {
      let pen = false
      for (const p of pts) {
        if (!visible(p)) { pen = false; continue }
        const [x, y] = S(p, r)
        if (pen) g.lineTo(x, y)
        else { g.moveTo(x, y); pen = true }
      }
    }
    const front = (p: V3) => p[2] > 0

    // the region's day path: its latitude from sunrise to sunset
    const dayPt = (h: number) => tilt([Math.cos(rLat) * Math.sin(angleOf(h)), Math.sin(rLat), Math.cos(rLat) * Math.cos(angleOf(h))])

    // the still globe: ocean, light, graticule, land, coastlines, the region, its day path; painted again only when
    // the reader turns it
    const base = document.createElement('canvas')
    base.width = canvas.width
    base.height = canvas.height
    const g = base.getContext('2d')
    if (!g) return
    const paintBase = () => {
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, base.width, base.height)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.beginPath(); g.arc(cx, cy, R, 0, TAU)
    g.fillStyle = col.surface; g.fill()
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R)
    glow.addColorStop(0, withAlpha(col.fg, 0.1))
    glow.addColorStop(0.75, withAlpha(col.fg, 0.03))
    glow.addColorStop(1, 'rgba(0, 0, 0, 0.32)')
    g.fillStyle = glow; g.fill()
    g.lineWidth = 1
    for (let m = -180; m < 180; m += 30) {
      const pts: V3[] = []
      for (let la = -90; la <= 90; la += 4) pts.push(geo(m, la))
      g.strokeStyle = withAlpha(col.land, 0.1); g.beginPath(); line(g, pts, R, front); g.stroke()
    }
    for (const la of [-60, -30, 0, 30, 60]) {
      const pts: V3[] = []
      for (let m = -180; m <= 180; m += 4) pts.push(geo(m, la))
      g.strokeStyle = withAlpha(col.land, la === 0 ? 0.2 : 0.1); g.beginPath(); line(g, pts, R, front); g.stroke()
    }
    // land dots, brighter toward the middle of the face; the region's in the text colour
    const dotR = Math.max(0.6, R * DOTS.step * 0.3)
    const BUCKETS = 6
    const buckets: number[][] = Array.from({ length: BUCKETS * 2 }, () => [])
    for (let k = 0; k < DOTS.n; k++) {
      const p = geo(DOTS.lon[k], DOTS.lat[k])
      if (p[2] <= 0.02) continue
      const mine = DOTS.lon[k] >= w0 && DOTS.lon[k] <= e0 && DOTS.lat[k] >= s0 && DOTS.lat[k] <= n0
      const [x, y] = S(p, R)
      buckets[Math.min(BUCKETS - 1, Math.floor(p[2] * BUCKETS)) + (mine ? BUCKETS : 0)].push(x, y)
    }
    buckets.forEach((pts, bi) => {
      if (!pts.length) return
      const lit = ((bi % BUCKETS) + 0.5) / BUCKETS
      const mine = bi >= BUCKETS
      g.fillStyle = withAlpha(mine ? col.fg : col.land, mine ? 0.5 + 0.5 * lit : 0.2 + 0.55 * lit)
      const r = mine ? dotR * 1.25 : dotR
      g.beginPath()
      for (let q = 0; q < pts.length; q += 2) { g.moveTo(pts[q] + r, pts[q + 1]); g.arc(pts[q], pts[q + 1], r, 0, TAU) }
      g.fill()
    })
    g.strokeStyle = withAlpha(col.land, 0.4)
    g.lineWidth = 0.75
    g.beginPath()
    for (const c of COAST) {
      const pts: V3[] = []
      for (let q = 0; q < c.length; q += 2) pts.push(geo(c[q] / 10, c[q + 1] / 10))
      line(g, pts, R, front)
    }
    g.stroke()
    // the day path, an hour tick each hour
    const path: V3[] = []
    for (let h = rise; h < set; h += 0.1) path.push(dayPt(h))
    path.push(dayPt(set))
    g.setLineDash([2, 4])
    g.strokeStyle = withAlpha(col.fg, 0.55)
    g.lineWidth = 1.25
    g.beginPath(); line(g, path, Ro, () => true); g.stroke()
    g.setLineDash([])
    for (const h of HOURS.filter((t) => t >= rise && t <= set)) {
      const [x, y] = S(dayPt(h), Ro)
      g.strokeStyle = withAlpha(col.fg, h % 6 === 0 ? 0.6 : 0.35)
      g.beginPath(); g.moveTo(x, y - (h % 6 === 0 ? 5 : 3)); g.lineTo(x, y + (h % 6 === 0 ? 5 : 3)); g.stroke()
    }
    g.strokeStyle = withAlpha(col.fg, 0.3)
    g.lineWidth = 1
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke()
    // the region's name, above its northern edge
    const [nx, ny] = S(geo(rLon, Math.min(85, n0 + 2.5)), R)
    g.font = `${L.compact ? 12 : 13}px ${getComputedStyle(box).fontFamily}`
    g.textAlign = 'center'
    g.textBaseline = 'bottom'
    g.lineWidth = 4
    g.strokeStyle = col.ground
    g.strokeText(region.name, nx, ny - 4)
    g.fillStyle = col.fg
    g.fillText(region.name, nx, ny - 4)
    }
    paintBase()

    // each orbit's node is set so its day-side track crosses the region's latitude at the satellite's look time there
    const cross = { north: crossing('north', rLat), south: crossing('south', rLat) }
    const nodeFor = (o: GlobeOrbit) => angleOf(o.time) - cross[o.dayPass].shift

    const draw = (dt: number, isLive: boolean) => {
      const list = orbitsRef.current
      const colorOf = new Map(list.map((o) => [o.id, resolveColor(box, o.color)]))
      let settling = false
      for (const o of list) {
        const goal = nodeFor(o)
        const cur = angles.current.get(o.id)
        if (cur == null || !isLive) { angles.current.set(o.id, goal); continue }
        const next = cur + (goal - cur) * (1 - Math.exp(-dt / 0.14))
        const done = Math.abs(goal - next) < 1e-4
        angles.current.set(o.id, done ? goal : next)
        if (!done) settling = true
      }
      const t = clock.current.t
      // still, each satellite sits up its orbit to the north, clear of the day path; flying, it starts from there
      const north = (o: GlobeOrbit) => cross[o.dayPass].u + (o.dayPass === 'north' ? 0.8 : -0.8)
      const satU = (o: GlobeOrbit) => (isLive ? north(o) + (t / ORBIT_SECONDS) * TAU + (o.phase ?? 0) * TAU : north(o))
      const pt = (o: GlobeOrbit, u: number) => tilt(orbitPoint(angles.current.get(o.id) ?? nodeFor(o), o.dayPass, u))
      const height = (o: GlobeOrbit) => R * (1 + (o.altitudeKm ?? 705) / 6371)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, L.W, L.H)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const hoop = (o: GlobeOrbit, isFront: boolean) => {
        const c = colorOf.get(o.id) ?? col.fg
        const pts: V3[] = []
        for (let s = 0; s <= 240; s++) pts.push(pt(o, (s / 240) * TAU))
        // the orbit in space: solid in front of the globe, dashed behind it
        ctx.setLineDash(isFront ? [] : [3, 5])
        ctx.lineWidth = isFront ? 1.75 : 1.25
        ctx.strokeStyle = withAlpha(c, isFront ? 0.85 : 0.4)
        ctx.beginPath(); line(ctx, pts, height(o), (p) => (p[2] >= 0) === isFront); ctx.stroke()
        ctx.setLineDash([])
        // the trail, then the satellite in the page's marker for it
        const u = satU(o)
        if (isLive) {
          const n = 30
          ctx.lineWidth = 2.5
          for (let s = 0; s < n; s++) {
            const p1 = pt(o, u - TRAIL * TAU * (1 - s / n))
            const p2 = pt(o, u - TRAIL * TAU * (1 - (s + 1) / n))
            if ((p1[2] >= 0) !== isFront) continue
            ctx.strokeStyle = withAlpha(c, 0.9 * ((s + 1) / n) ** 1.6)
            ctx.beginPath(); ctx.moveTo(...S(p1, height(o))); ctx.lineTo(...S(p2, height(o))); ctx.stroke()
          }
        }
        const p = pt(o, u)
        if ((p[2] >= 0) !== isFront) return
        const [x, y] = S(p, height(o))
        ctx.lineWidth = 2
        if (o.marker === 'filled') {
          ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU)
          ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = col.ground; ctx.stroke()
        } else if (o.marker === 'hollow') {
          ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU)
          ctx.fillStyle = col.ground; ctx.fill(); ctx.strokeStyle = c; ctx.stroke()
        } else {
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4)
          ctx.fillStyle = c; ctx.strokeStyle = col.ground; ctx.lineWidth = 1.5
          ctx.fillRect(-4.5, -4.5, 9, 9); ctx.strokeRect(-4.5, -4.5, 9, 9)
          ctx.restore()
        }
      }

      for (const o of list) hoop(o, false)
      ctx.drawImage(base, 0, 0, L.W, L.H)
      for (const o of list) hoop(o, true)
      // where each orbit crosses the region's day path: the satellite's look there
      for (const o of list) {
        const c = colorOf.get(o.id) ?? col.fg
        // on the day path at the look time, where the time line below puts it
        const [x, y] = S(dayPt(o.time), Ro)
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU)
        ctx.fillStyle = col.ground; ctx.fill()
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke()
      }
      return settling
    }
    scene.current = { draw, repaint: () => { aim(); paintBase(); draw(0, false) } }
    draw(0, false)
    return () => { scene.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, L, inkKey, regionKey, dayKey])

  // a change of year: redraw (the running loop eases it in on its own)
  React.useEffect(() => {
    if (!live) scene.current?.draw(0, false)
  }, [orbitsKey, live])

  // the satellites' clock: only while motion is on and the figure is on screen
  React.useEffect(() => {
    if (!live) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      clock.current.t += dt
      scene.current?.draw(dt, true)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [live])

  // the time line under the globe: the region's day from sunrise to sunset, laid out as its day path is
  const { cx, axisY, compact, H } = L
  const xAt = (h: number) => cx + L.Ro * Math.cos(rLat) * Math.sin(angleOf(h))
  const hourLabels = (compact ? [6, 12, 18] : [6, 9, 12, 15, 18]).filter((h) => orbits.every((o) => Math.abs(xAt(o.time) - xAt(h)) > (compact ? 16 : 24)))
  const hourText = (h: number) => (compact ? String(h).padStart(2, '0') : `${String(h).padStart(2, '0')}:00`)
  const text = (o: GlobeOrbit) => [o.label, compact ? null : o.timeText, o.flag].filter(Boolean).join(' ')
  // label widths measured in the page's own font once it is known, estimated before that
  const fontSize = compact ? 12 : 13
  const family = boxRef.current ? getComputedStyle(boxRef.current).fontFamily : ''
  const measure = React.useMemo(() => {
    const c = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
    return (t: string, weight = 400) => {
      if (!c || !family) return t.length * fontSize * 0.56
      c.font = `${weight} ${fontSize}px ${family}`
      return c.measureText(t).width
    }
  }, [family, fontSize])
  const widthOf = (o: GlobeOrbit) => (o.flag ? measure(text(o), 500) + 14 : measure(text(o)))
  const placed = placeLabels(orbits.map((o) => ({ id: o.id, x: xAt(o.time), w: widthOf(o) })), L.W)
  const rows = Math.max(0, ...[...placed.values()].map((p) => p.row))
  const spanBar = (() => {
    if (!span) return null
    const a = orbits.find((o) => o.id === span.from)
    const b = orbits.find((o) => o.id === span.to)
    if (!a || !b) return null
    const x1 = xAt(a.time), x2 = xAt(b.time)
    return Math.abs(x2 - x1) < 1 ? null : { x: Math.min(x1, x2), w: Math.abs(x2 - x1) }
  })()
  const rowY = (row: number) => axisY + (compact ? 36 : 40) + row * 20

  // drag to turn: about 0.6° per pixel at a typical size; up and down tip it, never past the poles
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, yaw: view.current.yaw, pitch: view.current.pitch, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
    setGrabbing(true)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const k = Math.PI / Math.max(240, L.R * 3)
    view.current = { yaw: d.yaw + (e.clientX - d.x) * k, pitch: Math.max(-1.2, Math.min(1.2, d.pitch + (e.clientY - d.y) * k)) }
    if (!frame.current) frame.current = requestAnimationFrame(() => { frame.current = 0; scene.current?.repaint() })
  }
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    setGrabbing(false)
    setTurned(Math.abs(view.current.yaw) > 0.01 || Math.abs(view.current.pitch) > 0.01)
  }
  const reset = () => {
    view.current = { yaw: 0, pitch: 0 }
    scene.current?.repaint()
    setTurned(false)
  }

  return (
    <div className={cn('relative w-full', className)} style={{ height: H + 20 * rows, ...style }} {...props}>
    <div
      ref={boxRef}
      role="img"
      aria-label={label}
      className="relative size-full touch-pan-y select-none"
      style={{ cursor: grabbing ? 'grabbing' : 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <canvas ref={canvasRef} aria-hidden className="absolute inset-x-0 top-0 block" style={{ width: L.W, height: L.H }} />
      {W > 0 ? (
        <svg aria-hidden width={L.W} height={H + 20 * rows} className="pointer-events-none absolute inset-x-0 top-0 block overflow-visible" fontSize={fontSize}>
          <line x1={xAt(6)} x2={xAt(18)} y1={axisY} y2={axisY} stroke={ink.grid} strokeWidth={1} />
          {HOURS.map((h) => (
            <line key={h} x1={xAt(h)} x2={xAt(h)} y1={axisY - 3} y2={axisY + 3} stroke={ink.grid} strokeWidth={1} />
          ))}
          {hourLabels.map((h) => (
            <text key={h} x={xAt(h)} y={axisY + 16} textAnchor={h === 6 ? 'start' : h === 18 ? 'end' : 'middle'} fill={ink.muted}>
              {hourText(h)}
            </text>
          ))}
          {day ? (
            <g>
              <line x1={xAt(set)} x2={xAt(set)} y1={axisY - 7} y2={axisY + 3} stroke={ink.fg} strokeWidth={1.5} />
              <text x={xAt(set) - 5} y={axisY - 10} textAnchor="end" fill={ink.muted}>Sunset {clockText(set)}</text>
            </g>
          ) : null}
          {spanBar ? <rect x={spanBar.x} y={axisY - 2} width={spanBar.w} height={4} fill={ink.fg} /> : null}
          {orbits.map((o) => {
            const x = xAt(o.time)
            const pos = placed.get(o.id)!
            const y = rowY(pos.row)
            return (
              <g key={o.id}>
                <line x1={x} x2={x} y1={axisY + 6} y2={y + 4} stroke={ink.grid} strokeWidth={1} />
                {o.marker === 'filled' ? (
                  <circle cx={x} cy={axisY} r={5} fill={o.color} stroke={ink.ground} strokeWidth={2} />
                ) : o.marker === 'hollow' ? (
                  <circle cx={x} cy={axisY} r={4} fill={ink.ground} stroke={o.color} strokeWidth={2} />
                ) : (
                  <rect x={x - 3.5} y={axisY - 3.5} width={7} height={7} fill={o.color} transform={`rotate(45 ${x} ${axisY})`} />
                )}
                {o.flag ? (
                  (() => {
                    // a solid flag in the orbit's colour, hung as the label would be
                    const w = widthOf(o)
                    const left = pos.anchor === 'end' ? pos.tx - w + 7 : pos.anchor === 'middle' ? pos.tx - w / 2 : pos.tx - 7
                    return (
                      <g>
                        <rect x={left} y={y - 13} width={w} height={20} rx={3} fill={o.color} />
                        <text x={left + 7} y={y} fill={ink.ground} fontWeight={500}>
                          {o.label}{compact ? null : ` ${o.timeText}`}
                          <tspan fontWeight={400} fillOpacity={0.75}> {o.flag}</tspan>
                        </text>
                      </g>
                    )
                  })()
                ) : (
                  <text x={pos.tx} y={y} textAnchor={pos.anchor} fill={o.labelColor ?? ink.fg}>
                    {o.label}
                    {compact ? null : <tspan fill={o.labelColor ?? ink.muted}> {o.timeText}</tspan>}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      ) : null}
    </div>
    {turned ? (
      <button
        type="button"
        onClick={reset}
        className="absolute right-0 top-0 rounded px-3 py-2 text-xs"
        style={{ color: ink.fg, background: ink.ground, border: `1px solid ${ink.grid}` }}
      >
        Back to the Sun’s view
      </button>
    ) : null}
    </div>
  )
}

export default OrbitGlobe
