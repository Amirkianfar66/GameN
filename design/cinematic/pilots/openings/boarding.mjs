// mothership:dev-only
//
// The boarding (issue #188): exactly 10,000 ms after character selection, role confirmation and
// everyone's Ready, before Round 1. The camera finds the Mothership waiting on a planet at dusk, its
// entrance open and light spilling out; follows the crew (the match's public roster, 7, 8 or 9) as
// they walk to it in pairs and climb the ramp into the light; pushes in as the ramp comes up, the
// door comes down and the hull wakes; cuts inside on the dark, where the ceiling lights wake far to
// near over the crew standing together in the spine corridor and the consoles power up; a brief
// Game N mark, then the comic's ink cut hands over to the game's first view.
// One SVG at the surface's own size: the environment (world.mjs) in parallax layers under the
// camera and the crew (crew.mjs) composited in it. The only input is the public roster.
// Reduced motion: five held pictures, each fading in from the night, nothing moving in them and
// nobody half there in them.

import { vignette } from '../../lib/comic.mjs';
import { NIGHT, grainSvg, revealDefs } from '../role-reveal/art.mjs';
import { breathe } from '../role-reveal/stagecraft.mjs';
import { crewDefs, crewInside, crewOutside, memberSvg } from './crew.mjs';
import { BOARDING_END, CAMERA, boardingFrame, cameraAt } from './film.mjs';
import { publicRoster } from './roster.mjs';
import { BRAND, MARK, handoverWipe, markSvg } from './wordmark.mjs';
import { corridorLayer, dustLayer, fieldLayer, railLayer, skyLayer } from './world.mjs';

const f = v => Number((+v).toFixed(2));
/** What a render draws: everything, the environment alone (no figure) or the crew alone (on nothing). */
export const LAYERS = Object.freeze(['all', 'environment', 'crew']);
/** A surface is narrow (a phone held upright) when it is taller than wide: it takes the narrow camera and group. */
export const isNarrow = (width, height) => width < height;

/** The camera at a frame, on its world's track for the surface. */
export function cameraOf(frame, narrow) {
  const outside = frame.world === 'outside';
  return cameraAt(outside ? (narrow ? CAMERA.narrow : CAMERA.wide) : (narrow ? CAMERA.inside.narrow : CAMERA.inside.wide), frame.at);
}

/** A world layer seen by the camera at `depth` (1: the action's plane; less is farther and moves less). */
function view(cam, width, height, depth, body) {
  if (!body) return '';
  const cx = 800 + (cam.cx - 800) * depth, cy = 450 + (cam.cy - 450) * depth, vh = 900 + (cam.vh - 900) * depth;
  return `<g transform="translate(${f(width / 2)} ${f(height / 2)}) scale(${f(height / vh)}) translate(${f(-cx)} ${f(-cy)})">${body}</g>`;
}

/**
 * A figure's reach around its feet at scale 1, world units: [left, right, top, bottom]. Measured on
 * the rig, every character walking (-40 to 55, mirrored) and standing (51 either side, 239 tall),
 * with room for the outline and the rim.
 */
export const FIGURE_BOX = Object.freeze([-62, 62, -246, 10]);

/** Whether a member's whole figure is inside a width x height frame (the action's plane, depth 1). */
export function wholeInFrame(member, cam, width, height) {
  const k = height / cam.vh;
  const [l, r, top, bottom] = FIGURE_BOX.map(v => v * member.scale);
  const x = v => width / 2 + (v - cam.cx) * k, y = v => height / 2 + (v - cam.cy) * k;
  return x(member.x + l) >= 0 && x(member.x + r) <= width && y(member.y + top) >= 0 && y(member.y + bottom) <= height;
}

/**
 * Reduced motion's held pictures show nobody half there. A member stepping in at the door stands
 * whole against its light until late in the step, then is gone inside; nobody is held mid-fade.
 * A member the frame would cut is out of the picture, still arriving. Places alone decide it.
 */
export function stillCrew(placed, cam, width, height) {
  return placed
    .filter(m => m.state !== 'door' || m.opacity >= 0.5)
    .map(m => (m.opacity < 1 ? { ...m, opacity: 1 } : m))
    .filter(m => wholeInFrame(m, cam, width, height));
}

/** The Game N mark's place and size on a surface: across most of a phone's width, a fifth of a display's height. */
export function titleBox(width, height) {
  const narrow = isNarrow(width, height);
  const scale = narrow ? Math.min((width * 0.7) / MARK.plate[0], (height * 0.15) / MARK.plate[1]) : (height * 0.2) / MARK.plate[1];
  return { cx: width / 2, cy: height * (narrow ? 0.14 : 0.15), scale };
}

