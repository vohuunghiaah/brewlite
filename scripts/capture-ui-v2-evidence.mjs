import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const docEvidenceDir = path.join(root, 'docs/ui/v2-evidence');
const brainDir = 'C:/Users/vhn/.gemini/antigravity/brain/9060abd3-3726-4dfd-bd0a-454dd00e074c';

for (const dir of [docEvidenceDir, brainDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function saveScreenshot(page, filename, options = {}) {
  const docPath = path.join(docEvidenceDir, filename);
  const brainPath = path.join(brainDir, filename);
  await page.screenshot({ path: docPath, ...options });
  fs.copyFileSync(docPath, brainPath);
  console.log(`[SAVED] ${filename} -> docs & brain`);
}

async function run() {
  console.log('--- CAPTURING UI V2 EVIDENCE SCREENSHOTS ---');
  const browser = await chromium.launch({ headless: true });

  // 1. DESKTOP VIEWPORT (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  });
  const desktopPage = await desktopContext.newPage();

  console.log('Navigating to Home on Desktop...');
  await desktopPage.goto('http://localhost:3000/#top', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1000);

  // 1.1 Home Hero & Discovery (Desktop)
  await saveScreenshot(desktopPage, 'ui-v2-01-home-hero-desktop.png');

  // 1.2 Home Full Page (Desktop)
  await saveScreenshot(desktopPage, 'ui-v2-02-home-full-desktop.png', { fullPage: true });

  // 1.3 Menu Screen (Desktop)
  console.log('Navigating to Menu on Desktop...');
  await desktopPage.click('button:has-text("Khám phá thực đơn"), a:has-text("Thực đơn"), button:has-text("Xem menu")');
  await desktopPage.waitForTimeout(1000);
  await saveScreenshot(desktopPage, 'ui-v2-03-menu-catalog-desktop.png');

  // 1.4 Category Filter: Trà trái cây
  console.log('Filtering by Trà trái cây...');
  const fruitTeaBtn = desktopPage.locator('button:has-text("Trà trái cây")').first();
  if (await fruitTeaBtn.isVisible()) {
    await fruitTeaBtn.click();
    await desktopPage.waitForTimeout(800);
    await saveScreenshot(desktopPage, 'ui-v2-04-category-filter-fruit-tea.png');
  }

  // 1.5 Reset to "Tất cả" to see stock badges
  const allBtn = desktopPage.locator('button:has-text("Tất cả")').first();
  if (await allBtn.isVisible()) {
    await allBtn.click();
    await desktopPage.waitForTimeout(600);
  }

  // 1.6 Modal In-Stock Customization
  console.log('Opening In-Stock Product Modal (Cà phê Latte)...');
  const latteCard = desktopPage.locator('h3:has-text("Cà phê Latte")').first();
  if (await latteCard.isVisible()) {
    await latteCard.click();
    await desktopPage.waitForSelector('[role="dialog"]');
    await desktopPage.waitForTimeout(800);
    await saveScreenshot(desktopPage, 'ui-v2-05-modal-in-stock.png');
    // Close modal
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(500);
  }

  // 1.7 Modal Out-of-Stock (Matcha Latte)
  console.log('Opening Out-of-Stock Product Modal (Matcha Latte)...');
  const matchaCard = desktopPage.locator('h3:has-text("Matcha Latte")').first();
  if (await matchaCard.isVisible()) {
    await matchaCard.click();
    await desktopPage.waitForSelector('[role="dialog"]');
    await desktopPage.waitForTimeout(800);
    await saveScreenshot(desktopPage, 'ui-v2-06-modal-out-of-stock.png');
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(500);
  }

  // 1.8 Modal Low-Stock (Cold Brew cam)
  console.log('Opening Low-Stock Product Modal (Cold Brew cam)...');
  const coldBrewCard = desktopPage.locator('h3:has-text("Cold Brew cam")').first();
  if (await coldBrewCard.isVisible()) {
    await coldBrewCard.click();
    await desktopPage.waitForSelector('[role="dialog"]');
    await desktopPage.waitForTimeout(800);
    await saveScreenshot(desktopPage, 'ui-v2-07-modal-low-stock.png');
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(500);
  }

  await desktopContext.close();

  // 2. MOBILE VIEWPORT (375x812)
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log('Navigating to Home on Mobile...');
  await mobilePage.goto('http://localhost:3000/#top', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  await saveScreenshot(mobilePage, 'ui-v2-08-home-mobile.png');

  console.log('Navigating to Menu on Mobile...');
  await mobilePage.goto('http://localhost:3000/#menu', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  await saveScreenshot(mobilePage, 'ui-v2-09-menu-mobile.png');

  await mobileContext.close();
  await browser.close();
  console.log('--- ALL UI V2 EVIDENCE SCREENSHOTS CAPTURED SUCCESSFULLY ---');
}

run().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
