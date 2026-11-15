# anduril.com: code, motion and UX (study for direction D)

Studied on 15 Nov 2026 at the team's request ("go more deep into Anduril's website… click around"). Sources: the
served HTML; the asset manifest (345 files); the app bundle (`app.js`, 1.5 MB, 419 classes), the stylesheet
(`style.css`, 385 KB), the shader bundle (65 programs) and the scene file (`uil.json`); and the site driven in
Chromium: menus hovered, nav and search clicked, a product page (Fury) scrolled, the phone menu opened, the hero's
text traced every 50 ms.

## 1. How it is built

- **Active Theory's Hydra.** The HTML ships no content: a config object, the Sanity CMS payload as JSON for crawlers,
  a 3 px load bar and one deferred bundle that builds every view at runtime. Components are Hydra classes
  (`Class(function HomeHero(){…})`) composed from "contexts": `ViewStateElement`, `Link`, `TextAnimationHelper`,
  `InView, 0.5` and so on. Each page is a list of CMS slices (`HomeHero`, `FeaturedProducts`, `ArsenalSlice`,
  `NumberCallOutSlice`, `Product3DSlice`, `ProductQualitiesSlice`…), 192 component styles in all.
- **Display text is WebGL.** The visible hero headline is MSDF text drawn on a fixed full-screen canvas (`GLText`,
  `GLUIBatchText`, `msdf.glsl`); the DOM `h1`/`h2` hold the same words for screen readers (`GLA11y`). Our text trace
  of the DOM headings only ever read the template placeholders.
- **Shaders:** 65 programs: media drawn as GL quads with displacement transitions (`MediaQuad`,
  `SliceScreenQuadTransition`), a full fluid simulation (advection, curl, divergence, pressure, splat, vorticity),
  particle fields (Lattice, globe), a floor grid, glass, decals, Unreal-style bloom and a Lanczos upscale.
- **Scrolling:** Lenis for the page; Hydra's own inertial scroller (0.5 lerp, 0.9 decay) inside panels.
- **Fallbacks:** a separate `unsupported.html` for old browsers; the 3D viewer shows a hazard-striped placard
  ("Unsupported device detected · your device does not support this experience") when WebGL can't run it.

## 2. Tokens (from the stylesheet)

- **Grid:** 12 columns everywhere (`repeat(12,1fr)`, 79 uses), 0.357 rem gutters (5 px), one breakpoint at 768 px
  (779 rules) plus scaling steps at 1280, 1440, 1920 and 2400. The root size scales with the viewport
  (`--fontSizeMultiplier`), so rem sizes are fluid.
- **Type:** Helvetica Now Display (282 rules) at 400 and 500; Elios (16) for small coded labels. Line heights 105%,
  115% and 120%; display tracking slightly negative (−0.009 to −0.0875 rem); 113 uppercase rules, labels at 0.75 rem
  with +0.03 rem.
- **Colour:** off-black `#010101`, white, one accent (chartreuse `#DFF140`, 53 uses: load bar, focus ring, scroll
  button, warnings), warm greys `#B0B0A9` `#565654` `#6C6E6B`, off-white `#F1F0EA`, olive `#505544`, sand `#BDAD96`.
- **CSS motion:** `transform .3s ease-out` and `color/opacity .3s` dominate; one bezier, `(.215,.62,.34,1)`.

## 3. Motion, as coded

| Effect | Where | How |
|---|---|---|
| **Decode** (`TextAnimationHelper.animateText`) | hero short title (500 ms), card subtitles (750 ms), menu labels | Tweens a value 0→1 with easeInOutSine; a render loop at 20 fps rewrites the text: characters before `v × length` are final, the rest are random A–Z (0–9 if the string is a number), case kept, spaces and `/ ? , .` kept. Restores the clean text on finish or interrupt. |
| **Line rise** (`SplitText`) | hero title | Splits into lines (balanced), each line rises from `y: 100%` to `0` inside a mask, 1000 ms easeOutExpo, 100 ms apart; the media settles to 60% opacity, the content to 1, 1000 ms easeOutExpo. |
| **In view** (`InView`) | every slice | IntersectionObserver, threshold 0.05 by default, 0.5 for cards; `onInView` and `onOutView`. |
| **Card reveal** (`FeaturedProductsCard`) | product tiles | At 50% visible: the subtitle opens from 0 to its height with a 0.5 rem margin, opacity 0→1, 500 ms easeOutCubic, then decodes (750 ms); the ↗ fades in. |
| **Rule + slide** (`NumberCallOutBlock`, `MediaLinkCard`) | stats, link cards | A border draws (`scaleX` 0→1, 1000 ms easeOutExpo); stat, label, text come in from `x: −10%`, opacity 0→1, 1000 ms easeOutExpo, 200 / 300 / 400 ms delays. |
| **Hover reveal** (`ArsenalItem`) | arsenal bands | The item slides in from `x: −10%`; on hover its CTA row opens from 0 to its height, 500 ms easeOutExpo. |
| **Odometer** (`RollerCounter`) | number call-outs | One column per digit, each a stack of 0–9 moved with `translateY(−n × 100%)`, taking the shorter way round; 1000 ms easeOutSine, all columns together. |
| **Page change** (`PageTransition`) | every route | Overlay fades in 350 ms easeOutSine while the old page scales to 1.02 about the viewport centre; swap; the new page scales 0.98→1 as the overlay fades out, 350 ms easeInSine. |
| **Underline** (`LinkButton`) | text links | `::after` scaleX 0→1 from the left, 0.3 s ease-out; on leave it replays out to the right. |
| **Load bar** (`LoaderView`) | first load | 3 px chartreuse bar tracks the asset loader; done → loader fades out 300 ms easeOutCubic. |
| **Animation switch** (`AnimationSwitch`) | footer | "Animations Off / On", a pill sliding between the two words (0.3 s), `role="switch"`, `aria-checked`; seeded from `prefers-reduced-motion`, saved in localStorage. |

