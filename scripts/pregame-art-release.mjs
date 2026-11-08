import {readRuntimeArtRelease, PREGAME_ART_VERSION} from './runtime-art-release.mjs';

/** Build-only registration guard. Drawings enter a bundle only through a separately
 * reviewed consumer import; registration never mounts films or selects a match flow.
 */
export function pregameAssetsPlugin(root) {
  const verify=()=>readRuntimeArtRelease(root,PREGAME_ART_VERSION);
  return {
    name:'reviewed-pregame-source-registration',
    buildStart(){verify();},
    configureServer(){verify();},
  };
}
