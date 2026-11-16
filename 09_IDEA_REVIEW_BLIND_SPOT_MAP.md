# 09 IDEA REVIEW: Clock Audit (v0.3, replaces the Blind-Spot Map)

Status: **PROPOSAL for team review. NOT decided.** The team lead decides after reviews come back.
Version: **v0.3**, Sat Nov 14, 2026, about 12:35 PM Pacific. **Replaces v0.1 and v0.2. Delete those from your AI.**
Written by: the team lead.
Privacy: roles, not names. Safe to share inside the team. Do not post publicly until the team lead approves.

---

## Why v0.3 exists

A deeper check found three problems with the v0.2 "Blind-Spot Map" and one better use of the same machinery.

1. **A global "where does fire burn late" map mostly rediscovers known science.** Giglio 2007 already showed that across 15 tropical and subtropical regions, peak burning falls between 13:00 and 18:30 local time. So a later-looking Aqua would see more fire almost everywhere in the tropics. The map would mostly show the normal daily fire cycle, not a hidden problem.
2. **The v0.2 map's strongest years (2024 and 2025) are the years when Aqua's sampling also changed.** Separating clock from sampling was the map's biggest unsolved problem.
3. **Geostationary satellites already measure the daily fire cycle directly.** v0.2 had no strong answer to "why not just use them?"
4. **The better use:** some official fire statistics still use Aqua as their reference satellite today. For an Aqua-based series, it doesn't matter whether the error comes from the clock or from sampling: **both are errors in that series.** Problem 2 disappears.

---

## How to use this file

1. Upload this file to your AI next to files 00 to 08. Remove v0.1 and v0.2.
2. Paste the prompt in section 11.
3. Post your AI's verdict in the group chat by **1:15 PM** (after the kill test).
4. Keep working in your lane. The Punjab kill test at 1 PM is needed under every option.

---

## Instructions to the AI reviewing this

- You are a skeptical reviewer, not a cheerleader. Find what breaks.
- Check every factual claim with web search where you can. Mark each one CONFIRMED, WRONG, or COULD NOT CHECK.
- Never invent data, numbers, or citations.
- Compare options A, B, and C in section 1 on the rubric (file 08), 1 to 5 each.
- Answer the questions in section 10. Under 400 words. Bullets.

---

## 1. Three options

| | A. Current plan (file 01) | B. Blind-Spot Map (v0.2) | **C. Clock Audit (recommended)** |
|---|---|---|---|
| Headline | Fixed-clock calendar + drift chart + L for preset regions | World map of late burning | Audit of a real official fire series that still uses Aqua, plus a fixed-clock replacement series |
| Named user | Not chosen | Air-quality analyst (vague) | Anyone using Brazil's official INPE fire counts: journalists, state agencies, researchers |
| Main weakness | Close to what rivals already ship (FireCal, Fire Harmony) | Duplicates Giglio 2007; clock vs sampling confound | Audit may find a small bias (still a real result) |

Rubric guesses (the team lead's AI's judgment, not facts; reviewers should rescore):

| Criterion | A | B | C |
|---|---|---|---|
| Impact | 3 | 3 | 4 to 5 |
| Creativity | 3 | 4 | 4 |
| Validity | 4 | 2 to 3 | 4 |
| Relevance | 5 | 3 to 4 | 5 |
| Presentation | 3 | 4 | 4 to 5 |

---

## 2. The problem (verified facts)

