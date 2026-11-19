// mothership:dev-only
//
// What the bars and icons control reads out about a bar: each part's size, ground, border, corners, words and
// icon. Every value is measured from the live component (its box and its computed styles), so each number is
// what the game draws at the current text size, not a copy of a stylesheet. Nothing here styles anything.

import { ICONS, ICON_NAMES, iconSvg } from '../components/icons.mjs';

/**
 * The parts, in reading order. `area` is the control's sub-part the part belongs to. `words` names the element
 * that holds the part's words (`text: true`: the part itself). `icon: true` reads the icon inside. `tap` names
 * the larger element that takes the tap. `each: true` lists every match; the others list the first.
 */
export const PARTS = Object.freeze([
  { area: 'top', sel: '.ms-ps-tb', name: 'Top bar' },
  { area: 'top', sel: '.ms-ps-tb .ms-ps-pt', name: 'Portrait' },
  { area: 'top', sel: '.ms-ps-tb .ms-ps-glyph', name: 'Phase icon tile', icon: true },
  { area: 'top', sel: '.ms-ps-tb .ms-ps-name, .ms-ps-tb .ms-ps-long', name: 'Title', text: true },
  { area: 'top', sel: '.ms-ps-tb .ms-ps-sub', name: 'Line under the title', text: true },
  { area: 'top', sel: '.ms-ps-tb .ms-ps-pill', name: 'Promises button', words: '.ms-ps-pill-label', icon: true, tap: '.ms-ps-promises' },
  { area: 'top', sel: '.ms-ps-tb .ms-ps-badge', name: 'Promises count', text: true },
  { area: 'top', sel: '.ms-ps-tb .ms-ps-round', name: 'Round', text: true },
  { area: 'top', sel: '.ms-ps-tb .ms-ps-timer', name: 'Clock', words: '.ms-ps-timer-text', icon: true },
  { area: 'top', sel: '.ms-ps-tb .ms-ps-menu', name: '⋮ button', icon: true },
  { area: 'over', sel: '.ms-ps-target', name: 'Target bar' },
  { area: 'over', sel: '.ms-ps-target .ms-ps-target-icon', name: 'Target bar · icon tile', icon: true },
  { area: 'over', sel: '.ms-ps-target .ms-ps-text > b', name: 'Target bar · title', text: true },
  { area: 'over', sel: '.ms-ps-target .ms-ps-text > span', name: 'Target bar · line', text: true },
  { area: 'over', sel: '.ms-ps-target .ms-k-btn', name: 'Target bar · Cancel', words: '.ms-k-btn-label' },
  { area: 'over', sel: '.ms-ps-banner', name: 'Banner' },
  { area: 'over', sel: '.ms-ps-banner .ms-ps-banner-icon', name: 'Banner · icon', icon: true },
  { area: 'over', sel: '.ms-ps-banner .ms-ps-text > b', name: 'Banner · title', text: true },
  { area: 'over', sel: '.ms-ps-banner .ms-ps-text > span', name: 'Banner · line', text: true },
  { area: 'over', sel: '.ms-ps-banner .ms-k-btn', name: 'Banner · Retry', words: '.ms-k-btn-label' },
  { area: 'over', sel: '.ms-ps-chip .ms-k-btn', name: 'Chip', words: '.ms-k-btn-label', icon: true },
  { area: 'over', sel: '.ms-ps-toast', name: 'Toast', words: '.ms-k-toast-text', icon: true },
  { area: 'sheet', sel: '.ms-ps-sheet', name: 'Sheet' },
  { area: 'sheet', sel: '.ms-ps-sheet .ms-ps-sheet-grab', name: 'Sheet · grab handle' },
  { area: 'sheet', sel: '.ms-ps-sheet-title > h2', name: 'Sheet · title', text: true },
  { area: 'sheet', sel: '.ms-ps-sheet-title > p', name: 'Sheet · line', text: true },
  { area: 'sheet', sel: '.ms-ps-sheet-head .ms-k-icon-btn', name: el => `Sheet · ${el.getAttribute('aria-label') ?? 'head'} button`, icon: true, each: true },
  { area: 'sheet', sel: '.ms-ps-sheet-foot .ms-k-btn', name: el => `Sheet · “${el.textContent.trim()}” button`, words: '.ms-k-btn-label', icon: true, each: true },
  { area: 'bottom', sel: '.ms-ps-tabs', name: 'Bottom bar' },
  { area: 'bottom', sel: '.ms-ps-tab:not(.ms-ps-tab-hero)[aria-expanded="true"]', name: 'Tab · open', words: '.ms-ps-tab-label', icon: true },
  { area: 'bottom', sel: '.ms-ps-tab:not(.ms-ps-tab-hero)[aria-disabled="true"]', name: 'Tab · unavailable', words: '.ms-ps-tab-label', icon: true },
  { area: 'bottom', sel: '.ms-ps-tab:not(.ms-ps-tab-hero):not([aria-expanded="true"]):not([aria-disabled="true"])', name: 'Tab', words: '.ms-ps-tab-label', icon: true },
  // Shell 0.3.0: the Card tab, last, with the player's own portrait in the icon's place (or the card icon).
  { area: 'bottom', sel: '.ms-ps-tab[data-value="card"]', name: el => (el.querySelector('.ms-ps-tab-pt:not([data-tile])') ? 'Card tab · with the portrait' : 'Card tab · with the card icon'), words: '.ms-ps-tab-label', icon: true },
  { area: 'bottom', sel: '.ms-ps-tab-pt:not([data-tile])', name: 'Card tab · portrait', picture: 'The player’s own character, the picture the top bar draws' },
  // Shell 0.3.2 (the owner, 18 November 2026): a tab's icon as a painted tile, in the portrait's box.
  { area: 'bottom', sel: '.ms-ps-tab-pt[data-tile]', name: 'Tab · painted tile', picture: 'The tab’s icon, painted, in the frame of the character’s picture' },
  { area: 'bottom', sel: '.ms-ps-tab .ms-ps-badge', name: 'Tab · badge', text: true },
  { area: 'bottom', sel: '.ms-ps-hero', name: 'Round button', words: '.ms-ps-hero-label', icon: true },
  { area: 'bottom', sel: '.ms-ps-talk .ms-k-btn', name: el => `“${el.textContent.trim()}” button`, words: '.ms-k-btn-label', icon: true, each: true },
]);

