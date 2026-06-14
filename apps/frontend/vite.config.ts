import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fromRoot('./src'),
      // Resolve workspace packages to source for instant HMR (no rebuild step).
      '@p2p/types': fromRoot('../../packages/types/src/index.ts'),
      '@p2p/utils': fromRoot('../../packages/utils/src/index.ts'),
      '@p2p/shared': fromRoot('../../packages/shared/src/index.ts'),
      '@p2p/ui': fromRoot('../../packages/ui/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    sourcemap: true,
    target: 'es2022',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion-vendor': ['framer-motion'],
          'data-vendor': ['@tanstack/react-query', 'socket.io-client'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
