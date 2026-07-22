# Claude Code Promptu — Envanter Kontrol Kulesi

## Kullanım

```bash
# 1) repoyu klonla, spec dosyalarını içine koy
git clone https://github.com/JsttB1/thy_case.git && cd thy_case
cp ~/Downloads/{DASHBOARD_SPEC.md,build_data.py,FIKIRLER.md} .

# 2) veriyi üret (bu adımı ÖNCE yap, Claude Code veriyi hazır bulsun)
python3 build_data.py

# 3) claude code'u başlat ve aşağıdaki FAZ 1 promptunu yapıştır
claude
```

Fazları **ayrı ayrı** yapıştır. Tek seferde hepsini verirsen Claude Code
yüzeysel geçer; faz faz gidince her adımı çalışır halde bırakır.

---

## FAZ 1 — İskelet, tasarım sistemi, registry

```
Bu repoda Turkish Technic komponent envanter case'i için bir jüri demo dashboard'u kuruyoruz.
Mevcut envanter_2033_dashboard.html tek dosyalık 2 MB'lık bir prototip — ONU DEĞİŞTİRME,
referans olarak dursun. Yeni uygulamayı web/ klasörü altına sıfırdan kuracağız.

ÖNCE OKU: DASHBOARD_SPEC.md (tasarım tokenları, mimari, veri sözleşmesi, feature tablosu)
ve build_data.py (veri nasıl üretiliyor). Veri zaten üretildi: web/public/data/ altında 9 JSON var.
Bunları oku ve gerçek alan adlarını gör — tahmin etme.

FAZ 1 KAPSAMI (sadece bunlar, feature'ları henüz yazma):

1. web/ altında Vite + React 18 + TypeScript projesi kur.
   Bağımlılıklar: tailwindcss@3, recharts, zustand, @tanstack/react-table,
   @tanstack/react-virtual, maplibre-gl, react-map-gl, lucide-react.

2. Tasarım sistemi — DASHBOARD_SPEC.md bölüm 1'deki tokenları tailwind.config.js'e birebir gir.
   Renkler: tk-red #E81932, tk-red-deep #C1121F, tk-red-wash #FDEEF0, tk-ink #1A1D21,
   tk-slate #5A6472, tk-mist #F4F6F8, tk-line #E3E7EC + sig-ok #0E8A5F, sig-warn #C77700.
   Fontlar Google Fonts'tan: Barlow Condensed (display), Inter (body), JetBrains Mono (sayısal).
   AÇIK TEMA — turkishairlines.com gibi beyaz zemin, tek kırmızı aksan. Koyu dashboard yapma.

3. src/registry.ts — spec bölüm 2.3'teki FeatureDef/TabDef sözleşmesini kur.
   7 sekmeyi ve spec bölüm 4'teki TÜM feature'ları (F01–F61) registry'ye ekle,
   ama şimdilik hepsinin status'ünü 'planned' yap. Component alanları boş kalsın.

4. src/App.tsx — shell:
   - sticky header 64px: sol THY lale işareti (inline SVG, tk-red) + "ENVANTER KONTROL KULESİ"
     (Barlow Condensed, uppercase, letter-spacing .06em) + altında 12px tk-slate alt başlık
     "1.200 → 2.000 uçak · komponent envanter karar destek sistemi"
   - sağda: filo yılı segmented control (2025 / 2033) ve "sentetik veri" rozeti
   - sekme çubuğu: aktif sekme altında 2px tk-red çizgi, yatay kaydırılabilir
   - içerik: max-w-[1440px], 12 kolon grid, gap-5, px-8

5. src/ui/ temel bileşenler: Card (başlık + method notu + children), KpiStat, Eyebrow,
   Badge (crit/warn/ok/neutral), PlaceholderCard (kesikli kenarlık, faz rozeti), Drawer, Skeleton.

6. src/data/useData.ts — JSON'ları fetch eden, cache'leyen, feature'ın needs[] dizisine göre
   sadece gerekeni indiren hook. src/data/types.ts — 9 JSON'un tam TypeScript tipleri
   (web/public/data/ içindeki gerçek dosyaları okuyarak yaz).

7. src/lib/format.ts — tr-TR sayı biçimleme, para kısaltma ($142,7 M), gün biçimleme (−73 gün).

8. src/store.ts — zustand: filoYili, kritiklikFiltresi, modelFiltresi, seciliPn,
   senaryo {talepSoku, leadGecikme, servisBonusu, filoBoyut}.

SONUÇ: npm run dev çalışsın, 7 sekme gezilebilsin, her sekme placeholder kartlarla dolu olsun.
Hiçbir grafik yok, sadece iskelet + tasarım sistemi.

Bitirince npm run build çalıştır ve hata olmadığını doğrula.
```

