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
// match's frame is Designer's phone shell as it is). Exactly the shell's three runtime files and the kit's two,
// which the shell imports (it uses icons.mjs, admitted above); never its preview/ or review/, nor the kit's.
// phase-bars.mjs (shell 0.2.10) holds the top bar's words for each game step; it imports the shell only.
const shellSources = ['design/phone-ui/components/phone-shell/phone-shell.mjs', 'design/phone-ui/components/phone-shell/phone-shell.css',
  'design/phone-ui/components/phone-shell/phase-bars.mjs',
  'design/phone-ui/components/kit/kit.mjs', 'design/phone-ui/components/kit/kit.css'];
// END shell connection
// BEGIN pre-game connection, for Integration's approval (the owner's plan of 16 November 2026, release 4: before
// the match, the phone draws Designer's pre-game components as they are). Exactly each component's runtime files,
// with the entry screens' shared parts (entry-parts), and the round stamp (#288) the renderer mounts on the shell's
// cover as Round 1 begins (part 9); never a preview/ or review/. The kit, the shell and the icon family are admitted
// above.
const pregameSources = ['main-menu/main-menu.mjs', 'main-menu/main-menu.css', 'entry-parts/entry-parts.mjs', 'entry-parts/entry-parts.css',
  'display-settings/display-settings.mjs', 'display-settings/display-settings.css', 'host-room/host-setup.mjs', 'host-room/host-lobby.mjs', 'host-room/host-room.css',
  'join-room/join-form.mjs', 'join-room/join-wait.mjs', 'join-room/join-room.css', 'recover/recover.mjs', 'recover/recover.css',
  'character-select/character-select.mjs', 'character-select/character-select.css', 'role-stage/role-stage.mjs', 'role-stage/role-card.mjs',
  'role-stage/role-stage.css', 'role-stage/role-card.css', 'boarding-stage/boarding-stage.mjs', 'boarding-stage/boarding-stage.css',
  'round-stamp/round-stamp.mjs', 'round-stamp/round-stamp.css']
  .map(file => `design/phone-ui/components/${file}`);
// END pre-game connection
const allowedSources = ['apps/game/hosted/', 'apps/game/dist/', 'packages/contracts/dist/', 'packages/presentation/dist/', 'packages/design-tokens/dist/', ...designSources, ...shellSources, ...pregameSources];

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
