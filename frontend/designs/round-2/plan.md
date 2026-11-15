# Round 2 · Directions (Round 1 rejected)

Every number in the comps comes from `data/mock/` and carries
a MOCK badge; none of it may go in a slide or screenshot.

## Why Round 1 failed, against the kit's own rules

| Dir | What broke |
|---|---|
| A Thermal | Four showpieces on a Read page (inferno shader hero, flip-disk readout, 3D ring, animated calendar) against a budget of 0–1. Near-black ground with one ember accent is an AI-default look. Kicker labels above headings ("0.0 Verdict"), tracked mono labels, more than five type sizes. |
| B Colour of the hour | Colour assigned to time everywhere, so it sat on the chrome instead of one moment. Paper ground, serif display, hairlines and small mono labels: the broadsheet default. The three-clocks wipe competed with the verdict. |
| C Spec sheet | A spinning globe as the hero visual shows nothing about the clock (fails the removal test). Three equal spec cards, a flip-disk in each (repeated showpiece), a 76 px bold headline (weights above 600 are out), cobalt field plus orange accents everywhere. |
| D Systems | A mosaic of equal tiles (uniform bento) and a cinematic black hero film; six visuals on one page. |
| E Operations | Dashboard chrome as the hero, bracketed meta strips as costume, a knowledge graph with no user job, a carousel. |
| All | No hierarchy map or component manifest before building, no unslop direction, no colour plan, impeccable's craft floor never loaded, no single spacing scale, numbers in mixed formats, load animations on data. |

## Process this round

1. impeccable `init` → `PRODUCT.md` (transcribed from the signed-off requirements; nothing new).
2. impeccable `new-work`: mechanism, scene, rut, seven grounded candidates ordered **before** the roll, then
   `concept-seed.mjs --scope direction --mode read` (key `f8cb74ea`), which assigned candidate 6 and dealt six
   challengers.
3. Rule of three (uxui phase 3): the assigned direction plus the two strongest fused challengers.
4. ui-director hierarchy map + manifest (below), unslop direction lines and tokens, colour plan validated with the
   dataviz validator, impeccable craft floor loaded before code, then build, render, detector, independent review.

### Mechanism, scene, rut

- **Mechanism.** The reference satellite's photo time drifted from about 13:30 to later in the afternoon; fires burn more
  then, so the official count moved with the clock. Anchor holds the count to one fixed clock and measures the gap.
- **Scene.** A reporter at a newsroom desk in daylight with INPE's tables open, deadline in hours; later the same page
  projected for judges in a lit room. Daylight and projectors force a light page.
- **Rut (excluded).** The category's page: a dark map dashboard with glowing orange fire dots. Its predictable opposite:
  a cream editorial article with a serif headline and tracked mono labels. Literal reading of the governing metaphor
  (the clock): spend at most one candidate on it.

### Grounded candidates, ordered by resonance before the roll

1. Photographic contact sheet and time imprint: each overpass is a frame stamped with the hour it was taken.
2. Circular chart recorder: a 24-hour paper chart with the fire day traced in ink.
3. Railway timetable: scheduled 13:30, expected later; the drift as a delay.
4. Calibration target: the fixed reference every reading is checked against.
5. Official statistics yearbook: INPE's own table with one added column.
6. **Sun path and sundial (the literal clock, one candidate): local solar time read from a shadow.** ← assigned
7. Time card and time recorder: the satellite clocking in later each year.

### Challengers dealt (fused: challenger gives the form, the product gives every fact)

| Challenger | Verdict |
|---|---|
| Swiss concert-poster wall | **Built as B.** Six regions become one poster series on one grid; arcs and bars are the only imagery and both are data. |
| Darkroom exposure record | **Built as C.** An audit is a record of corrections; the record card, prints and one correction colour map onto it truthfully. |
| Tensegrity column | Not built. Opposing drifts are true, but a force diagram reads as abstract physics to a reporter. |
| Film cutting bench | Fuses poorly: orange on black is Round 1's rejected look, and film frames don't carry fire counts. |
| Drawcord cape | Fuses poorly: no true relation to the product. |
| Console void | Fuses poorly: decorative dark atmosphere breaks Read mode and the daylight scene. |

## Hierarchy map (shared by A, B, C; same content priority, same primary action)

