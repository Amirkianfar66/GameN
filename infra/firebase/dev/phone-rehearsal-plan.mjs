// mothership:dev-only
// Pure proposal generation. No Firebase SDK, listener, deployment or active config writes.
import { FullAssetManifestVersionSchema } from '@mothership/contracts';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const INPUT_ERROR = 'Invalid first-phone rehearsal plan input';
const LOOPBACK_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const commonBlockers = [
  { id: 'ENVIRONMENT_CHOICE', detail: 'LAN is the working proposal assumption while the environment preference is unanswered; preparation is authorized, and actual exposure or deployment requires a selected and reviewed setup.' },
  { id: 'INTEGRATION_REVIEW', detail: 'Review the actual PR #37 / issue #32 integration candidate and issue #33 host-document schemas with Frontend and Balance before adoption.' },
  { id: 'CREDENTIAL_RECOVERY_POLICY', detail: 'Review session Auth and memory-only match data on the actual devices; resolve loss of a host-only credential separately from player-seat recovery.' },
  { id: 'REAL_DEVICE_ACCEPTANCE', detail: 'No phone, public-display privacy, accessibility or group-session acceptance has been performed by this planner.' },
];

function invalid() { throw new TypeError(INPUT_ERROR); }
function exactObject(input, keys) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(descriptors).length !== keys.length || keys.some(key => !Object.hasOwn(descriptors, key)
    || !Object.hasOwn(descriptors[key], 'value') || typeof descriptors[key].value !== 'string')) invalid();
  // No getters or additional fields (including tokens, payloads and readiness overrides).
  return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
}
function privateIpv4(value) {
  if (!/^(?:0|[1-9][0-9]{0,2})(?:\.(?:0|[1-9][0-9]{0,2})){3}$/.test(value)) invalid();
  const [a, b, c, d] = value.split('.').map(Number);
  if ([a, b, c, d].some(part => part > 255)
    || !(a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168))) invalid();
  return value;
}
function httpsOrigin(value) {
  let url;
  try { url = new URL(value); } catch { invalid(); }
  if (url.protocol !== 'https:' || url.origin !== value || url.username !== '' || url.password !== ''
    || url.hostname.includes('*')) invalid();
  return value;
}

/** Returns a deterministic, nonsecret review artifact, never a runnable phone setup. */
export function createPhoneRehearsalPlan(input) {
  // Inspect the mode as a data property before any caller-controlled accessor can run.
  if (input === null || typeof input !== 'object') invalid();
  const mode = Object.getOwnPropertyDescriptor(input, 'mode');
  if (mode?.value !== 'local-network' && mode?.value !== 'staging') invalid();
  const local = mode.value === 'local-network';
  const config = exactObject(input, local ? ['mode', 'lanIpv4'] : ['mode', 'projectId', 'httpsOrigin', 'assetManifestVersion']);
  const blockers = commonBlockers.map(blocker => ({ ...blocker }));
  let reviewArtifacts;
  if (local) {
    const ip = privateIpv4(config.lanIpv4);
    reviewArtifacts = {
      phonePageOriginProposal: `https://${ip}`,
      certificateSubjectAlternativeNameProposal: `IP:${ip}`,
      loopbackBackendEnvironmentReference: {
        GCLOUD_PROJECT: 'demo-mothership', FUNCTIONS_EMULATOR: 'true',
        FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180',
        MOTHERSHIP_FUNCTIONS_EMULATOR_HOST: '127.0.0.1:5101',
        MOTHERSHIP_ALLOWED_ORIGINS: JSON.stringify(LOOPBACK_ORIGINS),
      },
      phoneOriginAcceptedByCurrentEmulatorGuard: false,
      browserTransportProposal: null,
      networkListenerProposal: null,
    };
    blockers.push(
      { id: 'LAN_BOUNDARY_REVIEW', detail: 'The runtime permits only the complete loopback demo Emulator Suite. A reviewed development boundary is required; changing a bind address to 0.0.0.0 is insufficient.' },
      { id: 'LAN_FRONTEND_ADAPTER', detail: 'The current preview and browser adapter reject LAN/HTTPS endpoints. Frontend must review phone-facing Auth, Firestore and HTTP endpoint settings before any listener is exposed.' },
      { id: 'LAN_TLS_AND_MIXED_CONTENT', detail: 'Provide device-trusted HTTPS and review Firestore SDK connection settings, TLS termination and mixed content for every connection. A TLS proxy alone does not establish compatibility.' },
      { id: 'LOCAL_DEADLINE_RUNNER', detail: 'Review issue #34 and verify local progression with all clients closed; the existing Cloud Tasks emulator delivers future jobs immediately.' },
    );
  } else {
    if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId) || config.projectId.startsWith('demo-')
      || !FullAssetManifestVersionSchema.safeParse(config.assetManifestVersion).success
      || config.assetManifestVersion === '0.0.0-no-assets') invalid();
    const origin = httpsOrigin(config.httpsOrigin);
    reviewArtifacts = {
      backendEnvironmentProposal: {
        GCLOUD_PROJECT: config.projectId,
        MOTHERSHIP_ASSET_MANIFEST_VERSION: config.assetManifestVersion,
        MOTHERSHIP_ALLOWED_ORIGINS: JSON.stringify([origin]),
      },
      browserTransportProposal: null,
      cloudDeploymentProposal: null,
    };
    blockers.push(
      { id: 'STAGING_AUTHORIZATION', detail: 'Verify an isolated nonproduction project, access and costs, then obtain actual deployment authorization. A syntactically valid project ID is not that evidence.' },
      { id: 'STAGING_FRONTEND_ADAPTER', detail: 'The current browser transport refuses non-demo projects. Review a production SDK adapter, explicit endpoints and the pinned asset build with Frontend.' },
      { id: 'STAGING_APP_CHECK', detail: 'Configure the reviewed App Check provider/origin and current-token headers; verify actual device acceptance and negative enforcement before group use.' },
      { id: 'STAGING_RUNTIME_AND_IAM', detail: 'Review Auth, Rules/indexes, Functions and private Cloud Tasks/scheduler IAM; verify real scheduled delivery and repair. Runtime origin validation alone proves none of these.' },
      { id: 'STAGING_ASSET_EVIDENCE', detail: 'Verify that the explicit manifest version names reviewed and available assets; its syntax is not asset provenance or device acceptance.' },
    );
  }
  return {
    planVersion: 1, planningOnly: true, readiness: false, mode: config.mode, scope: 'first-phone-connected-slice',
    scopeLimitations: [
      'The connected client currently offers MOVE and REGISTER_SHOT; remaining role/vote/showdown/result controls, host abort and seat-recovery UI are later Frontend work.',
      'A minimal labeled development visual/bundle review does not approve the complete Designer asset handoff or establish complete in-person V1 acceptance.',
    ],
    credentialPolicyProposal: { authPersistence: 'session', firestoreCache: 'memory', privatePayloadPersistence: 'none' },
    blockers, reviewArtifacts,
  };
}

// The CLI reads a small local JSON proposal and prints JSON. It never applies a config.
if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3 || statSync(process.argv[2]).size > 4096) invalid();
    const input = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    process.stdout.write(`${JSON.stringify(createPhoneRehearsalPlan(input), null, 2)}\n`);
  } catch {
    process.stderr.write(`${INPUT_ERROR}\n`);
    process.exitCode = 1;
  }
}
