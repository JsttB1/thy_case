# Catalyst — Komponent Envanter Karar Platformu

Turkish Technic'in komponent hizmet kapasitesi 8 yılda **1.200 → 2.000 uçağa** (+%67) çıkarken
envanter yönetimi için **görünürlük + öngörü + aksiyon** karar destek platformu.

Ana tez: sorun stok adedi değil (fazla+ölü stok ~$0,4M), **görünürlük ve süreç** —
134 PN bugün kırmızıda (TTS < TTR) ve 72'sinin açık siparişi yok. Talep +%63–68 bandında
büyürken üçte ikisi **yer değiştiriyor** (yeni nesil %34 → %65): büyüme değil göç.

> **Grup 9/10** · Global Talent Bridge (Turkish Technic) MRO hackathon'u.
> Tüm veriler sentetiktir — case ile verilen dummy setler; gerçek THY/AMOS verisi değildir.

---

## Mimari — iki katman, tek doğruluk kaynağı

```
core.py  ─(build_dashboard.py)→  web/src/data/payload.json  ─→  web/  (React uygulaması)
 (Python hesap çekirdeği)              (veri paketi)              (canlı ürün)
```

- **`core.py`** — tek doğruluk kaynağı. Tüm formüller (risk, float, TTS/TTR, Poisson min-max,
  BER, kabiliyet ROI) ve parametreler burada. Kaynak veri `veri/eski/` altındaki üç CSV'den okunur.
- **`build_dashboard.py`** — çekirdeği alır, kompakt `payload.json` üretir. Uygulama hesaplanmış
  sayı üretmez; hepsi bu payload'dan ya da payload'ı birebir tekrarlayan TypeScript çekirdeğinden gelir.
- **`web/`** — React + TypeScript + Vite uygulaması. Canlı ürün. Ayrıntı: [`web/README.md`](web/README.md).

## Teslim: tek dosya, kurulum yok, internet yok

Sunum ve saha kullanımı için uygulama **tek bir HTML dosyasına** paketlenir:

```bash
cd web && npm install && npm run build:tek-dosya
# → web/dist-tek-dosya/Catalyst.html  (~2,4 MB)
```

Bu dosya kendi kendine yeter: JavaScript, CSS, 5.000 parçalık veri seti, 3D dünya konturu ve
grafik kütüphanelerinin tamamı içine gömülüdür. **Çift tıklanır, tarayıcıda açılır.** Kurulum,
sunucu, ağ bağlantısı ve yönetici hakkı gerekmez; şirket bilgisayarına kopyalanıp çalıştırılabilir.

Paketi her yeniden ürettiğinizde doğrulayın:

```bash
uv run --with playwright python offline_dogrula.py
```

Başsız tarayıcıyı `file://` ile açar, beş sekmeyi gezer, 3D kürenin çizildiğini kontrol eder ve
**`file://` dışına çıkan her isteği sayar** — asıl offline garantisi bu sayının sıfır olmasıdır.
Sorun varsa sıfırdan farklı çıkış kodu döner. Son çalıştırma: 5/5 sekme, canvas 1500×896,
0 dış istek, 0 konsol hatası.

İki not:

- **Yerel diske kopyalayın.** Ağ paylaşımından (`\\sunucu\...`) doğrudan açılırsa bazı kurumsal
  tarayıcı politikaları dosyayı "İnternet bölgesi" sayıp betikleri kısıtlayabilir.
- **WebGL kapalıysa** 3D katman açılmaz; uygulama bunu yakalar ve aynı sayıları düz liste olarak
  gösterir — sayfanın geri kalanı çalışmaya devam eder.

## Geliştirme

```bash
cd web
npm install
npm run dev              # geliştirme sunucusu
npm run build:tek-dosya  # dist-tek-dosya/index.html — offline tek dosya (jüri demosu)
npm test                 # 113 kontrol: 57 motor paritesi + 9 küre + 19 arazi + 28 hangar geometrisi
```

