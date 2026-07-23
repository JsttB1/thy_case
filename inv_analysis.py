import pandas as pd, numpy as np, json
import os
HERE=os.path.dirname(os.path.abspath(__file__))
DATA=HERE+'/'
plan = pd.read_csv(os.path.join(HERE,'pn_2033_plan_full.csv'))
inv = pd.read_csv(DATA+'dummy_pn_inventory_status.csv', encoding='utf-8-sig')

m = plan.merge(inv, on='PN', suffixes=('','_inv'))
assert len(m)==5000

# --- stock buckets ---
m['ELDE_SERVIS'] = m.FAAL_ADET + m.HOMEBASE_DEPO_ADET           # kullanılabilir (raf) stok
m['PIPELINE'] = m.YURTICI_TAMIRDE_ADET + m.YURTDISI_TAMIRDE_ADET + m.ACIK_SATINALMA_ADET + m.EXCHANGE_IN_ADET
m['ATIL'] = m.GAYRIFAAL_ADET
m['tamir_maliyeti'] = np.where(m.ATOLYE=='VAR', m.YURTICI_TAMIR_MALIYETI_USD, m.YURTDISI_TAMIR_MALIYETI_USD)

# --- capital ---
m['DEGER_FMV'] = m.TOPLAM_ENVANTER_ADET * m.FMV_USD
m['ATIL_DEGER'] = m.ATIL * m.FMV_USD
m['SERVIS_DEGER'] = m.ELDE_SERVIS * m.FMV_USD

# --- gap vs recommended min-max ---
m['ACIK_2033'] = np.clip(m.MIN_2033 - m.ELDE_SERVIS, 0, None)   # eksik (deficit)
m['FAZLA_2033'] = np.clip(m.ELDE_SERVIS - m.MAX_2033, 0, None)  # fazla (surplus)
m['ACIK_2025'] = np.clip(m.MIN_2025 - m.ELDE_SERVIS, 0, None)
m['DURUM'] = np.select(
    [m.ELDE_SERVIS < m.MIN_2033, m.ELDE_SERVIS > m.MAX_2033],
    ['AÇIK', 'FAZLA'], default='DENGEDE')
m['ACIK_MALIYET'] = m.ACIK_2033 * m.CLP_USD                     # açığı kapatma maliyeti (yeni alım)
m['FAZLA_BAGLI'] = m.FAZLA_2033 * m.FMV_USD                     # fazladan bağlı sermaye

# --- repair vs buy ---
m['TAMIR_VS_YENI'] = m.tamir_maliyeti / m.CLP_USD
m['SCRAP_ONERISI'] = m.TAMIR_VS_YENI > 0.7                      # tamir mantıksız -> scrap+yeni

# --- summaries ---
K = dict(
  pn=5000,
  deger_fmv=int(m.DEGER_FMV.sum()), deger_clp=int((m.TOPLAM_ENVANTER_ADET*m.CLP_USD).sum()),
  atil_adet=int(m.ATIL.sum()), atil_deger=int(m.ATIL_DEGER.sum()),
  pipeline_adet=int(m.PIPELINE.sum()),
  acik_pn=int((m.DURUM=='AÇIK').sum()), fazla_pn=int((m.DURUM=='FAZLA').sum()), denge_pn=int((m.DURUM=='DENGEDE').sum()),
  acik_pn_aog=int(((m.DURUM=='AÇIK')&(m.KRITIK=='AOG KRİTİK')).sum()),
  acik_adet=int(m.ACIK_2033.sum()), acik_maliyet=int(m.ACIK_MALIYET.sum()),
  fazla_adet=int(m.FAZLA_2033.sum()), fazla_bagli=int(m.FAZLA_BAGLI.sum()),
  scrap_oneri_pn=int(m.SCRAP_ONERISI.sum()),
  exchange_out_pn=int((m.EXCHANGE_OUT_ADET>0).sum()),
)
print(json.dumps(K, indent=1))

# durum x kritiklik
dk = m.pivot_table(index='DURUM', columns='KRITIK', values='PN', aggfunc='count', fill_value=0)
print('\n', dk)

# top açık PN (AOG öncelikli)
cols=['PN','MODEL','SUB','KRITIK','ELDE_SERVIS','MIN_2033','MAX_2033','ACIK_2033','PIPELINE','ATIL','CLP_USD','ACIK_MALIYET','RISK']
top_acik = m[m.DURUM=='AÇIK'].sort_values(['RISK','ACIK_MALIYET'],ascending=False).head(200)[cols]
top_fazla = m[m.DURUM=='FAZLA'].sort_values('FAZLA_BAGLI',ascending=False).head(100)[['PN','MODEL','SUB','KRITIK','ELDE_SERVIS','MAX_2033','FAZLA_2033','FMV_USD','FAZLA_BAGLI']]

m.to_csv(os.path.join(HERE,'pn_full_with_inventory.csv'), index=False)

# per-PN compact arrays for scenario engine (JS recompute)
zmap={'AOG KRİTİK':2.054,'KRİTİK':1.645,'KRİTİK DEĞİL':1.282}
scen = pd.DataFrame({
  'rate': m.Q_RATE_2033.round(3),           # çeyreklik talep oranı (2033)
  'lead': m.LEAD_GUN.astype(int),
  'z': m.KRITIK.map(zmap),
  'krit': m.KRITIK.map({'AOG KRİTİK':2,'KRİTİK':1,'KRİTİK DEĞİL':0}),
  'stock': m.ELDE_SERVIS.astype(int),
  'clp': m.CLP_USD.astype(int),
})
out = dict(
  kpi=K,
  durumKrit=dict(rows=dk.index.tolist(), cols=dk.columns.tolist(), vals=dk.values.tolist()),
  topAcik=top_acik.round(1).to_dict('records'),
  topFazla=top_fazla.round(1).to_dict('records'),
  scen=dict(rate=scen.rate.tolist(), lead=scen.lead.tolist(), z=scen.z.tolist(),
            krit=scen.krit.tolist(), stock=scen.stock.tolist(), clp=scen.clp.tolist()),
)
json.dump(out, open(os.path.join(HERE,'inv_data.json'),'w'), ensure_ascii=False)
print('\ninv_data.json KB:', len(json.dumps(out))//1024)
print('AÇIK sample:\n', top_acik.head(6).to_string(index=False))
