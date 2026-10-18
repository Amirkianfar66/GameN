// mothership:dev-only
//
// The Alien's Phantom Clone, privately (storyboard S3; design/board-v2/fx/clone.mjs, films/clone.mjs,
// js/clone-fixtures.mjs; docs/design/clone-s3.md): the card on the Alien's own phone, its activation
// and expiry films, the trigger and the words, from the own view alone. These test the proposal's own
// modules: none of them is a rule, a server contract or a measurement of a phone.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FRAME } from '../../../design/board-motion/figures/body.mjs';
import { CLONE, CLONE_CARD, CLONE_MIN_DISTANCE, FIGURE_SPAN, PASS_GAP, cloneBodyHeight, cloneCardLayout, cloneColorDistances, halftoneSvg, markSvg, outlineSvg, scanSvg, stageSvg } from '../../../design/board-v2/fx/clone.mjs';
import { CLONE_FILM, CLONE_FILMS, cloneCard, cloneContract, cloneEnd, cloneFilmFor, cloneFrame, cloneWords } from '../../../design/board-v2/films/clone.mjs';
import { CLONE_CASES, CLONE_SEAT, CLONE_STATUSES, cloneCase } from '../../../design/board-v2/js/clone-fixtures.mjs';
import { turnsLayout } from '../../../design/board-v2/js/turns.mjs';
import { insetsOf } from '../../../design/board-v2/js/fit.mjs';

