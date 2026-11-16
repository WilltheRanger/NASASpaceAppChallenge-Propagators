# Direct calendar entry

Small isolated review patch based on UI a63d3e1. No data, calculations, Simulator or globe changes.

- Overview first-screen action opens Regions directly at its monthly calendar.
- Regions shortcut appears before the audit result and keeps the selected region.
- Explicit calendar title, mode explanation and historical/noncausal limitations.
- Lazy-mounted calendar resolves its incoming anchor after rendering.

Validation: three navigation/source contracts pass; TypeScript, production build and artifact build pass. Actual Chrome Overview action lands on the visible calendar heading, controls and heatmap. Existing large-chunk warnings remain. Artifact link uses regions.html#calendar; live link uses ?page=regions#calendar. No deployment or merge performed.

Teammate branch advanced to ee708f2 during validation; its changes since the base affect only Simulator.tsx, with no overlap in this patch. Review/cherry-pick this commit rather than replacing the active UI branch.
