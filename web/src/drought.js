import Chart from 'chart.js/auto';
import { t, fmt, ordinal, getLang } from './i18n.js';
import { escapeHtml } from './ui.js';

const charts = [];
const RED = '#e63946';
const BAND = 'rgba(43, 108, 176, 0.14)';
const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  pl: ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'],
};

Chart.defaults.font.family = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'system-ui';
Chart.defaults.font.size = 11;
Chart.defaults.color = '#4a5568';

function dayOfYear(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5) + 1;
}

function doyLabel(doy) {
  const d = new Date(Date.UTC(2025, 0, doy));
  return `${d.getUTCDate()} ${MONTHS[getLang()][d.getUTCMonth()]}`;
}

const line = (label, data, color, extra = {}) => ({
  label, data, borderColor: color, backgroundColor: color, borderWidth: 1.5, pointRadius: 0, tension: 0.2, ...extra,
});

function flowChart(canvas, s) {
  const labels = s.daily_last_365.map(([d]) => d);
  const env = labels.map((d) => s.doy_envelope_1991_2020[dayOfYear(d)] || {});
  const flat = (v) => labels.map(() => v);
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        line(t('s_range'), env.map((e) => e.p10), 'transparent', { fill: false }),
        line(t('s_range'), env.map((e) => e.p90), 'transparent', { fill: '-1', backgroundColor: BAND }),
        line(t('s_median'), env.map((e) => e.median), '#2b6cb0', { borderDash: [4, 3], borderWidth: 1 }),
        line(t('s_snq'), flat(s.thresholds.SNQ), RED, { borderDash: [6, 4], borderWidth: 1.5 }),
        line(t('s_nnq'), flat(s.thresholds.NNQ), '#7f1d1d', { borderDash: [2, 3], borderWidth: 1.5 }),
        line(t('s_flow'), s.daily_last_365.map(([, q]) => q), '#111827', { borderWidth: 2 }),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 7,
            callback(v) {
              const d = new Date(`${labels[v]}T00:00:00Z`);
              return `${MONTHS[getLang()][d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
            },
          },
          grid: { display: false },
        },
        y: { type: 'logarithmic', title: { display: true, text: t('m3s') }, ticks: { callback: (v) => (String(v).match(/^[125]|^0\.[125]/) ? v : '') } },
      },
      plugins: {
        legend: { labels: { boxWidth: 14, filter: (item, data) => item.datasetIndex !== 0 } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y, 2)} ${t('m3s')}` } },
      },
    },
  });
}

