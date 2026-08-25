/**
 * Tek veri giriş noktası.
 *
 * payload.json'u core.py + build_dashboard.py üretir (ya da
 * `node scripts/veri-cikar.mjs` catalyst.html'den ayıklar). Uygulamada
 * hesaplanmış hiçbir sayı elle yazılmaz — hepsi buradan ya da engine/'den gelir.
 */
import ham from './payload.json';
import type { Payload } from './types';

export const D = ham as unknown as Payload;

export const K = D.kpi;
export const B = D.band;
export const PN = D.pn;
export const LK = D.lookup;
export const PRM = D.params;
export const NPN = PN.id.length;

/** id → dizi indeksi (PN detayına köprü kurarken) */
export const PIDX: Record<string, number> = {};
PN.id.forEach((v, i) => {
  PIDX[v] = i;
});

export type { Payload } from './types';
