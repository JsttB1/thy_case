import type { Demand, PnData } from '../data/types';
import type { PnRow } from './pnRows';

/**
 * AOG risk skorunun bileşenlerine ayrıştırılması.
 * build_data.py bölüm 5'teki formülün birebir karşılığı:
 *
 *   RISK = 100 × (0,35·kritiklik + 0,25·leadₙ + 0,20·büyümeₙ + 0,10·atölye + 0,10·talepₙ)
 *
 * Ağırlıklar ve normalizasyon sabitleri aynı olmalı, aksi halde kartta
 * gösterilen ayrıştırma tablodaki skoru tutmaz.
 */

export const AGIRLIK = {
  kritiklik: 0.35,
  lead: 0.25,
  buyume: 0.2,
  atolye: 0.1,
  talep: 0.1,
} as const;

const KRIT_W: Record<string, number> = {
  'AOG KRİTİK': 1.0,
  KRİTİK: 0.6,
  'KRİTİK DEĞİL': 0.2,
};

export interface RiskSabitleri {
  leadMin: number;
  leadMax: number;
  buyumeMax: number;
  talepQ95: number;
  buyumeByModel: Record<string, number>;
}

function quantile(sirali: number[], q: number): number {
  const pos = (sirali.length - 1) * q;
  const alt = Math.floor(pos);
  const ust = Math.ceil(pos);
  if (alt === ust) return sirali[alt];
  return sirali[alt] + (sirali[ust] - sirali[alt]) * (pos - alt);
}

/** Sabitler tüm 5.000 PN üzerinden bir kez hesaplanır, sonra memo'lanır. */
export function riskSabitleri(pn: PnData, demand: Demand): RiskSabitleri {
  const lead = pn.cols.lead;
  let leadMin = Infinity;
  let leadMax = -Infinity;
  for (let i = 0; i < lead.length; i++) {
    if (lead[i] < leadMin) leadMin = lead[i];
    if (lead[i] > leadMax) leadMax = lead[i];
  }

  const buyumeByModel: Record<string, number> = {};
  for (const m of demand.byModel) buyumeByModel[m.MODEL] = m.g;
  const buyumeMax = Math.max(...Object.values(buyumeByModel));

  // TALEP_2033_YIL = çeyreklik oran × 4
  const yillik = pn.cols.rate33.map((r) => r * 4).sort((a, b) => a - b);

  return { leadMin, leadMax, buyumeMax, talepQ95: quantile(yillik, 0.95), buyumeByModel };
}

export interface RiskBilesen {
  ad: string;
  /** 0–1 ham bileşen */
  ham: number;
  /** 100'lük skordaki katkısı */
  katki: number;
  agirlik: number;
  aciklama: string;
}

const clip01 = (v: number) => Math.max(0, Math.min(1, v));

export function riskAyristir(r: PnRow, s: RiskSabitleri): RiskBilesen[] {
  const kritHam = KRIT_W[r.krit] ?? 0.2;
  const leadHam =
    s.leadMax === s.leadMin ? 0 : clip01((r.lead - s.leadMin) / (s.leadMax - s.leadMin));
  const g = s.buyumeByModel[r.model] ?? 1;
  const buyumeHam = s.buyumeMax > 1 ? clip01((g - 1) / (s.buyumeMax - 1)) : 0;
  const atolyeHam = r.atolye ? 0 : 1;
  const talepHam = s.talepQ95 > 0 ? clip01((r.rate33 * 4) / s.talepQ95) : 0;

  return [
    {
      ad: 'Kritiklik',
      ham: kritHam,
      katki: 100 * AGIRLIK.kritiklik * kritHam,
      agirlik: AGIRLIK.kritiklik,
      aciklama: `${r.krit} → ağırlık ${kritHam.toLocaleString('tr-TR')}`,
    },
    {
      ad: 'Lead time',
      ham: leadHam,
      katki: 100 * AGIRLIK.lead * leadHam,
      agirlik: AGIRLIK.lead,
      aciklama: `${r.lead} gün · ${s.leadMin}–${s.leadMax} aralığında normalize`,
    },
    {
      ad: 'Filo büyümesi',
      ham: buyumeHam,
      katki: 100 * AGIRLIK.buyume * buyumeHam,
      agirlik: AGIRLIK.buyume,
      aciklama: `${r.model} filosu ×${g.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`,
    },
    {
      ad: 'Atölye yokluğu',
      ham: atolyeHam,
      katki: 100 * AGIRLIK.atolye * atolyeHam,
      agirlik: AGIRLIK.atolye,
      aciklama: r.atolye ? 'iç atölye kabiliyeti var' : 'iç atölye kabiliyeti yok',
    },
    {
      ad: 'Talep hacmi',
      ham: talepHam,
      katki: 100 * AGIRLIK.talep * talepHam,
      agirlik: AGIRLIK.talep,
      aciklama: `yılda ${(r.rate33 * 4).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} adet`,
    },
  ];
}

export const BILESEN_RENK: Record<string, string> = {
  Kritiklik: '#E81932',
  'Lead time': '#1A1D21',
  'Filo büyümesi': '#5A6472',
  'Atölye yokluğu': '#C77700',
  'Talep hacmi': '#8B94A3',
};
