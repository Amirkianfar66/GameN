// mothership:dev-only
//
// The role film's comic page: a tier of three panels that slam in over the briefing room, the guided
// camera that moves from panel to panel and pulls back to the page, the memory flash that opens it,
// and the title that names the role. The beats are clock.mjs's; the pictures inside the panels are
// the role's own (./doctor.mjs for the Doctor). Redrawn for the owner's "AAA" review:
//   - each panel lands with weight: from a little larger and turned, overshooting, with impact lines
//     bursting from behind its edges and a jolt through the page;
//   - memory is printed in sepia, with a heavier vignette, paper grain, a warm leak of light and a
//     film's scratches flickering over it; the panel aboard is in the night's own colours;
//   - the room behind the page drops out of focus and into the dark;
//   - the title is simple, at the owner's word: the role's name in the brand's alphabet, plain, in
//     its team's colour on the darkened page.

import { blurFilter, halftone, impactLines, linear, radial } from '../kit/fx.mjs';
import { GLYPHS } from '../kit/letters.mjs';
import { clamp01, ease, f, f3, hash, lerp, progress, rng, shake } from '../kit/math.mjs';
import { PANEL_STARTS, PANEL_TONES } from './clock.mjs';

const INK = '#0B0E15';

/** The page's three panels on a W x H phone: [x, y, w, h, tilt (deg)]. */
export function panelsOf(W, H) {
  const m = W * 0.045, gap = H * 0.016;
  const top = H * 0.06, bottom = H * 0.945;
  const each = (bottom - top - gap * 2) / 3;
  return [
    { x: m, y: top, w: W - m * 2, h: each, tilt: -1.1 },
    { x: m, y: top + each + gap, w: W - m * 2, h: each, tilt: 0.8 },
    { x: m, y: top + (each + gap) * 2, w: W - m * 2, h: each, tilt: -0.6 },
  ];
}

/** The guided camera's transform for the page: onto a panel (index) or the whole page (-1). */
function viewOf(W, H, panels, index, zoom) {
  if (index < 0) return { s: 1, x: 0, y: 0 };
  const p = panels[index];
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
  // Centre the panel, but never pull the page's edge in past the frame's.
  let x = W / 2 - cx * zoom, y = H / 2 - cy * zoom;
  x = Math.min(0, Math.max(W - W * zoom, x));
  y = Math.min(H * 0.02, Math.max(H - H * zoom - H * 0.02, y));
  return { s: zoom, x, y };
}
export function cameraOf(W, H, frame, zoom = 1.08) {
  const panels = panelsOf(W, H);
  const a = viewOf(W, H, panels, frame.camera.from, zoom), b = viewOf(W, H, panels, frame.camera.to, zoom);
  const v = frame.camera.v;
  return { s: lerp(a.s, b.s, v), x: lerp(a.x, b.x, v), y: lerp(a.y, b.y, v) };
}

const SEPIA = '0.393 0.769 0.189 0 0.02  0.349 0.686 0.168 0 0.01  0.272 0.534 0.131 0 -0.02  0 0 0 1 0';

/**
 * One panel, framed: `art` is the role's picture for it in panel units (0..w, 0..h). `p` its place,
 * `state` its clock state ({ enter, slam, local }), `focus` its light (1 lit, less stepped back).
 */
