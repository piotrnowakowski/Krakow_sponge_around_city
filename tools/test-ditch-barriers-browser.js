// Usage: node tools/test-ditch-barriers-browser.js [url] [output-directory]
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch } from './check.mjs';

const url = process.argv[2] || 'http://127.0.0.1:5421/';
const output = resolve(process.argv[3] || 'output/ponding-release');
mkdirSync(output, { recursive: true });
async function verify(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const check = (v, message) => { if (!v) throw Error(message); };
  const select = async () => {
    await page.locator('[data-tab="layers"]').click();
    await page.locator('[data-view="barriers"]').click();
    const c = await page.evaluate(async () => {
      const d = await (await fetch('data/ditch-ponding-sites.json')).json();
      const f = d.features.find((f) => f.properties.id === 'db-2fe2fcd75029');
      window.__map.resize(); window.__map.jumpTo({ center: f.geometry.coordinates, zoom: 16 });
      return f.geometry.coordinates;
    });
    await page.waitForFunction((c) => document.querySelector('#loading').hidden && !window.__map.isMoving()
      && window.__map.queryRenderedFeatures(window.__map.project(c), { layers: ['barriers'] }).length > 0, c);
    const point = await page.evaluate((c) => {
      const p = window.__map.project(c), r = window.__map.getCanvas().getBoundingClientRect();
      return { x: p.x + r.x, y: p.y + r.y };
    }, c);
    await page.mouse.click(point.x, point.y);
    await page.locator('[name="fillHeight"]').waitFor();
    await page.waitForFunction(() => !window.__map.isMoving()
      && window.__map.queryRenderedFeatures({ layers: ['pond-depth'] }).length > 0);
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('ks_tour_seen', '1'));
  await page.goto(url);
  await page.waitForFunction(() => window.__map?.getLayer('pond-depth') && document.querySelector('[data-view="barriers"]'));
  await page.locator('[data-lang="en"]').click();
  await select();
  check((await page.locator('.pond-kpis').innerText()).includes('2,594'), 'Wrong terrain footprint');
  await page.screenshot({ path: resolve(output, 'desktop.png') });
  await page.locator('[name="fillHeight"]').selectOption('0.2');
  check((await page.locator('.pond-kpis').innerText()).includes('253 m²'), 'Area did not change with height');
  check(await page.evaluate(() => JSON.stringify(window.__map.getFilter('pond-depth')).includes('0.2')), 'Polygon height stale');
  await page.locator('[name="fillHeight"]').selectOption('1');
  check((await page.locator('.pond-kpis').innerText()).includes('2,594'), 'Bypass limit not applied');
  check((await page.locator('#barrier-detail').innerText()).includes('remaining drainage limits'), 'No bypass explanation');
  await page.locator('.barrier-inputs summary').click();
  await page.locator('[name="overflowHead"]').fill('-1');
  check(await page.locator('[role="alert"]').isVisible(), 'Invalid head accepted');
  await page.locator('[name="overflowHead"]').fill('0.1');
  await page.locator('[data-lang="pl"]').click();
  check((await page.locator('#barrier-detail').innerText()).includes('Woda zatrzymana wokół rowu'), 'Missing Polish');
  check(await page.locator('[name="fillHeight"]').inputValue() === '1', 'Language reset height');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[name="fillHeight"]').selectOption('0.6');
  await page.waitForFunction(() => !window.__map.isMoving());
  check(await page.evaluate(() => window.__map.queryRenderedFeatures({ layers: ['pond-depth'] }).length > 0), 'Mobile pond outside visible map');
  check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Mobile horizontal overflow');
  await page.screenshot({ path: resolve(output, 'mobile.png') });
  await page.locator('.barrier-evidence summary').click();
  await page.locator('[data-pond-methods]').click();
  check(await page.locator('#panel-about').evaluate(el => el.classList.contains('active')), 'Methods navigation failed');
  check(await page.locator('#barrier-detail').isHidden(), 'Candidate hides methods');
  const method = page.locator('#ponding-calculation');
  check((await method.innerText()).includes('istniejąca retencja'), 'Missing Polish baseline subtraction');
  await method.scrollIntoViewIfNeeded();
  check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Mobile methods overflow');
  await page.screenshot({ path: resolve(output, 'methods-mobile.png') });
  await page.locator('[data-lang="en"]').click();
  check((await method.innerText()).includes('existing depression storage'), 'Missing English baseline subtraction');
  check((await method.innerText()).includes('remaining drainage stays open'), 'Missing open-drain explanation');
  await method.locator('summary').filter({ hasText: 'Water leaving' }).click();
  check((await method.innerText()).includes('does not estimate total site discharge'), 'Overflow overclaimed');
  check(await page.locator('.method-sources a[href*="geometry-data/storage-areas"]').count() === 1, 'Missing terrain-storage reference');
  check(!(await page.locator('.methods-section').innerText()).includes('low notch'), 'Old notch model still displayed');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await method.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, 'methods-desktop.png') });
  await select();
  await page.locator('.barrier-close').click();
  await page.locator('[data-view="manual"]').click();
  await page.locator('.layer[data-id="barriers"] .layer-name').click();
  check(await page.evaluate(() => ['pond-depth', 'pond-outline', 'pond-patch', 'barriers']
    .every(id => window.__map.getLayoutProperty(id, 'visibility') === 'none')), 'Incomplete overlay hide');
  await page.locator('.layer[data-id="barriers"] .layer-name').click();
  await page.locator('[data-tab="catchments"]').click();
  await page.locator('[data-zoom="rudawa"]').click();
  check(await page.evaluate(() => window.__map.getLayoutProperty('pond-depth', 'visibility')) === 'none', 'Focus leaks pond');
  await page.locator('[data-tab="layers"]').click();
  check(await page.evaluate(() => window.__map.getLayoutProperty('pond-depth', 'visibility')) === 'visible', 'Focus restore failed');
  // Metadata failure must not leave an old numerical result in the detail pane.
  await page.route('**/ditch-ponding-meta.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.reload();
  await page.waitForFunction(() => window.__map?.getLayer('barriers') && document.querySelector('[data-view="barriers"]'));
  await page.locator('[data-lang="en"]').click();
  await page.locator('[data-view="barriers"]').click();
  const coordinate = await page.evaluate(async () => {
    const d = await (await fetch('data/ditch-ponding-sites.json')).json();
    window.__map.jumpTo({ center: d.features[0].geometry.coordinates, zoom: 16 });
    return d.features[0].geometry.coordinates;
  });
  await page.waitForFunction(c => document.querySelector('#loading').hidden
    && window.__map.queryRenderedFeatures(window.__map.project(c), { layers: ['barriers'] }).length > 0, coordinate);
  const position = await page.evaluate(c => { const p = window.__map.project(c), r = window.__map.getCanvas().getBoundingClientRect(); return { x: p.x + r.x, y: p.y + r.y }; }, coordinate);
  await page.mouse.click(position.x, position.y);
  await page.locator('.pond-retry').waitFor();
  check(await page.locator('.pond-kpis').count() === 0, 'Stale metrics on failure');
  await page.unroute('**/ditch-ponding-meta.json');
  await page.locator('.pond-retry').click();
  await page.locator('.pond-kpis').waitFor();
  check(errors.length === 0, errors.join('; '));
  return { desktop: 'pass', mobile: 'pass', language: 'EN/PL', methods: 'terrain formulas, baseline, open drainage, sources', geometry: 'height changes, bypass cap', failures: 'metadata retry', pageErrors: errors };
};

const browser = await launch();
try {
  const page = await browser.newPage();
  const result = await verify(page);
  writeFileSync(resolve(output, 'checks.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
