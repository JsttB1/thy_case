import type {
  FazlaPn,
  GeriSayimDurum,
  GeriSayimPn,
  Kritiklik,
  PnData,
  Station,
} from '../data/types';
import { kalanGunDurum } from './countdown';
import { tumSatirlar, type PnRow } from './pnRows';

/**
 * AI Karar Motoru — tamamen tarayıcı içinde çalışan deterministik kural motoru.
 * Harici API / model çağrısı YOK; "AI" katmanı, mevcut analitik sinyalleri
 * (min-max durumu, sipariş geri sayımı, tedarik kanalı, kritiklik, lead time)
 * tek bir aksiyon önerisine indirgeyen içsel bir karar ağacıdır. Sentetik case
 * verisiyle çalışır, internetsiz demo'da ( dist/ ) da aynen koşar.
 *
 * Her karar açıklanabilir: aksiyon + gerekçe + finansal etki + güven skoru üretir,
 * black box değil (jüri "neye göre karar verdi" derse gerekçe ekranda).
 */

export type AiAksiyon = 'EXCHANGE' | 'SIPARIS' | 'TAMIR' | 'TRANSFER' | 'IZLE';
export type Vade = 'kisa' | 'orta' | 'uzun';

export type AksiyonTon = 'crit' | 'warn' | 'ok' | 'neutral' | 'ink';

export interface AksiyonMeta {
  etiket: string;
  /** THY marka serisi rengi (spec 1.1) — açık zeminde metin ve dolgu için */
  renk: string;
  /** Badge tonu — marka rozet stilini birebir kullanır */
  ton: AksiyonTon;
  aciklama: string;
}

/**
 * Marka serisi sırası (spec 1.1): kırmızı → ink → amber → yeşil → gri.
 * Kural "bir grafikte tek kırmızı seri" — kırmızı = dikkat = EXCHANGE (en acil aksiyon).
 */
export const AKSIYON_SIRA: AiAksiyon[] = ['EXCHANGE', 'SIPARIS', 'TAMIR', 'TRANSFER', 'IZLE'];

export const AKSIYON_META: Record<AiAksiyon, AksiyonMeta> = {
  EXCHANGE: {
    etiket: 'EXCHANGE',
    renk: '#E81932', // tk-red
    ton: 'crit',
    aciklama: 'Havuz / exchange ile köprüle — sipariş tarihi geçmiş kritik kalem için en hızlı yol',
  },
  SIPARIS: {
    etiket: 'SİPARİŞ',
    renk: '#1A1D21', // tk-ink
    ton: 'ink',
    aciklama: 'Yeni satınalma — iç/dış tamir kabiliyeti yok, tek yol tedarik',
  },
  TAMIR: {
    etiket: 'TAMİR',
    renk: '#C77700', // sig-warn
    ton: 'warn',
    aciklama: 'İç/dış atölyeye tamire gönder — rotable döngüsü, yeni alımdan ucuz',
  },
  TRANSFER: {
    etiket: 'TRANSFER',
    renk: '#0E8A5F', // sig-ok
    ton: 'ok',
    aciklama: 'Fazla üniteyi açık olan istasyona aktar — sermaye serbest kalır, satınalma gerekmez',
  },
  IZLE: {
    etiket: 'İZLE',
    renk: '#5A6472', // tk-slate
    ton: 'neutral',
    aciklama: 'Stok min-max bandında — bugün aksiyon gerekmez, izlemede kalır',
  },
};

export interface KararGirdi {
  krit: Kritiklik;
  kanal: string; // TEMIN_KANALI: 'Yurtiçi tamir' | 'Yurtdışı tamir' | 'Satınalma'
  atolye: boolean;
  lead: number;
  kalan: number; // sipariş geri sayımı — negatifse tarih geçmiş
  acik: number; // açık adet (stok < min)
  fazla: number; // fazla adet (stok > max)
  clp: number; // birim yeni alım maliyeti (USD)
  fmv: number; // birim adil piyasa değeri (USD)
  risk: number; // 0–100 AOG risk skoru
}

