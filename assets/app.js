'use strict';
/* =====================================================================
   Komponent Kontrol Kulesi — uygulama katmanı
   Veri: build_dashboard.py'nin gömdüğü DATA (core.py tek doğruluk kaynağı)
   ===================================================================== */

/* ---------------- yardımcılar ---------------- */
const $ = id => document.getElementById(id);
const K = DATA.kpi, B = DATA.band, PN = DATA.pn, LK = DATA.lookup, PRM = DATA.params;
const NPN = PN.id.length;
const fmt  = n => Math.round(n).toLocaleString('tr-TR');
const f1   = n => Number(n).toLocaleString('tr-TR', {minimumFractionDigits: 1, maximumFractionDigits: 1});
const mM   = n => '$' + f1(n) + 'M';
const mUsd = n => '$' + fmt(n);
const pct  = (n, d = 1) => '%' + Number(n).toLocaleString('tr-TR', {minimumFractionDigits: d, maximumFractionDigits: d});

const C = {teal:'#4FC1B0', amber:'#E8A33D', red:'#E06A6A', blue:'#5B8FD6', violet:'#9B8CE8',
           dim:'#77869C', muted:'#9AA8C0', text:'#EAF0F7', line:'#263450', panel2:'#182338'};

Chart.defaults.color = C.muted;
Chart.defaults.borderColor = 'rgba(38,52,80,.55)';
Chart.defaults.font.family = "'Inter',system-ui,sans-serif";
Chart.defaults.font.size = 11.5;
Chart.defaults.plugins.legend.labels.boxWidth = 11;
Chart.defaults.plugins.legend.labels.boxHeight = 11;

/* bayraklar: build_dashboard.py ile birebir */
const FL = {KIRMIZI:1, SIP:2, R547:4, BER:8, PO:16, YENI:32, SCRAPA:64, POOLB:128};
const hasF = (i, f) => (PN.flags[i] & f) !== 0;
const PIDX = {}; PN.id.forEach((v, i) => PIDX[v] = i);

const KR_BADGE = ['<span class="bg bg-aog">AOG KRİTİK</span>',
                  '<span class="bg bg-kri">KRİTİK</span>',
                  '<span class="bg bg-nk">KRİTİK DEĞİL</span>'];

function foldTr(s){
  const map = {'ı':'i','İ':'i','ş':'s','Ş':'s','ğ':'g','Ğ':'g','ü':'u','Ü':'u','ö':'o','Ö':'o','ç':'c','Ç':'c'};
  return s.replace(/[ıİşŞğĞüÜöÖçÇ]/g, ch => map[ch]).toLowerCase();
}
function lerpColor(t){ // 0..1 → panel2 → amber → red
  const stops = [[34,48,76],[152,101,38],[224,106,106]];
  const seg = t < .5 ? 0 : 1, u = (t - seg * .5) / .5;
  const a = stops[seg], b = stops[seg + 1];
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*u)},${Math.round(a[1]+(b[1]-a[1])*u)},${Math.round(a[2]+(b[2]-a[2])*u)})`;
}

/* ---------------- Poisson emniyet stoğu (core.py ile aynı algoritma) ---------------- */
function invNorm(p){ // Acklam yaklaşımı
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=.02425;
  if(p<pl){const q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p<=1-pl){const q=p-.5,r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
  const q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}
function poissonMin(mu, h){
  if(mu <= 0) return 0;
  if(mu > 100) return Math.ceil(mu) + Math.ceil(invNorm(h) * Math.sqrt(mu));
  let term = Math.exp(-mu), cdf = term, k = 0;
  while(cdf < h && k < 3000){ k++; term *= mu / k; cdf += term; }
  return Math.ceil(mu) + Math.max(0, k - mu);
}

/* =====================================================================
   YERLEŞİM
   ===================================================================== */
document.body.insertAdjacentHTML('afterbegin', `
<nav class="topbar"><div class="topbar-in">
  <span class="brand">◆ <b>KONTROL KULESİ</b> · 2033</span>
  <span class="synth">SENTETİK / TEMSİLİ VERİ</span>
  <button class="dic-btn" id="dicBtn" title="Kısaltmalar sözlüğü">📖 SÖZLÜK</button>
  <div class="tabs" id="tabs"></div>
</div></nav>

<div class="wrap">
  <header class="hero">
    <span class="eyebrow">Global Talent Bridge · Filo Büyür, Envanter Hazır Mı?</span>
    <h1>Komponent Kontrol Kulesi · Karar Destek Prototipi</h1>
    <p>Uçaklar için bir kontrol kulesi var, komponentler için yok. Filo 1.200 uçaktan 2.000 uçağa çıkarken
    ${fmt(K.pn)} parça için görünürlük, öngörü ve aksiyon katmanı sunuyoruz. Bütün sayılar üç resmi veri setinden
    <span class="mono">core.py</span> ile hesaplanır. Bu bir maket değil, çalışan bir prototiptir.</p>
  </header>

  <div id="v-kokpit" class="view"></div>
  <div id="v-watch"  class="view"></div>
  <div id="v-ongoru" class="view"></div>
  <div id="v-harita" class="view"></div>
  <div id="v-senaryo" class="view"></div>

  <div class="foot">
    <b>Varsayımlar ve sınırlar.</b> Kullanılabilir stoğu FAAL ile HOMEBASE toplamı olarak alıyoruz, bu bir yorumdur.
    İstasyon kırılımı veride yok, harita basılı case tablosuyla temsilî dağıtılmıştır.
    Elimizde tek yıllık veri var, bu yüzden mevsimsellik tek gözleme dayanıyor.
    THY uçağı yılda ${f1(B.thy_ucak_basi)}, pool uçağı ${f1(B.pool_ucak_basi)} parça talep ediyor. Bu 3,6 katlık farkı anomali olarak mentora raporladık.
    Projeksiyon tek bir nokta değil bir aralık: +${pct(B.alt_pct,1)} ile +${pct(B.ust_pct,1)} arası.
    Kritiklik ağırlıkları, BER eşiği ${String(PRM.ber_esigi).replace('.',',')}, servis hedefleri ve tampon gibi parametreler sabit değil, ayarlanabilir.
    Tüm veriler resmi sentetik case setleridir, gerçek THY/AMOS verisi değildir.
  </div>
</div>

<div class="dic" id="dicBox">
  <div class="dic-h"><span>📖</span><b>Kısaltmalar Sözlüğü</b><small>ekranlardaki her terim</small>
    <button class="x" id="dicX" title="Kapat">✕</button></div>
  <div class="dic-q"><input type="text" id="dicQ" placeholder="Terim ara… (örn. TTS, BER, pool)"></div>
  <div class="dic-list" id="dicList"></div>
