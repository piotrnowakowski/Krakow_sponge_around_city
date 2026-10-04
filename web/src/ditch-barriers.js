import { t, fmt } from './i18n.js';
import { overflowLps, pondFilter } from './ponding.js';
import { isPicking } from './reports.js';

const DATA = new URL(`${import.meta.env.BASE_URL}data/`, document.baseURI).href;
const row = (label, value) => `<div class="barrier-row"><span>${label}</span><strong>${value}</strong></div>`;
const volume = (v) => v == null ? '—' : `≈ ${fmt(v, 1)} m³`;

export function bindBarrierUI(map, { onMethods } = {}) {
  const el = document.createElement('section');
  el.id = 'barrier-detail'; el.hidden = true;
  document.querySelector('.sidebar').append(el);
  let selected = null, site = null, height = 0.6, head = 0.1, failure = false, request = 0, dataPromise;
  const metadata = () => dataPromise ??= fetch(`${DATA}ditch-ponding-meta.json`).then((r) => {
    if (!r.ok) throw Error('ponding data unavailable');
    return r.json();
  }).catch((error) => { dataPromise = null; throw error; });

  function paint() {
    const id = selected?.properties.id;
    for (const [layer, kind] of [['pond-depth', 'depth'], ['pond-outline', 'extent'], ['pond-patch', 'patch']]) {
      map.setFilter(layer, pondFilter(kind, id, height));
    }
    // The upstream line is context only; it must never masquerade as wet area.
    map.setFilter('barrier-upstream', ['==', ['get', 'id'], '']);
    map.setFilter('barrier-downstream', ['all', ['==', ['get', 'id'], id ?? ''], ['==', ['get', 'role'], 'downstream']]);
    map.setPaintProperty('barriers', 'circle-color', id
      ? ['case', ['==', ['get', 'id'], id], '#592875', '#b6b0bb'] : '#8c4cbb');
    map.setPaintProperty('barriers', 'circle-radius', id
      ? ['case', ['==', ['get', 'id'], id], 7, 4] : ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 7]);
  }

  function clear() {
    if (!selected) return;
    request++; selected = null; site = null; failure = false; height = 0.6; el.hidden = true;
    document.body.classList.remove('barrier-selected'); paint();
  }

  function fit() {
    map.resize();
    const bounds = site?.stages.find((s) => s.height_m === height)?.bounds;
    if (bounds) map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
      { padding: { top: 80, bottom: 55, left: 60, right: 60 }, maxZoom: 17.5, duration: 400 });
    else if (selected) map.easeTo({ center: selected.geometry.coordinates, zoom: 17, duration: 400 });
  }

  function render() {
    if (!selected) return;
    el.setAttribute('aria-label', t('pond_title'));
    const stage = site?.stages.find((s) => s.height_m === height);
    el.innerHTML = `<button class="barrier-close" type="button">← ${t('barrier_close')}</button>
      <p class="barrier-tag">${t('pond_source')}</p><h2>${t('pond_title')}</h2>
      <p>${t('pond_intro')}</p>` + (!stage
      ? `<p class="barrier-status" role="status">${t(failure ? 'pond_error' : 'pond_loading')}</p>${failure ? `<button class="pond-retry" type="button">${t('pond_retry')}</button>` : ''}`
      : `<label class="pond-height">${t('pond_height')}
          <select name="fillHeight">${site.stages.map((s) => `<option value="${s.height_m}" ${s.height_m === height ? 'selected' : ''}>${fmt(s.height_m)} m</option>`).join('')}</select>
        </label>
        <div class="pond-kpis" aria-live="polite">
          <div class="barrier-kpi"><strong>${fmt(stage.area_m2, 0)} m²</strong><span>${t('pond_footprint')}</span></div>
          <div class="barrier-kpi"><strong>${volume(stage.additional_capacity_m3)}</strong><span>${t('pond_capacity')}</span></div>
        </div>
        <div class="pond-depth-key"><span style="--c:#7dd3fc">${t('pond_shallow')}</span><span style="--c:#2196d2">${t('pond_medium')}</span><span style="--c:#075985">${t('pond_deep')}</span></div>
        ${row(t('pond_mean'), `${fmt(stage.mean_depth_m * 100, 1)} cm`)}
        ${row(t('pond_max'), `${fmt(stage.max_depth_m * 100, 1)} cm`)}
        ${row(t('pond_total'), volume(stage.volume_m3))}
        ${row(t('pond_natural'), volume(stage.natural_depression_m3))}
        ${row(t('pond_clearance'), stage.building_clearance_m == null ? '—' : `${fmt(stage.building_clearance_m, 0)} m`)}
        ${row(t('pond_level'), `${fmt(stage.water_elevation_m, 2)} m NH`)}
        <p class="barrier-status ${stage.limiter !== 'crest' ? 'warning' : ''}">${t(stage.empty ? 'pond_empty' : stage.limiter === 'crest' ? 'pond_crest_limit' : stage.limiter === 'drain' ? 'pond_drain_limit' : 'pond_edge_limit')}</p>
        ${!stage.empty && !stage.building_screen_pass ? `<p class="barrier-status warning">${t('pond_near_building')}</p>` : ''}
        <p class="pop-note">${t('pond_capacity_note')}</p>
        <p>${t('pond_assumption', { width: fmt(site.patch_width_m), length: fmt(site.patch_length_m) })}</p>
        <details class="barrier-inputs"><summary>${t('pond_outflow')}</summary>
          <p>${t('pond_below')}</p>
          <label class="pond-head">${t('pond_head')}<input name="overflowHead" type="number" min="0" max="0.3" step="0.01" value="${head}" required /></label>
          <div class="pond-overflow" aria-live="polite"></div><p class="pop-note">${t('pond_q_note')}</p>
        </details>
        <details class="barrier-evidence"><summary>${t('pond_method')}</summary>
          <p>${t('pond_method_text')}</p><p>${t('pond_not_additive')}</p>
          <ul><li><a href="https://www.geoportal.gov.pl/pl/usluga/uslugi-pobierania-wcs/" target="_blank" rel="noopener">GUGiK NMT · WCS · PL-KRON86-NH</a></li>
          <li><a href="https://www.hec.usace.army.mil/confluence/rasdocs/rmum/latest/geometry-data/storage-areas" target="_blank" rel="noopener">USACE: terrain and storage areas</a></li>
          <li><a href="https://eprints.whiterose.ac.uk/id/eprint/104376/" target="_blank" rel="noopener">Holden et al. (2017): ditch blocking</a></li></ul>
          <button type="button" class="btn" data-pond-methods>${t('pond_full_method')}</button>
        </details><p class="barrier-status">${t('pond_uncertainty')}</p>`);
    el.querySelector('.barrier-close').onclick = clear;
    el.querySelector('[data-pond-methods]')?.addEventListener('click', () => onMethods?.());
    el.querySelector('.pond-retry')?.addEventListener('click', loadSelected);
    el.querySelector('[name="fillHeight"]')?.addEventListener('change', (e) => {
      height = Number(e.target.value); paint(); render(); fit();
      el.querySelector('[name="fillHeight"]').focus({ preventScroll: true });
    });
    const input = el.querySelector('[name="overflowHead"]');
    if (input) {
      const update = () => {
        const result = el.querySelector('.pond-overflow');
        try {
          if (!input.validity.valid || input.value === '') throw Error('invalid');
          head = Number(input.value);
          result.innerHTML = row(t('pond_crest_q'), `${fmt(overflowLps(stage.overflow_width_m, head), 1)} L/s`);
        } catch { result.innerHTML = `<p role="alert">${t('pond_q_invalid')}</p>`; }
      };
      input.addEventListener('input', update); update();
    }
  }

  async function loadSelected() {
    const sequence = ++request, id = selected?.properties.id;
    failure = false; render();
    try {
      const data = await metadata();
      if (sequence !== request || selected?.properties.id !== id) return;
      site = data.sites[id];
      if (!site?.proposed || !site.stages?.length) throw Error('missing terrain site');
      render(); fit();
    } catch {
      if (sequence !== request) return;
      failure = true; site = null; render();
    }
  }

  map.on('click', 'barriers', (e) => {
    if (isPicking()) return;
    const feature = e.features[0];
    document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
    document.querySelector('[data-tab="layers"]').click();
    selected = feature; site = null; height = 0.6; head = 0.1;
    el.hidden = false; document.body.classList.add('barrier-selected'); paint(); el.scrollTop = 0;
    loadSelected();
  });
  map.on('mouseenter', 'barriers', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'barriers', () => { map.getCanvas().style.cursor = ''; });
  map.on('styledata', () => {
    if (selected && map.getLayoutProperty('barriers', 'visibility') === 'none') clear();
  });
  return { clear, refresh: render };
}
