import { fetchJson } from './ui.js';

const EMPTY = { type: 'FeatureCollection', features: [] };
const states = new WeakMap();
export function setupDatasets(map, base) {
  states.set(map, { base, entries: new Map() });
}
export function registerDataset(map, name) {
  // Short classified segments must survive simplification at catchment overview zoom.
  map.addSource(name, { type: 'geojson', data: EMPTY, generateId: true, ...(name === 'corridors' ? { tolerance: 0 } : {}) });
  states.get(map).entries.set(name, { status: 'idle', data: null, promise: null });
}
export function datasetState(map, name) { return states.get(map)?.entries.get(name); }
export function loadDataset(map, name, retry = false) {
  const group = states.get(map), entry = group?.entries.get(name);
  if (!entry) return Promise.resolve(null);
  if (entry.promise) return entry.promise;
  if (entry.status === 'ready' && !retry) return Promise.resolve(entry.data);
  if (entry.status === 'error' && !retry) return Promise.resolve(null);
  entry.status = 'loading'; map.fire('datasetstatus', { name });
  entry.promise = fetchJson(`${group.base}${name}.json`).then((data) => {
    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw Error('Invalid GeoJSON');
    entry.data = data; entry.status = 'ready'; map.getSource(name).setData(data);
    return data;
  }).catch(() => { entry.status = 'error'; return null; }).finally(() => {
    entry.promise = null; map.fire('datasetstatus', { name });
  });
  return entry.promise;
}
export function loadLayerSources(map, ids) {
  const sources = new Set(ids.map((id) => map.getLayer(id)?.source).filter(Boolean));
  for (const name of sources) loadDataset(map, name);
}
export function visibleDatasets(map) {
  const sources = new Set(map.getStyle()?.layers.filter((l) => l.layout?.visibility !== 'none').map((l) => l.source));
  return [...(states.get(map)?.entries ?? [])].filter(([name]) => sources.has(name));
}
