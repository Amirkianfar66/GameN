import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { assertRuntimeEnvironment } from '../dist/runtime.js';
import { createV1HttpHandler, V1_OPERATIONS, createV1Enqueuer, createV1DeadlineHandler, createV1Entrypoints } from '../dist/v1.js';
import { deadlineTaskId } from '@mothership/game-api';

const production = { GCLOUD_PROJECT: 'production-project', MOTHERSHIP_ASSET_MANIFEST_VERSION: 'test-assets-v1' };
const local = { GCLOUD_PROJECT: 'demo-mothership', FUNCTIONS_EMULATOR: 'true', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199', FIRESTORE_EMULATOR_HOST: 'localhost:8180', MOTHERSHIP_FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5101' };
function dependencies(configuration = assertRuntimeEnvironment(local)) {
  const calls = [];
  const service = Object.fromEntries(V1_OPERATIONS.map(operation => [operation, async (uid, payload) => {
    calls.push({ operation, uid, payload }); return operation === 'setPracticeBots'
      ? { schemaVersion: 1, protocolVersion: 2, ok: true, serverTimeMs: 123, matchId: payload.matchId, requestId: payload.requestId, revision: 1, botSeatIds: ['seat-2'] }
      : { ok: true, protocolVersion: 2 };
  }]));
  return { calls, service, configuration, clock: () => 123,
    verifyIdToken: async token => { if (token !== 'valid-token') throw new Error('Private token details'); return { uid: 'actor-uid' }; },
    verifyAppCheckToken: async token => { if (token !== 'valid-app-token') throw new Error('Private attestation details'); },
  };
}
async function invoke(deps, overrides = {}, operation = 'submit') {
  const capture = { status: undefined, headers: {}, body: undefined };
  const response = { set(name, value) { capture.headers[name] = value; return this; }, status(value) { capture.status = value; return this; }, json(value) { capture.body = value; return this; } };
  await createV1HttpHandler(operation, deps)({ method: 'POST', body: operation === 'setPracticeBots' ? { schemaVersion: 1, protocolVersion: 2, requestId: 'practice-request', matchId: 'match-a', botCount: 1 } : { protocolVersion: 2, matchId: 'match-a' }, headers: { 'content-type': 'application/json', authorization: 'Bearer valid-token' }, ...overrides }, response);
  return capture;
}

