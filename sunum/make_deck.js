/* Kontrol Kulesi — jüri sunumu üreteci (11 slayt, koyu tema)
   Veri: deck_data.json (build_dashboard.build_payload'dan türetilir — sayılar dashboard ile aynı kaynaktan)
   Çalıştırma: node make_deck.js  →  kontrol_kulesi_sunum.pptx                                        */
'use strict';
const pptxgen = require('pptxgenjs');
const D = require('./deck_data.json');

const C = { bg:'0B1220', panel:'121B2E', panel2:'182338', line:'263450', text:'EAF0F7',
            muted:'9AA8C0', dim:'77869C', teal:'4FC1B0', amber:'E8A33D', red:'E06A6A',
            blue:'5B8FD6', violet:'9B8CE8' };
const F = { h:'Arial', b:'Arial', m:'Courier New' };
const tr1 = n => Number(n).toLocaleString('tr-TR', {minimumFractionDigits:1, maximumFractionDigits:1});
const tr0 = n => Math.round(n).toLocaleString('tr-TR');

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';                       // 13.33 × 7.5

function base(notes){
  const s = pres.addSlide();
  s.background = { color: C.bg };
  if(notes) s.addNotes(notes);
  return s;
}
function eyebrow(s, x, y, t, color){
  s.addShape('rect', { x, y: y + 0.045, w: 0.09, h: 0.09, fill: { color: color || C.teal } });
  s.addText(t, { x: x + 0.16, y: y - 0.08, w: 9.5, h: 0.34, fontFace: F.m, fontSize: 10.5,
    color: color || C.teal, charSpacing: 2, margin: 0 });
}
function title(s, t, y){
  s.addText(t, { x: 0.55, y: (y === undefined ? 0.62 : y), w: 12.2, h: 0.85, fontFace: F.h,
    fontSize: 31, bold: true, color: C.text, margin: 0 });
}
function panel(s, x, y, w, h, o){
  s.addShape('roundRect', Object.assign({ x, y, w, h, rectRadius: 0.07,
    fill: { color: C.panel }, line: { color: C.line, width: 1 } }, o || {}));
}
function chip(s, { x, y, w, h, v, l, vc, vsize }){
  panel(s, x, y, w, h);
  s.addText(v, { x: x + 0.14, y: y + 0.09, w: w - 0.28, h: h * 0.5, fontFace: F.m, bold: true,
    fontSize: vsize || 20, color: vc || C.text, margin: 0 });
  s.addText(l, { x: x + 0.14, y: y + h * 0.52, w: w - 0.28, h: h * 0.44, fontFace: F.b,
    fontSize: 9.5, color: C.dim, margin: 0 });
}
function bullets(s, x, y, w, items, opts){
  s.addText(items.map((t, i) => ({ text: t, options: {
      bullet: { code: '25AA', indent: 12 }, color: C.muted, breakLine: i < items.length - 1,
      paraSpaceAfter: (opts && opts.gap) || 8 } })),
    Object.assign({ x, y, w, h: (opts && opts.h) || 3.5, fontFace: F.b,
      fontSize: (opts && opts.size) || 13, margin: 0, valign: 'top' }, {}));
}
function foot(s, t){
  s.addText(t, { x: 0.55, y: 7.06, w: 12.2, h: 0.3, fontFace: F.m, fontSize: 8.5,
    color: C.dim, margin: 0 });
}
const SENT = 'Tüm veriler sentetik / temsili resmi case setleridir — gerçek THY/AMOS verisi değildir.';

/* ================= 1 · KAPAK ================= */
{
  const s = base('Açılış: tek cümlede konsept — uçaklar için kule var, komponentler için yok. Sayılar ekranda: filo %67 büyürken talep bandı +%63–68. Hepsi üç resmi CSV\'den hesaplandı ve yeniden üretilebilir.');
  eyebrow(s, 0.55, 0.85, 'GLOBAL TALENT BRIDGE · FİLO BÜYÜR, ENVANTER HAZIR MI? · GRUP 9');
  s.addText('Komponent Kontrol Kulesi', { x: 0.55, y: 1.35, w: 12.2, h: 1.1, fontFace: F.h,
    fontSize: 48, bold: true, color: C.text, margin: 0 });
  s.addText('Uçaklar için kule var, komponentler için yok. 5.000 parça numarası için görünürlük + öngörü + aksiyon katmanı — kayıt sistemlerinin üzerine, hiçbirine yazmadan.',
    { x: 0.55, y: 2.5, w: 11.4, h: 0.95, fontFace: F.b, fontSize: 16.5, color: C.muted, margin: 0 });
  const cw = 3.94, y0 = 3.9;
  chip(s, { x: 0.55, y: y0, w: cw, h: 1.5, v: '1.200 → 2.000', l: 'uçak, 2025 → 2033 (+%67) — bakım kapasitesi hedefi', vc: C.teal, vsize: 26 });
  chip(s, { x: 0.55 + cw + 0.2, y: y0, w: cw, h: 1.5, v: '+%' + Math.round(D.band.alt_pct) + '–' + Math.round(D.band.ust_pct), l: 'komponent talep bandı — nokta tahmin değil, bant', vc: C.amber, vsize: 26 });
  chip(s, { x: 0.55 + 2 * (cw + 0.2), y: y0, w: cw, h: 1.5, v: '%34 → %65', l: 'yeni nesil modellerin talep payı — büyüme değil GÖÇ', vc: C.violet, vsize: 26 });
  s.addText('Grup 9 · prototip: tek dosyalık canlı dashboard + doğrulanmış hesap çekirdeği', {
    x: 0.55, y: 5.75, w: 12, h: 0.4, fontFace: F.b, fontSize: 13, color: C.dim, margin: 0 });
  foot(s, SENT);
}

