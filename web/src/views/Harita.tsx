/**
 * 4 · HARİTA — tam ekran 3D operasyon küresi.
 *
 * Ekranın tamamını kaplayan tek bir dünya: 25 istasyon yüzeyden dikilen veri
 * sütunlarıyla, tedarik kanalları akan parçacıklı büyük çember yaylarıyla.
 * Paneller kürenin üstünde cam HUD olarak durur — harita bir kartın içinde
 * değil, ekranın kendisidir.
 *
 * Mimari kural değişmedi: hesap render'dan bağımsız. Süre/maliyet/kanal
 * haritaVeri.ts'ten, konum kure/kureGeo.ts'ten gelir; bu dosya yalnız yerleşim
 * ve etkileşim kurar. CODE konsolundaki "haritada göster" köprüsü aynı store
 * eylemiyle çalışır, yalnız varış noktası artık küre.
 */
import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fmt, f1, mUsd, pct, vir } from '@/engine/format';
import { senaryoHesap, PRESETS } from '@/engine/senaryo';
import { useStore } from '@/app/store';
import {
  HA,
  IST_I,
  eta,
  sureTxt,
  kanalVeri,
  rotaVeri,
  wpSpec,
  metrikDegerler,
  METRIKLER,
  DEPO_AD,
  GRUP,
  type Metrik,
  type RotaGorunum,
} from './harita/haritaVeri';
import { cerceve } from './harita/kure/kureGeo';
import { DEPO_RENK_3D, KANAL_RENK_3D, KURE_RENK, PRENK_3D } from './harita/kure/kureStil';
import type { Odak, YaySpec } from './harita/kure/KureSahne';
import '@/design/kure.css';

const KureSahne = lazy(() => import('./harita/kure/KureSahne'));

/* --------------------------------------------------------- 3D güvenlik ağı
   WebGL açılmazsa sunum durmaz: küre yerine aynı sayıları veren düz liste. */
class SahneKalkani extends Component<{ children: ReactNode; yedek: ReactNode }, { hata: boolean }> {
  state = { hata: false };
  static getDerivedStateFromError() {
    return { hata: true };
  }
  render() {
    return this.state.hata ? this.props.yedek : this.props.children;
  }
}

/** Küre kendiliğinden dönmeye başlamadan önce beklenen boşta süre. */
const BOSTA_MS = 5 * 60_000;

/**
 * Boşta kalma sayacı.
 *
 * Küre varsayılan olarak sabit durur — dönen bir dünyanın üstünde istasyon
 * okumaya çalışmak yoruyor. Ekrana `ms` kadar dokunulmazsa vitrin moduna
 * geçiyor: sunum arasında ekran açık unutulduğunda dünya yavaşça dönmeye
 * başlıyor, ilk fare hareketinde anında duruyor.
 *
 * Sayaç kurup yıkmak yerine zaman damgası tutuluyor: pointermove saniyede
 * onlarca kez geliyor, her birinde setTimeout değiştirmenin âlemi yok. Uyanma
 * yine de anlık — `canli` durumu doğrudan kapatıyor, yoklama yalnız açıyor.
 */
function useBosta(ms: number) {
  const [bosta, setBosta] = useState(false);
  const son = useRef(performance.now());

  useEffect(() => {
    const canli = () => {
      son.current = performance.now();
      setBosta((b) => (b ? false : b));
    };
    const olaylar = ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart'] as const;
    olaylar.forEach((o) => window.addEventListener(o, canli, { passive: true }));
    const yokla = setInterval(() => {
      if (performance.now() - son.current >= ms) setBosta(true);
    }, 2000);
    return () => {
      olaylar.forEach((o) => window.removeEventListener(o, canli));
      clearInterval(yokla);
    };
  }, [ms]);

  return bosta;
}

/* ------------------------------------------------------------- küçük parçalar */

function KCip({
  children,
  acik,
  onClick,
  baslik,
  pas,
}: {
  children: ReactNode;
  acik?: boolean;
  onClick?: () => void;
  baslik?: string;
  pas?: boolean;
}) {
  return (
    <button
      className={'kcip' + (acik ? ' on' : '') + (pas ? ' pas' : '')}
      onClick={onClick}
      title={baslik}
      disabled={pas}
    >
      {children}
    </button>
  );
}

