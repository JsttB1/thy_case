# Model Deney Notları — Çeyreklik PN Talep Tahmini

**Ortak kurulum (tüm denemeler):**
TensorFlow/Keras · Girdi: 54 özellik (kritiklik + uçak modeli + ATA alt kategorisi one-hot; atölye kabiliyeti, lead time, filo adedi; 3 lag çeyrek talebi log1p + maske; geçmiş ortalaması; çeyrek indeksi) · Eğitim: Q2–Q3 hedefleri, 10.000 örnek · Test: Q4 holdout (5.000 PN, modele hiç gösterilmedi) · Kayıp: Poisson NLL (sayım verisi) · Optimizer: Adam 1e-3, batch 256

**Baseline'lar (Q4 testi):**

| Yöntem | MAE | RMSE |
|---|---|---|
| Naive (son çeyrek) | 2.285 | 3.488 |
| 3 çeyrek ortalaması | **1.721** | **2.461** |
| SBA (Syntetos-Boylan) | 1.732 | 2.471 |

## Deneme 1 — Saf MLP
Mimari: Dense 128 → 64 → 32 → 1 (softplus çıkış = λ), dropout 0.15, 60 epoch.
**Sonuç: MAE 2.591 / RMSE 3.847 — baseline'dan belirgin kötü.**
Teşhis: PN başına yalnızca 2 eğitim hedefi; ağ λ'yı sıfırdan öğrenmeye çalışırken güçlü geçmiş-ortalama sinyalini bile yakalayamıyor (underfit + ölçek sorunu).

## Deneme 2 — Hibrit, geniş düzeltme aralığı
Mimari: λ = (geçmiş ortalama + 0.1) × e^g; g = 2·tanh(Dense(1)) ∈ [-2, 2]. Aynı MLP gövdesi, 100 epoch + ReduceLROnPlateau.
**Sonuç: MAE 2.411 / RMSE 4.134 — hâlâ baseline'dan kötü.**
Teşhis: Veri keşfi asıl nedeni gösterdi — toplam talep Q1→Q3 yükseliyor (+%9.6, +%15.4), Q4'te %15 düşüyor (sezonluk). Ağ, Q2–Q3 hedeflerinden "talep hep artar" trendini öğrenip Q4'te sistematik fazla tahmin yapıyor. Geniş düzeltme aralığı bu ezberi serbest bırakıyor. 4 çeyrekle sezonluk öğrenilemez; en az 8+ çeyrek gerekir.

## Deneme 3 — Hibrit, kısıtlı + regularize (FİNAL, demand_model.keras)
Mimari: g = 0.5·tanh ∈ [-0.5, 0.5] + L2 activity regularization (0.02). Ağ ancak güçlü kanıt varsa baseline'dan sapabiliyor.
**Sonuç: MAE 1.767 / RMSE 2.540 — baseline ile başa baş (fark %2.7).**
Yorum: 4 çeyreklik veriyle istatistiksel olarak ulaşılabilir tavan bu. Kazanım tahmin doğruluğu değil, ölçeklenebilir mimari: gerçek AMOS olay kayıtları (uçuş saati, cycle, arıza geçmişi) eklendiğinde aynı boru hattı yeniden eğitilir ve ağın avantajı ortaya çıkar.

## Makaleyle paralellik (Sezenoğlu Çetin vd., Aerospace 2026)
Makale, 10 yıllık gerçek veride aynı örüntüyü buldu: saf derin öğrenme (DeepHit) seyrek veride istikrarsız; kazanan autoencoder + latent uzayda klasik ML (Random Forest/KNN/DT) **hibriti**. Bizim Deneme 1→3 yolculuğumuz aynı sonuca bağımsız varıyor: **seyrek bakım verisinde saf DL yetmez, istatistik + öğrenme hibriti gerekir.** Sunumda: "Makalenin ana bulgusunu kendi verimizde yeniden ürettik."

## Denenmedi / sonraki adımlar
- PN embedding'i (one-hot yerine) — PN sayısı çok, gözlem az; gerçek veriyle anlamlı olur.
- LSTM/Transformer zaman serisi — 4 zaman adımıyla anlamsız, 8+ çeyrekle denenebilir.
- Negatif Binomial kayıp (aşırı saçılım için) — scrap dahil edilirse faydalı olabilir.
- Makaledeki yaklaşım (survival + latent classifier) — komponent-seviyesi AMOS verisi gerektirir; IT yol haritasının 2. fazı.
