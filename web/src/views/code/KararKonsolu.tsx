/**
 * KARAR KONSOLU — kritik komponent kararlarının verildiği yer.
 *
 * Watchlist'ten TAŞINDI: kuyruk + öneri kartı + aksiyon merdiveni artık ilk sayfada.
 * Kuyruk kural motorundan gelir (engine/karar.ts), öneri engine/oner.ts'ten; parça
 * detayındaki kart aynı bileşenin salt-okunur hâlidir — iki ekran çelişemez.
 */
import { useMemo } from 'react';
import { D, PN, LK, NPN } from '@/data/payload';
import { kararMotoru } from '@/engine/karar';
import { ladderOps, kanalSec, KANAL_AD, type Kova } from '@/engine/ladder';
import { FL, hasF } from '@/engine/flags';
import { fmt, f1, mUsd, pct } from '@/engine/format';
import { useStore } from '@/app/store';
import KararKarti from '@/components/KararKarti';

type KuyrukTip = 'alarm' | 'aog' | 'ber' | 'risk';

const KUYRUK: { k: KuyrukTip; ad: string; ipucu: string }[] = [
  {
    k: 'alarm',
    ad: 'PENCERE KAPALI',
    ipucu: 'sipariş penceresi geçmiş ve açık siparişi yok',
  },
  {
    k: 'aog',
    ad: 'AOG KRİTİK',
    ipucu: 'uçağı yerde bırakan parçalarda stok yetmiyor',
  },
  {
    k: 'ber',
    ad: 'HURDA ADAYI',
    ipucu: 'tamiri ekonomik değil, karar kurala bağlanmalı',
  },
  { k: 'risk', ad: 'RİSK SIRALI', ipucu: 'risk skoru en yüksek parçalar' },
];