</div>
`);

const TABS = [['kokpit','KOKPİT'],['watch','WATCHLIST'],['ongoru','ÖNGÖRÜ & AI'],['harita','HARİTA'],['senaryo','SENARYO']];
$('tabs').innerHTML = TABS.map(([k,l]) => `<button class="tab" data-v="${k}">${l}</button>`).join('');

const rendered = {};
function showView(name){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.v === name));
  $('v-' + name).classList.add('on');
  if(!rendered[name]){ rendered[name] = 1; RENDER[name](); }
}
$('tabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if(b) showView(b.dataset.v); });

/* =====================================================================
   1 · KOKPİT — sermaye kokpiti + bugünün sağlığı
   ===================================================================== */
function renderKokpit(){
  const el = $('v-kokpit');
  el.innerHTML = `
  <div class="callout red">
    <span class="tag">Sürecin Kör Noktası</span>
    <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
      <span class="big">${K.siparissiz} PN</span>
      <p style="margin:0;flex:1;min-width:240px"><strong>stoğu bitmek üzere ama açık siparişi bile yok.</strong>
      Bunların ${K.siparissiz_aog}'i, yokluğunda uçağı yerde bırakan kritik parça. Kırmızı listede toplam ${K.kirmizi} parça var,
      hepsinde eldeki stok yenisi gelene kadar yetmiyor. Tümünü tamamlamak yalnızca <b>${mM(K.kapatma)}</b>.
      Yani sorun stok miktarı değil, azaldığını <em>kimsenin görememesi</em>.</p>
      <button class="btn danger" data-goto="watch" data-preset="siparissiz">Listeyi aç →</button>
    </div>
  </div>

  <div class="grid auto">
    <div class="kpi teal"><div class="l">Fiziksel envanter değeri</div><div class="v">${mM(K.fmv)}</div>
      <div class="d">Sıfırdan alım değeri ${mM(K.clp)} · ikinci el oranı ortalama ${String(K.fmv_clp_medyan).replace('.',',')}</div></div>
    <div class="kpi amber"><div class="l">Hurda ikame bütçesi</div><div class="v">${mM(K.scrap_butce)}<span style="font-size:.85rem">/yıl</span></div>
      <div class="d">En büyük para kalemi · ${fmt(K.ber_pn)} parça BER eşiğinin üstünde</div></div>
    <div class="kpi"><div class="l">Tamir döngüsü sermayesi</div><div class="v">${mM(K.float_fmv)}</div>
      <div class="d">Tahmin ${fmt(K.float_adet)}, sahada ${fmt(K.tamirde_adet)} adet · <b style="color:${C.teal}">%97 isabet</b> · 2033'te ${mM(K.float_fmv_33)}</div></div>
    <div class="kpi red"><div class="l">Kırmızı liste</div><div class="v">${K.kirmizi} PN</div>
      <div class="d">${K.siparissiz} siparişsiz · ${K.kirmizi_aog} kritik · dayanma süresi ortalama ${fmt(K.tts_medyan)} gün</div></div>
    <div class="kpi"><div class="l">2033 talep aralığı</div><div class="v">+%${Math.round(B.alt_pct)}–${Math.round(B.ust_pct)}</div>
      <div class="d">${fmt(B.talep_2025)} → ${fmt(B.alt)}–${fmt(B.ust)} · asıl kırılma dağılımda: yeni nesil %34→%65</div></div>
    <div class="kpi amber"><div class="l">Risk listesi</div><div class="v">${K.risk_listesi} PN</div>
      <div class="d">Kritik ama iç tamiri yok · ${K.uclu} tanesi geçmişsiz yeni nesilde</div></div>
  </div>

  <h2 class="sec-h">Üç para akışı</h2>
  <p class="sec-p">Para, stok miktarında değil üç akışta birikiyor. Bugünkü fazla ve ölü stok toplamı yalnızca 0,4 M$, yani "şişkin envanter" beklentisi veriyle doğrulanmadı.</p>
  <div class="grid g3">
    <div class="card"><h3 style="color:${C.amber}">1 · Hurda ikamesi · ${mM(K.scrap_butce)}/yıl</h3>
      <div class="hint">Yılda ${fmt(K.scrap25)} parça hurdaya ayrılıyor, bu talebin ${pct(K.scrap_oran)}'i. BER motoru ${fmt(K.ber_pn)} parçada
      tamir mi değişim mi hurda mı kararını kurala bağlıyor. Bu akışın vanası burası.</div></div>
    <div class="card"><h3 style="color:${C.blue}">2 · Tamir döngüsü sermayesi · ${mM(K.float_fmv)} → ${mM(K.float_fmv_33)}</h3>
      <div class="hint">Tedarik süreleri değişmezse 2033'te ${mM((K.float_fmv_33 - K.float_fmv).toFixed(1)*1)} daha fazla sermaye burada bağlı kalır.
      547 parçaya atölye kabiliyeti yatırımı yılda <b>${mM(K.kab_tasarruf)}</b> tasarruf ve <b>${mM(K.kab_sermaye)}</b> tek seferlik serbesti getiriyor.
      Bugün bu parçalara yılda ${mM(K.kab_bugun)} dış tamir harcanıyor.</div></div>
    <div class="card"><h3 style="color:${C.violet}">3 · Emekli filo stoğu · ${mM(K.phaseout)}</h3>
      <div class="hint">Envanterin ${pct(K.phaseout_pct)}'si, talebi 8 yılda üçte birine inecek 4 klasik modele bağlı.
      Bu stok takvimle değil sinyalle eritilir, böylece yarının atıl yığını bugünden yönetilir.</div></div>
  </div>

  <div class="grid g2">
    <div class="card"><h3>Pool ve değişim havuzu bugün zaten çalışıyor
      <span class="bg bg-warn" style="vertical-align:2px;margin-left:6px">MENTORA SORULDU</span></h3>
      <div class="hint">Yılda <b>${fmt(K.exch_in)} giriş, ${fmt(K.exch_out)} çıkış</b> değişim trafiği var. Bu, havuz mekanizmasının
      şimdiden işlediğini gösteriyor. Talebin yarıdan fazlası havuzdan gelen <b>${K.pool_bagimli} parça</b> havuza bağımlı işaretli.
      Bir anomali de var: THY uçağı yılda ${f1(B.thy_ucak_basi)} parça talep ederken pool uçağı ${f1(B.pool_ucak_basi)} talep ediyor,
      arada <b>3,6 kat</b> fark. Bunu gizlemedik, mentora sorduk. Sistemde bu oran sabit değil, ayarlanabilir.</div>
      <div style="height:130px"><canvas id="cPool"></canvas></div></div>
    <div class="card"><h3>Gayrifaal karar kuyruğu: rafta bekleyen karar</h3>
      <div class="grid g3" style="margin:10px 0 4px">
        <div class="kpi" style="padding:11px 13px"><div class="l">Bekleyen parça</div><div class="v" style="font-size:1.25rem">${fmt(K.gayrifaal_adet)}</div><div class="d">arızalı, karar bekliyor</div></div>
        <div class="kpi amber" style="padding:11px 13px"><div class="l">Faale döndürme</div><div class="v" style="font-size:1.25rem">${mM(K.gayrifaal_tamir)}</div><div class="d">tahmini tamir maliyeti</div></div>
        <div class="kpi teal" style="padding:11px 13px"><div class="l">Kazanılacak değer</div><div class="v" style="font-size:1.25rem">${mM(K.gayrifaal_fmv)}</div><div class="d">piyasa değeri</div></div>
      </div>
      <div class="hint">Net kazançlı bir havuz. Tek şart, tamiri ekonomik olmayanları önce ayıklamak. Vizyonumuzda her bekleyen parçaya
      bir karar süresi hedefi konuyor, çünkü <b>karar gecikmesi de bir tür tamir süresidir.</b></div></div>
  </div>

  <div class="grid g21">
    <div class="card"><h3>Sermaye nerede duruyor?</h3>
      <div class="hint">Fiziksel envanter ${mM(K.fmv)} değerinde. Ayrıca ${mM(K.po_clp)} tutarında açık sipariş yolda.</div>
      <div style="height:265px"><canvas id="cCap"></canvas></div></div>
    <div class="card"><h3>İki ayrı Pareto: operasyon ile sermaye farklı</h3>
      <div class="hint">Adette az sayıda parça öne çıkmıyor, en çok talep gören 20 parça talebin yalnızca ${pct(K.adet_top20)}'i.
      Değerde ise 500 parça değerin ${pct(K.deger_top500)}'ini taşıyor. Bu yüzden operasyonu geniş, sermayeyi dar yönetiyoruz.</div>
      <div style="height:245px"><canvas id="cPareto"></canvas></div></div>
  </div>

  <div class="grid g21">
    <div class="card"><h3>Kırmızı liste: kritikliğe göre dağılım</h3>
      <div class="hint">Bir parça, eldeki stok yenisi gelene kadar yetmiyorsa uyarı veriyor. "Siparişsiz" olanlar uyarı var ama aksiyon yok demek.</div>
      <div style="height:235px"><canvas id="cDurum"></canvas></div></div>
    <div class="card"><h3>Neden görünmüyor? Parçalı sistem haritası</h3>
      <div class="hint">Saha gözlemi (birincil kaynak): bir komponent <b>~9 başkanlıktan</b> geçiyor,
      kaydı <b>4-5 ayrı sistemde</b> tutuluyor. Bu sistemler birbirine bağlı değil.</div>
      <div class="ladder">
        <div class="step"><span class="no">→</span><span class="nm">Satış → Planlama → Satın Alma → Lojistik → Gümrük → Tesellüm → Depo → Atölye → Komponent Hizmetleri<small>Kalite tüm süreci yatay keser. Her elden geçişte veri kopuyor.</small></span></div>
        <div class="step"><span class="no">⚠</span><span class="nm">Bozuk parçada süreç: atölye → hangar stoğu → tedarikçi → getirtme → kanibalizasyon → AOG timi<small>Tamamen telefonla ilerleyen, kayıt tutmayan bir süreç.</small></span></div>
        <div class="step best"><span class="no">✓</span><span class="nm">Kontrol Kulesi mevcut sistemleri okur, hiçbirine yazmaz. Kayıt sistemi değil, bir <b>karar katmanı.</b><small>${K.siparissiz} siparişsiz parça, eksik olan bu katmanın ölçülmüş hâli.</small></span></div>
      </div></div>
  </div>

  <h2 class="sec-h">Yol haritası: üç faz, geçiş tarihle değil ölçütle</h2>
  <div class="grid g3">
    <div class="card"><h3 style="color:${C.teal}">Faz 1 · Görünürlük <span class="note">ilk ~12 ay</span></h3>
      <div class="hint">Salt okunur birleşik kayıt, sermaye kokpiti ve kırmızı liste raporu. Daha ilk teslimat gününde
      somut değer üretir: stoğu biten <b>${K.siparissiz} parçanın yakalanması.</b><br>
      <b style="color:${C.text}">Bir sonraki faza geçiş:</b> veri kalitesi puanı eşiğine bağlı, tarihe değil.</div></div>
    <div class="card"><h3 style="color:${C.blue}">Faz 2 · Öngörü <span class="note">öneri modu</span></h3>
      <div class="hint">Segmentli tahmin, insan onaylı min-max önerileri, geçmişi olmayan parça tahmini, hurda ve satın alma planı.
      Stres testi ve çeyreklik prova ritmi de burada başlar.<br>
      <b style="color:${C.text}">Bir sonraki faza geçiş:</b> tahmin doğruluğu ve öneri kabul oranı eşiğine bağlı.</div></div>
    <div class="card"><h3 style="color:${C.violet}">Faz 3 · Aksiyon</h3>
      <div class="hint">Otomatik uyarı-aksiyon bağı, havuz dengeleme, operatör portalı ve kriz planının sisteme gömülü kuralları.
      Bu fazda "uyarı var ama sipariş yok" durumu artık mümkün olmuyor.<br>
      <b style="color:${C.text}">İlke:</b> hiçbir kaynak sisteme yazılmaz. Kayıt değil, karar katmanıyız.</div></div>
  </div>

  <div class="card" style="margin-top:2px"><h3>Mimari: kayıt sistemlerinin üzerine bir karar katmanı</h3>
    <div class="hint">"AMOS ve TRAX zaten var, farkınız ne?" sorusunun cevabı bu şema. Mevcut sistemler değiştirilmiyor, sadece
    okunuyor. Veriler tek bir modelde birleşiyor ve motorlar bunun üzerinde çalışıyor. Hiçbir kaynağa geri yazılmadığı
    için entegrasyon riski neredeyse sıfır ve ilk değer ilk günden geliyor.</div>
    <div style="overflow-x:auto"><svg viewBox="0 0 1000 232" style="min-width:820px;width:100%">
      <defs><marker id="mAr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto">
        <path d="M0,0.5 L7.5,4 L0,7.5 Z" fill="#4FC1B0"/></marker></defs>
      ${['AMOS', 'TRAX', '“Mars”', 'ÜPK', 'Depo / bin-raf'].map((t, i) => `
        <rect x="12" y="${14 + i * 42}" width="118" height="32" rx="6" fill="#182338" stroke="#263450"/>
        <text x="71" y="${34 + i * 42}" text-anchor="middle" font-size="11" fill="#9AA8C0" font-family="Inter,sans-serif">${t}</text>
        <line x1="130" y1="${30 + i * 42}" x2="186" y2="112" stroke="#4FC1B0" stroke-width="1.2" opacity=".55" marker-end="url(#mAr)"/>`).join('')}
      <text x="71" y="228" text-anchor="middle" font-size="9.5" fill="#77869C" font-family="'JetBrains Mono',monospace">4–5 KOPUK KAYIT SİSTEMİ</text>
      <rect x="190" y="86" width="118" height="52" rx="8" fill="rgba(79,193,176,.1)" stroke="#4FC1B0"/>
      <text x="249" y="108" text-anchor="middle" font-size="11.5" fill="#EAF0F7" font-family="Inter,sans-serif" font-weight="600">CDC</text>
      <text x="249" y="124" text-anchor="middle" font-size="9.5" fill="#4FC1B0" font-family="'JetBrains Mono',monospace">SALT OKUNUR</text>
      <line x1="308" y1="112" x2="352" y2="112" stroke="#4FC1B0" stroke-width="1.6" marker-end="url(#mAr)"/>
      <rect x="356" y="86" width="128" height="52" rx="8" fill="#182338" stroke="#263450"/>
      <text x="420" y="108" text-anchor="middle" font-size="11.5" fill="#EAF0F7" font-family="Inter,sans-serif" font-weight="600">Olay omurgası</text>
      <text x="420" y="124" text-anchor="middle" font-size="9" fill="#77869C" font-family="'JetBrains Mono',monospace">event-sourced · gerçek TAT</text>
      <line x1="484" y1="112" x2="528" y2="112" stroke="#4FC1B0" stroke-width="1.6" marker-end="url(#mAr)"/>
      <rect x="532" y="86" width="128" height="52" rx="8" fill="#182338" stroke="#263450"/>
      <text x="596" y="108" text-anchor="middle" font-size="11.5" fill="#EAF0F7" font-family="Inter,sans-serif" font-weight="600">Tek veri modeli</text>
      <text x="596" y="124" text-anchor="middle" font-size="9" fill="#77869C" font-family="'JetBrains Mono',monospace">PN + seri + durum + konum</text>
      ${['Tahmin (SBA+AI)', 'Min-max + emniyet', 'Alarm (TTS/TTR)', 'Senaryo + Monte Carlo', 'Önceliklendirme'].map((t, i) => `
        <line x1="660" y1="112" x2="704" y2="${30 + i * 42}" stroke="#4FC1B0" stroke-width="1.1" opacity=".55" marker-end="url(#mAr)"/>
        <rect x="708" y="${14 + i * 42}" width="140" height="32" rx="6" fill="#182338" stroke="#263450"/>
        <text x="778" y="${34 + i * 42}" text-anchor="middle" font-size="10" fill="#9AA8C0" font-family="Inter,sans-serif">${t}</text>`).join('')}
      <line x1="848" y1="112" x2="892" y2="112" stroke="#4FC1B0" stroke-width="1.6" marker-end="url(#mAr)"/>
      <rect x="896" y="72" width="94" height="80" rx="8" fill="rgba(79,193,176,.1)" stroke="#4FC1B0"/>
      <text x="943" y="98" text-anchor="middle" font-size="11" fill="#EAF0F7" font-family="Inter,sans-serif" font-weight="600">Kontrol</text>
      <text x="943" y="113" text-anchor="middle" font-size="11" fill="#EAF0F7" font-family="Inter,sans-serif" font-weight="600">Kulesi</text>
      <text x="943" y="133" text-anchor="middle" font-size="8.5" fill="#77869C" font-family="'JetBrains Mono',monospace">5 ekran + alarm</text>
      <path d="M896,190 Q460,224 132,190" fill="none" stroke="#E06A6A" stroke-width="1.4" stroke-dasharray="7,5"/>
      <line x1="500" y1="196" x2="524" y2="216" stroke="#E06A6A" stroke-width="2"/>
      <line x1="524" y1="196" x2="500" y2="216" stroke="#E06A6A" stroke-width="2"/>
      <text x="512" y="188" text-anchor="middle" font-size="10" fill="#E06A6A" font-family="'JetBrains Mono',monospace">GERİ YAZMA YOK · kaynaklara dokunulmaz</text>
    </svg></div></div>

  <h2 class="sec-h">Başarı kriterleri: çalıştığını nasıl anlarız?</h2>
  <div class="grid g4">
    <div class="kpi teal"><div class="l">Yerde bekleyen uçak oranı</div><div class="v">↓</div>
      <div class="d">Ana ölçüt. Parça yüzünden yerde bekleyen uçak yüzdesi düşer, her saati gelir kaybı.</div></div>
    <div class="kpi red"><div class="l">Siparişsiz kırmızı</div><div class="v">${K.siparissiz} → 0</div>
      <div class="d">Her uyarı bir aksiyona bağlanır, "uyarı var sipariş yok" durumu ortadan kalkar.</div></div>
    <div class="kpi"><div class="l">Kritik parça karşılama</div><div class="v">≥ %97–98</div>
      <div class="d">Servis hedefi kritikliğe göre değişir: kritik parçada daha yüksek tutulur.</div></div>
    <div class="kpi"><div class="l">Erken yakalama</div><div class="v">↑</div>
      <div class="d">Stok bitişlerinin tedarik süresi dolmadan yakalanma oranı. Uyarı kalitesinin ölçüsü.</div></div>
    <div class="kpi"><div class="l">Tahmin doğruluğu</div><div class="v">↑</div>
      <div class="d">Bu eşik geçilmeden otomasyona geçilmiyor. Öneri kabul oranıyla birlikte izlenir.</div></div>
    <div class="kpi amber"><div class="l">Bağlı sermaye sınırı</div><div class="v">${mM(K.float_fmv)}</div>
      <div class="d">Servis, stok şişirilerek değil tedarik süresi kısaltılarak korunur.</div></div>
    <div class="kpi"><div class="l">Acil sevkiyat maliyeti</div><div class="v">↓</div>
      <div class="d">Erken yakalanan uyarı ucuz kanaldan çözülür, acil kargo harcaması düşer.</div></div>
    <div class="kpi"><div class="l">Hurda oranı</div><div class="v">${pct(K.scrap_oran)}</div>
      <div class="d">İzlenir ve anomali dedektörüyle denetlenir. BER kuralı bu akışın vanası.</div></div>
  </div>

  <div class="card" style="margin-top:16px"><h3>Veri boşlukları: neyi bilmiyoruz, üründe nereden gelecek?</h3>
    <div class="hint">Sınırlarımızı kendimiz söylüyoruz. Bu tabloyu saklamıyoruz, açıkça gösteriyoruz.</div>
    <div class="tw" style="max-height:none"><table><thead><tr>
      <th>Eksik veri</th><th>Bugünkü etkisi</th><th>Ürünün gerçeğinde kaynağı</th></tr></thead><tbody>
      <tr><td>İstasyon bazlı stok</td><td>Harita temsilî dağıtımla çalışıyor</td><td>Faz 1'de istasyon etiketli depo kayıtları</td></tr>
      <tr><td>Parça seri numarası</td><td>Tek tek parça takibi yapılamıyor</td><td>Faz 1'de tek komponent kaydı</td></tr>
      <tr><td>Tek yıllık tarih</td><td>Mevsimsellik tek gözleme dayanıyor</td><td>AMOS arşivi ve canlı veri akışı</td></tr>
      <tr><td>Envanter tek kesit</td><td>Stok akışı izlenemiyor, tek anlık fotoğraf</td><td>Faz 1'den itibaren günlük stok kesitleri</td></tr>
      <tr><td>Fiyat geçmişi</td><td>Kıtlık sensörü ileriye dönük bir tasarım</td><td>Piyasa fiyat servisi ve sipariş tarihçesi</td></tr>
    </tbody></table></div></div>`;

  /* sermaye doughnut */
  const kalan = +(K.fmv - K.svc_fmv - K.tamirde_fmv - K.gayrifaal_fmv).toFixed(1);
  new Chart($('cCap'), {type:'doughnut',
    data:{labels:[`Kullanılabilir stok: ${mM(K.svc_fmv)}`,`Tamir döngüsünde: ${mM(K.tamirde_fmv)}`,
                  `Gayrifaal, karar bekliyor: ${mM(K.gayrifaal_fmv)}`,`Değişim ve diğer: ${mM(kalan)}`],
      datasets:[{data:[K.svc_fmv,K.tamirde_fmv,K.gayrifaal_fmv,kalan],
        backgroundColor:[C.teal,C.blue,C.red,C.dim],borderColor:'#0B1220',borderWidth:3}]},
    options:{maintainAspectRatio:false,cutout:'62%',
      plugins:{legend:{position:'right'},tooltip:{callbacks:{label:c=>' '+mM(c.parsed)}}}}});

  /* Pareto */
  new Chart($('cPareto'), {type:'line',
    data:{datasets:[
      {label:'Değer (FMV) payı',data:DATA.pareto.x.map((x,i)=>({x,y:DATA.pareto.deger[i]})),borderColor:C.amber,backgroundColor:C.amber,pointRadius:0,borderWidth:2,tension:.25},
      {label:'Talep adedi payı',data:DATA.pareto.x.map((x,i)=>({x,y:DATA.pareto.adet[i]})),borderColor:C.blue,backgroundColor:C.blue,pointRadius:0,borderWidth:2,tension:.25},
      {label:'%80 çizgisi',data:[{x:0,y:80},{x:100,y:80}],borderColor:C.dim,borderDash:[5,5],pointRadius:0,borderWidth:1}]},
    options:{maintainAspectRatio:false,scales:{
      x:{type:'linear',min:0,max:100,ticks:{callback:v=>'%'+v},title:{display:true,text:'PN yüzdesi (değere/adede göre sıralı)'}},
      y:{min:0,max:100,ticks:{callback:v=>'%'+v}}},
      plugins:{tooltip:{callbacks:{title:it=>'PN %'+f1(it[0].parsed.x),label:c=>` ${c.dataset.label}: %${f1(c.parsed.y)}`}}}}});

  /* kırmızı kırılımı */
  const kir=[0,0,0], sip=[0,0,0];
  for(let i=0;i<NPN;i++){ if(hasF(i,FL.KIRMIZI)){kir[PN.kr[i]]++; if(hasF(i,FL.SIP))sip[PN.kr[i]]++;} }
  new Chart($('cDurum'), {type:'bar',
    data:{labels:LK.kr,datasets:[
      {label:'Kırmızı PN',data:kir,backgroundColor:'rgba(224,106,106,.75)',borderRadius:4},
      {label:'… içinde siparişsiz',data:sip,backgroundColor:'rgba(232,163,61,.8)',borderRadius:4}]},
    options:{maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});

  /* pool anomalisi: uçak başına yıllık talep */
  new Chart($('cPool'), {type:'bar',data:{labels:['THY uçağı','Pool uçağı'],
    datasets:[{label:'Uçak başına yıllık parça talebi',data:[B.thy_ucak_basi,B.pool_ucak_basi],
      backgroundColor:['rgba(91,143,214,.8)','rgba(79,193,176,.8)'],borderRadius:4,barPercentage:.55}]},
    options:{maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},
      tooltip:{callbacks:{label:c=>` ${f1(c.parsed.x)} adet/uçak-yıl`}}},
      scales:{x:{beginAtZero:true}}}});

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-goto]'); if(!b) return;
    showView(b.dataset.goto);
    if(b.dataset.preset === 'siparissiz' && W.ready){ W.reset(); W.flags.add(FL.SIP); W.apply(); }
  });
}

/* =====================================================================
   2 · WATCHLIST — 5.000 PN, filtre + sırala + aksiyon merdiveni
   ===================================================================== */
const W = {ready:false, flags:new Set(), kr:'', qtxt:'', sort:{k:'risk', asc:false}, sel:-1};

function renderWatch(){
  const el = $('v-watch');
  el.innerHTML = `
  <h2 class="sec-h">Watchlist: risk skoruna göre sıralı ${fmt(K.pn)} parça</h2>
  <p class="sec-p">Risk skoru bir parçanın kritikliğini, yıllık talebini ve tedarik süresini birlikte değerlendirir. Kısaca,
  herhangi bir anda serviste olmayacak beklenen parça miktarını gösterir. Listenin birincisi
  <b class="mono" style="color:${C.teal}">PN-${PN.id[0]}</b> sahada gerçekten riskli çıktı, yani ölçü masa başı bir hesap değil.</p>
  <div class="card">
    <div class="ctl">
      <input type="text" id="wQ" placeholder="PN / kategori / model ara…" style="flex:1;min-width:170px">
      <select id="wKr"><option value="">Tüm kritiklik</option>${LK.kr.map((k,i)=>`<option value="${i}">${k}</option>`).join('')}</select>
      <span class="chip" data-f="${FL.KIRMIZI}">Kırmızı ${K.kirmizi}</span>
      <span class="chip" data-f="${FL.SIP}">Siparişsiz ${K.siparissiz}</span>
      <span class="chip" data-f="${FL.R547}">Risk listesi ${K.risk_listesi}</span>
      <span class="chip" data-f="${FL.BER}">BER ${K.ber_pn}</span>
      <span class="chip" data-f="${FL.PO}">Phase-out</span>
      <span class="chip" data-f="${FL.YENI}">Yeni nesil</span>
      <span class="chip" data-f="${FL.SCRAPA}">Hurda anomalisi ${K.scrap_anomali}</span>
      <span class="chip" data-f="${FL.POOLB}">Pool bağımlı ${K.pool_bagimli}</span>
      <span class="chip" id="wClear">✕ temizle</span>
    </div>
    <div class="tw"><table id="wTbl"><thead><tr>
      <th>PN</th><th>Model</th><th>Kategori</th><th>Kritiklik</th><th>Durum</th>
      <th class="n" data-k="svc">SVC</th><th class="n" data-k="tts">TTS / TTR</th>
      <th class="n" data-k="t25">Talep 25→33</th><th class="n" data-k="min33">Min–Max 33</th>
      <th class="n" data-k="clp">CLP</th><th class="n" data-k="risk">Risk</th>
    </tr></thead><tbody></tbody></table></div>
    <div class="hint" id="wNote" style="margin:10px 0 0"></div>
  </div>
  <div id="wDet"></div>`;

  W.ready = true;
  W.reset = () => { W.flags.clear(); W.kr=''; W.qtxt=''; $('wQ').value=''; $('wKr').value=''; };
  W.apply = () => {
    document.querySelectorAll('#v-watch .chip[data-f]').forEach(c =>
      c.classList.toggle('on', W.flags.has(+c.dataset.f)));
    drawRows();
  };

  $('wQ').addEventListener('input', e => { W.qtxt = foldTr(e.target.value.trim()); drawRows(); });
  $('wKr').addEventListener('change', e => { W.kr = e.target.value; drawRows(); });
  $('wClear').addEventListener('click', () => { W.reset(); W.apply(); });
  el.addEventListener('click', e => {
    const ch = e.target.closest('.chip[data-f]');
    if(ch){ const f = +ch.dataset.f; W.flags.has(f) ? W.flags.delete(f) : W.flags.add(f); W.apply(); return; }
    const th = e.target.closest('th[data-k]');
    if(th){ const k = th.dataset.k;
      if(W.sort.k === k) W.sort.asc = !W.sort.asc; else { W.sort.k = k; W.sort.asc = false; }
      drawRows(); return; }
    const tr = e.target.closest('tr[data-i]');
    if(tr){ W.sel = +tr.dataset.i; drawDetail(W.sel); $('wDet').scrollIntoView({behavior:'smooth', block:'nearest'}); }
  });

  function filtered(){
    const out = [];
    for(let i=0;i<NPN;i++){
      if(W.kr !== '' && PN.kr[i] !== +W.kr) continue;
      let ok = true;
      for(const f of W.flags) if(!hasF(i,f)){ ok=false; break; }
      if(!ok) continue;
      if(W.qtxt){
        const hay = 'pn-' + PN.id[i] + '|' + foldTr(LK.sub[PN.sub[i]]) + '|' + foldTr(LK.mdl[PN.mdl[i]]);
        if(!hay.includes(W.qtxt)) continue;
      }
      out.push(i);
    }
    const k = W.sort.k, dir = W.sort.asc ? 1 : -1;
    if(!(k === 'risk' && !W.sort.asc)) out.sort((a,b) => (PN[k][a] - PN[k][b]) * dir);
    return out;
  }

  function drawRows(){
    document.querySelectorAll('#wTbl th').forEach(t => t.classList.remove('sorted','asc'));
    const th = document.querySelector(`#wTbl th[data-k="${W.sort.k}"]`);
    if(th) th.classList.add(W.sort.asc ? 'asc' : 'sorted');
    const idx = filtered(), show = idx.slice(0, 300), rmax = PN.risk[0] || 1;
    $('wTbl').querySelector('tbody').innerHTML = show.map(i => {
      const fl = [];
      if(hasF(i,FL.SIP)) fl.push('<span class="bg bg-red">SİPARİŞSİZ</span>');
      else if(hasF(i,FL.KIRMIZI)) fl.push('<span class="bg bg-red">KIRMIZI</span>');
      if(hasF(i,FL.R547)) fl.push('<span class="bg bg-warn">547</span>');
      if(hasF(i,FL.BER)) fl.push('<span class="bg bg-warn">BER</span>');
      const ttsTxt = PN.tts[i] >= 9999 ? '∞' : fmt(PN.tts[i]);
      const rw = Math.max(4, 100 * PN.risk[i] / rmax);
      return `<tr data-i="${i}"><td class="pn-link">PN-${PN.id[i]}</td><td>${LK.mdl[PN.mdl[i]]}</td>
      <td>${LK.sub[PN.sub[i]]}</td><td>${KR_BADGE[PN.kr[i]]}</td><td>${fl.join(' ') || '<span style="color:'+C.dim+'">—</span>'}</td>
      <td class="n">${fmt(PN.svc[i])}</td><td class="n" style="color:${PN.tts[i] < PN.ttr[i] ? C.red : C.muted}">${ttsTxt} / ${fmt(PN.ttr[i])}g</td>
      <td class="n">${fmt(PN.t25[i])} → ${fmt(PN.t33[i])}</td><td class="n">${fmt(PN.min33[i])}–${fmt(PN.max33[i])}</td>
      <td class="n">${mUsd(PN.clp[i])}</td>
      <td class="n"><span class="bar-track" style="display:inline-block;width:52px;vertical-align:middle;margin-right:7px"><i style="width:${rw}%;background:${PN.risk[i] > 40 ? C.red : PN.risk[i] > 15 ? C.amber : C.blue}"></i></span>${f1(PN.risk[i])}</td></tr>`;
    }).join('');
    $('wNote').textContent = idx.length > 300
      ? `İlk 300 satır gösteriliyor. Toplam ${fmt(idx.length)} parça eşleşti, filtreyi daraltabilirsiniz.`
      : `${fmt(idx.length)} parça eşleşti.`;
  }

  function ladder(i){
    const ops = [];
    if(PN.exin[i] + PN.exout[i] > 0)
      ops.push({ad:'Havuzdan değişim', sm:'havuz zaten çalışıyor', gun:3, m:.10 * PN.clp[i], tag:'varsayılan ücret liste fiyatının %10\'u'});
    if(PN.ato[i] && PN.tic[i] != null)
      ops.push({ad:'İç atölye tamiri', sm:'iç tamir mümkün', gun:PN.tic[i], m:PN.icrep[i]});
    ops.push({ad:'Dış tamir', sm:hasF(i,FL.BER) ? 'Dikkat: bu parçada tamir ekonomik değil' : 'standart kanal', gun:PN.tdis[i], m:PN.disrep[i]});
    ops.push({ad:'Hızlandırılmış dış tamir', sm:'ek ücretle daha hızlı', gun:Math.ceil(PN.tdis[i]*.6), m:PN.disrep[i]*1.5, tag:'varsayılan süre 0,6 kat, maliyet 1,5 kat'});
    ops.push({ad:'Yeni satın alma', sm:'üreticiden tedarik', gun:PN.tsat[i], m:PN.clp[i]});
    if(PN.gay[i] > 0)
      ops.push({ad:'Kayıtlı kanibalizasyon', sm:PN.gay[i] + ' adet arızalı donör var', gun:1, m:null, tag:'donör borç defterine işlenir'});
    ops.sort((a,b) => a.gun - b.gun);
    return ops.map((o,n) => `<div class="step${n===0?' best':''}"><span class="no">${n+1}</span>
      <span class="nm">${o.ad}<small>${o.sm}${o.tag ? ' · ' + o.tag : ''}</small></span>
      <span class="m"><b>${o.gun} gün</b><span>${o.m == null ? 'tamir borcu' : mUsd(o.m)}</span></span></div>`).join('');
  }

  function drawDetail(i){
    const tts = PN.tts[i], ttr = PN.ttr[i];
    const mx = Math.max(Math.min(tts, ttr*3), ttr, 1);
    const fl = [];
    if(hasF(i,FL.SIP)) fl.push('<span class="bg bg-red">KIRMIZI + SİPARİŞSİZ</span>');
    else if(hasF(i,FL.KIRMIZI)) fl.push('<span class="bg bg-red">KIRMIZI</span>');
    if(hasF(i,FL.R547)) fl.push('<span class="bg bg-warn">RİSK LİSTESİ 547</span>');
    if(hasF(i,FL.BER)) fl.push('<span class="bg bg-warn">BER ADAYI</span>');
    if(hasF(i,FL.PO)) fl.push('<span class="bg bg-nk">PHASE-OUT MODELİ</span>');
    if(hasF(i,FL.YENI)) fl.push('<span class="bg bg-teal">YENİ NESİL</span>');
    $('wDet').innerHTML = `
    <div class="card" style="margin-top:14px">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        <h3 class="mono" style="font-size:1.15rem;color:${C.teal}">PN-${PN.id[i]}</h3>
        ${KR_BADGE[PN.kr[i]]}<span style="color:${C.dim};font-size:.8rem">${LK.sub[PN.sub[i]]} · ${LK.mdl[PN.mdl[i]]} · risk ${f1(PN.risk[i])}</span>
        <span style="margin-left:auto">${fl.join(' ')}</span>
      </div>
      <div class="grid g2" style="margin:0">
        <div>
          <h3 style="font-size:.83rem;color:${C.muted}">Stok &amp; sağlık</h3>
          <div class="split" style="margin:9px 0 13px">
            <div><span class="note">SVC ${fmt(PN.svc[i])}</span></div>
            <div><span class="note">Gayrifaal ${fmt(PN.gay[i])}</span></div>
            <div><span class="note">Tamirde ${fmt(PN.tam[i])}</span></div>
            <div><span class="note">Açık PO ${fmt(PN.po[i])}</span></div>
            <div><span class="note">Exch ${fmt(PN.exin[i])}↓ ${fmt(PN.exout[i])}↑</span></div>
          </div>
          <div style="font-size:.78rem;color:${C.dim};margin-bottom:4px">Dayanma süresi (TTS): <b class="mono" style="color:${tts<ttr?C.red:C.teal}">${tts>=9999?'∞':fmt(tts)+' gün'}</b></div>
          <div class="bar-track" style="height:9px;margin-bottom:9px"><i style="width:${Math.min(100,100*tts/mx)}%;background:${tts<ttr?C.red:C.teal}"></i></div>
          <div style="font-size:.78rem;color:${C.dim};margin-bottom:4px">Toparlanma süresi (TTR): <b class="mono">${fmt(ttr)} gün</b>, ${PN.ato[i]?'iç tamir':'dışa bağımlı'}</div>
          <div class="bar-track" style="height:9px"><i style="width:${Math.min(100,100*ttr/mx)}%;background:${C.blue}"></i></div>
          <div class="hint" style="margin-top:13px">Önerilen 2033 min-max: <b class="mono">${fmt(PN.min33[i])} – ${fmt(PN.max33[i])}</b> adet.
          Servis hedefi ${pct(PN.sh[i]*100,0)}, tedarik süresi ${fmt(PN.lead[i])} gün, talep ${fmt(PN.t25[i])} → ${fmt(PN.t33[i])}, yıllık hurda ${fmt(PN.scrap[i])}.<br>
          Liste fiyatı ${mUsd(PN.clp[i])}, piyasa değeri ${mUsd(PN.fmv[i])}, dış tamir ${mUsd(PN.disrep[i])}${PN.icrep[i]!=null?', iç tamir '+mUsd(PN.icrep[i]):''}.</div>
        </div>
        <div>
          <h3 style="font-size:.83rem;color:${C.muted}">Aksiyon sıralayıcı: seçenekler süreye göre</h3>
          <div class="ladder" style="margin-top:9px">${ladder(i)}</div>
          <div class="hint" style="margin-top:9px">Seçenekler süreye göre sıralanır. AOG saatlik maliyeti girilirse süre ve maliyet birlikte puanlanabilir.</div>
          <h3 style="font-size:.83rem;color:${C.muted};margin-top:14px">Canlı stok yetmeme eğrisi</h3>
          <div style="height:170px;margin-top:7px"><canvas id="cPnCurve"></canvas></div>
          <div class="hint" style="margin-top:6px">Talep verisi zaten Poisson dağılımıyla üretildiği için bu eğri, simülasyonun kapalı form karşılığıdır.
          İşaretler mevcut stoğu ve önerilen 2033 MIN değerini gösterir.</div>
        </div>
      </div>
    </div>`;
    drawCurve(i);
  }

  function drawCurve(i){
    const mu = PN.rate33[i] * PN.lead[i] / PRM.ceyrek_gun;
    const smax = Math.max(Math.ceil(mu + 4*Math.sqrt(mu) + 4), PN.svc[i] + 2, PN.min33[i] + 2);
    const step = Math.max(1, Math.ceil(smax/48));
    const xs = [], ys = [];
    let term = Math.exp(-Math.min(mu,700)), cdf = mu > 100 ? null : term;
    if(mu > 100){ // normal yaklaşım
      const phi = z => .5*(1+Math.tanh(Math.sqrt(Math.PI/8)*z*(1+.044715*z*z)));
      for(let s=0; s<=smax; s+=step){ xs.push(s); ys.push(+(100*phi((s+.5-mu)/Math.sqrt(mu))).toFixed(2)); }
    } else {
      let k = 0, acc = term;
      for(let s=0; s<=smax; s+=step){
        while(k < s){ k++; term *= mu/k; acc += term; }
        xs.push(s); ys.push(+(100*Math.min(1,acc)).toFixed(2));
      }
    }
    const at = s => { const j = Math.min(xs.length-1, Math.round(s/step)); return {x:xs[j], y:ys[j]}; };
    if(W.curve) W.curve.destroy();
    W.curve = new Chart($('cPnCurve'), {data:{datasets:[
      {type:'line',label:'Servis düzeyi',data:xs.map((x,j)=>({x,y:ys[j]})),borderColor:C.teal,pointRadius:0,borderWidth:2,tension:.2},
      {type:'scatter',label:'Mevcut SVC',data:[at(PN.svc[i])],backgroundColor:C.amber,pointRadius:6,pointStyle:'rectRot'},
      {type:'scatter',label:'Önerilen MIN 2033',data:[at(PN.min33[i])],backgroundColor:C.red,pointRadius:6}]},
      options:{maintainAspectRatio:false,
        scales:{x:{type:'linear',title:{display:true,text:'stok seviyesi s (adet)'},ticks:{precision:0}},
                y:{min:0,max:102,ticks:{callback:v=>'%'+v}}},
        plugins:{legend:{labels:{boxWidth:9,font:{size:10}}},
          tooltip:{callbacks:{label:c=>` ${c.dataset.label}: s=${fmt(c.parsed.x)} → %${f1(c.parsed.y)}`}}}}});
  }

  W.showDetail = i => { W.sel = i; drawDetail(i); };
  drawRows();
  drawDetail(0);
}

