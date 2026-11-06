// mothership:dev-only
//
// Library group 2 (design/library/navigation/; docs/design/library/navigation.md): the offices'
// private route panel, the public navigation strip and the public films. These test the proposal's
// own modules: the route rule against the owner-confirmed overlay's own examples, the state maps from
// views, what each audience may see, the art's palette, the generated assets, the motion and the
// films. None of them is a rule or a server answer; the server's offers stay the only authority.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FACTION_ACCENTS, MIN_ACCENT_DISTANCE, cie76 } from '../../../design/board-v2/fx/blocked.mjs';
import { ANCHORS, N, NAV_ART_VERSION, anchorPercent, navigationAssets, slug } from '../../../design/library/navigation/art.mjs';
import { NAV_COPY } from '../../../design/library/navigation/copy.mjs';
import { AUDIO, FILM, PLANETS, TRANSIT_BOARD, arrivalSvg, filmEnd, transitBoardArt, transitInsert } from '../../../design/library/navigation/films.mjs';
import { MOTION, chooseFrame, confirmFrame, motionEnd, stepFrame } from '../../../design/library/navigation/motion.mjs';
import { MOVES, POSITIONS, classify, step } from '../../../design/library/navigation/route.mjs';
import { NAV_PHASES, ROUTE_WINDOW, STATES, officePanelState, panelStep, publicNavState, routeWindowEnds } from '../../../design/library/navigation/states.mjs';
import { build } from '../../../design/tools/library-assets.mjs';

const CAPTAIN = 7, OFFICER = 2, CREW = 5;
function view({ seat, round = 4, phase = 'ORDINARY_TURN', offers = [], position = 'B1', direction = null, lastMovedRound = round - 1, arrivedAt = null, events = [], tieChoice = false, confirmation = null }) {
  const office = seat === CAPTAIN || seat === OFFICER;
  return {
    round, phase: { id: `r${round}-${phase}`, kind: phase, startedAt: 0, endsAt: null },
    offices: { captainSeatId: CAPTAIN, officerSeatId: OFFICER, blockedSeatId: null },
    self: { seatId: seat }, navigation: { lastMovedRound, arrivedAt }, events,
    privateNavigation: office ? { position, direction, tieChoice, confirmation } : null,
    offers: offers.map(type => ({ type, targetSeatIds: [], slotIds: [], windowIds: [], promiseTargetSeatIds: [] })),
  };
}
const C = o => view({ seat: CAPTAIN, ...o });
const O = o => view({ seat: OFFICER, ...o });

test('the route: the overlay\'s own examples, one movement a round, switches keep depth, no backtracking', () => {
  let at = 'Junction';
  const path = [at];
  for (const d of ['Blue', 'Blue', 'Red', 'Red']) { at = step(at, d).to; path.push(at); }
  assert.deepEqual(path, ['Junction', 'B1', 'B2', 'R2', 'Red Planet']);
  // A ship hack forces Red: at B2 it moves to R2; at R2 it reaches the Red Planet (confirmed rule 18).
  assert.deepEqual(step('B2', 'Red'), { to: 'R2', kind: 'switch' });
  assert.deepEqual(step('R2', 'Red'), { to: 'Red Planet', kind: 'arrive' });
  assert.deepEqual(step('Start'), { to: 'Junction', kind: 'start' });
  assert.equal(step('Blue Planet', 'Red'), null);
  // Three moves from the Junction are the fastest arrival (the end of Round 4 with Round 1's step).
  let fast = 'Junction';
  for (let i = 0; i < 3; i += 1) fast = step(fast, 'Blue').to;
  assert.equal(fast, 'Blue Planet');
  for (const move of MOVES) {
    assert.ok(['advance', 'switch', 'arrive'].includes(move.kind));
    assert.notEqual(move.to, 'Junction', 'never back toward the Junction');
    assert.deepEqual(classify(move.from, move.to), { kind: move.kind, direction: move.direction });
  }
  assert.equal(MOVES.length, 10);
  assert.equal(classify('Junction', 'B2'), null, 'two movements are not one step');
  assert.throws(() => step('B1', 'Green'));
});

