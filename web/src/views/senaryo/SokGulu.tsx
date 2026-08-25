/**
 * ŞOK GÜLÜ — krizin PARMAK İZİ.
 *
 * Yedi şok ekseni yedi kaydırıcı olarak dizilince "lojistik krizi" ile "talep
 * patlaması" ekranda birbirine benziyordu: iki farklı kriz, aynı üç çubuk.
 * Radar poligonu krizin ŞEKLİNİ verir — preset seçilince poligon o şekle morph
 * eder, elle sapıldığında kesikli referans poligonu ne kadar sapıldığını gösterir.
 *
 * `filoUc` BİLİNÇLİ OLARAK GÜLDE YOK: o bir kriz şoku değil, filo büyüme
 * bandındaki yapısal varsayım (kriz takviminde de ölçeklenmiyor). Gülün merkezi
 * "kriz yok" demek zorunda; iki yönlü bir eksen bu anlamı bozardı. Aynı şekilde
 * yeniDem / kuculDem / disOnly de gülde değil, altındaki çip satırında.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SenaryoCfg } from '@/engine/senaryo';
import { fmt } from '@/engine/format';

export interface Eksen {
  k: 'd' | 'l' | 'gumruk' | 'icKap' | 'havuz' | 'kur' | 's';
  /** gülün üstündeki kısa etiket */
  ad: string;
  /** okunuş listesindeki tam ad */
  tam: string;
  max: number;
  adim: number;
  bicim: (v: number) => string;
  ipucu: string;
}

export const EKSENLER: Eksen[] = [
  {
    k: 'd',
    ad: 'TALEP',
    tam: 'Talep şoku',
    max: 80,
    adim: 5,
    bicim: (v) => '+%' + fmt(v),
    ipucu: 'Yıllık talep büyür → λ artar, stok daha hızlı erir, TTS kısalır.',
  },
  {
    k: 'l',
    ad: 'TAT',
    tam: 'Tedarik / TAT şoku',
    max: 100,
    adim: 5,
    bicim: (v) => '+%' + fmt(v),
    ipucu:
      'Tamir ve satın alma süreleri ORANSAL uzar; alt çipten yalnız dış kanala kısıtlanabilir.',
  },
  {
    k: 'gumruk',
    ad: 'GÜMRÜK',
    tam: 'Gümrük / lojistik kuyruğu',
    max: 90,
    adim: 5,
    bicim: (v) => '+' + fmt(v) + ' g',
    ipucu:
      "Dış kanala TOPLAMSAL gecikme. Kısa TAT'lı parçayı yüzdece daha sert vurur; iç tamirli parçaya hiç dokunmaz.",
  },
  {
    k: 'icKap',
    ad: 'ATÖLYE',
    tam: 'İç tamir kapasitesi kaybı',
    max: 120,
    adim: 10,
    bicim: (v) => '+%' + fmt(v),
    ipucu:
      "Yalnız atölye kabiliyeti OLAN parçaların TAT'ını çarpar. Dış tamire bağımlı liste bu şoktan etkilenmez.",
  },
  {
    k: 'havuz',
    ad: 'HAVUZ',
    tam: 'Havuz erişim kaybı',
    max: 100,
    adim: 5,
    bicim: (v) => '−%' + fmt(v),
    ipucu: 'Adetleri DEĞİŞTİRMEZ, faturayı büyütür: değişim ücreti yerine liste fiyatı ödenir.',
  },
  {
    k: 'kur',
    ad: 'KUR',
    tam: 'Kur şoku',
    max: 100,
    adim: 5,
    bicim: (v) => '+%' + fmt(v),
    ipucu: 'Yalnız $ kalemleri ölçekler ve BER eşiğini kaydırır (nakit koruma modu).',
  },
  {
    k: 's',
    ad: 'SERVİS',
    tam: 'Servis hedefi sıkılaştırma',
    max: 20,
    adim: 1,
    bicim: (v) => '+' + fmt(v) + ' pp',
    ipucu: 'Emniyet stoğu hedefi yükselir → 2033 MIN seviyesi ve açık büyür.',
  },
];

/**
 * Adım oku. Metin karakteri (▴ ▾) DEĞİL çizim: o karakterler 9 px'te noktaya
 * dönüşüyor ve boyu yazı tipine göre değişiyor — ölçüldü. Çizgi kalınlığı
 * burada sabit, düğme küçülse de ok okunur kalıyor.
 */
function Ok({ yon }: { yon: 'ust' | 'alt' }) {
  return (
    <svg viewBox="0 0 10 6" aria-hidden="true">
      <path d={yon === 'ust' ? 'M1.4 4.6 L5 1.4 L8.6 4.6' : 'M1.4 1.4 L5 4.6 L8.6 1.4'} />
    </svg>
  );
}

