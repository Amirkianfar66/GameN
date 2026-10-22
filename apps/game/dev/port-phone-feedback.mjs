// mothership:dev-only — copy only Integration-reviewed pure Designer derivatives.
globalThis[Symbol.for('mothership:dev-only')] = true;
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const commit = '44c25268a04debaa00d6a7ec3f02d254775704c8';
const sha = value => createHash('sha256').update(value).digest('hex');
const source = path => execFileSync('git', ['show', `${commit}:${path}`], { cwd: root, encoding: 'utf8' });
const manifestPath = 'design/phone-feedback/assets/manifest.json';
const manifestSource = source(manifestPath), manifest = JSON.parse(manifestSource);
const provenance = { sourceCommit: commit, sourceManifest: manifestPath, sourceManifestSha256: sha(manifestSource), ports: {}, tokens: {} };
for (const name of ['wardrobe', 'compact-layout', 'icons']) {
  const path = `design/phone-feedback/source/${name}.mjs`;
  const pin = manifest.proposedPorts[path];
  if (!pin || sha(source(path)) !== pin.sourceSha256) throw new Error(`Designer source drift: ${path}`);
  const port = source(pin.adaptedPath);
  if (sha(port) !== pin.adaptedSha256 || port.includes('mothership:dev-only')) throw new Error(`Designer derivative drift: ${path}`);
  await writeFile(resolve(root, pin.proposedRuntimePath), port);
  provenance.ports[pin.proposedRuntimePath] = { source: path, sourceSha256: pin.sourceSha256, adaptedPath: pin.adaptedPath, sha256: pin.adaptedSha256 };
}
const tokenPath = 'design/phone-feedback/contract/tokens.json', tokenSource = source(tokenPath);
await writeFile(resolve(root, 'apps/game/hosted/phone-feedback-tokens.json'), tokenSource);
provenance.tokens = { source: tokenPath, sourceSha256: sha(tokenSource), path: 'apps/game/hosted/phone-feedback-tokens.json' };
await writeFile(resolve(root, 'docs/frontend/phone-feedback-provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log('Copied three exact Designer ports and token bytes; existing source/port guards unchanged.');
