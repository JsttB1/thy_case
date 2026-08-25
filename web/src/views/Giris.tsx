/**
 * GİRİŞ — açılış sayfası (dijital hangar).
 *
 * Uygulamanın kapısı. Beş perdelik tek çekim bir sahne çalar; her perdenin
 * başlığı, tek cümlesi ve HUD sayaçları vardır. Sayaçların hepsi payload'dan
 * gelir: açılış filmi de ürünle aynı veriye bakar, "tanıtım ayrı, uygulama
 * ayrı" olmaz.
 *
 * Üç katman üst üste:
 *   1) 3D sahne   — HangarSahne (three chunk'ı yalnız burada yüklenir)
 *   2) etiketler  — motor komponentlerinin HTML rozetleri, konumu 3D'den yansır
 *   3) HUD        — dev başlık, perde rayı, sayaçlar, kapı düğmesi
 *
 * Sahne lazy(): açılışta three yüklenirken sayfa boş kalmasın diye altta statik
 * bir marka perdesi durur; tuval hazır olunca üstüne biner.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/app/store';
import ThyLogo from '@/components/ThyLogo';
import { PERDELER, HUD, MOTOR_KOMPONENT, MOTOR_TOPLAM } from './hangar/hangarVeri';
import { EGRI } from '@/design/motion';
import '@/design/hangar.css';

const HangarSahne = lazy(() => import('./hangar/HangarSahne'));

/** Marka işareti — App.tsx'teki ile aynı yol, hangar ölçeğinde. */
function Isaret({ sinif }: { sinif?: string }) {
  return (
    <svg className={sinif} viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

const vir = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function Giris() {
  const kapat = useStore((s) => s.girisKapat);
  const git = useStore((s) => s.git);

  const [perde, setPerde] = useState(0);
  const [oynat, setOynat] = useState(true);
  const [vurgu, setVurgu] = useState(-1);
  /** serbest bakış: kamera kullanıcıda — sürükle döndür, tekerlek yakınlaştır */
  const [serbest, setSerbest] = useState(false);
  const etiketler = useRef<(HTMLDivElement | null)[]>([]);
  const p = PERDELER[perde];

  /* Hareket kısıtı açıksa film kendi kendine ilerlemez: kullanıcı perdeleri
     kendi tıklar. Sahne yine çalışır (dönen fan durdurulmuyor), yalnız kamera
     zorla yolculuğa çıkmaz. */
  const kisitli =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Perde değiştirmek serbest bakışı KAPATIR: yönetmen koltuğuna geri dönülür.
     Aksi hâlde kullanıcı motoru çevirip perdeye bastığında hiçbir şey olmuyor
     gibi görünüyordu (kamera kullanıcıda kalıyordu). */
  const ileri = useCallback(() => {
    setSerbest(false);
    setPerde((k) => Math.min(PERDELER.length - 1, k + 1));
  }, []);
  const geri = useCallback(() => {
    setSerbest(false);
    setPerde((k) => Math.max(0, k - 1));
  }, []);

  /** Otomatik oynatma — son perdede durur; film döngüye girmez, kapıda bekler. */
  useEffect(() => {
    if (!oynat || kisitli || perde >= PERDELER.length - 1) return;
    const t = setTimeout(ileri, p.sure * 1000);
    return () => clearTimeout(t);
  }, [perde, oynat, kisitli, p.sure, ileri]);

  /** Perde değişince önceki perdenin seçili komponenti kalmasın. */
  useEffect(() => {
    if (perde !== 3) setVurgu(-1);
  }, [perde]);

  /** Sahne açıkken arkadaki uygulama kaydırılmasın (tekerlek perdeyi çeviriyor). */
  useEffect(() => {
    document.body.classList.add('hgr-kilit');
    return () => document.body.classList.remove('hgr-kilit');
  }, []);

  /* Klavye: sağ/sol perde, boşluk duraklat, Enter/Esc uygulamaya gir. */
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') ileri();
      else if (e.key === 'ArrowLeft') geri();
      else if (e.key === ' ') {
        e.preventDefault();
        setOynat((o) => !o);
      } else if (e.key === 'Enter' || e.key === 'Escape') kapat();
    };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, [ileri, geri, kapat]);

  /* Tekerlek perdeyi çevirir. Eşik + kilit olmadan tek hareket üç perde
     atlıyordu (trackpad tek kaydırmada onlarca olay üretiyor).
     SERBEST BAKIŞTA devre dışı: orada tekerlek yakınlaştırma yapıyor. */
  const kilit = useRef(0);
  useEffect(() => {
    if (serbest) return;
    const f = (e: WheelEvent) => {
      const s = performance.now();
      if (s - kilit.current < 700 || Math.abs(e.deltaY) < 12) return;
      kilit.current = s;
      setOynat(false);
      if (e.deltaY > 0) ileri();
      else geri();
    };
    addEventListener('wheel', f, { passive: true });
    return () => removeEventListener('wheel', f);
  }, [ileri, geri, serbest]);

  const komponentSec = useCallback((i: number) => {
    setOynat(false);
    setPerde(3);
    setVurgu((v) => (v === i ? -1 : i));
  }, []);

  const k = vurgu >= 0 ? MOTOR_KOMPONENT[vurgu] : null;

  return (
    <div className="hgr">
      {/* ---------------------------------------------------------- 3D sahne */}
      <div className="hgr-sahne">
        <Suspense fallback={null}>
          <HangarSahne
            perde={perde}
            serbest={serbest}
            vurgu={vurgu}
            onKomponent={komponentSec}
            etiketler={etiketler}
          />
        </Suspense>
      </div>
      {/* köşe karartması: HUD yazıları her kare için okunur kalsın */}
      <div className="hgr-vinyet" />

      {/* ------------------------------------------------- komponent etiketleri */}
      <div className="hgr-etiketler">
        {MOTOR_KOMPONENT.map((c, i) => (
          <div
            key={c.kod}
            ref={(el) => {
              etiketler.current[i] = el;
            }}
            className={
              'hgr-etiket' + (c.kirmizi > 0 ? ' alarm' : '') + (vurgu === i ? ' secili' : '')
            }
            onClick={() => komponentSec(i)}
          >
            <span className="ata">ATA {c.ata}</span>
            <b>{c.ad}</b>
            <span className="sy">
              {vir(c.pn)} PN{c.kirmizi > 0 ? ` · ${c.kirmizi} kırmızı` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* -------------------------------------------------------------- üst bar */}
      <header className="hgr-ust">
        <span className="hgr-marka">
          <ThyLogo />
          <Isaret sinif="hgr-marka-iz" />
          <b>CATALYST</b>
          <i>Turkish Technic · komponent envanteri</i>
        </span>
        <span className="hgr-rozet">SENTETİK VERİ</span>
        {/* Serbest bakış: sunumda sahneyi elle çevirmek için. Açıkken film
            durur — kamera iki yerden birden sürülemez. */}
        <button
          className={'hgr-serbest' + (serbest ? ' on' : '')}
          onClick={() => {
            setSerbest((s) => !s);
            setOynat(false);
          }}
          title="Sahneyi fareyle döndür"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <ellipse cx="12" cy="12" rx="9.2" ry="4" stroke="currentColor" strokeWidth="1.7" />
            <ellipse
              cx="12"
              cy="12"
              rx="9.2"
              ry="4"
              stroke="currentColor"
              strokeWidth="1.7"
              transform="rotate(60 12 12)"
            />
            <circle cx="12" cy="12" r="2.1" fill="currentColor" />
          </svg>
          3D SERBEST
        </button>
        <button className="hgr-atla" onClick={kapat}>
          ATLA <span>ESC</span>
        </button>
      </header>

      {/* ---------------------------------------------------------------- başlık */}
      <div className="hgr-govde">
        {/* AnimatePresence + çıkış animasyonu KULLANILMIYOR — App.tsx'te sekme
            geçişi için alınan kararın aynısı. Denendi: mode="wait" ile çıkan
            blok bazı geçişlerde tamamlanmış sayılmıyor ve başlık %27 opaklıkta
            donuyor (sunumda ekranın yarısı yarı saydam kalıyordu). key ile
            yeniden mount + yalnız giriş animasyonu aynı etkiyi veriyor. */}
        <motion.div
          key={perde}
          initial={{ opacity: 0, y: 26, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.62, ease: EGRI.giris }}
          /* Komponent perdesinde blok küçülür: orada asıl içerik sahnedeki
             sekiz rozettir, dev başlık onlarla yer kavga ediyordu. */
          className={'hgr-blok' + (perde === 3 ? ' kompakt' : '')}
        >
          <div className="hgr-perde-no">
            <i>{String(perde + 1).padStart(2, '0')}</i> / {PERDELER.length} · {p.kod}
          </div>

          {perde === 0 ? (
            /* Açılış perdesi tek seferlik: dev marka kilidi. TECH ince ve
                 aralıklı, CATALYST dolu — ikisi aynı puntoda olsaydı "iki kelime"
                 okunuyordu, şimdi tek işaret gibi duruyor. */
            <h1 className="hgr-dev">
              <span className="tech">TECH</span>
              <span className="cat">
                CATALYS<i>T</i>
              </span>
            </h1>
          ) : (
            <h1 className="hgr-baslik">{p.baslik}</h1>
          )}

          <p className="hgr-alt">{p.alt}</p>

          <div className="hgr-sayac">
            {HUD[p.kod].map((s) => (
              <div key={s.k} className="hgr-kutu">
                <b>{s.v}</b>
                <span>{s.k}</span>
                {s.a && <i>{s.a}</i>}
              </div>
            ))}
          </div>

          {perde === PERDELER.length - 1 && (
            <motion.button
              className="hgr-gir"
              onClick={kapat}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              KARAR MOTORUNU AÇ
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          )}
        </motion.div>

        {/* seçili komponentin künyesi — perde 3'te rozet tıklanınca */}
        {k && (
          <motion.aside
            key={vurgu}
            className="hgr-kart"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: EGRI.giris }}
          >
            <div className="hgr-kart-ust">
              <span className="ata">ATA {k.ata}</span>
              <button onClick={() => setVurgu(-1)} aria-label="kapat">
                ✕
              </button>
            </div>
            <h3>{k.ad}</h3>
            <p className="yer">{k.yer}</p>
            <dl>
              <div>
                <dt>parça numarası</dt>
                <dd>{vir(k.pn)}</dd>
              </div>
              <div>
                <dt>talep 2025 → 2033</dt>
                <dd>
                  {vir(k.t25)} → {vir(k.t33)} <em>+%{k.buyume.toFixed(0)}</em>
                </dd>
              </div>
              <div>
                <dt>bağlı sermaye</dt>
                <dd>${k.deger.toFixed(2).replace('.', ',')}M</dd>
              </div>
              <div className={k.kirmizi > 0 ? 'alarm' : ''}>
                <dt>kırmızı liste</dt>
                <dd>{k.kirmizi > 0 ? `${k.kirmizi} PN · TTS < TTR` : 'temiz'}</dd>
              </div>
            </dl>
            <button
              className="hgr-kart-git"
              onClick={() => {
                kapat();
                git('ongoru');
              }}
            >
              kategori kırılımını aç →
            </button>
          </motion.aside>
        )}
      </div>

      {/* ------------------------------------------------------------ perde rayı */}
      <footer className="hgr-ray">
        <button
          className="hgr-oynat"
          onClick={() => setOynat((o) => !o)}
          title={oynat ? 'duraklat (boşluk)' : 'oynat (boşluk)'}
        >
          {oynat ? '❚❚' : '▶'}
        </button>

        <div className="hgr-perdeler">
          {PERDELER.map((x, i) => (
            <button
              key={x.kod}
              className={'hgr-perde' + (i === perde ? ' on' : '') + (i < perde ? ' gecti' : '')}
              onClick={() => {
                setOynat(false);
                setSerbest(false);
                setPerde(i);
              }}
            >
              <span className="ad">{x.ad}</span>
              <span className="ray">
                {i === perde && oynat && !kisitli && i < PERDELER.length - 1 && (
                  <motion.i
                    key={perde}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: x.sure, ease: 'linear' }}
                  />
                )}
                {i < perde && <i style={{ transform: 'scaleX(1)' }} />}
              </span>
            </button>
          ))}
        </div>

        <div className="hgr-ipucu">
          {serbest ? (
            <>
              sürükle döndür · tekerlek <b>yakınlaştır</b>
            </>
          ) : perde === 3 ? (
            <>
              rozete tıkla · <b>{vir(MOTOR_TOPLAM.pn)}</b> parça
            </>
          ) : (
            <>
              ← → perde · tekerlek · <b>Enter</b> ile gir
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
