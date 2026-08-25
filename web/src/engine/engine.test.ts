/**
 * PARİTE TESTİ — web uygulamasının hesap çekirdeği, catalyst.html'in ürettiği
 * sayıların birebir aynısını vermeli. Beklenen değerler CLAUDE.md §3 ve
 * smoke_test.js'ten alındı; hiçbiri bu dosyada türetilmiyor, hepsi sabit.
 *
 * Bu testin amacı "kod çalışıyor mu" değil: taşıma sırasında tek bir sayının
 * kayıp gitmediğini kanıtlamak.
 */
import { describe, it, expect } from 'vitest';
import { D, K, PN, NPN } from '@/data/payload';
import { kararMotoru } from './karar';
import {
  senaryoHesap,
  belirsizlik,
  paramHesap,
  PRESETS,
  PARAM_BAZ,
  BAZ_CFG,
  ttsDagilim,
  marjDagilim,
  bandCarpani,
  ttrSok,
  leadSok,
  MARJ_KIRMIZI,
} from './senaryo';
import { PROFILLER, siddet, olcek, ayN, krizTakvim } from './kriz';
import { tahsis, duyarlilik, acikMaliyeti } from './tahsis';
import { poisCdf, poissonMin, eksikMoment, invNorm } from './stats';
import { kanalSec, ladderOps } from './ladder';
import { FL, hasF, DURUM } from './flags';
import { fmt, mM, pct, f1, foldTr } from './format';

describe('veri paketi — CLAUDE.md §3 mutabakatı', () => {
  it('çekirdek sayılar', () => {
    expect(K.pn).toBe(5000);
    expect(NPN).toBe(5000);
    expect(K.talep25).toBe(90016);
    expect(K.svc_adet).toBe(27275);
    expect(K.tamirde_adet).toBe(7800);
    expect(K.toplam_adet).toBe(48200);
    expect(K.gayrifaal_adet).toBe(4803);
    expect(K.kirmizi).toBe(134);
    expect(K.siparissiz).toBe(72);
    expect(K.siparissiz_aog).toBe(11);
    expect(K.risk_listesi).toBe(547);
    expect(K.uclu).toBe(181);
    expect(K.scrap_anomali).toBe(159);
    expect(K.pool_bagimli).toBe(150);
    expect(K.ber_pn).toBe(338);
  });

  it('para muslukları ve float doğrulaması', () => {
    expect(K.fmv).toBe(132.9);
    expect(K.clp).toBe(304.2);
    expect(K.scrap_butce).toBe(67.8);
    expect(K.phaseout).toBe(52);
    expect(K.kab_tasarruf).toBe(12.1);
    expect(K.kab_sermaye).toBe(4);
    // float formülü ↔ gerçek tamirde adedi: %97 isabet (sunumun en güçlü kozu)
    expect(K.float_adet).toBe(8012);
    expect(K.float_adet / K.tamirde_adet).toBeCloseTo(1.027, 2);
  });

  it('2033 projeksiyonu bant olarak sunulur, nokta tahmin yok', () => {
    expect(D.band.alt_pct).toBeCloseTo(63.2, 1);
    expect(D.band.ust_pct).toBeCloseTo(67.5, 1);
    expect(D.band.alt).toBeLessThan(D.band.ust);
  });

  it('pn dizileri risk skoruna göre azalan sıralı', () => {
    for (let i = 1; i < NPN; i++) expect(PN.risk[i]).toBeLessThanOrEqual(PN.risk[i - 1]);
    expect(PN.id[0]).toBe('101741'); // risk skoru 1 numarası, envanterde fiilen kırmızı
    expect(hasF(0, FL.KIRMIZI)).toBe(true);
  });
});

