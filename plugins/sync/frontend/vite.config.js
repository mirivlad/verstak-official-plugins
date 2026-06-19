import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/index.js',
      formats: ['iife'],
      name: 'VerstakSyncPlugin'
    },
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        assetFileNames: '[name][extname]'
      }
    }
  }
});
