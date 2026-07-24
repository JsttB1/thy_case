import type { FC } from 'react';
import { para, sayi, yuzde } from '../../lib/format';
import { AKSIYON_META, type Dagilim } from '../../lib/aiEngine';
import { CcEyebrow } from './ccUi';
import AksiyonRozeti from './aksiyonUi';

interface Props {
  dagilim: Dagilim;
}

/**
 * 5.000 PN'in aksiyonlara dağılımı — motorun tüm envanteri nasıl yönlendirdiği.
 * Yatay pay çubukları; segment sırası AKSIYON_SIRA (marka serisi sırası).
 */
export const DecisionRouter: FC<Props> = ({ dagilim }) => {
  const enBuyuk = Math.max(...dagilim.satirlar.map((s) => s.sayi), 1);

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <CcEyebrow>Karar Yönlendirici</CcEyebrow>
      <p className="mt-1.5 text-xs text-tk-slate">
        {sayi(dagilim.toplamPn)} PN aynı kural motorundan geçti — her biri tek bir aksiyona düştü
      </p>

      <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-3.5">
        {dagilim.satirlar.map((s) => {
          const meta = AKSIYON_META[s.aksiyon];
          const pay = (s.sayi / dagilim.toplamPn) * 100;
          return (
            <div key={s.aksiyon}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <AksiyonRozeti aksiyon={s.aksiyon} />
                <div className="flex items-baseline gap-2">
                  <span className="tnum font-display text-base font-bold text-tk-ink">
                    {sayi(s.sayi)}
                  </span>
                  <span className="tnum text-2xs text-tk-slate">{yuzde(pay)}</span>
                </div>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-tk-mist">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(2, (s.sayi / enBuyuk) * 100)}%`,
                    background: meta.renk,
                  }}
                />
              </div>
              {s.etki > 0 && (
                <div className="mt-1 text-2xs text-tk-slate">
                  {s.aksiyon === 'TRANSFER' ? 'serbest sermaye' : 'kapatma maliyeti'}{' '}
                  <span className="tnum font-semibold text-tk-ink">{para(s.etki)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-tk-line pt-3 text-2xs leading-relaxed text-tk-slate">
        İzle dışındaki her PN bir aksiyon taşıyor. Motor doğrusal "hepsini stokla" yerine PN başına en
        ucuz ve en hızlı yolu seçer.
      </div>
    </div>
  );
};

export default DecisionRouter;
