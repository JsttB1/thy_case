# Envanter Kontrol Kulesi — Teknik & Tasarım Spesifikasyonu

Turkish Technic komponent envanter case'i · jüri demo dashboard'u
Kaynak repo: `JsttB1/thy_case` · Hedef: yeniden yapılandırılmış, THY marka dilinde, genişletilebilir React uygulaması

---

## 0. Neden yeniden yazıyoruz

Mevcut `envanter_2033_dashboard.html` tek dosyada 2 MB — Chart.js gömülü, 5.000 PN inline JSON,
tüm görseller tek akışta dikey sıralı. Analitik doğru ama:

- yeni feature eklemek dosyayı büyütüyor, çakışma riski yüksek (takım halinde çalışılamıyor)
- sekme yok → jüri 12 grafiği tek scroll'da görüyor, hikâye anlatılamıyor
- harita, sanallaştırılmış tablo, cross-filter gibi şeyler bu yapıda yazılamaz
- görsel dil jenerik koyu dashboard; THY marka kimliği yok

Yeni yapı: **Vite + React + TypeScript**, veri `public/data/*.json` (toplam ~546 KB),
feature registry mimarisi ile sekme/feature ekleme tek satır.

---

## 1. Tasarım dili — THY

### 1.1 Renk (tam token seti)

turkishairlines.com açık zeminli, geniş beyaz alanlı, tek güçlü kırmızı aksanlı bir sistem.
Dashboard bunu **birebir korur** — koyu tema yok.

| Token | Hex | Kullanım |
|---|---|---|
| `tk-red` | `#E81932` | marka aksanı, aktif sekme, birincil buton, kritik alarm |
| `tk-red-deep` | `#C1121F` | hover/pressed, gradyan bitişi |
| `tk-red-wash` | `#FDEEF0` | kritik satır zemini, uyarı şeridi |
| `tk-ink` | `#1A1D21` | birincil metin, koyu yüzey (geri sayım panosu) |
| `tk-slate` | `#5A6472` | ikincil metin, eksen etiketi |
| `tk-mist` | `#F4F6F8` | sayfa zemini |
| `tk-line` | `#E3E7EC` | kart kenarlığı, ayırıcı |
| `tk-white` | `#FFFFFF` | kart yüzeyi |

Semantik (dashboard için zorunlu, marka paletinden türetilmiş):

| Token | Hex | Anlam |
|---|---|---|
| `sig-ok` | `#0E8A5F` | güvenli / dengede |
| `sig-warn` | `#C77700` | yaklaşıyor / fazla stok |
| `sig-crit` | `#E81932` | gecikmiş / açık / AOG |

Grafik serileri sırası: `#E81932`, `#1A1D21`, `#5A6472`, `#C77700`, `#0E8A5F`, `#8B94A3`.
Kural: **bir grafikte en fazla bir kırmızı seri.** Kırmızı = dikkat, dekorasyon değil.

### 1.2 Tipografi

Konuya dayalı seçim: havalimanı bilgi ekranları (FIDS) sıkışık grotesk kullanır.

| Rol | Font | Kullanım |
|---|---|---|
| Display | **Barlow Condensed** 600/700 | büyük sayılar, geri sayım panosu, eyebrow etiketler (`letter-spacing: .06em`, UPPERCASE) |
| Body/UI | **Inter** 400/500/600 | tüm arayüz metni, kart başlıkları, tablo |
| Mono | **JetBrains Mono** 400/500 | PN kodları, sayısal tablo hücreleri, formül gösterimi |

Tip skalası: `11 / 12 / 13 / 15 / 18 / 24 / 34 / 52`.
Sayısal hücrelerde `font-variant-numeric: tabular-nums` zorunlu.

### 1.3 Yerleşim

- Sticky üst bar 64px: solda THY lale işareti + "Envanter Kontrol Kulesi", sağda filo yılı seçici (2025 / 2033) ve veri notu rozeti
- Sekme çubuğu 48px: alt çizgi ile aktif göstergesi (`border-bottom: 2px solid tk-red`), yatay kaydırılabilir
- İçerik: `max-width 1440px`, 12 kolon grid, `gap 20px`, sayfa kenar boşluğu 32px (mobilde 16px)
- Kart: `bg-white`, `border 1px tk-line`, `radius 8px`, `padding 20px`, gölge yok — hover'da `shadow-sm`
- Kart başlığı: 15px/600 + altında 12px `tk-slate` yöntem notu (bu not önemli — jüri "nasıl hesapladınız" diye sorunca ekranda yazıyor olmalı)

