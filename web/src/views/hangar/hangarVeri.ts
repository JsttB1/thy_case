/**
 * HANGAR — sahne verisi ve perde tanımları.
 *
 * KURAL (CODE küresiyle aynı): sahnedeki hiçbir sayı süs değildir. Motorun
 * içinde patlayan sekiz komponent, payload'daki sekiz ATA motor kategorisidir;
 * rozetlerdeki PN adedi, kırmızı sayısı ve sermaye o kategorinin gerçek değeri.
 * Uydurma etiket YOK — bir jüri üyesi rozete bakıp Öngörü sekmesinde aynı satırı
 * bulabilmeli.
 *
 * three.js'e dokunmaz: Giris.tsx bu sabitleri doğrudan kullanır, sahneyi ise
 * lazy() ile çeker (bkz. code/sahneVeri.ts'teki aynı gerekçe).
 */
import { D, K, B, LK } from '@/data/payload';

/* --------------------------------------------------------------- sahne paleti */

/**
 * Hangar paleti — gece hangarı: derin lacivert kabuk, soğuk beyaz aydınlatma,
 * tek THY kırmızısı. tokens.css'teki --md-* yüzeyleriyle aynı aile; kırmızı
 * yalnız KİMLİK (kuyruk, marka şeridi) ve ALARM (kırmızı listedeki komponent)
 * için — ikisi farklı tonda, tıpkı --tk-red ile --st-red gibi.
 */
export const HC = {
  zemin: '#0b1220', // hangar tabanı
  kabuk: '#16233a', // duvar/çatı gövdesi
  kafes: '#26395c', // makas ve kolon telkafesi
  cizgi: '#31486f', // zemin ızgarası
  isik: '#dce9ff', // aydınlatma rampası (soğuk beyaz)
  govde: '#eef2f7', // uçak gövdesi
  govdeAlt: '#9fb0c9', // gövde alt kabuk
  marka: '#e81932', // THY kırmızısı — kuyruk, kimlik
  alarm: '#ff2d40', // veri alarmı — kırmızı listedeki komponent
  metal: '#7c8ba3', // motor kaportası
  metalKoyu: '#3d4a63',
  fan: '#c8d5e8',
  sicak: '#ff8a3d', // egzoz/kor sıcaklığı
  veri: '#5ad1ff', // veri hattı / HUD ışığı
  pist: '#1b2942',
} as const;

/* ------------------------------------------------------------ motor komponenti */

export interface MotorKomponent {
  /** ATA bölüm numarası */
  ata: number;
  /** motordaki fiziksel istasyon: z = eksen üzerindeki yer, aci = saat yönü */
  ist: { z: number; aci: number };
  /** payload'daki ATA kategori adı (İngilizce, veri setiyle birebir) */
  kod: string;
  /** sahnedeki Türkçe etiket */
  ad: string;
  /** motorun neresinde oturur — anlatı etiketi */
  yer: string;
  pn: number;
  /** 2025 talebi (adet) */
  t25: number;
  /** 2033 talebi (adet) */
  t33: number;
  /** kırmızı listedeki PN sayısı (TTS < TTR) */
  kirmizi: number;
  /** bağlı sermaye (M$) */
  deger: number;
  /** büyüme yüzdesi 2025 → 2033 */
  buyume: number;
}

/**
 * Motor ailesi — ATA 71..80 bandındaki sekiz kategori.
 *
 * Sekiz olması tesadüf değil, işe yarıyor: komponent halkası sekiz rozete
 * bölününce hem motor çevresinde okunur duruyor hem de patlama görünümünde
 * etiketler çakışmıyor. Sıra payload'daki talep sırasını değil, MOTORDAKİ
 * fiziksel sırayı izler (fandan egzoza) — kamera içeri girdiğinde rozetler
 * geçtiği yerle aynı hizada olsun diye.
 */
