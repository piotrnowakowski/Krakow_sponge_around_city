import { t } from './i18n.js';

// The same panels serve desktop and mobile; only their presentation changes.
export function initMobile({ map, switchTab, startReport, startTour, setBasemap }) {
  const media = matchMedia('(max-width: 820px)');
  const sidebar = document.getElementById('sidebar');
  const content = document.getElementById('mobile-sheet-content');
  const toggle = document.getElementById('mobile-sheet-toggle');
  const title = document.getElementById('mobile-sheet-title');
  const subtitle = document.getElementById('mobile-sheet-subtitle');
  let expanded = false;
  let menu = false;
  let tab = 'layers';

  function update() {
    document.body.classList.toggle('mobile-sheet-open', expanded);
    document.body.classList.toggle('mobile-menu-open', menu);
    content.inert = media.matches && !expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
    title.dataset.i18n = !expanded ? 'mobile_explore' : menu ? 'mobile_more' : tab === 'reports' ? 'mobile_saved_reports' : `tab_${tab}`;
    subtitle.dataset.i18n = expanded ? 'mobile_back_map' : 'mobile_explore_hint';
    title.textContent = t(title.dataset.i18n);
    subtitle.textContent = t(subtitle.dataset.i18n);
    document.getElementById('mobile-map').setAttribute('aria-current', !expanded ? 'page' : 'false');
    document.getElementById('mobile-more').setAttribute('aria-current', menu && expanded ? 'page' : 'false');
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
    else { expanded = true; menu = true; update(); }
  });
  document.getElementById('mobile-report').addEventListener('click', startReport);
  document.getElementById('mobile-tour').addEventListener('click', () => { collapse(); startTour(); });
  document.querySelectorAll('[data-mobile-tab]').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.mobileTab));
  });
  document.getElementById('mobile-basemap').addEventListener('change', (event) => setBasemap(event.target.value));
  document.addEventListener('app:tab-change', (event) => {
    tab = event.detail;
    expanded = true;
    menu = false;
    update();
  });
  document.addEventListener('app:report-pick', collapse);
  document.addEventListener('app:report-stop', update);
  document.addEventListener('app:language-change', update);
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
