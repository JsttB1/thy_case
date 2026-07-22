/**
 * web/public/data/*.json için veri sözleşmesi.
 * Tipler build_data.py çıktısındaki GERÇEK alan adlarından yazıldı — tahmin yok.
 */

export type DataKey =
  | 'kpi'
  | 'fleet'
  | 'demand'
  | 'risk'
  | 'inventory'
  | 'pn'
  | 'model_ml'
  | 'stations'
  | 'meta';

/* ── kpi.json ─────────────────────────────────────────────── */
export interface Kpi {
  pn: number;
  ucak2025: number;
  ucak2033: number;
  talep25: number;
  talep33: number;
  min25: number;
  min33: number;
  max25: number;
  max33: number;
  scrap25: number;
  scrap33: number;
  riskHigh: number;
  riskMid: number;
  alarm: number;
  alarmAog: number;
  intermittent: number;
  degerFmv: number;
  degerClp: number;
  atilAdet: number;
  atilDeger: number;
  pipelineAdet: number;
  acikPn: number;
  fazlaPn: number;
  dengePn: number;
  acikPnAog: number;
  acikAdet: number;
  acikMaliyet: number;
  fazlaAdet: number;
  fazlaBagli: number;
  scrapOneriPn: number;
  exchangeOutPn: number;
  gecikmisPn: number;
  acilPn: number;
  gecikmisAog: number;
  talepBuyume: number;
  filoBuyume: number;
  minBuyume: number;
}

/* ── fleet.json ───────────────────────────────────────────── */
export interface FleetModel {
  AIRCRAFT_FAMILY: string;
  AIRCRAFT_MODEL: string;
  THY_2025_ADET: number;
  POOL_2025_ADET: number;
  THY_2033_ADET: number;
  POOL_2033_ADET: number;
  TOPLAM_2025_ADET: number;
  TOPLAM_2033_ADET: number;
}

export interface Fleet {
  models: FleetModel[];
  toplam: { thy2025: number; pool2025: number; thy2033: number; pool2033: number };
}

/* ── demand.json ──────────────────────────────────────────── */
export interface DemandByModel {
  MODEL: string;
  t25: number;
  t33: number;
  g: number;
  risk: number;
  alarm: number;
  pn: number;
}

export interface DemandBySub {
  SUB: string;
  t25: number;
  t33: number;
  scrap: number;
  risk: number;
  pn: number;
  lead: number;
  scrapOran: number;
}

export interface Demand {
  quarterly: { labels: string[]; thy: number[]; pool: number[]; scrap: number[] };
  byModel: DemandByModel[];
  bySub: DemandBySub[];
  intermittentPn: number;
}

/* ── risk.json ────────────────────────────────────────────── */
export interface RiskPn {
  PN: string;
  MODEL: string;
  SUB: string;
  KRITIK: Kritiklik;
  ATOLYE: string;
  TEMIN_KANALI: string;
  LEAD_GUN: number;
  TALEP_2033_YIL: number;
  MIN_2033: number;
  MAX_2033: number;
  ELDE_SERVIS: number;
  ACIK_2033: number;
  KALAN_GUN: number;
  GERI_SAYIM_DURUM: GeriSayimDurum;
  RISK: number;
  CLP_USD: number;
}

export interface Risk {
  hist: { labels: string[]; vals: number[] };
  /** 26 alt kategori × 3 kritiklik seviyesi */
  heatmap: { rows: string[]; cols: string[]; vals: number[][] };
  topRisk: RiskPn[];
}

/* ── inventory.json ───────────────────────────────────────── */
export type Kritiklik = 'AOG KRİTİK' | 'KRİTİK' | 'KRİTİK DEĞİL';
export type Durum = 'AÇIK' | 'DENGEDE' | 'FAZLA';
export type GeriSayimDurum = 'GECIKMIS' | 'ACIL' | 'YAKLASIYOR' | 'GUVENLI';

export interface AcikPn extends RiskPn {
  ACIK_MALIYET: number;
  PIPELINE: number;
  ATIL: number;
}

export interface GeriSayimPn extends RiskPn {
  TUKENME_GUN: number;
  GUNLUK_TALEP: number;
}

export interface FazlaPn {
  PN: string;
  MODEL: string;
  SUB: string;
  KRITIK: Kritiklik;
  ELDE_SERVIS: number;
  MAX_2033: number;
  FAZLA_2033: number;
  FMV_USD: number;
  FAZLA_BAGLI: number;
}

export interface ScrapOneriPn {
  PN: string;
  SUB: string;
  KRITIK: Kritiklik;
  TAMIR_VS_YENI: number;
  CLP_USD: number;
  ATIL: number;
}

export interface Inventory {
  durumKrit: { rows: Durum[]; cols: Kritiklik[]; vals: number[][] };
  /** USD */
  sermaye: { servis: number; pipeline: number; atil: number; fazla: number };
  topAcik: AcikPn[];
  topFazla: FazlaPn[];
  /** KALAN_GUN'e göre artan sıralı — F01/F22 kaynağı */
  geriSayim: GeriSayimPn[];
  scrapOneri: ScrapOneriPn[];
}

/* ── pn.json (kolonsal) ───────────────────────────────────── */
export interface PnDict {
  krit: string[];
  model: string[];
  sub: string[];
  kanal: string[];
}

export interface PnCols {
  /** gerçek kod = "PN-" + pn[i] */
  pn: number[];
  model: number[];
  sub: number[];
  ata: number[];
  krit: number[];
  kanal: number[];
  atolye: number[];
  lead: number[];
  rate25: number[];
  rate33: number[];
  min25: number[];
  max25: number[];
  min33: number[];
  max33: number[];
  stock: number[];
  pipeline: number[];
  atil: number[];
  clp: number[];
  fmv: number[];
  risk: number[];
  kalan: number[];
  z: number[];
}

export interface PnData {
  n: number;
  dict: PnDict;
  cols: PnCols;
}

/* ── model_ml.json ────────────────────────────────────────── */
export interface ModelMl {
  history: { epoch: number[]; train: number[]; test: number[] };
  metrics: Record<string, { mae: number; rmse: number }>;
  scatter: { y: number[]; p: number[] };
}

/* ── stations.json ────────────────────────────────────────── */
export type DepoTipi = 'ana_depo' | 'ileri_depo' | 'hat_stok' | 'yok';

export interface Station {
  kod: string;
  ad: string;
  lat: number;
  lon: number;
  tip: string;
  ucak2025: number;
  ucak2033: number;
  depoTipi: DepoTipi;
  transferSaatIST: number;
  stokKalem: number;
  stokAdet: number;
  aogKapsam: number;
}

export interface Stations {
  stations: Station[];
  kapsamKatsayilari: Record<DepoTipi, number>;
}

/* ── meta.json ────────────────────────────────────────────── */
export interface Meta {
  baslik: string;
  altBaslik: string;
  kaynak: { pn: number; ceyrek: number; yil: number; hedefYil: number; model: number };
  yontem: string;
  uyari: string;
  /** t = terim, a = açıklama */
  sozluk: { t: string; a: string }[];
}

/** DataKey → o anahtarın çözümlenen tipi */
export interface DataMap {
  kpi: Kpi;
  fleet: Fleet;
  demand: Demand;
  risk: Risk;
  inventory: Inventory;
  pn: PnData;
  model_ml: ModelMl;
  stations: Stations;
  meta: Meta;
}
