import { useEffect, useRef, type FC, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  acik: boolean;
  onKapat: () => void;
  baslik: ReactNode;
  ustBilgi?: ReactNode;
  children: ReactNode;
  genislik?: number;
}

/**
 * Sağdan açılan panel (F61 PN detay çekmecesinin taşıyıcısı).
 * Escape ile kapanır, açılınca odak içeri taşınır, kapanınca tetikleyen öğeye döner.
 */
export const Drawer: FC<Props> = ({
  acik,
  onKapat,
  baslik,
  ustBilgi,
  children,
  genislik = 420,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const oncekiOdak = useRef<HTMLElement | null>(null);

  // onKapat her render'da yeni kimlik alabilir; efektin ona bağlanmaması için ref'te tutuluyor
  const kapatRef = useRef(onKapat);
  kapatRef.current = onKapat;

  /**
   * Sayfa kaydırma kilidi — yalnız `acik` değişiminde çalışır.
   * Efekt onKapat'a bağlanırsa her render'da temizlenip yeniden kuruluyor ve
   * "önceki overflow" değeri 'hidden' olarak yakalanıp kilit kalıcı hale geliyordu.
   */
  useEffect(() => {
    if (!acik) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [acik]);

  useEffect(() => {
    if (!acik) return;

    oncekiOdak.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') kapatRef.current();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      oncekiOdak.current?.focus?.();
    };
  }, [acik]);

  if (!acik) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 animate-fade-in bg-tk-ink/25"
        onClick={onKapat}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof baslik === 'string' ? baslik : 'Detay paneli'}
        tabIndex={-1}
        style={{ width: `min(${genislik}px, 100vw)` }}
        className="relative flex h-full animate-slide-in-right flex-col bg-tk-white shadow-drawer outline-none"
      >
        <header className="flex items-start justify-between gap-3 border-b border-tk-line px-5 py-4">
          <div className="min-w-0">
            <div className="truncate font-mono text-lg font-semibold">{baslik}</div>
            {ustBilgi && <div className="mt-1.5 flex flex-wrap gap-1.5">{ustBilgi}</div>}
          </div>
          <button
            type="button"
            onClick={onKapat}
            aria-label="Paneli kapat"
            className="-mr-1 rounded p-1 text-tk-slate transition-colors duration-100 hover:bg-tk-mist hover:text-tk-ink"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;