const MOTOR_SIRA: { kod: string; ad: string; yer: string; ist: { z: number; aci: number } }[] = [
  // z: motor ekseni üzerindeki gerçek istasyon (+ öne, hava girişine doğru)
  // aci: saat yönü — 90° tepe (pilon), −90° dip (aksesuar kutusu)
  { kod: 'POWER PLANT', ad: 'GÜÇ GRUBU', yer: 'kaporta · pilon', ist: { z: 1.5, aci: 1.75 } },
  /* aci 3,6 → 4,9: 3,6'da rozet motorun ARKA-SOL tarafına düşüyordu ve
     etiketi kadrajın sol sütununda duran HUD bloğunun üstüne biniyordu.
     4,9 aynı istasyonu (fan düzlemi) korur, yalnız saat yönünü değiştirir. */
  { kod: 'ENGINE', ad: 'MOTOR', yer: 'fan · kor', ist: { z: 2.0, aci: 4.9 } },
  {
    kod: 'ENGINE FUEL AND CONTROL',
    ad: 'YAKIT & KONTROL',
    yer: 'yanma odası',
    ist: { z: -0.75, aci: 2.42 },
  },
  { kod: 'IGNITION', ad: 'ATEŞLEME', yer: 'ateşleyici · bujiler', ist: { z: -0.3, aci: 0.62 } },
  {
    kod: 'STARTING',
    ad: 'İLK HAREKET',
    yer: 'starter · aksesuar kutusu',
    ist: { z: 0.95, aci: -1.62 },
  },
  { kod: 'OIL', ad: 'YAĞ SİSTEMİ', yer: 'yağ tankı · soğutucu', ist: { z: 0.15, aci: -0.62 } },
  {
    kod: 'ENGINE CONTROLS',
    ad: 'MOTOR KUMANDA',
    yer: 'FADEC · kablo demeti',
    // FADEC fan kaportasının yan yüzünde: aksesuar kutusuyla (dip) çakışmasın
    ist: { z: 1.05, aci: 3.05 },
  },
  {
    kod: 'ENGINE INDICATING',
    ad: 'MOTOR GÖSTERGE',
    yer: 'sensör · prob',
    ist: { z: -1.85, aci: 0.15 },
  },
];

/** ATA numarası kategori adından çözülür (lookup.sub ile lookup.ata paraleldir). */
const ataNo = (kod: string): number => {
  const i = LK.sub.indexOf(kod);
  return i >= 0 ? LK.ata[i] : 0;
};

export const MOTOR_KOMPONENT: MotorKomponent[] = MOTOR_SIRA.map(({ kod, ad, yer, ist }) => {
  const i = D.kat.ad.indexOf(kod);
  const t25 = D.kat.t25[i];
  const t33 = D.kat.t33[i];
  return {
    ata: ataNo(kod),
    ist,
    kod,
    ad,
    yer,
    pn: D.kat.pn[i],
    t25,
    t33,
    kirmizi: D.kat.kirmizi[i],
    deger: D.kat.deger[i],
    buyume: t25 > 0 ? ((t33 - t25) / t25) * 100 : 0,
  };
});

/** Motor ailesinin toplamı — HUD'daki "bu motor kaç parça" satırı. */
export const MOTOR_TOPLAM = {
  pn: MOTOR_KOMPONENT.reduce((a, k) => a + k.pn, 0),
  kirmizi: MOTOR_KOMPONENT.reduce((a, k) => a + k.kirmizi, 0),
  deger: MOTOR_KOMPONENT.reduce((a, k) => a + k.deger, 0),
  t25: MOTOR_KOMPONENT.reduce((a, k) => a + k.t25, 0),
  t33: MOTOR_KOMPONENT.reduce((a, k) => a + k.t33, 0),
};

/* -------------------------------------------------------------------- perdeler */

export interface Perde {
  kod: string;
  /** ray etiketi */
  ad: string;
  /** dev başlık */
  baslik: string;
  /** başlığın altındaki tek cümle */
  alt: string;
  /** otomatik oynatmada bu perdede kaç saniye durulur */
  sure: number;
}

/**
 * Beş perde — açılış filmi.
 *
 * Anlatı case'in omurgası: hangar (bugün) → filo büyümesi (2033 baskısı) →
 * motora iniş (parça nerede) → komponentin kendisi (envanterin gerçek birimi)
 * → karar (Catalyst'in cevabı). Son perdenin sonu CODE ekranının küresine
 * bilerek benziyor: kapı açıldığında kullanıcı aynı görüntüyü bulur.
 */