/** The kit's colours by name, read from a kit root's own tokens, so a measured colour can be named. */
const TOKEN_WORDS = Object.freeze({
  canvas: 'canvas', 'surface-1': 'surface 1', 'surface-2': 'surface 2', 'surface-3': 'surface 3', 'surface-4': 'surface 4', paper: 'paper',
  'paper-deep': 'deep paper', 'paper-shade': 'paper shade', ink: 'ink', 'text-2': 'soft text', 'text-3': 'faint text', accent: 'amber',
  caption: 'caption yellow', 'steel-mid': 'steel', 'steel-light': 'light steel',
});
const tokenCache = new WeakMap();
function tokensOf(kitRoot) {
  if (!kitRoot) return new Map();
  if (!tokenCache.has(kitRoot)) {
    const cs = getComputedStyle(kitRoot), map = new Map();
    for (const [token, word] of Object.entries(TOKEN_WORDS)) {
      const value = cs.getPropertyValue(`--ms-k-${token}`).trim().toUpperCase();
      if (/^#[0-9A-F]{6}$/.test(value) && !map.has(value)) map.set(value, word);
    }
    tokenCache.set(kitRoot, map);
  }
  return tokenCache.get(kitRoot);
}

const round = n => Math.round(n * 10) / 10;
/** How much smaller than its own size the page draws a shell (a whole-phone strip, a strip wider than its window): 1 at true size. */
const scaleOf = shellRoot => { const box = shellRoot.getBoundingClientRect(); return shellRoot.offsetWidth && box.width ? box.width / shellRoot.offsetWidth : 1; };
/** How strongly an element shows, as a percentage: its own opacity and every ancestor's up to the shell, or null at full strength. */
function shownAt(el, shellRoot) {
  let strength = 1;
  for (let node = el; node && node !== shellRoot.parentElement; node = node.parentElement) {
    const o = parseFloat(getComputedStyle(node).opacity);
    if (!Number.isNaN(o)) strength *= o;
  }
  return strength < 0.99 ? Math.round(strength * 100) : null;
}
/** An element's box in the shell's own pixels. */
const boxOf = (el, k) => { const b = el.getBoundingClientRect(); return { width: b.width / k, height: b.height / k }; };
const hex2 = n => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
/** A computed colour as { r, g, b, a }, or null: rgb(), rgba() and color(srgb …). */
export function parseColour(text) {
  if (!text) return null;
  let m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(text.trim());
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] === undefined ? 1 : m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]) };
  m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(text.trim());
  if (m) return { r: Number(m[1]) * 255, g: Number(m[2]) * 255, b: Number(m[3]) * 255, a: m[4] === undefined ? 1 : Number(m[4]) };
  return null;
}
/** A colour for reading: its hex, its opacity when not solid, the kit's name for it, and a CSS value for a swatch. */
function colourFacts(colour, tokens) {
  const hex = `#${hex2(colour.r)}${hex2(colour.g)}${hex2(colour.b)}`;
  return { hex, alpha: colour.a < 1 ? Math.round(colour.a * 100) : null, word: tokens.get(hex) ?? null, css: `rgba(${Math.round(colour.r)}, ${Math.round(colour.g)}, ${Math.round(colour.b)}, ${colour.a})` };
}

