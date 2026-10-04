import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import './explore.css';
import { applyStatic, getLang, setLang, fmt, t } from './i18n.js';
import { addLayers, bindPopups, createMap, createCatchmentFocus, DATA, OVERLAYS, setBasemap } from './map.js';
import { renderCatchmentsPanel, renderLayersPanel, renderLegend } from './panels.js';
import { fetchLiveGauges, fetchLiveWarnings } from './gauges.js';
import { applyView, createViewState, selectView } from './views.js';
import { addReportLayers, initReports, openForm, refreshReportLayer, renderReportsPanel, startPicking } from './reports.js';
import { addScenarioLayer, getRetention, loadRetention, hideScenario } from './scenario.js';
import { initTour, refreshTour, startTour, closeTour } from './tour.js';
import { initMobile } from './mobile.js';
import { addMeanderLayers, applyCorridorOptions, defaultProposal, fitMeander, hideMeanders, loadMeanders, selectedProposal } from './meanders.js';
import { methodsHtml, methodsTitle } from './methods.js';
import { bindBarrierUI } from './ditch-barriers.js';
import { fetchJson, escapeHtml } from './ui.js';
import { visibleDatasets, loadDataset } from './datasets.js';

const state = createViewState();
const PANEL_NAMES = ['layers', 'catchments', 'drought', 'reports', 'about'];
const ui = Object.fromEntries(PANEL_NAMES.map((id) => [id, document.getElementById(`panel-${id}`)]));
ui.legend = document.getElementById('legend'); ui.loading = document.getElementById('loading');
const dataStatus = document.createElement('section'); dataStatus.id = 'data-status'; dataStatus.hidden = true;
dataStatus.tabIndex = 0; dataStatus.setAttribute('aria-label', 'Map data'); document.querySelector('.tabs').after(dataStatus);
const app = { stats: null, drought: null, catchments: null, liveWarnings: null, live: {}, droughtStatus: 'idle', selection: {} };
let focusedId = null, layersReady = false, barrierUI, featureUI, activeTab = 'layers', droughtPromise, droughtModule;
let tourReady = false;
const map = createMap('map'), focusView = createCatchmentFocus(map);
let styleReady = false;
map.on('style.load', () => { styleReady = true; });
window.__map = map;

