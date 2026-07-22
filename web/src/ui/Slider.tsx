import { useEffect, useRef, useState, type FC } from 'react';

interface Props {
  etiket: string;
  min: number;
  max: number;
  adim: number;
  deger: number;
  onChange: (v: number) => void;
  /** ekranda gösterilecek biçimlenmiş değer */
  goster: string;
  ipucu?: string;
}

/**
 * Slider — sürüklerken her onChange'de 5.000 PN yeniden hesaplanmasın diye
 * dışarı bildirim requestAnimationFrame ile bir kareye indirgeniyor.
 * Tutamak anında hareket eder (yerel state), hesap kare başına bir kez koşar.
 */
export const Slider: FC<Props> = ({ etiket, min, max, adim, deger, onChange, goster, ipucu }) => {
  const [yerel, setYerel] = useState(deger);
  const raf = useRef<number | null>(null);
  const bekleyen = useRef<number | null>(null);

  useEffect(() => setYerel(deger), [deger]);

  useEffect(
    () => () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  const degistir = (v: number) => {
    setYerel(v);
    bekleyen.current = v;
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      if (bekleyen.current != null) onChange(bekleyen.current);
    });
  };

  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{etiket}</span>
        <span className="tnum font-display text-lg font-extrabold text-tk-red tracking-[-.02em]">{goster}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={adim}
        value={yerel}
        onChange={(e) => degistir(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-tk-line accent-tk-red"
        style={{
          background: `linear-gradient(90deg,#E81932 ${
            ((yerel - min) / (max - min)) * 100
          }%,#E3E7EC ${((yerel - min) / (max - min)) * 100}%)`,
        }}
      />
      {ipucu && <span className="mt-1 block text-xs text-tk-slate">{ipucu}</span>}
    </label>
  );
};

export default Slider;
