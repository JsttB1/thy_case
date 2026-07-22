import type { FC } from 'react';

interface Props {
  className?: string;
  /** kaç satırlık blok — tablo/liste yer tutucusu için */
  rows?: number;
}

export const Skeleton: FC<Props> = ({ className = '', rows }) => {
  if (rows) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded bg-tk-line/60 ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
};

export default Skeleton;
