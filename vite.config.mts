import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Served from https://showuptoscene98.github.io/killing-for-pie/, so every
 * asset URL needs the repo name prefixed. Port 3000 is pinned because the
 * Electron dev shell and the LAN coop relay both hard-code it.
 */
export default defineConfig({
  base: '/killing-for-pie/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // three + postprocessing dwarf the app code; splitting them lets the
        // browser cache the engine across game deploys.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (id.includes('peerjs') || id.includes('supabase')) return 'net';
          if (id.includes('three') || id.includes('postprocessing')) {
            return 'three';
          }
          if (id.includes('react-dom') || id.includes('scheduler')) {
            return 'react';
          }
          return;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/game/**/*.{js,ts}'],
    },
  },
});
