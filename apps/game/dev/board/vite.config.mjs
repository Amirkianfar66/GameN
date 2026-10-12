globalThis[Symbol.for('mothership:dev-only')] = true;
// mothership:dev-only — the board simulation page: the release's screen, host and styles over synthetic views.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'design/exports/asset-manifest.json'), 'utf8'));
// The Designer's ability kit (abilities-0.1.0, PR #102): a proposal outside the reviewed manifest, served
// to this simulation only, and only while its bytes are the ones its own manifest names.
const kit = JSON.parse(readFileSync(resolve(root, 'design/abilities/assets/manifest.json'), 'utf8'));
export default {
  root: fileURLToPath(new URL('./', import.meta.url)), publicDir: false,
  server: { host: '127.0.0.1', port: 5178, strictPort: true, hmr: false, ws: false, fs: { allow: [root] } },
  plugins: [{ name: 'isolated-comic-art', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/art/abilities.art.css') {
        const source = readFileSync(resolve(root, kit.stylesheet.file));
        if (createHash('sha256').update(source).digest('hex') !== kit.stylesheet.sha256) { res.statusCode = 500; res.end('Ability kit hash drift'); return; }
        res.setHeader('content-type', 'text/css');
        res.end(source);
        return;
      }
      const bundle = Object.values(manifest.bundles).find(item => `/art/${item.stylesheet.path.split('/').at(-1)}` === req.url);
      if (!bundle) return next();
      res.setHeader('content-type', 'text/css');
      res.end(readFileSync(resolve(root, bundle.stylesheet.path)));
    });
  } }],
};
