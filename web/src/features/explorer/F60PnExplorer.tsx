import { useMemo, useRef, useState, type FC } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useData } from '../../data/useData';
import { gunSayi, leadKisa, para, sayi } from '../../lib/format';
import { kalanGunRenk, kritiklikTonu } from '../../lib/countdown';
import { filtrele, tumSatirlar, type PnRow } from '../../lib/pnRows';
import { useStore } from '../../store';
import { Badge, EmptyState, Skeleton } from '../../ui';
import FilterBar from '../../ui/FilterBar';

interface Kolon {
  k: keyof PnRow;
  ad: string;
  gen: number;
  sag?: boolean;
  bicim?: (r: PnRow) => React.ReactNode;
}

const KOLONLAR: Kolon[] = [
  { k: 'pn', ad: 'PN', gen: 110, bicim: (r) => <span className="font-mono text-xs">{r.pn}</span> },
  { k: 'sub', ad: 'Alt kategori', gen: 190 },
  { k: 'model', ad: 'Model', gen: 110 },
  {
    k: 'krit',
    ad: 'Kritiklik',
    gen: 120,
    bicim: (r) => <Badge tone={kritiklikTonu(r.krit)}>{r.krit}</Badge>,
  },
  { k: 'kanal', ad: 'Temin', gen: 130 },
  { k: 'lead', ad: 'Lead', gen: 70, sag: true, bicim: (r) => leadKisa(r.lead) },
  { k: 'stock', ad: 'Stok', gen: 70, sag: true, bicim: (r) => sayi(r.stock) },
  { k: 'min33', ad: 'Min 33', gen: 74, sag: true, bicim: (r) => sayi(r.min33) },
  { k: 'max33', ad: 'Max 33', gen: 74, sag: true, bicim: (r) => sayi(r.max33) },
  {
    k: 'durum',
    ad: 'Durum',
    gen: 96,
    bicim: (r) => (
      <span
        className={
          r.durum === 'AÇIK'
            ? 'text-sig-crit'
            : r.durum === 'FAZLA'
              ? 'text-sig-warn'
              : 'text-tk-slate'
        }
      >
        {r.durum}
      </span>
    ),
  },
  { k: 'clp', ad: 'CLP', gen: 90, sag: true, bicim: (r) => para(r.clp) },
  {
    k: 'risk',
    ad: 'Risk',
    gen: 70,
    sag: true,
    bicim: (r) => <span className="font-semibold">{sayi(r.risk, 0)}</span>,
  },
  {
    k: 'kalan',
    ad: 'Kalan gün',
    gen: 92,
    sag: true,
    bicim: (r) => (
      <span className={`font-display text-base font-extrabold tracking-[-.02em] ${kalanGunRenk(r.kalan)}`}>
        {gunSayi(r.kalan)}
      </span>
    ),
  },
];

const TOPLAM_GEN = KOLONLAR.reduce((s, k) => s + k.gen, 0);
const SATIR_Y = 36;