function bbox(geometry) {
  const points = []; const walk = (c) => typeof c[0] === 'number' ? points.push(c) : c.forEach(walk);
  walk(geometry.coordinates);
  return [[Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))],
    [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))]];
}
function switchTab(name) {
  activeTab = name;
  document.body.dataset.panel = name;
  document.querySelectorAll('.tabs button').forEach((b) => {
    const selected = b.dataset.tab === name;
    b.classList.toggle('active', selected); b.setAttribute('aria-selected', String(selected)); b.tabIndex = selected ? 0 : -1;
  });
  document.querySelectorAll('.panel').forEach((p) => { p.classList.toggle('active', p.id === `panel-${name}`); p.hidden = p.id !== `panel-${name}`; });
  if (name === 'drought') { loadDrought(); renderDrought(); }
  document.dispatchEvent(new CustomEvent('app:tab-change', { detail: name }));
  map.resize();
}
function syncMode() {
  document.body.dataset.mode = state.mode;
  document.querySelectorAll('button[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
  document.querySelectorAll('.basemaps button').forEach((b) => {
    b.classList.toggle('active', b.dataset.basemap === state.basemap);
    b.setAttribute('aria-pressed', String(b.dataset.basemap === state.basemap));
  });
  map.resize();
}
function changeMode(mode) {
  if (!layersReady) return;
  if (!document.getElementById('tour').hidden) closeTour();
  hideScenario();
  barrierUI?.clear(false); featureUI?.clear(false);
  if (focusedId) { focusView.clear(); focusedId = null; document.body.classList.remove('catchment-focused'); }
  state.mode = mode;
  applyView(map, state);
  setBasemap(map, mode === 'explore' ? state.basemap : 'light');
  switchTab('layers'); syncMode(); renderAll();
  document.dispatchEvent(new Event('app:mode-change'));
}
function navigate(name) {
  if (name !== activeTab) { barrierUI?.clear(false); featureUI?.clear(false); }
  if (focusedId && name !== 'catchments') showCatchment(null);
  switchTab(name);
}
function showCatchment(id) {
  if (!layersReady) return;
  barrierUI?.clear(false); featureUI?.clear(false); focusedId = id;
  document.body.classList.toggle('catchment-focused', Boolean(id));
  if (id) { hideMeanders(map); focusView.select(app.catchments.features.find((f) => f.properties.id === id)); } else focusView.clear();
  renderAll(); ui.catchments.scrollTop = 0; map.resize();
  const geometry = id ? app.catchments.features.find((f) => f.properties.id === id).geometry
    : { coordinates: app.catchments.features.map((f) => f.geometry.coordinates) };
  map.fitBounds(bbox(geometry), { padding: { top: id ? 110 : 65, bottom: 35, left: 25, right: 45 }, duration: 500 });
}

const STATION_COORDS = { 150190310: [19.8067, 50.0931], 150190330: [19.8325, 50.1947] };
function gaugeRows() {
  return Object.values(app.drought?.stations ?? {}).map((s) => {
    const live = app.live[s.code], q = live?.q ?? s.current.q, date = live?.date ?? s.current.date;
    const timestamp = Date.parse(String(date).replace(' ', 'T'));
    const source = live ? (Number.isFinite(timestamp) && Date.now() - timestamp < 86400000 ? 'gauge_live' : 'gauge_stale') : 'gauge_snapshot';
    return { ...s, q, date, source };
  });
}
function updateGauges() {
  if (!layersReady) return;
  map.getSource('gauges').setData({ type: 'FeatureCollection', features: gaugeRows().filter((s) => s.q != null).map((s) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: STATION_COORDS[s.code] },
    properties: { code: s.code, below_snq: s.q < s.thresholds.SNQ, label: `${s.river} · ${fmt(s.q, 2)} m³/s · ${t(s.source)} · ${s.date ?? ''}` },
  })) });
  renderDataStatus();
}
async function loadDrought(retry = false) {
  if (droughtPromise || (app.droughtStatus === 'ready' && !retry) || (app.droughtStatus === 'error' && !retry)) return droughtPromise;
  app.droughtStatus = 'loading'; renderDrought(); renderDataStatus();
  droughtPromise = fetchJson(`${DATA}drought.json`).then((data) => {
    if (!data.stations || !data.climate) throw Error('Incomplete drought dataset');
    app.drought = data; app.droughtStatus = 'ready'; updateGauges(); renderAbout(); renderDrought(); initializeTour();
    fetchLiveGauges(Object.keys(data.stations)).then((live) => { app.live = live; updateGauges(); });
    fetchLiveWarnings().then((warnings) => { app.liveWarnings = warnings; renderDrought(); });
  }).catch(() => { app.droughtStatus = 'error'; renderDrought(); renderDataStatus(); })
    .finally(() => { droughtPromise = null; });
  return droughtPromise;
}
async function renderDrought() {
  if (app.droughtStatus !== 'ready') {
    ui.drought.innerHTML = `<p role="status">${t(app.droughtStatus === 'error' ? 'data_error' : 'data_loading')}</p>`
      + (app.droughtStatus === 'error' ? `<button class="btn" data-retry-drought>${t('retry')}</button>` : '');
    ui.drought.querySelector('[data-retry-drought]')?.addEventListener('click', () => loadDrought(true));
    return;
  }
  if (activeTab !== 'drought') return;
  const scroll = ui.drought.scrollTop;
  droughtModule ??= import('./drought.js');
  try {
    const { renderDroughtPanel } = await droughtModule;
    if (activeTab !== 'drought' || app.droughtStatus !== 'ready') return;
    renderDroughtPanel(ui.drought, app.drought, app.stats, { liveWarnings: app.liveWarnings, selection: app.selection });
    ui.drought.scrollTop = scroll;
  } catch {
    droughtModule = null; ui.drought.innerHTML = `<p role="alert">${t('data_error')}</p><button class="btn">${t('retry')}</button>`;
    ui.drought.querySelector('button').onclick = renderDrought;
  }
}
function renderAbout() {
  if (!app.stats) return;
  const diffs = Object.values(app.stats).map((s) => s.validation.area_diff_pct);
  const proposal = (selectedProposal(state) || defaultProposal())?.properties;
  ui.about.innerHTML = `<div class="about"><button class="btn" data-open-methods>${methodsTitle()}</button>${t('about_html')}<h3>${t('data_ready')}</h3>
    <p>${t('about_range', { min: fmt(Math.min(...diffs)), max: fmt(Math.max(...diffs)) })}</p>
    <p>${t('about_pond')}</p>${Object.values(app.drought?.stations ?? {}).map((s) => `<p>${escapeHtml(t('about_rank', { river: s.river, rank: s.rank_driest_since_1991, window: s.year_window }))}</p>`).join('')}${methodsHtml(proposal, getRetention())}</div>`;
}
function renderDataStatus() {
  const el = document.getElementById('data-status'); if (!el || !layersReady) return;
  const entries = visibleDatasets(map).filter(([, e]) => e.status !== 'ready' || !e.data?.features.length);
  const overlayName = (name) => OVERLAYS.find((o) => o.layers.some((id) => map.getLayer(id)?.source === name))?.id;
  el.innerHTML = entries.map(([name, entry]) => `<div role="status"><span>${escapeHtml(t(entry.status === 'error' ? 'layer_error' : entry.status === 'ready' ? 'layer_empty' : 'layer_loading', { name: t(`lyr_${overlayName(name)}`) }))}</span>
    ${entry.status === 'error' ? `<button data-retry-source="${name}">${t('retry')}</button>` : ''}</div>`).join('');
  el.hidden = entries.length === 0;
  el.querySelectorAll('[data-retry-source]').forEach((b) => b.onclick = () => loadDataset(map, b.dataset.retrySource, true));
  const gauges = document.getElementById('gauge-status');
  if (gauges) {
    gauges.hidden = !state.gauges;
    gauges.innerHTML = app.droughtStatus !== 'ready' ? `<p role="status">${t(app.droughtStatus === 'error' ? 'data_error' : 'data_loading')}</p>${app.droughtStatus === 'error' ? `<button data-gauge-retry>${t('retry')}</button>` : ''}`
      : `<h3>${t('gauge_status')}</h3>${gaugeRows().map((s) => `<p><strong>${escapeHtml(s.river)}</strong> · ${t(s.source)}<br>${escapeHtml(s.date ?? t('gauge_unavailable'))} · ${s.q == null ? t('gauge_unavailable') : `${fmt(s.q, 2)} m³/s`}</p>`).join('')}`;
    gauges.querySelector('[data-gauge-retry]')?.addEventListener('click', () => loadDrought(true));
  }
}
function viewChanged() {
  syncMode();
  renderLegend(ui.legend, state); renderDataStatus(); barrierUI?.renderList(); featureUI?.clear(false);
  if (state.mode === 'analyse' && state.gauges) loadDrought();
}
function renderAll() {
  const positions = Object.fromEntries(PANEL_NAMES.map((key) => [key, ui[key].scrollTop]));
  applyStatic();
  syncMode();
  dataStatus.setAttribute('aria-label', t('data_status'));
  document.querySelectorAll('.lang button').forEach((b) => { b.classList.toggle('active', b.dataset.lang === getLang()); b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())); });
  renderLayersPanel(ui.layers, map, state, viewChanged); renderLegend(ui.legend, state);
  ui.legend.hidden = Boolean(focusedId) || ui.legend.hidden;
  const bar = document.getElementById('focus-bar'); bar.hidden = !focusedId;
  if (focusedId) {
    const s = app.stats[focusedId]; bar.style.setProperty('--accent', s.color);
    bar.innerHTML = `<div><strong>${escapeHtml(s.name)}</strong><span>${t('focus_key')}</span></div><button>${t('focus_back')}</button>`;
    bar.querySelector('button').onclick = () => showCatchment(null);
  }
  if (app.stats) { renderCatchmentsPanel(ui.catchments, app.stats, { selected: focusedId, onZoom: showCatchment }); renderAbout(); }
  if (layersReady) { renderReportsPanel(ui.reports); refreshReportLayer(); }
  renderDrought(); barrierUI?.refresh(); featureUI?.refresh(); renderDataStatus(); updateGauges();
  for (const [key, scroll] of Object.entries(positions)) ui[key].scrollTop = scroll;
}

