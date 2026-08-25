# SENARYO / KRİZ SAYFASI — yeniden inşa şartnamesi

> **Bu dosya nedir:** Catalyst'in Senaryo (kriz simülatörü) sayfasının, başka bir sürümde
> **sıfırdan yeniden yazılabilmesi** için hazırlanmış tam şartname. Formüller, veri
> sözleşmeleri, 3D sahne mantığı, ölçülmüş tasarım kararları ve test sabitleri burada.
>
> **Claude Code'a nasıl verilir:** bu dosyayı hedef repoya kopyala, sonra:
> `KRIZ_SAYFASI.md dosyasını oku. Bölüm 2'deki ön koşulları hedef repoda doğrula, eksikleri
> raporla, sonra Bölüm 12'deki sırayla uygula. Her adımdan sonra npm test koş.`
>
> Doküman **ekran değil sözleşme** anlatır: sayı üretimi engine'de, çizim views'te. Bir
> sayı iki ekranda görünüyorsa ikisi de aynı fonksiyonu çağırır — bu kural pazarlık konusu
> değil, testler bunu kilitliyor.

---

## 1. Ne inşa ediliyor

Senaryo sekmesi bir **kriz simülatörü**dür. Tek cümlelik model:

> Her kriz ya stoğun dayanma süresini (TTS) kısaltır ya da tedarik süresini (TTR) uzatır.
> Öyleyse kriz = **parametre şoku**; stres testi, projeksiyon motorunun üstünde bir düğmedir.

Sayfanın iki iddiası var:

1. **Krizin bir ŞEKLİ vardır.** Yedi şok ekseni yedi kaydırıcı olarak dizilince "lojistik
   krizi" ile "talep patlaması" ekranda birbirine benziyordu. Radar poligonu (*şok gülü*)
   krizin parmak izini verir; preset seçilince poligon o şekle morph eder.
2. **Kriz zamana yayılır.** Şok anlık değil: tırmanma → plato → toparlanma profiliyle
   **her ay** 5.000 parça yeniden hesaplanır. 3D arazi bu takvimin *kategori × ay* yükseklik
   alanıdır ve "duvara kaçıncı ayda çarpıyoruz" sorusunu cevaplar.

Sayfanın ürettiği hiçbir sayı uydurma değildir: hepsi 5.000 parçalık payload üzerinde,
`core.py` ile birebir aynı formüllerle hesaplanır.

---

## 2. Ön koşullar — hedef repoda ne olmalı

Bu sayfa aşağıdakilerin **üstüne** kurulur. Eksik varsa önce onlar tamamlanmalı; hiçbiri
bu iş kapsamında yeniden yazılmaz.

### 2.1 Bağımlılıklar (package.json)

| Paket | Sürüm (referans) | Bu sayfada ne için |
|---|---|---|
| `react`, `react-dom` | ^19.2 | — |
| `typescript` | ^7.0 | — |
| `vite` + `@vitejs/plugin-react` | ^8.1 / ^6.0 | `lazy()` chunk bölme |
| `three` | ^0.185 | 3D arazi |
| `@react-three/fiber` | ^9.6 | React ↔ three köprüsü (`Canvas`, `useFrame`) |
| `@react-three/drei` | ^10.7 | **yalnız `OrbitControls`** (`Html` bilinçli kullanılmıyor, bkz. §6.5) |
| `chart.js` + `react-chartjs-2` | ^4.5 / ^5.3 | 5 grafik |
| `zustand` | ^5.0 | senaryo/profil/ay durumu |
| `vitest` | ^4.1 | parite testleri |
| `framer-motion` | ^12 | (sayfa doğrudan kullanmaz; morph elle yazıldı — bkz. §7.3) |

### 2.2 Payload alanları (`@/data/payload`)

Kolon dizisi (struct-of-arrays) düzeni **şart**: 5.000 nesne yerine paralel diziler, çünkü
kriz takvimi ~24 ay × 5.000 parça = 120.000 hesabı tek karede yapıyor.

```ts
PN.t25[i]     // 2025 yıllık talep
PN.rate33[i]  // 2033 çeyreklik talep oranı (SBA türevi)
PN.svc[i]     // kullanılabilir stok (faal + homebase depo)
PN.ttr[i]     // etkin tamir/temin süresi (gün)
PN.lead[i]    // tedarik lead time (gün)
PN.ato[i]     // 1 = atölye kabiliyeti VAR
PN.kr[i]      // kritiklik indeksi 0=AOG 1=KRİTİK 2=DEĞİL
PN.sub[i]     // ATA alt kategori indeksi (0..25) → LK.sub
PN.sh[i]      // servis hedefi (0.98 / 0.95 / 0.90)
PN.clp[i]     // liste fiyatı (USD)
PN.disrep[i]  // dış tamir maliyeti (USD)
PN.exin[i], PN.exout[i]  // havuz/exchange giriş-çıkış adedi
PN.id[i], PN.flags[i]
NPN           // 5000
B             // {alt, ust, motor} — 2033 talep bandı
PRM.ceyrek_gun // 91.25
LK.sub[], LK.kr[]
K.*           // KPI'lar (ber_pn, siparissiz, aktif_pn, risk_listesi, kab_* …)
D.opt, D.tornado, D.roi, D.mc  // build zamanı referans serileri
PIDX          // PN kodu → indeks
```

### 2.3 Engine yardımcıları

- `engine/stats.ts` → `poissonMin(mu, h)`, `poisCdf(mu, s)`, `eksikMoment(mu, s)`, `Z`
- `engine/flags.ts` → `FL`, `hasF(i, flag)`, `FlagKey`
- `engine/format.ts` → `fmt` (tr-TR binlik), `f1`, `mM` ($x.xM), `mUsd`, `vir` (nokta→virgül)
- `design/renkler.ts` → `CC as C`, `tint(hex, k)`, `lerpColor(t)`

### 2.4 Ortak bileşenler

