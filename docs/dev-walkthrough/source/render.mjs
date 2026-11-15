// AI-generated (Claude Code) for Team Propagators' developer walkthrough video; see ../README.md (AI disclosure).
// Deterministic frame renderer: seeks the page to each frame time and screenshots it.
// Preview:  node render.mjs --times 3,15.5,60 --out preview
// Full:     node render.mjs --fps 30 --workers 4 --out frames
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const OUT = path.resolve(HERE, args.out || 'frames');
const FPS = Number(args.fps || 30);
const WORKERS = Number(args.workers || 4);
const SCALE = Number(args.scale || 1);
fs.mkdirSync(OUT, { recursive: true });

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SCALE });
  page.on('pageerror', e => console.error('PAGE ERROR', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console', m.type(), m.text()); });
  await page.goto(pathToFileURL(path.join(HERE, 'index.html')).href);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  return page;
}

async function warm(page, t) {
  // advance through earlier times in order so lazily-initialised tweens record the right start values
  for (let x = 0; x < t; x += 0.5) await page.evaluate(v => window.__seek(v), x);
}

const browser = await chromium.launch();
try {
  if (args.times) {
    const page = await openPage(browser);
    const times = args.times.split(',').map(Number).sort((a, b) => a - b);
    let last = 0;
    for (const t of times) {
      for (let x = last; x < t; x += 0.5) await page.evaluate(v => window.__seek(v), x);
      last = t;
      await page.evaluate(v => window.__seek(v), t);
      const f = path.join(OUT, `t_${t.toFixed(2).padStart(7, '0')}.png`);
      await page.screenshot({ path: f, type: 'png' });
      console.log('wrote', f);
    }
  } else {
    const total = await (async () => { const p = await openPage(browser); const v = await p.evaluate(() => window.__total); await p.close(); return v; })();
    const N = Math.ceil(total * FPS);
    const chunk = Math.ceil(N / WORKERS);
    const t0 = Date.now();
    let done = 0;
    await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
      const a = w * chunk, b = Math.min(N, a + chunk);
      if (a >= b) return;
      const page = await openPage(browser);
      await warm(page, a / FPS);
      for (let i = a; i < b; i++) {
        const f = path.join(OUT, `f_${String(i).padStart(5, '0')}.jpg`);
        await page.evaluate(v => window.__seek(v), i / FPS);
        await page.screenshot({ path: f, type: 'jpeg', quality: 95 });
        if (++done % 300 === 0) console.log(`${done}/${N} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      await page.close();
    }));
    console.log(`rendered ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
} finally {
  await browser.close();
}
