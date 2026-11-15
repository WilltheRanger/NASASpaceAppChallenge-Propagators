// The site: the landing (/) and the audit (?page=app). Round 1 (rejected, kept for the record) opens in development
// only, at ?round=1&d=a..e; the deployed build leaves it out. Round 2's other comps are kept as renders in designs/round-2/.
import { lazy, Suspense, type ComponentType } from 'react'
import Site from './directions/r2/FieldFilm' // static, so the page arrives in one request rather than two in a row
const R1: Record<string, ComponentType> | null = import.meta.env.DEV
  ? {
      a: lazy(() => import('./directions/DirectionA')), b: lazy(() => import('./directions/DirectionB')), c: lazy(() => import('./directions/DirectionC')),
      d: lazy(() => import('./directions/DirectionD')), e: lazy(() => import('./directions/DirectionE')),
    }
  : null
const R1_FONTS = [
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..800&family=JetBrains+Mono:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&family=Schibsted+Grotesk:wght@400;500;600;700;800&family=Martian+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@300;400;500;600;700&family=Geist:wght@200;300;400;500;600&family=Geist+Mono:wght@400;500&display=swap',
  'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500&family=Source+Sans+3:wght@400;500;600&family=Host+Grotesk:wght@400;500;600&family=Sofia+Sans:wght@400;500;600&family=Sofia+Sans+Extra+Condensed:wght@400;500&family=Chivo+Mono:wght@400;500&family=Golos+Text:wght@400;500&display=swap',
]

export default function App() {
  const p = new URLSearchParams(window.location.search)
  const Round1 = R1 && p.get('round') === '1' ? R1[p.get('d') ?? 'a'] ?? R1.a : null
  if (Round1) {
    for (const href of R1_FONTS) {
      if (document.querySelector(`link[href="${href}"]`)) continue
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l)
    }
  }
  const View = Round1 ?? Site
  return <Suspense fallback={null}><View /></Suspense>
}