```
Screen: S0 Verdict (hero)     Mode: Read, with one Operate control (year)
User's one job: learn whether the Amazon's official trend since 2021 holds on a fixed clock, and by how much.
L1: verdict headline, templated from audit JSON: "Aqua's later clock added 22% to the Amazon's 2025 fire count"
L2: (1) the clock figure + year control  (2) subhead: official vs fixed-clock change 2024 → 2025
    (3) one primary action "Explore the calendar" + one secondary "Download summary"
L3: clock effect by year 2021–2025 with ranges and the ±5% noise floor; look-time readout; source line
L4: top bar (Anchor, section links, region, data status), MOCK notice, AI note
Reading path: headline → subhead numbers → figure → primary action
Spectacle budget: Read = 0. One hero accent: the clock figure itself (the team asked for rich colour and images).
                  Static by default; it moves only when the reader changes the year.

Screen: S4 Calendar            Mode: Operate
Job: see how unusual each month was against its median.
L1: month × year grid    L2: finding sentence (computed), console (range, mode, downloads)
L3: legend (ramp, provisional, outage, no data), cell detail    L4: source line
Spectacle budget: 0. No load animation.
```

## Component manifest

| Element | Level | Component (library) | Why it fits | Source |
|---|---|---|---|---|
| Region switcher | L4 | Radix Select | keyboard, typeahead, escapes overflow | `@radix-ui/react-select` |
| Year control | L2 | Radix Slider | keyboard steps, `aria-valuetext` names the year and look time | `@radix-ui/react-slider` |
| Calendar mode | L2 | Radix Toggle Group | accessible segmented control | `@radix-ui/react-toggle-group` |
| Clock figure | L2 | Hand-built SVG with d3-shape/d3-scale | requirements A6: custom SVG charts; the figure is the product's own content | d3 (installed) |
| Clock effect by year | L3 | Hand-built table rows (A, C) / Leaderboard Bars restyled (B) | numbers must read without hover | 21st.dev eugeneshilow (adapted) |
| Calendar grid | L1 (S4) | Fire calendar, three render modes | already adapted; adds square and zone modes, drops the load animation, 12 px minimum | 21st.dev ssychui (adapted) |
| Buttons, links | L2 | native `<a>`/`<button>` through tokens | no complex primitive needed | — |

21st.dev intensity is `light` (forge.md): no new sweep this round; Round 1's adapted components are reused where they
pass the fit test. Removed from Round 1 after the fit test: COBE globe, flip-disk matrix, Circularium ring, knowledge
graph, index carousel, thermal and wipe shaders (each failed Job or Removal on a Read page).

---

## A · Sundial (assigned)

- **Product.** Anchor shows reporters and analysts how much of the official fire trend since 2021 comes from the
  reference satellite's drifting clock.
- **Character.** exact, sunlit, unhurried.
- **World.** A sundial and its almanac: local solar time, hour lines cut in stone, shadows that lengthen into the
  burning afternoon.
- **Moments.** (1) The hero dial: a limestone plate where the fixed clock and Aqua each cast a shadow, and the hours
  between them are inlaid in cinnabar; move the year and Aqua's shadow walks into the afternoon. (2) The calendar
  printed like an almanac table, cinnabar above the median, slate below.
- **Signature.** The shadow tick: every look time carries a small dial glyph with its shadow at that hour. Nothing else
  uses it.

**Colour plan (Restrained, one rich object).** Neutral ramp tinted toward slate (hue 245, C ≤ 0.016): page `#F4F7F9`,
card `#FFFFFF`, raised `#E9EDF0`, text `#151B22` / `#474E56` / `#666D74` (4.9:1). Object: limestone `#E8E2D9`, edge
`#D1C9BF`, cut lines `#453B33`, shadow `#30445D` at 55%. Accent cinnabar `#DF502C` (marks; 3.7:1), `#BB351B` as text
(5.4:1). Budget: neutral ~88%, stone object ~9%, cinnabar ≤3% (the added hours, the clock-effect figure, the primary
button's focus). Calendar diverging: slate arm `#E1EDF8 → #2A5982`, midpoint `#F0F0F0`, cinnabar arm
`#FBE6E0 → #B93917` (monotone, validated); count mode: cinnabar arm alone.

**Type.** Source Sans 3 for the interface and every number; Source Serif 4 (display optical size) for the headline,
section titles, the numerals cut into the dial and the almanac's year and total columns (engraving and print on the
objects, not interface labels). Sizes 12 / 15 / 18 / 28 / 60 (40 on mobile); 15 is the body size (unslop's 14–15 range,
chosen for projection). Weights 400 and 500.

