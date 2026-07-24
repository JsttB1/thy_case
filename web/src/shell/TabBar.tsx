import { useEffect, useRef, type FC } from 'react';
import {
  AlertTriangle,
  Boxes,
  Gauge,
  Map as MapIcon,
  Sparkles,
  SlidersHorizontal,
  Table,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { TABS, needsByTab, type IconName, type TabId } from '../registry';
import { useStore } from '../store';
import { prefetch } from '../data/useData';

const IKONLAR: Record<IconName, LucideIcon> = {
  ai: Sparkles,
  gauge: Gauge,
  trending: TrendingUp,
  boxes: Boxes,
  alert: AlertTriangle,
  map: MapIcon,
  sliders: SlidersHorizontal,
  table: Table,
};

export const TabBar: FC = () => {
  const aktif = useStore((s) => s.aktifSekme);
  const setSekme = useStore((s) => s.setSekme);
  const listRef = useRef<HTMLDivElement>(null);

  // aktif sekme yatay kaydırmada görünür kalsın (dar ekran / projeksiyon)
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [aktif]);

  const sec = (id: TabId) => {
    setSekme(id);
    prefetch(needsByTab(id));
  };

  const klavye = (e: React.KeyboardEvent, i: number) => {
    const yon = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!yon) return;
    e.preventDefault();
    const sonraki = TABS[(i + yon + TABS.length) % TABS.length];
    sec(sonraki.id);
    listRef.current
      ?.querySelectorAll<HTMLElement>('[role="tab"]')
      [TABS.indexOf(sonraki)]?.focus();
  };

  return (
    <nav className="sticky top-header z-30 border-b border-tk-line bg-tk-white">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Dashboard sekmeleri"
        className="no-scrollbar mx-auto flex h-tabbar max-w-shell items-stretch gap-1 overflow-x-auto px-4 md:px-8"
      >
        {TABS.map((t, i) => {
          const Ikon = IKONLAR[t.icon];
          const secili = aktif === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={secili}
              aria-controls={`panel-${t.id}`}
              tabIndex={secili ? 0 : -1}
              onClick={() => sec(t.id)}
              onKeyDown={(e) => klavye(e, i)}
              onMouseEnter={() => prefetch(needsByTab(t.id))}
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 text-sm font-medium transition-colors duration-100 ${
                secili ? 'text-tk-ink' : 'text-tk-slate hover:text-tk-ink'
              }`}
            >
              <Ikon size={15} strokeWidth={secili ? 2.4 : 2} />
              {t.label}
              {/* aktif göstergesi: 2px tk-red alt çizgi (spec 1.3) */}
              <span
                aria-hidden="true"
                className={`absolute inset-x-2 bottom-0 h-0.5 rounded-t bg-tk-red transition-opacity duration-100 ${
                  secili ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabBar;
