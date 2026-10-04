import { t, getLang } from './i18n.js';

// The same panels serve desktop and mobile; only their presentation changes.
export function initMobile({ map, switchTab, startReport, startTour, setBasemap, selectTopic, getView, onMenuOpen }) {
  const media = matchMedia('(max-width: 820px)');
  const sidebar = document.getElementById('sidebar');
  const content = document.getElementById('mobile-sheet-content');
  const toggle = document.getElementById('mobile-sheet-toggle');
  const title = document.getElementById('mobile-sheet-title');
  let expanded = false;
  let menu = false;
  let tab = 'layers';

  function update() {
    document.body.classList.toggle('mobile-sheet-open', expanded);
    document.body.classList.toggle('mobile-menu-open', menu);
    content.inert = media.matches && !expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
    title.dataset.i18n = !expanded ? 'mobile_explore' : menu ? 'mobile_more' : document.body.classList.contains('barrier-selected') ? 'pond_title' : tab === 'reports' ? 'mobile_saved_reports' : `tab_${tab}`;
    title.textContent = t(title.dataset.i18n);
    document.getElementById('mobile-more').setAttribute('aria-expanded', String(menu && expanded));
    document.getElementById('mobile-language').value = getLang();
    const view = getView();
    const topic = view === 'rivers' ? 'rivers' : ['ditches', 'barriers'].includes(view) ? 'retention' : view === 'monitoring' ? 'drought' : null;
    document.querySelectorAll('[data-topic]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.topic === topic)));
    map.resize();
  }
  function collapse() {
    expanded = false;
    menu = false;
    update();
  }
  toggle.addEventListener('click', () => {
    if (expanded) collapse();
    else switchTab('layers');
  });
  document.getElementById('mobile-map').addEventListener('click', collapse);
  document.getElementById('mobile-more').addEventListener('click', () => {
    if (expanded && menu) collapse();
    else { onMenuOpen(); expanded = true; menu = true; update(); }
  });
  document.getElementById('mobile-report').addEventListener('click', startReport);
  document.getElementById('mobile-tour').addEventListener('click', () => { collapse(); startTour(); });
  document.querySelectorAll('[data-mobile-tab]').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.mobileTab));
  });
  document.getElementById('mobile-basemap').addEventListener('change', (event) => setBasemap(event.target.value));
  document.getElementById('mobile-language').addEventListener('change', (event) => document.querySelector(`[data-lang="${event.target.value}"]`).click());
  document.querySelectorAll('[data-topic]').forEach((button) => button.addEventListener('click', () => {
    selectTopic(button.dataset.topic);
    if (button.dataset.topic !== 'drought') collapse();
  }));
  document.addEventListener('app:tab-change', (event) => {
    tab = event.detail;
    expanded = true;
    menu = false;
    update();
  });
  document.addEventListener('app:report-pick', collapse);
  document.addEventListener('app:report-stop', update);
  document.addEventListener('app:language-change', update);
  document.addEventListener('app:view-change', update);
  document.addEventListener('app:barrier-change', update);
  document.querySelector('.skip').addEventListener('click', () => {
    if (media.matches) { expanded = true; update(); sidebar.focus(); }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && media.matches && expanded && !document.querySelector('dialog[open]')) {
      collapse();
      toggle.focus();
    }
  });
  media.addEventListener('change', update);
  update();
}
