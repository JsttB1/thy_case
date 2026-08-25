/**
 * KRİZ ALARMLARI — senaryo sayfasının uyarı rayı.
 *
 * DÜRÜSTLÜK KURALI (CODE'daki `icgoru.ts` ile birebir aynı): dil katmanı —
 * cümle kalıpları, eşikler, öncelik sırası, güven yüzdeleri — bu dosyada
 * SABİTTİR; içindeki sayıların HEPSİ senaryo motorundan canlı gelir. Ekranda bu
 * ayrım yazıyla belirtilir; ray "LLM üretti" gibi sunulmaz.
 *
 * ALARM BİR EŞİK AŞIMIDIR: koşulu sağlanmayan alarm listeye hiç girmez. Baz
 * durumda ray neredeyse boştur — sakin ekran, sakin sistem demektir.
 */
import { LK } from '@/data/payload';
import { fmt, f1, mM, pct } from '@/engine/format';
import type { FlagKey } from '@/engine/flags';
import type { SenaryoCfg, SenaryoSonuc, ParamCfg } from '@/engine/senaryo';
import type { Takvim } from '@/engine/kriz';

export type AlarmTip = 'al' | 'uy' | 'bl' | 'iy';

export const TIP_AD: Record<AlarmTip, string> = {
  al: 'ALARM',
  uy: 'UYARI',
  bl: 'BİLGİ',
  iy: 'SAKİN',
};

/** Kart sırası: önce alarm, sonra uyarı, sonra bilgi, en sonda sakin. */
const TIP_SIRA: Record<AlarmTip, number> = { al: 0, uy: 1, bl: 2, iy: 3 };

export interface Alarm {
  id: string;
  tip: AlarmTip;
  /** izlenebilirlik kodu — sunumda "hangi kural konuştu" sorusunun cevabı */
  kod: string;
  /** dil katmanının kendi beyanı */
  guven: number;
  baslik: string;
  metin: string;
  eylem?: string;
  /** watchlist'i bu bayrakla süzülü açar */
  flag?: FlagKey;
  /** sayfa içinde ilgili bölüme kaydırır */
  hedef?: 'takvim' | 'arazi' | 'dagilim' | 'belirsizlik' | 'roi';
}

/** byKat maksimumu — zirvede yükün toplandığı ATA kategorisi. */
function enYuklu(byKat: number[]): { ad: string; n: number } {
  let en = 0;
  let j = 0;
  byKat.forEach((v, k) => {
    if (v > en) {
      en = v;
      j = k;
    }
  });
  return { ad: LK.sub[j] ?? '—', n: en };
}

