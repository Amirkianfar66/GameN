// mothership:dev-only
//
// What the phone-kit captures were made from (design/tools/phone-kit-capture.mjs): every file the
// board-motion prototype draws with, the phone kit itself, and the capture tool. A change to any of
// them makes the captures stale (design/tools/phone-kit-check.mjs).

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { boardMotionInputsSha256 } from './board-motion-inputs.mjs';

const sha = content => createHash('sha256').update(content).digest('hex');

export async function phoneKitInputsSha256(repoRoot) {
  const paths = ['design/tools/phone-kit-capture.mjs'];
  for (const entry of await readdir(resolve(repoRoot, 'design/phone-kit'), { withFileTypes: true, recursive: true })) {
    const path = relative(repoRoot, resolve(entry.parentPath ?? entry.path, entry.name)).split('\\').join('/');
    // The captures are made from what the pages draw: not the review itself, the README or the written specification.
    if (entry.isFile() && !path.startsWith('design/phone-kit/review/') && !path.startsWith('design/phone-kit/contract/') && path !== 'design/phone-kit/README.md') paths.push(path);
  }
  const lines = [`${await boardMotionInputsSha256(repoRoot)}  board-motion inputs`];
  for (const path of paths.sort()) lines.push(`${sha(await readFile(resolve(repoRoot, path)))}  ${path}`);
  return sha(lines.join('\n'));
}
