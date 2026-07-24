/* Headless smoke test: app.js'i gerçek DATA ile, DOM+Chart stub'larıyla çalıştırır.
   Tüm view'ları, filtreleri ve senaryo motorunu tetikler. */
'use strict';
const fs = require('fs');
const ROOT = __dirname;
const html = fs.readFileSync(ROOT + '/catalyst.html', 'utf8');
const m = html.match(/<script>const DATA=([\s\S]*?);<\/script>/);
if (!m) { console.error('DATA bloğu bulunamadı'); process.exit(1); }
const DATA = JSON.parse(m[1]);

/* ---- DOM stub ---- */
const els = {};
let elSeq = 0;
function makeEl(id) {
  const listeners = {};
  const el = {
    id: id || 'anon' + (++elSeq),
    _html: '', dataset: {}, value: '', textContent: '',
    style: {}, scrollTop: 0, scrollHeight: 0, children: [],
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); },
      remove(...c) { c.forEach(x => this._s.delete(x)); },
      toggle(c, f) { (f === undefined ? !this._s.has(c) : f) ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    set innerHTML(v) {
      this._html = String(v);
      if (/undefined|NaN|\[object Object\]/.test(this._html)) {
        const ctx = this._html.match(/.{0,70}(undefined|NaN|\[object Object\]).{0,40}/);
        issues.push(`innerHTML[#${this.id}] şüpheli içerik: …${ctx[0].replace(/\s+/g, ' ')}…`);
      }
    },
    get innerHTML() { return this._html; },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    _fire(t, ev) { (listeners[t] || []).forEach(fn => fn(ev)); },
    appendChild(c) { this.children.push(c); },
    insertAdjacentHTML(_, v) {
      injected.push(String(v));
      if (/undefined|NaN(?!N)/.test(v)) issues.push(`insertAdjacentHTML[#${this.id}] şüpheli içerik`);
    },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    scrollIntoView() {},
    setAttribute() {}, getAttribute() { return ''; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 468 }; },
    closest() { return null; },
    getContext() { return {}; },
  };
  return el;
}
const issues = [];
const injected = [];
global.document = {
  body: makeEl('body'),
  getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
  querySelector() { return makeEl(); },
  querySelectorAll() { return []; },
  createElement() { return makeEl(); },
  addEventListener() {},
};
global.window = global;
global.setTimeout = fn => fn();          // zamanlanmış işleri senkron çalıştır

/* ---- Chart stub ---- */
const charts = [];
function Chart(el, cfg) {
  if (!el) issues.push('Chart: null canvas');
  if (!cfg || !cfg.data) issues.push('Chart: config.data yok');
  const walk = (o, path) => {
    if (o == null) return;
    if (Array.isArray(o)) return o.forEach((v, i) => walk(v, path + '[' + i + ']'));
    if (typeof o === 'object') return Object.entries(o).forEach(([k, v]) => walk(v, path + '.' + k));
    if (typeof o === 'number' && Number.isNaN(o)) issues.push(`Chart NaN: ${path} (canvas #${el && el.id})`);
    if (o === undefined) issues.push(`Chart undefined: ${path}`);
  };
  (cfg.data.datasets || []).forEach((d, i) => walk(d.data, `ds[${i}]${d.label ? ':' + d.label : ''}`));
  this.data = cfg.data;
  this.update = () => {}; this.destroy = () => {};
  charts.push(this);
}
Chart.defaults = { color: '', borderColor: '', font: {}, plugins: { legend: { labels: {} } } };
global.Chart = Chart;
global.DATA = DATA;

/* ---- app.js'i çalıştır ---- */
const src = fs.readFileSync(ROOT + '/assets/app.js', 'utf8');
try { eval(src + '\n;global.__APP={senaryoHesap,poissonMin,fmt,f1,W,SC,PRESETS,H};'); } catch (e) { console.error('✗ ÜST DÜZEY HATA:', e.stack.split('\n').slice(0, 4).join('\n')); process.exit(1); }

function step(name, fn) {
  try { fn(); console.log('✓', name); }
  catch (e) { console.error('✗', name, '→', e.stack.split('\n').slice(0, 3).join(' | ')); process.exitCode = 1; }
}

/* tüm view'lar */
step('kokpit (başlangıçta render)', () => { if (!els['cCap']) throw new Error('cCap yok'); });
step('watchlist render', () => els['tabs']._fire('click', { target: { closest: () => ({ dataset: { v: 'watch' } }) } }));
step('öngörü render', () => els['tabs']._fire('click', { target: { closest: () => ({ dataset: { v: 'ongoru' } }) } }));
step('harita render', () => els['tabs']._fire('click', { target: { closest: () => ({ dataset: { v: 'harita' } }) } }));
step('senaryo render', () => els['tabs']._fire('click', { target: { closest: () => ({ dataset: { v: 'senaryo' } }) } }));

