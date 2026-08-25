/**
 * Canlı parametre paneli — CLAUDE.md §4.1'in "jüri önünde değiştirilebilir olmalı"
 * şartı. Ağırlıklar / BER eşiği / alarm tamponu oynayınca 5.000 parça yeniden
 * hesaplanır ve en riskli 10'un sıralaması gözle görülür biçimde kayar.
 *
 * NEDEN SENARYO'DA DEĞİL ÖNGÖRÜ'DE: Senaryo sekmesinde kriz SİMÜLE edilir,
 * burada model KALİBRE edilir — ikisi farklı iş. Parametreler mağazada ortak
 * kaldığı için iki ekran aynı kırmızı sayısını üretmeye devam eder; alarm
 * tamponu senaryo motorunu da doğrudan besler (tek doğruluk kaynağı).
 */
import { useMemo } from 'react';
import { PN, LK, K } from '@/data/payload';
import { paramHesap, PARAM_BAZ, senaryoHesap, BAZ_CFG } from '@/engine/senaryo';
import { fmt, f1, mM, vir } from '@/engine/format';
import { CC as C } from '@/design/renkler';
import { useStore } from '@/app/store';
import { Kart, Izgara, Kaydirici, Cip, KrNokta } from '@/components/temel';

function Stat({ l, v, d, ton = '' }: { l: string; v: string; d: React.ReactNode; ton?: string }) {
  return (
    <div className={'kpi ' + ton} style={{ padding: '12px 14px' }}>
      <div className="l">{l}</div>
      <div className="v" style={{ fontSize: '1.3rem' }}>
        {v}
      </div>
      <div className="d">{d}</div>
    </div>
  );
}

export default function ParamPanel() {
  const p = useStore((s) => s.params);
  const paramDegis = useStore((s) => s.paramDegis);
  const paramSifirla = useStore((s) => s.paramSifirla);
  const parcaAc = useStore((s) => s.parcaAc);

  const BAZ = useMemo(() => senaryoHesap(BAZ_CFG), []);
  const bazTop = useMemo(() => paramHesap(PARAM_BAZ).top, []);
  const r = useMemo(() => paramHesap(p), [p]);

  return (
    <Izgara tip="g12" stil={{ marginTop: 14 }}>
      <Kart
        sinif=""
        stil={{ borderColor: 'var(--st-teal-line)' }}
        baslik={<h3 style={{ color: C.teal }}>Model parametreleri</h3>}
        ipucu="Ağırlıklar, BER eşiği ve alarm tamponu buradan değiştirilir."
      >
        <Kaydirici
          etiket="AOG kritik ağırlığı"
          deger={p.w0}
          min={1}
          max={6}
          adim={0.5}
          bicim={vir}
          onDegis={(v) => paramDegis({ w0: v })}
        />
        <Kaydirici
          etiket="Kritik ağırlığı"
          deger={p.w1}
          min={1}
          max={6}
          adim={0.5}
          bicim={vir}
          onDegis={(v) => paramDegis({ w1: v })}
        />
        <Kaydirici
          etiket="Kritik değil ağırlığı"
          deger={p.w2}
          min={0.5}
          max={6}
          adim={0.5}
          bicim={vir}
          onDegis={(v) => paramDegis({ w2: v })}
        />
        <Kaydirici
          etiket="BER eşiği"
          deger={p.ber}
          min={0.4}
          max={0.9}
          adim={0.05}
          bicim={(v) => vir(v.toFixed(2))}
          onDegis={(v) => paramDegis({ ber: v })}
        />
        <Kaydirici
          etiket="Alarm tamponu"
          deger={p.tampon}
          min={0}
          max={30}
          adim={1}
          bicim={(v) => v + ' gün'}
          onDegis={(v) => paramDegis({ tampon: v })}
        />
        <Cip onClick={paramSifirla}>↺ varsayılanlara dön</Cip>
      </Kart>

      <Kart baslik="Parametrelerin canlı etkisi">
        <div className="grid g4" style={{ margin: '11px 0 10px' }}>
          <Stat
            l="Kırmızı PN"
            v={fmt(r.kir)}
            d={r.kir === BAZ.kir ? 'baz ile aynı' : `baz ${BAZ.kir}`}
            ton={r.kir > BAZ.kir ? 'red' : ''}
          />
          <Stat l="AOG kritik" v={fmt(r.kirAog)} d={`baz ${BAZ.kirAog}`} />
          <Stat l="Kapatma" v={mM(r.kap / 1e6)} d="TTR seviyesine tamamlama" ton="amber" />
          <Stat l="BER üstü PN" v={fmt(r.berN)} d={`eşik ${vir(p.ber.toFixed(2))}`} />
        </div>
        <div className="hint" style={{ marginBottom: 7 }}>
          En riskli 10 parça. Ağırlıkları değiştirdiğinizde sıralamanın nasıl kaydığı işaretlenir.
          {r.berN !== K.ber_pn && ' BER eşiği varsayılandan farklı.'}
        </div>
        <div className="tw" style={{ maxHeight: 265 }}>
          <table>
            <thead>
              <tr>
                <th style={{ cursor: 'default' }}>#</th>
                <th style={{ cursor: 'default' }}>PN</th>
                <th style={{ cursor: 'default' }}>Kategori</th>
                <th style={{ cursor: 'default' }}>Operasyonel Önem</th>
                <th className="n" style={{ cursor: 'default' }}>
                  Skor
                </th>
                <th style={{ cursor: 'default' }} />
              </tr>
            </thead>
            <tbody>
              {r.top.map((i, n) => {
                const eski = bazTop.indexOf(i);
                return (
                  <tr key={i} onClick={() => parcaAc(i)} style={{ cursor: 'pointer' }}>
                    <td className="n">{n + 1}</td>
                    <td className="pn-link mono">PN-{PN.id[i]}</td>
                    <td>{LK.sub[PN.sub[i]]}</td>
                    <td style={{ textAlign: 'center' }}>
                      <KrNokta i={i} />
                    </td>
                    <td className="n">{f1(r.risk[i])}</td>
                    <td>
                      {eski === n ? null : eski === -1 ? (
                        <span className="bg bg-warn">YENİ</span>
                      ) : (
                        <span className={'bg ' + (eski > n ? 'bg-teal' : 'bg-nk')}>
                          {eski > n ? '▲' : '▼'} {Math.abs(eski - n)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Kart>
    </Izgara>
  );
}
