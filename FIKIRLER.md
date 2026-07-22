# Fikir Bankası — Turkish Technic Komponent Envanter Case'i

> Sunumda kullanılacak stratejik fikirler + dashboard feature havuzu.
> Durum etiketleri: `[HAZIR]` mevcut veriyle hesaplanabilir · `[EK VERİ]` sentetik ek veri gerekir · `[VİZYON]` sadece sunumda anlatılır

---

## 1. Ana tez — sunumun tek cümlesi

> **"1.200'den 2.000 uçağa çıkarken envanteri %67 büyütmenize gerek yok.
> Doğru soru 'ne kadar stok' değil, 'ne zaman sipariş' ve 'nerede tutuyoruz'."**

Veriyle desteği (build_data.py çıktısından, gerçek sayılar):
- Filo büyümesi **%66,7** · talep büyümesi **%63,6** · ama önerilen MIN stok büyümesi sadece **%28,8**
- Yani doğrusal ölçekleme baştan yanlış — emniyet stoğu √λ ile büyüyor, λ ile değil.
- Bu tek grafik ("filo %67 ↑ / stok %29 ↑") sunumun açılış slaytı olmalı.

---

## 2. Wow malzemeleri (jüriyi şaşırtan iddialar)

### 2.1 Alarm stok seviyesinde değil, TAKVİMDE olmalı `[HAZIR]`
Motor bileşenlerinde lead time 12–52 hafta. "Stok min'e düştü" alarmı bu vadede
yapısal olarak geç kalmış bir alarmdır. Doğru metrik *stok miktarı* değil,
**son sipariş tarihine kalan gün**.

```
günlük_talep      = çeyreklik_oran / 91,25
tükenme_günü      = eldeki_servis_stok / günlük_talep
kalan_gün         = tükenme_günü − lead_time
```

**Veriden çıkan sonuç: 408 PN'in sipariş tarihi ÇOKTAN GEÇMİŞ (96'sı AOG kritik),
957 PN'de 30 günden az kalmış.** Bunların çoğu klasik min-max ekranında "yeşil" görünüyor.
→ Bu, mevcut sisteme yöneltilen en somut eleştiri. Deliverable #2'nin (mevcut durum analizi) omurgası.

### 2.2 Karekök yasası / risk pooling `[HAZIR-hesap, EK VERİ-istasyon]`
n lokasyona dağılmış bağımsız talepte emniyet stoğu havuzlandığında √n ile ölçeklenir.
5 istasyonluk dağınık stok → tek havuzda ~%55 daha az sermaye, aynı servis seviyesi.
Case'in POOL vurgusu (800 THY + 1.200 POOL) tam da buna işaret ediyor.

### 2.3 Little's Law — envanter kısmen bir SÜREÇ problemi `[HAZIR]`
Rotable'lar tüketilmez, döner: sökülür → atölye → serviceable → takılır.
`dolaşımdaki ihtiyaç = sökülme hızı × döngü süresi`
→ Atölye TAT'ını %20 kısaltmak, %20 daha az yedek almakla aynı etkiyi yapar.
Veride karşılığı: **13.515 adet pipeline'da bekliyor, 40,2M$ sermaye orada duruyor.**
Literatürdeki adı: METRIC / VARI-METRIC (USAF, rotable envanterde fiilî standart) — sunumda adını anmak kredibilite verir.

### 2.4 Atıl sermaye = bedava kazanç `[HAZIR]`
4.803 adet gayrifaal parça = **13,9M$** yerde duran sermaye.
Ayrıca 187 PN'de tamir maliyeti yeni alımın %70'ini aşıyor → tamir etme, scrap+yeni al.
"Yeni bütçe istemeden envanter iyileştirme" hikâyesi.

### 2.5 Kapsama haritası (heatmap değil!) `[EK VERİ]`
Stok yoğunluğu heatmap'i şık ama bilgi vermez. Bunun yerine:
her istasyon için *"kritik komponent arızalanırsa en yakın serviceable üniteye kaç saatte ulaşırım"*
→ transfer süresine göre kapsama alanları. Kapsanmayan bölge kırmızı kalır.
Harita "burada çok parça var"ı değil **"burada AOG riski var"**ı gösterir.

---

## 3. Dashboard feature havuzu

### Sekme: Genel Bakış
| # | Feature | Durum | Not |
|---|---|---|---|
| F01 | Sipariş Geri Sayım Panosu (havalimanı FIDS tarzı) | `[HAZIR]` | **imza öğe** — kalan_gün'e göre sıralı, negatifler kırmızı |
| F02 | KPI şeridi (filo/talep/stok/sermaye/alarm) | `[HAZIR]` | |
| F03 | "Doğrusal büyüme yanılgısı" grafiği (%67 vs %29) | `[HAZIR]` | açılış tezi |
| F04 | Aksiyon özeti — bugün ne yapılmalı (ilk 5 madde) | `[HAZIR]` | |

### Sekme: Talep & Tahmin
| # | Feature | Durum |
|---|---|---|
| F10 | Model bazında talep 2025→2033 (14 model) | `[HAZIR]` |
| F11 | Çeyreklik mevsimsellik (Q3 zirve, Q4 −%15 düşüş) | `[HAZIR]` |
| F12 | ML modeli paneli: eğitim eğrisi / MAE karşılaştırma / scatter | `[HAZIR]` |
| F13 | Kesikli talep (intermittent) analizi — 1.730 PN | `[HAZIR]` |
| F14 | Weibull hazard / survival modeli | `[VİZYON]` faz 3 |

