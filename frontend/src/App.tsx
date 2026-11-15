// Anchor direction comps. Round 2 (current): ?d=a|b|c|d|e (D has two pages: ?d=d is the landing, ?d=d&page=app the audit). Round 1 (rejected, kept for the record): ?round=1&d=a..e.
import { lazy, Suspense, type ComponentType } from 'react'

const R2 = {
  a: lazy(() => import('./directions/r2/Sundial')), b: lazy(() => import('./directions/r2/Posters')), c: lazy(() => import('./directions/r2/Record')),
  d: lazy(() => import('./directions/r2/FieldFilm')), e: lazy(() => import('./directions/r2/Operating')),
}
const R1 = {
  a: lazy(() => import('./directions/DirectionA')), b: lazy(() => import('./directions/DirectionB')), c: lazy(() => import('./directions/DirectionC')),
  d: lazy(() => import('./directions/DirectionD')), e: lazy(() => import('./directions/DirectionE')),
}

export default function App() {
  const p = new URLSearchParams(window.location.search)
  const d = p.get('d') ?? 'a'
  const set = p.get('round') === '1' ? R1 : R2
  const View = (set as unknown as Record<string, ComponentType>)[d] ?? set.a
  return <Suspense fallback={null}><View /></Suspense>
}
