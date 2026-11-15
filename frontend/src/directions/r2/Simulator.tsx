/*
 * THESIS: The Simulator is a mission-control map, not a page. The Earth fills the screen and the instruments sit at
 *   its corners. It refuses the category's scrolling explainer of cards.
 * OWN-WORLD: Anchor dark. Ground #0B0D0B panels at 94% over NASA Blue Marble; bone text; Albert Sans. One colour per
 *   satellite (Aqua amber, Terra blue, VIIRS green). Fires are hot red-orange points. Amber corner brackets frame the
 *   studied regions. 4 px corners, hairline borders.
 * STORY: A judge searches any place, and the globe turns, zooms and flattens into a map. For a studied region the
 *   instruments show the fix, Aqua's drifted clock against its fixed clock, with counts, daylight and after-dark
 *   shares from the team's files. Anywhere else the panel says plainly that the place isn't studied yet.
 * FIRST VIEWPORT: A full-bleed globe on the Atlantic with the past day's fire points. Top left: search and the six
 *   studied regions as a target list. Top right: the Aqua's-clock instrument. Bottom left: zoom, coordinates, scale
 *   and sources. Studied: a sunrise-to-sunset rail at the bottom centre and the readout table at the bottom right.
 * FORM: corner instruments (HUD), candidate 7 of 7, no staging challenger, seed c0f24416.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode, type RefObject } from 'react'
import { ArrowDown, ArrowUp, ArrowUpRight, CornerDownLeft, Crosshair, Flame, Globe2, MapPin, Minus, Plus, Search, X } from 'lucide-react'
import { AnchorLogo } from '@/components/brand/anchor-logo'
import { DecipherText } from '@/components/ui/decipher-text'
import { DeltaTicker } from '@/components/ui/delta-ticker'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { EarthGlobe, type Box, type EarthHandle, type EarthOverlay, type EarthPadding, type EarthTarget } from '@/components/ui/earth-globe'
import { REGIONS, daylight, daylightHeadline, daylightYears, fmtHM, fmtInt, hm, isValidation, regionData, sunTimes, verdictHeadline } from '@/r2/data'
import { STUDIED_IN, STUDIED_PLACES, kmBetween, lookUpPlace, placeById, regionAt, searchPlaces, type Place } from '@/r2/places'
import FIRES from '@/r2/earth/fires-24h.json'
import CONTEXT from '@/r2/earth/context.json'
import { cn } from '@/lib/utils'

type Nav = 'dev' | 'artifact'
type Leave = (e: ReactMouseEvent<HTMLAnchorElement>) => void
type Clock = 'drifted' | 'fixed'
type Delay = 0 | 1.5 | 3

const IMG = `${import.meta.env.BASE_URL}img/`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Each studied region's map: NASA VIIRS (S-NPP) true colour on its fire season's middle day of 2025, with every VIIRS
 *  daytime fire detection of that week drawn on it (NASA GIBS), cut to the region's box. */
const SIM_MAPS: Record<string, { day: string; from: string; to: string }> = {
  'br-amazon': { day: '2025-09-15', from: '2025-09-12', to: '2025-09-18' },
  'br-cerrado': { day: '2025-09-15', from: '2025-09-12', to: '2025-09-18' },
  'br-pantanal': { day: '2025-09-15', from: '2025-09-12', to: '2025-09-18' },
  'ar-argentina': { day: '2025-08-15', from: '2025-08-12', to: '2025-08-18' },
  'in-punjab-haryana': { day: '2025-11-08', from: '2025-11-05', to: '2025-11-11' },
  'us-california': { day: '2025-09-15', from: '2025-09-12', to: '2025-09-18' },
}

const dayText = (s: string) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}` }
const shortDay = (s: string) => { const [, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]}` }
/** "2026-11-14 00:22 UTC" → "14 Nov 00:22" */
const stamp = (s: string) => { const [day, time] = s.split(' '); return `${shortDay(day)} ${time}` }
const short = (name: string) => name.replace(/ \(.*\)$/, '')
/** "4.31° S, 58.50° W" */
const coords = (lat: number, lon: number) => `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`
const dur = (h: number) => {
  const m = Math.round(h * 60)
  if (m < 0) return `${-m} min after dark`
  if (m === 0) return 'None'
  const hh = Math.floor(m / 60)
  return hh ? `${hh} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`
}
/** a share as the page says it: "About half", "About 9 in 10" */
const words = (p: number | undefined) =>
  p == null ? '—' : p === 0 ? 'None' : p >= 0.995 ? 'All' : p >= 0.95 ? 'Almost all' : p < 0.05 ? 'Under 1 in 20' : p >= 0.45 && p < 0.6 ? 'About half' : `About ${Math.round(p * 10)} in 10`

/** What the instruments show for a studied region; every value from the team's files. */
function regionFacts(id: string) {
  const d = regionData(id)
  const last = d.lastDrift
  const year = last?.year ?? 2025
  const head = daylightHeadline(id)
  const yrs = daylightYears(id)
  const dy = yrs.find((y) => y.year === year) ?? yrs[yrs.length - 1]
  const audit = d.years.find((y) => y.year === year)
  const lvl2 = head?.quote === 'level2a'
  const dl = daylight(d)
  const sun = dl?.at(year) ?? null
  return {
    d, year, lvl2, sun,
    season: dl?.season.label ?? null,
    mid: sun?.mid ?? null,
    terra: last ? hm(last.terra_lst) : null,
    viirs: last ? hm(last.viirs_lst) : null,
    aqua: last ? hm(last.aqua_lst) : null,
    base: d.baseLook ? hm(d.baseLook) : null,
    /** daylight left after an alert 1.5 h after the pass (hours): as flown in the year, and on the 2012-2020 clock */
    D15: {
      drifted: (lvl2 ? head?.level2a_aqua_D15_2025 : head?.aqua_D15_2025) ?? null,
      fixed: (lvl2 ? head?.level2a_aqua_D15_2012_2020_mean : head?.aqua_D15_2012_2020_mean) ?? null,
    },
    dark: { drifted: dy?.aqua_share_after_dark, fixed: dy?.aqua_cf_share_after_dark },
    under2: { drifted: dy?.aqua_share_under_2h, fixed: dy?.aqua_cf_share_under_2h },
    count: audit && audit.verdict !== 'na' ? audit.aqua : null,
    bench: audit && audit.verdict !== 'na' ? audit.fixed : null,
    verdict: audit?.verdict ?? 'na',
    headline: verdictHeadline(d),
  }
}
type Facts = ReturnType<typeof regionFacts>

