// Global clock layer (exploratory): the preset audit repeated on a 2-degree grid, as a world map under the calendar.
// Closed by default, so the six presets stay the page's reading; the data is fetched when the map is opened.
// Every number comes from data/out/global (analysis/global/global_grid.py). A cell with too few fires is shown as
// "too few fires", with no value: it is not a reading of agreement with the fixed clock.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { CalendarLegend, FireCalendar } from '@/components/ui/fire-calendar'
import { useMeasuredWidth } from '@/components/ui/series-chart'
import { cn } from '@/lib/utils'
import { REGIONS, fmtInt, fmtShift, pct, type CalendarCell } from '@/r2/data'
import { COAST } from '@/r2/globe-land'
import { DOWN, EXPLORATORY, L_STEPS, NEAR, THIN, UP, cellName, colorOf, globalCell, globalGrid, reading, type GlobalCalendar, type GlobalCell, type GlobalGrid } from '@/r2/global'

// the page's classes, as FieldFilm.tsx sets them
const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]'
const ease = 'transition-colors duration-150 ease-[var(--ease)]'
const title = 'text-balance text-[length:var(--fs-40)] font-medium leading-[var(--lh-display)] tracking-[var(--track-display)]'
const shell = 'mx-auto w-full max-w-[var(--maxw)] px-4 sm:px-8'
const pill = cn('h-9 px-4 text-sm outline-none', ease, focusRing)

// the map shows 84N to 60S: every cell with a detection sits inside it
const LAT_TOP = 84, LAT_BOTTOM = -60, DEG = 2
const COLS = 360 / DEG, ROWS = (LAT_TOP - LAT_BOTTOM) / DEG

export function describe(c: GlobalCell, year: 2024 | 2025) {
  const r = reading(c, year)
  if (!r.ok || r.L == null || r.lo == null || r.hi == null) return `Too few fires to read in ${year}`
  return `Aqua ${pct((r.L - 1) * 100, 0)} against what we’d expect in ${year} (likely range: ${pct((r.lo - 1) * 100, 0)} to ${pct((r.hi - 1) * 100, 0)}); ${r.outside ? 'unusual' : 'not unusual'} for this square`
}

