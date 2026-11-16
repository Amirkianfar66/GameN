// mothership:dev-only
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const legacy = 'apps/game/hosted/planet/food-presentation.mjs';
const canonical = 'apps/game/hosted/planet/food-canonical-app.mjs';
const components = 'design/phone-ui/components/food/';
const frozen = /^apps\/game\/hosted\/planet\/food(?:-app|-render|-display|-gauge|-geometry|-icons|-ink|-kit|-machine|-pose|-scene|-tags|-ui|-host)?\.(mjs|css)$/;

/** Choose one Food composition for a native review artifact. The runtime entry stays static. */
export function foodPresentationBuild() {
  const designer = process.env.MOTHERSHIP_FOOD_COMPONENT === 'designer';
  return {
    name: 'native-food-presentation',
    enforce: 'pre',
    resolveId(source, importer) {
      if (designer && importer && source.endsWith('/food-presentation.mjs') &&
          resolve(dirname(importer), source) === resolve(root, legacy)) return resolve(root, canonical);
    },
    writeBundle: {
      order: 'post',
      async handler({ dir }, bundle) {
        const modules = [...this.getModuleIds()]
          .filter(id => id.startsWith(root)).map(id => id.slice(root.length)).sort();
        const canonicalModules = modules.filter(path => path.startsWith(components) || path === canonical);
        const frozenModules = modules.filter(path => path === legacy || frozen.test(path));
        const selected = designer ? canonicalModules : frozenModules;
        const excluded = designer ? frozenModules : canonicalModules;
        if (!selected.length || excluded.length) throw new Error('The native harness must bundle only the selected Food presentation');
        if (canonicalModules.some(path => /\/(preview|review)\/|\.json$/.test(path)))
          throw new Error('Food review data entered the runtime graph');
        const css = await Promise.all(Object.keys(bundle).filter(path => path.endsWith('.css')).map(async path => {
          const bytes = await readFile(resolve(dir, path));
          return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
        }));
        await writeFile(resolve(dir, 'food-composition.json'), JSON.stringify({
          composition: designer ? canonical : legacy, canonicalModules, frozenModules, css,
        }, null, 2) + '\n');
      },
    },
  };
}
