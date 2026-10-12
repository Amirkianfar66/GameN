// mothership:dev-only
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREW } from '../board-motion/figures/crew.mjs';
import { GESTURES } from '../board-motion/figures/gestures.mjs';
import { wardrobeSvg, OUTFITS } from '../phone-feedback/source/wardrobe.mjs';
import { ICON_NAMES, iconSvg } from '../phone-feedback/source/icons.mjs';
export const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
export const sha = value => createHash('sha256').update(value).digest('hex');
const sourcePaths = ['wardrobe', 'compositions', 'icons', 'compact-layout'].map(name => `design/phone-feedback/source/${name}.mjs`);
const parents = ['body', 'crew', 'parts', 'rig', 'gestures', 'motion'].map(name => `design/board-motion/figures/${name}.mjs`);
export async function planPhoneAssets(repo = root) {
  const files = new Map(), inputs = {};
  for (const path of [...sourcePaths, ...parents, 'design/phone-feedback/contract/tokens.json', 'design/board-motion/assets/manifest.json']) inputs[path] = sha(await readFile(resolve(repo, path)));
  const entries = [];
  for (const [character, crew] of Object.entries(CREW)) for (const outfit of OUTFITS) for (const pose of ['stand', 'standBack']) {
    const path = `design/phone-feedback/assets/${character}-${outfit}-${pose}.svg`;
    const svg = wardrobeSvg(crew, GESTURES[pose], { outfit, prefix: `${character}-${outfit}-${pose}`, inline: false, header: 'Mothership phone-feedback-0.1.0; original editable rig; public-room clothing; no private facts.' });
    files.set(path, svg); entries.push({ id: `${character}-${outfit}-${pose}`, path, sha256: sha(svg), character, outfit, pose, frame: [-90, -40, 300, 300], anchor: [62, 233], audience: 'public', rights: 'Original project vector sources; preserved crew identity', source: sourcePaths[0] });
  }
  for (const name of ICON_NAMES) {
    const path = `design/phone-feedback/assets/icon-${name}.svg`, svg = iconSvg(name).replace('currentColor', '#F3CB3F');
    files.set(path, svg); entries.push({ id: `icon-${name}`, path, sha256: sha(svg), frame: [0, 0, 24, 24], anchor: [12, 12], audience: 'neutral/shared', rights: 'Original project vector linework', source: sourcePaths[2] });
  }
  // One universal private folder: loaded by every seat, no faction/claim-specific URL.
  const privatePath = 'design/phone-feedback/assets/private-folder.svg';
  const folder = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><path d="M24 30H118L139 49H296V199H24Z" fill="#B9C4D3" stroke="#151923" stroke-width="5"/><path d="M42 13H265L281 178H54Z" fill="#F4EBDD" stroke="#151923" stroke-width="4"/><path d="M79 46H232M83 65H214M86 86H236" fill="none" stroke="#55657E" stroke-width="4"/><path d="M17 102H303L280 207H39Z" fill="#162638" stroke="#151923" stroke-width="5"/><path d="M130 118H196V185H130Z M147 132H180M147 144H180M147 157H166" fill="none" stroke="#F3CB3F" stroke-width="4"/></svg>\n';
  files.set(privatePath, folder); entries.push({ id: 'private-folder', path: privatePath, sha256: sha(folder), frame: [0, 0, 320, 220], anchor: [160, 110], audience: 'uniform private bundle', rights: 'Original project vector linework', source: 'design/tools/phone-feedback-assets.mjs' });
  const ports = {};
  for (const path of sourcePaths) {
    const original = await readFile(resolve(repo, path), 'utf8');
    const adapted = original.replace(/^\/\/ mothership:dev-only\n/, '').replaceAll("'../../board-motion/figures/", "'./");
    const target = `design/phone-feedback/ports/${path.split('/').at(-1)}`;
    files.set(target, adapted); ports[path] = { sourceSha256: inputs[path], proposedRuntimePath: `apps/game/hosted/scene-drawing/${path.split('/').at(-1)}`, adaptedPath: target, adaptedSha256: sha(adapted) };
  }
  const manifest = { devOnly: 'mothership:dev-only', version: 'phone-feedback-0.1.0', status: 'Proposed new kit for explicit Integration adoption; no historical pin replacement', baseCommit: 'abb6839524b6dc3e5225e600f2f067c3fa3f9501', referenceSha256: '0fb3f32502ebada8feb676a5fa9bf0476628cfc0ffcc3f8831583f7707f1dab9', sourceHashes: inputs, posesSupported: Object.keys(GESTURES), motionFrames: 'Any original skeleton/blended frame; health marks independent', entries, proposedPorts: ports, privateLoading: 'All shared private assets load uniformly, never based on role, target or claim' };
  files.set('design/phone-feedback/assets/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  return { files, manifest };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { files } = await planPhoneAssets(); let stale = 0;
  for (const [path, value] of files) {
    if (process.argv.includes('--check')) { if ((await readFile(resolve(root, path), 'utf8').catch(() => null)) !== value) { console.log('STALE ' + path); stale++; } }
    else { await mkdir(resolve(root, path, '..'), { recursive: true }); await writeFile(resolve(root, path), value); }
  }
  console.log(`Phone kit: ${files.size} exact files; ${stale} stale`); if (stale) process.exitCode = 1;
}
