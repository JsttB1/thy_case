/**
 * Grafik ortak dili (spec 1.1).
 * Kural: bir grafikte EN FAZLA BİR kırmızı seri. Kırmızı = dikkat, dekorasyon değil.
 * Bu yüzden SERI[0] kırmızı; ikinci seri gerektiğinde SERI_NOTR ile başlanır.
 */
export const SERI = ['#E81932', '#1A1D21', '#5A6472', '#C77700', '#0E8A5F', '#8B94A3'] as const;

/** Kırmızının vurgu olarak saklandığı, çok serili grafikler için nötr sıra. */
export const SERI_NOTR = ['#1A1D21', '#5A6472', '#8B94A3', '#C77700', '#0E8A5F'] as const;

export const IZGARA = '#E3E7EC';
export const EKSEN = '#5A6472';

export const eksenProps = {
  stroke: IZGARA,
  tick: { fill: EKSEN, fontSize: 12 },
  tickLine: false,
} as const;

export const izgaraProps = {
  stroke: IZGARA,
  strokeDasharray: '0',
  vertical: false,
} as const;

/** Recharts tooltip kabuğu — tr-TR biçimleme çağıran tarafta yapılır. */
export const tooltipProps = {
  cursor: { fill: 'rgba(90,100,114,.06)' },
  contentStyle: {
    border: `1px solid ${IZGARA}`,
    borderRadius: 6,
    fontSize: 13,
    padding: '8px 10px',
    boxShadow: '0 1px 3px rgba(26,29,33,.08)',
  },
  labelStyle: { fontWeight: 600, color: '#1A1D21', marginBottom: 4 },
  itemStyle: { padding: 0 },
} as const;

/** Kritiklik → sabit renk. Tüm sekmelerde aynı kategori aynı renkte görünür. */
export const KRITIKLIK_RENK: Record<string, string> = {
  'AOG KRİTİK': '#E81932',
  KRİTİK: '#C77700',
  'KRİTİK DEĞİL': '#8B94A3',
};

export const DURUM_RENK: Record<string, string> = {
  AÇIK: '#E81932',
  DENGEDE: '#5A6472',
  FAZLA: '#C77700',
};
