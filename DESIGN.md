---
name: Anchor
description: Count the fires, not the clock.
colors:
  ground: "#0B0D0B"
  surface: "#121413"
  raised: "#1C1F1D"
  bone: "#ECE9E1"
  bone-hover: "#D6D3CB"
  bone2: "#ADAFA8"
  bone3: "#8B8D86"
  bone-30: "rgba(236, 233, 225, 0.3)"
  bone-20: "rgba(236, 233, 225, 0.2)"
  hairline: "rgba(236, 233, 225, 0.1)"
  plate: "rgba(11, 13, 11, 0.86)"
  ink: "#0B0D0B"
  ink-20: "rgba(11, 13, 11, 0.2)"
  sat-aqua: "#C8801F"
  sat-terra: "#448BCB"
  sat-viirs: "#49A46E"
  cal-mid: "#1D1F1D"
  cal-up-1: "#3F301B"
  cal-up-2: "#604825"
  cal-up-3: "#876533"
  cal-up-4: "#AE8446"
  cal-up-5: "#D6A866"
  cal-down-1: "#1C313D"
  cal-down-2: "#29495C"
  cal-down-3: "#36647D"
  cal-down-4: "#4B82A1"
  cal-down-5: "#68A4C6"
typography:
  display:
    fontFamily: "'Albert Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(56px, 11vw, 168px)"
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Albert Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Albert Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body-large:
    fontFamily: "'Albert Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.56
  body:
    fontFamily: "'Albert Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "'Albert Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
    fontFeature: "\"tnum\" 1"
  readout:
    fontFamily: "'Albert Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  nav-compact:
    fontFamily: "'Albert Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  label-small:
    fontFamily: "'Albert Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.33
    fontFeature: "\"tnum\" 1"
rounded:
  none: "0px"
  plate: "3px"
  sm: "4px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  section: "64px"
  section-wide: "96px"
  bar: "56px"
components:
  button-primary:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.bone-hover}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.bone}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 20px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.hairline}"
  nav-link:
    textColor: "{colors.bone2}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "44px"
  nav-link-current:
    textColor: "{colors.bone}"
  plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.bone}"
    typography: "{typography.label}"
    rounded: "{rounded.plate}"
    padding: "4px 8px"
  chip-unusual:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  chip-not-unusual:
    backgroundColor: "transparent"
    textColor: "{colors.bone2}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  toggle-group:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.bone2}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "36px"
  toggle-group-on:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.ink}"
  site-bar:
    backgroundColor: "{colors.ground}"
    height: "56px"
---

# Design System: Anchor

## Overview

**Creative North Star: "The Fixed Clock"**

Anchor is a dark, quiet field document about time of day. The ground is near-black, the text is bone, and the only strong colour on the page comes from real photographs and from three satellite marks. Everything else is hairlines, 4 px corners and one typeface in two weights. The pages read as a sequence of framed pictures and plain sentences, with the evidence one step below each sentence.

Density is low at the top of each page and rises toward the evidence: a full-height framed photograph or a region's name over its footage first, then a finding stated in one sentence with its caveat beside it, then shared-scale rows, charts and tables. Motion is slow on arrival and quick on response, and the reader can turn all of it off from the footer.

The site covers four pages, Overview, Regions, Simulator and Method, built from one shared set of tokens and parts. Every number on screen comes from the team's data files, and mock data is always labelled.

**Key Characteristics:**
- Black ground, bone text, hairline rules; the photographs carry the colour.
- One sans family (Albert Sans, 400 and 500), tight negative tracking at large sizes, tabular figures for every time and number.
- Three satellite colours, each tied to one shape: Terra a blue ring, VIIRS a green diamond, Aqua amber.
- 4 px corners on everything rectangular; 3 px on small plates; circles only for marks, the switch and icon wells.
- Reveals slide in from the left on easeOutExpo; rules draw from the left; a Motion switch in the footer stops it all.

## Colors

A near-monochrome dark palette in which colour is information, never decoration.

### Primary
- **Bone** (`bone`): all primary text, the primary button, the current page's underline in the bar, focus outlines, and the one lighter band per page (the Overview's finding sits on bone with ink text).
- **Bone Hover** (`bone-hover`): the primary button's hover fill only.

