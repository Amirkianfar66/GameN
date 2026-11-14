import {readRuntimeArtRelease, PLANET_ART_VERSION, CREW_ART_VERSION, PREGAME_ART_VERSION} from './runtime-art-release.mjs';
import {readPregameConsumerApproval} from './pregame-consumer-approval.mjs';
import {readPhoneUiConsumerApproval} from './phone-ui-consumer-approval.mjs';
import {PLANET_PHONE_ENGINE_PROFILE, PLANET_PHONE_OFFER_PINS,
  PLANET_BLACKOUT_ENGINE_PROFILE, PLANET_BLACKOUT_PINS} from '../packages/contracts/dist/index.js';

/** Source registration and local candidate review never select production metadata.
 * Only the independently verified final consumer approval selects artwork08.
 * A malformed or incomplete present approval throws; it cannot fall back to06.
 */
export function readHostedArtReleases(root, {engineProfile} = {}) {
  if (engineProfile !== undefined && engineProfile !== PLANET_PHONE_ENGINE_PROFILE &&
    engineProfile !== PLANET_BLACKOUT_ENGINE_PROFILE) throw Error('Unsupported Planet creation profile');
  const adoption = readPregameConsumerApproval(root);
  const rootArt = readRuntimeArtRelease(root);
  const planet06 = readRuntimeArtRelease(root, PLANET_ART_VERSION);
  const crew07 = readRuntimeArtRelease(root, CREW_ART_VERSION);
  const pregame08 = readRuntimeArtRelease(root, PREGAME_ART_VERSION);
  const planetArt = adoption === null ? planet06 : pregame08;
  // Build metadata describes the separately selected server creation profile.
  // It does not activate that profile or rewrite immutable artwork gameplay pins.
  if (engineProfile !== undefined && !readPhoneUiConsumerApproval(root))
    throw Error('Planet creation metadata requires the reviewed phone consumer');
  const gameplayPins = engineProfile === PLANET_BLACKOUT_ENGINE_PROFILE ? PLANET_BLACKOUT_PINS :
    engineProfile === PLANET_PHONE_ENGINE_PROFILE ? PLANET_PHONE_OFFER_PINS : planetArt.gameplayPins;
  return Object.freeze({rootArt, planetArt,
    validationReleases: Object.freeze([rootArt, planet06, crew07, pregame08]),
    planetRelease: Object.freeze({entryPath: '/planet/', assetManifestVersion: planetArt.manifestVersion,
      artManifestSha256: planetArt.manifestSha256, gameplayPins,
      ...(engineProfile === undefined ? {} : {creationProfile: engineProfile, selectionScope: 'new-matches-only'})}),
  });
}