/** What an element is drawn on: its own fill, its gradient or picture, or the fill its ::before or ::after draws behind it. */
function groundOf(el, tokens) {
  const cs = getComputedStyle(el);
  let ground = null;
  const own = parseColour(cs.backgroundColor);
  if (own && own.a > 0.02) ground = { kind: 'fill', colour: colourFacts(own, tokens) };
  else if (cs.backgroundImage !== 'none') {
    if (cs.backgroundImage.includes('gradient(')) {
      const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(s => parseColour(s[0])).filter(Boolean).map(c => colourFacts(c, tokens));
      ground = { kind: 'gradient', stops: stops.length ? [stops[0], stops[stops.length - 1]] : [], css: cs.backgroundImage };
    } else ground = { kind: 'picture' };
  } else {
    for (const pseudo of ['::before', '::after']) {
      const p = getComputedStyle(el, pseudo), c = p.content !== 'none' ? parseColour(p.backgroundColor) : null;
      if (c && c.a > 0.02) { ground = { kind: 'fill', colour: colourFacts(c, tokens) }; break; }
    }
  }
  if (!ground) return null;
  const blur = /blur\(([\d.]+)px\)/.exec(cs.backdropFilter && cs.backdropFilter !== 'none' ? cs.backdropFilter : cs.webkitBackdropFilter ?? '');
  if (blur) ground.blur = round(Number(blur[1]));
  return ground;
}
function borderOf(el, tokens) {
  const cs = getComputedStyle(el), sides = ['Top', 'Right', 'Bottom', 'Left'].map(side => {
    const width = parseFloat(cs[`border${side}Width`]) || 0, colour = parseColour(cs[`border${side}Color`]);
    return width > 0 && cs[`border${side}Style`] !== 'none' && colour && colour.a > 0.02 ? { side: side.toLowerCase(), width: round(width), colour: colourFacts(colour, tokens) } : null;
  }).filter(Boolean);
  if (!sides.length) return null;
  const same = sides.length === 4 && sides.every(s => s.width === sides[0].width && s.colour.css === sides[0].colour.css);
  return { sides: same ? 'all' : sides.map(s => s.side).join(' and '), width: sides[0].width, colour: sides[0].colour };
}
function cornersOf(el, box) {
  const cs = getComputedStyle(el), read = v => { const first = String(v).split(' ')[0]; return first.endsWith('%') ? (parseFloat(first) / 100) * Math.min(box.width, box.height) : parseFloat(first) || 0; };
  const [tl, tr, br, bl] = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(read);
  const half = Math.min(box.width, box.height) / 2;
  if (!tl && !tr && !br && !bl) return null;
  if ([tl, tr, br, bl].every(r => r >= half - 0.5)) return Math.abs(box.width - box.height) < 1 ? 'A circle' : 'Fully round ends';
  if (tl === tr && tr === br && br === bl) return `${round(tl)} px`;
  if (tl === tr && !br && !bl) return `${round(tl)} px at the top`;
  return [tl, tr, br, bl].map(r => `${round(r)}`).join(' · ') + ' px';
}

