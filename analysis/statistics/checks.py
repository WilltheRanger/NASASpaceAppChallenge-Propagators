"""Score predictions P1-P10 (research/predictions.md) against the pipeline outputs; writes data/out/checks.json.

Usage: python3 analysis/statistics/checks.py analysis/brazil-data/out analysis/statistics/out data/out
Every status follows the written pass rule. Where a rule could not be applied as written, the detail says so.
"""
import sys, os, json
import numpy as np, pandas as pd

src, sdir, dst = sys.argv[1], sys.argv[2], sys.argv[3]
BIOMES = ["amazon", "cerrado", "caatinga", "mata_atlantica", "pantanal", "pampa"]
audit = pd.read_csv(os.path.join(sdir, "audit_by_biome.csv"))
plac = pd.read_csv(os.path.join(sdir, "placebo_by_biome.csv"))
tc = pd.read_csv(os.path.join(sdir, "twoclocks_by_biome.csv"))
refs = pd.read_csv(os.path.join(sdir, "reference_satellite_by_biome.csv"))
slopes = pd.read_csv(os.path.join(sdir, "fireday_slopes.csv")).set_index("biome")
drift = pd.read_csv(os.path.join(src, "firms_drift_by_biome.csv"))
# the predictions were written for Brazil's biomes; other regions are reported in the README, not scored
audit, plac, tc, refs = (x[x.biome.isin(BIOMES)].copy() for x in (audit, plac, tc, refs))
checks, table = [], []

def add(pid, name, ok, detail):
    status = "pending" if ok is None else ("pass" if ok else "fail")
    checks.append({"id": pid, "name": name, "status": status, "detail": detail})
    table.append((pid, status, detail))

def frac(mask):
    return f"{int(mask.sum())}/{len(mask)}"

# P1: Aqua look time rises every year 2021-2025; S-NPP within +/-10 min of its 2012-2020 median
lst = drift.pivot_table(index=["biome", "year"], columns="satellite", values="lst_median")
ra, rb, flat, fails = [], [], [], []
for b in BIOMES:
    a = lst.loc[b, "Aqua"]; v = lst.loc[b, "S-NPP"]
    ra.append(all(a[y] >= a[y - 1] for y in range(2022, 2026)))
    rb.append(all(a[y] >= a[y - 1] for y in range(2021, 2026)))
    flat.append(bool((abs(v.loc[2021:2025] - v.loc[2012:2020].median()) * 60 <= 10).all()))
    if not rb[-1]: fails.append(f"{b} 2021 vs 2020: {(a[2021] - a[2020]) * 60:+.1f} min")
ok_a, ok_b = all(ra) and all(flat), all(rb) and all(flat)
add("P1", "Aqua's look time over each Brazilian biome rises every year 2021-2025; VIIRS stays flat",
    ok_a if ok_a == ok_b else None,
    f"Reading (a) 2022-2025 each >= prior year: {sum(ra)}/6 biomes. Reading (b) also 2021 >= 2020: {sum(rb)}/6"
    + (f" ({'; '.join(fails)})" if fails else "") + f". S-NPP within 10 min of 2012-2020 every year: {sum(flat)}/6. "
    + ("Both readings agree." if ok_a == ok_b else "Readings disagree: the team must pick one in research/predictions.md before this is scored."))

# P2: Punjab, scored on branch claude/predictions-and-punjab
pj = json.load(open(os.path.join(dst, "drift/in-punjab-haryana.json")))
t = {y["year"]: int(y["aqua_lst"][:2]) * 60 + int(y["aqua_lst"][3:]) for y in pj["years"]}
mono = all(t[y] > t[y - 1] for y in range(2022, 2026)); rise = t[2025] - t[2021]
add("P2", "Punjab Aqua look time follows Jethva 2026 (1:44 PM in 2021 to 3:12 PM in 2025)", mono and 60 <= rise <= 120,
    f"Aqua later every year 2021-2025: {'yes' if mono else 'no'}; total rise {rise} min (rule 60-120). "
    "Our absolute times run 27-39 min earlier than Jethva's; time convention not yet checked.")

# P3: INPE reproduction, >= 90% of biome-months 2012-2020 within 10%
m = pd.read_csv(os.path.join(src, "inpe_reproduction_monthly.csv"))
m = m[m.biome.isin(BIOMES) & (m.ym >= "2012-01") & (m.ym <= "2020-12") & (m.inpe > 0)]
w_all = (abs(m.firms_aqua_all / m.inpe - 1) <= 0.10); w_f = (abs(m.firms_aqua_filtered / m.inpe - 1) <= 0.10)
add("P3", "Our FIRMS Aqua data reproduces INPE's reference counts", w_all.mean() >= 0.90,
    f"Biome-months 2012-2020 within 10% of INPE: {w_all.mean():.1%} with all daytime Aqua detections, "
    f"{w_f.mean():.1%} with the plan's filters (type 0, confidence >= 30). Rule: >= 90%. "
    "Note: P3 was computed before the predictions were committed (see the honest timeline).")

