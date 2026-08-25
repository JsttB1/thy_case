/**
 * ÖNERİLEN AKSİYON — parça bazlı tek karar.
 *
 * Karar Merkezi'ndeki toplu kanal dağılımı da, buradaki tekil öneri de aynı
 * kanalSec() çağrısından geçer; ekranlar çelişemez. Kart ayrıca aksiyonun
 * etkisini söyler: stok yetmeme riski %A → %B.
 */
import { PN, PRM } from '@/data/payload';
import { kanalSec, type Adim } from './ladder';
import { FL, hasF } from './flags';
import { poisCdf } from './stats';
import { fmt } from './format';

export interface Oneri {
  best: Adim;
  /** en hızlı kanaldan da hızlı bir donör sökümü varsa köprü olarak sunulur */
  kopru: Adim | null;
  acik: number;
  gerek: boolean;
  ad: string;
  gerekce: string;
  /** mevcut stokla stok yetmeme riski (%) */
  rOnce: number;
  /** MIN seviyesine çıkılırsa (%) */
  rSonra: number;
}

const GEREKCE = (best: Adim): string =>
  ({
    pool: `Değişim ağı bugün de işliyor; acil ihtiyaç havuzdan ${best.gun} günde kapanır.`,
    ictamir: `İç atölye kabiliyeti var; tamir süresi kısaltılarak boru hattı hızlandırılır.`,
    distamir: `Standart tamir kanalı; iş emri bugün açılırsa parça ${best.gun} günde döner.`,
    hizli: `Ek ücretle öne alınır; bekleme ${best.gun} güne iner.`,
    alim: `Tedarik süresi uzun; MIN seviyesine çıkmak için sipariş şimdi açılmalı.`,
    sokum: `Rafta bekleyen arızalı donör tek hızlı kaynak; söküm kayıt altına alınır.`,
  })[best.t];

export function oner(i: number): Oneri {
  const { ops, best } = kanalSec(i);
  const ber = hasF(i, FL.BER);
  const kopru = ops.find((o) => o.t === 'sokum' && o.gun < best.gun) || null;
  const mu = (PN.rate33[i] * PN.lead[i]) / PRM.ceyrek_gun;
  const acik = Math.max(PN.min33[i] - PN.svc[i], 0);

  /* Açık yoksa aksiyon da yok: kanal ancak stok MIN'in altına düşerse devreye girer.
     Aksiyon sonrası stok hiçbir zaman azalmaz — hedef, mevcut stok ile MIN'in büyüğü. */
  return {
    best,
    kopru,
    acik,
    gerek: acik > 0,
    ad: acik > 0 ? best.ad : 'Aksiyon gerekmiyor — izlemede kalsın',
    gerekce:
      acik > 0
        ? (ber ? 'Tamir ekonomik değil, hurda adayı. ' : '') +
          GEREKCE(best) +
          (kopru
            ? ` Donörden söküm ${kopru.gun} günde köprü kurar ama borç defterine yazılır.`
            : '')
        : `Elde ${fmt(PN.svc[i])} adet var, önerilen MIN ${fmt(PN.min33[i])} — stok yeterli. ` +
          `Seviye MIN'in altına düşerse en hızlı kanal ${best.ad} (${best.gun} gün).`,
    rOnce: Math.round(100 * (1 - poisCdf(mu, PN.svc[i]))),
    rSonra: Math.round(100 * (1 - poisCdf(mu, Math.max(PN.svc[i], PN.min33[i])))),
  };
}