/* ================= 2 · PROBLEM ================= */
{
  const s = base('Ana mesaj: hacim yönetilebilir, kompozisyon kırılması yönetilmez ise kriz olur. Talebin üçte ikisi geçmişi olmayan parçalara kayıyor; kategori büyümeleri iki kat ayrışıyor — tek çarpanlı plan matematiksel olarak yanlış.');
  eyebrow(s, 0.55, 0.52, '1 · PROBLEMİN TANIMLANMASI');
  title(s, 'Problem: büyüme değil, göç');
  bullets(s, 0.55, 1.85, 6.1, [
    'Talep 90.016 → ' + tr0(D.band.alt) + '–' + tr0(D.band.ust) + ' adet/yıl (+%' + Math.round(D.band.alt_pct) + '–' + Math.round(D.band.ust_pct) + ' bandı; iki yöntem, şeffaf varsayımlar).',
    'Asıl kırılma: yeni nesil modellerin talep payı %33,7 → %64,8 — geçmiş verisi olmayan parçalar ana senaryo hâline geliyor (cold-start).',
    'Kategori büyümeleri ayrışıyor: Oxygen +%40 ↔ Electrical Power +%91. Tek çarpanlı plan iki ucda da yanılır; kategori × model × segment şart.',
    'Portföyün %44\'ü (2.192 PN), talebi üçte birine düşecek 4 klasik modele bağlı — 52,0 M$ stok phase-out riski altında.',
    'Dürüstlük: THY uçağı ' + tr1(D.band.thy_ucak) + ', pool uçağı ' + tr1(D.band.pool_ucak) + ' adet/yıl üretiyor (3,6×) — anomaliyi gizlemedik, mentora taşıdık.',
  ], { size: 12.5, gap: 10, h: 4.6 });
  s.addChart('bar', [
    { name: 'Yeni nesil (5 model)', labels: ['2025', '2033'], values: [D.goc.yeni25, D.goc.yeni33] },
    { name: 'Diğer', labels: ['2025', '2033'], values: [D.goc.diger25, D.goc.diger33] },
    { name: 'Küçülen 4 klasik', labels: ['2025', '2033'], values: [D.goc.kucul25, D.goc.kucul33] },
  ], { x: 7.0, y: 1.8, w: 5.75, h: 4.5, barGrouping: 'stacked',
    chartColors: [C.teal, C.blue, C.dim], showLegend: true, legendPos: 'b', legendColor: C.muted,
    legendFontSize: 10, catAxisLabelColor: C.muted, valAxisLabelColor: C.dim,
    valGridLine: { color: C.line, size: 1 }, catGridLine: { style: 'none' },
    showValue: false, valAxisLabelFormatCode: '#,##0', showTitle: true,
    title: 'Yıllık komponent talebi (adet) — kompozisyon göçü', titleColor: C.muted, titleFontSize: 11 });
  foot(s, SENT);
}

