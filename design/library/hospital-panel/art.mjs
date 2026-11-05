// mothership:dev-only
//
// Library group 3: the Hospital panel, a patient's own bedside console, in the approved medical
// language (design/board-v2/fx/medical.mjs: the drone's navy and steel, its cyan, the monitors'
// amber, stable green-cyan and failing red, ink contours). New pictures only; the medical module and
// its rescue tag (rescueCrossSvg) are reused as they are.
//
// PRIVATE art: drawn only inside a Hospital patient's own open private sheet, concealed on blur.
// The console never shows an injection count (the Doctor's alone) and no key differs from another:
// the keypad is player numbers only, never faces or names, so it is not a second player picker and
// it gives no hint of any number. The entered number and every word are page text over the
// picture's anchors. Every colour keeps MIN_ACCENT_DISTANCE from the faction accents.

import { MEDICAL } from '../../board-v2/fx/medical.mjs';

export const PANEL_ART_VERSION = 'library-hospital-panel-0.1.0';

/** The palette: the medical module's own, its ink and paper, and the rescue tag's struck grey. */
export const H = Object.freeze({ ...MEDICAL, ink: '#151923', paper: '#F4EBDD', plate: '#8D97A8', shade: '#24314F' });

/** The console's size and its parts' boxes (console pixels; the page uses them as percentages). */
export const CONSOLE = Object.freeze({ w: 320, h: 150 });
export const PARTS = Object.freeze({
  screen: Object.freeze({ x: 20, y: 22, w: 156, h: 74 }),
  slot: Object.freeze({ x: 196, y: 16, w: 42, h: 118 }),
  lamp: Object.freeze({ cx: 276, cy: 38, r: 11 }),
  cross: Object.freeze({ cx: 276, cy: 100, r: 20 }),
});
/** A part's box as percentages of the console, for absolutely placed page parts. */
export const partPercent = name => {
  const p = PARTS[name];
  const box = p.w ? p : { x: p.cx - p.r, y: p.cy - p.r, w: 2 * p.r, h: 2 * p.r };
  const pc = (v, of) => Number(((v / of) * 100).toFixed(3));
  return { left: pc(box.x, CONSOLE.w), top: pc(box.y, CONSOLE.h), width: pc(box.w, CONSOLE.w), height: pc(box.h, CONSOLE.h) };
};

const f = v => Number((+v).toFixed(2));
const dots = (id, color, r = 0.7) => `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2.5" cy="2.5" r="${r}" fill="${color}"/></pattern>`;

function asset(name, about, w, h, body, defs = '') {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Mothership · library art proposal · ${name} ${PANEL_ART_VERSION} · generated, do not edit by hand\n  ${about}\n  Built by design/tools/library-assets.mjs from design/library/hospital-panel/art.mjs. Not in the reviewed manifest design-0.2.0.\n-->\n`
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ''}<g id="${name}">${body}</g></svg>\n`;
}

// ---------- the console ----------

