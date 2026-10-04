// APP_URL controls the server. PLAYWRIGHT_PACKAGE optionally points at an existing
// package.json with Playwright/axe-core installed (no dependency change to the app).
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || import.meta.url);
const { chromium } = require('playwright');
const url = process.argv[2] || process.env.APP_URL || 'http://127.0.0.1:5173/';
const out = path.resolve(process.env.REVIEW_OUTPUT || 'output/review-verification');
await mkdir(out, { recursive: true });
const report = { url, checks: [], errors: [] };
const browser = await chromium.launch({ headless: true });
const check = (name, details = {}) => { report.checks.push({ name, ...details }); console.log(`PASS ${name}`); };
const ready = async (p) => { await p.locator('#loading[hidden]').waitFor({ state: 'attached', timeout: 30000 }); await p.locator('[data-lang="en"]').click(); };
const capture = (p, name) => p.screenshot({ path: path.join(out, name + '.png') });
const choose = async (p) => { await p.locator('[data-tab="layers"]').click(); await p.locator('[data-view="barriers"]').click(); await p.locator('[data-candidate]').first().waitFor(); await p.locator('[data-candidate]').first().click(); await p.locator('[name="fillHeight"]').waitFor(); };
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); p.on('pageerror', (e) => report.errors.push(e.message));
  const requests = []; p.on('request', (r) => requests.push(r.url()));
  await p.goto(url); await ready(p); await p.waitForTimeout(300);
  assert(!requests.some((u) => /data\/(landcover|ditch-ponding|drought)\.json/.test(u))); check('Optional datasets are lazy');
  await p.locator('[data-view="manual"]').click();
  const keyboard = [];
  for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); keyboard.push(await p.evaluate(() => ({ scrollY, panel: document.querySelector('#panel-layers').scrollTop }))); }
  assert(keyboard.every((s) => s.scrollY === 0)); assert(keyboard.some((s) => s.panel > 0)); check('F02 Keyboard scroll stays inside panel', { keyboard });
  await p.locator('[data-tab="layers"]').focus(); await p.keyboard.press('ArrowRight'); assert.equal(await p.locator('[data-tab="catchments"]').getAttribute('aria-selected'), 'true'); check('F12 Keyboard tab pattern');
  await choose(p);
  assert(await p.locator('#barrier-detail h2').isVisible()); assert(await p.locator('#barrier-detail h2').evaluate(e=>document.activeElement===e)); check('F03 Candidate list opens detail and focuses heading');
  await p.locator('[name="fillHeight"]').selectOption('0.4'); await p.locator('.barrier-inputs summary').click();
  await p.locator('[name="overflowHead"]').fill('0.125'); assert.equal(await p.locator('[name="overflowHead"]').getAttribute('aria-invalid'), 'false');
  await p.locator('[name="overflowHead"]').fill('0.4'); assert.equal(await p.locator('[name="overflowHead"]').getAttribute('aria-invalid'), 'true'); assert(await p.locator('#head-error').isVisible()); assert(await p.locator('[data-export]').isDisabled());
  await p.locator('[name="overflowHead"]').fill('0.125'); check('F05 Valid decimals, inline invalid range and recovery');
  await p.locator('[data-lang="pl"]').click(); assert(await p.locator('.barrier-inputs').evaluate((e) => e.open)); assert.equal(await p.locator('[name="overflowHead"]').inputValue(), '0.125'); await p.locator('[data-lang="en"]').click();
  await p.locator('[data-tab="layers"]').click(); assert(await p.locator('#barrier-detail').isVisible());
  await p.locator('[data-tab="drought"]').click(); await choose(p); assert.equal(await p.locator('[name="fillHeight"]').inputValue(), '0.4');
  await p.locator('.barrier-inputs summary').click(); assert.equal(await p.locator('[name="overflowHead"]').inputValue(), '0.125');
  await p.reload(); await ready(p); await choose(p); assert.equal(await p.locator('[name="fillHeight"]').inputValue(), '0.4'); check('F06 Draft survives tabs, active tab, translation and reload');
  await p.locator('[data-share]').click(); const shared = await p.locator('[name="scenarioLink"]').inputValue();
  const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const sh = await fresh.newPage(); await sh.goto(shared); await sh.locator('[name="fillHeight"]').waitFor(); assert.equal(await sh.locator('[name="fillHeight"]').inputValue(), '0.4'); await fresh.close();
  const downloading = p.waitForEvent('download'); await p.locator('[data-export]').click(); const dl = await downloading; await dl.saveAs(path.join(out, 'scenario.json')); const exported = JSON.parse(await readFile(path.join(out, 'scenario.json'), 'utf8')); assert.equal(exported.assumptions.fill_height_m, 0.4); assert.equal(exported.assumptions.overflow_head_m, 0.125); assert(exported.limitations.length); check('E04 Shared URL and downloaded scenario match assumptions');
  await p.locator('[data-reset]').click(); assert.equal(await p.locator('[name="fillHeight"]').inputValue(), '0.6'); check('Explicit reset restores defaults');
  await p.locator('[data-tab="drought"]').click(); await p.locator('[data-station="150190330"]').waitFor(); await p.locator('[data-station="150190330"]').click(); await p.locator('#climate-select').selectOption('dlubnia'); await p.locator('[data-lang="pl"]').click(); await p.waitForTimeout(300); assert.equal(await p.locator('#climate-select').inputValue(), 'dlubnia'); assert((await p.locator('#panel-drought h3').first().innerText()).includes('Prądnik')); await p.locator('[data-lang="en"]').click(); check('F07 Language preserves station and climate');
  assert.equal(await p.locator('#panel-drought canvas[role="img"][aria-label]').count(), 4); assert.equal(await p.locator('#panel-drought table').count(), 4); check('F11 Four named charts with equivalent tables');
  await p.locator('[data-tab="about"]').click(); assert((await p.locator('#panel-about').innerText()).includes('-7.1%')); check('F13 Data-derived discrepancy range');
  const axe = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8'); await p.addScriptTag({ content: axe });
  for (const tab of ['layers','catchments','drought','about']) { await p.locator(`[data-tab="${tab}"]`).click(); if(tab==='drought') await p.locator('#c-flow').waitFor(); const violations = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } })).violations.map((v) => ({ id:v.id, impact:v.impact, targets:v.nodes.map((n)=>n.target) }))); check('Accessibility '+tab, { violations }); assert.equal(violations.length, 0, JSON.stringify(violations)); }
  await choose(p); await capture(p, '01-desktop-ponding');
  for (const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]) {
    const mc = await browser.newContext({ viewport:size, isMobile:true, hasTouch:true }); const m = await mc.newPage(); await m.goto(url); await ready(m); await choose(m); await m.waitForTimeout(700);
    assert(await m.locator('.pond-depth-key').isVisible()); assert((await m.locator('.pond-depth-key').innerText()).includes('Ditch remains open'));
    assert(await m.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
    if(size.width<820){await m.locator('.sheet-toggle').click();assert(await m.locator('body').evaluate(e=>e.classList.contains('detail-expanded')));await m.locator('[data-share]').scrollIntoViewIfNeeded();const close=await m.locator('.barrier-close').boundingBox();assert(close.y>=0&&close.y+close.height<=size.height);await m.locator('.sheet-toggle').click();}
    await capture(m,'02-phone-'+size.width);await m.locator('.barrier-close').click();await m.locator('[data-view="ditches"]').click();
    const point = await m.evaluate(async () => { const d=await(await fetch('data/ditches.json')).json(); let f=d.features.find(f=>f.properties.priority==='high'),coords=f.geometry.coordinates; while(typeof coords[0][0]!=='number')coords=coords[0]; const c=coords[Math.floor(coords.length/2)]; window.__map.jumpTo({center:c,zoom:16});return c; });
    await m.waitForFunction(c=>window.__map.queryRenderedFeatures(window.__map.project(c),{layers:['ditches']}).length>0,point);
    const xy = await m.evaluate(c=>{const q=window.__map.project(c),r=window.__map.getCanvas().getBoundingClientRect();return[q.x+r.x,q.y+r.y]},point); await m.mouse.click(...xy); await m.locator('#feature-detail').waitFor(); await m.locator('#feature-detail .barrier-status').scrollIntoViewIfNeeded();assert(await m.locator('#feature-detail .barrier-status').isVisible());assert.equal(await m.locator('.maplibregl-popup').count(),0);await capture(m,'03-ditch-'+size.width);await mc.close();check('F04 F09 Phone detail, map key and sheet '+size.width);
  }
  await p.locator('.barrier-close').click();await p.locator('[data-view="corridors"]').click();await p.evaluate(()=>window.__map.jumpTo({center:[19.917186,50.120351],zoom:17.5}));await p.waitForFunction(()=>window.__map.queryRenderedFeatures(undefined,{layers:['corridors']}).length>0);
  const features=await p.evaluate(()=>window.__map.queryRenderedFeatures(undefined,{layers:['corridors']}).map(f=>f.properties));assert(features.some(f=>f.reason==='close_building'&&f.room_class==='constrained'));check('E06 Local building constraint restored',{features});await capture(p,'04-corridors');
  for(const [name,pattern] of [['core','**/data/stats.json'],['drought','**/data/drought.json'],['layer','**/data/ditch-ponding-sites.json'],['gauges','**/api/data/hydro/']]) {
    const f=await ctx.newPage();await f.route(pattern,r=>r.abort());await f.goto(url);
    if(name==='core'){await f.locator('#loading button').waitFor();await f.unroute(pattern);await f.locator('#loading button').click();await ready(f);}
    else{await ready(f);if(name==='drought'){await f.locator('[data-tab="drought"]').click();await f.locator('[data-retry-drought]').waitFor();await capture(f,'05-drought-failure');await f.unroute(pattern);await f.locator('[data-retry-drought]').click();await f.locator('#c-flow').waitFor();}
      if(name==='layer'){await f.locator('[data-view="barriers"]').click();await f.locator('[data-retry-source="ditch-ponding-sites"]').waitFor();await capture(f,'06-layer-failure');await f.unroute(pattern);await f.locator('[data-retry-source="ditch-ponding-sites"]').click();await f.locator('[data-candidate]').first().waitFor();}
      if(name==='gauges'){await f.locator('[data-view="monitoring"]').click();await f.waitForFunction(()=>document.querySelector('#gauge-status').textContent.includes('Saved snapshot'));assert(!(await f.locator('#legend').innerText()).includes('(live)'));await capture(f,'07-gauge-fallback');}}
    check('F01 F08 F10 Failure and recovery '+name);await f.close();
  }
  const missingPond = await ctx.newPage(); await missingPond.route('**/data/ditch-ponding.json', r=>r.abort()); await missingPond.goto(url);await ready(missingPond);await choose(missingPond);
  assert(await missingPond.locator('[data-retry-source="ditch-ponding"]').isVisible());await missingPond.unroute('**/data/ditch-ponding.json');await missingPond.locator('[data-retry-source="ditch-ponding"]').click();await missingPond.locator('[data-retry-source="ditch-ponding"]').waitFor({state:'detached'});check('Missing polygon data stays visible inside selected detail');await missingPond.close();
  assert.equal(report.errors.length,0,report.errors.join('; '));check('No uncaught application errors');await ctx.close();
} catch (error) { report.failure=error.stack; console.error(error.stack); process.exitCode=1; }
finally { await browser.close(); await writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2)); }
