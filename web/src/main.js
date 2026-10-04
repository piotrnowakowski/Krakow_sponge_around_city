import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { applyStatic, getLang, setLang, fmt, t } from './i18n.js';
import { addLayers, bindPopups, createMap, createCatchmentFocus, DATA, OVERLAYS, setBasemap, setOverlay } from './map.js';
import { renderCatchmentsPanel, renderLayersPanel, renderLegend } from './panels.js';
import { fetchLiveGauges, fetchLiveWarnings, renderDroughtPanel } from './drought.js';
import { addReportLayers, initReports, openForm, refreshReportLayer, renderReportsPanel } from './reports.js';
import { addScenarioLayer, getRetention, loadRetention } from './scenario.js';
import { initTour, refreshTour } from './tour.js';
import { addMeanderLayers, applyCorridorOptions, defaultProposal, fitMeander, hideMeanders, loadMeanders, selectedProposal } from './meanders.js';
import { methodsHtml, methodsTitle } from './methods.js';

const state = createViewState();
import { applyView, createViewState, selectView } from './views.js';

const ui = {
  layers: document.getElementById('panel-layers'),
  catchments: document.getElementById('panel-catchments'),
  drought: document.getElementById('panel-drought'),
  reports: document.getElementById('panel-reports'),
  about: document.getElementById('panel-about'),
  legend: document.getElementById('legend'),
  loading: document.getElementById('loading'),
};
let app = { stats: null, drought: null, catchments: null, liveWarnings: null, focusStation: null };
let focusView;
let focusedId = null;
let layersReady = false;

function showCatchment(map, id) {
  if (!layersReady) return;
  focusedId = id;
  document.body.classList.toggle('catchment-focused', Boolean(id));
  document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
  if (id) {
    hideMeanders(map);
    focusView.select(app.catchments.features.find((f) => f.properties.id === id));
  }
  else focusView.clear();
  renderAll(map);
  ui.catchments.scrollTop = 0;
  map.resize();
  const geometry = id ? app.catchments.features.find((f) => f.properties.id === id).geometry
    : { coordinates: app.catchments.features.map((f) => f.geometry.coordinates) };
  map.fitBounds(bbox(geometry), { padding: { top: id ? 110 : 65, bottom: 35, left: 25, right: 45 }, duration: 650 });
}

const getJson = (name) => fetch(`${DATA}${name}.json`).then((r) => r.json());

function gaugeFeatures(drought, live) {
  return {
    type: 'FeatureCollection',
    features: Object.values(drought.stations).map((s) => {
      const q = live[s.code]?.q ?? s.current.q;
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: STATION_COORDS[s.code] },
        properties: { code: s.code, below_snq: q < s.thresholds.SNQ, label: `${s.river} · ${fmt(q, 2)} m³/s` },
      };
    }),
  };
}

// Gauge positions from the IMGW station register.
const STATION_COORDS = {
  150190310: [19.8067, 50.0931],
  150190330: [19.8325, 50.1947],
};

