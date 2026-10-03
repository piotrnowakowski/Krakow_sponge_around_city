// Records the demo walkthrough of the live site, following docs/demo-script.md.
// Captions are overlaid in the page so the video works without a voiceover.
// Usage: node record-demo.mjs [url]  ->  ../output/demo/demo.webm (+ timings.txt)
import { launch, watch, ready } from './check.mjs';
import { mkdirSync, writeFileSync, renameSync, readdirSync } from 'node:fs';

const url = process.argv[2] || 'https://piotrnowakowski.github.io/Krakow_sponge_around_city/';
const out = '../output/demo';
mkdirSync(out, { recursive: true });
const W = 1440;
const H = 810;

const browser = await launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: out, size: { width: W, height: H } },
  locale: 'en-GB',
});
const page = await context.newPage();
const errors = [];
watch(page, errors);
const t0 = Date.now();
const timings = [];
const wait = (ms) => page.waitForTimeout(ms);

async function caption(text) {
  await page.evaluate((text) => {
    let el = document.getElementById('demo-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-caption';
      el.style.cssText = 'position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:9999;max-width:820px;padding:10px 18px;border-radius:12px;background:rgba(11,37,69,.92);color:#fff;font:600 18px/1.35 "Segoe UI",system-ui,sans-serif;text-align:center;box-shadow:0 4px 18px rgba(0,0,0,.3);pointer-events:none;transition:opacity .3s';
      document.body.appendChild(el);
    }
    el.style.opacity = text ? '1' : '0';
    if (text) el.textContent = text;
  }, text);
}

async function scene(name, text) {
  const s = ((Date.now() - t0) / 1000).toFixed(1);
  timings.push(`${s}s  ${name}`);
  console.log(`${s}s  ${name}`);
  await caption(text);
}

// Move the mouse visibly to an element or point, then click.
async function clickAt(x, y) {
  await page.mouse.move(x, y, { steps: 18 });
  await wait(250);
  await page.mouse.click(x, y);
}
async function clickEl(selector) {
  const b = await page.locator(selector).first().boundingBox();
  await clickAt(b.x + b.width / 2, b.y + b.height / 2);
}
async function mapPoint(lngLat) {
  const box = await page.locator('#map').boundingBox();
  const p = await page.evaluate((c) => window.__map.project(c), lngLat);
  return [box.x + p.x, box.y + p.y];
}
// Click a rendered feature of `layer`: pick a vertex whose pixel really hits the layer,
// click it, and retry with another vertex until a popup opens.
async function clickFeature(layer, prefer = () => true) {
  const box = await page.locator('#map').boundingBox();
  const candidates = await page.evaluate(([layer, preferSrc]) => {
    const map = window.__map;
    const prefer = new Function('p', `return (${preferSrc})(p)`);
    const { width, height } = map.getCanvas().getBoundingClientRect();
    const feats = map.queryRenderedFeatures({ layers: [layer] }).filter((f) => prefer(f.properties));
    const pts = [];
    for (const f of feats) {
      const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const line of lines) {
        const c = line[Math.floor(line.length / 2)];
        const p = map.project(c);
        // High in the map, so the popup opens below the point, clear of the caption.
        if (p.x < 450 || p.x > width - 330 || p.y < 110 || p.y > 220) continue;
        const hit = map.queryRenderedFeatures([[p.x - 2, p.y - 2], [p.x + 2, p.y + 2]], { layers: [layer] }).length;
        if (hit) pts.push({ x: p.x, y: p.y, d: Math.hypot(p.x - width / 2, p.y - 160) });
      }
    }
    return pts.sort((a, b) => a.d - b.d).slice(0, 6);
  }, [layer, prefer.toString()]);
  for (const p of candidates) {
    await clickAt(box.x + p.x, box.y + p.y);
    await wait(500);
    if (await page.locator('.maplibregl-popup').count()) return true;
  }
  console.log(`  (no popup opened for ${layer})`);
  return false;
}

// Wait until the map has settled (or 6 s), without hanging if it is already idle.
const idle = () =>
  page.evaluate(() => new Promise((r) => {
    const map = window.__map;
    if (map.loaded() && !map.isMoving()) return r();
    map.once('idle', r);
    setTimeout(r, 6000);
  }));