let iconLookup = null;
/** Which icon of the one source an SVG element draws, and in which form; null for any other drawing. */
export function iconOf(svg) {
  if (!iconLookup) {
    iconLookup = new Map();
    const t = document.createElement('template');
    for (const name of ICON_NAMES) for (const filled of [false, true]) {
      t.innerHTML = iconSvg(name, { filled });
      const key = t.content.firstChild.innerHTML;
      if (!iconLookup.has(key)) iconLookup.set(key, { name, filled, label: ICONS[name].label });
    }
  }
  return iconLookup.get(svg.innerHTML) ?? null;
}
function iconFacts(el, tokens, k) {
  const svg = el.matches('svg') ? el : el.querySelector('svg');
  if (!svg) return null;
  const box = boxOf(svg, k), colour = parseColour(getComputedStyle(svg).color), which = iconOf(svg);
  if (!box.width) return null;
  // A painted icon (icons 1.1.0) carries its own colours; the part that holds it names the icon and the form.
  const held = which ? [] : (svg.closest('[data-icon]')?.dataset.icon ?? '').split(':');
  const painted = held[1] === 'tile' || held[1] === 'painted' ? held[1] : null;
  return { name: which?.name ?? (painted ? held[0] : null), filled: which?.filled ?? false, painted, width: round(box.width), height: round(box.height), colour: colour && !painted ? colourFacts(colour, tokens) : null };
}
function wordsOf(el, tokens) {
  const cs = getComputedStyle(el), colour = parseColour(cs.color), said = el.textContent.trim().replace(/\s+/g, ' ');
  if (!said) return null;
  return { said: said.length > 30 ? `${said.slice(0, 29)}…` : said, size: round(parseFloat(cs.fontSize)), weight: Number(cs.fontWeight) || cs.fontWeight, colour: colour ? colourFacts(colour, tokens) : null };
}

/** A ring drawn inside a part (an inset shadow with no blur): its width and colour, or null. */
function ringOf(el, tokens) {
  const first = getComputedStyle(el).boxShadow.split(/,(?![^(]*\))/)[0] ?? '';
  const colour = parseColour(/rgba?\([^)]+\)|color\([^)]+\)/.exec(first)?.[0] ?? ''), lengths = [...first.replace(/rgba?\([^)]+\)|color\([^)]+\)/, '').matchAll(/(-?[\d.]+)px/g)].map(m => Number(m[1]));
  return first.includes('inset') && colour && lengths.length === 4 && lengths[3] > 0 ? { width: round(lengths[3]), colour: colourFacts(colour, tokens) } : null;
}