/* ================= 3 · MEVCUT BOŞLUKLAR ================= */
{
  const s = base('Boşluğu nasıl bulduk: saha gözlemi (9 başkanlık, 4–5 kopuk sistem) + resmi stok verisiyle TTS<TTR koşulunu hesaplayan ilk analiz. 72 siparişsiz kırmızı, eksik karar katmanının ölçülmüş hâlidir — sorun para değil (0,7 M$), görünürlük.');
  eyebrow(s, 0.55, 0.52, '2 · MEVCUT DURUM ANALİZİ');
  title(s, 'Bugünkü süreç kendi alarmını göremiyor');
  const akis = ['Satış', 'Planlama', 'Satın Alma', 'Lojistik', 'Gümrük', 'Tesellüm', 'Depolar', 'Atölyeler', 'Komp. Hizmetleri'];
  akis.forEach((t, i) => {
    const x = 0.55 + i * 1.36;
    panel(s, x, 1.85, 1.24, 0.52, { fill: { color: C.panel2 } });
    s.addText(t, { x, y: 1.85, w: 1.24, h: 0.52, align: 'center', valign: 'middle',
      fontFace: F.b, fontSize: 9.5, color: C.muted, margin: 0 });
    if(i < akis.length - 1) s.addText('→', { x: x + 1.2, y: 1.85, w: 0.2, h: 0.52,
      align: 'center', valign: 'middle', fontFace: F.b, fontSize: 11, color: C.teal, margin: 0 });
  });
  s.addText('Bir komponent ~9 başkanlıktan geçiyor; kayıt 4–5 kopuk sistemde (TRAX, “Mars”, ÜPK, depo/bin-raf, ayrı tool-tracking). Her devirde veri kopuyor; bozulan parça için süreç reaktif bir telefon merdiveni. (Kaynak: saha gözlemi — birincil.)',
    { x: 0.55, y: 2.6, w: 12.2, h: 0.75, fontFace: F.b, fontSize: 12.5, color: C.muted, margin: 0 });
  panel(s, 0.55, 3.6, 5.9, 3.1, { line: { color: '6E2233', width: 1.4 } });
  s.addText(String(D.kpi.siparissiz) + ' PN', { x: 0.85, y: 3.85, w: 5.3, h: 1.05, fontFace: F.m,
    fontSize: 54, bold: true, color: C.red, margin: 0 });
  s.addText('bugün kırmızıda (stok, toparlanma süresinden önce bitecek) ve açık siparişi YOK — ' +
    D.kpi.siparissiz_aog + '\'i AOG kritik. Alarm koşulu aylardır sağlanmış; hesaplayan bir süreç olmadığı için aksiyon doğmamış.',
    { x: 0.85, y: 5.0, w: 5.3, h: 1.55, fontFace: F.b, fontSize: 12.5, color: C.muted, margin: 0 });
  chip(s, { x: 6.75, y: 3.6, w: 2.9, h: 1.45, v: String(D.kpi.kirmizi), l: 'kırmızı PN — TTS < TTR (5.000 içinde)', vc: C.red, vsize: 30 });
  chip(s, { x: 9.85, y: 3.6, w: 2.9, h: 1.45, v: tr1(D.kpi.kapatma) + ' M$', l: 'tamamını kapatma maliyeti — sorun para değil', vc: C.amber, vsize: 24 });
  chip(s, { x: 6.75, y: 5.25, w: 2.9, h: 1.45, v: '~0,4 M$', l: 'fazla + ölü stok — “şişkinlik” miti veriyle çürüdü', vsize: 24 });
  chip(s, { x: 9.85, y: 5.25, w: 2.9, h: 1.45, v: '120 gün', l: 'medyan hayatta kalma süresi — genel tablo sağlıklı, denge kör', vsize: 24 });
  foot(s, 'TTS = stok / günlük talep · TTR = tamir-tedarik süresi · ' + SENT);
}

