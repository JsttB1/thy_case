/**
 * HANGAR — saf geometri katmanı.
 *
 * three.js'e DOKUNMAZ. Uçuş profilleri, gövde/kanat kesitleri, motor istasyonları
 * ve komponent yerleşimi burada yalnız sayıdır; sahne bunları mesh'e çevirir.
 * Ayrı dosya olmasının gerekçesi kureGeo/araziGeo ile aynı: (1) testten geçsin,
 * (2) three chunk'ını ilk boyamaya bağlamasın.
 *
 * Koordinat sistemi (sahne ile ortak):
 *   +X  pist ekseni / kanat açıklığı     +Y  yukarı     −Z  hangar derinliği
 * Uçak: burun +Z, kanat ±X. Birim ≈ metre; gövde 39 birim (dar gövde referansı).
 */

/* ------------------------------------------------------------------ yardımcı */

/** 0..1 aralığına kırp. */
export const kirp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/** smoothstep — hızlanma/yavaşlama; kamera ve perde geçişleri bunu kullanır. */
export function kolay(t: number): number {
  const u = kirp01(t);
  return u * u * (3 - 2 * u);
}

/** a..b aralığındaki t'yi 0..1'e taşır (b <= a ise 0/1'e düşer). */
export function aralik(t: number, a: number, b: number): number {
  return b <= a ? (t < a ? 0 : 1) : kirp01((t - a) / (b - a));
}

export const karisim = (a: number, b: number, t: number): number => a + (b - a) * t;

/* --------------------------------------------------------------- uçuş profili */

export type UcusTipi = 'kalkis' | 'inis';

export interface UcusHali {
  x: number;
  y: number;
  z: number;
  /** burun açısı (rad, + = burun yukarı) */
  egim: number;
  /** yatış açısı (rad) */
  yatis: number;
  /** tekerlek yerde mi — iniş takımı ve pist tozu bununla açılır */
  yerde: boolean;
}

/** Pist geometrisi — kalkış ve iniş aynı şeridi paylaşır, z ile ayrılırlar. */
export const PIST = {
  x0: -220,
  x1: 260,
  /** rotasyon noktası: burun ne zaman kalkar (0..1) */
  rotasyon: 0.3,
  /** temas noktası: iniş hangi t'de tekerleği koyar */
  temas: 0.56,
  tirmanis: 96,
  yaklasma: 128,
} as const;

/**
 * KALKIŞ — üç safha: koşu (hızlanan), rotasyon (burun kalkar), tırmanış.
 *
 * x hızlanması bilerek t^1.55: doğrusal koşu "kayan oyuncak" gibi duruyordu,
 * kare ise uçağı ekrandan fırlatıyordu. 1.55 gözle "iterek hızlanan" okunuyor.
 */
export function kalkis(t: number, z: number): UcusHali {
  const u = kirp01(t);
  const yerde = u < PIST.rotasyon;
  const x = karisim(PIST.x0, PIST.x1, Math.pow(u, 1.55));

  // tırmanış eğrisi: rotasyondan sonra kuvvet yasası — dipte yumuşak, sonra dik
  const tirman = aralik(u, PIST.rotasyon, 1);
  const y = PIST.tirmanis * Math.pow(tirman, 1.28);

  // burun: rotasyonda 12°'ye fırlar, tırmanışta 8°'ye oturur
  const kalkanBurun = aralik(u, PIST.rotasyon, PIST.rotasyon + 0.07);
  const egim = karisim(0, 0.21, kolay(kalkanBurun)) - 0.08 * kolay(aralik(u, 0.5, 1));

  // kalkış dönüşü: gövde ancak emniyetli irtifada yatar
  const yatis = -0.22 * kolay(aralik(u, 0.62, 0.95));

  return { x, y, z, egim, yatis, yerde };
}

/**
 * İNİŞ — süzülüş (sabit eğim) → flare (burun yukarı, sink kesilir) → koşu.
 *
 * Süzülüş üssü 1.35: gerçek yaklaşma sabit açılıdır ama sabit açı ekranda
 * "cetvelle çizilmiş" duruyordu; hafif bombeli iniş gözle uçak gibi okunuyor.
 */
