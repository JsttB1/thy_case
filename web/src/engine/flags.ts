/**
 * Parça bayrakları — build_dashboard.py'deki bit maskesiyle BİREBİR.
 * (bit0 kırmızı · bit1 siparişsiz · bit2 dış tamire bağımlı · bit3 BER · bit4 phase-out
 *  bit5 yeni nesil · bit6 hurda anomalisi · bit7 pool bağımlı)
 */
import { PN } from '@/data/payload';

export const FL = {
  KIRMIZI: 1,
  SIP: 2,
  R547: 4,
  BER: 8,
  PO: 16,
  YENI: 32,
  SCRAPA: 64,
  POOLB: 128,
} as const;

export type FlagKey = keyof typeof FL;

export const hasF = (i: number, f: number): boolean => (PN.flags[i] & f) !== 0;

/**
 * Durum sütunu sıralama anahtarı — nokta rengiyle aynı öncelik:
 * siparişsiz > kırmızı > dış tamire bağımlı > BER > normal.
 */
export const DURUM: number[] = PN.id.map((_, i) =>
  hasF(i, FL.SIP) ? 4 : hasF(i, FL.KIRMIZI) ? 3 : hasF(i, FL.R547) ? 2 : hasF(i, FL.BER) ? 1 : 0,
);

/** Filtre tanımları — watchlist çipleri ve Karar Merkezi köprüleri aynı kaynağı kullanır. */
export const FILTRELER: { anahtar: FlagKey; etiket: string; ipucu: string }[] = [
  { anahtar: 'KIRMIZI', etiket: 'kırmızı', ipucu: 'dayanma süresi tedarik süresinden kısa' },
  { anahtar: 'SIP', etiket: 'siparişsiz', ipucu: 'kırmızı ve açık siparişi yok' },
  { anahtar: 'R547', etiket: 'dış tamire bağımlı', ipucu: 'AOG kritik + iç tamir kabiliyeti yok' },
  {
    anahtar: 'BER',
    etiket: 'BER adayı',
    ipucu: 'dış tamir maliyeti / liste fiyatı eşiğin üstünde',
  },
  { anahtar: 'PO', etiket: 'phase-out', ipucu: 'küçülen 4 klasik modele bağlı' },
  { anahtar: 'YENI', etiket: 'yeni nesil', ipucu: 'büyüyen 5 modele bağlı — geçmişsiz talep' },
  { anahtar: 'SCRAPA', etiket: 'hurda anomalisi', ipucu: 'hurda oranı %20 üstü, talep ≥ 20' },
  { anahtar: 'POOLB', etiket: 'pool bağımlı', ipucu: 'talebin yarısından fazlası havuzdan' },
];
