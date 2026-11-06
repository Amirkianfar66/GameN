// mothership:dev-only
//
// Writes the library groups' art from their sources:
//   node design/tools/library-assets.mjs [--group hack-engineer|navigation|hospital-panel|promises|windows|offices|end] [--check]
// For each group (all of them unless --group names one), in design/library/<group>/assets/:
//   <name>.svg       each picture, standalone, transparent
//   <group css>      every picture as a custom property, as the dossier's abilities.art.css does: a
//                    page draws one only behind its group's [data-art~="..."] hook
//   manifest.json    name, version, size, role, about, SHA-256 and bytes
// --check writes nothing and fails if any file differs from what the source makes.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIBRARY_ART_VERSION, libraryAssets } from '../library/hack-engineer/art.mjs';
import { NAV_ART_VERSION, navigationAssets } from '../library/navigation/art.mjs';
import { PANEL_ART_VERSION, panelAssets } from '../library/hospital-panel/art.mjs';
import { PROMISE_ART_VERSION, promiseAssets } from '../library/promises/art.mjs';
import { WINDOW_ART_VERSION, windowAssets } from '../library/windows/art.mjs';
import { OFFICE_ART_VERSION, officeAssets } from '../library/offices/art.mjs';
import { END_ART_VERSION, endAssets } from '../library/end/art.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const sha256 = text => createHash('sha256').update(text).digest('hex');

/** Each group: its source, its stylesheet, its custom-property prefix and page hook, and who sees it. */
export const GROUPS = Object.freeze({
  'hack-engineer': Object.freeze({
    version: LIBRARY_ART_VERSION, assets: libraryAssets, source: 'design/library/hack-engineer/art.mjs', css: 'library.art.css', prop: '--lib-asset-', hook: 'library',
    audience: 'private: the seat\'s own open private sheet; loaded whole on every player phone whatever the role',
    note: '   PRIVATE art: drawn only inside a seat\'s own open private sheet. Every player phone, once, with the ability art\n'
      + '   (design/abilities/assets/abilities.art.css), before the first match view, whatever the seat\'s role, state or turn.\n',
  }),
  navigation: Object.freeze({
    version: NAV_ART_VERSION, assets: navigationAssets, source: 'design/library/navigation/art.mjs', css: 'navigation.art.css', prop: '--nav-asset-', hook: 'navigation',
    audience: 'office-private (the route instrument, its ship token, courses and tray mark: an office holder\'s own open private sheet) and public (the movement chip); loaded whole on every player phone whatever the role or office',
    note: '   The office panel\'s art is PRIVATE: drawn only inside the Captain\'s or the Officer\'s own open private sheet. The movement\n'
      + '   chip is public. Every player phone, once, with the ability art, before the first match view, whatever the seat\'s role or office.\n',
  }),
  'hospital-panel': Object.freeze({
    version: PANEL_ART_VERSION, assets: panelAssets, source: 'design/library/hospital-panel/art.mjs', css: 'hospital-panel.art.css', prop: '--hp-asset-', hook: 'hospital-panel',
    audience: 'patient-private: a living Hospital patient\'s own open private sheet (any role); loaded whole on every player phone whatever the role or place',
    note: '   PRIVATE art: drawn only inside a Hospital patient\'s own open private sheet. Every player phone, once, with the ability art,\n'
      + '   before the first match view, whatever the seat\'s role, place or health: which art arrives says nothing about who is a patient.\n',
  }),
  promises: Object.freeze({
    version: PROMISE_ART_VERSION, assets: promiseAssets, source: 'design/library/promises/art.mjs', css: 'promises.art.css', prop: '--pr-asset-', hook: 'promises',
    audience: 'pair-private: the giver\'s and the recipient\'s own open private sheets (the composer, the inbox, the ledger); loaded whole on every player phone',
    note: '   PAIR-PRIVATE art: drawn only inside the giver\'s or the recipient\'s own open private sheet. Every player phone, once, with the\n'
      + '   ability art, before the first match view, whatever the seat\'s role or Promises: which art arrives says nothing about who has one.\n',
  }),
  windows: Object.freeze({
    version: WINDOW_ART_VERSION, assets: windowAssets, source: 'design/library/windows/art.mjs', css: 'windows.art.css', prop: '--wn-asset-', hook: 'windows',
    audience: 'the window audience (players at either end of a window), the station-private pad, and the public board\'s station markers; loaded whole on every player phone',
    note: '   The lintels, shade and tray mark are drawn only for players at either end of a window; the pad only at a drawing station; the\n'
      + '   station marker on the public board. Every player phone, once, with the ability art, before the first match view.\n',
  }),
  offices: Object.freeze({
    version: OFFICE_ART_VERSION, assets: officeAssets, source: 'design/library/offices/art.mjs', css: 'offices.art.css', prop: '--of-asset-', hook: 'offices',
    audience: 'public (the Officer and block badges, the board\'s block tape) and office-private tray marks; loaded whole on every player phone',
    note: '   The badges and the block tape are PUBLIC (the board and name tags); the two tray marks only on the Captain\'s or the Officer\'s own\n'
      + '   phone during their windows. Every player phone, once, with the ability art, before the first match view.\n',
  }),
  end: Object.freeze({
    version: END_ART_VERSION, assets: endAssets, source: 'design/library/end/art.mjs', css: 'end.art.css', prop: '--en-asset-', hook: 'end',
    audience: 'public at the end (the side emblems and banners, the Code plate, the flatline) and each screen\'s own recovery marks; loaded whole on every phone and display',
    note: '   The side emblems and banners are the only library pictures in the faction accents: drawn only in FINISHED, when the view\n'
      + '   reveals the sides. Every phone and display, once, with the ability art, before the first match view.\n',
  }),
});

