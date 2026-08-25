/**
 * Kriz arazisi geometrisi kontrolleri.
 *
 * Bu testler "kod çalışıyor mu" demiyor; 3D'ye geçerken sessizce bozulabilecek
 * şeyleri kilitliyor: satır sıralaması anlamını kaybetmesin, normalize 0..1
 * kalsın, boş ızgarada sıfıra bölme olmasın, çubuklar ızgaradan taşmasın ve
 * marka kırmızısı veri rampasına sızmasın.
 */
import { describe, it, expect } from 'vitest';
import { araziKur, hucreYer, kameraKonum, taramaX, rampaRgb, rampaHex, OLCU } from './araziGeo';

/** 3 ay × 4 satır — ay 0 baz, sonra tırmanma */
const SERI = [
  [2, 9, 4, 0],
  [6, 14, 5, 1],
  [3, 11, 4, 0],
];
const ET = ['A', 'B', 'C', 'D'];

const bul = (a: ReturnType<typeof araziKur>, ix: number, iz: number) =>
  a.hucreler.find((h) => h.ix === ix && h.iz === iz)!;

describe('ızgara kurulumu', () => {
  it('boyutlar seri ve etiket sayısından gelir', () => {
    const a = araziKur(SERI, ET, 'kategori', false);
    expect(a.nx).toBe(3);
    expect(a.nz).toBe(4);
    expect(a.hucreler.length).toBe(12);
    expect(a.ayEt.length).toBe(3);
    expect(a.satirEt.length).toBe(4);
  });

  it('sıralama kapalıyken kaynak sıra korunur', () => {
    const a = araziKur(SERI, ET, 'marj', false);
    expect(a.satirEt).toEqual(ET);
    expect(a.satirIdx).toEqual([0, 1, 2, 3]);
  });

  it('satırlar BAZ AYIN değerine göre azalan sıralanır', () => {
    const a = araziKur(SERI, ET, 'kategori', true);
    expect(a.satirEt).toEqual(['B', 'C', 'A', 'D']);
    for (let z = 1; z < a.nz; z++)
      expect(SERI[0][a.satirIdx[z]]).toBeLessThanOrEqual(SERI[0][a.satirIdx[z - 1]]);
  });

  it('sıralamadan sonra da hücre doğru aya ve satıra bağlı kalır', () => {
    const a = araziKur(SERI, ET, 'kategori', true);
    // ön sıra (iz=0) = B kategorisi → 2. ayda 14
    expect(bul(a, 1, 0).v).toBe(14);
    // iz=3 = D kategorisi → 2. ayda 1
    expect(bul(a, 1, 3).v).toBe(1);
  });

  it('maksimum bulunur ve normalize değer tam 1 olur', () => {
    const a = araziKur(SERI, ET, 'kategori', true);
    expect(a.maks).toBe(14);
    expect(bul(a, 1, 0).t).toBeCloseTo(1, 9);
    a.hucreler.forEach((h) => {
      expect(h.t).toBeGreaterThanOrEqual(0);
      expect(h.t).toBeLessThanOrEqual(1);
    });
  });

  it('sıralama açıkken kırmızı bölge kavramı düşer', () => {
    expect(araziKur(SERI, ET, 'kategori', true, 4).kirmiziSatir).toBe(0);
    expect(araziKur(SERI, ET, 'marj', false, 4).kirmiziSatir).toBe(4);
  });

  it('boş seri çökmez', () => {
    const a = araziKur([], ET, 'kategori', true);
    expect(a.nx).toBe(0);
    expect(a.hucreler.length).toBe(0);
    expect(a.maks).toBe(0);
  });

  it('tümü sıfır olan ızgarada sıfıra bölme yok', () => {
    const a = araziKur(
      [
        [0, 0],
        [0, 0],
      ],
      ['x', 'y'],
      'marj',
      false,
    );
    expect(a.maks).toBe(0);
    a.hucreler.forEach((h) => expect(Number.isFinite(h.t)).toBe(true));
    a.hucreler.forEach((h) => expect(h.t).toBe(0));
  });

  it('ay etiketleri 0. ayı kriz öncesi olarak adlandırır', () => {
    const a = araziKur(SERI, ET, 'kategori', false);
    expect(a.ayEt[0]).toBe('baz');
    expect(a.ayEt[2]).toBe('2. ay');
  });
});

