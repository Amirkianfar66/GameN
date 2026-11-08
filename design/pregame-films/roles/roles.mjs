// mothership:dev-only
//
// The roles the films are made for: the game's nine (packages/contracts PlanetRole), eight films (the
// two Disablers share one). Each role's look: its name, its team, the held device its card draws
// (packages/presentation planetRoleLook's DEVICES: the Doctor's is `cracker`, the injector) and the
// gadget the opener's character takes. The Doctor's is the pilot; the other films follow the owner's
// review of it.

import { injectorSvg } from './briefing.mjs';
import { DOCTOR_CAPTIONS, doctorPanels } from './doctor.mjs';

export const ROLES = Object.freeze({
  doctor: Object.freeze({ id: 'doctor', name: 'Doctor', team: 'blue', device: 'cracker', gadget: () => injectorSvg('bf-gadget'), panels: doctorPanels, captions: DOCTOR_CAPTIONS }),
});

/** The held device art every phone already loads (the crew release's roles bundle), by device id. */
export const DEVICE_FILES = Object.freeze({
  cracker: 'crew-drawing/assets/roles/device-cracker.held.svg',
});
