// The Doctor's dark story, "The Last Two Doses": the places of its panels, in the new world's ink (../world/ink.mjs),
// each a still in the design's px (390 x 844, a phone held upright). Every other person is nobody (a flat shape with
// no face); no panel draws a word, a number or a team's colour. What glows, smokes or moves is added over the drawing
// by ./panels.mjs.

import { cable, circle, ellipse, f, inkDefs, pipe, plate, rect, rivets, rng, shadeOf, shape } from '../world/ink.mjs';

const ID = 'sb';
const INK = '#08070A';
export const DEFS = () => inkDefs(ID, { ink: INK });
const wrap = s => `<g filter="url(#${ID}-rough)">${s}</g>`;
const worn = s => `<g filter="url(#${ID}-wear)">${s}</g>`;

// ── 1 · Colony Nine, in the dust ─────────────────────────────────────

export const P1 = Object.freeze({ door: [112, 498], beacons: [[58, 250], [196, 214], [318, 268], [372, 330]], sun: [292, 168] });

export function colony() {
  const r = rng(41);
  let out = `<defs><linearGradient id="${ID}-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A0D08"/><stop offset="0.45" stop-color="#5A2C14"/><stop offset="0.7" stop-color="#A2582A"/><stop offset="1" stop-color="#2A150B"/></linearGradient>`
    + `<filter id="${ID}-dust" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.03" numOctaves="3" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="80" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="6"/></filter></defs>`;
  out += `<rect width="390" height="844" fill="url(#${ID}-dusk)"/>`;
  // The sun, a pale coin behind the storm; bands of dust driven across it.
  out += `<circle cx="${P1.sun[0]}" cy="${P1.sun[1]}" r="34" fill="#F2C38A" opacity="0.55"/><circle cx="${P1.sun[0]}" cy="${P1.sun[1]}" r="60" fill="#F2C38A" opacity="0.12"/>`;
  let bands = '';
  for (let i = 0; i < 9; i += 1) bands += `<rect x="-60" y="${80 + i * 52}" width="510" height="${18 + (i % 3) * 10}" fill="${i % 2 ? '#C77A3E' : '#3A1C0D'}" opacity="${0.25 + (i % 3) * 0.08}"/>`;
  out += `<g filter="url(#${ID}-dust)">${bands}</g>`;
  // The far ridge, then the colony's modules, masts, pipes and cables, layered back to front.
  out += `<path d="M-20 420L40 396L90 410L150 380L230 404L300 372L410 400V470H-20Z" fill="#2A160C" opacity="0.8"/>`;
  let far = '';
  for (const [x, w, h] of [[10, 70, 34], [250, 90, 40], [330, 60, 28]]) far += shape(ID, `M${x} 440v-${h}q${w / 2} -18 ${w} 0v${h}Z`, '#3B2214', { shade: [4, 0], w: 1.6, ink: INK });
  out += `<g opacity="0.85">${far}</g>`;
  // Masts with their quarantine beacons, cables slung between.
  for (const [x, y] of P1.beacons) out += `<path d="M${x} ${y}V470" stroke="${INK}" stroke-width="4"/><path d="M${x - 10} ${y + 30}H${x + 10}M${x - 7} ${y + 60}H${x + 7}" stroke="${INK}" stroke-width="2"/><rect x="${x - 5}" y="${y - 10}" width="10" height="10" fill="#3A2A1A" stroke="${INK}" stroke-width="1.6"/>`;
  for (let i = 0; i < P1.beacons.length - 1; i += 1) out += cable([P1.beacons[i][0], P1.beacons[i][1] + 14], [P1.beacons[i + 1][0], P1.beacons[i + 1][1] + 14], 26, { w: 1.4, color: '#140A05', ink: INK });
  // The ward: a long prefab module, ribbed, its door lit; pipes into it; a dome behind; tanks.
  let mid = '';
  mid += shape(ID, 'M150 470C150 380 300 380 300 470Z', '#5B3A24', { shade: [10, 0], w: 2.4, ink: INK, hatch: 'h2' });
  for (let i = 0; i < 6; i += 1) mid += `<path d="M${170 + i * 22} ${470}C${172 + i * 22} ${430 - Math.sin((i / 5) * Math.PI) * 30} ${176 + i * 22} 420 ${178 + i * 22} 412" stroke="${INK}" stroke-width="1.4" fill="none" opacity="0.6"/>`;
  mid += shape(ID, plate(28, 430, 200, 110, 10), '#6E4A2E', { shade: [6, 6], w: 2.6, ink: INK });
  for (let x = 40; x < 222; x += 14) mid += `<path d="M${x} 434V536" stroke="#2A1A0F" stroke-width="1.6" opacity="0.7"/>`;
  mid += rivets(36, 440, 220, 440, 12, { r: 1.4, ink: INK, lit: '#C9926A' });
  mid += shape(ID, plate(P1.door[0] - 24, P1.door[1] - 48, 48, 72, 6), '#1A0E07', { w: 2.4, ink: INK });
  mid += `<rect x="${P1.door[0] - 18}" y="${P1.door[1] - 42}" width="36" height="62" fill="#FFB860" opacity="0.85"/>`;
  let chev = '';
  for (let x = P1.door[0] - 24; x < P1.door[0] + 24; x += 9) chev += `<path d="M${x} ${P1.door[1] - 56}l5 0l-5 7l-5 0Z" fill="#FFB347"/>`;
  mid += chev;
  mid += pipe([[228, 500], [262, 500], [262, 470], [330, 470]], 5, '#6B5A48', { ink: INK, light: '#D9B08A' }) + pipe([[0, 520], [28, 520]], 6, '#4F5A4A', { ink: INK, light: '#A9BFA0' });
  mid += shape(ID, 'M300 470C300 440 340 440 340 470V540H300Z', '#4F5A4A', { shade: [6, 0], w: 2.2, ink: INK }) + shape(ID, 'M340 480C340 456 372 456 372 480V540H340Z', '#5F6A5A', { shade: [5, 0], w: 2.2, ink: INK });
  out += wrap(worn(mid));
  // The ground: hard-packed, rutted; a quarantine fence with its tape, a wrecked hauler in front.
  let ground = shape(ID, 'M-20 532L410 524V860H-20Z', '#2A170C', { w: 2.4, ink: INK });
  for (let i = 0; i < 9; i += 1) ground += `<path d="M${-20 + i * 50} 860C${60 + i * 20} 700 ${140 + i * 8} 600 ${160 + i * 4} 536" stroke="#120904" stroke-width="${2 + (i % 3)}" fill="none" opacity="0.6"/>`;
  for (let x = 236; x < 400; x += 38) ground += `<path d="M${x} 640V560" stroke="${INK}" stroke-width="3"/>`;
  ground += `<path d="M230 574C280 584 330 570 400 580" stroke="#FFB347" stroke-width="4" fill="none" opacity="0.85"/><path d="M230 600C290 612 340 600 400 606" stroke="#FFB347" stroke-width="3" fill="none" opacity="0.7"/>`;
  ground += shape(ID, 'M-20 700L120 666L200 690L230 760L150 860H-20Z', '#20140C', { shade: [10, 8], w: 3, ink: INK, hatch: 'h2' });
  ground += `<circle cx="70" cy="780" r="46" fill="#120A05" stroke="${INK}" stroke-width="4"/><circle cx="70" cy="780" r="20" fill="#3A2A1A" stroke="${INK}" stroke-width="3"/>`;
  for (let i = 0; i < 8; i += 1) { const a = (i / 8) * Math.PI * 2; ground += `<path d="M${f(70 + Math.cos(a) * 24)} ${f(780 + Math.sin(a) * 24)}L${f(70 + Math.cos(a) * 44)} ${f(780 + Math.sin(a) * 44)}" stroke="${INK}" stroke-width="4"/>`; }
  ground += pipe([[150, 690], [228, 676]], 7, '#5A4636', { ink: INK, light: '#B58A62', flanges: false });
  out += wrap(worn(ground));
  // Grit in the air near the lens.
  for (let i = 0; i < 70; i += 1) out += `<circle cx="${f(r() * 390)}" cy="${f(r() * 844)}" r="${f(0.6 + r() * 1.6)}" fill="#E0B07A" opacity="${f(0.15 + r() * 0.35)}"/>`;
  return out;
}

