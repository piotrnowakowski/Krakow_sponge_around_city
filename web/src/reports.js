// Citizen reports: observations of ditches, streams, springs and culverts, kept in localStorage.
// No backend: reports leave the browser only as a GeoJSON download or a prefilled GitHub issue.
import maplibregl from 'maplibre-gl';
import { t, fmt } from './i18n.js';

const KEY = 'ks_reports_v1';
const REPO = 'https://github.com/piotrnowakowski/Krakow_sponge_around_city';
const SITE = 'https://piotrnowakowski.github.io/Krakow_sponge_around_city/';
const MAX_ISSUE_URL = 7800; // GitHub rejects much longer /issues/new URLs
const PHOTO_PX = 480;

export const REPORT_TYPES = ['ditch', 'stream', 'spring', 'culvert'];
export const REPORT_STATUS = ['flowing', 'standing', 'dry', 'blocked'];
export const STATUS_COLORS = { flowing: '#2563eb', standing: '#0891b2', dry: '#b45309', blocked: '#15803d' };

// Fictional reports for trying the feature out. Always flagged and labelled as examples,
// never exported or sent.
const EXAMPLES = [
  { lng: 19.9562, lat: 50.2312, type: 'stream', status: 'dry', note: 'example_note_1' },
  { lng: 19.7046, lat: 50.1395, type: 'ditch', status: 'standing', note: 'example_note_2' },
  { lng: 19.8274, lat: 50.2068, type: 'spring', status: 'flowing', note: 'example_note_3' },
];

let reports = load();
let ctx = null; // { map, catchments, onChange, switchTab }
let picking = false;
let pendingType = null;
let visible = true;
let locationRequest = 0;
let pendingDraft = null;

export const isPicking = () => picking;
export const getReports = () => reports;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(reports));
    return true;
  } catch {
    toast(t('rep_quota'));
    return false;
  }
}

const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function inRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function catchmentAt(lng, lat) {
  for (const f of ctx?.catchments?.features || []) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    if (polys.some(([outer, ...holes]) => inRing([lng, lat], outer) && !holes.some((h) => inRing([lng, lat], h)))) {
      return f.properties.id;
    }
  }
  return null;
}

const catchmentName = (id) => ctx?.catchments?.features.find((f) => f.properties.id === id)?.properties.name || t('rep_outside');

function toGeojson({ withPhotos = true, examples = false } = {}) {
  return {
    type: 'FeatureCollection',
    name: 'krakow_sponge_citizen_reports',
    source: SITE,
    features: reports
      .filter((r) => examples || !r.example)
      .map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [+r.lng.toFixed(5), +r.lat.toFixed(5)] },
        properties: {
          id: r.id,
          feature_type: r.type,
          status: r.status,
          date: r.date,
          note: r.note || '',
          catchment: r.catchment,
          has_photo: Boolean(r.photo),
          ...(withPhotos && r.photo ? { photo_jpeg_data_url: r.photo } : {}),
          ...(r.example ? { example: true } : {}),
          created: r.created,
        },
      })),
  };
}

// Map source shown on the map, including examples (flagged so the layer can label them).
function mapGeojson() {
  return {
    type: 'FeatureCollection',
    features: reports.map((r) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: { id: r.id, status: r.status, example: Boolean(r.example), label: r.example ? t('rep_example_tag') : '' },
    })),
  };
}

// Re-render the map source (example labels are translated).
export function refreshReportLayer() {
  ctx?.map.getSource('reports')?.setData(mapGeojson());
}

function refresh() {
  refreshReportLayer();
  ctx?.onChange();
}

function setVisible(on) {
  visible = on;
  if (!ctx.map.getLayer('reports')) return;
  for (const id of ['reports', 'reports-label']) ctx.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
}

