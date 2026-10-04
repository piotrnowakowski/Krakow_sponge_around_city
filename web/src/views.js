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
  return { ...Object.fromEntries(OVERLAYS.map((o) => [o.id, VIEWS[0].layers.includes(o.id)])), view: 'rivers', manual: null, corridorsFree: false, meanderId: null };
}

export function applyView(map, state) {
  for (const overlay of OVERLAYS) {
    if (!map.getLayer(overlay.layers[0])) continue;
    setOverlay(map, overlay, state[overlay.id]);
    if (overlay.opacity) map.setPaintProperty(overlay.opacity.layer, overlay.opacity.prop,
      landcoverOpacity(state[`${overlay.id}_opacity`] ?? overlay.opacity.value));
  }
  if (!map.getLayer('catchments-line')) return;
  map.setPaintProperty('ditches', 'line-color', state.view === 'barriers' ? '#a1aab2'
    : ['match', ['get', 'priority'], 'high', PRIORITY_COLORS.high, 'medium', PRIORITY_COLORS.medium, PRIORITY_COLORS.low]);
  // Boundaries provide context; the chosen topic carries the color.
  const manual = state.view === 'manual';
  map.setPaintProperty('catchments-line', 'line-color', manual ? ['get', 'color'] : '#929ba5');
  map.setPaintProperty('catchments-fill', 'fill-color', manual ? ['get', 'color'] : '#929ba5');
  map.setPaintProperty('catchments-label', 'text-color', manual ? ['get', 'color'] : '#596574');
  applyCorridorOptions(map, state);
}

export function selectView(map, state, id) {
  if (id === state.view) return;
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
