import type { FC, ReactNode } from 'react';

export type BadgeTone = 'crit' | 'warn' | 'ok' | 'neutral' | 'ink';

const TONES: Record<BadgeTone, string> = {
  crit: 'bg-tk-red-wash text-tk-red-deep border-tk-red/25',
  warn: 'bg-[#FFF6E6] text-sig-warn border-sig-warn/25',
  ok: 'bg-[#E9F5F0] text-sig-ok border-sig-ok/25',
  neutral: 'bg-tk-mist text-tk-slate border-tk-line',
  ink: 'bg-tk-ink text-white border-tk-ink',
};

interface Props {
  tone?: BadgeTone;
  children: ReactNode;
  /** renk körlüğü için: renge ek olarak şekil/işaret taşıyan önek */
  icon?: ReactNode;
  className?: string;
  title?: string;
}

/**
 * Küçük durum rozeti. Renk tek başına anlam taşımaz —
 * metin her zaman durumu yazar (spec 1.6, renk körlüğü).
 */
export const Badge: FC<Props> = ({ tone = 'neutral', children, icon, className = '', title }) => (
  <span
    title={title}
    className={`inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide whitespace-nowrap ${TONES[tone]} ${className}`}
  >
    {icon}
    {children}
  </span>
);

export default Badge;
