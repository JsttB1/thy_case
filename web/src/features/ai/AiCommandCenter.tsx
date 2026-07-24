import { useMemo, type FC } from 'react';
import { useData } from '../../data/useData';
import {
  hubTransferOnerileri,
  kararDagilimi,
  oneriFromRow,
  planlamaUfku,
  type Oneri,
} from '../../lib/aiEngine';
import { tumSatirlar } from '../../lib/pnRows';
import HeroBanner from './HeroBanner';
import NextBestAction from './NextBestAction';
import DecisionRouter from './DecisionRouter';
import PlanningHorizon from './PlanningHorizon';
import AlarmStream from './AlarmStream';
import HubTransfer from './HubTransfer';
import { CcPanel } from './ccUi';

const Yukleniyor: FC = () => (
  <div className="space-y-4">
    <div className="rounded border border-tk-line bg-tk-white p-6" style={{ minHeight: 260 }}>
      <div className="h-6 w-72 animate-pulse rounded bg-tk-mist" />
      <div className="mt-3 h-4 w-96 animate-pulse rounded bg-tk-mist" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-tk-mist" />
        ))}
      </div>
    </div>
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 h-80 animate-pulse rounded border border-tk-line bg-tk-white lg:col-span-7" />
      <div className="col-span-12 h-80 animate-pulse rounded border border-tk-line bg-tk-white lg:col-span-5" />
    </div>
  </div>
);

export const AiCommandCenter: FC = () => {
  const { data, loading } = useData(['pn', 'inventory', 'kpi', 'stations'] as const);

  const dagilim = useMemo(() => (data.pn ? kararDagilimi(data.pn) : null), [data.pn]);
  const ufuk = useMemo(() => (data.pn ? planlamaUfku(data.pn) : null), [data.pn]);

  // Tüm 5.000 PN için öneri — kuyruk her aksiyon türünü (exchange/sipariş/tamir/
  // transfer) barındırsın diye tam taramadan gelir. İzle dışı, önceliğe göre sıralı.
  const oneriler: Oneri[] = useMemo(() => {
    if (!data.pn) return [];
    return tumSatirlar(data.pn)
      .map(oneriFromRow)
      .filter((o) => o.aksiyon !== 'IZLE')
      .sort((a, b) => b.oncelik - a.oncelik || a.kalan - b.kalan);
  }, [data.pn]);

  const alarmlar = useMemo(
    () =>
      oneriler
        .filter((o) => o.aciliyet === 'GECIKMIS' && o.krit === 'AOG KRİTİK')
        .sort((a, b) => a.kalan - b.kalan),
    [oneriler],
  );

  const transferler = useMemo(
    () =>
      data.inventory && data.stations
        ? hubTransferOnerileri(data.inventory.topFazla, data.stations.stations, 9)
        : [],
    [data.inventory, data.stations],
  );

  if (loading || !data.pn || !data.kpi || !data.inventory || !data.stations || !dagilim || !ufuk) {
    return <Yukleniyor />;
  }

  return (
    <div className="space-y-4">
      {/* kahraman */}
      <CcPanel className="animate-ai-rise" style={{ animationDelay: '0ms' }}>
        <HeroBanner kpi={data.kpi} dagilim={dagilim} stations={data.stations.stations} />
      </CcPanel>

      {/* açıklanabilir AI + önerilen aksiyon (KPI'ların yerine) */}
      <CcPanel className="animate-ai-rise" style={{ animationDelay: '80ms' }}>
        <NextBestAction pn={data.pn} />
      </CcPanel>

      {/* karar yönlendirici + canlı alarm akışı */}
      <div className="grid grid-cols-12 gap-4">
        <CcPanel className="col-span-12 animate-ai-rise lg:col-span-7" style={{ animationDelay: '160ms' }}>
          <DecisionRouter dagilim={dagilim} />
        </CcPanel>
        <CcPanel className="col-span-12 animate-ai-rise lg:col-span-5" style={{ animationDelay: '220ms' }}>
          <AlarmStream alarmlar={alarmlar} toplamGecikmis={data.kpi.gecikmisPn} />
        </CcPanel>
      </div>

      {/* planlama ufku */}
      <CcPanel className="animate-ai-rise" style={{ animationDelay: '300ms' }}>
        <PlanningHorizon ufuk={ufuk} />
      </CcPanel>

      {/* hub transfer */}
      <CcPanel className="animate-ai-rise" style={{ animationDelay: '360ms' }}>
        <HubTransfer transferler={transferler} />
      </CcPanel>

      {/* dipnot */}
      <p className="px-1 pt-1 text-2xs leading-relaxed text-tk-slate">
        AI Karar Motoru tarayıcı içinde çalışan deterministik bir kural motorudur — harici API ya da
        model çağrısı yoktur. Kararlar min-max durumu, sipariş geri sayımı, tedarik kanalı, kritiklik
        ve lead time sinyallerinden türetilir ve her biri gerekçesiyle açıklanır. Veriler sentetiktir
        (case dokümanıyla verilen dummy set); hub kaynak/hedef eşlemesi temsilidir.
      </p>
    </div>
  );
};

export default AiCommandCenter;
