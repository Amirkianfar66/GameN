// mothership:dev-only
//
// Writes the pilot's figures: design/explorations/comic-figures/figures/<character>-<pose>.svg.
//   node design/explorations/comic-figures/build.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canvas } from './rig.mjs';
import { CREW } from './crew.mjs';
import { POSES } from './poses.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const only = process.argv.find(arg => arg.startsWith('--crew='))?.slice(7).split(',') ?? Object.keys(CREW);
await mkdir(resolve(here, 'figures'), { recursive: true });
const written = [];
for (const id of only) {
  for (const [pose, spec] of Object.entries(POSES)) {
    const cv = canvas(`${id}-${pose}`);
    spec.draw(cv, CREW[id]);
    const comment = `${CREW[id].sign} (${id}), ${pose}: ${spec.about}`;
    await writeFile(resolve(here, 'figures', `${id}-${pose}.svg`), cv.svg({ viewBox: spec.viewBox, width: spec.width, height: spec.height, comment }));
    written.push(`${id}-${pose}`);
    // The part laid over the room's prop, at the same size and place, when the pose has one.
    if (cv.hasFront()) {
      await writeFile(resolve(here, 'figures', `${id}-${pose}.front.svg`), cv.svg({ viewBox: spec.viewBox, width: spec.width, height: spec.height, comment: `${comment}. The layer over the prop`, layer: 'front' }));
      written.push(`${id}-${pose}.front`);
    }
  }
}
console.log(`Wrote ${written.length} figures: ${written.join(', ')}`);
