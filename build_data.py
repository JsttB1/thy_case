# -*- coding: utf-8 -*-
"""
build_data.py — Yeni dashboard (React/Vite) icin JSON veri sozlesmesini uretir.

Girdi  : dummy_pn_quarterly_data.csv, dummy_pn_inventory_status.csv,
         fleet_distribution.csv, (opsiyonel) model_results.json
Cikti  : web/public/data/*.json

Calistir: python3 build_data.py
"""
import os, json, re
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'web', 'public', 'data')
os.makedirs(OUT, exist_ok=True)

QDAYS = 91.25
SL = {'AOG KRİTİK': 0.98, 'KRİTİK': 0.95, 'KRİTİK DEĞİL': 0.90}
Z = {'AOG KRİTİK': 2.054, 'KRİTİK': 1.645, 'KRİTİK DEĞİL': 1.282}
KRIT_ID = {'AOG KRİTİK': 2, 'KRİTİK': 1, 'KRİTİK DEĞİL': 0}


def w(name, obj):
    p = os.path.join(OUT, name)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    print(f'  {name:22s} {os.path.getsize(p)/1024:8.1f} KB')


# ---------------------------------------------------------------- 1. yukle
df = pd.read_csv(os.path.join(HERE, 'dummy_pn_quarterly_data.csv'), encoding='utf-8-sig')
inv = pd.read_csv(os.path.join(HERE, 'dummy_pn_inventory_status.csv'), encoding='utf-8-sig')
fleet = pd.read_csv(os.path.join(HERE, 'fleet_distribution.csv'), encoding='utf-8-sig')
df['TOPLAM_TALEP'] = df.THY_TALEP_ADET + df.POOL_TALEP_ADET

# ---------------------------------------------------------------- 2. PN agrega
a = df.groupby('PN').agg(
    ATA=('ATA_CHAPTER', 'first'), SUB=('SUB_CATEGORY', 'first'),
    FAMILY=('AIRCRAFT_FAMILY', 'first'), MODEL=('AIRCRAFT_MODEL', 'first'),
    ATOLYE=('ATOLYE_KABILIYETI', 'first'), TAT_IC=('YURTICI_TAT_GUN', 'first'),
    TAT_DIS=('YURTDISI_TAT_GUN', 'first'), TAT_SAT=('SATINALMA_TAT_GUN', 'first'),
    KRITIK=('KRITIKLIK_DURUMU', 'first'),
    THY_2025=('THY_TALEP_ADET', 'sum'), POOL_2025=('POOL_TALEP_ADET', 'sum'),
    SCRAP_2025=('SCRAP_ADET', 'sum'), TALEP_2025=('TOPLAM_TALEP', 'sum'),
).reset_index()

q = df.pivot_table(index='PN', columns='CEYREK', values='TOPLAM_TALEP', aggfunc='sum')
qs = q.loc[a.PN, ['Q1', 'Q2', 'Q3', 'Q4']].values.astype(float)


def sba_rate(x, alpha=0.3):
    nz = x > 0
    if nz.sum() == 0:
        return 0.0
    if nz.all():
        return float(x.mean())
    sizes, idx = x[nz], np.where(nz)[0]
    intervals = np.diff(np.concatenate([[-1], idx]))
    z, p = sizes[0], intervals[0]
    for s, i in zip(sizes[1:], intervals[1:]):
        z += alpha * (s - z); p += alpha * (i - p)
    return float((1 - alpha / 2) * z / p)


a['Q_RATE_2025'] = [sba_rate(r) for r in qs]
a['INTERMITTENT'] = (qs == 0).any(axis=1)

# ---------------------------------------------------------------- 3. 2033 olcekleme
fl = fleet.set_index('AIRCRAFT_MODEL')
a = a.merge(fl[['THY_2025_ADET', 'POOL_2025_ADET', 'THY_2033_ADET', 'POOL_2033_ADET',
                'TOPLAM_2025_ADET', 'TOPLAM_2033_ADET']], left_on='MODEL', right_index=True)