export interface Karar {
  aksiyon: AiAksiyon;
  aciliyet: GeriSayimDurum;
  vade: Vade;
  /** tek satır, insan-okur gerekçe */
  gerekce: string;
  /** finansal etki (USD): açık kapatma maliyeti ya da serbest kalan sermaye */
  etki: number;
  /** 0–100 mockup güven skoru — sinyal gücünden türetilir */
  guven: number;
  /** 0–100 AI öncelik skoru — sıralama için */
  oncelik: number;
}

const clip = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const yuvarla = (v: number) => Math.round(v);

function aciliyetPuan(d: GeriSayimDurum): number {
  return d === 'GECIKMIS' ? 100 : d === 'ACIL' ? 72 : d === 'YAKLASIYOR' ? 45 : 12;
}

/** Çekirdek karar ağacı — hem 5.000 PN taramasında hem tekil satırda aynı kural. */
export function kararVer(g: KararGirdi): Karar {
  const aciliyet = kalanGunDurum(g.kalan);
  const kalanYuvar = yuvarla(g.kalan);

  let aksiyon: AiAksiyon;
  let gerekce: string;
  let etki: number;
  let vade: Vade;

  if (g.fazla > 0) {
    // Fazla stok → başka istasyona aktar (transfer), sermaye serbest kalır.
    aksiyon = 'TRANSFER';
    etki = g.fazla * g.fmv;
    vade = 'uzun';
    gerekce = `${g.fazla} adet max üstünde — açık istasyona transfer edilirse satınalma gerekmez`;
  } else if (g.acik > 0) {
    // Stok min altında → yenile. Kanal ve aciliyet aksiyonu seçer.
    const kopruGerek =
      g.kalan < 0 && (g.krit === 'AOG KRİTİK' || g.krit === 'KRİTİK');
    if (kopruGerek) {
      aksiyon = 'EXCHANGE';
      gerekce = `sipariş tarihi ${Math.abs(kalanYuvar)}g geçti · lead ${g.lead}g tükenmeyi aşıyor → ${g.krit} için havuz/exchange ile köprüle`;
    } else if (g.kanal === 'Satınalma') {
      aksiyon = 'SIPARIS';
      gerekce = `iç/dış tamir kabiliyeti yok · ${g.acik} adet yeni satınalma, lead ${g.lead}g`;
    } else {
      aksiyon = 'TAMIR';
      gerekce = g.atolye
        ? `iç atölye kabiliyeti var · ${g.acik} adet tamire al, lead ${g.lead}g`
        : `yurtdışı tamir · ${g.acik} adet, lead ${g.lead}g (uzun — iç atölye adayı)`;
    }
    etki = g.acik * g.clp;
    vade = aciliyet === 'GECIKMIS' || aciliyet === 'ACIL' ? 'kisa' : aciliyet === 'YAKLASIYOR' ? 'orta' : 'uzun';
  } else if (aciliyet === 'YAKLASIYOR') {
    // Bandın içinde ama min'e yaklaşıyor → şimdiden sipariş planla.
    aksiyon = g.kanal === 'Satınalma' ? 'SIPARIS' : 'TAMIR';
    gerekce = `stok bandın içinde ama ${kalanYuvar}g içinde min'e iner — şimdiden sipariş planla`;
    etki = 0;
    vade = 'orta';
  } else {
    aksiyon = 'IZLE';
    gerekce = 'stok min-max bandında, sipariş ufku 90 günden uzak — izlemede kalır';
    etki = 0;
    vade = 'uzun';
  }

  const guven = clip(
    yuvarla(60 + g.risk * 0.3 + (g.kalan < 0 ? 12 : 0) + (aksiyon !== 'IZLE' ? 6 : 0)),
    55,
    99,
  );

  const etkiNorm = clip((etki / 250_000) * 100, 0, 100);
  const oncelik = clip(
    yuvarla(0.45 * g.risk + 0.4 * aciliyetPuan(aciliyet) + 0.15 * etkiNorm),
    0,
    100,
  );

  return { aksiyon, aciliyet, vade, gerekce, etki, guven, oncelik };
}

/* ─────────────────────────────────────────────────────────────
   Zengin öneri satırı — kuyruk / alarm görünümleri için
   ───────────────────────────────────────────────────────────── */

