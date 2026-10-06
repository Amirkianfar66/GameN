// mothership:dev-only
//
// Shows that the two browser checks can fail:
//   node design/tools/prove-checks.mjs
//   npm run prove:checks --workspace @mothership/design-tokens
//
// A check that has only ever passed proves little. For each mistake below this copies the
// design to a scratch directory, makes the mistake there the way a person would, runs the
// check and expects it to refuse, in words that name the mistake. The real tree is never
// touched. It needs a Chromium-based browser and takes a few minutes, so it is not part of
// `npm run verify` or of the package's tests.

import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const manifest = JSON.parse(await readFile(resolve(repoRoot, 'design/exports/asset-manifest.json'), 'utf8'));
const officerFile = manifest.assets.find(asset => asset.id === 'card-officer').variants[0].path.replace(/^design/, '');

const replace = (file, find, put) => async root => {
  const path = join(root, file);
  const before = await readFile(path, 'utf8');
  if (!before.includes(find)) throw new Error(`${file} no longer contains the text this mistake edits: ${find.slice(0, 60)}`);
  await writeFile(path, before.replace(find, put));
};
const append = (file, text) => async root => {
  const path = join(root, file);
  await writeFile(path, `${await readFile(path, 'utf8')}\n${text}\n`);
};
const COMIC = 'design/prototypes/css/comic.css';
const KIT = 'design/prototypes/js/kit.js';

const mistakes = [
  {
    name: 'the dealt role\'s picture is fetched as a file when the sheet opens',
    check: 'check-shell.mjs',
    make: replace(KIT, 'const art = () => (look ? h(\'span\', { class: \'ms-role-card__art\', \'aria-hidden\': \'true\' }) : null);', `const art = () => (look ? h('img', { class: 'ms-role-card__art', alt: '', src: '${officerFile}' }) : null);`),
    expect: [/a phone asks for its three bundle stylesheets and nothing else/, /depends on its private state/, /made \d+ new requests/],
  },
  {
    name: 'the dock\'s control is styled by what the sheet holds',
    check: 'check-shell.mjs',
    make: append(COMIC, '.ms-private:has(.ms-card__state[data-status="registered"]) > .ms-button { border-style: dotted; }'),
    expect: [/the public layer differs/],
  },
  {
    name: 'a private picture is drawn on the dock, outside the sheet',
    check: 'check-shell.mjs',
    make: append(COMIC, '@media (forced-colors: none) { [data-art~="player-ui"] .ms-shell .ms-private > .ms-button { background-image: var(--ms-asset-pip-resource-available); } }'),
    expect: [/--ms-asset-pip-resource-available is drawn on phone-public/],
  },
  {
    name: 'a phone-only marker picture is drawn on the table',
    check: 'check-shell.mjs',
    make: append(COMIC, '@media (forced-colors: none) { [data-art~="public-board"] .ms-shell--table .ms-zone__name { background-image: var(--ms-asset-marker-self-glyph); } }'),
    expect: [/--ms-asset-marker-self-glyph is drawn on table/],
  },
  {
    name: 'a bundle is marked as arrived although its request failed',
    check: 'check-shell.mjs',
    make: replace('design/prototypes/js/bundles.js', 'if (await loadStylesheet(href)) arrived.push(name);', 'await loadStylesheet(href); arrived.push(name);'),
    expect: [/data-art is "[^"]+" although nothing arrived/, /a token shows no numeral/],
  },
  {
    name: 'a shell page links the study stylesheet',
    check: 'check-shell.mjs',
    make: replace('design/prototypes/shell.html', '<link rel="stylesheet" href="css/cues.css">', '<link rel="stylesheet" href="css/cues.css">\n<link rel="stylesheet" href="css/synthetic.css">'),
    expect: [/a shell asked for \/prototypes\/css\/synthetic\.css/],
  },
  {
    name: 'roster cells no longer wrap',
    check: 'check-layout.mjs',
    args: ['--match=surface=table&state=D at 1280'],
    make: append(COMIC, '.ms-table th, .ms-table td { white-space: nowrap; overflow-wrap: normal; }'),
    expect: [/the roster (is wider than|table runs past) its panel/],
  },
  {
    name: 'seat names are hidden on the board before the art has arrived',
    check: 'check-layout.mjs',
    args: ['--match=surface=table&state=B&art=none at 1280'],
    make: append(COMIC, '.ms-shell--table .ms-zone .ms-seat__name { font-size: 0; }'),
    expect: [/words hidden without art/],
  },
  {
    name: 'a status chip is cut off by a panel that clips',
    check: 'check-layout.mjs',
    args: ['--match=surface=table&state=B&art=none at 1280'],
    make: append(COMIC, '.ms-shell--table .ms-zone { overflow: hidden; block-size: 9rem; }'),
    expect: [/cut off: /],
  },
  {
    name: 'the phase caption holds the top edge on a short phone at large text',
    check: 'check-layout.mjs',
    args: ['--match=surface=player at 320 x 568, default text 32'],
    make: append(COMIC, '@media (max-height: 30em) { .ms-shell--player .ms-phase { position: sticky; } }\n@media (max-width: 22em) { .ms-shell--player .ms-private--docked > .ms-panel__heading, .ms-shell--player .ms-private--docked > .ms-hint { position: static; inline-size: auto; block-size: auto; clip-path: none; } }'),
    expect: [/leave -?\d+% of the screen height free/],
  },
  {
    name: 'the control that hides the sheet scrolls away with the cards',
    check: 'check-layout.mjs',
    args: ['--match=surface=player&open=1&status=targeting at 360 x 640, default text 16'],
    make: append(COMIC, '.ms-shell--player .ms-private--docked[data-open="true"] > .ms-button { position: static; }'),
    expect: [/the control that opens the private sheet is outside the screen/],
  },
  {
    name: 'a control is smaller than the minimum target',
    check: 'check-layout.mjs',
    args: ['--match=surface=player&open=1&status=confirming at 360 x 760, default text 16'],
    make: append(COMIC, '.ms-shell .ms-button { min-block-size: 30px; padding-block: 0; }'),
    expect: [/controls under 44 px/],
  },
  {
    name: 'the role is written into the page title, outside the sheet',
    check: 'check-layout.mjs',
    args: ['--match=surface=player&open=1&status=available at 360 x 760, default text 16'],
    make: replace(KIT, 'h(\'span\', { class: \'ms-title__prefix\' }, `${en.surface.youAre} `), en.seat.label(viewer));', 'h(\'span\', { class: \'ms-title__prefix\' }, `${en.surface.youAre} `), `${en.seat.label(viewer)}, ${role}`);'),
    expect: [/a role, a team or a role style is outside the private panel/],
  },
  {
    name: 'a token keeps its numeral hidden when the art is missing',
    check: 'check-layout.mjs',
    args: ['--match=surface=player&art=none at 360 x 760, default text 16'],
    make: append(COMIC, '.ms-shell [data-seat] > .ms-token { color: transparent; }'),
    expect: [/token shows no numeral/],
  },
];