/** the target list: each region's latest readable year against its fixed-clock benchmark */
const LIST = REGIONS.map((r) => {
  const d = regionData(r.id)
  const y = d.latestOk
  const country = /\((.*)\)$/.exec(r.name)?.[1] ?? ''
  if (isValidation(r.id) || !y || y.gap == null) {
    return { id: r.id, name: short(r.name), country, value: 'Validation case', outside: false, validation: true, title: 'The team’s validation case: its audit years have too few hotspots to read' }
  }
  const g = Math.round(y.gap)
  return {
    id: r.id, name: short(r.name), country, validation: false,
    value: `${g >= 0 ? '+' : '−'}${Math.abs(g)}%`,
    outside: y.verdict === 'outside',
    title: `${y.year}: Aqua’s count against its fixed-clock benchmark, ${y.verdict === 'outside' ? 'outside' : 'within'} the 2012–2020 placebo range`,
  }
})

/** how much later Aqua passed by 2025 across the studied regions (daylight files) */
const SHIFTS = REGIONS.map((r) => daylightHeadline(r.id)?.aqua_look_change_min).filter((v): v is number => v != null)
const SHIFT = SHIFTS.length ? `${Math.round(Math.min(...SHIFTS))}–${Math.round(Math.max(...SHIFTS))} min` : null

const BOXES: Record<string, Box> = Object.fromEntries(REGIONS.map((r) => [r.id, r.bbox as unknown as Box]))
const EARTH_REGIONS = REGIONS.map((r) => ({ id: r.id, name: r.name, bbox: r.bbox as unknown as Box }))
const boxFor = (p: Place): Box => {
  if (p.region) return BOXES[p.region]
  const hy = p.span / 2, hx = Math.min(179, p.span / 2 / Math.max(0.2, Math.cos((p.lat * Math.PI) / 180)))
  return [Math.max(-180, p.lon - hx), Math.max(-84, p.lat - hy), Math.min(180, p.lon + hx), Math.min(84, p.lat + hy)]
}

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

/* ---------- shared pieces ---------- */

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]'
const panel = 'pointer-events-auto rounded border border-[color:var(--hairline)] bg-[rgba(11,13,11,0.94)] shadow-[0_8px_24px_rgba(0,0,0,0.45)]'
const label = 'text-xs text-[color:var(--bone3)]'
const iconButton = cn('grid size-10 place-items-center text-[color:var(--bone2)] transition-colors duration-150 hover:bg-[color:var(--raised)] hover:text-[color:var(--bone)]', focusRing)
const primary = cn('inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[color:var(--bone)] px-4 text-sm font-medium text-[color:var(--ink)] transition-colors duration-150 hover:bg-[color:var(--bone-hover)]', focusRing)
const link = 'underline decoration-[color:var(--bone-30)] underline-offset-2 hover:text-[color:var(--bone)] hover:decoration-[color:var(--bone)]'

const AquaDot = ({ ghost = false, className }: { ghost?: boolean; className?: string }) => (
  <span aria-hidden className={cn('inline-block size-2.5 shrink-0 rounded-full', ghost ? 'border border-dashed border-[color:var(--sat-aqua)]' : 'bg-[color:var(--sat-aqua)]', className)} />
)

/* ---------- the page ---------- */

