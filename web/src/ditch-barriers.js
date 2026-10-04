import { t, fmt } from './i18n.js';
import { overflowLps, pondFilter, OVERVIEW_HEIGHT, pondFitPadding, scenarioUrl } from './ponding.js';
import { fetchJson, escapeHtml, downloadJson, bindSheetToggle, closeSheet } from './ui.js';
import { datasetState, loadDataset } from './datasets.js';
import { selectView } from './views.js';
import { isPicking } from './reports.js';

const DATA = new URL(`${import.meta.env.BASE_URL}data/`, document.baseURI).href;
const row = (label, value) => `<div class="barrier-row"><span>${label}</span><strong>${value}</strong></div>`;
const volume = (v) => v == null ? '—' : `≈ ${fmt(v, 1)} m³`;

export function bindBarrierUI(map, { state, stats, onSelect, onMethods }) {
  const el = document.createElement('section');
  el.id = 'barrier-detail'; el.hidden = true;
  document.querySelector('.sheet-content').append(el);
  let selected = null, site = null, height = OVERVIEW_HEIGHT, head = '0.1', failure = false, request = 0, dataPromise;
  let sharing = false;
  let drafts = {}, storageAvailable = true, search = '', catchment = '', returnTarget = null;
  const storageKey = 'sponge:ponding-drafts:v1';
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) drafts = saved; }
  catch { storageAvailable = false; }
  const save = () => {
    if (!selected) return;
    drafts[selected.properties.id] = { height, head };
    try { localStorage.setItem(storageKey, JSON.stringify(drafts)); } catch { storageAvailable = false; }
    if (new URLSearchParams(location.hash.slice(1)).has('site')) {
      const url = scenarioUrl(location.href, selected.properties.id, height, head);
      if (url.href !== location.href) history.replaceState(history.state, '', url.href);
    }
  };
  const metadata = () => dataPromise ??= fetchJson(`${DATA}ditch-ponding-meta.json`)
    .catch((error) => { dataPromise = null; throw error; });

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

  function clear(restoreFocus = true) {
    if (!selected) return;
    save(); request++; selected = null; site = null; failure = false; sharing = false; el.hidden = true;
    const url = new URL(location.href), params = new URLSearchParams(url.hash.slice(1));
    if (params.has('site')) {
      for (const key of ['site', 'height', 'head']) params.delete(key);
      url.hash = params.toString(); history.replaceState(history.state, '', url.href);
    }
    document.body.classList.remove('barrier-selected'); paint();
    closeSheet(map);
    document.dispatchEvent(new Event('app:barrier-change'));
    const candidateTarget = returnTarget?.dataset.candidate && [...document.querySelectorAll('[data-candidate]')].find((b) => b.dataset.candidate === returnTarget.dataset.candidate);
    if (restoreFocus) (returnTarget?.isConnected ? returnTarget : candidateTarget || document.querySelector('[data-view="barriers"]'))?.focus({ preventScroll: true });
  }

  function fit() {
    if (!selected) return;
    const canvas = map.getCanvas();
    const padding = pondFitPadding(canvas.clientWidth, canvas.clientHeight);
    const bounds = site?.stages.find((s) => s.height_m === height)?.bounds;
    if (bounds) map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
      { padding, maxZoom: 17.5, duration: 400 });
    else if (selected) map.easeTo({ center: selected.geometry.coordinates, zoom: 17, duration: 400 });
  }

  function render() {
    if (!selected) return;
    const scroll = el.scrollTop;
    const focusHeading = document.activeElement === el.querySelector('h2');
    const opened = [...el.querySelectorAll('details[open]')].map((d) => d.dataset.disclosure);
    el.setAttribute('aria-label', t('pond_title'));
    const stage = site?.stages.find((s) => s.height_m === height);
    el.innerHTML = `<div class="detail-toolbar"><button class="barrier-close" type="button">← ${t('barrier_close')}</button><button class="sheet-toggle" type="button"></button></div>
      <p class="barrier-tag">${t('pond_source')} · ${escapeHtml(stats[selected.properties.catchment]?.name ?? selected.properties.catchment)}</p><h2 tabindex="-1">${t('pond_title')}</h2>
      <p class="fine">${escapeHtml(selected.properties.id)} · ${selected.geometry.coordinates.map((n) => Number(n).toFixed(5)).join(', ')}</p>
      <p>${t('pond_intro')}</p>` + (!stage
      ? `<p class="barrier-status" role="status">${t(failure ? 'pond_error' : 'pond_loading')}</p>${failure ? `<button class="pond-retry" type="button">${t('pond_retry')}</button>` : ''}`
      : `<label class="pond-height">${t('pond_height')}
          <select name="fillHeight">${site.stages.map((s) => `<option value="${s.height_m}" ${s.height_m === height ? 'selected' : ''}>${fmt(s.height_m)} m</option>`).join('')}</select>
        </label>
        <div class="pond-kpis" aria-live="polite">
          <div class="barrier-kpi"><strong>${fmt(stage.area_m2, 0)} m²</strong><span>${t('pond_footprint')}</span></div>
          <div class="barrier-kpi"><strong>${volume(stage.additional_capacity_m3)}</strong><span>${t('pond_capacity')}</span></div>
        </div>
        <div class="pond-depth-key"><span style="--c:#7dd3fc">${t('pond_shallow')}</span><span style="--c:#2196d2">${t('pond_medium')}</span><span style="--c:#075985">${t('pond_deep')}</span><span style="--c:#8c4cbb">${t('pond_patch')}</span><span style="--c:#536575">${t('barrier_downstream')}</span></div>
        <details class="barrier-evidence" data-disclosure="balance"><summary>${t('detail_values')}</summary>
        ${row(t('pond_mean'), `${fmt(stage.mean_depth_m * 100, 1)} cm`)}
        ${row(t('pond_max'), `${fmt(stage.max_depth_m * 100, 1)} cm`)}
        ${row(t('pond_total'), volume(stage.volume_m3))}
        ${row(t('pond_natural'), volume(stage.natural_depression_m3))}
        ${row(t('pond_clearance'), stage.building_clearance_m == null ? '—' : `${fmt(stage.building_clearance_m, 0)} m`)}
        ${row(t('pond_level'), `${fmt(stage.water_elevation_m, 2)} m NH`)}</details>
        <p class="barrier-status ${stage.limiter !== 'crest' ? 'warning' : ''}">${t(stage.empty ? 'pond_empty' : stage.limiter === 'crest' ? 'pond_crest_limit' : stage.limiter === 'drain' ? 'pond_drain_limit' : 'pond_edge_limit')}</p>
        ${!stage.empty && !stage.building_screen_pass ? `<p class="barrier-status warning">${t('pond_near_building')}</p>` : ''}
        <p class="pop-note">${t('pond_capacity_note')}</p>
        <p>${t('pond_assumption', { width: fmt(site.patch_width_m), length: fmt(site.patch_length_m) })}</p>
        <details class="barrier-inputs" data-disclosure="outflow"><summary>${t('pond_outflow')}</summary>
          <p>${t('pond_below')}</p>
          <label class="pond-head">${t('pond_head')}<input name="overflowHead" type="number" inputmode="decimal" min="0" max="0.3" step="any" value="${escapeHtml(head)}" aria-describedby="head-help head-error" required /></label>
          <p id="head-help" class="fine">${t('input_error')}</p><p id="head-error" class="field-error" role="alert" hidden></p>
          <div class="pond-overflow" aria-live="polite"></div><p class="pop-note">${t('pond_q_note')}</p>
        </details>
        <details class="barrier-evidence" data-disclosure="compare"><summary>${t('stage_comparison')}</summary>
          <table class="scenario-table"><caption>${t('stage_comparison')}</caption><thead><tr><th scope="col">${t('pond_height')}</th><th scope="col">m²</th><th scope="col">${t('pond_capacity')} (m³)</th></tr></thead><tbody>
          ${site.stages.map((s) => `<tr${s.height_m === height ? ' class="selected-stage"' : ''}><th scope="row">${fmt(s.height_m)} m${s.height_m === height ? ' ✓' : ''}</th><td>${fmt(s.area_m2, 0)}</td><td>${s.additional_capacity_m3 == null ? '—' : fmt(s.additional_capacity_m3, 1)}</td></tr>`).join('')}</tbody></table></details>
        <div class="scenario-actions"><button data-reset>${t('reset_scenario')}</button><button data-share>${t('share_scenario')}</button><button data-export>${t('export_scenario')}</button></div>
        <p class="draft-status fine" role="status">${t(storageAvailable ? 'draft_saved' : 'draft_session')}</p><p class="fine">${t('save_note')}</p>
        <div class="share-panel" ${sharing ? '' : 'hidden'}><label>${t('share_link')}<input type="text" readonly name="scenarioLink" /></label><button data-copy>${t('copy_link')}</button><p class="copy-status" role="status"></p></div>
        <details class="barrier-evidence" data-disclosure="method"><summary>${t('pond_method')}</summary>
          <p>${t('pond_method_text')}</p><p>${t('pond_not_additive')}</p>
          <ul><li><a href="https://www.geoportal.gov.pl/pl/usluga/uslugi-pobierania-wcs/" target="_blank" rel="noopener">GUGiK NMT · WCS · PL-KRON86-NH</a></li>
          <li><a href="https://www.hec.usace.army.mil/confluence/rasdocs/rmum/latest/geometry-data/storage-areas" target="_blank" rel="noopener">USACE: terrain and storage areas</a></li>
          <li><a href="https://eprints.whiterose.ac.uk/id/eprint/104376/" target="_blank" rel="noopener">Holden et al. (2017): ditch blocking</a></li></ul>
        </details><button class="btn" data-open-methods>${t('pond_method')}</button><p class="barrier-status">${t('pond_uncertainty')}</p>`);
    el.querySelector('.barrier-close').onclick = () => clear();
    el.querySelector('[data-open-methods]')?.addEventListener('click', onMethods);
    bindSheetToggle(el.querySelector('.sheet-toggle'), map, fit);
    el.querySelector('.pond-retry')?.addEventListener('click', loadSelected);
    el.querySelector('[name="fillHeight"]')?.addEventListener('change', (e) => {
      height = Number(e.target.value); save(); paint(); render(); fit();
      el.querySelector('[name="fillHeight"]').focus({ preventScroll: true });
    });
    const input = el.querySelector('[name="overflowHead"]');
    const updateShare = () => {
      const valid = input?.validity.valid && input.value !== '';
      const field = el.querySelector('[name="scenarioLink"]');
      if (!field) return;
      field.value = valid && sharing ? scenarioUrl(location.href, selected.properties.id, height, head).href : '';
      el.querySelector('[data-copy]').disabled = !valid;
      el.querySelector('.copy-status').textContent = '';
    };
    if (input) {
      const update = () => {
        const result = el.querySelector('.pond-overflow');
        const error = el.querySelector('#head-error');
        head = input.value; save();
        try {
          if (!input.validity.valid || input.value === '') throw Error('invalid');
          result.innerHTML = row(t('pond_crest_q'), `${fmt(overflowLps(stage.overflow_width_m, Number(head)), 1)} L/s`);
          error.hidden = true; error.textContent = ''; input.setAttribute('aria-invalid', 'false');
        } catch { result.textContent = ''; error.hidden = false; error.textContent = t('input_error'); input.setAttribute('aria-invalid', 'true'); }
        el.querySelectorAll('[data-share],[data-export]').forEach((b) => { b.disabled = input.getAttribute('aria-invalid') === 'true'; });
        el.querySelector('.draft-status').textContent = t(storageAvailable ? 'draft_saved' : 'draft_session');
        updateShare();
      };
      input.addEventListener('input', update); update();
    }
    el.querySelector('[data-reset]')?.addEventListener('click', () => { height = OVERVIEW_HEIGHT; head = '0.1'; save(); paint(); render(); fit(); el.querySelector('[name="fillHeight"]').focus(); });
    el.querySelector('[data-share]')?.addEventListener('click', () => {
      sharing = true; updateShare();
      el.querySelector('.share-panel').hidden = false; const field = el.querySelector('[name="scenarioLink"]'); field.focus(); field.select();
    });
    el.querySelector('[data-copy]')?.addEventListener('click', async () => {
      const field = el.querySelector('[name="scenarioLink"]'), status = el.querySelector('.copy-status'), value = field.value;
      if (!value || el.querySelector('[data-copy]').disabled) return;
      const report = (key) => { if (status.isConnected && field.value === value) status.textContent = t(key); };
      try { await navigator.clipboard.writeText(value); report('copied'); }
      catch { report('copy_failed'); }
    });
    el.querySelector('[data-export]')?.addEventListener('click', () => downloadJson(`${selected.properties.id}-scenario.json`, {
      version: 1, site_id: selected.properties.id, coordinates: selected.geometry.coordinates, catchment: selected.properties.catchment,
      assumptions: { fill_height_m: height, overflow_head_m: Number(head), patch_width_m: site.patch_width_m, patch_length_m: site.patch_length_m },
      terrain: { resolution_m: site.resolution_m, vertical_datum: site.vertical_datum }, result: stage,
      crest_only_overflow_lps: overflowLps(stage.overflow_width_m, Number(head)),
      sources: ['https://www.geoportal.gov.pl/pl/usluga/uslugi-pobierania-wcs/'], limitations: [t('scenario_notice'), t('pond_capacity_note'), t('pond_q_note'), t('pond_uncertainty')],
    }));
    for (const d of el.querySelectorAll('details')) d.open = opened.includes(d.dataset.disclosure);
    el.scrollTop = scroll;
    if (focusHeading) el.querySelector('h2').focus({ preventScroll: true });
  }

  async function loadSelected() {
    const sequence = ++request, id = selected?.properties.id;
    failure = false; render();
    try {
      const data = await metadata();
      if (sequence !== request || selected?.properties.id !== id) return;
      site = data.sites[id];
      if (!site?.proposed || !site.stages?.length) throw Error('missing terrain site');
      if (!site.stages.some((s) => s.height_m === height)) height = OVERVIEW_HEIGHT;
      render(); paint(); fit();
    } catch {
      if (sequence !== request) return;
      failure = true; site = null; render();
    }
  }

  function select(feature, target = document.activeElement, shared = null) {
    save(); onSelect(); returnTarget = target;
    document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove());
    selected = feature; site = null; sharing = false;
    const draft = shared ?? drafts[feature.properties.id];
    height = Number.isFinite(draft?.height) ? draft.height : OVERVIEW_HEIGHT;
    head = typeof draft?.head === 'string' ? draft.head : '0.1';
    el.hidden = false; document.body.classList.add('barrier-selected'); paint(); el.scrollTop = 0;
    document.dispatchEvent(new Event('app:barrier-change'));
    render(); el.querySelector('h2').focus({ preventScroll: true }); loadSelected();
  }
  map.on('click', 'barriers', (e) => { if (!isPicking()) select(e.features[0]); });
  map.on('mouseenter', 'barriers', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'barriers', () => { map.getCanvas().style.cursor = ''; });
  map.on('styledata', () => {
    if (selected && map.getLayoutProperty('barriers', 'visibility') === 'none') clear();
  });
  function renderList() {
    const list = document.getElementById('candidate-browser'); if (!list) return;
    list.hidden = !state.barriers; if (list.hidden) return;
    const data = datasetState(map, 'ditch-ponding-sites');
    if (list.dataset.lang !== document.documentElement.lang || !list.querySelector('[name="candidateSearch"]')) {
      list.dataset.lang = document.documentElement.lang;
      list.innerHTML = `<h2>${t('candidate_title')}</h2><label>${t('candidate_search')}<input type="search" name="candidateSearch" value="${escapeHtml(search)}" /></label>
        <label>${t('candidate_filter')}<select name="candidateCatchment"><option value="">${t('all_catchments')}</option>${Object.entries(stats).map(([id, s]) => `<option value="${id}"${id === catchment ? ' selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select></label>
        <p class="candidate-count" role="status"></p><ul class="candidate-results"></ul>`;
      list.querySelector('[name="candidateSearch"]').oninput = (e) => { search = e.target.value; renderList(); };
      list.querySelector('[name="candidateCatchment"]').onchange = (e) => { catchment = e.target.value; renderList(); };
    }
    const all = data?.data?.features ?? [];
    const filtered = all.map((feature, index) => ({ feature, index })).filter(({ feature: f }) => (!catchment || f.properties.catchment === catchment)
      && `${stats[f.properties.catchment]?.name} ${f.properties.id} ${f.geometry.coordinates.map((x) => Number(x).toFixed(5)).join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    list.querySelector('.candidate-count').textContent = data?.status === 'error' ? t('data_error') : data?.status !== 'ready' ? t('data_loading') : t('candidate_count', { n: filtered.length });
    list.querySelector('.candidate-results').innerHTML = filtered.map(({ feature: f, index }) => `<li><button data-candidate="${escapeHtml(f.properties.id)}"><strong>${escapeHtml(t('candidate_label', { name: stats[f.properties.catchment]?.name, n: index + 1 }))}</strong>
      <span>${f.geometry.coordinates.map((x) => Number(x).toFixed(5)).join(', ')}</span><span>${t('candidate_clearance', { m: fmt(f.properties.building_clearance_m, 0) })}</span></button></li>`).join('')
      || (data?.status === 'ready' ? `<li>${t('candidate_none')}</li>` : '');
    list.querySelectorAll('[data-candidate]').forEach((b) => b.onclick = () => select(all.find((f) => f.properties.id === b.dataset.candidate), b));
  }
  async function openShared() {
    const params = new URLSearchParams(location.hash.slice(1)), id = params.get('site'); if (!id) return;
    const data = await loadDataset(map, 'ditch-ponding-sites'); const feature = data?.features.find((f) => f.properties.id === id);
    if (!feature) return;
    selectView(map, state, 'barriers'); document.querySelector('[data-view="barriers"]')?.click();
    const rawHead = params.get('head') ?? '0.1';
    // Preserve incomplete edits on reload too; the form validates them before sharing/export.
    select(feature, null, { height: Number(params.get('height') || OVERVIEW_HEIGHT), head: rawHead });
  }
  return { clear, renderList, openShared, refresh: () => { render(); renderList(); } };
}
