# Developer walkthrough: script and sources


Source files are on branch `will/beautiful-hawking-r06ab0` (commit `04c4a92`).

---

### Intro (0:00–0:07)
- `0:00.7` Here's our web app in two minutes: what it shows, how the data flows, and the rules your code has to follow.

**On screen:** title "Fixed-clock fire calendar + clock audit"; a clock dial where Aqua's hand moves from 1:30 to 3:50 PM, Terra's from 10:30 to 8:55 AM, and VIIRS stays at 1:30 PM.

### Why (0:07–0:30)
- `0:07.0` Fire satellites take a snapshot at about the same time every day.
- `0:10.9` But NASA's Aqua satellite has drifted: its 1:30 PM snapshot now happens near 3:50 PM over the Amazon, and Terra is sliding earlier.
- `0:20.8` Fire activity changes through the day, so the counts shift even when the fires don't.
- `0:25.6` And Brazil's official fire record still uses Aqua as its reference.

**On screen:** a time-of-day axis with markers for Terra, VIIRS and Aqua, plus an illustrative daily fire-activity curve. A callout says INPE uses Aqua and that its named successor, S-NPP, was switched off on Nov 2, 2026.
**Sources:** Aqua at 15:50 over the Amazon, measured from FIRMS this week (`research/execution-plan.md` §0). Terra at 08:55 at 25–50°N (`analysis/drift-check/README.md`). INPE's reference satellite and the S-NPP shutdown (`research/execution-plan.md` §0, `research/project-proposal.md` §1.3). The curve is illustrative and labeled as such.

### Method (0:30–0:49)
- `0:30.0` So VIIRS, which still looks at a fixed time, becomes our clock.
- `0:33.4` We learn the Aqua-to-VIIRS ratio for each region and month from 2012 to 2020, before the drift.
- `0:39.5` VIIRS times that ratio is a fixed-clock count, in Aqua units.
- `0:43.4` The gap between the real Aqua count and that number shows how far an Aqua-based record has drifted.

**On screen:** three cards, `R = Aqua ÷ VIIRS`, `fixed = VIIRS × R` and `L = Aqua ÷ fixed` (gap = L − 1), beside a chart labeled "SCHEMATIC · NOT REAL DATA". A footnote says S-NPP and NOAA-20 are linked on their 2018–2025 overlap.
**Sources:** `research/execution-plan.md` §4 D–E. `L = Aqua ÷ fixed` is the same as the plan's `L_y = (Aqua/VIIRS)_y ÷ R`.

### The app (0:50–1:24)
- `0:49.6` That's the app: a fixed-clock fire calendar for anywhere. Pick one of six preset regions.
- `0:54.9` The calendar covers every month since 2002, colored by count or by anomaly against the historical median, with a CSV download.
- `1:03.8` The audit panel shows that gap for every year since 2021, with error bars.
- `1:08.6` Next, the drift chart, and our centerpiece, the two-clocks test: Terra and Aqua drift in opposite directions, so comparing them isolates the clock effect.
- `1:18.0` Then California's detection limits, checked against real recorded fires, and a "How do we know?" checklist.

**On screen:** an illustrative app preview drawn from `data/mock` with MOCK badges everywhere. A chip shows which file each panel reads:

| Panel | File |
|---|---|
| Region chips | `regions.json` |
| Calendar (count/anomaly toggle, CSV, hatched `provisional`, dashed `outage`, tooltip with field names) | `calendar/br-amazon.json` |
| Clock audit (gap % with `L_lo`–`L_hi` error bars, ±noise floor, table) | `audit/br-amazon.json` |
| Drift chart | `drift/br-amazon.json` |
| Two-clocks test (A, T, `clock_diff = log A − log T`) | `twoclocks/br-amazon.json` |
| California detection limits (a50) and seen-vs-missed map | `detection_limits_california.json`, `socal_seen_missed.json` |
| "How do we know?" (P1–P10) | `checks.json` |

**Sources:** `data/mock/README.md` and `research/execution-plan.md` §1, §3 and the FINAL PLAN note at the top.

### Data flow (1:25–1:41)
- `1:24.9` Under the hood, a Python pipeline turns NASA FIRMS hotspots into small JSON files, one per panel, per region.
- `1:32.2` The app is static and reads only those files.
- `1:35.0` Until the real ones land in data/out, build against data/mock: same layout, same fields.

**On screen:** NASA FIRMS (MODIS C6.1 Terra/Aqua, VIIRS 375 m S-NPP/NOAA-20) and USFS FPA-FOD 7th ed. feed the Python pipeline (`analysis/`). The pipeline writes `data/out/` (`mock: false`), which feeds the static web app (no server, public link, no login). `data/mock/` (`mock: true`) feeds the app in the meantime.
**Sources:** `research/execution-plan.md` §1–§4, `analysis/data-acquisition/README.md`, `data/mock/README.md`.

### Rules (1:42–1:56)
- `1:41.7` Five rules.
- `1:42.7` Mock data always shows a MOCK badge.
- `1:45.1` Null means no data, not zero.
- `1:47.4` Hatch provisional months and mark outages.
- `1:50.0` Show "not enough fires to measure" instead of a noisy number.
- `1:53.5` And every number on screen comes from the JSON.

**Sources:** `data/mock/README.md` (intro and "UI notes") and `research/execution-plan.md` §3 ("Every number on a slide must come from them").

### Start (1:57–2:01)
- `1:56.6` Start with the mock-data README. Let's build it.