/* ================= 4 · ÇÖZÜM ================= */
{
  const s = base('Üç katman tek çatı: dashboard, sistem mimarisi ve akıllı uyarı yaklaşımlarını tek platformda birleştiriyoruz — case\'teki örnek başlıklar ilham, bizim önerimiz bütünleşik. Kritik mimari karar: hiçbir kaynağa yazmıyoruz — CDC ile okuyoruz. AMOS/TRAX yer değiştirmiyor; üstlerine karar katmanı geliyor. Fazlar takvimle değil metrikle geçilir.');
  eyebrow(s, 0.55, 0.52, '3 · ÇÖZÜM ÖNERİLERİ');
  title(s, 'Kontrol Kulesi: üç katman, salt-okunur mimari');
  const katman = [
    ['GÖRÜNÜRLÜK', 'FAZ 1', C.teal, 'Tek komponent kaydı + olay-kaynaklı durum makinesi; gerçek TAT beyandan değil olay farkından. Sermaye kokpiti. İlk gün değeri: 72 siparişsiz kırmızının yakalanması.'],
    ['ÖNGÖRÜ', 'FAZ 2', C.blue, 'ABC×XYZ segmentasyonu; Croston/SBA + Poisson emniyet stoğu; filo-sürücülü bant projeksiyonu; cold-start (analog + Bayes); dinamik min-max — insan onaylı öneri modu.'],
    ['AKSİYON', 'FAZ 2–3', C.violet, 'TTS<TTR alarmı → zorunlu aksiyon kaydı; eskalasyon merdiveni süre+maliyetle puanlanır; BER motoru, gayrifaal kuyruğu, phase-out tetikleri, pool koordinasyonu.'],
  ];
  katman.forEach((k, i) => {
    const y = 1.8 + i * 1.28;
    panel(s, 0.55, y, 7.3, 1.12);
    s.addShape('ellipse', { x: 0.78, y: y + 0.3, w: 0.52, h: 0.52, fill: { color: k[2] } });
    s.addText(String(i + 1), { x: 0.78, y: y + 0.3, w: 0.52, h: 0.52, align: 'center', valign: 'middle',
      fontFace: F.h, fontSize: 16, bold: true, color: C.bg, margin: 0 });
    s.addText([{ text: k[0] + '  ', options: { bold: true, color: C.text, fontSize: 13 } },
               { text: k[1], options: { color: k[2], fontSize: 10, fontFace: F.m } }],
      { x: 1.5, y: y + 0.08, w: 6.2, h: 0.34, fontFace: F.h, margin: 0 });
    s.addText(k[3], { x: 1.5, y: y + 0.42, w: 6.25, h: 0.68, fontFace: F.b, fontSize: 10.5,
      color: C.muted, margin: 0 });
  });
  panel(s, 8.1, 1.8, 4.68, 3.9, { fill: { color: C.panel2 } });
  s.addText('MİMARİ', { x: 8.35, y: 2.0, w: 4.2, h: 0.3, fontFace: F.m, fontSize: 10, color: C.teal, charSpacing: 2, margin: 0 });
  ['AMOS · TRAX · “Mars” · ÜPK · depo', '▼  CDC — SALT OKUNUR', 'Olay omurgası (event-sourced)', '▼', 'Tek veri modeli (PN+durum+konum)', '▼', 'Motorlar: tahmin · min-max · alarm · senaryo', '▼', 'Kontrol Kulesi ekranları'].forEach((t, i) => {
    s.addText(t, { x: 8.35, y: 2.36 + i * 0.34, w: 4.25, h: 0.32, fontFace: i % 2 ? F.m : F.b,
      fontSize: i % 2 ? 9 : 10.5, color: i % 2 ? C.teal : C.muted, align: i % 2 ? 'center' : 'left', margin: 0 });
  });
  s.addText('GERİ YAZMA YOK — kaynaklara dokunulmaz', { x: 8.35, y: 5.34, w: 4.25, h: 0.3,
    fontFace: F.m, fontSize: 9.5, bold: true, color: C.red, align: 'center', margin: 0 });
  s.addText('Yazılım-dışı 4. öneri: 547 parçalık listeye atölye kabiliyeti yatırımı — ' + tr1(D.kpi.kab_tasarruf) + ' M$/yıl tasarruf + ' + tr1(D.kpi.kab_sermaye) + ' M$ sermaye serbestisi.',
    { x: 0.55, y: 5.85, w: 12.2, h: 0.62, fontFace: F.b, fontSize: 12.5, color: C.muted, margin: 0 });
  foot(s, SENT);
}

/* ================= 5 · PROTOTİP ================= */
{
  const s = base('Demo tek HTML dosyası — internetsiz çalışır. Beş ekran aynı doğrulanmış çekirdekten beslenir. Jüri parametre değiştirmek isterse Senaryo sekmesindeki canlı panelden ağırlıkları oynatıyoruz; sayılar tarayıcıda yeniden hesaplanıyor.');
  eyebrow(s, 0.55, 0.52, '4 · PROTOTİP / DEMO');
  title(s, 'Canlı prototip: 5 ekran, tek doğrulanmış çekirdek');
  const ekran = [
    ['KOKPİT', C.teal, ['132,9 M$ sermaye fotoğrafı + üç para musluğu', '72 siparişsiz kırmızı vurgusu', 'mimari + yol haritası + veri boşlukları']],
    ['WATCHLIST', C.red, ['5.000 PN risk sıralı, 8 filtre', 'aksiyon merdiveni (süre + maliyet)', 'canlı Poisson stok-out eğrisi']],
    ['ÖNGÖRÜ & AI', C.violet, ['ABC×XYZ + bant + göç + hurda', 'tahmin gezgini + hata analizi', 'cold-start canlı Bayes demosu']],
    ['HARİTA', C.blue, ['Türkiye: 16 havalimanı, gerçek kontur', 'küresel ağ: 9 hub, İstanbul merkezli', 'kriz katmanı + akış okları']],
    ['SENARYO', C.amber, ['kriz kütüphanesi → canlı hesap', 'jüri modu: parametre kaydırıcıları', 'Monte Carlo + duyarlılık + optimizasyon']],
  ];
  ekran.forEach((e, i) => {
    const x = 0.55 + i * 2.51;
    panel(s, x, 1.95, 2.33, 3.75);
    s.addShape('rect', { x: x + 0.18, y: 2.16, w: 0.11, h: 0.11, fill: { color: e[1] } });
    s.addText(e[0], { x: x + 0.36, y: 2.02, w: 1.9, h: 0.36, fontFace: F.m, fontSize: 11,
      bold: true, color: e[1], margin: 0 });
    s.addText(e[2].map((t, j) => ({ text: t, options: { bullet: { code: '25AA', indent: 10 },
        color: C.muted, breakLine: j < e[2].length - 1, paraSpaceAfter: 7 } })),
      { x: x + 0.18, y: 2.6, w: 2.0, h: 2.9, fontFace: F.b, fontSize: 10, margin: 0, valign: 'top' });
  });
  chip(s, { x: 0.55, y: 6.0, w: 6.0, h: 0.85, v: 'Tek HTML · internetsiz · 26 grafik', l: 'USB\'den açılır; sunum salonunda ağ riski yok', vsize: 15 });
  chip(s, { x: 6.75, y: 6.0, w: 6.0, h: 0.85, v: 'Her sayı yeniden üretilebilir', l: 'python3 build_dashboard.py → aynı dosya, aynı sayılar (deterministik)', vsize: 15 });
  foot(s, SENT);
}

