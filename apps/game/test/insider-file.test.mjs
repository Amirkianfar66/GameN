import assert from 'node:assert/strict';
import test from 'node:test';
import { FullSetupPlayerViewSchema } from '@mothership/contracts';
import { createConnectedPlayerScreen } from '@mothership/game';
import { renderComicPlayerShell, toHtml } from '@mothership/presentation';
import { createRoleConfirmation } from '../hosted/role-confirmation.js';
import { createFakeHost, flush } from './support/fakes.mjs';
import { createFakeConnectedTransport, EPOCH, MATCH, playerView } from './support/connected.mjs';

// The Insider's file through the real screen: its private content exists only while the seat's
// card is open in the foreground, on its own view. A view out of date keeps the card as the
// release draws it, the file with it. What these tests show is what the screen withholds
// whatever the host asks for.

const TOGGLE = { type: 'private/toggle' };
const OWN = { kind: 'player-view', matchId: MATCH };
const IDENTITIES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus'].map((displayName, index) => ({ seatId: `seat-${index + 1}`, displayName, characterId: `c${index + 1}` }));
const FILE = /ab-file|ab-photo|hold the roles/;

const insiderView = (revision = 5, change = () => {}) => playerView('seat-1', view => {
  view.viewRevision = revision; view.self.role = 'Insider'; view.self.rescuesRemaining = 0; view.knowledge.insiderCandidates = ['seat-5', 'seat-3', 'seat-7']; change(view);
});

function setup() {
  const host = createFakeHost({ serverStart: EPOCH });
  const fake = createFakeConnectedTransport(host, { mode: 'emulator' });
  fake.respond.v1ServerTime = async () => ({ protocolVersion: 2, serverTimeMs: host.serverNow() });
  const screen = createConnectedPlayerScreen({ transport: fake.transport, matchId: MATCH, ports: host.ports, host: { reload() {} }, seatId: 'seat-1' });
  const page = () => toHtml(renderComicPlayerShell(screen.getFrame().model, { phoneView: 'role', identities: IDENTITIES }));
  return { host, fake, screen, page };
}

async function opened() {
  const s = setup();
  s.screen.start();
  await s.fake.deliver(OWN, insiderView());
  s.screen.dispatch(TOGGLE);
  await flush();
  assert.match(s.page(), /ab-photo/, 'the file, with the card open');
  const file = s.page().match(/<ol class="ab-suspects"[\s\S]*?<\/ol>/)?.[0] ?? '';
  assert.match(file, /data-seat="3"[\s\S]*data-character="c3"[\s\S]*data-seat="5"[\s\S]*data-character="c5"[\s\S]*data-seat="7"[\s\S]*data-character="c7"/, 'in seat order');
  return s;
}

test('backgrounding clears the file, and coming back does not show it again', async () => {
  const s = await opened();
  s.screen.setPageVisible(false);
  assert.equal(s.screen.getFrame().model.match.privateArea.content, null);
  assert.doesNotMatch(s.page(), FILE);
  s.screen.setPageVisible(true);
  await flush();
  assert.equal(s.screen.getFrame().model.match.privateArea.open, false, 'the card stays closed until the player opens it');
  assert.doesNotMatch(s.page(), FILE);
  s.screen.dispose();
});

test('authorization or current-view loss conceals the file; recovery never reopens it automatically', async () => {
  // Refused: the seat was bound to another device. Nothing of the match stays.
  const refused = await opened();
  await refused.fake.fail(OWN, 'refused');
  assert.equal(refused.screen.getFrame().model.screen, 'blocked');
  assert.doesNotMatch(refused.page(), FILE);
  refused.screen.dispose();

  // Keep the last public view and recovery internally, but remove private content immediately.
  const stale = await opened();
  await stale.fake.fail(OWN);
  assert.equal(stale.screen.getFrame().model.connection, 'stale');
  assert.equal(stale.screen.getFrame().model.match.privateArea.content, null);
  assert.equal(stale.screen.getFrame().privateAnnouncement, null);
  assert.doesNotMatch(stale.page(), /ms-role-card|ab-photo|ab-inspect|ab-folder/);
  // A current view does not restore private contents until the player asks again.
  await stale.fake.deliver(OWN, insiderView(6), true);
  assert.equal(stale.screen.getFrame().model.connection, 'live');
  assert.equal(stale.screen.getFrame().model.match.privateArea.open, false);
  assert.doesNotMatch(stale.page(), FILE);
  stale.screen.dispatch(TOGGLE);
  assert.match(stale.page(), /ab-photo/);
  stale.screen.dispose();

  // A view of another match never becomes this phone's view.
  const other = setup();
  other.screen.start();
  await other.fake.deliver(OWN, insiderView(5, view => { view.matchId = 'another-match'; }));
  assert.notEqual(other.screen.getFrame().model.screen, 'match');
  assert.doesNotMatch(other.page(), FILE);
  other.screen.dispose();
});

test('the setup role card carries no starting knowledge', async () => {
  // The setup view has no place for it: the schema refuses a view that carries knowledge.
  const setupView = { schemaVersion: 1, protocolVersion: 2, lifecycleVersion: 'staged-start-1', versions: insiderView().versions, matchId: MATCH, playerCount: 7, dealId: 'deal-a', bindingRevision: 1,
    audience: { kind: 'player', seatId: 'seat-1' }, self: { seatId: 'seat-1', role: 'Insider' } };
  assert.equal(FullSetupPlayerViewSchema.safeParse(setupView).success, true);
  assert.equal(FullSetupPlayerViewSchema.safeParse({ ...setupView, knowledge: { insiderCandidates: ['seat-3', 'seat-5', 'seat-7'] } }).success, false);
  // And the role card of the reading period draws the role and the character only.
  const nodes = new Map();
  const el = (tag, text, attrs) => {
    const node = { tag, textContent: text ?? '', attrs: { ...attrs }, children: [], handlers: {}, hidden: false, disabled: false, innerHTML: '',
      append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; this.innerHTML = ''; },
      setAttribute(name, value) { this.attrs[name] = value; }, addEventListener(name, callback) { this.handlers[name] = callback; } };
    if (attrs?.id) nodes.set(attrs.id, node);
    return node;
  };
  const card = createRoleConfirmation({ el, onReady: async () => {} });
  card.update({ key: 'deal-a/seat-1/binding-1', role: 'Insider', characterId: 'c1', ready: false, canConfirm: true, retry: false });
  await nodes.get('setup-role-toggle').handlers.click();
  const drawn = nodes.get('setup-role-card').innerHTML;
  assert.match(drawn, /Insider/);
  assert.doesNotMatch(drawn, /ab-file|ab-photo|Player \d|seat-|hold the roles|Undercover|Alien|Cracker/);
  card.dispose();
});
