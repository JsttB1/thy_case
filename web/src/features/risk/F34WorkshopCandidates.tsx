import { useMemo, type FC } from 'react';
import { useData } from '../../data/useData';
import { leadKisa, para, sayi } from '../../lib/format';
import { tumSatirlar } from '../../lib/pnRows';
import { useStore } from '../../store';
import { Badge, Skeleton } from '../../ui';
import { kritiklikTonu } from '../../lib/countdown';

/**
 * F34 — İç atölye yatırım adayları.
 * Aday puanı = yıllık talep × lead time × kritiklik ağırlığı, yalnız iç kabiliyeti
 * olmayan ve dışarıdan tedarik edilen kalemlerde. Yüksek puan, atölye kurmanın
 * en çok gün ve para kazandıracağı yer demek.
 */
const KRIT_AGIRLIK: Record<string, number> = {
  'AOG KRİTİK': 1.0,
  KRİTİK: 0.6,
  'KRİTİK DEĞİL': 0.25,
};

export const F34WorkshopCandidates: FC = () => {
  const { data, loading } = useData(['pn'] as const);
  const setSeciliPn = useStore((s) => s.setSeciliPn);

  const adaylar = useMemo(() => {
    if (!data.pn) return [];
    return tumSatirlar(data.pn)
      .filter((r) => !r.atolye && r.rate33 > 0)
      .map((r) => {
        const yillik = r.rate33 * 4;
        const puan = yillik * r.lead * (KRIT_AGIRLIK[r.krit] ?? 0.25);
        // iç atölye lead time'ı tipik olarak yarıya indirir (yurtdışı sevkiyat + gümrük kalkar)
        const kazanilanGun = r.lead * 0.5;
        const pipelineTasarruf = (yillik / 365) * kazanilanGun * r.clp;
        return { ...r, yillik, puan, kazanilanGun, pipelineTasarruf };
      })
      .sort((a, b) => b.puan - a.puan)
      .slice(0, 12);
  }, [data.pn]);

  if (loading || !data.pn) return <Skeleton className="h-72 w-full" />;

  const toplamTasarruf = adaylar.reduce((s, a) => s + a.pipelineTasarruf, 0);

  return (
    <div className="flex flex-1 flex-col">
      <div className="max-h-[300px] overflow-auto rounded border border-tk-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-tk-mist">
            <tr className="text-left">
              {['PN', 'Alt kategori', 'Kritiklik', 'Lead', 'Yıllık talep', 'Pipeline tasarrufu'].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap border-b border-tk-line px-3 py-2 text-xs font-semibold text-tk-slate ${
                      i >= 3 ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {adaylar.map((r) => (
              <tr
                key={r.pn}
                onClick={() => setSeciliPn(r.pn)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSeciliPn(r.pn)}
                className="cursor-pointer border-b border-tk-line last:border-b-0 transition-colors duration-100 hover:bg-tk-mist"
              >
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.pn}</td>
                <td className="max-w-[150px] truncate px-3 py-2">{r.sub}</td>
                <td className="px-3 py-2">
                  <Badge tone={kritiklikTonu(r.krit)}>{r.krit}</Badge>
                </td>
                <td className="tnum px-3 py-2 text-right text-tk-slate">{leadKisa(r.lead)}</td>
                <td className="tnum px-3 py-2 text-right">{sayi(r.yillik, 0)}</td>
                <td className="tnum px-3 py-2 text-right font-semibold text-sig-ok">
                  {para(r.pipelineTasarruf)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-auto pt-3 text-sm leading-relaxed text-tk-slate">
        Bu 12 kalemde iç atölye lead time&apos;ı yarıya indirse pipeline&apos;da bağlı sermaye
        yıllık <strong className="text-sig-ok">{para(toplamTasarruf)}</strong> azalır. Aday puanı =
        yıllık talep × lead time × kritiklik ağırlığı; yatırım kararı için tesis maliyeti bu
        tasarrufla karşılaştırılmalı.
      </p>
    </div>
  );
};

export default F34WorkshopCandidates;
