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
    hydraulic: 'Related calculation: partial ditch barriers',
    hydraulicText: 'Our separate ditch-barrier analysis compares an open ditch with a partial barrier under the same inflow. It uses Manning flow, discharge through a low notch and over a crest, and a level-pool water balance. It tracks release and water escaping the banks as well as temporary storage. This hydraulic calculation is separate from the meander length comparison above.',
    balance: 'Initial water + inflow = outflow + bank escape + final water',
    hydraulicLimit: 'Geometry, roughness, inflow and ground slope remain assumed or screened, without field calibration. A reduction in channel outflow cannot all be counted as water retained.',
    literature: 'Literature & guidance',
    literatureIntro: 'The barrier studies come from our earlier ditch review. The river-restoration guidance adds context for step 5. Each reference explains the part it supports.',
    riverSources: 'River restoration',
    ditchSources: 'Ditch barriers and temporary storage',
    rrc: 'Use historical channels and hydromorphological evidence where possible. A newly drawn bend requires site-specific energy and sediment analysis; shape alone does not restore river processes.',
    kprwp: 'Polish restoration context. The programme calls for local assessment, including flood risk, groundwater and protected areas, before selecting interventions.',
    muhawenimana: 'Field monitoring of leaky barriers found backwater, overbank flow and delayed release varying with the structure and storm. Supports checking storage, drainage and bank spill together; UK storage figures are not assigned to Kraków.',
    holden: 'A four-year peatland trial found redirected flow and changing responses after ditch blocking. Reduced ditch discharge does not equal permanent storage. Peatland results do not calibrate agricultural soils around Kraków.',
    roberts: 'Multi-site temporary-storage observations show that outlet design and changing soil conditions affect drainage. Supports exposing assumptions and measuring performance across events, rather than applying one benefit percentage.',
    usace: 'Hydraulic basis for the related barrier analysis: continuity, Manning flow and weir discharge. These equations require suitable local inputs; the simple ditch estimate and meander proposal are not HEC simulations.',
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
    hydraulic: 'Powiązane obliczenia: częściowe przegrody w rowach',
    hydraulicText: 'Nasza osobna analiza przegród porównuje otwarty rów i częściową przegrodę przy tym samym dopływie. Wykorzystuje przepływ Manninga, odpływ przez niski prześwit i ponad koroną oraz bilans zbiornika o poziomym zwierciadle. Śledzi odpływ i wodę opuszczającą brzegi, a także chwilowe magazynowanie. To osobne obliczenie hydrauliczne, niezależne od porównania długości meandrów powyżej.',
    balance: 'Woda początkowa + dopływ = odpływ + woda poza brzegami + woda końcowa',
    hydraulicLimit: 'Geometria, szorstkość, dopływ i spadek terenu są założone lub wstępnie oszacowane, bez kalibracji terenowej. Spadku odpływu w korycie nie można w całości uznać za wodę zatrzymaną.',
    literature: 'Literatura i wytyczne',
    literatureIntro: 'Badania przegród pochodzą z naszego wcześniejszego przeglądu dotyczącego rowów. Wytyczne renaturyzacji dodają kontekst do kroku 5. Przy każdej pozycji wyjaśniamy jej znaczenie.',
    riverSources: 'Renaturyzacja rzek',
    ditchSources: 'Przegrody w rowach i czasowe magazynowanie',
    rrc: 'Warto wykorzystać historyczne koryta i wiedzę o procesach rzecznych. Nowe zakole wymaga analizy energii i transportu osadów dla konkretnego miejsca; sam kształt nie odtwarza procesów.',
    kprwp: 'Polski kontekst renaturyzacji. Program wskazuje potrzebę lokalnej analizy, m.in. ryzyka powodzi, wód podziemnych i obszarów chronionych, przed doborem działań.',
    muhawenimana: 'Monitoring przepuszczalnych przegród wykazał cofkę, wylewy i opóźniony odpływ zależne od konstrukcji i wezbrania. Uzasadnia wspólną ocenę magazynowania, opróżniania i wylewów; wyników objętości z Wielkiej Brytanii nie przypisujemy Krakowowi.',
    holden: 'Czteroletnie badanie torfowiska wykazało zmianę dróg odpływu i reakcji w czasie po zablokowaniu rowów. Mniejszy odpływ rowem nie oznacza trwałej retencji. Wyniki z torfu nie kalibrują gleb rolnych wokół Krakowa.',
    roberts: 'Obserwacje wielu obiektów czasowej retencji pokazują wpływ odpływu i zmiennych warunków glebowych na opróżnianie. Uzasadniają jawne założenia i pomiary wielu zdarzeń zamiast jednego procentu korzyści.',
    usace: 'Podstawa hydrauliczna osobnej analizy przegród: ciągłość przepływu, równanie Manninga i odpływ przez przelew. Wymagają lokalnych danych; prosty szacunek rowów i koncepcja meandrów nie są symulacjami HEC.',
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
  { group: 'ditch', key: 'usace', label: 'USACE · HEC-HMS / HEC-RAS', title: 'Reservoir Modeling Concepts and Equations', url: 'https://www.hec.usace.army.mil/confluence/hmsdocs/hmstrm/reservoir-modeling/reservoir-modeling-concepts-and-equations', extra: [
    ['Uniform Flow Computations', 'https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/stable-channel-design-functions/uniform-flow-computations'],
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
      <details class="more"><summary>${c.hydraulic}</summary><p>${c.hydraulicText}</p>
        <div class="method-equation">${c.balance}</div><p>${c.hydraulicLimit}</p></details>
    </article>
    <h4>${c.literature}</h4><p>${c.literatureIntro}</p>
    <h5>${c.riverSources}</h5>${sources('river')}
    <h5>${c.ditchSources}</h5>${sources('ditch')}
    <p class="fine">${c.checked}</p>
  </section>`;
}