// ── 2 · The ward (in ../world/ward.mjs), with one sheet drawn up over a face ──

export function sheetOver() {
  // Over the middle cot's pillow: the sheet drawn up and over, as it is for the dead.
  return wrap(shape(ID, 'M318 418C322 396 352 388 362 404L366 420Z', '#CDBB98', { shade: [2, 3], w: 2, ink: INK, hatch: 'hl' }));
}

// ── 3 · The relief ship turns away ───────────────────────────────────

export const P3 = Object.freeze({ port: [150, 330, 130], ship: [118, 236] });

export function hatchView() {
  const [cx, cy, r] = P3.port;
  let out = `<defs><radialGradient id="${ID}-storm" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#7A4A2A"/><stop offset="0.6" stop-color="#3A1E0E"/><stop offset="1" stop-color="#140904"/></radialGradient>`
    + `<clipPath id="${ID}-port3"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`
    + `<filter id="${ID}-sw" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="3" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="60" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="4"/></filter></defs>`;
  // The bulkhead: plates, pipes, a hazard panel, the ward's warmth spilling from the right.
  let wall = shape(ID, rect(-20, -20, 430, 900), '#20262E', { w: 0, ink: INK });
  for (let row = 0; row < 9; row += 1) for (let col = 0; col < 4; col += 1) wall += shape(ID, plate(-30 + col * 110 + (row % 2) * 40, row * 100 - 20, 112, 102, 6), (row + col) % 3 ? '#262E38' : '#2C3A3A', { shade: [3, 4], w: 1.8, ink: INK, hatch: 'h2' });
  out += wrap(worn(wall));
  out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${ID}-storm)"/>`;
  let storm = '';
  for (let i = 0; i < 10; i += 1) storm += `<rect x="-40" y="${180 + i * 34}" width="400" height="${10 + (i % 4) * 6}" fill="${i % 2 ? '#B27040' : '#20100A'}" opacity="0.4"/>`;
  out += `<g clip-path="url(#${ID}-port3)"><g filter="url(#${ID}-sw)">${storm}</g>`;
  // The relief ship climbing away, small and dark against its own lights.
  const [sx, sy] = P3.ship;
  out += `<g transform="translate(${sx} ${sy}) rotate(-24) scale(0.9)">${shape(ID, 'M-44 0L-30 -10L30 -12L50 -4L52 4L30 10L-30 10Z', '#1A1E26', { w: 2, ink: INK })}<path d="M-30 -10L-38 -22L-20 -12M20 -12L26 -24L34 -11" stroke="${INK}" stroke-width="3" fill="#1A1E26"/></g>`;
  out += '</g>';
  // The port's heavy rim, bolts, a wiper arm parked, condensation round the edge.
  out += `<circle cx="${cx}" cy="${cy}" r="${r + 16}" fill="none" stroke="#3A4450" stroke-width="30"/><circle cx="${cx}" cy="${cy}" r="${r + 30}" fill="none" stroke="${INK}" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="4"/>`;
  for (let i = 0; i < 16; i += 1) { const a = (i / 16) * Math.PI * 2; out += `<circle cx="${f(cx + Math.cos(a) * (r + 16))}" cy="${f(cy + Math.sin(a) * (r + 16))}" r="3" fill="${INK}"/><circle cx="${f(cx + Math.cos(a) * (r + 16) - 1)}" cy="${f(cy + Math.sin(a) * (r + 16) - 1)}" r="1.2" fill="#8E9BB0"/>`; }
  out += `<path d="M${cx} ${cy + r - 6}L${cx - 90} ${cy + r - 70}" stroke="${INK}" stroke-width="5"/><path d="M${cx} ${cy + r - 6}L${cx - 90} ${cy + r - 70}" stroke="#56677D" stroke-width="2"/>`;
  out += wrap(pipe([[-20, 40], [410, 40]], 8, '#4D5F74', { ink: INK, flanges: false }) + pipe([[330, -20], [330, 620], [410, 620]], 6, '#6B4630', { ink: INK, light: '#C9926A' }) + pipe([[356, -20], [356, 860]], 4, '#3E5249', { ink: INK, light: '#9DBBA6', flanges: false })
    + cable([-20, 60], [200, 70], 40, { w: 3, color: '#121418', ink: INK }) + cable([150, 64], [410, 56], 60, { w: 2.2, color: '#121418', ink: INK }));
  // The floor and a stretcher left by the hatch, its strap hanging.
  out += wrap(shape(ID, 'M-20 640H410V860H-20Z', '#171B21', { w: 2.4, ink: INK }) + shape(ID, plate(-10, 600, 170, 22, 4), '#5B6A6A', { shade: [0, 6], w: 2.2, ink: INK }) + `<path d="M10 622V680M140 622V680" stroke="${INK}" stroke-width="4"/><path d="M60 622C62 650 54 668 64 690" stroke="#8C7656" stroke-width="4" fill="none"/>`);
  return out;
}

