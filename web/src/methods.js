import { fmt, getLang, t } from './i18n.js';

const COPY = {
  en: {
    title: 'Calculations & literature',
    intro: 'How the map turns mapped river and ditch geometry into a proposal, and what the research tells us about interpreting it.',
    meander: '1. Calculating a meandering route',
    example: 'Example from the current map data',
    rounded: 'Displayed measurements are rounded.',
    measured: 'We measure both centreline lengths in metres: L₁ is current and L₂ is proposed. Extra length is their difference; the percentage is that difference divided by current length.',
    inputs: 'Inputs: BDOT10k river centrelines, buildings, sealed land and weirs. We join connected green sections, retain both endpoints and test gentle sideways bends. “Area adjusted” shows the corridor searched after mapped exclusions, not a predicted flood footprint.',
    assumptions: 'Our numerical assumptions',
    distinction: 'The amplitudes, buffers and target length gain are project screening choices. The literature below provides restoration context; it does not validate these settings or the generated routes.',
    ditch: '2. Estimating ditch storage',
    volume: 'The “block the top N” scenario uses mapped ditch length multiplied by an assumed cross-section and fill factor:',
    volumeFormula: 'V = length × {area} m² × {fill}',
    volumeExample: 'For illustration, 100 m of ditch gives approximately {volume} m³ per filling under these assumptions.',
    volumeLimit: 'BDOT10k does not measure ditch depth or width. This estimate counts channel storage only; it does not calculate groundwater recharge, seasonal water savings or reduced flood peaks.',
    pond: '3. Water held around a filled ditch section',
    pondInputs: 'The Ditch barriers overlay uses official GUGiK bare-earth terrain at 1 m resolution, plus BDOT10k drainage and building footprints. It maps connected low ground around the ditch. The earlier channel-only barrier experiment is not used for these blue polygons.',
    pondLevel: 'Only an assumed 6 m across × 3 m along patch is filled, without a bed-level opening. The remaining drainage stays open. For fill heights of 0.2–1.0 m, water rises to the crest or stops just below the lowest terrain route into an open drain. A lower bypass caps the footprint even if the patch is raised.',
    pondFormula: 'Water level = min(crest, escape saddle − 0.01 m)<br>Depth per connected cell = max(0, water level − ground)<br>Area = wet cell count × 1 m²<br>Total capacity = Σ(depth × 1 m²)<br>Added capacity = max(0, total − existing depression storage)',
    pondBaseline: 'We repeat the drainage search without the patch to estimate existing natural depression storage within the same footprint, then subtract it. Disconnected hollows and higher islands stay dry. Neither a buffer around the line nor the screened upstream length sets the water boundary.',
    pondScreen: 'At the default 0.6 m height, proposals must add at least 5 m³, wet at least 10 m² outside the nominal ditch and keep the full water footprint at least 100 m from mapped buildings. Unresolved baseline drainage and water limited by missing terrain or the tile edge are excluded. These are project screening thresholds, not validated safety limits.',
    pondOutflow: 'Water leaving the pond',
    pondFlow: 'Below the lowest surface outlet, the ideal impermeable pool has no surface discharge. Once full, water can pass over the patch or around it into the remaining drainage. The optional free-overflow example uses Q = C × b × H³ᐟ², with C = 1.5 m½/s, effective crest width b in metres and head H in metres; Q is in m³/s (× 1,000 for L/s). Width is approximated from terrain, not surveyed.',
    pondFlowLimit: 'The overflow example is crest-only capacity. It does not estimate total site discharge, bypass throughput, tailwater or seepage, and its head control does not redraw the contained pond above the spill level.',
    pondLimit: 'This is potential surface-water capacity if enough water arrives, not a rainfall forecast or a groundwater-wetting map. The 1 m grid describes horizontal resolution, not vertical accuracy. Shallow depths are sensitive to terrain error, small banks, culverts and buried drains. Sites are alternatives: do not add their volumes without modelling their interaction.',
    literature: 'Literature & guidance',
    literatureIntro: 'Terrain-based storage guidance supports the pond-capacity calculation. Field studies help interpret redistribution, drainage and uncertainty; they do not calibrate these local candidates. River-restoration guidance supports the meander discussion.',
    riverSources: 'River restoration',
    ditchSources: 'Ditch barriers and temporary storage',
    rrc: 'Use historical channels and hydromorphological evidence where possible. A newly drawn bend requires site-specific energy and sediment analysis; shape alone does not restore river processes.',
    kprwp: 'Polish restoration context. The programme calls for local assessment, including flood risk, groundwater and protected areas, before selecting interventions.',
    muhawenimana: 'Field monitoring of leaky barriers found backwater, overbank flow and delayed release varying with the structure and storm. Supports checking storage, drainage and bank spill together; UK storage figures are not assigned to Kraków.',
    holden: 'A four-year peatland trial found redirected flow and changing responses after ditch blocking. Reduced ditch discharge does not equal permanent storage. Peatland results do not calibrate agricultural soils around Kraków.',
    roberts: 'Multi-site temporary-storage observations show that outlet design and changing soil conditions affect drainage. Supports exposing assumptions and measuring performance across events, rather than applying one benefit percentage.',
    usace: 'HEC-RAS derives horizontal-pool storage from terrain elevations. This supports summing depth over the mapped pond. Our connected-cell and escape-route search is a project implementation, not a HEC-RAS simulation. The separate broad-crested-weir reference supports the illustrative crest-overflow equation, not total network discharge.',
    terrain: 'Official numeric ground-elevation data for the pond footprints: 1 m NMT, EPSG:2180 and PL-KRON86-NH heights. This replaces the coarse 25 m surface-model screen for pond geometry; it does not establish centimetre vertical accuracy.',
    naturescot: 'Peat-dam guidance links placement to terrain and backwater. It is peatland-specific; its construction rules and spacings are not transferred to this agricultural-ditch screening.',
    checked: 'Reference pages and research abstracts checked on 4 October 2026. These sources provide context and method foundations, not field validation of the mapped candidates.',
  },
  pl: {
    title: 'Obliczenia i literatura',
    intro: 'Jak przeliczamy geometrię rzek i rowów na propozycje oraz co badania mówią o interpretacji wyników.',
    meander: '1. Obliczanie trasy meandrującej',
    example: 'Przykład z aktualnych danych mapy',
    rounded: 'Wyświetlane pomiary są zaokrąglone.',
    measured: 'Mierzymy długości obu osi koryta w metrach: L₁ to obecna, a L₂ proponowana. Wydłużenie to ich różnica; procent to ta różnica podzielona przez obecną długość.',
    inputs: 'Dane wejściowe: osie rzek, budynki, teren uszczelniony i jazy z BDOT10k. Łączymy sąsiadujące zielone odcinki, zachowujemy oba końce i testujemy łagodne zakola. „Dostosowany obszar” pokazuje sprawdzany korytarz po odjęciu przeszkód z danych, a nie prognozę zalewu.',
    assumptions: 'Nasze założenia liczbowe',
    distinction: 'Amplitudy, bufory i docelowe wydłużenie to założenia wstępnej oceny w projekcie. Literatura poniżej daje kontekst renaturyzacji; nie potwierdza tych parametrów ani wygenerowanych tras.',
    ditch: '2. Szacowanie retencji w rowach',
    volume: 'Scenariusz „zablokuj N rowów” mnoży długość rowu z mapy przez założony przekrój i współczynnik wypełnienia:',
    volumeFormula: 'V = długość × {area} m² × {fill}',
    volumeExample: 'Przykładowo 100 m rowu daje około {volume} m³ na jedno napełnienie przy tych założeniach.',
    volumeLimit: 'BDOT10k nie mierzy głębokości ani szerokości rowu. Szacunek obejmuje tylko wodę w korycie; nie oblicza zasilania wód podziemnych, sezonowego oszczędzania wody ani redukcji kulminacji powodzi.',
    pond: '3. Woda wokół zasypanego odcinka rowu',
    pondInputs: 'Warstwa Przegrody w rowach korzysta z oficjalnego modelu gruntu GUGiK o rozdzielczości 1 m oraz sieci odwodnienia i obrysów budynków BDOT10k. Pokazuje połączone obniżenia wokół rowu. Wcześniejszy eksperyment obejmujący tylko koryto nie wyznacza tych niebieskich obszarów.',
    pondLevel: 'Zasypujemy tylko założony odcinek 6 m w poprzek × 3 m wzdłuż rowu, bez otworu przy dnie. Pozostałe odwodnienie jest drożne. Dla wysokości 0,2–1,0 m woda dochodzi do korony lub zatrzymuje się tuż poniżej najniższej drogi do drożnego rowu. Niższe obejście ogranicza rozlewisko nawet po podniesieniu przegrody.',
    pondFormula: 'Poziom wody = min(korona, próg odpływu − 0,01 m)<br>Głębokość połączonej komórki = max(0, poziom wody − teren)<br>Powierzchnia = liczba mokrych komórek × 1 m²<br>Cała pojemność = Σ(głębokość × 1 m²)<br>Dodatkowa pojemność = max(0, cała − istniejąca retencja obniżenia)',
    pondBaseline: 'Ponawiamy szukanie odpływu bez przegrody, wyznaczamy istniejącą retencję naturalnego obniżenia w tej samej granicy i odejmujemy ją. Oddzielone zagłębienia i wyższe wyspy pozostają suche. Granicy wody nie wyznacza bufor linii ani długość sprawdzonego odcinka powyżej.',
    pondScreen: 'Przy domyślnej wysokości 0,6 m propozycja musi dodawać co najmniej 5 m³, obejmować co najmniej 10 m² poza umownym rowem i zachować minimum 100 m od całej granicy wody do budynków w danych. Odrzucamy nieznany odpływ bazowy oraz rozlewiska ograniczone brakiem danych lub granicą rastra. To progi wstępnej oceny w projekcie, nie potwierdzone normy bezpieczeństwa.',
    pondOutflow: 'Odpływ z rozlewiska',
    pondFlow: 'Poniżej najniższego odpływu powierzchniowego idealny szczelny zbiornik nie odprowadza wody po powierzchni. Po napełnieniu woda przelewa się przez przegrodę lub omija ją do drożnego odwodnienia. Opcjonalny przykład swobodnego przelewu: Q = C × b × H³ᐟ², gdzie C = 1,5 m½/s, czynna szerokość korony b i wysokość wody H są w metrach; Q otrzymujemy w m³/s (× 1000 dla l/s). Szerokość oszacowano z terenu, bez pomiaru.',
    pondFlowLimit: 'Przykład dotyczy przepustowości samej korony. Nie wyznacza całkowitego odpływu, przepustowości obejścia, wody dolnej ani przesiąkania. Zmiana przykładowej wysokości ponad koroną nie przerysowuje zamkniętego rozlewiska powyżej progu odpływu.',
    pondLimit: 'To możliwa pojemność powierzchniowa przy wystarczającym dopływie, nie prognoza opadu ani mapa podsiąkania. Siatka 1 m opisuje rozdzielczość poziomą, nie dokładność wysokości. Płytka woda jest wrażliwa na błędy terenu, niewielkie wały, przepusty i dreny. Lokalizacje są wariantami: nie sumuj ich objętości bez modelu wzajemnego wpływu.',
    literature: 'Literatura i wytyczne',
    literatureIntro: 'Wytyczne obliczania pojemności z terenu uzasadniają metodę rozlewiska. Badania terenowe pomagają interpretować zmianę dróg wody, odpływ i niepewność; nie kalibrują lokalnych kandydatów. Wytyczne renaturyzacji wspierają omówienie meandrów.',
    riverSources: 'Renaturyzacja rzek',
    ditchSources: 'Przegrody w rowach i czasowe magazynowanie',
    rrc: 'Warto wykorzystać historyczne koryta i wiedzę o procesach rzecznych. Nowe zakole wymaga analizy energii i transportu osadów dla konkretnego miejsca; sam kształt nie odtwarza procesów.',
    kprwp: 'Polski kontekst renaturyzacji. Program wskazuje potrzebę lokalnej analizy, m.in. ryzyka powodzi, wód podziemnych i obszarów chronionych, przed doborem działań.',
    muhawenimana: 'Monitoring przepuszczalnych przegród wykazał cofkę, wylewy i opóźniony odpływ zależne od konstrukcji i wezbrania. Uzasadnia wspólną ocenę magazynowania, opróżniania i wylewów; wyników objętości z Wielkiej Brytanii nie przypisujemy Krakowowi.',
    holden: 'Czteroletnie badanie torfowiska wykazało zmianę dróg odpływu i reakcji w czasie po zablokowaniu rowów. Mniejszy odpływ rowem nie oznacza trwałej retencji. Wyniki z torfu nie kalibrują gleb rolnych wokół Krakowa.',
    roberts: 'Obserwacje wielu obiektów czasowej retencji pokazują wpływ odpływu i zmiennych warunków glebowych na opróżnianie. Uzasadniają jawne założenia i pomiary wielu zdarzeń zamiast jednego procentu korzyści.',
    usace: 'HEC-RAS wyznacza pojemność przy poziomym zwierciadle z wysokości terenu. Uzasadnia to sumowanie głębokości w rozlewisku. Nasze szukanie połączonych komórek i dróg odpływu to własna implementacja, nie symulacja HEC-RAS. Osobna dokumentacja przelewu o szerokiej koronie wspiera przykładowe równanie odpływu przez koronę, nie całej sieci.',
    terrain: 'Oficjalne liczbowe wysokości gruntu dla granic rozlewisk: NMT 1 m, EPSG:2180 i rzędne PL-KRON86-NH. Zastępują zgrubny model powierzchni 25 m przy wyznaczaniu wody; nie oznaczają centymetrowej dokładności wysokości.',
    naturescot: 'Wytyczne dla przegród torfowych wiążą położenie z terenem i cofką. Dotyczą torfowisk; zasad budowy i rozstawu nie przenosimy do wstępnej oceny rowów rolnych.',
    checked: 'Strony źródłowe i streszczenia badań sprawdzone 4 października 2026 r. Dostarczają kontekstu i podstaw metody, a nie terenowego potwierdzenia kandydatów z mapy.',
  },
};

