import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { ART_BUNDLES } from './art.mjs';
import { readRuntimeArtRelease, assertRuntimeArtBundle } from '../../../scripts/runtime-art-release.mjs';
import { prepareBoardV2Art } from '../../../scripts/board-v2-art-candidate.mjs';
import { prepareSetupArt } from '../../../scripts/setup-art-candidate.mjs';
import { prepareBoardV2MotionArt } from '../../../scripts/board-v2-motion-art.mjs';

// Integration-authorized trial additions. The base reviewed manifest remains separate.
export const TRIAL_ART = Object.freeze({
  sourceCommit: '49f0db4d34d2a2a418f669a13bed660fc665b1b6',
  'scene-art': { manifest: 'board-motion/assets/manifest.json', version: 'board-motion-0.3.0',
    sourceHash: 'bf80c2fd41dad78f2b65b5e643b9e2c3fe05407d2d281b82cf45d6d6c4cf5e20',
    runtimeHash: '0ff8b3c9305e99a2ff3562411ea412910b66d9ba52800858c5fa010ee9b07b29' },
  abilities: { manifest: 'abilities/assets/manifest.json', version: 'abilities-0.7.0',
    sourceHash: '606cab7facc8ad8542e2b7d0ac1ad17ceaae68328aa9fc8f123c4872e7a35b1b',
    runtimeHash: 'f7ff31a86dc6a7315e386648bc5664e29e6390f2018ff14831270532409a2ffd' },
});

/** Port the supplied generated stylesheet; geometry/pictures remain byte-identical. */
export function trialStylesheet(root, name) {
  const pin = TRIAL_ART[name];
  const manifest = JSON.parse(readFileSync(resolve(root, 'design', pin.manifest), 'utf8'));
  if (manifest.manifestVersion !== pin.version || manifest.stylesheet.sha256 !== pin.sourceHash) throw Error('Trial source version drift');
  if (name === 'abilities' && manifest.assets.length !== 49) throw Error('The whole ability kit is required');
  const source = readFileSync(resolve(root, manifest.stylesheet.file), 'utf8');
  if (createHash('sha256').update(source).digest('hex') !== pin.sourceHash) throw Error('Trial source hash drift');
  let runtime = source.replace(/^\/\*[\s\S]*?\*\/\s*/, `/* Mothership owner-authorized unpainted trial; source ${pin.version}; canonical source unchanged. */\n`);
  if (name === 'scene-art') runtime = runtime.replaceAll('board-motion-scenes', 'scene-art');
  if (createHash('sha256').update(runtime).digest('hex') !== pin.runtimeHash) throw Error('Trial runtime derivative drift');
  return runtime;
}

/** Emit the complete reviewed art set uniformly; never select it by private role. */
export function comicAssetsPlugin(root) {
  return {
    name: 'mothership-production-comic-art',
    buildStart() {
      const release = readRuntimeArtRelease(root);
      // Historical sources remain independently verifiable after adding the new art.
      readRuntimeArtRelease(root, 'design-0.3.0');
      const candidate = prepareBoardV2Art(root);
      if (candidate.sha256 !== '5dedbf2450adca159480d3ba448501ce6957595f1a018c5ced4d9d17f5031cd2') throw Error('Board V2 candidate derivative drift');
      assertRuntimeArtBundle(release, 'board-v2-art', candidate.url, candidate.stylesheet);
      this.emitFile({ type: 'asset', fileName: candidate.url.slice(1), source: candidate.stylesheet });
      const setup = prepareSetupArt(root);
      assertRuntimeArtBundle(release, 'setup-art', setup.url, setup.stylesheet);
      this.emitFile({ type: 'asset', fileName: setup.url.slice(1), source: setup.stylesheet });
      const motion = prepareBoardV2MotionArt(root);
      assertRuntimeArtBundle(release, 'board-v2-motion-art', motion.url, motion.stylesheet);
      this.emitFile({ type: 'asset', fileName: motion.url.slice(1), source: motion.stylesheet });
      const manifest = JSON.parse(readFileSync(resolve(root, 'design/exports/asset-manifest.json'), 'utf8'));
      if (manifest.manifestVersion !== 'design-0.2.0') throw new Error('Comic manifest needs integration review');
      for (const [name, url] of Object.entries(ART_BUNDLES)) {
        if (name === 'scene-art' || name === 'abilities') {
          const source = trialStylesheet(root, name);
          assertRuntimeArtBundle(release, name, url, source);
          this.emitFile({ type: 'asset', fileName: url.slice(1), source });
          continue;
        }
        const sheet = manifest.bundles[name].stylesheet;
        if (!sheet.path.startsWith(`design/exports/${name}/`) || basename(sheet.path) !== basename(url)) throw new Error('Comic bundle path drift');
        const source = readFileSync(resolve(root, sheet.path));
        if (createHash('sha256').update(source).digest('hex') !== sheet.sha256) throw new Error('Comic bundle hash drift');
        assertRuntimeArtBundle(release, name, url, source);
        this.emitFile({ type: 'asset', fileName: url.slice(1), source });
      }
    },
  };
}
