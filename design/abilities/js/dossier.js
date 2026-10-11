// mothership:dev-only
//
// The Insider's file: a private investigation board for the starting knowledge the Insider's
// view carries (knowledge.insiderCandidates in packages/contracts/src/full-game.ts): the unordered
// set of the three players who hold Undercover, Alien and Cracker, without which holds which.
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

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'class') node.className = value;
    else if (name === 'dataset') Object.assign(node.dataset, value);
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  node.append(...children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false));
  return node;
}

const seatList = suspects => suspects.map(seat => `Player ${seat.n}, ${seat.name}`).join(', ').replace(/, ([^,]*)$/, ' and $1');

/**
 * The file, built from the view's candidates joined with each seat's public identity.
 * candidates: [{ n, name, character }]. describe(n): that seat's public facts in words.
 * onShow(n): the player asked to see that character on the board.
 */
export function insiderFile(candidates, { describe = () => '', onShow = null } = {}) {
  // A stable public order: by seat number, never the order the view happens to list them in.
  const suspects = [...candidates].sort((a, b) => a.n - b.n);
  const file = el('section', { class: 'ab-file', 'data-file': 'insider', 'aria-labelledby': 'ab-file-title' });
  const tab = el('header', { class: 'ab-file__tab' },
    el('h3', { class: 'ab-file__title', id: 'ab-file-title' }, FILE_COPY.title),
    el('span', { class: 'ab-stamp', 'data-stamp': 'classified', 'aria-hidden': 'true' }, FILE_COPY.classified));
  const summary = el('p', { class: 'ab-vh' }, FILE_COPY.summary(seatList(suspects)));
  const list = el('ol', { class: 'ab-suspects', 'aria-label': FILE_COPY.suspects });
  for (const seat of suspects) {
    // The seat number is an evidence marker in the portrait's corner, so the caption holds the
    // whole width for the name; a name too long for a small snapshot ends in an ellipsis there and
    // is said in full by the button and by the inspect card. At large text the caption, beside the
    // snapshot, carries the number and the whole name instead.
    const photo = el('button', { type: 'button', class: 'ab-photo', 'data-seat': seat.n, 'aria-pressed': 'false', 'aria-label': FILE_COPY.inspect(seat.n, seat.name) },
      el('span', { class: 'ab-photo__frame', 'aria-hidden': 'true' },
        el('span', { class: 'ab-photo__art', 'data-character': seat.character }),
        el('span', { class: 'ab-photo__numeral' }, String(seat.n)),
        el('span', { class: 'ab-photo__pin' }),
        el('span', { class: 'ab-photo__query' }),
        el('span', { class: 'ab-seat ab-photo__seat' }, String(seat.n))),
      el('span', { class: 'ab-photo__caption', 'aria-hidden': 'true' }, el('span', { class: 'ab-seat ab-photo__caption-seat' }, String(seat.n)), el('span', { class: 'ab-photo__name' }, seat.name)));
    list.append(el('li', { class: 'ab-suspect' }, photo));
  }
  // The three names as one set: one group with one accessible name; the slip's words are pictures of it.
  const roles = el('div', { class: 'ab-roles', role: 'img', 'aria-label': FILE_COPY.roles },
    el('span', { class: 'ab-roles__back' }),
    el('span', { class: 'ab-roles__slip' }, ROLE_NAMES.map(name => el('span', { class: 'ab-roles__name' }, name))),
    el('span', { class: 'ab-roles__front' }),
    el('span', { class: 'ab-roles__clip' }),
    el('span', { class: 'ab-stamp', 'data-stamp': 'one-each' }, FILE_COPY.oneEach));
  const note = el('p', { class: 'ab-file__note' }, FILE_COPY.note);
  const corners = ['tl', 'tr', 'br', 'bl'].map(corner => el('span', { class: 'ab-corner-pin', 'data-corner': corner, 'aria-hidden': 'true' }));
  const thread = document.createElementNS(NS, 'svg');
  thread.setAttribute('class', 'ab-thread');
  thread.setAttribute('aria-hidden', 'true');
  thread.innerHTML = '<path class="ab-thread__ink" d=""/><path class="ab-thread__core" d=""/>';
  const field = el('div', { class: 'ab-file__field' }, corners, list, roles);
  const card = el('div', { class: 'ab-inspect', hidden: true, 'aria-live': 'polite' });
  file.append(tab, summary, field, thread, note, card);

  const inspect = n => {
    const seat = suspects.find(entry => entry.n === n) ?? null;
    file.dataset.inspect = seat ? String(seat.n) : '';
    for (const button of list.querySelectorAll('.ab-photo')) {
      const on = seat !== null && Number(button.dataset.seat) === seat.n;
      button.setAttribute('aria-pressed', String(on));
      button.style.removeProperty('--ab-lift-x');
      if (on) {
        // Lift the snapshot toward the middle of the board: the same lift for any of the three.
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
  file.addEventListener('click', event => {
    const photo = event.target.closest('.ab-photo');
    if (photo) {
      cancelMotion(file);
      inspect(file.dataset.inspect === photo.dataset.seat ? null : Number(photo.dataset.seat));
      return;
    }
    const act = event.target.closest('[data-file-act]')?.dataset.fileAct;
    if (act === 'back') {
      const was = file.dataset.inspect;
      inspect(null);
      list.querySelector(`.ab-photo[data-seat="${CSS.escape(was)}"]`)?.focus();
    }
    if (act === 'show' && onShow) onShow(Number(file.dataset.inspect));
  });
  file.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !file.dataset.inspect) return;
    event.stopPropagation();
    const was = file.dataset.inspect;
    inspect(null);
    list.querySelector(`.ab-photo[data-seat="${CSS.escape(was)}"]`)?.focus();
  });
  new ResizeObserver(() => drawThread(file)).observe(file);
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

/** Stops whatever of the file is moving, and leaves it at rest, as it is. */
export function cancelMotion(file) {
  for (const animation of ANIMATIONS.get(file) ?? []) animation.finish();
  ANIMATIONS.delete(file);
}

/**
 * The file assembles: the board, the snapshots dropped in seat order and pinned, the envelope and
 * its slip (the three names together), the query tags all at once, the string round the whole
 * set, the stamps. Nothing waits on it: every control works from the first frame. Reduced: the
 * file appears at rest with a fade. Returns the animations, finished as one.
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
    for (const query of file.querySelectorAll('.ab-photo__query')) {
      play(query, [{ opacity: 0, transform: 'rotate(-48deg)' }, { opacity: 1, transform: 'rotate(18deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: M.query, delay: M.queriesFrom, easing: 'ease-out' });
    }
    play(file.querySelector('.ab-roles'), [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: M.envelope, delay: M.envelopeFrom, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    play(file.querySelector('.ab-roles__slip'), [{ transform: 'translateY(58%)' }, { transform: 'none' }], { duration: M.slip, delay: M.slipFrom, easing: 'cubic-bezier(0.3, 1.25, 0.6, 1)' });
    for (const pin of file.querySelectorAll('.ab-corner-pin')) {
      play(pin, [{ opacity: 0, transform: 'scale(1.7)' }, { opacity: 1, transform: 'scale(1)' }], { duration: M.pin, delay: M.threadFrom - M.pin, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    }
    for (const path of file.querySelectorAll('.ab-thread path')) {
      const length = path.getTotalLength?.() || 1;
      play(path, [{ strokeDasharray: `${length}`, strokeDashoffset: `${length}` }, { strokeDasharray: `${length}`, strokeDashoffset: '0' }], { duration: M.thread, delay: M.threadFrom, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    }
    const thump = [{ opacity: 0, transform: 'scale(1.9) rotate(var(--ab-stamp-from, -18deg))' }, { opacity: 1, transform: 'scale(0.94) rotate(var(--ab-stamp-turn, -8deg))', offset: 0.75 }, { opacity: 1, transform: 'scale(1) rotate(var(--ab-stamp-turn, -8deg))' }];
    play(file.querySelector('[data-stamp="classified"]'), thump, { duration: M.stamp, delay: M.stampClassified, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });
    play(file.querySelector('[data-stamp="one-each"]'), thump, { duration: M.stamp, delay: M.stampOneEach, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });
  }
  ANIMATIONS.set(file, list);
  const finished = Promise.allSettled(list.map(animation => animation.finished)).then(() => { if (ANIMATIONS.get(file) === list) ANIMATIONS.delete(file); });
  return { animations: list, finished };
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
