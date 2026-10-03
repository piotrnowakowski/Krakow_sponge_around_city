// "Block the top N high-priority ditches": a per-catchment retention scenario.
// Volumes come from pipeline/retention.py (length x cross-section x fill factor, a heuristic).
import { t, fmt } from './i18n.js';

const SCENARIO_COLOR = '#22d3ee';
let retention = null;
let byCatchment = {};
const chosen = {}; // catchment id -> N
let mapRef = null;
let active = null; // catchment shown on the map

export async function loadRetention(dataUrl) {
  const [r, ditches] = await Promise.all([
    fetch(`${dataUrl}retention.json`).then((x) => x.json()),
    fetch(`${dataUrl}ditches.json`).then((x) => x.json()),
  ]);
  retention = r;
  byCatchment = {};
  for (const f of ditches.features) {
    const p = f.properties;
    if (p.priority !== 'high') continue;
    const xs = f.geometry.coordinates.map((c) => c[0]);
    const ys = f.geometry.coordinates.map((c) => c[1]);
    (byCatchment[p.catchment] ||= []).push({ ...p, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
  }
  for (const list of Object.values(byCatchment)) list.sort((a, b) => a.rank - b.rank);
}

export const getRetention = () => retention;

export function addScenarioLayer(map) {
  mapRef = map;
  const width = (extra) => ['interpolate', ['linear'], ['zoom'], 9, 5 + extra, 15, 10 + extra];
  const layer = (id, color, extra) => ({
    id, type: 'line', source: 'ditches', layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
    filter: ['==', ['get', 'rank'], -1],
    paint: { 'line-color': color, 'line-width': width(extra) },
  });
  map.addLayer(layer('ditches-scenario-casing', '#0b2545', 3), 'ditches-casing');
  map.addLayer(layer('ditches-scenario', SCENARIO_COLOR, 0), 'ditches-casing');
}

const SCENARIO_LAYERS = ['ditches-scenario-casing', 'ditches-scenario'];

function fitSelection(cid) {
  const top = byCatchment[cid].slice(0, chosen[cid]);
  if (!top.length) return;
  const b = top.reduce((a, p) => [Math.min(a[0], p.bbox[0]), Math.min(a[1], p.bbox[1]), Math.max(a[2], p.bbox[2]), Math.max(a[3], p.bbox[3])], [180, 90, -180, -90]);
  mapRef.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 60, maxZoom: 15, duration: 800 });
}

function showOnMap(cid) {
  if (!mapRef?.getLayer('ditches-scenario')) return;
  active = cid;
  const n = chosen[cid] ?? 0;
  const maxRank = n ? byCatchment[cid][n - 1].rank : 0;
  for (const id of SCENARIO_LAYERS) {
    mapRef.setFilter(id, ['all', ['==', ['get', 'catchment'], cid], ['<=', ['get', 'rank'], maxRank]]);
    mapRef.setLayoutProperty(id, 'visibility', n ? 'visible' : 'none');
  }
}

export function hideScenario() {
  active = null;
  if (mapRef?.getLayer('ditches-scenario')) for (const id of SCENARIO_LAYERS) mapRef.setLayoutProperty(id, 'visibility', 'none');
}

// Duration of Rudawa plant production that the volume corresponds to, as a range.
function plantEquivalent(volume) {
  const [lo, hi] = retention.reference.production_m3_day;
  const h1 = (volume / hi) * 24;
  const h2 = (volume / lo) * 24;
  if (h2 >= 48) return t('ret_days', { a: fmt(h1 / 24, 1), b: fmt(h2 / 24, 1) });
  if (h2 >= 2) return t('ret_hours', { a: fmt(h1, 0), b: fmt(h2, 0) });
  return t('ret_minutes', { a: fmt(h1 * 60, 0), b: fmt(h2 * 60, 0) });
}

function resultHtml(cid) {
  const list = byCatchment[cid] || [];
  const n = chosen[cid];
  const top = list.slice(0, n);
  const volume = top.reduce((a, p) => a + p.volume_m3, 0);
  const km = top.reduce((a, p) => a + p.length_m, 0) / 1000;
  return `
    <div class="ret-result">
      <b>≈ ${fmt(volume, 0)} m³</b>
      <span>${t('ret_per_fill', { km: fmt(km, 1) })}</span>
    </div>
    <p class="ret-compare">${n ? t('ret_compare', { dur: plantEquivalent(volume) }) : t('ret_zero')}</p>`;
}

export function scenarioHtml(cid) {
  const list = byCatchment[cid] || [];
  if (!retention || !list.length) return '';
  chosen[cid] ??= list.length;
  const a = retention.assumptions;
  return `
    <section class="scenario" data-scenario="${cid}">
      <h4>${t('ret_title')}</h4>
      <label class="ret-slider">
        <span>${t('ret_slider', { n: `<output>${chosen[cid]}</output>`, of: list.length })}</span>
        <input type="range" min="0" max="${list.length}" step="1" value="${chosen[cid]}" aria-label="${t('ret_slider_aria', { of: list.length })}" />
      </label>
      <div class="ret-out" aria-live="polite">${resultHtml(cid)}</div>
      <button type="button" class="btn small" data-ret-map>${t(active === cid ? 'ret_hide_map' : 'ret_show_map')}</button>
      <details class="more">
        <summary>${t('ret_how')}</summary>
        <p class="fine">${t('ret_assumptions', { cs: fmt(a.cross_section_m2, 1), ff: fmt(a.fill_factor, 1), per_m: fmt(a.cross_section_m2 * a.fill_factor, 1) })}</p>
        <p class="fine">${t('ret_recharge')}</p>
        <p class="fine">${t('ret_source')} <a href="${retention.reference.url}" target="_blank" rel="noopener">${retention.reference.source}</a>.</p>
      </details>
    </section>`;
}

export function bindScenario(root) {
  const sync = () =>
    root.querySelectorAll('[data-scenario]').forEach((el) => {
      el.querySelector('[data-ret-map]').textContent = t(active === el.dataset.scenario ? 'ret_hide_map' : 'ret_show_map');
    });
  root.querySelectorAll('[data-scenario]').forEach((el) => {
    const cid = el.dataset.scenario;
    const input = el.querySelector('input[type=range]');
    const button = el.querySelector('[data-ret-map]');
    input.addEventListener('input', () => {
      chosen[cid] = Number(input.value);
      el.querySelector('output').textContent = input.value;
      el.querySelector('.ret-out').innerHTML = resultHtml(cid);
      showOnMap(cid);
      sync();
    });
    button.addEventListener('click', () => {
      if (active === cid) hideScenario();
      else {
        showOnMap(cid);
        fitSelection(cid);
      }
      sync();
    });
  });
}
