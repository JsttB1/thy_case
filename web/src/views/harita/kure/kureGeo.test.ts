/**
 * Küre geometrisi kontrolleri.
 *
 * Bu testler "kod çalışıyor mu" demiyor; 3D'ye geçerken sessizce bozulabilecek
 * üç şeyi kilitliyor: (1) dünya ayna görüntüsü olmasın (doğu sağda kalsın),
 * (2) yaylar gerçekten iki havalimanını birleştirsin, (3) kara ızgarası karayı
 * karada, denizi denizde bulsun.
 */
import { describe, it, expect } from 'vitest';
import { HA } from '../haritaVeri';
import {
  llv,
  IST_POZ,
  R,
  yayNoktalari,
  yayOrnek,
  karada,
  karaNoktalari,
  konturCizgileri,
  cerceve,
} from './kureGeo';

const kod = (k: string) => HA.kod.indexOf(k);
const uz = (v: [number, number, number] | Float32Array, o = 0) =>
  Math.hypot(v[o], v[o + 1], v[o + 2]);

describe('küre koordinatları', () => {
  it('kutuplar ve başlangıç meridyeni yerinde', () => {
    expect(llv(0, 90)[1]).toBeCloseTo(R, 6);
    expect(llv(0, -90)[1]).toBeCloseTo(-R, 6);
    const eq = llv(0, 0);
    expect(eq[0]).toBeCloseTo(R, 6);
    expect(Math.abs(eq[1])).toBeLessThan(1e-9);
  });

  it('her havalimanı küre yüzeyinde', () => {
    IST_POZ.forEach((p) => expect(uz(p)).toBeCloseTo(R, 6));
  });

  /* Ayna görüntüsü tuzağı: lon işareti ters kurulursa küre "doğru" görünür ama
     Amerika Asya'nın yerine geçer. Atlantik üstünden bakıldığında JFK solda,
     İstanbul sağda kalmalı. */
  it('doğu sağda, batı solda (ayna değil)', () => {
    const bakis = llv(-20, 40, 3); // Atlantik üzerinde kamera
    const p = [bakis[0], bakis[1], bakis[2]];
    const l = uz(p as [number, number, number]);
    const n = p.map((v) => v / l);
    // ekran sağ vektörü = up × kameraYönü
    const sag = [n[2], 0, -n[0]];
    const sl = Math.hypot(sag[0], sag[1], sag[2]);
    const dot = (i: number) =>
      (IST_POZ[i][0] * sag[0] + IST_POZ[i][1] * sag[1] + IST_POZ[i][2] * sag[2]) / sl;
    expect(dot(kod('IST'))).toBeGreaterThan(0.2);
    expect(dot(kod('JFK'))).toBeLessThan(-0.2);
  });
});

describe('büyük çember yayları', () => {
  it('uçları havalimanlarına oturur ve yüzeyin üstünde kalır', () => {
    const a = kod('IST');
    const b = kod('SIN');
    const { poz, n } = yayNoktalari(a, b);
    expect(uz(poz, 0)).toBeCloseTo(R, 5);
    expect(uz(poz, n * 3)).toBeCloseTo(R, 5);
    for (let i = 0; i <= n; i++) expect(uz(poz, i * 3)).toBeGreaterThanOrEqual(R - 1e-6);
    // orta nokta en yüksek yerde
    expect(uz(poz, Math.floor(n / 2) * 3)).toBeGreaterThan(R * 1.1);
  });

  it('uzun hat kısa hattan daha yüksek kalkar', () => {
    const kisa = yayNoktalari(kod('IST'), kod('SAW'));
    const uzun = yayNoktalari(kod('IST'), kod('JFK'));
    const tepe = (y: { poz: Float32Array; n: number }) => uz(y.poz, Math.floor(y.n / 2) * 3);
    expect(tepe(uzun)).toBeGreaterThan(tepe(kisa));
    expect(uzun.aci).toBeGreaterThan(kisa.aci);
  });

  it('örnekleyici t=0 ve t=1 uçlarını verir', () => {
    const { poz, n } = yayNoktalari(kod('ESB'), kod('FRA'));
    const o = new Float32Array(3);
    yayOrnek(poz, n, 0, o, 0);
    expect(Math.hypot(o[0] - poz[0], o[1] - poz[1], o[2] - poz[2])).toBeLessThan(1e-6);
    yayOrnek(poz, n, 1, o, 0);
    expect(
      Math.hypot(o[0] - poz[n * 3], o[1] - poz[n * 3 + 1], o[2] - poz[n * 3 + 2]),
    ).toBeLessThan(0.02);
  });
});

describe('kara zemini', () => {
  it('bilinen kara ve deniz noktalarını ayırır', () => {
    expect(karada(32.9, 39.9)).toBe(true); // Ankara
    expect(karada(2.3, 48.9)).toBe(true); // Paris
    expect(karada(-155, 5)).toBe(false); // Pasifik ortası
    expect(karada(-30, 35)).toBe(false); // Atlantik ortası
  });

  it('nokta matrisi ve kontur makul boyutta üretilir', () => {
    const n = karaNoktalari();
    expect(n.length / 3).toBeGreaterThan(2000);
    expect(n.length / 3).toBeLessThan(40000);
    for (let i = 0; i < n.length; i += 3)
      expect(Math.hypot(n[i], n[i + 1], n[i + 2])).toBeCloseTo(R * 1.0015, 4);
    expect(konturCizgileri().length / 6).toBeGreaterThan(1000);
  });
});

describe('kamera çerçevesi', () => {
  it('tek istasyona bakınca o istasyonun üstünde durur', () => {
    const i = kod('IST');
    const k = cerceve([i]);
    const l = uz(k);
    const c = Math.acos((k[0] * IST_POZ[i][0] + k[1] * IST_POZ[i][1] + k[2] * IST_POZ[i][2]) / l);
    expect(c).toBeLessThan(0.01);
  });

  it('dağınık küme için kamera geriye çekilir', () => {
    const yakin = uz(cerceve([kod('IST'), kod('SAW')]));
    const uzak = uz(cerceve([kod('IST'), kod('JFK'), kod('SIN')]));
    expect(uzak).toBeGreaterThan(yakin);
  });
});
