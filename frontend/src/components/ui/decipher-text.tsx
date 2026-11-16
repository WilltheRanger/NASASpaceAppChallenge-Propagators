/**
 * Decipher text: the text resolves out of random glyphs from left to right, the way a target readout locks on. Spaces
 * and punctuation hold still so the words keep their shape. Assistive technology reads the final text only; with
 * motion off (the site's switch, or the reader's reduced-motion setting) it shows at once.
 */
import * as React from 'react'

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%/<>'
const HOLD = /[\s.,:;°()'’+\-–—·]/

export interface DecipherTextProps {
  text: string
  motion?: boolean
  /** how long the whole text takes to resolve, in ms */
  duration?: number
  /** wait this long before starting, in ms */
  delay?: number
  className?: string
}

export function DecipherText({ text, motion = true, duration = 650, delay = 0, className }: DecipherTextProps) {
  const reduced = usePrefersReduced()
  const still = !motion || reduced
  const [shown, setShown] = React.useState(text)
  React.useEffect(() => {
    if (still) { setShown(text); return }
    let raf = 0
    let last = 0
    const t0 = performance.now() + delay
    const scramble = (resolved: number) => {
      let out = ''
      for (let i = 0; i < text.length; i++) {
        const c = text[i]
        out += i < resolved || HOLD.test(c) ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      }
      return out
    }
    setShown(scramble(0))
    const step = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - t0) / duration))
      if (p >= 1) { setShown(text); return }
      if (now - last > 40) { last = now; setShown(scramble(Math.floor(p * text.length))) }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [text, still, duration, delay])
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{shown}</span>
    </span>
  )
}

function usePrefersReduced() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setReduced(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return reduced
}

export default DecipherText
