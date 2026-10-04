import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { overflowLps, pondFilter, pondFitPadding, scenarioUrl } from '../web/src/ponding.js';

test('closing different site scenarios produces the same overview assumptions', () => {
  for (const height of [0.2, 0.4, 0.8, 1]) {
    assert.deepEqual(pondFilter('depth', null, height), pondFilter('depth'));
    assert.notDeepEqual(pondFilter('depth', 'site-a', height), pondFilter('depth'));
  }
});

test('pond fitting leaves usable canvas space even with mobile details expanded', () => {
  for (const [width, height] of [[390, 116], [320, 80], [390, 355], [1080, 781]]) {
    const p = pondFitPadding(width, height);
    assert.ok(width - p.left - p.right >= width / 2);
    assert.ok(height - p.top - p.bottom >= height / 2);
    assert.ok(Object.values(p).every(v => Number.isFinite(v) && v >= 0));
  }
});

test('scenario links round trip edits without losing the hosting path or query', () => {
  const base = 'https://example.org/app/?lang=pl#site=old&height=0.6&head=0.1';
  for (const head of ['0.2', '0.125', '', '0.4']) {
    const url = scenarioUrl(base, 'site-b', 0.8, head), params = new URLSearchParams(url.hash.slice(1));
    assert.equal(url.pathname, '/app/'); assert.equal(url.search, '?lang=pl');
    assert.equal(params.get('site'), 'site-b'); assert.equal(params.get('height'), '0.8'); assert.equal(params.get('head'), head);
  }
});
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