const REFERENCES = [
  { group: 'river', key: 'rrc', label: 'River Restoration Centre · DS1', title: 'Restoring meanders to straightened rivers', url: 'https://www.therrc.co.uk/ds1-restoring-meanders' },
  { group: 'river', key: 'kprwp', label: 'PGW Wody Polskie · 2020', title: 'Krajowy program renaturyzacji wód powierzchniowych', url: 'https://www.gov.pl/web/wody-polskie/krajowy-program-renaturyzacji-wod-powierzchniowych' },
  { group: 'ditch', key: 'muhawenimana', label: 'Muhawenimana et al. · 2023', title: 'Field-based monitoring of instream leaky barrier backwater and storage during storm events', url: 'https://orca.cardiff.ac.uk/id/eprint/160143/' },
  { group: 'ditch', key: 'holden', label: 'Holden et al. · 2017', title: 'The impact of ditch blocking on the hydrological functioning of blanket peatland', url: 'https://eprints.whiterose.ac.uk/id/eprint/104376/' },
  { group: 'ditch', key: 'roberts', label: 'Roberts et al. · 2024', title: 'New data-based analysis tool for functioning of Natural Flood Management measures reveals multi-site time-variable effectiveness', url: 'https://abdn.elsevierpure.com/en/publications/new-data-based-analysis-tool-for-functioning-of-natural-flood-man/' },
  { group: 'ditch', key: 'terrain', label: 'GUGiK · NMT 1 m', title: 'WCS ground-terrain data', url: 'https://www.geoportal.gov.pl/pl/usluga/uslugi-pobierania-wcs/' },
  { group: 'ditch', key: 'usace', label: 'USACE · HEC-RAS', title: 'Storage Areas: terrain-derived elevation–volume curves', url: 'https://www.hec.usace.army.mil/confluence/rasdocs/rmum/latest/geometry-data/storage-areas', extra: [
    ['High Flow Computations', 'https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/modeling-bridges/hydraulic-computations-through-the-bridge/high-flow-computations'],
  ] },
  { group: 'ditch', key: 'naturescot', label: 'NatureScot · Peatland ACTION', title: 'Installing peat and plastic dams', url: 'https://www.nature.scot/doc/peatland-action-guidance-land-managers-installing-peat-and-plastic-dams' },
];