describe('karar motoru — 5.000 parça tek kanala düşer', () => {
  const d = kararMotoru();

  it('kanal dağılımı watchlist önerisiyle aynı kod yolundan gelir', () => {
    expect(d.say.pool).toBe(694);
    expect(d.say.tamir).toBe(641);
    expect(d.say.alim).toBe(217);
    expect(d.say.izle).toBe(3448);
    expect(d.say.pool + d.say.tamir + d.say.alim + d.say.izle).toBe(NPN);
  });

  it('sipariş penceresi alarmı: penceresi geçmiş + siparişsiz', () => {
    expect(d.alarm.length).toBe(42);
    expect(d.pen.gecmis.sip0).toBe(42);
    // en geciken önce sıralı
    for (let i = 1; i < d.alarm.length; i++)
      expect(d.kalan[d.alarm[i]]).toBeGreaterThanOrEqual(d.kalan[d.alarm[i - 1]]);
    // alarmdaki her parçanın açık siparişi gerçekten yok
    d.alarm.forEach((i) => expect(PN.po[i]).toBe(0));
  });

  it('planlama ufku pencereleri tüm portföyü kapsar', () => {
    const t = d.pen.gecmis.n + d.pen.p030.n + d.pen.p3090.n + d.pen.p90.n;
    expect(t).toBe(NPN);
  });

  it('fazla stok dengeleme — şişkinlik miti (adet sorunu değil)', () => {
    expect(d.fazla.n).toBeGreaterThan(0);
    expect(d.fazla.deger / 1e6).toBeCloseTo(4.5, 0);
  });
});

describe('senaryo motoru — kriz = parametre şoku', () => {
  it('baz durum kırmızı listeyi yeniden üretir', () => {
    const r = senaryoHesap(BAZ_CFG);
    expect(r.kir).toBe(134);
    expect(r.kirAog).toBe(22);
    expect(r.byKr.reduce((a, b) => a + b, 0)).toBe(134);
  });

  it('motor ailesi krizi: 134 → 477', () => {
    expect(senaryoHesap(PRESETS.motor).kir).toBe(477);
  });

  it('OEM gecikmesi küçülen modellerin talebini sürdürür: 134 → 283', () => {
    expect(senaryoHesap(PRESETS.oem).kir).toBe(283);
  });

  it('her senaryo baz durumdan daha kötü ya da eşit', () => {
    const baz = senaryoHesap(BAZ_CFG).kir;
    Object.values(PRESETS).forEach((p) => expect(senaryoHesap(p).kir).toBeGreaterThanOrEqual(baz));
  });

  it('dayanıklılık dağılımı tüm aktif parçaları kapsar', () => {
    const t = ttsDagilim(BAZ_CFG).reduce((a, b) => a + b, 0);
    expect(t).toBe(K.aktif_pn);
  });
});

/* =====================================================================
   YENİ ŞOK EKSENLERİ

   Sözleşme: nötr ayar eski davranışı BİREBİR verir. Bu bloğun tamamı bu
   cümleyi ve her eksenin "neyi vurup neyi vurmadığını" kilitliyor — bir
   eksen yanlış kanala bağlanırsa 134 hâlâ çıkar ama kriz anlatısı çöker.
   ===================================================================== */
