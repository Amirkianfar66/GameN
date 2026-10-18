// Runtime drawing port of Claude cb9386bd716dc346160509d5e49d7348fdaf4f84; source design/board-v2/fx/medical-four.mjs.
// Only development fence and relative imports adapted; canonical source preserved.
//
// The Hospital's medical films on the four-berth ward (the owner's four-bed decision of 18
// October 2026, HOSPITAL-4-2026-10-18, issue #155): where each of the four berths' furniture is,
// so that #158's films (./medical.mjs, ../films/medical.mjs) play on it unchanged. The films, their
// art and their timings are #158's; only the berths' geometry is the four-berth ward's
// (../scenes/hospital-ward-four.mjs). ./medical.mjs and ../films/medical.mjs are unchanged for the
// current release.
//
// The clinical anchor of a successor match is not settled (H4-CLINICAL-01 on draft #157). The
// films need one place per bed: fourClinicalBerth() reads an anchor as the bed whose geometry a film
// uses, HVn for Hn with n from 1 to 4, which is the Designer's proposal on issue #155. A film still
// plays only where no other seat holds that bed in the published snapshot (fourFilmBerth(), the
// rule of ../films/medical.mjs's filmBerth()). Nothing here takes a role, a side or a cause.

import { DOCK, DRONE_SCENE, hoverAt } from './medical-fx.mjs';
import { RESCUE, rescueFrame } from './medical-film.mjs';
import { FOUR_BACK, FOUR_BEDS, FOUR_BERTHS, FOUR_COLUMNS, FOUR_FRONT, FOUR_ROWS } from './hospital-ward-four.mjs';

/** This module's version (a proposal, beside board-v2-medical-0.1.0, whose films it plays). */
export const MEDICAL_FOUR_VERSION = 'board-v2-medical-four-0.1.0';

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
 * The bed a clinical anchor names on the four-berth ward: HVn names bed Hn, n from 1 to 4. A
 * proposal (issue #155): the successor's anchor contract is Backend's and Integration's to settle.
 */
export function fourClinicalBerth(anchor) {
  const anchorId = typeof anchor === 'string' ? anchor : anchor?.anchorId;
  if (!/^HV[1-9]$/.test(anchorId ?? '')) throw new Error(`No clinical anchor ${anchorId}`);
  const n = Number(anchorId.slice(2));
  if (n > FOUR_BEDS) throw new Error(`${anchorId} names no bed of a four-berth ward`);
  return `H${n}`;
}

/**
 * Where a clinical film plays on the four-berth ward and whether it can: at the bed its anchor
 * names, unless another seat holds that bed in the published snapshot (../films/medical.mjs's
 * filmBerth() rule). seats are the snapshot's ({ seat, slotId }); subject is the outcome's seat.
 */
export function fourFilmBerth(anchor, seats, subject) {
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
