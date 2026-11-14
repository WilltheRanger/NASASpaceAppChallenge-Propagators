# Execution plan: Clock Audit (with real-fire proof)

**Team Propagators · NASA Space Apps 2026 · Challenge #9**
Written Sat Nov 14, 1:30 PM PT. **Deadline: Sun Nov 15, 6:00 PM PT** (from the team doc; confirm with the local lead). That leaves about 28 hours.

> **Pitch:** "Brazil reported its fewest Amazon fires since 1998, counted by a NASA satellite whose 1:30 pm photo now happens at 3:50 pm. We show how much of that trend is the fire and how much is the satellite's clock, prove it with real recorded fires, and keep the count going after that satellite shuts down."

---

## 0. Final broad check: what's verified, what's still open

**Verified:**
- **The challenge asks for** a harmonized MODIS+VIIRS burning-activity calendar web app: select a region and dates, compare with the historical median, download a CSV.
- **Judging:** Impact / Creativity / Validity / Relevance / Presentation, each scored 1–5.
- **NASA data:** at least one NASA data source is required for global awards. FIRMS covers this.
- **Other data:** non-NASA data must be freely and publicly available.
- **Demo:** ≤7 slides or a ≤30 s video, in English.

**Rule to act on now:**

**The premise:**
- INPE's official Brazil series still uses Aqua as its reference satellite (2026 state bulletins).
- INPE's FAQ never mentions drift, and its named successor, S-NPP, ended Nov 2, 2026.
- **Measured this week from FIRMS:** Aqua crosses the Amazon at **15:50**, NOAA-20 at **13:39**. Over Punjab it's Aqua **15:31** vs NOAA-20 **13:09**.

**Data is reachable:**
- FIRMS yearly files for Brazil: MODIS about 32–43 MB/yr, S-NPP about 154 MB/yr, NOAA-20 about 163 MB/yr.
- FIRMS US VIIRS files are about 40 MB/yr; India is small.
- IBGE biome map (14 MB).
- INPE statistics page: monthly reference-satellite counts with a biome filter and CSV download, back to 1998.
- FPA-FOD 7th ed. (2.66M fires, 1992–2024), already downloaded and checked.
- MapBiomas Fogo C5.

**Competition:**
- About 320 repos build calendars; that's table stakes.
- BRASA already shows an Aqua-vs-VIIRS drift ratio.
- **Not found anywhere:** an audit of INPE's official series by biome, or a proof using real recorded fires.

**Still open:**
- The exact deadline.
- Who holds which role.
- Whether our FIRMS Aqua counts reproduce INPE's (Gate 2 tests this).
- The INPE CSV URL: grab it in a browser.

---

## 1. What we ship

| # | Deliverable | Required? |
|---|---|---|
| 1 | **Web app** at a public link (opens without login) | Yes |
| 2 | **Harmonized calendar**: month × year heat-map, 2002 → today, one consistent "fixed-clock" count, anomaly vs. the historical median, CSV download. Preset regions: Brazil biomes (Amazon, Cerrado, Pantanal…), Punjab+Haryana, California. Stretch: Argentina, draw-an-area | Yes |
| 3 | **Clock-audit panel**: per region and year since 2021, the Aqua-based count vs. the fixed-clock count, with the gap and error bars | Our headline |
| 4 | **Drift chart**: the local time Aqua and Terra actually looked, year by year, vs. VIIRS | Hook |
| 5 | **Real-fire proof**: Aqua vs. VIIRS detection of same-size *recorded* California fires, before vs. after 2021 | Differentiator |
| 6 | **7 slides OR 30 s video**, plus the **project page**: summary, demo link, project link, details, NASA data, references | Yes |

## 2. Roles (4 people; the team lead assigns names)

- **Team lead / Science:** owns the method, validation, numbers freeze and the final say.
- **Data lead:** downloads, biome lookup, aggregations, INPE CSV, JSON outputs.
- **App lead (Arya):** Vite + React + TS + Leaflet, reusing DBHS Wayfinder patterns; static JSON; deploy (Cloudflare Pages); public-link test.
- **Story/QA lead:** slides or video, project page, SI-disclosure log, references, judge Q&A prep, testing every number against the JSON.


## 3. Data contract (agree on this in the first hour so app and data work in parallel)

```
data/out/regions.json        [{id, name, kind: "biome"|"state"|"preset", bbox:[w,s,e,n]}]
data/out/calendar/<id>.json  {region, unit:"fixed-clock Aqua-equivalent hotspots",
                              months:[{ym:"2024-08", fixed, lo, hi, aqua, snpp, noaa20, median_ref, anomaly_pct, flags:["provisional"|"outage"]}]}
data/out/audit/<id>.json     {region, baseline:{years:"2012-2020", ratio, noise_floor},
                              years:[{year, L, L_lo, L_hi, L_strat, aqua_count, fixed_count, gap_pct}]}
data/out/drift/<id>.json     {region, years:[{year, aqua_lst, terra_lst, viirs_lst}]}       // "HH:MM" local solar time
data/out/proof_california.json  {size_classes:[...], years:[{year, aqua_pod, viirs_pod, n}]}
```
The app reads only these files. **Every number on a slide must come from them.**

## 4. Method (exact steps)

**A. Filters.**
- Daytime only.
- Vegetation fires (`type == 0`, standard data only).
- MODIS confidence ≥ 30; VIIRS confidence `n` or `h`.
- 2026 near-real-time data has no `type` column, so flag it as **provisional**.