# P4: placebo bootstrap intervals contain 1 in >= 7 of 9 years
plac["c1"] = (plac.L_lo <= 1) & (plac.L_hi >= 1)
per = plac.groupby("biome").c1.sum()
add("P4", "Day-to-day sampling noise explains the pre-drift wobble", bool((per >= 7).all()),
    "Placebo years (2012-2020, each held out) whose 95% block-bootstrap interval contains 1: "
    + ", ".join(f"{b} {per[b]}/9" for b in BIOMES) + ". Rule: >= 7/9. Detection rule used: L outside the placebo range.")

# P5: L_strat inside the interval of L, 2021-2025, every biome-year with enough data
ok = audit[audit.status == "ok"]
in5 = (ok.L_strat >= ok.L_lo) & (ok.L_strat <= ok.L_hi)
add("P5", "Fire-size mix doesn't explain the audit", bool(in5.all()),
    f"L_strat (days split into S-NPP mean-FRP terciles, reweighted to the 2012-2020 mix) inside L's 95% interval in "
    f"{frac(in5)} biome-years 2021-2025. Largest move: {(ok.L_strat - ok.L).abs().max():.3f}. "
    "Day-level classes (the daily file has no per-detection FRP).")

# P6: L with NOAA-20 reference inside the interval of L with S-NPP reference (both on a 2018-2020 baseline)
in6 = (refs.L_noaa20 >= refs.L_snpp_lo) & (refs.L_noaa20 <= refs.L_snpp_hi)
add("P6", "VIIRS is a stable clock", bool(in6.all()),
    f"L with NOAA-20 as reference inside L with S-NPP's 95% interval in {frac(in6)} biome-years 2021-2025 "
    f"(both baselines 2018-2020, the years both satellites flew). Largest gap: {(refs.L_noaa20 - refs.L_snpp).abs().max():.3f}.")

# P7: closure on strict biome-years (Aqua shift <= 1 h): L_pred = exp(beta x shift) inside L's 90% interval
s = ok[ok.shift_h.abs() <= 1]
in7 = (s.L_pred >= s.L_lo90) & (s.L_pred <= s.L_hi90)
add("P7", "Closure: the timing slope predicts the observed L", in7.mean() >= 0.75,
    f"L_pred inside the 90% interval of L in {frac(in7)} strict biome-years ({in7.mean():.0%}; rule >= 75%). "
    "beta = log(Aqua/Terra) per hour of look-time gap, 2012-2020 (same MODIS sensor, same days). "
    "Misses: " + (", ".join(f"{r.biome} {r.year} (pred {r.L_pred:.2f}, obs {r.L:.2f})" for r in s[~in7].itertuples()) or "none") + ".")

# P9: where beta > 0, A rises and T falls 2023-2025
res9, gate = [], []
for b in BIOMES:
    if slopes.at[b, "beta_base"] <= 0: continue
    g = tc[tc.biome == b].set_index("year")
    A, T = g["A"], g["T"]  # g.T would be the transpose
    up_ = A[2023] < A[2024] < A[2025]; dn = T[2023] > T[2024] > T[2025]
    res9.append(up_ and dn); gate.append(f"{b} A {'up' if up_ else 'not monotone'}, T {'down' if dn else 'not monotone'}")
add("P9", "Opposite drifts move the Terra and Aqua probes in opposite directions", all(res9) if res9 else None,
    f"Pass in {sum(res9)}/{len(res9)} biomes with beta > 0: " + "; ".join(gate) + ". "
    "Deviation: the written gate uses VIIRS same-day pairs, but S-NPP and NOAA-20 look at the same local time "
    "(13:31 vs 13:31 over the Amazon in 2024), so that slope cannot be measured. Gate used: the MODIS Terra/Aqua slope beta.")

# P10: clock share of log A from the difference method inside the interval of log L, 2022-2025
q = tc[(tc.year >= 2022)].merge(audit[["biome", "year", "status"]], on=["biome", "year"])
q = q[q.status == "ok"]
in10 = (q.clock_share_logA >= q.logL_lo) & (q.clock_share_logA <= q.logL_hi)
add("P10", "The two-clock difference agrees with the audit", in10.mean() >= 0.75,
    f"Clock share of log A_y = clock_diff x dA/(dA - dT) inside the 95% interval of log L_y in {frac(in10)} "
    f"biome-years 2022-2025 ({in10.mean():.0%}; rule >= 75%). Misses: "
    + (", ".join(f"{r.biome} {r.year}" for r in q[~in10].itertuples()) or "none") + ".")

# P8: California detection limits (computed before predictions were committed)
dl = json.load(open(os.path.join(dst, "detection_limits_california.json")))["satellites"]
v = dl["S-NPP"]; a = dl["Aqua"]
add("P8", "VIIRS detects small real fires better than MODIS", v["a50_ci95"][1] < a["a50_ci95"][0],
    f"a50 (fire size detected half the time), 2012-2020: S-NPP {v['a50_acres']:.0f} acres {v['a50_ci95']}, "
    f"Aqua {a['a50_acres']:.0f} acres {a['a50_ci95']}. Not pre-registered (computed before the commit).")

checks.sort(key=lambda c: int(c["id"][1:]))
with open(os.path.join(dst, "checks.json"), "w") as f:
    json.dump({"mock": False, "note": "Real. Scored by analysis/statistics/checks.py against the written rules in research/predictions.md. AI-generated (Claude); team review required.", "checks": checks}, f, indent=1)
for pid, st, det in sorted(table, key=lambda r: int(r[0][1:])): print(f"{pid:4} {st:8} {det}\n")
