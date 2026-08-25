/**
 * UZUN VADE PLAN — CODE'un 2033 yol haritası önerisi.
 *
 * Fazların anlatısı ve sırası SABİTTİR (ürün kararı, CLAUDE.md §5–7); içindeki
 * sayılar payload'dan canlı gelir. Faz kapıları takvim değil METRİKtir: bir faz,
 * eşiği tutmadan kapanmaz — bu yüzden kartlarda tarih değil "kapı" yazar.
 */
import { K, B } from '@/data/payload';
import { kararMotoru } from '@/engine/karar';
import { fmt, mM, pct } from '@/engine/format';
import { useStore } from '@/app/store';
import type { Sekme } from '@/app/store';

interface Faz {
  fz: string;
  donem: string;
  baslik: string;
  metin: string;
  kazancL: string;
  kazanc: string;
  guven: number;
  kapi: string;
  git?: { ad: string; sekme: Sekme }[];
}

export default function UzunVade() {
  const d = kararMotoru();
  const git = useStore((s) => s.git);
  const watchAc = useStore((s) => s.watchAc);

  const FAZLAR: Faz[] = [
    {
      fz: 'FAZ 1 · GÖRÜNÜRLÜK',
      donem: '0–9 AY',
      baslik: 'Parça görünür olmadan hiçbir tahmin işe yaramaz',
      metin:
        `Bugün ${fmt(d.alarm.length)} parçanın sipariş penceresi kapalı ve siparişi yok — bu bir ` +
        `stok değil kayıt sorunu. İlk faz salt-okunur: dağınık kaynaklar tek komponent kaydında ` +
        `birleşir, her durum değişimi olay olarak yazılır, gerçek TAT iki olayın farkından ölçülür. ` +
        `Hiçbir kaynağa yazılmaz; AMOS değiştirilmez, üzerine karar katmanı konur.`,
      kazancL: 'İlk gün değeri',
      kazanc: `${fmt(K.siparissiz)} kör nokta`,
      guven: 94,
      kapi: 'KAPI: veri kalitesi skoru eşiği',
      git: [{ ad: 'kör noktaları gör', sekme: 'watch' }],
    },
    {
      fz: 'FAZ 2 · ÖNGÖRÜ',
      donem: '9–24 AY',
      baslik: 'Talebin üçte ikisi yer değiştirirken geçmişe bakan plan çöker',
      metin:
        `2033'te talebin çoğunluğu bugün geçmişi olmayan yeni nesil parçalarda olacak; portföy ` +
        `bandı +${pct(B.alt_pct, 0)}–${pct(B.ust_pct, 0)} arasında büyüyor ama kategori çarpanları ` +
        `iki katına kadar ayrışıyor. Cold-start (analog eşleme + OEM öncülü + Bayes güncelleme) ` +
        `kenar vaka değil ana senaryodur. Kesikli talep için Croston/SBA, emniyet stoğu için ` +
        `servis hedefli Poisson; min-max gecelik önerilir, insan onaylar.`,
      kazancL: '2033 MIN toplamı',
      kazanc: `${fmt(K.min33)} adet`,
      guven: 87,
      kapi: 'KAPI: MAPE + öneri kabul oranı',
      git: [{ ad: 'tahmin gezgini', sekme: 'ongoru' }],
    },
    {
      fz: 'FAZ 3 · KABİLİYET',
      donem: '18–36 AY',
      baslik: 'Yazılım dışı karar: hangi parçanın tamiri içeri alınmalı',
      metin:
        `${fmt(K.risk_listesi)} AOG kritik parçada iç tamir kabiliyeti yok; ${fmt(K.uclu)} tanesi ` +
        `aynı zamanda yeni nesil — üçlü tehlike. Dış tamir harcaması ${mM(K.kab_bugun)}/yıl. ` +
        `Kabiliyet içeri alınırsa tamir süresi ~5 kat kısalır ve maliyet ~%36 düşer; sıralama ` +
        `duyguyla değil ROI listesiyle yapılır. Aynı hamle BER kuralını da besler: ` +
        `${fmt(K.ber_pn)} parçada tamir zaten ekonomik değil.`,
      kazancL: 'Yıllık kazanç',
      kazanc: `${mM(K.kab_tasarruf)}/yıl`,
      guven: 83,
      kapi: 'KAPI: atölye devreye alma başarı oranı',
      git: [{ ad: 'ROI sıralayıcısı', sekme: 'senaryo' }],
    },
    {
      fz: 'FAZ 4 · DAYANIKLILIK',
      donem: '36 AY → 2033',
      baslik: 'Kriz bir sürpriz değil, parametre şokudur',
      metin:
        `2033 filosunun üçte ikisi beş yeni nesil modelde toplanıyor: ortaklık verim sağlar ama ` +
        `riski yoğunlaştırır. Her kriz dayanma süresini kısaltır ya da toparlanma süresini uzatır — ` +
        `ikisi de bu sistemin dilinde ölçülür. Senaryo kütüphanesi, çeyreklik war-game ve önceden ` +
        `yetkilendirilmiş playbook devreye girer. Phase-out ${mM(K.phaseout)} stok takvimle değil ` +
        `tetikle eritilir; bağlı sermaye ${mM(K.float_fmv)} → ${mM(K.float_fmv_33)} yolunu ` +
        `kendiliğinden değil yönetilerek yürür.`,
      kazancL: 'Yönetilen sermaye',
      kazanc: `${mM(K.phaseout + K.float_fmv_33)}`,
      guven: 79,
      kapi: 'KAPI: stres testi hedefleri tutuyor mu',
      git: [{ ad: 'kriz simülatörü', sekme: 'senaryo' }],
    },
  ];

  return (
    <div className="code-panel">
      <div className="bas">
        <span className="kod">CDE-04</span>
        <h3>Uzun vade plan · 2033 yol haritası</h3>
        <span className="crz mo">SENTEZ</span>
        <div className="sagg">
          <span className="crz no">faz kapıları takvim değil metrik</span>
        </div>
      </div>

      <div className="icerik" style={{ paddingBottom: 0 }}>
        <div className="yol">
          {FAZLAR.map((f) => (
            <div className="yol-k" key={f.fz}>
              <div className="fz">{f.fz}</div>
              <div className="dn">{f.donem}</div>
              <h4>{f.baslik}</h4>
              <p>{f.metin}</p>
              <div className="kz">
                <div className="l">{f.kazancL}</div>
                <div className="v">{f.kazanc}</div>
              </div>
              <div className="gv">
                <span>GÜVEN</span>
                <span className="ray">
                  <i style={{ width: f.guven + '%' }} />
                </span>
                <span>%{f.guven}</span>
              </div>
              <div className="kap">
                <span className="crz no">{f.kapi}</span>
                {f.git?.map((g) => (
                  <button
                    key={g.ad}
                    className="ccip"
                    onClick={() => (g.sekme === 'watch' ? watchAc({ flag: 'SIP' }) : git(g.sekme))}
                  >
                    {g.ad} →
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="not">
        <b>Bu plan nasıl üretildi.</b> Faz sırası ve anlatı ürün kararıdır; içindeki sayılar
        payload'dan canlı gelir. Dil katmanı demoda hazır metinlerle çalışır — cümleyi kuran
        senaryodur, sayıyı kuran <b>motor</b>. Gerçek kurulumda aynı yerler bir LLM'in araç
        çağrılarıyla doldurulur; motorun kendisi değişmez.
      </div>
    </div>
  );
}
