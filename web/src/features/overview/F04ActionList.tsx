import type { FC } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useData } from '../../data/useData';
import { para, sayi } from '../../lib/format';
import { useStore } from '../../store';
import type { TabId } from '../../registry';
import { Skeleton } from '../../ui';

interface Aksiyon {
  sayi: string;
  cumle: string;
  hedef: TabId;
  hedefAd: string;
  ton: 'crit' | 'warn' | 'neutral';
}

/** F04 — Bugünün aksiyon listesi: sayı + tek cümle + ilgili sekmeye link. */
export const F04ActionList: FC = () => {
  const { data, loading } = useData(['inventory', 'kpi'] as const);
  const setSekme = useStore((s) => s.setSekme);

  if (loading || !data.kpi || !data.inventory) return <Skeleton rows={5} />;

  const k = data.kpi;

  const aksiyonlar: Aksiyon[] = [
    {
      sayi: sayi(k.gecikmisAog),
      cumle: 'AOG kritik PN\'de sipariş tarihi çoktan geçmiş — bunlar bugün sipariş edilmeli.',
      hedef: 'inventory',
      hedefAd: 'Envanter Sağlığı',
      ton: 'crit',
    },
    {
      sayi: sayi(k.acikPnAog),
      cumle: `AOG kritik PN min stoğun altında; kapatma maliyeti ${para(k.acikMaliyet)}.`,
      hedef: 'inventory',
      hedefAd: 'Envanter Sağlığı',
      ton: 'crit',
    },
    {
      sayi: sayi(k.riskHigh),
      cumle: 'PN 70 üzeri AOG risk skorunda — lead time ve atölye kabiliyeti birlikte zayıf.',
      hedef: 'risk',
      hedefAd: 'Risk & Kritiklik',
      ton: 'warn',
    },
    {
      sayi: para(k.atilDeger),
      cumle: `atıl stokta duruyor (${sayi(k.atilAdet)} adet) — ${sayi(k.scrapOneriPn)} kalemde tamir maliyeti yeni alımı aşıyor.`,
      hedef: 'inventory',
      hedefAd: 'Envanter Sağlığı',
      ton: 'warn',
    },
    {
      sayi: sayi(k.intermittent),
      cumle: 'PN kesikli talep gösteriyor; klasik ortalama yöntemi bu kalemlerde stok fazlası üretir.',
      hedef: 'demand',
      hedefAd: 'Talep & Tahmin',
      ton: 'neutral',
    },
  ];

  const TON: Record<Aksiyon['ton'], string> = {
    crit: 'text-sig-crit',
    warn: 'text-sig-warn',
    neutral: 'text-tk-ink',
  };

  return (
    <ol className="flex flex-1 flex-col divide-y divide-tk-line">
      {aksiyonlar.map((a, i) => (
        <li key={i} className="flex-1">
          <button
            type="button"
            onClick={() => setSekme(a.hedef)}
            className="group flex h-full w-full items-start gap-3 py-3 text-left transition-colors duration-100 hover:bg-tk-mist/60"
          >
            <span
              className={`tnum shrink-0 font-display text-lg font-bold leading-snug ${TON[a.ton]}`}
            >
              {a.sayi}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-relaxed text-tk-ink">{a.cumle}</span>
              <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-tk-slate transition-colors duration-100 group-hover:text-tk-red">
                {a.hedefAd}
                <ArrowUpRight size={12} strokeWidth={2.5} />
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
};

export default F04ActionList;
