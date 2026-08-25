/**
 * KÜRE GEOMETRİSİ — saf matematik, three.js BİLMEZ.
 *
 * Harita 3D'ye geçerken kural aynı kaldı: hesap render'dan bağımsız (haritaVeri.ts
 * süreleri/kanalları verir, bu dosya konumları). Buradaki her fonksiyon düz sayı
 * dizisi döndürür; sahne bunları tampona koyar, testler aynı fonksiyonları
 * doğrudan çağırır.
 *
 * Eksen düzeni (three-globe ile aynı): lon 0° → +X, kuzey kutbu → +Y.
 * Doğu yönü kürenin sağına düşer — kureGeo.test.ts bunu (IST sağda, JFK solda)
 * ayrı bir kontrolle kilitler ki kıta konturu asla ayna görüntüsü olmasın.
 */
import { DUNYA } from '@/data/dunya';
import { HA } from '../haritaVeri';

const DEG = Math.PI / 180;

/** Küre yarıçapı — sahnedeki bütün ölçüler bunun katı. */
export const R = 1;

/** lon/lat (derece) → küre üzerinde 3D nokta. */
export function llv(lon: number, lat: number, r: number = R): [number, number, number] {
  const phi = (90 - lat) * DEG;
  const th = (lon + 180) * DEG;
  const s = Math.sin(phi);
  return [-r * s * Math.cos(th), r * Math.cos(phi), r * s * Math.sin(th)];
}

/** Havalimanı konumları — sahnede en çok okunan dizi, bir kez hesaplanır. */
export const IST_POZ: [number, number, number][] = HA.kod.map((_, i) =>
  llv(HA.lon[i], HA.lat[i], R),
);

/* ------------------------------------------------------------------ büyük çember */

/**
 * İki havalimanı arasında büyük çember yayı.
 *
 * Nokta sayısı sabit değil: kısa hatlar (SAW→IST) az, uzun hatlar (IST→SIN) çok
 * örnekle çizilir — akış parçacıkları polylineʼı doğrusal örneklediği için
 * örnek sıklığı doğrudan akışın pürüzsüzlüğüdür.
 *
 * Yükselti: yay ortada `kabart` kadar kalkar (uçuş hissi + üst üste binen
 * hatların ayrışması). Uzun hat daha yüksek kalkar, kısa hat yere yapışır.
 */
export function yayNoktalari(
  a: number,
  b: number,
  yukselti = 1,
): { poz: Float32Array; n: number; aci: number } {
  const va = IST_POZ[a];
  const vb = IST_POZ[b];
  const d = Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const om = Math.acos(d);
  const n = Math.max(24, Math.min(220, Math.round((om / Math.PI) * 260) + 24));
  const kabart = (0.045 + 0.3 * (om / Math.PI)) * yukselti;
  const poz = new Float32Array((n + 1) * 3);
  const so = Math.sin(om);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let x: number;
    let y: number;
    let z: number;
    if (so < 1e-6) {
      x = va[0] + (vb[0] - va[0]) * t;
      y = va[1] + (vb[1] - va[1]) * t;
      z = va[2] + (vb[2] - va[2]) * t;
    } else {
      const k1 = Math.sin((1 - t) * om) / so;
      const k2 = Math.sin(t * om) / so;
      x = va[0] * k1 + vb[0] * k2;
      y = va[1] * k1 + vb[1] * k2;
      z = va[2] * k1 + vb[2] * k2;
    }
    // yüzeyden kalkış: uçlarda 0, ortada `kabart`
    const h = 1 + kabart * Math.sin(Math.PI * t);
    const l = Math.hypot(x, y, z) || 1;
    poz[i * 3] = (x / l) * R * h;
    poz[i * 3 + 1] = (y / l) * R * h;
    poz[i * 3 + 2] = (z / l) * R * h;
  }
  return { poz, n, aci: om };
}

/** Polyline üzerinde t∈[0,1] konumu — akış parçacıkları her karede bunu çağırır. */
export function yayOrnek(poz: Float32Array, n: number, t: number, out: Float32Array, o: number) {
  const f = Math.max(0, Math.min(0.999999, t)) * n;
  const i = Math.floor(f);
  const k = f - i;
  const a = i * 3;
  const b = (i + 1) * 3;
  out[o] = poz[a] + (poz[b] - poz[a]) * k;
  out[o + 1] = poz[a + 1] + (poz[b + 1] - poz[a + 1]) * k;
  out[o + 2] = poz[a + 2] + (poz[b + 2] - poz[a + 2]) * k;
}

/* ------------------------------------------------------------------ kara zemini */

type Halka = { p: [number, number][]; b: [number, number, number, number] };

/** Halkaların 20°×20° hücrelere düşen kaba dizini — nokta testi 1.500 halkayı taramasın. */
const HUC = 20;
const hucAnahtar = (lon: number, lat: number) =>
  Math.floor((lon + 180) / HUC) * 100 + Math.floor((lat + 90) / HUC);

let _halka: Halka[] | null = null;
let _dizin: Map<number, number[]> | null = null;