/* =====================================================================
   3 · ÖNGÖRÜ & AI
   ===================================================================== */
function renderOngoru(){
  const el = $('v-ongoru');
  const ml = DATA.ml;
  el.innerHTML = `
  <h2 class="sec-h">Talep yapısı: klasik yöntemler neden yanılır?</h2>
  <div class="grid g21">
    <div class="card"><h3>2025 çeyreklik talep ve hurda</h3>
      <div class="hint">Yaz çeyreğinde talep diğerlerinin ${pct(K.q3_pct)} üstüne çıkıyor. Bu etki tüm kritiklik sınıflarında benzer,
      bu yüzden tek bir mevsim katsayısı kullanılabiliyor. Yıl içindeki artış ise düşük, ${pct(K.q1q4_pct)}, ve tek yıllık
      veriye dayandığı için güveni sınırlı. Tek parça için canlı stok eğrisini Watchlist parça detayında görebilirsiniz.</div>
      <div style="height:270px"><canvas id="cCey"></canvas></div></div>
    <div class="card"><h3>Talep ne kadar kesikli?</h3>
      <div class="hint">Bir parça yılda ortalama <b>${fmt(K.medyan_talep)} adet</b> hareket ediyor ve parça-çeyreklerin ${pct(K.sifir_ceyrek)}'ı tamamen sıfır.
      Talep bu kadar seyrek olunca yöntem seçimi değişiyor.</div>
      <div class="ladder">
        <div class="step"><span class="no">→</span><span class="nm">${fmt(K.kesikli)} parçanın talebi kesikli<small>en az bir çeyreği sıfır</small></span></div>
        <div class="step"><span class="no">→</span><span class="nm">Hareketli ortalama ve sabit min-max bu profilde düzenli olarak yanılıyor<small>tasarım kararının veri gerekçesi</small></span></div>
        <div class="step best"><span class="no">✓</span><span class="nm">Bu yüzden kesikli talep için tasarlanmış yöntemler kullanıyoruz<small>servis hedefi kritikliğe göre değişir</small></span></div>
      </div></div>
  </div>

  <h2 class="sec-h">Segmentasyon: hangi parçaya hangi yöntem?</h2>
  <div class="grid g21">
    <div class="card"><h3>ABC ve XYZ matrisi</h3>
      <div class="hint">Parçaları iki eksende sınıflıyoruz. Satırlar hacme göre, en çok talep gören A'dan az talep gören C'ye.
      Sütunlar düzenliliğe göre, istikrarlı X'ten öngörülemez Z'ye. Her hücrede kaç parça olduğu ve talep payı yazıyor.</div>
      <div style="overflow:auto"><table class="heat" id="tAbc"></table></div>
      <div class="hint" style="margin-top:9px">Her sütuna uygun yöntem atanıyor. İstikrarlı parçalarda klasik yöntemler yeterli,
      düzensiz parçalarda kesikli talep yöntemleri gerekiyor. En yüksek hacimli grupta bile
      ${fmt(DATA.abcxyz.sayi[0][0] + DATA.abcxyz.sayi[0][1] + DATA.abcxyz.sayi[0][2])} parça olması, kapsamın kısa bir listeyle
      yönetilemeyeceğini, otomasyonun şart olduğunu gösteriyor.</div></div>
    <div class="card"><h3>Hurda bütçesi: kategori kırılımı</h3>
      <div class="hint">Yıllık ikame bütçesi <b>${mM(K.scrap_butce)}</b>, filo büyümesiyle 2033'te <b>${mM(K.scrap_butce33)}</b>'a çıkıyor.
      En çok harcama yapan kategoriler aşağıda. BER kuralı bu akışın vanası.</div>
      <div style="height:210px"><canvas id="cScrapKat"></canvas></div>
      <div class="callout red" style="margin:11px 0 0;padding:12px 15px">
        <span class="tag">Hurda Anomali Dedektörü</span>
        <p style="font-size:.82rem"><b>${K.scrap_anomali} parçada</b> hurdaya ayırma oranı %20'nin üstünde ve yıllık talep 20'den fazla.
        Bunlar bir kalite sorununun, yanlış tamir kararının ya da kayıt hatasının işareti olabilir.
        <span class="chip" data-goto="watch" data-preset="scrapa" style="margin-left:6px">Listeyi aç →</span></p></div></div>
  </div>

  <div class="grid g21">
    <div class="card"><h3>Geriye dönük test: yaz çeyreğini önceden tahmin edebilir miydik?</h3>
      <div class="hint">Modeli geçmiş bir çeyrekle sınadık. Yılın ilk yarısıyla yaz çeyreğini tahmin ettirdik.
      Toplam düzeyde mevsim katsayısı hatayı %${String(DATA.backtest.toplam_hata[2]).replace('.',',')}'ten
      <b style="color:${C.teal}">%${String(DATA.backtest.toplam_hata[3]).replace('.',',')}'e</b> indiriyor.
      Tek parça düzeyinde ise katsayı bir şey değiştirmiyor, çünkü talep kesikli olduğu için bir parçanın yaz zirvesi öngörülemez.
      Buradan çıkan ders: parçada kesikli talep yöntemleri, bütçe ve kapasite planında mevsim düzeltmesi kullanılır.</div>
      <div style="height:205px"><canvas id="cBt"></canvas></div></div>
    <div class="callout" style="margin:0"><span class="tag">Bu Test Neden Önemli?</span>
      <p>"Projeksiyonlarınız güvenilir mi?" sorusunun üçüncü kanıtı bu. Birincisi, float formülünün sahayla %97 uyumlu çıkması.
      İkincisi, risk sıralamasının birincisinin sahada gerçekten riskli olması. Üçüncüsü de bu test: model, görmediği çeyreğin
      <strong>toplamını binde dört hatayla</strong> bildi. Üçü birden aynı şeyi söylüyor. Bu bir maket değil. Kaydırıcılar,
      senaryolar ve optimizasyon hep bu doğrulanmış çekirdeğin üzerinde çalışıyor.</p></div>
  </div>

  <h2 class="sec-h">2033 projeksiyonu: büyüme değil, dağılım değişimi</h2>
  <div class="grid g3">
    <div class="card"><h3>Talep aralığı: +%${Math.round(B.alt_pct)} – +%${Math.round(B.ust_pct)}</h3>
      <div class="hint">İki ayrı yöntemle hesapladık ve sonuçları bir aralık olarak veriyoruz. Tek bir nokta tahmin sunmuyoruz.</div>
      <div style="height:250px"><canvas id="cBant"></canvas></div></div>
    <div class="card"><h3>Talep nasıl yer değiştiriyor?</h3>
      <div class="hint">Yeni nesil modellerin payı %34'ten %65'e çıkıyor, küçülen 4 klasik model ise %43'ten %16'ya iniyor.
      Geçmişi olmayan parça tahmini bu yüzden ana senaryo.</div>
      <div style="height:250px"><canvas id="cGoc"></canvas></div></div>
    <div class="card"><h3>Kategoriler ayrışıyor</h3>
      <div class="hint">Bir kategori %40 büyürken bir diğeri %91 büyüyor. Bu yüzden tek bir katsayıyla plan yapmak yanlış olur.</div>
      <div style="height:250px"><canvas id="cKat"></canvas></div></div>
  </div>

  <div class="grid g21">
    <div class="card"><h3>Emekli filo planlayıcısı: 4 klasik modele bağlı ${mM(K.phaseout)}</h3>
      <div class="hint">Çubuklar her modele bağlı stok değerini, çizgi ise talebin 2033'e kadar değişimini gösteriyor.
      Bugün doğru duran bu stok, yönetilmezse yarının atıl yığını olur.</div>
      <div style="height:235px"><canvas id="cPhase"></canvas></div></div>
    <div class="callout amber" style="margin:0"><span class="tag">Eritme Takvimle Değil, Sinyalle</span>
      <p>Erken eritirsen uçak yerde kalır, geç kalırsan sermaye çürür. Çözüm, kararı sinyale bağlamak.
      Bir modelin kalan talebi eşiğin altına inince eritme hızlanır. Üretici üretimi bitirdiğini duyurunca
      son alım kararı tetiklenir. Teslimatlar gecikip klasik filo geç emekli olursa bu tetikler kendiliğinden yavaşlar.
      Takvime bağlı bir plan bu durumda çökerdi, sinyale bağlı plan kendini düzeltir. Senaryo sekmesindeki
      "OEM teslimat gecikmesi" düğmesi bunun canlı provası.</p></div>
  </div>

  <h2 class="sec-h">Yapay zekâ tahmin motoru</h2>
  <p class="sec-p">Model hibrit çalışıyor. İstatistiksel bir tahminin üzerine, yapay sinir ağının öğrendiği bir düzeltme biniyor.
  Eğitim yılın ilk çeyrekleriyle yapıldı, test ise modele hiç gösterilmeyen son çeyrekle. <span class="note">train_demand_model.py</span></p>
  ${ml ? `
  <div class="grid g3">
    <div class="card"><h3>Eğitim eğrisi</h3><div style="height:230px"><canvas id="cLoss"></canvas></div></div>
    <div class="card"><h3>Son çeyrek testi: ortalama hata</h3><div style="height:230px"><canvas id="cMae"></canvas></div></div>
    <div class="card"><h3>Son çeyrek: gerçek ve tahmin</h3><div style="height:230px"><canvas id="cSca"></canvas></div></div>
  </div>
  <div class="grid g21">
    <div class="callout" style="margin:0"><span class="tag">Dürüst Bulgu</span>
      <p>${mlBulgu(ml)} Yalnızca dört çeyreklik veriyle ağ, klasik yöntemleri geçemiyor. Talep yaz çeyreğinde zirve yapıp
      düştüğü için trendi ezberleyen her model yanılıyor. Mevsimi öğrenmek için sekiz çeyrekten fazla veri gerekir.
      Modelin asıl avantajı, AMOS olay kayıtları bağlandığında ortaya çıkacak. Bu yüzden mimaride yeri hazır ama karar yetkisi yok.
      İkinci fazda öneri modunda çalışır, doğruluk eşiği geçilmeden otomasyona alınmaz.</p></div>
    <div class="card"><h3>Model künyesi</h3>
      <div class="ladder" style="margin-top:8px">
        <div class="step"><span class="no">λ</span><span class="nm">İstatistiksel taban, üzerine ağın öğrendiği düzeltme<small>ağ, tabanı en fazla 1,65 kat oynatabilir</small></span></div>
        <div class="step"><span class="no">⚙</span><span class="nm">Sinir ağı 128-64-32, 54 özellik, 10.000 örnek<small>Poisson kaybı, dropout 0,15</small></span></div>
        <div class="step"><span class="no">×3</span><span class="nm">Üç tohumlu topluluğun ortalaması<small>en iyi ağırlıklar geri yüklenir, sonuç her koşuda aynı</small></span></div>
        <div class="step"><span class="no">!</span><span class="nm">Sınırlar: 4 çeyrek veri, sentetik set, karar yetkisi yok<small>ikinci fazda öneri modunda, eşik geçilmeden otomasyon yok</small></span></div>
      </div></div>
  </div>

  <div class="grid g21">
    <div class="card"><h3>Tahmin gezgini: model bu parça için ne dedi?</h3>
      <div class="ctl" style="margin-bottom:9px">
        <input type="text" id="gzQ" placeholder="PN ara (örn. 101741)…" style="width:150px">
        <select id="gzSel">${Array.from({length:20}, (_, n) =>
          `<option value="${n}">${n + 1}. PN-${PN.id[n]} · ${LK.sub[PN.sub[n]]}</option>`).join('')}</select>
      </div>
      <div class="hint" id="gzInfo"></div>
      <div style="height:215px"><canvas id="cGez"></canvas></div></div>
    <div class="card"><h3>Hata analizi: ağ nerede iyi, nerede zayıf?</h3>
      <div class="ctl" style="margin-bottom:9px">
        <span class="chip sg on" data-s="kesiklilik">Kesiklilik</span>
        <span class="chip sg" data-s="kritiklik">Kritiklik</span>
        <span class="chip sg" data-s="hacim">Hacim</span>
      </div>
      <div class="hint" id="sgOzet"></div>
      <div style="height:205px"><canvas id="cSeg"></canvas></div></div>
  </div>` : `
  <div class="callout amber"><span class="tag">Model çıktısı yok</span><p>model_results.json bulunamadı.
  <span class="mono">uv run train_demand_model.py</span> çalıştırın.</p></div>`}

  <div class="grid g21">
    <div class="card"><h3>Cold-start demosu: geçmişi olmayan parçayı tahmin etmek</h3>
      <div class="hint">Örnek olarak <b class="mono" style="color:${C.teal}">PN-${DATA.coldstart.pn}</b> parçasını alalım, ${DATA.coldstart.sub} kategorisinden.
      Bu parçanın geçmişi yok, o yüzden ilk tahmini benzerlerinden alıyoruz. <b>${DATA.coldstart.grup_ad}</b> ailesindeki
      ${fmt(DATA.coldstart.grup_n)} benzer parçanın ortalaması <b>${String(DATA.coldstart.prior).replace('.',',')} adet</b>.
      Gerçek değer ise ${String(DATA.coldstart.gercek).replace('.',',')}, yani başlangıç tahmini sapıyor. Kaydırıcıyı oynatıp gözlem geldikçe tahminin nasıl düzeldiğini görün.</div>
      <div class="sl" style="max-width:430px"><label>Gelen gözlem <b id="csLbl">0 çeyrek, yalnız başlangıç tahmini</b></label>
        <input type="range" id="csN" min="0" max="4" step="1" value="0"></div>
      <div style="height:190px"><canvas id="cCold"></canvas></div>
      <div class="hint" style="margin-top:7px">Yöntem basit: benzerlerinden başla, gözlem geldikçe düzelt. 2033 talebinin
      yaklaşık %65'i geçmişi olmayan parçalarda olduğu için bu bir kenar durum değil, ana senaryo.</div></div>
    <div class="callout amber" style="margin:0"><span class="tag">Vizyon: Rutin Dışı Bakım Entegrasyonu</span>
      <p>Bir uçak plansız yere indiğinde, aynı zaman aralığındaki <strong>planlı söküm ve bakımlar öne çekilebilir</strong>.
      Böylece parça talepleri tek bir pencerede toplanır ve uçak ikinci kez yere indirilmez. Kontrol Kulesi bunu görebilir,
      çünkü hem arıza talebini hem bakım planını aynı veri modelinde tutar. Kazanç doğrudan ana ölçüte yansır:
      <strong>yerde bekleyen uçak oranı düşer</strong>. Bu, basılı case'te belirtilen bakım planı entegrasyon eksikliğinin de cevabı.</p></div>
  </div>`;

  const ceyD = DATA.ceyrek;
  new Chart($('cCey'), {data:{labels:ceyD.ad,datasets:[
    {type:'bar',label:'THY talep',data:ceyD.thy,backgroundColor:'rgba(91,143,214,.8)',stack:'t',borderRadius:3},
    {type:'bar',label:'Pool talep',data:ceyD.pool,backgroundColor:'rgba(79,193,176,.75)',stack:'t',borderRadius:3},
    {type:'line',label:'Scrap',data:ceyD.scrap,borderColor:C.red,backgroundColor:C.red,yAxisID:'y1',tension:.3,pointRadius:3}]},
    options:{maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true},
      y1:{position:'right',grid:{drawOnChartArea:false},beginAtZero:true}}}});

  new Chart($('cBant'), {data:{labels:['2025','2033'],datasets:[
    {type:'bar',label:'Gerçekleşen',data:[K.talep25,null],backgroundColor:'rgba(91,143,214,.8)',barPercentage:.5,borderRadius:4},
    {type:'bar',label:'Bant (segment ↔ model bazlı)',data:[null,[B.alt,B.ust]],backgroundColor:'rgba(232,163,61,.55)',borderColor:C.amber,borderWidth:1.5,barPercentage:.5,borderRadius:4},
    {type:'line',label:'PN motoru',data:[K.talep25,B.motor],borderColor:C.teal,borderDash:[6,4],pointBackgroundColor:C.teal,pointRadius:4}]},
    options:{maintainAspectRatio:false,scales:{y:{ticks:{callback:v=>fmt(v)}}},
      plugins:{tooltip:{callbacks:{label:c=>Array.isArray(c.raw)?` bant: ${fmt(c.raw[0])} – ${fmt(c.raw[1])}`:` ${c.dataset.label}: ${fmt(c.parsed.y)}`}}}}});

  const md = DATA.model; const g = {y:[0,0], k:[0,0], o:[0,0]};
  md.ad.forEach((m,i) => { const t = md.yeni[i] ? g.y : md.kucul[i] ? g.k : g.o; t[0]+=md.t25[i]; t[1]+=md.t33[i]; });
  new Chart($('cGoc'), {type:'bar',data:{labels:['2025','2033 (model-bazlı)'],datasets:[
    {label:'Yeni nesil (5 model)',data:g.y,backgroundColor:C.teal,stack:'s',borderRadius:3},
    {label:'Diğer',data:g.o,backgroundColor:'rgba(91,143,214,.6)',stack:'s',borderRadius:3},
    {label:'Küçülen 4 klasik',data:g.k,backgroundColor:'rgba(119,134,156,.55)',stack:'s',borderRadius:3}]},
    options:{maintainAspectRatio:false,scales:{x:{stacked:true},y:{stacked:true,ticks:{callback:v=>fmt(v)}}}}});

  const kat = DATA.kat, ki = kat.ad.map((_,i)=>i).sort((a,b)=>kat.buyume[b]-kat.buyume[a]);
  new Chart($('cKat'), {type:'bar',data:{labels:ki.map(i=>kat.ad[i]),
    datasets:[{label:'2033 talep büyümesi %',data:ki.map(i=>kat.buyume[i]),
      backgroundColor:ki.map(i=>kat.buyume[i]>=80?C.red:kat.buyume[i]>=65?C.amber:'rgba(91,143,214,.75)'),borderRadius:3}]},
    options:{maintainAspectRatio:false,indexAxis:'y',
      scales:{x:{ticks:{callback:v=>'+%'+v}},y:{ticks:{font:{size:9.5},autoSkip:false}}},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` +%${f1(c.parsed.x)}`}}}}});

  if(ml){
    new Chart($('cLoss'), {type:'line',data:{labels:ml.history.epoch,datasets:[
      {label:'Eğitim',data:ml.history.train,borderColor:C.blue,pointRadius:0,borderWidth:2},
      {label:'Test (Q4)',data:ml.history.test,borderColor:C.amber,pointRadius:0,borderWidth:2}]},
      options:{maintainAspectRatio:false,scales:{x:{title:{display:true,text:'epoch'},ticks:{maxTicksLimit:8}}}}});
    const names = Object.keys(ml.metrics), maes = names.map(n => ml.metrics[n].mae);
    const best = maes.indexOf(Math.min(...maes));
    new Chart($('cMae'), {type:'bar',data:{labels:names.map(n=>n.replace(' (MLP-Poisson)','').replace(' (son çeyrek)','')),
      datasets:[{label:'MAE',data:maes,borderRadius:4,
        backgroundColor:names.map((n,i)=>i===best?C.teal:n.includes('öğrenme')?C.violet:'rgba(119,134,156,.6)')}]},
      options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
    const mxs = Math.max(...ml.scatter.y, ...ml.scatter.p);
    new Chart($('cSca'), {data:{datasets:[
      {type:'scatter',label:'PN',data:ml.scatter.y.map((y,i)=>({x:y,y:ml.scatter.p[i]})),backgroundColor:'rgba(79,193,176,.45)',pointRadius:2.5},
      {type:'line',label:'y = x',data:[{x:0,y:0},{x:mxs,y:mxs}],borderColor:C.dim,borderDash:[5,5],pointRadius:0,borderWidth:1}]},
      options:{maintainAspectRatio:false,scales:{x:{title:{display:true,text:'gerçek'}},y:{title:{display:true,text:'tahmin'}}},
        plugins:{legend:{display:false}}}});
  }

  /* ---- ABC × XYZ matrisi ---- */
  const ax = DATA.abcxyz, pmax = Math.max(...ax.pay.flat(), 1);
  $('tAbc').innerHTML =
    `<tr><th>Hacim ↓ / Düzenlilik →</th>${ax.xyz.map((x,j) =>
      `<th title="${ax.yontem[j]}">${x}</th>`).join('')}</tr>` +
    ax.abc.map((a,i) => `<tr><td class="lbl">${a}<small>${['talebin ilk %80\'i','%80–95','kalan %5'][i]}</small></td>` +
      ax.xyz.map((x,j) => `<td style="background:${lerpColor(ax.pay[i][j]/pmax)}"
        title="${a}${x}: ${fmt(ax.sayi[i][j])} parça, talep payı %${f1(ax.pay[i][j])}. ${ax.yontem[j]}">${fmt(ax.sayi[i][j])}<br>
        <small style="font-weight:400;opacity:.8">%${f1(ax.pay[i][j])}</small></td>`).join('') + '</tr>').join('');

  /* ---- hurda kategori kırılımı ---- */
  const kt = DATA.kat, si = kt.ad.map((_,i)=>i).sort((a,b)=>kt.sbutce[b]-kt.sbutce[a]).slice(0,8);
  new Chart($('cScrapKat'), {type:'bar',data:{labels:si.map(i=>kt.ad[i]),datasets:[
    {label:'2025 ($M/yıl)',data:si.map(i=>kt.sbutce[i]),backgroundColor:'rgba(232,163,61,.8)',borderRadius:3},
    {label:'2033 tahmini ($M/yıl)',data:si.map(i=>kt.sbutce33[i]),backgroundColor:'rgba(232,163,61,.3)',borderColor:C.amber,borderWidth:1,borderRadius:3}]},
    options:{maintainAspectRatio:false,indexAxis:'y',
      scales:{x:{ticks:{callback:v=>'$'+v+'M'}},y:{ticks:{font:{size:9.5},autoSkip:false}}},
      plugins:{tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${mM(c.parsed.x)}`}}}}});

  /* ---- geriye dönük test ---- */
  const bt = DATA.backtest;
  new Chart($('cBt'), {type:'bar', data:{labels:bt.ad, datasets:[
    {label:'Toplam düzeyde hata (%)', data:bt.toplam_hata,
     backgroundColor:bt.toplam_hata.map((v,i)=>i===3?'rgba(79,193,176,.85)':'rgba(119,134,156,.6)'), borderRadius:4},
    {label:'PN düzeyinde MAE (adet)', yAxisID:'y1', type:'line', data:bt.mae,
     borderColor:C.amber, backgroundColor:C.amber, pointRadius:4}]},
    options:{maintainAspectRatio:false,
      plugins:{legend:{labels:{boxWidth:9,font:{size:10}}},
        tooltip:{callbacks:{label:c=>c.datasetIndex===0?` toplam hata: %${String(c.parsed.y).replace('.',',')}`:` PN MAE: ${String(c.parsed.y).replace('.',',')}`}}},
      scales:{x:{ticks:{font:{size:9}}},
              y:{beginAtZero:true, title:{display:true,text:'toplam hata %'}, ticks:{callback:v=>'%'+v}},
              y1:{position:'right', beginAtZero:true, grid:{drawOnChartArea:false}, title:{display:true,text:'PN MAE'}}}}});

  /* ---- phase-out planlayıcısı ---- */
  const pmIdx = md.ad.map((_,i)=>i).filter(i=>md.kucul[i]);
  new Chart($('cPhase'), {data:{labels:pmIdx.map(i=>md.ad[i]),datasets:[
    {type:'bar',label:'Bağlı stok değeri ($M)',data:pmIdx.map(i=>md.deger[i]),backgroundColor:'rgba(155,140,232,.7)',borderRadius:4},
    {type:'line',label:'Talep değişimi 2025→2033 (%)',yAxisID:'y1',data:pmIdx.map(i=>Math.round(100*(md.t33[i]/md.t25[i]-1))),
     borderColor:C.red,backgroundColor:C.red,pointRadius:4}]},
    options:{maintainAspectRatio:false,
      plugins:{tooltip:{callbacks:{afterLabel:c=>{const i=pmIdx[c.dataIndex];
        return `Uçak ${md.u25[i]} → ${md.u33[i]}  (THY ${md.thy25[i]}→${md.thy33[i]} · Pool ${md.pool25[i]}→${md.pool33[i]})`;}}}},
      scales:{y:{ticks:{callback:v=>'$'+v+'M'}},y1:{position:'right',grid:{drawOnChartArea:false},ticks:{callback:v=>v+'%'}}}}});

  /* ---- tahmin gezgini ---- */
  function sbaJS(x){
    const a = PRM.sba_alpha;
    const nz = x.map((v,i)=>[v,i]).filter(p=>p[0]>0);
    if(!nz.length) return 0;
    if(nz.length === x.length) return x.reduce((s,v)=>s+v,0)/x.length;
    let z = nz[0][0], p = nz[0][1]+1;
    for(let k=1;k<nz.length;k++){ z += a*(nz[k][0]-z); p += a*(nz[k][1]-nz[k-1][1]-p); }
    return (1-a/2)*z/p;
  }
  let gezChart = null;
  function gezDraw(i){
    const qv = [PN.q1[i],PN.q2[i],PN.q3[i],PN.q4[i]];
    const tq = [PN.tq1[i],PN.tq2[i],PN.tq3[i],PN.tq4[i]];
    const pq = qv.map((v,n)=>v-tq[n]);
    const sba = sbaJS(qv.slice(0,3)), ma = (qv[0]+qv[1]+qv[2])/3, nn = PN.nn4[i];
    $('gzInfo').innerHTML = `<b class="mono" style="color:${C.teal}">PN-${PN.id[i]}</b> · ${LK.sub[PN.sub[i]]}
      (ATA ${LK.ata[PN.sub[i]]}) · ${LK.mdl[PN.mdl[i]]} · ${LK.kr[PN.kr[i]]} · risk ${f1(PN.risk[i])}.
      Q4 gerçek <b>${fmt(qv[3])}</b> · ağ ${nn==null?'—':String(nn).replace('.',',')} · SBA ${f1(sba)} · 3Ç ort. ${f1(ma)}`;
    const cfg = {data:{labels:['Q1','Q2','Q3','Q4'],datasets:[
      {type:'bar',label:'THY talebi',data:tq,backgroundColor:'rgba(91,143,214,.8)',stack:'q',borderRadius:3},
      {type:'bar',label:'Pool talebi',data:pq,backgroundColor:'rgba(79,193,176,.65)',stack:'q',borderRadius:3},
      {type:'line',label:'Sinir ağı (Q4 tahmini)',data:[null,null,null,nn],borderColor:C.violet,backgroundColor:C.violet,pointRadius:7,pointStyle:'rectRot'},
      {type:'line',label:'SBA (Q4 tahmini)',data:[null,null,null,sba],borderColor:C.teal,backgroundColor:C.teal,pointRadius:7,pointStyle:'triangle'},
      {type:'line',label:'3Ç ortalaması',data:[null,null,null,ma],borderColor:C.dim,backgroundColor:C.dim,pointRadius:6}]},
      options:{maintainAspectRatio:false,
        scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,ticks:{precision:0}}},
        plugins:{legend:{labels:{boxWidth:9,font:{size:10}}}}}};
    if(gezChart){ gezChart.destroy(); }
    gezChart = new Chart($('cGez'), cfg);
  }
  if(ml){
    $('gzSel').addEventListener('change', e => gezDraw(+e.target.value));
    $('gzQ').addEventListener('input', e => {
      const id = foldTr(e.target.value.trim()).replace(/^pn-?/,'');
      if(PIDX[id] != null) gezDraw(PIDX[id]);
    });
    gezDraw(0);
  }

  /* ---- hata analizi ---- */
  let segChart = null;
  function segDraw(key){
    document.querySelectorAll('#v-ongoru .sg').forEach(c=>c.classList.toggle('on',c.dataset.s===key));
    const sgd = DATA.mlSeg[key];
    const enYakin = sgd.ad.map((_,i)=>i).reduce((a,b)=>(sgd.nn[a]/sgd.sba[a] <= sgd.nn[b]/sgd.sba[b] ? a : b));
    $('sgOzet').innerHTML = `MAE (küçük iyi) · grup büyüklükleri parantez içinde. Ağın klasiklere en yaklaştığı grup:
      <b>${sgd.ad[enYakin]}</b> (fark ${pct(100*(sgd.nn[enYakin]/sgd.sba[enYakin]-1))}).`;
    const cfg = {type:'bar',data:{labels:sgd.ad.map((a,i)=>`${a} (${fmt(sgd.n[i])})`),datasets:[
      {label:'Sinir ağı',data:sgd.nn,backgroundColor:'rgba(155,140,232,.8)',borderRadius:3},
      {label:'SBA',data:sgd.sba,backgroundColor:'rgba(79,193,176,.8)',borderRadius:3},
      {label:'3Ç ortalaması',data:sgd.ma3,backgroundColor:'rgba(91,143,214,.6)',borderRadius:3}]},
      options:{maintainAspectRatio:false,scales:{y:{beginAtZero:true}},
        plugins:{legend:{labels:{boxWidth:9,font:{size:10}}}}}};
    if(segChart){ segChart.destroy(); }
    segChart = new Chart($('cSeg'), cfg);
  }
  if(ml && DATA.mlSeg){
    el.addEventListener('click', e => { const c = e.target.closest('.sg'); if(c) segDraw(c.dataset.s); });
    segDraw('kesiklilik');
  }

  /* ---- cold-start canlı demosu ---- */
  const cs = DATA.coldstart, K0 = 1;                       // öncül ağırlığı ≈ 1 çeyreklik gözlem
  const post = n => (K0*cs.prior + cs.q.slice(0,n).reduce((a,b)=>a+b,0)) / (K0 + n);
  const csLabels = ['Öncül','+Q1','+Q2','+Q3','+Q4'];
  let csChart = null;
  function csDraw(n){
    $('csLbl').textContent = n === 0 ? '0 çeyrek, yalnız başlangıç tahmini'
      : `${n} çeyrek gözlem: ${cs.q.slice(0,n).join(', ')}`;
    const vals = csLabels.map((_,i)=>+(post(i).toFixed(2)));
    const cfg = {data:{labels:csLabels,datasets:[
      {type:'line',label:'Tahmin (adet/çeyrek)',data:vals,borderColor:C.teal,backgroundColor:C.teal,
       pointRadius:csLabels.map((_,i)=>i===n?8:3.5),pointBorderColor:csLabels.map((_,i)=>i===n?'#fff':C.teal),tension:.25},
      {type:'line',label:'Gerçek oran',data:csLabels.map(()=>cs.gercek),borderColor:C.amber,borderDash:[6,4],pointRadius:0}]},
      options:{maintainAspectRatio:false,scales:{y:{beginAtZero:true}},
        plugins:{legend:{labels:{boxWidth:9,font:{size:10}}},
          tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${f1(c.parsed.y)}`}}}}};
    if(csChart){ csChart.destroy(); }
    csChart = new Chart($('cCold'), cfg);
  }
  $('csN').addEventListener('input', e => csDraw(+e.target.value));
  csDraw(0);

  /* scrap anomali → watchlist köprüsü */
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-goto]'); if(!b) return;
    showView(b.dataset.goto);
    if(b.dataset.preset === 'scrapa' && W.ready){ W.reset(); W.flags.add(FL.SCRAPA); W.apply(); }
  });
}
function mlBulgu(ml){
  const m = ml.metrics, names = Object.keys(m);
  const dl = names.find(k=>k.includes('öğrenme'));
  const klasik = names.filter(k=>k!==dl).reduce((a,b)=>m[a].mae<=m[b].mae?a:b);
  const fark = Math.round(100*(m[dl].mae/m[klasik].mae-1));
  return `Son çeyrek testinde sinir ağının ortalama hatası ${String(m[dl].mae).replace('.',',')}, en iyi klasik yöntemin
    %${fark} gerisinde.`;
}

