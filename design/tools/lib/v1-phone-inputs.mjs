// mothership:dev-only
//
// What the phone-first V1 journey captures were made from: one hash over every file the
// prototype draws with. design/tools/v1-phone-capture.mjs records it; v1-phone-check.mjs
// works it out again and refuses captures made before an edit.

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const sha = content => createHash('sha256').update(content).digest('hex');

export async function v1PhoneInputsSha256(repoRoot) {
  const paths = ['design/prototypes/css/tokens.css', 'design/prototypes/js/bundles.js', 'design/prototypes/js/asset-index.js', 'design/exports/asset-manifest.json',
    'design/v1-phone/index.html', 'design/v1-phone/contact.html'];
  for (const sub of ['css', 'js', 'contract']) {
    for (const entry of await readdir(resolve(repoRoot, 'design/v1-phone', sub), { withFileTypes: true })) if (entry.isFile()) paths.push(`design/v1-phone/${sub}/${entry.name}`);
  }
  const lines = [];
  for (const path of paths.sort()) lines.push(`${sha(await readFile(resolve(repoRoot, path)))}  ${path}`);
  return sha(lines.join('\n'));
}
