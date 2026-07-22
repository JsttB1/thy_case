import type { FC } from 'react';
import { fazEtiketi, type FeatureDef } from '../registry';

/**
 * status: 'planned' feature'ların yer tutucusu.
 * Kesikli kenarlık + köşede faz rozeti: jüri yol haritasını ekranda görür,
 * boş alan değil bilinçli kapsam okur (spec 2.3).
 */
export const PlaceholderCard: FC<{ feature: FeatureDef }> = ({ feature }) => (
  <section
    style={feature.minHeight ? { minHeight: Math.min(feature.minHeight, 260) } : undefined}
    className="relative flex flex-col rounded border border-dashed border-tk-line bg-tk-white/60 p-5"
  >
    <span className="absolute right-4 top-4 rounded-[4px] border border-tk-line bg-tk-mist px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-tk-slate">
      {fazEtiketi(feature.id)}
    </span>

    <div className="eyebrow">{feature.id}</div>
    <h2 className="mt-1 pr-20 text-base font-semibold text-tk-slate">{feature.title}</h2>

    {feature.method && <p className="mt-1 text-xs text-tk-slate/80">{feature.method}</p>}

    {feature.plannedNote && (
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-tk-slate">
        {feature.plannedNote}
      </p>
    )}

    <div className="mt-auto pt-4">
      <div className="h-px w-full bg-tk-line" />
      <p className="mt-2 text-2xs uppercase tracking-wide text-tk-slate/70">
        {feature.needs.length > 0 ? `veri: ${feature.needs.join(', ')}` : 'ek veri gerektirir'}
      </p>
    </div>
  </section>
);

export default PlaceholderCard;
