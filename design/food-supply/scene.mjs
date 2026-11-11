// mothership:dev-only
//
// The Supply Room at one moment: the inked room (./room.mjs), the machine (./machine.mjs) and the
// two operators from the crew rig, composed from a pose. A pose says where every moving part is
// (fractional columns and rows while something moves), which lamps are lit, who is down and which
// effects show; ./stage.mjs makes poses from the Task's states over time. The same drawing serves
// the participants' phones, the storyboards and the films.

import { dressedFigureSvg } from '../crew-drawing/source/wardrobe.mjs';
import { CREW } from '../crew-drawing/source/crew.mjs';
import { skeletonOf } from '../board-motion/figures/gestures.mjs';
import { FIXTURES } from './task.mjs';
import { BOX, BOXES, OPERATORS, TAGS, carriageX, crateY, CRATE } from './layout.mjs';
import { supplyRoomSvg } from './room.mjs';
import * as M from './machine.mjs';

let back = null;
/** The inked room, drawn once. */
export const roomBack = () => (back ??= supplyRoomSvg());

/** The rest pose: the Task's start, nothing moving. */
export const restPose = () => ({
  gantry: FIXTURES.intake.col, crate: { col: FIXTURES.intake.col, row: 0 }, docked: false, hookRow: 0,
  tilt: 0, slack: 0, wheel: 0, drum: 0,
  cradle: { rise: 0, closed: false, lamp: false },
  keys: { hoist: false, boom: false }, lamps: { cab: false, pulpit: false },
  cab: { crushed: false, caught: 0 }, plate: { dented: false, nudge: 0 },
  alive: { hoist: true, boom: true },
  effects: [], guide: null, warnings: { drop: 0, ram: 0 }, tags: null, dim: 0,
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

/** The cells' centres along the cooperative route from the crate's place to the cradle. */
export function routePath(crate) {
  if (!crate) return [];
  const cells = [[crate.col, crate.row]];
  let [c, r] = [Math.round(crate.col), Math.round(crate.row)];
  if (c < FIXTURES.cradle.col) {
    if (c <= FIXTURES.rib.col || r < 3) { r = 3; cells.push([c, r]); }
    c = FIXTURES.cradle.col; cells.push([c, r]);
  }
  if (r > FIXTURES.cradle.row) { r = FIXTURES.cradle.row; cells.push([c, r]); }
  return cells.filter((p, i, all) => i === 0 || p[0] !== all[i - 1][0] || p[1] !== all[i - 1][1]).map(([col, row]) => [carriageX(col), crateY(row)]);
}

/**
 * The scene as SVG at the picture's size. characters: { hoist, boom } (crew ids). prefix: unique
 * per scene on a page. crop: [x, y, w, h], to show only part of the picture (the phone's view).
 */
export function sceneSvg(pose, { characters = { hoist: 'c2', boom: 'c6' }, prefix = 'sc', crop = null, width = null, back = true } = {}) {
  const cv = M.inkCanvas(prefix);
  const gx = carriageX(pose.gantry);
  M.cabBack(cv, { crushed: pose.cab.crushed });
  cv.raw(operatorSvg('hoist', characters.hoist, { down: !pose.alive.hoist, prefix }));
  M.cabFront(cv, { crushed: pose.cab.crushed, lampLit: pose.lamps.cab, key: pose.keys.hoist, caught: pose.cab.caught });
  M.festoon(cv, gx + pose.plate.nudge);
  M.gantry(cv, gx, { wheel: pose.wheel, drum: pose.drum, dented: pose.plate.dented, nudge: pose.plate.nudge });
  M.boomKey(cv, { turned: pose.keys.boom });
  M.cradle(cv, { rise: pose.cradle.rise, closed: false, lampLit: pose.cradle.lamp, part: 'back' });
  cv.raw(operatorSvg('boom', characters.boom, { down: !pose.alive.boom, prefix }));
  M.consoleFront(cv, { wheel: pose.wheel, lampLit: pose.lamps.pulpit });
  // The crate dropped on the Boom operator comes to rest on the console, over them.
  const resting = pose.crate && !pose.alive.boom && Math.round(pose.crate.col) === FIXTURES.pulpit.col && pose.crate.row <= FIXTURES.pulpit.head;
  const crateAt = pose.crate && [carriageX(pose.crate.col), resting ? BOXES.console[1] - CRATE / 2 + 4 : crateY(pose.crate.row) - pose.cradle.rise * 532];
  if (pose.crate && !pose.docked) {
    const hookY = crateAt[1] - CRATE / 2 - 6;
    M.cable(cv, crateAt[0], hookY, { slack: pose.slack });
    M.hook(cv, crateAt[0], hookY, { engaged: true });
  } else {
    const hookY = crateY(pose.hookRow ?? 3.4) - CRATE / 2 - 6;
    M.cable(cv, gx, hookY);
    M.hook(cv, gx, hookY, { engaged: false });
  }
  if (pose.warnings.drop > 0 && crateAt) M.dropLine(cv, [crateAt[0], crateAt[1] + CRATE / 2 + 6], OPERATORS.boom.head, { t: pose.warnings.drop });
  if (pose.crate) M.crate(cv, crateAt[0], crateAt[1], { tilt: pose.tilt });
  if (pose.docked || pose.cradle.closed) M.cradle(cv, { rise: pose.cradle.rise, closed: true, lampLit: pose.cradle.lamp, part: 'jaws' });
  if (pose.warnings.ram > 0) M.warnMark(cv, [228, 214], pose.warnings.ram);
  if (pose.guide) M.guide(cv, pose.guide.path, { next: pose.guide.next });
  for (const e of pose.effects) {
    if (e.kind === 'letters') M.letters(cv, e.text, e.at, e);
    else if (e.kind === 'burst') M.burst(cv, e.at, e.r, e.t, e);
    else if (e.kind === 'speed') M.speed(cv, e.at, e.dir, e);
    else if (e.kind === 'clunk') M.clunk(cv, e.at, e.dir, e.t);
    else if (e.kind === 'clamp') M.brake(cv, e.at);
  }
  if (pose.tags) for (const role of ['hoist', 'boom']) if (pose.tags[role]) M.tag(cv, TAGS[role], pose.tags[role].number, pose.tags[role].name, { down: !pose.alive[role] });
  if (pose.dim > 0) cv.raw(`<rect width="${BOX[0]}" height="${BOX[1]}" fill="#10141C" opacity="${(pose.dim * 0.55).toFixed(3)}"/>`);
  const [vx, vy, vw, vh] = crop ?? [0, 0, BOX[0], BOX[1]];
  const size = width ? ` width="${width}" height="${Math.round(width * vh / vw)}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}"${size}>${back ? `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#10141C"/>${roomBack()}` : ''}<defs>${cv.defs()}</defs>${cv.layer('body')}</svg>`;
}
