import { useMemo, type FC } from 'react';
import { useData } from '../../data/useData';
import { gunSayi, leadKisa, para, sayi } from '../../lib/format';
import { durumTonu, durumdanEtiket, kalanGunRenk, kritiklikTonu } from '../../lib/countdown';
import { filtrele, tumSatirlar } from '../../lib/pnRows';
import { useStore } from '../../store';
import { Badge, EmptyState, Skeleton } from '../../ui';
import FilterBar from '../../ui/FilterBar';

const LIMIT = 200;

/**
 * F22 — Geri sayım tablosu (filtreli tam liste).
 * F01 ilk 12'yi gösteriyor; burada 5.000 PN'in tamamı kalan güne göre sıralı,
 * kaynak pn.json — inventory.json'daki geriSayim yalnız ilk 150'yi taşıyor.
 */
export const F22CountdownTable: FC = () => {
  const { data, loading } = useData(['pn'] as const);
  const setSeciliPn = useStore((s) => s.setSeciliPn);
  const kritiklikFiltresi = useStore((s) => s.kritiklikFiltresi);
  const modelFiltresi = useStore((s) => s.modelFiltresi);
  const durumFiltresi = useStore((s) => s.durumFiltresi);
  const arama = useStore((s) => s.arama);

  const satirlar = useMemo(() => (data.pn ? tumSatirlar(data.pn) : []), [data.pn]);

  const sirali = useMemo(
    () =>
      filtrele(satirlar, {
        kritiklik: kritiklikFiltresi,
        model: modelFiltresi,
        durum: durumFiltresi,
        arama,
      }).sort((a, b) => a.kalan - b.kalan),
    [satirlar, kritiklikFiltresi, modelFiltresi, durumFiltresi, arama],
  );

  const modeller = useMemo(
    () => (data.pn ? [...data.pn.dict.model].sort() : []),
    [data.pn],
  );

  if (loading || !data.pn) return <Skeleton className="h-96 w-full" />;

  const gecikmis = sirali.filter((r) => r.kalan < 0).length;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3">
        <FilterBar modeller={modeller} aramaGoster />
      </div>

      <div className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <span className="text-tk-slate">
          <strong className="tnum text-tk-ink">{sayi(sirali.length)}</strong> PN listeleniyor
        </span>
        <span className="text-tk-slate">
          <strong className="tnum text-sig-crit">{sayi(gecikmis)}</strong> gecikmiş
        </span>
        {sirali.length > LIMIT && (
          <span className="text-xs text-tk-slate">
            ilk {LIMIT} satır gösteriliyor · tamamı için PN Gezgini
          </span>
        )}
      </div>

      {sirali.length === 0 ? (
        <EmptyState
          baslik="Filtreye uyan PN yok."
          yonerge="Kritiklik ya da durum filtresini genişletin."
        />
      ) : (
        <div className="max-h-[420px] overflow-auto rounded border border-tk-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-tk-mist">
              <tr className="text-left">
                {['PN', 'Alt kategori', 'Model', 'Kritiklik', 'Lead', 'Stok', 'Min 2033', 'Açık maliyet', 'Kalan gün'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap border-b border-tk-line px-3 py-2 text-xs font-semibold text-tk-slate ${
                        i >= 4 ? 'text-right' : ''
                      }`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sirali.slice(0, LIMIT).map((r) => (
                <tr
                  key={r.pn}
                  onClick={() => setSeciliPn(r.pn)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSeciliPn(r.pn)}
                  className={`cursor-pointer border-b border-tk-line last:border-b-0 transition-colors duration-100 hover:bg-tk-mist ${
                    r.krit === 'AOG KRİTİK' && r.kalan < 0 ? 'bg-tk-red-wash/60' : ''
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.pn}</td>
                  <td className="max-w-[180px] truncate px-3 py-2">{r.sub}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-tk-slate">{r.model}</td>
                  <td className="px-3 py-2">
                    <Badge tone={kritiklikTonu(r.krit)}>{r.krit}</Badge>
                  </td>
                  <td className="tnum whitespace-nowrap px-3 py-2 text-right text-tk-slate">
                    {leadKisa(r.lead)}
                  </td>
                  <td className="tnum px-3 py-2 text-right">{sayi(r.stock)}</td>
                  <td className="tnum px-3 py-2 text-right text-tk-slate">{sayi(r.min33)}</td>
                  <td className="tnum px-3 py-2 text-right">
                    {r.acik > 0 ? para(r.acik * r.clp) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <span className="inline-flex items-center gap-2">
                      <Badge tone={durumTonu(r.geriSayim)}>{durumdanEtiket(r.geriSayim)}</Badge>
                      <span
                        className={`tnum w-12 text-right font-display text-lg font-extrabold tracking-[-.02em] ${kalanGunRenk(
                          r.kalan,
                        )}`}
                      >
                        {gunSayi(r.kalan)}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default F22CountdownTable;
