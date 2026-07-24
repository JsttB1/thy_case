# -*- coding: utf-8 -*-
"""
Catalyst — tek doğruluk kaynağı (single source of truth).

Üç resmi CSV'yi okur, CLAUDE.md Bölüm 3'teki TÜM doğrulanmış metrikleri ve
Bölüm 4'teki formülleri birebir üretir. Dashboard, analiz script'leri ve
senaryo motoru aynı çekirdeği kullanır — demo maket değildir.

Bağımlılık: yalnızca pandas + numpy (TensorFlow sadece train_demand_model.py için).
"""
from __future__ import annotations
import os
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- parametreler
# CLAUDE.md 4.1 — hepsi ayarlanabilir; jüri önünde canlı değiştirilebilir olmalı.
PARAMS = dict(
    krit_agirlik={'AOG KRİTİK': 3.0, 'KRİTİK': 2.0, 'KRİTİK DEĞİL': 1.0},   # risk skoru
    servis_hedefi={'AOG KRİTİK': 0.98, 'KRİTİK': 0.95, 'KRİTİK DEĞİL': 0.90},
    ber_esigi=0.65,             # dış tamir maliyeti / CLP
    ic_dis_oran=0.64,           # kabiliyeti olmayan PN'ler için iç maliyet tahmini
    kabiliyet_hedef_tat=9,      # gün — VAR olan PN'lerin ortalaması
    alarm_tamponu=0,            # gün — TTS < TTR + tampon
    sba_alpha=0.3,
    ceyrek_gun=91.25,
)

# Model grupları (CLAUDE.md 2.2)
YENI_NESIL = ['A320neo', 'A321neo', '737 MAX 8', 'A350-900', '787-9']
KUCULEN = ['737-800', 'A320-200', 'A321-200', 'A319-100']
WIDEBODY = ['A330-200', 'A330-300', 'A350-900', '777-300ER', '777-F', '787-9']

# Basılı case'in istasyon tablosu — CSV'lerde YOK, haritada "temsili dağıtım" etiketiyle
# kullanılır (CLAUDE.md 1.3 + 9). Kontrol toplamı: 1.200 → 2.000 uçak. Bu 5 satır TEK resmi
# kaynaktır; aşağıdaki havalimanı seti bu satırların ağırlıkla açılmış temsilidir.
ISTASYONLAR = [
    # (kod, ad, 2025 uçak, 2033 uçak)
    ('IST', 'İstanbul (ana üs)',      540, 820),
    ('ESB', 'Ankara Esenboğa',        180, 310),
    ('ADB', 'İzmir Adnan Menderes',   110, 200),
    ('INT', 'Uluslararası hub\'lar',  190, 380),
    ('TR',  'Diğer yurt içi',         180, 290),
]

# Havalimanı seti — case'in 5 grubunun bilinen ağ noktalarına AĞIRLIKLA açılmış hâli.
# Ağırlıklar grup içinde 1,0'a toplanır; uçak sayıları en-büyük-kalan yöntemiyle tam sayıya
# çevrilir ki her grubun toplamı case tablosuyla BİREBİR tutsun (test edilir).
# (kod, ad, grup, grup içi ağırlık, enlem, boylam)
HAVALIMANLARI = [
    # İstanbul kümesi (IST 540→820)
    ('IST', 'İstanbul Havalimanı',        'IST', 0.62, 41.28, 28.75),
    ('SAW', 'İstanbul Sabiha Gökçen',     'IST', 0.38, 40.90, 29.31),
    # Ana üsler
    ('ESB', 'Ankara Esenboğa',            'ESB', 1.00, 40.13, 32.99),
    ('ADB', 'İzmir Adnan Menderes',       'ADB', 1.00, 38.29, 27.16),
    # Diğer yurt içi (TR 180→290)
    ('AYT', 'Antalya',                    'TR', 0.17, 36.90, 30.79),
    ('ADA', 'Adana Şakirpaşa',            'TR', 0.11, 36.98, 35.28),
    ('TZX', 'Trabzon',                    'TR', 0.10, 40.99, 39.79),
    ('GZT', 'Gaziantep',                  'TR', 0.09, 36.95, 37.47),
    ('DLM', 'Dalaman',                    'TR', 0.08, 36.71, 28.79),
    ('BJV', 'Bodrum-Milas',               'TR', 0.07, 37.25, 27.66),
    ('ASR', 'Kayseri Erkilet',            'TR', 0.07, 38.77, 35.49),
    ('DIY', 'Diyarbakır',                 'TR', 0.07, 37.89, 40.20),
    ('ERZ', 'Erzurum',                    'TR', 0.06, 39.95, 41.17),
    ('VAN', 'Van Ferit Melen',            'TR', 0.06, 38.47, 43.33),
    ('SZF', 'Samsun Çarşamba',            'TR', 0.06, 41.26, 36.55),
    ('HTY', 'Hatay',                      'TR', 0.06, 36.36, 36.28),
    # Uluslararası hub'lar (INT 190→380) — pool ortakları / dış tamir istasyonları
    ('FRA', 'Frankfurt',                  'INT', 0.16, 50.03,   8.57),
    ('LHR', 'Londra Heathrow',            'INT', 0.13, 51.47,  -0.45),
    ('CDG', 'Paris Charles de Gaulle',    'INT', 0.12, 49.01,   2.55),
    ('DXB', 'Dubai',                      'INT', 0.12, 25.25,  55.36),
    ('AMS', 'Amsterdam Schiphol',         'INT', 0.10, 52.31,   4.76),
    ('JFK', 'New York JFK',               'INT', 0.10, 40.64, -73.78),
    ('JED', 'Cidde',                      'INT', 0.10, 21.68,  39.16),
    ('BER', 'Berlin Brandenburg',         'INT', 0.09, 52.36,  13.50),
    ('SIN', 'Singapur Changi',            'INT', 0.08,  1.36, 103.99),
]


