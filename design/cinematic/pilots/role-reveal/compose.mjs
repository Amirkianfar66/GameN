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
import { GRIP, NIGHT, captionBoxSvg, flashSvg, grainSvg, inlinePicture, panelSvg, revealDefs, slatsSvg, titlePlateSvg } from './art.mjs';
import { briefingSvg, glintOnPage } from './briefing.mjs';
import { ROLE_REVEAL_COPY, roleLine } from './copy.mjs';
import { CAMERA, NARRATED, PANEL_TONES, revealFrame } from './film.mjs';
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
  // A memory panel's narration box rides its top edge, as a comic's caption does, on alternating
  // sides, fitted to its lines (narrationBox()).
  const story = NARRATED.map(i => ({ panel: i, side: i % 2 ? 'right' : 'left', y: panels[i].y - 30, h: 104 }));
  const titleCy = H * 0.44;
  return { panels, story, title: { cx: PAGE_WIDTH / 2, cy: titleCy, w: 720 } };
}

/** The narration's lettering on a phone of cssPx CSS px a unit: 13 px capitals at least, tracked 0.04 em, lines 1.2 apart. */
export const captionFont = cssPx => Math.max(13, Math.round(21 * cssPx));
/** The stage's padding inside a narration box, in units: [top and bottom, each side]. */
export const CAPTION_PAD = Object.freeze([16, 36]);
/** The most characters a narration line holds. */
export const CAPTION_LINE = 17;

/**
 * A narration's lines, as a letterer breaks them: a sentence to a line ("Colony Nine." over "The
 * fever years."), and a sentence too long for one line split at its most even word gap.
 */
export function captionLines(text) {
  return text.split(/(?<=[.!?])\s+/).flatMap(sentence => {
    if (sentence.length <= CAPTION_LINE) return [sentence];
    const words = sentence.split(' ');
    let best = [sentence];
    for (let i = 1; i < words.length; i += 1) {
      const pair = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
      if (best.length === 1 || Math.max(...pair.map(l => l.length)) <= Math.max(...best.map(l => l.length))) best = pair;
    }
    return best;
  });
}

// A capital's width in em, near enough (a little over) for Arial, Helvetica and Roboto bold.
const em = ch => (/[\s.,'!:;I]/.test(ch) ? 0.3 : /[MW]/.test(ch) ? 0.92 : 0.72);
/** A narration line's width in CSS px, in capitals at captionFont(cssPx), tracked 0.04 em. */
export const captionWidth = (line, cssPx) => captionFont(cssPx) * [...line.toUpperCase()].reduce((sum, ch) => sum + em(ch) + 0.04, 0);

/**
 * A narration box fitted to its lines (captionLines()) on a phone of cssPx CSS px a unit, on its side
 * of its panel's top edge. Fitted with the camera pulled all the way back (zoom 1), so the words never
 * outgrow it, and set without wrapping: a line is the letterer's, not the browser's.
 */
export function narrationBox(L, slot, text, cssPx = 390 / PAGE_WIDTH) {
  const p = L.panels[slot.panel];
  const lines = captionLines(text);
  const w = Math.min(600, 2 * CAPTION_PAD[1] + (Math.max(...lines.map(line => captionWidth(line, cssPx))) + 10) / cssPx);
  const h = slot.h + ((lines.length - 1) * captionFont(cssPx) * 1.2) / cssPx;
  return { x: slot.side === 'right' ? p.x + p.w - w + 14 : p.x - 14, y: slot.y, w, h, lines };
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
 * The frame at t: { svg, frame, words }. words: story (the memory panels' narration boxes, each { box,
 * text, lines, opacity, tone }, in page units, riding the camera) and role { text, visible } (announced, not
 * shown). role: a current role; seat: the player's own number (the Doctor's
 * keypad); character: the player's own crew character (c1..c9), the only figure drawn in colour;
 * gadget: the role's device alone (art.mjs deviceOnly() of its held picture, which the caller has
 * read: this module reads no file); width x height: the page in units (900 x pageHeight()); cssPx:
 * the phone's CSS px a unit (its width / 900), which the narration boxes are fitted for.
 * pictures: every shipped picture's SVG text by its href (roles.mjs ROLE_REVEAL_ASSETS, read once on
 * every phone): given, the frame draws them inline and refers to no file at all (a client passes it);
 * left out, the frame keeps an <image> for each (the tests read which pictures a film draws).
 */
