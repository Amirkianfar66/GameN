// mothership:dev-only
//
// The pilot's portraits: each character's head and shoulders in an app-icon frame (the owner:
// "the icon border like iOS style"). The frame is the continuous-corner rounded square of an iOS
// icon (a superellipse), with a white rim and a soft shadow, as on the owner's sheet. Inside, the
// character's colour under a noir vignette and a scratched texture. Nothing on it says a role.

import { SUIT } from './cast.mjs';
import { TRACED_HEADS, pilotHead } from './head.mjs';
import { INK, inkCanvas, pathOfPoly, shade, squircle, tint } from './ink.mjs';

/** The portrait's own box (viewBox) and the icon's half-size inside it. */
export const PORTRAIT = Object.freeze({ box: Object.freeze([-64, -64, 128, 128]), half: 54 });
/** Where the head sits in the icon, and its scale: the face a little left of the middle, as on the owner's icons. */
const HEAD = Object.freeze({ at: Object.freeze([-6, -1]), scale: 1.62 });

/**
 * A character's portrait as an inline SVG. motion: the head's { blink, sway, lift } (a portrait can
 * breathe and blink on a lobby screen). size: CSS pixels, or null to fill its container.
 */
export function portraitSvg(c, { prefix = 'pp', motion = {}, size = null } = {}) {
  const cv = inkCanvas(prefix);
  const { half } = PORTRAIT;
  const frame = squircle(0, 0, half);
  const d = pathOfPoly(frame);
  const ground = `${prefix}-ground`, clip = `${prefix}-icon`;
  cv.raw(`<defs><radialGradient id="${ground}" cx="0.38" cy="0.32" r="0.86"><stop offset="0" stop-color="${tint(c.field, 0.16)}"/><stop offset="0.62" stop-color="${c.field}"/><stop offset="1" stop-color="${shade(c.field, 0.5)}"/></radialGradient><clipPath id="${clip}"><path d="${d}"/></clipPath></defs>`);
  // The shadow under the icon, and its white rim, as the owner's sheet frames them.
  cv.raw(`<path d="${d}" transform="translate(1.6 3.2) scale(1.02)" fill="${INK}" opacity="0.2"/>`);
  cv.raw(`<path d="${d}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="7" stroke-linejoin="round"/>`);
  cv.raw(`<g clip-path="url(#${clip})">`);
  cv.raw(`<path d="${d}" fill="url(#${ground})"/>`);
  // Brushed strokes in the ground, as if painted.
  for (let i = 0; i < 9; i += 1) {
    const y = -50 + i * 12.4, x = -54 + ((i * 37) % 11);
    cv.line([[x, y + 6], [x + 34, y - 4], [x + 70, y + 2], [x + 108, y - 6]], { weight: 1.1, color: shade(c.field, 0.3), opacity: 0.22, seed: 200 + i });
  }
  // The shoulders: the canvas suit, its charcoal sides, the pads and the collar in the accent.
  cv.form([[-62, 66], [-56, 44], [-40, 34], [-14, 29], [16, 29], [40, 33], [56, 42], [64, 66]], SUIT.light, { weight: 2.2, depth: 6, tension: 0.8, seed: 211 });
  cv.form([[-62, 66], [-56, 44], [-44, 37], [-36, 66]], SUIT.dark, { weight: 1.6, depth: 3, tension: 0.6, seed: 213, rim: false });
  cv.form([[38, 66], [44, 36], [56, 42], [64, 66]], SUIT.dark, { weight: 1.6, depth: 3, tension: 0.6, seed: 215, rim: false });
  cv.form([[-54, 40], [-40, 31], [-30, 36], [-42, 47]], c.accent, { weight: 1.8, depth: 3, tension: 0.5, seed: 217 });
  cv.form([[34, 34], [48, 32], [56, 42], [42, 46]], c.accent, { weight: 1.8, depth: 3, tension: 0.5, seed: 219 });
  cv.form([[-14, 29], [-12, 22], [12, 21], [16, 29], [8, 36], [-8, 36]], c.accent, { weight: 1.6, depth: 2, tension: 0.6, seed: 221, rim: false });
  // The neck, from where the owner's drawing has it leave the jaw down into the collar, and the
  // head, three-quarter, as the board's figures turn.
  const [nx, ny, nr] = TRACED_HEADS[c.id].neck;
  const top = [HEAD.at[0] + HEAD.scale * nx, HEAD.at[1] + HEAD.scale * (ny - nr)], r = HEAD.scale * nr;
  cv.form([[top[0] - r, top[1]], [top[0] + r, top[1]], [2 + r * 1.1, 28], [2 - r * 1.1, 29]], c.skin, { weight: 1.8, depth: 3, tension: 0.6, seed: 223, rim: false, hatch: false });
  cv.group(`translate(${HEAD.at.join(' ')}) scale(${HEAD.scale})`, () => pilotHead(cv, c, 'front', motion));
  // A noir vignette over everything inside the frame.
  cv.raw(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="20" opacity="0.14"/>`);
  cv.raw('</g>');
  // The icon's bevel: a thin light edge inside the rim.
  cv.raw(`<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.65"/>`);
  const [x, y, w, h] = PORTRAIT.box;
  return cv.svg({ viewBox: `${x} ${y} ${w} ${h}`, width: size, height: size });
}
