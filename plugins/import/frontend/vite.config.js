import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.js',
      formats: ['iife'],
      name: 'VerstakImportPlugin',
      // Vite 6+ names lib CSS after the package; plugin.json points at style.css.
      cssFileName: 'style',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        assetFileNames: '[name][extname]',
      },
    },
  },
});
