import { useMemo, type FC } from 'react';
import { useData } from '../../data/useData';
import { adetKisa, para, sayi, yuzde } from '../../lib/format';
import { bazMinVektoru, senaryoCoz } from '../../lib/inventory';
import { useStore, type Senaryo } from '../../store';
import { Skeleton } from '../../ui';
import Slider from '../../ui/Slider';

interface HazirSenaryo {
  ad: string;
  talepSoku: number;
  leadGecikme: number;
  servisBonusu: number;
  not: string;
}

const HAZIR: HazirSenaryo[] = [
  { ad: 'Baz durum', talepSoku: 0, leadGecikme: 0, servisBonusu: 0, not: 'şok yok' },
  {
    ad: 'Tedarikçi krizi',
    talepSoku: 0.15,
    leadGecikme: 0.4,
    servisBonusu: 0.1,
    not: 'ana tedarikçide kapasite daralması',
  },
  {
    ad: 'Talep patlaması',
    talepSoku: 0.4,
    leadGecikme: 0.2,
    servisBonusu: 0.1,
    not: 'filo planından hızlı büyüme',
  },
  {
    ad: 'Küresel tıkanma',
    talepSoku: 0.25,
    leadGecikme: 0.7,
    servisBonusu: 0.15,
    not: 'lojistik ve gümrük tıkanması',
  },
];

const esit = (s: Senaryo, h: HazirSenaryo) =>
  Math.abs(s.talepSoku - h.talepSoku) < 1e-6 &&
  Math.abs(s.leadGecikme - h.leadGecikme) < 1e-6 &&
  Math.abs(s.servisBonusu - h.servisBonusu) < 1e-6;

const Metrik: FC<{ etiket: string; deger: string; alt?: string; ton?: string }> = ({
  etiket,
  deger,
  alt,
  ton = 'text-tk-ink',
}) => (
  <div className="rounded border border-tk-line bg-tk-mist/50 px-4 py-3">
    <div className="eyebrow">{etiket}</div>
    <div className={`tnum font-display text-2xl font-extrabold tracking-[-.02em] leading-none ${ton}`}>{deger}</div>
    {alt && <div className="mt-1 text-xs text-tk-slate">{alt}</div>}
  </div>
);

