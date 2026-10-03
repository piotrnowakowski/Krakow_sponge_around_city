import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { applyStatic, getLang, setLang, fmt, t } from './i18n.js';
import { addLayers, bindPopups, createMap, DATA, OVERLAYS, setBasemap, setOverlay } from './map.js';
import { renderCatchmentsPanel, renderLayersPanel, renderLegend } from './panels.js';
import { fetchLiveGauges, fetchLiveWarnings, renderDroughtPanel } from './drought.js';

const state = Object.fromEntries(OVERLAYS.map((o) => [o.id, o.on]));
const ui = {
  layers: document.getElementById('panel-layers'),
  catchments: document.getElementById('panel-catchments'),
  drought: document.getElementById('panel-drought'),
  about: document.getElementById('panel-about'),
  legend: document.getElementById('legend'),
  loading: document.getElementById('loading'),
};
let app = { stats: null, drought: null, catchments: null, liveWarnings: null, focusStation: null };

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
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${name}`));
}

function renderAll(map) {
  applyStatic();
  document.querySelectorAll('.lang button').forEach((b) => b.classList.toggle('active', b.dataset.lang === getLang()));
  renderLayersPanel(ui.layers, map, state, () => renderLegend(ui.legend, state));
  renderLegend(ui.legend, state);
  renderCatchmentsPanel(ui.catchments, app.stats, {
    onZoom: (id) => {
      const f = app.catchments.features.find((x) => x.properties.id === id);
      map.fitBounds(bbox(f.geometry), { padding: 40 });
    },
  });
  renderDroughtPanel(ui.drought, app.drought, app.stats, { liveWarnings: app.liveWarnings, focusStation: app.focusStation });
  ui.about.innerHTML = `<div class="about">${t('about_html')}</div>`;
}

async function main() {
  setLang(getLang());
  applyStatic();
  const map = createMap('map');
  window.__map = map; // handy for debugging and demo scripts

  const [stats, drought, catchments] = await Promise.all([getJson('stats'), getJson('drought'), getJson('catchments')]);
  app = { ...app, stats, drought, catchments };
  const live = await fetchLiveGauges(Object.keys(drought.stations));

  map.on('load', async () => {
    await addLayers(map, gaugeFeatures(drought, live));
    for (const o of OVERLAYS) setOverlay(map, o, state[o.id]);
    bindPopups(map, {
      onGauge: (code) => {
        app.focusStation = code;
        renderDroughtPanel(ui.drought, app.drought, app.stats, { liveWarnings: app.liveWarnings, focusStation: code });
        switchTab('drought');
      },
    });
    map.fitBounds(bbox({ coordinates: catchments.features.map((f) => f.geometry.coordinates) }), { padding: 30, duration: 0 });
    map.once('idle', () => (ui.loading.hidden = true));
  });

  renderAll(map);
  fetchLiveWarnings().then((w) => {
    if (!w) return;
    app.liveWarnings = w;
    renderDroughtPanel(ui.drought, app.drought, app.stats, { liveWarnings: w, focusStation: app.focusStation });
  });

  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  document.querySelectorAll('.basemaps button').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.basemaps button').forEach((x) => x.classList.toggle('active', x === b));
      setBasemap(map, b.dataset.basemap);
    }),
  );
  document.querySelectorAll('.lang button').forEach((b) =>
    b.addEventListener('click', () => {
      setLang(b.dataset.lang);
      renderAll(map);
    }),
  );
}

main();
