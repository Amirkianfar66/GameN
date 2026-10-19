// mothership:dev-only
//
// The Alien's Phantom Clone, privately (storyboard S3 of the Designer's review of the owner's motion
// specification of 13 October 2026; docs/design/clone-s3.md): the card the Alien's own phone shows in
// its sheet while the Clone is active or after it ended, and the art its two films draw on it. The
// holographic scan lines, the halftone duplicate that forms beside the character, the character
// resolved twice, the real one faded to a dotted outline; and the tray's mark for the action.
//
// Nothing here is drawn on the board, on any phone: the public figure is the ordinary one, the same
// drawing, outfit, place and movement for everyone, the Alien's own phone included. A block is S4's
// (fx/blocked.mjs), the same as Protection's. The card's portrait is the Alien's own character in the
// clothes of its current place, drawn by the board's own figure functions; the duplicate is that same
// drawing. Nothing is written in the art: CLONE ACTIVE, CLONE ENDED and the status line are the page's
// text. Low-luminance, contained in the card: no full-screen glow.
//
// Original vector drawing made for this repository by the Visual and Motion Designer (Claude Code),
// in the comic vocabulary of the board: ink outlines, halftone, a limited palette. Pure functions that
// return SVG text or numbers, for Node and the browser alike.

import { FRAME } from '../../board-motion/figures/body.mjs';
import { INK, PAPER } from '../../board-motion/scenes/kit.mjs';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from './blocked.mjs';

export const CLONE_FX_VERSION = 'board-v2-clone-0.1.0';

/**
 * The Clone's palette: a phosphor green, apart from S4's cyan shield and far from every faction
 * accent (cloneColorDistances()), so that nothing private reads as a side. scan: the scan lines;
 * pale: their brightest line; deep: the duplicate's halftone; outline: the dotted outline; stage and
 * rim: the portrait's dark stage and its projector pads; card: the card itself; ended: the ended stamp's grey.
 */
export const CLONE = Object.freeze({ scan: '#8EF0C8', pale: '#BFF5DE', deep: '#2F9E7E', outline: '#B5B8B2', stage: '#12261F', rim: '#1E4A3F', card: '#0B1814', ended: '#9EA49F' });

/** The least CIE76 distance every Clone color keeps from every faction accent. */
export const CLONE_MIN_DISTANCE = 35;

/** Each Clone color's distance to the nearest faction accent, rounded, with the accent's name. */
export function cloneColorDistances() {
  return Object.fromEntries(Object.entries(CLONE).map(([name, hex]) => {
    const [faction, distance] = Object.entries(FACTION_ACCENTS).map(([id, accent]) => [id, cie76(hex, accent)]).sort((a, b) => a[1] - b[1])[0];
    return [name, { nearest: faction, distance: Math.round(distance) }];
  }));
}
export { MIN_ACCENT_DISTANCE };

const f = n => Number(n.toFixed(2));
const clamp01 = v => Math.max(0, Math.min(1, v));

// ---------- the card ----------

/**
 * The card's measurements in CSS pixels at normal text: its least height (its words may make it
 * taller, at 200% text); its padding; the portrait window's width over its height; a standing
 * figure's height over the window's; the real character's and the duplicate's feet, as shares of the
 * window's width, and their floor, as a share of its height; the gap before the words.
 */
export const CLONE_CARD = Object.freeze({ height: 100, pad: 6, ratio: 1.3, figure: 0.86, real: 0.32, clone: 0.7, floor: 0.95, gap: 10 });

/** A standing figure's top and its feet, in the figure frame's units (FRAME: the shared figure frame). */
export const FIGURE_SPAN = Object.freeze({ top: 12, feet: FRAME.anchor[1] });

/**
 * The card for a sheet body's width (CSS pixels) and the card's height (its least, CLONE_CARD.height,
 * or taller where its words need it): the portrait window, each figure's box (the figure frame's
 * FRAME.box, scaled, as page.js frames a slot's) and its feet, and the words' column. Every part is in
 * the card's own pixels.
 */
