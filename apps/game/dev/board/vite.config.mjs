globalThis[Symbol.for('mothership:dev-only')] = true;
// mothership:dev-only — the board simulation page: the release's screen, host and styles over synthetic views.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ART_BUNDLES } from '../../hosted/art.mjs';
import { trialStylesheet } from '../../hosted/comic-assets.mjs';
import { prepareSetupArt } from '../../../../scripts/setup-art-candidate.mjs';
import { prepareBoardV2MotionArt } from '../../../../scripts/board-v2-motion-art.mjs';
import { prepareBoardV2Art } from '../../../../scripts/board-v2-art-candidate.mjs';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'design/exports/asset-manifest.json'), 'utf8'));
export default {
  root: fileURLToPath(new URL('./', import.meta.url)), publicDir: false,
  server: { host: '127.0.0.1', port: 5178, strictPort: true, hmr: false, ws: false, fs: { allow: [root] } },
  plugins: [{ name: 'isolated-comic-art', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      for(const prepare of [prepareBoardV2Art,prepareSetupArt,prepareBoardV2MotionArt]){const art=prepare(root);if(req.url===art.url){res.setHeader('content-type','text/css');res.end(art.stylesheet);return;}}
      const trial = ['abilities', 'scene-art'].find(name => ART_BUNDLES[name] === req.url);
      if (trial) {
        const source = trialStylesheet(root, trial);
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
