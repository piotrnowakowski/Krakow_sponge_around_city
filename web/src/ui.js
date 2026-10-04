import { t } from './i18n.js';

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function fetchJson(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

export function downloadJson(name, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function bindSheetToggle(button, map, onResize) {
  const sync = () => {
    const expanded = document.body.classList.contains('detail-expanded');
    button.textContent = t(expanded ? 'show_map' : 'expand_detail');
    button.setAttribute('aria-expanded', String(expanded));
  };
  button.onclick = () => { document.body.classList.toggle('detail-expanded'); sync(); map.resize(); onResize?.(); };
  sync();
}

export function closeSheet(map) {
  document.body.classList.remove('detail-expanded'); map.resize();
}
