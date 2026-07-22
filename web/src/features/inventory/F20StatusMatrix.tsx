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
import { sayi } from '../../lib/format';
import { KRITIKLIK_RENK, eksenProps, izgaraProps, tooltipProps } from '../../lib/chartTheme';
import { Skeleton } from '../../ui';

/** F20 — Açık / Dengede / Fazla × kritiklik. Yığılmış çubuk + altında ham matris. */
export const F20StatusMatrix: FC = () => {
  const { data, loading } = useDatum('inventory');
  if (loading || !data) return <Skeleton className="h-64 w-full" />;

  const { rows, cols, vals } = data.durumKrit;
  const veri = rows.map((r, i) => {
    const satir: Record<string, string | number> = { durum: r };
    cols.forEach((c, j) => (satir[c] = vals[i][j]));
    return satir;
  });

  const acikAog = vals[0][0];

  return (
    <div className="flex flex-1 flex-col">
      <div className="h-[210px] w-full">
        <ResponsiveContainer>
          <BarChart data={veri} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...izgaraProps} />
            <XAxis dataKey="durum" {...eksenProps} />
            <YAxis {...eksenProps} width={46} tickFormatter={(v) => sayi(v as number)} />
            <Tooltip {...tooltipProps} formatter={(v, n) => [`${sayi(v as number)} PN`, n as string]} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" iconSize={9} />
            {cols.map((c, j) => (
              <Bar
                key={c}
                dataKey={c}
                stackId="a"
                fill={KRITIKLIK_RENK[c]}
                radius={j === cols.length - 1 ? [2, 2, 0, 0] : undefined}
              isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-tk-line text-left">
            <th className="py-1.5 font-medium text-tk-slate">Durum</th>
            {cols.map((c) => (
              <th key={c} className="py-1.5 text-right font-medium text-tk-slate">
                {c}
              </th>
            ))}
            <th className="py-1.5 text-right font-medium text-tk-slate">Toplam</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r} className="border-b border-tk-line last:border-b-0">
              <td className="py-1.5 font-medium">{r}</td>
              {cols.map((c, j) => (
                <td
                  key={c}
                  className={`tnum py-1.5 text-right ${
                    i === 0 && j === 0 ? 'bg-tk-red-wash font-semibold text-tk-red-deep' : ''
                  }`}
                >
                  {sayi(vals[i][j])}
                </td>
              ))}
              <td className="tnum py-1.5 text-right font-semibold">
                {sayi(vals[i].reduce((a, b) => a + b, 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-auto pt-3 text-sm leading-relaxed text-tk-slate">
        Kritik hücre sol üst: <strong className="text-tk-red">{sayi(acikAog)}</strong> AOG kritik
        PN min stoğun altında. Fazla stok kalemleri sermaye bağlıyor ama uçak durdurmuyor —
        öncelik sırası buradan okunur.
      </p>
    </div>
  );
};

export default F20StatusMatrix;
