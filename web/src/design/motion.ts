/**
 * Hareket tokenları — tokens.css'teki --hiz-* / --egri-* değerlerinin JS ikizi.
 * Tek yerden yönetilir ki CSS geçişleri ile framer-motion aynı ritimde kalsın.
 *
 * 3D katmanı geldiğinde sahne giriş/çıkışları da bu eğrileri kullanır: kamera
 * hareketi ile sayfa geçişi aynı süre/easing ile başlarsa geçiş tek hareket gibi okunur.
 */
import type { Transition, Variants } from 'framer-motion';

export const HIZ = {
  anlik: 0.09,
  hizli: 0.16,
  orta: 0.26,
  yavas: 0.42,
  sahne: 0.62,
} as const;

/** cubic-bezier kontrol noktaları — tokens.css ile birebir */
export const EGRI = {
  standart: [0.22, 0.61, 0.36, 1],
  cikis: [0.4, 0, 1, 1],
  giris: [0, 0, 0.2, 1],
  yay: [0.34, 1.56, 0.64, 1],
} as const;

export const gecis = {
  hizli: { duration: HIZ.hizli, ease: EGRI.standart },
  orta: { duration: HIZ.orta, ease: EGRI.standart },
  yavas: { duration: HIZ.yavas, ease: EGRI.standart },
  yay: { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 },
  yumusakYay: { type: 'spring', stiffness: 210, damping: 28 },
} satisfies Record<string, Transition>;

/**
 * Sekme (sayfa) geçişi — yön duyarlı yatay kayma + hafif bulanıklık.
 *
 * Bilerek VARYANT DEĞİL, doğrudan değer: varyant kullanılırsa framer-motion
 * varyant adını tüm alt motion bileşenlerine yayar ve içerideki kart/liste
 * animasyonları (gizli/gorunur) sahne adlarıyla çakışıp yarı saydam kilitlenir.
 */
export const sahne = (yon: number) => ({
  initial: { opacity: 0, x: yon * 26, filter: 'blur(2px)' },
  animate: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: HIZ.sahne * 0.62, ease: EGRI.giris },
  },
  exit: {
    opacity: 0,
    x: yon * -26,
    filter: 'blur(2px)',
    transition: { duration: HIZ.orta, ease: EGRI.cikis },
  },
});

/** Kart/blok listelerinde sıralı giriş (stagger). */
export const listeVaryant: Variants = {
  gizli: {},
  gorunur: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};

export const ogeVaryant: Variants = {
  gizli: { opacity: 0, y: 12 },
  gorunur: { opacity: 1, y: 0, transition: { duration: HIZ.yavas, ease: EGRI.giris } },
};

/** Panel/modal açılışı. */
export const panelVaryant: Variants = {
  gizli: { opacity: 0, x: 24, scale: 0.985 },
  gorunur: { opacity: 1, x: 0, scale: 1, transition: gecis.yay },
  cikan: { opacity: 0, x: 24, scale: 0.985, transition: gecis.hizli },
};

export const perdeVaryant: Variants = {
  gizli: { opacity: 0 },
  gorunur: { opacity: 1, transition: gecis.hizli },
  cikan: { opacity: 0, transition: gecis.hizli },
};
