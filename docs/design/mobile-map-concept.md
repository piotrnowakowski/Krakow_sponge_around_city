# Approved mobile map design

Reference: [option 2 without the subtitle](mobile-map-approved.png), approved by the user on 2026-10-04. Generated with the built-in imagegen tool. This PNG is a visual reference; the application continues to render its real interactive map data.

## Implemented layout

Navy header with a compact language selector and menu. The default bottom sheet contains only the heading, Rivers / Retention / Drought topic choices and the report button. The subtitle was removed, and there is no bottom navigation bar or unsolicited mobile tour popup. Detailed views and the guided story remain in the menu. Retention opens the current terrain-ponding candidate layer; drought opens monitoring and its information panel.

Reports request browser location only after the user starts adding an observation. Denial, timeout and missing browser support retain manual map selection. Late results cannot override a cancellation or manually selected point. Location corrections preserve the draft fields and photo. Reports remain browser-local until explicitly exported or shared.

## Image revision prompt

Remove the subtitle sentence ?Poznaj rzeki wok?? Krakowa.? completely from option 2. Close up the vacated space between the topic selector and the report button. Reduce the bottom sheet height accordingly, giving the space to the map. Preserve the existing header, controls, geographic-map styling, heading, three topic choices and report button.

## Validation

- `npm run build --prefix web`
- `node tools/test-mobile-reporting.mjs <url>`: 320/390/768px, desktop, topic navigation, no automatic location access on load, permission success, denial, timeout/retry, unsupported location, manual correction, draft/photo preservation and stale response rejection.
- `node tools/test-corridors.mjs <url>`: desktop/mobile measured river detail in EN/PL.
- `node tools/test-ditch-barriers-browser.js <url>`: terrain-ponding detail, geometry, methods and failure recovery.
- `node tools/test-meanders.mjs <url>`: filters, measured proposals, five-step story and accessibility. Geoportal LiDAR transport failures are reported separately from app regressions.
- `node tools/test-a11y.mjs <url>`: desktop and mobile map/menu/views/location/form.

Browser checks use simulated coordinates; real device permission prompts and sensor accuracy require device testing. Screenshots are saved under `output/mobile-reporting/`.