def _en_buyuk_kalan(agirliklar, toplam):
    """Ağırlıkları tam sayılara böler; toplamı KESİN korur (en-büyük-kalan yöntemi)."""
    ham = [w * toplam for w in agirliklar]
    tam = [int(v) for v in ham]
    eksik = toplam - sum(tam)
    sira = sorted(range(len(ham)), key=lambda i: ham[i] - tam[i], reverse=True)
    for i in sira[:eksik]:
        tam[i] += 1
    return tam


def havalimani_tablosu():
    """Havalimanı başına uçak sayıları (2025/2033) — grup toplamları case tablosuyla birebir."""
    import math
    gr = {k: (u25, u33) for k, _, u25, u33 in ISTASYONLAR}
    rows = []
    for grup in gr:
        uyeler = [h for h in HAVALIMANLARI if h[2] == grup]
        w = [h[3] for h in uyeler]
        assert abs(sum(w) - 1.0) < 1e-9, f'{grup} ağırlık toplamı 1 değil: {sum(w)}'
        u25 = _en_buyuk_kalan(w, gr[grup][0])
        u33 = _en_buyuk_kalan(w, gr[grup][1])
        for h, a, b in zip(uyeler, u25, u33):
            rows.append(dict(kod=h[0], ad=h[1], grup=grup, lat=h[4], lon=h[5], u25=a, u33=b))
    # İstanbul'a (İstanbul Havalimanı) uzaklık ve yön — küresel ağ görünümü için
    lat0, lon0 = math.radians(41.28), math.radians(28.75)
    for r_ in rows:
        la, lo = math.radians(r_['lat']), math.radians(r_['lon'])
        dlat, dlon = la - lat0, lo - lon0
        a = math.sin(dlat/2)**2 + math.cos(lat0)*math.cos(la)*math.sin(dlon/2)**2
        r_['dist_km'] = round(6371 * 2 * math.asin(min(1, math.sqrt(a))))
        y = math.sin(dlon)*math.cos(la)
        x = math.cos(lat0)*math.sin(la) - math.sin(lat0)*math.cos(la)*math.cos(dlon)
        r_['bearing'] = round(math.degrees(math.atan2(y, x)) % 360, 1)
        r_['yurtdisi'] = r_['grup'] == 'INT'
    return rows


# ------------------------------------------------------------------ yardımcılar
def sba_rate(x: np.ndarray, alpha: float = None) -> float:
    """Syntetos-Boylan Approximation — kesikli (intermittent) talep için çeyreklik oran."""
    alpha = PARAMS['sba_alpha'] if alpha is None else alpha
    nz = x > 0
    if nz.sum() == 0:
        return 0.0
    if nz.all():
        return float(x.mean())
    sizes, idx = x[nz], np.where(nz)[0]
    intervals = np.diff(np.concatenate([[-1], idx]))
    z, p = sizes[0], intervals[0]
    for s, i in zip(sizes[1:], intervals[1:]):
        z += alpha * (s - z)
        p += alpha * (i - p)
    return float((1 - alpha / 2) * z / p)