a['GROWTH'] = a.TOPLAM_2033_ADET / a.TOPLAM_2025_ADET
tot25 = a.THY_2025 + a.POOL_2025
thy_share = np.where(tot25 > 0, a.THY_2025 / tot25.replace(0, 1), 0.7)
scale = (thy_share * (a.THY_2033_ADET / a.THY_2025_ADET) +
         (1 - thy_share) * (a.POOL_2033_ADET / a.POOL_2025_ADET))
a['Q_RATE_2033'] = a.Q_RATE_2025 * scale
a['TALEP_2033_YIL'] = a.Q_RATE_2033 * 4

# ---------------------------------------------------------------- 4. min-max
a['LEAD_GUN'] = np.where(a.ATOLYE == 'VAR', a.TAT_IC, np.minimum(a.TAT_DIS, a.TAT_SAT))
a['TEMIN_KANALI'] = np.where(a.ATOLYE == 'VAR', 'Yurtiçi tamir',
                     np.where(a.TAT_DIS <= a.TAT_SAT, 'Yurtdışı tamir', 'Satınalma'))
a['SERVIS_HEDEFI'] = a.KRITIK.map(SL)
z = a.KRITIK.map(Z)
lamL = a.Q_RATE_2033 * a.LEAD_GUN / QDAYS
a['SS'] = np.ceil(z * np.sqrt(lamL))
a['MIN_2033'] = np.ceil(lamL) + a.SS
a['MAX_2033'] = a.MIN_2033 + np.ceil(a.Q_RATE_2033)
lamL25 = a.Q_RATE_2025 * a.LEAD_GUN / QDAYS
a['MIN_2025'] = np.ceil(lamL25) + np.ceil(z * np.sqrt(lamL25))
a['MAX_2025'] = a.MIN_2025 + np.ceil(a.Q_RATE_2025)
a['ALARM'] = a.MIN_2033 > a.MAX_2025

# ---------------------------------------------------------------- 5. risk skoru
krit_w = a.KRITIK.map({'AOG KRİTİK': 1.0, 'KRİTİK': 0.6, 'KRİTİK DEĞİL': 0.2})
lead_n = (a.LEAD_GUN - a.LEAD_GUN.min()) / (a.LEAD_GUN.max() - a.LEAD_GUN.min())
growth_n = np.clip((a.GROWTH - 1) / (a.GROWTH.max() - 1), 0, 1)
atolye_n = (a.ATOLYE == 'YOK').astype(float)
dem_n = np.clip(a.TALEP_2033_YIL / a.TALEP_2033_YIL.quantile(0.95), 0, 1)
a['RISK'] = (100 * (0.35 * krit_w + 0.25 * lead_n + 0.20 * growth_n
                    + 0.10 * atolye_n + 0.10 * dem_n)).round(1)
a['SCRAP_ORANI'] = np.where(a.TALEP_2025 > 0, a.SCRAP_2025 / a.TALEP_2025, 0)
a['SCRAP_2033_YIL'] = a.SCRAP_ORANI * a.TALEP_2033_YIL

# ---------------------------------------------------------------- 6. envanter birlestir
m = a.merge(inv, on='PN', suffixes=('', '_inv'))
assert len(m) == 5000, len(m)
m['ELDE_SERVIS'] = m.FAAL_ADET + m.HOMEBASE_DEPO_ADET
m['PIPELINE'] = (m.YURTICI_TAMIRDE_ADET + m.YURTDISI_TAMIRDE_ADET
                 + m.ACIK_SATINALMA_ADET + m.EXCHANGE_IN_ADET)
m['ATIL'] = m.GAYRIFAAL_ADET
m['tamir_maliyeti'] = np.where(m.ATOLYE == 'VAR', m.YURTICI_TAMIR_MALIYETI_USD,
                               m.YURTDISI_TAMIR_MALIYETI_USD)
