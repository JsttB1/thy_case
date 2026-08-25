/**
 * 3 · ÖNGÖRÜ & AI — talep yapısı, segmentasyon, geriye dönük test, 2033 dağılım
 * değişimi ve tahmin gezgini.
 *
 * Anlatının omurgası: "büyüme değil göç". Portföy +%63–68 büyürken talebin
 * üçte ikisi model değiştiriyor (yeni nesil %34 → %65) — bu yüzden tek çarpanlı
 * plan yasak, cold-start ana senaryo.
 */
import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { D, K, PN, LK, PIDX, PRM } from '@/data/payload';
import { fmt, f1, mM, pct, vir, foldTr } from '@/engine/format';
import { CC as C, S, isiRenk } from '@/design/renkler';
import { useStore } from '@/app/store';
import { Bolum, Kart, Izgara, Vurgu, Cip, Yigin } from '@/components/temel';
import Grafik from '@/components/Grafik';
import ParamPanel from './ongoru/ParamPanel';

/** SBA (Syntetos-Boylan) — core.py'deki sba_rate ile aynı; gezginde kıyas için. */
function sbaJS(x: number[]): number {
  const a = PRM.sba_alpha;
  const nz = x.map((v, i) => [v, i] as const).filter((p) => p[0] > 0);
  if (!nz.length) return 0;
  if (nz.length === x.length) return x.reduce((s, v) => s + v, 0) / x.length;
  let z = nz[0][0];
  let p = nz[0][1] + 1;
  for (let k = 1; k < nz.length; k++) {
    z += a * (nz[k][0] - z);
    p += a * (nz[k][1] - nz[k - 1][1] - p);
  }
  return ((1 - a / 2) * z) / p;
}

