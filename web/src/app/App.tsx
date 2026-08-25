import { lazy, Suspense, useEffect } from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { useStore, SEKMELER, type Sekme } from './store';
import Sozluk from './Sozluk';
import ThyLogo from '@/components/ThyLogo';
import { K, B, PRM } from '@/data/payload';
import { fmt, pct, vir } from '@/engine/format';
import { sahne } from '@/design/motion';

/* Sekmeler ayrı parçalara bölünür: ilk açılış hafif kalır, harita sekmesi
   3D katmanına geçtiğinde three.js yalnız o sekmeye girildiğinde yüklenir. */
const Code = lazy(() => import('@/views/Code'));
const Watchlist = lazy(() => import('@/views/Watchlist'));
const Ongoru = lazy(() => import('@/views/Ongoru'));
const Harita = lazy(() => import('@/views/Harita'));
const Senaryo = lazy(() => import('@/views/Senaryo'));
/* Açılış sahnesi ayrı parça: uygulamanın kendisi three'yi beklemeden hazırlanır,
   kapıdan geçildiğinde arkada zaten kurulmuş ekran bulunur. */
const Giris = lazy(() => import('@/views/Giris'));

const GORUNUM: Record<Sekme, React.ComponentType> = {
  karar: Code,
  watch: Watchlist,
  ongoru: Ongoru,
  harita: Harita,
  senaryo: Senaryo,
};

/** Sunumda sekme geçişinde yükleme yazısı görünmesin: ilk boyamadan sonra hepsi arka planda çekilir. */
const YUKLEYICILER = [
  () => import('@/views/Watchlist'),
  () => import('@/views/Ongoru'),
  () => import('@/views/Harita'),
  () => import('@/views/Senaryo'),
];

/** Marka işareti — THY kırmızısında yükseliş rotası. */
function MarkaIsaret() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 20 C7 20 10 15 12 10 C14 5 17 3 22 3"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="12" cy="10" r="2.6" fill="currentColor" />
    </svg>
  );
}

function UstBar() {
  const sekme = useStore((s) => s.sekme);
  const git = useStore((s) => s.git);
  const bas = useStore((s) => s.sozlugeBas);
  const girisAc = useStore((s) => s.girisAc);

  // Tek nav dili: üst bar her sekmede açık THY şeridi. (Eski koyu varyant
  // kaldırıldı — uygulamanın iki ayrı site gibi görünmesinin ana sebebiydi.)
  return (
    <nav className="topbar">
      <div className="topbar-in">
        {/* Marka açılış sahnesine döner: sunumda "baştan alalım" demek tek tık.
            Düğme, çünkü gerçekten bir eylem — dekoratif başlık değil. */}
        {/* THY amblemi üst barın EN SOLUNDA ve her ekranda: ürünün kimliği
            Catalyst, sahibi Turkish Technic. Amblem düğmenin dışında duruyor
            ki markaya basmak sahneyi yeniden oynatmasın. */}
        <ThyLogo />
        <button
          className="brand brand-btn"
          onClick={girisAc}
          title="Açılış sahnesini yeniden oynat"
        >
          <MarkaIsaret />
          <b>CATALYST</b>
        </button>
        {/* "SENTETİK / TEMSİLİ VERİ" rozeti kaldırıldı: aynı uyarı sayfa altındaki
            varsayım şeridinde zaten tam cümleyle duruyor, üst barda ikinci kez
            durunca nav kalabalıklaşıyordu. */}
        <LayoutGroup id="sekmeler">
          <div className="tabs" role="tablist">
            {SEKMELER.map((s) => (
              <button
                key={s.k}
                role="tab"
                aria-selected={sekme === s.k}
                className={'tab' + (sekme === s.k ? ' on' : '')}
                onClick={() => git(s.k)}
              >
                {s.ad}
                {sekme === s.k && (
                  <motion.span
                    className="tab-ind"
                    layoutId="sekme-gostergesi"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            ))}
          </div>
        </LayoutGroup>
        {/* Sözlük bir yardımcı, gezinti değil: sekmelerin solundayken nav'ın
            parçası gibi okunuyordu. En sağda, kendi başına duruyor. */}
        <button className="dic-btn" onClick={() => bas()} title="Kısaltmalar sözlüğü">
          📖 SÖZLÜK
        </button>
      </div>
    </nav>
  );
}

function Yukleniyor() {
  return (
    <div style={{ padding: '60px 0', color: 'var(--tx-3)', fontSize: '.85rem' }}>
      <motion.div
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 1.1, repeat: Infinity }}
      >
        hesaplanıyor…
      </motion.div>
    </div>
  );
}