---

## FAZ 2 — İmza öğe + Genel Bakış sekmesi

```
FAZ 2: Genel Bakış sekmesini gerçek verilerle hayata geçir.

F01 — SİPARİŞ GERİ SAYIM PANOSU (bu uygulamanın imza öğesi, en çok emeği buraya ver):
  Kaynak: public/data/inventory.json → geriSayim dizisi (150 kayıt, KALAN_GUN'e göre artan sıralı).
  Havalimanı kalkış panosu (FIDS) estetiği:
  - Zemin tk-ink, metin beyaz — sayfadaki TEK koyu blok, göz oraya gitmeli
  - Başlık şeridi: solda "SİPARİŞ GERİ SAYIMI" (Barlow Condensed 700 uppercase),
    sağda kpi.json'dan "408 GECİKMİŞ · 96 AOG KRİTİK"
  - Kolonlar: PN (JetBrains Mono) | SUB | MODEL | KRITIK rozeti | lead time | KALAN GÜN
  - KALAN GÜN: Barlow Condensed 700, 28px, tabular-nums.
    < 0 → sig-crit + "GECİKMİŞ" rozeti · < 30 → sig-warn · < 90 → beyaz · üstü → sig-ok
  - İlk 12 satır göster, altta "408 gecikmiş PN'in tümünü gör →" linki (Envanter sekmesine gider)
  - Yüklemede satırlar 40ms arayla split-flap benzeri kısa çevirme animasyonuyla girsin.
    SADECE bu bileşende, SADECE bir kez. prefers-reduced-motion varsa animasyon yok.
  - Satıra tıklama → global PN detay çekmecesini açar

F02 — KPI şeridi: kpi.json'dan 6 kart —
  filo (1.200→2.000, +%66,7) · yıllık talep (90.016→147.264, +%63,6) ·
  önerilen min stok (18.098→23.308, +%28,8) · bağlı sermaye ($142,7 M FMV) ·
  gecikmiş sipariş (408, 96 AOG) · atıl sermaye ($13,9 M / 4.803 adet).
  Değerler ilk görünürlükte 600ms count-up.

F03 — "Doğrusal büyüme yanılgısı": 3 yatay çubuk — filo +%66,7 / talep +%63,6 / min stok +%28,8.
  Min stok çubuğu tk-red, diğerleri tk-slate. Altında tek cümle:
  "Emniyet stoğu talebin kareköküyle büyür — filo %67 büyürken stok %29 büyüyor."

F04 — Bugünün aksiyon listesi: 5 madde, her biri sayı + tek cümle + ilgili sekmeye link.
  Örn: "96 AOG kritik PN'de sipariş tarihi geçmiş → Envanter Sağlığı".

Kart başlıklarının altına spec bölüm 6'daki gibi TEK SATIR yöntem notu yaz —
jüri "nasıl hesapladınız" diye sorduğunda cevap ekranda olsun.

registry.ts'te bu 4 feature'ın status'ünü 'live' yap ve Component'leri React.lazy ile bağla.
```

---

## FAZ 3 — Talep, Envanter, Risk sekmeleri

```
FAZ 3: F10–F13, F20–F23, F30–F34 feature'larını yaz. Hepsi Recharts.
Veri: demand.json, model_ml.json, inventory.json, risk.json, pn.json.

Grafik kuralları (spec bölüm 1.1):
- Seri renk sırası: #E81932, #1A1D21, #5A6472, #C77700, #0E8A5F
- Bir grafikte EN FAZLA BİR kırmızı seri — kırmızı dikkat demek, dekorasyon değil
- Izgara çizgileri #E3E7EC, eksen etiketleri #5A6472 12px
- Tüm sayısal değerler tr-TR biçiminde, tooltip'ler Türkçe

Özel notlar:
- F12 (ML paneli): 3'lü grid — eğitim eğrisi (Poisson NLL), Q4 MAE karşılaştırma çubukları,
  gerçek vs tahmin scatter. Altına dürüst bulgu notu: model baseline ile başa baş (MAE 1,77 vs 1,72),
  4 çeyrekle istatistiksel tavan bu; kazanım ölçeklenebilir mimari. Bunu zayıflık gibi değil,
  bulgu gibi sun.
- F31 (ısı haritası): Recharts'ta yok — CSS grid ile 26 satır × 3 kolon div matrisi yap,
  hücre zemini risk skoruna göre beyaz→tk-red-wash→tk-red gradyanı, hücrede sayı.
- F33 (risk ayrıştırma): seçili PN'in risk skorunu 5 bileşene ayır
  (kritiklik %35, lead time %25, filo büyümesi %20, atölye yokluğu %10, talep %10)
  — yığılmış tek çubuk. Formülü kartın altına yaz, black box olmasın.
- F22 (geri sayım tablosu): inventory.json geriSayim + pn.json'dan tam liste;
  kritiklik / durum / model filtreleri, KALAN_GUN'e göre sıralı.
```

