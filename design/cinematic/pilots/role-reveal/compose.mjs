// mothership:dev-only
//
// A role reveal film's frame as one SVG, composed at the phone's own shape: 900 units wide and as tall
// as the phone's aspect needs, so a tall phone and a short one both fill the screen without cropping
// a panel (the three panels share the page's height between the margins). Pure: t, the role and the
// page's size in; the SVG, the frame and the page text's boxes out. The page text (each panel's
// narration, the line under the title and the role's name) is set by the stage over the boxes, never
// drawn into the picture.

import { CREW } from '../../../board-motion/figures/crew.mjs';
import { FACTION_ACCENTS } from '../../../board-v2/fx/blocked.mjs';
import { clamp01, easeOutCubic, lerp } from '../../lib/ease.mjs';
import { GRIP, NIGHT, captionBoxSvg, flashSvg, grainSvg, panelSvg, revealDefs, slatsSvg, titlePlateSvg } from './art.mjs';
import { briefingSvg, glintOnPage } from './briefing.mjs';
import { ROLE_REVEAL_COPY, roleLine } from './copy.mjs';
import { CAMERA, PANEL_TONES, revealFrame } from './film.mjs';
import { PORTRAIT_FILES, ROLE_FILMS } from './roles.mjs';

export const PAGE_WIDTH = 900;
const f = v => Number((+v).toFixed(2));

/** The page's height for a phone of w x h CSS px: 900 wide, the phone's aspect. */
export const pageHeight = (w, h) => Math.round((PAGE_WIDTH * h) / w);

/** Where everything sits on a 900 x H page. */
export function layout(H) {
  const top = 70, bottom = 92, gutter = 44;
  const ph = (H - top - bottom - 2 * gutter) / 3;
  const panels = [0, 1, 2].map(i => ({ x: 36, y: top + i * (ph + gutter), w: 828, h: ph, tilt: [-1.1, 0.7, -0.5][i], side: i % 2 ? 1 : -1 }));
  // Each panel's narration box rides its top edge, as a comic's caption does, on alternating sides.
  const story = panels.map((p, i) => ({ x: i === 1 ? p.x + p.w - 566 : p.x - 14, y: p.y - 30, w: 580, h: 128 }));
  const titleCy = H * 0.44;
  return {
    panels,
    story,
    title: { cx: PAGE_WIDTH / 2, cy: titleCy, w: 720 },
    captions: { play: { x: 60, y: titleCy + 210, w: 780, h: 170 } },
  };
}

/**
 * The guided view at a frame (film.mjs camera): a zoom k and the page row cy it centres, easing
 * between a panel (its narration in view) and the whole page; clamped so the view never leaves the
 * page. Returns the SVG transform and the same mapping for the page text's boxes.
 */
export function cameraView(cam, L, height) {
  const at = idx => (idx < 0 ? [1, height / 2] : [CAMERA.zoom, L.panels[idx].y + L.panels[idx].h / 2 - 30]);
  const [k0, c0] = at(cam.from), [k1, c1] = at(cam.to);
  const k = lerp(k0, k1, cam.v);
  const half = height / (2 * k);
  const cy = Math.min(height - half, Math.max(half, lerp(c0, c1, cam.v)));
  return {
    k, cy,
    transform: `translate(${f(PAGE_WIDTH / 2)} ${f(height / 2)}) scale(${f(k)}) translate(${f(-PAGE_WIDTH / 2)} ${f(-cy)})`,
    box: ([x, y, w, h]) => [(x - PAGE_WIDTH / 2) * k + PAGE_WIDTH / 2, (y - cy) * k + height / 2, w * k, h * k],
  };
}

/**
 * The frame at t: { svg, frame, words }. words: story (the three panels' narration boxes, each { box,
 * text, opacity, tone: past | present }) and play ({ box, text, opacity }), in page units; role
 * { text, visible }. role: a current role; seat: the player's own number (the Doctor's
 * keypad); character: the player's own crew character (c1..c9), the only figure drawn in colour;
 * gadget: the role's device alone (art.mjs deviceOnly() of its held picture, which the caller has
 * read: this module reads no file); width x height: the page in units (900 x pageHeight()).
 */