/** F60 — 5.000 PN sanallaştırılmış tablo. DOM'a yalnız görünen satırlar basılır. */
export const F60PnExplorer: FC = () => {
  const { data, loading } = useData(['pn'] as const);
  const setSeciliPn = useStore((s) => s.setSeciliPn);
  const kritiklikFiltresi = useStore((s) => s.kritiklikFiltresi);
  const modelFiltresi = useStore((s) => s.modelFiltresi);
  const durumFiltresi = useStore((s) => s.durumFiltresi);
  const arama = useStore((s) => s.arama);

  const [sirala, setSirala] = useState<{ k: keyof PnRow; yon: 1 | -1 }>({
    k: 'risk',
    yon: -1,
  });

  const kapsayici = useRef<HTMLDivElement>(null);

  const hepsi = useMemo(() => (data.pn ? tumSatirlar(data.pn) : []), [data.pn]);

  const satirlar = useMemo(() => {
    const f = filtrele(hepsi, {
      kritiklik: kritiklikFiltresi,
      model: modelFiltresi,
      durum: durumFiltresi,
      arama,
    });
    return f.sort((a, b) => {
      const x = a[sirala.k];
      const y = b[sirala.k];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * sirala.yon;
      return String(x).localeCompare(String(y), 'tr') * sirala.yon;
    });
  }, [hepsi, kritiklikFiltresi, modelFiltresi, durumFiltresi, arama, sirala]);

  const sanal = useVirtualizer({
    count: satirlar.length,
    getScrollElement: () => kapsayici.current,
    estimateSize: () => SATIR_Y,
    overscan: 12,
  });

  const modeller = useMemo(() => (data.pn ? [...data.pn.dict.model].sort() : []), [data.pn]);

  if (loading || !data.pn) return <Skeleton className="h-[520px] w-full" />;

  const csvIndir = () => {
    const basliklar = KOLONLAR.map((k) => k.ad).join(';');
    const govde = satirlar
      .map((r) => KOLONLAR.map((k) => String(r[k.k] ?? '')).join(';'))
      .join('\n');
    // Excel'in tr-TR ayrımını doğru okuması için BOM + noktalı virgül
    const blob = new Blob(['﻿' + basliklar + '\n' + govde], {
      type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pn-envanter-${satirlar.length}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tikla = (k: keyof PnRow) =>
    setSirala((s) => (s.k === k ? { k, yon: (s.yon * -1) as 1 | -1 } : { k, yon: -1 }));

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <FilterBar modeller={modeller} aramaGoster />
        <button
          type="button"
          onClick={csvIndir}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border border-tk-line px-2.5 py-1.5 text-xs font-medium text-tk-slate transition-colors duration-100 hover:border-tk-slate/40 hover:text-tk-ink"
        >
          <Download size={13} strokeWidth={2.2} />
          CSV indir
        </button>
      </div>

      <p className="mb-2 text-sm text-tk-slate">
        <strong className="tnum text-tk-ink">{sayi(satirlar.length)}</strong> / {sayi(hepsi.length)}{' '}
        PN listeleniyor
      </p>

      {satirlar.length === 0 ? (
        <EmptyState
          baslik="Filtreye uyan PN yok."
          yonerge="Kritiklik filtresini genişletin ya da aramayı temizleyin."
        />
      ) : (
        <div className="overflow-x-auto rounded border border-tk-line">
          <div style={{ minWidth: TOPLAM_GEN }}>
            {/* başlık */}
            <div className="flex border-b border-tk-line bg-tk-mist">
              {KOLONLAR.map((k) => (
                <button
                  key={k.k}
                  type="button"
                  onClick={() => tikla(k.k)}
                  style={{ width: k.gen }}
                  className={`flex shrink-0 items-center gap-0.5 px-3 py-2 text-xs font-semibold transition-colors duration-100 hover:text-tk-ink ${
                    k.sag ? 'justify-end' : ''
                  } ${sirala.k === k.k ? 'text-tk-ink' : 'text-tk-slate'}`}
                >
                  {k.ad}
                  {sirala.k === k.k &&
                    (sirala.yon === -1 ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                </button>
              ))}
            </div>

            {/* sanallaştırılmış gövde */}
            <div ref={kapsayici} className="h-[460px] overflow-y-auto">
              <div style={{ height: sanal.getTotalSize(), position: 'relative' }}>
                {sanal.getVirtualItems().map((v) => {
                  const r = satirlar[v.index];
                  return (
                    <div
                      key={r.pn}
                      onClick={() => setSeciliPn(r.pn)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSeciliPn(r.pn)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: v.size,
                        transform: `translateY(${v.start}px)`,
                      }}
                      className="flex cursor-pointer items-center border-b border-tk-line text-sm transition-colors duration-100 hover:bg-tk-mist"
                    >
                      {KOLONLAR.map((k) => (
                        <div
                          key={k.k}
                          style={{ width: k.gen }}
                          className={`tnum shrink-0 truncate px-3 ${k.sag ? 'text-right' : ''}`}
                        >
                          {k.bicim ? k.bicim(r) : String(r[k.k])}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default F60PnExplorer;
