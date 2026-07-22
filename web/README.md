# Envanter Kontrol Kulesi

Turkish Technic komponent envanter case'i — jüri demo dashboard'u.
1.200 → 2.000 uçak filo büyümesinin komponent envanterine etkisini gösteren karar destek arayüzü.

> Veriler sentetiktir; case dokümanıyla verilen dummy set kullanılmıştır. Gerçek THY/AMOS verisi değildir.

---

## Kurulum

```bash
# 1) veriyi üret (repo kökünde, CSV'lerin yanında) → web/public/data/*.json
python3 build_data.py

# 2) uygulama
cd web
npm install
npm run dev            # http://localhost:5173
```

Demo günü:

```bash
npm run build && npm run preview
```

`dist/` tamamen statiktir — **internet gerekmez**. Fontlar pakete gömülüdür
(`@fontsource`, dış CDN yok). Tek dış bağımlılık F40 haritasının CARTO Positron
basemap'i; internetsiz ortamda o kart boş kalır, diğer 6 sekme çalışır.

Yedek: `dist/` klasörünü USB'ye al.

---

## Mimari

```
web/
├─ public/data/            ← build_data.py çıktısı (9 JSON, ~546 KB)
├─ src/
│  ├─ App.tsx              ← shell: header + tab bar + FeatureGrid + drawer
│  ├─ registry.ts          ← ★ TÜM sekme ve feature tanımları burada
│  ├─ store.ts             ← zustand: filoYili, filtreler, seciliPn, senaryo
│  ├─ data/
│  │   ├─ types.ts         ← 9 JSON'un veri sözleşmesi
│  │   └─ useData.ts       ← fetch + modül düzeyinde cache
│  ├─ lib/
│  │   ├─ format.ts        ← tr-TR sayı / para / gün biçimleme
│  │   ├─ inventory.ts     ← min-max, senaryo, filo ölçekleme, Little's Law, √n havuzlama
│  │   ├─ risk.ts          ← risk skoru ayrıştırma (build_data.py ile birebir formül)
│  │   ├─ pnRows.ts        ← kolonsal pn.json → satır dönüşümü + filtreleme
│  │   ├─ countdown.ts     ← geri sayım eşikleri ve renk kuralları
│  │   └─ chartTheme.ts    ← seri renkleri, eksen, tooltip
│  ├─ shell/               ← Header, TabBar, FeatureGrid, Footer, GlossaryModal
│  ├─ ui/                  ← Card, KpiStat, Badge, Drawer, Slider, FilterBar…
│  └─ features/            ← her feature TEK dosya
└─ index.html
```

### Neden registry?

Bir feature = **bir dosya + registry'de bir satır**. Başka hiçbir yere dokunulmaz.
Üç kişi aynı anda üç feature yazarken çakışmaz; `git` çakışması yalnızca
`registry.ts`'in tek satırında olur.

---

## Yeni feature nasıl eklenir

### 1) Bileşeni yaz

`src/features/network/F43TransferFlows.tsx`:

```tsx
import type { FC } from 'react';
import { useData } from '../../data/useData';
import { sayi } from '../../lib/format';
import { Skeleton } from '../../ui';

/** F43 — İstasyonlar arası transfer akışları. */
export const F43TransferFlows: FC = () => {
  // needs: ['stations'] dizisindeki dosyalar burada hazır gelir
  const { data, loading } = useData(['stations'] as const);

  if (loading || !data.stations) return <Skeleton className="h-64 w-full" />;

  return <p>{sayi(data.stations.stations.length)} istasyon</p>;
};

export default F43TransferFlows;
```

Kart çerçevesini (başlık, yöntem notu, kenarlık) **grid çiziyor** —
bileşen yalnız gövdeyi döndürür. Kendi kabuğunu getirmesi gerekiyorsa
registry'de `chrome: 'none'` ver (F01 panosu böyle).

### 2) registry.ts'e tek satır ekle

```ts
{
  id: 'F43',
  tab: 'network',
  title: 'Transfer akış çizgileri',
  method: 'istasyon çiftleri arası aylık transfer hacmi · kalınlık adet ile orantılı',
  span: 6,                 // 12 kolonluk gridde genişlik
  minHeight: 360,
  status: 'live',          // 'live' | 'beta' | 'planned'
  needs: ['stations'],     // yalnız bu JSON'lar indirilir
  Component: lazy(() => import('./features/network/F43TransferFlows')),
},
```

Hepsi bu. Sekme otomatik doldu, kod bölme otomatik, veri otomatik cache'lendi.

### Alan sözleşmesi