test('runtime guard fails partial/mixed emulator configuration before SDK initialization', () => {
  assert.equal(assertRuntimeEnvironment(local).emulator, true);
  assert.equal(assertRuntimeEnvironment({ ...local, FIREBASE_FIRESTORE_EMULATOR_ADDRESS: '127.0.0.1:8180', CLOUD_TASKS_EMULATOR_HOST: 'localhost:9499', CLOUD_EVENTARC_EMULATOR_HOST: 'http://127.0.0.1:9299' }).emulator, true);
  assert.equal(assertRuntimeEnvironment(production).emulator, false);
  for (const bad of [
    {}, { GCLOUD_PROJECT: 'demo-mothership' }, { ...local, GCLOUD_PROJECT: 'production-project' },
    { ...local, FUNCTIONS_EMULATOR: undefined }, { ...local, FIREBASE_AUTH_EMULATOR_HOST: undefined },
    { ...local, FIRESTORE_EMULATOR_HOST: undefined }, { ...local, MOTHERSHIP_FUNCTIONS_EMULATOR_HOST: undefined },
    { ...local, FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }, { ...local, FIRESTORE_EMULATOR_HOST: 'remote.example:8180' },
    { ...local, MOTHERSHIP_FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5001' },
    { ...local, FIREBASE_DATABASE_EMULATOR_HOST: 'localhost:9000' },
    { ...local, CLOUD_TASKS_EMULATOR_HOST: 'remote.example:9499' }, { ...local, CLOUD_EVENTARC_EMULATOR_HOST: 'http://127.0.0.1:9999' },
    { ...local, FIREBASE_FIRESTORE_EMULATOR_ADDRESS: 'remote.example:8180' },
    { ...local, GCP_PROJECT: 'different-project' }, { ...local, FIREBASE_CONFIG: JSON.stringify({ projectId: 'different-project' }) },
    { GCLOUD_PROJECT: 'production-project', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199' },
  ]) assert.throws(() => assertRuntimeEnvironment(bad));
});

test('production asset manifest pin is explicit and emulator placeholder stays local', () => {
  assert.equal(assertRuntimeEnvironment(local).assetManifestVersion,'0.0.0-no-assets');
  assert.equal(assertRuntimeEnvironment(production).assetManifestVersion,'test-assets-v1');
  for (const pin of [undefined,'','   ','0.0.0-no-assets','x'.repeat(129)]) {
    assert.throws(()=>assertRuntimeEnvironment({...production,MOTHERSHIP_ASSET_MANIFEST_VERSION:pin}));
  }
});

test('runtime origin allowlist accepts only explicit canonical origins and no wildcard/reflected configuration', () => {
  assert.deepEqual(assertRuntimeEnvironment(local).allowedOrigins, ['http://localhost:5173', 'http://127.0.0.1:5173']);
  assert.deepEqual(assertRuntimeEnvironment(production).allowedOrigins, []);
  const config = { ...production, MOTHERSHIP_ALLOWED_ORIGINS: JSON.stringify(['https://game.example']) };
  assert.deepEqual(assertRuntimeEnvironment(config).allowedOrigins, ['https://game.example']);
  for (const allowed of ['*', ['*'], ['null'], ['https://game.example/path'], ['http://game.example'], ['https://user:password@game.example'], ['https://game.example', 'https://game.example']]) {
    assert.throws(() => assertRuntimeEnvironment({ ...config, MOTHERSHIP_ALLOWED_ORIGINS: JSON.stringify(allowed) }));
  }
});

test('CORS accepts configured browser origin/preflight and rejects unlisted origins before verification', async () => {
  const deps = dependencies();
  const accepted = await invoke(deps, { headers: { 'content-type': 'application/json', authorization: 'Bearer valid-token', origin: 'http://localhost:5173' } });
  assert.equal(accepted.status, 200); assert.equal(accepted.headers['Access-Control-Allow-Origin'], 'http://localhost:5173');
  assert.equal(accepted.headers['Cache-Control'], 'no-store, private');
  const preflight = await invoke(deps, { method: 'OPTIONS', headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'POST', 'access-control-request-headers': 'Authorization, Content-Type, X-Firebase-AppCheck' } });
  assert.equal(preflight.status, 204); assert.equal(deps.calls.length, 1);
  for (const origin of ['https://unlisted.example', 'null', ['http://localhost:5173']]) {
    assert.equal((await invoke(deps, { headers: { 'content-type': 'application/json', authorization: 'Bearer valid-token', origin } })).status, 403);
  }
  assert.equal(deps.calls.length, 1);
  assert.equal((await invoke(deps, { method: 'OPTIONS', headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'DELETE' } })).status, 400);
});

test('all V1 operations derive UID from Auth and production requires App Check', async () => {
  const deps = dependencies(assertRuntimeEnvironment(production));
  assert.equal((await invoke(deps)).status, 403);
  assert.equal((await invoke(deps, { headers: { 'content-type': 'application/json', authorization: 'Bearer invalid-token', 'x-firebase-appcheck': 'valid-app-token' } })).status, 401);
  for (const operation of V1_OPERATIONS) {
    const response = await invoke(deps, { headers: { 'content-type': 'application/json', authorization: 'Bearer valid-token', 'x-firebase-appcheck': 'valid-app-token' } }, operation);
    assert.equal(response.status, 200);
    assert.equal(deps.calls.at(-1).uid, 'actor-uid');
  }
  assert.equal(deps.calls.length, V1_OPERATIONS.length);
});

