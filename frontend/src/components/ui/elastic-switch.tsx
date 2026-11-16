/*
MIT License

Copyright (c) 2026 Manjunath Irukulla

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/**
 * Elastic switch, adapted from 21st.dev (mirukullacode/tweenly-elastic-switch): the knob stretches while pressed and
 * springs across with a little overshoot. Adapted to Anchor's tokens and framer-motion; still under reduced motion.
 */
import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface ElasticSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  className?: string
}

const S = { w: 36, h: 20, knob: 16, pad: 2 }

export function ElasticSwitch({ checked: on, onCheckedChange, label, className }: ElasticSwitchProps) {
  const reduced = useReducedMotion()
  const id = React.useId()
  const [pressed, setPressed] = React.useState(false)
  const knobW = pressed && !reduced ? S.knob * 1.35 : S.knob
  const x = on ? S.w - S.pad * 2 - knobW : 0
  const spring = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 520, damping: pressed ? 30 : 17, mass: 0.8 }
  return (
    <span className={cn('inline-flex min-h-11 items-center gap-2', className)}>
      {label ? <label htmlFor={id} className="cursor-pointer select-none text-sm text-[color:var(--bone2)]">{label}</label> : null}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onCheckedChange(!on)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onKeyDown={(e) => e.key === ' ' && setPressed(true)}
        onKeyUp={() => setPressed(false)}
        onBlur={() => setPressed(false)}
        className="relative shrink-0 cursor-pointer overflow-hidden rounded-full bg-[color:var(--bone-20)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--bone)] forced-colors:border forced-colors:border-[ButtonText]"
        style={{ width: S.w, height: S.h, padding: S.pad }}
      >
        <motion.span aria-hidden className="absolute inset-0 bg-[color:var(--bone)]" initial={false} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: reduced ? 0 : 0.2 }} />
        <motion.span
          aria-hidden
          className="relative block rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.35)]"
          style={{ height: S.knob, background: on ? '#0B0D0B' : '#ECE9E1' }}
          initial={false}
          animate={{ x, width: knobW }}
          transition={spring}
        />
      </button>
    </span>
  )
}

export default ElasticSwitch
