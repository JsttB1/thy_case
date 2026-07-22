import { useState, type FC } from 'react';
import { HelpCircle, Info } from 'lucide-react';
import { useStore, type FiloYili } from '../store';
import { useDatum } from '../data/useData';
import TulipMark from './TulipMark';
import GlossaryModal from './GlossaryModal';

const YILLAR: FiloYili[] = [2025, 2033];

/** Filo yılı segmented control — tüm sekmelerdeki yıl bağımlı görseller buna bağlanır. */
const YilSecici: FC = () => {
  const filoYili = useStore((s) => s.filoYili);
  const setFiloYili = useStore((s) => s.setFiloYili);

  return (
    <div
      role="group"
      aria-label="Filo yılı"
      className="flex rounded border border-tk-line bg-tk-mist p-0.5"
    >
      {YILLAR.map((y) => {
        const aktif = filoYili === y;
        return (
          <button
            key={y}
            type="button"
            aria-pressed={aktif}
            onClick={() => setFiloYili(y)}
            className={`tnum rounded-[5px] px-3 py-1 font-display text-sm font-semibold tracking-wide transition-colors duration-100 ${
              aktif ? 'bg-tk-white text-tk-ink shadow-sm' : 'text-tk-slate hover:text-tk-ink'
            }`}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
};

export const Header: FC = () => {
  const meta = useDatum('meta').data;
  const [sozlukAcik, setSozlukAcik] = useState(false);

  return (
    // yükseklik kenarlık dahil tam 64px olmalı: sekme çubuğu top-header (64px) ile
    // buraya yapışıyor, 1px fazlası çubuğu başlığın altına kaydırıyor
    <header className="sticky top-0 z-40 box-border h-header border-b border-tk-line bg-tk-white/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-shell items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <TulipMark size={30} />
          <div className="min-w-0">
            <h1
              className="truncate font-display text-lg font-extrabold uppercase leading-none"
              style={{ letterSpacing: '.035em' }}
            >
              {meta?.baslik ?? 'Envanter Kontrol Kulesi'}
            </h1>
            <p className="mt-0.5 hidden truncate text-xs text-tk-slate sm:block">
              {meta?.altBaslik ?? '1.200 → 2.000 uçak · komponent envanter karar destek sistemi'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <YilSecici />
          <button
            type="button"
            onClick={() => setSozlukAcik(true)}
            aria-label="Terimler sözlüğü"
            title="Terimler sözlüğü"
            className="rounded border border-tk-line p-1.5 text-tk-slate transition-colors duration-100 hover:border-tk-slate/40 hover:text-tk-ink"
          >
            <HelpCircle size={15} strokeWidth={2.2} />
          </button>
          <span
            title={meta?.uyari}
            className="hidden items-center gap-1.5 rounded-[4px] border border-tk-line bg-tk-mist px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-tk-slate lg:inline-flex"
          >
            <Info size={12} strokeWidth={2.5} />
            sentetik veri
          </span>
        </div>
      </div>

      <GlossaryModal acik={sozlukAcik} onKapat={() => setSozlukAcik(false)} />
    </header>
  );
};

export default Header;
