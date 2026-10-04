import { bindFeatureDetails } from './feature-details.js';
import maplibregl from 'maplibre-gl';
import { t, fmt } from './i18n.js';
import { pondFilter } from './ponding.js';
import { setupDatasets, registerDataset, loadLayerSources, loadDataset } from './datasets.js';

// Absolute URL: MapLibre fetches GeoJSON from a web worker, where relative paths break.
export const DATA = new URL(`${import.meta.env.BASE_URL}data/`, document.baseURI).href;

export const LANDCOVER_COLORS = {
  forest: '#2d6a4f',
  grassland: '#95d5b2',
  arable: '#f2d07a',
  orchard: '#b9c46b',
  water: '#3a86ff',
  built: '#c8553d',
  industrial: '#8d6a9f',
  transport: '#9e9e9e',
  bare: '#e7dccb',
};
export const PRIORITY_COLORS = { high: '#ff006e', medium: '#fb8500', low: '#ffd60a' };
export const LIDAR_COLOR = '#7c3aed';
export const ROOM_COLORS = { open: '#06d6a0', partial: '#ffd166', constrained: '#d62828' };

// Fade land cover when zoomed in so ditches on the orthophoto / LiDAR relief stay visible.
export const landcoverOpacity = (v) => ['interpolate', ['linear'], ['zoom'], 12, v, 15, v * 0.25];

const wms = (base, layers, format = 'image/png', extra = '') =>
  `${base}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=${layers}&STYLES=&SRS=EPSG:3857` +
  `&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=${format}${extra}`;

const GEOPORTAL = 'https://mapy.geoportal.gov.pl/wss/service/PZGIK';
const RASTERS = {
  ortho: {
    tiles: [wms(`${GEOPORTAL}/ORTO/WMS/StandardResolution`, 'Raster', 'image/jpeg')],
    attribution: 'Ortofotomapa © GUGiK',
  },
  relief: {
    tiles: [wms(`${GEOPORTAL}/NMT/GRID1/WMS/ShadedRelief`, 'Raster')],
    attribution: 'NMT LiDAR © GUGiK',
  },
  mphp: {
    tiles: [wms('https://wody.isok.gov.pl/gpservices/KZGW/ISOK_MPHP/MapServer/WMSServer', '5', 'image/png', '&TRANSPARENT=true')],
    attribution: 'MPHP10k © PGW Wody Polskie',
  },
};

// Overlay layer groups toggled from the sidebar. Each id maps to one or more MapLibre layers.
export const OVERLAYS = [
  { group: 'grp_base', id: 'catchments', on: true, layers: ['catchments-fill', 'catchments-line', 'catchments-label'] },
  { group: 'grp_base', id: 'mphp', on: false, layers: ['mphp'] },
  { group: 'grp_base', id: 'landcover', on: true, layers: ['landcover'], opacity: { layer: 'landcover', prop: 'fill-opacity', value: 0.55 } },
  { group: 'grp_base', id: 'rivers', on: true, layers: ['rivers', 'rivers-main', 'rivers-label'] },
  { group: 'grp_base', id: 'protected', on: false, layers: ['protected-fill', 'protected-line'] },
  { group: 'grp_sponge', id: 'ditches', on: true, layers: ['ditches-casing', 'ditches'] },
  { group: 'grp_sponge', id: 'barriers', on: false, layers: ['pond-depth', 'pond-outline', 'pond-patch', 'barrier-upstream', 'barrier-downstream', 'barriers'] },
  { group: 'grp_sponge', id: 'lidar', on: false, layers: ['lidar-tile', 'lidar-casing', 'lidar'] },
  { group: 'grp_sponge', id: 'corridors', on: false, layers: ['corridors'] },
  { group: 'grp_sponge', id: 'buildings', on: false, layers: ['buildings'] },
  { group: 'grp_sponge', id: 'weirs', on: false, layers: ['weirs'] },
  { group: 'grp_monitor', id: 'gauges', on: true, layers: ['gauges', 'gauges-label'] },
  { group: 'grp_monitor', id: 'intakes', on: true, layers: ['intakes', 'intakes-label'] },
];

