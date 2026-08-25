/**
 * Parça detayı — künye, önerilen aksiyon (salt-okunur), stok/sağlık, aksiyon
 * merdiveni, canlı stok yeterlilik eğrisi ve çeyreklik tahmin profili.
 *
 * Karar DÜĞMELERİ burada değil, CODE karar konsolundadır: bir parça hakkında karar
 * tek yerde verilir. Kart aynı bileşendir (components/KararKarti), merdivende
 * vurgulanan satır da aynı kanaldır (engine/oner.ts) — ekranlar çelişemez.
 */
import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { D, PN, LK, NPN, PRM } from '@/data/payload';
import { ladderOps } from '@/engine/ladder';
import { oner } from '@/engine/oner';
import { FL, hasF } from '@/engine/flags';
import { poisCdf } from '@/engine/stats';
import { fmt, f1, mUsd, pct, vir } from '@/engine/format';
import { CC as C, tint } from '@/design/renkler';
import { useStore } from '@/app/store';
import { Kart, Cip, KrNokta } from '@/components/temel';
import KararKarti from '@/components/KararKarti';
import Grafik from '@/components/Grafik';

export default function ParcaDetay({ i }: { i: number }) {
  const hedef = useStore((s) => s.hedefIstasyon);
  const hedefSec = useStore((s) => s.hedefSec);
  const haritadaGoster = useStore((s) => s.haritadaGoster);

  const O = useMemo(() => oner(i), [i]);
  const ops = useMemo(() => ladderOps(i), [i]);

  const tts = PN.tts[i];
  const ttr = PN.ttr[i];
  const mx = Math.max(Math.min(tts, ttr * 3), ttr, 1);
  const d33 = PN.t25[i] > 0 ? Math.round(100 * (PN.t33[i] / PN.t25[i] - 1)) : null;
  const t33lo = Math.min(PN.t33a[i], PN.t33b[i]);
  const t33hi = Math.max(PN.t33a[i], PN.t33b[i]);
  const muL = (PN.rate33[i] * PN.lead[i]) / PRM.ceyrek_gun;
  const muC = Math.ceil(muL);
  const ssC = Math.max(0, PN.min33[i] - muC);
  const nn = PN.nn4[i];
  const nnF = nn != null ? +(nn - PN.q4[i]).toFixed(1) : null;
  const kesQ = [PN.q1[i], PN.q2[i], PN.q3[i], PN.q4[i]].some((v) => !v);
  const grw = LK.mdl_b[PN.mdl[i]];

  /* --- rota çizimi hedef istasyon seçilmeden başlamaz --- */
  const haritaya = (tip: string) => {
    if (!hedef) return false;
    haritadaGoster(i, hedef, tip === 'pool' || tip === 'alim' ? 'rota' : 'depo');
    return true;
  };

  /* --------------------------------------------- canlı stok yeterlilik eğrisi */
  const egriCfg = useMemo<ChartConfiguration>(() => {
    const mu = (PN.rate33[i] * PN.lead[i]) / PRM.ceyrek_gun;
    const smax = Math.max(Math.ceil(mu + 4 * Math.sqrt(mu) + 4), PN.svc[i] + 2, PN.min33[i] + 2);
    const step = Math.max(1, Math.ceil(smax / 48));
    const xs: number[] = [];
    const ys: number[] = [];
    for (let s = 0; s <= smax; s += step) {
      xs.push(s);
      ys.push(+(100 * poisCdf(mu, s)).toFixed(2));
    }
    const at = (s: number) => {
      const j = Math.min(xs.length - 1, Math.round(s / step));
      return { x: xs[j], y: ys[j] };
    };
    return {
      type: 'line',
      data: {
        datasets: [
          {
            type: 'line',
            label: 'Stok yeterlilik olasılığı',
            data: xs.map((x, j) => ({ x, y: ys[j] })),
            borderColor: C.teal,
            pointRadius: 0,
            borderWidth: 2,
            tension: 0.2,
          },
          {
            type: 'scatter',
            label: 'Mevcut SVC',
            data: [at(PN.svc[i])],
            backgroundColor: C.amber,
            pointRadius: 6,
            pointStyle: 'rectRot',
          },
          {
            type: 'scatter',
            label: 'Önerilen MIN 2033',
            data: [at(PN.min33[i])],
            backgroundColor: C.red,
            pointRadius: 6,
          },
        ],
      },
      options: {
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'stok seviyesi s (adet)' },
            ticks: { precision: 0 },
          },
          y: {
            min: 0,
            max: 102,
            title: { display: true, text: 'talebi karşılama olasılığı (%)' },
            ticks: { callback: (v) => '%' + v },
          },
        },
        plugins: {
          legend: { labels: { boxWidth: 9, font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (c) =>
                ` ${c.dataset.label}: s=${fmt(Number(c.parsed.x))} → %${f1(
                  Number(c.parsed.y),
                )} karşılanır`,
            },
          },
        },
      },
    } as ChartConfiguration;
  }, [i]);

  /* --------------------------------------------------- çeyreklik tahmin profili */
  const tahminCfg = useMemo<ChartConfiguration>(() => {
    // portföy mevsim profili (Q3 zirvesi) 2033 çeyrek düzeyine uygulanır; ortalama korunur
    const ceyT = D.ceyrek.thy.map((v, j) => v + D.ceyrek.pool[j]);
    const ort = ceyT.reduce((a, b) => a + b, 0) / 4;
    const sez = ceyT.map((v) => v / ort);
    const q33 = sez.map((f) => PN.rate33[i] * f);
    const lo = q33.map((m) => Math.max(0, m - 1.2816 * Math.sqrt(Math.max(m, 0.25))));
    const hi = q33.map((m) => m + 1.2816 * Math.sqrt(Math.max(m, 0.25)));
    const ds: ChartConfiguration['data']['datasets'] = [
      {
        type: 'bar',
        label: '2025 gerçekleşen',
        data: [PN.q1[i], PN.q2[i], PN.q3[i], PN.q4[i]],
        backgroundColor: tint(C.bilgi, 0.62),
        borderRadius: 3,
      },
      {
        type: 'bar',
        label: '2033 profil, mevsimli',
        data: q33,
        backgroundColor: tint(C.iyi, 0.34),
        borderColor: C.teal,
        borderWidth: 1,
        borderRadius: 3,
      },
      {
        type: 'line',
        label: '2033 belirsizlik p10–p90',
        data: hi,
        borderColor: 'rgba(0,0,0,0)',
        pointRadius: 0,
        fill: '+1',
        /* Bant, sınırladığı serinin rengini taşır. Eskiden sarıydı: grafikte
           karşılığı olmayan üçüncü bir renk gibi duruyordu. */
        backgroundColor: 'rgba(23,132,95,.13)',
      },
      {
        type: 'line',
        label: '',
        data: lo,
        borderColor: 'rgba(0,0,0,0)',
        pointRadius: 0,
      },
    ] as ChartConfiguration['data']['datasets'];
    if (nn != null)
      (ds as unknown[]).push({
        type: 'line',
        label: 'Sinir ağı Q4',
        data: [null, null, null, nn],
        showLine: false,
        pointRadius: 5.5,
        pointStyle: 'rectRot',
        borderColor: C.violet,
        backgroundColor: C.violet,
      });
    return {
      type: 'bar',
      data: { labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: ds },
      options: {
        animation: { duration: 200 },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: {
          legend: { labels: { boxWidth: 10, filter: (it) => it.text !== '' } },
        },
      },
    } as ChartConfiguration;
  }, [i, nn]);

  /* -------------------------------------------------------------- durum rozetleri */
  const rozetler: [string, string][] = [];
  if (hasF(i, FL.SIP)) rozetler.push(['bg-red', 'TÜKENİYOR · SİPARİŞSİZ']);
  else if (hasF(i, FL.KIRMIZI)) rozetler.push(['bg-warn', 'TÜKENİYOR · SİPARİŞTE']);
  if (hasF(i, FL.R547)) rozetler.push(['bg-sari', 'DIŞA BAĞIMLI']);
  if (hasF(i, FL.BER)) rozetler.push(['bg-mor', 'HURDA ADAYI']);
  if (hasF(i, FL.PO)) rozetler.push(['bg-nk', 'PHASE-OUT MODELİ']);
  if (hasF(i, FL.YENI)) rozetler.push(['bg-teal', 'YENİ NESİL']);

  return (
    <Kart stil={{ marginTop: 14 }}>
      <div className="pnhead">
        <div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <h3 className="mono" style={{ fontSize: '1.15rem', color: C.teal }}>
              PN-{PN.id[i]}
            </h3>
            <KrNokta i={i} />
            <span style={{ color: C.dim, fontSize: '.8rem' }}>
              {LK.kr[PN.kr[i]]} · {LK.sub[PN.sub[i]]} · {LK.mdl[PN.mdl[i]]}
            </span>
          </div>
          {rozetler.length > 0 && (
            <div
              style={{
                marginTop: 8,
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              {rozetler.map(([c, t]) => (
                <span className={'bg ' + c} key={t}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rsk">
          <span>Risk skoru</span>
          <b>{f1(PN.risk[i])}</b>
          <small>
            {fmt(NPN)} parça içinde {fmt(i + 1)}.
          </small>
        </div>
      </div>

      <div className="ihty">
        2033 tahmini yıllık ihtiyaç <span>(iki yöntemin bandı)</span>
        <b>{fmt(PN.t33[i])} adet</b> <span>{`( ${fmt(t33lo)} – ${fmt(t33hi)} )`}</span>
      </div>

      {/* --- önerilen aksiyon: karar mekanizması CODE konsoluna taşındı --- */}
      <KararKarti i={i} saltOkunur />

      {/* ------------------------------------------------- stok & merdiven */}
      <div className="grid g2" style={{ margin: 0 }}>
        <div>
          <h3 style={{ fontSize: '.83rem', color: C.muted }}>Stok &amp; sağlık</h3>
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              margin: '9px 0 12px',
            }}
          >
            <span className="note">SVC {fmt(PN.svc[i])}</span>
            <span className="note">Gayrifaal {fmt(PN.gay[i])}</span>
            <span className="note">Tamirde {fmt(PN.tam[i])}</span>
            <span className="note">Açık PO {fmt(PN.po[i])}</span>
            <span className="note">
              Exch {fmt(PN.exin[i])}↓ {fmt(PN.exout[i])}↑
            </span>
          </div>
          <div className="sbar">
            <span>Dayanma süresi (TTS)</span>
            <div className="bar-track">
              <i
                style={{
                  width: Math.min(100, (100 * tts) / mx) + '%',
                  background: tts < ttr ? C.red : C.teal,
                }}
              />
            </div>
            <b className="mono" style={{ color: tts < ttr ? C.red : C.teal }}>
              {tts >= 9999 ? '∞' : fmt(tts) + ' g'}
            </b>
          </div>
          <div className="sbar">
            <span>Toparlanma süresi (TTR)</span>
            <div className="bar-track">
              <i
                style={{
                  width: Math.min(100, (100 * ttr) / mx) + '%',
                  background: C.blue,
                }}
              />
            </div>
            <b className="mono">{fmt(ttr)} g</b>
          </div>
          <div className="hint" style={{ marginTop: 11 }}>
            TTS &lt; TTR ise parça, yenisi gelmeden tükenir —{' '}
            {PN.ato[i] ? 'iç tamir' : 'dışa bağımlı'}. Önerilen 2033 min-max{' '}
            <b className="mono">
              {fmt(PN.min33[i])} – {fmt(PN.max33[i])}
            </b>{' '}
            adet, servis hedefi {pct(PN.sh[i] * 100, 0)}, tedarik süresi {fmt(PN.lead[i])} gün.
            <br />
            Liste fiyatı {mUsd(PN.clp[i])}, piyasa değeri {mUsd(PN.fmv[i])}, dış tamir{' '}
            {mUsd(PN.disrep[i])}
            {PN.icrep[i] != null ? ', iç tamir ' + mUsd(PN.icrep[i]!) : ''}.
          </div>

          <h3 style={{ fontSize: '.83rem', color: C.muted, marginTop: 15 }}>
            Canlı stok yeterlilik seviyesi
          </h3>
          <Grafik cfg={egriCfg} h={185} />
          <div className="hint" style={{ marginTop: 6 }}>
            Dikey eksen,{' '}
            <b style={{ color: C.text }}>
              s adet stokla tedarik süresi boyunca gelen talebin karşılanma olasılığını
            </b>{' '}
            verir; %100'e yaklaştıkça parça tükenmez. İşaretler mevcut stoğu ve önerilen 2033 MIN
            değerini gösterir.
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '.83rem', color: C.muted }}>
            Aksiyon sıralayıcı: seçenekler süreye göre
          </h3>
          <div className="ctl" style={{ margin: '7px 0 6px', gap: 7 }}>
            <span className="note">Hedef istasyon</span>
            <select
              value={hedef}
              onChange={(e) => hedefSec(e.target.value)}
              style={hedef ? undefined : { borderColor: 'var(--ln-ctl)' }}
            >
              <option value="">seçiniz…</option>
              {D.harita.kod.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <span className="note" style={hedef ? undefined : { color: C.dim }}>
              {hedef ? `rota hedefi ${hedef}` : 'rota çizmek için önce hedef, sonra 🗺'}
            </span>
          </div>

          <div className="ladder" style={{ marginTop: 4 }}>
            {ops.map((o, n) => (
              <div className={'step' + (o.t === O.best.t ? ' best' : '')} key={o.t}>
                <span className="no">{n + 1}</span>
                <span className="nm">
                  {o.ad}
                  <small>
                    {o.sm}
                    {o.tag ? ' · ' + o.tag : ''}
                  </small>
                  <Cip
                    onClick={() => haritaya(o.t)}
                    pasif={!hedef}
                    baslik={hedef ? 'Rotayı haritada çiz' : 'önce hedef istasyonu seçin'}
                    stil={{
                      marginTop: 5,
                      padding: '1px 9px',
                      fontSize: '.64rem',
                      display: 'inline-block',
                    }}
                  >
                    🗺 haritada göster
                  </Cip>
                </span>
                <span className="m">
                  <b>{o.gun} gün</b>
                  <span>{o.m == null ? 'tamir borcu' : mUsd(o.m)}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="hint" style={{ marginTop: 9 }}>
            Seçenekler süreye göre sıralanır; önerilen aksiyon bu listenin en hızlı gerçek tedarik
            kanalıdır. AOG saatlik maliyeti girilirse süre ve maliyet birlikte puanlanabilir.
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ tahmin */}
      <div
        style={{
          borderTop: '1px solid var(--ln-soft)',
          marginTop: 15,
          paddingTop: 12,
        }}
      >
        <h3 style={{ fontSize: '.83rem', color: C.muted }}>
          Tahmin: 2025 gerçekleşen ve 2033 çeyreklik profil
        </h3>
        <div className="grid g21" style={{ margin: '8px 0 0' }}>
          <Grafik cfg={tahminCfg} h={205} />
          <div
            style={{
              fontSize: '.775rem',
              color: C.dim,
              lineHeight: 1.6,
              marginTop: 2,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <b style={{ color: C.text }}>2025 → 2033 değişim:</b>{' '}
              <b>{d33 == null ? '—' : (d33 >= 0 ? '+%' : '−%') + Math.abs(d33)}</b>
              <br />
              yukarıdaki bandın uçları iki ayrı yöntem: model bazlı filo ölçeği ile THY/pool
              karışımı
            </div>
            <div style={{ marginBottom: 8 }}>
              <b style={{ color: C.text }}>Stok önerisi:</b> MIN{' '}
              <b className="mono">{fmt(PN.min33[i])}</b> = tedarik süresi talebi {fmt(muC)} +
              emniyet {fmt(ssC)} · MAX <b className="mono">{fmt(PN.max33[i])}</b> · servis hedefi{' '}
              {pct(PN.sh[i] * 100, 0)}
            </div>
            {nnF != null && nn != null && (
              <div style={{ marginBottom: 8 }}>
                <b style={{ color: C.text }}>Ağ kontrolü Q4:</b> tahmin{' '}
                <span className="mono">{vir(nn)}</span> · gerçek{' '}
                <span className="mono">{fmt(PN.q4[i])}</span> · fark{' '}
                <b className="mono" style={{ color: Math.abs(nnF) <= 3 ? C.teal : C.amber }}>
                  {nnF >= 0 ? '+' : '−'}
                  {vir(Math.abs(nnF))}
                </b>
              </div>
            )}
            <div>
              <b style={{ color: C.text }}>Sürücü:</b> {LK.mdl[PN.mdl[i]]} filosu ×{vir(grw)} ·{' '}
              {hasF(i, FL.YENI)
                ? 'cold-start: tahmin benzerlerinden başlar, gözlemle parçaya yakınsar'
                : 'kesikli talep yöntemi, mevsim katsayısı bütçe düzeyinde'}
            </div>
          </div>
        </div>
        <div className="hint" style={{ margin: '10px 0 0' }}>
          <b style={{ color: C.text }}>Neden bu tahmin?</b>{' '}
          {hasF(i, FL.YENI)
            ? `Geçmişi yok: benzerlerinden başlar, ${LK.mdl[PN.mdl[i]]} filosuyla ×${vir(grw)} ölçeklenir.`
            : `${LK.mdl[PN.mdl[i]]} filosu ×${vir(grw)} ${grw >= 1 ? 'büyüyor' : 'küçülüyor'}, talep bu çarpanla ölçekleniyor.`}{' '}
          {kesQ
            ? 'Talep kesikli, yöntem ona göre seçildi.'
            : 'Talep düzenli, mevsim katsayısı uygulandı.'}
        </div>
      </div>
    </Kart>
  );
}
