import type { GeriSayimDurum, Kritiklik } from '../data/types';
import type { BadgeTone } from '../ui/Badge';

/**
 * Geri sayım eşikleri — spec 1.4 ve 3.3.
 * < 0 gecikmiş · < 30 acil · < 90 yaklaşıyor · üstü güvenli
 */
export const ESIK = { gecikmis: 0, acil: 30, yaklasiyor: 90 } as const;

export function durumdanEtiket(d: GeriSayimDurum): string {
  switch (d) {
    case 'GECIKMIS':
      return 'GECİKMİŞ';
    case 'ACIL':
      return 'ACİL';
    case 'YAKLASIYOR':
      return 'YAKLAŞIYOR';
    case 'GUVENLI':
      return 'GÜVENLİ';
  }
}

export function kalanGunDurum(kalan: number): GeriSayimDurum {
  if (kalan < ESIK.gecikmis) return 'GECIKMIS';
  if (kalan < ESIK.acil) return 'ACIL';
  if (kalan < ESIK.yaklasiyor) return 'YAKLASIYOR';
  return 'GUVENLI';
}

/** Açık zemin (tablo, kart) için Tailwind metin sınıfı. */
export function kalanGunRenk(kalan: number): string {
  const d = kalanGunDurum(kalan);
  return d === 'GECIKMIS'
    ? 'text-sig-crit'
    : d === 'ACIL'
      ? 'text-sig-warn'
      : d === 'GUVENLI'
        ? 'text-sig-ok'
        : 'text-tk-ink';
}

/** tk-ink zemin (F01 panosu) için — koyu zeminde okunabilir varyantlar. */
export function kalanGunRenkInk(kalan: number): string {
  const d = kalanGunDurum(kalan);
  return d === 'GECIKMIS'
    ? 'text-sig-crit-ink'
    : d === 'ACIL'
      ? 'text-sig-warn-ink'
      : d === 'GUVENLI'
        ? 'text-sig-ok-ink'
        : 'text-white';
}

export function durumTonu(d: GeriSayimDurum): BadgeTone {
  return d === 'GECIKMIS' ? 'crit' : d === 'ACIL' ? 'warn' : d === 'GUVENLI' ? 'ok' : 'neutral';
}

export function kritiklikTonu(k: Kritiklik): BadgeTone {
  return k === 'AOG KRİTİK' ? 'crit' : k === 'KRİTİK' ? 'warn' : 'neutral';
}

/** Dar hücrelerde "AOG KRİTİK" taşıyor — panoda kısaltılmışı kullanılır. */
export function kritiklikKisa(k: Kritiklik): string {
  return k === 'AOG KRİTİK' ? 'AOG KRİT' : k === 'KRİTİK' ? 'KRİTİK' : 'NORMAL';
}