**After review.** The calendar's warm arm moved from cinnabar to ochre (`#FAE4C7 → #B57C1A`, count mode `#FBECD9 →
#B17915`) so cinnabar means only "minutes the clock added". Fires counted at each look come from the two-clocks file
(ochre bars on the rim); no fire-day curve is drawn until the pipeline provides one (open question O3).

**Contract.**
THESIS: the clock that matters is the sun's; the drift is a shadow walking into the burning afternoon. Refuses the
dark fire-dot dashboard.
OWN-WORLD: daylight page tinted toward slate; one limestone dial with cut hour lines, real soft shadows and a cinnabar
inlay; serif headline, sans everything else.
STORY: the reader sees the verdict, sees two shadows apart by the drift, moves the year, explores the calendar.
FIRST VIEWPORT: left 5/12 headline, subhead, five-year effect row, two actions; right 7/12 the dial with readout and
year slider; top bar quiet.
FORM: candidate 6 of 7, seed `f8cb74ea`, no staging (stagings fit long guides, not this first surface).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md

## B · Poster series (challenger: Swiss concert-poster wall)

- **Product.** As above.
- **Character.** objective, bold, orderly.
- **World.** Swiss public-information posters, one per region, all cut from one grid; geometry instead of pictures.
- **Moments.** (1) The hero poster: one ring per year since 2012, each an arc from solar noon to Aqua's look time, so
  the arcs fan past the fixed clock after 2021 in the region's colour. (2) The calendar as a field of black squares
  sized by how far each month sits from its median.
- **Signature.** The region colour: each region owns one signal colour, and the loaded region's colour is the only
  accent on the page.

**Colour plan (Committed per poster).** Neutrals pure graphite: paper `#F4F4F2`, card `#FFFFFF`, ink `#0F0F0F` /
`#484848` / `#666666`, inactive geometry `#B7B7B7`, rule `#DEDEDE`. Region signals in list order (validated, adjacent
CVD ≥ 10.4, normal ≥ 22.7): Amazon `#008C45`, Cerrado `#D99A00`, Pantanal `#2457C5`, Argentina `#E8742A`, Punjab +
Haryana `#B3307A`, California `#14A3A3`; two sit below 3:1 on paper, so every swatch carries its name. Budget: ink and
paper ~85%, region colour 10–15% (drift arcs, current-year mark, selection), nothing else coloured. Calendar: no hue;
square area encodes distance from the median, filled ink above, filled grey below.

**Type.** Host Grotesk only, flush left, ragged right, sizes on the grid: 12 / 14 / 20 / 32 / 72 (44 on mobile).
Weights 400 and 500, sentence case (Swiss posters set lowercase as often as caps; unslop bans tracked caps).

**Contract.**
THESIS: six regions are one poster series; the clock appears as geometry, never as a picture. Refuses the dashboard
and the editorial article alike.
OWN-WORLD: paper white, black grotesk on a visible 12-column module, square corners, one signal colour per region,
arcs and bars as the only imagery.
STORY: the reader reads the objective headline, sees the arcs fan past the fixed clock, checks the five bars, switches
region and watches the colour change.
FIRST VIEWPORT: left 2 columns region index; centre 5 columns headline, subhead, bars, actions; right 5 columns the
arc poster.
FORM: challenger `design-canon-swiss-grid-poster-wall`, seed `f8cb74ea`, no staging.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md

## C · Exposure record (challenger: darkroom exposure record)

- **Product.** As above.
- **Character.** methodical, hands-on, exact.
- **World.** A darkroom exposure record on a light table: ruled record cards, prints under the loupe, corrections marked
  in one magenta pencil.
- **Moments.** (1) The hero record card: audit years as exposure rows (look times, clock effect, range), the selected
  year hatched in magenta, beside three real prints of the same Amazon scene taken at Terra's, VIIRS's and Aqua's
  hours. (2) The calendar as a contact sheet, toned like prints: blue-toned below the median, sepia above.
- **Signature.** Magenta means correction: it appears only where the clock changed the count.

