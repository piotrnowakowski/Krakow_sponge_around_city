# Kraków Sponge: the city's water starts in the hills around it

**Kraków Sponge** (Gąbka Krakowa) is an open-data map and drought dashboard for the three small rivers that flow into Kraków from the north and west: the **Rudawa**, the **Prądnik (Białucha)** and the **Dłubnia**. Two of them supply the city's tap water. It shows where water could be held back in the landscape: drainage ditches worth blocking first, and river reaches with room to meander. It also shows how badly these rivers are doing in the 2026 drought.

**Live demo:** https://piotrnowakowski.github.io/Krakow_sponge_around_city/

Built for the [OneAquaHealth IEEE Global Hackathon 2026](https://oneaquahealth-ieee-hackathon.devpost.com/).

![Map overview](docs/screenshot-map.png)

## Track alignment

**Primary track: Resilience Informatics.** The app combines a drought early-warning view (live IMGW gauges and warnings, 35 years of flow records, ERA5 water balance) with retention planning: which ditches to block first and where rivers have room to meander.

It also covers **Data-to-Insight**, because it turns raw national datasets (BDOT10k, DEM, IMGW, ERA5) into a few decisions per catchment, and **Citizen Science UX**: residents can report ditches, streams, springs and culverts as flowing, standing, dry or already blocked, right where official data are missing. Dłubnia, for example, has no IMGW gauge at all.

**One Health link:** low flows mean warmer, less oxygenated water, higher pollutant concentrations, fish kills and risk to drinking-water intakes. These are urban freshwater health problems whose cause lies upstream, outside the city.

## The problem

Kraków takes about 97% of its tap water from rivers. The **Rudawa** feeds the Rudawa water treatment plant (weirs at Mydlniki and Szczyglice) and the **Dłubnia** feeds the Dłubnia plant. The **Prądnik** runs through the Ojców National Park and then through the city.

In 2026, Poland had a severe hydrological drought. Researchers point to lost **retention**: decades of drainage ditches in fields and forests, sealed surfaces and straightened, concreted channels move water out of the landscape too fast. A *sponge city* needs a sponge landscape around it.

## What the data say (as of 3 October 2026)

| | Rudawa (Balice gauge) | Prądnik (Ojców gauge) | Dłubnia |
|---|---|---|---|
| Mean flow, 1 Jan to 3 Oct 2026 | **2nd lowest since 1991** (1.26 m³/s; only 1991 was lower) | **lowest since 1991** (0.27 m³/s) | no IMGW gauge |
| Days below SNQ (mean low flow) in 2026 | 155 | 260 | – |
| Rainfall since 1 Jan (ERA5) | 97% of 1991–2020 normal | 101% | 101% |
| Climatic water balance (rain − ET₀) | −129 mm (normal −45 mm) | −130 mm (normal −78 mm) | −135 mm (normal −82 mm) |
| Arable land / forest | 33% / 30% | 49% / 17% | 63% / 12% |
| Sealed surfaces | 14.5% | 16.7% | 12.0% |
| Drainage ditches in BDOT10k | 87 km (40 km high priority) | 11 km | 32 km |
| Main-stem corridor with room to meander | 14.8 of 17.9 km | 28.1 of 38.6 km | 42.1 of 56.2 km |

An IMGW **hydrological drought warning for the Rudawa and Prądnik catchments** has been active since **4 July 2026**.

The key insight is that **rainfall was about normal, yet the rivers hit record lows.** Higher evaporation, together with a landscape that sheds water instead of storing it, empties the groundwater that keeps rivers flowing in summer. Retention measures (blocking ditches, restoring meanders and floodplains, unsealing) target exactly this.

![Drought dashboard](docs/screenshot-drought.png)

## Features

- **Three catchments delineated from open data** and validated against the official MPHP10k map.
- **Land cover** per catchment from BDOT10k: forest, meadows, arable land, orchards, built-up, industrial and transport areas.
- **Drainage ditch priority score (0–100)** for every BDOT10k ditch, with a click-through breakdown:
  - land use (forest or meadow 40, arable 25, built-up 0)
  - distance to the nearest building (no points below 50 m, full points from 200 m)
  - slope (flat ditches hold more water per dam)
  - length

  This is a transparent screening heuristic, not a hydrological model. Blocking any ditch needs the owner, Wody Polskie and a water-law permit.
- **Room for the river:** every 250 m reach of the main stems gets the share of a 2×100 m corridor that is free of buildings and sealed land. It shows where meanders and floodplains could come back, and where the city has closed in on the river.
- **Live IMGW gauges and drought warnings** fetched directly in the browser, with 12-month hydrographs against the 1991–2020 range and SNQ/NNQ thresholds.
- **Year ranking:** mean flow from 1 January to date for every year since 1991, from the verified IMGW archive.
- **ERA5 climate panel:** cumulative climatic water balance 2026 vs 2025 vs normal, monthly rainfall, and soil moisture anomaly.
- **Citizen reports:** click the map (or use your phone's location), pick ditch / stream / spring / culvert and flowing / standing water / dry / already blocked, add a date, a note and a photo. Reports are kept in the browser (localStorage; photos are shrunk to a 480 px JPEG thumbnail), shown as their own map layer, and leave the browser only when you choose: **Export GeoJSON** or **Send to project**, which opens a prefilled GitHub issue on this repository with the reports as a table and GeoJSON (photos are attached by hand, since they do not fit in a link). No backend, no API keys. Fictional example reports can be switched on to try it out; they are labelled EXAMPLE and never exported or sent.
- **Basemaps:** vector map, GUGiK orthophoto and **LiDAR shaded relief**. On the relief, the many ditches missing from BDOT10k are clearly visible.
- **Official MPHP divides** overlay, protected areas, weirs and dams, and buildings in river corridors.
- **English and Polish** interface; works on mobile.

| Room for the river (Prądnik in Kraków) | Ditch score on the LiDAR relief |
|---|---|
| ![Corridors](docs/screenshot-corridors.png) | ![Ditch](docs/screenshot-ditch.png) |

## How it works

```
pipeline/                    Python, writes web/public/data/*.json
  download.py      BDOT10k county packages (GUGiK) + Copernicus GLO-30 DEM tiles
  catchments.py    DEM -> burned streams -> D8 flow -> catchment labels from MPHP-coded rivers
  validate.py      overlays the result on the official MPHP10k WMS (docs/validation_mphp.png)
  layers.py        land cover, rivers, ditch scores, corridors, buildings, weirs, stats.json
  drought.py       IMGW operational + archive discharge, IMGW warnings, ERA5 via Open-Meteo
  run_all.py       runs everything
web/                         Vite + MapLibre GL + Chart.js static site
.github/workflows/deploy.yml builds the site, refreshes drought data daily, deploys to Pages
```

### Catchment delineation

The official MPHP10k catchment polygons are published only as a WMS picture, so the catchments are rebuilt from open data:

1. Mosaic the Copernicus GLO-30 DEM and reproject it to EPSG:2180 at 25 m.
2. Burn the BDOT10k rivers 10 m into the surface. GLO-30 is a surface model, so bridges and buildings would otherwise block the channels.
3. Fill depressions, resolve flats and compute D8 flow directions (pysheds).
4. Give every cell the MPHP code of the first BDOT10k river it drains into. Inside Kraków, only 11% of river segments carry a code, so codes are first copied along same-named rivers. This mirrors how MPHP itself hangs catchments off the coded river network, and it is robust to DEM routing errors in the flat Krzeszowice graben.

| Catchment | This app | Official MPHP10k | Difference |
|---|---|---|---|
| Rudawa (2136) | 305.0 km² | 320.6 km² | −4.9% |
| Prądnik (21374) | 178.4 km² | 192.1 km² | −7.1% |
| Dłubnia (21376) | 272.7 km² | 273.1 km² | −0.2% |

Most of the remaining difference is in the lowest, urban reaches, where rivers run in culverts.

![Validation against MPHP](docs/validation_mphp.png)

## Run it yourself

```bash
# data pipeline (Python 3.12)
python -m venv .venv && .venv/Scripts/activate      # or source .venv/bin/activate
pip install -r pipeline/requirements.txt
cd pipeline && python run_all.py                     # ~10 min, ~350 MB of downloads cached in data/raw

# web app (Node 20+)
cd web && npm install && npm run dev                 # http://localhost:5173
```

The processed data are committed in `web/public/data`, so the web app runs without the pipeline. `pipeline/drought.py` can be run on its own to refresh the drought numbers.

## Data sources and licences

| Data | Provider | Use |
|---|---|---|
| BDOT10k topographic database | GUGiK, [geoportal.gov.pl](https://www.geoportal.gov.pl/pl/dane/baza-danych-obiektow-topograficznych-bdot10k/), free re-use | rivers, ditches, land cover, buildings, weirs, protected areas |
| Copernicus GLO-30 DEM | ESA / Airbus; © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the EU and ESA | catchment delineation, slope |
| MPHP10k hydrographic map | PGW Wody Polskie (WMS) | validation, overlay |
| Hydrological data and warnings | IMGW-PIB ([danepubliczne.imgw.pl](https://danepubliczne.imgw.pl), [hydro.imgw.pl](https://hydro.imgw.pl)) | discharge, thresholds, warnings |
| ERA5 reanalysis | Copernicus Climate Change Service, via [Open-Meteo](https://open-meteo.com) (CC BY 4.0) | rainfall, ET₀, soil moisture |
| Orthophoto and LiDAR shaded relief | GUGiK WMS | basemaps |
| Basemap | [OpenFreeMap](https://openfreemap.org), © OpenMapTiles, © OpenStreetMap contributors | basemap |
| Water treatment plant locations | © OpenStreetMap contributors (ODbL) | map markers |

## Limitations

- Catchments come from a 25 m surface model; the lower urban reaches are underestimated.
- BDOT10k maps only the larger ditches, and no field tile drains. The real drainage network is much denser; see the LiDAR relief.
- The ditch score and the corridor index are screening tools for a conversation with landowners, Wody Polskie and the city, not engineering designs.
- ERA5 cells are about 25 km wide, so Prądnik and Dłubnia share a climate cell.
- IMGW 2026 discharge is operational, not yet verified. It matches the verified archive within 0.3% over the October 2025 overlap.

## Roadmap

1. **Citizen reports, phase 2:** a small moderated store (e.g. GitHub issues → GeoJSON in the repo via an Action) so that everyone's reports appear on the map, not only your own.
2. **LiDAR ditch detection:** automatic mapping of the ditches missing from BDOT10k, using the 1 m GUGiK DEM.
3. **Groundwater:** PIG-PIB monitoring wells and Copernicus soil-moisture anomaly layers.
4. **Retention potential:** estimated m³ held per blocked ditch and per restored floodplain.
5. **Renaturalisation support:** link corridor reaches to the Wody Polskie Dłubnia renaturalisation concept and to the national renaturalisation programme (KPRWP).

## Licence

Code: [MIT](LICENSE). Data remain under their providers' licences (see above).

---

### Po polsku w skrócie

**Gąbka Krakowa** to mapa i panel suszy dla zlewni Rudawy, Prądnika i Dłubni. Pokazuje, które rowy melioracyjne warto zablokować najpierw, gdzie rzeki mają miejsce na meandry i jak głęboka jest susza 2026. Prądnik w Ojcowie ma najniższy przepływ od 1991 r., a Rudawa w Balicach drugi najniższy, mimo opadów w normie. Woda dla Krakowa zaczyna się na polach i w lasach wokół miasta.
