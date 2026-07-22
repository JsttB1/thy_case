import { useMemo, useState, type FC } from 'react';
import { useData } from '../../data/useData';
import type { Kritiklik } from '../../data/types';
import { sayi, yuzde } from '../../lib/format';
import { useStore } from '../../store';
import { Skeleton } from '../../ui';

const ESIKLER = [4, 12, 24] as const;
const KRITIKLIKLER: Kritiklik[] = ['AOG KRİTİK', 'KRİTİK', 'KRİTİK DEĞİL'];

/**
 * F41 — AOG kapsama (beta).
 * Basitleştirilmiş yaklaşım: transferSaatIST ≤ eşik olan istasyonlar kapsanan sayılır.
 * Gerçek isochrone hesabı değil — uçuş bağlantı sıklığı, gümrük ve nöbet saatleri
 * modellenmiyor. Bu yöntem notunda açıkça belirtiliyor.
 */
export const F41Coverage: FC = () => {
  const { data, loading } = useData(['stations', 'pn'] as const);
  const filoYili = useStore((s) => s.filoYili);
  const [esik, setEsik] = useState<number>(12);
  const [kritiklik, setKritiklik] = useState<Kritiklik>('AOG KRİTİK');

  const sonuc = useMemo(() => {
    if (!data.stations || !data.pn) return null;
    const st = data.stations.stations;
    const katsayi = data.stations.kapsamKatsayilari;

    const toplamUcak = st.reduce(
      (s, x) => s + (filoYili === 2033 ? x.ucak2033 : x.ucak2025),
      0,
    );

    // eşik içindeki istasyonlar, depo tipinin kapsama katsayısıyla ağırlıklandırılır
    let kapsanan = 0;
    const kapsananIst: string[] = [];
    const acikIst: string[] = [];

    for (const s of st) {
      const ucak = filoYili === 2033 ? s.ucak2033 : s.ucak2025;
      if (s.transferSaatIST <= esik) {
        kapsanan += ucak * (katsayi[s.depoTipi] ?? 0);
        if ((katsayi[s.depoTipi] ?? 0) > 0) kapsananIst.push(s.kod);
        else acikIst.push(s.kod);
      } else {
        acikIst.push(s.kod);
      }
    }

    const oran = toplamUcak > 0 ? kapsanan / toplamUcak : 0;

    // seçili kritiklikteki PN sayısı — kapsama boşluğunun neyi etkilediği
    const kritIndex = data.pn.dict.krit.indexOf(kritiklik);
    let kritPn = 0;
    for (const k of data.pn.cols.krit) if (k === kritIndex) kritPn += 1;

    return { oran, toplamUcak, kapsanan, kapsananIst, acikIst, kritPn };
  }, [data.stations, data.pn, esik, filoYili, kritiklik]);

  if (loading || !sonuc) return <Skeleton className="h-72 w-full" />;

  const acikOran = 1 - sonuc.oran;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">kritiklik</span>
          <select
            value={kritiklik}
            onChange={(e) => setKritiklik(e.target.value as Kritiklik)}
            className="rounded-[4px] border border-tk-line bg-tk-white px-2 py-1 text-xs"
          >
            {KRITIKLIKLER.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1">
          <span className="eyebrow">kabul edilebilir tedarik süresi</span>
          <div className="flex gap-1">
            {ESIKLER.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={esik === e}
                onClick={() => setEsik(e)}
                className={`rounded-[4px] border px-2.5 py-1 text-xs font-medium transition-colors duration-100 ${
                  esik === e
                    ? 'border-tk-red bg-tk-red text-white'
                    : 'border-tk-line bg-tk-white text-tk-slate hover:text-tk-ink'
                }`}
              >
                {e} saat
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* kapsama çubuğu */}
      <div className="mt-5">
        <div className="flex h-8 w-full overflow-hidden rounded-[3px] border border-tk-line">
          <div
            className="flex items-center justify-center bg-tk-ink text-2xs font-semibold uppercase text-white"
            style={{ width: `${sonuc.oran * 100}%` }}
          >
            {sonuc.oran > 0.14 && 'kapsanan'}
          </div>
          <div
            className="flex items-center justify-center bg-tk-red-wash text-2xs font-semibold uppercase text-tk-red-deep"
            style={{ width: `${acikOran * 100}%` }}
          >
            {acikOran > 0.14 && 'kapsam dışı'}
          </div>
        </div>
        <div className="mt-1 flex justify-between text-xs text-tk-slate">
          <span className="tnum">{yuzde(sonuc.oran * 100, 1)} kapsanan</span>
          <span className="tnum">{yuzde(acikOran * 100, 1)} kapsam dışı</span>
        </div>
      </div>

      <div className="mt-5 rounded border border-tk-red/25 bg-tk-red-wash px-4 py-3">
        <p className="text-sm leading-relaxed text-tk-ink">
          Filonun <strong className="tnum text-tk-red-deep">{yuzde(acikOran * 100, 0)}</strong>
          &apos;i <strong>{esik} saat</strong> içinde <strong>{kritiklik}</strong> sınıfındaki bir
          komponente erişemiyor. Bu sınıfta {sayi(sonuc.kritPn)} PN var.
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="eyebrow">eşik içindeki istasyonlar</dt>
          <dd className="mt-1 font-mono text-xs leading-relaxed text-tk-ink">
            {sonuc.kapsananIst.join(' · ') || '—'}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">stoksuz / uzak istasyonlar</dt>
          <dd className="mt-1 font-mono text-xs leading-relaxed text-tk-slate">
            {sonuc.acikIst.join(' · ') || '—'}
          </dd>
        </div>
      </dl>

      <p className="mt-auto pt-4 text-xs leading-relaxed text-tk-slate">
        Kapsama = Σ (istasyon uçak sayısı × depo tipi katsayısı) ÷ toplam filo; ana depo 1,0 ·
        ileri depo 0,55 · hat stoğu 0,20. Basitleştirilmiş yaklaşım — gerçek isochrone,
        uçuş bağlantı sıklığı ve gümrük süreleri modellenmiyor.
      </p>
    </div>
  );
};

export default F41Coverage;
