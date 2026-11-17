// The briefing room, in the new world (the owner, 16 November 2026): a ready room on the dock's service deck, built
// from layered machinery, its port open on a cosmic view. Drawn once into planes of depth, each in the new ink
// (./ink.mjs), in the design's own px (a 390 x 844 phone; ./index places it on any size). The desk, the card, the
// lamp and the character keep today's places (roles/briefing.mjs layout), so the acting fits.
//
// Its atmosphere: steel blues and worn green-greys in a cold dock light; two luminous accents, the amber of the desk
// lamp (the focal point: her face, her hand, the injector) and the cyan of the wall terminal; and through the port,
// the cosmos in saturated teal, magenta and gold. Detail gathers round the focal point and thins toward the frame.

import { cable, circle, ellipse, f, glowSvg, inkDefs, pipe, plate, rect, rivets, rng, shadeOf, shape, tintOf } from './ink.mjs';

const ID = 'nw';
export const INK = '#07090E';
export const PAL = Object.freeze({
  deep: '#0D121B', steel: '#243041', steel2: '#2F3D52', steelLit: '#4B5E78', pale: '#8FA2BC', green: '#3E5249', greenLit: '#5D7464',
  rust: '#6B4630', amber: '#FFB347', amberHot: '#FFE0A3', cyan: '#3FE0D0', teal: '#19C7B4',
  magenta: '#C83C9A', plum: '#5E2A84', indigo: '#2B1B5E', gold: '#FFB347', space: '#07051A', paper: '#EFE4CF',
});

/** The port's opening, in design px. */
export const PORT = Object.freeze({ x: 18, y: 58, w: 282, h: 410, r: 26 });
/** The wall terminal's two screens and its lights (their faces are drawn live). */
export const SCREENS = Object.freeze([{ x: 316, y: 150, w: 64, h: 56 }, { x: 316, y: 216, w: 64, h: 44 }]);
export const LIGHTS = Object.freeze({ x: 322, y: 272, n: 5, gap: 10 });
/** The duct fan's housing (its blades turn behind the grille). */
export const FAN = Object.freeze({ cx: 352, cy: 30, r: 19 });
/** Where steam escapes from a joint on the left pipes. */
export const STEAM = Object.freeze([[-2, 312], [8, 120]]);
/** The orbits drawn in the view: centre, radii, tilt (degrees), for the moons and satellites that run on them. */
export const ORBITS = Object.freeze([
  { cx: -10, cy: 470, rx: 330, ry: 74, tilt: -12, speed: 0.00011, phase: 0.3, color: '#7CF2C8' },
  { cx: -10, cy: 470, rx: 270, ry: 52, tilt: -12, speed: -0.00016, phase: 2.1, color: '#FFB347' },
  { cx: 170, cy: 170, rx: 150, ry: 40, tilt: 18, speed: 0.00022, phase: 4.0, color: '#E86FA8' },
]);
/** The Mothership at its dock, in the view. */
export const SHIP = Object.freeze({ x: 150, y: 250, s: 0.82 });

const portPath = () => {
  const { x, y, w, h, r } = PORT;
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
};

// ── The view: the cosmos ─────────────────────────────────────────────

