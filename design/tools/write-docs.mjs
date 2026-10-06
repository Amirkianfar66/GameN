// Writes the generated design documents under docs/design/ from the contract files, the
// asset manifest and the study manifest:
//   node design/tools/write-docs.mjs
//   npm run build:docs --workspace @mothership/design-tokens
//
// Run build-exports.mjs first when a source changed: the inventory reads the manifest it plans.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planDocs } from './lib/docs.mjs';
import { planExports, planStudies } from './lib/exports.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const { manifest } = await planExports({ designRoot: resolve(repoRoot, 'design') });
const { manifest: studyManifest } = await planStudies({ designRoot: resolve(repoRoot, 'design') });
const docs = await planDocs({ repoRoot, manifest, studyManifest });
for (const [path, content] of docs) {
  const target = resolve(repoRoot, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
  console.log(`${path} (${content.split('\n').length} lines)`);
}