export function inis(t: number, z: number): UcusHali {
  const u = kirp01(t);
  const yerde = u >= PIST.temas;
  const x = karisim(PIST.x0, PIST.x1, u * 0.82 + Math.pow(u, 2.2) * 0.18);

  const suzulus = 1 - aralik(u, 0, PIST.temas);
  const ham = PIST.yaklasma * Math.pow(suzulus, 1.35);
  // flare: son %12'de irtifa sıfıra yumuşatılır, "çakılma" olmaz
  const flare = aralik(u, PIST.temas - 0.12, PIST.temas);
  const y = yerde ? 0 : ham * (1 - kolay(flare) * (1 - 0.06));

  // flare'de burun yukarı, temastan sonra burun yere iner
  const egim = yerde
    ? karisim(0.1, -0.01, kolay(aralik(u, PIST.temas, PIST.temas + 0.16)))
    : karisim(-0.035, 0.11, kolay(flare));

  return { x, y, z, egim, yatis: 0, yerde };
}

export function ucusHali(tip: UcusTipi, t: number, z: number): UcusHali {
  return tip === 'kalkis' ? kalkis(t, z) : inis(t, z);
}

/* ------------------------------------------------------------ gövde kesitleri */

export const GOVDE_R = 1.85;

/**
 * Gövde lathe profili: [z (uzunluk ekseni), r (yarıçap)] çiftleri.
 *
 * Nokta sayısı bilerek yüksek (17): ilk sürüm 12 noktayla "oyuncak" duruyordu,
 * çünkü burun tek bir konik kırılımla bitiyordu. Gerçek bir gövdede burun
 * SÜREKLİ eğrilir; kırılımı gözden kaçıran şey ara noktaların yoğunluğu.
 * Kabin bölümü 1,85'te düz, kuyruk 13 birim boyunca incelerek kapanır.
 */
export function govdeProfil(): [number, number][] {
  return [
    [-19.5, 0.07],
    [-18.6, 0.3],
    [-17.2, 0.58],
    [-15.4, 0.86],
    [-13.2, 1.14],
    [-10.8, 1.41],
    [-8.2, 1.63],
    [-5.4, 1.78],
    [-2.2, 1.84],
    [3.2, GOVDE_R],
    [7.8, 1.84],
    [10.9, 1.79],
    [13.1, 1.69],
    [14.9, 1.53],
    [16.4, 1.31],
    [17.7, 1.0],
    [18.7, 0.6],
    [19.5, 0.09],
  ];
}

/** Kuyruk kalkışının başladığı istasyon — kabin bittiği yer. */
export const KUYRUK_Z = -5.4;

/**
 * Kuyruk kalkışı (upsweep): lathe simetrik bir boru üretir, gerçek gövdenin
 * kuyruğu ise yukarı kıvrılır. Profil çevrildikten sonra her tepe noktası bu
 * fonksiyonun verdiği kadar Y'de kaydırılır — tek satırla siluet doğru okunur.
 */
export function kuyrukKalkisi(z: number): number {
  if (z > KUYRUK_Z) return 0;
  const u = aralik(-z, -KUYRUK_Z, 19.5);
  return u * u * 2.75;
}

/**
 * Kanat planformu — yarım kanat, ok açılı (swept), kırımlı hücum kenarı.
 * Dönen değer [açıklık, veter] noktaları; açıklık 0 kök, + uç.
 *
 * Kök veteri 12 birim, uç veteri 2,2: sivrilme oranı ~0,18 — dar gövde
 * jetlerinin gerçek değeri. İlk sürümde 0,35'ti ve kanat "kürek" gibi
 * duruyordu; oyuncak görüntüsünün en büyük tek sebebi buydu.
 */
export function kanatPlanform(): [number, number][] {
  return [
    [0, 7.4],
    [0, -4.6],
    [3.6, -6.3],
    [7.4, -7.9],
    [11.8, -9.3],
    [15.4, -10.2],
    [16.2, -9.1],
    [15.4, -7.0],
    [11.8, -3.3],
    [7.4, 0.6],
    [3.6, 4.2],
  ];
}

/** Kanat ucu kanatçığı (winglet) — [yükseklik, veter]; kanat ucuna dik oturur. */
export function winglet(): [number, number][] {
  return [
    [0, -7.0],
    [0, -10.2],
    [1.6, -9.7],
    [3.1, -8.6],
    [3.4, -7.9],
    [2.4, -7.3],
  ];
}