/** An SVG as a CSS url() data URI: comments and the XML declaration dropped, the reserved characters escaped. */
export const dataUri = svg => `url("data:image/svg+xml,${svg.replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '').trim()
  .replace(/"/g, '\'').replace(/%/g, '%25').replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\s+/g, ' ')}")`;

/** The files a group's source makes, by name (group 1 by default). */
export function build(group = 'hack-engineer') {
  const g = GROUPS[group];
  if (!g) throw new Error(`No library group ${group}`);
  const assets = g.assets();
  const files = {};
  for (const [name, { svg }] of Object.entries(assets)) files[`${name}.svg`] = svg;
  files[g.css] = `/* mothership:dev-only · library art proposal ${g.version} · generated by design/tools/library-assets.mjs, do not edit.\n`
    + g.note
    + `   Every picture is a custom property; a page draws one only behind [data-art~="${g.hook}"], set once this file has loaded. */\n`
    + `:root {\n${Object.entries(assets).map(([name, { svg }]) => `  ${g.prop}${name}: ${dataUri(svg)};`).join('\n')}\n}\n`;
  const manifest = {
    version: g.version,
    generatedBy: 'design/tools/library-assets.mjs',
    source: g.source,
    audience: g.audience,
    assets: Object.entries(assets).map(([name, { size, role, about }]) => ({ name, file: `design/library/${group}/assets/${name}.svg`, size, role, about, sha256: sha256(files[`${name}.svg`]), bytes: Buffer.byteLength(files[`${name}.svg`]) })),
    stylesheet: { file: `design/library/${group}/assets/${g.css}`, sha256: sha256(files[g.css]), bytes: Buffer.byteLength(files[g.css]) },
  };
  files['manifest.json'] = `${JSON.stringify(manifest, null, 2)}\n`;
  return files;
}

async function main() {
  const check = process.argv.includes('--check');
  const at = process.argv.indexOf('--group');
  const groups = at > 0 ? [process.argv[at + 1]] : Object.keys(GROUPS);
  const stale = [];
  let count = 0;
  for (const group of groups) {
    const out = resolve(repoRoot, `design/library/${group}/assets`);
    const files = build(group);
    if (!check) await mkdir(out, { recursive: true });
    for (const [name, text] of Object.entries(files)) {
      const path = join(out, name);
      count += 1;
      if (check) {
        const current = await readFile(path, 'utf8').catch(() => null);
        if (current !== text) stale.push(relative(repoRoot, path));
      } else {
        await writeFile(path, text);
      }
    }
  }
  if (check && stale.length) { console.error(`Stale or missing: ${stale.join(', ')}. Run node design/tools/library-assets.mjs`); process.exit(1); }
  console.log(`${check ? 'checked' : 'wrote'} ${count} files in ${groups.map(group => `design/library/${group}/assets`).join(', ')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
