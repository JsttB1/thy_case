/**
 * 5 · SENARYO — kriz simülatörü.
 *
 * Tek cümlelik model: her kriz ya stoğun dayanma süresini (TTS) kısaltır ya da
 * tedarik süresini (TTR) uzatır. Öyleyse kriz = PARAMETRE ŞOKU; stres testi ayrı
 * bir model değil, projeksiyon motorunun üstünde bir düğmedir.
 *
 * Sayfanın iki iddiası var:
 *  1. KRİZİN BİR ŞEKLİ VARDIR. Yedi şok ekseni yedi kaydırıcı olarak dizilince
 *     "lojistik krizi" ile "talep patlaması" ekranda birbirine benziyordu; radar
 *     poligonu (şok gülü) krizin parmak izini verir.
 *  2. KRİZ ZAMANA YAYILIR. Şok anlık değil: tırmanma → plato → toparlanma
 *     profiliyle HER AY 5.000 parça yeniden hesaplanır. 3D arazi bu takvimin
 *     kategori × ay yükseklik alanıdır ve "duvara kaçıncı ayda çarpıyoruz"
 *     sorusunu cevaplar.
 *
 * MİMARİ KURAL: hesap engine/'de, çizim burada. Bu dosyada yeni bir sayı
 * TÜRETİLMEZ — hepsi senaryoHesap / krizTakvim / tahsis / alarmlar'dan gelir.
 */
