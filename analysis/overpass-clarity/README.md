# Satellite timing clarity

Base: story 5a902fd. Only LookTimes in FieldFilm.tsx changes; no numerical input, globe renderer, gap, alert, or calendar changes.

Design reference read: WilltheRanger/ui-forge-kit README and skills/ui-director/SKILL.md. Applied hierarchy-first guidance, retaining Anchor's existing visual language and components. No plugin, registry code or external dependencies installed. Native HTML select supplies keyboard and platform accessibility.

Changes: prominent selected year and explicit year control; chart endpoint labels explicitly identified as the latest year; local sun time explained; globe labeled schematic, not a live satellite position or exact pass forecast.

Verified: TypeScript/Vite production build passes; git diff --check passes. Real Chrome preview: selecting 2024 synchronizes table (Aqua14:20, VIIRS13:31, Terra09:39), globe accessible label and chart marker. Left arrow on chart selects 2023 and synchronizes dropdown/table/globe. Latest-year endpoint explanation remains2025. Desktop screenshot inspected. No mobile viewport test yet.
