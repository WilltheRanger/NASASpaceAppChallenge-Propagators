/*
 * The Explore page (the file keeps its first name). THESIS: One question at a time: which satellite saw this fire, and when? The Earth sits in the middle; the place and
 *   its numbers on the left; SI on the right; under the map, when each satellite looked at everything in view.
 * OWN-WORLD: Anchor dark: ground #0B0D0B, bone text, Albert Sans, NASA Blue Marble. The satellite marks are the Region
 *   page's: Terra a blue ring, VIIRS a green diamond, Aqua an amber dot. Region frames are white, so amber means Aqua.
 * STORY: A judge clicks a fire and reads which satellites saw that spot and at what local time. The chart shows each
 *   satellite's clock over everything in view, with Aqua's 2012–2020 clock marked. A studied region shows the audit as
 *   two clocks side by side; any other place shows its own past day.
 * FIRST VIEWPORT: the hook and the six regions on the left, the globe with the past day's fires, the clock chart under
 *   it, SI on the right.
 * FORM: docked rails around the map (revised after the critique and the audit; was corner instruments).
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronDown, CircleHelp, CornerDownLeft, Crosshair, Flame, Globe2, MapPin, MessageSquare, Minus, Play, Plus, Search, X } from 'lucide-react'
import { DecipherText } from '@/components/ui/decipher-text'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { DeltaTicker } from '@/components/ui/delta-ticker'
import { SiChat, type SiTurn } from '@/components/ui/si-chat'
import { ChartLine } from '@/components/ui/chart-line'
import { DaylightSection } from './daylight'
import { guideSeen, startGuide } from './tour'
import { ElasticSwitch } from '@/components/ui/elastic-switch'
import { EarthGlobe, type Box, type Callout, type EarthHandle, type EarthOverlay, type EarthPadding, type EarthTarget, type Show } from '@/components/ui/earth-globe'
import { MONTHS as MONTHS_SHORT, REGIONS, daylight, daylightHeadline, fmtHM, fmtInt, fmtShift, hm, isValidation, novemberRatio, regionData, sunTimes } from '@/r2/data'
import { KeyValueList, type KeyValueListItem } from '@/components/ui/key-value-list'
import { BIN, BIN_FROM, BIN_TO, FRP, LAT, LON, N as DOTS, SAT, SAT_NAMES, SENSOR, TOTALS, WINDOW, groupOf, heatShare, histogram, lstOf, near, sightings, strongest, summary, utcOf, type SatGroup } from '@/r2/fires'
import { STUDIED_IN, STUDIED_PLACES, lookUpPlace, nameAt, nameNear, placeById, searchPlaces, type Place } from '@/r2/places'
import { STARTERS, ask, type SiAction } from '@/r2/si'
import { BOX as DAY_BOX, DAY as FIRE_DAY_DATE, FIRES as DAY_FIRES, PASS_END, SOURCES as DAY_SOURCES, SUNSET, run as dayRun, scene as dayScene, type Delay as DayDelay, type Source as DaySource } from '@/r2/response'
import { DOWN, EXPLORATORY, L_STEPS, NEAR, UP, cellFeatures, cellIdAt, cellName, globalGrid, reading, type GlobalCell, type GlobalGrid } from '@/r2/global'
import { CellPanel } from './GlobalLayer'
import CONTEXT from '@/r2/earth/context.json'
import { cn } from '@/lib/utils'
import { SiteBar, type Links } from './common'
import { AlertPanel, type AlertDelay } from './AlertPanel'

type Nav = 'dev' | 'artifact'
type Leave = (e: ReactMouseEvent<HTMLAnchorElement>) => void

const IMG = `${import.meta.env.BASE_URL}img/`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ALL: Show = { terra: true, aqua: true, viirs: true }
/** the satellites in the order they look during the day */
const GROUPS: SatGroup[] = ['terra', 'viirs', 'aqua']
const NAME: Record<SatGroup, string> = { terra: 'Terra', viirs: 'VIIRS', aqua: 'Aqua' }
const COLOR: Record<SatGroup, string> = { terra: 'var(--sat-terra)', viirs: 'var(--sat-viirs)', aqua: 'var(--sat-aqua)' }

const short = (name: string) => name.replace(/ \(.*\)$/, '')
/** "4.31° S, 58.50° W" */
const coords = (lat: number, lon: number) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(Math.round(v))}`
/** hours as "2 h 50" */
const dur = (h: number | null | undefined) => {
  if (h == null) return '—'
  const m = Math.round(h * 60)
  if (m <= 0) return 'After dark'
  const hh = Math.floor(m / 60)
  return hh ? `${hh} h ${String(m % 60).padStart(2, '0')}` : `${m} min`
}
/** the fire file's window: "14–15 Nov 2026" */
const WHEN = (() => {
  const [y1, m1, d1] = WINDOW.start.split(' ')[0].split('-').map(Number)
  const [y2, m2, d2] = WINDOW.end.split(' ')[0].split('-').map(Number)
  return y1 === y2 && m1 === m2 ? `${d1}–${d2} ${MONTHS[m1 - 1]} ${y1}` : `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]} ${y2}`
})()

/** A studied region's numbers, all from the team's files. */
function regionFacts(id: string) {
  const d = regionData(id)
  const y = d.latestOk
  const last = d.lastDrift
  const head = daylightHeadline(id)
  const lvl2 = head?.quote === 'level2a'
  const validation = isValidation(id)
  const nov = validation ? novemberRatio(d) : []
  const nFrom = nov.find((r) => r.year === 2016), nTo = nov[nov.length - 1]
  return {
    d, validation,
    country: /\((.*)\)$/.exec(d.name)?.[1] ?? '',
    season: daylight(d)?.season.label ?? null,
    year: last?.year ?? 2025,
    look: { old: d.baseLook, now: last?.aqua_lst ?? null },
    /** Aqua's and VIIRS's look time by year (drift file) */
    drift: d.drift.map((r) => ({ year: r.year, aqua: hm(r.aqua_lst), viirs: hm(r.viirs_lst) })),
    /** daylight left when an alert comes 1.5 h after the pass (hours) */
    light: {
      old: (lvl2 ? head?.level2a_aqua_D15_2012_2020_mean : head?.aqua_D15_2012_2020_mean) ?? null,
      now: (lvl2 ? head?.level2a_aqua_D15_2025 : head?.aqua_D15_2025) ?? null,
    },
    count: y && y.verdict !== 'na' && !validation && y.fixed != null && y.gap != null && y.lo != null && y.hi != null
      ? { year: y.year, old: y.fixed, now: y.aqua, gap: y.gap, lo: y.lo, hi: y.hi, outside: y.verdict === 'outside' }
      : null,
    nov: nFrom && nTo ? { from: nFrom, to: nTo } : null,
  }
}
type Facts = ReturnType<typeof regionFacts>

const LIST = REGIONS.map((r) => ({ id: r.id, name: short(r.name), f: regionFacts(r.id) }))
/** how much later Aqua passed by 2025 across the studied regions (daylight files) */
const SHIFTS = LIST.map((r) => (r.f.look.old && r.f.look.now ? Math.round((hm(r.f.look.now) - hm(r.f.look.old)) * 60) : null)).filter((v): v is number => v != null)
const SHIFT = SHIFTS.length ? `${Math.min(...SHIFTS)} to ${Math.max(...SHIFTS)} minutes` : 'over an hour'
/** said next to every finding */
const CAVEAT = 'The timing and the count changed together, but we can’t say how much of the difference the timing caused.'
const FOOTER = 'A NASA Space Apps Challenge 2026 team project, not an official NASA product.'
/** Aqua's 2012–2020 look time across the six regions (drift files): the chart's reference when no region is picked */
const BASES = LIST.map((r) => r.f.look.old).filter((v): v is string => v != null).map(hm)
const OLD_CLOCK = BASES.length ? { from: Math.min(...BASES), to: Math.max(...BASES) } : null

const BOXES: Record<string, Box> = Object.fromEntries(REGIONS.map((r) => [r.id, r.bbox as unknown as Box]))
const EARTH_REGIONS = REGIONS.map((r) => ({ id: r.id, name: r.name, bbox: r.bbox as unknown as Box }))
const boxFor = (p: Place): Box => {
  if (p.region) return BOXES[p.region]
  const hy = p.span / 2, hx = Math.min(179, p.span / 2 / Math.max(0.2, Math.cos((p.lat * Math.PI) / 180)))
  return [Math.max(-180, p.lon - hx), Math.max(-84, p.lat - hy), Math.min(180, p.lon + hx), Math.min(84, p.lat + hy)]
}
/** the studied regions in a country, or whose box holds the place */
const studiedFor = (p: Place) => (p.iso && STUDIED_IN[p.iso]) || REGIONS.filter((r) => p.lon >= r.bbox[0] && p.lon <= r.bbox[2] && p.lat >= r.bbox[1] && p.lat <= r.bbox[3]).map((r) => r.id)

/** The place the page opens on. */
const DEFAULT_PLACE = 'br-amazon'

/** A value kept in the URL: the query string on the site, the hash in the comment page. */
function readParam(key: string) {
  const q = new URLSearchParams(window.location.search).get(key)
  const h = new RegExp(`(?:^#|&)${key}=([^&]+)`).exec(window.location.hash)?.[1]
  return q ?? (h ? decodeURIComponent(h) : null)
}
function writeParams(nav: Nav, values: Record<string, string | null>) {
  try {
    if (nav === 'artifact') {
      const p = new URLSearchParams(window.location.hash.slice(1))
      for (const [k, v] of Object.entries(values)) { if (v == null) p.delete(k); else p.set(k, v) }
      const s = p.toString()
      window.history.replaceState(null, '', s ? `#${s}` : window.location.pathname + window.location.search)
    } else {
      const u = new URL(window.location.href)
      for (const [k, v] of Object.entries(values)) { if (v == null) u.searchParams.delete(k); else u.searchParams.set(k, v) }
      window.history.replaceState(null, '', u)
    }
  } catch { /* a sandboxed page may refuse; the state still works */ }
}
/** the place in the URL: a studied region, fire area or country by id; anything else as "xy-lat,lon" and its name */
function restorePlace(): Place | null {
  const id = readParam('place')
  // with nothing asked for, open on the Amazon: its numbers and fires are in the page's own files. The whole globe is
  // one click away ("All regions"), and stays the opening view for a link that asks for it or for a square
  if (!id) return readParam('globe') || readParam('cell') ? null : placeById(DEFAULT_PLACE)
  const p = placeById(id)
  const name = readParam('name')
  return p && name && p.kind === 'Coordinates' ? { ...p, name, kind: 'Place', span: 4 } : p
}

function useMedia(q: string) {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const f = () => setOn(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [q])
  return on
}
function useHeight(ref: RefObject<HTMLElement>, fallback: number) {
  const [h, setH] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  })
  return h
}

/** What the pointer is reading on the map (a box), kept outside React state: only the chart listens, so moving the
 *  pointer never redraws the page. */
function makeProbe() {
  let box: Box | null = null
  const subs = new Set<() => void>()
  return {
    get: () => box,
    set: (b: Box | null) => { if (b === box) return; box = b; subs.forEach((f) => f()) },
    subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f) } },
  }
}
type Probe = ReturnType<typeof makeProbe>

/* ---------- shared pieces ---------- */

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]'
const glass = 'rounded-md border border-[color:var(--hairline)] bg-[rgba(11,13,11,0.93)] shadow-[0_8px_24px_rgba(0,0,0,0.45)]'
const iconButton = cn('grid size-10 place-items-center text-[color:var(--bone2)] transition-colors duration-150 hover:bg-[color:var(--raised)] hover:text-[color:var(--bone)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--bone)]')
const primary = cn('inline-flex min-h-11 items-center justify-center gap-2 rounded bg-[color:var(--bone)] px-4 text-sm font-medium text-[color:var(--ink)] transition-colors duration-150 hover:bg-[color:var(--bone-hover)] forced-colors:border forced-colors:border-[ButtonText]', focusRing)
const secondary = cn('inline-flex min-h-11 items-center justify-center gap-2 rounded border border-[color:var(--bone-20)] px-4 text-sm text-[color:var(--bone)] transition-colors duration-150 hover:bg-[color:var(--raised)]', focusRing)

