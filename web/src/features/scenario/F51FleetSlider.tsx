import { useMemo, type FC } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useData } from '../../data/useData';
import { adetKisa, para, sayi } from '../../lib/format';
import { filoCoz } from '../../lib/inventory';
import { eksenProps, izgaraProps, tooltipProps } from '../../lib/chartTheme';
import { useStore } from '../../store';
import { Skeleton } from '../../ui';
import Slider from '../../ui/Slider';

/** Eğri için sabit örnekleme — slider ara değerleri bu çizgiyi değiştirmez. */
const ORNEKLER = [1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000];

/**
 * F51 — Filo slider'ı 1.200 → 2.000.
 * İki çizgi arasındaki makas demonun aklında kalacak görseli:
 * doğrusal ölçekleme ile √λ ölçeklemesi arasındaki fark, dolar cinsinden.
 */
export const F51FleetSlider: FC = () => {
  const { data, loading } = useData(['pn', 'fleet'] as const);
  const filoBoyut = useStore((s) => s.senaryo.filoBoyut);
  const setSenaryo = useStore((s) => s.setSenaryo);

  const egri = useMemo(
    () =>
      data.pn
        ? ORNEKLER.map((n) => {
            const r = filoCoz(data.pn!, n);
            return {
              filo: n,
              karekok: Math.round(r.minKarekok),
              dogrusal: Math.round(r.minDogrusal),
            };
          })
        : [],
    [data.pn],
  );

  const simdi = useMemo(
    () => (data.pn ? filoCoz(data.pn, filoBoyut) : null),
    [data.pn, filoBoyut],
  );

  if (loading || !data.pn || !simdi) return <Skeleton className="h-80 w-full" />;

  const makas = simdi.sermayeDogrusal - simdi.sermayeKarekok;
  const makasAdet = simdi.minDogrusal - simdi.minKarekok;

  return (
    <div className="flex flex-1 flex-col">
      <Slider
        etiket="Filo büyüklüğü"
        min={1200}
        max={2000}
        adim={25}
        deger={filoBoyut}
        goster={`${sayi(filoBoyut)} uçak`}
        onChange={(v) => setSenaryo({ filoBoyut: v })}
        ipucu="k = (N − 1.200) ÷ 800 · rateN = rate₂₅ + (rate₃₃ − rate₂₅)·k"
      />

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="eyebrow">önerilen min stok</div>
          <div className="tnum font-display text-2xl font-extrabold leading-none tracking-[-.02em]">
            {sayi(Math.round(simdi.minKarekok))}
          </div>
          <div className="mt-0.5 text-xs text-tk-slate">adet</div>
        </div>
        <div>
          <div className="eyebrow">açık PN</div>
          <div className="tnum font-display text-2xl font-extrabold leading-none text-sig-crit tracking-[-.02em]">
            {sayi(simdi.acikPn)}
          </div>
          <div className="mt-0.5 text-xs text-tk-slate">min stoğun altında</div>
        </div>
        <div>
          <div className="eyebrow">bağlı sermaye</div>
          <div className="tnum font-display text-2xl font-extrabold leading-none tracking-[-.02em]">
            {para(simdi.sermayeKarekok)}
          </div>
          <div className="mt-0.5 text-xs text-tk-slate">CLP üzerinden</div>
        </div>
      </div>

      <div className="mt-4 h-[220px] w-full">
        <ResponsiveContainer>
          <LineChart data={egri} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...izgaraProps} />
            <XAxis
              dataKey="filo"
              {...eksenProps}
              tickFormatter={(v) => sayi(v as number)}
              type="number"
              domain={[1200, 2000]}
              ticks={ORNEKLER}
            />
            <YAxis {...eksenProps} width={56} tickFormatter={(v) => adetKisa(v as number)} />
            <Tooltip
              {...tooltipProps}
              formatter={(v, n) => [
                `${sayi(v as number)} adet`,
                n === 'karekok' ? 'Emniyet stoğu √λ ile ölçekli' : 'Mevcut yapıyla (doğrusal)',
              ]}
              labelFormatter={(l) => `${sayi(l as number)} uçak`}
            />
            <ReferenceLine
              x={filoBoyut}
              stroke="#1A1D21"
              strokeDasharray="3 3"
              label={{ value: sayi(filoBoyut), fill: '#1A1D21', fontSize: 11, position: 'top' }}
            />
            <Line
              dataKey="dogrusal"
              name="dogrusal"
              stroke="#5A6472"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="karekok"
              name="karekok"
              stroke="#E81932"
              strokeWidth={2.4}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-tk-slate">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-tk-red" />
          emniyet stoğu √λ ile ölçekli
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5"
            style={{ background: 'repeating-linear-gradient(90deg,#5A6472 0 5px,transparent 5px 9px)' }}
          />
          mevcut yapıyla ölçekle (doğrusal)
        </span>
      </div>

      <div className="mt-4 rounded border border-tk-red/25 bg-tk-red-wash px-4 py-3">
        <div className="eyebrow text-tk-red-deep">makas · {sayi(filoBoyut)} uçakta</div>
        <div className="tnum font-display text-2xl font-extrabold leading-none text-tk-red-deep tracking-[-.02em]">
          {para(makas)}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-tk-ink">
          Doğrusal ölçekleme {sayi(Math.round(makasAdet))} adet fazla stok öneriyor. Karekök
          yasasını uygulamak aynı servis seviyesini bu tutarı bağlamadan veriyor.
        </p>
      </div>
    </div>
  );
};

export default F51FleetSlider;
