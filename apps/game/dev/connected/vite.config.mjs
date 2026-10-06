// mothership:dev-only
//
// Serves the emulator-connected preview. Development only: it serves source files from the
// repository to a browser on this machine and must never be deployed or exposed.
//
// The port is fixed. The local Functions accept requests from http://localhost:5173 and
// http://127.0.0.1:5173 and from no other origin.
import { fileURLToPath } from 'node:url';

globalThis[Symbol.for('mothership:dev-only')] = true;

const here = fileURLToPath(new URL('.', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));

export default {
  root: here,
  // Nothing is written next to the sources.
  cacheDir: fileURLToPath(new URL('../../../../node_modules/.vite-mothership-connected', import.meta.url)),
  // No hot reload: every tab is a device in a running match, and saving a file must not
  // reload all of them. A tab picks up a change when it is reloaded by hand.
  server: { host: '127.0.0.1', port: 5173, strictPort: true, hmr: false, fs: { allow: [repositoryRoot] } },
  // The page is plain modules; nothing here is a production build.
  clearScreen: false,
};
