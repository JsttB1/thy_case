/**
 * tr-TR sayı ve metin biçimleyicileri.
 * Kural (CLAUDE.md §10): arayüzde ondalık VİRGÜL, kodda nokta.
 */

export const fmt = (n: number): string => Math.round(n).toLocaleString('tr-TR');

export const f1 = (n: number): string =>
  Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const f2 = (n: number): string =>
  Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** milyon dolar: 132.9 → "$132,9M" */
export const mM = (n: number): string => '$' + f1(n) + 'M';

/** tam dolar: 7338 → "$7.338" */
export const mUsd = (n: number): string => '$' + fmt(n);

export const pct = (n: number, d = 1): string =>
  '%' + Number(n).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

/** ondalık noktayı virgüle çevirir — sabit metinlerdeki eşik değerleri için */
export const vir = (n: number | string): string => String(n).replace('.', ',');

/** gün etiketi */
export const gun = (n: number): string => fmt(n) + ' g';

/**
 * Türkçe arama katlaması: "İ/ı/ş/ğ/ü/ö/ç" farkı arama sonucunu bozmasın.
 * (toLocaleLowerCase('tr') tek başına yetmez; kullanıcı "sasi" yazıp "şasi" bulmalı.)
 */
const KATLA: Record<string, string> = {
  ı: 'i',
  İ: 'i',
  ş: 's',
  Ş: 's',
  ğ: 'g',
  Ğ: 'g',
  ü: 'u',
  Ü: 'u',
  ö: 'o',
  Ö: 'o',
  ç: 'c',
  Ç: 'c',
};
export const foldTr = (s: string): string =>
  s.replace(/[ıİşŞğĞüÜöÖçÇ]/g, (ch) => KATLA[ch]).toLowerCase();