describe('şok eksenleri — hangi eksen neyi vurur', () => {
  const ic = PN.ato.findIndex((v) => v === 1);
  const dis = PN.ato.findIndex((v) => v === 0);

  it('BAZ_CFG bütün yeni eksenlerde nötr, süreler hiç değişmez', () => {
    expect(BAZ_CFG.icKap).toBe(0);
    expect(BAZ_CFG.gumruk).toBe(0);
    expect(BAZ_CFG.havuz).toBe(0);
    expect(BAZ_CFG.kur).toBe(0);
    expect(BAZ_CFG.filoUc).toBe(0);
    for (let i = 0; i < NPN; i += 419) {
      expect(ttrSok(i, BAZ_CFG)).toBe(PN.ttr[i]);
      expect(leadSok(i, BAZ_CFG)).toBe(PN.lead[i]);
    }
  });

  it('gümrük kuyruğu TOPLAMSAL ve yalnız dış kanala biner', () => {
    const c = { ...BAZ_CFG, gumruk: 45 };
    expect(ttrSok(dis, c)).toBeCloseTo(PN.ttr[dis] + 45, 9);
    expect(leadSok(dis, c)).toBeCloseTo(PN.lead[dis] + 45, 9);
    // iç tamirli parçada gün sayısı HİÇ değişmez
    expect(ttrSok(ic, c)).toBe(PN.ttr[ic]);
    // toplamsal olduğu için kısa TAT'lı parçayı yüzdece daha sert vurur
    const kisa = PN.ato.findIndex((v, i) => v === 0 && PN.ttr[i] > 0 && PN.ttr[i] < 30);
    const uzun = PN.ato.findIndex((v, i) => v === 0 && PN.ttr[i] > 120);
    if (kisa > -1 && uzun > -1)
      expect(ttrSok(kisa, c) / PN.ttr[kisa]).toBeGreaterThan(ttrSok(uzun, c) / PN.ttr[uzun]);
  });

  it('iç kapasite kaybı yalnız atölyesi olan parçayı çarpar', () => {
    const c = { ...BAZ_CFG, icKap: 100 };
    expect(ttrSok(ic, c)).toBeCloseTo(PN.ttr[ic] * 2, 9);
    expect(ttrSok(dis, c)).toBe(PN.ttr[dis]);
    expect(senaryoHesap(c).kir).toBeGreaterThan(senaryoHesap(BAZ_CFG).kir);
  });

  it('disOnly açıkken TAT şoku iç kanalı atlar', () => {
    const c = { ...BAZ_CFG, l: 50, disOnly: true };
    expect(ttrSok(ic, c)).toBe(PN.ttr[ic]);
    expect(ttrSok(dis, c)).toBeCloseTo(PN.ttr[dis] * 1.5, 9);
  });

  it('filoUc = 0 tam olarak 1,0 verir, uçlar 2033 açığını monoton büyütür', () => {
    expect(bandCarpani(BAZ_CFG)).toBe(1);
    expect(bandCarpani({ ...BAZ_CFG, filoUc: -1 })).toBeLessThan(1);
    expect(bandCarpani({ ...BAZ_CFG, filoUc: 1 })).toBeGreaterThan(1);
    const alt = senaryoHesap({ ...BAZ_CFG, filoUc: -1 }).acik;
    const orta = senaryoHesap(BAZ_CFG).acik;
    const ust = senaryoHesap({ ...BAZ_CFG, filoUc: 1 }).acik;
    expect(alt).toBeLessThanOrEqual(orta);
    expect(orta).toBeLessThanOrEqual(ust);
    // filo ucu bir kriz şoku değil, 2033 varsayımı: bugünün kırmızı listesine dokunmaz
    expect(senaryoHesap({ ...BAZ_CFG, filoUc: 1 }).kir).toBe(senaryoHesap(BAZ_CFG).kir);
  });

  it('havuz kaybı ADETLERİ değiştirmez, yalnız faturayı büyütür', () => {
    const baz = senaryoHesap(BAZ_CFG);
    const h = senaryoHesap({ ...BAZ_CFG, havuz: 70 });
    expect(h.kir).toBe(baz.kir);
    expect(h.acik).toBe(baz.acik);
    expect(h.ek).toBeCloseTo(baz.ek, 6);
    expect(baz.poolEk).toBe(0);
    expect(h.poolEk).toBeGreaterThan(0);
    expect(h.poolKayipPn).toBeGreaterThan(0);
  });

  it('kur şoku adetlere dokunmaz, $ kalemleri ölçekler, BER eşiğini kaydırır', () => {
    const baz = senaryoHesap(BAZ_CFG);
    const k = senaryoHesap({ ...BAZ_CFG, kur: 40 });
    expect(k.kir).toBe(baz.kir);
    expect(k.acik).toBe(baz.acik);
    expect(k.kap / baz.kap).toBeCloseTo(1.4, 6);
    expect(k.ek / baz.ek).toBeCloseTo(1.4, 6);
    // nakit koruma modu: eşik yukarı kayar → BER adayı azalır, parçalar tamire döner
    expect(k.berEtkin).toBeGreaterThan(baz.berEtkin);
    expect(k.berPn).toBeLessThan(baz.berPn);
    expect(baz.berPn).toBe(K.ber_pn);
  });

  it('byKat toplamı kırmızıya eşit, marjın ilk 4 kovası kırmızı listenin kendisi', () => {
    [BAZ_CFG, PRESETS.motor, PRESETS.pandemi, PRESETS.bilesik].forEach((c) => {
      const r = senaryoHesap(c);
      expect(r.byKat.length).toBe(26);
      expect(r.byKat.reduce((a, b) => a + b, 0)).toBe(r.kir);
      const m = marjDagilim(c);
      expect(m.slice(0, MARJ_KIRMIZI).reduce((a, b) => a + b, 0)).toBe(r.kir);
    });
  });

  it('marj dağılımı TAT şokunu görür, dayanma süresi dağılımı (tanım gereği) görmez', () => {
    const c = { ...BAZ_CFG, l: 60, disOnly: true };
    expect(ttsDagilim(c)).toEqual(ttsDagilim(BAZ_CFG));
    expect(marjDagilim(c)).not.toEqual(marjDagilim(BAZ_CFG));
    expect(senaryoHesap(c).kir).toBeGreaterThan(senaryoHesap(BAZ_CFG).kir);
  });

  it('11 preset var; hepsi bazdan farklı ve bazdan kötü ya da eşit', () => {
    const ks = Object.keys(PRESETS);
    expect(ks.length).toBe(11);
    const baz = senaryoHesap(BAZ_CFG);
    const imza = (r: ReturnType<typeof senaryoHesap>) =>
      [r.kir, Math.round(r.ek), Math.round(r.poolEk), r.berPn].join('|');
    ks.filter((k) => k !== 'baz').forEach((k) => {
      const r = senaryoHesap(PRESETS[k]);
      expect(r.kir).toBeGreaterThanOrEqual(baz.kir);
      expect(imza(r)).not.toBe(imza(baz));
    });
  });

  it('alarm tamponu artık senaryo motorunu da etkiler (tek doğruluk kaynağı)', () => {
    const a = senaryoHesap(BAZ_CFG, PARAM_BAZ).kir;
    const b = senaryoHesap(BAZ_CFG, { ...PARAM_BAZ, tampon: 14 }).kir;
    expect(b).toBeGreaterThan(a);
    expect(b).toBe(paramHesap({ ...PARAM_BAZ, tampon: 14 }).kir);
  });
});

