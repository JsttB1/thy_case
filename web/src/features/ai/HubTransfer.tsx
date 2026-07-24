import type { FC } from 'react';
import { ArrowRight, Plane } from 'lucide-react';
import { para } from '../../lib/format';
import { kritiklikKisa, kritiklikTonu } from '../../lib/countdown';
import type { HubTransfer as HubTransferOneri } from '../../lib/aiEngine';
import { useStore } from '../../store';
import { Badge } from '../../ui';
import { CcEyebrow } from './ccUi';
import AksiyonRozeti from './aksiyonUi';

interface Props {
  transferler: HubTransferOneri[];
}

/**
 * Hub transfer önerileri — merkezî depodaki fazla üniteyi kapsama açığı olan
 * istasyona it. Per-hub PN stoğu sentetik sette olmadığından kaynak/hedef eşlemesi
 * temsilidir; karar mantığı gerçek (fazla → açık istasyon, satınalma gerekmez).
 */
export const HubTransfer: FC<Props> = ({ transferler }) => {
  const setSeciliPn = useStore((s) => s.setSeciliPn);
  const toplam = transferler.reduce((a, t) => a + t.tasarruf, 0);

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <AksiyonRozeti aksiyon="TRANSFER" />
            <CcEyebrow renk="#0E8A5F">Hub Transfer Önerileri</CcEyebrow>
          </div>
          <p className="mt-1.5 text-xs text-tk-slate">
            fazla üniteyi depodan açık istasyona aktar — satınalma yerine yeniden dağıt
          </p>
        </div>
        <div className="text-right">
          <div className="tnum font-display text-lg font-extrabold text-sig-ok">{para(toplam)}</div>
          <div className="text-2xs text-tk-slate">yeniden değerlenen sermaye</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {transferler.map((t) => (
          <button
            key={t.pn}
            type="button"
            onClick={() => setSeciliPn(t.pn)}
            className="group flex flex-col gap-3 rounded-lg border border-tk-line bg-tk-white p-3 text-left transition-all duration-100 hover:border-sig-ok/40 hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="tnum font-mono text-sm font-semibold text-tk-ink">{t.pn}</span>
              <Badge tone={kritiklikTonu(t.krit)}>{kritiklikKisa(t.krit)}</Badge>
            </div>
            <div className="truncate text-2xs text-tk-slate">{t.sub}</div>

            {/* kaynak → hedef */}
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 rounded-md border border-tk-line bg-tk-mist px-2 py-1.5">
                <div className="flex items-center gap-1 text-2xs text-tk-slate">
                  <Plane size={10} strokeWidth={2.2} /> kaynak
                </div>
                <div className="tnum font-display text-sm font-bold text-tk-ink">{t.kaynak.kod}</div>
                <div className="truncate text-[10px] text-tk-slate">{t.kaynak.ad}</div>
              </div>
              <ArrowRight
                size={16}
                className="shrink-0 text-sig-ok transition-transform duration-100 group-hover:translate-x-0.5"
              />
              <div className="min-w-0 flex-1 rounded-md border border-sig-ok/25 bg-[#E9F5F0] px-2 py-1.5">
                <div className="text-2xs text-sig-ok">hedef</div>
                <div className="tnum font-display text-sm font-bold text-sig-ok">{t.hedef.kod}</div>
                <div className="truncate text-[10px] text-tk-slate">{t.hedef.ad}</div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-tk-line pt-2">
              <span className="tnum text-2xs text-tk-slate">
                <span className="font-display text-sm font-bold text-tk-ink">{t.adet}</span> adet
              </span>
              <span className="tnum text-2xs font-semibold text-sig-ok">{para(t.tasarruf)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HubTransfer;
