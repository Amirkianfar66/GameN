// Runtime drawing port of Claude 1fbdb541ec4b8389dcf2220125b4666278a12b0e; source design/board-v2/fx/medical-four.mjs.
// Only development fence and relative imports adapted; canonical source preserved.
//
// The Hospital's medical films on the four-berth ward (the owner's four-bed decision of 18
// October 2026, HOSPITAL-4-2026-10-18, issue #155): where each of the four berths' furniture is,
// so that #158's films (./medical.mjs, ../films/medical.mjs) play on it unchanged. The films, their
// art and their timings are #158's; only the berths' geometry is the four-berth ward's
// (../scenes/hospital-ward-four.mjs). ./medical.mjs and ../films/medical.mjs are unchanged for the
// current release.
//
// A successor match keeps the roster-sized clinical anchors, HV1 to HV7, HV8 or HV9 with slotCount
// the starting roster, whatever its four beds (Integration's accepted boundary on issue #155). The
// films need one place per bed: fourClinicalBerth() reads HV1 to HV4 as the beds H1 to H4 whose
// geometry a film uses. A film plays only where no other seat holds that bed in the published
// snapshot (fourFilmBerth(), the rule of ../films/medical.mjs's filmBerth()), and an anchor beyond
// the four beds, a valid presentation with no drawable berth, plays none: the outcome's words stand
// alone. Nothing here takes a role, a side or a cause.

import { DOCK, DRONE_SCENE, hoverAt } from './medical-fx.mjs';
import { RESCUE, rescueFrame } from './medical-film.mjs';
import { FOUR_BACK, FOUR_BEDS, FOUR_BERTHS, FOUR_COLUMNS, FOUR_FRONT, FOUR_ROSTERS, FOUR_ROWS } from './hospital-ward-four.mjs';

/** This module's version (a proposal, beside board-v2-medical-0.1.0, whose films it plays). */
export const MEDICAL_FOUR_VERSION = 'board-v2-medical-four-0.1.1';

// ./medical.mjs's rounding, so that a kit's numbers are its berthKit()'s shape exactly.
const f = n => Number(n.toFixed(2));
const ROW = { back: FOUR_BACK, front: FOUR_FRONT };
/** Where each row's mattress ends: the back row's blanket foot, the front row's at the scene's edge. */
const BED_FOOT = { back: 556, front: 768 };

/**
 * Where a four-berth ward's berth furniture is, in its scene units, in the shape of ./medical.mjs's
 * berthKit(): its monitor, status lamp, plate, bed light and bed, as the four-berth ward draws them
 * (the roster-sized ward's headboardKit() and floorBack(), at this ward's rows), the patient's chest
 * (the berth's press point) and the drone's hover point over it.
 */
export function fourBerthKit(id) {
  const berth = FOUR_BERTHS.find(entry => entry.id === id);
  if (!berth) throw new Error(`No berth ${id} in the four-berth ward`);
  const c = FOUR_COLUMNS[berth.column];
  const { top: y, half, pillowY, k } = ROW[berth.row];
  const [x0, x1] = [c - half, c + half];
  const w = 40 * k, h = 24 * k;
  const chest = FOUR_ROWS[berth.row];
  return Object.freeze({
    id: berth.id, row: berth.row, column: berth.column, c, k,
    monitor: Object.freeze({ x: f(x1 - 8 * k - w), y: f(y + 4 * k), w: f(w), h: f(h) }),
    lamp: Object.freeze({ cx: f(x0 + 47 * k), cy: f(y + 13.5 * k), r: f(5 * k) }),
    plate: Object.freeze({ x: f(x0 + 8 * k), y: f(y + 6 * k), w: f(28 * k), h: f(15 * k) }),
    bedLight: Object.freeze({ cx: c, cy: f(y + 40 * k), rx: f(46 * k), ry: f(22 * k) }),
    bed: Object.freeze({ x: f(c - 56 * k), y: f(pillowY), w: f(112 * k), h: f(BED_FOOT[berth.row] - pillowY) }),
    chest: Object.freeze([c, chest]),
    scale: berth.scale,
    hover: Object.freeze([c, f(chest - DRONE_SCENE.reach * berth.scale)]),
  });
}

/** Every berth's kit: the same four for 7, 8 and 9 players. */
export const fourBerthKits = () => FOUR_BERTHS.map(berth => fourBerthKit(berth.id));

