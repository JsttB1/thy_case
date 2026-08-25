# Catalyst — Proje Özeti (sunum hazırlığı için)

> **Bu dosya nedir:** projenin tamamının sunuma dönüştürülebilir özeti. Her sayı
> `catalyst.html` içindeki canlı veri paketinden çekilmiştir ve `core.py` ile yeniden
> üretilebilir. Slayt yazarken buradaki rakamları doğrudan kullanabilirsiniz.
>
> **Grup 9/10** · Global Talent Bridge (Turkish Technic) MRO hackathon'u
> **Tüm veriler sentetiktir** — case ile verilen dummy setler; gerçek THY/AMOS verisi değildir.

---

## 1. Bir bakışta

**Case sorusu:** Komponent bakım kapasitesi 2025→2033 arasında **1.200 → 2.000 uçağa** (+%67)
çıkarken envanter yönetimi buna hazır mı?

**Cevabımız üç cümlede:**

1. **Sorun büyüme değil, yer değiştirme.** Talep +%63–68 artıyor ama asıl kırılma dağılımda:
   yeni nesil modellerin payı **%34 → %65**'e çıkarken küçülen 4 klasik model **%43 → %16**'ya iniyor.
   Bugünün stok karması 2033'ün talebini karşılamıyor.
2. **Sorun para değil, görünürlük.** Bugün kırmızıdaki 134 parçayı kapatmanın maliyeti sadece
   **$0,73M** — yani $132,9M'lık envanterin binde beşi. Buna rağmen **72 parçanın siparişi bile
   açılmamış**. Para yetiyor; kimse stoğun bittiğini görmüyor.
3. **Çözüm bir karar katmanı.** Catalyst 5.000 parçayı tek kural dizisinden geçirip her birini
   tek bir aksiyona düşürüyor, gerekçesiyle. Ekranda "şu kadar stok tut" değil, **"bu parça için
   bugün ne yapılmalı, ne kadara, kaç günde"** yazıyor.

**Tek cümlelik konumlandırma:**
> Catalyst, komponent envanteri için bir raporlama ekranı değil; her parça için kanal, süre ve
> maliyet içeren bir karar üreten ve bu kararı gerekçesiyle açıklayan bir karar destek katmanıdır.

---

## 2. Problemin tanımı (jüri rubriği #1)

### 2.1 Filo değişimi
| | 2025 | 2033 | Değişim |
|---|---|---|---|
| Toplam uçak | 1.200 | 2.000 | **+%67** |
| THY | 500 | 800 | +%60 |
| Pool | 700 | 1.200 | +%71 |
| Yıllık komponent talebi | 90.016 | **146.881 – 150.775** | **+%63,2 – +%67,5** |

Talep **nokta tahmin değil aralık** olarak verilir; iki bağımsız yöntem (model bazlı filo ölçeği
ve PN segment karışımı) bu bandın uçlarını üretir.

### 2.2 Asıl bulgu: talep yer değiştiriyor
| Model grubu | 2025 payı | 2033 payı |
|---|---|---|
| Yeni nesil (A320neo, A321neo, 737 MAX 8, A350-900, 787-9) | %33,7 | **%64,8** |
| Küçülen 4 klasik (737-800, A320-200, A321-200, A319-100) | %42,8 | **%15,8** |
| Diğer | %23,4 | %19,3 |

En uç örnek **737 MAX 8**: yıllık talep 6.557 → 24.979 (**×3,8**).
Aynı anda 737-800 talebi geriliyor. İki hareket birbirini götürmüyor: biri için stok kurmanız,
diğeri için stok eritmeniz gerekiyor — **aynı anda**.

Kategori düzeyinde de tek bir katsayı yok: büyüme **+%40,5 ile +%91** arasında değişiyor.
Tek çarpanla plan yapmak yapısal olarak yanlış.

