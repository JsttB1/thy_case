import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // dist/ dosyadan (file://) da açılabilsin
  build: {
    chunkSizeWarningLimit: 900,
  },
});
