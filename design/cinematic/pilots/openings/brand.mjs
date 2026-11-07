// mothership:dev-only
//
// The brand intro (issue #188): exactly 2,000 ms on the app's first entry, before login and the
// lobby. The night of the role films, its starlight falling through a viewport's slats; a paper plate
// slams in, "Game N" is written on it in ink and amber, "by Plan B" is stamped on an ink tab under
// it, the mark holds to be read while a sheen crosses it once, and Pilot 2's comic cut (an ink band
// with a torn edge) hands over to the app's night. One self-contained SVG at the surface's own size;
// no text drawn as text (the page text says the words). Reduced motion: the mark fades in, holds and
// fades out, nothing else moving.

import { speedLines } from '../../lib/comic.mjs';
import { NIGHT, grainSvg, revealDefs, slatsSvg } from '../role-reveal/art.mjs';
import { BRAND_END, brandFrame } from './film.mjs';
import { BRAND, MARK, handoverWipe, markSvg } from './wordmark.mjs';

const f = v => Number((+v).toFixed(2));

/** The mark's scale on a surface of width x height: most of a phone's width, a third of a display's height. */
export const brandScale = (width, height) => Math.min((width * 0.84) / MARK.plate[0], (height * 0.37) / MARK.plate[1]);

/**
 * The brand intro at t on a width x height surface (CSS px): { svg, frame, words }. words: the exact
 * name and credit for the page text and when they are on screen.
 */
export function brandSvg(t, { variant = 'full', width = 390, height = 844, prefix = 'gn' } = {}) {
  const frame = brandFrame(t, { variant });
  const reduced = variant === 'reduced';
  const cx = width / 2, cy = height * 0.47;
  const scale = brandScale(width, height);
  // The night, its starlight in the slats, the same every frame in reduced motion.
  let scene = `<rect width="${f(width)}" height="${f(height)}" fill="${NIGHT.deep}"/>`
    + slatsSvg(prefix, { width, height, v: 1, dim: 0.35, t: reduced ? 0 : frame.t });
  // The plate's landing throws pale impact lines from behind it (full motion only).
  if (!reduced && frame.slam > 0 && frame.t < 420) {
    const fade = 1 - frame.t / 420;
    scene += `<g transform="translate(${f(cx)} ${f(cy)})">${speedLines({ cx: 0, cy: 0, inner: MARK.plate[0] * scale * 0.52, outer: MARK.plate[0] * scale * 0.9, count: 30, seed: 41, color: NIGHT.slat, width: 4, opacity: 0.5 * fade })}</g>`;
  }
  scene += markSvg(prefix, { cx, cy, scale, slam: frame.slam, draw: frame.draw, fill: frame.fill, credit: frame.credit, sweep: frame.sweep });
  scene += grainSvg(prefix, { width, height });
  let body = revealDefs(prefix);
  if (reduced) {
    body += scene + `<rect width="${f(width)}" height="${f(height)}" fill="${NIGHT.deep}" opacity="${f(1 - frame.fade)}"/>`;
  } else if (frame.handover > 0) {
    // The comic cut: the ink band sweeps across, and the app's night shows behind it.
    const wipe = handoverWipe(prefix, { width, height, v: frame.handover });
    body += `<rect width="${f(width)}" height="${f(height)}" fill="${NIGHT.deep}"/><defs>${wipe.clip}</defs><g clip-path="url(#${wipe.clipId})">${scene}</g>${wipe.band}`;
  } else {
    body += scene;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(width)} ${f(height)}" width="${f(width)}" height="${f(height)}">${body}</svg>`;
  const shown = reduced ? frame.fade > 0.5 : frame.draw > 0.5 && frame.handover < 0.5;
  return { svg, frame, words: { name: BRAND.name, credit: BRAND.credit, visible: shown }, end: BRAND_END };
}
