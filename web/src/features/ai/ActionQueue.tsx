import { useMemo, useState, type FC } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { gunSayi, para, sayi } from '../../lib/format';
import { kalanGunRenk, kritiklikKisa, kritiklikTonu } from '../../lib/countdown';
import { AKSIYON_META, AKSIYON_SIRA, type AiAksiyon, type Oneri } from '../../lib/aiEngine';
import { useStore } from '../../store';
import { Badge } from '../../ui';
import { CcEyebrow, GuvenMeter } from './ccUi';
import AksiyonRozeti from './aksiyonUi';

const GORUNEN = 8;

const Satir: FC<{ o: Oneri; sira: number; onSec: () => void }> = ({ o, sira, onSec }) => {
  const meta = AKSIYON_META[o.aksiyon];
  return (
    <button
      type="button"
      onClick={onSec}
      style={{ animationDelay: `${sira * 45}ms` }}
      className="group grid animate-ai-rise grid-cols-[24px_92px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-tk-line px-3 py-3 text-left transition-colors duration-100 last:border-b-0 hover:bg-tk-mist/70 sm:px-4"
    >
      <div className="flex items-center gap-2">
        <span className="h-8 w-1 rounded-full" style={{ background: meta.renk }} />
        <span className="tnum font-display text-sm font-bold text-tk-slate/70">{sira + 1}</span>
      </div>

      <AksiyonRozeti aksiyon={o.aksiyon} />

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="tnum shrink-0 whitespace-nowrap font-mono text-sm font-semibold text-tk-ink">
            {o.pn}
          </span>
          <span className="hidden shrink-0 sm:inline-block">
            <Badge tone={kritiklikTonu(o.krit)}>{kritiklikKisa(o.krit)}</Badge>
          </span>
          <span className="min-w-0 flex-1 truncate text-xs text-tk-slate">
            {o.sub} · {o.model}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-tk-slate group-hover:text-tk-ink">
          {o.gerekce}
        </p>
      </div>

      <div className="flex items-center gap-4 pl-2">
        <div className="hidden text-right md:block">
          <div className="text-[10px] uppercase tracking-wide text-tk-slate/70">kalan</div>
          <div className={`tnum font-display text-base font-bold ${kalanGunRenk(o.kalan)}`}>
            {gunSayi(o.kalan)}g
          </div>
        </div>
        <div className="hidden text-right lg:block">
          <div className="text-[10px] uppercase tracking-wide text-tk-slate/70">etki</div>
          <div className="tnum font-display text-base font-bold text-tk-ink">
            {o.etki > 0 ? para(o.etki) : '—'}
          </div>
        </div>
        <div className="hidden text-right sm:block">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-tk-slate/70">güven</div>
          <GuvenMeter deger={o.guven} renk={meta.renk} />
        </div>
        <div
          className="tnum flex h-9 w-9 items-center justify-center rounded-lg font-display text-sm font-extrabold text-tk-white"
          style={{ background: meta.renk }}
          title="AI öncelik skoru (0–100)"
        >
          {o.oncelik}
        </div>
        <ChevronRight
          size={16}
          className="text-tk-slate/40 transition-transform duration-100 group-hover:translate-x-0.5 group-hover:text-tk-slate"
        />
      </div>
    </button>
  );
};

type Filtre = AiAksiyon | 'HEPSI';

interface Props {
  oneriler: Oneri[];
  onTumu?: () => void;
}

export const ActionQueue: FC<Props> = ({ oneriler, onTumu }) => {
  const setSeciliPn = useStore((s) => s.setSeciliPn);
  const [filtre, setFiltre] = useState<Filtre>('HEPSI');

  const sayilar = useMemo(() => {
    const m: Record<AiAksiyon, number> = { EXCHANGE: 0, SIPARIS: 0, TAMIR: 0, TRANSFER: 0, IZLE: 0 };
    for (const o of oneriler) m[o.aksiyon] += 1;
    return m;
  }, [oneriler]);

  const gosterilen = useMemo(
    () =>
      (filtre === 'HEPSI' ? oneriler : oneriler.filter((o) => o.aksiyon === filtre)).slice(
        0,
        GORUNEN,
      ),
    [oneriler, filtre],
  );

  const aog = oneriler.filter((o) => o.krit === 'AOG KRİTİK').length;
  const cipler: Filtre[] = ['HEPSI', ...AKSIYON_SIRA.filter((a) => a !== 'IZLE')];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pb-3 pt-4 sm:px-5">
        <div>
          <CcEyebrow renk="#E81932">AI Öncelikli Aksiyon Kuyruğu</CcEyebrow>
          <p className="mt-1.5 text-xs text-tk-slate">
            AI öncelik = 0,45·risk + 0,40·aciliyet + 0,15·finansal etki · en yüksekten sıralı
          </p>
        </div>
        <span className="tnum rounded-full border border-tk-line bg-tk-mist px-2.5 py-1 text-2xs font-semibold text-tk-slate">
          {sayi(oneriler.length)} açık aksiyon · {sayi(aog)} AOG
        </span>
      </div>

      {/* aksiyon türü filtresi — sipariş mi, tamir mi, exchange mi? */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3 sm:px-5">
        {cipler.map((c) => {
          const aktif = filtre === c;
          const meta = c === 'HEPSI' ? null : AKSIYON_META[c];
          const adet = c === 'HEPSI' ? oneriler.length : sayilar[c];
          const renk = meta?.renk ?? '#1A1D21';
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFiltre(c)}
              className={`rounded-full border px-2.5 py-1 text-2xs font-semibold uppercase tracking-wide transition-colors duration-100 ${
                aktif ? 'text-tk-white' : 'border-tk-line bg-tk-white text-tk-slate hover:text-tk-ink'
              }`}
              style={aktif ? { background: renk, borderColor: renk } : undefined}
            >
              {c === 'HEPSI' ? 'Tümü' : meta!.etiket} · {sayi(adet)}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {gosterilen.map((o, i) => (
          <Satir key={o.pn} o={o} sira={i} onSec={() => setSeciliPn(o.pn)} />
        ))}
        {gosterilen.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-tk-slate">
            Bu aksiyon türünde açık kalem yok.
          </div>
        )}
      </div>

      {onTumu && (
        <div className="border-t border-tk-line px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onTumu}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-tk-slate transition-colors duration-100 hover:text-tk-red"
          >
            senaryo motorunda tüm aksiyonları canlı yeniden hesapla
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ActionQueue;