document.querySelectorAll('.tabs button').forEach((b, index, buttons) => {
  b.id = `tab-${b.dataset.tab}`; b.setAttribute('aria-controls', `panel-${b.dataset.tab}`);
  const panel = document.getElementById(`panel-${b.dataset.tab}`); panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', b.id); panel.tabIndex = 0;
  b.onclick = () => navigate(b.dataset.tab);
  b.onkeydown = (e) => {
    const next = { ArrowRight: (index + 1) % buttons.length, ArrowLeft: (index + buttons.length - 1) % buttons.length, Home: 0, End: buttons.length - 1 }[e.key];
    if (next === undefined) return; e.preventDefault(); buttons[next].focus(); navigate(buttons[next].dataset.tab);
  };
});
document.querySelectorAll('.basemaps button').forEach((b) => b.onclick = () => {
  if (!layersReady) return;
  document.querySelectorAll('.basemaps button').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
  state.basemap = b.dataset.basemap;
  setBasemap(map, state.basemap);
});
document.querySelectorAll('button[data-mode]').forEach((b) => b.onclick = () => changeMode(b.dataset.mode));
document.querySelectorAll('.lang button').forEach((b) => b.onclick = () => { setLang(b.dataset.lang); renderAll(); refreshTour(); document.dispatchEvent(new Event('app:language-change')); });
map.on('datasetstatus', () => { renderDataStatus(); barrierUI?.renderList(); });
let raster = 'light', rasterTimer, rasterFailed = false, rasterContent = false;
const readyRasters = new Set();
const rasterStatus = document.createElement('div'); rasterStatus.className = 'raster-status'; rasterStatus.hidden = true; rasterStatus.setAttribute('role', 'status');
document.querySelector('.map-wrap').append(rasterStatus);
function showRasterStatus(failed = false) {
  rasterStatus.hidden = raster === 'light';
  rasterStatus.innerHTML = `${t(failed ? 'raster_error' : 'raster_loading')}${failed ? `<button>${t('retry')}</button>` : ''}`;
  rasterStatus.querySelector('button')?.addEventListener('click', () => {
    const source = map.getSource(raster); const tiles = source.serialize().tiles;
    readyRasters.delete(raster);
    source.setTiles(tiles); map.fire('basemapchange', { which: raster });
  });
}
map.on('basemapchange', ({ which }) => {
  raster = which; rasterFailed = false;
  rasterContent = which !== 'light' && readyRasters.has(which) && map.isSourceLoaded(which);
  clearTimeout(rasterTimer); showRasterStatus();
  if (rasterContent) rasterStatus.hidden = true;
  // A slow response can still recover. Only a source error marks tiles as failed.
  else if (which !== 'light') rasterTimer = setTimeout(() => showRasterStatus(true), 12000);
});
map.on('sourcedata', ({ sourceId, sourceDataType, tile }) => {
  if (sourceId !== raster) return;
  // Raster tile completion events have a tile but no sourceDataType. The
  // source's content event can already have fired while this basemap was hidden.
  if (sourceDataType === 'content' || tile?.state === 'loaded') rasterContent = true;
  if (rasterContent && map.isSourceLoaded(raster) && !rasterFailed) {
    readyRasters.add(raster); clearTimeout(rasterTimer); rasterStatus.hidden = true;
  }
});
map.on('error', ({ sourceId }) => {
  readyRasters.delete(sourceId);
  if (sourceId === raster) { rasterFailed = true; clearTimeout(rasterTimer); showRasterStatus(true); }
});
function waitForMap() {
  if (styleReady || map.isStyleLoaded()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // App layers can be added once the style is parsed; background tiles may load later.
    const done = () => { clearTimeout(timer); map.off('style.load', done); resolve(); };
    const timer = setTimeout(() => { map.off('style.load', done); reject(Error('Map timeout')); }, 12000);
    map.on('style.load', done);
  });
}