export function GlobalLayer({ region, small }: { region: string; small: boolean }) {
  const [open, setOpen] = useState(false)
  const [grid, setGrid] = useState<GlobalGrid | null>(null)
  const [failed, setFailed] = useState(false)
  const [year, setYear] = useState<2024 | 2025>(2025)
  const [hover, setHover] = useState<GlobalCell | null>(null)
  const [picked, setPicked] = useState<GlobalCell | null>(null)

  useEffect(() => {
    if (!open || grid) return
    let live = true
    globalGrid().then((g) => { if (live) setGrid(g) }).catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [open, grid])

  const byKey = useMemo(() => {
    const m = new Map<string, GlobalCell>()
    for (const c of grid?.cells ?? []) m.set(`${c.lon0},${c.lat0}`, c)
    return m
  }, [grid])
  const tally = useMemo(() => {
    let ok = 0, above = 0, below = 0
    for (const c of grid?.cells ?? []) {
      const r = reading(c, year)
      if (!r.ok || r.L == null) continue
      ok++
      if (r.outside) { if (r.L > 1) above++; else below++ }
    }
    return { ok, above, below, listed: grid?.cells.length ?? 0 }
  }, [grid, year])

  return (
    <section id="global" aria-labelledby="global-h" className={cn(shell, 'pb-24 pt-24')}>
      <div className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-4">
          <h2 id="global-h" className={title}>Early exploration: the whole world</h2>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone2)]">
            The same comparison as the six places, on every 2° square of the map with enough fires: Aqua’s count against what we’d expect. The map shows
            where the two differ; it can’t say how much of a difference the timing caused.
          </p>
          <p className="mt-4 max-w-[var(--measure)] text-sm text-[color:var(--bone)]">{EXPLORATORY}</p>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="global-map"
            onClick={() => setOpen((v) => !v)}
            className={cn('mt-6 inline-flex h-9 items-center rounded border border-[color:var(--hairline)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--bone)] hover:bg-[color:var(--raised)]', ease, focusRing)}
          >
            {open ? 'Hide the world map' : 'Show the world map'}
          </button>
        </div>
        <div id="global-map" className="min-w-0 lg:col-span-8">
          {!open ? null : failed ? (
            <p className="text-sm text-[color:var(--bone2)]">The world map’s data is not part of this build.</p>
          ) : !grid ? (
            <p className="text-sm text-[color:var(--bone2)]" role="status">Loading the grid…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div role="group" aria-label="Year shown" className="inline-flex h-9 overflow-hidden rounded bg-[color:var(--raised)]">
                  {([2025, 2024] as const).map((y) => (
                    <button
                      key={y}
                      type="button"
                      aria-pressed={year === y}
                      onClick={() => setYear(y)}
                      className={cn(pill, year === y ? 'bg-[color:var(--bone)] text-[color:var(--ink)]' : 'text-[color:var(--bone2)] hover:text-[color:var(--bone)]')}
                    >
                      {y}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-[color:var(--bone2)]">
                  {fmtInt(tally.ok)} of {fmtInt(tally.listed)} squares have enough fires to read in {year}. {fmtInt(tally.above + tally.below)} are unusual for
                  their square: {fmtInt(tally.above)} above what we’d expect, {fmtInt(tally.below)} below.
                </p>
              </div>
              <WorldMap grid={grid} byKey={byKey} year={year} region={region} picked={picked} onHover={setHover} onPick={setPicked} />
              <p className="mt-3 min-h-10 text-sm text-[color:var(--bone)]" aria-live="polite">
                {(hover ?? picked) ? `${cellName((hover ?? picked)!)}: ${describe((hover ?? picked)!, year)}.` : 'Point at a cell to read it; click or use the arrow keys to open its calendar.'}
              </p>
              <Legend />
              <p className="mt-4 text-xs text-[color:var(--bone3)]">
                {EXPLORATORY} Source: global/grid.json · NASA FIRMS MODIS C6.1 and VIIRS S-NPP, 2012–2025, every daytime detection · the dashed box is this page’s preset.
              </p>
              {picked ? <CellPanel key={picked.id} cell={picked} year={year} small={small} /> : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export function Legend() {
  const sw = 'inline-block h-3 w-4'
  const edge = (i: number) => Math.round(L_STEPS[i] * 100)
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-[color:var(--bone3)]">
      <span className="flex items-center gap-2">
        <span>Aqua below what we’d expect</span>
        <span className="flex gap-[2px]" aria-hidden>
          {[4, 3, 2, 1, 0].map((s) => <span key={`d${s}`} className={sw} style={{ background: DOWN[s] }} />)}
          <span className={sw} style={{ background: NEAR }} />
          {[0, 1, 2, 3, 4].map((s) => <span key={`u${s}`} className={sw} style={{ background: UP[s] }} />)}
        </span>
        <span>above</span>
      </span>
      <span>Steps at {L_STEPS.map((_, i) => edge(i)).join(', ')}% from what we’d expect; grey is within {edge(0)}%</span>
      <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-3 w-3" style={{ background: UP[2] }} />Full square: unusual for that square</span>
      <span className="flex items-center gap-2"><span aria-hidden className="inline-flex h-3 w-3 items-center justify-center"><span className="inline-block h-1.5 w-1.5" style={{ background: UP[2] }} /></span>Small square: not unusual</span>
      <span className="flex items-center gap-2"><span aria-hidden className="inline-flex h-3 w-3 items-center justify-center"><span className="inline-block h-1 w-1" style={{ background: '#6F726C' }} /></span>Dot: too few fires to read</span>
    </div>
  )
}

function WorldMap({ grid, byKey, year, region, picked, onHover, onPick }: {
  grid: GlobalGrid; byKey: Map<string, GlobalCell>; year: 2024 | 2025; region: string; picked: GlobalCell | null
  onHover: (c: GlobalCell | null) => void; onPick: (c: GlobalCell | null) => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const W = useMeasuredWidth(boxRef)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const px = W / COLS
  const H = Math.round(px * ROWS)
  const bbox = REGIONS.find((r) => r.id === region)?.bbox ?? null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !W) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const X = (lon: number) => ((lon + 180) / DEG) * px
    const Y = (lat: number) => ((LAT_TOP - lat) / DEG) * px
    ctx.fillStyle = '#121413'
    ctx.fillRect(0, 0, W, H)
    // coastlines (Natural Earth, as the orbit globe draws them)
    ctx.strokeStyle = 'rgba(236, 233, 225, 0.22)'
    ctx.lineWidth = 0.75
    for (const line of COAST) {
      ctx.beginPath()
      for (let i = 0; i < line.length; i += 2) {
        const x = X(line[i] / 10), y = Y(line[i + 1] / 10)
        // a ring that crosses the date line would streak across the map: lift the pen there
        if (i === 0 || Math.abs(line[i] - line[i - 2]) > 1800) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    const gap = px > 5 ? 1 : 0
    for (const c of grid.cells) {
      const r = reading(c, year)
      const x = X(c.lon0), y = Y(c.lat1)
      if (!r.ok || r.L == null) {
        const d = Math.max(1, px * 0.22)
        ctx.fillStyle = THIN
        ctx.fillRect(x + (px - d) / 2, y + (px - d) / 2, d, d)
        continue
      }
      ctx.fillStyle = colorOf(r.L)
      if (r.outside) ctx.fillRect(x + gap / 2, y + gap / 2, px - gap, px - gap)
      else { const d = px * 0.5; ctx.fillRect(x + (px - d) / 2, y + (px - d) / 2, d, d) }
    }
    if (bbox) {
      ctx.strokeStyle = 'rgba(236, 233, 225, 0.8)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.strokeRect(X(bbox[0]), Y(bbox[3]), X(bbox[2]) - X(bbox[0]), Y(bbox[1]) - Y(bbox[3]))
      ctx.setLineDash([])
    }
    if (picked) {
      ctx.strokeStyle = '#ECE9E1'
      ctx.lineWidth = 2
      ctx.strokeRect(X(picked.lon0) - 1, Y(picked.lat1) - 1, px + 2, px + 2)
    }
  }, [W, H, px, grid, year, bbox, picked])

  const at = (e: PointerEvent<HTMLCanvasElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    const lon0 = Math.floor((e.clientX - b.left) / px) * DEG - 180
    const lat0 = LAT_TOP - (Math.floor((e.clientY - b.top) / px) + 1) * DEG
    return byKey.get(`${lon0},${lat0}`) ?? null
  }
  const onKey = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-DEG, 0], ArrowRight: [DEG, 0], ArrowUp: [0, DEG], ArrowDown: [0, -DEG] }
    const d = step[e.key]
    if (!d) return
    e.preventDefault()
    // from the chosen cell (or the preset's corner), walk to the next cell with a detection in that direction
    let lon = picked?.lon0 ?? (bbox ? Math.floor(bbox[0] / DEG) * DEG : 0), lat = picked?.lat0 ?? (bbox ? Math.floor(bbox[1] / DEG) * DEG : 0)
    for (let i = 0; i < COLS; i++) {
      lon = ((lon + d[0] + 180 + 360) % 360) - 180
      lat += d[1]
      if (lat >= LAT_TOP || lat < LAT_BOTTOM) return
      const c = byKey.get(`${lon},${lat}`)
      if (c) { onPick(c); return }
    }
  }

  return (
    <div ref={boxRef} className="mt-6 border-y border-[color:var(--hairline)] py-4">
      <canvas
        ref={canvasRef}
        role="img"
        tabIndex={0}
        aria-label={`World map of 2-degree squares, ${year}: Aqua’s fire count against what we’d expect. ${EXPLORATORY} Arrow keys move between squares.`}
        className={cn('block w-full cursor-crosshair rounded', focusRing)}
        style={{ width: W || '100%', height: H || undefined }}
        onPointerMove={(e) => onHover(at(e))}
        onPointerLeave={() => onHover(null)}
        onClick={(e) => { const c = at(e as unknown as PointerEvent<HTMLCanvasElement>); if (c) onPick(c) }}
        onKeyDown={onKey}
      />
    </div>
  )
}

export function CellPanel({ cell, year, small }: { cell: GlobalCell; year: 2024 | 2025; small: boolean }) {
  const [cal, setCal] = useState<GlobalCalendar | null>(null)
  const [state, setState] = useState<'none' | 'loading' | 'ready' | 'failed'>('none')
  const hasCalendar = cell.status === 'ok' || cell.status_2024 === 'ok'
  useEffect(() => {
    if (!hasCalendar) return
    let live = true
    setState('loading')
    globalCell(cell.id).then((c) => { if (live) { setCal(c); setState('ready') } }).catch(() => { if (live) setState('failed') })
    return () => { live = false }
  }, [cell.id, hasCalendar])

  const table = useMemo(() => {
    if (!cal) return null
    const by = new Map(cal.months.map((m) => [m.ym, m]))
    const years: number[] = []
    const cells: (CalendarCell | null)[][] = []
    let maxCount = 1
    for (let y = 2025; y >= 2002; y--) {
      years.push(y)
      cells.push(Array.from({ length: 12 }, (_, i) => {
        const m = by.get(`${y}-${String(i + 1).padStart(2, '0')}`)
        if (!m) return null
        if (m.fixed != null) maxCount = Math.max(maxCount, m.fixed)
        return { ym: m.ym, fixed: m.fixed, lo: m.lo, hi: m.hi, median: m.median_ref, anomaly: m.anomaly_pct, flags: m.flags }
      }))
    }
    return { years, cells, maxCount }
  }, [cal])

  const rows = ([2025, 2024] as const).map((y) => ({ y, r: reading(cell, y) }))
  // the nine placebo years' lowest and highest reading, as percent around the fixed clock
  const placebo = cell.placebo_min != null && cell.placebo_max != null ? `${pct((cell.placebo_min - 1) * 100, 0)} to ${pct((cell.placebo_max - 1) * 100, 0)}` : null
  return (
    <div className="mt-10 border-t border-[color:var(--hairline)] pt-8" aria-live="polite">
      <h3 className="text-lg font-medium text-[color:var(--bone)]">2° square · {cellName(cell)}</h3>
      <p className="mt-1 text-xs text-[color:var(--bone3)]">{EXPLORATORY}</p>
      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 text-sm sm:grid-cols-2">
        {rows.map(({ y, r }) => (
          <div key={y} className={cn(y === year ? 'text-[color:var(--bone)]' : 'text-[color:var(--bone2)]')}>
            <dt className="text-xs tabular-nums text-[color:var(--bone3)]">{y}</dt>
            {r.ok && r.L != null && r.lo != null && r.hi != null ? (
              <dd className="mt-1">
                <span className="block text-[length:var(--fs-32)] font-medium leading-none">{pct((r.L - 1) * 100, 0)}</span>
                <span className="mt-2 block">
                  Aqua’s count against what we’d expect. Likely range: {pct((r.lo - 1) * 100, 0)} to {pct((r.hi - 1) * 100, 0)}.{' '}
                  {r.outside ? 'Unusual' : 'Not unusual'} for this square{placebo ? ` (usual range ${placebo})` : ''}.
                </span>
                {r.shift != null ? <span className="mt-1 block">Aqua’s look time: {fmtShift(r.shift)} against 2012–2020.</span> : null}
              </dd>
            ) : (
              <dd className="mt-1">Too few fires to read in {y}.</dd>
            )}
          </div>
        ))}
      </dl>
      <p className="mt-5 text-sm text-[color:var(--bone2)]">
        Detections on the days both satellites reported, 2025: Aqua {fmtInt(cell.n_aqua_2025)}, S-NPP {fmtInt(cell.n_snpp_2025)}.
      </p>
      {!hasCalendar ? (
        <p className="mt-5 text-sm text-[color:var(--bone2)]">Too few fires in both years for a monthly calendar here.</p>
      ) : state === 'failed' ? (
        <p className="mt-5 text-sm text-[color:var(--bone2)]">This cell’s calendar could not be loaded.</p>
      ) : !table ? (
        <p className="mt-5 text-sm text-[color:var(--bone2)]" role="status">Loading the calendar…</p>
      ) : (
        <>
          <p className="mt-8 text-sm text-[color:var(--bone2)]">Each month: what we’d expect Aqua to count, against normal for that month (2002–2025). Sand above, slate below.</p>
          <div className="mt-4 border-y border-[color:var(--hairline)] py-6">
            <FireCalendar
              years={table.years}
              cells={table.cells}
              maxCount={table.maxCount}
              mode="anomaly"
              render="fill"
              cellHeight={small ? 16 : 20}
              monthLabels={small ? 'initial' : 'short'}
              label={`Fire calendar for the 2-degree square ${cellName(cell)}, each month compared with normal for that month. ${EXPLORATORY}`}
            />
          </div>
          <CalendarLegend mode="anomaly" render="fill" className="mt-4 [&_span]:whitespace-nowrap max-sm:[&_[aria-hidden]>span]:w-3" />
          <p className="mt-4 text-xs text-[color:var(--bone3)]">Source: global/cells/{cell.id}.json · VIIRS’s count, scaled to Aqua’s 2012–2020 rate · {EXPLORATORY}</p>
        </>
      )}
    </div>
  )
}