/** Dikey stabilizatör silueti — [yükseklik, veter]. */
export function dikeyKuyruk(): [number, number][] {
  return [
    [0, 3.6],
    [0, -4.2],
    [2.6, -5.0],
    [5.4, -5.6],
    [7.9, -5.9],
    [8.5, -4.9],
    [7.9, -1.9],
    [5.4, 0.4],
    [2.6, 2.2],
  ];
}

/** Yatay stabilizatör — kanadın küçük, daha az ok açılı kardeşi. */
export function yatayKuyruk(): [number, number][] {
  return [
    [0, 2.9],
    [0, -2.6],
    [2.6, -3.6],
    [5.2, -4.4],
    [5.8, -3.7],
    [5.2, -2.1],
    [2.6, 0.5],
  ];
}

/* ------------------------------------------------------------------ motor içi */

/** Kesitli motorun ana ölçüleri (yerel eksen: +Z hava girişi). */
export const MOTOR = {
  /** kaporta dış yarıçapı */
  disR: 1.5,
  /** hava girişi düzlemi */
  girisZ: 2.75,
  /** fan düzlemi */
  fanZ: 1.95,
  /** fan kanat ucu */
  fanR: 1.32,
  /** baypas kanalı çıkışı */
  baypasZ: -1.35,
  /** kor kaportası yarıçapı */
  korR: 0.78,
  /** egzoz konisinin ucu */
  kuyrukZ: -3.7,
} as const;

/**
 * Fan kanadı açısı ve burulması. Kanatlar eşit aralıklı; burulma kökte dik,
 * uçta yatık (gerçek fan böyle çalışır ve dönerken ışığı farklı yakalar).
 */
export function fanKanat(i: number, n: number): { aci: number; burulma: number } {
  return { aci: (i / n) * Math.PI * 2, burulma: 0.62 };
}

/**
 * KESİT AÇIKLIĞI — kaportadan çıkarılan dilim.
 *
 * Motor artık YANDAN gösteriliyor, bu yüzden kaportanın kameraya bakan yüzü
 * açılır ve içerideki kademeler görünür. Dilim sabittir (kamerayla dönmez):
 * kullanıcı serbest bakışta çevirdiğinde kapalı tarafı da görür — "kaportanın
 * altında ne var" sorusunun cevabı ancak iki taraf birlikte görülünce tamam olur.
 */
/*
 * basla açısı KAMERAYA GÖRE seçildi. Silindir teta'sı, gövde +Z eksenine
 * yatırıldıktan sonra dünya koordinatında şuna karşılık gelir:
 *   θ=0 → dip (−Y) · θ=π/2 → +X · θ=π → tepe (+Y) · θ=3π/2 → −X
 * Kamera motorun +X ve biraz üstünde durduğu için açıklığın ORTASI θ≈1,9'a
 * (yani +X ve hafif yukarı) denk gelmeli. İlk denemede açıklık θ≈5,3'teydi:
 * kesit kameranın ters tarafına bakıyordu ve ekranda kapalı, dolu bir beyaz
 * fıçı görünüyordu — motorun içi yine görünmüyordu.
 */
export const KESIT = { basla: Math.PI * 0.96, uzunluk: Math.PI * 1.28 } as const;

/**
 * Kor kesiti — kompresörden türbine daralıp genişleyen gövde.
 * Dönen değer [z, yarıçap]: LP kompresör → HP kompresör → yanma → türbin.
 */
export function korKesiti(): [number, number][] {
  return [
    [1.15, 0.55],
    [0.55, 0.48],
    [0.0, 0.4],
    [-0.55, 0.34],
    [-1.05, 0.42],
    [-1.55, 0.5],
    [-2.15, 0.6],
    [-2.7, 0.66],
  ];
}

/**
 * Kademe diskleri — kesitten görünen kompresör/türbin bıçak halkaları.
 * [z, iç yarıçap, dış yarıçap, kanat sayısı].
 */
export function kademeler(): [number, number, number, number][] {
  return [
    [1.5, 0.36, 0.72, 26], // booster 1
    [1.15, 0.36, 0.66, 28], // booster 2
    [0.72, 0.34, 0.56, 30], // HP komp 1
    [0.36, 0.32, 0.5, 32], // HP komp 2
    [0.0, 0.3, 0.45, 34], // HP komp 3
    [-0.32, 0.28, 0.4, 36], // HP komp 4
    [-1.15, 0.32, 0.52, 24], // HP türbin
    [-1.62, 0.34, 0.6, 22], // LP türbin 1
    [-2.1, 0.36, 0.68, 20], // LP türbin 2
  ];
}