/* =====================================================================
   KRİZ TAKVİMİ
   ===================================================================== */
describe('kriz takvimi — şok zamana yayılır', () => {
  it('şiddet eğrisi: 0. ay kriz öncesi, plato tam şiddet, toparlanma sonu sıfır', () => {
    const p = PROFILLER.kademeli;
    expect(siddet(p, 0)).toBe(0);
    expect(siddet(p, p.tirmanma)).toBe(1);
    for (let a = p.tirmanma; a <= p.tirmanma + p.plato; a++) expect(siddet(p, a)).toBe(1);
    expect(siddet(p, ayN(p) - 1)).toBe(0);
    // tırmanma monoton
    for (let a = 1; a <= p.tirmanma; a++) expect(siddet(p, a)).toBeGreaterThan(siddet(p, a - 1));
  });

  it("ölçekte çarpanlar 1'den başlar, yapısal varsayımlar ölçeklenmez", () => {
    const c = olcek(PRESETS.bilesik, 0);
    expect(c.d).toBe(0);
    expect(c.l).toBe(0);
    expect(c.icKap).toBe(0);
    expect(c.gumruk).toBe(0);
    expect(c.havuz).toBe(0);
    expect(c.kur).toBe(0);
    // ÇARPANLAR: w = 0'da 1 olmalı, 0 DEĞİL — yoksa talep sıfırlanır
    expect(c.yeniDem).toBe(1);
    expect(olcek(PRESETS.oem, 0).kuculDem).toBe(1);
    // etkisiz çarpan etkisiz kalır
    expect(olcek(PRESETS.lojistik, 0.5).yeniDem).toBe(0);
    // yapısal varsayımlar aynen geçer
    expect(c.disOnly).toBe(PRESETS.bilesik.disOnly);
    expect(c.filoUc).toBe(PRESETS.bilesik.filoUc);
  });

  it('0. ay baz durumu birebir verir', () => {
    const tk = krizTakvim(PRESETS.motor, PROFILLER.kademeli);
    expect(tk.bazKir).toBe(134);
    expect(tk.aylar[0].r.kir).toBe(senaryoHesap(BAZ_CFG).kir);
    expect(tk.aylar.length).toBe(ayN(PROFILLER.kademeli));
  });

  it('zirve takvim aralığında ve tam şiddet ayına düşer', () => {
    const p = PROFILLER.kademeli;
    const tk = krizTakvim(PRESETS.motor, p);
    expect(tk.zirveKir).toBe(senaryoHesap(PRESETS.motor).kir);
    expect(tk.duvarAy).toBeGreaterThanOrEqual(p.tirmanma);
    expect(tk.duvarAy).toBeLessThanOrEqual(p.tirmanma + p.plato);
    expect(tk.zirveKir).toBeGreaterThan(tk.bazKir);
  });

  it('baz senaryoda takvim düz: zirve = baz, alarm rayı sessiz', () => {
    const tk = krizTakvim(BAZ_CFG, PROFILLER.surukleyen);
    expect(tk.zirveKir).toBe(tk.bazKir);
    expect(tk.kirmiziAy).toBe(tk.bazKir * tk.aylar.length);
    tk.aylar.forEach((a) => expect(a.r.kir).toBe(tk.bazKir));
  });

  it('uzun sürükleyen profil, ani darbeden daha çok parça·ay yakar', () => {
    const ani = krizTakvim(PRESETS.pandemi, PROFILLER.ani);
    const uzun = krizTakvim(PRESETS.pandemi, PROFILLER.surukleyen);
    const fazla = (t: ReturnType<typeof krizTakvim>) => t.kirmiziAy - t.bazKir * t.aylar.length;
    expect(fazla(uzun)).toBeGreaterThan(fazla(ani));
    expect(uzun.zirveKir).toBe(ani.zirveKir); // aynı şok, aynı zirve — fark SÜREDE
  });
});

