import type { FC } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useDatum } from '../../data/useData';
import { para, yuzde } from '../../lib/format';
import { tooltipProps } from '../../lib/chartTheme';
import { Skeleton } from '../../ui';

/** F21 — Sermaye dağılımı. Atıl ve fazla kırmızı/amber: geri kazanılabilir kısım. */
export const F21Capital: FC = () => {
  const { data, loading } = useDatum('inventory');
  if (loading || !data) return <Skeleton className="h-64 w-full" />;

  const s = data.sermaye;
  const dilimler = [
    { ad: 'Servisteki stok', v: s.servis, renk: '#1A1D21', not: 'aktif kullanımda' },
    { ad: 'Pipeline', v: s.pipeline, renk: '#5A6472', not: 'yolda / tamirde' },
    { ad: 'Atıl', v: s.atil, renk: '#E81932', not: 'hareketsiz' },
    { ad: 'Fazla', v: s.fazla, renk: '#C77700', not: 'max üstü' },
  ];
  const toplam = dilimler.reduce((a, b) => a + b.v, 0);
  const geriKazanilabilir = s.atil + s.fazla;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-[180px] w-[180px] shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={dilimler}
                dataKey="v"
                nameKey="ad"
                innerRadius={54}
                outerRadius={84}
                paddingAngle={1.5}
                stroke="none" isAnimationActive={false}>
                {dilimler.map((d) => (
                  <Cell key={d.ad} fill={d.renk} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} formatter={(v, n) => [para(v as number), n as string]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="eyebrow">toplam</span>
            <span className="tnum font-display text-xl font-extrabold tracking-[-.02em]">{para(toplam)}</span>
          </div>
        </div>

        <ul className="w-full flex-1 space-y-2">
          {dilimler.map((d) => (
            <li key={d.ad} className="flex items-baseline gap-2.5">
              <span
                className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ background: d.renk }}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{d.ad}</span>
                <span className="text-xs text-tk-slate">{d.not}</span>
              </span>
              <span className="tnum shrink-0 text-right">
                <span className="block text-sm font-semibold">{para(d.v)}</span>
                <span className="text-xs text-tk-slate">{yuzde((d.v / toplam) * 100, 0)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-auto pt-4 text-sm leading-relaxed text-tk-slate">
        <strong className="text-tk-ink">{para(geriKazanilabilir)}</strong> atıl ve fazla stokta —
        toplam bağlı sermayenin {yuzde((geriKazanilabilir / toplam) * 100, 0)}&apos;i. Bu tutar
        yeni alım bütçesi açılmadan önce bakılacak ilk yer.
      </p>
    </div>
  );
};

export default F21Capital;
