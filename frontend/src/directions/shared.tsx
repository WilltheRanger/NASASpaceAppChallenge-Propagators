// Shared bits for the Round 1 direction comps. Drafted with AI assistance (Claude) for Team Propagators.
import type { CSSProperties, ReactNode } from 'react'

export const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg>
)
export const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
)
export function MockBadge({ style }: { style?: CSSProperties }) {
  return (
    <span title="Synthetic placeholder numbers from data/mock" className="rounded px-2 py-1 text-[11px] font-bold" style={{ background: '#FFD23F', color: '#1B1916', fontFamily: 'var(--mono)', ...style }}>
      MOCK DATA
    </span>
  )
}
export const SECTIONS = ['Verdict', 'The clock moved', 'Two clocks', 'Audit', 'Calendar', 'How we know', 'What satellites miss', 'Limits']
export function Num({ children, color }: { children: ReactNode; color: string }) {
  return <span style={{ fontFamily: 'var(--mono)', color, fontWeight: 600 }}>{children}</span>
}