/* watchlist etkileşimleri */
step('arama filtresi (engine)', () => { els['wQ'].value = 'engine'; els['wQ']._fire('input', { target: els['wQ'] }); });
step('kritiklik filtresi (AOG)', () => { els['wKr'].value = '0'; els['wKr']._fire('change', { target: els['wKr'] }); });

/* senaryo motoru — baz 134 doğrulaması + preset'ler */
step('senaryo baz = 134 kırmızı', () => {
  const r = __APP.senaryoHesap({ d: 0, l: 0, s: 0, yeniDem: 0, disOnly: false });
  if (r.kir !== 134) throw new Error('baz kırmızı ' + r.kir + ' ≠ 134');
  if (r.kirAog !== 22) throw new Error('baz AOG ' + r.kirAog + ' ≠ 22');
  const sum = r.byKr[0] + r.byKr[1] + r.byKr[2];
  if (sum !== 134) throw new Error('byKr toplamı ' + sum);
});
step('motor krizi senaryosu artış üretir', () => {
  const r = __APP.senaryoHesap({ d: 0, l: 30, s: 0, yeniDem: 1.5, disOnly: true });
  if (!(r.kir > 134)) throw new Error('motor krizi kırmızıyı artırmadı: ' + r.kir);
  console.log('   motor krizi: kırmızı 134→' + r.kir + ' · 2033 açığı ' + r.acik + ' · ek ' + (r.ek / 1e6).toFixed(1) + 'M$');
});
step('poissonMin akıl sağlığı', () => {
  if (__APP.poissonMin(0, .95) !== 0) throw new Error('mu=0');
  const a = __APP.poissonMin(2, .90), b = __APP.poissonMin(2, .98);
  if (!(b >= a)) throw new Error('hedef sıkılaşınca MIN düşmemeli');
  const big = __APP.poissonMin(150, .95);
  if (!(big > 150 && big < 200)) throw new Error('mu=150 → ' + big);
});

/* yeni: ROI + eğri + OEM preset + PN-önekli arama */
step('W.showDetail eğri çizer (destroy dahil)', () => {
  __APP.W.showDetail(0); __APP.W.showDetail(5);   // ikincisi destroy yolunu test eder
});
step('PN-önekli arama eşleşir', () => {
  __APP.W.reset(); __APP.W.apply();               // önceki adımların filtrelerini temizle
  els['wQ'].value = 'PN-101741'; els['wQ']._fire('input', { target: els['wQ'] });
  if (!els['wNote'].textContent.includes('1 parça')) throw new Error('eşleşme yok: ' + els['wNote'].textContent);
});
step('OEM preset kuculDem etkisi', () => {
  const r = __APP.senaryoHesap(__APP.PRESETS.oem);
  if (!(r.kir > 134)) throw new Error('OEM preset kırmızıyı artırmadı: ' + r.kir);
  console.log('   OEM gecikmesi: kırmızı 134→' + r.kir);
});
step('ROI payload tablosu dolu', () => {
  if (!DATA.roi || DATA.roi.id.length !== 40) throw new Error('roi eksik');
  const t = DATA.roi.tasarruf.reduce((a,b)=>a+b,0);
  if (!(t > 1e6)) throw new Error('tasarruf toplamı anlamsız: ' + t);
});

/* yeni özellikler: payload */
step('abcxyz matrisi 5000 PN', () => {
  const t = DATA.abcxyz.sayi.flat().reduce((a,b)=>a+b,0);
  if (t !== 5000) throw new Error('toplam ' + t);
});
step('159 hurda anomalisi / 150 pool bağımlı', () => {
  if (DATA.kpi.scrap_anomali !== 159) throw new Error('kpi anomali ' + DATA.kpi.scrap_anomali);
  if (DATA.kpi.pool_bagimli !== 150) throw new Error('kpi pool ' + DATA.kpi.pool_bagimli);
  const b6 = DATA.pn.flags.filter(f => f & 64).length, b7 = DATA.pn.flags.filter(f => f & 128).length;
  if (b6 !== 159 || b7 !== 150) throw new Error('bayrak bitleri ' + b6 + '/' + b7);
});
step('cold-start Bayes yakınsaması', () => {
  const cs = DATA.coldstart, K0 = 1;
  const post = n => (K0*cs.prior + cs.q.slice(0,n).reduce((a,b)=>a+b,0)) / (K0+n);
  if (!(Math.abs(post(4) - cs.gercek) < Math.abs(cs.prior - cs.gercek)))
    throw new Error('posterior gerçeğe yaklaşmıyor: ' + post(4));
});
step('tahmin gezgini verisi tam', () => {
  if (DATA.pn.q4.length !== 5000) throw new Error('q4 eksik');
  const nn = DATA.pn.nn4.filter(v => v != null).length;
  if (nn !== 5000) throw new Error('nn4 dolu değil: ' + nn);
});
step('mlSeg kırılımları', () => {
  ['kesiklilik','kritiklik','hacim'].forEach(k => {
    const g = DATA.mlSeg[k];
    if (!g || !g.nn.length || g.nn.some(v => v == null)) throw new Error(k + ' bozuk');
  });
});