### Sekme: Envanter Sağlığı
| # | Feature | Durum |
|---|---|---|
| F20 | Açık / Dengede / Fazla dağılımı × kritiklik | `[HAZIR]` |
| F21 | Sermaye dağılımı (servis / pipeline / atıl / fazla) | `[HAZIR]` |
| F22 | Sipariş geri sayım tablosu (tam liste, filtreli) | `[HAZIR]` |
| F23 | Tamir mi yeni alım mı? (187 PN scrap önerisi) | `[HAZIR]` |
| F24 | Pipeline yaşlandırma (kaç gündür tamirde) | `[EK VERİ]` |

### Sekme: Risk & Kritiklik
| # | Feature | Durum |
|---|---|---|
| F30 | AOG risk skoru dağılımı (histogram) | `[HAZIR]` |
| F31 | Isı haritası: ATA alt kategorisi × kritiklik | `[HAZIR]` |
| F32 | En riskli 100 PN | `[HAZIR]` |
| F33 | Risk skoru ayrıştırma — hangi faktör kaç puan getirdi | `[HAZIR]` |
| F34 | İç atölye yatırım adayları (AOG kritik + atölye YOK) | `[HAZIR]` |

### Sekme: Ağ & Kapsama (harita)
| # | Feature | Durum |
|---|---|---|
| F40 | İstasyon ağı haritası (15 istasyon, uçak dağılımı) | `[EK VERİ]` hazır |
| F41 | AOG kapsama alanları (isochrone) | `[EK VERİ]` |
| F42 | Havuzlama simülatörü (dağınık vs merkezî + √n tasarrufu) | `[EK VERİ]` |
| F43 | Transfer akış çizgileri (hangi istasyondan hangisine) | `[EK VERİ]` |
| F44 | 2033'te açılacak yeni istasyon önerisi | `[VİZYON]` |

### Sekme: Senaryo Simülatörü
| # | Feature | Durum |
|---|---|---|
| F50 | Kriz simülatörü (talep şoku / lead time / servis hedefi) | `[HAZIR]` mevcut |
| F51 | **1.200 → 2.000 filo slider'ı** (canlı yeniden hesap) | `[HAZIR]` |
| F52 | TAT kaldıracı (Little's Law paneli) | `[HAZIR]` |
| F53 | İki senaryo karşılaştırma: mevcut yapı vs havuzlanmış yapı | `[EK VERİ]` |
| F54 | Monte Carlo AOG olay simülasyonu | `[EK VERİ]` önceden hesapla, JSON'a yaz |

### Sekme: PN Gezgini
| # | Feature | Durum |
|---|---|---|
| F60 | 5.000 PN sanallaştırılmış tablo + filtre/arama | `[HAZIR]` |
| F61 | PN detay çekmecesi (tüm metrikler tek ekranda) | `[HAZIR]` |
| F62 | "Neden?" — LLM açıklama butonu | `[VİZYON]` slot bırak |
| F63 | CSV / rapor dışa aktarma | `[HAZIR]` |

---

## 4. Sunum iskeleti (case Bölüm 4'teki 6 maddeye birebir)

1. **Problem** → Filo %67 büyüyor; kırılma noktası stok miktarı değil, sipariş zamanlaması ve ağ yapısı.
2. **Mevcut durum** → Min-max mantığı uzun lead time'da yapısal olarak geç kalıyor. Kanıt: 408 PN'in sipariş tarihi geçmiş, 96'sı AOG kritik. 13,9M$ atıl sermaye.
3. **Çözüm** → Envanter Kontrol Kulesi: takvim bazlı alarm + risk skoru + ağ kapsaması + senaryo motoru.
4. **Prototip** → Canlı dashboard demosu (geri sayım panosu + filo slider'ı).
5. **Önceliklendirme** → Faz 1: 156 yüksek riskli PN için geri sayım alarmı (2 ay). Faz 2: ağ/havuzlama (6 ay). Faz 3: survival modeli + AMOS entegrasyonu (12 ay+).
6. **Başarı kriteri** → AOG saati/1000 uçuş saati · fill rate · bağlı sermaye · **acil (AOG) sevkiyat oranı** (panik satın alma göstergesi — çok az takım bunu düşünür).

---

## 5. Sunumda dikkat

- ML doğruluğunu satma. Model MAE 1,77 vs baseline 1,72 — başa baş. **Bunu zayıflık değil bulgu olarak sun:**
  "4 çeyreklik veriyle istatistiksel tavan bu; makale (Sezenoğlu Çetin vd., Aerospace 2026) 10 yıllık gerçek veride
  aynı sonuca varıyor — seyrek bakım verisinde saf DL yetmez, hibrit gerekir. Biz makalenin ana bulgusunu
  kendi verimizde yeniden ürettik." Dürüstlük + literatür = kredibilite.
- Her şeyi yapan dashboard sunma. Case Bölüm 4 madde 5 önceliklendirme soruyor;
  "hepsini yaptık" cevabı orada puan kaybettirir. Pareto ile gir: PN'lerin %3'ü (156 yüksek riskli) riskin çoğunu taşıyor.
- Veri sentetik — bunu açıkça söyle, gizlemeye çalışma.
