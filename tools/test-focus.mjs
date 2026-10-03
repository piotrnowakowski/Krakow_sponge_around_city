// Catchment focus ("Explore catchment") still works with lazy land cover.
import { launch, watch, ready } from './check.mjs';
const url = process.argv[2] || 'http://127.0.0.1:5291/';
const browser = await launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page, errors);
await page.goto(`${url}?notour`, { waitUntil: 'domcontentloaded' });
await ready(page);
await page.click('.tabs [data-tab=catchments]');
await page.click('[data-zoom=dlubnia]');
await page.waitForTimeout(4000);
const n = await page.evaluate(() => window.__map.queryRenderedFeatures({ layers: ['landcover'] }).length);
console.log('focus bar visible:', await page.isVisible('#focus-bar'), 'landcover features', n);
await page.screenshot({ path: '../output/s4-focus.png' });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