/** a satellite's mark, as on the map: Terra a ring, VIIRS a diamond, Aqua a dot */
function Mark({ g, size = 10, off = false }: { g: SatGroup; size?: number; off?: boolean }) {
  const c = off ? 'var(--bone3)' : COLOR[g]
  if (g === 'terra') return <span aria-hidden className="inline-block shrink-0 rounded-full forced-colors:border-[CanvasText]" style={{ width: size, height: size, border: `2px solid ${c}` }} />
  if (g === 'viirs') return <span aria-hidden className="inline-block shrink-0 rotate-45 forced-colors:bg-[CanvasText]" style={{ width: size * 0.74, height: size * 0.74, margin: size * 0.13, background: off ? 'transparent' : c, border: off ? `1.5px solid ${c}` : undefined }} />
  return <span aria-hidden className="inline-block shrink-0 rounded-full forced-colors:bg-[CanvasText]" style={{ width: size, height: size, background: off ? 'transparent' : c, border: off ? `1.5px solid ${c}` : undefined }} />
}

/* ---------- the page ---------- */

export default function Simulator({ home, regionsHref, overviewHref, methodHref, leave, motion, setMotion, nav }: {
  home: string; regionsHref: (id: string) => string; overviewHref?: string; methodHref?: string; leave: Leave; motion: boolean; setMotion: (on: boolean) => void; nav: Nav
}) {
  const wide = useMedia('(min-width: 1024px)')
  // SI keeps a column of its own only on very wide screens; below that it opens over the map, so the map keeps its room
  const xl = useMedia('(min-width: 1600px)')
  const live = nav !== 'artifact'
  const [place, setPlace] = useState<Place | null>(restorePlace)
  /** the assumed wait between a pass and its alert, for the alert panel */
  const [delay, setDelay] = useState<AlertDelay>(1.5)
  const [arrived, setArrived] = useState(false)
  const [q, setQ] = useState(() => place?.name ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [online, setOnline] = useState<{ q: string; items: Place[]; state: 'idle' | 'busy' | 'failed' }>({ q: '', items: [], state: 'idle' })
  const [view, setView] = useState<Box | null>(null)
  const [failed, setFailed] = useState(false)
  const [show, setShow] = useState<Show>(ALL)
  const [fire, setFire] = useState<number | null>(null)
  const [fireBelow, setFireBelow] = useState(false)
  const [turns, setTurns] = useState<SiTurn[]>([])
  const [siOpen, setSiOpen] = useState(false)
  // the timing chart under the map can fold down to a bar, for a clear map
  const [chartOpen, setChartOpen] = useState(true)
  const [tab, setTab] = useState<'info' | 'si'>('info')
  const [clock, setClockState] = useState<Clock>('new')
  /** one real fire day: which satellite's pass raises the alert, and the alert's delay (NASA's published range) */
  const [day, setDay] = useState<{ src: DaySource; delay: DayDelay } | null>(null)
  const playDay = () => { setLightOpen(false); setCellOpen(false); setFire(null); setShow({ terra: false, aqua: false, viirs: false }); setDay({ src: 'Aqua', delay: 0 }) }
  /** the world's 2-degree squares (the live site only: the comment page carries no world file) */
  const [grid, setGrid] = useState<GlobalGrid | null>(null)
  const [layer, setLayer] = useState<'clock' | 'fires'>('clock')
  const [mapYear, setMapYear] = useState<2024 | 2025>(2025)
  const [cellId, setCellId] = useState<string | null>(() => readParam('cell'))
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [cellOpen, setCellOpen] = useState(false)
  const [cellZoom, setCellZoom] = useState(false)
  const [zoom, setZoom] = useState(0)
  useEffect(() => {
    if (!live) return
    let on = true
    globalGrid().then((g) => { if (on) setGrid(g) }).catch(() => { /* no world file in this build: the page works without it */ })
    return () => { on = false }
  }, [live])
  const cellById = useMemo(() => new Map((grid?.cells ?? []).map((c) => [c.id, c])), [grid])
  const cell = cellId ? cellById.get(cellId) ?? null : null
  const pickCell = (id: string | null) => { setCellId(id); setHoverId(null); setCellZoom(false); setCellOpen(false); if (id) setFire(null); writeParams(nav, { cell: id }) }
  /** the Daylight section (moved here from the Region page), over the map */
  const [lightOpen, setLightOpen] = useState(false)
  const lightRef = useRef(lightOpen)
  lightRef.current = lightOpen
  const cellOpenRef = useRef(cellOpen)
  cellOpenRef.current = cellOpen
  const endDay = () => { setDay(null); setShow(ALL) }
  /** Aqua's old time or its new one: the map shows the fires seen at about that time */
  const setClock = (c: Clock) => {
    setClockState(c)
    setShow(c === 'old' ? { terra: false, viirs: true, aqua: false } : { terra: false, viirs: false, aqua: true })
  }
  const inputRef = useRef<HTMLInputElement>(null)
  const headRef = useRef<HTMLHeadingElement>(null)
  const earth = useRef<EarthHandle | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const chartH = useHeight(chartRef, 170)
  // first visit on a wide screen at the whole globe: the guide opens once the page has settled
  useEffect(() => {
    if (place || !wide || guideSeen()) return
    const t = window.setTimeout(() => startGuide(SHIFT, motion), 1200)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const sheetH = useHeight(sheetRef, 260)
  const fireRef = useRef(fire)
  fireRef.current = fire
  // the square under the pointer: the chart reads it, and a frame follows the pointer on the map
  const probe = useMemo(makeProbe, [])
  const frameRef = useRef<HTMLDivElement>(null)
  const onProbe = (p: { box: Box; x: number; y: number; r: number } | null) => {
    probe.set(p ? p.box : null)
    const el = frameRef.current
    if (!el) return
    el.style.opacity = p ? '1' : '0'
    if (p) { el.style.transform = `translate(${p.x - p.r}px, ${p.y - p.r}px)`; el.style.width = el.style.height = `${p.r * 2}px` }
  }
  // phones: the panel is a sheet pulled up or down between three heights, so the globe stays in view
  const stageRef = useRef<HTMLElement>(null)
  const [snap, setSnap] = useState(0)
  const [pull, setPull] = useState<number | null>(null)
  const pullFrom = useRef<{ y: number; h: number; moved: boolean } | null>(null)
  const sheetPx = (i: number) => Math.round((stageRef.current?.clientHeight ?? 640) * SHEET[i])
  const onPullDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pullFrom.current = { y: e.clientY, h: sheetRef.current?.offsetHeight ?? sheetPx(snap), moved: false }
  }
  const onPullMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const from = pullFrom.current
    if (!from) return
    const dy = from.y - e.clientY
    if (Math.abs(dy) > 4) from.moved = true
    if (from.moved) setPull(Math.max(sheetPx(0) - 24, Math.min(sheetPx(SHEET.length - 1) + 12, from.h + dy)))
  }
  const onPullUp = () => {
    const from = pullFrom.current
    pullFrom.current = null
    if (!from) return
    if (!from.moved) { setSnap((v) => (v + 1) % SHEET.length); return }
    const h = pull ?? from.h
    let best = 0
    SHEET.forEach((_, i) => { if (Math.abs(sheetPx(i) - h) < Math.abs(sheetPx(best) - h)) best = i })
    setSnap(best)
    setPull(null)
  }

  const region = place?.region ?? null
  const facts = useMemo(() => (region ? regionFacts(region) : null), [region])

  // search: local names as you type; OpenStreetMap only when asked (Enter on its row), at most once a second, as
  // Nominatim's usage policy requires; the comment page can't reach it
  const local = useMemo(() => searchPlaces(q), [q])
  const typing = q.trim().length > 0 && q !== place?.name
  const osm = online.q === q ? online.items.filter((p) => !local.some((l) => l.id === p.id)) : []
  const items = typing ? [...local, ...osm] : []
  const lastLookup = useRef(0)
  const lookUp = () => {
    const t = q.trim()
    if (!live || t.length < 3 || Date.now() - lastLookup.current < 1100) return
    lastLookup.current = Date.now()
    setOnline({ q, items: [], state: 'busy' })
    lookUpPlace(t)
      .then((r) => setOnline({ q, items: r, state: r.length ? 'idle' : 'failed' }))
      .catch(() => setOnline({ q, items: [], state: 'failed' }))
  }

  const choose = (p: Place) => {
    setPlace(p)
    setArrived(false)
    setQ(p.name)
    setOpen(false)
    setFire(null)
    setClockState('new')
    setShow(ALL)
    setDay(null)
    setLightOpen(false)
    pickCell(null)
    const xy = p.kind === 'Place' || p.kind === 'Coordinates'
    writeParams(nav, { place: xy ? `xy-${p.lat.toFixed(4)},${p.lon.toFixed(4)}` : p.id, name: p.kind === 'Place' ? p.name : null, globe: null })
    // the place's heading takes focus, so the next Tab continues from the place, not the top of the page
    requestAnimationFrame(() => headRef.current?.focus({ preventScroll: true }))
  }
  const back = () => { setPlace(null); setArrived(false); setQ(''); setFire(null); setDay(null); setShow(ALL); setLightOpen(false); pickCell(null); writeParams(nav, { place: null, name: null, globe: '1' }) }
  const pickRegion = (id: string) => { const p = STUDIED_PLACES.find((x) => x.id === id); if (p) choose(p) }

  const pickFire = (i: number) => {
    const g = groupOf(SAT[i])
    setShow((s) => (s[g] ? s : { ...s, [g]: true }))
    // the card opens above the fire, or below it when the fire sits too near the top of the clear stage
    const r = earth.current?.room(LON[i], LAT[i])
    const below = !!r && r.above < CARD_H + 24 && r.below > r.above
    setFireBelow(below)
    setFire(i)
    // phones read the card in the sheet under the map; the map only keeps the fire in view
    if (!wide) {
      setTab('info')
      requestAnimationFrame(() => {
        sheetRef.current?.querySelector('[data-sheet-scroll]')?.scrollTo({ top: 0, behavior: 'smooth' })
        earth.current?.reveal(LON[i], LAT[i], { top: 24, side: 24 })
      })
      return
    }
    requestAnimationFrame(() => earth.current?.reveal(LON[i], LAT[i], below ? { top: 24, side: 164, bottom: CARD_H + 24 } : { top: CARD_H + 24, side: 164 }))
  }
  const strongestIn = (b: Box | null) => { const i = strongest(b, show); if (i != null) pickFire(i) }

  // SI: answers come from the page's data; an answer may fly the map, filter it, or pick a fire
  const turnId = useRef(0)
  const onAsk = (text: string) => {
    const a = ask(text, { region, place, view, fire })
    const id = ++turnId.current
    setTurns((t) => [...t, { id, q: text, a }])
    if (a.select != null) pickFire(a.select)
    // a fire's town, region and country, when OpenStreetMap answers; the offline name stays otherwise
    const at = a.locate
    if (at && live) {
      nameAt(at.lon, at.lat).then((name) => {
        if (!name) return
        const label = `${name} (${at.label.replace(/^.*\((.*)\)$/, '$1')})`
        setTurns((t) => t.map((x) => (x.id !== id ? x : { ...x, a: { ...x.a, sentences: x.a.sentences.map((z) => ({ ...z, text: z.text.replace(at.label, label) })) } })))
      })
    }
  }
  const onAction = (x: SiAction) => {
    if (x.kind === 'fly') choose(x.place)
    else if (x.kind === 'filter') { setDay(null); setShow(x.group === 'all' ? ALL : { terra: x.group === 'terra', aqua: x.group === 'aqua', viirs: x.group === 'viirs' }) }
    else if (x.kind === 'day') playDay()
    else pickFire(x.i)
  }

  // Ctrl or Cmd + K finds a place; Escape closes a fire's card (not while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target
      const inField = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true) }
      else if (e.key === 'Escape' && !inField && lightRef.current) setLightOpen(false)
      else if (e.key === 'Escape' && !inField && cellOpenRef.current) setCellOpen(false)
      else if (e.key === 'Escape' && !inField && fireRef.current != null) setFire(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // phones: picking a place, a square or a fire lifts the sheet to its middle height
  useEffect(() => { if (place || cellId || fire != null || day) setSnap((v) => Math.max(v, 1)) }, [place, cellId, fire, day])

  // without the globe, a restored place shows its panel at once
  useEffect(() => { if (failed && place) setArrived(true) }, [failed, place])

  const padding: EarthPadding = useMemo(() => (wide
    ? { top: 24, left: 24, right: 72 + (siOpen && !xl ? 352 : 0), bottom: chartH + 28 }
    : { top: 76, left: 16, right: 16, bottom: sheetH + 12 }), [wide, xl, siOpen, chartH, sheetH])
  const target: EarthTarget = useMemo(() => (day ? { key: 'fire-day', bbox: DAY_BOX } : cell && cellZoom ? { key: `cell-${cell.id}`, bbox: [cell.lon0, cell.lat0, cell.lon1, cell.lat1] } : place ? { key: place.id, bbox: boxFor(place), maxZoom: !live && !region ? 4.6 : undefined } : null), [day != null, place, live, region, cellZoom ? cell?.id : null]) // eslint-disable-line react-hooks/exhaustive-deps
  const sceneData = useMemo(() => (day ? dayScene(day.src) : null), [day?.src]) // eslint-disable-line react-hooks/exhaustive-deps
  // the squares belong to the whole-globe view; at a place the fires and the place's own numbers lead, so only the
  // picked square (if any) is outlined there
  const cellsGeo = useMemo(() => {
    if (!grid || day) return null
    if (layer === 'clock' && !place) return cellFeatures(grid, mapYear)
    return cell ? { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, properties: { id: cell.id, ok: false, c: '#000', o: 0 }, geometry: { type: 'Polygon' as const, coordinates: [[[cell.lon0, cell.lat0], [cell.lon1, cell.lat0], [cell.lon1, cell.lat1], [cell.lon0, cell.lat1], [cell.lon0, cell.lat0]]] } }] } : null
  }, [grid, layer, mapYear, day != null, place != null, cell?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  /** the square that holds a searched place's point (not for the six studied regions, which have their own audit) */
  const placeCell = place && !region ? cellById.get(cellIdAt(place.lon, place.lat)) ?? null : null
  const context: EarthOverlay = useMemo(() => (region ? { src: `${IMG}sim/${region}-context.jpg`, bbox: (CONTEXT as Record<string, number[]>)[region] as unknown as Box } : null), [region])
  const near = useMemo(() => (fire == null ? [] : sightings(fire).map((s) => s.i).filter((x): x is number => x != null)), [fire])
  const callouts: Callout[] = []
  const fireSquare = useMemo<SquareReading | null>(() => {
    if (fire == null) return null
    const c = cellById.get(cellIdAt(LON[fire], LAT[fire]))
    if (!c) return null
    const r = reading(c, 2025)
    return { ok: r.ok, gap: r.L != null ? (r.L - 1) * 100 : null, outside: r.outside }
  }, [fire, cellById])
  if (fire != null && wide) callouts.push({ key: `fire-${fire}-${fireBelow ? 'b' : 'a'}`, lon: LON[fire], lat: LAT[fire], anchor: fireBelow ? 'top' : 'bottom', content: <FireCard i={fire} onClose={() => setFire(null)} square={fireSquare} below={fireBelow} /> })
  if (place && !region && arrived && !day) callouts.push({ key: `pin-${place.id}`, lon: place.lon, lat: place.lat, anchor: 'center', content: <Reticle text={coords(place.lat, place.lon)} motion={motion} /> })

  const search = (
    <SearchField
      inputRef={inputRef} q={q} setQ={(v) => { setQ(v); setActive(0); setOpen(true) }} open={open} setOpen={setOpen}
      items={items} active={active} setActive={setActive} choose={choose} clear={back}
      busy={online.state === 'busy' && online.q === q} failed={online.state === 'failed' && online.q === q} live={live} typing={typing} motion={motion} onLookUp={lookUp}
    />
  )
  // the fire manager's question for the place in view: pass times and sunset are real, the delay is the reader's choice
  const alert = useMemo(() => {
    if (facts) {
      const dl = daylight(facts.d)
      if (!dl) return null
      const y = dl.at(facts.year)
      return {
        place: facts.d.phrase.the,
        rows: GROUPS.map((g) => ({ key: g, name: NAME[g], pass: y.look[g] })),
        rise: y.rise, set: y.set, aquaBefore: dl.baseAqua,
        basis: `Pass times: each satellite’s usual time here in ${y.year}. Sunset: ${y.mid.day} ${MONTHS[y.mid.m - 1]}, the middle of the fire season.`,
      }
    }
    if (place) {
      const s = summary(boxFor(place))
      const [yy, mm, dd] = WINDOW.start.split(' ')[0].split('-').map(Number)
      const sun = sunTimes(yy, mm, dd, place.lat)
      return {
        place: place.name,
        rows: GROUPS.map((g) => ({ key: g, name: NAME[g], pass: s[g].lst })),
        rise: sun.rise, set: sun.set, aquaBefore: null,
        basis: `Pass times: the middle of each satellite’s fire detections here on ${WHEN}. Sunset: that day, at this latitude.`,
      }
    }
    return null
  }, [facts, place])
  const alertPanel = alert ? <AlertPanel {...alert} delay={delay} onDelay={setDelay} motion={motion} /> : null
  const rail = cell ? (
    <CellRail cell={cell} year={mapYear} headRef={headRef} onBack={() => pickCell(null)} onCalendar={() => setCellOpen(true)} onZoom={() => setCellZoom(true)} zoomed={cellZoom} />
  ) : !place ? (
    <Idle onPick={pickRegion} onPlayDay={playDay} world={grid != null && layer === 'clock'} />
  ) : facts ? (
    <RegionPanel f={facts} headRef={headRef} onBack={back} onStrongest={() => strongestIn(BOXES[facts.d.id])} studyHref={regionsHref(facts.d.id)} leave={leave} motion={motion} clock={clock} onClock={setClock} alert={alertPanel}
      daylight={<DaySection onPlay={facts.d.id === 'br-amazon' ? playDay : undefined} onYears={() => setLightOpen(true)} active={day != null} />} />
  ) : (
    <PlacePanel place={place} headRef={headRef} onBack={back} onFly={pickRegion} onStrongest={() => strongestIn(boxFor(place))} alert={alertPanel} cell={placeCell} year={mapYear} onCell={grid ? (id) => pickCell(id) : undefined} />
  )
  const siteLinks: Links = {
    overview: () => overviewHref ?? home,
    regions: (id) => regionsHref(id ?? region ?? 'br-amazon'),
    sim: () => (nav === 'artifact' ? 'sim.html' : '?page=explore'),
    method: () => methodHref ?? (nav === 'artifact' ? 'method.html' : '?page=method'),
  }
  const footer = (
    <div className="flex flex-col gap-3 px-5 pb-5 pt-2">
      <ElasticSwitch checked={motion} onCheckedChange={setMotion} label="Motion" />
      <p className="text-xs leading-5 text-[color:var(--bone3)]">{FOOTER}</p>
    </div>
  )
  const chart = day ? <FireDayPanel day={day} setDay={setDay} onClose={endDay} motion={motion} /> : <LookChart onFold={wide ? () => setChartOpen(false) : undefined} box={view} probe={probe} show={show} setShow={setShow} fire={fire} near={near} oldClock={facts?.look.old ? { from: hm(facts.look.old), to: hm(facts.look.old) } : OLD_CLOCK} live={live} motion={motion} />
  const si = (onClose?: () => void, className?: string) => (
    <SiChat turns={turns} onAsk={onAsk} onAction={onAction} starters={STARTERS} motion={motion} onClose={onClose} className={className} />
  )

  return (
    <>
      <style>{TAG_CSS}</style>
      <SiteBar page="sim" links={siteLinks} leave={leave} regionsHref={regionsHref(region ?? 'br-amazon')} />

      <main className="fixed inset-x-0 bottom-0 top-14 flex bg-[#03060A]">
        {place ? <h1 className="sr-only">Explore: {place.name}</h1> : null}
        {wide ? (
          <aside aria-label="Place" className="relative z-20 flex w-[340px] shrink-0 flex-col border-r border-[color:var(--hairline)] bg-[color:var(--ground)] xl:w-[352px]">
            <div className="border-b border-[color:var(--hairline)] p-3">{search}</div>
            <div className="min-h-0 flex-1 overflow-y-auto">{rail}{footer}</div>
          </aside>
        ) : null}

        <section ref={stageRef} data-tour="map" aria-label="Map" className="relative min-w-0 flex-1 overflow-hidden">
          <div aria-hidden className={cn('absolute inset-0', STARS)} />
          {failed ? (
            <img src={`${IMG}earth/bluemarble-4096.jpg`} alt="" className="absolute inset-0 size-full object-cover opacity-80" />
          ) : (
            <EarthGlobe
              ref={earth}
              className="absolute inset-0"
              regions={EARTH_REGIONS}
              selected={region}
              target={target}
              context={context}
              show={show}
              fire={fire}
              near={near}
              callouts={callouts}
              scene={sceneData}
              cells={cellsGeo}
              cell={cell?.id ?? null}
              onCell={(id) => pickCell(id)}
              onCellHover={setHoverId}
              padding={padding}
              baseSrc={`${IMG}earth/bluemarble-4096.jpg`}
              live={live}
              motion={motion}
              onArrive={() => setArrived(true)}
              onPick={(id) => (id === region ? setFire(null) : pickRegion(id))}
              onFire={(i) => (i == null ? setFire(null) : pickFire(i))}
              onRest={(b, z) => { setView(z < 2.6 ? null : b); setZoom(z) }}
              onProbe={wide && !day ? onProbe : undefined}
              onFail={() => setFailed(true)}
            />
          )}
          {/* the square the chart is reading, following the pointer */}
          <div ref={frameRef} aria-hidden className="pointer-events-none absolute left-0 top-0 z-10 opacity-0 transition-opacity duration-150">
            {(['left-0 top-0 border-l border-t', 'right-0 top-0 border-r border-t', 'bottom-0 right-0 border-b border-r', 'bottom-0 left-0 border-b border-l'] as const).map((c) => (
              <span key={c} className={cn('absolute size-3 border-[color:var(--bone)]', c)} />
            ))}
          </div>
          <p aria-live="polite" className="sr-only">{place && arrived ? `Showing ${place.name}.` : ''}{fire != null ? ` Fire seen by ${SAT_NAMES[SAT[fire]]} at ${fmtHM(lstOf(fire))} local solar time.` : ''}</p>

          {/* while the globe flies: where it is going */}
          {place && !arrived && !failed ? (
            <div aria-hidden className={cn('pointer-events-none absolute inset-x-0 z-20 flex justify-center', wide ? 'top-4' : 'top-[76px]')}>
              <p className={cn(glass, 'flex items-center gap-3 px-3 py-2 text-xs')}>
                <span className="size-1.5 animate-pulse rounded-full bg-[color:var(--bone)] motion-reduce:animate-none" />
                <span className="text-sm text-[color:var(--bone)]">{place.name}</span>
                <DecipherText key={place.id} text={coords(place.lat, place.lon)} motion={motion} className="tabular-nums text-[color:var(--bone3)]" />
              </p>
            </div>
          ) : null}

          {grid && !failed && !day && !place ? (
            <WorldControl grid={grid} layer={layer} setLayer={setLayer} year={mapYear} setYear={setMapYear} hover={hoverId ? cellById.get(hoverId) ?? null : null} closeIn={zoom >= 6.5} wide={wide} motion={motion} />
          ) : null}

          {failed ? <p className={cn(glass, 'absolute left-4 top-4 z-20 px-3 py-2 text-xs text-[color:var(--bone2)]')}>This browser can’t draw the 3D globe. The numbers below are unaffected.</p> : null}

          {/* zoom, the whole globe, and SI where it has no rail */}
          {wide && !failed ? (
            <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2">
              {!xl && !siOpen ? (
                <button type="button" onClick={() => setSiOpen(true)} className={cn(glass, 'flex h-10 items-center gap-2 px-3 text-sm text-[color:var(--bone)] hover:bg-[color:var(--raised)]', focusRing)}>
                  <MessageSquare size={15} strokeWidth={1.75} aria-hidden /> Ask SI
                </button>
              ) : null}
              {/* the guide: back to the whole globe, the chart open, then the four steps */}
              <button type="button" onClick={() => { if (place) back(); setChartOpen(true); window.setTimeout(() => startGuide(SHIFT, motion), place ? 600 : 0) }} className={cn(glass, 'flex h-10 items-center gap-2 px-3 text-sm text-[color:var(--bone)] hover:bg-[color:var(--raised)]', focusRing)}>
                <CircleHelp size={15} strokeWidth={1.75} aria-hidden /> Guide
              </button>
              <div role="group" aria-label="Map view" className={cn(glass, 'flex w-10 flex-col divide-y divide-[color:var(--hairline)] overflow-hidden')}>
                <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => earth.current?.zoomBy(1)} className={iconButton}><Plus size={16} strokeWidth={1.75} aria-hidden /></button>
                <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => earth.current?.zoomBy(-1)} className={iconButton}><Minus size={16} strokeWidth={1.75} aria-hidden /></button>
                <button type="button" aria-label="Whole globe" title="Whole globe" onClick={() => (place ? back() : earth.current?.home())} className={iconButton}><Globe2 size={16} strokeWidth={1.75} aria-hidden /></button>
              </div>
            </div>
          ) : null}

          {wide ? (
            <div ref={chartRef} data-tour="chart" className="absolute bottom-4 left-1/2 z-10 w-[min(680px,calc(100%-32px))] -translate-x-1/2">
              {chartOpen || day ? chart : (
                <button type="button" onClick={() => setChartOpen(true)} className={cn(glass, 'mx-auto flex h-10 items-center gap-2 px-3 text-sm text-[color:var(--bone)] hover:bg-[color:var(--raised)]', focusRing)}>
                  <ChevronDown size={15} strokeWidth={1.75} aria-hidden className="rotate-180" /> When each satellite saw fires
                </button>
              )}
            </div>
          ) : null}

          {lightOpen && region ? (
            <div role="region" aria-label="Daylight for firefighters" className="absolute inset-0 z-40 overflow-y-auto bg-[color:var(--ground)] px-5 pb-10 pt-4 sm:px-8">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-[color:var(--hairline)] pb-3">
                <p className="text-sm text-[color:var(--bone2)]">Daylight for firefighters · {short(REGIONS.find((r) => r.id === region)?.name ?? region)}</p>
                <button type="button" onClick={() => setLightOpen(false)} className={secondary}><X size={15} strokeWidth={1.75} aria-hidden /> Back to the map</button>
              </div>
              <DaylightSection region={region} motion={motion} nav={nav} level={2} />
            </div>
          ) : null}

          {cellOpen && cell ? (
            <div role="region" aria-label="This square's numbers and calendar" className="absolute inset-0 z-40 overflow-y-auto bg-[color:var(--ground)] px-5 pb-10 pt-4 sm:px-8">
              <div className="flex items-center justify-between gap-3 border-b border-[color:var(--hairline)] pb-3">
                <p className="text-sm text-[color:var(--bone2)]">World map · one 2° square</p>
                <button type="button" onClick={() => setCellOpen(false)} className={secondary}><X size={15} strokeWidth={1.75} aria-hidden /> Back to the map</button>
              </div>
              <div className="mx-auto max-w-[920px] [&>div]:mt-6 [&>div]:border-t-0 [&>div]:pt-0">
                <CellPanel cell={cell} year={mapYear} small={!wide} />
              </div>
            </div>
          ) : null}

          {wide && !xl && siOpen ? (
            <div className="absolute inset-y-0 right-0 z-30 flex w-[352px] flex-col border-l border-[color:var(--hairline)] bg-[color:var(--ground)] shadow-[-12px_0_32px_rgba(0,0,0,0.45)]">
              {si(() => setSiOpen(false), 'min-h-0 flex-1')}
            </div>
          ) : null}

          {/* phones: the search on the map, everything else in one sheet */}
          {!wide ? (
            <>
              <div className={cn(glass, 'absolute inset-x-3 top-3 z-30')}>{search}</div>
              <div
                ref={sheetRef}
                className={cn('absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-xl border-t border-[color:var(--bone-20)] bg-[color:var(--ground)] shadow-[0_-12px_32px_rgba(0,0,0,0.5)]', motion && pull == null && 'transition-[height] duration-300 ease-[var(--ease)]')}
                style={{ height: pull ?? `${SHEET[snap] * 100}%` }}
              >
                <button
                  type="button"
                  aria-label={snap === SHEET.length - 1 ? 'Panel: lower it' : 'Panel: raise it'}
                  onPointerDown={onPullDown}
                  onPointerMove={onPullMove}
                  onPointerUp={onPullUp}
                  onPointerCancel={onPullUp}
                  onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); setSnap((v) => Math.min(SHEET.length - 1, v + 1)) } else if (e.key === 'ArrowDown') { e.preventDefault(); setSnap((v) => Math.max(0, v - 1)) } }}
                  className={cn('flex h-7 w-full shrink-0 cursor-grab touch-none items-center justify-center rounded-t-xl active:cursor-grabbing', focusRing)}
                >
                  <span aria-hidden className="h-1 w-10 rounded-full bg-[color:var(--bone-30)]" />
                </button>
                <div className="px-4">
                  <SegmentedControl<'info' | 'si'>
                    label="Panel"
                    value={tab}
                    onChange={setTab}
                    motion={motion}
                    segmentClassName="py-2 text-center"
                    options={[{ value: 'info', label: place ? short(place.name) : 'Fires', name: 'Place and fires' }, { value: 'si', label: 'Ask SI', name: 'Ask SI' }]}
                  />
                </div>
                {tab === 'si' ? (
                  si(undefined, 'min-h-0 flex-1')
                ) : (
                  <div data-sheet-scroll className="min-h-0 flex-1 overflow-y-auto pb-4">
                    {fire != null ? <div className="px-4 pt-3"><FireCard i={fire} onClose={() => setFire(null)} square={fireSquare} docked /></div> : null}
                    {rail}
                    <div className="px-4">{chart}</div>
                    {footer}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </section>

        {xl ? (
          <aside aria-label="SI" className="flex w-[360px] shrink-0 flex-col border-l border-[color:var(--hairline)] bg-[color:var(--ground)]">
            {si(undefined, 'min-h-0 flex-1')}
          </aside>
        ) : null}
      </main>
    </>
  )
}

