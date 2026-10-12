// mothership:dev-only
//
// Builds the phone kit's exports (issue #121; the owner's phone requests of 12 October 2026):
// - every picture of the vote result and of the private Hack, one SVG file each, drawn by
//   design/phone-kit/source/art.mjs (original vector drawing for this repository);
// - the manifest: each file's size, colors, audience and SHA-256; the hash of every source the
//   kit's pages draw with; the shell's color tokens as phone-kit.css declares them; and, for the
//   room clothes (design/board-motion/figures/wardrobe.mjs), the colors and hash of a sheet of the
//   nine characters in every gesture in the Hospital gown and the Jail suit. The board draws its
//   figures live from the rig and public facts and loads no figure art, so the sheets are not kept
//   in the repository: --sheets writes them for an illustrator or a reviewer.
//
//   node design/tools/phone-kit-assets.mjs                 writes design/phone-kit/assets/
//   node design/tools/phone-kit-assets.mjs --check         exits 1 if what is on disk differs
//   node design/tools/phone-kit-assets.mjs --sheets <dir>  writes the wardrobe sheets to <dir>
//
// Nothing here is in the reviewed manifest design-0.2.0, and nothing of it is a game rule. It is a
// versioned proposal (phone-kit-0.1.0, wardrobe-0.1.0) for a later export revision; adopting it is
// an Integration step (docs/design/phone-kit-handoff.md).

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ART_VERSION, HACK_ART, RESULT_ART } from '../phone-kit/source/art.mjs';
import { CREW } from '../board-motion/figures/crew.mjs';
import { FRAME } from '../board-motion/figures/body.mjs';
import { ABOUT, GESTURES, skeletonOf } from '../board-motion/figures/gestures.mjs';
import { OUTFITS, WARDROBE_VERSION, dressedFigureSvg } from '../board-motion/figures/wardrobe.mjs';
import { SCENES } from '../board-motion/scenes/index.mjs';

