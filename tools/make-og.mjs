// Builds web/public/og.png (1200x630): a map capture of the app plus title and key numbers
// read from the data files. Usage: node make-og.mjs [url]
import { launch, ready } from './check.mjs';
import { readFileSync } from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:5291/';
const data = (n) => JSON.parse(readFileSync(`../web/public/data/${n}.json`, 'utf8'));
const drought = data('drought');
const st = Object.values(drought.stations);
const pr = st.find((s) => s.catchment === 'pradnik');
const ru = st.find((s) => s.catchment === 'rudawa');
const clim = drought.climate.rudawa.summary;
const ord = (n) => (n === 1 ? 'Lowest' : `${n}${['th', 'st', 'nd', 'rd'][n] || 'th'} lowest`);

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`${url}?notour`, { waitUntil: 'domcontentloaded' });
await ready(page);
await page.click('[data-view=ditches]');
await page.addStyleTag({ content: '.sidebar,.topbar,.basemaps,.legend,.report-fab,.maplibregl-ctrl,.focus-bar{display:none!important}' });
await page.evaluate(async () => {
  const map = window.__map;
  map.resize();
  map.fitBounds([[19.45, 50.03], [20.12, 50.36]], { padding: { left: 420, right: 10, top: 10, bottom: 10 }, duration: 0 });
  await new Promise((r) => map.once('idle', r));
});
await page.waitForTimeout(1500);
const mapPng = (await page.screenshot({ type: 'png' })).toString('base64');

await page.setContent(`<!doctype html><html><head><style>
  body { margin: 0; width: 1200px; height: 630px; font-family: 'Segoe UI', system-ui, sans-serif; }
  .card { position: relative; width: 1200px; height: 630px; background: url(data:image/png;base64,${mapPng}) center / cover; }
  .shade { position: absolute; inset: 0; background: linear-gradient(90deg, #0b2545 0%, #0b2545f2 36%, #0b254500 62%); }
  .text { position: absolute; left: 56px; top: 54px; width: 470px; color: #fff; }
  .brand { display: flex; align-items: center; gap: 14px; font-size: 22px; font-weight: 700; opacity: .95; }
  .drop { width: 46px; height: 46px; border-radius: 50%; background: #fff; display: grid; place-items: center; }
  h1 { font-size: 44px; line-height: 1.12; margin: 26px 0 14px; }
  p { font-size: 20px; line-height: 1.4; margin: 0 0 26px; opacity: .9; }
  .stats { display: grid; gap: 12px; }
  .stat { border-left: 5px solid #fbbf24; padding: 2px 0 2px 14px; font-size: 19px; }
  .stat b { color: #fbbf24; }
</style></head><body><div class="card"><div class="shade"></div><div class="text">
  <div class="brand"><span class="drop"><svg viewBox="0 0 32 32" width="30" height="30"><path d="M16 3C11 10 7 14.5 7 19.5a9 9 0 0 0 18 0C25 14.5 21 10 16 3z" fill="#1f78b4"/></svg></span>Kraków Sponge</div>
  <h1>The city's water starts in the hills around it</h1>
  <p>Drought dashboard and retention map for the rivers that feed Kraków.</p>
  <div class="stats">
    <div class="stat"><b>${ord(pr.rank_driest_since_1991)}</b> flow since 1991: Prądnik</div>
    <div class="stat"><b>${ord(ru.rank_driest_since_1991)}</b> flow since 1991: Rudawa</div>
    <div class="stat">Rain <b>${Math.round(clim.p_ytd_pct)}%</b> of normal, yet rivers at record lows</div>
  </div>
</div></div></body></html>`);
await page.screenshot({ path: '../web/public/og.png' });
await browser.close();
console.log('wrote web/public/og.png');
