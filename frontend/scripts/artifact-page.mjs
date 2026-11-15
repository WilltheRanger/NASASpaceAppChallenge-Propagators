// Assembles the comment page for the claude.ai artifact from the D-only build (vite.artifact.config.ts):
// page content only (the artifact adds the document skeleton), CSS inlined, the script and the images as files.
// Usage: ARTIFACT_OUT=<dir> npm run artifact   (default dir: dist-artifact). Drafted with AI assistance (Claude).
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = process.env.ARTIFACT_OUT ?? 'dist-artifact'
const css = readFileSync(join(out, 'assets', 'artifact-d.css'), 'utf8')
const images = ['amazon-viirs-fires-2024-08-23.jpg', 'amazon-terra-2026-09-04.jpg', 'amazon-viirs-2026-09-04.jpg', 'amazon-aqua-2026-09-04.jpg',
  'prints/amazon-terra-sq.jpg', 'prints/amazon-viirs-sq.jpg', 'prints/amazon-aqua-sq.jpg']
mkdirSync(join(out, 'img', 'prints'), { recursive: true })
for (const f of images) copyFileSync(join('public', 'img', f), join(out, 'img', f))

const page = `<title>Anchor Field Film</title>
<!--
  Anchor · Round 2 · D · Field film (Anduril-inspired at the team's request). Team Propagators, NASA Space Apps 2026.
  THESIS: show the thing itself: the burning forest from orbit, full bleed, with the verdict set on it like a label on equipment.
  OWN-WORLD: black, bone and sage; real NASA imagery at full scale; small labels set on images; no glow.
  Every number on this page is MOCK data from the team's JSON contract; the photographs are real NASA Worldview / GIBS imagery.
  Designed and coded with AI assistance (Claude).
-->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500&display=swap">
<style>
${css}
:root { color-scheme: dark; }
html, body { background: #0B0D0B; color: #ECE9E1; }
</style>
<div id="root"></div>
<script type="module" src="assets/app.js"></script>
`
writeFileSync(join(out, 'page.html'), page)
console.log(`wrote ${join(out, 'page.html')} (${page.length} bytes) and ${images.length} images`)
