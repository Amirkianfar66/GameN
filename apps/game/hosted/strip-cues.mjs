// Cues of the player's own command, on their own phone only: the strip arriving above
// navigation, a pick landing on a character, the receipt's stamp, and a command that was not
// accepted. Each starts from a difference between two drawn strips, so a redraw that changes
// nothing plays nothing, and none of them is queued, blocks a control or changes state.
// The registration stamp is the reviewed cue-registration; the others are proposals (DSN-D31).

const SELECTION_MS = 120;
const CARD_MS = 220;

/** What one drawn strip says, from the page: its step and status, and the characters picked on the own board. */
export function stripFacts(root) {
  const state = root.querySelector('.phone-action-dock .phone-strip > .ms-card__state');
  const picked = [...root.querySelectorAll('.ms-board[data-board="own"] .ms-seat:is([data-board-target="picked"], [data-board-target="selected"])')].map(seat => seat.dataset.seat);
  return { open: state !== null, status: state?.dataset.status ?? null, picked };
}

/** The cues between two drawn strips. Pure, so it can be tested without a page. */
export function stripChanges(previous, next) {
  if (!next.open) return { enter: false, registration: false, notAccepted: false, picked: [] };
  const sent = ['submitting', 'checking', 'unknown'];
  return {
    enter: !previous.open,
    registration: previous.open && sent.includes(previous.status) && next.status === 'accepted',
    notAccepted: previous.open && previous.status !== 'not-accepted' && next.status === 'not-accepted',
    picked: next.picked.filter(seat => !previous.picked.includes(seat)),
  };
}

/** @param {HTMLElement} root */
export function createStripCues(root) {
  let previous = { open: false, status: null, picked: [] };
  const timers = new Set();
  function mark(element, cue, ms) {
    if (!element) return;
    element.dataset.cue = cue;
    const timer = setTimeout(() => { timers.delete(timer); if (element.dataset.cue === cue) delete element.dataset.cue; }, ms);
    timers.add(timer);
  }
  return {
    /** After a redraw. A page in the background plays nothing and starts again from what is drawn. */
    after() {
      const next = stripFacts(root);
      const changes = document.visibilityState === 'visible' ? stripChanges(previous, next) : { enter: false, registration: false, notAccepted: false, picked: [] };
      previous = next;
      const state = root.querySelector('.phone-action-dock .phone-strip > .ms-card__state');
      if (changes.enter) mark(root.querySelector('.phone-action-dock'), 'enter', CARD_MS);
      if (changes.registration) mark(state, 'registration', SELECTION_MS);
      if (changes.notAccepted) mark(state, 'not-accepted', SELECTION_MS);
      for (const seat of changes.picked) mark(root.querySelector(`.ms-board[data-board="own"] .ms-seat[data-seat="${CSS.escape(seat)}"]`), 'pick', SELECTION_MS);
      return changes;
    },
    dispose() { for (const timer of timers) clearTimeout(timer); timers.clear(); },
  };
}
