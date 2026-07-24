# -*- coding: utf-8 -*-
"""
Catalyst dashboard üreteci.

core.py'den gelen tek çekirdeği alır, tarayıcı için kompakt bir veri paketi
(payload) üretir ve tek dosyalık, internetsiz çalışan HTML'i yazar.

    python3 build_dashboard.py

Çıktı: catalyst.html  (Chart.js + CSS + JS + veri gömülü)
"""
from __future__ import annotations
import json, os, sys
import numpy as np
import pandas as pd

import core

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'catalyst.html')


def r(x, n=1):
    """NaN/inf güvenli yuvarlama — JSON'a doğrudan gider."""
    if isinstance(x, (list, tuple, np.ndarray, pd.Series)):
        return [r(v, n) for v in x]
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if not np.isfinite(v):
        return None
    return round(v, n) if n > 0 else int(round(v))


def build_payload():
    c, fleet, meta = core.build()
    P = meta['params']
    band = core.projeksiyon_bandi(c, fleet)
    q, _, _ = core.load()
    q['TOPLAM'] = q.THY_TALEP_ADET + q.POOL_TALEP_ADET

    aog = c.KRITIK.str.contains('AOG')
    T25 = c.TALEP_25.sum()
    V = c.DEGER_FMV.sum()
    aktif = c.TALEP_25 > 0

    # ---------------------------------------------------------------- KPI
    kpi = dict(
        pn=len(c),
        # sermaye kokpiti (fiziksel = toplam − açık PO)
        fmv=r(V / 1e6, 1), clp=r(c.DEGER_CLP.sum() / 1e6, 1),
        fmv_clp_medyan=r(c.FMV_CLP.median(), 3),
        svc_adet=int(c.SVC.sum()), svc_fmv=r((c.SVC * c.FMV_USD).sum() / 1e6, 1),
        gayrifaal_adet=int(c.GAYRIFAAL_ADET.sum()), gayrifaal_fmv=r((c.GAYRIFAAL_ADET * c.FMV_USD).sum() / 1e6, 1),
        gayrifaal_tamir=r((c.GAYRIFAAL_ADET * c.ETKIN_TAMIR_MALIYETI).sum() / 1e6, 1),
        tamirde_adet=int(c.TAMIRDE.sum()), tamirde_fmv=r((c.TAMIRDE * c.FMV_USD).sum() / 1e6, 1),
        po_adet=int(c.ACIK_SATINALMA_ADET.sum()), po_clp=r((c.ACIK_SATINALMA_ADET * c.CLP_USD).sum() / 1e6, 1),
        exch_in=int(c.EXCHANGE_IN_ADET.sum()), exch_out=int(c.EXCHANGE_OUT_ADET.sum()),
        toplam_adet=int(c.TOPLAM_ENVANTER_ADET.sum()),
        # üç para musluğu
        scrap_butce=r(c.SCRAP_BUTCE.sum() / 1e6, 1),
        float_adet=int(round(c.FLOAT.sum())), float_fmv=r((c.FLOAT * c.FMV_USD).sum() / 1e6, 1),
        float_fmv_33=r((c.FLOAT * c.FMV_USD).sum() / 1e6 * band['ust'] / band['talep_2025'], 1),
        phaseout=r(c.loc[c.PHASE_OUT, 'DEGER_FMV'].sum() / 1e6, 1),
        phaseout_pct=r(100 * c.loc[c.PHASE_OUT, 'DEGER_FMV'].sum() / V, 1),
        # bugünün sağlığı — TTS/TTR
        kirmizi=int(c.KIRMIZI.sum()), kirmizi_aog=int((c.KIRMIZI & aog).sum()),
        siparissiz=int(c.SIPARISSIZ.sum()), siparissiz_aog=int((c.SIPARISSIZ & aog).sum()),
        kapatma=r(c.KAPATMA_MALIYETI.sum() / 1e6, 2),
        tts_medyan=r(c.loc[aktif, 'TTS'].median(), 0),
        tts_q25=r(c.loc[aktif, 'TTS'].quantile(.25), 0), tts_q75=r(c.loc[aktif, 'TTS'].quantile(.75), 0),
        aktif_pn=int(aktif.sum()),
        fazla_pn=int((aktif & (c.TTS > 365)).sum()),
        olu_pn=int(((~aktif) & (c.SVC > 0)).sum()), olu_adet=int(c.loc[(~aktif) & (c.SVC > 0), 'SVC'].sum()),
        # talep & risk
        talep25=int(T25), scrap25=int(c.SCRAP_25.sum()),
        scrap_oran=r(100 * c.SCRAP_25.sum() / T25, 1),
        q3_pct=r(100 * (q.groupby('CEYREK').TOPLAM.sum()['Q3'] /
                        q.groupby('CEYREK').TOPLAM.sum()[['Q1', 'Q2', 'Q4']].mean() - 1), 1),
        q1q4_pct=r(100 * (q.groupby('CEYREK').TOPLAM.sum()['Q4'] /
                          q.groupby('CEYREK').TOPLAM.sum()['Q1'] - 1), 1),
        sifir_ceyrek=r(100 * (q.TOPLAM == 0).mean(), 1),
        # mevsimsellik homojenliği: Q3 etkisi kritiklik sınıflarına göre (AOG/KRİTİK/DEĞİL sırası)
        q3_krit=[r(100 * (g['Q3'] / g[['Q1', 'Q2', 'Q4']].mean() - 1), 1)
                 for k in ['AOG KRİTİK', 'KRİTİK', 'KRİTİK DEĞİL']
                 for g in [q[q.KRITIKLIK_DURUMU == k].groupby('CEYREK').TOPLAM.sum()]],
        # anomali dedektörleri + pool
        scrap_anomali=int(c.SCRAP_ANOMALI.sum()),
        scrap_anomali_max=r(100 * (c.loc[c.SCRAP_ANOMALI, 'SCRAP_25'] /
                                   c.loc[c.SCRAP_ANOMALI, 'TALEP_25']).max(), 0),
        pool_bagimli=int(c.POOL_BAGIMLI.sum()),
        pool_bagimli_pay=r(100 * c.loc[c.POOL_BAGIMLI, 'TALEP_25'].sum() / T25, 1),
        pool_pay=r(100 * c.POOL_25.sum() / T25, 1),
        scrap_butce33=r((c.SCRAP_25 * c.GROWTH * c.CLP_USD).sum() / 1e6, 1),
        medyan_talep=r(c.TALEP_25.median(), 0), kesikli=int(c.KESIKLI.sum()),
        cv_medyan=r(c.CV.median(), 2),
        risk_listesi=int(c.RISK_LISTESI.sum()),
        risk_listesi_pct=r(100 * c.RISK_LISTESI.sum() / aog.sum(), 1),
        uclu=int(c.UCLU_TEHLIKE.sum()),
        atolye_var=r(100 * c.ATOLYE.eq('VAR').mean(), 1),
        atolye_var_aog=r(100 * c.loc[aog, 'ATOLYE'].eq('VAR').mean(), 1),
        tat_ic=r(c.loc[c.ATOLYE.eq('VAR'), 'TAT_IC'].mean(), 0),
        tat_dis=r(c.TAT_DIS.mean(), 0), tat_sat=r(c.TAT_SAT.mean(), 0),
        tat_sat_max=int(c.TAT_SAT.max()),
        # kabiliyet ROI / BER
        kab_tasarruf=r(c.KAB_TASARRUF.sum() / 1e6, 1), kab_sermaye=r(c.KAB_SERMAYE.sum() / 1e6, 1),
        kab_bugun=r((c.loc[c.RISK_LISTESI, 'TALEP_25'] *
                     c.loc[c.RISK_LISTESI, 'YURTDISI_TAMIR_MALIYETI_USD']).sum() / 1e6, 1),
        ber_pn=int(c.BER.sum()), ber_talep=int(c.loc[c.BER, 'TALEP_25'].sum()),
        # Pareto
        deger_top20=r(100 * c.DEGER_FMV.nlargest(20).sum() / V, 1),
        deger_top500=r(100 * c.DEGER_FMV.nlargest(500).sum() / V, 1),
        deger_80_pn=int((c.DEGER_FMV.sort_values(ascending=False).cumsum() / V < .8).sum() + 1),
        adet_top20=r(100 * c.TALEP_25.nlargest(20).sum() / T25, 1),
        adet_80_pn=int((c.TALEP_25.sort_values(ascending=False).cumsum() / T25 < .8).sum() + 1),
        # min-max
        min25=int(c.MIN_2025.sum()), min33=int(c.MIN_2033.sum()),
        max25=int(c.MAX_2025.sum()), max33=int(c.MAX_2033.sum()),
        acik33=int((c.SVC < c.MIN_2033).sum()),
    )

    # -------------------------------------------------------------- projeksiyon
    band_out = {k: (r(v, 1) if isinstance(v, float) else v) for k, v in band.items()}

    # ---------------------------------------------------- model / kategori / çeyrek
    fl = fleet.set_index('AIRCRAFT_MODEL')
    mdl = c.groupby('MODEL').agg(t25=('TALEP_25', 'sum'), t33=('TALEP_33_MODEL', 'sum'),
                                 pn=('TALEP_25', 'size'), deger=('DEGER_FMV', 'sum')).join(
        fl[['TOPLAM_2025_ADET', 'TOPLAM_2033_ADET', 'THY_2025_ADET', 'POOL_2025_ADET',
            'THY_2033_ADET', 'POOL_2033_ADET']])
    mdl = mdl.sort_values('t33', ascending=False)
    model_ser = dict(
        ad=mdl.index.tolist(), t25=r(mdl.t25, 0), t33=r(mdl.t33, 0), pn=r(mdl.pn, 0),
        deger=r(mdl.deger / 1e6, 2), u25=r(mdl.TOPLAM_2025_ADET, 0), u33=r(mdl.TOPLAM_2033_ADET, 0),
        thy25=r(mdl.THY_2025_ADET, 0), pool25=r(mdl.POOL_2025_ADET, 0),
        thy33=r(mdl.THY_2033_ADET, 0), pool33=r(mdl.POOL_2033_ADET, 0),
        yeni=[m in core.YENI_NESIL for m in mdl.index],
        kucul=[m in core.KUCULEN for m in mdl.index],
    )

    c['SCRAP_BUTCE_33'] = c.SCRAP_25 * c.GROWTH * c.CLP_USD    # hurda bütçesi 2033 (filo çarpanıyla)
    kat = c.groupby('SUB').agg(t25=('TALEP_25', 'sum'), t33=('TALEP_33_MODEL', 'sum'),
                               pn=('TALEP_25', 'size'), deger=('DEGER_FMV', 'sum'),
                               scrap=('SCRAP_25', 'sum'), risk=('RISK', 'mean'),
                               kirmizi=('KIRMIZI', 'sum'), svc=('SVC', 'sum'),
                               sbutce=('SCRAP_BUTCE', 'sum'), sbutce33=('SCRAP_BUTCE_33', 'sum'),
                               anomali=('SCRAP_ANOMALI', 'sum'))
    kat['buyume'] = 100 * (kat.t33 / kat.t25 - 1)
    kat['scrap_oran'] = 100 * kat.scrap / kat.t25
    kat = kat.sort_values('t25', ascending=False)
    kat_ser = dict(ad=kat.index.tolist(), t25=r(kat.t25, 0), t33=r(kat.t33, 0), pn=r(kat.pn, 0),
                   deger=r(kat.deger / 1e6, 2), buyume=r(kat.buyume, 1),
                   scrap_oran=r(kat.scrap_oran, 1), risk=r(kat.risk, 1), kirmizi=r(kat.kirmizi, 0),
                   svc=r(kat.svc, 0), sbutce=r(kat.sbutce / 1e6, 2), sbutce33=r(kat.sbutce33 / 1e6, 2),
                   anomali=r(kat.anomali, 0))

    cey = q.groupby('CEYREK')[['THY_TALEP_ADET', 'POOL_TALEP_ADET', 'SCRAP_ADET']].sum()
    ceyrek = dict(ad=cey.index.tolist(), thy=r(cey.THY_TALEP_ADET, 0),
                  pool=r(cey.POOL_TALEP_ADET, 0), scrap=r(cey.SCRAP_ADET, 0))

    # ------------------------------------------------------------- risk histogram
    hist, _ = np.histogram(c.RISK.clip(0, 100), bins=np.arange(0, 101, 10))
    risk_hist = [int(v) for v in hist]

    # ----------------------------------------------------------------- Pareto eğrisi
    dv = c.DEGER_FMV.sort_values(ascending=False).cumsum() / V * 100
    tv = c.TALEP_25.sort_values(ascending=False).cumsum() / T25 * 100
    idx = [int(i) for i in np.unique(np.linspace(0, len(c) - 1, 120).astype(int))]
    pareto = dict(x=r([100 * (i + 1) / len(c) for i in idx], 2),
                  deger=r(dv.values[idx], 1), adet=r(tv.values[idx], 1))

    # -------------------------------- harita: havalimanı ağı (TEMSİLİ dağıtım)
    # Kaynak: basılı case'in 5 satırlık istasyon tablosu → core.HAVALIMANLARI ile 25 noktaya
    # ağırlıkla açılır; grup toplamları case ile BİREBİR tutar (core.havalimani_tablosu garanti eder).
    # Metrik değerleri JS tarafında hesaplanır: değer = kritiklik-toplamı × havalimanı payı.
    kr_sira = ['AOG KRİTİK', 'KRİTİK', 'KRİTİK DEĞİL']
    apt = core.havalimani_tablosu()
    kr_tot = dict(
        talep25=[float(c.loc[c.KRITIK == k, 'TALEP_25'].sum()) for k in kr_sira],
        min33=[float(c.loc[c.KRITIK == k, 'MIN_2033'].sum()) for k in kr_sira],
        dis_bagimli=[float(c.loc[(c.KRITIK == k) & c.ATOLYE.eq('YOK'), 'TALEP_25'].sum()) for k in kr_sira],
        svc=[float(c.loc[c.KRITIK == k, 'SVC'].sum()) for k in kr_sira],
        kirmizi=[float((c.KIRMIZI & (c.KRITIK == k)).sum()) for k in kr_sira],
    )
    harita = dict(
        kritiklik=kr_sira,
        grup=dict(kod=[g[0] for g in core.ISTASYONLAR], ad=[g[1] for g in core.ISTASYONLAR],
                  u25=[g[2] for g in core.ISTASYONLAR], u33=[g[3] for g in core.ISTASYONLAR]),
        kod=[a['kod'] for a in apt], ad=[a['ad'] for a in apt], grp=[a['grup'] for a in apt],
        lat=[a['lat'] for a in apt], lon=[a['lon'] for a in apt],
        u25=[a['u25'] for a in apt], u33=[a['u33'] for a in apt],
        buyume=[r(100 * (a['u33'] / a['u25'] - 1), 1) for a in apt],
        pay25=[r(a['u25'] / 1200, 5) for a in apt], pay33=[r(a['u33'] / 2000, 5) for a in apt],
        dist=[a['dist_km'] for a in apt], yon=[a['bearing'] for a in apt],
        yd=[a['yurtdisi'] for a in apt],
        krTot=kr_tot,
        ic_tamir_toplam=int(c.YURTICI_TAMIRDE_ADET.sum()),
        dis_tamir_toplam=int(c.YURTDISI_TAMIRDE_ADET.sum()),
    )

    # ---------------------------------------------- ABC×XYZ segmentasyon matrisi
    # ABC: kümülatif talep payına göre (A: ilk %80'i taşıyanlar, B: %80–95, C: kalan)
    # XYZ: çeyrekler arası oynaklığa göre (X: CV<=0,5 · Y: 0,5–1,0 · Z: >1,0 ya da hesaplanamaz)
    srt = c.TALEP_25.sort_values(ascending=False)
    cum = srt.cumsum() / max(1, srt.sum())
    abc = pd.Series('C', index=c.index)
    abc.loc[cum[cum <= 0.95].index] = 'B'
    abc.loc[cum[cum <= 0.80].index] = 'A'
    xyz = pd.Series('Z', index=c.index)
    xyz.loc[c.CV <= 1.0] = 'Y'
    xyz.loc[c.CV <= 0.5] = 'X'
    abcxyz = dict(
        abc=['A', 'B', 'C'], xyz=['X', 'Y', 'Z'],
        sayi=[[int(((abc == a) & (xyz == x)).sum()) for x in 'XYZ'] for a in 'ABC'],
        pay=[[r(100 * c.loc[(abc == a) & (xyz == x), 'TALEP_25'].sum() / T25, 1) for x in 'XYZ'] for a in 'ABC'],
        yontem=['Klasik yöntemler (üstel düzeltme) yeterli',
                'SBA + Poisson emniyet stoğu',
                'Croston/SBA + Poisson emniyet stoğu — kesikli talep rejimi'],
    )

    # ------------------------------------------- ML hata analizi + tahmin gezgini verisi
    piv = meta['ceyrek'].loc[c.index]                      # PN başına Q1..Q4 (build sırasına göre)
    pthy = q.pivot_table(index='PN', columns='CEYREK', values='THY_TALEP_ADET', aggfunc='sum').loc[c.index]
    q4 = piv.Q4.values.astype(float)
    ma3 = piv[['Q1', 'Q2', 'Q3']].mean(axis=1).values
    sba4 = np.array([core.sba_rate(row.astype(float)) for row in piv[['Q1', 'Q2', 'Q3']].values])
    ml_path = os.path.join(HERE, 'model_results.json')
    ml = json.load(open(ml_path, encoding='utf-8')) if os.path.exists(ml_path) else None
    nn4 = None
    ml_seg = None
    if ml and 'pred_pn' in ml:
        pmap = dict(zip(ml['pred_pn']['pn'], ml['pred_pn']['pred']))
        nn4 = np.array([pmap.get(ix, np.nan) for ix in c.index], float)
        def mae_of(mask):
            m = mask & ~np.isnan(nn4)
            return (r(np.abs(nn4[m] - q4[m]).mean(), 2), r(np.abs(sba4[m] - q4[m]).mean(), 2),
                    r(np.abs(ma3[m] - q4[m]).mean(), 2), int(m.sum()))
        def seg(pairs):
            out = dict(ad=[], nn=[], sba=[], ma3=[], n=[])
            for ad, mask in pairs:
                a, b_, d, n = mae_of(np.asarray(mask))
                out['ad'].append(ad); out['nn'].append(a); out['sba'].append(b_)
                out['ma3'].append(d); out['n'].append(n)
            return out
        ml_seg = dict(
            kesiklilik=seg([('Kesikli talep', c.KESIKLI.values), ('Düzenli talep', ~c.KESIKLI.values)]),
            kritiklik=seg([(k, (c.KRITIK == k).values) for k in kr_sira]),
            hacim=seg([('A — yüksek hacim', (abc == 'A').values), ('B — orta', (abc == 'B').values),
                       ('C — düşük', (abc == 'C').values)]),
        )

    # ------------------------------------------------- cold-start canlı demo örneği
    # Üçlü tehlike (AOG kritik + kabiliyetsiz + yeni nesil) içinden, analog grup öncülünün
    # gerçekten EN ÇOK saptığı PN seçilir — Bayes güncellemesinin düzeltici gücü görünür olsun.
    uclu = c[c.UCLU_TEHLIKE & (c.TALEP_25 >= 8)]
    grp_mean = c.groupby(['SUB', 'FAMILY']).TALEP_25.transform('mean')   # PN kendisi dahil (yaklaşık öncül)
    sapma = ((grp_mean.loc[uclu.index] - uclu.TALEP_25).abs() /
             uclu.TALEP_25.clip(lower=1)).sort_values(ascending=False, kind='stable')
    cs_pn = sapma.index[0]
    grup = c[(c.SUB == c.loc[cs_pn, 'SUB']) & (c.FAMILY == c.loc[cs_pn, 'FAMILY']) & (c.index != cs_pn)]
    coldstart = dict(
        pn=cs_pn.replace('PN-', ''), sub=c.loc[cs_pn, 'SUB'], mdl=c.loc[cs_pn, 'MODEL'],
        q=[int(v) for v in piv.loc[cs_pn, ['Q1', 'Q2', 'Q3', 'Q4']]],
        prior=r(grup.TALEP_25.mean() / 4, 2),              # analog grubun ortalama çeyrek talebi
        gercek=r(c.loc[cs_pn, 'TALEP_25'] / 4, 2),
        grup_n=len(grup), grup_ad=f"{c.loc[cs_pn, 'SUB']} × {c.loc[cs_pn, 'FAMILY']}",
    )

    # ------------------------------------------------- dayanıklılık histogramları
    aktif_tts = c.loc[c.TALEP_25 > 0, 'TTS']
    tts_edges = [0, 30, 60, 90, 120, 150, 180, 240, 300, 365]
    tts_counts = np.histogram(aktif_tts.clip(upper=1e9), bins=tts_edges + [np.inf])[0]
    tts_hist = dict(etiket=[f'{a}–{b}' for a, b in zip(tts_edges, tts_edges[1:])] + ['365+'],
                    sayi=[int(v) for v in tts_counts])
    fc = c.FMV_CLP.dropna()
    fc_counts, fc_edges = np.histogram(fc, bins=14)
    fmv_clp_hist = dict(etiket=r(((fc_edges[:-1] + fc_edges[1:]) / 2), 3),
                        sayi=[int(v) for v in fc_counts], medyan=r(fc.median(), 3))

    # =====================================================================
    # DERİN ANALİZ KATMANI — Monte Carlo · duyarlılık · optimizasyon · backtest
    # Hepsi deterministik (sabit tohum); jüri önünde yeniden üretilebilir.
    # =====================================================================
    rng = np.random.default_rng(42)
    lead = c.LEAD.values.astype(float)
    svc_v = c.SVC.values.astype(float)
    clp_v = c.CLP_USD.values.astype(float)
    kr_idx = c.KRITIK.map({k: i for i, k in enumerate(kr_sira)}).values
    rate33 = c.Q_RATE_33.values.astype(float)                 # çeyreklik oran (PN motoru)
    mu33 = rate33 * lead / P['ceyrek_gun']                    # lead-time penceresi beklenen talebi
    yeni_v = c.YENI_NESIL.values
    dis_v = c.ATOLYE.eq('YOK').values

    # ---- (1) Monte Carlo: 2033 belirsizliği ------------------------------
    # Her denemede: bant içinden küresel büyüme çarpanı u ~ U(alt/motor, üst/motor)
    # + Poisson talep gürültüsü. Metrik: lead-time talebi bugünkü kullanılabilir stoğu
    # aşan PN sayısı ve açığı kapatma maliyeti. Motor krizi: yeni nesil ×1,5 + dış lead ×1,3.
    T = 800
    u_lo, u_hi = band['alt'] / band['motor'], band['ust'] / band['motor']

    def mc_kosu(kriz=False):
        mult = np.ones(len(c))
        mu = mu33.copy()
        if kriz:
            mult = np.where(yeni_v, 1.5, 1.0)
            mu = rate33 * mult * np.where(dis_v, lead * 1.3, lead) / P['ceyrek_gun']
        u = rng.uniform(u_lo, u_hi, size=(T, 1))
        talep = rng.poisson(mu[None, :] * u)                  # (T, 5000)
        acik = talep > svc_v[None, :]
        eksik = np.maximum(0, talep - svc_v[None, :])
        return dict(
            acik_ort=int(acik.sum(1).mean()),
            acik_p10=int(np.percentile(acik.sum(1), 10)), acik_p90=int(np.percentile(acik.sum(1), 90)),
            ek_ort=float((eksik * clp_v[None, :]).sum(1).mean() / 1e6),
            ek_p90=float(np.percentile((eksik * clp_v[None, :]).sum(1), 90) / 1e6),
            dagilim=acik.sum(1),
        )

    mc_baz, mc_motor = mc_kosu(False), mc_kosu(True)
    # kapalı form doğrulaması: P(D > SVC) analitik vs simülasyon frekansı
    from math import exp
    def pois_sf(mu_i, s_i):
        if mu_i <= 0:
            return 0.0
        if mu_i > 120:                                        # normal yaklaşım
            return float(1 - 0.5 * (1 + np.tanh(np.sqrt(np.pi / 8) *
                         ((s_i + .5 - mu_i) / np.sqrt(mu_i)) * (1 + .044715 * ((s_i + .5 - mu_i) / np.sqrt(mu_i))**2))))
        term, cdf = exp(-mu_i), exp(-mu_i)
        for k in range(1, int(s_i) + 1):
            term *= mu_i / k
            cdf += term
        return max(0.0, 1 - cdf)
    orta = float((u_lo + u_hi) / 2)
    an_p = np.array([pois_sf(m * orta, s_) for m, s_ in zip(mu33, svc_v)])
    u_all = rng.uniform(u_lo, u_hi, size=(400, 1))
    mc_p = (rng.poisson(mu33[None, :] * u_all) > svc_v[None, :]).mean(0)
    uyum = float(100 * (1 - np.abs(an_p - mc_p).mean()))
    hist_edges = np.histogram_bin_edges(np.concatenate([mc_baz['dagilim'], mc_motor['dagilim']]), bins=14)
    mc = dict(
        trials=T,
        baz={k: (r(v, 1) if isinstance(v, float) else v) for k, v in mc_baz.items() if k != 'dagilim'},
        motor={k: (r(v, 1) if isinstance(v, float) else v) for k, v in mc_motor.items() if k != 'dagilim'},
        hist=dict(etiket=r(((hist_edges[:-1] + hist_edges[1:]) / 2), 0),
                  baz=[int(v) for v in np.histogram(mc_baz['dagilim'], bins=hist_edges)[0]],
                  motor=[int(v) for v in np.histogram(mc_motor['dagilim'], bins=hist_edges)[0]]),
        uyum=r(uyum, 1),
    )

    # ---- (2) Tornado duyarlılık: 2033 açığı kapatma maliyeti -------------
    # Metrik: Σ max(0, MIN33 − SVC) × CLP  (yalnız yeni alım varsayımı, $M)
    def acik_maliyet(rate, lead_v, hedef_kaydir=0.0):
        muL = rate * lead_v / P['ceyrek_gun']
        h = np.clip(c.SERVIS_HEDEFI.values + hedef_kaydir, .5, .995)
        ss = core.poisson_emniyet_stogu(muL, h)
        min_v = np.ceil(muL) + ss
        return float((np.maximum(0, min_v - svc_v) * clp_v).sum() / 1e6)

    t_baz = acik_maliyet(rate33, lead)
    kab_lead = np.where(c.RISK_LISTESI.values, float(P['kabiliyet_hedef_tat']), lead)
    tornado = dict(baz=r(t_baz, 1), etiket=[], dusuk=[], yuksek=[])
    for ad, lo, hi in [
        ('Talep bandı (alt ↔ üst uç)', acik_maliyet(rate33 * u_lo, lead), acik_maliyet(rate33 * u_hi, lead)),
        ('Tedarik süreleri ±%20', acik_maliyet(rate33, lead * .8), acik_maliyet(rate33, lead * 1.2)),
        ('Servis hedefi −2 ↔ +1 puan', acik_maliyet(rate33, lead, -.02), acik_maliyet(rate33, lead, +.01)),
        ('Kabiliyet yatırımı (547 → iç tamir)', acik_maliyet(rate33, kab_lead), t_baz),
    ]:
        tornado['etiket'].append(ad)
        tornado['dusuk'].append(r(min(lo, hi), 1))
        tornado['yuksek'].append(r(max(lo, hi), 1))

    # ---- (3) Bütçe-kısıtlı stok önceliklendirme (açgözlü sınır eğrisi) ---
    # Her PN'de SVC'den MIN33'e kadar her ek adet için marjinal fayda:
    #   Δ = kritiklik ağırlığı × P(lead-time talebi > s)  /  CLP  (dolar başına risk azaltımı)
    w_map = np.array([P['krit_agirlik'][k] for k in kr_sira])
    adim_f, adim_c, adim_pn = [], [], []
    min33_v = c.MIN_2033.values
    gerek = np.maximum(0, np.minimum(np.ceil(min33_v) - svc_v, 60)).astype(int)   # tam sayı alım hedefi
    for i in range(len(c)):
        need = int(gerek[i])
        if need == 0 or clp_v[i] <= 0:
            continue
        mu_i = mu33[i] * orta
        # kümülatif CDF'i SVC'den başlayarak yürüt
        if mu_i <= 0:
            continue
        s0 = int(svc_v[i])
        if mu_i > 120:
            sf = lambda s_: pois_sf(mu_i, s_)
            for st_ in range(s0, s0 + need):
                adim_f.append(w_map[kr_idx[i]] * sf(st_) / clp_v[i]); adim_c.append(clp_v[i]); adim_pn.append(i)
        else:
            term, cdf = exp(-mu_i), exp(-mu_i)
            for k in range(1, s0 + need + 1):
                term *= mu_i / k
                if k > s0:
                    adim_f.append(w_map[kr_idx[i]] * max(0., 1 - (cdf)) / clp_v[i])
                    adim_c.append(clp_v[i]); adim_pn.append(i)
                cdf += term
    adim_f = np.array(adim_f); adim_c = np.array(adim_c); adim_pn = np.array(adim_pn)
    sira = np.argsort(-adim_f)
    kum_c = np.cumsum(adim_c[sira]) / 1e6
    kum_g = np.cumsum(adim_f[sira] * adim_c[sira])            # ağırlıklı beklenen-karşılanamama azalımı
    kum_g = 100 * kum_g / kum_g[-1]
    # PN başına alınan adet MIN33'e ulaştıkça "kapanan" sayısı
    alinan = np.zeros(len(c), dtype=int); kapanan = np.zeros(len(sira))
    kap = 0
    for n, j in enumerate(sira):
        i = adim_pn[j]; alinan[i] += 1
        if alinan[i] == gerek[i]:
            kap += 1
        kapanan[n] = kap
    orn = np.unique(np.linspace(0, len(sira) - 1, 60).astype(int))
    ilk_pn, gor = [], set()
    for j in sira:
        i = int(adim_pn[j])
        if i not in gor:
            gor.add(i)
            ilk_pn.append(i)
        if len(ilk_pn) == 10:
            break
    opt = dict(
        butce=r(kum_c[orn], 2), kazanc=r(kum_g[orn], 1), kapanan=[int(v) for v in kapanan[orn]],
        toplam_butce=r(float(kum_c[-1]), 1), toplam_adim=int(len(sira)),
        ilk10=[dict(pn=c.index[i].replace('PN-', ''), sub=c.SUB.iloc[i], krit=c.KRITIK.iloc[i],
                    adet=int(gerek[i]), maliyet=r(float(gerek[i] * clp_v[i]), 0),
                    stokout=r(100 * an_p[i], 1))
               for i in ilk_pn],
    )

    # ---- (4) Backtest: Q3'ü Q1–Q2 ile tahmin et — iki düzeyli dürüst sonuç ----
    # PN düzeyinde mevsim katsayısı MAE'yi değiştirmez (talep kesikli: %14,6 sıfır çeyrek);
    # TOPLAM (bütçe/kapasite) düzeyinde ise katsayı hatayı belirgin düşürür. İkisi de gösterilir.
    q3g = piv.Q3.values.astype(float)
    naive_bt = piv.Q2.values.astype(float)
    ma2_bt = piv[['Q1', 'Q2']].mean(axis=1).values
    sba_bt = np.array([core.sba_rate(row.astype(float)) for row in piv[['Q1', 'Q2']].values])
    mevsim = 1 + kpi['q3_pct'] / 100
    top_g = float(q3g.sum())
    backtest = dict(
        ad=['Naive (Q2)', '2Ç ortalaması', 'SBA', 'SBA × mevsim katsayısı'],
        mae=[r(float(np.abs(p_ - q3g).mean()), 2) for p_ in (naive_bt, ma2_bt, sba_bt, sba_bt * mevsim)],
        katsayi=r(mevsim, 2),
        toplam_gercek=int(top_g),
        toplam=[int(p_.sum()) for p_ in (naive_bt, ma2_bt, sba_bt, sba_bt * mevsim)],
        toplam_hata=[r(100 * abs(float(p_.sum()) - top_g) / top_g, 1)
                     for p_ in (naive_bt, ma2_bt, sba_bt, sba_bt * mevsim)],
    )

    # ------------------------------------------------------------ PN dizileri
    s = c.sort_values('RISK', ascending=False)
    kmap = {k: i for i, k in enumerate(kr_sira)}   # 0=AOG KRİTİK, 1=KRİTİK, 2=KRİTİK DEĞİL — lookup.kr ile aynı sıra
    subs = sorted(c.SUB.unique())
    models = sorted(c.MODEL.unique())
    pn = dict(
        id=[x.replace('PN-', '') for x in s.index],
        sub=[subs.index(v) for v in s.SUB], mdl=[models.index(v) for v in s.MODEL],
        kr=[kmap[v] for v in s.KRITIK],
        ato=[1 if v == 'VAR' else 0 for v in s.ATOLYE],
        lead=r(s.LEAD, 0), ttr=r(s.TTR, 0),
        t25=r(s.TALEP_25, 0), t33=r(s.TALEP_33, 1), rate33=r(s.Q_RATE_33, 3),
        svc=r(s.SVC, 0), gay=r(s.GAYRIFAAL_ADET, 0), tam=r(s.TAMIRDE, 0), po=r(s.ACIK_SATINALMA_ADET, 0),
        tts=r(s.TTS.replace(np.inf, 9999).clip(upper=9999), 0),
        min33=r(s.MIN_2033, 0), max33=r(s.MAX_2033, 0), min25=r(s.MIN_2025, 0),
        risk=r(s.RISK, 1), clp=r(s.CLP_USD, 0), fmv=r(s.FMV_USD, 0),
        disrep=r(s.YURTDISI_TAMIR_MALIYETI_USD, 0), icrep=r(s.YURTICI_TAMIR_MALIYETI_USD, 0),
        tic=r(s.TAT_IC, 0), tdis=r(s.TAT_DIS, 0), tsat=r(s.TAT_SAT, 0),
        exin=r(s.EXCHANGE_IN_ADET, 0), exout=r(s.EXCHANGE_OUT_ADET, 0),
        sh=r(s.SERVIS_HEDEFI, 2),
        scrap=r(s.SCRAP_25, 0),
        ata=r(s.ATA, 0),
        # tahmin gezgini: çeyrek talepleri (toplam + THY/Pool kırılımı) + sinir ağının Q4 tahmini
        q1=r(piv.loc[s.index, 'Q1'], 0), q2=r(piv.loc[s.index, 'Q2'], 0),
        q3=r(piv.loc[s.index, 'Q3'], 0), q4=r(piv.loc[s.index, 'Q4'], 0),
        tq1=r(pthy.loc[s.index, 'Q1'], 0), tq2=r(pthy.loc[s.index, 'Q2'], 0),
        tq3=r(pthy.loc[s.index, 'Q3'], 0), tq4=r(pthy.loc[s.index, 'Q4'], 0),
        nn4=(r(pd.Series(nn4, index=c.index).loc[s.index], 2) if nn4 is not None else [None] * len(s)),
        # bit0 kırmızı · bit1 siparişsiz · bit2 risk listesi (547) · bit3 BER · bit4 phase-out
        # bit5 yeni nesil · bit6 hurda anomalisi · bit7 pool bağımlı
        flags=[int(a) | (int(b) << 1) | (int(d) << 2) | (int(e) << 3) | (int(f) << 4)
               | (int(g) << 5) | (int(h) << 6) | (int(i2) << 7)
               for a, b, d, e, f, g, h, i2 in zip(s.KIRMIZI, s.SIPARISSIZ, s.RISK_LISTESI,
                                                  s.BER, s.PHASE_OUT, s.YENI_NESIL,
                                                  s.SCRAP_ANOMALI, s.POOL_BAGIMLI)],
    )
    sub2ata = c.groupby('SUB').ATA.first()
    lookup = dict(sub=subs, mdl=models, kr=kr_sira, ata=[int(sub2ata[x]) for x in subs])

    # ------------------------------------------- kabiliyet ROI sıralayıcısı (demo kapanışı)
    rd = c[c.RISK_LISTESI].copy()
    rd['HARCAMA'] = rd.TALEP_25 * rd.YURTDISI_TAMIR_MALIYETI_USD
    rd = rd.sort_values('KAB_TASARRUF', ascending=False).head(40)
    roi = dict(
        id=[x.replace('PN-', '') for x in rd.index],
        sub=rd.SUB.tolist(), mdl=rd.MODEL.tolist(),
        t25=r(rd.TALEP_25, 0), tdis=r(rd.TAT_DIS, 0),
        harcama=r(rd.HARCAMA, 0), tasarruf=r(rd.KAB_TASARRUF, 0), sermaye=r(rd.KAB_SERMAYE, 0),
        uclu=[bool(v) for v in rd.UCLU_TEHLIKE],
    )

    # ------------------------------------- ML sonuçları (pred_pn payload'a ayrıca girmez —
    # tahminler zaten pn.nn4'te; burada eğri/metrik/scatter gömülür, eğitim eğrisi seyreltilir)
    ml_out = None
    if ml:
        ml_out = {k: ml[k] for k in ('history', 'metrics', 'scatter') if k in ml}
        h = ml_out.get('history', {})
        if len(h.get('epoch', [])) > 60:
            k = max(1, len(h['epoch']) // 60)
            for key in ('epoch', 'train', 'test'):
                h[key] = h[key][::k]

    return dict(kpi=kpi, band=band_out, model=model_ser, kat=kat_ser, ceyrek=ceyrek,
                riskHist=risk_hist, pareto=pareto, harita=harita, pn=pn,
                lookup=lookup, roi=roi, ml=ml_out, mlSeg=ml_seg, abcxyz=abcxyz,
                coldstart=coldstart, ttsHist=tts_hist, fmvClpHist=fmv_clp_hist,
                mc=mc, tornado=tornado, opt=opt, backtest=backtest, params=P)


def render(payload: dict) -> str:
    read = lambda p: open(os.path.join(HERE, p), encoding='utf-8').read()
    chartjs = read('vendor/chart.umd.js')
    css = read('assets/app.css')
    js = read('assets/app.js')
    data = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
    return f"""<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Catalyst — Komponent Envanter Karar Desteği</title>
<style>{css}</style></head>
<body>
<script>{chartjs}</script>
<script>const DATA={data};</script>
<script>{js}</script>
</body></html>"""


if __name__ == '__main__':
    p = build_payload()
    html = render(p)
    open(OUT, 'w', encoding='utf-8').write(html)
    kb = len(html.encode()) // 1024
    print(f'✓ {os.path.basename(OUT)} yazıldı — {kb:,} KB')
    print(f"  PN {p['kpi']['pn']:,} · kırmızı {p['kpi']['kirmizi']} "
          f"(siparişsiz {p['kpi']['siparissiz']}) · envanter ${p['kpi']['fmv']}M "
          f"· bant +%{p['band']['alt_pct']:.0f}–{p['band']['ust_pct']:.0f}")
