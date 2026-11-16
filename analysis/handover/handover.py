"""Hand the clock audit's fixed clock over from S-NPP to NOAA-20.

New S-NPP data stopped on 2 November 2026, and S-NPP is the fixed clock that L is measured against. NOAA-20 carries the
same VIIRS instrument in the same ~13:30 orbit, and the two overlap from April 2018 to 2026. The handover chains the
audit's 2012-2020 baseline through that overlap, so nothing about the baseline changes:

    R_m  = Aqua / S-NPP over 2012-2020, calendar month m          (the audit's exchange rate, unchanged)
    k_m  = S-NPP / NOAA-20 over the overlap, calendar month m      (the handover rate)
    fixed-clock count, year y = sum_m  NOAA-20_{m,y} x k_m x R_m
    L_N20,y = Aqua_y / fixed-clock count

Three checks decide whether NOAA-20 can carry the audit:
  1. k is stable: the S-NPP / NOAA-20 ratio, scored year by year against k, stays near 1 in every overlap year.
  2. Out of sample: with k fitted on 2018-2020 only, L_N20 for 2021-2025 matches the published S-NPP L.
     Paired on the same days, the difference L_N20 - L_SNPP and its 95% interval should include 0.
  3. The handover changes no conclusion: each 2024-2025 year's verdict (inside/outside the nine-year placebo range)
     is the same with either clock.

Days, counts and intervals follow analysis/statistics/audit.py: count_all (every daytime detection); a satellite is
down on a day with no daytime detection anywhere in Brazil; 16-day block Poisson bootstrap, 1000 replicates,
seed 20261114.

2026: pass --extra with daily counts in the same columns (date, biome, satellite, count_all; Aqua and NOAA-20) and
L_N20 is computed for 2026 with k from the full 2018-2025 overlap. A full 2026 needs the FIRMS area API with a
MAP_KEY (pipeline/download_recent.py --mode api). The rolling 7-day feeds cover only a week.

Usage: python3 analysis/handover/handover.py [--extra daily_2026.csv]
"""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "analysis" / "handover" / "out"
NB, SEED, BLOCK = 1000, 20261114, 16
BASE = list(range(2012, 2021))
CAL_OOS = [2018, 2019, 2020]           # k fitted here for the out-of-sample check
CAL_FULL = list(range(2018, 2026))     # k fitted here for production
REGIONS = {"br-amazon": "amazon", "br-cerrado": "cerrado", "br-pantanal": "pantanal",
           "ar-argentina": "argentina", "in-punjab-haryana": "punjab_haryana", "us-california": "california"}


def load(extra):
    brazil = pd.read_csv(ROOT / "analysis/brazil-data/out/firms_daily_by_biome.csv")
    other = pd.read_csv(ROOT / "analysis/statistics/out/regions_daily.csv")
    d = pd.concat([brazil, other])
    if extra:
        d = pd.concat([d, pd.read_csv(extra)])
        brazil = pd.concat([brazil, pd.read_csv(extra)])
    return d, brazil


