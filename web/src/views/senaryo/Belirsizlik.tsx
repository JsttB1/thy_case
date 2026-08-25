/**
 * BELİRSİZLİK DENEMELERİ — "plan kaç farklı gelecekte tutuyor?"
 *
 * Tek sayı yerine dağılım: her parçanın tedarik penceresinde stoğu aşma olasılığı
 * toplanır (Poisson-binom). Aynı sonuç build sırasında numpy ile 800 rastgele
 * denemeyle de üretildi; alttaki doğrulama tablosu ikisini yan yana koyar —
 * kodda hata olsaydı buluşmazlardı.
 */
import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { D } from '@/data/payload';
import {
  belirsizlik,
  PRESETS,
  type SenaryoCfg,
  type Belirsizlik as BelTip,
} from '@/engine/senaryo';
import { fmt, f1, mM, vir } from '@/engine/format';
import { CC as C, tint } from '@/design/renkler';
import { Kart, Izgara, Cip } from '@/components/temel';
import Grafik from '@/components/Grafik';

/* 11 preset'in tamamı burada renkli olmalı: eksik kalan bir anahtar Chart.js'e
   undefined gider ve eğri soluk gri çizilir (bileşik krizde görüldü). */
const SEN_RENK: Record<string, string> = {
  baz: C.iyi,
  motor: C.kritik,
  pandemi: C.uyari,
  lojistik: C.mor,
  patlama: C.bilgi,
  oem: C.gri,
  gumruk: C.altin,
  atolye: C.navy,
  havuzCekilme: '#17845F',
  kur: '#8A6000',
  bilesik: C.kritik,
  ozel: C.text,
};

interface Sabit {
  ad: string;
  renk: string;
  b: BelTip;
}

