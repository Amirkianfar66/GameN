import { FullAssetManifestVersionSchema } from '@mothership/contracts';
export interface RuntimeConfiguration {
  projectId: string;
  emulator: boolean;
  assetManifestVersion: string;
  allowedOrigins: readonly string[];
  functionsEmulator?: string;
  authEmulatorHost?: string;
  firestoreEmulatorHost?: string;
  tasksEmulatorHost?: string;
}

const loopback = /^(?:127\.0\.0\.1|localhost|\[::1\]):([0-9]{1,5})$/;
const emulatorNames = new Set([
  'FUNCTIONS_EMULATOR', 'FUNCTIONS_EMULATOR_HOST', 'MOTHERSHIP_FUNCTIONS_EMULATOR_HOST',
  'FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_EMULATOR_HUB', 'FIREBASE_LOGGING_EMULATOR_HOST', 'FIREBASE_FIRESTORE_EMULATOR_ADDRESS',
  'CLOUD_TASKS_EMULATOR_HOST', 'CLOUD_EVENTARC_EMULATOR_HOST',
]);
function localPort(value: string | undefined, port: number): boolean {
  return value !== undefined && Number(value.match(loopback)?.[1]) === port;
}
function projectFromFirebaseConfig(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  // Reading a local configuration file would weaken the pre-initialization boundary.
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error('FIREBASE_CONFIG must be inline JSON'); }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid Firebase runtime configuration');
  const projectId = (parsed as Record<string, unknown>)['projectId'];
  if (projectId !== undefined && (typeof projectId !== 'string' || projectId.length === 0)) throw new Error('Invalid Firebase project identifier');
  return projectId as string | undefined;
}

/** Call before initializeApp, getApps, or any other SDK initialization. */
export function assertRuntimeEnvironment(environment: Record<string, string | undefined>): RuntimeConfiguration {
  const configuredProjects = [environment['GCLOUD_PROJECT'], environment['GCP_PROJECT'], projectFromFirebaseConfig(environment['FIREBASE_CONFIG'])]
    .filter((value): value is string => value !== undefined && value.length !== 0);
  if (configuredProjects.length === 0 || new Set(configuredProjects).size !== 1) throw new Error('An unambiguous Firebase project identifier is required');
  const projectId = configuredProjects[0]!;
  const emulatorKeys = Object.keys(environment).filter(key => environment[key] !== undefined
    && key.includes('EMULATOR'));
  const emulator = emulatorKeys.length !== 0;
  if (emulator) {
    if (projectId !== 'demo-mothership' || environment['FUNCTIONS_EMULATOR'] !== 'true'
      || !localPort(environment['FIREBASE_AUTH_EMULATOR_HOST'], 9199)
      || !localPort(environment['FIRESTORE_EMULATOR_HOST'], 8180)
      || !localPort(environment['MOTHERSHIP_FUNCTIONS_EMULATOR_HOST'] ?? environment['FUNCTIONS_EMULATOR_HOST'], 5101)
      || emulatorKeys.some(key => !emulatorNames.has(key))
      || (environment['FUNCTIONS_EMULATOR_HOST'] !== undefined && !localPort(environment['FUNCTIONS_EMULATOR_HOST'], 5101))
      || (environment['MOTHERSHIP_FUNCTIONS_EMULATOR_HOST'] !== undefined && !localPort(environment['MOTHERSHIP_FUNCTIONS_EMULATOR_HOST'], 5101))
      || (environment['FIREBASE_FIRESTORE_EMULATOR_ADDRESS'] !== undefined && !localPort(environment['FIREBASE_FIRESTORE_EMULATOR_ADDRESS'], 8180))
      || (environment['CLOUD_TASKS_EMULATOR_HOST'] !== undefined && !localPort(environment['CLOUD_TASKS_EMULATOR_HOST'], 9499))
      || (environment['CLOUD_EVENTARC_EMULATOR_HOST'] !== undefined && (environment['CLOUD_EVENTARC_EMULATOR_HOST']?.startsWith('http://') !== true || !localPort(environment['CLOUD_EVENTARC_EMULATOR_HOST']?.slice(7), 9299)))
      || (environment['FIREBASE_EMULATOR_HUB'] !== undefined && !localPort(environment['FIREBASE_EMULATOR_HUB'], 4500))
      || (environment['FIREBASE_LOGGING_EMULATOR_HOST'] !== undefined && !localPort(environment['FIREBASE_LOGGING_EMULATOR_HOST'], 4600))) {
      throw new Error('Only the complete loopback demo-mothership Emulator Suite is permitted');
    }
  } else if (projectId.startsWith('demo-')) throw new Error('Demo projects require the complete Emulator Suite');

  const assetManifestVersion = environment['MOTHERSHIP_ASSET_MANIFEST_VERSION'] ?? (emulator ? '0.0.0-no-assets' : undefined);
  if (!FullAssetManifestVersionSchema.safeParse(assetManifestVersion).success
    || (!emulator && assetManifestVersion === '0.0.0-no-assets')) throw new Error('An explicit production asset manifest version is required');

  let allowedOrigins: string[];
  if (environment['MOTHERSHIP_ALLOWED_ORIGINS'] === undefined) {
    allowedOrigins = emulator ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : [];
  } else {
    let parsed: unknown;
    try { parsed = JSON.parse(environment['MOTHERSHIP_ALLOWED_ORIGINS']); } catch { throw new Error('Origin configuration must be a JSON array'); }
    if (!Array.isArray(parsed) || parsed.length > 16 || parsed.some(value => typeof value !== 'string')) throw new Error('Invalid origin allowlist');
    allowedOrigins = parsed as string[];
    for (const origin of allowedOrigins) {
      let url: URL;
      try { url = new URL(origin); } catch { throw new Error('Invalid configured origin'); }
      if (url.origin !== origin || url.username !== '' || url.password !== ''
        || (emulator ? !['http:', 'https:'].includes(url.protocol) : url.protocol !== 'https:')
        || (emulator && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
        throw new Error('Origins must be explicit canonical HTTPS origins, or loopback emulator origins');
      }
    }
    if (new Set(allowedOrigins).size !== allowedOrigins.length) throw new Error('Duplicate configured origin');
  }
  return {
    projectId, emulator, assetManifestVersion: assetManifestVersion!, allowedOrigins: Object.freeze([...allowedOrigins]),
    ...(emulator ? { functionsEmulator: 'true', authEmulatorHost: environment['FIREBASE_AUTH_EMULATOR_HOST']!, firestoreEmulatorHost: environment['FIRESTORE_EMULATOR_HOST']!, ...(environment['CLOUD_TASKS_EMULATOR_HOST'] === undefined ? {} : { tasksEmulatorHost: environment['CLOUD_TASKS_EMULATOR_HOST'] }) } : {}),
  };
}