/* =====================================================================
   4 · HARİTA — etkileşimli Türkiye haritası (temsili dağıtım) + risk ısı haritası
   ===================================================================== */
/* Sadeleştirilmiş Türkiye konturu (boylam, enlem) — elle çizilmiş ~66 nokta, dış kıyılar + kara sınırları.
   Marmara, boğazlar ve büyük göller ayrı katman olarak üstüne çizilir. */
const TR_KIYI = [
  [28.03,41.98],[27.30,42.00],[26.62,41.97],[26.33,41.71],[26.36,41.40],[26.04,40.73],
  [26.30,40.60],[26.72,40.55],[26.18,40.03],[26.20,39.98],
  [26.06,39.48],[26.90,39.50],[26.65,39.30],[26.75,38.67],[27.15,38.45],[26.32,38.28],
  [27.25,37.86],[27.40,37.03],[27.35,36.68],[28.10,36.60],[29.10,36.55],[29.65,36.17],
  [30.70,36.85],[31.40,36.75],[32.83,36.01],[33.90,36.28],[34.60,36.75],[35.35,36.55],
  [36.20,36.60],[35.95,36.05],[36.02,35.85],[36.50,36.25],[36.70,36.85],
  [37.10,36.65],[38.00,36.70],[38.95,36.70],[40.05,36.85],[41.20,37.07],[42.20,37.28],
  [42.35,37.11],[42.77,37.15],[43.60,37.23],[44.20,37.27],
  [44.60,37.72],[44.30,38.40],[44.50,39.00],[44.30,39.40],[44.80,39.65],
  [44.60,39.98],[43.65,40.11],[43.72,40.66],[43.47,41.11],[42.85,41.50],[41.53,41.52],
  [40.50,41.03],[39.73,41.00],[37.88,40.98],[36.35,41.30],[36.00,41.72],[35.15,42.03],
  [33.75,41.98],[33.00,41.87],[31.80,41.45],[31.40,41.28],[30.65,41.13],[29.60,41.18],
  [29.12,41.22],[28.60,41.40],[28.10,41.62],[27.97,41.86]];