function Nokta({ renk }: { renk: string }) {
  return <i className="kdot" style={{ background: renk }} />;
}

interface Katmanlar {
  kriz: boolean;
  yil33: boolean;
  akis: boolean;
  rota: boolean;
}

const KRITIKLIK = ['AOG kritik', 'Kritik', 'Kritik değil'];

export default function Harita() {
  const senaryo = useStore((s) => s.senaryo);
  const odakIstek = useStore((s) => s.haritaOdak);

  const [kat, setKat] = useState<Katmanlar>({
    kriz: false,
    yil33: false,
    akis: false,
    rota: false,
  });
  const [metrik, setMetrik] = useState<Metrik>('ucak');
  const [krFiltre, setKrFiltre] = useState<number | null>(null);
  const [sel, setSel] = useState(IST_I);
  const [rsen, setRsen] = useState(0);
  const [rpn, setRpn] = useState<number | null>(null);
  const [rk, setRk] = useState<number | null>(null);
  const [wp, setWp] = useState<{ i: number; hedef: number } | null>(null);
  const [uzerinde, setUzerinde] = useState<number | null>(null);
  const [yayIpucu, setYayIpucu] = useState<string | null>(null);
  const [fare, setFare] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tabloAcik, setTabloAcik] = useState(true);
  const [notAcik, setNotAcik] = useState(false);
  const [odak, setOdak] = useState<Odak | null>(null);
  const [ustH, setUstH] = useState(56);
  const bosta = useBosta(BOSTA_MS);

  const nonce = useRef(0);
  const etiketler = useRef<(HTMLDivElement | null)[]>([]);
  const zoomRef = useRef<((k: number) => void) | null>(null);
  const sahneRef = useRef<HTMLDivElement>(null);

  /** kamerayı bir istasyon kümesine uçur */
  const ucur = (idx: number[]) => {
    nonce.current += 1;
    setOdak({ poz: cerceve(idx), nonce: nonce.current });
  };

  /* üst bar yüksekliği ölçülür: küre kalan alanı tam kaplasın */
  useEffect(() => {
    const el = document.querySelector('.topbar') as HTMLElement | null;
    if (!el) return;
    const ol = () => setUstH(el.offsetHeight);
    ol();
    const ro = new ResizeObserver(ol);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Açılış kadrajı SENKRON hesaplanır (uçuş değil): sekmeye geçildiğinde küre
     ilk karede doğru yere bakar. CODE'dan "haritada göster" ile gelindiyse
     doğrudan o rotanın kadrajında doğar — sunumda bekleme yok. */
  const [baslangic] = useState<[number, number, number]>(() => {
    if (odakIstek) {
      const h = HA.kod.indexOf(odakIstek.hedef);
      if (h >= 0) {
        const ks = kanalVeri(wpSpec(odakIstek.parca, odakIstek.hedef), h);
        const k = ks.find((o) => o.tip === odakIstek.mod) ?? ks[0];
        return cerceve([k && k.i >= 0 ? k.i : h, h]);
      }
    }
    return cerceve(HA.kod.map((_, i) => i));
  });

  /* ---- CODE / Watchlist köprüsü: "haritada göster" ---- */
  useEffect(() => {
    if (!odakIstek) return;
    const hedef = HA.kod.indexOf(odakIstek.hedef);
    if (hedef < 0) return;
    setKat((k) => ({ ...k, rota: false }));
    setWp({ i: odakIstek.parca, hedef });
    setRpn(0);
    setSel(hedef);
    const ks = kanalVeri(wpSpec(odakIstek.parca, odakIstek.hedef), hedef);
    const k = ks.findIndex((o) => o.tip === odakIstek.mod);
    setRk(k >= 0 ? k : null);
    // kadraj yukarıdaki tek kuralda: wp değişimi orayı tetikler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [odakIstek]);

  /* ------------------------------------------------------------- türetilenler */
  const M = useMemo(
    () => metrikDegerler(metrik, krFiltre, kat.yil33),
    [metrik, krFiltre, kat.yil33],
  );
  const metrikBilgi = METRIKLER.find((m) => m.k === metrik)!;
  const krSecilebilir = metrik !== 'ucak' && metrik !== 'adet';

  /** kriz katmanı: Senaryo sekmesindeki ayarla bağlı — kırmızı yükü kaç katına çıkıyor */
  const kf = useMemo(() => {
    if (!kat.kriz || senaryo.preset === 'baz') return 1;
    return senaryoHesap(senaryo).kir / 134;
  }, [kat.kriz, senaryo]);

  const rota: RotaGorunum | null = useMemo(
    () => (kat.rota || wp ? rotaVeri(rsen, wp) : null),
    [kat.rota, wp, rsen],
  );
  const kanallar = useMemo(
    () => (rota && rpn != null ? kanalVeri(rota.sc.parcalar[rpn], rota.hIdx) : null),
    [rota, rpn],
  );

  /* KADRAJ KURALI: küre "şu an konuşulan yolu" gösterir.
     · parça seçili değilse → hedef + her parçanın önerilen kaynağı
     · parça seçiliyse     → hedef + SEÇİLİ kanalın kaynağı (yoksa önerilen)
     Bütün kanalları birden çerçevelemek kamerayı dünyaya kadar geri çekiyordu
     (JFK havuz seçeneği yüzünden Türkiye kenarda kalıyordu); böylece kanal
     satırına tıklamak kürede o yolu açan bir harekete dönüşüyor. */
  useEffect(() => {
    if (!rota) return;
    let idx: number[];
    if (rpn != null || rota.wp) {
      const ks = kanalVeri(rota.sc.parcalar[rpn ?? 0], rota.hIdx);
      const secili = (rk != null ? ks[rk] : ks[0]) ?? ks[0];
      idx = [secili?.i ?? rota.hIdx, rota.hIdx];
    } else {
      idx = rota.parcalar.map((p) => p.ops[0]?.i ?? -1).concat([rota.hIdx]);
    }
    ucur(Array.from(new Set(idx.filter((i) => i >= 0))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kat.rota, rsen, rpn, rk, wp]);

  /* --- yaylar: rota kanalları + (istenirse) tamir akışı ------------------- */
  const yaylar: YaySpec[] = useMemo(() => {
    const out: YaySpec[] = [];
    if (rota && kanallar) {
      kanallar.forEach((o, ki) => {
        if (o.i < 0 || o.i === rota.hIdx) return;
        out.push({
          a: o.i,
          b: rota.hIdx,
          renk: KANAL_RENK_3D[o.tip] ?? KURE_RENK.notr,
          tip: o.tip,
          vurgu: rk === ki || (rk == null && ki === 0),
          soluk: rk != null && rk !== ki,
          kat: ki * 0.4,
          tikla: () => setRk((v) => (v === ki ? null : ki)),
          ipucu: `${o.ad} · ${o.kod} → ${rota.sc.hedef} · ${sureTxt(o.saat)} · ${
            o.mal == null ? o.malTxt || '—' : mUsd(o.mal)
          }`,
        });
      });
    } else if (rota) {
      /* Genel görünümde parça başına YALNIZ önerilen yol çizilir: beş parçanın
         bütün seçenekleri aynı anda çizilince hedefte okunmaz bir demet oluşuyor
         (ölçüldü). Alternatif kanallar parçaya tıklayınca açılır. */
      rota.parcalar.forEach((p) => {
        const o = p.ops[0];
        if (!o || o.i < 0 || o.i === rota.hIdx) return;
        out.push({
          a: o.i,
          b: rota.hIdx,
          renk: PRENK_3D[p.n % PRENK_3D.length],
          tip: o.tip,
          vurgu: true,
          soluk: false,
          kat: p.n * 0.34,
          tikla: () => {
            setRpn(p.n);
            setRk(null);
          },
          ipucu: `PN-${p.pn} · ${o.kod} → ${rota.sc.hedef} · ${sureTxt(o.saat)} · tıkla: tüm kanallar`,
        });
      });
    }
    if (kat.akis) {
      HA.kod.forEach((_, i) => {
        if (i === IST_I || HA.depo[i] === 'yok') return;
        if (HA.yd[i])
          out.push({
            a: IST_I,
            b: i,
            renk: KANAL_RENK_3D.distamir,
            tip: 'distamir',
            vurgu: false,
            soluk: false,
            kat: 0.1,
          });
        else
          out.push({
            a: i,
            b: IST_I,
            renk: KANAL_RENK_3D.depo,
            tip: 'depo',
            vurgu: false,
            soluk: false,
            kat: 0.05,
          });
      });
    }
    return out;
  }, [rota, kanallar, rk, kat.akis]);

  /** etiket önceliği: hub'lar, rotadaki noktalar, seçili ve metrikte öne çıkanlar */
  const oncelik = useMemo(() => {
    const rotaSet = new Set<number>(yaylar.flatMap((y) => [y.a, y.b]));
    const esik = [...M.deger].sort((a, b) => b - a)[7] ?? 0;
    return HA.kod.map(
      (_, i) =>
        i === sel ||
        i === uzerinde ||
        rotaSet.has(i) ||
        HA.depo[i] === 'ana_depo' ||
        HA.depo[i] === 'ileri_depo' ||
        M.deger[i] >= esik,
    );
  }, [yaylar, sel, uzerinde, M]);

  const sira = useMemo(() => HA.kod.map((_, i) => i).sort((a, b) => M.deger[b] - M.deger[a]), [M]);
  const g = GRUP[HA.grp[sel]];
  const ipucuIdx = uzerinde ?? null;

  const durum = rota
    ? rota.wp
      ? `ROTA · ${rota.sc.ucak} → ${rota.sc.hedef} · en hızlı ${sureTxt(rota.kritik)}`
      : `ROTA · ${rota.sc.ucak} · ${rota.sc.hedef} · 5 parça · kritik yol ${vir(rota.kritik)} saat`
    : kat.kriz
      ? senaryo.preset === 'baz'
        ? 'KRİZ KATMANI · normal durum, Senaryo sekmesinden bir kriz seçin'
        : `KRİZ · ${PRESETS[senaryo.preset]?.ad ?? 'özel senaryo'} · kırmızı ×${f1(kf)}`
      : 'TEMSİLÎ DAĞITIM · istasyon kırılımı veride yok';

  /* --------------------------------------------------------------- yedek liste */
  const yedek = (
    <div className="kure-yedek">
      <b>3D katmanı bu tarayıcıda açılamadı</b> (WebGL kapalı olabilir). Sayılar çalışmaya devam
      ediyor:
      <ul>
        {sira.slice(0, 10).map((i) => (
          <li key={i}>
            <b>{HA.kod[i]}</b> {HA.ad[i]} — {DEPO_AD[HA.depo[i]]} · {metrikBilgi.ad}{' '}
            {fmt(M.deger[i])} {metrikBilgi.birim}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div
      className="kure"
      style={{ ['--ust-h' as string]: ustH + 'px' }}
      onMouseMove={(e) => {
        const r = sahneRef.current?.getBoundingClientRect();
        if (r) setFare({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
    >
      {/* ══════════════════════════════════════════════════ küre */}
      <div className="kure-sahne" ref={sahneRef}>
        <SahneKalkani yedek={yedek}>
          <Suspense fallback={<div className="kure-yukleniyor">DÜNYA YÜKLENİYOR…</div>}>
            <KureSahne
              deger={M.deger}
              max={M.max}
              sec={sel}
              kriz={kf}
              yaylar={yaylar}
              hedef={rota ? rota.hIdx : null}
              odak={odak}
              /* Dönüş artık varsayılan değil: yalnız 5 dk boşta kalınca. */
              otoDon={bosta && !rota && !odakIstek}
              oncelik={oncelik}
              onSec={setSel}
              onIstasyonUzerinde={setUzerinde}
              onYayUzerinde={setYayIpucu}
              etiketler={etiketler}
              baslangic={baslangic}
              zoomKayit={(f) => {
                zoomRef.current = f;
              }}
            />
          </Suspense>
        </SahneKalkani>

        {/* istasyon etiketleri: tuvalin üstünde kendi katmanımız (bkz. KureSahne) */}
        <div className="kure-etiketler">
          {HA.kod.map((k, i) => (
            <div
              key={k}
              ref={(el) => {
                etiketler.current[i] = el;
              }}
              className={'kist' + (sel === i ? ' on' : '') + (HA.yd[i] ? ' dis' : '')}
              onClick={() => setSel(i)}
            >
              <b>{k}</b>
              <span>{fmt(M.deger[i])}</span>
            </div>
          ))}
        </div>

        {(ipucuIdx != null || yayIpucu) && (
          <motion.div
            className="kure-ipucu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              left: Math.min(fare.x + 16, (sahneRef.current?.clientWidth ?? 900) - 270),
              top: fare.y + 12,
            }}
          >
            {yayIpucu ? (
              <span>{yayIpucu}</span>
            ) : ipucuIdx != null ? (
              <>
                <b>
                  {HA.kod[ipucuIdx]} · {HA.ad[ipucuIdx]}
                </b>
                <span>
                  {DEPO_AD[HA.depo[ipucuIdx]]} · uçak{' '}
                  {kat.yil33 ? HA.u33[ipucuIdx] : HA.u25[ipucuIdx]}
                </span>
                <span>
                  {metrikBilgi.ad}: <b>{fmt(M.deger[ipucuIdx])}</b> {metrikBilgi.birim}
                </span>
                <span>
                  IST transfer{' '}
                  {HA.tsaat[ipucuIdx] === 0 ? 'ana üs' : vir(HA.tsaat[ipucuIdx]) + ' saat'} · AOG
                  kapsam {pct(HA.kapsam[ipucuIdx] * 100, 0)}
                </span>
              </>
            ) : null}
          </motion.div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════ HUD */}
      <div className="kure-hud">
        {/* ---------------------------------------------------- sol üst: kontrol */}
        <div className="kp sol-ust">
          <div className="kp-bas">
            <span className="kod">MAP-01</span>
            <h3>İstasyon ağı</h3>
            <span className="krz">{HA.kod.length} nokta</span>
          </div>
          <div className="kp-ic">
            <div className="ketiket">Sütun yüksekliği</div>
            <div className="ksatir">
              {METRIKLER.map((m) => (
                <KCip
                  key={m.k}
                  acik={metrik === m.k}
                  onClick={() => setMetrik(m.k)}
                  baslik={m.ipucu}
                >
                  {m.ad}
                </KCip>
              ))}
            </div>

            <div className="ketiket">
              Operasyonel önem süzgeci
              {!krSecilebilir && <i className="pas-not"> · bu metrikte geçerli değil</i>}
            </div>
            <div className="ksatir">
              <KCip acik={krFiltre == null} pas={!krSecilebilir} onClick={() => setKrFiltre(null)}>
                Tümü
              </KCip>
              {KRITIKLIK.map((k, i) => (
                <KCip
                  key={k}
                  acik={krFiltre === i}
                  pas={!krSecilebilir}
                  onClick={() => setKrFiltre(i)}
                >
                  {k}
                </KCip>
              ))}
            </div>

            <div className="ketiket">Katmanlar</div>
            <div className="ksatir">
              {(
                [
                  ['yil33', '2033'],
                  ['akis', 'Tamir akışı'],
                  ['rota', 'Parça rotası'],
                  ['kriz', 'Kriz katmanı'],
                ] as [keyof Katmanlar, string][]
              ).map(([k, ad]) => (
                <KCip key={k} acik={kat[k]} onClick={() => setKat((s) => ({ ...s, [k]: !s[k] }))}>
                  {ad}
                </KCip>
              ))}
            </div>

            <div className="ktoplam">
              <span>{metrikBilgi.ad} toplamı</span>
              <b>
                {fmt(M.toplam)} {metrikBilgi.birim}
              </b>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------- sol alt: istasyonlar */}
        <div className={'kp sol-alt' + (tabloAcik ? '' : ' kapali')}>
          <div className="kp-bas" onClick={() => setTabloAcik((v) => !v)} role="button">
            <span className="kod">MAP-02</span>
            <h3>İstasyonlar</h3>
            <span className="krz">{metrikBilgi.ad} sıralı</span>
            <span className="kat">{tabloAcik ? '▾' : '▸'}</span>
          </div>
          {tabloAcik && (
            <div className="kp-ic liste">
              {sira.map((i) => (
                <button
                  key={i}
                  className={'ksat' + (sel === i ? ' on' : '')}
                  onClick={() => {
                    setSel(i);
                    ucur([i]);
                  }}
                  onMouseEnter={() => setUzerinde(i)}
                  onMouseLeave={() => setUzerinde(null)}
                >
                  <Nokta renk={DEPO_RENK_3D[HA.depo[i]]} />
                  <b>{HA.kod[i]}</b>
                  <span className="ad">{HA.ad[i]}</span>
                  <span className="ray">
                    <i style={{ width: Math.max(3, (100 * M.deger[i]) / M.max) + '%' }} />
                  </span>
                  <span className="dg">{fmt(M.deger[i])}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------- sağ üst: seçili nokta */}
        <div className="kp sag-ust">
          <div className="kp-bas">
            <span className="kod">MAP-03</span>
            <h3>
              {HA.kod[sel]} · {HA.ad[sel]}
            </h3>
            <Nokta renk={DEPO_RENK_3D[HA.depo[sel]]} />
          </div>
          <div className="kp-ic">
            <div className="kizgara">
              <div>
                <span>Depo tipi</span>
                <b>{DEPO_AD[HA.depo[sel]]}</b>
              </div>
              <div>
                <span>Uçak 25 → 33</span>
                <b>
                  {HA.u25[sel]} → {HA.u33[sel]}{' '}
                  <i className={HA.buyume[sel] >= 70 ? 'uy' : 'iy'}>+{pct(HA.buyume[sel], 0)}</i>
                </b>
              </div>
              <div>
                <span>Stok</span>
                <b>
                  {fmt(HA.kalem[sel])} kalem · {fmt(HA.adet[sel])} adet
                </b>
              </div>
              <div>
                <span>IST transfer</span>
                <b>{HA.tsaat[sel] === 0 ? 'ana üs' : vir(HA.tsaat[sel]) + ' saat'}</b>
              </div>
              <div>
                <span>AOG kapsam</span>
                <b>{pct(HA.kapsam[sel] * 100, 0)}</b>
              </div>
              <div>
                <span>{metrikBilgi.ad}</span>
                <b>
                  {fmt(M.deger[sel])} {metrikBilgi.birim}
                </b>
              </div>
            </div>
            {kat.kriz && kf > 1 && (
              <div className="kuyari">Kriz katmanı açık · bu noktada kırmızı yükü ×{f1(kf)}</div>
            )}
            <div className="knot">
              Case tablosunda "{g.ad}" grubu {g.u25}→{g.u33} uçak. Bu nokta grubun{' '}
              {pct((100 * HA.u25[sel]) / g.u25, 0)} payıyla temsil edilir; gerçek üründe istasyon
              etiketli stok kaydından gelir.
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------ sağ alt: rota */}
        {rota && (
          <div className="kp sag-alt">
            <div className="kp-bas">
              <span className="kod">MAP-04</span>
              <h3>Parça rotası</h3>
              <span className="krz al">kritik yol {sureTxt(rota.kritik)}</span>
            </div>
            <div className="kp-ic">
              <div className="ksatir">
                {rota.wp ? (
                  <>
                    <KCip acik>
                      PN-{rota.sc.parcalar[0].pn} → {rota.sc.hedef}
                    </KCip>
                    <KCip
                      onClick={() => {
                        setWp(null);
                        setRpn(null);
                        setRk(null);
                      }}
                    >
                      ✕ kapat
                    </KCip>
                  </>
                ) : (
                  <>
                    {HA.rota.map((s, n) => (
                      <KCip
                        key={n}
                        acik={n === rsen}
                        onClick={() => {
                          // kadraj: rsen değişince üstteki etki rotayı çerçeveler
                          setRsen(n);
                          setRpn(null);
                          setRk(null);
                          setSel(HA.kod.indexOf(s.hedef));
                        }}
                      >
                        {s.ucak} · {s.hedef}
                      </KCip>
                    ))}
                    <KCip
                      acik={rpn == null}
                      onClick={() => {
                        setRpn(null);
                        setRk(null);
                      }}
                    >
                      Tüm parçalar
                    </KCip>
                    {rota.parcalar.map((p) => (
                      <KCip
                        key={p.n}
                        acik={rpn === p.n}
                        onClick={() => {
                          setRpn(p.n);
                          setRk(null);
                        }}
                      >
                        <Nokta renk={PRENK_3D[p.n % PRENK_3D.length]} />
                        PN-{p.pn}
                      </KCip>
                    ))}
                  </>
                )}
              </div>

              {kanallar && rpn != null ? (
                <>
                  <div className="knot" style={{ margin: '2px 0 6px' }}>
                    <b style={{ color: PRENK_3D[rpn % PRENK_3D.length] }}>
                      PN-{rota.parcalar[rpn].pn}
                    </b>{' '}
                    {rota.parcalar[rpn].sub} — {rota.sc.hedef} istasyonuna tüm geliş kanalları,
                    süreye göre. Satıra tıkla: küredeki yay öne çıkar.
                  </div>
                  <div className="ktablo">
                    {kanallar.map((o, oi) => (
                      <button
                        key={oi}
                        className={'ksat kanal' + (rk === oi ? ' on' : '')}
                        onClick={() => setRk((v) => (v === oi ? null : oi))}
                      >
                        <Nokta renk={KANAL_RENK_3D[o.tip] ?? KURE_RENK.notr} />
                        <b>{o.ad}</b>
                        <span className="ad mono">{o.kod}</span>
                        {oi === 0 && <span className="oner">önerilen</span>}
                        <span className="dg">{sureTxt(o.saat)}</span>
                        <span className="dg mal">
                          {o.mal == null ? o.malTxt || '—' : mUsd(o.mal)}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="knot">
                  {rota.parcalar.map((p) => (
                    <div key={p.n} style={{ marginBottom: 3 }}>
                      <b style={{ color: PRENK_3D[p.n % PRENK_3D.length] }}>PN-{p.pn}</b> {p.sub} →
                      önerilen <b>{p.ops[0].kod}</b> {p.ops[0].tip === 'pool' ? 'pool' : 'depo'}{' '}
                      <b className="mono">{vir(p.ops[0].saat)} saat</b> · satın alma{' '}
                      <b className="mono">{fmt(p.alim)} gün</b>
                    </div>
                  ))}
                  <div style={{ marginTop: 5 }}>
                    Uçak, en geç parça ulaşınca toparlanır. Bir parçaya tıklayınca o parçanın BÜTÜN
                    geliş kanalları küreye açılır: depo, havuz, donörden söküm, iç/dış tamir,
                    hızlandırılmış tamir, satın alma. Temsilîdir.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------- alt orta: kamera kumandası */}
        <div className="kure-kamera">
          <button onClick={() => zoomRef.current?.(0.8)} title="yakınlaş">
            +
          </button>
          <button onClick={() => zoomRef.current?.(1.25)} title="uzaklaş">
            −
          </button>
          <button
            title="Türkiye"
            onClick={() => ucur(HA.kod.map((_, i) => i).filter((i) => !HA.yd[i]))}
          >
            TR
          </button>
          <button title="tüm ağ" onClick={() => ucur(HA.kod.map((_, i) => i))}>
            ⌂
          </button>
          {rota && (
            <button
              title="rotayı çerçevele"
              onClick={() => ucur(yaylar.flatMap((y) => [y.a, y.b]).concat([rota.hIdx]))}
            >
              ✈
            </button>
          )}
          <button
            className={notAcik ? 'on' : ''}
            title="varsayımlar ve veri notu"
            onClick={() => setNotAcik((v) => !v)}
          >
            ⓘ
          </button>
        </div>

        {/* ---------------------------------------------------- alt: durum şeridi */}
        <div className="kure-serit">
          <span className={'durum' + (rota ? ' rota' : kat.kriz && kf > 1 ? ' kriz' : '')}>
            {durum}
          </span>
          <span className="ayr" />
          {Object.keys(DEPO_RENK_3D).map((t) => (
            <span key={t} className="lej">
              <Nokta renk={DEPO_RENK_3D[t]} />
              {DEPO_AD[t]}
            </span>
          ))}
          <span className="ayr" />
          <span className="lej sol-bosluk">
            sütun boyu = {metrikBilgi.ad.toLocaleLowerCase('tr')} · akış yönü kaynak → hedef · hız
            kanal tipine bağlı
          </span>
          <span className="ipucu-jest">sürükle · tekerlekle yakınlaş · noktaya tıkla</span>
        </div>
      </div>

      {/* --------------------------------------------------------- dipnot */}
      <div className="kure-dipnot" hidden={!notAcik}>
        İstasyon başına stok verisi resmi veri setlerinde yoktur; dağıtım kurala bağlı temsildir
        (grup toplamları case tablosuyla birebir tutar). Transfer süreleri büyük çember mesafesi +
        elleçleme varsayımıyla hesaplanır — örn. {sureTxt(eta(HA.kod.indexOf('ESB'), IST_I))}{' '}
        ESB→IST. Küredeki {HA.kod.length} istasyon ve kıta konturu 110m Natural Earth türevinden
        çalışma anında üretilir; sahne internet bağlantısı olmadan çalışır.
      </div>
    </div>
  );
}
