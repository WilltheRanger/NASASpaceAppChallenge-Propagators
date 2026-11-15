// Round 1 · Direction E · Operations (Palantir-inspired: product UI as hero, giant figure,
// metadata strips, bracketed wayfinding, comparison card, indexed contents).
// MOCK data only.
import { useMemo, type CSSProperties } from 'react'
import { Globe } from '@/components/ui/cobe-globe'
import { KnowledgeGraph, type GraphLink, type GraphNode } from '@/components/ui/knowledge-graph'
import { LeaderboardBars } from '@/components/ui/leaderboard-bars'
import IndexListCarousel from '@/components/ui/index-list-carousel'
import { FlipDiskMatrix } from '@/components/ui/flip-disk-matrix'
import { auditRows, checks, headline, latest, noiseFloor, pct, regions, regionStatus } from '@/lib/data'
import { Arrow, MockBadge } from './shared'

const T = {
  ink: '#0B0C0E', graphite: '#1D1F23', panel: '#25282D', panel2: '#2E3137', line: 'rgba(255,255,255,0.10)', line2: 'rgba(255,255,255,0.18)',
  text: '#F2F2F0', text2: '#A9ADB4', text3: '#7D828B', grey: '#EDEDED', grey2: '#DADADA', black: '#111214',
  ember: '#FF6B2C', amber: '#F2B33D', ice: '#9FD3E8', lime: '#D9F24A',
}
const vars = {
  '--mono': '"Geist Mono", ui-monospace, monospace',
  '--kg-bg': 'transparent', '--kg-link': 'rgba(255,255,255,0.28)', '--kg-text': T.text, '--kg-muted': T.text3, '--kg-mono': '"Geist Mono", monospace',
  '--kg-panel': 'rgba(29,31,35,0.92)', '--kg-line': T.line2, '--kg-tip-bg': T.text, '--kg-tip-fg': T.ink, '--kg-radius': '0px',
  '--vz-ink': T.text, '--vz-grid': 'rgba(255,255,255,0.07)', '--vz-track': 'rgba(255,255,255,0.05)', '--vz-muted': T.text3, '--vz-text3': T.text2,
  '--vz-band': 'rgba(159,211,232,0.12)', '--vz-zero': 'rgba(255,255,255,0.4)', '--vz-bad': T.amber, '--vz-mark-fill': T.panel, '--vz-mono': '"Geist Mono", monospace',
  '--globe-label-font': '"Geist Mono", monospace',
  '--il-title-font': '"Geist", system-ui, sans-serif', '--il-mono': '"Geist Mono", monospace', '--il-body': '"Geist", system-ui, sans-serif', '--il-title-weight': '300',
  '--disk-on': T.lime, '--disk-off': '#1B1D21', '--disk-bezel': '#0E0F11', '--disk-screen': '#050506',
} as CSSProperties

const centre = (b: number[]): [number, number] => [(b[1] + b[3]) / 2, (b[0] + b[2]) / 2]
const Meta = ({ items, tick = 0 }: { items: [string, string][]; tick?: number }) => (
  <div className="flex flex-wrap gap-x-6 gap-y-3 text-[10.5px] uppercase leading-[1.35] tracking-[0.04em]" style={{ fontFamily: 'var(--mono)', color: T.text }}>
    {items.map(([a, b], i) => (
      <div key={a} className="border-l pl-2.5" style={{ borderColor: i === tick ? T.ember : 'rgba(255,255,255,0.5)' }}>{a}<br />{b}</div>
    ))}
  </div>
)