Tween totals across the bundle: opacity 192, x/y 93, height 45, scaleX 29, clipPath 3. Durations: 500 ms (100),
300 (55), 1500 (20), 800 (13). Eases: easeOutCubic 107, easeInOutCubic 97, easeOutExpo 89, easeOutSine 65.

## 4. UX, clicked through

- **Header:** logo left; six destinations centred (15 px, regular, −0.144 px); Search and "Company +" right. Hiding is
  reference-counted (`Global.header.createHider()`): any component can ask the header to step aside.
- **Mega menus:** hovering a destination waits about 100 ms, then the page behind blurs and dims (opacity 0→1 over
  roughly 500 ms) and a black panel shows a short description on the left and a "+" list of links on the right.
- **Search:** the same frosted overlay with one underlined field ("Search Anduril") and a magnifier.
- **Phone menu:** a full-height black panel slides in from the right with 24 px items; its "Contact" label decodes.
- **Home:** a hero video inside a black margin cycling through scenes, a dense grid of product tiles (title, one
  line, ↗), arsenal bands with their own background colours, news on off-white, two big colour cards, footer.
- **Product page (Fury):** the name huge at the left; a small row under it (category, a bracketed code, a short
  description) and a ↓; a full-width video; a 3D viewer behind "Take control / system initializing / please wait"
  with a placard fallback; "Build qualities" as tabs over numbered cards ("01 / 04"); a closing slogan
  ("Fight unfair") set huge before the footer.

## 5. What Anchor takes, and what it doesn't

The team asked to keep D's current landing layout (full-bleed photograph, verdict over it, buttons) and add to it
rather than replace it. Taken, inside Anchor's rules:

| Anduril | Anchor |
|---|---|
| Decode (`animateText`): left to right, easeInOutSine, 20 fps, case kept, digits for numbers | The landing headline decodes when the region changes (500 ms); region tile verdicts decode as the tiles arrive (750 ms) |
| Hero scenes cycling | The landing steps through the six regions (photograph + verdict) until one is picked; progress line on the region tabs; pause button; stops when the hero is out of view, on hover or focus |
| Line rise in a mask, 1000 ms, 100 ms stagger | Section titles rise into place on the landing |
| Rule + slide (`scaleX`, then `x: −10%`, 200 / 300 / 400 ms) | "How it works" steps: each top rule draws, then its words arrive |
| Card reveal at 50% visible, ↗ | Region tiles: photograph, region, verdict, ↗; open-the-audit line rises on hover |
| Page change: fade + 1.02 / 0.98 scale, 350 ms | Landing ↔ audit: the page fades and scales out, the next fades and scales in |
| Underline that draws in and replays out | Text links on both pages |
| Animation switch with a sliding pill | Footer "Motion Off / On" switch, seeded from reduced motion, saved when storage allows |
| Closing slogan before the footer | The tagline, "Count the fires, not the clock.", closes the landing with one last way into the audit |

Not taken: WebGL text, shaders and the fluid simulation (no number depends on WebGL, and DOM text stays selectable);
Lenis scroll smoothing (a data tool keeps native scroll); uppercase labels and coded brackets (Anchor is sentence
case, no mono as costume); the chartreuse accent (Anchor's colour comes from the photographs and the sage band).
Anchor keeps its one easing, `cubic-bezier(0.22, 1, 0.36, 1)`, close to their easeOutExpo, and the decode keeps
their easeInOutSine progress because it is a reading speed, not a movement.