export default function KararKonsolu() {
  const d = useMemo(() => kararMotoru(), []);
  const secili = useStore((s) => s.codeParca);
  const kuyrukTip = useStore((s) => s.codeKuyruk);
  const kararlar = useStore((s) => s.kararlar);
  const codeSec = useStore((s) => s.codeSec);
  const kuyrukSec = useStore((s) => s.kuyrukSec);
  const hedef = useStore((s) => s.hedefIstasyon);
  const hedefSec = useStore((s) => s.hedefSec);
  const haritadaGoster = useStore((s) => s.haritadaGoster);
  const watchAc = useStore((s) => s.watchAc);

  /* --- kuyruk: hangi parçalar konsola düşüyor -------------------------- */
  const kuyruk = useMemo(() => {
    if (kuyrukTip === 'alarm') return d.alarm;
    const out: number[] = [];
    for (let i = 0; i < NPN; i++) {
      if (kuyrukTip === 'aog') {
        if (PN.kr[i] === 0 && d.kanal[i] !== 'izle') out.push(i);
      } else if (kuyrukTip === 'ber') {
        if (hasF(i, FL.BER) && d.kanal[i] !== 'izle') out.push(i);
      } else if (d.kanal[i] !== 'izle') out.push(i);
    }
    return out.slice(0, 400);
  }, [kuyrukTip, d]);

  const i = secili >= 0 ? secili : (kuyruk[0] ?? 0);
  const ops = useMemo(() => ladderOps(i), [i]);
  const best = useMemo(() => kanalSec(i).best, [i]);
  const verilen = kuyruk.filter((j) => kararlar[j]).length;

  const tts = PN.tts[i];
  const ttr = PN.ttr[i];
  const mx = Math.max(Math.min(tts, ttr * 3), ttr, 1);

  return (
    <div className="code-panel">
      <div className="bas">
        <span className="kod">CDE-01</span>
        <h3>Kritik karar konsolu</h3>
        <span className="crz al">{fmt(d.alarm.length)} açık alarm</span>
        <span className="crz no">
          {fmt(verilen)} / {fmt(kuyruk.length)} karar verildi
        </span>
        <div className="sagg">
          <button className="ccip" onClick={() => watchAc({ kanal: 'alim' as Kova })}>
            tüm listeyi watchlist'te aç
          </button>
        </div>
      </div>

      <div className="code-izgara ci-12" style={{ gap: 0, marginBottom: 0 }}>
        {/* -------------------------------------------------- kuyruk */}
        <div className="kq">
          <div className="kq-ust">
            {KUYRUK.map((k) => (
              <button
                key={k.k}
                className={'ccip' + (kuyrukTip === k.k ? ' on' : '')}
                onClick={() => kuyrukSec(k.k)}
                title={k.ipucu}
              >
                {k.ad}
              </button>
            ))}
          </div>
          {kuyruk.slice(0, 140).map((j) => {
            const kal = d.kalan[j];
            const kanal = d.kanal[j];
            return (
              <button
                key={j}
                className={'kq-row' + (j === i ? ' on' : '')}
                onClick={() => codeSec(j)}
              >
                <span
                  className="im"
                  style={{
                    background: hasF(j, FL.SIP)
                      ? 'var(--c-red)'
                      : hasF(j, FL.KIRMIZI)
                        ? 'var(--c-uyari)'
                        : 'var(--c-gri)',
                  }}
                />
                <span style={{ minWidth: 0 }}>
                  <span className="pn">
                    PN-{PN.id[j]}
                    {kararlar[j] && <span className="ok"> ✓</span>}
                  </span>
                  <span className="mt">
                    {LK.sub[PN.sub[j]]} · {LK.mdl[PN.mdl[j]]}
                  </span>
                </span>
                <span className="sag">
                  {Number.isFinite(kal) && kal < 0 ? (
                    <b>−{fmt(-kal)}g</b>
                  ) : (
                    <b style={{ color: 'var(--c-tx2)' }}>
                      {Number.isFinite(kal) ? fmt(kal) + 'g' : '∞'}
                    </b>
                  )}
                  <span>{KANAL_AD[kanal]}</span>
                </span>
              </button>
            );
          })}
          {kuyruk.length > 140 && (
            <div
              style={{
                padding: '9px 12px',
                fontSize: 'var(--fs-mikro)',
                color: 'var(--c-tx3)',
              }}
            >
              İlk 140 satır · toplam {fmt(kuyruk.length)} parça bu kuyrukta
            </div>
          )}
        </div>

        {/* -------------------------------------------------- karar detayı */}
        <div className="kdetay">
          <div className="kunye">
            <span className="pn">PN-{PN.id[i]}</span>
            <span className="mt">
              {LK.kr[PN.kr[i]]} · {LK.sub[PN.sub[i]]} · {LK.mdl[PN.mdl[i]]}
            </span>
            {hasF(i, FL.SIP) && <span className="crz al">TÜKENİYOR · SİPARİŞSİZ</span>}
            {!hasF(i, FL.SIP) && hasF(i, FL.KIRMIZI) && <span className="crz uy">TÜKENİYOR</span>}
            {hasF(i, FL.R547) && <span className="crz uy">DIŞA BAĞIMLI</span>}
            {hasF(i, FL.BER) && <span className="crz mo">HURDA ADAYI</span>}
            {hasF(i, FL.YENI) && <span className="crz iy">YENİ NESİL</span>}
            {hasF(i, FL.PO) && <span className="crz no">PHASE-OUT</span>}
            <span className="rsk2">
              <span>Risk skoru</span>
              <b>{f1(PN.risk[i])}</b>
            </span>
          </div>

          <KararKarti i={i} />

          <div className="code-izgara ci-2" style={{ marginTop: 13, marginBottom: 0 }}>
            <div>
              <div className="ust-etiket">Dayanma ↔ toparlanma</div>
              <div className="sbar" style={{ marginTop: 8 }}>
                <span>Dayanma süresi (TTS)</span>
                <div className="bar-track">
                  <i
                    style={{
                      width: Math.min(100, (100 * tts) / mx) + '%',
                      background: tts < ttr ? 'var(--c-red)' : 'var(--c-iyi)',
                    }}
                  />
                </div>
                <b
                  className="mono"
                  style={{
                    color: tts < ttr ? 'var(--c-red)' : 'var(--c-iyi)',
                  }}
                >
                  {tts >= 9999 ? '∞' : fmt(tts) + ' g'}
                </b>
              </div>
              <div className="sbar">
                <span>Toparlanma süresi (TTR)</span>
                <div className="bar-track">
                  <i
                    style={{
                      width: Math.min(100, (100 * ttr) / mx) + '%',
                      background: 'var(--c-gri)',
                    }}
                  />
                </div>
                <b className="mono">{fmt(ttr)} g</b>
              </div>

              <div className="mini-tab">
                <div>
                  <span>Elde (SVC)</span>
                  <b>{fmt(PN.svc[i])}</b>
                </div>
                <div>
                  <span>2033 MIN–MAX</span>
                  <b>
                    {fmt(PN.min33[i])}–{fmt(PN.max33[i])}
                  </b>
                </div>
                <div>
                  <span>Açık PO</span>
                  <b>{fmt(PN.po[i])}</b>
                </div>
                <div>
                  <span>Gayrifaal</span>
                  <b>{fmt(PN.gay[i])}</b>
                </div>
                <div>
                  <span>Talep 25→33</span>
                  <b>
                    {fmt(PN.t25[i])}→{fmt(PN.t33[i])}
                  </b>
                </div>
                <div>
                  <span>Liste / piyasa</span>
                  <b>
                    {mUsd(PN.clp[i])} / {mUsd(PN.fmv[i])}
                  </b>
                </div>
                <div>
                  <span>Servis hedefi</span>
                  <b>{pct(PN.sh[i] * 100, 0)}</b>
                </div>
                <div>
                  {/* tek parçada rakam küçük: milyon değil tam dolar okunur */}
                  <span>Kapatma maliyeti</span>
                  <b>{mUsd(Math.max(PN.min33[i] - PN.svc[i], 0) * (best.m || 0))}</b>
                </div>
              </div>
            </div>

            <div>
              <div className="ust-etiket">Aksiyon merdiveni · süreye göre</div>
              <div className="ctl" style={{ margin: '8px 0 7px', gap: 7 }}>
                <span className="crz no">Hedef istasyon</span>
                <select value={hedef} onChange={(e) => hedefSec(e.target.value)}>
                  <option value="">seçiniz…</option>
                  {D.harita.kod.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ladder">
                {ops.map((o, n) => (
                  <div className={'step' + (o.t === best.t ? ' best' : '')} key={o.t}>
                    <span className="no">{n + 1}</span>
                    <span className="nm">
                      {o.ad}
                      <small>
                        {o.sm}
                        {o.tag ? ' · ' + o.tag : ''}
                      </small>
                      <button
                        className="ccip"
                        style={{ marginTop: 6 }}
                        disabled={!hedef}
                        onClick={() =>
                          hedef &&
                          haritadaGoster(
                            i,
                            hedef,
                            o.t === 'pool' || o.t === 'alim' ? 'rota' : 'depo',
                          )
                        }
                        title={hedef ? 'Rotayı haritada çiz' : 'önce hedef istasyonu seçin'}
                      >
                        🗺 haritada göster
                      </button>
                    </span>
                    <span className="m">
                      <b>{o.gun} gün</b>
                      <span>{o.m == null ? 'tamir borcu' : mUsd(o.m)}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="not" style={{ padding: '9px 0 0', border: 0 }}>
                Seçenekler süreye göre sıralanır; önerilen aksiyon bu listenin en hızlı{' '}
                <b>gerçek</b> tedarik kanalıdır — donörden söküm yalnız köprüdür, hurda adayında
                tamir kanalları elenir.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="not">
        <b>Kuyruk kuralı.</b> Bir parça ancak elde kalan stok önerilen MIN seviyesinin altına
        düşerse konsola girer; kanal, aksiyon merdivenindeki en hızlı gerçek tedarik yoludur.
        Kararlar bu oturumda tutulur (sunucu yok), sayfa yenilenince sıfırlanır.
      </div>
    </div>
  );
}
