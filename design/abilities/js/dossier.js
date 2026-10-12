// mothership:dev-only
//
// The private files of the ability art: a seat's own investigation board, drawn from what its
// view carries. This module holds what every file shares (the snapshot, the board, the string,
// inspecting, the assembly and the closed folder) and the Insider's file; intel.js adds the
// Hacker's and the Alien's.
//
// The Insider's file draws the starting knowledge the Insider's view carries
// (knowledge.insiderCandidates in packages/contracts/src/full-game.ts): the unordered set of the
// three players who hold Undercover, Alien and Cracker, without which holds which.
//
// What it shows, and what it must never show:
// - The three players' own public appearances: the crew card each chose, the seat number and the
//   name. In seat order, a public order that says nothing about any role, whatever order the
//   view lists them in.
// - The three role names as ONE set, in one envelope, in a fixed order that never changes with
//   the candidates. Nothing ties a name to a portrait: not a color, a position, a line, the order
//   things move in, an accessible name or an asset. Every portrait gets the same frame, the same
//   pin, the same query tag and the same tilt for its position, and one string loops around the
//   whole set, portraits and envelope together.
// - Inspecting a portrait lifts it and says the player's public facts, which every screen shows.
//   It never adds a clue.
// Only inside the seat's own open private sheet, after gameplay starts: never on the board, the
// shared display or a host view, and not during the setup reading stage (whose preview carries
// no knowledge). Built only while the sheet is open; closed, there is no private word in the page.

const NS = 'http://www.w3.org/2000/svg';

/** The rules' order of the three role names, fixed whatever the candidates (v2.1 roles.Insider). */
export const ROLE_NAMES = Object.freeze(['Undercover', 'Alien', 'Cracker']);

export const FILE_COPY = Object.freeze({
  title: 'Insider file',
  classified: 'Classified',
  oneEach: 'One each',
  note: 'Who is which: unknown.',
  suspects: 'The three players',
  // The release's sentence for this knowledge (packages/presentation/src/copy/en.ts, knowledge.insider).
  summary: names => `${names} hold the roles Undercover, Alien and Cracker, one each. You are not told which of them holds which.`,
  roles: 'Their roles, one each: Undercover, Alien and Cracker. Which of them holds which is not known.',
  inspect: (n, name) => `Player ${n}, ${name}. Inspect`,
  inspected: (n, name, facts) => `Player ${n}, ${name}. ${facts}`,
  showOnBoard: 'Show on board',
  back: 'Back',
});

/** Motion, in ms: every beat, so a storyboard and a check can name them. */
export const FILE_MOTION = Object.freeze({
  board: 180, photosFrom: 120, photo: 260, photoStagger: 70, pin: 120, envelopeFrom: 300, envelope: 200,
  slipFrom: 520, slip: 240, queriesFrom: 540, query: 280, threadFrom: 640, thread: 380, stampClassified: 220, stampOneEach: 860, stamp: 140,
  total: 1020, reducedFade: 80, inspect: 200, hide: 160,
});

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'class') node.className = value;
    else if (name === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  node.append(...children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false));
  return node;
}

/** Players in a sentence, in the order given: "Player 2, Ben, Player 5, Eli and Player 8, Hana". */
export const seatList = seats => seats.map(seat => `Player ${seat.n}, ${seat.name}`).join(', ').replace(/, ([^,]*)$/, ' and $1');

/**
 * One snapshot: a player's own chosen crew card in the frame, pinned, the seat number as a sticker in
 * the portrait's corner and the name on the frame's margin. Built the same for every player; what may
 * differ is only the player (seat, name, character) and, for a file that asks, the query tag (the same
 * on every snapshot of that file), the own seat's mark, and a label tape where the pairing is the
 * seat's own knowledge (the Hacker's Undercover; never in the Insider's file).
 *
 * The seat number is an evidence marker in the portrait's corner, so the caption holds the whole
 * width for the name; a name too long for a small snapshot ends in an ellipsis there and is said in
 * full by the button and by the inspect card. At large text the caption, beside the snapshot,
 * carries the number and the whole name instead.
 */
export function snapshot(seat, { label, query = false, own = null, tape = null } = {}) {
  return el('button', { type: 'button', class: 'ab-photo', 'data-seat': seat.n, 'aria-pressed': 'false', 'aria-label': label },
    el('span', { class: 'ab-photo__frame', 'aria-hidden': 'true' },
      el('span', { class: 'ab-photo__art', 'data-character': seat.character }),
      el('span', { class: 'ab-photo__numeral' }, String(seat.n)),
      el('span', { class: 'ab-photo__pin' }),
      query ? el('span', { class: 'ab-photo__query' }) : null,
      el('span', { class: 'ab-seat ab-photo__seat' }, String(seat.n)),
      own ? el('span', { class: 'ab-photo__own' }, own) : null,
      tape ? el('span', { class: 'ab-photo__tape' }, tape) : null),
    el('span', { class: 'ab-photo__caption', 'aria-hidden': 'true' }, el('span', { class: 'ab-seat ab-photo__caption-seat' }, String(seat.n)), el('span', { class: 'ab-photo__name' }, seat.name)));
}