export const methodsTitle = () => COPY[getLang()].title;

export function methodsHtml(proposal, retention) {
  const c = COPY[getLang()];
  const link = (title, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
  const sources = (group) => `<ul class="method-sources">${REFERENCES.filter((r) => r.group === group).map((r) => `<li>
    <b>${r.label}</b>${link(r.title, r.url)}<p>${c[r.key]}</p>
    ${r.extra ? `<div class="method-extra">${r.extra.map(([title, url]) => link(title, url)).join(' · ')}</div>` : ''}
  </li>`).join('')}</ul>`;
  const a = retention?.assumptions;
  return `<section class="methods-section" aria-labelledby="calculation-literature">
    <h3 id="calculation-literature" tabindex="-1">${c.title}</h3>
    <p>${c.intro}</p>
    <article class="method-card">
      <h4>${c.meander}</h4><p>${c.inputs}</p>
      ${proposal ? `<div class="method-example"><b>${c.example} · ${proposal.id}</b>
        <span>${t('meander_current')}: ${fmt(proposal.current_m, 1)} m</span>
        <span>${t('meander_proposed')}: ${fmt(proposal.proposed_m, 1)} m</span>
        <strong>+${fmt(proposal.extra_m, 1)} m · +${fmt(proposal.extra_pct, 1)}%</strong><small>${c.rounded}</small></div>` : ''}
      <p>${c.measured}</p><div class="method-equation">ΔL = L₂ − L₁<br>ΔL (%) = 100 × (L₂ − L₁) / L₁</div>
      <details class="more"><summary>${c.assumptions}</summary><p>${t('meander_method')}</p></details>
      <p class="method-boundary">${c.distinction}</p><p>${t('meander_limit')}</p>
    </article>
    <article class="method-card"><h4>${c.ditch}</h4><p>${c.volume}</p>
      ${a ? `<div class="method-equation">${c.volumeFormula.replace('{area}', fmt(a.cross_section_m2, 1)).replace('{fill}', fmt(a.fill_factor, 1))}</div>
      <p>${c.volumeExample.replace('{volume}', fmt(100 * a.cross_section_m2 * a.fill_factor, 0))}</p>` : ''}
      <p>${c.volumeLimit}</p>
    </article>
    <article class="method-card" id="ponding-calculation"><h4>${c.pond}</h4>
      <p>${c.pondInputs}</p><p>${c.pondLevel}</p>
      <div class="method-equation">${c.pondFormula}</div>
      <p>${c.pondBaseline}</p>
      <details class="more"><summary>${c.assumptions}</summary><p>${c.pondScreen}</p></details>
      <details class="more"><summary>${c.pondOutflow}</summary><p>${c.pondFlow}</p><p>${c.pondFlowLimit}</p></details>
      <p class="method-boundary">${c.pondLimit}</p>
    </article>
    <h4>${c.literature}</h4><p>${c.literatureIntro}</p>
    <h5>${c.riverSources}</h5>${sources('river')}
    <h5>${c.ditchSources}</h5>${sources('ditch')}
    <p class="fine">${c.checked}</p>
  </section>`;
}