function showMethods() {
  if (focusedId) showCatchment(null);
  renderAbout(); navigate('about');
  const heading = document.getElementById('calculation-literature');
  heading?.scrollIntoView({ block: 'start' }); heading?.focus({ preventScroll: true });
}
function setBackground(which) {
  if (state.mode === 'explore') state.basemap = which;
  document.getElementById('mobile-basemap').value = which;
  setBasemap(map, which); syncMode();
}
function initializeTour() {
  if (tourReady || !layersReady || !app.drought) return;
  tourReady = true;
  initTour({ stats: app.stats, drought: app.drought, onMethods: showMethods,
    show: ({ tab, view, fit, center, zoom, basemap, meander = false }) => {
      if (focusedId) showCatchment(null);
      barrierUI.clear(false); featureUI.clear(false);
      if (view) {
        state.corridorsFree = meander; state.meanderId = meander ? defaultProposal()?.properties.id : null;
        selectView(map, state, view); applyCorridorOptions(map, state); renderAll();
      }
      if (basemap) setBackground(basemap);
      if (tab) navigate(tab);
      if (fit === 'all') map.fitBounds(bbox({ coordinates: app.catchments.features.map(f => f.geometry.coordinates) }), { padding: 40, duration: 900 });
      if (center) map.flyTo({ center, zoom, duration: 1400 });
      if (meander) fitMeander(map, state, true);
    },
  });
}
async function beginStory() {
  await loadDrought(true);
  if (app.droughtStatus === 'ready') { initializeTour(); startTour(); }
  else navigate('drought');
}
function initializeWorkspaceTools() {
  initReports({ map, catchments: app.catchments, switchTab: navigate, onChange: () => renderReportsPanel(ui.reports) });
  for (const panel of [ui.layers, ui.about]) panel.addEventListener('click', e => { if (e.target.closest('[data-open-methods]')) showMethods(); });
  document.getElementById('tour-btn').onclick = beginStory;
  initMobile({ map, switchTab: navigate, startReport: startPicking, startTour: beginStory,
    setBasemap: setBackground, getView: () => state.view,
    onMenuOpen: () => { barrierUI.clear(false); featureUI.clear(false); },
    selectTopic: topic => {
      if (focusedId) showCatchment(null);
      barrierUI.clear(false); featureUI.clear(false);
      selectView(map, state, { rivers: 'rivers', retention: 'barriers', drought: 'monitoring' }[topic]);
      renderAll(); navigate(topic === 'drought' ? 'drought' : 'layers');
    },
  });
  document.addEventListener('app:view-change', () => {
    if (document.body.dataset.mode !== state.mode) setBasemap(map, 'light');
    hideScenario(); syncMode();
  });
  document.addEventListener('app:report-pick', () => { if (!document.getElementById('tour').hidden) closeTour(); barrierUI.clear(false); featureUI.clear(false); document.getElementById('tour-invite').hidden = true; });
  loadRetention(DATA).then(() => renderAll()).catch(() => {});
  loadMeanders(DATA, map).then(() => renderAll());
}
async function start() {
  ui.loading.hidden = false; ui.loading.textContent = t('data_loading');
  try {
    const [stats, catchments] = await Promise.all([fetchJson(`${DATA}stats.json`), fetchJson(`${DATA}catchments.json`), waitForMap()]);
    if (!catchments.features?.length || !Object.keys(stats).length) throw Error('Incomplete core data');
    app.stats = stats; app.catchments = catchments;
    if (!layersReady) {
      await addLayers(map, { type: 'FeatureCollection', features: [] });
      addScenarioLayer(map); addReportLayers(map); addMeanderLayers(map);
      layersReady = true; applyView(map, state);
      barrierUI = bindBarrierUI(map, { state, stats, onMethods: showMethods, onSelect: () => { featureUI?.clear(false); navigate('layers'); } });
      featureUI = bindPopups(map, { onSelect: () => barrierUI.clear(false), onMethods: showMethods,
        onReport: lngLat => openForm({ lng: lngLat.lng, lat: lngLat.lat, type: 'ditch' }),
        onGauge: (code) => { app.selection.station = code; navigate('drought'); } });
      initializeWorkspaceTools();
      map.fitBounds(bbox({ coordinates: catchments.features.map((f) => f.geometry.coordinates) }), { padding: 30, duration: 0 });
    }
    renderAll();
    map.fitBounds(bbox({ coordinates: catchments.features.map((f) => f.geometry.coordinates) }),
      { padding: { top: 90, bottom: 155, left: 25, right: 45 }, duration: 0 });
    ui.loading.hidden = true; barrierUI.openShared();
  } catch {
    ui.loading.innerHTML = `<div role="alert"><p>${t('core_error')}</p><button class="btn">${t('retry')}</button></div>`;
    ui.loading.querySelector('button').onclick = () => { if (!styleReady && !map.isStyleLoaded()) map.setStyle('https://tiles.openfreemap.org/styles/positron'); start(); };
  }
}
setLang(getLang()); applyStatic(); switchTab('layers'); start();
