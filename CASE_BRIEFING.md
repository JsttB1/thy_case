# Stajyer Case: PN Bazlı THY / Pool Talep-Scrap ve Filo Dağılımı Analizi

## 1. Amaç

Bu case, **dummy (sentetik/kurgusal) veri** üzerinde çalışarak parça numarası (PN)
bazlı talep/scrap davranışını ve THY/Pool filosunun büyüme projeksiyonunu analiz
etme egzersizidir. Veriler gerçek THY/AMOS verisi **değildir**, sadece analiz
pratiği için üretilmiştir.

Stajyerden beklenen: verilen CSV dosyalarını Excel / SQL / Python (pandas) gibi
bir araçla analiz ederek aşağıdaki soruları yanıtlaması ve kısa bir bulgu özeti
hazırlamasıdır.

## 2. Veri Setleri

Bu case'de 2 ayrı CSV dosyası bulunur:

### 2.1 `dummy_pn_quarterly_data.csv` — PN bazlı çeyreklik talep/scrap

**Üretici script:** [generate_dummy_data.py](generate_dummy_data.py) (isteğe bağlı, veri nasıl üretildiğini görmek için)

- **Satır sayısı:** 20.000 (5.000 PN × 2025'in 4 çeyreği)
- **Format:** Uzun format (long format) — her satır 1 PN'in 1 çeyrekteki verisini temsil eder

| Kolon | Açıklama |
|---|---|
| `PN` | Parça numarası (5.000 benzersiz değer, `PN-100000` … `PN-104999`) |
| `ATA_CHAPTER` | ATA chapter kodu (21, 22, 23 … 80 arası, uçak sistemi kategorisi) |
| `SUB_CATEGORY` | Chapter'a karşılık gelen alt kategori adı (ör. `LANDING GEAR`, `ENGINE`) |
| `AIRCRAFT_FAMILY` | `AIRBUS` veya `BOEING` |
| `AIRCRAFT_MODEL` | Uçak modeli — Airbus modelleri (A319-100, A320-200, A320neo, A321-200, A321neo, A330-200, A330-300, A350-900) ve Boeing alt modelleri (737-800, 737-900ER, 737 MAX 8, 777-300ER, 777-F, 787-9) |
| `ATOLYE_KABILIYETI` | İç atölyede tamir kabiliyeti olup olmadığı: `VAR` / `YOK` |
| `YURTICI_TAT_GUN` | Yurtiçi (iç atölye) tamir TAT süresi (gün). Sadece `ATOLYE_KABILIYETI = VAR` olan PN'lerde doludur; `YOK` ise boş (yurtiçi tamir seçeneği yok) |
| `YURTDISI_TAT_GUN` | Yurtdışı (OEM / yurtdışı repair station) tamir TAT süresi (gün). Atölye kabiliyetinden bağımsız, her PN için doludur (kabiliyeti olmayan PN'ler için tek seçenek, olanlar için yedek/alternatif seçenektir) |
| `SATINALMA_TAT_GUN` | Yeni parça satın alma (tedarik) TAT süresi (gün) |
| `KRITIKLIK_DURUMU` | Komponent kritiklik durumu: `AOG KRİTİK` / `KRİTİK` / `KRİTİK DEĞİL` |
| `YIL` | Yıl (sabit: 2025) |
| `CEYREK` | Çeyrek (`Q1`, `Q2`, `Q3`, `Q4`) |
| `DONEM` | Yıl + çeyrek birleşik gösterim (ör. `2025-Q1`) |
| `THY_TALEP_ADET` | O çeyrekte THY tarafından talep edilen adet |
| `POOL_TALEP_ADET` | O çeyrekte Pool (havuz) üzerinden talep edilen adet |
| `SCRAP_ADET` | O çeyrekte hurdaya (scrap) ayrılan adet |

> Not 1: `PN` → `ATA_CHAPTER` / `SUB_CATEGORY` / `AIRCRAFT_FAMILY` / `AIRCRAFT_MODEL` /
> `ATOLYE_KABILIYETI` / `YURTICI_TAT_GUN` / `YURTDISI_TAT_GUN` / `SATINALMA_TAT_GUN` /
> `KRITIKLIK_DURUMU` eşleşmesi çeyrekler arasında **sabittir** (bir PN çeyrekten
> çeyreğe uçak/chapter/atölye/kritiklik bilgisini değiştirmez).
> Not 2: Veride yaz sezonu (Q3: Temmuz–Eylül) için daha yüksek uçuş saati/kullanım
> varsayımıyla hafif bir mevsimsellik eklenmiştir (Q3 talebi diğer çeyreklerden
> görece yüksektir).
> Not 3: Atölye kabiliyeti olasılığı, satınalma/yurtdışı TAT süreleri ve
> kritiklik durumu, chapter bazlı bir "karmaşıklık/kritiklik ağırlığı" ile
> ilişkilendirilmiştir — örn. motor (72, 73) ve APU (49) gibi özel
> sertifikasyon gerektiren chapter'larda iç atölye kabiliyeti olasılığı düşük
> ve kritiklik daha yüksek eğilimlidir; genel sistem chapter'larında (21, 24,
> 25, 56 vb.) ise tam tersi geçerlidir.

### 2.2 `fleet_distribution.csv` — THY / Pool filo dağılımı (2025 → 2033)

- **Satır sayısı:** 14 (her uçak modeli için 1 satır)
- **Format:** Geniş format (wide format) — 2025 mevcut durum ve 2033 projeksiyonu yan yana

| Kolon | Açıklama |
|---|---|
| `AIRCRAFT_FAMILY` | `AIRBUS` veya `BOEING` |
| `AIRCRAFT_MODEL` | Uçak modeli (14 model, yukarıdaki liste ile aynı) |
| `THY_2025_ADET` | 2025'te THY'ye ait bu modeldeki uçak adedi |
| `POOL_2025_ADET` | 2025'te Pool'a ait bu modeldeki uçak adedi |
| `THY_2033_ADET` | 2033 projeksiyonunda THY'ye ait bu modeldeki uçak adedi |
| `POOL_2033_ADET` | 2033 projeksiyonunda Pool'a ait bu modeldeki uçak adedi |
| `TOPLAM_2025_ADET` | `THY_2025_ADET + POOL_2025_ADET` |
| `TOPLAM_2033_ADET` | `THY_2033_ADET + POOL_2033_ADET` |

**Toplam filo büyüklükleri (kontrol toplamları):**

| | 2025 | 2033 |
|---|---:|---:|
| THY | 500 | 800 |
| Pool | 700 | 1.200 |
| **Toplam** | **1.200** | **2.000** |

> Not: Dağılım, filo yenilenmesi senaryosunu yansıtacak şekilde kurgulanmıştır —
> yeni nesil dar gövde modellerin (`A320neo`, `A321neo`, `737 MAX 8`) ve yeni
> nesil geniş gövde modellerin (`A350-900`, `787-9`) payı 2033'e doğru artarken,
> klasik nesil modellerin (`A319-100`, `A320-200`, `A321-200`, `737-800`,
> `737-900ER`) payı azalmaktadır. `dummy_pn_quarterly_data.csv` içindeki
> `AIRCRAFT_MODEL` dağılımı da 2025 filo yüzdeleriyle tutarlı üretilmiştir.

## 3. Örnek Egzersizler

### `dummy_pn_quarterly_data.csv` üzerinden

1. **Genel özet:** Çeyreklere göre toplam `THY_TALEP_ADET`, `POOL_TALEP_ADET` ve
   `SCRAP_ADET` nasıl değişiyor? (Q1 → Q4 trend grafiği, yaz sezonu etkisi
   gözlemlenebiliyor mu?)
2. **Chapter kırılımı:** Hangi `ATA_CHAPTER` / `SUB_CATEGORY` en yüksek toplam
   talebe sahip? Scrap oranı (`SCRAP_ADET / (THY_TALEP_ADET + POOL_TALEP_ADET)`)
   en yüksek olan sub-category hangisi?
3. **Uçak filosu kırılımı:** Airbus vs Boeing filosunda talep dağılımı nasıl?
   Hangi uçak modeli en çok parça talebi üretiyor?
4. **Top-N analiz:** En çok THY talebi olan ilk 20 PN hangileri? Bunların
   ATA chapter dağılımı nedir?
5. **Pool bağımlılığı:** `POOL_TALEP_ADET / THY_TALEP_ADET` oranı en yüksek
   olan (yani pool'a en bağımlı) ilk 10 PN hangileri?
6. **Çeyreklik büyüme (QoQ):** Q1'den Q4'e en çok büyüyen ve en çok azalan
   PN'ler / chapter'lar hangileri?
7. **Pivot tablo:** `AIRCRAFT_MODEL` (satır) × `DONEM` (kolon) kırılımında
   toplam `THY_TALEP_ADET` pivot tablosu oluşturulması.
8. **(İleri seviye)** Scrap adedi ile toplam talep arasında korelasyon var mı?
   Yüksek talep gören parçalar aynı zamanda yüksek scrap oranına mı sahip?
9. **Atölye kabiliyeti:** PN'lerin kaçında (`ATOLYE_KABILIYETI = VAR`) iç
   atölye tamir kabiliyeti var? Bu oran `ATA_CHAPTER` bazında nasıl değişiyor?
10. **TAT karşılaştırması:** Atölye kabiliyeti olan PN'lerde ortalama
    `YURTICI_TAT_GUN`, kabiliyeti olmayanlarda ortalama `YURTDISI_TAT_GUN` ile
    karşılaştırıldığında ne kadar fark var? `SATINALMA_TAT_GUN` bu iki
    seçenekten (tamir) genelde daha mı uzun/kısa?
11. **Kritiklik dağılımı:** `KRITIKLIK_DURUMU` kategorilerine (`AOG KRİTİK` /
    `KRİTİK` / `KRİTİK DEĞİL`) göre PN sayısı ve toplam talep nasıl dağılıyor?
    `AOG KRİTİK` PN'lerin atölye kabiliyeti oranı diğer kategorilerden farklı mı?
12. **(İleri seviye)** `AOG KRİTİK` + atölye kabiliyeti `YOK` olan (yani hem
    kritik hem de yurtdışına bağımlı) PN listesi çıkarılıp `YURTDISI_TAT_GUN`
    süresine göre önceliklendirilebilir mi? (risk azaltma için iç atölye
    yatırımı önerilecek aday PN listesi)

### `fleet_distribution.csv` üzerinden

13. **Filo büyüklüğü karşılaştırması:** 2025 → 2033 arasında THY ve Pool
    filosunun toplam büyüklüğü yüzde kaç büyüyor?
14. **Model bazlı büyüme/küçülme:** Hangi uçak modelleri 2033'e doğru en çok
    büyüyor, hangileri küçülüyor? (`TOPLAM_2033_ADET - TOPLAM_2025_ADET`)
15. **THY vs Pool payı:** 2025'te ve 2033'te THY'nin toplam filo içindeki payı
    (`THY_ADET / TOPLAM_ADET`) nasıl değişiyor?
16. **(İleri seviye - iki veri setini birleştirme)** `fleet_distribution.csv`
    içindeki 2025 uçak adetleri ile `dummy_pn_quarterly_data.csv` içindeki
    `AIRCRAFT_MODEL` bazlı toplam talebi birleştirerek "uçak başına düşen
    ortalama parça talebi" (`toplam talep / uçak adedi`) modele göre
    hesaplanabilir mi?

## 4. Beklenen Çıktı

- Kullanılan araç (Excel/SQL/Python) fark etmeksizin, bulguların **kısa bir
  özet + 2-3 grafik/tablo** ile sunulması.
- Varsa ilginç/anormal veri noktalarının (ör. anormal derecede yüksek talep
  gören bir PN, ya da 2033'te en çok büyüyen uçak modeli) not edilmesi.

## 5. Sınırlamalar / Uyarılar

- Bu veriler **tamamen sentetiktir**, gerçek THY/Pool/AMOS verisiyle bir ilgisi
  yoktur; sadece analiz pratiği amaçlıdır.
- `dummy_pn_quarterly_data.csv`, Poisson dağılımı + PN bazlı rastgele "hacim" ve
  "pool oranı" katsayıları + Q3 yaz sezonu mevsimselliği ile üretilmiştir (bkz.
  `generate_dummy_data.py`).
- `fleet_distribution.csv`, sabit yüzde ağırlıklarla (2025 ve 2033 için ayrı
  ayrı tanımlanmış model payları) THY/Pool toplam adetlerine dağıtılarak
  üretilmiştir; 2033 projeksiyonu kurgusal bir "filo yenilenmesi" senaryosunu
  yansıtır, gerçek bir filo planıyla karşılaştırılmamalıdır.
