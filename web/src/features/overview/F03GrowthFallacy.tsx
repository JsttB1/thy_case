import type { FC } from 'react';
import { useDatum } from '../../data/useData';
import { sayi, yuzdeIsaretli } from '../../lib/format';
import { Skeleton } from '../../ui';

interface Cubuk {
  etiket: string;
  buyume: number;
  from: string;
  to: string;
  vurgu?: boolean;
}

/**
 * F03 — Doğrusal büyüme yanılgısı.
 * Recharts değil, üç div: 3 değerli bir karşılaştırmada eksen ve ızgara
 * gürültüden başka bir şey katmıyor.
 */
export const F03GrowthFallacy: FC = () => {
  const { data: k, loading } = useDatum('kpi');

  if (loading || !k) return <Skeleton rows={4} />;

  const cubuklar: Cubuk[] = [
    { etiket: 'Filo', buyume: k.filoBuyume, from: sayi(k.ucak2025), to: sayi(k.ucak2033) },
    { etiket: 'Yıllık talep', buyume: k.talepBuyume, from: sayi(k.talep25), to: sayi(k.talep33) },
    {
      etiket: 'Önerilen min stok',
      buyume: k.minBuyume,
      from: sayi(k.min25),
      to: sayi(k.min33),
      vurgu: true,
    },
  ];

  const enBuyuk = Math.max(...cubuklar.map((c) => c.buyume));

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-5">
        {cubuklar.map((c) => (
          <div key={c.etiket}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">{c.etiket}</span>
              <span className="tnum text-xs text-tk-slate">
                {c.from} → {c.to}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 flex-1 rounded-[3px] bg-tk-mist">
                <div
                  className={`h-full rounded-[3px] ${c.vurgu ? 'bg-tk-red' : 'bg-tk-slate'}`}
                  style={{ width: `${(c.buyume / enBuyuk) * 100}%` }}
                  role="img"
                  aria-label={`${c.etiket} büyümesi ${yuzdeIsaretli(c.buyume)}`}
                />
              </div>
              <span
                className={`tnum w-20 shrink-0 text-right font-display text-xl font-extrabold tracking-[-.02em] ${
                  c.vurgu ? 'text-tk-red' : 'text-tk-ink'
                }`}
              >
                {yuzdeIsaretli(c.buyume)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-auto pt-5 text-sm leading-relaxed text-tk-slate">
        Emniyet stoğu talebin kareköküyle büyür — filo{' '}
        <strong className="text-tk-ink">%67</strong> büyürken stok yalnızca{' '}
        <strong className="text-tk-red">%29</strong> büyüyor. Doğrusal ölçekleme
        varsayımı 2033&apos;te gereğinden fazla sermaye bağlardı.
      </p>
    </div>
  );
};

export default F03GrowthFallacy;
