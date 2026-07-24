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

        // ── AI Karar Merkezi (komut merkezi, koyu tema) ──────────────
        // Yüzey ve hatlar; kategorik aksiyon renkleri dataviz validator ile
        // koyu zeminde (surface #0E1420) doğrulandı — 6 kontrol de PASS.
        'cc-bg': '#0A0E17',
        'cc-surface': '#0E1420',
        'cc-panel': '#131B2B',
        'cc-line': '#243044',
        // aksiyon paleti (mark dolgusu) — sıra: exchange→siparis→tamir→transfer
        'ai-red': '#E8455C',
        'ai-cyan': '#1E9FC0',
        'ai-amber': '#BE851F',
        'ai-green': '#1F9E74',
        'ai-slate': '#8892A0',
        // koyu zeminde metin/ikon için parlak varyantlar (dekoratif, glow)
        'ai-red-bright': '#FF5E72',
        'ai-cyan-bright': '#3FD8F5',
        'ai-amber-bright': '#F0A22E',
        'ai-green-bright': '#35C48C',
        'ai-violet': '#8B7BFF',
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
        // ── AI Karar Merkezi hareketleri ──────────────────────────
        'grid-pan': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 44px' },
        },
        'float-y': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(.6)', opacity: '.55' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'ai-rise': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        sheen: {
          '0%': { transform: 'translateX(-120%)' },
          '60%,100%': { transform: 'translateX(220%)' },
        },
        'scan-y': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%,90%': { opacity: '.9' },
          '100%': { transform: 'translateY(1400%)', opacity: '0' },
        },
        blip: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '.25' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 120ms ease-out both',
        'flip-in': 'flip-in 260ms cubic-bezier(.2,.7,.3,1) both',
        'slide-in-right': 'slide-in-right 180ms cubic-bezier(.2,.7,.3,1) both',
        shimmer: 'shimmer 1.4s infinite',
        'grid-pan': 'grid-pan 3s linear infinite',
        'float-y': 'float-y 6s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.4s ease-out infinite',
        'ai-rise': 'ai-rise 460ms cubic-bezier(.2,.7,.3,1) both',
        sheen: 'sheen 5.5s ease-in-out infinite',
        'scan-y': 'scan-y 5s linear infinite',
        blip: 'blip 1.6s ease-in-out infinite',
        'spin-slow': 'spin-slow 26s linear infinite',
      },
    },
  },
  plugins: [],
};