test('the office panel: offers decide the controls; the tie is the Officer\'s alone; the Captain sees "being set"', () => {
  assert.equal(officePanelState(view({ seat: CREW })).state, 'none');
  assert.deepEqual(officePanelState(C({ position: 'Junction' })), { office: 'captain', position: 'Junction', arm: null, depth: 0, state: 'idle' });
  assert.equal(officePanelState(C({ phase: 'NAV_TIE' })).state, 'setting');
  assert.deepEqual(officePanelState(O({ phase: 'NAV_TIE', position: 'B2', offers: ['CHOOSE_NAV_DIRECTION'] })).choices, ['Blue', 'Red']);
  assert.equal(officePanelState(O({ phase: 'NAV_TIE', offers: ['CHOOSE_NAV_DIRECTION'] }), { pending: 'CHOOSE_NAV_DIRECTION' }).state, 'sending');
  assert.deepEqual(officePanelState(O({ phase: 'NAV_TIE', direction: 'Red' }), { accepted: { CHOOSE_NAV_DIRECTION: 'r4-NAV_TIE' } }), { office: 'officer', position: 'B1', arm: 'Blue', depth: 1, state: 'chosen', direction: 'Red' });
  // An acceptance from another phase is not this one.
  assert.equal(officePanelState(O({ phase: 'NAV_TIE' }), { accepted: { CHOOSE_NAV_DIRECTION: 'r3-NAV_TIE' } }).state, 'setting');
  const confirm = officePanelState(C({ phase: 'NAV_CAPTAIN_CONFIRM', position: 'B2', direction: 'Red', offers: ['CONFIRM_NAVIGATION'] }));
  assert.deepEqual(confirm, { office: 'captain', position: 'B2', arm: 'Blue', depth: 2, stage: 'captain', direction: 'Red', course: { to: 'R2', kind: 'switch' }, state: 'confirm' });
  assert.equal(officePanelState(C({ phase: 'NAV_CAPTAIN_CONFIRM', direction: 'Blue' }), { accepted: { CONFIRM_NAVIGATION: 'r4-NAV_CAPTAIN_CONFIRM' } }).state, 'confirmed');
  assert.equal(officePanelState(C({ phase: 'NAV_CAPTAIN_CONFIRM', direction: 'Blue' })).state, 'closed');
  assert.equal(officePanelState(C({ phase: 'NAV_OFFICER_CONFIRM', direction: 'Blue' })).state, 'waiting');
  assert.equal(officePanelState(O({ phase: 'NAV_CAPTAIN_CONFIRM', direction: 'Blue' })).state, 'waiting');
  assert.equal(officePanelState(O({ phase: 'NAV_OFFICER_CONFIRM', direction: 'Blue', offers: ['CONFIRM_NAVIGATION'] })).state, 'confirm');
  assert.equal(officePanelState(C({ position: 'Red Planet', arrivedAt: 'Red' })).state, 'arrived');
  // No control without its offer, whatever else the view says.
  for (const phase of NAV_PHASES) for (const seat of [CAPTAIN, OFFICER]) {
    const s = officePanelState(view({ seat, phase, direction: 'Blue' }));
    assert.ok(!['tie', 'confirm'].includes(s.state), `${phase} ${seat}: ${s.state}`);
  }
});

test('the office panel never reads tieChoice or confirmation, and carries no total, weight or earlier direction', () => {
  const allowed = new Set(['state', 'office', 'position', 'arm', 'depth', 'stage', 'direction', 'course', 'choices', 'command']);
  for (const phase of ['ORDINARY_TURN', ...NAV_PHASES]) for (const seat of [CAPTAIN, OFFICER]) for (const offers of [[], ['CONFIRM_NAVIGATION'], ['CHOOSE_NAV_DIRECTION']]) {
    const base = officePanelState(view({ seat, phase, offers, direction: 'Red' }));
    for (const tieChoice of [true, false]) for (const confirmation of ['CAPTAIN', 'OFFICER', null]) {
      assert.deepEqual(officePanelState(view({ seat, phase, offers, direction: 'Red', tieChoice, confirmation })), base);
    }
    for (const key of Object.keys(base)) assert.ok(allowed.has(key), `unexpected field ${key}`);
  }
});