/* ================= 6 · AI ================= */
{
  const s = base('Dürüstlük stratejisi: 4 çeyrek veriyle sinir ağı klasikleri geçemez — bunu biz söylüyoruz. Ama geriye dönük test mevsim katsayısının toplam planlamada hatayı binde dörde indirdiğini gösteriyor. AI\'ın rolü: bugün öneri modunda, AMOS olay verisi bağlanınca devreye.');
  eyebrow(s, 0.55, 0.52, '5 · YAPAY ZEKÂ TAHMİN MOTORU');
  title(s, 'Hibrit ve dürüst: istatistik zemin, öğrenme üstyapı');
  bullets(s, 0.55, 1.85, 6.0, [
    'Mimari: λ = istatistiksel taban × e^(ağ düzeltmesi) — ağ tabanı en çok ~×1,65 oynatabilir; seyrek veride savrulmayı önler.',
    'MLP 128-64-32 · 54 özellik · 10.000 örnek · Poisson kaybı · 3 tohumlu topluluk · en iyi epoch geri yüklenir · koşudan koşuya deterministik.',
    'PN düzeyinde talep kesikli (medyan 11 adet/yıl, %14,6 sıfır çeyrek) → Croston/SBA + Poisson emniyet stoğu; sinir ağı bugün karar YETKİSİZ (öneri modu).',
    'Cold-start ana senaryo: öncül analog gruptan + üretici MTBUR; gözlem geldikçe Bayes güncellemesi parçaya yakınsar (dashboard\'da canlı demo).',
  ], { size: 12.5, gap: 10, h: 4.4 });
  s.addChart('bar', [{ name: 'Toplam düzeyde hata (%)',
    labels: D.backtest.ad.map(a => a.replace(' katsayısı', ' kats.')),
    values: D.backtest.toplam_hata }], {
    x: 6.9, y: 1.85, w: 5.85, h: 3.6, chartColors: [C.dim, C.dim, C.dim, C.teal].slice(0, 4),
    chartColorsOpacity: 100, showLegend: false, catAxisLabelColor: C.muted, catAxisLabelFontSize: 9.5,
    valAxisLabelColor: C.dim, valGridLine: { color: C.line, size: 1 }, catGridLine: { style: 'none' },
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: C.text, dataLabelFormatCode: '0.0"%"',
    showTitle: true, title: 'Geriye dönük test: Q3\'ü yalnız Q1–Q2 ile tahmin et', titleColor: C.muted,
    titleFontSize: 11, valAxisLabelFormatCode: '0"%"' });
  s.addText('Mevsim katsayısı (×1,20) toplam hatayı %16,3 → %0,4\'e indirir. PN düzeyinde fark yaratmaz (kesiklilik) — iki düzey ayrı yönetilir: parçada Croston/SBA, bütçede mevsim düzeltmesi.',
    { x: 6.9, y: 5.6, w: 5.85, h: 1.0, fontFace: F.b, fontSize: 11, color: C.muted, margin: 0 });
  foot(s, SENT);
}

