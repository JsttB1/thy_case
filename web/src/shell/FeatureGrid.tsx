import { Suspense, type FC } from 'react';
import { featuresByTab, type FeatureDef, type TabId } from '../registry';
import { Card, PlaceholderCard, Skeleton } from '../ui';
import FeatureBoundary from './FeatureBoundary';

/**
 * Tailwind sınıfları derleme anında taranır — span değerleri
 * şablon dizesiyle değil, tam sınıf adı olarak yazılmak zorunda.
 */
const SPAN: Record<FeatureDef['span'], string> = {
  12: 'col-span-12',
  8: 'col-span-12 lg:col-span-8',
  7: 'col-span-12 lg:col-span-7',
  6: 'col-span-12 md:col-span-6',
  5: 'col-span-12 lg:col-span-5',
  4: 'col-span-12 md:col-span-6 lg:col-span-4',
};

const Yukleniyor: FC<{ h?: number }> = ({ h = 240 }) => (
  <div className="rounded border border-tk-line bg-tk-white p-5">
    <Skeleton className="h-4 w-40" />
    <div className="mt-4">
      <Skeleton className={`w-full`} />
    </div>
    <div style={{ height: h - 90 }} className="mt-3">
      <Skeleton className="h-full w-full" />
    </div>
  </div>
);

const FeatureSlot: FC<{ feature: FeatureDef }> = ({ feature }) => {
  const { Component, status, chrome = 'card' } = feature;

  // planned ya da henüz bağlanmamış → yol haritası yer tutucusu
  if (status === 'planned' || !Component) {
    return <PlaceholderCard feature={feature} />;
  }

  const govde = (
    <FeatureBoundary featureId={feature.id}>
      <Suspense fallback={<Yukleniyor h={feature.minHeight} />}>
        <Component />
      </Suspense>
    </FeatureBoundary>
  );

  if (chrome === 'none') return govde;

  return (
    <Card
      id={feature.id}
      title={feature.title}
      method={feature.method}
      status={status}
      minHeight={feature.minHeight}
    >
      {govde}
    </Card>
  );
};

export const FeatureGrid: FC<{ tab: TabId }> = ({ tab }) => {
  const features = featuresByTab(tab).filter((f) => !(f.global && f.status !== 'planned'));

  return (
    <div
      id={`panel-${tab}`}
      role="tabpanel"
      aria-labelledby={`tab-${tab}`}
      // key ile sekme değişiminde 120ms opacity geçişi yeniden tetiklenir (spec 1.5)
      key={tab}
      className="grid animate-fade-in grid-cols-12 gap-5"
    >
      {features.map((f) => (
        <div key={f.id} className={SPAN[f.span]}>
          <FeatureSlot feature={f} />
        </div>
      ))}
    </div>
  );
};

export default FeatureGrid;
