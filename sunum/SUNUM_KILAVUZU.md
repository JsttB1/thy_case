# Sunum Kılavuzu — Kontrol Kulesi (6 dk demo + 8 dk slayt)

> Sunucu için tıklama-tıklama akış. Dashboard: `kontrol_kulesi.html` (çift tıkla açılır,
> internet gerekmez). Slaytlar: `Grup3_Komponent_Kontrol_Kulesi.pptx` — RESMİ ŞABLON üzerine, 7 slayt limitinde, konuşmacı notları içinde. (`kontrol_kulesi_sunum.pptx` 11 slaytlık geniş yedektir.)
> Jüriye dağıtılacak: `kontrol_kulesi_el_notu.pdf` (2 sayfa).

## Sunum sırası önerisi (resmi 7 slayt)
S1 kapak → S2 problem+boşluk → S3 çözüm akışı → S4 prototip → **CANLI DEMO** →
S5 yapay zekâ+doğrulama → S6 önceliklendirme·kriz·başarı → S7 kapanış. Demo ortada: jüri uyanıkken.

## Canlı demo — tıklama planı

| # | Ekran | Yapılacak | Söylenecek tek cümle |
|---|---|---|---|
| 1 | **Kokpit** (açılışta gelir) | Kırmızı vurgu kartını göster; "Listeyi aç →" düğmesine BASMA (sonraki adım) | "132,9 M$ envanterin fotoğrafı bu; asıl bulgu şu kart: 72 parça kırmızıda ve siparişi yok — süreç kendi alarmını göremiyor." |
| 2 | Kokpit → vurgu kartındaki **"Listeyi aç →"** | Watchlist siparişsiz filtreli açılır; ilk satıra tıkla (PN-101741) | "Risk skorumuzun 1 numarası — ve gerçek stok verisinde fiilen kırmızı. Sağda: bu parça için ne yapılır, süre+maliyetle sıralı." |
| 3 | PN detayında **stok-out eğrisi** | Eğrideki iki işareti göster (mevcut stok / önerilen MIN) | "Talep verisi Poisson üretimli; eğri Monte Carlo'nun kapalı form eşdeğeri — servis hedefine kaç adetle çıkılır, buradan okunur." |
| 4 | **Öngörü & AI** sekmesi | Cold-start kaydırıcısını 0→4 sürükle | "Yeni nesil parçanın geçmişi yok: benzerlerinden başlıyoruz, dört gözlemde tahmin ×4 sapmadan gerçeğe iniyor." |
| 5 | Aynı sekmede **geriye dönük test** kartı | Bar grafiği göster | "Görmediği çeyreğin toplamını binde dört hatayla bildi — mevsim katsayısı bütçe düzeyinde çalışır, parça düzeyinde Croston/SBA." |
| 6 | **Harita** sekmesi | 🌐 Küresel ağ'a geç; sonra 🗺 Türkiye'ye dön; "Kriz katmanı"nı aç | "16 yurt içi nokta + 9 dış hub; kırılım temsili — üründe istasyon etiketli kayıttan gelir. Kriz katmanı Senaryo ile bağlı." |
| 7 | **Senaryo** sekmesi | "Motor ailesi krizi" düğmesi | "Tek tıkta 5.000 parça yeniden hesaplandı: kırmızı 134→477. Monte Carlo aynı senaryoda 796 parça / 39,4 M$ diyor." |
| 8 | Aynı sekmede **Canlı parametreler** | AOG ağırlığını 3→5 çek; top-10 değişimini göster | "Ağırlık neden 3 diye sorarsanız: siz söyleyin — liste gözünüzün önünde yeniden sıralanır. Sayılar gömülü değil, hesaplanıyor." |
| 9 | Sayfa sonu **Kabiliyet ROI** | Tabloya in | "Kapanış: 547 parçalık atölye yatırımı 12,1 M$/yıl getiriyor — yazılım ekranı değil, yatırım kararı sunuyoruz." |

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
backtest %0,4 · Monte Carlo uyum %99,5 · motor krizi 134→477.
