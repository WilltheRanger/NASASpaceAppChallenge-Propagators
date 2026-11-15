# Integration readiness snapshot

Checked the active frontend integration at74f2463 (15 Nov2026), not an obsolete design preview. This branch adds verification only; it does not replace active design work or merge new scientific outputs.

## Completed checks

- Production `frontend/src/r2/data.ts` uses `outside_noise` from the pipeline. The previously reported CI-versus-symmetric-noise discrepancy remains in rejected Round1 mock design code only, not the production verdict path.
- `npm ci --ignore-scripts` completed, audit reported0 vulnerabilities. `npm run build` passed TypeScript and Vite production build. Non-fatal warning: main JS874.80kB, gzip224.45kB. The teammate recently chose a single initial script; no performance design reversal made here.
- Six regions have real audit/calendar JSON; each calendar has288 distinct months2002-01 through2025-12.
- `analysis/statistics/facts.py` exactly reproduces the current `data/out/facts.json`. This is the verified number sheet to compare slides against. No actual presentation deck is present, so slide text itself has NOT been verified.
- Current frontend bundles committed JSON. It does not need a NASA API key to display the app. No keys read, changed or committed.

## Outstanding integration work and dependencies

1. **2026 extension:** all three public annual Brazil URLs below returnedHTTP404 in this check. Do not append zeros or extrapolate2026. Acquire archive/standard or provisional source records, explicitly label provisional months, preserve completed-year comparisons, and validate sensor outages/coverage. The NASA API-key issue relates to new acquisition, not building this app. A public seven-day feed cannot reconstruct a full2026 calendar.
2. **Science variant adoption:** newer exact-boundary and corrected-check branches are isolated candidates, not silently merged into the active frontend. Choosing one requires regenerating facts/figures/daylight consistently; existing slide numbers should not be mixed with a different variant.
3. **Daylight:** `analysis/daylight/daylight.py` still reads `analysis/brazil-data/out/biome_lookup_0p1deg.csv` for per-detection biome assignment. Its benchmark provenance explicitly names that file. The production frontend imports `data/out/daylight` headlines. Historical exact-boundary adoption requires a synchronized daylight recomputation and benchmark review, not just replacing the audit JSON.
4. **Slides:** compare the actual deck to the regenerated facts sheet once available, including disclosure/caveats. This snapshot cannot certify a deck it has not read.
5. **UI integration:** active branch already merged teammate frontend load-time work and statistics facts/figures. Preserve that work rather than reimplement an older artifact. Integration/adoption and deployment remain team decisions.

## Public2026 availability checked

- https://firms.modaps.eosdis.nasa.gov/data/country/modis/2026/modis_2026_Brazil.csv
- https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/2026/viirs-snpp_2026_Brazil.csv
- https://firms.modaps.eosdis.nasa.gov/data/country/viirs-jpss1/2026/viirs-jpss1_2026_Brazil.csv

## Recheck

`python analysis/integration-readiness/verify.py`

Read-only: verifies real region data, calendar uniqueness, descriptive verdict flags and exact facts regeneration in a temporary directory. Outputs a JSON report, exits nonzero for contract problems. It explicitly does not claim slide verification or2026 completion. Requires pandas. Re-run after any integration change.