await page.goto(url, { waitUntil: 'domcontentloaded' });
await ready(page);

// A. Hook
await scene('A hook', "Kraków takes most of its tap water from rivers. In 2026 the rain was normal, yet those rivers hit record lows.");
await wait(6500);
await caption('Kraków Sponge: the city’s water starts in the hills around it.');
await wait(4500);

// B. Tour step 1: drought
await scene('B drought', 'Step 1: the Prądnik had its lowest flow since 1991, the Rudawa its 2nd lowest. Rainfall: about normal.');
await clickEl('#tour-invite [data-inv=yes]');
await wait(7000);
await page.locator('#panel-drought').evaluate((el) => el.scrollTo({ top: 150, behavior: 'smooth' }));
await caption('Live IMGW gauges against 35 years of records: the flow sits under the mean low flow (SNQ) for months.');
await wait(7000);
await page.locator('#panel-drought').evaluate((el) => el.scrollTo({ top: 1000, behavior: 'smooth' }));
await page.locator('#panel-drought').evaluate((el) => el.scrollTo({ top: 640, behavior: 'smooth' }));
await caption('Every year since 1991, January to today: 2026 (red) is the lowest on the Prądnik, the 2nd lowest on the Rudawa.');
await wait(7500);
await page.locator('#panel-drought').evaluate((el) => el.scrollTo({ top: 1000, behavior: 'smooth' }));
await caption('The water balance (rain minus evaporation) is about −130 mm against −45 to −82 mm in a normal year.');
await wait(8000);
await page.locator('#panel-drought').evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
await caption('IMGW has kept a hydrological drought warning on the Rudawa and Prądnik catchments since 4 July.');
await wait(6000);

// C. Tour step 2: catchments
await scene('C catchments', 'Step 2: three small catchments, 756 km² of fields and forests. Rudawa and Dłubnia feed Kraków’s water plants.');
await clickEl('#tour [data-tour=next]');
await wait(6000);
await page.locator('#panel-catchments').evaluate((el) => el.scrollTo({ top: 260, behavior: 'smooth' }));
await caption('Catchments rebuilt from open elevation data, within 0.2–7% of the official MPHP areas, with land cover and sealed surfaces.');
await wait(7500);

// D. Tour step 3: ditches + LiDAR
await scene('D ditches', 'Step 3: drainage ditches empty the landscape within hours. Pink ones are the best to block.');
await clickEl('#tour [data-tour=next]');
await wait(8000);
await caption('Violet dashed lines: ditches found automatically in the LiDAR terrain model, missing from the national map.');
await wait(7000);

// E. Tour step 4: room for the river
await scene('E room', 'Step 4: room for the river. Where there is space, meanders and wet meadows can come back.');
await clickEl('#tour [data-tour=next]');
await wait(7500);
await clickEl('#tour .tour-x');
await wait(800);
await clickFeature('corridors', (p) => p.room_class === 'constrained');
await caption('Screened in segments of up to 50 m: red where a building is within 30 m of the river or the corridor is mostly built or sealed.');
await wait(6500);
await page.evaluate(() => document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove()));

// F. Ditch popup
await scene('F ditch score', 'Every mapped ditch gets a transparent 0–100 score, plus an estimate of the water it would hold if blocked.');
await clickEl('[data-view=ditches]');
await page.evaluate(() => window.__map.flyTo({ center: [19.8248, 50.0858], zoom: 14.6, duration: 2500 }));
await wait(2800);
await idle();
const ditch = await page.evaluate(async () => {
  const data = await (await fetch('data/ditches.json')).json();
  const f = data.features.find((x) => x.properties.priority === 'high' && x.properties.length_m > 600 && x.properties.catchment === 'rudawa');
  return f.geometry.coordinates[Math.floor(f.geometry.coordinates.length / 2)];
});
await page.evaluate((c) => window.__map.flyTo({ center: c, zoom: 15, duration: 1500, offset: [0, -215] }), ditch);
await wait(1800);
await idle();
await clickFeature('ditches', (p) => p.priority === 'high');
await wait(5000);
await caption('Land use, distance to houses, slope and length. Storage: length × 1 m² × 0.5, a heuristic, shown with its assumptions.');
await wait(7000);

