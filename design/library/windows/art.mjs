// mothership:dev-only
//
// Library group 5: the windows and the drawing pad, in the board's steel-and-ink language: a
// riveted steel lintel over each window (a different emblem for each of the three, so no window
// depends on a hue), the board's drawing-station floor plate, the pad's paper, the Blackout's
// shade and the tray mark. New pictures only.
//
// A window is never a view of a room: it frames the drawings shown through it, nothing else, and
// it darkens with the Blackout. Every word, name and number is page text. Every colour, the pad's
// ink colours included, keeps MIN_ACCENT_DISTANCE from the faction accents, so neither the art nor
// the offered inks suggest a side (the contract still accepts any ink a client sends).
//
// drawingPaths() is the one way a shown or local drawing becomes pictures: it keeps only what
// PlanetDrawingSchema allows (a #RRGGBB colour, a width of 1 to 24, points inside 0..1) and emits
// numbers and that colour only, so a drawing can never carry markup, script or a link.

export const WINDOW_ART_VERSION = 'library-windows-0.1.0';

export const W = Object.freeze({
  ink: '#151923', paper: '#F4EBDD', cream: '#E6D8C0', yellow: '#F7C52B', navy: '#1B2747',
  steel: '#3A4A6B', shade: '#24314F', plate: '#8D97A8', night: '#0D1422', cyan: '#5FE0E8', green: '#6FE3B0',
});
/** The inks the pad offers (labelled in copy.mjs), and its widths. */
export const INKS = Object.freeze([W.ink, W.paper, W.yellow, W.cyan, W.green]);
export const WIDTHS = Object.freeze([3, 7, 14]);
/** The pad's and every shown image's box: 4:3, the drawing's 0..1 points scaled to it. */
export const PAD = Object.freeze({ w: 320, h: 240 });

const dots = (id, color, r = 0.8, gap = 5) => `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse"><circle cx="${gap / 2}" cy="${gap / 2}" r="${r}" fill="${color}"/></pattern>`;
function asset(name, about, w, h, body, defs = '', stretch = false) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Mothership · library art proposal · ${name} ${WINDOW_ART_VERSION} · generated, do not edit by hand\n  ${about}\n  Built by design/tools/library-assets.mjs from design/library/windows/art.mjs. Not in the reviewed manifest design-0.2.0.\n-->\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${stretch ? ' preserveAspectRatio="none"' : ''}>${defs ? `<defs>${defs}</defs>` : ''}<g id="${name}">${body}</g></svg>\n`;
}

// ---------- the three lintels ----------

const rivets = xs => xs.map(x => `<circle cx="${x}" cy="10" r="2.6" fill="${W.plate}" stroke="${W.ink}" stroke-width="1.2"/><circle cx="${x}" cy="38" r="2.6" fill="${W.plate}" stroke="${W.ink}" stroke-width="1.2"/>`).join('');
const lintelBase = `<rect x="0" y="0" width="320" height="48" fill="${W.steel}"/><path d="M0 1.5 H320 M0 46.5 H320" stroke="${W.ink}" stroke-width="3"/>`
  + `<path d="M0 6 H320" stroke="${W.plate}" stroke-width="1.2" opacity="0.6"/>` + rivets([12, 308]);
/** Each lintel's emblem sits at its left, in a 40 px roundel; the title is page text to its right. */
const roundel = inner => `<circle cx="34" cy="24" r="17" fill="${W.navy}" stroke="${W.ink}" stroke-width="2.6"/>${inner}`;
const EMBLEMS = {
  // Room A to Room B: two portholes joined (two rooms, one pane between them).
  A_B: () => roundel(`<circle cx="27" cy="24" r="6" fill="none" stroke="${W.cyan}" stroke-width="2.6"/><circle cx="41" cy="24" r="6" fill="none" stroke="${W.cyan}" stroke-width="2.6"/>`),
  // Room A to the Hospital: a rounded cross (the ward's sign; not red).
  A_HOSPITAL: () => roundel(`<path d="M30 14 h8 v6 h6 v8 h-6 v6 h-8 v-6 h-6 v-8 h6 Z" fill="${W.paper}" stroke="${W.ink}" stroke-width="1.6" stroke-linejoin="round"/>`),
  // Room B to the Jail: three bars.
  B_JAIL: () => roundel(`<path d="M27 13 V35 M34 13 V35 M41 13 V35" stroke="${W.plate}" stroke-width="3.2" stroke-linecap="round"/><path d="M24 24 H44" stroke="${W.ink}" stroke-width="2"/>`),
};
export const LINTEL_FILES = Object.freeze({ A_B: 'wn-lintel-a-b', A_HOSPITAL: 'wn-lintel-a-hospital', B_JAIL: 'wn-lintel-b-jail' });
const LINTEL_ABOUT = {
  A_B: 'The lintel of the window between Room A and Room B: two joined portholes.',
  A_HOSPITAL: 'The lintel of the window between Room A and the Hospital: the ward\'s rounded cross.',
  B_JAIL: 'The lintel of the window between Room B and the Jail: three bars.',
};
export function lintelSvg(windowId) {
  const emblem = EMBLEMS[windowId];
  if (!emblem) throw new Error(`No window ${windowId}`);
  return asset(LINTEL_FILES[windowId], `${LINTEL_ABOUT[windowId]} Stretched across the window's width; the title is page text.`, 320, 48, lintelBase + emblem(), '', true);
}

