import { OVERLAYS, PRIORITY_COLORS, landcoverOpacity, setOverlay } from './map.js';
import { applyCorridorOptions } from './meanders.js';

export const VIEWS = [
  { id: 'rivers', color: '#1f78b4', layers: ['catchments', 'rivers'] },
  { id: 'ditches', color: '#d90060', layers: ['catchments', 'rivers', 'ditches', 'lidar'] },
  { id: 'barriers', color: '#8c4cbb', layers: ['catchments', 'rivers', 'ditches', 'barriers'] },
  { id: 'corridors', color: '#00866a', layers: ['catchments', 'rivers', 'corridors', 'buildings', 'weirs'] },
  { id: 'landcover', color: '#497b43', layers: ['catchments', 'landcover', 'rivers', 'protected'] },
  { id: 'monitoring', color: '#b83b4b', layers: ['catchments', 'rivers', 'gauges', 'intakes'] },
];

export function createViewState() {
  return { ...Object.fromEntries(OVERLAYS.map((o) => [o.id, VIEWS.find((v) => v.id === 'corridors').layers.includes(o.id)])), mode: 'explore', basemap: 'light', view: 'corridors', manual: null, corridorsFree: false, meanderId: null };
}

export function applyView(map, state) {
  const explore = state.mode === 'explore';
  for (const overlay of OVERLAYS) {
    if (!map.getLayer(overlay.layers[0])) continue;
    setOverlay(map, overlay, explore ? ['catchments', 'rivers'].includes(overlay.id) : state[overlay.id]);
    if (overlay.opacity) map.setPaintProperty(overlay.opacity.layer, overlay.opacity.prop,
      landcoverOpacity(state[`${overlay.id}_opacity`] ?? overlay.opacity.value));
  }
  if (!map.getLayer('catchments-line')) return;
  map.setPaintProperty('catchments-fill', 'fill-opacity', 0);
  map.setPaintProperty('catchments-line', 'line-width', 1.5);
  map.setPaintProperty('catchments-label', 'text-halo-width', 1.5);
  map.setLayoutProperty('catchments-label', 'text-size', 12);
  map.setLayoutProperty('catchments-label', 'text-transform', 'none');
  map.setLayerZoomRange('weirs', 12, 24);
  map.setLayoutProperty('corridors', 'line-cap', 'butt');
  map.setPaintProperty('corridors', 'line-width', ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 14]);
  map.setPaintProperty('ditches', 'line-color', state.view === 'barriers' ? '#a1aab2'
    : ['match', ['get', 'priority'], 'high', PRIORITY_COLORS.high, 'medium', PRIORITY_COLORS.medium, PRIORITY_COLORS.low]);
  // Boundaries provide context; the chosen topic carries the color.
  const manual = state.view === 'manual';
  map.setPaintProperty('catchments-line', 'line-color', explore ? '#2584b3' : manual ? ['get', 'color'] : '#929ba5');
  map.setPaintProperty('catchments-fill', 'fill-color', manual ? ['get', 'color'] : '#929ba5');
  map.setPaintProperty('catchments-label', 'text-color', manual ? ['get', 'color'] : '#596574');
  applyCorridorOptions(map, state);
}

export function selectView(map, state, id) {
  if (!VIEWS.some((view) => view.id === id) && id !== 'manual') return;
  state.mode = 'analyse';
  if (id === state.view) {
    applyView(map, state);
    document.dispatchEvent(new CustomEvent('app:view-change', { detail: id }));
    return;
  }
  if (state.view === 'manual') {
    state.manual = Object.fromEntries(OVERLAYS.flatMap((o) => [[o.id, state[o.id]],
      ...(o.opacity ? [[`${o.id}_opacity`, state[`${o.id}_opacity`] ?? o.opacity.value]] : [])]));
  }
  const preset = VIEWS.find((view) => view.id === id);
  if (id === 'manual') {
    if (state.manual) Object.assign(state, state.manual);
  } else if (preset) {
    for (const o of OVERLAYS) {
      state[o.id] = preset.layers.includes(o.id);
      if (o.opacity) state[`${o.id}_opacity`] = o.opacity.value;
    }
  } else return;
  state.view = id;
  applyView(map, state);
  document.dispatchEvent(new CustomEvent('app:view-change', { detail: id }));
}