m['DEGER_FMV'] = m.TOPLAM_ENVANTER_ADET * m.FMV_USD
m['ATIL_DEGER'] = m.ATIL * m.FMV_USD
m['ACIK_2033'] = np.clip(m.MIN_2033 - m.ELDE_SERVIS, 0, None)
m['FAZLA_2033'] = np.clip(m.ELDE_SERVIS - m.MAX_2033, 0, None)
m['DURUM'] = np.select([m.ELDE_SERVIS < m.MIN_2033, m.ELDE_SERVIS > m.MAX_2033],
                       ['AÇIK', 'FAZLA'], default='DENGEDE')
m['ACIK_MALIYET'] = m.ACIK_2033 * m.CLP_USD
m['FAZLA_BAGLI'] = m.FAZLA_2033 * m.FMV_USD
m['TAMIR_VS_YENI'] = m.tamir_maliyeti / m.CLP_USD
m['SCRAP_ONERISI'] = m.TAMIR_VS_YENI > 0.7

# ---------------------------------------------------------------- 7. SIPARIS GERI SAYIMI
# Stok seviyesi degil, TAKVIM alarmi: son siparis tarihine kalan gun.
daily = m.Q_RATE_2033 / QDAYS                       # 2033 gunluk beklenen talep
m['GUNLUK_TALEP'] = daily.round(4)
tuk = np.where(daily > 0, m.ELDE_SERVIS / np.maximum(daily, 1e-9), 9999)
m['TUKENME_GUN'] = np.clip(tuk, 0, 9999).round(1)   # stok kac gunde biter
m['KALAN_GUN'] = (m.TUKENME_GUN - m.LEAD_GUN).round(1)  # siparis icin kalan sure
m['GERI_SAYIM_DURUM'] = np.select(
    [m.KALAN_GUN < 0, m.KALAN_GUN < 30, m.KALAN_GUN < 90],
    ['GECIKMIS', 'ACIL', 'YAKLASIYOR'], default='GUVENLI')

# ---------------------------------------------------------------- 8. KPI
kpi = {
    'pn': 5000,
    'ucak2025': int(fleet.TOPLAM_2025_ADET.sum()), 'ucak2033': int(fleet.TOPLAM_2033_ADET.sum()),
    'talep25': int(m.TALEP_2025.sum()), 'talep33': int(m.TALEP_2033_YIL.sum()),
    'min25': int(m.MIN_2025.sum()), 'min33': int(m.MIN_2033.sum()),
    'max25': int(m.MAX_2025.sum()), 'max33': int(m.MAX_2033.sum()),
    'scrap25': int(m.SCRAP_2025.sum()), 'scrap33': int(m.SCRAP_2033_YIL.sum()),
    'riskHigh': int((m.RISK >= 70).sum()), 'riskMid': int(((m.RISK >= 50) & (m.RISK < 70)).sum()),
    'alarm': int(m.ALARM.sum()), 'alarmAog': int((m.ALARM & (m.KRITIK == 'AOG KRİTİK')).sum()),
    'intermittent': int(m.INTERMITTENT.sum()),
    'degerFmv': int(m.DEGER_FMV.sum()), 'degerClp': int((m.TOPLAM_ENVANTER_ADET * m.CLP_USD).sum()),
    'atilAdet': int(m.ATIL.sum()), 'atilDeger': int(m.ATIL_DEGER.sum()),
    'pipelineAdet': int(m.PIPELINE.sum()),
    'acikPn': int((m.DURUM == 'AÇIK').sum()), 'fazlaPn': int((m.DURUM == 'FAZLA').sum()),
    'dengePn': int((m.DURUM == 'DENGEDE').sum()),
    'acikPnAog': int(((m.DURUM == 'AÇIK') & (m.KRITIK == 'AOG KRİTİK')).sum()),
    'acikAdet': int(m.ACIK_2033.sum()), 'acikMaliyet': int(m.ACIK_MALIYET.sum()),
    'fazlaAdet': int(m.FAZLA_2033.sum()), 'fazlaBagli': int(m.FAZLA_BAGLI.sum()),
    'scrapOneriPn': int(m.SCRAP_ONERISI.sum()),
    'exchangeOutPn': int((m.EXCHANGE_OUT_ADET > 0).sum()),
    'gecikmisPn': int((m.GERI_SAYIM_DURUM == 'GECIKMIS').sum()),
    'acilPn': int((m.GERI_SAYIM_DURUM == 'ACIL').sum()),
    'gecikmisAog': int(((m.GERI_SAYIM_DURUM == 'GECIKMIS') & (m.KRITIK == 'AOG KRİTİK')).sum()),
}
kpi['talepBuyume'] = round(100 * (kpi['talep33'] / kpi['talep25'] - 1), 1)
kpi['filoBuyume'] = round(100 * (kpi['ucak2033'] / kpi['ucak2025'] - 1), 1)
kpi['minBuyume'] = round(100 * (kpi['min33'] / kpi['min25'] - 1), 1)
w('kpi.json', kpi)

