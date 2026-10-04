# Calculated meander concepts

The Room for the River view has an **Only free sections** filter and a candidate selector. Story step 5 enables the filter and fits the map to one candidate. Dashed blue is the existing mapped centreline, purple is the proposed centreline, and pale green is the screened search area. Choosing another view hides the proposal; returning restores the selection. Clearing the selection restores the corridor overview.

“Free” means the existing green screening class: no mapped building within 100 m and at least 80% unbuilt/unsealed area within the corridor. It says nothing about ownership or permission to use land.

## Reproducible calculation

Run `python pipeline/meanders.py` after updating corridor, building, land-cover or weir data. The full pipeline also runs this step after generating the map layers. Input files are the committed `web/public/data/{corridors,buildings,landcover,weirs}.json`; output is `meanders.json`. All metric geometry calculations use EPSG:2180.

1. Merge connected green reaches within each catchment. Do not snap endpoints or bridge gaps through amber/red reaches.
2. Split long connected lines into equal sections of 200–600 m. Reject sections whose existing length / endpoint distance exceeds 1.12, so already winding sections are not assigned extra bends.
3. Offset samples of the current line in its local normal direction, using a tapered sine wave. Test amplitudes of 10, 15, 20, 25, 30, 35 and 40 m on both sides, with about one cycle per 250 m. The taper preserves the endpoints.
4. Keep candidates entirely inside the 100 m corridor on either side. Exclude mapped buildings with a 30 m buffer, sealed land with a 5 m buffer, and weirs with a 30 m buffer. Reject self-intersections and any line crossing an exclusion. These are app assumptions, not statutory distances.
5. Accept only 5–30% extra length. Pick the tested candidate closest to a 20% increase. Measure actual proposed length and maximum lateral offset (sampled at 200 points), rather than treating amplitude as the measured offset.

The current snapshot yields 23 candidates: 10 Rudawa, 2 Prądnik and 11 Dłubnia. The default example is the straightest candidate, breaking ties by current length. Its numbers are read from the output, including in the English and Polish story.

## Limits and checks

The proposal is a centreline concept, not a surveyed channel or a historical reconstruction. It does not model bank width, ground elevations, slope, discharge, sediment, ecology, utilities, ownership, flood levels, water storage or groundwater recharge. Source omissions and simplification remain. The shaded search area is not land available for construction. Field surveys and hydrological/hydraulic design are necessary before works.

`python -m unittest discover -s pipeline -p test_meanders.py` checks tie-ins, rejected obstacles, constrained gaps, and every exported proposal against the source exclusion polygons and green reaches. It also recalculates lengths from exported geometry. `node tools/test-meanders.mjs <url>` checks desktop/mobile filtering, actual map rendering, EN/PL story step 5, back navigation and view cleanup. The existing corridor regression remains in `tools/test-corridors.mjs`.