### 2.3 Coğrafi kayma
Basılı case istasyon tablosuna göre yük merkezi de değişiyor:
İstanbul **540 → 820** (+%52), İzmir **110 → 200** (+%82), uluslararası hub'lar **190 → 380** (+%100).
Yani envanter yalnız büyümüyor, **dağılıyor** — merkezî tek depo mantığı zayıflıyor.

---

## 3. Mevcut durum analizi (jüri rubriği #2)

### 3.1 Bugünün fotoğrafı
| Metrik | Değer |
|---|---|
| Takip edilen parça | **5.000 PN** |
| Envanter piyasa değeri (FMV) | **$132,9M** |
| Sıfırdan alım değeri (CLP) | $304,2M |
| İkinci el / liste oranı (medyan) | 0,434 |
| Kullanılabilir stok | 27.275 adet |
| Gayrifaal (arızalı, karar bekliyor) | 4.803 adet |
| Tamir döngüsünde | 7.800 adet |
| Açık satınalma (yolda) | 3.130 adet · $22,3M |

### 3.2 Kör nokta — projenin en kritik bulgusu
| | |
|---|---|
| Kırmızı liste (stok, yenisi gelmeden bitiyor) | **134 PN** — 22'si AOG kritik |
| Bunların **siparişi açılmamış** olanı | **72 PN** — 11'i AOG kritik |
| Bu 134 parçayı kapatmanın maliyeti | **$0,73M** |

**Anlatı çapası:** 72 parça, uçağı yerde bırakabilecek durumda ve hiçbir sipariş yok.
Kapatma maliyeti envanterin **binde 5'i**. Bu bir bütçe problemi değil, bir **uyarı sistemi**
problemidir. Süreç kendi alarmını göremiyor.

### 3.3 Diğer yapısal boşluklar
- **Kabiliyet açığı:** parçaların yalnız **%35,1**'inde iç atölye kabiliyeti var; AOG kritiklerde bu **%27,1**'e düşüyor.
  → **547 parça** hem AOG kritik hem iç tamirsiz (AOG'ların **%72,9**'u). Bunların **181'i** aynı zamanda geçmişi olmayan yeni nesil ("üçlü tehlike").
- **Tedarik süresi asimetrisi:** iç tamir ortalama **9 gün**, dış tamir **43 gün**, yeni satınalma **39 gün**.
  Kabiliyetin olmaması süreyi ~5 katına çıkarıyor.
- **Talep kesikli:** medyan yıllık talep **11 adet**; **1.730 parça** kesikli talepli; parça-çeyreklerin **%14,6**'sı tamamen sıfır.
  Klasik ortalama-tabanlı tahmin bu profilde çalışmaz.
- **Mevsimsellik:** Q3 talebi diğer çeyreklerin ortalamasının **%19,9** üstünde — ve bu etki kritiklik sınıflarında homojen.
- **Pool bağımlılığı:** talebin **%27,8**'i pool filosundan; **150 parça** doğrudan havuza bağımlı.
- **Veri anomalisi:** **159 parçada** hurdaya ayırma oranı %20'nin üstünde — kalite sorunu, yanlış tamir kararı ya da kayıt hatası sinyali.

### 3.4 Boşlukları nasıl tespit ettik
Üç resmi CSV (5.000 PN × 4 çeyrek talep, PN bazlı envanter/fiyat, 14 model filo projeksiyonu)
tek bir çekirdeğe (`core.py`) indirildi; **102 metrik** script'le mutabakatlandı. Tespitler
raporlardan değil, ham veriden türetildi ve her biri yeniden üretilebilir.

---

## 4. Çözüm (jüri rubriği #3)

### 4.1 Konsept
Case'in A (dashboard), B (sistem mimarisi), C (akıllı uyarı) başlıkları birer **örnek**tir,
seçim menüsü değil. Catalyst üçünü tek çatıda birleştirir:

| Katman | Ne yapar | İlk gün değeri |
|---|---|---|
| **1 · Görünürlük** | Tek komponent kaydı; gerçek tedarik süreleri olaylardan ölçülür | Stoğu biten 72 parçanın yakalanması |
| **2 · Öngörü** | Segmentli tahmin, kesikli talep yöntemleri, aralık projeksiyonu, geçmişi olmayan parça tahmini | Öneri modunda çalışır; doğruluk eşiğiyle ilerler |
| **3 · Aksiyon** | Riskli parçada zorunlu aksiyon; süre+maliyete göre sıralı seçenekler; tamir/satınalma kararı; havuz koordinasyonu | Kriz planı önceden hazır |

Mimari **salt okunur**: kaynak sistemlere (TRAX, ÜPK, depo kayıtları) yazmaz, okur ve karar üretir.
Bu, entegrasyon riskini en aza indirir ve fazlı geçişi mümkün kılar.

### 4.2 Ürünün çekirdek fikri: tek karar yolu
5.000 parçanın her biri aynı kural dizisinden geçer ve **tek bir kanala** düşer:

| Kanal | Parça | Kapatma maliyeti | Anlamı |
|---|---|---|---|
| **Havuz / exchange** | 694 | $2,3M | Değişim ağı bugün de işliyor; açık 3 günde kapanır |
| **Tamir döngüsü** | 641 | $3,7M | İç atölye ya da hızlandırılmış dış tamir |
| **Yeni satın alma** | 217 | $1,8M | Tamir kanalı yok ya da ekonomik değil |
| **İzle** | 3.448 | — | Stok MIN üzerinde, bugün aksiyon gerekmez |
| **Toplam aksiyon** | **1.552** | **$7,8M** | Filonun %31'i |

Ayrıca **569 parçada** MAX üstü fazla stok var: **1.686 adet · $4,5M** — satın alma yerine
istasyonlar arası transferle değerlendirilebilir.

**Kritik tasarım kararı:** Karar Merkezi'ndeki kanal ile Watchlist'teki "önerilen aksiyon"
**aynı fonksiyondan** gelir (`kanalSec`). İki ekran yapısal olarak çelişemez; testte 5.000 parçanın
tamamı için bu eşitlik doğrulanır.

### 4.3 "Ne zaman" sorusu: sipariş penceresi
Her parça, sipariş için kalan güne göre bir pencereye düşer
(**kalan gün = dayanma süresi − tedarik süresi**):

| Pencere | Parça | Aksiyon |
|---|---|---|
| **Bugün** (pencere geçmiş) | 60 — **42'sinde sipariş yok** | Köprü kanalı + acil sipariş |
| 0–30 gün | 217 | Sipariş ya da tamir emri bu ay açılmalı |
| 30–90 gün | 2.028 | Tedarik planına al, bütçe ayır |
| 90+ gün | 2.695 | Min-max izle, atölye yatırımını planla |

Kanal "nasıl", pencere "ne zaman" sorusunun cevabıdır.

---

## 5. Prototip (jüri rubriği #4)

`catalyst.html` — **tek dosya, internetsiz çalışır**, çift tıkla açılır. Tüm veri, grafik
kütüphanesi ve dünya haritası içine gömülüdür. USB ile taşınabilir.

| Sekme | İçerik | Tek cümlelik mesaj |
|---|---|---|
| **Karar Merkezi** | Kanal dağılımı, sipariş penceresi alarmı, planlama ufku, fazla stok dengeleme | "5.000 parça tek kural dizisinden geçti, her biri tek aksiyona düştü" |
| **Watchlist** | 5.000 PN risk sıralı; parça detayında künye, 2033 ihtiyaç bandı, **önerilen aksiyon kartı**, TTS/TTR, aksiyon merdiveni, stok yeterlilik eğrisi, çeyreklik tahmin | "Bu parça için ne yapılır — süre ve maliyetle sıralı" |
| **Öngörü & AI** | Model bazında talep 2025→2033, talep göçü, kategori ayrışması, ABC×XYZ matrisi, hurda anomali dedektörü, geriye dönük test, tahmin gezgini | "Tek katsayıyla plan yapılamaz; segment segment ayrışıyor" |
| **Harita** | 25 istasyonluk ağ, depo katmanı, parça rota yelpazesi (7 tedarik kanalı), kriz katmanı | "Parça nereden, kaç günde, kaça gelir — haritada" |
| **Senaryo** | Kriz kütüphanesi + canlı yeniden hesap, model parametre paneli, **belirsizlik denemeleri**, duyarlılık, bütçe önceliklendirme, kabiliyet ROI | "Plan kaç farklı gelecekte tutuyor?" |