test('the public strip: the same "being set" for every navigation stage, a movement without a direction, the planet only on arrival', () => {
  const stages = NAV_PHASES.map(phase => publicNavState(view({ seat: CREW, phase })));
  for (const s of stages) assert.deepEqual(s, stages[0]);
  assert.equal(stages[0].state, 'navigating');
  const move = { id: 'm3', kind: 'MOVEMENT_COMPLETED', round: 3, audience: { kind: 'public' }, publishedAt: 1000, expiresAt: 31000 };
  const v = view({ seat: CREW, events: [move] });
  const transitEnd = filmEnd('transit', 'phone');
  assert.deepEqual(publicNavState(v, { now: 1500, transitEnd }), { state: 'transit', round: 3, eventId: 'm3', t: 500 });
  assert.equal(publicNavState(v, { now: 1500, transitEnd, played: new Set(['m3']) }).state, 'moved', 'a film is never replayed');
  assert.equal(publicNavState(v, { now: 1000 + transitEnd + 1, transitEnd }).state, 'moved', 'a late join draws the result at rest');
  assert.equal(publicNavState(view({ seat: CREW, round: 1, lastMovedRound: 0 })).state, 'idle');
  const arrived = publicNavState(view({ seat: CREW, phase: 'FINISHED', arrivedAt: 'Blue', events: [move] }), { now: 1500, transitEnd });
  assert.equal(arrived.state, 'arrived');
  assert.equal(arrived.planet, 'Blue Planet');
  const allowed = new Set(['state', 'round', 'eventId', 't', 'planet', 'since']);
  for (const s of [...stages, publicNavState(v, { now: 1500, transitEnd }), arrived]) for (const key of Object.keys(s)) assert.ok(allowed.has(key), key);
  // Only an arrival names a planet.
  for (const s of [...stages, publicNavState(v, { now: 1500, transitEnd })]) assert.equal(s.planet, undefined);
});

test('P28: the same full 15 s route-setting window every opportunity; only the eligible Officer gets tie controls; nothing public changes on a tie or an early choice', () => {
  assert.deepEqual({ ...ROUTE_WINDOW }, { kind: 'NAV_TIE', durationMs: 15_000, fromRound: 2, decision: 'P28' });
  const at = (o, start = 1_000_000) => ({ ...o, phase: { ...o.phase, startedAt: start, endsAt: start + ROUTE_WINDOW.durationMs } });
  // Four worlds in one round's window: no tie; a tie, the Officer still choosing; a tie chosen early; a tie the Officer never answers.
  const worlds = {
    noTie: { offers: [] },
    tieOpen: { offers: ['CHOOSE_NAV_DIRECTION'] },
    tieChosen: { offers: [], accepted: { CHOOSE_NAV_DIRECTION: 'r4-NAV_TIE' } },
    tieUnanswered: { offers: [] },
  };
  const strips = new Set(), captains = new Set(), crews = new Set(), ends = new Set();
  for (const [name, w] of Object.entries(worlds)) {
    const phase = 'NAV_TIE';
    // Every screen but the Officer's reads the same, whatever the world (the strip and the Captain's panel never read offers or a choice).
    strips.add(JSON.stringify(publicNavState(at(view({ seat: CREW, phase })))));
    crews.add(JSON.stringify(publicNavState(at(view({ seat: CREW, phase, tieChoice: name.startsWith('tie') })))));
    captains.add(JSON.stringify(officePanelState(at(C({ phase, tieChoice: name.startsWith('tie') })))));
    ends.add(routeWindowEnds(at(O({ phase, offers: w.offers }))));
    // The Officer: controls only for a genuine tie; a choice made early holds until the window ends.
    const officer = officePanelState(at(O({ phase, offers: w.offers })), { accepted: w.accepted ?? {} });
    assert.equal(officer.state, { noTie: 'setting', tieOpen: 'tie', tieChosen: 'chosen', tieUnanswered: 'setting' }[name], name);
  }
  assert.equal(strips.size, 1, 'one public strip for every world');
  assert.equal(crews.size, 1);
  assert.equal(captains.size, 1, 'the Captain\'s panel is the same tie or not');
  assert.deepEqual([...ends], [1_000_000 + 15_000], 'the window ends at its own endsAt in every world: an early choice never shortens it');
  assert.equal(JSON.parse([...captains][0]).state, 'setting');
  assert.equal(JSON.parse([...strips][0]).state, 'navigating');
  // Outside the window there is no route-setting end to count down to.
  assert.equal(routeWindowEnds(C({ phase: 'NAV_CAPTAIN_CONFIRM' })), null);
});