/**
 * The boarding at t on a width x height surface (CSS px), for a public roster of 7 to 9:
 * { svg, frame, camera, crew, words }. crew: each drawn member's place ({ seat, character, state,
 * x, y, scale, light, opacity }, world units). words: the mark's exact name and when it shows.
 */
export function boardingSvg(t, { variant = 'full', roster, width = 390, height = 844, prefix = 'gb', layer = 'all' } = {}) {
  if (!LAYERS.includes(layer)) throw new Error(`boarding: no layer ${layer}`);
  if (prefix.includes('-')) throw new Error('boarding: the prefix is one word');
  const members = publicRoster(roster);
  const n = members.length;
  const frame = boardingFrame(t, { variant });
  const reduced = variant === 'reduced';
  const narrow = isNarrow(width, height);
  const cam = cameraOf(frame, narrow);
  const clock = reduced ? 0 : frame.at;
  const env = layer !== 'crew', drawCrew = layer !== 'environment';
  const lens = (depth, body) => view(cam, width, height, depth, body);
  const character = m => members[m.i].character;
  let scene = env ? `<rect width="${f(width)}" height="${f(height)}" fill="${NIGHT.deep}"/>` : '';
  let placed;
  if (frame.world === 'outside') {
    const opts = { t: clock, reduced, narrow, door: frame.door, ramp: frame.ramp, light: frame.light, portholes: frame.portholes, engines: frame.engines };
    placed = crewOutside(n, frame.at);
    if (reduced) placed = stillCrew(placed, cam, width, height);
    const draw = list => list.map(m => memberSvg(prefix, m, character(m), { rim: 'warm', rimOffset: [4, -3], rimOpacity: m.state === 'ground' ? 0.7 : 0.95 })).join('');
    if (env) scene += lens(0.3, skyLayer(`${prefix}-s`, opts)) + lens(1, fieldLayer(`${prefix}-f`, opts));
    if (drawCrew) scene += lens(1, draw(placed.filter(m => m.state !== 'ground')));
    if (env) scene += lens(1, railLayer(`${prefix}-r`, opts));
    if (drawCrew) scene += lens(1, draw(placed.filter(m => m.state === 'ground')));
    if (env) scene += lens(1.25, dustLayer(`${prefix}-d`, opts));
  } else {
    placed = crewInside(n, { lights: frame.lights, narrow });
    if (env) scene += lens(1, corridorLayer(`${prefix}-c`, { t: clock, lights: frame.lights, systems: frame.systems, seal: frame.seal, reduced }));
    if (drawCrew) {
      scene += lens(1, placed.map(m => memberSvg(prefix, m, character(m), {
        rim: 'amber', rimOffset: [0, -4], rimOpacity: 0.85 - 0.4 * frame.lights,
        breath: reduced ? '' : breathe(frame.at, [m.x, m.y], m.phase, 0.012),
      })).join(''));
    }
  }
  if (env) {
    scene += vignette(prefix, { width, height, strength: 0.55 }) + grainSvg(prefix, { width, height });
    if (frame.stamp > 0) {
      const box = titleBox(width, height);
      scene += markSvg(prefix, { ...box, slam: frame.stamp, draw: frame.draw, fill: frame.fill, credit: 0, sweep: 0 });
    }
  }
  let body = revealDefs(prefix) + crewDefs(prefix);
  if (reduced) {
    body += env
      ? `${scene}<rect width="${f(width)}" height="${f(height)}" fill="${NIGHT.deep}" opacity="${f(1 - frame.fade)}"/>`
      : `<g opacity="${f(frame.fade)}">${scene}</g>`;
  } else {
    // From the night (the screen before it) in a quarter second, then, at the end, the comic's ink cut.
    const rise = Math.min(1, frame.at / 240);
    if (rise < 1) scene += env ? `<rect width="${f(width)}" height="${f(height)}" fill="${NIGHT.deep}" opacity="${f(1 - rise)}"/>` : '';
    if (frame.handover > 0) {
      const wipe = handoverWipe(prefix, { width, height, v: frame.handover });
      body += (env ? `<rect width="${f(width)}" height="${f(height)}" fill="${NIGHT.deep}"/>` : '')
        + `<defs>${wipe.clip}</defs><g clip-path="url(#${wipe.clipId})">${scene}</g>${env ? wipe.band : ''}`;
    } else {
      body += env || rise >= 1 ? scene : `<g opacity="${f(rise)}">${scene}</g>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(width)} ${f(height)}" width="${f(width)}" height="${f(height)}">${body}</svg>`;
  const crew = placed.map(m => Object.freeze({ seat: members[m.i].seat, character: character(m), state: m.state, x: f(m.x), y: f(m.y), scale: f(m.scale), light: f(m.light), opacity: f(m.opacity) }));
  return { svg, frame, camera: cam, crew, words: { title: BRAND.name, visible: frame.stamp > 0.5 && frame.handover < 0.5 }, end: BOARDING_END };
}