/* -------------------------------------------------------- komponent istasyonu */

/**
 * Komponent rozetinin motordaki yeri: hangi istasyonda (z) ve hangi saat
 * yönünde (aci) durduğu.
 *
 * ESKİ TASARIM tek düzlemde bir halkaydı ve motoru YANDAN gösterince halka
 * kenardan görünüp rozetler üst üste biniyordu. Yenisi her komponenti KENDİ
 * fiziksel istasyonuna oturtuyor: fan öndeyse rozeti de önde. Böylece patlama
 * anında etiketler motorun boyunca yayılıyor ve "bu parça motorun neresinde"
 * sorusu görüntüden okunuyor.
 */
export interface Istasyon {
  z: number;
  aci: number;
}

export function komponentYeri(
  ist: Istasyon,
  dagilma: number,
  tabanR = 1.15,
): { x: number; y: number; z: number } {
  const r = tabanR + dagilma * 1.95;
  return { x: Math.cos(ist.aci) * r, y: Math.sin(ist.aci) * r, z: ist.z };
}

/* ------------------------------------------------------------- kamera yörünge */

/** Kamera duruşu — perde başına bir hedef; sahne bunlara yumuşar. */
export interface Duruş {
  poz: [number, number, number];
  bak: [number, number, number];
  fov: number;
}

/**
 * Uçağın zemine oturma yüksekliği: tekerlek altı tam y=0'a gelsin diye.
 * (Ana takım yerel −1,6'da, bacak 2,5, tekerlek yarıçapı 0,58.)
 */
export const UCAK_Y = 4.68;

/** Kesitli motorun sahnedeki yeri — uçağın sol naseliyle BİREBİR aynı nokta. */
export const MOTOR_MERKEZ: [number, number, number] = [-7.8, UCAK_Y - 1.15, 3.4];

/** Motor merkezine göre göreli duruş — kamera tabloları bunu kullanır. */
const m = (dx: number, dy: number, dz: number): [number, number, number] => [
  MOTOR_MERKEZ[0] + dx,
  MOTOR_MERKEZ[1] + dy,
  MOTOR_MERKEZ[2] + dz,
];

/**
 * Perde kameraları.
 *   0 hangar geneli → 1 pist/filo → 2 motora yanaşma (YANDAN) → 3 komponentler
 *   → 4 karar küresi
 *
 * Perde 2 ve 3 motoru ÜÇTE-BİR YANDAN görür: baştan bakınca yalnız fan diski
 * görünüyordu ve motorun içi — kademeler, yanma odası, türbin — hiç okunmuyordu.
 * Yandan bakış hem kesitin içini hem motorun boyunu aynı karede veriyor.
 */
export const KAMERA: Duruş[] = [
  { poz: [30, 9, 50], bak: [-9, 5.4, -4], fov: 44 },
  /* Perde 1 hangarın DIŞINDA. İçeriden bakınca kadrajın üst yarısını çatı
     makasları, ortasını kapı lentosu kesiyordu. Kamera bu duruşa giderken kapı
     boşluğundan geçer (y=24 lentonun altında kalır). */
  { poz: [-10, 24, -84], bak: [40, 16, -230], fov: 55 },
  { poz: m(5.6, 1.5, 6.2), bak: m(0, -0.1, 0.4), fov: 46 },
  { poz: m(7.6, 2.2, 7.4), bak: m(-0.4, 0, -0.2), fov: 52 },
  { poz: m(2.2, 0.6, 15.5), bak: m(0, 0, 0.5), fov: 44 },
];

/* --------------------------------------------------------------- nokta bulutu */

/**
 * Fibonacci küresi — n indeksi birim küre üzerinde düzgün dağıtır.
 * code/Kure.tsx'teki yerleşimin aynısı: son perdedeki karar küresi ile CODE
 * ekranındaki operasyon küresi AYNI dağılım olsun, kapı açıldığında görüntü
 * devam etsin diye.
 */
export function fibonacciKure(n: number): Float32Array {
  const p = new Float32Array(n * 3);
  const alt = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = alt * i;
    p[i * 3] = Math.cos(th) * r;
    p[i * 3 + 1] = y;
    p[i * 3 + 2] = Math.sin(th) * r;
  }
  return p;
}
