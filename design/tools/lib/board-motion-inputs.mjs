// mothership:dev-only
//
// What the board-motion captures were made from: one hash over every file the prototype draws
// with. design/tools/board-motion-capture.mjs records it; board-motion-check.mjs works it out
// again and refuses captures made before an edit.

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const sha = content => createHash('sha256').update(content).digest('hex');

export async function boardMotionInputsSha256(repoRoot) {
  const paths = ['design/prototypes/css/tokens.css', 'design/prototypes/js/bundles.js', 'design/prototypes/js/asset-index.js', 'design/exports/asset-manifest.json',
    'design/board-motion/index.html', 'design/board-motion/vocabulary.html'];
  for (const sub of ['css', 'js', 'contract', 'assets']) {
    for (const entry of await readdir(resolve(repoRoot, 'design/board-motion', sub), { withFileTypes: true })) if (entry.isFile()) paths.push(`design/board-motion/${sub}/${entry.name}`);
  }
  const lines = [];
  for (const path of paths.sort()) lines.push(`${sha(await readFile(resolve(repoRoot, path)))}  ${path}`);
  return sha(lines.join('\n'));
}
