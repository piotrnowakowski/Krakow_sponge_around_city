// Minimal EN/PL dictionary. Keys are looked up with t(key, vars).
const STRINGS = {
  en: {
    title: 'Kraków Sponge',
    tagline: "The city's water starts in the hills around it",
    tab_layers: 'Views',
    views_intro: 'Choose what you want to explore. Each view brings together the relevant map layers.',
    view_rivers: 'Rivers',
    view_rivers_d: 'Follow the water network',
    view_rivers_hint: 'Main rivers and smaller streams, with catchment boundaries for orientation.',
    view_ditches: 'Ditches',
    view_ditches_d: 'Find retention opportunities',
    view_ditches_hint: 'Ditches colored by retention priority. Zoom in and click a ditch to see its score and assessment.',
    view_corridors: 'Room for the river',
    view_corridors_d: 'Explore space and barriers',
    view_corridors_hint: 'See where rivers have space to meander, alongside nearby buildings, weirs and dams. Zoom in to see buildings; click a corridor for its assessment.',
    view_landcover: 'Landscape',
    view_landcover_d: 'Land cover and protected areas',
    view_landcover_hint: 'Explore forests, fields and sealed surfaces together with protected areas and rivers.',
    view_monitoring: 'Water monitoring',
    view_monitoring_d: 'River flows and water supply',
    view_monitoring_hint: 'River gauges and water treatment plants. Click a gauge to open flow history and drought information.',
    view_manual: 'Manual',
    view_manual_d: 'Choose your own layers',
    view_manual_hint: 'Adjust individual layers below. Your custom combination is kept when you try another view and return.',
    view_includes: 'Visible layers',
    river_main: 'Main rivers',
    river_streams: 'Smaller streams',
    tab_catchments: 'Catchments',
    tab_drought: 'Drought 2026',
    tab_about: 'About',
    bm_light: 'Map',
    bm_ortho: 'Orthophoto',
    bm_relief: 'LiDAR relief',
    loading: 'Loading data…',

    grp_base: 'Catchments & context',
    grp_sponge: 'Where to hold water',
    grp_monitor: 'Monitoring',
    opacity: 'Opacity',

    lyr_catchments: 'Catchments (Rudawa, Prądnik, Dłubnia)',
    lyr_catchments_d: 'Delineated from the Copernicus DEM and the BDOT10k river network; within 0–7% of the official MPHP areas.',
    lyr_mphp: 'Official MPHP catchment divides',
    lyr_mphp_d: 'Wody Polskie WMS, for comparison.',
    lyr_landcover: 'Land cover',
    lyr_landcover_d: 'BDOT10k: forest, meadows, fields, built-up and sealed areas.',
    lyr_rivers: 'Rivers and streams',
    lyr_rivers_d: 'BDOT10k; main stems drawn thicker.',
    lyr_protected: 'Protected areas',
    lyr_protected_d: 'National park, landscape parks, nature reserves.',
    lyr_ditches: 'Drainage ditches: retention priority',
    lyr_ditches_d: 'BDOT10k ditches scored 0–100: land use, distance to houses, slope, length. Click a ditch for the breakdown.',
    lyr_corridors: 'Room for the river',
    lyr_corridors_d: 'Share of a 2×100 m corridor along the main stems that is free of buildings and sealed land: where meanders and floodplains can come back.',
    lyr_buildings: 'Buildings in river corridors',
    lyr_buildings_d: 'BDOT10k buildings within 100 m of the main stems.',
    lyr_weirs: 'Weirs and dams',
    lyr_weirs_d: 'BDOT10k hydraulic structures.',
    lyr_gauges: 'IMGW river gauges (live)',
    lyr_gauges_d: 'Red = flow below the long-term mean low flow (SNQ).',
    lyr_intakes: 'Kraków water treatment plants',
    lyr_intakes_d: 'Rudawa and Dłubnia supply Kraków tap water.',

    lc_forest: 'Forest & shrubs',
    lc_grassland: 'Meadows & grassland',
    lc_arable: 'Arable fields',
    lc_orchard: 'Orchards & allotments',
    lc_water: 'Water',
    lc_built: 'Built-up',
    lc_industrial: 'Industrial',
    lc_transport: 'Roads, rail, squares',
    lc_bare: 'Bare ground',
    lc_other: 'Other',

    pr_high: 'High: block first',
    pr_medium: 'Medium',
    pr_low: 'Low',
    room_open: 'Open (≥80% free)',
    room_partial: 'Partial (50–80%)',
    room_constrained: 'Constrained (<50%)',
    gauge_low: 'Below SNQ',
    gauge_ok: 'Above SNQ',

    ditch_title: 'Drainage ditch',
    ditch_score: 'Retention priority',
    ditch_context: 'Land use',
    ditch_houses: 'Nearest building',
    ditch_slope: 'Slope',
    ditch_length: 'Length',
    ditch_note: 'A screening score, not a design. Any blocking needs the owner, Wody Polskie and a water-law permit.',
    corridor_title: 'River reach (250 m)',
    corridor_free: 'Free corridor',
    corridor_built: 'Buildings & sealed land',
    weir_title: 'Hydraulic structure',

    area: 'Area',
    vs_mphp: 'vs official MPHP {mphp} km² ({diff}%)',
    feeds_tap: 'Feeds Kraków tap water',
    no_tap: 'No municipal intake',
    landcover: 'Land cover',
    sealed: 'Sealed surfaces',
    ditches: 'Mapped drainage ditches',
    ditch_density: '{km} km · {density} km/km²',
    high_priority: 'high-priority ditches',
    corridor_room: 'Main-stem corridor',
    open_km: '{open} of {total} km have room to meander',
    weirs: 'Weirs and dams',
    zoom: 'Explore catchment',
    focus_back: 'Show all catchments',
    focus_key: 'Solid: rivers · Dashed: ditches',
    focus_intro: 'Only this catchment is highlighted. Zoom in to explore streams and drainage ditches; click a ditch for its retention assessment.',
    focus_recenter: 'Recenter catchment',
    catch_intro: 'Three small rivers north and west of Kraków. Rudawa and Dłubnia feed the city\'s water treatment plants; all three flow through the city into the Vistula.',
    gap_title: 'Data gap',
    gap_text: 'BDOT10k maps only {km} km of ditches in all three catchments. On the LiDAR relief many more are visible. Mapping them (from LiDAR and by residents) is the first job of this app.',

    dr_intro: 'Rainfall in 2026 has been about normal, yet the rivers are at record lows. Hotter weather evaporates more, and a drained landscape does not hold the water that falls on it.',
    dr_rank_1: 'lowest flow since 1991',
    dr_rank_n: '{ord} lowest flow since 1991',
    dr_rank_any: 'rank {n} of {of} since 1991',
    dr_days_below: '{n} days below SNQ in {year}',
    dr_window: 'mean flow {window}, gauges since 1991',
    dr_no_gauge: 'Dłubnia has no IMGW gauge, a monitoring gap that citizen observations could fill.',
    dr_flow_title: 'River flow, last 12 months',
    dr_flow_sub: 'Daily mean discharge vs. the 1991–2020 range for the same day of year',
    dr_rank_title: 'Mean flow 1 Jan to date, every year since 1991',
    dr_cwb_title: 'Climatic water balance (rain minus evaporation), cumulative',
    dr_cwb_sub: 'ERA5 reanalysis at the catchment centre',
    dr_month_title: 'Monthly rainfall {year} vs 1991–2020 normal',
    dr_rain: 'Rain so far',
    dr_balance: 'Water balance',
    dr_soil: 'Soil moisture (0–100 cm)',
    dr_normal: 'normal',
    dr_warnings: 'IMGW hydrological warnings: Małopolska',
    dr_warnings_live: 'live from IMGW',
    dr_warnings_snapshot: 'snapshot from {date}',
    dr_since: 'since',
    dr_none: 'No active warnings.',
    dr_more_warnings: '{n} more drought warnings elsewhere in Małopolska',
    s_range: '1991–2020 range (10–90%)',
    s_median: '1991–2020 median',
    s_mean: '1991–2020 mean',
    s_snq: 'SNQ (mean low flow)',
    s_nnq: 'NNQ (lowest low flow)',
    s_flow: 'Daily flow',
    m3s: 'm³/s',
    mm: 'mm',
    station: 'Gauge',
    catchment: 'Catchment',
    updated: 'Data updated {date}',

    tab_reports: 'Report',
    rep_fab: 'Report an observation',
    rep_intro: 'Seen a ditch, stream, spring or culvert? Tell us whether water is flowing, standing or dry. Two of the biggest gaps in this map can only be filled by people on the ground.',
    rep_why_gauge_t: 'Dłubnia has no gauge',
    rep_why_gauge: 'IMGW does not measure the Dłubnia at all. Dated "flowing / dry" reports along it and its tributaries are the only low-flow record we can get.',
    rep_why_ditch_t: 'Ditches missing from the map',
    rep_why_ditch: 'BDOT10k maps only about 130 km of ditches in the three catchments; the LiDAR relief shows many more. Each reported ditch extends the inventory, and "already blocked" tells us where retention works today.',
    rep_add: 'Add an observation',
    rep_my_location: 'Use my location',
    rep_step1: "Click the map where you saw it, or use your phone's location.",
    rep_step2: 'Pick the feature and its state, add a date, a note and a photo if you like.',
    rep_step3: 'Your reports stay in this browser. Send them to the project as a GitHub issue, or download them as GeoJSON.',
    rep_mine: 'Your reports ({n})',
    rep_show_layer: 'Show reports on the map',
    rep_empty: 'No reports yet in this browser.',
    rep_show: 'Show on map',
    rep_export: 'Export GeoJSON',
    rep_send: 'Send to project',
    rep_send_note: '"Send to project" opens a prefilled public GitHub issue on the project repository (you need a GitHub account, and nothing is sent until you submit it). Photos do not fit in the link; drag them into the issue. Example reports are never exported or sent.',
    rep_examples_summary: 'Try it with example reports',
    rep_examples_text: 'Adds three fictional reports, labelled EXAMPLE on the map and in this list, so you can see how the layer works. They are not observations and are never exported or sent.',
    rep_examples_add: 'Add example reports',
    rep_examples_remove: 'Remove example reports',
    rep_example_tag: 'EXAMPLE',
    example_note_1: 'Fictional example: stream bed dry at the road bridge.',
    example_note_2: 'Fictional example: ditch not on the map, standing water.',
    example_note_3: 'Fictional example: spring still flowing.',
    rep_pick_hint: 'Click the map where you made the observation.',
    rep_form_title: 'New observation',
    rep_dlubnia_gap: 'This is in the Dłubnia catchment, which has no IMGW gauge. Your report helps fill that gap.',
    rep_type: 'What did you see?',
    rep_type_ditch: 'Ditch',
    rep_type_stream: 'Stream',
    rep_type_spring: 'Spring',
    rep_type_culvert: 'Culvert',
    rep_status: 'Water',
    rep_status_flowing: 'Flowing',
    rep_status_standing: 'Standing water',
    rep_status_dry: 'Dry',
    rep_status_blocked: 'Already blocked',
    rep_date: 'Date',
    rep_photo: 'Photo (optional)',
    rep_photo_preview: 'Photo preview',
    rep_photo_alt: 'Photo of the {type}',
    rep_photo_fail: 'This photo could not be read. Try a JPEG or PNG.',
    rep_note: 'Note (optional)',
    rep_note_ph: 'e.g. about 1 m wide, water 10 cm deep, not on the map',
    rep_privacy: 'Saved only in this browser until you export or send it. Sent reports become public on GitHub, including the location.',
    rep_save: 'Save report',
    rep_saved: 'Report saved in this browser.',
    rep_quota: 'Browser storage is full. The report was saved without its photo, or not at all; export and delete older reports.',
    rep_geo_fail: 'Location is not available. Click the map instead.',
    rep_confirm_delete: 'Delete this report from this browser?',
    rep_outside: 'outside the three catchments',
    rep_this_ditch: 'Report on this ditch',
    cancel: 'Cancel',
    delete: 'Delete',

    ret_title: 'Scenario: block the best ditches',
    ret_slider: 'Block the top {n} of {of} high-priority ditches',
    ret_slider_aria: 'Number of high-priority ditches to block, out of {of}',
    ret_per_fill: 'held per filling · {km} km of ditch',
    ret_compare: 'About {dur} of the Rudawa water treatment plant\'s output (22–28 thousand m³ a day).',
    ret_zero: 'Move the slider to add ditches.',
    ret_minutes: '{a}–{b} minutes',
    ret_hours: '{a}–{b} hours',
    ret_days: '{a}–{b} days',
    ret_show_map: 'Show these ditches on the map',
    ret_hide_map: 'Hide from the map',
    ret_how: 'How is this estimated?',
    ret_assumptions: 'Heuristic, not a hydraulic model: length × an assumed cross-section of {cs} m² (a small field ditch about 0.5 m wide at the bottom and 0.8 m deep) × a fill factor of {ff} (a chain of small dams keeps each stretch about half full). That is {per_m} m³ per metre of ditch. BDOT10k has no ditch dimensions, so every ditch gets the same profile.',
    ret_recharge: 'The number is per filling: a blocked ditch refills after each rain. Water held in a ditch also soaks into the soil and raises the water table along it. That groundwater recharge feeds the river in dry summers and is probably the bigger benefit, but it is not counted here.',
    ret_source: 'Plant output:',
    ditch_storage: 'Storage if blocked',
    ditch_storage_note: 'Per filling, heuristic: length × 1 m² × 0.5. Rank {rank} in its catchment. Also recharges groundwater (not counted).',

    about_html: `
      <h3>Why</h3>
      <p>Kraków takes about 97% of its tap water from rivers. Rudawa and Dłubnia are two of them, and in 2026 Rudawa and Prądnik ran at their lowest levels since 1991. Scientists blame lost retention: drained fields and forests, sealed surfaces and straightened channels. A <em>sponge city</em> needs a sponge landscape around it.</p>
      <h3>What this prototype does</h3>
      <ul>
        <li>Delineates the three catchments from open data and checks them against the official MPHP map.</li>
        <li>Scores every mapped drainage ditch for "block it first" potential: land use, distance to houses, slope, length.</li>
        <li>Measures how much room each 250 m river reach has for meanders and floodplains.</li>
        <li>Tracks the 2026 drought: live IMGW gauges and warnings, 35 years of flow records, ERA5 water balance.</li>
        <li>Collects citizen observations of ditches, streams, springs and culverts, stored in your browser and sent to the project only when you choose.</li>
      </ul>
      <h3>Hackathon track</h3>
      <p><strong>Resilience Informatics</strong>: drought early warning combined with retention planning. Also <strong>Data-to-Insight</strong> and <strong>Citizen Science UX</strong>: residents can report ditches, streams, springs and culverts as flowing, standing, dry or already blocked (Report tab).</p>
      <h3>Data sources</h3>
      <ul class="sources">
        <li>BDOT10k topographic database: GUGiK, geoportal.gov.pl (rivers, ditches, land cover, buildings, weirs, protected areas)</li>
        <li>Copernicus GLO-30 DEM: ESA / Airbus, © DLR e.V. 2010–2014 and © Airbus 2014–2018, provided under COPERNICUS by the EU and ESA</li>
        <li>MPHP10k hydrographic map: PGW Wody Polskie (WMS, used for validation)</li>
        <li>Hydrological data: IMGW-PIB (operational discharge, verified 1991–2025 archive, warnings)</li>
        <li>ERA5 reanalysis via Open-Meteo: Copernicus Climate Change Service</li>
        <li>Orthophoto and LiDAR shaded relief: GUGiK geoportal.gov.pl WMS</li>
        <li>Basemap: OpenFreeMap © OpenMapTiles, © OpenStreetMap contributors</li>
      </ul>
      <h3>Honest limits</h3>
      <p>Catchments come from a 25 m surface model (−5% to −0.2% vs MPHP). The ditch score is a transparent screening heuristic, not a hydrological model. BDOT10k misses many ditches and all field drains. ERA5 cells are about 25 km wide. IMGW 2026 data are operational and not yet verified.</p>
    `,
  },
  pl: {
    title: 'Gąbka Krakowa',
    tagline: 'Woda dla miasta zaczyna się na wzgórzach wokół niego',
    tab_layers: 'Widoki',
    views_intro: 'Wybierz, co chcesz zobaczyć. Każdy widok łączy pasujące do siebie warstwy mapy.',
    view_rivers: 'Rzeki',
    view_rivers_d: 'Poznaj sieć rzeczną',
    view_rivers_hint: 'Główne rzeki i mniejsze potoki na tle granic zlewni.',
    view_ditches: 'Rowy',
    view_ditches_d: 'Znajdź miejsca dla retencji',
    view_ditches_hint: 'Kolory rowów pokazują priorytet retencji. Przybliż mapę i kliknij rów, aby zobaczyć ocenę i jej składowe.',
    view_corridors: 'Miejsce dla rzeki',
    view_corridors_d: 'Przestrzeń i przeszkody',
    view_corridors_hint: 'Sprawdź, gdzie rzeka ma miejsce na meandry, oraz zobacz pobliskie budynki, jazy i zapory. Przybliż mapę, by zobaczyć budynki; kliknij korytarz, by poznać ocenę.',
    view_landcover: 'Krajobraz',
    view_landcover_d: 'Teren i obszary chronione',
    view_landcover_hint: 'Lasy, pola i powierzchnie uszczelnione wraz z obszarami chronionymi i rzekami.',
    view_monitoring: 'Monitoring wody',
    view_monitoring_d: 'Przepływy i ujęcia wody',
    view_monitoring_hint: 'Wodowskazy i zakłady uzdatniania wody. Kliknij wodowskaz, aby zobaczyć historię przepływów i informacje o suszy.',
    view_manual: 'Tryb ręczny',
    view_manual_d: 'Wybierz własne warstwy',
    view_manual_hint: 'Ustaw warstwy poniżej. Twój zestaw zostanie zachowany, gdy wybierzesz inny widok i wrócisz do trybu ręcznego.',
    view_includes: 'Widoczne warstwy',
    river_main: 'Główne rzeki',
    river_streams: 'Mniejsze cieki',
    tab_catchments: 'Zlewnie',
    tab_drought: 'Susza 2026',
    tab_about: 'O projekcie',
    bm_light: 'Mapa',
    bm_ortho: 'Ortofoto',
    bm_relief: 'Rzeźba LiDAR',
    loading: 'Wczytywanie danych…',

    grp_base: 'Zlewnie i kontekst',
    grp_sponge: 'Gdzie zatrzymać wodę',
    grp_monitor: 'Monitoring',
    opacity: 'Przezroczystość',

    lyr_catchments: 'Zlewnie (Rudawa, Prądnik, Dłubnia)',
    lyr_catchments_d: 'Wyznaczone z DEM Copernicus i sieci rzek BDOT10k; 0–7% różnicy względem oficjalnego MPHP.',
    lyr_mphp: 'Oficjalne działy wodne MPHP',
    lyr_mphp_d: 'WMS Wód Polskich, do porównania.',
    lyr_landcover: 'Pokrycie terenu',
    lyr_landcover_d: 'BDOT10k: lasy, łąki, pola, zabudowa i powierzchnie uszczelnione.',
    lyr_rivers: 'Rzeki i potoki',
    lyr_rivers_d: 'BDOT10k; główne cieki pogrubione.',
    lyr_protected: 'Obszary chronione',
    lyr_protected_d: 'Park narodowy, parki krajobrazowe, rezerwaty.',
    lyr_ditches: 'Rowy melioracyjne: priorytet retencji',
    lyr_ditches_d: 'Rowy z BDOT10k z oceną 0–100: użytkowanie terenu, odległość od domów, spadek, długość. Kliknij rów, by zobaczyć składowe.',
    lyr_corridors: 'Miejsce dla rzeki',
    lyr_corridors_d: 'Udział korytarza 2×100 m wzdłuż głównych cieków wolny od zabudowy i powierzchni uszczelnionych, czyli miejsca, gdzie mogą wrócić meandry i zalewy.',
    lyr_buildings: 'Budynki w korytarzach rzek',
    lyr_buildings_d: 'Budynki BDOT10k do 100 m od głównych cieków.',
    lyr_weirs: 'Jazy i zapory',
    lyr_weirs_d: 'Budowle hydrotechniczne BDOT10k.',
    lyr_gauges: 'Wodowskazy IMGW (na żywo)',
    lyr_gauges_d: 'Czerwony = przepływ poniżej średniego niskiego (SNQ).',
    lyr_intakes: 'Zakłady uzdatniania wody Krakowa',
    lyr_intakes_d: 'Rudawa i Dłubnia zasilają krakowskie wodociągi.',

    lc_forest: 'Lasy i zarośla',
    lc_grassland: 'Łąki i pastwiska',
    lc_arable: 'Grunty orne',
    lc_orchard: 'Sady i ogródki',
    lc_water: 'Wody',
    lc_built: 'Zabudowa',
    lc_industrial: 'Tereny przemysłowe',
    lc_transport: 'Drogi, kolej, place',
    lc_bare: 'Grunty odkryte',
    lc_other: 'Inne',

    pr_high: 'Wysoki: blokować najpierw',
    pr_medium: 'Średni',
    pr_low: 'Niski',
    room_open: 'Wolny (≥80%)',
    room_partial: 'Częściowo (50–80%)',
    room_constrained: 'Ograniczony (<50%)',
    gauge_low: 'Poniżej SNQ',
    gauge_ok: 'Powyżej SNQ',

    ditch_title: 'Rów melioracyjny',
    ditch_score: 'Priorytet retencji',
    ditch_context: 'Użytkowanie',
    ditch_houses: 'Najbliższy budynek',
    ditch_slope: 'Spadek',
    ditch_length: 'Długość',
    ditch_note: 'To ocena wstępna, nie projekt. Zablokowanie rowu wymaga zgody właściciela, Wód Polskich i pozwolenia wodnoprawnego.',
    corridor_title: 'Odcinek rzeki (250 m)',
    corridor_free: 'Wolny korytarz',
    corridor_built: 'Zabudowa i uszczelnienie',
    weir_title: 'Budowla hydrotechniczna',

    area: 'Powierzchnia',
    vs_mphp: 'MPHP: {mphp} km² ({diff}%)',
    feeds_tap: 'Zasila wodociągi Krakowa',
    no_tap: 'Brak ujęcia miejskiego',
    landcover: 'Pokrycie terenu',
    sealed: 'Powierzchnie uszczelnione',
    ditches: 'Zmapowane rowy melioracyjne',
    ditch_density: '{km} km · {density} km/km²',
    high_priority: 'rowów o wysokim priorytecie',
    corridor_room: 'Korytarz głównego cieku',
    open_km: '{open} z {total} km ma miejsce na meandry',
    weirs: 'Jazy i zapory',
    zoom: 'Przybliż zlewnię',
    focus_back: 'Wszystkie zlewnie',
    focus_key: 'Linia ciągła: rzeki · Przerywana: rowy',
    focus_intro: 'Kolor wyróżnia tylko tę zlewnię. Przybliż mapę, aby zobaczyć cieki i rowy; kliknij rów, aby sprawdzić jego potencjał retencyjny.',
    focus_recenter: 'Pokaż całą zlewnię',
    catch_intro: 'Trzy małe rzeki na północ i zachód od Krakowa. Rudawa i Dłubnia zasilają zakłady uzdatniania wody, a wszystkie trzy płyną przez miasto do Wisły.',
    gap_title: 'Luka w danych',
    gap_text: 'BDOT10k zawiera tylko {km} km rowów we wszystkich trzech zlewniach. Na cieniowaniu LiDAR widać ich znacznie więcej. Ich zmapowanie (z LiDAR i przez mieszkańców) to pierwsze zadanie tej aplikacji.',

    dr_intro: 'Opady w 2026 r. są mniej więcej w normie, a mimo to rzeki mają rekordowo niskie przepływy. W cieplejszej pogodzie więcej wody paruje, a odwodniony krajobraz nie zatrzymuje tego, co spadnie.',
    dr_rank_1: 'najniższy przepływ od 1991',
    dr_rank_n: '{n}. najniższy przepływ od 1991',
    dr_rank_any: 'miejsce {n} z {of} od 1991',
    dr_days_below: '{n} dni poniżej SNQ w {year}',
    dr_window: 'średni przepływ {window}, wodowskazy od 1991',
    dr_no_gauge: 'Na Dłubni nie ma wodowskazu IMGW. Tę lukę w monitoringu mogą wypełnić obserwacje mieszkańców.',
    dr_flow_title: 'Przepływ rzek, ostatnie 12 miesięcy',
    dr_flow_sub: 'Średni dobowy przepływ na tle zakresu 1991–2020 dla tego samego dnia roku',
    dr_rank_title: 'Średni przepływ od 1 stycznia do dziś, każdy rok od 1991',
    dr_cwb_title: 'Klimatyczny bilans wodny (opad minus parowanie), narastająco',
    dr_cwb_sub: 'Reanaliza ERA5 w centrum zlewni',
    dr_month_title: 'Opad miesięczny {year} na tle normy 1991–2020',
    dr_rain: 'Opad od 1 stycznia',
    dr_balance: 'Bilans wodny',
    dr_soil: 'Wilgotność gleby (0–100 cm)',
    dr_normal: 'norma',
    dr_warnings: 'Ostrzeżenia hydrologiczne IMGW: Małopolska',
    dr_warnings_live: 'na żywo z IMGW',
    dr_warnings_snapshot: 'stan z {date}',
    dr_since: 'od',
    dr_none: 'Brak aktywnych ostrzeżeń.',
    dr_more_warnings: 'jeszcze {n} ostrzeżeń o suszy w Małopolsce',
    s_range: 'zakres 1991–2020 (10–90%)',
    s_median: 'mediana 1991–2020',
    s_mean: 'średnia 1991–2020',
    s_snq: 'SNQ (średni niski przepływ)',
    s_nnq: 'NNQ (najniższy przepływ)',
    s_flow: 'Przepływ dobowy',
    m3s: 'm³/s',
    mm: 'mm',
    station: 'Wodowskaz',
    catchment: 'Zlewnia',
    updated: 'Dane z {date}',

    tab_reports: 'Zgłoś',
    rep_fab: 'Zgłoś obserwację',
    rep_intro: 'Widzisz rów, potok, źródło albo przepust? Daj znać, czy woda płynie, stoi, czy jest sucho. Dwie największe luki tej mapy mogą wypełnić tylko ludzie w terenie.',
    rep_why_gauge_t: 'Dłubnia nie ma wodowskazu',
    rep_why_gauge: 'IMGW w ogóle nie mierzy Dłubni. Datowane zgłoszenia „płynie / sucho” z niej i jej dopływów to jedyny zapis niżówki, jaki możemy mieć.',
    rep_why_ditch_t: 'Rowy, których nie ma na mapie',
    rep_why_ditch: 'BDOT10k zawiera tylko ok. 130 km rowów w trzech zlewniach, a cieniowanie LiDAR pokazuje ich znacznie więcej. Każdy zgłoszony rów uzupełnia inwentaryzację, a „już zablokowany” pokazuje, gdzie retencja działa już dziś.',
    rep_add: 'Dodaj obserwację',
    rep_my_location: 'Użyj mojej lokalizacji',
    rep_step1: 'Kliknij na mapie miejsce obserwacji albo użyj lokalizacji telefonu.',
    rep_step2: 'Wybierz obiekt i stan wody, dodaj datę, a jeśli chcesz, notatkę i zdjęcie.',
    rep_step3: 'Zgłoszenia zostają w tej przeglądarce. Wyślij je do projektu jako zgłoszenie na GitHubie albo pobierz jako GeoJSON.',
    rep_mine: 'Twoje zgłoszenia ({n})',
    rep_show_layer: 'Pokaż zgłoszenia na mapie',
    rep_empty: 'Brak zgłoszeń w tej przeglądarce.',
    rep_show: 'Pokaż na mapie',
    rep_export: 'Eksportuj GeoJSON',
    rep_send: 'Wyślij do projektu',
    rep_send_note: '„Wyślij do projektu” otwiera wypełnione, publiczne zgłoszenie (issue) w repozytorium projektu na GitHubie (potrzebne konto; nic nie zostaje wysłane, dopóki go nie zatwierdzisz). Zdjęcia nie mieszczą się w linku, przeciągnij je do zgłoszenia. Przykładowe zgłoszenia nigdy nie są eksportowane ani wysyłane.',
    rep_examples_summary: 'Wypróbuj na przykładowych zgłoszeniach',
    rep_examples_text: 'Dodaje trzy fikcyjne zgłoszenia oznaczone na mapie i na liście jako PRZYKŁAD, żeby pokazać działanie warstwy. To nie są obserwacje i nigdy nie są eksportowane ani wysyłane.',
    rep_examples_add: 'Dodaj przykładowe zgłoszenia',
    rep_examples_remove: 'Usuń przykładowe zgłoszenia',
    rep_example_tag: 'PRZYKŁAD',
    example_note_1: 'Fikcyjny przykład: suche koryto przy moście drogowym.',
    example_note_2: 'Fikcyjny przykład: rów, którego nie ma na mapie, stojąca woda.',
    example_note_3: 'Fikcyjny przykład: źródło nadal bije.',
    rep_pick_hint: 'Kliknij na mapie miejsce obserwacji.',
    rep_form_title: 'Nowa obserwacja',
    rep_dlubnia_gap: 'To zlewnia Dłubni, w której nie ma wodowskazu IMGW. Twoje zgłoszenie pomaga wypełnić tę lukę.',
    rep_type: 'Co widzisz?',
    rep_type_ditch: 'Rów',
    rep_type_stream: 'Potok',
    rep_type_spring: 'Źródło',
    rep_type_culvert: 'Przepust',
    rep_status: 'Woda',
    rep_status_flowing: 'Płynie',
    rep_status_standing: 'Stoi',
    rep_status_dry: 'Sucho',
    rep_status_blocked: 'Już zablokowany',
    rep_date: 'Data',
    rep_photo: 'Zdjęcie (opcjonalnie)',
    rep_photo_preview: 'Podgląd zdjęcia',
    rep_photo_alt: 'Zdjęcie: {type}',
    rep_photo_fail: 'Nie udało się odczytać zdjęcia. Spróbuj pliku JPEG lub PNG.',
    rep_note: 'Notatka (opcjonalnie)',
    rep_note_ph: 'np. szerokość ok. 1 m, 10 cm wody, brak na mapie',
    rep_privacy: 'Zapisane tylko w tej przeglądarce, dopóki go nie wyeksportujesz lub nie wyślesz. Wysłane zgłoszenia, łącznie z lokalizacją, są publiczne na GitHubie.',
    rep_save: 'Zapisz zgłoszenie',
    rep_saved: 'Zgłoszenie zapisane w tej przeglądarce.',
    rep_quota: 'Pamięć przeglądarki jest pełna. Zgłoszenie zapisano bez zdjęcia albo wcale; wyeksportuj i usuń starsze zgłoszenia.',
    rep_geo_fail: 'Lokalizacja jest niedostępna. Kliknij na mapie.',
    rep_confirm_delete: 'Usunąć to zgłoszenie z tej przeglądarki?',
    rep_outside: 'poza trzema zlewniami',
    rep_this_ditch: 'Zgłoś obserwację tego rowu',
    cancel: 'Anuluj',
    delete: 'Usuń',

    ret_title: 'Scenariusz: zablokuj najlepsze rowy',
    ret_slider: 'Zablokuj {n} najlepszych z {of} rowów o wysokim priorytecie',
    ret_slider_aria: 'Liczba rowów o wysokim priorytecie do zablokowania, z {of}',
    ret_per_fill: 'przy jednym napełnieniu · {km} km rowów',
    ret_compare: 'To ok. {dur} produkcji Zakładu Uzdatniania Wody Rudawa (22–28 tys. m³ na dobę).',
    ret_zero: 'Przesuń suwak, aby dodać rowy.',
    ret_minutes: '{a}–{b} min',
    ret_hours: '{a}–{b} godz.',
    ret_days: '{a}–{b} doby',
    ret_show_map: 'Pokaż te rowy na mapie',
    ret_hide_map: 'Ukryj na mapie',
    ret_how: 'Jak to policzono?',
    ret_assumptions: 'Heurystyka, nie model hydrauliczny: długość × przyjęty przekrój {cs} m² (mały rów polny, ok. 0,5 m szerokości dna i 0,8 m głębokości) × współczynnik wypełnienia {ff} (szereg małych zastawek utrzymuje każdy odcinek mniej więcej w połowie pełny). Daje to {per_m} m³ na metr rowu. BDOT10k nie podaje wymiarów rowów, więc każdy rów ma ten sam profil.',
    ret_recharge: 'Liczba dotyczy jednego napełnienia: zablokowany rów napełnia się po każdym deszczu. Woda w rowie wsiąka też w glebę i podnosi zwierciadło wód gruntowych. To zasilanie wód podziemnych podtrzymuje przepływ rzeki w suche lata i jest zapewne większą korzyścią, ale nie jest tu liczone.',
    ret_source: 'Produkcja zakładu:',
    ditch_storage: 'Retencja po zablokowaniu',
    ditch_storage_note: 'Przy jednym napełnieniu, heurystyka: długość × 1 m² × 0,5. Miejsce {rank} w zlewni. Zasila też wody gruntowe (nieliczone).',

    about_html: `
      <h3>Dlaczego</h3>
      <p>Kraków bierze ok. 97% wody z rzek. Rudawa i Dłubnia są wśród nich, a w 2026 r. Rudawa i Prądnik miały najniższe przepływy od 1991 r. Naukowcy wskazują na utratę retencji: zmeliorowane pola i lasy, zabetonowane powierzchnie i wyprostowane koryta. <em>Miasto-gąbka</em> potrzebuje gąbki wokół siebie.</p>
      <h3>Co robi prototyp</h3>
      <ul>
        <li>Wyznacza trzy zlewnie z otwartych danych i porównuje je z oficjalnym MPHP.</li>
        <li>Ocenia każdy zmapowany rów pod kątem „blokować najpierw”: użytkowanie terenu, odległość od domów, spadek, długość.</li>
        <li>Mierzy, ile miejsca na meandry i zalewy ma każdy 250-metrowy odcinek rzeki.</li>
        <li>Śledzi suszę 2026: wodowskazy i ostrzeżenia IMGW na żywo, 35 lat pomiarów przepływu, bilans wodny ERA5.</li>
        <li>Zbiera obserwacje mieszkańców o rowach, potokach, źródłach i przepustach; zostają w przeglądarce i trafiają do projektu tylko wtedy, gdy je wyślesz.</li>
      </ul>
      <h3>Ścieżka hackathonu</h3>
      <p><strong>Resilience Informatics</strong>: wczesne ostrzeganie przed suszą połączone z planowaniem retencji. Także <strong>Data-to-Insight</strong> i <strong>Citizen Science UX</strong>: mieszkańcy mogą zgłaszać rowy, potoki, źródła i przepusty, w których woda płynie, stoi, jest sucho albo które są już zablokowane (zakładka Zgłoś).</p>
      <h3>Źródła danych</h3>
      <ul class="sources">
        <li>BDOT10k: GUGiK, geoportal.gov.pl (rzeki, rowy, pokrycie terenu, budynki, jazy, obszary chronione)</li>
        <li>Copernicus GLO-30 DEM: ESA / Airbus, w ramach programu COPERNICUS UE i ESA</li>
        <li>MPHP10k: PGW Wody Polskie (WMS, do walidacji)</li>
        <li>Dane hydrologiczne: IMGW-PIB (przepływy operacyjne, archiwum zweryfikowane 1991–2025, ostrzeżenia)</li>
        <li>Reanaliza ERA5 przez Open-Meteo: Copernicus Climate Change Service</li>
        <li>Ortofotomapa i cieniowanie LiDAR: GUGiK, WMS geoportal.gov.pl</li>
        <li>Podkład: OpenFreeMap © OpenMapTiles, © autorzy OpenStreetMap</li>
      </ul>
      <h3>Ograniczenia</h3>
      <p>Zlewnie wyznaczono z modelu powierzchni 25 m (−5% do −0,2% względem MPHP). Ocena rowów to przejrzysta heurystyka przesiewowa, a nie model hydrologiczny. BDOT10k pomija wiele rowów i cały drenaż podziemny. Komórki ERA5 mają ok. 25 km. Dane IMGW z 2026 r. są operacyjne, jeszcze niezweryfikowane.</p>
    `,
  },
};

let lang = localStorage.getItem('lang') || ((navigator.language || 'en').startsWith('pl') ? 'pl' : 'en');

export function getLang() {
  return lang;
}

export function setLang(next) {
  lang = next;
  localStorage.setItem('lang', next);
  document.documentElement.lang = next;
}

export function t(key, vars = {}) {
  let s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
}

export function ordinal(n) {
  if (lang === 'pl') return `${n}.`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function fmt(n, digits = 1) {
  return Number(n).toLocaleString(lang === 'pl' ? 'pl-PL' : 'en-GB', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}
