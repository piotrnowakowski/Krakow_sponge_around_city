// Smoke test: load the app, wait for the map to settle, report console errors, take screenshots.
// Usage: node check.mjs [url] [outDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || '../output/check';
mkdirSync(out, { recursive: true });

export async function launch() {
  return chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
}

export function watch(page, errors) {
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
}

export async function ready(page) {
  await page.waitForSelector('#loading[hidden]', { state: 'attached', timeout: 90000 });
  await page.waitForTimeout(1500);
}

if (import.meta.url === `file:///${process.argv[1].replaceAll('\\', '/')}`) {
  const browser = await launch();
  const errors = [];
  for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: name === 'mobile' ? 2 : 1 });
    watch(page, errors);
    page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url().slice(0, 140)} ${r.failure()?.errorText}`));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await ready(page).catch((e) => errors.push(`not ready: ${e.message.split('\n')[0]}`));
    await page.screenshot({ path: `${out}/${name}.png` });
    await page.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'no console errors');
}
