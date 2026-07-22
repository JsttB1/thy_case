import type { FC } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useData } from '../../data/useData';
import { sayi } from '../../lib/format';
import { eksenProps, izgaraProps, tooltipProps } from '../../lib/chartTheme';
import { Skeleton } from '../../ui';

/** Kovanın alt sınırı 70 ve üstü ise yüksek risk — tek kırmızı bölge. */
const yuksekMi = (etiket: string) => Number(etiket.split('-')[0]) >= 70;

/** F30 — AOG risk skoru dağılımı. */
export const F30RiskHistogram: FC = () => {
  const { data, loading } = useData(['risk', 'kpi'] as const);
  if (loading || !data.risk || !data.kpi) return <Skeleton className="h-64 w-full" />;

  const veri = data.risk.hist.labels.map((l, i) => ({
    kova: l,
    pn: data.risk!.hist.vals[i],
    yuksek: yuksekMi(l),
  }));

  return (
    <div className="flex flex-1 flex-col">
      <div className="h-[220px] w-full">
        <ResponsiveContainer>
          <BarChart data={veri} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...izgaraProps} />
            <XAxis
              dataKey="kova"
              {...eksenProps}
              tick={{ fill: '#5A6472', fontSize: 11 }}
              interval={0}
            />
            <YAxis {...eksenProps} width={44} tickFormatter={(v) => sayi(v as number)} />
            <Tooltip
              {...tooltipProps}
              formatter={(v) => [`${sayi(v as number)} PN`, 'adet']}
              labelFormatter={(l) => `Risk skoru ${l}`}
            />
            <Bar dataKey="pn" radius={[2, 2, 0, 0]}>
              {veri.map((v) => (
                <Cell key={v.kova} fill={v.yuksek ? '#E81932' : '#8B94A3'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-tk-line pt-4">
        <div>
          <dt className="eyebrow">yüksek risk (&gt;70)</dt>
          <dd className="tnum font-display text-xl font-bold text-tk-red">
            {sayi(data.kpi.riskHigh)}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">orta risk (40–70)</dt>
          <dd className="tnum font-display text-xl font-bold text-sig-warn">
            {sayi(data.kpi.riskMid)}
          </dd>
        </div>
      </dl>

      <p className="mt-auto pt-3 text-sm leading-relaxed text-tk-slate">
        Dağılımın sağ kuyruğu ince ama pahalı: {sayi(data.kpi.riskHigh)} PN hem kritik, hem uzun
        lead time&apos;lı, hem de iç atölye kabiliyeti yok.
      </p>
    </div>
  );
};

export default F30RiskHistogram;
