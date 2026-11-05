// mothership:dev-only
//
// Library group 1: the Hacker's ship hack and the Engineer's capture, as props in the ability
// dossier's language (design/abilities/: paper, kraft, cork, ink contours, an offset ink shadow,
// halftone in the shade, caption yellow for what is live). New pictures only; the reviewed dossier
// kit is unchanged and is reused as it is (tapes, stamps, chips, pins, the Code card).
//
// PRIVATE art: drawn only inside a seat's own open private sheet. Like the dossier, the whole set
// is loaded on every player phone whatever the seat's role, so which art arrives says nothing about
// a role. No colour here is a side's: the palette is the dossier's own neutrals, and the check holds
// every colour off the faction accents (MIN_ACCENT_DISTANCE).

export const LIBRARY_ART_VERSION = 'library-hack-engineer-0.1.0';

/** The dossier's palette (design/abilities/source/*.svg, tokens 0.4.0). */
export const P = Object.freeze({
  ink: '#151923', paper: '#F4EBDD', shade: '#E3D6C2', kraft: '#CBBBA2', caption: '#F7C52B',
  steelLight: '#B9C4D3', steel: '#55657E', steelShadow: '#34415A', panel: '#202837', canvas: '#10141C', slate: '#8696AE',
});

const f = v => Number((+v).toFixed(2));
const dots = (id, color = P.ink, r = 0.8) => `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2" cy="2" r="${r}" fill="${color}"/></pattern>`;

/** A finished asset: its SVG document with the dossier's generated-file header. */
function asset(name, about, w, h, body, defs = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Mothership · library art proposal · ${name} ${LIBRARY_ART_VERSION} · generated, do not edit by hand\n  ${about}\n  Built by design/tools/library-assets.mjs from design/library/hack-engineer/art.mjs. Not in the reviewed manifest design-0.2.0.\n-->\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}<g id="${name}">${body}</g></svg>\n`;
}

// ---------- the Hacker: the ship hack's cartridge and the console's jack ----------

/** The cartridge's body, at (x, y), 112 x 60; lit: the LED on; spent: scorched and dark. */
function cartridge(x, y, { lit = true, spent = false, prefix = 'cart' } = {}) {
  const body = spent ? P.steelShadow : P.steel;
  const label = spent ? P.shade : P.paper;
  const led = lit && !spent ? P.caption : P.steelShadow;
  const contacts = spent ? P.steelShadow : P.caption;
  const ridges = [0, 1, 2, 3].map(i => `<path d="M${f(x + 92 + i * 4.5)} ${f(y + 12)} V${f(y + 48)}" stroke="${P.ink}" stroke-width="1.6" stroke-linecap="round"/>`).join('');
  return `<path d="M${f(x + 3)} ${f(y + 5)} H${f(x + 115)} V${f(y + 63)} H${f(x + 3)} Z" fill="${P.ink}" opacity="0.3"/>`
    // The connector edge, toward the jack (left), its gold contacts.
    + `<rect x="${f(x - 8)}" y="${f(y + 14)}" width="12" height="32" rx="2" fill="${P.steelShadow}" stroke="${P.ink}" stroke-width="2.2"/>`
    + [0, 1, 2, 3, 4].map(i => `<rect x="${f(x - 6.5)}" y="${f(y + 17 + i * 5.6)}" width="7" height="3.4" rx="0.8" fill="${contacts}"/>`).join('')
    + `<path d="M${x} ${y + 4} Q${x} ${y} ${x + 4} ${y} H${x + 106} Q${x + 112} ${y} ${x + 112} ${y + 6} V${y + 54} Q${x + 112} ${y + 60} ${x + 106} ${y + 60} H${x + 4} Q${x} ${y + 60} ${x} ${y + 56} Z" fill="${body}" stroke="${P.ink}" stroke-width="2.6" stroke-linejoin="round"/>`
    + `<path d="M${x + 4} ${y + 6} H${x + 84}" stroke="${P.steelLight}" stroke-width="2.4" stroke-linecap="round" opacity="${spent ? 0.3 : 0.75}"/>`
    // The paper label: ruled lines, never a word.
    + `<rect x="${x + 14}" y="${y + 13}" width="62" height="34" rx="2" fill="${label}" stroke="${P.ink}" stroke-width="2"/>`
    + `<path d="M${x + 20} ${y + 23} H${x + 68} M${x + 20} ${y + 30} H${x + 62} M${x + 20} ${y + 37} H${x + 56}" stroke="${P.kraft}" stroke-width="2.2" stroke-linecap="round"/>`
    + `<rect x="${x + 50}" y="${y + 13}" width="26" height="34" fill="url(#${prefix}-dots)" opacity="0.28"/>`
    + ridges
    // The LED: lit caption yellow with its ring, or dark.
    + `<circle cx="${x + 84}" cy="${y + 30}" r="5.2" fill="${led}" stroke="${P.ink}" stroke-width="2"/>`
    + (lit && !spent ? `<circle cx="${x + 84}" cy="${y + 30}" r="9" fill="none" stroke="${P.caption}" stroke-width="1.6" opacity="0.55"/><circle cx="${x + 82.6}" cy="${y + 28.4}" r="1.4" fill="${P.paper}"/>` : '')
    + (spent
      // Scorch: halftone soot over the label's end, a crack across the body and two burnt contacts.
      ? `<path d="M${x + 44} ${y + 12} Q${x + 60} ${y + 4} ${x + 80} ${y + 14} L${x + 76} ${y + 48} Q${x + 58} ${y + 54} ${x + 46} ${y + 46} Z" fill="url(#${prefix}-dots)" opacity="0.75"/>`
        + `<path d="M${x + 30} ${y} L${x + 36} ${y + 14} L${x + 31} ${y + 22} L${x + 40} ${y + 34}" fill="none" stroke="${P.ink}" stroke-width="2.2" stroke-linejoin="round"/>`
        + `<path d="M${x + 86} ${y - 2} q-4 -6 1 -10 q5 -4 1 -10" fill="none" stroke="${P.slate}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`
      : '');
}

