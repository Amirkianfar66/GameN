// mothership:dev-only
//
// A role reveal film's frame as one SVG, composed at the phone's own shape: 900 units wide and as tall
// as the phone's aspect needs, so a tall phone and a short one both fill the screen without cropping
// a panel (the three panels share the height left between the caption and the bottom margin). Pure:
// t, the role and the page's size in; the SVG, the frame and the page text's boxes out. The page text
// (the captions and the role's name) is set by the stage over the boxes, never drawn into the picture.

import { clamp01 } from '../../lib/ease.mjs';
import { NIGHT, captionBoxSvg, deviceHandSvg, panelSvg, revealDefs, slatsSvg, spotSvg, titlePlateSvg } from './art.mjs';
import { ROLE_REVEAL_COPY, roleLine } from './copy.mjs';
import { revealFrame } from './film.mjs';
import { ROLE_FILMS } from './roles.mjs';

export const PAGE_WIDTH = 900;
const f = v => Number((+v).toFixed(2));

/** The page's height for a phone of w x h CSS px: 900 wide, the phone's aspect. */
export const pageHeight = (w, h) => Math.round((PAGE_WIDTH * h) / w);

/** Where everything sits on a 900 x H page. */
export function layout(H) {
  const top = 196, bottom = 92, gutter = 28;
  const ph = (H - top - bottom - 2 * gutter) / 3;
  const panels = [0, 1, 2].map(i => ({ x: 36, y: top + i * (ph + gutter), w: 828, h: ph, tilt: [-1.1, 0.7, -0.5][i], side: i % 2 ? 1 : -1 }));
  // The held-device art (120 x 140) has its device in the upper middle and the arm leaving by the lower
  // right: the device sits at the page's centre, a little below the middle, the arm off the corner.
  const handScale = 4.3;
  const hand = { scale: handScale, x: PAGE_WIDTH / 2 - 62 * handScale, y: H * 0.56 - 52 * handScale };
  const titleCy = H * 0.44;
  return {
    panels,
    hand,
    spot: { cx: hand.x + 62 * handScale, cy: hand.y + 52 * handScale, rx: 440, ry: 520 },
    title: { cx: PAGE_WIDTH / 2, cy: titleCy, w: 720 },
    captions: {
      purpose: { x: 60, y: 44, w: 780, h: 124 },
      play: { x: 60, y: titleCy + 210, w: 780, h: 170 },
    },
  };
}

/**
 * The frame at t: { svg, frame, words }. words: { purpose, play } each { box, text, opacity } (in page
 * units), role { text, visible }. role: a current role; seat: the player's own number (the Doctor's
 * keypad); width x height: the page in units (900 x pageHeight()).
 */
export function revealSvg(t, { role = 'Doctor', variant = 'full', seat = 6, width = PAGE_WIDTH, height = 1600, prefix = 'rr' } = {}) {
  const film = ROLE_FILMS[role];
  if (!film) throw new Error(`No role ${role}`);
  if (!film.panels) throw new Error(`The ${role}'s film is a storyboard only so far (docs/design/cinematic/role-reveal.md)`);
  const frame = revealFrame(t, { variant });
  const L = layout(height);
  const panelsIn = frame.panels[0].visible ? clamp01(frame.panels[0].slam ?? 1) : 0;
  let body = revealDefs(prefix)
    // Reduced motion holds its stills: the stars do not twinkle.
    + slatsSvg(prefix, { width, height, v: frame.opener.slats, dim: panelsIn, t: variant === 'reduced' ? 0 : frame.t })
    + spotSvg(prefix, { ...L.spot, v: frame.opener.slats * (1 - panelsIn) })
    + deviceHandSvg(prefix, { href: film.device, x: L.hand.x, y: L.hand.y, scale: L.hand.scale, rise: frame.opener.hand, rim: frame.opener.rim, opacity: 1 - panelsIn });
  frame.panels.forEach((p, i) => {
    if (!p.visible) return;
    const box = L.panels[i];
    const content = film.panels[i](p.local, { w: box.w, h: box.h, prefix: `${prefix}-p${i}`, seat, reduced: variant === 'reduced' });
    body += panelSvg(prefix, { i, ...box, enter: p.enter, slam: p.slam ?? 1, content });
  });
  if (frame.dim > 0) body += `<rect width="${width}" height="${f(height)}" fill="${NIGHT.deep}" opacity="${f(0.8 * frame.dim)}"/>`;
  const plate = titlePlateSvg(prefix, { name: role.toUpperCase(), emblemHref: film.emblem, cx: L.title.cx, cy: L.title.cy, width: L.title.w, stamp: frame.title.stamp, settle: frame.title.settle });
  body += plate.svg;
  body += captionBoxSvg({ ...L.captions.purpose, opacity: frame.captions.purpose });
  body += captionBoxSvg({ ...L.captions.play, opacity: frame.captions.play });
  // Reduced motion: each still fades in from the night over 80 ms.
  if (variant === 'reduced' && frame.fade < 1) body += `<rect width="${width}" height="${f(height)}" fill="${NIGHT.deep}" opacity="${f(1 - frame.fade)}"/>`;
  const copy = ROLE_REVEAL_COPY[role];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${f(height)}" width="${width}" height="${f(height)}">${body}</svg>`;
  return {
    svg, frame,
    words: {
      purpose: { box: [L.captions.purpose.x, L.captions.purpose.y, L.captions.purpose.w, L.captions.purpose.h], text: copy.purpose, opacity: frame.captions.purpose },
      play: { box: [L.captions.play.x, L.captions.play.y, L.captions.play.w, L.captions.play.h], text: copy.play, opacity: frame.captions.play },
      role: { text: roleLine(role), visible: frame.title.visible },
    },
  };
}