/* ------------------------------------------------------------------ geometri */

/* viewBox gülün doğal piksel boyuna EŞİT (340): SVG içinde CSS font-size ve
   stroke-width kullanıcı birimidir ve viewBox ölçeğiyle çarpılır. 100 birimlik
   kutuda "9px" yazı ekranda 30px oluyordu (ölçüldü). */
const KUTU = 340;
const CX = 170;
const CY = 170;
const R = 112;
const ET_UZ = 24;
/** sıfırda poligon merkeze çökmesin diye taban yarıçapı */
const TABAN = 5;
const HALKA = [0.25, 0.5, 0.75, 1];
const N = EKSENLER.length;

const aci = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
const nokta = (i: number, r: number): [number, number] => [
  CX + Math.cos(aci(i)) * r,
  CY + Math.sin(aci(i)) * r,
];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const yaricap = (oran: number) => TABAN + clamp01(oran) * (R - TABAN);
const poli = (r: number[]) => r.map((v, i) => nokta(i, v).join(',')).join(' ');

/* -------------------------------------------------------------------- morph */

/**
 * framer-motion SVG `points` dizesini interpolate ETMEZ, CSS de edemez → elle
 * yazıldı. Sürükleme sırasında interpolasyon ATLANIR (imleçle poligon arasında
 * gecikme hissi olmamalı); preset değişiminde 280 ms easeOutCubic ile akar.
 */
