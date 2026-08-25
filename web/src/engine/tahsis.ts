/**
 * KAYNAK TAHSİSİ + DUYARLILIK — "kısıtlı bütçeyle önce hangi parça alınır?"
 *
 * Formül açık yazılır, çünkü payload'daki build-zamanı eğrisi (D.opt) ayrı bir
 * kodla üretildi ve grafikte bu eğrinin YANINDA durur; biri diğerinin yerine
 * geçmez, ikisinin çakışması bir doğrulamadır:
 *
 *   stok s iken yetmeme olasılığı = 1 − F(s)                [F = Poisson CDF]
 *   s → s+1 adımının kazandırdığı = F(s+1) − F(s) = P(D = s+1)
 *   ağırlıklı kazanım             = w(kritiklik) · P(D = s+1)
 *   verim                         = ağırlıklı kazanım / birim maliyet
 *
 * Bütün adımlar verime göre sıralanır; kümülatif eğri "sınırlı bir bütçe nereye
 * kadar gider" sorusunu cevaplar.
 */
import { PN, NPN, LK } from '@/data/payload';
import { poisCdf, poissonMin } from './stats';
import {
  senaryoMu,
  kurCarpani,
  senaryoHesap,
  type SenaryoCfg,
  type ParamCfg,
  PARAM_BAZ,
} from './senaryo';

/** Parça başına adım tavanı — ötesinde marjinal kazanım ölçülemeyecek kadar küçük. */
export const ADIM_TAVAN = 40;

/** Chart.js'e verilecek nokta sayısı — 10.000 adımın hepsi görselde hiçbir şey eklemiyor. */
const EGRI_NOKTA = 90;

export interface TahsisAday {
  i: number;
  pn: string;
  sub: string;
  kr: number;
  /** kaç adet alınıyor */
  adet: number;
  /** toplam maliyet (USD, kur şoklu) */
  maliyet: number;
  /** bugünkü stokla stok-out olasılığı (%) */
  stokout: number;
}

export interface TahsisSonuc {
  /** kümülatif bütçe ($M) — EGRI_NOKTA'ya indirgenmiş */
  butce: number[];
  /** kümülatif ağırlıklı risk azaltım kazanımı (%) */
  kazanc: number[];
  /** kümülatif kapanan açık PN sayısı */
  kapanan: number[];
  toplamButce: number;
  toplamAdim: number;
  /** kazanımın %80'inin dolduğu bütçe ($M) — "ilk birkaç milyon işi bitiriyor" */
  butce80: number;
  /** verim sırasında ilk kez görülen 10 parça */
  ilk10: TahsisAday[];
}

interface Adim {
  i: number;
  /** ağırlıklı kazanım */
  kaz: number;
  /** birim maliyet (USD) */
  mal: number;
  verim: number;
  /** bu adım parçanın açığını kapatıyor mu */
  son: boolean;
}

/**
 * Greedy tahsis. Senaryo altında koşar: kriz derinleştikçe hem açık hem bütçe
 * büyür, sıralama da değişir — bu yüzden eğri sabit bir tablo olamaz.
 */
