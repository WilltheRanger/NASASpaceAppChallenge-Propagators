"""Cloud factor C for Aqua/Terra: clear-sky fraction (GOES ACM) averaged over each
satellite's new vs old (2012-2020) daytime look-time distribution (FIRMS MODIS).

Inputs: out/goes_scan_counts.csv (from goes_clear.py), FIRMS modis_YYYY_Brazil.csv
Outputs: out/lookt_hist.csv, out/clear_vs_lst.csv, out/cloud_factor.csv, results.md
"""
import os, sys
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'out')
FIRMS = '/Users/himatthew/spaceapps/raw/firms_brazil'
BIOME = os.path.join(HERE, '..', 'brazil-data', 'out', 'biome_lookup_0p1deg.csv')
BIN = 0.25  # h
MONTHS = [7, 8, 9, 10]
NBOOT = 1000
rng = np.random.default_rng(42)


def firms_hist():
    p = os.path.join(OUT, 'lookt_hist.csv')
    if os.path.exists(p): return pd.read_csv(p)
    bl = pd.read_csv(BIOME, usecols=['cell_lat', 'cell_lon', 'biome'])
    bl = bl[bl.biome.isin(['amazon', 'cerrado'])]
    out = []
    for y in range(2012, 2026):
        d = pd.read_csv(os.path.join(FIRMS, f'modis_{y}_Brazil.csv'),
                        usecols=['latitude', 'longitude', 'acq_date', 'acq_time', 'satellite', 'daynight'])
        d = d[d.daynight == 'D']
        d['month'] = pd.to_datetime(d.acq_date).dt.month
        d = d[d.month.isin(MONTHS)]
        d['cell_lat'] = np.floor(d.latitude * 10).astype(int); d['cell_lon'] = np.floor(d.longitude * 10).astype(int)
        d = d.merge(bl, on=['cell_lat', 'cell_lon'])
        utc = d.acq_time // 100 + (d.acq_time % 100) / 60
        lst = (utc + d.longitude / 15) % 24
        d['lst_bin_h'] = np.floor(lst / BIN) * BIN
        g = d.groupby(['satellite', 'biome', 'lst_bin_h']).size().rename('n').reset_index()
        g['year'] = y; out.append(g)
        print('firms', y, len(d), 'max date', d.acq_date.max(), flush=True)
    h = pd.concat(out); h.to_csv(p, index=False); return h


def weights(h, sat, biome, years):
    w = h[(h.satellite == sat) & (h.biome == biome) & h.year.isin(years)].groupby('lst_bin_h').n.sum()
    return w / w.sum()


def wmedian_hhmm(w):
    c = w.sort_index().cumsum(); t = c.index[np.searchsorted(c.values, 0.5)] + BIN / 2
    return f'{int(t):02d}:{int(round((t % 1) * 60)):02d}'


def cfactor(clr, wn, wo):
    """clr: Series indexed by lst_bin_h. Only bins with GOES data are used (weights renormalised)."""
    idx = clr.dropna().index
    a, b = wn.reindex(idx).fillna(0), wo.reindex(idx).fillna(0)
    cov = (wn.reindex(idx).fillna(0).sum(), wo.reindex(idx).fillna(0).sum())
    return (a * clr[idx]).sum() / a.sum() / ((b * clr[idx]).sum() / b.sum()), cov


def interp_clear(clr, hhmm):
    t = int(hhmm[:2]) + int(hhmm[3:]) / 60
    x = clr.dropna().index.values + BIN / 2
    return float(np.interp(t, x, clr.dropna().values))