import { Component, Suspense, lazy, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { D, K, LK, PIDX } from '@/data/payload';
import {
  senaryoHesap,
  ttsDagilim,
  marjDagilim,
  PRESETS,
  BAZ_CFG,
  CFG_ALAN,
  TTS_ET,
  MARJ_ET,
  MARJ_KIRMIZI,
  type SenaryoCfg,
} from '@/engine/senaryo';
import { PROFILLER, krizTakvim } from '@/engine/kriz';
import { tahsis, duyarlilik, acikMaliyeti } from '@/engine/tahsis';
import { fmt, f1, mM, mUsd, vir } from '@/engine/format';
import { CC as C, S, tint } from '@/design/renkler';
import { useStore } from '@/app/store';
import { Bolum, Kart, Izgara, Cip, Yigin, Rozet } from '@/components/temel';
import Grafik from '@/components/Grafik';
import Belirsizlik from './senaryo/Belirsizlik';
import SokGulu from './senaryo/SokGulu';
import { araziKur, rampaHex } from './senaryo/araziGeo';
import { alarmlar, TIP_AD, type Alarm } from './senaryo/alarmlar';
import '@/design/senaryo.css';

const Arazi = lazy(() => import('./senaryo/Arazi'));

/* --------------------------------------------------------- 3D güvenlik ağı
   Her sahnenin KENDİ sınırı olmalı: tek ortak sınır bütün sekmeleri birlikte
   düşürür. WebGL açılmazsa arazi yerine aynı sayıları veren düz liste çıkar ve
   sayfanın bütün sayıları çalışmaya devam eder. */
class SahneKalkani extends Component<{ children: ReactNode; yedek: ReactNode }, { hata: boolean }> {
  state = { hata: false };
  static getDerivedStateFromError() {
    return { hata: true };
  }
  render() {
    return this.state.hata ? this.props.yedek : this.props.children;
  }
}

/* -------------------------------------------------------------- küçük parçalar */

function Stat({ l, v, d, ton = '' }: { l: string; v: string; d: ReactNode; ton?: string }) {
  return (
    <div className={'kpi ' + ton} style={{ padding: '12px 14px' }}>
      <div className="l">{l}</div>
      <div className="v" style={{ fontSize: '1.3rem' }}>
        {v}
      </div>
      <div className="d">{d}</div>
    </div>
  );
}

/** baz ↔ senaryo farkı — işaret ve renk tek yerden. */
function Delta({ v, bicim = fmt }: { v: number; bicim?: (n: number) => string }) {
  const s = Math.abs(v) < 1e-9 ? 'sifir' : v > 0 ? 'art' : 'azal';
  return (
    <span className={'delta ' + s}>
      {v > 0 ? '+' : v < 0 ? '−' : '±'}
      {bicim(Math.abs(v))}
    </span>
  );
}

const kaydir = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const HEDEF_ID: Record<NonNullable<Alarm['hedef']>, string> = {
  takvim: 'sen-takvim',
  arazi: 'sen-arazi',
  dagilim: 'sen-dagilim',
  belirsizlik: 'sen-belirsizlik',
  roi: 'sen-roi',
};

/* ------------------------------------------------------------------- sayfa */

export default function Senaryo() {
  const sc = useStore((s) => s.senaryo);
  const params = useStore((s) => s.params);
  const profilK = useStore((s) => s.profil);
  const ayHam = useStore((s) => s.ay);
  const senaryoDegis = useStore((s) => s.senaryoDegis);
  const profilSec = useStore((s) => s.profilSec);
  const aySec = useStore((s) => s.aySec);
  const parcaAc = useStore((s) => s.parcaAc);
  const watchAc = useStore((s) => s.watchAc);

  const [mod, setMod] = useState<'kategori' | 'marj'>('kategori');
  const [dagMod, setDagMod] = useState<'marj' | 'tts'>('marj');
  const [uzerinde, setUzerinde] = useState<number | null>(null);
  const zoomRef = useRef<((k: number) => void) | null>(null);
  const satirRef = useRef<(HTMLSpanElement | null)[]>([]);
  const ayRef = useRef<(HTMLSpanElement | null)[]>([]);

  const cfg: SenaryoCfg = sc;
  const profil = PROFILLER[profilK] ?? PROFILLER.kademeli;

  /* ------------------------------------------------- hesap sırası (hepsi memo) */
  const BAZ = useMemo(() => senaryoHesap(BAZ_CFG, params), [params]);
  const r = useMemo(() => senaryoHesap(cfg, params), [cfg, params]);
  const tk = useMemo(() => krizTakvim(cfg, profil, params), [cfg, profil, params]);
  // profil değişince ay taşabilir (ani darbe 10 ay, uzun sürükleyen 27 ay)
  const ay = Math.min(ayHam, tk.aylar.length - 1);
  const ayR = tk.aylar[ay];
  const alrm = useMemo(() => alarmlar(cfg, r, BAZ, tk, params), [cfg, r, BAZ, tk, params]);
  const th = useMemo(() => tahsis(cfg, params), [cfg, params]);
  const dy = useMemo(() => duyarlilik(cfg, acikMaliyeti(params)), [cfg, params]);
  const arazi = useMemo(
    () =>
      mod === 'kategori'
        ? araziKur(
            tk.aylar.map((a) => a.r.byKat),
            LK.sub,
            'kategori',
            true,
          )
        : araziKur(
            tk.aylar.map((a) => a.marj),
            MARJ_ET,
            'marj',
            false,
            MARJ_KIRMIZI,
          ),
    [tk, mod],
  );

  /* -------------------------------------------------- preset ↔ elle değişiklik */
  const preset = PRESETS[sc.preset];
  const degismis = !!preset && CFG_ALAN.some((k) => cfg[k] !== preset[k]);

  const presetSec = (k: string) => {
    const p = PRESETS[k];
    if (!p) return;
    const y: Record<string, unknown> = { preset: k };
    CFG_ALAN.forEach((alan) => {
      y[alan] = p[alan];
    });
    senaryoDegis(y as Partial<SenaryoCfg & { preset: string }>);
  };

  /**
   * Gül sürüklenince preset ETİKETİ KORUNUR ve alt küme çarpanları silinmez.
   * (Eski davranış: her elle değişiklik senaryoyu "özel"e düşürüp
   * yeniDem/kuculDem'i sıfırlıyordu — motor krizini elle sertleştirmek
   * imkânsızdı.) Geri dönüş iki düğmede: ↺ preset ve ↺ baz.
   */
  const elleDegis = (y: Partial<SenaryoCfg>) => senaryoDegis(y);

  const hucre = uzerinde != null ? arazi.hucreler[uzerinde] : null;

  /* ---------------------------------------------------------- takvim grafiği */
  const takvimCfg = useMemo<ChartConfiguration>(
    () =>
      ({
        type: 'line',
        data: {
          labels: tk.aylar.map((a) => (a.ay === 0 ? 'baz' : String(a.ay))),
          datasets: [
            {
              type: 'line',
              label: 'Kırmızı parça',
              data: tk.aylar.map((a) => a.r.kir),
              borderColor: C.kritik,
              backgroundColor: tint(C.kritik, 0.16),
              fill: true,
              pointRadius: (ct: { dataIndex: number }) => (ct.dataIndex === ay ? 5 : 2),
              pointBackgroundColor: C.kritik,
              borderWidth: 2,
              tension: 0.25,
            },
            {
              type: 'line',
              label: 'Kapatma maliyeti ($M)',
              yAxisID: 'y1',
              data: tk.aylar.map((a) => a.r.kap / 1e6),
              borderColor: C.uyari,
              backgroundColor: C.uyari,
              borderDash: [5, 4],
              pointRadius: 0,
              borderWidth: 1.8,
              tension: 0.25,
            },
          ],
        },
        options: {
          animation: { duration: 220 },
          plugins: {
            legend: { labels: { boxWidth: 9, font: { size: 10 } } },
            tooltip: {
              callbacks: {
                title: (it) => (it[0].label === 'baz' ? 'kriz öncesi' : it[0].label + '. ay'),
                label: (c) =>
                  c.datasetIndex
                    ? ` kapatma ${mM(Number(c.parsed.y))}`
                    : ` ${fmt(Number(c.parsed.y))} kırmızı parça`,
              },
            },
          },
          scales: {
            x: { title: { display: true, text: 'kriz ayı (0 = kriz öncesi)' } },
            y: { beginAtZero: true, title: { display: true, text: 'kırmızı parça' } },
            y1: {
              position: 'right',
              beginAtZero: true,
              grid: { drawOnChartArea: false },
              ticks: { callback: (v) => '$' + v + 'M' },
            },
          },
        },
      }) as ChartConfiguration,
    [tk, ay],
  );

  /* ---------------------------------------------- operasyonel önem dağılımı */
  const krCfg = useMemo<ChartConfiguration>(
    () =>
      ({
        type: 'bar',
        data: {
          labels: LK.kr,
          datasets: [
            {
              label: 'Baz durum',
              data: BAZ.byKr,
              backgroundColor: tint(C.gri, 0.36),
              borderRadius: 4,
            },
            {
              label: ay === 0 ? 'Kriz öncesi' : ay + '. ay',
              data: ayR.r.byKr,
              backgroundColor: tint(C.kritik, 0.72),
              borderRadius: 4,
            },
          ],
        },
        options: {
          animation: { duration: 220 },
          plugins: { legend: { labels: { boxWidth: 9, font: { size: 10 } } } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      }) as ChartConfiguration,
    [BAZ, ayR, ay],
  );

  /* ------------------------------------------------------ dayanıklılık dağılımı */
  const dagCfg = useMemo<ChartConfiguration>(() => {
    const marjMi = dagMod === 'marj';
    const et = marjMi ? MARJ_ET : TTS_ET;
    const baz = marjMi ? marjDagilim(BAZ_CFG, params) : ttsDagilim(BAZ_CFG);
    const sen = marjMi ? marjDagilim(cfg, params) : ttsDagilim(cfg);
    return {
      type: 'bar',
      data: {
        labels: et,
        datasets: [
          {
            label: 'Baz durum',
            data: baz,
            backgroundColor: tint(C.gri, 0.34),
            borderColor: C.gri,
            borderWidth: 1,
            borderSkipped: false,
          },
          {
            label: 'Senaryo',
            data: sen,
            hidden: sc.preset === 'baz' && !degismis,
            backgroundColor: et.map((_, i) =>
              marjMi && i < MARJ_KIRMIZI ? tint(C.kritik, 0.6) : tint(S.s3, 0.55),
            ),
            borderColor: et.map((_, i) => (marjMi && i < MARJ_KIRMIZI ? C.kritik : S.s2)),
            borderWidth: 1,
            borderSkipped: false,
          },
        ],
      },
      options: {
        animation: { duration: 200 },
        plugins: {
          legend: { labels: { boxWidth: 9, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              title: (it) => it[0].label + ' gün',
              label: (c) => ` ${c.dataset.label}: ${fmt(Number(c.parsed.y))} parça`,
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: marjMi
                ? 'emniyet marjı = dayanma süresi − tedarik süresi (gün)'
                : 'eldeki stokla dayanma süresi (gün)',
            },
            ticks: { font: { size: 9 } },
          },
          y: { beginAtZero: true, title: { display: true, text: 'parça sayısı' } },
        },
      },
    } as ChartConfiguration;
  }, [cfg, params, dagMod, sc.preset, degismis]);

  /* ------------------------------------------------------------ tornado */
  const tornadoCfg = useMemo<ChartConfiguration>(
    () =>
      ({
        type: 'bar',
        data: {
          labels: dy.satir.map((s) => s.etiket),
          datasets: [
            {
              label: 'aralık ($M)',
              data: dy.satir.map((s) => [s.dusuk, s.yuksek]),
              backgroundColor: S.s4,
              borderColor: S.s2,
              borderWidth: 1.2,
              borderRadius: 3,
              barPercentage: 0.6,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          animation: { duration: 220 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => {
                  const v = c.raw as number[];
                  return ` ${mM(v[0])} – ${mM(v[1])}  ·  seçili senaryo ${mM(dy.baz)}`;
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: '2033 açığını kapatma maliyeti · seçili senaryo: ' + mM(dy.baz),
              },
              ticks: { callback: (v) => '$' + v + 'M' },
            },
            y: { ticks: { font: { size: 9.5 }, autoSkip: false } },
          },
        },
      }) as ChartConfiguration,
    [dy],
  );

  /* ------------------------------------------------------------ tahsis eğrisi */
  const tahsisCfg = useMemo<ChartConfiguration>(
    () =>
      ({
        type: 'line',
        data: {
          datasets: [
            {
              type: 'line',
              label: 'Risk azaltım kazanımı (%) · canlı',
              data: th.butce.map((b, i) => ({ x: b, y: th.kazanc[i] })),
              borderColor: C.mor,
              backgroundColor: C.mor,
              pointRadius: 0,
              borderWidth: 2.2,
              tension: 0.12,
            },
            {
              type: 'line',
              label: 'Kapanan açık PN · canlı',
              yAxisID: 'y1',
              data: th.butce.map((b, i) => ({ x: b, y: th.kapanan[i] })),
              borderColor: C.iyi,
              backgroundColor: C.iyi,
              pointRadius: 0,
              borderWidth: 2,
              tension: 0.12,
            },
            {
              type: 'line',
              label: 'Build zamanı referans (%)',
              data: D.opt.butce.map((b, i) => ({ x: b, y: D.opt.kazanc[i] })),
              borderColor: C.dim,
              backgroundColor: C.dim,
              pointRadius: 0,
              borderWidth: 1.3,
              borderDash: [4, 4],
              tension: 0.12,
            },
          ],
        },
        options: {
          animation: { duration: 220 },
          plugins: {
            legend: { labels: { boxWidth: 9, font: { size: 9.5 } } },
            tooltip: {
              callbacks: {
                title: (it) => 'bütçe ' + mM(Number(it[0].parsed.x)),
                label: (c) =>
                  ` ${c.dataset.label}: ${
                    c.datasetIndex === 1
                      ? fmt(Number(c.parsed.y)) + ' PN'
                      : '%' + f1(Number(c.parsed.y))
                  }`,
              },
            },
          },
          scales: {
            x: {
              type: 'linear',
              title: { display: true, text: 'kümülatif bütçe ($M)' },
              ticks: { callback: (v) => '$' + v + 'M' },
            },
            y: {
              beginAtZero: true,
              max: 102,
              title: { display: true, text: 'kazanım (%)' },
              ticks: { callback: (v) => '%' + v },
            },
            y1: {
              position: 'right',
              beginAtZero: true,
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'kapanan PN' },
            },
          },
        },
      }) as ChartConfiguration,
    [th],
  );

  const notMetni = preset ? preset.not : 'Özel senaryo, radar grafik üzerinden tanımlandı.';
  const maksKir = Math.max(1, tk.zirveKir);
  /* Kur / havuz / atölye şokları parayı ve kanalı değiştirir ama TTS'e de TTR'ye
     de dokunmaz: kırmızı sayısı hiç kımıldamaz. O senaryolarda "zirve ayı" diye
     bir şey yok — işaretlemek yanıltıcı olurdu. */
  const krizVar = tk.zirveKir > tk.bazKir;

  return (
    <>
      <Bolum
        baslik="Kriz Simülatörü"
        aciklama="Her kriz ya stoğun dayanma süresini kısaltır ya da tedarik süresini uzatır."
      />

      {/* ---------------------------------------------------------- SEN-01 */}
      <Izgara tip="g21" stil={{ scrollMarginTop: 70 }}>
        <Kart sinif="flush" stil={{ padding: 0, overflow: 'hidden' }} baslik={undefined}>
          <div id="sen-arazi" style={{ padding: '16px 18px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3>Kriz Arazisi</h3>
              <span className="ctl" style={{ margin: 0, marginLeft: 'auto' }}>
                <Cip acik={mod === 'kategori'} onClick={() => setMod('kategori')}>
                  kategori × ay
                </Cip>
                <Cip acik={mod === 'marj'} onClick={() => setMod('marj')}>
                  emniyet marjı × ay
                </Cip>
              </span>
            </div>
            <div className="hint">
              {mod === 'kategori'
                ? 'Yükseklik = o ayda o kategoride kırmızıya düşen parça sayısı. Çubuğa tıklayınca takvim o aya gider.'
                : 'Yükseklik = o ayda o marj kovasındaki parça sayısı. Öndeki dört kova negatif marj — kırmızı liste.'}
            </div>
          </div>

          <div style={{ padding: '0 18px 16px' }}>
            <SahneKalkani
              yedek={
                <div className="arazi-yedek">
                  <b>3D katmanı açılamadı (WebGL yok).</b>
                  <span>Aynı sayılar burada — sayfanın geri kalanı çalışmaya devam ediyor.</span>
                  <table>
                    <tbody>
                      {arazi.satirEt.slice(0, 8).map((e, z) => (
                        <tr key={e + z}>
                          <td>{e}</td>
                          <td>
                            {fmt(arazi.hucreler.find((h) => h.ix === ay && h.iz === z)?.v ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            >
              <Suspense fallback={<div className="arazi-yuk">arazi yükleniyor…</div>}>
                <div className="arazi">
                  <Arazi
                    a={arazi}
                    ay={ay}
                    onUzerinde={setUzerinde}
                    onSec={aySec}
                    satirRef={satirRef}
                    ayRef={ayRef}
                    zoomKayit={(f) => {
                      zoomRef.current = f;
                    }}
                  />
                  <div className="arazi-et">
                    {arazi.satirEt.slice(0, 8).map((e, z) => (
                      <span
                        key={'s' + z + e}
                        ref={(el) => {
                          satirRef.current[z] = el;
                        }}
                      >
                        {e}
                      </span>
                    ))}
                    {arazi.ayEt.map((e, x) => (
                      <span
                        key={'a' + x}
                        className={'ay' + (x === ay ? ' on' : '')}
                        ref={(el) => {
                          ayRef.current[x] = el;
                        }}
                      >
                        {e}
                      </span>
                    ))}
                  </div>

                  <div className="arazi-hud">
                    <div className="arazi-kut">
                      <b>
                        {hucre
                          ? `${arazi.satirEt[hucre.iz]} · ${arazi.ayEt[hucre.ix]}`
                          : `${arazi.ayEt[ay]} · ${fmt(ayR.r.kir)} kırmızı`}
                      </b>
                      {hucre
                        ? `${fmt(hucre.v)} parça · zirvenin %${Math.round(100 * hucre.t)}'i`
                        : `şiddet %${Math.round(100 * ayR.w)} · duvar ${tk.duvarAy}. ay`}
                    </div>
                    <div className="arazi-kut arazi-efsane">
                      <span>az</span>
                      <i
                        className="serit"
                        style={{
                          background: `linear-gradient(90deg, ${rampaHex(0)}, ${rampaHex(
                            0.5,
                          )}, ${rampaHex(1)})`,
                        }}
                      />
                      <span>{fmt(arazi.maks)}</span>
                    </div>
                  </div>

                  <div className="arazi-zoom">
                    <button type="button" title="yakınlaş" onClick={() => zoomRef.current?.(0.82)}>
                      +
                    </button>
                    <button type="button" title="uzaklaş" onClick={() => zoomRef.current?.(1.22)}>
                      −
                    </button>
                  </div>

                  <i className="kose sol-ust" />
                  <i className="kose sag-ust" />
                  <i className="kose sol-alt" />
                  <i className="kose sag-alt" />
                </div>
              </Suspense>
            </SahneKalkani>
          </div>
        </Kart>

        <Kart
          baslik={
            <h3>
              Radar Grafik Dağılımı{degismis && <span style={{ color: C.dim }}> · değiştirilmiş</span>}
            </h3>
          }
          sag={
            <span className="ctl" style={{ margin: 0 }}>
              {degismis && <Cip onClick={() => presetSec(sc.preset)}>↺ preset</Cip>}
              <Cip onClick={() => presetSec('baz')}>↺ baz</Cip>
            </span>
          }
          ipucu={notMetni}
        >
          <SokGulu cfg={cfg} referans={degismis && preset ? preset : null} onDegis={elleDegis} />

          <div className="ctl" style={{ margin: '14px 0 0' }}>
            {Object.entries(PRESETS).map(([k, p]) => (
              <Cip key={k} acik={sc.preset === k} baslik={p.not} onClick={() => presetSec(k)}>
                {p.ad}
              </Cip>
            ))}
          </div>

          <div className="ctl" style={{ margin: '10px 0 0' }}>
            <span className="note">alt küme</span>
            <Cip
              acik={!!cfg.yeniDem}
              baslik="Yeni nesil modellere bağlı parçaların talebi 1,5 kat"
              onClick={() => elleDegis({ yeniDem: cfg.yeniDem ? 0 : 1.5 })}
            >
              yeni nesil ×1,5
            </Cip>
            <Cip
              acik={!!cfg.kuculDem}
              baslik="Küçülen 4 klasik modele bağlı parçaların talebi 1,25 kat"
              onClick={() => elleDegis({ kuculDem: cfg.kuculDem ? 0 : 1.25 })}
            >
              phase-out ×1,25
            </Cip>
            <Cip
              acik={cfg.disOnly}
              baslik="TAT şoku yalnız dışa bağımlı parçalara uygulansın"
              onClick={() => elleDegis({ disOnly: !cfg.disOnly })}
            >
              yalnız dış kanal
            </Cip>
          </div>

          <div className="sl" style={{ marginTop: 14, marginBottom: 4 }}>
            <label>
              Filo büyüme bandında konum{' '}
              <b>
                {cfg.filoUc === 0
                  ? 'motor senaryosu'
                  : (cfg.filoUc < 0 ? 'alt uca ' : 'üst uca ') +
                    '%' +
                    Math.round(Math.abs(cfg.filoUc) * 100)}
              </b>
            </label>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.1}
              value={cfg.filoUc}
              onChange={(e) => elleDegis({ filoUc: +e.target.value })}
            />
          </div>
          <div className="hint" style={{ marginTop: 0 }}>
            Kriz şoku değil, 2033 varsayımı: radar grafikte yok, takvimde ölçeklenmez.
          </div>
        </Kart>
      </Izgara>

      {/* ---------------------------------------------------------- SEN-02 */}
      <div id="sen-takvim" style={{ scrollMarginTop: 70 }}>
        <Bolum
          baslik="Kriz Takvimi"
          aciklama="Tırmanma → plato → toparlanma. Bir aya tıklayın, sayfanın tamamı o aya döner."
        />
        <Yigin>
          <Kart
            baslik="Şiddet Profili"
            sag={
              <span className="ctl" style={{ margin: 0 }}>
                {Object.entries(PROFILLER).map(([k, p]) => (
                  <Cip key={k} acik={profilK === k} baslik={p.not} onClick={() => profilSec(k)}>
                    {p.ad}
                  </Cip>
                ))}
              </span>
            }
            ipucu={
              krizVar
                ? `Yükseklik ve renk = o ayki kırmızı parça sayısı, zirveye oranla. Zirve ${fmt(tk.zirveKir)} parça, ▼ ile işaretli.`
                : `Yükseklik ve renk = o ayki kırmızı parça sayısı, zirveye oranla. Bu senaryo kırmızıyı oynatmıyor: her ay ${fmt(tk.bazKir)}, o yüzden şerit dolu ve düz.`
            }
          >
            <div className="ktak">
              {tk.aylar.map((a) => (
                <button
                  key={a.ay}
                  type="button"
                  className={
                    (a.ay === ay ? 'on ' : '') + (krizVar && a.ay === tk.duvarAy ? 'duvar' : '')
                  }
                  title={`${a.ay === 0 ? 'kriz öncesi' : a.ay + '. ay'} · ${fmt(a.r.kir)} kırmızı · şiddet %${Math.round(100 * a.w)}`}
                  onClick={() => aySec(a.ay)}
                >
                  {/* Ölçek ZİRVEYE göre normalize: en yüksek ay tanım gereği
                      %100 ve rampanın kırmızı ucunda. Kur / havuz / atölye
                      şokları TTS'e de TTR'ye de dokunmadığından o senaryolarda
                      her ay bazla aynı çıkar (zirve = baz) ve şerit dolu, düz
                      bir blok olur — kusur değil, "bu kriz kırmızıyı oynatmıyor"
                      demenin şeklidir. Kart ipucu bunu yazıyor. */}
                  <i
                    style={{
                      height: Math.max(2, (100 * a.r.kir) / maksKir) + '%',
                      background: rampaHex(a.r.kir / maksKir),
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="ktak-et">
              {tk.aylar.map((a) => (
                <span key={a.ay} className={a.ay === ay ? 'on' : ''}>
                  {a.ay === 0 ? 'baz' : a.ay}
                </span>
              ))}
            </div>

            <div className="grid g4" style={{ margin: '16px 0 0' }}>
              <Stat
                l="Zirve kırmızı"
                v={fmt(tk.zirveKir)}
                ton="red"
                d={
                  <>
                    baz {fmt(tk.bazKir)} · <Delta v={tk.zirveKir - tk.bazKir} />
                  </>
                }
              />
              {/* Kırmızı hiç oynamıyorsa duvar da yok: "0. ay" yazmak uyduruk
                  bir zirve icat ediyordu. */}
              <Stat
                l="Duvara çarpma"
                v={krizVar ? tk.duvarAy + '. ay' : '—'}
                d={
                  !krizVar
                    ? 'bu senaryo kırmızıyı oynatmıyor'
                    : tk.toparlanmaAy === -1
                      ? 'takvim sonunda baz seviyeye dönmüyor'
                      : `${tk.toparlanmaAy}. ayda baz seviyeye dönüyor`
                }
                ton={krizVar && tk.toparlanmaAy === -1 ? 'red' : ''}
              />
              <Stat
                l="Zirve açık pozisyon"
                v={fmt(tk.zirveAcik)}
                d={`zirve maruziyet ${mM(tk.zirveKap / 1e6)}`}
                ton="amber"
              />
              <Stat l="Kriz yükü" v={fmt(tk.kirmiziAy)} d="parça·ay — süre de maliyettir" />
            </div>
            <div className="hint" style={{ marginTop: 11, marginBottom: 0 }}>
              Kapatma maliyeti bir <b>stok</b> büyüklüğü, akış değil: kümülatif dolar raporlanmaz.
            </div>
          </Kart>
        </Yigin>
      </div>

      {/* ---------------------------------------------------------- SEN-03 */}
      <Bolum baslik={`Seçili Ay: ${ay === 0 ? 'Kriz Öncesi' : ay + '. Ay'}`} />
      <Izgara tip="g4">
        <Stat
          l="Kırmızı parça"
          v={fmt(ayR.r.kir)}
          ton={ayR.r.kir > BAZ.kir ? 'red' : ''}
          d={
            <>
              baz {fmt(BAZ.kir)} · <Delta v={ayR.r.kir - BAZ.kir} />
            </>
          }
        />
        <Stat
          l="AOG kritik kırmızı"
          v={fmt(ayR.r.kirAog)}
          ton={ayR.r.kirAog > BAZ.kirAog ? 'red' : ''}
          d={
            <>
              baz {fmt(BAZ.kirAog)} · <Delta v={ayR.r.kirAog - BAZ.kirAog} />
            </>
          }
        />
        <Stat
          l="2033 MIN altında PN"
          v={fmt(ayR.r.acik)}
          ton="amber"
          d={
            <>
              baz {fmt(BAZ.acik)} · <Delta v={ayR.r.acik - BAZ.acik} />
            </>
          }
        />
        <Stat
          l="Kapatma faturası"
          v={mM(ayR.r.kap / 1e6)}
          ton="amber"
          d={
            <>
              baz {mM(BAZ.kap / 1e6)} ·{' '}
              <Delta v={(ayR.r.kap - BAZ.kap) / 1e6} bicim={(n) => '$' + f1(n) + 'M'} />
            </>
          }
        />
      </Izgara>

      {/* ---------------------------------------------------------- SEN-04 */}
      <Bolum
        baslik="Kriz Alarmları"
        aciklama="Alarm bir eşik aşımıdır: koşulu sağlanmayan listeye girmez."
      />
      <Yigin>
        <div className="alm">
          {alrm.map((a) => (
            <div key={a.id} className={'alm-k ' + a.tip}>
              <div className="alm-ust">
                <span className="alm-tip">{TIP_AD[a.tip]}</span>
                <span className="alm-kod">{a.kod}</span>
              </div>
              <h4>{a.baslik}</h4>
              <p>{a.metin}</p>
              <div className="alm-alt">
                {a.eylem && (
                  <Cip
                    onClick={() => {
                      if (a.flag) watchAc({ flag: a.flag });
                      else if (a.hedef) kaydir(HEDEF_ID[a.hedef]);
                    }}
                  >
                    {a.eylem}
                  </Cip>
                )}
                <span className="guv">
                  güven
                  <span className="ray">
                    <i style={{ width: a.guven + '%' }} />
                  </span>
                  %{a.guven}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 10 }}>
          <b>Dürüstlük notu.</b> Cümle kalıpları kodda sabit, <b>sayıların hepsi</b> motordan canlı
          gelir — dil modeli çıktısı değil.
        </div>
      </Yigin>

      {/* ---------------------------------------------------------- SEN-05 */}
      <Izgara tip="g21" stil={{ marginTop: 14 }}>
        <Kart
          baslik="Kırmızı ve Fatura"
          ipucu="Sol eksen kırmızı parça, sağ eksen kapatma maliyeti. Noktaya tıklayın."
        >
          <Grafik cfg={takvimCfg} h={250} onSec={(i) => aySec(i)} />
        </Kart>
        <Kart
          baslik="Operasyonel Önem Sınıfı"
          ipucu="Seçili ay ile baz durum yan yana. AOG kritik sütunundaki her artış 'yerde uçak' demek."
        >
          <Grafik cfg={krCfg} h={250} />
        </Kart>
      </Izgara>

      {/* ---------------------------------------------------------- SEN-06 */}
      <div id="sen-dagilim" style={{ scrollMarginTop: 70 }}>
        <Yigin stil={{ marginTop: 12 }}>
          <Kart
            baslik="Dayanıklılık Dağılımı"
            sag={
              <span className="ctl" style={{ margin: 0 }}>
                <Cip acik={dagMod === 'marj'} onClick={() => setDagMod('marj')}>
                  emniyet marjı
                </Cip>
                <Cip acik={dagMod === 'tts'} onClick={() => setDagMod('tts')}>
                  dayanma süresi
                </Cip>
              </span>
            }
            ipucu={
              dagMod === 'marj' ? (
                <>
                  Marj = dayanma süresi − tedarik süresi − tampon. İlk dört kova (negatif marj){' '}
                  <b>kırmızı listenin kendisi</b>: {fmt(r.kir)} parça.
                </>
              ) : (
                <>
                  Dayanma süresi = stok / talep; <b>tedarik süresini görmez</b>. Lojistik krizinde
                  bu dağılım kımıldamaz ama parçalar kırmızıya düşer.
                </>
              )
            }
          >
            <Grafik cfg={dagCfg} h={235} />
          </Kart>
        </Yigin>
      </div>

      {/* ---------------------------------------------------------- SEN-07 */}
      <div id="sen-belirsizlik" style={{ scrollMarginTop: 70 }}>
        <Bolum
          baslik="Belirsizlik Denemeleri"
          aciklama="Talep kesin bir sayı değil, bir dağılım: cevap da tek sayı değil, aralık."
        />
        <Belirsizlik cfg={cfg} preset={sc.preset} onPreset={presetSec} />
      </div>

      {/* ---------------------------------------------------------- SEN-08 */}
      <Izgara tip="g2" stil={{ marginTop: 14 }}>
        <Kart
          baslik="Duyarlılık"
          ipucu={
            <>
              Altı etken <b>seçili senaryonun etrafında</b> iki uca çekiliyor: kriz derinleştikçe
              baskın etken değişir.
            </>
          }
        >
          <Grafik cfg={tornadoCfg} h={220} />
        </Kart>
        <Kart
          baslik="Bütçe Önceliği"
          ipucu={
            <>
              {fmt(th.toplamAdim)} alım adımı para başına risk azalımına göre sıralı. Tamamı{' '}
              {mM(th.toplamButce)}, ama kazanımın %80'i <b>{mM(th.butce80)}</b> ile doluyor.
            </>
          }
        >
          <Grafik cfg={tahsisCfg} h={220} />
        </Kart>
      </Izgara>

      <Yigin stil={{ marginTop: 4 }}>
        <Kart
          baslik="Verim Sırasında İlk 10"
          ipucu="Verim sırasında ilk kez görülen parçalar. Satıra tıklayınca detay açılır."
        >
          <div className="tw" style={{ maxHeight: 300 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'default' }}>#</th>
                  <th style={{ cursor: 'default' }}>PN</th>
                  <th style={{ cursor: 'default' }}>Kategori</th>
                  <th style={{ cursor: 'default' }}>Operasyonel Önem</th>
                  <th className="n" style={{ cursor: 'default' }}>
                    Adet
                  </th>
                  <th className="n" style={{ cursor: 'default' }}>
                    Maliyet
                  </th>
                  <th className="n" style={{ cursor: 'default' }}>
                    Stok-out olasılığı
                  </th>
                </tr>
              </thead>
              <tbody>
                {th.ilk10.map((o, n) => (
                  <tr key={o.pn} style={{ cursor: 'pointer' }} onClick={() => parcaAc(o.i)}>
                    <td className="n">{n + 1}</td>
                    <td className="pn-link mono">PN-{o.pn}</td>
                    <td>{o.sub}</td>
                    <td>
                      {o.kr === 0 ? (
                        <Rozet tip="aog">AOG</Rozet>
                      ) : o.kr === 1 ? (
                        <Rozet tip="kri">KRİTİK</Rozet>
                      ) : (
                        <Rozet tip="nk">DEĞİL</Rozet>
                      )}
                    </td>
                    <td className="n">{fmt(o.adet)}</td>
                    <td className="n">{mUsd(o.maliyet)}</td>
                    <td className="n" style={{ color: o.stokout > 60 ? C.red : C.muted }}>
                      %{f1(o.stokout)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kart>
      </Yigin>

      {/* ---------------------------------------------------------- SEN-09 */}
      <div id="sen-roi" style={{ scrollMarginTop: 70 }}>
        <Yigin stil={{ marginTop: 14 }}>
          <Kart
            stil={{ borderColor: 'var(--st-teal-line)' }}
            baslik={<h3 style={{ color: C.teal }}>Kabiliyet Yatırımı</h3>}
            ipucu={
              <>
                {K.risk_listesi} parça kritik ve iç tamiri yok, dış tamire yılda{' '}
                <b>{mM(K.kab_bugun)}</b> gidiyor. İç tamir yılda{' '}
                <b style={{ color: C.teal }}>
                  {mM(K.kab_tasarruf)} tasarruf + {mM(K.kab_sermaye)} serbesti
                </b>{' '}
                getirir. Senaryodan bağımsız. <Rozet tip="warn">ÜÇLÜ</Rozet> = kritik + tamirsiz +
                geçmişsiz.{' '}
                <Cip
                  onClick={() => watchAc({ flag: 'R547' })}
                  stil={{ padding: '1px 9px', fontSize: '.66rem' }}
                >
                  tam listeyi aç
                </Cip>
              </>
            }
          >
            <div className="tw" style={{ maxHeight: 330 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ cursor: 'default' }}>#</th>
                    <th style={{ cursor: 'default' }}>PN</th>
                    <th style={{ cursor: 'default' }}>Kategori</th>
                    <th style={{ cursor: 'default' }}>Model</th>
                    <th className="n" style={{ cursor: 'default' }}>
                      Yıllık talep
                    </th>
                    <th className="n" style={{ cursor: 'default' }}>
                      Dış TAT
                    </th>
                    <th className="n" style={{ cursor: 'default' }}>
                      Dış harcama /yıl
                    </th>
                    <th className="n" style={{ cursor: 'default' }}>
                      Tasarruf /yıl
                    </th>
                    <th className="n" style={{ cursor: 'default' }}>
                      Serbesti
                    </th>
                    <th style={{ cursor: 'default' }} />
                  </tr>
                </thead>
                <tbody>
                  {D.roi.id.map((id, n) => (
                    <tr
                      key={id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => PIDX[id] != null && parcaAc(PIDX[id])}
                    >
                      <td className="n">{n + 1}</td>
                      <td className="pn-link mono">PN-{id}</td>
                      <td>{D.roi.sub[n]}</td>
                      <td>{D.roi.mdl[n]}</td>
                      <td className="n">{fmt(D.roi.t25[n])}</td>
                      <td className="n">{fmt(D.roi.tdis[n])} g</td>
                      <td className="n">{mUsd(D.roi.harcama[n])}</td>
                      <td className="n" style={{ color: C.teal }}>
                        {mUsd(D.roi.tasarruf[n])}
                      </td>
                      <td className="n">{mUsd(D.roi.sermaye[n])}</td>
                      <td>{D.roi.uclu[n] && <Rozet tip="warn">ÜÇLÜ</Rozet>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kart>
        </Yigin>
      </div>

      {/* --------------------------------------------------------- motor notu */}
      <Yigin stil={{ marginTop: 14 }}>
        <div className="motor-not">
          <b>Motor.</b> Kırmızı testi{' '}
          <span className="mono">TTS = SVC/λ&apos; &lt; TTR&apos; + tampon</span>, 2033 planı{' '}
          <span className="mono">MIN&apos; = ⌈μ&apos;⌉ + Poisson emniyet stoğu</span>. Kur yalnız $
          kalemleri ölçekler, havuz kaybı adetlere dokunmaz.{' '}
          <b>
            Nötr ayarda motor baz durumu birebir verir: {fmt(BAZ.kir)} kırmızı, {fmt(BAZ.kirAog)}{' '}
            AOG kritik.
          </b>{' '}
          BER eşiği <span className="mono">{vir(D.params.ber_esigi)}</span>, alarm tamponu{' '}
          {fmt(params.tampon)} gün — Öngörü sekmesinden ayarlanır.
        </div>
      </Yigin>
    </>
  );
}