def poisson_emniyet_stogu(mu: np.ndarray, h: np.ndarray, kesikli_esik: float = 100.0) -> np.ndarray:
    """
    Servis hedefli emniyet stoğu (CLAUDE.md 4).
    Kesikli/düşük hacim → tam Poisson kuantili: s* = min{s : P(X<=s) >= h}.
    Yüksek hacim (mu > eşik) → normal yaklaşım z*sqrt(mu) (Poisson CDF underflow eder).
    """
    mu = np.asarray(mu, dtype=float)
    h = np.asarray(h, dtype=float)
    out = np.zeros(len(mu))

    # yüksek hacim: normal yaklaşım
    hi = mu > kesikli_esik
    if hi.any():
        # h -> z (ters normal CDF, Acklam yaklaşımı yerine tablo yeterli hassasiyette)
        z = np.interp(h[hi], [0.90, 0.95, 0.98], [1.2816, 1.6449, 2.0537])
        out[hi] = np.ceil(z * np.sqrt(mu[hi]))

    lo = ~hi
    if lo.any():
        m, hh = mu[lo], h[lo]
        term = np.exp(-m)          # P(X=0)
        cdf = term.copy()
        s = np.zeros(len(m))
        done = cdf >= hh
        k = 0
        while not done.all() and k < 5000:
            k += 1
            term = term * m / k
            cdf = cdf + term
            s = np.where(done, s, k)
            done = cdf >= hh
        # emniyet stoğu = kuantil - beklenen talep (negatifse 0)
        out[lo] = np.maximum(0.0, s - m)
    return out


# --------------------------------------------------------------------- yükleme
def load(data_dir: str = HERE):
    q = pd.read_csv(os.path.join(data_dir, 'dummy_pn_quarterly_data.csv'), encoding='utf-8-sig')
    fleet = pd.read_csv(os.path.join(data_dir, 'fleet_distribution.csv'), encoding='utf-8-sig')
    inv = pd.read_csv(os.path.join(data_dir, 'dummy_pn_inventory_status.csv'), encoding='utf-8-sig')
    return q, fleet, inv


