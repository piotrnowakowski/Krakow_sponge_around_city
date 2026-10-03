# Kraków Sponge (Gąbka Krakowa): Devpost submission draft

> Draft for the OneAquaHealth IEEE Global Hackathon 2026. Paste section by section into Devpost.
> Numbers are as of 3 October 2026 (the live site refreshes the drought data daily, so a gauge's
> "days below SNQ" may be one or two higher when judges look). Team and account fields are not filled in here.

**Project name:** Kraków Sponge (Gąbka Krakowa)

**Tagline (≤ 200 characters):** The city's water starts in the hills around it. A drought dashboard and retention map for the three rivers that feed Kraków, built on open data and citizen observations.

**Links**
- Live prototype: https://piotrnowakowski.github.io/Krakow_sponge_around_city/
- Code (MIT): https://github.com/piotrnowakowski/Krakow_sponge_around_city

---

## Track alignment statement

**Primary track: Resilience Informatics** ("enable early warning & resilience planning"). Kraków Sponge joins a drought early-warning view with retention planning for the Rudawa, Prądnik (Białucha) and Dłubnia catchments. The warning side covers live IMGW gauges and hydrological warnings, 35 years of flow records and the ERA5 climatic water balance. The planning side shows which drainage ditches to block first, how much water that would hold, and which river reaches still have room for meanders and floodplains.

**Also: Data-to-Insight.** The app turns raw national datasets (BDOT10k topography, Copernicus and LiDAR elevation, IMGW hydrology, ERA5 climate) and citizen observations into a few concrete decisions per catchment: these ditches first, these reaches have room, this river has no gauge.

**Also: Citizen Science UX.** Residents can report a ditch, stream, spring or culvert as flowing, standing, dry or already blocked, with a date, note and photo, in a few taps and with no account. Reports go exactly where official monitoring is missing: the Dłubnia, a drinking-water river with no IMGW gauge, and the many ditches the national map leaves out.

**One Health link:** low flows mean warmer, less oxygenated water, more concentrated pollutants, stressed fish and invertebrates, and risk to drinking-water intakes. These are urban freshwater health problems whose cause sits upstream, in the landscape around the city.

---

## Inspiration

In 2026 Poland had a severe hydrological drought. Around Kraków, IMGW has kept a hydrological drought warning on the Rudawa and Prądnik catchments since 4 July. When we pulled the numbers, one fact stood out: **rainfall since January was about normal (97–101% of the 1991–2020 mean), yet the rivers hit record lows.** The Prądnik at Ojców had its lowest January-to-date mean flow since 1991, below its mean low flow (SNQ) on 260 days. The Rudawa at Balice had its second lowest (155 days below SNQ). The Rudawa feeds one of Kraków's water treatment plants.

The missing water is in evaporation and in a landscape that sheds rain instead of storing it. The climatic water balance (rain minus reference evaporation) is about −130 mm against a normal of −45 to −82 mm. Decades of drainage ditches, straightened channels and sealed ground move water out fast. Kraków talks about becoming a *sponge city*. We wanted to show that a sponge city needs a sponge landscape around it, because the city's water starts in the hills.

## What it does

Kraków Sponge is a bilingual (EN/PL) web map and dashboard for the three small catchments north and west of Kraków.

**Problem.** Two of the three rivers supply Kraków's tap water, they are at record lows despite normal rain, and the landscape around them has been drained for decades. There is no single place that shows how dry the rivers are, where the water is lost and what could be done, and official data have big gaps.

**Solution.** It answers four questions:

1. **How bad is the drought?** Live IMGW gauge readings and hydrological warnings, 12-month hydrographs against the 1991–2020 range and the SNQ/NNQ low-flow thresholds, a ranking of every year since 1991, and the ERA5 water balance with rainfall and soil moisture.
2. **Where does the water come from?** The three catchments, delineated from open elevation data and validated against the official MPHP map (−4.9%, −7.1% and −0.2% area difference), with land cover, sealed surfaces and protected areas.
3. **Where can we hold it back?**
   - Every mapped drainage ditch has a transparent 0–100 "block it first" score based on land use, distance to houses, slope and length, plus an estimate of how much water it would hold if blocked.
   - A scenario slider per catchment, "block the top N high-priority ditches", adds up the volume and compares it with the Rudawa plant's daily output. Blocking all 189 high-priority ditches in the Rudawa catchment holds about 20,000 m³ per filling, roughly 17–22 hours of the plant's production (22–28 thousand m³/day). The groundwater recharge that follows is not counted.
   - "Room for the river" screens the main stems in segments of up to 50 m: red where a mapped building is within 30 m of the river or half the corridor is built or sealed, green where there are fewer mapped constraints. It is a conservative screening, not proof that restoration is feasible.
   - An **experimental LiDAR pilot** finds ditches the national map misses: in one 2×2 km tile it detects 12.5 km of candidate unmapped ditches next to 11.4 km of mapped ditches and streams.
4. **What do people on the ground see?** Citizen reports of ditches, streams, springs and culverts (flowing, standing water, dry, already blocked; date, note, photo). Reports stay in the browser until the user exports them as GeoJSON or sends them to the project as a prefilled GitHub issue. There is no backend and no account.

A four-step **story tour** walks a first-time visitor through drought → catchments → ditches → room for the river in about a minute.

**Target users.**
- Residents, anglers and walkers who see the streams every day.
- Municipal and regional staff: Kraków's water company, Wody Polskie, the Ojców National Park and the landscape parks.
- Farmers, foresters and gminas who own the ditches.
- NGOs and journalists who need clear, sourced numbers.

**Impact.** It moves the conversation from "it didn't rain" to "the landscape can't hold what falls". It points to specific, cheap, reversible actions: small dams in ditches on meadows and in forests, far from houses. It collects the observations that would close the Dłubnia monitoring gap and the ditch inventory gap. Every number is sourced and every heuristic is labelled as one.

