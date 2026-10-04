import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { area, calculateScenario, DEFAULTS, discharge, manning, outlets, storage, validate } from '../web/src/ditch-hydraulics.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
test('SI Manning reference: rectangular 2 m by 1 m, n .03, slope .001', () => {
  near(manning(1, { ...DEFAULTS, bottomWidth: 2, sideSlope: 0, slope: 0.001, manningN: 0.03 }),
    2 / 0.03 * 0.5 ** (2 / 3) * Math.sqrt(0.001));
});
test('notch passes low flow and crest only activates above the fill', () => {
  const low = outlets(0.2, DEFAULTS), high = outlets(0.5, DEFAULTS);
  assert.ok(low.notch > 0); near(low.crest, 0); assert.ok(high.crest > 0);
  near(low.notch, 1.5 * 0.1 * 0.2 ** 1.5);
  for (const h of [0, 0.1, 0.35, 0.8]) assert.ok(discharge(h, DEFAULTS, true) <= manning(h, DEFAULTS));
});
test('storage lies between normal-flow storage and a completely level full reach', () => {
  for (const length of [30, 200, 500]) {
    const p = { ...DEFAULTS, length };
    let previous = 0;
    for (let i = 1; i <= 100; i++) {
      const h = i / 100 * p.bankDepth;
      const v = storage(h, p, true);
      assert.ok(v >= previous && v <= area(h, p) * length + 1e-6);
      previous = v;
    }
  }
});
test('same input; both scenarios conserve mass including starting water and bank spill', () => {
  for (const peakLps of [5, 30, 1000]) {
    const r = calculateScenario({ peakLps });
    near(r.baseline.input, r.barrier.input);
    // Analytical triangle excess volume + persistent baseflow for event + recession.
    near(r.barrier.input, (peakLps - 1) / 1000 * 7200 / 2 + 0.001 * 28800);
    for (const s of [r.baseline, r.barrier]) {
      near(s.massError, 0, 1e-5);
      assert.ok(s.series.every((x) => x.storage >= 0 && x.depth <= 0.8 + 1e-9));
      near(s.event.input + s.initialStorage, s.event.output + s.event.spill + s.event.storage, 1e-5);
    }
    assert.ok(r.barrier.output > 0);
    if (peakLps === 1000) assert.ok(r.overtopped && r.barrier.spill > 100);
  }
});
test('no event means no extra event storage; initial pond is not credited as new', () => {
  const r = calculateScenario({ peakLps: 1 });
  assert.ok(r.extraInitial > 0);
  assert.ok(r.extraStorage < 1e-5);
});
test('no inflow and initially dry stays dry without NaN metrics', () => {
  const r = calculateScenario({ baseflowLps: 0, peakLps: 0 });
  near(r.barrier.input, 0); near(r.barrier.output, 0, 1e-6);
  assert.ok(Number.isFinite(r.peakReductionPct));
});
test('larger opening reduces extra storage; no permanent saving is claimed', () => {
  const small = calculateScenario({});
  const large = calculateScenario({ notchWidth: 0.3, spillWidth: 0.6 });
  assert.ok(large.extraStorage < small.extraStorage);
  assert.ok(large.barrier.peakQ > small.barrier.peakQ);
  near(small.barrier.finalStorage, small.barrier.initialStorage, 0.01);
});
test('junction-bounded reach warns when backwater extends outside model domain', () => {
  assert.ok(calculateScenario({ length: 50, slope: 0.001 }).truncatedBackwater);
});
test('halving timestep gives stable peak storage and flow', () => {
  const a = calculateScenario({}, 20), b = calculateScenario({}, 10);
  assert.ok(Math.abs(a.extraStorage - b.extraStorage) / b.extraStorage < 0.02);
  assert.ok(Math.abs(a.barrier.peakQ - b.barrier.peakQ) / b.barrier.peakQ < 0.01);
});
test('reject invalid geometry and unpassable initial baseflow', () => {
  for (const values of [{ slope: 0 }, { crestHeight: 0.8 }, { notchWidth: 0 }, { notchWidth: 2 },
    { spillWidth: 2 }, { bankDepth: NaN }, { peakLps: 0 }, { durationHours: 0 }, { baseflowLps: 500, peakLps: 1000 }]) {
    assert.throws(() => validate({ ...DEFAULTS, ...values }));
  }
});
test('every generated candidate has paired reaches, admissible screen and finite balanced scenario', () => {
  const read = (name) => JSON.parse(readFileSync(new URL(`../web/public/data/${name}.json`, import.meta.url)));
  const points = read('ditch-barriers').features, reaches = read('ditch-barrier-reaches').features;
  assert.ok(points.length > 0);
  assert.equal(new Set(points.map((p) => p.properties.id)).size, points.length);
  for (const { properties: p } of points) {
    assert.ok(p.building_clearance_m >= 100 && p.low_relief_m >= 0.5);
    assert.ok(p.upstream_length_m >= 50 && p.upstream_length_m <= 200);
    assert.equal(reaches.filter((r) => r.properties.id === p.id).length, 2);
    const r = calculateScenario({ length: p.upstream_length_m, slope: p.terrain_slope_pct / 100 });
    near(r.barrier.massError, 0, 1e-5);
  }
});
