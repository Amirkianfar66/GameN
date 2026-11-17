// Colony Nine, the fever years, in the new world: a prefab field ward patched together from what was to hand. Its
// atmosphere is rust and ochre under one swinging lamp, the dust storm outside; its luminous accents the lamp's amber
// and the monitor's green. Drawn once in the new ink (./ink.mjs), in the ward's own px (520 x 700); what moves (the
// lamp, its light, the fan, the storm, the monitor's trace, the drips, the dust) is live (./live.mjs).

import { cable, ellipse, f, inkDefs, pipe, plate, rect, rivets, rng, shape } from './ink.mjs';

const ID = 'cw';
const INK = '#0A0705';
export const WARD = Object.freeze({ w: 520, h: 700 });
export const WPAL = Object.freeze({
  wall: '#5A3A24', wall2: '#6E4A2E', wallLit: '#9B6B3E', dark: '#1E130B', floor: '#2E2016', rust: '#7A4426', canvas: '#8C7656',
  sheet: '#CDBB98', amber: '#FFC27A', amberHot: '#FFE6B0', green: '#7CF2C8', dust: '#C9A877',
});
/** The swinging lamp's hook, the porthole, the fan, the monitor's screen, the leaking joint. */
export const LAMP = Object.freeze({ x: 270, y: 70, len: 120 });
export const PORTHOLE = Object.freeze({ cx: 450, cy: 190, r: 46 });
export const WFAN = Object.freeze({ cx: 110, cy: 44, r: 30 });
export const MONITOR = Object.freeze({ x: 392, y: 312, w: 62, h: 40 });
export const DRIP = Object.freeze([330, 92]);

function walls() {
  let out = `<rect x="-40" y="-40" width="600" height="800" fill="${WPAL.dark}"/>`;
  // Corrugated prefab panels, one patched with a bolted plate, one with tape.
  let panels = '';
  for (let i = 0; i < 7; i += 1) {
    const x = -20 + i * 82;
    panels += shape(ID, plate(x, 60, 84, 420, 0), i % 3 === 1 ? WPAL.wall2 : WPAL.wall, { shade: [4, 0], w: 2.2, hatch: 'h2' });
    for (let k = 6; k < 82; k += 9) panels += `<path d="M${x + k} 62V478" stroke="#2A1A0F" stroke-width="1.6" opacity="0.7"/><path d="M${x + k + 2.5} 62V478" stroke="${WPAL.wallLit}" stroke-width="0.7" opacity="0.5"/>`;
    panels += rivets(x + 6, 68, x + 6, 470, 9, { r: 1.5, ink: INK, lit: '#C9926A' });
  }
  panels += shape(ID, plate(196, 250, 70, 56, 6), '#7D5B3C', { shade: [3, 3], w: 2 }) + rivets(202, 256, 260, 256, 4, { r: 1.4, ink: INK, lit: '#E0B080' }) + rivets(202, 300, 260, 300, 4, { r: 1.4, ink: INK, lit: '#E0B080' });
  panels += `<path d="M300 150l40 6l-2 10l-40 -6Z" fill="#CDBB98" opacity="0.8" stroke="${INK}" stroke-width="1"/><path d="M310 140l8 34" stroke="#CDBB98" stroke-width="8" opacity="0.7"/>`;
  out += `<g filter="url(#${ID}-wear)">${panels}</g>`;
  // The ceiling: beams and a pipe run with a leaking joint (it drips, live), a rag round another.
  out += shape(ID, rect(-40, -10, 600, 70), '#24170D', { shade: [0, 10], w: 2.6 });
  for (let x = -30; x < 560; x += 70) out += shape(ID, plate(x, 0, 18, 66, 3), '#3A2616', { shade: [3, 0], w: 2 });
  out += pipe([[-40, 82], [560, 82]], 7, '#7A5A3E', { ink: INK, light: '#E0B080' }) + pipe([[-40, 98], [200, 98], [200, 140], [-40, 140]], 4, '#4F5A4A', { ink: INK, light: '#A9BFA0', flanges: true });
  out += shape(ID, 'M316 74C320 70 340 70 344 74L344 90C340 94 320 94 316 90Z', '#BFAE8E', { shade: [2, 2], w: 1.6, ink: INK });
  out += cable([-40, 64], [240, 60], 30, { w: 2.6, color: '#1A120B', ink: INK }) + cable([240, 60], [560, 66], 40, { w: 3.4, color: '#1A120B', ink: INK });
  // The fan's housing (its blades turn live).
  out += `<circle cx="${WFAN.cx}" cy="${WFAN.cy}" r="${WFAN.r + 6}" fill="#2E1E12" stroke="${INK}" stroke-width="2.6"/>`;
  // The porthole, its frame bolted, the storm behind it live.
  const P = PORTHOLE;
  out += `<circle cx="${P.cx}" cy="${P.cy}" r="${P.r + 14}" fill="#4A3424" stroke="${INK}" stroke-width="3"/><circle cx="${P.cx}" cy="${P.cy}" r="${P.r}" fill="#3A2A1A" stroke="${INK}" stroke-width="3"/>`;
  for (let i = 0; i < 10; i += 1) { const a = (i / 10) * Math.PI * 2; out += `<circle cx="${f(P.cx + Math.cos(a) * (P.r + 7))}" cy="${f(P.cy + Math.sin(a) * (P.r + 7))}" r="2" fill="${INK}"/>`; }
  // The floor: worn plates, a drain, grime.
  out += shape(ID, 'M-40 480H560V740H-40Z', WPAL.floor, { w: 2.6 });
  for (let i = -6; i < 10; i += 1) out += `<path d="M${260 + i * 26} 480L${260 + i * 90} 740" stroke="#140D07" stroke-width="1.6" opacity="0.7"/>`;
  for (const y of [520, 580, 660]) out += `<path d="M-40 ${y}H560" stroke="#140D07" stroke-width="1.4" opacity="0.6"/>`;
  return `<g filter="url(#${ID}-rough)">${out}</g>`;
}

