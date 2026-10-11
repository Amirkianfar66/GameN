// mothership:dev-only
//
// Slice 2 of the ability art: the Hacker's file and Scan, the Hacker's Code attempt, and the
// Alien's Code. Built on the shared parts of dossier.js; private like every file: drawn only
// inside the seat's own open card, or its own action strip, never on the board, the shared display
// or a host view.
//
// What each shows, and what it must never show:
// - The Hacker's file: the known Undercover (knowledge.undercoverSeatId), one snapshot with the
//   label UNDERCOVER on it, since that pairing is the Hacker's own knowledge; and, from the rule
//   alone, that this player is not in the Code (v2.1 roles.Hacker.starting_knowledge: "therefore
//   knows that player's number is excluded from Code"). Then every Scan result the view carries
//   (knowledge.scanResults), in the view's order, each as a printout: the player scanned, the
//   guess, and the result exactly as authorized: a wrong guess shows nothing of the Code; a right
//   one shows only whether that player is in the Code, never a position. A result is never worked
//   out from a receipt.
// - The Alien's file: the four players of the Code (knowledge.code), one set, in seat order (a
//   public order), the Alien's own among them; no numbering but seat numbers, no positions.
// - The Code attempt, in the Hacker's strip: the picks are a set, shown in seat order in the
//   card's windows, never as positions 1 to 4. Registered is not a result: the Code is checked
//   with the other victories when Round 5 is resolved (V1-08).

import { el, fileShell, snapshot, cornerPins, threadSvg, makeInspectable, seatList, openingBeats, threadBeats, THUMP, STAMP_EASING, BEATS, FILE_MOTION, playInFile } from './dossier.js';

export const HACKER_COPY = Object.freeze({
  title: 'Hacker file',
  undercover: 'Undercover',
  // Proposed words: the release's sentence names only the Undercover; the rule gives the rest.
  notInCode: 'Not in the Code',
  scans: 'Scans',
  // The release's sentences (packages/presentation/src/copy/en.ts, knowledge).
  known: n => `The Undercover is Player ${n}.`,
  knownNotInCode: 'That player is not in the Code.',
  scan: (round, who, guess) => `Round ${round}: you scanned ${who} and guessed ${guess}.`,
  wrong: 'The guess was wrong.',
  rightInCode: 'The guess was right, and that player is in the Code.',
  rightNotInCode: 'The guess was right, and that player is not in the Code.',
  // On a printout.
  round: r => `Round ${r}`,
  guess: g => `Guess: ${g}`,
  stampWrong: 'Wrong',
  stampRight: 'Right',
  inCode: 'In the Code',
  inspect: (n, name) => `Player ${n}, ${name}. Inspect`,
});

export const ALIEN_COPY = Object.freeze({
  title: 'Alien file',
  code: 'The Code',
  note: 'Four players, in no order.',
  you: 'You',
  set: 'The four players of the Code',
  // The release's sentence (knowledge.code), its seats in seat order, the own marked as theirs.
  summary: names => `The Code is these four players: ${names}.`,
  inspect: (n, name, own) => `Player ${n}${own ? ' (you)' : ''}, ${name}. Inspect`,
});

/** Motion, in ms. */
export const INTEL_MOTION = Object.freeze({
  // The Hacker's file.
  labelFrom: 380, label: 180, markFrom: 520, printoutsFrom: 600, printout: 240, printoutStagger: 90, hackerStamp: 220,
  // A result that arrives while the page is open: printed once, never again.
  print: 420, printStamp: 140,
  // The Alien's file.
  alienThreadFrom: 520, tagFrom: 820, tag: 260, alienStamp: 220,
  // The strip: the scan sweep while the Scan is on its way; a chip clipping into the Code card; the card punched on the receipt.
  sweep: 900, clip: 160, punch: 220,
});

/**
 * The strip's one-shot beats. Each plays once, when the strip changes (a new pick, the receipt): the board
 * prototype keeps a strip that an update leaves unchanged, so a duplicate snapshot, a recovery or a
 * reconnect plays nothing again. Each is tagged, so that reduced motion can finish it at once.
 */
export const BEAT_ID = 'ab-beat';
export const clipIn = chip => chip?.animate([{ opacity: 0, transform: 'scale(1.5) rotate(-10deg)' }, { opacity: 1, transform: 'none' }], { duration: INTEL_MOTION.clip, easing: 'cubic-bezier(0.3, 1.4, 0.6, 1)', fill: 'backwards', id: BEAT_ID }) ?? null;
export const punch = card => card?.animate([{ transform: 'none' }, { transform: 'scale(0.94) translateY(2px)', offset: 0.4 }, { transform: 'none' }], { duration: INTEL_MOTION.punch, easing: STAMP_EASING, id: BEAT_ID }) ?? null;