export function revealSvg(t, { role = 'Doctor', variant = 'full', seat = 6, character, gadget, width = PAGE_WIDTH, height = 1600, prefix = 'rr' } = {}) {
  const film = ROLE_FILMS[role];
  if (!film) throw new Error(`No role ${role}`);
  if (!film.panels) throw new Error(`The ${role}'s film is a storyboard only so far (docs/design/cinematic/role-reveal.md)`);
  if (typeof gadget !== 'string' || !gadget.includes('<svg')) throw new Error('revealSvg: the role\'s gadget (its device picture, without the hand) is required');
  if (!Object.hasOwn(CREW, character ?? '')) throw new Error(`revealSvg: the player's own character (${Object.keys(CREW).join(', ')}) is required`);
  const frame = revealFrame(t, { variant });
  const L = layout(height);
  const panelsIn = frame.panels[0].visible ? clamp01(frame.panels[0].slam ?? 1) : 0;
  // Reduced motion holds its stills: the stars do not twinkle.
  const clock = variant === 'reduced' ? 0 : frame.t;
  const view = cameraView(frame.camera, L, height);
  // Each narration box drops into place as it fades in, as a comic's caption is set down.
  const storyBoxes = L.story.map((box, i) => ({ ...box, y: box.y - 22 * (1 - easeOutCubic(frame.captions.story[i])) }));
  // The page under the guided view: the night, the briefing room (it stays, dimmed, under the
  // panels), the panels and their narration boxes.
  let page = slatsSvg(prefix, { width, height, v: 1, dim: 1, t: clock })
    + `<g opacity="${f(1 - 0.72 * panelsIn)}">${briefingSvg(prefix, { width, height, opener: frame.opener, name: role.toUpperCase(), team: film.team, teamColour: FACTION_ACCENTS[film.team.toLowerCase()], character, gadget, grip: GRIP, deviceHref: film.device, portraitHref: PORTRAIT_FILES[character], t: clock, reduced: variant === 'reduced' })}</g>`;
  frame.panels.forEach((p, i) => {
    if (!p.visible) return;
    const box = L.panels[i];
    const content = film.panels[i](p.local, { w: box.w, h: box.h, prefix: `${prefix}-p${i}`, seat, character, reduced: variant === 'reduced' });
    page += panelSvg(prefix, { i, ...box, enter: p.enter, slam: p.slam ?? 1, content, tone: PANEL_TONES[i], focus: frame.focus[i], reduced: variant === 'reduced' });
  });
  storyBoxes.forEach((box, i) => { page += captionBoxSvg({ ...box, opacity: frame.captions.story[i], tone: PANEL_TONES[i] }); });
  let body = revealDefs(prefix) + `<g transform="${view.transform}">${page}</g>`;
  // The memory flash out of the gadget's glint, over everything (full motion only).
  if (frame.flash > 0) {
    const [cx, cy] = glintOnPage(width, height, frame.opener.push);
    body += flashSvg(prefix, { width, height, cx, cy, v: frame.flash });
  }
  if (frame.dim > 0) body += `<rect width="${width}" height="${f(height)}" fill="${NIGHT.deep}" opacity="${f(0.8 * frame.dim)}"/>`;
  const plate = titlePlateSvg(prefix, { name: role.toUpperCase(), emblemHref: film.emblem, cx: L.title.cx, cy: L.title.cy, width: L.title.w, stamp: frame.title.stamp, settle: frame.title.settle, sweep: frame.title.sweep });
  body += plate.svg;
  body += captionBoxSvg({ ...L.captions.play, opacity: frame.captions.play });
  // The paper it is printed on.
  body += grainSvg(prefix, { width, height });
  // Reduced motion: each still fades in from the night over 80 ms.
  if (variant === 'reduced' && frame.fade < 1) body += `<rect width="${width}" height="${f(height)}" fill="${NIGHT.deep}" opacity="${f(1 - frame.fade)}"/>`;
  const copy = ROLE_REVEAL_COPY[role];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${f(height)}" width="${width}" height="${f(height)}">${body}</svg>`;
  return {
    svg, frame,
    words: {
      story: storyBoxes.map((box, i) => ({ box: view.box([box.x, box.y, box.w, box.h]), text: copy.story[i], opacity: frame.captions.story[i], tone: PANEL_TONES[i] })),
      play: { box: [L.captions.play.x, L.captions.play.y, L.captions.play.w, L.captions.play.h], text: copy.play, opacity: frame.captions.play },
      role: { text: roleLine(role), visible: frame.title.visible },
    },
  };
}
