import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';
import { existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Tek dosya çıktısını anlamlı bir adla bırakır.
 *
 * Teslim edilen şey tek bir dosya olduğu için adı da tek ipucu: "index.html"
 * indirilenler klasöründe kaybolur, "Catalyst.html" kaybolmaz.
 *
 * Yeniden adlandırma `generateBundle` içinde DEĞİL diskte yapılıyor: Vite 8'in
 * paketleyicisi (Rolldown) bundle nesnesine yazmayı yok sayıyor ve dosya
 * tamamen düşüyor (denendi, çıktı klasörü boş kaldı).
 */
function tekDosyaAdi(ad: string): Plugin {
  let cikti = '';
  return {
    name: 'tek-dosya-adi',
    enforce: 'post',
    configResolved(c) {
      cikti = resolve(c.root, c.build.outDir);
    },
    writeBundle() {
      const eski = resolve(cikti, 'index.html');
      if (existsSync(eski)) renameSync(eski, resolve(cikti, ad));
    },
  };
}

/**
 * İki build modu:
 *   vite build                     → normal statik site (dist/, kod bölünmüş, 3D ayrı chunk)
 *   vite build --mode singlefile   → tek dosyalık offline HTML (jüri demosu, çift tıkla açılır)
 *
 * Tek dosya modu, catalyst.html'in "internet gerektirmez" garantisini korur.
 */
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    ...(mode === 'singlefile' ? [viteSingleFile(), tekDosyaAdi('Catalyst.html')] : []),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: mode === 'singlefile' ? 'dist-tek-dosya' : 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions:
      mode === 'singlefile'
        ? {}
        : {
            output: {
              // 3D katmanı ve grafik kütüphanesi ayrı chunk — ilk açılış hafif kalsın
              manualChunks(id: string) {
                if (/node_modules\/(three|@react-three)/.test(id)) return 'three';
                if (/node_modules\/(chart\.js|react-chartjs-2)/.test(id)) return 'charts';
                return null;
              },
            },
          },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
