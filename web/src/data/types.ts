/**
 * payload.json'un tip tanımı — build_dashboard.build_payload() çıktısının aynadaki hâli.
 *
 * Kaynak sıralaması ÖNEMLİ: `pn.*` dizileri risk skoruna göre azalan sıradadır
 * (build_dashboard.py: `s = c.sort_values('RISK', ascending=False)`), yani i indeksi
 * bütün dizilerde aynı parçayı gösterir. Kod bu varsayıma dayanır.
 */

/** Kritiklik sınıfı indeksi: 0 = AOG KRİTİK · 1 = KRİTİK · 2 = KRİTİK DEĞİL */
export type KrIdx = 0 | 1 | 2;

export interface Kpi {
  pn: number;
  // sermaye
  fmv: number;
  clp: number;
  fmv_clp_medyan: number;
  svc_adet: number;
  svc_fmv: number;
  gayrifaal_adet: number;
  gayrifaal_fmv: number;
  gayrifaal_tamir: number;
  tamirde_adet: number;
  tamirde_fmv: number;
  po_adet: number;
  po_clp: number;
  exch_in: number;
  exch_out: number;
  toplam_adet: number;
  // üç para musluğu
  scrap_butce: number;
  float_adet: number;
  float_fmv: number;
  float_fmv_33: number;
  phaseout: number;
  phaseout_pct: number;
  // bugünün sağlığı
  kirmizi: number;
  kirmizi_aog: number;
  siparissiz: number;
  siparissiz_aog: number;
  kapatma: number;
  tts_medyan: number;
  tts_q25: number;
  tts_q75: number;
  aktif_pn: number;
  fazla_pn: number;
  olu_pn: number;
  olu_adet: number;
  // talep & risk
  talep25: number;
  scrap25: number;
  scrap_oran: number;
  q3_pct: number;
  q1q4_pct: number;
  sifir_ceyrek: number;
  q3_krit: number[];
  scrap_anomali: number;
  scrap_anomali_max: number;
  pool_bagimli: number;
  pool_bagimli_pay: number;
  pool_pay: number;
  scrap_butce33: number;
  medyan_talep: number;
  kesikli: number;
  cv_medyan: number;
  risk_listesi: number;
  risk_listesi_pct: number;
  uclu: number;
  atolye_var: number;
  atolye_var_aog: number;
  tat_ic: number;
  tat_dis: number;
  tat_sat: number;
  tat_sat_max: number;
  kab_tasarruf: number;
  kab_sermaye: number;
  kab_bugun: number;
  ber_pn: number;
  ber_talep: number;
  deger_top20: number;
  deger_top500: number;
  deger_80_pn: number;
  adet_top20: number;
  adet_80_pn: number;
  min25: number;
  min33: number;
  max25: number;
  max33: number;
  acik33: number;
}

export interface Band {
  talep_2025: number;
  alt: number;
  ust: number;
  alt_pct: number;
  ust_pct: number;
  segment: number;
  model: number;
  motor: number;
  thy_ucak_basi: number;
  pool_ucak_basi: number;
}

/** 14 uçak modeli — hepsi paralel dizi, i indeksi aynı modeli gösterir. */
export interface ModelSer {
  ad: string[];
  t25: number[];
  t33: number[];
  pn: number[];
  deger: number[];
  u25: number[];
  u33: number[];
  thy25: number[];
  pool25: number[];
  thy33: number[];
  pool33: number[];
  yeni: boolean[];
  kucul: boolean[];
}

/** 26 ATA alt kategorisi */
export interface KatSer {
  ad: string[];
  t25: number[];
  t33: number[];
  pn: number[];
  deger: number[];
  buyume: number[];
  scrap_oran: number[];
  risk: number[];
  kirmizi: number[];
  svc: number[];
  sbutce: number[];
  sbutce33: number[];
  anomali: number[];
}

export interface CeyrekSer {
  ad: string[];
  thy: number[];
  pool: number[];
  scrap: number[];
}

export interface RotaParca {
  pn: string;
  sub: string;
  /** aday kaynak havalimanı kodları (depo transferi) */
  kay: string[];
  /** havuz ortağı hub kodları (exchange) */
  pool: string[];
  /** yeni satın alma TAT (gün) */
  alim: number;
}

export interface RotaSenaryo {
  ucak: string;
  hedef: string;
  parcalar: RotaParca[];
}

