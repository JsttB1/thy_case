# CLAUDE.md — Catalyst Proje Bağlamı (Claude Code için)

> **Bu dosya nedir:** Global Talent Bridge MRO hackathon projesi "Catalyst"in
> tüm bağlamı. Claude.ai'da yürütülen analiz oturumlarının eksiksiz aktarımıdır: case, veri
> şemaları, doğrulanmış tüm sayılar, formüller, mimari kararlar, vizyon çerçevesi, sunum planı
> ve geri çekilen iddialar. Kullanıcı (Arda) Python ile bir dashboard + tahmin algoritması
> yazdı ve geliştirmeye Claude Code'da devam ediyor. **İlk iş:** mevcut repo'yu oku, bu
> dosyadaki formül/parametre/sayılarla eşleştir, tutarsızlık varsa değiştirmeden önce raporla.

---

## 1. Proje ve Case Özeti

- **Etkinlik:** Global Talent Bridge (MRO) hackathon — Turkish Technic / Turkish Technology case'i.
- **Case başlığı:** *"Filo Büyür, Envanter Hazır Mı?"* — bakım kapasitesi 1.200 → 2.000 uçağa
  (2025 → 2033) çıkarken komponent envanter yönetiminin buna hazır olup olmadığı; değilse
  Turkish Technology'nin (IT şirketi) sunacağı çözüm.
- **Takım:** Grup 9/10. AI kullanımı serbest. **Tüm veriler sentetik/dummy** (resmi case verisi,
  gerçek THY/AMOS verisi değil) — çıktılarda "sentetik/temsili" etiketi kullanılıyor.
- **Çözüm konsepti:** **Catalyst** — komponent envanteri için karar katmanı. Case'teki A
  (dashboard), B (sistem mimarisi) ve C (akıllı uyarı) başlıkları yönlendirici ÖRNEKLERDİR
  (tek seçim zorunluluğu yok); önerimiz üçünü tek çatıda birleştirir. Eski "Kontrol Kulesi"
  adı ve kule metaforu KULLANILMAZ.
  NOT (Tem 2026): eski "Seçenek D" etiketi sunumlardan çıkarıldı — var olmayan bir şık icat etmek
  jüride brief'i yanlış anlama izlenimi verebilirdi; iddia artık doğrudan söyleniyor.

### 1.1 Sunum rubriği (case Bölüm 4 — jürinin puanlama çerçevesi)
1. **Problemin Tanımlanması** — filo büyümesinin envantere getirdiği en kritik sorun, neden önemli
2. **Mevcut Durum Analizi** — bugünkü süreç/sistemdeki boşluklar + *bu boşluklar nasıl tespit edildi*
3. **Çözüm Önerileri** — ne, hangi problemi, nasıl çözüyor
4. **Prototip / Demo** — görselleştirme, ekran tasarımı, akış
5. **Önceliklendirme** — zaman/kaynak kısıtlıysa ilk adım ne, neden
6. **Başarı Kriterleri** — işe yaradığı hangi metrikle anlaşılır

### 1.2 Organizatörlerin vizyon yönlendirmesi (3. veri setiyle gelen mesaj — TASARIM BRIEF'İMİZ)
> "Çalışmayı yaparken sadece matematiksel model kurup 'şu kadar envanter tutarım' gibi bir sonuca
> ulaşmaktan ziyade, 2033 hedefine giderken **süreçlerin iyileştirilmesi**, **planlamanın esnek ve
> dinamik yapılması**, **sektörel ve küresel krizlere hazırlık** gibi dış etkenleri de düşünerek
> bir **vizyon** ortaya koymanız güzel olacaktır."

Bütün anlatı bu üç sütuna oturtuldu (Bölüm 7). Matematik zemin, vizyon bina.

### 1.3 Basılı case'ten arka plan (CSV'ler gelmeden önceki doküman — artık İKİNCİL kaynak)
- Zorluklar tablosu: dağınık veri kaynakları, stok tahmininde belirsizlik, bakım planı
  entegrasyon eksikliği, coğrafi dağılım / istasyon bazlı kör noktalar.
- İstasyon tablosu (sadece basılı case'te var, CSV'lerde YOK): IST 540→820, ESB 180→310,
  ADB 110→200, Uluslararası hub'lar 190→380, Diğer TR 180→290. Haritada **temsili dağıtım**
  etiketiyle kullanılabilir.
- Kategori değer bantları (basılı): Avionic & Uçuş Kontrol $50K–500K / 8–24 hafta / Kritik;
  Motor $20K–2M / 12–52 hafta / Çok Kritik; Hidrolik $5K–80K / 4–16 hafta; Kabin & IFE
  $1K–30K / 2–8 hafta; Yapısal $500–50K / 2–20 hafta. (Artık gerçek CLP/FMV var; bunlar
  sadece anlatı süsü.)
- Sözlük: AOG (Aircraft on Ground — her saati gelir kaybı), TAT (Turn Around Time), MRO,
  AMOS (sektör bakım yazılımı), Min-Max stok, Rotable (tamir edilip dönen), Consumable (tek kullanımlık).
- **Saha notlarımız (el yazısı, birincil gözlem):** bir komponent ~9 başkanlıktan geçiyor
  (Satış → Üretim Planlama → Satın Alma → Lojistik → Gümrük/Antrepo → Tesellüm → Depolar →
  Hat Bakım/Komponent Atölye → Komponent Hizmetleri → Mali İşler; Kalite yatay keser).
  4–5 kopuk sistem: TRAX, "Mars", ÜPK, depo/bin-raf takibi, ayrı tool-tracking uygulaması.
  Bozuk parça eskalasyon merdiveni (bugünkü reaktif süreç): atölyede tamir → hangar stoğu →
  vendor satın alım → Komponent Hizmetleri'nden getirtme → kanibalizasyon/donör (el yazısında
  "cana stok", yorumlandı) → AOG timi devralır. **Bu merdiven = aksiyon sıralayıcının ürün spesifikasyonu.**

---

## 2. Veri Setleri ve Şemalar

Üç resmi CSV. Konum (Claude.ai oturumunda): `/mnt/user-data/uploads/`. Repo'da yollarını bul ve
`data/` altına sabitle. **Tutarlılık kontrolleri geçti:** üç sette PN kümesi birebir aynı (5.000),
`ATOLYE_KABILIYETI` alanı setler arası tutarlı, `YURTICI_*` alanları yalnızca `VAR` iken dolu,
envanter setinde `TOPLAM_ENVANTER_ADET` = kovaların toplamı.