`components/temel.tsx` → `Bolum`, `Kart` (`baslik`/`sag`/`ipucu`/`stil` prop'ları), `Izgara`
(`tip="g2" | "g21" | "g4"`), `Cip` (`acik`/`baslik`), `Rozet` (`tip="red|warn|teal|mor|aog|kri|nk"`),
`Yigin`. `components/Grafik.tsx` Chart.js sarmalayıcısı; **`onSec(i)` prop'u gerekli**
(takvim grafiğinde noktaya tıklayınca ay değişiyor).

### 2.5 Sözleşme kuralları (bunlar bozulursa iş yanlış yapılmış demektir)

1. **Hesap `engine/`de, çizim `views/`te.** `views/` altında yeni bir sayı türetilmez.
2. **Nötr ayar eski davranışı BİREBİR verir.** Bütün yeni eksenlerin nötr değeri 0'dır;
   `BAZ_CFG` ile kırmızı **134** / AOG kritik **22** çıkmak zorundadır.
3. **Geometri three.js bilmez.** `araziGeo.ts` saf matematiktir, testleri node'da koşar.
   (Repodaki `kureGeo.ts` ile aynı seam.)

---

## 3. Dosya haritası

| Dosya | ~satır | İş |
|---|---:|---|
| `engine/senaryo.ts` | 580 | **genişletilir**: 6 → 11 şok ekseni, preset kütüphanesi, `senaryoHesap`, belirsizlik, dağılımlar |
| `engine/kriz.ts` | 180 | **yeni**: kriz profilleri, şiddet eğrisi, ay ay takvim |
| `engine/tahsis.ts` | 225 | **yeni**: greedy bütçe tahsisi + tornado duyarlılığı |
| `views/senaryo/araziGeo.ts` | 180 | **yeni**: ızgara/yerleşim/renk rampası — saf matematik |
| `views/senaryo/Arazi.tsx` | 340 | **yeni**: R3F sahnesi (instanced çubuklar, tarama, etiket katmanı) |
| `views/senaryo/SokGulu.tsx` | 370 | **yeni**: radar kontrol yüzeyi (SVG) |
| `views/senaryo/alarmlar.ts` | 285 | **yeni**: eşik tabanlı uyarı rayı üreteci |
| `views/Senaryo.tsx` | 1150 | **yeniden yazılır**: sayfa düzeni, 5 grafik, HUD |
| `design/senaryo.css` | 510 | **yeni**: gül, takvim şeridi, alarm kartları, arazi HUD |
| `app/store.ts` | +12 | `profil`, `ay`, `profilSec`, `aySec` alanları |
| `views/senaryo/araziGeo.test.ts` | 170 | **yeni**: 17 geometri/renk testi |
| `engine/engine.test.ts` | +240 | **yeni testler**: eksenler, takvim, tahsis (toplam 85) |

Ayrıca: `views/senaryo/ParamPanel.tsx` → `views/ongoru/ParamPanel.tsx` **taşınır**. Gerekçe:
burada kriz *simüle* edilir, Öngörü'de model *kalibre* edilir. Parametreler mağazada ortak
kaldığı için iki ekran aynı kırmızı sayısını üretmeye devam eder.

---

## 4. Katman 1 — `engine/senaryo.ts` (şok eksenleri)

### 4.1 SenaryoCfg — 11 eksen

```ts
export interface SenaryoCfg {
  d: number;        // genel talep şoku (%)          → λ büyür, TTS kısalır
  l: number;        // tedarik/TAT şoku (%)          → TTR ve lead uzar
  s: number;        // servis hedefi sıkılaştırma (puan) → MIN yükselir
  yeniDem: number;  // yeni nesil talep ÇARPANI (0 = etkisiz)
  kuculDem: number; // küçülen model talep ÇARPANI (0 = etkisiz)
  disOnly: boolean; // TAT şoku yalnız dışa bağımlıya
  icKap: number;    // iç tamir kapasitesi kaybı (%) → YURTİÇİ TAT çarpanı
  gumruk: number;   // gümrük/lojistik kuyruğu (+gün) → dış kanala TOPLAMSAL
  havuz: number;    // havuz erişim kaybı (%)        → $ maruziyeti, adet değil
  kur: number;      // kur şoku (%)                  → $ fatura + nakit koruma modu
  filoUc: number;   // filo bandında konum (−1..1)   → −1 alt uç · 0 motor · +1 üst uç
}
```

`const NOTR = { icKap: 0, gumruk: 0, havuz: 0, kur: 0, filoUc: 0 }` — preset tanımları bunun
üstüne yazar, böylece yeni bir eksen eklendiğinde 11 preset'i tek tek düzeltmek gerekmez.

### 4.2 Süre şoku — kanal tipine göre ayrışır

Bütün mesele burada. **Çarpan mı toplamsal mı** sorusu krizin karakterini belirler:

```ts
function sureSok(gun: number, ic: boolean, cfg: SenaryoCfg): number {
  let g = gun;
  if (ic) g *= 1 + cfg.icKap / 100;          // iç kapasite kaybı YALNIZ atölyesi olanı vurur
  if (!(cfg.disOnly && ic)) g *= 1 + cfg.l / 100;
  if (!ic) g += cfg.gumruk;                   // TOPLAMSAL, yalnız dış kanal
  return g;
}
export const ttrSok  = (i, cfg) => sureSok(PN.ttr[i],  PN.ato[i] === 1, cfg);
export const leadSok = (i, cfg) => sureSok(PN.lead[i], PN.ato[i] === 1, cfg);
```

Gümrüğün toplamsal olması **anlatının parçası**: Kızıldeniz tipi tıkanma süreyi oranla değil
blok hâlinde uzatır, bu yüzden kısa TAT'lı parçaları yüzdece daha sert vurur. Testte de
kilitlidir (§11).

### 4.3 Talep çarpanı ve filo bandı

```ts
function talepCarpani(i, cfg) {
  let m = 1 + cfg.d / 100;
  if (cfg.yeniDem  && hasF(i, FL.YENI)) m *= cfg.yeniDem;
  if (cfg.kuculDem && hasF(i, FL.PO))   m *= cfg.kuculDem;
  return m;
}

// filoUc = 0 tam olarak 1,0 vermeli (motor bandın ortasında DEĞİL → asimetrik interpolasyon)
export function bandCarpani(cfg) {
  const u = cfg.filoUc;
  if (!u) return 1;
  return u < 0 ? 1 + u * (1 - B.alt / B.motor) : 1 + u * (B.ust / B.motor - 1);
}

const kurCarpani = (cfg) => 1 + cfg.kur / 100;  // YALNIZ $ kalemlere, adetlere DOKUNMAZ
```

### 4.4 `senaryoHesap(cfg, params)` — tek geçiş, 5.000 parça

Döndürdüğü `SenaryoSonuc`:

| Alan | Anlamı |
|---|---|
| `kir`, `kirAog` | kırmızı parça sayısı / AOG kritik olanları |
| `kap` | kırmızıları TTR seviyesine çıkarma maliyeti (USD, kur şoklu) |
| `acik`, `ek` | 2033 MIN altında kalan PN sayısı / kapatma faturası |
| `byKr[3]` | kritiklik sınıfına göre kırmızı dağılımı |
| `byKat[26]` | ATA alt kategorisine göre kırmızı — **3D arazinin yakıtı** |
| `poolKayipPn`, `poolEk` | havuz kaybının beklenen-değer maliyeti |
| `berEtkin`, `berPn` | nakit koruma modunda kayan BER eşiği ve aday sayısı |
| `ortTtr`, `enKotuMarj` | şoklu ortalama TTR / en kötü emniyet marjı (gün) |

Döngünün özü:

```ts
const uBand = bandCarpani(cfg);
const kurC  = kurCarpani(cfg);
const berEtkin = Math.min(0.9, params.ber * kurC);   // nakit koruma modu

for (let i = 0; i < NPN; i++) {
  const mDem = talepCarpani(i, cfg);
  const ic = PN.ato[i] === 1;
  const t  = PN.t25[i];

  if (t > 0) {                                  // --- bugünün kırmızı testi
    const lam = (t * mDem) / 365;
    const tts = PN.svc[i] / lam;
    const ttr = sureSok(PN.ttr[i], ic, cfg);
    if (tts < ttr + params.tampon) {
      kir++; byKr[PN.kr[i]]++; byKat[PN.sub[i]]++;
      if (PN.kr[i] === 0) kirAog++;
      kap += (ttr - tts) * lam * PN.clp[i];
    }
  }

  // --- 2033 planı: MIN seviyesi ve açık
  const mu  = (PN.rate33[i] * mDem * sureSok(PN.lead[i], ic, cfg) * uBand) / QD;
  const min = poissonMin(mu, Math.min(0.995, PN.sh[i] + cfg.s / 100));
  const eksik = min - PN.svc[i];
  if (eksik > 0) {
    acik++; ek += eksik * PN.clp[i];
    if (PN.exin[i] + PN.exout[i] > 0) {          // havuz kanalı olan parça
      poolAday++;
      poolFark += 0.9 * PN.clp[i] * eksik;       // %10 değişim ücreti yerine liste fiyatı
    }
  }
  if (PN.disrep[i] / PN.clp[i] > berEtkin) berPn++;
}
// dönüşte: kap *= kurC, ek *= kurC, poolEk = (havuz/100) * poolFark * kurC
```

**Havuz ekseninin inceliği:** TTS ve TTR değişmez → *kırmızı sayısı sabit kalır*. Değişen
para. Bu bilinçlidir ve alarm metni bunu açıkça söyler: "havuz karşılıklı sigortadır,
faturası ancak çekilince görünür."

### 4.5 Preset kütüphanesi (11 adet)

| Anahtar | Ad | Ayar | Anlatı |
|---|---|---|---|
| `baz` | Baz durum | hepsi 0 | kırmızı 134 burada doğrulanır |
| `motor` | Motor ailesi krizi | `l:30, yeniDem:1.5, disOnly` | 2033 filosunun %64'ü 5 yeni nesil modelde |
| `pandemi` | Pandemi tipi şok | `d:20, l:50, icKap:50` | talep ve tedarik aynı anda |
| `oem` | OEM teslimat gecikmesi | `l:15, kuculDem:1.25, disOnly` | klasikler geç emekli olur |
| `lojistik` | Lojistik krizi | `l:60, disOnly` | satın alma 270 güne çıkabiliyor |
| `patlama` | Talep patlaması | `d:40, l:20, s:10` | — |
| `gumruk` | Gümrük tıkanması | `gumruk:45, disOnly` | toplamsal gecikme farkı |
| `atolye` | Atölye kapasite kaybı | `icKap:80` | 547 listesi bu şoktan etkilenmez |
| `havuzCekilme` | Havuz ortağı çekilmesi | `havuz:70` | adet sabit, fatura büyür |
| `kur` | Kur şoku | `kur:40` | nakit koruma modu |
| `bilesik` | Bileşik kriz | `d:15,l:40,s:5,yeniDem:1.35,disOnly,icKap:40,gumruk:20,havuz:40,kur:25,filoUc:0.6` | krizler sırayla gelmez |

Her preset'in bir `not` metni var ve bu metin ekranda kartın ipucu olarak gösterilir —
kullanıcı neyi simüle ettiğini okumadan düğmeye basmasın.

### 4.6 Dağılımlar

```ts
export const TTS_KOVA  = [0,30,60,90,120,150,180,240,300,365,1e9];
export const MARJ_KOVA = [-1e9,-60,-30,-14,0,14,30,60,120,240,1e9];
export const MARJ_KIRMIZI = 4;   // ilk 4 kova negatif marj = kırmızı liste
```

`ttsDagilim(cfg)` ve `marjDagilim(cfg)` 10'ar kova döner. **Neden ikisi de var:** TTS =
stok/talep olduğu için tedarik süresini *tanım gereği* görmez — lojistik krizinde TTS
kımıldamaz ama parça kırmızıya düşer. Marj (TTS − TTR) her iki şoku da görür ve negatif
olması "kırmızı" ile aynı şeydir. Varsayılan görünüm marjdır; TTS'in bu sınırı ekranda
gizlenmez, yazıyla söylenir.

### 4.7 Belirsizlik (mevcutsa korunur)

`belirsizlik(cfg, G=9)` — açıkta kalan parça sayısı bağımsız Bernoulli'lerin toplamıdır
(Poisson-binom): ortalama Σp, varyans Σp(1−p), yüzdelikler merkezi limit yaklaşımıyla.
Talep bandı G noktalı ızgarayla taranır → varyans "bilmediğimiz büyüme" (bant) ve "doğası
gereği rastgele arıza" (Poisson) diye ikiye ayrışır. Bandı burada taradığımız için
`cfg.filoUc` bilinçli olarak devre dışıdır (`senaryoMu(i, cfg, u)` üçüncü argümanı).

---

## 5. Katman 2 — `engine/kriz.ts` (kriz takvimi)

### 5.1 Profiller

```ts
export interface Profil { ad: string; not: string; tirmanma: number; plato: number; toparlanma: number; }

PROFILLER = {
  ani:         { tirmanma: 1, plato:  3, toparlanma: 5 },  // Ani darbe        → 10 ay
  kademeli:    { tirmanma: 4, plato:  6, toparlanma: 8 },  // Kademeli         → 19 ay
  surukleyen:  { tirmanma: 6, plato: 14, toparlanma: 6 },  // Uzun sürükleyen  → 27 ay
};
export const ayN = (p) => 1 + p.tirmanma + p.plato + p.toparlanma;   // 0. ay = kriz öncesi
```

### 5.2 Şiddet eğrisi

```ts
export function siddet(p: Profil, ay: number): number {   // → w ∈ [0,1]
  if (ay <= 0) return 0;                                  // ay 0 = kriz ÖNCESİ (baz)
  if (ay <= p.tirmanma) return ay / p.tirmanma;
  if (ay <= p.tirmanma + p.plato) return 1;
  const k = ay - p.tirmanma - p.plato;
  return k >= p.toparlanma ? 0 : 1 - k / p.toparlanma;
}
```

### 5.3 Ölçekleme — iki kritik kural

```ts
export function olcek(cfg: SenaryoCfg, w: number): SenaryoCfg {
  return {
    d: cfg.d * w, l: cfg.l * w, s: cfg.s * w,
    icKap: cfg.icKap * w, gumruk: cfg.gumruk * w, havuz: cfg.havuz * w, kur: cfg.kur * w,
    // ÇARPANLAR 1'den başlar: w=0'da 1,0 (etkisiz) olmalı, 0 DEĞİL
    yeniDem:  cfg.yeniDem  ? 1 + (cfg.yeniDem  - 1) * w : 0,
    kuculDem: cfg.kuculDem ? 1 + (cfg.kuculDem - 1) * w : 0,
    // YAPISAL VARSAYIMLAR ölçeklenmez — filo 2033'e giderken krizle tırmanıp inmez
    disOnly: cfg.disOnly, filoUc: cfg.filoUc,
  };
}
```

Bu iki kural (çarpan tabanı 1, yapısal varsayım sabit) testte kilitli. Yanlış yapılırsa
0. ay baz durumu vermez ve sayfanın bütün "baz ↔ senaryo" karşılaştırmaları çürür.

### 5.4 `krizTakvim(cfg, profil, params)`

Her ay için `senaryoHesap(olcek(cfg, w))` + `marjDagilim(olcek(cfg, w))` koşar, döner:

```ts
{ aylar: [{ ay, w, r: SenaryoSonuc, marj: number[10] }],
  duvarAy,        // kırmızının zirveye çıktığı ay
  zirveKir, zirveKap, zirveAcik,
  kirmiziAy,      // Σ kırmızı — birim: parça·ay (krizin toplam ağırlığı)
  toparlanmaAy,   // zirveden sonra kırmızının baz+%5'e döndüğü ilk ay; −1 = dönmüyor
  bazKir, bazKap }
```

**Bilinçli kısıtlama:** `kap` bir *stok* büyüklüğüdür (kaç adet eksiğiz × birim fiyat),
akış değil. Aylar boyunca toplanırsa aynı eksik defalarca sayılır — bu yüzden **kümülatif $
raporlanmaz**; zirve maruziyet ve parça·ay raporlanır. Bu, dokümanın en kolay ihlal edilen
maddesi; "toplam kriz maliyeti" diye bir sayı üretme isteğine direnilmeli.

Maliyet: 5.000 parça × ~24 ay tarayıcıda tek karede biter, ama `useMemo` ile sarılmalı
(içinde Poisson kuantili var).

---

## 6. Katman 3 — `engine/tahsis.ts`

### 6.1 Greedy tahsis: "önce hangi parça alınır?"

Formül açık yazılır (payload'daki build-zamanı eğrisi ayrı bir kodla üretildi; ikisi
grafikte **yan yana** durur, birbirinin yerine geçmez):

```
stok s iken yetmeme olasılığı = 1 − F(s)              [F = Poisson CDF]
s → s+1 adımının kazandırdığı = F(s+1) − F(s) = P(D = s+1)
ağırlıklı kazanım             = w(kritiklik) · P(D = s+1)
verim                         = ağırlıklı kazanım / birim maliyet
```

Bütün adımlar verime göre sıralanır, kümülatif eğri çıkar. Parça başına adım sayısı
`ADIM_TAVAN = 40` ile sınırlı (ötesinde marjinal kazanım ölçülemeyecek kadar küçük).
Eğri Chart.js'e **90 noktaya indirgenerek** verilir — 10.000 adımın hepsi görselde hiçbir
şey eklemiyor, canvas'ı yavaşlatıyor. `butce80` = kazanımın %80'inin dolduğu bütçe ($M);
"ilk birkaç milyon işi bitiriyor" iddiasının sayısı budur.

`ilk10`: verim sırasında **ilk kez görülen** parçalar (aynı parça birden çok adımla listeyi
doldurmasın).

### 6.2 Tornado duyarlılığı

Altı etken, **seçili senaryonun etrafında** iki uca çekilir (baz duruma göre değil — kriz
derinleştikçe baskın etken değişir, tablo bunu göstermeli):

| Etken | Düşük | Yüksek |
|---|---|---|
| Filo büyüme bandı | `filoUc: -1` | `filoUc: 1` |
| Tedarik süreleri ±%20 | `l: cfg.l-20` | `l: cfg.l+20` |
| Gümrük kuyruğu | `gumruk: 0` | `gumruk: cfg.gumruk+30` |
| İç kapasite kaybı | `icKap: 0` | `icKap: cfg.icKap+50` |
| Servis hedefi | `s: cfg.s-2` | `s: cfg.s+1` |
| Kur | `kur: 0` | `kur: cfg.kur+30` |

İmza `duyarlilik(cfg, hesap: (c) => number)` — ölçülen büyüklük dışarıdan verilir; sayfa
`(c) => senaryoHesap(c, params).ek / 1e6` geçiyor. **Kabiliyet yatırımı bu listede yok**:
o bir şok ekseni değil bir karar, kendi ROI panelinde duruyor.

---

## 7. Katman 4 — 3D arazi

### 7.1 Neden arazi, neden küre değil

Uygulamada zaten iki küre var (CODE parça çekirdeği, harita dünyası). Buradaki veri
**coğrafi değil**: iki eksenli bir ızgara — *kategori × ay*. Doğru gösterim yükseklik alanı.

**Neden yüzey değil çubuk:** kategoriler sürekli bir eksen değil; aralarını interpolasyonla
doldurmak var olmayan ara değerler uydurmak olurdu. Çubuk ayrık veriyi ayrık gösterir.

### 7.2 `araziGeo.ts` — saf matematik (three.js BİLMEZ)

```ts
export interface Hucre { ix: number; iz: number; v: number; t: number; }  // t = v/maks ∈ 0..1
export interface Arazi {
  mod: 'kategori' | 'marj'; nx: number; nz: number;
  hucreler: Hucre[]; maks: number;
  satirEt: string[]; satirIdx: number[]; ayEt: string[]; kirmiziSatir: number;
}

araziKur(seriler: number[][], etiketler: string[], mod, sirala: boolean, kirmiziSatir = 0): Arazi
```

- `seriler[ay][satır]` — kategori modunda `tk.aylar.map(a => a.r.byKat)` (26 satır),
  marj modunda `tk.aylar.map(a => a.marj)` (10 kova).
- **Kategori sırası:** ATA kodları bir şiddet ekseni değil. Yüzeyin okunabilir olması için
  satırlar **baz ayın (ay 0) değerine göre azalan** sıralanır → ön sıra en kötü kategori,
  derinlik ekseni de anlam taşır. Marj modunda kovalar zaten sıralı, dokunulmaz.
- Sıralama açıkken `kirmiziSatir` sıfırlanır: kovaların yeri değişince "kırmızı bölge"
  kavramı düşer.

Yerleşim ve ölçüler:

```ts
export const OLCU = { gen: 13, der: 9, boy: 3.4 };   // genişlik(ay) × derinlik(satır) × maks boy

hucreYer(h, a, o = OLCU) → {
  x: (h.ix + 0.5) * gx - gen/2,
  z: (h.iz + 0.5) * gz - der/2,
  y: Math.max(0.02, h.t * boy),   // minimum görünür yükseklik: "veri yok" ≠ "değer sıfır"
  gx, gz,
}
kameraKonum(o) → [gen*0.62, boy*2.5, der*1.42]   // sabit, eğik bakış
taramaX(ay, a, o)  → seçili ayın dünya x'i
```

Renk rampası — **açık zemin için**, üç durak:

```ts
const DURAK = [
  [0.725, 0.753, 0.784],  // #B9C0C8 nötr ORTA gri
  [0.776, 0.635, 0.420],  // #C6A26B altın
  [0.757, 0.071, 0.122],  // #C1121F kritik
];
rampaRgb(t) → [r,g,b] ∈ 0..1     // three için
rampaHex(t) → '#rrggbb'          // CSS efsane şeridi + takvim şeridi için
```

İki ölçülmüş karar: **(a)** soğuk uç bilerek açık gri değil orta gri — ilk denemede `#E7EBEF`
ile başlıyordu ve beyaz zeminde çubukların yarısı görünmüyordu. **(b)** Marka kırmızısı
`#E81932` rampada **yok**: bu bir veri serisi, kimlik değil. Test bunu kilitliyor.

### 7.3 `Arazi.tsx` — R3F sahnesi

**Çubuklar — tek `InstancedMesh`, her karede matris + renk güncellemesi:**

```tsx
const mesh = useRef<THREE.InstancedMesh>(null);
const su    = useRef(new Float32Array(n));   // mevcut yükseklikler
const hedef = useRef(new Float32Array(n));   // hedef yükseklikler

// senaryo değişince HEDEF güncellenir, MEVCUT korunur → çubuklar eski hâlden yenisine AKAR
useEffect(() => { /* hedef.current[i] = hucreYer(a.hucreler[i], a).y */ }, [a, n]);

useFrame((_, dt) => {
  const k = 1 - Math.exp(-dt * 8);           // kritik sönümlü, kare süresinden BAĞIMSIZ (~400 ms)
  for (let i = 0; i < n; i++) {
    const d = hedef.current[i] - su.current[i];
    su.current[i] = Math.abs(d) > 1e-4 ? su.current[i] + d * k : hedef.current[i];
    const h = su.current[i], p = hucreYer(a.hucreler[i], a);
    dummy.position.set(p.x, h / 2, p.z);
    dummy.scale.set(p.gx * 0.78, h, p.gz * 0.78);   // 0.78 → çubuklar arası nefes payı
    dummy.updateMatrix();
    mesh.current.setMatrixAt(i, dummy.matrix);
    renk.setRGB(...rampaRgb(h / OLCU.boy));         // renk ANLIK yükseklikten → animasyon boyunca tutarlı
    mesh.current.setColorAt(i, renk);
  }
  mesh.current.instanceMatrix.needsUpdate = true;
  if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
});
```

`<instancedMesh args={[undefined, undefined, n]}>` + `<boxGeometry args={[1,1,1]}/>` +
`<meshStandardMaterial roughness={0.62} metalness={0.04}/>`. Hover `onPointerMove` içinde
`e.instanceId` ile hücreye çevrilir (`e.stopPropagation()` şart).

**Sahnede ayrıca:**
- `Zemin` — `planeGeometry` taban (arka plandan **bir ton açık**: `#fbfcfd` vs `#eef1f4`) +
  elle kurulan `BufferGeometry` `lineSegments` ızgara çizgileri. `geo.dispose()` cleanup'ta.
- `Tarama` — seçili ayı işaretleyen yarı saydam düzlem; hedefe `1 - exp(-dt*9)` ile kayar,
  opaklığı `0.1 + 0.05·sin(t·2.4)` ile hafif nabız atar (dikkat çeker, veriyi bastırmaz).
- Işık: `ambientLight 1.05` + iki `directionalLight` (1.25 ana, 0.32 dolgu) — beyaz zeminde
  mimari maket görünümü.
- `OrbitControls makeDefault enablePan={false} enableZoom={false} minPolarAngle={0.25}
  maxPolarAngle={π/2 - 0.05} rotateSpeed={0.5} enableDamping dampingFactor={0.08}`.
- `Canvas camera={{ position: kameraKonum(), fov: 40 }} dpr={[1,2]} gl={{ antialias: true,
  alpha: false }}`, `onCreated` içinde `setClearColor` + `webglcontextlost` → `preventDefault()`
  (yoksa tarayıcı sahneyi sessizce ölü bırakıyor, HTML katmanı çalıştığı için ekranda
  etiketler kalıp arazi kayboluyor).

### 7.4 Tekerlek yakınlaştırma KAPALI

Sahne sayfanın ortasında; tekerlek yutulunca sayfa kaydırılamıyor (CODE küresinde ölçülmüş
karar). Yakınlaştırma köşedeki `+` / `−` düğmelerinde: bir `Yakinlastirici` bileşeni
`useFrame` içinde kamera uzaklığını `9..46` aralığında hedefe yaklaştırır ve dışarıya bir
`(y: number) => void` callback'i `ref` üzerinden kaydeder; sayfa `zoomRef.current?.(0.82)`
diye çağırır.

### 7.5 Etiketler drei `Html` DEĞİL

drei her etiket için tuvali kaplayan bir sarmalayıcı div açıyor ve sahnedeki tıklamayı
yutuyor (DOM'da doğrulandı). Bunun yerine:

- Etiketler normal `<span>`'ler, `.arazi-et` katmanında, `position: absolute`, `opacity: 0`.
- Sahne içindeki `Etiketler` bileşeni **hiçbir şey render etmez** (`return null`), her karede
  `useFrame` içinde 3D konumu `v.project(camera)` ile ekrana yansıtır ve `el.style.transform`
  yazar.
- `v.z > 1` ise (kamera arkası) `opacity: 0`.
- **Çakışma eleme:** yerleşen etiketlerin ekran koordinatları bir dizide tutulur; yeni etiket
  58px yatay / 15px dikey içinde bir komşuya düşerse gizlenir.
- Bütçe: satır etiketlerinden yalnız **ilk 8** (sıralı olduğu için en kötü kategoriler), ay
  etiketlerinden **seçili ay + her 3'üncü** gösterilir. Hepsi basılsa 53 etiket olurdu.

### 7.6 Hata sınırı

`SahneKalkani` (küçük bir `componentDidCatch` sınıfı) sahneyi sarar; WebGL açılmazsa yedek
metin gösterir ve **sayfanın bütün sayıları çalışmaya devam eder**. Sahne `lazy()` +
`Suspense` ile yüklenir, three ayrı chunk'ta kalır. Her sahnenin kendi sınırı olmalı — tek
ortak sınır bütün sekmeleri birlikte düşürür.

---

## 8. Katman 5 — `SokGulu.tsx` (radar kontrol)

### 8.1 Eksenler

Gülde **7 eksen** var: `d` (TALEP, max 80, adım 5), `l` (TAT, 100/5), `gumruk` (GÜMRÜK, 90/5,
"+N g"), `icKap` (ATÖLYE, 120/10), `havuz` (HAVUZ, 100/5, "−%N"), `kur` (KUR, 100/5),
`s` (SERVİS, 20/1, "+N pp"). Her eksenin `tam` adı, `bicim` fonksiyonu ve `ipucu` metni var;
gülün sağındaki okunuş listesi **aynı diziden** üretilir.

**`filoUc` bilinçli olarak gülde YOK:** o bir kriz şoku değil, filo büyüme bandındaki yapısal
varsayım (kriz takviminde de ölçeklenmiyor). Gülün merkezi "kriz yok" demek zorunda; iki
yönlü bir eksen bu anlamı bozardı. Aynı şekilde `yeniDem`/`kuculDem`/`disOnly` de gülde değil,
altındaki çip satırında.

### 8.2 Geometri

```ts
const KUTU = 340, CX = 170, CY = 170, R = 112, ET_UZ = 24, TABAN = 5;
const HALKA = [0.25, 0.5, 0.75, 1];
const aci   = (i) => -Math.PI/2 + (i * 2π) / N;             // ilk eksen tepede
const nokta = (i, r) => [CX + cos(aci(i))*r, CY + sin(aci(i))*r];
// değer → yarıçap:  TABAN + oran * (R - TABAN)   ← TABAN sayesinde sıfırda poligon merkeze çökmez
```

**viewBox bilerek 340×340:** SVG içinde CSS `font-size`/`stroke-width` kullanıcı birimindedir
ve viewBox ölçeğiyle çarpılır. 100 birimlik kutuda "9px" yazı ekranda 30px oluyordu (ölçüldü).
Kutuyu gülün doğal piksel boyuna eşitleyince stil dosyasındaki sayılar gerçekten piksel gibi
davranır.

### 8.3 Sürükleme

İmleç konumu eksene **izdüşürülür** (dairesel değil, doğrusal):

```ts
const izd  = (sx - CX) * Math.cos(a) + (sy - CY) * Math.sin(a);
const oran = clamp01((izd - TABAN) / (R - TABAN));
const deger = Math.round(oran * e.max / e.adim) * e.adim;
```

`setPointerCapture` ile tutamak yakalanır. Görünmez `r=16` bir daire dokunma alanı olarak
üstte durur — 6px'lik daire parmakla tutulamıyor, sürükleme ıskalanıyordu.

### 8.4 Morph

framer-motion SVG `points` dizesini interpolate **etmez**, CSS de edemez → elle yazıldı:
`useMorph(hedef, anlik)` hook'u, `anlik` (sürükleme) sırasında interpolasyonu atlar (imleçle
poligon arasında gecikme hissi olmamalı), preset değişiminde **280 ms easeOutCubic**
(`1-(1-u)³`) ile `requestAnimationFrame` döngüsü koşar.

Kesikli ikinci poligon = seçili preset'in **değiştirilmemiş** hâli; elle ne kadar sapıldığı
görünür.

### 8.5 Erişilebilirlik

Her tutamak `tabIndex={0} role="slider" aria-valuemin/max/now/valuetext` taşır; ok tuşları
± adım, `Home` = 0, `End` = maks. Sürükleme tek yol değil.

---

## 9. Katman 6 — `alarmlar.ts` (uyarı rayı)

Sayfanın "akıllı uyarı" katmanı. **Dürüstlük kuralı — CODE'daki `icgoru.ts` ile birebir
aynı:** dil katmanı (cümle kalıpları, eşikler, öncelik sırası, güven yüzdeleri) kodda
**sabittir**; içindeki sayıların **hepsi** senaryo motorundan canlı gelir. Ekranda bu ayrım
yazıyla belirtilir — ray "LLM üretti" gibi sunulmaz.

İmza: `alarmlar(cfg, r, baz, tk, params): Alarm[]`

```ts
interface Alarm {
  id: string; tip: 'al'|'uy'|'bl'|'iy';  // ALARM · UYARI · BİLGİ · SAKİN
  kod: string;      // SEN-A01…A11, SEN-A00
  guven: number;    // sabit beyan
  baslik: string; metin: string; eylem?: string;
  flag?: FlagKey;                                    // → watchlist'i süzülü aç
  hedef?: 'takvim'|'arazi'|'dagilim'|'belirsizlik'|'roi';  // → sayfa içi kaydır
}
```

**Alarm bir eşik aşımıdır: koşulu sağlanmayan alarm listeye hiç girmez.** Baz durumda ray
neredeyse boştur — sakin ekran, sakin sistem demektir. Kartlar `tip` sırasına göre dizilir
(al → uy → bl → iy).

| Kod | Tetik | Söylediği |
|---|---|---|
| A01 | `zirveKir > bazKir·1.15` | duvara kaçıncı ayda çarpılıyor, sipariş penceresi ondan önce kapanır |
| A02 | A01 + `toparlanmaAy === -1` | kırmızı baz seviyeye dönmüyor → tampon kriz içinde tükendi |
| A03 | `r.kirAog > baz.kirAog` | AOG kritik artışı; her biri "yerde uçak" |
| A04 | `havuz > 0 && poolEk > 0` | kırmızı DEĞİŞMİYOR, değişen para |
| A05 | `kur > 0` | nakit koruma modu, BER eşiği kayması, kaç parça tamire döndü |
| A06 | `gumruk > 0` | ortalama TTR kayması; toplamsal ≠ oransal |
| A07 | `icKap > 0` | kırmızı sabitse "kabiliyetin değeri tam olarak bu tampon" |
| A08 | şok var + zirve > baz | zirvede yükün toplandığı ATA kategorisi (`byKat` maksimumu) |
| A09 | `r.acik > baz.acik` | 2033 MIN altı + fatura; "nokta tahmin değil, aralığı var" |
| A10 | `kirmiziAy > bazKir·ay·1.2` | kriz yükü parça·ay; zirve tek başına yetmez |
| A11 | `enKotuMarj < 0` | en kötü emniyet marjı; marjın negatif tarafı = kırmızı liste |
| A00 | hiç şok yok | "bugünün fotoğrafı" — 134 kırmızı, 72 siparişsiz, bir preset seçin |

---

## 10. Katman 7 — `Senaryo.tsx` sayfa düzeni

### 10.1 Bölüm sırası

| # | Bölüm | İçerik |
|---|---|---|
| SEN-01 | **Kriz arazisi + Şok gülü** (`Izgara tip="g21"`) | 3D arazi (kategori×ay / marj×ay çipleri, HUD, efsane, ±zoom) · gül + 11 preset çipi + alt küme çipleri + filo ucu |
| SEN-02 | **Kriz takvimi** | profil çipleri · tıklanabilir ay şeridi (`.ktak`, çubuk boyu = kırmızı, rengi `rampaHex`) · 4 istatistik: zirve kırmızı, duvara çarpma, zirve açık pozisyon, kriz yükü |
| SEN-03 | **Seçili ay etkisi** (`g4`) | kırmızı · AOG kritik · 2033 MIN altı · kapatma faturası — hepsi baz ile delta |
| SEN-04 | **Kriz alarmları** | alarm kartları + dürüstlük notu |
| SEN-05 | **Takvim grafiği + kritiklik** (`g21`) | çift eksenli çizgi (kırmızı alan / $M kesikli) · baz↔ay bar |
| SEN-06 | **Dayanıklılık dağılımı** | emniyet marjı ↔ dayanma süresi çipleri; marjda ilk 4 kova kırmızı |
| SEN-07 | **Belirsizlik** | mevcut `Belirsizlik` bileşeni |
| SEN-08 | **Duyarlılık + tahsis** (`g2`) + ilk 10 tablosu | tornado · bütçe eğrisi (canlı + build zamanı gri referans) |
| SEN-09 | **Kabiliyet ROI** | 40 aday tablosu (payload'dan, senaryodan bağımsız) |
| — | **Motor notu** | formüllerin tek paragraflık özeti + baz parite sayıları |

### 10.2 Hesap sırası (hepsi `useMemo`)

```ts
const BAZ = senaryoHesap(BAZ_CFG, params);          // [params]
const r   = senaryoHesap(cfg, params);              // [cfg, params]
const tk  = krizTakvim(cfg, profil, params);        // [cfg, profil, params]
const ay  = Math.min(ayHam, tk.aylar.length - 1);   // profil değişince ay taşabilir
const ayR = tk.aylar[ay];
const alrm = alarmlar(cfg, r, BAZ, tk, params);
const th   = tahsis(cfg, params);
const dy   = duyarlilik(cfg, (c) => senaryoHesap(c, params).ek / 1e6);
const arazi = mod === 'kategori'
  ? araziKur(tk.aylar.map(a => a.r.byKat), LK.sub, 'kategori', true)
  : araziKur(tk.aylar.map(a => a.marj), MARJ_ET, 'marj', false, MARJ_KIRMIZI);
```

### 10.3 Preset ↔ elle değişiklik ilişkisi

`CFG_ALAN` = karşılaştırılan `SenaryoCfg` alanları listesi. `degismis = CFG_ALAN.some(k =>
cfg[k] !== preset[k])` → başlıkta "· değiştirilmiş" ve gülde kesikli referans poligonu.

**Gül sürüklenince preset ETİKETİ KORUNUR** ve alt küme çarpanları silinmez. (Eski davranış:
her elle değişiklik senaryoyu "özel"e düşürüp `yeniDem`/`kuculDem`'i sıfırlıyordu — motor
krizini elle sertleştirmek imkânsızdı.) İki dönüş düğmesi: `↺ preset` (preset'in kendi
şekline) ve `↺ baz` (her şeyi sıfırla).

### 10.4 Store eklemeleri (`app/store.ts`)

```ts
profil: string;            // kriz.ts PROFILLER anahtarı, varsayılan 'kademeli'
ay: number;                // takvimde incelenen ay, 0 = kriz öncesi
profilSec: (k) => set({ profil: k, ay: 0 });   // eski ay yeni takvimin dışında kalabilir
aySec: (n) => set({ ay: Math.max(0, n) });
```

`senaryo: SenaryoCfg & { preset: string }` ve `params: ParamCfg` zaten mağazada; yeni eksenler
`BAZ_CFG`'ye eklendiği için otomatik gelir.

### 10.5 CSS (`design/senaryo.css`, sayfa başında import)

Sınıf aileleri: `.gul-sar/.gul/.gul-oku` (radar: `.ring`, `.spoke`, `.alan`, `.alan.baz`,
`.tut`, `.tut-vur`, `.et`, `.deg`) · `.ktak` + `.ktak-et` (ay şeridi, `.on`, `.duvar::after`)
· `.alm` + `.alm-k` (`.al/.uy/.bl/.iy` renk varyantları, `.guv .ray` güven çubuğu) ·
`.arazi` + `.arazi-et` + `.arazi-hud` + `.arazi-yedek` + `.arazi-yuk` + `.kose` (köşe
işaretleri). Sayfa **açık temada** kalır (CODE'un koyu konsolu değil).

---

## 11. Test sözleşmesi

`npm test` — bu iş bittiğinde **85 test** geçmeli (3 dosya). Kritik sabitler:

**Parite (değişmemeli):**

```
senaryoHesap(BAZ_CFG).kir           === 134      // .kirAog === 22, byKr toplamı 134
senaryoHesap(PRESETS.motor).kir     === 477
senaryoHesap(PRESETS.oem).kir       === 283
belirsizlik(BAZ_CFG).ort            ≈  389       // %80 aralık: 371 – 408, fatura ≈ $9,8M
belirsizlik(PRESETS.motor).ort      ≈  797
ttsDagilim(BAZ_CFG) toplamı         === K.aktif_pn
```

**Yeni eksenler:**
- `BAZ_CFG` bütün yeni eksenlerde nötr; nötr ayarda `ttrSok`/`leadSok` gün sayısını hiç değiştirmez.
- `filoUc: 0` tam olarak 1,0 verir; uçlar bandı gerer ve 2033 açığını **monoton** büyütür.
- Gümrük kuyruğu **toplamsal** ve yalnız dış kanala biner (iç tamirli parçada gün değişmez).
- İç kapasite kaybı yalnız `ato === 1` olanı vurur.
- Havuz kaybı **adetleri değiştirmez**, yalnız faturayı büyütür (`kir` sabit).
- Kur şoku adetleri değiştirmez, $ kalemleri ölçekler, BER eşiğini kaydırır.
- `byKat` toplamı === `kir`; marj dağılımının **ilk 4 kovasının toplamı === kir**.
- Marj dağılımı TAT şokunu görür, TTS dağılımı (tanım gereği) görmez.
- 11 preset var, her biri baz durumdan farklı sonuç üretir; hepsi bazdan kötü ya da eşit.
- `params.tampon` artık senaryo motorunu da etkiler (tek doğruluk kaynağı).

**Kriz takvimi:**
- `siddet`: ay 0 → 0, tırmanma sonu → 1, plato boyunca 1, toparlanma sonu → 0, tırmanma monoton.
- `olcek(c, 0)`: yüzde eksenleri 0, **çarpanlar 1**, `filoUc`/`disOnly` değişmemiş.
- `krizTakvim(motor).bazKir === 134`; zirve aralıkta; baz senaryoda takvim düz (zirve = baz).
- Uzun sürükleyen profil, ani darbeden **daha çok parça·ay** yakar.

**Tahsis:** eğri monoton artan, kazanım %100'e yakınsıyor, `butce80` toplam bütçenin küçük
bir kısmı, ilk 10 tekil ve hepsinin açığı/maliyeti pozitif, kriz derinleşince bütçe büyür,
tornado 6 etken ve her etkenin üst ucu daha pahalı.

**Arazi geometrisi (`araziGeo.test.ts`, 17 test):** boyutlar seri/etiket sayısından gelir ·
satırlar baz aya göre azalan sıralanır · normalize 0..1 ve maksimum tam 1 · sıralamadan sonra
da hücre doğru aya/satıra bağlı · boş seri ve tek değerli ızgara çökmez (sıfıra bölme yok) ·
hücreler ızgara sınırları içinde · yükseklik değerle artar · tarama çizgisi doğru sütuna
oturur · kamera ızgaranın dışından ve üstünden bakar · rampa girdileri kırpılır, sıcaklık
arttıkça kırmızılaşır, **marka kırmızısı rampada yok**.

---

## 12. Uygulama sırası

Her adımdan sonra `npm test` + `npm run tip`. Sıra önemli: alttan üste, her katman
kendinden öncekine dayanıyor.

1. **`engine/senaryo.ts` genişlet** — 5 yeni eksen + `NOTR` + `sureSok`/`bandCarpani`/
   `kurCarpani` + `SenaryoSonuc` yeni alanları + 5 yeni preset + `marjDagilim`.
   *Kabul:* parite testleri (134/22/477/283/389) hâlâ geçiyor.
2. **`engine/kriz.ts`** — profiller, `siddet`, `olcek`, `krizTakvim`. *Kabul:* takvim testleri.
3. **`engine/tahsis.ts`** — greedy + tornado. *Kabul:* tahsis testleri.
4. **`app/store.ts`** — `profil`, `ay`, `profilSec`, `aySec`.
5. **`views/senaryo/araziGeo.ts` + testi** — saf matematik, three.js yok. *Kabul:* 17 test.
6. **`design/senaryo.css`** — sınıf iskeleti.
7. **`views/senaryo/SokGulu.tsx`** — radar; önce statik çizim, sonra sürükleme, sonra morph.
8. **`views/senaryo/Arazi.tsx`** — sahne; önce statik çubuklar, sonra animasyon, sonra etiket
   katmanı ve zoom.
9. **`views/senaryo/alarmlar.ts`** — ray üreteci.
10. **`views/Senaryo.tsx`** — sayfayı SEN-01…09 sırasıyla kur; `Arazi` `lazy()` + `Suspense` +
    `SahneKalkani` ile sarılı.
11. **`ParamPanel` taşı** — `views/senaryo/` → `views/ongoru/`, `Ongoru.tsx` sonuna bir `Bolum`
    + panel ekle.
12. **Dokümantasyon** — kök `README.md` ve `web/README.md` test sayısını ve Senaryo sekmesi
    tarifini güncelle.

---

## 13. Ölçülmüş tuzaklar (bunlar tekrar keşfedilmesin)

1. **drei `Html` sahnedeki tıklamayı yutar** — her etiket için tuvali kaplayan sarmalayıcı div
   açıyor. Etiketler kendi DOM katmanımızda, konumları her karede `project()` ile yansıtılır.
2. **Tekerlek yakınlaştırması sayfayı kilitler** — sahne sayfa ortasındaysa `enableZoom={false}`,
   yakınlaştırma düğmelerde.
3. **SVG viewBox ölçeği CSS piksel değerlerini çarpar** — gülün viewBox'ı doğal piksel boyuna
   eşit (340), yoksa "9px" yazı 30px çıkar.
4. **framer-motion SVG `points` interpolate etmez** — morph elle, `requestAnimationFrame` ile.
5. **6px'lik SVG tutamak parmakla tutulamaz** — görünmez `r=16` dokunma dairesi gerekir.
6. **Rampanın soğuk ucu beyaz zeminde kaybolur** — açık gri değil orta gri (`#B9C0C8`).
7. **`Math.max(0.02, …)` yükseklik tabanı şart** — yoksa "veri yok" ile "değer sıfır" ayırt
   edilemez.
8. **Ölçekte çarpanlar 1'den başlar** — `w=0`'da `yeniDem` 0 olursa talep sıfırlanır, 0. ay
   baz durumu vermez ve bütün karşılaştırmalar çürür.
9. **Kümülatif $ raporlanmaz** — `kap` stok büyüklüğü; aylar boyunca toplanırsa aynı eksik
   defalarca sayılır. Zirve + parça·ay raporlanır.
10. **Profil değişince `ay` sıfırlanmalı** — ani darbe 10 ay, uzun sürükleyen 27 ay; eski ay
    yeni takvimin dışında kalıyor. Ayrıca çizimde `Math.min(ay, aylar.length - 1)` savunması.
11. **WebGL bağlam kaybında `preventDefault()`** — yoksa sahne sessizce ölür, ekranda etiketler
    kalıp arazi kaybolur.
12. **Sahne başına ayrı hata sınırı** — tek ortak sınır bütün sekmeleri birlikte düşürür.
13. **Kare süresinden bağımsız animasyon** — `1 - Math.exp(-dt * k)`, sabit adım değil; yoksa
    yavaş cihazda animasyon hızı değişir.
14. **Chart.js'e 10.000 nokta verilmez** — tahsis eğrisi 90 noktaya indirgenir.
15. **Marka kırmızısı veri rampasında kullanılmaz** — kimlik rengi ile veri rengi ayrı işler.

---

## 14. Anlatı — sunumda ne söyleniyor

Sayfanın savunduğu üç cümle, ekrandaki her öğe bunlardan birine hizmet ediyor:

1. **"Kriz bir parametre şokudur."** Her kriz ya TTS'yi kısaltır ya TTR'yi uzatır; bu yüzden
   stres testi ayrı bir model değil, aynı motorun üstünde bir düğmedir. Gülün yedi ekseni bu
   iki değişkene farklı yollardan bağlanır.
2. **"Krizin şekli ve süresi vardır."** Havuz krizi kırmızı sayısını hiç değiştirmez ama
   faturayı büyütür; gümrük tıkanması kısa TAT'lı parçayı oransal olarak daha sert vurur;
   alçak ama uzun süren bir kriz, kısa ve sert olandan daha çok parça·ay yakar. Tek bir
   "kriz şiddeti" sayısı bunların hiçbirini anlatmaz.
3. **"Karar bugün veriliyor."** Duvara N. ayda çarpılıyorsa sipariş açma penceresi ondan
   *önce* kapanır. Tırmanma penceresi, sinyale bağlı planın devreye girebileceği zamandır —
   takvime bağlı plan aynı şokta çöker.