| Alan | Etki |
|---|---|
| `status: 'planned'` | Kesikli kenarlıklı yer tutucu + faz rozeti. Component gerekmez. |
| `status: 'beta'` | Normal render + başlıkta amber "beta" rozeti. |
| `needs` | `useData` yalnız bunları indirir; iki feature aynı dosyayı iki kez çekmez. |
| `span` | 12 / 8 / 7 / 6 / 5 / 4 — dar ekranda otomatik tam genişliğe düşer. |
| `chrome: 'none'` | Grid kart çerçevesi çizmez, bileşen kendi kabuğunu getirir. |
| `global: true` | Gridde kart olarak durmaz; App seviyesinde mount edilir (F61 çekmece). |

### Yeni sekme

`registry.ts`'te `TabId` birleşimine bir değer, `TABS` dizisine bir satır ekle.
İkon adı `IconName` içinden seçilir (`src/shell/TabBar.tsx`'teki `IKONLAR` haritası).

---

## Hesap motoru

Senaryo feature'ları 5.000 PN üzerinde canlı yeniden hesaplar (~2 ms).
Formüller `src/lib/inventory.ts` içinde, `build_data.py` ile birebir aynı:

```
QDAYS  = 91,25
lamL   = rate₃₃(1+talepŞoku) × lead(1+gecikme) ÷ QDAYS
ss     = ⌈z √(lamL)⌉                      Poisson emniyet stoğu
min    = ⌈lamL⌉ + ss
açık   = stok < min

kalan  = (stok ÷ günlükTalep) − lead      sipariş geri sayımı
k      = (N − 1200) ÷ 800                 filo slider'ı
rateN  = rate₂₅ + (rate₃₃ − rate₂₅)·k

ssDağınık = Σᵢ z√(λᵢL) ; ssHavuzlu = z√(Σλᵢ L)    √n havuzlama
dolaşım   = sökülmeHızı × döngüSüresi             Little's Law
```

**Doğrulama:** F51 slider'ı 2.000 uçağa çekildiğinde önerilen min stok toplamı
`23.308` ve açık PN `1.845` çıkıyor — `kpi.json`'daki `min33` ve `acikPn` ile
birebir aynı. Tarayıcı motoru Python hattını birim düzeyinde tekrarlıyor.

Slider'lar `requestAnimationFrame` ile kareye indirgenir (`src/ui/Slider.tsx`),
sürükleme sırasında hesap kare başına bir kez koşar.

---

## Kurallar

- **Dil:** arayüz Türkçe, teknik terimler İngilizce korunur (AOG, TAT, lead time, PN, rotable).
- **Sayı:** `tr-TR` — binlik nokta, ondalık virgül. Para `$142,7 M` biçiminde kısaltılır.
  Biçimleme her zaman `src/lib/format.ts` üzerinden yapılır.
- **Renk:** bir grafikte **en fazla bir kırmızı seri**. Kırmızı = dikkat, dekorasyon değil.
  Seri sırası `src/lib/chartTheme.ts`'te.
- **Yöntem notu:** her kart başlığının altında tek satır — jüri "bunu nasıl buldunuz"
  diye sorduğunda cevap ekranda olmalı. `method` alanı boş bırakılmaz.
- **Boş durum:** yön verir, özür dilemez. "Filtreye uyan PN yok. Kritiklik filtresini genişletin."
- **`localStorage` / `sessionStorage` kullanılmaz.** Hiçbir yerde.
- **Erişilebilirlik:** görünür klavye focus (2px `tk-red`), grafiklerde renk + etiket birlikte,
  `prefers-reduced-motion` desteği.

---

## Komutlar

```bash
npm run dev         # geliştirme sunucusu
npm run build       # tsc -b && vite build → dist/
npm run preview     # dist/ önizleme
npm run typecheck   # yalnız tip kontrolü
```

Bağımlılık ekledikten sonra dev sunucusu çalışıyorsa Vite'ın optimize cache'i
bayatlayabilir ("Invalid hook call" / birden fazla React kopyası). Çözüm:

```bash
rm -rf node_modules/.vite && npm run dev
```

---

## Doğrulama

`verify.mjs` spec bölüm 8'deki kabul kriterlerini tarayıcıda otomatik kontrol eder.

```bash
npx playwright install chromium   # ilk seferde
npm run dev                       # ayrı terminalde
node verify.mjs
```

Çıktı her kriter için `PASS`/`FAIL` ve ölçülen değeri yazar (sekme geçiş süresi,
DOM'daki satır sayısı, senaryo öncesi/sonrası açık PN, harita işaretçi sayısı).
