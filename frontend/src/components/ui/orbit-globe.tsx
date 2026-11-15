/**
 * Orbit globe: the Earth seen from the Sun's side, turning, with the orbits of the satellites that look at it. Adapted
 * from the 21st.dev "Wireframe Dotted Globe" (moazamtrade): a turning halftone globe with a faint graticule and thin
 * coastlines on black, here drawn in the caller's colours. The satellites ride above the surface as in "Globe Satellites"
 * (shuding), with fading trails after "Orbital Hero Section" (yura).
 *
 * The view is physical. The reader looks from the Sun, so the whole face is lit and no sun is drawn: morning is the left
 * edge, noon the middle, evening the right edge. A sun-synchronous orbit keeps the same angle to the sunlight, so each
 * orbit is a hoop over the poles that stays put while the Earth turns under it, and its ground track is the line of one
 * local time. A region carried across the face passes under each track at that satellite's look time. Orbits are drawn
 * higher than their 700 km so they clear the globe; the Earth's turn and the orbits keep their real ratio, about 14.6
 * orbits a day.
 */
import * as React from 'react'
import { COAST, LAND, LAT_ROWS } from '@/r2/globe-land'
import { cn } from '@/lib/utils'
import { useMeasuredWidth } from '@/components/ui/series-chart'

export interface GlobeOrbit {
  id: string
  label: string
  /** local time, in hours, of the satellite's look */
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
  /** the region, lit on the globe: [west, south, east, north] in degrees */
  region?: { name: string; bbox: readonly [number, number, number, number] }
  /** a bar on the time line between two orbits' times, e.g. the minutes Aqua has added to the fixed clock */
  span?: { from: string; to: string }
  /** turn the Earth and fly the satellites; false holds one still moment, the region at noon */
  running: boolean
  ink: GlobeInk
  /** what a screen reader hears for the whole figure */
  label: string
}

const RAD = Math.PI / 180
const TAU = Math.PI * 2
const INCLINATION = 98.2 * RAD
const ORBIT_SECONDS = 6
const DAY_SECONDS = ORBIT_SECONDS * 14.6
const TRAIL = 0.24 // of an orbit
const HOURS = Array.from({ length: 13 }, (_, i) => 6 + i)

/** how far east of the noon line a local time sits */
const angleOf = (hours: number) => (hours - 12) * 15 * RAD

/** view axes: x east (right), y north (up), z toward the Sun and the reader */
type V3 = [number, number, number]

/** A unit vector along the orbit at argument of latitude u (0 at the ascending node). */
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

/** just north of the day-side equator, in front of the globe */
const stillU = (dayPass: 'north' | 'south') => (dayPass === 'north' ? 0.5 : Math.PI - 0.5)

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

/** The land as unit vectors on the sphere, once. */
const DOTS = (() => {
  let n = 0
  for (const row of LAND) for (let q = 2; q < row.length; q += 2) n += row[q + 1]
  const lon = new Float32Array(n), cl = new Float32Array(n), sl = new Float32Array(n), lonDeg = new Float32Array(n), latDeg = new Float32Array(n)
  let k = 0
  for (const row of LAND) {
    const lat = -90 + ((row[0] + 0.5) * 180) / LAT_ROWS
    const cells = row[1]
    for (let q = 2; q < row.length; q += 2) {
      for (let i = row[q]; i < row[q] + row[q + 1]; i++) {
        const lo = -180 + ((i + 0.5) * 360) / cells
        lon[k] = lo * RAD; cl[k] = Math.cos(lat * RAD); sl[k] = Math.sin(lat * RAD); lonDeg[k] = lo; latDeg[k] = lat
        k++
      }
    }
  }
  return { n, lon, cl, sl, lonDeg, latDeg, step: (180 / LAT_ROWS) * RAD }
})()

interface Layout { W: number; H: number; cx: number; cy: number; R: number; Ro: number; axisY: number; compact: boolean }