export const SHIP = Object.freeze({ cartridge: Object.freeze([128, 76]), sealed: Object.freeze([136, 96]), jack: Object.freeze([176, 108]) });

export function cartridgeSvg() {
  return asset('lib-ship-cartridge', 'The ship hack\'s cartridge, unlocked and not used: its LED lit. In the Hacker\'s file once a correct final Code unlocks it.', 128, 76,
    cartridge(12, 8, { lit: true, prefix: 'lsc' }), dots('lsc-dots'));
}

/** Locked: the cartridge in a sealed evidence bag, its seal strip stitched, a padlock tag on the fold. */
export function cartridgeSealedSvg() {
  const bag = 'M10 22 H128 V88 Q128 92 124 92 H14 Q10 92 10 88 Z';
  return asset('lib-ship-cartridge-sealed', 'The ship hack\'s cartridge, locked: sealed in an evidence bag until a correct final Code. Not an action.', 136, 96,
    `<path d="${bag}" fill="${P.ink}" opacity="0.25" transform="translate(3 3)"/>`
    + `<g opacity="0.92">${cartridge(18, 28, { lit: false, prefix: 'lss' })}</g>`
    + `<path d="${bag}" fill="${P.steelLight}" fill-opacity="0.32" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>`
    + `<path d="M16 30 L40 26 M100 86 L122 80" stroke="${P.paper}" stroke-width="2.4" stroke-linecap="round" opacity="0.7"/>`
    // The seal strip across the fold, stitched.
    + `<rect x="6" y="12" width="126" height="14" rx="2" fill="${P.kraft}" stroke="${P.ink}" stroke-width="2.4"/>`
    + `<path d="M12 19 H126" stroke="${P.ink}" stroke-width="1.6" stroke-dasharray="4 3"/>`
    // The padlock tag hanging from the strip.
    + `<path d="M104 12 V4" stroke="${P.ink}" stroke-width="2"/>`
    + `<g transform="translate(94 -2)"><rect x="0" y="4" width="20" height="16" rx="3" fill="${P.steel}" stroke="${P.ink}" stroke-width="2"/><path d="M5 5 V1.5 Q5 -3 10 -3 Q15 -3 15 1.5 V5" fill="none" stroke="${P.ink}" stroke-width="2.2"/><circle cx="10" cy="11" r="2.2" fill="${P.ink}"/><path d="M10 12 V16" stroke="${P.ink}" stroke-width="1.8"/></g>`,
    dots('lss-dots'));
}

export function cartridgeUsedSvg() {
  return asset('lib-ship-cartridge-used', 'The ship hack\'s cartridge after its one activation: scorched, LED dark. Kept in the Hacker\'s file.', 128, 76,
    cartridge(12, 8, { lit: false, spent: true, prefix: 'lsu' }), dots('lsu-dots', P.ink, 1));
}

