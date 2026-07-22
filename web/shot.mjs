import { chromium } from 'playwright';

const tabs = process.argv[2] ? process.argv[2].split(',') : ['Genel Bakış'];
const width = Number(process.argv[3] || 1440);
const out = process.argv[4] || '/tmp/shots';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1000 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

for (const t of tabs) {
  if (t !== 'Genel Bakış') {
    await page.getByRole('tab', { name: t }).click();
    await page.waitForTimeout(1200);
  } else {
    await page.waitForTimeout(1500);
  }
  const slug = t.replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ ]/g, '').replace(/ /g, '_');
  await page.screenshot({ path: `${out}/${width}-${slug}.png`, fullPage: true });
  console.log('shot:', slug);
}

console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
