import { useMemo, useState, type FC } from 'react';
import { useData } from '../../data/useData';
import { adetKisa, para, sayi, yuzde } from '../../lib/format';
import { havuzlamaCoz } from '../../lib/inventory';
import { useStore } from '../../store';
import { Skeleton } from '../../ui';

type Mod = 'dagitik' | 'havuz';

/**
 * F42 — Havuzlama simülatörü (beta).
 * λᵢ istasyonun uçak payına göre dağıtılır; emniyet stoğu her istasyonda
 * ayrı ayrı hesaplanınca √ toplamı yerine toplam √'lerin toplamı ödenir.
 */
export const F42PoolingSim: FC = () => {
  const { data, loading } = useData(['stations', 'pn'] as const);
  const filoYili = useStore((s) => s.filoYili);
  const [mod, setMod] = useState<Mod>('dagitik');

  const sonuc = useMemo(() => {
    if (!data.stations || !data.pn) return null;
    // yalnız stok tutan istasyonlar havuzlamaya girer
    const stoklu = data.stations.stations.filter((s) => s.depoTipi !== 'yok');
    const paylar = stoklu.map((s) => (filoYili === 2033 ? s.ucak2033 : s.ucak2025));
    return { ...havuzlamaCoz(data.pn, paylar), istasyon: stoklu.length };
  }, [data.stations, data.pn, filoYili]);

  if (loading || !sonuc) return <Skeleton className="h-72 w-full" />;

  const aktif = mod === 'dagitik' ? sonuc.ssDagitik : sonuc.ssHavuzlu;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex gap-1">
        {(
          [
            ['dagitik', 'Mevcut dağıtım'],
            ['havuz', 'Merkezî havuz + ileri stok'],
          ] as [Mod, string][]
        ).map(([m, ad]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mod === m}
            onClick={() => setMod(m)}
            className={`flex-1 rounded-[4px] border px-3 py-2 text-xs font-medium transition-colors duration-100 ${
              mod === m
                ? 'border-tk-red bg-tk-red text-white'
                : 'border-tk-line bg-tk-white text-tk-slate hover:text-tk-ink'
            }`}
          >
            {ad}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <div className="eyebrow">gereken emniyet stoğu</div>
        <div className="tnum font-display text-3xl font-extrabold leading-none text-tk-ink tracking-[-.02em]">
          {adetKisa(aktif)}
        </div>
        <div className="mt-1 text-xs text-tk-slate">adet · {sonuc.istasyon} stoklu istasyon</div>
      </div>

      {/* iki senaryonun karşılaştırmalı çubuğu */}
      <div className="mt-5 space-y-3">
        {(
          [
            ['Mevcut dağıtım', sonuc.ssDagitik, '#5A6472'],
            ['Merkezî havuz', sonuc.ssHavuzlu, '#E81932'],
          ] as [string, number, string][]
        ).map(([ad, v, renk]) => (
          <div key={ad}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className={ad.startsWith('Merkez') ? 'font-medium' : 'text-tk-slate'}>
                {ad}
              </span>
              <span className="tnum font-semibold">{adetKisa(v)}</span>
            </div>
            <div className="h-5 w-full rounded-[3px] bg-tk-mist">
              <div
                className="h-full rounded-[3px]"
                style={{ width: `${(v / sonuc.ssDagitik) * 100}%`, background: renk }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded border border-sig-ok/30 bg-[#E9F5F0] px-4 py-3">
        <div className="eyebrow text-sig-ok">havuzlama kazancı</div>
        <div className="tnum font-display text-2xl font-extrabold leading-none text-sig-ok tracking-[-.02em]">
          {yuzde(sonuc.tasarrufOran * 100, 1)}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-tk-ink">
          Aynı servis seviyesi, {yuzde(sonuc.tasarrufOran * 100, 0)} daha az emniyet stoğu —
          yaklaşık {sayi(Math.round(sonuc.tasarrufAdet))} adet ve{' '}
          <strong>{para(sonuc.tasarrufSermaye)}</strong> daha az bağlı sermaye.
        </p>
      </div>

      <p className="mt-auto pt-4 text-xs leading-relaxed text-tk-slate">
        Karekök yasası: stok n istasyona bölündüğünde her biri kendi talep belirsizliğine karşı
        ayrı tampon tutar ve toplam emniyet stoğu √n kat artar. Merkezî havuzda belirsizlikler
        birbirini sönümlediği için tek bir √(Σλ) yeterli olur. Kazanç, hızlı sevkiyatın
        maliyetiyle birlikte değerlendirilmeli.
      </p>
    </div>
  );
};

export default F42PoolingSim;
