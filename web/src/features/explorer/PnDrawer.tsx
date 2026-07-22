import { useMemo, type FC } from 'react';
import { Sparkles } from 'lucide-react';
import { useData } from '../../data/useData';
import { gunSayi, leadKisa, para, paraTam, sayi } from '../../lib/format';
import { durumTonu, durumdanEtiket, kalanGunRenk, kritiklikTonu } from '../../lib/countdown';
import { pnBul } from '../../lib/pnRows';
import { useStore } from '../../store';
import { Badge, Drawer, Skeleton } from '../../ui';

const Blok: FC<{ baslik: string; children: React.ReactNode }> = ({ baslik, children }) => (
  <section className="border-t border-tk-line pt-4 first:border-t-0 first:pt-0">
    <h3 className="eyebrow mb-2">{baslik}</h3>
    {children}
  </section>
);

const Satir: FC<{ etiket: string; deger: React.ReactNode }> = ({ etiket, deger }) => (
  <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
    <span className="text-tk-slate">{etiket}</span>
    <span className="tnum text-right font-medium">{deger}</span>
  </div>
);

/**
 * F61 — PN detay çekmecesi (global).
 * Uygulama seviyesinde mount edilir; her sekmedeki satır/nokta tıklaması buraya düşer.
 */
export const PnDrawer: FC = () => {
  const seciliPn = useStore((s) => s.seciliPn);
  const setSeciliPn = useStore((s) => s.setSeciliPn);
  const { data } = useData(['pn'] as const);

  const r = useMemo(
    () => (data.pn && seciliPn ? pnBul(data.pn, seciliPn) : null),
    [data.pn, seciliPn],
  );

  return (
    <Drawer
      acik={!!seciliPn}
      onKapat={() => setSeciliPn(null)}
      baslik={seciliPn ?? ''}
      ustBilgi={
        r && (
          <>
            <Badge tone={kritiklikTonu(r.krit)}>{r.krit}</Badge>
            <Badge tone={durumTonu(r.geriSayim)}>{durumdanEtiket(r.geriSayim)}</Badge>
            <Badge tone="neutral">{r.sub}</Badge>
            <Badge tone="neutral">{r.model}</Badge>
          </>
        )
      }
    >
      {!r ? (
        <Skeleton rows={8} />
      ) : (
        <div className="space-y-4">
          <Blok baslik="1 · talep">
            <Satir etiket="2025 çeyreklik oran" deger={`${sayi(r.rate25, 2)} adet/çeyrek`} />
            <Satir etiket="2033 çeyreklik oran" deger={`${sayi(r.rate33, 2)} adet/çeyrek`} />
            <Satir etiket="2033 yıllık projeksiyon" deger={`${sayi(r.rate33 * 4, 1)} adet`} />
            <Satir
              etiket="büyüme"
              deger={
                r.rate25 > 0
                  ? `×${sayi(r.rate33 / r.rate25, 2)}`
                  : 'baz yıl talebi sıfır'
              }
            />
          </Blok>

          <Blok baslik="2 · tedarik">
            <Satir etiket="Lead time" deger={leadKisa(r.lead)} />
            <Satir etiket="Temin kanalı" deger={r.kanal} />
            <Satir
              etiket="İç atölye kabiliyeti"
              deger={
                r.atolye ? (
                  <span className="text-sig-ok">var</span>
                ) : (
                  <span className="text-sig-warn">yok</span>
                )
              }
            />
            <Satir etiket="Birim CLP" deger={paraTam(r.clp)} />
            <Satir etiket="Birim FMV" deger={paraTam(r.fmv)} />
          </Blok>

          <Blok baslik="3 · stok">
            <Satir etiket="Elde servis" deger={sayi(r.stock)} />
            <Satir etiket="Pipeline" deger={sayi(r.pipeline)} />
            <Satir etiket="Atıl" deger={sayi(r.atil)} />
            <Satir etiket="Min–Max 2025" deger={`${sayi(r.min25)} – ${sayi(r.max25)}`} />
            <Satir etiket="Min–Max 2033" deger={`${sayi(r.min33)} – ${sayi(r.max33)}`} />
            <Satir
              etiket="Durum"
              deger={
                r.durum === 'AÇIK' ? (
                  <span className="text-sig-crit">
                    AÇIK · {sayi(r.acik)} adet eksik ({para(r.acik * r.clp)})
                  </span>
                ) : r.durum === 'FAZLA' ? (
                  <span className="text-sig-warn">
                    FAZLA · {sayi(r.fazla)} adet ({para(r.fazla * r.fmv)})
                  </span>
                ) : (
                  <span className="text-sig-ok">DENGEDE</span>
                )
              }
            />
          </Blok>

          <Blok baslik="4 · geri sayım">
            <Satir etiket="Günlük talep" deger={`${sayi(r.gunlukTalep, 3)} adet/gün`} />
            <Satir
              etiket="Tükenme günü"
              deger={
                r.gunlukTalep > 0 ? `${sayi(r.stock / r.gunlukTalep, 0)} gün` : 'talep yok'
              }
            />
            <div className="mt-3 rounded border border-tk-line bg-tk-mist/60 px-4 py-3 text-center">
              <div className="eyebrow">kalan gün</div>
              <div
                className={`tnum font-display text-3xl font-extrabold tracking-[-.02em] leading-none ${kalanGunRenk(
                  r.kalan,
                )}`}
              >
                {gunSayi(r.kalan)}
              </div>
              <p className="mt-1.5 text-xs text-tk-slate">
                {r.kalan < 0
                  ? 'Sipariş tarihi geçmiş — bugün sipariş edilse bile stok tükenecek.'
                  : `Sipariş için ${sayi(r.kalan, 0)} gün var.`}
              </p>
            </div>
          </Blok>

          <Blok baslik="5 · risk">
            <Satir
              etiket="AOG risk skoru"
              deger={<span className="font-display text-lg font-extrabold tracking-[-.02em]">{sayi(r.risk, 1)}</span>}
            />
            <Satir etiket="Servis seviyesi z" deger={sayi(r.z, 3)} />
          </Blok>

          {/* yol haritası görünür kalsın */}
          <div className="rounded border border-dashed border-tk-line bg-tk-mist/40 p-4">
            <h3 className="text-sm font-semibold text-tk-slate">Neden bu PN riskli?</h3>
            <p className="mt-1 text-xs leading-relaxed text-tk-slate">
              Risk skorunun bileşenlerini ve geçmiş hareketleri doğal dilde özetleyen açıklama.
            </p>
            <button
              type="button"
              disabled
              className="mt-3 cursor-not-allowed rounded-[4px] border border-tk-line bg-tk-white px-3 py-1.5 text-xs font-medium text-tk-slate/60"
            >
              <Sparkles size={12} className="mr-1 inline" strokeWidth={2.2} />
              Açıklama üret
            </button>
            <p className="mt-2 text-2xs uppercase tracking-wide text-tk-slate/70">
              Faz 3: LLM açıklaması
            </p>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default PnDrawer;
