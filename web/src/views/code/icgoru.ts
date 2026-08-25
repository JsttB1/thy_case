/**
 * CODE içgörü akışı — panelde "AI konuşuyor" gibi görünen satırların üreteci.
 *
 * DÜRÜSTLÜK NOTU: dil katmanı (cümle kalıpları, öncelik sırası, güven yüzdeleri)
 * bu dosyada sabittir; içindeki SAYILARIN HEPSİ core.py → payload.json → engine
 * zincirinden canlı gelir. Yani metin senaryolu, veri değil. Panelin altında bu
 * ayrım yazıyla da belirtilir (CLAUDE.md §11: "anomali gizlenmez, raporlanır").
 */
import { D, K, PN, LK } from '@/data/payload';
import { kararMotoru } from '@/engine/karar';
import { type FlagKey } from '@/engine/flags';
import { fmt, mM, pct, vir } from '@/engine/format';

export type IcgoruTip = 'alarm' | 'risk' | 'firsat' | 'plan';

export interface Icgoru {
  id: string;
  tip: IcgoruTip;
  /** modelin kendini gösterdiği kaynak etiketi */
  kaynak: string;
  /** güven yüzdesi — dil katmanının kendi beyanı */
  guven: number;
  baslik: string;
  metin: string;
  /** tıklanınca watchlist'i bu bayrakla açar */
  flag?: FlagKey;
  /** tıklanınca konsolda bu parçaya gider */
  pn?: number;
  /** eylem etiketi */
  eylem?: string;
}

export const TIP_AD: Record<IcgoruTip, string> = {
  alarm: 'ALARM',
  risk: 'RİSK',
  firsat: 'FIRSAT',
  plan: 'PLAN',
};

/** Kırmızı yoğunluğu en yüksek kategori — kategori dizisinden canlı bulunur. */
function enKirmiziKategori(): { ad: string; n: number } {
  let en = 0;
  let j = 0;
  D.kat.kirmizi.forEach((v, k) => {
    if (v > en) {
      en = v;
      j = k;
    }
  });
  return { ad: D.kat.ad[j], n: en };
}

/** Büyüme yüzdesi en yüksek kategori — 2033'te ayrışan talep (kat.buyume = %). */
function enHizliKategori(): { ad: string; b: number } {
  let en = 0;
  let j = 0;
  D.kat.buyume.forEach((v, k) => {
    if (v > en) {
      en = v;
      j = k;
    }
  });
  return { ad: D.kat.ad[j], b: D.kat.buyume[j] };
}

let onbellek: Icgoru[] | null = null;

