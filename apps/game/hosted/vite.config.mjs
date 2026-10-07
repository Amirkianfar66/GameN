import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const allowedSources = ['apps/game/hosted/', 'apps/game/dist/', 'packages/contracts/dist/', 'packages/presentation/dist/', 'packages/design-tokens/dist/'];

export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: false,
  plugins: [{
    name: 'hosted-preview-source-boundary',
    transform(_code, id) {
      const path = id.split('?')[0];
      if (!path.startsWith(repositoryRoot) || path.includes('/node_modules/')) return;
      const local = path.slice(repositoryRoot.length);
      if (local === 'apps/game/src/styles/shell.css') return;
      if (!allowedSources.some(prefix => local.startsWith(prefix))
        || /(?:^|\/)(?:dev|test|tests|fixtures|reference)(?:\/|\.)/.test(local)
        || local.endsWith('/browser/firebase-transport.js')) {
        throw new Error(`Non-hosted source entered the preview bundle: ${local}`);
      }
    },
  }],
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../../../dist/hosted-preview', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
};
