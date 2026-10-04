// axe-core scan of every tab, the report form and the tour (WCAG 2.1 A/AA rules).
import { launch, ready } from './check.mjs';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:5291/';
const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const browser = await launch();
let page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let violations = 0;
await page.goto(url, { waitUntil: 'domcontentloaded' });
await ready(page);
await page.addScriptTag({ content: axe });

const scan = async (label) => {
  const res = await page.evaluate(() =>
    window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }),
  );
  for (const v of res.violations) {
    violations++;
    console.log(`[${label}] ${v.impact} ${v.id}: ${v.help} (${v.nodes.length})`);
    for (const n of v.nodes.slice(0, 4)) console.log('    ', n.target.join(' '), '|', (n.failureSummary || '').split('\n')[1]?.trim() || '');
  }
  if (!res.violations.length) console.log(`[${label}] no violations`);
};
await scan('invite+views');
for (const tab of ['catchments', 'drought', 'reports', 'about']) {
  await page.click(`.tabs [data-tab=${tab}]`);
  await page.waitForTimeout(600);
  await scan(tab);
}
await page.click('#tour-btn');
await scan('tour');
await page.click('#tour .tour-x');
await page.click('#report-fab');
const box = await page.locator('#map').boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForSelector('#report-dialog[open]');
await scan('report form');
await page.close();
page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(url, { waitUntil: 'domcontentloaded' });
await ready(page);
await page.addScriptTag({ content: axe });
await scan('mobile map');
await page.click('#mobile-more');
await scan('mobile menu');
await page.click('[data-mobile-tab=layers]');
await scan('mobile views');
await page.click('#mobile-report');
await scan('mobile location request');
const mobileBox = await page.locator('#map').boundingBox();
await page.mouse.click(mobileBox.x + mobileBox.width / 2, mobileBox.y + mobileBox.height / 3);
await page.waitForSelector('#report-dialog[open]');
await scan('mobile report form');
await browser.close();
if (violations) throw new Error(`${violations} accessibility violations`);
