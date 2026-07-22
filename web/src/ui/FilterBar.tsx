import type { FC } from 'react';
import { X } from 'lucide-react';
import type { Durum, Kritiklik } from '../data/types';
import { useStore } from '../store';

const KRITIKLIKLER: Kritiklik[] = ['AOG KRİTİK', 'KRİTİK', 'KRİTİK DEĞİL'];
const DURUMLAR: Durum[] = ['AÇIK', 'DENGEDE', 'FAZLA'];

const Chip: FC<{ aktif: boolean; onClick: () => void; children: React.ReactNode }> = ({
  aktif,
  onClick,
  children,
}) => (
  <button
    type="button"
    aria-pressed={aktif}
    onClick={onClick}
    className={`rounded-[4px] border px-2 py-1 text-xs font-medium transition-colors duration-100 ${
      aktif
        ? 'border-tk-red bg-tk-red-wash text-tk-red-deep'
        : 'border-tk-line bg-tk-white text-tk-slate hover:border-tk-slate/40 hover:text-tk-ink'
    }`}
  >
    {children}
  </button>
);

interface Props {
  modeller?: string[];
  durumGoster?: boolean;
  aramaGoster?: boolean;
}

/**
 * Ortak filtre şeridi — store'a bağlı, böylece F22 ve F60 aynı seçimi paylaşır.
 * Boş seçim "hepsi" demek.
 */
export const FilterBar: FC<Props> = ({ modeller, durumGoster = true, aramaGoster = false }) => {
  const s = useStore();
  const aktifSayi =
    s.kritiklikFiltresi.length +
    s.modelFiltresi.length +
    s.durumFiltresi.length +
    (s.arama.trim() ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow mr-0.5">kritiklik</span>
        {KRITIKLIKLER.map((k) => (
          <Chip
            key={k}
            aktif={s.kritiklikFiltresi.includes(k)}
            onClick={() => s.toggleKritiklik(k)}
          >
            {k}
          </Chip>
        ))}
      </div>

      {durumGoster && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="eyebrow mr-0.5">durum</span>
          {DURUMLAR.map((d) => (
            <Chip
              key={d}
              aktif={s.durumFiltresi.includes(d)}
              onClick={() =>
                s.setDurum(
                  s.durumFiltresi.includes(d)
                    ? s.durumFiltresi.filter((x) => x !== d)
                    : [...s.durumFiltresi, d],
                )
              }
            >
              {d}
            </Chip>
          ))}
        </div>
      )}

      {modeller && modeller.length > 0 && (
        <label className="flex items-center gap-1.5">
          <span className="eyebrow">model</span>
          <select
            value={s.modelFiltresi[0] ?? ''}
            onChange={(e) => s.setModel(e.target.value ? [e.target.value] : [])}
            className="rounded-[4px] border border-tk-line bg-tk-white px-2 py-1 text-xs text-tk-ink"
          >
            <option value="">Tümü</option>
            {modeller.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      )}

      {aramaGoster && (
        <input
          type="search"
          value={s.arama}
          onChange={(e) => s.setArama(e.target.value)}
          placeholder="PN ya da alt kategori ara"
          className="w-56 rounded-[4px] border border-tk-line bg-tk-white px-2 py-1 text-xs placeholder:text-tk-slate/60"
        />
      )}

      {aktifSayi > 0 && (
        <button
          type="button"
          onClick={s.filtreleriSifirla}
          className="inline-flex items-center gap-1 text-xs font-medium text-tk-slate transition-colors duration-100 hover:text-tk-red"
        >
          <X size={12} strokeWidth={2.5} />
          {aktifSayi} filtreyi temizle
        </button>
      )}
    </div>
  );
};

export default FilterBar;
