"""Clear-sky fraction vs local solar time over Brazilian Amazon / Cerrado from
GOES-East ABI L2 Clear Sky Mask (ABI-L2-ACMF, full disk), streamed from NOAA's
public AWS buckets with HTTP range requests (only the BCM chunks covering
Brazil are fetched; nothing is stored on disk).

Output: per-scan counts of valid and clear pixels per region and 15-min LST bin
  -> out/goes_scan_counts.csv  (appended, resumable)

Usage: python goes_clear.py YEAR [YEAR ...] [--step 5] [--every 30]
"""
import io, os, re, sys, zlib, time, argparse, datetime as dt
import concurrent.futures as cf
import numpy as np, pandas as pd, h5py, requests

HERE = os.path.dirname(os.path.abspath(__file__))
BIOME = os.path.join(HERE, '..', 'brazil-data', 'out', 'biome_lookup_0p1deg.csv')
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
OUTCSV = os.path.join(OUT, 'goes_scan_counts.csv')
SUB = 4            # keep every 4th pixel (2 km -> 8 km)
CH = 226           # chunk size of BCM
NPIX = 5424
REGIONS = {'amazon': 1, 'cerrado': 2}
LST_BIN_MIN = 15
S = requests.Session()
S.mount('https://', requests.adapters.HTTPAdapter(pool_connections=64, pool_maxsize=64, max_retries=3))


def bucket_for(date):
    return 'noaa-goes16' if date <= dt.date(2025, 4, 6) else 'noaa-goes19'


def list_hour(bucket, year, doy, hour):
    url = f'https://{bucket}.s3.amazonaws.com/?list-type=2&prefix=ABI-L2-ACMF/{year}/{doy:03d}/{hour:02d}/'
    t = S.get(url, timeout=30).text
    return [(k, int(s)) for k, s in re.findall(r'<Key>(.*?)</Key>.*?<Size>(\d+)</Size>', t)]


class RangeFile(io.RawIOBase):
    """Read-only file-like over HTTP with a block cache (for HDF5 metadata)."""
    BS = 256 * 1024

    def __init__(self, url, size):
        self.url, self.size, self.pos, self.cache, self.nreq = url, size, 0, {}, 0

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else (self.pos + off if whence == 1 else self.size + off)
        return self.pos

    def _block(self, b):
        if b not in self.cache:
            lo = b * self.BS; hi = min(self.size, lo + self.BS) - 1
            r = S.get(self.url, headers={'Range': f'bytes={lo}-{hi}'}, timeout=60); r.raise_for_status()
            self.cache[b] = r.content; self.nreq += 1
        return self.cache[b]

    def readinto(self, buf):
        n = min(len(buf), self.size - self.pos)
        if n <= 0: return 0
        out = bytearray(); p = self.pos
        while len(out) < n:
            b = p // self.BS; blk = self._block(b); o = p - b * self.BS
            take = blk[o:o + n - len(out)]; out += take; p += len(take)
        buf[:n] = out; self.pos += n
        return n


def fixed_grid_latlon(x, y, proj):
    """GOES-R PUG Vol.4 sec 4.2.8.1: fixed grid (rad) -> geodetic lat/lon (deg)."""
    req = proj['semi_major_axis']; rpol = proj['semi_minor_axis']
    H = proj['perspective_point_height'] + req; lon0 = np.deg2rad(proj['longitude_of_projection_origin'])
    X, Y = np.meshgrid(x, y)
    a = np.sin(X)**2 + np.cos(X)**2 * (np.cos(Y)**2 + (req**2 / rpol**2) * np.sin(Y)**2)
    b = -2 * H * np.cos(X) * np.cos(Y); c = H**2 - req**2
    disc = b**2 - 4 * a * c
    with np.errstate(invalid='ignore'):
        rs = (-b - np.sqrt(disc)) / (2 * a)
        sx = rs * np.cos(X) * np.cos(Y); sy = -rs * np.sin(X); sz = rs * np.cos(X) * np.sin(Y)
        lat = np.degrees(np.arctan((req**2 / rpol**2) * sz / np.sqrt((H - sx)**2 + sy**2)))
        lon = np.degrees(lon0 - np.arctan(sy / (H - sx)))
    lat[disc < 0] = np.nan; lon[disc < 0] = np.nan
    return lat, lon