const TR_MARMARA = [[26.95,40.50],[27.60,40.37],[28.85,40.37],[29.30,40.63],[29.05,40.95],
                    [28.00,41.00],[27.45,40.92],[26.98,40.68]];
const H = {mode:'tr', view:'svc', kr:'all', kat:'all', yil33:false, kriz:false, akis:false, sel:0};
function renderHarita(){
  const el = $('v-harita');
  const HA = DATA.harita;
  const KATS = DATA.kat;
  const VIEWS = {svc:'Kullanılabilir stok (adet)', talep25:'Talep 2025 (adet)', kirmizi:'Kırmızı PN',
                 min33:'Önerilen MIN 2033 (adet)', dis_bagimli:'Dışa bağımlı talep (adet)'};
  const KAT_OK = new Set(['svc', 'talep25', 'kirmizi']);
  const GRUP = {}; HA.grup.kod.forEach((k, i) => GRUP[k] = {ad: HA.grup.ad[i], u25: HA.grup.u25[i], u33: HA.grup.u33[i]});
  const IST_I = HA.kod.indexOf('IST');
  H.sel = IST_I;

  el.innerHTML = `
  <h2 class="sec-h">İstasyon ağı: coğrafi kör noktayı görünür kılmak</h2>
  <p class="sec-p">Basılı case'in 5 satırlık istasyon tablosunu THY ağının bilinen noktalarına dağıttık, toplam
  <b>${HA.kod.filter((_, i) => !HA.yd[i]).length} yurt içi havalimanı ve ${HA.kod.filter((_, i) => HA.yd[i]).length} yurt dışı istasyon</b>.
  Grup toplamları case tablosuyla birebir aynı. Havalimanı bazlı kırılım temsilîdir, bunu her balonda belirtiyoruz.
  Haritayı sürükleyebilir, yakınlaştırabilir ve bir noktaya tıklayabilirsiniz.</p>
  <div class="card">
    <div class="ctl">
      <span class="chip hm on" data-m="tr">🗺 Türkiye</span>
      <span class="chip hm" data-m="gl">🌐 Küresel ağ (İstanbul merkezli)</span>
      <span style="width:10px"></span>
      ${Object.entries(VIEWS).map(([k, v], n) =>
        `<span class="chip mv${n === 0 ? ' on' : ''}" data-v="${k}">${v.replace(/ \(.*/, '')}</span>`).join('')}
    </div>
    <div class="ctl" style="margin-top:-3px">
      <select id="hKr"><option value="all">Tüm kritiklik</option>${HA.kritiklik.map((k, i) => `<option value="${i}">${k}</option>`).join('')}</select>
      <select id="hKat"><option value="all">Tüm kategoriler</option>${KATS.ad.map((k, i) => `<option value="${i}">${k}</option>`).join('')}</select>
      <span class="chip tg" data-t="yil33">2025 ↔ 2033</span>
      <span class="chip tg" data-t="kriz">Kriz katmanı</span>
      <span class="chip tg" data-t="akis">Tamir akışı</span>
      <span class="note" style="margin-left:auto" id="hNot">temsilî dağıtım, istasyon verisi veride yok</span>
    </div>
    <div class="grid g21" style="margin:0">
      <div class="tmap" id="hMapWrap">
        <svg id="hSvg" viewBox="0 0 1000 468" preserveAspectRatio="xMidYMid meet"></svg>
        <div class="tzoom"><button id="hZin">+</button><button id="hZout">−</button><button id="hZfit" title="sığdır">⌂</button></div>
        <div class="tbadge" id="hBadge">TEMSİLİ DAĞITIM · sadeleştirilmiş kontur</div>
        <div class="ttip" id="hTip"></div>
      </div>
      <div>
        <div class="card flush" style="padding:14px 16px;margin-bottom:11px" id="hDet"></div>
        <div class="tw" style="max-height:236px"><table id="hTbl"><thead><tr>
          <th>Havalimanı</th><th>Grup</th><th class="n">Uçak 25→33</th><th class="n" id="hValHead"></th>
        </tr></thead><tbody></tbody></table></div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:14px">
    <h3>Risk ısı haritası: kategori ve kritikliğe göre</h3>
    <div class="hint">Hücre rengi ortalama riski gösterir, kırmızı hücreler izlemenin çekirdeğidir. Kategoriler ortalama riske göre sıralı.</div>
    <div style="overflow:auto"><table class="heat" id="hHeat"></table></div>
    <div class="lg"><span><i class="dot" style="background:${lerpColor(0)}"></i>düşük</span>
      <span><i class="dot" style="background:${lerpColor(.5)}"></i>orta</span>
      <span><i class="dot" style="background:${lerpColor(1)}"></i>yüksek risk</span></div>
  </div>`;

  /* ---- iki projeksiyon: Türkiye (coğrafi) + küresel (İstanbul merkezli azimut) ---- */
  const PX = (lon, lat) => [(lon - 25.4) * 50.5, (42.6 - lat) * 65];
  const path = pts => 'M' + pts.map(p => PX(p[0], p[1]).map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
  const GC = [500, 244], GR = 200, DMAX = Math.max(...HA.dist) * 1.05;
  const GXY = i => { const rr = HA.dist[i] / DMAX * GR, b = HA.yon[i] * Math.PI / 180;
    return [GC[0] + rr * Math.sin(b), GC[1] - rr * Math.cos(b)]; };
  const pos = i => H.mode === 'tr' ? PX(HA.lon[i], HA.lat[i]) : GXY(i);
  const visible = () => HA.kod.map((_, i) => i).filter(i => H.mode === 'tr' ? !HA.yd[i] : (HA.yd[i] || i === IST_I));

  const svg = $('hSvg');
  const ringler = [2000, 4000, 6000, 8000].map(km => { const rr = km / DMAX * GR;
    return `<circle cx="${GC[0]}" cy="${GC[1]}" r="${rr.toFixed(0)}" fill="none" stroke="#26345070" stroke-width="1"/>
      <text x="${GC[0] + 4}" y="${(GC[1] - rr - 4).toFixed(0)}" font-size="8.5" fill="#77869C"
        font-family="'JetBrains Mono',monospace">${fmt(km)} km</text>`; }).join('');
  svg.innerHTML = `
    <defs><marker id="tArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0.5 L7.5,4 L0,7.5 Z" fill="rgba(232,163,61,.75)"/></marker></defs>
    <g id="hWorld">
      <g id="hZeminTR">
        <path class="tland" d="${path(TR_KIYI)}"/>
        <path class="tsea" d="${path(TR_MARMARA)}"/>
        <line class="tstrait" x1="${PX(29.05,40.98)[0]}" y1="${PX(29.05,40.98)[1]}" x2="${PX(29.12,41.21)[0]}" y2="${PX(29.12,41.21)[1]}" stroke-width="3.5"/>
        <line class="tstrait" x1="${PX(26.25,40.03)[0]}" y1="${PX(26.25,40.03)[1]}" x2="${PX(26.93,40.51)[0]}" y2="${PX(26.93,40.51)[1]}" stroke-width="3.5"/>
        <ellipse class="tsea" cx="${PX(42.95,38.62)[0]}" cy="${PX(42.95,38.62)[1]}" rx="${(.55*50.5).toFixed(1)}" ry="${(.30*65).toFixed(1)}"/>
        <ellipse class="tsea" cx="${PX(33.35,38.75)[0]}" cy="${PX(33.35,38.75)[1]}" rx="${(.25*50.5).toFixed(1)}" ry="${(.42*65).toFixed(1)}"/>
      </g>
      <g id="hZeminGL" display="none">${ringler}
        <text x="${GC[0]}" y="26" text-anchor="middle" font-size="10" fill="#77869C"
          font-family="'JetBrains Mono',monospace">İSTANBUL MERKEZLİ AZİMUT GÖRÜNÜMÜ — halkalar büyük daire uzaklığı</text></g>
      <g id="hFlows"></g><g id="hNodes"></g>
    </g>`;
  const world = svg.querySelector('#hWorld');
  const zeminTR = svg.querySelector('#hZeminTR');
  const zeminGL = svg.querySelector('#hZeminGL');
  const flowsG = svg.querySelector('#hFlows');
  const nodesG = svg.querySelector('#hNodes');

  /* ---- kaydırma / yakınlaştırma ---- */
  const Z = {k: 1, tx: 0, ty: 0};
  function applyZoom(){
    world.setAttribute('transform', `translate(${Z.tx},${Z.ty}) scale(${Z.k})`);
    nodesG.querySelectorAll('.tnode').forEach(n => {
      const [x, y] = n.dataset.p.split(',');
      n.setAttribute('transform', `translate(${x},${y}) scale(${(1 / Z.k).toFixed(3)})`);
    });
  }
  function zoomAt(f, cx, cy){
    const k2 = Math.min(7, Math.max(1, Z.k * f)); f = k2 / Z.k;
    Z.tx = cx - (cx - Z.tx) * f; Z.ty = cy - (cy - Z.ty) * f; Z.k = k2;
    if(Z.k === 1){ Z.tx = 0; Z.ty = 0; }
    applyZoom();
  }
  const wrap = $('hMapWrap');
  const svgXY = e => { const r = wrap.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * 1000, (e.clientY - r.top) / r.height * 468]; };
  wrap.addEventListener('wheel', e => { e.preventDefault();
    const [cx, cy] = svgXY(e); zoomAt(e.deltaY < 0 ? 1.2 : 1/1.2, cx, cy); }, {passive: false});
  let drag = null;
  wrap.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, Z.tx, Z.ty]; });
  document.addEventListener('pointermove', e => { if(!drag) return;
    const r = wrap.getBoundingClientRect();
    Z.tx = drag[2] + (e.clientX - drag[0]) / r.width * 1000;
    Z.ty = drag[3] + (e.clientY - drag[1]) / r.height * 468; applyZoom(); });
  document.addEventListener('pointerup', () => drag = null);
  $('hZin').addEventListener('click', () => zoomAt(1.35, 500, 234));
  $('hZout').addEventListener('click', () => zoomAt(1/1.35, 500, 234));
  $('hZfit').addEventListener('click', () => { Z.k = 1; Z.tx = 0; Z.ty = 0; applyZoom(); });

  /* ---- değer: görünüm × kritiklik × kategori × kriz × havalimanı payı ---- */
  function krizFaktor(){
    if(!H.kriz) return 1;
    const r = senaryoHesap(SC);
    return r.kir / Math.max(1, K.kirmizi);
  }
  const pay = i => H.view === 'min33' ? HA.pay33[i] : HA.pay25[i];
  const krToplam = view => H.kr === 'all'
    ? HA.krTot[view].reduce((a, b) => a + b, 0) : HA.krTot[view][+H.kr];
  function val(i){
    if(H.kat !== 'all'){
      const ki = +H.kat;
      const base = {svc: KATS.svc[ki], talep25: KATS.t25[ki], kirmizi: KATS.kirmizi[ki]}[H.view] || 0;
      return base * HA.pay25[i] * (H.view === 'kirmizi' ? krizFaktor() : 1);
    }
    return krToplam(H.view) * pay(i) * (H.view === 'kirmizi' ? krizFaktor() : 1);
  }
  const topSum = view => HA.krTot[view].reduce((a, b) => a + b, 0);

  /* ---- çizim ---- */
  const tip = $('hTip');
  function tipHtml(i){
    return `<b>${HA.kod[i]} · ${HA.ad[i]}</b><br>
      ${GRUP[HA.grp[i]].ad} grubu · uçak ${HA.u25[i]} → ${HA.u33[i]} (+${pct(HA.buyume[i], 0)})<br>
      Kullanılabilir stok: <span class="tt-v">${fmt(topSum('svc') * HA.pay25[i])}</span> adet<br>
      Kırmızı PN${H.kriz ? ' (senaryo)' : ''}: <span class="tt-v">${f1(topSum('kirmizi') * HA.pay25[i] * krizFaktor())}</span> ·
      Talep: <span class="tt-v">${fmt(topSum('talep25') * HA.pay25[i])}</span>/yıl<br>
      ${HA.yd[i] ? `İstanbul'a ${fmt(HA.dist[i])} km · ` : ''}<i style="color:#77869C">temsilî, uçak payıyla orantılı</i>`;
  }
  function draw(){
    document.querySelectorAll('#v-harita .hm').forEach(ch => ch.classList.toggle('on', ch.dataset.m === H.mode));
    document.querySelectorAll('#v-harita .mv').forEach(ch => {
      ch.classList.toggle('on', ch.dataset.v === H.view);
      ch.classList.toggle('dis', H.kat !== 'all' && !KAT_OK.has(ch.dataset.v));
    });
    document.querySelectorAll('#v-harita .tg').forEach(ch => ch.classList.toggle('on', H[ch.dataset.t]));
    $('hKr').disabled = H.kat !== 'all';
    $('hValHead').textContent = VIEWS[H.view];
    zeminTR.setAttribute('display', H.mode === 'tr' ? 'inline' : 'none');
    zeminGL.setAttribute('display', H.mode === 'gl' ? 'inline' : 'none');
    $('hBadge').textContent = H.mode === 'tr'
      ? 'TEMSİLİ DAĞITIM · sadeleştirilmiş kontur' : 'TEMSİLİ DAĞITIM · azimut ağ görünümü';
    $('hNot').textContent = H.kriz
      ? (SC.preset === 'baz' ? 'kriz katmanı: normal durum, Senaryo sekmesinden bir kriz seçebilirsiniz'
                             : `kriz katmanı: ${PRESETS[SC.preset] ? PRESETS[SC.preset].ad : 'özel senaryo'}, ${f1(krizFaktor())} kat`)
      : "temsilî dağıtım, istasyon verisi veride yok";

    const vis = visible();
    if(!vis.includes(H.sel)) H.sel = H.mode === 'tr' ? IST_I : vis[0];
    const vals = {}, vmax = Math.max(...vis.map(i => { vals[i] = val(i); return vals[i]; }), 1e-6);
    const sMax = Math.max(...vis.map(i => H.yil33 ? HA.u33[i] : HA.u25[i]));

    nodesG.innerHTML = vis.map(i => {
      const [x, y] = pos(i);
      const rr = 7.5 + 19 * Math.sqrt(vals[i] / vmax);
      const cls = (H.kriz ? 'kriz' : HA.buyume[i] >= 70 ? 'hot' : '');
      return `<g class="tnode ${cls}${H.sel === i ? ' sel' : ''}" data-s="${i}" data-p="${x.toFixed(1)},${y.toFixed(1)}"
        transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
        <circle r="${(rr + 7).toFixed(1)}" fill="transparent"></circle>
        <circle class="c" r="${rr.toFixed(1)}"></circle>
        ${H.yil33 ? `<circle class="ring" r="${(rr * Math.sqrt(HA.u25[i] / Math.max(1, HA.u33[i]))).toFixed(1)}"></circle>` : ''}
        <text y="${rr >= 12 ? -1.5 : 3}" font-size="${rr >= 12 ? 9.5 : 8}">${HA.kod[i]}</text>
        ${rr >= 12 ? `<text class="v" y="10" font-size="8">${fmt(vals[i])}</text>` : ''}
        ${H.yil33 ? `<text class="v" y="${(rr + 11).toFixed(0)}" font-size="8" fill="#E8A33D">+${pct(HA.buyume[i], 0)}</text>` : ''}
      </g>`;
    }).join('');
    applyZoom();

    if(!H.akis){ flowsG.innerHTML = ''; }
    else if(H.mode === 'tr'){
      const [xi, yi] = pos(IST_I);
      const wMax = Math.max(...vis.filter(i => i !== IST_I).map(i => HA.pay25[i]));
      flowsG.innerHTML = vis.filter(i => i !== IST_I).map(i => {
        const [x1, y1] = pos(i);
        const w = 1 + 4.5 * (HA.pay25[i] / wMax);
        const mx = (x1 + xi) / 2, my = Math.min(y1, yi) - 34;
        return `<path class="tflow" stroke-width="${w.toFixed(1)}" d="M${x1.toFixed(0)},${y1.toFixed(0)} Q${mx.toFixed(0)},${my.toFixed(0)} ${xi.toFixed(0)},${yi.toFixed(0)}"/>`;
      }).join('') + `<text x="500" y="452" text-anchor="middle" font-size="9" fill="#77869C"
        font-family="'JetBrains Mono',monospace">istasyonlar → İstanbul iç tamir atölyeleri (döngüde ${fmt(HA.ic_tamir_toplam)} adet) — temsili akış</text>`;
    } else {
      const hublar = vis.filter(i => i !== IST_I);
      const wMax = Math.max(...hublar.map(i => HA.pay25[i]));
      flowsG.innerHTML = hublar.map(i => {
        const [x2, y2] = pos(i);
        const w = 1 + 4.5 * (HA.pay25[i] / wMax);
        const mx = (GC[0] + x2) / 2 + (y2 - GC[1]) * .12, my = (GC[1] + y2) / 2 - (x2 - GC[0]) * .12;
        return `<path class="tflow dis" stroke-width="${w.toFixed(1)}" d="M${GC[0]},${GC[1]} Q${mx.toFixed(0)},${my.toFixed(0)} ${x2.toFixed(0)},${y2.toFixed(0)}"/>`;
      }).join('') + `<text x="500" y="452" text-anchor="middle" font-size="9" fill="#77869C"
        font-family="'JetBrains Mono',monospace">İstanbul → dış tamir istasyonları (döngüde ${fmt(HA.dis_tamir_toplam)} adet) — temsili akış</text>`;
    }

    const s = H.sel, g = GRUP[HA.grp[s]];
    $('hDet').innerHTML = `
      <h3 style="font-size:.9rem"><b class="mono" style="color:${C.teal}">${HA.kod[s]}</b> · ${HA.ad[s]}</h3>
      <div class="hint" style="margin:7px 0 0">
      Uçak ${HA.u25[s]} → ${HA.u33[s]}, <b style="color:${HA.buyume[s] >= 70 ? C.amber : C.teal}">+${pct(HA.buyume[s], 0)}</b>.
      Kullanılabilir stok ${fmt(topSum('svc') * HA.pay25[s])} adet,
      kırmızı ${f1(topSum('kirmizi') * HA.pay25[s] * krizFaktor())} parça${H.kriz ? ' (senaryo)' : ''},
      yıllık talep ${fmt(topSum('talep25') * HA.pay25[s])}, önerilen 2033 MIN değeri ${fmt(topSum('min33') * HA.pay33[s])} adet.<br>
      <i>Case tablosunda "${g.ad}" grubu ${g.u25}→${g.u33} uçak. Bu nokta grubun
      ${pct(100 * HA.u25[s] / g.u25, 0)} payıyla temsil ediliyor. Gerçek üründe bu sayılar istasyon etiketli kayıtlardan gelir.</i></div>`;

    $('hTbl').querySelector('tbody').innerHTML = vis.map(i => `
      <tr data-s="${i}" style="cursor:pointer"><td><b class="mono" style="color:${C.teal}">${HA.kod[i]}</b>
        <span style="color:${C.dim}">${HA.ad[i]}</span></td>
      <td><span class="bg ${HA.yd[i] ? 'bg-nk' : 'bg-teal'}">${HA.grp[i]}</span></td>
      <td class="n">${HA.u25[i]} → ${HA.u33[i]} <span style="color:${HA.buyume[i] >= 70 ? C.amber : C.dim}">+${pct(HA.buyume[i], 0)}</span></td>
      <td class="n">${H.view === 'kirmizi' ? f1(vals[i]) : fmt(vals[i])}</td></tr>`).join('');
  }

  /* ---- etkileşim ---- */
  el.addEventListener('click', e => {
    const hm = e.target.closest('.hm');
    if(hm){ H.mode = hm.dataset.m; draw(); return; }
    const mv = e.target.closest('.mv');
    if(mv && !mv.classList.contains('dis')){ H.view = mv.dataset.v; draw(); return; }
    const tg = e.target.closest('.tg');
    if(tg){ H[tg.dataset.t] = !H[tg.dataset.t]; draw(); return; }
    const tr = e.target.closest('tr[data-s]');
    if(tr){ H.sel = +tr.dataset.s; draw(); }
  });
  svg.addEventListener('click', e => {
    const n = e.target.closest('.tnode');
    if(n){ H.sel = +n.dataset.s; draw(); }
  });
  svg.addEventListener('pointermove', e => {
    const n = e.target.closest('.tnode');
    if(!n){ tip.style.display = 'none'; return; }
    const r = wrap.getBoundingClientRect();
    tip.style.display = 'block';
    tip.style.left = Math.min(r.width - 260, e.clientX - r.left + 14) + 'px';
    tip.style.top = Math.max(6, e.clientY - r.top - 10) + 'px';
    tip.innerHTML = tipHtml(+n.dataset.s);
  });
  svg.addEventListener('pointerleave', () => tip.style.display = 'none');
  $('hKr').addEventListener('change', e => { H.kr = e.target.value; draw(); });
  $('hKat').addEventListener('change', e => {
    H.kat = e.target.value;
    if(H.kat !== 'all' && !KAT_OK.has(H.view)) H.view = 'svc';
    draw();
  });
  draw();

  /* ---- ısı haritası ---- */
  const S = LK.sub.length, agg = Array.from({length: S}, () => [[0, 0], [0, 0], [0, 0]]);
  for(let i = 0; i < NPN; i++){ const a = agg[PN.sub[i]][PN.kr[i]]; a[0] += PN.risk[i]; a[1]++; }
  const rows = LK.sub.map((ad, s) => {
    const cells = agg[s].map(([sum, n]) => n ? sum / n : 0);
    return {ad, s, cells, n: agg[s].reduce((a, c2) => a + c2[1], 0),
            avg: agg[s].reduce((a, c2) => a + c2[0], 0) / Math.max(1, agg[s].reduce((a, c2) => a + c2[1], 0))};
  }).sort((a, b) => b.avg - a.avg);
  const cmax = Math.max(...rows.flatMap(r => r.cells));
  $('hHeat').innerHTML = `<tr><th style="min-width:190px">Kategori</th>${HA.kritiklik.map(k => `<th>${k}</th>`).join('')}</tr>` +
    rows.map(r => `<tr><td class="lbl">${r.ad}<small>ATA ${LK.ata[r.s]} · ${r.n} PN</small></td>` +
      r.cells.map((v, ki) => `<td style="background:${lerpColor(v / cmax)}" title="${r.ad} × ${HA.kritiklik[ki]}: ortalama risk ${f1(v)}, ${agg[r.s][ki][1]} parça">${f1(v)}</td>`).join('') + '</tr>').join('');
}

