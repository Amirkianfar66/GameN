// mothership:dev-only
//
// The roles the films are made for: the game's nine (packages/contracts PlanetRoleSchema), eight
// films (the two Disablers share one, frame for frame, but for the title). Each role is its name, its
// team and its film: the mark on the card on the desk (the Doctor's, a medical cross, at the owner's
// word), the gadget the opener's character takes, its three panels and its narration. A role carries
// pictures and words, never times. Its team colours its title alone, at the owner's word (8 November
// 2026: "for red team roles like undercover , Hacker, red disabler the text you should use plain red
// ... and for alien this become purple"). The Doctor's is the pilot the owner approved; the other
// films are drawn from it, each from its storyboard approved on 6 November.

import { ALIEN } from './alien.mjs';
import { DISABLER } from './disabler.mjs';
import { DOCTOR } from './doctor.mjs';
import { ENGINEER } from './engineer.mjs';
import { HACKER } from './hacker.mjs';
import { INSIDER } from './insider.mjs';
import { SUPPLIER } from './supplier.mjs';
import { UNDERCOVER } from './undercover.mjs';

const role = (id, name, team, film) => Object.freeze({ id, name, team, ...film });

export const ROLES = Object.freeze({
  doctor: role('doctor', 'Doctor', 'blue', DOCTOR),
  insider: role('insider', 'Insider', 'blue', INSIDER),
  'blue-disabler': role('blue-disabler', 'Blue Disabler', 'blue', DISABLER),
  'red-disabler': role('red-disabler', 'Red Disabler', 'red', DISABLER),
  supplier: role('supplier', 'Supplier', 'blue', SUPPLIER),
  engineer: role('engineer', 'Engineer', 'blue', ENGINEER),
  undercover: role('undercover', 'Undercover', 'red', UNDERCOVER),
  hacker: role('hacker', 'Hacker', 'red', HACKER),
  alien: role('alien', 'Alien', 'alien', ALIEN),
});