**Veri hattı** (payload'ı çekirdekten yeniden üret — yalnız CSV/formül değişirse gerekir):

```bash
uv sync                  # Python ortamı ([uv](https://docs.astral.sh/uv/) her şeyi kurar)
uv run build_dashboard.py   # veri/eski/*.csv → web/src/data/payload.json
```

## Ekranlar

| Sekme | İçerik |
|---|---|
| **GİRİŞ** — dijital hangar (sekme değil, kapı) | Uygulama açılınca çalan beş perdelik tek çekim 3D sahne. Gece hangarı, park hâlindeki THY uçağı, kapının ötesinde inip kalkan trafik; kamera kesintisiz olarak kapıdan çıkıp piste bakar, geri dönüp **motora yandan yanaşır** — kaportanın kesilmiş yüzünden fan · kompresör kademeleri · yanan yanma odası · türbin görünür. Son perdede parçalar dağılıp CODE ekranındaki karar küresine dönüşür. Uçak/motor dâhil her şey prosedürel geometridir (hazır 3D model yok — tek dosya offline garantisi). Motorun üstündeki sekiz rozet **payload'daki sekiz ATA motor kategorisidir** (ATA 71–80): 1.552 PN · 55 kırmızı · $43,2M bağlı sermaye; her rozet kendi fiziksel istasyonunda (yanma odası rozeti yanma odasının hizasında), tıklayınca kategori künyesi açılır. Üst bardaki **3D SERBEST** anahtarı kamerayı kullanıcıya verir: sürükle döndür, tekerlek yakınlaştır. `Enter`/`ESC` ile geç, `← →` ile perde değiştir; üst bardaki markaya basınca yeniden oynar |
| **CODE** — Component Decision Engine (açılış) | Kararın verildiği tek yüzey, koyu operasyon konsolu. **Çekirdek (3D):** 5.000 parçanın operasyon küresi — her nokta gerçek bir parça, rengi karar motorunun kanalı, kuzey kutbu en yüksek risk; küreye tıklamak parçayı karar konsoluna düşürür. **İçgörü akışı:** 12 bulgu, her biri bir ekrana köprülü (cümle sabit, sayı canlı). **Karar konsolu:** dört kuyruk + önerilen aksiyon kartı (yetmeme riski öncesi/sonrası) + Onayla/Ata/Haritada incele/Talep/Yoksay + aksiyon merdiveni. **Kısa vade:** kanal dağılımı (havuz 694 / tamir 641 / satın alma 217 / izle 3.448), sipariş penceresi alarmı (42), planlama ufku, transfer önerileri. **Uzun vade:** 2033 yol haritası, faz kapıları metrik |
| **Watchlist** | 5.000 PN risk skoru sıralı; filtreler (kırmızı, siparişsiz, 547, BER, phase-out, yeni nesil, hurda anomalisi 159, pool bağımlı 150); PN detayında künye + risk skoru, 2033 ihtiyaç bandı, önerilen aksiyon kartı (salt-okunur — karar CODE konsolunda verilir), TTS/TTR, aksiyon merdiveni, canlı stok yeterlilik eğrisi ve çeyreklik tahmin profili |
| **Öngörü & AI** | Q3 mevsimselliği, ABC×XYZ segmentasyon matrisi, hurda kategori kırılımı + anomali dedektörü (159 PN), geriye dönük test, **model bazında yıllık talep 2025→2033** (14 model), talep göçü, kategori ayrışması, tahmin gezgini (PN bazlı) |
| **Harita** — tam ekran 3D küre | Ekranın tamamını kaplayan operasyon küresi; paneller cam HUD. Kıtalar hazır dokudan değil, aynı 110m kontur verisinden çalışma anında noktalanarak üretilir (internetsiz). Rota büyük çember yaylarında **akan parçacıklarla** çizilir — parçacık hızı kanal tipinden gelir ("hangi yol hızlı" hareketten okunur). Kanal satırına tıkla, küre o yola uçsun. Sütun metriği seçilebilir (uçak · stok · talep · kırmızı · MIN 2033 · dışa bağımlı), kritiklik süzgeci, 2033 karşılaştırma, kriz katmanı (Senaryo'ya bağlı) |
| **Senaryo** — kriz simülatörü | **Şok gülü:** 7 eksenli radar kontrol yüzeyi (talep · TAT · gümrük · atölye · havuz · kur · servis) — krizin ŞEKLİ; preset seçilince poligon o şekle morph eder, elle sapınca kesikli referans poligonu kalır. 11 preset. **Kriz arazisi (3D):** kategori × ay yükseklik alanı — 5.000 parça her ay yeniden hesaplanır, "duvara kaçıncı ayda çarpıyoruz" sorusunun cevabı. **Kriz takvimi:** tırmanma → plato → toparlanma profilleri, tıklanabilir ay şeridi; zirve kırmızı, duvar ayı, zirve açık pozisyon, kriz yükü (parça·ay). **Alarm rayı:** 12 eşik tabanlı uyarı (SEN-A00…A11) — koşulu sağlanmayan alarm listeye girmez. **Belirsizlik denemeleri** (kümülatif olasılık eğrisi, %80/%90/%95 aralık, senaryo sabitleme, beklenen fatura ↔ kötü giden %10, formül↔deneme doğrulaması); canlı dayanıklılık dağılımı (emniyet marjı ↔ dayanma süresi); seçili senaryonun etrafında tornado duyarlılık; greedy kaynak tahsisi; kabiliyet ROI |

## İç veri gezgini (`data_explorer.py`, PyQt6)

Sunum için değil, ekibin ham veriyi kurcalaması için masaüstü araç. Dört veri seti
(core.build() türetilmiş PN tablosu + üç ham CSV), filtreler + PN arama, beş grafik tipi,
sıralanabilir tablo, `describe()` istatistiği, PN çift-tıkla çeyreklik kırılım, CSV dışa aktarım.

```bash
uv run --group gui python data_explorer.py
```

PyQt6 yalnız `gui` bağımlılık grubunda; `uv sync` onu kurmaz. Başsız testi:
`QT_QPA_PLATFORM=offscreen uv run --group gui python data_explorer.py --selftest`.

## Derin öğrenme hattı (isteğe bağlı)

```bash
uv run train_demand_model.py    # → veri/eski/demand_model.keras + veri/eski/model_results.json
```

Çıktı varsa `build_dashboard.py` Öngörü bölümünü otomatik doldurur (tahmin gezgini); yoksa atlar.
`model_results.json` ve `demand_model.keras` bilerek repoda — klonlayan TensorFlow kurmadan payload üretebilir.

## Klasör yapısı

```
core.py                 tek doğruluk kaynağı (hesap çekirdeği)
build_dashboard.py      core.py → web/src/data/payload.json
train_demand_model.py   derin öğrenme hattı (TensorFlow)
data_explorer.py        iç veri gezgini (PyQt6)
offline_dogrula.py      tek dosya teslim paketini file:// üstünden sınar
pyproject.toml, uv.lock Python bağımlılıkları

web/                    React + TypeScript + Vite uygulaması (canlı ürün)
  src/engine/           hesap çekirdeği — core.py formüllerinin TS ikizi
  src/views/            ekranlar (Giris, Code, Watchlist, Ongoru, Harita, Senaryo)
  src/views/hangar/     açılış sahnesi: prosedürel uçak/motor geometrisi + koreografi
  src/data/payload.json build_dashboard.py çıktısı (uygulamanın okuduğu veri)

veri/
  eski/                 kaynak veri + referans belgeler (mevcut sürüm)
    dummy_pn_quarterly_data.csv, dummy_pn_inventory_status.csv, fleet_distribution.csv
    model_results.json, demand_model.keras
    CASE_BRIEFING.md, PROJE_OZETI.md, model_deney_notlari.md
    Grp(910.pdf, aerospace-13-00110-v2.pdf   (git dışı, ~46 MB)
  yeni/                 gelecekte üretilecek veri/belge dosyaları buraya
```

## Doğrulama

- Gömülü her sayı `core.py`'den yeniden üretilebilir; 102 metrik CSV'lerden script'le mutabakatlandı.
- Web parite testleri (`npm test`, 113 kontrol): kanal dağılımı 694/641/217/3.448 · sipariş alarmı 42 ·
  kırmızı 134/22 · motor krizi 477 · belirsizlik 389 (%80: 371–408). Taşımada tek bir sayı kaybolmadı.
  Yeni şok eksenleri (gümrük · atölye · havuz · kur · filo bandı) nötrken baz durumu BİREBİR verir;
  kriz takviminin 0. ayı da aynı 134'ü üretir — testler bu sözleşmeyi kilitliyor.
- Float formülü saha doğrulaması: model 8.012 ↔ gerçek tamirde 7.800 adet (**%97**).
- **Tüm veriler sentetik/temsili** — gerçek THY/AMOS verisi değildir.

Referans: Sezenoğlu Çetin vd., *Data-Driven Predictive Maintenance for Aircraft Components
Through Sparse Event Logs*, Aerospace 2026, 13, 110.
