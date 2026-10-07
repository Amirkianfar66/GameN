import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { ART_BUNDLES } from './art.mjs';

/** Only the three complete, hashed production bundles cross the asset boundary. */
export function comicAssetsPlugin(root) {
  return {
    name: 'mothership-production-comic-art',
    buildStart() {
      const manifest = JSON.parse(readFileSync(resolve(root, 'design/exports/asset-manifest.json'), 'utf8'));
      if (manifest.manifestVersion !== 'design-0.2.0') throw new Error('Comic manifest needs integration review');
      for (const [name, url] of Object.entries(ART_BUNDLES)) {
        const sheet = manifest.bundles[name].stylesheet;
        if (!sheet.path.startsWith(`design/exports/${name}/`) || basename(sheet.path) !== basename(url)) throw new Error('Comic bundle path drift');
        const source = readFileSync(resolve(root, sheet.path));
        if (createHash('sha256').update(source).digest('hex') !== sheet.sha256) throw new Error('Comic bundle hash drift');
        this.emitFile({ type: 'asset', fileName: url.slice(1), source });
      }
    },
  };
}