### 1.4 İmza öğe — Sipariş Geri Sayım Panosu

Tek akılda kalıcı öğe bu. Havalimanı kalkış panosu estetiği, ama satırlar uçuş değil parça numarası,
"kalkış saati" değil **son sipariş tarihi**:

```
┌────────────────────────────────────────────────────────────────────┐
│  SİPARİŞ GERİ SAYIMI                          408 GECİKMİŞ · 96 AOG│  ← tk-ink zemin, beyaz metin
├────────────────────────────────────────────────────────────────────┤
│  PN-101058   LANDING GEAR   A350-900   KRİTİK    97g LT    −73 GÜN │  ← kırmızı, "GECİKMİŞ" rozeti
│  PN-104506   FUEL           737 MAX 8  KRİTİK    82g LT    −54 GÜN │
│  PN-104628   ENGINE         787-9      KRİTİK    77g LT    −51 GÜN │
│  PN-102604   ENGINE         737 MAX 8  AOG KRİT  49g LT     +12 GÜN│  ← amber
└────────────────────────────────────────────────────────────────────┘
```

Detaylar:
- Zemin `tk-ink`, metin beyaz, sayılar Barlow Condensed 700 — sayfadaki tek koyu blok, bu yüzden göz oraya gidiyor
- Negatif gün değerleri `sig-crit`, 0–30 `sig-warn`, üstü `sig-ok`
- İlk yüklemede satırlar 40ms arayla split-flap benzeri kısa bir çevirme ile giriyor (sadece bu bileşende, sadece bir kez)
- `prefers-reduced-motion` varsa animasyon yok
- Satıra tıklama → PN detay çekmecesi

Geri kalan her şey sakin ve disiplinli kalır. Cesaret tek yere harcanır.

### 1.5 Hareket

- Sayfa/sekme geçişi: 120ms opacity, kayma yok
- Sayaçlar: KPI değerleri 600ms count-up (yalnızca ilk görünürlükte)
- Grafik girişleri: Recharts varsayılan `isAnimationActive` 400ms
- Hover: 100ms
- Bunun dışında animasyon yok.

### 1.6 Kalite tabanı

Responsive (1440 / 1024 / 768 / 375), görünür klavye focus halkası (`outline: 2px solid tk-red; offset 2px`),
`prefers-reduced-motion` desteği, grafiklerde renk + şekil/etiket birlikte (renk körlüğü), tüm metin ≥ 4.5:1 kontrast.

---

## 2. Mimari

### 2.1 Stack

| Katman | Seçim | Gerekçe |
|---|---|---|
| Build | Vite 5 + React 18 + TypeScript | hızlı, statik build → `dist/` klasörü demo'da dosyadan açılır |
| Stil | Tailwind CSS 3 (özel token) | token'lar `tailwind.config.js`'te tek yerde |
| Grafik | Recharts 2 | React-native API; ısı haritası ve pano custom div |
| Harita | MapLibre GL + react-map-gl | token gerektirmez; CARTO Positron basemap THY açık temasıyla uyumlu |
| Tablo | @tanstack/react-table + @tanstack/react-virtual | 5.000 satır sanallaştırma |
| State | Zustand | sekmeler arası ortak filtre (filo yılı, kritiklik, seçili PN) |
| Veri | statik `public/data/*.json` | backend yok — demo internetsiz çalışmalı |

### 2.2 Klasör yapısı

