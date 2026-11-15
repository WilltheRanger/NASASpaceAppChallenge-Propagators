# Independent Explore source audit

Verified on Kevin’s MacBook Neo, 15 November 2026, source commit `460550738c9d7732ac7f97c0a2b7225e26e68bb2` (includes Connor’s `b6955ec`). No team UI edited, merged, or deployed.

## Verified

- `facts.json` reproduces exactly from current inputs using the existing statistics generator. Run `python analysis/explore-validation/verify.py` (requires pandas). It writes only to a disposable temporary directory, never the source outputs.
- Six historical calendars each contain 288 distinct months, January 2002–December 2025; no provisional 2026 rows mixed in. No mock flags or missing placebo-status flags found.
- In actual Mac Chrome, clicking West Africa square `g2_-6_12` selected 12–14°N, 6–4°W. Displayed 2025 +45% (21–72%), Aqua 684, S-NPP 4,994, look-time shift +66 minutes; 2024 +48% (30–68%). Each matches grid JSON after display rounding.
- **Hover not verified.** The available control API provides click/drag but no hover action. Click success does not establish hover success. A human pointer-hover check remains appropriate.

## Owner-facing observations, not edits

- Latest Overview still says “what Aqua would have counted at its old time” and that the “real difference is very likely inside” the interval. Port the benchmark/counterfactual and conditional-bootstrap wording from `brady/artifact-science-copy` / `eaa2b01` manually into the new design. Do not wholesale overwrite the redesigned Overview.
- P9 follow-up remains separate from the original failed test: final data commit `3d06ffb`, 18 dates/330 swaths, zero eligible primary observations; sensitivity has 342,300 center-date observations and 46 discordant fires, all six biomes insufficient identification. This does not validate a timing correction or turn the original P9 into a pass.
- Fire-dot window is 14 Nov 00:07–15 Nov 07:22 UTC, roughly 31 hours, not exactly 24 hours. Prefer the explicit snapshot interval to a literal “past day” claim.
- No slide deck was located or certified. This audits the source sheet and selected UI readings, not unseen slides.

## Integration

These two files are independently portable: no frontend or data changes. Original scientific tests, pass/fail labels, and team-owned Explore files are untouched. Local preview used for validation was stopped afterward.
