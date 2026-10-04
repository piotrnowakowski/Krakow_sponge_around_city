// The footprint and stage storage are computed from 1 m DTM in ditch_ponding.py.
// This helper calculates only an illustrative free overflow rate; it must not
// be presented as total site outflow or a flood/event prediction.
export function overflowLps(width, head) {
  if (!Number.isFinite(width) || !Number.isFinite(head) || width < 0 || head < 0 || head > 0.3) {
    throw new Error('invalid overflow inputs');
  }
  return 1000 * 1.5 * width * head ** 1.5;
}

export const OVERVIEW_HEIGHT = 0.6;

export function pondFilter(kind, id = null, height = OVERVIEW_HEIGHT) {
  // A per-site draft must never change the assumptions of the whole overview.
  if (!id) height = OVERVIEW_HEIGHT;
  const filters = [['==', ['get', 'kind'], kind], ['==', ['get', 'proposed'], true]];
  if (id) filters.push(['==', ['get', 'id'], id]);
  if (kind !== 'patch') filters.push(['==', ['get', 'height_m'], height]);
  return ['all', ...filters];
}

export function pondFitPadding(width, height) {
  return { top: Math.min(80, height * 0.2), bottom: Math.min(55, height * 0.15),
    left: Math.min(60, width * 0.15), right: Math.min(60, width * 0.15) };
}

export function scenarioUrl(base, id, height, head) {
  const url = new URL(base);
  url.hash = new URLSearchParams({ site: id, height: String(height), head }).toString();
  return url;
}