### 5.1 Ekranlar arası köprüler (demo için değerli)
- Karar Merkezi kanal satırı → Watchlist o kanala süzülü açılır
- Alarm satırı → doğrudan parça detayı
- Parça detayındaki her tedarik seçeneği → haritada rota çizilir (hedef istasyon seçilmeden çizim yapılmaz)
- Fazla stok kartı → haritada kaynak→hedef transfer rotası
- Grafiklerdeki PN etiketleri → parça detayına gider

---

## 6. Yöntem — savunulabilir matematik

| Konu | Yaklaşım |
|---|---|
| **Talep tahmini** | Kesikli talep için Syntetos-Boylan (SBA); düzenli talep için klasik. Segment bazlı yöntem ataması ABC×XYZ matrisinden. |
| **2033 projeksiyonu** | İki bağımsız yöntem → **aralık**. Nokta tahmin kullanılmaz. |
| **Emniyet stoğu** | Poisson: `MIN = ⌈λL⌉ + z√(λL)`; servis hedefi kritikliğe göre (%98 / %95 / %90). |
| **Kırmızı tanımı** | `TTS < TTR` — dayanma süresi, yenisini getirme süresinden kısaysa parça kırmızı. |
| **Risk skoru** | `kritiklik ağırlığı × yıllık talep × etkin TAT / 365` — **maruziyet** ölçer, stok seviyesini değil. |
| **Tamir/hurda kararı** | BER eşiği: tamir maliyeti liste fiyatının %65'ini aşarsa hurda adayı (**338 PN**). |
| **Belirsizlik** | Açık parça sayısı = bağımsız Bernoulli toplamı (Poisson-binom) → ortalama, varyans ve yüzdelikler kapalı formülle, tarayıcıda ~2 ms. |
| **Kuyruk riski** | En kötü %10'un ortalaması (`ortalama + 1,755·σ`) — bütçe tamponu bu sayıya kurulur. |

### 6.1 Belirsizlik: planın ne kadarına güvenilir?
| | Beklenen | %80 aralık | Kötü giden %10'un ortalaması |
|---|---|---|---|
| **Baz durum** | 389 parça açıkta · **$9,8M** | 371 – 408 parça | **$11,2M** |
| **Motor ailesi krizi** | 797 parça · $39,3M | 776 – 817 | $41,9M |

**Belirsizliğin fiyatı: $1,4M** — ortalama ile kötü senaryo arasındaki fark. Planlama ortalamaya,
tampon kuyruğa göre kurulur.

**Belirsizlik nereden geliyor?** Varyansın **%87'si** parça kırılmalarının rastgeleliğinden,
yalnız **%13'ü** filo büyüme bandından.
> Jüri "tahmininiz yanılırsa ne olur?" derse cevap budur: 2033 filosunun ne kadar büyüyeceğini
> bilmemek sonucun sekizde birini oynatıyor. Geri kalanı hangi parçanın ne zaman kırılacağı —
> ve onu tahminle değil **emniyet stoğuyla** yönetiyoruz.

### 6.2 Hangi kaldıraç en güçlü? (duyarlılık)
2033 açığını kapatma maliyeti, baz **$33,9M**:

| Etken | Aralık | Yorum |
|---|---|---|
| **Tedarik süreleri ±%20** | **$23,2M – $44,8M** | **En büyük kaldıraç** — TAT yönetimi satın almadan güçlü |
| Kabiliyet yatırımı (547 → iç tamir) | $24,6M – $33,9M | Yapabildiğimiz en büyük müdahale |
| Servis hedefi −2 / +1 puan | $29,7M – $37,4M | Politika kararı |
| Talep bandı (alt ↔ üst uç) | $33,0M – $34,5M | **En dar** — tahmin belirsizliği sonucu az oynatıyor |

**Mesaj:** envanter probleminin bir kısmı satın alma değil, **süreç** problemidir.
Talep tahminini mükemmelleştirmek en az kazandıran yol; tedarik süresini kısaltmak en çok kazandıran.

---

## 7. Doğrulama — neden güvenelim?

Üç bağımsız kontrol aynı yönde:

| Kontrol | Sonuç |
|---|---|
| **Float formülü sahayla** | Yalnız talep ve TAT'tan tahmin **8.012** adet ↔ gerçek tamirdeki **7.800** adet → **%97 isabet** |
| **Risk sıralaması sahayla** | Skorun 1 numarası **PN-101741**, gerçek stok verisinde fiilen kırmızı çıktı |
| **Geriye dönük test** | İlk yarıyla yaz çeyreği tahmin edildi: mevsim katsayısı toplam hatayı **%16,3 → %0,4**'e indirdi |
| **Formül ↔ deneme** | Kapalı formül 389,3 parça / $9,8M ↔ 800 rastgele deneme 389 parça / $9,8M → **%99,5 uyum** |

