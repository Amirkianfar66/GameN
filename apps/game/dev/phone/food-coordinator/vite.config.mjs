globalThis[Symbol.for('mothership:dev-only')]=true;

import {fileURLToPath} from 'node:url';
import {foodPresentationBuild} from '../food-presentation-vite.mjs';

export default {
  root: fileURLToPath(new URL('./', import.meta.url)),
  publicDir: false,
  plugins: [foodPresentationBuild()],
  build: {target: 'es2022', sourcemap: false},
};
