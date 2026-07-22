import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fontlar pakete gömülü (Google Fonts CDN'i yok) — demo günü wifi gerekmiyor.
// Latin-ext alt kümesi Türkçe ğ/ş/ı/İ karakterlerini içerir.
// Tek aile: Inter. 700/800 display (başlık, KPI, geri sayım sayıları) için.
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/inter/latin-ext-700.css';
import '@fontsource/inter/latin-ext-800.css';
import '@fontsource/jetbrains-mono/latin-ext-400.css';
import '@fontsource/jetbrains-mono/latin-ext-500.css';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
