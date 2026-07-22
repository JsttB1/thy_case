import { useEffect, type FC } from 'react';
import Header from './shell/Header';
import TabBar from './shell/TabBar';
import FeatureGrid from './shell/FeatureGrid';
import Footer from './shell/Footer';
import { useStore } from './store';
import { needsByTab } from './registry';
import { prefetch } from './data/useData';

const App: FC = () => {
  const aktifSekme = useStore((s) => s.aktifSekme);

  // shell metinleri meta.json'dan gelir; ilk sekmenin verisini de önden al
  useEffect(() => {
    prefetch(['meta', ...needsByTab('overview')]);
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
    </div>
  );
};

export default App;
