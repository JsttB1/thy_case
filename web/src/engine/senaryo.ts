/**
 * SENARYO + BELİRSİZLİK MOTORU
 *
 * Her kriz ya stoğun dayanma süresini (TTS) kısaltır ya da tedarik süresini (TTR)
 * uzatır. Bu yüzden kriz = parametre şoku; senaryo kütüphanesi bu iki değişkeni
 * oynatır ve 5.000 parça anında yeniden hesaplanır (CLAUDE.md §7.3).
 *
 * ŞOK EKSENLERİ 11 TANE. Beşi sonradan eklendi (iç kapasite, gümrük, havuz, kur,
 * filo bandı) ve hepsinin nötr değeri 0'dır: `BAZ_CFG` eski davranışı BİREBİR
 * verir — kırmızı 134, AOG kritik 22. Bu, testlerle kilitli bir sözleşmedir.
 */
import { PN, NPN, PRM, B } from '@/data/payload';
import { FL, hasF } from './flags';
import { poissonMin, poisCdf, eksikMoment, Z } from './stats';

export interface SenaryoCfg {
  /** genel talep şoku (%) — λ büyür, TTS kısalır */
  d: number;
  /** tedarik / TAT şoku (%) — TTR ve lead uzar */
  l: number;
  /** servis hedefi sıkılaştırma (puan) — MIN yükselir */
  s: number;
  /** yeni nesil talep çarpanı (0 = etkisiz) */
  yeniDem: number;
  /** küçülen modeller talep çarpanı (0 = etkisiz) */
  kuculDem: number;
  /** TAT şoku yalnız dışa bağımlı parçalara uygulansın */
  disOnly: boolean;
  /** iç tamir kapasitesi kaybı (%) — YURTİÇİ TAT çarpanı */
  icKap: number;
  /** gümrük / lojistik kuyruğu (+gün) — dış kanala TOPLAMSAL */
  gumruk: number;
  /** havuz erişim kaybı (%) — $ maruziyeti, adet değil */
  havuz: number;
  /** kur şoku (%) — $ fatura + nakit koruma modu */
  kur: number;
  /** filo büyüme bandında konum (−1..1) — −1 alt uç · 0 motor · +1 üst uç */
  filoUc: number;
}

/**
 * Yeni eksenlerin nötr tabanı. Preset tanımları bunun ÜSTÜNE yazar; böylece
 * on ikinci bir eksen eklendiğinde 11 preset'i tek tek düzeltmek gerekmez.
 */
const NOTR = { icKap: 0, gumruk: 0, havuz: 0, kur: 0, filoUc: 0 } as const;

export interface Preset extends SenaryoCfg {
  ad: string;
  not: string;
}