function useMorph(hedef: number[], anlik: boolean): number[] {
  const [su, setSu] = useState(hedef);
  const suRef = useRef(hedef);
  const raf = useRef(0);

  useEffect(() => {
    if (anlik) {
      suRef.current = hedef;
      setSu(hedef);
      return;
    }
    const bas = suRef.current;
    if (bas.length !== hedef.length) {
      suRef.current = hedef;
      setSu(hedef);
      return;
    }
    const t0 = performance.now();
    const SURE = 280;
    const adim = () => {
      const u = Math.min(1, (performance.now() - t0) / SURE);
      const k = 1 - (1 - u) ** 3; // easeOutCubic
      const ara = bas.map((v, i) => v + (hedef[i] - v) * k);
      suRef.current = ara;
      setSu(ara);
      if (u < 1) raf.current = requestAnimationFrame(adim);
    };
    raf.current = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(raf.current);
    // hedef dizisi her karede yeniden kuruluyor → içeriğine göre bağlanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hedef.join(','), anlik]);

  return su;
}

/* --------------------------------------------------------------- bileşen */

export default function SokGulu({
  cfg,
  referans,
  onDegis,
}: {
  cfg: SenaryoCfg;
  /** kesikli referans poligonu — seçili preset'in değiştirilmemiş hâli */
  referans: SenaryoCfg | null;
  onDegis: (y: Partial<SenaryoCfg>) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [surukle, setSurukle] = useState<number | null>(null);
  const [vurgu, setVurgu] = useState<number | null>(null);

  const oranlar = EKSENLER.map((e) => clamp01((cfg[e.k] as number) / e.max));
  const hedefR = oranlar.map(yaricap);
  const suR = useMorph(hedefR, surukle !== null);
  const refR = referans
    ? EKSENLER.map((e) => yaricap(clamp01((referans[e.k] as number) / e.max)))
    : null;

  /** İmleç konumu eksene İZDÜŞÜRÜLÜR (dairesel değil, doğrusal). */
  const yaz = useCallback(
    (i: number, cx: number, cy: number) => {
      const el = svg.current;
      if (!el) return;
      const kutu = el.getBoundingClientRect();
      const sx = ((cx - kutu.left) / kutu.width) * KUTU;
      const sy = ((cy - kutu.top) / kutu.height) * KUTU;
      const a = aci(i);
      const izd = (sx - CX) * Math.cos(a) + (sy - CY) * Math.sin(a);
      const oran = clamp01((izd - TABAN) / (R - TABAN));
      const e = EKSENLER[i];
      onDegis({ [e.k]: Math.round((oran * e.max) / e.adim) * e.adim } as Partial<SenaryoCfg>);
    },
    [onDegis],
  );

  const tus = (i: number) => (ev: React.KeyboardEvent) => {
    const e = EKSENLER[i];
    const v = cfg[e.k] as number;
    let y: number | null = null;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') y = Math.min(e.max, v + e.adim);
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') y = Math.max(0, v - e.adim);
    else if (ev.key === 'Home') y = 0;
    else if (ev.key === 'End') y = e.max;
    if (y === null) return;
    ev.preventDefault();
    onDegis({ [e.k]: y } as Partial<SenaryoCfg>);
  };

  return (
    <div className="gul-kap">
      <div className="gul-sar">
        <svg
          ref={svg}
          className="gul"
          viewBox={`0 0 ${KUTU} ${KUTU}`}
          role="group"
          aria-label="Radar Grafik Dağılımı — yedi kriz ekseni"
        >
          {HALKA.map((h) => (
            <circle
              key={h}
              className={'ring' + (h === 1 ? ' dis' : '')}
              cx={CX}
              cy={CY}
              r={TABAN + h * (R - TABAN)}
            />
          ))}
          {EKSENLER.map((e, i) => {
            const [x, y] = nokta(i, R);
            return <line key={e.k} className="spoke" x1={CX} y1={CY} x2={x} y2={y} />;
          })}

          {refR && <polygon className="alan baz" points={poli(refR)} />}
          <polygon className="alan" points={poli(suR)} />

          {EKSENLER.map((e, i) => {
            const [x, y] = nokta(i, suR[i]);
            const [ex, ey] = nokta(i, R + ET_UZ);
            const v = cfg[e.k] as number;
            return (
              <g key={e.k}>
                <text className={'et' + (v ? ' on' : '')} x={ex} y={ey - 5}>
                  {e.ad}
                </text>
                {v > 0 && (
                  <text className="deg" x={ex} y={ey + 6}>
                    {e.bicim(v)}
                  </text>
                )}
                <circle className={'tut' + (vurgu === i ? ' tut-vur' : '')} cx={x} cy={y} r={5.5} />
                {/* görünmez dokunma dairesi: 6px'lik tutamak parmakla tutulamıyor */}
                <circle
                  className="tut-hit"
                  cx={x}
                  cy={y}
                  r={16}
                  tabIndex={0}
                  role="slider"
                  aria-label={e.tam}
                  aria-valuemin={0}
                  aria-valuemax={e.max}
                  aria-valuenow={v}
                  aria-valuetext={e.bicim(v)}
                  onKeyDown={tus(i)}
                  onFocus={() => setVurgu(i)}
                  onBlur={() => setVurgu((k) => (k === i ? null : k))}
                  onPointerEnter={() => setVurgu(i)}
                  onPointerLeave={() => surukle === null && setVurgu(null)}
                  onPointerDown={(ev) => {
                    ev.preventDefault();
                    (ev.target as Element).setPointerCapture(ev.pointerId);
                    setSurukle(i);
                    setVurgu(i);
                    yaz(i, ev.clientX, ev.clientY);
                  }}
                  onPointerMove={(ev) => {
                    if (surukle === i) yaz(i, ev.clientX, ev.clientY);
                  }}
                  onPointerUp={(ev) => {
                    (ev.target as Element).releasePointerCapture(ev.pointerId);
                    setSurukle(null);
                  }}
                />
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r={2} fill="var(--tx-4)" />
          <text className="merkez" x={CX} y={CY + 14}>
            kriz yok
          </text>
        </svg>

        {/* okunuş listesi — gülün kendisiyle AYNI diziden üretilir */}
        <div className="gul-oku">
          {EKSENLER.map((e, i) => {
            const v = cfg[e.k] as number;
            return (
              <div
                key={e.k}
                className={'gul-satir' + (vurgu === i ? ' on' : '') + (v ? '' : ' notr')}
                onPointerEnter={() => setVurgu(i)}
                onPointerLeave={() => setVurgu(null)}
              >
                <b>{e.ad}</b>
                {/* Adım düğmeleri: poligon tutamağını sürüklemek fareyle bile
                    zordu (6 px'lik daire), dokunmatikte iyice. Aynı ekseni
                    buradan tek tıkla e.adim kadar oynatmak mümkün — sürükleme
                    de yerinde duruyor, ikisi aynı `onDegis`e yazıyor. */}
                <span className="gul-ok">
                  <button
                    type="button"
                    aria-label={`${e.tam} artır`}
                    title={`${e.tam}: +${e.adim}`}
                    disabled={v >= e.max}
                    onClick={() =>
                      onDegis({ [e.k]: Math.min(e.max, v + e.adim) } as Partial<SenaryoCfg>)
                    }
                  >
                    <Ok yon="ust" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${e.tam} azalt`}
                    title={`${e.tam}: −${e.adim}`}
                    disabled={v <= 0}
                    onClick={() =>
                      onDegis({ [e.k]: Math.max(0, v - e.adim) } as Partial<SenaryoCfg>)
                    }
                  >
                    <Ok yon="alt" />
                  </button>
                </span>
                <span className="aciklama">{e.ipucu}</span>
                <span className="sayi">{v ? e.bicim(v) : '—'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