export function icgoruler(): Icgoru[] {
  if (onbellek) return onbellek;
  const d = kararMotoru();
  const kk = enKirmiziKategori();
  const hk = enHizliKategori();
  const ilk = d.alarm[0];
  const ucluPay = K.risk_listesi > 0 ? (100 * K.uclu) / K.risk_listesi : 0;

  const L: Icgoru[] = [
    {
      id: 'pencere',
      tip: 'alarm',
      kaynak: 'kural motoru · TTS−lead',
      guven: 99,
      baslik: `${fmt(d.alarm.length)} parçada sipariş penceresi kapandı`,
      metin:
        `Bu parçaların dayanma süresi tedarik süresinden kısa ve açık siparişleri yok. ` +
        `En geciken parça ${fmt(d.enGec)} gün geride: ${
          ilk != null ? 'PN-' + PN.id[ilk] + ' · ' + LK.sub[PN.sub[ilk]] : '—'
        }. Kuyruğu bugün kapatmazsak açık, tedarik süresi kadar uzar.`,
      pn: ilk,
      eylem: 'karar kuyruğunu aç',
    },
    {
      id: 'siparissiz',
      tip: 'alarm',
      kaynak: 'envanter kesiti + PO defteri',
      guven: 98,
      baslik: `${fmt(K.siparissiz)} parça tükeniyor, siparişi yok`,
      metin:
        `${fmt(K.kirmizi)} parçada stok yenisi gelmeden bitiyor; ${fmt(K.siparissiz)} tanesinde ` +
        `açık sipariş bile yok, ${fmt(K.siparissiz_aog)} tanesi AOG kritik. Bu, bugünkü sürecin ` +
        `kör noktasının tek sayılık kanıtı — adet sorunu değil, görünürlük sorunu.`,
      flag: 'SIP',
      eylem: 'listeyi süz',
    },
    {
      id: 'r547',
      tip: 'risk',
      kaynak: 'kabiliyet × operasyonel önem kesişimi',
      guven: 96,
      baslik: `${fmt(K.risk_listesi)} AOG kritik parçada iç tamir kabiliyeti yok`,
      metin:
        `Bu küme dış istasyona bağımlı; ortalama dış tamir süresi ${fmt(K.tat_dis)} gün. ` +
        `${fmt(K.uclu)} tanesi (${pct(ucluPay, 0)}) aynı zamanda yeni nesil modelde — kritik, ` +
        `kabiliyetsiz ve geçmişsiz. İzleme önceliği en yüksek üçlü tehlike bu.`,
      flag: 'R547',
      eylem: 'listeyi süz',
    },
    {
      id: 'kabiliyet',
      tip: 'firsat',
      kaynak: 'tamir ekonomisi modeli',
      guven: 88,
      baslik: `İç kabiliyet yatırımı yılda ${mM(K.kab_tasarruf)} açığa çıkarıyor`,
      metin:
        `${fmt(K.risk_listesi)} parçanın bugünkü dış tamir harcaması ${mM(K.kab_bugun)}/yıl. ` +
        `Hedef iç TAT ${fmt(D.params.kabiliyet_hedef_tat)} güne çekilirse ${mM(
          K.kab_tasarruf,
        )}/yıl tasarruf ve ${mM(K.kab_sermaye)} bir defalık sermaye serbestisi doğuyor. ` +
        `Bu bir yazılım ekranı değil, yatırım kararı.`,
      eylem: 'ROI kapanışına git',
    },
    {
      id: 'ber',
      tip: 'firsat',
      kaynak: `BER kuralı · eşik ${vir(D.params.ber_esigi)}`,
      guven: 92,
      baslik: `${fmt(K.ber_pn)} parçada tamir ekonomik değil`,
      metin:
        `Dış tamir maliyeti liste fiyatının %${Math.round(100 * D.params.ber_esigi)}'ini aşıyor; ` +
        `bu parçalarda yıllık ${fmt(K.ber_talep)} adet talep dönüyor. Karar kanaate değil kurala ` +
        `bağlanmalı: tamir yerine değişim, exchange ya da bilinçli hurda.`,
      flag: 'BER',
      eylem: 'listeyi süz',
    },
    {
      id: 'scrap',
      tip: 'plan',
      kaynak: 'hurda serisi × liste fiyatı',
      guven: 90,
      baslik: `Hurda ikame bütçesi ${mM(K.scrap_butce)}/yıl`,
      metin:
        `Yıllık ${fmt(K.scrap25)} adet hurda, talebin ${pct(K.scrap_oran, 1)}'i. ` +
        `2033'te aynı oranla bütçe ${mM(K.scrap_butce33)}'a çıkar. ` +
        `${fmt(K.scrap_anomali)} parçada hurda oranı %20'yi aşıyor — kalite ya da tamir kararı ` +
        `sorunu adayı, ayrı seri olarak izlenmeli.`,
      flag: 'SCRAPA',
      eylem: 'anomalileri aç',
    },
    {
      id: 'float',
      tip: 'plan',
      kaynak: 'float formülü · %97 saha doğrulaması',
      guven: 97,
      baslik: `Tamir döngüsündeki sermaye ${mM(K.float_fmv)} → ${mM(K.float_fmv_33)}`,
      metin:
        `Model, tamir döngüsündeki adedi yalnız talep ve TAT'tan ${fmt(K.float_adet)} olarak ` +
        `tahmin etti; gerçek envanterde ${fmt(K.tamirde_adet)} adet var. Filo büyürken bu bağlı ` +
        `sermaye kendiliğinden ${mM(K.float_fmv_33 - K.float_fmv)} artıyor — TAT'ın her ` +
        `günü paradır.`,
      eylem: 'senaryoda dene',
    },
    {
      id: 'phaseout',
      tip: 'plan',
      kaynak: 'filo projeksiyonu × envanter değeri',
      guven: 85,
      baslik: `Küçülen 4 klasik modelde ${mM(K.phaseout)} stok bağlı`,
      metin:
        `Envanter değerinin ${pct(K.phaseout_pct, 1)}'i emekliye ayrılacak modellere bağlı. ` +
        `Eritme takvimle değil tetikle yürütülmeli: kalan talep eşiğin altına inince sat, ` +
        `OEM üretim sonu duyurusunda son alım penceresini aç.`,
      flag: 'PO',
      eylem: 'phase-out listesi',
    },
    {
      id: 'kategori',
      tip: 'risk',
      kaynak: 'kategori kırılımı',
      guven: 87,
      baslik: `${kk.ad} kategorisi ${fmt(kk.n)} kırmızı parçayla başı çekiyor`,
      metin:
        `Kırmızı yoğunluğu kategoriye göre ayrışıyor; en hızlı büyüyen kategori ise ${hk.ad} ` +
        `(+${pct(hk.b, 0)} · 2033). Tek çarpanlı plan bu ayrışmayı gizler — ` +
        `kategori × model × segment granülaritesi şart.`,
      eylem: 'öngörüde incele',
    },
    {
      id: 'mevsim',
      tip: 'plan',
      kaynak: 'çeyreklik talep serisi',
      guven: 82,
      baslik: `Q3 talebi diğer çeyreklerin ${pct(K.q3_pct, 1)} üstünde`,
      metin:
        `Mevsimsellik operasyonel önem sınıflarında homojen, yani yaz zirvesi bütün portföyü birlikte ` +
        `vuruyor. Sipariş ritmi Q2'ye çekilmezse zirve, tedarik süresi uzun parçalarda ` +
        `kırmızıya dönüşür.`,
      eylem: 'mevsim grafiği',
    },
    {
      id: 'pool',
      tip: 'risk',
      kaynak: 'havuz talep payı',
      guven: 80,
      baslik: `${fmt(K.pool_bagimli)} parçada talebin yarısından fazlası havuzdan`,
      metin:
        `Havuz uçakları filonun çoğunluğu ama talebin yalnız ${pct(K.pool_pay, 1)}'ini üretiyor. ` +
        `Bu ayrışma sözleşme kapsamı ya da veri kurgusundan gelebilir — sistem parametrik ` +
        `bırakıldı, oran mentorla doğrulanmalı.`,
      flag: 'POOLB',
      eylem: 'listeyi süz',
    },
  ];

  // Fazla stok fırsatı ancak varsa gösterilir (senaryo parametreleri değişince kayabilir)
  if (d.fazla.n > 0)
    L.push({
      id: 'fazla',
      tip: 'firsat',
      kaynak: 'MAX üstü stok taraması',
      guven: 86,
      baslik: `${fmt(d.fazla.n)} parçada MAX üstü stok — ${mM(d.fazla.deger / 1e6)} yeniden dağıtılabilir`,
      metin:
        `Toplam ${fmt(d.fazla.adet)} fazla adet, ihtiyaç olan istasyona aktarılırsa satın alma ` +
        `yerine transfer devreye girer. Kaynak/hedef eşlemesi temsilîdir; üründe istasyon ` +
        `etiketli stok kaydından gelir.`,
      eylem: 'transfer önerileri',
    });

  onbellek = L;
  return L;
}

