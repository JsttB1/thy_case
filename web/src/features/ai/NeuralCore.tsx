import { useEffect, useRef, type FC } from 'react';

/**
 * 3B nöral karar çekirdeği — saf canvas, harici bağımlılık yok.
 * Fibonacci küresi üzerine dağılmış düğümler Y ekseninde döner, yakın düğümler
 * arası bağlantılar derinliğe göre soluklaşır, birkaç "sıcak" düğüm (alarm) kırmızı
 * atar. prefers-reduced-motion varsa tek kare çizilir, döngü çalışmaz.
 *
 * Görsel amaçlıdır — bir "karar motoru işliyor" hissi verir; sayısal iddia taşımaz.
 */

interface P3 {
  x: number;
  y: number;
  z: number;
  hot: boolean;
  faz: number;
}

const N = 80;
const R = 1;
const BAGLANTI_ESIK = 0.62; // birim küre üzerinde komşuluk mesafesi

function kureNoktalari(n: number): P3[] {
  const pts: P3[] = [];
  const altin = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = altin * i;
    pts.push({
      x: Math.cos(t) * r * R,
      y: y * R,
      z: Math.sin(t) * r * R,
      hot: i % 11 === 0,
      faz: (i * 0.7) % (Math.PI * 2),
    });
  }
  return pts;
}

function kenarlar(pts: P3[]): [number, number][] {
  const e: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const dz = pts[i].z - pts[j].z;
      if (dx * dx + dy * dy + dz * dz < BAGLANTI_ESIK * BAGLANTI_ESIK) e.push([i, j]);
    }
  }
  return e;
}

export const NeuralCore: FC<{ className?: string }> = ({ className = '' }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const pts = kureNoktalari(N);
    const eds = kenarlar(pts);
    const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const boyutla = () => {
      const r = cvs.getBoundingClientRect();
      w = r.width;
      h = r.height;
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    boyutla();
    const ro = new ResizeObserver(boyutla);
    ro.observe(cvs);

    const cizim = (t: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const olcek = Math.min(w, h) * 0.4;
      const don = azHareket ? 0.6 : t * 0.00018;
      const egim = 0.42;
      const cosA = Math.cos(don);
      const sinA = Math.sin(don);

      // döndürülmüş + projekte edilmiş konumlar
      const proj = pts.map((p) => {
        // Y ekseni dönüşü
        let x = p.x * cosA - p.z * sinA;
        let z = p.x * sinA + p.z * cosA;
        // sabit X eğimi
        const y = p.y * Math.cos(egim) - z * Math.sin(egim);
        z = p.y * Math.sin(egim) + z * Math.cos(egim);
        const persp = 1.9 / (2.4 - z); // basit perspektif
        return { sx: cx + x * olcek * persp, sy: cy + y * olcek * persp, z, persp };
      });

      ctx.clearRect(0, 0, w, h);

      // bağlantılar — açık zeminde tk-slate ince çizgiler
      for (const [i, j] of eds) {
        const a = proj[i];
        const b = proj[j];
        const derinlik = (a.z + b.z) / 2; // -1..1
        const op = 0.05 + Math.max(0, derinlik + 0.4) * 0.18;
        ctx.strokeStyle = `rgba(90,100,114,${op.toFixed(3)})`; // tk-slate
        ctx.lineWidth = 0.5 + Math.max(0, derinlik) * 0.7;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      // düğümler (arkadan öne) — ink/slate noktalar, sıcak düğümler tk-red
      const sirali = proj
        .map((p, i) => ({ p, i }))
        .sort((u, v) => u.p.z - v.p.z);
      for (const { p, i } of sirali) {
        const nokta = pts[i];
        const nabiz = azHareket ? 0.7 : 0.5 + 0.5 * Math.sin(t * 0.003 + nokta.faz);
        const derinlik = (p.z + 1) / 2; // 0..1
        const r = (nokta.hot ? 2.6 : 1.6) * p.persp * (0.7 + derinlik * 0.7);
        if (nokta.hot) {
          ctx.shadowBlur = 9 * nabiz;
          ctx.shadowColor = 'rgba(232,25,50,0.5)'; // tk-red glow
          ctx.fillStyle = `rgba(232,25,50,${(0.6 + 0.35 * nabiz).toFixed(3)})`;
        } else {
          ctx.shadowBlur = 0;
          // arkadaki noktalar açık slate, öndekiler koyu ink
          const g = Math.round(150 - derinlik * 110);
          ctx.fillStyle = `rgba(${g},${g + 6},${g + 16},${(0.35 + derinlik * 0.5).toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
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
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
};

export default NeuralCore;