**Dürüst not (jüri güveni için değerlidir):** mevsim katsayısı **bütçe düzeyinde** çalışıyor
(toplam hata binde 4'e iniyor) ama **parça düzeyinde** MAE'yi iyileştirmiyor (~2,1 adet, üç yöntemde de benzer).
Sebep talebin kesikliliği. Bunu gizlemek yerine söylüyoruz: bütçe planlaması ile parça planlaması
farklı doğruluk rejimleridir.

---

## 8. Önceliklendirme (jüri rubriği #5)

Kısıtlı bütçeyle ne önce alınır? Her adet için "harcanan dolar başına ne kadar risk azalıyor"
hesaplanır ve **5.797 alım adımı** bu ölçüye göre sıralanır. Tamamı **$39,1M**, ama:

| Bütçe | Beklenen açık parça | AOG kritik açık |
|---|---|---|
| $0 | 389 | 85 |
| **$1M** | **310** | **58** |
| $5M | 185 | 28 |
| $12M | 108 | 13 |
| $39,1M (tamamı) | 46 | 3 |

> **İlk 1 milyon dolar, bütçenin %3'ü, riskin %32'sini alıyor.**

### 8.1 Faz planı
| Faz | İçerik | Geçiş ölçütü |
|---|---|---|
| **1 — Görünürlük** | Tek kayıt, gerçek TAT ölçümü, 72 siparişsiz parçanın yakalanması | Veri kalitesi eşiği |
| **2 — Öngörü** | Segmentli tahmin, aralık projeksiyonu, cold-start | Tahmin doğruluğu + kabul oranı eşiği |
| **3 — Aksiyon** | Zorunlu aksiyon, kanal motoru, havuz koordinasyonu, kriz planı | Aksiyon kapanma oranı |

### 8.2 En yüksek getirili tek yatırım
**547 parçalık iç atölye kabiliyeti.** Bugün bu parçalar için dış tamire yılda **$33,6M** gidiyor.
İç tamir yılda **$12,1M tasarruf + $4,0M serbest sermaye** getiriyor — ve tedarik süresini
43 günden 9 güne indirdiği için duyarlılık analizindeki **en güçlü kaldıraca** doğrudan dokunuyor.

---

## 9. Başarı kriterleri (jüri rubriği #6)

| Metrik | Bugün | Hedef |
|---|---|---|
| **Siparişsiz kırmızı parça** | 72 | **0** |
| Parça kaynaklı AOG saati | — | ↓ |
| Kritik parçalarda fill rate | — | ≥ %97–98 |
| Stok-out'ların tedarik süresi **öncesinde** yakalanma oranı | — | ↑ |
| Hızlandırma (expedite) maliyeti | — | ↓ |
| Tahmin hatası (MAPE) | — | ↓ |
| Bağlı sermaye / devir hızı | $132,9M | guard-rail (artmamalı) |
| Hurda oranı | %11,1 | izlenir |

**Birincil kriter siparişsiz kırmızı = 0.** Ölçmesi kolay, manipüle etmesi zor, doğrudan
ilk gün değerini yansıtır.

---

## 10. Riskler ve karşılıkları

| Risk | Karşılık |
|---|---|
| **Veri kalitesi** — dağınık sistemler, eksik kayıt | Salt okunur mimari; faz geçişi veri kalitesi ölçütüne bağlı; veri boşlukları açıkça listeleniyor |
| **Model hatası** | Nokta tahmin yerine aralık; belirsizliğin %87'sinin tahminden değil rastgelelikten geldiği ölçüldü; emniyet stoğu tahmin doğruluğuna bağımlı değil |
| **Benimseme** | Her karar gerekçesiyle geliyor; parametreler kullanıcının elinde (ağırlıklar, BER eşiği, servis hedefi canlı değiştirilebilir) |
| **Entegrasyon** | Kaynak sistemlere yazılmaz; tek dosyalık prototip bugün çalışıyor |
| **Sentetik veri** | Tüm ekranlarda etiketli; formüller gerçek veriyle değişmez, sayılar değişir |

---

## 11. Sayı ezber kartı (cepte dursun)

```
FİLO       1.200 → 2.000 uçak (+%67) · THY 500→800 · Pool 700→1.200
TALEP      90.016 → 146.881–150.775  (+%63,2 – +%67,5)
GÖÇ        yeni nesil %34→%65 · küçülen 4 klasik %43→%16 · 737 MAX 8 ×3,8
ENVANTER   $132,9M FMV · $304,2M CLP · FMV/CLP 0,434
KIRMIZI    134 PN (22 AOG) · siparişsiz 72 (11 AOG) · kapatma $0,73M
KANALLAR   havuz 694 · tamir 641 · satın alma 217 · izle 3.448 · kapatma $7,8M
PENCERE    geçmiş 60 (42 siparişsiz) · 0–30: 217 · 30–90: 2.028 · 90+: 2.695
FAZLA STOK 569 PN · 1.686 adet · $4,5M
ÜÇ MUSLUK  hurda $67,8M/yıl → $113,6M · float $23,3M → $39,0M · phase-out $52,0M
KABİLİYET  547 PN (AOG'ların %72,9'u) · dış tamir $33,6M/yıl → tasarruf $12,1M + $4,0M
BELİRSİZLİK baz 389 PN [371–408] $9,8M · kuyruk $11,2M · motor krizi 797 PN $39,3M
           kaynak: %87 rastgelelik / %13 filo bandı
KALDIRAÇ   tedarik süreleri $23,2M–$44,8M (en güçlü) · talep bandı $33,0M–$34,5M (en zayıf)
BÜTÇE      ilk $1M → açık 389→310, AOG 85→58 (bütçenin %3'ü, riskin %32'si)
DOĞRULAMA  float %97 (8.012↔7.800) · risk #1 sahada kırmızı · geri test %0,4 · formül↔deneme %99,5
KRİZ       motor ailesi krizi: kırmızı 134 → 477
```

---

## 12. Önerilen slayt akışı (7 slayt limiti)

| # | Slayt | Görsel çapa | Anahtar sayı |
|---|---|---|---|
| 1 | **Kapak** | — | 1.200→2.000 · +%63–68 · 5.000 PN |
| 2 | **Problem: büyüme değil yer değiştirme** | Talep göçü yığılı grafiği | %34→%65 · 72 siparişsiz · $0,73M |
| 3 | **Çözüm: üç katman, tek karar yolu** | Akış şeması + faz bandı | havuz/tamir/alım/izle dağılımı |
| 4 | **Prototip** | 6 ekran görüntüsü | tek dosya, internetsiz |
| 5 | **Öngörü motoru + belirsizlik** | Kümülatif olasılık eğrisi | 389 [371–408] · kuyruk $11,2M · %87/%13 |
| 6 | **Önceliklendirme · kriz · başarı** | Bütçe eğrisi + tornado | ilk $1M → %32 risk · 134→477 · 72→0 |
| 7 | **Kapanış + riskler** | Risk tablosu | $12,1M/yıl kabiliyet getirisi |

**Demo, slayt 4'ten sonra ortada yapılmalı** — jüri en dikkatli o anda.

### Canlı demo akışı (~6 dk)
1. **Karar Merkezi** — 4 KPI + kanal dağılımı: *"5.000 parça tek kural dizisinden geçti"*
2. **Sipariş penceresi alarmı** → ilk satıra tıkla: *"bu 42 parçada sipariş çoktan açılmalıydı"*
3. **Parça detayı** — önerilen aksiyon kartı: *"yetmeme riski %100'den %1'e; öneri merdivenin vurgulu satırıyla aynı"*
4. **Harita** — hedef istasyon seç → rota çiz: *"parça nereden, kaç günde, kaça gelir"*
5. **Senaryo** — motor ailesi krizi: *"tek tıkta 134→477; belirsizlik denemeleri 797 parça / $39,3M diyor"*
6. **Model parametreleri** — AOG ağırlığını 3→5 çek: *"sayılar gömülü değil, hesaplanıyor"*

---

## 13. Teknik künye

```
core.py              tek doğruluk kaynağı — tüm formüller ve parametreler
  ↓
build_dashboard.py   JSON veri paketi + tek dosyalık HTML üretimi
  ↓
catalyst.html        5 sekmeli prototip (internetsiz, ~1,1 MB, Chart.js + dünya haritası gömülü)

smoke_test.js        40+ başsız kontrol — tüm ekranlar, senaryo motoru, karar tutarlılığı
sunum/               resmi şablon (sablon.pptx) + deste/el notu üreticileri
```

- **Girdi:** 3 resmi CSV (5.000 PN × 4 çeyrek talep · PN bazlı envanter/fiyat · 14 model filo projeksiyonu)
- **Tasarım:** açık teknik gri tema — bakım/operasyon yazılımı görünümü; renk yalnız durum taşır, marka kırmızısı hiçbir grafik serisinde kullanılmaz
- **Erişim:** harita dokunmatik ve touchpad jestleriyle kullanılır (kıstırma, iki parmak kaydırma, çift dokunuş)
- **Tekrarlanabilirlik:** her sayı `uv run build_dashboard.py` ile yeniden üretilir; derin analiz katmanı sabit tohumlu

---

## 14. Sunumda kaçınılması gerekenler

- ❌ "Kontrol kulesi" adı ve kule metaforu — kullanılmıyor
- ❌ "Monte Carlo" terimi — yerine **"belirsizlik denemeleri"**
- ❌ Case'in A/B/C başlıklarına "Seçenek D" eklemek — üçü tek çatıda birleştiriliyor, dördüncü şık icat edilmiyor
- ❌ Nokta tahmin sunmak — projeksiyon her zaman aralık
- ❌ Geri çekilmiş iddialar: "%72 komponent pozisyonu", "5,70M→9,80M" rakamları hiçbir çıktıda yer almamalı
- ⚠️ Kabiliyet tasarrufu **$12,1M/yıl** (eski dokümandaki $12,2M yuvarlama hatasıydı)