/* =====================================================================
   TAHSİS + DUYARLILIK
   ===================================================================== */
describe('kaynak tahsisi — kısıtlı bütçe nereye kadar gider', () => {
  const t = tahsis(BAZ_CFG, PARAM_BAZ);

  it("kümülatif eğri monoton artar ve kazanım %100'e yakınsar", () => {
    for (let i = 1; i < t.butce.length; i++) {
      expect(t.butce[i]).toBeGreaterThanOrEqual(t.butce[i - 1]);
      expect(t.kazanc[i]).toBeGreaterThanOrEqual(t.kazanc[i - 1]);
      expect(t.kapanan[i]).toBeGreaterThanOrEqual(t.kapanan[i - 1]);
    }
    expect(t.kazanc[t.kazanc.length - 1]).toBeCloseTo(100, 6);
    // Chart.js'e 10.000 nokta verilmez
    expect(t.butce.length).toBeLessThanOrEqual(92);
    expect(t.toplamAdim).toBeGreaterThan(t.butce.length);
  });

  it("kazanımın %80'i toplam bütçenin küçük bir kısmıyla doluyor", () => {
    expect(t.butce80).toBeGreaterThan(0);
    expect(t.butce80).toBeLessThan(t.toplamButce * 0.75);
  });

  it('ilk 10 tekil parça, hepsinin açığı ve maliyeti pozitif', () => {
    expect(t.ilk10.length).toBe(10);
    expect(new Set(t.ilk10.map((o) => o.pn)).size).toBe(10);
    t.ilk10.forEach((o) => {
      expect(o.adet).toBeGreaterThan(0);
      expect(o.maliyet).toBeGreaterThan(0);
      expect(o.stokout).toBeGreaterThanOrEqual(0);
      expect(o.stokout).toBeLessThanOrEqual(100);
    });
  });

  it('kriz derinleşince gereken bütçe büyür', () => {
    const kriz = tahsis(PRESETS.motor, PARAM_BAZ);
    expect(kriz.toplamButce).toBeGreaterThan(t.toplamButce);
    expect(kriz.toplamAdim).toBeGreaterThan(t.toplamAdim);
  });

  it('tornado 6 etken üretir ve her etkenin üst ucu daha pahalıdır', () => {
    const d = duyarlilik(BAZ_CFG, acikMaliyeti(PARAM_BAZ));
    expect(d.satir.length).toBe(6);
    expect(d.baz).toBeGreaterThan(0);
    d.satir.forEach((s) => expect(s.yuksek).toBeGreaterThan(s.dusuk));
    // seçili senaryonun ETRAFINDA: kriz derinleşince tablo da kayar
    const kriz = duyarlilik(PRESETS.bilesik, acikMaliyeti(PARAM_BAZ));
    expect(kriz.baz).toBeGreaterThan(d.baz);
  });
});

