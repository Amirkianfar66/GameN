// mothership:dev-only
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The check of the board-motion prototype (issue #87) is only worth something if it can fail.
// Each test copies what the check reads to a scratch directory, makes one mistake the way a
// person would, and expects design/tools/board-motion-check.mjs to refuse it by name. Nothing
// in the repository is touched. The browser measurements (board-motion-capture.mjs) and the
// clicked flows (board-motion-flows.mjs) are not proven here; their results are recorded in
// docs/design/board-motion-verification.md. The release's words are read from the built
// @mothership/presentation: run `npm run build` first.

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const { RELEASE_TEXT } = await import(pathToFileURL(join(repoRoot, 'design/board-motion/js/copy.js')).href);
const RELEASE_FILES = [...new Set(Object.values(RELEASE_TEXT).map(([path]) => path))];
const BUILT_COPY = 'packages/presentation/dist/copy/en.js';
const scratchRoots = [];
after(() => { for (const path of scratchRoots) rmSync(path, { recursive: true, force: true }); });

function scratchCopy() {
  assert.ok(existsSync(join(repoRoot, BUILT_COPY)), `${BUILT_COPY} is missing: run npm run build first`);
  const root = mkdtempSync(join(tmpdir(), 'mothership-board-motion-check-'));
  scratchRoots.push(root);
  for (const path of ['design/tools', 'design/prototypes', 'design/exports', 'design/contract', 'design/source', 'docs/design', 'packages/design-tokens/src',
    'packages/presentation/src/model/actions.ts', 'packages/presentation/src/markup/comic-shell.ts', 'packages/contracts/src/full-game.ts', 'apps/game/hosted', BUILT_COPY, ...RELEASE_FILES]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(repoRoot, path), join(root, path), { recursive: true });
  }
  // The captures are checked for being listed, present and current: empty stand-ins keep the copy small.
  cpSync(join(repoRoot, 'design/board-motion'), join(root, 'design/board-motion'), { recursive: true, filter: source => !source.includes('/review/') });
  for (const entry of readdirSync(join(repoRoot, 'design/board-motion/review'), { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name).slice(repoRoot.length);
    mkdirSync(dirname(join(root, path)), { recursive: true });
    if (entry.name.endsWith('.png')) writeFileSync(join(root, path), '');
    else cpSync(join(repoRoot, path), join(root, path));
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
const write = (root, path, text) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
const check = root => new Promise(done => {
  execFile(process.execPath, [join(root, 'design/tools/board-motion-check.mjs')], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
    done({ status: error ? (error.code ?? 1) : 0, output: `${stdout}${stderr}` });
  });
});
const refuses = (result, ...patterns) => {
  assert.notEqual(result.status, 0, `the check passed:\n${result.output}`);
  for (const pattern of patterns) assert.match(result.output, pattern);
};
const CSS = 'design/board-motion/css/board.css';
const FIXTURES = 'design/board-motion/js/fixtures.js';
const COPY = 'design/board-motion/js/copy.js';
const CUES = 'design/board-motion/contract/cues.json';
const COVERAGE = 'design/board-motion/contract/coverage.json';
const STATIONS = 'design/board-motion/contract/stations.json';

test('the board-motion prototype as committed passes its check', async () => {
  const result = await check(scratchCopy());
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Board-motion checks: 12 passed, 0 failures/);
});

test('a prototype module that no longer loads is refused by name, not a crash', async () => {
  const root = scratchCopy();
  append(root, 'design/board-motion/js/layout.js', "import { missing } from './no-such-module.js';");
  refuses(await check(root), /the prototype's modules load: design\/board-motion\/js\/ does not load in Node: Cannot find module/);
});

describe('mistakes the board-motion check refuses', { concurrency: 6 }, () => {
  // ---------- secrets in the stylesheet ----------

  test('a private cue drawn on every board, a character with a rule of its own, and a team hook on the public board', async () => {
    const root = scratchCopy();
    append(root, CSS, [
      '.bm-piece[data-target="eligible"] .bm-piece__ring { border: 2px solid var(--ms-color-caption); }',
      '.bm-piece[data-character="c3"] .bm-piece__art { transform: scale(1.1); }',
      '.bm-board [data-team="red"] { outline: 2px solid var(--ms-color-accent); }',
      '[data-art~="roles"] .bm-piece__art { background-image: var(--ms-asset-device-hacker); }',
    ].join('\n'));
    refuses(await check(root), /\.bm-piece\[data-target="eligible"\] \.bm-piece__ring: a private cue drawn outside the viewer's own board/,
      /\.bm-piece\[data-character="c3"\] \.bm-piece__art: a character with a rule of its own/, /\[data-team="red"\]: a role or team hook outside the private card/,
      /\.bm-piece__art: a role's device outside the private card/);
  });

  test('colors that are not tokens, art before its bundle, and a prop layer before it loads', async () => {
    const root = scratchCopy();
    append(root, CSS, '.bm-btn { color: #c00; }\n.bm-notice { border-color: rgb(200 0 0); }\n.bm-chip { background: red; }\n.bm-stage { background-image: var(--ms-asset-board-jail-full); }\n.bm-prop { background-image: var(--bm-asset-hospital-prop-bed); }');
    refuses(await check(root), /\.bm-btn: a literal hex color/, /\.bm-notice: a functional color/, /\.bm-chip: a named color/,
      /\.bm-stage: draws art without waiting for its bundle/, /\.bm-prop: draws a prop layer without waiting for it/);
  });

  test('a repeating animation, a duration that is not a token, reduced motion that no longer stops motion, and a cue layer that takes taps', async () => {
    const root = scratchCopy();
    append(root, CSS, '.bm-chip { animation: bm-fade var(--bm-motion-pick) infinite; }\n.bm-tray { animation: bm-rise 300ms ease; }');
    edit(root, CSS, text => text.replace(/(\[data-motion="reduced"\][^{]*\*[^{]*\{[^}]*?)animation:\s*none\s*!important/, '$1animation-duration: 1ms !important')
      .replaceAll('@media (prefers-reduced-motion: reduce)', '@media (min-resolution: 9dppx)')
      .replace(/(\.bm-fx \{[^}]*?)pointer-events: none;/, '$1'));
    refuses(await check(root), /\.bm-chip: an animation that repeats/, /\.bm-tray: a duration that is not a token/, /no reduced-motion rule that stops every animation/,
      /the device reduced-motion setting is not honored/, /the cue layer can take a tap/);
  });

  // ---------- the cue contract ----------

  test('a cue whose time is not its token, a public cue resting on a private fact, a cue with a sound, and an orphan cue', async () => {
    const root = scratchCopy();
    editJson(root, CUES, cues => {
      cues.cues.find(cue => cue.id === 'cue-public-move').durationMs = 600;
      cues.cues.find(cue => cue.id === 'cue-tally').facts += ' Drawn from legalTargets.';
      cues.cues.find(cue => cue.id === 'cue-registration').asset = 'A short chime sound.';
      cues.cues.push({ ...cues.cues.find(cue => cue.id === 'cue-unknown'), id: 'cue-orphan' });
    });
    refuses(await check(root), /cue-public-move: motionMs\.pieceMove is 900 ms in tokens 0\.4\.0, not 600/, /cue-tally: a public cue rests on a private fact/,
      /cue-registration: a sound or vibration/, /cue-orphan: drawn for no action, state or fact/);
  });

  test('an authorized cue that differs from the reviewed one, and a private cue drawn as a public game event', async () => {
    const root = scratchCopy();
    editJson(root, CUES, cues => {
      Object.assign(cues.cues.find(cue => cue.id === 'cue-selection'), { durationMs: 220, token: 'motionMs.cardTransition' });
      cues.cues.find(cue => cue.id === 'cue-pending').level = 'game_event';
    });
    refuses(await check(root), /cue-selection: differs from the reviewed cue-selection/, /cue-pending: a local cue that is not an interaction/);
  });

  // ---------- coverage of the release ----------

  test('an action of the release left out, a scenario that does not exist, Move put in the tray, and Scan answers that are not the factions', async () => {
    const root = scratchCopy();
    editJson(root, COVERAGE, coverage => {
      coverage.actions = coverage.actions.filter(action => action.kind !== 'hack');
      coverage.actions.find(action => action.kind === 'shot').scenarios.push('shot.missing');
      coverage.actions.find(action => action.kind === 'move').cues.push('cue-tray-open');
      coverage.actions.find(action => action.kind === 'scan').inline = ['Blue', 'Red'];
    });
    refuses(await check(root), /action hack of the release is not covered/, /command REQUEST_HACK is not covered/, /shot: no scenario shot\.missing/,
      /Move is in the tray: it is a room tag only/, /the Scan's answers are not the contract's factions/);
  });

  // ---------- fixtures ----------

  test('a role word in a public state, an offer the engine never makes, and an event that carries a cause', async () => {
    const root = scratchCopy();
    append(root, FIXTURES, [
      "{ const entry = SCENARIOS.find(item => item.id === 'board.idle'); const s = entry.s; entry.s = () => { const st = s(); st.public.note = 'Ada is the Undercover'; return st; }; }",
      "{ const entry = SCENARIOS.find(item => item.id === 'shot.choose'); const s = entry.s; entry.s = () => { const st = s(); st.private.offers.shot = [1, 3, 7]; return st; }; }",
      "EVENTS.push({ id: 'bang', label: 'Bang', fact: { type: 'PUBLIC_HEALTH_CHANGED', seat: 5, health: 'Injured', attacker: 2 } }, { id: 'shot', label: 'Shot', fact: { type: 'SHOT_FIRED', seat: 5 } });",
    ].join('\n'));
    refuses(await check(root), /board\.idle: the public state names the role Undercover/, /shot\.choose: shot offers the player's own seat/,
      /shot\.choose: shot offers Player 7 in Command Room/, /event bang: carries attacker/, /event shot: SHOT_FIRED is not a public fact/);
  });

  // ---------- the release's words and looks ----------

  test('a release word changed, a quote not in its file, a proposed word that names a role, a call sign changed and a role in another team', async () => {
    const root = scratchCopy();
    append(root, COPY, [
      "COPY.cancel = 'Cancel that';",
      "RELEASE_TEXT.passConfirm = [RELEASE_TEXT.passConfirm[0], 'End your turn already?'];",
      "PROPOSED.subject = 'On the Officer\\'s ballot';",
    ].join('\n'));
    edit(root, FIXTURES, text => text.replace("{ id: 'c1', sign: 'Vega'", "{ id: 'c1', sign: 'Vela'"));
    edit(root, 'design/board-motion/js/app.js', text => text.replace("Officer: ['officer', 'Blue']", "Officer: ['officer', 'Red']"));
    refuses(await check(root), /cancel: “Cancel that”, the release says “Cancel”/, /passConfirm: not found verbatim/, /a proposed word names the role Officer/,
      /CREW differs from design\/contract\/crew-catalog\.json/, /Officer: device or team differs from comic-shell\.ts/);
  });

  // ---------- stations ----------

  test('two places in a row too close for two targets, a place whose target leaves the panel, and a formation that repeats a station', async () => {
    const root = scratchCopy();
    editJson(root, STATIONS, stations => {
      stations.rooms['room-a'].stations.A5.at = [0.4, 0];
      stations.rooms.jail.stations.J3.at = [0.05, 0];
      stations.rooms['room-b'].formations['3'] = ['B1', 'B2', 'B2'];
    });
    refuses(await check(root), /room-a: two places in row 0 \d+ px apart at 320 px/, /jail: a place whose 44 px target leaves the panel/, /room-b: no formation of 3 distinct stations/);
  });

  // ---------- the fence ----------

  test('a file without the development-only mark, one that loads from the network, one that imports production code, and production code that reaches the prototype', async () => {
    const root = scratchCopy();
    edit(root, 'design/board-motion/js/h.js', text => text.replaceAll('mothership:dev-only', 'prototype'));
    append(root, 'design/board-motion/js/board.js', "const remote = () => import('https://example.invalid/x.js');");
    append(root, 'design/board-motion/js/layout.js', "import { en } from '../../../packages/presentation/dist/copy/en.js';");
    write(root, 'apps/game/hosted/leak.mjs', "export const prototype = '/board-motion/';\n");
    refuses(await check(root), /design\/board-motion\/js\/h\.js: no development-only mark/, /design\/board-motion\/js\/board\.js: loads something from the network/,
      /design\/board-motion\/js\/layout\.js: imports production code/, /apps\/game\/hosted\/leak\.mjs: production code refers to the board-motion prototype/);
  });

  // ---------- assets ----------

  test('a prop layer edited by hand, and layers proposed against another manifest', async () => {
    const root = scratchCopy();
    append(root, 'design/board-motion/assets/room-b.prop-counter.svg', '<!-- touched up by hand -->');
    editJson(root, 'design/board-motion/assets/manifest.json', manifest => { manifest.baseManifest = 'design-0.1.0'; });
    refuses(await check(root), /room-b\.prop-counter\.svg: not what design\/tools\/board-motion-assets\.mjs makes/, /proposed against design-0\.1\.0, the reviewed manifest is design-0\.2\.0/);
  });

  // ---------- captures and documents ----------

  test('an edit made after the captures, a stray picture, a listed picture missing, and a report that records problems', async () => {
    const root = scratchCopy();
    append(root, CSS, '/* a change after the screenshots were taken */');
    writeFileSync(join(root, 'design/board-motion/review/states/old-board.png'), '');
    rmSync(join(root, 'design/board-motion/review/vocabulary.png'));
    editJson(root, 'design/board-motion/review/report.json', report => { report.failures.push({ id: 'w320-code', problems: ['the board does not fit its row'] }); });
    refuses(await check(root), /the captures were made from different pages or fixtures/, /old-board\.png: a stale picture not in the index/,
      /design\/board-motion\/review\/vocabulary\.png: listed and missing/, /the capture report records 1 captures with problems/);
  });

  test('the coverage page edited by hand, and a handoff that drops a component and a gap', async () => {
    const root = scratchCopy();
    append(root, 'docs/design/board-motion-coverage.md', 'A hand-written note.');
    edit(root, 'docs/design/board-motion-handoff.md', text => text.replaceAll('`move-ghost`', 'the tentative place').replaceAll('GAP-2', 'the capacity question'));
    refuses(await check(root), /board-motion-coverage\.md is out of date/, /the handoff does not name component move-ghost/, /the handoff does not name GAP-2/);
  });
});
