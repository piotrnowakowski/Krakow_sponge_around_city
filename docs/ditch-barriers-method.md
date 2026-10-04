# Ditch patches and terrain-connected standing water

Revised 4 October 2026. The map now shows a **water footprint over the surrounding ground**, with depths and geometric storage calculated from the official 1 m GUGiK ground DTM. The earlier highlighted upstream line and channel-only storage experiment did not represent the intended ponding intervention and are no longer the displayed model.

Six of the original fifteen coarse candidates pass the detailed default screen: four in Rudawa, one in Prądnik and one in Dłubnia. They are field-survey targets, not construction-ready designs. The default is a short **filled patch without a bed-level opening**; the remaining ditch network stays open.

## Data and reproducibility

- **Terrain:** GUGiK WCS `DigitalTerrainModelFormatTIFF`, coverage `DTM_PL-KRON86-NH_TIFF`, requested as 1 m GeoTIFF, EPSG:2180 horizontal coordinates and PL-KRON86-NH elevations. Each 600 × 600 m tile is centred on a coarse candidate. This is numeric bare-earth NMT, not a shaded-relief image or an upsampled 25 m DSM. [Official WCS catalogue](https://www.geoportal.gov.pl/pl/usluga/uslugi-pobierania-wcs/).
- **Drainage:** raw BDOT10k ditch and river lines, including the original ditch downstream of the short patch and neighbouring ditches. The remaining mapped drainage is not removed to increase estimated storage.
- **Buildings:** all raw BDOT10k footprints across the catchments plus a 1 km margin. Distances are measured from the water footprint, not a ditch midpoint or a subset clipped to river corridors. Local tile clipping is deliberately avoided when finding the nearest building.
- **Cache/provenance:** `data/raw/ponding/<id>.tif` and `<id>.source.json` record the actual WCS URL, retrieval time, grid and datum. Retrieval date does not establish the original terrain survey date. No mixed vertical datums are used for a footprint.
- **Outputs:** `ditch-ponding.json` holds extent, depth-band and patch polygons; `ditch-ponding-meta.json` holds metrics for all fifteen assessments; `ditch-ponding-sites.json` contains only the six sites displayed as proposals. The original coarse shortlist remains in `ditch-barriers.json`.

## How the footprint is calculated

All spatial calculations use metres in EPSG:2180. The procedure is a static connected-pool approximation, not a 1D/2D hydraulic solver or a rainfall-event simulation.

1. The earlier 25 m terrain screen supplies a candidate and tentative ditch orientation. A local cross-section is taken perpendicular to the mapped ditch. The patch centre can move at most 5 m across that section to the lowest available DTM cell, to accommodate imprecise BDOT centrelines. No artificial channel is burned into the 1 m DTM.
2. Place an assumed **6 m cross-ditch × 3 m along-ditch** fill footprint. Only these cells are treated as blocked while finding bypass routes. Cells of naturally higher ground remain above the pond level without intervention. The local bed reference is the lowest finite terrain elevation under the patch. Patch dimensions are explicit scenario assumptions, not site measurements or construction recommendations.
3. A terrain seed just upstream of the patch starts a four-neighbour connected search. Only below-water-level cells connected to that seed can be wet. Separate low hollows and high-ground islands are excluded. The footprint is the union of actual 1 m cells, not a widened line, a circular buffer or a convex hull.
4. A minimax-path search finds the lowest terrain saddle connecting that seed to operational drainage. The original ditch remains open from 15 m below the patch. Other mapped ditches and rivers are conservative potential outlets within a 2 m line tolerance. Treating all such contacts as drains can underestimate storage where a branch actually brings water in; resolving that requires surveyed network direction and levels.
5. For each fill height **0.2, 0.4, 0.6, 0.8 and 1.0 m**, the contained water level is the lower of the fill crest and the first escape saddle minus 0.01 m. The small offset excludes the newly connected drainage route itself. Raising the patch above a lower bypass saddle cannot increase the contained footprint.
6. The edge of the tile and any nodata gap are unresolved outlets, not impermeable walls. A scenario limited by either is labelled unresolved and excluded from the default proposal layer. This avoids inventing a pond wall at the data boundary.
7. Repeat the drainage search without the patch to estimate natural depression storage already present. Subtract that storage within the same footprint from the proposed total. If the baseline escape is unresolved, the added-capacity estimate is unknown and the site is excluded.

This identifies potential **surface standing water**. It does not map soil saturation, the groundwater mound, infiltration, a flood arrival time, velocities or a guaranteed persistent pond. Water still has to arrive, and seepage may drain the pond.

## Area, depth, volume and selection

For connected wet cells with terrain elevation `z_i`, cell area `a = 1 m²` and contained water elevation `Z`:

```
depth_i = max(0, Z - z_i)
pond area = sum(a)
total pond capacity = sum(depth_i × a)
added capacity = max(0, total capacity - natural depression storage in this footprint)
```

The map displays three depth bands: 0–0.15 m, 0.15–0.40 m and above 0.40 m. Reported area and volume refer to the same displayed height and footprint. Changing the height changes the polygon, depths and values together.

Default proposals at a 0.6 m fill must have at least **5 m³ added capacity**, at least **10 m² wet area outside a nominal 2 m buffer each side of the upstream ditch**, and at least **100 m building clearance from the full footprint**. They must also have a resolved natural-depression baseline and not be limited by missing terrain or the tile boundary. These are project screening thresholds, not validated safety limits. The 2 m buffer is used only to distinguish ponding outside the nominal ditch for screening; it never determines the water boundary.

All heights remain available for each proposed site. If an edited height fails the building-clearance screen, the UI warns. Alternative sites are not additive: connected storage, bypass paths and interactions between patches need a network model.

### Example

At `db-2fe2fcd75029` in the Prądnik catchment, the 0.6 m scenario is limited by another drainage route. The connected surface area is 2,594 m², total volume 129.61 m³, natural depression volume about 0.07 m³ and added capacity 129.54 m³. Average depth is about 5 cm, maximum about 20 cm, and the closest mapped building is approximately 225 m from the footprint. The 0.2 m scenario is much smaller (253 m²). Heights from 0.4 to 1.0 m reach the same lower bypass limit.

These numbers are computed geometric capacities. In particular, a 5 cm average depth is sensitive to terrain error and microtopography; it is not evidence that this precise area will flood in practice.

## Outflow and the remaining ditch

Below its lowest surface outlet, an ideal impermeable pool has no surface outflow. Once full, water can pass over the short filled patch or around it into an unblocked drain. The latter path constrains the pond level in the footprint calculation. The UI states explicitly which mechanism limits each scenario.

An optional **crest-only overflow example** uses:

```
Q [m³/s] = C [m½/s] × effective width [m] × head above crest [m]^(3/2)
C = 1.5 m½/s
```

Effective width is approximated from below-crest cells across the short patch; the width is not surveyed. Head is editable from 0 to 0.3 m. This is a free-overflow illustration, **not total site discharge**. It does not quantify bypass-drain capacity, submerged outflow, tailwater, erosion or soil leakage. Changing this illustrative head does not redraw the contained pond at a fictitious above-spill level.

The previous channel-only event-routing module remains as a separately tested numerical experiment in `ditch-hydraulics.js`, but is not used to calculate or label this terrain pond. Its event volumes must not be combined with the footprint capacity.

## Evidence and limitations

- **USACE HEC-RAS, Storage Areas:** describes horizontal-pool storage with an elevation–volume relation derived from terrain. This supports calculating storage from ground elevations instead of ditch length alone; our raster connectivity and escape search are a project implementation, not HEC-RAS. [Technical reference](https://www.hec.usace.army.mil/confluence/rasdocs/rmum/latest/geometry-data/storage-areas).
- **USACE HEC-RAS mapping documentation:** inundation depends on the relation between water level and terrain, with connectivity across terrain barriers affecting mapped water. [Mapping options](https://www.hec.usace.army.mil/confluence/rasdocs/rmum/6.3/mapping-results/mapping-options).
- **USACE HEC-RAS, High Flow Computations:** gives the broad-crested relation and a metric free-flow coefficient range of approximately 1.38–1.71. The assumed value 1.5 is not calibrated to an earthen patch. [Weir reference](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/modeling-bridges/hydraulic-computations-through-the-bridge/high-flow-computations).
- **Holden et al. (2017)**, *The impact of ditch blocking on the hydrological functioning of blanket peatland*, Hydrological Processes 31, 525–539, DOI **10.1002/hyp.11031**: blocking redistributed water outside ditches and responses changed over time. That motivates testing alternative surface pathways, not treating every reduction in ditch flow as permanent storage. Peatland results are not calibration for Kraków mineral soils. [Paper](https://eprints.whiterose.ac.uk/id/eprint/104376/).
- **Muhawenimana et al. (2023)**, *Field-based monitoring of instream leaky barrier backwater and storage during storm events*, DOI **10.1016/j.jhydrol.2023.129744**: observed backwater, storage and overbank response depended on local sections and barrier condition. [University repository](https://orca.cardiff.ac.uk/id/eprint/160143/).
- **Roberts et al. (2024)**, *New data-based analysis tool for functioning of Natural Flood Management measures reveals multi-site time-variable effectiveness*, DOI **10.1016/j.jhydrol.2024.131164**: outlet configuration and changing drainage conditions affect temporary storage performance. No fixed benefit percentage from this work is transferred to the map. [University repository](https://abdn.elsevierpure.com/en/publications/new-data-based-analysis-tool-for-functioning-of-natural-flood-man/).

The 1 m grid is horizontal resolution, not a claim of 1 m or centimetre vertical accuracy. Small banks and culverts may be absent; submerged ditch beds may not be resolved. The patch location, dimensions and local drainage connectivity require field checks. Before intervention, survey levels, soils, groundwater and culverts; check ownership and applicable approvals. A coupled hydraulic model is needed for flow rates through the full drainage network, storm footprints and downstream impacts.

## Rebuild and check

```powershell
.\.venv\Scripts\python.exe pipeline\ditch_barriers.py  # original coarse shortlist
.\.venv\Scripts\python.exe pipeline\ditch_ponding.py   # fetch/cache 1 m tiles and derive ponds
.\.venv\Scripts\python.exe -m unittest discover -s pipeline -p "test_ditch*.py"
cd web
npm run test:ditch-barriers
npm run build
cd ..
npm ci --prefix tools
node tools/test-ditch-barriers-browser.js http://127.0.0.1:5421/
```

Serve the local app at the URL passed to the browser check, or pass the deployed site URL. `run_all.py` runs the terrain step after the coarse shortlist. The static site uses precomputed GeoJSON and metadata. Tests cover connected low ground, disconnected pockets, high islands, bypass drains, unchanged capacity above a bypass saddle, nodata and domain boundaries, footprint building clearance, geometric area/volume consistency and rejection of existing natural pond capacity. The Playwright flow in `tools/test-ditch-barriers-browser.js` verifies map polygons and metrics change together, EN/PL, mobile, toggles, unavailable metadata and the calculation/literature page.
