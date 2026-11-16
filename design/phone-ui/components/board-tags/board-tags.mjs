// The board's name tags: Designer's runtime component (sheet 26; #222 item 34).
//
// One layer of name tags for one board panel, whole and apart at every text size. The board stays
// Frontend's Board V2 adapter (the owner kept "the whole board" on 11 November; the Lead's option B):
// this layer replaces only its name plates. It draws sheet 26's tag, the room scene's rounded tag at
// the board's 22 px: the seat number in a paper disc, the office badge, the name ("You" on paper for
// this phone's own seat), "· Injured" or "· Out", the turn's ring, and dimmed where this viewer's
// offer does not reach (sheet 29). Its type is 11 px at every text size (the Lead's Q1: sheet 53 does
// not draw the board at the larger text; the pack's own rem-sized CSS would set 22 px type inside a
// 22 px tag there).
//
// The rules (docs/design/components/board-tags.md), at every text size:
//   1. where sheet 26 puts it: centred on the press point, its top 6 px above the press area's foot
//      and no lower than 30 px above the panel's foot (the pack's compact tag);
//   2. whole: never "…"; the status, then a name wider than the line, wraps;
//   3. inside: 4 px inside the panel, clear of keepClear;
//   4. apart: 2 px between tags; where two would meet one moves up, or else down, no further than it
//      needs; "You" gives way first, then the one further back.
// The layout is deterministic (the same people, panel and keepClear give the same places, in any
// order) and still (tags never animate). The layer is aria-hidden and takes no taps: it draws above
// the target rings and every tap reaches the target beneath.

import { iconSvg } from '../icons.mjs';

export const BOARD_TAGS_VERSION = 'board-tags-0.1.0';

/** The rules' numbers, in CSS px: the panel's inset, the space between tags, the lift above the press area's foot, and the pack's floor. */
export const TAG_RULES = Object.freeze({ pad: 4, gap: 2, lift: 6, footClear: 30 });

/** The tag's words. "· Injured" and "· Out" are the pack's (art.mjs paintRoom). */
export const TAG_WORDS = Object.freeze({ you: 'You', injured: '· Injured', out: '· Out', captain: 'Captain', officer: 'Officer' });

const STATUSES = Object.freeze(['live', 'stale', 'concealed']);
const HEALTH = Object.freeze(['Healthy', 'Injured', 'Eliminated']);
const OFFICES = Object.freeze(['captain', 'officer']);

export const BOARD_TAGS_DEFAULTS = Object.freeze({ status: 'live', versions: null, size: null, keepClear: [], people: [], active: null, viewer: null, dim: [] });
const KEYS = Object.freeze(Object.keys(BOARD_TAGS_DEFAULTS));

const finite = v => typeof v === 'number' && Number.isFinite(v);
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** A seat as the board names it, 4 or 'seat-4', as its number: the tag shows the number. */
export function seatNumber(seat, what = 'seat') {
  const n = typeof seat === 'number' ? seat : typeof seat === 'string' && /^seat-\d+$/.test(seat) ? Number(seat.slice(5)) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 9) throw new TypeError(`${what} is a seat (1–9 or 'seat-1'…'seat-9'), not ${JSON.stringify(seat)}`);
  return n;
}

function box(value, what) {
  if (!plain(value) || !['left', 'top', 'width', 'height'].every(k => finite(value[k])) || value.width < 0 || value.height < 0) {
    throw new TypeError(`${what} is { left, top, width, height } in CSS px`);
  }
  return { left: value.left, top: value.top, width: value.width, height: value.height };
}

