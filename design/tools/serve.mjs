// mothership:dev-only
//
// Opens the Designer's review pages for a person to look at:
//   node design/tools/serve.mjs            then open the printed address
//
// Everything served is synthetic design material. It is not the game and not a deployment.

import { startStaticServer } from './lib/static-server.mjs';

const port = Number(process.env.PORT ?? 4320);
const server = await startStaticServer({ port });
console.log(`Mothership design review (synthetic, development only): ${server.origin}/prototypes/`);
console.log('Stop with Ctrl+C.');
