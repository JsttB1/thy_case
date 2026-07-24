import pandas as pd, numpy as np, json, math
import os
HERE=os.path.dirname(os.path.abspath(__file__))+'/'
m = pd.read_csv(HERE+'pn_full_with_inventory.csv')
QD=91.25
kw = m.KRITIK.map({'AOG KRİTİK':3,'KRİTİK':2,'KRİTİK DEĞİL':1})
zmap={'AOG KRİTİK':2.054,'KRİTİK':1.645,'KRİTİK DEĞİL':1.282}
z = m.KRITIK.map(zmap)

# ---------- 1. Readiness Score ----------
def readiness(minc, stock):
    cov = np.where(minc>0, np.minimum(stock/minc,1.0), 1.0)
    return round(100*np.average(cov, weights=kw),1)
r_today = readiness(m.MIN_2025, m.ELDE_SERVIS)
r_2033  = readiness(m.MIN_2033, m.ELDE_SERVIS)
# post-action: AOG-kritik + yüksek riskli açıkları MIN'e tamamla
stock_fixed = m.ELDE_SERVIS.copy().astype(float)
fixmask = (m.ELDE_SERVIS < m.MIN_2033) & ((m.KRITIK=='AOG KRİTİK') | (m.RISK>=70))
stock_fixed[fixmask] = m.MIN_2033[fixmask]
r_post = readiness(m.MIN_2033, stock_fixed)
fix_cost = int(((m.MIN_2033-m.ELDE_SERVIS)[fixmask]*m.CLP_USD[fixmask]).sum())
fix_n = int(fixmask.sum())

# ---------- 2. Fleet interpolation arrays (JS recompute) ----------
scen = dict(
  r25=m.Q_RATE_2025.round(4).tolist(), r33=m.Q_RATE_2033.round(4).tolist(),
  lead=m.LEAD_GUN.astype(int).tolist(), z=z.round(3).tolist(),
  krit=m.KRITIK.map({'AOG KRİTİK':2,'KRİTİK':1,'KRİTİK DEĞİL':0}).tolist(),
  stock=m.ELDE_SERVIS.astype(int).tolist(), clp=m.CLP_USD.astype(int).tolist(),
  fmv=m.FMV_USD.astype(int).tolist(), kw=kw.tolist())

# ---------- 3. stockout probability (Poisson/normal) ----------
def stockout_p(rate, lead, stock):
    lamL = rate*lead/QD
    if lamL<=0: return 0.0
    if lamL>60:  # normal approx P(X>stock)
        zc=(stock+0.5-lamL)/math.sqrt(lamL); return float(max(0,min(1,0.5*math.erfc(zc/math.sqrt(2)))))
    # exact Poisson P(X>stock)=1-sum_{k<=stock}
    s=0.0; t=math.exp(-lamL)
    for k in range(int(stock)+1):
        s+=t; t*=lamL/(k+1)
    return float(max(0,min(1,1-s)))
m['STOCKOUT_P']=[stockout_p(r,l,s) for r,l,s in zip(m.Q_RATE_2033,m.LEAD_GUN,m.ELDE_SERVIS)]

# ---------- 4. Days to Shortage ----------
daily=m.Q_RATE_2033/QD
m['GUN_KALAN']=np.where(daily>0, m.ELDE_SERVIS/daily, 9999)
m['GUN_KALAN']=m.GUN_KALAN.clip(upper=9999).round(0)

# bubble: top 450 by value/risk
bub = m.sort_values('RISK',ascending=False).head(450)
bubble=[dict(x=int(r.LEAD_GUN), y=round(r.STOCKOUT_P,3), v=int(r.FMV_USD*max(r.ELDE_SERVIS,1)),
             k=r.KRITIK, pn=r.PN, sub=r.SUB) for r in bub.itertuples()]

# days to shortage table: en yakın kritiğe düşecekler (açık olanlar öncelik)
dts = m[m.GUN_KALAN<180].sort_values(['GUN_KALAN','RISK']).head(200)
dtsrec=[dict(pn=r.PN,model=r.MODEL,sub=r.SUB,krit=r.KRITIK,stok=int(r.ELDE_SERVIS),
             ihtiyac=int(r.MIN_2033),gun=int(r.GUN_KALAN),risk=r.RISK,pipe=int(r.PIPELINE)) for r in dts.itertuples()]

