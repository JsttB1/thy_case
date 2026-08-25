/**
 * Sahne sabitleri — three.js'e DOKUNMAZ.
 *
 * Bilerek ayrı dosya: Code.tsx bu sabitleri (efsane renkleri, kaynak listesi)
 * doğrudan kullanır; küreyi ise lazy() ile çeker. Sabitler Kure.tsx içinde
 * kalsaydı statik import three chunk'ını ilk boyamaya bağlar ve açılış ~300 KB
 * ağırlaşırdı (rollup bunu INEFFECTIVE_DYNAMIC_IMPORT diye uyarıyor).
 */

/**
 * Sahne paleti — SİYAH · KIRMIZI · BEYAZ (code.css sinyal renkleriyle aynı aile).
 * Küredeki nokta rengi tek eksende okunur: kırmızı parladıkça acil, nötr
 * griye indikçe pasif. Hue ile değil açıklıkla ayrışır (bkz. kure/kureStil.ts).
 */
export const SC = {
  alarm: '#ff2d40', // siparişsiz kırmızı — en acil
  kirmizi: '#ff9aa2', // tükeniyor — ikinci kademe
  aksiyon: '#f2f3f5', // aksiyon bekleyen — beyaz
  izle: '#4e5057', // izlemede — pasif gri
  aksan: '#e81932', // halka/tel kafes aksanı (marka tonu)
  notr: '#94969e', // ikincil nötr seri
  cizgi: '#2a2a31',
} as const;

/** Dağınık kaynaklar — yörüngedeki düğümler (CLAUDE.md §1.3 saha haritası). */
export const KAYNAKLAR = [
  { kod: 'AMOS', ad: 'bakım kayıtları', tip: 'kayıt' },
  { kod: 'TRAX', ad: 'komponent geçmişi', tip: 'kayıt' },
  { kod: 'ÜPK', ad: 'üretim planlama', tip: 'kayıt' },
  { kod: 'WMS', ad: 'depo · bin/raf', tip: 'kayıt' },
  { kod: 'GÜMRÜK', ad: 'antrepo · transit', tip: 'kayıt' },
  { kod: 'POOL', ad: 'havuz ortakları', tip: 'dış' },
  { kod: 'OEM', ad: 'vendor · fiyat', tip: 'dış' },
  { kod: 'TAHMİN', ad: 'talep motoru', tip: 'motor' },
  { kod: 'LLM', ad: 'dil katmanı', tip: 'motor' },
] as const;

export const TIP_RENK: Record<string, string> = {
  kayıt: SC.aksiyon,
  dış: SC.notr,
  motor: SC.aksan,
};
