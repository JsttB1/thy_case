import { useEffect, useRef, type FC } from 'react';
import type { Station } from '../../data/types';

/**
 * 3B küresel ağ küresi — saf canvas, harici bağımlılık yok.
 * Dönen bir gezegen; THY istasyonları parlayan düğümler, aralarında büyük-çember
 * uçuş yayları ve üzerlerinde iz bırakarak gidip gelen uçaklar. Koyu "uzay" zemini
 * yalnız tk-ink + tk-red marka tonlarını kullanır. prefers-reduced-motion varsa
 * dönmez, uçaklar sabittir. Görsel amaçlıdır; sayısal iddia taşımaz.
 */

interface V3 {
  x: number;
  y: number;
  z: number;
}

const D2R = Math.PI / 180;

function llToVec(latDeg: number, lonDeg: number): V3 {
  const lat = latDeg * D2R;
  const lon = lonDeg * D2R;
  return {
    x: Math.cos(lat) * Math.cos(lon),
    y: Math.sin(lat),
    z: Math.cos(lat) * Math.sin(lon),
  };
}

export const GlobeCore: FC<{ stations: Station[]; className?: string }> = ({
  stations,
  className = '',
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── istasyon vektörleri (depo tipine göre kademe)
    const st = stations.map((s) => {
      const anaDepo = s.depoTipi === 'ana_depo';
      const kirmizi = anaDepo || s.depoTipi === 'ileri_depo';
      return {
        v: llToVec(s.lat, s.lon),
        kirmizi,
        r: anaDepo ? 3.6 : s.depoTipi === 'ileri_depo' ? 2.4 : 1.6,
        parlak: anaDepo ? 12 : kirmizi ? 7 : 3,
      };
    });

    // ── arka plan yıldızları (uzay hissi)
    const yildizlar = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.1,
      faz: Math.random() * Math.PI * 2,
    }));

    // ── uçuş yayları: IST (0) → hepsi + birkaç çapraz hat
    const ciftler: [number, number][] = [];
    for (let i = 1; i < st.length; i++) ciftler.push([0, i]);
    const capraz: [number, number][] = [
      [2, 3],
      [9, 12],
      [13, 14],
      [10, 11],
      [1, 4],
    ];
    for (const c of capraz) if (c[0] < st.length && c[1] < st.length) ciftler.push(c);

    const arclar = ciftler.map(([i, j], k) => {
      const a = st[i].v;
      const b = st[j].v;
      const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
      const omega = Math.acos(dot);
      return {
        a,
        b,
        omega,
        sinO: Math.sin(omega) || 1e-6,
        yuk: 0.1 + 0.22 * (omega / Math.PI),
        faz: (k * 0.37) % 1,
        hiz: 0.05 + (k % 3) * 0.012,
        yon: k % 2 === 0 ? 1 : -1,
      };
    });

    function arcPt(ar: (typeof arclar)[number], t: number): V3 {
      const s1 = Math.sin((1 - t) * ar.omega) / ar.sinO;
      const s2 = Math.sin(t * ar.omega) / ar.sinO;
      const r = 1 + ar.yuk * Math.sin(Math.PI * t);
      return {
        x: (ar.a.x * s1 + ar.b.x * s2) * r,
        y: (ar.a.y * s1 + ar.b.y * s2) * r,
        z: (ar.a.z * s1 + ar.b.z * s2) * r,
      };
    }

    // ── graticule (meridyen + paralel) noktaları
    const meridyenler: V3[][] = [];
    for (let lon = 0; lon < 360; lon += 30) {
      const line: V3[] = [];
      for (let lat = -80; lat <= 80; lat += 8) line.push(llToVec(lat, lon));
      meridyenler.push(line);
    }
    const paraleller: V3[][] = [];
    for (const lat of [-60, -30, 0, 30, 60]) {
      const line: V3[] = [];
      for (let lon = 0; lon <= 360; lon += 8) line.push(llToVec(lat, lon));
      paraleller.push(line);
    }

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const boyutla = () => {
      const rect = cvs.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    boyutla();
    const ro = new ResizeObserver(boyutla);
    ro.observe(cvs);

    const TILT = -0.16;
    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);

    function proj(v: V3, rot: number, cx: number, cy: number, scale: number) {
      const cr = Math.cos(rot);
      const sr = Math.sin(rot);
      const x = v.x * cr - v.z * sr;
      let z = v.x * sr + v.z * cr;
      const y0 = v.y;
      const y = y0 * cosT - z * sinT;
      z = y0 * sinT + z * cosT;
      const persp = 1 / (1 - z * 0.26);
      return { sx: cx + x * scale * persp, sy: cy - y * scale * persp, z };
    }

    const cizim = (t: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) * 0.35;
      // ağ merkezini (~30°E) öne getirip hafifçe salla — planlar hep görünür
      const rot = azHareket ? 1.05 : 1.05 + 0.55 * Math.sin(t * 0.00016);

      ctx.clearRect(0, 0, w, h);

      // yıldızlar
      for (const y of yildizlar) {
        const tw = azHareket ? 0.6 : 0.4 + 0.4 * Math.sin(t * 0.002 + y.faz);
        ctx.fillStyle = `rgba(200,210,230,${(0.12 + tw * 0.35).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(y.x * w, y.y * h, y.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // atmosfer parıltısı (dış halka)
      const atmos = ctx.createRadialGradient(cx, cy, scale * 0.9, cx, cy, scale * 1.28);
      atmos.addColorStop(0, 'rgba(232,25,50,0.14)');
      atmos.addColorStop(1, 'rgba(232,25,50,0)');
      ctx.fillStyle = atmos;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 1.28, 0, Math.PI * 2);
      ctx.fill();

      // gezegen gövdesi — radyal degrade küre
      const grad = ctx.createRadialGradient(
        cx - scale * 0.3,
        cy - scale * 0.35,
        scale * 0.2,
        cx,
        cy,
        scale * 1.05,
      );
      grad.addColorStop(0, 'rgba(38,44,62,0.95)');
      grad.addColorStop(1, 'rgba(11,14,22,0.98)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, scale, 0, Math.PI * 2);
      ctx.fill();
      // rim
      ctx.strokeStyle = 'rgba(120,140,170,0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // graticule
      const cizgi = (line: V3[]) => {
        for (let i = 0; i < line.length - 1; i++) {
          const p = proj(line[i], rot, cx, cy, scale);
          const q = proj(line[i + 1], rot, cx, cy, scale);
          const d = (p.z + q.z) / 2;
          if (d < -0.25) continue;
          const op = 0.04 + Math.max(0, d) * 0.12;
          ctx.strokeStyle = `rgba(150,170,200,${op.toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(q.sx, q.sy);
          ctx.stroke();
        }
      };
      meridyenler.forEach(cizgi);
      paraleller.forEach(cizgi);

      // uçuş yayları
      for (const ar of arclar) {
        ctx.lineWidth = 1;
        for (let s = 0; s < 40; s++) {
          const t0 = s / 40;
          const t1 = (s + 1) / 40;
          const p = proj(arcPt(ar, t0), rot, cx, cy, scale);
          const q = proj(arcPt(ar, t1), rot, cx, cy, scale);
          const d = (p.z + q.z) / 2;
          const op = (0.08 + Math.max(0, d) * 0.4) * 0.9;
          ctx.strokeStyle = `rgba(232,25,50,${op.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(q.sx, q.sy);
          ctx.stroke();
        }
      }

      // istasyon düğümleri
      for (const s of st) {
        const p = proj(s.v, rot, cx, cy, scale);
        if (p.z < -0.15) continue;
        const on = (p.z + 1) / 2;
        if (s.kirmizi) {
          ctx.shadowBlur = s.parlak * on;
          ctx.shadowColor = 'rgba(255,77,98,0.9)';
          ctx.fillStyle = `rgba(255,77,98,${(0.55 + 0.4 * on).toFixed(3)})`;
        } else {
          ctx.shadowBlur = s.parlak * on;
          ctx.shadowColor = 'rgba(200,215,235,0.6)';
          ctx.fillStyle = `rgba(215,224,238,${(0.4 + 0.4 * on).toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, s.r * (0.7 + on * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // uçaklar — yay üzerinde ilerler, iz bırakır
      for (const ar of arclar) {
        let tt = azHareket ? 0.5 : ((t * 0.001 * ar.hiz * 20 + ar.faz) % 1 + 1) % 1;
        if (ar.yon < 0) tt = 1 - tt;
        const pos = proj(arcPt(ar, tt), rot, cx, cy, scale);
        if (pos.z < -0.1) continue;

        // iz
        for (let k = 1; k <= 5; k++) {
          const tb = tt - ar.yon * 0.02 * k;
          if (tb < 0 || tb > 1) continue;
          const pb = proj(arcPt(ar, tb), rot, cx, cy, scale);
          ctx.fillStyle = `rgba(255,120,140,${(0.28 * (1 - k / 6)).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(pb.sx, pb.sy, 1.4 * (1 - k / 7), 0, Math.PI * 2);
          ctx.fill();
        }

        // uçak gövdesi (yön üçgeni)
        const ileri = proj(arcPt(ar, Math.min(1, Math.max(0, tt + ar.yon * 0.01))), rot, cx, cy, scale);
        const ang = Math.atan2(ileri.sy - pos.sy, ileri.sx - pos.sx);
        ctx.save();
        ctx.translate(pos.sx, pos.sy);
        ctx.rotate(ang);
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255,77,98,0.9)';
        ctx.fillStyle = '#FF6274';
        ctx.beginPath();
        ctx.moveTo(4.5, 0);
        ctx.lineTo(-3, 2.6);
        ctx.lineTo(-1.4, 0);
        ctx.lineTo(-3, -2.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.shadowBlur = 0;
        // parlak çekirdek
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(pos.sx, pos.sy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let raf = 0;
    if (azHareket) {
      cizim(0);
    } else {
      const dongu = (t: number) => {
        cizim(t);
        raf = requestAnimationFrame(dongu);
      };
      raf = requestAnimationFrame(dongu);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [stations]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
};

export default GlobeCore;
