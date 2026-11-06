globalThis[Symbol.for('mothership:dev-only')]=true;
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {comicAssetsPlugin} from '../../hosted/comic-assets.mjs';
import {planetLibraryAssetsPlugin} from '../../hosted/build/planet-library-art.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
export default {root:fileURLToPath(new URL('.',import.meta.url)),publicDir:false,plugins:[comicAssetsPlugin(root),planetLibraryAssetsPlugin(root)],build:{target:'es2022',cssMinify:false,outDir:resolve(tmpdir(),'gamen-planet-emulator-preview'),emptyOutDir:true,sourcemap:false}};