export function addReportLayers(map) {
  map.addSource('reports', { type: 'geojson', data: mapGeojson() });
  map.addLayer({
    id: 'reports', type: 'circle', source: 'reports',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 7, 15, 10],
      'circle-color': ['match', ['get', 'status'], ...Object.entries(STATUS_COLORS).flat(), '#666'],
      'circle-opacity': ['case', ['get', 'example'], 0.55, 1],
      'circle-stroke-color': ['case', ['get', 'example'], '#111827', '#ffffff'],
      'circle-stroke-width': 2.5,
    },
  });
  map.addLayer({
    id: 'reports-label', type: 'symbol', source: 'reports', filter: ['get', 'example'],
    layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-offset': [0, 1.3], 'text-anchor': 'top' },
    paint: { 'text-color': '#111827', 'text-halo-color': '#fff', 'text-halo-width': 1.5 },
  });

  const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '280px' });
  map.on('click', 'reports', (e) => {
    if (picking) return;
    const r = reports.find((x) => x.id === e.features[0].properties.id);
    if (!r) return;
    popup.setLngLat([r.lng, r.lat]).setHTML(reportCard(r, true)).addTo(map);
    popup.getElement().querySelector('[data-del]')?.addEventListener('click', () => {
      if (removeReport(r.id)) popup.remove();
    });
  });
  map.on('mouseenter', 'reports', () => (map.getCanvas().style.cursor = 'pointer'));
  map.on('mouseleave', 'reports', () => (map.getCanvas().style.cursor = picking ? 'crosshair' : ''));
}

export function initReports(options) {
  ctx = options;
  ctx.map.on('click', (e) => {
    if (!picking) return;
    stopPicking();
    openForm({ lng: e.lngLat.lng, lat: e.lngLat.lat, type: pendingType, draft: pendingDraft });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && picking) {
      e.preventDefault();
      cancelPicking();
    }
  });
  document.getElementById('report-fab').addEventListener('click', () => startPicking());
}

// ---------- picking a location ----------

export function startPicking(type = null, { locate = true, draft = null } = {}) {
  locationRequest++;
  pendingType = type;
  pendingDraft = draft;
  picking = true;
  document.body.classList.add('report-picking');
  document.dispatchEvent(new Event('app:report-pick'));
  ctx.map.getCanvas().style.cursor = 'crosshair';
  const bar = document.getElementById('pick-bar');
  bar.innerHTML = `<span class="pick-status">${t('rep_pick_hint')}</span>
    <button type="button" class="pick-loc">${t('rep_my_location')}</button>
    <button type="button" class="pick-cancel">${t('cancel')}</button>`;
  bar.hidden = false;
  bar.querySelector('.pick-cancel').addEventListener('click', cancelPicking);
  bar.querySelector('.pick-loc').addEventListener('click', useMyLocation);
  bar.querySelector('.pick-loc').focus();
  if (locate) useMyLocation();
}

function stopPicking() {
  locationRequest++;
  picking = false;
  document.body.classList.remove('report-picking');
  ctx.map.getCanvas().style.cursor = '';
  document.getElementById('pick-bar').hidden = true;
  document.dispatchEvent(new Event('app:report-stop'));
}

function cancelPicking() {
  stopPicking();
  if (pendingDraft) openForm({ ...pendingDraft, draft: pendingDraft });
  else document.getElementById(matchMedia('(max-width: 820px)').matches ? 'mobile-report' : 'report-fab').focus();
}

function useMyLocation() {
  const request = ++locationRequest;
  const bar = document.getElementById('pick-bar');
  const button = bar.querySelector('.pick-loc');
  const status = bar.querySelector('.pick-status');
  const fail = (error) => {
    if (!picking || request !== locationRequest) return;
    button.disabled = false;
    status.textContent = t(error?.code === 1 ? 'rep_geo_denied' : error?.code === 3 ? 'rep_geo_timeout' : 'rep_geo_fail');
  };
  if (!navigator.geolocation || !window.isSecureContext) return fail();
  button.disabled = true;
  status.textContent = t('rep_geo_loading');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!picking || request !== locationRequest) return;
      stopPicking();
      const { longitude: lng, latitude: lat } = pos.coords;
      ctx.map.flyTo({ center: [lng, lat], zoom: Math.max(ctx.map.getZoom(), 14) });
      openForm({ lng, lat, type: pendingType, accuracy: pos.coords.accuracy, draft: pendingDraft });
    },
    fail,
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
  );
}