# ---------- 5+6. Explainable AI + Next Best Action + Confidence ----------
def action(r):
    if r.SCRAP_ONERISI: return ('Scrap + yeni satın alma','Tamir maliyeti yeni alımın %70\'ini aşıyor; tamir ekonomik değil.')
    if r.ATOLYE=='VAR': return ('Yurtiçi tamiri hızlandır','Atölye kabiliyeti mevcut; TAT kısaltılarak pipeline hızlandırılır.')
    if r.POOL_2025>0 or r.EXCHANGE_IN_ADET>0: return ('Pool / exchange kullan','Pool talebi aktif; acil ihtiyaç pool anlaşmasıyla 1-2 günde karşılanabilir.')
    return ('Erken satın alma siparişi','Uzun tedarik süresi; MIN\'e ulaşmak için sipariş şimdi açılmalı.')
cards=[]
for r in m.sort_values('RISK',ascending=False).head(300).itertuples():
    growth_pct=round((r.GROWTH-1)*100)
    cov_days=int(r.GUN_KALAN)
    lead_wk=round(r.LEAD_GUN/7)
    reasons=[]
    if growth_pct>0: reasons.append(f'Beklenen talep %{growth_pct} artıyor (filo büyümesi)')
    reasons.append(f'Mevcut stok yalnızca ~{cov_days} günlük ihtiyacı karşılıyor')
    reasons.append(f'Tedarik süresi ~{lead_wk} hafta ({r.TEMIN_KANALI})')
    if r.ATOLYE=='YOK': reasons.append('Atölye kabiliyeti yok — dışa bağımlı')
    if r.KRITIK=='AOG KRİTİK': reasons.append('AOG KRİTİK — eksikliği uçağı yerde bırakır')
    if r.ATIL>0: reasons.append(f'{int(r.ATIL)} adet gayrifaal (arızalı) stok var')
    exp=r.TALEP_2033_YIL
    act,arat=action(r)
    # AOG risk before/after (risk skorunu %'ye eşle)
    aog_before=round(min(95, r.RISK)); aog_after=round(aog_before*0.25)
    cards.append(dict(pn=r.PN,model=r.MODEL,sub=r.SUB,krit=r.KRITIK,risk=r.RISK,
        stok=int(r.ELDE_SERVIS),min=int(r.MIN_2033),acik=int(max(r.MIN_2033-r.ELDE_SERVIS,0)),
        reasons=reasons, act=act, arat=arat,
        exp=round(exp), lo=round(exp*0.8), hi=round(exp*1.25),
        aog_b=aog_before, aog_a=aog_after,
        buy=int(r.CLP_USD), rep=int(r.tamir_maliyeti) if not math.isnan(r.tamir_maliyeti) else None,
        lead_wk=lead_wk, pool=(r.POOL_2025>0 or r.EXCHANGE_IN_ADET>0)))

# aggregate confidence band for total 2033 demand
tot=m.TALEP_2033_YIL.sum()
conf=dict(exp=int(tot), lo=int(tot*0.85), hi=int(tot*1.18))

K=dict(
  pn=5000, r_today=r_today, r_2033=r_2033, r_post=r_post,
  fix_n=fix_n, fix_cost=fix_cost,
  acik_pn=int((m.DURUM=='AÇIK').sum()), aog_acik=int(((m.DURUM=='AÇIK')&(m.KRITIK=='AOG KRİTİK')).sum()),
  atil_deger=int(m.ATIL_DEGER.sum()), fazla_bagli=int(m.FAZLA_BAGLI.sum()),
  deger_fmv=int(m.DEGER_FMV.sum()),
  next_short=int(dts.GUN_KALAN.min()) if len(dts) else 0,
  next_short_pn=dts.iloc[0].PN if len(dts) else '',
)
out=dict(kpi=K, scen=scen, bubble=bubble, dts=dtsrec, cards=cards, conf=conf)
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'ct_data.json'),'w'), ensure_ascii=False)
print('readiness today/2033/post:', r_today, r_2033, r_post)
print('fix:', fix_n, 'PN, $', f'{fix_cost:,}')
print('next shortage:', K['next_short'],'gün -', K['next_short_pn'])
print('bubble pts:', len(bubble), '| dts rows:', len(dtsrec), '| cards:', len(cards))
print('json KB:', len(json.dumps(out))//1024)
