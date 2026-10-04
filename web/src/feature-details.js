import { t, fmt } from './i18n.js';
import { bindSheetToggle, closeSheet, escapeHtml } from './ui.js';
import { datasetState } from './datasets.js';
import { isPicking } from './reports.js';

export function bindFeatureDetails(map, { onGauge, onSelect, onReport }, { priorities, rooms }) {
  const el = document.createElement('section'); el.id = 'feature-detail'; el.hidden = true;
  document.querySelector('.sheet-content').append(el);
  const empty = { type: 'FeatureCollection', features: [] };
  map.addSource('selected-feature', { type: 'geojson', data: empty });
  map.addLayer({ id: 'selected-feature-halo', type: 'line', source: 'selected-feature', paint: { 'line-color': '#ffffff', 'line-width': 15 } });
  map.addLayer({ id: 'selected-feature', type: 'line', source: 'selected-feature', paint: { 'line-color': ['get', 'selected_color'], 'line-width': 9 } });
  let selection = null, restoreOpacity = null;
  const row = (label, value) => `<div class="barrier-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  function clear(focus = true) {
    if (!selection) return;
    if (restoreOpacity) map.setPaintProperty(restoreOpacity.layer, 'line-opacity', restoreOpacity.value);
    selection = null; restoreOpacity = null; el.hidden = true; map.getSource('selected-feature').setData(empty);
    document.body.classList.remove('feature-selected'); closeSheet(map);
    if (focus) map.getCanvas().focus({ preventScroll: true });
  }
  function render() {
    if (!selection) return;
    const { type, feature } = selection, p = feature.properties, scroll = el.scrollTop;
    const title = type === 'corridors' ? t('corridor_title', { length: fmt(p.length_m, 0) }) : t(type === 'ditches' ? 'ditch_title' : type === 'lidar' ? 'lidar_title' : 'weir_title');
    el.setAttribute('aria-label', title);
    el.innerHTML = `<div class="detail-toolbar"><button class="feature-close">← ${t('close_detail')}</button><button class="sheet-toggle"></button></div><h2 tabindex="-1">${escapeHtml(title)}</h2>`
      + (type === 'ditches' ? `<div class="pop-score">${fmt(p.score, 0)}<small>/100</small><span>${t(`pr_${p.priority}`)}</span></div>
        ${row(t('ditch_context'), t(`lc_${p.context}`))}${row(t('ditch_houses'), `${fmt(p.dist_building_m, 0)} m`)}
        ${row(t('ditch_slope'), `${fmt(p.slope_pct, 1)}%`)}${row(t('ditch_length'), `${fmt(p.length_m, 0)} m`)}${row(t('ditch_storage'), `≈ ${fmt(p.volume_m3, 0)} m³`)}<p>${t('ditch_storage_note', { rank: p.rank })}</p><p class="barrier-status">${t('ditch_note')}</p>`
        : type === 'lidar' ? `<span class="tag-experimental">${t('experimental')}</span>${row(t('lidar_length'), `${fmt(p.length_m, 0)} m`)}${row(t('lidar_depth'), `${fmt(p.depth_mean_m, 2)} m`)}<p>${t('lidar_note')}</p>`
        : type === 'corridors' ? `<strong class="corridor-status" style="--c:${rooms[p.room_class]}">${t(`room_${p.room_class}`)}</strong><p>${t(`corridor_reason_${p.reason}`)}</p>
          ${row(t('corridor_distance'), p.building_distance_m == null ? t('corridor_no_building') : `${fmt(p.building_distance_m, 1)} m`)}<p class="fine">${t('corridor_distance_note')}</p>
          ${row(t('corridor_free'), `${fmt(p.room_pct, 0)}%`)}${row(t('corridor_built'), `${fmt(p.built_pct, 0)}%`)}<p class="barrier-status">${t('corridor_rule')}</p>` : `<p>${escapeHtml(p.kind)}</p>`);
    if (type === 'ditches' || type === 'lidar') {
      const report = document.createElement('button'); report.className = 'btn'; report.textContent = t('rep_this_ditch');
      report.onclick = () => { const point = selection.lngLat; clear(false); onReport(point); }; el.append(report);
    }
    el.querySelector('.feature-close').onclick = () => clear(); bindSheetToggle(el.querySelector('.sheet-toggle'), map); el.scrollTop = scroll;
  }
  for (const type of ['ditches', 'corridors', 'weirs', 'lidar']) {
    map.on('click', type, (e) => {
      if (isPicking()) return;
      if (map.queryRenderedFeatures(e.point, { layers: ['barriers'] }).length) return;
      clear(false); onSelect?.();
      const rendered = e.features[0];
      const original = datasetState(map, type)?.data?.features[rendered.id];
      const feature = original ?? { type: 'Feature', geometry: rendered.geometry, properties: rendered.properties };
      selection = { type, feature, lngLat: e.lngLat }; el.hidden = false; document.body.classList.add('feature-selected');
      if (type !== 'weirs') {
        restoreOpacity = { layer: type, value: map.getPaintProperty(type, 'line-opacity') ?? 1 };
        map.setPaintProperty(type, 'line-opacity', 0.15);
        map.getSource('selected-feature').setData({ ...feature, properties: { ...feature.properties, selected_color: type === 'corridors' ? rooms[feature.properties.room_class] : type === 'lidar' ? '#7c3aed' : priorities[feature.properties.priority] } });
      }
      render(); el.scrollTop = 0; el.querySelector('h2').focus({ preventScroll: true });
    });
    map.on('mouseenter', type, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', type, () => { map.getCanvas().style.cursor = ''; });
  }
  map.on('click', 'gauges', (e) => { if (!isPicking()) { clear(false); onGauge(e.features[0].properties.code); } });
  return { clear, refresh: render };
}
