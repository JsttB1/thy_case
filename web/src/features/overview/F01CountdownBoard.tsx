import { useEffect, useState, type FC } from 'react';
import { ArrowRight } from 'lucide-react';
import { useData } from '../../data/useData';
import type { GeriSayimPn } from '../../data/types';
import { gunSayi, leadKisa, sayi } from '../../lib/format';
import { kalanGunDurum, kalanGunRenkInk, kritiklikKisa } from '../../lib/countdown';
import { useStore } from '../../store';
import { Skeleton } from '../../ui';

const GORUNEN = 12;
const ADIM_MS = 40;

/** prefers-reduced-motion ise satırlar animasyonsuz, tek seferde gelir (spec 1.4). */
function useSplitFlap(satirSayisi: number) {
  const [gorunen, setGorunen] = useState(0);

  useEffect(() => {
    if (satirSayisi === 0) return;

    const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (azHareket) {
      setGorunen(satirSayisi);
      return;
    }

    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setGorunen(i);
      if (i >= satirSayisi) clearInterval(t);
    }, ADIM_MS);
    return () => clearInterval(t);
  }, [satirSayisi]);

  return gorunen;
}

const Satir: FC<{ r: GeriSayimPn; gorunur: boolean; onSec: () => void }> = ({
  r,
  gorunur,
  onSec,
}) => {
  const durum = kalanGunDurum(r.KALAN_GUN);
  const gecikmis = durum === 'GECIKMIS';

  return (
    <button
      type="button"
      onClick={onSec}
      style={{ visibility: gorunur ? 'visible' : 'hidden' }}
      // sabit kolon konumları — kalkış panosunda sütunlar satırdan satıra kaymaz
      className={`grid w-full grid-cols-[112px_minmax(0,1fr)_104px_84px_56px_auto] items-center gap-x-4 border-b border-white/10 px-4 py-2.5 text-left transition-colors duration-100 last:border-b-0 hover:bg-white/[.06] focus-visible:bg-white/[.06] sm:px-5 ${
        gorunur ? 'animate-flip-in' : ''
      }`}
    >
      <span className="tnum font-mono text-sm font-medium text-white">{r.PN}</span>

      <span className="truncate text-sm text-white/70">{r.SUB}</span>

      <span className="truncate text-sm text-white/70">{r.MODEL}</span>

      <span
        className={`hidden rounded-[3px] px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide sm:inline-block ${
          r.KRITIK === 'AOG KRİTİK'
            ? 'bg-tk-red text-white'
            : r.KRITIK === 'KRİTİK'
              ? 'bg-white/15 text-sig-warn-ink'
              : 'bg-white/10 text-white/60'
        }`}
      >
        {kritiklikKisa(r.KRITIK)}
      </span>

      <span className="tnum hidden text-xs text-white/50 md:inline">
        {leadKisa(r.LEAD_GUN)} LT
      </span>

      <span className="flex items-baseline justify-end gap-1.5">
        {gecikmis && (
          <span className="hidden rounded-[3px] bg-tk-red px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-white lg:inline-block">
            gecikmiş
          </span>
        )}
        <span
          className={`tnum min-w-[70px] text-right font-display text-[28px] font-bold leading-none ${kalanGunRenkInk(
            r.KALAN_GUN,
          )}`}
        >
          {gunSayi(r.KALAN_GUN)}
        </span>
        <span className="w-7 text-2xs uppercase text-white/40">gün</span>
      </span>
    </button>
  );
};

/**
 * F01 — Sipariş Geri Sayım Panosu (imza öğe).
 * Havalimanı kalkış panosu estetiği; satırlar uçuş değil parça numarası,
 * "kalkış saati" değil son sipariş tarihi.
 */
export const F01CountdownBoard: FC = () => {
  const { data, loading } = useData(['inventory', 'kpi'] as const);
  const setSekme = useStore((s) => s.setSekme);
  const setSeciliPn = useStore((s) => s.setSeciliPn);

  const satirlar = data.inventory?.geriSayim.slice(0, GORUNEN) ?? [];
  const gorunenSayi = useSplitFlap(satirlar.length);

  if (loading || !data.inventory || !data.kpi) {
    return (
      <div className="rounded bg-tk-ink p-5">
        <Skeleton className="h-6 w-56 bg-white/10" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  const { gecikmisPn, gecikmisAog } = data.kpi;

  return (
    <section
      aria-labelledby="F01-baslik"
      className="overflow-hidden rounded bg-tk-ink text-white"
      style={{ perspective: '800px' }}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/15 px-4 py-3.5 sm:px-5">
        <div>
          <h2
            id="F01-baslik"
            className="font-display text-lg font-bold uppercase leading-none"
            style={{ letterSpacing: '.06em' }}
          >
            Sipariş Geri Sayımı
          </h2>
          <p className="mt-1.5 text-xs text-white/50">
            kalan gün = (elde servis stoğu ÷ günlük talep) − lead time · negatif ise sipariş
            tarihi geçmiş
          </p>
        </div>
        <div className="tnum font-display text-lg font-bold uppercase tracking-wide">
          <span className="text-sig-crit-ink">{sayi(gecikmisPn)} GECİKMİŞ</span>
          <span className="mx-2 text-white/25">·</span>
          <span className="text-white">{sayi(gecikmisAog)} AOG KRİTİK</span>
        </div>
      </header>

      <div>
        {satirlar.map((r, i) => (
          <Satir
            key={r.PN}
            r={r}
            gorunur={i < gorunenSayi}
            onSec={() => setSeciliPn(r.PN)}
          />
        ))}
      </div>

      <footer className="border-t border-white/15 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={() => setSekme('inventory')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors duration-100 hover:text-white"
        >
          {sayi(gecikmisPn)} gecikmiş PN&apos;in tümünü gör
          <ArrowRight size={14} strokeWidth={2.5} />
        </button>
      </footer>
    </section>
  );
};

export default F01CountdownBoard;
