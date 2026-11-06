// mothership:dev-only
//
// Proposed words for library group 5 (windows and drawing). Frontend owns the game's copy
// (packages/presentation/src/copy/); these are proposals in the dossier's voice: short, plain,
// second person, never a claim the view does not make. A drawing is called a claim, never evidence
// or a fact; nothing says a window shows a room, a person or a position (there is no live view and
// no view through the Blackout); the only input is drawing (no text box: no new voice channel).

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export const WINDOW_COPY = Object.freeze({
  /** A window's title from this seat's side: the room at its other end. */
  title: facing => `Window to ${facing}`,
  tapeWindows: 'Windows',
  // Stamps (the dossier's stamp frame; the words carry the meaning beside them too).
  stampSending: 'Sending',
  stampShown: 'Shown',
  stampDark: 'Lights out',
  // The feed.
  claims: 'Drawings are claims. The app does not check them.',
  empty: 'Nothing shown yet this round.',
  expiry: round => `Shown drawings stay until the end of Round ${round}.`,
  caption: (order, author) => `#${order} · ${author}`,
  // The station and the pad.
  station: facing => `You are at this window's drawing station. Draw here, then show it to ${facing}.`,
  viewOnly: 'Only the player at this window\'s drawing station can show drawings here.',
  noStation: 'There is no drawing station here. You can still see what is shown.',
  blank: 'Draw with your finger. Nothing is sent until you press Show.',
  drawing: 'Your drawing is only on your phone until you press Show.',
  full: 'Your drawing is full. Show it, or undo a line to make room.',
  closed: 'You can keep drawing. Show opens when the server allows it.',
  undo: 'Undo',
  clear: 'Clear',
  show: 'Show',
  back: 'Back',
  review: (facing, rooms) => `Show this drawing in the window to ${facing}? Everyone in ${rooms} sees it, and it cannot be erased or replaced.`,
  sending: 'Showing your drawing…',
  shown: round => `Shown. It stays in the window until the end of Round ${round}.`,
  refused: 'The server did not accept the drawing. Nothing was shown, and your drawing is still here.',
  dark: 'Lights out: the Blackout darkens every window until the lights return.',
  budget: (used, total) => `${used} of ${total} ink`,
  // Colours and widths, named for the reader (swatches carry the name as their label).
  colours: Object.freeze({ '#151923': 'Ink', '#F4EBDD': 'Chalk', '#F7C52B': 'Yellow', '#5FE0E8': 'Cyan', '#6FE3B0': 'Green' }),
  widths: Object.freeze({ 3: 'Fine', 7: 'Medium', 14: 'Bold' }),
  // The board's station marker.
  stationMarker: facing => `Drawing station: draws to ${facing}`,
  privacy: 'Only players at either end of this window see it.',
});

/** "Room A and Room B" for a window's two rooms, in the order the rules name them. */
export const bothRooms = ([a, b]) => `${a} and ${b}`;
export { cap };
