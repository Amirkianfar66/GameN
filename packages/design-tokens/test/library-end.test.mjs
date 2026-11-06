// mothership:dev-only
//
// Library group 7 (design/library/end/; docs/design/library/end.md): the end reveal after the
// arrival, the no-survivors ending, the host's abort and the recovery states. These test the
// proposal's own modules: the state maps from the view and the client's clock, the film lifecycle
// decision, the words, the art's palette rule (faction accents only in side pictures), the generated
// assets and the motion. None of them is a rule or a server answer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { END_ART_VERSION, N, SIDE, endAssets } from '../../../design/library/end/art.mjs';
import { END_COPY, listNumbers } from '../../../design/library/end/copy.mjs';
import { FRAMES, MOTION, motionEnd, revealEnd } from '../../../design/library/end/motion.mjs';
import { ROLE_SIDE, STALE_MS, RESTORED_MS, connectionState, endState, filmDecision, revealStart } from '../../../design/library/end/states.mjs';
import { build } from '../../../design/tools/library-assets.mjs';

const ROLES9 = ['Engineer', 'Doctor', 'Undercover', 'Alien', 'Insider', 'Red Disabler', 'Supplier', 'Hacker', 'Blue Disabler'];
function view({ phase = 'FINISHED', result = { winner: 'Blue', reason: 'ARRIVAL', alienCoWinner: false }, roles = ROLES9, code = [5, 3, 2, 4] }) {
  return { phase: { id: 'p', kind: phase, startedAt: 1000 }, result, endReveal: phase === 'FINISHED' ? { roles: roles.map((role, i) => ({ seatId: i + 1, role })), code } : null };
}