/** A file's board: the tab with its title and the CLASSIFIED stamp. */
export function fileShell(kind, title) {
  const file = el('section', { class: 'ab-file', 'data-file': kind, 'aria-labelledby': 'ab-file-title' });
  const tab = el('header', { class: 'ab-file__tab' },
    el('h3', { class: 'ab-file__title', id: 'ab-file-title' }, title),
    el('span', { class: 'ab-stamp', 'data-stamp': 'classified', 'aria-hidden': 'true' }, FILE_COPY.classified));
  file.append(tab);
  return file;
}

export const cornerPins = () => ['tl', 'tr', 'br', 'bl'].map(corner => el('span', { class: 'ab-corner-pin', 'data-corner': corner, 'aria-hidden': 'true' }));

export function threadSvg() {
  const thread = document.createElementNS(NS, 'svg');
  thread.setAttribute('class', 'ab-thread');
  thread.setAttribute('aria-hidden', 'true');
  thread.innerHTML = '<path class="ab-thread__ink" d=""/><path class="ab-thread__core" d=""/>';
  return thread;
}

/**
 * Inspecting, the same in every file: pressing a snapshot lifts it toward the middle of the field and
 * dims the rest; a card says that player's public facts (describe(n)), with Show on board (onShow) and
 * Back; Back and Escape put it back and return focus to it. It never adds a clue.
 */
export function makeInspectable(file, { field, seats, describe = () => '', onShow = null }) {
  const card = el('div', { class: 'ab-inspect', hidden: true, 'aria-live': 'polite' });
  file.append(card);
  const inspect = n => {
    const seat = seats.find(entry => entry.n === n) ?? null;
    file.dataset.inspect = seat ? String(seat.n) : '';
    for (const button of file.querySelectorAll('.ab-photo')) {
      const on = seat !== null && Number(button.dataset.seat) === seat.n;
      button.setAttribute('aria-pressed', String(on));
      button.style.removeProperty('--ab-lift-x');
      if (on) {
        // Lift the snapshot toward the middle of the board: the same lift for any of them.
        const box = button.getBoundingClientRect(), frame = field.getBoundingClientRect();
        button.style.setProperty('--ab-lift-x', `${Math.round(frame.left + frame.width / 2 - (box.left + box.width / 2))}px`);
      }
    }
    card.hidden = seat === null;
    if (seat !== null && getComputedStyle(card).position === 'static') requestAnimationFrame(() => card.scrollIntoView({ block: 'nearest' }));
    card.replaceChildren(...(seat === null ? [] : [
      el('p', { class: 'ab-inspect__who' }, el('span', { class: 'ab-inspect__lens', 'aria-hidden': 'true' }), el('span', { class: 'ab-seat' }, String(seat.n)), el('span', { class: 'ab-inspect__name' }, seat.name)),
      el('p', { class: 'ab-inspect__facts' }, describe(seat.n)),
      el('div', { class: 'ab-inspect__controls' },
        onShow ? el('button', { type: 'button', class: 'ab-button', 'data-file-act': 'show' }, FILE_COPY.showOnBoard) : null,
        el('button', { type: 'button', class: 'ab-button', 'data-file-act': 'back' }, FILE_COPY.back)),
    ]));
  };
  INSPECTORS.set(file, inspect);
  const putBack = () => {
    const was = file.dataset.inspect;
    inspect(null);
    file.querySelector(`.ab-photo[data-seat="${CSS.escape(was)}"]`)?.focus();
  };
  file.addEventListener('click', event => {
    const photo = event.target.closest('.ab-photo');
    if (photo && file.dataset.paused === 'true') return;
    if (photo) {
      cancelMotion(file);
      inspect(file.dataset.inspect === photo.dataset.seat ? null : Number(photo.dataset.seat));
      return;
    }
    const act = event.target.closest('[data-file-act]')?.dataset.fileAct;
    if (act === 'back') putBack();
    if (act === 'show' && onShow) onShow(Number(file.dataset.inspect));
  });
  file.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !file.dataset.inspect) return;
    event.stopPropagation();
    putBack();
  });
  new ResizeObserver(() => drawThread(file)).observe(file);
  return inspect;
}

/**
 * The file, built from the view's candidates joined with each seat's public identity.
 * candidates: [{ n, name, character }]. describe(n): that seat's public facts in words.
 * onShow(n): the player asked to see that character on the board.
 */
