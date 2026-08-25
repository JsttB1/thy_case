/**
 * Hangar geometrisi — kontroller.
 *
 * Sahne gözle doğrulanır ama SİLUET ve UÇUŞ PROFİLİ gözle yanıltıcıdır: kamera
 * uzaktayken "uçak gibi" duran bir eğri, yakın planda burnu yere gömülü çıkar.
 * Buradaki kontroller kureGeo/araziGeo testleriyle aynı işi görür — sayısal
 * davranışı sabitler, sahne dosyası değişince kırılır.
 */
import { describe, it, expect } from 'vitest';
import {
  kalkis,
  inis,
  ucusHali,
  PIST,
  govdeProfil,
  kuyrukKalkisi,
  KUYRUK_Z,
  kanatPlanform,
  komponentYeri,
  korKesiti,
  kademeler,
  fibonacciKure,
  kolay,
  aralik,
  KAMERA,
  MOTOR,
  MOTOR_MERKEZ,
} from './hangarGeo';
import { MOTOR_KOMPONENT } from './hangarVeri';

describe('yardımcılar', () => {
  it('kolay 0..1 arasında kalır ve uçlarda sabitlenir', () => {
    expect(kolay(-3)).toBe(0);
    expect(kolay(0)).toBe(0);
    expect(kolay(1)).toBe(1);
    expect(kolay(9)).toBe(1);
    expect(kolay(0.5)).toBeCloseTo(0.5, 6);
  });

  it('kolay ortada doğrusaldan yumuşaktır (gerçekten smoothstep)', () => {
    expect(kolay(0.25)).toBeLessThan(0.25);
    expect(kolay(0.75)).toBeGreaterThan(0.75);
  });

  it('aralik pencereyi 0..1e taşır, dışını kırpar', () => {
    expect(aralik(1, 2, 4)).toBe(0);
    expect(aralik(3, 2, 4)).toBe(0.5);
    expect(aralik(9, 2, 4)).toBe(1);
    // sıfır genişlikli pencere: eşik davranışı, NaN değil
    expect(aralik(5, 3, 3)).toBe(1);
    expect(aralik(1, 3, 3)).toBe(0);
  });
});

describe('kalkış profili', () => {
  it('pistte başlar, rotasyona kadar tekerlek yerdedir', () => {
    expect(kalkis(0, 0).y).toBe(0);
    expect(kalkis(0, 0).yerde).toBe(true);
    expect(kalkis(PIST.rotasyon - 0.01, 0).yerde).toBe(true);
    expect(kalkis(PIST.rotasyon + 0.01, 0).yerde).toBe(false);
  });

  it('irtifa rotasyondan sonra tek yönlü artar', () => {
    let onceki = -1;
    for (let t = PIST.rotasyon; t <= 1.0001; t += 0.02) {
      const y = kalkis(t, 0).y;
      expect(y).toBeGreaterThanOrEqual(onceki);
      onceki = y;
    }
    expect(kalkis(1, 0).y).toBeCloseTo(PIST.tirmanis, 5);
  });

  it('x pist boyunca hep ileri gider ve hızlanır', () => {
    const x = [0, 0.25, 0.5, 0.75, 1].map((t) => kalkis(t, 0).x);
    for (let i = 1; i < x.length; i++) expect(x[i]).toBeGreaterThan(x[i - 1]);
    // hızlanma: ikinci yarıdaki yol, ilk yarıdakinden uzun
    expect(x[4] - x[2]).toBeGreaterThan(x[2] - x[0]);
    expect(x[0]).toBeCloseTo(PIST.x0, 5);
    expect(x[4]).toBeCloseTo(PIST.x1, 5);
  });

  it('burun koşuda düz, rotasyondan sonra yukarıdadır ve makul sınırda kalır', () => {
    expect(kalkis(0.1, 0).egim).toBeCloseTo(0, 6);
    expect(kalkis(PIST.rotasyon + 0.08, 0).egim).toBeGreaterThan(0.15);
    for (let t = 0; t <= 1; t += 0.01) {
      const e = kalkis(t, 0).egim;
      expect(e).toBeLessThan(0.35); // ~20° — üstü "roket" görünüyor
      expect(e).toBeGreaterThan(-0.05);
    }
  });
});

describe('iniş profili', () => {
  it('yüksekten gelir, temas anında yere oturur ve altına inmez', () => {
    expect(inis(0, 0).y).toBeCloseTo(PIST.yaklasma, 5);
    expect(inis(PIST.temas, 0).y).toBe(0);
    expect(inis(1, 0).y).toBe(0);
    for (let t = 0; t <= 1; t += 0.01) expect(inis(t, 0).y).toBeGreaterThanOrEqual(0);
  });

  it('temastan önce irtifa tek yönlü azalır', () => {
    let onceki = Infinity;
    for (let t = 0; t < PIST.temas; t += 0.01) {
      const y = inis(t, 0).y;
      expect(y).toBeLessThanOrEqual(onceki + 1e-9);
      onceki = y;
    }
  });

  it('flare burnu kaldırır, temastan sonra indirir', () => {
    expect(inis(0.2, 0).egim).toBeLessThan(0); // süzülüşte burun aşağı
    expect(inis(PIST.temas - 0.005, 0).egim).toBeGreaterThan(0.08); // flare
    expect(inis(1, 0).egim).toBeLessThan(0.02); // burun indi
  });

  it('yerde bayrağı temas noktasında döner', () => {
    expect(inis(PIST.temas - 0.01, 0).yerde).toBe(false);
    expect(inis(PIST.temas, 0).yerde).toBe(true);
  });
});