export const PRESETS: Record<string, Preset> = {
  baz: {
    d: 0,
    l: 0,
    s: 0,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: false,
    ...NOTR,
    ad: 'Baz durum',
    not: 'Bugünkü parametreler. Kırmızı liste burada doğrulanır: 134 parça, 22 AOG kritik.',
  },
  motor: {
    d: 0,
    l: 30,
    s: 0,
    yeniDem: 1.5,
    kuculDem: 0,
    disOnly: true,
    ...NOTR,
    ad: 'Motor ailesi krizi',
    not: "Yeni nesil talebi 1,5 kat, dış tamir süresi 1,3 kat artıyor. 2033 filosunun %64'ü beş yeni nesil modelde toplandığı için risk de yoğunlaşıyor.",
  },
  pandemi: {
    d: 20,
    l: 50,
    s: 0,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: false,
    ...NOTR,
    icKap: 50,
    ad: 'Pandemi tipi şok',
    not: 'Talep %20 sıçrıyor, aynı anda tamir istasyonları kapasitesinin yarısını kaybediyor ve tedarik süresi 1,5 kat uzuyor. Talep ve tedarik aynı anda bozulunca tampon iki taraftan eriyor.',
  },
  oem: {
    d: 0,
    l: 15,
    s: 0,
    yeniDem: 0,
    kuculDem: 1.25,
    disOnly: true,
    ...NOTR,
    ad: 'OEM teslimat gecikmesi',
    not: 'Yeni uçaklar gecikince klasik filo geç emekli oluyor, küçülen 4 modelin talebi 1,25 kat sürüyor. Sinyale bağlı plan kendini yavaşlatır, takvime bağlı plan çökerdi.',
  },
  lojistik: {
    d: 0,
    l: 60,
    s: 0,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: true,
    ...NOTR,
    ad: 'Lojistik krizi',
    not: 'Dış tamir ve satın alma kuyrukları %60 uzuyor. Satın alma süresinin 270 güne çıkabildiğini hatırlatır.',
  },
  patlama: {
    d: 40,
    l: 20,
    s: 10,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: false,
    ...NOTR,
    ad: 'Talep patlaması',
    not: 'Genel talep %40 artıyor, hafif tedarik gerginliği var ve servis hedefi sıkılaştırılıyor.',
  },
  gumruk: {
    d: 0,
    l: 0,
    s: 0,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: true,
    ...NOTR,
    gumruk: 45,
    ad: 'Gümrük tıkanması',
    not: "Kızıldeniz tipi bir tıkanma süreyi oranla değil BLOK hâlinde uzatır: her dış sevkiyata 45 gün eklenir. Kısa TAT'lı parçayı yüzdece çok daha sert vurur — oransal şokla farkı budur.",
  },
  atolye: {
    d: 0,
    l: 0,
    s: 0,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: false,
    ...NOTR,
    icKap: 80,
    ad: 'Atölye kapasite kaybı',
    not: "İç tamir kabiliyeti olan parçaların TAT'ı 1,8 kat uzuyor. dış tamire bağımlı liste (kritik + kabiliyetsiz) bu şoktan etkilenmez — kabiliyetin değeri tam olarak burada ölçülür.",
  },
  havuzCekilme: {
    d: 0,
    l: 0,
    s: 0,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: false,
    ...NOTR,
    havuz: 70,
    ad: 'Havuz ortağı çekilmesi',
    not: "Havuz erişiminin %70'i kapanıyor. Kırmızı sayısı DEĞİŞMEZ, değişen para: havuz karşılıklı sigortadır, faturası ancak çekilince görünür.",
  },
  kur: {
    d: 0,
    l: 0,
    s: 0,
    yeniDem: 0,
    kuculDem: 0,
    disOnly: false,
    ...NOTR,
    kur: 40,
    ad: 'Kur şoku',
    not: 'Dolar kalemleri %40 pahalanıyor. Adetler kımıldamaz, faturalar büyür ve nakit koruma modu devreye girer: BER eşiği yukarı kayınca bazı parçalar hurdadan tamire döner.',
  },
  bilesik: {
    d: 15,
    l: 40,
    s: 5,
    yeniDem: 1.35,
    kuculDem: 0,
    disOnly: true,
    icKap: 40,
    gumruk: 20,
    havuz: 40,
    kur: 25,
    filoUc: 0.6,
    ad: 'Bileşik kriz',
    not: 'Krizler sırayla gelmez: talep, TAT, atölye, gümrük, havuz ve kur aynı anda bozulur, filo da bandın üst ucunda büyür. Tek eksenli stres testinin neden yetmediğini gösteren senaryo.',
  },
};

export const BAZ_CFG: SenaryoCfg = {
  d: 0,
  l: 0,
  s: 0,
  yeniDem: 0,
  kuculDem: 0,
  disOnly: false,
  ...NOTR,
};

/** Karşılaştırılan alanlar — "preset'ten sapıldı mı" kontrolü tek listeden okur. */
export const CFG_ALAN: (keyof SenaryoCfg)[] = [
  'd',
  'l',
  's',
  'yeniDem',
  'kuculDem',
  'disOnly',
  'icKap',
  'gumruk',
  'havuz',
  'kur',
  'filoUc',
];

/* ------------------------------------------------------- canlı parametre paneli */

export interface ParamCfg {
  w0: number;
  w1: number;
  w2: number;
  ber: number;
  tampon: number;
}

