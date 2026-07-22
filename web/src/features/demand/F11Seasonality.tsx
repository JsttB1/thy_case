import type { FC } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDatum } from '../../data/useData';
import { adetKisa, sayi } from '../../lib/format';
import { eksenProps, izgaraProps, tooltipProps } from '../../lib/chartTheme';
import { Skeleton } from '../../ui';

/**
 * F11 — Çeyreklik mevsimsellik. Yığılmış: toplam talebin çeyrekten çeyreğe
 * nasıl kaydığı okunmalı, bileşenler ikincil.
 */
export const F11Seasonality: FC = () => {
  const { data, loading } = useDatum('demand');
  if (loading || !data) return <Skeleton className="h-72 w-full" />;

  const q = data.quarterly;
  const veri = q.labels.map((l, i) => ({
    ceyrek: l,
    thy: q.thy[i],
    pool: q.pool[i],
    scrap: q.scrap[i],
    toplam: q.thy[i] + q.pool[i] + q.scrap[i],
  }));

  const zirve = veri.reduce((a, b) => (b.toplam > a.toplam ? b : a));

  return (
    <div className="flex flex-1 flex-col">
      <div className="h-[250px] w-full">
        <ResponsiveContainer>
          <BarChart data={veri} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...izgaraProps} />
            <XAxis dataKey="ceyrek" {...eksenProps} />
            <YAxis {...eksenProps} tickFormatter={(v) => adetKisa(v as number)} width={46} />
            <Tooltip
              {...tooltipProps}
              formatter={(v, n) => [`${sayi(v as number)} adet`, n as string]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" iconSize={9} />
            <Bar dataKey="thy" stackId="a" name="THY" fill="#1A1D21" />
            <Bar dataKey="pool" stackId="a" name="Havuz" fill="#5A6472" />
            <Bar dataKey="scrap" stackId="a" name="Scrap" fill="#8B94A3" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-auto pt-3 text-sm leading-relaxed text-tk-slate">
        Zirve <strong className="text-tk-ink">{zirve.ceyrek}</strong> ({sayi(zirve.toplam)} adet) —
        yaz operasyonu sökülmeyi artırıyor. Emniyet stoğu yıllık ortalamaya göre değil, çeyrek
        zirvesine göre boyutlanmalı.
      </p>
    </div>
  );
};

export default F11Seasonality;
