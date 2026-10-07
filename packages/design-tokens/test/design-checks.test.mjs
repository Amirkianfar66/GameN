import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

// The design checks are only worth something if they can fail. Each test below copies the
// design files to a scratch directory, makes one mistake the way a person would, and expects
// the export build or check-assets.mjs to refuse it by name. Nothing in the repository is
// touched. The two checks that need a browser have the same kind of proof in
// design/tools/prove-checks.mjs, which is run by hand.

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const scratchRoots = [];
after(() => { for (const path of scratchRoots) rmSync(path, { recursive: true, force: true }); });

function scratchCopy() {
  const root = mkdtempSync(join(tmpdir(), 'mothership-design-checks-'));
  scratchRoots.push(root);
  for (const path of ['design/source', 'design/exports', 'design/studies', 'design/contract', 'design/tools', 'design/prototypes', 'design/explorations', 'packages/design-tokens/src', 'docs/design', 'rules']) {
    cpSync(join(repoRoot, path), join(root, path), { recursive: true });
  }
  // Review images are checked for being listed and existing: empty stand-ins keep the copy small.
  mkdirSync(join(root, 'design/review'), { recursive: true });
  for (const name of readdirSync(join(repoRoot, 'design/review'))) {
    if (name.endsWith('.png')) writeFileSync(join(root, 'design/review', name), '');
    else cpSync(join(repoRoot, 'design/review', name), join(root, 'design/review', name));
  }
  return root;
}
const edit = (root, path, change) => {
  const before = readFileSync(join(root, path), 'utf8');
  const changed = change(before);
  assert.notEqual(changed, before, `the edit to ${path} changed nothing`);
  writeFileSync(join(root, path), changed);
};
const append = (root, path, text) => edit(root, path, before => `${before}\n${text}\n`);
const editJson = (root, path, change) => edit(root, path, text => {
  const value = JSON.parse(text);
  change(value);
  return `${JSON.stringify(value, null, 2)}\n`;
});
const run = (root, script) => new Promise(done => {
  execFile(process.execPath, [join(root, 'design/tools', script)], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
    done({ status: error ? (error.code ?? 1) : 0, output: `${stdout}${stderr}` });
  });
});
/** Rebuild what a person would rebuild after editing a source, then check. */
async function rebuildAndCheck(root, { docs = true } = {}) {
  const build = await run(root, 'build-exports.mjs');
  if (build.status !== 0) return build;
  if (docs) {
    const written = await run(root, 'write-docs.mjs');
    if (written.status !== 0) return written;
  }
  return run(root, 'check-assets.mjs');
}
const refuses = (result, ...patterns) => {
  assert.notEqual(result.status, 0, `the checks passed:\n${result.output}`);
  for (const pattern of patterns) assert.match(result.output, pattern);
};
const RECIPES = 'design/source/export-recipes.json';
const COMIC = 'design/prototypes/css/comic.css';
const CUES = 'design/prototypes/css/cues.css';
const STATES = 'design/contract/component-states.json';
const FX = 'design/source/fx/fx.svg';
const TRAIL = '<g id="fx-ink-trail" fill="#151923">';

test('the design files as committed pass every check', async () => {
  const result = await run(scratchCopy(), 'check-assets.mjs');
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Design checks: 15 passed, 0 failures/);
});