---

## FAZ 4 — Senaryo motoru

```
FAZ 4: Senaryo sekmesi (F50, F51, F52). Hesaplar tarayıcıda, pn.json kolonsal dizileri üzerinde.

src/lib/inventory.ts içine spec bölüm 5'teki formülleri yaz:
  QDAYS = 91.25
  rate_ = rate33 * (1 + talepSoku); lead_ = lead * (1 + gecikme)
  lamL  = rate_ * lead_ / QDAYS
  min_  = ceil(lamL) + ceil(z * sqrt(lamL))
  acik  = stock < min_

F50 — Kriz simülatörü: 3 slider (talep şoku 0–%80, lead time gecikmesi 0–%100,
  servis hedefi z bonusu 0–%30) + 4 hazır senaryo düğmesi:
  "Baz durum" (0/0/0) · "Tedarikçi krizi" (15/40/10) ·
  "Talep patlaması" (40/20/10) · "Küresel tıkanma" (25/70/15).
  Çıktı: açığa düşen PN sayısı, AOG kritik açık sayısı, ek tampon adedi, ek sermaye ($).
  Slider hareket ederken 5.000 PN canlı yeniden hesaplansın (~2 ms, sorun yok) —
  requestAnimationFrame ile debounce et.

F51 — FİLO SLIDER'I (demo'nun en güçlü anı): 1.200 → 2.000 arası tek slider.
  k = (N - 1200) / 800; rateN = rate25 + (rate33 - rate25) * k
  Sürüklendikçe canlı değişen 3 sayı: önerilen min stok toplamı, açık PN sayısı, bağlı sermaye.
  Yanında iki çizgi: "mevcut yapıyla ölçekle" (doğrusal) vs "emniyet stoğu √λ ile ölçekle".
  İki çizginin arasındaki makas dolar cinsinden yazsın — jürinin hatırlayacağı görsel bu.

F52 — TAT kaldıracı (Little's Law): tek slider, atölye TAT'ı −%40 … +%40.
  dolaşımdaki ihtiyaç = sökülme hızı × döngü süresi.
  TAT düşünce gereken yedek adedi ve bağlı sermaye anında azalsın.
  Kart notu: "Envanter probleminin bir kısmı satın alma değil, süreç problemi."
  Referans olarak pipeline'daki 13.515 adet / $40,2 M'ı göster.
```

---

## FAZ 5 — Harita ve PN gezgini