/** A cot seen from its side going back: legs, canvas, a sheet over somebody (no face shows), a pillow. */
function cot(x, y, w, k, seed) {
  const h = w * 0.13, r = w * 0.1;
  let out = '';
  for (const [a, b] of [[0.05, 0.08], [0.95, 0.92]]) out += `<path d="M${f(x + w * a)} ${f(y + h)}L${f(x + w * b)} ${f(y + h + w * 0.16)}" stroke="${INK}" stroke-width="${f(2.4 * k)}"/>`;
  out += shape(ID, plate(x, y, w, h, 2 * k), WPAL.canvas, { shade: [0, 3 * k], w: 2.2 * k, ink: INK });
  out += shape(ID, `M${f(x + w * 0.03)} ${f(y + 2)}C${f(x + w * 0.1)} ${f(y - r * 0.6)} ${f(x + w * 0.4)} ${f(y - r * 0.7)} ${f(x + w * 0.55)} ${f(y - r * 1.05)}S${f(x + w * 0.8)} ${f(y - r * 0.9)} ${f(x + w * 0.86)} ${f(y + 2)}Z`, WPAL.sheet, { shade: [2 * k, 4 * k], w: 2.2 * k, ink: INK, hatch: 'hl' });
  out += shape(ID, plate(x + w * 0.82, y - r * 0.3, w * 0.17, r * 0.4, 3 * k), '#E6D9BE', { w: 1.6 * k, ink: INK });
  out += shape(ID, `M${f(x + w * 0.83)} ${f(y - r * 0.4)}C${f(x + w * 0.85)} ${f(y - r * 1.25)} ${f(x + w * 0.96)} ${f(y - r * 1.25)} ${f(x + w * 0.98)} ${f(y - r * 0.4)}Z`, '#2A1E16', { w: 1.8 * k, ink: INK });
  return out;
}

function room() {
  let out = '';
  // Three cots going back, the nearest at the front; an IV stand; the monitor on its cart; a crate, a tank, a bucket.
  out += cot(330, 400, 110, 0.55, 31) + cot(190, 430, 170, 0.75, 41);
  out += `<path d="M362 300V476M350 476h24" stroke="${INK}" stroke-width="3"/><path d="M356 300h12" stroke="${INK}" stroke-width="2.4"/>`;
  out += shape(ID, 'M352 304h16v26c0 6 -16 6 -16 0Z', '#D7E6C8', { w: 1.6, ink: INK, opacity: 0.85 }) + `<path d="M360 334C360 360 372 380 380 420" stroke="#D7E6C8" stroke-width="1" fill="none"/>`;
  out += shape(ID, plate(MONITOR.x - 8, MONITOR.y - 8, MONITOR.w + 16, MONITOR.h + 16, 4), '#2E2A22', { shade: [3, 3], w: 2.4, ink: INK });
  out += `<rect x="${MONITOR.x}" y="${MONITOR.y}" width="${MONITOR.w}" height="${MONITOR.h}" fill="#04140D"/>`;
  out += shape(ID, plate(MONITOR.x - 4, MONITOR.y + MONITOR.h + 8, MONITOR.w + 8, 60, 3), '#3A3024', { shade: [3, 0], w: 2.2, ink: INK }) + `<path d="M${MONITOR.x} ${MONITOR.y + MONITOR.h + 70}h${MONITOR.w}" stroke="${INK}" stroke-width="3"/>`;
  for (const cx of [MONITOR.x + 4, MONITOR.x + MONITOR.w - 4]) out += `<circle cx="${cx}" cy="${MONITOR.y + MONITOR.h + 76}" r="5" fill="#1A120B" stroke="${INK}" stroke-width="1.4"/>`;
  out += shape(ID, plate(450, 430, 66, 50, 3), '#6B5236', { shade: [3, 3], w: 2.2, ink: INK }) + `<path d="M450 448h66M470 430v50" stroke="#CDBB98" stroke-width="5" opacity="0.7"/>`;
  out += shape(ID, 'M20 330C20 318 46 318 46 330V470C46 478 20 478 20 470Z', '#4F5A4A', { shade: [5, 0], w: 2.4, ink: INK, hatch: 'h2' }) + `<rect x="27" y="310" width="12" height="12" fill="#2A2620" stroke="${INK}" stroke-width="1.6"/>`;
  out += shape(ID, 'M60 440h30l-4 40h-22Z', '#6E5A44', { shade: [3, 2], w: 2, ink: INK });
  // The nearest cot, big at the front, its foot by her.
  out += cot(70, 520, 300, 1.05, 51);
  return `<g filter="url(#${ID}-rough)"><g filter="url(#${ID}-wear)">${out}</g></g>`;
}

/** The ward's planes in its own px: `back` (walls, ceiling, floor, the porthole's frame) and `room` (the cots and kit). */
export function wardPlanes() {
  return { defs: inkDefs(ID, { ink: INK }), back: walls(), room: room() };
}

export { ellipse, rng };
