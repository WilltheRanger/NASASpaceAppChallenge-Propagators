/**
 * CIRCULARIUM RING — adapted from 21st.dev "Circularium Ring" by daiwiikharihar
 * (https://21st.dev/@daiwiikharihar/components/circularium-ring).
 *
 * Original: a 24-hour radial heatmap (7 weekday rings × 24 hourly sectors) that morphs
 * between a flat 2D ring and a 3D isometric histogram, with orbit, hover, keyboard
 * navigation and an interactive legend.
 * Changes for Anchor: rings can be any labelled rows (years), values are any number up to
 * `maxValue` (no rounding), the hour at the top is configurable (`topHour`), tooltips and
 * the subtitle are passed in, and the weekday filter is off by default.
 * The rendering engine is the original's.
 */
import * as React from 'react'

export type RGB = [number, number, number]
const clamp01 = (v: number) => (v > 0 ? (v < 1 ? v : 1) : 0)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeInOutCubic = (x: number) => { const t = clamp01(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const luminance = (c: RGB) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255
const rgbString = (r: number, g: number, b: number) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`
const WAVE = 0.42
const riseAt = (t: number, order: number) => easeOutCubic((t - order * 0.36) / (1 - WAVE))
const YAW_3D = Math.PI / 4
const ELEV_3D = (34 * Math.PI) / 180
const YAW_RANGE: [number, number] = [(8 * Math.PI) / 180, (82 * Math.PI) / 180]
const ELEV_RANGE: [number, number] = [(18 * Math.PI) / 180, (62 * Math.PI) / 180]
type Cam = { cs: number; sn: number; se: number; ce: number }
const camera = (e: number, dYaw = 0, dElev = 0): Cam => {
  const yaw = Math.min(YAW_RANGE[1], Math.max(0, lerp(0, YAW_3D + dYaw, e)))
  const elev = lerp(Math.PI / 2, Math.min(ELEV_RANGE[1], Math.max(ELEV_RANGE[0], ELEV_3D + dElev)), e)
  return { cs: Math.cos(yaw), sn: Math.sin(yaw), se: Math.sin(elev), ce: Math.cos(elev) }
}
const project = (c: Cam, x: number, y: number, z: number): [number, number] => [x * c.cs - y * c.sn, (x * c.sn + y * c.cs) * c.se - z * c.ce]
const pad2 = (n: number) => String(n).padStart(2, '0')
const sector = (r0: number, r1: number, a0: number, a1: number, gap = 0.035): number[] => {
  const p = a0 + gap, q = a1 - gap
  return [Math.cos(p) * r0, Math.sin(p) * r0, Math.cos(p) * r1, Math.sin(p) * r1, Math.cos(q) * r1, Math.sin(q) * r1, Math.cos(q) * r0, Math.sin(q) * r0]
}
const pointInQuad = (p: Float32Array, o: number, x: number, y: number) => {
  let sign = 0
  for (let k = 0; k < 4; k++) {
    const ax = p[o + k * 2], ay = p[o + k * 2 + 1], bx = p[o + ((k + 1) % 4) * 2], by = p[o + ((k + 1) % 4) * 2 + 1]
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax)
    if (Math.abs(cross) < 1e-9) continue
    const s = cross > 0 ? 1 : -1
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return sign !== 0
}
const quadPath = (ctx: CanvasRenderingContext2D, p: Float32Array, o: number, r: number) => {
  if (r < 0.3) { ctx.moveTo(p[o], p[o + 1]); ctx.lineTo(p[o + 2], p[o + 3]); ctx.lineTo(p[o + 4], p[o + 5]); ctx.lineTo(p[o + 6], p[o + 7]); ctx.closePath(); return }
  ctx.moveTo((p[o + 6] + p[o]) / 2, (p[o + 7] + p[o + 1]) / 2)
  for (let k = 0; k < 4; k++) { const b = (k + 1) % 4; ctx.arcTo(p[o + k * 2], p[o + k * 2 + 1], p[o + b * 2], p[o + b * 2 + 1], r) }
  ctx.closePath()
}

export type PaletteName = 'ocean' | 'ember' | 'mono'
export type PaletteInput = PaletteName | string[] | { light: string[]; dark: string[] }
export const PALETTES: Record<PaletteName, { light: string[]; dark: string[] }> = {
  ocean: { light: ['#b8e3f5', '#6ec3eb', '#2a8fd1', '#0b4f8a'], dark: ['#0c2d4a', '#12508a', '#2a88d8', '#7cc7ff'] },
  ember: { light: ['#fde2c4', '#fbad6e', '#f06b3a', '#b3261e'], dark: ['#4a1a10', '#8f2f16', '#e0572a', '#ffa46b'] },
  mono: { light: ['#d4d4d4', '#a3a3a3', '#525252', '#171717'], dark: ['#333333', '#5c5c5c', '#a3a3a3', '#fafafa'] },
}
let colorProbe: CanvasRenderingContext2D | null = null
const toRGB = (color: string, fallback: RGB | null): RGB | null => {
  if (typeof document === 'undefined') return fallback
  if (!colorProbe) { const c = document.createElement('canvas'); c.width = c.height = 1; colorProbe = c.getContext('2d', { willReadFrequently: true }) }
  if (!colorProbe) return fallback
  try {
    colorProbe.clearRect(0, 0, 1, 1); colorProbe.fillStyle = 'rgba(0,0,0,0)'; colorProbe.fillStyle = color; colorProbe.fillRect(0, 0, 1, 1)
    const d = colorProbe.getImageData(0, 0, 1, 1).data
    if (d[3] < 8) return fallback
    return [d[0], d[1], d[2]]
  } catch { return fallback }
}
const resolvePalette = (p: PaletteInput | undefined, dark: boolean): string[] => {
  const base = PALETTES.ocean[dark ? 'dark' : 'light']
  const pick = Array.isArray(p) ? p : p && typeof p === 'object' ? (dark ? p.dark : p.light) : PALETTES[(p as PaletteName) ?? 'ocean']?.[dark ? 'dark' : 'light'] ?? base
  return [0, 1, 2, 3].map((i) => pick[i] ?? pick[pick.length - 1] ?? base[i])
}

interface RingBox { pts: number[]; h: number; z0?: number; lv: number; order: number; tip: string }
export type ViewMode = '2d' | '3d'

export interface CirculariumRingProps {
  /** rows × `sectors` values, 0..maxValue */
  data: number[][]
  /** sectors around the ring: 24 = hourly, 48 = half-hourly */
  sectors?: number
  /** one label per row (innermost first), e.g. years */
  rowLabels: string[]
  maxValue?: number
  /** the hour drawn at the top of the ring (0 = midnight, 12 = noon) */
  topHour?: number
  cellTip?: (row: number, hour: number, value: number) => string
  title?: React.ReactNode
  subtitle?: React.ReactNode
  hint?: React.ReactNode
  palette?: PaletteInput
  view?: ViewMode
  defaultView?: ViewMode
  onViewChange?: (view: ViewMode) => void
  orbit?: boolean
  showToggle?: boolean
  showLegend?: boolean
  legendLabels?: [string, string]
  className?: string
}

const GridIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="shrink-0">
    <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" fill="currentColor" /><rect x="9" y="1.5" width="5.5" height="5.5" rx="1" fill="currentColor" />
    <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" fill="currentColor" /><rect x="9" y="9" width="5.5" height="5.5" rx="1" fill="currentColor" />
  </svg>
)
const CubeIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="shrink-0">
    <path d="M8 1.2 14.2 4.6v6.8L8 14.8 1.8 11.4V4.6Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M1.8 4.6 8 8l6.2-3.4M8 8v6.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
)

export function CirculariumRing({
  data,
  rowLabels,
  maxValue = 60,
  sectors = 24,
  topHour = 0,
  cellTip,
  title = '24-hour ring',
  subtitle,
  hint,
  palette = 'ocean',
  view: controlledView,
  defaultView = '3d',
  onViewChange,
  orbit = true,
  showToggle = true,
  showLegend = true,
  legendLabels = ['Low', 'High'],
  className = '',
}: CirculariumRingProps) {
  const [internalView, setInternalView] = React.useState<ViewMode>(defaultView)
  const view = controlledView ?? internalView
  const setView = (next: ViewMode) => { if (controlledView === undefined) setInternalView(next); onViewChange?.(next) }
  const [swatches, setSwatches] = React.useState<string[]>(() => ['#ebedf0', ...resolvePalette(palette, false)])
  const [legendLevel, setLegendLevel] = React.useState(-1)
  const [announce, setAnnounce] = React.useState('')

  const rootRef = React.useRef<HTMLElement>(null)
  const stageRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const tipRef = React.useRef<HTMLDivElement>(null)
  const tipBRef = React.useRef<HTMLElement>(null)
  const tipSRef = React.useRef<HTMLSpanElement>(null)

  const spec = React.useMemo(() => {
    const boxes: RingBox[] = []
    const rot = (h: number) => -Math.PI / 2 + ((h - topHour) / 24) * Math.PI * 2
    for (let d = 0; d < rowLabels.length; d++) {
      for (let k = 0; k < sectors; k++) {
        const h = (k * 24) / sectors
        const m = data[d]?.[k] ?? 0
        const a0 = rot(h)
        const r0 = 3.2 + d * 1.05
        boxes.push({
          pts: sector(r0, r0 + 0.95, a0, a0 + (Math.PI * 2) / sectors, sectors > 24 ? 0.02 : 0.035),
          h: 0.25 + (Math.max(0, m) / maxValue) * 6,
          z0: 0,
          lv: (Math.max(0, m) / maxValue) * 4,
          order: h / 24,
          tip: cellTip ? cellTip(d, h, m) : `${rowLabels[d]} ${pad2(Math.floor(h))}:${pad2(Math.round((h % 1) * 60))}\n${m}`,
        })
      }
    }
    const labels = [0, 6, 12, 18].map((h) => {
      const a = rot(h + 0.5)
      return { x: Math.cos(a) * (3.2 + rowLabels.length * 1.05 + 1.6), y: Math.sin(a) * (3.2 + rowLabels.length * 1.05 + 1.6), text: `${pad2(h)}:00` }
    })
    return { boxes, labels, label: typeof title === 'string' ? title : '24-hour ring' }
  }, [data, rowLabels, maxValue, sectors, topHour, cellTip, title])

  const cfg = React.useRef({ spec, orbit, palette, legendLevel, sectors, target: view === '3d' ? 1 : 0, setSwatches, setAnnounce })
  cfg.current = { spec, orbit, palette, legendLevel, sectors, target: view === '3d' ? 1 : 0, setSwatches, setAnnounce }
  const engineRef = React.useRef<{ kick: () => void; load: () => void; retheme: () => void } | null>(null)

  React.useEffect(() => {
    const root = rootRef.current, stage = stageRef.current, canvas = canvasRef.current, tip = tipRef.current, tipB = tipBRef.current, tipS = tipSRef.current
    if (!root || !stage || !canvas || !tip || !tipB || !tipS) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const darkMq = window.matchMedia('(prefers-color-scheme: dark)')
    let reduced = reduceMq.matches
    let t = 0, target = cfg.current.target, entered = false, inView = true
    let yaw = 0, elev = 0, yawGoal = 0, elevGoal = 0, W = 0, Hmax = 0, dpr = 1
    let font = '10px sans-serif'
    const col = new Float32Array(15), colGoal = new Float32Array(15)
    let colReady = false
    let fg: RGB = [23, 23, 23], bg: RGB = [255, 255, 255]
    let boxes: RingBox[] = []
    let n = 0
    let cp = new Float32Array(0), cz = new Float32Array(0), cb = new Float32Array(0), cl = new Float32Array(0), dep = new Float32Array(0), hover = new Float32Array(0), dim = new Float32Array(0), polys = new Float32Array(0)
    let sides = new Uint8Array(0), vis = new Uint8Array(0)
    let order: number[] = []
    let hovered = -1, pinned = -1, activeIdx = -1, tipW = 0, lastTip = '', raf = 0, last = 0

    const load = () => {
      boxes = cfg.current.spec.boxes
      const m = boxes.length
      if (m !== n || cp.length !== m * 8) {
        n = m
        cp = new Float32Array(m * 8); cz = new Float32Array(m); cb = new Float32Array(m); cl = new Float32Array(m); dep = new Float32Array(m); hover = new Float32Array(m); dim = new Float32Array(m)
        polys = new Float32Array(m * 40); sides = new Uint8Array(m); vis = new Uint8Array(m)
        order = Array.from({ length: m }, (_, i) => i)
        for (let i = 0; i < m; i++) { const b = boxes[i]; for (let j = 0; j < 8; j++) cp[i * 8 + j] = b.pts[j]; cz[i] = b.h; cb[i] = b.z0 ?? 0; cl[i] = b.lv }
      }
      if (hovered >= n) hovered = -1
      if (pinned >= n) pinned = -1
      if (activeIdx >= n) { activeIdx = -1; tip.style.opacity = '0' }
    }

    const retheme = () => {
      const cs = getComputedStyle(root)
      const doc = document.documentElement
      const isDocDark = root.closest('.dark') !== null || doc.classList.contains('dark')
      fg = toRGB(cs.color, isDocDark ? [240, 240, 240] : [23, 23, 23]) ?? (isDocDark ? [240, 240, 240] : [23, 23, 23])
      bg = toRGB(cs.backgroundColor, isDocDark ? [20, 20, 20] : [255, 255, 255]) ?? (isDocDark ? [20, 20, 20] : [255, 255, 255])
      const isDark = isDocDark || luminance(bg) < 0.45
      font = '500 10px ' + (cs.fontFamily || 'sans-serif')
      const pal = resolvePalette(cfg.current.palette, isDark)
      const empty = mixRGB(bg, fg, isDark ? 0.12 : 0.08)
      const fallbackColor: RGB = isDark ? [120, 200, 255] : [40, 140, 220]
      const all: RGB[] = [empty, ...pal.map((c) => toRGB(c, fallbackColor) ?? fallbackColor)]
      for (let k = 0; k < 5; k++) for (let ch = 0; ch < 3; ch++) colGoal[k * 3 + ch] = all[k][ch]
      if (!colReady || reduced) { col.set(colGoal); colReady = true }
      const sw = all.map((c) => rgbString(c[0], c[1], c[2]))
      cfg.current.setSwatches((prev) => (prev.join() === sw.join() ? prev : sw))
      kick()
    }

    const extent = (cam: Cam, e: number) => {
      let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity
      const add = (x: number, y: number, z: number) => { const p = project(cam, x, y, z); if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1] }
      for (let i = 0; i < n; i++) { const p = boxes[i].pts; for (let k = 0; k < 4; k++) { add(p[k * 2], p[k * 2 + 1], 0); add(p[k * 2], p[k * 2 + 1], boxes[i].h * e) } }
      for (const l of cfg.current.spec.labels ?? []) add(l.x, l.y, 0)
      if (!isFinite(minx)) return { minx: 0, maxx: 1, miny: 0, maxy: 1 }
      return { minx, maxx, miny, maxy }
    }

    const relayout = () => {
      const w = Math.round(stage.clientWidth)
      if (!w || !n) return
      W = w
      dpr = Math.min(2, window.devicePixelRatio || 1)
      const vh = window.innerHeight || 800
      const targetH = Math.max(260, Math.min(Math.round(W * 0.78), Math.min(Math.round(vh * 0.62), 460)))
      Hmax = targetH
      stage.style.height = `${targetH}px`
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hmax * dpr)
      canvas.style.width = `${W}px`; canvas.style.height = `${Hmax}px`
      draw()
    }

    const draw = () => {
      if (!W || !n) return
      const e = easeInOutCubic(t)
      const cam = camera(e, yaw, elev)
      const bx = extent(cam, e)
      const pad = lerp(8, 20, e)
      const aw = W - pad * 2, ah = Hmax - pad * 2
      const bw = Math.max(1e-6, bx.maxx - bx.minx), bh = Math.max(1e-6, bx.maxy - bx.miny)
      const s = Math.min(aw / bw, ah / bh)
      const ox = pad + (aw - bw * s) / 2 - bx.minx * s
      const oy = pad + (ah - bh * s) / 2 - bx.miny * s
      const { cs, sn, se, ce } = cam
      const px = (x: number, y: number) => ox + (x * cs - y * sn) * s
      const py = (x: number, y: number, z: number) => oy + ((x * sn + y * cs) * se - z * ce) * s
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, Hmax)
      for (let i = 0; i < n; i++) { const o = i * 8; dep[i] = ((cp[o] + cp[o + 2] + cp[o + 4] + cp[o + 6]) * sn + (cp[o + 1] + cp[o + 3] + cp[o + 5] + cp[o + 7]) * cs) / 4 }
      order.sort((a, c) => { const d = dep[a] - dep[c]; return Math.abs(d) > 1e-4 ? d : cb[a] - cb[c] })
      const rad = lerp(0.18, 0.04, e) * s
      const outline = (1 - e) * 0.08
      const lift = 0.65 * e
      const ex = col[0], ey = col[1], ez = col[2]
      for (let k = 0; k < n; k++) {
        const i = order[k]
        const b = boxes[i]
        if (cz[i] - cb[i] < 0.04) { vis[i] = 0; sides[i] = 0; continue }
        vis[i] = 1
        const o8 = i * 8, o = i * 40
        const rz = riseAt(t, b.order)
        const hv = hover[i]
        const zt = cz[i] * rz + hv * lift
        const zb = cb[i] * rz
        let a2 = 0
        for (let j = 0; j < 4; j++) {
          const jn = (j + 1) & 3
          const x = cp[o8 + j * 2], y = cp[o8 + j * 2 + 1]
          polys[o + j * 2] = px(x, y); polys[o + j * 2 + 1] = py(x, y, zt)
          a2 += x * cp[o8 + jn * 2 + 1] - cp[o8 + jn * 2] * y
        }
        const sg = a2 >= 0 ? 1 : -1
        const tall = (zt - zb) * ce * s > 0.35
        const lf = Math.max(0, Math.min(4, cl[i]))
        const k0 = Math.floor(lf), k1 = Math.min(4, k0 + 1), f = lf - k0
        let r = col[k0 * 3] * (1 - f) + col[k1 * 3] * f
        let g = col[k0 * 3 + 1] * (1 - f) + col[k1 * 3 + 1] * f
        let bl = col[k0 * 3 + 2] * (1 - f) + col[k1 * 3 + 2] * f
        const d = dim[i]
        if (d > 0.002) { r += (ex - r) * 0.72 * d; g += (ey - g) * 0.72 * d; bl += (ez - bl) * 0.72 * d }
        if (hv > 0.002) { const m = 0.22 * hv; r += (fg[0] - r) * m; g += (fg[1] - g) * m; bl += (fg[2] - bl) * m }
        let bits = 0
        for (let j = 0; j < 4; j++) {
          if (!tall) break
          const jn = (j + 1) & 3
          const xa = cp[o8 + j * 2], ya = cp[o8 + j * 2 + 1], xb = cp[o8 + jn * 2], yb = cp[o8 + jn * 2 + 1]
          const dx = xb - xa, dy = yb - ya, len = Math.hypot(dx, dy) || 1
          const nx = (sg * dy) / len, ny = (-sg * dx) / len
          if (nx * sn + ny * cs <= 0.02) continue
          bits |= 1 << j
          const q = o + 8 + j * 8
          polys[q] = px(xa, ya); polys[q + 1] = py(xa, ya, zb); polys[q + 2] = px(xb, yb); polys[q + 3] = py(xb, yb, zb)
          polys[q + 4] = polys[o + jn * 2]; polys[q + 5] = polys[o + jn * 2 + 1]; polys[q + 6] = polys[o + j * 2]; polys[q + 7] = polys[o + j * 2 + 1]
          const sh = Math.max(0.48, Math.min(0.96, 0.74 - 0.16 * (nx * cs - ny * sn)))
          ctx.beginPath(); quadPath(ctx, polys, q, 0); ctx.fillStyle = rgbString(r * sh, g * sh, bl * sh); ctx.fill()
        }
        sides[i] = bits
        ctx.beginPath(); quadPath(ctx, polys, o, rad); ctx.fillStyle = rgbString(r, g, bl); ctx.fill()
        if (outline > 0.004) { ctx.strokeStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},${outline.toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke() }
        if (hv > 0.02) { ctx.strokeStyle = `rgba(${fg[0]},${fg[1]},${fg[2]},${(0.88 * hv).toFixed(3)})`; ctx.lineWidth = 1.6; ctx.stroke() }
      }
      const labels = cfg.current.spec.labels
      if (labels && labels.length) {
        const muted = mixRGB(bg, fg, 0.62)
        ctx.font = font; ctx.fillStyle = rgbString(muted[0], muted[1], muted[2]); ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
        for (const l of labels) ctx.fillText(l.text, px(l.x, l.y), py(l.x, l.y, 0))
      }
      if (activeIdx >= 0 && activeIdx < n && vis[activeIdx]) {
        const i = activeIdx, o = i * 40, text = boxes[i].tip
        if (text !== lastTip) { lastTip = text; const parts = text.split('\n'); tipB.textContent = parts[0]; tipS.textContent = parts.slice(1).join(' · '); tipW = tip.offsetWidth }
        const tx = (polys[o] + polys[o + 2] + polys[o + 4] + polys[o + 6]) / 4
        const ty = Math.min(polys[o + 1], polys[o + 3], polys[o + 5], polys[o + 7])
        const half = tipW / 2
        const cx = Math.min(W - half - 4, Math.max(half + 4, tx))
        tip.style.transform = `translate(${(cx - half).toFixed(1)}px,${(ty - 8).toFixed(1)}px) translateY(-100%)`
        tip.style.setProperty('--arrow', `${(tx - cx + half).toFixed(1)}px`)
      }
    }

    const tick = (now: number) => {
      raf = 0
      if (!inView) return
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      let moving = false
      if (t !== target) { const step = reduced ? 1 : (dt * 1000) / 1300; t = target > t ? Math.min(target, t + step) : Math.max(target, t - step); moving = true }
      const ko = reduced ? 1 : 1 - Math.exp(-dt * 12)
      yaw += (yawGoal - yaw) * ko; elev += (elevGoal - elev) * ko
      if (Math.abs(yawGoal - yaw) > 1e-4 || Math.abs(elevGoal - elev) > 1e-4) moving = true
      else { yaw = yawGoal; elev = elevGoal }
      const kc = reduced ? 1 : 1 - Math.exp(-dt * 7)
      for (let k = 0; k < 15; k++) { const d = colGoal[k] - col[k]; if (Math.abs(d) > 0.4) { col[k] += d * kc; moving = true } else col[k] = colGoal[k] }
      const kh = reduced ? 1 : 1 - Math.exp(-dt * 9), kv = reduced ? 1 : 1 - Math.exp(-dt * 16), kd = reduced ? 1 : 1 - Math.exp(-dt * 10)
      const leg = cfg.current.legendLevel
      for (let i = 0; i < n; i++) {
        const b = boxes[i], o = i * 8
        for (let j = 0; j < 8; j++) { const dd = b.pts[j] - cp[o + j]; if (Math.abs(dd) > 0.0005) { cp[o + j] += dd * kh; moving = true } else cp[o + j] = b.pts[j] }
        const dz = b.h - cz[i]; if (Math.abs(dz) > 0.002) { cz[i] += dz * kh; moving = true } else cz[i] = b.h
        const dl = b.lv - cl[i]; if (Math.abs(dl) > 0.004) { cl[i] += dl * kh; moving = true } else cl[i] = b.lv
        const hg = i === activeIdx ? 1 : 0
        if (hover[i] !== hg) { hover[i] = Math.abs(hg - hover[i]) < 0.003 ? hg : hover[i] + (hg - hover[i]) * kv; moving = true }
        const dg = leg >= 0 && Math.round(b.lv) !== leg ? 1 : 0
        if (dim[i] !== dg) { dim[i] = Math.abs(dg - dim[i]) < 0.003 ? dg : dim[i] + (dg - dim[i]) * kd; moving = true }
      }
      draw()
      if (moving) raf = requestAnimationFrame(tick)
    }
    const kick = () => { if (raf) return; last = performance.now(); raf = requestAnimationFrame(tick) }
    const refreshActive = () => {
      const next = hovered >= 0 ? hovered : pinned
      if (next === activeIdx) return
      activeIdx = next; lastTip = ''
      tip.style.opacity = next >= 0 ? '1' : '0'
      tip.setAttribute('aria-hidden', next >= 0 ? 'false' : 'true')
      kick()
    }
    const hit = (x: number, y: number) => {
      for (let k = n - 1; k >= 0; k--) {
        const i = order[k]
        if (!vis[i]) continue
        const o = i * 40
        if (pointInQuad(polys, o, x, y)) return i
        for (let j = 0; j < 4; j++) if (sides[i] & (1 << j) && pointInQuad(polys, o + 8 + j * 8, x, y)) return i
      }
      return -1
    }
    const local = (ev: PointerEvent | MouseEvent) => { const r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top] as const }
    let drag: { id: number; x: number; y: number; yaw: number; elev: number; moved: boolean; orbit: boolean; mouse: boolean } | null = null
    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      const can = cfg.current.orbit && target === 1
      drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, yaw: yawGoal, elev: elevGoal, moved: false, orbit: can, mouse: ev.pointerType === 'mouse' }
      if (can) { try { canvas.setPointerCapture(ev.pointerId) } catch { /* ignore */ } }
    }
    const onMove = (ev: PointerEvent) => {
      if (drag && drag.orbit && ev.pointerId === drag.id) {
        const dx = ev.clientX - drag.x, dyy = ev.clientY - drag.y
        if (drag.moved || Math.hypot(dx, dyy) > 4) {
          drag.moved = true
          yawGoal = Math.min(YAW_RANGE[1] - YAW_3D, Math.max(YAW_RANGE[0] - YAW_3D, drag.yaw + dx * 0.006))
          if (drag.mouse) elevGoal = Math.min(ELEV_RANGE[1] - ELEV_3D, Math.max(ELEV_RANGE[0] - ELEV_3D, drag.elev + dyy * 0.004))
          canvas.style.cursor = 'grabbing'; hovered = -1; refreshActive(); kick(); return
        }
      }
      if (ev.pointerType !== 'mouse') return
      const [x, y] = local(ev)
      const i = hit(x, y)
      if (i !== hovered) { hovered = i; refreshActive() }
      canvas.style.cursor = cfg.current.orbit && target === 1 ? 'grab' : i >= 0 ? 'pointer' : 'default'
    }
    const onUp = (ev: PointerEvent) => {
      if (!drag || ev.pointerId !== drag.id) return
      const wasMoved = drag.moved
      drag = null
      if (canvas.hasPointerCapture(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId)
      canvas.style.cursor = cfg.current.orbit && target === 1 ? 'grab' : 'default'
      if (wasMoved) return
      const [x, y] = local(ev)
      const i = hit(x, y)
      pinned = i === pinned ? -1 : i
      if (ev.pointerType !== 'mouse') hovered = -1
      refreshActive()
    }
    const onCancel = () => { drag = null }
    const onLeave = () => { if (drag) return; hovered = -1; refreshActive() }
    const onDbl = () => { yawGoal = 0; elevGoal = 0; kick() }
    const onKey = (ev: KeyboardEvent) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape', 'Enter', ' ']
      if (!keys.includes(ev.key) || !n) return
      ev.preventDefault()
      if (ev.key === 'Escape') { pinned = -1; hovered = -1; refreshActive(); return }
      let i = pinned >= 0 ? pinned : activeIdx >= 0 ? activeIdx : n - 1
      if (pinned >= 0 || activeIdx >= 0) {
        if (ev.key === 'ArrowLeft') i -= 1
        if (ev.key === 'ArrowRight') i += 1
        if (ev.key === 'ArrowUp') i -= cfg.current.sectors
        if (ev.key === 'ArrowDown') i += cfg.current.sectors
        if (ev.key === 'Home') i = 0
        if (ev.key === 'End') i = n - 1
      }
      i = Math.max(0, Math.min(n - 1, i))
      pinned = i; hovered = -1; refreshActive()
      cfg.current.setAnnounce(boxes[i].tip.replace(/\n/g, ', '))
    }
    const onBlur = () => { pinned = -1; refreshActive() }
    const setTarget = () => {
      const goal = cfg.current.target
      if (!entered) return
      if (goal !== target) { target = goal; if (goal === 0) { yawGoal = 0; elevGoal = 0 } canvas.style.cursor = cfg.current.orbit && target === 1 ? 'grab' : 'default'; kick() }
    }
    load(); retheme(); relayout()
    const enter = () => { if (entered) return; entered = true; if (reduced) t = cfg.current.target; setTarget() }
    let io: IntersectionObserver | null = null, io2: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => { if (entries.some((en) => en.isIntersecting)) { enter(); io?.disconnect() } }, { threshold: 0.3 })
      io.observe(stage)
      io2 = new IntersectionObserver((entries) => { inView = entries.some((en) => en.isIntersecting); if (inView) kick() })
      io2.observe(stage)
    } else enter()
    const ro = new ResizeObserver(() => { if (Math.round(stage.clientWidth) !== W) relayout() })
    ro.observe(stage)
    const mo = new MutationObserver(retheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    const onReduce = () => { reduced = reduceMq.matches; kick() }
    reduceMq.addEventListener('change', onReduce)
    darkMq.addEventListener('change', retheme)
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onCancel); canvas.addEventListener('pointerleave', onLeave); canvas.addEventListener('dblclick', onDbl)
    canvas.addEventListener('keydown', onKey); canvas.addEventListener('blur', onBlur)
    engineRef.current = { kick: () => { setTarget(); kick() }, load: () => { load(); relayout(); kick() }, retheme }
    return () => {
      if (raf) cancelAnimationFrame(raf)
      io?.disconnect(); io2?.disconnect(); ro.disconnect(); mo.disconnect()
      reduceMq.removeEventListener('change', onReduce); darkMq.removeEventListener('change', retheme)
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel); canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('dblclick', onDbl)
      canvas.removeEventListener('keydown', onKey); canvas.removeEventListener('blur', onBlur)
      engineRef.current = null
    }
  }, [])

  React.useEffect(() => { engineRef.current?.kick() }, [view, legendLevel])
  React.useEffect(() => { engineRef.current?.load() }, [spec])
  React.useEffect(() => { engineRef.current?.retheme() }, [palette])

  const is3d = view === '3d'
  const ease = 'cubic-bezier(0.65, 0, 0.35, 1)'
  const levelNames = ['None', 'Low', 'Moderate', 'High', 'Highest']

  return (
    <section
      ref={rootRef}
      className={'group relative flex w-full flex-col rounded-2xl border p-4 font-sans sm:p-5 ' + className}
      style={{ background: 'var(--ring-card, #fff)', color: 'var(--ring-fg, #171717)', borderColor: 'var(--ring-border, #e5e5e5)' }}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="space-y-1">
          <h3 className="m-0 text-base font-semibold tracking-tight">{title}</h3>
          {subtitle ? <p className="text-xs" style={{ color: 'var(--ring-muted, #737373)' }}>{subtitle}</p> : null}
        </div>
        {showToggle && (
          <div role="group" aria-label="Chart perspective" className="relative inline-flex rounded-lg border p-0.5" style={{ borderColor: 'var(--ring-border, #e5e5e5)', background: 'var(--ring-well, rgba(0,0,0,0.04))' }}>
            <span aria-hidden="true" className="absolute top-0.5 bottom-0.5 left-0.5 w-8 rounded-md transition-transform duration-300" style={{ background: 'var(--ring-thumb, #fff)', transform: is3d ? 'translateX(100%)' : 'translateX(0)', transitionTimingFunction: ease }} />
            {(['2d', '3d'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} aria-label={v === '2d' ? 'Flat ring' : '3D ring'} title={v === '2d' ? 'Flat ring' : '3D ring'} onClick={() => setView(v)}
                className="relative z-10 grid h-7 w-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent p-0" style={{ color: view === v ? 'var(--ring-fg, #171717)' : 'var(--ring-muted, #737373)' }}>
                {v === '2d' ? <GridIcon /> : <CubeIcon />}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: 'var(--ring-border, #e5e5e5)', background: 'var(--ring-stage, transparent)' }}>
        <div className="relative px-2 pt-2 sm:px-3 sm:pt-3">
          <div ref={stageRef} className="relative w-full overflow-hidden rounded-lg" style={{ height: 320 }}>
            <canvas ref={canvasRef} tabIndex={0} role="img" aria-label={`${spec.label}. Shown as a ${is3d ? '3D ring' : 'flat ring'}. Use arrow keys to read each hour.`} className="absolute top-0 left-0 block outline-none" style={{ maxWidth: 'none', touchAction: is3d && orbit ? 'pan-y' : 'auto' }} />
          </div>
          <div ref={tipRef} role="tooltip" aria-hidden="true" className="pointer-events-none absolute top-3 left-3 z-30 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs shadow-xl transition-opacity duration-150 motion-reduce:transition-none" style={{ opacity: 0, background: 'var(--ring-tip-bg, rgba(23,23,23,0.95))', color: 'var(--ring-tip-fg, #fff)' }}>
            <strong ref={tipBRef} className="block font-semibold" />
            <span ref={tipSRef} className="block text-[11px] opacity-80" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-3 py-3 text-xs" style={{ color: 'var(--ring-muted, #737373)' }}>
          <span>{hint}</span>
          {showLegend && (
            <div className="flex items-center gap-1.5" onMouseLeave={() => setLegendLevel(-1)}>
              <span className="text-[11px]">{legendLabels[0]}</span>
              {swatches.map((c, i) => (
                <button key={i} type="button" aria-label={`Highlight ${levelNames[i].toLowerCase()}`} aria-pressed={legendLevel === i} title={levelNames[i]}
                  onMouseEnter={() => setLegendLevel(i)} onFocus={() => setLegendLevel(i)} onBlur={() => setLegendLevel(-1)} onClick={() => setLegendLevel((cur) => (cur === i ? -1 : i))}
                  className="h-3 w-3 cursor-pointer rounded-xs border-0 p-0" style={{ background: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)' }} />
              ))}
              <span className="text-[11px]">{legendLabels[1]}</span>
            </div>
          )}
        </div>
      </div>
      <p aria-live="polite" className="sr-only">{announce}</p>
    </section>
  )
}

export default CirculariumRing