function framed(D, i, p, art, { state, focus, tone, t, reduced }) {
  const { x, y, w, h, tilt } = p;
  const cx = x + w / 2, cy = y + h / 2;
  const s = reduced ? 1 : lerp(1.22, 1, ease.outCubic(state.slam)) * (state.slam >= 1 ? 1 : 1);
  const turn = reduced ? 0 : lerp(4 * (i % 2 ? -1 : 1), 0, ease.outBack(state.slam, 1.6));
  const on = reduced ? 1 : clamp01(state.slam * 3);
  const clip = `pg-clip-${i}`;
  D.use(clip, `<clipPath id="${clip}"><rect width="${f(w)}" height="${f(h)}"/></clipPath>`);
  const past = tone === 'past';
  const grade = past ? ` filter="${D.use(`pg-sepia`, `<filter id="pg-sepia" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${SEPIA}"/><feComponentTransfer><feFuncR type="linear" slope="1.08" intercept="-0.02"/><feFuncG type="linear" slope="1.05" intercept="-0.02"/><feFuncB type="linear" slope="0.95" intercept="-0.01"/></feComponentTransfer></filter>`)}"` : '';
  const vig = radial(D, `pg-vig-${past ? 'p' : 'n'}`, [[0, '#000', 0], [0.6, '#000', past ? 0.15 : 0.05], [1, '#000', past ? 0.75 : 0.55]], { r: 0.72 });
  let over = `<rect width="${f(w)}" height="${f(h)}" fill="${vig}"/>`;
  if (past) {
    over += `<rect width="${f(w)}" height="${f(h)}" fill="${halftone(D, 'pg-sepia-dots', { size: 4, r: 0.7, color: '#3B2A16', angle: 45 })}" opacity="0.18"/>`;
    if (!reduced) {
      // A film's scratches and a warm leak, flickering.
      const r = rng(1000 + Math.floor(t / 83));
      for (let k = 0; k < 2; k += 1) if (r() < 0.55) { const sx = r() * w; over += `<path d="M${f(sx)} 0L${f(sx + (r() - 0.5) * 6)} ${f(h)}" stroke="#F7E7C6" stroke-width="${f(0.6 + r())}" opacity="${f3(0.15 + r() * 0.2)}"/>`; }
      const leakK = 0.18 + 0.1 * Math.sin(t / 310 + i);
      over += `<rect width="${f(w)}" height="${f(h)}" fill="${linear(D, 'pg-leak', [[0, '#FFB45E', 0.9], [0.4, '#FFB45E', 0.15], [1, '#FFB45E', 0]], { x1: 0, y1: 0, x2: 1, y2: 0.2 })}" opacity="${f3(leakK)}" style="mix-blend-mode:screen"/>`;
    }
  }
  const dim = 1 - focus;
  const body = `<g clip-path="url(#${clip})"><g${grade}>${art}</g>${over}${dim > 0.01 ? `<rect width="${f(w)}" height="${f(h)}" fill="#03050A" opacity="${f3(dim)}"/>` : ''}</g>`;
  const frame = `<rect x="-3" y="-3" width="${f(w + 6)}" height="${f(h + 6)}" fill="none" stroke="#F4EBDD" stroke-width="2.4"/>`
    + `<rect width="${f(w)}" height="${f(h)}" fill="none" stroke="${INK}" stroke-width="3.6"/>`;
  const shadow = `<rect x="6" y="9" width="${f(w)}" height="${f(h)}" fill="#000" opacity="0.6" filter="${blurFilter(D, 'pg-panel-shadow', 7)}"/>`;
  const burst = !reduced && state.slam > 0 && state.local < 520
    ? impactLines({ seed: 30 + i, n: 16, k: progress(state.local, 0, 420), at: [cx, cy], r0: Math.max(w, h) * 0.53, r1: Math.max(w, h) * 0.72, color: '#F4EBDD', width: 3.2, opacity: 0.4, aspect: w / h })
    : '';
  return burst + `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f3(tilt + turn)}) scale(${f3(s)}) translate(${f(-w / 2)} ${f(-h / 2)})" opacity="${f3(on)}">${shadow}${body}${frame}</g>`;
}

/**
 * The page at the frame's moment: `arts` the role's three panel pictures (functions of their local
 * time), `back` the briefing room's picture (drawn behind, out of focus). Returns the page's markup.
 */
export function pageSvg(D, { W, H, frame, arts, t }) {
  const panels = panelsOf(W, H);
  const reduced = frame.reduced;
  let out = '';
  // A jolt through the page as each panel lands.
  let [jx, jy] = [0, 0];
  if (!reduced) for (const start of PANEL_STARTS) { const [a, b] = shake(frame.t, start + 230, { amp: 4.5, ms: 240, seed: start }); jx += a; jy += b; }
  frame.panels.forEach((state, i) => {
    if (!state.visible) return;
    const p = panels[i];
    const art = arts[i]({ w: p.w, h: p.h, local: state.local });
    out += framed(D, i, p, art, { state, focus: frame.focus[i], tone: PANEL_TONES[i], t, reduced });
  });
  const cam = reduced ? { s: 1, x: 0, y: 0 } : cameraOf(W, H, frame);
  return `<g transform="translate(${f(cam.x + jx)} ${f(cam.y + jy)}) scale(${f3(cam.s)})">${out}</g>`;
}

/** The narration boxes' places (page text, drawn by the page as DOM text), under the guided camera. */
export function captionPlaces(W, H, frame) {
  const panels = panelsOf(W, H);
  const cam = frame.reduced ? { s: 1, x: 0, y: 0 } : cameraOf(W, H, frame);
  return [0, 1].map(i => {
    const p = panels[i];
    const x = cam.x + (p.x + 8) * cam.s, y = cam.y + (p.y + 8) * cam.s;
    return { x: Math.max(6, x), y: Math.max(6, y), opacity: frame.captions[i], drop: frame.drops[i], tilt: p.tilt };
  });
}