/* ================= 7 · DOĞRULAMA ================= */
{
  const s = base('Jürinin “projeksiyon güvenilir mi” sorusunun cevabı bu slayt. Üç bağımsız kanıt + Monte Carlo uyumu. Hepsi geriye dönük ve yeniden üretilebilir; demo maket değil, doğrulanmış çekirdeğin ekranı.');
  eyebrow(s, 0.55, 0.52, 'MODEL MAKET DEĞİL — DOĞRULAMA');
  title(s, 'Aynı çekirdek, üç bağımsız kanıt');
  const kanit = [
    ['%97', 'Float formülü sahada doğru çıktı', 'Yalnız talep + TAT\'tan tamir döngüsünde ' + tr0(D.kpi.float_adet) + ' adet öngördük; envanter verisi geldi: ' + tr0(D.kpi.tamirde) + ' adet. Slider ve senaryolar bu motoru kullanır.', C.teal],
    ['1 numara', 'Risk skorunun birincisi fiilen kırmızı', 'Skor sıralamasının 1 numarası PN-101741, gerçek stok verisinde TTS 99,5 < TTR 130 ile kırmızıda — üstelik biri el yordamıyla fark edip 14 adet sipariş açmış.', C.red],
    ['%0,4', 'Görmediği çeyreği bildi', 'Geriye dönük test: yılın ilk yarısıyla Q3 toplamı tahmin edildi — mevsim katsayılı model gerçek toplamı binde 4 hata ile buldu.', C.amber],
  ];
  kanit.forEach((k, i) => {
    const x = 0.55 + i * 4.14;
    panel(s, x, 1.9, 3.94, 3.7);
    s.addText(k[0], { x: x + 0.22, y: 2.1, w: 3.5, h: 0.95, fontFace: F.m, fontSize: 40, bold: true, color: k[3], margin: 0 });
    s.addText(k[1], { x: x + 0.22, y: 3.1, w: 3.5, h: 0.65, fontFace: F.h, fontSize: 14, bold: true, color: C.text, margin: 0 });
    s.addText(k[2], { x: x + 0.22, y: 3.78, w: 3.5, h: 1.7, fontFace: F.b, fontSize: 11, color: C.muted, margin: 0 });
  });
  panel(s, 0.55, 5.85, 12.23, 0.95, { fill: { color: C.panel2 } });
  s.addText([
    { text: 'Monte Carlo doğrulaması:  ', options: { bold: true, color: C.text } },
    { text: D.mc.trials + ' denemelik simülasyon, kapalı form Poisson hesabıyla %' + tr1(D.mc.uyum) + ' uyumda — belirsizlik bandıyla birlikte raporlanır (baz: ' + D.mc.baz.acik_p10 + '–' + D.mc.baz.acik_p90 + ' PN).', options: { color: C.muted } },
  ], { x: 0.85, y: 5.85, w: 11.6, h: 0.95, fontFace: F.b, fontSize: 12.5, valign: 'middle', margin: 0 });
  foot(s, SENT);
}

/* ================= 8 · ÖNCELİKLENDİRME ================= */
{
  const s = base('Rubrik 5: kısıt varsa önce ne? Cevap üç katmanda: Faz 1 salt-okunur görünürlük (ilk gün 72 yakalanır); kısıtlı stok bütçesi sınır eğrisiyle harcanır (ilk milyonlar en dik); yazılım dışı en iyi yatırım kabiliyet (12,1 M$/yıl). Tornado: en büyük kaldıraç TAT.');
  eyebrow(s, 0.55, 0.52, '6 · ÖNCELİKLENDİRME');
  title(s, 'Kısıtlı kaynakla önce ne? Matematiksel cevap');
  const n = 12, step = Math.max(1, Math.floor(D.opt.butce.length / n));
  const bLab = [], bVal = [];
  for(let i = 0; i < D.opt.butce.length; i += step){ bLab.push(tr0(D.opt.butce[i])); bVal.push(D.opt.kapanan[i]); }
  s.addChart('line', [{ name: 'Kapanan açık PN', labels: bLab, values: bVal }], {
    x: 0.55, y: 1.85, w: 5.9, h: 3.6, chartColors: [C.teal], lineSize: 2.5, lineSmooth: true,
    showLegend: false, catAxisLabelColor: C.dim, catAxisLabelFontSize: 9, valAxisLabelColor: C.dim,
    valGridLine: { color: C.line, size: 1 }, catGridLine: { style: 'none' },
    showTitle: true, title: 'Bütçe (M$) → önerilen MIN\'e kapanan PN sayısı', titleColor: C.muted, titleFontSize: 11,
    catAxisTitle: 'kümülatif bütçe (M$)', showCatAxisTitle: true, catAxisTitleColor: C.dim, catAxisTitleFontSize: 9 });
  s.addText('Her alım adımı “dolar başına risk azaltımı”yla sıralandı (kritiklik × stok-out olasılığı ÷ fiyat). Eğrinin dikliği: ilk birkaç milyon dolar kazanımın büyük bölümünü alır — tamamı ' + tr1(D.opt.toplam) + ' M$.',
    { x: 0.55, y: 5.6, w: 5.9, h: 1.1, fontFace: F.b, fontSize: 11, color: C.muted, margin: 0 });
  chip(s, { x: 6.85, y: 1.85, w: 5.9, h: 1.35, v: tr1(D.kpi.kab_tasarruf) + ' M$/yıl + ' + tr1(D.kpi.kab_sermaye) + ' M$', l: 'kabiliyet yatırımı (547 PN listesi): yıllık tamir tasarrufu + bir defalık sermaye serbestisi — bugünkü dış harcama ' + tr1(D.kpi.kab_bugun) + ' M$/yıl', vc: C.teal, vsize: 21 });
  chip(s, { x: 6.85, y: 3.4, w: 5.9, h: 1.35, v: '23,2 – 44,8 M$', l: 'duyarlılık (tornado): 2033 açığı maliyetini en çok TEDARİK SÜRELERİ oynatır (±%20) — “TAT\'ın her günü sermayedir”in sayısal kanıtı', vc: C.amber, vsize: 21 });
  chip(s, { x: 6.85, y: 4.95, w: 5.9, h: 1.35, v: 'Faz 1: salt-okunur', l: 'ilk adım yazılım riski almaz: birleşik kayıt + alarm raporu; ilk teslimat gününde 72 siparişsiz kırmızı yakalanır — kapılar takvim değil metrik', vsize: 17 });
  foot(s, SENT);
}

