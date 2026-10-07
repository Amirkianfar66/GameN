import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTableShellModel, createConnectedPlayerAnnouncer, createTableAnnouncer, renderConnectedPlayerShell, renderTableShell, toHtml } from '@mothership/presentation';
import { auditMarkup, byId, find } from './support/markup-audit.mjs';
import { environment, IDLE, input, model, playerView } from './support/protocol2-views.mjs';

// A device the server does not let read the match, where that answer does not say why. On a
// deployed project it is what a sign-in that could not be confirmed looks like, and what a
// seat moved to another device looks like. The screen says neither as fact, shows nothing of
// the match, and has one control: to ask again.

const UNCONFIRMED = { connection: 'connecting', problem: 'access-unconfirmed' };
const EXPECTED = {
  heading: 'This device cannot read the match right now',
  paragraphs: [
    'The server is not letting this device read the match, so nothing of it is shown.',
    'This can pass, so try again. It also happens when a seat has been moved to another device: the device it was moved from is then no longer in the match. If you did not expect it, ask the host.',
  ],
  action: { intent: 'session/reconnect', label: 'Try again' },
};

test('a device the server does not let read is told so, with a control to ask again, and is shown nothing of the match', () => {
  for (const view of [null, playerView()]) {
    // Even if a view were still handed over, none of it is drawn.
    const shown = model(view, IDLE, UNCONFIRMED);
    assert.deepEqual([shown.screen, shown.match], ['blocked', null]);
    assert.deepEqual(shown.blocked, EXPECTED);
    assert.equal(shown.banners.some(banner => banner.kind === 'connection'), false, 'It is not shown as a lost connection');
    const drawn = renderConnectedPlayerShell(shown);
    assert.deepEqual(auditMarkup(drawn), []);
    const html = toHtml(drawn);
    assert.doesNotMatch(html, /Cracker|ms-private|ms-roster|Player 1/);
    assert.doesNotMatch(html, /Connecting/, 'It is not drawn as a connection still being made');
    const control = find(drawn, byId('ms-blocked-action'));
    assert.deepEqual([control.attrs['data-intent'], control.attrs.type], ['session/reconnect', 'button']);
  }
});

test('it is not said to be a seat that was lost, and the two screens differ', () => {
  const unconfirmed = model(null, IDLE, UNCONFIRMED).blocked;
  const refused = model(null, IDLE, { connection: 'connecting', problem: 'no-access' }).blocked;
  assert.notEqual(unconfirmed.heading, refused.heading);
  assert.equal(refused.action.intent, 'app/reload', 'A refusal is final: reloading is all that is offered');
  assert.equal(unconfirmed.action.intent, 'session/reconnect', 'This is not: the device may ask again');
  assert.doesNotMatch(unconfirmed.paragraphs.join(' '), /No access|is not in the match\b|has lost/, 'Nothing is stated as a loss');
});

test('the shared display says the same', () => {
  const display = buildTableShellModel({ ...environment, ...UNCONFIRMED, view: null });
  assert.deepEqual([display.screen, display.match], ['blocked', null]);
  assert.deepEqual(display.blocked, EXPECTED);
  assert.deepEqual(auditMarkup(renderTableShell(display)), []);
});

test('it is said once, at once, and again only after the match had come back', () => {
  for (const announcer of [createConnectedPlayerAnnouncer(), createTableAnnouncer()]) {
    announcer.next(input(playerView()));
    assert.deepEqual(announcer.next({ ...input(null), ...UNCONFIRMED }), [{ politeness: 'assertive', text: 'This device cannot read the match right now.' }]);
    // Asked again and refused again: the screen has not changed, and nothing is said twice.
    assert.deepEqual(announcer.next({ ...input(null), ...UNCONFIRMED }), []);
    // If the server then refuses for good, that is a different screen and is said.
    assert.deepEqual(announcer.next({ ...input(null), connection: 'connecting', problem: 'no-access' }), [{ politeness: 'assertive', text: 'No access to this match.' }]);
  }
});
