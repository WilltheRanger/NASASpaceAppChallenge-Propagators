# NASA Space Apps Challenge — Propagators

Making 20+ years of fragmented MODIS and VIIRS fire detections comparable and understandable.
Project brief: [Info.md](Info.md).

## Data pipeline (status: working, Greece 2001 → today)

```
data/
├── raw/        untouched FIRMS CSVs (git-ignored, re-download with step 1)
├── processed/  cleaned, harmonised hotspots + monthly summary
├── sample/     ~2k stratified rows for frontend/AI development and tests
└── metadata/   sources, data dictionary, limitations, quality report, download manifest
`````bash
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pipeline.download --country Greece --start 2001 --end 2026   # 1. yearly archive (MODIS + VIIRS S-NPP)
.venv/bin/python -m pipeline.download_recent --mode keyless                     # 2. last 7 days, MODIS + NOAA-20/21 (no key)
.venv/bin/python -m pipeline.clean --country Greece                              # 3. clean + merge
.venv/bin/python -m pytest -q                                                    # 4. tests
.venv/bin/python -m analysis.validation.modis_version_boundaries                 # 5. sensor-consistency checks
```

Optional, with a free [FIRMS MAP_KEY](https://firms.modaps.eosdis.nasa.gov/api/map_key/): backfill 2026-to-date and the NOAA-20/21 archive.

```bash
export FIRMS_MAP_KEY=your_key
.venv/bin/python -m pipeline.download_recent --mode api --country Greece --start 2026-01-01
.venv/bin/python -m pipeline.download_recent --mode api --country Greece --start 2018-04-01 --end 2025-12-31 --sensors viirs-noaa20 viirs-noaa21
```

Any FIRMS country file name works for `--country` (e.g. `Australia`, `United_States`; US/Australia files are hundreds of MB per year).

Key findings so far (Greece): VIIRS sees 3.1–4.0× more fire pixels than MODIS every year; MODIS version changes cause no step change; **Terra/Aqua orbit drift since ~2022 shifts MODIS overpass times by ~1 h**; **Suomi NPP stopped delivering data on 2026-11-02**, so VIIRS now continues on NOAA-20/21. Details: [data-limitations.md](data/metadata/data-limitations.md), [analysis/validation](analysis/validation/).

.

Outputs:

- `data/processed/firms_<country>_hotspots.parquet`: one row per fire pixel, MODIS and VIIRS in one schema ([data dictionary](data/metadata/data-dictionary.md))
- `data/processed/firms_<country>_monthly_summary.csv`: counts, confidence mix and FRP per satellite per month
- `data/processed/firms_<country>_rejected.csv`: rows that failed validation, with reasons
- `data/metadata/quality_report_<country>.md`: row accounting and coverage

**Read [data-limitations.md](data/metadata/data-limitations.md) before analysing.** One row is one pixel, not one fire; MODIS and VIIRS counts and FRP aren't interchangeable.

Data: NASA FIRMS. See [sources.md](data/metadata/sources.md) for URLs, citation and acknowledgement.