/**
 * A clinical anchor's number, failing closed: an anchorId of the form HV1 to HV9 and, where the
 * anchor carries one, a slotCount that is a successor roster (7, 8 or 9) and not below that number.
 * The successor keeps the roster-sized clinical namespace whatever its four beds (Integration on
 * issue #155): HV1 to HV7, HV8 or HV9. This is no wire validation, which the caller does first.
 */
function anchorNumber(anchor) {
  const anchorId = typeof anchor === 'string' ? anchor : anchor?.anchorId;
  if (!/^HV[1-9]$/.test(anchorId ?? '')) throw new Error(`No clinical anchor ${anchorId}`);
  const n = Number(anchorId.slice(2));
  const slotCount = typeof anchor === 'string' ? undefined : anchor.slotCount;
  if (slotCount !== undefined && (!FOUR_ROSTERS.includes(slotCount) || n > slotCount)) throw new Error(`${anchorId} with slotCount ${slotCount} is no clinical anchor of a successor match`);
  return n;
}

/**
 * The bed a clinical anchor names on the four-berth ward: HVn names bed Hn, n from 1 to 4. It is
 * strict: anything else throws, an anchor beyond the four beds included, since that names no bed
 * (fourFilmBerth() declines it before asking).
 */
export function fourClinicalBerth(anchor) {
  const n = anchorNumber(anchor);
  if (n > FOUR_BEDS) throw new Error(`HV${n} names no bed of a four-berth ward`);
  return `H${n}`;
}

/**
 * Where a clinical film plays on the four-berth ward and whether it can: at the bed its anchor
 * names, unless another seat holds that bed in the published snapshot (../films/medical.mjs's
 * filmBerth() rule). The anchor is one the caller has already validated on the wire: this neither
 * validates nor authorizes one. An authorized anchor beyond the four beds (HV5 and up, a valid
 * presentation with no drawable berth) declines here, before the bed is asked for: berth null, no
 * film, never a fifth bed or another subject's. Where no film plays, the outcome's words stand
 * alone. Anything that is not a clinical anchor still throws. seats are the snapshot's
 * ({ seat, slotId }), bodies included, and subject the outcome's seat, in the same identity: a
 * caller maps the wire's seatId to it first.
 */
export function fourFilmBerth(anchor, seats, subject) {
  if (anchorNumber(anchor) > FOUR_BEDS) return { berth: null, plays: false, holder: null };
  const berth = fourClinicalBerth(anchor);
  const holder = seats.find(seat => seat.slotId === berth && seat.seat !== subject)?.seat ?? null;
  return { berth, plays: holder === null, holder };
}

// ../films/medical.mjs's own easing, the same definitions.
const clamp01 = v => Math.max(0, Math.min(1, v));
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
const easeInOut = v => (v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2);
const lerp = (a, b, v) => a + (b - a) * v;
const hundredth = v => Math.round(v * 100) / 100 || 0;

/**
 * The drone's lens at t over a four-berth ward's berth: ../films/medical.mjs's dronePosition(),
 * the same path from the same dock with the same timings and bob, to this ward's hover point.
 */
export function fourDronePosition(t, berthId, fit = 1) {
  const R = RESCUE;
  const hover = hoverAt(fourBerthKit(berthId), fit);
  if (t < R.arrive[0] || t >= R.depart[1]) return null;
  const at = v => [lerp(DOCK[0], hover[0], v), lerp(DOCK[1], hover[1], v)];
  if (t < R.arrive[1]) return at(easeInOut(ramp(t, ...R.arrive)));
  const departFrom = R.depart[0] + 100;
  if (t >= departFrom) return at(1 - easeInOut(ramp(t, departFrom, R.depart[1])));
  const bob = R.hoverBob.amplitude * Math.sin((2 * Math.PI * (t - R.arrive[1])) / R.hoverBob.periodMs);
  return [hover[0], hundredth(hover[1] + bob)];
}

/**
 * The rescue (S5) at t on a four-berth ward's berth: ../films/medical.mjs's rescueFrame(), every
 * field as it gives it, but the drone's lens over this ward's berth (fourDronePosition(); in the
 * reduced variant, still at the hover point). The check holds every other field to #158's frame.
 */
export function fourRescueFrame(t, berthId, options = {}) {
  const frame = rescueFrame(t, 'H1', options);
  const fit = options.fit ?? 1;
  const at = frame.drone.at === null ? null : options.reduced ? hoverAt(fourBerthKit(berthId), fit) : fourDronePosition(t, berthId, fit);
  return { ...frame, drone: { ...frame.drone, at } };
}
