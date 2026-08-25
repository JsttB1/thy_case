/**
 * 2 · WATCHLIST — 5.000 PN, filtre + sırala + parça detayı.
 *
 * Tablo 300 satırla sınırlanır (tek dosyalık sürümdeki gibi): demoda kaydırma
 * değil filtreleme davranışı isteniyor. Eşleşen toplam sayı her zaman yazılır.
 */
import { useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { K, PN, LK, NPN } from '@/data/payload';
import { kararMotoru } from '@/engine/karar';
import { KANAL_AD, PENCERE_AD } from '@/engine/ladder';
import { FL, hasF, FILTRELER, DURUM } from '@/engine/flags';
import { fmt, f1, mUsd, foldTr } from '@/engine/format';
import { CC as C, KR_RENK } from '@/design/renkler';
import { useStore, type SiralamaAnahtar } from '@/app/store';
import { Bolum, Kart, Cip, KrNokta } from '@/components/temel';
import ParcaDetay from './watchlist/ParcaDetay';

const SUTUNLAR: { k?: SiralamaAnahtar; ad: string; sayi?: boolean }[] = [
  { ad: 'PN' },
  { ad: 'Model' },
  { ad: 'Kategori' },
  { ad: 'Operasyonel Önem' },
  { k: 'durum', ad: 'Durum' },
  { k: 'svc', ad: 'SVC', sayi: true },
  { k: 'tts', ad: 'TTS / TTR', sayi: true },
  { k: 't25', ad: 'Talep 25→33', sayi: true },
  { k: 'min33', ad: 'Min–Max 33', sayi: true },
  { k: 'clp', ad: 'CLP', sayi: true },
  { k: 'risk', ad: 'Risk', sayi: true },
];

/** Durum rozeti — parçanın bugünkü hâli; öncelik sırasıyla tek etiket gösterilir. */
function DurumRozet({ i }: { i: number }) {
  const st: [string, string, string][] = [];
  if (hasF(i, FL.SIP))
    st.push(['bg-red', 'TÜKENİYOR', 'stok yenisi gelmeden bitiyor ve sipariş yok']);
  else if (hasF(i, FL.KIRMIZI))
    st.push(['bg-warn', 'SİPARİŞTE', 'stok bitiyor ama yenisi sipariş edildi']);
  if (hasF(i, FL.R547))
    st.push(['bg-sari', 'DIŞA BAĞIMLI', 'iç tamiri yok, dış istasyona bağımlı']);
  if (hasF(i, FL.BER))
    st.push(['bg-mor', 'HURDA ADAYI', 'tamir ekonomik değil, bozulunca yenilenir']);
  if (!st.length) return <span style={{ color: C.dim }}>—</span>;
  return (
    <span className={'bg ' + st[0][0]} title={st.map((s) => s[2]).join(' · ')}>
      {st[0][1]}
    </span>
  );
}

export default function Watchlist() {
  const w = useStore((s) => s.watch);
  const siralama = useStore((s) => s.siralama);
  const sel = useStore((s) => s.seciliPn);
  const kararlar = useStore((s) => s.kararlar);
  const filtreDegis = useStore((s) => s.filtreDegis);
  const flagDegis = useStore((s) => s.flagDegis);
  const filtreSifirla = useStore((s) => s.filtreSifirla);
  const siralamaDegis = useStore((s) => s.siralamaDegis);
  const sec = useStore((s) => s.sec);

  const detayRef = useRef<HTMLDivElement>(null);
  const ilkAcilis = useRef(true);

  /* seçim değiştiğinde detaya kaydır — ilk açılışta değil */
  useEffect(() => {
    if (ilkAcilis.current) {
      ilkAcilis.current = false;
      return;
    }
    if (sel >= 0) detayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [sel]);

  const idx = useMemo(() => {
    const out: number[] = [];
    const km = w.kanal || w.pencere ? kararMotoru() : null;
    const q = foldTr(w.q.trim());
    for (let i = 0; i < NPN; i++) {
      if (w.kr !== '' && PN.kr[i] !== +w.kr) continue;
      let ok = true;
      for (const f of w.flags)
        if (!hasF(i, FL[f])) {
          ok = false;
          break;
        }
      if (!ok) continue;
      if (w.kanal && km) {
        if (w.kanal === 'fazla') {
          if (PN.svc[i] <= PN.max33[i]) continue;
        } else if (km.kanal[i] !== w.kanal) continue;
      }
      if (w.pencere && km) {
        if (w.pencere === 'gecmis0') {
          if (km.pencere[i] !== 'gecmis' || PN.po[i] !== 0) continue;
        } else if (km.pencere[i] !== w.pencere) continue;
      }
      if (q) {
        const hay =
          'pn-' + PN.id[i] + '|' + foldTr(LK.sub[PN.sub[i]]) + '|' + foldTr(LK.mdl[PN.mdl[i]]);
        if (!hay.includes(q)) continue;
      }
      out.push(i);
    }
    const k = siralama.k;
    const dir = siralama.artan ? 1 : -1;
    if (!(k === 'risk' && !siralama.artan)) {
      const kol: number[] = k === 'durum' ? DURUM : (PN[k] as number[]);
      out.sort((a, b) => (kol[a] - kol[b]) * dir);
    }
    return out;
  }, [w, siralama]);

  const goster = idx.slice(0, 300);
  const rmax = PN.risk[0] || 1;
  const kmFiltre = [
    w.kanal ? 'kanal: ' + KANAL_AD[w.kanal] : '',
    w.pencere ? 'pencere: ' + PENCERE_AD[w.pencere] : '',
  ].filter(Boolean);

  return (
    <>
      <Bolum
        baslik={`Watchlist: risk skoruna göre sıralı ${fmt(K.pn)} parça`}
        aciklama="Risk skoru operasyonel önemi, yıllık talebi ve tedarik süresini birlikte tartar. Satıra tıklayınca parça detayı ve aksiyon seçenekleri açılır."
      />

      <Kart>
        <div className="ctl">
          <input
            type="text"
            value={w.q}
            onChange={(e) => filtreDegis({ q: e.target.value })}
            placeholder="PN / kategori / model ara…"
            style={{ flex: 1, minWidth: 170 }}
          />
          <select value={w.kr} onChange={(e) => filtreDegis({ kr: e.target.value as typeof w.kr })}>
            <option value="">Tüm operasyonel önem</option>
            {LK.kr.map((k, i) => (
              <option key={k} value={i}>
                {k}
              </option>
            ))}
          </select>
          {FILTRELER.map((f) => (
            <Cip
              key={f.anahtar}
              acik={w.flags.has(f.anahtar)}
              onClick={() => flagDegis(f.anahtar)}
              baslik={f.ipucu}
            >
              {f.etiket[0].toLocaleUpperCase('tr') + f.etiket.slice(1)}
            </Cip>
          ))}
          <Cip onClick={filtreSifirla}>✕ temizle</Cip>
          {kmFiltre.length > 0 && (
            <Cip
              acik
              onClick={() => filtreDegis({ kanal: '', pencere: '' })}
              baslik="Karar Merkezi süzgecini kaldır"
            >
              {kmFiltre.join(' · ')} ✕
            </Cip>
          )}
        </div>

        <div className="note" style={{ margin: '2px 0 7px' }}>
          Operasyonel önem: <span className="sdot" style={{ background: KR_RENK[0] }} /> AOG, uçağı yerde
          bırakır · <span className="sdot" style={{ background: KR_RENK[1] }} /> kritik ·{' '}
          <span className="sdot" style={{ background: KR_RENK[2] }} /> kritik değil &nbsp;·&nbsp;
          Durum, parçanın bugünkü hâlidir · ayrıntı için satıra tıklayın
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr>
                {SUTUNLAR.map((s) => (
                  <th
                    key={s.ad}
                    className={
                      (s.sayi ? 'n ' : '') +
                      (s.k && siralama.k === s.k ? (siralama.artan ? 'asc' : 'sorted') : '')
                    }
                    onClick={s.k ? () => siralamaDegis(s.k!) : undefined}
                    style={s.k ? undefined : { cursor: 'default' }}
                  >
                    {s.ad}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {goster.map((i) => (
                <tr key={i} onClick={() => sec(i)} style={{ cursor: 'pointer' }}>
                  <td className="pn-link">
                    PN-{PN.id[i]}
                    {kararlar[i] && (
                      <span title={kararlar[i].metin} style={{ color: C.teal }}>
                        {' '}
                        ✓
                      </span>
                    )}
                  </td>
                  <td>{LK.mdl[PN.mdl[i]]}</td>
                  <td>{LK.sub[PN.sub[i]]}</td>
                  <td style={{ textAlign: 'center' }}>
                    <KrNokta i={i} />
                  </td>
                  <td>
                    <DurumRozet i={i} />
                  </td>
                  <td className="n">{fmt(PN.svc[i])}</td>
                  <td className="n" style={{ color: PN.tts[i] < PN.ttr[i] ? C.red : C.muted }}>
                    {PN.tts[i] >= 9999 ? '∞' : fmt(PN.tts[i])} / {fmt(PN.ttr[i])}g
                  </td>
                  <td className="n">
                    {fmt(PN.t25[i])} → {fmt(PN.t33[i])}
                  </td>
                  <td className="n">
                    {fmt(PN.min33[i])}–{fmt(PN.max33[i])}
                  </td>
                  <td className="n">{mUsd(PN.clp[i])}</td>
                  <td className="n">
                    <span
                      className="bar-track"
                      style={{
                        display: 'inline-block',
                        width: 52,
                        verticalAlign: 'middle',
                        marginRight: 7,
                      }}
                    >
                      <i
                        style={{
                          width: Math.max(4, (100 * PN.risk[i]) / rmax) + '%',
                          background: PN.risk[i] > 40 ? C.red : PN.risk[i] > 15 ? C.amber : C.blue,
                        }}
                      />
                    </span>
                    {f1(PN.risk[i])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="hint" style={{ margin: '10px 0 0' }}>
          {idx.length > 300
            ? `İlk 300 satır gösteriliyor. Toplam ${fmt(idx.length)} parça eşleşti, filtreyi daraltabilirsiniz.`
            : `${fmt(idx.length)} parça eşleşti.`}
        </div>
      </Kart>

      <div ref={detayRef}>
        <motion.div
          key={sel}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
        >
          <ParcaDetay i={sel < 0 ? 0 : sel} />
        </motion.div>
      </div>
    </>
  );
}
