/**
 * AKSİYON MERDİVENİ — sahadaki eskalasyon sırasının ürün hâli.
 * (CLAUDE.md §1.3: atölye → hangar stoğu → vendor → komponent hizmetleri →
 *  kanibalizasyon → AOG timi. Bugün telefonla yürüyen bu merdiven burada sıralanır.)
 *
 * ladderOps → kanalSec zinciri hem watchlist'teki "önerilen aksiyon" kartını hem
 * Karar Merkezi'ndeki toplu kanal dağılımını besler: iki ekran çelişemez.
 */
import { PN } from '@/data/payload';
import { FL, hasF } from './flags';

export type KanalTip = 'pool' | 'ictamir' | 'distamir' | 'hizli' | 'alim' | 'sokum';
export type Kova = 'pool' | 'tamir' | 'alim' | 'izle' | 'fazla';

export interface Adim {
  t: KanalTip;
  ad: string;
  /** neden bu seçenek listede */
  sm: string;
  gun: number;
  /** birim maliyet (USD) — söküm için yok */
  m: number | null;
  tag?: string;
}

export const BIRIM: Record<KanalTip, string> = {
  pool: 'Havuz ve değişim masası',
  ictamir: 'Atölye planlama',
  distamir: 'Dış tedarik',
  hizli: 'Dış tedarik',
  alim: 'Satınalma',
  sokum: 'Depo',
};

/** kanal kovası: iç/dış/hızlı tamir tek "tamir" kovasında toplanır */
export const KOVA: Record<string, Kova> = {
  pool: 'pool',
  ictamir: 'tamir',
  distamir: 'tamir',
  hizli: 'tamir',
  alim: 'alim',
};

export const KANAL_AD: Record<Kova, string> = {
  pool: 'Havuz / exchange',
  tamir: 'Tamir döngüsü',
  alim: 'Yeni satın alma',
  izle: 'İzle',
  fazla: 'Fazla stok',
};

export type Pencere = 'gecmis' | 'p030' | 'p3090' | 'p90';

export const PENCERE_AD: Record<Pencere | 'gecmis0', string> = {
  gecmis: 'sipariş penceresi geçmiş',
  gecmis0: 'penceresi geçmiş · siparişsiz',
  p030: '0–30 gün',
  p3090: '30–90 gün',
  p90: '90+ gün / stratejik',
};

/** Bir parça için tüm tedarik seçenekleri, süreye göre sıralı. */
export function ladderOps(i: number): Adim[] {
  const ops: Adim[] = [];
  if (PN.exin[i] + PN.exout[i] > 0)
    ops.push({
      t: 'pool',
      ad: 'Havuzdan değişim',
      sm: 'değişim ağı bugün de işliyor',
      gun: 3,
      m: 0.1 * PN.clp[i],
      tag: "ücret varsayımı liste fiyatının %10'u",
    });
  if (PN.ato[i] && PN.tic[i] != null)
    ops.push({
      t: 'ictamir',
      ad: 'İç atölye tamiri',
      sm: 'iç tamir mümkün',
      gun: PN.tic[i]!,
      m: PN.icrep[i],
    });
  ops.push({
    t: 'distamir',
    ad: 'Dış tamir',
    sm: hasF(i, FL.BER) ? 'dikkat: bu parçada tamir ekonomik değil' : 'standart tamir kanalı',
    gun: PN.tdis[i],
    m: PN.disrep[i],
  });
  ops.push({
    t: 'hizli',
    ad: 'Hızlandırılmış dış tamir',
    sm: 'ek ücretle öne alınır',
    gun: Math.ceil(PN.tdis[i] * 0.6),
    m: PN.disrep[i] * 1.5,
    tag: 'süre 0,6 katına iner, maliyet 1,5 kat',
  });
  ops.push({
    t: 'alim',
    ad: 'Yeni satın alma',
    sm: 'üreticiden sıfır tedarik',
    gun: PN.tsat[i],
    m: PN.clp[i],
  });
  if (PN.gay[i] > 0)
    ops.push({
      t: 'sokum',
      ad: 'Donörden söküm',
      sm: PN.gay[i] + ' arızalı donör rafta bekliyor',
      gun: 1,
      m: null,
      tag: 'kayıt altında, borç defterine işlenir',
    });
  ops.sort((a, b) => a.gun - b.gun);
  return ops;
}

/**
 * En hızlı GERÇEK tedarik kanalı.
 * Donörden söküm kanal sayılmaz (yalnız köprü); hurda adayında (BER) tamir kanalları
 * elenir — tamiri liste fiyatına yaklaşan parçayı tamir etmek kural gereği yasak.
 */
export function kanalSec(i: number, berEsigi?: number): { ops: Adim[]; best: Adim } {
  const ops = ladderOps(i);
  const ber = berEsigi == null ? hasF(i, FL.BER) : PN.disrep[i] / PN.clp[i] > berEsigi;
  const tamirKanali = (t: KanalTip) => t === 'ictamir' || t === 'distamir' || t === 'hizli';
  const uygun = ops.filter((o) => o.t !== 'sokum' && !(ber && tamirKanali(o.t)));
  return { ops, best: uygun[0] || ops[0] };
}