- **Aqua's afternoon clock has drifted.** Aqua made its final orbit correction in 2021. Over Punjab its average pass time went 1:44 PM (2021), 1:53, 2:05, 2:32, to 3:12 PM (2025) (Jethva 2026), heading for about 3:50 PM by August 2026. NASA also reports changes to MODIS pixel size, scan gaps, and spatial sampling, which "seem to have abruptly increased in magnitude in late 2024."
- **The flagship global fire database stopped because of it.** GFED5 "ends in 2022, when orbital drift-induced changes surpassed the thresholds defined for high-quality science products" (GFED5NRT paper, ESSD 2026). Professionals are switching to VIIRS.
- **Brazil's official fire statistics still use Aqua.** INPE's Programa Queimadas uses "AQUA_M-T (MODIS sensor, early-afternoon pass)" as its reference satellite for year-to-year comparison. Brazilian state bulletins from March and April 2026 and a news site launched in late October 2026 still describe Aqua as the reference.
- **INPE chose Aqua for its clock.** INPE's FAQ says Aqua was chosen for its "more regular orbit and more stable sensor" and for generating images "at close times over the years." The FAQ does not mention orbit drift. It also says the earlier switch from NOAA-12 to Aqua "caused a discontinuity" in the series. So INPE already knows a change in viewing time breaks the series.
- **INPE's named successor is gone.** INPE's FAQ says the reference will become S-NPP VIIRS when Aqua stops. NOAA ended delivery of all S-NPP data on November 1, 2026. Aqua MODIS data collection is planned to end around September 2027 (CAMS).
- **These numbers make headlines.** INPE reported Amazon fires in 2024 as the most in 17 years (140,328), and 2025 as the fewest since 1998 (just over 43,000, down 69%). Both were counted in Aqua's drift years.
- **The series covers more than Brazil.** INPE publishes reference-satellite statistics for South American countries, including Argentina (the challenge author CONAE is Argentina's space agency).

---

## 3. The research question and purpose

**Question:** How much of the change in an Aqua-based fire record since 2021 comes from the satellite (its drifting clock and changing sampling) rather than from fire on the ground? And what would the record show if the clock had stayed fixed?

**Named user and decision:**
> A journalist, state environmental analyst, or researcher using Brazil's official INPE fire counts needs to decide **whether this year's "record high" or "record low" can be compared with years before 2021**. Today nothing tells them that the satellite behind the count changed how it looks.

**Pitch for non-expert judges:** "Brazil reported its fewest Amazon fires since 1998 last year. That count comes from a NASA satellite whose afternoon look has slipped from 1:30 PM to after 3 PM. We built the tool that shows how much of a fire trend is the fire and how much is the satellite's clock, and keeps the count going after that satellite shuts down."

Note: the record low may well be mostly real. MapBiomas, which uses Landsat imagery and so isn't affected by Aqua's clock, reported burned area in Brazil down about 65% in the first ten months of 2025. Our job is to measure, not to debunk.

---

## 4. What we build

1. **Harmonized fixed-clock calendar (required).** Month by year from 2002, anomaly against the historical median, region and date selection, CSV download. Unchanged from file 01.
2. **Clock audit panel (new headline).** For each region: the Aqua-based count, the fixed-clock count, and the gap between them by year since 2021, with ranges. One sentence explains it.
3. **Drift chart (unchanged).** What local time Aqua actually looked at the region, year by year.
4. **Continuity series.** The count expressed in "original Aqua units" (Aqua's 1:30 PM clock and pre-drift sampling), built from VIIRS. It continues past S-NPP's end using NOAA-20 and NOAA-21, and past Aqua's end in 2027.

Regions:
- **Brazil by biome** (Amazon, Cerrado, Pantanal, others as time allows). Hero case.
- **Punjab and Haryana.** Positive control. Validates the drift measurement against published pass times.
- **Optional:** Argentina (the challenge author's country, also in INPE's statistics) or Southern California (local relevance). Cut first if behind.

---

## 5. Why the audit avoids the confound that broke v0.2

The late-burning index L from file 01 is unchanged:

$$L_y = \frac{(\text{Aqua} / \text{VIIRS})_y}{(\text{Aqua} / \text{VIIRS})_{2012-2020}}$$

- VIIRS (1:30 PM, stable orbit) is the fixed clock. In 2012 to 2020, Aqua and VIIRS differed by sensor plus a roughly constant timing offset (Aqua saw most fires about 13:00 to 14:00 local time, S-NPP about 12:00 to 13:30; Sofiev and Kouznetsov 2026). The ratio over those years absorbs both.
- After 2021, any change in that ratio means Aqua's count moved relative to the fixed clock. **L minus 1 is the fractional error in an Aqua-based series.**
- For v0.2's question ("is fire burning later?") we had to separate clock, sampling, and behaviour. **For the audit we don't:** all three are reasons the Aqua-based series stopped measuring the same thing as before 2021. We report them as one number and say so.

Fixed-clock series in original Aqua units, for month m of year y in region r:

$$\text{Aqua}^{\text{fixed}}_{y,m,r} = \text{VIIRS}_{y,m,r} \times \left(\frac{\text{Aqua}}{\text{VIIRS}}\right)_{2012-2020,\,m,\,r}$$

---

## 6. Method (changes from file 01 in bold)

- Filters: daytime only, vegetation type, MODIS confidence 30 or higher, VIIRS nominal or high. Unchanged for the calendar.
- **Audit unit: raw daytime hotspot counts**, because that is what INPE publishes. The calendar keeps fire cell-days.
- **Region unit: Brazilian biomes**, by looking up each detection's 0.1° grid cell in a biome map (IBGE biome boundaries, open data). Faster than polygon joins on millions of points.
- **VIIRS reference:** S-NPP for 2012 to Oct 2026. NOAA-20 linked to S-NPP over their 2018 to 2026 overlap (one rival reports a yearly NOAA-20 to S-NPP ratio of 0.97 to 1.07). **Drop S-NPP outage days for both sensors** (e.g., Nov 2 to 8, 2024).
- **Years:** report every year 2021 to 2025 with ranges. 2026 is near-real-time data without the vegetation "type" column, so it's flagged as provisional.
- Bootstrap ranges and a 2012 to 2020 noise floor. Unchanged.
- **Data:** FIRMS yearly country CSVs for Brazil and India. Check which years they include (rival READMEs disagree on whether 2025 is there); use an archive request or the API for any gap.

---

## 7. Validation

1. **Kill test (unchanged, 1:00 PM today):** Aqua's median local time over Punjab must move later from 2021 to 2025 in the same pattern as Jethva's published times (roughly +90 minutes). Don't require a 15-minute match per year: the paper doesn't define its times exactly.
2. **Reproduce INPE (new):** INPE says its reference data "coincide" with the NASA/University of Maryland Collection 6 detections. Our FIRMS Aqua afternoon counts for Brazil should closely match INPE's published monthly reference counts (CSV download on INPE's statistics page). If they match, our audit speaks directly to INPE's series.
3. **Independent check (if time):** MapBiomas Fire Collection 5 annual burned area by biome (Landsat-based, 1985 to 2025, open). If the Aqua series has drifted away from both the VIIRS fixed-clock series and MapBiomas since 2021, that is strong evidence of a satellite artifact.
4. **Placebo:** leave out one year from 2012 to 2020 and compute its L against the others. Held-out years should sit inside the noise floor.

---

## 8. Novelty (honest)

- **Known:** drifting overpass times create spurious fire trends (Giglio 2007, for the old AVHRR record). Aqua's drift affects fire products (NASA MODIS team). GFED5 stopped at 2022 because of it. The drift partly explains Punjab's MODIS vs VIIRS gap (Jethva 2026). NASA scientists proposed using the drift for fire science in 2022.
- **Rivals:** none of the Space Apps 2026 repos we read uses the drift; they exclude those years. Kiln Watch already expresses VIIRS in "Aqua-equivalent" units for Bangladesh, so the continuity series is not new on its own.
- **What we did not find:** any published estimate of how Aqua's drift has bent INPE's reference-satellite series, or a tool that audits an Aqua-based official series region by region. INPE's FAQ does not mention the drift. We cannot certify nobody has done it. Wording: "we did not find," never "first."

---

## 9. Risks

1. **The bias may be small.** Then the finding is "Brazil's official trend survives the drift," with a fixed-clock series to keep using. Less dramatic, still useful and publishable. Decide the pitch after seeing the numbers.
2. **INPE's AQUA_M-T may not exactly match FIRMS Aqua.** Validation step 2 tells us. If they differ, we audit "the FIRMS Aqua record that INPE's method is based on" and say so.
3. **VIIRS isn't perfect either.** S-NPP had outages in 2024 and ended in November 2026. Handled in section 6.
4. **The daily fire cycle differs by biome.** Forest fires peak earlier than savanna fires (Giglio 2007), so the bias may have opposite signs in the Amazon and the Cerrado. That is a feature to report, not a bug.
5. **Biome lookup and data volume.** Brazil has millions of detections per year. Process year by year.
6. **Scope creep.** Brazil plus Punjab is the core. Everything else is optional.

---

## 10. Questions for the reviewing AI

1. Does INPE (or anyone) already correct its reference-satellite series for Aqua's drift? Search in English and Portuguese.
2. Is the logic in section 5 sound: is L minus 1 a fair measure of the error in an Aqua-based series?
3. Is VIIRS a stable enough fixed clock? What could make the VIIRS side drift?
4. Can four high schoolers build C by Sunday 6 PM? What would you cut first?
5. Rescore A, B, and C on the five rubric criteria.
6. What is the hardest question a NASA judge would ask about C, and our best answer?
7. Does anything here break a rule in file 04?

---

## 11. Prompt to paste into your AI

> I'm on team Propagators. Read files 00 to 09 (file 09 is v0.3). File 09 compares three options for our project. Follow the reviewer instructions at the top of file 09. Be harsh and specific, and verify claims with web search. Give me: (1) a fact-check list marking each claim CONFIRMED, WRONG, or COULD NOT CHECK; (2) rubric scores for A, B, and C; (3) answers to the 7 questions in section 10; (4) your vote: A, B, C, or C WITH CHANGES, with one reason. Under 400 words.

---

## 12. Decision, timing, and the AI rule

| Time | What |
|---|---|
| 1:00 PM | Kill test on Punjab. Needed under every option |
| By 1:15 PM | Each teammate posts their AI's vote |
| 1:20 PM | Team lead decides A, B, or C |
| After the decision | Data lead adds Brazil FIRMS files (if C) |


If C is adopted, the team lead updates files 01 (sections 1, 3, 4, 5, 6, 7, 9, 10), 03 (problem, prior work, timing-offset fix, 3:50 PM endpoint, INPE), 05 (Brazil tasks, validation steps), 06 (audit fields in the JSON), and 07 (new decision, Q2 and Q3 closed) and posts v1.4. Arya's `Info.md` plan in the repo would be marked as superseded.

---

## 13. Sources

- Giglio 2007, tropical diurnal fire cycle (peaks 13:00 to 18:30): https://modis.gsfc.nasa.gov/sci_team/pubs/abstract_new.php?id=02205
- GFED5NRT preprint, ESSD 2026 (GFED5 ends 2022 due to drift): https://essd.copernicus.org/preprints/essd-2026-158/essd-2026-158-ATC1.pdf
- INPE Programa Queimadas FAQ (reference satellite, why Aqua, NOAA-12 discontinuity, S-NPP as successor): https://data.inpe.br/queimadas/faq/
- INPE statistics by country, state, biome (CSV, since 1998): https://data.inpe.br/queimadas/estatisticas/?tipo=estados
- Bahia INEMA bulletin, April 2026 (AQUA_M-T reference): https://www.ba.gov.br/inema/sites/site-inema/files/2026-04/Boletim%20Di%C3%A1rio%20de%20Focos%20de%20Calor%20(25-04-2026).pdf
- Portal do Holanda, Oct 2026 (AQUA_M-T reference): https://www.portaldoholanda.com.br/brasil/portal-do-holanda-lanca-monitoramento-permanente-das-queimadas-na-amazonia
- NOAA NESDIS, end of S-NPP data delivery Nov 1, 2026: https://www.nesdis.noaa.gov/news/cessation-of-suomi-national-polar-orbiting-partnership-s-npp-data-users-onafter-november-01-2026
- Giglio 2025, LANCE orbit-drift slides: https://landweb.modaps.eosdis.nasa.gov/data/filePost/LANCE_UWG_Orbit_Drift_Giglio_202505.pdf
- NASA LDOPE note on Terra/Aqua drift (Jan 2026): https://landweb.modaps.eosdis.nasa.gov/displayissue?id=1254
- Jethva 2026, Remote Sensing 18:1506: https://www.mdpi.com/2072-4292/18/10/1506
- Sofiev and Kouznetsov 2026, GMD 19:10123 (Aqua vs S-NPP timing): https://gmd.copernicus.org/articles/19/10123/2026/
- Science, 2022, drifting satellites as fire watchers: https://www.science.org/content/article/nasa-s-drifting-climate-satellites-could-find-new-life-wildfire-and-storm-watchers
- MODIS Science Team 2022, drift proposals: https://modis.gsfc.nasa.gov/sci_team/meetings/202211/presentations/giglioRoyRanderson.pdf
- CAMS, MODIS end dates: https://atmosphere.copernicus.eu/drifting-away-modis-cams-global-fire-assimilation-system
- Amazon 2024 count (phys.org/AFP): https://phys.org/news/2025-01-brazil-amazon-highest-years-agency.html
- Amazon 2025 count and MapBiomas burned area: https://noticiasambientales.com/environment-en/fires-in-the-brazilian-amazon-fall-by-69-in-2025-reaching-the-lowest-in-nearly-three-decades-according-to-inpe/
- MapBiomas Fire Collection 5 (1985 to 2025, open downloads): https://brasil.mapbiomas.org/en/mapbiomas-fogo/
- NASA Earthdata, S-NPP outage Nov 2024: https://www.earthdata.nasa.gov/data/alerts-outages/lance-suomi-npp-data-hold
- FIRMS archive and country files: https://firms.modaps.eosdis.nasa.gov/download/
- FIRMS attribute fields (type column standard-data only): https://earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs
- Rival repos: https://github.com/Warren-530/fire-harmony , https://github.com/samuelakosaonyejekwe/firecal , https://github.com/Omee1612/kiln-watch , https://github.com/squadronzero/squadron-zero (plus 9 others listed in v0.2)
