/**
 * Harita veri katmanı — RENDER'DAN BAĞIMSIZ.
 *
 * Buradaki hiçbir şey ekran bilmez: mesafe, süre tahmini, metrik dağıtımı, kanal
 * yelpazesi ve rota senaryoları saf fonksiyonlar. Ekran 2D SVG'den 3D küreye
 * geçerken bu dosya değişmedi — sayılar aynı yerden geliyor, yalnız çizim değişti.
 * (Küre geometrisi: kure/kureGeo.ts — o da render'dan bağımsız saf matematik.)
 *
 * TEMSİLÎ UYARISI: istasyon boyutu resmi veride YOK (CLAUDE.md §2.4). Grup
 * toplamları basılı case tablosuyla birebir; istasyon kırılımı ve depo katmanı
 * kurala bağlı temsildir. Metinlerde bu her yerde belirtilir.
 */
import { D, PN, LK, PIDX } from '@/data/payload';

export const HA = D.harita;
export const N_IST = HA.kod.length;
export const IST_I = HA.kod.indexOf('IST');

export const DEPO_RENK: Record<string, string> = {
  ana_depo: '#C1121F',
  ileri_depo: '#26282A',
  hat_stok: '#6E7783',
  yok: '#B6BDC7',
};
export const DEPO_AD: Record<string, string> = {
  ana_depo: 'Ana depo',
  ileri_depo: 'İleri depo',
  hat_stok: 'Hat stoğu',
  yok: 'Stok yok',
};
export const PRENK = ['#C1121F', '#2C5AA0', '#0E6B4A', '#8A6000', '#5B4B8A'];
export const KANAL_RENK: Record<string, string> = {
  depo: '#0E6B4A',
  pool: '#2C5AA0',
  sokum: '#C1121F',
  ictamir: '#3E8E6B',
  distamir: '#6E7783',
  hizli: '#8A6000',
  alim: '#5B4B8A',
};

export const GRUP: Record<string, { ad: string; u25: number; u33: number }> = {};
HA.grup.kod.forEach((k, n) => {
  GRUP[k] = { ad: HA.grup.ad[n], u25: HA.grup.u25[n], u33: HA.grup.u33[n] };
});

/* ------------------------------------------------------------------- metrikler */
/**
 * Küre üzerindeki sütun yüksekliği hangi sayıyı gösteriyor.
 *
 * İstasyon kırılımı veride yok; kritiklik sınıfı toplamları (payload.harita.krTot)
 * havalimanının filo payıyla dağıtılır — build_dashboard.py'nin kurduğu kuralın
 * aynısı. Bu yüzden metrik değiştiğinde ülke toplamı korunur, yalnız dağılım
 * değişir; kritiklik süzgeci de aynı toplamın bir dilimini alır.
 */
export type Metrik = 'ucak' | 'adet' | 'talep' | 'kirmizi' | 'min33' | 'dis';

export const METRIKLER: { k: Metrik; ad: string; birim: string; ipucu: string }[] = [
  { k: 'ucak', ad: 'Uçak', birim: 'uçak', ipucu: 'istasyondaki uçak sayısı (case tablosu)' },
  { k: 'adet', ad: 'Stok', birim: 'adet', ipucu: 'istasyonda duran kullanılabilir adet' },
  { k: 'talep', ad: 'Talep', birim: 'adet/yıl', ipucu: 'yıllık komponent talebi' },
  { k: 'kirmizi', ad: 'Kırmızı', birim: 'parça', ipucu: 'dayanma süresi tedarik süresinden kısa' },
  { k: 'min33', ad: 'MIN 2033', birim: 'adet', ipucu: '2033 servis hedefli asgari stok' },
  { k: 'dis', ad: 'Dışa bağımlı', birim: 'adet/yıl', ipucu: 'iç tamir kabiliyeti olmayan talep' },
];

const KR_ALAN: Record<Exclude<Metrik, 'ucak' | 'adet'>, keyof typeof HA.krTot> = {
  talep: 'talep25',
  kirmizi: 'kirmizi',
  min33: 'min33',
  dis: 'dis_bagimli',
};

export interface MetrikSonuc {
  deger: number[];
  max: number;
  toplam: number;
}