// ---------- the board's station marker, the pad, the shade, the tray ----------

/** A drawing station's floor plate: an oval steel plate with a pencil on an easel; at the slot's feet anchor. */
export function stationSvg() {
  const body = `<ellipse cx="20" cy="31" rx="17" ry="7" fill="${W.ink}" opacity="0.35"/><ellipse cx="20" cy="29" rx="17" ry="7" fill="${W.steel}" stroke="${W.ink}" stroke-width="2.2"/>`
    + `<path d="M13 29 L20 6 L27 29 M16.5 19 H23.5" stroke="${W.ink}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<rect x="12" y="9" width="16" height="12" rx="1.5" fill="${W.paper}" stroke="${W.ink}" stroke-width="2"/>`
    + `<path d="M15 18 L25 12" stroke="${W.yellow}" stroke-width="3" stroke-linecap="round"/><path d="M15 18 L25 12" stroke="${W.ink}" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/>`;
  return asset('wn-station', 'A drawing station\'s floor plate (A1, B1, A2, B2 only): a steel oval with an easel; centred on the slot\'s feet anchor, under the figure, shown even when the slot is empty.', 40, 40, body);
}

/** The pad's paper: a faint dot grid on the dossier's paper. */
export function padSvg() {
  const body = `<rect x="0" y="0" width="${PAD.w}" height="${PAD.h}" fill="${W.paper}"/><rect x="0" y="0" width="${PAD.w}" height="${PAD.h}" fill="url(#wn-pad-dots)"/>`;
  return asset('wn-pad', 'The drawing pad\'s paper (4:3): the dossier\'s paper with a faint dot grid; strokes are drawn over it.', PAD.w, PAD.h, body, dots('wn-pad-dots', W.cream, 1, 16));
}

/** The Blackout's shade: night slats over a window (stretched to the pane). */
export function shadeSvg() {
  const slats = Array.from({ length: 8 }, (_, i) => `<path d="M0 ${15 + i * 15} H320" stroke="${W.shade}" stroke-width="2.4"/>`).join('');
  const body = `<rect x="0" y="0" width="320" height="120" fill="${W.night}"/>${slats}<path d="M0 118 H320" stroke="${W.ink}" stroke-width="4"/>`;
  return asset('wn-shade', 'The Blackout\'s shade over a window\'s pane: night slats; no drawing shows through it until the lights return.', 320, 120, body, '', true);
}

