/**
 * Chart.js sarmalayıcı — tüm grafikler bu bileşenden geçer.
 *
 * Kütüphane seçimi bilinçli: tek dosyalık sürümdeki 25 grafiğin yapılandırması
 * birebir taşınabiliyor, yani görsel davranış taşıma sırasında değişmiyor.
 * Tema varsayılanları burada bir kez kurulur.
 */
import { useEffect, useRef } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  PieController,
  ScatterController,
  ArcElement,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  Filler,
  Legend,
  Tooltip,
  Title,
  type ChartConfiguration,
} from 'chart.js';
import { C } from '@/design/renkler';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  DoughnutController,
  PieController,
  ScatterController,
  ArcElement,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  Filler,
  Legend,
  Tooltip,
  Title,
);

Chart.defaults.color = C.muted;
Chart.defaults.borderColor = C.lineSoft;
Chart.defaults.font.family =
  "ui-sans-serif,system-ui,-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif";
Chart.defaults.font.size = 11.5;
Chart.defaults.plugins.legend.labels.boxWidth = 11;
Chart.defaults.plugins.legend.labels.boxHeight = 11;
/* Alanlar tek tek atanır: defaults.animation nesnesinin TAMAMI değiştirilirse
   Chart.js'in animasyon tanımlayıcıları (fn/from/to) kaybolur ve tick() patlar. */
Object.assign(Chart.defaults.animation as object, { duration: 520, easing: 'easeOutQuart' });
/* Chart.js varsayılan ipucu kutusu koyu — açık temada ters durur. */
Object.assign(Chart.defaults.plugins.tooltip, {
  backgroundColor: '#FFFFFF',
  titleColor: C.text,
  bodyColor: C.muted,
  borderColor: C.axis,
  borderWidth: 1,
  multiKeyBackground: '#FFFFFF',
  padding: 10,
  cornerRadius: 6,
  displayColors: true,
  boxPadding: 3,
});

interface Props {
  cfg: ChartConfiguration;
  /** yükseklik (px) — grafik kutusunun sabit yüksekliği */
  h?: number;
  /** tıklanan elemanın indeksini verir (etkileşimli grafikler için) */
  onSec?: (i: number, datasetIndex: number) => void;
}

export default function Grafik({ cfg, h = 220, onSec }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chart = useRef<Chart | null>(null);
  const secRef = useRef(onSec);
  secRef.current = onSec;

  useEffect(() => {
    if (!ref.current) return;
    const c = new Chart(ref.current, {
      ...cfg,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...cfg.options,
        onClick: (_e, els) => {
          if (els.length && secRef.current) secRef.current(els[0].index, els[0].datasetIndex);
        },
      },
    });
    chart.current = c;
    return () => c.destroy();
    // cfg her değiştiğinde grafiği yeniden kurmak, canlı senaryo yeniden hesabında
    // en güvenilir yol: Chart.js'in kısmi güncellemesi karışık eksen değişimlerinde şaşırıyor.
  }, [cfg]);

  return (
    <div style={{ height: h, position: 'relative' }}>
      <canvas ref={ref} />
    </div>
  );
}