export const PARAM_BAZ: ParamCfg = { w0: 3, w1: 2, w2: 1, ber: 0.65, tampon: PRM.alarm_tamponu };

/* --------------------------------------------------------------- şok çekirdeği */

/**
 * SÜRE ŞOKU — kanal tipine göre ayrışır. Krizin karakterini belirleyen soru
 * "çarpan mı toplamsal mı" burada cevaplanır:
 *
 *  · iç kapasite kaybı  → yalnız ATÖLYESİ OLAN parçayı vurur (çarpan)
 *  · TAT şoku           → disOnly açıksa iç kanalı atlar (çarpan)
 *  · gümrük kuyruğu     → yalnız DIŞ kanala biner ve TOPLAMSALDIR (+gün)
 *
 * Gümrüğün toplamsal olması anlatının parçası: blok hâlinde gecikme, kısa TAT'lı
 * parçaları yüzdece çok daha sert vurur. Testte kilitli.
 */
function sureSok(gun: number, ic: boolean, cfg: SenaryoCfg): number {
  let g = gun;
  if (ic) g *= 1 + cfg.icKap / 100;
  if (!(cfg.disOnly && ic)) g *= 1 + cfg.l / 100;
  if (!ic) g += cfg.gumruk;
  return g;
}

export const ttrSok = (i: number, cfg: SenaryoCfg): number =>
  sureSok(PN.ttr[i], PN.ato[i] === 1, cfg);

export const leadSok = (i: number, cfg: SenaryoCfg): number =>
  sureSok(PN.lead[i], PN.ato[i] === 1, cfg);

/** Parça başına talep çarpanı — senaryo alt kümeleri burada ayrışır. */
function talepCarpani(i: number, cfg: SenaryoCfg): number {
  let m = 1 + cfg.d / 100;
  if (cfg.yeniDem && hasF(i, FL.YENI)) m *= cfg.yeniDem;
  if (cfg.kuculDem && hasF(i, FL.PO)) m *= cfg.kuculDem;
  return m;
}

/**
 * Filo büyüme bandındaki konum → 2033 talep çarpanı.
 *
 * Motor bandın TAM ORTASINDA DEĞİL (alt 146.881 · motor 149.197 · üst 150.774),
 * bu yüzden interpolasyon asimetrik: filoUc = 0 tam olarak 1,0 vermek zorunda,
 * yoksa "nötr ayar baz durumu verir" sözleşmesi çöker.
 */
export function bandCarpani(cfg: SenaryoCfg): number {
  const u = cfg.filoUc;
  if (!u) return 1;
  return u < 0 ? 1 + u * (1 - B.alt / B.motor) : 1 + u * (B.ust / B.motor - 1);
}

/** Kur çarpanı — YALNIZ $ kalemlere uygulanır, adetlere DOKUNMAZ. */
export const kurCarpani = (cfg: SenaryoCfg): number => 1 + cfg.kur / 100;

/* ------------------------------------------------------------------- ana hesap */

export interface SenaryoSonuc {
  /** bugün kırmızı olan parça sayısı */
  kir: number;
  kirAog: number;
  /** kırmızıları TTR seviyesine çıkarma maliyeti (USD, kur şoklu) */
  kap: number;
  /** 2033 MIN seviyesinin altında kalan parça sayısı */
  acik: number;
  /** açığı kapatma maliyeti (USD, kur şoklu) */
  ek: number;
  /** kritiklik sınıfına göre kırmızı dağılımı */
  byKr: [number, number, number];
  /** ATA alt kategorisine göre kırmızı — 3D arazinin yakıtı */
  byKat: number[];
  /** havuz kanalı olan ve açıkta kalan parça sayısı */
  poolKayipPn: number;
  /** havuz kaybının beklenen-değer maliyeti (USD) */
  poolEk: number;
  /** nakit koruma modunda kayan BER eşiği */
  berEtkin: number;
  /** kayan eşiğe göre BER adayı sayısı */
  berPn: number;
  /** şoklu ortalama TTR (gün) */
  ortTtr: number;
  /** en kötü emniyet marjı (gün) — negatifi kırmızı demek */
  enKotuMarj: number;
}

