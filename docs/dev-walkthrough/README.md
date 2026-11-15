# Developer walkthrough video (2:01)

A two-minute explainer for the people building the web app: what the app shows, how the data flows, and the rules your code has to follow.

**Watch:** [`propagators-dev-walkthrough.mp4`](propagators-dev-walkthrough.mp4) (1920×1080, 30 fps, 2:01, captions burned in). [`captions.srt`](captions.srt) has the same captions for players and uploads, and [`script.md`](script.md) has the full narration with timestamps and sources.

> **Internal only.** This is a team onboarding video, not our judging demo. The Space Apps demo limit is a video of 30 seconds or less (or 7 slides or fewer); going over makes a project ineligible for Global Judging.

## What it covers

| Time | Chapter | Takeaway for developers |
|---|---|---|
| 0:00 | Intro | The app is a fixed-clock fire calendar with a clock audit. |
| 0:07 | Why | Aqua's 1:30 PM look now happens near 3:50 PM over the Amazon, and Terra drifts earlier. Fire activity changes through the day, so counts shift even when fires don't. Brazil's official record (INPE) still uses Aqua. |
| 0:30 | Method | `R = Aqua ÷ VIIRS` (2012–2020, per region × month), `fixed = VIIRS × R`, `L = Aqua ÷ fixed`, `gap = L − 1`. |
| 0:50 | The app | Six preset regions, plus each panel and the JSON file it reads: calendar, clock audit, drift chart, two-clocks test (centerpiece), California detection limits with seen-vs-missed fires, and the "How do we know?" checklist. |
| 1:25 | Data flow | FIRMS (+ FPA-FOD for California) → Python pipeline → `data/out/*.json` → static app. Build against `data/mock/` until the real files land. |
| 1:42 | Rules | MOCK badge on mock data · `null` means no data, never 0 · hatch `provisional`, mark `outage` · `insufficient_data` shows "Not enough fires to measure" · every number on screen comes from the JSON. |
| 1:57 | Start | `data/mock/README.md`, `research/execution-plan.md`, `analysis/`. |

## Where the content comes from

Everything in the video comes from the team's own files on branch `claude/beautiful-hawking-r06ab0` (commit `04c4a92`):

- `research/execution-plan.md`: pitch, method (§4), data contract (§3), deadline note (FINAL PLAN v1.1)
- `data/mock/README.md`: panels, fields and UI rules
- `analysis/drift-check/README.md`: measured satellite look times
- `data/mock/*.json`: every number in the app previews. These are **synthetic**, and the video shows them with MOCK badges.

The app previews are an **illustrative layout**; the layout is up to the app team. The method chart is a labeled schematic with no real numbers, and the fire-activity curve in "Why" is illustrative. No numbers from `data/out/` appear in the video.

## AI disclosure (Space Apps SI rules)

- **AI-generated:** the narration script, all visuals and animation code, and the voice. They were made with Claude Code (an AI coding assistant) in a cloud session. The synthetic voice is Kokoro-82M (open-source text-to-speech, Apache-2.0), voice `af_heart`.
- **Watermark:** "AI-generated video · synthetic voice" stays on screen for the whole video.
- **Metadata:** the MP4's title, comment and description tags say the video, voice and code are AI-generated.
- **Checked:** the narration was transcribed back with faster-whisper to confirm the voice says what the script says, and each fact was checked against the files listed above. The team should still review it before it goes outside the team.
- **No NASA logos or branding.** NASA datasets are named only as data sources.
- Add this to the SI disclosure log (`research/execution-plan.md` §8): when · who · tool · what it did · checked by.

## Credits

Data sources named: NASA FIRMS (MODIS C6.1, VIIRS 375 m) and USFS FPA-FOD 7th ed. Tools: Kokoro-82M (via kokoro-onnx), faster-whisper, GSAP, Playwright with Chromium, and FFmpeg. Fonts: Inter, Space Grotesk and JetBrains Mono (SIL Open Font License).

## Rebuild or edit

`source/` rebuilds the video from scratch. Edit `source/script.json` (narration) or `source/scenes.js` (visuals), then run `source/build.sh`. The header of that script lists what it needs and downloads.
