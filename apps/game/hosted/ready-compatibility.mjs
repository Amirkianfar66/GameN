import { DECLARED_HACK_VERSION_PINS, FullVersionsSchema, sameFullGameplayPins, supportsVoteResults, VOTE_RESULT_VERSION_PINS } from '@mothership/contracts';
import { bundlesFor } from './art.mjs';

// Root's reviewed release agreements are exact pairs. A supported gameplay tuple cannot
// borrow another tuple's art acknowledgment, and a server response cannot expand this list.
const CLIENT_RELEASES = [
  { gameplay: VOTE_RESULT_VERSION_PINS, art: 'design-0.2.0' },
  { gameplay: DECLARED_HACK_VERSION_PINS, art: 'design-0.3.0' },
];

export function readyCompatibility(rawVersions, { bundles = [], settled = false } = {}) {
  const parsed = FullVersionsSchema.safeParse(rawVersions);
  if (!parsed.success) return { kind: 'reload', acceptedVersions: null };
  const versions = parsed.data;
  if (!supportsVoteResults(versions)) return { kind: 'historical', acceptedVersions: null };
  if (!CLIENT_RELEASES.some(release => sameFullGameplayPins(release.gameplay, versions) && release.art === versions.assetManifestVersion)) return { kind: 'reload', acceptedVersions: null };
  if (!bundlesFor('player').every(bundle => bundles.includes(bundle))) return { kind: settled ? 'reload' : 'loading', acceptedVersions: null };
  return { kind: 'supported', acceptedVersions: { ...versions } };
}

export function currentArtState() {
  const value = globalThis.document?.documentElement?.dataset?.art;
  return { bundles: value?.split(' ').filter(Boolean) ?? [], settled: value !== undefined };
}