function bbox(geometry) {
  const xs = [];
  const ys = [];
  const walk = (c) => (typeof c[0] === 'number' ? (xs.push(c[0]), ys.push(c[1])) : c.forEach(walk));
  walk(geometry.coordinates);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

function switchTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${name}`));
}

function setBasemapButton(map, which) {
  document.querySelectorAll('.basemaps button').forEach((x) => {
    x.classList.toggle('active', x.dataset.basemap === which);
    x.setAttribute('aria-pressed', String(x.dataset.basemap === which));
  });
  if (map.getLayer('ortho')) setBasemap(map, which);
}

function renderAbout() {
  const proposal = (selectedProposal(state) || defaultProposal())?.properties;
  ui.about.innerHTML = `<div class="about"><button type="button" class="btn" data-open-methods>${methodsTitle()}</button>
    ${t('about_html')}${methodsHtml(proposal, getRetention())}</div>`;
}

function showMethods(map) {
  if (focusedId) showCatchment(map, null);
  renderAbout();
  switchTab('about');
  const heading = document.getElementById('calculation-literature');
  heading.scrollIntoView({ block: 'start' });
  heading.focus({ preventScroll: true });
}

function renderAll(map) {
  if (layersReady && !focusedId) applyCorridorOptions(map, state);
  applyStatic();
  document.querySelectorAll('.lang button').forEach((b) => {
    b.classList.toggle('active', b.dataset.lang === getLang());
    b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  });
  renderLayersPanel(ui.layers, map, state, () => renderLegend(ui.legend, state));
  renderLegend(ui.legend, state);
  ui.legend.hidden = Boolean(focusedId) || ui.legend.hidden;
  const focusBar = document.getElementById('focus-bar');
  focusBar.hidden = !focusedId;
  if (focusedId) {
    const s = app.stats[focusedId];
    focusBar.style.setProperty('--accent', s.color);
    focusBar.innerHTML = `<div><strong>${s.name}</strong><span>${t('focus_key')}</span></div><button type="button">${t('focus_back')}</button>`;
    focusBar.querySelector('button').onclick = () => showCatchment(map, null);
  }
  renderCatchmentsPanel(ui.catchments, app.stats, {
    selected: focusedId,
    onZoom: (id) => showCatchment(map, id),
  });
  renderDroughtPanel(ui.drought, app.drought, app.stats, { liveWarnings: app.liveWarnings, focusStation: app.focusStation });
  renderReportsPanel(ui.reports);
  if (layersReady) refreshReportLayer();
  renderAbout();
}

async function main() {
  setLang(getLang());
  applyStatic();
  const map = createMap('map');
  focusView = createCatchmentFocus(map);
  window.__map = map; // handy for debugging and demo scripts

  const [stats, drought, catchments] = await Promise.all([getJson('stats'), getJson('drought'), getJson('catchments'), loadRetention(DATA), loadMeanders(DATA)]);
  app = { ...app, stats, drought, catchments };
  const live = await fetchLiveGauges(Object.keys(drought.stations));

  const initializeLayers = async () => {
    await addLayers(map, gaugeFeatures(drought, live));
    addScenarioLayer(map);
    addReportLayers(map);
    addMeanderLayers(map);
    applyView(map, state);
    layersReady = true;
    bindPopups(map, {
      onReport: (lngLat) => openForm({ lng: lngLat.lng, lat: lngLat.lat, type: 'ditch' }),
      onGauge: (code) => {
        app.focusStation = code;
        renderDroughtPanel(ui.drought, app.drought, app.stats, { liveWarnings: app.liveWarnings, focusStation: code });
        switchTab('drought');
      },
    });
    map.fitBounds(bbox({ coordinates: catchments.features.map((f) => f.geometry.coordinates) }), { padding: 30, duration: 0 });
    map.once('idle', () => (ui.loading.hidden = true));
    // On phones, start with the attribution collapsed to its (i) button.
    if (matchMedia('(max-width: 820px)').matches) {
      document.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
    }
  };
  if (map.isStyleLoaded()) await initializeLayers();
  else map.once('load', initializeLayers);

  initReports({ map, catchments, switchTab, onChange: () => renderReportsPanel(ui.reports) });
  renderAll(map);
  for (const panel of [ui.layers, ui.about]) panel.addEventListener('click', (event) => {
    if (event.target.closest('[data-open-methods]')) showMethods(map);
  });
  fetchLiveWarnings().then((w) => {
    if (!w) return;
    app.liveWarnings = w;
    renderDroughtPanel(ui.drought, app.drought, app.stats, { liveWarnings: w, focusStation: app.focusStation });
  });

  const tabs = [...document.querySelectorAll('.tabs button')];
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => {
      if (focusedId && b.dataset.tab !== 'catchments') showCatchment(map, null);
      if (b.dataset.tab === 'about') renderAbout();
      switchTab(b.dataset.tab);
    });
    // Arrow keys move between tabs (WAI-ARIA tabs pattern).
    b.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      const next = tabs[(i + d + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  });
  switchTab('layers');
  setBasemapButton(map, 'light');
  document.querySelectorAll('.basemaps button').forEach((b) =>
    b.addEventListener('click', () => setBasemapButton(map, b.dataset.basemap)),
  );
  document.querySelectorAll('.lang button').forEach((b) =>
    b.addEventListener('click', () => {
      setLang(b.dataset.lang);
      renderAll(map);
      refreshTour();
    }),
  );

  const allBounds = bbox({ coordinates: catchments.features.map((f) => f.geometry.coordinates) });
  initTour({
    stats,
    drought,
    onMethods: () => showMethods(map),
    show: ({ tab, view, fit, center, zoom, basemap, meander = false }) => {
      if (!layersReady) return;
      if (focusedId) showCatchment(map, null);
      document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
      if (view) {
        state.corridorsFree = meander;
        state.meanderId = meander ? defaultProposal()?.properties.id : null;
        selectView(map, state, view);
        applyCorridorOptions(map, state);
        renderLayersPanel(ui.layers, map, state, () => renderLegend(ui.legend, state));
        renderLegend(ui.legend, state);
      }
      if (basemap) setBasemapButton(map, basemap);
      if (tab) switchTab(tab);
      if (fit === 'all') map.fitBounds(allBounds, { padding: 40, duration: 900 });
      if (center) map.flyTo({ center, zoom, duration: 1400 });
      if (meander) fitMeander(map, state, true);
    },
  });
}

main();