function dizinKur() {
  if (_halka && _dizin) return { halka: _halka, dizin: _dizin };
  const halka: Halka[] = [];
  const dizin = new Map<number, number[]>();
  DUNYA.forEach((ring) => {
    if (ring.length < 3) return;
    let lo1 = 180;
    let la1 = 90;
    let lo2 = -180;
    let la2 = -90;
    for (const [lo, la] of ring) {
      if (lo < lo1) lo1 = lo;
      if (lo > lo2) lo2 = lo;
      if (la < la1) la1 = la;
      if (la > la2) la2 = la;
    }
    const j = halka.length;
    halka.push({ p: ring, b: [lo1, la1, lo2, la2] });
    for (let lo = Math.floor(lo1 / HUC) * HUC; lo <= lo2; lo += HUC)
      for (let la = Math.floor(la1 / HUC) * HUC; la <= la2; la += HUC) {
        const k = hucAnahtar(
          Math.max(-180, Math.min(179.9, lo)),
          Math.max(-90, Math.min(89.9, la)),
        );
        const v = dizin.get(k);
        if (v) v.push(j);
        else dizin.set(k, [j]);
      }
  });
  _halka = halka;
  _dizin = dizin;
  return { halka, dizin };
}

/** Işın atma (ray casting) — nokta halkanın içinde mi. */
function icinde(p: [number, number][], lon: number, lat: number): boolean {
  let ic = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i];
    const [xj, yj] = p[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) ic = !ic;
  }
  return ic;
}

/** Bu lon/lat karada mı — kara noktası ızgarasının tek karar kuralı. */
export function karada(lon: number, lat: number): boolean {
  const { halka, dizin } = dizinKur();
  const aday = dizin.get(hucAnahtar(lon, lat));
  if (!aday) return false;
  for (const j of aday) {
    const h = halka[j];
    if (lon < h.b[0] || lon > h.b[2] || lat < h.b[1] || lat > h.b[3]) continue;
    if (icinde(h.p, lon, lat)) return true;
  }
  return false;
}

/**
 * Nokta matrisi kara zemini — "tech globe" dokusu.
 *
 * Neden doku (texture) değil: uygulama internetsiz çalışmak ve tek dosyaya
 * gömülmek zorunda (CLAUDE.md §10). Hazır earth.jpg yok; kıtalar aynı 110m
 * konturdan, çalışma anında noktalanarak üretiliyor. Enlem yükseldikçe boylam
 * adımı 1/cos(lat) ile açılır, böylece noktalar kutuplarda sıkışmaz.
 */
export function karaNoktalari(adim = 1.35): Float32Array {
  const out: number[] = [];
  for (let lat = -84; lat <= 84; lat += adim) {
    const c = Math.cos(lat * DEG);
    if (c < 0.02) continue;
    const dlon = adim / c;
    for (let lon = -180; lon < 180; lon += dlon) {
      if (!karada(lon, lat)) continue;
      const v = llv(lon, lat, R * 1.0015);
      out.push(v[0], v[1], v[2]);
    }
  }
  return new Float32Array(out);
}

/** Kıyı çizgileri — halkalar ardışık ikililer hâlinde (LineSegments). */
export function konturCizgileri(r = R * 1.004): Float32Array {
  const out: number[] = [];
  DUNYA.forEach((ring) => {
    for (let i = 1; i < ring.length; i++) {
      // ±180 kırılmasında halkayı bağlama: uzun atlamayı at
      if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) continue;
      const a = llv(ring[i - 1][0], ring[i - 1][1], r);
      const b = llv(ring[i][0], ring[i][1], r);
      out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    }
  });
  return new Float32Array(out);
}

/** Meridyen/paralel ızgarası — küreye derinlik veren teknik doku. */
export function izgaraCizgileri(adim = 30, r = R * 1.0008): Float32Array {
  const out: number[] = [];
  const ekle = (a: [number, number, number], b: [number, number, number]) =>
    out.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  for (let lat = -60; lat <= 60; lat += adim)
    for (let lon = -180; lon < 180; lon += 3) ekle(llv(lon, lat, r), llv(lon + 3, lat, r));
  for (let lon = -180; lon < 180; lon += adim)
    for (let lat = -87; lat < 87; lat += 3) ekle(llv(lon, lat, r), llv(lon, lat + 3, r));
  return new Float32Array(out);
}

/* ------------------------------------------------------------------ kamera */

/**
 * Bir noktalar kümesini çerçeveleyen kamera konumu: ortalama yön + kümenin
 * yayılımına göre uzaklık. Rota geldiğinde küre kendini kaynak/hedef ikilisine
 * çevirir; tek istasyon seçilince o istasyona bakar.
 */
export function cerceve(idx: number[], enAz = 1.9, enCok = 4.4): [number, number, number] {
  if (!idx.length) return [0, 0, 3.2];
  let x = 0;
  let y = 0;
  let z = 0;
  idx.forEach((i) => {
    x += IST_POZ[i][0];
    y += IST_POZ[i][1];
    z += IST_POZ[i][2];
  });
  const l = Math.hypot(x, y, z) || 1;
  x /= l;
  y /= l;
  z /= l;
  // yayılım: merkez yöne en uzak noktanın açısı
  let enUzak = 0;
  idx.forEach((i) => {
    const d = Math.max(-1, Math.min(1, x * IST_POZ[i][0] + y * IST_POZ[i][1] + z * IST_POZ[i][2]));
    enUzak = Math.max(enUzak, Math.acos(d));
  });
  const uz = Math.max(enAz, Math.min(enCok, 1.55 + enUzak * 1.75));
  return [x * uz, y * uz, z * uz];
}
