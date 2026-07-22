import { useEffect, useRef, useState, type FC, type ReactNode } from 'react';
import Badge, { type BadgeTone } from './Badge';

interface Props {
  etiket: string;
  /** biçimlenmiş değer; countTo verilirse count-up bittiğinde bu metin gösterilir */
  deger: ReactNode;
  /** sayısal hedef — verilirse 600ms count-up yapılır (spec 1.5) */
  countTo?: number;
  /** count-up sırasında ara değerleri biçimlemek için */
  bicim?: (v: number) => string;
  alt?: string;
  rozet?: { tone: BadgeTone; text: string };
  tone?: 'default' | 'crit' | 'warn' | 'ok';
}

const DEGER_TONU: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-tk-ink',
  crit: 'text-sig-crit',
  warn: 'text-sig-warn',
  ok: 'text-sig-ok',
};

/** Yalnızca ilk görünürlükte, 600ms. prefers-reduced-motion varsa anında son değer. */
function useCountUp(hedef: number | undefined, sure = 600) {
  const [v, setV] = useState(hedef ?? 0);
  const ref = useRef<HTMLDivElement>(null);
  const oynadi = useRef(false);

  useEffect(() => {
    if (hedef == null) return;
    const el = ref.current;
    if (!el) return;

    const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (azHareket) {
      setV(hedef);
      return;
    }

    const io = new IntersectionObserver(
      (girisler) => {
        if (!girisler[0].isIntersecting || oynadi.current) return;
        oynadi.current = true;
        io.disconnect();

        const t0 = performance.now();
        let raf = 0;
        const adim = (t: number) => {
          const p = Math.min(1, (t - t0) / sure);
          const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          setV(hedef * eased);
          if (p < 1) raf = requestAnimationFrame(adim);
        };
        raf = requestAnimationFrame(adim);
        return () => cancelAnimationFrame(raf);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hedef, sure]);

  return { ref, v, bitti: v === hedef };
}

export const KpiStat: FC<Props> = ({
  etiket,
  deger,
  countTo,
  bicim,
  alt,
  rozet,
  tone = 'default',
}) => {
  const { ref, v, bitti } = useCountUp(countTo);
  const gosterilen = countTo != null && !bitti && bicim ? bicim(v) : deger;

  return (
    <div ref={ref} className="flex flex-col gap-1">
      <div className="eyebrow">{etiket}</div>
      <div
        className={`tnum font-display text-2xl font-bold leading-none ${DEGER_TONU[tone]}`}
      >
        {gosterilen}
      </div>
      <div className="flex items-center gap-2">
        {rozet && <Badge tone={rozet.tone}>{rozet.text}</Badge>}
        {alt && <span className="text-xs text-tk-slate">{alt}</span>}
      </div>
    </div>
  );
};

export default KpiStat;
