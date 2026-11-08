// mothership:dev-only
globalThis[Symbol.for('mothership:dev-only')]=true;
import {fileURLToPath} from 'node:url';
import {comicAssetsPlugin} from '../../hosted/comic-assets.mjs';
import {crewDrawingAssetsPlugin} from '../../../../scripts/crew-drawing-art.mjs';
import {planetLibraryAssetsPlugin} from '../../hosted/build/planet-library-art.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
export default {root:fileURLToPath(new URL('.',import.meta.url)),publicDir:false,plugins:[comicAssetsPlugin(root),planetLibraryAssetsPlugin(root),crewDrawingAssetsPlugin(root)],build:{target:'es2022',cssMinify:false,outDir:'/private/tmp/gamen-pregame-preview',emptyOutDir:true,sourcemap:false}};
