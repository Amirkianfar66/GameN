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
import { berthPlaces, cameraFrame, releasePath, rescueCinematicFrame } from './film.mjs';
import { FOUR_BERTHS } from '../../../board-v2/scenes/hospital-ward-four.mjs';
import { fourBerthKit } from '../../../board-v2/fx/medical-four.mjs';
import { walkingPose } from '../../../board-v2/figures/capsule.mjs';
import { slotsOf } from '../../../board-v2/scenes/slots.mjs';
import { SCENES } from '../../../board-motion/scenes/index.mjs';
import { INJURED, STILL, skeletonOf } from '../../../board-motion/figures/gestures.mjs';
import { blend } from '../../../board-motion/figures/motion.mjs';
import { outfitFor } from '../../../board-motion/figures/wardrobe.mjs';
import { fxDefs, grade, letterbox, lightPool, vignette } from '../../lib/comic.mjs';
import { bell, clamp, easeOutBack, easeOutCubic, lerp2, r2 } from '../../lib/ease.mjs';
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
/**
 * The pass's own layers' z-index. On the board (a phone's or the display's Hospital panel, the default
 * in every phase) they all sit under the name tags (3500), markers, press areas (4000), slot hits
 * (4200), the room label (5000) and the bars, and the grade tints only the room's art (over the back
 * picture at 0, under the berths and figures): nothing a player selects or reads is covered. The
 * approved S5 layers (inset 3640, drone 3660, pulse 3665: baseItems()) keep their own z and their
 * keep-clear geometry. In the display cut (one SVG of its own) the pass keeps its cinematic order.
 */
export const PASS_Z = Object.freeze({
  board: Object.freeze({ grade: 1, alarm: 2995, searchlight: 3000, beep: 3001, scanFan: 3480, trail: 3482, charge: 3484, accents: 3486 }),
  display: Object.freeze({ grade: 2990, alarm: 2995, searchlight: 3000, beep: 3001, scanFan: 3644, trail: 3655, charge: 3662, accents: 3670 }),
});

/**
 * The pass's own layers. On the board, keepClear (rects in scene units: the other occupants' berths
 * and the room label, the approved S5 controller's keep-clear areas) masks every pass layer, so no
 * light, ring, spark or glow crosses another occupant's berth or the label; the lettering (THUMP,
 * BEEP) belongs to the display cut alone.
 */
export function passItems(frame, { berthId, surface, prefix, keepClear = [] }) {
  const { kit, chest, scale } = berthPlaces(berthId);
  const lens = frame.base.drone?.at ?? null;
  const Z = surface === 'board' ? PASS_Z.board : PASS_Z.display;
  const mask = surface === 'board' && keepClear.length > 0 ? `${prefix}-keep` : null;
  const items = [];
  const push = (z, svg, kind) => { if (svg) items.push({ z, svg: mask && kind !== 'iris' ? `<g mask="url(#${mask})">${svg}</g>` : svg, kind }); };
  if (mask) {
    const holes = keepClear.map(r => `<rect x="${f(r.x)}" y="${f(r.y)}" width="${f(r.w)}" height="${f(r.h)}" fill="#000"/>`).join('');
    items.push({ z: Z.grade, kind: 'keep-mask', svg: `<defs><mask id="${mask}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="-1024" y="-768" width="3072" height="2304"><rect x="-1024" y="-768" width="3072" height="2304" fill="#fff"/>${holes}</mask></defs>` });
  }
  push(5, irisSvg(prefix, frame.hatch), 'iris');
  push(Z.grade, grade({ width: 1024, height: 768, color: '#F2A33A', amount: frame.grade.alert, mode: 'multiply' }), 'grade-alert');
  push(Z.grade + (surface === 'board' ? 0 : 1), grade({ width: 1024, height: 768, color: '#6FE3B0', amount: frame.grade.calm, mode: 'soft-light' }), 'grade-calm');
  push(Z.alarm, alarmSvg(prefix, frame.alarm, { lamp: kit.lamp, scale }), 'alarm');
  push(Z.searchlight, searchlightSvg(prefix, frame.searchlight), 'searchlight');
  push(Z.beep, beepSvg(prefix, frame.beep, { monitor: kit.monitor, scale, surface }), 'beep');
  push(Z.scanFan, scanFanSvg(prefix, { ...frame.scanFan, cx: kit.c }), 'scan-fan');
  push(Z.trail, trailSvg({ trail: frame.trail, scale }), 'trail');
  push(Z.charge, chargeSvg(prefix, { lens, v: frame.charge, scale }), 'charge');
  push(Z.accents, pulseAccentsSvg(prefix, frame, { chest, scale, surface }), 'pulse-accents');
  return items;
}

