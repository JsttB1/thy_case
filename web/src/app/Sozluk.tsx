import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SOZLUK } from './sozluk-veri';
import { foldTr } from '@/engine/format';
import { panelVaryant, perdeVaryant } from '@/design/motion';
import { useStore } from './store';

export default function Sozluk() {
  const acik = useStore((s) => s.sozlukAcik);
  const bas = useStore((s) => s.sozlugeBas);
  const [q, setQ] = useState('');

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') bas(false);
    };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [bas]);

  const satirlar = useMemo(() => {
    const k = foldTr(q.trim());
    if (!k) return SOZLUK;
    return SOZLUK.filter((s) => foldTr(`${s.terim} ${s.acilim} ${s.aciklama}`).includes(k));
  }, [q]);

  return (
    <AnimatePresence>
      {acik && (
        <>
          <motion.div
            className="perde"
            variants={perdeVaryant}
            initial="gizli"
            animate="gorunur"
            exit="cikan"
            onClick={() => bas(false)}
          />
          <motion.aside
            className="dic"
            variants={panelVaryant}
            initial="gizli"
            animate="gorunur"
            exit="cikan"
            role="dialog"
            aria-label="Kısaltmalar sözlüğü"
          >
            <div className="dic-h">
              <span>📖</span>
              <b>Kısaltmalar Sözlüğü</b>
              <small>ekranlardaki her terim</small>
              <button className="x" onClick={() => bas(false)} title="Kapat">
                ✕
              </button>
            </div>
            <div className="dic-q">
              <input
                type="text"
                value={q}
                autoFocus
                onChange={(e) => setQ(e.target.value)}
                placeholder="Terim ara… (örn. TTS, BER, pool)"
              />
            </div>
            <div className="dic-list">
              {satirlar.length ? (
                satirlar.map((s) => (
                  <div className="dic-row" key={s.terim}>
                    <span className="t">{s.terim}</span>
                    <span className="a">{s.acilim}</span>
                    <p>{s.aciklama}</p>
                  </div>
                ))
              ) : (
                <div className="dic-row">
                  <p>Eşleşme yok. Başka bir terim deneyin.</p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