export function cloneCardLayout({ width, height = CLONE_CARD.height }) {
  const { pad, ratio, figure, real, clone, floor, gap } = CLONE_CARD;
  const portraitHeight = CLONE_CARD.height - 2 * pad;
  const portrait = { left: pad, top: f((height - portraitHeight) / 2), width: f(portraitHeight * ratio), height: portraitHeight };
  const unit = (portraitHeight * figure) / (FIGURE_SPAN.feet - FIGURE_SPAN.top);
  const [BX, BY, BOX] = FRAME.box;
  const [AX, AY] = FRAME.anchor;
  const at = share => {
    const feet = [portrait.left + portrait.width * share, portrait.top + portrait.height * floor];
    return { feet: feet.map(f), left: f(feet[0] - (AX - BX) * unit), top: f(feet[1] - (AY - BY) * unit), size: f(BOX * unit), unit: f(unit) };
  };
  const wordsLeft = f(portrait.left + portrait.width + gap);
  return { width, height, portrait, real: at(real), clone: at(clone), words: { left: wordsLeft, top: pad, width: f(width - wordsLeft - pad) } };
}

/** The gap the card keeps above the raised Pass (CSS pixels). */
export const PASS_GAP = 6;

/**
 * How tall the sheet's body may be for the card alone (CSS pixels): the card is the sheet's only
 * claim, with no command and so no pinned actions row, and it spans the body's width, so the body
 * reaches from its top down to PASS_GAP above the raised Pass's top, and no further than the sheet
 * holds (sheet: js/turns.mjs turnsLayout()'s; pass: fitBoardV2()'s { cx, cy, r }).
 */
export function cloneBodyHeight(sheet, pass) {
  return f(Math.min(sheet.capacity, pass.cy - pass.r - PASS_GAP - sheet.body.top));
}

// ---------- the art ----------

/** The figure's own drawing inside an SVG of its frame: dressedFigureSvg()'s text without its outer element. */
function figureInner(figure) {
  const open = figure.indexOf('>', figure.indexOf('<svg')) + 1;
  return figure.slice(open, figure.lastIndexOf('</svg>'));
}
const frameBox = () => FRAME.box;

/**
 * The duplicate as it forms: the character's silhouette (the same drawing) screened in the deep
 * green's halftone, with a pale rim. density, 0 to 1, grows the dots from specks to a near-solid
 * screen. figure is dressedFigureSvg()'s text; prefix keeps the ids apart. The figure's frame, as an
 * SVG to lay over the same box.
 */
export function halftoneSvg(figure, { density = 1, prefix = 'cl' } = {}) {
  const [x, y, w, h] = frameBox();
  const r = f(0.5 + 1.6 * clamp01(density));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet"><defs>`
    + `<filter id="${prefix}-sil" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><feFlood flood-color="${CLONE.deep}"/><feComposite in2="SourceAlpha" operator="in"/></filter>`
    + `<filter id="${prefix}-rim" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d"/><feComposite in="d" in2="SourceAlpha" operator="out" result="e"/><feFlood flood-color="${CLONE.pale}"/><feComposite in2="e" operator="in"/></filter>`
    + `<pattern id="${prefix}-dot" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.5" cy="2.5" r="${r}" fill="#FFFFFF"/></pattern>`
    + `<mask id="${prefix}-screen" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${prefix}-dot)"/></mask>`
    + `</defs><g mask="url(#${prefix}-screen)"><g filter="url(#${prefix}-sil)">${figureInner(figure)}</g></g>`
    + `<g opacity="${f(0.35 + 0.45 * clamp01(density))}" filter="url(#${prefix}-rim)">${figureInner(figure).replace(/id="/g, 'id="r-').replace(/url\(#/g, 'url(#r-')}</g></svg>`;
}

/**
 * The real character once hidden: its outline alone, dotted, in the outline grey. figure is
 * dressedFigureSvg()'s text. The figure's frame, as an SVG to lay over the same box.
 */
