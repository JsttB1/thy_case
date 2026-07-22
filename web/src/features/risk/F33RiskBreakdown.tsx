import { useMemo, type FC } from 'react';
import { useData } from '../../data/useData';
import { sayi } from '../../lib/format';
import { pnBul, tumSatirlar } from '../../lib/pnRows';
import { BILESEN_RENK, riskAyristir, riskSabitleri } from '../../lib/risk';
import { useStore } from '../../store';
import { Badge, Skeleton } from '../../ui';
import { kritiklikTonu } from '../../lib/countdown';

/**
 * F33 — Risk skoru ayrıştırma.
 * Seçili PN yoksa en riskli PN gösterilir; tablodan ya da panodan seçim yapılınca
 * bu kart o PN'e geçer. Formül kartın altında — black box yok.
 */
export const F33RiskBreakdown: FC = () => {
  const { data, loading } = useData(['pn', 'demand'] as const);
  const seciliPn = useStore((s) => s.seciliPn);

  const sabitler = useMemo(
    () => (data.pn && data.demand ? riskSabitleri(data.pn, data.demand) : null),
    [data.pn, data.demand],
  );

  const satir = useMemo(() => {
    if (!data.pn) return null;
    if (seciliPn) {
      const bulunan = pnBul(data.pn, seciliPn);
      if (bulunan) return bulunan;
    }
    // varsayılan: en riskli PN
    return tumSatirlar(data.pn).reduce((a, b) => (b.risk > a.risk ? b : a));
  }, [data.pn, seciliPn]);

  if (loading || !satir || !sabitler) return <Skeleton className="h-56 w-full" />;

  const bilesenler = riskAyristir(satir, sabitler);
  const toplam = bilesenler.reduce((s, b) => s + b.katki, 0);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-base font-semibold">{satir.pn}</span>
          <Badge tone={kritiklikTonu(satir.krit)}>{satir.krit}</Badge>
          <span className="text-xs text-tk-slate">
            {satir.sub} · {satir.model}
          </span>
        </div>
        <div className="text-right">
          <span className="eyebrow">risk skoru</span>
          <div className="tnum font-display text-2xl font-bold leading-none text-tk-red">
            {sayi(toplam, 1)}
          </div>
        </div>
      </div>

      {/* yığılmış tek çubuk */}
      <div className="flex h-8 w-full overflow-hidden rounded-[3px]" role="img"
        aria-label={`Risk skoru bileşenleri: ${bilesenler.map((b) => `${b.ad} ${sayi(b.katki, 1)}`).join(', ')}`}>
        {bilesenler.map((b) =>
          b.katki > 0 ? (
            <div
              key={b.ad}
              style={{ width: `${b.katki}%`, background: BILESEN_RENK[b.ad] }}
              title={`${b.ad}: ${sayi(b.katki, 1)} puan`}
            />
          ) : null,
        )}
        <div className="flex-1 bg-tk-mist" />
      </div>
      <div className="mt-1 flex justify-between text-2xs text-tk-slate">
        <span>0</span>
        <span>100</span>
      </div>

      <ul className="mt-4 space-y-2">
        {bilesenler.map((b) => (
          <li key={b.ad} className="flex items-baseline gap-2.5 text-sm">
            <span
              className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ background: BILESEN_RENK[b.ad] }}
            />
            <span className="w-28 shrink-0 font-medium">{b.ad}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-tk-slate">{b.aciklama}</span>
            <span className="tnum w-14 shrink-0 text-right font-semibold">
              {sayi(b.katki, 1)}
            </span>
            <span className="tnum w-10 shrink-0 text-right text-xs text-tk-slate">
              /{sayi(b.agirlik * 100, 0)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-auto pt-4 font-mono text-xs leading-relaxed text-tk-slate">
        RISK = 100 × (0,35·kritiklik + 0,25·lead<sub>n</sub> + 0,20·büyüme<sub>n</sub> +
        0,10·atölye + 0,10·talep<sub>n</sub>)
      </p>
    </div>
  );
};

export default F33RiskBreakdown;
