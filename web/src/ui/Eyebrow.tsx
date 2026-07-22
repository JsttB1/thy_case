import type { FC, ReactNode } from 'react';

/** Barlow Condensed, uppercase, .06em — bölüm başlıkları ve küçük etiketler. */
export const Eyebrow: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`eyebrow ${className}`}>{children}</div>;

export default Eyebrow;
