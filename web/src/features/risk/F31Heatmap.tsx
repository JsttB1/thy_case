import { useMemo, useState, type FC } from 'react';
import { useDatum } from '../../data/useData';
import { sayi } from '../../lib/format';
import { Skeleton } from '../../ui';

/**
 * Beyaz → tk-red-wash → tk-red gradyanı.
 * Zemin koyulaştıkça metin beyaza döner; kontrast her hücrede korunur.
 */
function hucreStil(v: number, min: number, max: number) {
  if (!Number.isFinite(v) || max === min) {
    return { background: '#FFFFFF', color: '#5A6472' };
  }
  const t = Math.max(0, Math.min(1, (v - min) / (max - min)));

  // beyaz (255,255,255) → wash (253,238,240) → kırmızı (232,25,50)
  const [r, g, b] =
    t < 0.5
      ? [
          255 + (253 - 255) * (t / 0.5),
          255 + (238 - 255) * (t / 0.5),
          255 + (240 - 255) * (t / 0.5),
        ]
      : [
          253 + (232 - 253) * ((t - 0.5) / 0.5),
          238 + (25 - 238) * ((t - 0.5) / 0.5),
          240 + (50 - 240) * ((t - 0.5) / 0.5),
        ];

  return {
    background: `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`,
    color: t > 0.62 ? '#FFFFFF' : '#1A1D21',
  };
}

/** F31 — Isı haritası: alt kategori × kritiklik. Recharts'ta karşılığı yok, CSS grid. */
export const F31Heatmap: FC = () => {
  const { data, loading } = useDatum('risk');
  const [vurgu, setVurgu] = useState<string | null>(null);

  const siraliSatirlar = useMemo(() => {
    if (!data) return [];
    const { rows, vals } = data.heatmap;
    // en riskli kategori üstte — 26 satırı alfabetik bırakmak bulguyu gizler
    return rows
      .map((ad, i) => ({
        ad,
        vals: vals[i],
        ort: vals[i].reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / vals[i].length,
      }))
      .sort((a, b) => b.ort - a.ort);
  }, [data]);

  if (loading || !data) return <Skeleton className="h-72 w-full" />;

  const duz = data.heatmap.vals.flat().filter((v) => Number.isFinite(v) && v > 0);
  const min = Math.min(...duz);
  const max = Math.max(...duz);
  const cols = data.heatmap.cols;

  return (
    <div className="flex flex-1 flex-col">
      <div className="max-h-[380px] overflow-y-auto pr-1">
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: `minmax(120px, 1.6fr) repeat(${cols.length}, 1fr)` }}
        >
          <div className="sticky top-0 z-10 bg-tk-white pb-1" />
          {cols.map((c) => (
            <div
              key={c}
              className="sticky top-0 z-10 bg-tk-white pb-1 text-center text-2xs font-semibold uppercase leading-tight tracking-wide text-tk-slate"
            >
              {c}
            </div>
          ))}

          {siraliSatirlar.map((satir) => (
            <div key={satir.ad} className="contents">
              <div
                onMouseEnter={() => setVurgu(satir.ad)}
                onMouseLeave={() => setVurgu(null)}
                className={`flex items-center truncate pr-2 text-xs transition-colors duration-100 ${
                  vurgu === satir.ad ? 'font-semibold text-tk-ink' : 'text-tk-slate'
                }`}
                title={satir.ad}
              >
                {satir.ad}
              </div>
              {satir.vals.map((v, j) => {
                const stil = hucreStil(v, min, max);
                const bos = !Number.isFinite(v) || v === 0;
                return (
                  <div
                    key={j}
                    onMouseEnter={() => setVurgu(satir.ad)}
                    onMouseLeave={() => setVurgu(null)}
                    title={`${satir.ad} · ${cols[j]}: ${bos ? 'kayıt yok' : sayi(v, 1)}`}
                    className="tnum flex h-7 items-center justify-center rounded-[2px] border border-tk-line/60 text-xs font-medium"
                    style={bos ? { background: '#F4F6F8', color: '#B6BDC7' } : stil}
                  >
                    {bos ? '·' : sayi(v, 0)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-tk-line pt-3 text-xs text-tk-slate">
        <span>düşük risk</span>
        <span
          className="h-2.5 flex-1 rounded-[2px] border border-tk-line"
          style={{ background: 'linear-gradient(90deg,#FFFFFF,#FDEEF0,#E81932)' }}
        />
        <span>yüksek risk</span>
        <span className="ml-2">· gri hücre: o kırılımda kayıt yok</span>
      </div>
    </div>
  );
};

export default F31Heatmap;
