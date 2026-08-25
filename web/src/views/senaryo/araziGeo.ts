/**
 * KRİZ ARAZİSİ GEOMETRİSİ — saf matematik, three.js BİLMEZ.
 *
 * (Repodaki `kureGeo.ts` ile aynı seam: hesap render'dan bağımsız, testler
 * node'da koşar, sahne yalnız çizer.)
 *
 * NEDEN ARAZİ, NEDEN KÜRE DEĞİL: uygulamada zaten iki küre var (CODE parça
 * çekirdeği, harita dünyası). Buradaki veri COĞRAFİ DEĞİL — iki eksenli bir
 * ızgara: kategori × ay. Doğru gösterim bir yükseklik alanıdır.
 *
 * NEDEN YÜZEY DEĞİL ÇUBUK: kategoriler sürekli bir eksen değil; aralarını
 * interpolasyonla doldurmak var olmayan ara değerler uydurmak olurdu. Çubuk
 * ayrık veriyi ayrık gösterir.
 */

export interface Hucre {
  /** ay ekseni (genişlik) */
  ix: number;
  /** satır ekseni (derinlik) */
  iz: number;
  v: number;
  /** normalize sıcaklık: v / maks ∈ 0..1 */
  t: number;
}

export interface Arazi {
  mod: 'kategori' | 'marj';
  /** sütun sayısı (ay) */
  nx: number;
  /** satır sayısı (kategori ya da kova) */
  nz: number;
  hucreler: Hucre[];
  maks: number;
  satirEt: string[];
  /** sıralamadan sonra satırın kaynak dizideki indeksi */
  satirIdx: number[];
  ayEt: string[];
  /** marj modunda ilk N satır kırmızı bölge; kategori modunda 0 */
  kirmiziSatir: number;
}

/** Izgaranın dünya ölçüleri: genişlik(ay) × derinlik(satır) × maksimum boy. */
export const OLCU = { gen: 13, der: 9, boy: 3.4 } as const;

export type Olcu = typeof OLCU;

/**
 * Izgarayı kurar.
 *
 * @param seriler  seriler[ay][satır] — kategori modunda `byKat`, marj modunda kova dizisi
 * @param etiketler satır etiketleri (kaynak sırada)
 * @param sirala   satırlar BAZ AYIN (ay 0) değerine göre azalan sıralansın mı
 *
 * Kategori sırası bilinçli: ATA kodları bir şiddet ekseni değil. Yüzeyin
 * okunabilir olması için ön sıraya en kötü kategori gelir — böylece derinlik
 * ekseni de anlam taşır. Marj modunda kovalar zaten sıralı, dokunulmaz.
 */
export function araziKur(
  seriler: number[][],
  etiketler: string[],
  mod: 'kategori' | 'marj',
  sirala: boolean,
  kirmiziSatir = 0,
): Arazi {
  const nx = seriler.length;
  const nz = nx ? seriler[0].length : etiketler.length;

  let satirIdx = Array.from({ length: nz }, (_, i) => i);
  if (sirala && nx) {
    const baz = seriler[0];
    satirIdx = satirIdx.sort((a, b) => (baz[b] ?? 0) - (baz[a] ?? 0));
  }

  let maks = 0;
  for (let x = 0; x < nx; x++)
    for (let z = 0; z < nz; z++) maks = Math.max(maks, seriler[x][satirIdx[z]] ?? 0);

  const hucreler: Hucre[] = [];
  for (let x = 0; x < nx; x++)
    for (let z = 0; z < nz; z++) {
      const v = seriler[x][satirIdx[z]] ?? 0;
      // maks 0 olabilir (baz senaryoda marj kovası boş) → sıfıra bölme yok
      hucreler.push({ ix: x, iz: z, v, t: maks > 0 ? v / maks : 0 });
    }

  return {
    mod,
    nx,
    nz,
    hucreler,
    maks,
    satirEt: satirIdx.map((i) => etiketler[i] ?? ''),
    satirIdx,
    ayEt: Array.from({ length: nx }, (_, i) => (i === 0 ? 'baz' : String(i) + '. ay')),
    // sıralama açıkken "kırmızı bölge" kavramı düşer: kovaların yeri değişti
    kirmiziSatir: sirala ? 0 : kirmiziSatir,
  };
}

/**
 * Hücrenin dünya konumu ve çubuk ölçüsü.
 *
 * `Math.max(0.02, …)` yükseklik tabanı ŞART: yoksa "veri yok" ile "değer sıfır"
 * ayırt edilemez, ızgarada delik açılır.
 */
export function hucreYer(h: Hucre, a: Arazi, o: Olcu = OLCU) {
  const gx = o.gen / Math.max(1, a.nx);
  const gz = o.der / Math.max(1, a.nz);
  return {
    x: (h.ix + 0.5) * gx - o.gen / 2,
    z: (h.iz + 0.5) * gz - o.der / 2,
    y: Math.max(0.02, h.t * o.boy),
    gx,
    gz,
  };
}

/**
 * Sabit, eğik bakış — arazi bir mimari maket gibi durur.
 * Çarpanlar ızgaranın köşesi kadraja SIĞACAK şekilde ölçüldü: daha yakın bir
 * kamerada (0,62 · 2,5 · 1,42) son ay sütunu sağdan kırpılıyordu.
 */
export const kameraKonum = (o: Olcu = OLCU): [number, number, number] => [
  o.gen * 0.72,
  o.boy * 2.7,
  o.der * 1.62,
];

/** Seçili ayı işaretleyen tarama düzleminin dünya x'i. */
export function taramaX(ay: number, a: Arazi, o: Olcu = OLCU): number {
  const gx = o.gen / Math.max(1, a.nx);
  return (Math.max(0, Math.min(a.nx - 1, ay)) + 0.5) * gx - o.gen / 2;
}

/* ------------------------------------------------------------------- renk rampası */

/**
 * Üç duraklı rampa — AÇIK ZEMİN İÇİN ölçüldü.
 *
 * (a) Soğuk uç bilerek açık gri değil ORTA gri: ilk denemede `#E7EBEF` ile
 *     başlıyordu ve beyaz zeminde çubukların yarısı görünmüyordu.
 * (b) Marka kırmızısı `#E81932` rampada YOK: bu bir veri serisi, kimlik değil.
 *     Test bunu kilitliyor.
 */
const DURAK: [number, number, number][] = [
  [0.725, 0.753, 0.784], // #B9C0C8 nötr orta gri
  [0.776, 0.635, 0.42], // #C6A26B altın
  [0.757, 0.071, 0.122], // #C1121F kritik
];

export function rampaRgb(t: number): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  const seg = u < 0.5 ? 0 : 1;
  const k = (u - seg * 0.5) / 0.5;
  const a = DURAK[seg];
  const b = DURAK[seg + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

const iki = (v: number) =>
  Math.round(Math.max(0, Math.min(1, v)) * 255)
    .toString(16)
    .padStart(2, '0');

/** CSS efsane şeridi ve takvim çubukları aynı rampadan boyanır. */
export function rampaHex(t: number): string {
  const [r, g, b] = rampaRgb(t);
  return '#' + iki(r) + iki(g) + iki(b);
}
