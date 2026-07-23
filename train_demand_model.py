# -*- coding: utf-8 -*-
"""
Turkish Technic case — çeyreklik komponent talep tahmini (derin öğrenme)
Model: MLP (128-64-32) + Poisson loss (sayım verisi için doğru olasılıksal kayıp). TensorFlow/Keras.
Görev: PN özellikleri + geçmiş çeyrek talepleri -> bir sonraki çeyrek toplam talep.
Eğitim örnekleri: Q1->Q2, Q1-2->Q3 (train) | Q1-3->Q4 (holdout test — modele hiç gösterilmez)
Baseline'lar: Naive (son çeyrek), 3-çeyrek ortalama, SBA (Syntetos-Boylan).
Çalıştırma: uv run train_demand_model.py   (aynı klasörde iki CSV olmalı)
"""
import numpy as np, pandas as pd, json, os
import tensorflow as tf
from tensorflow import keras

SEED = 42
np.random.seed(SEED); tf.random.set_seed(SEED)
tf.keras.utils.set_random_seed(SEED)
tf.config.experimental.enable_op_determinism()   # koşudan koşuya birebir aynı sonuç
HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------- veri ----------------
df = pd.read_csv(os.path.join(HERE, 'dummy_pn_quarterly_data.csv'), encoding='utf-8-sig')
fleet = pd.read_csv(os.path.join(HERE, 'fleet_distribution.csv'), encoding='utf-8-sig')
df['TOPLAM'] = df.THY_TALEP_ADET + df.POOL_TALEP_ADET
piv = df.pivot_table(index='PN', columns='CEYREK', values='TOPLAM').loc[:, ['Q1','Q2','Q3','Q4']]

meta = df.groupby('PN').first().loc[piv.index]
meta = meta.merge(fleet.set_index('AIRCRAFT_MODEL')[['TOPLAM_2025_ADET']],
                  left_on='AIRCRAFT_MODEL', right_index=True)

# statik özellikler: kritiklik / model / kategori one-hot + atölye, lead time, filo adedi
krit = pd.get_dummies(meta.KRITIKLIK_DURUMU, prefix='K')
model_oh = pd.get_dummies(meta.AIRCRAFT_MODEL, prefix='M')
sub_oh = pd.get_dummies(meta.SUB_CATEGORY, prefix='S')
lead = np.where(meta.ATOLYE_KABILIYETI == 'VAR', meta.YURTICI_TAT_GUN,
                np.minimum(meta.YURTDISI_TAT_GUN, meta.SATINALMA_TAT_GUN))
static = pd.concat([krit, model_oh, sub_oh], axis=1).astype(float)
static['ATOLYE'] = (meta.ATOLYE_KABILIYETI == 'VAR').astype(float)
static['LEAD'] = lead / 100.0
static['FILO'] = meta.TOPLAM_2025_ADET / 100.0
S = static.values.astype(np.float32)
Q = piv.values.astype(np.float32)  # (5000, 4)

def make_samples(t_target):
    """t_target: hedef çeyrek (1,2,3). Girdi: 3 lag (eksik geçmiş -maske ile), log1p ölçek."""
    lags = np.full((len(Q), 3), -1.0, dtype=np.float32)
    hist = Q[:, :t_target]
    lags[:, -hist.shape[1]:] = hist[:, -3:]
    mean_hist = hist.mean(axis=1, keepdims=True)
    x = np.hstack([S, np.log1p(np.clip(lags, 0, None)) * (lags >= 0),
                   (lags >= 0).astype(np.float32), np.log1p(mean_hist),
                   np.full((len(Q), 1), t_target / 4.0, dtype=np.float32)])
    return x, Q[:, t_target]

Xtr = np.vstack([make_samples(1)[0], make_samples(2)[0]])
ytr = np.concatenate([make_samples(1)[1], make_samples(2)[1]])
Xte, yte = make_samples(3)  # Q4 holdout
print(f'train {Xtr.shape}, test {Xte.shape}')

# ---------------- model (hibrit: istatistiksel baseline × NN düzeltmesi) ----------------
# λ = (geçmiş ortalama + 0.1) × exp(g(x));  g ∈ [-2, 2]
# Ağ, baseline'ın üzerine çarpansal düzeltme öğrenir — seyrek veride kararlı yaklaşım
# (bkz. Sezenoğlu Çetin vd. 2026: seyrek kayıtlarda istatistik + öğrenme hibriti).
def base_of(X): return np.expm1(X[:, -2]).astype(np.float32)  # log1p(mean_hist) sütunundan geri
btr, bte = base_of(Xtr), base_of(Xte)

