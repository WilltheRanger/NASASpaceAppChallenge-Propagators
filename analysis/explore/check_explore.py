"""Checks the Explore page against the files it reads. Run after `npm run build` with `npx vite preview --port 4173`.

Usage: python3 analysis/explore/check_explore.py [URL] [CHROME]
Reads : data/out/global/grid.json, data/out/sim/amazon-2024-09-02.json, and the built site at URL
Writes: analysis/explore/checks.json
Checks: E1 the world tally on the page equals the grid file, both years; E2 ten seeded squares (seed 20261114, five
readable and five too thin) show the grid file's numbers; E3 the one fire day shows pass end + delay, sunset minus that,
and the fires that pass saw, for all twelve choices; E4 no page says simulat*, helicopter, fleet, crew or made up; E5 no
page error on any page.
"""
import asyncio, json, os, random, re, sys
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
CHROME = sys.argv[2] if len(sys.argv) > 2 else '/usr/bin/google-chrome'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
grid = json.load(open(os.path.join(ROOT, 'data/out/global/grid.json')))
sim = json.load(open(os.path.join(ROOT, 'data/out/sim/amazon-2024-09-02.json')))
ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

def signed(v):  # the page's rounding: Math.round, minus as U+2212
    r = int((abs(v) + 0.5) // 1)
    return ('+' if v >= 0 else '−') + str(r)
pct = lambda L: signed((L - 1) * 100) + '%'
def hhmm(h):
    m = int(h * 60 + 0.5)
    return f'{m // 60:02d}:{m % 60:02d}'
def dur(h):
    m = int(h * 60 + 0.5)
    return f'{m // 60} h {m % 60:02d}' if m >= 60 else f'{m} min'
def rd(c, y):
    ok = (c['status'] if y == 2025 else c['status_2024']) == 'ok' and c[f'L_{y}'] is not None
    return ok, c[f'L_{y}'], c[f'L_{y}_lo'], c[f'L_{y}_hi'], c[f'outside_noise_{y}']

async def main():
    out = {'url': URL, 'checks': {}}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=ARGS)
        pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '?page=explore', wait_until='load'); await pg.wait_for_timeout(7000)
        # E1
        e1 = []
        for y in (2025, 2024):
            if y == 2024: await pg.get_by_text('2024', exact=True).first.click(force=True); await pg.wait_for_timeout(800)
            ok = up = down = 0
            for c in grid['cells']:
                o, L, lo, hi, outside = rd(c, y)
                if o:
                    ok += 1
                    if outside: up, down = (up + 1, down) if L > 1 else (up, down + 1)
            want = f'{ok:,} squares can be read; {up + down:,} are unusual ({up:,} above, {down:,} below).'
            got = await pg.get_by_text('squares can be read').inner_text()
            e1.append({'year': y, 'file': want, 'page': got, 'pass': want == got})
        out['checks']['E1_tally'] = {'pass': all(x['pass'] for x in e1), 'rows': e1}
        # E2
        rng = random.Random(20261114)
        readable = sorted(c['id'] for c in grid['cells'] if rd(c, 2025)[0]); thin = sorted(c['id'] for c in grid['cells'] if not rd(c, 2025)[0])
        picks = rng.sample(readable, 5) + rng.sample(thin, 5)
        by = {c['id']: c for c in grid['cells']}
        e2 = []
        for cid in picks:
            await pg.goto(URL + f'?page=explore&cell={cid}', wait_until='load'); await pg.wait_for_timeout(3500)
            text = await pg.locator('aside[aria-label="Place"]').inner_text()
            c = by[cid]; o, L, lo, hi, outside = rd(c, 2025)
            if o:
                want = [pct(L), f'How sure we are: {pct(lo)} to {pct(hi)}', 'unusual for this square' if outside else 'not unusual for this square', f"Aqua {c['n_aqua_2025']:,} · S-NPP {c['n_snpp_2025']:,}"]
            else:
                want = ['Too few fires to read in 2025', f"Aqua {c['n_aqua_2025']:,} · S-NPP {c['n_snpp_2025']:,}"]
            miss = [w for w in want if w not in text]
            if o and not outside and '· unusual for this square' in text: miss.append('says unusual')
            e2.append({'cell': cid, 'readable': o, 'expected': want, 'missing': miss, 'pass': not miss})
        out['checks']['E2_squares'] = {'pass': all(x['pass'] for x in e2), 'rows': e2}
        # E3
        await pg.goto(URL + '?page=explore', wait_until='load'); await pg.wait_for_timeout(6000)
        await pg.get_by_role('button', name='Play one fire day').click(); await pg.wait_for_timeout(5000)
        e3 = []
        panel = pg.locator('section[aria-labelledby="fireday-h"]')
        for src in ('Terra', 'S-NPP', 'NOAA-20', 'Aqua'):
            await panel.get_by_text(src, exact=True).first.click(force=True)
            for d, lab in ((0, 'None'), (1.5, '1.5 h'), (3, '3 h')):
                await panel.get_by_text(lab, exact=True).first.click(force=True); await pg.wait_for_timeout(1300)
                labels = await panel.locator('dl [aria-label], dl [role="img"]').evaluate_all('els => els.map(e => e.getAttribute("aria-label"))')
                text = ' | '.join(x for x in labels if x) + ' | ' + (await panel.locator('dl').inner_text())
                alert = sim['pass_end_lst'][src] + d
                seen = sum(1 for f in sim['fires'] if src in f['seen_by'])
                want = [f'Alert arrives: {hhmm(alert)}', f"Daylight left: {dur(sim['sunset_lst'] - alert)}", f'Fires this pass saw: {seen}', f"of {len(sim['fires'])}", hhmm(sim['sunset_lst'])]
                miss = [w for w in want if w not in text]
                e3.append({'alert_from': src, 'delay_h': d, 'expected': want, 'missing': miss, 'pass': not miss})
        out['checks']['E3_fire_day'] = {'pass': all(x['pass'] for x in e3), 'rows': e3}
        # E4, E5
        e4 = []
        for u in ('', '?page=regions&region=br-amazon', '?page=explore', '?page=explore&place=br-amazon', '?page=explore&cell=g2_-56_-12', '?page=method'):
            await pg.goto(URL + u, wait_until='load'); await pg.wait_for_timeout(4000)
            t = await pg.evaluate('document.body.innerText')
            bad = sorted(set(re.findall(r'(?i)simulat\w*|helicopter\w*|made[- ]up|fleet|ground crew\w*', t)))
            e4.append({'page': u or '/', 'found': bad, 'pass': not bad})
        out['checks']['E4_wording'] = {'pass': all(x['pass'] for x in e4), 'rows': e4}
        out['checks']['E5_no_page_errors'] = {'pass': not errs, 'errors': errs[:5]}
        await b.close()
    json.dump(out, open(os.path.join(ROOT, 'analysis/explore/checks.json'), 'w'), indent=1, ensure_ascii=False)
    for k, v in out['checks'].items(): print(k, 'PASS' if v['pass'] else 'FAIL', len(v.get('rows', [])))
    for k, v in out['checks'].items():
        for r in v.get('rows', []):
            if not r['pass']: print('  ', k, json.dumps(r, ensure_ascii=False)[:400])

asyncio.run(main())