/** A small portrait chip: a player's own crew card in a round window. */
export function chip(seat, { label = null } = {}) {
  return el('span', { class: 'ab-chip', 'data-seat': seat.n, ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }) },
    el('span', { class: 'ab-chip__art', 'data-character': seat.character }),
    el('span', { class: 'ab-chip__numeral' }, String(seat.n)),
    el('span', { class: 'ab-seat ab-chip__seat' }, String(seat.n)));
}

/** The Code's mark: a punch card with four holes, two by two; struck through for "not in the Code". */
const codeMark = struck => el('span', { class: 'ab-code-mark', 'data-struck': String(struck), 'aria-hidden': 'true' });

/**
 * One Scan result as a printout. scan: { round, target: { n, name, character }, guess, matched, inCode, self }.
 * Its words are the release's sentences; its marks say no more. A wrong guess carries no Code mark.
 */
export function printout(scan) {
  const who = scan.self ? 'yourself' : `Player ${scan.target.n}`;
  const result = !scan.matched ? HACKER_COPY.wrong : scan.inCode === true ? HACKER_COPY.rightInCode : scan.inCode === false ? HACKER_COPY.rightNotInCode : null;
  const key = `${scan.round}:${scan.target.n}`;
  const marks = [];
  if (!scan.matched) {
    marks.push(el('span', { class: 'ab-stamp ab-printout__stamp', 'data-stamp': 'wrong' }, HACKER_COPY.stampWrong));
  } else {
    marks.push(el('span', { class: 'ab-stamp ab-printout__stamp', 'data-stamp': 'right' }, HACKER_COPY.stampRight));
    if (scan.inCode !== null && scan.inCode !== undefined) {
      marks.push(el('span', { class: 'ab-printout__code' }, codeMark(!scan.inCode), el('span', null, scan.inCode ? HACKER_COPY.inCode : HACKER_COPY.notInCode)));
    }
  }
  return el('li', { class: 'ab-printout', 'data-scan': key, 'data-result': !scan.matched ? 'wrong' : scan.inCode === true ? 'in-code' : scan.inCode === false ? 'not-in-code' : 'right' },
    el('span', { class: 'ab-vh' }, `${HACKER_COPY.scan(scan.round, who, scan.guess)}${result ? ` ${result}` : ''}`),
    el('span', { class: 'ab-printout__paper', 'aria-hidden': 'true' },
      chip(scan.target),
      el('span', { class: 'ab-printout__words' },
        el('span', { class: 'ab-printout__round' }, HACKER_COPY.round(scan.round), ' · ', el('span', { class: 'ab-printout__name' }, scan.target.name)),
        el('span', { class: 'ab-printout__guess' }, HACKER_COPY.guess(scan.guess))),
      el('span', { class: 'ab-printout__marks' }, marks)));
}

/**
 * The Hacker's file. known: { n, name, character }, the Undercover; scans: as printout() takes them,
 * in the view's order. describe(n) and onShow(n) as for the Insider's file.
 */
export function hackerFile(known, scans = [], { describe = () => '', onShow = null } = {}) {
  const file = fileShell('hacker', HACKER_COPY.title);
  const summary = el('p', { class: 'ab-vh' }, `${HACKER_COPY.known(known.n)} ${HACKER_COPY.knownNotInCode}`);
  const photo = snapshot(known, { label: HACKER_COPY.inspect(known.n, known.name), tape: HACKER_COPY.undercover });
  const knownBlock = el('div', { class: 'ab-known' },
    el('div', { class: 'ab-known__photo' }, photo),
    el('div', { class: 'ab-known__words', 'aria-hidden': 'true' },
      // At large text the tape leaves the frame and stands here, as words that grow.
      el('span', { class: 'ab-known__role' }, HACKER_COPY.undercover),
      el('p', { class: 'ab-known__code' }, codeMark(true), el('span', null, HACKER_COPY.notInCode))));
  const field = el('div', { class: 'ab-file__field' }, cornerPins(), knownBlock);
  file.append(summary, field, threadSvg());
  if (scans.length) {
    file.append(el('section', { class: 'ab-scans', 'aria-labelledby': 'ab-scans-title' },
      el('h4', { class: 'ab-scans__title', id: 'ab-scans-title' }, HACKER_COPY.scans),
      el('ol', { class: 'ab-scans__list' }, scans.map(printout))));
  }
  makeInspectable(file, { field, seats: [known], describe, onShow });
  return file;
}

/**
 * The Alien's file: the Code's four players, one set, in seat order. code: [{ n, name, character }];
 * self: the viewer's own seat number.
 */