const only = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const chosen = mistakes.filter(mistake => only.length === 0 || only.some(part => mistake.name.includes(part)));
let wrong = 0;
for (const mistake of chosen) {
  const root = await mkdtemp(join(tmpdir(), 'mothership-design-prove-'));
  try {
    for (const tree of ['design/prototypes', 'design/exports', 'design/studies', 'design/contract', 'design/tools', 'packages/design-tokens/src', 'rules/overlays']) {
      await cp(resolve(repoRoot, tree), join(root, tree), { recursive: true });
    }
    await mkdir(join(root, 'design/review'), { recursive: true });
    await mistake.make(root);
    const run = spawnSync(process.execPath, [join(root, 'design/tools', mistake.check), ...(mistake.args ?? [])], { encoding: 'utf8' });
    const output = `${run.stdout}\n${run.stderr}`;
    const missing = mistake.expect.filter(pattern => !pattern.test(output));
    if (run.status !== 0 && missing.length === 0) console.log(`refused  ${mistake.check}: ${mistake.name}`);
    else {
      wrong += 1;
      console.error(`NOT REFUSED AS EXPECTED  ${mistake.check}: ${mistake.name}`);
      console.error(`  exit ${run.status}; did not say ${missing.map(String).join(', ') || '(it said everything, but passed)'}`);
      console.error(output.split('\n').filter(Boolean).slice(-6).map(line => `  | ${line.slice(0, 220)}`).join('\n'));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
console.log(`${chosen.length - wrong} of ${chosen.length} mistakes were refused by name`);
if (wrong > 0) process.exitCode = 1;
