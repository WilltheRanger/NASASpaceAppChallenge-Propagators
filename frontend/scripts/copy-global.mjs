// Copies the global clock layer's data (data/out/global) into public/global, where the site fetches it on demand.
// Runs before `npm run dev` and `npm run build` (predev / prebuild). public/global is generated: do not edit or commit it.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', '..', 'data', 'out', 'global')
const dst = join(here, '..', 'public', 'global')
rmSync(dst, { recursive: true, force: true })
if (existsSync(join(src, 'grid.json'))) {
  mkdirSync(dst, { recursive: true })
  cpSync(src, dst, { recursive: true })
  console.log('global layer: copied data/out/global to public/global')
} else {
  console.log('global layer: data/out/global/grid.json not found; the site is built without the world map')
}
