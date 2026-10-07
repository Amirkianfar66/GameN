import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertBalanceEngine, balanceEngineCommands, balanceReportGateCommand, balanceStaticInputs, readBalanceProvenance, readBalanceReport, runBalanceProcess } from '../../scripts/test-balance.mjs';

import { ENGINE_PINS } from '../../scripts/test-balance-reports.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const head = '1234567890abcdef1234567890abcdef12345678';
function temporary(fn) {
  const directory = mkdtempSync(join(tmpdir(), 'balance-runner-test-'));
  try { fn(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('required engine plan runs all three local CLIs, actual HEAD, fresh reports, and ten seeds without filters', () => {
  const commands = balanceEngineCommands(root, head, '/private/tmp/balance-new-run');
  assert.deepEqual(commands.map(command => command.name), ['scenarios', 'controls', 'playouts']);
  assert.equal(new Set(commands.map(command => command.reportPath)).size, 3);
  for (const command of commands) {
    assert.equal(command.args.filter(argument => argument === '--require-engine').length, 1);
    assert.equal(command.args[command.args.indexOf('--engine-commit') + 1], head);
    assert.equal(command.args[command.args.indexOf('--out') + 1], command.reportPath);
    assert.equal(dirname(command.reportPath), '/private/tmp/balance-new-run');
    assert.ok(!command.args.includes('--only'));
    assert.ok(!command.args.includes('--engine-root'));
    assert.equal(typeof command.check, 'function');
  }
  assert.equal(commands[2].args[commands[2].args.indexOf('--seeds') + 1], '10');
  assert.throws(() => balanceEngineCommands(root, 'a389', '/private/tmp'), /actual full Git HEAD/);
});
test('actual Git HEAD is read and dirty or unknown provenance cannot become engine evidence', () => {
  const calls = [];
  const git = (...args) => { calls.push(args); return args[0] === 'status' ? '' : args[1] === 'HEAD' ? head : 'codex/current-candidate'; };
  assert.deepEqual(readBalanceProvenance(root, git), { head, branch: 'codex/current-candidate', node: 'v22.21.1' });
  assert.deepEqual(calls, [['status', '--porcelain'], ['rev-parse', 'HEAD'], ['rev-parse', '--abbrev-ref', 'HEAD']]);
  assert.throws(() => readBalanceProvenance(root, () => ' M changed-source'), /clean committed checkout/);
  assert.throws(() => readBalanceProvenance(root, (...args) => args[0] === 'status' ? '' : 'unknown'), /actual Git HEAD unavailable/);
});
test('static suite requires all five reviewed files and the materialization/traceability checkers', () => {
  assert.equal(balanceStaticInputs(root).files.length, 5);
  temporary(directory => {
    for (const path of ['tests/scenarios/commands.test.mjs', 'tests/scenarios/rulebook.test.mjs', 'tests/scenarios/scenarios.test.mjs', 'tests/scenarios/sources.test.mjs', 'tests/scenarios/tooling.test.mjs', 'tools/balance/package.json', 'tools/balance/scripts/materialize.mjs', 'tools/balance/scripts/traceability.mjs']) {
      mkdirSync(dirname(join(directory, path)), { recursive: true }); writeFileSync(join(directory, path), '');
    }
    assert.equal(balanceStaticInputs(directory).files.length, 5);
    const mandatory = join(directory, 'tests/scenarios/sources.test.mjs');
    unlinkSync(mandatory);
    assert.throws(() => balanceStaticInputs(directory), /required static suite file missing/);
    writeFileSync(mandatory, '');
    const checker = join(directory, 'tools/balance/scripts/traceability.mjs');
    unlinkSync(checker);
    assert.throws(() => balanceStaticInputs(directory), /required static workspace\/checker missing/);
    writeFileSync(checker, '');
    symlinkSync(mandatory, join(directory, 'tests/scenarios/fake.test.mjs'));
    assert.throws(() => balanceStaticInputs(directory), /symlink or non-file/);
  });
});
test('child failure, unavailable executable, signal and timeout fail even when output claims success', () => temporary(directory => {
  const log = join(directory, 'command.log');
  for (const result of [{ status: 2 }, { status: 1 }, { status: null, signal: 'SIGTERM' }, { status: 0, error: new Error('ENOENT') }, { status: null, error: new Error('ETIMEDOUT') }]) {
    assert.throws(() => runBalanceProcess('fake-node', [], directory, log, () => ({ stdout: 'all passed\nprivate sentinel', stderr: '', ...result })), error => /command failed or unavailable/.test(error.message) && !error.message.includes('private sentinel'));
  }
  assert.ok(readFileSync(log, 'utf8').includes('private sentinel'));
}));
test('captured child execution removes nested Node test context and bounds runtime/output', () => temporary(directory => {
  let options;
  const result = runBalanceProcess('fake-node', ['command'], directory, join(directory, 'command.log'), (command, args, settings) => {
    assert.equal(command, 'fake-node'); assert.deepEqual(args, ['command']); options = settings;
    return { status: 0, signal: null, stdout: 'positive summary', stderr: '' };
  });
  assert.equal(result, 'positive summary');
  assert.equal(options.cwd, directory);
  assert.equal(options.encoding, 'utf8');
  assert.equal(options.env.NODE_TEST_CONTEXT, undefined);
  assert.equal(options.timeout, 600_000);
  assert.equal(options.maxBuffer, 16 * 1024 * 1024);
}));
test('zero-exit CLI without a fresh report and malformed reports fail closed', () => temporary(directory => {
  const path = join(directory, 'required.json');
  runBalanceProcess('fake-node', [], directory, join(directory, 'command.log'), () => ({ status: 0, signal: null, stdout: 'NOT RUN', stderr: '' }));
  assert.throws(() => readBalanceReport(path), /required fresh engine report missing/);
  writeFileSync(path, 'not-json private sentinel');
  assert.throws(() => readBalanceReport(path), error => /invalid JSON/.test(error.message) && !error.message.includes('private sentinel'));
  writeFileSync(path, '{"schema":"report"}');
  assert.deepEqual(readBalanceReport(path), { schema: 'report' });
}));

test('report gate reuses exactly the fresh reports and pins the actual clean candidate without trial flags', () => {
  const directory = '/private/tmp/balance-new-run';
  assert.deepEqual(balanceReportGateCommand(root, head, directory), [join(root, 'tools/balance/scripts/gate.mjs'),
    '--scenarios', join(directory, 'scenarios.json'), '--controls', join(directory, 'controls.json'),
    '--playouts', join(directory, 'playouts.json'), '--engine-commit', head, '--candidate-commit', head,
    '--playouts-per-mode', '10']);
  assert.throws(() => balanceReportGateCommand(root, 'a389', directory), /actual full Git HEAD/);
});
test('G17 engine capability and version are required even if legacy engine exports remain available', () => {
  const engine = { FULL_ENGINE_VERSION: ENGINE_PINS.engineVersion, FULL_RULESET_VERSION: ENGINE_PINS.rulesetVersion,
    FULL_RULESET_HASH: ENGINE_PINS.rulesetHash, projectOwnAcknowledgments: () => {} };
  assert.doesNotThrow(() => assertBalanceEngine(engine));
  assert.throws(() => assertBalanceEngine({ ...engine, projectOwnAcknowledgments: undefined }), /real projectOwnAcknowledgments export unavailable/);
  assert.throws(() => assertBalanceEngine({ ...engine, FULL_ENGINE_VERSION: 'full-game-1.0.0' }), /reviewed V1 engine/);
});