/**
 * Tek geçiş, 5.000 parça. Her şey burada üretilir; `views/` altında yeni bir
 * sayı TÜRETİLMEZ — bir sayı iki ekranda görünüyorsa ikisi de bunu çağırır.
 */
export function senaryoHesap(cfg: SenaryoCfg, params: ParamCfg = PARAM_BAZ): SenaryoSonuc {
  const QD = PRM.ceyrek_gun;
  const uBand = bandCarpani(cfg);
  const kurC = kurCarpani(cfg);
  /* nakit koruma modu: kur şokunda tamir, satın almaya göre ucuzlar → eşik yukarı kayar */
  const berEtkin = Math.min(0.9, params.ber * kurC);

  let kir = 0;
  let kirAog = 0;
  let kap = 0;
  let acik = 0;
  let ek = 0;
  let poolKayipPn = 0;
  let poolFark = 0;
  let berPn = 0;
  let ttrTop = 0;
  let enKotuMarj = Infinity;
  const byKr: [number, number, number] = [0, 0, 0];
  const byKat = new Array(26).fill(0);

  for (let i = 0; i < NPN; i++) {
    const mDem = talepCarpani(i, cfg);
    const ic = PN.ato[i] === 1;
    const ttr = sureSok(PN.ttr[i], ic, cfg);
    ttrTop += ttr;

    const t = PN.t25[i];
    if (t > 0) {
      /* --- bugünün kırmızı testi: stok tedarikten önce biter mi */
      const lam = (t * mDem) / 365;
      const tts = PN.svc[i] / lam;
      const marj = tts - ttr - params.tampon;
      if (marj < enKotuMarj) enKotuMarj = marj;
      if (marj < 0) {
        kir++;
        byKr[PN.kr[i]]++;
        byKat[PN.sub[i]]++;
        if (PN.kr[i] === 0) kirAog++;
        kap += (ttr - tts) * lam * PN.clp[i];
      }
    }

    /* --- 2033 planı: MIN seviyesi ve açık */
    const mu = (PN.rate33[i] * mDem * sureSok(PN.lead[i], ic, cfg) * uBand) / QD;
    const min = poissonMin(mu, Math.min(0.995, PN.sh[i] + cfg.s / 100));
    const eksik = min - PN.svc[i];
    if (eksik > 0) {
      acik++;
      ek += eksik * PN.clp[i];
      if (PN.exin[i] + PN.exout[i] > 0) {
        /* havuz kanalı olan parça: erişim kapanınca %10'luk değişim ücreti yerine
           liste fiyatının tamamı ödenir — fark bu. */
        poolKayipPn++;
        poolFark += 0.9 * PN.clp[i] * eksik;
      }
    }

    if (PN.disrep[i] / PN.clp[i] > berEtkin) berPn++;
  }

  return {
    kir,
    kirAog,
    kap: kap * kurC,
    acik,
    ek: ek * kurC,
    byKr,
    byKat,
    poolKayipPn,
    poolEk: (cfg.havuz / 100) * poolFark * kurC,
    berEtkin,
    berPn,
    ortTtr: ttrTop / NPN,
    enKotuMarj: Number.isFinite(enKotuMarj) ? enKotuMarj : 0,
  };
}

/**
 * Bir parçanın tedarik penceresi boyunca beklenen 2033 talebi (senaryo altında).
 *
 * Üçüncü argüman bilinçli: belirsizlik hesabı talep bandını KENDİSİ tarıyor, o
 * yüzden `cfg.filoUc` yerine ızgara noktasını geçiriyor (çift sayım olmasın).
 */
export function senaryoMu(i: number, cfg: SenaryoCfg, u: number = bandCarpani(cfg)): number {
  const ic = PN.ato[i] === 1;
  return (PN.rate33[i] * talepCarpani(i, cfg) * sureSok(PN.lead[i], ic, cfg) * u) / PRM.ceyrek_gun;
}

