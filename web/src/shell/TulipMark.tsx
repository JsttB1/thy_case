import type { FC } from 'react';

/**
 * Lale işareti — THY görsel dilini çağrıştıran, elle çizilmiş geometrik lale.
 * Kurumsal logonun kopyası değil; case demo'su için özgün marka aksanı.
 */
export const TulipMark: FC<{ size?: number; className?: string }> = ({
  size = 30,
  className = 'text-tk-red',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    role="img"
    aria-label="Envanter Kontrol Kulesi işareti"
    className={className}
  >
    {/* gövde */}
    <path
      d="M16 30V16"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* sol yaprak */}
    <path
      d="M16 17C10.5 15.4 6.5 11.2 6 5.2c4.6.4 8.2 2.9 10 6.6"
      fill="currentColor"
    />
    {/* sağ yaprak */}
    <path
      d="M16 17c5.5-1.6 9.5-5.8 10-11.8-4.6.4-8.2 2.9-10 6.6"
      fill="currentColor"
      opacity=".55"
    />
    {/* orta taç */}
    <path
      d="M16 18.5c2.6-2.2 4-5.4 4-9 0-3.1-1.4-6-4-8.3-2.6 2.3-4 5.2-4 8.3 0 3.6 1.4 6.8 4 9Z"
      fill="currentColor"
    />
  </svg>
);

export default TulipMark;