export function insiderFile(candidates, { describe = () => '', onShow = null } = {}) {
  // A stable public order: by seat number, never the order the view happens to list them in.
  const suspects = [...candidates].sort((a, b) => a.n - b.n);
  const file = fileShell('insider', FILE_COPY.title);
  const summary = el('p', { class: 'ab-vh' }, FILE_COPY.summary(seatList(suspects)));
  const list = el('ol', { class: 'ab-suspects', 'aria-label': FILE_COPY.suspects });
  for (const seat of suspects) list.append(el('li', { class: 'ab-suspect' }, snapshot(seat, { label: FILE_COPY.inspect(seat.n, seat.name), query: true })));
  // The three names as one set: one group with one accessible name; the slip's words are pictures of it.
  const roles = el('div', { class: 'ab-roles', role: 'img', 'aria-label': FILE_COPY.roles },
    el('span', { class: 'ab-roles__back' }),
    el('span', { class: 'ab-roles__slip' }, ROLE_NAMES.map(name => el('span', { class: 'ab-roles__name' }, name))),
    el('span', { class: 'ab-roles__front' }),
    el('span', { class: 'ab-roles__clip' }),
    el('span', { class: 'ab-stamp', 'data-stamp': 'one-each' }, FILE_COPY.oneEach));
  const note = el('p', { class: 'ab-file__note' }, FILE_COPY.note);
  const field = el('div', { class: 'ab-file__field' }, cornerPins(), list, roles);
  file.append(summary, field, threadSvg(), note);
  makeInspectable(file, { field, seats: suspects, describe, onShow });
  return file;
}