/* yeni özellikler: parametre paneli (senaryo render edildi) */
step('parametre paneli varsayılanları 134 üretir', () => {
  const html = els['pK']._html;
  if (!html.includes('134')) throw new Error('kırmızı 134 görünmüyor');
  if (!html.includes('338')) throw new Error('BER 338 görünmüyor');
  if (!els['pTop']._html.includes('PN-101741')) throw new Error('top-1 PN-101741 değil');
});
step('parametre kaydırıcısı canlı yeniden hesap', () => {
  els['pTam'].value = '20'; els['pTam']._fire('input', { target: els['pTam'] });
  if (!(parseInt((els['pK']._html.match(/>([\d.]+)</) || [])[1]) !== 134 || els['pK']._html.includes('baz 134')))
    throw new Error('tampon etkisi görünmüyor');
  els['pSifirla']._fire('click', {});
  if (!els['pK']._html.includes('134')) throw new Error('sıfırlama çalışmadı');
});

/* yeni özellikler: harita */
step('harita SVG zemini kuruldu (TR + küresel)', () => {
  const svg = els['hSvg'];
  if (!svg._html.includes('tland')) throw new Error('Türkiye konturu yok');
  if (!svg._html.includes('AZİMUT')) throw new Error('küresel görünüm zemini yok');
});
step('havalimanı mutabakatı — case tablosu birebir', () => {
  const HA = DATA.harita;
  if (HA.kod.length !== 25) throw new Error('25 havalimanı bekleniyordu: ' + HA.kod.length);
  const s25 = HA.u25.reduce((a,b)=>a+b,0), s33 = HA.u33.reduce((a,b)=>a+b,0);
  if (s25 !== 1200 || s33 !== 2000) throw new Error('filo toplamı ' + s25 + '/' + s33);
  HA.grup.kod.forEach((g, gi) => {
    const g25 = HA.kod.reduce((a,_,i)=>a+(HA.grp[i]===g?HA.u25[i]:0),0);
    const g33 = HA.kod.reduce((a,_,i)=>a+(HA.grp[i]===g?HA.u33[i]:0),0);
    if (g25 !== HA.grup.u25[gi] || g33 !== HA.grup.u33[gi])
      throw new Error(g + ' grubu tutmuyor: ' + g25 + '/' + HA.grup.u25[gi]);
  });
  const p25 = HA.pay25.reduce((a,b)=>a+b,0);
  if (Math.abs(p25 - 1) > .01) throw new Error('pay25 toplamı ' + p25);
});
step('küresel ağ moduna geçiş', () => {
  els['v-harita']._fire('click', { target: { closest: sel => sel === '.hm' ? { dataset: { m: 'gl' } } : null } });
  if (__APP.H.mode !== 'gl') throw new Error('mod değişmedi');
  els['v-harita']._fire('click', { target: { closest: sel => sel === '.hm' ? { dataset: { m: 'tr' } } : null } });
  if (__APP.H.mode !== 'tr') throw new Error('geri dönmedi');
});
step('gezgin THY/Pool kırılımı + ATA sözlüğü', () => {
  if (DATA.pn.tq1.length !== 5000) throw new Error('tq1 eksik');
  for (const i of [0, 100, 4999]){
    const q = [DATA.pn.q1[i],DATA.pn.q2[i],DATA.pn.q3[i],DATA.pn.q4[i]];
    const t = [DATA.pn.tq1[i],DATA.pn.tq2[i],DATA.pn.tq3[i],DATA.pn.tq4[i]];
    t.forEach((v,n)=>{ if (v > q[n]) throw new Error('THY > toplam: PN idx ' + i); });
  }
  if (DATA.lookup.ata.length !== DATA.lookup.sub.length) throw new Error('ata sözlüğü eksik');
});
step('harita kategori filtresi', () => {
  els['hKat'].value = '0'; els['hKat']._fire('change', { target: els['hKat'] });
  if (__APP.H.kat !== '0') throw new Error('kategori seçilmedi');
  els['hKat'].value = 'all'; els['hKat']._fire('change', { target: els['hKat'] });
});
step('harita kriz katmanı + 2033 + akış', () => {
  const fire = t => els['v-harita']._fire('click', { target: { closest: sel => sel === '.tg' ? { dataset: { t } } : null } });
  fire('kriz'); if (!__APP.H.kriz) throw new Error('kriz katmanı açılmadı');
  fire('yil33'); if (!__APP.H.yil33) throw new Error('2033 anahtarı açılmadı');
  fire('akis'); if (!__APP.H.akis) throw new Error('akış okları açılmadı');
  fire('kriz'); fire('yil33'); fire('akis');
});


