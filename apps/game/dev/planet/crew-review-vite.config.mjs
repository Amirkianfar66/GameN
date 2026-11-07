globalThis[Symbol.for('mothership:dev-only')]=true;
// Excluded review build of the native consumer under synthetic authority.
// Validates approved drawing/asset bytes; consumer-inventory approval remains pending.
// The normal hosted and planet configs retain their complete release-inventory guard.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {comicAssetsPlugin} from '../../hosted/comic-assets.mjs';
import {planetLibraryAssetsPlugin} from '../../hosted/build/planet-library-art.mjs';
import {prepareCrewDrawingArt,verifyCrewDrawingPorts} from '../../../../scripts/crew-drawing-art.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
function reviewCrewAssets(){
 const bytes=readFileSync(new URL('../../../../design/releases/design-0.7.0.json',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'5cd0a792c780a937fee6aee918c133567ecdf2a1ef801251d209209c24e49cc0','Reviewed registration manifest changed');
 const manifest=JSON.parse(bytes);assert.equal(verifyCrewDrawingPorts(root),17);
 const files=prepareCrewDrawingArt(root);
 for(const file of files){assert.equal(file.sha256,manifest.bundles[file.name].sha256);assert.equal(file.url,manifest.bundles[file.name].url);assert.ok(!/^:root\s*\{/m.test(file.stylesheet));}
 return {name:'excluded-crew-consumer-review-assets',buildStart(){for(const file of files)this.emitFile({type:'asset',fileName:file.url.slice(1),source:file.stylesheet});}};
}
export default {root:fileURLToPath(new URL('.',import.meta.url)),publicDir:false,plugins:[comicAssetsPlugin(root),planetLibraryAssetsPlugin(root),reviewCrewAssets()],build:{target:'es2022',cssMinify:false,outDir:'/private/tmp/gamen-crew-consumer-review-build',emptyOutDir:true,sourcemap:false}};