export interface Oneri extends Karar {
  pn: string;
  model: string;
  sub: string;
  krit: Kritiklik;
  kanal: string;
  lead: number;
  kalan: number;
  acik: number;
  risk: number;
}

export function oneriFromRow(r: PnRow): Oneri {
  const karar = kararVer({
    krit: r.krit,
    kanal: r.kanal,
    atolye: r.atolye,
    lead: r.lead,
    kalan: r.kalan,
    acik: r.acik,
    fazla: r.fazla,
    clp: r.clp,
    fmv: r.fmv,
    risk: r.risk,
  });
  return {
    ...karar,
    pn: r.pn,
    model: r.model,
    sub: r.sub,
    krit: r.krit,
    kanal: r.kanal,
    lead: r.lead,
    kalan: r.kalan,
    acik: r.acik,
    risk: r.risk,
  };
}

/** inventory.json'daki geriSayim (150 en acil PN) — hazır sıralı, ekranda gösterilecek gerçek değerler. */
export function oneriFromGeriSayim(g: GeriSayimPn): Oneri {
  const acik = Math.max(0, (g.MIN_2033 ?? 0) - (g.ELDE_SERVIS ?? 0));
  const karar = kararVer({
    krit: g.KRITIK,
    kanal: g.TEMIN_KANALI,
    atolye: g.ATOLYE === 'VAR',
    lead: g.LEAD_GUN,
    kalan: g.KALAN_GUN,
    acik: acik > 0 ? acik : g.ACIK_2033,
    fazla: 0,
    clp: g.CLP_USD,
    fmv: g.CLP_USD, // geriSayim satırında FMV yok; etki için CLP yeterli yaklaşım
    risk: g.RISK,
  });
  return {
    ...karar,
    pn: g.PN,
    model: g.MODEL,
    sub: g.SUB,
    krit: g.KRITIK,
    kanal: g.TEMIN_KANALI,
    lead: g.LEAD_GUN,
    kalan: g.KALAN_GUN,
    acik: g.ACIK_2033,
    risk: g.RISK,
  };
}

/* ─────────────────────────────────────────────────────────────
   5.000 PN karar dağılımı — "AI hepsini nasıl yönlendirdi"
   ───────────────────────────────────────────────────────────── */

export interface DagilimSatir {
  aksiyon: AiAksiyon;
  sayi: number; // PN sayısı
  adet: number; // toplam açık/fazla adet
  etki: number; // toplam finansal etki (USD)
}

export interface Dagilim {
  satirlar: DagilimSatir[];
  toplamPn: number;
  toplamEtki: number;
}

export function kararDagilimi(d: PnData): Dagilim {
  const rows = tumSatirlar(d);
  const acc: Record<AiAksiyon, DagilimSatir> = {
    EXCHANGE: { aksiyon: 'EXCHANGE', sayi: 0, adet: 0, etki: 0 },
    SIPARIS: { aksiyon: 'SIPARIS', sayi: 0, adet: 0, etki: 0 },
    TAMIR: { aksiyon: 'TAMIR', sayi: 0, adet: 0, etki: 0 },
    TRANSFER: { aksiyon: 'TRANSFER', sayi: 0, adet: 0, etki: 0 },
    IZLE: { aksiyon: 'IZLE', sayi: 0, adet: 0, etki: 0 },
  };

  let toplamEtki = 0;
  for (const r of rows) {
    const k = kararVer({
      krit: r.krit,
      kanal: r.kanal,
      atolye: r.atolye,
      lead: r.lead,
      kalan: r.kalan,
      acik: r.acik,
      fazla: r.fazla,
      clp: r.clp,
      fmv: r.fmv,
      risk: r.risk,
    });
    const s = acc[k.aksiyon];
    s.sayi += 1;
    s.adet += r.acik + r.fazla;
    s.etki += k.etki;
    toplamEtki += k.etki;
  }

  return {
    satirlar: AKSIYON_SIRA.map((a) => acc[a]),
    toplamPn: rows.length,
    toplamEtki,
  };
}