step('derin analiz payload — MC/tornado/opt/backtest', () => {
  if (!(DATA.mc.uyum > 95)) throw new Error('MC uyumu düşük: ' + DATA.mc.uyum);
  if (!(DATA.mc.motor.acik_ort > DATA.mc.baz.acik_ort)) throw new Error('kriz MC baz altında');
  if (DATA.tornado.etiket.length !== 4) throw new Error('tornado 4 faktör değil');
  DATA.tornado.etiket.forEach((_, i) => {
    if (DATA.tornado.dusuk[i] > DATA.tornado.yuksek[i]) throw new Error('tornado ucu ters');
  });
  const son = DATA.opt.kapanan[DATA.opt.kapanan.length - 1];
  if (son !== DATA.kpi.acik33) throw new Error('opt kapanan ' + son + ' ≠ acik33 ' + DATA.kpi.acik33);
  if (DATA.opt.ilk10.length !== 10) throw new Error('ilk10 eksik');
  for (let i = 1; i < DATA.opt.butce.length; i++)
    if (DATA.opt.butce[i] < DATA.opt.butce[i-1]) throw new Error('bütçe eğrisi monoton değil');
  if (!(DATA.backtest.toplam_hata[3] < 2)) throw new Error('mevsimli toplam hata beklenenden büyük');
});
step('mimari şeması gömülü', () => {
  const all = Object.values(els).map(e => e._html).join(' ');
  if (!all.includes('GERİ YAZMA YOK')) throw new Error('mimari SVG yok');
  if (!all.includes('Monte Carlo doğrulaması')) throw new Error('MC kartı yok');
  if (!all.includes('Kaynak önceliklendirme')) throw new Error('opt kartı yok');
  if (!all.includes('Geriye dönük test')) throw new Error('backtest kartı yok');
});


step('sözlük — açılış, arama, kapanış', () => {
  els['dicBtn']._fire('click', {});
  if (!els['dicBox'].classList.contains('on')) throw new Error('sözlük açılmadı');
  if ((els['dicList']._html.match(/dic-row/g) || []).length < 30) throw new Error('terim sayısı eksik');
  els['dicQ'].value = 'toparlanma'; els['dicQ']._fire('input', { target: els['dicQ'] });
  if (!els['dicList']._html.includes('TTR')) throw new Error('arama TTR bulamadı');
  if ((els['dicList']._html.match(/dic-row/g) || []).length > 3) throw new Error('arama filtrelemedi');
  els['dicQ'].value = 'zzzz'; els['dicQ']._fire('input', { target: els['dicQ'] });
  if (!els['dicList']._html.includes('Eşleşme yok')) throw new Error('boş sonuç mesajı yok');
  els['dicX']._fire('click', {});
  if (els['dicBox'].classList.contains('on')) throw new Error('sözlük kapanmadı');
});

/* Türkçe format akıl sağlığı */
step('tr-TR sayı formatı', () => {
  if (__APP.fmt(90016) !== '90.016') throw new Error(__APP.fmt(90016));
  if (__APP.f1(63.2) !== '63,2') throw new Error(__APP.f1(63.2));
});

/* runtime string doğrulamaları */
step('render: BER virgül + $12,1M + ROI', () => {
  const all = Object.values(els).map(e => e._html).join(' ') + ' ' + injected.join(' ');
  if (!all.includes('BER eşiği 0,65')) throw new Error('footer BER eşiği 0,65 render edilmedi');
  if (!all.includes('$12,1M')) throw new Error('$12,1M render edilmedi');
  if (all.includes('12,2M')) throw new Error('12,2M hâlâ görünüyor');
  if (!all.includes("%39,2'si")) throw new Error("39,2'si eki render edilmedi");
});

console.log('\ncharts oluşturuldu:', charts.length);
if (issues.length) { console.log('\n⚠ ŞÜPHELİ İÇERİK (' + issues.length + '):'); [...new Set(issues)].slice(0, 25).forEach(s => console.log('  -', s)); process.exitCode = 1; }
else console.log('⚠ şüpheli içerik yok');
console.log(process.exitCode ? '\nSONUÇ: SORUN VAR' : '\nSONUÇ: TEMİZ');