export default function Simulator({ home, regionsHref, leave, motion, setMotion, nav }: {
  home: string; regionsHref: (id: string) => string; leave: Leave; motion: boolean; setMotion: (on: boolean) => void; nav: Nav
}) {
  const wide = useMedia('(min-width: 1024px)')
  const xl = useMedia('(min-width: 1280px)')
  const [place, setPlace] = useState<Place | null>(() => { const id = readParam('place'); return id ? placeById(id) : null })
  const [arrived, setArrived] = useState(false)
  const [clock, setClockState] = useState<Clock>(() => (readParam('clock') === 'fixed' ? 'fixed' : 'drifted'))
  const [delay, setDelayState] = useState<Delay>(() => { const raw = readParam('delay'); const v = raw == null ? NaN : Number(raw); return v === 0 || v === 3 ? v : 1.5 })
  const [q, setQ] = useState(() => place?.name ?? '')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [online, setOnline] = useState<{ q: string; items: Place[]; state: 'idle' | 'busy' | 'failed' }>({ q: '', items: [], state: 'idle' })
  const [cursor, setCursor] = useState<{ lon: number; lat: number } | null>(null)
  const [view, setView] = useState({ zoom: 2, lat: 8, flat: 0 })
  const [failed, setFailed] = useState(false)
  const [sources, setSources] = useState(false)
  const [sheetH, setSheetH] = useState(200)
  const inputRef = useRef<HTMLInputElement>(null)
  const earth = useRef<EarthHandle | null>(null)
  const sheetRef = useRef<HTMLDivElement | null>(null)

  const setClock = (c: Clock) => { setClockState(c); writeParams(nav, { clock: c === 'fixed' ? 'fixed' : null }) }
  const setDelay = (v: Delay) => { setDelayState(v); writeParams(nav, { delay: v === 1.5 ? null : String(v) }) }

  const region = place ? place.region ?? (place.kind === 'Country' ? null : regionAt(place.lon, place.lat)) : null
  const facts = useMemo(() => (region ? regionFacts(region) : null), [region])
  const inCountry = place?.iso ? STUDIED_IN[place.iso] ?? null : null

  // search: local names first; with nothing local, Enter asks OpenStreetMap (the live site only). Nominatim's usage
  // policy forbids searching while typing, so it runs only on Enter, and at most once a second.
  const local = useMemo(() => searchPlaces(q), [q])
  const typing = q.trim().length > 0 && q !== place?.name
  const items = typing ? (local.length ? local : online.q === q ? online.items : []) : []
  const lastLookup = useRef(0)
  const lookUp = () => {
    const t = q.trim()
    if (nav === 'artifact' || local.length || t.length < 3 || Date.now() - lastLookup.current < 1100) return
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
    inputRef.current?.blur()
    writeParams(nav, { place: p.kind === 'Coordinates' ? `xy-${p.lat},${p.lon}` : p.id })
  }
  const back = () => { setPlace(null); setArrived(false); setQ(''); writeParams(nav, { place: null }) }
  const pickRegion = (id: string) => { const p = STUDIED_PLACES.find((x) => x.id === id); if (p) choose(p) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement
      if ((e.key === '/' && !inField) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); inputRef.current?.focus(); setOpen(true) }
      else if (e.key === 'Escape' && place && !inField) back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [place]) // eslint-disable-line react-hooks/exhaustive-deps

  // the phone sheet's height keeps the place clear of it
  useEffect(() => {
    const el = sheetRef.current
    if (!el || wide) return
    const ro = new ResizeObserver(() => setSheetH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [wide, place])

  // a page restored with a place in its URL flies there once the globe is up; without the globe, the panels show now
  useEffect(() => { if (failed && place) setArrived(true) }, [failed, place])

  const padding: EarthPadding = wide
    ? { top: 32, right: xl ? 408 : 372, bottom: xl && facts ? 176 : 40, left: xl ? 388 : 344 }
    : { top: 84, right: 24, bottom: sheetH + 16, left: 24 }
  // the comment page's own world image is soft up close, so places without a region map stop a little further out
  const target: EarthTarget = place ? { key: place.id, bbox: boxFor(place), maxZoom: nav === 'artifact' && !region ? 4.6 : undefined } : null
  const context: EarthOverlay = region ? { src: `${IMG}sim/${region}-context.jpg`, bbox: (CONTEXT as Record<string, number[]>)[region] as unknown as Box } : null
  const overlay: EarthOverlay = region && arrived ? { src: `${IMG}sim/${region}.jpg`, bbox: BOXES[region] } : null
  const fires = useMemo(() => FIRES.pts as number[], [])
  const firesWhen = `${stamp(FIRES.first)} to ${stamp(FIRES.last)} UTC`

  const instruments = facts
    ? <ClockInstrument f={facts} clock={clock} setClock={setClock} delay={delay} setDelay={setDelay} motion={motion} />
    : <ClockIdle place={place} />

  return (
    <>
      <style>{TAG_CSS}</style>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-[color:var(--hairline)] bg-[color:var(--ground)]">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 lg:px-6">
          <a href={home} onClick={leave} aria-label="Anchor home" className={cn('flex shrink-0 items-center rounded leading-none', focusRing)}>
            <AnchorLogo height={20} />
          </a>
          <nav aria-label="Pages" className="flex items-center gap-6 text-sm">
            <a href={regionsHref(region ?? 'br-amazon')} onClick={leave} className={cn('rounded py-2 text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>Regions</a>
            <span aria-current="page" className="border-b border-[color:var(--bone)] py-2 text-[color:var(--bone)]">Simulator</span>
          </nav>
        </div>
      </header>

      <main className="relative h-[100svh] min-h-[560px] overflow-hidden bg-[#03060A] pt-16">
        <h1 className="sr-only">Simulator: search a place to see what Aqua’s drifting clock changes there</h1>
        <div aria-hidden className={cn('absolute inset-x-0 bottom-0 top-16', STARS)} />
        {failed ? (
          <div className="absolute inset-x-0 bottom-0 top-16">
            <img src={`${IMG}earth/bluemarble-4096.jpg`} alt="" className="size-full object-cover opacity-80" />
          </div>
        ) : (
          <EarthGlobe
            ref={earth}
            className="absolute inset-x-0 bottom-0 top-16"
            regions={EARTH_REGIONS}
            selected={region}
            target={target}
            overlay={overlay}
            context={context}
            pin={place && !region ? { key: place.id, lon: place.lon, lat: place.lat } : null}
            pinContent={place && !region ? <Reticle text={coords(place.lat, place.lon)} motion={motion} /> : null}
            fires={fires}
            padding={padding}
            baseSrc={`${IMG}earth/bluemarble-4096.jpg`}
            live={nav !== 'artifact'}
            motion={motion}
            onArrive={() => setArrived(true)}
            onPick={pickRegion}
            onCursor={setCursor}
            onView={setView}
            onFail={() => setFailed(true)}
          />
        )}
        <p aria-live="polite" className="sr-only">{place && arrived ? `Showing ${place.name}${region ? ', a studied region' : ', not studied yet'}.` : ''}</p>
        {/* while the globe flies: what it is locking on to */}
        {place && !arrived && !failed ? (
          <div aria-hidden className={cn('pointer-events-none absolute z-20 flex justify-center', wide ? 'inset-x-0 top-[88px]' : 'inset-x-4 top-[148px]')}>
            <p className={cn(panel, 'flex items-center gap-3 px-3 py-2 text-xs')}>
              <span className="size-1.5 animate-pulse rounded-full bg-[color:var(--sat-aqua)] motion-reduce:animate-none" />
              <span className="text-[color:var(--bone2)]">Locating</span>
              <DecipherText key={place.id} text={place.name} motion={motion} className="text-sm text-[color:var(--bone)]" />
              <DecipherText key={`${place.id}-xy`} text={coords(place.lat, place.lon)} motion={motion} delay={250} className="tabular-nums text-[color:var(--bone3)]" />
            </p>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-16 z-10">
          {/* top left: search and the studied regions */}
          <div className={cn('absolute left-4 right-[68px] top-4 lg:left-6 lg:right-auto lg:top-6', xl ? 'lg:w-[340px]' : 'lg:w-[300px]')}>
            <div className={panel}>
              <SearchField
                inputRef={inputRef} q={q} setQ={(v) => { setQ(v); setActive(0); setOpen(true) }} open={open} setOpen={setOpen}
                items={items} active={active} setActive={setActive} choose={choose} clear={back}
                busy={online.state === 'busy' && online.q === q} failed={online.state === 'failed' && online.q === q} offline={nav === 'artifact'} typing={typing} motion={motion} onSubmit={lookUp}
              />
              {wide && !(open && typing) ? <RegionList selected={region} onPick={pickRegion} /> : null}
            </div>
            {failed ? <p className={cn(panel, 'mt-2 px-3 py-2 text-xs text-[color:var(--bone2)]')}>This browser can’t draw the 3D globe. The search and the numbers still work.</p> : null}
          </div>

          {/* zoom and the whole globe: right edge on phones, bottom left above the readout on wide screens */}
          <div className={cn('absolute flex flex-col items-start', wide ? 'bottom-6 left-6' : 'right-4 top-4')}>
            {!failed ? (
              <div role="group" aria-label="Map view" className={cn(panel, 'flex w-10 flex-col divide-y divide-[color:var(--hairline)] overflow-hidden', wide && 'mb-2')}>
                <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => earth.current?.zoomBy(1)} className={iconButton}><Plus size={16} strokeWidth={1.75} aria-hidden /></button>
                <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => earth.current?.zoomBy(-1)} className={iconButton}><Minus size={16} strokeWidth={1.75} aria-hidden /></button>
                <button type="button" aria-label="Back to the whole globe" title="Whole globe" onClick={() => (place ? back() : earth.current?.home())} className={iconButton}><Globe2 size={16} strokeWidth={1.75} aria-hidden /></button>
              </div>
            ) : null}
            {wide ? (
              <MapReadout cursor={cursor} view={view} firesWhen={firesWhen} region={arrived ? region : null} open={sources} setOpen={setSources} motion={motion} setMotion={setMotion} xl={xl} />
            ) : null}
          </div>

          {wide ? (
            <>
              {/* top right: the fix */}
              <div className={cn('absolute right-6 top-6', xl ? 'w-[360px]' : 'w-[324px]')}>
                <div className={cn(panel, 'p-4')}>{instruments}</div>
              </div>
              {place && arrived ? (
                <>
                  {facts && xl ? (
                    <div className="absolute bottom-6 left-1/2 w-[min(560px,calc(100%-2*(400px+24px)))] -translate-x-1/2 animate-[anchor-fade_300ms_cubic-bezier(0.22,1,0.36,1)]">
                      <div className={cn(panel, 'px-4 pb-3 pt-3')}><DayRail f={facts} clock={clock} delay={delay} /></div>
                    </div>
                  ) : null}
                  <div className={cn('absolute bottom-6 right-6 max-h-[calc(100%-252px)] animate-[anchor-fade_300ms_cubic-bezier(0.22,1,0.36,1)] overflow-auto rounded', xl ? 'w-[360px]' : 'w-[324px]')}>
                    <div className={cn(panel, 'p-4')}>
                      {facts ? (
                        <>
                          {!xl ? <div className="mb-4 border-b border-[color:var(--hairline)] pb-3"><DayRail f={facts} clock={clock} delay={delay} /></div> : null}
                          <Readout f={facts} clock={clock} delay={delay} studyHref={regionsHref(facts.d.id)} leave={leave} motion={motion} />
                        </>
                      ) : (
                        <Elsewhere place={place} inCountry={inCountry} onFly={pickRegion} motion={motion} />
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            /* phones: one sheet along the bottom */
            <div ref={sheetRef} className="absolute inset-x-0 bottom-0">
              <div className={cn(panel, 'max-h-[52svh] overflow-auto rounded-b-none border-x-0 border-b-0 px-4 pb-4 pt-3')}>
                {place ? (
                  <div className="flex flex-col gap-4">
                    {facts ? (
                      <>
                        {instruments}
                        <DayRail f={facts} clock={clock} delay={delay} />
                        <Readout f={facts} clock={clock} delay={delay} studyHref={regionsHref(facts.d.id)} leave={leave} motion={motion} />
                      </>
                    ) : (
                      <Elsewhere place={place} inCountry={inCountry} onFly={pickRegion} motion={motion} />
                    )}
                    <p className="text-xs text-[color:var(--bone3)]">Red points: NASA FIRMS fire detections from VIIRS (NOAA-20), {firesWhen}. Globe: NASA Blue Marble. Region maps: NASA Worldview / GIBS.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-[color:var(--bone2)]">Search any place, or pick a studied region:</p>
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                      {LIST.map((r) => (
                        <button key={r.id} type="button" onClick={() => pickRegion(r.id)} className={cn('flex min-h-11 shrink-0 items-center gap-2 rounded border border-[color:var(--bone-20)] px-3 text-sm text-[color:var(--bone)] hover:bg-[color:var(--raised)]', focusRing)}>
                          <span aria-hidden className="size-1.5 bg-[color:var(--sat-aqua)]" />{r.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[color:var(--bone3)]">Red points: NASA FIRMS fire detections from VIIRS (NOAA-20), {firesWhen}.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

/* ---------- top left: search and the target list ---------- */

/** what each kind of result is called and shown with in the search list */
const KINDS: { kind: Place['kind']; title: string; icon: ReactNode }[] = [
  { kind: 'Studied region', title: 'Studied regions', icon: <span className="size-2 border border-[color:var(--sat-aqua)]" /> },
  { kind: 'Fire area', title: 'Fire areas', icon: <Flame size={14} strokeWidth={1.75} /> },
  { kind: 'Country', title: 'Countries', icon: <Globe2 size={14} strokeWidth={1.75} /> },
  { kind: 'Coordinates', title: 'Coordinates', icon: <Crosshair size={14} strokeWidth={1.75} /> },
  { kind: 'Place', title: 'Places, from OpenStreetMap', icon: <MapPin size={14} strokeWidth={1.75} /> },
]

/** the letters of a name that the search matched: a run where the text contains the query, else each letter in order */
function matched(name: string, q: string) {
  const t = name.toLowerCase(), f = q.trim().toLowerCase()
  if (!f) return []
  const at = t.indexOf(f)
  if (at >= 0) return Array.from({ length: f.length }, (_, i) => at + i)
  const idx: number[] = []
  let j = 0
  for (let i = 0; i < t.length && j < f.length; i++) if (t[i] === f[j]) { idx.push(i); j++ }
  return j === f.length ? idx : []
}
function Lit({ text, idx }: { text: string; idx: number[] }) {
  if (!idx.length) return <>{text}</>
  const on = new Set(idx)
  return <>{Array.from(text).map((c, i) => (on.has(i) ? <span key={i} className="font-medium text-[color:var(--bone)] underline decoration-[color:var(--bone2)] underline-offset-[3px]">{c}</span> : c))}</>
}

/** The search, adapted from 21st.dev's command palette (vovalopuh13/command-palette): results grouped by kind, the
 *  matched letters underlined, a highlight that slides to the active row, Home and End, and the keys at the foot. */
function SearchField({ inputRef, q, setQ, open, setOpen, items, active, setActive, choose, clear, busy, failed, offline, typing, motion, onSubmit }: {
  inputRef: RefObject<HTMLInputElement>; q: string; setQ: (v: string) => void; open: boolean; setOpen: (v: boolean) => void
  items: Place[]; active: number; setActive: (f: (a: number) => number) => void; choose: (p: Place) => void; clear: () => void
  busy: boolean; failed: boolean; offline: boolean; typing: boolean; motion: boolean; onSubmit: () => void
}) {
  const show = open && typing
  const groups = KINDS.map((k) => ({ ...k, rows: items.filter((p) => p.kind === k.kind) })).filter((g) => g.rows.length)
  const flat = groups.flatMap((g) => g.rows)
  const listRef = useRef<HTMLUListElement | null>(null)
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null)
  useLayoutEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)
    if (!row) { setPill(null); return }
    setPill({ top: row.offsetTop, height: row.offsetHeight })
    row.scrollIntoView({ block: 'nearest' })
  }, [active, show, items])
  let n = -1
  return (
    <div className="relative">
      <label htmlFor="sim-q" className="sr-only">Search a place, a country, or coordinates</label>
      <div className="flex h-12 items-center gap-2 px-3">
        <Search size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-[color:var(--bone2)]" />
        <input
          id="sim-q"
          ref={inputRef}
          role="combobox"
          aria-expanded={show}
          aria-controls="sim-list"
          aria-autocomplete="list"
          aria-activedescendant={show && flat[active] ? `sim-opt-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search a place or lat, lon"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            const last = Math.max(0, flat.length - 1)
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a >= last ? 0 : a + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? last : a - 1)) }
            else if (e.key === 'Home' && show) { e.preventDefault(); setActive(() => 0) }
            else if (e.key === 'End' && show) { e.preventDefault(); setActive(() => last) }
            else if (e.key === 'Enter') { e.preventDefault(); if (flat[active]) choose(flat[active]); else onSubmit() }
            else if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur() }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-[color:var(--bone)] outline-none placeholder:text-[color:var(--bone3)]"
        />
        {q ? (
          <button type="button" aria-label="Clear and go back to the whole globe" onClick={() => { clear(); inputRef.current?.focus() }} className={cn('grid size-8 place-items-center rounded text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>
            <X size={16} strokeWidth={1.75} aria-hidden />
          </button>
        ) : (
          <kbd aria-hidden className="hidden rounded border border-[color:var(--bone-20)] px-1.5 font-[family-name:var(--f-ui)] text-xs text-[color:var(--bone3)] lg:inline">/</kbd>
        )}
      </div>
      {show ? (
        <div className="border-t border-[color:var(--hairline)]">
          <ul ref={listRef} id="sim-list" role="listbox" aria-label="Places" className="relative max-h-[46svh] overflow-auto p-1">
            {pill && flat.length ? (
              <li aria-hidden role="presentation" className={cn('pointer-events-none absolute inset-x-1 rounded-[3px] bg-[color:var(--raised)]', motion && 'transition-[top,height] duration-150 ease-[var(--ease)]')} style={{ top: pill.top, height: pill.height }} />
            ) : null}
            {groups.map((g) => (
              <li key={g.kind} role="presentation">
                <p className="sticky top-0 z-10 bg-[rgba(11,13,11,0.96)] px-2 pb-1 pt-2 text-xs text-[color:var(--bone3)]">{g.title}</p>
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
                        className={cn('relative flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[3px] px-2 text-sm', on ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone2)]')}
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
            {!flat.length ? (
              <li role="presentation" className="px-2 py-3 text-sm text-[color:var(--bone3)]">
                {busy ? 'Looking it up on OpenStreetMap…' : offline ? 'No match. Here, try a country, a studied region, or “lat, lon”.' : failed ? 'No match on OpenStreetMap either. Try a country, a studied region, or “lat, lon”.' : 'No match here. Press Enter to search OpenStreetMap.'}
              </li>
            ) : null}
          </ul>
          <div className="flex items-center justify-between border-t border-[color:var(--hairline)] px-3 py-2 text-xs text-[color:var(--bone3)]">
            <span aria-live="polite">{flat.length} {flat.length === 1 ? 'place' : 'places'}</span>
            <span aria-hidden className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Key><ArrowUp size={11} strokeWidth={2} /></Key><Key><ArrowDown size={11} strokeWidth={2} /></Key>move</span>
              <span className="flex items-center gap-1"><Key><CornerDownLeft size={11} strokeWidth={2} /></Key>fly there</span>
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

function RegionList({ selected, onPick }: { selected: string | null; onPick: (id: string) => void }) {
  return (
    <div className="border-t border-[color:var(--hairline)] pb-1">
      <p className="flex items-baseline justify-between gap-3 px-3 pb-1 pt-3">
        <span className="text-sm font-medium text-[color:var(--bone)]">Studied regions</span>
        <span className={label}>vs fixed clock, 2025</span>
      </p>
      <ul>
        {LIST.map((r) => {
          const on = r.id === selected
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r.id)}
                aria-current={on || undefined}
                title={r.title}
                className={cn('flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150', focusRing,
                  on ? 'bg-[color:var(--raised)]' : 'hover:bg-[color:var(--surface)]')}
              >
                <span aria-hidden className={cn('size-2 shrink-0', on ? 'bg-[color:var(--bone)]' : 'border border-[color:var(--sat-aqua)]')} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-[color:var(--bone)]">{r.name}</span>
                  {r.country ? <span className="block text-xs text-[color:var(--bone3)]">{r.country}</span> : null}
                </span>
                <span className="text-right">
                  <span className={cn('block text-sm tabular-nums', r.outside ? 'text-[color:var(--sat-aqua)]' : 'text-[color:var(--bone2)]')}>{r.value}</span>
                  {!r.validation ? <span className="block text-xs text-[color:var(--bone3)]">{r.outside ? 'outside range' : 'within range'}</span> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ---------- top right: Aqua's clock ---------- */

function ClockIdle({ place }: { place: Place | null }) {
  return (
    <div>
      <h2 className="text-base font-medium text-[color:var(--bone)]">Aqua’s clock</h2>
      <p className="mt-2 text-sm text-[color:var(--bone2)]">
        {place
          ? 'This place hasn’t been studied, so there is no pass time to move here. Pick a studied region to compare Aqua as it drifted with its fixed clock.'
          : `In the six studied regions, Aqua passed ${SHIFT ?? 'over an hour'} later by 2025 than in 2012–2020. Pick a region to compare the two clocks.`}
      </p>
    </div>
  )
}

function ClockInstrument({ f, clock, setClock, delay, setDelay, motion }: { f: Facts; clock: Clock; setClock: (c: Clock) => void; delay: Delay; setDelay: (d: Delay) => void; motion: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-[color:var(--bone)]">Aqua’s clock</h2>
        <span className={label}>{short(f.d.name)}, {f.year}</span>
      </div>
      <SegmentedControl<Clock>
        label="Aqua's clock"
        value={clock}
        onChange={setClock}
        motion={motion}
        segmentClassName="px-3 py-2 text-left"
        options={[
          { value: 'drifted', name: `As it drifted, ${f.aqua != null ? fmtHM(f.aqua) : 'unknown'} in ${f.year}`, label: <span className="flex items-center gap-2"><AquaDot /><span><span className="block font-medium">As it drifted</span><span className="block text-xs tabular-nums opacity-80">{f.aqua != null ? fmtHM(f.aqua) : '—'} in {f.year}</span></span></span> },
          { value: 'fixed', name: `Fixed clock, ${f.base != null ? fmtHM(f.base) : 'unknown'}, its 2012 to 2020 time`, label: <span className="flex items-center gap-2"><AquaDot ghost /><span><span className="block font-medium">Fixed clock</span><span className="block text-xs tabular-nums opacity-80">{f.base != null ? fmtHM(f.base) : '—'}, 2012–2020</span></span></span> },
        ]}
      />
      <div className="flex items-center justify-between gap-3">
        <span className={label}>Alert after the pass</span>
        <SegmentedControl<Delay>
          label="Alert after the pass"
          value={delay}
          onChange={setDelay}
          motion={motion}
          className="w-[196px]"
          segmentClassName="py-1.5 text-center tabular-nums"
          options={[{ value: 0, name: 'Right at the pass', label: '0 h' }, { value: 1.5, name: '1.5 hours after', label: '1.5 h' }, { value: 3, name: '3 hours after', label: '3 h' }]}
        />
      </div>
    </div>
  )
}

/* ---------- bottom centre: one fire-season day ---------- */

function DayRail({ f, clock, delay }: { f: Facts; clock: Clock; delay: Delay }) {
  if (!f.sun) return null
  const from = 5, to = 20
  const X = (h: number) => `${((Math.max(from, Math.min(to, h)) - from) / (to - from)) * 100}%`
  const aqua = clock === 'fixed' ? f.base : f.aqua
  const ghost = clock === 'fixed' ? f.aqua : f.base
  const alert = aqua != null ? aqua + delay : null
  const { rise, set } = f.sun
  const move = 'transition-[left,width] duration-500 ease-[var(--ease)] motion-reduce:transition-none'
  const day = f.mid ? `${f.mid.day} ${MONTHS[f.mid.m - 1]} ${f.mid.y}` : `${f.year}`
  return (
    <figure className="m-0">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-[color:var(--bone)]">One fire-season day, {day}</span>
        <span className={label}>local solar time</span>
      </figcaption>
      <div
        role="img"
        aria-label={`Sunrise ${fmtHM(rise)}, sunset ${fmtHM(set)}. Terra passes at ${f.terra != null ? fmtHM(f.terra) : 'an unknown time'}, VIIRS at ${f.viirs != null ? fmtHM(f.viirs) : 'an unknown time'}, Aqua at ${aqua != null ? fmtHM(aqua) : 'an unknown time'}${alert != null ? `; an alert ${delay} hours later comes at ${fmtHM(alert)}` : ''}.`}
        className="relative mt-2 h-[76px]"
      >
        {/* night, day, and the daylight left after the alert */}
        <div className="absolute inset-x-0 top-[30px] h-2 rounded-sm bg-[color:var(--surface)]" />
        <div className="absolute top-[30px] h-2 rounded-sm bg-[color:var(--bone-20)]" style={{ left: X(rise), width: `calc(${X(set)} - ${X(rise)})` }} />
        {alert != null && alert < set ? (
          <div className={cn('absolute top-[30px] h-2 rounded-sm bg-[color:var(--sat-aqua)]', move)} style={{ left: X(alert), width: `calc(${X(set)} - ${X(alert)})` }} />
        ) : null}
        {/* the passes: Terra and Aqua above the line, VIIRS below; the other clock's Aqua as a dashed ring */}
        {f.terra != null ? <Pin x={X(f.terra)} top label={`Terra ${fmtHM(f.terra)}`} mark={<span className="block size-2.5 rounded-full border-2 border-[color:var(--sat-terra)] bg-[color:var(--ground)]" />} /> : null}
        {ghost != null ? (
          <span aria-hidden className={cn('absolute top-[34px] size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[color:var(--sat-aqua)] bg-[color:var(--ground)]', move)} style={{ left: X(ghost) }} />
        ) : null}
        {aqua != null ? <Pin x={X(aqua)} top strong label={`Aqua ${fmtHM(aqua)}`} mark={<span className="block size-3 rounded-full bg-[color:var(--sat-aqua)]" />} className={move} /> : null}
        {f.viirs != null ? <Pin x={X(f.viirs)} label={`VIIRS ${fmtHM(f.viirs)}`} mark={<span className="block size-2.5 rotate-45 bg-[color:var(--sat-viirs)]" />} /> : null}
        {alert != null ? (
          <span aria-hidden className={cn('absolute top-[24px] h-5 w-0.5 -translate-x-1/2 bg-[color:var(--sat-aqua)]', move)} style={{ left: X(alert) }} />
        ) : null}
        <span aria-hidden className="absolute top-[22px] h-6 w-px bg-[color:var(--bone)]" style={{ left: X(set) }} />
        <span aria-hidden className="absolute top-[52px] -translate-x-1/2 whitespace-nowrap text-xs tabular-nums text-[color:var(--bone)]" style={{ left: X(set) }}>Sunset {fmtHM(set)}</span>
      </div>
      <div aria-hidden className="relative mt-1 h-4 text-xs tabular-nums text-[color:var(--bone3)]">
        {[6, 9, 12, 15].map((h) => <span key={h} className="absolute -translate-x-1/2" style={{ left: X(h) }}>{String(h).padStart(2, '0')}</span>)}
      </div>
      {f.lvl2 ? <p className="mt-1 text-xs text-[color:var(--bone3)]">The bar is one middle day; the table quotes the median over the year’s real fires.</p> : null}
    </figure>
  )
}

function Pin({ x, top = false, strong = false, label: text, mark, className }: { x: string; top?: boolean; strong?: boolean; label: string; mark: ReactNode; className?: string }) {
  return (
    <span aria-hidden className={cn('absolute flex -translate-x-1/2 items-center', top ? 'top-0 flex-col' : 'top-[29px] flex-col-reverse', className)} style={{ left: x }}>
      <span className={cn('whitespace-nowrap text-xs tabular-nums', strong ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone2)]', top ? 'mb-1' : 'mt-3')}>{text}</span>
      <span className={cn(top && 'translate-y-[8px]')}>{mark}</span>
    </span>
  )
}

/* ---------- bottom right: the readouts ---------- */

const signed = (d: number, text: string) => `${d > 0 ? '+' : '−'}${text}`
const minutes = (v: number | null) => (v == null ? null : Math.round(v * 60))
const asTime = (m: number) => fmtHM(m / 60)
const asDur = (m: number) => dur(m / 60)
const deltaMin = (d: number) => signed(d, `${Math.abs(d)} min`)
const deltaInt = (d: number) => signed(d, fmtInt(Math.abs(d)))

/** One measure: its name, the value on the chosen clock rolling when the clock flips, and how far it is from the other. */
function Measure({ name, value, other, format, formatDelta, suffix, motion }: {
  name: string; value: number | null; other: number | null; format: (v: number) => string; formatDelta: (d: number) => string; suffix: string; motion: boolean
}) {
  return (
    <div className="border-t border-[color:var(--hairline)] pt-2">
      <p className="text-xs text-[color:var(--bone2)]">{name}</p>
      {value == null ? (
        <p className="mt-1 text-lg text-[color:var(--bone3)]">—</p>
      ) : (
        <DeltaTicker value={value} basis={other} format={format} formatDelta={formatDelta} suffix={suffix} label={name} motion={motion} className="mt-0.5" valueClassName="text-[22px] font-medium leading-[1.25] tracking-[-0.01em] text-[color:var(--bone)]" />
      )}
    </div>
  )
}

/** A share, in words: the chosen clock's, with the other clock's beside it. */
function Share({ name, value, other, otherName }: { name: string; value: string; other: string; otherName: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-[color:var(--hairline)] py-2">
      <span className="text-xs text-[color:var(--bone2)]">{name}</span>
      <span className="text-right">
        <span className="block text-sm text-[color:var(--bone)]">{value}</span>
        <span className="block text-xs text-[color:var(--bone3)]">{otherName}: {other.toLowerCase()}</span>
      </span>
    </div>
  )
}

function Readout({ f, clock, delay, studyHref, leave, motion }: { f: Facts; clock: Clock; delay: Delay; studyHref: string; leave: Leave; motion: boolean }) {
  const key = String(delay)
  const fixed = clock === 'fixed'
  const other: Clock = fixed ? 'drifted' : 'fixed'
  const suffix = fixed ? 'vs drifted' : 'vs fixed clock'
  const otherName = fixed ? 'As it drifted' : 'Fixed clock'
  const pass = { drifted: minutes(f.aqua), fixed: minutes(f.base) }
  const left = { drifted: f.D15.drifted == null ? null : Math.round((f.D15.drifted + 1.5 - delay) * 60), fixed: f.D15.fixed == null ? null : Math.round((f.D15.fixed + 1.5 - delay) * 60) }
  const count = { drifted: f.count, fixed: f.bench }
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-medium leading-tight tracking-[-0.01em] text-[color:var(--bone)]"><DecipherText key={f.d.id} text={f.d.name} motion={motion} /></h2>
        <p className={cn(label, 'mt-1')}>Fire season {f.season ?? '—'} · showing <span className="text-[color:var(--bone)]">{fixed ? 'the fixed clock' : 'Aqua as it drifted'}</span></p>
      </div>
      <p className="text-sm text-[color:var(--bone2)]">{f.headline}{f.verdict === 'outside' ? ', outside the 2012–2020 placebo range.' : '.'}</p>
      <div className="flex flex-col gap-2">
        <Measure name="Aqua passes, local solar time" value={pass[clock]} other={pass[other]} format={asTime} formatDelta={deltaMin} suffix={suffix} motion={motion} />
        {count.drifted != null && count.fixed != null ? (
          <Measure name={`Daytime hotspots counted, ${f.year}`} value={count[clock]} other={count[other]} format={fmtInt} formatDelta={deltaInt} suffix={suffix} motion={motion} />
        ) : (
          <div className="border-t border-[color:var(--hairline)] pt-2">
            <p className="text-xs text-[color:var(--bone2)]">Daytime hotspots counted, {f.year}</p>
            <p className="mt-1 text-sm text-[color:var(--bone)]">Too few to read: this is the team’s validation case.</p>
          </div>
        )}
        <Measure name={delay === 0 ? 'Daylight left at the pass' : `Daylight left ${delay} h after the pass`} value={left[clock]} other={left[other]} format={asDur} formatDelta={deltaMin} suffix={suffix} motion={motion} />
        <div>
          <Share name="Alerts after dark" value={words(f.dark[clock]?.[key])} other={words(f.dark[other]?.[key])} otherName={otherName} />
          <Share name="Under 2 h of light left" value={words(f.under2[clock]?.[key])} other={words(f.under2[other]?.[key])} otherName={otherName} />
        </div>
      </div>
      {f.verdict === 'outside' ? <p className="text-xs text-[color:var(--bone2)]">The gap and the clock change appear together; this doesn’t isolate how much of the gap the clock caused.</p> : null}
      <Method f={f} />
      <a href={studyHref} onClick={leave} className={primary}>
        Open the full study <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden />
      </a>
    </div>
  )
}

function Elsewhere({ place, inCountry, onFly, motion }: { place: Place; inCountry: string[] | null; onFly: (id: string) => void; motion: boolean }) {
  const now = new Date()
  const sun = sunTimes(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), place.lat)
  const len = sun.set - sun.rise
  const polar = !Number.isFinite(len) || len >= 23.9 || len <= 0.1
  const nearest = inCountry ? null : STUDIED_PLACES.map((p) => ({ p, km: kmBetween(place, p) })).sort((a, b) => a.km - b.km)[0]
  const row = 'border-t border-[color:var(--hairline)]'
  const th = 'py-2 pr-3 text-left text-xs font-normal text-[color:var(--bone2)]'
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-medium leading-tight tracking-[-0.01em] text-[color:var(--bone)]"><DecipherText key={place.id} text={place.name} motion={motion} /></h2>
        <p className={cn(label, 'mt-1')}>{inCountry ? `${inCountry.length} studied ${inCountry.length === 1 ? 'region' : 'regions'} here` : `${place.kind} · not studied yet`}</p>
      </div>
      {inCountry ? (
        <div className="flex flex-wrap gap-2">
          {inCountry.map((id) => (
            <button key={id} type="button" onClick={() => onFly(id)} className={cn('min-h-10 rounded border border-[color:var(--bone-20)] px-3 text-sm text-[color:var(--bone)] transition-colors duration-150 hover:bg-[color:var(--raised)]', focusRing)}>
              {short(STUDIED_PLACES.find((p) => p.id === id)?.name ?? id)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[color:var(--bone2)]">There’s no study here yet, so there are no counts or daylight figures to quote.</p>
      )}
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">What can be said about {place.name} without a study</caption>
        <tbody>
          <tr className={row}>
            <th scope="row" className={th}>Daylight today</th>
            <td className="py-2 text-right tabular-nums text-[color:var(--bone)]">{polar ? (len >= 23.9 ? 'Sun up all day' : 'Sun down all day') : `${fmtHM(sun.rise)}–${fmtHM(sun.set)}`}</td>
          </tr>
          {SHIFT ? (
            <tr className={row}>
              <th scope="row" className={th}>Aqua’s later pass in the studied regions</th>
              <td className="py-2 text-right tabular-nums text-[color:var(--bone)]">{SHIFT}</td>
            </tr>
          ) : null}
          {nearest ? (
            <tr className={row}>
              <th scope="row" className={th}>Nearest studied region</th>
              <td className="py-2 text-right text-[color:var(--bone)]">{short(nearest.p.name)}<span className="block text-xs tabular-nums text-[color:var(--bone3)]">{fmtInt(Math.round(nearest.km / 10) * 10)} km</span></td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <p className="text-xs text-[color:var(--bone3)]">
        Daylight is sunrise to sunset in local solar time, from NOAA’s solar equations. Aqua’s orbit drifted for the whole
        planet, but this place hasn’t been measured.
      </p>
      {nearest ? (
        <button type="button" onClick={() => onFly(nearest.p.id)} className={primary}>Fly to {short(nearest.p.name)}</button>
      ) : null}
    </div>
  )
}

/** How the readouts are measured, one tap away so the instrument stays short. */
function Method({ f }: { f: Facts }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-xs">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={cn('rounded text-[color:var(--bone2)]', link, focusRing)}>
        {open ? 'Hide how these are measured' : 'How these are measured'}
      </button>
      {open ? (
        <ul className="mt-2 flex list-none flex-col gap-1 text-[color:var(--bone3)]">
          <li>Pass times: the median look time of the year’s hotspots, from the team’s drift file. The fixed clock is Aqua’s 2012–2020 median.</li>
          <li>Fixed-clock count: the benchmark VIIRS predicts for Aqua on its 2012–2020 clock.</li>
          <li>{f.lvl2 ? 'Daylight: the median over the year’s real Aqua fires.' : 'Daylight: sunset on the fire season’s middle day, less the pass and the delay.'}</li>
          <li>Shares: of the year’s near-nadir daytime Aqua detections, each at its own time and place.</li>
        </ul>
      ) : null}
    </div>
  )
}

/** The mark on a searched place that has no region frame: four corner ticks and its coordinates, locking on. */
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

/* ---------- bottom left: where the pointer is, the scale, and the sources ---------- */

function MapReadout({ cursor, view, firesWhen, region, open, setOpen, motion, setMotion, xl }: {
  cursor: { lon: number; lat: number } | null; view: { zoom: number; lat: number; flat: number }; firesWhen: string; region: string | null
  open: boolean; setOpen: (v: boolean) => void; motion: boolean; setMotion: (on: boolean) => void; xl: boolean
}) {
  // a round scale length that fits about 96 px at the map's middle latitude
  const mpp = (40075016.686 * Math.cos((view.lat * Math.PI) / 180)) / (512 * 2 ** view.zoom)
  const km = (mpp * 96) / 1000
  const nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].reduce((b, v) => (v <= km ? v : b), 1)
  const px = (nice * 1000) / mpp
  const map = region ? SIM_MAPS[region] : null
  const deg = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`
  return (
    <div className={cn(panel, 'px-3 py-2.5 text-xs', xl ? 'w-[300px]' : 'w-[260px]')}>
      <div className="flex min-h-7 items-center justify-between gap-3 tabular-nums text-[color:var(--bone2)]">
        <span>{cursor ? `${deg(cursor.lat, 'N', 'S')}, ${deg(cursor.lon, 'E', 'W')}` : 'Point at the map'}</span>
        {view.flat > 0.5 ? (
          <span className="flex shrink-0 flex-col items-end">
            <span className="block h-1.5 border-x border-b border-[color:var(--bone2)]" style={{ width: Math.round(px) }} />
            <span className="mt-0.5">{fmtInt(nice)} km</span>
          </span>
        ) : null}
      </div>
      <p className="mt-2 flex items-start gap-2 text-[color:var(--bone2)]">
        <span aria-hidden className="mt-1 size-2 shrink-0 rounded-full bg-[#FF6B3D] shadow-[0_0_6px_rgba(255,90,54,0.8)]" />
        <span>Fire detections, VIIRS (NOAA-20), {firesWhen}</span>
      </p>
      {map ? (
        <p className="mt-1.5 flex items-start gap-2 text-[color:var(--bone2)]">
          <span aria-hidden className="mt-0.5 size-2.5 shrink-0 border border-[color:var(--bone)]" />
          <span>Region map: VIIRS (S-NPP) true colour, {dayText(map.day)}, with that week’s daytime fires ({shortDay(map.from)} to {shortDay(map.to)})</span>
        </p>
      ) : null}
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={cn('mt-2 rounded text-[color:var(--bone)]', link, focusRing)}>
        {open ? 'Hide sources' : 'Sources and settings'}
      </button>
      {open ? (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-[color:var(--hairline)] pt-2 text-[color:var(--bone3)]">
          <span>Globe: NASA Blue Marble, shaded relief and bathymetry, through NASA GIBS</span>
          <span>Fires: <a className={link} href="https://doi.org/10.5067/FIRMS/VIIRS/VJ114IMGT_NRT.002" target="_blank" rel="noreferrer">NASA FIRMS, VIIRS 375 m, NOAA-20</a></span>
          <span>Region maps: <a className={link} href="https://worldview.earthdata.nasa.gov" target="_blank" rel="noreferrer">NASA Worldview / GIBS</a></span>
          <span>Countries: <a className={link} href="https://github.com/mledoze/countries" target="_blank" rel="noreferrer">mledoze/countries</a>, ODbL. Search: Nominatim, <a className={link} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></span>
          <span>Map engine: MapLibre GL JS. Numbers: the team’s drift, audit and daylight files.</span>
          <span className="text-[color:var(--bone2)]">Team Propagators · NASA Space Apps Challenge 2026</span>
          <span className="mt-1 flex items-center justify-between gap-3 text-[color:var(--bone2)]">
            <span id="sim-motion">Motion</span>
            <button type="button" role="switch" aria-checked={motion} aria-labelledby="sim-motion" onClick={() => setMotion(!motion)} className={cn('relative h-5 w-9 rounded-full transition-colors duration-150', motion ? 'bg-[color:var(--bone)]' : 'bg-[color:var(--raised)]', focusRing)}>
              <span aria-hidden className={cn('absolute left-0 top-0.5 size-4 rounded-full transition-transform duration-150', motion ? 'translate-x-[18px] bg-[color:var(--ink)]' : 'translate-x-0.5 bg-[color:var(--bone2)]')} />
            </button>
          </span>
        </div>
      ) : null}
    </div>
  )
}

/** a faint star field behind the globe */
const STARS = 'bg-[image:radial-gradient(1px_1px_at_12%_18%,rgba(236,233,225,0.55),transparent),radial-gradient(1px_1px_at_72%_12%,rgba(236,233,225,0.4),transparent),radial-gradient(1px_1px_at_38%_82%,rgba(236,233,225,0.35),transparent),radial-gradient(1px_1px_at_88%_64%,rgba(236,233,225,0.45),transparent),radial-gradient(1px_1px_at_55%_40%,rgba(236,233,225,0.3),transparent),radial-gradient(1px_1px_at_24%_58%,rgba(236,233,225,0.35),transparent)] bg-[length:380px_380px]'

/** the region tags on the globe (MapLibre markers are plain DOM, outside Tailwind's reach) */
const TAG_CSS = `
.anchor-tag{display:flex;align-items:center;gap:6px;padding:3px 8px 3px 6px;border-radius:3px;cursor:pointer;white-space:nowrap;
  background:rgba(11,13,11,0.9);border:1px solid rgba(200,128,31,0.65);color:#ECE9E1;font:500 12px/16px 'Albert Sans',ui-sans-serif,system-ui,sans-serif;
  box-shadow:0 4px 12px rgba(0,0,0,0.4);transition:background-color 150ms}
.anchor-tag:hover{background:#1C1F1D}
.anchor-tag[data-on="true"]{border-color:#ECE9E1}
.anchor-tag:focus-visible{outline:2px solid #ECE9E1;outline-offset:2px}
.anchor-tag-mark{width:6px;height:6px;background:#C8801F}
.anchor-tag[data-on="true"] .anchor-tag-mark{background:#ECE9E1}
.maplibregl-canvas:focus-visible{outline:2px solid #ECE9E1;outline-offset:-2px}
`
