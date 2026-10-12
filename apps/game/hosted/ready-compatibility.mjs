import { FullVersionsSchema, sameFullGameplayPins, supportsVoteResults, VOTE_RESULT_VERSION_PINS } from '@mothership/contracts';
import { bundlesFor } from './art.mjs';

// Explicit client adoption, not an echo of whatever pins the service sends. The reviewed
// hosted art bundle is immutable design-0.2.0; future manifests need separate adoption.
const CLIENT_GAMEPLAY = [VOTE_RESULT_VERSION_PINS];
const CLIENT_ASSETS = new Set(['design-0.2.0']);

export function readyCompatibility(rawVersions, { bundles = [], settled = false } = {}) {
  const parsed = FullVersionsSchema.safeParse(rawVersions);
  if (!parsed.success) return { kind: 'reload', acceptedVersions: null };
  const versions = parsed.data;
  if (!supportsVoteResults(versions)) return { kind: 'historical', acceptedVersions: null };
  if (!CLIENT_GAMEPLAY.some(pins => sameFullGameplayPins(pins, versions)) || !CLIENT_ASSETS.has(versions.assetManifestVersion)) return { kind: 'reload', acceptedVersions: null };
  if (!bundlesFor('player').every(bundle => bundles.includes(bundle))) return { kind: settled ? 'reload' : 'loading', acceptedVersions: null };
  return { kind: 'supported', acceptedVersions: { ...versions } };
}

export function currentArtState() {
  const value = globalThis.document?.documentElement?.dataset?.art;
  return { bundles: value?.split(' ').filter(Boolean) ?? [], settled: value !== undefined };
}
