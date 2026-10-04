// The footprint and stage storage are computed from 1 m DTM in ditch_ponding.py.
// This helper calculates only an illustrative free overflow rate; it must not
// be presented as total site outflow or a flood/event prediction.
export function overflowLps(width, head) {
  if (!Number.isFinite(width) || !Number.isFinite(head) || width < 0 || head < 0 || head > 0.3) {
    throw new Error('invalid overflow inputs');
  }
  return 1000 * 1.5 * width * head ** 1.5;
}

export function pondFilter(kind, id = null, height = 0.6) {
  const filters = [['==', ['get', 'kind'], kind], ['==', ['get', 'proposed'], true]];
  if (id) filters.push(['==', ['get', 'id'], id]);
  if (kind !== 'patch') filters.push(['==', ['get', 'height_m'], height]);
  return ['all', ...filters];
}