export function createMap(container) {
  const map = new maplibregl.Map({
    container,
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: [19.85, 50.17],
    zoom: 9.6,
    minZoom: 8,
    maxZoom: 18,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
  return map;
}

function firstSymbolLayer(map) {
  return map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
}

export async function addLayers(map, gaugesGeojson) {
  const before = firstSymbolLayer(map);
  setupDatasets(map, DATA);

  for (const [id, r] of Object.entries(RASTERS)) {
    map.addSource(id, { type: 'raster', tiles: r.tiles, tileSize: 256, attribution: r.attribution });
  }
  map.addLayer({ id: 'ortho', type: 'raster', source: 'ortho', layout: { visibility: 'none' } }, before);
  map.addLayer({ id: 'relief', type: 'raster', source: 'relief', layout: { visibility: 'none' } }, before);

  for (const name of ['catchments', 'landcover', 'rivers', 'ditches', 'corridors', 'buildings', 'weirs', 'protected', 'intakes', 'ditch-ponding-sites', 'ditch-barrier-reaches', 'ditch-ponding']) {
    registerDataset(map, name);
  }
  map.addSource('gauges', { type: 'geojson', data: gaugesGeojson });
  map.addSource('lidar', { type: 'geojson', data: `${DATA}lidar_candidates.json` });

  map.addLayer({
    id: 'landcover', type: 'fill', source: 'landcover',
    paint: {
      'fill-color': ['match', ['get', 'cls'], ...Object.entries(LANDCOVER_COLORS).flat(), '#cccccc'],
      'fill-opacity': landcoverOpacity(0.55),
    },
  });
  map.addLayer({
    id: 'catchments-fill', type: 'fill', source: 'catchments',
    paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.06 },
  });
  map.addLayer({
    id: 'protected-fill', type: 'fill', source: 'protected', layout: { visibility: 'none' },
    paint: { 'fill-color': '#2d6a4f', 'fill-opacity': 0.12 },
  });
  map.addLayer({
    id: 'protected-line', type: 'line', source: 'protected', layout: { visibility: 'none' },
    paint: { 'line-color': '#1b4332', 'line-width': 1.5, 'line-dasharray': [3, 2] },
  });
  map.addLayer({ id: 'mphp', type: 'raster', source: 'mphp', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.9 } });
  map.addLayer({
    id: 'buildings', type: 'fill', source: 'buildings', minzoom: 11, layout: { visibility: 'none' },
    paint: { 'fill-color': '#343a40', 'fill-opacity': 0.85 },
  });
  map.addLayer({
    id: 'corridors', type: 'line', source: 'corridors', layout: { visibility: 'none', 'line-cap': 'round' },
    paint: {
      'line-color': ['match', ['get', 'room_class'], 'open', ROOM_COLORS.open, 'partial', ROOM_COLORS.partial, ROOM_COLORS.constrained],
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 22],
      'line-opacity': 1,
    },
  });
  map.addLayer({
    id: 'rivers', type: 'line', source: 'rivers', filter: ['!', ['get', 'main']],
    paint: { 'line-color': '#2b6cb0', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.7, 14, 2] },
  });
  map.addLayer({
    id: 'rivers-main', type: 'line', source: 'rivers', filter: ['get', 'main'],
    paint: { 'line-color': '#1e40af', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2, 14, 4.5] },
  });
  map.addLayer({
    id: 'ditches-casing', type: 'line', source: 'ditches',
    paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 15, 7], 'line-opacity': 0.9 },
  });
  map.addLayer({
    id: 'ditches', type: 'line', source: 'ditches',
    paint: {
      'line-color': ['match', ['get', 'priority'], 'high', PRIORITY_COLORS.high, 'medium', PRIORITY_COLORS.medium, PRIORITY_COLORS.low],
      'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 15, 4.5],
    },
  });
  const isCandidate = ['==', ['get', 'kind'], 'candidate'];
  map.addLayer({
    id: 'lidar-tile', type: 'line', source: 'lidar', filter: ['==', ['get', 'kind'], 'tile'], layout: { visibility: 'none' },
    paint: { 'line-color': '#111827', 'line-width': 1.5, 'line-dasharray': [4, 3] },
  });
  map.addLayer({
    id: 'lidar-casing', type: 'line', source: 'lidar', filter: isCandidate, layout: { visibility: 'none', 'line-cap': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 6], 'line-opacity': 0.85 },
  });
  map.addLayer({
    id: 'lidar', type: 'line', source: 'lidar', filter: isCandidate, layout: { visibility: 'none', 'line-cap': 'round' },
    paint: { 'line-color': LIDAR_COLOR, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.2, 16, 3.5], 'line-dasharray': [2, 1] },
  });
  map.addLayer({
    id: 'catchments-line', type: 'line', source: 'catchments',
    paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.2, 14, 4] },
  });
  map.addLayer({
    id: 'weirs', type: 'circle', source: 'weirs', layout: { visibility: 'none' },
    paint: { 'circle-radius': 4.5, 'circle-color': '#212529', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 },
  });
  map.addLayer({
    id: 'intakes', type: 'circle', source: 'intakes',
    paint: { 'circle-radius': 8, 'circle-color': '#0ea5e9', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 },
  });
  map.addLayer({
    id: 'gauges', type: 'circle', source: 'gauges',
    paint: {
      'circle-radius': 9,
      'circle-color': ['case', ['get', 'below_snq'], '#e63946', '#2a9d8f'],
      'circle-stroke-color': '#fff',
      'circle-stroke-width': 3,
    },
  });

  map.addLayer({ id: 'pond-depth', type: 'fill', source: 'ditch-ponding',
    layout: { visibility: 'none' }, filter: pondFilter('depth'),
    paint: { 'fill-color': ['match', ['get', 'band'], 'shallow', '#7dd3fc', 'medium', '#2196d2', '#075985'],
      'fill-opacity': 0.72 },
  });
  map.addLayer({ id: 'pond-outline', type: 'line', source: 'ditch-ponding',
    layout: { visibility: 'none' }, filter: pondFilter('extent'),
    paint: { 'line-color': '#075985', 'line-width': 2 },
  });
  map.addLayer({ id: 'pond-patch', type: 'fill', source: 'ditch-ponding',
    layout: { visibility: 'none' }, filter: pondFilter('patch'),
    paint: { 'fill-color': '#8c4cbb', 'fill-opacity': 0.95 },
  });
  for (const [role, color] of [['upstream', '#9ba9b5'], ['downstream', '#536575']]) {
    map.addLayer({
      id: `barrier-${role}`, type: 'line', source: 'ditch-barrier-reaches',
      layout: { visibility: 'none', 'line-cap': 'round' },
      filter: ['==', ['get', 'id'], ''],
      paint: { 'line-color': color, 'line-width': role === 'upstream' ? 1 : 2,
        'line-opacity': 0.9, ...(role === 'downstream' ? { 'line-dasharray': [2, 1] } : {}) },
    });
  }
  map.addLayer({ id: 'barriers', type: 'circle', source: 'ditch-ponding-sites',
    layout: { visibility: 'none' },
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 8],
      'circle-color': '#8c4cbb', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
  });

  const font = ['Noto Sans Bold'];
  map.addLayer({
    id: 'rivers-label', type: 'symbol', source: 'rivers', filter: ['all', ['get', 'main'], ['has', 'name']], minzoom: 10.5,
    layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Italic'], 'text-size': 12, 'symbol-spacing': 400 },
    paint: { 'text-color': '#1e3a8a', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
  });
  map.addLayer({
    id: 'catchments-label', type: 'symbol', source: 'catchments', maxzoom: 12,
    layout: { 'text-field': ['get', 'name'], 'text-font': font, 'text-size': 15, 'text-transform': 'uppercase', 'text-letter-spacing': 0.08 },
    paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#fff', 'text-halo-width': 2 },
  });
  map.addLayer({
    id: 'intakes-label', type: 'symbol', source: 'intakes', minzoom: 10,
    layout: { 'text-field': ['get', 'name'], 'text-font': font, 'text-size': 11, 'text-offset': [0, 1.4], 'text-anchor': 'top' },
    paint: { 'text-color': '#075985', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
  });
  map.addLayer({
    id: 'gauges-label', type: 'symbol', source: 'gauges',
    layout: { 'text-field': ['get', 'label'], 'text-font': font, 'text-size': 11.5, 'text-offset': [0, 1.5], 'text-anchor': 'top' },
    paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 2 },
  });
}