export const KIT_VERSION = 'phone-kit-0.1.0';
export const BASE = 'abb6839524b6dc3e5225e600f2f067c3fa3f9501';
const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const OUT = 'design/phone-kit/assets';
const sha = content => createHash('sha256').update(content).digest('hex');
const colorsOf = svg => [...new Set([...svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{6})"/g)].map(match => match[1].toUpperCase()))].sort();

/** Every source the kit's pages and exports are drawn from: their hashes are the exports' provenance. */
export const SOURCES = [
  'design/phone-kit/source/art.mjs', 'design/phone-kit/js/vote-result.js', 'design/phone-kit/js/hack.js', 'design/phone-kit/css/phone-kit.css',
  'design/board-motion/figures/wardrobe.mjs', 'design/board-motion/js/dress.js',
];

/** What each picture is for, and who may see it. */
const USE = {
  'vote-ground-gold': ['public', 'The result stage behind a Captain elected or a player released'],
  'vote-ground-steel': ['public', 'The result stage behind a player jailed or a release denied'],
  'vote-ground-paper': ['public', 'The result stage behind a tie or no selection'],
  'vote-captain-star': ['public', 'The Captain\'s star that lands at the elected player\'s shoulder'],
  'vote-cell-bars': ['public', 'The cell\'s bars that drop in front of a jailed player (or one not released)'],
  'vote-cell-bars-open': ['public', 'The bars bent open in front of a released player'],
  'vote-stamp-frame': ['public', 'A stamp frame in steel (spare; not drawn by the prototype)'],
  'vote-stamp-frame-gold': ['public', 'A stamp frame in gold (spare; not drawn by the prototype)'],
  'vote-tie-burst': ['public', 'The burst between tied players'],
  'vote-empty-chair': ['public', 'The empty Captain\'s chair: nobody elected'],
  'vote-empty-cell': ['public', 'The empty cell: nobody sent to Jail'],
  'hack-side-blue': ['hack-participant', 'The Blue side card: a declared side, never a verified one'],
  'hack-side-red': ['hack-participant', 'The Red side card: a declared side, never a verified one'],
  'hack-side-alien': ['hack-participant', 'The Alien side card: a declared side, never a verified one'],
  'hack-side-none': ['hack-participant', 'The blank card: no side declared'],
  'hack-claim-tail': ['hack-participant', 'The tail of the balloon a claim is said in'],
  'hack-waiting-dots': ['hack-participant', 'Waiting on the target\'s declaration'],
};

function artFile(name, draw) {
  const body = draw();
  const viewBox = /viewBox="([^"]+)"/.exec(body)?.[1] ?? '';
  const [audience, use] = USE[name] ?? ['public', ''];
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Mothership · phone kit ${KIT_VERSION} (art ${ART_VERSION}) · ${name} · generated, do not edit by hand
  ${use}. Audience: ${audience === 'public' ? 'every screen' : 'the two Hack participants only, in their own private view'}.
  Drawn by design/phone-kit/source/art.mjs (original vector drawing for this repository by the Visual and Motion Designer,
  Claude Code) through design/tools/phone-kit-assets.mjs. No word is in the picture: every word is the page's own text.
  Not in the reviewed manifest design-0.2.0.
-->
${body.replace(/ aria-hidden="true" focusable="false"/, '')}
`;
  return { svg, entry: { id: `phone-kit.${name}`, file: `art/${name}.svg`, viewBox, audience, use, colors: colorsOf(svg), bytes: Buffer.byteLength(svg), sha256: sha(svg) } };
}

/** Where each room's places stand, and how they fall: the clothes are drawn in every one. */
const ROOM_GESTURES = room => SCENES[room].slots.flatMap(place => [place.gesture, `${place.gesture}+injured`, place.down ?? 'down']);

/** One character in one gesture in an outfit: its body and its front layer, as SVG markup without the outer element. */
function dressedDocument(id, gesture, outfit) {
  const prefix = `${id}-${outfit}-${gesture.replace('+', '-')}`;
  const sk = skeletonOf(gesture);
  const inner = svg => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const body = inner(dressedFigureSvg(CREW[id], sk, { outfit, prefix, layer: 'body' }));
  const front = inner(dressedFigureSvg(CREW[id], sk, { outfit, prefix, layer: 'front' })).replace(/^<defs>[\s\S]*?<\/defs>/, '');
  return { body, front };
}

export function planSheets() {
  const files = new Map(), entries = [];
  const [x, y, w, h] = FRAME.box;
  const ids = Object.keys(CREW);
  const plan = { gown: [...Object.keys(GESTURES), ...ROOM_GESTURES('hospital')], prison: [...Object.keys(GESTURES), ...ROOM_GESTURES('jail')] };
  for (const outfit of OUTFITS.filter(name => name !== 'crew')) {
    for (const gesture of [...new Set(plan[outfit])]) {
      const cells = ids.map((id, index) => { const { body, front } = dressedDocument(id, gesture, outfit); return `  <g id="${id}" transform="translate(${index * w} 0)">${body}<g id="${id}-front">${front}</g></g>`; });
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Mothership · room clothes ${WARDROBE_VERSION} · ${outfit} · ${gesture} · generated, do not edit by hand
  ${ABOUT[gesture.split('+')[0]] ?? gesture}${gesture.includes('+injured') ? ' (Injured: the bandage)' : gesture.includes('+still') ? ' (Eliminated)' : ''}
  The nine characters, left to right ${ids.join(', ')}, in the shared figure frame (${FRAME.box.join(' ')}), each group "<id>-front"
  what lies over its place's prop. Drawn by design/board-motion/figures/wardrobe.mjs over the rig (rig.mjs, crew.mjs, parts.mjs,
  body.mjs, gestures.mjs) through design/tools/phone-kit-assets.mjs; the prototype draws the same live. Not in design-0.2.0.
-->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w * ids.length} ${h}" width="${w * ids.length}" height="${h}">
${cells.join('\n')}
</svg>
`;
      const file = `${outfit}/${gesture}.svg`;
      files.set(file, svg);
      entries.push({ id: `wardrobe.${outfit}.${gesture}`, sheet: file, outfit, gesture, characters: ids, frame: FRAME.box.join(' '), colors: colorsOf(svg), bytes: Buffer.byteLength(svg), sha256: sha(svg), audience: 'public', drawnLive: true });
    }
  }
  return { files, entries };
}