### 2.1 `dummy_pn_quarterly_data.csv` — çeyreklik talep/scrap (20.000 satır = 5.000 PN × 4 çeyrek, long format)
| Kolon | Açıklama |
|---|---|
| `PN` | PN-100000 … PN-104999 |
| `ATA_CHAPTER` | 21–80 arası sistem kodu |
| `SUB_CATEGORY` | Chapter'ın adı (ENGINE, LANDING GEAR…) |
| `AIRCRAFT_FAMILY` | AIRBUS / BOEING |
| `AIRCRAFT_MODEL` | 14 modelden biri (aşağıda) |
| `ATOLYE_KABILIYETI` | VAR / YOK (iç tamir kabiliyeti) |
| `YURTICI_TAT_GUN` | Sadece VAR ise dolu |
| `YURTDISI_TAT_GUN` | Her PN'de dolu |
| `SATINALMA_TAT_GUN` | Yeni parça tedarik süresi |
| `KRITIKLIK_DURUMU` | `AOG KRİTİK` / `KRİTİK` / `KRİTİK DEĞİL` (Türkçe İ'ye dikkat — eşleşmede `'AOG' in x` kullan) |
| `YIL`, `CEYREK`, `DONEM` | 2025, Q1–Q4, "2025-Q1" |
| `THY_TALEP_ADET`, `POOL_TALEP_ADET`, `SCRAP_ADET` | Çeyreklik adetler |

Üretim notları (briefing'den): PN öznitelikleri çeyrekler arası sabit; Q3'e yaz mevsimselliği
gömülü; motor (72/73) ve APU (49) chapter'larında kabiliyet olasılığı düşük, kritiklik yüksek;
talep Poisson + PN bazlı hacim/pool katsayılarıyla üretilmiş.

### 2.2 `fleet_distribution.csv` — filo projeksiyonu (14 satır, wide format)
Kolonlar: `AIRCRAFT_FAMILY, AIRCRAFT_MODEL, THY_2025_ADET, POOL_2025_ADET, THY_2033_ADET,
POOL_2033_ADET, TOPLAM_2025_ADET, TOPLAM_2033_ADET`.
Kontrol toplamları: **THY 500→800, Pool 700→1.200, Toplam 1.200→2.000.**
14 model: A319-100, A320-200, A320neo, A321-200, A321neo, A330-200, A330-300, A350-900,
737-800, 737-900ER, 737 MAX 8, 777-300ER, 777-F, 787-9.
Gruplamalar (analizde kullanılan): **widebody** = {A330-200, A330-300, A350-900, 777-300ER,
777-F, 787-9}; **yeni nesil** = {A320neo, A321neo, 737 MAX 8, A350-900, 787-9};
**küçülen 4 klasik** = {737-800, A320-200, A321-200, A319-100}.

### 2.3 `dummy_pn_inventory_status.csv` — envanter + fiyatlar (5.000 satır, PN başına 1)
| Kolon | Açıklama |
|---|---|
| `PN, ATA_CHAPTER, SUB_CATEGORY, AIRCRAFT_FAMILY, AIRCRAFT_MODEL, ATOLYE_KABILIYETI` | 2.1 ile aynı, tutarlı |
| `CLP_USD` | Katalog liste fiyatı (yeni alım) |
| `FMV_USD` | Adil piyasa değeri (ikinci el) |
| `YURTICI_TAMIR_MALIYETI_USD` | Sadece VAR ise dolu (NaN ⇔ YOK) |
| `YURTDISI_TAMIR_MALIYETI_USD` | Her PN'de dolu |
| `FAAL_ADET` | Kullanılabilir (saha/hat yorumu) |
| `HOMEBASE_DEPO_ADET` | Kullanılabilir (ana depo yorumu) |
| `GAYRIFAAL_ADET` | Unserviceable, karar bekliyor |
| `YURTICI_TAMIRDE_ADET`, `YURTDISI_TAMIRDE_ADET` | Tamir döngüsünde |
| `ACIK_SATINALMA_ADET` | Açık PO (yolda) |
| `EXCHANGE_IN_ADET`, `EXCHANGE_OUT_ADET` | Exchange trafiği |
| `TOPLAM_ENVANTER_ADET` | = yukarıdaki 8 kovanın toplamı (doğrulandı) |

**Yorum kararı (v4 dokümanına işlendi):** kullanılabilir stok `SVC = FAAL + HOMEBASE_DEPO`.
FAAL/HOMEBASE ayrımı "saha vs merkez" olarak YORUMLANDI — veri sahibi tanımı yok; UI'da
yorum olduğu belirtiliyor.

### 2.4 Veri boşlukları (hâlâ açık)
İstasyon boyutu yok (multi-echelon hesaplanamaz; harita = temsili). Seri numarası yok.
Tek yıllık tarih (yıllar arası trend yok; mevsimsellik tek gözlem). Envanter tek kesit
(anlık fotoğraf). Fiyat geçmişi yok (FMV izleme tasarımı ileriye dönük).

---

## 3. Doğrulanmış Bulgular — TÜM SAYILAR

Hepsi pandas ile hesaplandı; HTML'lere gömülmeden önce script'le doğrulandı. **Bu tabloları
tek doğruluk kaynağı say; dashboard'daki her sayı buradakiyle eşleşmeli.**

### 3.1 Filo (fleet_distribution)
| Metrik | Değer |
|---|---|
| Büyüme | THY +60%, Pool +71%, Toplam **+%66,7** |
| Pool uçak payı | %58,3 (2025) → %60,0 (2033) — **pool zaten çoğunluk** |
| Model deltaları (2033−2025) | 737 MAX 8 **+236**, A321neo **+212**, A320neo **+172**, A350-900 **+132**, 787-9 **+132** |
| Küçülen 4 klasik | toplam **−196** uçak |
| Widebody filo payı | %27 → %35 |
| Yeni nesil filo payı | ~%33 → **%64** (yoğunlaşma = kriz riski, bkz. 7.3) |

### 3.2 Talep 2025 (quarterly data)
| Metrik | Değer |
|---|---|
| Toplam talep | **90.016** adet (THY 65.027 / Pool 24.989 → pool talep payı **%27,8**) |
| Uçak başına yıllık | THY **130,1** / Pool **35,7** → **3,6×** fark (ANOMALİ, bkz. 9) ; model bazında 66–80 bandı |
| Mevsimsellik | Q3, diğer çeyrek ort.'nın **+%19,9** üstünde; kritiklik sınıflarına göre %16,7 / %18,9 / %21,7 (homojen) |
| Yıl içi trend | Q1→Q4 **+%6,6** |
| Scrap | 9.991 adet = talebin **%11,1**'i; corr(PN talep, PN scrap) = **0,797** |
| Kesiklilik | medyan PN talebi **11 adet/yıl**; PN'lerin %53,8'i ≤12/yıl; PN-çeyreklerin **%14,6**'sı sıfır; çeyreklik CV medyan **0,47** (%45'inde >0,5) |
| Adet Pareto **YOK** | top 20 PN → %5,3; top 500 (%10) → %38,5; %80 kapsama → **2.172 PN (%43)** |
| Kritiklik dağılımı | AOG KRİTİK 750 PN → talebin %18,6'sı; KRİTİK 1.500 → %31,8; KRİTİK DEĞİL 2.750 → %49,6 |
| Atölye kabiliyeti (VAR) | genel %35,1; AOG KRİTİK içinde **%27,1** (ters orantı) |
| TAT (gün) | iç ort **9** (medyan 8, max 28) · dış ort **43** (medyan 40, q75 51, max **146**) · satınalma ort **39** (medyan 34, max **270**) · AOG kritiklerde satınalma ort 44 |
| En yüksek talep kategorisi | ENGINE; scrap oranı liderleri POWER PLANT %12,2, ENGINE FUEL AND CONTROL %12,1 |
| Scrap anomalisi | scrap>%20 & yıllık talep≥20: **159 PN** (max %59) |
| Pool bağımlısı | pool payı ≥%50 & talep≥12: 150 PN → talebin sadece %3,8'i |

### 3.3 Risk listesi ve risk skoru
- **Risk listesi:** `AOG KRİTİK ∧ ATOLYE_KABILIYETI=YOK` → **547 PN** = AOG kritiklerin
  **%72,9**'u; talebin ~%14'ü; dış TAT ort **46** gün (max 124). **181**'i yeni nesil modelde
  (= "üçlü tehlike": kritik + kabiliyetsiz + geçmişsiz → en yüksek izleme önceliği).
- Dış TAT'a göre ilk 5 (v2 dokümanındaki tablo): PN-104040 (Hydraulic Power, 777-300ER, 124g,
  yıllık 28) · PN-104224 (Engine Fuel&Ctrl, A321neo, 108g, 55) · PN-100319 (Engine, 777-300ER,
  101g, 51) · PN-102782 (Engine, 787-9, 100g, 25) · PN-104630 (Electrical Power, A321neo, 91g, 20).