// ---------- form ----------

async function thumbnail(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_PX / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.toDataURL('image/jpeg', 0.72);
}

const chips = (name, values, checked, color) =>
  values
    .map(
      (v) => `<label class="chip">
        <input type="radio" name="${name}" value="${v}" ${v === checked ? 'checked' : ''} required />
        <span>${color ? `<i class="dot" style="--c:${color[v]}"></i>` : ''}${t(`rep_${name}_${v}`)}</span>
      </label>`,
    )
    .join('');

export function openForm({ lng, lat, type = null, accuracy = null, draft = null }) {
  stopPicking();
  const dialog = document.getElementById('report-dialog');
  const catchment = catchmentAt(lng, lat);
  let photo = draft?.photo ?? null;
  dialog.innerHTML = `
    <form method="dialog" class="report-form">
      <h2 id="rd-title">${t('rep_form_title')}</h2>
      <p class="rd-where">📍 ${fmt(lat, 5)}, ${fmt(lng, 5)} · ${esc(catchmentName(catchment))}</p>
      <div class="rd-location"><span>${t(accuracy == null ? 'rep_location_map' : 'rep_location_browser', { m: fmt(accuracy, 0) })}</span><button type="button" class="btn ghost" data-change-location>${t('rep_change_location')}</button></div>
      ${catchment === 'dlubnia' ? `<p class="rd-gap">${t('rep_dlubnia_gap')}</p>` : ''}
      <fieldset><legend>${t('rep_type')}</legend><div class="chips">${chips('type', REPORT_TYPES, type)}</div></fieldset>
      <fieldset><legend>${t('rep_status')}</legend><div class="chips">${chips('status', REPORT_STATUS, null, STATUS_COLORS)}</div></fieldset>
      <div class="rd-row">
        <label>${t('rep_date')}<input type="date" name="date" value="${today()}" max="${today()}" required /></label>
        <label class="rd-photo">${t('rep_photo')}<input type="file" name="photo" accept="image/*" capture="environment" /></label>
      </div>
      <img class="rd-preview" alt="${t('rep_photo_preview')}" hidden />
      <label>${t('rep_note')}<textarea name="note" rows="3" maxlength="500" placeholder="${t('rep_note_ph')}"></textarea></label>
      <p class="fine">${t('rep_privacy')}</p>
      <p class="rd-error" role="alert" hidden></p>
      <div class="rd-actions">
        <button type="button" class="btn ghost" value="cancel">${t('cancel')}</button>
        <button type="submit" class="btn primary" value="save">${t('rep_save')}</button>
      </div>
    </form>`;

  const form = dialog.querySelector('form');
  const preview = form.querySelector('.rd-preview');
  const error = form.querySelector('.rd-error');
  if (draft) {
    for (const name of ['type', 'status', 'date', 'note']) {
      if (draft[name]) form.elements.namedItem(name).value = draft[name];
    }
    if (photo) { preview.src = photo; preview.hidden = false; }
  }
  form.querySelector('[data-change-location]').addEventListener('click', () => {
    const data = new FormData(form);
    const savedDraft = { lng, lat, accuracy, photo, ...Object.fromEntries(['type', 'status', 'date', 'note'].map((key) => [key, data.get(key)])) };
    dialog.close();
    startPicking(data.get('type'), { locate: false, draft: savedDraft });
  });
  form.photo.addEventListener('change', async () => {
    const file = form.photo.files[0];
    photo = null;
    preview.hidden = true;
    if (!file) return;
    try {
      photo = await thumbnail(file);
      preview.src = photo;
      preview.hidden = false;
    } catch {
      error.textContent = t('rep_photo_fail');
      error.hidden = false;
    }
  });
  form.querySelector('[value=cancel]').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const report = {
      id: uid(),
      lng,
      lat,
      catchment,
      type: data.get('type'),
      status: data.get('status'),
      date: data.get('date'),
      note: String(data.get('note') || '').trim(),
      photo,
      created: new Date().toISOString(),
    };
    reports.push(report);
    if (!save()) {
      // Most likely the photo pushed localStorage over its quota: keep the report without it.
      report.photo = null;
      if (!save()) {
        reports.pop();
        return;
      }
    }
    dialog.close();
    refresh();
    ctx.switchTab('reports');
    toast(t('rep_saved'));
  });

  dialog.showModal();
  (form.querySelector('input[name=type]:checked') ? form.querySelector('input[name=status]') : form.querySelector('input[name=type]')).focus();
}

