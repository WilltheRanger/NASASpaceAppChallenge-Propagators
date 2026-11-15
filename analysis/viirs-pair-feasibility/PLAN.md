# Analysis specification written before running paired analysis

Post-hoc feasibility analysis, not preregistered. Keep original P9 unresolved and existing failed MODIS surrogate intact.

Use NASA standard FIRMS S-NPP and NOAA20 Brazil2018–2020 files, before2023–25 predicted outcomes. Daytime type0, normal/high confidence; historical IBGE exact-coordinate labels. Pair satellite detections in the same0.1° cell, UTC date and biome, aggregating count, total FRP and median local solar time. Include only cells with detections from both instruments. Primary diagnostic: both observation medians after13:30, absolute separation15–90min. No zero imputation; no claim that missing detections mean clear non-fire observations. Report pair numbers/times and descriptive slopes without selecting parameters for favorable P9 outcomes.

Fit log(NOAA20/SNPP count)=intercept+beta*(NOAA20−SNPP local time); intercept absorbs constant instrument bias. Same FRP model as secondary. Equal cell-day weighting. Uncertainty: seeded1000 Poisson16-day-block bootstrap, common weights over space. This addresses temporal clustering but not all spatial/error dependence. Conditioning on double detection, scan geometry, differing footprints and unknown clear-sky exposure can bias slopes. Positive beta does not validate P9 without those controls.
