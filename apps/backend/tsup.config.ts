import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  clean: true,
  sourcemap: true,
  dts: false,
  // Keep node_modules external; @p2p/types resolves via its built dist.
  skipNodeModulesBundle: true,
});