def main():
    h = firms_hist()
    g = pd.read_csv(os.path.join(OUT, 'goes_scan_counts.csv'))
    g['date'] = pd.to_datetime(g.date); g['year'] = g.date.dt.year; g['month'] = g.date.dt.month
    # per day x region x bin
    daily = g.groupby(['year', 'region', 'date', 'lst_bin_h'])[['n_valid', 'n_clear']].sum().reset_index()
    # keep bins with decent support: 08:30-16:00
    daily = daily[(daily.lst_bin_h >= 8.5) & (daily.lst_bin_h < 16.0)]
    nd = daily.groupby('year').date.nunique()
    keep = nd[nd >= 10].index  # drop partially extracted years
    print('days per year', nd.to_dict(), '-> using', list(keep))
    daily = daily[daily.year.isin(keep)]; g = g[g.year.isin(keep)]
    curves = []
    rows = []
    old = list(range(2012, 2021))
    for (yr, reg), d in daily.groupby(['year', 'region']):
        piv_v = d.pivot(index='date', columns='lst_bin_h', values='n_valid').fillna(0)
        piv_c = d.pivot(index='date', columns='lst_bin_h', values='n_clear').reindex_like(piv_v).fillna(0)
        clr = piv_c.sum() / piv_v.sum()
        ndays = len(piv_v)
        # bootstrap over days
        bidx = rng.integers(0, ndays, size=(NBOOT, ndays))
        V, Cc = piv_v.values, piv_c.values
        bclr = [pd.Series(Cc[i].sum(0) / np.where(V[i].sum(0) > 0, V[i].sum(0), np.nan), index=piv_v.columns) for i in bidx]
        for t, c in clr.items():
            bb = [s[t] for s in bclr]
            curves.append(dict(year=yr, region=reg, lst_bin_h=t, clear=c, lo=np.nanpercentile(bb, 2.5),
                               hi=np.nanpercentile(bb, 97.5), n_days=ndays))
        for sat in ['Aqua', 'Terra']:
            wo = weights(h, sat, reg, old); wn = weights(h, sat, reg, [yr])
            C, cov = cfactor(clr, wn, wo)
            bc = np.array([cfactor(s, wn, wo)[0] for s in bclr])
            rows.append(dict(year=yr, region=reg, satellite=sat, median_old=wmedian_hhmm(wo), median_new=wmedian_hhmm(wn),
                             clear_at_old=(wo.reindex(clr.index).fillna(0) * clr).sum() / wo.reindex(clr.index).fillna(0).sum(),
                             clear_at_new=(wn.reindex(clr.index).fillna(0) * clr).sum() / wn.reindex(clr.index).fillna(0).sum(),
                             C=C, C_lo=np.percentile(bc, 2.5), C_hi=np.percentile(bc, 97.5),
                             wcov_new=cov[0], wcov_old=cov[1], n_days=ndays, n_scans=g[(g.year == yr) & (g.region == reg)].scan_utc.nunique()))
    cv = pd.DataFrame(curves); cv.to_csv(os.path.join(OUT, 'clear_vs_lst.csv'), index=False)
    cf = pd.DataFrame(rows); cf.to_csv(os.path.join(OUT, 'cloud_factor.csv'), index=False)

    # point values at fixed look times
    pts = []
    for (yr, reg), d in cv.groupby(['year', 'region']):
        s = d.set_index('lst_bin_h').clear; lo = d.set_index('lst_bin_h').lo; hi = d.set_index('lst_bin_h').hi
        for t in ['09:12', '10:28', '13:37', '14:20', '14:57']:
            pts.append(dict(year=yr, region=reg, lst=t, clear=interp_clear(s, t), lo=interp_clear(lo, t), hi=interp_clear(hi, t)))
    pt = pd.DataFrame(pts); pt.to_csv(os.path.join(OUT, 'clear_at_times.csv'), index=False)

    pd.set_option('display.width', 200); pd.set_option('display.max_columns', 30)
    print(cf.round(3).to_string(index=False)); print(pt.round(3).to_string(index=False))

    L = ['# Cloud control: clear-sky fraction at old vs new MODIS look times', '',
         'Generated by `analyze.py` from `out/goes_scan_counts.csv` (GOES-East ABI L2 Clear Sky Mask) and FIRMS MODIS daytime detections. '
         'Jul–Oct of each year. C = mean clear fraction over the satellite\'s look-time distribution in that year / same over its 2012–2020 distribution '
         '(both evaluated on that year\'s GOES clear-sky curve). 95% intervals: bootstrap over sampled days (1000 resamples).', '',
         '## Cloud factor C', '',
         '| Year | Region | Satellite | Median LST old→new | Clear @ old | Clear @ new | C | 95% CI | GOES days / scans |',
         '|---|---|---|---|---|---|---|---|---|']
    for r in cf.sort_values(['satellite', 'region', 'year']).itertuples():
        L.append(f'| {r.year} | {r.region} | {r.satellite} | {r.median_old}→{r.median_new} | {r.clear_at_old:.3f} | {r.clear_at_new:.3f} | '
                 f'**{r.C:.3f}** | {r.C_lo:.3f}–{r.C_hi:.3f} | {r.n_days} / {r.n_scans} |')
    L += ['', 'Weight coverage (share of the look-time distribution falling in GOES-sampled 08:30–16:00 LST bins): min new '
          f'{cf.wcov_new.min():.3f}, min old {cf.wcov_old.min():.3f}.', '',
          '## Clear-sky fraction at fixed local solar times', '', '| Year | Region | LST | Clear fraction | 95% CI |', '|---|---|---|---|---|']
    for r in pt.itertuples():
        L.append(f'| {r.year} | {r.region} | {r.lst} | {r.clear:.3f} | {r.lo:.3f}–{r.hi:.3f} |')
    L += ['', '## Clear-sky fraction vs LST (hourly means of 15-min bins)', '']
    cv['hour'] = np.floor(cv.lst_bin_h)
    hp = cv.groupby(['year', 'region', 'hour']).clear.mean().unstack('hour').round(3)
    L += ['| Year | Region | ' + ' | '.join(f'{int(c):02d}h' for c in hp.columns) + ' |', '|---|---|' + '---|' * len(hp.columns)]
    for (yr, reg), r in hp.iterrows():
        L.append(f'| {yr} | {reg} | ' + ' | '.join(f'{v:.3f}' for v in r.values) + ' |')
    open(os.path.join(HERE, 'results.md'), 'w').write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
