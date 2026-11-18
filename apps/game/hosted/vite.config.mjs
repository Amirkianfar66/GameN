import { fileURLToPath } from 'node:url';
import { comicAssetsPlugin } from './comic-assets.mjs';
import { planetLibraryAssetsPlugin } from './build/planet-library-art.mjs';
import { crewDrawingAssetsPlugin } from '../../../scripts/crew-drawing-art.mjs';
import { pregameAssetsPlugin } from '../../../scripts/pregame-art-release.mjs';
import { foodSupplyAssetsPlugin } from '../../../scripts/food-supply-art.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
// BEGIN room connection, for Integration's approval (the owner, 15 November 2026: the room view draws
// Designer's room scene as it is). Only the scene's runtime directory and the two shared modules it imports,
// the icon family and the name tags' layout (room-scene-0.5.0); its preview/ and review/ are never imported by
// the game.
const designSources = ['design/phone-ui/components/room-scene/', 'design/phone-ui/components/icons.mjs', 'design/phone-ui/components/tag-layout.mjs'];
// END room connection
// BEGIN shell connection, for Integration's approval (the owner's plan of 16 November 2026, release 2: the
// match's frame is Designer's phone shell as it is). Exactly the shell's three runtime files, the kit's two and the icons' painted form,
// which the shell imports (it uses icons.mjs, admitted above); never its preview/ or review/, nor the kit's.
// phase-bars.mjs (shell 0.2.10) holds the top bar's words for each game step; it imports the shell only.
// icon-paint.mjs (shell 0.3.2, icons 1.1.0; the owner, 18 November 2026) paints the bottom bar's icons as tiles; the
// shell imports it, and it imports icons.mjs only.
const shellSources = ['design/phone-ui/components/phone-shell/phone-shell.mjs', 'design/phone-ui/components/phone-shell/phone-shell.css',
  'design/phone-ui/components/phone-shell/phase-bars.mjs',
  'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css',
  'design/phone-ui/components/icon-paint.mjs'];
// END shell connection
// BEGIN Actions connection, for Integration's approval (the owner's plan of 16 November 2026, release 3: Actions
// on a player's phone is Designer's Actions component as it is). Exactly its two runtime files and the gameplay
// parts' two, which it imports (it uses the kit, admitted above); never their preview/ or review/.
const actionsSources = ['design/phone-ui/components/actions/actions.mjs', 'design/phone-ui/components/actions/actions.css',
  'design/phone-ui/components/play-parts/play-parts.mjs', 'design/phone-ui/components/play-parts/play-parts.css'];
// END Actions connection
// BEGIN Panels connection, for Integration's approval (the owner's plan of 16 November 2026, release 3, step 1, the
// Lead's order of 18 November: the Panels tab is Designer's panels component as it is). Exactly its two runtime files
// (it uses the kit, admitted above); never its preview/ or review/.
const panelsSources = ['design/phone-ui/components/panels/panels.mjs', 'design/phone-ui/components/panels/panels.css'];
// END Panels connection
// BEGIN Promises connection, for Integration's approval (the owner's plan of 16 November 2026, release 3, step 2, the
// Lead's order of 18 November: Promises are Designer's promises component as it is). Exactly its two runtime files
// (it uses the kit, admitted above); never its preview/ or review/.
const promisesSources = ['design/phone-ui/components/promises/promises.mjs', 'design/phone-ui/components/promises/promises.css'];
// END Promises connection
const allowedSources = ['apps/game/hosted/', 'apps/game/dist/', 'packages/contracts/dist/', 'packages/presentation/dist/', 'packages/design-tokens/dist/', ...designSources, ...shellSources, ...actionsSources, ...panelsSources, ...promisesSources];

export default {
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: false,
  // All Firebase services must register with the client SDK's one app factory.
  // Admin dependencies can otherwise contribute another hoisted @firebase/app.
  resolve: { dedupe: ['@firebase/app'] },
  plugins: [comicAssetsPlugin(repositoryRoot), planetLibraryAssetsPlugin(repositoryRoot), crewDrawingAssetsPlugin(repositoryRoot), pregameAssetsPlugin(repositoryRoot), foodSupplyAssetsPlugin(repositoryRoot), {
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
    rollupOptions: { input: {
      game: fileURLToPath(new URL('./index.html', import.meta.url)),
      planet: fileURLToPath(new URL('./planet/index.html', import.meta.url)),
      development: fileURLToPath(new URL('./development/index.html', import.meta.url)),
    } },
    target: 'es2022',
    // Runtime art is loaded as unprocessed CSS; preserve individual transform resets.
    cssMinify: false,
    outDir: fileURLToPath(new URL('../../../dist/hosted-preview', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
};