**Colour plan (Restrained with photographic colour).** Light-table neutrals (hue 195, C ≤ 0.006): table `#ECF1F1`,
sheet `#FFFFFF`, ink `#0F1213` / `#444949` / `#656A6A` (4.8:1). Correction magenta `#D31A8D` (marks, 4.3:1) and
`#BB007A` as text (5.4:1). Real colour lives in the three NASA Worldview prints. Calendar toners: blue `#E0E9F1 →
#40617D`, midpoint `#E8E8E8`, sepia `#F2E5DB → #8C5D32` (monotone, validated); count mode: eleven neutral zones.
Budget: neutrals ~80%, prints ~15%, magenta ≤3%.

**Type.** Sofia Sans for the interface, Sofia Sans Extra Condensed for the headline and record legends, Chivo Mono for
measured quantities only. Sizes 12 / 14 / 18 / 28 / 72 (44 on mobile). Weights 400 and 500, sentence case.

**Contract.**
THESIS: an audit is an exposure record; every correction is written down in one colour. Refuses the glowing dashboard.
OWN-WORLD: backlit light table, white ruled sheets with soft shadows, real photographic prints, magenta pencil, hatch
for uncertainty.
STORY: the reader reads the verdict, finds 2025's row hatched on the record, sees the afternoon print beside the
morning one, explores the contact sheet.
FIRST VIEWPORT: left 5/12 headline, subhead, actions; right 7/12 the record card overlapping three prints.
FORM: challenger `operate-b-exposure-record-zone-sheets`, seed `f8cb74ea`, no staging.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md

---

## D · Field film (Anduril-inspired, added at the team's request)

The team asked for Anduril- and Palantir-inspired directions again, built to the rules this time. The reference pins
the look (dark for D), so the daylight-scene default yields here.

- **Product.** As above.
- **Character.** steady, cinematic, matter-of-fact.
- **World.** Field footage of the thing itself: the burning forest seen from orbit, labelled like equipment, in a field
  palette of black, bone and sage.
- **Moments.** (1) The hero: the real VIIRS scene of the Amazon under smoke, full bleed, with the verdict on its darkest
  part and a pass line along the bottom edge where Aqua's tick slides later as the year changes. (2) The same scene from
  Terra, VIIRS and Aqua on one day, as an uneven photo grid with pass names set on the images.
- **Signature.** Labels set on the image at its lower left, small and bone-coloured, like names on equipment.

**Colour plan (dark, Restrained + photography).** Ground `#0B0D0B`, surface `#121413`, raised `#1C1F1D`, hairline bone
at 10%; text bone `#ECE9E1` / `#ADAFA8` / `#8B8D86` (5.8:1). Sage `#748677` for one band (ink text on it 5.0:1).
Figure: Aqua = bone, fixed clock = sage, Terra = muted bone. Calendar (dark, brighter = further from the median): sand
`#3F301B → #D6A866` above, slate `#1C313D → #68A4C6` below, midpoint `#1D1F1D`. The photographs carry the colour.

**Type.** Albert Sans only; 12 / 14 / 18 / 32 / 72 (40 on mobile); 400 and 500; sentence case.

## E · Operating picture (Palantir-inspired, added at the team's request)

- **Product.** As above.
- **Character.** austere, exact, typographic.
- **World.** An operating picture: one light-grey page of very large plain sentences, and the working product in its own
  dark window, the way an analyst sees it.
- **Moments.** (1) The product window under the headline: look time by year (Aqua drifting later, the fixed clock flat,
  Terra earlier), the year scrubber, and the readout. (2) The six regions as a giant typographic index, each with its
  latest clock effect.
- **Signature.** The two-tone sentence: every finding is one sentence whose second half drops to grey.

**Colour plan (Restrained page, one dark window).** Page `#F0F0F0`, ink `#0B0B0B` / `#484848` / `#696969` (4.8:1),
grey clause `#777777` (3.9:1, large text only). Window `#101213`, panel `#191B1D`, text `#E6E8EA` / `#A8ABAE` /
`#898C90`. Data (validated, dark band, CVD ΔE 22.3): Aqua amber `#CB8117`, Terra blue `#4D92CA`, fixed clock `#E6E8EA`
as the neutral reference. Calendar in the window: amber `#503816 → #F8AC3D` above, blue `#203B50 → #6FB5EF` below,
midpoint `#252728`.

**Type.** Golos Text only; 12 / 14 / 20 / 32 / 72 (40 on mobile); 400 and 500; sentence case; tabular figures in the
window's tables and axes.
