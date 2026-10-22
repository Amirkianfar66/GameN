// mothership:dev-only
//
// The inputs the ability-art review pictures are made from (design/tools/abilities-capture.mjs):
// a change to any of them makes the pictures stale (design/tools/abilities-check.mjs).

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const ROOT = 'design/abilities';

async function filesUnder(root, dir) {
  const found = [];
  for (const entry of await readdir(resolve(root, dir), { withFileTypes: true, recursive: true }).catch(() => [])) {
    if (entry.isFile()) found.push(relative(root, resolve(entry.parentPath ?? entry.path, entry.name)).split('\\').join('/'));
  }
  return found.sort();
}

export async function abilitiesInputsSha256(root = repoRoot) {
  const hash = createHash('sha256');
  const paths = [
    ...(await filesUnder(root, `${ROOT}/source`)), ...(await filesUnder(root, `${ROOT}/assets`)), ...(await filesUnder(root, `${ROOT}/js`)), ...(await filesUnder(root, `${ROOT}/css`)),
    `${ROOT}/contact.html`, 'design/board-motion/js/app.js', 'design/board-motion/js/fixtures.js', 'design/board-motion/js/copy.js', 'design/board-motion/js/board.js',
    'design/board-motion/css/board.css', 'design/board-motion/index.html', 'design/tools/abilities-capture.mjs',
    // The board-motion page the ability art is captured on also draws the phone kit and the room clothes (issue #121).
    'design/board-motion/js/director.js', 'design/board-motion/js/dress.js', 'design/board-motion/figures/wardrobe.mjs',
    ...(await filesUnder(root, 'design/phone-kit/css')), ...(await filesUnder(root, 'design/phone-kit/js')), ...(await filesUnder(root, 'design/phone-kit/source')),
  ];
  for (const path of paths) hash.update(`${path}\n`).update(await readFile(resolve(root, path)).catch(() => Buffer.from('missing')));
  return hash.digest('hex');
}
