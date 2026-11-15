// Assembles the comment pages for the shareable comment artifact from the D-only build (vite.artifact.config.ts): the landing
// as the main page (content only; the artifact adds the document skeleton) and the audit as app.html (a whole
// document), both loading the one script; CSS inlined; images copied as files.
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
]
mkdirSync(join(out, 'img', 'prints'), { recursive: true })
mkdirSync(join(out, 'img', 'regions'), { recursive: true })
for (const f of images) copyFileSync(join('public', 'img', f), join(out, 'img', f))
// the drone loops and their posters
const videos = ['br-amazon', 'in-punjab-haryana', 'us-california'].flatMap((r) => [`${r}.mp4`, `${r}-poster.jpg`])
mkdirSync(join(out, 'video', 'regions'), { recursive: true })
for (const f of videos) copyFileSync(join('public', 'video', 'regions', f), join(out, 'video', 'regions', f))

const contract = `<!--
  Anchor · Round 2 · D · Field film (Anduril-inspired at the team's request), as two pages. Team Propagators, NASA Space Apps 2026.
  THESIS: show the thing itself: each region's ground at full scale with its verdict on it; the audit beside it.
  OWN-WORLD: black, bone and sage; photographs carry the colour; motion follows Anduril's patterns, switchable.
  Every number on these pages is MOCK data from the team's JSON contract. Region photographs: Unsplash (credited in
  the footer); pass imagery: NASA Worldview / GIBS. 
-->`
const head = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500&display=swap">
<style>
${css}
:root { color-scheme: dark; }
html, body { background: #0B0D0B; color: #ECE9E1; }
</style>`

const landing = `<title>Anchor Field Film</title>
${contract}
${head}
<div id="root" data-page="landing"></div>
<script type="module" src="assets/app.js"></script>
`
const app = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Anchor audit: how much of an official satellite fire count comes from the satellite's drifting clock. Mock data.">
<title>Anchor · Audit</title>
${contract}
${head}
</head>
<body>
<div id="root" data-page="app"></div>
<script type="module" src="assets/app.js"></script>
</body>
</html>
`
writeFileSync(join(out, 'page.html'), landing)
writeFileSync(join(out, 'app.html'), app)
console.log(`wrote page.html (${landing.length} B), app.html (${app.length} B), ${images.length} images and ${videos.length} video files to ${out}`)
