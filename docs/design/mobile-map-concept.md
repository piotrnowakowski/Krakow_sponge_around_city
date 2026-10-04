# Mobile map concept

Generated with the built-in imagegen tool on 2026-10-04, using the supplied phone screenshot as a visual reference. `mobile-map-concept.png` is a design reference, not map data or an application background. The actual interface uses the existing interactive geographic layers.

## Final generation prompt

Use case: ui-mockup
Asset type: preview concept for a mobile web mapping app redesign
Input images: Image 1 is a reference of the existing Polish Kraków Sponge app, not an edit target.
Primary request: Design a much calmer, implementable mobile map interface for this exact app, preserving its navy and blue identity, Polish language and geographic river map. Show one high fidelity mobile screen, straight on, no device frame or browser chrome. Compact white header with small blue droplet, "Gąbka Krakowa" and subtle "PL / EN". Map occupies nearly the full screen. One compact basemap control at upper left labeled "Mapa ▾", small zoom buttons upper right. At bottom a compact white rounded sheet with a small handle, heading "Odkrywaj mapę", and a single line "Rzeki i zlewnie wokół Krakowa" plus a disclosure chevron. Beneath this, a clean three-item navigation "Mapa", "Zgłoś", "Więcej". Report action visually clear, blue plus icon. No onboarding popup, no large yellow story button, no grids of cards obscuring map, no redundant report floating button. Generous empty space around controls, readable 14–16px-equivalent typography and 44px touch targets. Retain map with labels Rudawa, Prądnik, Dłubnia, Kraków, pale land and clear blue rivers. Design concept only; precise geographic data will come from the existing implementation.

## Implementation

Compact header, map-first initial viewport, collapsible exploration panel, basemap selector and three bottom actions. The story is available through More instead of an unsolicited mobile popup. Existing desktop panels remain available.

Reporting requests browser location only after the user starts adding an observation. Permission denial, timeout and missing support retain manual selection. Pending results are ignored after cancellation or manual selection. A location correction retains the draft fields and photo. Reports remain browser-local until explicitly exported or shared.

Browser API reference: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition

Validation: `npm run build --prefix web` and `node tools/test-mobile-reporting.mjs http://127.0.0.1:5182/`. Browser checks use simulated coordinates; real device permission prompts and sensor accuracy require device testing.

Additional regression checks: `tools/test-corridors.mjs` (desktop/mobile, English/Polish), `tools/test-tour.mjs` (desktop/mobile) and `tools/test-a11y.mjs` (desktop panels, mobile map/menu/views/location/form). Screenshots from the reporting suite are saved under `output/mobile-reporting/`.
