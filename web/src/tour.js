// Five steps: drought -> catchments -> ditches -> constraints -> calculated bends.
// Numbers come from the data files, so the text follows the daily drought refresh.
import { t, fmt, ordinal } from './i18n.js';
import { getRetention } from './scenario.js';
import { defaultProposal, meanderEmptyMessage } from './meanders.js';
import { methodsTitle } from './methods.js';

const SEEN = 'ks_tour_seen';
let ctx = null;
let step = 0;

function rankText(s) {
  return s.rank_driest_since_1991 === 1 ? t('tour_rank_1') : t('tour_rank_n', { ord: ordinal(s.rank_driest_since_1991) });
}

function plantHours(volume, ref) {
  const [lo, hi] = ref.production_m3_day;
  return { h1: fmt((volume / hi) * 24, 0), h2: fmt((volume / lo) * 24, 0) };
}

function steps() {
  const { stats, drought } = ctx;
  const stations = Object.values(drought.stations);
  const pradnik = stations.find((s) => s.catchment === 'pradnik');
  const rudawa = stations.find((s) => s.catchment === 'rudawa');
  const clim = drought.climate.rudawa?.summary || Object.values(drought.climate)[0].summary;
  const area = Object.values(stats).reduce((a, s) => a + s.area_km2, 0);
  const ditchKm = Object.values(stats).reduce((a, s) => a + s.ditches_km, 0);
  const ret = getRetention();
  const r = ret?.catchments.rudawa;
  const room = stats.pradnik.corridor_room_km;
  const roomTotal = (room.open || 0) + (room.partial || 0) + (room.constrained || 0);
  const proposal = defaultProposal()?.properties;
  return [
    {
      title: t('tour1_title'),
      text: t('tour1_text', {
        p_rank: rankText(pradnik), p_days: pradnik.days_below_snq,
        r_rank: rankText(rudawa), r_days: rudawa.days_below_snq,
        rain: fmt(clim.p_ytd_pct, 0), cwb: fmt(clim.cwb_ytd_mm, 0), normal: fmt(clim.cwb_ytd_normal_mm, 0),
      }),
      go: () => ctx.show({ tab: 'drought', view: 'monitoring', fit: 'all' }),
    },
    {
      title: t('tour2_title'),
      text: t('tour2_text', { area: fmt(area, 0) }),
      go: () => ctx.show({ tab: 'catchments', view: 'rivers', fit: 'all' }),
    },
    {
      title: t('tour3_title'),
      text: t('tour3_text', {
        km: fmt(ditchKm, 0), n: r?.high_count ?? '–', vol: fmt(Math.round((r?.high_volume_m3 ?? 0) / 100) * 100, 0),
        ...(r ? plantHours(r.high_volume_m3, ret.reference) : { h1: '–', h2: '–' }),
      }),
      go: () => ctx.show({ tab: 'layers', view: 'ditches', center: [19.548, 50.127], zoom: 13.2, basemap: 'relief' }),
    },
    {
      title: t('tour4_title'),
      text: t('tour4_text', { open: fmt(room.open || 0, 0), total: fmt(roomTotal, 0) }),
      go: () => ctx.show({ tab: 'layers', view: 'corridors', center: [19.915, 50.115], zoom: 12.4, basemap: 'light' }),
    },
    {
      title: t('tour5_title'),
      text: proposal ? t('tour5_text', {
        current: fmt(proposal.current_m, 0), proposed: fmt(proposal.proposed_m, 0),
        extra: fmt(proposal.extra_pct, 1), offset: fmt(proposal.max_offset_m, 0),
      }) : meanderEmptyMessage(),
      go: () => ctx.show({ tab: 'layers', view: 'corridors', meander: true, basemap: 'light' }),
      last: true,
    },
  ];
}

function render() {
  const el = document.getElementById('tour');
  const list = steps();
  const s = list[step];
  el.innerHTML = `
    <div class="tour-head">
      <span class="tour-count">${t('tour_step', { i: step + 1, n: list.length })}</span>
      <button type="button" class="tour-x" aria-label="${t('tour_close')}">×</button>
    </div>
    <h2 id="tour-title" tabindex="-1">${s.title}</h2>
    <p>${s.text}</p>
    ${s.last ? `<button type="button" class="tour-methods" data-tour="methods">${methodsTitle()} →</button>` : ''}
    <div class="tour-dots" aria-hidden="true">${list.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>
    <div class="tour-nav">
      ${step ? `<button type="button" class="btn ghost" data-tour="back">${t('tour_back')}</button>` : '<span></span>'}
      ${s.last
        ? `<button type="button" class="btn primary" data-tour="report">${t('tour_cta')}</button>`
        : `<button type="button" class="btn primary" data-tour="next">${t('tour_next')}</button>`}
    </div>`;
  el.hidden = false;
  el.querySelector('.tour-x').addEventListener('click', closeTour);
  el.querySelector('[data-tour=back]')?.addEventListener('click', () => goTo(step - 1));
  el.querySelector('[data-tour=next]')?.addEventListener('click', () => goTo(step + 1));
  el.querySelector('[data-tour=report]')?.addEventListener('click', () => {
    closeTour();
    ctx.show({ tab: 'reports' });
  });
  el.querySelector('[data-tour=methods]')?.addEventListener('click', () => {
    closeTour();
    ctx.onMethods();
  });
  el.querySelector('#tour-title').focus({ preventScroll: true });
}

function goTo(i) {
  step = i;
  steps()[step].go();
  render();
}

export function closeTour() {
  document.getElementById('tour').hidden = true;
  localStorage.setItem(SEEN, '1');
  document.getElementById('tour-btn')?.focus({ preventScroll: true });
}

export function startTour() {
  document.getElementById('tour-invite').hidden = true;
  goTo(0);
}

// Re-render the open tour in the current language.
export function refreshTour() {
  if (ctx && !document.getElementById('tour').hidden) render();
  if (ctx && !document.getElementById('tour-invite').hidden) invite();
}

function invite() {
  const el = document.getElementById('tour-invite');
  el.innerHTML = `<p><b>${t('tour_invite_title')}</b> ${t('tour_invite')}</p>
    <div class="tour-nav">
      <button type="button" class="btn ghost" data-inv="no">${t('tour_dismiss')}</button>
      <button type="button" class="btn primary" data-inv="yes">${t('tour_start')}</button>
    </div>`;
  el.hidden = false;
  el.querySelector('[data-inv=yes]').addEventListener('click', startTour);
  el.querySelector('[data-inv=no]').addEventListener('click', () => {
    el.hidden = true;
    localStorage.setItem(SEEN, '1');
  });
}

export function initTour(options) {
  ctx = options;
  document.getElementById('tour-btn').addEventListener('click', startTour);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('tour').hidden && !document.querySelector('dialog[open]')) closeTour();
  });
  if (!localStorage.getItem(SEEN) && !new URLSearchParams(location.search).has('notour')) invite();
}
