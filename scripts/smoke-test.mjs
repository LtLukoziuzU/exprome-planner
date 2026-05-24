// Smoke test: boots the running dev server, drives a few clicks, and
// captures screenshots. Uses system Chromium (no Playwright browser install).
// Run with: `npm run smoke` (the dev server must already be running).

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../screenshots');
mkdirSync(OUT, { recursive: true });

const URL = process.env.SMOKE_URL ?? 'http://localhost:5173/';

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// Allocate 1 rank in the first skill (Brace, Princeps Defender). Tier-2 unlocks
// and the Brace→Fortress connector should switch from dim to gold.
const firstCell = page.locator('.cell').first();
const before = await firstCell.getAttribute('aria-label');
await firstCell.click();
await page.waitForTimeout(200);
const after = await firstCell.getAttribute('aria-label');
console.log(`First click: ${before} -> ${after}`);

await page.screenshot({ path: resolve(OUT, 'desktop-princeps.png'), fullPage: true });

// Hover over a cell to capture the custom tooltip.
const secondCell = page.locator('.cell').nth(2);
await secondCell.hover();
await page.waitForTimeout(250);
await page.screenshot({ path: resolve(OUT, 'desktop-tooltip.png'), fullPage: false });

// Mobile viewport.
await page.setViewportSize({ width: 420, height: 850 });
await page.waitForTimeout(200);
await page.screenshot({ path: resolve(OUT, 'mobile-princeps.png'), fullPage: true });

// Back to desktop, switch to Outpost tab.
await page.setViewportSize({ width: 1400, height: 900 });
await page.getByRole('button', { name: 'Outpost' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(OUT, 'desktop-outpost-empty.png'), fullPage: true });

// Plan node 1 (Speculator Tent — first child of R1, always buildable).
const node1 = page.locator('[aria-label="Speculator Tent"]').first();
await node1.click();
await page.waitForTimeout(150);
const status1 = await node1.locator('circle').first().getAttribute('class');
console.log('After 1st click on Speculator Tent — circle classes:', status1);

// Click again to mark owned.
await node1.click();
await page.waitForTimeout(150);
await page.screenshot({ path: resolve(OUT, 'desktop-outpost-planned.png'), fullPage: true });

// Hover a different node to capture the custom tooltip.
await page.locator('[aria-label="Bath"]').first().hover();
await page.waitForTimeout(300);
await page.screenshot({ path: resolve(OUT, 'desktop-outpost-tooltip.png'), fullPage: false });

// Export / import round-trip.
await page.getByRole('button', { name: 'Export' }).click();
await page.waitForTimeout(200);
const exported = await page.locator('textarea').inputValue();
console.log('Exported length:', exported.length, 'starts:', exported.slice(0, 40));
await page.getByRole('button', { name: 'Close', exact: true }).first().click();
await page.waitForTimeout(100);

// Now import the same string — should add a new build.
await page.getByRole('button', { name: 'Import' }).click();
await page.waitForTimeout(150);
await page.locator('textarea').fill(exported);
await page.locator('button.primary').click(); // the Import button inside the modal
await page.waitForTimeout(200);
const buildOptions = await page.locator('select option').allTextContents();
console.log('Build dropdown after import:', buildOptions);
await page.screenshot({ path: resolve(OUT, 'desktop-after-import.png'), fullPage: false });

console.log(`Console errors: ${errors.length ? errors.join('\n  ') : 'none'}`);
console.log(`Screenshots written to ${OUT}`);

await browser.close();
