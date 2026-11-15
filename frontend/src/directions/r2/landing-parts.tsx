// Kept for the new landing page, which the team is designing. These are the old landing's teaching sections: how
// Anchor reads a count (with the pass line), the six regions as photograph tiles, and the tagline. They are rendered
// nowhere for now; they compile against FieldFilm's tokens and shared classes, and their images stay in public/ (the
// comment-page build still copies them). The region tiles link to the region page through linksFor in FieldFilm.tsx.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { REGIONS, hm, minutesBetween, regionData, verdictHeadline, type RegionData } from '@/r2/data'
import { cn } from '@/lib/utils'
import { photoFor } from '@/r2/photos'
import { FEATURED, focusRing, primaryButton, shell, statement, titleLarge, useMotion, type Leave, type Links } from './FieldFilm'

type Drift = RegionData['drift'][number]
const slideEase = 'transition-transform duration-240 ease-[var(--ease)] motion-reduce:transition-none'

/* ---------- Motion: their InView and line rise, used by these sections ---------- */

/** True once the element has been `threshold` in view (their InView: 0.05 for slices, 0.5 for cards); true at once
 *  without motion or without IntersectionObserver, so nothing can stay hidden. */
function useInView<T extends Element>(motion: boolean, threshold = 0.05) {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(!motion)
  useEffect(() => {
    if (!motion) { setSeen(true); return }
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() } }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [motion, threshold])
  return [ref, seen] as const
}

/** Their line rise (SplitText + y 100% → 0, 1000 ms easeOutExpo), for a whole title: it rises from behind a mask the
 *  first time half of it is in view. */
function Rise({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const motion = useMotion()
  const [ref, seen] = useInView<HTMLDivElement>(motion.on, 0.5)
  return (
    <div ref={ref} className="overflow-hidden pb-1">
      <div style={{ transitionDelay: `${delay}ms` }} className={cn('transition-transform duration-1000 ease-[var(--ease)]', seen ? 'translate-y-0' : 'translate-y-full')}>
        {children}
      </div>
    </div>
  )
}

/* ---------- Pass line: when each satellite looked, 06:00 to 18:00 ---------- */

const AXIS_FROM = 6
const AXIS_TO = 18
const HOURS = Array.from({ length: AXIS_TO - AXIS_FROM + 1 }, (_, i) => AXIS_FROM + i)
const LABELLED = HOURS.filter((h) => (h - AXIS_FROM) % 2 === 0)
const at = (hours: number) => ((hours - AXIS_FROM) / (AXIS_TO - AXIS_FROM)) * 100
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

/** When each satellite looked in one year, as an instrument line on a 06:00 to 18:00 axis. Each satellite has its own
 *  marker and pin: Aqua, the one that drifts, a filled dot under a solid flag carrying its time and the minutes it added;
 *  the fixed clock (VIIRS) a green diamond; Terra a hollow ring. The drift itself is a bar on the axis from the fixed clock to Aqua.
 *  Colours come from the page tokens, so the figure works on black and, re-inked, on the bone band. */
function PassFigure({ dr, year }: { dr: Drift; year: number }) {
  const shift = minutesBetween(dr.aqua_lst, dr.viirs_lst)
  const later = shift >= 0
  const xa = at(hm(dr.aqua_lst))
  const xf = at(hm(dr.viirs_lst))
  const xt = at(hm(dr.terra_lst))
  const vars = {
    '--xa': `${xa}%`,
    '--xf': `${xf}%`,
    '--xt': `${xt}%`,
    '--bar-x': `${Math.min(xa, xf)}%`,
    '--bar-k': `${Math.abs(xa - xf) / 100}`,
  } as CSSProperties
  const description = `When each satellite looked in ${year}: Terra ${dr.terra_lst}, fixed clock ${dr.viirs_lst}, Aqua ${dr.aqua_lst}, ${Math.abs(shift)} minutes ${later ? 'after' : 'before'} the fixed clock`
  // each satellite rides a full-width layer moved with translateX, so a change of year slides it (instant without motion)
  const layer = cn('absolute inset-x-0 top-0 h-full', slideEase)
  const axis = 'top-20 sm:top-24' // 80 px, 96 px
  const marker = cn('absolute left-0 -translate-x-1/2 -translate-y-1/2', axis)
  const label = 'absolute whitespace-nowrap text-xs leading-4 sm:text-sm sm:leading-5'
  // Aqua's flag hangs centred over its pin, and turns to hang leftwards near the right edge
  const flagSide = xa > 84 ? '-translate-x-full left-px' : xa < 12 ? '-left-px' : '-translate-x-1/2'

  return (
    <div role="img" aria-label={description} style={vars} className="relative h-28 overflow-hidden sm:h-32">
      {/* the day, 06:00 to 18:00 */}
      <span aria-hidden className={cn('absolute inset-x-0 h-px bg-[color:var(--bone-30)]', axis)} />
      {HOURS.map((h) => (
        <span
          key={h}
          aria-hidden
          style={{ '--xh': `${at(h)}%` } as CSSProperties}
          className={cn('absolute left-[var(--xh)] h-1.5 w-px -translate-y-1/2 bg-[color:var(--bone-30)]', axis)}
        />
      ))}
      {LABELLED.map((h, i) => (
        <span
          key={h}
          aria-hidden
          style={{ '--xh': `${at(h)}%` } as CSSProperties}
          className={cn(
            'absolute left-[var(--xh)] top-23 text-xs leading-4 text-[color:var(--bone3)] sm:top-27',
            i === 0 ? '' : i === LABELLED.length - 1 ? '-translate-x-full' : '-translate-x-1/2',
          )}
        >
          {hourLabel(h)}
        </span>
      ))}
      {/* the minutes the later look added: a bar along the axis from the fixed clock to Aqua */}
      <span
        aria-hidden
        className={cn('absolute inset-x-0 h-1 origin-left -translate-y-1/2 translate-x-[var(--bar-x)] scale-x-[var(--bar-k)] bg-[color:var(--sat-aqua)]', axis, slideEase)}
      />

      {/* Terra: a hollow ring, the lowest label, set to the left of its pin */}
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xt)]')}>
        <span className="absolute left-0 top-[62px] h-[18px] w-px -translate-x-1/2 bg-[color:var(--sat-terra)] sm:top-[74px] sm:h-[22px]" />
        <span className={cn(marker, 'size-2.5 rounded-full border-2 border-[color:var(--sat-terra)] bg-[color:var(--figure-bg,var(--surface))]')} />
        <span className={cn(label, '-left-2 top-[46px] -translate-x-full text-[color:var(--bone3)] sm:top-[54px]')}>Terra {dr.terra_lst}</span>
      </div>

      {/* the fixed clock: a green diamond; its label sits on the side away from Aqua, so the two never touch */}
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xf)]')}>
        <span className="absolute left-0 top-[42px] h-[38px] w-px -translate-x-1/2 bg-[color:var(--sat-viirs)] sm:top-[50px] sm:h-[46px]" />
        <span className={cn(marker, 'size-2.5 rotate-45 bg-[color:var(--sat-viirs)]')} />
        <span className={cn(label, 'top-[26px] text-[color:var(--bone3)] sm:top-[30px]', later ? '-left-2 -translate-x-full' : 'left-2')}>
          Fixed clock {dr.viirs_lst}
        </span>
      </div>

      {/* Aqua: the one that moves; a solid flag with its time and the minutes it added, a filled dot on the axis */}
      <div aria-hidden className={cn(layer, 'translate-x-[var(--xa)]')}>
        <span className="absolute left-0 top-5 h-15 w-0.5 -translate-x-1/2 bg-[color:var(--sat-aqua)] sm:top-6 sm:h-18" />
        <span className={cn(marker, 'size-3 rounded-full bg-[color:var(--sat-aqua)] ring-2 ring-[color:var(--figure-bg,var(--surface))]')} />
        <span
          className={cn(
            'absolute top-0 flex h-5 items-center gap-1.5 whitespace-nowrap rounded-[3px] bg-[color:var(--sat-aqua)] px-1.5 text-xs font-medium text-[color:var(--figure-on,var(--ink))] sm:h-6 sm:px-2 sm:text-sm',
            flagSide,
          )}
        >
          Aqua {dr.aqua_lst}
          <span className="font-normal opacity-75">{later ? '+' : '−'}{Math.abs(shift)} min</span>
        </span>
      </div>
    </div>
  )
}

