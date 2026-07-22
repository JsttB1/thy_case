import type { FC, ReactNode } from 'react';
import Badge from './Badge';

interface Props {
  title: string;
  /** başlığın altındaki tek satır yöntem notu — spec bölüm 6, zorunlu alışkanlık */
  method?: string;
  /** başlık şeridinin sağına giden içerik (filtre, link, legend) */
  action?: ReactNode;
  /** 'beta' ise başlıkta amber rozet */
  status?: 'live' | 'beta' | 'planned';
  id?: string;
  minHeight?: number;
  className?: string;
  /** iç dolguyu kaldır — tam kanama gerektiren bileşenler (F01 panosu, harita) için */
  bare?: boolean;
  children: ReactNode;
}

/**
 * Standart kart: beyaz yüzey, 1px tk-line kenarlık, 8px radius, gölgesiz.
 * Hover'da hafif gölge (spec 1.3).
 */
export const Card: FC<Props> = ({
  title,
  method,
  action,
  status,
  id,
  minHeight,
  className = '',
  bare = false,
  children,
}) => (
  <section
    aria-labelledby={id ? `${id}-baslik` : undefined}
    style={minHeight ? { minHeight } : undefined}
    className={`flex flex-col rounded border border-tk-line bg-tk-white transition-shadow duration-100 hover:shadow-sm ${className}`}
  >
    <header className={`flex items-start justify-between gap-4 ${bare ? 'px-5 pt-5' : 'p-5 pb-3'}`}>
      <div className="min-w-0">
        <h2
          id={id ? `${id}-baslik` : undefined}
          className="flex items-center gap-2 text-base font-semibold leading-tight"
        >
          {title}
          {status === 'beta' && <Badge tone="warn">beta</Badge>}
        </h2>
        {method && <p className="mt-1 text-xs text-tk-slate">{method}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
    <div className={`flex min-h-0 flex-1 flex-col ${bare ? '' : 'px-5 pb-5'}`}>{children}</div>
  </section>
);

export default Card;