// ── 4 · Two doses left ───────────────────────────────────────────────

export const P4 = Object.freeze({ vials: [[178, 470], [212, 470]], lamp: [70, 210] });

export function doses() {
  let out = `<defs><linearGradient id="${ID}-tbl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E2E22"/><stop offset="1" stop-color="#140D08"/></linearGradient></defs>`;
  out += `<rect width="390" height="844" fill="#120C08"/>`;
  // The window behind, rain running on it.
  out += wrap(shape(ID, plate(150, 40, 230, 200, 6), '#0B0F14', { w: 3, ink: INK }) + `<path d="M265 40V240M150 140H380" stroke="${INK}" stroke-width="4"/>`);
  for (let i = 0; i < 14; i += 1) { const x = 160 + ((i * 53) % 210), y = 60 + ((i * 37) % 160); out += `<path d="M${x} ${y}q2 14 0 28" stroke="#9AA6B2" stroke-width="1" fill="none" opacity="0.5"/><circle cx="${x}" cy="${y + 28}" r="1.6" fill="#B9C4D3" opacity="0.6"/>`; }
  // The table, scarred; the case open on it, twelve wells, ten empty.
  let t = shape(ID, 'M-20 300H410V860H-20Z', `url(#${ID}-tbl)`, { w: 2.6, ink: INK });
  for (let i = 0; i < 12; i += 1) t += `<path d="M${-10 + i * 36} ${320 + (i % 4) * 90}l${20 + (i % 3) * 12} ${i % 2 ? 6 : -4}" stroke="#7A604A" stroke-width="0.8" opacity="0.5"/>`;
  t += shape(ID, 'M80 330H330L346 400H64Z', '#6E665A', { shade: [0, 8], w: 2.6, ink: INK });
  t += shape(ID, 'M64 400H346L362 600H48Z', '#5A534A', { shade: [8, 8], w: 3, ink: INK, hatch: 'h2' });
  t += `<path d="M165 350h20v-12h16v12h20v16h-20v12h-16v-12h-20Z" fill="#E9DEC8" stroke="${INK}" stroke-width="1.6"/>`;
  out += wrap(worn(t));
  let wells = '';
  for (let row = 0; row < 3; row += 1) for (let col = 0; col < 4; col += 1) {
    const x = 110 + col * 68 + (row - 1) * 4, y = 440 + row * 54;
    wells += `<ellipse cx="${x}" cy="${y + 12}" rx="22" ry="10" fill="#0E0B08" stroke="${INK}" stroke-width="2"/>`;
  }
  out += wells;
  // Spent vials tipped on the table, a logbook of struck-through lines, a bandage roll, tape, a stub of candle.
  for (const [x, y, a] of [[40, 650, 70], [300, 700, 110], [340, 640, 30], [90, 740, -20], [250, 780, 150]]) out += `<g transform="translate(${x} ${y}) rotate(${a})">${shape(ID, 'M-7 -18h14v36a7 7 0 0 1 -14 0Z', '#AFA594', { w: 2, ink: INK })}<rect x="-8" y="-24" width="16" height="8" rx="2" fill="#3C342B" stroke="${INK}" stroke-width="1.6"/></g>`;
  let book = shape(ID, plate(220, 610, 150, 110, 3), '#D9CDB4', { shade: [4, 4], w: 2.4, ink: INK, hatch: 'hl' });
  for (let i = 0; i < 8; i += 1) book += `<path d="M232 ${626 + i * 11}h${70 + (i * 23) % 50}" stroke="#4A3A2A" stroke-width="1.2"/><path d="M230 ${626 + i * 11}h${84 + (i * 19) % 40}" stroke="#2A1E14" stroke-width="1.6" opacity="${i < 6 ? 0.9 : 0}"/>`;
  out += wrap(book) + wrap(shape(ID, ellipse(60, 590, 26, 16), '#E6DCC6', { shade: [4, 4], w: 2, ink: INK }) + `<ellipse cx="60" cy="590" rx="8" ry="5" fill="#B9AA8E" stroke="${INK}" stroke-width="1.4"/>`);
  out += wrap(shape(ID, 'M340 520h16v34h-16Z', '#E8DCBC', { w: 1.8, ink: INK }) + `<path d="M348 520v-8" stroke="${INK}" stroke-width="1.2"/>`);
  // The lamp's head at the top left, bent down over the case.
  out += wrap(`<g transform="translate(${P4.lamp[0]} ${P4.lamp[1]}) rotate(-30)">${shape(ID, 'M-34 0C-30 -24 -10 -32 4 -30C18 -28 30 -16 34 0Z', '#4A4036', { shade: [-3, 4], w: 2.6, ink: INK })}<ellipse cx="0" cy="0" rx="32" ry="6" fill="#FFE6B0"/></g><path d="M50 196Q-10 260 -20 320" stroke="${INK}" stroke-width="6" fill="none"/>`);
  return out;
}