/* --------------------------------------------------------------- belirsizlik */

export interface Belirsizlik {
  /** beklenen açıkta kalan parça sayısı */
  ort: number;
  sd: number;
  /** beklenen fatura (USD) */
  mal: number;
  malSd: number;
  /** kötü giden %10'un ortalaması (USD) */
  kuyruk: number;
  /** varyansın yüzde kaçı talep bandından geliyor */
  bantPayi: number;
  aralik: (g: number) => [number, number];
  cdf: (x: number) => number;
}

/**
 * BELİRSİZLİK DENEMELERİ — açıkta kalan parça sayısı bağımsız Bernoulli'lerin
 * toplamıdır (Poisson-binom): ortalama Σp, varyans Σp(1−p); yüzdelikler merkezi
 * limit yaklaşımıyla. Örnekleme yapmadan aynı sonucu verir, tarayıcıda ~2 ms.
 *
 * Talep bandı G noktalı ızgarayla taranır → belirsizliğin kaynağı ikiye ayrışır:
 * "bilmediğimiz büyüme" (bant) ve "doğası gereği rastgele arıza" (Poisson).
 */
export function belirsizlik(cfg: SenaryoCfg, G = 9): Belirsizlik {
  const uLo = B.alt / B.motor;
  const uHi = B.ust / B.motor;
  const ms: number[] = [];
  const vs: number[] = [];
  const cs: number[] = [];
  const cvs: number[] = [];

  for (let g = 0; g < G; g++) {
    const u = G === 1 ? (uLo + uHi) / 2 : uLo + (g / (G - 1)) * (uHi - uLo);
    let m = 0;
    let v = 0;
    let c = 0;
    let cv = 0;
    for (let i = 0; i < NPN; i++) {
      const mu = senaryoMu(i, cfg, u);
      const s = PN.svc[i];
      const clp = PN.clp[i];
      const p = 1 - poisCdf(mu, s);
      m += p;
      v += p * (1 - p);
      const [e1, e2] = eksikMoment(mu, s);
      c += e1 * clp;
      cv += Math.max(0, e2 - e1 * e1) * clp * clp; // parçalar bağımsız → varyanslar toplanır
    }
    ms.push(m);
    vs.push(v);
    cs.push(c);
    cvs.push(cv);
  }

  const ort = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const mOrt = ort(ms);
  const cOrt = ort(cs);
  const vBant = ort(ms.map((x) => (x - mOrt) ** 2));
  const vPois = ort(vs);
  const cvBant = ort(cs.map((x) => (x - cOrt) ** 2));
  const cvPois = ort(cvs);
  const sd = Math.sqrt(vBant + vPois);
  const malSd = Math.sqrt(cvBant + cvPois);
  /* en kötü %10'un ortalaması: normal yaklaşımda ort + sd·φ(z90)/0,10 */
  const KUYRUK = 1.755;
  const kurC = kurCarpani(cfg);

  return {
    ort: mOrt,
    sd,
    mal: cOrt * kurC,
    malSd: malSd * kurC,
    kuyruk: (cOrt + KUYRUK * malSd) * kurC,
    bantPayi: (100 * vBant) / Math.max(vBant + vPois, 1e-9),
    aralik: (g: number) => [mOrt - Z[g] * sd, mOrt + Z[g] * sd],
    cdf: (x: number) => 0.5 * (1 + Math.tanh(Math.sqrt(Math.PI / 8) * ((x - mOrt) / sd))),
  };
}

/* ------------------------------------------------------------------ dağılımlar */

export const TTS_KOVA = [0, 30, 60, 90, 120, 150, 180, 240, 300, 365, 1e9];
export const TTS_ET = [
  '0–30',
  '30–60',
  '60–90',
  '90–120',
  '120–150',
  '150–180',
  '180–240',
  '240–300',
  '300–365',
  '365+',
];

/**
 * EMNİYET MARJI kovaları: marj = TTS − TTR − tampon.
 * İlk 4 kova (marj < 0) tam olarak "kırmızı liste" demektir — testte kilitli.
 */
