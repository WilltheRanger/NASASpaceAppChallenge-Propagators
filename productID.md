# Anchor · productID

The team's product design form, filled in for **Anchor** (Team Propagators, NASA Space Apps 2026, Challenge #9).
Sections 1–3 and 6–7 come from the signed-off requirements (`frontend/requirements.md`). Sections 4–5 are
filled in Phase 3 of the design run, when the team picks a visual direction.
Decided by the team.

---

## 1. Brand strategy

*Prompt: turn the idea into a focused brand strategy: ideal customer, problem solved, unique value proposition, three positioning pillars, brand promise, reasons to believe.*

**The business in one sentence:** Anchor keeps the satellite fire record on one fixed clock and shows how much of the official count's change since 2021 comes from a drifting satellite rather than from fire.

- **Ideal customer:** journalists, state environmental analysts and researchers who report official fire counts (INPE's first). Also fire managers, early-warning teams, land managers and scientists who need a consistent 2002→now record.
- **Problem solved:** INPE compares every year with the past using one reference satellite, Aqua, picked because it always looked at about 1:30 pm. Since 2021 Aqua has drifted later (about 3:50 pm over the Amazon this week), and fires burn more in the afternoon. The official count moves with the satellite's clock, and nothing in the tables says so.
- **Unique value proposition:** a fire calendar held to a fixed 1:30 pm clock, plus an audit of the official count, region by region and year by year, with error ranges, a noise floor and checks registered before the results. We did not find anyone auditing INPE's official series by biome this way.
- **Three positioning pillars:**
  1. **Fixed clock.** One harmonized calendar, 2002→now, on the same 1:30 pm clock, in Aqua-equivalent units.
  2. **Audit, not alarm.** Official vs. fixed-clock change with uncertainty; "the official trend holds" is a result we report as readily as a gap.
  3. **Show the evidence.** Measured look times, the two-clocks test, INPE reproduction, the Punjab check, real recorded fires, ten pre-registered predictions.
- **Brand promise:** every number traceable to its file, its method and its uncertainty.
- **Reasons to believe:**
  - Look times measured from FIRMS hotspots themselves, not assumed from orbit tables.
  - Terra and Aqua carry identical MODIS instruments that drifted in opposite directions, so comparing them cancels the shared orbit effect and isolates the clock.
  - Ten predictions (P1–P10) written down before the results, each shown as pass, pending or fail.
  - The audit starts by reproducing INPE's own reference counts.
  - Detection limits measured against fires that California firefighters actually recorded.
  - Open code and open data; every figure downloads as CSV.

## 2. Audience feeling

*Prompt: what customers feel before finding it, what they want to feel, top three frustrations and desires, the emotion before and after.*

- **Before finding Anchor:** uneasy. A "record high" or "record low" headline is due and they can't verify it. Sensor changes are invisible in the official tables, and they fear being wrong in print or accused of spin.
- **What they want to feel:** confident and covered: "I can defend this sentence."
- **Top three frustrations:**
  1. Official tables hide which satellite and which clock produced the number.
  2. No uncertainty: every year looks equally certain.
  3. Hard to reproduce or cite: methods live in PDFs, data in portals.
- **Top three desires:**
  1. A fast verdict: is this year comparable with pre-2021 years?
  2. A chart and a CSV they can use today.
  3. A method and sources they can cite.
- **Emotion to create:** on arrival, *curiosity* ("the satellite's clock moved?"); after use, *trust*: "I know what I can say, and what I can't."

## 3. Brand personality

*Prompt: primary and secondary archetypes, five traits, three traits to avoid, how the brand behaves and speaks.*

- **Brand:** Anchor · **Audience:** reporters, analysts and researchers of official fire counts · **Desired feeling:** confident trust.
- **Archetypes:** primary **Sage** (truth through evidence); secondary **Explorer** (curious about how satellites see, invites you to turn the dials yourself).
- **Five traits:**
  1. **Precise:** numbers with units, references and ranges.
  2. **Candid:** says "not enough fires to measure" and "the trend holds" plainly.
  3. **Calm:** no alarm, no urgency theatre; the facts are dramatic enough.
  4. **Curious:** explains the clock with figures you can operate.
  5. **Generous:** shows its work, credits its sources, gives the data away.
- **Three traits to avoid:** alarmist · gotcha (never "INPE is wrong") · hype ("revolutionary", "first", "AI-powered").
- **How it behaves and speaks:** states the finding and its uncertainty in the same sentence; puts the number before the adjective; names the source under every figure; treats the official agency as a partner whose series it audits, not an opponent.

## 4. Visual direction

*Prompt: central visual concept, five-colour palette with HEX codes, two font styles, image style.*

**Pending: Phase 3.** Inputs already fixed: Stage 1 picks (Ciechanowski's operable figures, Apex spec cards, Linear's real product under the headline, Oxide's engineering-document details), rich colour with imagery and meaningful shaders, colour-blind-safe chart ramps, no NASA logos or mission identifiers.

## 5. Logo concepts

*Prompt: three strategic logo directions: concept name, core idea, logo type, shapes or symbolism, typography, colours, audience connection.*

**Chosen (Phase 3, Round 2): the clock-sweep mark.** A quarter-arc, the sweep of a clock hand from noon, stands beside
one upright bar, the fixed clock that doesn't move; together they read as the drift measured against a fixed reference.
The wordmark "Anchor" is set in Host Grotesk 500 and outlined, so it never depends on a font loading. One colour only:
ink `#0F0F0F` on light grounds, bone `#ECE9E1` on dark. Files: `frontend/public/brand/anchor-logo.svg`,
`anchor-logo-light.svg`, `anchor-mark.svg`; component `frontend/src/components/brand/anchor-logo.tsx`. No NASA marks,
flags or mission insignia are ever combined with it.

## 6. Voice and messaging

*Prompt: three voice principles, words to use and avoid, writing-style rules, a main tagline plus three alternatives, an elevator pitch.*

- **Three voice principles:**
  1. **Lead with the finding.** The sentence says what changed, then the number, then the uncertainty.
  2. **Show the clock.** Concrete times (13:30, 15:50) beat abstractions like "orbital drift".
  3. **Measure, then speak.** No claim without its range, its source and its limits.
- **Words to use:** fixed clock, look time, measured, official count, Aqua-based count, error range, noise floor, holds, shifts, not enough fires to measure, registered in advance, we did not find.
- **Words to avoid:** first, only, revolutionary, AI-powered, proves, debunks, wrong, scandal, magic, seamless, unlock; "record" except when quoting someone.
- **Writing-style rules:**
  - Changes always carry a reference: "−22% vs. 2024", never "−22%!".
  - Times in 24-hour local solar time; say "local solar time" on first use.
  - "Aqua-based count" for our FIRMS Aqua series; "INPE's official count" only for INPE's own numbers.
  - Sentence case, short sentences, no exclamation marks, no italics for emphasis.
  - The source and unit sit under every figure.
  - "We did not find anyone doing X", never "first" or "only".
- **Main tagline:** **Count the fires, not the clock.**
- **Alternatives:**
  1. The fire record, held to a fixed clock.
  2. Same fires. Same hour. Every year.
  3. When the satellite's clock moves, the count moves with it.
- **Elevator pitch:** Brazil's official fire statistics compare every year with the past using one NASA satellite, Aqua, chosen because it always looked at about 1:30 pm. Since 2021 its orbit has drifted; this week it crossed the Amazon at 3:50 pm, when more fires are burning. Anchor keeps a 2002-to-now fire calendar on a fixed clock for six regions, measures how much of each year's official change comes from the satellite's clock rather than from fire, and shows the evidence: measured look times, a two-satellite test, real recorded fires, and ten checks we registered before seeing the results.

## 7. Content system

*Prompt: four customer-focused content pillars, three ideas per pillar, a hook and best format for each.*

- **Brand and offer:** Anchor, a fixed-clock fire calendar with a clock audit.
- **Audience:** reporters, analysts and researchers of official fire counts; Space Apps judges.
- **Promise:** every number traceable to its file, its method and its uncertainty.
- **Platform:** the web app, the pitch (≤7 slides or a ≤30 s video) and the Space Apps project page.
- **Goal:** awareness (judging, and adoption by the named users).

Hooks use X/Y placeholders until numbers are frozen from `data/out/`. Never fill them with mock numbers.

| Pillar | Idea | Hook | Best format |
|---|---|---|---|
| **1 · The clock moved** | 1:30 pm became 3:50 pm | "The satellite behind Brazil's official fire count now looks 2 h 20 min late." | Drift chart, animated in the app; 6 s video beat |
| | Two clocks, opposite directions | "Two identical cameras drifted opposite ways. That lets us separate the clock from the fire." | Interactive dial |
| | Fires keep afternoon hours | "A later photo catches more fires, with no change in burning." | 24-hour ring (fire day) |
| **2 · The count on a fixed clock** | Amazon headline check | "Official, 2024→2025: X%. On a fixed clock: Y%." | Verdict card; slide 4 |
| | Six regions, six different errors | "Same satellite, six regions, six different clock errors." | Audit rows with error bars |
| | When the trend holds | "In [region], the official trend holds within our noise floor." | Short card, same weight as a gap |
| **3 · How we know** | Ten predictions registered in advance | "We wrote down ten ways we could be wrong." | P1–P10 checklist |
| | Rebuilding INPE's count | "Before auditing the official count, we rebuilt it." | Comparison chart |
| | Real fires as the reference | "California firefighters' records show which fires each satellite misses." | Spec cards + seen-vs-missed map |
| **4 · Your region** | Calendar explorer | "Pick a region and a month: how unusual was it?" | Interactive calendar |
| | Chino Hills, seen vs. missed | "Fires recorded within 25 km of Chino Hills, and which satellite saw each one." | Map |
| | Download and cite | "Every chart comes with its CSV and its source." | Download buttons + one-page summary |
