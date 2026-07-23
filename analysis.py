import pandas as pd, numpy as np, json

import os
HERE=os.path.dirname(os.path.abspath(__file__))
DATA=HERE+'/'
df = pd.read_csv(DATA+'dummy_pn_quarterly_data.csv', encoding='utf-8-sig')
fleet = pd.read_csv(DATA+'fleet_distribution.csv', encoding='utf-8-sig')

# ---------- 1. per-PN aggregation ----------
df['TOPLAM_TALEP'] = df.THY_TALEP_ADET + df.POOL_TALEP_ADET
attrs = df.groupby('PN').agg(
    ATA=('ATA_CHAPTER','first'), SUB=('SUB_CATEGORY','first'),
    FAMILY=('AIRCRAFT_FAMILY','first'), MODEL=('AIRCRAFT_MODEL','first'),
    ATOLYE=('ATOLYE_KABILIYETI','first'), TAT_IC=('YURTICI_TAT_GUN','first'),
    TAT_DIS=('YURTDISI_TAT_GUN','first'), TAT_SAT=('SATINALMA_TAT_GUN','first'),
    KRITIK=('KRITIKLIK_DURUMU','first'),
    THY_2025=('THY_TALEP_ADET','sum'), POOL_2025=('POOL_TALEP_ADET','sum'),
    SCRAP_2025=('SCRAP_ADET','sum'), TALEP_2025=('TOPLAM_TALEP','sum'),
).reset_index()

q = df.pivot_table(index='PN', columns='CEYREK', values='TOPLAM_TALEP', aggfunc='sum')
qs = q[['Q1','Q2','Q3','Q4']].values

# ---------- 2. SBA (Syntetos-Boylan) rate for intermittent series ----------
def sba_rate(x, alpha=0.3):
    nz = x > 0
    if nz.sum() == 0: return 0.0
    if nz.all(): return x.mean()
    sizes = x[nz]; idx = np.where(nz)[0]
    intervals = np.diff(np.concatenate([[-1], idx]))
    z, p = sizes[0], intervals[0]
    for s, i in zip(sizes[1:], intervals[1:]):
        z = z + alpha*(s - z); p = p + alpha*(i - p)
    return (1 - alpha/2) * z / p

attrs['Q_RATE_2025'] = [sba_rate(row.astype(float)) for row in qs]
attrs['INTERMITTENT'] = (qs == 0).any(axis=1)

# ---------- 3. scale to 2033 fleet ----------
fl = fleet.set_index('AIRCRAFT_MODEL')
attrs = attrs.merge(fl[['THY_2025_ADET','POOL_2025_ADET','THY_2033_ADET','POOL_2033_ADET',
                        'TOPLAM_2025_ADET','TOPLAM_2033_ADET']], left_on='MODEL', right_index=True)
attrs['GROWTH'] = attrs.TOPLAM_2033_ADET / attrs.TOPLAM_2025_ADET
tot25 = attrs.THY_2025 + attrs.POOL_2025
thy_share = np.where(tot25>0, attrs.THY_2025/tot25.replace(0,1), 0.7)
scale = (thy_share*(attrs.THY_2033_ADET/attrs.THY_2025_ADET) +
         (1-thy_share)*(attrs.POOL_2033_ADET/attrs.POOL_2025_ADET))
attrs['Q_RATE_2033'] = attrs.Q_RATE_2025 * scale
attrs['TALEP_2033_YIL'] = attrs.Q_RATE_2033 * 4

# ---------- 4. inventory ----------
attrs['LEAD_GUN'] = np.where(attrs.ATOLYE=='VAR', attrs.TAT_IC,
                             np.minimum(attrs.TAT_DIS, attrs.TAT_SAT))
attrs['TEMIN_KANALI'] = np.where(attrs.ATOLYE=='VAR', 'Yurtiçi tamir',
                        np.where(attrs.TAT_DIS<=attrs.TAT_SAT, 'Yurtdışı tamir', 'Satınalma'))
