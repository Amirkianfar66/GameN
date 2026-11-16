import assert from 'node:assert/strict';
import test from 'node:test';
import {planChecks, assertCheckResults} from '../../scripts/ci-check-plan.mjs';

test('prose-only PRs keep integrity checks without unrelated emulator runs', () => {
  for (const paths of [['docs/development.md'], ['AGENTS.md', '.github/pull_request_template.md'],
    ['docs/architecture/visual-component-ownership.md', 'docs/frontend/verification.md']])
    assert.deepEqual(planChecks(paths), {scope: 'docs', required: ['verify']});
});
test('client-only changes retain both current and historical frontend emulator gates', () => {
  const plan = planChecks(['apps/game/src/planet/pregame.ts', 'packages/presentation/src/planet/library.ts',
    'apps/game/test/planet-pregame.test.mjs', 'docs/frontend/verification.md']);
  assert.deepEqual(plan, {scope: 'frontend', required: ['verify', 'frontend-emulator', 'frontend-board-v2-emulator']});
});
test('authority, runtime design, approval, build and unknown changes keep full verification', () => {
  for (const path of ['docs/design/owner-decisions.md', 'docs/decisions.md', 'docs/integration/approval.json',
    'docs/integration/approval.md', 'design/phone-ui/components/room-scene/index.mjs', 'packages/contracts/src/index.ts',
    'services/game-api/src/planet-game.ts', 'infra/firebase/src/planet-runtime.ts', 'rules/overlays/current.json',
    'package-lock.json', 'scripts/ci-check-plan.mjs', '.github/workflows/bootstrap.yml',
    'apps/game/hosted/vite.config.mjs', 'apps/game/hosted/preview-config.json',
    'apps/game/hosted/package.json', 'apps/game/hosted/build/planet-library-art.mjs', 'unknown-file']) {
    assert.equal(planChecks([path]).scope, 'full', path);
    assert.equal(planChecks(['docs/development.md', path]).scope, 'full', `mixed ${path}`);
  }
});
test('main, manual release validation, labelled candidates and missing diffs always run full checks', () => {
  for (const eventName of ['push', 'workflow_dispatch', 'unknown'])
    assert.equal(planChecks(['docs/development.md'], {eventName}).scope, 'full');
  assert.equal(planChecks(['docs/development.md'], {releaseCandidate: true}).scope, 'full');
  assert.equal(planChecks([]).scope, 'full');
  for (const path of ['../file', '/file', 'docs/../file', 'docs/a\nfile', 'docs\\file'])
    assert.throws(() => planChecks([path]));
});
test('the stable gate accepts only the exact planned results and never hides failed or missing work', () => {
  const names = planChecks([]).required;
  for (const scope of ['docs', 'frontend', 'full']) {
    const plan = scope === 'full' ? planChecks([]) : planChecks([scope === 'docs' ? 'docs/development.md' : 'apps/game/src/main.ts']);
    const results = Object.fromEntries(names.map(name => [name, plan.required.includes(name) ? 'success' : 'skipped']));
    assert.doesNotThrow(() => assertCheckResults(scope, results));
    for (const name of names) for (const status of ['failure', 'cancelled', undefined])
      assert.throws(() => assertCheckResults(scope, {...results, [name]: status}));
    for (const name of plan.required) assert.throws(() => assertCheckResults(scope, {...results, [name]: 'skipped'}));
  }
  assert.throws(() => assertCheckResults(undefined, {}));
});
