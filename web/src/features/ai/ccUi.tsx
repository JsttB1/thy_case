import type { CSSProperties, FC, ReactNode } from 'react';

/**
 * AI Karar Merkezi kabuk parçaları — THY açık teması (spec 1.1/1.3).
 * Beyaz yüzey, 1px tk-line kenarlık, 8px radius, gölgesiz; hover'da hafif gölge.
 */

export const CcEyebrow: FC<{ children: ReactNode; renk?: string; className?: string }> = ({
  children,
  renk,
  className = '',
}) => (
  <div
    className={`flex items-center gap-2 font-display text-2xs font-bold uppercase tracking-[.12em] ${
      renk ? '' : 'text-tk-slate'
    } ${className}`}
    style={renk ? { color: renk } : undefined}
  >
    <span
      className="inline-block h-2.5 w-0.5 rounded-full"
      style={{ background: renk ?? '#5A6472' }}
    />
    {children}
  </div>
);

interface PanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const CcPanel: FC<PanelProps> = ({ children, className = '', style }) => (
  <div
    className={`relative flex flex-col overflow-hidden rounded border border-tk-line bg-tk-white transition-shadow duration-100 hover:shadow-sm ${className}`}
    style={style}
  >
    {children}
  </div>
);

/** 0–100 yatay güven/oran metresi — renk körlüğü için değeri de yazar. */
export const GuvenMeter: FC<{ deger: number; renk?: string; etiket?: string }> = ({
  deger,
  renk = '#0E8A5F',
  etiket,
}) => (
  <div className="flex items-center gap-2">
    <div className="relative h-1.5 w-14 overflow-hidden rounded-full bg-tk-line">
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${Math.max(4, Math.min(100, deger))}%`, background: renk }}
      />
    </div>
    <span className="tnum text-2xs font-semibold text-tk-slate">{etiket ?? `%${deger}`}</span>
  </div>
);
