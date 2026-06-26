// tests/liveness/liveness.spec.ts — THE GATE. Runs against the DEPLOYED bundle
// (vite build -> vite preview), never the dev server. A slice is NOT done until
// the assertions for that slice are green here and a screenshot is saved.
// Vitest does NOT substitute — it passed through two blank screens.
//
// Setup:
//   npm i -D @playwright/test && npx playwright install chromium
//   scripts: "build":"vite build","preview":"vite preview --port 4317",
//            "test:live":"playwright test tests/liveness"
//   Run: npm run build && (npm run preview &) && \
//        SLICE=S0 LIVE_URL=http://localhost:4317 npm run test:live
//
// DEBUG HOOKS the app must expose in dev/preview builds (window.*):
//   __debugEntityScreenPos(id) -> {sx,sy}      (S0)
//   __debugCredits(playerId)   -> number       (S1)
//   __debugSelectionCount()    -> number        (S2)
//   __debugBuildingHp(id)      -> {hp,maxHp}    (S3)
//   __debugWinner()            -> playerId|null (S4/S6)

import { test, expect } from '@playwright/test';
import fs from 'fs';

const LIVE_URL = process.env.LIVE_URL ?? 'http://localhost:4317';
const SLICE = process.env.SLICE ?? 'S0';
const BG = { r: 12, g: 12, b: 20 };
const MIN_DRAW = 50, MIN_NONBG = 0.05;

async function instrument(page: any) {
  await page.addInitScript(() => {
    (window as any).__calls = { getContext: 0, fillRect: 0, drawImage: 0 };
    const proto = HTMLCanvasElement.prototype as any;
    const og = proto.getContext;
    proto.getContext = function (...a: any[]) {
      (window as any).__calls.getContext++;
      const ctx = og.apply(this, a);
      if (ctx && typeof ctx.fillRect === 'function' && !(ctx as any).__w) {
        (ctx as any).__w = true;
        const fr = ctx.fillRect.bind(ctx); ctx.fillRect = (...x: any[]) => { (window as any).__calls.fillRect++; return fr(...x); };
        const di = ctx.drawImage.bind(ctx); ctx.drawImage = (...x: any[]) => { (window as any).__calls.drawImage++; return di(...x); };
      }
      return ctx;
    };
  });
}
async function nonBgRatio(page: any) {
  return page.evaluate((bg: any) => {
    const c = document.querySelector('canvas') as HTMLCanvasElement; if (!c) return -1;
    const ctx = c.getContext('2d'); if (!ctx) return -2;
    const d = ctx.getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > bg.r + 4 || d[i + 1] > bg.g + 4 || d[i + 2] > bg.b + 4) n++;
    return n / (d.length / 4);
  }, BG);
}

test('LIVENESS: page is alive and not blank', async ({ page }) => {
  await instrument(page);
  const errs: string[] = [];
  page.on('console', (m: any) => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', (e: any) => errs.push(String(e)));
  await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
  await page.mouse.click(640, 400);
  await page.waitForTimeout(1000);
  fs.mkdirSync('test-results', { recursive: true });
  const a = await page.screenshot({ path: `test-results/${SLICE}-t1.png` });
  const posA = await page.evaluate(() => (window as any).__debugEntityScreenPos?.(0) ?? null);
  await page.waitForTimeout(2000);
  const b = await page.screenshot({ path: `test-results/${SLICE}-t3.png` });
  const posB = await page.evaluate(() => (window as any).__debugEntityScreenPos?.(0) ?? null);
  const calls = await page.evaluate(() => (window as any).__calls);

  expect(errs, errs.join('\n')).toEqual([]);
  expect(calls.getContext, 'getContext never called').toBeGreaterThan(0);
  expect(calls.fillRect + calls.drawImage, 'render body never ran (dead tick-gate?)').toBeGreaterThan(MIN_DRAW);
  expect(await nonBgRatio(page), 'blank screen').toBeGreaterThan(MIN_NONBG);
  expect(Buffer.compare(a, b), 'frozen frame — nothing moves').not.toBe(0);
  if (posA && posB) expect(posA.sx !== posB.sx || posA.sy !== posB.sy, 'entity 0 did not move').toBeTruthy();
});

test('S1: credits rise', async ({ page }) => {
  test.skip(!['S1','S2','S3','S4','S5','S6'].includes(SLICE), 'not at S1 yet');
  await page.goto(LIVE_URL, { waitUntil: 'networkidle' }); await page.mouse.click(640, 400);
  await page.waitForTimeout(2000); const c0 = await page.evaluate(() => (window as any).__debugCredits(0));
  await page.waitForTimeout(6000); const c1 = await page.evaluate(() => (window as any).__debugCredits(0));
  expect(c1, 'credits did not rise — economy not wired').toBeGreaterThan(c0);
});

test('S2: select + order moves a unit', async ({ page }) => {
  test.skip(!['S2','S3','S4','S5','S6'].includes(SLICE), 'not at S2 yet');
  await page.goto(LIVE_URL, { waitUntil: 'networkidle' }); await page.mouse.click(640, 400);
  await page.waitForTimeout(500);
  await page.mouse.click(400, 300);
  expect(await page.evaluate(() => (window as any).__debugSelectionCount())).toBeGreaterThan(0);
  const before = await page.evaluate(() => (window as any).__debugEntityScreenPos?.(0));
  await page.mouse.click(700, 500, { button: 'right' });
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => (window as any).__debugEntityScreenPos?.(0));
  expect(before.sx !== after.sx || before.sy !== after.sy, 'order had no effect').toBeTruthy();
});

test('S4/S6: winner hook present', async ({ page }) => {
  test.skip(!['S4','S6'].includes(SLICE), 'not at a combat gate');
  await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => typeof (window as any).__debugWinner)).toBe('function');
});