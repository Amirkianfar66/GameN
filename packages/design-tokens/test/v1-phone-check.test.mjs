// mothership:dev-only
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The check of the phone-first V1 journey prototype (issue #76) is only worth something if it
// can fail. Each test copies what the check reads to a scratch directory, makes one mistake the
// way a person would, and expects design/tools/v1-phone-check.mjs to refuse it by name. Nothing
// in the repository is touched. The browser measurements in v1-phone-capture.mjs are not proven
// here; their refusals are recorded in docs/design/v1-phone-verification.md.

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const { RELEASE_COPY } = await import(pathToFileURL(join(repoRoot, 'design/v1-phone/js/fixtures.js')).href);
const RELEASE_FILES = [...new Set(Object.values(RELEASE_COPY).map(([path]) => path))];
const scratchRoots = [];
after(() => { for (const path of scratchRoots) rmSync(path, { recursive: true, force: true }); });

function scratchCopy() {
  const root = mkdtempSync(join(tmpdir(), 'mothership-v1-phone-check-'));
  scratchRoots.push(root);
  for (const path of ['design/tools', 'design/prototypes', 'design/exports', 'design/contract', 'docs/design', 'packages/design-tokens/src',
    'apps/game/hosted/role-guide.js', ...RELEASE_FILES]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(repoRoot, path), join(root, path), { recursive: true });
  }
  // The captures are checked for being listed, present and current: empty stand-ins keep the copy small.
  cpSync(join(repoRoot, 'design/v1-phone'), join(root, 'design/v1-phone'), { recursive: true, filter: source => !source.includes('/review/') });
  for (const entry of readdirSync(join(repoRoot, 'design/v1-phone/review'), { withFileTypes: true, recursive: true })) {
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
const check = root => new Promise(done => {
  execFile(process.execPath, [join(root, 'design/tools/v1-phone-check.mjs')], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
    done({ status: error ? (error.code ?? 1) : 0, output: `${stdout}${stderr}` });
  });
});
const refuses = (result, ...patterns) => {
  assert.notEqual(result.status, 0, `the check passed:\n${result.output}`);
  for (const pattern of patterns) assert.match(result.output, pattern);
};
const FIXTURES = 'design/v1-phone/js/fixtures.js';
const CSS = 'design/v1-phone/css/journey.css';
const JOURNEY = 'design/v1-phone/contract/journey.json';
const statesOf = journey => journey.screens.flatMap(screen => screen.states);

test('the V1 phone journey as committed passes its check', async () => {
  const result = await check(scratchCopy());
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /V1 phone checks: 7 passed, 0 failures/);
});

