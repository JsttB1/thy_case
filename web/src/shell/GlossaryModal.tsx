import { useEffect, useRef, type FC } from 'react';
import { X } from 'lucide-react';
import { useDatum } from '../data/useData';

interface Props {
  acik: boolean;
  onKapat: () => void;
}

/** meta.json'daki 8 terim — jüri AOG/TAT/rotable sorarsa hazır. */
export const GlossaryModal: FC<Props> = ({ acik, onKapat }) => {
  const meta = useDatum('meta').data;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onKapat();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [acik, onKapat]);

  if (!acik) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-tk-ink/30" onClick={onKapat} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Terimler sözlüğü"
        tabIndex={-1}
        className="relative max-h-[80vh] w-full max-w-lg animate-fade-in overflow-y-auto rounded border border-tk-line bg-tk-white p-5 shadow-drawer outline-none"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-display text-lg font-extrabold uppercase" style={{ letterSpacing: '.035em' }}>
            Terimler
          </h2>
          <button
            type="button"
            onClick={onKapat}
            aria-label="Sözlüğü kapat"
            className="-mr-1 rounded p-1 text-tk-slate transition-colors duration-100 hover:bg-tk-mist hover:text-tk-ink"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <dl className="space-y-3">
          {(meta?.sozluk ?? []).map((s) => (
            <div key={s.t} className="border-b border-tk-line pb-3 last:border-b-0 last:pb-0">
              <dt className="text-sm font-semibold">{s.t}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-tk-slate">{s.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default GlossaryModal;