/** One part, read from its element: { name, width, height, dimmed, tap, ground, border, corners, words, icon, picture, ring }. */
function readPart(el, def, tokens, k, shellRoot) {
  const box = boxOf(el, k);
  if (!box.width || !box.height) return null;
  const tapEl = def.tap ? el.closest(def.tap) : null, tap = tapEl ? boxOf(tapEl, k) : null;
  const wordsEl = def.words ? el.querySelector(def.words) : def.text ? el : null;
  return {
    name: typeof def.name === 'function' ? def.name(el) : def.name,
    width: round(box.width), height: round(box.height),
    dimmed: shownAt(el, shellRoot),
    tap: tap && (tap.width > box.width + 1 || tap.height > box.height + 1) ? { width: round(tap.width), height: round(tap.height) } : null,
    ground: def.text || def.picture ? null : groundOf(el, tokens),
    picture: def.picture ?? null,
    ring: def.picture ? ringOf(el, tokens) : null,
    border: def.text ? null : borderOf(el, tokens),
    corners: def.text ? null : cornersOf(el, box),
    words: wordsEl ? wordsOf(wordsEl, tokens) : null,
    icon: def.icon ? iconFacts(el, tokens, k) : null,
  };
}

/** Every part of `areas` that a mounted shell shows now, in reading order. `areas` null: every part. */
export function readParts(shellRoot, areas = null) {
  const tokens = tokensOf(shellRoot), k = scaleOf(shellRoot), out = [];
  for (const def of PARTS) {
    if (areas && !areas.includes(def.area)) continue;
    const found = [...shellRoot.querySelectorAll(def.sel)].filter(el => !el.closest('.ms-ps-stage') && !el.hidden);
    for (const el of def.each ? found : found.slice(0, 1)) {
      const part = readPart(el, def, tokens, k, shellRoot);
      if (part) out.push(part);
    }
  }
  return out;
}

/**
 * Every icon a mounted shell draws now, outside its room area: which icon, in which form, at what size and
 * colour, in which part, and on what ground (the nearest fill behind it).
 */
export function readIcons(shellRoot) {
  const tokens = tokensOf(shellRoot), k = scaleOf(shellRoot), out = [];
  for (const svg of shellRoot.querySelectorAll('svg')) {
    if (svg.closest('.ms-ps-stage')) continue;
    const which = iconOf(svg), box = boxOf(svg, k);
    // A painted icon (icons 1.1.0) is not a line drawing of the family: the part that holds it names the icon and the form.
    const held = which ? [] : (svg.closest('[data-icon]')?.dataset.icon ?? '').split(':');
    const painted = held[1] === 'tile' || held[1] === 'painted' ? held[1] : null;
    if ((!which && !painted) || !box.width) continue;
    // The innermost part that holds the icon names where it is drawn.
    let owner = null;
    for (const def of PARTS) { if (def.text) continue; const host = svg.closest(def.sel); if (host && (!owner || owner.host.contains(host))) owner = { def, host }; }
    const part = owner ? (typeof owner.def.name === 'function' ? owner.def.name(owner.host) : owner.def.name) : 'The bars';
    let ground = null;
    for (let node = svg.parentElement; node && node !== shellRoot.parentElement && !ground; node = node.parentElement) ground = groundOf(node, tokens);
    const colour = parseColour(getComputedStyle(svg).color);
    out.push({ name: which?.name ?? held[0], filled: which?.filled ?? false, painted, size: round(box.width), colour: colour && !painted ? colourFacts(colour, tokens) : null, part, ground, dimmed: shownAt(svg, shellRoot) });
  }
  return out;
}

/** The whole size of the main part of an area, for a strip's heading: the bar, the sheet, or what lies over the room. */
export function mainSize(shellRoot, area) {
  const first = { top: ['.ms-ps-tb'], bottom: ['.ms-ps-tabs', '.ms-ps-talk'], over: ['.ms-ps-target', '.ms-ps-banner', '.ms-ps-toast'], chip: ['.ms-ps-chip .ms-k-btn'], sheet: ['.ms-ps-sheet'] }[area] ?? [];
  const k = scaleOf(shellRoot);
  for (const sel of first) {
    const el = shellRoot.querySelector(sel), box = el ? boxOf(el, k) : null;
    if (box?.width) return { width: round(box.width), height: round(box.height) };
  }
  return null;
}
