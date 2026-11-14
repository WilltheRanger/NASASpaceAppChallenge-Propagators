# ANCHOR: a fire record that doesn't drift

**Team Propagators · NASA Space Apps 2026 · Challenge #9 "Harmonization of MODIS and VIIRS Hot Spots"**
*Working proposal, written Nov 14, 2026 (day 1). "Anchor" is a working title; finalize the name with `productID.md`.*

> **Satellites drift. Satellites die. The ground doesn't.**
> We calibrate every NASA/NOAA fire satellite against fires that firefighters actually fought. Then we use those measured detection limits to build one burning-activity calendar that stays honest across sensor changes, orbital drift and satellite retirements.

---

## 0. TL;DR

1. **The obvious project is saturated.** It is a harmonized calendar plus ratio or ML calibration, an anomaly vs. the median, and an AI chat. About 320 public GitHub repos created since September mention this challenge ("MODIS and VIIRS Hot Spots") in their name, description or README. The clever variants are taken too: capture-recapture, degrading VIIRS to MODIS, cloud masks, overpass-time correction, fire-weather drivers and outage rules. See §1.2.
2. **Every one of those projects calibrates satellites against each other.** That is circular. If MODIS and VIIRS miss the *same* small fires, comparing them can never reveal it. And since about 2022, Aqua does not even look at the same time of day as VIIRS.
3. **Our move is to use an external reference standard: fires reported by firefighting agencies.**
   - Sources: US Forest Service **FPA-FOD 7th edition** (1992–**2024**, 2.66M records, released June 2026), plus NIFC WFIGS for 2025–26 (about 392k wildfire records, effectively 2014–today, updated live).
   - With them we measure each satellite's **probability of detection (POD) vs. fire size**.
   - We **quantify the orbital-drift effect**. NASA's MODIS land team says the effect on fire products is "under active investigation" (Jan 2026 notice).
   - We **test the independence assumption** that satellite-vs-satellite methods rely on.
   - We publish a calendar in **units of real fires**, validated even for the MODIS-only era (2001–2011), where no second satellite exists.
4. **Why now:**
   - Suomi-NPP was **switched off Nov 2, 2026**, 12 days ago.
   - Terra, the only NASA morning orbit, ends around **Feb 2027** (projected).
   - We measured this week's FIRMS data: at 25–50°N, Aqua now passes at about **15:29** local time (13:10 in 2013–2021) and Terra at about **08:55** (was 10:55).
   - GFED5, the main fire-emissions dataset, **cut its MODIS record at 2022 because of drift**.
5. **Why these judges:**
   - Two materials-science PhDs will recognize the method: calibration against a reference standard, detection limits, instrument drift, POD curves.
   - It has clean math for a Math Kangaroo coach.
   - It ships as a fast, public, test-backed web app for a CTO.
6. **We already have a first measured result** (§1.6). Using only FIRMS hotspots:
   - By 2024, Terra's overpass over the US had moved **44 min earlier** and Aqua's **34 min later**.
   - By this week (Nov 2026), the shifts are about **2 h earlier** and **2 h 20 min later**.
   - In 2024 the Aqua/Terra detection ratio jumped from about 1.3–1.45 to **1.69**.

---

## 1. What we learned before choosing

### 1.1 The challenge (official text, condensed)

**Objectives:**
- Build a **harmonized burning-activity calendar** in a **web application**. It combines "the extensive historical series of MODIS with the continuity and greater detail of VIIRS".
- **Part 1:** harmonization, so that "the sensor of origin no longer matters".
- **Part 2:** a web app where a user selects a region and date range, sees a calendar from the early 2000s to the present, and downloads analytics, visualizations and a CSV.

**Root cause, per the challenge:** MODIS and VIIRS "have different spatial resolutions, sensitivities, and **observation schedules**", and MODIS is "approaching the end of its operational life".

**Users:** early-warning and emergency responders, scientists, land managers and firefighters. The example use case is to "compare the burning activity of the current month against the historical median for a selected area".

**Considerations:**
- An interactive map where the user can draw an area of interest or enter lat/lon.
- Accessible color ramps.
- Color ramps for month-to-month differences.
- CSV export.

### 1.2 The competition: public GitHub repos for this challenge, as of Nov 14

| Approach | Already done by (examples) |
|---|---|
| Ratio, regression, LightGBM or Poisson-GBM calibration, plus calendar and anomaly vs. median | Dozens, e.g. `GAUSS-TPAC/Ember…`, `Warren-530/fire-harmony`, `MahmoudMontaseb/FireMind` (with conformal prediction) |
| Capture-recapture: each satellite pass treated as a "survey" | `Kisryo/FireCensus` (detection curves, backcast, leave-one-year-out), `piales00/firechronos-peru` (Chapman estimator, simulation) |
| Degrade VIIRS to MODIS sensitivity; "fleets" | `Anmols243/ghost-fleet` |
| Correct for "when satellites look" | `fireclock-team/fireclock` |
| Cloud/fire-mask presence–absence (MOD14A1/VNP14A1) | `13222093/kalendarapiv2` (with preregistered hypotheses), `Warren-530/fire-harmony` |
| Punjab burn-timing evasion | `vaibhav375/saanjh`, `ShubAce/BlindSpot` (public repos; not confirmed as Space Apps entries) |
| Fire-weather drivers, burned-area comparison, outage/successor rules | `Warren-530/fire-harmony`, `polymathicX/Agun-Panjika`, `figielak/seamless-fire` |
| AI agent/chat over fire data | `Aalvee-Aarham/kiln-watch` and many others |
| **Agency fire reports as the reference standard (POD vs. real fires, drift via ground truth)** | **None found** in two searches on Nov 14. We searched code for FPA-FOD, WFIGS, CAL FIRE/FRAP, MTBS and CNFDB alongside MODIS/VIIRS harmonization. GitHub code search doesn't index every new repo, so read this as "not seen", not "doesn't exist". |

**Scale:** about 320 public repos created since Sep 2026 mention "MODIS and VIIRS Hot Spots" in their name, description or README. About 375 mention the other fire challenge, "Flame in Freefall". Not every repo is a separate team, but it is hundreds, not dozens.

**Lesson:** AI-assisted teams converge on the same clever methods. Our edge has to be a **different reference**, a **different question** and **validation nobody else can do**.

### 1.3 Why now: verified facts