/* ================= 9 · KRİZ ================= */
{
  const s = base('Organizatör brief\'inin üçüncü sütunu. Kriz = parametre şoku: TTS kısalır ya da TTR uzar. Senaryo kütüphanesi + tek tık stres testi + çeyreklik war-game. Motor krizi canlı: kırmızı 134→477; Monte Carlo aynı senaryoda 796 PN / 39,4 M$ diyor.');
  eyebrow(s, 0.55, 0.52, 'VİZYON · KRİZLERE HAZIRLIK');
  title(s, 'Kriz, modelde bir parametre şokudur');
  const sen = [
    ['MOTOR AİLESİ KRİZİ', 'yeni nesil talep ×1,5 · dış TAT ×1,3 — 2033 filosunun %64\'ü 5 modelde: yoğunlaşma verim kadar risk'],
    ['PANDEMİ TİPİ', 'talep şoku + tamir kapasitesi kaybı (TTR ×1,5)'],
    ['OEM GECİKMESİ', 'klasikler geç emekli: phase-out tetikleri kendiliğinden yavaşlar — takvim planı çökerdi'],
    ['LOJİSTİK KRİZİ', 'dış TAT + satın alma kuyrukları uzar (270 gün hatırlatması)'],
    ['KUR ŞOKU', 'parçalar USD: FMV/CLP sensörü + nakit koruma modunda BER eşiği bilinçli kaydırılır'],
  ];
  sen.forEach((k, i) => {
    const y = 1.85 + i * 0.92;
    panel(s, 0.55, y, 6.1, 0.8);
    s.addText(k[0], { x: 0.75, y: y + 0.07, w: 5.7, h: 0.3, fontFace: F.m, fontSize: 10.5, bold: true, color: C.amber, margin: 0 });
    s.addText(k[1], { x: 0.75, y: y + 0.36, w: 5.75, h: 0.42, fontFace: F.b, fontSize: 9.5, color: C.muted, margin: 0 });
  });
  chip(s, { x: 7.0, y: 1.85, w: 5.75, h: 1.5, v: '134 → 477', l: 'motor krizinde kırmızı PN (canlı stres testi, 5.000 PN yeniden hesap)', vc: C.red, vsize: 30 });
  chip(s, { x: 7.0, y: 3.55, w: 5.75, h: 1.5, v: tr0(D.mc.motor.acik_ort) + ' PN · ' + tr1(D.mc.motor.ek_ort) + ' M$', l: 'Monte Carlo aynı senaryoda: tedarik penceresini çıkaramayacak PN ve ek ihtiyaç (P90: ' + tr1(D.mc.motor.ek_p90) + ' M$)', vc: C.amber, vsize: 21 });
  chip(s, { x: 7.0, y: 5.25, w: 5.75, h: 1.4, v: 'Çeyreklik war-game', l: 'her çeyrek bir senaryo canlı koşulur; playbook (tahsis kuralları, ön yetkiler) krizden ÖNCE yazılır — kriz anında ilk kez düşünülmez', vsize: 17 });
  foot(s, SENT);
}