export default function App() {
  const sekme = useStore((s) => s.sekme);
  const yon = useStore((s) => s.yon);
  const giris = useStore((s) => s.giris);
  const Gorunum = GORUNUM[sekme];

  useEffect(() => {
    const t = setTimeout(() => YUKLEYICILER.forEach((f) => void f()), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* Açılış sahnesi uygulamanın ÜSTÜNDE durur, yerine geçmez: kapı
          kapandığında arkadaki ekran çoktan hesaplanmış ve boyanmıştır,
          geçişte "yükleniyor" görünmez. */}
      {/* initial={false}: ilk açılışta GİRİŞ ANİMASYONU YOK. Perde açılırken
          soluk geçseydi, three yüklenene kadar arkadaki CODE ekranı yarı saydam
          görünüyordu — sürpriz olması gereken sahne "yüklenen bir katman" gibi
          duruyordu. Perde ilk kareden itibaren kapalı; animasyon yalnız
          kapanışta (uygulamaya geçerken) çalışır. */}
      <AnimatePresence initial={false}>
        {giris && (
          <motion.div
            key="giris"
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.55, ease: [0.4, 0, 1, 1] }}
            style={{ position: 'fixed', inset: 0, zIndex: 80 }}
          >
            <Suspense
              fallback={
                <div className="giris-perde">
                  <span>
                    <MarkaIsaret />
                    <b>CATALYST</b>
                  </span>
                  <i />
                </div>
              }
            >
              <Giris />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <UstBar />
      <div className="wrap">
        {/* CODE kendi dev başlığını, harita ise ekranın tamamını taşır — genel hero
            yalnız kalan sekmelerde çıkar. */}
        {sekme !== 'karar' && sekme !== 'harita' && (
          <header className="hero">
            <h1>
              Catalyst · Komponent Envanter <em>Karar Desteği</em>
            </h1>
            <p>{fmt(K.pn)} parça · 1.200 → 2.000 uçak projeksiyonu</p>
          </header>
        )}

        {/* Sekme geçişi BİLEREK yalnız giriş animasyonu (AnimatePresence + çıkış yok).
            Çıkış animasyonu denendi: tembel yüklenen sekme askıya alındığında
            AnimatePresence çıkışı tamamlanmış saymıyor ve ekran eski görünümde
            kilitleniyor. Sunumda donan ekranın bedeli, çıkış animasyonunun
            getirisinden büyük. key ile yeniden mount + giriş animasyonu yeterli. */}
        <motion.main key={sekme} initial={sahne(yon).initial} animate={sahne(yon).animate}>
          <Suspense fallback={<Yukleniyor />}>
            <Gorunum />
          </Suspense>
        </motion.main>

        {/* Harita tam ekran: varsayım şeridi orada kendi HUD'unda duruyor. */}
        {sekme !== 'harita' && (
          <div className="foot">
            <b>Varsayımlar.</b> Kullanılabilir stok = FAAL + HOMEBASE. Harita temsilî dağıtım,
            mevsimsellik tek yıla dayanır. Projeksiyon aralıktır: +{pct(B.alt_pct)} ile +
            {pct(B.ust_pct)} arası. Operasyonel önem ağırlıkları, BER eşiği {vir(PRM.ber_esigi)} ve alarm
            tamponu Öngörü sekmesinden ayarlanabilir. Tüm veriler resmi sentetik case setleridir,
            gerçek THY/AMOS verisi değildir.
          </div>
        )}
      </div>
      <Sozluk />
    </>
  );
}
