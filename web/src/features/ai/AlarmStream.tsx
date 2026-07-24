import type { FC } from 'react';
import { AlertTriangle } from 'lucide-react';
import { gunSayi, sayi } from '../../lib/format';
import { AKSIYON_META, type Oneri } from '../../lib/aiEngine';
import { useStore } from '../../store';
import { CcEyebrow } from './ccUi';

interface Props {
  alarmlar: Oneri[];
  toplamGecikmis: number;
}

/**
 * Canlı alarm akışı — sipariş tarihi geçmiş kritik kalemler. Kırmızı nabız ile
 * dikkat çeker; satıra tıkla → PN çekmecesi. (Marka: tek kırmızı aksan.)
 */
export const AlarmStream: FC<Props> = ({ alarmlar, toplamGecikmis }) => {
  const setSeciliPn = useStore((s) => s.setSeciliPn);
  const liste = alarmlar.slice(0, 9);

  return (
    <div className="relative flex h-full flex-col overflow-hidden p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-tk-red" strokeWidth={2.4} />
          <CcEyebrow renk="#E81932">Canlı Alarm Akışı</CcEyebrow>
        </div>
        <span className="tnum rounded-full border border-tk-red/25 bg-tk-red-wash px-2 py-0.5 text-2xs font-bold text-tk-red-deep">
          {sayi(toplamGecikmis)} gecikmiş
        </span>
      </div>
      <p className="mt-1.5 text-xs text-tk-slate">sipariş tarihi geçmiş kritik kalemler</p>

      <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {liste.map((o, i) => {
          const meta = AKSIYON_META[o.aksiyon];
          return (
            <button
              key={o.pn}
              type="button"
              onClick={() => setSeciliPn(o.pn)}
              style={{ animationDelay: `${i * 55}ms` }}
              className="flex w-full animate-ai-rise items-center gap-3 rounded-md border border-tk-line bg-tk-white px-3 py-2 text-left transition-colors duration-100 hover:bg-tk-mist"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tk-red opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-tk-red" />
              </span>
              <span className="tnum font-mono text-xs font-semibold text-tk-ink">{o.pn}</span>
              <span className="min-w-0 flex-1 truncate text-2xs text-tk-slate">
                {o.sub} · {o.model}
              </span>
              <span
                className="hidden shrink-0 rounded-[3px] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:inline-block"
                style={{ color: '#fff', background: meta.renk }}
              >
                {meta.etiket}
              </span>
              <span className="tnum shrink-0 font-display text-sm font-bold text-tk-red">
                {gunSayi(o.kalan)}g
              </span>
            </button>
          );
        })}
        {liste.length === 0 && (
          <div className="py-8 text-center text-xs text-tk-slate">
            Gecikmiş kritik kalem yok. Geri sayım güvenli aralıkta.
          </div>
        )}
      </div>
    </div>
  );
};

export default AlarmStream;
