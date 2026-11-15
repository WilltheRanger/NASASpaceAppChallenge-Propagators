// Assembles the comment pages for the shareable comment artifact from the D-only build (vite.artifact.config.ts). Four
// pages load the one script, each naming itself in its root's data-page: the overview as the main page, page.html
// (content only; the artifact adds the document skeleton and serves it as index.html), and the Regions page, the
// Simulator and the Method page as whole documents (regions.html, sim.html, method.html). CSS is inlined; images and
// videos are copied as files. app.html, the audit page's old address, is a small redirect to regions.html that keeps
// the region and the calendar's keys from its hash.
// Usage: ARTIFACT_OUT=<dir> npm run artifact   (default dir: dist-artifact).
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = process.env.ARTIFACT_OUT ?? 'dist-artifact'
const css = readFileSync(join(out, 'assets', 'artifact-d.css'), 'utf8')
const regions = ['br-amazon', 'br-cerrado', 'br-pantanal', 'ar-argentina', 'in-punjab-haryana', 'us-california']
const images = [
  // one Amazon day seen three times (Method), wide and square
  'amazon-terra-2026-09-04.jpg', 'amazon-viirs-2026-09-04.jpg', 'amazon-aqua-2026-09-04.jpg',
  'prints/amazon-terra-sq.jpg', 'prints/amazon-viirs-sq.jpg', 'prints/amazon-aqua-sq.jpg',
  // the overview's opening photograph, three widths
  'overview/smoke-960.jpg', 'overview/smoke-1600.jpg', 'overview/smoke-2400.jpg',
  // each place's photograph (the overview's rows)
  ...regions.map((r) => `regions/${r}-sm.jpg`),
  // the one fire day's image, under the daylight map
  'daylight/br-amazon-2024-09-02.jpg',
  // the simulator's map of each studied region, and its globe (NASA Blue Marble, web mercator)
  ...regions.flatMap((r) => [`sim/${r}.webp`, `sim/${r}-context.jpg`]),
  'earth/bluemarble-4096.jpg',
]
for (const dir of ['overview', 'prints', 'regions', 'daylight', 'sim', 'earth']) mkdirSync(join(out, 'img', dir), { recursive: true })
for (const f of images) copyFileSync(join('public', 'img', f), join(out, 'img', f))
// the drone loops and their posters (the Regions page)
const videos = regions.flatMap((r) => [`${r}.mp4`, `${r}-poster.jpg`])
mkdirSync(join(out, 'video', 'regions'), { recursive: true })
for (const f of videos) copyFileSync(join('public', 'video', 'regions', f), join(out, 'video', 'regions', f))

const contract = `<!--
  Anchor: satellite fire counts on a fixed clock. Team Propagators. A NASA Space Apps Challenge 2026 team project, not an
  official NASA product. Four pages: the overview (this page), the Regions page (regions.html), the Explore page (sim.html)
  and the Method page (method.html). Every number comes from the team's JSON files (data/out). Drone footage and photographs
  are credited in the footer; pass and map imagery: NASA Worldview / GIBS.
-->`
const head = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500&display=swap">
<style>
${css}
:root { color-scheme: dark; }
html, body { background: #0B0D0B; color: #ECE9E1; }
</style>`

const description = "Aqua, the satellite behind Brazil's official fire count, now looks later in the day. Anchor compares its count with what we'd expect at its old time, in six places. Team Propagators, NASA Space Apps Challenge 2026."
const overview = `<title>Anchor Fire Audit</title>
<meta name="description" content="${description}">
${contract}
${head}
<div id="root" lang="en" data-page="overview"></div>
<script type="module" src="assets/app.js"></script>
`
/** A whole document for one of the other pages. */
const page = (name, title, about, extra = '') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${about}">
<title>${title}</title>
${contract}
${extra}
${head}
</head>
<body>
<div id="root" lang="en" data-page="${name}"></div>
<script type="module" src="assets/app.js"></script>
</body>
</html>
`
const regionsPage = page('regions', 'Anchor · Regions', "One place at a time: Aqua's count against what we'd expect, when each satellite looked, year by year, and the monthly calendar. Team Propagators, NASA Space Apps Challenge 2026.")
const methodPage = page('method', 'Anchor · Method', 'How Anchor compares Aqua with what we would expect, the ten checks, the California real-fires test, the match with INPE, the limits and the sources. Team Propagators, NASA Space Apps Challenge 2026.')
// the simulator's direction, kept in its page so the build carries it
const simContract = `<!--
  Explore. A map of the past day's fires: click any fire to see which satellites saw that spot, and when. The map
  engine's worker is assets/maplibre-gl-worker.mjs, next to the app script.
-->`
const sim = page('sim', 'Anchor · Explore', "Anchor Explore: click any fire to see which satellites saw it and when; try Aqua's old and new times. Team Propagators, NASA Space Apps Challenge 2026.", simContract)
// the old audit address: forward to the Regions page, keeping #region=… and the calendar's from, to and cal
const redirect = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${description}">
<title>Anchor · Regions</title>
<style>html, body { background: #0B0D0B; color: #ECE9E1; color-scheme: dark; }</style>
<script>
(() => {
  const from = new URLSearchParams(location.search)
  new URLSearchParams(location.hash.replace(/^#/, '')).forEach((v, k) => from.set(k, v))
  const keep = new URLSearchParams()
  for (const k of ['region', 'from', 'to', 'cal']) { const v = from.get(k); if (v) keep.set(k, v) }
  const h = keep.toString()
  location.replace('regions.html' + (h ? '#' + h : ''))
})()
</script>
<noscript><meta http-equiv="refresh" content="0; url=regions.html"></noscript>
</head>
<body><a href="regions.html" style="color: inherit">Anchor · Regions</a></body>
</html>
`
writeFileSync(join(out, 'page.html'), overview)
writeFileSync(join(out, 'regions.html'), regionsPage)
writeFileSync(join(out, 'method.html'), methodPage)
writeFileSync(join(out, 'sim.html'), sim)
writeFileSync(join(out, 'app.html'), redirect)
console.log(`wrote page.html (the overview, ${overview.length} B), regions.html (${regionsPage.length} B), method.html (${methodPage.length} B), sim.html (${sim.length} B), app.html (a ${redirect.length} B redirect), ${images.length} images and ${videos.length} video files to ${out}`)
