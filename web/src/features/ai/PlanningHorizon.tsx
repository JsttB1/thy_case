import type { FC } from 'react';
import { CalendarClock } from 'lucide-react';
import { para, sayi } from '../../lib/format';
import type { UfukId, UfukSatir } from '../../lib/aiEngine';
import { CcEyebrow } from './ccUi';

interface UfukMeta {
  baslik: string;
  pencere: string;
  aksiyon: string;
  renk: string;
}

const META: Record<UfukId, UfukMeta> = {
  bugun: {
    baslik: 'Bugün',
    pencere: 'sipariş tarihi geçmiş',
    aksiyon: 'Exchange / acil sipariş — köprüle',
    renk: '#E81932', // tk-red
  },
  ay: {
    baslik: '0–30 gün',
    pencere: 'acil pencere',
    aksiyon: 'Sipariş / tamir emrini aç',
    renk: '#C77700', // sig-warn
  },
  ceyrek: {
    baslik: '30–90 gün',
    pencere: 'yaklaşan',
    aksiyon: 'Tedarik planla, bütçe ayır',
    renk: '#5A6472', // tk-slate
  },
  uzun: {
    baslik: '90 gün → 2033',
    pencere: 'stratejik',
    aksiyon: 'İç atölye yatırımı · havuzlama · transfer',
    renk: '#0E8A5F', // sig-ok
  },
};

interface Props {
  ufuk: UfukSatir[];
}

/**
 * Planlama ufku — sipariş geri sayımının kova görünümü. Soldan sağa aciliyet
 * azalır; motor kısa vadede "köprüle", uzun vadede "yapısal çöz" der.
 */
export const PlanningHorizon: FC<Props> = ({ ufuk }) => {
  const toplam = ufuk.reduce((a, u) => a + u.sayi, 0) || 1;

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <CalendarClock size={14} className="text-tk-slate" strokeWidth={2.2} />
        <CcEyebrow>Planlama Ufku · kısa → uzun vade</CcEyebrow>
      </div>
      <p className="mt-1.5 text-xs text-tk-slate">
        her PN son sipariş tarihine kalan güne göre bir pencereye düşer
      </p>

      <div className="mt-5 grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
        {ufuk.map((u) => {
          const m = META[u.id];
          const pay = Math.round((u.sayi / toplam) * 100);
          return (
            <div
              key={u.id}
              className="relative flex flex-col overflow-hidden rounded-lg border border-tk-line bg-tk-mist/50 p-3"
            >
              <div className="absolute left-0 top-0 h-1 w-full" style={{ background: m.renk }} />
              <div
                className="mt-1 font-display text-2xs font-bold uppercase tracking-wide"
                style={{ color: m.renk }}
              >
                {m.baslik}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-tk-slate">
                {m.pencere}
              </div>
              <div className="tnum mt-2 font-display text-2xl font-extrabold text-tk-ink">
                {sayi(u.sayi)}
              </div>
              <div className="text-2xs text-tk-slate">PN · %{pay}</div>
              {u.etki > 0 && <div className="tnum mt-1 text-2xs text-tk-slate">{para(u.etki)}</div>}
              <div className="mt-auto pt-2 text-2xs leading-snug text-tk-ink">{m.aksiyon}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlanningHorizon;
