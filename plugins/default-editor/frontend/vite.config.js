import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: { entry: 'src/index.js', formats: ['iife'], name: 'VerstakDefaultEditor' },
    rollupOptions: { output: { entryFileNames: 'index.js', assetFileNames: '[name][extname]' } },
  },
});