- **Risk skoru top-10** (skor = w×talep×etkinTAT/365; w: 3/2/1):

| PN | Kategori | Model | Kritiklik | Yıllık | EtkinTAT | Skor |
|---|---|---|---|---:|---:|---:|
| PN-101741 | Engine | 737 MAX 8 | KRİTİK | 121 | 130 | 86,2 |
| PN-102421 | Engine | A320-200 | AOG KRİTİK | 231 | 41 | 77,8 |
| PN-101732 | Power Plant | 737-800 | KRİTİK | 290 | 48 | 76,3 |
| PN-102604 | Engine | 737 MAX 8 | AOG KRİTİK | 117 | 77 | 74,0 |
| PN-103384 | Engine Fuel & Ctrl | A330-200 | KRİTİK | 85 | 138 | 64,3 |
| PN-100221 | Landing Gear | 737-900ER | KRİTİK | 262 | 41 | 58,9 |
| PN-104348 | Engine | A320neo | AOG KRİTİK | 183 | 37 | 55,7 |
| PN-100661 | Engine | 787-9 | KRİTİK | 122 | 77 | 51,5 |
| PN-101134 | APU | A330-300 | AOG KRİTİK | 99 | 63 | 51,3 |
| PN-104224 | Engine Fuel & Ctrl | A321neo | AOG KRİTİK | 55 | 108 | 48,8 |

- Skorun ilk 100 PN'deki payı **%22,9** (risk hacimden yoğun ama kısa listeye sığmaz).

### 3.4 2033 Projeksiyonu — BANT olarak sun
| Yaklaşım | Varsayım | Sonuç |
|---|---|---|
| Model bazlı | modelin uçak-başına toplam oranı sabit | 90.016 → **150.774** = **+%67,5** |
| Segment bazlı | THY 130,1 & Pool 35,7 sabit | ≈146.900 = **+%63,2** |
| **Sunum** | — | **"+%63–68 bandı"**; önerilen motor: model×segment kombinasyonu |
- Yeni nesil **talep** payı: %33,7 → %64,8 (model-bazlı proj.) → cold-start modülü merkezde.
- Küçülen 4 modelin talep payı: **%42,8 → %15,8**; bu modellere bağlı PN: **2.192 (%44)**.
- Kategori büyüme çarpanları AYRIŞIYOR: Electrical Power **+%91**, Ice&Rain +%89, Fire +%87
  vs Oxygen **+%40**, Air Conditioning +%44, Ignition +%47 → tek çarpanlı plan yasak;
  kategori×model×segment granülaritesi şart.

### 3.5 Envanter + finans (inventory_status) — hepsi mevcut kesit
**Stok kovaları (adet):** FAAL 17.364 · HOMEBASE 9.911 · **SVC 27.275** · GAYRIFAAL 4.803 ·
iç tamirde 1.253 · dış tamirde 6.547 · **tamirde toplam 7.800** · açık PO 3.130 ·
exchange in/out 2.585 / 2.607 · **TOPLAM 48.200**.

**Değerler:** fiziksel envanter (toplam − açık PO) FMV **$132,9M** / CLP (yenileme) **$304,2M**;
SVC $80,9M / $185,7M; gayrifaal $13,9M / $32,0M; tamirde $22,7M / $51,6M; açık PO taahhüdü
**$22,3M** (CLP). FMV/CLP medyan **0,43** (ort 0,44); FMV>CLP olan PN sayısı **0**
(→ FMV/CLP oranı kriz erken-uyarı sensörü olarak izlenecek).

**Değer Pareto VAR:** top 20 PN → %18,9; top 500 (%10) → **%67,1**; %80 → **938 PN**.
Değer payları kritiklikle: AOG %21,8 / KRİTİK %35,7 / DEĞİL %42,6 → **pahalı ≠ kritik, iki
ayrı eksen** (operasyon = risk skoru listesi; sermaye = değer listesi). Fiyat medyanları
(CLP/FMV): AOG 3.265/1.255 · KRİTİK 2.710/1.070 · DEĞİL 2.415/1.000; AOG ort CLP $7.338 vs
genel $6.204. En değerli kategoriler: Engine $13,7M, Landing Gear $12,6M, Air Conditioning
$8,8M, APU $7,3M, Indicating/Recording $7,1M.

