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

// Mobile viewport.
await page.setViewportSize({ width: 420, height: 850 });
await page.waitForTimeout(200);
await page.screenshot({ path: resolve(OUT, 'mobile-princeps.png'), fullPage: true });

console.log(`Console errors: ${errors.length ? errors.join('\n  ') : 'none'}`);
console.log(`Screenshots written to ${OUT}`);

await browser.close();