/** kr: null = tüm kritiklik sınıfları, 0/1/2 = AOG / kritik / kritik değil */
export function metrikDegerler(m: Metrik, kr: number | null, yil33: boolean): MetrikSonuc {
  const pay = yil33 ? HA.pay33 : HA.pay25;
  let deger: number[];
  if (m === 'ucak') {
    deger = (yil33 ? HA.u33 : HA.u25).slice();
  } else if (m === 'adet') {
    // stok kalemi istasyon payına göre dağıtıldı (core.havalimani_tablosu)
    deger = HA.adet.map((v, i) => (yil33 ? (v * HA.u33[i]) / Math.max(1, HA.u25[i]) : v));
  } else {
    const seri = HA.krTot[KR_ALAN[m]];
    const top = kr == null ? seri.reduce((a, b) => a + b, 0) : seri[kr];
    deger = pay.map((p) => p * top);
  }
  return {
    deger,
    max: Math.max(...deger, 1e-9),
    toplam: deger.reduce((a, b) => a + b, 0),
  };
}

/* --------------------------------------------------------------- mesafe / süre */
export function hav(i: number, j: number): number {
  const R = 6371;
  const d2r = Math.PI / 180;
  const dla = (HA.lat[j] - HA.lat[i]) * d2r;
  const dlo = (HA.lon[j] - HA.lon[i]) * d2r;
  const a =
    Math.sin(dla / 2) ** 2 +
    Math.cos(HA.lat[i] * d2r) * Math.cos(HA.lat[j] * d2r) * Math.sin(dlo / 2) ** 2;
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

const HAZIR: Record<string, number> = { ana_depo: 0.5, ileri_depo: 1, hat_stok: 2, yok: 3 };

/** depo transferi süresi (saat): uçuş + elleçleme (+ gümrük payı dışarıda) */
export const eta = (src: number, dst: number): number =>
  Math.round((hav(src, dst) / 800 + (HA.yd[src] ? 4 : 1) + HAZIR[HA.depo[src]]) * 2) / 2;

/** havuzdan değişim süresi (saat): uçuş + gümrük + pool işlemi */
export const etaPool = (src: number, dst: number): number =>
  Math.round((hav(src, dst) / 800 + 4 + 8) * 2) / 2;

export const sureTxt = (s: number): string =>
  s < 48
    ? String(s).replace('.', ',') + ' saat'
    : Math.round(s / 24).toLocaleString('tr-TR') + ' gün';

/* --------------------------------------------------------------- rota verisi */
const HAVUZ_ORTAK = ['FRA', 'LHR', 'CDG', 'DXB', 'AMS', 'JFK', 'JED', 'BER', 'SIN'];
const DIS_HUB = ['FRA', 'LHR', 'AMS', 'CDG', 'DXB'];

export interface ParcaSpec {
  pn: string;
  sub: string;
  kay: string[];
  pool: string[];
  alim: number;
}

/** Watchlist'ten gelen tek parça için kaynak yelpazesi (hedef hariç). */
export const wpSpec = (i: number, hedefKod: string): ParcaSpec => ({
  pn: String(PN.id[i]),
  sub: LK.sub[PN.sub[i]],
  kay: ['IST', 'ESB', 'ADB'].filter((k) => k !== hedefKod),
  pool: [HAVUZ_ORTAK[+PN.id[i] % 9], HAVUZ_ORTAK[(+PN.id[i] + 4) % 9]].filter(
    (k) => k !== hedefKod,
  ),
  alim: PN.tsat[i],
});

export interface Kanal {
  tip: string;
  ad: string;
  kod: string;
  i: number;
  saat: number;
  mal: number | null;
  malTxt?: string;
  dash: string;
}

/**
 * Tek parça izole edilince aksiyon merdivenindeki TÜM kanallar haritaya çıkar.
 * Tamir ve satın alma süreleri parçanın GERÇEK verisinden (tic/tdis/tsat).
 */
export function kanalVeri(p: ParcaSpec, hIdx: number): Kanal[] {
  const idx = PIDX[p.pn];
  const ks: Kanal[] = [];
  p.kay.forEach((k) => {
    const i = HA.kod.indexOf(k);
    ks.push({
      tip: 'depo',
      ad: 'Depo transferi',
      kod: k,
      i,
      saat: eta(i, hIdx),
      mal: null,
      malTxt: 'iç transfer',
      dash: '',
    });
  });
  (p.pool || []).forEach((k) => {
    const i = HA.kod.indexOf(k);
    ks.push({
      tip: 'pool',
      ad: 'Havuzdan değişim',
      kod: k,
      i,
      saat: etaPool(i, hIdx),
      mal: idx != null ? 0.1 * PN.clp[idx] : null,
      dash: '1.6,4.6',
    });
  });
  if (idx != null) {
    if (PN.gay[idx] > 0)
      ks.push({
        tip: 'sokum',
        ad: 'Donörden söküm',
        kod: 'IST',
        i: IST_I,
        saat: 24,
        mal: null,
        malTxt: 'tamir borcu',
        dash: '7,3,2,3',
      });
    if (PN.ato[idx] && PN.tic[idx] != null)
      ks.push({
        tip: 'ictamir',
        ad: 'İç atölye tamiri',
        kod: 'IST',
        i: IST_I,
        saat: PN.tic[idx]! * 24,
        mal: PN.icrep[idx],
        dash: '6,4',
      });
    const dh = DIS_HUB.filter((k) => k !== HA.kod[hIdx])[+p.pn % 4];
    const di = HA.kod.indexOf(dh);
    ks.push({
      tip: 'distamir',
      ad: 'Dış tamir',
      kod: dh,
      i: di,
      saat: PN.tdis[idx] * 24,
      mal: PN.disrep[idx],
      dash: '10,5',
    });
    ks.push({
      tip: 'hizli',
      ad: 'Hızlandırılmış dış tamir',
      kod: dh,
      i: di,
      saat: Math.ceil(PN.tdis[idx] * 0.6) * 24,
      mal: PN.disrep[idx] * 1.5,
      dash: '10,5',
    });
    ks.push({
      tip: 'alim',
      ad: 'Yeni satın alma',
      kod: 'OEM · FRA',
      i: HA.kod.indexOf('FRA'),
      saat: PN.tsat[idx] * 24,
      mal: PN.clp[idx],
      dash: '2,6',
    });
  }
  return ks.sort((a, b) => a.saat - b.saat);
}

export interface RotaParcaGorunum {
  n: number;
  pn: string;
  sub: string;
  ops: { i: number; kod: string; tip: string; saat: number }[];
  alim: number;
  renk: string;
}

export interface RotaGorunum {
  sc: { ucak: string; hedef: string; parcalar: ParcaSpec[] };
  hIdx: number;
  parcalar: RotaParcaGorunum[];
  kritik: number;
  wp?: boolean;
}

/** Aktif rota: ya Watchlist'ten gelen tek parça, ya AOG senaryosu (5 parça). */
export function rotaVeri(rsen: number, wp: { i: number; hedef: number } | null): RotaGorunum {
  if (wp) {
    const spec = wpSpec(wp.i, HA.kod[wp.hedef]);
    const hIdx = wp.hedef;
    const ops = spec.kay
      .map((k) => {
        const i = HA.kod.indexOf(k);
        return { i, kod: k, tip: 'depo', saat: eta(i, hIdx) };
      })
      .concat(
        spec.pool.map((k) => {
          const i = HA.kod.indexOf(k);
          return { i, kod: k, tip: 'pool', saat: etaPool(i, hIdx) };
        }),
      )
      .sort((a, b) => a.saat - b.saat);
    return {
      sc: { ucak: 'PN-' + spec.pn, hedef: HA.kod[hIdx], parcalar: [spec] },
      hIdx,
      parcalar: [{ n: 0, pn: spec.pn, sub: spec.sub, ops, alim: spec.alim, renk: PRENK[0] }],
      kritik: ops[0].saat,
      wp: true,
    };
  }
  const sc = HA.rota[rsen];
  const hIdx = HA.kod.indexOf(sc.hedef);
  const parcalar = sc.parcalar.map((p, n) => {
    const ops = p.kay
      .map((k) => {
        const i = HA.kod.indexOf(k);
        return { i, kod: k, tip: 'depo', saat: eta(i, hIdx) };
      })
      .concat(
        (p.pool || []).map((k) => {
          const i = HA.kod.indexOf(k);
          return { i, kod: k, tip: 'pool', saat: etaPool(i, hIdx) };
        }),
      )
      .sort((a, b) => a.saat - b.saat);
    return { n, pn: p.pn, sub: p.sub, ops, alim: p.alim, renk: PRENK[n % PRENK.length] };
  });
  return {
    sc: { ucak: sc.ucak, hedef: sc.hedef, parcalar: sc.parcalar as ParcaSpec[] },
    hIdx,
    parcalar,
    kritik: Math.max(...parcalar.map((p) => p.ops[0].saat)),
  };
}
