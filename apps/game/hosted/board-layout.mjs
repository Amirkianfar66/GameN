// Fits the phone's comic board between the status bar and the strip or navigation. Everything
// here is worked out from public occupancy, which the markup already carries (each seat's
// station, each room's rows), so every phone draws the same board. Caption heights are
// measured rather than assumed, because they grow with the reader's text size. The page's
// strict style policy allows no style attribute in markup, so the numbers travel as data
// attributes and are set here as custom properties.

/** The bands of the page, top to bottom, and the rooms that share each one. */
const BANDS = Object.freeze({ top: ['command-room'], middle: ['room-a', 'room-b'], lower: ['hospital', 'jail'] });
/** How the spare height is shared between bands that have characters in them. */
const WEIGHTS = Object.freeze({ top: 0.8, middle: 1.25, lower: 1 });
/** A row of characters is at least one 44 px press area tall while any of them can be tapped. */
const TAP_ROW_PX = 44;
const QUIET_ROW_PX = 30;
const ROOMY_ROW_PX = 74;

const number = value => Number.parseFloat(value) || 0;

function set(element, name, value) {
  if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
}

/** Copies each seat's station and each room's rows from data attributes onto the custom properties the stylesheet reads. */
function place(zones) {
  for (const seat of zones.querySelectorAll('.ms-seat[data-station]')) {
    for (const [name, attribute] of [['--x', 'x'], ['--row', 'row'], ['--depth', 'depth'], ['--gap', 'gap']]) {
      const value = seat.dataset[attribute];
      if (value !== undefined) set(seat, name, value);
    }
  }
  for (const zone of zones.querySelectorAll('.ms-zone[data-rows]')) set(zone, '--room-rows', zone.dataset.rows);
}

/** The height a room's caption band needs: a move tag's press area, or a fixed caption and its inset. */
function captionHeight(zone) {
  const move = zone.querySelector('.phone-room-move');
  if (move) return Math.ceil(Math.max(TAP_ROW_PX, move.offsetHeight));
  const tag = zone.querySelector('.phone-room-tag') ?? zone.querySelector('.ms-zone__name');
  return Math.ceil((tag?.offsetHeight ?? 0) + 6);
}

/**
 * Sizes the board's bands. A band needs its panel borders, its caption, the piece pad and one
 * row unit per row of its fuller room; what is left is shared by weight. The row unit stays at
 * least one press area tall while characters can be tapped, so a taller strip never squeezes a
 * press area; past that, the board scrolls inside itself instead of being clipped.
 * @param {ParentNode} root
 */
export function fitBoard(root) {
  const zones = root.querySelector('.ms-board[data-board="own"] > .ms-zones');
  if (!zones) return;
  place(zones);
  for (const zone of zones.querySelectorAll('.ms-zone')) set(zone, '--cap', `${captionHeight(zone)}px`);
  const height = zones.clientHeight;
  if (!height) return;
  const style = getComputedStyle(zones);
  const outer = number(style.paddingTop) + number(style.paddingBottom) + 2 * number(style.rowGap);
  if (zones.dataset.final === 'true') {
    set(zones, '--row-unit', `${Math.min(76, Math.max(48, (height - outer - 32) / 3))}px`);
    return;
  }
  const minimum = zones.querySelector('.phone-character-target') ? TAP_ROW_PX : QUIET_ROW_PX;
  const base = {};
  const rows = {};
  for (const [band, rooms] of Object.entries(BANDS)) {
    base[band] = 0;
    rows[band] = 0;
    for (const id of rooms) {
      const zone = zones.querySelector(`.ms-zone[data-zone="${id}"]`);
      if (!zone || zone.hidden) continue;
      const zoneStyle = getComputedStyle(zone);
      const need = number(zoneStyle.borderTopWidth) + number(zoneStyle.borderBottomWidth) + number(zoneStyle.getPropertyValue('--cap')) + number(zoneStyle.getPropertyValue('--pad'));
      base[band] = Math.max(base[band], need);
      rows[band] = Math.max(rows[band], Number(zone.dataset.rows) || 0);
    }
  }
  const bands = Object.keys(BANDS);
  const total = bands.reduce((sum, band) => sum + rows[band], 0);
  const spare = height - outer - bands.reduce((sum, band) => sum + base[band], 0);
  const unit = Math.max(minimum, Math.min(ROOMY_ROW_PX, spare / Math.max(1, total)));
  const need = Object.fromEntries(bands.map(band => [band, base[band] + rows[band] * unit]));
  const left = Math.max(0, height - outer - bands.reduce((sum, band) => sum + need[band], 0));
  // What is left goes to the bands with characters in them; with nobody anywhere, to all three.
  const occupied = bands.filter(band => rows[band] > 0);
  const sharing = occupied.length > 0 ? occupied : bands;
  const share = sharing.reduce((sum, band) => sum + WEIGHTS[band], 0);
  set(zones, '--row-unit', `${unit}px`);
  for (const band of bands) set(zones, `--band-${band}`, `${Math.floor(need[band] + (sharing.includes(band) ? (left * WEIGHTS[band]) / share : 0))}px`);
}
