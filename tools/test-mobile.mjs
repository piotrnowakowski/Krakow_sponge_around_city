// Mobile layout pass: every tab on a phone and a small tablet, plus a keyboard-focus check.
import { launch, watch, ready } from './check.mjs';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:5291/';
const out = '../output/s4-mobile';
mkdirSync(out, { recursive: true });
const browser = await launch();
const errors = [];
for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['tablet', { width: 768, height: 1024 }]]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  watch(page, errors);
  await page.goto(`${url}?notour`, { waitUntil: 'domcontentloaded' });
  await ready(page);
  for (const tab of ['layers', 'catchments', 'drought', 'reports', 'about']) {
    await page.click(`.tabs [data-tab=${tab}]`);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/${name}-${tab}.png` });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(name, 'horizontal overflow:', overflow);
  await page.close();
}
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${url}?notour`, { waitUntil: 'domcontentloaded' });
await ready(page);
for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
await page.screenshot({ path: `${out}/keyboard-focus.png`, clip: { x: 0, y: 0, width: 1440, height: 140 } });
console.log('focused:', await page.evaluate(() => document.activeElement.outerHTML.slice(0, 120)));
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