export function revealSvg(t, { role = 'Doctor', variant = 'full', seat = 6, character, gadget, pictures = null, width = PAGE_WIDTH, height = 1600, cssPx = 390 / PAGE_WIDTH, prefix = 'rr' } = {}) {
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
  const copy = ROLE_REVEAL_COPY[role];
  const storyBoxes = storyPlaces(frame, L, view, role, cssPx);
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
  storyBoxes.forEach((box, i) => { page += captionBoxSvg({ ...box, opacity: frame.captions.story[i], tone: PANEL_TONES[NARRATED[i]] }); });
  let body = revealDefs(prefix) + `<g transform="${view.transform}">${page}</g>`;
  // The memory flash out of the gadget's glint, over everything (full motion only).
  if (frame.flash > 0) {
    const [cx, cy] = glintOnPage(width, height, frame.opener.push);
    body += flashSvg(prefix, { width, height, cx, cy, v: frame.flash });
  }
  if (frame.dim > 0) body += `<rect width="${width}" height="${f(height)}" fill="${NIGHT.deep}" opacity="${f(0.8 * frame.dim)}"/>`;
  const plate = titlePlateSvg(prefix, { name: role.toUpperCase(), emblemHref: film.emblem, cx: L.title.cx, cy: L.title.cy, width: L.title.w, stamp: frame.title.stamp, settle: frame.title.settle, sweep: frame.title.sweep });
  body += plate.svg;
  // The paper it is printed on.
  body += grainSvg(prefix, { width, height });
  // Reduced motion: each still fades in from the night over 80 ms.
  if (variant === 'reduced' && frame.fade < 1) body += `<rect width="${width}" height="${f(height)}" fill="${NIGHT.deep}" opacity="${f(1 - frame.fade)}"/>`;
  // Every shipped picture inline from its text, when the caller has them: nothing left to load or decode.
  let n = 0;
  if (pictures) {
    body = body.replace(/<image href="([^"]+)" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"[^>]*\/>/g, (whole, href, x, y, w, h) => (
      typeof pictures[href] === 'string' ? inlinePicture(pictures[href], { x: +x, y: +y, width: +w, height: +h, scope: `${prefix}-pic${n++}` }) : whole));
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${f(height)}" width="${width}" height="${f(height)}">${body}</svg>`;
  return { svg, frame, words: wordsOf(frame, view, storyBoxes, role) };
}

/**
 * The memory panels' narration boxes at a frame, in page units. Each drops into place as it fades in,
 * as a comic's caption is set down, and leaves where it is. It rides its panel's top edge, overhanging
 * the panel a little; under the guided view's zoom it is drawn in just far enough to stay whole in the
 * frame, its stroke and shadow too (the review of #189). With the whole page in view (zoom 1) it sits
 * where it always did.
 */
function storyPlaces(frame, L, view, role, cssPx) {
  const copy = ROLE_REVEAL_COPY[role];
  const half = PAGE_WIDTH / (2 * view.k);
  return L.story.map((slot, i) => {
    const box = narrationBox(L, slot, copy.story[i], cssPx);
    const x = Math.min(Math.max(box.x, PAGE_WIDTH / 2 - half + 4), PAGE_WIDTH / 2 + half - 10 - box.w);
    return { ...box, x, y: box.y - 22 * (1 - easeOutCubic(frame.captions.drop[i])) };
  });
}

const wordsOf = (frame, view, storyBoxes, role) => ({
  story: storyBoxes.map((box, i) => ({ box: view.box([box.x, box.y, box.w, box.h]), text: ROLE_REVEAL_COPY[role].story[i], lines: box.lines, opacity: frame.captions.story[i], tone: PANEL_TONES[NARRATED[i]] })),
  role: { text: roleLine(role), visible: frame.title.visible },
});

/** The page text alone at t (revealSvg()'s words, without drawing the frame): where each box is, on the phone's page. */
export function revealWords(t, { role = 'Doctor', variant = 'full', height = 1600, cssPx = 390 / PAGE_WIDTH } = {}) {
  if (!ROLE_FILMS[role]) throw new Error(`No role ${role}`);
  const frame = revealFrame(t, { variant });
  const L = layout(height);
  const view = cameraView(frame.camera, L, height);
  return wordsOf(frame, view, storyPlaces(frame, L, view, role, cssPx), role);
}
