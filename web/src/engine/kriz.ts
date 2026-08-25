/**
 * KRİZ TAKVİMİ — şok anlık değil, zamana yayılır.
 *
 * Bir kriz üç evreden geçer: tırmanma → plato → toparlanma. Şiddet eğrisi her ay
 * için 0..1 arası bir ağırlık üretir, `olcek()` senaryo ayarını o ağırlıkla
 * yeniden ölçekler ve `senaryoHesap` her ay yeniden koşar. Yani "duvara kaçıncı
 * ayda çarpıyoruz" sorusunun cevabı uydurulmaz, hesaplanır.
 *
 * İKİ KURAL TESTTE KİLİTLİ:
 *  1. ÇARPANLAR 1'den başlar — w = 0'da `yeniDem` 0 olursa talep sıfırlanır ve
 *     0. ay baz durumu vermez; sayfanın bütün "baz ↔ senaryo" kıyasları çürür.
 *  2. YAPISAL VARSAYIMLAR ölçeklenmez — filo 2033'e giderken krizle birlikte
 *     tırmanıp inmez, `disOnly` de bir kriz şiddeti değil kanal tanımıdır.
 */
import {
  senaryoHesap,
  marjDagilim,
  type SenaryoCfg,
  type SenaryoSonuc,
  type ParamCfg,
  PARAM_BAZ,
} from './senaryo';

export interface Profil {
  ad: string;
  not: string;
  /** şiddetin 0'dan 1'e çıktığı ay sayısı */
  tirmanma: number;
  /** tam şiddette geçen ay sayısı */
  plato: number;
  /** şiddetin 1'den 0'a indiği ay sayısı */
  toparlanma: number;
}

export const PROFILLER: Record<string, Profil> = {
  ani: {
    ad: 'Ani darbe',
    not: 'Bir ayda tam şiddet, üç ay plato, beş ayda toparlanma. Sinyal penceresi neredeyse yok: plan tırmanmayı bekleyemez, önceden kurulu olmak zorunda.',
    tirmanma: 1,
    plato: 3,
    toparlanma: 5,
  },
  kademeli: {
    ad: 'Kademeli',
    not: 'Dört ay tırmanma, altı ay plato, sekiz ay toparlanma. Tırmanma penceresi, sinyale bağlı planın devreye girebileceği zamandır.',
    tirmanma: 4,
    plato: 6,
    toparlanma: 8,
  },
  surukleyen: {
    ad: 'Uzun sürükleyen',
    not: 'Altı ay tırmanma, on dört ay plato, altı ay toparlanma. Zirvesi daha alçak görünse de toplam yükü (parça·ay) ani darbeden büyüktür — krizin şiddeti kadar SÜRESİ de maliyettir.',
    tirmanma: 6,
    plato: 14,
    toparlanma: 6,
  },
};

/** Takvimdeki ay sayısı — 0. ay kriz ÖNCESİ (baz) durumdur. */
export const ayN = (p: Profil): number => 1 + p.tirmanma + p.plato + p.toparlanma;

/** Şiddet eğrisi: ay → w ∈ [0,1]. */
export function siddet(p: Profil, ay: number): number {
  if (ay <= 0) return 0;
  if (ay <= p.tirmanma) return ay / p.tirmanma;
  if (ay <= p.tirmanma + p.plato) return 1;
  const k = ay - p.tirmanma - p.plato;
  return k >= p.toparlanma ? 0 : 1 - k / p.toparlanma;
}

/** Senaryo ayarını w şiddetiyle ölçekler (yukarıdaki iki kurala uyarak). */
export function olcek(cfg: SenaryoCfg, w: number): SenaryoCfg {
  return {
    d: cfg.d * w,
    l: cfg.l * w,
    s: cfg.s * w,
    icKap: cfg.icKap * w,
    gumruk: cfg.gumruk * w,
    havuz: cfg.havuz * w,
    kur: cfg.kur * w,
    // çarpanlar 1'den başlar: w = 0'da 1,0 (etkisiz) olmalı, 0 DEĞİL
    yeniDem: cfg.yeniDem ? 1 + (cfg.yeniDem - 1) * w : 0,
    kuculDem: cfg.kuculDem ? 1 + (cfg.kuculDem - 1) * w : 0,
    // yapısal varsayımlar ölçeklenmez
    disOnly: cfg.disOnly,
    filoUc: cfg.filoUc,
  };
}

export interface KrizAy {
  ay: number;
  /** o ayın şiddeti (0..1) */
  w: number;
  r: SenaryoSonuc;
  /** o ayın emniyet marjı dağılımı — 10 kova */
  marj: number[];
}

export interface Takvim {
  aylar: KrizAy[];
  /** kırmızının zirveye çıktığı ay — "duvara kaçıncı ayda çarpıyoruz" */
  duvarAy: number;
  zirveKir: number;
  zirveKap: number;
  zirveAcik: number;
  /** Σ kırmızı — birim: parça·ay, krizin toplam ağırlığı */
  kirmiziAy: number;
  /** zirveden sonra kırmızının baz+%5'e döndüğü ilk ay; −1 = dönmüyor */
  toparlanmaAy: number;
  bazKir: number;
  bazKap: number;
}

/**
 * Ay ay kriz takvimi — 5.000 parça × ~24 ay tek geçişte.
 *
 * BİLİNÇLİ KISITLAMA: `kap` bir STOK büyüklüğüdür (kaç adet eksiğiz × birim
 * fiyat), akış değil. Aylar boyunca toplanırsa aynı eksik defalarca sayılır —
 * bu yüzden kümülatif $ RAPORLANMAZ. Zirve maruziyet ve parça·ay raporlanır.
 * ("Toplam kriz maliyeti" diye bir sayı üretme isteğine direnilmeli.)
 */
export function krizTakvim(cfg: SenaryoCfg, profil: Profil, params: ParamCfg = PARAM_BAZ): Takvim {
  const n = ayN(profil);
  const aylar: KrizAy[] = [];
  for (let ay = 0; ay < n; ay++) {
    const w = siddet(profil, ay);
    const c = olcek(cfg, w);
    aylar.push({ ay, w, r: senaryoHesap(c, params), marj: marjDagilim(c, params) });
  }

  const bazKir = aylar[0].r.kir;
  const bazKap = aylar[0].r.kap;

  let duvarAy = 0;
  let zirveKir = -1;
  let zirveKap = 0;
  let zirveAcik = 0;
  let kirmiziAy = 0;
  aylar.forEach((a) => {
    kirmiziAy += a.r.kir;
    if (a.r.kir > zirveKir) {
      zirveKir = a.r.kir;
      duvarAy = a.ay;
    }
    if (a.r.kap > zirveKap) zirveKap = a.r.kap;
    if (a.r.acik > zirveAcik) zirveAcik = a.r.acik;
  });

  /* toparlanma: zirveden SONRA kırmızının baz seviyesinin %5 üstüne indiği ilk ay */
  const esik = bazKir * 1.05;
  let toparlanmaAy = -1;
  for (let i = duvarAy + 1; i < aylar.length; i++) {
    if (aylar[i].r.kir <= esik) {
      toparlanmaAy = aylar[i].ay;
      break;
    }
  }

  return {
    aylar,
    duvarAy,
    zirveKir,
    zirveKap,
    zirveAcik,
    kirmiziAy,
    toparlanmaAy,
    bazKir,
    bazKap,
  };
}
