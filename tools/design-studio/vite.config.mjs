import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/development/design-studio/',
  plugins: [react(), {
    name: 'private-studio-data-boundary',
    transform(_code, id) {
      if (id.includes('/node_modules/')) return;
      if (/\/(data|server)\//.test(id)) throw Error('Private Studio data must be served through the authenticated API.');
    },
  }],
  server: { proxy: { '/development/design-studio/api': 'http://127.0.0.1:4328' } },
  build: { target: 'es2022', sourcemap: false, outDir: 'dist/client' },
});
