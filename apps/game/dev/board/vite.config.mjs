globalThis[Symbol.for('mothership:dev-only')] = true;
// mothership:dev-only — the board simulation page: the release's screen, host and styles over synthetic views.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'design/exports/asset-manifest.json'), 'utf8'));
export default {
  root: fileURLToPath(new URL('./', import.meta.url)), publicDir: false,
  server: { host: '127.0.0.1', port: 5178, strictPort: true, hmr: false, ws: false, fs: { allow: [root] } },
  plugins: [{ name: 'isolated-comic-art', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const bundle = Object.values(manifest.bundles).find(item => `/art/${item.stylesheet.path.split('/').at(-1)}` === req.url);
      if (!bundle) return next();
      res.setHeader('content-type', 'text/css');
      res.end(readFileSync(resolve(root, bundle.stylesheet.path)));
    });
  } }],
};
