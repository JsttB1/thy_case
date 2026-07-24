import { useMemo, useState, type FC } from 'react';
import { Check } from 'lucide-react';
import type { PnData } from '../../data/types';
import { tumSatirlar, type PnRow } from '../../lib/pnRows';
import { AKSIYON_META, oneriFromRow, type AiAksiyon } from '../../lib/aiEngine';
import { sayi } from '../../lib/format';
import { kritiklikTonu } from '../../lib/countdown';
import { useStore } from '../../store';
import { Badge } from '../../ui';
import { CcEyebrow } from './ccUi';
import AksiyonRozeti from './aksiyonUi';

const LISTE = 26;
const kUsd = (v: number) => `$${sayi(Math.max(1, Math.round(v / 1000)))}K`;

function riskRenk(r: number): string {
  return r >= 70 ? 'text-sig-crit' : r >= 50 ? 'text-sig-warn' : 'text-tk-slate';
}

/** Önerilen aksiyona göre başlık — "next best action" cümlesi. */
function aksiyonBaslik(a: AiAksiyon, atolye: boolean): string {
  switch (a) {
    case 'EXCHANGE':
      return 'Pool / exchange ile köprüle';
    case 'TAMIR':
      return atolye ? 'Yurtiçi tamiri hızlandır' : 'Yurtdışı tamiri başlat';
    case 'SIPARIS':
      return 'Yeni satınalma başlat';
    case 'TRANSFER':
      return 'Fazla üniteyi açık istasyona aktar';
    default:
      return 'İzlemede tut';
  }
}

interface DetayProps {
  row: PnRow;
}