test('every role has its side, and the rosters\' team counts hold (4/2/1, 4/3/1, 5/3/1)', () => {
  const count = roles => ['Blue', 'Red', 'Alien'].map(side => roles.filter(r => ROLE_SIDE[r] === side).length);
  assert.deepEqual(count(['Insider', 'Doctor', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien']), [4, 2, 1]);
  assert.deepEqual(count(['Insider', 'Doctor', 'Blue Disabler', 'Supplier', 'Undercover', 'Hacker', 'Alien', 'Red Disabler']), [4, 3, 1]);
  assert.deepEqual(count(ROLES9), [5, 3, 1]);
});

test('the ending comes only from the result: winners, the co-win, no survivors and the abort', () => {
  const blue = endState(view({}));
  assert.equal(blue.state, 'arrival'); assert.equal(blue.winner, 'Blue'); assert.equal(blue.alienCoWinner, false);
  assert.ok(blue.bySide.Blue.every(x => x.winner) && blue.bySide.Red.every(x => !x.winner) && blue.bySide.Alien.every(x => !x.winner));
  assert.deepEqual(blue.code, [2, 3, 4, 5], 'the Code in number order');
  const red = endState(view({ result: { winner: 'Red', reason: 'ARRIVAL', alienCoWinner: true } }));
  assert.ok(red.bySide.Red.every(x => x.winner) && red.bySide.Alien.every(x => x.winner) && red.bySide.Blue.every(x => !x.winner));
  const none = endState(view({ result: { winner: null, reason: 'NO_SURVIVORS', alienCoWinner: false } }));
  assert.equal(none.state, 'no-survivors'); assert.ok(Object.values(none.bySide).flat().every(x => !x.winner));
  assert.deepEqual(endState(view({ phase: 'ABORTED', result: { winner: null, reason: 'ABORTED', alienCoWinner: false } })), { state: 'aborted' });
  // No terminal result, no ending: a crew all jailed or injured is not "no survivors" until the server says so.
  assert.equal(endState({ phase: { kind: 'JAIL_VOTE' }, result: null, endReveal: null }).state, 'none');
  assert.equal(endState({ ...view({}), phase: { kind: 'VOTE_RESULT' }, endReveal: null }).state, 'none', 'a result without FINISHED\'s reveal');
});

test('the film lifecycle: a late join seeks, a reconnect after the end stands at the end, history never replays', () => {
  assert.deepEqual(filmDecision({ start: 1000, end: 2000, now: 500 }), { decision: 'wait', t: -500 });
  assert.deepEqual(filmDecision({ start: 1000, end: 2000, now: 1800 }), { decision: 'play', t: 800 });
  assert.deepEqual(filmDecision({ start: 1000, end: 2000, now: 1800, played: true }), { decision: 'final', t: 2000 });
  assert.deepEqual(filmDecision({ start: 1000, end: 2000, now: 5000 }), { decision: 'final', t: 2000 });
  assert.deepEqual(filmDecision({ start: 1000, end: 60000, now: 40000, expiresAt: 31000 }), { decision: 'skip', t: 60000 });
  assert.equal(revealStart({ phase: { startedAt: 1000 } }, 3400), 4400, 'the reveal follows the arrival film');
});

test('the connection strip from the client\'s transport and clock: reconnecting, restored, stale', () => {
  assert.equal(connectionState({ online: false, now: 1 }).state, 'reconnecting');
  assert.equal(connectionState({ online: true, now: 1000 + RESTORED_MS - 1, restoredAt: 1000 }).state, 'restored');
  assert.equal(connectionState({ online: true, now: 1000 + RESTORED_MS, restoredAt: 1000 }).state, 'ok');
  assert.equal(connectionState({ online: true, now: 60000 + STALE_MS + 1, phaseEndsAt: 60000 }).state, 'stale');
  assert.equal(connectionState({ online: true, now: 60000 + STALE_MS, phaseEndsAt: 60000 }).state, 'ok');
});

test('the words: the ending as the result says it; the co-win with its two conditions; no replay promised', () => {
  assert.equal(END_COPY.wins('Red'), 'Red team wins.');
  assert.match(END_COPY.coWin, /alive.*Blackhole/);
  assert.match(END_COPY.noSurvivors, /No player is alive/);
  assert.match(END_COPY.aborted, /no winner and no reveal/);
  assert.match(END_COPY.reconnecting, /latest state/);
  for (const text of Object.values(END_COPY).flatMap(v => (typeof v === 'function' ? [v('Blue')] : typeof v === 'object' ? Object.values(v) : [v]))) assert.doesNotMatch(text, /\b(replay|rewind|again from the start)\b/i, text);
  assert.equal(listNumbers([2, 3, 4, 5]), '2, 3, 4 and 5');
});

test('the art: faction accents only in the side emblems and banners; every other picture off every accent; no words or links', () => {
  const assets = endAssets();
  const sideOf = name => (/blue/.test(name) ? 'blue' : /red/.test(name) ? 'red' : /alien/.test(name) ? 'alien' : null);
  for (const [name, { svg, about }] of Object.entries(assets)) {
    assert.ok(about.length > 30 && about.endsWith('.'), name);
    assert.doesNotMatch(svg, /<text\b|<image\b|https?:\/\/(?!www\.w3\.org)/, name);
    const side = sideOf(name);
    for (const hex of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) {
      // A side's picture may use its own accent (the accents are given, and some sit near each other).
      if (side && hex.toUpperCase() === FACTION_ACCENTS[side].toUpperCase()) continue;
      if (side && /emblem/.test(name)) continue; // the arrival's own planet hues (navigation films) inside an emblem
      for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) {
        if (side === faction) continue;
        assert.ok(cie76(hex, accent) >= MIN_ACCENT_DISTANCE, `${name}: ${hex} near ${faction}`);
      }
    }
  }
  assert.match(assets['en-banner-blue'].svg, new RegExp(SIDE.Blue.accent, 'i'));
  assert.match(assets['en-banner-red'].svg, new RegExp(SIDE.Red.accent, 'i'));
  for (const accent of Object.values(FACTION_ACCENTS)) for (const name of ['en-banner-none', 'en-code', 'en-flatline', 'en-signal', 'en-broken']) assert.doesNotMatch(assets[name].svg, new RegExp(accent, 'i'), name);
  for (const hex of Object.values(N)) for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) assert.ok(cie76(hex, accent) >= MIN_ACCENT_DISTANCE, `neutral ${hex} near ${faction}`);
  assert.equal(Object.keys(assets).length, 10);
});

test('the generated assets are what the source makes, and the manifest hashes them', async () => {
  const files = build('end');
  for (const [name, text] of Object.entries(files)) assert.equal(await readFile(new URL(`../../../design/library/end/assets/${name}`, import.meta.url), 'utf8'), text, `${name} is stale: run node design/tools/library-assets.mjs`);
  const manifest = JSON.parse(files['manifest.json']);
  assert.equal(manifest.version, END_ART_VERSION);
  assert.equal(manifest.assets.length, 10);
});

test('the motion: the reveal\'s length follows the roster; once, bounded; reduced is fades only', () => {
  assert.equal(revealEnd(7) < revealEnd(9), true);
  assert.equal(motionEnd('reveal', false, 9), revealEnd(9));
  assert.ok(revealEnd(9) <= 2400, 'the reveal never outlasts the end screen\'s first moments');
  for (const [kind, opts] of [['reveal', { count: 9 }], ['noSurvivors', {}], ['strip', {}]]) {
    const end = kind === 'reveal' ? revealEnd(9) : MOTION[kind].end;
    assert.equal(FRAMES[kind](end, opts).done, true, kind);
    for (let t = 0; t <= MOTION.reduced.end; t += 10) {
      const f = FRAMES[kind](t, { ...opts, reduced: true });
      assert.equal(f.reduced, true);
      if (f.banner) assert.equal(f.banner.drop, 1);
      if (f.roles) assert.ok(f.roles.every(r => r.turn === 1));
      if (f.code) assert.equal(f.code.scale, 1);
      if (f.line) assert.equal(f.line.draw, 1);
      if ('slide' in f) assert.equal(f.slide, 1);
    }
  }
  // Roles turn in seat order.
  const mid = FRAMES.reveal(MOTION.reveal.rolesFrom + 200, { count: 9 });
  assert.ok(mid.roles[0].turn > mid.roles[1].turn && mid.roles[8].turn === 0);
});

test('the review report lists each capture once, and every hash is the file\'s', async () => {
  const report = JSON.parse(await readFile(new URL('../../../design/library/end/review/report.json', import.meta.url), 'utf8'));
  assert.deepEqual(report.problems, []);
  const files = report.captures.map(entry => entry.file);
  assert.equal(new Set(files).size, files.length);
  for (const entry of report.captures) {
    const bytes = await readFile(new URL(`../../../${entry.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
  }
});
