// Story tour: invite on first visit, four steps, desktop and mobile screenshots.
import { launch, watch, ready } from './check.mjs';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] || 'http://127.0.0.1:5291/';
const out = '../output/s4-tour';
mkdirSync(out, { recursive: true });

const browser = await launch();
const errors = [];
for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: name === 'mobile' ? 2 : 1 });
  watch(page, errors);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.waitForSelector('#tour-invite:not([hidden])');
  await page.screenshot({ path: `${out}/${name}-0-invite.png` });
  await page.click('#tour-invite [data-inv=yes]');
  for (let i = 1; i <= 4; i++) {
    await page.waitForSelector('#tour:not([hidden])');
    await page.waitForTimeout(i === 3 ? 5000 : 2500);
    if (name === 'desktop') console.log(`step ${i}:`, (await page.locator('#tour').innerText()).replace(/\s+/g, ' ').slice(0, 400));
    await page.screenshot({ path: `${out}/${name}-${i}.png` });
    if (i < 4) await page.click('#tour [data-tour=next]');
  }
  await page.click('#tour [data-tour=report]');
  await page.waitForSelector('#panel-reports.active');
  console.log(name, 'tour done, seen flag:', await page.evaluate(() => localStorage.getItem('ks_tour_seen')));
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'no console errors');