**B. Regions.**
- Brazil: assign each detection's 0.1° cell to an IBGE biome with a one-time lookup table.
- Punjab+Haryana: bounding box or state shapes.
- California: state polygon.

**C. Drift chart.** Median local solar time (UTC + lon/15) of near-nadir daytime detections, per satellite and year. Use the existing `analysis/drift-check/drift_check.py`.

**D. Audit.**
- Baseline: ratio R = Aqua ÷ VIIRS per region × calendar month, over 2012–2020. Drop outage days for both sensors.
- **L_y = (Aqua/VIIRS)_y ÷ R** for 2021–2025.
- **Fire-mix fix:** recompute L within three VIIRS fire-strength (FRP) classes and reweight to the 2012–2020 mix. If L_strat ≈ L, the mix doesn't matter; if they differ, report L_strat.
- **Placebo:** compute L for each 2012–2020 year left out of the baseline. Their spread is the **noise floor**.
- **Error bars:** bootstrap over days.

**E. Fixed-clock series and calendar.**
- fixed = VIIRS × R (by region and month), in "Aqua units".
- Link S-NPP → NOAA-20 with a factor fitted on their overlap (2018–2025), to continue after Nov 2, 2026.
- Anomaly = month vs. the median of the same calendar month.

**F. Validation.**
1. **Punjab kill test.** Our Aqua times should rise like Jethva 2026: 13:44 (2021) → 15:12 (2025).
2. **Reproduce INPE.** Our FIRMS Aqua daytime counts by biome/month vs. INPE's CSV.
   - If they match, it is an "audit of INPE's series."
   - If not, it is an "audit of the FIRMS Aqua record INPE's method uses."
3. **MapBiomas** annual burned area by biome (stretch).
4. **Placebo** years inside the noise floor.

**G. Real-fire proof (California).**
- Data: FPA-FOD 7th ed. California fires, 2012–2024, grouped into size classes.
- A fire counts as detected by a satellite if any of its hotspots lies within √(area/π) + 1 km of the fire, between discovery − 2 h and containment + 12 h (size-based fallback when containment is missing).
- Output: Aqua vs. VIIRS detection rate per year, within each size class.
- Question: did Aqua change after 2021 while VIIRS stayed flat?

## 5. Schedule and gates (Pacific time)

| When | What | Gate / if missed |
|---|---|---|
| **Sat 1:45–2:30** | Confirm decision and roles; agree the JSON contract; get FIRMS MAP_KEYs; start or confirm downloads; scaffold the app with mock JSON | — |
| **Sat 2:30–6:00** | Punjab kill test; Brazil ingest + biome lookup; first unstratified L for Amazon and Cerrado; download the INPE CSV; app: calendar + region picker on mock data | **Gate 1 (6 PM):** real drift chart + first L. *If missed:* Amazon only |
| **Sat 6:00–10:00** | Fire-mix fix, placebo, bootstrap; fixed-clock series; calendar JSON for all presets; INPE reproduction; app wired to real JSON (calendar + audit panel + drift chart) | **Gate 2 (10 PM):** INPE check done; set the audit framing |
| **Sat 10 PM–2 AM** | California proof; app polish and CSV export; first slide draft. **Sleep in shifts**: two people sleep from 2 AM | Proof chart exists. *If not:* drop to one size class |
| **Sun 8:00–9:00** | **Gate 3:** freeze all numbers (re-run the pipeline once, clean); app deployed at its public URL | Freeze holds |
| **Sun 9:00–1:00** | Stretch only (Argentina, draw-an-area, MapBiomas); final slides or video; project page; references | — |
| **Sun 1:00** | **Feature freeze.** | — |
| **Sun 1:00–5:00** | Rehearse the pitch; Q&A prep; test every link signed out; check that slide numbers match the JSON; **Submit for Judging by 5:00**; confirm the success banner; one hour of buffer | — |

**Cut order if behind:**
1. Argentina
2. Draw-an-area
3. MapBiomas
4. NOAA-20 continuity polish
5. California proof (keep it if at all possible; it's what nobody else has)

**Never cut:** the calendar (required), the Brazil audit (our headline), the Punjab check, the INPE comparison.

## 6. Pitch: 7 slides (or the same beats in 30 s)

1. **Hook:** "Fewest Amazon fires since 1998 — counted by a satellite whose 1:30 pm photo now happens at 3:50 pm."
2. **Problem:** NASA's Aqua drifted. INPE's official series still uses it, and its successor (S-NPP) shut down Nov 2.
3. **What we built:** the calendar + clock audit (screenshot).
4. **Result:** the audit gap by biome, 2021–2025, with error bars and noise floor (whatever it is; "the trend holds" is also a finding).
5. **Proof:** real California fires show the change is the satellite, not the fires. Frame it like checking a lab instrument against a reference standard.
6. **Validation & limits:** reproduce INPE, the Punjab test, placebo years; honest caveats.
7. **Impact:** who uses it (journalists, state agencies, researchers, fire managers); it keeps the count going after Aqua ends in 2027; links.

**Words to use:** "we didn't find anyone doing X." **Never:** "first."

## 7. Judge Q&A prep (the hardest questions)

- *"How do you know VIIRS didn't change?"* VIIRS orbits are held at about 13:30 (we measured 13:39 over Brazil). The placebo years show the noise floor. The California proof checks both satellites against real fires.
- *"Isn't this just a fire-mix change?"* We recompute within fire-strength classes (L_strat).
- *"Does your count match INPE's?"* Show Gate 2.

## 8. SI (AI) disclosure log


