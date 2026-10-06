import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPhoneRehearsalPlan } from '../dev/phone-rehearsal-plan.mjs';
import { assertRuntimeEnvironment } from '../dist/runtime.js';

const local = { mode: 'local-network', lanIpv4: '192.168.1.42' };
const staging = { mode: 'staging', projectId: 'mothership-phone-stage', httpsOrigin: 'https://stage.example.invalid', assetManifestVersion: 'synthetic-assets-v1' };
const inputError = /^Invalid first-phone rehearsal plan input$/;
const cli = fileURLToPath(new URL('../dev/phone-rehearsal-plan.mjs', import.meta.url));

function blocked(plan, ...ids) {
  assert.equal(plan.planVersion, 1);
  assert.equal(plan.planningOnly, true);
  assert.equal(plan.readiness, false);
  for (const id of ids) assert.ok(plan.blockers.some(blocker => blocker.id === id && blocker.detail.length > 0), id);
  assert.equal(new Set(plan.blockers.map(blocker => blocker.id)).size, plan.blockers.length);
}
function rejected(input) { assert.throws(() => createPhoneRehearsalPlan(input), error => error instanceof TypeError && inputError.test(error.message)); }

test('LAN proposal accepts only canonical RFC1918 IPv4 and leaves phone transport/listeners unresolved', () => {
  for (const lanIpv4 of ['10.0.0.1', '10.255.255.254', '172.16.0.1', '172.31.255.254', '192.168.0.1', '192.168.255.254']) {
    const input = { ...local, lanIpv4 };
    const plan = createPhoneRehearsalPlan(input);
    blocked(plan, 'ENVIRONMENT_CHOICE', 'LAN_BOUNDARY_REVIEW', 'LAN_FRONTEND_ADAPTER', 'LAN_TLS_AND_MIXED_CONTENT', 'LOCAL_DEADLINE_RUNNER');
    assert.equal(plan.reviewArtifacts.phonePageOriginProposal, `https://${lanIpv4}`);
    assert.equal(plan.reviewArtifacts.certificateSubjectAlternativeNameProposal, `IP:${lanIpv4}`);
    assert.equal(plan.reviewArtifacts.browserTransportProposal, null);
    assert.equal(plan.reviewArtifacts.networkListenerProposal, null);
    assert.equal(plan.reviewArtifacts.phoneOriginAcceptedByCurrentEmulatorGuard, false);
    assert.deepEqual(input, { ...local, lanIpv4 });
  }
  for (const lanIpv4 of ['172.15.255.255', '172.32.0.1', '192.167.1.42', '8.8.8.8', '100.64.0.1', '127.0.0.1', '0.0.0.0', '169.254.1.2', '::1', '192.168.1.256', '10.00.0.1', '10.1.2', ' 10.0.0.1', '10.0.0.1 ', 'https://10.0.0.1', '10.0.0.1:5173']) rejected({ ...local, lanIpv4 });
});

test('strict plan input rejects tokens, private payloads, unknown fields and caller readiness overrides', () => {
  for (const valid of [local, staging]) {
    for (const [key, value] of [['idToken', 'private-test-token'], ['refreshToken', 'private-test-token'], ['recoveryToken', 'private-test-token'], ['appCheckToken', 'private-test-token'], ['privatePayload', { target: 'seat-2' }], ['role', 'Officer'], ['readiness', true], ['allowedOrigins', ['*']]]) rejected({ ...valid, [key]: value });
    for (const key of Object.keys(valid)) {
      const missing = { ...valid }; delete missing[key]; rejected(missing);
      for (const value of [undefined, null, 1, true, [], {}]) rejected({ ...valid, [key]: value });
    }
  }
  for (const input of [null, undefined, true, [], 'local-network', {}, { mode: 'production' }, { ...local, projectId: 'demo-mothership' }, { ...staging, lanIpv4: local.lanIpv4 }]) rejected(input);
});

test('non-JSON accessors, symbols and inherited input cannot run or smuggle extra fields', () => {
  let called = false;
  const getter = { mode: 'local-network', get lanIpv4() { called = true; return local.lanIpv4; } };
  rejected(getter);
  rejected({ get mode() { called = true; return 'local-network'; }, lanIpv4: local.lanIpv4 });
  assert.equal(called, false);
  rejected({ ...local, [Symbol('token')]: 'private-test-token' });
  rejected(Object.create(local));
});

