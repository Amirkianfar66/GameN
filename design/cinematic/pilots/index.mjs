// mothership:dev-only
//
// The cinematic library's pilots, by id, for the stage and the review gallery.

import { PILOT_STAGE as blackhole } from './blackhole/stage.mjs';
import { PILOT_STAGE as hospitalRescue } from './hospital-rescue/stage.mjs';
import { PILOT_STAGE as privateTalk } from './private-talk/stage.mjs';

export const PILOTS = Object.freeze({
  [hospitalRescue.id]: hospitalRescue,
  [blackhole.id]: blackhole,
  [privateTalk.id]: privateTalk,
});