export interface Harita {
  kritiklik: string[];
  grup: { kod: string[]; ad: string[]; u25: number[]; u33: number[] };
  kod: string[];
  ad: string[];
  grp: string[];
  lat: number[];
  lon: number[];
  u25: number[];
  u33: number[];
  buyume: number[];
  pay25: number[];
  pay33: number[];
  dist: number[];
  yon: number[];
  yd: boolean[];
  depo: string[];
  kalem: number[];
  adet: number[];
  kapsam: number[];
  tsaat: number[];
  /** kritiklik sınıfı başına toplamlar — havalimanı payıyla çarpılıp dağıtılır */
  krTot: {
    talep25: number[];
    min33: number[];
    dis_bagimli: number[];
    svc: number[];
    kirmizi: number[];
  };
  ic_tamir_toplam: number;
  dis_tamir_toplam: number;
  rota: RotaSenaryo[];
}

/**
 * 5.000 parçanın kolon-bazlı (struct-of-arrays) gösterimi. Risk skoruna göre sıralı.
 * Kolon dizisi tercihi bilinçli: 5.000 nesne yerine 42 dizi → filtreleme/sıralama
 * döngüleri tahsisatsız çalışır, senaryo yeniden hesabı 60 fps'i korur.
 */
export interface PnSer {
  id: string[];
  /** lookup.sub indeksi */
  sub: number[];
  /** lookup.mdl indeksi */
  mdl: number[];
  kr: KrIdx[];
  /** atölye kabiliyeti: 1 = VAR */
  ato: number[];
  lead: number[];
  ttr: number[];
  t25: number[];
  t33: number[];
  rate33: number[];
  /** 2033 bandı: model bazlı uç */
  t33a: number[];
  /** 2033 bandı: THY/pool karışımı ucu */
  t33b: number[];
  svc: number[];
  gay: number[];
  tam: number[];
  po: number[];
  /** talep yoksa 9999 */
  tts: number[];
  min33: number[];
  max33: number[];
  min25: number[];
  risk: number[];
  clp: number[];
  fmv: number[];
  disrep: number[];
  /** atölye kabiliyeti yoksa null */
  icrep: (number | null)[];
  /** atölye kabiliyeti yoksa null */
  tic: (number | null)[];
  tdis: number[];
  tsat: number[];
  exin: number[];
  exout: number[];
  sh: number[];
  scrap: number[];
  ata: number[];
  q1: number[];
  q2: number[];
  q3: number[];
  q4: number[];
  tq1: number[];
  tq2: number[];
  tq3: number[];
  tq4: number[];
  /** sinir ağının Q4 tahmini (model_results.json yoksa null) */
  nn4: (number | null)[];
  /** bit maskesi — engine/flags.ts FL sabitleriyle okunur */
  flags: number[];
}

export interface Lookup {
  sub: string[];
  mdl: string[];
  kr: string[];
  ata: number[];
  /** modelin filo büyüme çarpanı (2033/2025) */
  mdl_b: number[];
}

export interface Roi {
  id: string[];
  sub: string[];
  mdl: string[];
  t25: number[];
  tdis: number[];
  harcama: number[];
  tasarruf: number[];
  sermaye: number[];
  uclu: boolean[];
}

export interface MlSonuc {
  history: { epoch: number[]; train: number[]; test: number[] };
  metrics: Record<string, { mae: number; rmse: number }>;
  scatter: { y: number[]; p: number[] };
}

export interface AbcXyz {
  abc: string[];
  xyz: string[];
  sayi: number[][];
  pay: number[][];
  yontem: string[];
}

export interface McKosu {
  acik_ort: number;
  acik_p10: number;
  acik_p90: number;
  ek_ort: number;
  ek_p90: number;
}

export interface Mc {
  trials: number;
  baz: McKosu;
  motor: McKosu;
  /** kapalı form ↔ deneme uyumu (%) */
  uyum: number;
}

export interface Tornado {
  baz: number;
  etiket: string[];
  dusuk: number[];
  yuksek: number[];
}

export interface Opt {
  butce: number[];
  kazanc: number[];
  kapanan: number[];
  toplam_butce: number;
  toplam_adim: number;
  ilk10: {
    pn: string;
    sub: string;
    krit: string;
    adet: number;
    maliyet: number;
    stokout: number;
  }[];
}

export interface Backtest {
  ad: string[];
  mae: number[];
  katsayi: number;
  toplam_gercek: number;
  toplam: number[];
  toplam_hata: number[];
}

export interface Params {
  krit_agirlik: Record<string, number>;
  servis_hedefi: Record<string, number>;
  ber_esigi: number;
  ic_dis_oran: number;
  kabiliyet_hedef_tat: number;
  alarm_tamponu: number;
  sba_alpha: number;
  ceyrek_gun: number;
}

export interface Payload {
  kpi: Kpi;
  band: Band;
  model: ModelSer;
  kat: KatSer;
  ceyrek: CeyrekSer;
  harita: Harita;
  pn: PnSer;
  lookup: Lookup;
  roi: Roi;
  ml: MlSonuc | null;
  abcxyz: AbcXyz;
  mc: Mc;
  tornado: Tornado;
  opt: Opt;
  backtest: Backtest;
  params: Params;
}
