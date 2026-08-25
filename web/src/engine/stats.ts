/**
 * Olasılık çekirdeği — core.py'deki Poisson mantığının tarayıcı ikizi.
 *
 * Neden tarayıcıda tekrar hesaplanıyor: kaydırıcılar (senaryo şoku, servis hedefi,
 * alarm tamponu) 5.000 parçayı canlı yeniden hesaplar. Sunucu yok, hazır tablo yok —
 * jüri değeri değiştirdiğinde sayı gerçekten yeniden üretilir.
 *
 * Doğrulama: build sırasında ayrı kodla (numpy, 800 rastgele deneme) koşulan sonuç ile
 * buradaki kapalı form %99,5 örtüşür (payload.mc.uyum) — engine.test.ts bunu kontrol eder.
 */

/** Ters normal CDF — Acklam yaklaşımı (|hata| < 1,15e-9). */
export function invNorm(p: number): number {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= 1 - pl) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/**
 * Servis hedefli MIN seviyesi: ⌈mu⌉ + emniyet stoğu.
 * mu > 100'de Poisson CDF taşar → normal yaklaşım (core.poisson_emniyet_stogu ile aynı eşik).
 */
export function poissonMin(mu: number, h: number): number {
  if (mu <= 0) return 0;
  if (mu > 100) return Math.ceil(mu) + Math.ceil(invNorm(h) * Math.sqrt(mu));
  let term = Math.exp(-mu);
  let cdf = term;
  let k = 0;
  while (cdf < h && k < 3000) {
    k++;
    term *= mu / k;
    cdf += term;
  }
  return Math.ceil(mu) + Math.max(0, k - mu);
}

/**
 * P(tedarik süresi boyunca gelen talep ≤ s) — "stok yeterlilik olasılığı".
 * Parça eğrisi de, önerilen aksiyonun risk öncesi/sonrası değeri de buradan okunur.
 */
export function poisCdf(mu: number, s: number): number {
  if (mu <= 0) return 1;
  if (s < 0) return 0;
  if (mu > 100) {
    const phi = (z: number) =>
      0.5 * (1 + Math.tanh(Math.sqrt(Math.PI / 8) * z * (1 + 0.044715 * z * z)));
    return Math.min(1, Math.max(0, phi((s + 0.5 - mu) / Math.sqrt(mu))));
  }
  let term = Math.exp(-mu);
  let acc = term;
  for (let k = 1; k <= s; k++) {
    term *= mu / k;
    acc += term;
  }
  return Math.min(1, acc);
}

/**
 * Tedarik penceresinde beklenen eksik adet ve ikinci momenti:
 *   E1 = Σ(k−s)·p(k),  E2 = Σ(k−s)²·p(k)   (k > s)
 * Kuyruk pmf ihmal edilir hale gelince durur — parça başına ~40 terim.
 * E2, belirsizlik hesabında maliyet varyansını verir (parçalar bağımsız → varyanslar toplanır).
 */
export function eksikMoment(mu: number, s: number): [number, number] {
  if (mu <= 0) return [0, 0];
  if (mu > 500) return [Math.max(0, mu - s), mu]; // pratikte oluşmaz
  const k0 = Math.max(0, Math.floor(s) + 1);
  let E1 = 0;
  let E2 = 0;
  // p(k0): büyük mu'da doğrudan çarpım taşar → log üzerinden
  let lg = -mu + k0 * Math.log(Math.max(mu, 1e-12));
  for (let j = 2; j <= k0; j++) lg -= Math.log(j);
  let p = Math.exp(lg);
  for (let k = k0, n = 0; n < 4000; k++, n++) {
    const d = k - s;
    E1 += d * p;
    E2 += d * d * p;
    p *= mu / (k + 1);
    if (p < 1e-12 && k > mu) break;
  }
  return [Math.max(0, E1), Math.max(0, E2)];
}

export const beklenenEksik = (mu: number, s: number): number => eksikMoment(mu, s)[0];

/** Normal kuantil çarpanları — belirsizlik aralığı seçicisi (%80/%90/%95). */
export const Z: Record<number, number> = { 80: 1.2816, 90: 1.6449, 95: 1.96 };