```
web/
├─ public/data/            ← build_data.py çıktısı (9 JSON, ~546 KB)
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx              ← shell: header + tab bar + <FeatureGrid>
│  ├─ registry.ts          ← ★ TÜM sekme ve feature tanımları burada
│  ├─ store.ts             ← zustand: filoYili, filtreler, seciliPn, senaryo
│  ├─ data/
│  │   ├─ useData.ts       ← JSON fetch + cache hook
│  │   └─ types.ts         ← veri sözleşmesi tipleri
│  ├─ lib/
│  │   ├─ format.ts        ← tr-TR sayı/para/gün biçimleme
│  │   ├─ inventory.ts     ← min-max, emniyet stoğu, geri sayım hesapları (JS)
│  │   └─ pooling.ts       ← √n havuzlama, Little's Law
│  ├─ ui/                  ← Card, KpiStat, Eyebrow, Badge, Drawer, Placeholder…
│  └─ features/
│      ├─ overview/F01CountdownBoard.tsx
│      ├─ overview/F02KpiStrip.tsx
│      ├─ demand/F10DemandByModel.tsx
│      ├─ network/F40StationMap.tsx
│      └─ …                ← her feature TEK dosya
└─ index.html
```

**Kural: bir feature = bir dosya + registry'de bir satır.** Başka hiçbir yere dokunulmaz.
Takımdaki üç kişi aynı anda üç feature yazarken çakışmaz.

### 2.3 Feature registry sözleşmesi ★

Bu, "sonra bir sürü feature ekleyeceğiz" isteğinin teknik karşılığı.

```ts
// src/registry.ts
export type FeatureStatus = 'live' | 'beta' | 'planned';

export interface FeatureDef {
  id: string;                 // 'F01'
  tab: TabId;                 // 'overview'
  title: string;
  method?: string;            // kart başlığı altındaki yöntem notu
  span: 4 | 6 | 8 | 12;       // 12 kolonluk gridde genişlik
  minHeight?: number;
  status: FeatureStatus;
  needs: DataKey[];           // ['kpi','inventory'] — sadece bunlar fetch edilir
  Component?: React.LazyExoticComponent<React.FC>;
  plannedNote?: string;       // status 'planned' ise placeholder'da görünen açıklama
}

export const TABS: TabDef[] = [
  { id: 'overview',  label: 'Genel Bakış',        icon: 'gauge' },
  { id: 'demand',    label: 'Talep & Tahmin',     icon: 'trending' },
  { id: 'inventory', label: 'Envanter Sağlığı',   icon: 'boxes' },
  { id: 'risk',      label: 'Risk & Kritiklik',   icon: 'alert' },
  { id: 'network',   label: 'Ağ & Kapsama',       icon: 'map' },
  { id: 'scenario',  label: 'Senaryo Simülatörü', icon: 'sliders' },
  { id: 'explorer',  label: 'PN Gezgini',         icon: 'table' },
];

export const FEATURES: FeatureDef[] = [ /* aşağıdaki tablo */ ];
```

Davranış:
- `status: 'planned'` → `<PlaceholderCard>` render edilir: kesikli kenarlık, başlık, `plannedNote`,
  köşede "Faz 2" rozeti. **Jüri yol haritasını ekranda görür** — boş yer değil, bilinçli kapsam.
- `status: 'beta'` → normal render + başlıkta amber "beta" rozeti
- Component `React.lazy` ile yüklenir; sekme açılmadan kod inmez
- `needs` dizisi hangi JSON'un fetch edileceğini belirler; `useData` cache'ler, iki feature aynı dosyayı iki kez çekmez

Yeni feature eklemek:
```ts
// 1) src/features/network/F42PoolingSim.tsx  yaz
// 2) registry.ts'e ekle:
{ id:'F42', tab:'network', title:'Havuzlama simülatörü',
  method:'√n risk pooling · aynı servis seviyesinde merkezî vs dağınık stok',
  span:6, status:'live', needs:['pn','stations'],
  Component: lazy(() => import('./features/network/F42PoolingSim')) },
```

---

## 3. Veri sözleşmesi

`build_data.py` üretir → `web/public/data/`. Gerçek repo verisiyle test edildi, çıktı boyutları:

| Dosya | Boyut | İçerik |
|---|---|---|
| `kpi.json` | 0,6 KB | 37 headline metrik |
| `fleet.json` | 2,5 KB | 14 model × 2025/2033 × THY/POOL |
| `demand.json` | 4,2 KB | çeyreklik, model bazında, alt kategori bazında |
| `risk.json` | 31 KB | histogram, ısı haritası (26×3), en riskli 100 PN |
| `inventory.json` | 124 KB | durum×kritiklik, sermaye, top açık/fazla/geri sayım/scrap |
| `pn.json` | 369 KB | 5.000 PN kolonsal diziler (explorer + senaryo motoru) |
| `model_ml.json` | 11 KB | eğitim eğrisi, MAE karşılaştırma, scatter |
| `stations.json` | 3,1 KB | 15 istasyon: koordinat, uçak sayısı, depo tipi, transfer süresi |
| `meta.json` | 1,2 KB | başlık, yöntem özeti, sözlük (8 terim), veri uyarısı |

