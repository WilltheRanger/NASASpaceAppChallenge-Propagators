# Frontend prompt

Copy everything below the line into your AI coding assistant, run from the repo root.

---

**Context**

We are Team Propagators at the NASA Space Apps Challenge 2026 (Chino Hills local event), working on Challenge #9, "Harmonization of MODIS and VIIRS Hot Spots." The submission deadline is Sunday, Nov 15, 6 PM Pacific. Projects are judged on impact, creativity, validity, relevance and presentation.

**The challenge.**
- Satellites have tracked active fire hotspots for more than two decades, but the record is split across sensors whose data can't be compared directly.
  - MODIS: on the Terra and Aqua satellites, 1 km pixels, since 2000.
  - VIIRS: 375 m pixels, since 2012.
  - They differ in spatial resolution, sensitivity and observation schedule.
- The challenge asks for a web application with a harmonized burning-activity calendar based on active fire hotspots. Users are early-warning and emergency responders, scientists, land managers and firefighters. A user can:
  - select a region and a date range;
  - see burning activity from the early 2000s to the present;
  - compare it with the historical median;
  - download analytics, visualizations and a CSV of the data.

**Our project.**
- NASA's Aqua satellite used to photograph Earth at about 1:30 pm local time. Its orbit has drifted: this week it passed over the Amazon at about 3:50 pm, while the VIIRS satellites still pass at about 1:30 pm.
- Brazil's official fire count (from INPE) is built only from Aqua. So since 2021, part of its change may come from the satellite's clock rather than from the fires.
- We:
  1. build a harmonized burning-activity calendar on a fixed 1:30 pm clock (VIIRS-based, expressed in Aqua-equivalent units) for six regions: the Amazon, Cerrado and Pantanal (Brazil), Argentina, Punjab + Haryana (India), and California (USA);
  2. audit, for each region and each year since 2021, how much Aqua's late clock changed the Aqua-based count, with error ranges, a noise floor and a fire-size-adjusted version;
  3. show how the satellites' overpass times drifted, year by year;
  4. check against real fires: in California, the share of firefighter-recorded fires each satellite detected, before and after 2021;
  5. list our validation checks and their status.
- The Amazon is our main example.

**Data.**
- All numbers come from JSON files.
- `data/mock/` holds synthetic placeholder files. Every file has `"mock": true`, and these numbers are not real.
- The real pipeline will later write files with the same structure to `data/out/`.
- `data/mock/README.md` explains every file and field.

**Space Apps rules that affect the app.**
- Judges must be able to open the links without signing in.
- Generated content must not use NASA logos, flags or mission identifiers.

**Task:** Make the frontend for this project.