/** Checks a complete input and returns its normalised copy (seats as numbers). Throws on anything it does not know. */
export function checkBoardTags(input) {
  if (!plain(input)) throw new TypeError('Board tags take an object');
  for (const key of Object.keys(input)) if (!KEYS.includes(key)) throw new TypeError(`Board tags have no input ${JSON.stringify(key)}`);
  const v = { ...BOARD_TAGS_DEFAULTS, ...input };
  if (!STATUSES.includes(v.status)) throw new TypeError(`status is ${STATUSES.join(', ')}, not ${JSON.stringify(v.status)}`);
  if (v.versions !== null && !plain(v.versions)) throw new TypeError('versions is the match\'s versions object, or null');
  if (!plain(v.size) || !finite(v.size.width) || !finite(v.size.height) || v.size.width <= 0 || v.size.height <= 0) {
    throw new TypeError('size is the panel\'s { width, height } in CSS px');
  }
  if (!Array.isArray(v.keepClear)) throw new TypeError('keepClear is a list of boxes');
  const keepClear = v.keepClear.map((b, i) => box(b, `keepClear[${i}]`));
  if (!Array.isArray(v.people)) throw new TypeError('people is a list');
  const seen = new Set();
  const people = v.people.map((p, i) => {
    if (!plain(p)) throw new TypeError(`people[${i}] is { seat, name, health, office, at }`);
    for (const key of Object.keys(p)) if (!['seat', 'name', 'health', 'office', 'at'].includes(key)) throw new TypeError(`people[${i}] has no ${JSON.stringify(key)}`);
    const seat = seatNumber(p.seat, `people[${i}].seat`);
    if (seen.has(seat)) throw new TypeError(`Seat ${seat} is in the panel twice`);
    seen.add(seat);
    if (typeof p.name !== 'string' || !p.name.trim()) throw new TypeError(`people[${i}].name is the player's name`);
    const health = p.health ?? 'Healthy';
    if (!HEALTH.includes(health)) throw new TypeError(`people[${i}].health is ${HEALTH.join(', ')}`);
    const office = p.office ?? null;
    if (office !== null && !OFFICES.includes(office)) throw new TypeError(`people[${i}].office is 'captain', 'officer' or null`);
    if (!plain(p.at) || !finite(p.at.x) || !finite(p.at.bottom)) throw new TypeError(`people[${i}].at is { x, bottom }: the press point and the foot of the press area`);
    return { seat, name: p.name, health, office, at: { x: p.at.x, bottom: p.at.bottom } };
  });
  const active = v.active === null ? null : seatNumber(v.active, 'active');
  const viewer = v.viewer === null ? null : seatNumber(v.viewer, 'viewer');
  if (!Array.isArray(v.dim)) throw new TypeError('dim is a list of seats');
  const dim = [...new Set(v.dim.map((s, i) => seatNumber(s, `dim[${i}]`)))].sort((a, b) => a - b);
  return { status: v.status, versions: v.versions, size: { width: v.size.width, height: v.size.height }, keepClear, people, active, viewer, dim };
}

/**
 * The rules alone, pure: measured boxes in, places out, no DOM. `tags` are
 * [{ seat, at: { x, bottom }, width, height, self }]; `panel` is { width, height }.
 * Returns { places: [{ seat, left, top }] in seat order, inside, apart }: `inside` when every tag
 * fits 4 px inside the panel clear of keepClear, `apart` when no two are within 2 px.
 */