/** The memory flash: warm light swelling out of the gadget's glint, washing the frame, clearing. */
export function flashSvg(D, { W, H, at, k }) {
  if (k <= 0.001) return '';
  const r = Math.hypot(W, H) * lerp(0.05, 1.25, ease.outCubic(Math.min(1, k * 1.4)));
  const g = radial(D, 'pg-flash', [[0, '#FFFFFF', 1], [0.35, '#FFF1D2', 0.95], [0.75, '#FFC98A', 0.55], [1, '#FFB060', 0]]);
  return `<circle cx="${f(at[0])}" cy="${f(at[1])}" r="${f(r)}" fill="${g}" opacity="${f3(Math.min(1, k * 1.15))}" style="mix-blend-mode:screen"/>`
    + `<rect width="${f(W)}" height="${f(H)}" fill="#FFF3DC" opacity="${f3(Math.max(0, k - 0.55) * 1.6)}"/>`;
}

/**
 * The title's colour, by the role's team, at the owner's word (8 November 2026): the Blue team's roles
 * in plain blue (the Doctor's, approved first), the Red team's in plain red, and the Alien in purple.
 * The three are one family: the same lightness, each about 5:1 on the darkened page.
 */
export const TITLE_COLOURS = Object.freeze({ blue: '#2979FF', red: '#E8423F', alien: '#9B5CFF' });
const TITLE_TRACKING = 1.3;

/** A word in the brand's alphabet: each letter's grid x (from the word's left), advance and strokes. */
function lettersOf(text) {
  let x = 0;
  return [...text].map(ch => {
    const [advance, lines] = GLYPHS[ch] ?? GLYPHS[' '];
    const out = { x, advance, lines };
    x += advance + TITLE_TRACKING;
    return out;
  });
}

/**
 * The title, simple at the owner's word (8 November 2026: "the background of the text is crowded,
 * make it simple blue color"): the page goes almost black, and the role's name rises into place letter
 * by letter in plain strokes of its team's colour, with a soft glow and a thin rule drawn out beneath
 * it. No plate, no ink, no dust and no sheen. The same for every role but the name and the colour.
 */
export function titleSvg(D, { W, H, frame, role }) {
  const tl = frame.title;
  if (!tl.visible) return '';
  const colour = TITLE_COLOURS[role.team];
  const letters = lettersOf(role.name.toUpperCase());
  const span = letters.at(-1).x + letters.at(-1).advance;
  const cap = Math.min((W * 0.66) / (span / 6), H * 0.07);
  const k = cap / 6;
  const x0 = W / 2 - (span * k) / 2, y0 = H * 0.5 - cap * 0.75;
  let word = '';
  letters.forEach((c, i) => {
    if (!c.lines.length) return;
    const p = tl.letter(i);
    if (p <= 0.001) return;
    const lift = (1 - p) * cap * 0.3;
    const d = c.lines.map(line => `M${line.map(([u, v]) => `${f(x0 + (c.x + u) * k)} ${f(y0 + v * k + lift)}`).join('L')}`).join('');
    word += `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${f(1.05 * k)}" stroke-linecap="round" stroke-linejoin="round" opacity="${f3(clamp01(p * 1.5))}"/>`;
  });
  const ruleW = span * k * 0.36 * tl.rule, ruleH = Math.max(1.5, cap * 0.05);
  // The page goes almost black, and clean black behind the name: nothing shows through the letters.
  let out = `<rect width="${f(W)}" height="${f(H)}" fill="#03050A" opacity="${f3(0.95 * frame.dim)}"/>`;
  const pool = radial(D, 'pg-title-pool', [[0, '#03050A', 1], [0.6, '#03050A', 0.9], [1, '#03050A', 0]]);
  out += `<ellipse cx="${f(W / 2)}" cy="${f(y0 + cap * 0.7)}" rx="${f(Math.min(W * 0.62, span * k * 0.85))}" ry="${f(cap * 2.6)}" fill="${pool}" opacity="${f3(frame.dim)}"/>`;
  out += `<g opacity="0.3" filter="${blurFilter(D, 'pg-title-glow', cap * 0.1)}">${word}</g>${word}`;
  if (ruleW > 0.5) out += `<rect x="${f(W / 2 - ruleW / 2)}" y="${f(y0 + cap * 1.5)}" width="${f(ruleW)}" height="${f(ruleH)}" rx="${f(ruleH / 2)}" fill="${colour}" opacity="0.75"/>`;
  return out;
}

export { hash };