### Secondary (the satellite colours)
- **Aqua Amber** (`sat-aqua`): Aqua and nothing else. Its look times, its count's dot and range line, the strip of minutes it moved, and the small "+N min" tag on the day line.
- **Terra Blue** (`sat-terra`): Terra's ring on charts, the globe and inline marks.
- **VIIRS Green** (`sat-viirs`): VIIRS's diamond on charts, the globe and inline marks.

### Tertiary (the calendar ramps)
- **Sand above** (`cal-up-1` to `cal-up-5`) and **Slate below** (`cal-down-1` to `cal-down-5`), diverging from **Calendar Mid** (`cal-mid`): months above and below the usual level in the monthly calendar; brighter means further from the middle. Cells are square (0 px) with a 2 px gap; provisional months are hatched in bone at 35%.

### Neutral
- **Ground** (`ground`): the page, the bar, the frame around framed photographs, and the knock-out stroke around satellite marks.
- **Surface** (`surface`): the placeholder behind every picture while it loads, row hover, segmented-control track.
- **Raised** (`raised`): the toggle group's track.
- **Bone 2** (`bone2`): secondary text, idle nav links, captions under a lead sentence.
- **Bone 3** (`bone3`): tertiary text: axis ticks, column heads, footnotes, credits.
- **Bone 30 / Bone 20** (`bone-30`, `bone-20`): secondary button borders, axis lines, the "not unusual" chip outline, the switch track when off.
- **Hairline** (`hairline`): every rule and divider: the bar's bottom edge, row separators, the footer's top edge, the usual-range band on strips.
- **Plate** (`plate`): small dark labels sitting on photographs.
- **Ink** (`ink`, `ink-20`): text and borders on bone.

### Named Rules
**The Amber Means Aqua Rule.** Amber marks Aqua and only Aqua. No other satellite, state, warning or highlight may use it.

**The Shape Carries Identity Rule.** Each satellite's colour always travels with its shape: Terra a blue ring, VIIRS a green diamond (a square turned 45 degrees), Aqua an amber dot. The shape must read without the colour.

**The Ring Then Dot Rule.** For a time that moved, the hollow ring is the old time and the filled dot is the new time, joined by a line of the same colour. Aqua's move is drawn in amber; the Overview's park analogy uses the same ring-to-dot in bone because it is not a satellite.

**The Photographs Carry the Colour Rule.** Surfaces stay ground, surface or bone. Satellite colours appear on marks, lines and small tags, never as a section or card background.

## Typography

