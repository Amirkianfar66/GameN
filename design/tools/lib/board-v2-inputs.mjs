// mothership:dev-only
//
// What the board-v2 captures were made from: one hash over every file the review page draws
// with. design/tools/board-v2-capture.mjs records it; design/tools/board-v2-check.mjs works it
// out again and refuses captures made before an edit.

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const sha = content => createHash('sha256').update(content).digest('hex');

async function filesUnder(root, dir, { skip = [] } = {}) {
  const found = [];
  for (const entry of await readdir(resolve(root, dir), { withFileTypes: true, recursive: true }).catch(() => [])) {
    if (!entry.isFile()) continue;
    const path = `${entry.parentPath ?? entry.path}/${entry.name}`.replace(`${root}/`, '');
    if (!skip.some(prefix => path.startsWith(prefix))) found.push(path);
  }
  return found;
}

export async function boardV2InputsSha256(root) {
  const paths = [
    // Everything under design/board-v2/ but the captures themselves and the folder's README.
    ...await filesUnder(root, 'design/board-v2', { skip: ['design/board-v2/review/', 'design/board-v2/README.md'] }),
    // The page draws the reviewed rooms, figures and clothes of the board-motion proposal.
    ...await filesUnder(root, 'design/board-motion/figures'),
    ...await filesUnder(root, 'design/board-motion/scenes'),
    ...await filesUnder(root, 'design/board-motion/assets/scenes'),
    'design/tools/board-v2-capture.mjs',
  ];
  const lines = [];
  for (const path of [...new Set(paths)].sort()) lines.push(`${sha(await readFile(resolve(root, path)))}  ${path}`);
  return sha(lines.join('\n'));
}