export const MARJ_KOVA = [-1e9, -60, -30, -14, 0, 14, 30, 60, 120, 240, 1e9];
export const MARJ_ET = [
  '−60 altı',
  '−60…−30',
  '−30…−14',
  '−14…0',
  '0…14',
  '14…30',
  '30…60',
  '60…120',
  '120…240',
  '240+',
];
/** ilk 4 kova negatif marj = kırmızı bölge */
export const MARJ_KIRMIZI = 4;

const kova = (v: number, sinir: number[]): number => {
  for (let b = 0; b < 10; b++) if (v >= sinir[b] && v < sinir[b + 1]) return b;
  return -1;
};

/**
 * Filo kaç gün dayanır — senaryoya bağlı canlı TTS dağılımı.
 *
 * TTS = stok / talep olduğu için tedarik süresini TANIM GEREĞİ görmez: lojistik
 * krizinde bu dağılım kımıldamaz ama parçalar kırmızıya düşer. Sınır ekranda
 * gizlenmez, yazıyla söylenir; varsayılan görünüm marj dağılımıdır.
 */
export function ttsDagilim(cfg: SenaryoCfg): number[] {
  const say = new Array(10).fill(0);
  for (let i = 0; i < NPN; i++) {
    const t = PN.t25[i];
    if (t <= 0) continue;
    const g = PN.svc[i] / ((t * talepCarpani(i, cfg)) / 365);
    const b = kova(g, TTS_KOVA);
    if (b >= 0) say[b]++;
  }
  return say;
}

/** Emniyet marjı dağılımı — TTS'in aksine her iki şoku da görür. */
export function marjDagilim(cfg: SenaryoCfg, params: ParamCfg = PARAM_BAZ): number[] {
  const say = new Array(10).fill(0);
  for (let i = 0; i < NPN; i++) {
    const t = PN.t25[i];
    if (t <= 0) continue;
    const ic = PN.ato[i] === 1;
    const lam = (t * talepCarpani(i, cfg)) / 365;
    const marj = PN.svc[i] / lam - sureSok(PN.ttr[i], ic, cfg) - params.tampon;
    const b = kova(marj, MARJ_KOVA);
    if (b >= 0) say[b]++;
  }
  return say;
}

/* ------------------------------------------------- risk skoru / param paneli */

export interface ParamSonuc {
  kir: number;
  kirAog: number;
  kap: number;
  berN: number;
  /** risk skoruna göre ilk 10 parçanın indeksi */
  top: number[];
  risk: Float64Array;
}

/**
 * Ağırlıklar / BER eşiği / alarm tamponu değiştiğinde tüm portföyü yeniden hesaplar.
 * "Ağırlık neden 3?" sorusunun cevabı: siz söyleyin, liste jürinin gözü önünde
 * yeniden sıralansın (CLAUDE.md §4.1 — parametre > sabit).
 */
export function paramHesap(p: ParamCfg): ParamSonuc {
  const w = [p.w0, p.w1, p.w2];
  let kir = 0;
  let kirAog = 0;
  let kap = 0;
  let berN = 0;
  const risk = new Float64Array(NPN);

  for (let i = 0; i < NPN; i++) {
    risk[i] = (w[PN.kr[i]] * PN.t25[i] * PN.ttr[i]) / 365;
    const t = PN.t25[i];
    if (t > 0) {
      const lam = t / 365;
      const tts = PN.svc[i] / lam;
      if (tts < PN.ttr[i] + p.tampon) {
        kir++;
        if (PN.kr[i] === 0) kirAog++;
        kap += Math.max(0, (PN.ttr[i] - tts) * lam) * PN.clp[i];
      }
    }
    if (PN.disrep[i] / PN.clp[i] > p.ber) berN++;
  }

  const top = Array.from({ length: NPN }, (_, i) => i)
    .sort((a, b) => risk[b] - risk[a])
    .slice(0, 10);
  return { kir, kirAog, kap, berN, top, risk };
}
