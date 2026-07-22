import type { Durum, GeriSayimDurum, Kritiklik, PnData } from '../data/types';
import { kalanGunDurum } from './countdown';
import { pnKod } from './format';

/**
 * pn.json kolonsal tutuluyor (≈3× küçük, senaryo motoru için doğrudan taranabilir).
 * Tablo ve çekmece satır bazlı düşünüyor — dönüşüm tek yerde.
 */
export interface PnRow {
  i: number;
  pn: string;
  model: string;
  sub: string;
  ata: number;
  krit: Kritiklik;
  kanal: string;
  atolye: boolean;
  lead: number;
  rate25: number;
  rate33: number;
  min25: number;
  max25: number;
  min33: number;
  max33: number;
  stock: number;
  pipeline: number;
  atil: number;
  clp: number;
  fmv: number;
  risk: number;
  kalan: number;
  z: number;
  /** türetilmiş */
  durum: Durum;
  geriSayim: GeriSayimDurum;
  acik: number;
  fazla: number;
  gunlukTalep: number;
}

export function pnSatir(d: PnData, i: number): PnRow {
  const c = d.cols;
  const stock = c.stock[i];
  const min33 = c.min33[i];
  const max33 = c.max33[i];

  return {
    i,
    pn: pnKod(c.pn[i]),
    model: d.dict.model[c.model[i]],
    sub: d.dict.sub[c.sub[i]],
    ata: c.ata[i],
    krit: d.dict.krit[c.krit[i]] as Kritiklik,
    kanal: d.dict.kanal[c.kanal[i]],
    atolye: c.atolye[i] === 1,
    lead: c.lead[i],
    rate25: c.rate25[i],
    rate33: c.rate33[i],
    min25: c.min25[i],
    max25: c.max25[i],
    min33,
    max33,
    stock,
    pipeline: c.pipeline[i],
    atil: c.atil[i],
    clp: c.clp[i],
    fmv: c.fmv[i],
    risk: c.risk[i],
    kalan: c.kalan[i],
    z: c.z[i],
    durum: stock < min33 ? 'AÇIK' : stock > max33 ? 'FAZLA' : 'DENGEDE',
    geriSayim: kalanGunDurum(c.kalan[i]),
    acik: Math.max(0, min33 - stock),
    fazla: Math.max(0, stock - max33),
    gunlukTalep: c.rate33[i] / 91.25,
  };
}

/** Tüm satırlar — 5.000 kayıt için ≈15 ms, bir kez üretilip memo'lanır. */
export function tumSatirlar(d: PnData): PnRow[] {
  const out = new Array<PnRow>(d.n);
  for (let i = 0; i < d.n; i++) out[i] = pnSatir(d, i);
  return out;
}

export function pnBul(d: PnData, kod: string): PnRow | null {
  const hedef = kod.replace(/^PN-/, '');
  const c = d.cols.pn;
  for (let i = 0; i < c.length; i++) {
    if (String(c[i]) === hedef) return pnSatir(d, i);
  }
  return null;
}

export interface PnFiltre {
  kritiklik: Kritiklik[];
  model: string[];
  durum: Durum[];
  arama: string;
}

/** Boş dizi = "hepsi". Filtreleme tek yerde, F22 ve F60 aynı davranışı paylaşır. */
export function filtrele(satirlar: PnRow[], f: PnFiltre): PnRow[] {
  const q = f.arama.trim().toLowerCase();
  return satirlar.filter((r) => {
    if (f.kritiklik.length && !f.kritiklik.includes(r.krit)) return false;
    if (f.model.length && !f.model.includes(r.model)) return false;
    if (f.durum.length && !f.durum.includes(r.durum)) return false;
    if (q && !r.pn.toLowerCase().includes(q) && !r.sub.toLowerCase().includes(q)) return false;
    return true;
  });
}
