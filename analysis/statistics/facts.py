"""Numbers sheet for slides, project page and app copy: every number with its wording, source and caveat.

Usage: python3 analysis/statistics/facts.py data/out analysis/brazil-data/out analysis/statistics/FACTS.md
Writes data/out/facts.json and a readable FACTS.md. Rerun after the pipeline; never type a number by hand.
"""
import sys, os, json
import pandas as pd

dst, src, md = sys.argv[1], sys.argv[2], sys.argv[3]
J = lambda p: json.load(open(os.path.join(dst, p)))
facts = []

def add(fid, text, value, source, caveat=""):
    facts.append(dict(id=fid, text=text, value=value, source=source, caveat=caveat))

def hm(h):
    m = int(round(h * 60)); return f"{m // 60:02d}:{m % 60:02d}"

# headline: Amazon 2025
a = next(y for y in J("audit/br-amazon.json")["years"] if y["year"] == 2025)
add("amazon_2025_counts",
    f"In 2025, Aqua recorded {a['aqua_count']:,} daytime hotspot detections over the Brazilian Amazon on days both "
    f"satellites returned data. Its 2012-2020 relationship with VIIRS predicted {a['fixed_count']:,}.",
    {"aqua": a["aqua_count"], "benchmark": a["fixed_count"]}, "data/out/audit/br-amazon.json: years[2025].aqua_count, fixed_count",
    "Matched days only; not the full-calendar count.")
add("amazon_2025_excess",
    f"Aqua was {a['gap_pct']}% above that benchmark (L = {a['L']}, 95% interval {a['L_lo']}-{a['L_hi']}); "
    f"the excess is {a['share_of_observed_pct']}% of Aqua's own count.",
    {"gap_pct": a["gap_pct"], "share_of_observed_pct": a["share_of_observed_pct"], "L": a["L"], "L_lo": a["L_lo"], "L_hi": a["L_hi"]},
    "data/out/audit/br-amazon.json: years[2025]",
    "Do not say drift caused this share; the data do not isolate the cause.")

# the clock shift
dr = pd.read_csv(os.path.join(src, "firms_drift_by_biome.csv"))
am = dr[dr.biome == "amazon"].pivot(index="year", columns="satellite", values="lst_median")
base_a, a25, v25 = am.loc[2012:2020, "Aqua"].mean(), am.at[2025, "Aqua"], am.at[2025, "S-NPP"]
add("amazon_look_times",
    f"Over the Amazon, Aqua looked at about {hm(base_a)} local solar time in 2012-2020 and {hm(a25)} in 2025, "
    f"{round((a25 - base_a) * 60)} minutes later; S-NPP looked at {hm(v25)} in 2025.",
    {"aqua_2012_2020": round(base_a, 3), "aqua_2025": round(a25, 3), "snpp_2025": round(v25, 3)},
    "analysis/brazil-data/out/firms_drift_by_biome.csv: lst_median (near-nadir daytime detections)",
    "Medians of detection times, weighted by where fires were detected.")

# all regions
rows = []
for rid, name in [("br-amazon", "Amazon"), ("br-cerrado", "Cerrado"), ("br-pantanal", "Pantanal"),
                  ("ar-argentina", "Argentina"), ("in-punjab-haryana", "Punjab + Haryana"), ("us-california", "California")]:
    au = J(f"audit/{rid}.json")
    for y in au["years"]:
        rows.append(dict(region=name, year=y["year"], status=y["status"], L=y["L"], L_lo=y["L_lo"], L_hi=y["L_hi"],
                         outside_placebo=y["outside_noise"], noise_floor=au["baseline"]["noise_floor"]))
add("audit_table", "Audit L by region and year (1 = no change from 2012-2020).", rows, "data/out/audit/<region>.json",
    "Show insufficient-data years as such; the placebo flag is descriptive, not a significance test.")

# official series vs fixed-clock calendar
inpe = pd.read_csv(os.path.join(src, "inpe_daily_by_biome.csv"))
iy = inpe[inpe.biome == "amazon"].groupby(inpe.date.str[:4]).inpe_count.sum()
cal = pd.Series({m["ym"]: m["fixed"] for m in J("calendar/br-amazon.json")["months"]})
fy = cal.groupby(cal.index.str[:4]).sum()
ci_, cf_ = (iy["2025"] / iy["2024"] - 1) * 100, (fy["2025"] / fy["2024"] - 1) * 100
add("amazon_decline_2024_2025",
    f"From 2024 to 2025, INPE's official Amazon count fell {abs(ci_):.1f}% ({iy['2024']:,} to {iy['2025']:,}); "
    f"the fixed-clock calendar fell {abs(cf_):.1f}% ({int(fy['2024']):,} to {int(fy['2025']):,}).",
    {"inpe_2024": int(iy["2024"]), "inpe_2025": int(iy["2025"]), "fixed_2024": int(fy["2024"]), "fixed_2025": int(fy["2025"]),
     "inpe_pct": round(ci_, 1), "fixed_pct": round(cf_, 1)},
    "analysis/brazil-data/out/inpe_daily_by_biome.csv; data/out/calendar/br-amazon.json: months[].fixed",
    "Full calendar months, a different day set from the audit. The calendar is a VIIRS-based Aqua-equivalent estimate.")

