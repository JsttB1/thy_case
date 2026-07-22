import type { FC } from 'react';
import { useDatum } from '../data/useData';

/** Kalıcı veri uyarısı + tek satır yöntem özeti (spec bölüm 6). */
export const Footer: FC = () => {
  const meta = useDatum('meta').data;

  return (
    <footer className="mt-10 border-t border-tk-line bg-tk-white">
      <div className="mx-auto max-w-shell space-y-1.5 px-4 py-6 text-xs text-tk-slate md:px-8">
        <p>
          {meta?.uyari ??
            'Veriler sentetiktir; case dokümanıyla verilen dummy set kullanılmıştır. Gerçek THY/AMOS verisi değildir.'}
        </p>
        {meta?.yontem && (
          <p>
            <span className="font-semibold text-tk-ink">Yöntem:</span> {meta.yontem}
          </p>
        )}
      </div>
    </footer>
  );
};

export default Footer;
