globalThis[Symbol.for('mothership:dev-only')]=true;
import {fileURLToPath} from 'node:url';
import {comicAssetsPlugin} from '../../hosted/comic-assets.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
export default {root:fileURLToPath(new URL('.',import.meta.url)),publicDir:false,plugins:[comicAssetsPlugin(root)],build:{target:'es2022',cssMinify:false,outDir:'/private/tmp/gamen-planet-preview',emptyOutDir:true,sourcemap:false}};