describe('yerleşim', () => {
  const a = araziKur(SERI, ET, 'kategori', true);

  it('hücreler ızgara sınırları içinde kalır', () => {
    a.hucreler.forEach((h) => {
      const p = hucreYer(h, a);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(OLCU.gen / 2);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(OLCU.der / 2);
      expect(p.y).toBeLessThanOrEqual(OLCU.boy + 1e-9);
    });
  });

  it('yükseklik değerle birlikte artar, tabanı sıfırdan büyüktür', () => {
    const buyuk = hucreYer(bul(a, 1, 0), a).y;
    const kucuk = hucreYer(bul(a, 0, 0), a).y;
    expect(buyuk).toBeGreaterThan(kucuk);
    // "veri yok" ile "değer sıfır" ayrışsın diye minimum görünür yükseklik
    expect(hucreYer(bul(a, 0, 3), a).y).toBeGreaterThan(0);
  });

  it('komşu hücreler tam bir hücre aralığı kadar ötede', () => {
    const p0 = hucreYer(bul(a, 0, 0), a);
    const p1 = hucreYer(bul(a, 1, 0), a);
    expect(p1.x - p0.x).toBeCloseTo(p0.gx, 9);
    expect(p0.gx).toBeCloseTo(OLCU.gen / a.nx, 9);
    expect(p0.gz).toBeCloseTo(OLCU.der / a.nz, 9);
  });

  it('tarama çizgisi seçili ayın sütununa oturur', () => {
    for (let ay = 0; ay < a.nx; ay++)
      expect(taramaX(ay, a)).toBeCloseTo(hucreYer(bul(a, ay, 0), a).x, 9);
  });

  it('tarama çizgisi ızgara dışına taşan aya kırpılır', () => {
    expect(taramaX(99, a)).toBeCloseTo(taramaX(a.nx - 1, a), 9);
    expect(taramaX(-4, a)).toBeCloseTo(taramaX(0, a), 9);
  });

  it('kamera ızgaranın dışından ve üstünden bakar', () => {
    const [x, y, z] = kameraKonum();
    expect(y).toBeGreaterThan(OLCU.boy);
    expect(Math.hypot(x, z)).toBeGreaterThan(OLCU.der / 2);
  });
});

describe('renk rampası', () => {
  it('girdiler 0..1 aralığına kırpılır', () => {
    expect(rampaRgb(-3)).toEqual(rampaRgb(0));
    expect(rampaRgb(9)).toEqual(rampaRgb(1));
    rampaRgb(0.37).forEach((k) => {
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
    });
  });

  it('sıcaklık arttıkça kırmızılaşır, mavi bileşen düşer', () => {
    const soguk = rampaRgb(0);
    const sicak = rampaRgb(1);
    expect(sicak[0]).toBeGreaterThan(soguk[0]);
    expect(sicak[2]).toBeLessThan(soguk[2]);
    expect(rampaRgb(0.75)[1]).toBeLessThan(rampaRgb(0.5)[1]);
  });

  it('hex biçimi ve durak renkleri', () => {
    expect(rampaHex(0)).toBe('#b9c0c8');
    expect(rampaHex(0.5)).toBe('#c6a26b');
    expect(rampaHex(1)).toBe('#c1121f');
  });

  /* Kimlik rengi ile veri rengi ayrı işler: bir çubuk kırmızıysa "alarm" demek,
     "Turkish Airlines" demek değil. */
  it('marka kırmızısı rampada YOK', () => {
    for (let k = 0; k <= 100; k++) expect(rampaHex(k / 100)).not.toBe('#e81932');
  });
});
