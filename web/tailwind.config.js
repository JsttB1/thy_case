/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // DASHBOARD_SPEC bölüm 1.1 — marka paleti
        'tk-red': '#E81932',
        'tk-red-deep': '#C1121F',
        'tk-red-wash': '#FDEEF0',
        'tk-ink': '#1A1D21',
        'tk-slate': '#5A6472',
        'tk-mist': '#F4F6F8',
        'tk-line': '#E3E7EC',
        'tk-white': '#FFFFFF',
        // semantik
        'sig-ok': '#0E8A5F',
        'sig-warn': '#C77700',
        'sig-crit': '#E81932',
        // tk-ink zemin üzerinde okunabilir varyantlar (geri sayım panosu).
        // Taban tonlar koyu zeminde 4.5:1'in altında kalıyor; bunlar 5:1+ veriyor.
        'sig-crit-ink': '#FF4D62',
        'sig-warn-ink': '#F0A22E',
        'sig-ok-ink': '#35C48C',
      },
      fontFamily: {
        // Tek aile: Inter. Sıkışık grotesk (Barlow Condensed) büyük harfte ve
        // büyük sayılarda kötü duruyordu; display ağır ağırlıkla ayrışıyor.
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // spec 1.2 tip skalası: 11 / 12 / 13 / 15 / 18 / 24 / 34 / 52
        '2xs': ['11px', { lineHeight: '14px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['15px', { lineHeight: '22px' }],
        lg: ['18px', { lineHeight: '24px' }],
        xl: ['24px', { lineHeight: '28px' }],
        '2xl': ['34px', { lineHeight: '36px' }],
        '3xl': ['52px', { lineHeight: '52px' }],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(26,29,33,.08), 0 1px 2px rgba(26,29,33,.04)',
        drawer: '-8px 0 32px rgba(26,29,33,.12)',
      },
      maxWidth: {
        shell: '1440px',
      },
      spacing: {
        header: '64px',
        tabbar: '48px',
      },
      transitionDuration: {
        100: '100ms',
        120: '120ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'flip-in': {
          from: { opacity: '0', transform: 'rotateX(-70deg)' },
          to: { opacity: '1', transform: 'rotateX(0deg)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 120ms ease-out both',
        'flip-in': 'flip-in 260ms cubic-bezier(.2,.7,.3,1) both',
        'slide-in-right': 'slide-in-right 180ms cubic-bezier(.2,.7,.3,1) both',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};