/** The two vials still full, standing in their wells: drawn over the case (they glow, live). */
export function vials() {
  let out = '';
  for (const [x, y] of P4.vials) out += shape(ID, `M${x - 8} ${y - 50}h16v48a8 8 0 0 1 -16 0Z`, '#F3E8D2', { w: 2.4, ink: INK }) + `<rect x="${x - 5}" y="${y - 30}" width="10" height="26" rx="4" fill="#FFF6DF"/><rect x="${x - 9}" y="${y - 60}" width="18" height="12" rx="2" fill="#3C342B" stroke="${INK}" stroke-width="2"/>`;
  return wrap(out);
}

// ── 5 · Two beds ─────────────────────────────────────────────────────

export const P5 = Object.freeze({ door: [195, 250, 74, 190] });

export function twoBeds() {
  const [dx, dy, dw, dh] = P5.door;
  let out = `<rect width="390" height="844" fill="#0E0906"/>`;
  // The far wall: the doorway of cold light, everything else nearly black; pipes and a cable across.
  out += wrap(worn(shape(ID, rect(-20, -20, 430, 560), '#1E140D', { w: 0, ink: INK }) + [...Array(6)].map((_, i) => shape(ID, plate(-20 + i * 72, 60, 72, 470, 0), i % 2 ? '#241810' : '#1E140D', { shade: [3, 0], w: 1.6, ink: INK, hatch: 'h2' })).join('')));
  out += `<rect x="${dx - dw / 2}" y="${dy}" width="${dw}" height="${dh}" fill="#CFE8F0"/><rect x="${dx - dw / 2 - 8}" y="${dy - 8}" width="${dw + 16}" height="${dh + 8}" fill="none" stroke="${INK}" stroke-width="8"/>`;
  out += wrap(pipe([[-20, 90], [410, 90]], 7, '#5A4636', { ink: INK, light: '#B58A62', flanges: false }) + cable([-20, 110], [410, 100], 50, { w: 3, color: '#0E0906', ink: INK }));
  // The floor going back to the door, the light lying along it.
  out += shape(ID, 'M-20 530L410 530L410 860L-20 860Z', '#1A110B', { w: 2.4, ink: INK });
  out += `<path d="M${dx - dw / 2} 530L${dx + dw / 2} 530L330 860L60 860Z" fill="#CFE8F0" opacity="0.14"/>`;
  for (let i = -5; i < 7; i += 1) out += `<path d="M${195 + i * 30} 530L${195 + i * 110} 860" stroke="#0A0604" stroke-width="1.6" opacity="0.7"/>`;
  return out;
}