test('V1 HTTP rejects request shape transport errors and sanitizes backend exceptions', async () => {
  const deps = dependencies();
  assert.equal((await invoke(deps, { rawBody: new Uint8Array(4097) })).status, 413);
  assert.equal((await invoke(deps, { method: 'GET' })).status, 405);
  assert.equal((await invoke(deps, { headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal(deps.calls.length, 0);
  deps.service.submit = async () => { throw new Error('Private role map and recovery token'); };
  assert.deepEqual((await invoke(deps)).body, { ok: false, serverTimeMs: 123, error: { code: 'UNAVAILABLE' } });
});

test('V1 task enqueue validates stable IDs and repairs already-created acknowledgement gaps', async () => {
  const payload = { matchId: 'match-a', phaseId: 'phase-a', deadlineToken: 'deadline-a' };
  const intent = { ...payload, taskId: deadlineTaskId(payload.matchId, payload.phaseId, payload.deadlineToken), endsAt: 1000 };
  let calls = 0;
  const enqueue = createV1Enqueuer({ enqueue: async (given, options) => { calls++; assert.deepEqual(given, payload); assert.equal(options.id, intent.taskId); assert.equal(options.scheduleTime.getTime(), 1000); throw Object.assign(new Error('already created'), { code: 'functions/task-already-exists' }); } });
  await enqueue(intent); assert.equal(calls, 1);
  await assert.rejects(enqueue({ ...intent, taskId: 'wrong-task' })); assert.equal(calls, 1);
  await assert.rejects(createV1Enqueuer({ enqueue: async () => { throw new Error('Unavailable'); } })(intent));
});

test('V1 task route rejects extra fields and fails retryably on backend failure', async () => {
  let calls = 0;
  const handler = createV1DeadlineHandler({ runPracticeBots: async () => ({ status: 'unchanged', processed: 0 }), runDeadline: async () => { calls++; return { result: 'unchanged' }; } });
  const payload = { matchId: 'match-a', phaseId: 'phase-a', deadlineToken: 'deadline-a' };
  await handler(payload); assert.equal(calls, 1);
  await assert.rejects(handler({ ...payload, force: true })); assert.equal(calls, 1);
  await assert.rejects(createV1DeadlineHandler({ runPracticeBots: async () => ({ status: 'unchanged', processed: 0 }), runDeadline: async () => ({ ok: false, error: { code: 'UNAVAILABLE' } }) })(payload));
});


test('Firebase export discovery does not initialize Admin SDK; first invocation rejects incomplete/mixed runtime', () => {
  const entrypoint = new URL('../dist/index.js', import.meta.url).href;
  const environment = {...process.env};
  for (const key of Object.keys(environment)) if (key.includes('EMULATOR') || ['GCLOUD_PROJECT','GCP_PROJECT','FIREBASE_CONFIG','MOTHERSHIP_ASSET_MANIFEST_VERSION'].includes(key)) delete environment[key];
  for (const extra of [{}, {GCLOUD_PROJECT:'production-project',MOTHERSHIP_ASSET_MANIFEST_VERSION:'test-assets-v1',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9199'}]) {
    execFileSync(process.execPath,['--input-type=module','-e',`
      import assert from 'node:assert/strict';
      import {getApps} from 'firebase-admin/app';
      assert.equal(getApps().length,0);
      const functions=await import(${JSON.stringify(entrypoint)});
      assert.equal(getApps().length,0);
      for (const name of ['v1CreateMatch','v1RequestAdmission','v1ApproveAdmission','v1AdmitDisplay','v1StartMatch','v1Command','v1Receipt','v1Advance','v1ServerTime','v1AbortMatch','v1IssueSeatRecovery','v1RedeemSeatRecovery','v1SetLobbyIdentity','v1SetPracticeBots','v1RunPracticeBots','v1DeadlineTask','v1DispatchDeadline','v1RepairDeadlines']) assert.ok(functions[name].__endpoint);
      const response={set(){return this;},status(){return this;},json(){return this;}};
      await assert.rejects(()=>functions.v1ServerTime({method:'POST',headers:{},body:{}},response));
      assert.equal(getApps().length,0);
    `],{env:{...environment,...extra},stdio:'pipe'});
  }
});


test('V1 dispatch ignores protocol 1 and missing local Tasks cannot fall back to cloud enqueue', async () => {
  let contexts=0;
  const deps=dependencies();
  const payload={matchId:'match-a',phaseId:'phase-a',deadlineToken:'deadline-a'};
  const intent={...payload,taskId:deadlineTaskId(payload.matchId,payload.phaseId,payload.deadlineToken),endsAt:1000};
  const service={...deps.service,runDeadline:async()=>({result:'unchanged'}),repairOutbox:async()=>({dispatched:0}),dispatchDeadlineIntent:async(path,enqueue)=>{
    assert.equal(path,'matches/match-a/outbox/task-a');
    await enqueue(intent);
    return {status:'dispatched'};
  }};
  const endpoints=createV1Entrypoints(()=>{contexts++;return {app:{},service,configuration:deps.configuration};});
  assert.equal(contexts,0);
  await endpoints.dispatchDeadline.run({data:{get:()=>1,ref:{path:'matches/match-a/outbox/task-a'}}});
  assert.equal(contexts,0);
  await assert.rejects(()=>endpoints.dispatchDeadline.run({data:{get:()=>2,ref:{path:'matches/match-a/outbox/task-a'}}}),/local Cloud Tasks emulator is required/);
});
