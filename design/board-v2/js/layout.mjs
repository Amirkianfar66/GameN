// mothership:dev-only
//
// The review page's board layout, chosen once from its query: the current release's (./fit.mjs,
// ./turns.mjs and ../scenes/slots.mjs, with the roster-sized ward) or, with &beds=4, the
// successor's (./fit-four.mjs, ./turns-four.mjs and ../scenes/slots-four.mjs, with the four-berth
// ward; the owner's four-bed decision of 18 October 2026, issue #155). Outside a page (Node's
// checks and tests) it is always the current release's.
//
// A review controller, not a port: a client takes the layout its match's tuple names, directly.

import { berthKit } from '../fx/medical.mjs';
import { fourBerthKit, fourFilmBerth, fourRescueFrame } from '../fx/medical-four.mjs';
import { filmBerth, rescueFrame } from '../films/medical.mjs';
import { wardScene } from '../scenes/hospital-ward.mjs';
import { wardFourScene } from '../scenes/hospital-ward-four.mjs';
import * as rosterSlots from '../scenes/slots.mjs';
import * as fourSlots from '../scenes/slots-four.mjs';
import * as rosterFit from './fit.mjs';
import * as fourFit from './fit-four.mjs';
import * as rosterTurns from './turns.mjs';
import * as fourTurns from './turns-four.mjs';

/** Whether the page draws the successor's four-berth board (&beds=4). */
export const FOUR = typeof location !== 'undefined' && new URLSearchParams(location.search).get('beds') === '4';

export const { BOARD_ROOMS, LOCATION_OF, sceneOf, slotsOf } = FOUR ? fourSlots : rosterSlots;
export const { CAPSULE, SHELL, boardRects, fitBoardV2, insetsOf, slotRects } = FOUR ? fourFit : rosterFit;
export const { SHEET, barsShell, boardTargets, sheetPlan, turnsLayout } = FOUR ? fourTurns : rosterTurns;

/**
 * The medical films' berth geometry: #158's on the roster-sized ward, ../fx/medical-four.mjs's on
 * the four-berth ward (its filmBerth() has no roster: the four beds are the same for every roster).
 */
export const MEDICAL_BERTHS = Object.freeze(FOUR
  ? { berthKit: fourBerthKit, filmBerth: (anchor, roster, seats, subject) => fourFilmBerth(anchor, seats, subject), rescueFrame: fourRescueFrame }
  : { berthKit, filmBerth, rescueFrame });

/**
 * The ward's scene and its pictures' file names for a roster: the roster-sized ward's (its back
 * per roster, its berths' layers shared) or the four-berth ward's (the same for every roster).
 */
export function wardPictures(roster) {
  if (FOUR) return { scene: wardFourScene(roster), back: 'hospital-ward-four.back.svg', layer: id => `hospital-ward-four.${id}.svg`, dark: 'hospital-ward-four.dark.svg' };
  return { scene: wardScene(roster), back: `hospital-ward-${roster}.back.svg`, layer: id => `hospital-ward.${id}.svg`, dark: `hospital-ward-${roster}.dark.svg` };
}