/** The two cots, seen from their feet, either side of her, going back to the door: frames, sheets in shadow, the door's light along their tops. */
export function cots() {
  let out = '';
  for (const side of [-1, 1]) {
    const near = 195 + side * 132, far = 195 + side * 84;
    out += `<path d="M${near - 48} 772V836M${near + 48} 772V836M${far - 30} 566V600M${far + 30} 566V600" stroke="${INK}" stroke-width="5"/>`;
    out += shape(ID, `M${far - 32} 566L${far + 32} 566L${near + 52} 776L${near - 52} 776Z`, '#4A3A2A', { shade: [side * 5, 6], w: 2.6, ink: INK });
    out += shape(ID, `M${far - 28} 560C${far - 18} 548 ${far + 18} 548 ${far + 28} 560L${near + 48} 760C${near + 24} 748 ${near - 24} 748 ${near - 48} 760Z`, '#6A5A44', { shade: [side * 9, 4], w: 2.4, ink: INK, hatch: 'h1' });
    out += `<path d="M${far - 28 * -side} 560L${near - 48 * -side} 760" stroke="#9FC4D0" stroke-width="1.6" opacity="0.55"/>`;
  }
  // Under the right one's sheet, somebody lying still, the sheet to the chin.
  out += shape(ID, 'M268 600C276 584 304 586 318 604L336 690C318 680 288 680 280 690Z', '#5E4F3C', { shade: [6, 2], w: 2, ink: INK, hatch: 'h1' });
  return wrap(out);
}

