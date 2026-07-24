# Dashboard Rehberi — Ne, Nasıl, Hangi Veriyle?

Bu doküman projedeki iki dashboard'ı ve her modülü ayrıntılı açıklar: **ne gösterdiği**,
**nasıl hesaplandığı**, **hangi veriye dayandığı** ve **sunumda ne işe yaradığı**.

İki dashboard var:

1. **`control_tower.html`** — *Inventory Readiness Control Tower*. Ana ürün. Yönetim ve
   demo odaklı, karar akışını (See Risk → Understand Why → Simulate → Act) izleyen 8 modül.
2. **`envanter_2033_dashboard.html`** — Analitik derinlik. Tahmin modeli, envanter açık/fazla
   analizi ve kriz simülatörü. Metodolojiyi kanıtlayan teknik katman.

---

## Ortak temel: veri ve yöntem zinciri

Üç girdi CSV'sinden başlar:

- `dummy_pn_quarterly_data.csv` — 5.000 PN × 4 çeyrek talep (THY + POOL), scrap, TAT süreleri, atölye kabiliyeti, kritiklik.
- `dummy_pn_inventory_status.csv` — PN başına güncel stok durumu (faal/gayrifaal/tamirde/açık sipariş/depo) ve maliyetler (CLP, FMV, tamir).
- `fleet_distribution.csv` — 14 uçak modeli için 2025 → 2033 filo projeksiyonu (THY + POOL).

Hesaplama zinciri (her adım bir öncekinin çıktısını kullanır):

```
analysis.py      → talep tahmini (SBA) + 2033 projeksiyon + min-max + risk skoru
inv_analysis.py  → gerçek stok vs plan: açık / fazla / atıl sermaye
ct_data.py       → readiness, days-to-shortage, bubble, XAI, aksiyon, güven aralığı
train_demand_model.py → derin öğrenme modeli (opsiyonel, ayrı)
```

**Temel metrikler nasıl üretiliyor:**

- **Talep oranı (SBA):** Her PN'in çeyreklik talebi Syntetos-Boylan yöntemiyle tahmin edilir.
  Bu, yedek parça sektöründe kesikli (seyrek, sıfırlı) talep için standart yöntemdir; düz
  ortalamanın aksine sıfır çeyrekleri doğru işler. 1.730 PN'de talep kesikli.
- **2033 projeksiyonu:** PN'in bağlı olduğu modelin THY/POOL büyüme katsayılarıyla oran ölçeklenir.
  Örn. 737 MAX 8 parçaları ~3,8× büyür; A320-200 parçaları ~0,6× küçülür.
- **Lead time:** Atölye kabiliyeti VAR ise yurtiçi TAT, YOK ise min(yurtdışı TAT, satınalma TAT).
- **Min-Max:** Kritikliğe göre servis hedefi (AOG KRİTİK %98, KRİTİK %95, KRİTİK DEĞİL %90) →
  Poisson emniyet stoğu (z·√λ) → MIN = lead-time talebi + emniyet stoğu, MAX = MIN + bir çeyreklik talep.
- **AOG risk skoru (0-100):** kritiklik (%35) + lead time (%25) + filo büyümesi (%20) +
  atölye yokluğu (%10) + talep hacmi (%10) ağırlıklı bileşimi.

---

# 1. control_tower.html — Modüller

## 1.1 Executive Readiness Score (Hazırlık Skoru)
**Ne gösterir:** Üç gösterge — bugün, 2033 senaryosu, önerilen aksiyonlar sonrası — filonun
komponent hazırlığını tek sayıya indirir (0-100).

**Nasıl hesaplanır:** Her PN için kapsama = min(elde servis stok ÷ önerilen MIN, 1). Skor,
bu kapsamanın kritiklik ağırlıklı (AOG=3, KRİTİK=2, DEĞİL=1) ortalamasıdır.
- Bugün: MIN_2025'e karşı → **87,7**
- 2033: MIN_2033'e karşı (filo büyümüş, aynı stok) → **81,8**
- Aksiyon sonrası: AOG-kritik + yüksek riskli açıklar MIN'e tamamlanınca → **87,9**