SL = {'AOG KRİTİK':0.98, 'KRİTİK':0.95, 'KRİTİK DEĞİL':0.90}
Z  = {'AOG KRİTİK':2.054, 'KRİTİK':1.645, 'KRİTİK DEĞİL':1.282}
attrs['SERVIS_HEDEFI'] = attrs.KRITIK.map(SL)
z = attrs.KRITIK.map(Z)
QDAYS = 91.25
lam_L = attrs.Q_RATE_2033 * attrs.LEAD_GUN / QDAYS
attrs['SS'] = np.ceil(z * np.sqrt(lam_L))
attrs['MIN_2033'] = np.ceil(lam_L) + attrs.SS
attrs['MAX_2033'] = attrs.MIN_2033 + np.ceil(attrs.Q_RATE_2033)
lam_L25 = attrs.Q_RATE_2025 * attrs.LEAD_GUN / QDAYS
attrs['MIN_2025'] = np.ceil(lam_L25) + np.ceil(z*np.sqrt(lam_L25))
attrs['MAX_2025'] = attrs.MIN_2025 + np.ceil(attrs.Q_RATE_2025)

# ---------- 5. AOG risk score ----------
krit_w = attrs.KRITIK.map({'AOG KRİTİK':1.0,'KRİTİK':0.6,'KRİTİK DEĞİL':0.2})
lead_n = (attrs.LEAD_GUN - attrs.LEAD_GUN.min())/(attrs.LEAD_GUN.max()-attrs.LEAD_GUN.min())
growth_n = np.clip((attrs.GROWTH - 1)/(attrs.GROWTH.max()-1), 0, 1)
atolye_n = (attrs.ATOLYE=='YOK').astype(float)
dem_n = np.clip(attrs.TALEP_2033_YIL / attrs.TALEP_2033_YIL.quantile(0.95), 0, 1)
attrs['RISK'] = (100*(0.35*krit_w + 0.25*lead_n + 0.20*growth_n + 0.10*atolye_n + 0.10*dem_n)).round(1)

# ---------- 6. scrap ----------
attrs['SCRAP_ORANI'] = np.where(attrs.TALEP_2025>0, attrs.SCRAP_2025/attrs.TALEP_2025, 0)
attrs['SCRAP_2033_YIL'] = attrs.SCRAP_ORANI * attrs.TALEP_2033_YIL

attrs.to_csv(os.path.join(HERE,'pn_2033_plan_full.csv'), index=False)

print('=== GENEL ===')
print('2025 yıllık talep:', int(attrs.TALEP_2025.sum()), '| 2033 tahmini:', int(attrs.TALEP_2033_YIL.sum()),
      '| büyüme: %', round(100*(attrs.TALEP_2033_YIL.sum()/attrs.TALEP_2025.sum()-1),1))
print('Min stok toplamı 2025:', int(attrs.MIN_2025.sum()), '-> 2033:', int(attrs.MIN_2033.sum()))
print('Max stok toplamı 2025:', int(attrs.MAX_2025.sum()), '-> 2033:', int(attrs.MAX_2033.sum()))
print('Scrap 2025:', int(attrs.SCRAP_2025.sum()), '-> 2033 tahmini:', int(attrs.SCRAP_2033_YIL.sum()))
print('\n=== RISK ===')
print('Risk>=70:', (attrs.RISK>=70).sum(), '| 50-70:', ((attrs.RISK>=50)&(attrs.RISK<70)).sum(), '| <50:', (attrs.RISK<50).sum())
cols=['PN','MODEL','SUB','KRITIK','ATOLYE','LEAD_GUN','GROWTH','TALEP_2025','TALEP_2033_YIL','MIN_2033','MAX_2033','RISK']
print('\nTop 10 riskli PN:')
print(attrs.nlargest(10,'RISK')[cols].round(1).to_string(index=False))
print('\n=== MODEL bazında ===')
m = attrs.groupby('MODEL').agg(t25=('TALEP_2025','sum'), t33=('TALEP_2033_YIL','sum'), g=('GROWTH','first')).round(1)
print(m.sort_values('t33', ascending=False).to_string())
print('\nIntermittent PN:', int(attrs.INTERMITTENT.sum()))
