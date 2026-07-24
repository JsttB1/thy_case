import type { FC } from 'react';
import { AlertTriangle, Cpu, Plane, Radar, Sparkles } from 'lucide-react';
import type { Kpi, Station } from '../../data/types';
import { sayi } from '../../lib/format';
import type { Dagilim } from '../../lib/aiEngine';
import { CcEyebrow } from './ccUi';
import GlobeCore from './GlobeCore';

interface Props {
  kpi: Kpi;
  dagilim: Dagilim;
  stations: Station[];
}

const Pill: FC<{
  children: React.ReactNode;
  nokta?: boolean;
  ikon?: React.ReactNode;
  renk?: string;
}> = ({ children, nokta, ikon, renk }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full border border-tk-line bg-tk-mist px-2.5 py-1 text-2xs font-semibold uppercase tracking-wide text-tk-slate"
    style={renk ? { color: renk, borderColor: `${renk}33` } : undefined}
  >
    {nokta && <span className="h-1.5 w-1.5 animate-blip rounded-full bg-sig-ok" />}
    {ikon}
    {children}
  </span>
);

export const HeroBanner: FC<Props> = ({ kpi, dagilim, stations }) => {
  const aksiyonOneri = dagilim.satirlar
    .filter((s) => s.aksiyon !== 'IZLE')
    .reduce((a, s) => a + s.sayi, 0);

  return (
    <div className="grid grid-cols-1 gap-6 p-5 md:p-6 lg:grid-cols-[1.2fr_.8fr]">
      {/* sol: başlık + canlı durum + özet rozetleri */}
      <div className="flex flex-col justify-center gap-5">
        <div>
          <CcEyebrow renk="#E81932">Turkish Technic · Yapay Zekâ Karar Motoru</CcEyebrow>
          <h1 className="mt-2.5 font-display text-2xl font-extrabold leading-tight tracking-[-.02em] text-tk-ink md:text-[34px] md:leading-[36px]">
            Envanter Karar Merkezi
          </h1>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-tk-slate">
            5.000 parça numarası, güncel envanter durumu ve 2033 talep projeksiyonu tek motorda
            birleşti. Motor her PN için <span className="font-semibold text-tk-ink">sipariş</span>,{' '}
            <span className="font-semibold text-sig-warn">tamir</span>,{' '}
            <span className="font-semibold text-tk-red">exchange</span> ya da{' '}
            <span className="font-semibold text-sig-ok">transfer</span> kararını gerekçesiyle üretir
            — kısa ve uzun vadeli.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill nokta>Canlı analiz</Pill>
          <Pill ikon={<AlertTriangle size={12} strokeWidth={2.4} />} renk="#E81932">
            {sayi(kpi.gecikmisPn)} gecikmiş · {sayi(kpi.gecikmisAog)} AOG
          </Pill>
          <Pill ikon={<Sparkles size={12} strokeWidth={2.2} />}>
            {sayi(aksiyonOneri)} aksiyon önerisi
          </Pill>
          <Pill ikon={<Cpu size={12} strokeWidth={2.2} />}>{sayi(kpi.pn)} PN · 14 model</Pill>
          <Pill ikon={<Radar size={12} strokeWidth={2.2} />}>offline · API yok</Pill>
        </div>
      </div>

      {/* sağ: 3B küresel ağ küresi — koyu uzay paneli (tek dramatik odak, marka ink+kırmızı) */}
      <div className="relative min-h-[260px] overflow-hidden rounded-lg border border-tk-ink bg-tk-ink lg:min-h-[320px]">
        <GlobeCore stations={stations} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 font-display text-2xs font-bold uppercase tracking-[.14em] text-white/70">
          <Plane size={12} strokeWidth={2.4} className="text-tk-red-bright" />
          Küresel ağ · canlı
        </div>
        <div className="pointer-events-none absolute bottom-2.5 left-3 flex items-center gap-3 text-2xs text-white/45">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-tk-red-bright" /> hub
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-white/70" /> istasyon
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 font-mono text-2xs text-white/35">
          TT·AI // KÜRESEL AĞ
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