export function setBasemap(map, which) {
  map.setLayoutProperty('ortho', 'visibility', which === 'ortho' ? 'visible' : 'none');
  map.setLayoutProperty('relief', 'visibility', which === 'relief' ? 'visible' : 'none');
  map.fire('basemapchange', { which });
}

export function ensureLandcover(map) {
  return loadDataset(map, 'landcover');
}

export function setOverlay(map, overlay, visible) {
  for (const id of overlay.layers) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  if (visible) loadLayerSources(map, overlay.layers);
}

// Keep the overview's exact filters, colors and visibility for a reversible focus view.
export function createCatchmentFocus(map) {
  let saved = null;
  const restore = () => {
    if (!saved) return;
    for (const layer of saved) {
      map.setFilter(layer.id, layer.filter ?? null);
      map.setLayoutProperty(layer.id, 'visibility', layer.layout?.visibility ?? 'visible');
      const current = map.getStyle().layers.find((l) => l.id === layer.id);
      for (const key of Object.keys(current.paint ?? {})) map.setPaintProperty(layer.id, key, layer.paint?.[key] ?? null);
    }
    saved = null;
  };
  return {
    clear: restore,
    select(feature) {
      restore();
      const ids = new Set([...OVERLAYS.flatMap((o) => o.layers), 'ortho', 'relief']);
      saved = structuredClone(map.getStyle().layers.filter((layer) => ids.has(layer.id)));
      const { id, color } = feature.properties;
      const visible = new Set(['catchments-fill', 'catchments-line', 'catchments-label', 'landcover', 'rivers', 'rivers-main', 'rivers-label', 'ditches-casing', 'ditches']);
      loadLayerSources(map, [...visible]);
      for (const layer of saved) {
        map.setLayoutProperty(layer.id, 'visibility', visible.has(layer.id) ? 'visible' : 'none');
        if (!visible.has(layer.id)) continue;
        const selected = ['==', ['get', layer.source === 'catchments' ? 'id' : 'catchment'], id];
        map.setFilter(layer.id, layer.filter ? ['all', layer.filter, selected] : selected);
      }
      ensureLandcover(map);
      map.setPaintProperty('landcover', 'fill-color', '#c6cbd0');
      map.setPaintProperty('catchments-fill', 'fill-opacity', 0.09);
      map.setPaintProperty('catchments-fill', 'fill-color', color);
      map.setPaintProperty('catchments-line', 'line-color', color);
      map.setPaintProperty('catchments-label', 'text-color', color);
      for (const layer of ['rivers', 'rivers-main', 'ditches']) map.setPaintProperty(layer, 'line-color', color);
      map.setPaintProperty('rivers-label', 'text-color', color);
      map.setPaintProperty('rivers', 'line-opacity', 0.5);
      map.setPaintProperty('ditches', 'line-dasharray', [2, 1]);
    },
  };
}

const row = (label, value) => `<div class="pop-row"><span>${label}</span><strong>${value}</strong></div>`;
const bar = (value, max, color) =>
  `<div class="pop-bar"><i style="width:${Math.round((100 * value) / max)}%;background:${color}"></i></div>`;

export function bindPopups(map, options) {
  return bindFeatureDetails(map, options, { priorities: PRIORITY_COLORS, rooms: ROOM_COLORS });
}