**Suomi-NPP is gone.**
- NOAA ended S-NPP data delivery and decommissioned it on **2 Nov 2026** ([CIMSS](https://cimss.ssec.wisc.edu/satellite-blog/archives/72828); [NESDIS](https://www.nesdis.noaa.gov/news/administrative-update-2-cessation-of-suomi-national-polar-orbiting-partnership-s-npp-data-users-november-02-2026-1300-utc-and-decommissioning-issued-october-19-2026-1400-utc)).
- The FIRMS archive keeps S-NPP 375 m data for 20 Jan 2012 – 2 Nov 2026.

**MODIS is ending.**
- Terra and Aqua are still in nominal science mode as of 6 Nov 2026 (MCST weekly reports).
- Power-limited end dates: Terra ends operations around **Feb 2027**; Aqua's maximum lifetime is around **Sep 2027** ([NASA HQ slides, May 2026](https://ceres.larc.nasa.gov/documents/STM/2026-05/01_ceres-st-May2026-considine2.pdf); [NASA Science](https://science.nasa.gov/science-research/earth-science/terra-the-end-of-an-era/)).
- FIRMS states that Terra provides the **only morning overpass** and that NASA is "investigating alternatives". We saw this via our research summary; check the FIRMS blog before quoting.
- LAADS (verified): "No follow-on MODIS-like instrument with an orbit at the Terra morning equatorial-crossing MLT exists in the current or planned NASA-managed Earth observation missions" ([PDF](https://ladsweb.modaps.eosdis.nasa.gov/learn/modis-to-viirs-transition/MODIS-VIIRS_Transition.pdf)).
- Non-NASA morning sensors do exist: CAMS is adding ESA's Sentinel-3 for the morning slot.

**Orbital drift (mean local equator-crossing time).**
- Terra (nominal 10:30): about 10:15 in Oct 2022, about 9:45 in Jun 2024, about 8:30 by Dec 2026 (projected).
- Aqua (13:35 in 2012–18): about 14:10 in Jun 2024, about 15:30–15:50 by mid-2026 (projected) ([Lin et al., AGU 2024](https://ntrs.nasa.gov/api/citations/20250000522/downloads/AGU24_Terra_25years_MODIS_geometry_poster_GLin.pdf); [NASA A-Train](https://science.nasa.gov/mission/a-train/); [Twedt et al., SPIE 2023](https://ntrs.nasa.gov/api/citations/20240001409/downloads/2023_SPIE_Twedt_MODIS_EV_orbit_drift_manuscript_v4.pdf)).
- The **VIIRS fleet crosses at about 13:25**.
- **Our own measurement this week** (FIRMS 7-day files, Nov 7–14, 2026; near-nadir daytime detections at 25–50°N): Aqua **15:29**, Terra **08:55**, NOAA-20 VIIRS **13:08**. At the same latitudes in 2013–2021, Aqua was at 13:10 and Terra at 10:55.

**The drift effect on fire products is unresolved.**
- NASA's MODIS land team (LDOPE notice, 8 Jan 2026): "The effects on MODIS fire products and broader datasets are **under active investigation**" ([notice](https://landweb.modaps.eosdis.nasa.gov/displayissue?id=1254)). The notice links Giglio's May 2025 [LANCE slides](https://landweb.modaps.eosdis.nasa.gov/data/filePost/LANCE_UWG_Orbit_Drift_Giglio_202505.pdf).
- **GFED5 ends its MODIS-based record in 2022** because "orbital drift-induced changes surpassed the thresholds" ([Chen et al., ESSD 2026](https://doi.org/10.5194/essd-18-7535-2026)).
- Sofiev & Kouznetsov attribute a 23% MODIS–VIIRS FRP gap to Aqua's later overpass. They give detection probability for powerful fires as 78% for MODIS and 88% for VIIRS globally, and below 30%/40% in some equatorial areas ([GMD 2026](https://gmd.copernicus.org/articles/19/10123/2026/)).

**What's at stake: the same disagreement shows up in national fire statistics today.**
- **India.**
  - The official CAQM count for Punjab in 2026 was 4,459 fires up to Nov 8.
  - NASA's Hiren Jethva estimated "as many as 34,000" fires across **Punjab and Haryana** combined (Oct 1–Nov 9), calling it conservative. He built it from NOAA-20 (about 1:30 pm) and the drifted Aqua (about 4 pm) adjusted to a VIIRS baseline ([report, 10 Nov 2026](https://english.bombaysamachar.com/india-news/punjab-farm-fires-nasa-estimate-official-count-stubble-burning/)).
  - The two numbers cover different areas, so don't present them as a like-for-like gap.
  - His peer-reviewed paper documents peak burning moving from 1–2 pm to 4–5 pm ([Jethva 2026](https://doi.org/10.3390/rs18101506)).
- **Brazil.** INPE's official trend series uses **Aqua as its single reference satellite**, and its named successor was S-NPP, which is now off ([INPE FAQ](https://data.inpe.br/queimadas/portal/faq/)).

**What practitioners say they lack.**
- NOAA testbed forecasters: "*trust but verify*" and "*are we confident it's a wildfire?*" ([NOAA 2026](https://repository.library.noaa.gov/view/noaa/72837)).
- NASA's stakeholder workshop asked for "**events, not pixels**" and uncertainty ([NASA FireSense](https://cce.nasa.gov/firesense/documents/NASA_Wildfire_Stakeholder_Workshop_Findings_Summary-10122022.pdf)).

**Local angle.**
- VIIRS first saw the Eaton Fire about 7 hours after ignition ([NASA SVS](https://svs.gsfc.nasa.gov/5558)).
- Cal OES's FIRIS fire-intelligence aircraft is based at **Chino Airport** ([Cal OES](https://www.caloes.ca.gov/office-of-the-director/operations/response-operations/fire-rescue/firis/)).
- Chino Hills has burned before: the Freeway Complex Fire (2008) and the Blue Ridge Fire (2020).

### 1.4 The local judges (from the kickoff slide)

| Judge | Background | What will land |
|---|---|---|
| **Jing Han** | PhD Materials Science & Engineering; Senior Scientist, Corporate Core Technologies; biomaterials and polymers; cares about sustainable materials and medical innovation | Calibration against a reference standard, detection limits, uncertainty. The sustainability angle (fire emissions) and the health angle (smoke). |
| **Alex Wilson** | CTO and Lead Programmer; online systems, e-commerce, project-management tools | A fast, reliable, public web app; clean data pipeline; tests; CSV/API export. A "reconciliation" mindset: two ledgers checked against the bank statement. |
| **Anthony Tsai** | PhD Materials Science & Engineering; 10+ years of R&D at an S&P 500 company; teaches 6–12-year-olds; Math Kangaroo director/coach | Hypothesis-driven R&D with pass/fail tests. Elegant, explainable math: logistic POD curve, "divide by the chance of being seen", the classic "count the fish in the pond" estimate and why it breaks. |

Scoring is Impact, Creativity, Validity, Relevance and Presentation, each 1–5. The slide adds: "**Show your evidence, assumptions and current limits.**" Format is ≤7 slides or a ≤30-second video.

### 1.5 Our team's strengths (from Arya's GitHub, WilltheRanger)

- **DBHS Wayfinder** (`interactivemap`): React + TypeScript + Vite, **Leaflet** maps, Supabase, PWA, Vitest. This becomes the AOI map, calendar UI and a public static deploy.
- **InTempo** (`intempo`): Expo/React Native plus a **FastAPI** analysis backend that detects **timing drift bar by bar**, with CI, fixtures and parity tests. This becomes the Python pipeline, drift detection and test discipline. It's the same instinct: *detect when something drifts off its schedule.*

### 1.6 First working piece, measured today (`analysis/drift-check/`)

We measured the drift straight from FIRMS MODIS hotspots. Filters: contiguous US, daytime, vegetation fires, near-nadir pixels. Local solar time = UTC + longitude/15.

| Year | Aqua median local time | Terra median local time | Aqua/Terra daytime detections |
|---|---|---|---|
| 2013–2021 | 13:08–13:10 (flat) | 10:54–10:55 (flat) | 1.27–1.44 |
| 2022 | 13:13 | 10:43 | 1.43 |
| 2023 | 13:25 | 10:29 | 1.45 |
| 2024 | **13:44** | **10:11** | **1.69** |

**Reading:**
- Both overpass times were flat through 2021. Inclination maneuvers stopped in Feb 2020 (Terra) and Mar 2021 (Aqua); the drift starts slowly and accelerates.
- **This week** (FIRMS 7-day files, Nov 7–14, 2026, same filters at 25–50°N), Aqua is at **15:29** and Terra at **08:55**: about 2 h 20 min later and 2 h earlier than their 2013–2021 times. NOAA-20 VIIRS sits at 13:08.
- The 2024 ratio jump fits the physics. Terra now looks earlier in the morning, when fewer fires burn; Aqua looks later, closer to the afternoon peak.
- It is still **only suggestive**, because the regional fire mix differs between years. Testing it properly against real fires is exactly what Anchor does.

---

## 2. The idea in one paragraph

We treat fire satellites like **lab instruments that need calibration**. The reference standard is the record of wildfires that agencies independently reported: where, when, how big and how long. We match millions of reported fires to the hotspots each satellite produced, then measure each satellite's **detection-limit curve**: how big a fire must be before Terra MODIS, Aqua MODIS, S-NPP VIIRS, NOAA-20 VIIRS or NOAA-21 VIIRS sees it. We also measure how that curve **changed as Terra and Aqua drifted**. Inverting those curves turns hotspots, from any satellite in any year, into one estimate of **real fire activity with error bars**. Because the reference never changes, the result is continuous across 2001→2026 and the MODIS-only years can be checked against reality. Every "unusual month" flag carries a measured hit rate. The web app is the burning-activity calendar the challenge asks for. It adds **satellite spec sheets**, a **"seen vs. missed" map** of real fires (Chino Hills is the demo), and an AI assistant that separates observations from estimates from assumptions.

---

## 3. Research framing

### 3.1 The central question

> **When the satellites that recorded 25 years of fire drift, get replaced and switch off, what fixed reference can tell us what they actually saw, and how do we turn that into a fire calendar people can trust?**

| # | Research question |
|---|---|
| **RQ1 Detection limits** | For each fire satellite, what is the probability it detects an independently reported wildfire, as a function of fire size, duration, fuel, region and time of day? What fire size does it detect 50% / 90% of the time (a50 / a90)? |
| **RQ2 Drift & retirement** | How did Terra's and Aqua's detection probability change as their orbits drifted (2020→2026)? What did S-NPP's retirement do to the whole fleet's detection probability? |
| **RQ3 Shared blind spots** | Do satellites miss the *same* fires? How biased are satellite-vs-satellite estimators (ratios, capture-recapture) as a result? |
| **RQ4 Harmonized calendar** | Can reference-calibrated detection limits turn hotspots into a sensor-independent estimate of fire activity that is continuous from 2001 to today, and that reproduces ground-truth monthly activity, including in the MODIS-only era? |
| **RQ5 Decisions & transfer** | Does it make better early-warning calls ("is this month unusual?") than naive or ratio-based calendars? Does the calibration transfer outside the US (Argentina; its space agency CONAE is credited on the challenge page)? |

### 3.2 Why: the problem in detail

1. **A hotspot count measures the satellite as much as the fire.** The challenge names three differences: resolution (1 km vs. 375 m), sensitivity, and observation schedule. A month's count therefore depends on which satellites were flying, where they were pointed and what time they passed, not only on how much burned.
2. **The schedule problem is getting worse quickly.**
   - Terra now passes about 2 hours earlier than it was designed to, and Aqua about 2 hours later.
   - S-NPP is gone, and Terra's morning slot has no replacement.
   - A MODIS→VIIRS factor fitted on 2012–2018 is not valid for 2024–2026. A factor fitted across 2012–2026 is an average of different instruments.
3. **Satellite-to-satellite calibration is circular.**
   - It tells you how MODIS relates to VIIRS, not how either relates to reality.
   - If both miss small, short, cloudy or night-time fires, those shared misses are invisible to every method that only compares satellites: ratios, regressions, ML, degradation and capture-recapture.
   - Scale of the problem: [Fusco et al. 2019](https://doi.org/10.1016/j.rse.2018.10.028) compared MODIS with US agency-reported wildfires. MODIS products detected only **3.5–23.4%** of fires larger than 1 ha.
   - *Under ideal conditions*, Fusco found the active-fire product needed a fire to reach about **78 ha in the West** (10 ha in the East) for a 50% chance of detection. We saw that sentence only in abstract snippets; check the paper before quoting it.
   - [Hawbaker et al. 2008](https://doi.org/10.1016/j.rse.2007.12.008) used **361 Landsat-mapped burn perimeters (≥18 ha, 2003–2005)** and lenient matching: any detection within 1 km during the fire's year counted. MODIS reached 50% detection at about **334 ha (Terra), 195 ha (Aqua) and 105 ha (both together)**.
   - Hawbaker's rates (Terra 66%, Aqua 73%, combined 82%) imply that the two satellites caught the *same* fires more often than chance: 57% caught by both, vs. 48% if they were independent.
   - So a naive "compare-the-satellites" (Lincoln–Petersen) estimate would come out roughly 15% low. This is our arithmetic from their numbers, and it applies to large fires only.
   - Some fires also start and end between overpasses. Their detection probability is zero by construction, so only an outside reference can count them.
4. **Half the record can't be checked by satellites alone.** For 2000–2011 there is no VIIRS to compare against, so any backcast is untestable. Agency records *do* exist for those years.
5. **Users need fires, not pixels.** "One hotspot = one fire" is the first assumption our own brief (`Info.md`) forbids. Practitioners ask for events, uncertainty and "trust but verify".
6. **Real decisions ride on this.**
   - Early-warning comparisons of "this month vs. median".
   - National statistics anchored to single satellites that are drifting or gone: Brazil's INPE series and India's stubble-burning counts.
   - Emissions inventories that feed air-quality and climate assessments: GFED5 already cut MODIS at 2022.

### 3.3 Significance: who benefits and how

- **Emergency managers and firefighters** (CAL FIRE, county OES, Argentina's SNMF) get:
  - a calendar whose "unusual month" flag has a **measured hit rate and false-alarm rate**;
  - units they use (fires, acres);
  - a plain statement of what satellites *cannot* see in their area ("fires under ~N acres are mostly invisible here").
- **Scientists and emissions modelers** (GFED/GFAS/QFED/FINN users) get:
  - satellite-by-satellite detection limits measured across the drift era;
  - a direct test of the independence assumption;
  - a reference-anchored bridge across the MODIS→VIIRS transition.
- **Land managers** get seasonal patterns that reflect real fire activity rather than sensor artifacts, plus small-fire blind spots relevant to prescribed burning (WFIGS labels prescribed burns separately).
- **The public and policy makers** get a way to **audit fire statistics when a reference satellite changes**. The method ports to any country with incident records ("bring your own ground truth").
- **Health and sustainability:** smoke-exposure and carbon estimates inherit detection gaps. Quantifying those gaps is what makes later corrections possible.

### 3.4 Purpose and objectives

- **O1.** Publish a **spec sheet for each of the five fire satellites**: detection limits (a50/a90 with confidence intervals), overpass-time drift and status (active / drifting / retired), all measured against ground truth.
- **O2.** Quantify **drift and retirement effects** on detection, 2012–2026.
- **O3.** Test for **shared blind spots** (dependence of misses).
- **O4.** Build a **reference-calibrated, uncertainty-aware burning-activity calendar** (2001–present) with AOI drawing, accessible ramps and CSV export.
- **O5.** **Validate it** on hold-out years, the MODIS-only era, fleet changes, early-warning skill and an Argentina transfer test.
- **O6.** Ship an **AI assistant** that answers only from computed evidence and labels each claim as observation, estimate, assumption or conclusion.

### 3.5 What is scientifically new

- **What is already done** (prior art; cite it, don't claim it):
  - **MODIS** vs. independent US reference fires, both before the drift: Hawbaker et al. (2008), with 361 Landsat-mapped perimeters, and Fusco et al. (2019), with agency reports.
  - **S-NPP VIIRS** vs. reference fires: [Urbanski et al. 2018](https://doi.org/10.1016/j.rse.2018.10.007) tested a VIIRS 375 m burned-area product on 390 western-US fires (≥14 ha, Jun–Sep 2015, MTBS and incident perimeters). The fire detection rate rose from 47% (10–25 ha) to 86% overall.
- **What is new in Anchor** is the combination, not detection curves themselves:
  - all five fire satellites against the **same** agency record (FPA-FOD 7th ed.), so their curves are directly comparable;
  - millions of fires, including small ones, instead of a few hundred;
  - the **drift years (2020–2024)** and NOAA-21;
  - a test of **shared MODIS–VIIRS blind spots**;
  - using the curves to **harmonize** a calendar and **validating** it, including in the MODIS-only era;
  - drift quantified against an independent reference, which NASA's MODIS land team lists as "under active investigation".
- **Analogues in other fields:**
    - Ships: [Kroodsma et al. 2022](https://doi.org/10.1038/s41598-022-23688-7) used AIS-tracked vessels as a known population to measure satellite radar's detection probability by vessel length, then inferred the unseen. Agency fire records play the role of AIS.
    - Lightning: [Bitzer et al. 2016](https://doi.org/10.1175/JTECH-D-15-0032.1) estimated detection efficiency with no single system treated as truth.
    - Fires, without ground truth: [Sofiev & Kouznetsov 2026](https://doi.org/10.5194/gmd-19-10123-2026).
- **Wording discipline:** don't claim "first VIIRS detection-rate study", because Urbanski 2018 exists. Claim "first five-satellite, drift-era, reference-calibrated harmonization" only after one more literature check.
- **vs. the other ~80 teams:**
  - We use a **non-circular reference**.
  - We are the only approach that can **validate the MODIS-only era**.
  - We **test the assumption** behind the capture-recapture teams.
  - We report in **real-fire units**.
- **Borrowed tools, applied to satellites:**
  - **POD curves and a90/95** from non-destructive testing in materials engineering (MIL-HDBK-1823A).
  - **Horvitz–Thompson** estimation from survey statistics.
  - **Dual-system estimation** from census post-enumeration surveys.

### 3.6 Hypotheses (preregister these today; each has a pass/fail test)

| | Hypothesis | Pass if… |
|---|---|---|
| **H1** | VIIRS detects 50% of fires at a smaller size than MODIS (a50,VIIRS < a50,MODIS) in the same region | The 95% bootstrap CIs don't overlap |
| **H2** | Terra/Aqua POD, adjusted for size and duration, shifts after maneuvers stopped (Terra 2020, Aqua 2021); VIIRS POD doesn't | The 2021–26 year trend is significant for Aqua/Terra and not for VIIRS |
| **H3** | Misses are shared: given a real fire, MODIS and VIIRS co-detection has odds ratio > 1, so the Chapman estimate **undercounts** true fires. Prior evidence: Hawbaker 2008's Terra/Aqua rates imply about 15% undercount. | N̂/N < 1, with the CI excluding 1 |
| **H4** | Our calendar tracks ground truth better than naive merging or a single ratio, on held-out months **and** in 2001–2011 | MAE improvement CI excludes 0 |
| **H5** | Our "unusual month" flag has a higher hit rate at an equal or lower false-alarm rate than the baselines | Better on the ROC-style comparison |
| **H6** (stretch) | Calibrated estimates track Argentina's official provincial fire statistics better than raw counts | Higher correlation, with a bootstrap CI |

If a hypothesis fails, we report it; that is still a finding. This is the "show your evidence, assumptions and current limits" the judges asked for.

---

## 4. Data (record the official URL, version and processing status for each)

| Role | Dataset | Notes |
|---|---|---|
| Satellite observations | **NASA FIRMS** active fire: MODIS C6.1 (Terra, Aqua; MCD14ML), VIIRS 375 m C2 (S-NPP VNP14IMG, NOAA-20 VJ114IMG, NOAA-21 VJ214IMG) — [FIRMS](https://firms.modaps.eosdis.nasa.gov/) · [download](https://firms.modaps.eosdis.nasa.gov/download/) · [API](https://firms.modaps.eosdis.nasa.gov/api/area/) | Archive starts: MODIS Nov 2000; S-NPP Jan 2012 (ended 2 Nov 2026); NOAA-20 Apr 2018; NOAA-21 Mar 2023. Standard (SP) data replaces NRT after about 5 months. Yearly country CSVs exist for MODIS, S-NPP and NOAA-20: `…/data/country/{modis,viirs-snpp,viirs-jpss1}/YYYY/…_United_States.csv`. **NOAA-21 has no yearly country file** (404); use the API (`VIIRS_NOAA21_SP`/`_NRT`) or the archive download. The public 7-day files (`…/data/active_fire/…_7d.csv`) need no key. |
| Reference: most complete, 1992–2024 | **USFS FPA-FOD 7th ed.** (RDS-2013-0009.7, released June 2026) — [catalog](https://www.fs.usda.gov/rds/archive/catalog/RDS-2013-0009.7) | 2.66M wildfire records with discovery/containment dates, final size (acres), location and cause. GeoPackage is 227 MB. Covers the drift years and NOAA-21's first two years. Fallback: the 6th ed. (1992–2020, about 2.3M records). |
| Reference: 2025–today, live | **NIFC WFIGS Incident Locations** — [ArcGIS REST](https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations/FeatureServer/0) | About 392.6k wildfire (WF) records, **effectively 2014 onward** (6 records before 2014). Roughly 13k (2014) to 42k (2025) per year, less complete than FPA-FOD's roughly 80k/yr. Fields include discovery/containment/out times, FinalAcres, PredominantFuelGroup and FireCause. 38,818 prescribed burns (RX) are listed separately, a proxy for managed burning. **Use only for 2025–26, after calibrating it against FPA-FOD on 2014–2024.** |
| Reference: small fires (stretch) | **FIRMS Landsat 30 m** detections | US/Canada, since 2022 |
| Transfer test | **Argentina fire statistics** — [datos.gob.ar](https://datos.gob.ar/dataset/ambiente-incendios-forestales) | The portal lists fire counts by province (2020–2024) and area burned by province and year. We could not open the files to confirm contents or year coverage; check first. |
| Context (optional) | MODIS land cover (MCD12Q1) for fuel/biome strata; TLEs + SGP4 for overpass geometry (the team name!) | |

**Practical warning (observed today):** FIRMS is overloaded this weekend and drops long downloads. Ranged/chunked downloads with retries work: see `analysis/drift-check/chunked_get.sh`. Also file a **FIRMS Archive Download** request (emailed link) early. **Download FPA-FOD immediately.**

---

## 5. Method (pipeline)

1. **Ingest and clean.**
   - Keep raw and processed data separate. Preserve UTC time, lat/lon, satellite, instrument, confidence, FRP, version and day/night.
   - Drop `type` = 1 (volcano) and 2 (static/industrial) hotspots.
   - Build a small `data/sample/` subset (California, 2019–2021).
2. **Match reported fires to hotspots** (the core engineering). For each reported fire *i*:
   - Take its point of origin, start t₀ (discovery) and end t₁ (containment/out; if missing, use a size-based fallback).
   - Compute final area Aᵢ and a search radius Rᵢ = √(Aᵢ/π) + 1 km (pixel and geolocation slack). Run a sensitivity analysis at ±50%.
   - Mark fire *i* **detected by satellite s** if any *s* hotspot lies within Rᵢ during [t₀ − 2 h, t₁ + 12 h].
   - Fit curves only on **isolated fires** (no other reported fire within 10 km in an overlapping window) to avoid mis-attribution.
   - Use DuckDB spatial or H3 indexing to join about 10⁸ hotspots × 10⁶ fires.
   - **Avoid "reference drift."** Fit on FPA-FOD 7th ed. through 2024. Add WFIGS (2025–26) only after measuring how its completeness differs from FPA-FOD on 2014–2024, or restrict to fires large enough that both records are complete.
3. **POD curves (RQ1).**
   - Model per satellite: logit P(detect) = α_s + β_s·log₁₀(acres) + γ_s·log(duration) + fuel/region terms.
   - Report **a50/a90 with bootstrap 95% CIs**, the a90/95 convention from materials NDT.
4. **Drift and retirement (RQ2).**
   - Add year effects for Terra/Aqua vs. VIIRS (2012–2026), controlling for size and duration.
   - Plot them against the **overpass local time measured from the hotspots themselves** (acq_time + longitude/15).
   - Fleet POD over time = 1 − Π(1 − POD_s), corrected for dependence (step 5). This shows the Nov 2026 S-NPP drop.
5. **Shared blind spots (RQ3).**
   - Build a 2×2 table of MODIS × VIIRS detection among real fires, and compute the odds ratio within size strata.
   - Run the Chapman/Lincoln–Petersen estimate on the satellite detections alone and compare it to the true count. The math judge will enjoy this part.
6. **Harmonized calendar (RQ4).**
   - Cluster hotspots into **fire events**: space–time DBSCAN, about 2 km and 1 day.
   - Estimate each event's size class from its hotspot footprint, using a regression calibrated on matched events.
   - Weight each event by **1 / P(fleet detects | size, period)** (Horvitz–Thompson).
   - Monthly totals per AOI = **estimated fires ≥ T acres** (T where fleet POD is reliable), plus an acres-weighted variant.
   - **Propagate uncertainty**, true to our team name: bootstrap the POD parameters, size assignment and Poisson noise, and show 80% intervals.
   - **Unusual month** = the 80% interval sits entirely above the historical P75 (a conservative flag).
   - **Outside the US**, apply biome-matched POD with a "transferred" label and wider uncertainty.
7. **Serve.** Precompute Parquet/JSON per region (state/county/province grid) for a static-first app, plus a small FastAPI service for custom AOIs (stretch).

**Technical complexity, for the judges:**
- A spatiotemporal join at the 10⁸ × 10⁶ scale.
- A GLM with bootstrap and an a90/95 analysis.
- A dependence-corrected Horvitz–Thompson estimator.
- Space–time event clustering.
- End-to-end uncertainty propagation.
- A test-backed web app.
- Optional SGP4 orbit propagation, to reconstruct when each satellite *could* have seen each fire.

---

## 6. Validation (maps onto `Info.md` Experiments A–D, plus E)

| Exp. | Test | Truth / metric |
|---|---|---|
| **A. Sensor comparison** | POD curves and a50/a90 per satellite; co-detection dependence; FRP of jointly detected fires | Agency records |
| **B. Historical consistency** | (i) Hold-out years: fit 2012–2017 + 2019–2022; test 2018 and 2023–2024 (FPA-FOD 7th ed.), then 2025–26 (WFIGS, after the reference calibration in §5). (ii) **MODIS-only backcast 2001–2011** vs. FPA-FOD (impossible for satellite-only methods). (iii) Continuity across fleet changes: NOAA-20 added in 2018, the Aqua FMU failure Aug–Sep 2020, the S-NPP outage 27 Jul–10 Aug 2022, NOAA-21 added in 2023, S-NPP retired 2 Nov 2026 | Monthly MAE/correlation vs. truth; estimated step change ≈ 0 for us vs. raw counts |
| **C. Unusual activity** | Define a "truly unusual month" from ground truth (top 20% for that calendar month). Score each method's flag. | Hit rate, false-alarm rate, Brier score |
| **D. Data reliability** | Missing data and outages, duplicate/overlapping detections, low-confidence hotspots, match radius ±50%, isolated vs. all fires, prescribed (RX) burns | Sensitivity of every headline number |
| **E. Transfer** (stretch) | Argentina provinces 2001–2024: calibrated vs. raw satellite estimates against official statistics | Correlation with bootstrap CI |

**Baselines we must beat:**
1. Naive merged counts.
2. A single global MODIS→VIIRS ratio.
3. A regional-seasonal ratio.
4. (Optional) capture-recapture on satellites only.

---

## 7. The web app (Info.md's five screens, upgraded)

1. **Overview map.**
   - Leaflet (reuse DBHS Wayfinder), with AOI drawing or lat/lon entry, date range and sensor filters.
   - A **"seen vs. missed" layer**: every reported fire colored by which satellites caught it (none / MODIS / VIIRS / both).
2. **Burning-activity calendar.**
   - Years × months heat-map of the harmonized estimate, with uncertainty hatching.
   - Accessible ramp (cividis/viridis); toggle to raw per-sensor counts; **CSV download**.
3. **Satellite spec sheets** (replaces "Sensor comparison").
   - One card per satellite: POD curve, a50/a90, measured overpass-time drift, status (active / drifting / retired 2 Nov 2026).
4. **Anomaly explorer.**
   - This month vs. historical median, with intervals and fleet-change flags.
   - The **measured early-warning skill** of the flag.
5. **AI research assistant.**
   - The model calls tools over the precomputed tables.
   - Every sentence is labeled *Observation / Estimate / Assumption / Conclusion*. It refuses the five forbidden assumptions in `Info.md`.
   - It is tested on an `evaluation-cases.md` of known-answer questions built from ground truth.
6. **Local demo:** "Your neighborhood from space". Reported fires within about 25 km of Chino Hills since 2012: how many did space see?

**What it shows that a static NASA fire map cannot:**
- What the satellites *can't* see (detection limits by size, per satellite).
- A history that doesn't jump when satellites change or drift.
- Whether this month is *really* unusual, with a measured error rate.
- Fires, not pixels.

---

## 8. WOW beats (slide or video order)

1. "**Twelve days ago NOAA switched off Suomi-NPP. In about 3 months Terra goes dark. Aqua already looks at Earth 2 hours late.**" Show a drift chart measured from FIRMS data.
2. "**So which number do you trust? We asked the ground.**" Show the seen-vs-missed map around Chino Hills.
3. "**Every satellite's detection limit, measured against firefighter records.**" Show the spec-sheet cards with a50 in acres or football fields.
4. "**Satellites miss the same fires, so methods that only compare satellites can't see what's missing.**" Show H3.
5. "**One calendar, anchored to the ground, consistent 2001–2026, with honest error bars.**"
6. "**It flags real unusual months and avoids false alarms.**" Show the skill numbers.
7. "**Works anywhere you have fire records: tested in Argentina.**"

*(Numbers come only from pipeline outputs. Never hand-type a headline figure.)*

---

## 9. Judge alignment

| Criterion (1–5) | How Anchor earns a 5 |
|---|---|
| **Impact** | Named users (emergency managers, scientists, land managers, national statistics offices); measured early-warning skill; timely (S-NPP retired, MODIS ending) |
| **Creativity** | The only reference-standard approach we found among this challenge's public repos; borrows POD/a90 from materials NDT and dual-system estimation from census statistics |
| **Validity** | Preregistered hypotheses; independent ground truth; validates the MODIS-only era; sensitivity analyses; limits stated |
| **Relevance** | Exactly the requested harmonized calendar (AOI, date range, CSV, accessible colors) built on NASA FIRMS MODIS + VIIRS. The 2026 guide (as quoted by other teams; the official site was down) asks that NASA data be "integral, not a superficial add-on". Here NASA data is the thing being measured and harmonized; agency fire records are only the yardstick. |
| **Presentation** | One sentence anyone gets ("we checked the satellites against real fires"), one striking map, one honest calendar |

**Per-judge framing:**
- **Jing Han and Anthony Tsai (materials PhDs):** "We characterized five instruments the way you'd qualify a sensor in the lab: calibration against a certified reference, detection limits, drift checks, an uncertainty budget."
- **Anthony Tsai (Math Kangaroo):** the "fish in the pond" estimate on one slide, and the twist where it fails because the same fish are always hardest to catch.
- **Alex Wilson (CTO):** a live public link that works without sign-in, sub-second calendar loads (precomputed), tests in CI, CSV/API, and the reconciliation metaphor: "two satellite ledgers reconciled against the bank statement."

---

## 10. Execution plan (from now to submission)

**First 60 minutes**
- Assign roles.
- Get a free FIRMS `MAP_KEY`.
- Start the **FPA-FOD GeoPackage** download.
- Request a FIRMS Archive Download for California + Argentina.
- Start the chunked yearly-CSV downloads.
- Pull WFIGS (paginate 2,000 records per request).
- Preregister H1–H6 in `research/`.

| Block | Data/Science | App (Arya) | Story/QA |
|---|---|---|---|
| H0–H6 | Ingest; California matchup; sample dataset; data dictionary | Scaffold Vite + React + Leaflet; data contract (JSON schema); AOI draw | `scientific-glossary.md`, `sensor-differences.md`, `data-limitations.md` |
| H6–H12 | POD curves, a50/a90, drift by year, H3 → **first WOW charts** | Calendar heat-map + spec-sheet cards with real JSON | Draft 7 slides and demo script; screenshot for check-in |
| H12–H20 | Calendar estimator; validation B/C/D | Seen-vs-missed map; anomaly explorer; CSV export | `evaluation-cases.md` from ground truth |
| H20–H26 | Expand to the West/CONUS; Argentina transfer (E) | AI assistant (tool-calling, labeled claims); deploy (Cloudflare Pages / Vercel) | Project page text; AI/SI disclosure; credits |
| H26–end | Freeze numbers; rerun pipeline from scratch | Polish, performance, accessibility; link tests while signed out | Final slides or 30-second video; submit; check the success banner |

**MVP (must ship):** California + CONUS-West POD curves, drift chart, H3, harmonized California calendar with intervals, validation B(i–iii) + C, four app screens, CSV.

**Stretch:** CONUS-wide, Argentina transfer, AI assistant, Landsat small-fire reference, SGP4 overpass opportunities, custom-AOI backend, global "transferred" calendar.

---

## 11. Risks, assumptions, limitations (state these on the project page)

**Agency records are incomplete and not perfectly located.**
- Small fires are unevenly reported between states (Fusco 2019).
- Points of origin aren't fire footprints.
- Mitigations: isolated-fire fitting, a size-scaled radius, ±50% sensitivity, FPA-FOD (most complete) for fitting, WFIGS for 2021–2026.

**Agricultural burning is mostly absent from US wildfire records.**
- US curves describe wildfire-like fires.
- Mitigations: report prescribed (RX) burns separately as a managed-burn proxy, and label transferred estimates elsewhere with wider uncertainty.

**Transfer across biomes is an assumption.** We test it in Argentina and say so plainly where it's untested.

**Prior art narrows the novelty.** Hawbaker 2008, Fusco 2019 and Urbanski 2018 already built detection curves for MODIS or S-NPP VIIRS. Pitch the combination: five satellites, one reference, the drift years, and harmonization plus validation. Not "first detection curves".

**Reference drift.** FPA-FOD and WFIGS differ in completeness, so switching between them can fake a trend. Mitigations: calibrate on the overlap years, or restrict by fire size.

**Fire duration is uncertain** where containment or out times are missing. We use a size-based fallback and a sensitivity test.

**FIRMS overload this weekend.** Chunked downloads, archive emails, and California first.

**Time.** If behind schedule, cut scope geographically, not scientifically.

---

## 12. Alternatives we considered (and how they fold in)

| Idea | Verdict |
|---|---|
| **B. Drift Detective**: measure Terra/Aqua overpass drift and its effect on counts using only FIRMS | Strong, fast, partly explored by others. **Folded in** as the spec-sheet drift panel and WOW beat #1. |
| **C. "Your neighborhood from space"**: SoCal seen-vs-missed fires | Great local hook. **Folded in** as the local demo. |
| **D. Dangerous-fire calendar**: count only fires big enough that every satellite sees them | Simple and robust. **Folded in** as the high-confidence calendar tier (fires ≥ a90). |
| **E. Anomaly explainer**: waterfall of fleet / drift / cloud / weather / residual | Novel but heavy. **Stretch.** |
| **F. Capture-recapture across satellites** | Taken by at least 2 teams. Our H3 *tests* its independence assumption. Aqua's drift also breaks its "same time" assumption. And fires that burn entirely between overpasses are invisible to it by construction, while ground truth counts them. |
| **G. Pivot to "Flame in Freefall"** (microgravity combustion; the judges are materials scientists) | **Not recommended.** About 375 public repos created since September mention it, vs. about 320 for ours, so it's equally crowded, and we'd lose today's prep. We capture the judge fit through measurement-science framing instead. |

---

## 13. Draft answers to the eight questions in `Info.md`

1. **What exact problem are we addressing?** Hotspot counts from MODIS and VIIRS can't be compared across sensors or years. Every existing fix calibrates the satellites against each other, which hides the fires they all miss and breaks as satellites drift and retire.
2. **Why is it important?** Early warning, national fire statistics and emissions inventories all depend on this record, and its instruments are changing now: S-NPP was retired 2 Nov 2026, Terra ends around Feb 2027, and Aqua has drifted about 2 hours.
3. **Why are existing satellite records insufficient?** They are presence-only, sensor-specific and schedule-dependent. They undercount small fires. MODIS needed about 78 ha in the western US for a 50% chance of detection under ideal conditions (Fusco 2019), and 195 ha for Aqua alone (Hawbaker 2008). They have no independent check for 2000–2011.
4. **Which NASA datasets?** FIRMS MODIS C6.1 (Terra/Aqua) and VIIRS 375 m C2 (S-NPP/NOAA-20/NOAA-21). Optionally FIRMS Landsat 30 m and MODIS land cover.
5. **What is scientifically new?** Earlier studies measured single sensors against reference fires (MODIS: Hawbaker 2008, Fusco 2019; S-NPP VIIRS: Urbanski 2018). We calibrate **all five** fire satellites against the **same** agency record (FPA-FOD 7th ed.) through the **drift years**. We test shared MODIS–VIIRS blind spots. And we use the curves to build and validate a harmonized calendar, including the MODIS-only era.
6. **How do we know the results are reliable?** Preregistered pass/fail hypotheses, held-out years, the MODIS-only backcast, fleet-change continuity tests, early-warning skill scores, sensitivity analyses and a transfer test.
7. **Who benefits?** Emergency managers and firefighters, fire and emissions scientists, land managers, statistics agencies (INPE, CAQM, SNMF) and the public.
8. **What can our app show that a static NASA fire map can't?** What satellites can't see, a history that doesn't jump when satellites change, whether this month is really unusual (with an error rate), and fires rather than pixels.

---

## 14. AI/SI disclosure and references

**Disclosure.** This proposal was drafted with an AI assistant (Claude Code), which searched the web and GitHub, read our repo and slides, and summarized sources. The team must verify every claim and number before using it. Disclose AI use for research, code and text on the project page, per the event's AI/SI rules.

**References (verify each before citing):**
- Fusco, E.J. et al. (2019). Detection rates and biases of fire observations from MODIS and agency reports in the conterminous United States. *Remote Sensing of Environment* 220, 30–40. [record](https://experts.colorado.edu/display/pubid_247828)
- Hawbaker, T.J. et al. (2008). Detection rates of the MODIS active fire product in the United States. *RSE*. [doi](https://doi.org/10.1016/j.rse.2007.12.008)
- Giglio, L. et al. (2016). The collection 6 MODIS active fire detection algorithm and fire products. *RSE*. [doi](https://doi.org/10.1016/j.rse.2016.02.054)
- Schroeder, W. et al. (2008). Validation of GOES and MODIS active fire detection products using ASTER and ETM+ data. *RSE*. [doi](https://doi.org/10.1016/j.rse.2008.01.005)
- Schroeder, W. et al. (2014). The New VIIRS 375 m active fire detection data product. *RSE*. [doi](https://doi.org/10.1016/j.rse.2013.12.008)
- Fu, Y. et al. (2020). Fire Detection and Fire Radiative Power in Forests and Low-Biomass Lands in Northeast Asia: MODIS versus VIIRS. *Remote Sensing*. [doi](https://doi.org/10.3390/rs12182870)
- Jethva, H. (2026). Timing the Flames: Geostationary Satellite Detection of Diurnally Shifting Stubble Burning in Northwestern India. *Remote Sensing*. [doi](https://doi.org/10.3390/rs18101506)
- Urbanski, S. et al. (2018). A VIIRS direct broadcast algorithm for rapid response mapping of wildfire burned area in the western United States. *RSE* 219, 271–283. [doi](https://doi.org/10.1016/j.rse.2018.10.007)
- Kroodsma, D. et al. (2022). Ship detection with SAR vs. AIS (detection probability by size). *Scientific Reports*. [doi](https://doi.org/10.1038/s41598-022-23688-7)
- Bitzer, P. et al. (2016). Estimating detection efficiency of lightning systems without ground truth. *JTECH*. [doi](https://doi.org/10.1175/JTECH-D-15-0032.1)
- Chen, Y. et al. (2026). GFED5 update, *ESSD*. [doi](https://doi.org/10.5194/essd-18-7535-2026)
- Sofiev, M. & Kouznetsov, R. (2026), *GMD*. [doi](https://doi.org/10.5194/gmd-19-10123-2026)
- Zheng et al. (2026). MODIS–VIIRS FRP harmonization, *Remote Sensing* 18, 1650. [doi](https://doi.org/10.3390/rs18101650)
- Giglio, L. (2025). Orbit drift impacts on MODIS fire products, LANCE UWG. [slides](https://landweb.modaps.eosdis.nasa.gov/data/filePost/LANCE_UWG_Orbit_Drift_Giglio_202505.pdf)
- Short, K.C. (2026). Spatial wildfire occurrence data for the United States, 1992–2024 [FPA_FOD_20260615] (7th ed.), RDS-2013-0009.7. [catalog](https://www.fs.usda.gov/rds/archive/catalog/RDS-2013-0009.7)
- NASA MODIS LDOPE, "MODIS - Terra/Aqua Drift" (8 Jan 2026). [notice](https://landweb.modaps.eosdis.nasa.gov/displayissue?id=1254) · NASA LAADS, MODIS–VIIRS transition. [pdf](https://ladsweb.modaps.eosdis.nasa.gov/learn/modis-to-viirs-transition/MODIS-VIIRS_Transition.pdf)
- NIFC WFIGS Incident Locations. [service](https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations/FeatureServer/0)
- NASA FIRMS. [site](https://firms.modaps.eosdis.nasa.gov/) · [Earthdata MODIS→VIIRS transition](https://www.earthdata.nasa.gov/data/alerts-outages/transition-from-modis-viirs)
- MIL-HDBK-1823A, *Nondestructive Evaluation System Reliability Assessment* (POD and a90/95 methodology).

---

## 15. Verification log (second pass, Nov 14 afternoon)

Every claim above was re-checked against primary sources where possible. What changed:

| Claim | Status | Correction / evidence |
|---|---|---|
| Suomi-NPP decommissioned 2 Nov 2026 | ✅ Verified | CIMSS: decommissioned 15:40 UTC, 2 Nov 2026 |
| Terra ends ~Feb 2027, Aqua ~Sep 2027 | ✅ Verified (projected) | NASA Science, "Terra: the end of an era" (updated 20 Mar 2026) |
| Aqua ~2 h later, Terra ~2 h earlier | ✅ **Measured by us** | FIRMS 7-day files, Nov 7–14, 2026, 25–50°N near-nadir: Aqua 15:29 (was 13:10), Terra 08:55 (was 10:55) |
| Drift effect "under active investigation" | ✅ Verified, re-attributed | Source is NASA's MODIS LDOPE notice (8 Jan 2026), which links Giglio's 2025 slides; not a direct Giglio quote |
| GFED5 ends MODIS record in 2022 due to drift | ✅ Verified | Chen et al. 2026, ESSD: "ends in 2022, when orbital drift-induced changes surpassed the thresholds" |
| No MODIS-like morning follow-on | ✅ Verified | LAADS transition PDF (verbatim quote in §1.3). Non-NASA morning sensors exist (Sentinel-3) |
| "~80 competing repos" | ❌ **Undercount** | About 320 repos created since Sep 2026 mention "MODIS and VIIRS Hot Spots"; about 375 mention "Flame in Freefall" |
| Nobody uses agency fire records | ⚠️ Holds, with a caveat | Not seen in two code searches; GitHub code search doesn't index every new repo |
| Hawbaker 2008 used agency records | ❌ **Wrong** | 361 Landsat-mapped perimeters (≥18 ha, 2003–05) with year-long matching. The 66/73/82% and 105/195/334 ha numbers are verified |
| "~15% Lincoln–Petersen undercount" | ✅ Arithmetic verified | 0.66 × 0.73 / 0.57 = 0.845; applies to large fires in Hawbaker's set |
| Fusco 2019: 78 ha (West) for 50% detection | ⚠️ Qualifier added | "Under ideal conditions"; 3.5–23.4% range verified; exact threshold sentence seen only in snippets |
| No VIIRS-vs-reference detection study exists | ❌ **Wrong** | Urbanski et al. 2018 (RSE): S-NPP VIIRS on 390 western-US fires (2015), 47%→86% by size. Novelty narrowed to the combination (§3.5) |
| Sofiev & Kouznetsov 2026 numbers | ✅ Verified | 78% / 88% for powerful fires; <30% / <40% in some equatorial areas; 20–23% FRP gap tied to Aqua's later overpass |
| Kroodsma 2022 ship analogy | ✅ Verified | 25–27% of AIS vessels undetected by SAR; detection vs. length used to infer the unseen |
| All 14 DOIs | ✅ Resolve correctly | Checked via Crossref (incl. Bitzer 2016 JTECH) |
| FPA-FOD = 1992–2020 | 🔄 **Superseded** | **7th edition, 1992–2024, 2.66M records (June 2026)**: use it |
| WFIGS = 2003–today | ❌ **Misleading** | Effectively 2014 onward (6 earlier records); about 13–42k WF/yr; 38,818 RX burns separate |
| FIRMS NOAA-21 yearly path `viirs-jpss2` | ❌ **Wrong** | 404. Use the API or archive for NOAA-21 |
| Punjab 4,459 vs ~34,000 | ❌ **Apples-to-oranges** | 4,459 = Punjab only (CAQM, to 8 Nov); ~34,000 = Punjab + Haryana (Jethva, 1 Oct–9 Nov) |
| 77% of Haryana farmers survey | ⚠️ Unverified, removed | Source returned 403 |
| INPE uses Aqua, S-NPP as successor | ✅ Verified | INPE FAQ |
| Eaton first VIIRS detection 01:30 Jan 8 | ✅ Verified | NASA SVS 5558 |
| FIRIS aircraft at Chino Airport | ✅ Verified | Cal OES: "OES Intel 24 … at Chino Airport" |
| Practitioner quotes | ✅ Verified | NOAA testbed report ("trust but verify", "are we confident it's a wildfire?"); NASA workshop ("events, not pixels") |
| Saanjh / BlindSpot are Space Apps teams | ⚠️ Unconfirmed | Labeled as public repos only |
| Must we use NASA data? | ✅ Yes, as the core | Kickoff slide ("using NASA information"), submission field "NASA resource use", and the 2026 guide as quoted by other teams ("integral, not a superficial add-on"). The official site was down, so re-check it when it's back |
