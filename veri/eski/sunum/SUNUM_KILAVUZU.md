# Sunum Kılavuzu — Catalyst (6 dk demo + 8 dk slayt)

> Sunucu için tıklama-tıklama akış. Dashboard: `catalyst.html` (çift tıkla açılır,
> internet gerekmez). Slaytlar: `Grup9_Catalyst.pptx` — RESMİ ŞABLON üzerine, 7 slayt
> limitinde, konuşmacı notları içinde.
> Jüriye dağıtılacak: `catalyst_el_notu.pdf` (2 sayfa).

## Sunum sırası önerisi (resmi 7 slayt)
S1 kapak → S2 problem+boşluk → S3 çözüm akışı → S4 prototip → **CANLI DEMO** →
S5 öngörü motoru+Copilot → S6 önceliklendirme·kriz·başarı → S7 kapanış+riskler. Demo ortada: jüri uyanıkken.

## Resmi jüri soruları → slayt eşlemesi
Organizatörün yedi sorusu sunumda dolaylı olarak yanıtlanır; sorulursa ilgili slayta dönülür.

| Resmi soru | Nerede yanıtlanıyor |
|---|---|
| Problemi nasıl tanımlıyorsunuz? | S2: büyüme değil yer değiştirme, 72/134, ayrık sistem, hub kayması |
| Neden önemli? | S2 sağ paneller: 11 parça uçağı yerde bırakır, elle denge 2.000 uçakta tutmaz; S6: yerde bekleyen uçağın her saati gelir kaybı |
| Çözüm nasıl çalışıyor? | S3 altı adım + üç faz; S4 canlı prototip; S5 tahmin motoru |
| Hangi değer ve fayda? | S6 sol sütun + üç grafik: 67,8 / 23,3→39 / 52 M$, kabiliyet 12,1 M$/yıl, 72→0 |
| Gerçek hayatta nasıl uygulanır? | S3 salt okunur bağlantı + FAZ bandı: ölçüt kapılı fazlı geçiş; tek dosyalık çalışan prototip kanıt |
| Uygulama riskleri? | S7 "Riskler ve karşılıkları" paneli: veri kalitesi, model hatası, benimseme, entegrasyon |
| Gelecekte nasıl gelişir? | S3 vizyon şeridi: acil getirim, bekleme penceresi bakımı, parça değişimi; S5 Copilot ve geri bildirim döngüsü |

## Canlı demo — tıklama planı

| # | Ekran | Yapılacak | Söylenecek tek cümle |
|---|---|---|---|
| 1 | **Karar Merkezi** (açılışta gelir) | Dört KPI karosunu ve "Karar yönlendirici" bloğunu göster; henüz TIKLAMA | "5.000 parça tek kural dizisinden geçiyor ve her biri tek kanala düşüyor: 694 havuz, 641 tamir, 217 satın alma, 3.448 izleme. Bu, 'hepsini stokla' yerine parça başına en hızlı yolu seçmek demek." |
| 2 | Karar Merkezi → **Sipariş penceresi alarmı** | Sağdaki 42'lik alarm listesini göster, ilk satıra tıkla (watchlist parça detayı açılır) | "Kalan gün = dayanma süresi eksi tedarik süresi. Bu 42 parçada sipariş çoktan açılmış olmalıydı ve hâlâ açılmadı. Satıra tıklıyorum: ne yapılacağı süre ve maliyetle sıralı." |
| 2b | PN detayında **Önerilen aksiyon** kartı | "Stok yetmeme riski %A → %B" üçlüsünü göster; hedef istasyonu seç, **Haritada incele**'ye bas | "Sistem tek kanal öneriyor ve etkisini söylüyor: bu aksiyonla yetmeme riski %A'dan %B'ye iner. Öneri, alttaki merdivenin vurgulu satırıyla aynı — iki ekran çelişemez." |
| 3 | PN detayında **canlı stok yeterlilik seviyesi** | Eğrideki iki işareti göster (mevcut stok / önerilen MIN) | "Dikey eksen, o stok seviyesiyle tedarik süresi boyunca gelen talebin karşılanma olasılığı. Talep verisi Poisson üretimli; eğri simülasyonun kapalı form eşdeğeri — servis hedefine kaç adetle çıkılır, buradan okunur." |
| 4 | **Öngörü & AI** sekmesi | Cold-start kaydırıcısını 0→4 sürükle | "Yeni nesil parçanın geçmişi yok: benzerlerinden başlıyoruz, dört gözlemde tahmin gerçeğe iniyor." |
| 5 | Aynı sekmede **geriye dönük test** kartı | Bar grafiği göster | "Görmediği çeyreğin toplamını binde dört hatayla bildi — mevsim katsayısı bütçe düzeyinde çalışır, parça düzeyinde Croston/SBA." |
| 6 | **Harita** sekmesi | 🌐 Küresel ağ'a geç; sonra 🗺 Türkiye'ye dön; "Kriz katmanı"nı aç | "16 yurt içi nokta + 9 dış hub; kırılım temsili — üründe istasyon etiketli kayıttan gelir. Kriz katmanı Senaryo ile bağlı." |
| 7 | **Senaryo** sekmesi | "Motor ailesi krizi" düğmesi | "Tek tıkta 5.000 parça yeniden hesaplandı: kırmızı 134→477. Altta belirsizlik denemeleri aynı senaryoda 797 parça / 39,3 M$ diyor — ve kötü giden onda birinde fatura 41,9 M$." |
| 8 | Aynı sekmede **Model parametreleri** | AOG ağırlığını 3→5 çek; top-10 değişimini göster | "Ağırlık neden 3 diye sorarsanız: siz söyleyin — liste gözünüzün önünde yeniden sıralanır. Sayılar gömülü değil, hesaplanıyor." |
| 9 | Sayfa sonu **Kabiliyet ROI** | Tabloya in | "Kapanış: 547 parçalık atölye yatırımı yılda 12,1 M$ getiriyor." |

## Acil durum planları
- **Dashboard açılmazsa:** USB'deki kopya + herhangi bir tarayıcı; internet gerekmez.
  Yedek: `uv run build_dashboard.py` 5 sn'de dosyayı yeniden üretir.
- **Süre daralırsa:** 3, 5 ve 6. adımlar atlanır; 1→2→7→8→9 çekirdek akıştır (3,5 dk).
- **Jüri sayı sorgularsa:** her sayının kaynağı `CLAUDE.md` §3; `core.py` tek doğruluk
  kaynağı; `node smoke_test.js` 40+ kontrolü canlı koşturur.
- **"12,2 mi 12,1 mi?"** — dokümandaki 12,2 yuvarlama hatasıydı; formülün gerçek sonucu
  12.109.021 $ → 12,1 M$. Düzeltme notu CLAUDE.md §9'da.

## Sayı ezber kartı (cepte dursun)
90.016 → +%63–68 · göç %34→%65 · kırmızı **134/72/11** · kapatma 0,7 M$ ·
musluklar **67,8 / 23,3→39,0 / 52,0 M$** · float %97 (8.012↔7.800) · 547 liste → **12,1 M$/yıl + 4,0 M$** ·
backtest %0,4 · formül↔deneme uyumu %99,5 · motor krizi 134→477.