// ── 6 · The door sealed ──────────────────────────────────────────────

export const P6 = Object.freeze({ door: [150, 120, 230, 560], port: [265, 300, 34], beacons: [[132, 96], [396, 96]] });

export function sealed() {
  const [x, y, w, h] = P6.door, [px, py, pr] = P6.port;
  let out = `<rect width="390" height="844" fill="#11161C"/>`;
  let wall = '';
  for (let row = 0; row < 9; row += 1) for (let col = 0; col < 4; col += 1) wall += shape(ID, plate(-40 + col * 120 + (row % 2) * 50, row * 100 - 30, 122, 102, 6), (row * col) % 4 ? '#1E252E' : '#24302E', { shade: [3, 4], w: 1.8, ink: INK, hatch: 'h2' });
  out += wrap(worn(wall));
  // The bulkhead door: a heavy frame, the slab, chevrons, the locking wheel turned home, the bolts thrown.
  let door = shape(ID, plate(x - 26, y - 26, w + 52, h + 40, 18), '#2A333E', { shade: [6, 8], w: 3, ink: INK });
  door += shape(ID, plate(x, y, w, h, 14), '#3A4552', { shade: [8, 10], w: 3, ink: INK, hatch: 'h2' });
  let chev = '';
  for (let k = y + 20; k < y + h - 20; k += 22) chev += `<path d="M${x + 8} ${k}l14 0l-14 14l-14 0Z" fill="#FFB347" opacity="0.8"/><path d="M${x + w - 8} ${k}l-14 0l14 14l14 0Z" fill="#FFB347" opacity="0.8"/>`;
  door += worn(chev);
  door += `<circle cx="${px}" cy="${py}" r="${pr + 10}" fill="#2A333E" stroke="${INK}" stroke-width="3"/><circle cx="${px}" cy="${py}" r="${pr}" fill="#05070A" stroke="${INK}" stroke-width="3"/>`;
  door += `<circle cx="${x + w / 2}" cy="${y + h * 0.62}" r="44" fill="none" stroke="${INK}" stroke-width="10"/><circle cx="${x + w / 2}" cy="${y + h * 0.62}" r="44" fill="none" stroke="#8C949E" stroke-width="5"/>`;
  for (let i = 0; i < 4; i += 1) { const a = (i / 4) * Math.PI * 2 + 0.4; door += `<path d="M${x + w / 2} ${y + h * 0.62}L${f(x + w / 2 + Math.cos(a) * 44)} ${f(y + h * 0.62 + Math.sin(a) * 44)}" stroke="${INK}" stroke-width="7"/><path d="M${x + w / 2} ${y + h * 0.62}L${f(x + w / 2 + Math.cos(a) * 44)} ${f(y + h * 0.62 + Math.sin(a) * 44)}" stroke="#8C949E" stroke-width="3"/>`; }
  door += shape(ID, circle(x + w / 2, y + h * 0.62, 12), '#5A636E', { w: 2.4, ink: INK });
  for (const by of [y + 40, y + h - 40]) door += shape(ID, plate(x - 34, by - 10, 30, 20, 3), '#8C949E', { w: 2, ink: INK });
  // A strip of tape across the seam, stamped with a mark (a cross in a ring): the seal.
  door += `<path d="M${x - 30} ${y + h * 0.34}L${x + 60} ${y + h * 0.3}" stroke="#E8DCBC" stroke-width="16"/><circle cx="${x + 20}" cy="${y + h * 0.32}" r="8" fill="none" stroke="#3A2A1A" stroke-width="1.6"/><path d="M${x + 16} ${y + h * 0.32}h8M${x + 20} ${y + h * 0.32 - 4}v8" stroke="#3A2A1A" stroke-width="1.6"/>`;
  out += wrap(worn(door));
  out += wrap(pipe([[-20, 60], [410, 60]], 8, '#4D5F74', { ink: INK, flanges: false }) + pipe([[40, -20], [40, 860]], 6, '#6B4630', { ink: INK, light: '#C9926A' }) + cable([-20, 80], [180, 70], 60, { w: 2.6, color: '#0B0E12', ink: INK }));
  for (const [bx, by] of P6.beacons) out += `<rect x="${bx - 9}" y="${by - 14}" width="18" height="20" rx="4" fill="#3A2A1A" stroke="${INK}" stroke-width="2"/>`;
  out += wrap(shape(ID, 'M-20 700H410V860H-20Z', '#0E1216', { w: 2.4, ink: INK }));
  return out;
}