/** The string around the whole set: from pin to pin round the four corners, sagging a little between them. */
export function drawThread(file) {
  const thread = file.querySelector('.ab-thread');
  const field = file.querySelector('.ab-file__field');
  if (!thread || !field || !file.isConnected) return;
  const box = file.getBoundingClientRect();
  const points = ['tl', 'tr', 'br', 'bl'].map(corner => {
    const pin = field.querySelector(`[data-corner="${corner}"]`).getBoundingClientRect();
    return [pin.left - box.left + pin.width * 0.46, pin.top - box.top + pin.height * 0.36];
  });
  if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) return;
  thread.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const sag = (a, b, inward) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    return `Q ${(mx + inward[0]).toFixed(1)} ${(my + inward[1]).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  };
  const [tl, tr, br, bl] = points;
  const d = `M ${tl[0].toFixed(1)} ${tl[1].toFixed(1)} ${sag(tl, tr, [0, 7])} ${sag(tr, br, [-6, 0])} ${sag(br, bl, [0, -7])} ${sag(bl, tl, [6, 0])}`;
  for (const path of thread.querySelectorAll('path')) path.setAttribute('d', d);
}

const ANIMATIONS = new WeakMap();
// Each file's inspect, to put an inspected snapshot back when the file is paused.
const INSPECTORS = new WeakMap();

/** Stops whatever of the file is moving, and leaves it at rest, as it is. */
export function cancelMotion(file) {
  for (const animation of ANIMATIONS.get(file) ?? []) animation.finish();
  ANIMATIONS.delete(file);
}

/**
 * A file kept on a view that may be out of date or whose time is up (DSN-REQ-16, recommended): at rest, as it is.
 * Whatever moves finishes, an inspected snapshot is put back, and a snapshot cannot be pressed until the view is
 * current again: an inspected player's facts would be the stale view's.
 */
export function pauseFile(file, paused) {
  if ((file.dataset.paused === 'true') === paused) return;
  file.dataset.paused = String(paused);
  if (paused) {
    cancelMotion(file);
    // Focus in the inspect card goes back to its snapshot, as Back does; focus anywhere else stays where it is.
    const was = file.dataset.inspect;
    const focused = Boolean(was) && Boolean(file.querySelector('.ab-inspect')?.contains(document.activeElement));
    if (was) INSPECTORS.get(file)?.(null);
    if (focused) file.querySelector(`.ab-photo[data-seat="${CSS.escape(was)}"]`)?.focus();
    // Held, the file is at rest at once: the snapshot put back does not slide home, and nothing else still moves.
    for (const animation of file.getAnimations({ subtree: true })) { try { animation.finish(); } catch { animation.cancel(); } }
  }
  for (const photo of file.querySelectorAll('.ab-photo')) photo.setAttribute('aria-disabled', String(paused));
}

/** The beats every file opens with: the board rises, the snapshots drop in seat order and are pinned. */
export function openingBeats(file, play, M = FILE_MOTION) {
  play(file, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: M.board, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  file.querySelectorAll('.ab-photo').forEach((photo, index) => {
    const delay = M.photosFrom + index * M.photoStagger;
    play(photo, [
      { opacity: 0, transform: `translateY(-28px) rotate(${index % 2 ? 7 : -7}deg) scale(1.08)` },
      { opacity: 1, offset: 0.55 },
      { opacity: 1, transform: 'none' },
    ], { duration: M.photo, delay, easing: 'cubic-bezier(0.3, 1.35, 0.6, 1)' });
    play(photo.querySelector('.ab-photo__pin'), [{ opacity: 0, transform: 'scale(1.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: M.pin, delay: delay + M.photo - 60, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  });
}

/** The string drawn round the whole set from the four corner pins, from a given moment. */
export function threadBeats(file, play, from, M = FILE_MOTION) {
  for (const pin of file.querySelectorAll('.ab-corner-pin')) {
    play(pin, [{ opacity: 0, transform: 'scale(1.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: M.pin, delay: from - M.pin, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }
  for (const path of file.querySelectorAll('.ab-thread path')) {
    const length = path.getTotalLength?.() || 1;
    play(path, [{ strokeDasharray: `${length}`, strokeDashoffset: `${length}` }, { strokeDasharray: `${length}`, strokeDashoffset: '0' }], { duration: M.thread, delay: from, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
  }
}

/** A stamp landing. */
export const THUMP = [{ opacity: 0, transform: 'scale(1.9) rotate(var(--ab-stamp-from, -18deg))' }, { opacity: 1, transform: 'scale(0.94) rotate(var(--ab-stamp-turn, -8deg))', offset: 0.75 }, { opacity: 1, transform: 'scale(1) rotate(var(--ab-stamp-turn, -8deg))' }];
export const STAMP_EASING = 'cubic-bezier(0.5, 0, 0.75, 0)';

/** The Insider's file: the envelope and its slip (the three names together), the query tags all at once, the string, the stamps. */
function insiderBeats(file, play, M = FILE_MOTION) {
  openingBeats(file, play, M);
  for (const query of file.querySelectorAll('.ab-photo__query')) {
    play(query, [{ opacity: 0, transform: 'rotate(-48deg)' }, { opacity: 1, transform: 'rotate(18deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: M.query, delay: M.queriesFrom, easing: 'ease-out' });
  }
  play(file.querySelector('.ab-roles'), [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: M.envelope, delay: M.envelopeFrom, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  play(file.querySelector('.ab-roles__slip'), [{ transform: 'translateY(58%)' }, { transform: 'none' }], { duration: M.slip, delay: M.slipFrom, easing: 'cubic-bezier(0.3, 1.25, 0.6, 1)' });
  threadBeats(file, play, M.threadFrom, M);
  play(file.querySelector('[data-stamp="classified"]'), THUMP, { duration: M.stamp, delay: M.stampClassified, easing: STAMP_EASING });
  play(file.querySelector('[data-stamp="one-each"]'), THUMP, { duration: M.stamp, delay: M.stampOneEach, easing: STAMP_EASING });
}

/** Each kind of file's own assembly; intel.js adds the Hacker's and the Alien's. */
export const BEATS = { insider: insiderBeats };

/**
 * The file assembles in its own beats (BEATS). Nothing waits on it: every control works from the
 * first frame. Reduced: the file appears at rest with a fade. Returns the animations, finished as one.
 */
export function assemble(file, { reduced = false } = {}) {
  cancelMotion(file);
  const M = FILE_MOTION;
  const list = [];
  const play = (node, frames, options) => { if (node) list.push(node.animate(frames, { fill: 'backwards', ...options })); };
  if (reduced) {
    play(file, [{ opacity: 0 }, { opacity: 1 }], { duration: M.reducedFade, easing: 'linear' });
  } else {
    drawThread(file);
    (BEATS[file.dataset.file] ?? insiderBeats)(file, play);
  }
  ANIMATIONS.set(file, list);
  const finished = Promise.allSettled(list.map(animation => animation.finished)).then(() => { if (ANIMATIONS.get(file) === list) ANIMATIONS.delete(file); });
  return { animations: list, finished };
}

/** Adds animations to the file's own, so that cancelMotion finishes them too. */
export function playInFile(file, animations) {
  const list = ANIMATIONS.get(file) ?? [];
  list.push(...animations);
  ANIMATIONS.set(file, list);
}

/**
 * The closed folder: the cover of a seat's private file while it is hidden (the page in the
 * background, a view out of date). The same for every role and every seat: it names nothing.
 */
export function closedFolder(text) {
  return el('div', { class: 'ab-folder' },
    el('span', { class: 'ab-folder__art', 'aria-hidden': 'true' }),
    el('p', { class: 'ab-folder__label' }, text));
}
