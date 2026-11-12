// mothership:dev-only
//
// The Supply Room at one moment: the inked room (./room.mjs), the crane (./machine.mjs) and the two
// operators from the crew rig, composed from a pose. A pose says where every moving part is (the
// panel along the rail, its blade, the crate in the picture with its tilt, the platform), which lamps
// are lit, who is down and which effects show; ./stage.mjs makes poses from the Task's states over
// time. The same drawing serves the participants' phones, the storyboards and the films.

import { dressedFigureSvg } from '../crew-drawing/source/wardrobe.mjs';
import { CREW } from '../crew-drawing/source/crew.mjs';
import { skeletonOf } from '../board-motion/figures/gestures.mjs';
import { BLADE, BOX, BOXES, CARRIAGE, CRATE, OPERATORS, REST, TAGS, stopX } from './layout.mjs';
import { supplyRoomSvg } from './room.mjs';
import * as M from './machine.mjs';

let back = null;
/** The inked room, drawn once. */
export const roomBack = () => (back ??= supplyRoomSvg());

/** The rest pose: the Task's start, nothing moving. The crate is in pixels; the panel in stops. */
export const restPose = () => ({
  panel: { at: 0, blade: BLADE.locked, wheel: 0, drum: 0, lit: 0 },
  crate: { x: stopX(0), y: REST.intake, tilt: 0, hooked: true },
  hookY: null, slack: 0,
  cab: { lamp: false, key: false, cut: false, buffer: 0 },
  console: { lamp: false, key: false, locked: true, near: 0 },
  platform: { drop: 0, clamp: false, lamp: false },
  alive: { winch: true, panel: true },
  effects: [], line: null, tags: null, dim: 0,
});

const figures = new Map();
/** One operator from the crew rig, at their station: alive at their controls, or slumped over them. */
export function operatorSvg(role, character, { down = false, prefix = 'op', layer = 'body' } = {}) {
  const key = [role, character, down, prefix, layer].join('|');
  if (!figures.has(key)) figures.set(key, drawOperator(role, character, { down, prefix, layer }));
  return figures.get(key);
}

function drawOperator(role, character, { down, prefix, layer }) {
  const o = OPERATORS[role];
  const svg = dressedFigureSvg(CREW[character], skeletonOf(down ? o.down : o.gesture), { outfit: 'crew', prefix: `${prefix}-${role}`, layer });
  const [fx, fy] = o.feet, s = o.scale;
  // The rig's frame: box -90 -40 300 300, its anchor at x 62 on the floor line y 233.
  const x = fx - (62 + 90) * s, y = fy - (233 + 40) * s;
  return svg.replace(/^<svg([^>]*?) viewBox="([^"]*)"[^>]*>/, (_, attrs, vb) => `<svg${attrs.replace(/ (?:width|height|preserveAspectRatio)="[^"]*"/g, '')} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(300 * s).toFixed(1)}" height="${(300 * s).toFixed(1)}" viewBox="${vb}">`);
}

/**
 * The scene as SVG at the picture's size. characters: { winch, panel } (crew ids). prefix: unique
 * per scene on a page. crop: [x, y, w, h], to show only part of the picture (the phone's view).
 */
export function sceneSvg(pose, { characters = { winch: 'c2', panel: 'c6' }, prefix = 'sc', crop = null, width = null, back = true } = {}) {
  const cv = M.inkCanvas(prefix);
  const px = stopX(pose.panel.at);
  M.festoon(cv, px);
  M.platform(cv, { drop: pose.platform.drop, clamp: pose.platform.clamp, lampLit: pose.platform.lamp, part: 'base' });
  // The cab, with the Winch operator inside it: the figure kept to the cab's inside.
  M.cabBack(cv);
  const [cx, cy, cw, ch] = BOXES.cab;
  cv.def(`<clipPath id="${prefix}-cab-inside"><rect x="${cx}" y="${cy + 18}" width="${cw}" height="${ch - 18}"/></clipPath>`);
  cv.raw(`<g clip-path="url(#${prefix}-cab-inside)">${operatorSvg('winch', characters.winch, { down: !pose.alive.winch, prefix })}</g>`);
  M.cabFront(cv, { cut: pose.cab.cut, lampLit: pose.cab.lamp, key: pose.cab.key, buffer: pose.cab.buffer });
  // The Panel operator at the console.
  cv.raw(operatorSvg('panel', characters.panel, { down: !pose.alive.panel, prefix }));
  M.consoleFront(cv, { lampLit: pose.console.lamp, key: pose.console.key, locked: pose.console.locked, near: pose.console.near });
  // The rail's painted stops, then the panel's carriage on it.
  M.stopPlates(cv, { lit: pose.panel.lit });
  M.carriage(cv, px, { blade: pose.panel.blade, wheel: pose.panel.wheel, drum: pose.panel.drum });
  // The cable and the hook: to the crate when it is on the hook, or the empty hook under the panel.
  const pivot = [px, CARRIAGE.pivot];
  const c = pose.crate;
  if (c && c.hooked) {
    const eye = [c.x + Math.sin(c.tilt) * (CRATE / 2 + 6), c.y - Math.cos(c.tilt) * (CRATE / 2 + 6)];
    M.cable(cv, pivot, [eye[0] + Math.sin(c.tilt) * 34, eye[1] - Math.cos(c.tilt) * 34], { slack: pose.slack });
    M.hook(cv, eye[0], eye[1], { engaged: true, tilt: c.tilt });
  } else {
    const hy = pose.hookY ?? 300;
    M.cable(cv, pivot, [px, hy - 34]);
    M.hook(cv, px, hy, { engaged: false });
  }
  if (pose.line) M.dropLine(cv, pose.line.from, pose.line.to, { tone: pose.line.tone, t: pose.line.t ?? 1 });
  if (c) M.crate(cv, c.x, c.y, { tilt: c.tilt });
  M.platform(cv, { drop: pose.platform.drop, clamp: pose.platform.clamp, part: 'jaws' });
  for (const e of pose.effects) {
    if (e.kind === 'letters') M.letters(cv, e.text, e.at, e);
    else if (e.kind === 'burst') M.burst(cv, e.at, e.r, e.t, e);
    else if (e.kind === 'speed') M.speed(cv, e.at, e.dir, e);
    else if (e.kind === 'clunk') M.clunk(cv, e.at, e.dir, e.t);
    else if (e.kind === 'brake') M.brake(cv, e.at);
    else if (e.kind === 'warn') M.warnMark(cv, e.at, e.t ?? 1);
  }
  if (pose.tags) for (const role of ['winch', 'panel']) if (pose.tags[role]) M.tag(cv, TAGS[role], pose.tags[role].number, pose.tags[role].name, { down: !pose.alive[role] });
  if (pose.dim > 0) cv.raw(`<rect width="${BOX[0]}" height="${BOX[1]}" fill="#10141C" opacity="${(pose.dim * 0.55).toFixed(3)}"/>`);
  const [vx, vy, vw, vh] = crop ?? [0, 0, BOX[0], BOX[1]];
  const size = width ? ` width="${width}" height="${Math.round(width * vh / vw)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}"${size}>${back ? `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#10141C"/>${roomBack()}` : ''}<defs>${cv.defs()}</defs>${cv.layer('body')}</svg>`;
}