/**
 * The release, in scene units: the patient off the bed and out of the ward (film.mjs releasePath()).
 * Standing: the recovered pose at the berth blended into the approved standing gesture beside the bed,
 * in front of the bed's own layer once clear of it. Walking: the approved walk (a detained patient's
 * with the hands together, as the capsule's prisoners walk), toward the nearer edge, fading there.
 * Nothing once the patient has gone: the berth is empty, as the board draws it.
 */
export function releaseItems(frame, { berthId, character, prefix = 'r', detained = false }) {
  const rel = frame.release;
  if (!rel || rel.phase === 'gone' || rel.opacity <= 0) return [];
  const slot = WARD_SLOTS[berthId];
  const path = releasePath(berthId);
  const opacity = rel.opacity;
  if (rel.phase === 'stand') {
    const seated = blendedPose(slot, RECOVERED_GESTURE, RECOVERED_GESTURE, 1);
    const v = rel.stand;
    return figureItems({ character, sk: blend(seated.sk, skeletonOf('stand'), v), outfit: 'gown', at: lerp2(seated.at, path.stand, v), scale: slot.scale, mirror: path.mirror, depth: v < 0.5 ? slot.depth : path.depth, prefix, opacity });
  }
  const sk = walkingPose(rel.cycle, { jailed: detained });
  return figureItems({ character, sk, outfit: 'gown', at: lerp2(path.stand, path.exit, rel.walk), scale: path.scale, mirror: path.mirror, depth: path.depth, prefix, opacity });
}

/** Every item of the frame in scene units: the ward without its subject is the caller's (wardItems()). */
export function filmItems(frame, { berthId, character, surface, prefix = 'c', inset = null, fit = 1, detained = false, keepClear = [] }) {
  const kit = fourBerthKit(berthId);
  if (frame.done) return [];
  const released = frame.release && frame.release.phase !== 'bed';
  return [
    ...baseItems(frame.base, kit, { fit, inset, drone: frame.drone, prefix }),
    ...(released ? releaseItems(frame, { berthId, character, prefix: `${prefix}r`, detained }) : patientItems(frame, { berthId, character, prefix: `${prefix}p` })),
    ...passItems(frame, { berthId, surface, prefix, keepClear }),
  ];
}

// ---------- the closing panel: the patient at the place the snapshot gives ----------

const kebab = id => id.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
const LOCATIONS = Object.freeze({ 'command-room': 'Command Room', 'room-a': 'Room A', 'room-b': 'Room B', hospital: 'Hospital', jail: 'Jail' });

/**
 * A room as the board draws it (page.js scenePictures() and drawFigure()), in its scene units: its
 * back, its layers, and its occupants at their places in their health and their location's clothes.
 * The subject is drawn `lift` scene units above its place (its settle).
 */
export function roomItems(room, seats, { roster, assets, prefix, subjectSeat = null, lift = 0 }) {
  const scene = SCENES[room];
  const items = [scenePicture(`${assets}/${room}.back.svg`, 0)];
  for (const [id, layer] of Object.entries(scene.layers ?? {})) items.push(scenePicture(`${assets}/${room}.${kebab(id)}.svg`, Math.round(layer.depth) * 2 + 1));
  const slots = new Map(slotsOf(room, roster).map(slot => [slot.id, slot]));
  for (const seat of seats) {
    const slot = slots.get(seat.slot);
    if (!slot) throw new Error(`No ${room} slot ${seat.slot}`);
    const gesture = seat.health === 'Eliminated' ? slot.down : seat.health === 'Injured' ? `${slot.gesture}${INJURED}` : slot.gesture;
    const at = seat.seat === subjectSeat ? [slot.at[0], slot.at[1] - lift] : slot.at;
    items.push(...figureItems({ character: seat.character, sk: skeletonOf(gesture), outfit: outfitFor(LOCATIONS[room]), at, scale: slot.scale, mirror: slot.mirror, depth: slot.depth, prefix: `${prefix}${seat.seat}` }));
  }
  return items;
}

