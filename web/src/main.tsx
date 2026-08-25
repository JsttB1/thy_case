import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './design/tokens.css';
import './design/base.css';

createRoot(document.getElementById('kok')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