**Veri:** Gerçek stok (inventory) + plan. **Sunumda:** Açılış slaytı. "Büyüme skoru düşürüyor,
ama doğru 344 parçaya $13,5M yatırım skoru geri kazandırıyor" — tek cümlede problem + çözüm.

## 1.2 Fleet Growth Time Machine (Filo Büyüme Simülatörü)
**Ne gösterir:** Filo büyüklüğü kaydırıcısı (1.200 → 2.000 uçak) + kriz gecikmesi. Oynatınca
hazırlık skoru, açık PN sayısı, AOG-kritik açık, ek tampon stok ve ek sermaye ihtiyacı anlık güncellenir.
Altındaki eğri, skorun filo büyüdükçe nasıl düştüğünü gösterir.

**Nasıl hesaplanır:** Filo f için talep oranı 2025 ve 2033 uçları arasında doğrusal
interpole edilir: `oran(f) = oran₂₀₂₅ + (oran₂₀₃₃ − oran₂₀₂₅)·(f−1200)/800`. Her f'te MIN yeniden
hesaplanıp mevcut stokla karşılaştırılır. Tüm hesap tarayıcıda, 5.000 PN üzerinde canlı.

**Veri:** Talep oranları + filo projeksiyonu + gerçek stok. **Sunumda:** Demo'nun kalbi.
Kaydırıcıyı 2.000'e çekip "tedarikçi krizi" düğmesine basmak jüriye canlı etki gösterir.

## 1.3 Component Risk Matrix (Risk Matrisi — Bubble Chart)
**Ne gösterir:** Her balon bir PN. X = tedarik süresi (gün), Y = stockout olasılığı,
boyut = stok değeri, renk = kritiklik. Sağ-üst köşe en tehlikeli bölge: uzun tedarikli + yüksek
stockout riskli parçalar.

