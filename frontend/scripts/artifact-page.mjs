// Assembles the comment pages for the shareable comment artifact from the D-only build (vite.artifact.config.ts): the
// region page as the main page, page.html (content only; the artifact adds the document skeleton), and the simulator as
// sim.html (a whole document), both loading the one script; CSS inlined; images and videos copied as files. app.html,
// the audit page's old address, becomes a small redirect to the region page that keeps the region and the calendar's
// keys from its hash.
// Usage: ARTIFACT_OUT=<dir> npm run artifact   (default dir: dist-artifact).
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = process.env.ARTIFACT_OUT ?? 'dist-artifact'
const css = readFileSync(join(out, 'assets', 'artifact-d.css'), 'utf8')
const regions = ['br-amazon', 'br-cerrado', 'br-pantanal', 'ar-argentina', 'in-punjab-haryana', 'us-california']
const images = [
  'amazon-terra-2026-09-04.jpg', 'amazon-viirs-2026-09-04.jpg', 'amazon-aqua-2026-09-04.jpg',
  'prints/amazon-terra-sq.jpg', 'prints/amazon-viirs-sq.jpg', 'prints/amazon-aqua-sq.jpg',
  ...regions.flatMap((r) => [`regions/${r}.jpg`, `regions/${r}-sm.jpg`]),
  // each other region's three passes on its own fire day, wide and square
  ...regions.filter((r) => r !== 'br-amazon').flatMap((r) => ['terra', 'viirs', 'aqua'].flatMap((k) => [`passes/${r}-${k}.jpg`, `prints/${r}-${k}-sq.jpg`])),
  // the one fire day's image, under the daylight map
  'daylight/br-amazon-2024-09-02.jpg',
  // the simulator's map of each studied region, and its globe (NASA Blue Marble, web mercator)
  ...regions.flatMap((r) => [`sim/${r}.webp`, `sim/${r}-context.jpg`]),
  'earth/bluemarble-4096.jpg',
]
mkdirSync(join(out, 'img', 'prints'), { recursive: true })
mkdirSync(join(out, 'img', 'passes'), { recursive: true })
mkdirSync(join(out, 'img', 'regions'), { recursive: true })
mkdirSync(join(out, 'img', 'daylight'), { recursive: true })
mkdirSync(join(out, 'img', 'sim'), { recursive: true })
mkdirSync(join(out, 'img', 'earth'), { recursive: true })
for (const f of images) copyFileSync(join('public', 'img', f), join(out, 'img', f))
// the drone loops and their posters
const videos = ['br-amazon', 'br-cerrado', 'br-pantanal', 'ar-argentina', 'in-punjab-haryana', 'us-california'].flatMap((r) => [`${r}.mp4`, `${r}-poster.jpg`])
mkdirSync(join(out, 'video', 'regions'), { recursive: true })
for (const f of videos) copyFileSync(join('public', 'video', 'regions', f), join(out, 'video', 'regions', f))

const contract = `<!--
  Anchor: satellite fire counts on a fixed clock. Team Propagators, NASA Space Apps Challenge 2026.
  Two pages: the region page (each region's name, its verdict and its audit) and the simulator (sim.html). Every number
  comes from the team's JSON files (data/out). Region photographs and drone footage are credited in the footer; pass
  and map imagery: NASA Worldview / GIBS.
-->`
const head = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500&display=swap">
<style>
${css}
:root { color-scheme: dark; }
html, body { background: #0B0D0B; color: #ECE9E1; }
</style>`

const description = "Aqua's daytime fire counts beside a fixed-clock VIIRS benchmark, for six fire regions, as Aqua's overpass time drifted later. Team Propagators, NASA Space Apps Challenge 2026."
const regionPage = `<title>Anchor Fire Audit</title>
<meta name="description" content="${description}">
${contract}
${head}
<div id="root" lang="en" data-page="regions"></div>
<script type="module" src="assets/app.js"></script>
`
// the old audit address: forward to the region page, keeping #region=… and the calendar's from, to and cal
const redirect = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${description}">
<title>Anchor Fire Audit</title>
<style>html, body { background: #0B0D0B; color: #ECE9E1; color-scheme: dark; }</style>
<script>
(() => {
  const from = new URLSearchParams(location.search)
  new URLSearchParams(location.hash.replace(/^#/, '')).forEach((v, k) => from.set(k, v))
  const keep = new URLSearchParams()
  for (const k of ['region', 'from', 'to', 'cal']) { const v = from.get(k); if (v) keep.set(k, v) }
  const h = keep.toString()
  location.replace('index.html' + (h ? '#' + h : ''))
})()
</script>
<noscript><meta http-equiv="refresh" content="0; url=index.html"></noscript>
</head>
<body><a href="index.html" style="color: inherit">Anchor Fire Audit</a></body>
</html>
`
// the simulator's direction, kept in its page so the build carries it
const simContract = `<!--
  Simulator. THESIS: a mission-control map, not a page; the Earth fills the screen, the instruments sit at its corners.
  OWN-WORLD: Anchor dark panels over NASA Blue Marble, bone text, Albert Sans, one colour per satellite, red-orange fire
  points, amber corner brackets on the studied regions. STORY: search a place; the globe turns, zooms and flattens into a
  map; studied regions show Aqua as it drifted beside its fixed clock, from the team's files; elsewhere, not studied yet.
  The map engine's worker is assets/maplibre-gl-worker.mjs, next to the app script.
-->`
const sim = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Anchor simulator: search a place on the globe to see what Aqua's drifting clock changes there. Team Propagators, NASA Space Apps Challenge 2026.">
<title>Anchor · Simulator</title>
${contract}
${simContract}
${head}
</head>
<body>
<div id="root" lang="en" data-page="sim"></div>
<script type="module" src="assets/app.js"></script>
</body>
</html>
`
writeFileSync(join(out, 'page.html'), regionPage)
writeFileSync(join(out, 'app.html'), redirect)
writeFileSync(join(out, 'sim.html'), sim)
console.log(`wrote page.html (${regionPage.length} B), app.html (a ${redirect.length} B redirect), sim.html (${sim.length} B), ${images.length} images and ${videos.length} video files to ${out}`)