/* =====================================================================
   5 · SENARYO — kriz simülatörü + filo kaydırıcısı
   ===================================================================== */
function senaryoHesap(cfg){
  const mDemG = 1 + cfg.d/100, mTatG = 1 + cfg.l/100;
  let kir=0, kirAog=0, kap=0, acik=0, ek=0;
  const byKr=[0,0,0];
  for(let i=0;i<NPN;i++){
    const dis = PN.ato[i] === 0;
    let mDem = mDemG * (cfg.yeniDem && hasF(i,FL.YENI) ? cfg.yeniDem : 1);
    if(cfg.kuculDem && hasF(i,FL.PO)) mDem *= cfg.kuculDem;
    const mTat = (cfg.disOnly && !dis) ? 1 : mTatG;
    const t = PN.t25[i];
    if(t > 0){
      const lam = t*mDem/365, tts = PN.svc[i]/lam, ttr = PN.ttr[i]*mTat;
      if(tts < ttr + PRM.alarm_tamponu){ kir++; byKr[PN.kr[i]]++; if(PN.kr[i]===0) kirAog++; kap += (ttr-tts)*lam*PN.clp[i]; }
    }
    const mu = PN.rate33[i]*mDem * PN.lead[i]*mTat / PRM.ceyrek_gun;
    const min = poissonMin(mu, Math.min(.995, PN.sh[i] + cfg.s/100));
    if(PN.svc[i] < min){ acik++; ek += (min - PN.svc[i]) * PN.clp[i]; }
  }
  return {kir, kirAog, kap, acik, ek, byKr};
}

