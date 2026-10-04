# Local browser checks

Run the web server with `npm run dev` in `web/`, then supply its URL:

```powershell
node tools/test-review.mjs http://127.0.0.1:5173/
```

The runner uses Playwright and axe-core. Install them in a test-tools environment,
or reuse an existing installation by setting `PLAYWRIGHT_PACKAGE` to that
environment's absolute `package.json` path. No application dependency is required.
`APP_URL` is an alternative to the URL argument. `REVIEW_OUTPUT` selects the
artifact directory; by default it is `output/review-verification` relative to the
working directory. `npm run test:browser` in `web/` invokes the same runner.

The suite verifies lazy loading, tab and layer keyboard navigation, candidate
selection, decimal validation, navigation/reload persistence, share links,
downloaded JSON contents, language state, accessible chart tables, contrast,
phone portrait/landscape details, local corridor constraints, and failed dataset
recovery. Failure tests block real browser requests and then remove the block.
Screenshots and `verification.json` record the result.

`tools/test-ditch-barriers-browser.js` remains a function for a supplied Playwright
page. Its second argument is the base URL. It separately checks the terrain
footprint, changes with fill height, bypass limits, overlay visibility,
catchment isolation, EN/PL, and metadata retry.

Calculation and screening checks:

```powershell
cd web
npm run test:ditch-barriers
cd ../pipeline
../.venv/Scripts/python.exe -m unittest test_ditch_barriers test_ditch_ponding test_corridors
```

The corridor data can be regenerated from cached inputs with
`python pipeline/rebuild_corridors.py`. It changes only corridor output and the
associated statistics. Local building-distance checks precede free-area averages;
their thresholds are screening heuristics, not legal setbacks.

Ponding drafts are stored per site on the current browser origin. Reset is
explicit. Share links include site ID, fill height and illustrative overflow head;
downloaded summaries include assumptions, terrain provenance, values and caveats.
The shared URL must refer to a server reachable by its recipient; localhost is
only accessible on the computer running the app.

## Scenario and responsive regressions (2026-10-04)

Use the current local working tree. In T3 Code, use the collaborative preview
tools when available. The older runner above predates the default Explore mode;
its selectors and entry steps need updating before treating it as current coverage.
For manual checks, select **Analyse** before choosing an analysis theme.

1. Open a ditch barrier, expand **Water leaving the pond**, share its scenario,
   and edit overflow head from 0.1 to 0.2 m. The displayed share URL must update.
   Enter 0.4 or an empty value: Share, Copy, and Download must be disabled and the
   old link cleared. Correct the input and verify sharing recovers.
2. Open a shared URL, edit head and fill height, and reload the current address.
   Both edits must survive. Closing the candidate must remove its scenario hash.
3. Edit a candidate to 0.2 m, then close it. The overview must show the labelled
   0.6 m baseline for every candidate; reopening the edited site restores its draft.
4. At 390 x 844, open About, click a ditch or corridor on the map, and choose
   **Expand details**. The panel must grow and **Show map** must restore it.
5. At 390 x 844, open a pond candidate, expand details, change fill height, and
   choose **Show map**. The selected footprint must fit inside the map. There must
   be no MapLibre warning about padding exceeding the canvas.
6. Reload without and with a scenario hash. Core controls must become usable as
   soon as the map style and core datasets are ready, even if background tiles lag.
7. In Explore, load LiDAR relief to completion and reselect it. Wait at least
   13 seconds: no false loading/error banner should appear for cached tiles.
   Slow successful tiles must clear the timeout banner when they finish; actual
   tile errors must still expose Retry.

Repeat the desktop journey at 1366 x 768, 1440 x 900, and 1920 x 1080. Check all
six analysis themes, a constrained corridor's details and highlight, catchment
focus/back, drought station and climate selection across EN/PL, keyboard tab
navigation, and independently scrollable panels without page-width overflow.
