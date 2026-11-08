// mothership:dev-only
//
// A role's ten-second film (./clock.mjs for its beats): the opener (./briefing.mjs), the memory flash,
// the page of three panels (./page.mjs, the role's own pictures from its module) and the title, under
// the films' finish. roleSvg(t, { width, height, role, character, seat, variant, assets }) is a pure
// function of t. The narration is page text (roleCaptions): the page draws it as DOM text over the
// picture, so it translates, scales with the player's text size and is read by screen readers.

import { blurFilter, defs, finish, leak } from '../kit/fx.mjs';
import { f, f3 } from '../kit/math.mjs';
import { briefingSvg } from './briefing.mjs';
import { BEATS, ROLE_MS, roleFrame, STILLS } from './clock.mjs';
import { captionPlaces, flashSvg, pageSvg, titleSvg } from './page.mjs';
import { ROLES } from './roles.mjs';

export { ROLE_MS };

function layers(D, { W, H, frame, role, character, seat, assets }) {
  const reduced = frame.reduced;
  const look = { ...role, gadget: role.gadget() };
  const u = H / 844;
  const pageOn = frame.panels.some(p => p.visible);
  const opener = briefingSvg(D, { W, H, t: frame.t, o: frame.opener, role: look, character, assets, reduced });
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

export function roleSvg(t, { width: W = 390, height: H = 844, role: roleId = 'doctor', character = 'c3', seat = 4, variant = 'full', assets = null } = {}) {
  const D = defs();
  const role = ROLES[roleId];
  if (!role) throw new Error(`No role film for ${roleId}`);
  const frame = roleFrame(t, { variant });
  let out;
  if (frame.reduced) {
    // Three stills, each cross-faded in over the one before.
    const index = STILLS.findIndex(s => s.still === frame.still);
    const now = layers(D, { W, H, frame, role, character, seat, assets });
    if (index > 0 && frame.fade < 1) {
      const before = roleFrame(STILLS[index - 1].at, { variant });
      out = layers(D, { W, H, frame: before, role, character, seat, assets }) + `<g opacity="${f3(frame.fade)}">${now}</g>`;
    } else out = now;
  } else out = layers(D, { W, H, frame, role, character, seat, assets });
  out += finish(D, 'rf-fin', { width: W, height: H, t: frame.reduced ? 0 : frame.t, grain: 0.08, vignette: 0.6, grade: '#24345A', gradeOpacity: 0.16 });
  out += leak(D, 'rf-leak', { width: W, height: H, k: 0.05 * frame.opener.lamp, color: '#FFB060', side: 'right' });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${D.markup()}${out}</svg>`;
}

/** The narration boxes at t: their words (a line each), place, opacity and how far each has dropped in. */
export function roleCaptions(t, { width: W = 390, height: H = 844, role: roleId = 'doctor', variant = 'full' } = {}) {
  const role = ROLES[roleId];
  const frame = roleFrame(t, { variant });
  return captionPlaces(W, H, frame).map((p, i) => ({ ...p, lines: role.captions[i] })).filter(c => c.opacity > 0.001);
}

/** What a screen reader is told at t: the narration shown, and the role's name at the title. */
export function rolePageText(t, { role: roleId = 'doctor', variant = 'full' } = {}) {
  const role = ROLES[roleId];
  const frame = roleFrame(t, { variant });
  if (frame.title.visible) return role.name;
  return frame.captions.map((k, i) => (k > 0.5 ? role.captions[i].join(' ') : '')).filter(Boolean).join(' ');
}
