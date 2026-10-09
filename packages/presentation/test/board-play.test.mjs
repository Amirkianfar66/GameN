import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTableShellModel, placeSeats, renderComicPlayerShell, renderComicTableShell, rowsFor, splitRegions, stationsFor, toHtml } from '@mothership/presentation';
import { model, playerView, publicView, environment, closed } from './support/protocol2-views.mjs';
import { auditMarkup, find, byRegion, byId } from './support/markup-audit.mjs';

// The board as the place the game is played (issue #87): stations from public occupancy, the
// player's own marks from the open card only, and the strip above navigation.

const ROOMS = ['command-room', 'room-a', 'room-b', 'hospital', 'jail'];
const seats = n => Array.from({ length: n }, (_, index) => `seat-${index + 1}`);
const board = markup => toHtml(find(markup, byRegion('comic-board')));
const strip = markup => toHtml(find(markup, byRegion('private')));
const marks = (html, state) => [...html.matchAll(new RegExp(`data-seat="(seat-\\d)"[^>]*data-board-target="${state}"`, 'g'))].map(match => match[1]);
const pressAreas = html => [...html.matchAll(/class="phone-character-target" id="[^"]+" data-intent="action\/choose" data-value="(seat-\d)"/g)].map(match => match[1]);

test('every room seats one to nine at distinct stations, with no capacity and no press areas that touch on a 320 px phone', () => {
  for (const room of ROOMS) {
    // A half-width room is 141 px inside at 320 px; the Command Room spans the page (302 px).
    const inside = room === 'command-room' ? 302 : 141;
    for (let count = 1; count <= 9; count += 1) {
      const stations = stationsFor(room, count);
      assert.equal(stations.length, count, `${room} holds ${count}`);
      assert.equal(new Set(stations.map(station => `${station.x}/${station.row}`)).size, count, `${room} ${count}: one character per place`);
      for (const station of stations) {
        assert.ok(station.x > 0 && station.x < 1 && station.row >= 0 && station.row <= 2 && station.depth > 0.8 && station.depth <= 1, `${room} ${count} ${station.station}`);
        assert.equal(station.crowd, count > 5);
        const neighbours = stations.filter(other => other !== station && other.row === station.row);
        if (neighbours.length) assert.ok(Math.min(...neighbours.map(other => Math.abs(other.x - station.x))) * inside >= 44, `${room} ${count} ${station.station}: press areas never touch`);
        assert.equal(station.gap, neighbours.length ? Math.min(...neighbours.map(other => Math.abs(other.x - station.x))) : 1);
      }
      // As the Designer's layout counts them: the deepest row in use, so six in a crowd stand in two rows.
      assert.equal(rowsFor(room, count), Math.max(...stations.map(station => station.row)) + 1);
      if (count > 6) assert.equal(rowsFor(room, count), 3);
    }
  }
  assert.deepEqual(stationsFor('room-a', 0), []);
  assert.equal(rowsFor('hospital', 0), 0);
  const final = stationsFor('final-zone', 7);
  assert.deepEqual([final.filter(station => station.row === 0).length, final.filter(station => station.row === 1).length], [4, 3]);
});

test('stations follow seat order and public occupancy only, so every screen places everyone the same', () => {
  const zones = [{ id: 'room-a', seats: seats(4).reverse().map(seatId => ({ seatId })) }, { id: 'jail', seats: [{ seatId: 'seat-9' }] }];
  const first = placeSeats(zones);
  const second = placeSeats([{ ...zones[0], seats: [...zones[0].seats].sort(() => 0.5 - Math.random()) }, zones[1]]);
  assert.deepEqual([...first.entries()].sort(), [...second.entries()].sort());
  assert.equal(first.get('seat-1').station, 'A4');
  assert.equal(first.get('seat-9').station, 'J1');
  // A paired private state draws the same board: the comic board region does not change.
  const a = renderComicPlayerShell(model(playerView(), undefined, closed));
  const b = renderComicPlayerShell(model(playerView(view => { view.self.role = 'Supplier'; view.legalTargets.SUPPLY = ['seat-2', 'seat-3']; view.self.movementDestinations = []; }), undefined, closed));
  assert.equal(splitRegions(a).regions.get('comic-board'), splitRegions(b).regions.get('comic-board'));
  assert.match(board(a), /data-board="own"/);
  assert.match(board(a), /data-seat="seat-1"[^>]*data-station="A4" data-x="0.167" data-row="0" data-depth="1" data-gap="0.666"/);
});

// Each action's offer, as the view lists it, and the seat the test picks.
const SEAT_ACTIONS = [
  ['shot', view => { view.self.shotAvailable = true; view.self.ordinaryWeapons = 1; view.legalTargets.REGISTER_SHOT = ['seat-3', 'seat-5']; }, ['seat-3', 'seat-5']],
  ['disable', view => { view.self.role = 'Blue Disabler'; view.self.disablerAvailable = true; view.legalTargets.DISABLE = ['seat-3', 'seat-5']; }, ['seat-3', 'seat-5']],
  ['protect', view => { view.self.role = 'Undercover'; view.legalTargets.PROTECT = ['seat-1', 'seat-3']; }, ['seat-1', 'seat-3']],
  ['rescue', view => { view.seats[3].location = 'Hospital'; view.seats[3].health = 'Injured'; view.legalTargets.RESCUE = ['seat-4']; }, ['seat-4']],
  ['hack', view => { view.self.hackAvailable = true; view.legalTargets.REQUEST_HACK = ['seat-3']; }, ['seat-3']],
  ['showdown-shot', view => { view.phase = { ...view.phase, kind: 'SHOWDOWN' }; view.activeSeatId = null; for (const seat of view.seats) seat.location = 'Final Zone'; view.legalTargets.SHOWDOWN_SHOT = ['seat-2', 'seat-3', 'seat-4', 'seat-5', 'seat-6', 'seat-7']; }, ['seat-2', 'seat-3', 'seat-4', 'seat-5', 'seat-6', 'seat-7']],
  ['vote', view => { view.phase = { ...view.phase, kind: 'JAIL_VOTE' }; view.activeSeatId = null; view.legalTargets.VOTE = ['seat-2', 'seat-4', 'seat-6']; }, ['seat-2', 'seat-4', 'seat-6']],
  ['release-choice', view => { view.phase = { ...view.phase, kind: 'RELEASE_CHOICE' }; view.seats[6].location = 'Jail'; view.seats[6].jailed = true; view.legalTargets.RELEASE_CHOICE = ['seat-7']; }, ['seat-7']],
  ['scan', view => { view.self.role = 'Hacker'; view.knowledge.undercoverSeatId = 'seat-2'; view.self.scanAvailable = true; view.legalTargets.SCAN = ['seat-1', 'seat-3', 'seat-5']; }, ['seat-1', 'seat-3', 'seat-5']],
  ['supply', view => { view.self.role = 'Supplier'; view.legalTargets.SUPPLY = ['seat-1', 'seat-3', 'seat-5']; }, ['seat-1', 'seat-3', 'seat-5']],
  ['code', view => { view.self.role = 'Hacker'; view.knowledge.undercoverSeatId = 'seat-2'; view.self.codeAttemptAvailable = true; }, seats(7)],
];

test('for every action the press areas are exactly the seats the view offers, in their own rooms; everyone else is drawn faint', () => {
  for (const [kind, change, offered] of SEAT_ACTIONS) {
    const markup = renderComicPlayerShell(model(playerView(change), { step: 'choosing', kind }), { phoneView: 'actions' });
    auditMarkup(markup);
    const html = board(markup);
    assert.deepEqual(pressAreas(html).sort(), [...offered].sort(), kind);
    assert.deepEqual(marks(html, 'eligible').sort(), [...offered].sort(), kind);
    assert.deepEqual(marks(html, 'other').sort(), seats(7).filter(seat => !offered.includes(seat)).sort(), kind);
    // No seat is offered twice, and the strip never lists a seat: the characters are on the board.
    assert.doesNotMatch(strip(markup), /data-value="seat-/, kind);
    assert.match(strip(markup), new RegExp(`class="phone-strip__kind">[^<]+</span><span class="ms-visually-hidden">: </span>`), kind);
  }
});

test('Supply numbers two distinct picks and a Code attempt four; a single chosen character is checked; a sent command is pending', () => {
  const [, supplyChange] = SEAT_ACTIONS.find(([kind]) => kind === 'supply');
  const supply = renderComicPlayerShell(model(playerView(supplyChange), { step: 'choosing', kind: 'supply', picked: ['seat-3'] }), { phoneView: 'actions' });
  assert.deepEqual(marks(board(supply), 'picked'), ['seat-3']);
  assert.deepEqual(pressAreas(board(supply)).sort(), ['seat-1', 'seat-5'], 'a picked character cannot be picked again');
  assert.match(board(supply), /data-mark="number"><span class="ms-visually-hidden">Selected <\/span><span aria-hidden="true">1<\/span>/);
  assert.match(strip(supply), /class="phone-strip__progress" aria-hidden="true"><span data-done="true">1<\/span><span data-done="false"><\/span><\/span>Chosen so far: Player 3\./);
  const [, codeChange] = SEAT_ACTIONS.find(([kind]) => kind === 'code');
  const code = renderComicPlayerShell(model(playerView(codeChange), { step: 'confirming', choice: { kind: 'code', seatIds: ['seat-6', 'seat-2', 'seat-7', 'seat-1'] }, armed: true }), { phoneView: 'actions' });
  assert.deepEqual(marks(board(code), 'picked').sort(), ['seat-1', 'seat-2', 'seat-6', 'seat-7']);
  for (const [seat, order] of [['seat-6', 1], ['seat-2', 2], ['seat-7', 3], ['seat-1', 4]]) assert.match(board(code), new RegExp(`data-seat="${seat}"[^]*?<span aria-hidden="true">${order}</span>`));
  assert.deepEqual(pressAreas(board(code)), [], 'confirming offers no press area');
  const [, shotChange] = SEAT_ACTIONS[0];
  const shot = renderComicPlayerShell(model(playerView(shotChange), { step: 'confirming', choice: { kind: 'shot', targetSeatId: 'seat-5' }, armed: false }), { phoneView: 'actions' });
  assert.deepEqual(marks(board(shot), 'selected'), ['seat-5']);
  assert.match(board(shot), /data-mark="check"><span class="ms-visually-hidden">Selected<\/span><span aria-hidden="true">✓<\/span>/);
  const sent = renderComicPlayerShell(model(playerView(shotChange), { step: 'submitting', choice: { kind: 'shot', targetSeatId: 'seat-5' } }), { phoneView: 'actions' });
  assert.deepEqual(marks(board(sent), 'pending'), ['seat-5']);
  assert.deepEqual(marks(board(sent), 'other'), [], 'nothing faint once it is sent');
  const accepted = renderComicPlayerShell(model(playerView(shotChange), { step: 'accepted', choice: { kind: 'shot', targetSeatId: 'seat-5' }, armed: true }), { phoneView: 'actions' });
  assert.doesNotMatch(board(accepted), /data-board-target/, 'a receipt marks nobody: it is not a result');
});

test('answers that are not characters stay in the strip: Scan factions, abstention, no request, and the release vote', () => {
  const [, scanChange] = SEAT_ACTIONS.find(([kind]) => kind === 'scan');
  const scan = renderComicPlayerShell(model(playerView(scanChange), { step: 'choosing', kind: 'scan', picked: ['seat-5'] }), { phoneView: 'actions' });
  assert.deepEqual([...strip(scan).matchAll(/class="ms-button ms-target" id="[^"]+" data-intent="action\/choose" data-value="([A-Za-z]+)"/g)].map(match => match[1]), ['Blue', 'Red', 'Alien']);
  assert.match(strip(scan), /data-strip="side"/);
  assert.deepEqual(pressAreas(board(scan)), [], 'the faction step offers no character');
  assert.deepEqual(marks(board(scan), 'selected'), ['seat-5']);
  for (const [kind, value] of [['vote', 'none'], ['release-choice', 'none']]) {
    const [, change] = SEAT_ACTIONS.find(([name]) => name === kind);
    const markup = renderComicPlayerShell(model(playerView(change), { step: 'choosing', kind }), { phoneView: 'actions' });
    assert.match(strip(markup), new RegExp(`data-value="${value}"`), kind);
    assert.match(strip(markup), /data-strip="pair"/, `${kind}: one answer shares its row with Cancel`);
  }
  const release = renderComicPlayerShell(model(playerView(view => {
    view.phase = { ...view.phase, kind: 'RELEASE_VOTE' }; view.self.releaseVoteAvailable = true; view.ballot.releaseTargetSeatId = 'seat-7';
    view.seats[6].location = 'Jail'; view.seats[6].jailed = true;
  }), { step: 'choosing', kind: 'release-vote' }), { phoneView: 'actions' });
  assert.deepEqual([...strip(release).matchAll(/data-intent="action\/choose" data-value="([a-z]+)"/g)].map(match => match[1]), ['yes', 'no', 'none']);
  assert.doesNotMatch(board(release), /data-board-target/, 'a release vote marks no character: its subject is the public ballot');
});

test('a move is a tentative place in the room asked for until the view shows the player there', () => {
  const confirming = renderComicPlayerShell(model(playerView(), { step: 'confirming', choice: { kind: 'move', destination: 'Room B' }, armed: true }), { phoneView: 'actions' });
  assert.match(board(confirming), /data-zone="room-b"[^]*class="phone-move-ghost" data-state="tentative" aria-hidden="true"/);
  const sent = renderComicPlayerShell(model(playerView(), { step: 'submitting', choice: { kind: 'move', destination: 'Room B' } }), { phoneView: 'actions' });
  assert.match(board(sent), /class="phone-move-ghost" data-state="pending"/);
  const arrived = renderComicPlayerShell(model(playerView(view => { view.seats[0].location = 'Room B'; view.self.movementDestinations = []; }), { step: 'submitting', choice: { kind: 'move', destination: 'Room B' } }), { phoneView: 'actions' });
  assert.doesNotMatch(board(arrived), /phone-move-ghost/, 'the piece is where the view has it, so no tentative place');
  const closedMove = renderComicPlayerShell(model(playerView(), { step: 'confirming', choice: { kind: 'move', destination: 'Room B' }, armed: true }, closed), { phoneView: 'board' });
  assert.doesNotMatch(board(closedMove), /phone-move-ghost/);
});

test('no mark, press area or tentative place exists outside the player\'s own open action, and the table never has one', () => {
  for (const [kind, change] of SEAT_ACTIONS) {
    for (const [overrides, phoneView] of [[closed, 'board'], [{ privacy: { revealed: true, concealed: true } }, 'actions'], [{ connection: 'stale' }, 'actions'], [{ deadline: { kind: 'expired' } }, 'actions'], [{}, 'role'], [{}, 'more']]) {
      const html = board(renderComicPlayerShell(model(playerView(change), { step: 'choosing', kind }, overrides), { phoneView }));
      assert.doesNotMatch(html, /data-board-target|phone-character-target|phone-pick-order|phone-move-ghost|data-value="seat-/, `${kind} ${phoneView}`);
    }
  }
  const table = toHtml(renderComicTableShell(buildTableShellModel({ ...environment, view: publicView() })));
  assert.doesNotMatch(table, /data-board="own"|data-board-target|phone-character-target|phone-pick-order|phone-move-ghost|phone-strip|data-station/);
});

test('the strip comes before the board in reading order, keeps the release\'s ids and nested regions, and puts its controls where the step needs them', () => {
  const [, shotChange] = SEAT_ACTIONS[0];
  const choosing = renderComicPlayerShell(model(playerView(shotChange), { step: 'choosing', kind: 'shot' }), { phoneView: 'actions' });
  const html = toHtml(choosing);
  assert.ok(html.indexOf('data-region="private"') < html.indexOf('data-region="comic-board"'), 'strip first');
  assert.ok(html.indexOf('data-region="comic-board"') < html.indexOf('data-region="phone-navigation"'), 'navigation last');
  for (const id of ['ms-action-title', 'ms-action-step', 'ms-action-back']) assert.ok(find(choosing, byId(id)), id);
  assert.match(strip(choosing), /data-region="action"[^>]*data-strip="side"[^]*data-region="action-controls"/);
  assert.match(strip(choosing), /<span class="ms-visually-hidden">Shot<\/span> · Tap a character/);
  const confirming = renderComicPlayerShell(model(playerView(shotChange), { step: 'confirming', choice: { kind: 'shot', targetSeatId: 'seat-3' }, armed: true }), { phoneView: 'actions' });
  assert.match(strip(confirming), /data-strip="row"/);
  assert.match(strip(confirming), /id="ms-action-confirm"/);
  const busy = renderComicPlayerShell(model(playerView(shotChange), { step: 'submitting', choice: { kind: 'shot', targetSeatId: 'seat-3' } }), { phoneView: 'actions' });
  assert.match(strip(busy), /data-strip="none"/);
  // Every accepted command gets the same status word: the receipt is neutral.
  const words = SEAT_ACTIONS.map(([kind, change, offered]) => {
    const choice = kind === 'supply' ? { kind, targetSeatIds: [offered[0], offered[1]] } : kind === 'code' ? { kind, seatIds: offered.slice(0, 4) }
      : kind === 'scan' ? { kind, targetSeatId: offered[0], guess: 'Red' } : { kind, targetSeatId: offered[0] };
    return /<p class="ms-card__status">([^<]+)<\/p>/.exec(strip(renderComicPlayerShell(model(playerView(change), { step: 'accepted', choice, armed: true }), { phoneView: 'actions' })))[1];
  });
  assert.deepEqual(new Set(words), new Set(['Accepted']));
});
