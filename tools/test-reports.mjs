// End-to-end check of citizen reports: pick on map, fill the form with a photo, export, send URL.
import { launch, watch, ready } from './check.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:5291/';
const out = '../output/s1';
mkdirSync(out, { recursive: true });

// test.png is a generated gradient (not an observation photo), made by the caller.

const browser = await launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
watch(page, errors);
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.removeItem('ks_reports_v1'));
await page.reload({ waitUntil: 'domcontentloaded' });
await ready(page);

// 1. Report button -> pick mode -> click inside Dłubnia catchment
await page.click('#report-fab');
await page.waitForSelector('#pick-bar:not([hidden])');
await page.screenshot({ path: `${out}/1-pick.png` });
const point = await page.evaluate(() => {
  const p = window.__map.project([19.97, 50.22]);
  return { x: p.x, y: p.y };
});
const box = await page.locator('#map').boundingBox();
await page.mouse.click(box.x + point.x, box.y + point.y);
await page.waitForSelector('#report-dialog[open]');

// 2. Fill the form
await page.click('label.chip:has(input[name=type][value=stream])');
await page.click('label.chip:has(input[name=status][value=dry])');
await page.fill('textarea[name=note]', 'Automated test report, not a real observation.');
await page.setInputFiles('input[name=photo]', `${out}/test.png`);
await page.waitForSelector('.rd-preview:not([hidden])');
await page.screenshot({ path: `${out}/2-form.png` });
await page.click('button[value=save]');
await page.waitForSelector('#panel-reports.active .rep-list li');
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/3-saved.png` });

// 3. Examples on, popup on a report marker
await page.click('#panel-reports details.more summary');
await page.click('[data-act=examples]');
await page.waitForTimeout(800);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ks_reports_v1')));
console.log('stored', stored.length, stored.map((r) => `${r.type}/${r.status}/${r.catchment}/${r.example ? 'ex' : 'real'}/${r.photo ? 'photo' : '-'}`).join(' '));

// 4. Export GeoJSON
const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=export]')]);
await download.saveAs(`${out}/export.geojson`);
const geo = JSON.parse(readFileSync(`${out}/export.geojson`, 'utf8'));
console.log('export features', geo.features.length, Object.keys(geo.features[0].properties).join(','));

// 5. Send to project -> captured popup URL
const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('[data-act=send]')]);
const issue = popup.url();
await popup.close();
console.log('issue url length', issue.length, issue.startsWith('https://github.com/piotrnowakowski/Krakow_sponge_around_city/issues/new?title='));
writeFileSync(`${out}/issue-url.txt`, decodeURIComponent(issue));

// 6. Click on a report marker for the popup
await page.evaluate(() => window.__map.jumpTo({ center: [19.97, 50.22], zoom: 13 }));
await page.waitForTimeout(1500);
const p2 = await page.evaluate(() => window.__map.project([19.97, 50.22]));
await page.mouse.click(box.x + p2.x, box.y + p2.y);
await page.waitForSelector('.maplibregl-popup .rep-card');
await page.screenshot({ path: `${out}/4-popup.png` });

// 7. Ditch popup -> report button opens the form with type "ditch"
await page.click('.tabs [data-tab=layers]');
await page.click('[data-view=ditches]');
const ditchPt = await page.evaluate(async () => {
  const map = window.__map;
  const data = await (await fetch('data/ditches.json')).json();
  const f = data.features.find((x) => x.properties.priority === 'high' && x.properties.length_m > 400);
  const c = f.geometry.coordinates[Math.floor(f.geometry.coordinates.length / 2)];
  map.jumpTo({ center: c, zoom: 15 });
  await new Promise((r) => map.once('idle', r));
  return map.project(c);
});
await page.mouse.click(box.x + ditchPt.x, box.y + ditchPt.y);
await page.waitForSelector('.maplibregl-popup .pop-report');
await page.screenshot({ path: `${out}/4b-ditch-popup.png` });
await page.click('.maplibregl-popup .pop-report');
await page.waitForSelector('#report-dialog[open]');
console.log('ditch preselected', await page.isChecked('input[name=type][value=ditch]'));
await page.click('#report-dialog button[value=cancel]');
await page.keyboard.press('Escape');
await page.screenshot({ path: `${out}/5-panel.png`, clip: { x: 0, y: 64, width: 410, height: 836 } });

// Mobile form
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
watch(m, errors);
await m.goto(url, { waitUntil: 'domcontentloaded' });
await ready(m);
await m.screenshot({ path: `${out}/6-mobile.png` });
await m.click('#report-fab');
const mb = await m.locator('#map').boundingBox();
await m.mouse.click(mb.x + mb.width / 2, mb.y + mb.height / 2);
await m.waitForSelector('#report-dialog[open]');
await m.screenshot({ path: `${out}/7-mobile-form.png` });

await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
