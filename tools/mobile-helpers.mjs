export async function setLanguage(page, lang) {
  if (await page.locator('#mobile-language').isVisible()) await page.locator('#mobile-language').selectOption(lang);
  else await page.locator(`[data-lang="${lang}"]`).click();
}

export async function openTab(page, tab) {
  if (await page.locator('#mobile-more').isVisible()) {
    if (!(await page.locator(`[data-mobile-tab="${tab}"]`).isVisible())) await page.locator('#mobile-more').click();
    await page.locator(`[data-mobile-tab="${tab}"]`).click();
  } else await page.locator(`[data-tab="${tab}"]`).click();
}

export async function startStory(page) {
  if (await page.locator('#mobile-more').isVisible()) {
    if (!(await page.locator('#mobile-tour').isVisible())) await page.locator('#mobile-more').click();
    await page.locator('#mobile-tour').click();
  } else await page.locator('#tour-btn').click();
}