# ---------------------------------------------------------------- 9. filo
w('fleet.json', {
    'models': fleet.to_dict('records'),
    'toplam': {'thy2025': int(fleet.THY_2025_ADET.sum()), 'pool2025': int(fleet.POOL_2025_ADET.sum()),
               'thy2033': int(fleet.THY_2033_ADET.sum()), 'pool2033': int(fleet.POOL_2033_ADET.sum())},
})

# ---------------------------------------------------------------- 10. talep
qtot = df.groupby('CEYREK')[['THY_TALEP_ADET', 'POOL_TALEP_ADET', 'SCRAP_ADET']].sum()
qtot = qtot.loc[['Q1', 'Q2', 'Q3', 'Q4']]
bymodel = m.groupby('MODEL').agg(t25=('TALEP_2025', 'sum'), t33=('TALEP_2033_YIL', 'sum'),
                                 g=('GROWTH', 'first'), risk=('RISK', 'mean'),
                                 alarm=('ALARM', 'sum'), pn=('PN', 'count')).round(1).reset_index()
bysub = m.groupby('SUB').agg(t25=('TALEP_2025', 'sum'), t33=('TALEP_2033_YIL', 'sum'),
                             scrap=('SCRAP_2025', 'sum'), risk=('RISK', 'mean'),
                             pn=('PN', 'count'), lead=('LEAD_GUN', 'mean')).round(1).reset_index()
bysub['scrapOran'] = (bysub.scrap / bysub.t25.replace(0, 1)).round(3)
w('demand.json', {
    'quarterly': {'labels': ['Q1', 'Q2', 'Q3', 'Q4'],
                  'thy': qtot.THY_TALEP_ADET.astype(int).tolist(),
                  'pool': qtot.POOL_TALEP_ADET.astype(int).tolist(),
                  'scrap': qtot.SCRAP_ADET.astype(int).tolist()},
    'byModel': bymodel.to_dict('records'),
    'bySub': bysub.sort_values('t33', ascending=False).to_dict('records'),
    'intermittentPn': int(m.INTERMITTENT.sum()),
})

# ---------------------------------------------------------------- 11. risk
hist, _ = np.histogram(m.RISK, bins=np.arange(0, 101, 10))
heat = m.pivot_table(index='SUB', columns='KRITIK', values='RISK', aggfunc='mean').round(1)
heat = heat.reindex(columns=['AOG KRİTİK', 'KRİTİK', 'KRİTİK DEĞİL'])
cols_top = ['PN', 'MODEL', 'SUB', 'KRITIK', 'ATOLYE', 'TEMIN_KANALI', 'LEAD_GUN',
            'TALEP_2033_YIL', 'MIN_2033', 'MAX_2033', 'ELDE_SERVIS', 'ACIK_2033',
            'KALAN_GUN', 'GERI_SAYIM_DURUM', 'RISK', 'CLP_USD']
