import { useMemo, useState, type FC } from 'react';
import { useData } from '../../data/useData';
import { adetKisa, para, sayi, yuzdeIsaretli } from '../../lib/format';
import { tatCoz } from '../../lib/inventory';
import { Skeleton } from '../../ui';
import Slider from '../../ui/Slider';

/**
 * F52 — TAT kaldıracı (Little's Law).
 * dolaşımdaki ihtiyaç = sökülme hızı × döngü süresi.
 * TAT %20 kısalırsa dolaşımda tutulması gereken adet de %20 azalır — doğrusal.
 */
export const F52TatLever: FC = () => {
  const { data, loading } = useData(['pn', 'kpi'] as const);
  const [tat, setTat] = useState(0);

  const baz = useMemo(() => (data.pn ? tatCoz(data.pn, 0) : null), [data.pn]);
  const simdi = useMemo(
    () => (data.pn && baz ? tatCoz(data.pn, tat / 100, baz.dolasimAdet) : null),
    [data.pn, baz, tat],
  );

  if (loading || !data.pn || !data.kpi || !baz || !simdi) return <Skeleton className="h-80 w-full" />;

  const farkSermaye = simdi.dolasimSermaye - baz.dolasimSermaye;
  const azalma = tat < 0;

  return (
    <div className="flex flex-1 flex-col">
      <Slider
        etiket="Atölye TAT değişimi"
        min={-40}
        max={40}
        adim={5}
        deger={tat}
        goster={yuzdeIsaretli(tat, 0)}
        onChange={setTat}
        ipucu="döngü süresi (turn around time) kısalır ya da uzar"
      />

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <div className="eyebrow">dolaşımdaki ihtiyaç</div>
          <div className="tnum font-display text-2xl font-extrabold leading-none tracking-[-.02em]">
            {adetKisa(simdi.dolasimAdet)}
          </div>
          <div className="mt-0.5 text-xs text-tk-slate">
            adet · baz durumda {adetKisa(baz.dolasimAdet)}
          </div>
        </div>
        <div>
          <div className="eyebrow">bağlı sermaye</div>
          <div className="tnum font-display text-2xl font-extrabold leading-none tracking-[-.02em]">
            {para(simdi.dolasimSermaye)}
          </div>
          <div className="mt-0.5 text-xs text-tk-slate">
            baz durumda {para(baz.dolasimSermaye)}
          </div>
        </div>
      </div>

      {tat !== 0 && (
        <div
          className={`mt-4 rounded border px-4 py-3 ${
            azalma ? 'border-sig-ok/30 bg-[#E9F5F0]' : 'border-sig-warn/30 bg-[#FFF6E6]'
          }`}
        >
          <div className={`eyebrow ${azalma ? 'text-sig-ok' : 'text-sig-warn'}`}>
            {azalma ? 'serbest kalan sermaye' : 'ek bağlanan sermaye'}
          </div>
          <div
            className={`tnum font-display text-2xl font-extrabold tracking-[-.02em] leading-none ${
              azalma ? 'text-sig-ok' : 'text-sig-warn'
            }`}
          >
            {para(Math.abs(farkSermaye))}
          </div>
          <p className="mt-1 text-sm text-tk-ink">
            {sayi(Math.abs(simdi.farkAdet), 0)} adet {azalma ? 'daha az' : 'daha fazla'} yedek
            dolaşımda tutulmalı.
          </p>
        </div>
      )}

      <div className="mt-4 rounded border border-tk-line bg-tk-mist/50 px-4 py-3">
        <div className="eyebrow mb-1">bugünkü pipeline</div>
        <div className="flex items-baseline gap-3">
          <span className="tnum font-display text-xl font-extrabold tracking-[-.02em]">
            {sayi(data.kpi.pipelineAdet)}
          </span>
          <span className="text-sm text-tk-slate">adet · {para(40196930)} bağlı</span>
        </div>
      </div>

      <p className="mt-auto pt-4 text-sm leading-relaxed text-tk-slate">
        <strong className="text-tk-ink">
          Envanter probleminin bir kısmı satın alma değil, süreç problemi.
        </strong>{' '}
        Little&apos;s Law&apos;a göre dolaşımda tutulması gereken adet, döngü süresiyle doğru
        orantılı: atölye TAT&apos;ını kısaltmak yeni parça almadan aynı servis seviyesini verir.
        Karekök yasasının aksine bu kaldıraç doğrusal çalışır — TAT&apos;taki her yüzde bir,
        ihtiyaçta yüzde bir.
      </p>
    </div>
  );
};

export default F52TatLever;