const ROLE_WORDS = ['Officer', 'Insider', 'Cracker', 'Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien'];
const PHONES = [[320, 568], [360, 740], [390, 844], [430, 932]];
const { unused, active, ended, r5 } = CLONE_STATUSES;
const FIGURE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-90 -40 300 300"><defs><pattern id="p-dots"/></defs><path d="M0 0" fill="url(#p-dots)"/></svg>';

test('the activation: scan, duplicate, resolve and vanish in 1.8 s, CLONE ACTIVE stamped as it settles', () => {
  assert.equal(cloneEnd('activate'), 1800);
  assert.equal(cloneFrame('activate', -1).card, false);
  assert.equal(cloneFrame('activate', 200).stage, 'scan');
  assert.equal(cloneFrame('activate', 200).scan.dir, 'up');
  assert.equal(cloneFrame('activate', 650).stage, 'duplicate');
  assert.ok(cloneFrame('activate', 650).halftone.opacity > 0 && cloneFrame('activate', 650).clone.opacity === 0);
  assert.equal(cloneFrame('activate', 1100).stage, 'resolve');
  assert.equal(cloneFrame('activate', 1550).stage, 'vanish');
  assert.equal(cloneFrame('activate', 1550).scan.dir, 'down');
  const done = cloneFrame('activate', 1800);
  assert.equal(done.done, true);
  assert.deepEqual([done.real.opacity, done.outline.opacity, done.clone.opacity, done.halftone.opacity], [0, 1, 1, 0]);
  assert.deepEqual(done.stamps, { active: { opacity: 1, scale: 1 }, ended: { opacity: 0, scale: 1 } });
});

test('the expiry reverses it in 0.9 s, from the active card to the character alone and CLONE ENDED', () => {
  assert.equal(cloneEnd('expire'), 900);
  const before = cloneFrame('expire', -1);
  assert.deepEqual([before.real.opacity, before.outline.opacity, before.clone.opacity], [0, 1, 1]);
  assert.equal(cloneFrame('expire', 150).scan.over, 'clone');
  assert.equal(cloneFrame('expire', 450).stage, 'dissolve');
  assert.equal(cloneFrame('expire', 750).stage, 'restore');
  const done = cloneFrame('expire', 900);
  assert.deepEqual([done.real.opacity, done.outline.opacity, done.clone.opacity], [1, 0, 0]);
  assert.deepEqual(done.stamps, { active: { opacity: 0, scale: 1 }, ended: { opacity: 1, scale: 1 } });
});

test('the films move one way: the character out and the duplicate in, then the reverse', () => {
  for (const kind of CLONE_FILMS) {
    let last = cloneFrame(kind, 0);
    for (let t = 10; t <= cloneEnd(kind); t += 10) {
      const f = cloneFrame(kind, t);
      if (kind === 'activate') assert.ok(f.real.opacity <= last.real.opacity && f.clone.opacity >= last.clone.opacity, `${kind} ${t}`);
      else assert.ok(f.real.opacity >= last.real.opacity && f.clone.opacity <= last.clone.opacity, `${kind} ${t}`);
      last = f;
    }
  }
});

test('reduced motion: the card before, held, then one 80 ms cross-fade; no scan, halftone or pop', () => {
  for (const kind of CLONE_FILMS) {
    assert.equal(cloneEnd(kind, true), CLONE_FILM.reduced.holdMs + CLONE_FILM.reduced.fadeMs);
    for (let t = 0; t < cloneEnd(kind, true) + 200; t += 10) {
      const f = cloneFrame(kind, t, { reduced: true });
      assert.equal(f.scan, null);
      assert.equal(f.halftone.opacity, 0);
      assert.equal(f.stamps.active.scale, 1);
      assert.equal(f.stamps.ended.scale, 1);
    }
    assert.equal(cloneFrame(kind, 200, { reduced: true }).stage, 'before');
    assert.equal(cloneFrame(kind, 440, { reduced: true }).stage, 'fade');
  }
});

test('nothing but the moment, the film and the setting is an input', () => {
  for (const kind of CLONE_FILMS) for (const t of [-50, 0, 300, 900, 1700, 2500]) {
    const plain = JSON.stringify(cloneFrame(kind, t));
    assert.equal(JSON.stringify(cloneFrame(kind, t, { attacker: 2, role: 'x', side: 'y', target: 4 })), plain);
  }
  assert.throws(() => cloneEnd('protect'));
});

test('a film starts only on a live change of the own view; never on a reconnect, a baseline or for an Eliminated Alien', () => {
  assert.equal(cloneFilmFor({ before: unused, after: active, live: true }), 'activate');
  assert.equal(cloneFilmFor({ before: unused, after: r5, live: true }), 'activate');
  assert.equal(cloneFilmFor({ before: active, after: ended, live: true }), 'expire');
  assert.equal(cloneFilmFor({ before: unused, after: active, live: false }), null);
  assert.equal(cloneFilmFor({ before: active, after: ended, live: true, eliminated: true }), null);
  assert.equal(cloneFilmFor({ before: active, after: active, live: true }), null);
  assert.equal(cloneFilmFor({ before: null, after: active, live: true }), null);
  assert.equal(cloneCard({ status: active }), 'active');
  assert.equal(cloneCard({ status: ended }), 'ended');
  assert.equal(cloneCard({ status: unused }), null);
  assert.equal(cloneCard({ status: null }), null);
  assert.equal(cloneCard({ status: active, eliminated: true }), null);
});

test('the words are the hosted board\'s private status line, quoted; the stamps say nothing more', () => {
  assert.equal(cloneWords(active), 'Clone active through Round 3.');
  assert.equal(cloneWords(r5), 'Clone active through Round 5.');
  assert.equal(cloneWords(ended), 'Clone inactive; its once-only use is spent.');
  assert.equal(cloneWords(unused), 'Clone unused.');
  assert.equal(cloneWords(null), null);
  const contract = cloneContract();
  assert.equal(contract.id, 'clone');
  assert.match(contract.audience, /own phone alone/);
  assert.match(contract.audience, /Never on the board/);
});

test('the review\'s statuses have 1.10\'s shape; its cases keep the Alien Healthy, jailed only in the jailed case', () => {
  for (const status of Object.values(CLONE_STATUSES)) {
    if (status.used) assert.equal(status.expiresAfterRound, Math.min(status.activatedRound + 1, 5));
    else assert.deepEqual([status.activatedRound, status.expiresAfterRound, status.active], [null, null, false]);
  }
  for (const roster of [7, 8, 9]) for (const name of Object.keys(CLONE_CASES)) {
    const c = cloneCase(name, roster);
    assert.equal(c.own.seat, CLONE_SEAT);
    assert.equal(c.own.health, 'Healthy');
    assert.equal(c.own.jailed, name === 'jailed');
    assert.equal(new Set(c.seats.map(seat => `${seat.room}:${seat.slot}`)).size, c.seats.length);
  }
  assert.throws(() => cloneCase('protected', 9));
});

test('the card fits the sheet at every phone, clear of the raised Pass, its portrait whole and the duplicate beside', () => {
  for (const [width, height] of PHONES) {
    const layout = turnsLayout({ width, height }, 9, { insets: insetsOf(null) });
    const body = cloneBodyHeight(layout.sheet, layout.board.pass);
    assert.ok(body >= CLONE_CARD.height, `${width}x${height}: ${body}`);
    assert.ok(layout.sheet.body.top + body <= layout.board.pass.cy - layout.board.pass.r - PASS_GAP + 0.01);
    const card = cloneCardLayout({ width: layout.sheet.body.width });
    assert.ok(card.portrait.left + card.portrait.width <= card.words.left);
    assert.ok(card.words.width >= 150);
    for (const place of [card.real, card.clone]) {
      assert.ok(place.top + (FIGURE_SPAN.top - FRAME.box[1]) * place.unit >= card.portrait.top - 0.01);
      assert.ok(place.feet[1] <= card.portrait.top + card.portrait.height + 0.01);
    }
    assert.ok(card.clone.feet[0] - card.real.feet[0] >= 20);
  }
});

test('the palette keeps 35 or more from every faction accent', () => {
  for (const { distance } of Object.values(cloneColorDistances())) assert.ok(distance >= CLONE_MIN_DISTANCE);
  for (const hex of Object.values(CLONE)) assert.match(hex, /^#[0-9A-F]{6}$/);
});

test('the art is the figure\'s own drawing, screened or outlined, in its frame, and names no role', () => {
  const box = FRAME.box.join(' ');
  const halftone = halftoneSvg(FIGURE, { density: 0.5, prefix: 'h' });
  const outline = outlineSvg(FIGURE, { prefix: 'o' });
  for (const svg of [halftone, outline]) {
    assert.ok(svg.includes(`viewBox="${box}"`));
    assert.ok(svg.includes('<path d="M0 0"'));
  }
  assert.ok(halftone.includes('id="r-p-dots"'), 'the rim\'s copy of the figure keeps its own ids');
  assert.ok(!/<text\b|<image\b|<script\b/.test(halftone + outline + markSvg() + scanSvg({ width: 40, height: 12 }) + stageSvg({ width: 100, height: 80, real: 30, clone: 70, floor: 76 })));
  for (const word of ROLE_WORDS) for (const svg of [halftone, outline, markSvg(), scanSvg({ width: 40, height: 12 })]) assert.ok(!svg.includes(word));
  assert.ok(markSvg().includes('viewBox="0 0 32 32"'));
});
