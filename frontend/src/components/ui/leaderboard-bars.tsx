/**
 * LeaderboardBars — adapted from 21st.dev "Leaderboard Bars" by eugeneshilow
 * (https://21st.dev/@eugeneshilow/components/leaderboard-bars).
 *
 * Original: score bars on a shared axis with ±std whiskers, aligned metric columns,
 * and reference rows below a hard rule ("off the board").
 * Changes for Anchor: the axis can start below zero (min), a shaded band marks the
 * noise floor, bars grow from a zero line in either direction, whiskers take an explicit
 * lo/hi range, an optional second marker shows the fire-size-adjusted value, and
 * colours come from --vz-* CSS variables so each theme can restyle it.
 */

const MONO = 'var(--vz-mono, ui-monospace, SFMono-Regular, monospace)'
const METRIC_WIDTHS = [84, 84, 96]
const BAR_DEFAULT = 'var(--vz-bar, #9aa0b4)'

export type LeaderboardBarRow = {
  label: string
  sub?: string
  /** bar end on the min..max axis; bars start at 0 */
  value?: number | null
  /** whisker range on the axis; omitted means no whisker */
  lo?: number
  hi?: number
  /** a second marker (e.g. fire-size-adjusted value) */
  mark?: number | null
  valueLabel?: string
  color?: string
  metrics?: (string | null | undefined)[]
  offside?: boolean
  offsideTag?: string
}

function GridLines({ ticks, min, max }: { ticks: number[]; min: number; max: number }) {
  return (
    <div aria-hidden className="absolute inset-0">
      {ticks
        .filter((t) => t > min && t < max)
        .map((t) => (
          <span
            key={t}
            className="absolute inset-y-0 border-l"
            style={{ left: `${((t - min) / (max - min)) * 100}%`, borderColor: t === 0 ? 'var(--vz-zero, #5c5c5c)' : 'var(--vz-grid, #e3e3e3)' }}
          />
        ))}
    </div>
  )
}

export function LeaderboardBars({
  rows,
  columns = [],
  barLabel,
  rowLabel,
  min = 0,
  max = 100,
  unit = '%',
  ticks = [0, 20, 40, 60, 80, 100],
  band,
  bandLabel,
}: {
  rows: LeaderboardBarRow[]
  columns?: string[]
  barLabel?: string
  rowLabel?: string
  min?: number
  max?: number
  unit?: string
  ticks?: number[]
  /** shaded range on the axis, e.g. the noise floor [-5, 5] */
  band?: [number, number]
  bandLabel?: string
}) {
  const span = max - min || 1
  const competition = rows.filter((r) => !r.offside)
  const offside = rows.filter((r) => r.offside)
  const metricWidths = columns.map((_, i) => METRIC_WIDTHS[i] ?? 72)
  const gridTemplateColumns = ['112px', 'minmax(200px,1fr)', ...metricWidths.map((w) => `${w}px`)].join(' ')
  const minWidth = Math.max(560, 112 + 200 + metricWidths.reduce((s, w) => s + w, 0) + 12 * (columns.length + 1))
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100))

  const renderRow = (row: LeaderboardBarRow, index: number, isOffside: boolean) => {
    const has = row.value != null
    const valueLabel = row.valueLabel ?? (has ? `${row.value!.toFixed(1)}${unit}` : '—')
    const a = has ? pct(Math.min(0, row.value!)) : 0
    const b = has ? pct(Math.max(0, row.value!)) : 0
    return (
      <div
        key={`${row.label}-${index}`}
        className={`grid items-center gap-x-3 ${isOffside && index === 0 ? 'border-t pt-4' : ''}`}
        style={{ gridTemplateColumns, borderColor: 'var(--vz-ink, #111111)' }}
      >
        <div>
          <p className="text-[13px] font-semibold">{row.label}</p>
          {row.sub ? <p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--vz-text3, #5c5c5c)' }}>{row.sub}</p> : null}
          {isOffside && row.offsideTag ? (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ fontFamily: MONO, color: 'var(--vz-bad, #c41e1e)' }}>
              {row.offsideTag}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-3">
          <div className="relative h-6 border-y" style={{ borderColor: 'var(--vz-track, #f0f0f0)' }} title={`${row.label} · ${valueLabel}`}>
            {band ? (
              <span aria-hidden className="absolute inset-y-0" style={{ left: `${pct(band[0])}%`, width: `${pct(band[1]) - pct(band[0])}%`, background: 'var(--vz-band, rgba(0,0,0,0.06))' }} />
            ) : null}
            <GridLines ticks={ticks} min={min} max={max} />
            {has && !isOffside ? (
              <div className="absolute inset-y-[7px]" style={{ left: `${a}%`, width: `${b - a}%`, backgroundColor: row.color ?? BAR_DEFAULT }} />
            ) : null}
            {!isOffside && row.lo != null && row.hi != null ? (
              <div className="absolute top-1/2 h-px -translate-y-1/2" style={{ left: `${pct(row.lo)}%`, width: `${pct(row.hi) - pct(row.lo)}%`, background: 'var(--vz-ink, #111111)' }}>
                <span className="absolute -left-px -top-[4px] h-[9px] border-l" style={{ borderColor: 'var(--vz-ink, #111111)' }} />
                <span className="absolute -right-px -top-[4px] h-[9px] border-r" style={{ borderColor: 'var(--vz-ink, #111111)' }} />
              </div>
            ) : null}
            {!isOffside && row.mark != null ? (
              <span aria-hidden className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border" style={{ left: `${pct(row.mark)}%`, background: 'var(--vz-mark-fill, #fff)', borderColor: 'var(--vz-ink, #111111)' }} />
            ) : null}
          </div>
          <p className="text-right text-[12px] font-semibold" style={{ fontFamily: MONO }}>{valueLabel}</p>
        </div>
        {columns.map((column, i) => {
          const metric = row.metrics?.[i]
          return (
            <p key={column} className="text-right text-[12px]" style={{ fontFamily: MONO, color: metric == null ? 'var(--vz-muted, #8a8a8a)' : undefined }}>
              {metric == null ? '—' : metric}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border-y py-5 [font-variant-numeric:tabular-nums]" style={{ borderColor: 'var(--vz-ink, #111111)', color: 'var(--vz-ink, #111111)' }}>
      <div style={{ minWidth }}>
        <div className="grid gap-x-3 border-b pb-2 text-[10px] uppercase tracking-[0.08em]" style={{ gridTemplateColumns, fontFamily: MONO, color: 'var(--vz-muted, #8a8a8a)', borderColor: 'var(--vz-grid, #e3e3e3)' }}>
          <span>{rowLabel}</span>
          <span>{barLabel}</span>
          {columns.map((c) => <span key={c} className="text-right">{c}</span>)}
        </div>
        <div className="mt-4 space-y-4">
          {competition.map((r, i) => renderRow(r, i, false))}
          {offside.map((r, i) => renderRow(r, i, true))}
        </div>
        <div className="mt-4 grid gap-x-3 text-[10px]" style={{ gridTemplateColumns, fontFamily: MONO, color: 'var(--vz-muted, #8a8a8a)' }}>
          <span>{bandLabel}</span>
          <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-3">
            <div className="relative h-3">
              {ticks.map((t, i) => (
                <span key={`${t}-${i}`} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>
                  {t > 0 ? '+' : ''}{t}{i === ticks.length - 1 ? unit : ''}
                </span>
              ))}
            </div>
            <span />
          </div>
        </div>
      </div>
    </div>
  )
}