### 3.1 kpi.json (doğrulanmış gerçek değerler)

```jsonc
{
  "pn": 5000, "ucak2025": 1200, "ucak2033": 2000,
  "talep25": 90016, "talep33": 147264, "talepBuyume": 63.6, "filoBuyume": 66.7,
  "min25": 18098,  "min33": 23308,  "minBuyume": 28.8,      // ← ANA TEZ
  "max25": 42570,  "max33": 62623,
  "scrap25": 9991, "scrap33": 16517,
  "riskHigh": 156, "riskMid": 853, "alarm": 289, "alarmAog": 86,
  "intermittent": 1730,
  "degerFmv": 142702280, "degerClp": 326476700,
  "atilAdet": 4803, "atilDeger": 13896690, "pipelineAdet": 13515,
  "acikPn": 1845, "fazlaPn": 495, "dengePn": 2660, "acikPnAog": 330,
  "acikAdet": 5548, "acikMaliyet": 37233500,
  "fazlaAdet": 1521, "fazlaBagli": 3879030,
  "scrapOneriPn": 187, "exchangeOutPn": 1673,
  "gecikmisPn": 408, "acilPn": 957, "gecikmisAog": 96   // ← YENİ: sipariş geri sayımı
}
```

### 3.2 pn.json — kolonsal format

Satır bazlı 5.000 obje yerine kolon dizileri (≈3× küçük, senaryo motoru için doğrudan tarama):

```jsonc
{
  "n": 5000,
  "dict": { "krit": ["KRİTİK DEĞİL","KRİTİK","AOG KRİTİK"],
            "model": [...14], "sub": [...26], "kanal": [...3] },
  "cols": {
    "pn":[100000,…], "model":[3,…], "sub":[11,…], "ata":[32,…], "krit":[2,…],
    "kanal":[1,…], "atolye":[0,…], "lead":[54,…],
    "rate25":[7.0,…], "rate33":[25.6,…],
    "min25":[…], "max25":[…], "min33":[…], "max33":[…],
    "stock":[…], "pipeline":[…], "atil":[…],
    "clp":[…], "fmv":[…], "risk":[87.3,…], "kalan":[-73.4,…], "z":[2.054,…]
  }
}
```
`pn` gerçek kodu = `"PN-" + cols.pn[i]`.

### 3.3 inventory.json anahtarları

```
durumKrit  { rows:['AÇIK','DENGEDE','FAZLA'], cols:['AOG KRİTİK','KRİTİK','KRİTİK DEĞİL'], vals:[[330,581,934],[354,769,1537],[66,150,279]] }
sermaye    { servis:80937470, pipeline:40196930, atil:13896690, fazla:3879030 }   // USD
topAcik    [150 obje]  PN,MODEL,SUB,KRITIK,ATOLYE,TEMIN_KANALI,LEAD_GUN,TALEP_2033_YIL,
                       MIN_2033,MAX_2033,ELDE_SERVIS,ACIK_2033,KALAN_GUN,GERI_SAYIM_DURUM,
                       RISK,CLP_USD,ACIK_MALIYET,PIPELINE,ATIL
topFazla   [100 obje]  PN,MODEL,SUB,KRITIK,ELDE_SERVIS,MAX_2033,FAZLA_2033,FMV_USD,FAZLA_BAGLI
geriSayim  [150 obje]  topAcik alanları + TUKENME_GUN, GUNLUK_TALEP   ← F01/F22 kaynağı
scrapOneri [50 obje]   PN,SUB,KRITIK,TAMIR_VS_YENI,CLP_USD,ATIL
```

`GERI_SAYIM_DURUM` ∈ `GECIKMIS` (<0 gün) · `ACIL` (<30) · `YAKLASIYOR` (<90) · `GUVENLI`

### 3.4 stations.json