_GEO = {}


def geometry(f):
    """Region id per subsampled pixel; chunks needed. Cached per projection."""
    p = f['goes_imager_projection'].attrs
    proj = {k: float(np.asarray(p[k]).ravel()[0]) for k in
            ['semi_major_axis', 'semi_minor_axis', 'perspective_point_height', 'longitude_of_projection_origin']}
    xs = f['x']; ys = f['y']
    x = xs[:].astype(float) * float(xs.attrs['scale_factor'][0]) + float(xs.attrs['add_offset'][0])
    y = ys[:].astype(float) * float(ys.attrs['scale_factor'][0]) + float(ys.attrs['add_offset'][0])
    key = (proj['longitude_of_projection_origin'], round(x[0], 6), round(y[0], 6))
    if key in _GEO: return _GEO[key]
    ix = np.arange(SUB // 2, NPIX, SUB); iy = np.arange(SUB // 2, NPIX, SUB)
    lat, lon = fixed_grid_latlon(x[ix], y[iy], proj)
    bl = pd.read_csv(BIOME, usecols=['cell_lat', 'cell_lon', 'biome'])
    bl = bl[bl.biome.isin(REGIONS)]
    lut = {(a, b): REGIONS[c] for a, b, c in zip(bl.cell_lat, bl.cell_lon, bl.biome)}
    ok = np.isfinite(lat) & (lat > -35) & (lat < 6) & (lon > -75) & (lon < -33)
    reg = np.zeros(lat.shape, np.int8)
    cl = np.floor(lat[ok] * 10).astype(int); cn = np.floor(lon[ok] * 10).astype(int)
    reg[ok] = [lut.get((a, b), 0) for a, b in zip(cl, cn)]
    # chunks touched
    rr, cc = np.nonzero(reg)
    chunks = sorted(set(zip((iy[rr] // CH).tolist(), (ix[cc] // CH).tolist())))
    _GEO[key] = dict(reg=reg, ix=ix, iy=iy, lon=lon, chunks=chunks)
    print(f'geometry {key}: {len(rr)} region pixels, {len(chunks)} chunks', flush=True)
    return _GEO[key]


def fetch(url, off, size):
    r = S.get(url, headers={'Range': f'bytes={off}-{off + size - 1}'}, timeout=60); r.raise_for_status()
    return r.content


def process(bucket, key, size, pool):
    url = f'https://{bucket}.s3.amazonaws.com/{key}'
    m = re.search(r'_s(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})', key)
    yr, doy, hh, mi, ss = map(int, m.groups()); m0 = 's' + ''.join(m.groups())
    t0 = dt.datetime(yr, 1, 1) + dt.timedelta(days=doy - 1, hours=hh, minutes=mi, seconds=ss)
    rf = RangeFile(url, size)
    with h5py.File(io.BufferedReader(rf, buffer_size=RangeFile.BS), 'r') as f:
        g = geometry(f)
        d = f['BCM']
        if d.compression != 'gzip' or d.chunks != (CH, CH): raise RuntimeError('unexpected layout')
        infos = {}
        for (cr, ccol) in g['chunks']:
            ci = d.id.get_chunk_info_by_coord((cr * CH, ccol * CH))
            if ci.byte_offset is not None and ci.size: infos[(cr, ccol)] = (ci.byte_offset, ci.size)
    raws = dict(zip(infos, pool.map(lambda v: fetch(url, *v), infos.values())))
    full = np.full((NPIX, NPIX), 255, np.uint8)  # only chunks we need get filled
    for (cr, ccol), raw in raws.items():
        a = np.frombuffer(zlib.decompress(raw), np.uint8).reshape(CH, CH)  # shuffle is identity for uint8
        full[cr * CH:(cr + 1) * CH, ccol * CH:(ccol + 1) * CH] = a
    bcm = full[np.ix_(g['iy'], g['ix'])]
    reg = g['reg']
    # approx scan time per row: full disk M6 swept N->S over ~9.5 min
    trow = t0 + pd.to_timedelta(9.5 * g['iy'] / NPIX, unit='min')
    utc_h = (trow.hour + trow.minute / 60 + trow.second / 3600).values
    rows = []
    for name, rid in REGIONS.items():
        rr, cc = np.nonzero(reg == rid)
        v = bcm[rr, cc]; good = v <= 1
        lst = (utc_h[rr] + g['lon'][rr, cc] / 15.0) % 24
        b = np.floor(lst * 60 / LST_BIN_MIN).astype(int)
        nv = np.bincount(b[good], minlength=96); nc = np.bincount(b[good], weights=(v[good] == 0), minlength=96)
        for k in np.nonzero(nv)[0]:
            rows.append((m0, t0.date().isoformat(), name, k * LST_BIN_MIN / 60, int(nv[k]), int(nc[k])))
    return rows, rf.nreq + len(raws)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('years', type=int, nargs='+')
    ap.add_argument('--step', type=int, default=5)
    ap.add_argument('--every', type=int, default=30, help='minutes between scans')
    ap.add_argument('--utc0', type=float, default=11.0); ap.add_argument('--utc1', type=float, default=21.0)
    ap.add_argument('--workers', type=int, default=6)
    a = ap.parse_args()
    done = set()
    if os.path.exists(OUTCSV):
        done = set(pd.read_csv(OUTCSV, usecols=['scan_utc']).scan_utc)
    else:
        with open(OUTCSV, 'w') as fh: fh.write('scan_utc,date,region,lst_bin_h,n_valid,n_clear\n')
    jobs_csv = os.path.join(OUT, 'jobs_' + '_'.join(map(str, a.years)) + f'_s{a.step}_e{a.every}.csv')
    if os.path.exists(jobs_csv):
        jobs = list(pd.read_csv(jobs_csv).itertuples(index=False, name=None))
    else:
        req = []
        for y in a.years:
            d = dt.date(y, 7, 1)
            while d <= dt.date(y, 10, 31):
                for hh in range(int(a.utc0), int(np.ceil(a.utc1))):
                    req.append((bucket_for(d), y, d.timetuple().tm_yday, hh))
                d += dt.timedelta(days=a.step)
        with cf.ThreadPoolExecutor(32) as lx:
            lists = list(lx.map(lambda r: (r[0], list_hour(*r)), req))
        jobs = []
        for bk, lst in lists:
            for k, s in lst:
                m = re.search(r'_s\d{7}(\d{2})(\d{2})', k); mm = int(m.group(2))
                tm = int(m.group(1)) + mm / 60
                if a.utc0 <= tm < a.utc1 and mm % a.every < 10:
                    jobs.append((bk, k, s))
        pd.DataFrame(jobs, columns=['bucket', 'key', 'size']).to_csv(jobs_csv, index=False)
    print(f'{len(jobs)} scans listed', flush=True)
    t = time.time(); n = 0
    todo = [j for j in jobs if 's' + re.search(r'_s(\d{13})', j[1]).group(1) not in done]
    # h5py serialises all calls inside one process, so parallelise across processes
    with cf.ProcessPoolExecutor(a.workers) as ex:
        for res in ex.map(one, todo, chunksize=1):
            n += 1
            if res:
                with open(OUTCSV, 'a') as fh:
                    for r in res[0]: fh.write(','.join(map(str, r)) + '\n')
            if n % 20 == 0:
                print(f'{n}/{len(todo)} done, {(time.time() - t) / n:.2f}s/scan', flush=True)


_POOL = None


def one(j):
    global _POOL
    if _POOL is None: _POOL = cf.ThreadPoolExecutor(24)
    try:
        return process(j[0], j[1], j[2], _POOL)
    except Exception as e:
        print('FAIL', j[1], repr(e), flush=True); return None


if __name__ == '__main__':
    main()
