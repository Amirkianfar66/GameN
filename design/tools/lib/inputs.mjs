// What a review image or a browser measurement was made from.
//
// One hash over every file that decides what the Designer's pages draw. A render or a
// measurement records it; check-assets.mjs works it out again and refuses a record made
// from something else. That is what "the review images are current" means here.

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const sha256 = content => createHash('sha256').update(content).digest('hex');

const TREES = ['design/prototypes', 'design/exports', 'design/studies', 'design/contract'];
const FILES = ['packages/design-tokens/src/tokens-0.4.0.json'];

export async function reviewInputsSha256(repoRoot) {
  const paths = [...FILES];
  for (const tree of TREES) {
    const entries = await readdir(resolve(repoRoot, tree), { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile()) paths.push(`${entry.parentPath ?? entry.path}/${entry.name}`.replace(`${repoRoot}/`, ''));
    }
  }
  const lines = [];
  for (const path of paths.sort()) lines.push(`${sha256(await readFile(resolve(repoRoot, path)))}  ${path}`);
  return sha256(lines.join('\n'));
}