export function alarmlar(
  cfg: SenaryoCfg,
  r: SenaryoSonuc,
  baz: SenaryoSonuc,
  tk: Takvim,
  params: ParamCfg,
): Alarm[] {
  const L: Alarm[] = [];
  const sokVar =
    cfg.d !== 0 ||
    cfg.l !== 0 ||
    cfg.s !== 0 ||
    cfg.icKap !== 0 ||
    cfg.gumruk !== 0 ||
    cfg.havuz !== 0 ||
    cfg.kur !== 0 ||
    cfg.filoUc !== 0 ||
    !!cfg.yeniDem ||
    !!cfg.kuculDem;

  const ayN = tk.aylar.length;
  const duvar = tk.duvarAy;

  /* --- A01 · duvara çarpma ayı ------------------------------------------- */
  if (tk.zirveKir > tk.bazKir * 1.15)
    L.push({
      id: 'duvar',
      tip: 'al',
      kod: 'SEN-A01',
      guven: 97,
      baslik: `Duvara ${duvar}. ayda çarpıyoruz: kırmızı ${fmt(tk.bazKir)} → ${fmt(tk.zirveKir)}`,
      metin:
        `Şok tırmanırken kırmızı parça sayısı ${duvar}. ayda zirveye çıkıyor ` +
        `(baz seviyenin ${f1(tk.zirveKir / Math.max(1, tk.bazKir))} katı). Sipariş açma penceresi ` +
        `bu tarihten ÖNCE kapanır: tedarik süresi kadar geriye sayılırsa karar bugün veriliyor demektir.`,
      eylem: 'takvimi incele',
      hedef: 'takvim',
    });

  /* --- A02 · toparlanmama ------------------------------------------------- */
  if (tk.zirveKir > tk.bazKir * 1.15 && tk.toparlanmaAy === -1)
    L.push({
      id: 'toparlanmaz',
      tip: 'al',
      kod: 'SEN-A02',
      guven: 93,
      baslik: `${ayN - 1} ayın sonunda kırmızı baz seviyeye DÖNMÜYOR`,
      metin:
        `Şiddet eğrisi sıfıra indiği hâlde kırmızı sayısı baz seviyenin %5 bandına geri gelmiyor. ` +
        `Bu, tamponun kriz İÇİNDE tükendiği anlamına gelir: şok geçse de stok pozisyonu eski yerine ` +
        `kendiliğinden dönmez, yeniden doldurma ayrı bir karar olarak planlanmalı.`,
      eylem: 'takvimi incele',
      hedef: 'takvim',
    });

  /* --- A03 · AOG kritik artışı -------------------------------------------- */
  if (r.kirAog > baz.kirAog)
    L.push({
      id: 'aog',
      tip: 'al',
      kod: 'SEN-A03',
      guven: 96,
      baslik: `AOG kritik kırmızı ${fmt(baz.kirAog)} → ${fmt(r.kirAog)}`,
      metin:
        `Bu senaryoda ${fmt(r.kirAog - baz.kirAog)} parça daha AOG kritik sınıfında kırmızıya düşüyor. ` +
        `Her biri "yerde uçak" demek; operasyonel önem sınıfı ağırlıkları (${f1(params.w0)} / ${f1(
          params.w1,
        )} / ${f1(params.w2)}) bu yüzden tahsis sırasını da doğrudan değiştiriyor.`,
      eylem: 'operasyonel öneme göre dağılım',
      hedef: 'dagilim',
    });

  /* --- A04 · havuz: adet değil para ---------------------------------------- */
  if (cfg.havuz > 0 && r.poolEk > 0)
    L.push({
      id: 'havuz',
      tip: 'uy',
      kod: 'SEN-A04',
      guven: 90,
      baslik: `Havuz erişiminin %${Math.round(cfg.havuz)}'i kapanınca fatura ${mM(r.poolEk / 1e6)} büyüyor`,
      metin:
        `Kırmızı sayısı DEĞİŞMİYOR — TTS de TTR de kımıldamadı. Değişen para: havuz kanalı olan ` +
        `${fmt(r.poolKayipPn)} açık parçada değişim ücreti yerine liste fiyatı ödeniyor. Havuz ` +
        `karşılıklı sigortadır; faturası ancak çekilince görünür.`,
      eylem: 'havuz bağımlılarını süz',
      flag: 'POOLB',
    });

  /* --- A05 · kur şoku / nakit koruma --------------------------------------- */
  if (cfg.kur > 0)
    L.push({
      id: 'kur',
      tip: 'uy',
      kod: 'SEN-A05',
      guven: 88,
      baslik: `Kur %${Math.round(cfg.kur)} şokunda BER eşiği ${f1(100 * params.ber)} → ${f1(
        100 * r.berEtkin,
      )} puana kayıyor`,
      metin: `Adetler kımıldamaz, $ kalemleri ölçeklenir: kapatma ${mM(baz.kap / 1e6)} → ${mM(
        r.kap / 1e6,
      )}. Nakit koruma modunda eşik yukarı kaydığı için BER adayı ${fmt(baz.berPn)} → ${fmt(
        r.berPn,
      )} oluyor; aradaki ${fmt(Math.abs(baz.berPn - r.berPn))} parça hurdadan tamire dönüyor.`,
      eylem: 'BER adaylarını süz',
      flag: 'BER',
    });

  /* --- A06 · gümrük: toplamsal ≠ oransal ----------------------------------- */
  if (cfg.gumruk > 0)
    L.push({
      id: 'gumruk',
      tip: 'uy',
      kod: 'SEN-A06',
      guven: 91,
      baslik: `Gümrük kuyruğu ortalama TTR'yi ${f1(baz.ortTtr)} → ${f1(r.ortTtr)} güne taşıyor`,
      metin:
        `+${Math.round(cfg.gumruk)} gün TOPLAMSAL uygulanır ve yalnız dış kanala biner. Oransal bir ` +
        `şoktan farkı burada: kısa TAT'lı parçayı yüzdece çok daha sert vurur, iç tamirli parçada ise ` +
        `gün sayısı hiç değişmez. Tek bir "kriz şiddeti" sayısı bu farkı anlatmaz.`,
      eylem: 'arazide kategorilere bak',
      hedef: 'arazi',
    });

  /* --- A07 · iç kapasite: kabiliyetin değeri -------------------------------- */
  if (cfg.icKap > 0)
    L.push({
      id: 'atolye',
      tip: r.kir > baz.kir ? 'uy' : 'bl',
      kod: 'SEN-A07',
      guven: 89,
      baslik: `Atölye kapasitesinin %${Math.round(cfg.icKap)}'i kaybolunca kırmızı ${fmt(
        baz.kir,
      )} → ${fmt(r.kir)}`,
      metin:
        r.kir > baz.kir
          ? `Şok yalnız iç tamir kabiliyeti OLAN parçaları vuruyor; dış tamire bağımlı liste (kritik + kabiliyetsiz) ` +
            `bu şoktan hiç etkilenmiyor. Aradaki ${fmt(r.kir - baz.kir)} parça, kabiliyetin bugüne kadar ` +
            `sessizce sağladığı tampondur.`
          : `Kırmızı sayısı sabit kaldı: bu şokta kabiliyetin değeri tam olarak tuttuğu tampon kadar. ` +
            `Kaybın görünür olması için ya talep ya da dış kanal aynı anda bozulmalı.`,
      eylem: 'dış tamire bağımlı listeyi aç',
      flag: 'R547',
    });

  /* --- A08 · yükün toplandığı kategori -------------------------------------- */
  if (sokVar && tk.zirveKir > tk.bazKir) {
    const zirve = tk.aylar[duvar].r;
    const k = enYuklu(zirve.byKat);
    if (k.n > 0)
      L.push({
        id: 'kategori',
        tip: 'bl',
        kod: 'SEN-A08',
        guven: 86,
        baslik: `Zirvede yük ${k.ad} kategorisinde toplanıyor (${fmt(k.n)} kırmızı)`,
        metin:
          `${duvar}. ayda kırmızının ${pct((100 * k.n) / Math.max(1, zirve.kir), 0)}'i tek bir ATA alt ` +
          `kategorisinde. Kriz portföye eşit dağılmıyor — arazinin ön sırası zaten bu kategoriyi ` +
          `gösteriyor ve tedarikçi görüşmesi de oradan başlamalı.`,
        eylem: 'arazide gör',
        hedef: 'arazi',
      });
  }

  /* --- A09 · 2033 açığı ------------------------------------------------------ */
  if (r.acik > baz.acik)
    L.push({
      id: 'acik',
      tip: 'uy',
      kod: 'SEN-A09',
      guven: 92,
      baslik: `2033 MIN altında kalan PN ${fmt(baz.acik)} → ${fmt(r.acik)} · fatura ${mM(r.ek / 1e6)}`,
      metin:
        `Şok altında emniyet stoğu hedefi yükseliyor ve ${fmt(r.acik - baz.acik)} parça daha MIN ` +
        `seviyesinin altına düşüyor. Bu bir NOKTA TAHMİN değil: aynı sayı belirsizlik panelinde ` +
        `aralığıyla birlikte duruyor, bütçe tamponu oradan kurulur.`,
      eylem: 'belirsizliğe git',
      hedef: 'belirsizlik',
    });

  /* --- A10 · kriz yükü: parça·ay --------------------------------------------- */
  if (tk.kirmiziAy > tk.bazKir * ayN * 1.2)
    L.push({
      id: 'yuk',
      tip: 'bl',
      kod: 'SEN-A10',
      guven: 84,
      baslik: `Krizin toplam yükü ${fmt(tk.kirmiziAy)} parça·ay`,
      metin:
        `Zirve tek başına yetmez: alçak ama uzun süren bir kriz, kısa ve sert olandan daha çok ` +
        `parça·ay yakabilir. Baz seviyenin üstünde ${fmt(tk.kirmiziAy - tk.bazKir * ayN)} parça·ay ` +
        `birikiyor. (Kümülatif $ bilinçli olarak raporlanmaz — kapatma maliyeti bir stok büyüklüğüdür, ` +
        `aylar boyunca toplanırsa aynı eksik defalarca sayılır.)`,
      eylem: 'profilleri karşılaştır',
      hedef: 'takvim',
    });

  /* --- A11 · en kötü emniyet marjı -------------------------------------------- */
  if (r.enKotuMarj < 0)
    L.push({
      id: 'marj',
      tip: 'bl',
      kod: 'SEN-A11',
      guven: 83,
      baslik: `En kötü emniyet marjı ${f1(r.enKotuMarj)} gün`,
      metin:
        `Marj = dayanma süresi − tedarik süresi − alarm tamponu (${fmt(params.tampon)} gün). ` +
        `Negatif tarafı tam olarak "kırmızı liste" demektir; dağılımın ilk dört kovası bu bölgedir. ` +
        `Dayanma süresi dağılımı ise tanım gereği tedarik şokunu görmez, bu yüzden varsayılan görünüm marjdır.`,
      eylem: 'dağılıma git',
      hedef: 'dagilim',
    });

  /* --- A00 · sakin ekran ------------------------------------------------------ */
  if (!sokVar)
    L.push({
      id: 'sakin',
      tip: 'iy',
      kod: 'SEN-A00',
      guven: 99,
      baslik: `Şok yok: ekranda bugünün fotoğrafı var`,
      metin:
        `${fmt(baz.kir)} kırmızı parça, ${fmt(baz.kirAog)} tanesi AOG kritik; kapatma ${mM(
          baz.kap / 1e6,
        )}. Bunlar saha verisiyle doğrulanmış baz değerlerdir. Bir preset seçin ya da radar grafiğin ` +
        `bir eksenini çekin — ray dolmaya başlayacak.`,
      eylem: 'bir preset seç',
    });

  return L.sort((a, b) => TIP_SIRA[a.tip] - TIP_SIRA[b.tip]);
}
