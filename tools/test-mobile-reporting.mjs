// Local browser checks: mobile navigation and permission-dependent report locations.
// No observation is sent to a server. Browser location is simulated.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { launch, ready } from './check.mjs';

const url = process.argv[2] || 'http://127.0.0.1:5182/';
const out = new URL('../output/mobile-reporting/', import.meta.url);
mkdirSync(out, { recursive: true });
const browser = await launch();
const errors = [];
async function pageFor({ width = 390, height = 844, geo = 'granted' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, geolocation: { longitude: 19.97, latitude: 50.22, accuracy: 25 }, permissions: geo === 'granted' ? ['geolocation'] : [], locale: 'pl-PL' });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((mode) => {
    localStorage.setItem('lang', 'pl');
    if (mode === 'granted') {
      const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      window.geoCalls = 0;
      navigator.geolocation.getCurrentPosition = (...args) => { window.geoCalls++; original(...args); };
    } else if (mode === 'missing') {
      Object.defineProperty(navigator, 'geolocation', { value: undefined });
    } else {
      window.geoCalls = 0;
      navigator.geolocation.getCurrentPosition = (success, fail, options) => {
        window.geoCalls++;
        window.geoOptions = options;
        window.geoSuccess = success;
        window.geoFail = fail;
        if (mode === 'denied') fail({ code: 1 });
        if (mode === 'timeout') fail({ code: 3 });
      };
    }
  }, geo);
  await page.goto(url);
  await ready(page);
  return page;
}
async function shot(page, name) {
  await page.screenshot({ path: new URL(`${name}.png`, out).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
}
async function fill(page) {
  await page.locator('.chip:has([name=type][value=stream])').click();
  await page.locator('.chip:has([name=status][value=dry])').click();
  await page.locator('[name=note]').fill('Browser test, not a real observation.');
}
async function pickOnMap(page) {
  const box = await page.locator('#map').boundingBox();
  await page.mouse.click(box.x + box.width * .48, box.y + box.height * .35);
  await page.locator('#report-dialog[open]').waitFor();
}
try {
  for (const width of [320, 390, 768]) {
    const page = await pageFor({ width });
    assert.equal(await page.evaluate(() => window.geoCalls), 0, 'No location request on page load');
    assert.equal(await page.locator('#tour-invite').isVisible(), false);
    const map = await page.locator('#map').boundingBox();
    assert.ok(map.height > 600, `Map uses most of the viewport at ${width}px: ${map.height}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('.tabs').isVisible(), false);
    assert.equal(await page.locator('#report-fab').isVisible(), false);
    await shot(page, `${width}-map`);
    await page.locator('#mobile-sheet-toggle').click();
    await page.locator('[data-view=ditches]').click();
    assert.equal(await page.locator('[data-view=ditches]').getAttribute('aria-pressed'), 'true');
    await shot(page, `${width}-views`);
    await page.locator('#mobile-sheet-toggle').click();
    await page.locator('#mobile-more').click();
    for (const tab of ['catchments', 'drought', 'reports', 'about']) {
      await page.locator(`[data-mobile-tab=${tab}]`).click();
      assert.equal(await page.locator(`#panel-${tab}`).isVisible(), true);
      await page.locator('#mobile-more').click();
    }
    await shot(page, `${width}-more`);
    if (width === 390) {
      await page.locator('[data-mobile-tab=catchments]').click();
      await page.locator('[data-zoom=dlubnia]').click();
      assert.equal(await page.locator('#mobile-sheet-title').innerText(), 'Zlewnie');
      assert.equal(await page.locator('body').evaluate((el) => el.classList.contains('catchment-focused')), true);
      await page.locator('#mobile-more').click();
      await page.locator('[data-mobile-tab=about]').click();
      assert.equal(await page.locator('body').evaluate((el) => el.classList.contains('catchment-focused')), false);
    }
    await page.locator('#mobile-map').click();
    await page.locator('#mobile-basemap').selectOption('relief');
    assert.equal(await page.locator('[data-basemap=relief]').getAttribute('aria-pressed'), 'true');
    await page.locator('#mobile-basemap').selectOption('light');
    await page.locator('[data-lang=en]').click();
    assert.equal(await page.locator('#mobile-sheet-title').innerText(), 'Explore the map');
    await page.locator('[data-lang=pl]').click();
    await page.locator('#mobile-report').click();
    await page.locator('#report-dialog[open]').waitFor();
    assert.equal(await page.evaluate(() => window.geoCalls), 1);
    assert.match(await page.locator('.rd-where').innerText(), /50,22.*19,97/);
    assert.match(await page.locator('.rd-location').innerText(), /25 m/);
    await fill(page);
    if (width === 390) {
      const testPhoto = await page.screenshot({ clip: { x: 0, y: 0, width: 8, height: 8 } });
      await page.locator('[name=photo]').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: testPhoto });
      await page.locator('.rd-preview:not([hidden])').waitFor();
      await page.locator('[data-change-location]').click();
      await page.keyboard.press('Escape');
      await page.locator('#report-dialog[open]').waitFor();
      assert.equal(await page.locator('[name=note]').inputValue(), 'Browser test, not a real observation.');
    }
    await shot(page, `${width}-located-form`);
    await page.locator('[data-change-location]').click();
    assert.equal(await page.evaluate(() => window.geoCalls), 1, 'Manual correction must not request GPS');
    await pickOnMap(page);
    assert.equal(await page.locator('[name=note]').inputValue(), 'Browser test, not a real observation.');
    assert.equal(await page.locator('[name=type][value=stream]').isChecked(), true);
    await page.locator('[value=save]').click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ks_reports_v1')));
    assert.equal(stored.length, 1);
    assert.notEqual(stored[0].lat, 50.22, 'Correction changes saved coordinates');
    if (width === 390) assert.match(stored[0].photo, /^data:image\/jpeg/);
    await page.context().close();
    console.log(`${width}px: uncluttered map, navigation, basemaps, EN/PL, GPS and manual correction passed`);
  }

  for (const mode of ['denied', 'timeout', 'missing', 'pending']) {
    const page = await pageFor({ geo: mode });
    await page.locator('#mobile-report').click();
    await page.locator('#pick-bar:not([hidden])').waitFor();
    const status = await page.locator('.pick-status').innerText();
    assert.match(status, { denied: /Brak zgody/, timeout: /zbyt długo/, missing: /niedostępna/, pending: /Szukamy/ }[mode]);
    if (mode === 'timeout') {
      await page.locator('.pick-loc').click();
      assert.equal(await page.evaluate(() => window.geoCalls), 2, 'Retry requests another location');
    }
    if (mode === 'pending') {
      await page.locator('.pick-cancel').click();
      await page.evaluate(() => window.geoSuccess({ coords: { latitude: 50.22, longitude: 19.97, accuracy: 10 } }));
      assert.equal(await page.locator('#report-dialog').isVisible(), false, 'Cancelled GPS cannot reopen form');
      assert.equal(await page.evaluate(() => Math.round(window.__map.getCanvas().getBoundingClientRect().height) === Math.round(document.getElementById('map').getBoundingClientRect().height)), true, 'Map resizes after cancelling');
      await page.locator('#mobile-report').click();
    }
    await shot(page, `location-${mode}`);
    await pickOnMap(page);
    const before = await page.locator('.rd-where').innerText();
    if (mode === 'pending') {
      await page.evaluate(() => window.geoSuccess({ coords: { latitude: 1, longitude: 2, accuracy: 10 } }));
      assert.equal(await page.locator('.rd-where').innerText(), before, 'GPS cannot overwrite manual selection');
    }
    await fill(page);
    await page.locator('[value=save]').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ks_reports_v1')).length), 1);
    await page.context().close();
    console.log(`${mode}: manual fallback and stale-location safety passed`);
  }

  const desktop = await pageFor({ width: 1440, height: 900 });
  await desktop.locator('[data-inv=no]').click();
  assert.equal(await desktop.locator('.tabs').isVisible(), true);
  assert.equal(await desktop.locator('.mobile-nav').isVisible(), false);
  await desktop.locator('#report-fab').click();
  await desktop.locator('#report-dialog[open]').waitFor();
  await fill(desktop);
  await desktop.locator('[value=save]').click();
  const report = await desktop.evaluate(() => JSON.parse(localStorage.getItem('ks_reports_v1'))[0]);
  assert.equal(report.lng, 19.97);
  assert.equal(report.lat, 50.22);
  await shot(desktop, 'desktop');
  assert.deepEqual(errors, []);
  console.log('Desktop location saving and layout passed; no page errors');
} finally {
  await browser.close();
}