w('risk.json', {
    'hist': {'labels': [f'{i}-{i+10}' for i in range(0, 100, 10)], 'vals': hist.tolist()},
    'heatmap': {'rows': heat.index.tolist(), 'cols': list(heat.columns),
                'vals': np.nan_to_num(heat.values).round(1).tolist()},
    'topRisk': m.nlargest(100, 'RISK')[cols_top].round(1).to_dict('records'),
})

# ---------------------------------------------------------------- 12. envanter
dk = m.pivot_table(index='DURUM', columns='KRITIK', values='PN', aggfunc='count', fill_value=0)
dk = dk.reindex(index=['AÇIK', 'DENGEDE', 'FAZLA'], columns=['AOG KRİTİK', 'KRİTİK', 'KRİTİK DEĞİL'])
w('inventory.json', {
    'durumKrit': {'rows': dk.index.tolist(), 'cols': list(dk.columns), 'vals': dk.values.tolist()},
    'sermaye': {'servis': int((m.ELDE_SERVIS * m.FMV_USD).sum()),
                'pipeline': int((m.PIPELINE * m.FMV_USD).sum()),
                'atil': int(m.ATIL_DEGER.sum()),
                'fazla': int(m.FAZLA_BAGLI.sum())},
    'topAcik': m[m.DURUM == 'AÇIK'].nlargest(150, 'RISK')[
        cols_top + ['ACIK_MALIYET', 'PIPELINE', 'ATIL']].round(1).to_dict('records'),
    'topFazla': m[m.DURUM == 'FAZLA'].nlargest(100, 'FAZLA_BAGLI')[
        ['PN', 'MODEL', 'SUB', 'KRITIK', 'ELDE_SERVIS', 'MAX_2033', 'FAZLA_2033',
         'FMV_USD', 'FAZLA_BAGLI']].round(1).to_dict('records'),
    'geriSayim': m.nsmallest(150, 'KALAN_GUN')[
        cols_top + ['TUKENME_GUN', 'GUNLUK_TALEP']].round(1).to_dict('records'),
    'scrapOneri': m[m.SCRAP_ONERISI].nlargest(50, 'TAMIR_VS_YENI')[
        ['PN', 'SUB', 'KRITIK', 'TAMIR_VS_YENI', 'CLP_USD', 'ATIL']].round(2).to_dict('records'),
})

# ---------------------------------------------------------------- 13. PN kolonlari (explorer + senaryo motoru)
w('pn.json', {
    'n': len(m),
    'dict': {'krit': ['KRİTİK DEĞİL', 'KRİTİK', 'AOG KRİTİK'],
             'model': sorted(m.MODEL.unique().tolist()),
             'sub': sorted(m.SUB.unique().tolist()),
             'kanal': sorted(m.TEMIN_KANALI.unique().tolist())},
    'cols': {
        'pn': m.PN.str.replace('PN-', '', regex=False).astype(int).tolist(),
        'model': m.MODEL.map({v: i for i, v in enumerate(sorted(m.MODEL.unique()))}).tolist(),
        'sub': m.SUB.map({v: i for i, v in enumerate(sorted(m.SUB.unique()))}).tolist(),
        'ata': m.ATA.astype(int).tolist(),
        'krit': m.KRITIK.map(KRIT_ID).tolist(),
        'kanal': m.TEMIN_KANALI.map({v: i for i, v in enumerate(sorted(m.TEMIN_KANALI.unique()))}).tolist(),
        'atolye': (m.ATOLYE == 'VAR').astype(int).tolist(),
        'lead': m.LEAD_GUN.astype(int).tolist(),
        'rate25': m.Q_RATE_2025.round(3).tolist(),
        'rate33': m.Q_RATE_2033.round(3).tolist(),
        'min25': m.MIN_2025.astype(int).tolist(), 'max25': m.MAX_2025.astype(int).tolist(),
        'min33': m.MIN_2033.astype(int).tolist(), 'max33': m.MAX_2033.astype(int).tolist(),
        'stock': m.ELDE_SERVIS.astype(int).tolist(),
        'pipeline': m.PIPELINE.astype(int).tolist(),
        'atil': m.ATIL.astype(int).tolist(),
        'clp': m.CLP_USD.astype(int).tolist(),
        'fmv': m.FMV_USD.astype(int).tolist(),
        'risk': m.RISK.tolist(),
        'kalan': m.KALAN_GUN.tolist(),
        'z': m.KRITIK.map(Z).tolist(),
    },
})

