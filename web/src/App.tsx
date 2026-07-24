import { Suspense, lazy, useEffect, type FC } from 'react';
import Header from './shell/Header';
import TabBar from './shell/TabBar';
import FeatureGrid from './shell/FeatureGrid';
import Footer from './shell/Footer';
import { useStore } from './store';
import { needsByTab } from './registry';
import { prefetch } from './data/useData';

// F61 global çekmece — her sekmeden açılabilir, gridde kart olarak durmaz
const PnDrawer = lazy(() => import('./features/explorer/PnDrawer'));

const App: FC = () => {
  const aktifSekme = useStore((s) => s.aktifSekme);
  const seciliPn = useStore((s) => s.seciliPn);

  // shell metinleri meta.json'dan gelir; ilk sekmenin verisini de önden al
  useEffect(() => {
    prefetch(['meta', ...needsByTab('ai')]);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-tk-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
      >
        İçeriğe atla
      </a>

      <Header />
      <TabBar />

      <main id="icerik" className="flex-1">
        <div className="mx-auto max-w-shell px-4 py-6 md:px-8">
          <FeatureGrid tab={aktifSekme} />
        </div>
      </main>

      <Footer />

      {seciliPn && (
        <Suspense fallback={null}>
          <PnDrawer />
        </Suspense>
      )}
    </div>
  );
};

export default App;
