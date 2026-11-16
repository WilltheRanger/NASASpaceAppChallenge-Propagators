# Artifact scientific-copy corrections

Isolated review branch based on the matching multipage artifact source at 556eacf. No merge, deployment or artifact edit.

- Distinguishes satellite detections from distinct fires and an Aqua-equivalent benchmark from an identified causal counterfactual.
- Explains displayed overview intervals as conditional 95% bootstrap intervals, not a probability assigned to a causal effect.
- Fixes repeated acres units and distinguishes historical calendar coverage from the separate incomplete 2026 NRT snapshot.
- Adds a separate P9 follow-up to the original test accordion. Counts come from the immutable final report at 3d06ffb; all six biomes remain insufficiently identified. The original tests, status tally, calibrated arrays, gates, and layout remain unchanged.

Validation: `python -m unittest discover -s analysis/artifact-science-copy -v`; `cd frontend && npm ci --ignore-scripts && npm run build`. Review the small commit rather than merging unrelated scientific variant branches. This does not verify a slide deck: the supplied app link is the app.