// ── 7 · Burning clean, seen from the climb ──────────────────────────

export const P7 = Object.freeze({ window: [14, 90, 250, 460], planet: [150, 740, 330], fires: [[90, 470], [150, 452], [210, 462], [120, 492], [180, 500], [240, 486], [70, 508]] });

export function climb() {
  const [wx, wy, ww, wh] = P7.window;
  const [plx, ply, plr] = P7.planet;
  let out = `<defs><clipPath id="${ID}-win7"><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="40"/></clipPath>`
    + `<radialGradient id="${ID}-p7" cx="0.5" cy="0.2" r="0.8"><stop offset="0" stop-color="#C77A3E"/><stop offset="0.5" stop-color="#6B3A1E"/><stop offset="1" stop-color="#1E0F08"/></radialGradient>`
    + `<filter id="${ID}-neb7" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3" seed="21" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="70" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="6"/></filter></defs>`;
  // The view: a saturated sky, a swirl of teal and magenta, orbital geometry, the planet's limb with the fires on it.
  let view = `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#0A0618"/>`;
  let neb = '';
  for (let i = 0; i < 3; i += 1) {
    const pts = [];
    for (let k = 0; k <= 36; k += 1) { const a = k * 0.18 + i * 2.1, rr = 10 + k * 5; pts.push([170 + Math.cos(a) * rr, 210 + Math.sin(a) * rr * 0.55]); }
    neb += `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}" fill="none" stroke="${['#C83C9A', '#19C7B4', '#FFB347'][i]}" stroke-width="${24 - i * 6}" stroke-linecap="round" opacity="${0.6 - i * 0.12}"/>`;
  }
  view += `<g filter="url(#${ID}-neb7)">${neb}</g>`;
  const r = rng(77);
  for (let i = 0; i < 120; i += 1) view += `<circle cx="${f(wx + r() * ww)}" cy="${f(wy + r() * wh * 0.8)}" r="${f(0.4 + r() ** 3 * 1.6)}" fill="#F4F0FF" opacity="${f(0.4 + r() * 0.6)}"/>`;
  // A far gas giant, small, ringed: the scale of where she is going.
  view += `<circle cx="214" cy="150" r="22" fill="#5E2A84"/><circle cx="214" cy="150" r="22" fill="none" stroke="#E86FA8" stroke-width="1.4"/><ellipse cx="214" cy="150" rx="44" ry="8" fill="none" stroke="#FFD58A" stroke-width="1.6" opacity="0.8" transform="rotate(-18 214 150)"/>`;
  for (const [rx, ry, tilt, color] of [[220, 60, -10, '#7CF2C8'], [300, 90, -10, '#FFB347'], [140, 30, 14, '#E86FA8']]) view += `<ellipse cx="160" cy="300" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="0.9" stroke-dasharray="3 6" opacity="0.7" transform="rotate(${tilt} 160 300)"/>`;
  view += `<path d="M${plx} ${ply}m-${plr} 0a${plr} ${plr} 0 1 0 ${plr * 2} 0a${plr} ${plr} 0 1 0 -${plr * 2} 0" fill="url(#${ID}-p7)"/>`;
  view += `<circle cx="${plx}" cy="${ply}" r="${plr}" fill="none" stroke="#FFC27A" stroke-width="3" opacity="0.7"/><circle cx="${plx}" cy="${ply}" r="${plr + 10}" fill="none" stroke="#FFC27A" stroke-width="12" opacity="0.15"/>`;
  // The climb's own track, a dashed arc rising away from the colony's ring of fire.
  view += `<path d="M150 480C190 380 230 320 300 260" stroke="#FFF2D8" stroke-width="1.2" stroke-dasharray="2 5" fill="none" opacity="0.8"/>`;
  out += `<rect width="390" height="844" fill="#0B0E15"/><g clip-path="url(#${ID}-win7)">${view}</g>`;
  // The cabin: the window's thick frame, rivets, a strap, seat lights; the seat she sits in, worn.
  let cabin = `<path d="M-20 -20H410V860H-20Z M${wx + 40} ${wy}H${wx + ww - 40}Q${wx + ww} ${wy} ${wx + ww} ${wy + 40}V${wy + wh - 40}Q${wx + ww} ${wy + wh} ${wx + ww - 40} ${wy + wh}H${wx + 40}Q${wx} ${wy + wh} ${wx} ${wy + wh - 40}V${wy + 40}Q${wx} ${wy} ${wx + 40} ${wy}Z" fill="#1B2230" fill-rule="evenodd"/>`;
  for (let row = 0; row < 9; row += 1) cabin += `<path d="M-20 ${row * 100}H410" stroke="${INK}" stroke-width="2" opacity="0.8"/>`;
  cabin += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="40" fill="none" stroke="#3A4558" stroke-width="20"/><rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="40" fill="none" stroke="${INK}" stroke-width="3"/>`;
  cabin += rivets(wx + 30, wy - 6, wx + ww - 30, wy - 6, 8, { r: 2 }) + rivets(wx + 30, wy + wh + 6, wx + ww - 30, wy + wh + 6, 8, { r: 2 });
  cabin += pipe([[300, -20], [300, 860]], 7, '#4D5F74', { ink: INK, flanges: false }) + cable([280, 40], [410, 120], 50, { w: 2.4, color: '#0B0E12', ink: INK });
  cabin += shape(ID, 'M270 560C270 520 400 520 400 560V860H270Z', '#3A2E28', { shade: [8, 0], w: 2.6, ink: INK, hatch: 'h2' });
  cabin += `<path d="M300 600V700" stroke="#2B231D" stroke-width="10"/><rect x="292" y="640" width="16" height="12" fill="#8E9BB0" stroke="${INK}" stroke-width="1.6"/>`;
  cabin += shape(ID, 'M-20 700H410V860H-20Z', '#121822', { w: 2.4, ink: INK });
  out += wrap(worn(cabin));
  return out;
}

/** The medicine case on her knees (P7): closed, scuffed, a cross on its lid. In its own frame. */
export function caseClosed() {
  return wrap(shape(ID, plate(-46, -24, 92, 48, 6), '#6E665A', { shade: [4, 6], w: 2.6, ink: INK }) + `<path d="M-16 -36h32v12h-32Z" fill="#3A342C" stroke="${INK}" stroke-width="2"/><path d="M-8 -6h6v-6h4v6h6v4h-6v6h-4v-6h-6Z" fill="#E9DEC8" stroke="${INK}" stroke-width="1"/>`);
}

export { INK, ID, shadeOf };
