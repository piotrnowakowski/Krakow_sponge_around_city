// Retention scenario: slider in the Rudawa card, map highlight, ditch popup storage row.
import { launch, watch, ready } from './check.mjs';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:5291/';
const out = '../output/s2';
mkdirSync(out, { recursive: true });

const browser = await launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page, errors);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await ready(page);

await page.click('.tabs [data-tab=catchments]');
const card = page.locator('[data-scenario=rudawa]');
await card.scrollIntoViewIfNeeded();
console.log('initial:', (await card.locator('.ret-out').innerText()).replace(/\s+/g, ' '));
await card.locator('input[type=range]').fill('25');
console.log('top 25:', (await card.locator('.ret-out').innerText()).replace(/\s+/g, ' '));
await card.locator('[data-ret-map]').click(); // hide
await card.locator('[data-ret-map]').click(); // show + zoom to selection
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/1-scenario.png` });

// Polish strings
await page.click('.lang [data-lang=pl]');
const cardPl = page.locator('[data-scenario=dlubnia]');
await cardPl.scrollIntoViewIfNeeded();
console.log('pl dlubnia:', (await cardPl.innerText()).replace(/\s+/g, ' ').slice(0, 260));
await cardPl.locator('details summary').click();
await page.screenshot({ path: `${out}/2-pl.png`, clip: { x: 0, y: 64, width: 410, height: 836 } });
await page.click('.lang [data-lang=en]');

// Ditch popup with storage row
await page.click('.tabs [data-tab=layers]');
await page.click('[data-view=ditches]');
const box = await page.locator('#map').boundingBox();
const pt = await page.evaluate(async () => {
  const map = window.__map;
  const data = await (await fetch('data/ditches.json')).json();
  const f = data.features.find((x) => x.properties.priority === 'high' && x.properties.length_m > 600);
  const c = f.geometry.coordinates[Math.floor(f.geometry.coordinates.length / 2)];
  map.jumpTo({ center: c, zoom: 15 });
  await new Promise((r) => map.once('idle', r));
  return map.project(c);
});
await page.mouse.click(box.x + pt.x, box.y + pt.y);
await page.waitForSelector('.maplibregl-popup .pop-storage');
console.log('popup:', (await page.locator('.maplibregl-popup .pop-storage').innerText()).replace(/\s+/g, ' '));
await page.screenshot({ path: `${out}/3-popup.png` });

await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
