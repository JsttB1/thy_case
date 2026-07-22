import type { FC } from 'react';
import { useDatum } from '../../data/useData';
import { adetKisa, para, sayi, yuzdeIsaretli } from '../../lib/format';
import { KpiStat, Skeleton } from '../../ui';

/** F02 — 6 kartlık KPI şeridi. Değerler ilk görünürlükte 600ms count-up. */
export const F02KpiStrip: FC = () => {
  const { data: k, loading } = useDatum('kpi');

  if (loading || !k) {
    return (
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-6 md:grid-cols-3 lg:grid-cols-6">
      <KpiStat
        etiket="Filo"
        deger={sayi(k.ucak2033)}
        countTo={k.ucak2033}
        bicim={(v) => sayi(v)}
        alt={`${sayi(k.ucak2025)} uçaktan`}
        rozet={{ tone: 'neutral', text: yuzdeIsaretli(k.filoBuyume) }}
      />
      <KpiStat
        etiket="Yıllık talep"
        deger={sayi(k.talep33)}
        countTo={k.talep33}
        bicim={(v) => sayi(v)}
        alt={`${sayi(k.talep25)} adetten`}
        rozet={{ tone: 'neutral', text: yuzdeIsaretli(k.talepBuyume) }}
      />
      <KpiStat
        etiket="Önerilen min stok"
        deger={sayi(k.min33)}
        countTo={k.min33}
        bicim={(v) => sayi(v)}
        alt={`${sayi(k.min25)} adetten`}
        rozet={{ tone: 'ok', text: yuzdeIsaretli(k.minBuyume) }}
      />
      <KpiStat
        etiket="Bağlı sermaye"
        deger={para(k.degerFmv)}
        countTo={k.degerFmv}
        bicim={(v) => para(v)}
        alt="FMV · elde + pipeline"
      />
      <KpiStat
        etiket="Gecikmiş sipariş"
        deger={sayi(k.gecikmisPn)}
        countTo={k.gecikmisPn}
        bicim={(v) => sayi(v)}
        tone="crit"
        alt="PN"
        rozet={{ tone: 'crit', text: `${sayi(k.gecikmisAog)} AOG` }}
      />
      <KpiStat
        etiket="Atıl sermaye"
        deger={para(k.atilDeger)}
        countTo={k.atilDeger}
        bicim={(v) => para(v)}
        tone="warn"
        alt={`${adetKisa(k.atilAdet)} adet`}
      />
    </div>
  );
};

export default F02KpiStrip;
