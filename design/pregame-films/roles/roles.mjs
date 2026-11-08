// mothership:dev-only
//
// The roles the films are made for: the game's nine (packages/contracts PlanetRole), eight films (the
// two Disablers share one). Each role's look: its name, its team, the mark on the card on the desk
// (the Doctor's, a medical cross, at the owner's word), the gadget the opener's character takes, and
// its panels and narration. The Doctor's is the pilot; the other films follow the owner's review of it.

import { injectorSvg } from './briefing.mjs';
import { DOCTOR_CAPTIONS, doctorMark, doctorPanels } from './doctor.mjs';

export const ROLES = Object.freeze({
  doctor: Object.freeze({ id: 'doctor', name: 'Doctor', team: 'blue', mark: doctorMark, gadget: () => injectorSvg('bf-gadget'), panels: doctorPanels, captions: DOCTOR_CAPTIONS }),
});