/** The closing panel's box on the display, and its camera (pixels per scene unit) on the destination. */
export const PANEL = Object.freeze({ x: 1150, y: 150, w: 690, h: 780, border: 10, k: 1.5 });

/**
 * The display's closing panel at frame.panel (0..1): a comic panel slid in from the right with the
 * destination room framed on the patient's place: the patient there, in that room's clothes (a free
 * patient in Room A or B in crew clothes, a detained one in the Jail in prison clothes), settling,
 * a warm pool of light at their feet. No words: the client's own sentence names the outcome.
 * destination: { room, slotId, seats (the room's occupants in the snapshot), subjectSeat }.
 */
export function destinationPanel(frame, { destination, roster, assets, prefix, width = 1920 }) {
  if (!destination || frame.panel <= 0) return '';
  const slot = slotsOf(destination.room, roster).find(entry => entry.id === destination.slotId);
  if (!slot) throw new Error(`No ${destination.room} slot ${destination.slotId}`);
  const { x, y, w, h, border, k } = PANEL;
  const cw = w / k, ch = h / k;
  const cx = clamp(slot.at[0], cw / 2, 1024 - cw / 2), cy = clamp(slot.at[1] - 120 * slot.scale, ch / 2, 768 - ch / 2);
  const slide = (1 - easeOutBack(frame.panel, 1.15)) * (width - x + 60);
  const lift = 9 * (1 - easeOutCubic(frame.arrive));
  const items = [
    ...roomItems(destination.room, destination.seats, { roster, assets, prefix: `${prefix}d`, subjectSeat: destination.subjectSeat, lift }),
    { z: Math.round(slot.depth) * 2 - 1, svg: lightPool(prefix, 'arrive', { cx: slot.at[0], cy: slot.at[1], rx: 78 * slot.scale, ry: 20 * slot.scale, color: '#F2C14E', opacity: 0.5 * easeOutCubic(frame.panel) }) },
  ];
  return `<g transform="translate(${f(slide)} 0)">`
    + `<rect x="${x - border + 8}" y="${y - border + 10}" width="${w + 2 * border}" height="${h + 2 * border}" fill="#05070B" opacity="0.55"/>`
    + `<rect x="${x - border}" y="${y - border}" width="${w + 2 * border}" height="${h + 2 * border}" fill="#F4EBDD" stroke="#151923" stroke-width="5"/>`
    + `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${f(cx - cw / 2)} ${f(cy - ch / 2)} ${f(cw)} ${f(ch)}" overflow="hidden">${compose(items)}</svg>`
    + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#151923" stroke-width="4"/>`
    + `</g>`;
}

/**
 * The display's cinematic cut at t: one 1920 x 1080 SVG. occupants: the Hospital's other occupants
 * in the snapshot; subject: { seat, character, detained }; destination: where the snapshot places
 * the patient ({ room, slotId, seats, subjectSeat }), or null if it still has them at this berth.
 * Returns { svg, frame }.
 */
export function displaySvg(t, { berthId, subject, occupants, variant = 'full', assets, roomAssets = assets, destination = null, roster = 9, width = 1920, height = 1080 }) {
  const prefix = 'hd';
  const leaves = Boolean(destination) && destination.room !== 'hospital';
  const frame = rescueCinematicFrame(t, berthId, { variant, surface: 'display', leaves });
  const camera = frame.camera ?? { center: [512, 410], zoom: 1.9, shake: [0, 0] };
  const { k, center } = cameraFrame(camera, { width, height });
  // After its last frame the cut holds the snapshot's state: the berth empty when the patient has
  // left (the board draws them at their place), or the recovered patient at the berth if the
  // snapshot still has them there.
  const recovered = { patient: { blend: 1, settle: 1, jolt: [0, 0] } };
  const scene = compose([
    ...wardItems({ occupants, assets, prefix: `${prefix}w` }),
    ...(frame.done ? (leaves ? [] : patientItems(recovered, { berthId, character: subject.character, prefix: `${prefix}pd` })) : filmItems(frame, { berthId, character: subject.character, surface: 'display', prefix, detained: Boolean(subject.detained) })),
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
    + (leaves && !frame.done ? destinationPanel(frame, { destination, roster, assets: roomAssets, prefix, width }) : '')
    + letterbox({ width, height, h: bars })
    + `</svg>`;
  return { svg, frame };
}

/** The four berths' ids, for a gallery's berth switch. */
export const BERTH_IDS = FOUR_BERTHS.map(berth => berth.id);
export { STILL };