describe('belirsizlik motoru — kapalı form ↔ build sırasındaki denemeler', () => {
  const b = belirsizlik(BAZ_CFG);

  it('baz durum: beklenen açık parça sayısı ve fatura', () => {
    expect(Math.round(b.ort)).toBe(389);
    expect(b.mal / 1e6).toBeCloseTo(9.8, 1);
    // kötü giden %10 her zaman ortalamadan pahalı
    expect(b.kuyruk).toBeGreaterThan(b.mal);
  });

  it('%80 aralığı', () => {
    const [lo, hi] = b.aralik(80);
    expect(Math.round(lo)).toBe(371);
    expect(Math.round(hi)).toBe(408);
  });

  it('belirsizliğin kaynağı ayrışıyor: talep bandı vs rastgele arıza', () => {
    expect(b.bantPayi).toBeGreaterThan(5);
    expect(b.bantPayi).toBeLessThan(25);
  });

  it('motor krizinde açık parça sayısı iki katına çıkar', () => {
    expect(Math.round(belirsizlik(PRESETS.motor).ort)).toBe(797);
  });

  it('numpy ile koşulan 800 denemeye yakınsıyor (payload.mc)', () => {
    // build sırasında ayrı kodla (numpy) hesaplanan uyum skoru
    expect(D.mc.uyum).toBeGreaterThan(99);
    // kapalı formun ortalaması, denemelerin ortalamasının ±%10 bandında
    const fark = Math.abs(b.ort - D.mc.baz.acik_ort) / D.mc.baz.acik_ort;
    expect(fark).toBeLessThan(0.1);
  });

  it('cdf monoton ve 0–1 arasında', () => {
    const xs = [200, 300, 389, 450, 600];
    let onceki = 0;
    xs.forEach((x) => {
      const v = b.cdf(x);
      expect(v).toBeGreaterThanOrEqual(onceki);
      expect(v).toBeLessThanOrEqual(1);
      onceki = v;
    });
  });
});

describe('canlı parametre paneli', () => {
  it('varsayılanlar baz sonucu verir', () => {
    const r = paramHesap(PARAM_BAZ);
    expect(r.kir).toBe(134);
    expect(r.kirAog).toBe(22);
    expect(r.berN).toBe(K.ber_pn);
    expect(r.top[0]).toBe(0); // risk 1 numarası = PN-101741
  });

  it('alarm tamponu büyüdükçe kırmızı sayısı artar', () => {
    const a = paramHesap({ ...PARAM_BAZ, tampon: 0 }).kir;
    const b = paramHesap({ ...PARAM_BAZ, tampon: 14 }).kir;
    expect(b).toBeGreaterThan(a);
  });

  it('AOG ağırlığı artınca liste yeniden sıralanır', () => {
    const baz = paramHesap(PARAM_BAZ).top;
    const agir = paramHesap({ ...PARAM_BAZ, w0: 6 }).top;
    expect(agir).not.toEqual(baz);
  });

  it('BER eşiği düşünce aday sayısı artar', () => {
    expect(paramHesap({ ...PARAM_BAZ, ber: 0.4 }).berN).toBeGreaterThan(
      paramHesap({ ...PARAM_BAZ, ber: 0.9 }).berN,
    );
  });
});