```jsonc
{ "stations": [
    { "kod":"IST", "ad":"İstanbul Havalimanı", "lat":41.2753, "lon":28.7519,
      "tip":"ana_us", "ucak2025":420, "ucak2033":640,
      "depoTipi":"ana_depo", "transferSaatIST":0, "stokKalem":1750,
      "stokAdet":9546, "aogKapsam":1.0 }, … 15 adet ],
  "kapsamKatsayilari": { "ana_depo":1.0, "ileri_depo":0.55, "hat_stok":0.20, "yok":0.0 }
}
```
Uçak dağılımı case PDF Bölüm 3 tablosundan (540/180/110/190/180 → 820/310/200/380/290);
istasyon kırılımı ve koordinatlar temsili. Bu dosya harita feature'larının tek kaynağı.

---

## 4. Sekme ve feature planı

Aşağıdaki tablo doğrudan `registry.ts`'e karşılık gelir.

### Sekme 1 — Genel Bakış `overview`
| id | Başlık | span | status | Veri | Not |
|---|---|---|---|---|---|
| F01 | Sipariş Geri Sayım Panosu | 12 | live | inventory | **imza öğe**, FIDS estetiği, ilk 12 satır + "tümü" linki |
| F02 | KPI şeridi | 12 | live | kpi | 6 kart: filo, talep, önerilen min stok, bağlı sermaye, gecikmiş PN, atıl sermaye |
| F03 | Doğrusal büyüme yanılgısı | 6 | live | kpi | 3 çubuk: filo +%66,7 · talep +%63,6 · min stok **+%28,8** |
| F04 | Bugünün aksiyon listesi | 6 | live | inventory,kpi | ilk 5 madde, her biri ilgili sekmeye link |

### Sekme 2 — Talep & Tahmin `demand`
| id | Başlık | span | status | Veri |
|---|---|---|---|---|
| F10 | Model bazında talep 2025→2033 | 8 | live | demand |
| F11 | Çeyreklik mevsimsellik | 4 | live | demand |
| F12 | ML modeli — eğitim, MAE, scatter | 12 | live | model_ml |
| F13 | Kesikli talep analizi (1.730 PN) | 6 | live | demand,pn |
| F14 | Survival / Weibull hazard modeli | 6 | planned | — |

### Sekme 3 — Envanter Sağlığı `inventory`
| id | Başlık | span | status | Veri |
|---|---|---|---|---|
| F20 | Açık / Dengede / Fazla × kritiklik | 6 | live | inventory |
| F21 | Sermaye dağılımı | 6 | live | inventory |
| F22 | Geri sayım tablosu (filtreli tam liste) | 12 | live | inventory |
| F23 | Tamir mi, yeni alım mı? | 6 | live | inventory |
| F24 | Pipeline yaşlandırma | 6 | planned | — |

### Sekme 4 — Risk & Kritiklik `risk`
| id | Başlık | span | status | Veri |
|---|---|---|---|---|
| F30 | AOG risk skoru dağılımı | 5 | live | risk |
| F31 | Isı haritası: alt kategori × kritiklik | 7 | live | risk |
| F32 | En riskli 100 PN | 12 | live | risk |
| F33 | Risk skoru ayrıştırma | 6 | live | pn |
| F34 | İç atölye yatırım adayları | 6 | live | pn |

### Sekme 5 — Ağ & Kapsama `network`  ← genişleme alanı
| id | Başlık | span | status | Veri |
|---|---|---|---|---|
| F40 | İstasyon ağı haritası | 12 | live | stations |
| F41 | AOG kapsama alanları | 6 | beta | stations,pn |
| F42 | Havuzlama simülatörü (√n) | 6 | beta | stations,pn |
| F43 | Transfer akış çizgileri | 6 | planned | — |
| F44 | 2033 yeni istasyon önerisi | 6 | planned | — |