def main(extra=None):
    d, brazil = load(extra)
    last = d.date.max()
    dates = pd.date_range("2012-01-01", max("2025-12-31", last)).strftime("%Y-%m-%d")
    years = sorted(set(int(x[:4]) for x in dates))
    yr = dates.str[:4].astype(int).values
    mo = dates.str[5:7].astype(int).values - 1
    ny = len(years)
    # Brazil-wide availability, as in audit.py
    up = brazil[brazil.date >= "2012-01-01"].groupby(["date", "satellite"]).count_all.sum().unstack().reindex(dates).notna()
    for s in ["Aqua", "S-NPP", "NOAA-20"]:
        if s not in up:
            up[s] = False
    M_AS = (up["Aqua"] & up["S-NPP"]).values
    M_SN = (up["S-NPP"] & up["NOAA-20"]).values
    M_AN = (up["Aqua"] & up["NOAA-20"]).values
    M_ASN = M_AS & up["NOAA-20"].values

    rng = np.random.default_rng(SEED)
    blk = np.arange(len(dates)) // BLOCK
    W = np.vstack([np.ones(len(dates)), rng.poisson(1.0, (NB, blk[-1] + 1))[:, blk]]).astype(np.float32)
    YM = np.zeros((len(dates), ny * 12), np.float32)
    YM[np.arange(len(dates)), (yr - years[0]) * 12 + mo] = 1

    def ymsum(x, mask):
        return (W @ (YM * (x * mask)[:, None])).reshape(-1, ny, 12)

    def iy(ys):
        return [y - years[0] for y in ys]

    def rate(num, den, ys):
        """Calendar-month ratio num/den summed over years ys; empty months fall back to the pooled ratio."""
        n, dd = num[:, iy(ys)].sum(1), den[:, iy(ys)].sum(1)
        pooled = (n.sum(1) / np.maximum(dd.sum(1), 1e-9))[:, None]
        return np.where(dd > 0, n / np.where(dd > 0, dd, 1), pooled)

    def ci(x):
        lo, hi = np.nanpercentile(x[1:], [2.5, 97.5])
        return float(lo), float(hi)

    audit_rows, stab_rows, summ = [], [], {}
    for rid, key in REGIONS.items():
        r = d[(d.biome == key) & (d.date >= "2012-01-01")]
        c = r.groupby(["date", "satellite"]).count_all.sum().unstack().reindex(dates).fillna(0)
        for s in ["Aqua", "S-NPP", "NOAA-20"]:
            if s not in c:
                c[s] = 0.0
        A, S, N = c["Aqua"].values, c["S-NPP"].values, c["NOAA-20"].values

        # the audit's exchange rate R_m, 2012-2020, Aqua & S-NPP days
        R = rate(ymsum(A, M_AS), ymsum(S, M_AS), BASE)

        # 1. stability of S-NPP / NOAA-20 (k from the full overlap)
        Ssn, Nsn = ymsum(S, M_SN), ymsum(N, M_SN)
        k_full = rate(Ssn, Nsn, CAL_FULL)
        for y in CAL_FULL:
            t = y - years[0]
            ratio = Ssn[:, t].sum(1) / np.maximum((Nsn[:, t] * k_full).sum(1), 1e-9)
            stab_rows.append(dict(region=rid, year=y, snpp_over_noaa20_vs_k=float(ratio[0]),
                                  lo=ci(ratio)[0], hi=ci(ratio)[1], snpp=float(Ssn[0, t].sum()), noaa20=float(Nsn[0, t].sum())))

        # 2. out of sample: k from 2018-2020, compare on days all three returned data
        k_oos = rate(Ssn, Nsn, CAL_OOS)
        A3, S3, N3 = ymsum(A, M_ASN), ymsum(S, M_ASN), ymsum(N, M_ASN)
        # production: k from the full overlap, Aqua & NOAA-20 days (S-NPP not needed)
        A2, N2 = ymsum(A, M_AN), ymsum(N, M_AN)
        A1, S1 = ymsum(A, M_AS), ymsum(S, M_AS)
        pub = {y["year"]: y for y in json.load(open(ROOT / f"data/out/audit/{rid}.json"))["years"]}
        for y in [yy for yy in years if yy >= 2021]:
            t = y - years[0]
            row = dict(region=rid, year=y)
            if S1[0, t].sum() > 0:
                l_s = A1[:, t].sum(1) / (S1[:, t] * R).sum(1)                         # published L (S-NPP clock)
                row.update(L_snpp=float(l_s[0]), L_snpp_lo=ci(l_s)[0], L_snpp_hi=ci(l_s)[1])
            if S3[0, t].sum() > 0 and N3[0, t].sum() > 0:
                l_s3 = A3[:, t].sum(1) / (S3[:, t] * R).sum(1)
                l_n3 = A3[:, t].sum(1) / (N3[:, t] * k_oos * R).sum(1)
                diff = l_n3 - l_s3
                row.update(L_noaa20_oos=float(l_n3[0]), oos_diff=float(diff[0]), oos_diff_lo=ci(diff)[0], oos_diff_hi=ci(diff)[1])
            if N2[0, t].sum() > 0:
                l_n = A2[:, t].sum(1) / (N2[:, t] * k_full * R).sum(1)
                row.update(L_noaa20=float(l_n[0]), L_noaa20_lo=ci(l_n)[0], L_noaa20_hi=ci(l_n)[1],
                           fixed_count_noaa20=float((N2[0, t] * k_full[0] * R[0]).sum()), aqua_count=float(A2[0, t].sum()))
            p = pub.get(y, {})
            row["published_L"] = p.get("L")
            row["published_status"] = p.get("status")
            row["published_outside_noise"] = p.get("outside_noise")
            audit_rows.append(row)
        # placebo range from the published audit (nine 2012-2020 years scored leave-one-out)
        aud = json.load(open(ROOT / f"data/out/audit/{rid}.json"))
        pl = [v["L"] for v in aud["baseline"].get("placebo_years", []) if isinstance(v, dict) and v.get("L") is not None]
        summ[rid] = dict(placebo_min=min(pl) if pl else None, placebo_max=max(pl) if pl else None)

    OUT.mkdir(parents=True, exist_ok=True)
    au = pd.DataFrame(audit_rows)
    st = pd.DataFrame(stab_rows)
    au.round(4).to_csv(OUT / "handover_audit.csv", index=False)
    st.round(4).to_csv(OUT / "handover_stability.csv", index=False)

    # verdicts with each clock: outside the nine placebo years' range?
    def outside(l, rid, ok=True):
        lo, hi = summ[rid]["placebo_min"], summ[rid]["placebo_max"]
        if not ok or l is None or lo is None or np.isnan(l):
            return None  # the audit's "too few fires" years get no verdict
        return bool(l < lo or l > hi)

    # audit.py's rule: expected Aqua count < 300, or 95% half-width > 25% of L, is insufficient data
    ok_n20 = (au.fixed_count_noaa20 >= 300) & ((au.L_noaa20_hi - au.L_noaa20_lo) / 2 <= 0.25 * au.L_noaa20)
    au["outside_snpp"] = [outside(r.L_snpp, r.region, r.published_status == "ok") for r in au.itertuples()]
    au["outside_noaa20"] = [outside(r.L_noaa20, r.region, bool(k)) for r, k in zip(au.itertuples(), ok_n20)]
    au.round(4).to_csv(OUT / "handover_audit.csv", index=False)

    f = lambda v, nd=2: "–" if v is None or (isinstance(v, float) and np.isnan(v)) else f"{v:.{nd}f}"
    lines = ["# Handover results", "",
             "Generated by `analysis/handover/handover.py`. Method and reading: [README](../README.md).", "",
             "## 1. Is the S-NPP / NOAA-20 rate stable?", "",
             "Each overlap year's S-NPP count divided by NOAA-20 × k (k fitted on 2018–2025). 1 = exactly as calibrated.", "",
             "| Region | " + " | ".join(str(y) for y in CAL_FULL) + " |", "|---" * (len(CAL_FULL) + 1) + "|"]
    for rid in REGIONS:
        q = st[st.region == rid].set_index("year")
        lines.append(f"| {rid} | " + " | ".join(f"{f(q.at[y, 'snpp_over_noaa20_vs_k'])} ({f(q.at[y, 'lo'])}–{f(q.at[y, 'hi'])})" for y in CAL_FULL) + " |")
    lines += ["", "## 2. Out of sample: k fitted on 2018–2020, tested on 2021–2025", "",
              "Same days for both clocks. Difference = L with NOAA-20 − L with S-NPP; its 95% interval should include 0.", "",
              "| Region | Year | L, S-NPP clock (published) | L, NOAA-20 clock | Difference (95%) |", "|---|---|---|---|---|"]
    for r in au[au.year <= 2025].itertuples():
        lines.append(f"| {r.region} | {r.year} | {f(r.published_L)} | {f(getattr(r, 'L_noaa20_oos', None))} | "
                     f"{f(getattr(r, 'oos_diff', None), 3)} ({f(getattr(r, 'oos_diff_lo', None), 3)} to {f(getattr(r, 'oos_diff_hi', None), 3)}) |")
    lines += ["", "## 3. Production handover: k from the full overlap, NOAA-20 as the fixed clock", "",
              "Outside = beyond the nine 2012–2020 placebo years' range (the published audit's rule).", "",
              "| Region | Year | L, S-NPP clock | Outside? | L, NOAA-20 clock (95%) | Outside? |", "|---|---|---|---|---|---|"]
    for r in au.itertuples():
        yes = lambda v: "–" if v is None else ("yes" if v else "no")
        lines.append(f"| {r.region} | {r.year} | {f(getattr(r, 'L_snpp', None))} | {yes(r.outside_snpp)} | "
                     f"{f(getattr(r, 'L_noaa20', None))} ({f(getattr(r, 'L_noaa20_lo', None))}–{f(getattr(r, 'L_noaa20_hi', None))}) | {yes(r.outside_noaa20)} |")
    (OUT / "results.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    return au, st


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--extra", help="extra daily counts (date, biome, satellite, count_all), e.g. 2026 Aqua + NOAA-20")
    a = ap.parse_args()
    main(a.extra)