describe('ucusHali seçicisi', () => {
  it('tipe göre doğru profili verir ve z aynen taşınır', () => {
    expect(ucusHali('kalkis', 0.5, -150)).toEqual(kalkis(0.5, -150));
    expect(ucusHali('inis', 0.5, -262)).toEqual(inis(0.5, -262));
    expect(ucusHali('kalkis', 0.5, -150).z).toBe(-150);
  });

  it('t sınırların dışına taşsa da profil kırılmaz (döngüde faz kayması var)', () => {
    for (const t of [-0.4, 0, 1, 1.6]) {
      for (const tip of ['kalkis', 'inis'] as const) {
        const h = ucusHali(tip, t, 0);
        expect(Number.isFinite(h.x)).toBe(true);
        expect(Number.isFinite(h.y)).toBe(true);
        expect(h.y).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('gövde ve kanat kesitleri', () => {
  it('gövde profili kuyruktan buruna sıralıdır ve yarıçap hep pozitif', () => {
    const p = govdeProfil();
    for (let i = 1; i < p.length; i++) expect(p[i][0]).toBeGreaterThan(p[i - 1][0]);
    for (const [, r] of p) expect(r).toBeGreaterThan(0);
    // uçlar kapanır (burun ve kuyruk konisi), ortada en geniş kesit
    expect(p[0][1]).toBeLessThan(0.1);
    expect(p[p.length - 1][1]).toBeLessThan(0.1);
    expect(Math.max(...p.map(([, r]) => r))).toBeCloseTo(1.85, 5);
  });

  it('kuyruk kalkışı yalnız kuyrukta çalışır ve geriye doğru büyür', () => {
    // kabin bölümünde düz, kuyruk konisi başlayınca (KUYRUK_Z) kalkmaya başlar
    expect(kuyrukKalkisi(0)).toBe(0);
    expect(kuyrukKalkisi(10)).toBe(0);
    expect(kuyrukKalkisi(KUYRUK_Z)).toBe(0);
    expect(kuyrukKalkisi(-12)).toBeGreaterThan(0);
    expect(kuyrukKalkisi(-19.5)).toBeGreaterThan(kuyrukKalkisi(-12));
  });

  it('kanat planformu kapalı bir poligon ve ok açılıdır', () => {
    const k = kanatPlanform();
    expect(k.length).toBeGreaterThanOrEqual(6);
    // kök veteri uçtan uzun (sivrilme) — açıklık arttıkça veter kısalır
    const kokVeter = k[0][1] - k[1][1];
    const ucVeter = Math.abs(k[4][1] - k[5][1]);
    expect(kokVeter).toBeGreaterThan(ucVeter);
    // hücum kenarı geriye kaçar (ok açısı): açıklık arttıkça veter geriye gider
    expect(k[3][1]).toBeLessThan(k[1][1]);
  });
});

describe('motor yerleşimi', () => {
  it('rozet dağılırken yarıçap büyür, açı ve istasyon (z) korunur', () => {
    const ist = { z: -0.75, aci: 2.42 };
    const kapali = komponentYeri(ist, 0);
    const acik = komponentYeri(ist, 1);
    // z istasyonu patlamada KAYMAZ: rozet kendi kademesinin hizasında kalmalı
    expect(kapali.z).toBe(ist.z);
    expect(acik.z).toBe(ist.z);
    // açı korunur (yön aynı), yarıçap büyür
    expect(Math.atan2(acik.y, acik.x)).toBeCloseTo(Math.atan2(kapali.y, kapali.x), 8);
    expect(Math.hypot(acik.x, acik.y)).toBeGreaterThan(Math.hypot(kapali.x, kapali.y));
    expect(Math.hypot(kapali.x, kapali.y)).toBeCloseTo(1.15, 8);
  });

  it('sekiz komponent motorun içine sığar ve ikisi aynı yerde durmaz', () => {
    expect(MOTOR_KOMPONENT).toHaveLength(8);
    for (const k of MOTOR_KOMPONENT) {
      // istasyon motor gövdesinin içinde: egzoz konisi ile hava girişi arasında
      expect(k.ist.z).toBeLessThanOrEqual(MOTOR.girisZ);
      expect(k.ist.z).toBeGreaterThanOrEqual(MOTOR.kuyrukZ);
    }
    // aynı (z, açı) çiftinde iki rozet olmamalı — etiketler üst üste biner
    const anahtar = MOTOR_KOMPONENT.map((k) => `${k.ist.z.toFixed(2)}|${k.ist.aci.toFixed(2)}`);
    expect(new Set(anahtar).size).toBe(anahtar.length);
  });

  it('yandan bakışta rozetler birbirinden ayrışır (z ya da açı farkı)', () => {
    /* Motor YANDAN gösteriliyor: ekrandaki yatay yer z'den, dikey yer açının
       sinüsünden geliyor. İki rozet her iki eksende birden yakınsa etiketleri
       çakışır — tasarım kuralı bu, test onu kilitliyor. */
    const p = MOTOR_KOMPONENT.map((k) => komponentYeri(k.ist, 1));
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const dz = Math.abs(p[i].z - p[j].z);
        const dy = Math.abs(p[i].y - p[j].y);
        expect(dz > 0.35 || dy > 0.9).toBe(true);
      }
    }
  });

  it('kor kesiti kompresörden türbine daralır sonra genişler (yanma boğazı)', () => {
    const k = korKesiti();
    for (let i = 1; i < k.length; i++) expect(k[i][0]).toBeLessThan(k[i - 1][0]);
    const r = k.map(([, x]) => x);
    const enDar = Math.min(...r);
    expect(r.indexOf(enDar)).toBeGreaterThan(0);
    expect(r.indexOf(enDar)).toBeLessThan(r.length - 1);
  });

  it('kademeler eksen boyunca sıralı ve kesit içinde kalır', () => {
    const k = kademeler();
    for (let i = 1; i < k.length; i++) expect(k[i][0]).toBeLessThan(k[i - 1][0]);
    for (const [z, ic, dis, n] of k) {
      expect(dis).toBeGreaterThan(ic); // bıçak boyu pozitif
      expect(dis).toBeLessThan(MOTOR.korR); // kor kaportasını delmez
      expect(z).toBeLessThan(MOTOR.fanZ); // hepsi fanın ARKASINDA
      expect(n).toBeGreaterThan(12);
    }
  });

  it('fan kaportanın içinde kalır', () => {
    expect(MOTOR.fanR).toBeLessThan(MOTOR.disR);
    expect(MOTOR.fanZ).toBeLessThan(MOTOR.girisZ); // fan girişin gerisinde
    expect(MOTOR.baypasZ).toBeLessThan(MOTOR.fanZ); // baypas çıkışı fanın arkasında
  });
});

describe('karar küresi', () => {
  it('fibonacci noktaları birim küre üzerindedir', () => {
    const n = 500;
    const p = fibonacciKure(n);
    expect(p.length).toBe(n * 3);
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      expect(d).toBeCloseTo(1, 5);
    }
  });

  it('kutuptan kutba iner — ilk nokta tepe, son nokta dip', () => {
    const p = fibonacciKure(100);
    expect(p[1]).toBeCloseTo(1, 6);
    expect(p[99 * 3 + 1]).toBeCloseTo(-1, 6);
  });
});

describe('kamera yörüngesi', () => {
  it('her perdenin bir duruşu vardır ve fov makul aralıkta kalır', () => {
    expect(KAMERA.length).toBe(5);
    for (const d of KAMERA) {
      expect(d.fov).toBeGreaterThan(20);
      expect(d.fov).toBeLessThan(90);
      expect(d.poz).toHaveLength(3);
      expect(d.bak).toHaveLength(3);
    }
  });

  it('son üç perde motora nişan alır ve önünde durur', () => {
    for (const d of KAMERA.slice(2)) {
      const sapma = Math.hypot(
        d.bak[0] - MOTOR_MERKEZ[0],
        d.bak[1] - MOTOR_MERKEZ[1],
        d.bak[2] - MOTOR_MERKEZ[2],
      );
      expect(sapma).toBeLessThan(1.2);
      // kamera motorun ÖNÜNDE (+Z), içinden geçip arkasına düşmez
      expect(d.poz[2]).toBeGreaterThan(MOTOR_MERKEZ[2]);
    }
  });

  it('perde 2 ve 3 motoru YANDAN görür — kesitin içi ancak böyle okunur', () => {
    /* Baştan bakan kamerada yalnız fan diski görünüyordu; kademeler, yanma
       odası ve türbin hiç okunmuyordu. Yanal kaçıklık bu ekranın tasarım
       sözleşmesi, testi de onu koruyor. */
    for (const d of [KAMERA[2], KAMERA[3]]) {
      expect(d.poz[0] - MOTOR_MERKEZ[0]).toBeGreaterThan(3);
    }
  });

  it('motora yaklaşma monoton: her perde bir öncekinden yakın ya da geri çekilmiş', () => {
    const uzaklik = KAMERA.map((d) =>
      Math.hypot(
        d.poz[0] - MOTOR_MERKEZ[0],
        d.poz[1] - MOTOR_MERKEZ[1],
        d.poz[2] - MOTOR_MERKEZ[2],
      ),
    );
    // perde 2 dalıştır: 0 ve 1'den belirgin yakın
    expect(uzaklik[2]).toBeLessThan(uzaklik[0]);
    expect(uzaklik[2]).toBeLessThan(uzaklik[1]);
    // 3 ve 4 komponentleri göstermek için geri çekilir ama dalıştan öteye gitmez
    expect(uzaklik[3]).toBeGreaterThan(uzaklik[2]);
    expect(uzaklik[4]).toBeLessThan(uzaklik[0]);
  });
});
