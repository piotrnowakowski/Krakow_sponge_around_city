// Real browser regression for the reported Bialucha reach beside Rzyczyska, Zielonki.
// Usage: node tools/test-corridors.mjs [url]
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { launch, ready, watch } from './check.mjs';

const url = process.argv[2] || 'http://127.0.0.1:5175/';
const output = new URL('../output/corridors/', import.meta.url);
mkdirSync(output, { recursive: true });
const browser = await launch();
try {
  for (const [name, viewport] of [['desktop', { width: 1450, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    watch(page, errors);
    await page.addInitScript(() => localStorage.setItem('ks_tour_seen', '1'));
    await page.goto(url);
    await ready(page);
    await page.locator('[data-view="corridors"]').click();
    await page.evaluate(() => window.__map.jumpTo({ center: [19.917186, 50.120351], zoom: 17.5 }));
    await page.waitForTimeout(1200);
    const result = await page.evaluate(() => {
      const map = window.__map;
      const p = map.project([19.917186, 50.120351]);
      const feature = map.queryRenderedFeatures(p, { layers: ['corridors'] })[0];
      const rect = map.getCanvas().getBoundingClientRect();
      return { properties: feature?.properties, color: map.getPaintProperty('corridors', 'line-color'), x: rect.x + p.x, y: rect.y + p.y };
    });
    assert.equal(result.properties.room_class, 'constrained');
    assert.equal(result.properties.reason, 'close_building');
    assert.equal(result.color.at(-1), '#d62828');
    assert.ok(result.properties.building_distance_m < 5);
    for (const lang of ['en', 'pl']) {
      await page.locator(`[data-lang="${lang}"]`).click();
      await page.mouse.click(result.x, result.y);
      const popup = page.locator('.maplibregl-popup-content');
      await popup.waitFor();
      assert.match(await popup.innerText(), /2[.,]7 m/);
      assert.match(await popup.innerText(), /30 m/);
      assert.equal(await popup.locator('.corridor-status').count(), 1);
      await popup.locator('summary').click();
      assert.match(await popup.innerText(), /100 m/);
      await page.screenshot({ path: new URL(`${name}-${lang}.png`, output).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
      await page.locator('.maplibregl-popup-close-button').click();
    }
    assert.deepEqual(errors, []);
    console.log(`${name}: Zielonki reach is red; measured building distance and EN/PL explanation verified`);
    await page.close();
  }
} finally {
  await browser.close();
}
