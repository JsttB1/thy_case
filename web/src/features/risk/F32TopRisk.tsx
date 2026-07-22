import { useMemo, useState, type FC } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useDatum } from '../../data/useData';
import type { RiskPn } from '../../data/types';
import { gunSayi, leadKisa, para, sayi } from '../../lib/format';
import { durumTonu, durumdanEtiket, kalanGunRenk, kritiklikTonu } from '../../lib/countdown';
import { useStore } from '../../store';
import { Badge, Skeleton } from '../../ui';

type Kolon = { anahtar: keyof RiskPn; ad: string; sag?: boolean };

const KOLONLAR: Kolon[] = [
  { anahtar: 'PN', ad: 'PN' },
  { anahtar: 'SUB', ad: 'Alt kategori' },
  { anahtar: 'MODEL', ad: 'Model' },
  { anahtar: 'KRITIK', ad: 'Kritiklik' },
  { anahtar: 'TEMIN_KANALI', ad: 'Temin' },
  { anahtar: 'LEAD_GUN', ad: 'Lead', sag: true },
  { anahtar: 'ACIK_2033', ad: 'Açık', sag: true },
  { anahtar: 'CLP_USD', ad: 'Birim CLP', sag: true },
  { anahtar: 'KALAN_GUN', ad: 'Kalan gün', sag: true },
  { anahtar: 'RISK', ad: 'Risk', sag: true },
];

/** F32 — En riskli 100 PN, sıralanabilir. */
export const F32TopRisk: FC = () => {
  const { data, loading } = useDatum('risk');
  const setSeciliPn = useStore((s) => s.setSeciliPn);
  const [sirala, setSirala] = useState<{ k: keyof RiskPn; yon: 1 | -1 }>({
    k: 'RISK',
    yon: -1,
  });

  const satirlar = useMemo(() => {
    if (!data) return [];
    return [...data.topRisk].sort((a, b) => {
      const x = a[sirala.k];
      const y = b[sirala.k];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sirala.yon;
      return String(x).localeCompare(String(y), 'tr') * sirala.yon;
    });
  }, [data, sirala]);

  if (loading || !data) return <Skeleton className="h-96 w-full" />;

  const tikla = (k: keyof RiskPn) =>
    setSirala((s) => (s.k === k ? { k, yon: (s.yon * -1) as 1 | -1 } : { k, yon: -1 }));

  return (
    <div className="max-h-[440px] flex-1 overflow-auto rounded border border-tk-line">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-tk-mist">
          <tr>
            {KOLONLAR.map((k) => (
              <th
                key={k.anahtar}
                className={`whitespace-nowrap border-b border-tk-line px-3 py-2 text-xs font-semibold text-tk-slate ${
                  k.sag ? 'text-right' : 'text-left'
                }`}
              >
                <button
                  type="button"
                  onClick={() => tikla(k.anahtar)}
                  className={`inline-flex items-center gap-0.5 transition-colors duration-100 hover:text-tk-ink ${
                    sirala.k === k.anahtar ? 'text-tk-ink' : ''
                  }`}
                >
                  {k.ad}
                  {sirala.k === k.anahtar &&
                    (sirala.yon === -1 ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((r) => (
            <tr
              key={r.PN}
              onClick={() => setSeciliPn(r.PN)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSeciliPn(r.PN)}
              className="cursor-pointer border-b border-tk-line last:border-b-0 transition-colors duration-100 hover:bg-tk-mist"
            >
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.PN}</td>
              <td className="max-w-[170px] truncate px-3 py-2">{r.SUB}</td>
              <td className="whitespace-nowrap px-3 py-2 text-tk-slate">{r.MODEL}</td>
              <td className="px-3 py-2">
                <Badge tone={kritiklikTonu(r.KRITIK)}>{r.KRITIK}</Badge>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-tk-slate">{r.TEMIN_KANALI}</td>
              <td className="tnum px-3 py-2 text-right text-tk-slate">{leadKisa(r.LEAD_GUN)}</td>
              <td className="tnum px-3 py-2 text-right">{sayi(r.ACIK_2033)}</td>
              <td className="tnum px-3 py-2 text-right text-tk-slate">{para(r.CLP_USD)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <span className="inline-flex items-center gap-2">
                  <Badge tone={durumTonu(r.GERI_SAYIM_DURUM)}>
                    {durumdanEtiket(r.GERI_SAYIM_DURUM)}
                  </Badge>
                  <span className={`tnum w-10 text-right font-semibold ${kalanGunRenk(r.KALAN_GUN)}`}>
                    {gunSayi(r.KALAN_GUN)}
                  </span>
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                {/* skor hem sayı hem çubuk: renk tek başına bilgi taşımasın */}
                <span className="inline-flex items-center justify-end gap-2">
                  <span className="hidden h-1.5 w-12 rounded-full bg-tk-mist md:inline-block">
                    <span
                      className="block h-full rounded-full bg-tk-red"
                      style={{ width: `${Math.min(100, r.RISK)}%` }}
                    />
                  </span>
                  <span className="tnum w-9 text-right font-display text-base font-bold">
                    {sayi(r.RISK, 0)}
                  </span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default F32TopRisk;
