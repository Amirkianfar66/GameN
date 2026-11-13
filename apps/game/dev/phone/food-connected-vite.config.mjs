// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {fileURLToPath} from 'node:url';
import base from './food-vite.config.mjs';
// Same native app and loopback authenticated adapter, with the candidate Food
// drawing catalogue. No synthetic packet entry is part of this browser build.
export default {...base,root:fileURLToPath(new URL('./connected/',import.meta.url)),build:{...base.build,
 outDir:'/private/tmp/gamen-food-connected-preview',rollupOptions:{input:fileURLToPath(new URL('./connected/index.html',import.meta.url))}}};