### Sekme 6 — Senaryo Simülatörü `scenario`
| id | Başlık | span | status | Veri |
|---|---|---|---|---|
| F50 | Kriz simülatörü | 12 | live | pn |
| F51 | Filo slider'ı 1.200 → 2.000 | 6 | live | pn,fleet |
| F52 | TAT kaldıracı (Little's Law) | 6 | live | pn |
| F53 | Mevcut yapı vs havuzlanmış yapı | 12 | planned | — |

### Sekme 7 — PN Gezgini `explorer`
| id | Başlık | span | status | Veri |
|---|---|---|---|---|
| F60 | 5.000 PN sanallaştırılmış tablo | 12 | live | pn |
| F61 | PN detay çekmecesi (global) | — | live | pn,inventory |

---

## 5. Hesap motoru (tarayıcı tarafı)

`src/lib/inventory.ts` — senaryo feature'ları 5.000 PN üzerinde canlı yeniden hesaplar (≈2 ms, sorun değil).

```ts
const QDAYS = 91.25;

// Senaryo altında yeniden hesap
rate_  = rate33 * (1 + talepSoku);
lead_  = lead   * (1 + gecikme);
lamL   = rate_ * lead_ / QDAYS;
ss     = Math.ceil(z * Math.sqrt(lamL));       // Poisson emniyet stoğu
min_   = Math.ceil(lamL) + ss;
acik   = stock < min_;

// Sipariş geri sayımı
gunluk = rate33 / QDAYS;
tukenme= stock / gunluk;
kalan  = tukenme - lead;                        // < 0 → sipariş tarihi geçmiş

// Filo slider'ı (1200 → 2000 arası herhangi bir N)
k      = (N - 1200) / (2000 - 1200);            // 0..1
rateN  = rate25 + (rate33 - rate25) * k;

// √n havuzlama tasarrufu (F42)
ssDagınık   = Σ_istasyon z*√(λ_i * L);
ssHavuzlu   = z*√(Σ λ_i * L);
tasarruf    = 1 - ssHavuzlu / ssDagınık;        // ~%55 (5 eşit istasyon)

// Little's Law (F52)
dolasim = sokulmeHizi * dongüSuresi;            // TAT %20 ↓ → ihtiyaç %20 ↓
```

**Performans notu:** Monte Carlo'yu tarayıcıda canlı koşturma. Gerekirse
`build_data.py` içinde 1200/1400/1600/1800/2000 için offline koş, JSON'a yaz,
slider ara değerleri interpolate etsin. Demo'da takılma riski sıfır.

---

## 6. İçerik / dil kuralları

- Arayüz dili Türkçe, teknik terimler İngilizce korunur (AOG, TAT, lead time, PN, rotable, fill rate)
- Sayı biçimi `tr-TR`: binlik nokta, ondalık virgül. Para `$142,7 M` / `$37,2 M` biçiminde kısaltılır
- Her kart başlığının altında **tek satır yöntem notu** — jüri "bunu nasıl buldunuz" sorduğunda cevap ekranda
- Boş durum metinleri yön verir: "Filtreye uyan PN yok. Kritiklik filtresini genişletin." (özür dileme, belirsizlik yok)
- Footer'da kalıcı uyarı: "Veriler sentetiktir; case dokümanıyla verilen dummy set kullanılmıştır. Gerçek THY/AMOS verisi değildir."

---

## 7. Çalıştırma

```bash
# veri üret (repo kökünde, CSV'lerin yanında)
python3 build_data.py          # → web/public/data/*.json

# uygulama
cd web
npm install
npm run dev                    # http://localhost:5173
npm run build && npm run preview
```

Demo günü: `npm run build` çıktısı `dist/` tamamen statiktir, internet gerekmez.
Yedek olarak `dist/` klasörünü USB'ye al.

---

## 8. Kabul kriterleri

1. 7 sekme çalışıyor, sekme değişimi <100 ms
2. `registry.ts`'e tek satır ekleyerek yeni feature eklenebiliyor (README'de örnekle gösterilmiş)
3. `planned` feature'lar kesikli placeholder olarak görünüyor — boş alan yok
4. Geri sayım panosu 408 gecikmiş PN'i doğru gösteriyor, ilk satır `PN-101058 / −73 gün`
5. PN gezgini 5.000 satırda akıcı kayıyor (sanallaştırma çalışıyor)
6. Senaryo slider'ları 5.000 PN'i canlı yeniden hesaplıyor, takılma yok
7. Harita 15 istasyonu gösteriyor, istasyona tıklama detay açıyor
8. 1024px genişlikte (projeksiyon) yerleşim bozulmuyor
9. Hiçbir yerde `localStorage`/`sessionStorage` kullanılmıyor
10. `npm run build` uyarısız geçiyor
