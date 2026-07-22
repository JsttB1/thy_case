import type { PnData } from '../data/types';

/**
 * Tarayıcı tarafı hesap motoru (spec bölüm 5).
 * 5.000 PN üzerinde tam tarama ≈2 ms — slider hareket ederken canlı koşabilir.
 * Kolonsal dizilerle çalışır, satır nesnesi üretmez: ara nesne ayırmak
 * bu döngüde hesabın kendisinden pahalı.
 */

export const QDAYS = 91.25;

export interface SenaryoGirdi {
  /** 0–0,8 */
  talepSoku: number;
  /** 0–1,0 */
  leadGecikme: number;
  /** 0–0,3 — servis hedefi z bonusu */
  servisBonusu: number;
}

export interface SenaryoSonuc {
  acikPn: number;
  acikPnAog: number;
  acikAdet: number;
  ekTampon: number;
  ekSermaye: number;
  minToplam: number;
}

/** Baz durum (şok yok) referansı — ek tampon/sermaye buna göre ölçülür. */
export function senaryoCoz(d: PnData, g: SenaryoGirdi, bazMin?: Int32Array): SenaryoSonuc {
  const c = d.cols;
  const n = d.n;

  let acikPn = 0;
  let acikPnAog = 0;
  let acikAdet = 0;
  let ekTampon = 0;
  let ekSermaye = 0;
  let minToplam = 0;

  const aogIndex = d.dict.krit.indexOf('AOG KRİTİK');

  for (let i = 0; i < n; i++) {
    const rate = c.rate33[i] * (1 + g.talepSoku);
    const lead = c.lead[i] * (1 + g.leadGecikme);
    const lamL = (rate * lead) / QDAYS;
    const z = c.z[i] * (1 + g.servisBonusu);

    const ss = Math.ceil(z * Math.sqrt(lamL));
    const min = Math.ceil(lamL) + ss;

    minToplam += min;

    const stok = c.stock[i];
    if (stok < min) {
      acikPn += 1;
      if (c.krit[i] === aogIndex) acikPnAog += 1;
      acikAdet += min - stok;
    }

    if (bazMin) {
      const fark = min - bazMin[i];
      if (fark > 0) {
        ekTampon += fark;
        ekSermaye += fark * c.clp[i];
      }
    }
  }

  return { acikPn, acikPnAog, acikAdet, ekTampon, ekSermaye, minToplam };
}