test('the panel animates only a step the rule can name', () => {
  assert.deepEqual(panelStep('B1', 'B2'), { from: 'B1', to: 'B2', kind: 'advance', direction: 'Blue' });
  assert.deepEqual(panelStep('B2', 'R2'), { from: 'B2', to: 'R2', kind: 'switch', direction: 'Red' });
  assert.equal(panelStep('R2', 'Red Planet').kind, 'arrive');
  assert.equal(panelStep('Junction', 'B2'), null);
  assert.equal(panelStep(null, 'B2'), null);
  for (const kind of ['advance', 'switch', 'arrive']) assert.ok(STATES.step.includes(kind));
});

test('the words never name a total, a weight or a count, and only the Officer\'s ask concerns an undecided course', () => {
  const strings = [];
  for (const [key, value] of Object.entries(NAV_COPY)) {
    if (typeof value === 'string') strings.push([key, value]);
    else if (typeof value === 'function') for (const arg of ['Blue', 'Red', 'captain', 'officer', 'B2', 'Red Planet', 3]) { try { const out = value(arg); if (typeof out === 'string') strings.push([key, out]); } catch { /* an argument the function does not take */ } }
  }
  strings.push(['course', NAV_COPY.course(step('B2', 'Red'))], ['stepWords', NAV_COPY.stepWords({ ...step('B1', 'Red'), to: 'R1' })]);
  for (const [key, text] of strings) {
    assert.doesNotMatch(text, /\b(total|totals|weight|weights|count|points?|tie|tied|majority|margin)\b/i, `${key}: ${text}`);
    if (key !== 'tieAsk') assert.doesNotMatch(text, /undecided|even\b/i, `${key}: ${text}`);
  }
  assert.match(NAV_COPY.tieAsk, /undecided/);
  assert.equal(NAV_COPY.setting, NAV_COPY.publicNavigating, 'the Captain\'s tie stage reads as the public one');
});

test('the art: the panel\'s palette only, off every faction accent, no words or links; an anchor for every place, a course for every move', () => {
  const assets = navigationAssets();
  const palette = new Set(Object.values(N).map(c => c.toUpperCase()));
  for (const [name, { svg, about }] of Object.entries(assets)) {
    assert.ok(about.length > 20, name);
    for (const hex of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) {
      assert.ok(palette.has(hex.toUpperCase()), `${name}: ${hex} is not the panel's`);
      for (const [faction, accent] of Object.entries(FACTION_ACCENTS)) assert.ok(cie76(hex, accent) >= MIN_ACCENT_DISTANCE, `${name}: ${hex} near ${faction}`);
    }
    assert.doesNotMatch(svg, /<text\b|<image\b|https?:\/\/(?!www\.w3\.org)/, name);
  }
  assert.deepEqual(Object.keys(ANCHORS).sort(), [...POSITIONS].sort());
  for (const move of MOVES) assert.ok(assets[`nav-course-${slug(move.from)}-${slug(move.to)}`], `${move.from} to ${move.to}`);
  assert.equal(Object.keys(assets).length, 14);
});

test('the generated assets are what the source makes, and the manifest hashes them', async () => {
  const files = build('navigation');
  for (const [name, text] of Object.entries(files)) assert.equal(await readFile(new URL(`../../../design/library/navigation/assets/${name}`, import.meta.url), 'utf8'), text, `${name} is stale: run node design/tools/library-assets.mjs`);
  const manifest = JSON.parse(files['manifest.json']);
  assert.equal(manifest.version, NAV_ART_VERSION);
  assert.equal(manifest.assets.length, 14);
});

test('the panel\'s motion: once, bounded; reduced is fades only, never a move', () => {
  assert.equal(motionEnd('step'), 900);
  for (const kind of ['choose', 'confirm']) assert.ok(MOTION[kind].end <= 600, kind);
  const made = panelStep('B2', 'R2');
  const last = stepFrame(MOTION.step.end, made);
  assert.equal(last.done, true);
  assert.equal(last.course.opacity, 0);
  for (let t = 0; t <= MOTION.reduced.end; t += 10) {
    const f = stepFrame(t, made, { reduced: true });
    assert.deepEqual(Object.keys(f).sort(), ['after', 'before', 'course', 'done', 'reduced']);
    // Reduced never moves the token: the old place fades out, the new one fades in.
    assert.deepEqual([f.before.left, f.before.top], [anchorPercent('B2').left, anchorPercent('B2').top]);
    assert.deepEqual([f.after.left, f.after.top], [anchorPercent('R2').left, anchorPercent('R2').top]);
    assert.ok(f.before.opacity >= 0 && f.after.opacity <= 1);
    assert.equal(chooseFrame(t, { reduced: true }).stamp.scale, 1);
    assert.equal(confirmFrame(t, { reduced: true }).stamp.scale, 1);
  }
  assert.equal(confirmFrame(MOTION.confirm.end).stamp.opacity, 1);
});