describe('mistakes the export build and the design checks refuse', { concurrency: 6 }, () => {
  // ---------- exports and manifests ----------

  test('an export edited by hand', async () => {
    const root = scratchCopy();
    const file = readdirSync(join(root, 'design/exports/public-board')).find(name => name.startsWith('token-neutral.badge-n1.'));
    edit(root, `design/exports/public-board/${file}`, text => text.replace('#C6CDD4', '#C6CDD5'));
    refuses(await run(root, 'check-assets.mjs'), /exports and studies match their sources: .*differs from what the sources produce/);
  });

  test('a stray file in the exports', async () => {
    const root = scratchCopy();
    writeFileSync(join(root, 'design/exports/public-board/extra.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    refuses(await run(root, 'check-assets.mjs'), /extra\.svg is not produced by any recipe/);
  });

  test('a manifest edited by hand', async () => {
    const root = scratchCopy();
    edit(root, 'design/exports/asset-manifest.json', text => text.replace('"surfaces": ["phone-private"]', '"surfaces": ["table", "phone-private"]'));
    refuses(await run(root, 'check-assets.mjs'), /asset-manifest\.json differs from what the sources produce/);
  });

  test('a bundle stylesheet edited by hand, and one that would fetch a file', async () => {
    const root = scratchCopy();
    const sheet = `design/exports/roles/${readdirSync(join(root, 'design/exports/roles')).find(name => name.endsWith('.css'))}`;
    append(root, sheet, ':root { --ms-asset-device-hacker-spare: url("/exports/roles/device-hacker.spare.svg"); }');
    refuses(await run(root, 'check-assets.mjs'),
      /roles\.art\.\w+\.css differs from what the sources produce/,
      /roles: the stylesheet holds --ms-asset-device-hacker-spare, which is not a variant of this bundle/,
      /roles: the stylesheet would make a request of its own/);
  });

  test('a contract that pins another rule-source manifest, or another asset manifest version', async () => {
    const root = scratchCopy();
    editJson(root, 'design/contract/copy.en.proposed.json', copy => { copy.ruleSourceManifestSha256 = '0'.repeat(64); });
    edit(root, STATES, text => text.replace('"assetManifestVersion": "design-0.2.0"', '"assetManifestVersion": "design-0.0.9"'));
    refuses(await run(root, 'check-assets.mjs'), /a contract file or the study manifest pins a different rule-source manifest/, /component-states\.json names a different asset manifest version/);
  });

  // ---------- the drawing vocabulary ----------

  test('text or a title drawn into an illustration', async () => {
    const root = scratchCopy();
    edit(root, 'design/source/board/board-room-a.svg', text => text.replace('<g id="room-a-frame">', '<g id="room-a-frame"><text x="40" y="60">ROOM A</text>'));
    refuses(await run(root, 'build-exports.mjs'), /<text> is not part of the drawing vocabulary/);
    const second = scratchCopy();
    edit(second, FX, text => text.replace(TRAIL, `${TRAIL}<title>Officer</title>`));
    refuses(await run(second, 'build-exports.mjs'), /<title> is not part of the drawing vocabulary/);
  });

  test('a paint a hex-only palette check would not see: a named color, rgb(), eight-digit hex, a style attribute', async () => {
    for (const [paint, pattern] of [
      ['fill="red"', /fill="red" is not none, a six-digit hex color or a local reference/],
      ['fill="rgb(112, 175, 255)"', /fill="rgb\(112, 175, 255\)" is not none, a six-digit hex color or a local reference/],
      ['fill="#70AFFFFF"', /fill="#70AFFFFF" is not none, a six-digit hex color or a local reference/],
      ['fill="#151923" style="fill: #70AFFF"', /attribute style is not allowed/],
    ]) {
      const root = scratchCopy();
      edit(root, FX, text => text.replace(TRAIL, `<g id="fx-ink-trail" ${paint}>`));
      refuses(await run(root, 'build-exports.mjs'), pattern);
    }
  });

  test('a shape left to default to black, an image, a link out of the file', async () => {
    for (const [replacement, pattern] of [
      ['<g id="fx-ink-trail">', /no fill of its own or from its layer, so it would be drawn in black/],
      [`${TRAIL}<image href="https://example.com/a.png" width="8" height="8"/>`, /<image> is not part of the drawing vocabulary/],
      ['<g id="fx-ink-trail" fill="url(https://example.com/a.svg#p)">', /is not none, a six-digit hex color or a local reference/],
    ]) {
      const root = scratchCopy();
      edit(root, FX, text => text.replace(TRAIL, replacement));
      refuses(await run(root, 'build-exports.mjs'), pattern);
    }
  });

  test('a layer that would inherit its paint from the sheet', async () => {
    const root = scratchCopy();
    edit(root, 'design/source/markers/markers.svg', text => text.replace('<g id="sheet-markers" transform="translate(10 12)">', '<g id="sheet-markers" transform="translate(10 12)" opacity="0.5">'));
    refuses(await run(root, 'build-exports.mjs'), /would inherit opacity/);
  });

  // ---------- palette ----------

  test('a faction color on the public token', async () => {
    const root = scratchCopy();
    edit(root, 'design/source/token/token-neutral.svg', text => text.replace('<circle cx="38" cy="38" r="30" fill="#C6CDD4"', '<circle cx="38" cy="38" r="30" fill="#70AFFF"'));
    refuses(await rebuildAndCheck(root), /token-neutral:badge-blank: #70AFFF is not in the public palette/, /a faction color on an asset that may be drawn publicly/);
  });

  test('amber in a room vignette: amber is interaction focus', async () => {
    const root = scratchCopy();
    edit(root, 'design/source/board/board-room-a.svg', text => text.replace('<rect x="172" y="204" width="22" height="16" rx="2" fill="#F4EBDD"', '<rect x="172" y="204" width="22" height="16" rx="2" fill="#F1B84B"'));
    refuses(await rebuildAndCheck(root), /board-room-a:full: #F1B84B is not in the location-room-a palette/);
  });

  test('a room printed in colors that are not its own token family, and one left in steel', async () => {
    const other = scratchCopy();
    editJson(other, RECIPES, recipes => {
      const jail = recipes.assets.find(asset => asset.id === 'board-jail');
      jail.common.recolor = recipes.assets.find(asset => asset.id === 'board-hospital').common.recolor;
    });
    refuses(await rebuildAndCheck(other, { docs: false }), /board-jail: its recipe does not print it in color\.room\.jail, tone for tone/, /board-jail:full: #1F8A80 is not in the location-jail palette/);
    const steel = scratchCopy();
    editJson(steel, RECIPES, recipes => { delete recipes.assets.find(asset => asset.id === 'board-room-b').common.recolor; });
    refuses(await rebuildAndCheck(steel, { docs: false }), /board-room-b: its recipe does not print it in color\.room\.roomB/, /board-room-b:full: #55657E is not in the location-room-b palette/);
  });

  test('a character drawn in another character\'s color, or in a team accent', async () => {
    const borrowed = scratchCopy();
    edit(borrowed, 'design/source/crew/crew-3.svg', text => text.replaceAll('#AFCF4E', '#45A866'));
    refuses(await rebuildAndCheck(borrowed, { docs: false }), /piece-crew:standee-c3: #45A866 is another character's color/, /piece-crew:standee-c3: does not use #AFCF4E, which color\.crew\.c3 lists/);
    const team = scratchCopy();
    edit(team, 'design/source/crew/crew-1.svg', text => text.replaceAll('#B45A16', '#70AFFF'));
    refuses(await rebuildAndCheck(team, { docs: false }), /piece-crew:standee-c1: #70AFFF is not in the crew palette/, /piece-crew:standee-c1: a faction color on an asset that may be drawn publicly/);
  });

  test('a role\'s device in another team\'s accent', async () => {
    const root = scratchCopy();
    edit(root, 'design/source/devices/device-hacker.svg', text => text.replaceAll('#FF8C8C', '#70AFFF'));
    refuses(await rebuildAndCheck(root, { docs: false }), /device-hacker:held: #70AFFF is not in the private-red palette/);
  });

  test('a color from outside the tokens', async () => {
    const root = scratchCopy();
    edit(root, 'design/source/markers/markers.svg', text => text.replace('fill="#151923" stroke="#151923" stroke-width="2.6" stroke-linejoin="round"/>\n        <path d="M9.2', 'fill="#B00020" stroke="#151923" stroke-width="2.6" stroke-linejoin="round"/>\n        <path d="M9.2'));
    refuses(await rebuildAndCheck(root), /marker-health:healthy-glyph: #B00020 is not in the public palette/);
  });

  // ---------- disclosure through bundles, surfaces and names ----------

  test('a public asset, a variant or a layer named after a role or a private thing', async () => {
    const asset = scratchCopy();
    editJson(asset, RECIPES, recipes => { recipes.assets.find(item => item.id === 'marker-captain').id = 'marker-officer'; });
    edit(asset, RECIPES, text => text.replaceAll('marker-captain:glyph', 'marker-officer:glyph'));
    refuses(await rebuildAndCheck(asset, { docs: false }), /"marker-officer" \(asset id\) carries the private word "officer" outside the role bundle/);

    const variant = scratchCopy();
    editJson(variant, RECIPES, recipes => { recipes.assets.find(item => item.id === 'marker-jail').variants.find(item => item.variant === 'badge').variant = 'blue-badge'; });
    refuses(await rebuildAndCheck(variant, { docs: false }), /"blue-badge" \(variant of marker-jail\) carries the private word "blue"/);

    const layer = scratchCopy();
    edit(layer, 'design/source/markers/markers.svg', text => text.replace('<g id="glyph-captain"', '<g id="glyph-shield"'));
    edit(layer, RECIPES, text => text.replaceAll('#glyph-captain', '#glyph-shield'));
    refuses(await rebuildAndCheck(layer, { docs: false }), /"glyph-shield" \(layer label in [^)]+\) carries the private word "shield"/);
  });

  test('private role art allowed on a public surface', async () => {
    const root = scratchCopy();
    editJson(root, RECIPES, recipes => { recipes.assets.find(asset => asset.id === 'device-officer').surfaces = ['table', 'phone-private']; });
    refuses(await rebuildAndCheck(root), /device-officer:held: may be drawn on table, which its bundle roles does not reach/, /role art may be drawn only inside the private sheet/);
  });

  test('a role\'s device moved into the bundle the table loads', async () => {
    const root = scratchCopy();
    editJson(root, RECIPES, recipes => { recipes.assets.find(asset => asset.id === 'device-alien').bundle = 'public-board'; });
    refuses(await rebuildAndCheck(root, { docs: false }),
      /device-alien:held: a faction color on an asset that may be drawn publicly/,
      /"device-alien" \(asset id\) carries the private word "alien" outside the role bundle/,
      /the role bundle says Alien is produced and holds no such asset/);
  });

  test('private-only art moved into the bundle the table loads', async () => {
    const root = scratchCopy();
    editJson(root, RECIPES, recipes => {
      recipes.assets.find(asset => asset.id === 'pip-resource').bundle = 'public-board';
      const sprite = recipes.sprites.find(item => item.id === 'sprite-player');
      sprite.symbols = sprite.symbols.filter(symbol => !symbol.from.startsWith('pip-resource'));
    });
    refuses(await rebuildAndCheck(root), /pip-resource:available: private-only art in the public bundle/);
  });

  test('a sprite that takes a symbol from another bundle', async () => {
    const root = scratchCopy();
    editJson(root, RECIPES, recipes => { recipes.sprites.find(item => item.id === 'sprite-public').symbols.push({ symbol: 'pip', from: 'pip-resource:available' }); });
    refuses(await run(root, 'build-exports.mjs'), /sprite-public: "pip-resource:available" belongs to the player-ui bundle, not to public-board/);
  });

  test('a role bundle that does not expect the nine roles of the rule source', async () => {
    const root = scratchCopy();
    editJson(root, RECIPES, recipes => { recipes.bundles.roles.expectedRoles = recipes.bundles.roles.expectedRoles.filter(role => role !== 'Alien'); });
    refuses(await rebuildAndCheck(root), /expected roles are not the nine roles/);
  });

  // ---------- the fence around the synthetic studies ----------

  test('an export recipe that reads a study drawing, and a study recipe that reads an asset drawing', async () => {
    const asset = scratchCopy();
    editJson(asset, RECIPES, recipes => {
      recipes.assets.push({ id: 'fx-burst', version: '0.1.0', title: 'Burst', status: 'finished', bundle: 'public-board', source: 'studies/studies.svg', dataSource: 'None.', allowedPalette: 'public', variants: [{ variant: 'ink', viewBox: '0 0 220 220', layers: ['#study-resolved-shot'] }] });
    });
    refuses(await run(asset, 'build-exports.mjs'), /An export recipe may not read from source\/studies\//);
    const study = scratchCopy();
    editJson(study, 'design/source/study-recipes.json', recipes => { recipes.studies[0].variants[0].layers = ['fx/fx.svg#fx-ink-trail']; });
    refuses(await run(study, 'build-exports.mjs'), /A study recipe may read only from source\/studies\//);
  });

  test('a shell page, the review kit or a reference stylesheet that reaches a study', async () => {
    const page = scratchCopy();
    edit(page, 'design/prototypes/shell.html', text => text.replace('<link rel="stylesheet" href="css/cues.css">', '<link rel="stylesheet" href="css/cues.css">\n<link rel="stylesheet" href="css/synthetic.css">'));
    refuses(await run(page, 'check-assets.mjs'), /design\/prototypes\/shell\.html: reaches the synthetic studies through "synthetic\.css"/);
    const kit = scratchCopy();
    edit(kit, 'design/prototypes/js/kit.js', text => text.replace("import { en } from './copy.js';", "import { en } from './copy.js';\nimport { STUDIES } from './study-index.js';"));
    refuses(await run(kit, 'check-assets.mjs'), /design\/prototypes\/js\/kit\.js: reaches the synthetic studies through "study-index"/);
    const sheet = scratchCopy();
    append(sheet, CUES, '.ms-shell [data-cue="status-change"]::after { background: var(--ms-study-resolved-shot) center / contain no-repeat; }');
    refuses(await run(sheet, 'check-assets.mjs'), /design\/prototypes\/css\/cues\.css: reaches the synthetic studies through "--ms-study-"/, /--ms-study-resolved-shot is read by a reference stylesheet and defined nowhere/);
  });

  test('a study put back among the cues, or given a token of its own', async () => {
    const cue = scratchCopy();
    editJson(cue, 'design/contract/motion-cues.json', contract => { contract.cues.push({ ...contract.cues[2], id: 'study-resolved-shot', status: 'synthetic-study', frontendCue: null, audienceTag: 'local' }); });
    refuses(await run(cue, 'check-assets.mjs'), /motion-cues\.json holds something that is not an authorized cue/);
    const token = scratchCopy();
    editJson(token, 'packages/design-tokens/src/tokens-0.4.0.json', tokens => { tokens.motionBeatsMs.publicImpact = { opening: 60, accent: 120, settle: 140 }; });
    refuses(await run(token, 'check-assets.mjs'), /motionBeatsMs\.publicImpact would give the synthetic studies a token of their own/);
  });

  test('a study file without the development-only mark', async () => {
    const root = scratchCopy();
    edit(root, 'design/prototypes/js/study-stages.js', text => text.replace('// mothership:dev-only\n', '//\n'));
    refuses(await run(root, 'check-assets.mjs'), /study-stages\.js: a study file without the development-only mark/);
  });

  // ---------- the fence around explorations ----------

  test('an exploration file without the development-only mark, or a drawing outside the vocabulary', async () => {
    const unmarked = scratchCopy();
    edit(unmarked, 'design/explorations/comic-board/board.css', text => text.replace('mothership:dev-only', 'mothership dev only'));
    refuses(await run(unmarked, 'check-assets.mjs'), /explorations are fenced off[^\n]*comic-board\/board\.css: an exploration file without the development-only mark/);

    // The approved drawings are sources now. A drawing tried in an exploration is still held to the vocabulary.
    const lettered = scratchCopy();
    writeFileSync(join(lettered, 'design/explorations/comic-board/sketch.svg'), '<!-- mothership:dev-only -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text x="4" y="12">Vega</text></svg>\n');
    refuses(await run(lettered, 'check-assets.mjs'), /explorations are fenced off[^\n]*sketch\.svg: <text> is not part of the drawing vocabulary/);

    const nameless = scratchCopy();
    rmSync(join(nameless, 'design/explorations/comic-board/README.md'));
    refuses(await run(nameless, 'check-assets.mjs'), /design\/explorations\/comic-board: an exploration says what it is, and what it is not, in a README\.md/);
  });

  test('a review page, a contract file or a recipe that reaches into an exploration', async () => {
    const page = scratchCopy();
    edit(page, 'design/prototypes/index.html', text => text.replace('</body>', '<a href="../explorations/comic-board/">Comic board</a>\n</body>'));
    refuses(await run(page, 'check-assets.mjs'), /design\/prototypes\/index\.html: reaches into design\/explorations\//);

    const recipe = scratchCopy();
    edit(recipe, RECIPES, text => text.replace('"source": "devices/device-officer.svg"', '"source": "../explorations/comic-board/device-officer.svg"'));
    refuses(await run(recipe, 'build-exports.mjs'), /A recipe reads only drawings under design\/source\/: \.\.\/explorations\/comic-board\/device-officer\.svg/);

    const contract = scratchCopy();
    editJson(contract, 'design/contract/planned-assets.json', planned => { planned.groups[0].items[0].until = 'See explorations/comic-board/art/board-room-b.svg.'; });
    refuses(await run(contract, 'check-assets.mjs'), /design\/contract\/planned-assets\.json: reaches into design\/explorations\//);
  });

  // ---------- the reference stylesheets ----------

  test('art drawn without waiting for its bundle, or waiting for the wrong one', async () => {
    const early = scratchCopy();
    append(early, COMIC, '.ms-shell .ms-zone__name { background-image: var(--ms-asset-pattern-hatch-ink); }');
    refuses(await run(early, 'check-assets.mjs'), /--ms-asset-pattern-hatch-ink is drawn by "\.ms-shell \.ms-zone__name", which does not wait for the public-board bundle/, /is drawn outside @media \(forced-colors: none\)/);
    const wrong = scratchCopy();
    append(wrong, COMIC, '@media (forced-colors: none) { [data-art~="public-board"] .ms-shell .ms-private__panel .ms-pip { background-image: var(--ms-asset-pip-resource-available); } }');
    refuses(await run(wrong, 'check-assets.mjs'), /--ms-asset-pip-resource-available is drawn by .* which does not wait for the player-ui bundle/);
  });

  test('a private picture drawn outside the private sheet, and a phone-only one on the table', async () => {
    const dock = scratchCopy();
    append(dock, COMIC, '@media (forced-colors: none) { [data-art~="player-ui"] .ms-shell .ms-private > .ms-button { background-image: var(--ms-asset-pip-resource-available); } }');
    refuses(await run(dock, 'check-assets.mjs'), /--ms-asset-pip-resource-available is private and ".+" is not inside \.ms-private__panel/);
    const table = scratchCopy();
    append(table, COMIC, '@media (forced-colors: none) { [data-art~="public-board"] .ms-shell--table .ms-zone__name { background-image: var(--ms-asset-marker-self-glyph); } }');
    refuses(await run(table, 'check-assets.mjs'), /--ms-asset-marker-self-glyph may not be drawn on the table display/);
  });

  test('a role\'s device drawn on a playing piece, outside the private sheet', async () => {
    const root = scratchCopy();
    append(root, COMIC, '@media (forced-colors: none) { [data-art~="roles"] .ms-shell .ms-seat > .ms-token::after { content: ""; background-image: var(--ms-asset-device-supplier-held); } }');
    refuses(await run(root, 'check-assets.mjs'), /--ms-asset-device-supplier-held is private and ".+" is not inside \.ms-private__panel/);
  });

  test('the public layer styled by what the private sheet holds, and a selector that knows a role', async () => {
    const leak = scratchCopy();
    append(leak, COMIC, '.ms-private:has(.ms-card__state[data-status="registered"]) > .ms-button { border-style: dotted; }');
    refuses(await run(leak, 'check-assets.mjs'), /styles something outside the private sheet by what is inside it/);
    const role = scratchCopy();
    append(role, COMIC, '.ms-shell[data-role="Officer"] .ms-token { border-style: dotted; }\n.ms-shell .ms-seat--hacker { border-style: dotted; }');
    refuses(await run(role, 'check-assets.mjs'), /"\.ms-shell\[data-role="Officer"\] \.ms-token" is keyed on a role/, /"\.ms-shell \.ms-seat--hacker" is keyed on a role/);
  });

  test('a picture asked for by address, and a property that is not an export', async () => {
    const root = scratchCopy();
    append(root, COMIC, '@media (forced-colors: none) { [data-art~="public-board"] .ms-shell .ms-zone__name { background-image: url("/exports/x.svg"); mask-image: var(--ms-asset-token-neutral-badge-n10); } }');
    refuses(await run(root, 'check-assets.mjs'), /a stylesheet address in "background-image"/, /--ms-asset-token-neutral-badge-n10 is not an export/);
  });

  test('a literal, a named and a functional color, and a system color outside forced colors', async () => {
    const root = scratchCopy();
    append(root, COMIC, '.ms-shell .ms-zone__name { color: #F1B84B; border-color: red; outline-color: rgb(0 0 0 / 50%); background-color: Canvas; }');
    refuses(await run(root, 'check-assets.mjs'), /literal color in "color: #F1B84B"/, /named color in "border-color: red"/, /literal color in "outline-color: rgb\(0 0 0 \/ 50%\)"/, /a system color outside forced colors/);
  });

  test('a looping animation, a hand-written duration, the animation shorthand, an animation in comic.css', async () => {
    const root = scratchCopy();
    append(root, CUES, '.ms-shell .ms-card[data-cue="selection"] { animation: ms-cue-fade 300ms infinite; animation-duration: 300ms; animation-iteration-count: 9999; }');
    append(root, COMIC, '.ms-shell .ms-zone__name { animation-name: ms-cue-fade; }');
    refuses(await run(root, 'check-assets.mjs'), /an animation that repeats/, /the animation shorthand resets the delay/, /duration 300ms is not a motion token/, /comic\.css holds no animation/);
  });

  test('a variable that nothing defines, a proposed token name that nothing reads, the retired data-assets hook', async () => {
    const root = scratchCopy();
    append(root, COMIC, '.ms-shell[data-assets="missing"] .ms-zone__name { padding: var(--ms-space-nine); }');
    edit(root, COMIC, text => text.replaceAll('var(--ms-gutter)', '11px'));
    refuses(await run(root, 'check-assets.mjs'), /--ms-space-nine is read by a reference stylesheet and defined nowhere/, /--ms-gutter is proposed in tokens\.css and read by no reference stylesheet/, /uses the retired data-assets hook/);
  });

  // ---------- contracts ----------

  test('a cue whose duration is not its token value, and a public registration cue', async () => {
    const root = scratchCopy();
    editJson(root, 'design/contract/motion-cues.json', contract => {
      contract.cues.find(cue => cue.id === 'cue-public-move').durationMs = 600;
      contract.cues.find(cue => cue.id === 'cue-registration').audienceTag = 'public';
    });
    refuses(await run(root, 'check-assets.mjs'), /cue-public-move: 600 ms is not the token value 900/, /the registration cue must be private/);
  });

  test('a stylesheet that plays a cue for another time than its contract, and a storyboard of two frames', async () => {
    const sheet = scratchCopy();
    edit(sheet, CUES, text => text.replaceAll('animation-duration: var(--ms-motion-piece-move);', 'animation-duration: var(--ms-motion-move);'));
    refuses(await run(sheet, 'check-assets.mjs'), /cue-public-move: no rule in cues\.css plays \[data-cue="public-move"\] for motionMs\.pieceMove/);
    const frames = scratchCopy();
    editJson(frames, 'design/contract/motion-cues.json', contract => { contract.cues.find(cue => cue.id === 'cue-role-card-turn').storyboardFramesMs = [120, 900]; });
    refuses(await run(frames, 'check-assets.mjs'), /cue-role-card-turn: storyboard frames must be three or more, rising to the full duration/);
  });

  test('a cue that belongs to nothing, a contract that lets any newer view replace a cue, and freshness looser than Frontend\'s', async () => {
    const root = scratchCopy();
    edit(root, 'design/contract/motion-cues.json', text => text
      .replace('"belongsTo": "The place of one seat.",\n', '')
      .replace('It is withdrawn early only when the fact it belongs to changes again, or when the screen stops showing a current match.', 'A newer view replaces it.')
      .replace('"eventLatenessMs": 1000,', '"eventLatenessMs": 9000,')
      .replace('An update that changes no public fact. On a phone', 'On a phone'));
    refuses(await run(root, 'check-assets.mjs'),
      /cue-public-move: no belongsTo/,
      /a rule lets any newer view replace a cue/,
      /freshness\.eventLatenessMs must be positive and no looser than the lateness Frontend's director uses/,
      /freshness\.neverLeavesBecause must say that an update which changes no public fact withdraws no public cue/);
  });

  test('a state with no words, and a state with no source', async () => {
    const root = scratchCopy();
    editJson(root, STATES, contract => {
      const token = contract.components.find(component => component.id === 'seat-token');
      token.states.find(state => state.state === 'injured').words = '';
      delete token.states.find(state => state.state === 'eliminated').when;
    });
    refuses(await run(root, 'check-assets.mjs'), /seat-token:injured: no words/, /seat-token:eliminated: no when/);
  });

  test('a private component on a public surface, and private art listed by a public component', async () => {
    const root = scratchCopy();
    editJson(root, STATES, contract => {
      contract.components.find(component => component.id === 'role-card').surfaces.push('table');
      contract.components.find(component => component.id === 'board-panel').assets.push('pip-resource');
    });
    refuses(await run(root, 'check-assets.mjs'),
      /role-card: a private component is listed on a public surface/,
      /board-panel: is drawn on table, where no variant of pip-resource may be drawn/,
      /board-panel: a public component lists pip-resource, which may be drawn only inside the private sheet/);
  });

  test('a required state that does not exist, and one that nothing draws', async () => {
    const root = scratchCopy();
    editJson(root, STATES, contract => {
      contract.requiredStates.spent = ['action-card:gone', 'resource-pip:spent'];
      contract.requiredStates.selection.push('token-emphasis:selected');
    });
    refuses(await run(root, 'check-assets.mjs'),
      /required state spent: action-card:gone does not exist/,
      /required state spent: resource-pip:spent is a state nothing draws/,
      /required state selection: token-emphasis:selected is a state nothing draws/);
  });

  test('a Shot card contract that is not the pictures the review kit draws, and a spent pip drawn from no field', async () => {
    const contract = scratchCopy();
    editJson(contract, STATES, value => {
      const card = value.components.find(component => component.id === 'action-card');
      card.states = card.states.filter(state => state.state !== 'available-waiting');
      value.requiredStates.idle = value.requiredStates.idle.filter(entry => entry !== 'action-card:available-waiting');
    });
    refuses(await run(contract, 'check-assets.mjs'), /action-card lists .* and the review kit draws .*available-waiting/);
    const kit = scratchCopy();
    edit(kit, 'design/prototypes/js/kit.js', text => text.replace("'was-registered': { status: 'was-registered', step: 'result', needs: null, pip: null }", "'was-registered': { status: 'was-registered', step: 'result', needs: null, pip: 'spent' }"));
    refuses(await run(kit, 'check-assets.mjs'), /a Shot card picture draws the spent pip, which no field authorizes/);
  });

  test('a layout board that asks for a picture of the Shot card that does not exist', async () => {
    const root = scratchCopy();
    edit(root, 'design/contract/layout-callouts.json', text => text.replace('status=confirming', 'status=firing'));
    refuses(await run(root, 'check-assets.mjs'), /layout phone-private: "firing" is not a picture of the Shot card/);
  });

  test('proposed copy that cites a rule source that does not exist, or mentions identification', async () => {
    const root = scratchCopy();
    editJson(root, 'design/contract/copy.en.proposed.json', copy => {
      copy.roleCard.Officer.sources.push('rules/overlays/player-modes-officer.json#/officer/second_shot');
      copy.roleCard.Officer.summary += ' Identify a Red player first.';
    });
    refuses(await run(root, 'check-assets.mjs'), /Officer: rules\/overlays\/player-modes-officer\.json#\/officer\/second_shot does not resolve/, /Officer: the copy mentions the archived identification step/);
  });

  test('a role card on the wrong team, one that states an outcome, a guess that is not the Scan\'s, and a role with no card', async () => {
    const root = scratchCopy();
    editJson(root, 'design/contract/copy.en.proposed.json', copy => {
      copy.roleCard.Alien.team = 'Red team';
      copy.roleCard.Supplier.limit += ' The weapon was blocked.';
      copy.roleCard.Cracker.summary += ' Guess who needs it.';
      delete copy.roleCard.Insider;
    });
    refuses(await run(root, 'check-assets.mjs'),
      /Alien: the card says "Red team", and the rule source puts the role on Independent/,
      /Supplier: the copy states an outcome/,
      /Cracker: the copy mentions the archived identification step/,
      /Insider: no proposed card/);
  });

  test('a crew catalog that gives a character a role, lists a tenth, or names a picture that does not exist', async () => {
    const role = scratchCopy();
    editJson(role, 'design/contract/crew-catalog.json', catalog => { catalog.characters[2].team = 'Blue'; catalog.characters[4].callSign = 'Hacker'; });
    refuses(await run(role, 'check-assets.mjs'), /the crew catalog[^\n]*: a character is given a role, a team or a faction/, /the crew catalog[^\n]*: it names the role Hacker/, /c5: its call sign differs from the proposed copy/);
    const tenth = scratchCopy();
    editJson(tenth, 'design/contract/crew-catalog.json', catalog => {
      catalog.characters.push({ id: 'c10', callSign: 'Zed', standee: 'piece-crew:standee-c10', card: 'piece-crew:card-c10', colors: 'color.crew.c10' });
      catalog.characters[0].standee = 'piece-crew:standee-c2';
    });
    refuses(await run(tenth, 'check-assets.mjs'), /its characters are not the nine of color\.crew, in order/, /a character id is repeated or does not match idPattern/, /c1: standee is piece-crew:standee-c2, not piece-crew:standee-c1/, /c10: the manifest holds no piece-crew:standee-c10/);
  });

  // ---------- tokens ----------

  test('a 0.2.0 token value changed in 0.4.0', async () => {
    const root = scratchCopy();
    editJson(root, 'packages/design-tokens/src/tokens-0.4.0.json', tokens => { tokens.motionMs.publicMove = 600; tokens.color.ink = '#000000'; });
    refuses(await run(root, 'check-assets.mjs'), /tokens\.motionMs\.publicMove: 450 became 600/, /tokens\.color\.ink/);
  });

  test('a 0.3.0 entry changed in 0.4.0 without being listed, and a listed revision that misquotes 0.3.0', async () => {
    const unlisted = scratchCopy();
    editJson(unlisted, 'packages/design-tokens/src/tokens-0.4.0.json', tokens => { tokens.usageConstraints[8] = `${tokens.usageConstraints[8]} Unless it looks better.`; delete tokens.comic.halftone; });
    refuses(await run(unlisted, 'check-assets.mjs'), /tokens\.usageConstraints\[8\]: .* in 0\.3\.0 became .* and is not listed in revisedFrom030/, /tokens\.comic\.halftone: in 0\.3\.0 and removed from 0\.4\.0/);
    const misquoted = scratchCopy();
    editJson(misquoted, 'packages/design-tokens/src/tokens-0.4.0.json', tokens => { tokens.revisedFrom030[0].was = 'Every location shares one palette.'; tokens.revisedFrom030.push({ path: 'color.nothing', was: '#000000', because: 'It never existed.' }); });
    refuses(await run(misquoted, 'check-assets.mjs'), /tokens\.usageConstraints\[7\]: revisedFrom030 says it was something 0\.3\.0 does not hold/, /tokens\.color\.nothing: listed in revisedFrom030 and not an entry of 0\.3\.0/);
  });

  test('a token edit that leaves a stale hash in the lock-update request', async () => {
    const root = scratchCopy();
    editJson(root, 'packages/design-tokens/src/tokens-0.4.0.json', tokens => { tokens.comic.selectionLiftPx = 4; });
    refuses(await rebuildAndCheck(root), /integration-requests\.md does not quote the current SHA-256 of packages\/design-tokens\/src\/tokens-0\.4\.0\.json/);
  });

  // ---------- documents, review images and browser reports ----------

  test('a generated document edited by hand, a missing review image, and an image no render made', async () => {
    const root = scratchCopy();
    edit(root, 'docs/design/asset-inventory.md', text => text.replace('# Asset inventory', '# Asset inventory (edited)'));
    rmSync(join(root, 'design/review/storyboard-cue-registration.png'));
    writeFileSync(join(root, 'design/review/layout-old-board.png'), '');
    refuses(await run(root, 'check-assets.mjs'),
      /docs\/design\/asset-inventory\.md is out of date/,
      /storyboard-cue-registration\.png does not exist/,
      /layout-old-board\.png is not in the review index: a stale image/);
  });

  test('review images and browser reports made before a page, an export or a contract changed', async () => {
    const root = scratchCopy();
    append(root, COMIC, '/* a change after the last render */');
    refuses(await run(root, 'check-assets.mjs'),
      /the review images were rendered from different pages, exports or contracts: run render-review\.mjs/,
      /layout-check\.json was measured on different pages, exports or contracts: run check-layout\.mjs/,
      /shell-check\.json was measured on different pages, exports or contracts: run check-shell\.mjs/);
  });

  test('a browser report that records failures, and a partial run passed off as the whole', async () => {
    const root = scratchCopy();
    editJson(root, 'design/review/shell-check.json', report => { report.failures.push('the public layer differs'); });
    editJson(root, 'design/review/layout-check.json', report => { report.partial = 'only cases matching "table"'; });
    refuses(await run(root, 'check-assets.mjs'), /shell-check\.json records 1 failures/, /layout-check\.json is a partial run/);
  });
});