# ---------------------------------------------------------------- 14. ML sonuclari
ml = None
p = os.path.join(HERE, 'model_results.json')
if os.path.exists(p):
    ml = json.load(open(p, encoding='utf-8'))
else:  # eski tek-dosya dashboard'dan cikar
    h = os.path.join(HERE, 'envanter_2033_dashboard.html')
    if os.path.exists(h):
        t = open(h, encoding='utf-8').read()
        mm = re.search(r'const ML\s*=\s*', t)
        if mm:
            s = mm.end(); d = 0
            for k, c in enumerate(t[s:]):
                if c == '{': d += 1
                elif c == '}':
                    d -= 1
                    if d == 0:
                        ml = json.loads(t[s:s + k + 1]); break
if ml:
    w('model_ml.json', ml)
else:
    print('  ! model_ml.json uretilemedi (train_demand_model.py calistir)')

# ---------------------------------------------------------------- 15. ISTASYON AGI (harita icin)
# Kaynak: case PDF Bolum 3 "Operasyonel Istasyonlar" tablosu (540/180/110/190/180 -> 820/310/200/380/290).
# Istasyon kirilimi ve koordinatlar temsili olarak genisletilmistir.
STATIONS = [
    # kod, ad, lat, lon, tip, 2025 ucak, 2033 ucak, depo seviyesi, IST'ten transfer saati
    ('IST', 'İstanbul Havalimanı',   41.2753,  28.7519, 'ana_us',   420, 640, 'ana_depo', 0.0),
    ('SAW', 'Sabiha Gökçen',         40.8986,  29.3092, 'ana_us',   120, 180, 'ileri_depo', 1.5),
    ('ESB', 'Ankara Esenboğa',       40.1281,  32.9951, 'bolgesel', 180, 310, 'ileri_depo', 3.0),
    ('ADB', 'İzmir Adnan Menderes',  38.2924,  27.1570, 'bolgesel', 110, 200, 'ileri_depo', 3.5),
    ('AYT', 'Antalya',               36.8987,  30.8005, 'hat',       60, 100, 'hat_stok',  4.0),
    ('ADA', 'Adana Şakirpaşa',       36.9822,  35.2803, 'hat',       35,  55, 'hat_stok',  5.0),
    ('TZX', 'Trabzon',               40.9951,  39.7897, 'hat',       30,  50, 'hat_stok',  5.5),
    ('DIY', 'Diyarbakır',            37.8939,  40.2010, 'hat',       30,  45, 'yok',       6.5),
    ('GZT', 'Gaziantep',             36.9472,  37.4787, 'hat',       25,  40, 'yok',       6.0),
    ('FRA', 'Frankfurt',             50.0379,   8.5622, 'uluslararasi', 40,  80, 'ileri_depo', 8.0),
    ('LHR', 'Londra Heathrow',       51.4700,  -0.4543, 'uluslararasi', 35,  70, 'hat_stok', 9.0),
    ('CDG', 'Paris Charles de Gaulle',49.0097,  2.5479, 'uluslararasi', 30,  60, 'hat_stok', 9.0),
    ('JFK', 'New York JFK',          40.6413, -73.7781, 'uluslararasi', 35,  70, 'ileri_depo', 16.0),
    ('DXB', 'Dubai',                 25.2532,  55.3657, 'uluslararasi', 30,  60, 'hat_stok', 11.0),
    ('BKK', 'Bangkok',               13.6900, 100.7501, 'uluslararasi', 20,  40, 'yok',      18.0),
]
DEPO_KAPSAM = {'ana_depo': 1.00, 'ileri_depo': 0.55, 'hat_stok': 0.20, 'yok': 0.0}
rng = np.random.RandomState(42)
stations = []
tot25 = sum(s[5] for s in STATIONS)
for code, name, lat, lon, tip, u25, u33, depo, tr in STATIONS:
    pay = u25 / tot25
    stations.append({
        'kod': code, 'ad': name, 'lat': lat, 'lon': lon, 'tip': tip,
        'ucak2025': u25, 'ucak2033': u33, 'depoTipi': depo,
        'transferSaatIST': tr,
        # temsili stok dagilimi: ucak payi x depo kapsam katsayisi
        'stokKalem': int(round(5000 * pay * DEPO_KAPSAM[depo])),
        'stokAdet': int(round(kpi['acikAdet'] * 0 + (m.ELDE_SERVIS.sum() * pay * DEPO_KAPSAM[depo]))),
        'aogKapsam': round(DEPO_KAPSAM[depo], 2),
    })