describe('aksiyon merdiveni', () => {
  it('süreye göre sıralı ve en hızlı gerçek kanal seçilir', () => {
    const { ops, best } = kanalSec(0);
    for (let i = 1; i < ops.length; i++) expect(ops[i].gun).toBeGreaterThanOrEqual(ops[i - 1].gun);
    expect(best.t).not.toBe('sokum'); // söküm kanal değil, köprü
  });

  it('BER adayında tamir kanalları elenir', () => {
    const i = PN.id.findIndex((_, ix) => hasF(ix, FL.BER) && PN.ato[ix] === 1);
    expect(i).toBeGreaterThan(-1);
    const { best } = kanalSec(i);
    expect(['ictamir', 'distamir', 'hizli']).not.toContain(best.t);
  });

  it('her parçada en az bir seçenek var', () => {
    for (let i = 0; i < NPN; i += 137) expect(ladderOps(i).length).toBeGreaterThan(0);
  });

  it('durum önceliği: siparişsiz > kırmızı > 547 > BER', () => {
    for (let i = 0; i < NPN; i += 211) {
      const d = DURUM[i];
      if (hasF(i, FL.SIP)) expect(d).toBe(4);
      else if (hasF(i, FL.KIRMIZI)) expect(d).toBe(3);
    }
  });
});

describe('olasılık çekirdeği', () => {
  it('poisCdf sınırlar', () => {
    expect(poisCdf(0, 0)).toBe(1);
    expect(poisCdf(5, -1)).toBe(0);
    expect(poisCdf(3, 0)).toBeCloseTo(Math.exp(-3), 6);
    expect(poisCdf(2, 100)).toBeCloseTo(1, 6);
  });

  it('poissonMin servis hedefini karşılar', () => {
    [0.9, 0.95, 0.98].forEach((h) => {
      [0.5, 2, 8, 40].forEach((mu) => {
        expect(poisCdf(mu, poissonMin(mu, h))).toBeGreaterThanOrEqual(h - 1e-9);
      });
    });
  });

  it('yüksek hacimde normal yaklaşıma geçer (taşma yok)', () => {
    expect(Number.isFinite(poissonMin(500, 0.98))).toBe(true);
    expect(Number.isFinite(poisCdf(500, 480))).toBe(true);
  });

  it('eksikMoment: E[(D−s)+] beklenen davranış', () => {
    expect(eksikMoment(5, 100)[0]).toBeCloseTo(0, 6);
    const [e1, e2] = eksikMoment(10, 0);
    expect(e1).toBeCloseTo(10, 3); // s=0 → E[D] = mu
    expect(e2).toBeGreaterThan(e1);
  });

  it('invNorm bilinen kuantiller', () => {
    expect(invNorm(0.975)).toBeCloseTo(1.96, 3);
    expect(invNorm(0.5)).toBeCloseTo(0, 6);
  });
});

describe('tr-TR biçimleme', () => {
  it('ondalık virgül, binlik nokta', () => {
    expect(fmt(90016)).toBe('90.016');
    expect(f1(23.3)).toBe('23,3');
    expect(mM(132.9)).toBe('$132,9M');
    expect(pct(67.5)).toBe('%67,5');
  });

  it('Türkçe arama katlaması', () => {
    expect(foldTr('Şasi Bağlantısı')).toBe('sasi baglantisi');
    expect(foldTr('İÇ TAMİR')).toBe('ic tamir');
  });
});