/* ─────────────────────────────────────────────────────────────
   Hub transfer önerileri (temsili)
   Fazla stok → depo hub'larından kapsama açığı olan istasyonlara.
   Per-hub PN stoğu sentetik sette yok; kaynak/hedef eşlemesi PN'e göre
   deterministik üretilir (aynı PN hep aynı öneriyi verir). Karar mantığı
   gerçek: fazla ünite, depo tipi zayıf (hat_stok/yok) istasyonun AOG
   riskini kapatır — merkezî fazlayı sahaya it.
   ───────────────────────────────────────────────────────────── */

export interface HubTransfer {
  pn: string;
  sub: string;
  krit: Kritiklik;
  adet: number;
  kaynak: Station;
  hedef: Station;
  /** serbest kalan / yeniden kullanılabilen sermaye (USD) */
  tasarruf: number;
}

/** Basit deterministik hash — PN kodundan sabit indeks üretir. */
function pnHash(pn: string): number {
  let h = 0;
  for (let i = 0; i < pn.length; i++) h = (h * 31 + pn.charCodeAt(i)) >>> 0;
  return h;
}

export function hubTransferOnerileri(
  fazla: FazlaPn[],
  stations: Station[],
  adet = 10,
): HubTransfer[] {
  const kaynaklar = stations.filter(
    (s) => s.depoTipi === 'ana_depo' || s.depoTipi === 'ileri_depo',
  );
  const hedefler = stations.filter(
    (s) => s.depoTipi === 'hat_stok' || s.depoTipi === 'yok',
  );
  if (!kaynaklar.length || !hedefler.length) return [];

  return fazla
    .filter((f) => f.FAZLA_2033 > 0)
    .slice(0, adet)
    .map((f) => {
      const h = pnHash(f.PN);
      const kaynak = kaynaklar[h % kaynaklar.length];
      // kaynaktan farklı bir hedef seç — işaretsiz kaydırma (h 2³¹'i aşabilir)
      let hedef = hedefler[(h >>> 3) % hedefler.length];
      if (hedef.kod === kaynak.kod && hedefler.length > 1) {
        hedef = hedefler[((h >>> 3) + 1) % hedefler.length];
      }
      const tasi = Math.max(1, Math.round(f.FAZLA_2033));
      return {
        pn: f.PN,
        sub: f.SUB,
        krit: f.KRITIK,
        adet: tasi,
        kaynak,
        hedef,
        tasarruf: tasi * f.FMV_USD,
      };
    });
}

/* ─────────────────────────────────────────────────────────────
   Planlama ufku — sipariş geri sayımına göre kısa/uzun vade kovaları
   ───────────────────────────────────────────────────────────── */

export type UfukId = 'bugun' | 'ay' | 'ceyrek' | 'uzun';

export interface UfukSatir {
  id: UfukId;
  sayi: number; // kovadaki PN sayısı
  etki: number; // toplam finansal etki (USD)
}

export function planlamaUfku(d: PnData): UfukSatir[] {
  const rows = tumSatirlar(d);
  const acc: Record<UfukId, UfukSatir> = {
    bugun: { id: 'bugun', sayi: 0, etki: 0 },
    ay: { id: 'ay', sayi: 0, etki: 0 },
    ceyrek: { id: 'ceyrek', sayi: 0, etki: 0 },
    uzun: { id: 'uzun', sayi: 0, etki: 0 },
  };
  for (const r of rows) {
    const k = kararVer({
      krit: r.krit,
      kanal: r.kanal,
      atolye: r.atolye,
      lead: r.lead,
      kalan: r.kalan,
      acik: r.acik,
      fazla: r.fazla,
      clp: r.clp,
      fmv: r.fmv,
      risk: r.risk,
    });
    const id: UfukId =
      k.aciliyet === 'GECIKMIS'
        ? 'bugun'
        : k.aciliyet === 'ACIL'
          ? 'ay'
          : k.aciliyet === 'YAKLASIYOR'
            ? 'ceyrek'
            : 'uzun';
    acc[id].sayi += 1;
    acc[id].etki += k.etki;
  }
  return ['bugun', 'ay', 'ceyrek', 'uzun'].map((id) => acc[id as UfukId]);
}