export function tahsis(cfg: SenaryoCfg, params: ParamCfg = PARAM_BAZ): TahsisSonuc {
  const w = [params.w0, params.w1, params.w2];
  const kurC = kurCarpani(cfg);
  const adimlar: Adim[] = [];
  const acikAdet = new Int32Array(NPN);
  const muler = new Float64Array(NPN);

  for (let i = 0; i < NPN; i++) {
    const mu = senaryoMu(i, cfg);
    muler[i] = mu;
    const hedef = poissonMin(mu, Math.min(0.995, PN.sh[i] + cfg.s / 100));
    const eksik = Math.min(ADIM_TAVAN, hedef - PN.svc[i]);
    if (eksik <= 0) continue;
    acikAdet[i] = eksik;
    const mal = PN.clp[i] * kurC;
    if (mal <= 0) continue;
    let F = poisCdf(mu, PN.svc[i]);
    for (let j = 0; j < eksik; j++) {
      const F1 = poisCdf(mu, PN.svc[i] + j + 1);
      const kaz = w[PN.kr[i]] * Math.max(0, F1 - F);
      F = F1;
      adimlar.push({ i, kaz, mal, verim: kaz / mal, son: j === eksik - 1 });
    }
  }

  adimlar.sort((a, b) => b.verim - a.verim);

  const kazTop = adimlar.reduce((s, a) => s + a.kaz, 0) || 1;
  const malTop = adimlar.reduce((s, a) => s + a.mal, 0);

  /* kümülatif seriyi tam çözünürlükte kur, grafiğe indirgenmiş hâlini ver */
  const n = adimlar.length;
  let kmal = 0;
  let kkaz = 0;
  let kkapali = 0;
  let butce80 = malTop / 1e6;
  let butce80Bulundu = false;
  const butce: number[] = [0];
  const kazanc: number[] = [0];
  const kapanan: number[] = [0];
  const adimAtla = Math.max(1, Math.ceil(n / EGRI_NOKTA));

  for (let k = 0; k < n; k++) {
    const a = adimlar[k];
    kmal += a.mal;
    kkaz += a.kaz;
    if (a.son) kkapali++;
    if (!butce80Bulundu && kkaz / kazTop >= 0.8) {
      butce80 = kmal / 1e6;
      butce80Bulundu = true;
    }
    if (k % adimAtla === 0 || k === n - 1) {
      butce.push(kmal / 1e6);
      kazanc.push((100 * kkaz) / kazTop);
      kapanan.push(kkapali);
    }
  }

  /* ilk 10: verim sırasında İLK KEZ görülen parçalar (aynı parça listeyi doldurmasın) */
  const gorulen = new Set<number>();
  const ilk10: TahsisAday[] = [];
  for (const a of adimlar) {
    if (ilk10.length >= 10) break;
    if (gorulen.has(a.i)) continue;
    gorulen.add(a.i);
    const i = a.i;
    ilk10.push({
      i,
      pn: PN.id[i],
      sub: LK.sub[PN.sub[i]],
      kr: PN.kr[i],
      adet: acikAdet[i],
      maliyet: acikAdet[i] * PN.clp[i] * kurC,
      stokout: 100 * (1 - poisCdf(muler[i], PN.svc[i])),
    });
  }

  return {
    butce,
    kazanc,
    kapanan,
    toplamButce: malTop / 1e6,
    toplamAdim: n,
    butce80,
    ilk10,
  };
}

/* --------------------------------------------------------------- tornado */

export interface DuyarlilikSatir {
  etiket: string;
  dusuk: number;
  yuksek: number;
}

export interface Duyarlilik {
  baz: number;
  satir: DuyarlilikSatir[];
}

/**
 * Tornado duyarlılığı — altı etken, SEÇİLİ SENARYONUN ETRAFINDA iki uca çekilir.
 *
 * Baz duruma göre değil bilerek: kriz derinleştikçe baskın etken değişir ve
 * tablonun işi tam olarak bunu göstermek. Ölçülen büyüklük dışarıdan verilir
 * (sayfa "2033 açığını kapatma maliyeti"ni geçiyor).
 *
 * KABİLİYET YATIRIMI BU LİSTEDE YOK: o bir şok ekseni değil bir KARAR, kendi
 * ROI panelinde duruyor.
 */
export function duyarlilik(cfg: SenaryoCfg, hesap: (c: SenaryoCfg) => number): Duyarlilik {
  const y = (p: Partial<SenaryoCfg>): SenaryoCfg => ({ ...cfg, ...p });
  const uclar: [string, SenaryoCfg, SenaryoCfg][] = [
    ['Filo büyüme bandı (alt ↔ üst uç)', y({ filoUc: -1 }), y({ filoUc: 1 })],
    ['Tedarik süreleri ±%20', y({ l: cfg.l - 20 }), y({ l: cfg.l + 20 })],
    ['Gümrük kuyruğu (0 ↔ +30 gün)', y({ gumruk: 0 }), y({ gumruk: cfg.gumruk + 30 })],
    ['İç kapasite kaybı (0 ↔ +50 puan)', y({ icKap: 0 }), y({ icKap: cfg.icKap + 50 })],
    ['Servis hedefi −2 ↔ +1 puan', y({ s: cfg.s - 2 }), y({ s: cfg.s + 1 })],
    ['Kur şoku (0 ↔ +%30)', y({ kur: 0 }), y({ kur: cfg.kur + 30 })],
  ];
  return {
    baz: hesap(cfg),
    satir: uclar.map(([etiket, lo, hi]) => ({
      etiket,
      dusuk: hesap(lo),
      yuksek: hesap(hi),
    })),
  };
}

/** Sayfanın ölçtüğü büyüklük: 2033 açığını kapatma maliyeti ($M). */
export const acikMaliyeti =
  (params: ParamCfg) =>
  (c: SenaryoCfg): number =>
    senaryoHesap(c, params).ek / 1e6;
