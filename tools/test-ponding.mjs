import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { overflowLps, pondFilter } from '../web/src/ponding.js';
test('overflow uses SI head and width and rejects invalid input', () => {
  assert.equal(overflowLps(2, 0), 0);
  assert.equal(overflowLps(2, 0.1), 1000 * 1.5 * 2 * 0.1 ** 1.5);
  for (const head of [-1, NaN, Infinity, 0.31]) assert.throws(() => overflowLps(2, head));
});
test('selected pond filters match the selected height and site', () => {
  const filter = JSON.stringify(pondFilter('depth', 'example', 0.4));
  assert.ok(filter.includes('example') && filter.includes('0.4') && filter.includes('proposed'));
  assert.ok(!JSON.stringify(pondFilter('patch', 'example')).includes('height_m'));
});
test('all visible candidates have matching terrain metadata and polygons', () => {
  const read = (name) => JSON.parse(readFileSync(new URL(`../web/public/data/${name}.json`, import.meta.url)));
  const sites = read('ditch-ponding-sites').features, meta = read('ditch-ponding-meta');
  const features = read('ditch-ponding').features;
  assert.equal(sites.length, meta.proposed_count);
  for (const s of sites) {
    const id = s.properties.id, m = meta.sites[id];
    assert.ok(m.proposed && m.baseline_known);
    assert.equal(m.resolution_m, 1);
    for (const stage of m.stages) {
      assert.ok(Number.isFinite(stage.volume_m3));
      assert.ok(stage.additional_capacity_m3 <= stage.volume_m3);
      if (stage.area_m2 > 0) assert.ok(features.some(f => f.properties.id === id
        && f.properties.kind === 'extent' && f.properties.height_m === stage.height_m));
    }
  }
});