**Nasıl hesaplanır:** Stockout olasılığı = P(lead-time boyunca talep > mevcut stok), Poisson
dağılımıyla (büyük λ'da normal yaklaşım). En riskli 450 PN gösterilir.

**Veri:** Talep + lead time + stok + FMV. **Sunumda:** "Pahalı parça ≠ kritik parça" ayrımını
görselleştirir — ucuz ama operasyonu durduran parçalar sağ-üstte kırmızı görünür.

## 1.4 Days to Shortage (Kritiğe Kalan Gün)
**Ne gösterir:** Adet yerine zaman. Her PN'in kaç gün sonra kritiğe düşeceği; en yakınlar üstte.
Tabloda stok, ihtiyaç, kalan gün (renk kodlu) ve pipeline (yoldaki adet).

**Nasıl hesaplanır:** Günlük talep = çeyreklik oran ÷ 91,25. Kalan gün = elde servis stok ÷ günlük talep.
180 günden yakın olanlar listelenir.

**Veri:** Talep oranı + gerçek stok. **Sunumda:** Aciliyet hissi yaratır — "şu parça 14 gün sonra
biter" soyut adetten daha güçlüdür.

## 1.5 Explainable AI + Next Best Action (Açıklanabilir AI + Aksiyon)
**Ne gösterir:** Soldan PN seç → sağda (a) neden kritik olduğunun madde madde açıklaması,
(b) 2033 tahmini güven aralığıyla, (c) önerilen aksiyon + tahmini etki (AOG riski önce→sonra) +
satın al/tamir/pool maliyet kıyası + aksiyon butonları.

**Nasıl hesaplanır:** Açıklama, risk skorunu oluşturan faktörlerden metne dökülür (talep artışı %,
kapsama günü, lead time, atölye durumu, kritiklik, atıl stok). Aksiyon kural tabanlıdır:
tamir/yeni oranı %70'i aşarsa → scrap+yeni; atölye VAR → yurtiçi tamiri hızlandır;
pool/exchange aktifse → pool; aksi halde erken satın alma.

**Veri:** Tüm katmanlar + maliyetler. **Sunumda:** "Sadece grafik değil, karar öneren sistem"
argümanının kanıtı. Prescriptive (öneren) seviyeye çıktığınızı gösterir.

## 1.6 Forecast Confidence (Tahmin Güven Aralığı)
**Ne gösterir:** 2033 toplam yıllık talep, tek kesin değer değil belirsizlik bandıyla
(beklenen + kötümser–iyimser aralık).

**Nasıl hesaplanır:** Beklenen değer etrafında senaryo bandı (iyimser/kötümser). Belirsizlik
kaynakları: uçuş saati değişimi, arıza oranı, TAT, filo teslimat takvimi.

**Veri:** Toplam talep tahmini. **Sunumda:** Yöntemsel olgunluk — "tahminin belirsizliğini de
yönetiyoruz" mesajı.

---

# 2. envanter_2033_dashboard.html — Modüller

## 2.1 Alarm şeridi + KPI kartları
2033 önerilen MIN'i bugünkü MAX'ın üstünde olan PN'ler (kapasite açığı alarmı) ve genel
büyüklükler: yıllık talep 90.016 → 147.264 (+%64), min-max toplamları, scrap projeksiyonu.

## 2.2 Model bazında talep grafiği
2025 vs 2033 talebi model model. **Ana içgörü:** sorun hacim değil **karma değişimi** —
737 MAX 8 ve A321neo zirveye çıkarken bugünün lideri A320-200 küçülüyor. Bugünkü stok yanlış
parçalara bağlı.

## 2.3 Risk dağılımı + ısı haritası
5.000 PN'in risk skoru dağılımı ve ATA alt kategorisi × kritiklik ısı haritası. En sıcak hücreler
(ENGINE, LANDING GEAR × AOG KRİTİK) atölye kabiliyeti yatırım önceliğini gösterir.

## 2.4 Derin öğrenme modeli
TensorFlow/Keras hibrit model (λ = istatistiksel baseline × e^(NN düzeltmesi)). Üç grafik:
eğitim eğrisi, Q4 testinde MAE karşılaştırması (baseline'larla), gerçek vs tahmin saçılımı.
**Bulgu:** 4 çeyrekle ağ klasiklerle başa baş; gerçek AMOS verisiyle avantaj ortaya çıkar.

## 2.5 Mevcut envanter durumu
Gerçek stokla: toplam değer $143M, atıl sermaye $14M, 1.845 açık PN (330 AOG KRİTİK),
495 fazla PN. Kritikliğe göre açık/dengede/fazla dağılımı ve sermaye kırılımı.

## 2.6 Kriz & Dayanıklılık Simülatörü
Talep şoku / tedarik gecikmesi / servis hedefi kaydırıcıları → 5.000 PN için MIN yeniden hesaplanır,
açığa/AOG'ye düşen PN ve ek sermaye anlık gösterilir. Dört hazır senaryo.

## 2.7 PN tablosu
5.000 PN, riske göre sıralı, arama + kritiklik + alarm filtreli. Her satırda talep 25→33,
mevcut/önerilen min-max, risk çubuğu, alarm rozeti.

---

# 3. Bilinçli yapılmayanlar — Faz 2 (dürüstlük notu)

Case vizyon belgesindeki üç modül **veriyle desteklenemediği için yapılmadı**. Uydurmak yerine
yol haritasına konuldu:

| Modül | Neden yapılmadı | Ne gerekir (Faz 2) |
|---|---|---|
| Station Risk Map + Stock Flow transfer | Veride istasyon bazlı stok yok | İstasyon × PN stok kayıtları |
| Maintenance Demand Timeline | Bakım takvimi yok | Planlı bakım tarihleri + rezervasyonlar |
| Tam Rotable Repair Pipeline (aşamalı) | Sadece toplam tamirde adet var, aşama akışı yok | Parça bazlı tamir durum kayıtları |

Bu Faz 2 verileri, makaledeki (Sezenoğlu Çetin vd., Aerospace 2026) uçuş saati / cycle / arıza
geçmişi yaklaşımıyla birebir örtüşür — yani AMOS entegrasyonu hem bu modülleri hem de derin
öğrenme modelinin gerçek gücünü açar. Sunumda bu, "bugünkü prototip + net yol haritası" hikâyesi verir.

---

# 4. Başarı kriterleri (dashboard'ın izlediği KPI'lar)

Readiness Score, AOG-kritik açık PN sayısı, açık kapatma maliyeti, atıl/fazla bağlı sermaye,
days-to-shortage, forecast accuracy (MAE), fill rate hedefi. **Ana hedef:** minimum sermaye ile
maksimum komponent erişilebilirliği.
