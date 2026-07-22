import { chromium } from 'playwright';

const b = await chromium.launch();
process.on('unhandledRejection', (e) => { console.log('HATA ADIMI:', ADIM, '\n', String(e).slice(0,200)); process.exit(1); });
const page = await b.newPage({ viewport: { width: 1440, height: 950 } });
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
const top = () => page.evaluate(() => window.scrollTo(0, 0));
const sekme = async (n) => { await top(); await page.getByRole('tab', { name: n }).click({ force: true }); };
let ADIM='baslangic';
const norm = (t) => t.toLocaleLowerCase('tr').replace(/\u0307/g, '');
const ok = (n, c, extra = '') => console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${extra ? ' — ' + extra : ''}`);

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// 1 — 7 sekme + gecis suresi
const tabs = await page.getByRole('tab').count();
const names = ['Talep & Tahmin','Envanter Sağlığı','Risk & Kritiklik','Ağ & Kapsama','Senaryo Simülatörü','PN Gezgini','Genel Bakış'];
// gecis suresi sayfa icinde olculuyor: tiklamadan bir sonraki boyamaya kadar
let worst = 0;
for (const n of names) {
  await sekme(n);
  await page.waitForTimeout(500); // lazy chunk insin
}
for (const n of names) {
  const ms = await page.evaluate((nn) => new Promise((res) => {
    const el = [...document.querySelectorAll('[role=tab]')].find((e) => e.textContent.includes(nn.split(' ')[0]));
    const t0 = performance.now();
    el.click();
    requestAnimationFrame(() => requestAnimationFrame(() => res(performance.now() - t0)));
  }), n);
  worst = Math.max(worst, ms);
}
ADIM='1. 7 sekme geziliyor';
ok('1. 7 sekme geziliyor', tabs === 7, `${tabs} sekme, en yavaş geçiş ${worst.toFixed(0)} ms (önbellekli chunk)`);

// 3 — planned placeholder
await sekme('Ağ & Kapsama');
await page.waitForTimeout(900);
const ph = await page.locator('.border-dashed').count();
ADIM='3. planned yer tutucular';
ok('3. planned yer tutucular', ph >= 2, `${ph} kesikli kart`);

// 4 — geri sayim panosu
await sekme('Genel Bakış');
await page.waitForTimeout(1400);
// NOT: bu etiketler DOM'da kucuk harf, buyuk harfe CSS ile ceviriliyor
const board = await page.getByText(/sipariş geri sayımı/i).first().isVisible();
const head = await page.getByText(/408 gecikmiş/i).first().isVisible();
const row1 = await page.locator('button:has-text("PN-101058")').first().innerText();
ADIM='4. geri sayım panosu';
ok('4. geri sayım panosu', board && head && row1.includes('−73'), `ilk satır: ${row1.replace(/\s+/g,' ').trim().slice(0,60)}`);

// 4b — satir tiklama cekmeceyi aciyor
await page.locator('button:has-text("PN-101058")').first().click();
await page.getByRole('dialog').getByText(/kalan gün/i).waitFor({ timeout: 15000 });
const drawer = await page.getByRole('dialog').isVisible();
const drawerHas = await page.getByRole('dialog').innerText();
ADIM='4b. PN detay çekmecesi';
const d = norm(drawerHas);
ok('4b. PN detay çekmecesi', drawer && d.includes('geri sayım') && d.includes('kalan gün') && d.includes('tedarik'), 'talep/tedarik/stok/geri sayım blokları + Escape');
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
const kilit = await page.evaluate(() => document.body.style.overflow);
ok('4c. çekmece kapanınca sayfa kilidi kalkıyor', kilit === '', `body.overflow="${kilit}"`);

// 5 — explorer sanallastirma
await sekme('PN Gezgini');
await page.waitForTimeout(1800);
const scroller = page.locator('div.h-\\[460px\\]').first();
const domRows = await scroller.locator('> div > div').count();
await scroller.evaluate((e) => (e.scrollTop = 60000));
await page.waitForTimeout(600);
const domRows2 = await scroller.locator('> div > div').count();
const listed = await page.locator('text=/5\\.000 PN listeleniyor/').first().isVisible();
ADIM='5. 5.000 satır sanallaştırma';
ok('5. 5.000 satır sanallaştırma', domRows < 60 && domRows2 < 60 && listed, `DOM'da ${domRows}→${domRows2} satır`);

// 6 — senaryo slider canli hesap
await sekme('Senaryo Simülatörü');
await page.waitForTimeout(1500);
const kart = () => page.getByText(/açığa düşen pn/i).first().locator('..');
const before = await kart().innerText();
await page.getByRole('button', { name: 'Küresel tıkanma' }).click();
await page.waitForTimeout(600);
const after = await kart().innerText();
const t0 = Date.now();
const sl = page.locator('input[type=range]').first();
for (const v of [10,20,30,40,50,60,70,80]) await sl.fill(String(v));
await page.waitForTimeout(400);
ADIM='6. senaryo canlı hesap';
ok('6. senaryo canlı hesap', before !== after, `baz "${before.split('\n')[1]}" → kriz "${after.split('\n')[1]}", 8 slider adımı ${Date.now()-t0} ms`);

ADIM='7-harita-sekmesi';
// 7 — harita
await sekme('Ağ & Kapsama');
await page.waitForTimeout(3000);
ADIM='7-marker-tikla';
const markers = await page.locator('.maplibregl-marker').count();
await page.getByRole('button', { name: /Ankara Esenboğa/ }).click();
await page.waitForTimeout(700);
const popup = await page.locator('.maplibregl-popup').isVisible();
ADIM='7. harita 15 istasyon + tıklama';
ok('7. harita 15 istasyon + tıklama', markers === 15 && popup, `${markers} işaretçi, popup ${popup ? 'açıldı' : 'açılmadı'}`);

ADIM='sozluk-butonu';
// sozluk
await page.getByRole('button', { name: 'Terimler sözlüğü' }).click();
await page.waitForTimeout(500);
const gl = await page.getByRole('dialog', { name: 'Terimler sözlüğü' }).innerText();
ok('sözlük modalı', gl.includes('AOG') && gl.includes('TAT'), `${(gl.match(/\n/g)||[]).length} satır`);

console.log(errs.length ? '\nKONSOL HATALARI:\n' + errs.join('\n') : '\nkonsol hatası yok');
await b.close();