/* ---------- the search ---------- */

/** what each kind of result is called and shown with in the search list */
const KINDS: { kind: Place['kind']; title: string; icon: ReactNode }[] = [
  { kind: 'Studied region', title: 'Studied regions', icon: <span className="size-2 border border-[color:var(--bone)]" /> },
  { kind: 'Fire area', title: 'Fire areas', icon: <Flame size={14} strokeWidth={1.75} /> },
  { kind: 'Country', title: 'Countries', icon: <Globe2 size={14} strokeWidth={1.75} /> },
  { kind: 'Coordinates', title: 'Coordinates', icon: <Crosshair size={14} strokeWidth={1.75} /> },
  { kind: 'Place', title: 'OpenStreetMap', icon: <MapPin size={14} strokeWidth={1.75} /> },
]

/** the letters of a name that the search matched */
function matched(name: string, q: string) {
  const t = name.toLowerCase(), f = q.trim().toLowerCase()
  const at = f ? t.indexOf(f) : -1
  return at >= 0 ? Array.from({ length: f.length }, (_, i) => at + i) : []
}
function Lit({ text, idx }: { text: string; idx: number[] }) {
  if (!idx.length) return <>{text}</>
  const on = new Set(idx)
  return <>{Array.from(text).map((c, i) => (on.has(i) ? <span key={i} className="font-medium text-[color:var(--bone)] underline decoration-[color:var(--bone2)] underline-offset-[3px]">{c}</span> : c))}</>
}