# checks
ch = J("checks.json")["checks"]
st = {s: [c["id"] for c in ch if c["status"] == s] for s in ("pass", "fail", "pending")}
late = [c["id"] for c in ch if c.get("result_existed_before_commit")]  # research/predictions.md: not pre-registered
add("predictions",
    f"Written checks: {len(st['pass'])} pass ({', '.join(st['pass'])}), {len(st['fail'])} fail "
    f"({', '.join(st['fail'])}), {len(st['pending'])} pending ({', '.join(st['pending'])}). "
    f"Not pre-registered: {', '.join(late)}.",
    st, "data/out/checks.json",
    "Results for " + ", ".join(late) + " existed before the commit; "
    "P3 and P9 deviate from their written rules (see rule_implemented). Never show a bare pass tally.")
p3 = next(c for c in ch if c["id"] == "P3")
add("inpe_match", "Our FIRMS Aqua counts track INPE's reference series: " + p3["detail"].split(" INPE uses")[0], None,
    "data/out/checks.json: P3", "Same underlying MODIS algorithm; shows we track the intended series, not independent validation.")

# simulation
sim = J("sim/amazon-2024-09-02.json")
r3 = sim["runs"]["3"]
add("response_simulation",
    f"On {sim['day']} in Pará, with NASA's stated FIRMS delay of up to 3 hours, an alert from Aqua's afternoon pass "
    f"arrived at {hm(r3['Aqua']['summary']['first_alert'])}, {round(r3['Aqua']['summary']['daylight_left_at_first_alert_h'] * 60)} "
    f"minutes before sunset: {r3['Aqua']['summary']['helicopter_sorties']} helicopter sorties were possible, against "
    f"{r3['VIIRS']['summary']['helicopter_sorties']} from the VIIRS pass and {r3['Terra']['summary']['helicopter_sorties']} "
    f"from Terra's morning pass.",
    {k: v["summary"] for k, v in r3.items()}, "data/out/sim/amazon-2024-09-02.json: runs['3']",
    "Illustrative fleet and bases; real fires and pass times. Not operational advice; INPE's alerts combine all satellites.")

# detection limits
dl = J("detection_limits_california.json")["satellites"]
add("detection_limits",
    f"In California, VIIRS caught half of recorded isolated fires at about {dl['S-NPP']['a50_acres']:.0f} acres; Aqua at "
    f"about {dl['Aqua']['a50_acres']:.0f} acres (2012-2020).",
    {"snpp_a50": dl["S-NPP"]["a50_acres"], "aqua_a50": dl["Aqua"]["a50_acres"]}, "data/out/detection_limits_california.json",
    "One matching procedure for isolated, agency-recorded fires; not universal sensor limits.")

AVOID = ["Aqua's later clock added X% / drift caused X% of fires", "corrected official fire count",
         "two independent methods agree", "fire size ruled out", "an unqualified pass tally (6/10)",
         "Punjab 1.58 without its insufficient-data flag", "319 vs 946 acres as universal detection limits", "first"]
SUGGESTED = (f"Aqua's look time over the Amazon moved {round((a25 - base_a) * 60)} minutes later. In 2025 it counted "
             f"{a['aqua_count']:,} fire detections where its pre-drift relationship with VIIRS predicted {a['fixed_count']:,}.")
out = {"mock": False, "note": "Every number for slides, the project page and app copy, with its source and caveat. "
       "Generated by analysis/statistics/facts.py; rerun after the pipeline.",
       "suggested_headline": SUGGESTED, "avoid": AVOID, "facts": facts}
with open(os.path.join(dst, "facts.json"), "w") as f: json.dump(out, f, indent=1)

L = ["# Numbers sheet", "", "Generated by `analysis/statistics/facts.py` from `data/out/`. Rerun after the pipeline; "
     "copy wording from here, never retype numbers.", "", "## Suggested headline", "", SUGGESTED, ""]
for x in facts:
    if x["id"] == "audit_table":
        L += ["## Audit L by region", "", "| Region | 2021 | 2022 | 2023 | 2024 | 2025 | Noise floor |", "|---|---|---|---|---|---|---|"]
        for reg in dict.fromkeys(r["region"] for r in x["value"]):
            rr = [r for r in x["value"] if r["region"] == reg]
            cell = lambda r: "insufficient" if r["status"] != "ok" else f"{r['L']:.2f} ({r['L_lo']:.2f}-{r['L_hi']:.2f}){' †' if r['outside_placebo'] else ''}"
            L.append(f"| {reg} | " + " | ".join(cell(r) for r in rr) + f" | {rr[0]['noise_floor']} |")
        L += ["", "† outside the nine placebo years' range (descriptive). " + x["caveat"], f"Source: `{x['source']}`", ""]
        continue
    L += [f"## {x['id'].replace('_', ' ').capitalize()}", "", x["text"], "", f"- Source: `{x['source']}`"]
    if x["caveat"]: L.append(f"- Caveat: {x['caveat']}")
    L.append("")
L += ["## Do not say", ""] + [f"- {s}" for s in AVOID] + [""]
open(md, "w", encoding="utf-8").write("\n".join(L))
print("wrote", os.path.join(dst, "facts.json"), "and", md, f"({len(facts)} facts)")
