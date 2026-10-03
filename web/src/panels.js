import { t, fmt } from './i18n.js';
import { LANDCOVER_COLORS, OVERLAYS, PRIORITY_COLORS, ROOM_COLORS, landcoverOpacity, setOverlay } from './map.js';

const LC_ORDER = ['forest', 'grassland', 'arable', 'orchard', 'water', 'built', 'industrial', 'transport', 'bare'];

const swatches = (entries, kind = 'box') =>
  `<ul class="swatches">${entries
    .map(([color, label]) => `<li><i class="sw-${kind}" style="--c:${color}"></i>${label}</li>`)
    .join('')}</ul>`;

export function legendFor(id) {
  switch (id) {
    case 'landcover':
      return swatches(LC_ORDER.map((k) => [LANDCOVER_COLORS[k], t(`lc_${k}`)]));
    case 'ditches':
      return swatches(['high', 'medium', 'low'].map((k) => [PRIORITY_COLORS[k], t(`pr_${k}`)]), 'line');
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
  el.innerHTML = groups
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
    .join('');

  el.querySelectorAll('[data-overlay]').forEach((input) => {
    input.addEventListener('change', () => {
      const o = OVERLAYS.find((x) => x.id === input.dataset.overlay);
      state[o.id] = input.checked;
      setOverlay(map, o, input.checked);
      input.closest('.layer').classList.toggle('on', input.checked);
      onChange();
    });
  });
  el.querySelectorAll('[data-opacity]').forEach((input) => {
    input.addEventListener('input', () => {
      const o = OVERLAYS.find((x) => x.id === input.dataset.opacity);
      state[`${o.id}_opacity`] = Number(input.value);
      map.setPaintProperty(o.opacity.layer, o.opacity.prop, landcoverOpacity(Number(input.value)));
    });
  });
}

export function renderLegend(el, state) {
  const parts = ['ditches', 'corridors', 'landcover', 'gauges']
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

export function renderCatchmentsPanel(el, stats, { onZoom }) {
  const totalDitchKm = Object.values(stats).reduce((a, s) => a + s.ditches_km, 0);
  el.innerHTML = `
    <p class="intro">${t('catch_intro')}</p>
    ${Object.entries(stats)
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
        <button class="btn" data-zoom="${id}">${t('zoom')}</button>
      </article>`;
      })
      .join('')}
    <aside class="callout">
      <h4>⚠️ ${t('gap_title')}</h4>
      <p>${t('gap_text', { km: fmt(totalDitchKm, 0) })}</p>
    </aside>`;
  el.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => onZoom(b.dataset.zoom)));
}
