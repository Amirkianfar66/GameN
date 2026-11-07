// mothership:dev-only
//
// Where the ATTACK BLOCKED label goes in its room's panel (storyboard S4;
// docs/design/attack-blocked.md): the placement rule alone, as pure geometry, so that a client can
// port it without the review page's controller (js/blocked-view.mjs, which is not to be ported).
// It reads a target's press area, the panel's size, the label's laid-out size and the room's
// caption, and nothing about who was attacked, by whom or why.

/** The label's margin from the panel's edges and from the room's caption, in px. */
export const LABEL_MARGIN = 2;

const overlaps = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

/**
 * Where ATTACK BLOCKED goes for a target: centred on its press point, LABEL_MARGIN inside the
 * panel, and never over the room's caption. Above the target's press area; where that leaves the
 * panel or meets the caption, below its name tag; where neither fits, as high as the caption
 * allows. `rect` is the target's slot rect from fit.mjs's slotRects(); `size` is the label's
 * [width, height]; `caption` the caption's box in the panel, or null.
 * Returns { left, top, place } with place 'above', 'below' or 'clamped'.
 */
export function labelBox({ rect, panel, size: [width, height], caption = null }) {
  const m = LABEL_MARGIN;
  const left = Math.max(m, Math.min(panel.width - width - m, rect.press[0] - width / 2));
  const guard = caption ? { left: caption.left - m, top: caption.top - m, width: caption.width + 2 * m, height: caption.height + 2 * m } : null;
  const fits = top => top >= m && top + height <= panel.height - m && !(guard && overlaps({ left, top, width, height }, guard));
  // The name tag's bottom, as the board draws it: at the foot of the press area, kept inside the panel.
  const tagBottom = Math.min(panel.height - 16, rect.top + rect.side - 14) + 16;
  const above = rect.top - height - m;
  if (fits(above)) return { left, top: above, place: 'above' };
  const below = tagBottom + m;
  if (fits(below)) return { left, top: below, place: 'below' };
  const floor = guard && guard.left < left + width && left < guard.left + guard.width ? guard.top + guard.height : m;
  return { left, top: Math.max(floor, Math.min(panel.height - height - m, above)), place: 'clamped' };
}