test('staging proposal is deterministic and passes the existing production runtime guard without becoming ready', () => {
  const input = { ...staging };
  const plan = createPhoneRehearsalPlan(input);
  assert.deepEqual(plan, createPhoneRehearsalPlan(input));
  assert.deepEqual(input, staging);
  blocked(plan, 'INTEGRATION_REVIEW', 'CREDENTIAL_RECOVERY_POLICY', 'REAL_DEVICE_ACCEPTANCE', 'STAGING_AUTHORIZATION', 'STAGING_FRONTEND_ADAPTER', 'STAGING_APP_CHECK', 'STAGING_RUNTIME_AND_IAM', 'STAGING_ASSET_EVIDENCE');
  const environment = plan.reviewArtifacts.backendEnvironmentProposal;
  assert.deepEqual(environment, { GCLOUD_PROJECT: staging.projectId, MOTHERSHIP_ASSET_MANIFEST_VERSION: staging.assetManifestVersion, MOTHERSHIP_ALLOWED_ORIGINS: JSON.stringify([staging.httpsOrigin]) });
  const validated = assertRuntimeEnvironment(environment);
  assert.equal(validated.emulator, false);
  assert.deepEqual(validated.allowedOrigins, [staging.httpsOrigin]);
  assert.equal(validated.assetManifestVersion, staging.assetManifestVersion);
  assert.equal(plan.reviewArtifacts.browserTransportProposal, null);
  assert.equal(plan.reviewArtifacts.cloudDeploymentProposal, null);
  assert.equal(plan.scope, 'first-phone-connected-slice');
  assert.ok(plan.scopeLimitations.some(limitation => limitation.includes('remaining role/vote/showdown/result')));
  assert.ok(!plan.blockers.some(blocker => blocker.id === 'CLIENT_WORKFLOWS_AND_ASSETS'));
  assert.deepEqual(plan.credentialPolicyProposal, { authPersistence: 'session', firestoreCache: 'memory', privatePayloadPersistence: 'none' });
});

test('staging rejects noncanonical origins, demo/invalid projects and absent or sentinel asset pins', () => {
  for (const httpsOrigin of ['http://stage.example.invalid', 'https://stage.example.invalid/', 'https://stage.example.invalid/path', 'https://stage.example.invalid?token=secret', 'https://stage.example.invalid#secret', 'https://user:secret@stage.example.invalid', 'https://*.example.invalid', 'https://STAGE.example.invalid', 'HTTPS://stage.example.invalid', ' https://stage.example.invalid', 'https://stage.example.invalid:443', 'https://stage.example.invalid:65536']) rejected({ ...staging, httpsOrigin });
  for (const projectId of ['demo-mothership', 'demo-phone-stage', '', 'abcde', '1mothership-stage', 'Mothership-stage', 'mothership_stage', 'mothership-stage-', 'a'.repeat(31)]) rejected({ ...staging, projectId });
  for (const assetManifestVersion of ['', '0.0.0-no-assets', 'a'.repeat(129), '/path/secret', 'https://assets.example.invalid', 'unreviewed assets']) rejected({ ...staging, assetManifestVersion });
  const explicitPort = createPhoneRehearsalPlan({ ...staging, httpsOrigin: 'https://stage.example.invalid:8443' });
  assert.deepEqual(assertRuntimeEnvironment(explicitPort.reviewArtifacts.backendEnvironmentProposal).allowedOrigins, ['https://stage.example.invalid:8443']);
});

test('LAN reference preserves runtime isolation and does not silently authorize phone origins or emulator hosts', () => {
  const plan = createPhoneRehearsalPlan(local);
  const environment = plan.reviewArtifacts.loopbackBackendEnvironmentReference;
  assert.equal(assertRuntimeEnvironment(environment).emulator, true);
  assert.throws(() => assertRuntimeEnvironment({ ...environment, MOTHERSHIP_ALLOWED_ORIGINS: JSON.stringify([plan.reviewArtifacts.phonePageOriginProposal]) }), /Origins must be explicit canonical HTTPS origins, or loopback emulator origins/);
  for (const key of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST', 'MOTHERSHIP_FUNCTIONS_EMULATOR_HOST']) {
    assert.throws(() => assertRuntimeEnvironment({ ...environment, [key]: environment[key].replace('127.0.0.1', local.lanIpv4) }), /Only the complete loopback/);
  }
});

test('CLI only prints a local review artifact and leaves the input and other files unchanged', () => {
  const directory = mkdtempSync(join(tmpdir(), 'mothership-phone-plan-'));
  try {
    const input = join(directory, 'input.json');
    const source = JSON.stringify(local);
    writeFileSync(input, source);
    const output = execFileSync(process.execPath, [cli, input], { encoding: 'utf8' });
    assert.deepEqual(JSON.parse(output), createPhoneRehearsalPlan(local));
    assert.equal(readFileSync(input, 'utf8'), source);
    assert.deepEqual(readdirSync(directory), ['input.json']);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('CLI fails closed with sanitized diagnostics for malformed, oversized, secret-bearing or absent input', () => {
  const directory = mkdtempSync(join(tmpdir(), 'mothership-phone-plan-'));
  try {
    const input = join(directory, 'input.json');
    for (const source of ['{"idToken":"private-test-token"}', JSON.stringify({ ...local, recoveryToken: 'private-test-token' }), 'private-test-token-not-json', ' '.repeat(4097)]) {
      writeFileSync(input, source);
      const result = spawnSync(process.execPath, [cli, input], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, 'Invalid first-phone rehearsal plan input\n');
      assert.ok(!result.stderr.includes('private-test-token'));
    }
    const result = spawnSync(process.execPath, [cli], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'Invalid first-phone rehearsal plan input\n');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
