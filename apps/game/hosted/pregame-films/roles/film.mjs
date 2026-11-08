//
// A role's ten-second film (./clock.mjs for its beats): the opener (./briefing.mjs), the memory flash,
// the page of three panels (./page.mjs, the role's own pictures from its module) and the title, under
// the films' finish. roleSvg(t, { width, height, role, character, seat, variant }) is a pure
// function of t. The narration is page text (roleCaptions): the page draws it as DOM text over the
// picture, so it can be translated, sized in rem and read by a screen reader. Tying it to the
// player's own text-size setting is Frontend's, and untested.

import { blurFilter, defs, finish, leak } from '../kit/fx.mjs';
import { f3 } from '../kit/math.mjs';
import { briefingSvg } from './briefing.mjs';
import { BEATS, ROLE_MS, roleFrame, STILLS } from './clock.mjs';
import { captionPlaces, flashSvg, pageSvg, titleSvg } from './page.mjs';
import { CREW } from '../../crew-drawing/crew.mjs';
import { ROLES } from './roles.mjs';

export { ROLE_MS };

/**
 * A picture's ids, and every reference to them, renamed with `suffix`, so that two stills can share
 * one document during a crossfade without a repeated id (the still before keeps its own definitions).
 */
function namespaced(markup, suffix) {
  const ids = new Set([...markup.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  return markup.replace(/(\sid="|url\(#|href="#)([^"')]+)/g, (all, lead, id) => (ids.has(id) ? `${lead}${id}${suffix}` : all));
}

function layers(D, { W, H, frame, role, character, seat }) {
  const reduced = frame.reduced;
  const look = { ...role, gadget: role.gadget() };
  const u = H / 844;
  const pageOn = frame.panels.some(p => p.visible);
  const opener = briefingSvg(D, { W, H, t: frame.t, o: frame.opener, role: look, character, reduced });
  let out = `<rect width="${W}" height="${H}" fill="#07090F"/>`;
  // The briefing room: in full light for the opener, then out of focus and in the dark under the page.
  const roomDim = pageOn ? 0.32 : 1;
  const roomBlur = pageOn ? ` filter="${blurFilter(D, 'rf-room-dof', 3.2 * u)}"` : '';
  out += `<g opacity="${f3(frame.opener.fade * roomDim)}"${roomBlur}>${opener.svg}</g>`;
  if (!reduced) out += flashSvg(D, { W, H, at: opener.flashAt, k: frame.t < BEATS.panel1[0] ? frame.flash : 0 });
  if (pageOn) out += pageSvg(D, { W, H, frame, arts: role.panels(D, { character, seat, reduced }), t: frame.t });
  if (!reduced && frame.t >= BEATS.panel1[0]) out += flashSvg(D, { W, H, at: [W / 2, H * 0.2], k: frame.flash * 0.8 });
  out += titleSvg(D, { W, H, frame, role: look });
  return out;
}

/** The public seats a table has, 1 to 9, as the boarding's roster takes them (`../boarding/roster.mjs`). */
const SEATS = 9;

/** A refused value as an error names it: a string in quotes, a number as itself, anything else by its type. */
const named = v => (typeof v === 'string' ? JSON.stringify(v) : typeof v === 'number' ? String(v) : typeof v);

/**
 * The role whose film this is: one of the nine, named exactly by its string id. Nothing is coerced
 * (`['doctor']` is not `'doctor'`), and a film never falls back to another role.
 */
function roleOf(roleId) {
  if (typeof roleId !== 'string' || !Object.hasOwn(ROLES, roleId)) throw new Error(`No role film for ${named(roleId)}`);
  return ROLES[roleId];
}

export function roleSvg(t, { width: W = 390, height: H = 844, role: roleId, character, seat, variant = 'full' } = {}) {
  const D = defs();
  const role = roleOf(roleId);
  // The player's own character (its string id) and public seat (a whole number, 1 to 9) are bound
  // exactly: nothing is coerced, and no review default stands in.
  if (typeof character !== 'string' || !Object.hasOwn(CREW, character)) throw new Error(`No crew character ${named(character)}`);
  if (!Number.isInteger(seat) || seat < 1 || seat > SEATS) throw new Error(`No seat ${named(seat)}`);
  const frame = roleFrame(t, { variant });
  let out;
  if (frame.reduced) {
    // Three stills: the first fades in from the night, each later one cross-fades in over the one
    // before, which is drawn with its own definitions and every id renamed.
    const index = STILLS.findIndex(s => s.still === frame.still);
    const now = layers(D, { W, H, frame, role, character, seat });
    if (frame.fade >= 1) out = now;
    else if (index === 0) out = `<rect width="${W}" height="${H}" fill="#07090F"/><g opacity="${f3(frame.fade)}">${now}</g>`;
    else {
      const B = defs();
      const before = layers(B, { W, H, frame: roleFrame(STILLS[index - 1].at, { variant }), role, character, seat });
      out = namespaced(B.markup() + before, '-was') + `<g opacity="${f3(frame.fade)}">${now}</g>`;
    }
  } else out = layers(D, { W, H, frame, role, character, seat });
  out += finish(D, 'rf-fin', { width: W, height: H, t: frame.reduced ? 0 : frame.t, grain: 0.08, vignette: 0.6, grade: '#24345A', gradeOpacity: 0.16 });
  out += leak(D, 'rf-leak', { width: W, height: H, k: 0.05 * frame.opener.lamp, color: '#FFB060', side: 'right' });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${D.markup()}${out}</svg>`;
}

/** The narration boxes at t: their words (a line each), place, opacity and how far each has dropped in. */
export function roleCaptions(t, { width: W = 390, height: H = 844, role: roleId, variant = 'full' } = {}) {
  const role = roleOf(roleId);
  const frame = roleFrame(t, { variant });
  return captionPlaces(W, H, frame).map((p, i) => ({ ...p, lines: role.captions[i] })).filter(c => c.opacity > 0.001);
}

/** What a screen reader is told at t: the narration shown, and the role's name at the title. */
export function rolePageText(t, { role: roleId, variant = 'full' } = {}) {
  const role = roleOf(roleId);
  const frame = roleFrame(t, { variant });
  if (frame.title.visible) return role.name;
  return frame.captions.map((k, i) => (k > 0.5 ? role.captions[i].join(' ') : '')).filter(Boolean).join(' ');
}
