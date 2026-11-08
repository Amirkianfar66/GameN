// mothership:dev-only
//
// The roles the films are made for: the game's nine (packages/contracts PlanetRoleSchema), eight
// films (the two Disablers share one, frame for frame, but for the title's name). Each role is its
// name and its film: the mark on the card on the desk (the Doctor's, a medical cross, at the owner's
// word), the gadget the opener's character takes, its three panels and its narration. A role carries
// pictures and words, never times, and nothing of its team. The Doctor's is the pilot the owner
// approved (8 November 2026); the other films are drawn from it, each from its storyboard approved
// on 6 November.

import { ALIEN } from './alien.mjs';
import { DISABLER } from './disabler.mjs';
import { DOCTOR } from './doctor.mjs';
import { ENGINEER } from './engineer.mjs';
import { HACKER } from './hacker.mjs';
import { INSIDER } from './insider.mjs';
import { SUPPLIER } from './supplier.mjs';
import { UNDERCOVER } from './undercover.mjs';

const role = (id, name, film) => Object.freeze({ id, name, ...film });

export const ROLES = Object.freeze({
  doctor: role('doctor', 'Doctor', DOCTOR),
  insider: role('insider', 'Insider', INSIDER),
  'blue-disabler': role('blue-disabler', 'Blue Disabler', DISABLER),
  'red-disabler': role('red-disabler', 'Red Disabler', DISABLER),
  supplier: role('supplier', 'Supplier', SUPPLIER),
  engineer: role('engineer', 'Engineer', ENGINEER),
  undercover: role('undercover', 'Undercover', UNDERCOVER),
  hacker: role('hacker', 'Hacker', HACKER),
  alien: role('alien', 'Alien', ALIEN),
});
