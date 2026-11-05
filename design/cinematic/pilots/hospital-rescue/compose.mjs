// mothership:dev-only
//
// Pilot 1's composition: film.mjs's frame at t drawn as layered SVG, either
//   display   the shared display's cinematic cut, 1920 x 1080: the four-berth ward composed whole
//             (approved scene pictures, berth states, figures by the approved rig), the S5 layers,
//             the cinematic pass, the camera, letterbox, vignette, grade, grain and close-up panel;
//   board     a phone's or the display's Hospital panel: the same layers in scene units, each with
//             the board's z-index, for a stage to put over the board page.js has drawn.
// Inputs are public: the occurrence's subject (seat and character, as the board shows them), its
// berth (fourFilmBerth() has said a film plays there), the Hospital's other occupants from the
// published snapshot, and t. Nothing private is read or drawn.

import { alarmSvg, berthStateItems, baseItems, beepSvg, chargeSvg, ecgPanelSvg, irisSvg, pulseAccentsSvg, scanFanSvg, searchlightSvg, trailSvg } from './art.mjs';
import { berthPlaces, cameraFrame, rescueCinematicFrame } from './film.mjs';
import { FOUR_BERTHS } from '../../../board-v2/scenes/hospital-ward-four.mjs';
import { fourBerthKit } from '../../../board-v2/fx/medical-four.mjs';
import { INJURED, STILL } from '../../../board-motion/figures/gestures.mjs';
import { fxDefs, grade, letterbox, vignette } from '../../lib/comic.mjs';
import { bell, r2 } from '../../lib/ease.mjs';
import { blendedPose, compose, figureItems, scenePicture } from '../../lib/scene.mjs';

const f = v => Number((+v).toFixed(2));

/** The four-berth ward's slots (slots-four.mjs, the successor's table), copied by id for the composition. */
export const WARD_SLOTS = Object.freeze({
  H1: Object.freeze({ id: 'H1', at: [362.7, 694.7], pressAt: [340, 628], depth: 694.7, scale: 1.42, mirror: false, gesture: 'bedLying', down: 'bedLying+still' }),
  H2: Object.freeze({ id: 'H2', at: [682.3, 718], pressAt: [684, 628], depth: 718, scale: 1.42, mirror: true, gesture: 'bedSitting', down: 'bedSitting+still' }),
  H3: Object.freeze({ id: 'H3', at: [341.4, 506.1], pressAt: [340, 430], depth: 506.1, scale: 1.2, mirror: false, gesture: 'bedSitting', down: 'bedSitting+still' }),
  H4: Object.freeze({ id: 'H4', at: [664.8, 486.4], pressAt: [684, 430], depth: 486.4, scale: 1.2, mirror: true, gesture: 'bedLying', down: 'bedLying+still' }),
});
/** The four-berth ward's depth layers (hospital-ward-four.mjs wardFourScene().layers). */
export const WARD_LAYERS = Object.freeze({ 'berth-four-h1-head': 600, 'berth-four-h1': 770, 'berth-four-h2-head': 600, 'berth-four-h2': 770, 'berth-four-h3': 560, 'berth-four-h4': 560 });
/** The healthy pose a recovered patient takes at any berth (medical-view.mjs: 'bedSitting'). */
export const RECOVERED_GESTURE = 'bedSitting';

/** An occupant's drawn gesture at its berth, the board's rule (page.js drawFigure()). */
const occupantGesture = (slot, health) => (health === 'Eliminated' ? slot.down : health === 'Injured' ? `${slot.gesture}${INJURED}` : slot.gesture);

/** A berth's state between films, films/medical.mjs berthState()'s mapping (the lamp amber: no due-round tone on review art). */
const stateOf = health => (health === 'Eliminated' ? { monitor: 'off', lamp: 'off', bedLight: 'off' } : health === 'Injured' ? { monitor: 'unstable', lamp: 'amber', bedLight: 'on' } : { monitor: null, lamp: null, bedLight: 'on' });

/**
 * The ward's own items without the film's subject: the back, the depth layers, every other
 * occupant's figure (gown) and berth state. occupants: [{ seat, character, slot, health }].
 */
export function wardItems({ occupants, assets, prefix = 'w' }) {
  const items = [scenePicture(`${assets}/hospital-ward-four.back.svg`, 0)];
  for (const [id, depth] of Object.entries(WARD_LAYERS)) items.push(scenePicture(`${assets}/hospital-ward-four.${id}.svg`, Math.round(depth) * 2 + 1));
  for (const seat of occupants) {
    const slot = WARD_SLOTS[seat.slot];
    if (!slot) throw new Error(`No four-berth slot ${seat.slot}`);
    const gesture = occupantGesture(slot, seat.health);
    items.push(...figureItems({ character: seat.character, sk: blendedPose(slot, gesture, gesture, 0).sk, outfit: 'gown', at: slot.at, scale: slot.scale, mirror: slot.mirror, depth: slot.depth, prefix: `${prefix}${seat.seat}` }));
    items.push(...berthStateItems(stateOf(seat.health), fourBerthKit(seat.slot)));
  }
  return items;
}