export default function DirectionE() {
  const markers = useMemo(() => regions.map((r) => ({ id: r.id, location: centre(r.bbox), label: r.name })), [])
  const rows = useMemo(() => auditRows({ clock: T.ember, noise: '#5B6069' }).map((r) => ({ ...r, metrics: r.metrics?.slice(0, 2) })), [])
  const passed = checks.filter((c) => c.status === 'pass').length, pending = checks.filter((c) => c.status === 'pending').length, failed = checks.filter((c) => c.status === 'fail').length
  const graph = useMemo(() => {
    const nodes: GraphNode[] = [
      { id: 'amazon', label: 'Amazon (Brazil)', type: 'region', size: 24, sub: `clock effect ${pct(headline.gap)} · ${headline.to}` },
      { id: 'aqua', label: 'Aqua · MODIS', type: 'satellite', size: 16, sub: `looks ${latest.aqua_lst} · drifting later`, color: T.ember },
      { id: 'terra', label: 'Terra · MODIS', type: 'satellite', size: 14, sub: `looks ${latest.terra_lst} · drifting earlier`, color: T.amber },
      { id: 'viirs', label: 'VIIRS', type: 'satellite', size: 16, sub: `looks ${latest.viirs_lst} · fixed clock`, color: T.ice },
      { id: 'inpe', label: 'INPE official count', type: 'dataset', size: 13, sub: 'reference satellite: Aqua' },
      { id: 'firms', label: 'NASA FIRMS', type: 'dataset', size: 13, sub: 'MODIS C6.1 · VIIRS 375 m' },
      { id: 'audit', label: 'Anchor audit', type: 'analysis', size: 15, sub: '2021–2025 · noise ±5%' },
      { id: 'twoclocks', label: 'Two-clocks test', type: 'analysis', size: 13, sub: 'Aqua vs Terra, opposite drifts' },
      { id: 'checks', label: 'Checks P1–P10', type: 'check', size: 13, sub: `${passed} pass · ${pending} pending · ${failed} fail` },
    ]
    const links: GraphLink[] = [
      { source: 'aqua', target: 'amazon', label: `looks ${latest.aqua_lst}`, color: 'rgba(255,107,44,0.7)' },
      { source: 'viirs', target: 'amazon', label: `looks ${latest.viirs_lst}`, color: 'rgba(159,211,232,0.7)' },
      { source: 'terra', target: 'amazon', label: `looks ${latest.terra_lst}`, color: 'rgba(242,179,61,0.7)' },
      { source: 'inpe', target: 'aqua', label: 'reference' },
      { source: 'firms', target: 'aqua', label: 'hotspots' },
      { source: 'firms', target: 'viirs', label: 'hotspots' },
      { source: 'audit', target: 'amazon', label: 'audits' },
      { source: 'audit', target: 'inpe', label: 'reproduces' },
      { source: 'twoclocks', target: 'terra' },
      { source: 'twoclocks', target: 'aqua' },
      { source: 'checks', target: 'audit', label: 'validates' },
    ]
    return { nodes, links }
  }, [passed, pending, failed])
  const typeColors = useMemo(() => ({ region: T.text, satellite: T.ice, dataset: '#8B90A0', analysis: T.lime, check: '#C9CDD4' }), [])

  return (
    <div className="min-h-screen" style={{ ...vars, background: T.ink, color: T.text, fontFamily: '"Geist", system-ui, sans-serif' }}>
      {/* floating nav */}
      <div className="fixed inset-x-0 top-3 z-30 flex justify-center px-4">
        <div className="flex h-11 w-full max-w-[1480px] items-center gap-3 rounded-md px-3" style={{ background: 'rgba(29,31,35,0.92)', backdropFilter: 'blur(8px)' }}>
          <span className="flex items-center gap-2 text-[15px] font-medium tracking-tight">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke={T.text} strokeWidth="1.4" /><path d="M8 8 11.6 4.8" stroke={T.ember} strokeWidth="1.6" strokeLinecap="round" /></svg>Anchor
          </span>
          <span className="ml-auto"><MockBadge /></span>
          <a href="#e-data" className="inline-flex h-7 items-center rounded-sm px-10 text-[12.5px]" style={{ background: T.grey, color: T.ink }}>Get the data</a>
          <button type="button" aria-label="Search" className="grid h-7 w-7 place-items-center rounded-sm border" style={{ borderColor: T.line2 }}><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="m7.7 7.7 3 3" stroke="currentColor" strokeWidth="1.3" /></svg></button>
          <button type="button" aria-label="Menu" className="grid h-7 w-7 place-items-center rounded-sm border" style={{ borderColor: T.line2 }}><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 3h9M1.5 6h9M1.5 9h9" stroke="currentColor" strokeWidth="1.3" /></svg></button>
        </div>
      </div>

      {/* hero: the audit board is the hero */}
      <section className="relative min-h-[920px] overflow-hidden" aria-labelledby="e-h">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 70% 40%, #1A1D22 0%, #0B0C0E 70%)' }} />
        <div className="absolute right-[-4%] top-[70px] w-[min(980px,72vw)] opacity-95">
          <Globe markers={markers} focusLon={-62} theta={0.18} dark={1} baseColor={[0.16, 0.17, 0.19]} glowColor={[0.06, 0.07, 0.08]} markerColor={[1, 0.42, 0.17]} mapBrightness={4.2} diffuse={1.1} markerSize={0.04} speed={0.0012} labelBg={T.ink} labelFg={T.text} />
        </div>
        <aside className="absolute left-3 top-[72px] hidden w-[300px] border text-[12px] md:block" style={{ background: 'rgba(29,31,35,0.94)', borderColor: T.line2 }} aria-label="Audit board">
          <div className="flex items-center justify-between border-b px-3 py-2 text-[10.5px] uppercase tracking-[0.05em]" style={{ borderColor: T.line, fontFamily: 'var(--mono)', color: T.text2 }}><span>Audit board</span><span>6 regions</span></div>
          <div className="border-b px-3 py-2" style={{ borderColor: T.line }}><div className="rounded-sm border px-2 py-1.5 text-[11px]" style={{ borderColor: T.line2, color: T.text3 }}>Search regions…</div></div>
          {regions.map((r) => {
            const s = regionStatus(r.id)
            const v = s?.verdict
            const col = v === 'clock' ? T.ember : v === 'noise' ? T.ice : T.text3
            return (
              <div key={r.id} className="flex items-start gap-2.5 border-b px-3 py-2.5" style={{ borderColor: T.line, background: r.id === 'br-amazon' ? 'rgba(255,107,44,0.08)' : undefined }}>
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: col }} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium" style={{ color: T.text }}>{r.name}</div>
                  <div className="mt-0.5 text-[10.5px]" style={{ fontFamily: 'var(--mono)', color: T.text3 }}>
                    {s ? `${s.year} · ${v === 'clock' ? `clock ${pct(s.gap ?? 0)}` : v === 'noise' ? `within noise ${pct(s.gap ?? 0)}` : 'not enough fires'}` : '—'}
                    {s && s.insufficient.length ? ` · ${s.insufficient.join(', ')} n/a` : ''}
                  </div>
                </div>
              </div>
            )
          })}
          <div className="px-3 py-2 text-[10.5px]" style={{ fontFamily: 'var(--mono)', color: T.text3 }}>Noise floor ±{noiseFloor}% · baseline 2012–2020</div>
        </aside>
        <div className="absolute right-4 top-[72px] hidden w-[250px] lg:block">
          <FlipDiskMatrix text={latest.aqua_lst} rows={9} gap={2} label={`Aqua look time ${latest.aqua_lst}`} />
          <p className="mt-2 text-right text-[10.5px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--mono)', color: T.text2 }}>Aqua look time · {latest.year} · LST</p>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-6 md:px-8">
          <div className="mb-4 flex justify-end">
            <Meta tick={1} items={[['You are now viewing', 'Amazon (Brazil)'], [`Clock effect on the`, `${headline.to} official count`], ['Time: 2 mins', 'Scroll to explore'], ['Team Propagators', 'NASA Space Apps 2026']]} />
          </div>
          <h1 id="e-h" className="sr-only">Aqua's later clock added {pct(headline.gap)} to the Amazon's {headline.to} official count</h1>
          <p aria-hidden className="font-light leading-[0.8] tracking-[-0.05em]" style={{ fontSize: 'clamp(120px, 21vw, 360px)', color: T.text }}>{pct(headline.gap)}</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <p className="max-w-[60ch] text-[15px]" style={{ color: T.text2 }}>Aqua's later clock added {pct(headline.gap)} (range {pct(headline.gapLo)} to {pct(headline.gapHi)}) to the Amazon's {headline.to} official count. On a fixed clock, {headline.from}→{headline.to} fell {Math.abs(headline.fixed).toFixed(1)}%, not {Math.abs(headline.official).toFixed(1)}%.</p>
            <p className="text-[11px]" style={{ fontFamily: 'var(--mono)', color: T.text3 }}>LST {latest.aqua_lst} · AQUA · {latest.year} · MOCK</p>
          </div>
        </div>
      </section>

      {/* statement + comparison card */}
      <section className="relative" style={{ background: T.graphite }} aria-labelledby="e-s">
        <div className="mx-auto flex max-w-[1480px] justify-between px-6 pt-6 text-[12px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--mono)', color: T.text2 }}><span>Anchor</span><span style={{ color: T.text }}>[ Verdict ]</span><a href="#e-data">Get the data</a></div>
        <ol className="absolute left-6 top-[200px] hidden space-y-1 text-[12px] md:block" style={{ fontFamily: 'var(--mono)', color: T.text3 }}>
          {['A', 'B', 'C', 'D'].map((l, i) => <li key={l} style={i === 0 ? { color: T.text } : undefined}>{i === 0 ? `[${l}]` : l}</li>)}
        </ol>
        <div className="mx-auto max-w-[1100px] px-6 pb-20 pt-24 text-center">
          <h2 id="e-s" className="text-[40px] font-light leading-[1.08] tracking-[-0.025em] md:text-[64px]">The satellite's clock moved. The official count moved with it.</h2>
          <p className="mt-6 text-[14px]" style={{ color: T.text2 }}>Operating record for a fixed clock</p>
        </div>
        <div className="mx-auto max-w-[1480px] px-6 pb-24">
          <div className="rounded-sm px-6 py-7 md:px-10 md:py-9" style={{ background: '#3B3E44' }}>
            <p className="text-[12px] uppercase tracking-[0.04em]" style={{ fontFamily: 'var(--mono)', color: T.text2 }}>Headline check · Amazon (Brazil) · {headline.from} → {headline.to}</p>
            <p className="mt-2 text-[22px] font-normal">Official count vs. a fixed clock <span aria-hidden>↗</span></p>
            {[
              ['Official count · Aqua clock', headline.official, 'rgba(255,255,255,0.55)', T.text],
              ['On a fixed clock', headline.fixed, T.lime, T.lime],
            ].map(([k, v, bar, txt]) => (
              <div key={k as string} className="mt-10">
                <p className="text-[34px] font-normal uppercase leading-none tracking-[-0.01em] md:text-[56px]" style={{ color: txt as string }}>{k as string}</p>
                <div className="relative mt-4 h-9 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }}>
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(Math.abs(v as number) / 40) * 100}%`, background: bar as string }} />
                  <span className="absolute inset-0 grid place-items-center text-[12px] uppercase tracking-[0.06em]" style={{ fontFamily: 'var(--mono)', color: T.text }}>Change: {pct(v as number)}</span>
                </div>
              </div>
            ))}
            <p className="mt-6 text-[12px]" style={{ fontFamily: 'var(--mono)', color: T.text2 }}>Clock effect in {headline.to}: {pct(headline.gap)} (range {pct(headline.gapLo)} to {pct(headline.gapHi)}) · noise floor ±{noiseFloor}% · bars scaled to 40%</p>
          </div>
        </div>
      </section>

      {/* workspace: objects · graph · inspector */}
      <section className="py-20" style={{ background: T.grey, color: T.black }} aria-labelledby="e-w">
        <div className="mx-auto max-w-[1480px] px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div><h2 id="e-w" className="text-[40px] font-light leading-none tracking-[-0.02em]">Beyond the count</h2><p className="mt-2 text-[16px]" style={{ color: '#6B6F76' }}>Explore Anchor</p></div>
            <div className="flex gap-2 text-[11px] uppercase" style={{ fontFamily: 'var(--mono)' }}>
              {[['Audit', '01'], ['Two clocks', '02'], ['Calendar', '03']].map(([a, b], i) => (
                <div key={a} className="w-[150px] border px-3 py-2" style={{ borderColor: i === 0 ? T.black : '#C9C9C9', color: i === 0 ? T.black : '#8B8F96' }}>{a}<br /><span style={{ color: '#A0A4AA' }}>{b}</span></div>
              ))}
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 overflow-hidden rounded-sm lg:grid-cols-[240px_minmax(0,1fr)_420px]" style={{ background: T.graphite, color: T.text, border: `1px solid ${T.black}` }}>
            <div className="border-b p-4 lg:border-b-0 lg:border-r" style={{ borderColor: T.line }}>
              <p className="text-[10.5px] uppercase tracking-[0.05em]" style={{ fontFamily: 'var(--mono)', color: T.text3 }}>Objects</p>
              {[['Satellites', ['Aqua · drifting later', 'Terra · drifting earlier', 'VIIRS · fixed clock']], ['Datasets', ['NASA FIRMS', 'INPE official count']], ['Analyses', ['Audit 2021–2025', 'Two-clocks test']], ['Checks', [`P1–P10 · ${passed}/${checks.length} pass`]]].map(([h, items]) => (
                <div key={h as string} className="mt-4">
                  <p className="text-[12px] font-medium">{h as string}</p>
                  <ul className="mt-1.5 space-y-1 text-[12px]" style={{ color: T.text2 }}>{(items as string[]).map((i) => <li key={i} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.text3 }} />{i}</li>)}</ul>
                </div>
              ))}
            </div>
            <div className="h-[520px] border-b lg:border-b-0 lg:border-r" style={{ borderColor: T.line }}>
              <KnowledgeGraph nodes={graph.nodes} links={graph.links} typeColors={typeColors} centerNodeId="amazon" />
            </div>
            <div className="p-4">
              <p className="text-[10.5px] uppercase tracking-[0.05em]" style={{ fontFamily: 'var(--mono)', color: T.text3 }}>Inspector · region</p>
              <p className="mt-1 text-[22px] font-normal">Amazon (Brazil)</p>
              <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-sm text-[12px]" style={{ background: T.line }}>
                {[['Official 24→25', pct(headline.official)], ['Fixed clock 24→25', pct(headline.fixed)], ['Clock effect 2025', pct(headline.gap)], ['Range', `${pct(headline.gapLo)} … ${pct(headline.gapHi)}`]].map(([k, v]) => (
                  <div key={k} className="px-3 py-2" style={{ background: T.panel }}><dt style={{ color: T.text3 }}>{k}</dt><dd className="mt-0.5 text-[15px]" style={{ fontFamily: 'var(--mono)', color: T.text }}>{v}</dd></div>
                ))}
              </dl>
              <div className="mt-4"><LeaderboardBars rows={rows} rowLabel="year" barLabel="clock effect" columns={['Aqua-based', 'Fixed']} min={-10} max={35} ticks={[-10, 0, 10, 20, 30]} band={[-noiseFloor, noiseFloor]} bandLabel="" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* indexed contents */}
      <section className="py-20" style={{ background: '#F6F6F4', color: T.black }} aria-label="Contents">
        <div className="mx-auto max-w-[1480px] px-6">
          <IndexListCarousel
            height={640} background="#F6F6F4" ink={T.black} label="Contents" initial={2}
            slides={[
              { index: '/0.0', title: 'Verdict', caption: 'Does the official trend hold on a fixed clock?', image: 'img/previews/verdict.jpg' },
              { index: '/1.0', title: 'The clock moved', caption: "Aqua, Terra and VIIRS look times, measured from the hotspots.", image: 'img/previews/clock-moved.jpg' },
              { index: '/2.0', title: 'Two clocks', caption: 'Opposite drifts cancel the shared orbit effect.', image: 'img/previews/two-clocks.jpg' },
              { index: '/3.0', title: 'Audit', caption: 'Every region, every year since 2021, with a noise floor.', image: 'img/previews/audit.jpg' },
              { index: '/4.0', title: 'Calendar', caption: 'Month by month since 2002, against the median.', image: 'img/previews/calendar.jpg' },
              { index: '/6.0', title: 'What satellites miss', caption: 'Detection limits against recorded California fires.', image: 'img/previews/regions.jpg' },
            ]}
          />
        </div>
      </section>

      {/* CTA pair */}
      <section id="e-data" className="pb-16" style={{ background: '#F6F6F4' }}>
        <div className="mx-auto grid max-w-[1480px] grid-cols-1 gap-3 px-6 md:grid-cols-2">
          <a href="#" className="flex h-36 items-start justify-between rounded-sm p-5 text-[32px] font-light" style={{ background: T.grey2, color: T.black }}>Get the data <Arrow /></a>
          <a href="#" className="flex h-36 items-start justify-between rounded-sm p-5 text-[32px] font-light" style={{ background: T.graphite, color: T.text }}>Read the method <Arrow /></a>
        </div>
        <p className="mx-auto mt-6 max-w-[1480px] px-6 text-[11px]" style={{ fontFamily: 'var(--mono)', color: '#6B6F76' }}>Source: NASA FIRMS via the Anchor pipeline · MOCK numbers · Team Propagators</p>
      </section>
    </div>
  )
}