def build(data_dir: str = HERE, params: dict = None) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """PN bazında birleşik çekirdek tabloyu üretir. Dönen: (core, fleet, meta)."""
    P = {**PARAMS, **(params or {})}
    q, fleet, inv = load(data_dir)

    q['TOPLAM'] = q.THY_TALEP_ADET + q.POOL_TALEP_ADET
    fl = fleet.set_index('AIRCRAFT_MODEL')

    # --- PN öznitelikleri + yıllık toplamlar -------------------------------
    c = q.groupby('PN').agg(
        ATA=('ATA_CHAPTER', 'first'), SUB=('SUB_CATEGORY', 'first'),
        FAMILY=('AIRCRAFT_FAMILY', 'first'), MODEL=('AIRCRAFT_MODEL', 'first'),
        ATOLYE=('ATOLYE_KABILIYETI', 'first'),
        TAT_IC=('YURTICI_TAT_GUN', 'first'), TAT_DIS=('YURTDISI_TAT_GUN', 'first'),
        TAT_SAT=('SATINALMA_TAT_GUN', 'first'), KRITIK=('KRITIKLIK_DURUMU', 'first'),
        THY_25=('THY_TALEP_ADET', 'sum'), POOL_25=('POOL_TALEP_ADET', 'sum'),
        SCRAP_25=('SCRAP_ADET', 'sum'), TALEP_25=('TOPLAM', 'sum'),
    )

    piv = q.pivot_table(index='PN', columns='CEYREK', values='TOPLAM', aggfunc='sum')[['Q1', 'Q2', 'Q3', 'Q4']]
    c['Q_RATE_25'] = [sba_rate(r.astype(float)) for r in piv.loc[c.index].values]
    c['KESIKLI'] = (piv.loc[c.index].values == 0).any(axis=1)
    c['CV'] = (piv.std(axis=1, ddof=0) / piv.mean(axis=1).replace(0, np.nan)).loc[c.index]

    # --- TAT / TTR (CLAUDE.md 4) -------------------------------------------
    ic_var = c.ATOLYE.eq('VAR')
    c['ETKIN_TAT'] = np.where(ic_var, c.TAT_IC, c.TAT_DIS)          # TTR = etkin tamir süresi
    c['TEMIN_KANALI'] = np.where(ic_var, 'Yurtiçi tamir',
                         np.where(c.TAT_DIS <= c.TAT_SAT, 'Yurtdışı tamir', 'Satınalma'))
    # min-max için tedarik lead time'ı (tamir ya da satınalma — hangisi mümkünse)
    c['LEAD'] = np.where(ic_var, c.TAT_IC, np.minimum(c.TAT_DIS, c.TAT_SAT))

    # --- risk skoru ---------------------------------------------------------
    w = c.KRITIK.map(P['krit_agirlik'])
    c['RISK'] = w * c.TALEP_25 * c.ETKIN_TAT / 365

    # --- float (tamir döngüsündeki beklenen adet) — %97 doğrulanmış ---------
    c['FLOAT'] = c.TALEP_25 * c.ETKIN_TAT / 365

    # --- 2033 projeksiyonu: İKİ YÖNTEM, bant olarak ------------------------
    c = c.join(fl[['THY_2025_ADET', 'POOL_2025_ADET', 'THY_2033_ADET',
                   'POOL_2033_ADET', 'TOPLAM_2025_ADET', 'TOPLAM_2033_ADET']], on='MODEL')
    c['GROWTH'] = c.TOPLAM_2033_ADET / c.TOPLAM_2025_ADET
    # (a) model bazlı: modelin uçak başına oranı sabit
    c['TALEP_33_MODEL'] = c.TALEP_25 * c.GROWTH
    # (b) PN bazlı THY/pool karışımı ile ölçekleme (dağıtım motoru — bant ucu DEĞİL)
    tot25 = (c.THY_25 + c.POOL_25).replace(0, np.nan)
    thy_pay = (c.THY_25 / tot25).fillna(0.7)
    seg_scale = (thy_pay * (c.THY_2033_ADET / c.THY_2025_ADET) +
                 (1 - thy_pay) * (c.POOL_2033_ADET / c.POOL_2025_ADET))
    c['TALEP_33_PNSEG'] = c.TALEP_25 * seg_scale
    # sunum motoru: ikisinin ortası; bant uçları portföy düzeyinde (bkz. projeksiyon_bandi)
    c['TALEP_33'] = (c.TALEP_33_MODEL + c.TALEP_33_PNSEG) / 2
    c['Q_RATE_33'] = c.Q_RATE_25 * np.where(c.TALEP_25 > 0, c.TALEP_33 / c.TALEP_25.replace(0, np.nan), 1).clip(0)
    c['Q_RATE_33'] = c.Q_RATE_33.fillna(c.Q_RATE_25)

    # --- min-max (servis hedefli Poisson emniyet stoğu) --------------------
    c['SERVIS_HEDEFI'] = c.KRITIK.map(P['servis_hedefi'])
    QD = P['ceyrek_gun']
    for yil, rate in (('2025', c.Q_RATE_25), ('2033', c.Q_RATE_33)):
        mu = rate * c.LEAD / QD                        # lead time boyunca beklenen talep
        ss = poisson_emniyet_stogu(mu.values, c.SERVIS_HEDEFI.values)
        c[f'SS_{yil}'] = ss
        c[f'MIN_{yil}'] = np.ceil(mu) + ss
        c[f'MAX_{yil}'] = c[f'MIN_{yil}'] + np.ceil(rate)

    # --- envanter -----------------------------------------------------------
    c = c.join(inv.set_index('PN').drop(columns=['ATA_CHAPTER', 'SUB_CATEGORY', 'AIRCRAFT_FAMILY',
                                                 'AIRCRAFT_MODEL', 'ATOLYE_KABILIYETI']))
    c['SVC'] = c.FAAL_ADET + c.HOMEBASE_DEPO_ADET                   # kullanılabilir (yorum!)
    c['TAMIRDE'] = c.YURTICI_TAMIRDE_ADET + c.YURTDISI_TAMIRDE_ADET
    c['FIZIKSEL'] = c.TOPLAM_ENVANTER_ADET - c.ACIK_SATINALMA_ADET  # açık PO henüz gelmedi
    c['DEGER_FMV'] = c.FIZIKSEL * c.FMV_USD
    c['DEGER_CLP'] = c.FIZIKSEL * c.CLP_USD
    c['FMV_CLP'] = c.FMV_USD / c.CLP_USD

    # --- TTS / TTR alarmı (CLAUDE.md 4) ------------------------------------
    c['LAM_GUN'] = c.TALEP_25 / 365
    c['TTS'] = np.where(c.TALEP_25 > 0, c.SVC / c.LAM_GUN.replace(0, np.nan), np.inf)
    c['TTR'] = c.ETKIN_TAT
    c['KIRMIZI'] = (c.TALEP_25 > 0) & (c.TTS < c.TTR + P['alarm_tamponu'])
    c['SIPARISSIZ'] = c.KIRMIZI & (c.ACIK_SATINALMA_ADET == 0)
    c['KAPATMA_MALIYETI'] = np.where(c.KIRMIZI,
                                     np.maximum(0, (c.TTR - c.TTS) * c.LAM_GUN) * c.CLP_USD, 0)

    # --- tamir ekonomisi / BER ---------------------------------------------
    c['DIS_CLP'] = c.YURTDISI_TAMIR_MALIYETI_USD / c.CLP_USD
    c['BER'] = c.DIS_CLP > P['ber_esigi']
    c['ETKIN_TAMIR_MALIYETI'] = np.where(ic_var, c.YURTICI_TAMIR_MALIYETI_USD,
                                         c.YURTDISI_TAMIR_MALIYETI_USD)
    c['SCRAP_BUTCE'] = c.SCRAP_25 * c.CLP_USD

    # --- risk listesi & kabiliyet ROI --------------------------------------
    c['RISK_LISTESI'] = c.KRITIK.str.contains('AOG') & c.ATOLYE.eq('YOK')     # 547 PN
    c['UCLU_TEHLIKE'] = c.RISK_LISTESI & c.MODEL.isin(YENI_NESIL)             # 181 PN
    hedef = P['kabiliyet_hedef_tat']
    c['KAB_SERMAYE'] = np.where(c.RISK_LISTESI,
                                c.TALEP_25 * (c.TAT_DIS - hedef) / 365 * c.FMV_USD, 0)
    c['KAB_TASARRUF'] = np.where(c.RISK_LISTESI,
                                 c.TALEP_25 * c.YURTDISI_TAMIR_MALIYETI_USD * (1 - P['ic_dis_oran']), 0)

    c['PHASE_OUT'] = c.MODEL.isin(KUCULEN)
    c['YENI_NESIL'] = c.MODEL.isin(YENI_NESIL)

    # --- anomali dedektörleri (CLAUDE.md 3.2) ------------------------------
    # Hurda anomalisi: hurdaya ayırma oranı > %20 VE yıllık talep >= 20 → 159 PN beklenir
    # (kalite sorunu / yanlış tamir kararı / kayıt hatası adayları)
    c['SCRAP_ANOMALI'] = (c.TALEP_25 >= 20) & (c.SCRAP_25 > 0.20 * c.TALEP_25)
    # Pool bağımlılığı: talebin >= %50'si pool'dan VE yıllık talep >= 12 → 150 PN beklenir
    c['POOL_BAGIMLI'] = (c.TALEP_25 >= 12) & (c.POOL_25 >= 0.50 * c.TALEP_25)

    meta = dict(params=P, ceyrek=piv, fleet=fleet)
    return c, fleet, meta


