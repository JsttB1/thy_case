import type { FC, ReactNode } from 'react';

/**
 * Yön veren boş durum (spec bölüm 6): ne yapılacağını söyler, özür dilemez.
 * "Filtreye uyan PN yok. Kritiklik filtresini genişletin."
 */
export const EmptyState: FC<{ baslik: string; yonerge?: string; aksiyon?: ReactNode }> = ({
  baslik,
  yonerge,
  aksiyon,
}) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
    <p className="text-base font-semibold">{baslik}</p>
    {yonerge && <p className="max-w-sm text-sm text-tk-slate">{yonerge}</p>}
    {aksiyon}
  </div>
);

export default EmptyState;
