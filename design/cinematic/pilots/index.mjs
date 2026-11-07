// mothership:dev-only
//
// The cinematic library's pilots and the library groups' public films, by id, for the stage and the
// review gallery.

import { PILOT_STAGE as blackhole } from './blackhole/stage.mjs';
import { PILOT_STAGE as eject } from './eject/stage.mjs';
import { PILOT_STAGE as hospitalRescue } from './hospital-rescue/stage.mjs';
import { PILOT_STAGE as privateTalk } from './private-talk/stage.mjs';
import { PILOT_STAGE as roleReveal } from './role-reveal/stage.mjs';
import { PILOT_STAGE as navigation } from '../../library/navigation/stage.mjs';

export const PILOTS = Object.freeze({
  [hospitalRescue.id]: hospitalRescue,
  [blackhole.id]: blackhole,
  [privateTalk.id]: privateTalk,
  // The Captain's EJECT as a display cut over the approved S7 (after the pilots).
  [eject.id]: eject,
  // Library group 2's public films (design/library/navigation/), on the same stage.
  [navigation.id]: navigation,
  // The role reveal films (the owner, 6 November 2026): one ten-second film per role, the Doctor's first.
  [roleReveal.id]: roleReveal,
});