def projeksiyon_bandi(c: pd.DataFrame, fleet: pd.DataFrame) -> dict:
    """
    2033 talep bandı — CLAUDE.md 3.4. Nokta tahmin YASAK, bant sunulur.
      alt uç  = segment bazlı (portföy düzeyi): THY 130,1 ve Pool 35,7 adet/uçak sabit
      üst uç  = model bazlı: her modelin uçak başına oranı sabit
    """
    t25 = c.TALEP_25.sum()
    thy25, thy33 = fleet.THY_2025_ADET.sum(), fleet.THY_2033_ADET.sum()
    pl25, pl33 = fleet.POOL_2025_ADET.sum(), fleet.POOL_2033_ADET.sum()
    segment = thy33 * (c.THY_25.sum() / thy25) + pl33 * (c.POOL_25.sum() / pl25)
    model = c.TALEP_33_MODEL.sum()
    alt, ust = min(segment, model), max(segment, model)
    return dict(
        talep_2025=float(t25), alt=float(alt), ust=float(ust),
        alt_pct=float(100 * (alt / t25 - 1)), ust_pct=float(100 * (ust / t25 - 1)),
        segment=float(segment), model=float(model), motor=float(c.TALEP_33.sum()),
        thy_ucak_basi=float(c.THY_25.sum() / thy25), pool_ucak_basi=float(c.POOL_25.sum() / pl25),
    )
