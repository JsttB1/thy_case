'use strict';
/* =====================================================================
   Catalyst — uygulama katmanı
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
/* Durum sütunu sıralama anahtarı — nokta rengiyle aynı öncelik: siparişsiz > kırmızı > 547 > BER */
PN.durum = PN.id.map((_, i) => hasF(i, FL.SIP) ? 4 : hasF(i, FL.KIRMIZI) ? 3
                             : hasF(i, FL.R547) ? 2 : hasF(i, FL.BER) ? 1 : 0);

const KR_RENK = ['#E06A6A', '#E8A54C', '#56688C'];
const krDot = i => `<span class="sdot" style="background:${KR_RENK[PN.kr[i]]}" title="${LK.kr[PN.kr[i]]}"></span>`;

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
  <span class="brand">◆ <b>CATALYST</b> · 2033</span>
  <span class="synth">SENTETİK / TEMSİLİ VERİ</span>
  <button class="dic-btn" id="dicBtn" title="Kısaltmalar sözlüğü">📖 SÖZLÜK</button>
  <div class="tabs" id="tabs"></div>
</div></nav>

<div class="wrap">
  <header class="hero">
    <h1>Catalyst · Komponent Envanter Karar Desteği</h1>
    <p>${fmt(K.pn)} parça · 1.200 → 2.000 uçak projeksiyonu · tüm sayılar üç resmi veri setinden
    <span class="mono">core.py</span> ile hesaplanır.</p>
  </header>

  <div id="v-kokpit" class="view"></div>
  <div id="v-watch"  class="view"></div>
  <div id="v-ongoru" class="view"></div>
  <div id="v-harita" class="view"></div>
  <div id="v-senaryo" class="view"></div>

  <div class="foot">
    <b>Varsayımlar.</b> Kullanılabilir stok = FAAL + HOMEBASE. Harita temsilî dağıtım, mevsimsellik tek yıla dayanır.
    Projeksiyon aralıktır: +${pct(B.alt_pct,1)} ile +${pct(B.ust_pct,1)} arası.
    Kritiklik ağırlıkları, BER eşiği ${String(PRM.ber_esigi).replace('.',',')} ve servis hedefleri Senaryo sekmesinden ayarlanabilir.
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
    <span class="tag">Alarm</span>
    <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
      <span class="big">${K.siparissiz} PN</span>
      <p style="margin:0;flex:1;min-width:240px"><strong>kırmızıda ve açık siparişi yok.</strong>
      ${K.siparissiz_aog}'i AOG kritik. Kırmızı liste toplam ${K.kirmizi} parça, kapatma maliyeti <b>${mM(K.kapatma)}</b>.</p>
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

  <div class="grid g3">
    <div class="card"><h3 style="color:${C.amber}">Hurda ikamesi · ${mM(K.scrap_butce)}/yıl</h3>
      <div class="hint">${fmt(K.scrap25)} parça/yıl, talebin ${pct(K.scrap_oran)}'i · BER kuralı ${fmt(K.ber_pn)} parçada devrede.</div></div>
    <div class="card"><h3 style="color:${C.blue}">Tamir döngüsü · ${mM(K.float_fmv)} → ${mM(K.float_fmv_33)}</h3>
      <div class="hint">Kabiliyet yatırımı: yılda ${mM(K.kab_tasarruf)} tasarruf + ${mM(K.kab_sermaye)} serbesti. Bugünkü dış tamir ${mM(K.kab_bugun)}/yıl.</div></div>
    <div class="card"><h3 style="color:${C.violet}">Emekli filo stoğu · ${mM(K.phaseout)}</h3>
      <div class="hint">Envanterin ${pct(K.phaseout_pct)}'si küçülen 4 modelde · eritme sinyale bağlı.</div></div>
  </div>

  <div class="grid g2">
    <div class="card"><h3>Pool / değişim trafiği
      <span class="bg bg-warn" style="vertical-align:2px;margin-left:6px">VERİ ANOMALİSİ</span></h3>
      <div class="hint">Yılda <b>${fmt(K.exch_in)} giriş, ${fmt(K.exch_out)} çıkış</b> · havuza bağımlı ${K.pool_bagimli} parça.
      THY uçağı ${f1(B.thy_ucak_basi)}, pool uçağı ${f1(B.pool_ucak_basi)} parça/yıl talep ediyor, 3,6 kat fark anomali işaretli.</div>
      <div style="height:130px"><canvas id="cPool"></canvas></div></div>
    <div class="card"><h3>Gayrifaal karar kuyruğu</h3>
      <div class="grid g3" style="margin:10px 0 4px">
        <div class="kpi" style="padding:11px 13px"><div class="l">Bekleyen parça</div><div class="v" style="font-size:1.25rem">${fmt(K.gayrifaal_adet)}</div><div class="d">arızalı, karar bekliyor</div></div>
        <div class="kpi amber" style="padding:11px 13px"><div class="l">Faale döndürme</div><div class="v" style="font-size:1.25rem">${mM(K.gayrifaal_tamir)}</div><div class="d">tahmini tamir maliyeti</div></div>
        <div class="kpi teal" style="padding:11px 13px"><div class="l">Kazanılacak değer</div><div class="v" style="font-size:1.25rem">${mM(K.gayrifaal_fmv)}</div><div class="d">piyasa değeri</div></div>
      </div></div>
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

  <div class="card"><h3>Kırmızı liste: kritikliğe göre dağılım</h3>
      <div class="hint">Stok, yenisi gelene kadar yetmiyorsa parça kırmızıya düşer. "Siparişsiz" olanlarda uyarı var ama aksiyon yok.</div>
      <div style="height:235px"><canvas id="cDurum"></canvas></div></div>

  `;

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
  <p class="sec-p">Risk skoru kritikliği, yıllık talebi ve tedarik süresini birlikte tartar.
  Satıra tıklayınca parça detayı ve aksiyon seçenekleri açılır.</p>
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
    <div class="note" style="margin:2px 0 7px">Kritiklik:
      <span class="sdot" style="background:#E06A6A"></span> AOG, uçağı yerde bırakır ·
      <span class="sdot" style="background:#E8A54C"></span> kritik ·
      <span class="sdot" style="background:#56688C"></span> kritik değil
      &nbsp;·&nbsp; Durum, parçanın bugünkü hâlidir · ayrıntı için satıra tıklayın</div>
    <div class="tw"><table id="wTbl"><thead><tr>
      <th>PN</th><th>Model</th><th>Kategori</th><th>Kritiklik</th><th data-k="durum">Durum</th>
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
      /* üçlü döngü: 1. tık azalan, 2. tık artan, 3. tık varsayılana (risk azalan) dönüş */
      if(W.sort.k === k && !W.sort.asc) W.sort.asc = true;
      else if(W.sort.k === k && W.sort.asc){ W.sort.k = 'risk'; W.sort.asc = false; }
      else { W.sort.k = k; W.sort.asc = false; }
      drawRows(); return; }
    const wg = e.target.closest('.wgo');
    if(wg){
      if(!W.hedef){
        const s = $('wHedef');
        if(s){ s.style.borderColor = '#E06A6A'; }
        const n = $('wHedefNot');
        if(n){ n.textContent = 'önce hedef istasyonu seçin'; n.style.color = '#E06A6A'; }
        return;
      }
      showView('harita');
      if(H._parcaGoster) H._parcaGoster(W.sel, W.hedef, wg.dataset.t);
      window.scrollTo(0, 0);
      return;
    }
    const tr = e.target.closest('tr[data-i]');
    if(tr){ W.sel = +tr.dataset.i; drawDetail(W.sel); $('wDet').scrollIntoView({behavior:'smooth', block:'nearest'}); }
  });
  el.addEventListener('change', e => {
    if(e.target && e.target.id === 'wHedef'){ W.hedef = e.target.value; e.target.style.borderColor = ''; }
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
      const st = [];
      if(hasF(i,FL.SIP)) st.push(['bg-red', 'TÜKENİYOR', 'stok yenisi gelmeden bitiyor ve sipariş yok']);
      else if(hasF(i,FL.KIRMIZI)) st.push(['bg-warn', 'SİPARİŞTE', 'stok bitiyor ama yenisi sipariş edildi']);
      if(hasF(i,FL.R547)) st.push(['bg-sari', 'DIŞA BAĞIMLI', 'iç tamiri yok, dış istasyona bağımlı']);
      if(hasF(i,FL.BER)) st.push(['bg-mor', 'HURDA ADAYI', 'tamir ekonomik değil, bozulunca yenilenir']);
      const dHtml = st.length
        ? `<span class="bg ${st[0][0]}" title="${st.map(s => s[2]).join(' · ')}">${st[0][1]}</span>`
        : `<span style="color:${C.dim}">—</span>`;
      const krHtml = krDot(i);
      const ttsTxt = PN.tts[i] >= 9999 ? '∞' : fmt(PN.tts[i]);
      const rw = Math.max(4, 100 * PN.risk[i] / rmax);
      return `<tr data-i="${i}"><td class="pn-link">PN-${PN.id[i]}</td><td>${LK.mdl[PN.mdl[i]]}</td>
      <td>${LK.sub[PN.sub[i]]}</td><td style="text-align:center">${krHtml}</td><td>${dHtml}</td>
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
      ops.push({t:'pool', ad:'Havuzdan değişim', sm:'değişim ağı bugün de işliyor', gun:3, m:.10 * PN.clp[i], tag:'ücret varsayımı liste fiyatının %10\'u'});
    if(PN.ato[i] && PN.tic[i] != null)
      ops.push({t:'ictamir', ad:'İç atölye tamiri', sm:'iç tamir mümkün', gun:PN.tic[i], m:PN.icrep[i]});
    ops.push({t:'distamir', ad:'Dış tamir', sm:hasF(i,FL.BER) ? 'dikkat: bu parçada tamir ekonomik değil' : 'standart tamir kanalı', gun:PN.tdis[i], m:PN.disrep[i]});
    ops.push({t:'hizli', ad:'Hızlandırılmış dış tamir', sm:'ek ücretle öne alınır', gun:Math.ceil(PN.tdis[i]*.6), m:PN.disrep[i]*1.5, tag:'süre 0,6 katına iner, maliyet 1,5 kat'});
    ops.push({t:'alim', ad:'Yeni satın alma', sm:'üreticiden sıfır tedarik', gun:PN.tsat[i], m:PN.clp[i]});
    if(PN.gay[i] > 0)
      ops.push({t:'sokum', ad:'Donörden söküm', sm:PN.gay[i] + ' arızalı donör rafta bekliyor', gun:1, m:null, tag:'kayıt altında, borç defterine işlenir'});
    ops.sort((a,b) => a.gun - b.gun);
    return ops.map((o,n) => `<div class="step${n===0?' best':''}"><span class="no">${n+1}</span>
      <span class="nm">${o.ad}<small>${o.sm}${o.tag ? ' · ' + o.tag : ''}</small>
        <span class="chip wgo" data-t="${o.t}" style="margin-top:5px;padding:1px 9px;font-size:.64rem;display:inline-block">🗺 haritada göster</span></span>
      <span class="m"><b>${o.gun} gün</b><span>${o.m == null ? 'tamir borcu' : mUsd(o.m)}</span></span></div>`).join('');
  }

  function drawDetail(i){
    const tts = PN.tts[i], ttr = PN.ttr[i];
    const mx = Math.max(Math.min(tts, ttr*3), ttr, 1);
    const d33 = PN.t25[i] > 0 ? Math.round(100 * (PN.t33[i] / PN.t25[i] - 1)) : null;
    const t33lo = Math.min(PN.t33a[i], PN.t33b[i]), t33hi = Math.max(PN.t33a[i], PN.t33b[i]);
    const muL = PN.rate33[i] * PN.lead[i] / PRM.ceyrek_gun;          // tedarik süresi boyunca beklenen talep
    const muC = Math.ceil(muL), ssC = Math.max(0, PN.min33[i] - muC);
    const nnF = PN.nn4[i] != null ? +(PN.nn4[i] - PN.q4[i]).toFixed(1) : null;
    /* tahmin gerekçesi: tek kısa cümle — sürücü + yöntem */
    const kesQ = [PN.q1[i], PN.q2[i], PN.q3[i], PN.q4[i]].some(v => !v);
    const grw = LK.mdl_b[PN.mdl[i]], grwS = String(grw).replace('.', ',');
    const gcum = hasF(i,FL.YENI)
      ? `Geçmişi yok: benzerlerinden başlar, ${LK.mdl[PN.mdl[i]]} filosuyla ×${grwS} ölçeklenir.`
      : `${LK.mdl[PN.mdl[i]]} filosu ×${grwS} ${grw >= 1 ? 'büyüyor' : 'küçülüyor'}, talep bu çarpanla ölçekleniyor.`;
    const fl = [];
    if(hasF(i,FL.SIP)) fl.push('<span class="bg bg-red">TÜKENİYOR · SİPARİŞSİZ</span>');
    else if(hasF(i,FL.KIRMIZI)) fl.push('<span class="bg bg-warn">TÜKENİYOR · SİPARİŞTE</span>');
    if(hasF(i,FL.R547)) fl.push('<span class="bg bg-sari">DIŞA BAĞIMLI</span>');
    if(hasF(i,FL.BER)) fl.push('<span class="bg bg-mor">HURDA ADAYI</span>');
    if(hasF(i,FL.PO)) fl.push('<span class="bg bg-nk">PHASE-OUT MODELİ</span>');
    if(hasF(i,FL.YENI)) fl.push('<span class="bg bg-teal">YENİ NESİL</span>');
    $('wDet').innerHTML = `
    <div class="card" style="margin-top:14px">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        <h3 class="mono" style="font-size:1.15rem;color:${C.teal}">PN-${PN.id[i]}</h3>
        ${krDot(i)} <span style="color:${C.dim};font-size:.8rem">${LK.sub[PN.sub[i]]} · ${LK.mdl[PN.mdl[i]]} · risk ${f1(PN.risk[i])}</span>
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
          <div class="ctl" style="margin:7px 0 6px;gap:7px">
            <span class="note">Hedef istasyon</span>
            <select id="wHedef"><option value="">seçiniz…</option>${DATA.harita.kod.map(k =>
              `<option value="${k}"${W.hedef === k ? ' selected' : ''}>${k}</option>`).join('')}</select>
            <span class="note" id="wHedefNot">rota çizmek için önce hedef, sonra 🗺</span>
          </div>
          <div class="ladder" style="margin-top:4px">${ladder(i)}</div>
          <div class="hint" style="margin-top:9px">Seçenekler süreye göre sıralanır. AOG saatlik maliyeti girilirse süre ve maliyet birlikte puanlanabilir.</div>
          <h3 style="font-size:.83rem;color:${C.muted};margin-top:14px">Canlı stok yetmeme eğrisi</h3>
          <div style="height:170px;margin-top:7px"><canvas id="cPnCurve"></canvas></div>
          <div class="hint" style="margin-top:6px">Talep verisi zaten Poisson dağılımıyla üretildiği için bu eğri, simülasyonun kapalı form karşılığıdır.
          İşaretler mevcut stoğu ve önerilen 2033 MIN değerini gösterir.</div>
        </div>
      </div>
      <div style="border-top:1px solid var(--line-soft);margin-top:15px;padding-top:12px">
        <h3 style="font-size:.83rem;color:${C.muted}">Tahmin: 2025 gerçekleşen ve 2033 çeyreklik profil</h3>
        <div class="grid g21" style="margin:8px 0 0">
          <div style="height:205px"><canvas id="cPnTah"></canvas></div>
          <div style="font-size:.775rem;color:${C.dim};line-height:1.6;margin-top:2px">
            <div style="margin-bottom:8px"><b style="color:${C.text}">2033 yıllık aralık:</b>
              <span class="mono">${fmt(t33lo)} – ${fmt(t33hi)}</span> adet · orta
              <b class="mono" style="color:${C.teal}">${fmt(PN.t33[i])}</b> · değişim
              <b>${d33 == null ? '—' : (d33 >= 0 ? '+%' : '−%') + Math.abs(d33)}</b><br>
              iki yöntemin uçları: model bazlı ölçek ile THY/pool karışımı</div>
            <div style="margin-bottom:8px"><b style="color:${C.text}">Stok önerisi:</b>
              MIN <b class="mono">${fmt(PN.min33[i])}</b> = tedarik süresi talebi ${fmt(muC)} + emniyet ${fmt(ssC)}
              · MAX <b class="mono">${fmt(PN.max33[i])}</b> · servis hedefi ${pct(PN.sh[i]*100,0)}</div>
            ${nnF != null ? `<div style="margin-bottom:8px"><b style="color:${C.text}">Ağ kontrolü Q4:</b>
              tahmin <span class="mono">${String(PN.nn4[i]).replace('.',',')}</span> · gerçek
              <span class="mono">${fmt(PN.q4[i])}</span> · fark
              <b class="mono" style="color:${Math.abs(nnF) <= 3 ? C.teal : C.amber}">${nnF >= 0 ? '+' : '−'}${String(Math.abs(nnF)).replace('.',',')}</b></div>` : ''}
            <div><b style="color:${C.text}">Sürücü:</b> ${LK.mdl[PN.mdl[i]]} filosu ×${String(LK.mdl_b[PN.mdl[i]]).replace('.',',')}
              · ${hasF(i,FL.YENI) ? 'cold-start: tahmin benzerlerinden başlar, gözlemle parçaya yakınsar'
                                  : 'kesikli talep yöntemi, mevsim katsayısı bütçe düzeyinde'}</div>
          </div>
        </div>
        <div class="hint" style="margin:10px 0 0"><b style="color:${C.text}">Neden bu tahmin?</b>
          ${gcum} ${kesQ ? 'Talep kesikli, yöntem ona göre seçildi.' : 'Talep düzenli, mevsim katsayısı uygulandı.'}</div>
      </div>
    </div>`;
    drawCurve(i);
    drawTah(i);
  }

  function drawTah(i){
    /* portföy mevsim profili (Q3 zirvesi) 2033 çeyrek düzeyine uygulanır; ortalama korunur */
    const ceyT = DATA.ceyrek.thy.map((v, j) => v + DATA.ceyrek.pool[j]);
    const ort = ceyT.reduce((a, b) => a + b, 0) / 4;
    const sez = ceyT.map(v => v / ort);
    const q33 = sez.map(f => PN.rate33[i] * f);
    const lo = q33.map(m => Math.max(0, m - 1.2816 * Math.sqrt(Math.max(m, .25))));
    const hi = q33.map(m => m + 1.2816 * Math.sqrt(Math.max(m, .25)));
    const ds = [
      {type:'bar', label:'2025 gerçekleşen', data:[PN.q1[i],PN.q2[i],PN.q3[i],PN.q4[i]],
       backgroundColor:'rgba(91,143,214,.75)', borderRadius:3},
      {type:'bar', label:'2033 profil, mevsimli', data:q33,
       backgroundColor:'rgba(79,193,176,.4)', borderColor:C.teal, borderWidth:1, borderRadius:3},
      {type:'line', label:'2033 belirsizlik p10–p90', data:hi, borderColor:'rgba(232,163,61,0)',
       pointRadius:0, fill:'+1', backgroundColor:'rgba(232,163,61,.15)'},
      {type:'line', label:'', data:lo, borderColor:'rgba(232,163,61,0)', pointRadius:0}
    ];
    if(PN.nn4[i] != null)
      ds.push({type:'line', label:'Sinir ağı Q4', data:[null,null,null,PN.nn4[i]], showLine:false,
        pointRadius:5.5, pointStyle:'rectRot', borderColor:C.violet, backgroundColor:C.violet});
    new Chart($('cPnTah'), {data:{labels:['Q1','Q2','Q3','Q4'], datasets:ds},
      options:{maintainAspectRatio:false, animation:{duration:200},
        scales:{y:{beginAtZero:true, ticks:{precision:0}}},
        plugins:{legend:{labels:{boxWidth:10, filter: it => it.text !== ''}}}}});
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
  <h2 class="sec-h">Talep yapısı</h2>
  <div class="grid g21">
    <div class="card"><h3>2025 çeyreklik talep ve hurda</h3>
      <div class="hint">Yaz çeyreği diğerlerinin ${pct(K.q3_pct)} üstünde, etki kritiklik sınıflarında homojen.
      Yıl içi artış düşük: ${pct(K.q1q4_pct)}.</div>
      <div style="height:270px"><canvas id="cCey"></canvas></div></div>
    <div class="card"><h3>Talep ne kadar kesikli?</h3>
      <div class="hint">Medyan talep <b>${fmt(K.medyan_talep)} adet/yıl</b> · parça-çeyreklerin ${pct(K.sifir_ceyrek)}'ı sıfır ·
      ${fmt(K.kesikli)} parçanın en az bir çeyreği boş. Bu profilde kesikli talep yöntemleri kullanılır,
      servis hedefi kritikliğe göre değişir.</div></div>
  </div>

  <h2 class="sec-h">Segmentasyon: hangi parçaya hangi yöntem?</h2>
  <div class="grid g21">
    <div class="card"><h3>ABC ve XYZ matrisi</h3>
      <div class="hint">Parçaları iki eksende sınıflıyoruz. Satırlar hacme göre, en çok talep gören A'dan az talep gören C'ye.
      Sütunlar düzenliliğe göre, istikrarlı X'ten öngörülemez Z'ye. Her hücrede kaç parça olduğu ve talep payı yazıyor.</div>
      <div style="overflow:auto"><table class="heat" id="tAbc"></table></div>
      <div class="hint" style="margin-top:9px">Sütun başına yöntem atanır: istikrarlıda klasik, düzensizde kesikli talep yöntemleri.</div></div>
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
      <div class="hint">İlk yarıyla yaz çeyreği tahmin edildi. Mevsim katsayısı toplam hatayı
      %${String(DATA.backtest.toplam_hata[2]).replace('.',',')}'ten
      <b style="color:${C.teal}">%${String(DATA.backtest.toplam_hata[3]).replace('.',',')}'e</b> indiriyor.
      Katsayı bütçe düzeyinde çalışır, tek parçada kesikli talep yöntemleri geçerli.</div>
      <div style="height:205px"><canvas id="cBt"></canvas></div></div>
    <div class="callout" style="margin:0"><span class="tag">Doğrulama</span>
      <p>Üç bağımsız kontrol aynı yönde: float formülü sahayla %97 uyumlu, risk sıralamasının birincisi sahada da riskli,
      geri test görmediği çeyreğin <strong>toplamını binde dört hatayla</strong> bildi. Kaydırıcılar,
      senaryolar ve optimizasyon bu çekirdeğin üzerinde çalışır.</p></div>
  </div>

  <h2 class="sec-h">2033 projeksiyonu: büyüme değil, dağılım değişimi</h2>
  <div class="grid g3">
    <div class="card"><h3>Talep aralığı: +%${Math.round(B.alt_pct)} – +%${Math.round(B.ust_pct)}</h3>
      <div class="hint">İki ayrı yöntemin sonucu aralık olarak verilir. Nokta tahmin kullanılmaz.</div>
      <div style="height:250px"><canvas id="cBant"></canvas></div></div>
    <div class="card"><h3>Talep nasıl yer değiştiriyor?</h3>
      <div class="hint">Yeni nesil modellerin payı %34'ten %65'e çıkıyor, küçülen 4 klasik model ise %43'ten %16'ya iniyor.
      Geçmişi olmayan parça tahmini bu yüzden ana senaryo.</div>
      <div style="height:250px"><canvas id="cGoc"></canvas></div></div>
    <div class="card"><h3>Kategoriler ayrışıyor</h3>
      <div class="hint">Bir kategori %40 büyürken bir diğeri %91 büyüyor. Bu yüzden tek bir katsayıyla plan yapmak yanlış olur.</div>
      <div style="height:250px"><canvas id="cKat"></canvas></div></div>
  </div>

  <div class="card"><h3>Emekli filo planlayıcısı: 4 klasik modele bağlı ${mM(K.phaseout)}</h3>
      <div class="hint">Çubuklar modele bağlı stok değeri, çizgi 2033'e talep değişimi. Eritme takvimle değil sinyalle:
      kalan talep eşiğin altına inince hızlanır, OEM gecikirse kendiliğinden yavaşlar. Canlı prova Senaryo sekmesinde.</div>
      <div style="height:235px"><canvas id="cPhase"></canvas></div></div>

  ${ml ? `
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

  <div class="card"><h3>Cold-start: geçmişi olmayan parçayı tahmin etmek</h3>
      <div class="hint">Örnek: <b class="mono" style="color:${C.teal}">PN-${DATA.coldstart.pn}</b>, ${DATA.coldstart.sub}.
      Başlangıç tahmini <b>${DATA.coldstart.grup_ad}</b> ailesindeki ${fmt(DATA.coldstart.grup_n)} benzerin ortalaması,
      <b>${String(DATA.coldstart.prior).replace('.',',')} adet</b>. Gerçek değer ${String(DATA.coldstart.gercek).replace('.',',')}.
      Kaydırıcıyla gözlem ekleyin, tahmin parçanın kendi değerine yakınsar.</div>
      <div class="sl" style="max-width:430px"><label>Gelen gözlem <b id="csLbl">0 çeyrek, yalnız başlangıç tahmini</b></label>
        <input type="range" id="csN" min="0" max="4" step="1" value="0"></div>
      <div style="height:190px"><canvas id="cCold"></canvas></div></div>`;

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

  /* ---- cold-start canlı hesap ---- */
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
const H = {kr:'all', kat:'all', yil33:false, kriz:false, akis:false, rota:false, rsen:0, rpn:null, rk:null, wp:null, sel:0};

function renderHarita(){
  const el = $('v-harita');
  const HA = DATA.harita;
  const GRUP = {}; HA.grup.kod.forEach((k, n) => GRUP[k] = {ad: HA.grup.ad[n], u25: HA.grup.u25[n], u33: HA.grup.u33[n]});
  const DEPO_RENK = {ana_depo:'#E81932', ileri_depo:'#1A1D21', hat_stok:'#5A6472', yok:'#B6BDC7'};
  const DEPO_AD = {ana_depo:'Ana depo', ileri_depo:'İleri depo', hat_stok:'Hat stoğu', yok:'Stok yok'};
  const PRENK = ['#E81932', '#1A73E8', '#12805C', '#B8860B', '#7B1FA2'];
  const N = HA.kod.length, IST_I = HA.kod.indexOf('IST');

  /* ---- Web Mercator, istasyon sınırlarına oturtulur ---- */
  const W = 1000, HG = 560, PAD = 34;
  const mY = lat => Math.log(Math.tan(Math.PI/4 + lat*Math.PI/360));
  const lo1 = Math.min(...HA.lon) - 4, lo2 = Math.max(...HA.lon) + 4;
  const la1 = Math.min(...HA.lat) - 3, la2 = Math.max(...HA.lat) + 3;
  const sk = Math.min((W - 2*PAD)/(lo2 - lo1), (HG - 2*PAD)/(mY(la2) - mY(la1)) * (Math.PI/180));
  const cx = (lo1 + lo2)/2, cyM = (mY(la1) + mY(la2))/2;
  const prj = (lon, lat) => [W/2 + (lon - cx)*sk, HG/2 - (mY(lat) - cyM)*sk*180/Math.PI];
  const PXY = HA.kod.map((_, i) => prj(HA.lon[i], HA.lat[i]));

  const zemin = (typeof DUNYA !== 'undefined' ? DUNYA : []).map(ring =>
    'M' + ring.map(p => { const q = prj(p[0], p[1]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join('L') + 'Z'
  ).join(' ');

  el.innerHTML = `
  <h2 class="sec-h">İstasyon ağı</h2>
  <p class="sec-p"><b>${HA.kod.filter((_, i) => !HA.yd[i]).length} yurt içi + ${HA.kod.filter((_, i) => HA.yd[i]).length} yurt dışı istasyon</b> ·
  grup toplamları case tablosuyla birebir, istasyon kırılımı ve depo katmanı temsilî. Noktaya tıkla, rota katmanını dene.</p>
  <div class="card">
    <div class="ctl">
      <span class="chip tg" data-t="kriz">Kriz katmanı</span>
      <span class="chip tg" data-t="yil33">2033</span>
      <span class="chip tg" data-t="akis">Tamir akışı</span>
      <span class="chip tg" data-t="rota">Parça rotası</span>
      <span class="note" style="margin-left:auto" id="hNot">temsilî dağıtım, istasyon verisi veride yok</span>
    </div>
    <div style="margin-bottom:10px">
      <div class="tmap buyuk" id="hMapWrap" style="background:#E9EDF2">
        <svg id="hSvg" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="1000" height="560" fill="#E9EDF2"></rect>
          <g id="hPan">
            <g id="hZemin" fill="#F7F6F2" stroke="#D6DBE1" stroke-width=".7"><path d="${zemin}"></path></g>
            <g id="hAkisG"></g><g id="hRotaG"></g><g id="hNodes"></g>
          </g>
        </svg>
        <div class="tzoom"><button id="hZin">+</button><button id="hZout">−</button><button id="hZtr" title="Türkiye">TR</button><button id="hZfit" title="tümü">⌂</button></div>
        <div class="tbadge" id="hBadge">TEMSİLİ DAĞITIM · 110m dünya konturu</div>
        <div class="ttip" id="hTip"></div>
      </div>
    </div>
    <div class="grid g2" style="margin-bottom:10px">
      <div class="card flush" style="padding:14px 16px" id="hDet"></div>
      <div class="tw" style="max-height:250px"><table id="hTbl"><thead><tr>
        <th>Havalimanı</th><th>Depo</th><th class="n">Uçak 25→33</th><th class="n">Stok adet</th>
      </tr></thead><tbody></tbody></table></div>
    </div>
    <div class="note" id="hLej" style="display:flex;gap:16px;flex-wrap:wrap;align-items:center"></div>
    <div id="hRota" style="display:none;border-top:1px solid var(--line-soft);margin-top:12px;padding-top:11px"></div>
  </div>
`;

  const svg = $('hSvg'), wrap = $('hMapWrap'), tip = $('hTip');
  const gPan = $('hPan'), gNodes = $('hNodes'), gAkis = $('hAkisG'), gRota = $('hRotaG');

  /* ---- yaklaştırma / kaydırma ---- */
  const VT = {k: 1, tx: 0, ty: 0};
  function vtUygula(){ gPan.setAttribute('transform', `translate(${VT.tx.toFixed(1)},${VT.ty.toFixed(1)}) scale(${VT.k.toFixed(3)})`); }
  function zoomAt(f){
    const nk = Math.max(1, Math.min(8, VT.k * f));
    const cxp = W/2, cyp = HG/2;
    VT.tx = cxp - (cxp - VT.tx) * (nk/VT.k); VT.ty = cyp - (cyp - VT.ty) * (nk/VT.k); VT.k = nk;
    vtUygula();
  }
  function zoomBox(lo_1, la_1, lo_2, la_2){
    const [x1, y1] = prj(lo_1, la_2), [x2, y2] = prj(lo_2, la_1);
    const k = Math.min(8, Math.min(W / (x2 - x1), HG / (y2 - y1)) * .92);
    VT.k = k; VT.tx = W/2 - k * (x1 + x2)/2; VT.ty = HG/2 - k * (y1 + y2)/2;
    vtUygula(); draw();
  }
  $('hZin').addEventListener('click', () => { zoomAt(1.45); draw(); });
  $('hZout').addEventListener('click', () => { zoomAt(1/1.45); draw(); });
  $('hZfit').addEventListener('click', () => { VT.k = 1; VT.tx = 0; VT.ty = 0; vtUygula(); draw(); });
  $('hZtr').addEventListener('click', () => zoomBox(24.5, 34.8, 45.5, 43.5));
  H._parcaGoster = (pnIdx, hedefKod, tip) => {
    H.rota = false; H.wp = {i: pnIdx, hedef: HA.kod.indexOf(hedefKod)};
    H.rpn = 0; H.rk = null;
    const ks = kanalVeri(wpSpec(pnIdx, hedefKod), H.wp.hedef);
    const k = ks.findIndex(o => o.tip === tip);
    if(k >= 0) H.rk = k;
    const is_ = ks.map(o => o.i).concat([H.wp.hedef]);
    zoomBox(Math.min(...is_.map(x => HA.lon[x])) - 3, Math.min(...is_.map(x => HA.lat[x])) - 2,
            Math.max(...is_.map(x => HA.lon[x])) + 3, Math.max(...is_.map(x => HA.lat[x])) + 2);
  };
  let drag = null;
  svg.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: e.clientY, tx: VT.tx, ty: VT.ty}; });
  svg.addEventListener('pointermove', e => {
    if(drag){
      const r = svg.getBoundingClientRect(), o = W / r.width;
      VT.tx = drag.tx + (e.clientX - drag.x) * o; VT.ty = drag.ty + (e.clientY - drag.y) * o;
      vtUygula(); return;
    }
    const hit = e.target.closest && e.target.closest('.rkHit');
    if(hit){
      const r = wrap.getBoundingClientRect();
      tip.style.display = 'block';
      tip.style.left = Math.min(r.width - 250, e.clientX - r.left + 14) + 'px';
      tip.style.top = Math.max(6, e.clientY - r.top - 10) + 'px';
      tip.innerHTML = hit.dataset.tip;
      return;
    }
    const n = e.target.closest && e.target.closest('.wn');
    if(!n){ tip.style.display = 'none'; return; }
    const r = wrap.getBoundingClientRect(), i = +n.dataset.s;
    tip.style.display = 'block';
    tip.style.left = Math.min(r.width - 250, e.clientX - r.left + 14) + 'px';
    tip.style.top = Math.max(6, e.clientY - r.top - 10) + 'px';
    tip.innerHTML = tipHtml(i);
  });
  svg.addEventListener('pointerup', () => drag = null);
  svg.addEventListener('pointerleave', () => { drag = null; tip.style.display = 'none'; });

  /* ---- yardımcılar ---- */
  const ucak = i => H.yil33 ? HA.u33[i] : HA.u25[i];
  function krizFaktor(){
    if(!H.kriz || SC.preset === 'baz') return 1;
    return senaryoHesap(SC).kir / 134;
  }
  const hav = (i, j) => {
    const R = 6371, d2r = Math.PI/180;
    const dla = (HA.lat[j]-HA.lat[i])*d2r, dlo = (HA.lon[j]-HA.lon[i])*d2r;
    const a = Math.sin(dla/2)**2 + Math.cos(HA.lat[i]*d2r)*Math.cos(HA.lat[j]*d2r)*Math.sin(dlo/2)**2;
    return R * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
  };
  const HAZIR = {ana_depo:.5, ileri_depo:1, hat_stok:2, yok:3};
  const eta = (src, dst) => Math.round((hav(src, dst)/800 + (HA.yd[src] ? 4 : 1) + HAZIR[HA.depo[src]]) * 2) / 2;
  const etaPool = (src, dst) => Math.round((hav(src, dst)/800 + 4 + 8) * 2) / 2;   // uçuş + gümrük + pool işlemi
  const HAVUZ_ORTAK = ['FRA', 'LHR', 'CDG', 'DXB', 'AMS', 'JFK', 'JED', 'BER', 'SIN'];
  const wpSpec = (i, hedefKod) => ({
    pn: String(PN.id[i]), sub: LK.sub[PN.sub[i]],
    kay: ['IST', 'ESB', 'ADB'].filter(k => k !== hedefKod),
    pool: [HAVUZ_ORTAK[PN.id[i] % 9], HAVUZ_ORTAK[(PN.id[i] + 4) % 9]].filter(k => k !== hedefKod),
    alim: PN.tsat[i]});
  const rotaVeri = () => {
    if(H.wp){
      /* Watchlist'ten gelen tek parça: hedef kullanıcı seçimi, kanallar gerçek parça verisi */
      const spec = wpSpec(H.wp.i, HA.kod[H.wp.hedef]);
      const hIdx = H.wp.hedef;
      const ops = spec.kay.map(k => { const i = HA.kod.indexOf(k); return {i, kod: k, tip: 'depo', saat: eta(i, hIdx)}; })
        .concat(spec.pool.map(k => { const i = HA.kod.indexOf(k); return {i, kod: k, tip: 'pool', saat: etaPool(i, hIdx)}; }))
        .sort((a, b) => a.saat - b.saat);
      const parcalar = [{n: 0, pn: spec.pn, sub: spec.sub, ops, alim: spec.alim, renk: PRENK[0]}];
      return {sc: {ucak: 'PN-' + spec.pn, hedef: HA.kod[hIdx], parcalar: [spec]}, hIdx, parcalar, kritik: ops[0].saat, wp: true};
    }
    const sc = HA.rota[H.rsen], hIdx = HA.kod.indexOf(sc.hedef);
    const parcalar = sc.parcalar.map((p, n) => {
      const ops = p.kay.map(k => { const i = HA.kod.indexOf(k); return {i, kod: k, tip: 'depo', saat: eta(i, hIdx)}; })
        .concat((p.pool || []).map(k => { const i = HA.kod.indexOf(k); return {i, kod: k, tip: 'pool', saat: etaPool(i, hIdx)}; }))
        .sort((a, b) => a.saat - b.saat);
      return {n, pn: p.pn, sub: p.sub, ops, alim: p.alim, renk: PRENK[n % PRENK.length]};
    });
    return {sc, hIdx, parcalar, kritik: Math.max(...parcalar.map(p => p.ops[0].saat))};
  };
  /* Tek parça izole edilince: aksiyon merdivenindeki TÜM kanallar haritada.
     Tamir ve satın alma süreleri parçanın GERÇEK verisinden (tic/tdis/tsat). */
  const DIS_HUB = ['FRA', 'LHR', 'AMS', 'CDG', 'DXB'];
  const KANAL_RENK = {depo:'#12805C', pool:'#1A73E8', sokum:'#E06A6A', ictamir:'#4FC1B0', distamir:'#9AA8C0', hizli:'#E8A54C', alim:'#77869C'};
  const kanalVeri = (p, hIdx) => {
    const idx = PIDX[p.pn];
    const ks = [];
    p.kay.forEach(k => { const i = HA.kod.indexOf(k);
      ks.push({tip:'depo', ad:'Depo transferi', kod:k, i, saat: eta(i, hIdx), mal:null, malTxt:'iç transfer', dash:''}); });
    (p.pool || []).forEach(k => { const i = HA.kod.indexOf(k);
      ks.push({tip:'pool', ad:'Havuzdan değişim', kod:k, i, saat: etaPool(i, hIdx),
               mal: idx != null ? .10 * PN.clp[idx] : null, dash:'1.6,4.6'}); });
    if(idx != null){
      if(PN.gay[idx] > 0)
        ks.push({tip:'sokum', ad:'Donörden söküm', kod:'IST', i:IST_I, saat:24, mal:null, malTxt:'tamir borcu', dash:'7,3,2,3'});
      if(PN.ato[idx] && PN.tic[idx] != null)
        ks.push({tip:'ictamir', ad:'İç atölye tamiri', kod:'IST', i:IST_I, saat:PN.tic[idx]*24, mal:PN.icrep[idx], dash:'6,4'});
      const dh = DIS_HUB.filter(k => k !== HA.kod[hIdx])[(+p.pn) % 4];
      const di = HA.kod.indexOf(dh);
      ks.push({tip:'distamir', ad:'Dış tamir', kod:dh, i:di, saat:PN.tdis[idx]*24, mal:PN.disrep[idx], dash:'10,5'});
      ks.push({tip:'hizli', ad:'Hızlandırılmış dış tamir', kod:dh, i:di, saat:Math.ceil(PN.tdis[idx]*.6)*24, mal:PN.disrep[idx]*1.5, dash:'10,5'});
      ks.push({tip:'alim', ad:'Yeni satın alma', kod:'OEM · FRA', i:HA.kod.indexOf('FRA'), saat:PN.tsat[idx]*24, mal:PN.clp[idx], dash:'2,6'});
    }
    return ks.sort((a, b) => a.saat - b.saat);
  };
  const sureTxt = s => s < 48 ? String(s).replace('.', ',') + ' saat' : fmt(Math.round(s/24)) + ' gün';
  const yay = (a, b, k) => {
    const [x1, y1] = PXY[a], [x2, y2] = PXY[b];
    const mx = (x1+x2)/2 - (y2-y1)*k, my = (y1+y2)/2 + (x2-x1)*k;
    return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  };

  function tipHtml(i){
    const kf = krizFaktor();
    return `<b>${HA.kod[i]} · ${HA.ad[i]}</b><br>
      Uçak ${ucak(i)} (${H.yil33 ? 2033 : 2025}) · ${DEPO_AD[HA.depo[i]]}<br>
      Stok: <span class="tt-v">${fmt(HA.kalem[i])}</span> kalem · <span class="tt-v">${fmt(HA.adet[i])}</span> adet<br>
      IST transfer: <span class="tt-v">${HA.tsaat[i] === 0 ? 'ana üs' : String(HA.tsaat[i]).replace('.', ',') + ' saat'}</span> ·
      AOG kapsam ${pct(HA.kapsam[i]*100, 0)}${H.kriz && kf > 1 ? `<br><span style="color:#E06A6A">kriz: kırmızı yükü ×${f1(kf)}</span>` : ''}<br>
      <i style="color:#77869C">temsilî dağıtım</i>`;
  }

  /* ---- çizim ---- */
  function draw(){
    document.querySelectorAll('#v-harita .tg').forEach(ch => ch.classList.toggle('on', !!H[ch.dataset.t]));
    const kf = krizFaktor();
    $('hNot').textContent = (H.rota || H.wp)
      ? (() => { const r = rotaVeri(); return r.wp
          ? `rota: ${r.sc.ucak} → ${r.sc.hedef} · Watchlist'ten · en hızlı ${sureTxt(r.kritik)}`
          : `rota: ${r.sc.ucak} · ${r.sc.hedef} · 5 parça · kritik yol ${String(r.kritik).replace('.', ',')} saat`; })()
      : H.kriz
        ? (SC.preset === 'baz' ? 'kriz katmanı: normal durum, Senaryo sekmesinden bir kriz seçebilirsiniz'
                               : `kriz katmanı: ${PRESETS[SC.preset] ? PRESETS[SC.preset].ad : 'özel senaryo'}, kırmızı ×${f1(kf)}`)
        : 'temsilî dağıtım, istasyon verisi veride yok';

    const uMax = Math.max(...HA.kod.map((_, i) => ucak(i)));
    const sira = HA.kod.map((_, i) => i).sort((a, b) => ucak(b) - ucak(a));
    const zk = VT.k;                                     // maplibre gibi: işaretler zoom'la büyümez
    gNodes.innerHTML = sira.map(i => {
      const [x, y] = PXY[i];
      const rr = (5 + 13 * Math.sqrt(ucak(i) / uMax)) / zk;
      const etiket = HA.yd[i] || rr * zk >= 7.5 || zk >= 2.2;
      return `<g class="wn${H.sel === i ? ' sel' : ''}" data-s="${i}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
        <circle r="${(rr + 6/zk).toFixed(2)}" fill="transparent"></circle>
        ${H.kriz && kf > 1 ? `<circle r="${(rr + 4/zk).toFixed(2)}" fill="none" stroke="#E81932" stroke-width="${(1.6/zk).toFixed(2)}" stroke-dasharray="4,3" opacity="${Math.min(.9, .25 + HA.pay25[i]*3).toFixed(2)}"></circle>` : ''}
        <circle class="wc" r="${rr.toFixed(2)}" fill="${DEPO_RENK[HA.depo[i]]}" style="stroke-width:${(2/zk).toFixed(2)}"></circle>
        ${etiket ? `<text class="wl" x="${(rr + 4/zk).toFixed(2)}" y="${(3.5/zk).toFixed(2)}" style="font-size:${(9.5/zk).toFixed(2)}px;stroke-width:${(2.6/zk).toFixed(2)}px">${HA.kod[i]}</text>` : ''}
      </g>`;
    }).join('');

    gAkis.innerHTML = !H.akis ? '' :
      HA.kod.map((_, i) => i).filter(i => i !== IST_I && !HA.yd[i] && HA.depo[i] !== 'yok')
        .map(i => `<path class="wf" d="${yay(i, IST_I, .12)}" stroke-width="${((1 + 4 * HA.pay25[i] / .3) / VT.k).toFixed(2)}"/>`).join('') +
      HA.kod.map((_, i) => i).filter(i => HA.yd[i])
        .map(i => `<path class="wf dis" d="${yay(IST_I, i, .10)}" stroke-width="1.4"/>`).join('');

    if(!H.rota && !H.wp){ gRota.innerHTML = ''; $('hRota').style.display = 'none'; }
    else {
      const r = rotaVeri();
      const [hx, hy] = PXY[r.hIdx];
      const hedefIsaret = `
        <g transform="translate(${hx.toFixed(1)},${hy.toFixed(1)})">
          <circle r="${(14/zk).toFixed(1)}" fill="none" stroke="#1A1D21" stroke-width="${(1.4/zk).toFixed(2)}" stroke-dasharray="3,3"></circle>
          <text y="${(6/zk).toFixed(1)}" text-anchor="middle" style="font-size:${(15/zk).toFixed(1)}px">✈</text>
          <text class="wl" y="${(26/zk).toFixed(1)}" text-anchor="middle" style="font-weight:700;font-size:${(9.5/zk).toFixed(2)}px;stroke-width:${(2.6/zk).toFixed(2)}px">${r.sc.ucak} · ${r.sc.hedef}</text>
        </g>`;
      if(H.rpn != null){
        /* kanal yelpazesi: seçili parçanın tüm geliş yolları — çizgiler tıklanır, üzerine gelince özet */
        const ks = kanalVeri(r.sc.parcalar[H.rpn], r.hIdx);
        gRota.innerHTML = ks.map((o, ki) => {
          const d = yay(o.i, r.hIdx, .10 + ki * .055);
          const secili = H.rk === ki, soluk = H.rk != null && !secili;
          const tipMetni = `<b>${o.ad}</b><br>${o.kod} → ${r.sc.hedef} · ${sureTxt(o.saat)} · ${o.mal == null ? (o.malTxt || '—') : mUsd(o.mal)}`;
          return `<path d="${d}" fill="none" stroke="${KANAL_RENK[o.tip]}"
              stroke-width="${((secili ? 3.6 : ki === 0 && H.rk == null ? 3 : 1.8) / zk).toFixed(2)}"
              ${o.dash ? `stroke-dasharray="${o.dash}"` : ''} opacity="${soluk ? .13 : secili ? .98 : ki === 0 ? .95 : .6}"/>
            <path class="rkHit" data-k="${ki}" data-tip="${tipMetni}" d="${d}" fill="none"
              stroke="rgba(0,0,0,0)" stroke-width="${(12/zk).toFixed(1)}" style="pointer-events:stroke;cursor:pointer"/>`;
        }).join('') +
          ks.map(o => `<circle cx="${PXY[o.i][0].toFixed(1)}" cy="${PXY[o.i][1].toFixed(1)}" r="${(3.6/zk).toFixed(1)}"
            fill="${KANAL_RENK[o.tip]}" opacity=".92"/>`).join('') + hedefIsaret;
      } else {
        gRota.innerHTML = r.parcalar.map(p =>
          p.ops.map((o, oi) => `<path d="${yay(o.i, r.hIdx, .16 + p.n * .045)}" fill="none"
            stroke="${p.renk}" stroke-width="${((oi === 0 ? 2.8 : 1.5) / zk).toFixed(2)}"
            ${oi === 0 ? '' : o.tip === 'pool' ? `stroke-dasharray="${(1.6/zk).toFixed(1)},${(4.6/zk).toFixed(1)}" stroke-linecap="round"` : `stroke-dasharray="${(5/zk).toFixed(1)},${(4/zk).toFixed(1)}"`}
            opacity="${oi === 0 ? .92 : .42}"/>
          <path class="rkHit" data-p="${p.n}" data-tip="<b>PN-${p.pn}</b> · ${o.tip === 'pool' ? 'pool' : 'depo'}<br>${o.kod} → ${r.sc.hedef} · ${String(o.saat).replace('.', ',')} saat · tıkla: tüm kanallar"
            d="${yay(o.i, r.hIdx, .16 + p.n * .045)}" fill="none" stroke="rgba(0,0,0,0)"
            stroke-width="${(11/zk).toFixed(1)}" style="pointer-events:stroke;cursor:pointer"/>`).join('') +
          p.ops.map(o => o.tip === 'pool'
            ? `<rect x="${(PXY[o.i][0] - 2.7/zk).toFixed(1)}" y="${(PXY[o.i][1] - 2.7/zk).toFixed(1)}" width="${(5.4/zk).toFixed(1)}" height="${(5.4/zk).toFixed(1)}"
                fill="${p.renk}" opacity=".9" transform="rotate(45 ${PXY[o.i][0].toFixed(1)} ${PXY[o.i][1].toFixed(1)})"/>`
            : `<circle cx="${PXY[o.i][0].toFixed(1)}" cy="${PXY[o.i][1].toFixed(1)}" r="${(3.4/zk).toFixed(1)}" fill="${p.renk}" opacity=".9"/>`).join('')
        ).join('') + hedefIsaret;
      }
      rotaPanel(r);
      $('hRota').style.display = 'block';
    }

    lejant();
    detay(H.sel, kf);
    tablo();
    vtUygula();
  }

  function lejant(){
    $('hLej').innerHTML = Object.keys(DEPO_RENK).map(t =>
      `<span style="display:inline-flex;align-items:center;gap:6px">
        <span style="width:11px;height:11px;border-radius:50%;background:${DEPO_RENK[t]};border:1.5px solid #fff;display:inline-block"></span>${DEPO_AD[t]}</span>`
    ).join('') + `<span style="margin-left:auto">daire alanı ${H.yil33 ? 2033 : 2025} uçak sayısıyla orantılı · ${HA.kod.length} istasyon · temsilî</span>`;
  }

  function rotaPanel(r){
    const cips = r.wp ? `
      <div class="ctl" style="margin-bottom:8px">
        <span class="chip on">PN-${r.sc.parcalar[0].pn} → ${r.sc.hedef} · Watchlist'ten</span>
        <span class="chip" data-wkapat="1">✕ kapat</span>
      </div>` : `
      <div class="ctl" style="margin-bottom:8px">
        ${HA.rota.map((s, n) => `<span class="chip rsc${n === H.rsen ? ' on' : ''}" data-rs="${n}">${s.ucak} · ${s.hedef}</span>`).join('')}
        <span class="chip rpc${H.rpn == null ? ' on' : ''}" data-rp="-1">Tüm parçalar</span>
        ${r.parcalar.map(p => `<span class="chip rpc${H.rpn === p.n ? ' on' : ''}" data-rp="${p.n}">
          <span style="width:9px;height:9px;border-radius:50%;background:${p.renk};display:inline-block;margin-right:5px"></span>PN-${p.pn}</span>`).join('')}
      </div>`;
    if(H.rpn != null){
      const p = r.parcalar[H.rpn];
      const ks = kanalVeri(r.sc.parcalar[H.rpn], r.hIdx);
      $('hRota').innerHTML = cips + `
        <div class="hint" style="margin:0 0 7px"><b style="color:${p.renk}">PN-${p.pn}</b> ${p.sub} —
          ${r.sc.hedef} istasyonuna tüm geliş kanalları, süreye göre:</div>
        <div class="tw" style="max-height:225px"><table><thead><tr>
          <th>Kanal</th><th>Kaynak</th><th class="n">Süre</th><th class="n">Maliyet</th></tr></thead><tbody>
          ${ks.map((o, oi) => `<tr data-rk="${oi}" class="${H.rk === oi ? 'rkOn' : ''}" style="cursor:pointer">
            <td><span class="sdot" style="background:${KANAL_RENK[o.tip]}"></span> ${o.ad}
              ${oi === 0 ? ' <span class="bg bg-teal">önerilen</span>' : ''}</td>
            <td class="mono">${o.kod}</td>
            <td class="n">${sureTxt(o.saat)}</td>
            <td class="n">${o.mal == null ? (o.malTxt || '—') : mUsd(o.mal)}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="hint" style="margin:7px 0 0">Satıra ya da haritadaki çizgiye tıklayınca kanal vurgulanır, üzerine gelince özet görünür.
        Tamir ve satın alma süreleri parçanın gerçek tedarik verisi. Temsilîdir.</div>`;
      return;
    }
    $('hRota').innerHTML = cips + `
      <div class="hint" style="margin:0">
        ${r.parcalar.map(p => {
          const alt = p.ops.slice(1).map(o => `${o.kod} ${o.tip === 'pool' ? 'pool ' : ''}${String(o.saat).replace('.', ',')}s`).join(' · ');
          return `<b style="color:${p.renk}">PN-${p.pn}</b> ${p.sub} → önerilen <b>${p.ops[0].kod}</b>
            ${p.ops[0].tip === 'pool' ? 'pool' : 'depo'} <b class="mono">${String(p.ops[0].saat).replace('.', ',')} saat</b>${alt ? ' · alternatif: ' + alt : ''}
            · satın alma <b class="mono">${fmt(p.alim)} gün</b></div><div class="hint" style="margin:0">`;
        }).join('')}
        <b style="color:${C.text}">Kritik yol: ${String(r.kritik).replace('.', ',')} saat.</b>
        Uçak, en geç parça ulaşınca toparlanır. Bir parçaya tıklayınca o parçanın BÜTÜN geliş kanalları haritada açılır:
        depo, pool, donörden söküm, iç ve dış tamir, hızlandırılmış tamir, satın alma. Temsilîdir.</div>`;
  }

  function detay(s, kf){
    const g = GRUP[HA.grp[s]];
    $('hDet').innerHTML = `
      <h3 style="font-size:.9rem"><b class="mono" style="color:${C.teal}">${HA.kod[s]}</b> · ${HA.ad[s]}
        <span style="float:right;width:11px;height:11px;border-radius:50%;background:${DEPO_RENK[HA.depo[s]]};border:1.5px solid #fff;margin-top:3px"></span></h3>
      <div class="hint" style="margin:7px 0 0">
      ${DEPO_AD[HA.depo[s]]} · uçak ${HA.u25[s]} → ${HA.u33[s]}, <b style="color:${HA.buyume[s] >= 70 ? C.amber : C.teal}">+${pct(HA.buyume[s], 0)}</b>.<br>
      Stok ${fmt(HA.kalem[s])} kalem · ${fmt(HA.adet[s])} adet · IST transfer ${HA.tsaat[s] === 0 ? 'ana üs' : String(HA.tsaat[s]).replace('.', ',') + ' saat'} ·
      AOG kapsam ${pct(HA.kapsam[s]*100, 0)}${H.kriz && kf > 1 ? ` · <span style="color:#E06A6A">kriz ×${f1(kf)}</span>` : ''}.<br>
      <i>Case tablosunda "${g.ad}" grubu ${g.u25}→${g.u33} uçak. Bu nokta grubun ${pct(100 * HA.u25[s] / g.u25, 0)} payıyla temsil edilir.
      Gerçek üründe istasyon etiketli kayıttan gelir.</i></div>`;
  }

  function tablo(){
    $('hTbl').querySelector('tbody').innerHTML = HA.kod.map((_, i) => i).sort((a, b) => ucak(b) - ucak(a)).map(i => `
      <tr data-s="${i}" style="cursor:pointer"><td><b class="mono" style="color:${C.teal}">${HA.kod[i]}</b>
        <span style="color:${C.dim}">${HA.ad[i]}</span></td>
      <td><span style="width:9px;height:9px;border-radius:50%;background:${DEPO_RENK[HA.depo[i]]};border:1px solid #fff;display:inline-block;margin-right:6px"></span>${DEPO_AD[HA.depo[i]]}</td>
      <td class="n">${HA.u25[i]} → ${HA.u33[i]} <span style="color:${HA.buyume[i] >= 70 ? C.amber : C.dim}">+${pct(HA.buyume[i], 0)}</span></td>
      <td class="n">${fmt(HA.adet[i])}</td></tr>`).join('');
  }

  /* ---- etkileşim ---- */
  el.addEventListener('click', e => {
    const tg = e.target.closest('.tg');
    if(tg){ H[tg.dataset.t] = !H[tg.dataset.t]; draw(); return; }
    const rs = e.target.closest('.rsc');
    if(rs){ H.rsen = +rs.dataset.rs; H.rpn = null; H.rk = null; draw(); return; }
    const rp = e.target.closest('.rpc');
    if(rp){ const v = +rp.dataset.rp; H.rpn = v < 0 ? null : v; H.rk = null; draw(); return; }
    const rr = e.target.closest('tr[data-rk]');
    if(rr){ const k = +rr.dataset.rk; H.rk = H.rk === k ? null : k; draw(); return; }
    const tr = e.target.closest('tr[data-s]');
    if(tr){ H.sel = +tr.dataset.s; draw(); }
  });
  el.addEventListener('click', e => {
    const wk = e.target.closest('[data-wkapat]');
    if(wk){ H.wp = null; H.rpn = null; H.rk = null; draw(); }
  });
  svg.addEventListener('click', e => {
    const hit = e.target.closest('.rkHit');
    if(hit){
      if(hit.dataset.k != null){ const k = +hit.dataset.k; H.rk = H.rk === k ? null : k; }
      else if(hit.dataset.p != null){ H.rpn = +hit.dataset.p; H.rk = null; }
      draw(); return;
    }
    const n = e.target.closest('.wn');
    if(n){ H.sel = +n.dataset.s; draw(); }
  });
  draw();
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
  <p class="sec-p">Her kriz ya stoğun dayanma süresini kısaltır ya da tedarik süresini uzatır.
  Senaryo bu iki değişkeni değiştirir, 5.000 parça anında yeniden hesaplanır.</p>
  <div class="grid g12">
    <div class="card">
      <h3>Şok parametreleri</h3>
      <div class="hint" id="scNot">${PRESETS.baz.not}</div>
      <div class="sl"><label>Talep şoku <b id="lD">+%0</b></label><input type="range" id="sD" min="0" max="80" step="5" value="0"></div>
      <div class="sl"><label>Tedarik / TAT şoku <b id="lL">+%0</b></label><input type="range" id="sL" min="0" max="100" step="5" value="0"></div>
      <div class="sl"><label>Servis hedefi sıkılaştırma <b id="lS">+0 pp</b></label><input type="range" id="sS" min="0" max="20" step="5" value="0"></div>
      <div class="ctl" style="margin:4px 0 0">${Object.entries(PRESETS).map(([k,p]) =>
        `<span class="chip sp${k==='baz'?' on':''}" data-p="${k}">${p.ad}</span>`).join('')}</div>
      <div class="hint" style="margin-top:12px">Her senaryo farklı bir alt kümeyi vurur: motor krizi yeni nesil talebini,
      lojistik dışa bağımlı tedarik sürelerini, OEM gecikmesi küçülen modellerin talebini.</div>
    </div>
    <div class="card">
      <h3>Etki: 5.000 parça canlı yeniden hesaplanıyor</h3>
      <div class="grid g3" style="margin:12px 0 4px" id="scK"></div>
      <div style="height:210px"><canvas id="cScen"></canvas></div>
    </div>
  </div>

  <div class="grid g12" style="margin-top:14px">
    <div class="card" style="border-color:rgba(79,193,176,.35)">
      <h3 style="color:${C.teal}">Model parametreleri</h3>
      <div class="hint">Ağırlıklar, BER eşiği ve alarm tamponu buradan değiştirilir.
      Bütün sayılar tarayıcıda anında yeniden hesaplanır.</div>
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
      Simülasyon, formülle hesaplanan sonuçla <b style="color:${C.teal}">%${String(DATA.mc.uyum).replace('.',',')}</b> uyumlu.</div>
      <div style="height:200px"><canvas id="cMc"></canvas></div></div>
    <div class="card"><h3>Duyarlılık: 2033 açığını kapatma maliyetini ne oynatır?</h3>
      <div class="hint">Temel maliyet <b>${mM(DATA.tornado.baz)}</b>. Çubuklar her etkenin iki ucunu gösteriyor.
      En büyük etken <b>tedarik süreleri</b>.
      Kabiliyet yatırımı çubuğu ise 547 parçayı iç tamire almanın açığı ne kadar küçülttüğünü gösteriyor.</div>
      <div style="height:200px"><canvas id="cTornado"></canvas></div></div>
  </div>

  <div class="card" style="margin-top:14px">
    <h3>Kaynak önceliklendirme: kısıtlı bütçeyle önce ne alınır?</h3>
    <div class="hint">Bir parçaya eklenecek her adet için "harcanan para başına ne kadar risk azalıyor" hesaplanıyor ve
    ${fmt(DATA.opt.toplam_adim)} alım adımının hepsi bu ölçüye göre sıralanıyor. Eğri, sınırlı bir bütçenin nereye kadar gittiğini gösteriyor.
    Tamamı ${mM(DATA.opt.toplam_butce)} ama <b>ilk birkaç milyon dolar kazancın büyük bölümünü sağlıyor</b>.</div>
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
    <h3 style="color:${C.teal}">Kabiliyet yatırımı: öncelik sırasına göre ilk 40 aday</h3>
    <div class="hint">${K.risk_listesi} parça kritik ve iç tamiri yok, dış tamire yılda <b>${mM(K.kab_bugun)}</b> gidiyor.
    İç tamir yılda <b style="color:${C.teal}">${mM(K.kab_tasarruf)} tasarruf + ${mM(K.kab_sermaye)} serbesti</b> getirir.
    <span class="bg bg-warn">ÜÇLÜ</span> = kritik + tamirsiz + geçmişsiz.</div>
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
        <td>${LK.sub[PN.sub[i]]}</td><td style="text-align:center">${krDot(i)}</td>
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
  ['Durum rozetleri', 'TÜKENİYOR · SİPARİŞTE · DIŞA BAĞIMLI · HURDA ADAYI', 'Parçanın bugünkü hâli. TÜKENİYOR: stok yenisi gelmeden bitiyor, sipariş yok. SİPARİŞTE: stok bitiyor ama yenisi yolda. DIŞA BAĞIMLI: iç tamir yok. HURDA ADAYI: tamir ekonomik değil.'],
  ['Donörden söküm', 'Sahadaki adıyla kanibalizasyon', 'İhtiyaç duyulan parçanın, rafta bekleyen arızalı bir üniteden sökülüp kullanılması. Kayıt altında yapılır, donör borç defterine işlenir.'],
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
