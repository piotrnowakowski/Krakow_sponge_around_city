// SI units. A local, uncalibrated level-pool scenario, not a network/flood model.
// Equations, assumptions and evidence: docs/ditch-barriers-method.md.
export const DEFAULTS = Object.freeze({
  bottomWidth: 1, sideSlope: 1, bankDepth: 0.8, crestHeight: 0.35,
  notchWidth: 0.1, spillWidth: 0.8, manningN: 0.045, weirC: 1.5,
  slope: 0.005, length: 100, baseflowLps: 1, peakLps: 30, durationHours: 2,
});

export function validate(p) {
  if (Object.values(p).some((x) => !Number.isFinite(x))) throw new Error('finite');
  if (p.bottomWidth <= 0 || p.sideSlope < 0 || p.bankDepth <= 0 || p.crestHeight <= 0
    || p.crestHeight >= p.bankDepth || p.notchWidth <= 0 || p.notchWidth >= p.bottomWidth
    || p.spillWidth <= 0 || p.spillWidth > p.bottomWidth - p.notchWidth + 1e-9
    || p.manningN <= 0 || p.weirC <= 0 || p.slope <= 0 || p.length <= 0
    || p.baseflowLps < 0 || p.peakLps < p.baseflowLps || p.durationHours <= 0
    || p.durationHours > 24) throw new Error('geometry');
  if (p.baseflowLps / 1000 >= discharge(p.bankDepth, p, true)) throw new Error('baseflow');
}

export function area(depth, p) {
  return Math.max(0, depth) * (p.bottomWidth + p.sideSlope * Math.max(0, depth));
}

export function manning(depth, p) {
  if (depth <= 0) return 0;
  const a = area(depth, p);
  const perimeter = p.bottomWidth + 2 * depth * Math.sqrt(1 + p.sideSlope ** 2);
  return a * (a / perimeter) ** (2 / 3) * Math.sqrt(p.slope) / p.manningN;
}

export function outlets(depth, p) {
  return {
    notch: p.weirC * p.notchWidth * Math.max(0, depth) ** 1.5,
    crest: p.weirC * p.spillWidth * Math.max(0, depth - p.crestHeight) ** 1.5,
  };
}

export function discharge(depth, p, barrier) {
  const open = manning(depth, p);
  if (!barrier) return open;
  const q = outlets(depth, p);
  // The surviving channel is a throughput constraint. This minimum is a
  // screening approximation, not a simultaneous backwater/tailwater solution.
  return Math.min(open, q.notch + q.crest);
}

function invert(fn, target, high) {
  if (target <= 0) return 0;
  let low = 0;
  for (let i = 0; i < 38; i++) {
    const mid = (low + high) / 2;
    if (fn(mid) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export function normalDepth(q, p) {
  return invert((h) => manning(h, p), q, p.bankDepth);
}

// Integrate the trapezoid above normal flow along a sloping, bounded reach.
// The rest of the reach carries normal flow, so it is not all counted as a pond.
export function storage(depth, p, barrier) {
  if (!barrier) return area(depth, p) * p.length;
  const normal = normalDepth(discharge(depth, p, true), p);
  const backedLength = Math.min(p.length, Math.max(0, depth - normal) / p.slope);
  const farDepth = depth - p.slope * backedLength;
  const primitive = (h) => p.bottomWidth * h ** 2 / 2 + p.sideSlope * h ** 3 / 3;
  return area(normal, p) * (p.length - backedLength)
    + (primitive(depth) - primitive(farDepth)) / p.slope;
}

function table(p, barrier) {
  const n = 400;
  const rows = Array.from({ length: n + 1 }, (_, i) => {
    const h = p.bankDepth * i / n;
    return { h, v: storage(h, p, barrier), q: discharge(h, p, barrier) };
  });
  const at = (h) => {
    const i = Math.min(n - 1, Math.floor(h / p.bankDepth * n));
    const f = Math.min(1, Math.max(0, (h - rows[i].h) / (p.bankDepth / n)));
    return { v: rows[i].v + f * (rows[i + 1].v - rows[i].v),
      q: rows[i].q + f * (rows[i + 1].q - rows[i].q) };
  };
  return { rows, at };
}

function simulate(p, barrier, dt) {
  const rating = table(p, barrier);
  const base = p.baseflowLps / 1000;
  const initialH = invert((h) => rating.at(h).q, base, p.bankDepth);
  let v = rating.at(initialH).v;
  const initialStorage = v;
  let input = 0, output = 0, spill = 0, peakQ = base, peakV = v, peakH = initialH;
  const eventSeconds = p.durationHours * 3600;
  const end = eventSeconds + 6 * 3600;
  const inflow = (t) => base + Math.max(0, 1 - Math.abs(2 * t / eventSeconds - 1)) * (p.peakLps / 1000 - base);
  const series = [{ seconds: 0, inflow: base, q: base, storage: v, depth: initialH, spill: 0 }];
  let event = null;
  for (let seconds = 0; seconds < end - 1e-6;) {
    // Align exactly with the hydrograph peak, event end and simulation end.
    const boundary = [eventSeconds / 2, eventSeconds, end].find((t) => t > seconds + 1e-6);
    const step = Math.min(dt, boundary - seconds);
    const incoming = (inflow(seconds) + inflow(seconds + step)) / 2 * step;
    const available = v + incoming;
    // Implicit Euler: solve S(h_next) + dt Q(h_next) = S_prev + dt I_avg.
    // Monotonic rating means no negative storage or explicit-step oscillation.
    const h = invert((depth) => {
      const r = rating.at(depth);
      return r.v + step * r.q;
    }, available, p.bankDepth);
    const r = rating.at(h);
    const spilled = Math.max(0, available - r.v - step * r.q);
    v = r.v;
    input += incoming; output += step * r.q; spill += spilled;
    peakQ = Math.max(peakQ, r.q); peakV = Math.max(peakV, v); peakH = Math.max(peakH, h);
    seconds += step;
    const sample = { seconds, inflow: inflow(seconds), q: r.q, storage: v, depth: h, spill: spilled / step };
    series.push(sample);
    if (Math.abs(seconds - eventSeconds) < 1e-5) event = { input, output, spill, storage: v };
  }
  return { initialStorage, input, output, spill, finalStorage: v, peakQ, peakV, peakH, series, event,
    massError: initialStorage + input - output - spill - v,
    bankCapacity: discharge(p.bankDepth, p, barrier) };
}

export function calculateScenario(params, dt = 20) {
  const p = { ...DEFAULTS, ...params };
  validate(p);
  if (!Number.isFinite(dt) || dt <= 0 || dt > 60) throw new Error('timestep');
  const baseline = simulate(p, false, dt);
  const barrier = simulate(p, true, dt);
  // Increment attributable to this event, removing pre-event ponded water.
  const extraInitial = barrier.initialStorage - baseline.initialStorage;
  const extraStorage = Math.max(0, ...barrier.series.map((r, i) =>
    r.storage - baseline.series[i].storage - extraInitial));
  const normal = normalDepth(barrier.peakQ, p);
  const backwaterLength = Math.min(p.length, Math.max(0, barrier.peakH - normal) / p.slope);
  return { p, baseline, barrier, extraInitial, extraStorage, backwaterLength,
    storageToCrest: storage(p.crestHeight, p, true),
    peakReductionPct: baseline.peakQ > 0 ? 100 * (1 - barrier.peakQ / baseline.peakQ) : 0,
    truncatedBackwater: (barrier.peakH - normal) / p.slope > p.length,
    overtopped: barrier.spill > 0.001,
  };
}
