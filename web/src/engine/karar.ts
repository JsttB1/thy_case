/**
 * KARAR MOTORU — 5.000 parça tek geçişte tek kanala düşer.
 *
 * Çıktısı Karar Merkezi'nin tamamını besler: kanal dağılımı, sipariş penceresi
 * alarmı, planlama ufku ve fazla stok dengeleme. Watchlist'teki tekil öneri de
 * aynı kanalSec() çağrısından gelir — toplu ekran ile parça ekranı çelişemez.
 *
 * Pencere = sipariş için kalan gün = dayanma süresi (TTS) − tedarik süresi (lead).
 * Negatifse sipariş çoktan açılmış olmalıydı.
 */
import { PN, NPN } from '@/data/payload';
import { kanalSec, KOVA, type Kova, type Pencere } from './ladder';

export interface KararSonuc {
  kanal: Kova[];
  pencere: Pencere[];
  /** sipariş için kalan gün (Infinity = talep yok) */
  kalan: number[];
  say: Record<'izle' | 'pool' | 'tamir' | 'alim', number>;
  mal: Record<'pool' | 'tamir' | 'alim', number>;
  pen: {
    gecmis: { n: number; mal: number; sip0: number; poVar: number };
    p030: { n: number; mal: number };
    p3090: { n: number; mal: number };
    p90: { n: number; mal: number };
  };
  /** penceresi geçmiş VE açık siparişi olmayan parçalar, en geciken önce */
  alarm: number[];
  /** en geç kalınmış parçanın gecikmesi (gün) */
  enGec: number;
  fazla: { idx: number[]; n: number; adet: number; deger: number };
  aksiyon: number;
  kapTop: number;
}

let onbellek: KararSonuc | null = null;

export function kararMotoru(): KararSonuc {
  if (onbellek) return onbellek;

  const kanal = new Array<Kova>(NPN);
  const pencere = new Array<Pencere>(NPN);
  const kalan = new Array<number>(NPN);
  const say = { izle: 0, pool: 0, tamir: 0, alim: 0 };
  const mal = { pool: 0, tamir: 0, alim: 0 };
  const pen: KararSonuc['pen'] = {
    gecmis: { n: 0, mal: 0, sip0: 0, poVar: 0 },
    p030: { n: 0, mal: 0 },
    p3090: { n: 0, mal: 0 },
    p90: { n: 0, mal: 0 },
  };
  const alarm: number[] = [];
  const fazlaIdx: number[] = [];
  let fazlaAdet = 0;
  let fazlaDeger = 0;
  let enGec = 0;

  for (let i = 0; i < NPN; i++) {
    const acik = Math.max(PN.min33[i] - PN.svc[i], 0);
    const k = (kalan[i] = PN.tts[i] >= 9999 ? Infinity : PN.tts[i] - PN.lead[i]);
    const p = (pencere[i] = k < 0 ? 'gecmis' : k < 30 ? 'p030' : k < 90 ? 'p3090' : 'p90');
    let kap = 0;
    if (acik === 0) {
      kanal[i] = 'izle';
      say.izle++;
    } else {
      const { best } = kanalSec(i);
      const kv = KOVA[best.t];
      kanal[i] = kv;
      say[kv as 'pool' | 'tamir' | 'alim']++;
      kap = acik * (best.m || 0);
      mal[kv as 'pool' | 'tamir' | 'alim'] += kap;
    }
    pen[p].n++;
    pen[p].mal += kap;
    if (p === 'gecmis') {
      if (PN.po[i] === 0) {
        pen.gecmis.sip0++;
        alarm.push(i);
        enGec = Math.max(enGec, -k);
      } else pen.gecmis.poVar++;
    }
    const fz = PN.svc[i] - PN.max33[i];
    if (fz > 0) {
      fazlaIdx.push(i);
      fazlaAdet += fz;
      fazlaDeger += fz * PN.fmv[i];
    }
  }

  alarm.sort((a, b) => kalan[a] - kalan[b]);
  fazlaIdx.sort(
    (a, b) => (PN.svc[b] - PN.max33[b]) * PN.fmv[b] - (PN.svc[a] - PN.max33[a]) * PN.fmv[a],
  );

  onbellek = {
    kanal,
    pencere,
    kalan,
    say,
    mal,
    pen,
    alarm,
    enGec,
    fazla: { idx: fazlaIdx, n: fazlaIdx.length, adet: fazlaAdet, deger: fazlaDeger },
    aksiyon: say.pool + say.tamir + say.alim,
    kapTop: mal.pool + mal.tamir + mal.alim,
  };
  return onbellek;
}