function space() {
  const r = rng(3);
  let out = `<defs><linearGradient id="${ID}-sky" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#05040F"/><stop offset="0.5" stop-color="${PAL.indigo}"/><stop offset="1" stop-color="#120A24"/></linearGradient>`
    + `<filter id="${ID}-neb" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>`
    + `<filter id="${ID}-neb2" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="60" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="5"/></filter>`
    + `<radialGradient id="${ID}-planet" cx="0.68" cy="0.3" r="0.75"><stop offset="0" stop-color="#E9B26A"/><stop offset="0.45" stop-color="#9C5B4A"/><stop offset="0.8" stop-color="#3B2140"/><stop offset="1" stop-color="#140A1C"/></radialGradient>`
    + `<clipPath id="${ID}-planetclip"><circle cx="-30" cy="560" r="250"/></clipPath></defs>`;
  out += `<rect x="-60" y="20" width="420" height="500" fill="url(#${ID}-sky)"/>`;
  // The nebula: swirling arms of colour round a bright knot, pushed about by noise.
  let neb = '';
  for (let i = 0; i < 3; i += 1) {
    const color = [PAL.magenta, PAL.teal, PAL.plum][i];
    const pts = [];
    for (let k = 0; k <= 40; k += 1) {
      const a = k * 0.16 + i * 2.1, rr = 12 + k * 4.6;
      pts.push([215 + Math.cos(a) * rr, 150 + Math.sin(a) * rr * 0.62]);
    }
    neb += `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="${color}" stroke-width="${26 - i * 4}" stroke-linecap="round" opacity="${0.55 - i * 0.08}"/>`;
  }
  neb += `<ellipse cx="215" cy="150" rx="70" ry="42" fill="${PAL.magenta}" opacity="0.35"/><ellipse cx="120" cy="250" rx="110" ry="60" fill="${PAL.teal}" opacity="0.18"/>`;
  out += `<g filter="url(#${ID}-neb2)">${neb}</g>`;
  out += `<g filter="url(#${ID}-neb)"><circle cx="215" cy="150" r="22" fill="#FFE0F0" opacity="0.6"/><circle cx="215" cy="150" r="9" fill="#FFFFFF"/></g>`;
  // Stars, a few with a cross of light.
  for (let i = 0; i < 160; i += 1) {
    const x = -50 + r() * 400, y = 25 + r() * 470, b = r() ** 3, s = 0.35 + b * 1.4;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="${b > 0.5 ? '#FFF2D8' : '#D8F4FF'}" opacity="${f(0.35 + 0.65 * b)}"/>`;
    if (b > 0.75) out += `<path d="M${f(x - 6 * s)} ${f(y)}H${f(x + 6 * s)}M${f(x)} ${f(y - 6 * s)}V${f(y + 6 * s)}" stroke="#FFF6E6" stroke-width="0.5" opacity="0.6"/>`;
  }
  // The giant: banded, lit from the upper right, its night side inked; its rings in front.
  out += `<circle cx="-30" cy="560" r="250" fill="url(#${ID}-planet)"/>`;
  let bands = '';
  for (let i = 0; i < 9; i += 1) bands += `<path d="M-300 ${f(360 + i * 34)}Q-30 ${f(330 + i * 34 + (i % 2 ? 14 : -8))} 240 ${f(372 + i * 34)}" stroke="${i % 2 ? '#C9845A' : '#5E2A4A'}" stroke-width="${f(6 + (i % 3) * 5)}" fill="none" opacity="0.35"/>`;
  out += `<g clip-path="url(#${ID}-planetclip)">${bands}<rect x="-300" y="300" width="600" height="600" fill="url(#${ID}-hl)" opacity="0.5"/><path d="M-300 900L-300 300Q-80 360 70 900Z" fill="#0A0612" opacity="0.55"/></g>`;
  out += `<circle cx="-30" cy="560" r="250" fill="none" stroke="#FFD9A8" stroke-width="2.4" opacity="0.7"/><circle cx="-30" cy="560" r="250" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.6"/>`;
  out += `<g transform="rotate(-12 -10 470)">`
    + `<ellipse cx="-10" cy="470" rx="360" ry="70" fill="none" stroke="#E8C79A" stroke-width="14" opacity="0.28"/>`
    + `<ellipse cx="-10" cy="470" rx="340" ry="64" fill="none" stroke="#FFE2B8" stroke-width="3" opacity="0.6"/>`
    + `<ellipse cx="-10" cy="470" rx="390" ry="80" fill="none" stroke="#C49A76" stroke-width="5" opacity="0.3"/></g>`;
  // The orbital geometry: thin orbits with their nodes and ticks, the instruments' way of seeing the sky.
  for (const o of ORBITS) {
    out += `<g transform="rotate(${o.tilt} ${o.cx} ${o.cy})"><ellipse cx="${o.cx}" cy="${o.cy}" rx="${o.rx}" ry="${o.ry}" fill="none" stroke="${o.color}" stroke-width="0.8" stroke-dasharray="2 5" opacity="0.65"/>`;
    for (let k = 0; k < 12; k += 1) { const a = (k / 12) * Math.PI * 2; out += `<circle cx="${f(o.cx + Math.cos(a) * o.rx)}" cy="${f(o.cy + Math.sin(a) * o.ry)}" r="1" fill="${o.color}" opacity="0.7"/>`; }
    out += '</g>';
  }
  out += `<circle cx="215" cy="150" r="64" fill="none" stroke="${PAL.gold}" stroke-width="0.7" opacity="0.5"/><circle cx="215" cy="150" r="96" fill="none" stroke="${PAL.gold}" stroke-width="0.5" stroke-dasharray="1 4" opacity="0.5"/>`;
  out += `<path d="M215 40V260M95 150H335" stroke="${PAL.gold}" stroke-width="0.4" opacity="0.35"/>`;
  out += ship();
  return out;
}

/** The Mothership at its dock: a long hull of overlapping plates, its gantry, its lit ports (the lights are live). */
function ship() {
  const { x, y, s } = SHIP;
  let g = '';
  // The dock's gantry arms from above, holding it.
  g += `<path d="M-40 -240L-20 -30M60 -240L44 -34M-40 -150H60M-34 -100H54" stroke="#0B0E16" stroke-width="7" fill="none"/>`;
  g += `<path d="M-40 -240L-20 -30M60 -240L44 -34" stroke="#3A4A63" stroke-width="2" fill="none"/>`;
  // The hull, plate over plate.
  g += shape(ID, 'M-150 -6L-138 -24L-96 -30L40 -36L118 -24L152 -6L154 6L118 20L-20 28L-112 24L-150 10Z', '#33415A', { shade: [0, 7], w: 2.6 });
  g += shape(ID, 'M-62 -32L-40 -48L30 -50L72 -38L-50 -34Z', '#4C5D78', { shade: [0, 3], w: 2 });
  g += shape(ID, 'M60 -46L74 -62L98 -62L108 -46L104 -36L64 -36Z', '#4C5D78', { shade: [2, 3], w: 2 });
  g += shape(ID, 'M-30 24L70 20L98 30L-20 36Z', '#1F2738', { w: 1.6 });
  for (const xx of [-110, -70, -30, 10, 50, 90]) g += `<path d="M${xx} -30L${xx + 3} 24" stroke="${INK}" stroke-width="1" opacity="0.8"/>`;
  g += `<path d="M-120 -4L140 -2" stroke="#8FA2BC" stroke-width="1.4" opacity="0.7"/>`;
  for (const yy of [-16, 0, 14]) g += shape(ID, `M-150 ${yy - 6}L-164 ${yy - 9}L-170 ${yy}L-164 ${yy + 9}L-150 ${yy + 6}Z`, '#151B28', { w: 1.6 });
  return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
}

/** The ship's ports, in the view's px, for the live lights. */
export function shipPorts() {
  const out = [];
  const { x, y, s } = SHIP;
  for (let row = 0; row < 2; row += 1) for (let i = 0; i < 22; i += 1) {
    if ((i * 7 + row * 3) % 5 === 0) continue;
    out.push([x + (-100 + i * 10 + row * 5) * s, y + (-16 + row * 14) * s]);
  }
  return out;
}

// ── The bulkhead round the port, its pipes, cables, duct and terminal ──

function wall() {
  const P = PORT;
  let out = '';
  // The bulkhead: a field of overlapping plates, the port cut through it.
  const plates = [];
  const r = rng(21);
  for (let row = 0; row < 7; row += 1) for (let col = 0; col < 7; col += 1) {
    const x = -130 + col * 96 + (row % 2) * 30, y = -10 + row * 90;
    plates.push([x, y, 100 + r() * 20, 96 + r() * 14, row, col]);
  }
  let field = '';
  for (const [x, y, w, h, row, col] of plates) {
    const tone = (row * 3 + col) % 5 === 0 ? PAL.green : (row + col) % 3 === 0 ? PAL.steel2 : PAL.steel;
    field += shape(ID, plate(x, y, w, h, 7), tone, { shade: [3, 4], w: 2, hatch: 'h2' }) + rivets(x + 8, y + 6, x + w - 8, y + 6, 5) + rivets(x + 8, y + h - 7, x + w - 8, y + h - 7, 5);
  }
  // Cut the port out of the field (an even-odd mask), then the port's heavy frame of chamfered armour.
  out += `<defs><mask id="${ID}-portcut" maskUnits="userSpaceOnUse" x="-200" y="-200" width="800" height="1200"><rect x="-200" y="-200" width="800" height="1200" fill="#fff"/><path d="${portPath()}" fill="#000"/></mask></defs>`;
  out += `<g mask="url(#${ID}-portcut)"><g filter="url(#${ID}-wear)">${field}</g>`;
  const frame = `M${P.x - 22} ${P.y - 22}H${P.x + P.w + 22}V${P.y + P.h + 26}H${P.x - 22}Z`;
  out += shape(ID, frame, '#1A2230', { w: 2.6 });
  out += `<path d="${portPath()}" fill="none" stroke="#3B4A61" stroke-width="18"/><path d="${portPath()}" fill="none" stroke="${INK}" stroke-width="3"/>`;
  out += `<path d="${portPath()}" fill="none" stroke="#9FD8E0" stroke-width="1.4" opacity="0.55" transform="translate(-1.5 1.5)"/>`;
  out += rivets(P.x - 12, P.y - 12, P.x + P.w + 12, P.y - 12, 11, { r: 2.2 }) + rivets(P.x - 12, P.y + P.h + 14, P.x + P.w + 12, P.y + P.h + 14, 11, { r: 2.2 });
  out += rivets(P.x - 12, P.y + 10, P.x - 12, P.y + P.h, 12, { r: 2.2 }) + rivets(P.x + P.w + 12, P.y + 10, P.x + P.w + 12, P.y + P.h, 12, { r: 2.2 });
  // Worn chevrons along the port's sill, amber and ink.
  let chev = '';
  for (let x = P.x - 10; x < P.x + P.w + 10; x += 14) chev += `<path d="M${x} ${P.y + P.h + 6}l7 0l-8 14l-7 0Z" fill="${PAL.amber}" opacity="0.75"/>`;
  out += `<g filter="url(#${ID}-wear)">${chev}</g>`;
  out += '</g>';
  // The duct along the ceiling, ribbed, with the fan's housing on the right.
  out += shape(ID, rect(-140, -10, 680, 52), '#1C2534', { shade: [0, 8], w: 2.6 });
  for (let x = -130; x < 540; x += 26) out += `<path d="M${x} -8V40" stroke="${INK}" stroke-width="2"/><path d="M${x + 2} -8V40" stroke="#4B5E78" stroke-width="0.8" opacity="0.6"/>`;
  out += `<path d="M-140 42H540" stroke="${INK}" stroke-width="3"/>`;
  out += `<circle cx="${FAN.cx}" cy="${FAN.cy}" r="${FAN.r + 6}" fill="#2A3445" stroke="${INK}" stroke-width="2.4"/>` + rivets(FAN.cx - FAN.r - 3, FAN.cy, FAN.cx + FAN.r + 3, FAN.cy, 2, { r: 1.6 });
  // Pipes: a bundle down the left, a run under the duct, one down the right to the terminal.
  out += pipe([[-30, 40], [-30, 640]], 9, '#4D5F74', { flanges: false }) + pipe([[-8, 40], [-8, 300], [6, 314], [6, 640]], 6, '#6B4630', { light: '#C9926A' });
  out += pipe([[14, 40], [14, 200], [-4, 200], [-4, 640]], 4.5, '#3E5249', { light: '#9DBBA6' });
  out += pipe([[-140, 52], [540, 52]], 6.5, '#4D5F74', { flanges: false });
  out += pipe([[302, 52], [302, 120], [392, 120]], 5, '#6B4630', { light: '#C9926A' });
  for (const x of [60, 160, 260]) out += `<rect x="${x - 4}" y="44" width="8" height="16" rx="2" fill="#2A3445" stroke="${INK}" stroke-width="1.6"/>`;
  // A valve wheel on the left bundle, a gauge, a rag tied round a leaking joint (repair).
  out += `<circle cx="-30" cy="380" r="15" fill="none" stroke="${INK}" stroke-width="6"/><circle cx="-30" cy="380" r="15" fill="none" stroke="#B0563A" stroke-width="3"/><path d="M-45 380H-15M-30 365V395" stroke="${INK}" stroke-width="3"/><circle cx="-30" cy="380" r="4" fill="#2A3445" stroke="${INK}" stroke-width="1.6"/>`;
  out += `<circle cx="-8" cy="230" r="10" fill="#E9E2D0" stroke="${INK}" stroke-width="2.6"/><path d="M-8 230L-3 224" stroke="${INK}" stroke-width="1.4"/><path d="M-15 233A8 8 0 0 1 -1 233" stroke="#B0563A" stroke-width="1" fill="none"/>`;
  out += shape(ID, 'M-2 300C2 296 12 297 14 302L13 318C10 322 0 322 -3 318Z', '#BFAE8E', { shade: [2, 2], w: 1.6, hatch: 'hl' }) + `<path d="M6 320L9 334L3 332" fill="#BFAE8E" stroke="${INK}" stroke-width="1.2"/>`;
  // The wall terminal, right of the port: its case, two screens (faces live), a row of lights, a hanging handset.
  out += shape(ID, plate(306, 136, 92, 176, 8), '#1E2836', { shade: [4, 5], w: 2.6 });
  for (const s of SCREENS) out += `<rect x="${s.x - 3}" y="${s.y - 3}" width="${s.w + 6}" height="${s.h + 6}" rx="3" fill="${INK}"/><rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="#04110F"/>`;
  for (let i = 0; i < LIGHTS.n; i += 1) out += `<circle cx="${LIGHTS.x + i * LIGHTS.gap}" cy="${LIGHTS.y}" r="3" fill="#0B1012" stroke="${INK}" stroke-width="1"/>`;
  out += `<rect x="322" y="286" width="56" height="16" rx="2" fill="#141B26" stroke="${INK}" stroke-width="1.4"/>`;
  for (let i = 0; i < 6; i += 1) out += `<rect x="${325 + i * 9}" y="289" width="6" height="10" rx="1" fill="#2C3647" stroke="${INK}" stroke-width="0.8"/>`;
  out += cable([392, 200], [372, 312], 70, { w: 2.2, color: '#1A1A1A' }) + shape(ID, 'M362 312h20v26h-20Z', '#2A3445', { w: 1.8 });
  // Cables strung across the top, sagging in front of the port.
  out += cable([-60, 46], [130, 50], 38, { w: 3.2, lit: '#7F93AE' }) + cable([90, 50], [300, 52], 26, { w: 2.4, lit: '#7F93AE' }) + cable([170, 52], [420, 50], 52, { w: 4, color: '#14161C', lit: '#6B7D98' });
  out += cable([-20, 58], [60, 54], 14, { w: 1.6, color: '#3B2A1E' });
  // Cable ties and a tag on the thick one (no words).
  out += `<rect x="286" y="88" width="10" height="14" rx="1" fill="${PAL.paper}" stroke="${INK}" stroke-width="1.2" transform="rotate(12 291 95)"/>`;
  return `<g filter="url(#${ID}-rough)">${out}</g>`;
}

// ── The bench ────────────────────────────────────────────────────────

function bench(L) {
  const { deskBack: yb, deskFront: yf } = L;
  let out = '';
  // The top: worn steel, scuffed; the front: panels, drawers, a cable tray, hazard tape.
  out += shape(ID, `M-150 ${yb}H540L560 ${yf}H-170Z`, '#2C394B', { w: 2.6, lit: { color: '#AFC3DA', w: 1.4, dx: 0, dy: 1.2, o: 0.6 } });
  out += `<g opacity="0.5">${[...Array(18)].map((_, i) => `<path d="M${-120 + i * 37} ${yb + 6 + (i % 4) * 9}l${10 + (i % 3) * 6} ${(i % 2 ? 2 : -1)}" stroke="#7F93AE" stroke-width="0.7"/>`).join('')}</g>`;
  out += shape(ID, `M-170 ${yf}H560V900H-170Z`, '#151C28', { w: 2.6 });
  out += `<path d="M-170 ${yf + 2}H560" stroke="#8FA2BC" stroke-width="1.6" opacity="0.7"/>`;
  for (let x = -150; x < 540; x += 120) {
    out += shape(ID, plate(x, yf + 22, 104, 70, 5), '#1D2634', { shade: [3, 4], w: 2, hatch: 'h2' }) + `<rect x="${x + 36}" y="${yf + 48}" width="32" height="8" rx="3" fill="#0B0F17" stroke="#56677D" stroke-width="1.2"/>`;
  }
  let tape = '';
  for (let x = -170; x < 560; x += 16) tape += `<path d="M${x} ${yf + 10}l8 0l-8 9l-8 0Z" fill="${PAL.amber}" opacity="0.8"/>`;
  out += `<g filter="url(#${ID}-wear)">${tape}</g>`;
  out += cable([-170, yf + 104], [560, yf + 110], 16, { w: 5, color: '#10131A', lit: '#56677D' });
  // On the bench: a toolkit open, a spanner, a coil of wire, a screwdriver; the soldering iron in its stand (its
  // thread of smoke is live); a mug, its handle worn.
  out += shape(ID, `M14 ${yb + 4}h62l6 22h-74Z`, '#5D4636', { shade: [3, 4], w: 2 }) + `<path d="M14 ${yb + 4}l-6 -18h62l6 18" fill="#6E5644" stroke="${INK}" stroke-width="2"/>`;
  out += `<path d="M24 ${yb + 10}h14M44 ${yb + 9}h18" stroke="#B9C4D3" stroke-width="3"/>`;
  out += `<g transform="translate(184 ${yb + 22}) rotate(-8)">${shape(ID, 'M0 -2h34v4h-34Z', '#9FB0C6', { w: 1.4 })}<circle cx="38" cy="0" r="6" fill="none" stroke="${INK}" stroke-width="4"/><circle cx="38" cy="0" r="6" fill="none" stroke="#9FB0C6" stroke-width="2"/></g>`;
  out += `<ellipse cx="236" cy="${yb + 34}" rx="18" ry="6" fill="none" stroke="${INK}" stroke-width="5"/><ellipse cx="236" cy="${yb + 34}" rx="18" ry="6" fill="none" stroke="#B0563A" stroke-width="2.4"/><ellipse cx="236" cy="${yb + 31}" rx="14" ry="4.5" fill="none" stroke="#C9704C" stroke-width="2"/>`;
  out += `<g transform="translate(150 ${yb + 14}) rotate(12)"><rect x="0" y="-2" width="20" height="5" rx="2" fill="#8A6A3A" stroke="${INK}" stroke-width="1.2"/><path d="M20 0.5h16" stroke="#B9C4D3" stroke-width="1.6"/></g>`;
  out += `<path d="M96 ${yb + 8}l10 -26l6 2l-8 26Z" fill="#2C3647" stroke="${INK}" stroke-width="1.4"/><path d="M98 ${yb + 10}h16" stroke="${INK}" stroke-width="3"/>`;
  return `<g filter="url(#${ID}-rough)"><g filter="url(#${ID}-wear)">${out}</g></g>`;
}

/** The soldering iron's tip, where its thread of smoke rises (live). */
export const IRON_TIP = Object.freeze([108, 520]);

/** The card in its holder, its face the Doctor's medical cross (the owner, 8 November 2026), paper on a dark plate. */
function card(L) {
  const { card: c } = L;
  const face = { x: c.x + 6, y: c.y + 6, w: c.w - 12, h: c.h - 18 };
  const s = Math.min(face.w, face.h) * 0.35, a = s / 3, cx = face.x + face.w / 2, cy = face.y + face.h / 2;
  const cross = [[-a, -s], [a, -s], [a, -a], [s, -a], [s, a], [a, a], [a, s], [-a, s], [-a, a], [-s, a], [-s, -a], [-a, -a]].map(([px, py]) => `${f(cx + px)} ${f(cy + py)}`).join('L');
  let out = `<rect x="${c.x + 5}" y="${c.y + 8}" width="${c.w}" height="${c.h}" rx="5" fill="#000" opacity="0.5"/>`;
  out += shape(ID, plate(c.x, c.y, c.w, c.h, 6), PAL.paper, { shade: [3, 3], w: 2.4, hatch: 'hl' });
  out += shape(ID, plate(face.x, face.y, face.w, face.h, 4), '#1C2433', { w: 1.6 });
  out += `<path d="M${cross}Z" fill="${PAL.paper}" stroke="${INK}" stroke-width="1.4"/>`;
  out += `<path d="M${c.x + c.w * 0.2} ${c.y + c.h - 4}h${c.w * 0.6}l10 18h${-c.w * 0.6 - 20}Z" fill="#2B3446" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  // A corner of tape and a thumb's grime on the paper: a card that has been handled.
  out += `<path d="M${c.x + c.w - 18} ${c.y - 4}l16 10l-6 8l-16 -10Z" fill="#D9CDA8" opacity="0.85" stroke="${INK}" stroke-width="0.8"/>`;
  return `<g filter="url(#${ID}-rough)">${out}</g>`;
}

/** The gooseneck lamp, its head bent over the card, lit within: the room's warm accent. */
function lamp(L) {
  const [bx, by] = L.lamp.base, [hx, hy] = L.lamp.head;
  const neck = `M${bx} ${by - 6}C${bx + 2} ${by - 80} ${bx + 30} ${hy - 30} ${hx + 30} ${hy - 40}S${hx + 8} ${hy - 26} ${hx + 4} ${hy - 18}`;
  let out = `<path d="${neck}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="${neck}" fill="none" stroke="#3B465C" stroke-width="4" stroke-linecap="round"/><path d="${neck}" fill="none" stroke="#9FB0C6" stroke-width="1" opacity="0.6" transform="translate(1 0)"/>`;
  for (let k = 0; k < 9; k += 1) out += `<circle cx="${f(bx + 2 + k * 3)}" cy="${f(by - 20 - k * 16)}" r="0.9" fill="${INK}"/>`;
  out += shape(ID, ellipse(bx, by, 26, 7), '#1E2535', { w: 2.4 });
  out += `<g transform="translate(${hx} ${hy}) rotate(-28)">${shape(ID, 'M34 0C30 -22 10 -30 -4 -28C-18 -26 -30 -14 -32 0Z', '#3A4558', { shade: [-3, 4], w: 2.6 })}<ellipse cx="1" cy="0" rx="31" ry="6" fill="${PAL.amberHot}"/></g>`;
  out += `<defs>${glowSvg(`${ID}-bulb`, hx - 2, hy + 6, 50, PAL.amberHot, 0.9).replace(/<circle.*$/, '')}</defs><circle cx="${hx - 2}" cy="${hy + 6}" r="50" fill="url(#${ID}-bulb)"/>`;
  return `<g filter="url(#${ID}-rough)">${out}</g>`;
}

/** The light on the bench and the card from the lamp; the cool light from the port on the far wall. */
function pools(L) {
  const c = L.card;
  return `<defs><radialGradient id="${ID}-pool"><stop offset="0" stop-color="${PAL.amber}" stop-opacity="0.5"/><stop offset="1" stop-color="${PAL.amber}" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${ID}-cardlight"><stop offset="0" stop-color="${PAL.amberHot}" stop-opacity="0.3"/><stop offset="1" stop-color="${PAL.amberHot}" stop-opacity="0"/></radialGradient></defs>`
    + `<ellipse cx="${c.x + c.w * 0.4}" cy="${L.deskBack + 24}" rx="170" ry="48" fill="url(#${ID}-pool)" style="mix-blend-mode:screen"/>`;
}

/** The foreground, out of focus: a cable loop in from the top left and a pipe's edge bottom right. */
function foreground() {
  return `<g filter="url(#${ID}-fg)">${cable([-60, -20], [70, -10], 120, { w: 14, color: '#0B0E14' })}${pipe([[420, 700], [330, 900]], 22, '#1C2534', { flanges: false })}</g>`
    + `<defs><filter id="${ID}-fg" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter></defs>`;
}

/**
 * The room's planes, as SVG in the design's px: `space` (the view), `wall` (the bulkhead, the duct, the pipes, the
 * terminal, the cables), `bench`, `card`, `fg` (the foreground). `defs` holds what they share.
 */
export function roomPlanes(L) {
  return {
    defs: inkDefs(ID) + `<linearGradient id="${ID}-hl" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE6B8" stop-opacity="0.6"/><stop offset="0.5" stop-color="#FFE6B8" stop-opacity="0"/></linearGradient>`,
    space: space(),
    wall: wall(),
    bench: bench(L) + pools(L) + lamp(L),
    card: card(L),
    fg: foreground(),
  };
}

export { portPath, tintOf, shadeOf, circle };
