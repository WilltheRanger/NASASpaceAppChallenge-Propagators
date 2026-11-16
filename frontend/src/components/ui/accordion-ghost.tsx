/**
 * Ghost accordion, adapted from 21st.dev (arihantcodes_1f7b8c4d/accordion-ghost): a borderless, minimal accordion with
 * numbered rows and a plus that turns into a cross when a row opens. What changed: the registry's helper file
 * (accordion-ghost-utils/accordion, built on @radix-ui/react-accordion) was not in the response and Radix's accordion is
 * not installed, so the root, item, trigger and panel are written here, minimally: a button with aria-expanded and
 * aria-controls inside a heading, and a labelled region. Hairline rows in Anchor's tokens, 44 px rows, a visible focus
 * ring, framer-motion for the height; with motion off (the site's switch or the reader's reduced-motion setting) a row
 * opens at once. Closed rows keep nothing hidden that matters: each row's one line is its trigger.
 */
import * as React from 'react'
import { AnimatePresence, motion as m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Ctx = { open: string[]; toggle: (v: string) => void; still: boolean; level: 2 | 3 | 4 }
const AccordionCtx = React.createContext<Ctx | null>(null)
const ItemCtx = React.createContext<{ value: string; id: string; open: boolean } | null>(null)

const use = <T,>(c: React.Context<T | null>, name: string) => {
  const v = React.useContext(c)
  if (!v) throw new Error(`${name} must be used inside <Accordion>`)
  return v
}

export interface AccordionProps {
  /** one row open at a time, or any number */
  type?: 'single' | 'multiple'
  /** single: the open row can be closed again */
  collapsible?: boolean
  defaultValue?: string[]
  /** the site's motion switch; reduced motion is also respected */
  motion?: boolean
  /** the heading level each trigger sits in */
  level?: 2 | 3 | 4
  className?: string
  children: React.ReactNode
}

export function Accordion({ type = 'single', collapsible = true, defaultValue = [], motion = true, level = 3, className, children }: AccordionProps) {
  const reduce = useReducedMotion()
  const [open, setOpen] = React.useState<string[]>(defaultValue)
  const toggle = React.useCallback((v: string) => {
    setOpen((cur) => {
      const isOpen = cur.includes(v)
      if (type === 'multiple') return isOpen ? cur.filter((x) => x !== v) : [...cur, v]
      if (isOpen) return collapsible ? [] : cur
      return [v]
    })
  }, [type, collapsible])
  return (
    <AccordionCtx.Provider value={{ open, toggle, still: !motion || !!reduce, level }}>
      <div className={cn('border-t border-[color:var(--hairline)]', className)}>{children}</div>
    </AccordionCtx.Provider>
  )
}

export function AccordionItem({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { open } = use(AccordionCtx, 'AccordionItem')
  const id = React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <ItemCtx.Provider value={{ value, id, open: open.includes(value) }}>
      <div data-state={open.includes(value) ? 'open' : 'closed'} className={cn('border-b border-[color:var(--hairline)]', className)}>{children}</div>
    </ItemCtx.Provider>
  )
}

/** The row: an optional number (01, P3…), the one line, anything after it (a status), and the plus. */
export function AccordionTrigger({ number, after, className, children }: { number?: React.ReactNode; after?: React.ReactNode; className?: string; children: React.ReactNode }) {
  const { toggle, still, level } = use(AccordionCtx, 'AccordionTrigger')
  const item = use(ItemCtx, 'AccordionTrigger')
  const Heading = `h${level}` as 'h3'
  return (
    <Heading className="m-0 flex text-base font-normal">
      <button
        type="button"
        id={`${item.id}-t`}
        aria-expanded={item.open}
        aria-controls={`${item.id}-p`}
        onClick={() => toggle(item.value)}
        className={cn(
          'group flex min-h-11 flex-1 items-start gap-3 rounded py-3 text-left text-sm text-[color:var(--bone)] outline-none sm:gap-4',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)]',
          className,
        )}
      >
        {number != null ? <span className="w-8 shrink-0 pt-px text-xs tabular-nums leading-5 text-[color:var(--bone3)] group-hover:text-[color:var(--bone2)]">{number}</span> : null}
        <span className="min-w-0 flex-1 leading-5">{children}</span>
        {after != null ? <span className="shrink-0 leading-5">{after}</span> : null}
        <span aria-hidden className="relative mt-0.5 grid size-4 shrink-0 place-items-center text-[color:var(--bone2)] group-hover:text-[color:var(--bone)]">
          <span className="absolute h-px w-3 bg-current" />
          <span className={cn('absolute h-3 w-px bg-current', !still && 'transition-transform duration-200 ease-[var(--ease)]', item.open ? 'rotate-90 scale-y-0' : 'rotate-0')} />
        </span>
      </button>
    </Heading>
  )
}

export function AccordionContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { still } = use(AccordionCtx, 'AccordionContent')
  const item = use(ItemCtx, 'AccordionContent')
  return (
    <AnimatePresence initial={false}>
      {item.open ? (
        <m.div
          key="panel"
          id={`${item.id}-p`}
          role="region"
          aria-labelledby={`${item.id}-t`}
          initial={still ? false : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={still ? { height: 0, opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
          transition={still ? { duration: 0 } : { height: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2 } }}
          className="overflow-hidden"
        >
          <div className={cn('pb-5 pl-11 pr-7 text-sm text-[color:var(--bone2)] sm:pl-12', className)}>{children}</div>
        </m.div>
      ) : null}
    </AnimatePresence>
  )
}

export default Accordion