**Display Font:** Albert Sans (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Albert Sans
**Label/Mono Font:** none; numbers use tabular figures of the same family

**Character:** One humanist-geometric sans in two weights. Large type is medium (500) with tight negative tracking; everything else is regular (400). The pairing is a single voice, so hierarchy comes from size, weight and the bone2/bone3 steps.

### Hierarchy
- **Display** (500, clamp(56px, 11vw, 168px), 0.92, -0.04em): a region's name over its footage on the Regions page.
- **Headline** (500, 40px, 1.02, -0.03em): section headings on the Regions page and Method page. The Overview sets its chapters in a fluid band of the same style (500, from clamp(28px, 3vw, 44px) for door titles up to clamp(38px, 5.6vw, 88px) for the opening line, line height 1 to 1.05, tracking -0.02em to -0.035em), always balanced and capped near 15ch for the opening.
- **Title** (500, 24px, 1.25, -0.01em): step titles and sub-section heads.
- **Body large** (400, 18px): lead lines beside headings, place names in rows, the caveat on wide screens; held to about 30ch beside a heading.
- **Body** (400, 14px): the working size for links, buttons, nav, chips and paragraphs; paragraphs are held to the 36rem measure.
- **Label** (400, 12px, tabular figures): axis ticks, column heads, captions, footnotes, plates, credits.
- **Simulator instrument steps:** the Simulator's docked panels run one step denser. **Readout** (500, 22px, 1.25, -0.01em) carries its page title and the big figures in each panel; **Label small** (400, 11px, tabular figures) carries map tags, legends, pass times and panel fine print; **Nav compact** (400, 13px) is its bar's links on phones, where the Motion switch shares the row.

### Named Rules
**The Tabular Time Rule.** Every clock time, minute count and percentage is set in tabular figures so values align and do not jitter while they animate.

**The Two Weights Rule.** Only 400 and 500 are loaded. Emphasis inside a sentence is 500 or a step up in bone; never bold, never italic for emphasis.

## Layout

A centred shell, max 1440px, with 16px side padding on phones and 32px from 640px up. Wide layouts use a 12-column grid with a 24px gutter: a heading on 7 or 8 columns with its lead line or caveat on 3 to 4 columns at the right, aligned to the heading's baseline or top. Sections breathe at 64px vertical padding, 96px from 1024px.

The bar is fixed, solid ground, 56px tall, one row: the logo (the mark alone on phones) and the four pages. Pages start 56px down to clear it, and in-page targets carry a matching scroll margin.

The Overview opens on a framed photograph: inset 8px (16px from 640px) inside a ground frame with 4px corners, sized to the viewport minus 176px so the next chapter's heading peeks below; on phones the picture becomes a band above the words. Long explanations become a pinned picture with steps scrolling beside it from 1024px, and a stacked list with each step's picture under it on phones. The Method page is a long reference page with a section bar that follows the reader.

Breakpoints are Tailwind's defaults (640, 768, 1024px). Everything works at 390px with no horizontal scroll; touch targets are at least 44px, buttons 48px.

### Named Rules
**The Verdict First Rule.** Each section opens with its finding in one sentence, then the figure that proves it, then the detail one click deeper (a disclosure).

**The Shared Scale Rule.** When places are compared, every row is drawn on one scale with one axis, so lengths compare across rows.

## Elevation & Depth

The system is flat. Depth comes from tonal steps (ground, surface, raised), from hairlines, and from photographs under graded dark scrims. Shadows exist in exactly four places: menus that open over the page, the sliding thumb of a segmented control, the motion switch's knob, and the region tags pinned to the Simulator's globe.

### Shadow Vocabulary
- **Menu** (`box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5)`): select menus and other popovers.
- **Thumb** (`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5)`): the moving thumb in a segmented control.
- **Knob** (`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35)`): the motion switch's knob.
- **Map tag** (`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4)`): the region tags on the Simulator's globe (dark plates with a bone edge and 3px corners), so they lift off the satellite picture.

### Named Rules
**The Scrim Not Shadow Rule.** Words placed on a photograph sit on a ground-tinted gradient scrim (from the bottom, or from the left on wide screens) or on a dark plate, never on a drop shadow or text shadow.

## Shapes

Small, even corners. Buttons, cards, frames, picture tiles, chips and inputs use 4px; plates and small chips on pictures use 3px; calendar cells are square. Circles are reserved for satellite marks, the ring-to-dot glyphs, the motion switch and the arrow well on picture doors. Borders are 1px hairlines; satellite marks carry a 1.5 to 2px ground stroke so they stay legible where they overlap.

## Components

### Buttons
Quiet and solid; one primary per view.
- **Shape:** gentle 4px corners, at least 48px tall, 20px side padding, 14px medium text, an optional 16px line icon at 1.5 stroke.
- **Primary:** bone fill, ink text; hover steps to bone-hover over 150ms.
- **Secondary:** transparent with a bone-30 border and bone text; hover fills with hairline.
- **Focus:** a 2px bone outline offset 2px on every interactive element. Inside toggle groups the focus is an inset 2px ring (bone, or ink on the selected item).

### Links
- **Text link:** bone text with a bone-30 underline offset 3px; on hover the underline is replaced by one that draws in from the left and leaves to the right (300ms).
- **Quiet link** (footer, credits): bone2, turning bone on hover, with the same drawing underline.

### Chips and Plates
- **Unusual:** bone fill, ink text, 4px corners.
- **Not unusual:** transparent with a bone-30 border, bone2 text.
- **Plate:** a dark translucent label (plate colour) on a photograph, 12px bone text, 3px corners, often led by a satellite mark.
- **Mock data tag:** hairline border, 12px bone text; shown only while a file says it is mock.

### Cards / Containers
- **Picture door:** a whole photograph is the link: 4px corners, surface behind the image, a bottom scrim, title in the headline band and one line of body text at the bottom, an arrow-up-right in a round plate at the top right. On hover the picture grows to 1.03 over 700ms and the arrow nudges up and right.
- **Place row:** a full-width link row between hairlines: thumbnail (3px corners), name, the shift on a short stretch of afternoon, the count on the shared strip, the chip, an arrow. Hover fills surface and grows the thumbnail to 1.05.
- **Caveat box:** next to every finding, a 1px border box (hairline on dark, ink-20 on bone) with 4px corners and 16 to 20px padding.

### Inputs / Fields
- **Toggle group:** raised track, 4px corners, 44px tall on phones and 36px from 640px; the selected item fills bone with ink text.
- **Segmented control:** surface track with a hairline border and 3px padding; a bone thumb with a 3px radius slides between options on the UI ease.
- **Selects:** native selects for month and year so phones open their own pickers; the region picker is a menu with the menu shadow, capped at 168px (240px wide).
- **Disclosure:** native details/summary in 14px bone2 with a 12px arrow that turns 90 degrees when open; the panel holds terse 12px bullets.

### Navigation
- **Site bar:** fixed, solid ground, hairline bottom edge, 56px. Links are 14px bone2, 44px tall, turning bone on hover; the current page is bone with a 1px bone underline and is not a link.
- **Footer:** hairline top edge, 12px bone3 text on a 12-column split: logo, the team line and the Motion switch on the left; photograph and video credits on the right.

### Satellite Marks (signature)
- **Terra:** a hollow circle with a 2px blue stroke over ground.
- **VIIRS:** a green square turned 45 degrees, at 74% of the mark size.
- **Aqua:** a filled amber circle; for its old time, a hollow amber ring.
- On charts each mark has a 1.5px ground stroke; inline in text they sit at 9 to 11px beside the satellite's name.

### Motion
- **Reveal:** content fades in and slides 32px from the left over 1000ms on easeOutExpo (`cubic-bezier(0.19, 1, 0.22, 1)`), staggered 80ms per row. Content is visible by default and is only held back while waiting below the fold with motion on.
- **Rule draw:** hairline rules scale in from the left over 1500ms on the same curve the first time they are seen.
- **UI ease:** state changes use `cubic-bezier(0.22, 1, 0.36, 1)`: colour 150ms, underline 300ms, toggles about 240ms.
- **Page change:** the page fades and grows to 1.02 over 350ms before the link is followed; the next page arrives from 0.98.
- **Scroll:** eased wheel scrolling while motion is on; in-page links glide in 0.4 to 0.7s and stop the moment the reader scrolls.
- **Motion switch:** an elastic switch in the footer. It starts from the reader's reduced-motion setting, is remembered when storage allows, and when off stops every transition and animation on the page. Every animated figure has a matching still.

## Do's and Don'ts

### Do:
- **Do** use real photographs (Unsplash, credited by photographer in the footer) and real NASA Worldview / GIBS satellite pictures, credited "NASA Worldview / GIBS".
- **Do** keep every satellite colour attached to its shape: Terra a blue ring, VIIRS a green diamond, Aqua an amber dot.
- **Do** draw any moved time as a ring (old time) joined to a dot (new time).
- **Do** put the caveat beside every finding: the timing and the count changed together, but we can't say how much of the difference the timing caused.
- **Do** write in plain words outside the Method page: "what we'd expect", "unusual", "how sure we are", "too few fires to read".
- **Do** set every time and number in tabular figures, and give satellite look times in 24-hour local sun time (the park analogy alone uses 1:30 and 3:00).
- **Do** label mock data wherever it appears.

### Don't:
- **Don't** use amber for anything but Aqua.
- **Don't** show people or faces in any photograph or video.
- **Don't** use NASA logos, flags or mission insignia.
- **Don't** use statistical or remote-sensing terms (noise floor, placebo, confidence interval, overpass) outside the Method page.
- **Don't** say the timing caused, added or removed fires.
- **Don't** call anything "official" except INPE's series; the one other use is the footer's disclaimer that the site is not an official NASA product.
- **Don't** put words on a photograph without a scrim or plate behind them.
- **Don't** add a third type weight, a second typeface, or drop shadows on cards.