/* ================= 10 · BAŞARI KRİTERLERİ ================= */
{
  const s = base('Rubrik 6: işe yaradığını nasıl anlarız. Ana metrik AOG\'da bekleyen uçak oranının düşmesi — her saat doğrudan gelir kaybı. Sistemik hedef: siparişsiz kırmızı sıfır. Otomasyona geçiş MAPE + öneri kabul eşiğiyle.');
  eyebrow(s, 0.55, 0.52, '7 · BAŞARI KRİTERLERİ');
  title(s, 'Çalıştığını nasıl anlarız?');
  const kk = [
    ['AOG uçak oranı ↓', 'parça kaynaklı AOG saati ve yerde bekleyen uçak yüzdesi — ANA METRİK', C.teal],
    [D.kpi.siparissiz + ' → 0', 'siparişsiz kırmızı: alarm-aksiyon bağı zorunlu; “alarm var sipariş yok” imkânsızlaşır', C.red],
    ['≥ %97–98', 'kritik parça karşılama oranı (fill rate) — servis hedefi kritiklikle', C.text],
    ['Erken yakalama ↑', 'stok bitişlerinin tedarik süresi DOLMADAN yakalanma oranı — alarm kalitesi', C.text],
    ['MAPE + kabul', 'tahmin doğruluğu ve öneri kabul oranı — faz kapıları bu eşiklerle açılır', C.violet],
    ['Guard-rail: ' + tr1(D.kpi.float_fmv) + ' M$', 'bağlı sermaye ve devir hızı: servis, sermaye şişirerek değil TAT kısaltarak korunur', C.amber],
    ['Expedite ↓', 'erken yakalanan alarm ucuz kanaldan çözülür; acil kargo harcaması düşer', C.text],
    ['Scrap izlenir', 'oran %11,1 + anomali dedektörü (159 PN); BER kuralı 67,8 M$/yıl musluğun vanası', C.text],
  ];
  kk.forEach((k, i) => {
    const x = 0.55 + (i % 4) * 3.12, y = 1.95 + Math.floor(i / 4) * 2.3;
    panel(s, x, y, 2.92, 2.05);
    s.addText(k[0], { x: x + 0.18, y: y + 0.16, w: 2.56, h: 0.75, fontFace: F.m, fontSize: 17, bold: true, color: k[2], margin: 0 });
    s.addText(k[1], { x: x + 0.18, y: y + 0.92, w: 2.56, h: 1.0, fontFace: F.b, fontSize: 10, color: C.muted, margin: 0 });
  });
  foot(s, SENT);
}

/* ================= 11 · KAPANIŞ ================= */
{
  const s = base('Kapanış cümlesi ezber: 2033\'e daha büyük depoyla değil, her parçanın görünür, her kararın kurallı, her planın parametrik, her krizin prova edilmiş olduğu bir işletim modeliyle gidilir. Üç musluk + teşekkür. Sorulara hazırız.');
  eyebrow(s, 0.55, 0.85, 'KAPANIŞ · VİZYON 2033');
  s.addText('“2033\'e daha büyük bir depoyla değil; her parçanın görünür, her kararın kurallı, her planın parametrik ve her krizin önceden prova edilmiş olduğu bir işletim modeliyle gidilir.”',
    { x: 0.55, y: 1.45, w: 12.2, h: 1.85, fontFace: F.h, fontSize: 23, italic: true, color: C.text, margin: 0 });
  s.addText('Kontrol Kulesi, bu modelin yazılım hâlidir.', { x: 0.55, y: 3.35, w: 12.2, h: 0.5,
    fontFace: F.h, fontSize: 17, bold: true, color: C.teal, margin: 0 });
  const musluk = [
    [tr1(D.kpi.scrap) + ' M$/yıl', 'hurda ikame musluğu — BER kuralıyla vanaya bağlanır (2033: ' + tr1(D.kpi.scrap33) + ' M$)', C.amber],
    [tr1(D.kpi.float_fmv) + ' → ' + tr1(D.kpi.float_33) + ' M$', 'tamir döngüsü sermayesi — TAT programı + kabiliyetle sınırlanır', C.blue],
    [tr1(D.kpi.phaseout) + ' M$', 'phase-out stoğu — takvimle değil sinyalle eritilir (last-time-buy tetikleri)', C.violet],
  ];
  musluk.forEach((m, i) => {
    chip(s, { x: 0.55 + i * 4.14, y: 4.15, w: 3.94, h: 1.55, v: m[0], l: m[1], vc: m[2], vsize: 22 });
  });
  s.addText('Teşekkürler — canlı demo ve tüm sayıların yeniden üretimi için hazırız.  ·  Grup 9',
    { x: 0.55, y: 6.1, w: 12.2, h: 0.45, fontFace: F.b, fontSize: 13.5, color: C.muted, margin: 0 });
  foot(s, SENT);
}

pres.writeFile({ fileName: 'kontrol_kulesi_sunum.pptx' }).then(() => console.log('✓ kontrol_kulesi_sunum.pptx yazıldı'));
