# Demo video script (3:34)

Kraków Sponge, OneAquaHealth IEEE Global Hackathon 2026. Live site: https://piotrnowakowski.github.io/Krakow_sponge_around_city/

The walkthrough is recorded automatically from the live site with `tools/record-demo.mjs` (Playwright, 1440×810). On-screen captions carry the key line of each scene, so the video works without sound. The voiceover below fits the same timing; record it over the captured video, or read it live while repeating the clicks. Timestamps are from the recorded take, with the first ~4 s of page loading trimmed.

The citizen report made in scene I is a demo. Its note says "Demo report for the video, not a real observation", and the caption says so too.

| Time | Scene | On screen | Voiceover |
|---|---|---|---|
| 0:00 | **Hook** | Overview of the three catchments; "New here?" tour invite. | Kraków takes most of its tap water from rivers. In 2026 the rain was about normal, yet those rivers hit record lows. This is Kraków Sponge: the city's water starts in the hills around it. |
| 0:11 | **1 · Drought** | Start the story tour. Step 1 opens the Drought tab: live gauges (red = below mean low flow), 12-month hydrograph against 1991–2020, year ranking, water balance, IMGW warning. | The Prądnik at Ojców has had its lowest flow since 1991, the Rudawa at Balice its second lowest, and both have spent months under their mean low flow. Rainfall is 97 to 101 percent of normal. The difference is evaporation: the water balance is about minus 130 millimetres against minus 45 to minus 82 in a normal year. IMGW has kept a drought warning on both catchments since the fourth of July. |
| 0:49 | **2 · Catchments** | Step 2: catchment cards; land cover, sealed surfaces, validation. | Three small catchments, about 750 square kilometres of fields and forests. The Rudawa and the Dłubnia feed two of Kraków's water treatment plants. We rebuilt the catchments from open elevation data, within 0.2 to 7 percent of the official map. |
| 1:03 | **3 · Ditches** | Step 3: Ditches view on the LiDAR relief, pilot tile with violet candidates. | Drainage ditches empty this landscape within hours. Pink ditches are the best to block: forest and meadow, far from houses, flat. The violet dashed lines are ditches our LiDAR pilot found that the national map does not have. |
| 1:19 | **4 · Room for the river** | Step 4: Room-for-the-river view on the Prądnik in Kraków; click a red segment for its popup. | Where a river still has space, meanders and wet meadows can come back and hold water in the valley. We screen the main stems in short segments: red where a building stands within 30 metres of the river or the corridor is mostly built or sealed. In the city, much of the Prądnik is red. Green means fewer mapped constraints, not a finished restoration plan. |
| 1:35 | **Ditch score** | Zoom to a high-priority Rudawa ditch; popup with score breakdown and storage. | Every mapped ditch gets a transparent 0-to-100 score from land use, distance to houses, slope and length, and an estimate of how much water it holds if blocked. That estimate is a heuristic: length times one square metre times a fill factor of a half, and the popup says so. |
| 2:01 | **Scenario** | Catchments tab: slider "block the top N high-priority ditches" from 0 to 189; highlight on the map; "How is this estimated?". | Now the scenario: block the top N ditches in the Rudawa catchment. All 189 hold about 20,000 cubic metres per filling, roughly 17 to 22 hours of the Rudawa water plant's output. That is small, and that is the honest point. The bigger effect, water soaking in and feeding the river in August, is not even counted. |
| 2:20 | **LiDAR pilot** | Ditches view, LiDAR relief, pilot tile; click a violet candidate (EXPERIMENTAL popup). | In one two-by-two-kilometre pilot tile, the one-metre LiDAR terrain model reveals 12.5 kilometres of candidate ditches next to 11.4 mapped. Checked by eye, 27 of 30 random candidates follow a real depression. Some may be forest-road ruts, so the layer is labelled experimental. |
| 2:42 | **Citizen report** | Report button → click in the Dłubnia catchment → form (stream, dry, demo note) → save → Report tab: list, Export GeoJSON, Send to project. | The Dłubnia feeds a water plant but has no IMGW gauge at all. Residents can report a ditch, stream, spring or culvert as flowing, standing, dry or already blocked, with a date, note and photo. Reports stay in the browser until you export them or send them to the project as a prefilled GitHub issue. No backend, no account. |
| 3:12 | **Wrap-up** | Switch to Polish and back; zoom out; end caption with the URL. | It's in Polish and English, works on phones, and is built entirely on open data: BDOT10k, LiDAR, IMGW and ERA5. Next: everyone's reports on one map, LiDAR across all three catchments, and groundwater wells. Kraków Sponge: a sponge city needs a sponge landscape around it. |
| 3:34 | End | | |

## Recording it yourself

```bash
cd tools && npm install
node record-demo.mjs                        # live site; writes ../output/demo/demo.webm and timings.txt
ffmpeg -ss 3.4 -i ../output/demo/demo.webm -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p ../output/demo/krakow-sponge-demo.mp4
```

`output/` is gitignored; upload the MP4 to YouTube or Vimeo and paste the link into Devpost.
