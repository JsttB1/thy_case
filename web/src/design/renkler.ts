/**
 * Grafik renk paleti — tokens.css'teki değerlerin JS ikizi (Chart.js somut değer ister).
 *
 * KURAL: marka kırmızısı (C.marka) hiçbir veri serisinde kullanılmaz. Bir çubuk
 * kırmızıysa "alarm" demektir, "Turkish Airlines" demek değil. Kimlik ile durumu
 * ayırmak, sunumdaki tek renkli vurgunun gücünü koruyor.
 */
export const C = {
  bg: '#ECEDEE',
  panel: '#F8F8F9',
  panel2: '#E3E4E6',
  panel3: '#D9DADD',
  line: '#DCDDDF',
  lineSoft: '#E6E7E9',
  axis: '#C8CACD',
  text: '#26282A',
  muted: '#6A6E72',
  dim: '#8E9296',

  marka: '#E81932', // yalnız kimlik / birincil eylem
  navy: '#16233A', // 3D sahne yüzeyi — sayfa paletinin dışında

  /* SAYFA nötr gri, VERİ renkli. İkisi ayrı iş: zemin sakin kalmalı ama
     seriler birbirinden ayırt edilebilmeli. Tamamı griye çekilince grafikler
     okunmaz oldu — kategoriler tek gri lekeye dönüşüyordu. */
  iyi: '#1B7A55',
  uyari: '#9A6B12',
  kritik: '#C1121F',
  bilgi: '#2C6CA8',
  mor: '#6B4E9B',
  gri: '#7C838C',
  altin: '#C6A26B',
} as const;

/** anlamsal takma adlar — port edilen çağrı noktaları tek satır değişmeden çalışır */
export const CC = {
  ...C,
  teal: C.iyi,
  amber: C.uyari,
  red: C.kritik,
  blue: C.bilgi,
  violet: C.mor,
};

/**
 * Grafik DOLGU paleti — C'den ayrı, çünkü iki farklı iş yapıyorlar.
 *
 * C metin için kurulu: açık zeminde okunması gerektiğinden tonlar koyu. Aynı
 * tonlar bir çubuğun tamamını boyayınca ekran ağırlaşıyor, C.uyari gibi koyu
 * sarılar da haki/hardal görünüyordu. Dolgular ayrı bir rampadan gelir.
 *
 * KURAL — "ne kadar?" sorusunu yanıtlayan her seri tek aileden (çelik mavisi)
 * beslenir; koyuluk büyüklüğü kodlar. Renk yalnız ANLAM taşıdığında değişir:
 * yeşil = tutan/büyüyen, kırmızı = alarm, gri = referans.
 *
 * Bir denemede bu aile de griye çekilmişti (sayfa nötrleşince "her şey nötr
 * olsun" diye). Grafikler okunmaz oldu: yan yana dört gri çubuk tek lekeye
 * dönüşüyor. SAYFA nötr, VERİ renkli — ikisi ayrı iş.
 * Renk yalnız ANLAM taşıdığında değişir: yeşil = tutan/büyüyen, kırmızı =
 * alarm, gri = referans. Böylece grafik gökkuşağına dönmüyor ve tek bir renkli
 * çubuk gördüğümüzde bunun bir şey söylediğini biliyoruz.
 */
export const S = {
  s1: '#17456F',
  s2: '#2C6CA8',
  s3: '#4A8CC4',
  s4: '#7FB0DA',
  s5: '#B4D2EB',
  s6: '#DCE9F5',

  yesil: '#1B7A55',
  yesilAcik: '#BFE0D0',
  notr: '#C6CBD1',
  notrKoyu: '#7C838C',
  alarm: '#C1121F',
  alarmAcik: '#EFC9CD',
} as const;

/** kritiklik sınıfı renkleri: AOG KRİTİK / KRİTİK / KRİTİK DEĞİL */
export const KR_RENK = ['#C1121F', '#A8761B', '#8A929C'] as const;

/**
 * Opak tonlama: açık zeminde alfa rengi soldurur, ton ile hiyerarşi kurulur.
 * k = 1 → tam renk, k = 0 → beyaz.
 */
export function tint(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const m = (v: number) => Math.round(v + (255 - v) * (1 - k));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

/**
 * 0..1 → tek aile ısı rampası (açık çelik → koyu çelik).
 *
 * Eskisi gri → bej → kırmızı geçiyordu: bej ara ton çamurlanıyordu ve en yoğun
 * hücre "alarm" gibi okunuyordu — oysa orada yalnızca "en çok talep buradan
 * geliyor" yazıyor. Tek hue'da sıralama gözle anında kuruluyor, kırmızı da
 * gerçekten alarm demek istediğimiz yerlere kalıyor.
 */
export function isiRenk(t: number): string {
  const stops = [
    [232, 238, 245],
    [122, 172, 214],
    [23, 69, 111],
  ];
  const u = Math.max(0, Math.min(1, t));
  const seg = u < 0.5 ? 0 : 1;
  const v = (u - seg * 0.5) / 0.5;
  const a = stops[seg];
  const b = stops[seg + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * v)},${Math.round(
    a[1] + (b[1] - a[1]) * v,
  )},${Math.round(a[2] + (b[2] - a[2]) * v)})`;
}

/** Isı hücresinin yazı rengi — koyu tonda mürekkep okunmaz, beyaza döner. */
export function isiMetin(t: number): string | undefined {
  return t > 0.52 ? '#FFFFFF' : undefined;
}