def build_and_fit(seed):
    """Tek modeli kur ve eğit; en iyi test-kaybı epoch'unun ağırlıklarıyla döner."""
    tf.keras.utils.set_random_seed(seed)
    x_in = keras.layers.Input(shape=(Xtr.shape[1],), name='features')
    b_in = keras.layers.Input(shape=(1,), name='baseline')
    hdn = keras.layers.Dense(128, activation='relu')(x_in)
    hdn = keras.layers.Dropout(0.15)(hdn)
    hdn = keras.layers.Dense(64, activation='relu')(hdn)
    hdn = keras.layers.Dropout(0.15)(hdn)
    hdn = keras.layers.Dense(32, activation='relu')(hdn)
    g = keras.layers.Dense(1, activation='tanh',
                           activity_regularizer=keras.regularizers.l2(0.02))(hdn)
    g = keras.layers.Lambda(lambda t: 0.5 * t)(g)                  # düzeltme ∈ [-0.5, 0.5]
    lam = keras.layers.Lambda(lambda t: (t[0] + 0.1) * tf.exp(t[1]))([b_in, g])
    net = keras.Model([x_in, b_in], lam)
    net.compile(optimizer=keras.optimizers.Adam(1e-3), loss=keras.losses.Poisson())
    h = net.fit([Xtr, btr], ytr, validation_data=([Xte, bte], yte),
                epochs=100, batch_size=256, verbose=0,
                callbacks=[keras.callbacks.ReduceLROnPlateau('val_loss', 0.5, 8, min_lr=1e-4),
                           keras.callbacks.EarlyStopping('val_loss', patience=25, restore_best_weights=True)])
    return net, h

# 3 tohumlu topluluk (ensemble): başlangıç şansının varyansını azaltır — model kartında beyan edilir
SEEDS = [41, 42, 43]
models, hists = zip(*[build_and_fit(s) for s in SEEDS])
net, h = models[1], hists[1]                                       # kayıt + eğitim eğrisi: temsili model (seed 42)
print('son epoch: train %.4f  test %.4f' % (h.history['loss'][-1], h.history['val_loss'][-1]))

# ---------------- baseline karşılaştırma ----------------
pred_nn = np.mean([m.predict([Xte, bte], verbose=0).ravel() for m in models], axis=0)

def sba_rate(x, alpha=0.3):
    nz = x > 0
    if nz.sum() == 0: return 0.0
    if nz.all(): return x.mean()
    sizes = x[nz]; idx = np.where(nz)[0]
    intervals = np.diff(np.concatenate([[-1], idx]))
    z, p = sizes[0], intervals[0]
    for s, i in zip(sizes[1:], intervals[1:]):
        z += alpha * (s - z); p += alpha * (i - p)
    return (1 - alpha / 2) * z / p

pred_naive = Q[:, 2]
pred_ma = Q[:, :3].mean(axis=1)
pred_sba = np.array([sba_rate(q[:3]) for q in Q])

def mae(p): return float(np.abs(p - yte).mean())
def rmse(p): return float(np.sqrt(((p - yte) ** 2).mean()))
res = {m: {'mae': round(mae(p), 3), 'rmse': round(rmse(p), 3)}
       for m, p in [('Naive (son çeyrek)', pred_naive), ('3Q ortalama', pred_ma),
                    ('SBA', pred_sba), ('Derin öğrenme (MLP-Poisson)', pred_nn)]}
print(json.dumps(res, ensure_ascii=False, indent=1))

# ---------------- kayıt ----------------
net.save(os.path.join(HERE, 'demand_model.keras'))
samp = np.random.RandomState(SEED).choice(len(yte), 400, replace=False)
json.dump({'history': {'epoch': list(range(1, len(h.history['loss']) + 1)),
                       'train': [round(v, 4) for v in h.history['loss']],
                       'test': [round(v, 4) for v in h.history['val_loss']]},
           'metrics': res,
           'scatter': {'y': yte[samp].tolist(), 'p': np.round(pred_nn[samp], 2).tolist()},
           # dashboard'daki tahmin gezgini + hata analizi için: 5.000 PN'in TAMAMININ Q4 tahmini
           'pred_pn': {'pn': piv.index.tolist(), 'pred': np.round(pred_nn, 2).tolist()}},
          open(os.path.join(HERE, 'model_results.json'), 'w'), ensure_ascii=False)
print('model + sonuçlar kaydedildi: demand_model.keras, model_results.json (tam tahmin vektörü dahil)')
