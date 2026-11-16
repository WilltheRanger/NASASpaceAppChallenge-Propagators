/**
 * SI chat, adapted from 21st.dev's cited-answer chat input (dhxwhy/cited-answer-chat-input) and suggestion chips
 * (serafimcloud/suggestions): a running conversation in which every sentence of an answer carries numbered chips for the
 * sources it rests on, a folding list of those sources, buttons for what the answer can do on the map, and follow-up
 * suggestions. Restyled to Anchor's tokens; chips are neutral (the satellite colours belong to the satellites).
 * Sentences reveal one by one; with motion off they appear at once. Answers come from the caller (no network).
 */
import * as React from 'react'
import { ArrowUp, BookOpen, ChevronRight, ExternalLink, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SiAction, SiAnswer } from '@/r2/si'

export type SiTurn = { id: number; q: string; a: SiAnswer }

export interface SiChatProps {
  turns: SiTurn[]
  onAsk: (q: string) => void
  onAction: (a: SiAction) => void
  starters: string[]
  motion: boolean
  onClose?: () => void
  className?: string
}

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]'

export function SiChat({ turns, onAsk, onAction, starters, motion, onClose, className }: SiChatProps) {
  const [draft, setDraft] = React.useState('')
  const thread = React.useRef<HTMLDivElement | null>(null)
  const last = turns[turns.length - 1]
  React.useEffect(() => {
    const el = thread.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: motion ? 'smooth' : 'auto' })
  }, [turns.length, motion])
  const send = (text?: string) => {
    const q = (text ?? draft).trim()
    if (!q) return
    onAsk(q)
    setDraft('')
  }
  return (
    <section aria-label="Ask Anchor" className={cn('flex min-h-0 flex-col', className)}>
      <header className="flex items-start justify-between gap-3 border-b border-[color:var(--hairline)] px-4 py-3">
        <div>
          <h2 className="text-base font-medium text-[color:var(--bone)]">Ask Anchor</h2>
          <p className="mt-0.5 text-xs text-[color:var(--bone3)]">Answers from this page’s data, with sources</p>
        </div>
        {onClose ? (
          <button type="button" aria-label="Close Ask Anchor" onClick={onClose} className={cn('grid size-8 place-items-center rounded text-[color:var(--bone2)] hover:text-[color:var(--bone)]', focusRing)}>
            <X size={16} strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
      </header>

      <div ref={thread} role="log" aria-label="Conversation with Ask Anchor" aria-live="off" tabIndex={0} className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-3 outline-none', focusRing)}>
        {turns.length === 0 ? (
          <p className="text-sm text-[color:var(--bone2)]">Ask about any fire, satellite or region.</p>
        ) : null}
        <ol className="flex list-none flex-col gap-5">
          {turns.map((t) => (
            <li key={t.id} className="flex flex-col gap-2">
              <p className="ml-auto w-fit max-w-[90%] rounded-lg rounded-br-sm bg-[color:var(--raised)] px-3 py-2 text-sm text-[color:var(--bone)]">{t.q}</p>
              <Answer a={t.a} motion={motion} onAction={onAction} onAsk={onAsk} fresh={t.id === last?.id} />
            </li>
          ))}
        </ol>
      </div>

      <div className="border-t border-[color:var(--hairline)] px-4 pb-4 pt-3">
        {turns.length === 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {starters.map((s) => <Suggestion key={s} text={s} onClick={() => send(s)} />)}
          </div>
        ) : null}
        <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-end gap-2 rounded-md border border-[color:var(--bone-20)] bg-[color:var(--surface)] p-2 focus-within:border-[color:var(--bone)]">
          <label htmlFor="si-q" className="sr-only">Ask Anchor</label>
          <textarea
            id="si-q"
            rows={1}
            value={draft}
            placeholder="Ask Anchor about the map"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
            className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-[color:var(--bone)] outline-none placeholder:text-[color:var(--bone3)]"
          />
          <button type="submit" aria-label="Send" disabled={!draft.trim()} className={cn('grid size-9 shrink-0 place-items-center rounded bg-[color:var(--bone)] text-[color:var(--ink)] transition-opacity duration-150 disabled:opacity-30', focusRing)}>
            <ArrowUp size={16} strokeWidth={2} aria-hidden />
          </button>
        </form>
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{last ? last.a.sentences.map((s) => s.text).join(' ') : ''}</p>
    </section>
  )
}