## How we built it

- **Data pipeline (Python 3.12):** geopandas, rasterio, pysheds, scikit-image. It downloads BDOT10k county packages and the Copernicus GLO-30 DEM, delineates the catchments (burned streams, D8 flow directions, MPHP-coded rivers) and validates them against the Wody Polskie MPHP10k WMS. It builds land cover, ditch scores, river corridors and a retention estimate, and fetches IMGW operational and archive discharge, IMGW warnings and ERA5 via Open-Meteo. One script (`run_all.py`) rebuilds everything.
- **LiDAR pilot:** downloads the GUGiK 1 m DTM over WCS, then black top-hat filtering, a hysteresis threshold, width and length filters, skeleton tracing, and removal of anything within 10 m of a mapped ditch or river. A separate script makes a contact sheet of 30 random candidates for checking precision by eye.
- **Web app:** Vite, vanilla JavaScript, MapLibre GL and Chart.js. It is a static site on GitHub Pages. The browser fetches live IMGW gauges and warnings directly, and a GitHub Action refreshes the drought data every morning.
- **Citizen reports without a backend:** localStorage, client-side photo thumbnails (canvas → 480 px JPEG), GeoJSON export, and a prefilled GitHub issue link as a zero-cost, transparent intake channel.
- **Quality:** Playwright end-to-end tests for every feature, an axe-core accessibility scan (no WCAG 2.1 A/AA violations), and phone and tablet layout checks.

## Challenges we ran into

- **The official catchment polygons are only published as a picture (WMS).** We rebuilt them from a 25 m surface model. Bridges and buildings in a surface model block rivers, so we burned the river network in and propagated river codes along same-named rivers inside Kraków, where only 11% of segments carry a code.
- **IMGW data come in three flavours:** operational 2026 discharge, a verified 1991–2025 archive and a separate warnings API, each with its own quirks (the hydro.imgw.pl backend, for example, only answers requests with its own Referer). We checked that operational and verified data agree within 0.3% over their overlap.
- **Retention numbers can easily be oversold.** BDOT10k has no ditch dimensions, so we kept the estimate deliberately simple: length × 1 m² × 0.5 fill factor. We show the assumptions in every popup and state plainly that the direct storage is small and the groundwater recharge, which we cannot yet quantify, is probably the bigger effect.
- **LiDAR ditches are shallow.** Forest ditches here sit only 0.1–0.3 m below their surroundings in the top-hat measure, so a simple threshold missed most of them. Wheel ruts on forest tracks look much the same.
- **A wobbly CI data source.** Open-Meteo sometimes times out from GitHub Actions, so the refresh retries and keeps the last good snapshot.

## Accomplishments that we're proud of

- The key finding is backed by 35 years of gauge data: normal rain, record-low rivers.
- Catchments rebuilt from open data within 0.2–7% of the official areas.
- An honest retention scenario that connects a ditch in a forest to hours of drinking-water production.
- A LiDAR pilot that finds as many kilometres of candidate ditches as are mapped in the same tile. In a check by eye, 27 of 30 random candidates follow a depression visible on the relief.
- Citizen reporting with no backend, no account and no API keys, which still produces clean GeoJSON.
- Fully bilingual, accessible and tested in a real browser. Everything runs on free, open data.

## What we learned

- Drought in a temperate climate is as much about evaporation and storage as about rain. The water balance tells the story that rainfall totals hide.
- Small rivers are where monitoring is thinnest. A drinking-water river can have no gauge at all, which is exactly where citizen science adds most.
- Open Polish geodata (BDOT10k, the 1 m LiDAR DTM, IMGW) are excellent but scattered across services with different conventions, down to which WCS axis is "x".
- Transparent heuristics, shown with their assumptions, invite discussion. Black-box scores invite distrust.

## What's next

- **Everyone's reports on the map:** a small moderated store (GitHub issues → GeoJSON via an Action) so all reports are shared, plus simple repeat-visit prompts for the same spot to build a low-flow record for the Dłubnia.
- **LiDAR across all three catchments** (about 750 km²), separating forest-road ruts from ditches with road data and the orthophoto, with residents confirming candidates on the ground.
- **Groundwater:** PIG-PIB monitoring wells and the Copernicus/EDO soil-moisture anomaly, to move the retention estimate from "per filling" towards recharge.
- **From map to action:** link corridor reaches to the Wody Polskie Dłubnia renaturalisation concept and the national renaturalisation programme (KPRWP), and compare 2026 with the 2015, 2018 and 2019 drought years.
- **Partners:** Kraków's water company, Wody Polskie, the Ojców National Park and local gminas, to turn "block these first" into pilot dams.

## Built with

python · geopandas · rasterio · pysheds · scikit-image · shapely · javascript · vite · maplibre-gl · chart.js · playwright · axe-core · github-pages · github-actions · BDOT10k · GUGiK LiDAR · Copernicus DEM · IMGW-PIB · ERA5 / Open-Meteo · OpenFreeMap / OpenStreetMap

## Data and licences

BDOT10k, the LiDAR DTM, orthophoto and shaded relief © GUGiK (free re-use). Copernicus GLO-30 DEM © DLR / Airbus, provided under COPERNICUS by the EU and ESA. MPHP10k © PGW Wody Polskie. Hydrological data and warnings © IMGW-PIB. ERA5 © Copernicus Climate Change Service via Open-Meteo (CC BY 4.0). Basemap OpenFreeMap © OpenMapTiles © OpenStreetMap contributors (ODbL). ZUW Rudawa production figures: Wodociągi Miasta Krakowa technical leaflet. Code: MIT.