// G. Scenario slider
await scene('G scenario', 'Scenario: block the top N high-priority ditches in the Rudawa catchment and compare with the water plant’s daily output.');
await page.keyboard.press('Escape');
await page.evaluate(() => document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove()));
await clickEl('.tabs [data-tab=catchments]');
const card = page.locator('[data-scenario=rudawa]');
await card.scrollIntoViewIfNeeded();
await page.locator('#panel-catchments').evaluate((el) => el.scrollBy({ top: 120 }));
const slider = card.locator('input[type=range]');
for (const n of [0, 10, 25, 50, 90, 140, 189]) {
  await slider.fill(String(n));
  await wait(n === 0 ? 900 : 700);
}
await caption('All 189: about 20,000 m³ per filling, 17–22 hours of the Rudawa plant. Small, and the soaking-in is not even counted.');
await card.locator('[data-ret-map]').click();
await wait(6000);
await card.locator('details summary').click();
await caption('How is this estimated? Every assumption is on screen, with the source for the plant’s output.');
await wait(7000);

// H. LiDAR pilot
await scene('H lidar', 'Experimental LiDAR pilot: 12.5 km of ditches the national map misses, found in the 1 m terrain model.');
await clickEl('.tabs [data-tab=layers]');
await clickEl('[data-basemap=relief]');
await page.evaluate(() => window.__map.flyTo({ center: [19.546, 50.124], zoom: 14.2, duration: 2500 }));
await wait(5500);
await clickFeature('lidar');
await caption('Checked by eye: 27 of 30 random candidates follow a real depression; some may be forest-road ruts. Labelled experimental.');
await wait(9000);

// I. Citizen report
await scene('I report', 'Citizen science: report a ditch, stream, spring or culvert as flowing, standing, dry or already blocked.');
await page.evaluate(() => document.querySelectorAll('.maplibregl-popup').forEach((p) => p.remove()));
await clickEl('[data-basemap=light]');
await page.evaluate(() => window.__map.flyTo({ center: [19.975, 50.215], zoom: 13, duration: 2500 }));
await wait(3000);
await clickEl('#report-fab');
await wait(1200);
await clickAt(...(await mapPoint([19.9712, 50.2185])));
await page.waitForSelector('#report-dialog[open]');
await caption('The Dłubnia feeds a water plant but has no IMGW gauge: dated reports fill that gap. (Demo report, not a real observation.)');
await wait(2500);
await clickEl('label.chip:has(input[name=type][value=stream])');
await wait(600);
await clickEl('label.chip:has(input[name=status][value=dry])');
await wait(600);
await page.locator('textarea[name=note]').pressSequentially('Demo report for the video, not a real observation.', { delay: 35 });
await wait(1200);
await clickEl('#report-dialog button[value=save]');
await wait(3000);
await caption('Reports stay in your browser. Export GeoJSON, or send them to the project as a prefilled GitHub issue. No backend, no account.');
await page.locator('#panel-reports').evaluate((el) => el.scrollTo({ top: 520, behavior: 'smooth' }));
await wait(3000);
await page.locator('[data-act=send]').hover();
await wait(6000);

// J. Wrap-up
await scene('J wrap', 'Polish and English, works on phones, built entirely on open data: BDOT10k, LiDAR, IMGW, ERA5.');
await clickEl('.lang [data-lang=pl]');
await wait(3500);
await clickEl('.tabs [data-tab=drought]');
await wait(3000);
await clickEl('.lang [data-lang=en]');
await page.evaluate(() => window.__map.flyTo({ center: [19.85, 50.17], zoom: 9.6, duration: 2500 }));
await wait(3000);
await caption('Kraków Sponge · piotrnowakowski.github.io/Krakow_sponge_around_city · open source (MIT)');
await wait(6000);
await scene('end', '');

await page.close();
await context.close();
await browser.close();
const webm = readdirSync(out).filter((f) => f.endsWith('.webm') && f !== 'demo.webm').map((f) => `${out}/${f}`).pop();
renameSync(webm, `${out}/demo.webm`);
writeFileSync(`${out}/timings.txt`, timings.join('\n') + '\n');
console.log(errors.length ? errors.join('\n') : 'no console errors');