export default function Ongoru() {
  const ml = D.ml;
  const watchAc = useStore((s) => s.watchAc);
  const [gez, setGez] = useState(0);
  const [gezQ, setGezQ] = useState('');

  /* ------------------------------------------------ 2025 çeyreklik talep + hurda */
  const ceyCfg = useMemo<ChartConfiguration>(() => {
    const c = D.ceyrek;
    return {
      type: 'bar',
      data: {
        labels: c.ad,
        datasets: [
          {
            type: 'bar',
            label: 'THY talep',
            data: c.thy,
            backgroundColor: S.s2,
            stack: 't',
            borderRadius: 3,
          },
          {
            type: 'bar',
            label: 'Pool talep',
            data: c.pool,
            backgroundColor: S.s4,
            stack: 't',
            borderRadius: 3,
          },
          {
            /* Tek kırmızı çizgi: hurda kayıptır, sayfadaki tek "alarm" serisi. */
            type: 'line',
            label: 'Scrap',
            data: c.scrap,
            borderColor: S.alarm,
            backgroundColor: S.alarm,
            yAxisID: 'y1',
            tension: 0.3,
            pointRadius: 3,
          },
        ],
      },
      options: {
        scales: {
          x: { stacked: true },
          y: { stacked: true },
          y1: { position: 'right', grid: { drawOnChartArea: false }, beginAtZero: true },
        },
      },
    } as ChartConfiguration;
  }, []);

  /* --------------------------------------------------- hurda bütçesi: kategoriler */
  const scrapCfg = useMemo<ChartConfiguration>(() => {
    const kt = D.kat;
    const si = kt.ad
      .map((_, i) => i)
      .sort((a, b) => kt.sbutce[b] - kt.sbutce[a])
      .slice(0, 8);
    return {
      type: 'bar',
      data: {
        labels: si.map((i) => kt.ad[i]),
        datasets: [
          /* Aynı ölçünün iki yılı → tek hue, iki koyuluk. Farklı renk vermek
             "iki ayrı şey" der; oysa soru sadece "ne kadar arttı?".
             Sekme genelindeki kural: bugün açık, 2033 koyu. */
          {
            label: '2025 ($M/yıl)',
            data: si.map((i) => kt.sbutce[i]),
            backgroundColor: S.s5,
            borderColor: S.s4,
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            label: '2033 tahmini ($M/yıl)',
            data: si.map((i) => kt.sbutce33[i]),
            backgroundColor: S.s2,
            borderRadius: 3,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: { ticks: { callback: (v) => '$' + v + 'M' } },
          y: { ticks: { font: { size: 9.5 }, autoSkip: false } },
        },
        plugins: {
          tooltip: {
            callbacks: { label: (c) => ` ${c.dataset.label}: ${mM(Number(c.parsed.x))}` },
          },
        },
      },
    } as ChartConfiguration;
  }, []);

  /* ------------------------------------------------------------ geriye dönük test */
  const btCfg = useMemo<ChartConfiguration>(() => {
    const bt = D.backtest;
    return {
      type: 'bar',
      data: {
        labels: bt.ad,
        datasets: [
          {
            /* Üç aday nötr, kazanan yeşil: grafiğin tek cümlesi o çubuk. */
            label: 'Toplam düzeyde hata (%)',
            data: bt.toplam_hata,
            backgroundColor: bt.toplam_hata.map((_, i) => (i === 3 ? S.yesil : S.s4)),
            borderRadius: 4,
          },
          {
            /* Sağ eksendeki MAE bir çekince, ana mesaj değil — gri ve içi boş
               noktalarla geri planda durur. (Eskiden haki bir çizgiydi ve
               kazanan çubuktan daha çok göze çarpıyordu.) */
            label: 'PN düzeyinde MAE (adet)',
            yAxisID: 'y1',
            type: 'line',
            data: bt.mae,
            borderColor: S.notrKoyu,
            backgroundColor: '#FFFFFF',
            borderWidth: 1.6,
            pointRadius: 3.4,
            pointBorderWidth: 1.6,
            pointBorderColor: S.notrKoyu,
          },
        ],
      },
      options: {
        plugins: {
          legend: { labels: { boxWidth: 9, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (c) =>
                c.datasetIndex === 0
                  ? ` toplam hata: %${vir(String(c.parsed.y))}`
                  : ` PN MAE: ${vir(String(c.parsed.y))}`,
            },
          },
        },
        scales: {
          x: { ticks: { font: { size: 9 } } },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'toplam hata %' },
            ticks: { callback: (v) => '%' + v },
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'PN MAE' },
          },
        },
      },
    } as ChartConfiguration;
  }, []);

  /* ------------------------------------------ model bazında yıllık talep 25 → 33 */
  const modelCfg = useMemo<ChartConfiguration>(() => {
    const m = D.model;
    return {
      type: 'bar',
      data: {
        labels: m.ad,
        datasets: [
          /* Bugün açık, gelecek koyu. 2033 çubuğu eskiden kırmızıydı: bir
             projeksiyon alarm gibi okunuyordu, oysa burada kötü bir haber yok. */
          {
            label: '2025 gerçekleşen',
            data: m.t25,
            backgroundColor: S.s5,
            borderColor: S.s4,
            borderWidth: 1,
            borderSkipped: false,
            borderRadius: 2,
          },
          {
            label: '2033 tahmin',
            data: m.t33,
            backgroundColor: S.s2,
            borderColor: S.s1,
            borderWidth: 1,
            borderSkipped: false,
            borderRadius: 2,
          },
        ],
      },
      options: {
        plugins: {
          legend: { labels: { boxWidth: 10 } },
          tooltip: {
            callbacks: {
              label: (c) => ` ${c.dataset.label}: ${fmt(Number(c.parsed.y))} adet/yıl`,
              afterBody: (it) => {
                const i = it[0].dataIndex;
                const d = 100 * (m.t33[i] / m.t25[i] - 1);
                return `değişim ${d >= 0 ? '+' : '−'}%${Math.abs(Math.round(d))} · uçak ${fmt(
                  m.u25[i],
                )} → ${fmt(m.u33[i])}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { font: { size: 9.5 }, maxRotation: 52, minRotation: 38 },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'yıllık komponent talebi (adet)' },
            ticks: {
              callback: (v) => fmt(Number(v)),
              font: { family: 'ui-monospace,Menlo,monospace' },
            },
          },
        },
      },
    } as ChartConfiguration;
  }, []);

  /* --------------------------------------------------------------- talep göçü */
  const gocCfg = useMemo<ChartConfiguration>(() => {
    const m = D.model;
    const g = { y: [0, 0], k: [0, 0], o: [0, 0] };
    m.ad.forEach((_, i) => {
      const t = m.yeni[i] ? g.y : m.kucul[i] ? g.k : g.o;
      t[0] += m.t25[i];
      t[1] += m.t33[i];
    });
    return {
      type: 'bar',
      data: {
        labels: ['2025', '2033 (model-bazlı)'],
        datasets: [
          /* Sıralı bir hikâye: büyüyen → sabit → küçülen. Renk de o sırada
             sönüyor, böylece yığının nereye kaydığı okunuyor. */
          {
            label: 'Yeni nesil (5 model)',
            data: g.y,
            backgroundColor: S.yesil,
            stack: 's',
            borderRadius: 3,
          },
          {
            label: 'Diğer',
            data: g.o,
            backgroundColor: S.s4,
            stack: 's',
            borderRadius: 3,
          },
          {
            label: 'Küçülen 4 klasik',
            data: g.k,
            backgroundColor: S.notr,
            stack: 's',
            borderRadius: 3,
          },
        ],
      },
      options: {
        scales: {
          x: { stacked: true },
          y: { stacked: true, ticks: { callback: (v) => fmt(Number(v)) } },
        },
      },
    } as ChartConfiguration;
  }, []);

  /* ------------------------------------------------------- kategori ayrışması */
  const katCfg = useMemo<ChartConfiguration>(() => {
    const kat = D.kat;
    const ki = kat.ad.map((_, i) => i).sort((a, b) => kat.buyume[b] - kat.buyume[a]);
    /* Eskiden eşiğe göre kırmızı/sarı/mavi üç kova vardı: %79 ile %81 arasında
       renk atlıyordu, üstelik hızlı büyüyen kategori "alarm" gibi duruyordu.
       Şimdi koyuluk doğrudan büyüme oranını izliyor — sıralama sürekli. */
    const bmin = Math.min(...kat.buyume);
    const bmax = Math.max(...kat.buyume);
    return {
      type: 'bar',
      data: {
        labels: ki.map((i) => kat.ad[i]),
        datasets: [
          {
            label: '2033 talep büyümesi %',
            data: ki.map((i) => kat.buyume[i]),
            backgroundColor: ki.map((i) =>
              isiRenk(0.18 + 0.82 * ((kat.buyume[i] - bmin) / (bmax - bmin || 1))),
            ),
            borderRadius: 3,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: { ticks: { callback: (v) => '+%' + v } },
          y: { ticks: { font: { size: 9.5 }, autoSkip: false } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` +%${f1(Number(c.parsed.x))}` } },
        },
      },
    } as ChartConfiguration;
  }, []);

  /* ------------------------------------------------------------ tahmin gezgini */
  const gezVeri = useMemo(() => {
    const i = gez;
    const qv = [PN.q1[i], PN.q2[i], PN.q3[i], PN.q4[i]];
    const tq = [PN.tq1[i], PN.tq2[i], PN.tq3[i], PN.tq4[i]];
    const pq = qv.map((v, n) => v - tq[n]);
    const sba = sbaJS(qv.slice(0, 3));
    const ma = (qv[0] + qv[1] + qv[2]) / 3;
    const nn = PN.nn4[i];
    const cfg = {
      type: 'bar',
      data: {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          {
            type: 'bar',
            label: 'THY talebi',
            data: tq,
            backgroundColor: S.s3,
            stack: 'q',
            borderRadius: 3,
          },
          {
            type: 'bar',
            label: 'Pool talebi',
            data: pq,
            backgroundColor: S.s5,
            stack: 'q',
            borderRadius: 3,
          },
          /* Üç tahminci üç ayrı şey söylüyor: burada renk gerçekten ayırt
             ediyor, o yüzden rampanın dışına çıkıyoruz. */
          {
            type: 'line',
            label: 'Sinir ağı (Q4 tahmini)',
            data: [null, null, null, nn],
            borderColor: C.mor,
            backgroundColor: C.mor,
            pointRadius: 7,
            pointStyle: 'rectRot',
          },
          {
            type: 'line',
            label: 'SBA (Q4 tahmini)',
            data: [null, null, null, sba],
            borderColor: S.yesil,
            backgroundColor: S.yesil,
            pointRadius: 7,
            pointStyle: 'triangle',
          },
          {
            type: 'line',
            label: '3Ç ortalaması',
            data: [null, null, null, ma],
            borderColor: S.notrKoyu,
            backgroundColor: S.notrKoyu,
            pointRadius: 6,
          },
        ],
      },
      options: {
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
        },
        plugins: { legend: { labels: { boxWidth: 9, font: { size: 10 } } } },
      },
    } as ChartConfiguration;
    return { cfg, qv, sba, ma, nn };
  }, [gez]);

  const gezAra = (v: string) => {
    setGezQ(v);
    const id = foldTr(v.trim()).replace(/^pn-?/, '');
    if (PIDX[id] != null) setGez(PIDX[id]);
  };

  return (
    <>
      {/* Kaldırılan iki kart: "Talep ne kadar kesikli?" (grafiği yoktu, komşu
          kartın boyuna gerilip yarısı boş duruyordu) ve "ABC ve XYZ matrisi".
          Segmentasyon başlığı da matrisle birlikte gitti — tek konusu oydu.
          Hurda bütçesi, komşusu zaten "talep ve hurda" olduğu için bir üstteki
          bölüme çıktı; geriye kalan iki blok ise yöntemin doğrulanması. */}
      <Bolum baslik="Talep ve hurda: bugünkü tablo" />
      <Izgara tip="g21">
        <Kart
          baslik="2025 çeyreklik talep ve hurda"
          ipucu={
            <>
              Yaz çeyreği diğerlerinin {pct(K.q3_pct)} üstünde, etki operasyonel önem sınıflarında homojen.
              Yıl içi artış düşük: {pct(K.q1q4_pct)}. Medyan talep{' '}
              <b>{fmt(K.medyan_talep)} adet/yıl</b>, parça-çeyreklerin {pct(K.sifir_ceyrek)}'ı
              sıfır.
            </>
          }
        >
          <Grafik cfg={ceyCfg} h={280} />
        </Kart>

        <Kart
          baslik="Hurda bütçesi: kategori kırılımı"
          ipucu={
            <>
              Yıllık ikame bütçesi <b>{mM(K.scrap_butce)}</b>, filo büyümesiyle 2033'te{' '}
              <b>{mM(K.scrap_butce33)}</b>'a çıkıyor. En çok harcama yapan kategoriler aşağıda. BER
              kuralı bu akışın vanası.
            </>
          }
        >
          <Grafik cfg={scrapCfg} h={230} />
          <div className="callout red" style={{ margin: '11px 0 0', padding: '12px 15px' }}>
            <span className="tag">Hurda Anomali Dedektörü</span>
            <p style={{ fontSize: '.82rem' }}>
              <b>{K.scrap_anomali} parçada</b> hurdaya ayırma oranı %20'nin üstünde ve yıllık talep
              20'den fazla. Bunlar bir kalite sorununun, yanlış tamir kararının ya da kayıt
              hatasının işareti olabilir.{' '}
              <Cip onClick={() => watchAc({ flag: 'SCRAPA' })} stil={{ marginLeft: 6 }}>
                Listeyi aç →
              </Cip>
            </p>
          </div>
        </Kart>
      </Izgara>

      <Bolum baslik="Yöntem doğrulaması: tahmin tutuyor mu?" />
      <Izgara tip="g21">
        <Kart
          baslik="Geriye dönük test: yaz çeyreğini önceden tahmin edebilir miydik?"
          ipucu={
            <>
              İlk yarıyla yaz çeyreği tahmin edildi. Mevsim katsayısı toplam hatayı %
              {vir(D.backtest.toplam_hata[2])}'ten{' '}
              <b style={{ color: C.teal }}>%{vir(D.backtest.toplam_hata[3])}'e</b> indiriyor.
              Katsayı bütçe düzeyinde çalışır, tek parçada kesikli talep yöntemleri geçerli.
            </>
          }
        >
          <Grafik cfg={btCfg} h={205} />
        </Kart>
        <Vurgu etiket="Doğrulama">
          Üç bağımsız kontrol aynı yönde: float formülü sahayla %97 uyumlu, risk sıralamasının
          birincisi sahada da riskli, geri test görmediği çeyreğin{' '}
          <strong>toplamını binde dört hatayla</strong> bildi. Kaydırıcılar, senaryolar ve
          optimizasyon bu çekirdeğin üzerinde çalışır.
        </Vurgu>
      </Izgara>

      <Bolum baslik="2033 projeksiyonu: büyüme değil, dağılım değişimi" />
      <Yigin>
        <Kart
          baslik="Model bazında yıllık talep: 2025 → 2033"
          ipucu="Her modelin yıllık komponent talebi, bugünkü gerçekleşen ile 2033 projeksiyonu yan yana. Filo büyümesi tek başına anlatmıyor: yeni nesil modellerde çubuk ikiye katlanırken küçülen klasiklerde geriliyor. Sıralama 2033 talebine göre."
        >
          <Grafik cfg={modelCfg} h={330} />
        </Kart>
      </Yigin>

      {/* g12: kategori grafiğinin uzun ATA adları için geniş kolon gerekiyor. */}
      <Izgara tip="g12">
        <Kart
          baslik="Talep nasıl yer değiştiriyor?"
          ipucu="Yeni nesil modellerin payı %34'ten %65'e çıkıyor, küçülen 4 klasik model ise %43'ten %16'ya iniyor. Geçmişi olmayan parça tahmini bu yüzden ana senaryo."
        >
          <Grafik cfg={gocCfg} h={430} />
        </Kart>
        <Kart
          baslik="Kategoriler ayrışıyor"
          ipucu="Bir kategori %40 büyürken bir diğeri %91 büyüyor. Bu yüzden tek bir katsayıyla plan yapmak yanlış olur."
        >
          {/* 26 kategori 250px'e sığmıyordu, ATA adları üst üste biniyordu. */}
          <Grafik cfg={katCfg} h={430} />
        </Kart>
      </Izgara>

      {ml ? (
        <Yigin>
          <Kart baslik="Tahmin gezgini: model bu parça için ne dedi?">
            <div className="ctl" style={{ marginBottom: 9 }}>
              <input
                type="text"
                value={gezQ}
                onChange={(e) => gezAra(e.target.value)}
                placeholder="PN ara (örn. 101741)…"
                style={{ width: 150 }}
              />
              <select value={gez < 20 ? String(gez) : ''} onChange={(e) => setGez(+e.target.value)}>
                {gez >= 20 && <option value="">PN-{PN.id[gez]} (aramadan)</option>}
                {Array.from({ length: 20 }, (_, n) => (
                  <option key={n} value={n}>
                    {n + 1}. PN-{PN.id[n]} · {LK.sub[PN.sub[n]]}
                  </option>
                ))}
              </select>
            </div>
            <div className="hint">
              <b className="mono" style={{ color: C.teal }}>
                PN-{PN.id[gez]}
              </b>{' '}
              · {LK.sub[PN.sub[gez]]} (ATA {LK.ata[PN.sub[gez]]}) · {LK.mdl[PN.mdl[gez]]} ·{' '}
              {LK.kr[PN.kr[gez]]} · risk {f1(PN.risk[gez])}. Q4 gerçek <b>{fmt(gezVeri.qv[3])}</b> ·
              ağ {gezVeri.nn == null ? '—' : vir(gezVeri.nn)} · SBA {f1(gezVeri.sba)} · 3Ç ort.{' '}
              {f1(gezVeri.ma)}
            </div>
            <Grafik cfg={gezVeri.cfg} h={215} />
          </Kart>
        </Yigin>
      ) : (
        <Vurgu etiket="Model çıktısı yok" ton="amber">
          model_results.json bulunamadı. <span className="mono">uv run train_demand_model.py</span>{' '}
          çalıştırın.
        </Vurgu>
      )}

      {/* Model burada KALİBRE edilir; Senaryo sekmesinde kriz SİMÜLE edilir.
          Parametreler mağazada ortak: buradaki alarm tamponu senaryo motorunu da
          besler, iki ekran aynı kırmızı sayısını üretir. */}
      <Bolum
        baslik="Model parametreleri: sayılar sizin elinizde"
        aciklama='"Ağırlık neden 3?" sorusunun cevabı bir savunma değil bir kaydırıcı. Buradaki alarm tamponu ve BER eşiği Senaryo sekmesindeki kriz motorunu da besler.'
      />
      <ParamPanel />
    </>
  );
}
