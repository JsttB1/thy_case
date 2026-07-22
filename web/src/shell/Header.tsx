import type { FC } from 'react';
import { Info } from 'lucide-react';
import { useStore, type FiloYili } from '../store';
import { useDatum } from '../data/useData';
import TulipMark from './TulipMark';

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

  return (
    <header className="sticky top-0 z-40 border-b border-tk-line bg-tk-white/95 backdrop-blur">
      <div className="mx-auto flex h-header max-w-shell items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <TulipMark size={30} />
          <div className="min-w-0">
            <h1
              className="truncate font-display text-lg font-bold uppercase leading-none"
              style={{ letterSpacing: '.06em' }}
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
          <span
            title={meta?.uyari}
            className="hidden items-center gap-1.5 rounded-[4px] border border-tk-line bg-tk-mist px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-tk-slate lg:inline-flex"
          >
            <Info size={12} strokeWidth={2.5} />
            sentetik veri
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