/* ---------- Landing: how Anchor reads a count, on a bone band ---------- */

export function HowItWorks() {
  const motion = useMotion()
  const d = useMemo(() => regionData(FEATURED), [])
  const y = d.latestOk?.year ?? 2025
  const dr = d.driftAt(y)
  const [ref, seen] = useInView<HTMLOListElement>(motion.on, 0.3)
  const first = d.drift[0], last = d.lastDrift
  const steps = [
    {
      t: 'The reference satellite drifted',
      b: `INPE’s official fire counts for Brazil follow one reference satellite, Aqua, which for years looked at about the same time of day.${d.driftStart && first && last ? ` Since ${d.driftStart} its look over the Amazon has moved later: ${first.aqua_lst} in ${first.year}, ${last.aqua_lst} in ${last.year}.` : ''}`,
    },
    { t: 'Fires and clouds change through the day', b: 'So a count that follows a drifting clock can change with the time it looks as well as with the fires. Which way, and by how much, has to be measured, not assumed.' },
    { t: 'We hold the clock still', b: 'VIIRS still looks at the same time. We turn its counts into an Aqua-equivalent estimate, month by month, and set Aqua’s own count beside it, with a 95% range and the 2012–2020 placebo range. The gap shows where the two part; on its own it doesn’t say how much the timing caused.' },
  ]
  // the pass figure, re-inked for the bone ground
  const inked = {
    '--bone': 'var(--ink)',
    '--bone3': '#4E514A',
    '--bone-30': 'rgba(11, 13, 11, 0.3)',
    '--bone-80': 'rgba(11, 13, 11, 0.8)',
    '--sat-aqua': '#A65D00',
    '--sat-terra': '#2266A4',
    '--sat-viirs': '#1C7F4C',
    '--figure-bg': '#ECE9E1',
    '--figure-on': '#ECE9E1',
  } as CSSProperties
  return (
    <section id="how" aria-labelledby="how-h" className="scroll-mt-4 bg-[color:var(--bone)] text-[color:var(--ink)]">
      <div className={cn(shell, 'grid grid-cols-1 gap-y-10 py-24 lg:grid-cols-12 lg:gap-x-6')}>
        <div className="lg:col-span-4">
          <Rise><h2 id="how-h" className={titleLarge}>How we read a fire count</h2></Rise>
          <p className="mt-4 max-w-[var(--measure)] text-sm">The Amazon in {y}, from the team’s data files{d.mock ? ' (mock for now)' : ''}.</p>
        </div>
        <div className="min-w-0 lg:col-span-8">
          {dr ? <div style={inked}><PassFigure dr={dr} year={y} /></div> : null}
          {/* their rule + slide: each step's rule draws, then its words arrive from the left, 100 ms apart */}
          <ol ref={ref} className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6">
            {steps.map((s, i) => (
              <li key={s.t} className="relative pt-4">
                <span
                  aria-hidden
                  style={{ transitionDelay: `${i * 100}ms` }}
                  className={cn('absolute inset-x-0 top-0 h-px origin-left bg-[color:var(--ink)] transition-transform duration-1000 ease-[var(--ease)]', seen ? 'scale-x-100' : 'scale-x-0')}
                />
                <div
                  style={{ transitionDelay: `${200 + i * 100}ms` }}
                  className={cn('transition-[opacity,transform] duration-1000 ease-[var(--ease)]', seen ? 'translate-x-0 opacity-100' : '-translate-x-[10%] opacity-0')}
                >
                  <p className="text-lg font-medium">{s.t}</p>
                  <p className="mt-2 text-sm">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ---------- Landing: the six regions as photograph tiles ---------- */

export function RegionIndex({ links, leave }: { links: Links; leave: Leave }) {
  const motion = useMotion()
  const [ref, seen] = useInView<HTMLUListElement>(motion.on, 0.2)
  return (
    <section id="regions" aria-labelledby="regions-h" className={cn(shell, 'scroll-mt-4 py-24')}>
      <div className="grid grid-cols-1 gap-y-4 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-4"><Rise><h2 id="regions-h" className={titleLarge}>Six regions, one fixed clock</h2></Rise></div>
        <p className="max-w-[var(--measure)] text-sm text-[color:var(--bone2)] lg:col-span-8 lg:self-end">
          Each audit opens on its verdict, then shows when each satellite looked, the clock effect year by year and the fire calendar.
        </p>
      </div>
      <ul ref={ref} className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {REGIONS.map((r, i) => (
          <RegionTile key={r.id} id={r.id} name={r.name} i={i} seen={seen} href={links.regions(r.id)} leave={leave} />
        ))}
      </ul>
    </section>
  )
}

/** Their product tile: media, title, one line, ↗. */
export function RegionTile({ id, name, i, seen, href, leave }: { id: string; name: string; i: number; seen: boolean; href: string; leave: Leave }) {
  const p = photoFor(id)
  const verdict = useMemo(() => verdictHeadline(regionData(id)), [id])
  return (
    <li
      style={{ transitionDelay: `${i * 80}ms` }}
      className={cn('transition-[opacity,transform] duration-500 ease-[var(--ease)]', seen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')}
    >
      <a href={href} onClick={leave} className={cn('group relative block aspect-4/3 overflow-hidden bg-[color:var(--surface)]', focusRing)}>
        <img
          src={p.srcSm}
          alt=""
          width={720}
          height={Math.round((720 * p.height) / p.width)}
          loading="lazy"
          style={{ objectPosition: p.focus }}
          className="size-full object-cover transition-transform duration-500 ease-[var(--ease)] group-hover:scale-[1.03]"
        />
        <span aria-hidden className="absolute inset-0 bg-[image:var(--scrim-card)]" />
        <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-lg font-medium text-[color:var(--bone)]">{name}</span>
            <span className="mt-1 block text-sm text-[color:var(--bone-80)]">{verdict}</span>
          </span>
          <ArrowUpRight
            size={18}
            strokeWidth={1.5}
            aria-hidden
            className="mb-0.5 shrink-0 text-[color:var(--bone)] transition-transform duration-300 ease-[var(--ease)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </span>
      </a>
    </li>
  )
}

/** Their closing slogan, as Anchor's tagline, with one last way in. */
export function Closing({ href, leave }: { href: string; leave: Leave }) {
  return (
    <section aria-labelledby="close-h" className="border-t border-[color:var(--hairline)]">
      <div className={cn(shell, 'flex flex-col items-center py-24 text-center sm:py-32')}>
        <Rise>
          <h2 id="close-h" className={statement}>Count the fires, not the clock.</h2>
        </Rise>
        <a href={href} onClick={leave} className={cn(primaryButton, 'mt-10')}>
          Open the audit
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
        </a>
      </div>
    </section>
  )
}
