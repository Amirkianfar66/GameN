globalThis[Symbol.for('mothership:dev-only')] = true;
// mothership:dev-only — production UI with an explicit local transport substitution.
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const hosted=resolve(root,'apps/game/hosted');
const manifest=JSON.parse(readFileSync(resolve(root,'design/exports/asset-manifest.json'),'utf8'));
export default {
  root:hosted,publicDir:false,resolve:{dedupe:['@firebase/app'],alias:[{find:'./transport-provider.js',replacement:fileURLToPath(new URL('./transport-provider.js',import.meta.url))}]},
  server:{host:'127.0.0.1',port:5174,strictPort:true,hmr:false,ws:false,fs:{allow:[root]}},
  plugins:[{name:'isolated-comic-art',configureServer(server){server.middlewares.use((req,res,next)=>{
    const bundle=Object.values(manifest.bundles).find(item=>'/art/'+item.stylesheet.path.split('/').at(-1)===req.url);
    if(!bundle)return next();
    res.setHeader('content-type','text/css');res.end(readFileSync(resolve(root,bundle.stylesheet.path)));
  });}}],
};
