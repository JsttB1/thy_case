import { useMemo, type FC } from 'react';
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
import { sayi, yuzde } from '../../lib/format';
import { eksenProps, izgaraProps, tooltipProps } from '../../lib/chartTheme';
import { Skeleton } from '../../ui';

/** Yıllık talep kovaları — kesikli bölge (yılda 4 adetin altı) ayrı işaretlenir. */
const KOVALAR = [
  { etiket: '0', alt: -Infinity, ust: 0.001, kesikli: true },
  { etiket: '0–1', alt: 0.001, ust: 1, kesikli: true },
  { etiket: '1–4', alt: 1, ust: 4, kesikli: true },
  { etiket: '4–12', alt: 4, ust: 12, kesikli: false },
  { etiket: '12–52', alt: 12, ust: 52, kesikli: false },
  { etiket: '52+', alt: 52, ust: Infinity, kesikli: false },
];

/**
 * F13 — Kesikli talep analizi.
 * pn.json'daki çeyreklik oranlar yıllığa çevrilip dağılım çıkarılır;
 * kütlenin sol uçta toplanması SBA gerekçesinin kendisi.
 */
export const F13Intermittent: FC = () => {
  const { data, loading } = useData(['demand', 'pn'] as const);

  const veri = useMemo(() => {
    if (!data.pn) return [];
    const rate = data.pn.cols.rate25;
    const sayimlar = new Array(KOVALAR.length).fill(0);
    for (let i = 0; i < rate.length; i++) {
      const yillik = rate[i] * 4; // çeyreklik oran → yıllık adet
      const k = KOVALAR.findIndex((b) => yillik >= b.alt && yillik < b.ust);
      if (k >= 0) sayimlar[k] += 1;
    }
    return KOVALAR.map((b, i) => ({ etiket: b.etiket, pn: sayimlar[i], kesikli: b.kesikli }));
  }, [data.pn]);

  if (loading || !data.pn || !data.demand) return <Skeleton className="h-64 w-full" />;

  const toplam = data.pn.n;
  const kesikliPn = data.demand.intermittentPn;
  const dusukTalep = veri.filter((v) => v.kesikli).reduce((s, v) => s + v.pn, 0);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="tnum font-display text-2xl font-bold text-tk-red">
          {sayi(kesikliPn)}
        </span>
        <span className="text-sm text-tk-slate">
          PN kesikli talep sınıfında — toplamın {yuzde((kesikliPn / toplam) * 100)}&apos;i
        </span>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <BarChart data={veri} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...izgaraProps} />
            <XAxis dataKey="etiket" {...eksenProps} />
            <YAxis {...eksenProps} width={44} tickFormatter={(v) => sayi(v as number)} />
            <Tooltip
              {...tooltipProps}
              formatter={(v) => [`${sayi(v as number)} PN`, 'adet']}
              labelFormatter={(l) => `Yıllık talep ${l}`}
            />
            <Bar dataKey="pn" radius={[2, 2, 0, 0]}>
              {veri.map((v) => (
                <Cell key={v.etiket} fill={v.kesikli ? '#E81932' : '#8B94A3'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-tk-slate">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-tk-red" />
          kesikli bölge (yılda &lt; 4 adet)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#8B94A3]" />
          sürekli talep
        </span>
      </div>

      <p className="mt-auto pt-4 text-sm leading-relaxed text-tk-slate">
        {sayi(dusukTalep)} PN yılda dörtten az hareket görüyor. Bu kalemlerde çeyreklik ortalama
        almak sürekli bir talep varmış gibi davranır ve gereksiz stok üretir; SBA talebi
        &quot;ne sıklıkla&quot; ve &quot;gelince ne kadar&quot; diye ikiye ayırarak bu sapmayı
        düzeltir.
      </p>
    </div>
  );
};

export default F13Intermittent;