test('the public films: the transit is one film with no side\'s colour; the arrival is the only place the planets\' hues appear', () => {
  const sideHues = new Set([...Object.values(PLANETS.Blue), ...Object.values(PLANETS.Red), ...Object.values(FACTION_ACCENTS)].filter(Boolean).map(c => c.toUpperCase()));
  const layout = { width: 390, height: 844, board: { x: 0, y: 120, w: 390, h: 600 } };
  for (const t of [0, 300, 900, 1500, 1799]) for (const variant of ['full', 'reduced']) {
    const svg = transitBoardArt(t, layout, { surface: 'phone', variant }).art + transitInsert(t, { variant }).svg;
    for (const hex of svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) assert.ok(!sideHues.has(hex.toUpperCase()), `transit at ${t}: ${hex}`);
    assert.doesNotMatch(svg, /<text\b/);
  }
  // The transit takes no game fact: the same frame for any movement.
  assert.equal(transitBoardArt(700, layout, { surface: 'phone' }).art, transitBoardArt(700, layout, { surface: 'phone', direction: 'Red', position: 'B2' }).art);
  const blue = arrivalSvg(4000, 'Blue').svg;
  const red = arrivalSvg(4000, 'Red').svg;
  assert.ok(blue.includes(PLANETS.Blue.mid) && !blue.includes(PLANETS.Red.mid));
  assert.ok(red.includes(PLANETS.Red.mid) && !red.includes(PLANETS.Blue.mid));
  assert.equal(filmEnd('transit', 'phone'), FILM.transit.phone);
  assert.ok(filmEnd('transit', 'display') <= 2400 && filmEnd('arrival-red', 'display') <= 4200);
  // One transit sheet and one arrival sheet: no sound tells the planets apart.
  assert.deepEqual(Object.keys(AUDIO).sort(), ['arrival', 'arrival-short', 'reduced', 'transit', 'transit-short']);
});

test('the review report lists each capture once, and every hash is the file\'s', async () => {
  const report = JSON.parse(await readFile(new URL('../../../design/library/navigation/review/report.json', import.meta.url), 'utf8'));
  assert.deepEqual(report.problems, []);
  const files = report.captures.map(entry => entry.file);
  assert.equal(new Set(files).size, files.length);
  for (const entry of report.captures) {
    const bytes = await readFile(new URL(`../../../${entry.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
  }
});

test('the transit covers nothing: it is drawn behind the crew, for the rooms\' art layers alone, on every surface', () => {
  const layouts = { phone: { width: 390, height: 844, board: { x: 0, y: 120, w: 390, h: 600 } }, display: { width: 1920, height: 1080, board: { x: 0, y: 60, w: 1920, h: 960 } } };
  for (const [surface, layout] of Object.entries(layouts)) {
    for (const variant of ['full', 'reduced']) {
      const end = filmEnd('transit', surface, variant);
      let drawn = 0;
      for (let t = 0; t < end; t += 40) {
        const { art, frame } = transitBoardArt(t, layout, { surface, variant });
        // No overlay exists: the art is only for each room's art layer, and the walls never go fully dark.
        assert.ok(frame.space >= 0 && frame.space <= TRANSIT_BOARD.peak, `${surface} ${variant} ${t}`);
        assert.ok(TRANSIT_BOARD.peak < 1);
        assert.doesNotMatch(art, /<text\b|<image\b|<foreignObject\b/);
        const ids = [...art.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
        assert.equal(new Set(ids).size, ids.length);
        if (art) drawn += 1;
        // Left to right, never turning: the ship only moves right.
        const before = t > 0 ? transitBoardArt(t - 40, layout, { surface, variant }).frame.ship : null;
        if (variant === 'full' && frame.ship && before) assert.ok(frame.ship.x >= before.x - 1e-9, `${surface} ${t}: the ship only moves right`);
      }
      assert.ok(drawn > 0);
      assert.equal(transitBoardArt(end, layout, { surface, variant }).art, '', `${surface} ${variant}: the board alone at the end`);
    }
  }
  // The same lengths as before: nothing waits for it or takes time from the round that opens.
  assert.equal(filmEnd('transit', 'display'), 2400);
  assert.equal(filmEnd('transit', 'phone'), 1800);
});