export function layoutTags({ panel, pad = TAG_RULES.pad, gap = TAG_RULES.gap, keepClear = [], tags }) {
  if (!plain(panel) || !finite(panel.width) || !finite(panel.height)) throw new TypeError('layoutTags needs the panel\'s { width, height }');
  if (!Array.isArray(tags)) throw new TypeError('layoutTags needs the measured tags');
  const clear = keepClear.map((b, i) => box(b, `keepClear[${i}]`));
  for (const t of tags) {
    if (!finite(t.width) || !finite(t.height) || !plain(t.at) || !finite(t.at.x) || !finite(t.at.bottom)) throw new TypeError('A measured tag is { seat, at: { x, bottom }, width, height, self }');
  }
  // Deterministic: the front first (the lowest foot), then left to right, then by seat; "You" last, so it gives way first.
  const order = [...tags].sort((a, b) => (Number(!!a.self) - Number(!!b.self)) || (b.at.bottom - a.at.bottom) || (a.at.x - b.at.x)
    || (String(a.seat) < String(b.seat) ? -1 : String(a.seat) > String(b.seat) ? 1 : 0));
  const placed = [];
  let inside = true, apart = true;
  const meets = (a, b, g) => a.left < b.left + b.width + g && b.left < a.left + a.width + g && a.top < b.top + b.height + g && b.top < a.top + a.height + g;
  for (const t of order) {
    const { width: w, height: h } = t;
    if (w > panel.width - 2 * pad || h > panel.height - 2 * pad) inside = false;
    // Rules 1 and 3: centred on the press point, kept inside; 6 px above the press area's foot, above the pack's floor.
    const left = Math.max(pad, Math.min(panel.width - pad - w, t.at.x - w / 2));
    const lo = pad, hi = Math.max(pad, panel.height - pad - h);
    const want = Math.max(lo, Math.min(hi, panel.height - TAG_RULES.footClear, t.at.bottom - TAG_RULES.lift));
    // Rule 4: what is already placed, and keepClear, are in the way; only what overlaps across matters.
    const across = [...clear.map(c => ({ ...c, clear: true })), ...placed].filter(o => left < o.left + o.width + gap && o.left < left + w + gap);
    const free = top => across.every(o => !meets({ left, top, width: w, height: h }, o, o.clear ? 0 : gap));
    let top = want;
    if (!free(top)) {
      const candidates = across.flatMap(o => { const g = o.clear ? 0 : gap; return [o.top - g - h, o.top + o.height + g]; })
        .filter(c => c >= lo - 1e-9 && c <= hi + 1e-9 && free(c));
      // Up, or else down, no further than it needs: the nearest place above; only when none fits, the nearest below.
      const up = candidates.filter(c => c <= want).sort((a, b) => b - a), down = candidates.filter(c => c > want).sort((a, b) => a - b);
      const chosen = up[0] ?? down[0];
      if (chosen !== undefined) top = chosen;
      else if (across.some(o => o.clear && meets({ left, top, width: w, height: h }, o, 0))) inside = false;
      else apart = false;
    }
    placed.push({ seat: t.seat, left, top, width: w, height: h });
  }
  for (const p of placed) if (clear.some(c => meets(p, c, 0))) inside = false;
  for (let i = 0; i < placed.length; i += 1) for (let j = i + 1; j < placed.length; j += 1) if (meets(placed[i], placed[j], gap - 1e-9)) apart = false;
  const places = placed.map(({ seat, left, top }) => ({ seat, left, top }))
    .sort((a, b) => (String(a.seat) < String(b.seat) ? -1 : String(a.seat) > String(b.seat) ? 1 : 0));
  return { places, inside, apart };
}

/**
 * Mounts one panel's tags: `panel` is Board V2's panel element (positioned), `input` as
 * checkBoardTags(). Returns { element, update(partial), suspend(), resume(), dispose() }.
 */