const SC = {d:0, l:0, s:0, yeniDem:0, kuculDem:0, disOnly:false, preset:'baz'};
const PRESETS = {
  baz:     {d:0,  l:0,  s:0, yeniDem:0,   kuculDem:0,    disOnly:false, ad:'Baz durum',
            not:'Bugünkü parametreler. Kırmızı liste burada doğrulanır.'},
  motor:   {d:0,  l:30, s:0, yeniDem:1.5, kuculDem:0,    disOnly:true,  ad:'Motor ailesi krizi',
            not:'Yeni nesil talebi 1,5 kat, dış tamir süresi 1,3 kat artıyor. 2033 filosunun %64\'ü beş yeni nesil modelde toplandığı için risk de yoğunlaşıyor.'},
  pandemi: {d:20, l:50, s:0, yeniDem:0,   kuculDem:0,    disOnly:false, ad:'Pandemi tipi şok',
            not:'Talep %20 sıçrıyor, aynı anda tamir istasyonları kapasite kaybediyor ve tedarik süresi 1,5 kat uzuyor.'},
  oem:     {d:0,  l:15, s:0, yeniDem:0,   kuculDem:1.25, disOnly:true,  ad:'OEM teslimat gecikmesi',
            not:'Yeni uçaklar gecikince klasik filo geç emekli oluyor, küçülen 4 modelin talebi 1,25 kat sürüyor. Sinyale bağlı plan kendini yavaşlatır, takvime bağlı plan çökerdi.'},
  lojistik:{d:0,  l:60, s:0, yeniDem:0,   kuculDem:0,    disOnly:true,  ad:'Lojistik krizi',
            not:'Dış tamir ve satın alma kuyrukları %60 uzuyor. Satın alma süresinin 270 güne çıkabildiğini hatırlatır.'},
  patlama: {d:40, l:20, s:10, yeniDem:0,  kuculDem:0,    disOnly:false, ad:'Talep patlaması',
            not:'Genel talep %40 artıyor, hafif tedarik gerginliği var ve servis hedefi sıkılaştırılıyor.'},
};