/** The tray mark: a small window with a pencil. */
export function iconWindowSvg() {
  const body = `<rect x="7" y="9" width="34" height="30" rx="3" fill="${W.ink}" opacity="0.4"/><rect x="5" y="7" width="34" height="30" rx="3" fill="${W.steel}" stroke="${W.ink}" stroke-width="2.6"/>`
    + `<rect x="10" y="12" width="24" height="20" fill="${W.paper}" stroke="${W.ink}" stroke-width="1.8"/><path d="M13 26 Q18 17 22 24 T31 18" stroke="${W.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`
    + `<path d="M30 40 L43 27" stroke="${W.yellow}" stroke-width="5" stroke-linecap="round"/><path d="M30 40 L43 27" stroke="${W.ink}" stroke-width="1" opacity="0.5"/>`;
  return asset('wn-icon-window', 'The tray mark for the windows: a small window with a line drawn in it and a pencil.', 48, 48, body);
}

// ---------- drawings ----------

const HEX = /^#[0-9a-fA-F]{6}$/;
const num = v => Number(Math.min(1, Math.max(0, v)).toFixed(4));
/**
 * A drawing as safe path data in a w x h box: [{ color, width, d }], keeping only what the
 * contract allows. A stroke with a bad colour or width, or no valid point, is dropped; points are
 * clamped to 0..1. A single point draws a dot (a zero-length round-capped line).
 */
export function drawingPaths(drawing, { w = PAD.w, h = PAD.h } = {}) {
  const out = [];
  for (const s of drawing?.strokes ?? []) {
    if (typeof s?.color !== 'string' || !HEX.test(s.color)) continue;
    if (typeof s.width !== 'number' || !(s.width >= 1 && s.width <= 24)) continue;
    const pts = (Array.isArray(s.points) ? s.points : []).filter(p => Array.isArray(p) && p.length === 2 && p.every(v => typeof v === 'number' && Number.isFinite(v)));
    if (!pts.length) continue;
    const xy = pts.map(([x, y]) => `${(num(x) * w).toFixed(1)} ${(num(y) * h).toFixed(1)}`);
    const d = `M${xy[0]}${xy.length > 1 ? xy.slice(1).map(p => ` L${p}`).join('') : ` L${xy[0]}`}`;
    out.push({ color: s.color.toUpperCase(), width: Number((s.width * (w / PAD.w)).toFixed(2)), d });
  }
  return out;
}
/** A drawing as a standalone SVG string (exports, tests). */
export function drawingSvg(drawing, box = PAD) {
  const paths = drawingPaths(drawing, box).map(p => `<path d="${p.d}" stroke="${p.color}" stroke-width="${p.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box.w} ${box.h}" width="${box.w}" height="${box.h}">${paths}</svg>`;
}

/** Every picture of group 5, by name. */
export function windowAssets() {
  const out = {
    'wn-station': { svg: stationSvg(), size: '40x40', role: 'public: the board\'s drawing-station marker (A1, B1, A2, B2)', about: 'A drawing station\'s floor plate, under the figure at A1, B1, A2 and B2, shown even when the slot is empty.' },
    'wn-pad': { svg: padSvg(), size: '320x240', role: 'station-private: the drawing pad\'s paper', about: 'The drawing pad\'s paper with a faint dot grid; only the player at a drawing station sees a pad.' },
    'wn-shade': { svg: shadeSvg(), size: '320x120', role: 'window audience: the Blackout\'s shade', about: 'The Blackout\'s shade, lowered over every window\'s pane until the lights return.' },
    'wn-icon-window': { svg: iconWindowSvg(), size: '48x48', role: 'window audience: tray mark', about: 'The tray mark for the windows, beside the entry of a seat that sees at least one window.' },
  };
  for (const [id, file] of Object.entries(LINTEL_FILES)) out[file] = { svg: lintelSvg(id), size: '320x48', role: `window audience: the ${id} window's lintel`, about: LINTEL_ABOUT[id] };
  return out;
}