```
FAZ 5: Ağ & Kapsama sekmesi + PN Gezgini.

F40 — İstasyon ağı haritası:
  MapLibre GL + react-map-gl, basemap CARTO Positron
  (https://basemaps.cartocdn.com/gl/positron-gl-style/style.json — token gerekmez,
  açık tema THY diliyle uyumlu).
  Kaynak: stations.json (15 istasyon).
  - Daire işaretçi, yarıçap uçak sayısına göre (ucak2025 / ucak2033, header'daki yıl seçicisine bağlı)
  - Renk depoTipi'ne göre: ana_depo tk-red · ileri_depo tk-ink · hat_stok tk-slate · yok açık gri
  - Tıklama → popover: uçak sayısı, stok kalem/adet, transfer süresi, AOG kapsam oranı
  - Başlangıç görünümü Türkiye merkezli, uluslararası istasyonlar dahil olacak şekilde fitBounds

F41 — AOG kapsama (beta): üstte kritiklik seçimi + kabul edilebilir tedarik süresi (4/12/24 saat).
  transferSaatIST ≤ eşik olan istasyonlar "kapsanan" sayılır, çevrelerine yarı saydam tk-red-wash
  daire çiz. Alt köşede tek metrik: "Filonun %X'i N saat içinde kritik komponente erişemiyor."
  (Basit yaklaşım yeterli — gerçek isochrone gerekmiyor, yöntem notunda bunu belirt.)

F42 — Havuzlama simülatörü (beta): iki mod düğmesi "Mevcut dağıtım" / "Merkezî havuz + ileri stok".
  ssDağınık = Σ z√(λ_i·L) ; ssHavuzlu = z√(Σλ_i·L) ; tasarruf = 1 − ssHavuzlu/ssDağınık
  λ_i istasyonun uçak payına göre dağıtılır. Sonuç kartı: "Aynı servis seviyesi, %X daha az
  emniyet stoğu, $Y daha az bağlı sermaye." Kart notunda karekök yasasını tek cümleyle açıkla.

F60 — PN Gezgini: pn.json kolonsal dizilerinden 5.000 satırlık tablo.
  @tanstack/react-table + react-virtual ile sanallaştır (DOM'a 5.000 satır basma).
  Arama (PN kodu), filtreler (kritiklik, model, alt kategori, temin kanalı, durum),
  tüm kolonlarda sıralama, CSV dışa aktarma.
  Satıra tıklama → PN detay çekmecesi.

F61 — PN detay çekmecesi (global, her sekmeden açılabilir): sağdan açılan panel.
  Üstte PN + kritiklik rozeti, sonra 4 blok:
  (1) talep: 2025 gerçek → 2033 projeksiyon, çeyreklik oran
  (2) tedarik: lead time, temin kanalı, atölye kabiliyeti
  (3) stok: elde servis / pipeline / atıl, min-max 2025 ve 2033, açık-fazla
  (4) geri sayım: günlük talep, tükenme günü, kalan gün — büyük sayı, renkli
  En altta boş bir "Neden bu PN riskli?" alanı bırak, disabled buton + "Faz 3: LLM açıklaması"
  notu — yol haritasını görünür kıl.
```

---

## FAZ 6 — Cila ve demo hazırlığı

```
FAZ 6: Sunum günü için cila.

1. Responsive: 1440 / 1024 / 768 / 375 kontrol et. Sunum projeksiyonu genelde 1024 —
   o genişlikte hiçbir kart taşmasın, grafik etiketleri kesilmesin.
2. Erişilebilirlik: görünür klavye focus (2px tk-red outline), tüm grafiklerde
   renk + etiket birlikte, kontrast ≥ 4.5:1.
3. Boş durumlar: her filtrelenebilir bileşende yön veren boş mesaj —
   "Filtreye uyan PN yok. Kritiklik filtresini genişletin." Özür dileme, belirsiz olma.
4. Footer: kalıcı uyarı — "Veriler sentetiktir; case dokümanıyla verilen dummy set
   kullanılmıştır. Gerçek THY/AMOS verisi değildir." + yöntem özeti tek satır.
5. Sözlük: meta.json'daki 8 terimi header'daki "?" düğmesinde modal olarak göster
   (jüri AOG/TAT/rotable sorarsa hazır).
6. README.md yaz: kurulum, veri üretimi, VE "yeni feature nasıl eklenir" —
   somut bir örnek dosya + registry satırıyla. Takım arkadaşların buradan devam edecek.
7. npm run build uyarısız geçsin. dist/ tamamen statik olsun, internetsiz açılsın
   (fontları da yerelleştir — demo günü wifi'ye güvenme).
8. localStorage/sessionStorage KULLANMA, hiçbir yerde.

Son olarak kendi işini gözden geçir: her sekmeyi aç, spec bölüm 8'deki 10 kabul kriterini
tek tek doğrula ve sonucu raporla.
```

---

## Faz sonrası kontrol listesi

Her fazdan sonra sor:

```
Şu an ne çalışıyor, ne çalışmıyor? Kabul kriterlerinden hangileri karşılandı?
Spec'ten saptığın bir yer var mı, varsa neden?
```

## Sık çıkan sorunlar

| Belirti | Sebep / çözüm |
|---|---|
| Türkçe karakterler bozuk | CSV'ler `utf-8-sig`; build_data.py bunu zaten yapıyor. HTML'de `<meta charset="utf-8">` olduğundan emin ol |
| Tailwind renkleri uygulanmıyor | `content` yolu `./src/**/*.{ts,tsx}` içermiyor |
| Harita boş/gri | `import 'maplibre-gl/dist/maplibre-gl.css'` unutulmuş |
| Tablo takılıyor | Sanallaştırma bağlanmamış; 5.000 satır DOM'a basılıyor |
| Slider takılıyor | Her `onChange`'de 5.000 PN yeniden hesaplanıyor — rAF ile debounce et |
| Grafik kırmızıya boğulmuş | Seri renk sırası uygulanmamış; bir grafikte tek kırmızı kuralı |