**TTS/TTR (talep>0 olan 4.904 PN):** TTS medyan **120 gün** (q25 88, q75 156).
**KIRMIZI (TTS<TTR): 134 PN**, 22'si AOG kritik; 547 listesinden 21'i kırmızıda.
Kırmızıları TTR'ye çıkarma maliyeti (eksik adet × CLP): **$0,7M**.
**Kırmızı + açık PO=0: 72 PN (11'i AOG kritik)** ← *sürecin kör noktasının tek-sayılık kanıtı;
demo açılış kartı.* Kırmızı örnekler (değer sıralı ilk 5):

| PN | Kategori | Kritiklik | SVC | Yıllık | TTS | TTR | Açık PO | FMV |
|---|---|---|---:|---:|---:|---:|---:|---:|
| PN-101741 | Engine | KRİTİK | 33 | 121 | 99,5 | 130 | 14 | $12.900 |
| PN-104693 | Engine Controls | KRİTİK DEĞİL | 1 | 7 | 52,1 | 66 | 0 | $31.950 |
| PN-103278 | Starting | KRİTİK DEĞİL | 5 | 35 | 52,1 | 67 | 2 | $9.190 |
| PN-102386 | Oil | KRİTİK DEĞİL | 11 | 59 | 68,1 | 81 | 6 | $3.930 |
| PN-103600 | Landing Gear | KRİTİK | 1 | 5 | 73,0 | 101 | 0 | $19.620 |

**Şişkinlik MİTİ:** fazla stok (TTS>365): 74 PN, 1 yıl-üstü fazla sadece **56 adet / $0,2M**;
ölü stok (talep=0 & SVC>0): 84 PN / **93 adet / $0,2M**. → "Bugünkü adetler kabaca yerinde;
sorun görünürlük ve süreç." (Organizatör brief'iyle örtüşür.)
**Phase-out $ maruziyeti:** küçülen 4 modele bağlı envanter değeri **$52,0M (%39,2)**.

**Tamir ekonomisi:** dış tamir/CLP medyan **0,26** (q75 0,40); iç tamir/CLP medyan **%16**;
iç/dış maliyet oranı medyan **0,64** (ort 0,66) → **iç tamir ~5× hızlı VE ~%36 ucuz**.
**BER adayları:** dış maliyet/CLP > 0,65 olan **338 PN**, yıllık talepleri **6.693** adet →
tamir yerine değişim/exchange/bilinçli scrap stratejisi.
**Yıllık scrap ikame bütçesi (scrap×CLP): $67,8M** ← en büyük para musluğu.
**Gayrifaal kuyruğu:** 4.803 adedin tamamını faale döndürmek $8,5M tamir ister, $13,9M FMV
yaratır (BER'ler ayıklanmalı).

**Float:** model tahmini **8.012 adet** = **$23,3M** FMV; 2033'te (×1,675) **$39,0M**
(**+$15,7M** ek bağlı sermaye). **Kabiliyet senaryosu (547 → iç TAT 9 gün):** float
**−1.295 adet = $4,0M** bir defalık serbesti + **$12,1M/yıl** tamir maliyeti tasarrufu
(iç = dış×0,64 varsayımı); 547'nin bugünkü dış tamir harcaması **$33,6M/yıl**.

### 3.6 ✅ MODEL DOĞRULAMALARI (sunumun en güçlü kozları)
1. **Float formülü:** yalnızca talep+TAT'tan tahmin **8.012** ↔ gerçek tamirde **7.800** adet
   → **%97 isabet.** Slider/stres testi aynı motoru kullanır; demo maket değildir.
2. **Risk skoru:** skor 1 numarası **PN-101741**, gerçek stok verisinde fiilen kırmızı çıktı
   (TTS 99,5 < TTR 130; 14 adet açık PO ile birisi el yordamıyla fark etmiş).

---

## 4. Formüller ve Model Tanımları (kodla birebir)

```python
# Etkin TAT / TTR
etkin_tat = YURTICI_TAT_GUN if ATOLYE_KABILIYETI == "VAR" else YURTDISI_TAT_GUN

# Risk skoru  (w: AOG KRİTİK=3, KRİTİK=2, KRİTİK DEĞİL=1  — parametrik)
risk_skoru = w * yillik_talep * etkin_tat / 365

# Float (tamir döngüsündeki beklenen adet) — %97 doğrulandı
float_adet = yillik_talep * etkin_tat / 365            # parasal: × FMV_USD

# TTS / kırmızı liste  (kırmızı hesap tampon=0 ile yapıldı; üründe tampon parametre)
SVC = FAAL_ADET + HOMEBASE_DEPO_ADET
lam = yillik_talep / 365
TTS = SVC / lam                                        # talep>0 için
alarm = TTS < (TTR + tampon)
kapatma_maliyeti = max(0, (TTR - TTS) * lam) * CLP_USD  # kırmızıları TTR'ye çıkarma

# Kabiliyet senaryosu (547 risk listesi, hedef iç TAT = 9 gün)
sermaye_serbestisi = talep * (YURTDISI_TAT_GUN - 9) / 365 * FMV_USD          # toplam $4,0M
yillik_tamir_tasarrufu = talep * YURTDISI_TAMIR_MALIYETI_USD * (1 - 0.64)    # toplam $12,1M/yıl

# BER kuralı (parametrik eşik 0,65)
ber_adayi = YURTDISI_TAMIR_MALIYETI_USD / CLP_USD > 0.65

# Scrap bütçesi
scrap_butcesi = SCRAP_yillik * CLP_USD                 # toplam $67,8M/yıl

# 2033 projeksiyon (bant): model-bazlı ve segment-bazlı ayrı hesapla, bandı raporla
# model-bazlı: her modelin (toplam_talep/toplam_ucak_2025) * ucak_2033
# segment-bazlı: 800*130.1 + 1200*35.7
# önerilen motor: model×segment kombinasyonu (oranlar parametre)

# Emniyet stoğu (Faz 2): servis hedefi h (kritiklikle 0.98/0.95/0.90)
# kesikli PN: s* = min{s : PoissonCDF(s; lam*L) >= h} ; yüksek hacim: z*sqrt(lam*L)
# Tahmin segmentasyonu: ABC (hacim) × XYZ (CV); kesikli çoğunluk → Croston/SBA
# Mevsim katsayısı Q3 ≈ 1.20; yıl içi trend +%6,6 (düşük güven)
# Cold-start: analog eşleme (chapter+rol+gövde ailesi) + OEM MTBUR öncülü, Bayesyen güncelleme
```

### 4.1 Parametre defaultları (config'e alınmalı — jüri önünde canlı değiştirilebilir olması artı)
| Parametre | Default | Not |
|---|---|---|
| Kritiklik ağırlıkları | 3 / 2 / 1 | risk skoru |
| Servis hedefleri | %98 / %95 / %90 | AOG / KRİTİK / DEĞİL |
| BER eşiği | 0,65 | dış maliyet / CLP |
| İç/dış maliyet oranı | 0,64 | 547 için tahmin (VAR PN medyanı) |
| Kabiliyet hedef iç TAT | 9 gün | VAR PN ortalaması |
| Q3 mevsim katsayısı | 1,20 | |
| Alarm tamponu | 0 (raporda) | üründe ayarlanabilir, örn. +7g |
| Segment oranları | THY 130,1 / Pool 35,7 | ANOMALİ — parametre, sabit değil |
| AOG maliyeti $/saat | tanımsız | kullanıcı girdisi |

---

## 5. Çözüm Mimarisi ve Feature Kataloğu (özet — fazlarla)

**Faz kapıları takvim değil METRİK:** Faz1→2 veri kalitesi skoru; Faz2→3 MAPE + öneri kabul oranı.

**Katman 1 — Görünürlük (Faz 1, salt-okunur):** tek komponent kaydı + event-sourced durum
makinesi (SERVICEABLE→SÖKÜLDÜ→TAMİRDE(iç/dış)→TRANSİT→GÜMRÜK→RAF→SCRAP; gerçek TAT = event
farkı); "parçayı bul" sorgusu (telefon merdiveninin okunur hâli); mobil barkodlu
tesellüm/depo kaydı; veri kalitesi skoru; **sermaye kokpiti** (FMV/CLP, float sermayesi,
açık PO $22,3M, üç musluk); KPI kokpiti.

**Katman 2 — Öngörü (Faz 2, öneri modu):** ABC×XYZ segmentasyonu → yöntem ataması
(Croston/SBA kesikliye, klasik düzenliye); servis-hedefli emniyet stoğu (Poisson);
filo-sürücülü projeksiyon motoru (kategori×model×segment, bant üretir); **cold-start modülü
merkezde** (2033 talebinin ~%65'i geçmişsiz PN'de); scrap ayrı seri → $67,8M satın alma
planının girdisi; dinamik min-max (gecelik, insan onaylı, gerekçeli log).

**Katman 3 — Aksiyon (Faz 2–3):** alarm motoru (TTS<TTR+tampon; şiddet=risk skoru; yaşam
döngüsü açık→atanmış→çözüldü; dedup/snooze; kalite KPI'ı = lead-time öncesi yakalama; "alarm
var sipariş yok" tanım gereği imkânsızlaşır); **aksiyon sıralayıcı** (merdiven: transfer →
pool/exchange swap → iç tamir → dış expedite → satın alma → kayıtlı kanibalizasyon; süre+maliyet
skoru, AOG $/saat ile karşılaştırma); pool modülü (sahiplik defteri, swap önerisi, SLA/fatura
event'i, operatör portalı — mevcut ~2.600 adetlik exchange trafiğini kural altına alır);
AOG masası; what-if simülatörü (slider aynı çekirdek).

**Finansal veriyle eklenen modüller:** **BER motoru** (338 PN, 6.693 adet/yıl → tamir/değişim
kararı kurala bağlanır); **gayrifaal karar kuyruğu** ($8,5M maliyet ↔ $13,9M değer, SLA'lı);
**kabiliyet ROI sıralayıcısı** ($12,1M/yıl + $4,0M; üçlü tehlike 181 öncelik bayrağı; kurulum
maliyeti parametre); **phase-out planlayıcısı** ($52,0M stok; sinyal-tabanlı eritme +
last-time-buy tetiği); **FMV/CLP izleme** (0,43 bazından kalıcı yükseliş = kıtlık sinyali);
scrap anomali dedektörü (159 PN); dış istasyon SLA karnesi; kanibalizasyon borç defteri.

**Vitrin/AI:** AOG Copilot (RAG + aksiyon sıralayıcı fonksiyon çağrısı; yalnız okur/önerir);
belirsizlik denemeleri / stok-out simülatörü (Poisson örneklem → P(stokout|s) eğrisi; veri zaten Poisson);
mimari hikâyesi: kaynaklardan CDC → event bus → tek veri modeli → analitik → uygulamalar;
**"AMOS'u değiştirmiyoruz, üzerine karar katmanı"** (hiçbir kaynağa yazma yok).

---

## 6. Sunum Planı: Rubrik Eşlemesi

| # | Rubrik | İçeriğimiz |
|---|---|---|
| 1 | Problem | Talep +%63–68 bandında büyürken **üçte ikisi yer değiştiriyor** (yeni nesil %34→%65); pool zaten çoğunluk; kategori çarpanları 2× ayrışıyor. Ana problem: talep öngörülmüyor + parça görünmüyor (72 siparişsiz kırmızı = kanıt). |
| 2 | Mevcut durum | Saha haritası (9 başkanlık, 4–5 sistem, reaktif merdiven) + resmi veriyle sayısallaştırma (kırmızı 134/72, TAT, kritiklik×kabiliyet ters orantısı). |
| 3 | Çözüm | 3 katman + finansal modüller; her biri "hangi boşluğu çözüyor" etiketiyle; kabiliyet yatırımı = yazılım-dışı 4. öneri. |
| 4 | Prototip | Python dashboard (kullanıcının kodu) — akış aşağıda (6.1). |
| 5 | Önceliklendirme | Faz 1 salt-okunur; kapsam = risk skoru + değer listesi; ilk gün değeri: 72 siparişsiz kırmızının yakalanması. Kapılar metrikle. |
| 6 | Başarı kriterleri | Parça kaynaklı AOG saati ↓; kritik fill rate ≥%97–98; stockout'ların lead-time ÖNCESİ yakalanma oranı ↑; expedite maliyeti ↓; MAPE ↓; scrap oranı izlenir; bağlı sermaye/devir hızı guard-rail; **siparişsiz kırmızı = 0** hedefi. |

### 6.1 Demo akışı (5–6 dk, hepsi gerçek veriden — stok sentezleme YOK)
1. **Sermaye kokpiti:** $132,9M envanter + üç musluk + vurgu kartı "72 PN kırmızıda ve açık
   siparişi yok — 11'i AOG kritik."
2. **Watchlist (risk skoru sıralı):** PN-101741 vakası — skor 1 ↔ sahada gerçekten kırmızı.
3. **Arıza senaryosu:** alarm → aksiyon sıralayıcı (süre+maliyet sıralı seçenekler).
4. **Öngörü:** çeyreklik grafik (Q3 zirvesi) + tek PN'de canlı stok yeterlilik eğrisi.
5. **Filo slider 2025→2033:** talep bandı, kategori ayrışması, float sayacı $23,3M→$39,0M.
6. **Stres testi düğmesi:** "motor ailesi krizi" — yeni nesil talep ×1,5, dış TAT ×1,3 →
   kırmızı sayısı ve $ etkisi canlı yeniden hesap.
7. **Kapanış — kabiliyet ROI:** 547 liste, $12,1M/yıl + $4,0M; "yazılım ekranı değil, yatırım
   kararı sunuyoruz."

---

## 7. Vizyon 2033 — Üç Sütun (organizatör brief'inin cevabı)

**7.1 Süreç iyileştirme (yazılımdan bağımsız değer):** TAT programı (iç akış + dış SLA
karnesi — TTR'nin her günü sermayedir); gayrifaal kuyruğu SLA'sı (4.803 bekleyen karar);
BER standardı (kanaat değil kural — $67,8M musluğunun vanası); kanibalizasyon prosedürü
(donör borç defteri); el değişimi azaltma (9 başkanlıkta RACI, tesellüm/gümrük
tekilleştirme); sektör dili eğitimi (case'in sözlük paylaşması tesadüf değil).

**7.2 Esnek ve dinamik planlama (nokta değil ritim):** aylık yeniden tahmin + çeyreklik
S&OP; her kritik sayı **parametre** (segment oranları, ağırlıklar, eşikler); projeksiyon
**bant** (+%63–68) ve iki uçta stok politikası testi; kararlar **tetiklerle** (phase-out
"kalan talep eşiğin altına inince", last-time-buy "OEM üretim sonu duyurusu", otomasyon
"MAPE+kabul eşiği") — $52,0M'lık eritme planını hem erken hem geç kalma hatasından korur;
OEM teslimat gecikmesinde takvim planı çöker, tetik planı kendini düzeltir.

**7.3 Kriz hazırlığı (TTS/TTR dilinde):** her kriz TTS'yi kısaltır ve/veya TTR'yi uzatır →
kriz = parametre şoku → stres testi projeksiyon motorunun üstünde bir düğme. **Senaryo
kütüphanesi:** pandemi tipi (talep çöküş→sıçrama; tamir kapasitesi kaybı TTR×1,5);
**motor ailesi krizi** (GTF benzeri — 2033 filosunun %64'ü 5 yeni nesil modelde: ortaklık
verim sağlar ama riski YOĞUNLAŞTIRIR; tek ailede arıza dalgası aynı PN'lerde talep patlatır);
OEM teslimat gecikmesi (klasikler geç emekli → phase-out tetikleri otomatik yavaşlar);
lojistik krizi (Kızıldeniz benzeri — dış TAT & satınalma kuyrukları; 270 gün hatırlatması);
kur şoku (parçalar USD — FMV/CLP izleme + tamir-öncelikli nakit koruma modu, BER eşiği
bilinçli kaydırılır). **Dayanıklılık metrikleri kokpitte:** kırmızı sayısı + içindeki
siparişsizler (bugün 134/72; hedef siparişsiz=0), tek-tamir-kaynaklı AOG kritik oranı, TTS
alt yüzdelikleri, FMV/CLP trendi. **Playbook önceden yazılır:** SLA katmanlı tahsis kuralları,
önceden yetkilendirilmiş aksiyonlar; **çeyreklik war-game** (bir senaryo canlı koşulur).
Pool = karşılıklı sigorta (tekil operatör şoklarını yumuşatır).

**Vizyon tek cümle:** *2033'e daha büyük bir depoyla değil; her parçanın görünür, her kararın
kurallı, her planın parametrik ve her krizin önceden prova edilmiş olduğu bir işletim
modeliyle gidilir — Catalyst bu modelin yazılım hâlidir.*

---

## 8. Jüri Soruları — Hazır Cevap Özetleri

1. **"Envanter dengede; problem ne?"** → Denge kör: 72 siparişsiz kırmızı; 1.200'de el
   yordamıyla tutan denge 2.000'de tutmaz.
2. **"Para nerede?"** → Üç musluk: $67,8M/yıl scrap, $23,3M→$39M float, $52M phase-out;
   + kabiliyet $12,1M/yıl.
3. **"Kriz hazırlığı somut ne?"** → TTS/TTR = kriz dili; senaryo kütüphanesi + stres düğmesi
   + war-game + playbook; %64 yeni nesil yoğunlaşması riskini biz gündeme getiriyoruz.
4. **"Neden daha çok stok almıyorsunuz?"** → Açık $0,7M ile kapanır; sorun adet değil süre
   (270g kuyruk) ve bilgi; kör stok = 2033'te $39M raf.
5. **"AMOS varken fark ne?"** → Kayıt vs karar katmanı; CDC ile okuma, yazma yok; 72
   siparişsiz kırmızı = eksik katmanın ölçümü.
6. **"Yeni nesil geçmişsiz; tahmin neye dayanır?"** → Cold-start (OEM MTBUR + analog +
   Bayes); ana senaryo, kenar vaka değil.
7. **"Projeksiyon güvenilir mi?"** → Bant + şeffaf varsayımlar; geriye dönük kanıt: float
   %97, PN-101741.
8. **"Neden top-N'e odaklanmıyorsunuz?"** → Adette Pareto yok (%5,3); değerde var (%67,1) →
   iki ayrı liste stratejisi.

---

## 9. Anomaliler, GERİ ÇEKİLEN İDDİALAR ve Sınırlar (ÖNEMLİ)

- **KULLANMA — geri çekildi:** İlk analizde basılı case'in "uçak başına ~4.200–7.200
  komponent" tablosundan türetilen "%67 filo ↔ %72 komponent pozisyonu (5,70M→9,80M)"
  iddiası, resmi CSV'lerle DESTEKLENMEDİ (uçak başına talep 66–80 bandında homojen; talep
  büyümesi ≈ filo büyümesi). v2'den itibaren tüm dokümanlardan çıkarıldı. Dashboard'a
  **yeniden sokma.** Ana tez artık "büyüme değil GÖÇ" (%34→%65).
- **Anomali (mentora soru):** THY 130,1 vs Pool 35,7 adet/uçak-yıl (3,6×) ve pool uçak payı
  %58 iken pool talep payı %27,8. Olası: dar sözleşme kapsamı / düşük kullanım / veri
  kurgusu. Raporlanır, sistem parametrik kalır.
- **Düzeltme (kod doğrulaması, Temmuz 2026):** kabiliyet tasarrufu dokümanda "$12,2M/yıl" yazıyordu;
  formülün (547 × talep × dış maliyet × 0,36) gerçek CSV'lerle sonucu **$12.109.021 → $12,1M/yıl**.
  Dokümanın kendi çapraz kontrolü de bunu doğrular ($33,6M × 0,36 = $12,1M). Tüm geçişler $12,1M'e düzeltildi;
  dashboard ile slaytlar arasında fark kalmadı.
- **Varsayımlar:** SVC=FAAL+HOMEBASE (yorum); iç maliyet=dış×0,64 (547 için tahmin); risk
  ağırlıkları 3/2/1 ve BER 0,65 ayarlanabilir; FMV muhasebe değil piyasa göstergesi; tek
  yıl → trend düşük güven; envanter tek kesit; kategori ayrışmasının/3,6×'in şiddeti
  sentetik kurgu eseri olabilir — "veri şunu gösteriyor" ile "operasyonda doğrulanmalı"
  cümleleri ayrılır. Kırmızı liste hesabı tampon=0 ile yapıldı.

---

## 10. Mevcut Teslimatlar ve Tasarım Sistemi

**Dashboard teslimatı (Temmuz 2026, Claude Code):** `catalyst.html` — core.py →
build_dashboard.py hattından üretilen tek dosyalık interaktif prototip. Kapsam: karar merkezi
(kanal dağılımı, sipariş penceresi alarmı, planlama ufku, fazla stok dengeleme — açılış ekranı;
sermaye kokpiti sekmesi 24 Tem 2026'da kullanıcı isteğiyle KALDIRILDI, geri ekleme önerme),
watchlist (159 hurda anomalisi + 150
pool bağımlı filtreleri dahil), ABC×XYZ matrisi, tahmin gezgini + hata analizi (tam tahmin
vektörü model_results.json'da), cold-start Bayes demosu, phase-out planlayıcısı, iki modlu etkileşimli
harita — Türkiye (16 yurt içi havalimanı, gömülü kontur) + küresel ağ (İstanbul merkezli
azimut, 9 dış hub); havalimanı seti core.HAVALIMANLARI'nda, grup toplamları basılı case
tablosuyla BİREBİR mutabık (en-büyük-kalan yöntemi, smoke testi doğrular; temsili dağıtım), kriz simülatörü + CANLI PARAMETRE PANELİ (4.1'in "jüri
önünde değiştirilebilir" şartı karşılandı), dayanıklılık paneli, kabiliyet ROI kapanışı.
Doğrulama: `node smoke_test.js` (baz 134/22 + 159/150 + parametre varsayılanları birebir).
ML modeli 3 tohumlu topluluk + en-iyi-epoch geri yükleme ile deterministik; Q4 MAE ~1,97
(en iyi klasik 1,72'nin ~%14 gerisinde — "başa baş" DEME, dürüst bulgu anlatısı kullan).

**HTML dokümanları (claude.ai oturumundan; repo temizliğinde silindi, tarihsel referans):**
- `komponent-kontrol-kulesi-brief.html` — v2 kısa ekip brief'i
- `kontrol-kulesi-detayli-analiz.html` — v3 detaylı analiz + feature kataloğu (uzun gerekçeler)
- `kontrol-kulesi-vizyon-dokumani.html` — **v4 MASTER**: 3 setin birleşik analizi + vizyon

**Web uygulaması teslimatı (Tem 2026, `web/`):** `catalyst.html`'in TÜM özelliklerini koruyan
React 19 + TypeScript + Vite sürümü. Amaç: 3D sahneler, animasyon ve yeni ekranlar için
geliştirilebilir taban (CODE küresi ve tam ekran harita küresi burada doğdu). Tek dosyalık prototip
DOKUNULMADAN duruyor (sunum yedeği; onun haritası hâlâ 2D SVG).
- **Yığın:** React 19 · TS 7 · Vite 8 · framer-motion (geçişler) · Chart.js + react-chartjs-2
  (25 grafik birebir taşındı) · zustand (ekranlar arası köprüler + senaryo parametreleri) ·
  three + @react-three/fiber + drei (ayrı chunk; CODE çekirdek küresi + harita küresi) ·
  vite-plugin-singlefile (offline tek dosya: `npm run build:tek-dosya`).
- **Katmanlar:** `src/engine/` saf hesap (core.py formüllerinin TS ikizi, DOM bilmez) ·
  `src/data/` payload.json + tipler · `src/design/` tokenlar · `src/views/` ekranlar.
  Bir sayı iki ekranda görünüyorsa ikisi de aynı engine fonksiyonunu çağırır.
- **Veri hattı:** `build_dashboard.py` artık `web/src/data/payload.json`'u da yazar; Python
  yoksa `node web/scripts/veri-cikar.mjs` catalyst.html'den birebir aynı JSON'u ayıklar.
- **Parite:** `cd web && npm test` → 44 kontrol; 34'ü sayı paritesi (694/641/217/3.448 · alarm 42 ·
  134/22 · motor 477 · OEM 283 · belirsizlik 389 [%80: 371–408] · motor 797), 10'u küre geometrisi.
  Taşımada sayı kaybı yok.
- **Bilinen karar:** sekme geçişi yalnız giriş animasyonu. `AnimatePresence mode="wait"` +
  lazy sekme askıya alınınca çıkış "tamamlandı" saymıyor ve ekran kilitleniyor (ölçüldü).
  Sekme parçaları ilk boyamadan 400 ms sonra prefetch edilir, geçişte yükleme yazısı görünmez.

**CODE — Component Decision Engine (Tem 2026, web'in açılış ekranı):** eski "Karar Merkezi"
sekmesinin yerine geçti (`views/Code.tsx`; `KararMerkezi.tsx` silindi). Kullanıcı isteği: ilk
sayfa baştan sona tek bir karar ürünü olsun, tasarım **Palantir Gotham havasında koyu operasyon
konsolu** (uygulamanın kalanı açık THY temasında kalır; `design/code.css` yalnız bu ekranı sarar,
üst bar CODE'da koyu tona geçer). Katmanlar: ① 3D çekirdek küresi ② içgörü akışı ③ karar konsolu
④ kısa vade (kanal/pencere/ufuk/transfer) ⑤ uzun vade yol haritası.
- **Karar mekanizması watchlist'ten TAŞINDI.** Tek bileşen `components/KararKarti.tsx`:
  konsolda düğmeleriyle, `watchlist/ParcaDetay` içinde `saltOkunur` modunda + "CODE konsolunda
  karar ver" köprüsü. Karar tek yerde verilir; öneri hâlâ `engine/oner.ts`, kuyruk `engine/karar.ts`.
- **3D küre (`views/code/Kure.tsx`):** her nokta gerçek bir parça (renk = kanal), Fibonacci
  yerleşimi risk sıralı geldiği için kuzey kutbu = en riskli. Üç ölçülmüş karar: (a) nokta ışını
  yerine görünmez **seçim yüzeyi** + en yakın parça (5.000 nokta çok sıkışık, eşik geniş olunca
  yanlış parça, dar olunca hiç seçim); (b) etiketler drei `Html` DEĞİL kendi katmanımız — drei
  her etiket için tuvali kaplayan sarmalayıcı div açıp tıklamayı yutuyordu (DOM'da doğrulandı);
  (c) tekerlek yakınlaştırması kapalı, yoksa sayfa kaydırılamıyor. WebGL yoksa `SahneKalkani`
  hata sınırı devreye girer, sayılar çalışmaya devam eder.
- **İçgörü akışı (`views/code/icgoru.ts`) — DÜRÜSTLÜK:** cümle kalıpları ve güven yüzdeleri
  sabittir, içindeki **sayıların hepsi** payload/engine'den canlı gelir. Bu ayrım hem kodda hem
  ekranda yazılı; "LLM üretti" gibi sunulmuyor. Uzun vade planı da aynı kuralla: anlatı ürün
  kararı, rakamlar canlı.
- **Üç sabit dosya:** `code/sahneVeri.ts` (three'ye dokunmaz — sabitler Kure'de kalsaydı statik
  import three chunk'ını ilk boyamaya bağlıyordu), `code/KararKonsolu.tsx`, `code/UzunVade.tsx`.
- **Stil sabiti:** `web/.prettierrc.json` eklendi (tek tırnak, 100 sütun) — repo stili buydu,
  prettier varsayılanı çift tırnağa çeviriyordu.

**HARİTA — tam ekran 3D küre (Tem 2026, kullanıcı isteği):** 2D SVG harita (Türkiye konturu +
azimut görünümü) KALDIRILDI; yerine ekranın tamamını kaplayan "Google Earth tech" havasında
operasyon küresi geldi (`views/Harita.tsx` = HUD kabuğu, `views/harita/kure/`). `useGorunum.ts`
silindi (2D jestler → OrbitControls); `haritaVeri.ts` TEK SATIR değişmedi — 3D seam'i işe yaradı,
süre/kanal/rota sayıları aynı yerden geliyor. Üst bar CODE'da olduğu gibi haritada da koyu tona
geçer; App'te hero ve varsayım şeridi bu sekmede gizlenir (`design/kure.css` yalnız bu ekranı sarar).
- **Katmanlar:** `kure/kureGeo.ts` saf matematik (three bilmez; testleri node'da koşar) ·
  `kure/kureStil.ts` koyu palet + kanal akış hızları · `kure/KureSahne.tsx` R3F sahnesi.
- **Kıtalar dosyadan değil hesaptan:** hazır earth.jpg yok (offline şartı) — kara noktası matrisi
  aynı 110m `data/dunya.ts` konturundan, nokta-içinde-poligon testiyle çalışma anında üretilir
  (20°'lik hücre dizini + bbox ön elemesi). Boylam adımı 1/cos(lat).
- **Akış = süre:** rota yayları büyük çember; üzerlerinde kuyruklu parçacıklar akar, hız kanal
  tipine bağlı (`AKIS_HIZ`: havuz hızlı, satın alma en yavaş). Kanal satırına tıklamak kamerayı o
  yola uçurur (büyük çember üzerinde slerp; kullanıcı sürüklerse uçuş iptal).
- **Metrik seçici (yeni):** sütun yüksekliği uçak/stok/talep/kırmızı/MIN33/dışa bağımlı + kritiklik
  süzgeci. Değerler `HA.krTot × istasyon payı` ile dağıtılır — build_dashboard.py'nin kuralı;
  `haritaVeri.metrikDegerler()`. Tek dosyalık sürümdeki metrik görünümleriyle aynı mantık.
- **Ölçülen kararlar:** (a) kadraj bütün kanalları değil "hedef + konuşulan kaynak"ı çerçeveler —
  tek bir JFK havuz seçeneği kamerayı dünyaya çekip AOG istasyonunu kenarda bırakıyordu;
  (b) işaretler zoom'la büyümez (ölçek × kamera uzaklığı), yoksa yakınlaşınca tek halka ekranı
  kaplıyor — sütun boyu ise coğrafi veri olduğu için dünya ölçeğinde kalır; (c) yay çizgisinde
  toplamsal karışım yok (demet beyaza doyup kanal rengini yok ediyordu), ışıma yalnız parçacıkta;
  (d) genel görünümde parça başına yalnız önerilen yol çizilir, alternatifler parçaya tıklayınca;
  (e) açılış kadrajı animasyon değil doğrudan kamera konumu (`baslangic`) — sunumda uçuş beklemesi
  yok; (f) etiketler kendi HTML katmanında (drei `Html` tıklamayı yutuyor) ve çakışanlar önem
  sırasına göre elenir.
- **Dayanıklılık:** WebGL yoksa `SahneKalkani` sayıları düz listeyle gösterir; `webglcontextlost`
  yakalanır (bağlam kaybında sahne sessizce siyah kalıyordu, HTML katmanı çalışmaya devam ediyordu).

**Tasarım tokenları — GÜNCEL (web/src/design/tokens.css):** turkishairlines.com'a sadık
**açık** tema. Marka kırmızısı `#E81932` (kimlik + birincil eylem), koyu yüzey `#16233A`,
ink `#1A1A1A`, altın `#C6A26B`; yüzeyler `#FFFFFF`/`#F7F8F9`/`#F0F2F4`, çizgi `#E2E5E9`.
**KURAL:** marka kırmızısı hiçbir veri serisinde/durum rozetinde kullanılmaz — veri kırmızısı
ayrı ton (`#C1121F`), böylece "marka" ile "alarm" gözle ayrışır. Durum renkleri: teal `#0E6B4A`,
amber `#8A6000`, mavi `#2C5AA0`, mor `#5B4B8A`. Font: sistem yığını (offline şartı); lisanslı
THY yazı tipi eklenecekse tek değişken (`--tk-font-display`).
Sayı stili: UI'da Türkçe ondalık virgül ("%67,5", "$23,3M"); kodda nokta.

**KOYU EKRANLAR — SİYAH · KIRMIZI · BEYAZ (27 Tem 2026, kullanıcı kararı):** CODE ve HARİTA
sekmelerinde mavi/cyan/teal/mor **yok**; palet turkishairlines.com'un siyah-kırmızı-beyaz
ayarına indirildi (`design/code.css` `--c-*`, `design/kure.css` `--k-*`, `views/code/sahneVeri.ts`,
`views/harita/kure/kureStil.ts`). Üç rol: siyah–gri zemin/yapı/pasif seri · beyaz yapı aksanı ve
"elimizde olan/iyi" · kırmızı rampası aciliyet ve marka eylemi (`#ff9aa2` uyarı → `#ff3b4a` alarm →
`#e81932` birincil eylem/seçim dolgusu). Ayrım hue ile değil **açıklık basamağıyla** yapılır:
7 tedarik kanalı beyazdan koyu bordoya tek eksende sıralanır (nötr = kendi kaynağımız, kırmızı =
dışarıya para/süre), bu yüzden CSS değişkenleri renk adıyla değil ROLLE adlandırıldı
(`--c-akw/--c-gri/--c-alt/--c-uyari/--c-red/--c-red2`; `--k-aks/--k-marka/--k-red`).
Sonuç: üstteki "marka kırmızısı veri serisinde kullanılmaz" kuralı **yalnız açık temada**
geçerlidir; koyu iki ekranda kırmızı zaten tek anlam taşır — "buraya bak".
- Ölçülen iki düzeltme: (a) atmosfer halesi kırmızıya geçince toplamsal karışımda taşıp küreyi
  yutuyordu → `scale 1.135→1.075`, fresnel üssü `2.1→3.2`, çarpan `1.15→0.85`; (b) HUD'daki
  "önerilen" rozeti açık bir kutuya dönüşüyordu — base.css'in açık temalı tek-sınıf `.oner`
  kartı sızıyor, `.ksat .oner` içinde `background` açıkça sıfırlanmalı.

> ESKİ (artık geçersiz): koyu tema `#0B1220` + Space Grotesk/Inter/JetBrains Mono. `catalyst.html`
> Temmuz 2026'da açık teknik gri temaya geçmişti; web uygulaması bunu THY kimliğine taşıdı.

---

## 11. Kullanıcının Python Çalışması + Claude Code İlk Görevleri

Kullanıcı bir **Python dashboard** ve **tahmin algoritması** yazdı (bu dosya yazılırken
içeriği görülmedi). İlk oturum planı:
1. Repo'yu keşfet: dosya yapısı, dashboard framework'ü (Streamlit/Dash/Plotly?), tahmin
   yaklaşımı; hangi CSV yollarını kullanıyor.
2. **Sayı mutabakatı:** kodun ürettiği metrikleri Bölüm 3 tablolarıyla karşılaştır (özellikle
   90.016 / 27.275 / 7.800 / 134 / 72 / $132,9M / $67,8M / 8.012↔7.800). Fark varsa nedenini
   bul (SVC tanımı? kritiklik string eşleşmesi? tampon?) — düzeltmeden önce raporla.
3. Formülleri Bölüm 4 ile hizala; sabitleri config/parametreye taşı (4.1 tablosu).
4. Demo akışını (6.1) dashboard'a eşle; eksik ekranları listele (özellikle stres testi
   düğmesi, sermaye kokpiti, kabiliyet ROI, slider bant modu).
5. Tahmin algoritmasını segmentasyonla değerlendir: kesikli çoğunlukta (medyan 11/yıl) hangi
   yöntem koşuyor; Croston/SBA + Poisson emniyet stoğu ile kıyas öner.
6. Türkçe UI metinleri ve sentetik-veri etiketlerini kontrol et.

**Çalışma prensipleri:** her gömülü sayı script'le doğrulanır; uploaded veri > basılı case;
anomali gizlenmez raporlanır; nokta tahmin yerine bant; parametre > sabit; token/efor
verimliliği (gereksiz yeniden okuma yok); kullanıcı Türkçe/İngilizce karışık yazar, çıktılar
Türkçe.
