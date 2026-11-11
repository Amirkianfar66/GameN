// mothership:dev-only
//
// Writes the phone UI pack's reusable icon exports from their source
// (design/phone-ui/prototype/icons.mjs):
//   design/phone-ui/assets/icons.svg    one sprite: <symbol id="ic-<name>"> and "ic-<name>-filled"
//   design/phone-ui/assets/icons.json   each icon's name, accessible label, group and SHA-256 of its symbols
// The icons draw in currentColor; a filled icon's cut-out lines use --ic-knock (the ground behind it).
//
//   node design/tools/phone-ui-assets.mjs            write
//   node design/tools/phone-ui-assets.mjs --check    fail if the files differ from what would be written

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS, ICON_NAMES, ICON_FAMILY_VERSION, iconSprite, iconSvg } from '../phone-ui/prototype/icons.mjs';

const REPO = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = join(REPO, 'design/phone-ui/assets');
const sha = text => createHash('sha256').update(text).digest('hex');

export function phoneUiAssets() {
  const sprite = iconSprite();
  const manifest = {
    schema: 'mothership.phone-ui-icons/1',
    version: ICON_FAMILY_VERSION,
    generatedBy: 'design/tools/phone-ui-assets.mjs',
    source: 'design/phone-ui/prototype/icons.mjs',
    status: 'Designer proposal for the phone interface pack (9 November 2026). Not registered in any art release.',
    provenance: 'Original vector drawings made for Game N by the Visual and Motion Designer (Claude Code). No third-party icon set is used.',
    conventions: {
      grid: '24 × 24, 2 px clear margin, 1.8 px round-capped strokes',
      colour: 'currentColor; a filled icon cuts its inner lines in var(--ic-knock), the colour of the ground behind it',
      forms: 'ic-<name> at rest, ic-<name>-filled when selected',
      meaning: 'An icon never carries meaning alone: its control has words or an accessible name (label below)',
    },
    sprite: { path: 'design/phone-ui/assets/icons.svg', sha256: sha(sprite), bytes: Buffer.byteLength(sprite) },
    icons: ICON_NAMES.map(name => ({ name, label: ICONS[name].label, group: ICONS[name].group, outline: sha(iconSvg(name)), filled: sha(iconSvg(name, { filled: true })) })),
  };
  return { 'icons.svg': sprite, 'icons.json': `${JSON.stringify(manifest, null, 2)}\n` };
}

function main() {
  const files = phoneUiAssets();
  if (process.argv.includes('--check')) {
    const stale = Object.entries(files).filter(([name, text]) => { try { return readFileSync(join(OUT, name), 'utf8') !== text; } catch { return true; } }).map(([name]) => name);
    if (stale.length) { console.error(`Stale phone UI assets: ${stale.join(', ')}. Run node design/tools/phone-ui-assets.mjs`); process.exit(1); }
    console.log(`phone UI assets are current (${ICON_NAMES.length} icons)`);
    return;
  }
  mkdirSync(OUT, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(OUT, name), text);
  console.log(`wrote ${Object.keys(files).length} files, ${ICON_NAMES.length} icons`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