export function alienFile(code, { self = null, describe = () => '', onShow = null } = {}) {
  // A stable public order: by seat number, never the order the view happens to list them in.
  const members = [...code].sort((a, b) => a.n - b.n);
  const file = fileShell('alien', ALIEN_COPY.title);
  const names = members.map(seat => (seat.n === self ? `Player ${seat.n} (you)` : `Player ${seat.n}`)).join(', ');
  const summary = el('p', { class: 'ab-vh' }, ALIEN_COPY.summary(names));
  const grid = el('ul', { class: 'ab-code-set', 'aria-label': ALIEN_COPY.set },
    members.map(seat => el('li', { class: 'ab-code-set__member' }, snapshot(seat, { label: ALIEN_COPY.inspect(seat.n, seat.name, seat.n === self), own: seat.n === self ? ALIEN_COPY.you : null }))));
  const tag = el('div', { class: 'ab-code-tag', 'aria-hidden': 'true' }, codeMark(false), el('span', null, ALIEN_COPY.code));
  const field = el('div', { class: 'ab-file__field' }, cornerPins(), grid, tag);
  file.append(summary, field, threadSvg(), el('p', { class: 'ab-file__note' }, ALIEN_COPY.note));
  makeInspectable(file, { field, seats: members, describe, onShow });
  return file;
}

/** The Hacker's file assembles: the board and the snapshot, the label slapped on, the struck Code mark, the printouts fed in in the view's order, the string, the stamp. */
BEATS.hacker = (file, play) => {
  const M = FILE_MOTION, I = INTEL_MOTION;
  openingBeats(file, play, M);
  play(file.querySelector('.ab-photo__tape'), [{ opacity: 0, transform: 'translate(-8px, -14px) rotate(-22deg) scale(1.3)' }, { opacity: 1, transform: 'none' }], { duration: I.label, delay: I.labelFrom, easing: 'cubic-bezier(0.3, 1.4, 0.6, 1)' });
  play(file.querySelector('.ab-known__code'), [{ opacity: 0, transform: 'scale(1.4)' }, { opacity: 1, transform: 'none' }], { duration: M.stamp, delay: I.markFrom, easing: STAMP_EASING });
  file.querySelectorAll('.ab-printout').forEach((item, index) => {
    play(item, [{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: I.printout, delay: I.printoutsFrom + index * I.printoutStagger, easing: 'steps(6, end)' });
  });
  threadBeats(file, play, M.threadFrom, M);
  play(file.querySelector('[data-stamp="classified"]'), THUMP, { duration: M.stamp, delay: I.hackerStamp, easing: STAMP_EASING });
};

/** The Alien's file assembles: the board, the four snapshots dropped in seat order, the string round the four, the Code's tag swung on. */
BEATS.alien = (file, play) => {
  const M = FILE_MOTION, I = INTEL_MOTION;
  openingBeats(file, play, M);
  threadBeats(file, play, I.alienThreadFrom, M);
  play(file.querySelector('.ab-code-tag'), [{ opacity: 0, transform: 'rotate(-40deg)' }, { opacity: 1, transform: 'rotate(12deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: I.tag, delay: I.tagFrom, easing: 'ease-out' });
  play(file.querySelector('[data-stamp="classified"]'), THUMP, { duration: M.stamp, delay: I.alienStamp, easing: STAMP_EASING });
};

/**
 * A Scan result that arrived while this page was open, seen for the first time: it is printed once.
 * Results already in the view when the page opened, or seen before, are drawn at rest.
 */
export function printFresh(file, key, { reduced = false } = {}) {
  const item = file.querySelector(`.ab-printout[data-scan="${CSS.escape(key)}"]`);
  if (!item) return;
  const I = INTEL_MOTION;
  const animations = reduced
    ? [item.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FILE_MOTION.reducedFade, fill: 'backwards' })]
    : [item.animate([{ clipPath: 'inset(0 0 100% 0)', transform: 'translateY(-6px)' }, { clipPath: 'inset(0 0 0 0)', transform: 'none' }], { duration: I.print, easing: 'steps(8, end)', fill: 'backwards' }),
      ...[...item.querySelectorAll('.ab-printout__stamp, .ab-printout__code')].map(node => node.animate(THUMP, { duration: I.printStamp, delay: I.print, easing: STAMP_EASING, fill: 'backwards' }))];
  playInFile(file, animations);
}

/**
 * The Code card of the Hacker's strip: four windows; the players picked so far fill them in seat
 * order, whatever order they were picked in. picks: [{ n, name, character }].
 */
export function codeCard(picks) {
  const sorted = [...picks].sort((a, b) => a.n - b.n);
  // A picture of the strip's words, which name the picks in seat order: hidden from assistive technology.
  return el('span', { class: 'ab-code-card', 'aria-hidden': 'true', 'data-count': String(sorted.length) },
    Array.from({ length: 4 }, (_, index) => el('span', { class: 'ab-code-card__window', 'data-filled': String(index < sorted.length) }, index < sorted.length ? chip(sorted[index]) : null)));
}

/** The Scan's target in the strip, with the scanner's sweep while the Scan is on its way. */
export function scanTarget(seat, { sweeping = false } = {}) {
  return el('span', { class: 'ab-scan-target', 'data-sweeping': String(sweeping), 'aria-hidden': 'true' }, chip(seat), el('span', { class: 'ab-scan-target__sweep' }));
}

export { seatList };