/** The bedside console: navy body, steel bezel, the number screen, the injection cradle, the lamp's socket and a hospital cross. */
export function consoleSvg() {
  const { w, h } = CONSOLE;
  const { screen: s, slot, lamp, cross } = PARTS;
  const defs = dots('hp-dots', H.ink, 0.8)
    + `<pattern id="hp-grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0 H0 V12" fill="none" stroke="${H.grid}" stroke-width="1"/></pattern>`
    + `<linearGradient id="hp-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${H.lens}" stop-opacity="0.22"/><stop offset="0.5" stop-color="${H.lens}" stop-opacity="0"/></linearGradient>`;
  const body = `<rect x="2.5" y="2.5" width="${w - 5}" height="${h - 5}" rx="14" fill="${H.navy}" stroke="${H.ink}" stroke-width="5"/>`
    + `<rect x="9" y="9" width="${w - 18}" height="${h - 18}" rx="10" fill="none" stroke="${H.steel}" stroke-width="3"/>`
    + `<path d="M${w - 90} 6 H${w - 16} Q${w - 6} 6 ${w - 6} 16 V${h - 16} Q${w - 6} ${h - 6} ${w - 16} ${h - 6} H${w - 130} Z" fill="url(#hp-dots)" opacity="0.28"/>`
    + [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${H.steel}" stroke="${H.ink}" stroke-width="1.6"/>`).join('');
  // The number screen: dark, a cyan grid, a glass sheen; the digits are the page's text.
  const screen = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="8" fill="${H.screen}" stroke="${H.ink}" stroke-width="3"/>`
    + `<rect x="${s.x + 3}" y="${s.y + 3}" width="${s.w - 6}" height="${s.h - 6}" rx="6" fill="url(#hp-grid)" opacity="0.7"/>`
    + `<rect x="${s.x + 3}" y="${s.y + 3}" width="${s.w - 6}" height="${s.h - 6}" rx="6" fill="url(#hp-glass)"/>`
    + `<path d="M${s.x + 10} ${s.y + s.h + 12} H${s.x + s.w - 10}" stroke="${H.steel}" stroke-width="3" stroke-linecap="round"/>`
    + [0, 1, 2, 3, 4, 5].map(i => `<path d="M${s.x + 18 + i * 22} ${s.y + s.h + 22} H${s.x + 30 + i * 22}" stroke="${H.ink}" stroke-width="3" stroke-linecap="round" opacity="0.55"/>`).join('');
  // The injection cradle: an empty clear tube between two clamps; the reserved vial is an overlay.
  const cradle = `<rect x="${slot.x}" y="${slot.y}" width="${slot.w}" height="${slot.h}" rx="10" fill="${H.shade}" stroke="${H.ink}" stroke-width="3"/>`
    + `<rect x="${slot.x + 11}" y="${slot.y + 12}" width="${slot.w - 22}" height="${slot.h - 24}" rx="9" fill="${H.screen}" stroke="${H.steel}" stroke-width="2"/>`
    + [slot.y + 22, slot.y + slot.h - 22].map(y => `<rect x="${slot.x + 5}" y="${y - 4}" width="${slot.w - 10}" height="8" rx="3" fill="${H.steel}" stroke="${H.ink}" stroke-width="2"/>`).join('');
  // The lamp's socket (the lamp is an overlay in its state's colour) and the hospital cross.
  const socket = `<circle cx="${lamp.cx}" cy="${lamp.cy}" r="${lamp.r + 4}" fill="${H.shade}" stroke="${H.ink}" stroke-width="2.5"/>`;
  const c = cross;
  const crossPath = `M${c.cx - 6} ${c.cy - 15} H${c.cx + 6} V${c.cy - 6} H${c.cx + 15} V${c.cy + 6} H${c.cx + 6} V${c.cy + 15} H${c.cx - 6} V${c.cy + 6} H${c.cx - 15} V${c.cy - 6} H${c.cx - 6} Z`;
  const crossMark = `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${H.steel}" stroke="${H.ink}" stroke-width="2.5"/><path d="${crossPath}" fill="${H.paper}" stroke="${H.ink}" stroke-width="2" stroke-linejoin="round"/>`;
  return asset('hp-console', 'The patient\'s bedside console: the number screen (digits are page text), the injection cradle, the lamp\'s socket and a hospital cross. No count, no number, no word.', w, h, body + screen + cradle + socket + crossMark, defs);
}

/** The status lamp over its socket, in its state's colour: ready cyan, busy amber, ok stable, warn red, off dark. */
export const LAMP_COLORS = Object.freeze({ ready: H.cyan, busy: H.amber, ok: H.stable, warn: H.warn, off: H.shade });
/** What each lamp means. The hue only repeats what the stamp and the words beside the console already say. */
export const LAMP_ABOUT = Object.freeze({
  ready: 'The status lamp, ready (cyan): a number may be picked and sent now.',
  busy: 'The status lamp, busy (amber): a number is on its way, or registered with its result not known on this phone.',
  ok: 'The status lamp, ok (green): R12 says an injection is reserved for this patient, or was given at the Rescue stage.',
  warn: 'The status lamp, warn (red): R12 says the number was not the Doctor\'s.',
  off: 'The status lamp, off: the panel takes no number now.',
});
export function lampSvg(state) {
  const { cx, cy, r } = PARTS.lamp;
  const color = LAMP_COLORS[state];
  if (!color) throw new Error(`No lamp state ${state}`);
  const lit = state !== 'off';
  const body = (lit ? `<circle cx="${cx}" cy="${cy}" r="${r + 7}" fill="${color}" opacity="0.28"/>` : '')
    + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="${H.ink}" stroke-width="2.5"/>`
    + (lit ? `<circle cx="${cx - 3.5}" cy="${cy - 3.5}" r="3" fill="${H.glow}" opacity="0.85"/>` : '');
  return asset(`hp-lamp-${state}`, `The console's status lamp, ${state}: over the lamp's socket, same size as the console, transparent.`, CONSOLE.w, CONSOLE.h, body);
}

/** A vial in the cradle: reserved (cyan, glowing) or spent (empty, dimmed). */
export function vialSvg(kind) {
  const { slot } = PARTS;
  const x = slot.x + 13, y = slot.y + 16, w = slot.w - 26, h = slot.h - 32;
  const reserved = kind === 'reserved';
  const fill = reserved ? H.cyan : H.screen;
  const body = (reserved ? `<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="12" fill="${H.cyan}" opacity="0.25"/>` : '')
    + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${H.lens}" fill-opacity="${reserved ? 0.35 : 0.12}" stroke="${H.ink}" stroke-width="2.2"/>`
    + `<rect x="${x + 2}" y="${y + (reserved ? h * 0.22 : h * 0.86)}" width="${w - 4}" height="${reserved ? h * 0.76 : h * 0.12}" rx="5" fill="${fill}"/>`
    + `<rect x="${x + 3}" y="${y - 7}" width="${w - 6}" height="9" rx="2" fill="${H.steel}" stroke="${H.ink}" stroke-width="2"/>`
    + `<path d="M${x + w / 2} ${y + h} V${y + h + 9}" stroke="${H.ink}" stroke-width="2.4" stroke-linecap="round"/>`
    + (reserved ? `<path d="M${x + 4} ${y + 10} V${y + h - 10}" stroke="${H.glow}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>` : `<path d="M${x + 3} ${y + h * 0.4} L${x + w - 3} ${y + h * 0.55}" stroke="${H.plate}" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`);
  return asset(`hp-vial-${kind}`, reserved ? 'A reserved injection seated in the cradle: drawn only for the patient whose correct number reserved it (R12).' : 'A spent vial in the cradle: the reserved injection was given (treated or without effect).', CONSOLE.w, CONSOLE.h, body);
}

/** The strike across the screen for a wrong number: two failing-red bars, no shake. */
export function strikeSvg() {
  const { screen: s } = PARTS;
  const body = `<path d="M${s.x + 16} ${s.y + s.h - 14} L${s.x + s.w - 16} ${s.y + 14}" stroke="${H.ink}" stroke-width="11" stroke-linecap="round"/>`
    + `<path d="M${s.x + 16} ${s.y + s.h - 14} L${s.x + s.w - 16} ${s.y + 14}" stroke="${H.warn}" stroke-width="6" stroke-linecap="round"/>`;
  return asset('hp-strike', 'A wrong number: a failing-red strike across the screen (R12), over the console, transparent.', CONSOLE.w, CONSOLE.h, body);
}

/** The scan bar that crosses the screen while a number registers. */
export function scanSvg() {
  const { screen: s } = PARTS;
  const body = `<rect x="${s.x + 4}" y="${s.y + 4}" width="10" height="${s.h - 8}" rx="3" fill="${H.lens}" opacity="0.55"/>`
    + `<rect x="${s.x + 7}" y="${s.y + 4}" width="3" height="${s.h - 8}" fill="${H.glow}"/>`;
  return asset('hp-scan', 'The register scan: a bar at the screen\'s left edge; the motion slides it across the screen.', CONSOLE.w, CONSOLE.h, body);
}

/** A key cap behind a digit (the digit is the button's text): plain, or lit for the picked number. */
/** The key caps' faces, and the colour of the page-text digit on each (at least 4.5:1, held by a test; page.css uses the same values). */
export const KEY_FACE = Object.freeze({ plain: H.steel, picked: H.cyan });
export const KEY_DIGIT = Object.freeze({ plain: H.paper, picked: H.ink });
export function keySvg(kind) {
  const picked = kind === 'picked';
  const body = `<rect x="3" y="5" width="50" height="50" rx="11" fill="${H.ink}" opacity="0.45"/>`
    + `<rect x="2" y="2" width="50" height="50" rx="11" fill="${KEY_FACE[kind]}" stroke="${H.ink}" stroke-width="3"/>`
    + `<rect x="8" y="7" width="38" height="8" rx="4" fill="${picked ? H.glow : H.plate}" opacity="${picked ? 0.75 : 0.35}"/>`
    + (picked ? `<rect x="-1" y="-1" width="56" height="56" rx="14" fill="none" stroke="${H.cyan}" stroke-width="2" opacity="0.6"/>` : '');
  return asset(`hp-key-${kind}`, picked ? 'A key cap, lit: the number picked on this phone (page text on it).' : 'A key cap: every number\'s the same (page text on it).', 56, 58, body);
}

/** The tray mark for the Hospital panel: a small console with a cross and four keys. */
export function iconPanelSvg() {
  const body = `<rect x="4" y="6" width="40" height="36" rx="8" fill="${H.navy}" stroke="${H.ink}" stroke-width="3"/>`
    + `<rect x="9" y="11" width="18" height="12" rx="3" fill="${H.screen}" stroke="${H.ink}" stroke-width="1.6"/>`
    + `<path d="M33 13 H37 V17 H41 V21 H37 V25 H33 V21 H29 V17 H33 Z" fill="${H.paper}" stroke="${H.ink}" stroke-width="1.2" stroke-linejoin="round"/>`
    + [[11, 29], [19, 29], [11, 35], [19, 35]].map(([x, y]) => `<rect x="${x}" y="${y}" width="6" height="4" rx="1.2" fill="${H.steel}" stroke="${H.ink}" stroke-width="1.1"/>`).join('')
    + `<circle cx="34" cy="33" r="3.5" fill="${H.cyan}" stroke="${H.ink}" stroke-width="1.4"/>`;
  return asset('hp-icon-panel', 'The tray mark for the Hospital panel.', 48, 48, body);
}

/** Every asset of the group: name, picture, size and use. */
export function panelAssets() {
  const size = `${CONSOLE.w}x${CONSOLE.h}`;
  const out = {
    'hp-console': { svg: consoleSvg(), size, role: 'patient-private: the console', about: 'The patient\'s bedside console; no count, number or word.' },
    'hp-vial-reserved': { svg: vialSvg('reserved'), size, role: 'patient-private: overlay (R12 reserved)', about: 'A reserved injection seated in the cradle.' },
    'hp-vial-spent': { svg: vialSvg('spent'), size, role: 'patient-private: overlay (R12 treated or no effect)', about: 'The spent vial after the Rescue stage.' },
    'hp-strike': { svg: strikeSvg(), size, role: 'patient-private: overlay (R12 wrong)', about: 'The wrong-number strike across the screen.' },
    'hp-scan': { svg: scanSvg(), size, role: 'patient-private: overlay (motion)', about: 'The scan bar that crosses the screen when the accepted receipt arrives.' },
    'hp-key-plain': { svg: keySvg('plain'), size: '56x58', role: 'patient-private: key cap', about: 'A key cap; every number the same.' },
    'hp-key-picked': { svg: keySvg('picked'), size: '56x58', role: 'patient-private: key cap, picked', about: 'The key cap of the number picked on this phone.' },
    'hp-icon-panel': { svg: iconPanelSvg(), size: '48x48', role: 'patient-private: tray mark', about: 'The tray mark for the Hospital panel.' },
  };
  for (const state of Object.keys(LAMP_COLORS)) out[`hp-lamp-${state}`] = { svg: lampSvg(state), size, role: `patient-private: lamp ${state}`, about: LAMP_ABOUT[state] };
  return out;
}