function rankChart(canvas, s, year) {
  const years = [...s.years].sort((a, b) => a.year - b.year);
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: years.map((y) => y.year),
      datasets: [{
        data: years.map((y) => y.mean_q),
        backgroundColor: years.map((y) => (y.year === year ? RED : y.year === year - 1 ? '#f4a261' : '#cbd5e1')),
        borderRadius: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${fmt(c.parsed.y, 2)} ${t('m3s')}` } } },
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 90, autoSkip: true, maxTicksLimit: 12 } }, y: { title: { display: true, text: t('m3s') } } },
    },
  });
}

function cwbChart(canvas, c, year) {
  const doys = Array.from({ length: 365 }, (_, i) => i + 1);
  const n = c.cum_cwb.normal;
  const toMap = (pairs) => Object.fromEntries(pairs);
  const cur = toMap(c.cum_cwb[String(year)]);
  const prev = toMap(c.cum_cwb[String(year - 1)]);
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: doys,
      datasets: [
        line(t('s_range'), doys.map((d) => n[d]?.p10), 'transparent'),
        line(t('s_range'), doys.map((d) => n[d]?.p90), 'transparent', { fill: '-1', backgroundColor: BAND }),
        line(t('s_mean'), doys.map((d) => n[d]?.mean), '#2b6cb0', { borderDash: [4, 3], borderWidth: 1 }),
        line(String(year - 1), doys.map((d) => prev[d]), '#f4a261', { borderWidth: 1.5 }),
        line(String(year), doys.map((d) => cur[d]), RED, { borderWidth: 2.5 }),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { ticks: { maxTicksLimit: 12, callback: (v) => doyLabel(doys[v]) }, grid: { display: false } },
        y: { title: { display: true, text: t('mm') } },
      },
      plugins: {
        legend: { labels: { boxWidth: 14, filter: (item) => item.datasetIndex !== 0 } },
        tooltip: { callbacks: { title: (items) => doyLabel(doys[items[0].dataIndex]), label: (x) => `${x.dataset.label}: ${fmt(x.parsed.y, 0)} mm` } },
      },
    },
  });
}

function monthChart(canvas, c, year) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: c.monthly.map((m) => MONTHS[getLang()][m.month - 1] + (m.partial ? '*' : '')),
      datasets: [
        { label: t('dr_normal'), data: c.monthly.map((m) => m.normal), backgroundColor: '#cbd5e1', borderRadius: 2 },
        { label: String(year), data: c.monthly.map((m) => m.p), backgroundColor: c.monthly.map((m) => (m.pct < 75 ? RED : '#2b6cb0')), borderRadius: 2 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { boxWidth: 14 } }, tooltip: { callbacks: { label: (x) => `${x.dataset.label}: ${fmt(x.parsed.y, 0)} mm` } } },
      scales: { x: { grid: { display: false } }, y: { title: { display: true, text: t('mm') } } },
    },
  });
}

const OUR_AREAS = /Rudaw|Prądnik|Dłubni/;

function warningsHtml(list, live, generated) {
  const isOurs = (w) => w.areas.some((a) => OUR_AREAS.test(a));
  const item = (w) => `<li class="${isOurs(w) ? 'ours' : ''}"><b>${w.event}</b> · ${w.areas
    .map((a) => a.replace(/^małopolskie, /, '').replace(/, susza hydrologiczna$/, ''))
    .join('; ')}<small>${t('dr_since')} ${w.from.slice(0, 10)}</small></li>`;
  const ours = list.filter(isOurs);
  const rest = list.filter((w) => !isOurs(w));
  const src = live ? t('dr_warnings_live') : t('dr_warnings_snapshot', { date: generated.slice(0, 10) });
  return `<h3>${t('dr_warnings')} <small class="src">${src}</small></h3>
    <ul class="warnings">${list.length ? ours.map(item).join('') : `<li>${t('dr_none')}</li>`}</ul>
    ${rest.length ? `<details class="more"><summary>${t('dr_more_warnings', { n: rest.length })}</summary><ul class="warnings">${rest.map(item).join('')}</ul></details>` : ''}`;
}

export function renderDroughtPanel(el, drought, catchStats, { liveWarnings, selection = {} } = {}) {
  const scroll = el.scrollTop;
  const active = el.contains(document.activeElement) ? { id: document.activeElement.id, station: document.activeElement.dataset.station } : null;
  const opened = [...el.querySelectorAll('details[open]')].map((d) => d.id);
  charts.splice(0).forEach((c) => c.destroy());
  const year = drought.year;
  const stations = Object.values(drought.stations);
  const station = drought.stations[selection.station] || stations[0];
  selection.station = station.code;
  const climateIds = Object.keys(drought.climate);

  const rankText = (s) =>
    s.rank_driest_since_1991 === 1
      ? t('dr_rank_1')
      : t('dr_rank_n', { n: s.rank_driest_since_1991, ord: ordinal(s.rank_driest_since_1991) });

  el.innerHTML = `
    <p class="intro">${t('dr_intro')}</p>
    <div class="kpis">
      ${stations
        .map(
          (s) => `
        <button class="kpi ${s.code === station.code ? 'active' : ''}" data-station="${s.code}" style="--accent:${catchStats[s.catchment].color}">
          <span class="kpi-river">${s.river} · ${s.name}</span>
          <strong>${rankText(s)}</strong>
          <span>${t('dr_days_below', { n: s.days_below_snq, year })}</span>
        </button>`,
        )
        .join('')}
      <div class="kpi muted" style="--accent:${catchStats.dlubnia.color}">
        <span class="kpi-river">Dłubnia</span>
        <span>${t('dr_no_gauge')}</span>
      </div>
    </div>
    <p class="fine">${t('dr_window', { window: station.year_window })}</p>

    <h3>${t('dr_flow_title')}: ${station.river} (${station.name})</h3>
    <p class="sub">${t('dr_flow_sub')}</p>
    <div class="chart tall"><canvas id="c-flow"></canvas></div>

    <h3>${t('dr_rank_title')}</h3>
    <div class="chart"><canvas id="c-rank"></canvas></div>

    <div class="row-head">
      <h3>${t('dr_cwb_title')}</h3>
      <select id="climate-select" aria-label="${t('catchment')}">
        ${climateIds.map((id) => `<option value="${id}">${catchStats[id].name}</option>`).join('')}
      </select>
    </div>
    <p class="sub">${t('dr_cwb_sub')}</p>
    <div class="climate-kpis" id="climate-kpis"></div>
    <div class="chart tall"><canvas id="c-cwb"></canvas></div>
    <h3 id="month-title"></h3>
    <div class="chart"><canvas id="c-month"></canvas></div>

    <div id="warnings">${warningsHtml(liveWarnings || drought.warnings, Boolean(liveWarnings), drought.generated)}</div>
    <p class="fine">${t('updated', { date: drought.generated.replace('T', ' ').slice(0, 16) })} UTC · IMGW-PIB, ERA5 (Open-Meteo)</p>`;

  charts.push(flowChart(el.querySelector('#c-flow'), station));
  charts.push(rankChart(el.querySelector('#c-rank'), station, year));

  const climateCharts = [];
  const showClimate = (id) => {
    for (const c of climateCharts.splice(0)) {
      c.destroy();
      charts.splice(charts.indexOf(c), 1);
    }
    const c = drought.climate[id];
    const s = c.summary;
    el.querySelector('#climate-kpis').innerHTML = `
      <div><span>${t('dr_rain')}</span><b>${fmt(s.p_ytd_mm, 0)} mm</b><small>${fmt(s.p_ytd_pct, 0)}% ${t('dr_normal')}</small></div>
      <div class="${s.cwb_ytd_mm < s.cwb_ytd_normal_mm ? 'bad' : ''}"><span>${t('dr_balance')}</span><b>${fmt(s.cwb_ytd_mm, 0)} mm</b><small>${t('dr_normal')} ${fmt(s.cwb_ytd_normal_mm, 0)} mm</small></div>
      <div class="${s.soil_moisture_anomaly_pct < 0 ? 'bad' : ''}"><span>${t('dr_soil')}</span><b>${s.soil_moisture_anomaly_pct > 0 ? '+' : ''}${fmt(s.soil_moisture_anomaly_pct, 0)}%</b><small>${c.data_until}</small></div>`;
    el.querySelector('#month-title').textContent = t('dr_month_title', { year });
    climateCharts.push(cwbChart(el.querySelector('#c-cwb'), c, year));
    climateCharts.push(monthChart(el.querySelector('#c-month'), c, year));
    charts.push(...climateCharts);
    climateCharts.forEach(accessibleChart);
  };
  const select = el.querySelector('#climate-select');
  select.addEventListener('change', () => { selection.climate = select.value; showClimate(select.value); });
  selection.climate = selection.climate in drought.climate ? selection.climate : station.catchment in drought.climate ? station.catchment : climateIds[0];
  showClimate(selection.climate);
  select.value = selection.climate;

  el.querySelectorAll('[data-station]').forEach((b) =>
    b.addEventListener('click', () => {
      selection.station = b.dataset.station;
      renderDroughtPanel(el, drought, catchStats, { liveWarnings, selection });
    }),
  );
  charts.slice(0, 2).forEach(accessibleChart);
  for (const id of opened) { const d = el.querySelector(`#${id}`); if (d) d.open = true; }
  if (active?.id) el.querySelector(`#${active.id}`)?.focus({ preventScroll: true });
  else if (active?.station) el.querySelector(`[data-station="${active.station}"]`)?.focus({ preventScroll: true });
  el.scrollTop = scroll;
}

function accessibleChart(chart) {
  const canvas = chart.canvas, id = canvas.id;
  const labels = { 'c-flow': 'dr_flow_title', 'c-rank': 'dr_rank_title', 'c-cwb': 'dr_cwb_title', 'c-month': 'dr_month_title' };
  const title = t(labels[id], { year: new Date().getFullYear() });
  const units = id === 'c-flow' || id === 'c-rank' ? 'm³/s' : 'mm';
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${title}. ${t('chart_description')}`);
  canvas.setAttribute('aria-describedby', `${id}-description`);
  let details = document.getElementById(`${id}-data`);
  if (!details) { details = document.createElement('details'); details.className = 'chart-data'; details.id = `${id}-data`; canvas.parentElement.after(details); }
  const datasets = chart.data.datasets;
  details.innerHTML = `<summary>${t('chart_data')} · ${units}</summary><p id="${id}-description">${escapeHtml(title)} · ${units}. ${t('chart_description')}</p>
    <div class="table-scroll" tabindex="0" role="region" aria-label="${escapeHtml(title)}"><table><caption>${escapeHtml(title)} (${units})</caption><thead><tr><th scope="col">${t('chart_date')}</th>
    ${datasets.map((d, i) => `<th scope="col">${escapeHtml(d.label ?? t('chart_value'))}${d.label === t('s_range') ? ` (${i === 0 ? 'P10' : 'P90'})` : ''}</th>`).join('')}</tr></thead><tbody>
    ${chart.data.labels.map((label, i) => `<tr><th scope="row">${escapeHtml(id === 'c-cwb' ? doyLabel(label) : label)}</th>${datasets.map((d) => `<td>${d.data[i] == null ? t('chart_missing') : fmt(d.data[i], 3)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export { fetchLiveWarnings, fetchLiveGauges } from './gauges.js';