describe('mistakes the V1 phone check refuses', { concurrency: 6 }, () => {
  // ---------- privacy in the fixtures ----------

  test('a role word in a public fixture, and a public state that opens the private card', async () => {
    const root = scratchCopy();
    append(root, FIXTURES, "FIXTURES['game.waiting'].data.note = 'Ada looks like the Officer';\nFIXTURES['host.requests'].data.sheet = { open: true };");
    refuses(await check(root), /game\.waiting: a public fixture holds the role word Officer/, /host\.requests: a public state opens the private card/);
  });

  test('a state without a fixture, and a fixture without a state', async () => {
    const root = scratchCopy();
    append(root, FIXTURES, "FIXTURES['phase.extra'] = FIXTURES['phase.ballot-recorded'];\ndelete FIXTURES['phase.ballot-recorded'];");
    refuses(await check(root), /phase\.ballot-recorded: no fixture/, /phase\.extra: a fixture with no state in the inventory/);
  });

  test('a synthetic Code that holds the Undercover', async () => {
    const root = scratchCopy();
    append(root, FIXTURES, 'END_REVEAL.code.push(2);');
    refuses(await check(root), /the synthetic Code must hold the Alien and not the Undercover/);
  });

  // ---------- the release's own words and looks ----------

  test('a superseded quote reactivated and a required current quote deleted', async () => {
    const root = scratchCopy();
    append(root, FIXTURES, "RELEASE_COPY.nameTaken = [RELEASE_COPY.characterTaken[0], 'That name is already used.'];\ndelete RELEASE_COPY.sameChoiceAgain;");
    refuses(await check(root), /nameTaken: superseded release quote is still active/, /sameChoiceAgain: required current release quote is missing/);
  });

  test('a superseded state reactivated and the retired registry changed', async () => {
    const root = scratchCopy();
    append(root, FIXTURES, "FIXTURES['select.name-taken'] = FIXTURES['select.unavailable'];\nRETIRED_RELEASE_KEYS.pop();");
    refuses(await check(root), /select\.name-taken: superseded state is still active/, /the superseded quote registry differs/);
  });

  test('the obsolete name/confirm form and player-selected starting room return', async () => {
    const root = scratchCopy();
    append(root, 'design/v1-phone/js/screens.js', "const regressionForm = () => [h('input', { id: 'j-name' }), btn('Confirm', { act: 'confirm-crew' }), h('input', { name: 'room' })];");
    refuses(await check(root), /compact selection still has a name form or separate confirm control/, /code-only join still asks the player to choose a starting room/);
  });

  test('a release word misquoted, a role reminder reworded, a call sign changed and a role in another team', async () => {
    const root = scratchCopy();
    append(root, FIXTURES, [
      "RELEASE_COPY.cancel = [RELEASE_COPY.cancel[0], 'Cancel that'];",
      "ROLE_GUIDE.Insider = ROLE_GUIDE.Insider.replace('help Blue', 'help your team');",
      "CREW[0].sign = 'Vela';",
      "ROLE_LOOK.Officer.team = 'Red';",
    ].join('\n'));
    refuses(await check(root), /cancel: not found verbatim in packages\/presentation\/src\/copy\/en\.ts/, /ROLE_GUIDE differs from apps\/game\/hosted\/role-guide\.js/,
      /CREW differs from design\/contract\/crew-catalog\.json/, /Officer: device or team differs from comic-shell\.ts/);
  });

  // ---------- the stylesheet ----------

  test('colors that are not tokens: hex, functional and named', async () => {
    const root = scratchCopy();
    append(root, CSS, '.j-btn { color: #c00; }\n.j-notice { border-color: rgb(200 0 0); }\n.j-chip { background: red; }');
    refuses(await check(root), /\.j-btn: a literal hex color/, /\.j-notice: a functional color/, /\.j-chip: a named color/);
  });

  test('art drawn before its bundle, a device on the public layer, and a device without the role bundle', async () => {
    const root = scratchCopy();
    append(root, CSS, [
      '.j-mast { background-image: var(--ms-asset-board-command); }',
      '[data-art~="roles"] .j-piece { background-image: var(--ms-asset-device-hacker); }',
      '[data-art~="public-board"] .j-private .j-rolecard__art { background-image: var(--ms-asset-device-hacker); }',
    ].join('\n'));
    refuses(await check(root), /\.j-mast: draws art without waiting for its bundle/, /\.j-piece: a role's device outside \.j-private/,
      /\.j-rolecard__art: a device drawn without the role bundle/);
  });

  test('a team hook on the public board', async () => {
    const root = scratchCopy();
    append(root, CSS, '.j-board [data-team="Red"] { border-style: dashed; }');
    refuses(await check(root), /\.j-board \[data-team="Red"\]: a role or team hook outside the private container/);
  });

  test('a repeating animation, and an entrance that stays in effect', async () => {
    const root = scratchCopy();
    append(root, CSS, '.j-chip { animation: j-fade 1s infinite; }\n.j-cap { animation: j-cap-in 200ms ease both; }');
    refuses(await check(root), /\.j-chip: an animation that repeats/, /\.j-cap: an entrance that stays in effect/);
  });

  test('reduced motion that no longer stops motion, and the device setting ignored', async () => {
    const root = scratchCopy();
    edit(root, CSS, text => text.replace(/(\[data-motion="reduced"\][^{]*\*[^{]*\{[^}]*?)animation:\s*none\s*!important/, '$1animation-duration: 1ms !important')
      .replaceAll('@media (prefers-reduced-motion: reduce)', '@media (min-resolution: 9dppx)'));
    refuses(await check(root), /no reduced-motion rule that stops every animation/, /the device reduced-motion setting is not honored/);
  });

  // ---------- the fence ----------

  test('a file without the development-only mark, one that loads from the network, and one that reaches into explorations', async () => {
    const root = scratchCopy();
    edit(root, 'design/v1-phone/js/h.js', text => text.replaceAll('mothership:dev-only', 'prototype'));
    append(root, 'design/v1-phone/js/app.js', "const remote = () => import('https://example.invalid/x.js');");
    append(root, 'design/v1-phone/index.html', '<!-- the cards come from ../explorations/comic-board/ -->');
    refuses(await check(root), /design\/v1-phone\/js\/h\.js: no development-only mark/, /design\/v1-phone\/js\/app\.js: loads something from the network/,
      /design\/v1-phone\/index\.html: reaches into design\/explorations\//);
  });

  // ---------- the inventory ----------

  test('a state id used twice, a private state on the display, and a host state drawn from a seat\'s private data', async () => {
    const root = scratchCopy();
    editJson(root, JOURNEY, journey => {
      const host = journey.screens.find(screen => screen.id === 'host');
      host.states.push({ ...host.states[0] });
      statesOf(journey).find(state => state.id === 'reveal.revealed').surface = 'display';
      statesOf(journey).find(state => state.id === 'host.running').data.push('playerView');
    });
    refuses(await check(root), /a state id is used twice/, /reveal\.revealed: private content on a display surface/,
      /host\.running: a host or display state drawn from a seat's private data/);
  });

  test('a gap left unsaid, an unknown component, a component nobody draws and a private component on a public surface', async () => {
    const root = scratchCopy();
    editJson(root, JOURNEY, journey => {
      const running = statesOf(journey).find(state => state.id === 'host.running');
      delete running.gap;
      running.components.push('mystery-panel');
      journey.components.push({ id: 'orphan-panel', hook: '.j-orphan', about: 'Drawn by nothing', audience: 'public', surfaces: ['player'] });
      journey.components.find(component => component.id === 'role-card').surfaces.push('display');
    });
    refuses(await check(root), /host\.running: partial without a gap that says what is missing/, /host\.running: unknown component mystery-panel/,
      /orphan-panel: in the registry and drawn by no state/, /role-card: private component on a public surface/);
  });

  test('a priority screen dropped', async () => {
    const root = scratchCopy();
    editJson(root, JOURNEY, journey => { journey.screens.find(screen => screen.id === 'reveal').priority = null; });
    refuses(await check(root), /the five priority screens are not all there, once each/);
  });

  // ---------- the captures ----------

  test('an edit made after the captures', async () => {
    const root = scratchCopy();
    append(root, CSS, '/* a change after the screenshots were taken */');
    refuses(await check(root), /the captures were made from different pages or fixtures/, /the measurements were made on different pages or fixtures/);
  });

  test('a stray picture, a listed picture missing, and a report that records problems', async () => {
    const root = scratchCopy();
    writeFileSync(join(root, 'design/v1-phone/review/states/old-lobby.png'), '');
    rmSync(join(root, 'design/v1-phone/review/states/game.waiting.png'));
    editJson(root, 'design/v1-phone/review/report.json', report => { report.failures.push({ capture: 'game.waiting', problems: ['overflow 12px'] }); });
    refuses(await check(root), /design\/v1-phone\/review\/states\/old-lobby\.png: a stale picture not in the index/,
      /design\/v1-phone\/review\/states\/game\.waiting\.png: listed and missing/, /the capture report records 1 captures with problems/);
  });

  test('a state without its screenshot, and a matrix without its 200% text captures', async () => {
    const root = scratchCopy();
    editJson(root, 'design/v1-phone/review/index.json', index => {
      index.images = index.images.filter(image => image.state !== 'select.expired' && !image.fontPx);
    });
    refuses(await check(root), /select\.expired: no screenshot/, /the viewport matrix has no 200% text capture/);
  });

  // ---------- the documents ----------

  test('the generated inventory edited by hand, a component left out of the handoff, and a priority state left off the journey map', async () => {
    const root = scratchCopy();
    append(root, 'docs/design/v1-phone-inventory.md', 'A note added by hand.');
    edit(root, 'docs/design/v1-phone-handoff.md', text => text.replaceAll('`tally`', 'tally'));
    edit(root, 'docs/design/v1-phone-journey.md', text => text.replaceAll('reveal.revealed', 'reveal.shown'));
    refuses(await check(root), /docs\/design\/v1-phone-inventory\.md is out of date/, /v1-phone-handoff\.md does not mention component tally/,
      /v1-phone-journey\.md does not mention priority state reveal\.revealed/);
  });
});
