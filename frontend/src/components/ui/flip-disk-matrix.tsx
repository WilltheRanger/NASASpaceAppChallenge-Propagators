// Flip Disk Matrix — adapted from 21st.dev "Flip Disk Matrix" by daiwiikharihar
// (https://21st.dev/@daiwiikharihar/components/flip-disk-matrix).
// Changes for Anchor: shows a value passed in (e.g. a look time) instead of the live clock,
// drops the demo mode switcher and text box, takes colours from CSS variables, and adds
// an accessible label. Adaptation drafted with AI assistance (Claude) for Team Propagators.
import { memo, useMemo, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

const GLYPHS: Record<string, number[]> = {
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  '3': [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  ':': [0b00000, 0b00100, 0b00000, 0b00000, 0b00000, 0b00100, 0b00000],
  '+': [0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000],
  '-': [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  ' ': [0, 0, 0, 0, 0, 0, 0],
}

/** Centre `text` (5×7 glyphs, 1 column gap) in a cols×rows grid. */
function bitmap(text: string, cols: number, rows: number): boolean[][] {
  const grid = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false))
  const chars = text.toUpperCase().split('')
  const total = chars.length * 6 - 1
  let ox = Math.max(0, Math.floor((cols - total) / 2))
  const oy = Math.max(0, Math.floor((rows - 7) / 2))
  for (const c of chars) {
    const g = GLYPHS[c] ?? GLYPHS[' ']
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 5; x++)
        if (oy + y < rows && ox + x < cols) grid[oy + y][ox + x] = !!(g[y] & (1 << (4 - x)))
    ox += 6
  }
  return grid
}

const Disk = memo(function Disk({ on }: { on: boolean }) {
  return (
    <div className="relative aspect-square w-full" style={{ perspective: '400px' }}>
      <div
        className="absolute inset-0 h-full w-full transition-transform duration-[600ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:rotate-x-[90deg] hover:duration-100 motion-reduce:transition-none"
        style={{ transformStyle: 'preserve-3d', transform: on ? 'rotateX(180deg)' : 'rotateX(0deg)' }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backfaceVisibility: 'hidden',
            background: 'var(--disk-off, #1c1926)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.55)',
            border: '1px solid var(--disk-off-edge, rgba(255,255,255,0.04))',
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
            background: 'var(--disk-on, #ff7a1a)',
            boxShadow: 'inset 0 -2px 5px rgba(0,0,0,0.25)',
            border: '1px solid var(--disk-on-edge, rgba(0,0,0,0.2))',
          }}
        />
      </div>
    </div>
  )
})

export interface FlipDiskMatrixProps {
  /** What to show, e.g. "14:12". Digits, colon, plus, minus and space. */
  text: string
  cols?: number
  rows?: number
  /** Gap between disks in px. */
  gap?: number
  /** Accessible description; defaults to the text. */
  label?: string
  /** Draw the device bezel around the matrix. */
  framed?: boolean
  className?: string
  style?: CSSProperties
}

export function FlipDiskMatrix({ text, cols, rows = 9, gap = 3, label, framed = true, className, style }: FlipDiskMatrixProps) {
  const width = cols ?? text.length * 6 + 3
  const bits = useMemo(() => bitmap(text, width, rows), [text, width, rows])
  const grid = (
    <div
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`, gap }}
      role="img"
      aria-label={label ?? text}
    >
      {bits.map((row, y) => row.map((on, x) => <Disk key={`${x}-${y}`} on={on} />))}
    </div>
  )
  if (!framed) return <div className={cn('w-full', className)} style={style}>{grid}</div>
  return (
    <div
      className={cn('w-full rounded-2xl p-2 md:p-3', className)}
      style={{ background: 'var(--disk-bezel, #0f0f0f)', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.35)', ...style }}
    >
      <div className="rounded-lg p-2" style={{ background: 'var(--disk-screen, #000)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,1)' }}>{grid}</div>
    </div>
  )
}