function layoutFor(W: number): Layout {
  const compact = W < 560
  const R = Math.max(96, Math.min(compact ? 150 : 232, W * (compact ? 0.36 : 0.3)))
  const Ro = R * 1.18
  const cy = 14 + Ro
  const axisY = cy + Ro + 24
  return { W, H: Math.round(axisY + (compact ? 70 : 76)), cx: W / 2, cy, R, Ro, axisY, compact }
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

export function OrbitGlobe({ orbits, region, span, running, ink, label, className, style, ...props }: OrbitGlobeProps) {
  const boxRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const W = useMeasuredWidth(boxRef)
  const L = React.useMemo(() => layoutFor(W || 360), [W])
  const [inView, setInView] = React.useState(false)
  const live = running && inView
  const inkKey = JSON.stringify(ink)
  const orbitsKey = orbits.map((o) => `${o.id}:${o.time}:${o.color}`).join('|')
  const regionKey = region ? `${region.name}:${region.bbox.join(',')}` : ''

  // read by the drawing loop, so a change of year never restarts the Earth's turn
  const orbitsRef = React.useRef(orbits)
  orbitsRef.current = orbits
  const angles = React.useRef(new Map<string, number>())
  const clock = React.useRef({ t: 0, last: 0 })
  const scene = React.useRef<null | { draw: (dt: number, isLive: boolean) => void }>(null)

  React.useEffect(() => {
    const el = boxRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // the scene for this size, these colours and this region; a frame is drawn on demand
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
    const font = `${L.compact ? 12 : 13}px ${getComputedStyle(box).fontFamily}`
    const { cx, cy, R, Ro } = L

    // the region's dots, and its centre
    const inRegion = new Uint8Array(DOTS.n)
    let rLon = 0, rLat = 0
    if (region) {
      const [w, s, e, nn] = region.bbox
      for (let k = 0; k < DOTS.n; k++) inRegion[k] = DOTS.lonDeg[k] >= w && DOTS.lonDeg[k] <= e && DOTS.latDeg[k] >= s && DOTS.latDeg[k] <= nn ? 1 : 0
      rLon = (w + e) / 2
      rLat = (s + nn) / 2
    }
    // where the Earth starts: still, the region at noon; running, the region just before the morning look
    const startLon = (isLive: boolean) => rLon + (isLive ? 37.5 : 0)
    const BUCKETS = 6
    const buckets: number[][] = Array.from({ length: BUCKETS * 2 }, () => [])
    const dotR = Math.max(0.6, R * DOTS.step * 0.3)
    const pulses: { color: string; start: number }[] = []
    let lastLocal: number | null = null
    let wasLive = false

    const project = (lonRad: number, cl: number, sl: number, lc: number): V3 => {
      const d = lonRad - lc
      return [cl * Math.sin(d), sl, cl * Math.cos(d)]
    }

    const draw = (dt: number, isLive: boolean) => {
      if (isLive !== wasLive) { pulses.length = 0; lastLocal = null; wasLive = isLive }
      const t = clock.current.t
      const list = orbitsRef.current
      const colorOf = new Map(list.map((o) => [o.id, resolveColor(box, o.color)]))
      for (const o of list) {
        const goal = angleOf(o.time)
        const cur = angles.current.get(o.id)
        if (cur == null || !isLive) { angles.current.set(o.id, goal); continue }
        const next = cur + (goal - cur) * (1 - Math.exp(-dt / 0.14))
        angles.current.set(o.id, Math.abs(goal - next) < 1e-4 ? goal : next)
      }
      // the longitude under the Sun: the Earth turns east, so it runs west
      const lcDeg = startLon(isLive) - (isLive ? (t / DAY_SECONDS) * 360 : 0)
      const lc = lcDeg * RAD
      const satU = (o: GlobeOrbit) => (isLive ? (t / ORBIT_SECONDS) * TAU + (o.phase ?? 0) * TAU : stillU(o.dayPass))
      const S = (p: V3, r: number) => [cx + p[0] * r, cy - p[1] * r] as const

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, L.W, L.H)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const hoop = (o: GlobeOrbit, front: boolean) => {
        const a = angles.current.get(o.id) ?? angleOf(o.time)
        const c = colorOf.get(o.id) ?? col.fg
        // the orbit in space: clear where it stands off the globe, barely there across the face
        ctx.lineWidth = 1
        const inner = (R / Ro) ** 2
        for (const off of [true, false]) {
          ctx.strokeStyle = withAlpha(c, front ? (off ? 0.34 : 0.08) : 0.12)
          ctx.beginPath()
          let pen = false
          for (let s = 0; s <= 240; s++) {
            const p = orbitPoint(a, o.dayPass, (s / 240) * TAU)
            const outside = p[0] * p[0] + p[1] * p[1] > inner
            if ((p[2] >= 0) !== front || outside !== off) { pen = false; continue }
            const [x, y] = S(p, Ro)
            if (pen) ctx.lineTo(x, y)
            else { ctx.moveTo(x, y); pen = true }
          }
          ctx.stroke()
        }
        // the trail, then the satellite in the page's marker for it
        const u = satU(o)
        const n = 36
        ctx.lineWidth = 2
        for (let s = 0; s < n; s++) {
          const p1 = orbitPoint(a, o.dayPass, u - TRAIL * TAU * (1 - s / n))
          const p2 = orbitPoint(a, o.dayPass, u - TRAIL * TAU * (1 - (s + 1) / n))
          if ((p1[2] >= 0) !== front) continue
          ctx.strokeStyle = withAlpha(c, 0.85 * ((s + 1) / n) ** 1.6)
          ctx.beginPath()
          ctx.moveTo(...S(p1, Ro))
          ctx.lineTo(...S(p2, Ro))
          ctx.stroke()
        }
        const p = orbitPoint(a, o.dayPass, u)
        if ((p[2] >= 0) !== front) return
        const [x, y] = S(p, Ro)
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

      // behind the globe
      for (const o of list) hoop(o, false)

      // the globe, lit face-on: brightest under the Sun, darkening to sunrise and sunset at the edges
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU)
      ctx.fillStyle = col.surface; ctx.fill()
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
      glow.addColorStop(0, withAlpha(col.fg, 0.1))
      glow.addColorStop(0.75, withAlpha(col.fg, 0.03))
      glow.addColorStop(1, 'rgba(0, 0, 0, 0.32)')
      ctx.fillStyle = glow; ctx.fill()

      // graticule: meridians every 30° turning with the Earth, parallels every 30°, the equator a little firmer
      ctx.lineWidth = 1
      const line = (pts: V3[], alpha: number) => {
        ctx.strokeStyle = withAlpha(col.land, alpha)
        ctx.beginPath()
        let pen = false
        for (const p of pts) {
          if (p[2] <= 0) { pen = false; continue }
          const [x, y] = S(p, R)
          if (pen) ctx.lineTo(x, y)
          else { ctx.moveTo(x, y); pen = true }
        }
        ctx.stroke()
      }
      for (let m = -180; m < 180; m += 30) {
        const pts: V3[] = []
        for (let la = -90; la <= 90; la += 5) pts.push(project(m * RAD, Math.cos(la * RAD), Math.sin(la * RAD), lc))
        line(pts, 0.1)
      }
      for (const la of [-60, -30, 0, 30, 60]) {
        const pts: V3[] = []
        for (let m = -180; m <= 180; m += 5) pts.push(project(m * RAD, Math.cos(la * RAD), Math.sin(la * RAD), lc))
        line(pts, la === 0 ? 0.22 : 0.1)
      }

      // land: halftone dots, brighter toward the middle of the face; the region's in the text colour
      for (const b of buckets) b.length = 0
      for (let k = 0; k < DOTS.n; k++) {
        const d = DOTS.lon[k] - lc
        const z = DOTS.cl[k] * Math.cos(d)
        if (z <= 0.02) continue
        const x = cx + R * DOTS.cl[k] * Math.sin(d)
        const y = cy - R * DOTS.sl[k]
        const bi = Math.min(BUCKETS - 1, Math.floor(z * BUCKETS)) + (inRegion[k] ? BUCKETS : 0)
        buckets[bi].push(x, y)
      }
      for (let bi = 0; bi < buckets.length; bi++) {
        const pts = buckets[bi]
        if (!pts.length) continue
        const lit = ((bi % BUCKETS) + 0.5) / BUCKETS
        const mine = bi >= BUCKETS
        ctx.fillStyle = withAlpha(mine ? col.fg : col.land, mine ? 0.45 + 0.55 * lit : 0.22 + 0.6 * lit)
        const r = mine ? dotR * 1.25 : dotR
        ctx.beginPath()
        for (let q = 0; q < pts.length; q += 2) { ctx.moveTo(pts[q] + r, pts[q + 1]); ctx.arc(pts[q], pts[q + 1], r, 0, TAU) }
        ctx.fill()
      }

      // coastlines
      ctx.strokeStyle = withAlpha(col.land, 0.4)
      ctx.lineWidth = 0.75
      ctx.beginPath()
      for (const c of COAST) {
        let pen = false
        for (let q = 0; q < c.length; q += 2) {
          const lo = (c[q] / 10) * RAD, la = (c[q + 1] / 10) * RAD
          const p = project(lo, Math.cos(la), Math.sin(la), lc)
          if (p[2] <= 0) { pen = false; continue }
          const [x, y] = S(p, R)
          if (pen) ctx.lineTo(x, y)
          else { ctx.moveTo(x, y); pen = true }
        }
      }
      ctx.stroke()

      // each satellite's ground track: the line of its local time, where it looks
      for (const o of list) {
        const a = angles.current.get(o.id) ?? angleOf(o.time)
        ctx.strokeStyle = withAlpha(colorOf.get(o.id) ?? col.fg, 0.75)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        let pen = false
        for (let s = 0; s <= 200; s++) {
          const p = orbitPoint(a, o.dayPass, (s / 200) * TAU)
          if (p[2] <= 0) { pen = false; continue }
          const [x, y] = S(p, R)
          if (pen) ctx.lineTo(x, y)
          else { ctx.moveTo(x, y); pen = true }
        }
        ctx.stroke()
      }

      // the limb
      ctx.strokeStyle = withAlpha(col.fg, 0.3)
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke()

      // the region: a look pulses from it as it passes under each track; its name rides with it
      if (region) {
        const p = project(rLon * RAD, Math.cos(rLat * RAD), Math.sin(rLat * RAD), lc)
        const local = (((12 + (rLon - lcDeg) / 15) % 24) + 24) % 24
        if (isLive && lastLocal != null && local > lastLocal && local - lastLocal < 1) {
          for (const o of list) if (lastLocal < o.time && local >= o.time) pulses.push({ color: colorOf.get(o.id) ?? col.fg, start: t })
        }
        lastLocal = local
        if (p[2] > 0.05) {
          const [x, y] = S(p, R)
          const top = region.bbox[3] + 2.5
          const [nx, ny] = S(project(rLon * RAD, Math.cos(top * RAD), Math.sin(top * RAD), lc), R)
          for (let q = pulses.length - 1; q >= 0; q--) {
            const age = t - pulses[q].start
            if (age > 1.2) { pulses.splice(q, 1); continue }
            const k = age / 1.2
            ctx.strokeStyle = withAlpha(pulses[q].color, 0.9 * (1 - k))
            ctx.lineWidth = 2
            ctx.beginPath(); ctx.arc(x, y, 6 + 26 * Math.sqrt(k), 0, TAU); ctx.stroke()
          }
          ctx.globalAlpha = Math.min(1, (p[2] - 0.05) / 0.25)
          ctx.font = font
          ctx.textBaseline = 'bottom'
          ctx.textAlign = 'center'
          ctx.lineWidth = 4
          ctx.strokeStyle = col.ground
          ctx.strokeText(region.name, nx, ny - 4)
          ctx.fillStyle = col.fg
          ctx.fillText(region.name, nx, ny - 4)
          ctx.textAlign = 'start'
          ctx.globalAlpha = 1
        }
      }

      // in front of the globe
      for (const o of list) hoop(o, true)
    }
    scene.current = { draw }
    draw(0, live)
    return () => { scene.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, L, inkKey, regionKey])

  // a change of year redraws the still view (the running loop eases it in on its own)
  React.useEffect(() => {
    if (!live) scene.current?.draw(0, false)
  }, [orbitsKey, live])

  // the running clock: only while motion is on and the figure is on screen
  React.useEffect(() => {
    if (!live) return
    let raf = 0
    clock.current.last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - clock.current.last) / 1000)
      clock.current.last = now
      clock.current.t += dt
      scene.current?.draw(dt, true)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [live])

  // the time line under the globe: the day from sunrise to sunset, where each track crosses the equator
  const { cx, R, axisY, compact, H } = L
  const xAt = (h: number) => cx + R * Math.sin(angleOf(h))
  const hourLabels = compact ? [6, 12, 18] : [6, 9, 12, 15, 18]
  const hourText = (h: number) => (compact ? String(h).padStart(2, '0') : `${String(h).padStart(2, '0')}:00`)
  const text = (o: GlobeOrbit) => (compact ? o.label : `${o.label} ${o.timeText}`)
  const charW = compact ? 6.6 : 7.4
  const placed = placeLabels(orbits.map((o) => ({ id: o.id, x: xAt(o.time), w: text(o).length * charW })), L.W)
  const spanBar = (() => {
    if (!span) return null
    const a = orbits.find((o) => o.id === span.from)
    const b = orbits.find((o) => o.id === span.to)
    if (!a || !b) return null
    const x1 = xAt(a.time), x2 = xAt(b.time)
    return Math.abs(x2 - x1) < 1 ? null : { x: Math.min(x1, x2), w: Math.abs(x2 - x1) }
  })()
  const rowY = (row: number) => axisY + (compact ? 36 : 40) + row * 20

  return (
    <div ref={boxRef} role="img" aria-label={label} className={cn('relative w-full', className)} style={{ height: H, ...style }} {...props}>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block" style={{ width: L.W, height: L.H }} />
      {W > 0 ? (
        <svg aria-hidden width={L.W} height={L.H} className="absolute inset-0 block overflow-visible" fontSize={compact ? 12 : 13}>
          <line x1={xAt(6)} x2={xAt(18)} y1={axisY} y2={axisY} stroke={ink.grid} strokeWidth={1} />
          {HOURS.map((h) => (
            <line key={h} x1={xAt(h)} x2={xAt(h)} y1={axisY - 3} y2={axisY + 3} stroke={ink.grid} strokeWidth={1} />
          ))}
          {hourLabels.map((h) => (
            <text key={h} x={xAt(h)} y={axisY + 16} textAnchor={h === 6 ? 'start' : h === 18 ? 'end' : 'middle'} fill={ink.muted}>
              {hourText(h)}
            </text>
          ))}
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
                <text x={pos.tx} y={y} textAnchor={pos.anchor} fill={ink.fg}>
                  {o.label}
                  {compact ? null : <tspan fill={ink.muted}> {o.timeText}</tspan>}
                </text>
              </g>
            )
          })}
        </svg>
      ) : null}
    </div>
  )
}

export default OrbitGlobe
