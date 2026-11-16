/**
 * Key value list, adapted from 21st.dev (corr/key-value-list): a definition list of label/value pairs with an optional
 * note under a value. What changed: the site's tokens instead of shadcn's (bone text, bone3 labels, hairline rules), a
 * compact density for cards on the map (label column sized by the caller), tabular figures, and values that wrap rather
 * than truncate, so no reading is cut off.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type KeyValueListItem = {
  label: ReactNode
  value: ReactNode
  description?: ReactNode
}

export function KeyValueList({
  items,
  variant = 'default',
  labelWidth = '7.5rem',
  className,
}: {
  items: KeyValueListItem[]
  variant?: 'default' | 'bordered' | 'ruled'
  /** the label column's width */
  labelWidth?: string
  className?: string
}) {
  return (
    <dl className={cn('grid text-xs', variant === 'bordered' && 'overflow-hidden rounded-[4px] border border-[color:var(--hairline)]', className)}>
      {items.map((item, index) => (
        <div
          key={index}
          style={{ gridTemplateColumns: `${labelWidth} minmax(0, 1fr)` }}
          className={cn('grid gap-3 py-1.5', variant === 'bordered' && 'px-3', variant !== 'default' && index > 0 && 'border-t border-[color:var(--hairline)]')}
        >
          <dt className="text-[color:var(--bone3)]">{item.label}</dt>
          <dd className="min-w-0 tabular-nums text-[color:var(--bone)]">
            {item.value}
            {item.description ? <div className="mt-0.5 text-[color:var(--bone3)]">{item.description}</div> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default KeyValueList