function Suggestion({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('min-h-8 rounded border border-[color:var(--bone-20)] px-2.5 text-left text-xs text-[color:var(--bone2)] transition-colors duration-150 hover:bg-[color:var(--raised)] hover:text-[color:var(--bone)]', focusRing)}>
      {text}
    </button>
  )
}

function Answer({ a, motion, onAction, onAsk, fresh }: { a: SiAnswer; motion: boolean; onAction: (x: SiAction) => void; onAsk: (q: string) => void; fresh: boolean }) {
  const [shown, setShown] = React.useState(fresh && motion ? 0 : a.sentences.length)
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (shown >= a.sentences.length) return
    const t = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 120 : 260)
    return () => window.clearTimeout(t)
  }, [shown, a.sentences.length])
  const done = shown >= a.sentences.length
  const index = (id: string) => a.sources.findIndex((s) => s.id === id)
  return (
    <div className="flex flex-col gap-2">
      {a.sources.length ? (
        <div>
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={cn('flex items-center gap-1.5 rounded text-xs text-[color:var(--bone3)] hover:text-[color:var(--bone2)]', focusRing)}>
            <BookOpen size={13} strokeWidth={1.75} aria-hidden />
            {a.sources.length} {a.sources.length === 1 ? 'source' : 'sources'}
            <ChevronRight size={13} strokeWidth={1.75} aria-hidden className={cn('transition-transform duration-150', open && 'rotate-90')} />
          </button>
          {open ? (
            <ol className="mt-2 flex list-none flex-col gap-1.5">
              {a.sources.map((s, k) => (
                <li key={s.id} onMouseEnter={() => setActive(s.id)} onMouseLeave={() => setActive(null)} className={cn('flex items-start gap-2 rounded border border-[color:var(--hairline)] px-2 py-1.5 text-xs transition-colors duration-150', active === s.id && 'border-[color:var(--bone-20)] bg-[color:var(--surface)]')}>
                  <span className="grid size-4 shrink-0 place-items-center rounded-[3px] bg-[color:var(--bone-20)] text-[10px] tabular-nums text-[color:var(--bone)]">{k + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[color:var(--bone)]">{s.title}</span>
                    <span className="block truncate text-[color:var(--bone3)]">{s.domain}</span>
                  </span>
                  {s.url ? <a href={s.url} target="_blank" rel="noreferrer" aria-label={`Open ${s.title}`} className={cn('rounded text-[color:var(--bone3)] hover:text-[color:var(--bone)]', focusRing)}><ExternalLink size={12} strokeWidth={1.75} aria-hidden /></a> : null}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
      <p className="text-sm leading-6 text-[color:var(--bone)]">
        {a.sentences.slice(0, shown).map((s, k) => (
          <React.Fragment key={k}>
            {k > 0 ? ' ' : ''}
            <span className={cn(motion && fresh && 'animate-[anchor-fade_300ms_cubic-bezier(0.22,1,0.36,1)]')}>{s.text}</span>
            {s.cite?.map((id) => {
              const i = index(id)
              if (i < 0) return null
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={`Source ${i + 1}: ${a.sources[i].title}`}
                  onMouseEnter={() => setActive(id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(id)}
                  onBlur={() => setActive(null)}
                  onClick={() => setOpen(true)}
                  className={cn('mx-0.5 inline-grid h-4 min-w-4 place-items-center rounded-[3px] px-1 align-text-top text-[10px] tabular-nums text-[color:var(--bone)] ring-1 transition-colors duration-150', focusRing,
                    active === id ? 'bg-[color:var(--bone-30)] ring-[color:var(--bone)]' : 'bg-[color:var(--bone-20)] ring-transparent')}
                >
                  {i + 1}
                </button>
              )
            })}
          </React.Fragment>
        ))}
      </p>
      {done && a.actions?.length ? (
        <div className="flex flex-wrap gap-2">
          {a.actions.map((x) => (
            <button key={x.label} type="button" onClick={() => onAction(x)} className={cn('min-h-8 rounded bg-[color:var(--bone)] px-3 text-xs font-medium text-[color:var(--ink)] transition-colors duration-150 hover:bg-[color:var(--bone-hover)]', focusRing)}>
              {x.label}
            </button>
          ))}
        </div>
      ) : null}
      {done && a.followUps?.length ? (
        <div className="flex flex-wrap gap-2">
          {a.followUps.map((f) => <Suggestion key={f} text={f} onClick={() => onAsk(f)} />)}
        </div>
      ) : null}
    </div>
  )
}

export default SiChat