/** The console's jack: the ship's navigation port, its slot empty or with the cartridge seated. */
function jack({ seated = false, prefix = 'jack' }) {
  const lamps = [0, 1, 2].map(i => `<circle cx="${130 + i * 13}" cy="20" r="4" fill="${seated ? P.caption : P.steelShadow}" stroke="${P.ink}" stroke-width="1.8"/>`).join('');
  const screws = [[12, 12], [164, 12], [12, 96], [164, 96]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${P.steelLight}" stroke="${P.ink}" stroke-width="1.6"/><path d="M${x - 2.4} ${y + 1} L${x + 2.4} ${y - 1}" stroke="${P.ink}" stroke-width="1.2"/>`).join('');
  // The navigation core's mark: a neutral Y (the route's shape), never a side's colour or a direction.
  const y = `<path d="M30 38 L42 52 L54 38 M42 52 V70" fill="none" stroke="${P.steelLight}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="42" cy="70" r="3" fill="${P.steelLight}"/>`;
  const slot = `<rect x="84" y="40" width="58" height="34" rx="4" fill="${P.canvas}" stroke="${P.ink}" stroke-width="2.6"/><path d="M90 46 H136" stroke="${P.steelShadow}" stroke-width="2"/>`;
  const seat = seated
    // The cartridge's back end standing out of the slot, its LED steady.
    ? `<rect x="88" y="34" width="50" height="34" rx="4" fill="${P.steel}" stroke="${P.ink}" stroke-width="2.4"/>`
      + [0, 1, 2, 3].map(i => `<path d="M${96 + i * 5} 40 V62" stroke="${P.ink}" stroke-width="1.5"/>`).join('')
      + `<circle cx="126" cy="51" r="5" fill="${P.caption}" stroke="${P.ink}" stroke-width="1.8"/><circle cx="126" cy="51" r="8.5" fill="none" stroke="${P.caption}" stroke-width="1.4" opacity="0.6"/>`
    : '';
  return `<path d="M7 7 H175 V107 H7 Z" fill="${P.ink}" opacity="0.3"/>`
    + `<rect x="2" y="2" width="170" height="102" rx="8" fill="${P.panel}" stroke="${P.ink}" stroke-width="2.8"/>`
    + `<rect x="8" y="8" width="158" height="90" rx="5" fill="none" stroke="${P.steelShadow}" stroke-width="2"/>`
    + `<rect x="98" y="62" width="66" height="34" fill="url(#${prefix}-dots)" opacity="0.4"/>`
    + screws + lamps + y + slot + seat;
}

export function jackSvg() {
  return asset('lib-ship-jack', 'The ship\'s navigation port, its slot empty: where the ship hack\'s cartridge goes. A neutral Y for the route; no side, no direction.', 176, 108,
    jack({ prefix: 'lsj' }), dots('lsj-dots', P.ink, 0.9));
}

export function jackSeatedSvg() {
  return asset('lib-ship-jack-seated', 'The ship\'s navigation port with the cartridge seated and its lamps lit: the ship hack registered for this round\'s navigation.', 176, 108,
    jack({ seated: true, prefix: 'lsk' }), dots('lsk-dots', P.ink, 0.9));
}

/** Sparks at the slot as the cartridge seats: four short bolts, caption yellow on ink. */
export function breachSparkSvg() {
  const bolt = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0 L5 -3 L3 3 L9 0" fill="none" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M0 0 L5 -3 L3 3 L9 0" fill="none" stroke="${P.caption}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></g>`;
  return asset('lib-breach-spark', 'Sparks at the port as the cartridge seats (the breach). Private: on the Hacker\'s own phone only.', 64, 64,
    bolt(6, 14, -20) + bolt(44, 10, 20) + bolt(8, 50, 200) + bolt(46, 52, 160) + `<circle cx="32" cy="32" r="3" fill="${P.paper}" stroke="${P.ink}" stroke-width="1.6"/>`);
}

// ---------- the Engineer: the capture's viewfinder, the print and the clamp ----------

export const CAPTURE = Object.freeze({ viewfinder: Object.freeze([240, 160]), print: Object.freeze([140, 168]), window: Object.freeze({ x: 12, y: 12, w: 116, h: 112 }) });

/** The viewfinder over the opposite room's live picture: brackets, a centre mark, frame ticks. Transparent inside. */
export function viewfinderSvg() {
  const [w, h] = CAPTURE.viewfinder;
  const bracket = (x, y, sx, sy) => `<path d="M${x} ${y + sy * 26} V${y} H${x + sx * 26}" fill="none" stroke="${P.ink}" stroke-width="7" stroke-linecap="square"/><path d="M${x} ${y + sy * 26} V${y} H${x + sx * 26}" fill="none" stroke="${P.paper}" stroke-width="3" stroke-linecap="square"/>`;
  const ticks = [0.25, 0.5, 0.75].map(v => `<path d="M${f(w * v)} 6 V12 M${f(w * v)} ${h - 6} V${h - 12}" stroke="${P.paper}" stroke-width="2" opacity="0.7"/>`).join('');
  return asset('lib-viewfinder', 'The Engineer\'s viewfinder over the opposite room as it is now: brackets and a centre mark, never a target on one person.', w, h,
    bracket(8, 8, 1, 1) + bracket(w - 8, 8, -1, 1) + bracket(8, h - 8, 1, -1) + bracket(w - 8, h - 8, -1, -1)
    + `<path d="M${w / 2 - 9} ${h / 2} H${w / 2 + 9} M${w / 2} ${h / 2 - 9} V${h / 2 + 9}" stroke="${P.ink}" stroke-width="4.5" stroke-linecap="round"/><path d="M${w / 2 - 9} ${h / 2} H${w / 2 + 9} M${w / 2} ${h / 2 - 9} V${h / 2 + 9}" stroke="${P.paper}" stroke-width="1.8" stroke-linecap="round"/>`
    + ticks
    + `<circle cx="${w - 22}" cy="22" r="4" fill="${P.caption}" stroke="${P.ink}" stroke-width="1.8"/>`);
}

/** The developed print's paper: a white border with a deeper foot, its window open for the picture under it. */
export function capturePrintSvg() {
  const [w, h] = CAPTURE.print;
  const { x, y, w: ww, h: wh } = CAPTURE.window;
  const frame = `M2 2 H${w - 2} V${h - 2} H2 Z M${x} ${y} V${y + wh} H${x + ww} V${y} Z`;
  return asset('lib-capture-print', 'The Engineer\'s capture, developed: the print of the opposite room at the moment the server registered it. Its window shows the picture under it.', w, h,
    `<path d="M5 6 H${w + 1} V${h + 1} H5 Z" fill="${P.ink}" opacity="0.3"/>`
    + `<path d="${frame}" fill="${P.paper}" fill-rule="evenodd" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>`
    + `<rect x="${x}" y="${y}" width="${ww}" height="${wh}" fill="none" stroke="${P.ink}" stroke-width="2"/>`
    + `<rect x="${w - 46}" y="${h - 40}" width="40" height="34" fill="url(#lcp-dots)" opacity="0.35"/>`
    + `<path d="M${x + 4} ${h - 24} H${x + 64}" stroke="${P.kraft}" stroke-width="2.2" stroke-linecap="round"/>`,
    dots('lcp-dots', P.ink, 0.8));
}

/** The Engineer's device in the file: a signal clamp on a cable, its LED ready, or closed and dark once used. */
function clamp({ used = false }) {
  const jaw = used
    ? `<path d="M18 22 Q30 16 42 22 L40 30 Q30 26 20 30 Z" fill="${P.steel}" stroke="${P.ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="M18 42 Q30 48 42 42 L40 34 Q30 38 20 34 Z" fill="${P.steel}" stroke="${P.ink}" stroke-width="2.2" stroke-linejoin="round"/>`
    : `<path d="M16 16 Q30 6 44 16 L40 26 Q30 20 20 26 Z" fill="${P.steel}" stroke="${P.ink}" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 48 Q30 58 44 48 L40 38 Q30 44 20 38 Z" fill="${P.steel}" stroke="${P.ink}" stroke-width="2.2" stroke-linejoin="round"/>`;
  // A signal wave between the jaws: whole while ready, cut once used.
  const wave = used
    ? `<path d="M8 32 q4 -6 8 0 t8 0" fill="none" stroke="${P.slate}" stroke-width="2.4" stroke-linecap="round"/><path d="M36 32 q4 -6 8 0 t8 0" fill="none" stroke="${P.slate}" stroke-width="2.4" stroke-linecap="round"/><path d="M27 25 L33 39" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>`
    : `<path d="M8 32 q4 -7 8 0 t8 0 t8 0 t8 0 t8 0" fill="none" stroke="${P.caption}" stroke-width="2.6" stroke-linecap="round"/>`;
  return `<circle cx="34" cy="35" r="26" fill="${P.ink}" opacity="0.25"/>`
    + `<circle cx="31" cy="32" r="26" fill="${P.panel}" stroke="${P.ink}" stroke-width="2.6"/>`
    + jaw + wave
    + `<path d="M50 14 Q58 8 60 2" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>`
    + `<circle cx="48" cy="48" r="4" fill="${used ? P.steelShadow : P.caption}" stroke="${P.ink}" stroke-width="1.8"/>`;
}

export function clampSvg() {
  return asset('lib-clamp', 'The Engineer\'s signal clamp, not yet used: its wave whole and its LED lit. In the Engineer\'s file.', 64, 64, clamp({}));
}
export function clampUsedSvg() {
  return asset('lib-clamp-used', 'The Engineer\'s signal clamp after its one capture: closed, its wave cut and its LED dark.', 64, 64, clamp({ used: true }));
}

// ---------- the tray's icons and the Code card's punch ----------

/** A tray icon on the dossier's yellow disc: the ship hack (a cartridge into a port) or the capture (a viewfinder over a cut wave). */
function trayIcon(glyph) {
  return `<circle cx="25" cy="25" r="21" fill="${P.ink}" opacity="0.3"/><circle cx="24" cy="24" r="21" fill="${P.caption}" stroke="${P.ink}" stroke-width="2.6"/>${glyph}`;
}
export function iconShipHackSvg() {
  return asset('lib-icon-ship-hack', 'The tray\'s mark for the ship hack: a cartridge into a port. Drawn only where the seat\'s own view offers the action.', 48, 48,
    trayIcon(`<rect x="10" y="17" width="16" height="14" rx="2" fill="${P.ink}"/><path d="M26 20 H31 M26 24 H31 M26 28 H31" stroke="${P.ink}" stroke-width="2.2"/><rect x="31" y="14" width="7" height="20" rx="1.5" fill="none" stroke="${P.ink}" stroke-width="2.6"/><circle cx="16" cy="24" r="2.4" fill="${P.caption}"/>`));
}
export function iconCaptureSvg() {
  return asset('lib-icon-capture', 'The tray\'s mark for the Engineer\'s capture: a viewfinder over a cut wave. Drawn only where the seat\'s own view offers the action.', 48, 48,
    trayIcon(`<path d="M11 18 V12 H17 M31 12 H37 V18 M37 30 V36 H31 M17 36 H11 V30" fill="none" stroke="${P.ink}" stroke-width="2.8" stroke-linecap="square"/><path d="M14 24 q3 -5 6 0 M28 24 q3 -5 6 0" fill="none" stroke="${P.ink}" stroke-width="2.4" stroke-linecap="round"/><path d="M22 18 L26 30" stroke="${P.ink}" stroke-width="2.8" stroke-linecap="round"/>`));
}

/** The final Code card's punch: the one hole a registered final Code leaves, over the dossier's Code card. */
export function codePunchSvg() {
  return asset('lib-code-punch', 'The punch a registered final Code leaves on the dossier\'s Code card: it says the one attempt is spent, never whether it was right.', 40, 40,
    `<circle cx="20" cy="20" r="11" fill="${P.ink}"/><circle cx="20" cy="20" r="11" fill="none" stroke="${P.kraft}" stroke-width="2" stroke-dasharray="3 2.4"/>`
    + `<path d="M8 9 l4 3 M32 9 l-4 3 M8 31 l4 -3 M32 31 l-4 -3" stroke="${P.ink}" stroke-width="2" stroke-linecap="round"/>`);
}

/** Every asset of the group: name -> { svg, about, size, role }. */
export function libraryAssets() {
  const list = [
    ['lib-ship-cartridge', cartridgeSvg(), 'hacker'], ['lib-ship-cartridge-sealed', cartridgeSealedSvg(), 'hacker'], ['lib-ship-cartridge-used', cartridgeUsedSvg(), 'hacker'],
    ['lib-ship-jack', jackSvg(), 'hacker'], ['lib-ship-jack-seated', jackSeatedSvg(), 'hacker'], ['lib-breach-spark', breachSparkSvg(), 'hacker'],
    ['lib-icon-ship-hack', iconShipHackSvg(), 'hacker'], ['lib-code-punch', codePunchSvg(), 'hacker'],
    ['lib-viewfinder', viewfinderSvg(), 'engineer'], ['lib-capture-print', capturePrintSvg(), 'engineer'],
    ['lib-clamp', clampSvg(), 'engineer'], ['lib-clamp-used', clampUsedSvg(), 'engineer'], ['lib-icon-capture', iconCaptureSvg(), 'engineer'],
  ];
  return Object.fromEntries(list.map(([name, svg, role]) => {
    const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
    const about = /\n {2}([^\n]+)\n {2}Built by/.exec(svg)[1];
    return [name, { svg, about, size: [Number(w), Number(h)], role }];
  }));
}