/** F50 — Kriz simülatörü. 3 slider + 4 hazır senaryo, 5.000 PN canlı yeniden hesaplanır. */
export const F50CrisisSim: FC = () => {
  const { data, loading } = useData(['pn'] as const);
  const senaryo = useStore((s) => s.senaryo);
  const setSenaryo = useStore((s) => s.setSenaryo);

  const bazMin = useMemo(() => (data.pn ? bazMinVektoru(data.pn) : null), [data.pn]);

  const baz = useMemo(
    () =>
      data.pn && bazMin
        ? senaryoCoz(data.pn, { talepSoku: 0, leadGecikme: 0, servisBonusu: 0 }, bazMin)
        : null,
    [data.pn, bazMin],
  );

  const sonuc = useMemo(
    () => (data.pn && bazMin ? senaryoCoz(data.pn, senaryo, bazMin) : null),
    [data.pn, bazMin, senaryo],
  );

  if (loading || !data.pn || !sonuc || !baz) return <Skeleton className="h-80 w-full" />;

  const acikArtis = sonuc.acikPn - baz.acikPn;

  return (
    <div className="flex flex-1 flex-col gap-5 lg:flex-row">
      <div className="w-full shrink-0 space-y-5 lg:w-[320px]">
        <div className="flex flex-wrap gap-1.5">
          {HAZIR.map((h) => {
            const aktif = esit(senaryo, h);
            return (
              <button
                key={h.ad}
                type="button"
                title={h.not}
                aria-pressed={aktif}
                onClick={() =>
                  setSenaryo({
                    talepSoku: h.talepSoku,
                    leadGecikme: h.leadGecikme,
                    servisBonusu: h.servisBonusu,
                  })
                }
                className={`rounded-[4px] border px-2.5 py-1.5 text-xs font-medium transition-colors duration-100 ${
                  aktif
                    ? 'border-tk-red bg-tk-red text-white'
                    : 'border-tk-line bg-tk-white text-tk-slate hover:border-tk-slate/40 hover:text-tk-ink'
                }`}
              >
                {h.ad}
              </button>
            );
          })}
        </div>

        <Slider
          etiket="Talep şoku"
          min={0}
          max={80}
          adim={5}
          deger={Math.round(senaryo.talepSoku * 100)}
          goster={yuzde(senaryo.talepSoku * 100, 0)}
          onChange={(v) => setSenaryo({ talepSoku: v / 100 })}
          ipucu="2033 sökülme oranı üzerine ek talep"
        />
        <Slider
          etiket="Lead time gecikmesi"
          min={0}
          max={100}
          adim={5}
          deger={Math.round(senaryo.leadGecikme * 100)}
          goster={yuzde(senaryo.leadGecikme * 100, 0)}
          onChange={(v) => setSenaryo({ leadGecikme: v / 100 })}
          ipucu="tedarik süresinde uzama"
        />
        <Slider
          etiket="Servis hedefi (z bonusu)"
          min={0}
          max={30}
          adim={5}
          deger={Math.round(senaryo.servisBonusu * 100)}
          goster={yuzde(senaryo.servisBonusu * 100, 0)}
          onChange={(v) => setSenaryo({ servisBonusu: v / 100 })}
          ipucu="daha yüksek servis seviyesi hedefi"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metrik
            etiket="açığa düşen PN"
            deger={sayi(sonuc.acikPn)}
            alt={
              acikArtis === 0
                ? 'baz durumla aynı'
                : `baz duruma göre ${acikArtis > 0 ? '+' : '−'}${sayi(Math.abs(acikArtis))}`
            }
            ton={acikArtis > 0 ? 'text-sig-crit' : 'text-tk-ink'}
          />
          <Metrik
            etiket="AOG kritik açık"
            deger={sayi(sonuc.acikPnAog)}
            alt={`baz durumda ${sayi(baz.acikPnAog)}`}
            ton="text-sig-crit"
          />
          <Metrik
            etiket="ek tampon"
            deger={adetKisa(sonuc.ekTampon)}
            alt="adet · baz min stoğun üstü"
            ton="text-sig-warn"
          />
          <Metrik
            etiket="ek sermaye"
            deger={para(sonuc.ekSermaye)}
            alt="CLP üzerinden"
            ton="text-sig-warn"
          />
        </div>

        <div className="mt-4 rounded border border-tk-line bg-tk-mist/40 px-4 py-3">
          <div className="eyebrow mb-1">önerilen min stok toplamı</div>
          <div className="flex items-baseline gap-3">
            <span className="tnum font-display text-2xl font-extrabold tracking-[-.02em]">
              {sayi(sonuc.minToplam)}
            </span>
            <span className="text-sm text-tk-slate">
              baz durumda {sayi(baz.minToplam)} adet
              {sonuc.minToplam !== baz.minToplam && (
                <>
                  {' '}
                  ·{' '}
                  <strong className="text-tk-ink">
                    {yuzde((sonuc.minToplam / baz.minToplam - 1) * 100, 1)}
                  </strong>
                </>
              )}
            </span>
          </div>
        </div>

        <p className="mt-auto pt-4 text-sm leading-relaxed text-tk-slate">
          Her slider hareketinde 5.000 PN için min-max yeniden çözülüyor. Dikkat edilecek nokta:
          lead time gecikmesi talep şokundan daha sert vuruyor — λL çarpımında lead doğrusal
          girerken emniyet stoğu yalnız √(λL) ile büyüdüğü için, tedarik süresini uzatan bir kriz
          aynı oranda talep artışından pahalıya mal oluyor.
        </p>
      </div>
    </div>
  );
};

export default F50CrisisSim;
