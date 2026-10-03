// Regenerates the README screenshots in docs/. Usage: node screenshots.mjs [url]
import { launch, watch, ready } from './check.mjs';

const url = process.argv[2] || 'http://127.0.0.1:5291/';
const docs = '../docs';
const browser = await launch();
const errors = [];

async function open() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page, errors);
  await page.goto(`${url}?notour`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  return page;
}
const settle = (page, ms = 2500) =>
  page.evaluate((ms) => new Promise((r) => {
    const map = window.__map;
    const done = () => setTimeout(r, ms);
    if (map.loaded() && !map.isMoving()) done();
    else map.once('idle', done);
  }), ms);
const fly = (page, center, zoom) => page.evaluate(([c, z]) => window.__map.jumpTo({ center: c, zoom: z }), [center, zoom]);
async function clickMap(page, lngLat) {
  const box = await page.locator('#map').boundingBox();
  const p = await page.evaluate((c) => window.__map.project(c), lngLat);
  await page.mouse.click(box.x + p.x, box.y + p.y);
}
const shot = (page, name) => page.screenshot({ path: `${docs}/${name}.png` });

// 1. Overview: ditches view
let page = await open();
await page.click('[data-view=ditches]');
await settle(page);
await shot(page, 'screenshot-map');

// 2. Drought dashboard with the live gauges
await page.click('[data-view=monitoring]');
await settle(page);
await page.click('.tabs [data-tab=drought]');
await page.waitForTimeout(1500);
await shot(page, 'screenshot-drought');

// 3. Scenario slider with highlight
await page.click('.tabs [data-tab=layers]');
await page.click('[data-view=ditches]');
await page.click('.tabs [data-tab=catchments]');
const card = page.locator('[data-scenario=rudawa]');
await card.scrollIntoViewIfNeeded();
await page.locator('#panel-catchments').evaluate((el) => el.scrollBy({ top: 140 }));
await card.locator('input[type=range]').fill('60');
await card.locator('[data-ret-map]').click(); // hide
await card.locator('[data-ret-map]').click(); // show and zoom
await page.waitForTimeout(1500);
await settle(page);
await shot(page, 'screenshot-scenario');
await page.close();

// 4. Room for the river in Kraków
page = await open();
await page.click('[data-view=corridors]');
await fly(page, [19.925, 50.105], 13.2);
await settle(page);
await shot(page, 'screenshot-corridors');
await page.close();

// 5. Ditch popup on the LiDAR relief
page = await open();
await page.click('[data-view=ditches]');
await page.click('[data-basemap=relief]');
const ditch = await page.evaluate(async () => {
  const data = await (await fetch('data/ditches.json')).json();
  const f = data.features.find((x) => x.properties.priority === 'high' && x.properties.length_m > 600 && x.properties.catchment === 'rudawa');
  return f.geometry.coordinates[Math.floor(f.geometry.coordinates.length / 2)];
});
await fly(page, ditch, 15.3);
await settle(page, 4000);
await clickMap(page, ditch);
await page.waitForSelector('.maplibregl-popup');
await shot(page, 'screenshot-ditch');

// 6. LiDAR pilot
await page.evaluate(() => document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove()));
await fly(page, [19.546, 50.1245], 14.1);
await settle(page, 5000);
await shot(page, 'screenshot-lidar');
await page.close();

// 7. Citizen reports (fictional examples, labelled EXAMPLE)
page = await open();
await page.click('.tabs [data-tab=reports]');
await page.click('#panel-reports details.more summary');
await page.click('[data-act=examples]');
await page.waitForTimeout(800);
await shot(page, 'screenshot-reports');
await page.evaluate(() => localStorage.removeItem('ks_reports_v1'));
await page.close();

// 8. Story tour, step 1
page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page, errors);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await ready(page);
await page.click('#tour-invite [data-inv=yes]');
await page.waitForTimeout(2500);
await shot(page, 'screenshot-tour');
await page.close();

await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