export function outlineSvg(figure, { prefix = 'co' } = {}) {
  const [x, y, w, h] = frameBox();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet"><defs>`
    + `<filter id="${prefix}-edge" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><feMorphology in="SourceAlpha" operator="dilate" radius="4.5" result="d"/><feComposite in="d" in2="SourceAlpha" operator="out" result="e"/><feFlood flood-color="${CLONE.outline}"/><feComposite in2="e" operator="in"/></filter>`
    + `<pattern id="${prefix}-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="3" fill="#FFFFFF"/></pattern>`
    + `<mask id="${prefix}-dotted" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${prefix}-dots)"/></mask>`
    + `</defs><g mask="url(#${prefix}-dotted)"><g filter="url(#${prefix}-edge)">${figureInner(figure)}</g></g></svg>`;
}

/**
 * The scan band: horizontal lines one pixel high every three, brightest at its leading edge (its top,
 * where it sweeps upward; flip it for a downward sweep) and fading behind. width and height in CSS
 * pixels: the band as it is drawn.
 */
export function scanSvg({ width, height, prefix = 'cs' }) {
  const lines = [];
  for (let y = 1; y < height; y += 3) lines.push(`<rect x="0" y="${y}" width="${width}" height="1"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>`
    + `<linearGradient id="${prefix}-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="1"/><stop offset="0.25" stop-color="#FFFFFF" stop-opacity="0.7"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`
    + `<mask id="${prefix}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="url(#${prefix}-fade)"/></mask>`
    + `</defs><g mask="url(#${prefix}-m)"><g fill="${CLONE.scan}">${lines.join('')}</g><rect x="0" y="0" width="${width}" height="1.5" fill="${CLONE.pale}"/></g></svg>`;
}

/**
 * The portrait's stage: a dark green-black window, a faint holographic grid, the floor line, and a
 * projector pad under each of the two places (the real character's and the duplicate's), the
 * duplicate's lit only while it is there (lit, 0 to 1). width and height in CSS pixels; real and
 * clone, the feet's x in them; floor, their y.
 */
export function stageSvg({ width, height, real, clone, floor, lit = 0, prefix = 'st' }) {
  const grid = [];
  for (let x = 6; x < width; x += 12) grid.push(`<path d="M${f(x)} 0 V${f(height)}"/>`);
  for (let y = 6; y < height; y += 12) grid.push(`<path d="M0 ${f(y)} H${f(width)}"/>`);
  const pad = (cx, on) => `<ellipse cx="${f(cx)}" cy="${f(floor)}" rx="${f(width * 0.16)}" ry="${f(height * 0.035)}" fill="${CLONE.rim}" stroke="${CLONE.scan}" stroke-width="1" stroke-opacity="${f(0.25 + 0.55 * on)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(width)}" height="${f(height)}" viewBox="0 0 ${f(width)} ${f(height)}"><defs>`
    + `<radialGradient id="${prefix}-v" cx="0.5" cy="0.55" r="0.75"><stop offset="0" stop-color="${CLONE.rim}"/><stop offset="1" stop-color="${CLONE.stage}"/></radialGradient></defs>`
    + `<rect width="${f(width)}" height="${f(height)}" fill="url(#${prefix}-v)"/>`
    + `<g stroke="${CLONE.scan}" stroke-opacity="0.07" stroke-width="1">${grid.join('')}</g>`
    + `<path d="M0 ${f(floor)} H${f(width)}" stroke="${CLONE.scan}" stroke-opacity="0.18" stroke-width="1"/>`
    + pad(real, 1) + pad(clone, clamp01(lit))
    + `<rect x="0.5" y="0.5" width="${f(width - 1)}" height="${f(height - 1)}" fill="none" stroke="${INK}" stroke-width="1"/></svg>`;
}

/**
 * The tray's mark for the action (the Actions tray, beside its English label): a character's bust
 * and its dotted double behind it. As the kit's other marks (design/abilities/source/actions.svg):
 * one ink, a 32 x 32 cell, a 2.6 stroke with round ends, no transform; nothing in it names a role.
 */
export function markSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">`
    + `<g fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">`
    + `<g stroke-dasharray="2.2 2.9"><circle cx="20.5" cy="8.5" r="4.4"/><path d="M13 26.5 Q14 18 20.5 18 Q27 18 28 26.5"/></g>`
    + `<circle cx="11.5" cy="12" r="4.6" fill="${PAPER}"/><path d="M3 29 Q4 21.5 11.5 21.5 Q19 21.5 20 29 Z" fill="${PAPER}"/></g></svg>`;
}
