# Product

<!-- impeccable:product-schema 1 -->

Transcribed from `frontend/requirements.md` (signed off Sat Nov 14, 2026), `frontend/ux-brief.md` (approved) and
`productID.md` §1–3, 6–7. No new facts were added here; open items stay open. Written for Team Propagators.

## Platform

web

## Users

- **Primary:** journalists, state environmental analysts and researchers who report official fire counts, INPE's first.
  The snapshot user is a journalist covering INPE's fire bulletin on deadline, working from the "Situação Atual"
  tables (year columns, Dif. A., Dif. M.). Not a remote-sensing expert. Needs a sentence they can defend, a chart and a
  source to cite, and is worried about publishing a misleading "record high" or "record low".
- **Secondary:** fire managers and firefighters, early-warning teams, land managers, scientists who need a consistent
  2002→now record; NASA Space Apps judges, who open the link without signing in and have about two minutes.
- **Context of use:** a laptop at a desk, or projected at judging; phones for quick checks (390 px and up).
  Time-pressed, mixed expertise: the verdict must read without remote-sensing knowledge, the evidence must satisfy a
  scientist.

## Product Purpose

Anchor keeps a 2002→now, month-by-month fire calendar on one fixed 1:30 pm clock (VIIRS-based, in Aqua-equivalent
units) for six preset regions (Amazon, Cerrado, Pantanal, Argentina, Punjab + Haryana, California), and audits how much
of the official, Aqua-based fire trend since 2021 comes from Aqua's drifting overpass clock rather than from fire.

Success: a judge or journalist reads the verdict for the featured region within about ten seconds of opening the link;
every number on screen traces to a JSON file; "the official trend holds" reads as a full result, not a failure.

## Positioning

INPE compares every year with the past using one reference satellite, Aqua, chosen because it always looked at about
1:30 pm. Since 2021 Aqua has drifted later (about 3:50 pm over the Amazon this week) while VIIRS still looks at about
1:30 pm and Terra drifted earlier. Fires burn more in the afternoon, so the official count moves with the satellite's
clock. Anchor measures look times from the hotspots themselves, uses the two identical cameras that drifted in opposite
directions (Terra and Aqua) to separate the clock from orbit sampling, and reports the clock effect per region and year
with an error range and a noise floor. We did not find anyone auditing INPE's official series by biome this way.

## Operating Context

- Journalists read INPE's bulletin tables and need a citable sentence, a chart and a CSV the same day.
- Analysts write season reports month by month against a historical median.
- Researchers check whether the post-2021 series is comparable before citing it.
- Judges open a shared link, often projected, and follow hook → verdict → proof → limits.
- Shared links restore region, date range, calendar mode and year pair from the URL.

## Capabilities and Constraints

- Must ship: verdict-first opening (Amazon, 2024 → 2025 by default); headline check (official vs. fixed-clock change);
  audit 2021–2025 per region with `L_lo`/`L_hi` ranges, ±noise floor, `L_strat`, and "not enough fires to measure";
  calendar (month × year, fixed-clock count, anomaly vs. median, colour-blind-safe ramps, provisional hatched, outage
  marked, `null` as "no data", never zero); drift chart; two clocks (A, T, clock_diff, sampling_est, fire-day
  reconstruction); "How do we know?" P1–P10; INPE reproduction; Punjab validation; limits; CSV + PNG/SVG per figure and a
  one-page summary per region; URL state.
- Should ship: California detection limits, real-fire proof, Chino Hills "seen vs. missed" map.
- Won't ship: draw-an-area, user-chosen baseline, Portuguese/Spanish, chat assistant, accounts, analytics, tracking.
- Data: every number comes from JSON (`data/out/` per file, else `data/mock/` with a visible MOCK badge on the panel and
  a page notice; a strict build flag refuses mock data). Mock numbers never go in a slide or screenshot.
- Imagery and shaders are welcome where they show something true; they degrade to a matching still for reduced motion,
  no WebGL or slow frame rates. No number depends on WebGL.
- Static, host-agnostic build with relative paths; GitHub Pages workflow. Vite + React + TypeScript + Tailwind.
- Open questions O1–O4 in `frontend/requirements.md` stay open (INPE reproduction file, Punjab reference times, fire-day
  curve points, headline-check pairing).

## Brand Commitments

- Name **Anchor**. Tagline "Count the fires, not the clock." Team name "Team Propagators" only.
- Personality: precise, candid, calm, curious, generous. Never alarmist, salesy, hype-y, or accusatory toward INPE
  ("INPE is wrong" is never said; the official agency is a partner whose series we audit).
- Voice: lead with the finding, then the number, then the uncertainty. Concrete times (13:30, 15:50) over
  abstractions. Changes carry a reference ("−22% vs. 2024"). 24-hour local solar time. "We did not find anyone doing
  X", never "first" or "only". Words to avoid: first, only, revolutionary, AI-powered, proves, debunks, wrong, scandal,
  magic, seamless, unlock; "record" except when quoting.
- No NASA logos, flags or mission identifiers. Team members are minors: no names, photos, faces or voices anywhere.
- AI use is disclosed once, in the slides and on the project page; nothing in the app or the repo names an AI tool as author or label (team rule, 15 Nov 2026).
- Stage 1 references the team picked: Ciechanowski's operable figures, Apex Space spec cards, Linear's real product
  under the headline, Oxide's engineering-document details; parts Leaderboard Bars, Circularium Ring, Flip-Disk Matrix,
  COBE Globe. The team asked for rich colour with images and meaningful shaders, not a plain grey template.

## Evidence on Hand

- Mock JSON for every contract file under `data/mock/` (`"mock": true`), e.g. Amazon drift, audit, two clocks,
  calendar, checks. Real outputs land in `data/out/` from the team's pipeline.
- Real public-domain imagery from NASA Worldview/GIBS: the same Amazon scene photographed by Terra, VIIRS and Aqua on
  one day (`frontend/public/img/amazon-{terra,viirs,aqua}-2026-09-04.jpg`) and a VIIRS fire scene
  (`frontend/public/img/amazon-viirs-fires-2024-08-23.jpg`). Credit "NASA Worldview / GIBS"; no logos.
- No testimonials, users, press or partners exist; none may be invented.

## Product Principles

1. **Verdict before tool.** Every section opens with its finding in one sentence, then the figure that proves it.
2. **Every number carries its source, unit and range.** `null` is not zero; mock is always labelled.
3. **Figures you can operate.** One obvious control per figure.
4. **One region, everywhere.** Switching region changes every section and the URL.
5. **Honest states are results.** "Not enough fires to measure", "provisional", "outage", "pending" and "the trend
   holds" are designed outcomes with the same weight as a large gap.

## Accessibility & Inclusion

WCAG AA contrast; no hairline-only data marks; works at 390 px with no horizontal page scroll; every chart has a
table/text equivalent and keyboard navigation; colour-blind-safe ramps; reduced motion respected.