function renderSenaryo(){
  const el = $('v-senaryo');
  el.innerHTML = `
  <h2 class="sec-h">Kriz ve dayanıklılık simülatörü</h2>
  <p class="sec-p">Her kriz ya talebi artırıp stoğun dayanma süresini kısaltır ya da tedarik süresini uzatır. Uyarı mantığımız
  zaten bu iki değişkene dayandığı için bir krizi denemek, sadece bu değerleri değiştirmek demek. Hesap motoru,
  float formülünün sahada %97 tuttuğu doğrulamaya yaslanıyor.</p>
  <div class="grid g12">
    <div class="card">
      <h3>Şok parametreleri</h3>
      <div class="hint" id="scNot">${PRESETS.baz.not}</div>
      <div class="sl"><label>Talep şoku <b id="lD">+%0</b></label><input type="range" id="sD" min="0" max="80" step="5" value="0"></div>
      <div class="sl"><label>Tedarik / TAT şoku <b id="lL">+%0</b></label><input type="range" id="sL" min="0" max="100" step="5" value="0"></div>
      <div class="sl"><label>Servis hedefi sıkılaştırma <b id="lS">+0 pp</b></label><input type="range" id="sS" min="0" max="20" step="5" value="0"></div>
      <div class="ctl" style="margin:4px 0 0">${Object.entries(PRESETS).map(([k,p]) =>
        `<span class="chip sp${k==='baz'?' on':''}" data-p="${k}">${p.ad}</span>`).join('')}</div>
      <div class="hint" style="margin-top:12px">Senaryolar farklı yerleri vuruyor. Motor ailesi krizi yalnız yeni nesil parçaların talebini,
      lojistik krizi yalnız dışa bağımlı parçaların tedarik süresini, OEM gecikmesi yalnız küçülen klasik modellerin talebini etkiliyor.
      Kur şoku ayrı bir katman: parçalar dolar cinsinden olduğu için piyasa değeri izleniyor ve nakit koruma modunda tamir kararı sıkılaştırılıyor.
      Her çeyrek bir senaryo canlı olarak prova ediliyor.</div>
    </div>
    <div class="card">
      <h3>Etki: 5.000 parça canlı yeniden hesaplanıyor</h3>
      <div class="grid g3" style="margin:12px 0 4px" id="scK"></div>
      <div style="height:210px"><canvas id="cScen"></canvas></div>
    </div>
  </div>

  <div class="grid g12" style="margin-top:14px">
    <div class="card" style="border-color:rgba(79,193,176,.35)">
      <h3 style="color:${C.teal}">Canlı parametreler: jüri modu</h3>
      <div class="hint">Modelin varsayımları sabit değil. "Ağırlık neden 3?" diye sorulursa cevap bu ekran.
      Kaydırıcıyı oynatın, bütün sayılar tarayıcıda anında yeniden hesaplansın.</div>
      <div class="sl"><label>AOG kritik ağırlığı <b id="lW0">3</b></label><input type="range" id="pW0" min="1" max="6" step="0.5" value="3"></div>
      <div class="sl"><label>Kritik ağırlığı <b id="lW1">2</b></label><input type="range" id="pW1" min="1" max="6" step="0.5" value="2"></div>
      <div class="sl"><label>Kritik değil ağırlığı <b id="lW2">1</b></label><input type="range" id="pW2" min="0.5" max="6" step="0.5" value="1"></div>
      <div class="sl"><label>BER eşiği <b id="lBer">0,65</b></label><input type="range" id="pBer" min="0.40" max="0.90" step="0.05" value="0.65"></div>
      <div class="sl"><label>Alarm tamponu <b id="lTam">0 gün</b></label><input type="range" id="pTam" min="0" max="30" step="1" value="0"></div>
      <span class="chip" id="pSifirla">↺ varsayılanlara dön</span>
    </div>
    <div class="card">
      <h3>Parametrelerin canlı etkisi</h3>
      <div class="grid g4" style="margin:11px 0 10px" id="pK"></div>
      <div class="hint" style="margin-bottom:7px">En riskli 10 parça. Ağırlıkları değiştirdiğinizde sıralamanın nasıl kaydığı işaretlenir.</div>
      <div class="tw" style="max-height:265px"><table><thead><tr>
        <th>#</th><th>PN</th><th>Kategori</th><th>Kritiklik</th><th class="n">Skor</th><th></th>
      </tr></thead><tbody id="pTop"></tbody></table></div>
    </div>
  </div>

  <div class="grid g21" style="margin-top:14px">
    <div class="card"><h3>Dayanıklılık: filo kaç gün dayanır?</h3>
      <div class="hint">Her parçanın eldeki stokla kaç gün dayanacağını gösteriyor. Soldaki parçalar bir tedarik şokunda
      ilk düşecek olanlar. Ortalama ${fmt(K.tts_medyan)} gün.</div>
      <div style="height:225px"><canvas id="cTts"></canvas></div></div>
    <div class="card"><h3>Kıtlık sensörü: piyasa değeri / liste fiyatı</h3>
      <div class="hint">İkinci el değerin liste fiyatına oranı, ortalaması <b>${String(DATA.fmvClpHist.medyan).replace('.',',')}</b>.
      Bu oran kalıcı olarak yükselirse ikinci el piyasada kıtlık başlıyor demektir, yani bir erken uyarı işareti.
      Bugün piyasa değeri listeyi aşan tek parça yok.</div>
      <div style="height:150px"><canvas id="cFmv"></canvas></div>
      <div class="grid g2" style="margin-top:10px">
        <div class="kpi red" style="padding:10px 13px"><div class="l">Kırmızı / siparişsiz</div>
          <div class="v" style="font-size:1.2rem">${K.kirmizi} / ${K.siparissiz}</div><div class="d">hedef: siparişsiz = 0</div></div>
        <div class="kpi" style="padding:10px 13px"><div class="l">TTS alt çeyrek</div>
          <div class="v" style="font-size:1.2rem">${fmt(K.tts_q25)} gün</div><div class="d">kokpitte izlenen dayanıklılık metriği</div></div>
      </div></div>
  </div>

  <div class="card" style="margin-top:14px">
    <h3>Filo kaydırıcısı: 2025'ten 2033'e</h3>
    <div class="sl" style="max-width:520px;margin-top:10px"><label>Yıl <b id="lY">2025</b></label>
      <input type="range" id="sY" min="2025" max="2033" step="1" value="2025"></div>
    <div class="grid g4" id="fleetK"></div>
    <div class="hint">Aradaki yıllar doğrusal olarak dolduruluyor. Gerçek teslimat takvimi kurgusal olduğu için bu yalnız yönü gösterir.
    Tamir döngüsü sermayesi, tedarik süreleri sabit varsayımıyla ölçekleniyor. Erken kabiliyet yatırımı bu eğriyi aşağı çeker.</div>
  </div>

  <div class="grid g21" style="margin-top:14px">
    <div class="card"><h3>Monte Carlo doğrulaması: 2033 belirsizliği</h3>
      <div class="hint">${fmt(DATA.mc.trials)} denemenin her birinde talebi, aralık içinden rastgele bir büyüme ve tesadüfi dalgalanmayla üretiyoruz.
      Ölçtüğümüz şey, bugünkü stokla tedarik süresini çıkaramayacak <b>parça sayısı</b>.
      Normal durumda ortalama <b>${fmt(DATA.mc.baz.acik_ort)}</b> parça çıkıyor, denemelerin çoğu ${fmt(DATA.mc.baz.acik_p10)} ile ${fmt(DATA.mc.baz.acik_p90)} arasında.
      Motor krizinde bu sayı <b>${fmt(DATA.mc.motor.acik_ort)}</b> parçaya, ek ihtiyaç ${mM(DATA.mc.motor.ek_ort)}'a çıkıyor.
      Simülasyon, formülle hesapladığımız sonuçla <b style="color:${C.teal}">%${String(DATA.mc.uyum).replace('.',',')}</b> uyumlu. Yani formüllerimiz maket değil.</div>
      <div style="height:200px"><canvas id="cMc"></canvas></div></div>
    <div class="card"><h3>Duyarlılık: 2033 açığını kapatma maliyetini ne oynatır?</h3>
      <div class="hint">Temel maliyet <b>${mM(DATA.tornado.baz)}</b>. Çubuklar her etkenin iki ucunu gösteriyor.
      En büyük etken <b>tedarik süreleri</b>. Bu, "tedarik süresinin her günü sermayedir" cümlesinin sayısal kanıtı.
      Kabiliyet yatırımı çubuğu ise 547 parçayı iç tamire almanın açığı ne kadar küçülttüğünü gösteriyor.</div>
      <div style="height:200px"><canvas id="cTornado"></canvas></div></div>
  </div>

  <div class="card" style="margin-top:14px">
    <h3>Kaynak önceliklendirme: kısıtlı bütçeyle önce ne alınır?</h3>
    <div class="hint">Bir parçaya eklenecek her adet için "harcanan para başına ne kadar risk azalıyor" hesaplanıyor ve
    ${fmt(DATA.opt.toplam_adim)} alım adımının hepsi bu ölçüye göre sıralanıyor. Eğri, sınırlı bir bütçenin nereye kadar gittiğini gösteriyor.
    Tamamı ${mM(DATA.opt.toplam_butce)} ama eğrinin dikliği, <b>ilk birkaç milyon doların kazancın büyük bölümünü sağladığını</b> söylüyor.
    "Önce ne alınmalı?" sorusunun matematiksel cevabı bu.</div>
    <div class="grid g21" style="margin:0">
      <div><div style="height:235px"><canvas id="cOpt"></canvas></div></div>
      <div class="tw" style="max-height:235px"><table><thead><tr>
        <th>#</th><th>PN</th><th>Kategori</th><th>Kritiklik</th><th class="n">Adet</th><th class="n">Maliyet</th><th class="n">Stok-out olasılığı</th>
      </tr></thead><tbody>${DATA.opt.ilk10.map((o2, n) => `<tr>
        <td class="n">${n + 1}</td><td class="pn-link mono">PN-${o2.pn}</td><td>${o2.sub}</td>
        <td>${o2.krit === 'AOG KRİTİK' ? '<span class="bg bg-aog">AOG</span>' : o2.krit === 'KRİTİK' ? '<span class="bg bg-kri">KRİTİK</span>' : '<span class="bg bg-nk">DEĞİL</span>'}</td>
        <td class="n">${fmt(o2.adet)}</td><td class="n">${mUsd(o2.maliyet)}</td>
        <td class="n" style="color:${o2.stokout > 60 ? C.red : C.muted}">%${String(o2.stokout).replace('.',',')}</td></tr>`).join('')}</tbody></table></div>
    </div>
  </div>

  <div class="card" style="margin-top:14px;border-color:rgba(79,193,176,.35)">
    <h3 style="color:${C.teal}">Kapanış: kabiliyet yatırımı bir yazılım ekranı değil, bir yatırım kararı</h3>
    <div class="hint">${K.risk_listesi} parça hem kritik hem de iç tamiri olmayan parçalar. Bugün bunlara yılda <b>${mM(K.kab_bugun)}</b> dış tamir harcanıyor.
    Bu parçaları iç tamire alırsak yılda <b style="color:${C.teal}">${mM(K.kab_tasarruf)} tasarruf ve ${mM(K.kab_sermaye)} tek seferlik serbesti</b> doğuyor.
    Atölye kurulum maliyeti ayarlanabilir bir parametre. Hangi rakamı koyarsanız koyun, yıllık kazanç yatırımı birkaç yılda karşılıyor.
    Aşağıda öncelik sırasına göre ilk 40 aday var. <span class="bg bg-warn">ÜÇLÜ</span> etiketi, hem kritik hem tamiri olmayan hem de geçmişsiz parçaları işaretliyor.</div>
    <div class="tw" style="max-height:420px"><table><thead><tr>
      <th>#</th><th>PN</th><th>Kategori</th><th>Model</th><th class="n">Yıllık talep</th><th class="n">Dış TAT</th>
      <th class="n">Dış harcama /yıl</th><th class="n">Tasarruf /yıl</th><th class="n">Serbesti</th><th></th>
    </tr></thead><tbody>${DATA.roi.id.map((id,n) => `<tr>
      <td class="n">${n+1}</td><td class="pn-link mono">PN-${id}</td><td>${DATA.roi.sub[n]}</td><td>${DATA.roi.mdl[n]}</td>
      <td class="n">${fmt(DATA.roi.t25[n])}</td><td class="n">${fmt(DATA.roi.tdis[n])} g</td>
      <td class="n">${mUsd(DATA.roi.harcama[n])}</td><td class="n" style="color:${C.teal}">${mUsd(DATA.roi.tasarruf[n])}</td>
      <td class="n">${mUsd(DATA.roi.sermaye[n])}</td>
      <td>${DATA.roi.uclu[n] ? '<span class="bg bg-warn">ÜÇLÜ</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
  </div>
  <div class="foot" style="margin-top:14px">Motor: TTS' = SVC/(λ·şok) &lt; TTR·şok → kırmızı · MIN' = ⌈λ'L'⌉ + Poisson emniyet stoğu
  (servis hedefi kritiklikle) · kapatma = Σ eksik gün-talebi × CLP. Formüller core.py ile birebir; baz değerler saha verisiyle doğrulandı.</div>`;

  const BAZ = senaryoHesap({d:0,l:0,s:0,yeniDem:0,disOnly:false});
  let chart = null;

  function stat(l, v, d, cls=''){ return `<div class="kpi ${cls}" style="padding:12px 14px"><div class="l">${l}</div><div class="v" style="font-size:1.3rem">${v}</div><div class="d">${d}</div></div>`; }

  function run(){
    const r = senaryoHesap(SC);
    const dK = r.kir - BAZ.kir, dA = r.acik - BAZ.acik;
    $('scK').innerHTML =
      stat('Kırmızı parça (bugün)', fmt(r.kir), dK ? `baz ${BAZ.kir} · <b style="color:${C.red}">+${fmt(dK)}</b>` : `baz durum, saha ile birebir`, 'red') +
      stat('AOG kritik kırmızı', fmt(r.kirAog), `baz ${BAZ.kirAog}`, r.kirAog > BAZ.kirAog ? 'red' : '') +
      stat('Kapatma maliyeti', mM(r.kap/1e6), `baz ${mM(BAZ.kap/1e6)}`, 'amber') +
      stat('2033 MIN altında PN', fmt(r.acik), dA ? `baz ${fmt(BAZ.acik)} · +${fmt(dA)}` : `önerilen plana göre`) +
      stat('Ek stok yatırımı', mM(r.ek/1e6), '2033 MIN’e tamamlama (CLP)', 'amber') +
      stat('Şok profili', PRESETS[SC.preset] ? PRESETS[SC.preset].ad : 'Özel', `talep +%${SC.d} · TAT +%${SC.l} · hedef +${SC.s}pp`);
    if(chart){ chart.data.datasets[1].data = r.byKr; chart.update(); }
    else chart = new Chart($('cScen'), {type:'bar',
      data:{labels:LK.kr,datasets:[
        {label:'Kırmızı, baz durum',data:BAZ.byKr,backgroundColor:'rgba(119,134,156,.5)',borderRadius:4},
        {label:'Kırmızı, senaryo',data:r.byKr,backgroundColor:'rgba(224,106,106,.8)',borderRadius:4}]},
      options:{maintainAspectRatio:false,animation:{duration:250},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
  }
  function syncUI(){
    $('sD').value = SC.d; $('sL').value = SC.l; $('sS').value = SC.s;
    $('lD').textContent = '+%' + SC.d; $('lL').textContent = '+%' + SC.l; $('lS').textContent = '+' + SC.s + ' pp';
    document.querySelectorAll('#v-senaryo .sp').forEach(c => c.classList.toggle('on', c.dataset.p === SC.preset));
    $('scNot').textContent = PRESETS[SC.preset] ? PRESETS[SC.preset].not : 'Özel senaryo, kaydırıcılarla tanımlandı.';
  }
  ['sD','sL','sS'].forEach((id, n) => $(id).addEventListener('input', e => {
    SC[['d','l','s'][n]] = +e.target.value; SC.preset = 'ozel'; SC.yeniDem = 0; SC.kuculDem = 0; SC.disOnly = false; syncUI(); run();
  }));
  el.addEventListener('click', e => {
    const pl = e.target.closest('.pn-link');
    if(pl){ const id = pl.textContent.replace('PN-','').trim();
      if(PIDX[id] != null){ showView('watch'); if(W.showDetail) W.showDetail(PIDX[id]); } return; }
    const c = e.target.closest('.sp'); if(!c) return;
    const p = PRESETS[c.dataset.p];
    Object.assign(SC, {d:p.d, l:p.l, s:p.s, yeniDem:p.yeniDem, kuculDem:p.kuculDem, disOnly:p.disOnly, preset:c.dataset.p});
    syncUI(); run();
  });

  function fleet(){
    const y = +$('sY').value, f = (y-2025)/8;
    $('lY').textContent = y;
    const ucak = Math.round(1200 + 800*f);
    const ta = K.talep25 + (B.alt - K.talep25)*f, tu = K.talep25 + (B.ust - K.talep25)*f;
    const fl$ = K.float_fmv + (K.float_fmv_33 - K.float_fmv)*f;
    $('fleetK').innerHTML =
      stat('Filo', fmt(ucak) + ' uçak', `THY ${fmt(500+300*f)} · Pool ${fmt(700+500*f)}`) +
      stat('Talep bandı', fmt(ta) + '–' + fmt(tu), y === 2025 ? 'gerçekleşen' : `+%${Math.round(B.alt_pct*f)}–${Math.round(B.ust_pct*f)}`) +
      stat('Float sermayesi', mM(fl$), `TAT sabit varsayımıyla`, fl$ > K.float_fmv*1.3 ? 'amber' : '') +
      stat('Yeni nesil talep payı', pct(33.7 + (64.8-33.7)*f, 0), 'göç ilerledikçe cold-start kritikleşir');
  }
  $('sY').addEventListener('input', fleet);

  /* ---- canlı parametre paneli ---- */
  function paramHesap(w0, w1, w2, ber, tampon){
    const w = [w0, w1, w2];
    let kir = 0, kirAog = 0, kap = 0, berN = 0;
    const risk = new Float64Array(NPN);
    for(let i = 0; i < NPN; i++){
      risk[i] = w[PN.kr[i]] * PN.t25[i] * PN.ttr[i] / 365;
      const t = PN.t25[i];
      if(t > 0){
        const lam = t / 365, tts = PN.svc[i] / lam;
        if(tts < PN.ttr[i] + tampon){
          kir++; if(PN.kr[i] === 0) kirAog++;
          kap += Math.max(0, (PN.ttr[i] - tts) * lam) * PN.clp[i];   // hedef: TTR seviyesi (doküman formülü)
        }
      }
      if(PN.disrep[i] / PN.clp[i] > ber) berN++;
    }
    const top = Array.from({length: NPN}, (_, i) => i)
      .sort((a, b) => risk[b] - risk[a]).slice(0, 10);
    return {kir, kirAog, kap, berN, top, risk};
  }
  const PB = {w0:3, w1:2, w2:1, ber:.65, tampon:0};
  const pBaseTop = paramHesap(3, 2, 1, .65, 0).top;                  // varsayılan sıralama (kıyas için)
  function pRun(){
    const r = paramHesap(PB.w0, PB.w1, PB.w2, PB.ber, PB.tampon);
    $('pK').innerHTML =
      stat('Kırmızı PN', fmt(r.kir), r.kir === BAZ.kir ? 'baz ile aynı' : `baz ${BAZ.kir}`, r.kir > BAZ.kir ? 'red' : '') +
      stat('AOG kritik', fmt(r.kirAog), `baz ${BAZ.kirAog}`, '') +
      stat('Kapatma', mM(r.kap / 1e6), 'TTR seviyesine tamamlama', 'amber') +
      stat('BER üstü PN', fmt(r.berN), `eşik ${String(PB.ber.toFixed(2)).replace('.', ',')}`, '');
    $('pTop').innerHTML = r.top.map((i, n) => {
      const eski = pBaseTop.indexOf(i);
      const isaret = eski === n ? '' : eski === -1
        ? `<span class="bg bg-warn">YENİ</span>`
        : `<span class="bg ${eski > n ? 'bg-teal' : 'bg-nk'}">${eski > n ? '▲' : '▼'} ${Math.abs(eski - n)}</span>`;
      return `<tr><td class="n">${n + 1}</td><td class="pn-link mono">PN-${PN.id[i]}</td>
        <td>${LK.sub[PN.sub[i]]}</td><td>${KR_BADGE[PN.kr[i]]}</td>
        <td class="n">${f1(r.risk[i])}</td><td>${isaret}</td></tr>`;
    }).join('');
  }
  function pSync(){
    $('pW0').value = PB.w0; $('pW1').value = PB.w1; $('pW2').value = PB.w2;
    $('pBer').value = PB.ber; $('pTam').value = PB.tampon;
    $('lW0').textContent = String(PB.w0).replace('.', ',');
    $('lW1').textContent = String(PB.w1).replace('.', ',');
    $('lW2').textContent = String(PB.w2).replace('.', ',');
    $('lBer').textContent = String(PB.ber.toFixed(2)).replace('.', ',');
    $('lTam').textContent = PB.tampon + ' gün';
  }
  [['pW0','w0'],['pW1','w1'],['pW2','w2'],['pBer','ber'],['pTam','tampon']].forEach(([id, k]) =>
    $(id).addEventListener('input', e => { PB[k] = +e.target.value; pSync(); pRun(); }));
  $('pSifirla').addEventListener('click', () => {
    Object.assign(PB, {w0:3, w1:2, w2:1, ber:.65, tampon:0}); pSync(); pRun();
  });

  /* ---- dayanıklılık histogramları ---- */
  const th = DATA.ttsHist;
  new Chart($('cTts'), {type:'bar', data:{labels:th.etiket, datasets:[
    {label:'PN sayısı', data:th.sayi, borderRadius:3,
     backgroundColor:th.etiket.map((_, i) => i < 2 ? 'rgba(224,106,106,.8)' : i < 4 ? 'rgba(232,163,61,.7)' : 'rgba(79,193,176,.6)')}]},
    options:{maintainAspectRatio:false, plugins:{legend:{display:false},
      tooltip:{callbacks:{title:it => it[0].label + ' gün', label:c => ` ${fmt(c.parsed.y)} PN`}}},
      scales:{x:{title:{display:true, text:'hayatta kalma süresi (gün)'}, ticks:{font:{size:9}}},
              y:{beginAtZero:true}}}});
  const fh = DATA.fmvClpHist;
  new Chart($('cFmv'), {type:'bar', data:{labels:fh.etiket.map(v => String(v).replace('.', ',')), datasets:[
    {label:'PN sayısı', data:fh.sayi, backgroundColor:'rgba(91,143,214,.65)', borderRadius:3}]},
    options:{maintainAspectRatio:false, plugins:{legend:{display:false}},
      scales:{x:{title:{display:true, text:'FMV / CLP oranı'}, ticks:{font:{size:8.5}, maxTicksLimit:8}},
              y:{beginAtZero:true}}}});

  /* ---- Monte Carlo histogramı ---- */
  const mcd = DATA.mc;
  new Chart($('cMc'), {type:'bar', data:{labels:mcd.hist.etiket.map(v=>fmt(v)), datasets:[
    {label:'Baz durum', data:mcd.hist.baz, backgroundColor:'rgba(79,193,176,.7)', borderRadius:2},
    {label:'Motor ailesi krizi', data:mcd.hist.motor, backgroundColor:'rgba(224,106,106,.7)', borderRadius:2}]},
    options:{maintainAspectRatio:false,
      plugins:{legend:{labels:{boxWidth:9,font:{size:10}}},
        tooltip:{callbacks:{title:it=>'~'+it[0].label+' PN açıkta', label:c=>` ${c.dataset.label}: ${fmt(c.parsed.y)} deneme`}}},
      scales:{x:{title:{display:true,text:'tedarik penceresinde stoğu yetmeyen PN sayısı'},ticks:{font:{size:8.5},maxTicksLimit:9}},
              y:{beginAtZero:true,title:{display:true,text:'deneme sayısı'}}}}});

  /* ---- tornado duyarlılık ---- */
  const td = DATA.tornado;
  new Chart($('cTornado'), {type:'bar', data:{labels:td.etiket, datasets:[
    {label:'aralık ($M)', data:td.etiket.map((_,i)=>[td.dusuk[i], td.yuksek[i]]),
     backgroundColor:'rgba(232,163,61,.55)', borderColor:C.amber, borderWidth:1.2, borderRadius:3, barPercentage:.6}]},
    options:{maintainAspectRatio:false, indexAxis:'y',
      plugins:{legend:{display:false},
        tooltip:{callbacks:{label:c=>` ${mM(c.raw[0])} – ${mM(c.raw[1])}  ·  baz ${mM(td.baz)}`}}},
      scales:{x:{title:{display:true,text:'2033 açığını kapatma maliyeti, baz: '+mM(td.baz)},
                 ticks:{callback:v=>'$'+v+'M'}},
              y:{ticks:{font:{size:9.5},autoSkip:false}}}}});

  /* ---- önceliklendirme sınır eğrisi ---- */
  const od = DATA.opt;
  new Chart($('cOpt'), {data:{datasets:[
    {type:'line', label:'Kapanan açık PN', data:od.butce.map((b,i)=>({x:b,y:od.kapanan[i]})),
     borderColor:C.teal, backgroundColor:C.teal, pointRadius:0, borderWidth:2, tension:.15},
    {type:'line', label:'Risk azaltım kazanımı (%)', yAxisID:'y1', data:od.butce.map((b,i)=>({x:b,y:od.kazanc[i]})),
     borderColor:C.violet, backgroundColor:C.violet, pointRadius:0, borderWidth:2, borderDash:[5,4], tension:.15}]},
    options:{maintainAspectRatio:false,
      plugins:{legend:{labels:{boxWidth:9,font:{size:10}}},
        tooltip:{callbacks:{title:it=>'bütçe '+mM(it[0].parsed.x),
          label:c=>` ${c.dataset.label}: ${c.datasetIndex ? '%'+f1(c.parsed.y) : fmt(c.parsed.y)+' PN'}`}}},
      scales:{x:{type:'linear', title:{display:true,text:'kümülatif bütçe ($M)'}, ticks:{callback:v=>'$'+v+'M'}},
              y:{beginAtZero:true, title:{display:true,text:'kapanan PN'}},
              y1:{position:'right', beginAtZero:true, max:102, grid:{drawOnChartArea:false}, ticks:{callback:v=>'%'+v}}}}});

  pSync(); pRun();
  syncUI(); run(); fleet();
}

/* =====================================================================
   SÖZLÜK — ekranlardaki tüm kısaltmaların Türkçe açıklamaları
   ===================================================================== */
const SOZLUK = [
  ['PN', 'Part Number · parça numarası', 'Takip edilen her bir komponent tipi. Veride 5.000 tane var.'],
  ['AOG', 'Aircraft on Ground', 'Parça yokluğundan uçağın yerde kalması. Her saati doğrudan gelir kaybı.'],
  ['TAT', 'Turn Around Time', 'Bir parçanın tamire gidip dönmesinin ya da yeni satın almanın süresi.'],
  ['TTS', 'Time to Survive · dayanma süresi', 'Eldeki kullanılabilir stok, günlük talebe bölününce kaç gün yeteceği.'],
  ['TTR', 'Time to Recover · toparlanma süresi', 'Bir parçayı yeniden servise sokmanın süresi. İç atölye varsa iç tamir, yoksa dış tamir süresidir.'],
  ['Kırmızı liste', 'Stoğu dayanmayan parçalar', 'Stoğun, yenisi gelene kadar bitmesi beklenen parçalar. Bugün 134 parça, 72\'sinin siparişi bile yok.'],
  ['CLP', 'Katalog liste fiyatı', 'Bir parçayı sıfırdan satın almanın bedeli.'],
  ['FMV', 'Adil piyasa değeri', 'Bir parçanın ikinci el piyasa değeri. Ortalaması liste fiyatının %43\'ü.'],
  ['SVC', 'Kullanılabilir stok', 'Faal ve ana depodaki adetlerin toplamı. Hemen takılabilir parçalar.'],
  ['Lead time', 'Tedarik süresi', 'Min-max hesabında kullanılan temin süresi. İç tamir mümkünse odur, değilse dış tamir ile satın almanın kısası.'],
  ['BER', 'Ekonomik tamir sınırı', 'Dış tamir maliyeti liste fiyatının %65\'ini aşarsa tamir mantıklı değildir. Değişim ya da hurda daha ekonomiktir.'],
  ['Scrap', 'Hurda', 'Tamir edilemeyip hurdaya ayrılan parça. Yerine yenisi alınır. Yılda 67,8 M$\'lık bir kalem.'],
  ['Float', 'Tamir döngüsündeki parça', 'Herhangi bir anda tamirde dönen beklenen parça miktarı. Sahada %97 tuttu.'],
  ['Min-Max', 'Stok politikası', 'Stok MIN altına inince MAX seviyesine tamamlanacak şekilde sipariş verilir. İkisi de parça bazında hesaplanır.'],
  ['Emniyet stoğu', 'Güvenlik payı', 'Talep dalgalanmasına karşı MIN üzerine eklenen tampon. Servis hedefine göre hesaplanır.'],
  ['SBA', 'Kesikli talep tahmini', 'Ara ara sıfır olan talepler için tasarlanmış klasik bir tahmin yöntemi.'],
  ['Croston', 'Croston yöntemi', 'SBA\'nın atası, kesikli talep tahmininin standart yöntemi.'],
  ['CV', 'Varyasyon katsayısı', 'Talebin çeyrekten çeyreğe ne kadar oynadığının ölçüsü.'],
  ['ABC×XYZ', 'Segmentasyon matrisi', 'Parçalar hacme ve düzenliliğe göre sınıflanır, her gruba uygun tahmin yöntemi atanır.'],
  ['MAPE', 'Tahmin doğruluğu ölçüsü', 'Yüzde cinsinden hata. Faz geçiş kapılarında kullanılır.'],
  ['MLP', 'Yapay sinir ağı', 'Kullanılan model mimarisi, katmanlı bir sinir ağı.'],
  ['Poisson', 'Poisson dağılımı', 'Sayım verisi için doğru olasılık modeli. Emniyet stoğu ve simülasyonun temeli.'],
  ['Monte Carlo', 'Simülasyon yöntemi', 'Rastgele senaryoları binlerce kez koşup sonuç dağılımını çıkarmak. Burada 800 denemelik belirsizlik testi.'],
  ['Cold-start', 'Soğuk başlangıç', 'Geçmiş verisi olmayan yeni parçanın tahmini. Benzerlerinden başla, gözlem geldikçe düzelt.'],
  ['MTBUR', 'Sökümler arası ortalama süre', 'Bir parçanın plansız sökümler arası ortalama çalışma süresi. Üretici verisidir.'],
  ['Phase-out', 'Filodan çıkış', 'Emekli edilen modellere bağlı parçaların stoktan eritilmesi. Takvimle değil sinyalle yönetilir.'],
  ['Last-time-buy', 'Son alım fırsatı', 'Üreticinin bir parçanın üretimini durdurmadan önceki son sipariş kararı.'],
  ['Pool', 'Havuz', 'Birden çok havayolunun parça stoğunu paylaştığı ortaklık modeli. Filonun %58\'i pool uçağı.'],
  ['Exchange', 'Değişim', 'Arızalı parçayı verip havuzdan çalışanını almak. Yılda yaklaşık 2.600 adet trafik var.'],
  ['CDC', 'Değişiklik yakalama', 'Kaynak sistemlerdeki değişiklikleri salt okunur biçimde almak. Hiçbir kaynağa yazılmaz.'],
  ['Risk listesi', 'Kritik ve tamiri olmayan parçalar', 'Hem uçak yatıran hem iç tamiri olmayan 547 parça. Kabiliyet yatırımının hedef listesi.'],
  ['Üçlü tehlike', 'En riskli alt küme', '547 parça içinden geçmişi olmayan yeni nesil 181 parça. Hem kritik, hem tamirsiz, hem geçmişsiz.'],
];
function dicCiz(filtre){
  const q = foldTr(filtre || '');
  const rows = SOZLUK.filter(([t, a, d]) => !q || foldTr(t + ' ' + a + ' ' + d).includes(q));
  $('dicList').innerHTML = rows.length
    ? rows.map(([t, a, d]) => `<div class="dic-row"><span class="t">${t}</span><span class="a">${a}</span><p>${d}</p></div>`).join('')
    : `<div class="dic-row"><p>Eşleşme yok. Başka bir terim deneyin.</p></div>`;
}
$('dicBtn').addEventListener('click', () => {
  const b = $('dicBox'); b.classList.toggle('on');
  if(b.classList.contains('on')){ dicCiz($('dicQ').value); }
});
$('dicX').addEventListener('click', () => $('dicBox').classList.remove('on'));
$('dicQ').addEventListener('input', e => dicCiz(e.target.value));
document.addEventListener('keydown', e => { if(e.key === 'Escape') $('dicBox').classList.remove('on'); });
dicCiz('');

/* ---------------- başlat ---------------- */
const RENDER = {kokpit:renderKokpit, watch:renderWatch, ongoru:renderOngoru, harita:renderHarita, senaryo:renderSenaryo};
showView('kokpit');
