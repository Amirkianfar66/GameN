import { PlanetVersionsSchema, PLANET_GAME_PINS, PLANET_PHONE_ENGINE_PROFILE } from '@mothership/contracts';
import { assertRuntimeEnvironment } from './runtime.js';
import type { RuntimeConfiguration } from './runtime.js';

export interface PlanetRuntimeConfiguration extends RuntimeConfiguration {
  creationEnabled: boolean; setupFlowVersion?: 2|3; engineProfile?:typeof PLANET_PHONE_ENGINE_PROFILE;
}

/** Planet has its own creation switch and artwork pin. Legacy release switches remain separate. */
export function assertPlanetRuntimeEnvironment(environment: Record<string, string | undefined>): PlanetRuntimeConfiguration {
  // Reuse the established project/emulator/origin validation. The neutral value does
  // not activate a V1 release profile; this entrypoint never constructs a V1 service.
  const configuration = assertRuntimeEnvironment({ ...environment,
    MOTHERSHIP_ASSET_MANIFEST_VERSION: 'planet-runtime-validation',
    MOTHERSHIP_NEW_MATCH_PROFILE: undefined,
  });
  const enabled = environment['MOTHERSHIP_PLANET_CREATION_ENABLED'];
  if (enabled !== undefined && enabled !== 'true' && enabled !== 'false') throw new Error('Invalid Planet creation switch');
  const setupFlowVersion = environment['MOTHERSHIP_PLANET_SETUP_FLOW_VERSION'];
  if (setupFlowVersion !== undefined && setupFlowVersion !== '1' && setupFlowVersion !== '2' && setupFlowVersion !== '3') {
    throw new Error('Unsupported Planet setup flow version');
  }
  const engineProfile=environment['MOTHERSHIP_PLANET_ENGINE_PROFILE'];
  if(engineProfile!==undefined&&engineProfile!==PLANET_PHONE_ENGINE_PROFILE)throw new Error('Unsupported Planet engine profile');
  const assetManifestVersion = environment['MOTHERSHIP_PLANET_ASSET_MANIFEST_VERSION']
    ?? (configuration.emulator ? '0.0.0-no-assets' : undefined);
  if (!PlanetVersionsSchema.safeParse({ ...PLANET_GAME_PINS, assetManifestVersion }).success
    || (!configuration.emulator && assetManifestVersion === '0.0.0-no-assets')) {
    throw new Error('An explicit Planet asset manifest version is required');
  }
  return { ...configuration, assetManifestVersion: assetManifestVersion!, creationEnabled: enabled === 'true',
    ...(setupFlowVersion === '2' ? {setupFlowVersion: 2 as const} : setupFlowVersion === '3' ? {setupFlowVersion: 3 as const} : {}),
    ...(engineProfile===undefined?{}:{engineProfile}) };
}