const Detay: FC<DetayProps> = ({ row }) => {
  const setSeciliPn = useStore((s) => s.setSeciliPn);
  const [onaylandi, setOnaylandi] = useState(false);

  const oneri = useMemo(() => oneriFromRow(row), [row]);
  const meta = AKSIYON_META[oneri.aksiyon];

  // 2033 yıllık ihtiyaç + güven aralığı (Poisson ~95%: y ± 1,96·√y)
  const y = Math.round(row.rate33 * 4);
  const sd = Math.sqrt(Math.max(y, 1));
  const lo = Math.max(0, Math.round(y - 1.96 * sd));
  const hi = Math.round(y + 1.96 * sd);

  // türetilmiş açıklama sinyalleri
  const buyume = row.rate25 > 0 ? Math.round((row.rate33 / row.rate25 - 1) * 100) : null;
  const tukenmeGun = row.gunlukTalep > 0 ? Math.round(row.stock / row.gunlukTalep) : null;
  const hafta = Math.max(1, Math.round(row.lead / 7));

  // AOG riski (karar destek tahmini): aciliyet + kritiklikten türetilir, aksiyon sonrası düşer
  const aogA =
    (oneri.aciliyet === 'GECIKMIS' ? 78 : oneri.aciliyet === 'ACIL' ? 58 : oneri.aciliyet === 'YAKLASIYOR' ? 34 : 14) +
    (row.krit === 'AOG KRİTİK' ? 12 : row.krit === 'KRİTİK' ? 5 : 0);
  const aogAc = Math.min(95, aogA);
  const aogB = Math.round(aogAc * 0.22);

  const nedenler: string[] = [];
  if (buyume != null && buyume > 0)
    nedenler.push(`Beklenen talep %${buyume} artıyor (2025 → 2033 filo büyümesi)`);
  if (tukenmeGun != null)
    nedenler.push(`Mevcut servis stoğu ~${tukenmeGun} günlük ihtiyacı karşılıyor`);
  nedenler.push(`Tedarik süresi ~${hafta} hafta (${row.kanal})`);
  if (row.krit === 'AOG KRİTİK') nedenler.push('AOG KRİTİK — eksikliği uçağı yerde bırakır');
  else if (row.krit === 'KRİTİK') nedenler.push('KRİTİK komponent — operasyonel etki yüksek');
  if (row.atil > 0) nedenler.push(`${row.atil} adet gayrifaal (arızalı) stok var`);
  if (row.acik > 0) nedenler.push(`Servis stoğu min bandın ${row.acik} adet altında`);

  const tamirVar = row.atolye || row.kanal.toLowerCase().includes('tamir');
  const secenekler = [
    {
      ad: 'Yeni satın alma',
      maliyet: `${kUsd(row.clp)}/adet`,
      sonuc: `~${hafta} hafta · uzun`,
      aktif: oneri.aksiyon === 'SIPARIS',
    },
    {
      ad: 'Tamir',
      maliyet: tamirVar ? kUsd(row.clp * 0.3) : '—',
      sonuc: tamirVar ? 'Ekonomik' : 'iç kabiliyet yok',
      aktif: oneri.aksiyon === 'TAMIR',
    },
    {
      ad: 'Pool / exchange',
      maliyet: `~${kUsd(row.clp * 0.06)}/yıl`,
      sonuc: row.krit === 'KRİTİK DEĞİL' ? '1–2 gün · orta' : '1–2 gün · acil çözüm',
      aktif: oneri.aksiyon === 'EXCHANGE',
    },
  ];

  return (
    <div className="flex min-w-0 flex-1 animate-fade-in flex-col">
      {/* başlık */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tnum font-mono text-lg font-bold text-tk-ink">{row.pn}</span>
          <Badge tone={kritiklikTonu(row.krit)}>{row.krit}</Badge>
          <span className="text-sm text-tk-slate">
            {row.model} · {row.sub}
          </span>
        </div>
        <div className="text-right">
          <div className="eyebrow">Risk skoru</div>
          <div className={`tnum font-display text-2xl font-extrabold ${riskRenk(row.risk)}`}>
            {sayi(row.risk, 1)}
          </div>
        </div>
      </div>

      {/* neden kritik — explainable AI */}
      <div className="mt-4">
        <div className="text-sm font-semibold text-tk-ink">
          Neden kritik? <span className="text-xs font-normal text-tk-slate">(Explainable AI)</span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {nedenler.map((n, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-tk-ink">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tk-slate" />
              {n}
            </li>
          ))}
        </ul>
      </div>

      {/* tahmin güven aralığı */}
      <div className="mt-4 rounded border border-tk-line bg-tk-mist px-3 py-2.5 text-sm text-tk-slate">
        2033 tahmini yıllık ihtiyaç{' '}
        <span className="text-xs">(güven aralığı)</span>:{' '}
        <span className="tnum font-display text-base font-bold text-tk-ink">{sayi(y)} adet</span>{' '}
        <span className="tnum">
          ( {sayi(lo)} – {sayi(hi)} )
        </span>
      </div>

      {/* önerilen aksiyon */}
      <div
        className="mt-4 rounded-lg border p-4"
        style={{ borderColor: `${meta.renk}44`, background: `${meta.renk}0a` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="eyebrow">Önerilen aksiyon</div>
          <AksiyonRozeti aksiyon={oneri.aksiyon} />
        </div>
        <div className="mt-1.5 font-display text-lg font-extrabold" style={{ color: meta.renk }}>
          {aksiyonBaslik(oneri.aksiyon, row.atolye)}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-tk-slate">{meta.aciklama}</p>

        {/* 3 metrik */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-tk-slate">AOG riski</div>
            <div className="tnum font-display text-base font-bold">
              <span className="text-sig-crit">%{aogAc}</span>
              <span className="mx-1 text-tk-slate">→</span>
              <span className="text-sig-ok">%{aogB}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-tk-slate">Mevcut açık</div>
            <div className="tnum font-display text-base font-bold text-tk-ink">
              {sayi(row.acik)} adet
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-tk-slate">Tedarik süresi</div>
            <div className="tnum font-display text-base font-bold text-tk-ink">~{hafta} hafta</div>
          </div>
        </div>

        {/* seçenek tablosu */}
        <div className="mt-3 overflow-hidden rounded border border-tk-line bg-tk-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tk-line text-left text-xs text-tk-slate">
                <th className="px-3 py-2 font-semibold">Seçenek</th>
                <th className="px-3 py-2 font-semibold">Maliyet</th>
                <th className="px-3 py-2 font-semibold">Sonuç</th>
              </tr>
            </thead>
            <tbody>
              {secenekler.map((s) => (
                <tr
                  key={s.ad}
                  className={`border-b border-tk-line last:border-b-0 ${
                    s.aktif ? 'bg-tk-mist' : ''
                  }`}
                >
                  <td className={`px-3 py-2 ${s.aktif ? 'font-semibold text-tk-ink' : 'text-tk-ink'}`}>
                    {s.ad}
                  </td>
                  <td className="tnum px-3 py-2 text-tk-slate">{s.maliyet}</td>
                  <td className="px-3 py-2">
                    <span className={s.aktif ? 'inline-flex items-center gap-1 font-semibold text-sig-ok' : 'text-tk-slate'}>
                      {s.sonuc}
                      {s.aktif && <Check size={13} strokeWidth={3} />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* aksiyon butonları (prototip) */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnaylandi((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded bg-tk-red px-3 py-1.5 text-sm font-semibold text-tk-white transition-colors duration-100 hover:bg-tk-red-deep"
          >
            {onaylandi ? <Check size={14} strokeWidth={3} /> : null}
            {onaylandi ? 'Onaylandı' : 'Onayla'}
          </button>
          <button
            type="button"
            className="rounded border border-tk-line bg-tk-white px-3 py-1.5 text-sm font-medium text-tk-ink transition-colors duration-100 hover:bg-tk-mist"
          >
            Ata
          </button>
          <button
            type="button"
            onClick={() => setSeciliPn(row.pn)}
            className="rounded border border-tk-line bg-tk-white px-3 py-1.5 text-sm font-medium text-tk-ink transition-colors duration-100 hover:bg-tk-mist"
          >
            İncele
          </button>
          <button
            type="button"
            className="rounded border border-tk-line bg-tk-white px-3 py-1.5 text-sm font-medium text-tk-ink transition-colors duration-100 hover:bg-tk-mist"
          >
            Satınalma Talebi Oluştur
          </button>
          <button
            type="button"
            className="rounded px-3 py-1.5 text-sm font-medium text-tk-slate transition-colors duration-100 hover:text-tk-ink"
          >
            Yoksay
          </button>
          {onaylandi && (
            <span className="text-xs text-sig-ok">✓ Aksiyon kuyruğa alındı (prototip)</span>
          )}
        </div>
      </div>
    </div>
  );
};

interface Props {
  pn: PnData;
}

/**
 * Explainable AI + Next Best Action — anlık en acil PN'ler için karar önerisi.
 * Sol: AI önceliğine göre en acil kalemler. Sağ: seçili PN'in neden kritik olduğu,
 * 2033 tahmini (güven aralığı) ve önerilen aksiyon — satın al / tamir / exchange
 * karşılaştırmasıyla. Tümü sentetik veriden türetilir, API yok.
 */
export const NextBestAction: FC<Props> = ({ pn }) => {
  const rows = useMemo(() => {
    const all = tumSatirlar(pn).map((r) => ({ r, o: oneriFromRow(r) }));
    return all
      .filter((x) => x.o.aksiyon !== 'IZLE')
      .sort((a, b) => b.o.oncelik - a.o.oncelik || a.r.kalan - b.r.kalan)
      .slice(0, LISTE)
      .map((x) => x.r);
  }, [pn]);

  const [seciliPn, setSeciliPn] = useState<string>(rows[0]?.pn ?? '');
  const secili = rows.find((r) => r.pn === seciliPn) ?? rows[0];

  return (
    <div className="p-4 sm:p-5">
      <CcEyebrow renk="#E81932">Açıklanabilir AI · Önerilen Aksiyon</CcEyebrow>
      <p className="mt-1.5 text-xs text-tk-slate">
        soldan bir PN seç → sistem neden kritik olduğunu, tahmin güven aralığını ve önerilen aksiyonu
        tahmini etkisiyle açıklar
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* sol: en acil PN listesi */}
        <div className="max-h-[560px] overflow-y-auto rounded border border-tk-line">
          {rows.map((r) => {
            const aktif = r.pn === (secili?.pn ?? '');
            return (
              <button
                key={r.pn}
                type="button"
                onClick={() => setSeciliPn(r.pn)}
                className={`flex w-full items-center justify-between gap-2 border-b border-tk-line px-3 py-2.5 text-left transition-colors duration-100 last:border-b-0 ${
                  aktif ? 'border-l-2 border-l-tk-red bg-tk-red-wash/50' : 'hover:bg-tk-mist'
                }`}
              >
                <div className="min-w-0">
                  <div className="tnum font-mono text-sm font-semibold text-tk-ink">{r.pn}</div>
                  <div className="truncate text-2xs uppercase tracking-wide text-tk-slate">
                    {r.model} · {r.sub}
                  </div>
                </div>
                <span className={`tnum shrink-0 font-display text-sm font-bold ${riskRenk(r.risk)}`}>
                  {sayi(r.risk, 1)}
                </span>
              </button>
            );
          })}
        </div>

        {/* sağ: detay */}
        {secili && <Detay key={secili.pn} row={secili} />}
      </div>
    </div>
  );
};

export default NextBestAction;
