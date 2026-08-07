/**
 * Screenshots the dev gun contact sheet so mesh orientation can be reviewed.
 *
 * Needs the Vite dev server up (npm start). SwiftShader is forced on because
 * headless Chromium has no GPU, and without it every WebGL context fails and
 * the sheet screenshots as an empty grid.
 *
 *   node scripts/gunsheet-shot.mjs [baseUrl]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:3000/killing-for-pie';
const OUT = path.resolve('screenshots');

/** Full sheets first, then big cards for the guns worth a close look. */
const SHOTS = [
  { name: 'guns-side', query: 'view=side' },
  { name: 'guns-top', query: 'view=top' },
  { name: 'guns-hero', query: 'view=hero' },
  {
    name: 'guns-detail-rifles',
    query: 'view=side&cols=2&h=430&only=mosin,sniper,ak47,m14',
  },
  {
    name: 'guns-detail-rest',
    query: 'view=side&cols=2&h=430&only=m1911,mp5,olympia,rakia',
  },
];

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

const page = await browser.newPage({
  viewport: { width: 1640, height: 1100 },
  deviceScaleFactor: 1.5,
});

const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

await mkdir(OUT, { recursive: true });

for (const shot of SHOTS) {
  await page.goto(`${BASE}/gunsheet.html?${shot.query}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.card canvas');

  // Every canvas must have drawn something other than the flat background before
  // the shot is meaningful; toDataURL works because the sheet keeps the
  // drawing buffer around.
  await page.waitForFunction(
    () => {
      const cards = [...document.querySelectorAll('.card')];
      if (!cards.length) return false;
      return cards.every((card) => {
        const c = card.querySelector('canvas');
        return c && c.width > 0 && c.toDataURL().length > 4000;
      });
    },
    null,
    { timeout: 45000 }
  );

  const file = path.join(OUT, `${shot.name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const count = await page.locator('.card').count();
  console.log(`${shot.name}: ${count} guns -> ${file}`);
}

await browser.close();

if (problems.length) {
  await writeFile(path.join(OUT, 'gunsheet-errors.log'), problems.join('\n'));
  console.log(`\n${problems.length} page error(s):`);
  for (const p of [...new Set(problems)].slice(0, 20)) console.log(`  ${p}`);
  process.exitCode = 1;
} else {
  console.log('\nno page errors');
}