w('stations.json', {
    'stations': stations,
    'not': 'Uçak dağılımı case PDF Bölüm 3 tablosundan; istasyon kırılımı ve stok dağılımı temsilidir.',
    'kapsamKatsayilari': DEPO_KAPSAM,
})

# ---------------------------------------------------------------- 16. meta
w('meta.json', {
    'baslik': 'Envanter Kontrol Kulesi',
    'altBaslik': '1.200 → 2.000 uçak · komponent envanter karar destek sistemi',
    'kaynak': {'pn': 5000, 'ceyrek': 4, 'yil': 2025, 'hedefYil': 2033, 'model': 14},
    'yontem': 'SBA kesikli talep tahmini → filo-ölçekli 2033 projeksiyonu → '
              'kritiklik bazlı Poisson emniyet stoğu → min-max → AOG risk skoru → sipariş geri sayımı',
    'uyari': 'Veriler sentetiktir (case dokümanı ile birlikte verilen dummy set). '
             'Gerçek THY/AMOS verisi değildir.',
    'sozluk': [
        {'t': 'AOG', 'a': 'Aircraft on Ground — parça ya da teknik arıza nedeniyle uçamayan uçak.'},
        {'t': 'TAT', 'a': 'Turn Around Time — bakım işleminin başından teslime kadar geçen süre.'},
        {'t': 'PN', 'a': 'Part Number — parça numarası; envanter takibinin temel birimi.'},
        {'t': 'Rotable', 'a': 'Tamir edilip tekrar kullanıma sunulabilen komponent.'},
        {'t': 'Min-Max', 'a': 'Stokta tutulması gereken alt ve üst sınır; aşılınca alarm tetiklenir.'},
        {'t': 'SBA', 'a': 'Syntetos-Boylan Approximation — kesikli (aralıklı) talep için tahmin yöntemi.'},
        {'t': 'Pool', 'a': 'Birden fazla operatörün ortak komponent havuzu.'},
        {'t': 'Lead time', 'a': 'Sipariş/tamir kararından parçanın raf a girmesine kadar geçen süre.'},
    ],
})

print('\nOK — veri sozlesmesi hazir:', OUT)
print(f"  gecikmis PN: {kpi['gecikmisPn']} (AOG: {kpi['gecikmisAog']}) | acil: {kpi['acilPn']}")
