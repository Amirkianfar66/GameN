import {readRuntimeArtRelease, PLANET_ART_VERSION, CREW_ART_VERSION, PREGAME_ART_VERSION} from './runtime-art-release.mjs';
import {readPregameConsumerApproval} from './pregame-consumer-approval.mjs';

/** Source registration and local candidate review never select production metadata.
 * Only the independently verified final consumer approval selects artwork08.
 * A malformed or incomplete present approval throws; it cannot fall back to06.
 */
export function readHostedArtReleases(root) {
  const adoption = readPregameConsumerApproval(root);
  const rootArt = readRuntimeArtRelease(root);
  const planet06 = readRuntimeArtRelease(root, PLANET_ART_VERSION);
  const crew07 = readRuntimeArtRelease(root, CREW_ART_VERSION);
  const pregame08 = readRuntimeArtRelease(root, PREGAME_ART_VERSION);
  const planetArt = adoption === null ? planet06 : pregame08;
  return Object.freeze({rootArt, planetArt,
    validationReleases: Object.freeze([rootArt, planet06, crew07, pregame08]),
    planetRelease: Object.freeze({entryPath: '/planet/', assetManifestVersion: planetArt.manifestVersion,
      artManifestSha256: planetArt.manifestSha256, gameplayPins: planetArt.gameplayPins}),
  });
}
