/**
 * 1 · CODE — COMPONENT DECISION ENGINE
 *
 * Uygulamanın açılış ekranı ve tek karar yüzeyi. Beş katman:
 *   ① çekirdek     — 5.000 parçanın 3D operasyon küresi (sahneden seçim = listeden seçim)
 *   ② içgörü akışı — motorun bulgularını cümleye çeviren katman (sayılar canlı)
 *   ③ karar konsolu— kritik komponent kararları (watchlist'ten TAŞINDI)
 *   ④ kısa vade    — kanal yönlendirici, pencere alarmı, transfer önerileri
 *   ⑤ uzun vade    — 2033 yol haritası, faz kapıları metrik
 *
 * Bütün sayılar aynı kural motorundan (engine/karar.ts) gelir; ekran hesaplama yapmaz.
 */
import { Component, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { D, K, PN, LK, NPN } from '@/data/payload';
import { kararMotoru } from '@/engine/karar';
import { FL, hasF } from '@/engine/flags';
import type { Kova, Pencere } from '@/engine/ladder';
import { fmt, mM, mUsd, pct } from '@/engine/format';
import { useStore } from '@/app/store';
import { icgoruler, TIP_AD, type Icgoru } from './code/icgoru';
import { KAYNAKLAR, SC } from './code/sahneVeri';
import KararKonsolu from './code/KararKonsolu';
import UzunVade from './code/UzunVade';
import '@/design/code.css';

const Kure = lazy(() => import('./code/Kure'));

/* --------------------------------------------------- 3D güvenlik ağı
   WebGL kapalıysa ya da sürücü çökerse sunum durmasın: sahne yerine
   aynı sayıları veren düz bir kart gösterilir. */
class SahneKalkani extends Component<{ children: ReactNode; yedek: ReactNode }, { hata: boolean }> {
  state = { hata: false };
  static getDerivedStateFromError() {
    return { hata: true };
  }
  render() {
    return this.state.hata ? this.props.yedek : this.props.children;
  }
}

/* Siyah–kırmızı–beyaz palette kanallar hue ile değil açıklıkla ayrışır:
   elimizdeki kaynak beyaz/gri, para çıkışı kırmızının tonlarıdır. */
const KANAL_RENK: Record<string, string> = {
  pool: 'var(--c-iyi)',
  tamir: 'var(--c-gri)',
  alim: 'var(--c-uyari)',
  izle: 'var(--c-alt)',
  fazla: 'var(--c-red2)',
};

export default function Code() {
  const d = useMemo(() => kararMotoru(), []);
  const G = useMemo(() => icgoruler(), []);

  const secili = useStore((s) => s.codeParca);
  const codeSec = useStore((s) => s.codeSec);
  const kuyrukSec = useStore((s) => s.kuyrukSec);
  const watchAc = useStore((s) => s.watchAc);
  const parcaAc = useStore((s) => s.parcaAc);
  const haritadaGoster = useStore((s) => s.haritadaGoster);
  const git = useStore((s) => s.git);
  const konsolIstek = useStore((s) => s.codeOdak);

  const konsolRef = useRef<HTMLDivElement>(null);
  const trfRef = useRef<HTMLDivElement>(null);
  const [gIdx, setGIdx] = useState(0);
  const [hepsi, setHepsi] = useState(false);
  const [duraklat, setDuraklat] = useState(false);
  const [kaynak, setKaynak] = useState<string | null>(null);

  /* İçgörü akışı kendi kendine ilerler.
     Akış okunurken durmalı: fare akışın üstündeyken sayaç işlemez. */
  useEffect(() => {
    if (hepsi || duraklat) return;
    const t = setInterval(() => setGIdx((v) => (v + 4) % G.length), 10000);
    return () => clearInterval(t);
  }, [G.length, hepsi, duraklat]);

  /* Watchlist → "CODE konsolunda karar ver": sekme açıldığında konsola kaydır.
     Gecikme BİLEREK var — sekme yeni mount oluyor, aynı karede scrollIntoView
     çağrılırsa hedefin yüksekliği daha hesaplanmamış oluyor ve sayfa yarı yolda
     kalıyor (ölçüldü). nonce değişmedikçe bir daha çalışmaz. */
  useEffect(() => {
    if (!konsolIstek) return;
    const t = setTimeout(
      () => konsolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      90,
    );
    return () => clearTimeout(t);
  }, [konsolIstek?.nonce, konsolIstek]);

  const konsolaGit = (i: number) => {
    codeSec(i);
    konsolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* içgörü kartının eylemi — her biri bir ekrana ya da kuyruğa bağlanır */
  const icgoruAc = (g: Icgoru) => {
    if (g.id === 'pencere') {
      kuyrukSec('alarm');
      if (g.pn != null) konsolaGit(g.pn);
      return;
    }
    if (g.id === 'fazla') {
      trfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (g.id === 'kabiliyet' || g.id === 'float') return git('senaryo');
    if (g.id === 'kategori' || g.id === 'mevsim') return git('ongoru');
    if (g.flag) return watchAc({ flag: g.flag });
    if (g.pn != null) konsolaGit(g.pn);
  };

  /* --- fazla stok dengeleme: temsilî kaynak/hedef, harita köprüsü gerçek --- */
  const transferler = useMemo(() => {
    const KAY = ['IST', 'ESB', 'ADB'];
    const HK = D.harita.kod;
    const hatlar = HK.filter((_, j) => D.harita.depo[j] === 'hat_stok');
    const adOf = (k: string) => D.harita.ad[HK.indexOf(k)];
    return d.fazla.idx.slice(0, 6).map((i) => {
      const pnNum = +PN.id[i];
      const fz = PN.svc[i] - PN.max33[i];
      const kay = KAY[pnNum % KAY.length];
      const hed = hatlar[(pnNum >> 3) % hatlar.length];
      return { i, fz, kay, hed, kayAd: adOf(kay), hedAd: adOf(hed) };
    });
  }, [d]);

  const enB = Math.max(d.say.izle, d.say.pool, d.say.tamir, d.say.alim);
  const yuz = (n: number) => pct((100 * n) / NPN, 1);
  const gGoster = hepsi
    ? G
    : G.slice(gIdx, gIdx + 4).concat(G.slice(0, Math.max(0, gIdx + 4 - G.length)));

  const KANALLAR: [Kova, string, string, number, number | null][] = [
    [
      'pool',
      'HAVUZ / EXCHANGE',
      'değişim ağı bugün de işliyor — açık 3 günde kapanır',
      d.say.pool,
      d.mal.pool,
    ],
    [
      'tamir',
      'TAMİR DÖNGÜSÜ',
      'iç atölye ya da hızlandırılmış dış tamir',
      d.say.tamir,
      d.mal.tamir,
    ],
    ['alim', 'YENİ SATIN ALMA', 'tamir kanalı yok ya da ekonomik değil', d.say.alim, d.mal.alim],
    ['izle', 'İZLE', 'stok MIN üzerinde, bugün aksiyon gerekmez', d.say.izle, null],
  ];

  const UFUK: [Pencere, string, string, string, string][] = [
    [
      'gecmis',
      'BUGÜN',
      'sipariş penceresi geçmiş',
      'var(--c-red)',
      `${fmt(d.pen.gecmis.sip0)} parçada sipariş yok — köprü kanalı + acil sipariş`,
    ],
    [
      'p030',
      '0–30 GÜN',
      'acil pencere',
      'var(--c-uyari)',
      'sipariş ya da tamir emri bu ay açılmalı',
    ],
    ['p3090', '30–90 GÜN', 'yaklaşan', 'var(--c-gri)', 'tedarik planına al, bütçeyi ayır'],
    [
      'p90',
      '90+ GÜN',
      'stratejik',
      'var(--c-iyi)',
      'min-max bandını izle, atölye yatırımını planla',
    ],
  ];

  return (
    <div className="code">
      {/* ════════════════════════════════════════════════ ① başlık */}
      <header className="code-hero">
        <div>
          <div className="code-marka">
            <motion.h1
              initial={{ opacity: 0, y: 16, letterSpacing: '0.08em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '-0.055em' }}
              transition={{ duration: 0.75, ease: [0.22, 0.61, 0.36, 1] }}
            >
              C<i>O</i>DE
            </motion.h1>
          </div>
          <motion.div
            className="code-acilim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
          >
            Component Decision Engine
          </motion.div>
          <p className="code-alt">
            Dağınık komponent kayıtlarını tek modelde birleştiren, talebi 2033'e projekte eden ve
            her kritik parça için <b>tek bir aksiyon öneren</b> karar motoru. Ekrandaki her sayı{' '}
            {fmt(NPN)} parçanın canlı verisinden yeniden hesaplanır — maket yok.
          </p>

          <div className="code-durum">
            <div>
              <div className="l">Motor</div>
              <div className="v on">
                <span className="nabiz" />
                ÇALIŞIYOR
              </div>
            </div>
            <div>
              <div className="l">Kapsam</div>
              <div className="v">{fmt(NPN)} parça</div>
            </div>
            <div>
              <div className="l">Açık alarm</div>
              <div className="v al">
                <span className="nabiz al" />
                {fmt(d.alarm.length)}
              </div>
            </div>
            <div>
              <div className="l">Aksiyon kuyruğu</div>
              <div className="v uy">{fmt(d.aksiyon)}</div>
            </div>
            <div>
              <div className="l">Filo ufku</div>
              <div className="v">1.200 → 2.000</div>
            </div>
          </div>
        </div>

        <div>
          <div className="code-panel">
            <div className="bas">
              <span className="kod">CDE-00</span>
              <h3>Bağlı kaynaklar</h3>
              <div className="sagg">
                <span className="crz iy">{KAYNAKLAR.length} kanal</span>
              </div>
            </div>
            <div className="icerik">
              <div className="kaynak-l">
                {KAYNAKLAR.map((k) => (
                  <button
                    key={k.kod}
                    className={'kaynak-c' + (kaynak && kaynak !== k.kod ? ' pas' : '')}
                    onClick={() => setKaynak(kaynak === k.kod ? null : k.kod)}
                    title={`${k.ad} — küredeki düğümü vurgular`}
                  >
                    <i />
                    <b>{k.kod}</b>
                    {k.ad}
                  </button>
                ))}
              </div>
              <div className="not" style={{ padding: '10px 0 0', border: 0 }}>
                Kaynaklar <b>yalnız okunur</b>: CDC ile çekilir, tek veri modelinde birleşir. Hiçbir
                kaynağa geri yazılmaz — AMOS değişmez, üzerine karar katmanı gelir.
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* ════════════════════════════════════════════════ ② çekirdek + içgörü */}
      <div className="code-izgara ci-21">
        <div className="code-sahne">
          <SahneKalkani
            yedek={
              <div
                style={{
                  padding: 30,
                  color: 'var(--c-tx2)',
                  fontSize: 'var(--fs-kucuk)',
                }}
              >
                3D katmanı bu tarayıcıda açılamadı (WebGL kapalı olabilir). Konsol ve tüm sayılar
                aşağıda çalışmaya devam ediyor.
              </div>
            }
          >
            <Suspense
              fallback={
                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    height: '100%',
                    color: 'var(--c-tx3)',
                    fontFamily: 'var(--tk-font-mono)',
                    fontSize: 'var(--fs-mikro)',
                    letterSpacing: '.2em',
                  }}
                >
                  ÇEKİRDEK YÜKLENİYOR…
                </div>
              }
            >
              <Kure
                secili={secili}
                onSec={konsolaGit}
                vurguKaynak={kaynak}
                onKaynak={(k) => setKaynak((v) => (v === k ? null : k))}
              />
            </Suspense>
          </SahneKalkani>

          <span className="kose tl" />
          <span className="kose tr" />
          <span className="kose bl" />
          <span className="kose br" />

          <div className="sahne-hud">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                ÇEKİRDEK · {fmt(NPN)} PARÇA
                <br />
                <b>KUZEY KUTBU = EN YÜKSEK RİSK</b>
              </div>
              <div className="sag">
                DÖNDÜR · YAKINLAŞTIR · NOKTAYA TIKLA
                <br />
                <b>SEÇİM KONSOLA DÜŞER</b>
              </div>
            </div>
            <div className="sahne-lgn">
              <span>
                <i style={{ background: SC.alarm }} /> siparişsiz {fmt(K.siparissiz)}
              </span>
              <span>
                <i style={{ background: SC.kirmizi }} /> tükeniyor {fmt(K.kirmizi - K.siparissiz)}
              </span>
              <span>
                <i style={{ background: SC.aksiyon }} /> aksiyon {fmt(d.aksiyon)}
              </span>
              <span>
                <i style={{ background: SC.izle }} /> izle {fmt(d.say.izle)}
              </span>
            </div>
          </div>

          {secili >= 0 && (
            <div className="sahne-sec">
              <div className="pn">PN-{PN.id[secili]}</div>
              <div className="mt">
                {LK.sub[PN.sub[secili]]} · {LK.mdl[PN.mdl[secili]]} · {LK.kr[PN.kr[secili]]}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="ccip" onClick={() => konsolaGit(secili)}>
                  konsolda aç
                </button>
                <button className="ccip" onClick={() => parcaAc(secili)}>
                  analiz
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="code-panel" style={{ marginBottom: 0 }}>
          <div className="bas">
            <span className="kod">CDE-02</span>
            <h3>İçgörü akışı</h3>
            <div className="sagg">
              <button className="ccip" onClick={() => setHepsi((v) => !v)}>
                {hepsi ? 'akışa dön' : `tümü (${G.length})`}
              </button>
            </div>
          </div>
          <div className="icerik" style={hepsi ? { maxHeight: 470, overflowY: 'auto' } : undefined}>
            {/* Sayfa dolusu kart TEK blok olarak değişir: kart kart giriş/çıkış
                denendiğinde çıkanla giren üst üste biniyor ve metin okunmuyordu. */}
            <motion.div
              className="ai-akis"
              key={hepsi ? 'hepsi' : gIdx}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
              onMouseEnter={() => setDuraklat(true)}
              onMouseLeave={() => setDuraklat(false)}
            >
              {gGoster.map((g) => (
                <button key={g.id} className={'ai-kart ' + g.tip} onClick={() => icgoruAc(g)}>
                  <div className="ust">
                    <span
                      className={
                        'crz ' +
                        (g.tip === 'alarm'
                          ? 'al'
                          : g.tip === 'risk'
                            ? 'uy'
                            : g.tip === 'firsat'
                              ? 'iy'
                              : 'mo')
                      }
                    >
                      {TIP_AD[g.tip]}
                    </span>
                    <span className="kaynak">{g.kaynak}</span>
                    <span className="guv">
                      <span className="ray">
                        <i style={{ width: g.guven + '%' }} />
                      </span>
                      %{g.guven}
                    </span>
                  </div>
                  <h4>{g.baslik}</h4>
                  <p>{g.metin}</p>
                  {g.eylem && <div className="eyl">▸ {g.eylem}</div>}
                </button>
              ))}
            </motion.div>
          </div>
          <div className="not">
            <b>Dürüstlük notu.</b> Cümle kalıpları ve güven yüzdeleri dil katmanının kendi
            beyanıdır; içindeki <b>sayıların hepsi</b> kural motorundan canlı gelir. Ürün sürümünde
            bu katman LLM'e devredilir, motor değişmez.
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════ ③ özet sayaçlar */}
      <div className="code-izgara ci-4">
        <div className="ckpi uy">
          <div className="l">Aksiyon gerektiren parça</div>
          <div className="v">{fmt(d.aksiyon)}</div>
          <div className="d">
            {fmt(NPN)} parça içinde pay {yuz(d.aksiyon)} · kalan {fmt(d.say.izle)} izlemede
          </div>
        </div>
        <div className="ckpi al">
          <div className="l">Sipariş penceresi kaçmış</div>
          <div className="v">{fmt(d.alarm.length)}</div>
          <div className="d">sipariş açılmamış · en geç −{fmt(d.enGec)} gün</div>
        </div>
        <div className="ckpi iy">
          <div className="l">Toplam kapatma maliyeti</div>
          <div className="v">{mM(d.kapTop / 1e6)}</div>
          <div className="d">açık adet × her parçanın en hızlı kanal birim maliyeti</div>
        </div>
        <div className="ckpi mo">
          <div className="l">Fazla stok</div>
          <div className="v">{mM(d.fazla.deger / 1e6)}</div>
          <div className="d">
            {fmt(d.fazla.n)} parça · {fmt(d.fazla.adet)} adet — transferle değerlenebilir
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════ ④ karar konsolu */}
      <div ref={konsolRef} style={{ scrollMarginTop: 70 }}>
        <KararKonsolu />
      </div>

      {/* ════════════════════════════════════════════════ ⑤ kanal + pencere */}
      <div className="code-izgara ci-21">
        <div className="code-panel" style={{ marginBottom: 0 }}>
          <div className="bas">
            <span className="kod">CDE-03</span>
            <h3>Karar yönlendirici</h3>
            <div className="sagg">
              <span className="crz no">her parça tek kanala düşer</span>
            </div>
          </div>
          <div className="icerik">
            {KANALLAR.map(([k, ad, ac, n, mal]) => (
              <button key={k} className="kanal-sat" onClick={() => watchAc({ kanal: k })}>
                <span className="ad" style={{ color: KANAL_RENK[k] }}>
                  {ad}
                  <span className="ac">{ac}</span>
                </span>
                <span className="kray">
                  <motion.i
                    style={{ background: KANAL_RENK[k] }}
                    initial={{ width: 0 }}
                    animate={{ width: Math.max(2, (100 * n) / enB) + '%' }}
                    transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
                  />
                </span>
                <span className="sag">
                  <b>{fmt(n)}</b>
                  <span>{yuz(n)}</span>
                  <span>{mal == null ? 'bugün harcama yok' : 'kapatma ' + mM(mal / 1e6)}</span>
                </span>
              </button>
            ))}
            <button
              className="kanal-sat"
              style={{ marginTop: 10 }}
              onClick={() => watchAc({ kanal: 'fazla' as Kova })}
            >
              <span className="ad" style={{ color: KANAL_RENK.fazla }}>
                FAZLA STOK
                <span className="ac">
                  İZLE içinden: MAX üstü adet başka istasyonda değerlenebilir
                </span>
              </span>
              <span className="kray">
                <i
                  style={{
                    background: KANAL_RENK.fazla,
                    width: Math.max(2, (100 * d.fazla.n) / enB) + '%',
                  }}
                />
              </span>
              <span className="sag">
                <b>{fmt(d.fazla.n)}</b>
                <span>{yuz(d.fazla.n)}</span>
                <span>{mM(d.fazla.deger / 1e6)} bağlı sermaye</span>
              </span>
            </button>
          </div>
          <div className="not">
            Kanal, aksiyon merdivenindeki <b>en hızlı gerçek tedarik yolu</b>
            dur; donörden söküm kanal sayılmaz, hurda adayında tamir elenir. Satır tıklanır:
            watchlist o kanala süzülü açılır.
          </div>
        </div>

        <div className="code-panel" style={{ marginBottom: 0 }}>
          <div className="bas">
            <span className="kod">CDE-03B</span>
            <h3>Sipariş penceresi alarmı</h3>
            <div className="sagg">
              <span className="crz al">{fmt(d.alarm.length)} parça</span>
            </div>
          </div>
          <div className="icerik" style={{ padding: 0 }}>
            {d.alarm.slice(0, 10).map((i) => (
              <button key={i} className="kq-row" onClick={() => konsolaGit(i)}>
                <span className="im" style={{ background: 'var(--c-red)' }} />
                <span style={{ minWidth: 0 }}>
                  <span className="pn">PN-{PN.id[i]}</span>
                  <span className="mt">
                    {LK.sub[PN.sub[i]]} · {LK.mdl[PN.mdl[i]]}
                  </span>
                </span>
                <span className="sag">
                  <b>−{fmt(-d.kalan[i])}g</b>
                  <span>
                    {d.kanal[i] === 'pool'
                      ? 'havuz'
                      : d.kanal[i] === 'tamir'
                        ? 'tamir'
                        : 'satın alma'}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="not">
            Kalan gün = dayanma süresi (TTS) − tedarik süresi. {fmt(K.siparissiz)} siparişsiz
            kırmızıdan {fmt(d.pen.gecmis.sip0)} parça pencereyi de kaçırdı;{' '}
            {fmt(d.pen.gecmis.poVar)} parçada pencere geçti ama sipariş yolda.{' '}
            <button
              className="ccip"
              style={{ marginLeft: 4 }}
              onClick={() => watchAc({ pencere: 'gecmis0' })}
            >
              tümünü watchlist'te aç
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════ ⑥ planlama ufku */}
      <div className="code-panel">
        <div className="bas">
          <span className="kod">CDE-03C</span>
          <h3>Planlama ufku</h3>
          <div className="sagg">
            <span className="crz no">"ne zaman" sorusunun cevabı</span>
          </div>
        </div>
        <div className="icerik">
          <div className="code-izgara ci-4" style={{ marginBottom: 0 }}>
            {UFUK.map(([p, ad, alt, renk, eylem]) => {
              const u = d.pen[p];
              return (
                <button
                  key={p}
                  className="ufuk-k"
                  style={{ borderTopColor: renk }}
                  onClick={() => watchAc({ pencere: p })}
                >
                  <div className="ba" style={{ color: renk }}>
                    {ad}
                  </div>
                  <div className="ac">{alt}</div>
                  <div className="sy">{fmt(u.n)}</div>
                  <div className="dt">
                    PN · {yuz(u.n)}
                    {u.mal > 0 ? ' · kapatma ' + mM(u.mal / 1e6) : ''}
                  </div>
                  <div className="ey">{eylem}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════ ⑦ kısa vade transfer */}
      <div className="code-panel" ref={trfRef}>
        <div className="bas">
          <span className="kod">CDE-05</span>
          <h3>Kısa vade · transfer önerileri</h3>
          <span className="crz mo">{mM(d.fazla.deger / 1e6)} serbest kalabilir</span>
          <div className="sagg">
            <span className="crz no">satın alma yerine yeniden dağıt</span>
          </div>
        </div>
        <div className="icerik">
          <div className="code-izgara ci-3" style={{ marginBottom: 0 }}>
            {transferler.map((t) => (
              <div className="trf-k" key={t.i} onClick={() => konsolaGit(t.i)} role="button">
                <div className="ust">
                  <span className="pn">PN-{PN.id[t.i]}</span>
                  {hasF(t.i, FL.KIRMIZI) ? (
                    <span className="crz uy">TÜKENİYOR</span>
                  ) : (
                    <span className="crz no">FAZLA</span>
                  )}
                  <span className="mt">
                    {LK.sub[PN.sub[t.i]]} · {LK.mdl[PN.mdl[t.i]]}
                  </span>
                </div>
                <div className="trf-yol">
                  <span className="uc">
                    <small>kaynak</small>
                    <b>{t.kay}</b>
                    <i>{t.kayAd}</i>
                  </span>
                  <span className="ok">→</span>
                  <span className="uc hed">
                    <small>hedef</small>
                    <b>{t.hed}</b>
                    <i>{t.hedAd}</i>
                  </span>
                </div>
                <div className="alt">
                  <b>{fmt(t.fz)}</b> adet fazla
                  <button
                    className="ccip"
                    onClick={(e) => {
                      e.stopPropagation();
                      haritadaGoster(t.i, t.hed, 'depo');
                    }}
                  >
                    🗺 rota
                  </button>
                  <span className="dg">{mUsd(t.fz * PN.fmv[t.i])}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="not">
          <b>{fmt(d.fazla.n)} parçada</b> MAX üstü stok var; ilk 6'sı serbest kalacak değere göre
          sıralı. Kaynak/hedef eşlemesi <b>temsilîdir</b> — veri setinde istasyon boyutu yok; üründe
          istasyon etiketli stok kaydından gelir.
        </div>
      </div>

      {/* ════════════════════════════════════════════════ ⑧ uzun vade */}
      <UzunVade />

      <div className="not" style={{ border: 0, padding: '4px 0 0' }}>
        Kural motoru tarayıcıda çalışır ve deterministiktir; dış servis çağrısı yoktur. Tüm veriler
        resmi sentetik case setleridir, gerçek THY/AMOS verisi değildir.
      </div>
    </div>
  );
}
