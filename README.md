# Filo Büyür, Envanter Hazır Mı? — Komponent Envanter Yönetimi 2033

Turkish Technic'in komponent hizmet kapasitesi 10 yılda **1.200 → 2.000 uçağa** (%67) çıkarken
envanterin verimli, öngörülebilir ve ölçeklenebilir yönetimi için geliştirilen **veri temelli karar destek prototipi**.

Talep tahmini (istatistiksel + derin öğrenme hibriti) → filo-ölçekli 2033 projeksiyonu →
kritiklik bazlı min-max → AOG risk skoru → gerçek stokla açık/fazla analizi → kriz senaryo simülatörü.

## Kurulum

```bash
# 1) Sanal ortam oluştur
python3 -m venv venv

# 2) Etkinleştir
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# 3) Bağımlılıkları yükle
pip install -r requirements.txt
```

## Çalıştırma

```bash
# Talep tahmini + 2033 projeksiyonu + min-max + AOG risk skoru
python3 analysis.py

# Envanter durumu analizi (açık / fazla / atıl sermaye)
python3 inv_analysis.py

# Control Tower metrikleri (control_tower.html için veri)
python3 ct_data.py

# Derin öğrenme modelini eğit (TensorFlow/Keras) -> demand_model.keras
python3 train_demand_model.py
```

> Sıra önemli: `analysis.py` → `inv_analysis.py` → `ct_data.py` (her biri bir öncekinin çıktısını kullanır).

Dashboard için `envanter_2033_dashboard.html` dosyasını tarayıcıda aç — tüm veri içine gömülü,
internet gerektirmez.

## Dosyalar

| Dosya | Açıklama |
|---|---|
| `dummy_pn_quarterly_data.csv` | 5.000 PN × 4 çeyrek talep/scrap/TAT verisi (girdi) |
| `dummy_pn_inventory_status.csv` | PN bazında güncel stok durumu ve maliyet (girdi) |
| `fleet_distribution.csv` | 14 model için 2025→2033 filo projeksiyonu (girdi) |
| `analysis.py` | SBA talep tahmini, 2033 ölçekleme, min-max, risk skoru |
| `inv_analysis.py` | Gerçek stok vs önerilen plan; açık/fazla/atıl sermaye |
| `train_demand_model.py` | MLP + Poisson hibrit model eğitimi |
| `demand_model.keras` | Eğitilmiş model |
| `model_deney_notlari.md` | Denenen mimariler ve sonuçları |
| `ct_data.py` | Control Tower metrikleri (readiness, days-to-shortage, XAI, aksiyon, güven aralığı) |
| `control_tower.html` | **Inventory Readiness Control Tower** — ana interaktif dashboard (8 modül) |
| `envanter_2033_dashboard.html` | Analitik dashboard (talep tahmini + envanter + kriz simülatörü) |
| `pn_2033_envanter_plani.csv` | PN bazında 2033 envanter planı (çıktı) |
| `pn_full_with_inventory.csv` | Plan + gerçek stok birleşik tablo (çıktı) |

## Yöntem özeti

Çeyreklik talep → Syntetos-Boylan (SBA) kesikli talep tahmini → THY/POOL filo büyüme katsayılarıyla
2033'e ölçekleme → lead time (atölye kabiliyetine göre yurtiçi TAT ya da min(yurtdışı, satınalma)) ve
kritiklik bazlı servis hedefi (%98 / %95 / %90) ile Poisson emniyet stoğu → min-max önerisi.
Derin öğrenme: λ = istatistiksel baseline × e^(NN düzeltmesi), MLP (128-64-32), Poisson loss.

Referans: Sezenoğlu Çetin vd., *Data-Driven Predictive Maintenance for Aircraft Components Through
Sparse Event Logs*, Aerospace 2026, 13, 110.
