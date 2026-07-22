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

/** F10 — Model bazında talep 2025 → 2033. Tek kırmızı seri: 2033 projeksiyonu. */
export const F10DemandByModel: FC = () => {
  const { data, loading } = useDatum('demand');
  if (loading || !data) return <Skeleton className="h-72 w-full" />;

  const veri = [...data.byModel]
    .sort((a, b) => b.t33 - a.t33)
    .map((m) => ({ ...m, t33: Math.round(m.t33) }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <BarChart data={veri} margin={{ top: 4, right: 8, left: 4, bottom: 4 }} barGap={2}>
          <CartesianGrid {...izgaraProps} />
          <XAxis
            dataKey="MODEL"
            {...eksenProps}
            interval={0}
            angle={-38}
            textAnchor="end"
            height={78}
            tick={{ fill: '#5A6472', fontSize: 11 }}
          />
          <YAxis {...eksenProps} tickFormatter={(v) => adetKisa(v as number)} width={52} />
          <Tooltip
            {...tooltipProps}
            formatter={(v, n) => [`${sayi(v as number)} adet`, n as string]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
            iconType="square"
            iconSize={9}
          />
          <Bar dataKey="t25" name="2025 gerçekleşen" fill="#5A6472" radius={[2, 2, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="t33" name="2033 projeksiyon" fill="#E81932" radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default F10DemandByModel;
