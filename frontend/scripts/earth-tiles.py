"""Sharper Earth imagery for the Explore map where the page can't reach a tile server (the comment page).

Usage: python3 frontend/scripts/earth-tiles.py <cache-dir>
Source : NASA GIBS, Blue Marble Shaded Relief and Bathymetry (public domain), web-mercator tiles
         https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg
Inputs : frontend/src/r2/earth/fires-day.json (where the day's fire dots are)
Output : frontend/public/img/earth/tiles/w-{x}-{y}.webp   the whole world at zoom 7 (about 1.2 km a pixel), as 256
                                                          pictures of 2048 px (each is 8 x 8 tiles; x, y on the zoom-4 grid)
         frontend/public/img/earth/tiles/f-{x}-{y}.webp   zoom 8 (about 600 m a pixel) over every zoom-5 square that
                                                          holds one of the day's dots, one 2048 px picture each
         frontend/src/r2/earth/tiles.json                 which pictures exist
The downloaded tiles are kept in <cache-dir> (outside the repository) so a rerun fetches nothing twice.
"""
import collections, io, json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.abspath(sys.argv[1])
OUT = os.path.join(HERE, '..', 'public', 'img', 'earth', 'tiles')
URL = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'
WORLD_Z, FIRE_Z, SHARE, QUALITY = 7, 8, 1.0, 72
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
for old in os.listdir(OUT):
    if old.endswith('.webp'): os.remove(os.path.join(OUT, old))


def cell(lon, lat, z):
    """the web-mercator tile holding a point"""
    s = math.sin(math.radians(max(-85.0, min(85.0, lat))))
    return int((lon + 180) / 360 * 2 ** z) % 2 ** z, min(2 ** z - 1, max(0, int((0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * 2 ** z)))


def fetch(job):
    z, x, y = job
    path = os.path.join(CACHE, f'{z}-{x}-{y}.jpeg')
    if os.path.exists(path) and os.path.getsize(path) > 0: return
    for attempt in range(4):
        try:
            req = urllib.request.Request(URL.format(z=z, x=x, y=y), headers={'User-Agent': 'earth-tiles/1.0'})
            with urllib.request.urlopen(req, timeout=30) as r: data = r.read()
            Image.open(io.BytesIO(data)).verify()   # a real picture, or it is fetched again
            with open(path, 'wb') as f: f.write(data)
            return
        except Exception as e:
            if attempt == 3: raise RuntimeError(f'{z}/{x}/{y}: {e}')
            time.sleep(1.5 * (attempt + 1))


def stitch(z, gx, gy, name):
    """8 x 8 tiles of zoom z, whose top-left tile is (gx * 8, gy * 8), as one 2048 px picture"""
    big = Image.new('RGB', (2048, 2048))
    for i in range(8):
        for j in range(8):
            with Image.open(os.path.join(CACHE, f'{z}-{gx * 8 + i}-{gy * 8 + j}.jpeg')) as t:
                big.paste(t.convert('RGB'), (i * 256, j * 256))
    path = os.path.join(OUT, name)
    big.save(path, 'WEBP', quality=QUALITY, method=4)
    return os.path.getsize(path)


day = json.load(open(os.path.join(HERE, '..', 'src', 'r2', 'earth', 'fires-day.json')))
pts = day['pts']
n = len(pts) // 5
count = collections.Counter(cell(pts[i * 5] / 100, pts[i * 5 + 1] / 100, FIRE_Z - 3) for i in range(n))
fire, got = [], 0
for key, c in count.most_common():
    if got >= SHARE * n and SHARE < 1: break
    fire.append(key); got += c
world = [(x, y) for x in range(2 ** (WORLD_Z - 3)) for y in range(2 ** (WORLD_Z - 3))]

jobs = [(WORLD_Z, gx * 8 + i, gy * 8 + j) for gx, gy in world for i in range(8) for j in range(8)]
jobs += [(FIRE_Z, gx * 8 + i, gy * 8 + j) for gx, gy in fire for i in range(8) for j in range(8)]
print(f'{len(world)} world pictures, {len(fire)} fire pictures holding {got} of {n} dots; {len(jobs)} tiles to have', flush=True)
with ThreadPoolExecutor(16) as pool:
    for k, _ in enumerate(pool.map(fetch, jobs)):
        if k % 2000 == 0: print(f'  tile {k} of {len(jobs)}', flush=True)

size = 0
for gx, gy in world: size += stitch(WORLD_Z, gx, gy, f'w-{gx}-{gy}.webp')
for gx, gy in fire: size += stitch(FIRE_Z, gx, gy, f'f-{gx}-{gy}.webp')
manifest = {
    'source': 'NASA GIBS, Blue Marble Shaded Relief and Bathymetry, web-mercator tiles stitched 8 x 8 into 2048 px pictures',
    'world': {'z': WORLD_Z, 'grid': WORLD_Z - 3},
    'fire': {'z': FIRE_Z, 'grid': FIRE_Z - 3, 'cells': sorted(f'{x}-{y}' for x, y in fire), 'dots': got, 'of': n},
}
json.dump(manifest, open(os.path.join(HERE, '..', 'src', 'r2', 'earth', 'tiles.json'), 'w'), separators=(',', ':'))
print(f'wrote {len(world) + len(fire)} pictures, {size / 1e6:.1f} MB')
