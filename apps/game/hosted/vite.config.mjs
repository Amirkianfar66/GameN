import { fileURLToPath } from 'node:url';
import { comicAssetsPlugin } from './comic-assets.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const allowedSources = ['apps/game/hosted/', 'apps/game/dist/', 'packages/contracts/dist/', 'packages/presentation/dist/', 'packages/design-tokens/dist/'];

export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: false,
  // All Firebase services must register with the client SDK's one app factory.
  // Admin dependencies can otherwise contribute another hoisted @firebase/app.
  resolve: { dedupe: ['@firebase/app'] },
  plugins: [comicAssetsPlugin(repositoryRoot), {
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
  }, {
    name: 'hosted-firebase-app-registry',
    generateBundle(_options, bundle) {
      const modules = new Set(Object.values(bundle).filter(item => item.type === 'chunk').flatMap(chunk => Object.keys(chunk.modules)));
      const registries = [...modules].filter(id => /\/node_modules\/@firebase\/app\/dist\/esm\/index\.esm\.js$/u.test(id));
      if (registries.length !== 1) throw new Error(`Hosted preview requires exactly one Firebase app registry; found ${registries.length}`);
    },
  }],
  build: {
    target: 'es2022',
    // Runtime art is loaded as unprocessed CSS; preserve individual transform resets.
    cssMinify: false,
    outDir: fileURLToPath(new URL('../../../dist/hosted-preview', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
};
