import { t, fmt } from './i18n.js';
import { bindScenario, scenarioHtml } from './scenario.js';
import { LANDCOVER_COLORS, LIDAR_COLOR, OVERLAYS, PRIORITY_COLORS, ROOM_COLORS, landcoverOpacity, setOverlay } from './map.js';
import { VIEWS, selectView } from './views.js';

const LC_ORDER = ['forest', 'grassland', 'arable', 'orchard', 'water', 'built', 'industrial', 'transport', 'bare'];

const swatches = (entries, kind = 'box') =>
  `<ul class="swatches">${entries
    .map(([color, label]) => `<li><i class="sw-${kind}" style="--c:${color}"></i>${label}</li>`)
    .join('')}</ul>`;

export function legendFor(id) {
  switch (id) {
    case 'rivers':
      return swatches([['#1e40af', t('river_main')], ['#2b6cb0', t('river_streams')]], 'line');
    case 'landcover':
      return swatches(LC_ORDER.map((k) => [LANDCOVER_COLORS[k], t(`lc_${k}`)]));
    case 'ditches':
      return swatches(['high', 'medium', 'low'].map((k) => [PRIORITY_COLORS[k], t(`pr_${k}`)]), 'line');
    case 'lidar':
      return swatches([[LIDAR_COLOR, t('lidar_legend')], ['#111827', t('lidar_tile')]], 'dash');
    case 'corridors':
      return swatches(['open', 'partial', 'constrained'].map((k) => [ROOM_COLORS[k], t(`room_${k}`)]), 'thick');
    case 'gauges':
      return swatches([['#e63946', t('gauge_low')], ['#2a9d8f', t('gauge_ok')]], 'dot');
    default:
      return '';
  }
}

export function renderLayersPanel(el, map, state, onChange) {
  const groups = [...new Set(OVERLAYS.map((o) => o.group))];
  const manual = state.view === 'manual';
  el.innerHTML = `<p class="intro">${t('views_intro')}</p>
    <div class="view-grid" role="group" aria-label="${t('tab_layers')}">
      ${[...VIEWS, { id: 'manual', color: '#596574' }].map((view) => `
        <button type="button" class="view-card" data-view="${view.id}" aria-pressed="${state.view === view.id}" style="--view-color:${view.color}">
          <strong>${t(`view_${view.id}`)}</strong><span>${t(`view_${view.id}_d`)}</span>
        </button>`).join('')}
    </div>
    <section class="view-details"><h2>${t(`view_${state.view}`)}</h2>
      <p>${t(`view_${state.view}_hint`)}</p>
      ${manual ? '' : `<p class="view-includes">${t('view_includes')}: ${VIEWS.find((v) => v.id === state.view).layers.map((id) => t(`lyr_${id}`)).join(' · ')}</p>`}
      ${manual ? '' : ['rivers', 'ditches', 'lidar', 'corridors', 'landcover', 'gauges'].filter((id) => state[id]).map((id) => legendFor(id)).join('')}
    </section>` + (manual ? groups
    .map(
      (g) => `
      <h2 class="group-title">${t(g)}</h2>
      ${OVERLAYS.filter((o) => o.group === g)
        .map(
          (o) => `
        <div class="layer ${state[o.id] ? 'on' : ''}" data-id="${o.id}">
          <label class="switch">
            <input type="checkbox" ${state[o.id] ? 'checked' : ''} data-overlay="${o.id}" />
            <span class="track"><span class="thumb"></span></span>
            <span class="layer-name">${t(`lyr_${o.id}`)}</span>
          </label>
          <p class="layer-desc">${t(`lyr_${o.id}_d`)}</p>
          ${o.opacity ? `<label class="opacity">${t('opacity')} <input type="range" min="0" max="1" step="0.05" value="${state[`${o.id}_opacity`] ?? o.opacity.value}" data-opacity="${o.id}" /></label>` : ''}
          <div class="layer-legend">${legendFor(o.id)}</div>
        </div>`,
        )
        .join('')}`,
    )
    .join('') : '');

  el.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      selectView(map, state, button.dataset.view);
      document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
      renderLayersPanel(el, map, state, onChange);
      onChange();
      el.querySelector(`[data-view="${state.view}"]`).focus({ preventScroll: true });
    });
  });

  el.querySelectorAll('[data-overlay]').forEach((input) => {
    input.addEventListener('change', () => {
      const o = OVERLAYS.find((x) => x.id === input.dataset.overlay);
      state[o.id] = input.checked;
      if (map.getLayer(o.layers[0])) setOverlay(map, o, input.checked);
      input.closest('.layer').classList.toggle('on', input.checked);
      onChange();
    });
  });
  el.querySelectorAll('[data-opacity]').forEach((input) => {
    input.addEventListener('input', () => {
      const o = OVERLAYS.find((x) => x.id === input.dataset.opacity);
      state[`${o.id}_opacity`] = Number(input.value);
      if (map.getLayer(o.opacity.layer)) map.setPaintProperty(o.opacity.layer, o.opacity.prop, landcoverOpacity(Number(input.value)));
    });
  });
}