/** The shell's color tokens, as phone-kit.css declares them on :root. */
async function tokensOf(root) {
  const css = await readFile(resolve(root, 'design/phone-kit/css/phone-kit.css'), 'utf8');
  const block = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  return Object.fromEntries([...block.matchAll(/(--pk-[\w-]+)\s*:\s*([^;]+);/g)].map(match => [match[1], match[2].trim().replace(/\s+/g, ' ')]));
}

export async function planAssets(root = repoRoot) {
  const files = new Map();
  const art = [];
  for (const [name, draw] of Object.entries({ ...RESULT_ART, ...HACK_ART })) {
    const { svg, entry } = artFile(name, draw);
    files.set(entry.file, svg);
    art.push(entry);
  }
  const sheets = planSheets();
  const sources = {};
  for (const path of SOURCES) sources[path] = sha(await readFile(resolve(root, path)));
  const manifest = {
    devOnly: 'mothership:dev-only',
    version: KIT_VERSION,
    artVersion: ART_VERSION,
    wardrobeVersion: WARDROBE_VERSION,
    status: 'Proposal for issue #121. Not in the reviewed manifest design-0.2.0; adopting it is an Integration step (docs/design/phone-kit-handoff.md).',
    base: BASE,
    provenance: 'Original vector drawing and code made for this repository by the Visual and Motion Designer (Claude Code). No third-party or traced artwork.',
    contract: 'design/phone-kit/contract/phone-kit.json',
    sources,
    tokens: await tokensOf(root),
    art,
    wardrobe: {
      rule: 'outfitFor(location): Hospital -> gown, Jail -> prison, anything else -> crew. Public location only: never health, jailed, Captain, Eliminated, a role or a side.',
      outfits: OUTFITS,
      crew: 'Byte for byte body.mjs figureSvg (checked by design/tools/phone-kit-check.mjs).',
      sheets: sheets.entries,
      sheetsWrittenOnRequest: 'node design/tools/phone-kit-assets.mjs --sheets <dir>',
    },
  };
  files.set('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return { files, sheets: sheets.files, manifest };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { files, sheets } = await planAssets();
  const at = process.argv.indexOf('--sheets');
  if (at > 0) {
    const dir = resolve(process.argv[at + 1] ?? '.');
    for (const [file, svg] of sheets) { await mkdir(resolve(dir, file, '..'), { recursive: true }); await writeFile(resolve(dir, file), svg); }
    console.log(`Wrote ${sheets.size} wardrobe sheets to ${dir}`);
  } else if (process.argv.includes('--check')) {
    const problems = [];
    for (const [file, content] of files) {
      const disk = await readFile(resolve(repoRoot, OUT, file), 'utf8').catch(() => null);
      if (disk !== content) problems.push(`${OUT}/${file} differs from what its sources draw`);
    }
    const present = (await readdir(resolve(repoRoot, OUT, 'art')).catch(() => [])).map(name => `art/${name}`);
    for (const file of present) if (!files.has(file)) problems.push(`${OUT}/${file} is not drawn by any source`);
    for (const problem of problems) console.error(problem);
    console.log(problems.length ? `phone-kit assets: ${problems.length} problem(s)` : `phone-kit assets: ${files.size} files match their sources`);
    process.exit(problems.length ? 1 : 0);
  } else {
    await rm(resolve(repoRoot, OUT), { recursive: true, force: true });
    for (const [file, content] of files) { await mkdir(resolve(repoRoot, OUT, file, '..'), { recursive: true }); await writeFile(resolve(repoRoot, OUT, file), content); }
    console.log(`Wrote ${files.size} files to ${OUT}`);
  }
}
