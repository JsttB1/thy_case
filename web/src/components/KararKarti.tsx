/**
 * ÖNERİLEN AKSİYON + KARAR KARTI — tek karar mekanizması, tek kod.
 *
 * Watchlist'ten CODE konsoluna TAŞINDI: kararın verildiği yer artık ilk sayfadaki
 * karar konsoludur. Parça detayı aynı kartı `saltOkunur` modunda gösterir — öneri
 * orada da görünür ama düğmeler tek yerdedir, iki ekran çelişemez.
 *
 * Öneri motoru engine/oner.ts, seçenek merdiveni engine/ladder.ts; Karar Merkezi'nin
 * toplu kanal dağılımı da aynı kanalSec() çağrısından geçer.
 */
import { useMemo } from 'react';
import { PN } from '@/data/payload';
import { oner } from '@/engine/oner';
import { BIRIM } from '@/engine/ladder';
import { fmt, mUsd } from '@/engine/format';
import { CC as C } from '@/design/renkler';
import { useStore, type Karar } from '@/app/store';
import { Cip } from '@/components/temel';

export type KararTip = 'onay' | 'ata' | 'talep' | 'incele' | 'yoksay';

export default function KararKarti({
  i,
  saltOkunur = false,
  baslik = 'Önerilen aksiyon',
}: {
  i: number;
  /** düğmeler yerine "CODE konsolunda karar ver" köprüsü gösterilir */
  saltOkunur?: boolean;
  baslik?: string;
}) {
  const kararlar = useStore((s) => s.kararlar);
  const kararVer = useStore((s) => s.kararVer);
  const hedef = useStore((s) => s.hedefIstasyon);
  const haritadaGoster = useStore((s) => s.haritadaGoster);
  const codeAc = useStore((s) => s.codeAc);

  const O = useMemo(() => oner(i), [i]);
  const kayit = kararlar[i];

  const kararUygula = (k: KararTip) => {
    if (k === 'incele') {
      // hedef istasyon seçilmemişse rota çizilmez; ana üsse (IST) düşülür
      haritadaGoster(
        i,
        hedef || 'IST',
        O.best.t === 'pool' || O.best.t === 'alim' ? 'rota' : 'depo',
      );
      return;
    }
    if (k === 'yoksay') {
      kararVer(i, null);
      return;
    }
    const zaman = new Date().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const metin =
      k === 'onay'
        ? O.gerek
          ? `${O.best.ad} onaylandı · ${O.best.gun} gün · ${
              O.best.m == null ? 'tamir borcu' : mUsd(O.best.m)
            }`
          : 'İzlemede kalsın kararı onaylandı — açık yok'
        : k === 'ata'
          ? `${BIRIM[O.best.t]} birimine atandı · ${O.best.ad}`
          : O.gerek
            ? `Satınalma talebi taslağı: ${fmt(O.acik)} adet · ${mUsd(O.acik * PN.clp[i])} liste değeri`
            : 'Açık yok: MIN seviyesi karşılanıyor, talep gerekmiyor';
    kararVer(i, { k, metin, zaman } satisfies Karar);
  };

  return (
    <div className="oner">
      <div className="l">{baslik}</div>
      <div className="ad" style={O.gerek ? undefined : { color: C.muted }}>
        {O.ad}
      </div>
      <div className="gr">{O.gerekce}</div>
      <div className="etki">
        <div>
          <span>Stok yetmeme riski</span>
          <b>
            {O.gerek ? (
              <>
                <i style={{ color: C.red }}>%{O.rOnce}</i> →{' '}
                <i style={{ color: C.teal }}>%{O.rSonra}</i>
              </>
            ) : (
              <i style={{ color: O.rOnce > 5 ? C.amber : C.teal }}>%{O.rOnce}</i>
            )}
          </b>
          <small>{O.gerek ? 'MIN seviyesine çıkılırsa' : 'mevcut stokla, MIN zaten aşılmış'}</small>
        </div>
        <div>
          <span>Mevcut açık</span>
          <b>{fmt(O.acik)} adet</b>
          <small>
            MIN {fmt(PN.min33[i])} · elde {fmt(PN.svc[i])}
          </small>
        </div>
        <div>
          <span>{O.gerek ? 'Önerilen kanal' : 'Hazırdaki kanal'}</span>
          <b>{O.best.gun} gün</b>
          <small>{O.best.m == null ? 'tamir borcu' : mUsd(O.best.m) + ' birim maliyet'}</small>
        </div>
      </div>

      {saltOkunur ? (
        <div className="btns">
          <Cip onClick={() => codeAc(i)} baslik="Kararlar CODE konsolunda verilir">
            ⌁ CODE konsolunda karar ver
          </Cip>
        </div>
      ) : (
        <div className="btns">
          <button className="btn pri" onClick={() => kararUygula('onay')}>
            Onayla
          </button>
          <button className="btn" onClick={() => kararUygula('ata')}>
            Ata
          </button>
          <button className="btn" onClick={() => kararUygula('incele')}>
            Haritada incele
          </button>
          <button className="btn" onClick={() => kararUygula('talep')}>
            Satınalma talebi oluştur
          </button>
          <button className="btn danger" onClick={() => kararUygula('yoksay')}>
            Yoksay
          </button>
        </div>
      )}

      <div className="kdur">
        {kayit ? (
          <>
            <b style={{ color: C.teal }}>Karar kaydı</b> · {kayit.metin}{' '}
            <span style={{ color: C.dim }}>· {kayit.zaman}</span>
          </>
        ) : (
          <span style={{ color: C.dim }}>
            {saltOkunur
              ? 'Karar verilmedi — konsoldan onaylanabilir.'
              : 'Karar verilmedi. Kayıt bu oturumda tutulur, sayfa yenilenince sıfırlanır.'}
          </span>
        )}
      </div>
    </div>
  );
}
