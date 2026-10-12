// mothership:dev-only
// Proposed compact hit/nameplate anchors. Artwork/skeleton/scene anchors are unchanged.
// A neutral leader connects the plate to its existing figure; the same public order
// is used on every screen, independently of eligibility or secret action.
export const COMPACT_LAYOUT_VERSION = 'phone-target-anchors-0.1.0';
export const TOUCH = 44;
export function compactSlots(count, { width, height, caption = 44, pad = 4 }) {
  if (!Number.isInteger(count) || count < 0 || count > 5) throw new Error('Compact rooms hold at most five public occupants');
  if (!count) return [];
  const columns = Math.min(3, count), rows = Math.ceil(count / 3);
  const minimum = caption + rows * TOUCH + pad;
  if (width < columns * TOUCH || height < minimum) return null;
  const available = height - caption - pad;
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / 3), n = Math.min(3, count - row * 3), column = i % 3;
    return { left: (column + 0.5) * width / n - TOUCH / 2, top: caption + (row + 0.5) * available / rows - TOUCH / 2, side: TOUCH };
  });
}
export function compactBands(counts, { available, action = false }) {
  const cap = [6, 44, 30], rows = [counts.command ? 1 : 0, Math.ceil(Math.max(counts.a, counts.b) / 3), Math.ceil(Math.max(counts.h, counts.j) / 3)];
  const minimum = rows.map((n, i) => cap[i] + Math.max(1, n) * TOUCH + 4);
  const remaining = Math.max(0, available - minimum.reduce((sum, n) => sum + n, 0));
  const weights = action ? [0.12, 0.44, 0.44] : [0.22, 0.4, 0.38];
  return minimum.map((n, i) => n + remaining * weights[i]);
}
