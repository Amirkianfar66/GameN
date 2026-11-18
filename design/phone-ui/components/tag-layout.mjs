// Name tags apart: the rules alone, pure (no DOM), shared by the room scene and the board's tags.
//
// Moved here from board-tags-0.1.0 (the Gameplay builder's, #298, built to the interface the Lead
// approved on #4) when the room scene became its second user, for #222 item 34: the name tags whole and
// apart from each other at every text size. The board keeps the defaults; the room scene passes its own
// lift and floor, which put a tag where the pack's room puts it.
//
// The rules, in CSS px, for tags measured where they are drawn:
//   1. where the sheet puts it: centred on the press point, its top `lift` above the press area's foot
//      and no lower than `footClear` above the panel's foot;
//   2. whole: the tag's own (its pill grows with its words); not decided here;
//   3. inside: `pad` inside the panel, clear of every `keepClear` box;
//   4. apart: `gap` between tags; where two would meet, one moves up, or else down, no further than it
//      needs; "You" gives way first, then the one further back.
// Deterministic: the same tags, panel and keepClear give the same places, in any order.

export const TAG_LAYOUT_VERSION = 'tag-layout-0.1.0';

/** The rules' numbers, in CSS px: the panel's inset, the space between tags, the lift above the press area's foot, and the floor above the panel's foot. */
export const TAG_RULES = Object.freeze({ pad: 4, gap: 2, lift: 6, footClear: 30 });

const finite = v => typeof v === 'number' && Number.isFinite(v);
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function box(value, what) {
  if (!plain(value) || !['left', 'top', 'width', 'height'].every(k => finite(value[k])) || value.width < 0 || value.height < 0) {
    throw new TypeError(`${what} is { left, top, width, height } in CSS px`);
  }
  return { left: value.left, top: value.top, width: value.width, height: value.height };
}

/**
 * The rules alone: measured boxes in, places out. `tags` are [{ seat, at: { x, bottom }, width, height,
 * self }]: `at` is the press point's x and the press area's foot; `panel` is { width, height }.
 * Returns { places: [{ seat, left, top }] in seat order, inside, apart }: `inside` when every tag fits
 * `pad` inside the panel clear of keepClear, `apart` when no two are within `gap`.
 */
export function layoutTags({ panel, pad = TAG_RULES.pad, gap = TAG_RULES.gap, lift = TAG_RULES.lift, footClear = TAG_RULES.footClear, keepClear = [], tags }) {
  if (!plain(panel) || !finite(panel.width) || !finite(panel.height)) throw new TypeError('layoutTags needs the panel\'s { width, height }');
  if (![pad, gap, lift, footClear].every(finite)) throw new TypeError('layoutTags takes numbers for pad, gap, lift and footClear');
  if (!Array.isArray(keepClear)) throw new TypeError('keepClear is a list of boxes');
  if (!Array.isArray(tags)) throw new TypeError('layoutTags needs the measured tags');
  const clear = keepClear.map((b, i) => box(b, `keepClear[${i}]`));
  for (const t of tags) {
    if (!plain(t) || !finite(t.width) || !finite(t.height) || !plain(t.at) || !finite(t.at.x) || !finite(t.at.bottom)) {
      throw new TypeError('A measured tag is { seat, at: { x, bottom }, width, height, self }');
    }
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
    // Rules 1 and 3: centred on the press point, kept inside; `lift` above the press area's foot, above the floor.
    const left = Math.max(pad, Math.min(panel.width - pad - w, t.at.x - w / 2));
    const lo = pad, hi = Math.max(pad, panel.height - pad - h);
    const want = Math.max(lo, Math.min(hi, panel.height - footClear, t.at.bottom - lift));
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
