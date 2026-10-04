// Regression: true free-only filtering, calculated geometry and story step 5.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { launch, ready, watch } from './check.mjs';

const url = process.argv[2] || 'http://127.0.0.1:5187/';
const output = new URL('../output/meanders/', import.meta.url);
mkdirSync(output, { recursive: true });
const browser = await launch();
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
try {
  for (const [name, viewport] of [['desktop', { width: 1450, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    watch(page, errors);
    await page.addInitScript(() => localStorage.setItem('ks_tour_seen', '1'));
    await page.goto(url);
    await ready(page);
    await page.locator('[data-lang="en"]').click();
    await page.locator('[data-view="corridors"]').click();
    const free = page.locator('[data-free-corridors]');
    await free.check();
    assert.deepEqual(await page.evaluate(() => window.__map.getFilter('corridors')), ['==', ['get', 'room_class'], 'open']);
    assert.equal(await page.evaluate(() => window.__map.getLayoutProperty('rivers-main', 'visibility')), 'none');
    await page.locator('[data-meander-example]').click();
    await page.waitForTimeout(1400);
    const id = await page.locator('[data-meander-select]').inputValue();
    assert.ok(id);
    assert.equal(await page.locator('#meander-key').isVisible(), true);
    assert.match(await page.locator('.meander-result').innerText(), /\+\d+ m/);
    assert.equal(await page.evaluate(() => window.__map.queryRenderedFeatures({ layers: ['meander-proposal'] }).length > 0), true);
    const otherId = await page.locator('[data-meander-select] option').nth(2).getAttribute('value');
    await page.locator('[data-meander-select]').selectOption(otherId);
    assert.equal(await page.evaluate(() => window.__map.getFilter('meander-proposal')[1][2]), otherId);
    await page.locator('[data-meander-select]').selectOption(id);
    // Catchment focus temporarily hides the comparison and restores it on exit.
    await page.locator('[data-tab="catchments"]').click();
    await page.locator('[data-zoom="rudawa"]').click();
    assert.equal(await page.locator('#meander-key').isVisible(), false);
    await page.locator('[data-tab="layers"]').click();
    assert.equal(await page.locator('#meander-key').isVisible(), true);
    await free.uncheck();
    assert.equal(await page.evaluate(() => window.__map.getFilter('corridors') ?? null), null);
    await page.locator('[data-meander-select]').selectOption('');
    assert.equal(await page.locator('#meander-key').isVisible(), false);
    assert.equal(await page.evaluate(() => window.__map.getLayoutProperty('rivers-main', 'visibility')), 'visible');
    await free.check();
    await page.locator('[data-view="rivers"]').click();
    assert.equal(await page.evaluate(() => window.__map.getLayoutProperty('rivers-main', 'visibility')), 'visible');
    await page.locator('[data-view="corridors"]').click();
    assert.equal(await free.isChecked(), true);

    for (const lang of ['en', 'pl']) {
      await page.locator(`[data-lang="${lang}"]`).click();
      await page.locator('#tour-btn').click();
      for (let i = 1; i < 5; i++) await page.locator('[data-tour="next"]').click();
      await page.waitForTimeout(1700);
      assert.match(await page.locator('.tour-count').innerText(), /5.*5/);
      assert.equal(await page.locator('#tour .tour-dots i').count(), 5);
      assert.equal(await free.isChecked(), true);
      assert.equal(await page.locator('[data-meander-select]').inputValue(), id);
      const result = await page.evaluate(() => {
        const map = window.__map;
        return { visibility: map.getLayoutProperty('meander-proposal', 'visibility'),
          kinds: map.queryRenderedFeatures({ layers: ['corridors'] }).map((f) => f.properties.room_class),
          shown: map.queryRenderedFeatures({ layers: ['meander-proposal'] }).length,
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(result.visibility, 'visible');
      assert.ok(result.shown > 0);
      assert.ok(result.kinds.every((k) => k === 'open'));
      assert.equal(result.overflow, false);
      await page.screenshot({ path: new URL(`${name}-${lang}-step5.png`, output).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
      await page.addScriptTag({ content: axe });
      const violations = await page.evaluate(async () => (await window.axe.run({ include: ['#panel-layers', '#tour', '#meander-key'] },
        { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
      assert.deepEqual(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), []);
      await page.locator('[data-tour="back"]').click();
      assert.equal(await page.locator('#meander-key').isVisible(), false);
      assert.equal(await free.isChecked(), false);
      await page.locator('[data-tour="next"]').click();
      await page.locator('[data-tour="report"]').click();
      assert.equal(await page.locator('#panel-reports').getAttribute('class'), 'panel active');
    }
    assert.deepEqual(errors, []);
    console.log(`${name}: EN/PL free filter, measured proposal, focus restoration, five-step story and accessibility passed`);
    await page.close();
  }
  for (const [label, status, body, message] of [
    ['unavailable', 503, '{}', /could not be loaded/],
    ['empty', 200, JSON.stringify({ type: 'FeatureCollection', features: [] }), /No connected section/],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1450, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/data/meanders.json', (route) => route.fulfill({ status, body, contentType: 'application/json' }));
    await page.goto(`${url}?notour`);
    await ready(page);
    await page.locator('[data-lang="en"]').click();
    await page.locator('[data-view="corridors"]').click();
    assert.match(await page.locator('.meander-controls [role="status"]').innerText(), message);
    await page.locator('[data-free-corridors]').check();
    assert.deepEqual(await page.evaluate(() => window.__map.getFilter('corridors')), ['==', ['get', 'room_class'], 'open']);
    await page.locator('#tour-btn').click();
    for (let i = 1; i < 5; i++) await page.locator('[data-tour="next"]').click();
    assert.match(await page.locator('#tour').innerText(), message);
    assert.equal(await page.locator('#meander-key').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log(`${label} data: honest empty state, usable filter and working step 5`);
    await page.close();
  }
} finally {
  await browser.close();
}