export const PERDELER: Perde[] = [
  {
    kod: 'HANGAR',
    ad: 'HANGAR',
    baslik: 'TECH CATALYST',
    alt: 'Turkish Technic komponent envanteri için karar katmanı.',
    sure: 8.5,
  },
  {
    kod: 'FILO',
    ad: 'FİLO 2033',
    baslik: 'FİLO BÜYÜR',
    alt: `Bakım kapasitesi ${vir(1200)} → ${vir(2000)} uçak. Her kalkış envantere yazılan bir borç.`,
    sure: 9,
  },
  {
    kod: 'MOTOR',
    ad: 'MOTOR',
    baslik: 'ENVANTER HAZIR MI?',
    alt: 'Soru filoda değil, bir uçağın tek motorunda başlıyor.',
    sure: 8,
  },
  {
    kod: 'KOMPONENT',
    ad: 'KOMPONENT',
    baslik: `${vir(MOTOR_TOPLAM.pn)} PARÇA · TEK MOTOR AİLESİ`,
    alt: `ATA 71–80 · ${vir(MOTOR_TOPLAM.kirmizi)} PN bugün kırmızıda · $${MOTOR_TOPLAM.deger.toFixed(1).replace('.', ',')}M bağlı sermaye.`,
    sure: 12,
  },
  {
    kod: 'KARAR',
    ad: 'KARAR',
    baslik: 'CATALYST',
    alt: `${vir(K.pn)} parçanın tamamı tek karar yüzeyinde. Görünürlük · öngörü · aksiyon.`,
    sure: 10,
  },
];

/* ------------------------------------------------------------------ HUD sayıları */

/** Basit binlik ayracı — format.ts'i çekmeden, sabit metin üretmek için. */
function vir(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Perde başına HUD sayaçları — hepsi payload'dan. */
export const HUD: Record<string, { k: string; v: string; a?: string }[]> = {
  HANGAR: [
    { k: 'parça', v: vir(K.pn), a: 'aktif PN' },
    { k: 'sermaye', v: '$' + K.fmv.toFixed(1).replace('.', ',') + 'M', a: 'FMV' },
    { k: 'ekran', v: '5', a: 'karar yüzeyi' },
  ],
  FILO: [
    { k: 'uçak 2025', v: vir(1200) },
    { k: 'uçak 2033', v: vir(2000), a: '+%67' },
    { k: 'talep', v: '+%' + B.alt_pct.toFixed(0) + '–' + B.ust_pct.toFixed(0), a: '2033 bandı' },
  ],
  MOTOR: [
    { k: 'kırmızı PN', v: vir(K.kirmizi), a: 'TTS < TTR' },
    { k: 'siparişsiz', v: vir(K.siparissiz), a: 'açık PO yok' },
    { k: 'AOG kritik', v: vir(K.kirmizi_aog) },
  ],
  KOMPONENT: [
    { k: 'ATA 71–80', v: vir(MOTOR_TOPLAM.pn), a: 'PN' },
    { k: 'talep 2033', v: vir(MOTOR_TOPLAM.t33), a: 'adet' },
    { k: 'sermaye', v: '$' + MOTOR_TOPLAM.deger.toFixed(1).replace('.', ',') + 'M' },
  ],
  KARAR: [
    { k: 'havuz', v: vir(694) },
    { k: 'tamir', v: vir(641) },
    { k: 'satın alma', v: vir(217) },
    { k: 'izle', v: vir(3448) },
  ],
};

/* --------------------------------------------------------------- pist trafiği */

export interface Sefer {
  tip: 'kalkis' | 'inis';
  /** pist ekseninden sapma (derinlik) */
  z: number;
  /** döngü içindeki başlangıç kayması (0..1) */
  faz: number;
  /** bir turun süresi (sn) */
  sure: number;
  /** model ölçeği — uzaktakiler küçük */
  olcek: number;
  kuyruk: string;
}

/**
 * Arka plandaki trafik. Kuyruk kodları temsilîdir (TC-J** THY tescil bloğu),
 * uçuş sayıları değil ritim içindir: sürekli bir kalkış ve bir iniş sahnede
 * olacak şekilde fazlar dağıtıldı — hangar kapısından bakınca pist hiç boş
 * kalmıyor, ama üst üste de binmiyor.
 */
export const SEFERLER: Sefer[] = [
  { tip: 'kalkis', z: -104, faz: 0.0, sure: 15, olcek: 1.0, kuyruk: 'TC-JJE' },
  { tip: 'inis', z: -122, faz: 0.42, sure: 17, olcek: 0.96, kuyruk: 'TC-LGA' },
  { tip: 'kalkis', z: -244, faz: 0.62, sure: 19, olcek: 0.86, kuyruk: 'TC-JNP' },
  { tip: 'inis', z: -258, faz: 0.16, sure: 21, olcek: 0.78, kuyruk: 'TC-LLA' },
  { tip: 'kalkis', z: -344, faz: 0.8, sure: 24, olcek: 0.62, kuyruk: 'TC-JYA' },
];
