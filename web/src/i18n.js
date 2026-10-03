// Minimal EN/PL dictionary. Keys are looked up with t(key, vars).
const STRINGS = {
  en: {
    title: 'Kraków Sponge',
    tagline: "The city's water starts in the hills around it",
    tab_layers: 'Map layers',
    tab_catchments: 'Catchments',
    tab_drought: 'Drought 2026',
    tab_about: 'About & data',
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
    zoom: 'Zoom to catchment',
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

    about_html: `
      <h3>Why</h3>
      <p>Kraków takes about 97% of its tap water from rivers. Rudawa and Dłubnia are two of them, and in 2026 Rudawa and Prądnik ran at their lowest levels since 1991. Scientists blame lost retention: drained fields and forests, sealed surfaces and straightened channels. A <em>sponge city</em> needs a sponge landscape around it.</p>
      <h3>What this prototype does</h3>
      <ul>
        <li>Delineates the three catchments from open data and checks them against the official MPHP map.</li>
        <li>Scores every mapped drainage ditch for "block it first" potential: land use, distance to houses, slope, length.</li>
        <li>Measures how much room each 250 m river reach has for meanders and floodplains.</li>
        <li>Tracks the 2026 drought: live IMGW gauges and warnings, 35 years of flow records, ERA5 water balance.</li>
      </ul>
      <h3>Hackathon track</h3>
      <p><strong>Resilience Informatics</strong>: drought early warning combined with retention planning. Also <strong>Data-to-Insight</strong> and <strong>Citizen Science UX</strong>, since the next step is resident reporting of ditches and dry streams.</p>
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
    tab_layers: 'Warstwy',
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

    about_html: `
      <h3>Dlaczego</h3>
      <p>Kraków bierze ok. 97% wody z rzek. Rudawa i Dłubnia są wśród nich, a w 2026 r. Rudawa i Prądnik miały najniższe przepływy od 1991 r. Naukowcy wskazują na utratę retencji: zmeliorowane pola i lasy, zabetonowane powierzchnie i wyprostowane koryta. <em>Miasto-gąbka</em> potrzebuje gąbki wokół siebie.</p>
      <h3>Co robi prototyp</h3>
      <ul>
        <li>Wyznacza trzy zlewnie z otwartych danych i porównuje je z oficjalnym MPHP.</li>
        <li>Ocenia każdy zmapowany rów pod kątem „blokować najpierw”: użytkowanie terenu, odległość od domów, spadek, długość.</li>
        <li>Mierzy, ile miejsca na meandry i zalewy ma każdy 250-metrowy odcinek rzeki.</li>
        <li>Śledzi suszę 2026: wodowskazy i ostrzeżenia IMGW na żywo, 35 lat pomiarów przepływu, bilans wodny ERA5.</li>
      </ul>
      <h3>Ścieżka hackathonu</h3>
      <p><strong>Resilience Informatics</strong>: wczesne ostrzeganie przed suszą połączone z planowaniem retencji. Także <strong>Data-to-Insight</strong> i <strong>Citizen Science UX</strong>, bo kolejnym krokiem są zgłoszenia mieszkańców o rowach i wysychających potokach.</p>
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