export function mountBoardTags(panel, input = {}) {
  if (!panel?.ownerDocument) throw new TypeError('Board tags need the panel element');
  const doc = panel.ownerDocument;
  let state = checkBoardTags({ ...input });
  const root = doc.createElement('div');
  root.className = 'ms-board-tags ms-kit';
  root.setAttribute('aria-hidden', 'true');
  root.dataset.version = BOARD_TAGS_VERSION;
  panel.append(root);
  const nodes = new Map();
  let suspended = false, disposed = false;

  const el = (tag, className) => { const n = doc.createElement(tag); n.className = className; return n; };
  const statusWords = health => (health === 'Injured' ? TAG_WORDS.injured : health === 'Eliminated' ? TAG_WORDS.out : null);

  function paint(node, person) {
    const self = state.viewer !== null && person.seat === state.viewer;
    // Rebuilt only when its words change: the same element is kept for the seat.
    const key = JSON.stringify([person.seat, person.office, self ? TAG_WORDS.you : person.name, statusWords(person.health)]);
    if (node.dataset.key !== key) {
      node.replaceChildren();
      const num = el('b', 'ms-bt-num');
      num.textContent = String(person.seat);
      node.append(num);
      if (person.office) {
        const office = el('i', 'ms-bt-office');
        office.title = person.office === 'captain' ? TAG_WORDS.captain : TAG_WORDS.officer;
        office.innerHTML = iconSvg(person.office, { filled: true, className: 'ms-bt-ic' });
        node.append(office);
      }
      const text = el('span', 'ms-bt-text');
      const name = el('span', 'ms-bt-name');
      name.textContent = self ? TAG_WORDS.you : person.name;
      text.append(name);
      const words = statusWords(person.health);
      if (words) { const s = el('span', 'ms-bt-status'); s.textContent = words; text.append(s); }
      node.append(text);
      node.dataset.key = key;
    }
    node.dataset.seat = String(person.seat);
    node.toggleAttribute('data-self', self);
    node.toggleAttribute('data-active', person.seat === state.active);
    node.toggleAttribute('data-dim', state.dim.includes(person.seat));
    node.style.maxWidth = `${Math.max(0, state.size.width - 2 * TAG_RULES.pad)}px`;
  }

  function layout() {
    if (disposed || suspended || state.status === 'concealed') return;
    const tags = state.people.map(p => {
      const n = nodes.get(p.seat);
      // Layout sizes, which a transform (the Room ↔ Board zoom) does not change.
      return { seat: p.seat, at: p.at, width: n.offsetWidth, height: n.offsetHeight, self: p.seat === state.viewer };
    });
    const { places, inside, apart } = layoutTags({ panel: state.size, keepClear: state.keepClear, tags });
    for (const p of places) {
      const n = nodes.get(p.seat);
      n.style.left = `${p.left}px`;
      n.style.top = `${p.top}px`;
    }
    root.dataset.inside = String(inside);
    root.dataset.apart = String(apart);
  }

  function draw() {
    if (disposed) return;
    root.dataset.status = state.status;
    root.style.width = `${state.size.width}px`;
    root.style.height = `${state.size.height}px`;
    if (state.status === 'concealed') {
      root.replaceChildren();
      nodes.clear();
      delete root.dataset.inside;
      delete root.dataset.apart;
      return;
    }
    const present = new Set(state.people.map(p => p.seat));
    for (const [seat, n] of nodes) if (!present.has(seat)) { n.remove(); nodes.delete(seat); }
    for (const person of state.people) {
      let n = nodes.get(person.seat);
      if (!n) { n = el('span', 'ms-bt-tag'); nodes.set(person.seat, n); root.append(n); }
      paint(n, person);
    }
    layout();
  }

  const onFonts = () => layout();
  doc.fonts?.addEventListener?.('loadingdone', onFonts);
  draw();

  return {
    element: root,
    /** Changes only what it is given. A new viewer drops this viewer's dim; concealed drops every input until given again. */
    update(partial = {}) {
      if (disposed) return;
      if (!plain(partial)) throw new TypeError('update takes an object');
      for (const key of Object.keys(partial)) if (!KEYS.includes(key)) throw new TypeError(`Board tags have no input ${JSON.stringify(key)}`);
      const prev = state;
      const raw = { ...prev, ...partial };
      const viewerChanged = 'viewer' in partial && (partial.viewer === null ? null : seatNumber(partial.viewer, 'viewer')) !== prev.viewer;
      if (viewerChanged && !('dim' in partial)) raw.dim = [];
      if (raw.status === 'concealed') Object.assign(raw, { people: [], viewer: null, dim: [], active: null });
      state = checkBoardTags(raw);
      draw();
    },
    suspend() { suspended = true; },
    resume() { if (disposed) return; suspended = false; draw(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      doc.fonts?.removeEventListener?.('loadingdone', onFonts);
      root.remove();
      nodes.clear();
    },
  };
}
