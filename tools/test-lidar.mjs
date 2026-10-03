// LiDAR pilot layer: ditches view, relief basemap, pilot tile, candidate popup.
import { launch, watch, ready } from './check.mjs';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:5291/';
const out = '../output/s3';
mkdirSync(out, { recursive: true });

const browser = await launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page, errors);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await ready(page);

await page.click('[data-view=ditches]');
await page.click('[data-basemap=relief]');
const pt = await page.evaluate(async () => {
  const map = window.__map;
  const data = await (await fetch('data/lidar_candidates.json')).json();
  const tile = data.features.find((f) => f.properties.kind === 'tile');
  const xs = tile.geometry.coordinates[0].map((c) => c[0]);
  const ys = tile.geometry.coordinates[0].map((c) => c[1]);
  map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { duration: 0, padding: 20 });
  await new Promise((r) => map.once('idle', r));
  const c = data.features.filter((f) => f.properties.kind === 'candidate').sort((a, b) => b.properties.length_m - a.properties.length_m)[0];
  const mid = c.geometry.coordinates[Math.floor(c.geometry.coordinates.length / 2)];
  return { ...map.project(mid), n: data.features.length };
});
console.log('features', pt.n);
await page.waitForTimeout(4000); // relief WMS tiles
await page.screenshot({ path: `${out}/1-tile-relief.png` });
const box = await page.locator('#map').boundingBox();
await page.mouse.click(box.x + pt.x, box.y + pt.y);
await page.waitForSelector('.maplibregl-popup .tag-experimental');
console.log('popup:', (await page.locator('.maplibregl-popup-content').innerText()).replace(/\s+/g, ' '));
await page.screenshot({ path: `${out}/2-popup.png` });

await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
