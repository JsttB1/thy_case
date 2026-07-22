import type { FC } from 'react';
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useData } from '../../data/useData';
import { para, sayi } from '../../lib/format';
import { eksenProps, izgaraProps, tooltipProps } from '../../lib/chartTheme';
import { useStore } from '../../store';
import { Skeleton } from '../../ui';

/**
 * F23 — Tamir mi, yeni alım mı?
 * TAMIR_VS_YENI = tamir maliyeti ÷ yeni alım. 1'in üstü "tamir etmek yeniyi almaktan pahalı".
 */
export const F23RepairVsBuy: FC = () => {
  const { data, loading } = useData(['inventory', 'kpi'] as const);
  const setSeciliPn = useStore((s) => s.setSeciliPn);

  if (loading || !data.inventory || !data.kpi) return <Skeleton className="h-64 w-full" />;

  const veri = data.inventory.scrapOneri.map((r) => ({
    ...r,
    oran: r.TAMIR_VS_YENI,
    deger: r.CLP_USD,
  }));

  const scrapAday = veri.filter((v) => v.oran >= 1).length;
  const bagli = veri.reduce((s, v) => s + v.CLP_USD * v.ATIL, 0);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span>
          <span className="tnum font-display text-2xl font-bold text-tk-red">
            {sayi(data.kpi.scrapOneriPn)}
          </span>
          <span className="ml-2 text-sm text-tk-slate">PN scrap adayı</span>
        </span>
        <span className="text-sm text-tk-slate">
          listedeki {sayi(veri.length)} kalemde <strong className="text-tk-ink">{para(bagli)}</strong> atıl
          değer
        </span>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid {...izgaraProps} vertical />
            <XAxis
              type="number"
              dataKey="oran"
              name="Tamir / yeni"
              {...eksenProps}
              tickFormatter={(v) => sayi(v as number, 1)}
              label={{
                value: 'tamir maliyeti ÷ yeni alım',
                position: 'insideBottom',
                offset: -2,
                fill: '#5A6472',
                fontSize: 11,
              }}
              height={44}
            />
            <YAxis
              type="number"
              dataKey="deger"
              name="Birim CLP"
              {...eksenProps}
              width={58}
              tickFormatter={(v) => para(v as number)}
            />
            <ZAxis range={[30, 30]} />
            <Tooltip
              {...tooltipProps}
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(v, n) =>
                n === 'Birim CLP' ? [para(v as number), n] : [sayi(v as number, 2), n as string]
              }
              labelFormatter={() => ''}
              content={({ payload }) => {
                const p = payload?.[0]?.payload;
                if (!p) return null;
                return (
                  <div className="rounded border border-tk-line bg-white px-2.5 py-2 text-xs shadow-sm">
                    <div className="font-mono font-semibold">{p.PN}</div>
                    <div className="text-tk-slate">{p.SUB}</div>
                    <div className="tnum mt-1">
                      tamir/yeni: <strong>{sayi(p.oran, 2)}</strong>
                    </div>
                    <div className="tnum">birim CLP: {para(p.deger)}</div>
                  </div>
                );
              }}
            />
            {/* eşik: sağdaki her nokta tamiri yeniden pahalı olan kalem */}
            <ReferenceLine
              x={1}
              stroke="#E81932"
              strokeDasharray="4 3"
              label={{ value: 'eşik 1,0', fill: '#E81932', fontSize: 11, position: 'top' }}
            />
            <Scatter
              data={veri}
              isAnimationActive={false}
              onClick={(p) => p?.PN && setSeciliPn(p.PN)}
              cursor="pointer"
            >
              {veri.map((v) => (
                <Cell key={v.PN} fill={v.oran >= 1 ? '#E81932' : '#8B94A3'} fillOpacity={0.75} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-auto pt-3 text-sm leading-relaxed text-tk-slate">
        Eşiğin sağındaki {sayi(scrapAday)} kalemde tamir, yeni alım kadar ya da daha pahalı —
        bunları tamire göndermek sermayeyi ikinci kez bağlıyor. Karar kuralı basit: oran 1&apos;i
        geçiyorsa scrap et, yenisini al.
      </p>
    </div>
  );
};

export default F23RepairVsBuy;