/** The search, adapted from 21st.dev's command palette (vovalopuh13/command-palette): results grouped by kind, the
 *  matched letters underlined, a highlight that slides to the active row, Home and End, the keys at the foot. On the
 *  live site its last row asks OpenStreetMap. */
function SearchField({ inputRef, q, setQ, open, setOpen, items, active, setActive, choose, clear, busy, failed, live, typing, motion, onLookUp }: {
  inputRef: RefObject<HTMLInputElement>; q: string; setQ: (v: string) => void; open: boolean; setOpen: (v: boolean) => void
  items: Place[]; active: number; setActive: (f: (a: number) => number) => void; choose: (p: Place) => void; clear: () => void
  busy: boolean; failed: boolean; live: boolean; typing: boolean; motion: boolean; onLookUp: () => void
}) {
  const show = open && typing
  // groups follow the ranking: the group holding the best match comes first
  const groups = KINDS.map((k) => ({ ...k, rows: items.filter((p) => p.kind === k.kind), best: items.findIndex((p) => p.kind === k.kind) }))
    .filter((g) => g.rows.length)
    .sort((a, b) => a.best - b.best)
  const flat = groups.flatMap((g) => g.rows)
  const ask = live && q.trim().length >= 3
  const rows = flat.length + (ask ? 1 : 0)
  const listRef = useRef<HTMLUListElement | null>(null)
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null)
  useLayoutEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)
    if (!row) { setPill(null); return }
    setPill({ top: row.offsetTop, height: row.offsetHeight })
    row.scrollIntoView({ block: 'nearest' })
  }, [active, show, items, ask])
  const pick = (i: number) => { if (i < flat.length) choose(flat[i]); else if (ask) onLookUp() }
  let n = -1
  return (
    <div className="relative">
      <label htmlFor="sim-q" className="sr-only">Search a place, a country, or coordinates</label>
      <div className="flex h-11 items-center gap-2 rounded border border-[color:var(--bone-20)] bg-[color:var(--surface)] px-3 focus-within:border-[color:var(--bone)] focus-within:outline focus-within:outline-1 focus-within:outline-[color:var(--bone)]">
        <Search size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-[color:var(--bone2)]" />
        <input
          id="sim-q"
          ref={inputRef}
          role="combobox"
          aria-expanded={show}
          aria-controls="sim-list"
          aria-autocomplete="list"
          aria-activedescendant={show && active < rows ? `sim-opt-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search a place or lat, lon"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            const last = Math.max(0, rows - 1)
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a >= last ? 0 : a + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? last : a - 1)) }
            else if (e.key === 'Home' && show) { e.preventDefault(); setActive(() => 0) }
            else if (e.key === 'End' && show) { e.preventDefault(); setActive(() => last) }
            else if (e.key === 'Enter') { e.preventDefault(); pick(active) }
            else if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur() }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-[color:var(--bone)] outline-none placeholder:text-[color:var(--bone3)]"
        />
        {q ? (
          <button type="button" aria-label="Clear and go back to the whole globe" onClick={() => { clear(); inputRef.current?.focus() }} className={cn('grid size-8 place-items-center rounded text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>
            <X size={16} strokeWidth={1.75} aria-hidden />
          </button>
        ) : (
          <kbd aria-hidden className="hidden rounded border border-[color:var(--bone-20)] px-1.5 font-[family-name:var(--f-ui)] text-xs text-[color:var(--bone3)] lg:inline">Ctrl K</kbd>
        )}
      </div>
      {show ? (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-md border border-[color:var(--hairline)] bg-[rgba(11,13,11,0.98)] shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
          <ul ref={listRef} id="sim-list" role="listbox" aria-label="Places" className="relative max-h-[46svh] overflow-auto p-1">
            {pill && rows ? (
              <li aria-hidden role="presentation" className={cn('pointer-events-none absolute inset-x-1 rounded-[3px] bg-[color:var(--raised)]', motion && 'transition-[top,height] duration-150 ease-[var(--ease)]')} style={{ top: pill.top, height: pill.height }} />
            ) : null}
            {groups.map((g) => (
              <li key={g.kind} role="presentation">
                <p className="sticky top-0 z-10 bg-[rgba(11,13,11,0.98)] px-2 pb-1 pt-2 text-xs text-[color:var(--bone3)]">{g.title}</p>
                <ul role="group" aria-label={g.title}>
                  {g.rows.map((p) => {
                    n++
                    const i = n, on = i === active
                    return (
                      <li
                        key={p.id}
                        id={`sim-opt-${i}`}
                        data-i={i}
                        role="option"
                        aria-selected={on}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseMove={() => { if (!on) setActive(() => i) }}
                        onClick={() => choose(p)}
                        className={cn('relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[3px] px-2 text-sm', on ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone2)]')}
                      >
                        <span aria-hidden className={cn('grid size-6 shrink-0 place-items-center rounded-[3px] border border-[color:var(--hairline)]', on ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone3)]')}>{g.icon}</span>
                        <span className="min-w-0 flex-1 truncate"><Lit text={p.name} idx={matched(p.name, q)} /></span>
                        {on ? <CornerDownLeft size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-[color:var(--bone3)]" /> : null}
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
            {ask ? (
              <li
                id={`sim-opt-${flat.length}`}
                data-i={flat.length}
                role="option"
                aria-selected={active === flat.length}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => { if (active !== flat.length) setActive(() => flat.length) }}
                onClick={onLookUp}
                className={cn('relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[3px] px-2 text-sm', active === flat.length ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone2)]')}
              >
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-[3px] border border-[color:var(--hairline)] text-[color:var(--bone3)]"><MapPin size={14} strokeWidth={1.75} /></span>
                <span className="min-w-0 flex-1 truncate">{busy ? 'Searching OpenStreetMap…' : failed ? `No match for “${q.trim()}” on OpenStreetMap` : `Search OpenStreetMap for “${q.trim()}”`}</span>
              </li>
            ) : null}
            {!rows ? <li role="presentation" className="px-2 py-3 text-sm text-[color:var(--bone3)]">No match. Try a country, a region, or “lat, lon”.</li> : null}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--hairline)] px-3 py-2 text-xs text-[color:var(--bone3)]">
            <span aria-live="polite">{live ? '© OpenStreetMap contributors' : `${flat.length} ${flat.length === 1 ? 'place' : 'places'}`}</span>
            <span aria-hidden className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Key><ArrowUp size={11} strokeWidth={2} /></Key><Key><ArrowDown size={11} strokeWidth={2} /></Key></span>
              <span className="flex items-center gap-1"><Key><CornerDownLeft size={11} strokeWidth={2} /></Key>fly</span>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const Key = ({ children }: { children: ReactNode }) => (
  <kbd className="grid h-5 min-w-5 place-items-center rounded-[3px] border border-[color:var(--bone-20)] px-1 font-[family-name:var(--f-ui)] text-[color:var(--bone2)]">{children}</kbd>
)

/* ---------- the left rail ---------- */

function Idle({ onPick, onPlayDay, world }: { onPick: (id: string) => void; onPlayDay: () => void; world: boolean }) {
  return (
    <div className="flex flex-col gap-7 px-5 pb-6 pt-6">
      <div data-tour="intro">
        <h1 className="text-[22px] font-medium leading-[1.3] tracking-[-0.015em] text-[color:var(--bone)] [text-wrap:balance]">
          If a fire started here, when would a satellite’s alert arrive, and how much daylight would be left?
        </h1>
        <p className="mt-3 text-base text-[color:var(--bone2)]">Search a place, or pick one of the six below, to see it for each satellite.</p>
        <p className="mt-3 text-sm text-[color:var(--bone2)]">
          INPE’s official fire count for Brazil follows one satellite, Aqua. Aqua now looks {SHIFT} later than it used to.
        </p>
        <p className="mt-3 text-sm text-[color:var(--bone3)]">The dots are what the satellites detected in daylight on {WHEN}. A fire under cloud, at night or between passes isn’t on the map.</p>
      </div>
      <div data-tour="places">
        <div className="flex items-baseline justify-between gap-3 border-b border-[color:var(--hairline)] pb-2">
          <h2 className="text-sm font-medium text-[color:var(--bone)]">Six places</h2>
          <span className="text-xs text-[color:var(--bone3)]">2025 count against what we’d expect</span>
        </div>
        <ul>
          {LIST.map(({ id, name, f }) => (
            <li key={id}>
              <button type="button" onClick={() => onPick(id)} className={cn('group flex min-h-14 w-full items-center gap-3 border-b border-[color:var(--hairline)] px-1 py-2 text-left transition-colors duration-150 hover:bg-[color:var(--surface)]', focusRing)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-[color:var(--bone)]">{name}</span>
                  <span className="block text-xs text-[color:var(--bone3)]">{f.country}</span>
                </span>
                {f.count ? (
                  <span className="text-right tabular-nums">
                    <span className={cn('block text-base font-medium', f.count.outside ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone3)]')}>{signed(f.count.gap)}%</span>
                    <span className="block text-xs text-[color:var(--bone3)]">{f.count.outside ? 'unusual' : 'not unusual'}</span>
                  </span>
                ) : (
                  <span className="text-sm text-[color:var(--bone3)]">Test case</span>
                )}
                <ArrowRight size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-[color:var(--bone3)] transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-5 text-[color:var(--bone3)]">{CAVEAT}</p>
      </div>
      <DaySection onPlay={onPlayDay} active={false} />
    </div>
  )
}

/** Daylight for firefighters: one real fire day (the Amazon), and daylight left after each satellite's alert, year by
 *  year (the Daylight section, moved here from the Region page). */
function DaySection({ onPlay, onYears, active }: { onPlay?: () => void; onYears?: () => void; active: boolean }) {
  return (
    <section aria-labelledby="day-h" className="flex flex-col gap-2 border-t border-[color:var(--hairline)] pt-4">
      <h3 id="day-h" className="text-sm font-medium text-[color:var(--bone)]">Daylight for firefighters</h3>
      <p className="text-sm text-[color:var(--bone2)]">{onPlay ? 'One real fire day in the Amazon: which fires each satellite saw, and how much daylight was left.' : 'How much daylight is left after each satellite’s alert, year by year.'}</p>
      <div className="flex flex-wrap gap-2">
        {onPlay ? <button type="button" onClick={onPlay} disabled={active} className={cn(secondary, 'disabled:opacity-50')}><Play size={15} strokeWidth={1.75} aria-hidden /> {active ? 'Playing below the map' : 'Play one fire day'}</button> : null}
        {onYears ? <button type="button" onClick={onYears} className={secondary}>Daylight by year <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></button> : null}
      </div>
    </section>
  )
}

const BackButton = ({ onBack, label = 'All regions' }: { onBack: () => void; label?: string }) => (
  <button type="button" onClick={onBack} className={cn('-ml-1 flex min-h-9 w-fit items-center gap-1.5 rounded px-1 text-sm text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>
    <ArrowLeft size={14} strokeWidth={1.75} aria-hidden /> {label}
  </button>
)

type Clock = 'old' | 'new'
/** the phone sheet's three heights, as shares of the stage */
const SHEET = [0.24, 0.52, 0.88]

function RegionPanel({ f, headRef, onBack, onStrongest, studyHref, leave, motion, clock, onClock, daylight, alert }: {
  f: Facts; headRef: RefObject<HTMLHeadingElement>; onBack: () => void; onStrongest: () => void; studyHref: string; leave: Leave; motion: boolean
  clock: Clock; onClock: (c: Clock) => void; daylight?: ReactNode; alert?: ReactNode
}) {
  const old = clock === 'old'
  const look = { old: f.look.old ? hm(f.look.old) : null, new: f.look.now ? hm(f.look.now) : null }
  const count = f.count ? { old: f.count.old, new: f.count.now } : null
  const light = { old: f.light.old, new: f.light.now }
  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-4">
      <BackButton onBack={onBack} />
      <div>
        <h2 ref={headRef} tabIndex={-1} className="text-2xl font-medium leading-tight tracking-[-0.015em] text-[color:var(--bone)] outline-none">{short(f.d.name)}</h2>
        <p className="mt-1 text-sm text-[color:var(--bone3)]">{f.country}{f.season ? ` · fire season ${f.season}` : ''}</p>
      </div>
      {alert ? <div className="border-y border-[color:var(--hairline)] py-5">{alert}</div> : null}
      {f.count ? (
        <div>
          <p className="text-[40px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[color:var(--bone)]">{signed(f.count.gap)}%</p>
          <p className="mt-2 text-sm text-[color:var(--bone2)]">Aqua’s {f.count.year} count against what we’d expect. {f.count.outside ? 'Unusual.' : 'Not unusual.'}</p>
          <p className="mt-3 text-sm text-[color:var(--bone3)]">{CAVEAT}</p>
        </div>
      ) : f.nov ? (
        <div>
          <p className="text-[40px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[color:var(--bone)]">{f.nov.from.ratio.toFixed(2)} → {f.nov.to.ratio.toFixed(2)}</p>
          <p className="mt-2 text-sm text-[color:var(--bone2)]">Aqua’s November count as a share of VIIRS’s, {f.nov.from.year} → {f.nov.to.year}</p>
          <p className="mt-1 text-xs text-[color:var(--bone3)]">Our test case. 2023–2025 have too few fires to read.</p>
        </div>
      ) : null}
      {/* the switch: Aqua at its old time or its new one; the numbers roll and the map follows */}
      <section aria-labelledby="try-h" className="flex flex-col gap-3">
        <h3 id="try-h" className="text-sm font-medium text-[color:var(--bone)]">Try Aqua’s two times</h3>
        <SegmentedControl<Clock>
          label="Aqua's time"
          value={clock}
          onChange={onClock}
          motion={motion}
          segmentClassName="px-3 py-2 text-left"
          options={[
            { value: 'old', name: `Old time, ${f.look.old ?? 'unknown'}`, label: <span><span className="block text-sm font-medium">Old time</span><span className="block text-xs tabular-nums opacity-80">{f.look.old ?? '—'}</span></span> },
            { value: 'new', name: `New time, ${f.look.now ?? 'unknown'}`, label: <span><span className="block text-sm font-medium">New time</span><span className="block text-xs tabular-nums opacity-80">{f.look.now ?? '—'}</span></span> },
          ]}
        />
        <dl className="flex flex-col">
          <Readout name="Aqua looks at" value={look[clock]} basis={look[old ? 'new' : 'old']} format={fmtHM} formatDelta={(d) => `${d > 0 ? '+' : '−'}${Math.abs(Math.round(d * 60))} min`} motion={motion} />
          {count ? (
            <Readout name={old ? 'Fires we’d expect Aqua to count' : 'Fires Aqua counted'} note={old ? `${f.count?.year}, estimated` : `${f.count?.year}, counted`} value={count[clock]} basis={count[old ? 'new' : 'old']} format={fmtInt} formatDelta={(d) => `${d > 0 ? '+' : '−'}${fmtInt(Math.abs(d))}`} motion={motion} />
          ) : (
            <div className="border-t border-[color:var(--hairline)] py-2.5"><dt className="text-xs text-[color:var(--bone2)]">Fires counted</dt><dd className="mt-0.5 text-sm text-[color:var(--bone3)]">Too few to read in 2025</dd></div>
          )}
          <Readout name="Daylight left after the alert" note="alert 1.5 h after the pass" value={light[clock]} basis={light[old ? 'new' : 'old']} format={(h) => dur(h)} formatDelta={(d) => `${d > 0 ? '+' : '−'}${Math.abs(Math.round(d * 60))} min`} motion={motion} />
        </dl>
        <p className="text-sm text-[color:var(--bone3)]">The map shows {old ? 'the fires VIIRS saw, at about Aqua’s old time.' : 'the fires Aqua saw.'}</p>
      </section>

      {daylight}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onStrongest} className={secondary}><Flame size={15} strokeWidth={1.75} aria-hidden /> Strongest fire</button>
        <a href={studyHref} onClick={leave} className={primary}>{short(f.d.name)} in Regions <ArrowRight size={15} strokeWidth={1.75} aria-hidden /></a>
      </div>
    </div>
  )
}

/** One value that rolls when the clock flips (21st.dev's delta number ticker), with how far it is from the other time. */
function Readout({ name, note, value, basis, format, formatDelta, motion }: {
  name: string; note?: string; value: number | null; basis: number | null; format: (v: number) => string; formatDelta: (d: number) => string; motion: boolean
}) {
  return (
    <div className="border-t border-[color:var(--hairline)] py-2.5">
      <dt className="flex items-baseline justify-between gap-2 text-xs text-[color:var(--bone2)]"><span>{name}</span>{note ? <span className="text-[11px] text-[color:var(--bone3)]">{note}</span> : null}</dt>
      <dd className="mt-0.5">
        {value == null ? <span className="text-lg text-[color:var(--bone3)]">—</span> : (
          <DeltaTicker value={value} basis={basis} format={format} formatDelta={formatDelta} suffix="vs the other time" label={name} motion={motion} ghost={false} valueClassName="text-[22px] font-medium leading-[1.25] tracking-[-0.01em] text-[color:var(--bone)]" />
        )}
      </dd>
    </div>
  )
}

function PlacePanel({ place, headRef, onBack, onFly, onStrongest, cell, year, onCell, alert }: {
  place: Place; headRef: RefObject<HTMLHeadingElement>; onBack: () => void; onFly: (id: string) => void; onStrongest: () => void
  cell: GlobalCell | null; year: 2024 | 2025; onCell?: (id: string) => void; alert?: ReactNode
}) {
  const s = useMemo(() => summary(boxFor(place)), [place])
  const inside = studiedFor(place)
  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-4">
      <BackButton onBack={onBack} />
      <div>
        <h2 ref={headRef} tabIndex={-1} className="text-2xl font-medium leading-tight tracking-[-0.015em] text-[color:var(--bone)] outline-none [overflow-wrap:anywhere]">{place.name}</h2>
        <p className="mt-1 text-sm text-[color:var(--bone3)]">{place.kind}</p>
      </div>
      {alert ? <div className="border-y border-[color:var(--hairline)] py-5">{alert}</div> : null}
      {inside.length ? (
        <div>
          <p className="text-xs text-[color:var(--bone3)]">Studied here</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {inside.map((id) => (
              <button key={id} type="button" onClick={() => onFly(id)} className={secondary}>
                {short(REGIONS.find((r) => r.id === id)?.name ?? id)} <ArrowRight size={14} strokeWidth={1.75} aria-hidden />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {onCell ? (
        <div>
          <div className="flex items-baseline justify-between gap-3 border-b border-[color:var(--hairline)] pb-2">
            <h3 className="text-sm font-medium text-[color:var(--bone)]">Aqua’s count here</h3>
            <span className="text-xs text-[color:var(--bone3)]">{year}, the 2° square at this point</span>
          </div>
          <CellReading cell={cell} year={year} className="mt-3" />
          <p className="mt-2 text-xs leading-5 text-[color:var(--bone3)]">{EXPLORATORY}</p>
          {cell ? <button type="button" onClick={() => onCell(cell.id)} className={cn(secondary, 'mt-3')}>This square’s numbers <ArrowRight size={14} strokeWidth={1.75} aria-hidden /></button> : null}
        </div>
      ) : null}
      <div>
        <div className="flex items-baseline justify-between gap-3 border-b border-[color:var(--hairline)] pb-2">
          <h3 className="text-sm font-medium text-[color:var(--bone)]">Past day here</h3>
          <span className="text-xs text-[color:var(--bone3)]">{WHEN}</span>
        </div>
        <table className="w-full border-collapse">
          <caption className="sr-only">Daytime fire detections in this area, by satellite</caption>
          <thead>
            <tr className="text-xs">
              <th scope="col" className="pt-2 text-left font-normal text-[color:var(--bone3)]"><span className="sr-only">Satellite</span></th>
              <th scope="col" className="pt-2 text-right font-normal text-[color:var(--bone3)]">Looked</th>
              <th scope="col" className="pt-2 text-right font-normal text-[color:var(--bone3)]">Fires</th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((g) => (
              <tr key={g} className="border-b border-[color:var(--hairline)]">
                <th scope="row" className="py-2.5 text-left text-sm font-normal text-[color:var(--bone)]"><span className="flex items-center gap-2"><Mark g={g} />{NAME[g]}</span></th>
                <td className="py-2.5 text-right text-sm tabular-nums text-[color:var(--bone)]">{s[g].lst != null ? fmtHM(s[g].lst!) : '—'}</td>
                <td className="py-2.5 text-right text-sm tabular-nums text-[color:var(--bone2)]">{fmtInt(s[g].n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-[color:var(--bone3)]">The middle of each satellite’s looks, in local sun time. Real detections; not part of the audit.</p>
      </div>
      {s.total ? <button type="button" onClick={onStrongest} className={cn(secondary, 'w-fit')}><Flame size={15} strokeWidth={1.75} aria-hidden /> Strongest fire</button> : null}
    </div>
  )
}

/* ---------- under the map: one fire day ---------- */

const dayLabel = (s: string) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}` }

/** the alert delays: NASA's published range for FIRMS near-real-time data */
const DELAYS: { value: DayDelay; name: string; label: string }[] = [
  { value: 0, name: 'No delay, the best case', label: 'None' },
  { value: 1.5, name: 'One and a half hours, inside the 60 to 125 minutes NASA reports for MODIS on average', label: '1.5 h' },
  { value: 3, name: 'Three hours, the limit NASA states', label: '3 h' },
]

/** One real fire day: pick the satellite whose pass raises the alert and the alert's delay; the numbers roll (21st.dev's
 *  delta number ticker) and the map shows which of the day's fires that satellite saw. Nothing here is modelled: alert =
 *  the end of the pass plus the delay, daylight left = sunset minus the alert. */
function FireDayPanel({ day, setDay, onClose, motion }: { day: { src: DaySource; delay: DayDelay }; setDay: (d: { src: DaySource; delay: DayDelay }) => void; onClose: () => void; motion: boolean }) {
  const r = dayRun(day.src, day.delay)
  const stat = 'border-t border-[color:var(--hairline)] pt-2'
  const big = 'text-[22px] font-medium leading-[1.25] tracking-[-0.01em] text-[color:var(--bone)]'
  return (
    <section aria-labelledby="fireday-h" className={cn(glass, 'px-4 pb-3 pt-3')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="fireday-h" className="text-sm font-medium text-[color:var(--bone)]">One fire day: {dayLabel(FIRE_DAY_DATE)}, Pará, Brazil</h2>
          <p className="mt-0.5 text-xs leading-5 text-[color:var(--bone3)]">
            Real data: {DAY_FIRES.length} fires, which satellites saw each, and when each passed (NASA FIRMS). S-NPP and NOAA-20 carry VIIRS. The delay is the range NASA publishes for its fire data.
          </p>
        </div>
        <button type="button" aria-label="Back to the past day's fires" title="Back to the past day's fires" onClick={onClose} className={cn('-mr-1 grid size-9 shrink-0 place-items-center rounded text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>
          <X size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="min-w-[300px] flex-1">
          <p className="mb-1 text-xs text-[color:var(--bone2)]">Alert from</p>
          <SegmentedControl<DaySource>
            label="Alert from"
            value={day.src}
            onChange={(src) => setDay({ ...day, src })}
            motion={motion}
            segmentClassName="px-2 py-1.5 text-center"
            options={DAY_SOURCES.map((v) => ({ value: v, name: `${v}, pass ends ${fmtHM(PASS_END[v])}`, label: <span><span className="block text-sm">{v}</span><span className="block text-[11px] tabular-nums opacity-80">{fmtHM(PASS_END[v])}</span></span> }))}
          />
        </div>
        <div className="w-[190px]">
          <p className="mb-1 text-xs text-[color:var(--bone2)]">Delay before the alert</p>
          <SegmentedControl<DayDelay>
            label="Delay before the alert"
            value={day.delay}
            onChange={(delay) => setDay({ ...day, delay })}
            motion={motion}
            segmentClassName="px-2 py-[11px] text-center text-sm"
            options={DELAYS}
          />
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <div className={stat}><dt className="text-xs text-[color:var(--bone2)]">Alert arrives</dt><dd><DeltaTicker value={r.alert} basis={null} format={fmtHM} formatDelta={() => ''} label="Alert arrives" motion={motion} ghost={false} valueClassName={big} /></dd></div>
        <div className={stat}><dt className="text-xs text-[color:var(--bone2)]">Daylight left</dt><dd><DeltaTicker value={r.daylight} basis={null} format={(h) => dur(h)} formatDelta={() => ''} label="Daylight left" motion={motion} ghost={false} valueClassName={big} /></dd></div>
        <div className={stat}><dt className="text-xs text-[color:var(--bone2)]">Fires this pass saw</dt><dd className="flex items-baseline gap-1.5"><DeltaTicker value={r.seen} basis={null} format={fmtInt} formatDelta={() => ''} label="Fires this pass saw" motion={motion} ghost={false} valueClassName={big} /><span className="text-xs tabular-nums text-[color:var(--bone3)]">of {r.total}</span></dd></div>
        <div className={stat}><dt className="text-xs text-[color:var(--bone2)]">Sunset</dt><dd className={cn(big, 'tabular-nums')}>{fmtHM(SUNSET)}</dd></div>
      </dl>
      <div aria-hidden className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[color:var(--bone2)]">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[color:var(--bone)]" />seen by this satellite</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#8D8A84]" />missed by this satellite</span>
      </div>
      <p className="mt-2 text-[11px] text-[color:var(--bone3)]">Times are local sun time. Delay: none is the best case; NASA reports 60 to 125 minutes on average for MODIS; 3 hours is the limit NASA states. Sunset from NOAA’s solar equations.</p>
    </section>
  )
}

/* ---------- the world's 2-degree squares ---------- */

const pctOf = (L: number) => `${signed((L - 1) * 100)}%`

/** One square's reading for a year, in the Region panel's shape. */
function CellReading({ cell, year, className }: { cell: GlobalCell | null; year: 2024 | 2025; className?: string }) {
  const r = cell ? reading(cell, year) : null
  if (!cell || !r || !r.ok || r.L == null || r.lo == null || r.hi == null) {
    return <p className={cn('text-sm text-[color:var(--bone2)]', className)}>Too few fires to read in {year}. That is not the same as no change.</p>
  }
  const usual = cell.placebo_min != null && cell.placebo_max != null ? ` (its usual range: ${pctOf(cell.placebo_min)} to ${pctOf(cell.placebo_max)})` : ''
  return (
    <div className={className}>
      <p className="text-[40px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[color:var(--bone)]">{pctOf(r.L)}</p>
      <p className="mt-2 text-sm text-[color:var(--bone2)]">Aqua’s {year} count vs what we’d expect</p>
      <p className="mt-1 text-xs tabular-nums text-[color:var(--bone3)]">How sure we are: {pctOf(r.lo)} to {pctOf(r.hi)} · {r.outside ? 'unusual' : 'not unusual'} for this square{usual}</p>
      {r.shift != null ? <p className="mt-1 text-xs tabular-nums text-[color:var(--bone3)]">Aqua’s look time here: {fmtShift(r.shift)} against 2012–2020</p> : null}
    </div>
  )
}

/** The rail for a picked square: its reading, the caveat, and the way to its calendar and its fires. */
function CellRail({ cell, year, headRef, onBack, onCalendar, onZoom, zoomed }: {
  cell: GlobalCell; year: 2024 | 2025; headRef: RefObject<HTMLHeadingElement>; onBack: () => void; onCalendar: () => void; onZoom: () => void; zoomed: boolean
}) {
  const other = year === 2025 ? 2024 : 2025
  const o = reading(cell, other)
  const hasCalendar = cell.status === 'ok' || cell.status_2024 === 'ok'
  return (
    <div className="flex flex-col gap-6 px-5 pb-6 pt-4">
      <BackButton onBack={onBack} label="Back" />
      <div>
        <h2 ref={headRef} tabIndex={-1} className="text-2xl font-medium leading-tight tracking-[-0.015em] text-[color:var(--bone)] outline-none">One 2° square</h2>
        <p className="mt-1 text-sm tabular-nums text-[color:var(--bone3)]">{cellName(cell)}</p>
      </div>
      <div>
        <CellReading cell={cell} year={year} />
        <p className="mt-3 text-xs leading-5 text-[color:var(--bone2)]">{CAVEAT}</p>
        <p className="mt-2 text-xs leading-5 text-[color:var(--bone3)]">{EXPLORATORY}</p>
      </div>
      <dl className="flex flex-col">
        <div className="border-t border-[color:var(--hairline)] py-2.5">
          <dt className="text-xs text-[color:var(--bone2)]">{other}</dt>
          <dd className="mt-0.5 text-sm tabular-nums text-[color:var(--bone)]">{o.ok && o.L != null && o.lo != null && o.hi != null ? `${pctOf(o.L)} (${pctOf(o.lo)} to ${pctOf(o.hi)}), ${o.outside ? 'unusual' : 'not unusual'}` : 'Too few fires to read'}</dd>
        </div>
        <div className="border-t border-[color:var(--hairline)] py-2.5">
          <dt className="text-xs text-[color:var(--bone2)]">Fires counted here in 2025, on days both satellites reported</dt>
          <dd className="mt-0.5 text-sm tabular-nums text-[color:var(--bone)]">Aqua {fmtInt(cell.n_aqua_2025)} · S-NPP {fmtInt(cell.n_snpp_2025)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {hasCalendar ? <button type="button" onClick={onCalendar} className={primary}>Month by month <ArrowRight size={15} strokeWidth={1.75} aria-hidden /></button> : null}
        <button type="button" onClick={onZoom} disabled={zoomed} className={cn(secondary, 'disabled:opacity-50')}><Flame size={15} strokeWidth={1.75} aria-hidden /> {zoomed ? 'Showing this square’s fires' : 'Past day’s fires here'}</button>
      </div>
    </div>
  )
}

/** On the map: what it shows (the world's squares or the past day's fires), the year, the scale, and the caveat. */
function WorldControl({ grid, layer, setLayer, year, setYear, hover, closeIn, wide, motion }: {
  grid: GlobalGrid; layer: 'clock' | 'fires'; setLayer: (l: 'clock' | 'fires') => void; year: 2024 | 2025; setYear: (y: 2024 | 2025) => void
  hover: GlobalCell | null; closeIn: boolean; wide: boolean; motion: boolean
}) {
  const tally = useMemo(() => {
    let ok = 0, up = 0, down = 0
    for (const c of grid.cells) { const r = reading(c, year); if (r.ok && r.L != null) { ok++; if (r.outside) { if (r.L > 1) up++; else down++ } } }
    return { ok, up, down }
  }, [grid, year])
  const h = hover ? reading(hover, year) : null
  const sw = 'inline-block h-2.5 w-3.5'
  return (
    <div className={cn(glass, 'absolute z-20 px-3 pb-3 pt-2.5', wide ? 'left-4 top-4 w-[272px]' : 'inset-x-3 top-[68px]')}>
      <SegmentedControl<'clock' | 'fires'>
        label="The map shows"
        value={layer}
        onChange={setLayer}
        motion={motion}
        segmentClassName="px-2 py-1.5 text-center text-[13px]"
        options={[{ value: 'clock', name: 'Aqua’s count against what we’d expect, by 2-degree square', label: 'Count by square' }, { value: 'fires', name: 'The past day’s fires', label: 'Past day’s fires' }]}
      />
      {layer === 'clock' && closeIn ? (
        <p className="mt-2 text-[11px] leading-4 text-[color:var(--bone2)]">Zoom out to see the squares.</p>
      ) : layer === 'clock' ? (
        <>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <p className="text-xs leading-4 text-[color:var(--bone)]">Aqua’s count against<br />what we’d expect</p>
            <SegmentedControl<2024 | 2025> label="Year" value={year} onChange={setYear} motion={motion} segmentClassName="px-2 py-1 text-xs tabular-nums" options={[{ value: 2025, name: '2025', label: '2025' }, { value: 2024, name: '2024', label: '2024' }]} />
          </div>
          {wide ? (
            <>
              <div aria-hidden className="mt-2.5 flex items-center gap-2 text-xs text-[color:var(--bone3)]">
                <span>below</span>
                <span className="flex gap-px">
                  {[4, 3, 2, 1, 0].map((i) => <span key={`d${i}`} className={sw} style={{ background: DOWN[i] }} />)}
                  <span className={sw} style={{ background: NEAR }} />
                  {[0, 1, 2, 3, 4].map((i) => <span key={`u${i}`} className={sw} style={{ background: UP[i] }} />)}
                </span>
                <span>above</span>
              </div>
              <p className="mt-2 min-h-8 text-[11px] leading-4 tabular-nums text-[color:var(--bone)]" aria-live="off">
                {hover ? `${cellName(hover)}: ${h && h.ok && h.L != null && h.lo != null && h.hi != null ? `${pctOf(h.L)} (${pctOf(h.lo)} to ${pctOf(h.hi)}), ${h.outside ? 'unusual' : 'not unusual'}` : 'too few fires to read'}` : 'Point at a square to read it; click for its numbers.'}
              </p>
            </>
          ) : null}
          <p className="mt-1.5 text-[11px] leading-4 text-[color:var(--bone3)]">{EXPLORATORY}</p>
          {wide ? (
            <details className="group mt-1">
              <summary className={cn('flex min-h-6 cursor-pointer list-none items-center gap-1 rounded text-[11px] text-[color:var(--bone2)] hover:text-[color:var(--bone)] [&::-webkit-details-marker]:hidden', focusRing)}>
                <ChevronDown size={12} strokeWidth={1.5} aria-hidden className="transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" /> How to read it
              </summary>
              <p className="mt-1 text-[11px] leading-4 text-[color:var(--bone3)]">
                Strong colour: unusual for that square. Faint: not unusual. Outline only: too few fires to read. Colour steps at {L_STEPS.map((t) => Math.round(t * 100)).join(', ')}% from what we’d expect.
              </p>
              <p className="mt-1 text-[11px] leading-4 tabular-nums text-[color:var(--bone2)]">{fmtInt(tally.ok)} squares can be read; {fmtInt(tally.up + tally.down)} are unusual ({fmtInt(tally.up)} above, {fmtInt(tally.down)} below).</p>
            </details>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/* ---------- under the map: when each satellite looked ---------- */

/** the satellite colours as literals, for the chart's SVG */
const HEX: Record<SatGroup, string> = { terra: '#448BCB', viirs: '#49A46E', aqua: '#C8801F' }
const TICKS = [6, 9, 12, 15, 18].map((h) => ({ x: h, label: h === 12 ? 'Noon' : `${h > 12 ? h - 12 : h} ${h > 12 ? 'pm' : 'am'}` }))

/** Each satellite's fires by time of day, as one hump per satellite (21st.dev's Chart Line), with Aqua's 2012–20
 *  clock marked and an arrow to where Aqua looks now. Each hump is scaled to its own peak: it shows when, not how many;
 *  the tooltip gives the counts. */
function LookChart({ box: viewBox, probe, show, setShow, fire, near, oldClock, live, motion, onFold }: {
  box: Box | null; probe: Probe; show: Show; setShow: (s: Show) => void; fire: number | null; near: number[]; oldClock: { from: number; to: number } | null; live: boolean; motion: boolean
  /** folds the chart down to a bar */
  onFold?: () => void
}) {
  const pointed = useSyncExternalStore(probe.subscribe, probe.get)
  const box = pointed ?? viewBox
  const key = box ? box.map((v) => v.toFixed(2)).join(',') : 'world'
  const hist = useMemo(() => histogram(box), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const sum = useMemo(() => summary(box), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [sources, setSources] = useState(false)
  const data = useMemo(() => {
    const peak = { terra: Math.max(1, ...hist.terra), viirs: Math.max(1, ...hist.viirs), aqua: Math.max(1, ...hist.aqua) }
    return hist.terra.map((_, k) => ({ x: BIN_FROM + (k + 0.5) * BIN, terra: hist.terra[k] / peak.terra, viirs: hist.viirs[k] / peak.viirs, aqua: hist.aqua[k] / peak.aqua }))
  }, [hist])
  const series = GROUPS.map((g) => ({ key: g, label: NAME[g], color: HEX[g], mark: <Mark g={g} size={9} />, note: sum[g].lst != null ? fmtHM(sum[g].lst!) : undefined }))
  const hidden = new Set(GROUPS.filter((g) => !show[g]))
  const median = (g: SatGroup) => (sum[g].lst != null ? fmtHM(sum[g].lst!) : 'none')
  return (
    <ChartLine
      title="When each satellite saw fires"
      description={`${pointed ? 'Fires in the square at your pointer' : box ? 'Fires in view' : 'All fires on the map'}, ${WHEN}, by local sun time`}
      data={data}
      series={series}
      domain={[BIN_FROM, BIN_TO]}
      ticks={TICKS}
      hidden={hidden}
      action={
        <span className="flex items-center gap-1">
          {hidden.size ? (
            <button type="button" onClick={() => setShow({ terra: true, viirs: true, aqua: true })} className={cn('min-h-8 rounded px-1 text-xs text-[color:var(--bone2)] underline decoration-[color:var(--bone-30)] underline-offset-2 hover:text-[color:var(--bone)]', focusRing)}>
              Show all three
            </button>
          ) : null}
          {onFold ? (
            <button type="button" aria-label="Fold the chart away" title="Fold the chart away" onClick={onFold} className={cn('grid size-8 place-items-center rounded text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>
              <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </span>
      }
      bands={oldClock ? [{ from: oldClock.from, to: oldClock.to, label: 'Aqua’s old time', arrowTo: show.aqua && sum.aqua.n ? sum.aqua.lst : null }] : []}
      markers={near.map((j) => ({ key: String(j), series: groupOf(SAT[j]), x: lstOf(j), strong: j === fire }))}
      tooltip={(k) => ({
        title: `${fmtHM(BIN_FROM + k * BIN)}–${fmtHM(BIN_FROM + (k + 1) * BIN)}`,
        rows: GROUPS.filter((g) => show[g]).map((g) => ({ key: g, label: NAME[g], value: `${fmtInt(hist[g][k])} fires`, mark: <Mark g={g} size={8} /> })),
      })}
      motion={motion}
      summary={`Median local solar time of the fires: Terra ${median('terra')}, VIIRS ${median('viirs')}, Aqua ${median('aqua')}.${oldClock ? ` In 2012 to 2020 Aqua looked at ${fmtHM(oldClock.from)}${oldClock.to - oldClock.from > 0.02 ? ` to ${fmtHM(oldClock.to)}` : ''}.` : ''}`}
      empty="No daytime fires in view."
      footer={
        <>
          {/* the sources, folded away under the chart */}
          <div className="mt-1 flex justify-end">
            <button type="button" aria-expanded={sources} onClick={() => setSources(!sources)} className={cn('flex min-h-6 items-center gap-1 rounded text-[11px] text-[color:var(--bone3)] hover:text-[color:var(--bone)]', focusRing)}>
              Sources <ChevronDown size={12} strokeWidth={1.5} aria-hidden className={cn('transition-transform duration-150 motion-reduce:transition-none', sources && 'rotate-180')} />
            </button>
          </div>
          {sources ? (
            <ul className="mt-1 flex list-none flex-col gap-1 border-t border-[color:var(--hairline)] pt-2 text-[11px] text-[color:var(--bone3)]">
              <li>Fires: NASA FIRMS, MODIS (Terra, Aqua) and VIIRS 375 m (NOAA-20, NOAA-21), {WINDOW.start} to {WINDOW.end} UTC. The files hold {fmtInt(TOTALS.reduce((a, b) => a + b, 0))} daytime detections; the map draws {fmtInt(DOTS)}, the strongest per satellite in each 2 km square.</li>
              <li>Globe: NASA Blue Marble{live ? ', through NASA GIBS' : ''}.</li>
              {live ? <li>Close up: Sentinel-2 cloudless 2016 by EOX (s2maps.eu), contains modified Copernicus Sentinel data 2016, CC BY 4.0.</li> : null}
              <li>Aqua 2012–20: the team’s drift files. Countries: mledoze/countries, ODbL.</li>
            </ul>
          ) : null}
        </>
      }
    />
  )
}

/* ---------- on the map ---------- */

/** A 2-degree square's 2025 reading, as the fire card shows it. */
type SquareReading = { ok: boolean; gap: number | null; outside: boolean | null }

const fmtMW = (v: number) => (v < 10 ? v.toFixed(1) : fmtInt(v))
const fmtLeft = (h: number) => { let hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh += 1; mm = 0 } return hh ? `${hh} h ${String(mm).padStart(2, '0')} min` : `${mm} min` }
const DAY_A = 5, DAY_B = 20
/** about how tall the fire card is, for making room on the map */
const CARD_H = 450
const dayAt = (h: number) => `${((Math.min(DAY_B, Math.max(DAY_A, h)) - DAY_A) / (DAY_B - DAY_A)) * 100}%`

/** One detection, read out like an instrument: the satellite and its camera; the time and the heat, with where that heat
 *  ranks among the day's detections; the day as a strip (daylight, sunset, and when each satellite saw this spot); who
 *  missed it; then the daylight left, the UTC time, where it is, how wide the pixel is, what else burned nearby, and the
 *  2-degree square's 2025 reading. Every value is real: the day file (NASA FIRMS), NOAA's solar equations, the world map. */
function FireCard({ i, onClose, square, below = false, docked = false }: { i: number; onClose: () => void; square: SquareReading | null; below?: boolean; docked?: boolean }) {
  const who = sightings(i)
  const rows = [0, 3, 2, 1].map((s) => who[s]) // Terra, NOAA-21, NOAA-20, Aqua: about the order they look
  const g = groupOf(SAT[i])
  const lst = lstOf(i)
  const utc = utcOf(i)
  const sun = sunTimes(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate(), LAT[i])
  const left = sun.set - lst
  const hotter = Math.round(heatShare(i) * 100)
  const others = Math.max(0, near(LON[i], LAT[i], 3).length - 1)
  const modis = SAT[i] <= 1
  const [where, setWhere] = useState<string | null>(() => nameNear(LON[i], LAT[i]))
  useEffect(() => {
    let on = true
    setWhere(nameNear(LON[i], LAT[i]))
    nameAt(LON[i], LAT[i]).then((n) => { if (on && n) setWhere(n) })
    return () => { on = false }
  }, [i])
  const items: KeyValueListItem[] = [
    { label: 'Daylight left', value: left > 0 ? `${fmtLeft(left)}, sunset ${fmtHM(sun.set)}` : `None, sunset was ${fmtHM(sun.set)}` },
    { label: 'UTC', value: `${String(utc.getUTCHours()).padStart(2, '0')}:${String(utc.getUTCMinutes()).padStart(2, '0')}, ${utc.getUTCDate()} ${MONTHS_SHORT[utc.getUTCMonth()]}` },
    { label: 'Where', value: where ? <>{where}<span className="block text-[color:var(--bone3)]">{coords(LAT[i], LON[i])}</span></> : coords(LAT[i], LON[i]) },
    { label: 'Pixel', value: modis ? 'About 1 km across' : 'About 375 m across' },
    { label: 'Nearby', value: others ? `${others} more within 3 km` : 'None within 3 km' },
  ]
  if (square) items.push({
    label: 'Its 2° square',
    value: square.ok && square.gap != null ? `${square.gap >= 0 ? '+' : '−'}${Math.abs(square.gap).toFixed(0)}% vs what we’d expect` : 'Too few fires to read',
    description: square.ok ? `2025, ${square.outside ? 'unusual' : 'not unusual'}` : '2025',
  })
  return (
    <div role="group" aria-label={`${SAT_NAMES[SAT[i]]} fire detection`} className={cn('relative rounded-[4px] border border-[color:var(--bone-20)] bg-[rgba(11,13,11,0.96)] text-left', docked ? 'w-full' : 'w-[332px] shadow-[0_8px_24px_rgba(0,0,0,0.5)]')}>
      <div className="flex items-center gap-2 pl-3 pr-1.5 pt-1.5">
        <Mark g={g} />
        <p className="text-sm font-medium text-[color:var(--bone)]">
          {SAT_NAMES[SAT[i]]}<span className="font-normal text-[color:var(--bone3)]"> · {SENSOR[SAT[i]]}</span>
        </p>
        <button type="button" aria-label="Close" onClick={onClose} className={cn('ml-auto grid size-8 place-items-center rounded text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>
          <X size={15} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 px-3">
        <p>
          <span className="block text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[color:var(--bone)]">{fmtHM(lst)}</span>
          <span className="mt-1 block text-xs text-[color:var(--bone3)]">local sun time</span>
        </p>
        <p>
          <span className="block text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums text-[color:var(--bone)]">
            {fmtMW(FRP[i])}<span className="text-sm font-normal text-[color:var(--bone2)]"> MW</span>
          </span>
          <span className="mt-1 block text-xs text-[color:var(--bone3)]">heat it gave off</span>
        </p>
      </div>
      {/* where that heat sits among the day's detections */}
      <div className="flex items-center gap-3 px-3 pt-2.5">
        <span aria-hidden className="relative block h-1 flex-1 rounded-full bg-[color:var(--bone-20)]">
          <span className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--bone2)]" style={{ width: `${Math.max(2, hotter)}%` }} />
        </span>
        <span className="shrink-0 text-[11px] text-[color:var(--bone3)]">Hotter than {hotter}% of the day’s fires</span>
      </div>
      {/* the day as a strip: daylight, sunset, and when each satellite saw this spot */}
      <div className="px-3 pt-3" aria-hidden>
        <div className="relative h-5">
          <span className="absolute inset-x-0 top-1/2 h-px bg-[color:var(--bone-20)]" />
          <span className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-[2px] bg-[rgba(236,233,225,0.16)]" style={{ left: dayAt(sun.rise), width: `calc(${dayAt(sun.set)} - ${dayAt(sun.rise)})` }} />
          <span className="absolute top-0 h-5 w-px bg-[color:var(--bone-30)]" style={{ left: dayAt(sun.set) }} />
          {rows.filter((r) => r.i != null).map((r) => (
            <span key={r.sat} className="absolute top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center" style={{ left: dayAt(lstOf(r.i!)) }}>
              <Mark g={groupOf(r.sat)} size={r.i === i ? 11 : 8} />
            </span>
          ))}
        </div>
        <div className="relative mt-0.5 h-3.5 text-[11px] tabular-nums text-[color:var(--bone3)]">
          {[6, 12, 18].map((h) => <span key={h} className="absolute -translate-x-1/2" style={{ left: dayAt(h) }}>{String(h).padStart(2, '0')}:00</span>)}
        </div>
      </div>
      <p className="px-3 pt-2 text-xs text-[color:var(--bone3)]">The same spot, within 3 km, that day</p>
      <ul className="grid grid-cols-2 gap-x-3 px-3 pt-1">
        {rows.map(({ sat, i: j }) => (
          <li key={sat} className="flex h-6 items-center gap-2 text-xs">
            <Mark g={groupOf(sat)} size={8} off={j == null} />
            <span className={j === i ? 'font-medium text-[color:var(--bone)]' : j == null ? 'text-[color:var(--bone3)]' : 'text-[color:var(--bone2)]'}>{SAT_NAMES[sat]}</span>
            <span className={cn('ml-auto tabular-nums', j == null ? 'text-[color:var(--bone3)]' : 'text-[color:var(--bone)]')}>{j == null ? 'not seen' : fmtHM(lstOf(j))}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-[color:var(--hairline)] px-3 pb-1.5 pt-0.5">
        <KeyValueList items={items} variant="ruled" labelWidth="6.5rem" />
      </div>
      {docked ? null : <span aria-hidden className={cn('absolute left-1/2 size-3 -translate-x-1/2 rotate-45 border-[color:var(--bone-20)] bg-[rgba(11,13,11,0.96)]', below ? '-top-[7px] border-l border-t' : '-bottom-[7px] border-b border-r')} />}
    </div>
  )
}

/** The mark on a searched place: four corner ticks and its coordinates, locking on. */
function Reticle({ text, motion }: { text: string; motion: boolean }) {
  return (
    <div className="relative grid size-11 place-items-center">
      {(['left-0 top-0 border-l border-t', 'right-0 top-0 border-r border-t', 'bottom-0 right-0 border-b border-r', 'bottom-0 left-0 border-b border-l'] as const).map((c) => (
        <span key={c} aria-hidden className={cn('absolute size-2.5 border-[color:var(--bone)]', c)} />
      ))}
      <span aria-hidden className="size-1.5 rounded-full bg-[color:var(--bone)] shadow-[0_0_0_2px_rgba(11,13,11,0.7)]" />
      <span className="absolute left-1/2 top-[calc(100%+6px)] -translate-x-1/2 whitespace-nowrap rounded-[3px] bg-[rgba(11,13,11,0.9)] px-1.5 py-0.5 text-xs tabular-nums text-[color:var(--bone)]">
        <DecipherText text={text} motion={motion} />
      </span>
    </div>
  )
}

/** a faint star field behind the globe */
const STARS = 'bg-[image:radial-gradient(1px_1px_at_12%_18%,rgba(236,233,225,0.45),transparent),radial-gradient(1px_1px_at_72%_12%,rgba(236,233,225,0.3),transparent),radial-gradient(1px_1px_at_38%_82%,rgba(236,233,225,0.25),transparent),radial-gradient(1px_1px_at_88%_64%,rgba(236,233,225,0.35),transparent),radial-gradient(1px_1px_at_55%_40%,rgba(236,233,225,0.2),transparent)] bg-[length:380px_380px]'

/** the region tags on the globe (MapLibre markers are plain DOM, outside Tailwind's reach); white, as amber is Aqua's */
const TAG_CSS = `
.anchor-tag{display:flex;align-items:center;gap:6px;min-height:24px;padding:3px 8px 3px 6px;border-radius:3px;cursor:pointer;white-space:nowrap;
  background:rgba(11,13,11,0.9);border:1px solid rgba(236,233,225,0.35);color:#ECE9E1;font:500 12px/16px 'Albert Sans',ui-sans-serif,system-ui,sans-serif;
  box-shadow:0 4px 12px rgba(0,0,0,0.4);transition:background-color 150ms}
.anchor-tag:hover{background:#1C1F1D}
.anchor-tag[data-on="true"]{border-color:#ECE9E1}
.anchor-tag:focus-visible{outline:2px solid #ECE9E1;outline-offset:2px}
.anchor-tag-mark{width:6px;height:6px;border:1px solid #ECE9E1}
.anchor-tag[data-on="true"] .anchor-tag-mark{background:#ECE9E1}
.maplibregl-canvas:focus-visible{outline:2px solid #ECE9E1;outline-offset:-2px}
@media (forced-colors: active){.anchor-tag{border-color:CanvasText}}
`