export function renderLegend(el, state) {
  const parts = ['rivers', 'ditches', 'lidar', 'corridors', 'landcover', 'gauges']
    .filter((id) => state[id])
    .map((id) => `<div class="legend-block"><h5>${t(`lyr_${id}`)}</h5>${legendFor(id)}</div>`);
  el.innerHTML = parts.join('');
  el.hidden = parts.length === 0;
}

function lcBar(pct) {
  return `<div class="lc-bar">${LC_ORDER.filter((k) => pct[k] > 0.3)
    .map((k) => `<i style="width:${pct[k]}%;background:${LANDCOVER_COLORS[k]}" title="${t(`lc_${k}`)} ${fmt(pct[k])}%"></i>`)
    .join('')}</div>
    <ul class="lc-list">${LC_ORDER.filter((k) => pct[k] >= 2)
      .map((k) => `<li><i style="--c:${LANDCOVER_COLORS[k]}"></i>${t(`lc_${k}`)} <b>${fmt(pct[k], 0)}%</b></li>`)
      .join('')}</ul>`;
}

export function renderCatchmentsPanel(el, stats, { onZoom, selected = null }) {
  const totalDitchKm = Object.values(stats).reduce((a, s) => a + s.ditches_km, 0);
  el.innerHTML = `
    <p class="intro">${t(selected ? 'focus_intro' : 'catch_intro')}</p>
    ${selected ? `<select class="focus-select" aria-label="${t('tab_catchments')}">${Object.entries(stats).map(([id, s]) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${s.name}</option>`).join('')}</select>` : ''}
    ${Object.entries(stats)
      .filter(([id]) => !selected || id === selected)
      .map(([id, s]) => {
        const room = s.corridor_room_km;
        const roomTotal = (room.open || 0) + (room.partial || 0) + (room.constrained || 0);
        return `
      <article class="card" style="--accent:${s.color}">
        <header>
          <h3>${s.name}</h3>
          <span class="badge ${s.feeds_krakow_tap_water ? 'tap' : ''}">${s.feeds_krakow_tap_water ? '🚰 ' + t('feeds_tap') : t('no_tap')}</span>
        </header>
        <div class="kv"><span>${t('area')}</span><b>${fmt(s.area_km2)} km²</b>
          <small>${t('vs_mphp', { mphp: fmt(s.validation.mphp_area_km2), diff: fmt(s.validation.area_diff_pct) })}</small></div>
        <h4>${t('landcover')}</h4>
        ${lcBar(s.landcover_pct)}
        <div class="metrics">
          <div><span>${t('sealed')}</span><b>${fmt(s.sealed_pct)}%</b></div>
          <div><span>${t('ditches')}</span><b>${t('ditch_density', { km: fmt(s.ditches_km), density: fmt(s.ditch_density_km_per_km2, 2) })}</b>
            <small><i class="dot" style="--c:${PRIORITY_COLORS.high}"></i>${fmt(s.ditches_priority_km.high)} km ${t('high_priority')}</small></div>
          <div><span>${t('corridor_room')}</span><b>${t('open_km', { open: fmt(room.open || 0), total: fmt(roomTotal) })}</b>
            <div class="room-bar">${['open', 'partial', 'constrained']
              .map((k) => `<i style="width:${(100 * (room[k] || 0)) / roomTotal}%;background:${ROOM_COLORS[k]}"></i>`)
              .join('')}</div></div>
          <div><span>${t('weirs')}</span><b>${s.weirs}</b></div>
        </div>
        ${scenarioHtml(id)}
        <button class="btn" data-zoom="${id}">${t(selected ? 'focus_recenter' : 'zoom')}</button>
      </article>`;
      })
      .join('')}
    <aside class="callout">
      <h4>⚠️ ${t('gap_title')}</h4>
      <p>${t('gap_text', { km: fmt(totalDitchKm, 0) })}</p>
    </aside>`;
  el.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => onZoom(b.dataset.zoom)));
  el.querySelector('.focus-select')?.addEventListener('change', (e) => onZoom(e.target.value));
  bindScenario(el);
}
