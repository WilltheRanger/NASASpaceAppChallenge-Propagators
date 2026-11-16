# Cloud control for the Aqua/Terra look-time drift

Question: Aqua now looks at the Amazon and Cerrado later in the afternoon (median about 13:38 LST in 2012–2020, about 14:52 in 2025), and Terra looks earlier. Could a difference in cloud cover between the old and new look times explain the change in fire counts, with no change in the fires themselves?

## Method
1. **Cloud data.** NOAA GOES-East ABI Level-2 Clear Sky Mask, full disk (`ABI-L2-ACMF`), variable `BCM` (0 = clear or probably clear, 1 = cloudy or probably cloudy, 255 = fill). GOES-16 is used through 2025-04-06 and GOES-19 from 2025-04-07.
   - Files are read straight from NOAA's public AWS buckets with HTTP range requests (`goes_clear.py`).
   - Only the gzip chunks of `BCM` (226×226 pixels) that cover the Amazon or Cerrado are fetched, and they are decompressed in memory. Nothing is written to disk.
   - The remote read was checked against a fully downloaded file and gave identical counts.
2. **Grid and regions.** The fixed-grid x/y coordinates (in radians) are converted to latitude/longitude with the GOES-R PUG Vol. 4 §4.2.8.1 formula, using the `goes_imager_projection` attributes. The grid is subsampled to every 4th pixel (about 8 km). Each pixel is assigned to the `amazon` or `cerrado` biome through `../brazil-data/out/biome_lookup_0p1deg.csv` (`floor(lat*10)`, `floor(lon*10)`).
3. **Sampling.** July–October, every 5th day starting 1 July, using the :00 and :30 full-disk scans from 11:00 to 21:00 UTC. That window covers about 08:30–16:00 local solar time (LST) across both regions.
   - Each pixel's time is the scan start plus 9.5 min × row/5424, a rough model of the north-to-south sweep.
   - LST = UTC + lon/15, binned into 15-min bins.
4. **Clear fraction.** The clear fraction for each region, year and LST bin is Σ clear / Σ valid pixels.
5. **Look-time distributions.** These come from FIRMS MODIS daytime detections (`daynight == 'D'`, July–October) in each biome, binned by LST in the same 15-min bins. There is one distribution for each satellite: 2012–2020 pooled ("old") and each single year ("new").
6. **Cloud factor.** C = Σ w_new·clear / Σ w_old·clear. Both terms use the same year's GOES clear-sky curve, so C isolates the effect of the time of day.
   - C < 1 means the new look time is cloudier, so clouds would hide fires.
   - The 95% intervals come from 1000 bootstrap resamples of the sampled days.

Run: `../../.venv/bin/python -I goes_clear.py 2024 2025 2023` and then `../../.venv/bin/python -I analyze.py`. The outputs go to `out/` and `results.md`.

## Sources
- GOES-16 ACM: https://noaa-goes16.s3.amazonaws.com/index.html#ABI-L2-ACMF/ (listing API: `https://noaa-goes16.s3.amazonaws.com/?list-type=2&prefix=ABI-L2-ACMF/2024/245/18/`)
- GOES-19 ACM: https://noaa-goes19.s3.amazonaws.com/index.html#ABI-L2-ACMF/
- NOAA Open Data Dissemination (GOES on AWS): https://registry.opendata.aws/noaa-goes/
- GOES-R Product User Guide (fixed-grid navigation, Vol. 4 sec. 4.2.8): https://www.goes-r.gov/resources/docs.html
- FIRMS MODIS C6.1 archive (local copy `/Users/himatthew/spaceapps/raw/firms_brazil/modis_YYYY_Brazil.csv`): https://firms.modaps.eosdis.nasa.gov/download/

## Limits
- 2023 was only partly extracted (4 days) before the run was stopped for time, so `analyze.py` drops any year with fewer than 10 sampled days. Resuming `goes_clear.py` fills in only the missing scans.
- The ABI cloud mask is not the same as MODIS's own cloud screening. The binary mask also merges probably-clear with clear and probably-cloudy with cloudy. What matters here is the *ratio* between times of day, which depends less on the exact cloud threshold than the absolute clear fraction does.
- Viewing geometry differs. ABI views from geostationary orbit, at a slant angle of roughly 20–50° over Brazil; MODIS views from a polar orbit, often at large scan angles. Thin cirrus and small cumulus are detected differently in the two.
- The clear-sky curve is a regional, pixel-weighted mean over the whole biome. It is not weighted toward where fires actually occur. The FIRMS look-time weights are themselves taken from fire detections, which happen only under clear sky, but that affects the old and new distributions in the same way.
- Sampling is every 5th day at 30-min cadence. Day-to-day weather is the main source of uncertainty, and the bootstrap captures it. Sampling between scans is not resolved finer than 15-min LST bins.
- Clouds are only one possible confounder. Fire activity itself also has a diurnal cycle, peaking around 15–16 LST, and that is separate from what this control measures.