export default function Belirsizlik({
  cfg,
  preset,
  onPreset,
}: {
  cfg: SenaryoCfg;
  preset: string;
  onPreset: (k: string) => void;
}) {
  const [g, setG] = useState(80);
  const [sabit, setSabit] = useState<Sabit[]>([]);

  const b = useMemo(() => belirsizlik(cfg, 9), [cfg]);
  const bazB = useMemo(() => belirsizlik(PRESETS.baz, 9), []);
  const [lo, hi] = b.aralik(g);
  const senKey = PRESETS[preset] ? preset : 'ozel';
  const senAd = PRESETS[preset] ? PRESETS[preset].ad : 'Özel ayar';

  /* ------------------------------------------------------- kümülatif eğri */
  const cdfCfg = useMemo<ChartConfiguration>(() => {
    const x0 = Math.max(0, b.ort - 4.2 * b.sd);
    const x1 = b.ort + 4.2 * b.sd;
    const N = 60;
    const seri = (bb: BelTip, renk: string, ad: string, sabitMi: boolean) => ({
      type: 'line' as const,
      label: ad,
      borderColor: renk,
      backgroundColor: renk,
      pointRadius: 0,
      borderWidth: sabitMi ? 1.4 : 2.4,
      borderDash: sabitMi ? [5, 4] : [],
      data: Array.from({ length: N + 1 }, (_, k) => {
        const x = x0 + (k * (x1 - x0)) / N;
        return { x, y: 100 * bb.cdf(x) };
      }),
    });
    const ds: unknown[] = sabit.map((s) => seri(s.b, s.renk, s.ad, true));
    ds.push(seri(b, SEN_RENK[senKey], senAd, false));
    ds.push({
      type: 'scatter',
      label: 'orta değer',
      data: [{ x: b.ort, y: 50 }],
      backgroundColor: C.text,
      pointRadius: 4.5,
    });
    return {
      type: 'line',
      data: { datasets: ds },
      options: {
        animation: { duration: 180 },
        plugins: {
          legend: {
            labels: { boxWidth: 9, font: { size: 10 }, filter: (it) => it.text !== 'orta değer' },
          },
          tooltip: {
            callbacks: {
              title: (it) => fmt(Number(it[0].parsed.x)) + ' parça',
              label: (c) =>
                ` ${c.dataset.label}: bunun altında kalma olasılığı %${f1(Number(c.parsed.y))}`,
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'tedarik penceresinde stoğu yetmeyen parça sayısı' },
            ticks: { font: { family: 'ui-monospace,Menlo,monospace' } },
          },
          y: {
            min: 0,
            max: 100,
            title: { display: true, text: 'bu sayıyı aşmama olasılığı (%)' },
            ticks: { callback: (v) => '%' + v },
          },
        },
      },
    } as ChartConfiguration;
  }, [b, sabit, senKey, senAd]);

  /* --------------------------------------------- senaryo karşılaştırması */
  const kars = useMemo(() => {
    const hs = Object.keys(PRESETS)
      .map((k) => ({ k, ad: PRESETS[k].ad, b: belirsizlik(PRESETS[k], 9) }))
      .sort((a, b2) => a.b.ort - b2.b.ort);
    const cfg2 = {
      type: 'bar',
      data: {
        labels: hs.map((h) => h.ad),
        datasets: [
          {
            type: 'bar',
            label: `%${g} aralık`,
            data: hs.map((h) => h.b.aralik(g)),
            backgroundColor: hs.map((h) => tint(SEN_RENK[h.k] || C.gri, 0.45)),
            borderColor: hs.map((h) => SEN_RENK[h.k] || C.gri),
            borderWidth: 1.2,
            borderSkipped: false,
            barPercentage: 0.62,
          },
          {
            type: 'scatter',
            label: 'orta değer',
            data: hs.map((h, i) => ({ x: h.b.ort, y: i })),
            backgroundColor: C.text,
            pointRadius: 4,
            pointStyle: 'rectRot',
          },
        ],
      },
      options: {
        indexAxis: 'y',
        animation: { duration: 200 },
        plugins: {
          legend: { labels: { boxWidth: 9, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (c) =>
                c.datasetIndex
                  ? ` orta değer ${fmt(Number(c.parsed.x))} parça`
                  : ` %${g} aralık ${fmt((c.raw as number[])[0])} – ${fmt(
                      (c.raw as number[])[1],
                    )} parça`,
            },
          },
        },
        scales: {
          x: { title: { display: true, text: 'açıkta kalan parça sayısı' } },
          y: { ticks: { font: { size: 10 }, autoSkip: false } },
        },
      },
    } as ChartConfiguration;
    return { cfg: cfg2, ks: hs.map((h) => h.k) };
  }, [g]);

  const bp = Math.round(b.bantPayi);
  const pp = 100 - bp;
  const kotu = b.kuyruk;
  const mc = D.mc.baz;

  return (
    <>
      <Izgara tip="g21">
        <Kart
          baslik={<h3>Açıkta Kalan Parça Dağılımı</h3>}
          sag={
            <span className="ctl" style={{ margin: 0, gap: 5 }}>
              <span className="note">aralık</span>
              {[80, 90, 95].map((v) => (
                <Cip key={v} acik={g === v} onClick={() => setG(v)}>
                  %{v}
                </Cip>
              ))}
            </span>
          }
          ipucu='Eğri, "en fazla şu kadar parça açıkta kalır" olasılığını verir. Dikey kılavuzlar seçili aralığın uçlarını, nokta orta değeri gösterir.'
        >
          <Grafik cfg={cdfCfg} h={230} />
          <div className="ctl" style={{ margin: '9px 0 0' }}>
            <Cip
              onClick={() =>
                setSabit((s) => [...s, { ad: senAd, renk: SEN_RENK[senKey] || C.gri, b }].slice(-3))
              }
            >
              📌 bu senaryoyu sabitle
            </Cip>
            <Cip onClick={() => setSabit([])}>sabitlenenleri temizle</Cip>
            <span className="note">
              {sabit.length
                ? `${sabit.length} senaryo sabitlendi: ${sabit.map((s) => s.ad).join(' · ')}`
                : 'karşılaştırmak için bir senaryoyu sabitleyip başkasına geçin'}
            </span>
          </div>
        </Kart>

        <Kart
          baslik="Hazırlık Seviyesi"
          ipucu="Ortalama bütçe için, kötü geleceklerin ortalaması tampon için. Aradaki fark belirsizliğin fiyatı."
        >
          <div className="blk">
            <div className="bkut">
              <div className="l">Beklenen fatura</div>
              <div className="v">{mM(b.mal / 1e6)}</div>
              <div className="d">ortalama gelecekte 2033 açığını kapatma</div>
            </div>
            <div className="bkut">
              <div className="l">Kötü giden %10'un ortalaması</div>
              <div className="v" style={{ color: C.uyari }}>
                {mM(kotu / 1e6)}
              </div>
              <div className="d">bütçe tamponu buna göre kurulur</div>
            </div>
            <div className="bkut">
              <div className="l">Beklenen açık parça</div>
              <div className="v">{fmt(b.ort)}</div>
              <div className="d">
                %{g} aralık {fmt(lo)} – {fmt(hi)}
              </div>
            </div>
            <div className="bkut">
              <div className="l">Belirsizliğin fiyatı</div>
              <div className="v" style={{ color: C.mor }}>
                {mM((kotu - b.mal) / 1e6)}
              </div>
              <div className="d">ortalama ile kötü senaryo arası</div>
            </div>
          </div>

          <div style={{ marginTop: 13 }}>
            <div style={{ fontSize: '.79rem', color: C.text, fontWeight: 600, marginBottom: 2 }}>
              Belirsizlik nereden geliyor?
            </div>
            <div className="kayseri">
              <i style={{ width: pp + '%', background: C.bilgi }} />
              <i style={{ width: bp + '%', background: C.mor }} />
            </div>
            <div className="kayleg">
              <span style={{ color: C.bilgi }}>Parça kırılmalarının rastgeleliği %{pp}</span>
              <span style={{ color: C.mor }}>Filo büyüme bandı %{bp}</span>
            </div>
            <div className="hint" style={{ marginTop: 9 }}>
              2033 filosunun ne kadar büyüyeceğini bilmemek sonucun yalnız <b>%{bp}</b>'ini
              oynatıyor. Geri kalanı hangi parçanın ne zaman kırılacağı — ve bunu tahminle değil
              emniyet stoğuyla yönetiyoruz. Plan, talep tahmininin tam tutmasına bağlı değil.
            </div>
          </div>
        </Kart>
      </Izgara>

      <Izgara tip="g21" stil={{ marginTop: 12 }}>
        <Kart
          baslik="Senaryo Karşılaştırması"
          ipucu="Çubuk seçili aralığı, dikey işaret orta değeri gösterir. Bir senaryoya tıklayın."
        >
          <Grafik cfg={kars.cfg} h={215} onSec={(i) => onPreset(kars.ks[i])} />
        </Kart>
        <Kart
          baslik="Doğrulama"
          ipucu={
            <>
              Sol sütun kapalı formül, sağ sütun {fmt(D.mc.trials)} rastgele deneme (ayrı kodla).
              İkisi aynı yerde buluşuyor.
            </>
          }
        >
          <table className="dogtab">
            <thead>
              <tr>
                <th />
                <th>formül</th>
                <th>deneme</th>
                <th>fark</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>açık parça</td>
                <td>{f1(bazB.ort)}</td>
                <td>{fmt(mc.acik_ort)}</td>
                <td>{f1(Math.abs(bazB.ort - mc.acik_ort))}</td>
              </tr>
              <tr>
                <td>%80 aralık</td>
                <td>
                  {bazB
                    .aralik(80)
                    .map((v) => fmt(v))
                    .join(' – ')}
                </td>
                <td>
                  {fmt(mc.acik_p10)} – {fmt(mc.acik_p90)}
                </td>
                <td>—</td>
              </tr>
              <tr>
                <td>ek maliyet</td>
                <td>{mM(bazB.mal / 1e6)}</td>
                <td>{mM(mc.ek_ort)}</td>
                <td>
                  %{vir(((100 * Math.abs(bazB.mal / 1e6 - mc.ek_ort)) / mc.ek_ort).toFixed(1))}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="hint" style={{ marginTop: 10 }}>
            Deneme sayısı arttıkça ortalamanın belirsizliği <span className="mono">σ/√n</span> ile
            daralır: {fmt(D.mc.trials)} denemede ±{vir((14.5 / Math.sqrt(D.mc.trials)).toFixed(2))}{' '}
            parça. Daha fazlası ekrana ölçülebilir bir şey eklemiyor.
          </div>
        </Kart>
      </Izgara>
    </>
  );
}
