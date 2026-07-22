/**
 * tr-TR biçimleme yardımcıları (spec bölüm 6).
 * Binlik ayırıcı nokta, ondalık virgül. Para $142,7 M biçiminde kısaltılır.
 */

const nf = (min = 0, max = 0) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: min, maximumFractionDigits: max });

const int0 = nf(0, 0);
const dec1 = nf(1, 1);

/** 147264 → "147.264" */
export function sayi(v: number | null | undefined, ondalik = 0): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return nf(ondalik, ondalik).format(v);
}

/** 63.6 → "%63,6"  ·  tr-TR'de yüzde işareti önde yazılır */
export function yuzde(v: number | null | undefined, ondalik = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `%${nf(ondalik, ondalik).format(v)}`;
}

/** 63.6 → "+%63,6" (büyüme oranları için işaretli) */
export function yuzdeIsaretli(v: number | null | undefined, ondalik = 1): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v >= 0 ? '+' : '−'}%${nf(ondalik, ondalik).format(Math.abs(v))}`;
}

/**
 * Para kısaltma — 142702280 → "$142,7 M", 37233500 → "$37,2 M", 8400 → "$8.400"
 */
export function para(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const isaret = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000_000) return `${isaret}$${dec1.format(a / 1_000_000_000)} Mr`;
  if (a >= 1_000_000) return `${isaret}$${dec1.format(a / 1_000_000)} M`;
  if (a >= 100_000) return `${isaret}$${dec1.format(a / 1_000)} B`;
  return `${isaret}$${int0.format(Math.round(a))}`;
}

/** Kısaltmasız tam para: 37233500 → "$37.233.500" */
export function paraTam(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v < 0 ? '−' : ''}$${int0.format(Math.round(Math.abs(v)))}`;
}

/**
 * Eksen etiketi için adet. Milyon altı değerler tam yazılır —
 * "B" (bin) kısaltması eksende milyar gibi okunuyor, o yüzden kullanılmıyor.
 * 147264 → "147.264" · 2500000 → "2,5 M"
 */
export function adetKisa(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  const isaret = v < 0 ? '−' : '';
  if (a >= 1_000_000) return `${isaret}${dec1.format(a / 1_000_000)} M`;
  return `${isaret}${int0.format(Math.round(a))}`;
}

/**
 * Gün biçimleme — geri sayım için. Negatif değerlerde tipografik eksi (−) kullanılır,
 * ASCII tire değil: 52px Barlow Condensed'de tire çok cılız kalıyor.
 * -73.4 → "−73 gün"
 */
export function gun(v: number | null | undefined, ondalik = 0): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${gunSayi(v, ondalik)} gün`;
}

/** Sadece sayı kısmı — birim ayrı stillenecekse. -73.4 → "−73" */
export function gunSayi(v: number | null | undefined, ondalik = 0): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const yuvarlak = ondalik === 0 ? Math.round(v) : v;
  return `${yuvarlak < 0 ? '−' : ''}${nf(ondalik, ondalik).format(Math.abs(yuvarlak))}`;
}

/** "97g" — pano satırlarındaki dar lead time hücresi için */
export function leadKisa(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${int0.format(Math.round(v))}g`;
}

export const PN_ONEK = 'PN-';

/** pn.json kolonsal veride kod sayı olarak tutulur: 101058 → "PN-101058" */
export function pnKod(v: number | string): string {
  const s = String(v);
  return s.startsWith(PN_ONEK) ? s : PN_ONEK + s;
}