/** The film's subject at its berth: injured, sitting up on the recover beat, a relieved breath after. */
export function patientItems(frame, { berthId, character, prefix = 'p' }) {
  const slot = WARD_SLOTS[berthId];
  const injured = `${slot.gesture}${INJURED}`;
  const { sk, at } = blendedPose(slot, injured, RECOVERED_GESTURE, frame.patient.blend);
  const breath = -1.6 * bell(frame.patient.settle);
  const [jx, jy] = frame.patient.jolt;
  return figureItems({ character, sk, outfit: 'gown', at, scale: slot.scale, mirror: slot.mirror, depth: slot.depth, prefix, offset: [jx, jy + breath] });
}

/** The cinematic pass's items over S5's layers, in scene units. */
export function passItems(frame, { berthId, surface, prefix }) {
  const { kit, chest, scale } = berthPlaces(berthId);
  const lens = frame.base.drone?.at ?? null;
  const items = [];
  const push = (z, svg, kind) => { if (svg) items.push({ z, svg, kind }); };
  push(5, irisSvg(prefix, frame.hatch), 'iris');
  push(2990, grade({ width: 1024, height: 768, color: '#F2A33A', amount: frame.grade.alert, mode: 'multiply' }), 'grade-alert');
  push(2991, grade({ width: 1024, height: 768, color: '#6FE3B0', amount: frame.grade.calm, mode: 'soft-light' }), 'grade-calm');
  push(2995, alarmSvg(prefix, frame.alarm, { lamp: kit.lamp, scale }), 'alarm');
  push(3000, searchlightSvg(prefix, frame.searchlight), 'searchlight');
  push(3001, beepSvg(prefix, frame.beep, { monitor: kit.monitor, scale, surface }), 'beep');
  push(3644, scanFanSvg(prefix, { ...frame.scanFan, cx: kit.c }), 'scan-fan');
  push(3655, trailSvg({ trail: frame.trail, scale }), 'trail');
  push(3662, chargeSvg(prefix, { lens, v: frame.charge, scale }), 'charge');
  push(3670, pulseAccentsSvg(prefix, frame, { chest, scale, surface }), 'pulse-accents');
  return items;
}

/** Every item of the frame in scene units: the ward without its subject is the caller's (wardItems()). */
export function filmItems(frame, { berthId, character, surface, prefix = 'c', inset = null, fit = 1 }) {
  const kit = fourBerthKit(berthId);
  if (frame.done) return [];
  return [
    ...baseItems(frame.base, kit, { fit, inset, drone: frame.drone, prefix }),
    ...patientItems(frame, { berthId, character, prefix: `${prefix}p` }),
    ...passItems(frame, { berthId, surface, prefix }),
  ];
}

/**
 * The display's cinematic cut at t: one 1920 x 1080 SVG. occupants: the Hospital's other occupants
 * in the snapshot; subject: { seat, character }. Returns { svg, frame }.
 */
export function displaySvg(t, { berthId, subject, occupants, variant = 'full', assets, width = 1920, height = 1080 }) {
  const prefix = 'hd';
  const frame = rescueCinematicFrame(t, berthId, { variant, surface: 'display' });
  const camera = frame.camera ?? { center: [512, 410], zoom: 1.9, shake: [0, 0] };
  const { k, center } = cameraFrame(camera, { width, height });
  // After its last frame the cut holds the recovered patient sitting up at the berth, its end state.
  const recovered = { patient: { blend: 1, settle: 1, jolt: [0, 0] } };
  const scene = compose([
    ...wardItems({ occupants, assets, prefix: `${prefix}w` }),
    ...(frame.done ? patientItems(recovered, { berthId, character: subject.character, prefix: `${prefix}pd` }) : filmItems(frame, { berthId, character: subject.character, surface: 'display', prefix })),
  ]);
  const [sx, sy] = camera.shake ?? [0, 0];
  const view = `translate(${f(width / 2 + sx)} ${f(height / 2 + sy)}) scale(${f(k)}) translate(${f(-center[0])} ${f(-center[1])})`;
  const bars = r2(frame.letterbox * height);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-film="${frame.variant}" data-t="${t}">`
    + fxDefs(prefix)
    + `<rect width="${width}" height="${height}" fill="#05070B"/>`
    + `<g transform="${view}">${scene}</g>`
    + vignette(prefix, { width, height, strength: 0.55 })
    + `<rect width="${width}" height="${height}" filter="url(#${prefix}-grain)" opacity="0.55"/>`
    + ecgPanelSvg(prefix, frame.ecg, { x: width - 600, y: height - bars - 320, w: 520, h: 250 })
    + letterbox({ width, height, h: bars })
    + `</svg>`;
  return { svg, frame };
}

/** The four berths' ids, for a gallery's berth switch. */
export const BERTH_IDS = FOUR_BERTHS.map(berth => berth.id);
export { STILL };
