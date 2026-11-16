globalThis[Symbol.for('mothership:dev-only')]=true;

import {fileURLToPath} from 'node:url';

export default {
  root: fileURLToPath(new URL('./', import.meta.url)),
  publicDir: false,
  build: {target: 'es2022', sourcemap: false},
};
