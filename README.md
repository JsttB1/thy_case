# Komponent Kontrol Kulesi — Filo Büyür, Envanter Hazır Mı?

Turkish Technic'in komponent hizmet kapasitesi 8 yılda **1.200 → 2.000 uçağa** (+%67) çıkarken
envanter yönetimi için **görünürlük + öngörü + aksiyon** karar destek prototipi.
"Uçaklar için kule var, komponentler için yok."

Ana tez: sorun stok adedi değil (fazla+ölü stok ~$0,4M), **görünürlük ve süreç** —
134 PN bugün kırmızıda (TTS < TTR) ve 72'sinin açık siparişi yok. Talep +%63–68 bandında
büyürken üçte ikisi **yer değiştiriyor** (yeni nesil %34 → %65): büyüme değil göç.

## Kurulum

Tek gereksinim [uv](https://docs.astral.sh/uv/) — Python sürümünü ve bağımlılıkları kendisi kurar:

```bash
uv sync
```

## Ana akış — Kontrol Kulesi dashboard'u

```bash
# Tek doğruluk kaynağından (core.py) tek dosyalık dashboard üret:
uv run build_dashboard.py
# → kontrol_kulesi.html  (tarayıcıda aç; internet gerektirmez, tüm veri gömülü)
```

| Sekme | İçerik |
|---|---|
| **Kokpit** | Sermaye kokpiti ($132,9M FMV), 72 siparişsiz kırmızı vurgusu, üç para musluğu ($67,8M scrap · $23,3M→$39,0M float · $52,0M phase-out), pool/exchange kartı (3,6× anomali), gayrifaal karar kuyruğu ($8,5M↔$13,9M), iki Pareto, fragmentasyon haritası, faz yol haritası (metrik kapılı), başarı kriterleri, veri boşlukları tablosu |
| **Watchlist** | 5.000 PN risk skoru sıralı; filtreler (kırmızı, siparişsiz, 547, BER, phase-out, yeni nesil, hurda anomalisi 159, pool bağımlı 150); PN detayında TTS/TTR + aksiyon merdiveni + canlı Poisson stok-out eğrisi |
| **Öngörü & AI** | Q3 mevsimselliği (kritiklikte homojen), ABC×XYZ segmentasyon matrisi, hurda kategori kırılımı + anomali dedektörü (159 PN), 2033 bandı (+%63–68), talep göçü, kategori ayrışması, phase-out planlayıcısı, TensorFlow modeli (3 tohumlu topluluk; eğitim eğrisi/MAE/scatter), model künyesi, tahmin gezgini (PN bazlı), hata analizi (kesiklilik/kritiklik/hacim), cold-start canlı Bayes demosu, rutin dışı bakım entegrasyonu vizyonu |
| **Harita** | İki modlu etkileşimli ağ: **Türkiye haritası** (gömülü kontur, 16 yurt içi havalimanı, kaydır/yakınlaştır) + **küresel ağ** (İstanbul merkezli azimut görünümü, 9 yurt dışı hub, uzaklık halkaları) · stok/talep/kırmızı/MIN33/dışa bağımlı görünümleri · 2025↔2033 karşılaştırma · kriz etkisi katmanı (Senaryo ile bağlı) · tamir akış okları · kategori + kritiklik filtreleri · grup toplamları basılı case tablosuyla birebir (temsili dağıtım etiketli) · ATA×kritiklik risk ısı haritası |
| **Senaryo** | Kriz simülatörü: senaryo kütüphanesi (motor ailesi krizi, pandemi, OEM gecikmesi, lojistik…) → 5.000 PN canlı yeniden hesap; **canlı parametre paneli** (kritiklik ağırlıkları, BER eşiği, alarm tamponu — jüri modu); dayanıklılık paneli (TTS histogramı + FMV/CLP kıtlık sensörü); filo kaydırıcısı 2025→2033 + float sayacı; kabiliyet ROI kapanışı |


## Sunum paketi (`sunum/`)

```bash
cd sunum
uv run fill_sablon.py                # → Grup3_Komponent_Kontrol_Kulesi.pptx (RESMİ şablon, 7 slayt limiti)
node make_deck.js                    # → kontrol_kulesi_sunum.pptx (11 slaytlık geniş yedek deste)
uv run make_handout.py               # → kontrol_kulesi_el_notu.pdf (2 sayfa jüri el notu)
```

`sablon.pptx` organizatörün resmi şablonudur; `fill_sablon.py` tasarıma dokunmadan yalnız
metinleri doldurur (7 sayfa sınırı korunur).

`deck_data.json` sunum sayılarını `build_dashboard.build_payload()`'dan alır — slaytlar ile
dashboard aynı kaynaktan beslenir, ayrışamaz. Sunucu akışı: `sunum/SUNUM_KILAVUZU.md`.

## Diğer script'ler

```bash
uv run analysis.py              # (eski akış) SBA + 2033 min-max + risk skoru → pn_2033_plan_full.csv
uv run inv_analysis.py          # (eski akış) gerçek stok vs plan
uv run train_demand_model.py    # TensorFlow/Keras hibrit model → demand_model.keras + model_results.json
```

`train_demand_model.py` çıktısı varsa dashboard AI bölümünü otomatik doldurur; yoksa uyarı gösterir.

## Dosyalar

| Dosya | Açıklama |
|---|---|
| `core.py` | **Tek doğruluk kaynağı** — tüm formüller (risk, float, TTS/TTR, Poisson min-max, BER, kabiliyet ROI) + parametreler (CLAUDE.md §4.1) |
| `build_dashboard.py` | core.py → JSON payload → `kontrol_kulesi.html` |
| `assets/app.css`, `assets/app.js` | Dashboard tasarım sistemi ve uygulama katmanı |
| `vendor/chart.umd.js` | Chart.js 4.4.4 (gömülür — internetsiz çalışma) |
| `CLAUDE.md` | Proje bağlamı: doğrulanmış tüm sayılar, formüller, vizyon, sunum planı |
| `dummy_pn_quarterly_data.csv` | 5.000 PN × 4 çeyrek talep/scrap/TAT (resmi girdi) |
| `dummy_pn_inventory_status.csv` | PN bazlı stok kovaları + CLP/FMV/tamir maliyetleri (resmi girdi) |
| `fleet_distribution.csv` | 14 model, 2025→2033 filo projeksiyonu (resmi girdi) |
| `train_demand_model.py`, `demand_model.keras`, `model_deney_notlari.md` | Derin öğrenme hattı |

## Doğrulama

- Gömülü her sayı `core.py`'den yeniden üretilebilir; CLAUDE.md §3'teki 102 metrik script'le mutabakatlandı.
- Float formülü saha doğrulaması: model 8.012 ↔ gerçek tamirde 7.800 adet (**%97**).
- Risk skoru 1 numarası PN-101741, envanter verisinde fiilen kırmızı.
- **Tüm veriler sentetik/temsili** — gerçek THY/AMOS verisi değildir.

Referans: Sezenoğlu Çetin vd., *Data-Driven Predictive Maintenance for Aircraft Components
Through Sparse Event Logs*, Aerospace 2026, 13, 110.
