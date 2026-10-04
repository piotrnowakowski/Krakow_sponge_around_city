import { t, fmt } from './i18n.js';
import { methodsTitle } from './methods.js';

let data = { type: 'FeatureCollection', features: [] };
let loadFailed = false;
const LAYERS = ['meander-envelope', 'meander-current', 'meander-proposal-casing', 'meander-proposal'];
const names = { rudawa: 'Rudawa', pradnik: 'Prądnik', dlubnia: 'Dłubnia' };

export async function loadMeanders(url, map) {
  try {
    const response = await fetch(`${url}meanders.json`);
    if (!response.ok) throw new Error('Meander data unavailable');
    const loaded = await response.json();
    if (!Array.isArray(loaded.features)) throw new Error('Invalid meander data');
    data = loaded;
    map?.getSource('meanders')?.setData(data);
  } catch {
    loadFailed = true;
  }
}

export const proposals = () => data.features.filter((f) => f.properties.kind === 'proposal')
  .sort((a, b) => a.properties.current_sinuosity - b.properties.current_sinuosity || b.properties.current_m - a.properties.current_m);
export const defaultProposal = () => proposals()[0];
export const meanderEmptyMessage = () => t(loadFailed ? 'meander_unavailable' : 'meander_empty');
export const selectedProposal = (state) => proposals().find((f) => f.properties.id === state.meanderId);

export function addMeanderLayers(map) {
  map.addSource('meanders', { type: 'geojson', data });
  map.addLayer({ id: LAYERS[0], source: 'meanders', type: 'fill', layout: { visibility: 'none' },
    paint: { 'fill-color': '#059669', 'fill-opacity': 0.12 } }, 'corridors');
  for (const [id, color, width, dash] of [
    [LAYERS[1], '#175b91', 3, [3, 2]],
    [LAYERS[2], '#ffffff', 8],
    [LAYERS[3], '#a21caf', 4],
  ]) map.addLayer({ id, source: 'meanders', type: 'line', layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': color, 'line-width': width, ...(dash ? { 'line-dasharray': dash } : {}) } });
  const key = document.createElement('div');
  key.id = 'meander-key';
  key.className = 'meander-key';
  key.hidden = true;
  map.getContainer().parentElement.append(key);
}

export function applyCorridorOptions(map, state) {
  if (!map.getLayer('corridors')) return;
  const explore = state.mode === 'explore';
  const active = !explore && state.corridors;
  const free = active && state.corridorsFree;
  const selected = active && selectedProposal(state);
  map.setFilter('corridors', free ? ['==', ['get', 'room_class'], 'open'] : null);
  // In free-only mode the thematic river lines must not repaint excluded reaches.
  for (const id of ['rivers', 'rivers-main', 'rivers-label'])
    map.setLayoutProperty(id, 'visibility', explore ? (id === 'rivers-label' ? 'none' : 'visible') : state.rivers && !free && !selected && !(active && id === 'rivers-main') ? 'visible' : 'none');
  map.setPaintProperty('corridors', 'line-opacity', selected ? 0.18 : 0.78);
  for (const id of LAYERS) {
    if (!map.getLayer(id)) continue;
    const kind = id === LAYERS[0] ? 'envelope' : id === LAYERS[1] ? 'current' : 'proposal';
    map.setFilter(id, ['all', ['==', ['get', 'id'], selected ? state.meanderId : ''], ['==', ['get', 'kind'], kind]]);
    map.setLayoutProperty(id, 'visibility', selected ? 'visible' : 'none');
  }
  const key = document.getElementById('meander-key');
  if (key) {
    key.hidden = !selected;
    key.innerHTML = `<b>${t('meander_concept')}</b><span class="meander-old">${t('meander_current')}</span><span class="meander-new">${t('meander_proposed')}</span><span class="meander-area">${t('meander_area')}</span>`;
  }
}

export function hideMeanders(map) {
  for (const id of LAYERS) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
  const key = document.getElementById('meander-key');
  if (key) key.hidden = true;
}

export function fitMeander(map, state, story = false) {
  const feature = selectedProposal(state);
  if (!feature) return;
  const coordinates = feature.geometry.coordinates;
  const xs = coordinates.map((c) => c[0]);
  const ys = coordinates.map((c) => c[1]);
  const mobile = matchMedia('(max-width: 820px)').matches;
  map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], {
    padding: { top: 95, bottom: 60, left: story && !mobile ? 410 : 45, right: 55 },
    maxZoom: 16, duration: 900,
  });
}

export function corridorOptionsHtml(state) {
  const list = proposals();
  const p = selectedProposal(state)?.properties;
  return `<section class="meander-controls" aria-labelledby="meander-heading">
    <label class="free-toggle"><input type="checkbox" data-free-corridors ${state.corridorsFree ? 'checked' : ''}> ${t('corridor_only_free')}</label>
    <p class="fine">${t('corridor_free_definition')}</p>
    <h3 id="meander-heading">${t('meander_title')}</h3>
    <p>${t('meander_intro')}</p>
    ${list.length ? `<label class="meander-picker">${t('meander_choose')}
      <select data-meander-select><option value="">${t('meander_none')}</option>${list.map((f) => {
        const q = f.properties;
        return `<option value="${q.id}" ${q.id === state.meanderId ? 'selected' : ''}>${names[q.catchment]} · ${q.id.split('-').at(-1)} · ${fmt(q.current_m, 0)} m</option>`;
      }).join('')}</select></label>
      ${p ? `<div class="meander-result" aria-live="polite">
        <div><span>${t('meander_current')}</span><b>${fmt(p.current_m, 0)} m</b></div>
        <div><span>${t('meander_proposed')}</span><b>${fmt(p.proposed_m, 0)} m</b></div>
        <strong>+${fmt(p.extra_m, 0)} m · +${fmt(p.extra_pct, 1)}%</strong>
        <p>${t('meander_offset', { offset: fmt(p.max_offset_m, 0) })}</p>
      </div><button type="button" class="btn small" data-meander-fit>${t('meander_recenter')}</button>`
      : `<button type="button" class="btn primary" data-meander-example>${t('meander_show')}</button>`}
      <p class="fine">${t('meander_count', { n: list.length })}</p>`
      : `<p role="status">${meanderEmptyMessage()}</p>`}
    <details class="more"><summary>${t('meander_how')}</summary><p>${t('meander_method')}</p></details>
    <button type="button" class="btn small method-link" data-open-methods>${methodsTitle()}</button>
    <p class="fine">${t('meander_limit')}</p>
  </section>`;
}

export function bindCorridorOptions(root, map, state, rerender) {
  root.querySelector('[data-free-corridors]')?.addEventListener('change', (event) => {
    state.corridorsFree = event.target.checked;
    document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
    applyCorridorOptions(map, state);
    rerender();
    root.querySelector('[data-free-corridors]').focus({ preventScroll: true });
  });
  const select = (id) => {
    state.meanderId = id || null;
    if (id) state.corridorsFree = true;
    document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
    applyCorridorOptions(map, state);
    fitMeander(map, state);
    rerender();
    root.querySelector('[data-meander-select]').focus({ preventScroll: true });
  };
  root.querySelector('[data-meander-select]')?.addEventListener('change', (e) => select(e.target.value));
  root.querySelector('[data-meander-example]')?.addEventListener('click', () => select(defaultProposal().properties.id));
  root.querySelector('[data-meander-fit]')?.addEventListener('click', () => fitMeander(map, state));
}