/** Baz durumdaki min stok vektörü — bir kez hesaplanıp senaryolar arasında paylaşılır. */
export function bazMinVektoru(d: PnData): Int32Array {
  const c = d.cols;
  const out = new Int32Array(d.n);
  for (let i = 0; i < d.n; i++) {
    const lamL = (c.rate33[i] * c.lead[i]) / QDAYS;
    out[i] = Math.ceil(lamL) + Math.ceil(c.z[i] * Math.sqrt(lamL));
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────
   Filo ölçekleme (F51)
   ───────────────────────────────────────────────────────────── */

export interface FiloSonuc {
  filo: number;
  /** √λ ile ölçeklenen emniyet stoğu — önerilen min stok toplamı */
  minKarekok: number;
  /** talep ile doğru orantılı ölçekleme — "mevcut yapıyla ölçekle" */
  minDogrusal: number;
  acikPn: number;
  sermayeKarekok: number;
  sermayeDogrusal: number;
}

/**
 * k = (N − 1200) / 800 · rateN = rate₂₅ + (rate₃₃ − rate₂₅)·k
 *
 * Doğrusal referans: 2025 min stoğunu talep oranıyla çarpmak. Emniyet stoğunun
 * √λ ile büyüdüğünü görmezden gelen naif ölçekleme bu; makas oradan doğuyor.
 */
export function filoCoz(d: PnData, N: number): FiloSonuc {
  const c = d.cols;
  const k = (N - 1200) / 800;

  let minKarekok = 0;
  let minDogrusal = 0;
  let acikPn = 0;
  let sermayeKarekok = 0;
  let sermayeDogrusal = 0;

  for (let i = 0; i < d.n; i++) {
    const rate25 = c.rate25[i];
    const rateN = rate25 + (c.rate33[i] - rate25) * k;

    const lamL = (rateN * c.lead[i]) / QDAYS;
    const min = Math.ceil(lamL) + Math.ceil(c.z[i] * Math.sqrt(lamL));

    // doğrusal: 2025 min stoğu × talep oranı
    const oran = rate25 > 0 ? rateN / rate25 : 1;
    const minLin = c.min25[i] * oran;

    minKarekok += min;
    minDogrusal += minLin;
    if (c.stock[i] < min) acikPn += 1;
    sermayeKarekok += min * c.clp[i];
    sermayeDogrusal += minLin * c.clp[i];
  }

  return { filo: N, minKarekok, minDogrusal, acikPn, sermayeKarekok, sermayeDogrusal };
}

/* ─────────────────────────────────────────────────────────────
   Little's Law — TAT kaldıracı (F52)
   ───────────────────────────────────────────────────────────── */

export interface TatSonuc {
  /** dolaşımdaki ihtiyaç = sökülme hızı × döngü süresi */
  dolasimAdet: number;
  dolasimSermaye: number;
  farkAdet: number;
  farkSermaye: number;
}

export function tatCoz(d: PnData, tatDegisim: number, bazDolasim?: number): TatSonuc {
  const c = d.cols;
  let dolasimAdet = 0;
  let dolasimSermaye = 0;

  for (let i = 0; i < d.n; i++) {
    const gunlukSokulme = c.rate33[i] / QDAYS;
    const dongu = c.lead[i] * (1 + tatDegisim);
    const adet = gunlukSokulme * dongu;
    dolasimAdet += adet;
    dolasimSermaye += adet * c.clp[i];
  }

  return {
    dolasimAdet,
    dolasimSermaye,
    farkAdet: bazDolasim != null ? dolasimAdet - bazDolasim : 0,
    farkSermaye: 0,
  };
}

/* ─────────────────────────────────────────────────────────────
   √n havuzlama (F42)
   ───────────────────────────────────────────────────────────── */

export interface HavuzlamaSonuc {
  ssDagitik: number;
  ssHavuzlu: number;
  tasarrufOran: number;
  tasarrufAdet: number;
  tasarrufSermaye: number;
}

/**
 * ssDağınık = Σᵢ z√(λᵢ·L) · ssHavuzlu = z√(Σᵢ λᵢ·L)
 * Karekök yasası: n eşit istasyona bölünmüş stok, merkezî havuza göre √n kat
 * fazla emniyet stoğu ister.
 */
export function havuzlamaCoz(
  d: PnData,
  paylar: number[],
  ortalamaBirimDeger?: number,
): HavuzlamaSonuc {
  const c = d.cols;
  let ssDagitik = 0;
  let ssHavuzlu = 0;
  let sermayeFark = 0;

  const toplamPay = paylar.reduce((a, b) => a + b, 0) || 1;
  const normal = paylar.map((p) => p / toplamPay);

  for (let i = 0; i < d.n; i++) {
    const lamL = (c.rate33[i] * c.lead[i]) / QDAYS;
    const z = c.z[i];

    let dagitik = 0;
    for (const pay of normal) dagitik += z * Math.sqrt(lamL * pay);
    const havuzlu = z * Math.sqrt(lamL);

    ssDagitik += dagitik;
    ssHavuzlu += havuzlu;
    sermayeFark += (dagitik - havuzlu) * c.clp[i];
  }

  const tasarrufOran = ssDagitik > 0 ? 1 - ssHavuzlu / ssDagitik : 0;

  return {
    ssDagitik,
    ssHavuzlu,
    tasarrufOran,
    tasarrufAdet: ssDagitik - ssHavuzlu,
    tasarrufSermaye: ortalamaBirimDeger != null ? (ssDagitik - ssHavuzlu) * ortalamaBirimDeger : sermayeFark,
  };
}
