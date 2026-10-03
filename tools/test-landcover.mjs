// Land cover is lazy-loaded: not fetched at startup, fetched and drawn when the Landscape view opens.
import { launch, watch, ready } from './check.mjs';
const url = process.argv[2] || 'http://127.0.0.1:5291/';
const browser = await launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page, errors);
const fetched = [];
page.on('request', (r) => r.url().includes('landcover.json') && fetched.push(Date.now()));
await page.goto(`${url}?notour`, { waitUntil: 'domcontentloaded' });
await ready(page);
console.log('landcover requests at startup:', fetched.length);
await page.click('[data-view=landcover]');
await page.waitForTimeout(4000);
const n = await page.evaluate(() => window.__map.queryRenderedFeatures({ layers: ['landcover'] }).length);
console.log('after Landscape view: requests', fetched.length, 'rendered features', n);
await page.screenshot({ path: '../output/s4-landcover.png' });
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