// ---------- list, export, send ----------

function removeReport(id) {
  if (!confirm(t('rep_confirm_delete'))) return false;
  reports = reports.filter((r) => r.id !== id);
  save();
  refresh();
  return true;
}

function reportCard(r, withDelete = false) {
  return `<div class="rep-card">
    ${r.example ? `<span class="tag-example">${t('rep_example_tag')}</span>` : ''}
    <h4><i class="dot" style="--c:${STATUS_COLORS[r.status]}"></i>${t(`rep_type_${r.type}`)} · ${t(`rep_status_${r.status}`)}</h4>
    <p class="rep-meta">${r.date} · ${esc(catchmentName(r.catchment))}</p>
    ${r.note ? `<p class="rep-note">${esc(r.example ? t(r.note) : r.note)}</p>` : ''}
    ${r.photo ? `<img src="${r.photo}" alt="${t('rep_photo_alt', { type: t(`rep_type_${r.type}`) })}" />` : ''}
    ${withDelete ? `<button type="button" class="btn small" data-del>${t('delete')}</button>` : ''}
  </div>`;
}

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/geo+json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function issueUrl(list) {
  // Newest first; drop the oldest until the URL fits. Photos never go into the URL.
  const sorted = [...list].sort((a, b) => b.created.localeCompare(a.created));
  for (let n = sorted.length; n > 0; n--) {
    const subset = sorted.slice(0, n);
    const ids = new Set(subset.map((r) => r.id));
    const geo = toGeojson({ withPhotos: false });
    geo.features = geo.features.filter((f) => ids.has(f.properties.id));
    const rows = subset
      .map((r, i) => `| ${i + 1} | ${r.date} | ${r.type} | ${r.status} | ${catchmentName(r.catchment)} | ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)} | ${(r.note || '').replace(/[|\n\r]+/g, ' ').slice(0, 120)} |`)
      .join('\n');
    const skipped = sorted.length - n;
    const photos = subset.filter((r) => r.photo).length;
    const body = [
      `Citizen observations sent from [Kraków Sponge](${SITE}).`,
      '',
      '| # | Date | Feature | Status | Catchment | Lat, lon | Note |',
      '|---|---|---|---|---|---|---|',
      rows,
      '',
      photos ? `${photos} report(s) have a photo. Photos do not fit in this link: please drag them into this issue, or attach the exported GeoJSON file.` : '',
      skipped ? `${skipped} older report(s) did not fit in this link: please attach the exported GeoJSON file.` : '',
      '',
      '<details><summary>GeoJSON</summary>',
      '',
      '```json',
      JSON.stringify(geo),
      '```',
      '</details>',
    ]
      .filter((l, i, a) => l !== '' || a[i - 1] !== '')
      .join('\n');
    const title = `Citizen report: ${n} observation${n > 1 ? 's' : ''} (${subset.at(-1).date}${n > 1 ? ` to ${subset[0].date}` : ''})`;
    const url = `${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    if (url.length <= MAX_ISSUE_URL) return url;
  }
  return `${REPO}/issues/new`;
}

export function renderReportsPanel(el) {
  const mine = reports.filter((r) => !r.example);
  const examples = reports.filter((r) => r.example);
  const sorted = [...reports].sort((a, b) => b.created.localeCompare(a.created));
  el.innerHTML = `
    <p class="intro">${t('rep_intro')}</p>
    <div class="why-grid">
      <div><b>${t('rep_why_gauge_t')}</b><span>${t('rep_why_gauge')}</span></div>
      <div><b>${t('rep_why_ditch_t')}</b><span>${t('rep_why_ditch')}</span></div>
    </div>
    <div class="rep-actions">
      <button type="button" class="btn primary" data-act="add">＋ ${t('rep_add')}</button>
      <button type="button" class="btn" data-act="locate">📍 ${t('rep_my_location')}</button>
    </div>
    <ol class="steps">
      <li>${t('rep_step1')}</li>
      <li>${t('rep_step2')}</li>
      <li>${t('rep_step3')}</li>
    </ol>

    <h3>${t('rep_mine', { n: mine.length })}</h3>
    <label class="switch rep-toggle">
      <input type="checkbox" data-act="toggle" ${visible ? 'checked' : ''} />
      <span class="track"><span class="thumb"></span></span>
      <span>${t('rep_show_layer')}</span>
    </label>
    <ul class="swatches rep-legend" aria-label="${t('rep_status')}">
      ${REPORT_STATUS.map((k) => `<li><i class="sw-dot" style="--c:${STATUS_COLORS[k]}"></i>${t(`rep_status_${k}`)}</li>`).join('')}
    </ul>
    ${sorted.length ? '' : `<p class="empty">${t('rep_empty')}</p>`}
    <ul class="rep-list">
      ${sorted
        .map(
          (r) => `<li>${reportCard(r)}
            <div class="rep-item-actions">
              <button type="button" class="btn small" data-zoom="${r.id}">${t('rep_show')}</button>
              <button type="button" class="btn small" data-del="${r.id}" aria-label="${t('delete')}: ${t(`rep_type_${r.type}`)} ${r.date}">${t('delete')}</button>
            </div></li>`,
        )
        .join('')}
    </ul>

    <div class="rep-actions">
      <button type="button" class="btn" data-act="export" ${mine.length ? '' : 'disabled'}>⬇ ${t('rep_export')}</button>
      <button type="button" class="btn primary" data-act="send" ${mine.length ? '' : 'disabled'}>${t('rep_send')}</button>
    </div>
    <p class="fine">${t('rep_send_note')}</p>

    <details class="more">
      <summary>${t('rep_examples_summary')}</summary>
      <p class="fine">${t('rep_examples_text')}</p>
      <button type="button" class="btn small" data-act="${examples.length ? 'clear-examples' : 'examples'}">
        ${examples.length ? t('rep_examples_remove') : t('rep_examples_add')}
      </button>
    </details>`;

  const on = (sel, fn) => el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => fn(b)));
  el.querySelector('[data-act=toggle]').addEventListener('change', (e) => setVisible(e.target.checked));
  on('[data-act=add]', () => startPicking());
  on('[data-act=locate]', () => startPicking());
  on('[data-act=export]', () => download(`krakow-sponge-reports-${today()}.geojson`, JSON.stringify(toGeojson(), null, 1)));
  on('[data-act=send]', () => window.open(issueUrl(mine), '_blank', 'noopener'));
  on('[data-act=examples]', () => {
    reports.push(...EXAMPLES.map((x, i) => ({ ...x, id: `example-${i}`, example: true, catchment: catchmentAt(x.lng, x.lat), date: today(), created: new Date(Date.now() - i).toISOString(), photo: null })));
    save();
    refresh();
  });
  on('[data-act=clear-examples]', () => {
    reports = reports.filter((r) => !r.example);
    save();
    refresh();
  });
  on('[data-zoom]', (b) => {
    const r = reports.find((x) => x.id === b.dataset.zoom);
    ctx.map.flyTo({ center: [r.lng, r.lat], zoom: Math.max(ctx.map.getZoom(), 14) });
  });
  on('[data-del]', (b) => removeReport(b.dataset.del));
}

// ---------- toast ----------

let toastTimer;
export function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 4500);
}
